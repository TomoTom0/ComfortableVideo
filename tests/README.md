# テスト構成

## 実行方法

```bash
bun run test          # 全テストを一度実行
bun run test:watch    # ウォッチモード
```

## ディレクトリ構成

```
tests/
└── unit/
    └── utils/
        └── site-detection.test.ts  # サイト判定関数のユニットテスト
```

## テスト環境

- フレームワーク: Vitest
- DOM環境: happy-dom
- 設定ファイル: `vitest.config.ts`

## テスト対象と更新タイミング

| ソースファイル | テストファイル | 更新タイミング |
|---|---|---|
| `src/utils/site-detection.ts` | `tests/unit/utils/site-detection.test.ts` | 判定関数の追加・変更時 |

## テスト更新が必要なタイミング

- `src/utils/site-detection.ts` に関数を追加・変更したとき
- 新しいサイトに対応したとき（`isTTFC` 等の判定関数追加）
- 既存判定ロジックの修正時

## 命名規則

- ファイル名: `<対象モジュール名>.test.ts`
- `describe`: モジュール内の関数名
- `it`: 「〜を検出する」「〜は false」等、日本語で具体的な条件を記述

## 重要なテスト対象（必須）

- `isYouTube()` / `isTTFC()` / `isTTFCMovieStories()` / `isPrimeVideo()` — サイト判定の誤検出・見落としはユーザー影響が大きいため必ずテストする
