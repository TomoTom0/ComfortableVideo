// 快適モードの状態管理
let isComfortModeActive = false;
let currentActiveVideo: HTMLVideoElement | null = null; // 現在快適モードで使用中の動画要素
let originalVideoStyles: Map<HTMLVideoElement | HTMLElement, {
  inlineStyle: string | null;
  position: string;
  top: string;
  left: string;
  width: string;
  height: string;
  zIndex: string;
  transform: string;
}> = new Map();

// 動画要素監視用のMutationObserver
let videoWatcher: MutationObserver | null = null;

// 解除ボタンの要素
let exitButton: HTMLElement | null = null;

// 独自のコントロールUI要素
let customControls: HTMLElement | null = null;
let controlsAutoHideTimer: ReturnType<typeof setTimeout> | null = null;

// YouTube用コントロールボタンの要素
let youtubeControlButton: HTMLElement | null = null;

// Amazon Prime Video用コントロールボタンの要素
let primeControlButton: HTMLElement | null = null;

// YouTube親要素の元のz-indexを保存するMap（nullは元々inline styleがなかったことを示す）
let originalParentZIndex: Map<HTMLElement, string | null> = new Map();

// z-index制御用のスタイル要素
let zIndexStyle: HTMLStyleElement | null = null;

// カーソル検出用の変数
let cursorTimer: ReturnType<typeof setTimeout> | null = null;
let controlsDisableTimer: ReturnType<typeof setTimeout> | null = null;
let isVideoControlsEnabled = false;
let lastIsInVideoArea = false; // 前回の動画エリア状態を記録
const HOVER_DETECTION_TIME = 2000; // 2秒間カーソルが下部にあると検出
const CONTROLS_DISABLE_TIME = 3000; // 3秒間動画から離れるとコントロール無効化

// YouTube用の機能
function isYouTube(): boolean {
  return window.location.hostname === 'www.youtube.com' || window.location.hostname === 'youtube.com';
}

// Amazon Prime Video用の機能
function isPrimeVideo(): boolean {
  return window.location.hostname === 'www.amazon.com' || window.location.hostname === 'amazon.com' ||
         window.location.hostname === 'www.primevideo.com' || window.location.hostname === 'primevideo.com';
}

// YouTubeボタンの状態を更新
function updateYouTubeButtonState(): void {
  if (!youtubeControlButton) return;

  if (isComfortModeActive) {
    youtubeControlButton.style.background = 'rgba(255, 255, 255, 0.2) !important';
    youtubeControlButton.style.opacity = '1 !important';
    youtubeControlButton.title = chrome.i18n.getMessage('comfortModeTooltipOn');
  } else {
    youtubeControlButton.style.background = 'transparent !important';
    youtubeControlButton.style.opacity = '0.8 !important';
    youtubeControlButton.title = chrome.i18n.getMessage('comfortModeTooltip');
  }
}

// YouTubeコントロールボタンを追加
function addYouTubeControlButton(): void {
  if (!isYouTube() || youtubeControlButton) return;

  const rightControls = document.querySelector('.ytp-right-controls');
  if (!rightControls) return;

  // ボタンを作成
  youtubeControlButton = document.createElement('button');
  youtubeControlButton.className = 'ytp-button comfort-mode-button';
  youtubeControlButton.title = chrome.i18n.getMessage('comfortModeTooltip');
  youtubeControlButton.innerHTML = `
    <svg width="36" height="36" viewBox="0 0 128 128" fill="white">
      <rect x="40" y="50" width="48" height="40" rx="8" fill="white"/>
      <rect x="52" y="35" width="6" height="20" rx="3" fill="white"/>
      <rect x="70" y="35" width="6" height="20" rx="3" fill="white"/>
      <path d="M64 65 C58 65 54 69 54 74 C54 79 58 83 64 83" stroke="#2d5aa0" stroke-width="4" fill="none" stroke-linecap="round"/>
      <line x1="64" y1="25" x2="64" y2="35" stroke="white" stroke-width="3"/>
    </svg>
  `;

  youtubeControlButton.style.cssText = `
    background: transparent !important;
    border: none !important;
    cursor: pointer !important;
    padding: 0 !important;
    margin: 0 !important;
    opacity: 0.8 !important;
    transition: all 0.2s ease !important;
    width: auto !important;
    height: auto !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  `;

  // ホバー効果
  youtubeControlButton.addEventListener('mouseenter', () => {
    if (youtubeControlButton && !isComfortModeActive) {
      youtubeControlButton.style.opacity = '1';
    }
  });

  youtubeControlButton.addEventListener('mouseleave', () => {
    if (youtubeControlButton && !isComfortModeActive) {
      youtubeControlButton.style.opacity = '0.8';
    }
  });

  // クリックイベント
  youtubeControlButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isComfortModeActive) {
      disableComfortMode();
    } else {
      enableComfortMode();
    }
  });

  // 先頭に挿入
  rightControls.insertBefore(youtubeControlButton, rightControls.firstChild);

  // 初期状態を設定
  updateYouTubeButtonState();
}

// Prime Videoボタンの状態を更新
function updatePrimeButtonState(): void {
  if (!primeControlButton) return;

  if (isComfortModeActive) {
    primeControlButton.style.background = 'rgba(255, 255, 255, 0.2) !important';
    primeControlButton.style.opacity = '1 !important';
    primeControlButton.title = chrome.i18n.getMessage('comfortModeTooltipOn');
  } else {
    primeControlButton.style.background = 'transparent !important';
    primeControlButton.style.opacity = '0.8 !important';
    primeControlButton.title = chrome.i18n.getMessage('comfortModeTooltip');
  }
}

// Prime Videoコントロールボタンを追加
function addPrimeControlButton(): void {
  if (!isPrimeVideo() || primeControlButton) return;

  const topButtons = document.querySelector('div.atvwebplayersdk-hideabletopbuttons-container');
  if (!topButtons) return;

  // ボタンを作成
  primeControlButton = document.createElement('button');
  primeControlButton.className = 'comfort-mode-button';
  primeControlButton.title = chrome.i18n.getMessage('comfortModeTooltip');
  primeControlButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 128 128" fill="white">
      <rect x="40" y="50" width="48" height="40" rx="8" fill="white"/>
      <rect x="52" y="35" width="6" height="20" rx="3" fill="white"/>
      <rect x="70" y="35" width="6" height="20" rx="3" fill="white"/>
      <path d="M64 65 C58 65 54 69 54 74 C54 79 58 83 64 83" stroke="#2d5aa0" stroke-width="4" fill="none" stroke-linecap="round"/>
      <line x1="64" y1="25" x2="64" y2="35" stroke="white" stroke-width="3"/>
    </svg>
  `;

  primeControlButton.style.cssText = `
    background: transparent !important;
    border: none !important;
    cursor: pointer !important;
    padding: 8px !important;
    margin: 0 8px !important;
    opacity: 0.8 !important;
    transition: all 0.2s ease !important;
    width: auto !important;
    height: auto !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 4px !important;
  `;

  // ホバー効果
  primeControlButton.addEventListener('mouseenter', () => {
    if (primeControlButton && !isComfortModeActive) {
      primeControlButton.style.opacity = '1';
      primeControlButton.style.background = 'rgba(255, 255, 255, 0.1) !important';
    }
  });

  primeControlButton.addEventListener('mouseleave', () => {
    if (primeControlButton && !isComfortModeActive) {
      primeControlButton.style.opacity = '0.8';
      primeControlButton.style.background = 'transparent !important';
    }
  });

  // クリックイベント
  primeControlButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isComfortModeActive) {
      disableComfortMode();
    } else {
      enableComfortMode();
    }
  });

  // 先頭に挿入
  topButtons.insertBefore(primeControlButton, topButtons.firstChild);

  // 初期状態を設定
  updatePrimeButtonState();
}

// Prime Videoコントロールボタンを削除
function removePrimeControlButton(): void {
  if (primeControlButton) {
    primeControlButton.remove();
    primeControlButton = null;
  }
}

// YouTubeコントロールボタンを削除
function removeYouTubeControlButton(): void {
  if (youtubeControlButton) {
    youtubeControlButton.remove();
    youtubeControlButton = null;
  }
}

// Prime Video用のMutationObserverを設定
function setupPrimeObserver(): void {
  if (!isPrimeVideo()) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // .atvwebplayersdk-hideabletopbuttons-containerが追加されたかチェック
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.querySelector('div.atvwebplayersdk-hideabletopbuttons-container') ||
                element.classList.contains('atvwebplayersdk-hideabletopbuttons-container')) {
              setTimeout(addPrimeControlButton, 100);
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 初回チェック
  setTimeout(addPrimeControlButton, 1000);
}

// YouTube用のMutationObserverを設定
function setupYouTubeObserver(): void {
  if (!isYouTube()) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // .ytp-right-controlsが追加されたかチェック
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.querySelector('.ytp-right-controls') || element.classList.contains('ytp-right-controls')) {
              setTimeout(addYouTubeControlButton, 100);
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 初回チェック
  setTimeout(addYouTubeControlButton, 1000);
}

// 動画要素を検出し、快適モードを適用する関数
function enableComfortMode(): void {
  const videos = document.querySelectorAll('video') as NodeListOf<HTMLVideoElement>;

  if (videos.length === 0) {
    alert(chrome.i18n.getMessage('noVideoFound'));
    return;
  }

  isComfortModeActive = true;

  videos.forEach(video => {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      // 最初に見つかった有効な動画をアクティブ動画として記録
      if (!currentActiveVideo) {
        currentActiveVideo = video;
      }

      // 元のスタイルを保存
      const computedStyle = window.getComputedStyle(video);
      originalVideoStyles.set(video, {
        inlineStyle: video.getAttribute('style'),
        position: computedStyle.position,
        top: computedStyle.top,
        left: computedStyle.left,
        width: computedStyle.width,
        height: computedStyle.height,
        zIndex: computedStyle.zIndex,
        transform: computedStyle.transform
      });

      // 動画を最大化
      maximizeVideo(video);

      // 動画にクラスを追加
      video.classList.add('comfort-mode-video');

      // YouTubeの場合は#movie_playerの親要素のz-indexも設定
      if (isYouTube()) {
        const player = document.getElementById('movie_player');
        if (player) {
          let parent = player.parentElement;
          while (parent && parent !== document.body) {
            const parentStyle = window.getComputedStyle(parent);
            if (parentStyle.position !== 'static') {
              parent.style.setProperty('z-index', '2147483647', 'important');
              parent.classList.add('comfort-mode-video-container');
              break;
            }
            parent = parent.parentElement;
          }
        }
      } else {
        // 他のサイトでは動画の親要素のz-indexを設定
        let parent = video.parentElement;
        while (parent && parent !== document.body) {
          const parentStyle = window.getComputedStyle(parent);
          if (parentStyle.position !== 'static') {
            parent.style.setProperty('z-index', '2147483647', 'important');
            parent.classList.add('comfort-mode-video-container');
            break;
          }
          parent = parent.parentElement;
        }
      }
    }
  });

  // 動画要素の監視を開始
  startVideoWatcher();

  // z-index制御を適用
  applyZIndexControl();

  // マウスイベントを無効化（改良版）
  disableMouseEvents();

  // カーソル検出を開始
  startCursorDetection();

  // 解除ボタンを表示
  showExitButton();

  // 独自のコントロールUIを表示
  showCustomControls();

  // YouTubeボタンの状態を更新
  updateYouTubeButtonState();

  // Prime Videoボタンの状態を更新
  updatePrimeButtonState();
  
  // YouTube特有の親要素のz-indexを調整
  if (isYouTube()) {
    const ytdApp = document.querySelector('ytd-app') as HTMLElement;
    if (ytdApp) {
      // 元のinline styleのz-indexを保存（なければnull）
      const currentInlineZIndex = ytdApp.style.zIndex || null;
      originalParentZIndex.set(ytdApp, currentInlineZIndex);
      ytdApp.style.setProperty('z-index', 'auto', 'important');
    }
    // 他の親要素も調整
    const parentSelectors = [
      '#player-container-inner',
      '#player-container-outer',
      '#player',
      '#primary-inner',
      '#primary',
      '#columns',
      'ytd-watch-flexy',
      'ytd-page-manager',
      '#content',
      'ytd-player',
      '#container'
    ];
    parentSelectors.forEach(selector => {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        // 元のinline styleのz-indexを保存（なければnull）
        const currentInlineZIndex = el.style.zIndex || null;
        originalParentZIndex.set(el, currentInlineZIndex);
        el.style.setProperty('z-index', 'auto', 'important');
      }
    });
  }
}

// 動画を画面いっぱいに最大化する関数
function maximizeVideo(video: HTMLVideoElement): void {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const videoAspectRatio = video.videoWidth / video.videoHeight;
  const windowAspectRatio = windowWidth / windowHeight;

  let newWidth: number;
  let newHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspectRatio > windowAspectRatio) {
    // 動画が横長の場合、幅をウィンドウに合わせる
    newWidth = windowWidth;
    newHeight = windowWidth / videoAspectRatio;
    offsetY = (windowHeight - newHeight) / 2;
  } else {
    // 動画が縦長の場合、高さをウィンドウに合わせる
    newHeight = windowHeight;
    newWidth = windowHeight * videoAspectRatio;
    offsetX = (windowWidth - newWidth) / 2;
  }

  // YouTubeの場合は#movie_playerを拡大
  if (isYouTube()) {
    const player = document.getElementById('movie_player');
    if (player) {
      // 元のスタイルを保存
      const computedStyle = window.getComputedStyle(player);
      originalVideoStyles.set(player as any, {
        inlineStyle: (player as HTMLElement).getAttribute('style'),
        position: computedStyle.position,
        top: computedStyle.top,
        left: computedStyle.left,
        width: computedStyle.width,
        height: computedStyle.height,
        zIndex: computedStyle.zIndex,
        transform: computedStyle.transform
      });

      // cssTextではなく個別のプロパティを設定（元のCSS変数を保持するため）
      player.style.setProperty('position', 'fixed', 'important');
      player.style.setProperty('top', `${offsetY}px`, 'important');
      player.style.setProperty('left', `${offsetX}px`, 'important');
      player.style.setProperty('width', `${newWidth}px`, 'important');
      player.style.setProperty('height', `${newHeight}px`, 'important');
      player.style.setProperty('z-index', '2147483647', 'important');
      player.classList.add('comfort-mode-video-container');
      
      // YouTubeのvideo要素も調整
      video.style.cssText += `
        position: static !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 2147483647 !important;
        object-fit: contain !important;
        transform: none !important;
        top: auto !important;
        left: auto !important;
      `;
      
      // .html5-video-containerのz-indexも調整
      const videoContainer = player.querySelector('.html5-video-container') as HTMLElement;
      if (videoContainer) {
        videoContainer.style.setProperty('z-index', '2147483647', 'important');
        videoContainer.classList.add('comfort-mode-video-container');
      }
    }
  } else {
    // 他のサイトでは動画要素を直接拡大
    // setProperty()を使用して元のスタイルを保持
    video.style.setProperty('position', 'fixed', 'important');
    video.style.setProperty('top', `${offsetY}px`, 'important');
    video.style.setProperty('left', `${offsetX}px`, 'important');
    video.style.setProperty('width', `${newWidth}px`, 'important');
    video.style.setProperty('height', `${newHeight}px`, 'important');
    video.style.setProperty('z-index', '2147483647', 'important');
    video.style.setProperty('object-fit', 'fill', 'important');
    video.style.setProperty('transform', 'none', 'important');
  }
}

// マウスイベントを無効化する関数（改良版）
function disableMouseEvents(): void {
  const style = document.createElement('style');
  style.id = 'comfort-mode-style';
  style.textContent = `
    /* 動画コンテナとその子要素を最前面に */
    body.comfort-mode-active .comfort-mode-video-container,
    body.comfort-mode-active .comfort-mode-video-container * {
      z-index: 2147483647 !important;
    }
    /* コントロール無効時のみpointer-eventsを無効化 */
    body.comfort-mode-active:not(.video-controls-enabled) *:not(.comfort-mode-video-container):not(.comfort-mode-video-container *) {
      pointer-events: none !important;
    }
    body.comfort-mode-active #comfort-mode-exit-button {
      pointer-events: auto !important;
    }
    body.comfort-mode-active .comfort-mode-video-container,
    body.comfort-mode-active .comfort-mode-video-container * {
      pointer-events: auto !important;
    }
    /* コントロール無効時は動画コンテナ内も無効化 */
    body.comfort-mode-active:not(.video-controls-enabled) .comfort-mode-video-container,
    body.comfort-mode-active:not(.video-controls-enabled) .comfort-mode-video-container * {
      pointer-events: none !important;
    }
    /* 動画要素自体は常にpointer-eventsを有効に */
    body.comfort-mode-active video {
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);
}

// z-index制御を適用する関数
function applyZIndexControl(): void {
  // 黒いオーバーレイを作成（画面全体を覆う）
  const overlay = document.createElement('div');
  overlay.id = 'comfort-mode-overlay';
  overlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: black !important;
    z-index: 1000000 !important;
    pointer-events: none !important;
  `;
  // 最初の子として挿入（すべての要素より前に）
  document.body.insertBefore(overlay, document.body.firstChild);

  // 解除ボタンのz-indexを設定
  zIndexStyle = document.createElement('style');
  zIndexStyle.id = 'comfort-mode-zindex-control';
  zIndexStyle.textContent = `
    /* 解除ボタンを最前面に */
    #comfort-mode-exit-button {
      z-index: 2147483648 !important;
    }
  `;
  document.head.appendChild(zIndexStyle);

  // body要素にクラスを追加
  document.body.classList.add('comfort-mode-active');
}

// z-index制御を解除する関数
function removeZIndexControl(): void {
  // オーバーレイを削除
  const overlay = document.getElementById('comfort-mode-overlay');
  if (overlay) {
    overlay.remove();
  }

  if (zIndexStyle) {
    zIndexStyle.remove();
    zIndexStyle = null;
  }

  // 親要素のz-indexを復元
  const containers = document.querySelectorAll('.comfort-mode-video-container');
  containers.forEach(container => {
    const htmlEl = container as HTMLElement;
    htmlEl.style.removeProperty('z-index');
    htmlEl.classList.remove('comfort-mode-video-container');
  });

  // YouTube親要素のz-indexを復元
  originalParentZIndex.forEach((originalInlineZIndex, element) => {
    if (originalInlineZIndex === null) {
      // 元々inline styleがなかった場合は削除
      element.style.removeProperty('z-index');
    } else {
      // 元々inline styleがあった場合は復元
      element.style.setProperty('z-index', originalInlineZIndex);
    }
  });
  originalParentZIndex.clear();

  // body要素からクラスを削除
  document.body.classList.remove('comfort-mode-active');
  document.body.classList.remove('video-area-hovered');

  // 動画とコンテナからクラスを削除
  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  videos.forEach(video => {
    video.classList.remove('comfort-mode-video');
    // コンテナのクラスも削除
    const parent = video.parentElement;
    if (parent) {
      parent.classList.remove('comfort-mode-video-container');
    }
  });
}

// 動画の再生状態監視を開始
function startVideoPlaybackMonitoring(): void {
  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;

  videos.forEach(video => {
    // 動画が再生開始されたらコントロール無効化を検討
    video.addEventListener('play', () => {
      // 動画外にマウスがある場合のみコントロール無効化タイマーを開始
      if (isVideoControlsEnabled) {
        const lastMouseEvent = (window as any).lastMouseEvent;
        if (lastMouseEvent) {
          const rect = video.getBoundingClientRect();
          const isInVideoArea = lastMouseEvent.clientX >= rect.left && lastMouseEvent.clientX <= rect.right &&
                               lastMouseEvent.clientY >= rect.top && lastMouseEvent.clientY <= rect.bottom;

          if (!isInVideoArea && !controlsDisableTimer) {
            controlsDisableTimer = setTimeout(() => {
              disableVideoControls();
              controlsDisableTimer = null;
            }, CONTROLS_DISABLE_TIME);
          }
        }
      }
    });

    // 動画が停止した場合は無効化タイマーをキャンセル
    video.addEventListener('pause', () => {
      if (controlsDisableTimer) {
        clearTimeout(controlsDisableTimer);
        controlsDisableTimer = null;
      }
    });
  });
}

// カーソル検出を開始する関数
function startCursorDetection(): void {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick);
  startVideoPlaybackMonitoring();
}

// カーソル検出を停止する関数
function stopCursorDetection(): void {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleClick);
  if (cursorTimer) {
    clearTimeout(cursorTimer);
    cursorTimer = null;
  }
  if (controlsDisableTimer) {
    clearTimeout(controlsDisableTimer);
    controlsDisableTimer = null;
  }
  disableVideoControls();
}

// 動画が停止中かどうかをチェック
function isVideoPaused(): boolean {
  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  let allPaused = true;

  videos.forEach(video => {
    if (!video.paused && !video.ended) {
      allPaused = false;
    }
  });

  return videos.length > 0 && allPaused;
}

// マウス移動時の処理
function handleMouseMove(event: MouseEvent): void {
  if (!isComfortModeActive) return;

  // 最後のマウスイベントを保存（解除ボタンのホバー効果で使用）
  (window as any).lastMouseEvent = event;

  // マウスが動いたらコントロールを表示
  if (customControls) {
    resetControlsAutoHide();
  }

  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  if (videos.length === 0) return;

  // 動画停止中かチェック
  const videoPaused = isVideoPaused();

  // 動画領域内かチェック（全体）
  let isInVideoArea = false;
  let isInVideoBottomArea = false;

  videos.forEach(video => {
    const rect = video.getBoundingClientRect();

    // 動画全体の範囲内かチェック
    if (event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom) {
      isInVideoArea = true;

      // さらに下部20%の範囲内かチェック
      const bottomAreaHeight = rect.height * 0.2;
      const bottomAreaTop = rect.bottom - bottomAreaHeight;

      if (event.clientY >= bottomAreaTop) {
        isInVideoBottomArea = true;
      }
    }
  });

  // 動画停止中の場合は常にコントロールを有効化
  if (videoPaused && !isVideoControlsEnabled) {
    enableVideoControls();
  }

  // 解除ボタンの透明度制御（状態が変わった時だけ）
  if (isInVideoArea !== lastIsInVideoArea) {
    updateExitButtonOpacity(isInVideoArea);
    lastIsInVideoArea = isInVideoArea;

    // CSSクラスによる制御も追加
    if (isInVideoArea) {
      document.body.classList.add('video-area-hovered');
    } else {
      document.body.classList.remove('video-area-hovered');
    }
  }

  // この部分は削除：毎回の呼び出しは不要

  // コントロール無効化タイマーの処理（動画停止中は無効化しない）
  if (isInVideoArea) {
    // 動画内にいる場合は無効化タイマーをキャンセル
    if (controlsDisableTimer) {
      clearTimeout(controlsDisableTimer);
      controlsDisableTimer = null;
    }
  } else {
    // 動画から離れた場合（動画停止中は無効化しない）
    if (isVideoControlsEnabled && !controlsDisableTimer && !videoPaused) {
      // コントロールが有効で、まだタイマーが設定されていない場合
      controlsDisableTimer = setTimeout(() => {
        disableVideoControls();
        controlsDisableTimer = null;
      }, CONTROLS_DISABLE_TIME);
    }
  }

  // コントロール有効化タイマーの処理（動画停止中は即座に有効化）
  if (isInVideoBottomArea) {
    // 動画下部にカーソルがある場合、タイマーを開始（停止中は即座に有効化）
    if (!isVideoControlsEnabled) {
      if (videoPaused) {
        // 停止中は即座に有効化
        enableVideoControls();
      } else {
        // 再生中は2秒待つ
        if (cursorTimer) {
          clearTimeout(cursorTimer);
        }

        cursorTimer = setTimeout(() => {
          enableVideoControls();
          cursorTimer = null;
        }, HOVER_DETECTION_TIME);
      }
    }
  } else {
    // 動画下部から離れた場合、有効化タイマーをリセット
    if (cursorTimer) {
      clearTimeout(cursorTimer);
      cursorTimer = null;
    }
  }
}

// クリック時の処理
function handleClick(event: MouseEvent): void {
  if (!isComfortModeActive) return;

  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  if (videos.length === 0) return;

  // 動画エリア内でのクリックをチェック
  let clickedVideo: HTMLVideoElement | null = null;

  videos.forEach(video => {
    const rect = video.getBoundingClientRect();

    // 動画全体の範囲内かチェック
    const isInVideoArea = event.clientX >= rect.left && event.clientX <= rect.right &&
                         event.clientY >= rect.top && event.clientY <= rect.bottom;

    if (isInVideoArea) {
      clickedVideo = video;
    }
  });

  // 動画エリアをクリックした場合、再生/一時停止をトグル
  if (clickedVideo !== null) {
    const video: HTMLVideoElement = clickedVideo;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    // コントロールを表示
    if (customControls) {
      resetControlsAutoHide();
    }
  }
}

// 動画コントロールを有効化
function enableVideoControls(): void {
  if (!isVideoControlsEnabled) {
    isVideoControlsEnabled = true;
    document.body.classList.add('video-controls-enabled');

    // 解除ボタンの透明度を更新（コントロール有効状態を反映）
    const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
    let isInVideoArea = false;
    const lastMouseEvent = (window as any).lastMouseEvent;
    if (lastMouseEvent && videos.length > 0) {
      videos.forEach(video => {
        const rect = video.getBoundingClientRect();
        if (lastMouseEvent.clientX >= rect.left && lastMouseEvent.clientX <= rect.right &&
            lastMouseEvent.clientY >= rect.top && lastMouseEvent.clientY <= rect.bottom) {
          isInVideoArea = true;
        }
      });
    }
    updateExitButtonOpacity(isInVideoArea);
  }
}

// ビデオコントロールを無効化する関数
function disableVideoControls(): void {
  if (isVideoControlsEnabled) {
    isVideoControlsEnabled = false;
    document.body.classList.remove('video-controls-enabled');

    // 解除ボタンの透明度を更新（コントロール無効状態を反映）
    const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
    let isInVideoArea = false;
    const lastMouseEvent = (window as any).lastMouseEvent;
    if (lastMouseEvent && videos.length > 0) {
      videos.forEach(video => {
        const rect = video.getBoundingClientRect();
        if (lastMouseEvent.clientX >= rect.left && lastMouseEvent.clientX <= rect.right &&
            lastMouseEvent.clientY >= rect.top && lastMouseEvent.clientY <= rect.bottom) {
          isInVideoArea = true;
        }
      });
    }
    updateExitButtonOpacity(isInVideoArea);
  }
}

// 動画終了を検出して快適モードを自動終了する
function checkVideoEnded(): void {
  if (!isComfortModeActive) return;

  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  let allEnded = true;

  if (videos.length === 0) {
    disableComfortMode();
    return;
  }

  videos.forEach(video => {
    if (!video.ended) {
      allEnded = false;
    }
  });

  // すべての動画が終了した場合、快適モードを解除
  if (allEnded) {
    disableComfortMode();
  }
}

// 解除ボタンの透明度を更新
function updateExitButtonOpacity(isInVideoArea: boolean): void {
  if (!exitButton) return;


  if (isVideoControlsEnabled) {
    // コントロール有効時: 最も濃く（操作中を示す）
    exitButton.style.background = 'rgba(255, 255, 255, 0.15) !important';
    exitButton.style.color = 'rgba(255, 255, 255, 0.6) !important';
    exitButton.style.borderColor = 'rgba(255, 255, 255, 0.15) !important';
  } else if (isInVideoArea) {
    // 動画内: 通常の透明度
    exitButton.style.background = 'rgba(255, 255, 255, 0.1) !important';
    exitButton.style.color = 'rgba(255, 255, 255, 0.4) !important';
    exitButton.style.borderColor = 'rgba(255, 255, 255, 0.1) !important';
  } else {
    // 動画外: 背景完全に透明、文字のみ表示
    exitButton.style.background = 'transparent !important';
    exitButton.style.color = 'rgba(255, 255, 255, 0.2) !important';
    exitButton.style.borderColor = 'transparent !important';
  }
}

// 解除ボタンを表示する関数
function showExitButton(): void {
  exitButton = document.createElement('div');
  exitButton.id = 'comfort-mode-exit-button';
  exitButton.innerHTML = '×'; // シンプルな×記号
  exitButton.title = chrome.i18n.getMessage('comfortModeExitTooltip'); // ツールチップで説明
  exitButton.style.cssText = `
    position: fixed !important;
    bottom: 15px !important;
    right: 15px !important;
    background: transparent !important;
    color: rgba(255, 255, 255, 0.2) !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 50% !important;
    cursor: pointer !important;
    z-index: 2147483648 !important;
    font-family: Arial, sans-serif !important;
    font-size: 18px !important;
    font-weight: bold !important;
    user-select: none !important;
    pointer-events: auto !important;
    border: 1px solid transparent !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.2s ease !important;
  `;

  exitButton.addEventListener('click', disableComfortMode);

  // ホバー効果（コントロール有効時のみ）
  exitButton.addEventListener('mouseenter', () => {
    if (exitButton && isVideoControlsEnabled) {
      exitButton.style.background = 'rgba(255, 255, 255, 0.25) !important';
      exitButton.style.color = 'rgba(255, 255, 255, 0.9) !important';
      exitButton.style.borderColor = 'rgba(255, 255, 255, 0.4) !important';
    }
  });

  exitButton.addEventListener('mouseleave', () => {
    // ホバー解除時は現在の動画エリア状態に応じて透明度を設定（コントロール有効時のみ）
    if (exitButton && isVideoControlsEnabled) {
      const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
      let isInVideoArea = false;

      // 最後のマウス位置をチェック（簡易的な実装）
      const lastMouseEvent = (window as any).lastMouseEvent;
      if (lastMouseEvent && videos.length > 0) {
        videos.forEach(video => {
          const rect = video.getBoundingClientRect();
          if (lastMouseEvent.clientX >= rect.left && lastMouseEvent.clientX <= rect.right &&
              lastMouseEvent.clientY >= rect.top && lastMouseEvent.clientY <= rect.bottom) {
            isInVideoArea = true;
          }
        });
      }

      // ホバー解除後は適切な透明度に戻す
      setTimeout(() => {
        updateExitButtonOpacity(isInVideoArea);
      }, 10); // 少し遅延させてスタイルの競合を避ける
    }
  });

  document.body.appendChild(exitButton);
}

// 独自のコントロールUIを表示する関数
function showCustomControls(): void {
  if (customControls || !currentActiveVideo) return;

  const video = currentActiveVideo;

  // コントロールコンテナを作成
  customControls = document.createElement('div');
  customControls.id = 'comfort-mode-custom-controls';
  customControls.style.cssText = `
    position: fixed !important;
    bottom: 60px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    background: rgba(0, 0, 0, 0.8) !important;
    padding: 15px 20px !important;
    border-radius: 8px !important;
    z-index: 2147483647 !important;
    display: flex !important;
    align-items: center !important;
    gap: 15px !important;
    pointer-events: auto !important;
    transition: opacity 0.3s ease !important;
    opacity: 1 !important;
  `;

  // 10秒戻しボタン
  const rewind10Btn = document.createElement('button');
  rewind10Btn.innerHTML = '⏪ 10s';
  rewind10Btn.style.cssText = `
    background: transparent !important;
    border: none !important;
    color: white !important;
    font-size: 14px !important;
    cursor: pointer !important;
    padding: 8px 12px !important;
    border-radius: 4px !important;
    transition: background 0.2s !important;
  `;
  rewind10Btn.addEventListener('mouseenter', () => {
    rewind10Btn.style.background = 'rgba(255, 255, 255, 0.2) !important';
  });
  rewind10Btn.addEventListener('mouseleave', () => {
    rewind10Btn.style.background = 'transparent !important';
  });
  rewind10Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.currentTime = Math.max(0, video.currentTime - 10);
    resetControlsAutoHide();
  });

  // 再生/一時停止ボタン
  const playPauseBtn = document.createElement('button');
  playPauseBtn.id = 'comfort-play-pause-btn';
  playPauseBtn.innerHTML = video.paused ? '▶' : '⏸';
  playPauseBtn.style.cssText = `
    background: transparent !important;
    border: none !important;
    color: white !important;
    font-size: 24px !important;
    cursor: pointer !important;
    padding: 8px 12px !important;
    border-radius: 4px !important;
    transition: background 0.2s !important;
  `;
  playPauseBtn.addEventListener('mouseenter', () => {
    playPauseBtn.style.background = 'rgba(255, 255, 255, 0.2) !important';
  });
  playPauseBtn.addEventListener('mouseleave', () => {
    playPauseBtn.style.background = 'transparent !important';
  });
  playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    resetControlsAutoHide();
  });

  // 10秒送りボタン
  const forward10Btn = document.createElement('button');
  forward10Btn.innerHTML = '10s ⏩';
  forward10Btn.style.cssText = `
    background: transparent !important;
    border: none !important;
    color: white !important;
    font-size: 14px !important;
    cursor: pointer !important;
    padding: 8px 12px !important;
    border-radius: 4px !important;
    transition: background 0.2s !important;
  `;
  forward10Btn.addEventListener('mouseenter', () => {
    forward10Btn.style.background = 'rgba(255, 255, 255, 0.2) !important';
  });
  forward10Btn.addEventListener('mouseleave', () => {
    forward10Btn.style.background = 'transparent !important';
  });
  forward10Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
    resetControlsAutoHide();
  });

  // 現在時刻表示
  const currentTimeDisplay = document.createElement('span');
  currentTimeDisplay.id = 'comfort-current-time';
  currentTimeDisplay.textContent = formatTime(video.currentTime);
  currentTimeDisplay.style.cssText = `
    color: white !important;
    font-size: 14px !important;
    min-width: 45px !important;
    text-align: right !important;
  `;

  // シークバー
  const seekBar = document.createElement('input');
  seekBar.type = 'range';
  seekBar.min = '0';
  seekBar.max = String(video.duration || 100);
  seekBar.value = String(video.currentTime);
  seekBar.style.cssText = `
    width: 300px !important;
    cursor: pointer !important;
    -webkit-appearance: none !important;
    appearance: none !important;
    height: 6px !important;
    border-radius: 3px !important;
    background: rgba(255, 255, 255, 0.3) !important;
    outline: none !important;
  `;
  // シークバーのスタイル（thumb）
  const style = document.createElement('style');
  style.textContent = `
    #comfort-mode-custom-controls input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none !important;
      appearance: none !important;
      width: 14px !important;
      height: 14px !important;
      border-radius: 50% !important;
      background: white !important;
      cursor: pointer !important;
    }
    #comfort-mode-custom-controls input[type="range"]::-moz-range-thumb {
      width: 14px !important;
      height: 14px !important;
      border-radius: 50% !important;
      background: white !important;
      cursor: pointer !important;
      border: none !important;
    }
  `;
  document.head.appendChild(style);

  seekBar.addEventListener('input', (e) => {
    e.stopPropagation();
    const target = e.target as HTMLInputElement;
    video.currentTime = parseFloat(target.value);
    resetControlsAutoHide();
  });

  // 総時間表示
  const durationDisplay = document.createElement('span');
  durationDisplay.id = 'comfort-duration';
  durationDisplay.textContent = formatTime(video.duration || 0);
  durationDisplay.style.cssText = `
    color: white !important;
    font-size: 14px !important;
    min-width: 45px !important;
  `;

  // 要素を追加
  customControls.appendChild(rewind10Btn);
  customControls.appendChild(playPauseBtn);
  customControls.appendChild(forward10Btn);
  customControls.appendChild(currentTimeDisplay);
  customControls.appendChild(seekBar);
  customControls.appendChild(durationDisplay);

  document.body.appendChild(customControls);

  // 動画の再生状態変更イベントをリスンして、ボタンのアイコンを更新
  video.addEventListener('play', () => {
    if (playPauseBtn) playPauseBtn.innerHTML = '⏸';
  });
  video.addEventListener('pause', () => {
    if (playPauseBtn) playPauseBtn.innerHTML = '▶';
  });

  // 動画の時間更新イベントをリスンして、シークバーと時刻表示を更新
  video.addEventListener('timeupdate', () => {
    if (seekBar) seekBar.value = String(video.currentTime);
    if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(video.currentTime);
  });

  // 動画の長さ変更イベントをリスンして、シークバーの最大値と総時間表示を更新
  video.addEventListener('durationchange', () => {
    if (seekBar) {
      seekBar.max = String(video.duration);
    }
    if (durationDisplay) durationDisplay.textContent = formatTime(video.duration);
  });

  // コントロールにマウスを移動したら表示を維持
  customControls.addEventListener('mouseenter', () => {
    if (controlsAutoHideTimer) {
      clearTimeout(controlsAutoHideTimer);
      controlsAutoHideTimer = null;
    }
    if (customControls) customControls.style.opacity = '1';
  });

  customControls.addEventListener('mouseleave', () => {
    resetControlsAutoHide();
  });

  // 初期表示は常に表示（自動非表示しない）
  // ユーザーがマウスを動かしたり、クリックしたときに初めて自動非表示タイマーが開始される
}

// 時間をフォーマットする関数（mm:ss）
function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// コントロールの自動非表示タイマーをリセット
function resetControlsAutoHide(): void {
  if (controlsAutoHideTimer) {
    clearTimeout(controlsAutoHideTimer);
  }

  if (customControls) {
    customControls.style.opacity = '1';

    // 動画が一時停止中は非表示にしない
    if (currentActiveVideo && !currentActiveVideo.paused) {
      controlsAutoHideTimer = setTimeout(() => {
        if (customControls) customControls.style.opacity = '0';
      }, 3000);
    }
  }
}

// 独自のコントロールUIを削除する関数
function hideCustomControls(): void {
  if (customControls) {
    customControls.remove();
    customControls = null;
  }
  if (controlsAutoHideTimer) {
    clearTimeout(controlsAutoHideTimer);
    controlsAutoHideTimer = null;
  }
}

// 快適モードを解除する関数
function disableComfortMode(): void {
  if (!isComfortModeActive) {
    return;
  }

  isComfortModeActive = false;
  currentActiveVideo = null; // アクティブ動画をクリア

  // 動画監視を停止
  stopVideoWatcher();

  // コントロール状態をリセット
  isVideoControlsEnabled = false;
  document.body.classList.remove('video-controls-enabled');

  // カーソル検出を停止
  stopCursorDetection();

  // 独自のコントロールUIを削除
  hideCustomControls();

  // z-index制御を解除
  removeZIndexControl();

  // マウスイベントを有効化（CSSスタイルシートを削除）
  const style = document.getElementById('comfort-mode-style');
  if (style) {
    style.remove();
  }

  // 動画の元のスタイルを復元（CSSスタイルシート削除後に実行）
  originalVideoStyles.forEach((originalStyle, video) => {
    // !important付きのプロパティを個別に削除（setPropertyで設定されたものを削除）
    video.style.removeProperty('position');
    video.style.removeProperty('top');
    video.style.removeProperty('left');
    video.style.removeProperty('width');
    video.style.removeProperty('height');
    video.style.removeProperty('z-index');
    video.style.removeProperty('transform');
    video.style.removeProperty('object-fit');

    // 元のinline styleを復元
    if (originalStyle.inlineStyle && originalStyle.inlineStyle !== '') {
      video.setAttribute('style', originalStyle.inlineStyle);
    } else {
      video.removeAttribute('style');
    }

    // comfort-mode関連のクラスを削除
    video.classList.remove('comfort-mode-video');
    video.classList.remove('comfort-mode-video-container');
  });

  // .comfort-mode-video-containerクラスを持つすべての要素のz-indexを復元
  const videoContainers = document.querySelectorAll('.comfort-mode-video-container');
  videoContainers.forEach(container => {
    const elem = container as HTMLElement;
    elem.style.removeProperty('z-index');
    elem.classList.remove('comfort-mode-video-container');
  });

  originalVideoStyles.clear();

  // 解除ボタンを削除
  if (exitButton) {
    exitButton.remove();
    exitButton = null;
  }

  // YouTubeボタンの状態を更新
  updateYouTubeButtonState();

  // Prime Videoボタンの状態を更新
  updatePrimeButtonState();
}

// バックグラウンドスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleComfortMode') {
    // video要素から直接起動された場合の特別な処理
    if (message.isVideoContext) {
      // 既に快適モードがアクティブな場合は解除
      if (isComfortModeActive) {
        disableComfortMode();
      } else {
        // video要素の特定と優先処理は現在の実装で十分対応済み
        enableComfortMode();
      }
    } else {
      // 通常の切り替え処理
      if (isComfortModeActive) {
        disableComfortMode();
      } else {
        enableComfortMode();
      }
    }

    sendResponse({ success: true });
  }

  // オプションページからの設定更新メッセージを処理
  if (message.action === 'settingsUpdated') {
    // 必要に応じて設定を反映（現在は基本的な実装のため省略）
    sendResponse({ success: true });
  }
});

// ESCキーで快適モードを解除
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isComfortModeActive) {
    disableComfortMode();
  }
});

// ウィンドウサイズ変更時に動画サイズを調整
window.addEventListener('resize', () => {
  if (isComfortModeActive) {
    const videos = document.querySelectorAll('video') as NodeListOf<HTMLVideoElement>;
    videos.forEach(video => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        maximizeVideo(video);
      }
    });
  }
});

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {
  if (isYouTube()) {
    setupYouTubeObserver();
  } else if (isPrimeVideo()) {
    setupPrimeObserver();
  }
});

// ページが既に読み込み済みの場合の初期化
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  if (isYouTube()) {
    setupYouTubeObserver();
  } else if (isPrimeVideo()) {
    setupPrimeObserver();
  }
}

// 動画要素の監視を開始する関数
function startVideoWatcher(): void {
  if (videoWatcher) {
    videoWatcher.disconnect();
  }

  videoWatcher = new MutationObserver((mutations) => {
    // 快適モードがアクティブでない場合は何もしない
    if (!isComfortModeActive || !currentActiveVideo) {
      return;
    }

    // アクティブな動画要素がDOMから削除されたかチェック
    if (!document.contains(currentActiveVideo)) {
      disableComfortMode();
      return;
    }

    // 削除された要素の中にアクティブな動画要素が含まれているかチェック
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // 削除された要素がアクティブな動画要素を含んでいるかチェック
            if (element === currentActiveVideo || element.contains(currentActiveVideo)) {
              disableComfortMode();
            }
          }
        });
      }
    });
  });

  // DOM全体を監視（subtree: true で子孫要素も監視）
  videoWatcher.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 動画終了イベントのリスナーを追加
  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  videos.forEach(video => {
    video.addEventListener('ended', checkVideoEnded);
  });
}

// Test hooks: expose enable/disable for automated testing
try {
  (window as any).__enableComfortMode = enableComfortMode;
  (window as any).__disableComfortMode = disableComfortMode;
} catch (e) {
  // ignore
}

// 動画要素の監視を停止する関数
function stopVideoWatcher(): void {
  if (videoWatcher) {
    videoWatcher.disconnect();
    videoWatcher = null;
  }
}
