# テスト構成

## 実行方法

```bash
bun run test          # 全テストを一度実行
bun run test:watch    # ウォッチモード
```

## ディレクトリ構成

```
tests/
├── setup.ts                          # Chrome API グローバルモック（全テスト共通）
└── unit/
    ├── utils/
    │   └── site-detection.test.ts    # サイト判定関数のユニットテスト
    └── content/
        └── auto-reenable.test.ts     # 快適モード自動再有効化のテスト
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
| `src/content.ts`（自動再有効化） | `tests/unit/content/auto-reenable.test.ts` | `disableComfortMode` / `disableComfortModeByUser` / `startAutoReenableWatcher` の変更時 |

## テスト更新が必要なタイミング

- `src/utils/site-detection.ts` に関数を追加・変更したとき
- 新しいサイトに対応したとき（`isTTFC` 等の判定関数追加）
- 既存判定ロジックの修正時
- `disableComfortMode` / `disableComfortModeByUser` の動作を変更したとき
- 自動再有効化ロジック（`startAutoReenableWatcher`）を変更したとき

## 命名規則

- ファイル名: `<対象モジュール名>.test.ts`
- `describe`: モジュール内の関数名またはテスト対象の機能名
- `it`: 「〜を検出する」「〜は false」「〜が発生しない」等、日本語で具体的な条件を記述

## 重要なテスト対象（必須）

- `isYouTube()` / `isTTFC()` / `isTTFCMovieStories()` / `isPrimeVideo()` — サイト判定の誤検出・見落としはユーザー影響が大きいため必ずテストする
- `disableComfortModeByUser()` — ユーザー操作時に自動再有効化が発生しないことを保証する
- `startAutoReenableWatcher()` — 自動解除後に新動画で正しく再有効化されることを保証する

## content.ts テストの注意事項

`content.ts` は Chrome 拡張機能 API と DOM に強く依存するため、以下の制約がある：

- テストは `happy-dom` 環境で実行される
- `chrome` グローバルは `tests/setup.ts` でモックされる
- `content.ts` はモジュールとしてキャッシュされるため、テスト間で状態が共有される
  - `beforeEach` で `__disableComfortModeByUser()` と `__stopAutoReenableWatcher()` を呼んで状態をリセットする
- `video.videoWidth` / `video.videoHeight` は `Object.defineProperty` でモック値を設定する
- `vi.useFakeTimers()` で `setTimeout` をコントロールし、`await Promise.resolve()` でMutationObserver のマイクロタスクを処理する
