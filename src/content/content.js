// content.js
//
// Instagram のページ内で動くメインスクリプト（コンテンツスクリプト）。
// 役割は大きく3つ:
//   1. ホームのおすすめ投稿（<article>）を非表示にする        … JavaScript で判定して隠す
//   2. リール導線・発見ページのおすすめを非表示にする         … <html> に目印を付け、CSS(hide.css) で隠す
//   3. 設定（オン/オフ）の読み込みと、変更へのリアルタイム追従
//
// Instagram は SPA（ページを再読み込みせず画面が切り替わる作り）かつ無限スクロールのため、
// 一度処理して終わりではなく、MutationObserver で DOM の変化を監視して都度フィルタを再適用する。

(() => {
  "use strict";

  // 設定の保存・読み込み・監視は共通ユーティリティ（settings.js）に集約。
  // 保存先は storage.sync を優先し、使えない環境では storage.local にフォールバックする。
  const DEFAULTS = IFFSettings.DEFAULTS;

  let settings = { ...DEFAULTS };
  const root = document.documentElement; // <html> 要素

  // --- 方式B: ページ本体（メインワールド）へインターセプタを注入する ----------
  // content script は隔離された世界で動くため、Instagram 自身の JSON.parse などは
  // フックできない。そこで web_accessible_resource のスクリプトを <script> として
  // ページに差し込み、描画前にフィードJSONからおすすめ/広告を除去する。
  const runtimeApi = typeof browser !== "undefined" ? browser : chrome;

  function injectInterceptor() {
    try {
      const url = runtimeApi.runtime.getURL("src/page/interceptor.js");
      const script = document.createElement("script");
      script.src = url;
      script.async = false; // できるだけ早く（他のページスクリプトより前に）実行させる
      (document.head || document.documentElement).appendChild(script);
      script.addEventListener("load", () => script.remove());
    } catch (e) {
      // 注入に失敗しても方式A（DOM後処理）で動作するので致命的ではない。
    }
  }

  // ページ側インターセプタへ現在の設定（有効か・おすすめ非表示か）を伝える。
  function postSettingsToPage() {
    try {
      window.postMessage(
        {
          __iffChannel: "settings",
          enabled: settings.enabled,
          hideSuggestedFeed: settings.hideSuggestedFeed,
        },
        "*"
      );
    } catch (e) {
      /* noop */
    }
  }

  // --- ユーティリティ -------------------------------------------------------

  // 発見（Explore）ページの「トップ（おすすめ一覧）」を表示しているかどうか。
  // 検索後は URL が /explore/search/... 等に変わるため、トップのときだけ true にして
  // 「検索はできるが、おすすめ一覧は隠す」を実現する。
  function isExploreTop() {
    const p = location.pathname;
    return p === "/explore" || p === "/explore/";
  }

  // <html> に目印属性を付ける/外すヘルパー。CSS 側はこの属性を見て表示を切り替える。
  function setFlag(name, on) {
    if (on) root.setAttribute(name, "1");
    else root.removeAttribute(name);
  }

  // --- (2) CSS で隠す要素の目印を更新 --------------------------------------

  function applyRootFlags() {
    const on = settings.enabled;
    setFlag("data-iff-hide-reels", on && settings.hideReelsNav);
    setFlag("data-iff-hide-explore", on && settings.hideExploreGrid && isExploreTop());
  }

  // --- (1) ホームのおすすめ投稿を判定して隠す ------------------------------

  // 1件の投稿(<article>)が「おすすめ投稿」かどうかを、ラベル文字列の完全一致で判定する。
  function articleIsSuggested(article) {
    // 末端の小さなテキスト要素だけを見る（キャプションなど長い本文は対象外にして誤検出を防ぐ）
    const candidates = article.querySelectorAll("span, div, h1, h2, h3, a");
    for (const el of candidates) {
      if (el.childElementCount > 0) continue; // 子要素を持つ＝ラベルそのものではないので飛ばす
      const text = (el.textContent || "").trim();
      if (!text || text.length > 40) continue; // ラベルは短い
      if (IFF_SUGGESTED_LABELS.has(text)) return true;
    }
    return false;
  }

  function filterFeed() {
    if (!settings.enabled || !settings.hideSuggestedFeed) return;
    const articles = document.querySelectorAll("article");
    for (const article of articles) {
      if (article.hasAttribute("data-iff-suggested")) continue; // 既に隠した投稿はスキップ
      if (articleIsSuggested(article)) {
        article.setAttribute("data-iff-suggested", "1");
        article.style.setProperty("display", "none", "important");
      }
    }
  }

  // おすすめ非表示をオフにしたときに、隠していた投稿を元に戻す。
  function restoreHiddenFeed() {
    document.querySelectorAll("article[data-iff-suggested]").forEach((a) => {
      a.style.removeProperty("display");
      a.removeAttribute("data-iff-suggested");
    });
  }

  // --- まとめて実行 ---------------------------------------------------------

  function run() {
    applyRootFlags();
    filterFeed();
  }

  // DOM 変化のたびに run() を呼ぶと過剰になるので、1フレームに1回へ間引く。
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      run();
    });
  }

  const observer = new MutationObserver(schedule);

  // 設定が変わったときに全体を再評価する。
  function applyAll() {
    if (!settings.enabled || !settings.hideSuggestedFeed) restoreHiddenFeed();
    run();
  }

  // --- 設定の読み込みと監視 -------------------------------------------------

  async function loadSettings() {
    settings = await IFFSettings.load();
  }

  // sync / local どちらの変更も拾って即時反映する。
  IFFSettings.onChanged((changes) => {
    for (const key in changes) {
      settings[key] = changes[key].newValue;
    }
    applyAll();
    postSettingsToPage(); // ページ側インターセプタにも反映
  });

  // --- 起動 -----------------------------------------------------------------

  (async function init() {
    injectInterceptor(); // できるだけ早くページ側フックを仕込む（チラつき低減）

    await loadSettings();
    applyRootFlags(); // CSS 系はできるだけ早く反映（チラつき軽減）
    postSettingsToPage(); // 読み込んだ設定をページ側へ伝える

    const start = () => {
      run();
      observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });

    // SPA のページ遷移（URL だけ変わる）を取りこぼさないための保険。
    // 発見ページのトップかどうかは URL で決まるため、URL 変化を軽く監視して再評価する。
    let lastPath = location.pathname;
    setInterval(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        run();
      }
    }, 800);
  })();
})();
