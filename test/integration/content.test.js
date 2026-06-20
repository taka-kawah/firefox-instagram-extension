// test/integration/content.test.js
//
// 統合テスト: labels.js + content.js を jsdom 上の「Instagram 風 DOM」に読み込み、
// 実際に画面がどう変化するか（おすすめ投稿が隠れる/戻る、各目印が付く等）を検証する。
//
// 目的は「修正前と動作が変わらないこと」を機械的に保証すること。

const test = require("node:test");
const assert = require("node:assert/strict");

const { createBrowserMock, loadInWindow, tick } = require("../helpers/harness.js");
const { HOME_HTML, EXPLORE_HTML } = require("../helpers/fixtures.js");

const CONTENT_SCRIPTS = [
  "src/shared/settings.js",
  "src/content/labels.js",
  "src/content/content.js",
];

// ホーム画面を読み込んだ状態を用意するヘルパー。
async function setupHome(initialSettings = {}) {
  const browser = createBrowserMock(initialSettings);
  const env = loadInWindow({
    html: HOME_HTML,
    url: "https://www.instagram.com/",
    browser,
    scripts: CONTENT_SCRIPTS,
  });
  await tick(env.window); // init(async) の完了を待つ
  return { ...env, browser };
}

// 表示状態を読みやすくする小道具
const isHidden = (el) => el.style.getPropertyValue("display") === "none";
const hasFlag = (doc, name) => doc.documentElement.getAttribute(name) === "1";

test("既定（全機能ON）: おすすめ投稿だけが隠れ、フォロー投稿は残る", async () => {
  const { document, window } = await setupHome();

  assert.ok(isHidden(document.getElementById("post-suggested-ja")), "日本語『おすすめ』投稿は隠れる");
  assert.ok(isHidden(document.getElementById("post-suggested-en")), "英語『Suggested for you』投稿は隠れる");
  assert.ok(!isHidden(document.getElementById("post-follow-1")), "フォロー投稿1は表示されたまま");
  assert.ok(
    !isHidden(document.getElementById("post-follow-2")),
    "本文に『おすすめ』を含むだけのフォロー投稿は誤って隠さない"
  );

  // 隠した投稿には目印が付く
  assert.equal(document.getElementById("post-suggested-ja").getAttribute("data-iff-suggested"), "1");

  window.close();
});

test("既定（全機能ON）: リール導線の目印が <html> に付く", async () => {
  const { document, window } = await setupHome();
  assert.ok(hasFlag(document, "data-iff-hide-reels"), "リール非表示の目印が付く");
  window.close();
});

test("ホームでは発見ページ用の目印は付かない", async () => {
  const { document, window } = await setupHome();
  assert.ok(!hasFlag(document, "data-iff-hide-explore"), "ホームでは explore の目印は付かない");
  window.close();
});

test("発見ページ(/explore/)では explore の目印が付き、検索バーは残る", async () => {
  const browser = createBrowserMock();
  const { document, window } = loadInWindow({
    html: EXPLORE_HTML,
    url: "https://www.instagram.com/explore/",
    browser,
    scripts: CONTENT_SCRIPTS,
  });
  await tick(window);

  assert.ok(hasFlag(document, "data-iff-hide-explore"), "explore の目印が付く");
  // 検索バー(input)は DOM 上に残っている（CSSはリンクのみを隠す設計）
  assert.ok(document.querySelector('main input[placeholder="検索"]'), "検索バーは残っている");
  window.close();
});

test("全体OFFで読み込むと、何も隠れず目印も付かない", async () => {
  const { document, window } = await setupHome({ enabled: false });

  assert.ok(!isHidden(document.getElementById("post-suggested-ja")), "全体OFFならおすすめ投稿も隠れない");
  assert.ok(!hasFlag(document, "data-iff-hide-reels"), "全体OFFならリールの目印も付かない");
  window.close();
});

test("リール非表示だけOFFにすると、おすすめは隠れるがリール目印は付かない", async () => {
  const { document, window } = await setupHome({ hideReelsNav: false });

  assert.ok(isHidden(document.getElementById("post-suggested-ja")), "おすすめ投稿は隠れる");
  assert.ok(!hasFlag(document, "data-iff-hide-reels"), "リールの目印は付かない");
  window.close();
});

test("ストレージ変更でリアルタイムに反映される（全体OFF→おすすめ投稿とリールが復帰）", async () => {
  const { document, window, browser } = await setupHome();

  // 初期状態は隠れている
  assert.ok(isHidden(document.getElementById("post-suggested-ja")));
  assert.ok(hasFlag(document, "data-iff-hide-reels"));

  // content.js が storage.onChanged を購読していること
  assert.ok(browser.__listenerCount() >= 1, "storage.onChanged を購読している");

  // ポップアップ操作に相当：全体OFFを sync に保存 → onChanged が発火
  await browser.storage.sync.set({ enabled: false });
  await tick(window);

  assert.ok(!isHidden(document.getElementById("post-suggested-ja")), "おすすめ投稿が復帰する");
  assert.equal(
    document.getElementById("post-suggested-ja").hasAttribute("data-iff-suggested"),
    false,
    "目印も外れる"
  );
  assert.ok(!hasFlag(document, "data-iff-hide-reels"), "リールの目印も外れる");

  // 再度ONに戻すと、また隠れる
  await browser.storage.sync.set({ enabled: true });
  await tick(window);
  assert.ok(isHidden(document.getElementById("post-suggested-ja")), "再ONでまた隠れる");

  window.close();
});
