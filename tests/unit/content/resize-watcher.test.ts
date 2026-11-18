/**
 * @vitest-environment-options { "url": "https://www.youtube.com/watch?v=resize-watcher-test" }
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// content.ts をインポート（Chrome mock は tests/setup.ts で設定済み）
// d-4: YouTube で快適モード中にウィンドウをリサイズすると、再最大化の
// 再実行と動画監視（watcher）の競合で自動解除されていた問題の回帰テスト
import '../../../src/content';

const PLAYER_PLACEHOLDER_ID = 'comfort-mode-player-placeholder';

function hook<T>(name: string): T {
  return (window as any)[name] as T;
}

function isActive(): boolean {
  return hook<() => boolean>('__getIsComfortModeActive')();
}

function placeholderCount(): number {
  return Array.from(document.querySelectorAll('div')).filter(d => d.id === PLAYER_PLACEHOLDER_ID).length;
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
  document.getElementById('movie_player')?.remove();
  document.getElementById('ytd-player')?.remove();
}

// YouTube 型の構造（ページ側コンテナ > #movie_player > video）を模擬する
function createYouTubePlayer() {
  const wrapper = document.createElement('div');
  wrapper.id = 'ytd-player';

  const player = document.createElement('div');
  player.id = 'movie_player';

  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });

  player.appendChild(video);
  wrapper.appendChild(player);
  document.body.appendChild(wrapper);
  return { wrapper, player, video };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('YouTube: リサイズと動画監視による自動解除 (d-4)', () => {
  beforeEach(() => {
    cleanupComfortMode();
  });

  afterEach(() => {
    cleanupComfortMode();
  });

  it('快適モード中のリサイズで自動解除されず、解除時の復元も正常に行われる', () => {
    const { wrapper, player } = createYouTubePlayer();
    hook<() => void>('__enableComfortMode')();
    expect(isActive()).toBe(true);
    expect(player.parentElement).toBe(document.body);
    expect(placeholderCount()).toBe(1);

    window.dispatchEvent(new Event('resize'));

    // 再最大化の再実行でプレーヤーが付け替えられても解除されない
    expect(isActive()).toBe(true);
    expect(player.parentElement).toBe(document.body);
    expect(placeholderCount()).toBe(1);

    // 解除すると元の位置へ復元される（復元情報が壊れていない）
    hook<() => void>('__disableComfortModeByUser')();
    expect(isActive()).toBe(false);
    expect(player.parentElement).toBe(wrapper);
    expect(placeholderCount()).toBe(0);
  });

  it('同一バッチ内でプレーヤーが付け替えられた場合は削除とみなさない', async () => {
    const { player } = createYouTubePlayer();
    hook<() => void>('__enableComfortMode')();
    expect(isActive()).toBe(true);

    // 別コンテナへ移して即座に body へ戻す（再最大化時の再追加と同じ移動パターン）
    const temp = document.createElement('div');
    document.body.appendChild(temp);
    temp.appendChild(player);
    document.body.appendChild(player);
    temp.remove();

    // MutationObserver のコールバックが処理されるまで待つ
    await sleep(80);
    expect(isActive()).toBe(true);
    expect(player.parentElement).toBe(document.body);
  });

  it('プレーヤーが本当に削除された場合は従来どおり自動解除される', async () => {
    const { player } = createYouTubePlayer();
    hook<() => void>('__enableComfortMode')();
    expect(isActive()).toBe(true);

    player.remove();

    await vi.waitFor(() => {
      expect(isActive()).toBe(false);
    });
  });
});
