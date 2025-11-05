# TODO

## 緊急

### コードクリーンアップ
- [x] 不要なデバッグ用console.logを削除
  - ✅ disableComfortMode()内の大量のログを削除
  - ✅ enableComfortMode()のログを削除
  - ✅ その他全てのデバッグ用ログを削除
- [x] 不要な処理の削除・整理
  - ✅ YouTubeコントロール状態確認のsetTimeoutを削除
  - ✅ force reflowを削除
  - ✅ MouseEvent発火を削除
  - ✅ ボタン再挿入リトライを削除
- [x] Puppeteerテストで動作確認
  - ✅ コントロールのクリック可能性テスト: 正常
  - ✅ DOM構造テスト: z-index正常に復元
- [ ] Chromiumで実際に動作確認してから本番デプロイ

### ~~YouTubeコントロール表示問題の調査と修正~~
- [x] 快適モード解除後にコントロール要素（再生ボタン、シークバーなど）が表示されない問題
  - ✅ 原因特定: .html5-video-containerのz-index復元漏れ
  - ✅ v1.0.2で修正完了
  - ✅ elementFromPoint()テストで検証済み

## テスト作成

### 優先度: 高
- [ ] テストフレームワークのセットアップ
  - Jest + TypeScript環境の構築
  - Chrome Extension用のモックライブラリ導入（jest-chrome等）

### content.ts のテスト
- [ ] 快適モード有効化/無効化のテスト
  - `enableComfortMode()` - 動画要素の検出と最大化
  - `disableComfortMode()` - スタイルの復元と状態クリア
  - 動画要素が存在しない場合のエラーハンドリング

- [ ] 動画最大化ロジックのテスト
  - `maximizeVideo()` - アスペクト比計算の検証
  - ウィンドウサイズ変更時のリサイズ処理

- [ ] マウスイベント制御のテスト
  - カーソル検出（2秒ホバー検出）
  - コントロール有効化/無効化のタイミング
  - 動画下部20%エリアのクリック検出

- [ ] サイト固有機能のテスト
  - YouTube用コントロールボタンの追加/削除
  - Prime Video用コントロールボタンの追加/削除
  - `isYouTube()`, `isPrimeVideo()` の判定ロジック

- [ ] MutationObserverのテスト
  - 動画要素の削除検出
  - 動画終了時の自動解除

### background.ts のテスト
- [ ] コンテキストメニュー作成のテスト
  - デフォルト設定でのメニュー作成
  - 設定に応じたメニューの表示/非表示

- [ ] メッセージングのテスト
  - コンテンツスクリプトへのメッセージ送信
  - エラーハンドリング

### options.ts のテスト
- [ ] 設定の読み込みと保存
  - `loadSettings()` - デフォルト値の適用
  - `saveSettings()` - chrome.storage.sync への保存
  - `resetSettings()` - デフォルトへのリセット

- [ ] UI制御のテスト
  - スライダーの値表示更新
  - トースト通知の表示

### E2Eテスト（将来的に）
- [x] Puppeteerを使った実際のブラウザでのテスト（部分的に実施済み）
  - YouTube/Prime Videoでの動作確認
  - 快適モードの起動から終了までのフロー
  - z-index問題の検証
  - 解除時の復元確認

### その他
- [ ] CI/CD環境の構築（GitHub Actions等）
- [ ] カバレッジ計測の導入
- [ ] テストドキュメントの作成
