# ドキュメント

Comfortable Videoのドキュメントディレクトリです。

## ディレクトリ構成

### `chrome-store/`
Chrome Web Store公開用の資料とドキュメント：
- プライバシーポリシー
- ストア掲載情報
- 権限の根拠説明
- サードパーティコード開示
- コンプライアンスチェックリスト

詳細は `chrome-store/README.md` を参照。

### `changelog/`
バージョンごとの変更履歴：
- `CHANGELOG.md` - 全バージョンの変更履歴
- `unreleased.md` - 未リリースの変更内容

### `dev/`
開発者向けドキュメント：
- `api.md` - API仕様
- `architecture.md` - アーキテクチャ設計
- `deployment.md` - デプロイ手順
- `development-guide.md` - 開発ガイド
- `development.md` - 開発者向け情報
- `internationalization.md` - 多言語対応（i18n）実装ガイド
- `add-site/` - 新サイト対応手順
- `feature/` - 技術的負債・将来の改善案

### `user/`
ユーザー向けドキュメント：
- `usage.md` - 使用方法

## ドキュメント管理方針

### 言語
- 基本的に日本語で作成
- Chrome Web Store提出用など、英語が必要な場合のみ英語版を用意

### 更新タイミング
- コード変更時：該当する開発者向けドキュメントを更新
- 機能追加時：ユーザー向けドキュメントと変更履歴を更新
- リリース前：CHANGELOGを確認・更新

### 技術的負債の記録
将来の改善案やPRレビューで指摘された改善提案は、`dev/feature/`ディレクトリにマークダウンファイルとして記録します。

詳細は `CLAUDE.md` の「技術的負債の管理」セクションを参照。
