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

  it('快適モード解除時に字幕ラッパーは元の兄弟順序の位置に戻る', async () => {
    const { playerContainer } = setupPlayerWithVideo();
    const { relativeAncestor, wrapper } = appendCurrentPlayerCaptions(playerContainer);
    // ラッパーの後ろに兄弟要素を追加しておく
    const sibling = document.createElement('div');
    relativeAncestor.appendChild(sibling);
    expect(wrapper.nextSibling).toBe(sibling);

    hook<() => void>('__enableComfortMode')();

    await vi.waitFor(() => {
      expect(wrapper.parentElement).toBe(document.body);
    });

    hook<() => void>('__disableComfortModeByUser')();

    // 記録された nextSibling の直前に戻り、兄弟順序が復元されている
    expect(wrapper.parentElement).toBe(relativeAncestor);
    expect(wrapper.nextSibling).toBe(sibling);
  });

  it('快適モード解除時に元の親が失われていてもマーカーとexemptクラスが残らない', async () => {
    const { playerContainer } = setupPlayerWithVideo();
    const { relativeAncestor, wrapper } = appendCurrentPlayerCaptions(playerContainer);

    hook<() => void>('__enableComfortMode')();

    await vi.waitFor(() => {
      expect(wrapper.parentElement).toBe(document.body);
    });

    // 元の親がDOMから失われる（プレイヤー側の再構築を模擬）
    relativeAncestor.remove();

    hook<() => void>('__disableComfortModeByUser')();

    // 復元先がないためbodyに残るが、マーカーとexemptクラスは外れている
    expect(wrapper.parentElement).toBe(document.body);
    expect(wrapper.classList.contains('comfort-mode-captions-wrapper')).toBe(false);
    expect(wrapper.classList.contains('comfort-mode-exempt')).toBe(false);
    expect(document.querySelectorAll('.comfort-mode-captions-wrapper').length).toBe(0);

    wrapper.remove();
  });

  it('快適モード中に字幕ラッパーが差し替えられても解除時に全ラッパーが復元されマーカーが残らない', async () => {
    const { playerContainer } = setupPlayerWithVideo();
    const first = appendCurrentPlayerCaptions(playerContainer);

    hook<() => void>('__enableComfortMode')();

    await vi.waitFor(() => {
      expect(first.wrapper.parentElement).toBe(document.body);
    });

    // Prime側の再生成を模擬: 旧字幕テキストは破棄され、新しいラッパーがプレイヤー階層に現れる
    first.text.remove();
    const second = appendCurrentPlayerCaptions(playerContainer);

    // observer が新しいラッパーをbodyへ移動するのを待つ
    await vi.waitFor(() => {
      expect(second.wrapper.parentElement).toBe(document.body);
    });
    expect(second.wrapper.classList.contains('comfort-mode-captions-wrapper')).toBe(true);

    hook<() => void>('__disableComfortModeByUser')();

    // 新旧どちらのラッパーもそれぞれの元の位置に戻り、マーカーが残らない
    expect(second.wrapper.parentElement).toBe(second.relativeAncestor);
    expect(first.wrapper.parentElement).toBe(first.relativeAncestor);
    expect(document.querySelectorAll('.comfort-mode-captions-wrapper').length).toBe(0);
  });

  it('位置決めされた祖先がない字幕は移動されず快適モードも継続する', () => {
    const { playerContainer } = setupPlayerWithVideo();
    // 位置決めされていない祖先だけを持つ字幕構造
    const ancestor = document.createElement('div');
    playerContainer.appendChild(ancestor);
    const p = document.createElement('p');
    ancestor.appendChild(p);
    const text = document.createElement('span');
    text.className = 'atvwebplayersdk-captions-text';
    text.textContent = 'テスト字幕';
    p.appendChild(text);

    hook<() => void>('__enableComfortMode')();

    // ラッパーが特定できないため字幕は元の位置のままで、快適モードは継続している
    expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);
    expect(text.parentElement).toBe(p);
    expect(ancestor.parentElement).toBe(playerContainer);
    expect(document.querySelectorAll('.comfort-mode-captions-wrapper').length).toBe(0);
  });

  it('既にexempt済みのオーバーレイ内側の字幕はラッパーとして引き抜かれない', async () => {
    const { playerContainer } = setupPlayerWithVideo();
    // 従来経路のオーバーレイ（位置決めあり）の中に位置決め要素と字幕テキストを持つ構造
    const overlay = document.createElement('div');
    overlay.className = 'atvwebplayersdk-captions-overlay';
    overlay.style.position = 'absolute';
    playerContainer.appendChild(overlay);
    const inner = document.createElement('div');
    inner.style.position = 'absolute';
    overlay.appendChild(inner);
    const text = document.createElement('span');
    text.className = 'atvwebplayersdk-captions-text';
    text.textContent = 'テスト字幕';
    inner.appendChild(text);

    hook<() => void>('__enableComfortMode')();

    // オーバーレイは従来経路でbodyへ移動されexemptが付く
    await vi.waitFor(() => {
      expect(overlay.parentElement).toBe(document.body);
    });
    expect(overlay.classList.contains('comfort-mode-exempt')).toBe(true);

    // 内側の位置決め要素はラッパーとして引き抜かれず、オーバーレイの中に留まる
    expect(inner.parentElement).toBe(overlay);
    expect(inner.classList.contains('comfort-mode-captions-wrapper')).toBe(false);
  });
});

describe('Prime Video字幕ラッパーの差し替えで残る残存ラッパーの破棄', () => {
  beforeEach(() => {
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
  });

  it('元の親ごと差し替えられた旧ラッパーは破棄され、新ラッパーのみが復元される', async () => {
    const { playerContainer } = setupPlayerWithVideo();
    const first = appendCurrentPlayerCaptions(playerContainer);

    hook<() => void>('__enableComfortMode')();

    await vi.waitFor(() => {
      expect(first.wrapper.parentElement).toBe(document.body);
    });

    // プレイヤー側の再生成を模擬: 旧ラッパーの元の親（祖先ごと）が失われ、
    // 新しいラッパーがプレイヤー階層に現れる（シーク時等の実際の差し替え）
    first.relativeAncestor.remove();
    const second = appendCurrentPlayerCaptions(playerContainer);

    // observer が新しいラッパーをbodyへ移動するのを待つ
    await vi.waitFor(() => {
      expect(second.wrapper.parentElement).toBe(document.body);
    });

    // 旧ラッパーは残存要素として破棄され、body内のラッパーは新ラッパーだけになる
    expect(document.contains(first.wrapper)).toBe(false);
    expect(document.querySelectorAll('.comfort-mode-captions-wrapper').length).toBe(1);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      hook<() => void>('__disableComfortModeByUser')();

      // 新ラッパーは元の位置へ復元され、復元できないという警告は出ない
      expect(second.wrapper.parentElement).toBe(second.relativeAncestor);
      const restoreWarns = warnSpy.mock.calls.filter(
        args => String(args[0]).includes('Cannot restore captions container position'),
      );
      expect(restoreWarns.length).toBe(0);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('解除直前に差し替えられた旧ラッパーは、復元時に警告ではなく取り除かれる', async () => {
    const { playerContainer } = setupPlayerWithVideo();
    const first = appendCurrentPlayerCaptions(playerContainer);

    hook<() => void>('__enableComfortMode')();

    await vi.waitFor(() => {
      expect(first.wrapper.parentElement).toBe(document.body);
    });

    // observer のコールバックが走る前に、同期的に差し替えと解除を行う
    // （移動時の破棄をすり抜けて記録が残った場合の復元側の後始末を検証する）
    first.relativeAncestor.remove();
    appendCurrentPlayerCaptions(playerContainer);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      hook<() => void>('__disableComfortModeByUser')();

      // 旧ラッパーは残存要素として取り除かれ、復元できないという警告は出ない
      expect(document.contains(first.wrapper)).toBe(false);
      const restoreWarns = warnSpy.mock.calls.filter(
        args => String(args[0]).includes('Cannot restore captions container position'),
      );
      expect(restoreWarns.length).toBe(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
