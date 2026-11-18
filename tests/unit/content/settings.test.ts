/**
 * @vitest-environment-options { "url": "https://www.youtube.com/watch?v=settings-test" }
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// content.ts をインポート（Chrome API mock は tests/setup.ts で設定済み。
// storage.sync は内部ストアを持つモックで、__setMockStorage で差し替えできる）
import '../../../src/content';

function hook<T>(name: string): T {
  return (window as any)[name] as T;
}

function isActive(): boolean {
  return hook<() => boolean>('__getIsComfortModeActive')();
}

function getSettings(): Record<string, unknown> {
  return hook<() => Record<string, unknown>>('__getSettings')();
}

// モック storage の内容を差し替えて content.ts に再読み込みさせる
async function applyStoredSettings(values: Record<string, unknown>): Promise<void> {
  (globalThis as any).__setMockStorage(values);
  await hook<() => Promise<void>>('__loadSettings')();
}

function cleanupComfortMode(): void {
  if (isActive()) {
    hook<() => void>('__disableComfortModeByUser')();
  }
  document.getElementById('comfort-mode-exit-button')?.remove();
  document.getElementById('comfort-mode-custom-controls')?.remove();
  document.getElementById('comfort-mode-overlay')?.remove();
  document.body.classList.remove('comfort-mode-active', 'video-area-hovered', 'video-controls-enabled');
  document.documentElement.classList.remove('comfort-mode-scroll-lock');
  document.querySelectorAll('video').forEach(v => v.remove());
  document.getElementById('movie_player')?.remove();
  document.querySelector('.ytp-right-controls')?.remove();
}

// YouTube 型のプレーヤー構造（#movie_player > video）を模擬する
function createPlayerWithVideo(initialPaused: boolean) {
  const player = document.createElement('div');
  player.id = 'movie_player';

  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });

  let paused = initialPaused;
  Object.defineProperty(video, 'paused', { get: () => paused, configurable: true });
  video.play = () => { paused = false; return Promise.resolve(); };
  video.pause = () => { paused = true; };

  video.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720, x: 0, y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

  player.appendChild(video);
  document.body.appendChild(player);
  return { player, video };
}

function createRightControls(): HTMLElement {
  const rightControls = document.createElement('div');
  rightControls.className = 'ytp-right-controls';
  document.body.appendChild(rightControls);
  return rightControls;
}

function mouseMove(x: number, y: number): void {
  document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
}

function controlsEnabled(): boolean {
  return document.body.classList.contains('video-controls-enabled');
}

describe('設定の読み込みと反映 (d-5)', () => {
  beforeEach(async () => {
    cleanupComfortMode();
    await applyStoredSettings({});
  });

  afterEach(() => {
    cleanupComfortMode();
    vi.useRealTimers();
  });

  it('storage に保存された設定が読み込まれる', async () => {
    await applyStoredSettings({ hoverDetectionTime: 5000, controlsDisableTime: 8000, exitButtonOpacity: 80 });
    expect(getSettings()).toMatchObject({
      hoverDetectionTime: 5000,
      controlsDisableTime: 8000,
      exitButtonOpacity: 80,
    });
  });

  it('storage.onChanged 経由でも設定変更が伝播する', async () => {
    await (globalThis as any).chrome.storage.sync.set({ exitButtonOpacity: 65 });
    await vi.waitFor(() => {
      expect(getSettings().exitButtonOpacity).toBe(65);
    });
  });

  it('hoverDetectionTime が下部ホバーから有効化までの時間に反映される', async () => {
    await applyStoredSettings({ hoverDetectionTime: 5000 });
    vi.useFakeTimers();
    createPlayerWithVideo(false); // 再生中
    hook<() => void>('__enableComfortMode')();
    expect(isActive()).toBe(true);

    mouseMove(640, 700); // 下部20%エリア
    vi.advanceTimersByTime(4999);
    expect(controlsEnabled()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(controlsEnabled()).toBe(true);
  });

  it('controlsDisableTime が動画から離れて無効化までの時間に反映される', async () => {
    await applyStoredSettings({ hoverDetectionTime: 1000, controlsDisableTime: 1000 });
    vi.useFakeTimers();
    createPlayerWithVideo(false); // 再生中
    hook<() => void>('__enableComfortMode')();

    mouseMove(640, 700);
    vi.advanceTimersByTime(1000);
    expect(controlsEnabled()).toBe(true);

    mouseMove(2000, 100); // 動画エリア外
    vi.advanceTimersByTime(999);
    expect(controlsEnabled()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(controlsEnabled()).toBe(false);
  });

  it('pausedControlsEnabled が有効な場合、一時停止中は即座にコントロールが有効化される', async () => {
    await applyStoredSettings({}); // デフォルト true
    createPlayerWithVideo(true); // 一時停止中
    hook<() => void>('__enableComfortMode')();

    mouseMove(640, 100); // 下部でなくても即座に有効化される
    expect(controlsEnabled()).toBe(true);
  });

  it('pausedControlsEnabled が無効な場合、一時停止中もホバー検出が必要になる', async () => {
    await applyStoredSettings({ pausedControlsEnabled: false, hoverDetectionTime: 2000 });
    vi.useFakeTimers();
    createPlayerWithVideo(true); // 一時停止中
    hook<() => void>('__enableComfortMode')();

    mouseMove(640, 100); // 上部では有効化されない
    expect(controlsEnabled()).toBe(false);

    mouseMove(640, 700); // 下部でも即時には有効化されない
    expect(controlsEnabled()).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(controlsEnabled()).toBe(true);
  });

  it('exitButtonOpacity が解除ボタンの透明度に反映され、settingsUpdated でも更新される', async () => {
    await applyStoredSettings({ exitButtonOpacity: 80 });
    createPlayerWithVideo(true);
    hook<() => void>('__enableComfortMode')();

    const exitButton = document.getElementById('comfort-mode-exit-button');
    expect(exitButton).not.toBeNull();

    // 動画エリア外では設定値が透明度として適用される
    mouseMove(2000, 100);
    expect(exitButton!.style.opacity).toBe('0.8');

    // 動画エリア内ではインライン指定が外れ、SCSS側の状態別スタイルに従う
    mouseMove(640, 100);
    expect(exitButton!.style.opacity).toBe('');
    mouseMove(2000, 100);
    expect(exitButton!.style.opacity).toBe('0.8');

    // オプションページからの設定更新メッセージでも反映される
    const addListener = (globalThis as any).chrome.runtime.onMessage.addListener as any;
    const listener = addListener.mock.calls[addListener.mock.calls.length - 1][0];
    listener({ action: 'settingsUpdated', settings: { exitButtonOpacity: 50 } }, {}, vi.fn());
    expect(getSettings().exitButtonOpacity).toBe(50);
    expect(exitButton!.style.opacity).toBe('0.5');
  });

  it('showInlineButton が無効な場合、ボタンは追加されず既存ボタンも取り除かれる', async () => {
    const rightControls = createRightControls();
    hook<() => void>('__addYouTubeControlButton')();
    expect(rightControls.querySelector('.comfort-mode-button')).not.toBeNull();

    await applyStoredSettings({ showInlineButton: false });
    expect(rightControls.querySelector('.comfort-mode-button')).toBeNull();

    hook<() => void>('__addYouTubeControlButton')();
    expect(rightControls.querySelector('.comfort-mode-button')).toBeNull();
  });

  it('enableYoutube が無効な場合、有効化されずボタンも追加されない', async () => {
    await applyStoredSettings({ enableYoutube: false });
    createPlayerWithVideo(true);
    hook<() => void>('__enableComfortMode')();
    expect(isActive()).toBe(false);

    const rightControls = createRightControls();
    hook<() => void>('__addYouTubeControlButton')();
    expect(rightControls.querySelector('.comfort-mode-button')).toBeNull();
  });

  it('サイトが後から無効化された場合、快適モード中なら解除される', async () => {
    createPlayerWithVideo(true);
    hook<() => void>('__enableComfortMode')();
    expect(isActive()).toBe(true);

    await applyStoredSettings({ enableYoutube: false });
    expect(isActive()).toBe(false);
  });
});
