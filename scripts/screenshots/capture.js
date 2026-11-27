/**
 * Comfortable Video ドキュメント用スクリーンショット撮影
 *
 * プロジェクト既存の Puppeteer 経路 (scripts/inspect_ext_bg.js と同じ起動方式) で
 * dist/ の拡張機能を読み込み、利用者向けドキュメント用の実画面を撮影する。
 *
 * 撮影対象:
 *  1. オプションページ全体 (options-page.png)
 *  2. YouTube 公開動画で快適モード ON・コントロール非表示 (comfort-mode.png)
 *  3. 快適モード＋一時停止でカスタムコントロール表示 (comfort-controls.png)
 *  4. 元サイトのコントロールバー有効化の状態確認 (site-controls.png, docs 未使用: 現行 YouTube ではバーが display:none のため写らない)
 *  5. 動画上の右クリック (ブラウザ標準) メニュー (context-menu.png, X 画面キャプチャ)。サブメニューの展開は合成マウス/キー操作では再現できず、親項目の表示まで
 *
 * 出力先: tmp/screenshots/ (webp 化と docs への配置は別途行う)
 * 実行: LANG=ja_JP.UTF-8 xvfb-run -a -s "-screen 0 1400x1000x24" node scripts/screenshots/capture.js
 *   注: ブラウザ UI のロケールは LANG 環境変数で決まる (--lang 引数では変わらない)。
 *       日本語 UI で撮る場合は LANG=ja_JP.UTF-8 を付けること。
 *   注: プロファイル (tmp/screenshots-profile) は実行ごとに作り直すこと。
 *       残っていると復元タブが混ざり、メッセージ送信先のタブがずれる。
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'tmp', 'screenshots');
const PROFILE = path.join(ROOT, 'tmp', 'screenshots-profile');
const VIDEO_URL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'; // Big Buck Bunny (公開テスト動画)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const extensionPath = path.join(ROOT, 'dist');
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: puppeteer.executablePath(),
    userDataDir: PROFILE,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--lang=ja-JP',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });
  const results = {};
  try {
    await sleep(2500);
    // Service Worker から拡張機能 ID を取得
    const targets = await browser.targets();
    const sw = targets.find(
      (t) => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://')
    );
    if (!sw) throw new Error('拡張機能の Service Worker が見つかりません (拡張が読み込まれていない)');
    const extensionId = new URL(sw.url()).host;
    console.log('extensionId:', extensionId);

    // --- 1. オプションページ ---
    const optPage = await browser.newPage();
    await optPage.goto(`chrome-extension://${extensionId}/options.html`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    await sleep(1500);
    await optPage.screenshot({ path: path.join(OUT, 'options-page.png'), fullPage: true });
    results.options = 'ok';
    console.log('options-page.png saved');

    // --- 2. YouTube で快適モード ---
    const page = await browser.newPage();
    page.on('console', (msg) => {
      const t = msg.text();
      if (t.includes('Comfortable Video')) console.log('PAGE_LOG:', t.slice(0, 300));
    });
    await page.goto(VIDEO_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('video', { timeout: 30000 });
    await sleep(6000);
    const videoInfo = await page.evaluate(() => {
      const v = document.querySelector('video');
      return v ? { readyState: v.readyState, paused: v.paused, w: v.videoWidth, h: v.videoHeight } : null;
    });
    console.log('video:', JSON.stringify(videoInfo));

    // Service Worker 経由で背景スクリプトと同じメッセージを送信
    // 注: manifest に tabs 権限が無いため tab.url は取得できない。
    // 全タブへ順に送信し、応答 (success) があったタブを対象とする。
    const swSession = await sw.createCDPSession();
    await swSession.send('Runtime.enable');
    const toggleExpr = `(async () => {
      const tabs = await chrome.tabs.query({});
      const attempts = [];
      for (const tab of tabs) {
        try {
          const res = await chrome.tabs.sendMessage(tab.id, { action: 'toggleComfortMode' });
          attempts.push({ tabId: tab.id, res });
          if (res && res.success) return { tabId: tab.id, res, attempts };
        } catch (e) {
          attempts.push({ tabId: tab.id, error: String(e && e.message || e) });
        }
      }
      return { error: 'no tab responded with success', attempts };
    })()`;
    const toggleRes = await swSession.send('Runtime.evaluate', {
      expression: toggleExpr,
      returnByValue: true,
      awaitPromise: true,
    });
    console.log('toggle result:', JSON.stringify(toggleRes.result && toggleRes.result.value));
    for (let i = 0; i < 6; i++) {
      await sleep(700);
      const s = await page.evaluate(() => ({
        comfortVideo: !!document.querySelector('.comfort-mode-video'),
        controls: !!document.querySelector('#comfort-mode-custom-controls'),
        videos: document.querySelectorAll('video').length,
      }));
      console.log(`state[${i}]:`, JSON.stringify(s));
      if (s.comfortVideo) break;
    }

    const state = await page.evaluate(() => ({
      comfortVideo: !!document.querySelector('.comfort-mode-video'),
      controls: !!document.querySelector('#comfort-mode-custom-controls'),
      exitBtn: !!document.querySelector('#comfort-mode-exit-button'),
    }));
    console.log('comfort state:', JSON.stringify(state));
    results.comfortState = state;

    if (state.comfortVideo) {
      // マウスを動画中央へ (コントロール表示維持) してから撮影
      await page.mouse.move(640, 400);
      await sleep(1200);
      await page.screenshot({ path: path.join(OUT, 'comfort-mode.png') });
      results.comfort = 'ok';
      console.log('comfort-mode.png saved');

      // --- 3. 一時停止してカスタムコントロール表示 ---
      await page.evaluate(() => {
        const v = document.querySelector('video');
        if (v) v.pause();
      });
      await sleep(1500);
      await page.mouse.move(640, 400);
      await sleep(600);
      const ctrlState = await page.evaluate(() => {
        const c = document.querySelector('#comfort-mode-custom-controls');
        return c
          ? { exists: true, hidden: c.classList.contains('hidden'), text: c.textContent.trim().slice(0, 60) }
          : { exists: false };
      });
      console.log('controls state (paused):', JSON.stringify(ctrlState));
      results.controlsState = ctrlState;
      await page.screenshot({ path: path.join(OUT, 'comfort-controls.png') });
      results.controls = 'ok';
      console.log('comfort-controls.png saved');

      // --- 4. 元サイトのコントロールバー有効化 (下部20%に2秒ホバー) ---
      await page.evaluate(() => {
        const v = document.querySelector('video');
        if (v) v.play().catch(() => {});
      });
      await sleep(800);
      // 下部20%エリアのクリックで即座に有効化される経路を使う
      await page.mouse.click(640, 760);
      await sleep(500);
      // YouTube 側コントロールは無操作で自動非表示になるため、小さく動かして即撮影する
      await page.mouse.move(660, 758);
      await sleep(300);
      const ytpState = await page.evaluate(() => {
        const bar = document.querySelector('.ytp-chrome-bottom');
        if (!bar) return { found: false };
        const cs = getComputedStyle(bar);
        return { found: true, opacity: cs.opacity, visibility: cs.visibility, display: cs.display };
      });
      console.log('ytp chrome-bottom state:', JSON.stringify(ytpState));
      results.ytpState = ytpState;
      await page.screenshot({ path: path.join(OUT, 'site-controls.png') });
      results.siteControls = 'ok';
      console.log('site-controls.png saved');
    } else {
      results.comfort = 'failed: comfort mode not activated';
    }

    // --- 5. 右クリックメニュー (X 画面ごと撮影) ---
    // 快適モードの成否に依らず撮影する (開始導線の記録のため)。
    // YouTube は 1 回目の右クリックで独自メニューを出すため 2 回行う。
    await page.bringToFront();
    // メニュー全体とサブメニューが画面内に収まるよう、動画の上寄りで右クリックする
    await page.mouse.click(300, 150, { button: 'right' });
    await sleep(800);
    await page.mouse.click(300, 150, { button: 'right' });
    await sleep(1200);
    // 「Comfortable Video」親項目までキーボードで移動してサブメニューを展開する。
    // (マウスホバー座標はメニュー高さでずれるため、キー操作の方が再現性が高い)
    // 動画メニューの項目順: ループ / すべてのコントロールを表示 / 動画を新しいタブで開く /
    // 動画フレームに名前を付けて保存 / 名前を付けて動画を保存 / 動画フレームをコピー /
    // 動画アドレスをコピー / ピクチャー イン ピクチャー / 画像検索でこの動画を検索する /
    // Comfortable Video / 検証
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
      await sleep(90);
    }
    await page.keyboard.press('ArrowRight');
    await sleep(1000);
    // キー操作で展開しない場合に備え、親項目 (メニュー上端+約265px) にもホバーする
    await page.mouse.move(500, 415);
    await sleep(900);
    try {
      execSync(`import -window root "${path.join(OUT, 'context-menu.png')}"`, {
        env: process.env,
        timeout: 15000,
      });
      results.contextMenu = 'captured (要目視確認)';
      console.log('context-menu.png saved (X capture)');
    } catch (e) {
      results.contextMenu = 'failed: ' + e.message;
      console.log('context-menu capture failed:', e.message);
    }
    await page.mouse.click(100, 100); // メニューを閉じる
    await optPage.close().catch(() => {});
  } finally {
    await browser.close();
  }
  console.log('RESULTS:', JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
