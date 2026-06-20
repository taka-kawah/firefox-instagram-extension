// popup.js
//
// ツールバーアイコンを押すと開く小さな設定パネルの動作。
// チェックボックスの状態を storage に保存するだけ。保存すると、開いている Instagram の
// タブのコンテンツスクリプトが storage.onChanged で変化を受け取り、即座に表示へ反映する。

const api = typeof browser !== "undefined" ? browser : chrome;

const KEYS = ["enabled", "hideSuggestedFeed", "hideReelsNav", "hideExploreGrid"];
const DEFAULTS = {
  enabled: true,
  hideSuggestedFeed: true,
  hideReelsNav: true,
  hideExploreGrid: true,
};

// 全体オフのときは、個別トグルを操作不能（グレーアウト）にして分かりやすくする。
function updateDisabledState(enabled) {
  document.getElementById("group").classList.toggle("disabled", !enabled);
  ["hideSuggestedFeed", "hideReelsNav", "hideExploreGrid"].forEach((k) => {
    document.getElementById(k).disabled = !enabled;
  });
}

async function load() {
  let stored = {};
  try {
    stored = await api.storage.local.get(KEYS);
  } catch (e) {
    stored = {};
  }
  const s = { ...DEFAULTS, ...stored };
  KEYS.forEach((k) => {
    document.getElementById(k).checked = !!s[k];
  });
  updateDisabledState(s.enabled);
}

KEYS.forEach((k) => {
  document.getElementById(k).addEventListener("change", async (e) => {
    await api.storage.local.set({ [k]: e.target.checked });
    if (k === "enabled") updateDisabledState(e.target.checked);
  });
});

load();
