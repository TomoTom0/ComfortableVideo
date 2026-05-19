# 新サイト対応ガイド

新しいサイトに快適モードを対応させる手順をまとめる。

## 対応パターン

サイトの複雑さに応じて3段階ある。

| パターン | 適用条件 | 必要な作業 |
|---|---|---|
| **汎用** | `<video>` が通常のスタッキングコンテキストにある | manifest.json のみ |
| **要素移動** | z-index 競合があるが特殊 UI は不要 | manifest.json + `maximizeVideo()` への分岐追加 |
| **専用ハンドラ** | プレーヤー UI へのボタン追加や字幕など特殊処理が必要 | manifest.json + 複数箇所への処理追加 |

---

## ステップ 1: manifest.json に URL を追加（全パターン共通）

`public/manifest.json` の `content_scripts[].matches` にパターンを追加する。

```json
"*://example.com/*"
```

複数のホスト（www あり/なし、サブドメインなど）はそれぞれ列挙する。

```json
"*://example.com/*",
"*://www.example.com/*"
```

---

## ステップ 2: 動作確認（汎用ハンドラ）

ビルド・デプロイして対象サイトで快適モードを起動する。

```bash
bun run build
bun run deploy
```

汎用ハンドラは `<video>` 要素を `document.body` に移動してスタッキングコンテキストから独立させる。
多くのサイトではこれだけで動作する。

**確認項目**:
- [ ] 動画が全画面表示される
- [ ] マウスホバーでコントロールが表示される
- [ ] ESC または解除ボタンで元に戻る
- [ ] 動画の位置が元に戻ること（DOM 破損なし）

---

## ステップ 3: 問題があれば専用ハンドラを追加

### 3-1. サイト判定関数を追加（`src/content.ts`）

```typescript
function isExampleSite(): boolean {
  return window.location.hostname === 'example.com' ||
         window.location.hostname === 'www.example.com';
}
```

### 3-2. z-index 競合がある場合（`maximizeVideo()` に分岐を追加）

YouTube・Prime Video と同様に、プレーヤーのルート要素を `body` に移動する。

```typescript
function maximizeVideo(video: HTMLVideoElement): void {
  if (isYouTube()) {
    // ...既存処理...
  } else if (isExampleSite()) {
    const player = document.querySelector('#player-root') as HTMLElement;
    if (player && player.parentElement) {
      originalVideoParent = {
        parent: player.parentElement,
        nextSibling: player.nextSibling
      };
      document.body.appendChild(player);
      player.classList.add('comfort-mode-exempt');
    }
  } else {
    // 汎用処理
  }
}
```

`disableComfortMode()` にも対応する復元処理を追加する。

### 3-3. プレーヤーUI にボタンを追加する場合

Prime Video の実装（`addPrimeControlButton` / `setupPrimeObserver`）を参考にする。

1. ボタン要素変数を宣言
2. `addExampleControlButton()` でボタンを作成・挿入
3. `updateExampleButtonState()` でボタンの状態を同期
4. `setupExampleObserver()` で動的な DOM 変化に対応
5. `DOMContentLoaded` / ページ読み込み済みの初期化ブロックに追加
6. `disableComfortMode()` でボタンを削除・変数をリセット

---

## チェックリスト

### manifest.json
- [ ] `content_scripts[].matches` にすべてのホストパターンを追加

### content.ts（専用ハンドラが必要な場合）
- [ ] `isSiteName()` 判定関数を追加
- [ ] `maximizeVideo()` に分岐を追加
- [ ] `disableComfortMode()` に復元処理を追加
- [ ] ボタンを追加する場合は Observer・初期化・クリーンアップを実装

### 多言語対応
- [ ] 新たにユーザー向けメッセージを追加した場合は `public/_locales/ja/messages.json`, `en/`, `zh/` をすべて更新

### テスト
- [ ] 汎用ハンドラの動作確認（全画面表示・復元）
- [ ] コントロール表示・非表示
- [ ] ESC・解除ボタンで正常に戻ること
- [ ] ページ遷移後も DOM が破損していないこと

---

## 既存サイトの実装を参照する

| サイト | 参照箇所 |
|---|---|
| YouTube | `isYouTube()`, `addYouTubeControlButton()`, `setupYouTubeObserver()`, `maximizeVideo()` 内 YouTube ブランチ |
| Amazon Prime Video | `isPrimeVideo()`, `addPrimeControlButton()`, `setupPrimeObserver()`, `startPrimeCaptionsObserver()` |
