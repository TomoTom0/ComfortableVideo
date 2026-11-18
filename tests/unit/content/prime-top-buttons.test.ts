// @vitest-environment-options { "url": "https://www.amazon.co.jp/gp/video/detail" }
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// このファイルは Prime Video (amazon.co.jp) の URL で実行されるため、
// import 時に Prime Video 用の初期化が実行される
import '../../../src/content';

declare global {
  interface Window {
    __getIsComfortModeActive?: () => boolean;
    __disableComfortModeByUser?: () => void;
    __addPrimeControlButton?: () => void;
    __findPrimeTopButtonsContainer?: () => Element | null;
  }
}

function isComfortModeActive(): boolean {
  return window.__getIsComfortModeActive?.() ?? false;
}

function disableComfortModeByUser(): void {
  window.__disableComfortModeByUser?.();
}

function addPrimeControlButton(): void {
  window.__addPrimeControlButton?.();
}

function findPrimeTopButtonsContainer(): Element | null {
  return window.__findPrimeTopButtonsContainer?.() ?? null;
}

interface RectSpec { x: number; y: number; width: number; height: number }

// happy-dom では getBoundingClientRect が常に 0 を返すため、
// 配置ベースの検索を検証できるよう要素ごとに矩形を差し替える
function stubRect(el: Element, rect: RectSpec): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(rect.x, rect.y, rect.width, rect.height),
  );
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

interface CurrentPlayerUIOptions {
  playerWidth?: number;
  includeCloseButton?: boolean;
  rightButtonXs?: number[];
}

// 現行Prime Videoプレーヤー（React UI）の上部バー構造を模擬する
// プレーヤーコンテナ > 上部バー行 > [左グループ（閉じるボタン）, 右グループ > ボタン行]
function setupCurrentPlayerUI(options: CurrentPlayerUIOptions = {}): {
  player: HTMLDivElement;
  rightRow: HTMLDivElement;
  rightButtonWrappers: HTMLDivElement[];
} {
  const player = document.createElement('div');
  player.className = 'atvwebplayersdk-player-container';
  stubRect(player, { x: 0, y: 0, width: options.playerWidth ?? 1280, height: 900 });
  document.body.appendChild(player);

  const topBar = document.createElement('div');
  player.appendChild(topBar);
  const row = document.createElement('div');
  topBar.appendChild(row);

  if (options.includeCloseButton ?? true) {
    const leftGroup = document.createElement('div');
    leftGroup.appendChild(wrapButton(26));
    row.appendChild(leftGroup);
  }

  const rightGroup = document.createElement('div');
  row.appendChild(rightGroup);
  const rightRow = document.createElement('div');
  rightGroup.appendChild(rightRow);
  const rightButtonWrappers = (options.rightButtonXs ?? [1011, 1052, 1133]).map((x) => {
    const wrapper = wrapButton(x);
    rightRow.appendChild(wrapper);
    return wrapper;
  });

  createValidVideo(player);

  return { player, rightRow, rightButtonWrappers };
}

function cleanup(): void {
  if (isComfortModeActive()) {
    disableComfortModeByUser();
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

    const found = findPrimeTopButtonsContainer();
    expect(found).toBe(rightRow);
  });

  it('現行UIでは右側ボタン行の先頭にボタンが挿入される', () => {
    const { rightRow } = setupCurrentPlayerUI();

    addPrimeControlButton();

    const inserted = rightRow.querySelector('.comfort-mode-button.prime-control');
    expect(inserted).not.toBeNull();
    expect(rightRow.firstElementChild).toBe(inserted);
  });

  it('挿入されたボタンのクリックで快適モードがトグルする', () => {
    const { rightRow } = setupCurrentPlayerUI();
    addPrimeControlButton();
    const inserted = rightRow.querySelector<HTMLElement>('.comfort-mode-button.prime-control');
    expect(inserted).not.toBeNull();

    inserted!.click();
    expect(isComfortModeActive()).toBe(true);
    expect(inserted!.classList.contains('active')).toBe(true);

    inserted!.click();
    expect(isComfortModeActive()).toBe(false);
  });

  it('ボタンが再描画で削除されても再挿入できる', async () => {
    const { rightRow } = setupCurrentPlayerUI();
    addPrimeControlButton();
    const inserted = rightRow.querySelector('.comfort-mode-button.prime-control');
    expect(inserted).not.toBeNull();

    // Amazon側の再レンダリングでボタンが消えた状態を模擬
    inserted!.remove();

    addPrimeControlButton();
    await vi.waitFor(() => {
      expect(rightRow.querySelector('.comfort-mode-button.prime-control')).not.toBeNull();
    });
  });

  it('従来のコンテナがある場合はそちらへ挿入される', () => {
    const legacy = document.createElement('div');
    legacy.className = 'atvwebplayersdk-hideabletopbuttons-container';
    document.body.appendChild(legacy);

    const found = findPrimeTopButtonsContainer();
    expect(found).toBe(legacy);

    addPrimeControlButton();
    expect(legacy.querySelector('.comfort-mode-button.prime-control')).not.toBeNull();
  });

  it('プレーヤーが無い場合は何も挿入されない', () => {
    const found = findPrimeTopButtonsContainer();
    expect(found).toBeNull();

    addPrimeControlButton();
    expect(document.querySelector('.comfort-mode-button.prime-control')).toBeNull();
  });

  it('狭いプレーヤーで右側クラスタが水平中央を跨いでもボタン行を特定できる', () => {
    const { rightRow } = setupCurrentPlayerUI({
      playerWidth: 480,
      rightButtonXs: [197, 243, 289, 335, 381, 427],
    });

    const found = findPrimeTopButtonsContainer();
    expect(found).toBe(rightRow);

    addPrimeControlButton();
    expect(rightRow.querySelector('.comfort-mode-button.prime-control')).not.toBeNull();
    expect(rightRow.firstElementChild).toBe(
      rightRow.querySelector('.comfort-mode-button.prime-control'),
    );
  });

  it('右側ボタンが1つだけでもそのボタンのラッパーへ挿入される', () => {
    const { rightButtonWrappers } = setupCurrentPlayerUI({ rightButtonXs: [1011] });

    const found = findPrimeTopButtonsContainer();
    expect(found).toBe(rightButtonWrappers[0]);

    addPrimeControlButton();
    expect(rightButtonWrappers[0].querySelector('.comfort-mode-button.prime-control')).not.toBeNull();
    expect(rightButtonWrappers[0].firstElementChild).toBe(
      rightButtonWrappers[0].querySelector('.comfort-mode-button.prime-control'),
    );
  });

  it('左側ボタンが無くても右側ボタン行を特定できる', () => {
    const { rightRow } = setupCurrentPlayerUI({ includeCloseButton: false });

    const found = findPrimeTopButtonsContainer();
    expect(found).toBe(rightRow);
  });

  it('複数のプレーヤーがある場合は表示可能な後続プレーヤーも特定できる', () => {
    setupCurrentPlayerUI({ playerWidth: 0 });
    const { rightRow } = setupCurrentPlayerUI();

    const found = findPrimeTopButtonsContainer();
    expect(found).toBe(rightRow);
  });
});
