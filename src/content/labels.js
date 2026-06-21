// labels.js
//
// 「おすすめ投稿」「広告（Sponsored）投稿」を見分けるためのラベル文字列辞書。
// Instagram の表示言語によって文言が変わるため、主要言語の表記をここに集約しておき、
// 変更があってもこの1ファイルだけ直せば済むようにする。
//
// content.js より先に読み込まれ、同じスコープを共有するため、
// ここで宣言した辞書を content.js から参照できる。
//
// 判定は「要素の文字列が、これらのいずれかと完全一致するか」で行う。
// （投稿キャプションなどに偶然含まれる語での誤検出を避けるため、部分一致ではなく完全一致にしている）
//
// 未対応言語の検出漏れに関する調査メモは docs/i18n-labels.md を参照。

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
  "Suggestions pour toi",
  // ドイツ語
  "Vorschläge für dich",
  "Vorgeschlagene Beiträge",
  // イタリア語
  "Suggeriti per te",
  "Post suggeriti",
  // オランダ語
  "Voorgesteld voor jou",
  // ロシア語
  "Рекомендации для вас",
  "Рекомендуемое",
  // トルコ語
  "Senin için önerilenler",
  // インドネシア語
  "Disarankan untukmu",
  // ベトナム語
  "Gợi ý cho bạn",
  // タイ語
  "แนะนำสำหรับคุณ",
  // ヒンディー語
  "आपके लिए सुझाए गए",
  // アラビア語
  "مقترحة لك",
  // ポーランド語
  "Sugerowane dla Ciebie",
  // 韓国語
  "추천",
  "회원님을 위한 추천",
  // 中国語（簡体／繁体）
  "为你推荐",
  "為你推薦",
]);

// 広告（Sponsored）投稿のラベル辞書。
const IFF_SPONSORED_LABELS = new Set([
  // 日本語
  "広告",
  "プロモーション",
  // 英語
  "Sponsored",
  "Paid partnership",
  // スペイン語
  "Publicidad",
  "Patrocinado",
  // ポルトガル語
  "Patrocinado",
  // フランス語
  "Sponsorisé",
  // ドイツ語
  "Gesponsert",
  // イタリア語
  "Sponsorizzato",
  // オランダ語
  "Gesponsord",
  // ロシア語
  "Реклама",
  // トルコ語
  "Sponsorlu",
  // インドネシア語
  "Bersponsor",
  // ベトナム語
  "Được tài trợ",
  // タイ語
  "ได้รับการสนับสนุน",
  // ヒンディー語
  "प्रायोजित",
  // アラビア語
  "مُموَّل",
  // ポーランド語
  "Sponsorowane",
  // 韓国語
  "광고",
  // 中国語（簡体／繁体）
  "赞助内容",
  "贊助",
]);

// テスト（Node.js）からも辞書を参照できるようにするためのエクスポート。
// ブラウザのコンテンツスクリプトとして読み込まれる場合は `module` が存在しないため、
// この行は実行されず、拡張機能の動作には一切影響しない。
if (typeof module !== "undefined" && module.exports) {
  module.exports = { IFF_SUGGESTED_LABELS, IFF_SPONSORED_LABELS };
}
