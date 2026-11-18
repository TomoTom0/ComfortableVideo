// @vitest-environment-options { "url": "https://www.amazon.co.jp/gp/video/detail" }
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// このファイルは Prime Video (amazon.co.jp) の URL で実行されるため、
// import 時に Prime Video 用の初期化が実行される
import '../../../src/content';

function hook<T>(name: string): T {
  return (window as any)[name] as T;
}

interface RectSpec { x: number; y: number; width: number; height: number }

// happy-dom では getBoundingClientRect が常に 0 を返すため、
// 配置ベースの検索を検証できるよう要素ごとに矩形を差し替える
function stubRect(el: Element, rect: RectSpec): void {
  const domRect = {
    x: rect.x,
    y: rect.y,
    top: rect.y,
    left: rect.x,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
    width: rect.width,
    height: rect.height,
    toJSON: () => ({}),
  };
  (el as any).getBoundingClientRect = () => domRect;
}

function createPlayerButton(x: number): HTMLButtonElement {
  const btn = document.createElement('button');
  stubRect(btn, { x, y: 19, width: 41, height: 41 });
  return btn;
}

function wrapButton(x: number): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.appendChild(createPlayerButton(x));
  return wrapper;
}

function createValidVideo(parent: HTMLElement): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
  parent.appendChild(video);
  return video;
}

// 現行Prime Videoプレーヤー（React UI）の上部バー構造を模擬する
// プレーヤーコンテナ > 上部バー行 > [左グループ（閉じるボタン）, 右グループ > ボタン行]
function setupCurrentPlayerUI(): { player: HTMLDivElement; rightRow: HTMLDivElement } {
  const player = document.createElement('div');
  player.className = 'atvwebplayersdk-player-container';
  stubRect(player, { x: 0, y: 0, width: 1280, height: 900 });
  document.body.appendChild(player);

  const topBar = document.createElement('div');
  player.appendChild(topBar);
  const row = document.createElement('div');
  topBar.appendChild(row);

  const leftGroup = document.createElement('div');
  leftGroup.appendChild(wrapButton(26));
  row.appendChild(leftGroup);

  const rightGroup = document.createElement('div');
  row.appendChild(rightGroup);
  const rightRow = document.createElement('div');
  rightGroup.appendChild(rightRow);
  rightRow.appendChild(wrapButton(1011));
  rightRow.appendChild(wrapButton(1052));
  rightRow.appendChild(wrapButton(1133));

  createValidVideo(player);

  return { player, rightRow };
}

function cleanup(): void {
  if (hook<() => boolean>('__getIsComfortModeActive')()) {
    hook<() => void>('__disableComfortModeByUser')();
  }
  document.getElementById('comfort-mode-exit-button')?.remove();
  document.getElementById('comfort-mode-custom-controls')?.remove();
  document.getElementById('comfort-mode-overlay')?.remove();
  document.getElementById('comfort-mode-player-placeholder')?.remove();
  document.body.classList.remove('comfort-mode-active', 'video-area-hovered', 'video-controls-enabled');
  document.documentElement.classList.remove('comfort-mode-scroll-lock');
  document.querySelectorAll('.atvwebplayersdk-player-container').forEach(el => el.remove());
  document.querySelectorAll('.atvwebplayersdk-hideabletopbuttons-container').forEach(el => el.remove());
  document.querySelectorAll('.comfort-mode-button').forEach(el => el.remove());
  document.querySelectorAll('video').forEach(el => el.remove());
}

describe('Prime Video上部ボタン行へのコントロールボタン挿入', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('現行UIの構造から右側ボタン行を特定できる', () => {
    const { rightRow } = setupCurrentPlayerUI();

    const found = hook<() => Element | null>('__findPrimeTopButtonsContainer')();
    expect(found).toBe(rightRow);
  });

  it('現行UIでは右側ボタン行の先頭にボタンが挿入される', () => {
    const { rightRow } = setupCurrentPlayerUI();

    hook<() => void>('__addPrimeControlButton')();

    const inserted = rightRow.querySelector('.comfort-mode-button.prime-control');
    expect(inserted).not.toBeNull();
    expect(rightRow.firstElementChild).toBe(inserted);
  });

  it('挿入されたボタンのクリックで快適モードがトグルする', () => {
    const { rightRow } = setupCurrentPlayerUI();
    hook<() => void>('__addPrimeControlButton')();
    const inserted = rightRow.querySelector<HTMLElement>('.comfort-mode-button.prime-control');
    expect(inserted).not.toBeNull();

    inserted!.click();
    expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(true);
    expect(inserted!.classList.contains('active')).toBe(true);

    inserted!.click();
    expect(hook<() => boolean>('__getIsComfortModeActive')()).toBe(false);
  });

  it('ボタンが再描画で削除されても再挿入できる', async () => {
    const { rightRow } = setupCurrentPlayerUI();
    hook<() => void>('__addPrimeControlButton')();
    const inserted = rightRow.querySelector('.comfort-mode-button.prime-control');
    expect(inserted).not.toBeNull();

    // Amazon側の再レンダリングでボタンが消えた状態を模擬
    inserted!.remove();

    hook<() => void>('__addPrimeControlButton')();
    await vi.waitFor(() => {
      expect(rightRow.querySelector('.comfort-mode-button.prime-control')).not.toBeNull();
    });
  });

  it('従来のコンテナがある場合はそちらへ挿入される', () => {
    const legacy = document.createElement('div');
    legacy.className = 'atvwebplayersdk-hideabletopbuttons-container';
    document.body.appendChild(legacy);

    const found = hook<() => Element | null>('__findPrimeTopButtonsContainer')();
    expect(found).toBe(legacy);

    hook<() => void>('__addPrimeControlButton')();
    expect(legacy.querySelector('.comfort-mode-button.prime-control')).not.toBeNull();
  });

  it('プレーヤーが無い場合は何も挿入されない', () => {
    const found = hook<() => Element | null>('__findPrimeTopButtonsContainer')();
    expect(found).toBeNull();

    hook<() => void>('__addPrimeControlButton')();
    expect(document.querySelector('.comfort-mode-button.prime-control')).toBeNull();
  });
});
