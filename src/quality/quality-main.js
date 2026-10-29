// MAIN-world: keeps YouTube's playback quality fixed per view (normal & pop-out,
// fullscreen, mini player). Settings arrive with the PiP relay message.
import { detectView, playerSelector, qualityRequest, qualitySettingsKey } from './quality-core.js';

const RETRIES = 5;
const RETRY_MS = 500;

let settings = null;
let settingsKey = null;
let last = { view: null, videoId: null, key: null }; // what was last applied
let forced = false; // did ytModify set a fixed quality on this player?
let timer = null;

const player = () => document.querySelector(playerSelector(location.pathname));

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
    if (view === last.view && videoId === last.videoId && settingsKey === last.key) return;

    const available = p.getAvailableQualityLevels() || [];
    const request = qualityRequest({ settings, view, available, forcedBefore: forced });

    if (request.action === 'wait') {
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
    last = { view, videoId, key: settingsKey };
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
  // Re-sent on every navigation and PiP change; only a quality change counts.
  const key = qualitySettingsKey(settings);
  if (key === settingsKey) return;
  settingsKey = key;
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
