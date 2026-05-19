import { describe, it, expect } from 'vitest';
import { isYouTube, isTTFC, isTTFCMovieStories, isPrimeVideo } from '../../../src/utils/site-detection';

function setLocation(url: string): void {
  window.location.href = url;
}

describe('isYouTube', () => {
  it('www.youtube.com を検出する', () => {
    setLocation('https://www.youtube.com/watch?v=abc');
    expect(isYouTube()).toBe(true);
  });

  it('youtube.com を検出する', () => {
    setLocation('https://youtube.com/');
    expect(isYouTube()).toBe(true);
  });

  it('他サイトは false', () => {
    setLocation('https://example.com/');
    expect(isYouTube()).toBe(false);
  });
});

describe('isTTFC', () => {
  it('pc.tokusatsu-fc.jp を検出する', () => {
    setLocation('https://pc.tokusatsu-fc.jp/contents?');
    expect(isTTFC()).toBe(true);
  });

  it('他サイトは false', () => {
    setLocation('https://example.com/');
    expect(isTTFC()).toBe(false);
  });
});

describe('isTTFCMovieStories', () => {
  it('/movie-stories/ を含むパスを検出する', () => {
    setLocation('https://pc.tokusatsu-fc.jp/movies/6288/movie-stories/6290');
    expect(isTTFCMovieStories()).toBe(true);
  });

  it('クエリパラメータ付きでも検出する', () => {
    setLocation('https://pc.tokusatsu-fc.jp/movies/6288/movie-stories/6293?continuity=1');
    expect(isTTFCMovieStories()).toBe(true);
  });

  it('TTFC だが /movie-stories/ なしは false', () => {
    setLocation('https://pc.tokusatsu-fc.jp/contents?');
    expect(isTTFCMovieStories()).toBe(false);
  });

  it('TTFC 以外のドメインは false', () => {
    setLocation('https://example.com/movies/1/movie-stories/2');
    expect(isTTFCMovieStories()).toBe(false);
  });
});

describe('isPrimeVideo', () => {
  it('amazon.co.jp を検出する', () => {
    setLocation('https://www.amazon.co.jp/gp/video/detail/xxx');
    expect(isPrimeVideo()).toBe(true);
  });

  it('primevideo.com を検出する', () => {
    setLocation('https://www.primevideo.com/');
    expect(isPrimeVideo()).toBe(true);
  });

  it('他サイトは false', () => {
    setLocation('https://example.com/');
    expect(isPrimeVideo()).toBe(false);
  });
});
