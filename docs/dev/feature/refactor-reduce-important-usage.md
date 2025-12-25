# content.cssの!important使用削減

## 現状

Content Scriptとして外部サイト（YouTube、TVerなど）にスタイルを注入しており、!importantを多用して外部サイトのスタイルを確実に上書きしている。

主な使用箇所：
- カスタムコントロールのスタイル（`#comfort-mode-custom-controls`）
- 解除ボタンのスタイル（`#comfort-mode-exit-button`）
- 動画要素のz-index制御
- pointer-eventsの上書き

## 問題点

- !importantの多用はメンテナンス性に影響
- 将来的にスタイルのデバッグが困難になる可能性
- 拡張機能自体のスタイルを部分的に変更する際に、さらに強いセレクタや!importantが必要になる

## 改善案

### 1. セレクタの特異性を高める

現在:
```css
#comfort-mode-custom-controls {
  position: fixed !important;
}
```

改善後:
```css
body.comfort-mode-active #comfort-mode-custom-controls {
  position: fixed;
}
```

### 2. オーバーレイ方式への移行

pointer-events: noneを持つオーバーレイをページの最前面に配置し、操作を許可したい要素（動画、コントロール、終了ボタン）のみ、それより高いz-indexとpointer-events: autoを設定する方法。

## 優先度

medium

## 関連

- PR: #2
- Thread ID: PRRT_kwDOPw4NUM5nUouv
- タスク: TASK-3
- 関連ファイル: public/content.css
