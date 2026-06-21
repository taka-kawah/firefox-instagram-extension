// interceptor.js  （方式B：JSON/ネットワークインターセプト）
//
// このスクリプトは「ページ本体（メインワールド）」で動く点が他と異なる。
// content script から <script> として注入され、Instagram 自身の JavaScript と
// 同じ世界で `JSON.parse` と `Response.prototype.json` をフックする。
//
// 目的：フィードの JSON が「画面に描画される前」に、おすすめ/広告由来のアイテムを
// 取り除くこと。これにより、方式A（DOM後処理）で起きる「一瞬表示されてから消える」
// チラつきを根本からなくす。方式A は取りこぼし用のフォールバックとして引き続き残す。
//
// ⚠️ Instagram の内部 JSON 構造に依存するため壊れやすい。判定は保守的にし、
//    「明確におすすめ/広告とわかるアイテムだけ」を除去する。

(function () {
  "use strict";

  // ---- 設定フラグ（content script から postMessage で受け取る）----------------
  // 既定は「有効」。多くのユーザーは有効なので、メッセージ到着前の初回リクエストにも
  // フィルタが効くようにしておく（チラつき低減を最優先）。
  const state = { enabled: true, hideSuggestedFeed: true, hideSponsored: false };

  // ---- 純粋ロジック（テスト可能）--------------------------------------------

  // 1件のフィードアイテム（edge）が「おすすめ」かどうかを保守的に判定する。
  function isSuggestedEdge(edge) {
    if (!edge || typeof edge !== "object") return false;
    if (edge.injected) return true; // おすすめ/広告の差し込みユニット
    const node = edge.node;
    if (!node || typeof node !== "object") return false;
    if (node.injected) return true;
    if (node.explore_story) return true; // フォロー外からのおすすめ投稿
    if (node.suggested_users) return true; // おすすめユーザーカード
    return false;
  }

  // 1件のフィードアイテム（edge）が「広告（Sponsored）」かどうかを判定する。
  function isSponsoredEdge(edge) {
    if (!edge || typeof edge !== "object") return false;
    const node = edge.node;
    if (!node || typeof node !== "object") return false;
    if (node.ad || node.is_ad === true) return true;
    const media = node.media && typeof node.media === "object" ? node.media : node;
    if (media && media.is_sponsored === true) return true;
    return false;
  }

  // 任意の JSON を再帰的に走査し、"edges" 配列から不要アイテムを取り除く。
  // options で「おすすめ」「広告」のどちらを除去するか切り替える。
  // - 元データを破壊的に変更しつつ、同じ参照を返す（呼び出し側が使いやすいように）。
  // - フィード以外の JSON は実質変化しない（"edges" を持たないため）。
  function filterFeedJson(data, options, _seen) {
    const opts = options || { suggested: true, sponsored: true };
    if (!data || typeof data !== "object") return data;
    const seen = _seen || new Set();
    if (seen.has(data)) return data; // 循環参照対策
    seen.add(data);

    if (Array.isArray(data)) {
      for (const item of data) filterFeedJson(item, opts, seen);
      return data;
    }

    for (const key of Object.keys(data)) {
      const value = data[key];
      if (key === "edges" && Array.isArray(value)) {
        data[key] = value.filter((edge) => {
          if (opts.suggested && isSuggestedEdge(edge)) return false;
          if (opts.sponsored && isSponsoredEdge(edge)) return false;
          return true;
        });
        // 残った edge の内部もさらに走査
        for (const edge of data[key]) filterFeedJson(edge, opts, seen);
      } else {
        filterFeedJson(value, opts, seen);
      }
    }
    return data;
  }

  // フィルタを適用すべきか（設定とデータ型のガード）。
  function maybeFilter(value) {
    if (!state.enabled) return value;
    const opts = { suggested: state.hideSuggestedFeed, sponsored: state.hideSponsored };
    if (!opts.suggested && !opts.sponsored) return value;
    if (!value || typeof value !== "object") return value;
    try {
      return filterFeedJson(value, opts);
    } catch (e) {
      return value; // 何かあっても元データはそのまま通す（壊さない）
    }
  }

  // ---- ブラウザのメインワールドでのフック --------------------------------------

  function installHooks(win) {
    // JSON.parse をフック
    const originalParse = win.JSON.parse;
    win.JSON.parse = function (text, reviver) {
      const result = originalParse.call(this, text, reviver);
      return maybeFilter(result);
    };

    // fetch のレスポンス .json() をフック
    if (win.Response && win.Response.prototype && win.Response.prototype.json) {
      const originalJson = win.Response.prototype.json;
      win.Response.prototype.json = function () {
        return originalJson.apply(this, arguments).then((data) => maybeFilter(data));
      };
    }

    // content script からの設定通知を受け取る
    win.addEventListener("message", (event) => {
      if (event.source !== win) return;
      const msg = event.data;
      if (!msg || msg.__iffChannel !== "settings") return;
      if (typeof msg.enabled === "boolean") state.enabled = msg.enabled;
      if (typeof msg.hideSuggestedFeed === "boolean") state.hideSuggestedFeed = msg.hideSuggestedFeed;
      if (typeof msg.hideSponsored === "boolean") state.hideSponsored = msg.hideSponsored;
    });
  }

  // Node（テスト）では純粋ロジックだけをエクスポートし、フックは行わない。
  // ブラウザのページ文脈ではフックを仕掛ける。
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { isSuggestedEdge, isSponsoredEdge, filterFeedJson, maybeFilter, __state: state };
  } else if (typeof window !== "undefined" && window.JSON) {
    installHooks(window);
  }
})();
