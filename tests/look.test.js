import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLookStyles, isLookExcludedPath } from '../src/look/look.js';
import { YTM_DEFAULTS } from '../src/shared/ytm-settings.js';

const css = { sans: 'SANS', logo: 'a{x:light} html[dark] a{x:dark}', bigger: 'BIG' };
const ids = (styles) => styles.map((s) => s.id);
const byId = (styles, id) => styles.find((s) => s.id === id);

test('defaults enable every style in order', () => {
  assert.deepEqual(ids(buildLookStyles(YTM_DEFAULTS, css)), ['ytm-sans', 'ytm-logo', 'ytm-bigger']);
});

test('there is no Deep Dark theme any more', () => {
  const out = ids(buildLookStyles({ ...YTM_DEFAULTS, 'ytm-look-deep-dark': true }, css));
  assert.ok(!out.includes('ytm-deep-dark'));
  assert.ok(!out.includes('ytm-accent'));
});

test('the logo follows YouTube’s own light/dark theme', () => {
  assert.equal(byId(buildLookStyles(YTM_DEFAULTS, css), 'ytm-logo').text, css.logo);
});

test('normal player size removes the bigger player', () => {
  const out = ids(buildLookStyles({ ...YTM_DEFAULTS, 'ytm-look-player-size': 'normal' }, css));
  assert.ok(!out.includes('ytm-bigger'));
});

test('font and logo switches remove their styles', () => {
  const out = ids(buildLookStyles({ ...YTM_DEFAULTS, 'ytm-look-font': false, 'ytm-look-logo': false }, css));
  assert.deepEqual(out, ['ytm-bigger']);
});

test('player scale becomes a CSS multiplier', () => {
  const at = (scale) => byId(buildLookStyles({ ...YTM_DEFAULTS, 'ytm-look-player-scale': scale }, css), 'ytm-bigger').text;
  assert.ok(at(22).startsWith(':root{--ytm-player-scale:1.22}'));
  assert.ok(at(0).startsWith(':root{--ytm-player-scale:1}'));
  assert.ok(at(15).startsWith(':root{--ytm-player-scale:1.15}'));
  assert.ok(at(15).endsWith('BIG'));
});

test('premium and howyoutubeworks pages are excluded', () => {
  assert.equal(isLookExcludedPath('/premium'), true);
  assert.equal(isLookExcludedPath('/premium/x'), true);
  assert.equal(isLookExcludedPath('/howyoutubeworks/'), true);
  assert.equal(isLookExcludedPath('/watch'), false);
  assert.equal(isLookExcludedPath('/'), false);
});
