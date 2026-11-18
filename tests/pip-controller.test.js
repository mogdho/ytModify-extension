import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPipController, FALLBACK_MS, RETRY_MS, CHROME_CLOSE_MS } from '../src/pip/pip-controller.js';
import { YTM_DEFAULTS } from '../src/shared/ytm-settings.js';

// A fake page: videos by selector, visibility, focus and PiP state.
function fakePage({ path = '/watch', videos = {}, adShowing = false } = {}) {
  const timers = [];
  const page = {
    calls: [],
    timers,
    location: { pathname: path },
    document: {
      hidden: false,
      pictureInPictureElement: null,
      focused: true,
      hasFocus() {
        return this.focused;
      },
      querySelector(sel) {
        if (sel === '#movie_player.ad-showing') return adShowing ? {} : null;
        return videos[sel] ?? null;
      },
      exitPictureInPicture: async () => {
        page.calls.push('exit');
        page.document.pictureInPictureElement = null;
      },
    },
    delay: (fn, ms) => timers.push({ fn, ms }),
    runTimers() {
      while (timers.length) timers.shift().fn();
    },
  };
  return page;
}

function fakeVideo(page, name, { fail = 0 } = {}) {
  let failures = fail;
  return {
    paused: false,
    ended: false,
    removeAttribute() {},
    requestPictureInPicture: async function () {
      page.calls.push(`enter:${name}`);
      if (failures > 0) {
        failures--;
        throw new Error('NotAllowedError');
      }
      page.document.pictureInPictureElement = this;
    },
  };
}

const settle = () => new Promise((r) => setTimeout(r, 0));
const controllerFor = (page, settings = YTM_DEFAULTS) => {
  const c = createPipController({ document: page.document, location: page.location, delay: page.delay });
  c.setSettings(settings);
  return c;
};

test('tab hide waits for Chrome auto-PiP, then falls back once', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.hidden = true;
  c.handle('tab-hidden');
  await settle();
  assert.deepEqual(page.calls, [], 'no immediate request without activation');
  assert.equal(page.timers[0].ms, FALLBACK_MS);
  page.runTimers();
  await settle();
  assert.deepEqual(page.calls, ['enter:main']);
});

test('Chrome auto-PiP (media session) enters at once', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.hidden = true;
  c.handle('tab-hidden');
  c.handle('media-session');
  await settle();
  assert.deepEqual(page.calls, ['enter:main']);
  page.runTimers(); // the fallback sees PiP already open
  await settle();
  assert.deepEqual(page.calls, ['enter:main']);
});

test('coming back before the fallback cancels it', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.hidden = true;
  c.handle('tab-hidden');
  page.document.hidden = false;
  c.handle('tab-visible');
  page.runTimers();
  await settle();
  assert.deepEqual(page.calls, []);
});

test('a failed request is retried only while still hidden', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main', { fail: 1 });
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.hidden = true;
  c.handle('media-session');
  await settle();
  assert.equal(page.timers.at(-1).ms, RETRY_MS);
  page.document.hidden = false; // user came back
  page.runTimers();
  await settle();
  assert.deepEqual(page.calls, ['enter:main']);
});

test('alt-tab never pops out by itself; returning still pops back in', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.focused = false;
  c.handle('app-blur');
  await settle();
  assert.deepEqual(page.calls, []);
  c.toggle(); // the pop-out key, pressed before alt-tab
  await settle();
  assert.deepEqual(page.calls, ['enter:main']);
  page.document.focused = true;
  c.handle('app-focus');
  await settle();
  assert.deepEqual(page.calls, ['enter:main', 'exit']);
});

test('on Shorts the Shorts player is used, not a leftover watch player', async () => {
  const page = fakePage({ path: '/shorts/abc' });
  const watch = fakeVideo(page, 'watch');
  const shorts = fakeVideo(page, 'shorts');
  page.document.querySelector = (sel) =>
    ({ '#movie_player video.html5-main-video': watch, '#shorts-player video': shorts })[sel] ?? null;
  const c = controllerFor(page, { ...YTM_DEFAULTS, 'ytm-pip-shorts': true });
  page.document.hidden = true;
  c.handle('media-session');
  await settle();
  assert.deepEqual(page.calls, ['enter:shorts']);
});

test('a home-page hover preview never pops out', async () => {
  const page = fakePage({ path: '/' });
  const preview = fakeVideo(page, 'preview');
  page.document.querySelector = (sel) => (sel === 'video' ? preview : null);
  const c = controllerFor(page);
  page.document.hidden = true;
  c.handle('media-session');
  c.toggle();
  await settle();
  assert.deepEqual(page.calls, []);
});

test('prepare ignores videos that are not the player', () => {
  const page = fakePage();
  const main = fakeVideo(page, 'main');
  const preview = fakeVideo(page, 'preview');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? main : null);
  const c = controllerFor(page);
  c.prepare(preview);
  assert.equal(preview.autoPictureInPicture, undefined);
  c.prepare(main);
  assert.equal(main.autoPictureInPicture, true);
});

import { isPipKey } from '../src/pip/pip-controller.js';

const key = (k, extra = {}) => ({ key: k, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, target: { tagName: 'DIV', isContentEditable: false }, ...extra });

test('the pop-out key matches only a plain press outside text fields', () => {
  assert.equal(isPipKey(key('p'), 'P'), true);
  assert.equal(isPipKey(key('P'), 'P'), true);
  assert.equal(isPipKey(key('p', { shiftKey: true }), 'P'), false); // Shift+P is YouTube's "previous video"
  assert.equal(isPipKey(key('p', { ctrlKey: true }), 'P'), false);
  assert.equal(isPipKey(key('p', { altKey: true }), 'P'), false);
  assert.equal(isPipKey(key('p', { target: { tagName: 'INPUT' } }), 'P'), false);
  assert.equal(isPipKey(key('p', { target: { tagName: 'TEXTAREA' } }), 'P'), false);
  assert.equal(isPipKey(key('p', { target: { tagName: 'DIV', isContentEditable: true } }), 'P'), false);
  assert.equal(isPipKey(key('o'), 'P'), false);
  assert.equal(isPipKey(key('p'), ''), false); // key turned off
});

test('the pop-out key toggles: out, then back in', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  c.toggle();
  await settle();
  assert.deepEqual(page.calls, ['enter:main']);
  c.toggle();
  await settle();
  assert.deepEqual(page.calls, ['enter:main', 'exit']);
});

test('the pop-out key works even with auto pop-out off', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page, { ...YTM_DEFAULTS, 'ytm-pip-enabled': false });
  c.toggle();
  await settle();
  assert.deepEqual(page.calls, ['enter:main']);
});

test('focus signals that contradict the page focus are ignored (alt-tab flicker)', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.pictureInPictureElement = v;
  page.document.focused = false;
  c.handle('app-focus'); // arrives during alt-tab while the page is not focused
  await settle();
  assert.deepEqual(page.calls, []);
});

test('a window we did not open counts as Chrome\'s and gets the wait', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.pictureInPictureElement = v; // e.g. Chrome's own autoPictureInPicture
  c.handle('tab-visible');
  await settle();
  assert.deepEqual(page.calls, []);
  assert.equal(page.timers.at(-1).ms, CHROME_CLOSE_MS);
});

test('a late Chrome auto-PiP window also gets the wait', async () => {
  const page = fakePage();
  let finish;
  const v = {
    paused: false,
    ended: false,
    removeAttribute() {},
    requestPictureInPicture() {
      page.calls.push('enter:main');
      return new Promise((resolve) => {
        finish = () => {
          page.document.pictureInPictureElement = v;
          resolve();
        };
      });
    },
  };
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.hidden = true;
  c.handle('media-session');
  page.document.hidden = false;
  finish();
  await settle();
  await settle();
  assert.deepEqual(page.calls, ['enter:main'], 'no exit in the same instant');
  assert.equal(page.timers.at(-1).ms, CHROME_CLOSE_MS);
  page.runTimers();
  await settle();
  assert.deepEqual(page.calls, ['enter:main', 'exit']);
});

test('leaving again cancels a pending pop-back-in', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.hidden = true;
  c.handle('media-session');
  await settle();
  page.document.hidden = false;
  c.handle('tab-visible'); // first return: close scheduled
  page.document.hidden = true;
  c.handle('tab-hidden'); // leave again within the wait
  page.document.hidden = false;
  c.handle('tab-visible'); // second return: a new close scheduled
  const closes = page.timers.filter((t) => t.ms === CHROME_CLOSE_MS);
  assert.equal(closes.length, 2);
  closes[0].fn(); // the stale one from the first return
  await settle();
  assert.deepEqual(page.calls, ['enter:main'], 'stale close does nothing');
  closes[1].fn();
  await settle();
  assert.deepEqual(page.calls, ['enter:main', 'exit']);
});

test('once the window closes, the next one is no longer treated as ours', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  c.toggle(); // ours
  await settle();
  page.document.pictureInPictureElement = null;
  c.left(); // the window closed
  page.document.pictureInPictureElement = v; // a new window we did not open
  page.calls.length = 0;
  c.handle('tab-visible');
  await settle();
  assert.deepEqual(page.calls, [], 'waits for Chrome instead of closing at once');
});

test('a pop-out that finishes after coming back is closed at once', async () => {
  const page = fakePage();
  let finish;
  const v = {
    paused: false,
    ended: false,
    removeAttribute() {},
    requestPictureInPicture() {
      page.calls.push('enter:main');
      return new Promise((resolve) => {
        finish = () => {
          page.document.pictureInPictureElement = v;
          resolve();
        };
      });
    },
  };
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  // Like Chrome: exiting with no PiP window yet is refused.
  page.document.exitPictureInPicture = async () => {
    if (!page.document.pictureInPictureElement) throw new Error('InvalidStateError');
    page.calls.push('exit');
    page.document.pictureInPictureElement = null;
  };
  const c = controllerFor(page);
  page.document.hidden = true;
  c.handle('tab-hidden');
  page.runTimers(); // fallback fires; the request is still pending
  await settle();
  page.document.hidden = false;
  c.handle('tab-visible'); // not in PiP yet, so nothing to close
  await settle();
  finish(); // Chrome opens the window while the tab is in front
  await settle();
  await settle();
  assert.deepEqual(page.calls, ['enter:main', 'exit']);
  assert.equal(page.document.pictureInPictureElement, null);
});

test('a failed pop-back is retried once while the tab is in front', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  c.toggle(); // our own window, so it is closed without waiting for Chrome
  await settle();
  page.calls.length = 0;
  let fails = 1;
  page.document.exitPictureInPicture = async () => {
    page.calls.push('exit');
    if (fails-- > 0) throw new Error('InvalidStateError');
    page.document.pictureInPictureElement = null;
  };
  c.handle('tab-visible');
  await settle();
  assert.equal(page.timers[0].ms, RETRY_MS);
  page.runTimers();
  await settle();
  assert.deepEqual(page.calls, ['exit', 'exit']);
  assert.equal(page.document.pictureInPictureElement, null);
});

test('a Chrome auto-PiP window gets time to close itself before we step in', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.hidden = true;
  c.handle('media-session'); // Chrome's auto-PiP opens the window
  await settle();
  assert.deepEqual(page.calls, ['enter:main']);
  page.document.hidden = false;
  c.handle('tab-visible');
  await settle();
  assert.deepEqual(page.calls, ['enter:main'], 'no exit in the same instant as Chrome closing it');
  assert.equal(page.timers.at(-1).ms, CHROME_CLOSE_MS);
  page.document.pictureInPictureElement = null; // Chrome closed it itself
  page.runTimers();
  await settle();
  assert.deepEqual(page.calls, ['enter:main'], 'nothing left to close');
});

test('a Chrome auto-PiP window that Chrome leaves open is closed after the wait', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.hidden = true;
  c.handle('media-session');
  await settle();
  page.document.hidden = false;
  c.handle('tab-visible');
  page.runTimers();
  await settle();
  assert.deepEqual(page.calls, ['enter:main', 'exit']);
});

test('a window we opened ourselves is still closed at once', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  c.toggle(); // the P key
  await settle();
  page.document.hidden = false;
  c.handle('tab-visible');
  await settle();
  assert.deepEqual(page.calls, ['enter:main', 'exit']);
});
