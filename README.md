# Instagram フォーカスフィルター (Firefox 拡張機能)

Instagram をブラウザで閲覧する際に、**「おすすめ投稿」「リール導線」をUIから取り除き、フォロー中のユーザーの投稿だけに集中できる**ようにする Firefox 拡張機能です。

---

## 1. 概要

| 項目 | 内容 |
| --- | --- |
| 名称 | Instagram フォーカスフィルター (仮) |
| 対象ブラウザ | Firefox (Manifest V3 / WebExtensions) |
| 対象サイト | `https://www.instagram.com/*` |
| 目的 | おすすめ・レコメンド由来のコンテンツを排除し、能動的に選んだフォロー関係のみを閲覧できる状態にする |
| 配布形態 | `.xpi` パッケージ（将来的に AMO 公開も想定） |

拡張機能のオン/オフはツールバーアイコン（ポップアップ）から切り替えられ、設定はブラウザ間で同期されます。

---

## 2. 機能要件

ユーザー要望を整理した、本拡張機能が満たすべき要件です。

1. **ホームタイムラインのおすすめ投稿を非表示にする**
   - ホーム画面のフィードから「おすすめ」「Suggested for you」とラベル付けされた投稿を消す。
   - フォロー中ユーザーの投稿のみが残るようにする。
2. **左サイドメニューから「リール動画」への導線を削除する**
   - ナビゲーションから Reels メニュー項目を消し、UI からリールページへ遷移できないようにする。
3. **検索/発見（Explore）ページのおすすめ投稿を非表示にする**
   - 検索ページへの遷移自体は可能なまま維持する。
   - 検索バーは表示し、その下に並ぶ「おすすめ投稿グリッド」を消す。
4. **オン/オフを切り替えられる**
   - 拡張機能アイコンのポップアップから機能全体、または各機能を個別にトグルできる。
   - 設定は `storage.sync` で永続化する。

### 非機能要件 / スコープ外

- Instagram のアカウント設定やサーバー側のレコメンドロジックは変更しない（あくまでクライアント表示の制御）。
- 広告（Sponsored）の除去は本要件の主目的ではないが、おすすめ判定の延長で対応可能なため将来拡張として位置づける。
- スマホアプリ（ネイティブ）は対象外。あくまでブラウザ閲覧専用。

---

## 3. Instagram UI 調査

> ⚠️ Instagram の Web UI は React 製の SPA で、**DOM のクラス名は難読化・自動生成され頻繁に変化**します。クラス名に依存した実装は壊れやすいため、構造的特徴・テキスト・`href`・`aria-label` など比較的安定した手がかりを使う方針とします。（2025〜2026 年時点の構造を基に調査）

### 3.1 ホームフィードの構造

- フィードは各投稿が `<article>` 要素として描画される（`main[role="main"]` 配下）。
- おすすめ投稿は、投稿ヘッダー付近に **「おすすめ」/「Suggested for you」/「Suggested posts」** といったラベルテキストを持つ点が、通常のフォロー投稿との大きな違い。
- ラベルの文言は表示言語（日本語/英語など）に依存するため、多言語の文字列辞書で判定する必要がある。
- 投稿データは GraphQL 経由で取得され、JSON 内では `xdt_api__v1__feed__timeline__connection` → `edges` のような構造でフィードアイテムが並ぶ。おすすめ系アイテムは `explore_story` / `suggested_users` / `is_ad` 等のフラグや、フォロー外アカウント由来であることで識別できる。

### 3.2 サイドナビゲーション（左メニュー）

- 画面左の縦型ナビゲーションは各項目がアンカー (`<a>`) で構成される。
- 各遷移先は `href` で判別可能：
  - ホーム … `href="/"`
  - 検索 … 検索パネルを開くボタン
  - 発見 (Explore) … `href="/explore/"`
  - **リール … `href="/reels/"`** ← これを非表示対象にする
  - メッセージ … `href="/direct/inbox/"`
- `href="/reels/"` を持つナビ項目（およびその親リスト要素）を CSS で `display:none` にすれば、UI 上からリール導線を消せる。

### 3.3 検索 / 発見（Explore）ページ

- URL は `https://www.instagram.com/explore/`。
- ページ上部に検索バー（input）、その下に正方形サムネイルが並ぶ**おすすめ投稿グリッド**が表示される。
- 検索バー（`input[placeholder*="検索"]` / `input[aria-label*="検索"]` 等）は残し、グリッド部分のコンテナを非表示にすることで「検索はできるがおすすめは見えない」状態を実現する。

### 3.4 SPA 特有の注意点

- ページ遷移はフルリロードを伴わない（History API による疑似遷移）。
- フィードは無限スクロールで動的に DOM へ追加される。
- → **一度きりの DOM 走査では不十分**であり、`MutationObserver` で継続的に監視し、追加された要素にもフィルタを適用する必要がある。
- React の再レンダリングにより、消した要素が復活する／参照が無効化されることがあるため、冪等（何度実行しても安全）な処理にする。

---

## 4. 技術選定

| レイヤー | 採用技術 | 理由 |
| --- | --- | --- |
| 拡張機能基盤 | **Manifest V3 (WebExtensions API)** | Firefox / Chrome 系で標準。Firefox は MV3 を正式サポート。`browser.*` API を `webextension-polyfill` で吸収。 |
| 主要ロジック | **Content Script** | ページ DOM に直接アクセスしておすすめ投稿を除去・ナビを制御するため。 |
| 動的監視 | **MutationObserver** | 無限スクロール・SPA 遷移で追加される要素に追従するため。ポーリングより効率的。 |
| 静的な非表示 | **CSS (content_scripts の css)** | リール導線や Explore グリッドなど「常に隠す」要素は CSS で宣言的に消すのが最も軽量かつ高速（チラつき防止）。 |
| 高度なフィルタ（任意） | **ネットワーク/JSON インターセプト** | `JSON.parse` / `Response.prototype.json` をフックし、描画前にフィードJSONからおすすめを除去。チラつきが出ないが実装難度・壊れやすさが高いため第2フェーズで検討。 |
| 設定保存 | **storage.sync** | オン/オフ設定をブラウザ間同期。`storage.local` フォールバック。 |
| UI | **ポップアップ (HTML/CSS/Vanilla JS)** | トグルだけの軽量UI。フレームワーク不要。 |
| 言語 | **TypeScript（推奨） + esbuild/Vite でバンドル** | 型安全と保守性。最小構成なら素の JS でも可。 |

### 実装方式の比較（おすすめ投稿の除去）

| 方式 | メリット | デメリット | 採用 |
| --- | --- | --- | --- |
| **A. DOMテキストベース除去** | 実装が単純・理解しやすい・壊れにくい | 一瞬表示されてから消える「チラつき」が起こりうる | ✅ 第1フェーズ採用 |
| **B. APIインターセプト** | 描画前に除去でき完全・チラつきなし | Instagram の内部JSON構造に依存し壊れやすい・実装が複雑 | 🔜 第2フェーズで補強 |

→ **まずは堅牢で保守しやすい方式 A（DOM + MutationObserver + CSS）で確実に動かし、必要に応じて方式 B を上乗せする**段階的アプローチを採用します。

---

## 5. 設計

### 5.1 ディレクトリ構成（予定）

```
firefox-instagram-extension/
├── manifest.json            # MV3 マニフェスト
├── src/
│   ├── content/
│   │   ├── index.ts         # コンテンツスクリプトのエントリ
│   │   ├── feedFilter.ts    # ホームのおすすめ投稿除去
│   │   ├── navFilter.ts     # リール導線の非表示
│   │   ├── exploreFilter.ts # 検索/発見ページのおすすめ除去
│   │   └── observer.ts      # MutationObserver ラッパー
│   ├── styles/
│   │   └── hide.css         # 静的に隠す要素の CSS
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts         # トグルUI ↔ storage
│   │   └── popup.css
│   ├── background/
│   │   └── background.ts    # 設定の初期化・メッセージング
│   └── shared/
│       ├── settings.ts      # 設定の型・デフォルト値・読み書き
│       └── labels.ts        # 多言語の「おすすめ」ラベル辞書
├── icons/
├── README.md
└── package.json
```

### 5.2 各機能の実装方針

#### (1) ホームのおすすめ投稿除去 — `feedFilter.ts`

- `main` 配下の各 `<article>` を走査。
- 投稿内に多言語ラベル辞書（`labels.ts`：「おすすめ」「Suggested for you」「Suggested posts」「Sugerencias」…）のいずれかのテキストを含むヘッダーがあれば、その `<article>`（または対応するフィード行コンテナ）を `display:none`／DOM除去。
- `MutationObserver` で新規追加分にも適用。処理済みフラグ（`data-iff-checked`）で二重処理を防止。

#### (2) リール導線の非表示 — `navFilter.ts` + `hide.css`

- 第一手段：CSS で `a[href="/reels/"]` を含むナビ項目を非表示。
  ```css
  /* hide.css（簡略例） */
  a[href="/reels/"] { display: none !important; }
  ```
- ナビは多くの場合 `<a>` の親（リスト項目）ごと消す必要があるため、CSS で消しきれない場合は JS で `closest()` により親要素を辿って非表示にする。
- これにより UI からリールへ遷移する導線が消える（直接 URL 入力での遷移までは抑止しない＝要件範囲）。

#### (3) 検索/発見ページのおすすめ除去 — `exploreFilter.ts`

- `location.pathname` が `/explore` 系のときに作動。
- 検索バー（input）要素は保持。
- 検索バー以外の、おすすめサムネイルが並ぶグリッドコンテナを特定し非表示にする。
- 検索結果表示中（ユーザーが文字入力した状態）はグリッドを隠す処理を抑制し、検索体験を壊さないようにする。

#### (4) オン/オフ切り替え — `popup` + `settings.ts`

- 設定スキーマ例：
  ```ts
  type Settings = {
    enabled: boolean;          // 全体トグル
    hideSuggestedFeed: boolean;
    hideReelsNav: boolean;
    hideExploreGrid: boolean;
  };
  ```
- ポップアップのトグル変更 → `storage.sync` 更新 → コンテンツスクリプトへ `runtime.sendMessage` で通知し即時反映。
- ページロード時はコンテンツスクリプトが設定を読み、各フィルタの有効/無効を決定。

### 5.3 処理フロー

```
[ページ読込/遷移]
      │
      ▼
content script 起動 ──▶ storage から Settings 取得
      │
      ▼
enabled? ──No──▶ 何もしない
      │Yes
      ▼
初回 DOM 走査（feed / nav / explore それぞれ）
      │
      ▼
MutationObserver 登録 ──▶ DOM 変化のたびに再フィルタ（冪等）
      ▲
      └──── popup でトグル変更 ──▶ message 受信で再評価
```

---

## 6. リスクと留意点

- **DOM 構造の変更に弱い**：Instagram は予告なく UI を変える。クラス名非依存・テキスト/`href`/`aria-label` ベースで実装し、ラベル辞書やセレクタを `shared/` に集約して**変更箇所を一点に閉じ込める**。
- **多言語対応**：「おすすめ」ラベルは表示言語で変わるため辞書方式で網羅。未知の言語は取りこぼす可能性がある。
- **チラつき（FOUC）**：方式 A では一瞬表示されることがある。CSS の先行適用や方式 B で軽減。
- **過剰除去の防止**：フォロー中ユーザーの正当な投稿を誤って消さないよう、おすすめ判定は保守的に行う。
- **利用規約**：表示のクライアント制御に留め、自動操作やスクレイピングは行わない。あくまで個人の閲覧体験向上が目的。

---

## 7. 今後のロードマップ

- [x] **フェーズ1**：MV3 雛形 + 方式A（DOM/CSS/MutationObserver）で 3 機能を実装
- [x] **フェーズ2**：ポップアップによる個別トグルと `storage.sync` 同期
- [x] **フェーズ3**：方式B（JSON/ネットワークインターセプト）でチラつき低減・精度向上
- [x] **フェーズ4**：多言語ラベル辞書の拡充、Sponsored 除去オプション
- [x] **フェーズ5**：AMO 申請に向けたパッケージング・プライバシーポリシー整備（`web-ext` + `PRIVACY.md`）

---

## 8. Firefox への導入手順

> 💡 **ビルドは不要です。** この拡張は素の JavaScript / CSS / HTML で書かれており、リポジトリ内の
> `manifest.json` と `src/` が**そのまま拡張機能の実体**です。変換（コンパイル/バンドル）なしで
> Firefox にそのまま読み込めます。

### 8.1 ソースを取得する

```bash
git clone https://github.com/taka-kawah/firefox-instagram-extension.git
cd firefox-instagram-extension
```

> すでに ZIP でダウンロードした場合は、展開したフォルダ（直下に `manifest.json` がある階層）を使います。

### 8.2 Firefox に一時的に読み込む（開発・お試し用）

1. Firefox のアドレスバーに `about:debugging` と入力して開く
2. 左メニューの **「このFirefox」**（This Firefox）をクリック
3. **「一時的なアドオンを読み込む…」**（Load Temporary Add-on…）をクリック
4. このリポジトリ**直下の `manifest.json`** を選択する（`src/` の中ではなくトップ階層のもの）
5. 一覧に「Instagram フォーカスフィルター」が表示されれば成功。`https://www.instagram.com/` を開いて動作を確認する

> ℹ️ **「一時的なアドオン」は Firefox を再起動すると消えます**（開発・確認用のため）。
> 常用したい場合は 8.4 のパッケージ化＋署名を行ってください。
>
> 🔧 読み込み後にコードを編集したときは、`about:debugging` の当該アドオンにある
> **「再読み込み」**（Reload）を押すと最新の状態に更新できます。

### 8.3 動作確認（任意）

ロジックの自動テストを実行できます（Node.js が必要）。

```bash
npm install   # 開発用依存（jsdom）を入れる
npm test      # node --test でユニット/統合テストを実行
```

### 8.4 配布・常用するためのパッケージ化（.xpi 作成）

[`web-ext`](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/) を使うと、
検査・パッケージ化・署名を簡単に行えます（`npm install` 済みであれば追加導入は不要）。

```bash
npm run lint    # web-ext lint: manifest や権限の問題を検査（エラー0を確認）
npm run build   # web-ext build: web-ext-artifacts/ に配布用 zip(.xpi 相当) を生成
npm start       # web-ext run: 一時プロファイルの Firefox で起動して動作確認
```

- 同梱されるのは拡張機能本体（`manifest.json` / `icons/` / `src/`）のみです（`web-ext-config.cjs` で
  テスト・ドキュメント等を除外しています）。
- **署名なしの恒久インストールは通常版 Firefox では不可**です。次のいずれかを使います。
  - **Mozilla Add-ons (AMO) での署名**:
    ```bash
    npx web-ext sign --api-key=<JWT issuer> --api-secret=<JWT secret>
    ```
    （AMO のアカウントと API キーが必要。自分用なら「自己流通（unlisted）」での署名も可能）
  - **署名不要で常用したい場合**: [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/) または ESR で
    `about:config` の `xpinstall.signatures.required` を `false` にする方法もあります（通常版では不可）。

### 8.5 ビルド済み .xpi を Releases から入手する

`main` ブランチに変更がマージされると、GitHub Actions が自動で `.xpi` をビルドし、
[Releases](https://github.com/taka-kawah/firefox-instagram-extension/releases) ページに公開します
（タグ＝`manifest.json` の `version`）。自分でビルドしなくても、最新の `.xpi` をそこから入手できます。

- **署名済み（推奨・個人利用OK）**: リポジトリに AMO の API キーを登録しておくと、自動で
  **unlisted（自己配布）署名**された `.xpi` が公開され、**通常版 Firefox に恒久インストール**できます。
  公開リスト掲載や手動審査は不要です。設定手順は [`docs/release-signing.md`](docs/release-signing.md) を参照。
  - インストール: `about:addons` の歯車 →「ファイルからアドオンをインストール…」→ ダウンロードした `.xpi`。
- **未署名（API キー未登録のとき）**: `about:debugging` →「一時的なアドオンを読み込む」で `.xpi` を
  選択して利用（再起動で消えます）。

> ℹ️ AMO は同じ `version` の再署名を拒否するため、新しい `.xpi` を出すときは `manifest.json` の
> `version` を上げてマージしてください。

### 8.6 プライバシー / AMO 申請

- 本拡張機能は個人情報・閲覧履歴を一切収集しません。詳細は [`PRIVACY.md`](PRIVACY.md) を参照。
- AMO（addons.mozilla.org）への掲載文・チェックリストの下書きは [`docs/amo-listing.md`](docs/amo-listing.md) にあります。
