# スクリーンショット撮影

利用者向けドキュメント（`docs/user/`）と Chrome Web Store 掲載用の実画面を撮影するスクリプト。

## 実行方法

```bash
rm -rf tmp/screenshots-profile
LANG=ja_JP.UTF-8 xvfb-run -a -s "-screen 0 1400x1000x24" node scripts/screenshots/capture.js
```

- プロジェクト既存の Puppeteer 経路（`scripts/inspect_ext_bg.js` と同じ起動方式）で `dist/` の拡張機能を読み込む。正規 Chrome は `--load-extension` を無視するため、Puppeteer 同梱の Chromium を使う。
- ブラウザ UI のロケールは `LANG` 環境変数で決まる（`--lang` 引数では変わらない）。日本語 UI で撮る場合は `LANG=ja_JP.UTF-8` が必須。
- プロファイル（`tmp/screenshots-profile`）は実行ごとに作り直す。残っていると復元タブが混ざり、快適モード切替メッセージの送信先がずれる。

## 撮影対象

| ファイル (tmp/screenshots/) | 内容 |
|---|---|
| `options-page.png` | オプションページ全体 |
| `comfort-mode.png` | YouTube 公開動画（Big Buck Bunny）で快適モード ON・コントロール非表示 |
| `comfort-controls.png` | 快適モード＋一時停止でカスタムコントロール表示 |
| `context-menu.png` | 動画上の右クリックメニュー（「Comfortable Video」項目）。ページ内撮影ではブラウザ標準メニューが写らないため X 画面ごとキャプチャする |

## docs への配置

```bash
mkdir -p docs/user/images
convert tmp/screenshots/context-menu.png -crop 1085x890+5+5 +repage tmp/screenshots/context-menu-crop.png
for n in options-page comfort-mode comfort-controls; do
  convert tmp/screenshots/$n.png -quality 82 docs/user/images/$n.webp
done
convert tmp/screenshots/context-menu-crop.png -quality 82 docs/user/images/context-menu.webp
```
