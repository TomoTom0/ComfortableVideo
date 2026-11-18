// @vitest-environment-options { "url": "https://www.amazon.co.jp/gp/video/detail" }
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// このファイルのみ Prime Video (amazon.co.jp) の URL で実行するため、
// import 時に Prime Video 用の初期化が実行される
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
  document.body.classList.remove('comfort-mode-active', 'video-area-hovered', 'video-controls-enabled');
  document.documentElement.classList.remove('comfort-mode-scroll-lock');
  document.querySelectorAll('video').forEach(v => v.remove());
  document.getElementById(PLAYER_PLACEHOLDER_ID)?.remove();
  document.querySelectorAll('.webPlayerContainer').forEach(c => c.remove());
  document.querySelectorAll('.atvwebplayersdk-captions-overlay').forEach(c => c.remove());
  document.querySelectorAll('.comfort-mode-captions-wrapper').forEach(c => c.remove());
}

function setupPlayerWithVideo(): { playerContainer: HTMLDivElement; video: HTMLVideoElement } {
  const playerContainer = document.createElement('div');
  playerContainer.className = 'webPlayerContainer';
  document.body.appendChild(playerContainer);
  const video = createValidVideo(playerContainer);
  return { playerContainer, video };
}

function appendCaptionsOverlay(playerContainer: HTMLElement): HTMLDivElement {
  const captionsOverlay = document.createElement('div');
  captionsOverlay.className = 'atvwebplayersdk-captions-overlay';
  playerContainer.appendChild(captionsOverlay);
  return captionsOverlay;
}

describe('Prime Video字幕オーバーレイのcomfort-mode-exempt付与', () => {
  beforeEach(() => {
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
  });

  it('このテストファイルはPrime VideoのURLで実行される', () => {
    expect(window.location.hostname).toContain('amazon.');
  });

  it('快適モード中に動的に追加された字幕オーバーレイはbodyへ移動されexemptクラスが付与される', async () => {
    const { playerContainer, video } = setupPlayerWithVideo();

    hook<() => void>('__enableComfortMode')();
    expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);
    expect(video.parentElement).toBe(document.body);

    // 快適モード有効化後に字幕オーバーレイが動的に追加される（Prime側の再レンダリングを模擬）
    const captionsOverlay = appendCaptionsOverlay(playerContainer);

    // MutationObserver (startPrimeCaptionsObserver) が body へ移動するのを待つ
    await vi.waitFor(() => {
      expect(captionsOverlay.parentElement).toBe(document.body);
    });

    // z-index制限の免除クラスが付与されている（moveCaptionsToBody の回帰防止）
    expect(captionsOverlay.classList.contains('comfort-mode-exempt')).toBe(true);
  });

  it('快適モード解除時に字幕オーバーレイのexemptクラスは削除され元の位置に戻る', async () => {
    const { playerContainer } = setupPlayerWithVideo();

    hook<() => void>('__enableComfortMode')();

    const captionsOverlay = appendCaptionsOverlay(playerContainer);

    await vi.waitFor(() => {
      expect(captionsOverlay.parentElement).toBe(document.body);
    });
    expect(captionsOverlay.classList.contains('comfort-mode-exempt')).toBe(true);

    hook<() => void>('__disableComfortModeByUser')();

    // exemptクラスは全要素から削除される（removeZIndexControl）
    expect(captionsOverlay.classList.contains('comfort-mode-exempt')).toBe(false);
    // 元のプレイヤーコンテナに復元されている
    expect(captionsOverlay.parentElement).toBe(playerContainer);
  });
});

// 現行プレイヤーの字幕構造を模擬する
// 相対配置の祖先 > 絶対配置ラッパー > p > span > 字幕テキストspan
function appendCurrentPlayerCaptions(playerContainer: HTMLElement): {
  relativeAncestor: HTMLDivElement;
  wrapper: HTMLDivElement;
  text: HTMLSpanElement;
} {
  const relativeAncestor = document.createElement('div');
  relativeAncestor.style.position = 'relative';
  playerContainer.appendChild(relativeAncestor);

  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  relativeAncestor.appendChild(wrapper);

  const p = document.createElement('p');
  wrapper.appendChild(p);
  const outerSpan = document.createElement('span');
  p.appendChild(outerSpan);
  const text = document.createElement('span');
  text.className = 'atvwebplayersdk-captions-text';
  text.textContent = 'テスト字幕';
  outerSpan.appendChild(text);
  return { relativeAncestor, wrapper, text };
}

describe('Prime Video現行プレイヤーの字幕ラッパーのcomfort-mode-exempt付与', () => {
  beforeEach(() => {
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
  });

  it('快適モード有効化時に既存の字幕ラッパーはbodyへ移動されexemptクラスとマーカーが付与される', () => {
    const { playerContainer } = setupPlayerWithVideo();
    const { wrapper } = appendCurrentPlayerCaptions(playerContainer);

    hook<() => void>('__enableComfortMode')();
    expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

    // maximizeVideo の字幕移動でbodyの子要素になっている
    expect(wrapper.parentElement).toBe(document.body);
    expect(wrapper.classList.contains('comfort-mode-exempt')).toBe(true);
    expect(wrapper.classList.contains('comfort-mode-captions-wrapper')).toBe(true);
  });

  it('快適モード中に動的に追加された字幕ラッパーはbodyへ移動される', async () => {
    const { playerContainer } = setupPlayerWithVideo();

    hook<() => void>('__enableComfortMode')();
    expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);

    // 快適モード有効化後に字幕が動的に追加される（現行プレイヤーの描画を模擬）
    const { wrapper } = appendCurrentPlayerCaptions(playerContainer);

    // MutationObserver (startPrimeCaptionsObserver) が body へ移動するのを待つ
    await vi.waitFor(() => {
      expect(wrapper.parentElement).toBe(document.body);
    });
    expect(wrapper.classList.contains('comfort-mode-exempt')).toBe(true);
    expect(wrapper.classList.contains('comfort-mode-captions-wrapper')).toBe(true);
  });

  it('快適モード解除時に字幕ラッパーは元の位置に戻りマーカーとexemptクラスが外れる', async () => {
    const { playerContainer } = setupPlayerWithVideo();
    const { relativeAncestor, wrapper } = appendCurrentPlayerCaptions(playerContainer);

    hook<() => void>('__enableComfortMode')();

    await vi.waitFor(() => {
      expect(wrapper.parentElement).toBe(document.body);
    });

    hook<() => void>('__disableComfortModeByUser')();

    // 元の相対配置の祖先に復元されている
    expect(wrapper.parentElement).toBe(relativeAncestor);
    expect(wrapper.classList.contains('comfort-mode-captions-wrapper')).toBe(false);
    expect(wrapper.classList.contains('comfort-mode-exempt')).toBe(false);
  });
});
