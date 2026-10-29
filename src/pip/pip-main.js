// MAIN-world PiP controller. Every trigger funnels into handle(cause), which
// asks decidePip() what to do. One in-flight guard; failures stay silent.
import { decidePip } from './pip-decide.js';

let settings = null; // arrives from pip-isolated.js
let entering = false;

const getVideo = () =>
  document.querySelector('#movie_player video.html5-main-video') ||
  document.querySelector('#shorts-player video') ||
  document.querySelector('video');

const videoState = (video) => ({
  paused: video.paused,
  ended: video.ended,
  isShorts: location.pathname.startsWith('/shorts'),
  isAd: !!document.querySelector('#movie_player.ad-showing'),
});

const autoAllowed = () => !!settings && settings['ytm-pip-enabled'] && settings['ytm-pip-tab-switch'];

// YouTube sets disablePictureInPicture at times; clear it and set Chrome's
// auto-PiP hint to match the settings.
function prepare(video = getVideo()) {
  if (!video || !settings) return;
  try {
    if (video.disablePictureInPicture) video.disablePictureInPicture = false;
    video.removeAttribute('disablepictureinpicture');
    video.autoPictureInPicture = autoAllowed();
  } catch {
    // Older Chrome without autoPictureInPicture.
  }
}

async function enter(video) {
  if (entering) return;
  entering = true;
  try {
    prepare(video);
    try {
      await video.requestPictureInPicture();
    } catch {
      await new Promise((r) => setTimeout(r, 300));
      if (!document.pictureInPictureElement && !video.paused) {
        await video.requestPictureInPicture().catch(() => {});
      }
    }
  } finally {
    entering = false;
  }
}

function handle(cause) {
  if (!settings) return;
  const video = getVideo();
  if (!video) return;
  const action = decidePip({
    cause,
    settings,
    video: videoState(video),
    inPip: !!document.pictureInPictureElement || entering,
  });
  if (action === 'enter') enter(video);
  else if (action === 'exit') document.exitPictureInPicture().catch(() => {});
}

function registerMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.setActionHandler(
      'enterpictureinpicture',
      autoAllowed() ? () => handle('media-session') : null
    );
  } catch {
    // Action not supported by this Chrome.
  }
}

window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.source !== 'ytm') return;
  if (e.data.type === 'pip-settings') {
    settings = e.data.settings;
    prepare();
    registerMediaSession();
  } else if (e.data.type === 'pip-signal') {
    handle(e.data.cause);
  }
});

document.addEventListener('visibilitychange', () => {
  handle(document.hidden ? 'tab-hidden' : 'tab-visible');
});

// Media events don't bubble, so listen in the capture phase.
document.addEventListener('loadedmetadata', (e) => prepare(e.target), true);
document.addEventListener(
  'leavepictureinpicture',
  (e) => setTimeout(() => prepare(e.target), 100),
  true
);
document.addEventListener('yt-navigate-finish', () => {
  prepare();
  registerMediaSession();
});
