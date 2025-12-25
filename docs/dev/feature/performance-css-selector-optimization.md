# 複雑なCSSセレクタのパフォーマンス最適化

## 現状

快適モード時に、動画・コントロール・終了ボタン以外の全要素のz-indexを制限するため、複雑なCSSセレクタを使用している。

問題のセレクタ（src/content.ts:647）:
```javascript
body.comfort-mode-active *:not(.comfort-mode-video):not(.comfort-mode-video-container):not(#comfort-mode-exit-button):not(#comfort-mode-custom-controls):not(#comfort-mode-custom-controls *):not(#comfort-mode-overlay)
```

特徴：
- 多数の`:not()`擬似クラス
- ユニバーサルセレクタ`*`を使用
- Content Scriptとして外部サイトで動作
- 現時点ではパフォーマンス問題は発生していない

## 問題点

- 複雑なDOMを持つページでは、セレクタマッチングがパフォーマンスに影響する可能性
- 将来的なパフォーマンスチューニングが必要になる可能性

## 改善案

### オーバーレイ方式への移行

**現在のアプローチ**:
全要素のz-indexを制限し、特定の要素のみ前面に配置

**改善アプローチ**:
1. `pointer-events: none`を持つオーバーレイをページの最前面に配置
2. 操作を許可したい要素（動画、コントロール、終了ボタン）のみ：
   - オーバーレイより高い`z-index`を設定
   - `pointer-events: auto`を設定

**メリット**:
- シンプルなセレクタで実装可能
- パフォーマンス向上
- メンテナンス性向上

## 優先度

low（現状問題なし、将来的な改善として記録）

## 関連

- PR: #2
- Thread ID: PRRT_kwDOPw4NUM5nUou2
- タスク: TASK-4
- 関連ファイル: src/content.ts:647, public/content.css
