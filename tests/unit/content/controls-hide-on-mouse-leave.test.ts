// @vitest-environment-options { "url": "https://www.amazon.co.jp/gp/video/detail" }
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// マウス離脱監視（handleMouseMove / 再生開始時の初期タイマー / 一時停止時の監視停止）に
// よるカスタムコントロールの自動非表示を検証する。
// 再生/一時停止イベントによる表示切替と字幕オフセットの同期は
// captions-controls-offset.test.ts の担当であり、ここでは重複させない
import '../../../src/content';

// src/content.ts の定数・既定値と同じ値（タイマー 待ち時間の契約を固定する）
const CONTROLS_HIDE_DELAY_MS = 500; // コントロール領域外へ出てから非表示までの遅延
const CONTROLS_DISABLE_TIME_MS = 3000; // テストで storage へ明示設定する値

const VIDEO_RECT = new DOMRect(0, 0, 1280, 720);
const CONTROLS_RECT = new DOMRect(100, 600, 400, 100); // left=100, top=600, right=500, bottom=700

// 検証で使うマウス座標
const IN_CONTROLS: [number, number] = [200, 650]; // コントロール領域内（動画エリア内・下部）
const IN_VIDEO_OUT_OF_CONTROLS: [number, number] = [640, 100]; // 動画エリア内・コントロール領域外
const OUT_OF_VIDEO: [number, number] = [2000, 100]; // 動画エリア外

// content.ts がテスト用に公開するフックの型（content.ts の declare global を拡張）
declare global {
  interface Window {
    __enableComfortMode?: () => void;
    __disableComfortModeByUser?: () => void;
    __getIsComfortModeActive?: () => boolean;
    __loadSettings?: () => Promise<void>;
  }
}

function enableComfortMode(): void {
  const fn = window.__enableComfortMode;
  if (!fn) throw new Error('テストフック __enableComfortMode が未定義です');
  fn();
}

function disableComfortModeByUser(): void {
  const fn = window.__disableComfortModeByUser;
  if (!fn) throw new Error('テストフック __disableComfortModeByUser が未定義です');
  fn();
}

function isComfortModeActive(): boolean {
  const fn = window.__getIsComfortModeActive;
  if (!fn) throw new Error('テストフック __getIsComfortModeActive が未定義です');
  return fn();
}

async function reloadSettings(): Promise<void> {
  const fn = window.__loadSettings;
  if (!fn) throw new Error('テストフック __loadSettings が未定義です');
  await fn();
}

const PLAYER_PLACEHOLDER_ID = 'comfort-mode-player-placeholder';

function cleanupComfortMode(): void {
  if (isComfortModeActive()) {
    disableComfortModeByUser();
  }
  document.getElementById('comfort-mode-exit-button')?.remove();
  document.getElementById('comfort-mode-custom-controls')?.remove();
  document.getElementById('comfort-mode-overlay')?.remove();
  document.body.classList.remove(
    'comfort-mode-active', 'video-area-hovered', 'video-controls-enabled', 'comfort-controls-visible',
  );
  document.documentElement.classList.remove('comfort-mode-scroll-lock');
  document.querySelectorAll('video').forEach(v => v.remove());
  document.getElementById(PLAYER_PLACEHOLDER_ID)?.remove();
  document.querySelectorAll('.webPlayerContainer').forEach(c => c.remove());
}

// happy-dom の getBoundingClientRect は常にゼロ矩形を返すため、
// 指定した矩形を返すよう差し替える（click-toggle.test.ts と同じ手法）
function overrideRect(el: Element, rect: DOMRect): void {
  el.getBoundingClientRect = () => rect;
}

function createPlayerWithVideo(): HTMLVideoElement {
  const playerContainer = document.createElement('div');
  playerContainer.className = 'webPlayerContainer';

  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
  // happy-dom ではメディア要素の play/pause が paused を切り替えないため、
  // paused フラグを保持するスタブに差し替える（click-toggle.test.ts と同じ手法）
  let paused = true;
  Object.defineProperty(video, 'paused', { get: () => paused, configurable: true });
  video.play = () => { paused = false; return Promise.resolve(); };
  video.pause = () => { paused = true; };

  overrideRect(video, VIDEO_RECT);
  playerContainer.appendChild(video);
  document.body.appendChild(playerContainer);
  return video;
}

function getCustomControls(): HTMLElement {
  const el = document.getElementById('comfort-mode-custom-controls');
  if (!el) throw new Error('カスタムコントロール要素が見つかりません');
  return el;
}

function mouseMoveTo(point: [number, number]): void {
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: point[0], clientY: point[1] }));
}

function isControlsHidden(): boolean {
  return getCustomControls().classList.contains('hidden');
}

// 再生開始（paused を false にした上で play イベントを発火）
function startPlayback(video: HTMLVideoElement): void {
  video.play();
  video.dispatchEvent(new Event('play'));
}

// 一時停止（paused を true にした上で pause イベントを発火）
function pausePlayback(video: HTMLVideoElement): void {
  video.pause();
  video.dispatchEvent(new Event('pause'));
}

describe('マウス離脱監視によるカスタムコントロールの自動非表示', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    cleanupComfortMode();
    // controlsDisableTime を既定と同じ値で明示設定し、
    // 既定値変更に対するテストの脆さを避ける
    await chrome.storage.sync.set({ controlsDisableTime: CONTROLS_DISABLE_TIME_MS });
    await reloadSettings();
  });

  afterEach(() => {
    cleanupComfortMode();
    vi.useRealTimers();
  });

  it('再生中にポインタがコントロール領域外へ出ると、遅延後にコントロールが非表示になる', () => {
    const video = createPlayerWithVideo();
    enableComfortMode();
    expect(isComfortModeActive()).toBe(true);
    overrideRect(getCustomControls(), CONTROLS_RECT);
    expect(isControlsHidden()).toBe(false); // 一時停止中は表示状態で作られる

    // 再生開始前に動画エリア内へポインタを移動（初期タイマーは長い遅延で仕掛けられる）
    mouseMoveTo(IN_VIDEO_OUT_OF_CONTROLS);
    startPlayback(video);

    // コントロール領域内へ入ると、再生開始時に仕掛けられた初期タイマーは解除される
    mouseMoveTo(IN_CONTROLS);
    vi.advanceTimersByTime(CONTROLS_DISABLE_TIME_MS);
    expect(isControlsHidden()).toBe(false);

    // コントロール領域外へ出ると CONTROLS_HIDE_DELAY のタイマーが仕掛けられる
    mouseMoveTo(IN_VIDEO_OUT_OF_CONTROLS);
    vi.advanceTimersByTime(CONTROLS_HIDE_DELAY_MS - 1);
    expect(isControlsHidden()).toBe(false); // 遅延の経過前は表示のまま

    vi.advanceTimersByTime(1);
    expect(isControlsHidden()).toBe(true);
    expect(document.body.classList.contains('comfort-controls-visible')).toBe(false);
  });

  it('非表示遅延の経過前にコントロール領域へ戻ると、非表示にならない', () => {
    const video = createPlayerWithVideo();
    enableComfortMode();
    overrideRect(getCustomControls(), CONTROLS_RECT);

    mouseMoveTo(IN_VIDEO_OUT_OF_CONTROLS);
    startPlayback(video);
    mouseMoveTo(IN_CONTROLS); // 初期タイマーを解除

    // 領域外へ出て非表示タイマーを仕掛けた後、経過前に領域内へ戻る
    mouseMoveTo(IN_VIDEO_OUT_OF_CONTROLS);
    vi.advanceTimersByTime(CONTROLS_HIDE_DELAY_MS / 2);
    mouseMoveTo(IN_CONTROLS);

    // 初期タイマーの遅延分も含めて進めても、非表示にならない
    vi.advanceTimersByTime(CONTROLS_DISABLE_TIME_MS + CONTROLS_HIDE_DELAY_MS);
    expect(isControlsHidden()).toBe(false);
    expect(document.body.classList.contains('comfort-controls-visible')).toBe(true);
  });

  it('一時停止すると監視が停止し、領域外へ出てもコントロールは非表示にならない', () => {
    const video = createPlayerWithVideo();
    enableComfortMode();
    overrideRect(getCustomControls(), CONTROLS_RECT);

    mouseMoveTo(IN_VIDEO_OUT_OF_CONTROLS);
    startPlayback(video);
    mouseMoveTo(IN_CONTROLS); // 監視中のまま初期タイマーを解除

    pausePlayback(video); // 一時停止で監視停止・タイマー解除される

    // 一時停止中に領域外へ出ても、非表示タイマーは仕掛けられない
    mouseMoveTo(IN_VIDEO_OUT_OF_CONTROLS);
    vi.advanceTimersByTime(CONTROLS_DISABLE_TIME_MS + CONTROLS_HIDE_DELAY_MS);
    expect(isControlsHidden()).toBe(false);
  });

  it('再生開始時にマウスが動画エリア内にある場合、controlsDisableTime の遅延で非表示になる', () => {
    const video = createPlayerWithVideo();
    enableComfortMode();
    overrideRect(getCustomControls(), CONTROLS_RECT);

    mouseMoveTo(IN_VIDEO_OUT_OF_CONTROLS); // 動画エリア内
    startPlayback(video);

    vi.advanceTimersByTime(CONTROLS_DISABLE_TIME_MS - 1);
    expect(isControlsHidden()).toBe(false); // controlsDisableTime 経過前は表示のまま

    vi.advanceTimersByTime(1);
    expect(isControlsHidden()).toBe(true);
  });

  it('再生開始時にマウスが動画エリア外にある場合、短い遅延(CONTROLS_HIDE_DELAY)で非表示になる', () => {
    const video = createPlayerWithVideo();
    enableComfortMode();
    overrideRect(getCustomControls(), CONTROLS_RECT);

    mouseMoveTo(OUT_OF_VIDEO); // 動画エリア外
    startPlayback(video);

    vi.advanceTimersByTime(CONTROLS_HIDE_DELAY_MS - 1);
    expect(isControlsHidden()).toBe(false); // 短い遅延の経過前は表示のまま

    vi.advanceTimersByTime(1);
    expect(isControlsHidden()).toBe(true);
  });
});
