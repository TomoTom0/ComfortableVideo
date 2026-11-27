/**
 * Comfortable Video ドキュメント用スクリーンショット撮影
 *
 * プロジェクト既存の Puppeteer 経路 (scripts/inspect_ext_bg.js と同じ起動方式) で
 * dist/ の拡張機能を読み込み、利用者向けドキュメント用の実画面を撮影する。
 *
 * 撮影対象:
 *  1. オプションページ全体 (options-page.png)
 *  2. YouTube 公開動画で快適モード ON + カスタムコントロール表示 (comfort-mode.png)
 *  3. 動画上の右クリック (ブラウザ標準) メニュー (context-menu.png, X 画面キャプチャ)
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

    // 診断: 全ターゲットと YouTube プレーヤー内ボタンの有無
    const allTargets = await browser.targets();
    allTargets.forEach((t, i) => console.log('TARGET', i, t.type(), t.url().slice(0, 90)));
    const inlineBtn = await page.evaluate(() => {
      const b = document.querySelector('.comfort-mode-button');
      return b ? { found: true, title: b.title, cls: b.className } : { found: false };
    });
    console.log('inline button:', JSON.stringify(inlineBtn));

    // Service Worker 経由で背景スクリプトと同じメッセージを送信
    const swSession = await sw.createCDPSession();
    await swSession.send('Runtime.enable');
    // 注: manifest に tabs 権限が無いため tab.url は取得できない。
    // 全タブへ順に送信し、応答 (success) があったタブを対象とする。
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

    // メッセージで有効化できていなければ、プレーヤー内の公式ボタンをクリックする
    let activated = await page.evaluate(
      () => !!document.querySelector('.comfort-mode-video')
    );
    if (!activated) {
      const btn = await page.$('.comfort-mode-button');
      if (btn) {
        await page.mouse.move(640, 700); // プレーヤーコントロールを表示
        await sleep(800);
        await btn.click();
        console.log('inline button clicked');
        await sleep(2000);
      } else {
        console.log('inline button not found for fallback click');
      }
    }

    const state = await page.evaluate(() => ({
      comfortVideo: !!document.querySelector('.comfort-mode-video'),
      controls: !!document.querySelector('#comfort-mode-custom-controls'),
      controlsHidden: document
        .querySelector('#comfort-mode-custom-controls')
        ?.classList.contains('hidden'),
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

      // --- 2b. 一時停止してカスタムコントロール表示 ---
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
      // 再生に戻す (右クリックメニューの見た目を通常状態にするため)
      await page.evaluate(() => {
        const v = document.querySelector('video');
        if (v) v.play().catch(() => {});
      });
      await sleep(800);

      // --- 3. 右クリックメニュー (X 画面ごと撮影) ---
      // YouTube は 1 回目の右クリックで独自メニューを出すため 2 回行う
      await page.mouse.click(640, 400, { button: 'right' });
      await sleep(800);
      await page.mouse.click(640, 400, { button: 'right' });
      await sleep(1200);
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
    } else {
      results.comfort = 'failed: comfort mode not activated';
    }
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
