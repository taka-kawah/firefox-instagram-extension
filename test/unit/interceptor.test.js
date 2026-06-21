// test/unit/interceptor.test.js
//
// 単体テスト: 方式B のフィルタ純粋ロジック（interceptor.js）。
// 「フィードJSONからおすすめ/広告アイテムだけを保守的に取り除く」ことを固定する。

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isSuggestedEdge,
  isSponsoredEdge,
  filterFeedJson,
  maybeFilter,
  __state,
} = require("../../src/page/interceptor.js");

test("isSuggestedEdge: おすすめマーカーを検知する", () => {
  assert.equal(isSuggestedEdge({ node: { explore_story: {} } }), true, "explore_story はおすすめ");
  assert.equal(isSuggestedEdge({ node: { suggested_users: [] } }), true, "suggested_users はおすすめ");
  assert.equal(isSuggestedEdge({ injected: {} }), true, "injected ユニットはおすすめ扱い");
});

test("isSponsoredEdge: 広告マーカーを検知する", () => {
  assert.equal(isSponsoredEdge({ node: { media: { is_sponsored: true } } }), true, "is_sponsored は広告");
  assert.equal(isSponsoredEdge({ node: { is_ad: true } }), true, "is_ad は広告");
  assert.equal(isSponsoredEdge({ node: { ad: {} } }), true, "ad は広告");
});

test("各判定: 通常のフォロー投稿は残す", () => {
  const followEdge = { node: { id: "123", media: { is_sponsored: false } } };
  assert.equal(isSuggestedEdge(followEdge), false);
  assert.equal(isSponsoredEdge(followEdge), false);
  assert.equal(isSuggestedEdge(null), false);
  assert.equal(isSponsoredEdge({}), false);
});

test("filterFeedJson: options で広告のみ・おすすめのみを切り替えられる", () => {
  const make = () => ({
    edges: [
      { node: { id: "follow" } },
      { node: { explore_story: {} } },
      { node: { media: { is_sponsored: true } } },
    ],
  });

  // おすすめのみ除去（広告は残す）
  const a = make();
  filterFeedJson(a, { suggested: true, sponsored: false });
  assert.equal(a.edges.length, 2);

  // 広告のみ除去（おすすめは残す）
  const b = make();
  filterFeedJson(b, { suggested: false, sponsored: true });
  assert.equal(b.edges.length, 2);

  // 両方除去
  const c = make();
  filterFeedJson(c, { suggested: true, sponsored: true });
  assert.equal(c.edges.length, 1);
});

test("filterFeedJson: edges 配列からおすすめ/広告を取り除き、通常投稿は残す", () => {
  const feed = {
    data: {
      xdt_api__v1__feed__timeline__connection: {
        edges: [
          { node: { id: "follow-1" } },
          { node: { explore_story: { id: "s1" } } },
          { node: { id: "follow-2" } },
          { injected: { label: "Suggested for you" } },
          { node: { media: { is_sponsored: true } } },
        ],
      },
    },
  };

  filterFeedJson(feed);
  const edges = feed.data.xdt_api__v1__feed__timeline__connection.edges;

  assert.equal(edges.length, 2, "おすすめ/広告3件が除去され、フォロー2件が残る");
  assert.deepEqual(
    edges.map((e) => e.node.id),
    ["follow-1", "follow-2"]
  );
});

test("filterFeedJson: フィード以外のJSONは変化しない", () => {
  const config = { user: { id: 1, name: "taro" }, items: [1, 2, 3] };
  const before = JSON.stringify(config);
  filterFeedJson(config);
  assert.equal(JSON.stringify(config), before);
});

test("filterFeedJson: 循環参照があっても無限ループしない", () => {
  const a = { edges: [{ node: { id: "x" } }] };
  a.self = a; // 循環
  assert.doesNotThrow(() => filterFeedJson(a));
  assert.equal(a.edges.length, 1);
});

test("maybeFilter: 設定で無効化されているときは何もしない", () => {
  const feed = { edges: [{ node: { explore_story: {} } }, { node: { id: "1" } }] };

  __state.enabled = false;
  __state.hideSuggestedFeed = true;
  maybeFilter(feed);
  assert.equal(feed.edges.length, 2, "全体OFFなら除去しない");

  __state.enabled = true;
  __state.hideSuggestedFeed = false;
  maybeFilter(feed);
  assert.equal(feed.edges.length, 2, "おすすめ非表示OFFなら除去しない");

  // 後片付け（既定に戻す）
  __state.enabled = true;
  __state.hideSuggestedFeed = true;
  maybeFilter(feed);
  assert.equal(feed.edges.length, 1, "有効なら除去する");
});
