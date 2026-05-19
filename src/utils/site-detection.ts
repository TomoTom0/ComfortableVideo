export function isYouTube(): boolean {
  return window.location.hostname === 'www.youtube.com' || window.location.hostname === 'youtube.com';
}

export function isTTFC(): boolean {
  return window.location.hostname === 'pc.tokusatsu-fc.jp';
}

export function isTTFCMovieStories(): boolean {
  return isTTFC() && window.location.pathname.includes('/movie-stories/');
}

export function isPrimeVideo(): boolean {
  return window.location.hostname.includes('amazon.') ||
         window.location.hostname.includes('primevideo.');
}
