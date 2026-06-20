// labels.js
//
// 「おすすめ投稿」を見分けるためのラベル文字列辞書。
// Instagram の表示言語によって「おすすめ」の文言が変わるため、
// 主要言語の表記をここに集約しておき、変更があってもこの1ファイルだけ直せば済むようにする。
//
// content.js より先に読み込まれ、同じスコープを共有するため、
// ここで宣言した IFF_SUGGESTED_LABELS を content.js から参照できる。
//
// 判定は「要素の文字列が、これらのいずれかと完全一致するか」で行う。
// （投稿キャプションなどに偶然含まれる語での誤検出を避けるため、部分一致ではなく完全一致にしている）

const IFF_SUGGESTED_LABELS = new Set([
  // 日本語
  "おすすめ",
  "あなたへのおすすめ",
  "おすすめの投稿",
  // 英語
  "Suggested for you",
  "Suggested For You",
  "Suggested Posts",
  "Suggested posts",
  "Suggested post",
  // スペイン語
  "Sugerencias para ti",
  "Publicaciones sugeridas",
  // ポルトガル語
  "Sugestões para você",
  "Publicações sugeridas",
  // フランス語
  "Suggestions pour vous",
  // ドイツ語
  "Vorschläge für dich",
  // 韓国語
  "추천",
  "회원님을 위한 추천",
  // 中国語（簡体／繁体）
  "为你推荐",
  "為你推薦",
]);

// テスト（Node.js）からも辞書を参照できるようにするためのエクスポート。
// ブラウザのコンテンツスクリプトとして読み込まれる場合は `module` が存在しないため、
// この行は実行されず、拡張機能の動作には一切影響しない。
if (typeof module !== "undefined" && module.exports) {
  module.exports = { IFF_SUGGESTED_LABELS };
}
