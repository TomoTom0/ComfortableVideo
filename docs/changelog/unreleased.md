# Unreleased

## Features

### カスタムコントロールにミュートボタンを追加

**概要**:
- 快適モード中のカスタムコントロールにミュート切り替えボタンを追加

**機能**:
1. ワンクリックでミュート/ミュート解除を切り替え
2. ミュート状態に応じてアイコンを自動更新
   - ミュート解除時: スピーカーアイコン
   - ミュート時: ミュートアイコン（スピーカーに斜線）

**配置**:
- 30秒送りボタンと現在時間表示の間に配置

**技術的詳細**:
- `video.muted`プロパティで制御
- `volumechange`イベントをリスンしてアイコンを自動更新
- SVGアイコンを使用（Material Designスタイル）

**関連ファイル**:
- `src/content.ts`: ミュートボタンの実装

## Bug Fixes

### Prime Video字幕表示の修正

**問題**:
- Amazon Prime Videoで快適モード中に字幕が表示されない問題

**原因**:
- 動画要素をbodyに移動していたが、字幕要素は元のPrime Videoプレイヤーコンテナ内に残っていた
- 動画と字幕が異なるスタッキングコンテキストに属していたため、z-indexでの制御が効かなかった
- 字幕要素をbodyに移動しても、`position: relative`のままでは高さが0pxになり表示されなかった

**修正内容**:
1. 字幕要素（`.atvwebplayersdk-captions-overlay`）も動画と一緒にbodyに移動
2. 字幕要素を`position: fixed`で画面全体に配置（100vw x 100vh）
3. MutationObserverで動的に生成される字幕要素も自動的に移動
4. 快適モード解除時に字幕要素を元の位置に復元

**技術的詳細**:
- 字幕の元の位置を記録する変数`originalCaptionsParent`を追加
- `startPrimeCaptionsObserver()`で字幕要素の追加を監視
- CSS: `position: fixed`, `width: 100vw`, `height: 100vh`, `pointer-events: none`

**影響範囲**:
- Amazon Prime Videoのみ
- YouTubeなど他のサイトには影響なし

**関連ファイル**:
- `src/content.ts`: 字幕移動ロジック追加
- `src/content.scss`: 字幕オーバーレイのスタイル修正
