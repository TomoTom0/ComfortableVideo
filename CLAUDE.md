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

## スタイル管理

**スタイルは必ずCSSファイル（`public/content.css`）で管理すること**

- JavaScriptでインラインスタイル（`element.style.cssText`や`element.style.setProperty`）を設定しない
- 動的なスタイル変更が必要な場合は、CSSクラスの追加/削除で対応する
- 例外：位置やサイズなど、実行時にしか決まらない値のみJavaScriptで設定可能

## 一時ファイルの管理

**一時的なファイルは必ず `./tmp/` に作成すること**

- スクリーンショット（検証用の `.png` ファイル）
- ログファイル（`page-console.log` など）
- 診断ファイル（`diagnostics.json` など）
- ステップ記録ファイル（`step-*.json`, `step-*.png` など）

**プロジェクトルートに一時ファイルを配置しない**。これらは検証やデバッグ用の一時的なファイルであり、プロジェクトの成果物ではありません。
