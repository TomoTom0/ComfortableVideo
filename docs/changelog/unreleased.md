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

### YouTube快適モードで動画が黒背景に隠れる問題の修正

**問題**:
- YouTubeで快適モードを有効にすると、動画が黒いオーバーレイの背面に隠れて見えない

**原因**:
- `#movie_player`は高いz-index（2147483646）を持つが、`ytd-app`（`position: absolute`）の子孫要素として存在していた
- `position: absolute`を持つ祖先要素はスタッキングコンテキストを形成し、子孫の`z-index`が外部要素と正しく競合しない
- 結果として、z-index: 999999の黒いオーバーレイより低いz-indexで描画されていた

**修正内容**:
- 快適モード有効化時に`#movie_player`を`document.body`の直接の子として移動
- 快適モード解除時に元の親要素・位置に復元

**技術的詳細**:
- 元の親要素と兄弟ノードを`originalVideoParent`変数に記録
- `document.body.appendChild(player)`でbody直下に移動
- 解除時は`insertBefore`または`appendChild`で元の位置に戻す

**影響範囲**:
- YouTubeのみ
- 他のサイトには影響なし

**関連ファイル**:
- `src/content.ts`: `#movie_player`のDOM移動ロジック追加
- `src/content.scss`: `:not(:has(#movie_player))`セレクター追加
