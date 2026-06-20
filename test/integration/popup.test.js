// test/integration/popup.test.js
//
// 統合テスト: ポップアップ(popup.html + popup.js)。
// 設定の読み込み（チェックボックスへの反映）と、操作時のストレージ保存、
// 全体OFF時に個別トグルが操作不能になることを検証する。

const test = require("node:test");
const assert = require("node:assert/strict");

const { createBrowserMock, loadInWindow, readSrc, tick } = require("../helpers/harness.js");

const POPUP_HTML = readSrc("src/popup/popup.html");
const POPUP_SCRIPTS = ["src/popup/popup.js"];

async function setupPopup(initialSettings = {}) {
  const browser = createBrowserMock(initialSettings);
  const env = loadInWindow({
    html: POPUP_HTML,
    url: "about:blank",
    browser,
    scripts: POPUP_SCRIPTS,
  });
  await tick(env.window);
  return { ...env, browser };
}

test("保存済みの設定がチェックボックスへ反映される", async () => {
  const { document, window } = await setupPopup({
    enabled: true,
    hideSuggestedFeed: false,
    hideReelsNav: true,
    hideExploreGrid: true,
  });

  assert.equal(document.getElementById("enabled").checked, true);
  assert.equal(document.getElementById("hideSuggestedFeed").checked, false);
  assert.equal(document.getElementById("hideReelsNav").checked, true);
  assert.equal(document.getElementById("hideExploreGrid").checked, true);

  window.close();
});

test("トグルを操作するとストレージへ保存される", async () => {
  const { document, window, browser } = await setupPopup();

  const cb = document.getElementById("hideReelsNav");
  cb.checked = false;
  cb.dispatchEvent(new window.Event("change"));
  await tick(window);

  assert.equal(browser.__store.hideReelsNav, false, "OFF にした設定がストレージへ保存される");

  window.close();
});

test("全体OFFにすると個別トグルが操作不能になる", async () => {
  const { document, window } = await setupPopup({ enabled: true });

  const master = document.getElementById("enabled");
  master.checked = false;
  master.dispatchEvent(new window.Event("change"));
  await tick(window);

  assert.ok(document.getElementById("group").classList.contains("disabled"), "グループがグレーアウトする");
  assert.equal(document.getElementById("hideReelsNav").disabled, true, "個別トグルが disabled になる");

  window.close();
});
