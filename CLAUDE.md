# Comfortable Video - プロジェクト固有のルール

## パッケージマネージャー

このプロジェクトは **Bun** を使用しています。

- パッケージのインストール: `bun install`
- ビルド: `bun run build`
- クリーンビルド: `bun run rebuild`
- デプロイ: `bun run deploy`

**重要**: `npm` や `yarn` を使用しないでください。すべての依存関係管理とスクリプト実行は `bun` で行います。

## ビルドとデプロイ

- ソースコード更新後は必ず `bun run build` を実行してください
- 本番環境へのデプロイ前には `bun run rebuild` でクリーンビルドを推奨します
- `scripts/` ディレクトリのシェルスクリプトも `bun` を使用するように設定されています
