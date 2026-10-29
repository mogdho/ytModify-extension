// MAIN-world: keeps YouTube's playback quality fixed per view (normal & pop-out,
// fullscreen, mini player). Settings arrive with the PiP relay message.
import { detectView, qualityRequest } from './quality-core.js';

const RETRIES = 5;
const RETRY_MS = 500;

let settings = null;
let settingsVersion = 0;
let last = { view: null, videoId: null, version: -1 }; // what was last applied
let forced = false; // did ytModify set a fixed quality on this player?
let timer = null;

const player = () => document.getElementById('movie_player');

const currentView = () =>
  detectView({
    fullscreen: !!document.fullscreenElement,
    mini: !!document.querySelector('ytd-app[miniplayer-is-active], ytd-miniplayer[active]'),
  });

function apply(attempt = 0) {
  const p = player();
  if (!settings || !p?.getAvailableQualityLevels) return;
  try {
    const view = currentView();
    const videoId = p.getVideoData?.()?.video_id ?? null;
    // Only act on a real change, so a quality picked by hand in YouTube's
    // menu stays until the next view, video or setting change.
    if (view === last.view && videoId === last.videoId && settingsVersion === last.version) return;

    const available = p.getAvailableQualityLevels() || [];
    const request = qualityRequest({ settings, view, available, forcedBefore: forced });

    if (request.action === 'none' && settings['ytm-quality-enabled'] && !available.length) {
      // YouTube hasn't listed the levels yet.
      if (attempt < RETRIES) setTimeout(() => apply(attempt + 1), RETRY_MS);
      return;
    }

    if (request.action === 'set') {
      p.setPlaybackQualityRange?.(request.quality, request.quality);
      p.setPlaybackQuality?.(request.quality);
      forced = true;
    } else if (request.action === 'auto') {
      p.setPlaybackQualityRange?.('auto', 'auto');
      forced = false;
    }
    last = { view, videoId, version: settingsVersion };
  } catch {
    // Player API changed or not ready; try again on the next event.
  }
}

const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(() => apply(), 150);
};

window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.source !== 'ytm' || e.data.type !== 'pip-settings') return;
  settings = e.data.settings;
  settingsVersion++;
  schedule();
});

document.addEventListener('fullscreenchange', schedule);
document.addEventListener('yt-navigate-finish', schedule);
for (const type of ['loadedmetadata', 'enterpictureinpicture', 'leavepictureinpicture']) {
  document.addEventListener(type, schedule, true);
}

// The mini player is a flag on <ytd-app>; watch only that attribute.
function watchMiniPlayer() {
  const app = document.querySelector('ytd-app');
  if (!app) return void setTimeout(watchMiniPlayer, 500);
  new MutationObserver(schedule).observe(app, { attributes: true, attributeFilter: ['miniplayer-is-active'] });
}
watchMiniPlayer();
