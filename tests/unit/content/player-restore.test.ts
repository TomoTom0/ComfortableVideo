import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// happy-dom のデフォルト URL (about:blank) では YouTube/TTFC/Prime Video 判定は false のため
// サイト固有の初期化は実行されない
import '../../../src/content';

const PLAYER_PLACEHOLDER_ID = 'comfort-mode-player-placeholder';

function createValidVideo(parent?: HTMLElement): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
  if (parent) {
    parent.appendChild(video);
  } else {
    document.body.appendChild(video);
  }
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
  document.getElementById(PLAYER_PLACEHOLDER_ID)?.remove();
}

describe('プレースホルダーベースのプレーヤー復元', () => {
  beforeEach(() => {
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
  });

  it('快適モード有効化時にプレースホルダーが挿入される', () => {
    // 動画をコンテナ内に配置
    const container = document.createElement('div');
    container.id = 'video-container';
    document.body.appendChild(container);
    const video = createValidVideo(container);

    hook<() => void>('__enableComfortMode')();

    // プレースホルダーが挿入されている
    const placeholder = document.getElementById(PLAYER_PLACEHOLDER_ID);
    expect(placeholder).not.toBeNull();
    expect(placeholder?.parentElement).toBe(container);

    // 動画はbodyに移動されている
    expect(video.parentElement).toBe(document.body);
  });

  it('快適モード解除時にプレースホルダーを使って元の位置に復元される', () => {
    const container = document.createElement('div');
    container.id = 'video-container';
    document.body.appendChild(container);
    const video = createValidVideo(container);

    hook<() => void>('__enableComfortMode')();
    expect(video.parentElement).toBe(document.body);

    hook<() => void>('__disableComfortModeByUser')();

    // 動画がコンテナに戻っている
    expect(video.parentElement).toBe(container);
    // プレースホルダーは削除されている
    expect(document.getElementById(PLAYER_PLACEHOLDER_ID)).toBeNull();
  });

  it('元の親が削除されてもプレースホルダーの親があれば復元される', () => {
    const outerContainer = document.createElement('div');
    outerContainer.id = 'outer';
    document.body.appendChild(outerContainer);

    const container = document.createElement('div');
    container.id = 'video-container';
    outerContainer.appendChild(container);

    const video = createValidVideo(container);

    hook<() => void>('__enableComfortMode')();

    // プレースホルダーの親（元の親）を新しいコンテナに付け替え
    const placeholder = document.getElementById(PLAYER_PLACEHOLDER_ID);
    expect(placeholder).not.toBeNull();

    // 元の親をDOMから削除（TTFCのSPA遷移等をシミュレート）
    // ただしプレースホルダーは別のコンテナに移動済みとする
    const newContainer = document.createElement('div');
    newContainer.id = 'new-video-container';
    document.body.appendChild(newContainer);

    // プレースホルダーを新しいコンテナに移動
    newContainer.appendChild(placeholder!);
    // 古いコンテナは削除
    container.remove();

    hook<() => void>('__disableComfortModeByUser')();

    // 動画が新しいコンテナに復元されている
    expect(video.parentElement).toBe(newContainer);
    // プレースホルダーは削除されている
    expect(document.getElementById(PLAYER_PLACEHOLDER_ID)).toBeNull();
  });

  it('プレースホルダーも元の親もない場合、動画はbodyに残る', () => {
    const container = document.createElement('div');
    container.id = 'video-container';
    document.body.appendChild(container);
    const video = createValidVideo(container);

    hook<() => void>('__enableComfortMode')();

    // コンテナごと削除（プレースホルダーも消える）
    container.remove();

    hook<() => void>('__disableComfortModeByUser')();

    // 動画はbodyに残っている（消滅はしない）
    expect(document.body.contains(video)).toBe(true);
  });

  it('快適モード未活性時はプレースホルダーが存在しない', () => {
    expect(document.getElementById(PLAYER_PLACEHOLDER_ID)).toBeNull();
  });
});
