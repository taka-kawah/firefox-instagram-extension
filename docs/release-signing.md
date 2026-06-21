# 署名済み .xpi を自動公開する設定（unlisted 署名）

`main` にマージすると、GitHub Actions（`.github/workflows/release.yml`）が `.xpi` をビルドして
[Releases](https://github.com/taka-kawah/firefox-instagram-extension/releases) に公開します。
ここで **AMO の API キーを登録しておくと、自分用の「unlisted（自己配布）署名」** が自動で行われ、
**通常版 Firefox に恒久インストールできる署名済み `.xpi`** が公開されます。

> 🔑 「unlisted 署名」は **AMO への公開リスト掲載や手動審査ではありません**。自動チェックのみで、
> あなた専用の署名済みファイルが得られる無料の仕組みです。

## 1. AMO の API キーを取得する

1. [Firefox Add-on Developer Hub のAPI キーページ](https://addons.mozilla.org/developers/addon/api/key/) を開く
   （無料の Firefox アカウントが必要）。
2. **JWT issuer**（=`AMO_JWT_ISSUER`）と **JWT secret**（=`AMO_JWT_SECRET`）を発行する。
   - secret は一度しか表示されないので控えておく。

## 2. GitHub Secrets に登録する

リポジトリの **Settings → Secrets and variables → Actions → New repository secret** で、次の2つを登録する。

| Secret 名 | 値 |
| --- | --- |
| `AMO_JWT_ISSUER` | 上記の JWT issuer |
| `AMO_JWT_SECRET` | 上記の JWT secret |

## 3. リリースする

- `manifest.json` の `version` を上げて `main` にマージする。
- ワークフローが `web-ext sign --channel=unlisted` で署名し、署名済み `.xpi` を Releases に公開する。

> ⚠️ **AMO は同じ version の再署名を拒否します。** 新しい `.xpi` を出すときは必ず `version` を上げてください。
> 同じ version のまま再 push された場合、ワークフローは（既存リリースがあるため）スキップします。

## キー未登録のときの挙動

`AMO_JWT_ISSUER` が未登録の間は、ワークフローは **未署名の `.xpi`** をビルドして公開します。
未署名版は通常版 Firefox では恒久インストールできず、`about:debugging` からの一時読み込みでの利用になります。
後からキーを登録すれば、次回以降は自動的に署名版へ切り替わります。

## 署名済み .xpi のインストール方法

1. Releases から署名済み `.xpi` をダウンロード。
2. Firefox で `about:addons` を開く。
3. 右上の歯車アイコン →「**ファイルからアドオンをインストール…**」→ ダウンロードした `.xpi` を選択。
4. 恒久的にインストールされ、再起動しても残ります。
