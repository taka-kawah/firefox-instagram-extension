// background.js
//
// 拡張機能のインストール時に、設定の初期値を保存しておくだけの軽量スクリプト。
// これがあることで、初回からポップアップやコンテンツスクリプトが正しい初期状態を読める。
// 保存・読み込みは共通ユーティリティ(settings.js)経由（storage.sync 優先 / local フォールバック）。

const api = typeof browser !== "undefined" ? browser : chrome;

api.runtime.onInstalled.addListener(async () => {
  try {
    // 既存の設定があれば尊重し、無いキーはデフォルトで補完して保存する。
    const current = await IFFSettings.load();
    await IFFSettings.save(current);
  } catch (e) {
    // 失敗してもコンテンツスクリプト側がデフォルトで動くので致命的ではない。
  }
});
