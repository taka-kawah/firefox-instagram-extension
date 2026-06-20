// test/unit/settings.test.js
//
// 単体テスト: 設定の保存ユーティリティ settings.js。
// 「storage.sync を優先し、使えないときは storage.local にフォールバックする」
// という要件を固定する。

const test = require("node:test");
const assert = require("node:assert/strict");

const { createBrowserMock } = require("../helpers/harness.js");
const { IFFSettings, IFF_DEFAULTS } = require("../../src/shared/settings.js");

// settings.js は呼び出し時に globalThis.browser を見るため、テストごとに差し替える。
function withBrowser(mock, fn) {
  const had = "browser" in globalThis;
  const prev = globalThis.browser;
  globalThis.browser = mock;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (had) globalThis.browser = prev;
      else delete globalThis.browser;
    });
}

test("load: sync を優先して読む", async () => {
  const mock = createBrowserMock({ enabled: false });
  await withBrowser(mock, async () => {
    const s = await IFFSettings.load();
    assert.equal(s.enabled, false, "sync の値が反映される");
    assert.equal(s.hideReelsNav, true, "未設定キーはデフォルトで埋まる");
  });
});

test("load: sync が使えなければ local にフォールバック", async () => {
  const mock = createBrowserMock({}, { local: { hideReelsNav: false }, syncAvailable: false });
  await withBrowser(mock, async () => {
    const s = await IFFSettings.load();
    assert.equal(s.hideReelsNav, false, "local の値が読まれる");
  });
});

test("load: storage が全く使えなければデフォルトを返す", async () => {
  await withBrowser(undefined, async () => {
    const s = await IFFSettings.load();
    assert.deepEqual(s, IFF_DEFAULTS);
  });
});

test("save: 既定では sync に保存する", async () => {
  const mock = createBrowserMock();
  await withBrowser(mock, async () => {
    await IFFSettings.save({ enabled: false });
    assert.equal(mock.__stores.sync.enabled, false, "sync に書かれる");
    assert.equal("enabled" in mock.__stores.local, false, "local には書かれない");
  });
});

test("save: sync が使えなければ local に保存する", async () => {
  const mock = createBrowserMock({}, { syncAvailable: false });
  await withBrowser(mock, async () => {
    await IFFSettings.save({ enabled: false });
    assert.equal(mock.__stores.local.enabled, false, "local にフォールバック保存される");
  });
});

test("save: sync が例外を投げたら local にフォールバックする", async () => {
  // sync.set が失敗する状況を手作りで再現する。
  const local = createBrowserMock(); // local 領域の実装を流用
  const mock = {
    storage: {
      sync: {
        async get() {
          throw new Error("sync unavailable");
        },
        async set() {
          throw new Error("sync unavailable");
        },
      },
      local: local.storage.local,
      onChanged: { addListener() {} },
    },
  };
  await withBrowser(mock, async () => {
    await IFFSettings.save({ enabled: false });
    assert.equal(local.__stores.local.enabled, false, "例外時は local に保存される");
  });
});

test("onChanged: sync の変更を拾い、自分のキーだけ渡す", async () => {
  const mock = createBrowserMock();
  await withBrowser(mock, async () => {
    let received = null;
    let receivedArea = null;
    IFFSettings.onChanged((changes, area) => {
      received = changes;
      receivedArea = area;
    });
    // 無関係なキーは無視され、設定キーだけが通知される
    await mock.storage.sync.set({ enabled: false, someUnrelatedKey: 1 });
    assert.ok(received, "コールバックが呼ばれる");
    assert.equal(receivedArea, "sync");
    assert.ok("enabled" in received, "設定キーは渡る");
    assert.equal("someUnrelatedKey" in received, false, "無関係なキーは渡らない");
  });
});
