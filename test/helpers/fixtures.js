// test/helpers/fixtures.js
//
// Instagram の該当画面の DOM 構造を、判定に必要な特徴だけ忠実に再現したテスト用 HTML。
//   - ホーム: フォロー投稿と「おすすめ投稿」(<article> + ラベル) が混在
//   - 発見ページ: 検索バー + 投稿/リールのサムネイル(リンク)グリッド

const HOME_HTML = `<!DOCTYPE html>
<html lang="ja">
  <head><meta charset="utf-8" /></head>
  <body>
    <nav aria-label="メインナビゲーション">
      <a href="/">ホーム</a>
      <a href="/explore/">発見</a>
      <a href="/reels/">リール</a>
      <a href="/direct/inbox/">メッセージ</a>
    </nav>
    <main role="main">
      <article id="post-follow-1">
        <header><a href="/friend_taro/">friend_taro</a></header>
        <div>フォロー中の人の投稿</div>
      </article>
      <article id="post-suggested-ja">
        <header><span>おすすめ</span></header>
        <div>知らない人の投稿（日本語ラベル）</div>
      </article>
      <article id="post-follow-2">
        <header><a href="/friend_hanako/">friend_hanako</a></header>
        <div>このカフェ、おすすめです！</div>
      </article>
      <article id="post-suggested-en">
        <header><span>Suggested for you</span></header>
        <div>knkown account post (English label)</div>
      </article>
    </main>
  </body>
</html>`;

const EXPLORE_HTML = `<!DOCTYPE html>
<html lang="ja">
  <head><meta charset="utf-8" /></head>
  <body>
    <nav aria-label="メインナビゲーション">
      <a href="/">ホーム</a>
      <a href="/explore/">発見</a>
      <a href="/reels/">リール</a>
    </nav>
    <main role="main">
      <input type="text" placeholder="検索" aria-label="検索入力" />
      <div class="grid">
        <a href="/p/AAA111/">post1</a>
        <a href="/p/BBB222/">post2</a>
        <a href="/reel/CCC333/">reel1</a>
      </div>
    </main>
  </body>
</html>`;

module.exports = { HOME_HTML, EXPLORE_HTML };
