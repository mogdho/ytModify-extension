import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPipController, FALLBACK_MS, RETRY_MS } from '../src/pip/pip-controller.js';
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

test('app switch enters at once and returning exits', async () => {
  const page = fakePage();
  const v = fakeVideo(page, 'main');
  page.document.querySelector = (sel) => (sel === '#movie_player video.html5-main-video' ? v : null);
  const c = controllerFor(page);
  page.document.focused = false;
  c.handle('app-blur');
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
  page.document.focused = false;
  c.handle('app-blur');
  await settle();
  assert.deepEqual(page.calls, ['enter:shorts']);
});

test('a home-page hover preview never pops out', async () => {
  const page = fakePage({ path: '/' });
  const preview = fakeVideo(page, 'preview');
  page.document.querySelector = (sel) => (sel === 'video' ? preview : null);
  const c = controllerFor(page);
  page.document.focused = false;
  c.handle('app-blur');
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
