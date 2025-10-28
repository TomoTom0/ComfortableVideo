# Done

## 2025-10-28

### 拡張機能名の統一（完了）
- **変更内容**: "Comfort Movie" → "Comfortable Video" に統一
- **理由**: 
  - "movie" は「映画」の意味で、一般的な「映像」を表さない
  - YouTube、Prime Videoなど様々な動画サイトで使用するため "video" が適切
  - 形容詞 "Comfortable" で文法的に正しい英語表現
- **修正ファイル**:
  - `manifest.json`
  - `package.json`
  - `_locales/en/messages.json`
  - `_locales/ja/messages.json`
  - `_locales/zh/messages.json`

### YouTube快適モード黒画面問題の修正（完了）
- **問題**: YouTubeで快適モードを有効化すると画面が真っ黒になる
- **原因**: 
  - `#movie_player`を拡大してz-indexを設定しても、内部の`.html5-video-container`のz-indexが低いままだった
  - YouTube親要素（`ytd-app`など）がスタッキングコンテキストを作成し、子要素のz-indexを制限していた
- **修正内容**:
  1. `#movie_player`と内部video要素のスタイル調整
  2. `.html5-video-container`のz-indexを`2147483647`に設定
  3. YouTube親要素（`ytd-app`, `#player-container-inner`など）のz-indexを`auto`に変更
  4. 元のinline styleを保存して解除時に復元
- **検証**: Puppeteerテストで画面輝度が0.27%→21444%に改善し、動画が表示されることを確認

### 快適モード解除時の復元問題の修正（完了）
- **問題**: 快適モード解除後に元の状態に完全に戻らない
- **原因**: 
  - `#movie_player`のスタイル復元処理はあったが、親要素のz-index復元がなかった
  - `getComputedStyle()`で取得した値（実際の表示値）を保存していたため、元のinline styleを復元できなかった
- **修正内容**:
  - 元の**inline style**の値（`element.style.zIndex`）を保存するように変更
  - inline styleがなかった要素は`null`を保存し、解除時に`removeProperty()`で削除
  - `originalParentZIndex` Mapを追加
- **検証**: Puppeteerテストで全要素が正しく復元されることを確認

### 未解決の問題
- **YouTubeコントロール要素が表示されない問題**:
  - 快適モード解除後、動画は元の位置に戻るが、コントロール要素（再生ボタン、シークバーなど）が表示されない
  - Puppeteerテストでは問題を再現できず、全てのCSSプロパティは正常
  - 実際のブラウザ環境でのみ発生する可能性
  - 原因不明、要調査

### テスト環境の整備
- `/tmp/` ディレクトリにPuppeteerテストスクリプトを配置
- 各種検証用スクリプト作成:
  - `test-exit-restoration.js` - 解除時の復元確認
  - `test-controls.js` - コントロール要素の状態確認
  - `test-visual-controls.js` - 視覚的な表示確認

## 2025-10-27

### z-index問題の修正（完了）
- **問題**: YouTubeで快適モードを有効化した際、多くの要素（ヘッダー、サイドバー、通知など）が拡大した動画の上に表示されていた
- **原因**: 
  - YouTubeには z-index が 2000-2300 の高い値を持つ要素が多数存在
  - CSSセレクタのみでは一部の要素のz-indexを上書きできない
- **修正内容**:
  - JavaScriptで全要素を走査し、`style.setProperty('z-index', '1', 'important')`で強制的に上書き
  - 元のインラインz-indexは`data-original-zindex`属性に保存し、解除時に復元
  - 動画: `z-index: 2147483647 !important`
  - 解除ボタン: `z-index: 2147483648 !important`
  - 動画コンテナ: `z-index: 2147483646 !important`
- **検証方法**: Puppeteerを使用してYouTubeで自動テスト実施
- **結果**: ✅ 動画が確実に最前面に表示され、解除ボタンのみが動画の上に配置される

### TypeScriptエラーの修正
- **問題**: `setTimeout` の戻り値の型が `number` と `Timeout` の不一致でビルドエラー
- **修正**: タイマー変数の型を `ReturnType<typeof setTimeout>` に変更
  - `cursorTimer`
  - `controlsDisableTimer`

### テスト環境の構築
- Puppeteerのインストールと設定
- YouTube z-index検証用の自動テストスクリプト作成 (`test-youtube-zindex.js`)
- ヘッドレスモードでの動作確認

### 修正ファイル
- `src/content.ts`: z-index制御ロジックとタイマー型定義の修正
