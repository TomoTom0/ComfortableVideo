import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// happy-dom のデフォルト URL (about:blank) では YouTube/TTFC/Prime Video 判定は false のため
// サイト固有の初期化は実行されない
import '../../../src/content';

function createValidVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
  document.body.appendChild(video);
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
  document.body.classList.remove('comfort-mode-active', 'video-area-hovered', 'video-controls-enabled');
  document.documentElement.classList.remove('comfort-mode-scroll-lock');
  document.querySelectorAll('video').forEach(v => v.remove());
}

describe('Grace period（連続再生時に快適モードを維持）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
    vi.useRealTimers();
  });

  describe('動画終了時のgrace period', () => {
    it('動画終了後5秒以内に次の動画が再生されれば快適モードは維持される', async () => {
      const video1 = createValidVideo();
      hook<() => void>('__enableComfortMode')();
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

      // 動画終了を模擬（comfort-mode-videoクラスは残したままendedにする）
      Object.defineProperty(video1, 'ended', { value: true, configurable: true });

      // endedイベントを発火
      video1.dispatchEvent(new Event('ended'));

      // grace period中は快適モードが維持
      vi.advanceTimersByTime(2000);
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

      // 次の動画が開始（新しいvideo要素を追加）
      createValidVideo();

      // MutationObserverのコールバックを処理
      await Promise.resolve();

      // 快適モードは維持される
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

      // 5秒経過しても解除されない
      vi.advanceTimersByTime(5000);
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);
    });

    it('動画終了後5秒経過しても次の動画が再生されなければ快適モードは解除される', () => {
      const video = createValidVideo();
      hook<() => void>('__enableComfortMode')();
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

      // 動画終了を模擬
      Object.defineProperty(video, 'ended', { value: true, configurable: true });

      video.dispatchEvent(new Event('ended'));

      // grace period中は快適モードが維持
      vi.advanceTimersByTime(3000);
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

      // 5秒経過で解除
      vi.advanceTimersByTime(2500);
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(false);
    });

    it('ユーザー操作による解除はgrace periodに関係なく即座に実行される', () => {
      const video = createValidVideo();
      hook<() => void>('__enableComfortMode')();
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

      // 動画終了でgrace period開始
      Object.defineProperty(video, 'ended', { value: true, configurable: true });
      video.dispatchEvent(new Event('ended'));

      // ユーザーが手動で解除
      hook<() => void>('__disableComfortModeByUser')();
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(false);
    });
  });
});
