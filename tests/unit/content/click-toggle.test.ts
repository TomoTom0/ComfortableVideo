/**
 * @vitest-environment-options { "url": "https://www.youtube.com/watch?v=click-toggle-test" }
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// YouTube の URL を使うのは、YouTube では #movie_player ごと body へ移動され、
// video がプレーヤーコンテナ内に残るため、プラットフォーム側のクリック
// ハンドラと拡張側ハンドラが同じクリックを受ける構造を再現するため
import '../../../src/content';

function hook<T>(name: string): T {
  return (window as any)[name] as T;
}

function cleanupComfortMode(): void {
  if (hook<() => boolean>('__getIsComfortModeActive')()) {
    hook<() => void>('__disableComfortModeByUser')();
  }
  document.getElementById('comfort-mode-exit-button')?.remove();
  document.getElementById('comfort-mode-custom-controls')?.remove();
  document.getElementById('comfort-mode-overlay')?.remove();
  document.body.classList.remove('comfort-mode-active', 'video-area-hovered', 'video-controls-enabled');
  document.documentElement.classList.remove('comfort-mode-scroll-lock');
  document.querySelectorAll('video').forEach(v => v.remove());
  document.getElementById('movie_player')?.remove();
}

// YouTube 型の構造を模擬する: プレーヤーコンテナが自前の click ハンドラで
// 再生/一時停止をトグルし、その中に video 要素がある
function createPlayerWithVideo() {
  const player = document.createElement('div');
  player.id = 'movie_player';

  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });

  // happy-dom ではメディア要素の play/pause が paused を切り替えないため、
  // paused フラグを保持するスタブに差し替える
  let paused = true;
  Object.defineProperty(video, 'paused', { get: () => paused, configurable: true });
  video.play = () => { paused = false; return Promise.resolve(); };
  video.pause = () => { paused = true; };

  video.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720, x: 0, y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

  player.appendChild(video);
  document.body.appendChild(player);

  // プラットフォーム（YouTube）側のクリックトグルを模擬
  const platformToggle = vi.fn(() => {
    if (video.paused) { video.play(); } else { video.pause(); }
  });
  player.addEventListener('click', platformToggle);

  return { player, video, platformToggle };
}

function clickAt(target: Element, x: number, y: number): void {
  target.dispatchEvent(new MouseEvent('click', {
    bubbles: true, cancelable: true, clientX: x, clientY: y,
  }));
}

describe('動画クリックの再生/一時停止トグル（二重トグル防止）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
    vi.useRealTimers();
  });

  it('上部80%の単クリックで再生状態がちょうど1回だけ切り替わる', () => {
    const { video, platformToggle } = createPlayerWithVideo();
    hook<() => void>('__enableComfortMode')();
    expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);
    expect(video.paused).toBe(true);

    clickAt(video, 640, 100);

    // プラットフォーム側ハンドラと拡張側ハンドラが両方トグルすると
    // 元の状態に戻ってしまう（不具合の再現条件）
    expect(video.paused).toBe(false);
    expect(platformToggle).not.toHaveBeenCalled();
  });

  it('上部80%の単クリックで一時停止もちょうど1回だけ切り替わる', () => {
    const { video, platformToggle } = createPlayerWithVideo();
    hook<() => void>('__enableComfortMode')();
    video.play();
    expect(video.paused).toBe(false);

    clickAt(video, 640, 100);

    expect(video.paused).toBe(true);
    expect(platformToggle).not.toHaveBeenCalled();
  });

  it('下部20%のクリックでは再生状態が変わらず、コントロールが有効化される', () => {
    const { video, platformToggle } = createPlayerWithVideo();
    hook<() => void>('__enableComfortMode')();
    expect(video.paused).toBe(true);

    clickAt(video, 640, 700);

    expect(video.paused).toBe(true);
    expect(platformToggle).not.toHaveBeenCalled();
    expect(document.body.classList.contains('video-controls-enabled')).toBe(true);
  });

  it('動画要素以外へのクリックはプラットフォーム側へ素通りする', () => {
    const { player, platformToggle } = createPlayerWithVideo();
    hook<() => void>('__enableComfortMode')();

    const inner = document.createElement('div');
    player.appendChild(inner);
    clickAt(inner, 640, 100);

    expect(platformToggle).toHaveBeenCalledTimes(1);
  });
});
