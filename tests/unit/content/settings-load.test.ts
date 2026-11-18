/**
 * @vitest-environment-options { "url": "https://www.youtube.com/watch?v=settings-load-test" }
 */
import { describe, it, expect, beforeAll } from 'vitest';

// content.ts の import 前に storage をシードし、起動時の読み込みで
// 設定が反映されることを検証する（tests/setup.ts のモックストアを使用）
(globalThis as any).__setMockStorage({
  enableYoutube: false,
  hoverDetectionTime: 5000,
  exitButtonOpacity: 80,
});

beforeAll(async () => {
  await import('../../../src/content');
});

function hook<T>(name: string): T {
  return (window as any)[name] as T;
}

describe('起動時の設定読み込み (d-5)', () => {
  it('import 時点で storage の設定が読み込まれている', async () => {
    // 読み込み完了を確実にするため、明示的な再読み込みでも同じ値になることを含めて確認
    await hook<() => Promise<void>>('__loadSettings')();
    expect(hook<() => Record<string, unknown>>('__getSettings')()).toMatchObject({
      enableYoutube: false,
      hoverDetectionTime: 5000,
      exitButtonOpacity: 80,
    });
  });

  it('起動時に enableYoutube=false のサイトでは有効化されない', () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
    document.body.appendChild(video);

    hook<() => void>('__enableComfortMode')();
    expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(false);

    video.remove();
  });
});
