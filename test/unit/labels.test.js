// test/unit/labels.test.js
//
// 単体テスト: 「おすすめ投稿」を見分けるためのラベル辞書（labels.js）。
//
// このテストは、リファクタや辞書の編集で判定基準がうっかり変わってしまわないよう、
// 「どの文字列をおすすめと見なすか／見なさないか」を固定する回帰テスト。

const test = require("node:test");
const assert = require("node:assert/strict");

const { IFF_SUGGESTED_LABELS, IFF_SPONSORED_LABELS } = require("../../src/content/labels.js");

test("辞書は Set として読み込める", () => {
  assert.ok(IFF_SUGGESTED_LABELS instanceof Set);
  assert.ok(IFF_SUGGESTED_LABELS.size >= 10, "主要言語をカバーする程度の件数がある");
});

test("代表的な『おすすめ』ラベルを検知できる（多言語）", () => {
  const mustMatch = [
    "おすすめ", // 日本語
    "Suggested for you", // 英語
    "Suggested Posts", // 英語(見出し)
    "Sugerencias para ti", // スペイン語
    "Suggeriti per te", // イタリア語
    "Рекомендации для вас", // ロシア語
    "추천", // 韓国語
    "为你推荐", // 中国語(簡体)
  ];
  for (const label of mustMatch) {
    assert.ok(
      IFF_SUGGESTED_LABELS.has(label),
      `「${label}」はおすすめラベルとして検知されるべき`
    );
  }
});

test("代表的な『広告(Sponsored)』ラベルを検知できる（多言語）", () => {
  assert.ok(IFF_SPONSORED_LABELS instanceof Set);
  const mustMatch = [
    "広告", // 日本語
    "Sponsored", // 英語
    "Patrocinado", // スペイン語/ポルトガル語
    "Gesponsert", // ドイツ語
    "광고", // 韓国語
  ];
  for (const label of mustMatch) {
    assert.ok(
      IFF_SPONSORED_LABELS.has(label),
      `「${label}」は広告ラベルとして検知されるべき`
    );
  }
});

test("おすすめ辞書と広告辞書は別物（取り違えない）", () => {
  assert.equal(IFF_SUGGESTED_LABELS.has("Sponsored"), false);
  assert.equal(IFF_SPONSORED_LABELS.has("Suggested for you"), false);
});

test("通常の投稿文やユーザー名を誤っておすすめ扱いしない（完全一致のみ）", () => {
  const mustNotMatch = [
    "", // 空文字
    "friend_taro", // ユーザー名
    "このカフェ、おすすめです！", // 「おすすめ」を含むが完全一致ではないキャプション
    "Suggested for you because reasons", // 余計な語が付くと別物
    "いいね！", // 無関係なUI文言
  ];
  for (const text of mustNotMatch) {
    assert.equal(
      IFF_SUGGESTED_LABELS.has(text),
      false,
      `「${text}」はおすすめラベルとして誤検知されるべきではない`
    );
  }
});
