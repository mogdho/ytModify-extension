// Auto pop-out controller. Every trigger goes through handle(cause); the page
// wiring lives in pip-main.js. Injected document/location/delay keep it testable.
import { decidePip } from './pip-decide.js';

// After a tab is hidden, how long to wait for Chrome's own auto-PiP (the
// media-session handler, which has the user activation PiP needs) before
// trying a plain request.
export const FALLBACK_MS = 500;
export const RETRY_MS = 300;

const TAB_CAUSES = new Set(['tab-hidden', 'media-session']);

// The pop-out key: a plain press (no Ctrl/Alt/Shift/Meta; Shift+P is YouTube's
// 'previous video') outside text fields. An empty key means off.
export function isPipKey(event, key) {
  if (!key || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return false;
  const t = event.target;
  if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return false;
  return typeof event.key === 'string' && event.key.toUpperCase() === key;
}

export function createPipController({ document, location, delay = (fn, ms) => setTimeout(fn, ms) }) {
  let settings = null;
  let entering = false;
  let fallbackToken = 0;

  const isShorts = () => location.pathname.startsWith('/shorts');

  // Only YouTube's real players; never a home-page hover preview.
  const getVideo = () =>
    isShorts()
      ? document.querySelector('#shorts-player video')
      : document.querySelector('#movie_player video.html5-main-video') || document.querySelector('#movie_player video');

  const autoAllowed = () => !!settings && settings['ytm-pip-enabled'] && settings['ytm-pip-tab-switch'];

  const inPip = () => !!document.pictureInPictureElement;

  // Is the reason for popping out still true?
  const stillWanted = (cause) => (TAB_CAUSES.has(cause) ? document.hidden : !document.hasFocus());

  function prepare(video = getVideo()) {
    if (!video || !settings || video !== getVideo()) return;
    try {
      if (video.disablePictureInPicture) video.disablePictureInPicture = false;
      video.removeAttribute('disablepictureinpicture');
      video.autoPictureInPicture = autoAllowed();
    } catch {
      // Older Chrome without autoPictureInPicture.
    }
  }

  async function enter(video, cause, { force = false } = {}) {
    if (entering && !force) return;
    entering = true;
    try {
      prepare(video);
      try {
        await video.requestPictureInPicture();
      } catch {
        await new Promise((resolve) => delay(resolve, RETRY_MS));
        if (!inPip() && !video.paused && stillWanted(cause)) {
          await video.requestPictureInPicture().catch(() => {});
        }
      }
    } finally {
      entering = false;
    }
  }

  function decide(cause, video) {
    return decidePip({
      cause,
      settings,
      video: {
        paused: video.paused,
        ended: video.ended,
        isShorts: isShorts(),
        isAd: !isShorts() && !!document.querySelector('#movie_player.ad-showing'),
      },
      // Chrome's own auto-PiP may arrive while our fallback is still trying.
      inPip: inPip() || (entering && cause !== 'media-session'),
    });
  }

  function handle(cause) {
    if (!settings) return;
    if (cause === 'tab-visible' || cause === 'app-focus') fallbackToken++;
    // During alt-tab Chrome can report focus lost and gained in the same
    // instant; trust the page's own focus state.
    if (cause === 'app-focus' && !document.hasFocus()) return;
    if (cause === 'app-blur' && document.hasFocus()) return;
    const video = getVideo();
    if (!video) return;

    const action = decide(cause, video);
    if (action === 'exit') {
      document.exitPictureInPicture().catch(() => {});
      return;
    }
    if (action !== 'enter') return;

    if (cause === 'tab-hidden' && autoAllowed()) {
      // Give Chrome's auto-PiP (media session) the first chance.
      const token = ++fallbackToken;
      delay(() => {
        if (token !== fallbackToken || !document.hidden || inPip() || entering) return;
        if (decide('tab-hidden', video) === 'enter') enter(video, 'tab-hidden');
      }, FALLBACK_MS);
      return;
    }
    enter(video, cause, { force: cause === 'media-session' });
  }

  return {
    setSettings(next) {
      settings = next;
      prepare();
    },
    handle,
    // The pop-out key: a key press is the user gesture Chrome requires, so this
    // works any time, independent of the auto pop-out switches.
    toggle() {
      const video = getVideo();
      if (inPip()) {
        document.exitPictureInPicture().catch(() => {});
      } else if (video) {
        enter(video, 'manual', { force: true });
      }
    },
    prepare,
    autoAllowed,
  };
}
