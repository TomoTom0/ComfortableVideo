# Changelog

Comfortable Videoの変更履歴です。

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
