# Chrome Web Store公開用資料

このディレクトリには、Comfortable VideoをChrome Web Storeに公開するために必要な資料とドキュメントが含まれています。

## コンテンツ

### 1. privacy-policy.md
完全なプライバシーポリシー（日本語）：
- データ収集の実態（なし - 全てローカルストレージ）
- 権限の使用目的と根拠
- ユーザーデータの取り扱い
- 連絡先情報

**要対応:** このポリシーを公開可能なURL（例：GitHub Pages）にホストし、Chrome Web Store提出時にそのURLを提供する必要があります。

### 2. store-listing.md
Chrome Web Storeの掲載情報（日本語）：
- 拡張機能名とカテゴリ
- 短い説明（132文字以内）
- 詳細な説明と機能紹介
- スクリーンショットの説明
- サポートURL
- キーワード/タグ

**使用方法:** Chrome Web Store Developer Dashboardでの提出時に、関連セクションをコピー＆ペーストして使用します。

### 3. permissions-justification.md
各権限の詳細な技術的根拠（日本語）：
- activeTab
- contextMenus
- storage
- Content scriptsの説明
- Web accessible resources

**使用方法:**
- レビュープロセスで質問があった場合の参考資料
- 権限要件を理解したいユーザーへの共有
- 将来の更新のための内部ドキュメント

### 4. third-party-disclosure.md
サードパーティコードの使用に関する包括的な開示（日本語）：
- 配布される拡張機能にサードパーティライブラリが含まれていないことを確認
- 開発時のみの依存関係をリスト（TypeScript、Sassなど）
- ビルドプロセスの透明性を説明
- 検証方法を提供

**使用方法:**
- Chrome Web Storeのレビュアーがサードパーティコードについて質問した場合の参考資料
- セキュリティを重視するユーザーへの共有
- コンプライアンスドキュメント

### 5. compliance-checklist.md
Chrome Web Storeポリシー準拠の完全な検証（日本語）：
- プログラムポリシー準拠（単一目的、権限、プライバシー）
- 技術要件（Manifest V3、コード品質、セキュリティ）
- ストア掲載要件
- 提出前チェックリスト
- 準備された回答を含むレビュー対応プラン

**使用方法:**
- 提出前の最終検証
- レビュープロセス中の参考資料
- 各新バージョンのチェックリスト更新

## 公開チェックリスト

### 提出前に必要な項目

- [x] LICENSEファイル
- [x] プライバシーポリシー（文書作成済み、公開URL必要）
- [x] 権限の根拠説明
- [x] サードパーティコード開示
- [x] ストア掲載情報
- [x] コンプライアンスチェックリスト
- [ ] プライバシーポリシーを公開URLにホスト
- [ ] スクリーンショットの準備（1280x800または640x400）:
  - [ ] スクリーンショット1: 快適モード動作中
  - [ ] スクリーンショット2: スマートコントロール表示
  - [ ] スクリーンショット3: カスタムコントロールオーバーレイ
  - [ ] スクリーンショット4: オプションページ
  - [ ] スクリーンショット5: コンテキストメニュー（オプション）
- [ ] プロモーション画像の作成（オプションだが推奨）:
  - [ ] 小タイル: 440x280
  - [ ] 大タイル: 920x680
  - [ ] マーキータイル: 1400x560
- [ ] Chrome Web Store Developerアカウント登録（$5一回限り）
- [ ] 拡張機能のパッケージング（`bun run build && bun run package`）

### 提出情報

**カテゴリ:** 生産性（Productivity）

**主要言語:** 日本語

**追加言語:** 英語、中国語

**プライバシーポリシーURL:** [ホスト後に記入]

**サポートURL:** https://github.com/TomoTom0/ComfortableVideo/issues

**ホームページURL:** https://github.com/TomoTom0/ComfortableVideo

## ストア掲載テキスト

### 短い説明（クイックコピペ用）
```
動画をフルスクリーンの快適モードで視聴。スマートコントロールで邪魔な要素を非表示にし、動画そのものに集中できます。
```

### なぜこれらの権限が必要か？
よくある質問への簡潔な回答：
- **activeTab:** 拡張機能を有効化した際に動画を検出して最大化するため
- **contextMenus:** 利便性のために右クリックメニューオプションを追加するため
- **storage:** 設定をデバイスにローカル保存するため

## 公開後

公開が承認された後：
- [ ] README.mdにChrome Web Storeのリンクを追加
- [ ] README.mdにChrome Web Storeバッジを追加
- [ ] 次回リリースのためにmanifest.jsonのバージョンを更新
- [ ] レビューとユーザーフィードバックを監視
- [ ] GitHub Issuesでのサポートリクエストに対応

## レビュープロセスのヒント

1. **対応時間:** 初回レビューは通常1〜3営業日かかります
2. **よくある問題:** `<all_urls>`のcontent script使用について説明を求められる可能性があります
3. **プライバシー:** データがユーザーのデバイスを離れないことを強調
4. **権限:** 質問があった場合はpermissions-justification.mdを参照

## 有用なリンク

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store公開ガイド](https://developer.chrome.com/docs/webstore/publish/)
- [ベストプラクティス](https://developer.chrome.com/docs/webstore/best_practices/)
- [プログラムポリシー](https://developer.chrome.com/docs/webstore/program-policies/)
