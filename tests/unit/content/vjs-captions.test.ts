import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// happy-dom のデフォルト URL (about:blank) では YouTube/TTFC/Prime Video 判定は false のため
// 汎用経路（動画要素だけが body へ移動する経路）で動作する
import '../../../src/content';

const PLAYER_PLACEHOLDER_ID = 'comfort-mode-player-placeholder';

function createValidVideo(parent: HTMLElement): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
  parent.appendChild(video);
  return video;
}

// content.ts が window に公開するテストフック（as キャスト不使用で取得する型ガード）
function isVoidHook(value: unknown): value is () => void {
  return typeof value === 'function';
}

function isBooleanHook(value: unknown): value is () => boolean {
  return typeof value === 'function';
}

function getVoidHook(hookName: string): () => void {
  const value: unknown = Reflect.get(window, hookName);
  if (!isVoidHook(value)) {
    throw new Error(`テストフック ${hookName} が window に登録されていません`);
  }
  return value;
}

function getBooleanHook(hookName: string): () => boolean {
  const value: unknown = Reflect.get(window, hookName);
  if (!isBooleanHook(value)) {
    throw new Error(`テストフック ${hookName} が window に登録されていません`);
  }
  return value;
}

function enableComfortMode(): void {
  getVoidHook('__enableComfortMode')();
}

function disableComfortModeByUser(): void {
  getVoidHook('__disableComfortModeByUser')();
}

function isComfortModeActive(): boolean {
  return getBooleanHook('__getIsComfortModeActive')();
}

function cleanupComfortMode(): void {
  if (isComfortModeActive()) {
    disableComfortModeByUser();
  }
  document.getElementById('comfort-mode-exit-button')?.remove();
  document.getElementById('comfort-mode-custom-controls')?.remove();
  document.getElementById('comfort-mode-overlay')?.remove();
  document.body.classList.remove('comfort-mode-active', 'video-area-hovered', 'video-controls-enabled');
  document.documentElement.classList.remove('comfort-mode-scroll-lock');
  document.querySelectorAll('video').forEach(v => v.remove());
  document.getElementById(PLAYER_PLACEHOLDER_ID)?.remove();
  document.querySelectorAll('.video-js').forEach(c => c.remove());
  document.querySelectorAll('.vjs-text-track-display').forEach(c => c.remove());
}

// Video.js プレイヤー（TVer等）の構造を模擬:
// .video-js コンテナの中に video と .vjs-text-track-display（字幕表示要素）を配置する
function setupVideoJsPlayer(): {
  playerContainer: HTMLDivElement;
  video: HTMLVideoElement;
  trackDisplay: HTMLDivElement;
} {
  const playerContainer = document.createElement('div');
  playerContainer.className = 'video-js';
  document.body.appendChild(playerContainer);

  const video = createValidVideo(playerContainer);

  const trackDisplay = document.createElement('div');
  trackDisplay.className = 'vjs-text-track-display';
  playerContainer.appendChild(trackDisplay);

  return { playerContainer, video, trackDisplay };
}

describe('Video.js字幕表示要素の快適モードでの退避と復元', () => {
  beforeEach(() => {
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
  });

  it('快適モード有効化時にvjs字幕表示要素はbodyへ移動されexemptクラスとマーカーが付与される', () => {
    const { video, trackDisplay } = setupVideoJsPlayer();

    enableComfortMode();
    expect(isComfortModeActive()).toBe(true);

    // 汎用経路: 動画要素が body へ移動する
    expect(video.parentElement).toBe(document.body);

    // プレイヤーコンテナ内の .vjs-text-track-display も body へ移動され、
    // z-index制限の免除クラスと Video.js 字幕マーカーが付与される
    expect(trackDisplay.parentElement).toBe(document.body);
    expect(trackDisplay.classList.contains('comfort-mode-exempt')).toBe(true);
    expect(trackDisplay.classList.contains('comfort-mode-vjs-captions')).toBe(true);
  });

  it('快適モード解除時にvjs字幕表示要素は元のプレイヤーコンテナへ復元されマーカーとexemptクラスが外れる', () => {
    const { playerContainer, trackDisplay } = setupVideoJsPlayer();

    enableComfortMode();
    expect(trackDisplay.parentElement).toBe(document.body);

    disableComfortModeByUser();

    // 元のプレイヤーコンテナに復元されている
    expect(trackDisplay.parentElement).toBe(playerContainer);
    // Video.js 字幕マーカーは復元時に外れている
    expect(trackDisplay.classList.contains('comfort-mode-vjs-captions')).toBe(false);
    // exemptクラスは全要素から削除される（removeZIndexControl）
    expect(trackDisplay.classList.contains('comfort-mode-exempt')).toBe(false);
  });

  it('快適モード解除時にvjs字幕表示要素は元の兄弟順序の位置へ復元される', () => {
    const { playerContainer, trackDisplay } = setupVideoJsPlayer();
    // 字幕表示要素の後ろに兄弟要素を追加しておく
    const sibling = document.createElement('div');
    playerContainer.appendChild(sibling);
    expect(trackDisplay.nextSibling).toBe(sibling);

    enableComfortMode();
    expect(trackDisplay.parentElement).toBe(document.body);

    disableComfortModeByUser();

    // 記録された nextSibling の直前に戻り、兄弟順序が復元されている
    expect(trackDisplay.parentElement).toBe(playerContainer);
    expect(trackDisplay.nextSibling).toBe(sibling);
  });

  it('プレイヤーが2つある場合も各vjs字幕表示要素はそれぞれの元の親へ復元される', () => {
    const first = setupVideoJsPlayer();
    const second = setupVideoJsPlayer();

    enableComfortMode();
    expect(isComfortModeActive()).toBe(true);

    // 両プレイヤーの字幕表示要素が body へ移動される
    expect(first.trackDisplay.parentElement).toBe(document.body);
    expect(second.trackDisplay.parentElement).toBe(document.body);

    disableComfortModeByUser();

    // それぞれ自分のプレイヤーコンテナへ復元される（要素ごとの記録）
    expect(first.trackDisplay.parentElement).toBe(first.playerContainer);
    expect(second.trackDisplay.parentElement).toBe(second.playerContainer);
    expect(document.querySelectorAll('.comfort-mode-vjs-captions').length).toBe(0);
  });

  it('最大化対象外のプレイヤー（寸法ゼロでスキップされる動画）の字幕表示要素は移動されない', () => {
    const active = setupVideoJsPlayer();
    // 寸法ゼロの動画を持つプレイヤー: enableComfortMode でスキップされる
    const skippedContainer = document.createElement('div');
    skippedContainer.className = 'video-js';
    document.body.appendChild(skippedContainer);
    const skippedVideo = document.createElement('video');
    skippedContainer.appendChild(skippedVideo);
    const skippedDisplay = document.createElement('div');
    skippedDisplay.className = 'vjs-text-track-display';
    skippedContainer.appendChild(skippedDisplay);

    enableComfortMode();
    expect(isComfortModeActive()).toBe(true);

    // 対象プレイヤーの字幕表示要素は body へ移動される
    expect(active.trackDisplay.parentElement).toBe(document.body);
    // 対象外プレイヤーの動画はスキップされ、字幕表示要素も元のコンテナに留まる
    // （無関係なプレイヤーの字幕を最大化した動画の上に表示しないため）
    expect(skippedVideo.parentElement).toBe(skippedContainer);
    expect(skippedDisplay.parentElement).toBe(skippedContainer);
    expect(skippedDisplay.classList.contains('comfort-mode-vjs-captions')).toBe(false);
    expect(skippedDisplay.classList.contains('comfort-mode-exempt')).toBe(false);

    disableComfortModeByUser();

    expect(active.trackDisplay.parentElement).toBe(active.playerContainer);
    expect(skippedDisplay.parentElement).toBe(skippedContainer);
    expect(document.querySelectorAll('.comfort-mode-vjs-captions').length).toBe(0);
  });

  it('vjs字幕表示要素が存在しないページでも快適モードの有効化・解除がエラーなく動作する', () => {
    // .vjs-text-track-display を持たないプレイヤーコンテナ
    const playerContainer = document.createElement('div');
    playerContainer.className = 'video-js';
    document.body.appendChild(playerContainer);
    const video = createValidVideo(playerContainer);

    enableComfortMode();
    expect(isComfortModeActive()).toBe(true);
    expect(video.parentElement).toBe(document.body);

    disableComfortModeByUser();

    expect(isComfortModeActive()).toBe(false);
    // 動画は元のコンテナに復元されている
    expect(video.parentElement).toBe(playerContainer);
    expect(document.querySelectorAll('.comfort-mode-vjs-captions').length).toBe(0);
  });
});
