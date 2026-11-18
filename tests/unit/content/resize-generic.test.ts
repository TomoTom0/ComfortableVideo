import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// happy-dom のデフォルト URL (about:blank) ではサイト固有判定が全て false のため
// 汎用経路（動画要素を直接 body へ移動する経路）を通る
// d-4: リサイズ時の再最大化で自動解除されていた問題の汎用経路での回帰テスト
import '../../../src/content';

const PLAYER_PLACEHOLDER_ID = 'comfort-mode-player-placeholder';

function hook<T>(name: string): T {
  return (window as any)[name] as T;
}

function isActive(): boolean {
  return hook<() => boolean>('__getIsComfortModeActive')();
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
  document.getElementById(PLAYER_PLACEHOLDER_ID)?.remove();
  document.getElementById('video-container')?.remove();
}

function createVideoInContainer() {
  const container = document.createElement('div');
  container.id = 'video-container';
  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
  container.appendChild(video);
  document.body.appendChild(container);
  return { container, video };
}

describe('汎用経路: リサイズによる自動解除 (d-4)', () => {
  beforeEach(() => {
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
  });

  it('快適モード中のリサイズで自動解除されず、解除時の復元も正常に行われる', () => {
    const { container, video } = createVideoInContainer();
    hook<() => void>('__enableComfortMode')();
    expect(isActive()).toBe(true);
    expect(video.parentElement).toBe(document.body);
    expect(document.getElementById(PLAYER_PLACEHOLDER_ID)?.parentElement).toBe(container);

    window.dispatchEvent(new Event('resize'));

    expect(isActive()).toBe(true);
    expect(video.parentElement).toBe(document.body);
    expect(document.getElementById(PLAYER_PLACEHOLDER_ID)?.parentElement).toBe(container);

    hook<() => void>('__disableComfortModeByUser')();
    expect(isActive()).toBe(false);
    expect(video.parentElement).toBe(container);
  });
});
