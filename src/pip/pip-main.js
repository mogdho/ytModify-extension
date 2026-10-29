// MAIN-world wiring for the auto pop-out: page events and Chrome's media
// session go to the controller (pip-controller.js), which holds the rules.
import { createPipController } from './pip-controller.js';

const controller = createPipController({ document, location });

function registerMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.setActionHandler(
      'enterpictureinpicture',
      controller.autoAllowed() ? () => controller.handle('media-session') : null
    );
  } catch {
    // Action not supported by this Chrome.
  }
}

window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.source !== 'ytm') return;
  if (e.data.type === 'pip-settings') {
    controller.setSettings(e.data.settings);
    registerMediaSession();
  } else if (e.data.type === 'pip-signal') {
    controller.handle(e.data.cause);
  }
});

document.addEventListener('visibilitychange', () => {
  controller.handle(document.hidden ? 'tab-hidden' : 'tab-visible');
});

// Media events don't bubble, so listen in the capture phase.
document.addEventListener('loadedmetadata', (e) => controller.prepare(e.target), true);
document.addEventListener('leavepictureinpicture', (e) => setTimeout(() => controller.prepare(e.target), 100), true);
document.addEventListener('yt-navigate-finish', () => {
  controller.prepare();
  registerMediaSession();
});
