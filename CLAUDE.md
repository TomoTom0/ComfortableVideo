# Comfortable Video - プロジェクト固有のルール

## パッケージマネージャー

このプロジェクトは **pnpm** を使用しています。

- パッケージのインストール: `pnpm install`
- ビルド: `pnpm run build`
- クリーンビルド: `pnpm run rebuild`
- デプロイ: `pnpm run deploy`

**重要**: `npm` や `yarn`、`bun` を使用しないでください。すべての依存関係管理とスクリプト実行は `pnpm` で行います。

## ビルドとデプロイ

- ソースコード更新後は必ず `pnpm run build` を実行してください
- ビルド後は必ず `pnpm run deploy` を実行してください
- 本番環境へのデプロイ前には `pnpm run rebuild` でクリーンビルドを推奨します
- バンドラーに **esbuild** を使用しています（`build:ts` スクリプト）

## スタイル管理

**スタイルは必ずCSSファイル（`public/content.css`）で管理すること**

- JavaScriptでインラインスタイル（`element.style.cssText`や`element.style.setProperty`）を設定しない
- 動的なスタイル変更が必要な場合は、CSSクラスの追加/削除で対応する
- 例外：位置やサイズなど、実行時にしか決まらない値のみJavaScriptで設定可能

## 多言語対応（i18n）

**ユーザーに表示される文字列は必ず `chrome.i18n.getMessage()` または `data-i18n` 属性で管理すること**

対応言語: 日本語（ja）、英語（en）、中国語（zh）

### チェック項目

コードを追加・変更した際は以下を確認すること：

- `src/content.ts`: `showContentToast()` などユーザーに見えるすべての文字列が `chrome.i18n.getMessage()` を使用しているか
- `src/options.ts`: 同上
- `public/options.html`: ユーザーに見えるテキストノードに `data-i18n` 属性が付いているか（プロパーノウン・キーボードキー・動的上書きされる初期値は除く）
- `public/_locales/ja/messages.json`: 新しいキーを追加した場合、`en` と `zh` にも同じキーを追加しているか

### 禁止事項

- 日本語・英語・中国語の文字列をソースコードや HTML にハードコードしない
- `chrome.i18n.getMessage()` の戻り値が空の場合のフォールバックに日本語をハードコードしない（英語フォールバックは許容）

## 一時ファイルの管理

**一時的なファイルは必ず `./tmp/` に作成すること**

- スクリーンショット（検証用の `.png` ファイル）
- ログファイル（`page-console.log` など）
- 診断ファイル（`diagnostics.json` など）
- ステップ記録ファイル（`step-*.json`, `step-*.png` など）

**プロジェクトルートに一時ファイルを配置しない**。これらは検証やデバッグ用の一時的なファイルであり、プロジェクトの成果物ではありません。
