# Changelog

Comfortable Videoの変更履歴です。

## [1.1.2] - 2025-11-15

### 追加
- **30秒前後のボタンを追加**
  - カスタムコントロールに30秒戻しボタンと30秒送りボタンを追加
  - ボタン配置: [30秒戻し] [10秒戻し] [再生/一時停止] [10秒送り] [30秒送り]

### 改善
- **一時停止→再生後のコントロール非表示問題を修正**
  - 問題: 一時停止→再生した際、マウスが既に動画エリア外にあってもコントロールが表示されたまま
  - 修正内容:
    - 最後のマウス位置を`lastMouseX`, `lastMouseY`で記録
    - 再生開始時にマウス位置をチェックし、動画エリア外にあれば即座に500msタイマーを開始
    - マウスが動画エリア外にある場合、500ms後にコントロールが自動的に非表示

- **シークバー操作の改善**
  - `stopPropagation()`を削除してイベント伝播を妨げないように変更
  - `change`イベントリスナーを追加してドラッグ終了時にも確実に再生位置を更新

- **Prime Video対応の改善**
  - Prime Videoでの快適モード時に動画が表示されない問題を修正
  - 親要素（最大5階層）のz-indexを調整してスタッキングコンテキスト問題を解決
  - Amazon.co.jpなど全てのAmazonドメインでボタンが表示されるように修正

### 変更されたファイル
- `src/content.ts`
- `package.json` (version: 1.1.1 → 1.1.2)

## [1.1.1] - 2025-11-15

### 改善
- **カスタムコントロールの表示制御ロジックの改善**
  - 問題:
    - マウスホバーで不要にコントロール要素が表示される
    - 再生開始後にコントロールをスムーズに非表示にする機能がない
  - 修正内容:
    - マウスホバーによる表示ロジックを削除し、再生/一時停止状態のみで制御
    - 再生中のコントロール自動非表示機能を実装:
      - 再生開始時にコントロールを表示
      - マウスが動画エリアから0.5秒離れると自動的に非表示
      - マウスが動画エリア内に戻るとタイマーをリセット
    - `pointer-events`を`setProperty()`で!important付きで設定し、確実に適用
  - 技術的な詳細:
    - `isMonitoringMouseForControlsHide`フラグで監視状態を管理
    - `controlsHideOnMouseLeaveTimer`で500msのタイマーを管理
    - playイベントで監視を開始、pauseイベントで停止

### 修正
- **自動テストの修正**
  - Test 4（マウス離脱後の自動非表示）の修正:
    - マウス位置を動画エリアの外側に確実に移動するように変更
    - `pointer-events`の設定方法を修正
  - Test 5（シークボタン機能）の修正:
    - 動画の長さ（19秒）を考慮して、5秒から開始するように変更
  - Puppeteerのマウスイベント処理の改善

### 変更されたファイル
- `src/content.ts`
- `tmp/test-custom-controls-final.js`
- `package.json` (version: 1.1.0 → 1.1.1)

## [1.1.0] - 2025-11-14

### 追加
- **快適モードでの動画操作機能**
  - 動画クリックで再生/一時停止のトグル機能を追加
  - 一時停止中は動画コントロール要素を自動的に操作可能にする機能を追加
  - 実装内容:
    - 動画の上部80%をクリックした場合、再生/一時停止をトグル
    - 動画の下部20%をクリックした場合、コントロールバーを有効化（既存の動作）
    - 一時停止中は自動的にコントロールバーが有効化される

### 改善
- **プロジェクト構造の整理**
  - 静的アセットを`public/`に集約
  - `manifest.json`, `content.css`, `options.*`を`public/`に移動
  - ルートの重複ディレクトリ（`icons/`, `_locales/`）を削除
  - ビルドスクリプトで`rsync -a public/ dist/`を実行
  - 静的アセット（public/）とソースコード（src/）、ビルド生成物（dist/）が明確に分離

### 変更されたファイル
- `src/content.ts`
- `package.json` (version: 1.0.2 → 1.1.0)
- `public/manifest.json` (version: 1.0.2 → 1.1.0)
- プロジェクト構造全体

## [1.0.2] - 2025-11-04

### 修正
- **YouTubeコントロール要素がクリックできない問題を修正**
  - 問題: 快適モード解除後、YouTubeのコントロール要素（再生ボタン、シークバーなど）は視覚的には表示されるが、実際にはクリックできない
  - 原因: `.html5-video-container`（VIDEO要素の親コンテナ）のz-indexが`2147483647`のまま残っており、コントロール要素（z-index: 59）の上に表示されていた
  - 修正内容:
    - `maximizeVideo()`で`.html5-video-container`にz-indexを設定する際、`comfort-mode-video-container`クラスも追加
    - `disableComfortMode()`で、`.comfort-mode-video-container`クラスを持つすべての要素のz-indexを`removeProperty()`で削除する処理を追加
  - 検証: Puppeteerの`elementFromPoint()`テストで、コントロールが正常にクリック可能であることを確認

### 変更されたファイル
- `src/content.ts`
- `manifest.json` (version: 1.0.1 → 1.0.2)
- `package.json` (version: 1.0.1 → 1.0.2)

## [1.0.1] - 2025-10-31

### 修正
- **YouTubeコントロール表示問題の修正**
  - 問題: 快適モード解除後、YouTubeコントロール要素が表示されない
  - 根本原因:
    1. `maximizeVideo()`で`player.style.cssText = ...`を使用すると、元のCSS変数（`--yt-delhi-pill-height`等）が完全に上書きされて失われる
    2. `setProperty(..., 'important')`で設定した`!important`付きプロパティは、`removeAttribute('style')`では削除されない
    3. CSSスタイルシート削除が復元処理の後に実行されていた
  - 修正内容:
    1. `maximizeVideo()`関数: `cssText`の代わりに`setProperty()`で個別プロパティを設定（CSS変数を保持）
    2. `disableComfortMode()`関数:
       - 処理順序を変更（CSSスタイルシート削除 → 復元処理）
       - `removeProperty()`で個別プロパティを削除してから`setAttribute()`で元のinline styleを復元
    3. `removeZIndexControl()`関数: #movie_player復元処理を削除（disableComfortMode()で一本化）
  - 検証: Puppeteerテストで完全復元を確認
    - position: 完全復元
    - positionComputed: `relative`に復元
    - inlineStyle: CSS変数を含め完全一致

### 変更されたファイル
- `src/content.ts`

## [1.0.0] - 2025-10-30

### 追加
- **初回リリース**
  - 動画を画面いっぱいに拡大表示する機能
  - スマートなコントロール表示制御（動画下部20%領域に2秒間マウスを置くかクリックで表示）
  - z-index制御による確実な前面表示
  - ESCキーまたは終了ボタンで快適モードを解除
  - YouTube、Prime Video等の主要動画サイトに対応
  - 右クリックメニュー、拡張機能アイコンからの起動
  - 多言語対応（日本語、英語、中国語）

### 修正（初回リリース前の主な修正）
- **YouTube z-index問題の修正**
  - JavaScriptで全要素を走査し、z-indexを強制的に上書き
  - 元のインラインz-indexを保存して解除時に復元
- **YouTube黒画面問題の修正**
  - `.html5-video-container`のz-indexを調整
  - YouTube親要素のスタッキングコンテキスト問題を解決
- **拡張機能名の統一**
  - "Comfortable Movie" → "Comfortable Video" に変更
  - より広範な動画サイトに対応することを明確化

### 技術スタック
- TypeScript
- Chrome Extension Manifest V3
- CSS pointer-events制御
- 動的z-index管理
- Puppeteerによる自動テスト

---

## バージョン番号の方針

- **メジャー**: 大きな変更や互換性のない変更
- **マイナー**: 新機能の追加や改善
- **パッチ**: バグ修正や小さな変更

[1.0.2]: https://github.com/TomoTom0/ComfortableVideo/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/TomoTom0/ComfortableVideo/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/TomoTom0/ComfortableVideo/releases/tag/v1.0.0
