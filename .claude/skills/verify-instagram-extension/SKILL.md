---
name: verify-instagram-extension
description: この Firefox 拡張（Instagram フォーカスフィルター）の動作確認・証跡スクショ取得を行う。PR や issue で「動作確認」「verify」「証跡」「スクショを撮って」と頼まれたとき、ヘッドレス環境で実拡張を Firefox に読み込み、Instagram の該当DOMを再現したモックページで before/after を撮影し、PRにコメント投稿するまでを行う。
---

# Instagram 拡張の動作確認 skill

この拡張（`taka-kawah/firefox-instagram-extension`）の PR / issue について、
**実拡張を実際の Firefox に読み込んだ証跡スクリーンショット**を取得し、PR にコメント投稿するための手順。

## 前提・制約（なぜこの方式か）

実行環境はヘッドレスのクラウド。**本物の Instagram は使えない**：
1. ログインに利用者本人の認証情報が必要（クラウドに渡すべきでない）
2. データセンターIPからの自動ログインはブロックされる（checkpoint / captcha）

そこで **「実拡張 × Instagram の該当DOMを再現したローカルのモックページ」** で検証する。
拡張のロジック（JS / CSS / popup）は**一切改変しない**。唯一の例外は後述の `matches` 1点のみ。

## 手順

### 0. 確認対象を把握する
- 対象ブランチ（例: PRの head ブランチ）のソースを取得する。
- **変更ファイルを読む**（`src/content/content.js` `src/content/labels.js` `src/styles/hide.css` `manifest.json` など）。
  「何を」「どのセレクタ/ラベル/URLパスで」隠す/変える機能なのかを特定する。これがモックに再現すべき対象。

### 1. ツール準備（未導入なら）
```bash
# Firefox 本体（Mozilla公式）
curl -sL -o /tmp/firefox.tar.xz "https://download.mozilla.org/?product=firefox-latest&os=linux64&lang=en-US"
tar xf /tmp/firefox.tar.xz -C /tmp && /tmp/firefox/firefox --version
# geckodriver
curl -sL -o /tmp/gd.tar.gz "https://github.com/mozilla/geckodriver/releases/download/v0.36.0/geckodriver-v0.36.0-linux64.tar.gz"
tar xf /tmp/gd.tar.gz -C /tmp && chmod +x /tmp/geckodriver
# Python ライブラリ
pip3 install --quiet selenium Pillow
```

### 2. テスト用の拡張コピーを作る
```bash
rm -rf /tmp/exttest && cp -r <対象ブランチの拡張ルート> /tmp/exttest
```
`/tmp/exttest/manifest.json` の `content_scripts[].matches` を **`["http://localhost/*"]`** に書き換える。
- ⚠️ **重要な落とし穴**: match pattern に **ポート番号は書けない**。`http://localhost:8000/*` は無効になり content script が
  **無言で登録されない**（症状: html に `data-iff-*` が付かない、何も隠れない）。必ずポート無しの `http://localhost/*`。
- これ以外は**絶対に変更しない**（フィルタのロジックを検証する意味がなくなる）。

### 3. モックページを用意/拡張する
`verification/harness/mock/` を雛形として使う。確認したい機能に合わせて DOM を**忠実に**再現する：
- おすすめ投稿 → `<article>` 内に、子要素を持たない短いテキスト要素で `labels.js` のラベル（例:「おすすめ」「Suggested for you」）を置く。
- リール導線 → `a[href="/reels/"]`。
- 発見ページ → パスが `/explore/` になるよう `mock/explore/index.html` に配置し、`main` 内に `a[href*="/p/"]` `a[href*="/reel/"]` のグリッド＋検索バーを置く。
- **新機能の確認時**は、その機能が対象にする実際のセレクタ/ラベル/URLパスを `hide.css` / `content.js` から読み取り、同じ構造をモックに足す。

配信:
```bash
cd verification/harness && python3 -m http.server 8000 --directory mock &
```

### 4. 撮影スクリプトを実行
`verification/harness/run_verify.py` を使う（このskillと同じ内容の雛形が同梱）。やること：
- UUID をpref `extensions.webextensions.uuids` で固定 → popup を `moz-extension://<uuid>/src/popup/popup.html` で開ける。
- **session A（拡張なし）** と **session B（`driver.install_addon("/tmp/exttest", temporary=True)`）** を別々に起動し、
  ホーム/発見/popup/トグルoff後 を撮影。
- スクショだけでなく `getComputedStyle(...).display` を `execute_script` で取得し、**数値でも判定**する
  （例: おすすめ投稿 `none` / フォロー中 `block` / 検索バー `inline-block`）。
- Pillow で before/after の合成画像（`composite_*.png`）を作る。

### 5. 証跡をコミット
作業ブランチの `verification/`（`screenshots/` と `harness/`）に置いて push。
スクショは PR コメントから raw URL で参照するため、**コミットSHAをメモ**する。

### 6. PR にコメント投稿
リポジトリは **public** なので raw URL で画像が埋め込める。**コミットSHA固定**の raw URL を使う：
`https://raw.githubusercontent.com/taka-kawah/firefox-instagram-extension/<SHA>/verification/screenshots/<file>.png`

コメントには必ず含める：
1. **確認方法の注意書き**（本物のIGは使えず、実拡張×再現モックで検証した旨／`matches` 1点のみ変更）
2. before/after 画像
3. チェックリスト表（PR本文の項目に対応）＋ DOM検証値
4. 未検証事項（実機の無限スクロール追従など環境制約）

`mcp__github__add_issue_comment`（PR番号を issue_number に渡す）で投稿する。

## 完了の定義
- PR の全チェック項目について ✅/❌ が示され、画像と数値の両方で裏付けられている。
- 証跡が `verification/` にコミットされ、PR コメントに埋め込まれている。
