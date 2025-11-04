# WIP

## 直近の目的
テストフレームワークの構築とコードカバレッジの向上を行う。

## 優先度順タスク
1. テストフレームワークのセットアップ（Jest + TypeScript）
2. ユニットテストの作成
   - `enableComfortMode()` / `disableComfortMode()`
   - `maximizeVideo()`
   - マウスイベント制御
   - サイト固有機能（YouTube, Prime Video）
3. CI/CD環境の構築（GitHub Actions等）
4. カバレッジ計測の導入

## 最近の完了作業
- YouTubeコントロール表示問題の修正（2025-10-31）
  - Puppeteerで問題を再現し、inline styleの復元処理を修正
  - CSS変数の保持とimportantフラグ付きプロパティの適切な削除を実装

## 備考
- 詳細な検証テストスクリプトを`tmp/`に作成済み
- ヘッドレスモードでテスト実行可能
