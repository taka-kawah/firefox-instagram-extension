// test/helpers/harness.js
//
// テストから拡張機能のスクリプト（content.js / popup.js）を、
// 実ブラウザに近い環境（jsdom）へ読み込んで動かすための共通ヘルパー。
//
// ポイント:
//   - browser.* API（storage 等）をテスト用のモックに差し替える
//   - jsdom に無い requestAnimationFrame を簡易ポリフィル
//   - content.js が貼る setInterval（URL 監視用）はテストでは不要なので no-op 化し、
//     テストプロセスがハングしないようにする

const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(__dirname, "..", "..");

function readSrc(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

// テスト用の storage モック。sync / local の2つの保存領域を持ち、
// set 時には onChanged リスナーへ「どちらの領域が変わったか(area名)」付きで通知する。
//
//   createBrowserMock(initialSync, { local, syncAvailable })
//     initialSync   … sync 領域の初期値（既定の保存先なので、ここに設定を入れる）
//     local         … local 領域の初期値
//     syncAvailable … false にすると storage.sync を生やさない（sync 非対応環境の再現）
function createBrowserMock(initialSync = {}, opts = {}) {
  const { local = {}, syncAvailable = true } = opts;
  const stores = { sync: { ...initialSync }, local: { ...local } };
  const listeners = [];

  function emit(changes, area) {
    for (const fn of listeners) fn(changes, area);
  }

  function makeArea(area) {
    return {
      async get(keys) {
        const store = stores[area];
        if (!keys) return { ...store };
        const keyList = Array.isArray(keys) ? keys : [keys];
        const out = {};
        for (const k of keyList) {
          if (k in store) out[k] = store[k];
        }
        return out;
      },
      async set(obj) {
        const store = stores[area];
        const changes = {};
        for (const k of Object.keys(obj)) {
          changes[k] = { oldValue: store[k], newValue: obj[k] };
          store[k] = obj[k];
        }
        emit(changes, area);
      },
    };
  }

  const api = {
    storage: {
      local: makeArea("local"),
      onChanged: {
        addListener(fn) {
          listeners.push(fn);
        },
      },
    },
    runtime: {
      onInstalled: { addListener() {} },
    },
    // テストから直接ストアを覗く/操作するための補助（拡張機能本体は使わない）
    __stores: stores,
    __emit: emit,
    __listenerCount() {
      return listeners.length;
    },
  };
  if (syncAvailable) api.storage.sync = makeArea("sync");
  return api;
}

// 指定の HTML と URL で jsdom を作り、browser モックを差し込んでから
// 渡されたスクリプト群（ファイルパス）を window スコープで評価する。
function loadInWindow({ html, url, browser, scripts }) {
  const dom = new JSDOM(html, {
    url,
    runScripts: "outside-only", // HTML 内の <script> は自動実行しない（手動で評価する）
  });
  const { window } = dom;

  // browser / chrome API モック
  window.browser = browser;
  window.chrome = browser;

  // requestAnimationFrame / setInterval は「後から発火する非同期処理」を作る。
  // テストでは window.close() 後にそれらが走ると jsdom がエラーになるため、
  // バックグラウンドのタイマーを残さないよう no-op 化する。
  // （filterFeed / applyRootFlags の本処理は start() や onChanged から同期的に呼ばれるため、
  //   rAF を no-op にしても検証対象の動作には影響しない）
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
  window.setInterval = () => 0;

  // 実ブラウザでは複数の content_scripts ファイルが同じトップレベルスコープを共有し、
  // labels.js の `const IFF_SUGGESTED_LABELS` を content.js から参照できる。
  // それを再現するため、スクリプトは結合して1回の eval で評価する
  // （別々に eval すると const が共有されない）。
  // なお window には module が無いため、labels.js の module.exports ガードは踏まれない。
  const combined = scripts.map((rel) => readSrc(rel)).join("\n;\n");
  window.eval(combined);

  return { dom, window, document: window.document };
}

// 非同期処理（init の await やポリフィルした rAF）が落ち着くのを待つ。
function tick(window, ms = 30) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

module.exports = { createBrowserMock, loadInWindow, readSrc, tick, ROOT };
