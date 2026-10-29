import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLookStyles, isLookExcludedPath } from '../src/look/look.js';
import { YTM_DEFAULTS } from '../src/shared/ytm-settings.js';

const css = {
  deepDark: 'DD url(__YTM_ASSET__/404.png)',
  sans: 'SANS',
  logo: 'LOGO',
  bigger: 'BIG',
};
const ids = (styles) => styles.map((s) => s.id);
const byId = (styles, id) => styles.find((s) => s.id === id);

test('defaults enable every style in order', () => {
  assert.deepEqual(ids(buildLookStyles(YTM_DEFAULTS, css)), [
    'ytm-deep-dark',
    'ytm-accent',
    'ytm-sans',
    'ytm-logo',
    'ytm-bigger',
  ]);
});

test('accent overrides Deep Dark main colour on :root', () => {
  const text = byId(buildLookStyles(YTM_DEFAULTS, css), 'ytm-accent').text;
  assert.match(text, /^:root\s*\{/);
  assert.ok(text.includes('--main-color: #ff0033 !important'));
  const custom = byId(buildLookStyles({ ...YTM_DEFAULTS, 'ytm-look-accent': '#00ff88' }, css), 'ytm-accent');
  assert.ok(custom.text.includes('--main-color: #00ff88 !important'));
});

test('Deep Dark off removes theme and accent', () => {
  const out = ids(buildLookStyles({ ...YTM_DEFAULTS, 'ytm-look-deep-dark': false }, css));
  assert.ok(!out.includes('ytm-deep-dark'));
  assert.ok(!out.includes('ytm-accent'));
});

test('normal player size removes the bigger player', () => {
  const out = ids(buildLookStyles({ ...YTM_DEFAULTS, 'ytm-look-player-size': 'normal' }, css));
  assert.ok(!out.includes('ytm-bigger'));
});

test('font and logo switches remove their styles', () => {
  const out = ids(buildLookStyles({ ...YTM_DEFAULTS, 'ytm-look-font': false, 'ytm-look-logo': false }, css));
  assert.deepEqual(out, ['ytm-deep-dark', 'ytm-accent', 'ytm-bigger']);
});

test('player scale becomes a CSS multiplier', () => {
  const at = (scale) => byId(buildLookStyles({ ...YTM_DEFAULTS, 'ytm-look-player-scale': scale }, css), 'ytm-bigger').text;
  assert.ok(at(22).startsWith(':root{--ytm-player-scale:1.22}'));
  assert.ok(at(0).startsWith(':root{--ytm-player-scale:1}'));
  assert.ok(at(15).startsWith(':root{--ytm-player-scale:1.15}'));
  assert.ok(at(15).endsWith('BIG'));
});

test('asset placeholder is replaced with the bundled image base', () => {
  const dd = byId(buildLookStyles(YTM_DEFAULTS, css, 'chrome-extension://abc/look/images'), 'ytm-deep-dark');
  assert.equal(dd.text, 'DD url(chrome-extension://abc/look/images/404.png)');
});

test('premium and howyoutubeworks pages are excluded', () => {
  assert.equal(isLookExcludedPath('/premium'), true);
  assert.equal(isLookExcludedPath('/premium/x'), true);
  assert.equal(isLookExcludedPath('/howyoutubeworks/'), true);
  assert.equal(isLookExcludedPath('/watch'), false);
  assert.equal(isLookExcludedPath('/'), false);
  assert.equal(isLookExcludedPath('/premiumx'), true);
});
