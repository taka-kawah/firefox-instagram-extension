# PR #2 動作確認の証跡

このフォルダは、PR #2「フェーズ1: おすすめ投稿・リール導線・発見ページのおすすめを非表示にする」の
動作確認（証跡）一式です。

## 確認環境

本確認はヘッドレスのクラウド環境で実施しました。本物の Instagram は
(1) ログインに利用者本人の認証情報が必要で、
(2) データセンターIPからの自動ログインがブロックされる
ため、**実拡張を実際の Firefox に読み込んだ上で、Instagram の該当DOM構造を忠実に再現したローカルのモックページ**に対して検証しています。

- ブラウザ: Mozilla Firefox 152.0.1（Mozilla 公式バイナリ）
- 自動化: Selenium 4.45 + geckodriver 0.36（`driver.install_addon(..., temporary=True)` で `about:debugging` の一時読み込みと同等）
- 拡張: PR #2 (`claude/phase1-implementation`) のソースをそのまま使用。
  **唯一の差分は `manifest.json` の `content_scripts[].matches` を
  `https://www.instagram.com/*` → `http://localhost/*` に変更した点のみ**（ローカルのモックを対象にするため。フィルタのロジック・CSS・ポップアップは一切改変なし）。

## 再現方法

```bash
cd verification/harness
python3 -m http.server 8000 --directory mock &   # モックを配信
python3 run_verify.py                            # Firefox 起動 → 拡張読み込み → 撮影
```

## 結果サマリ（PR本文のチェックリストに対応）

| テスト項目 | 結果 | 証跡 |
| --- | --- | --- |
| ホームのおすすめ投稿（日本語「おすすめ」/英語「Suggested for you」）が非表示。フォロー中は表示 | ✅ | `composite_home.png` |
| 左メニューの「リール」導線が非表示 | ✅ | `composite_home.png`（左ナビ） |
| 発見ページ `/explore/`：検索バーは残り、おすすめグリッドのみ非表示 | ✅ | `composite_explore.png` |
| 全体オフで、おすすめ投稿・リール・発見グリッドが元どおり表示 | ✅ | `composite_toggle.png` |
| ポップアップUIが開き、各トグルが表示される | ✅ | `05_popup_default_on.png` |

DOM 上の検証値（`getComputedStyle().display`）:

- ホーム（拡張ON）: 投稿 = `[block, none(おすすめ), block, none(Suggested)]`、リールリンク = `none`
- 発見（拡張ON）: グリッド9件 = すべて `none`、検索バー = `inline-block`（残る）
- 全体オフ後: 投稿 = すべて `block`、リールリンク = `flex`（復帰）
