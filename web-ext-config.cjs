// web-ext-config.cjs
//
// web-ext（ビルド/署名/起動ツール）の設定。
// 拡張機能の「実体」は manifest.json と icons/ と src/ だけなので、
// テスト・ドキュメント・CI 設定・開発用ファイルはパッケージ(.xpi)から除外する。

module.exports = {
  // .xpi に含めない（＝拡張機能の動作に不要な）ファイル/ディレクトリ
  ignoreFiles: [
    "test",
    "docs",
    "verification",
    ".github",
    ".claude",
    "node_modules",
    "package.json",
    "package-lock.json",
    "web-ext-config.cjs",
    "web-ext-artifacts",
    "*.md",
  ],
  build: {
    overwriteDest: true,
  },
};
