// Auto pop-out controller. Every trigger goes through handle(cause); the page
// wiring lives in pip-main.js. Injected document/location/delay keep it testable.
import { decidePip } from './pip-decide.js';

// After a tab is hidden, how long to wait for Chrome's own auto-PiP (the
// media-session handler, which has the user activation PiP needs) before
// trying a plain request.
export const FALLBACK_MS = 500;
export const RETRY_MS = 300;
// Chrome closes its own auto-PiP window when the tab comes back. Calling
// exitPictureInPicture in that same moment makes Chrome hang with the window
// hidden but never closed, so give Chrome this long to do it first.
export const CHROME_CLOSE_MS = 1000;

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
  let closeToken = 0;
  // Who opened the current window: 'chrome' (auto-PiP via the media session),
  // 'us', or null when unknown (Chrome's own autoPictureInPicture, YouTube's
  // button). Unknown is handled like 'chrome': the safe, waiting path.
  let openedBy = null;

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

  // Pop back in. Chrome can refuse while the window is still opening or
  // closing, so try once more after a moment if the tab is still in front.
  function exit() {
    document.exitPictureInPicture().catch(() => {
      delay(() => {
        if (inPip() && !document.hidden) document.exitPictureInPicture().catch(() => {});
      }, RETRY_MS);
    });
  }

  // Pop back in when the user returns. A window Chrome opened is closed by
  // Chrome itself; closing it in that same moment hangs Chrome with the window
  // hidden. So only our own windows close at once; others get CHROME_CLOSE_MS
  // first. Leaving or returning again cancels a pending close.
  function popBackIn() {
    const token = ++closeToken;
    if (openedBy === 'us') {
      exit();
      return;
    }
    delay(() => {
      if (token === closeToken && inPip() && !document.hidden) exit();
    }, CHROME_CLOSE_MS);
  }

  async function enter(video, cause, { force = false } = {}) {
    if (entering && !force) return;
    entering = true;
    const opener = cause === 'media-session' ? 'chrome' : 'us';
    try {
      prepare(video);
      try {
        await video.requestPictureInPicture();
        openedBy = opener;
      } catch {
        await new Promise((resolve) => delay(resolve, RETRY_MS));
        if (!inPip() && !video.paused && stillWanted(cause)) {
          await video.requestPictureInPicture().then(
            () => (openedBy = opener),
            () => {}
          );
        }
      }
    } finally {
      entering = false;
    }
    // The request can finish after the user is already back on the tab; then
    // nothing else would ever close that window.
    if (TAB_CAUSES.has(cause) && inPip() && !stillWanted(cause) && settings?.['ytm-pip-return']) popBackIn();
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
    if (cause === 'tab-hidden' || cause === 'media-session') closeToken++;
    // During alt-tab Chrome can report focus lost and gained in the same
    // instant; trust the page's own focus state.
    if (cause === 'app-focus' && !document.hasFocus()) return;
    const video = getVideo();
    if (!video) return;

    const action = decide(cause, video);
    if (action === 'exit') {
      popBackIn();
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
    // The window closed (leavepictureinpicture): forget who opened it.
    left() {
      openedBy = null;
    },
  };
}
