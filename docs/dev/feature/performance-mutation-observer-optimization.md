# MutationObserverの監視範囲最適化

## 現状

Prime Videoの字幕要素（`.atvwebplayersdk-captions-overlay`）を検出するため、`document.body`全体を`subtree: true`で監視している（src/content.ts:1260付近）。

## 問題点

- `document.body`全体の監視は、特に動的なページではパフォーマンスに影響を与える可能性がある
- DOM全体の変更を監視するため、不要なイベントも多数発火する

## 改善案

字幕要素が特定のコンテナ要素内に追加されることがわかっている場合、監視対象をそのコンテナに限定する：

1. Prime Videoのメインプレイヤーコンテナを特定
2. そのコンテナのみを監視対象にする
3. 監視範囲を限定することでパフォーマンスへの影響を軽減

## 優先度

low

レビュアーのコメント：「現状の実装でも機能的には問題ありませんが、将来的な改善点としてご検討ください。」

## 関連

- PR: #5
- Thread ID: PRRT_kwDOPw4NUM5uvabq
- タスク: TASK-21
- 関連ファイル: src/content.ts
