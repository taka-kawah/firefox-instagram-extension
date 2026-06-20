// settings.js
//
// 設定（オン/オフ）の保存・読み込みを一手に引き受ける共通ユーティリティ。
// background / popup / content script のすべてがこれを経由することで、
// 「保存先は storage.sync を主に、使えない環境では storage.local にフォールバック」
// というルールを1か所に集約する。
//
// storage.sync … Firefox Sync 経由でブラウザ間（別端末・別プロファイル）に同期される保存先。
// storage.local … その端末内だけの保存先。sync が使えないとき（未ログイン等）の予備。
//
// このファイルは labels.js と同様、content_scripts / popup / background の各文脈で
// 先に読み込まれ、グローバルの IFFSettings を提供する。
// （`const api = ...` のようなトップレベル宣言は他スクリプトと衝突するため置かない）

const IFF_DEFAULTS = {
  enabled: true, // 拡張機能全体のオン/オフ
  hideSuggestedFeed: true, // ホームのおすすめ投稿を隠す
  hideReelsNav: true, // 左メニューのリール導線を隠す
  hideExploreGrid: true, // 発見ページのおすすめグリッドを隠す
  hideSponsored: false, // 広告（Sponsored）投稿を隠す（任意機能・既定OFF）
};

// browser.* / chrome.* を呼び出し時点で解決する（テストからモックを差し替えやすくするため）。
function iffGetStorageApi() {
  if (typeof browser !== "undefined" && browser && browser.storage) return browser;
  if (typeof chrome !== "undefined" && chrome && chrome.storage) return chrome;
  return null;
}

const IFFSettings = {
  DEFAULTS: IFF_DEFAULTS,
  KEYS: Object.keys(IFF_DEFAULTS),

  // 設定を読み込む。sync を優先し、読めなければ local にフォールバック。
  // どちらも失敗した場合はデフォルト値を返す（拡張機能が止まらないように）。
  async load() {
    const api = iffGetStorageApi();
    if (api) {
      // 1) sync から
      if (api.storage.sync) {
        try {
          const stored = await api.storage.sync.get(this.KEYS);
          return { ...IFF_DEFAULTS, ...stored };
        } catch (e) {
          /* sync が使えない → local へ */
        }
      }
      // 2) local から
      try {
        const stored = await api.storage.local.get(this.KEYS);
        return { ...IFF_DEFAULTS, ...stored };
      } catch (e) {
        /* local も失敗 → デフォルト */
      }
    }
    return { ...IFF_DEFAULTS };
  },

  // 設定を保存する。sync を優先し、失敗したら local に保存。
  async save(partial) {
    const api = iffGetStorageApi();
    if (!api) return;
    if (api.storage.sync) {
      try {
        await api.storage.sync.set(partial);
        return;
      } catch (e) {
        /* sync が使えない → local へ */
      }
    }
    await api.storage.local.set(partial);
  },

  // 設定変更の監視。sync / local どちらの変更も拾い、自分が扱うキーの変更だけを渡す。
  onChanged(callback) {
    const api = iffGetStorageApi();
    if (!api || !api.storage.onChanged) return;
    api.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" && areaName !== "local") return;
      const relevant = {};
      let hit = false;
      for (const key of this.KEYS) {
        if (key in changes) {
          relevant[key] = changes[key];
          hit = true;
        }
      }
      if (hit) callback(relevant, areaName);
    });
  },
};

// テスト（Node.js）からも参照できるようにエクスポート。
// ブラウザでは module が存在しないため、この行は実行されず動作に影響しない。
if (typeof module !== "undefined" && module.exports) {
  module.exports = { IFFSettings, IFF_DEFAULTS };
}
