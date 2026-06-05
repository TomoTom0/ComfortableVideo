# Comfortable Video 開発者情報

## プロジェクト概要

Comfortable Videoは、TypeScriptで開発されたChrome拡張機能（Manifest V3）です。
動画視聴時の快適な環境を提供するため、スマートなコントロール機能とz-index制御を実装しています。

## 技術スタック

- **TypeScript**: 型安全な開発
- **Chrome Extension Manifest V3**: 最新の拡張機能API
- **SCSS**: スタイリングとz-index制御（CSSクラスベース管理）
- **esbuild**: 高速バンドリング
- **pnpm**: パッケージ管理
- **Service Worker**: バックグラウンド処理

## アーキテクチャ

詳細は `docs/dev/architecture.md` を参照。

### ファイル構成
```
src/
  content.ts       # コンテンツスクリプト（メイン機能）
  content.scss     # スタイルシート（SCSS）
  background.ts    # サービスワーカー（右クリックメニュー）
  options.ts       # オプションページ

public/
  manifest.json    # マニフェスト
  content.css      # コンパイル済みCSS（ビルド生成）
  options.html     # オプションページHTML
  _locales/        # 多言語対応リソース（ja/en/zh）
  icons/           # 拡張機能アイコン

dist/              # ビルド出力
docs/              # ドキュメント
  user/            # ユーザー向け
  dev/             # 開発者向け
  changelog/       # 変更履歴
  chrome-store/    # Chrome Web Store掲載情報
tests/             # テストコード
```

## 開発フロー

### 1. 環境セットアップ
```bash
pnpm install
```

### 2. 開発時
```bash
pnpm run build     # ビルド
pnpm run rebuild   # クリーンビルド
```

### 3. デプロイ
```bash
pnpm run deploy    # ビルドとデプロイを一括実行
```

#### 環境設定
```bash
# .envファイルでデプロイ先を設定
DEPLOY_DESTINATION=/home/tomo/user/Mine/_chex/src_comfortMovie/
```

### 4. デバッグ

#### Chrome DevTools
1. `chrome://extensions/` → 「デベロッパーモード」
2. 「バックグラウンドページを検査」
3. 「コンテンツスクリプトを検査」

詳細な開発ガイドは `docs/dev/development-guide.md` を参照。

## 主要機能の実装

### サイト検出

拡張機能はURLパターンに基づいてサイトを検出し、各サイトに固有のセレクタで動画要素とコントロールバーを特定します。

対応サイト:
- **YouTube**: `#movie_player`、DOM移動でスタッキングコンテキスト問題を回避
- **Amazon Prime Video**: 字幕要素の同期移動、広告自動ミュート対応
- **東映特撮ファンクラブ (TTFC)**: Video.jsプレーヤー（contents）と独自プレーヤー（movie-stories）の2パターン
- **TVer / Netflix など**: 汎用HTML5 video対応

### スタイル管理

JavaScriptでのインラインスタイル設定は行わず、全てSCSS（`src/content.scss`）でCSSクラスとして管理しています。動的な値（位置・サイズ）のみJavaScriptで設定します。

### z-index制御システム

CSSクラスベースで制御。サイト種別ごとに`<body>`にクラスを付与（`comfortable-video-youtube`等）し、SCSSで個別にスタイルを定義します。

### 連続再生対応（grace period）

動画終了時に即座に快適モードを解除せず、5秒間の猶予期間を設けて次の動画の再生を待機します。MutationObserverとイベントリスナーで新動画を検出し、快適モードを維持します。

## 設計原則

### 1. 復元性重視
- 全ての変更は可逆的
- CSSクラスベースで状態管理
- 元のスタイルを保存・復元

### 2. スタイルはSCSSで管理
- インラインスタイルは使用しない
- CSSクラスの追加/削除のみで制御

### 3. 互換性
- 各種動画サイト対応
- レスポンシブ対応
- 既存UIとの共存

### 4. 多言語対応
- `chrome.i18n.getMessage()` または `data-i18n` 属性で管理
- 対応言語: 日本語（ja）、英語（en）、中国語（zh）
- ソースコードやHTMLにハードコードしない

## テスト

テスト構成の詳細は `tests/README.md` を参照。

### 対象サイト

自動起動（主要サイト）：
- YouTube
- Amazon Prime Video
- 東映特撮ファンクラブ (TTFC)
- TVer
- Netflix

手動起動（その他）：
- 右クリックメニューまたは拡張機能アイコンから起動
- HTML5動画プレーヤーを使用するほぼすべてのサイトで動作

## トラブルシューティング

### よくある問題

1. **動画が検出されない**
   - `video.videoWidth`が0の場合があるため、ロード待ちが必要

2. **z-indexが効かない**
   - スタッキングコンテキストの問題。親要素のposition/transform/isolation等を確認

3. **コントロールが動画の背後に隠れる**
   - `translateZ(0)`でGPUコンポジットレイヤーに強制昇格

### デバッグ方法
```typescript
// 動画要素の確認
console.log('Found videos:', document.querySelectorAll('video'));

// スタッキングコンテキストの確認（快適モード有効化時に自動出力）
// console.debugで親要素の解析結果が表示される
```
