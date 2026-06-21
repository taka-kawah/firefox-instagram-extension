// popup.js
//
// ツールバーアイコンを押すと開く小さな設定パネルの動作。
// チェックボックスの状態を共通ユーティリティ(settings.js)経由で保存する。
// 保存先は storage.sync が優先（別端末にも同期）、使えなければ storage.local。
// 保存すると、開いている Instagram のタブのコンテンツスクリプトが変化を受け取り、即座に反映する。

const KEYS = IFFSettings.KEYS;

// 全体OFFのときは、個別トグルを操作不能（グレーアウト）にして分かりやすくする。
function updateDisabledState(enabled) {
  document.getElementById("group").classList.toggle("disabled", !enabled);
  ["hideSuggestedFeed", "hideReelsNav", "hideExploreGrid", "hideSponsored"].forEach((k) => {
    document.getElementById(k).disabled = !enabled;
  });
}

async function load() {
  const s = await IFFSettings.load();
  KEYS.forEach((k) => {
    document.getElementById(k).checked = !!s[k];
  });
  updateDisabledState(s.enabled);
}

KEYS.forEach((k) => {
  document.getElementById(k).addEventListener("change", async (e) => {
    await IFFSettings.save({ [k]: e.target.checked });
    if (k === "enabled") updateDisabledState(e.target.checked);
  });
});

load();
