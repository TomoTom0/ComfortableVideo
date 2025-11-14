# Done

## 2025-10-28

### 拡張機能名の統一（完了）
- **変更内容**: "Comfortable Video" → "Comfortable Video" に統一
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
 
## 2025-10-30

### リポジトリ整理とリネーム（完了）
- ルート直下に散在していた一時ファイル・生成物を `tmp/` に集約
- `tmp/` 以下の大量な生成物（スクリーンショット、ログ、テスト出力等）を履歴から完全に削除（`git-filter-repo` 実行）し、ミラーバックアップを `../repo-backup.git` に作成
- GitHub リポジトリ名を `TomoTom0/ComfortableMovie` → `TomoTom0/ComfortableVideo` に変更し、ソース内表記を `ComfortableVideo` に統一してコミット・プッシュ
- `dist/` の不要な生成物管理を見直し、静的非生成アセットを `public/` に移動、ビルド時に `public/` を `dist/` にコピーするようにスクリプトを更新

### スクリプトとビルドの改善
- `scripts/build.sh`, `scripts/package.sh`, `scripts/build-and-deploy.sh` に `rsync -a --delete public/ dist/` を追加して、`public/` の静的資産をビルド出力に反映するように変更
- `dist/options.*` と `dist/manifest.json` の取り扱いを見直し（必要最小限のみ追跡していたが、方針は `public/` をソースに `dist/` を生成物に戻す形に統一）

### 備考
- バックアップ `../repo-backup.git` を保存。履歴を元に戻す場合はこのバックアップから復元可能
- 個人開発のためチーム通知は行っていない

## 2025-10-31

### YouTubeコントロール表示問題の修正（完了）
- **問題**: 快適モード解除後、YouTubeコントロール要素（再生ボタン、シークバーなど）が表示されない
- **調査結果**: 
  - Puppeteerテストで問題を再現していたが、既存テストでは検出できていなかった
  - 詳細な検証テストを作成して、inline styleの復元が不完全であることを発見
- **根本原因**:
  1. `maximizeVideo()`で`player.style.cssText = ...`を使用すると、元のCSS変数（`--yt-delhi-pill-height`等）が完全に上書きされて失われる
  2. `setProperty(..., 'important')`で設定した`!important`付きプロパティは、`removeAttribute('style')`では削除されない
  3. CSSスタイルシート削除が復元処理の後に実行されていた
- **修正内容**:
  1. `maximizeVideo()`関数: `cssText`の代わりに`setProperty()`で個別プロパティを設定（CSS変数を保持）
  2. `disableComfortMode()`関数: 
     - 処理順序を変更（CSSスタイルシート削除 → 復元処理）
     - `removeProperty()`で個別プロパティを削除してから`setAttribute()`で元のinline styleを復元
  3. `removeZIndexControl()`関数: #movie_player復元処理を削除（disableComfortMode()で一本化）
- **検証**: Puppeteerテストで完全復元を確認
  - position: 完全復元
  - positionComputed: `relative`に復元
  - inlineStyle: CSS変数を含め完全一致
- **修正ファイル**: `src/content.ts`

## 2025-11-04

### YouTubeコントロール要素がクリックできない問題の修正（完了）
- **問題**: 快適モード解除後、YouTubeコントロール要素（再生ボタン、シークバーなど）は視覚的には表示されるが、実際にはクリックできない
- **調査結果**:
  - Puppeteerの`elementFromPoint()`テストで、再生ボタンの位置にVIDEO要素が検出された
  - DOM構造解析により、`.html5-video-container`（VIDEO要素の親コンテナ）のz-indexが`2147483647`のまま残っていることを発見
- **根本原因**:
  - `maximizeVideo()`で`.html5-video-container`のz-indexを`2147483647`に設定していた（line 485）
  - しかし`disableComfortMode()`でこのz-indexを復元する処理がなかった
  - 結果、VIDEO要素の親コンテナ（z-index: 2147483647）がコントロール要素（z-index: 59）の上に表示され、コントロールがクリックできなくなっていた
- **修正内容**:
  1. `src/content.ts:486` - `.html5-video-container`にz-indexを設定する際、`comfort-mode-video-container`クラスも追加
  2. `src/content.ts:1061-1069` - `disableComfortMode()`で、`.comfort-mode-video-container`クラスを持つすべての要素のz-indexを`removeProperty()`で削除する処理を追加
- **検証**:
  - Puppeteerテストで確認:
    - BEFORE: `.html5-video-container` z-index = 10
    - DURING: `.html5-video-container` z-index = 2147483647
    - AFTER: `.html5-video-container` z-index = 10（正常に復元）
  - `elementFromPoint()`テスト:
    - BEFORE: 再生ボタンの位置にBUTTON要素 → クリック可能
    - AFTER: 再生ボタンの位置にBUTTON要素 → **クリック可能** ✅
- **バージョン**: 1.0.1 → 1.0.2
- **修正ファイル**: `src/content.ts`

## 2025-11-14

### 快適モードでの動画操作機能の追加（完了）
- **問題**: 快適モード中は動画を一時停止、再生、再生位置の移動などができず、完全に操作不能だった
- **ユーザーの要望**:
  1. 動画クリックで再生/一時停止のトグル
  2. 一時停止中は動画コントロール要素を操作可能にする
- **実装内容**:
  1. `handleClick()`関数を拡張して、動画エリアのクリックを検出
  2. 動画の上部80%をクリックした場合、再生/一時停止をトグル
  3. 動画の下部20%をクリックした場合、コントロールバーを有効化（既存の動作）
  4. 一時停止中は自動的にコントロールバーが有効化される（既存の機能`handleMouseMove()`line 724-726を活用）
- **技術的な実装詳細**:
  - `handleClick()`で動画エリア全体のクリックを検出（line 796-818）
  - 動画下部20%以外をクリックした場合、`video.play()`または`video.pause()`で再生状態をトグル（line 832-839）
  - 動画要素は常に`pointer-events: auto`に設定されているため、クリックイベントを受信可能（既存のCSS line 528-530）
- **修正ファイル**: `src/content.ts:789-840`
- **バージョン**: 1.0.2 → 1.1.0（新機能追加のためマイナーバージョンアップ）

