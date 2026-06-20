// test/integration/interceptor.test.js
//
// 統合テスト: interceptor.js をブラウザ相当の環境(jsdom)へ読み込み、
// 実際に window.JSON.parse がフックされ、パース結果からおすすめが除去されることを確認する。

const test = require("node:test");
const assert = require("node:assert/strict");

const { createBrowserMock, loadInWindow } = require("../helpers/harness.js");

test("JSON.parse フック: パース時点でおすすめ/広告が除去される", () => {
  const browser = createBrowserMock();
  const { window } = loadInWindow({
    html: "<!DOCTYPE html><html><body></body></html>",
    url: "https://www.instagram.com/",
    browser,
    scripts: ["src/page/interceptor.js"],
  });

  const feed = {
    data: {
      xdt_api__v1__feed__timeline__connection: {
        edges: [
          { node: { id: "follow-1" } },
          { node: { explore_story: { id: "s1" } } },
          { node: { id: "follow-2" } },
        ],
      },
    },
  };

  // ページの JSON.parse（フック済み）を通す
  const parsed = window.JSON.parse(JSON.stringify(feed));
  const edges = parsed.data.xdt_api__v1__feed__timeline__connection.edges;

  assert.equal(edges.length, 2, "おすすめが除去される");
  // jsdom と Node はレルムが異なり deepStrictEqual が使えないため、個別に比較する
  assert.equal(edges[0].node.id, "follow-1");
  assert.equal(edges[1].node.id, "follow-2");

  window.close();
});

test("JSON.parse フック: フィード以外のJSONはそのまま返る", () => {
  const browser = createBrowserMock();
  const { window } = loadInWindow({
    html: "<!DOCTYPE html><html><body></body></html>",
    url: "https://www.instagram.com/",
    browser,
    scripts: ["src/page/interceptor.js"],
  });

  const obj = { token: "abc", list: [1, 2, 3] };
  const parsed = window.JSON.parse(JSON.stringify(obj));
  // レルムをまたぐため、構造の一致は JSON 文字列で確認する
  assert.equal(JSON.stringify(parsed), JSON.stringify(obj));

  window.close();
});
