# Comfortable Video - プロジェクト固有のルール

## タスクランナー

このプロジェクトは **mise**（`.mise.toml`）でタスクを管理しています。

- ビルド: `mise run build`
- デプロイ: `mise run deploy`
- ビルド+デプロイ: `mise run build-and-deploy`
- クリーンビルド: `mise run rebuild`
- テスト: `mise run test`
- パッケージ作成: `mise run package`

**重要**: ビルド・デプロイ等のタスク実行には `mise run` を使用してください。`pnpm run` は直接使わず、miseタスク経由で実行します。パッケージのインストールのみ `pnpm install` を直接使用します。`npm`、`yarn`、`bun` は使用禁止です。

## ビルドとデプロイ

- ソースコード更新後は必ず `mise run build` を実行してください
- ビルド後は必ず `mise run deploy` を実行してください
- 本番環境へのデプロイ前には `mise run rebuild` でクリーンビルドを推奨します
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
