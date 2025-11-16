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

### プロジェクト構造の整理（完了）
- **問題**: manifest.jsonや静的アセットがプロジェクトルートやsrc/に散在し、ビルド生成物との区別が不明確
- **修正内容**:
  1. 静的アセットをpublic/に集約
     - `manifest.json` → `public/manifest.json`
     - `src/content.css` → `public/content.css`
     - `src/options.css`, `src/options.html` → `public/`
  2. ルートの重複ディレクトリを削除
     - `icons/`, `_locales/` を削除（public/に統合済み）
  3. package.jsonのビルドスクリプトを修正
     - `copy-assets`スクリプトを削除
     - `build`スクリプトで`rsync -a public/ dist/`を実行
- **結果**:
  - 静的アセット（public/）とソースコード（src/）、ビルド生成物（dist/）が明確に分離
  - dist/はビルド時に自動生成され、public/とsrc/からコンパイルされたファイルを含む
  - プロジェクト構造がよりクリーンになった
- **修正ファイル**: package.json, public/*, _locales/, icons/

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

## 2025-11-15

### カスタムコントロールの表示制御ロジックの修正（完了）
- **問題**:
  1. マウスホバーで不要にコントロール要素が表示される
  2. 再生開始後にコントロールをスムーズに非表示にする機能がない
- **調査結果**:
  - `handleMouseMove()`で`resetControlsAutoHide()`が呼ばれており、マウス移動のたびにコントロールが表示されていた
  - `cssText`に`opacity`と`pointer-events`が含まれており、後から`style.pointerEvents = 'none'`で変更しても上書きできなかった
- **修正内容**:
  1. マウスホバーによる表示ロジックを削除（line 708-711削除）
  2. カスタムコントロールのcssTextから`opacity`と`pointer-events`を削除（line 1072-1084）
  3. 再生中のコントロール自動非表示機能を実装:
     - `isMonitoringMouseForControlsHide`フラグを追加（line 25）
     - `controlsHideOnMouseLeaveTimer`タイマーを追加（line 23）
     - playイベントで監視を開始、pauseイベントで停止（line 1263-1319）
     - handleMouseMove()でマウス位置を監視し、動画エリア外に0.5秒いた場合にコントロールを非表示（line 717-747）
  4. pointer-eventsを`setProperty()`で!important付きで設定（line 1274, 1310, 755）
- **技術的な詳細**:
  - マウスが動画エリア内にある場合、タイマーをリセット
  - マウスが動画エリア外に移動した場合、500msタイマーを開始
  - タイマーが完了すると、`opacity: 0`と`pointer-events: none`を設定
  - `setProperty('pointer-events', 'none', 'important')`を使用して確実に適用
- **修正ファイル**: `src/content.ts`

### 自動テストの修正（完了）
- **問題**:
  - Test 4（マウス離脱後の自動非表示）が失敗
  - Test 5（シークボタン機能）が失敗
- **調査と修正**:
  1. **Test 4の問題1**: マウス位置(10,10)が動画エリア内と判定
     - 原因: 快適モードでは動画が全画面表示されるため、(10,10)も動画エリア内
     - 修正: 動画のrectを取得し、`rect.right + 100, rect.bottom + 100`に移動（line 181-195）
  2. **Test 4の問題2**: pointer-eventsが`auto`のまま
     - 原因: `style.pointerEvents = 'none'`では!important付きCSSを上書きできない
     - 修正: `style.setProperty('pointer-events', 'none', 'important')`を使用
  3. **Test 5の問題**: 動画の長さが19秒しかなく、30秒にシークできない
     - 修正: 5秒から開始して10秒送り/戻しをテスト（line 205-227）
  4. **Puppeteerのマウスイベント**: `page.mouse.move()`がmousemoveイベントをトリガーしない
     - 修正: `document.dispatchEvent(new MouseEvent('mousemove', ...))`を使用（line 131-142, 181-195）
- **デバッグ手法**:
  - content scriptとページコンテキストの分離により、windowオブジェクトを使った通信ができない
  - data属性（`data-debug-*`）を使用してデバッグ情報を保存し、ページコンテキストから読み取り
  - 問題特定後、すべてのデバッグログを削除してクリーンアップ
- **最終結果**: すべてのテスト（Test 1-5）がパス
- **修正ファイル**: `tmp/test-custom-controls-final.js`, `src/content.ts`

### v1.1.2リリース（完了）
- **30秒前後のボタンを追加**:
  - `rewind30Btn`: 再生位置を30秒戻すボタン（line 1077-1107）
  - `forward30Btn`: 再生位置を30秒進めるボタン（line 1214-1244）
  - ボタン配置: [30秒戻し] [10秒戻し] [再生/一時停止] [10秒送り] [30秒送り]

- **一時停止→再生後のコントロール非表示問題を修正**:
  - 問題: 一時停止→再生した際、マウスが既に動画エリア外にあってもコントロールが表示されたまま
  - 修正内容:
    - `lastMouseX`, `lastMouseY`変数を追加（line 26-27）
    - `handleMouseMove()`でマウス位置を記録（line 723-724）
    - playイベントで、マウスが既に動画エリア外にある場合は即座に500msタイマーを開始（line 1282-1296）

- **シークバー操作の改善**:
  - `stopPropagation()`を削除（line 1233-1236）
  - `change`イベントリスナーを追加してドラッグ終了時にも確実に再生位置を更新（line 1237-1240）

- **Prime Video/YouTube対応の改善**:
  - Prime Videoでの快適モード時に動画が表示されない問題を修正
  - YouTubeでも同様の問題が発生することを確認
  - 親要素（最大5階層）のz-indexを調整してスタッキングコンテキスト問題を解決（line 512-523）
  - `isPrimeVideo()`を修正してAmazon.co.jpなど全Amazonドメインに対応（line 55-57）

- **ドキュメント更新**:
  - `doc/update/CHANGELOG.md`: v1.1.2の変更履歴を追加
  - `doc/user/usage.md`: 30秒ボタンの説明を追加、コントロールボタンの説明を更新

- **自動テスト更新**:
  - Test 5: 10秒ボタンのセレクタをnth-of-type(2)とnth-of-type(4)に修正（30秒ボタン追加により位置変更）
  - Test 6: 30秒ボタンのテストを追加（動画が35秒以上の場合のみ実行）

- **プライバシーポリシー作成**:
  - `doc/dev/PRIVACY_POLICY.md`: Chrome Web Store提出用の英語版プライバシーポリシー
  - `doc/dev/PRIVACY_POLICY_ja.md`: 日本語版プライバシーポリシー
  - データ収集なし、ローカル動作のみを明記

- **バージョン更新**:
  - `public/manifest.json`: 1.1.0 → 1.1.2
  - `package.json`: 1.1.1 → 1.1.2
  - `version.dat`: 1.1.0 → 1.1.2

- **修正ファイル**: `src/content.ts`, `tmp/test-custom-controls-final.js`, `doc/update/CHANGELOG.md`, `doc/user/usage.md`, `doc/dev/PRIVACY_POLICY.md`, `doc/dev/PRIVACY_POLICY_ja.md`, `public/manifest.json`, `package.json`, `version.dat`

