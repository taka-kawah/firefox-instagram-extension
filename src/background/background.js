// background.js
//
// 拡張機能のインストール時に、設定の初期値を保存しておくだけの軽量スクリプト。
// これがあることで、初回からポップアップやコンテンツスクリプトが正しい初期状態を読める。

const api = typeof browser !== "undefined" ? browser : chrome;

const DEFAULTS = {
  enabled: true,
  hideSuggestedFeed: true,
  hideReelsNav: true,
  hideExploreGrid: true,
};

api.runtime.onInstalled.addListener(async () => {
  try {
    const stored = await api.storage.local.get(Object.keys(DEFAULTS));
    // 既存の設定があれば尊重し、無いキーだけデフォルトで埋める。
    await api.storage.local.set({ ...DEFAULTS, ...stored });
  } catch (e) {
    // 失敗してもコンテンツスクリプト側がデフォルトで動くので致命的ではない。
  }
});
