// @vitest-environment-options { "url": "https://www.amazon.co.jp/gp/video/detail" }
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// カスタムコントロールの表示状態と字幕オフセット用bodyクラスの同期を検証する
import '../../../src/content';

const PLAYER_PLACEHOLDER_ID = 'comfort-mode-player-placeholder';

function createValidVideo(parent: HTMLElement): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
  parent.appendChild(video);
  return video;
}

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
  document.body.classList.remove(
    'comfort-mode-active', 'video-area-hovered', 'video-controls-enabled', 'comfort-controls-visible',
  );
  document.documentElement.classList.remove('comfort-mode-scroll-lock');
  document.querySelectorAll('video').forEach(v => v.remove());
  document.getElementById(PLAYER_PLACEHOLDER_ID)?.remove();
  document.querySelectorAll('.webPlayerContainer').forEach(c => c.remove());
}

function setupPlayerWithVideo(): { playerContainer: HTMLDivElement; video: HTMLVideoElement } {
  const playerContainer = document.createElement('div');
  playerContainer.className = 'webPlayerContainer';
  document.body.appendChild(playerContainer);
  const video = createValidVideo(playerContainer);
  return { playerContainer, video };
}

describe('カスタムコントロールの表示状態と字幕オフセット用クラスの同期', () => {
  beforeEach(() => {
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
  });

  it('一時停止中の快適モードではコントロールが表示され、bodyにcomfort-controls-visibleが付く', () => {
    setupPlayerWithVideo();

    hook<() => void>('__enableComfortMode')();
    expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

    const controls = document.getElementById('comfort-mode-custom-controls');
    expect(controls).not.toBeNull();
    // happy-dom の動画は一時停止中のため、コントロールは表示状態で作られる
    expect(controls!.classList.contains('hidden')).toBe(false);
    expect(document.body.classList.contains('comfort-controls-visible')).toBe(true);
  });

  it('再生状態の変化に追従してbodyクラスが切り替わる', async () => {
    const { video } = setupPlayerWithVideo();
    // 再生中を模擬する（happy-domのpausedは常にtrueのため差し替える）
    Object.defineProperty(video, 'paused', { value: false, configurable: true });

    hook<() => void>('__enableComfortMode')();
    const controls = document.getElementById('comfort-mode-custom-controls');
    expect(controls).not.toBeNull();
    // 再生中の初期表示ではコントロールは非表示で、bodyクラスも付かない
    expect(controls!.classList.contains('hidden')).toBe(true);
    expect(document.body.classList.contains('comfort-controls-visible')).toBe(false);

    // 一時停止イベントでコントロールが表示され、bodyクラスが付く
    video.dispatchEvent(new Event('pause'));
    expect(controls!.classList.contains('hidden')).toBe(false);
    expect(document.body.classList.contains('comfort-controls-visible')).toBe(true);

    // 再生イベント後の自動非表示でコントロールが隠れ、bodyクラスが外れる
    video.dispatchEvent(new Event('play'));
    await vi.waitFor(() => {
      expect(document.body.classList.contains('comfort-controls-visible')).toBe(false);
    }, { timeout: 6000, interval: 100 });
  });

  it('快適モード解除時にbodyクラスが残らない', () => {
    setupPlayerWithVideo();

    hook<() => void>('__enableComfortMode')();
    expect(document.body.classList.contains('comfort-controls-visible')).toBe(true);

    hook<() => void>('__disableComfortModeByUser')();

    expect(document.getElementById('comfort-mode-custom-controls')).toBeNull();
    expect(document.body.classList.contains('comfort-controls-visible')).toBe(false);
  });
});
