# プライバシーポリシー / Privacy Policy

最終更新日: 2026-06-21

## 日本語

**Instagram フォーカスフィルター**（以下「本拡張機能」）は、ユーザーのプライバシーを最大限尊重します。

### 収集する情報
本拡張機能は、いかなる個人情報・閲覧履歴・利用状況データも **収集しません**。外部サーバーへの送信も一切行いません。

### 保存する情報
本拡張機能が保存するのは、**オン/オフのトグル設定だけ**です。これらは Firefox の拡張機能ストレージ（`storage.sync` / `storage.local`）に保存されます。

- `storage.sync` を使う場合、設定は Firefox アカウントを通じて**あなた自身の別端末**に同期されます。これは Mozilla/Firefox の同期機能によるもので、本拡張機能の開発者がアクセスできるデータではありません。
- 同期が使えない場合は、その端末内（`storage.local`）にのみ保存されます。

### 第三者への提供
収集するデータが存在しないため、第三者への提供・販売は **一切ありません**。

### 権限について
本拡張機能が要求する権限は最小限です。

- `storage` … 上記のトグル設定を保存するため。
- `https://www.instagram.com/*` への content script … Instagram のページ上で表示を加工（おすすめ投稿などを非表示に）するため。ページ内容を外部へ送ることはありません。

### お問い合わせ
本ポリシーに関するご質問は、GitHub リポジトリの Issue からお願いします。

---

## English

**Instagram Focus Filter** (the "Extension") respects your privacy.

### Information we collect
The Extension collects **no** personal data, browsing history, or usage analytics, and sends nothing to any external server.

### Information we store
The only thing the Extension stores is your **on/off toggle settings**, kept in Firefox extension storage (`storage.sync` / `storage.local`).

- With `storage.sync`, your settings sync to **your own other devices** via your Firefox Account. This is handled by Mozilla/Firefox sync and is not data the Extension's author can access.
- If sync is unavailable, settings are stored only on that device (`storage.local`).

### Sharing
Because no data is collected, nothing is ever shared or sold to third parties.

### Permissions
The Extension requests the minimum permissions:

- `storage` — to save the toggle settings above.
- A content script on `https://www.instagram.com/*` — to modify what is shown on the Instagram page (hiding suggested posts, etc.). Page contents are never sent anywhere.

### Contact
For questions about this policy, please open an issue on the GitHub repository.
