# テスト構成

## 実行方法

```bash
pnpm run test          # 全テストを一度実行
pnpm run test:watch    # ウォッチモード
```

## ディレクトリ構成

```
tests/
├── setup.ts                          # Chrome API グローバルモック（全テスト共通）
└── unit/
    ├── utils/
    │   └── site-detection.test.ts    # サイト判定関数のユニットテスト
    └── content/
        └── auto-reenable.test.ts     # grace period（連続再生時の快適モード維持）のテスト
```

## テスト環境

- フレームワーク: Vitest
- DOM環境: happy-dom
- 設定ファイル: `vitest.config.ts`
- セットアップ: `tests/setup.ts`（Chrome API mock）

## テスト対象と更新タイミング

| ソースファイル | テストファイル | 更新タイミング |
|---|---|---|
| `src/utils/site-detection.ts` | `tests/unit/utils/site-detection.test.ts` | 判定関数の追加・変更時 |
| `src/content.ts`（grace period） | `tests/unit/content/auto-reenable.test.ts` | `disableComfortMode` / `checkVideoEnded` / `startGracePeriod` / `cancelGracePeriod` の変更時 |

## テスト更新が必要なタイミング

- `src/utils/site-detection.ts` に関数を追加・変更したとき
- 新しいサイトに対応したとき（`isTTFC` 等の判定関数追加）
- 既存判定ロジックの修正時
- `disableComfortMode` / `disableComfortModeByUser` の動作を変更したとき
- grace periodロジック（`startGracePeriod` / `cancelGracePeriod`）を変更したとき

## 命名規則

- ファイル名: `<対象モジュール名>.test.ts`
- `describe`: モジュール内の関数名またはテスト対象の機能名
- `it`: 「〜を検出する」「〜は false」「〜が発生しない」等、日本語で具体的な条件を記述

## 重要なテスト対象（必須）

- `isYouTube()` / `isTTFC()` / `isTTFCMovieStories()` / `isPrimeVideo()` — サイト判定の誤検出・見落としはユーザー影響が大きいため必ずテストする
- `disableComfortModeByUser()` — ユーザー操作時に即座に解除されることを保証する
- grace period — 動画終了後5秒以内に次の動画が再生されれば快適モードが維持され、タイムアウトすれば解除されることを保証する

## content.ts テストの注意事項

`content.ts` は Chrome 拡張機能 API と DOM に強く依存するため、以下の制約がある：

- テストは `happy-dom` 環境で実行される
- `chrome` グローバルは `tests/setup.ts` でモックされる
- `content.ts` はモジュールとしてキャッシュされるため、テスト間で状態が共有される
  - `beforeEach` で `__disableComfortModeByUser()` を呼んで状態をリセットする
- `video.videoWidth` / `video.videoHeight` は `Object.defineProperty` でモック値を設定する
- `vi.useFakeTimers()` で `setTimeout` をコントロールし、`await Promise.resolve()` でMutationObserver のマイクロタスクを処理する
