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
  hook<() => void>('__stopAutoReenableWatcher')();
  document.getElementById('comfort-mode-exit-button')?.remove();
  document.getElementById('comfort-mode-custom-controls')?.remove();
  document.getElementById('comfort-mode-overlay')?.remove();
  document.body.classList.remove('comfort-mode-active', 'video-area-hovered', 'video-controls-enabled');
  document.documentElement.classList.remove('comfort-mode-scroll-lock');
  document.querySelectorAll('video').forEach(v => v.remove());
}

describe('自動再有効化（連続再生対応）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
    vi.useRealTimers();
  });

  describe('disableComfortModeByUser', () => {
    it('ユーザー操作による解除では自動再有効化が発生しない', () => {
      createValidVideo();
      hook<() => void>('__enableComfortMode')();
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

      hook<() => void>('__disableComfortModeByUser')();
      vi.advanceTimersByTime(1000);

      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(false);
      expect(hook<() => boolean>('__getAutoReenableComfortMode')()).toBe(false);
    });
  });

  describe('disableComfortMode（自動解除）', () => {
    it('自動解除後は自動再有効化の待機状態になる', () => {
      const video = createValidVideo();
      hook<() => void>('__enableComfortMode')();
      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

      // エピソード終了を模擬: ended にしてから DOM から削除
      Object.defineProperty(video, 'ended', { value: true, configurable: true });
      video.remove();

      hook<() => void>('__disableComfortMode')();
      vi.advanceTimersByTime(600);

      expect(hook<() => boolean>('__getAutoReenableComfortMode')()).toBe(true);
    });

    it('自動解除後に有効な新動画が追加されると快適モードが再有効化される', async () => {
      const video1 = createValidVideo();
      // ended な動画として設定（再有効化の対象から除外される）
      Object.defineProperty(video1, 'ended', { value: true, configurable: true });

      hook<() => void>('__enableComfortMode')();
      hook<() => void>('__disableComfortMode')();
      video1.remove();

      // ウォッチャーが起動するまで待機（500ms の setTimeout）
      vi.advanceTimersByTime(600);
      expect(hook<() => boolean>('__getAutoReenableComfortMode')()).toBe(true);

      // 新しい有効な動画を DOM に追加
      createValidVideo();

      // MutationObserver のコールバック（マイクロタスク）を処理
      await Promise.resolve();

      expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);
    });

    it('30秒経過後は自動再有効化がキャンセルされる', () => {
      const video = createValidVideo();
      hook<() => void>('__enableComfortMode')();

      // エピソード終了を模擬: ended にしてから DOM から削除
      Object.defineProperty(video, 'ended', { value: true, configurable: true });
      video.remove();

      hook<() => void>('__disableComfortMode')();

      vi.advanceTimersByTime(600);
      expect(hook<() => boolean>('__getAutoReenableComfortMode')()).toBe(true);

      // 30秒タイムアウト
      vi.advanceTimersByTime(30000);
      expect(hook<() => boolean>('__getAutoReenableComfortMode')()).toBe(false);
    });
  });
});
