# Unreleased

## Features

### 東映特撮ファンクラブ (TTFC) 対応

**対象URL**:
- `https://pc.tokusatsu-fc.jp/contents?` 等のコンテンツ一覧・視聴ページ
- `https://pc.tokusatsu-fc.jp/movies/*/movie-stories/*` の movie-stories ページ

**概要**:
- TTFC (pc.tokusatsu-fc.jp) で快適モードを使用可能にした
- プレーヤーコントロールバーに快適モードボタンを追加
- URLパターンによって HTML 構造が異なるため個別に対応

**URLパターン別の実装**:
- contents等のページ: Video.js プレーヤー (`#movie-player`)、コントロールバーは `#movie-player .vjs-control-bar`
- movie-stories ページ: 独自プレーヤー (`#player-wrapper`)、コントロールバーは `.player-bottom-bar`（Video.js 不使用）、快適モード中は独自コントロールを非表示にして拡張機能の共通コントロールを使用

**関連ファイル**:
- `src/content.ts`: `isTTFC()`, `isTTFCMovieStories()`, TTFC分岐処理の追加
- `src/content.scss`: 快適モード中の `#player-controls` 非表示ルール追加
- `public/manifest.json`: `*://pc.tokusatsu-fc.jp/*` を content_scripts に追加

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

### カスタムコントロールの非表示タイミングを修正

**問題**:
- 快適モード中、カスタムコントロールパネルが消えるまでに最大8秒程度かかる場合があった

**原因**:
- マウス移動のたびに3000msの非表示タイマーをリセットしていた（動画エリア全体を監視）
- 動画内でマウスを動かし続けると「移動時間 + 3秒」後にしか消えなかった

**修正内容**:
- 非表示ロジックの基準を「動画エリア全体」から「カスタムコントロールパネル自体のBoundingRect」に変更
- コントロールパネル外にカーソルが出た時点から `CONTROLS_HIDE_DELAY`（500ms）後に非表示

**関連ファイル**:
- `src/content.ts`: `handleMouseMove()` 内の監視ロジック変更、`CONTROLS_HIDE_DELAY` 等の定数追加

### コントロールエリアが動画より奥に隠れる・表示されない問題の修正

**問題**:
- 上下に余白がない（動画がレターボックスなしで画面全体を埋める）場合、カスタムコントロールや解除ボタンが動画の背後に隠れる、または表示されない

**原因**:
1. HTML5 video 要素が Chrome の GPU コンポジットレイヤーで CSS z-index を無視してレンダリングされることがある
2. ページ側の `body` に `transform` が設定されているサイトでは、`position: fixed` が `body` 基準の absolute 相当になり、`overflow: hidden` で固定要素がクリップされる

**修正内容**:
1. `#comfort-mode-custom-controls` と `#comfort-mode-exit-button` に `translateZ(0)` を追加し、GPU コンポジットレイヤーに強制昇格（video 要素より確実に前面でレンダリング）
2. `html` 要素にも `comfort-mode-scroll-lock` クラスを付与してスクロール防止を適用（body の transform による fixed 要素クリップを回避）

**関連ファイル**:
- `src/content.scss`: `translateZ(0)` 追加、`html.comfort-mode-scroll-lock` スタイル追加
- `src/content.ts`: `applyZIndexControl()` / `removeZIndexControl()` で `html` クラス付与・削除

### TTFC連続再生で快適モードが自動解除される問題の修正

**問題**:
- 東映特撮ファンクラブ（TTFC）等でエピソードを連続再生する際、エピソードの切り替えタイミングで快適モードが自動解除され、次のエピソードで手動で再有効化が必要になる

**原因**:
- エピソード終了時に `checkVideoEnded()` が即座に `disableComfortMode()` を呼び出していた
- その後のauto-reenable watcher（MutationObserver + イベントリスナー + polling）で再有効化を試みていたが、タイミングの問題で確実に動作していなかった

**修正内容**:
- 「即座に解除して再有効化」から「grace period方式」に再設計
- 動画終了後5秒間の猶予期間を設け、その間に次の動画の再生が検出されれば快適モードを維持
- 猶予期間内に次の動画が始まらなければ快適モードを解除

**技術的詳細**:
- `startGracePeriod()`: MutationObserver + `playing`/`loadedmetadata` イベントで新動画を検出、5秒タイマーでタイムアウト解除
- `cancelGracePeriod()`: タイマー・Observerのクリーンアップ
- 従来のauto-reenable機構（`startAutoReenableWatcher`, `stopAutoReenableWatcher`, `suppressAutoReenabler`等）は削除

**関連ファイル**:
- `src/content.ts`: `startGracePeriod()`, `cancelGracePeriod()` 追加、auto-reenable関連コード削除、`checkVideoEnded()` をgrace period開始に変更

### TTFC快適モード解除時に動画要素が消える不具合の修正

**問題**:
- 東映特撮ファンクラブ（TTFC）で動画再生が停止した後に快適モードを解除すると、プレーヤー要素がDOMから完全に削除され、ページ上で動画が見えなくなる

**原因**:
- 動画停止時にTTFC側がページDOMを書き換え、快適モード有効化時に記録した元の親要素をDOMから除去する
- 快適モード解除時、元の親が見つからない場合に `player.remove()` が実行され、プレーヤー自体が消滅していた
- YouTubeやその他サイトの同じ箇所は `console.warn` のみで削除しない一方、TTFCだけが `player.remove()` を呼んでいた

**修正内容**:
- TTFCのrestore処理で、元の親要素が見つからない場合の `player.remove()` を削除
- YouTube・その他サイトと同じ「warnのみ」の挙動に統一（プレーヤーはbodyに残存）

**影響範囲**:
- TTFC (pc.tokusatsu-fc.jp) のみ
- 他のサイトには影響なし

**関連ファイル**:
- `src/content.ts`: `disableComfortMode()` 内TTFC分岐のrestore処理

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
