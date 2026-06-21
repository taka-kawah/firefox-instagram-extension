# LT カンペ: 「Instagramのおすすめを消すFirefox拡張を作った話」

- 対象: 現職SWE（バックエンド寄り中心 / 拡張機能は未経験の人が多い）
- 時間: 5〜10分（下のタイム配分は約8分想定。巻くなら ④を短縮、⑥は捨て可）
- リポジトリ: `taka-kawah/firefox-instagram-extension`
- ゴール: 「拡張機能ってこういう仕組みなんだ」と「Webページを外から殴るときの泥臭さ」が伝わればOK

> 進め方メモ: コードは“見せるだけ”。読み上げない。太字の一言だけ言って次へ。

---

## ① つかみ（0:00〜0:30）

- 「Instagram開くと、フォローしてない人の**“おすすめ”**とリールが大半ですよね。集中できない」
- 「アプリ側の設定では消せない。じゃあ**クライアント側で表示を殴って消す**Firefox拡張を作った、という話です」
- 一言: **「サーバーは触りません。ブラウザに届いた後をいじるだけ」**

（あれば）Before/After のスクショを1枚出す → `verification/screenshots/composite_home.png`

---

## ② 何を作ったか（0:30〜1:30）

機能は3つ＋α:
1. ホームの**おすすめ投稿**を消す（フォロー中だけ残す）
2. 左メニューの**リール導線**を消す
3. 発見ページの**おすすめグリッド**を消す（検索バーは残す）
4. （おまけ）広告(Sponsored)非表示トグル、ポップアップでON/OFF

- スタックは **Manifest V3 / WebExtensions、素のJS（ビルドなし）**。
- 一言: **「`manifest.json` と `src/` がそのまま拡張の実体。トランスパイルもバンドルもしてない」**

---

## ③ 拡張機能の基礎（バックエンドの人向け）（1:30〜3:00）

ここは未経験者向けに丁寧に。**登場人物は3つ**だけ覚えてもらう:

- **content script**: 対象ページに注入されて動くJS。**DOMは触れるが、ページ本体とはJS世界が隔離**されている（後で効いてくる）。
- **background（service worker的なもの）**: 常駐ロジック。今回は初期設定の保存くらい。
- **popup**: ツールバーアイコンのUI。ただのHTML+JS。

- 設定の保存は **`storage.sync`**（Firefoxアカウントで端末間同期）→ 失敗時 `storage.local` フォールバック。
- 一言: **「バックエンドで言うと、content scriptが“リクエストの後段に挟まるミドルウェア”、storageが“KVS”くらいの感覚」**

`manifest.json`（チラ見せ）:
```jsonc
"content_scripts": [{
  "matches": ["https://www.instagram.com/*"],
  "js": ["src/shared/settings.js", "src/content/labels.js", "src/content/content.js"],
  "css": ["src/styles/hide.css"],
  "run_at": "document_start"
}]
```

---

## ④ 仕組み・方式A：DOMを後から殴る（3:00〜4:30）

- 一番素朴な方法。**描画されたDOMを見て、“おすすめ”を消す**。
- おすすめ投稿は `<article>` の中に **「おすすめ」「Suggested for you」等のラベル**を持つ → それを完全一致で検出して `display:none`。
- リール導線・発見グリッドは**毎回同じ場所**なのでCSSで消す（`<html>`に目印属性を付けてON/OFF）。

```js
// 完全一致で誤検出を防ぐ（"このカフェおすすめです"を消さない）
if (labelSet.has(text)) { article.style.setProperty("display","none","important"); }
```

- **SPA + 無限スクロール**なので一回走査して終わりではない → **`MutationObserver`で監視して都度フィルタ**。
- 一言: **「ポーリングじゃなくてDOM変化をイベントで拾う。冪等に書くのが大事」**

弱点 → 次の山場へのフリ: **「でもこれ、“一瞬見えてから消える”チラつき(FOUC)が出るんですよ」**

---

## ⑤ 仕組み・方式B：描画前にJSONを殴る（4:30〜6:30）★山場

- チラつきの根本原因は「DOMになってから消す」こと。**ならDOMになる前 = JSONの時点で消す**。
- Instagramはフィードを **GraphQLのJSON**（`...feed__timeline__connection.edges`）で受け取る。**`JSON.parse`や`fetch`の`.json()`をフックして、描画前にedgesからおすすめを抜く**。

### ここで最大のハマりどころ（バックエンドの人がザワつくポイント）

- **content scriptはページ本体とJS世界が隔離されている**（isolated world）。
  → だから**ページの`JSON.parse`を上書きできない**。同じ`window`に見えて別物。
- 解決: **`<script>`タグをページに注入して“メインワールド”で動かす**。これは `web_accessible_resources` として公開したJSファイル。

```js
// content script（隔離世界）→ ページ本体（メインワールド）へ橋を架ける
const url = browser.runtime.getURL("src/page/interceptor.js");
document.documentElement.appendChild(Object.assign(document.createElement("script"), { src: url }));
```

```js
// interceptor.js（メインワールドで実行）: ここで初めて本物のJSON.parseを差し替えられる
const orig = window.JSON.parse;
window.JSON.parse = (t, r) => maybeFilter(orig.call(this, t, r)); // edgesからおすすめ/広告を除去
```

- 設定（ON/OFF）は**世界をまたぐので`window.postMessage`で渡す**。
- 一言: **「サーバーのレスポンスに介入するインターセプタを、ブラウザ内でMonkey patchしてる、という話」**
- 安全側設計: 明確なマーカー(`explore_story`/`is_sponsored`等)だけ消す。フィード以外のJSONは`edges`が無いので無傷。例外時は素通し。**方式Aもフォールバックで残す**（壊れたら後段で拾う）。

---

## ⑥ InstagramのDOMで難しかったこと（6:30〜8:00）

ここがLTの“あるある共感”パート。箇条書きで小気味よく:

1. **クラス名が難読化＆自動生成で毎回変わる** → クラス依存は即死。**`href`/`aria-label`/表示テキスト**など安定した手掛かりだけ使う。
2. **isolated world問題**（⑤）→ 一番ハマった。「`window`が同じに見えて別」を理解するまで時間溶けた。
3. **FOUC（チラつき）** → 方式Bで描画前除去、CSSは`document_start`で先入れ。
4. **過剰除去のリスク** → 「おすすめ」は短い語でキャプションに紛れる。**完全一致＋ヘッダー要素限定**で誤爆防止。
5. **多言語** → ラベルは表示言語依存。辞書化（日英中韓ほか）。方式Bは言語非依存で補完。
6. **検索ページ** → 「おすすめは消すが検索バーは残す」。グリッドのリンクだけ狙い撃ち。
7. **テストどうするの問題** → 本物IGはbot弾き＆要ログインで自動テスト不可。**jsdomにIG風DOMを再現**して`node --test`。
   - 小ネタ: **jsdomとNodeでrealmが違って`deepStrictEqual`がプロトタイプ不一致で落ちる**やつ踏んだ。

---

## ⑦ テスト/CI/配布（巻き気味に・8:00〜9:00）

- **テスト**: 純粋ロジック（判定・JSONフィルタ）は単体、DOM挙動はjsdomで統合。計34ケース。
- **CI**: PRごとに `test` と `web-ext lint`。緑じゃないとマージしない運用。
- **配布**: `main`マージで GitHub Actions が`.xpi`をビルド→**Releasesに自動公開**。
  - 署名の話: 公開審査は不要。**unlisted（自己配布）署名**で自分用に恒久インストール可能。

---

## ⑧ まとめ（9:00〜9:30）

- **「Webページを外から改変する」= サーバーレスポンスに介入するミドルウェアを、隔離・メインの2世界とDOMイベントの上で書く話だった**。
- 一番の学び: **isolated worldとmain worldの境界**、そして**“描画前 vs 描画後”どちらで殴るかの設計判断**。
- 「コードは全部公開してます。Firefox拡張は意外と入口が低いので、自分の不満は自分で消そう」で締め。

---

## 想定Q&A（保険）

- **Q: Chromeでも動く?** A: MV3共通なので大筋移植可。ただし`browser.*`→`chrome.*`差異、Firefoxの`background.scripts`、unlisted署名まわりは要調整。
- **Q: IGがJSON構造変えたら?** A: 壊れる前提。判定キーは1ファイルに集約、方式Aフォールバックで被害最小化。
- **Q: 利用規約的に大丈夫?** A: 表示のクライアント制御のみ。自動操作・スクレイピングはしない。あくまで個人の閲覧体験。
- **Q: パフォーマンスは?** A: `JSON.parse`フックは全パースに挟まるので、フィード以外は即return。MutationObserverはrAFで間引き。
- **Q: なぜTypeScriptじゃない?** A: 入門しやすさ＆ビルドレス優先。規模が育てば導入余地あり。
