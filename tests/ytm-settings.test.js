import { test } from 'node:test';
import assert from 'node:assert/strict';
import { YTM_DEFAULTS, getYtmSettings, safeStorage } from '../src/shared/ytm-settings.js';

test('defaults match the spec', () => {
  assert.deepEqual(YTM_DEFAULTS, {
    'ytm-pip-enabled': true,
    'ytm-pip-tab-switch': true,
    'ytm-pip-return': true,
    'ytm-pip-shorts': false,
    'ytm-pip-key': 'P',
    'ytm-look-player-size': 'big',
    'ytm-look-player-scale': 15,
    'ytm-look-font': true,
    'ytm-look-logo': true,
    'ytm-quality-enabled': true,
    'ytm-quality-normal': 'hd720',
    'ytm-quality-fullscreen': 'hd1080',
    'ytm-quality-mini': 'medium',
    'ytm-popup-tab': 'pip',
  });
});

test('empty storage gives defaults', () => {
  assert.deepEqual(getYtmSettings({}), YTM_DEFAULTS);
});

test('valid stored scale is kept', () => {
  assert.equal(getYtmSettings({ 'ytm-look-player-scale': 22 })['ytm-look-player-scale'], 22);
});

test('wrong-type scale falls back to default', () => {
  assert.equal(getYtmSettings({ 'ytm-look-player-scale': 'x' })['ytm-look-player-scale'], 15);
});

test('out-of-range scale is clamped to 30', () => {
  assert.equal(getYtmSettings({ 'ytm-look-player-scale': 99 })['ytm-look-player-scale'], 30);
});

test('unknown player size falls back to big', () => {
  assert.equal(getYtmSettings({ 'ytm-look-player-size': 'huge' })['ytm-look-player-size'], 'big');
  assert.equal(getYtmSettings({ 'ytm-look-player-size': 'normal' })['ytm-look-player-size'], 'normal');
});

test('unknown popup tab falls back to pip', () => {
  assert.equal(getYtmSettings({ 'ytm-popup-tab': 'ambient' })['ytm-popup-tab'], 'ambient');
  assert.equal(getYtmSettings({ 'ytm-popup-tab': 'nope' })['ytm-popup-tab'], 'pip');
});

test('the removed app-switch option is gone', () => {
  assert.equal('ytm-pip-app-switch' in YTM_DEFAULTS, false);
});

test('unknown keys are ignored', () => {
  assert.equal('foo' in getYtmSettings({ foo: 1 }), false);
});

test('safeStorage is a no-op when the extension context is gone', async () => {
  globalThis.chrome = { runtime: {} };
  try {
    assert.deepEqual(await safeStorage.get(['a']), {});
    await safeStorage.set({ a: 1 });
    assert.doesNotThrow(() => safeStorage.onChanged(() => {}));
  } finally {
    delete globalThis.chrome;
  }
});

test('safeStorage reads through chrome.storage.local when alive', async () => {
  globalThis.chrome = {
    runtime: { id: 'x' },
    storage: { local: { get: async (keys) => ({ [keys[0]]: 5 }) } },
  };
  try {
    assert.deepEqual(await safeStorage.get(['a']), { a: 5 });
  } finally {
    delete globalThis.chrome;
  }
});

import { pipSettingsForPage, isExtensionAlive } from '../src/shared/ytm-settings.js';

test('an orphaned page script turns pop-out off instead of using defaults', () => {
  const on = { ...YTM_DEFAULTS, 'ytm-pip-enabled': true };
  assert.equal(pipSettingsForPage(true, on)['ytm-pip-enabled'], true);
  assert.equal(pipSettingsForPage(false, on)['ytm-pip-enabled'], false);
});

test('isExtensionAlive follows chrome.runtime.id', () => {
  globalThis.chrome = { runtime: {} };
  try {
    assert.equal(isExtensionAlive(), false);
    globalThis.chrome.runtime.id = 'x';
    assert.equal(isExtensionAlive(), true);
  } finally {
    delete globalThis.chrome;
  }
});

test('quality defaults and validation', () => {
  assert.equal(YTM_DEFAULTS['ytm-quality-enabled'], true);
  assert.equal(YTM_DEFAULTS['ytm-quality-normal'], 'hd720');
  assert.equal(YTM_DEFAULTS['ytm-quality-fullscreen'], 'hd1080');
  assert.equal(YTM_DEFAULTS['ytm-quality-mini'], 'medium');
  assert.equal(getYtmSettings({ 'ytm-quality-normal': 'bogus' })['ytm-quality-normal'], 'hd720');
  assert.equal(getYtmSettings({ 'ytm-quality-mini': 'auto' })['ytm-quality-mini'], 'auto');
});

test('an orphaned page script also stops forcing quality', () => {
  assert.equal(pipSettingsForPage(false, YTM_DEFAULTS)['ytm-quality-enabled'], false);
  assert.equal(pipSettingsForPage(true, YTM_DEFAULTS)['ytm-quality-enabled'], true);
});

test('popup can remember the Quality tab', () => {
  assert.equal(getYtmSettings({ 'ytm-popup-tab': 'quality' })['ytm-popup-tab'], 'quality');
});

test('pop-out key defaults to P; one letter/digit or empty (off)', () => {
  assert.equal(YTM_DEFAULTS['ytm-pip-key'], 'P');
  assert.equal(getYtmSettings({ 'ytm-pip-key': 'X' })['ytm-pip-key'], 'X');
  assert.equal(getYtmSettings({ 'ytm-pip-key': '' })['ytm-pip-key'], '');
  assert.equal(getYtmSettings({ 'ytm-pip-key': 'xy' })['ytm-pip-key'], 'P');
});

test('an orphaned page script also drops the pop-out key', () => {
  assert.equal(pipSettingsForPage(false, YTM_DEFAULTS)['ytm-pip-key'], '');
});

test('Deep Dark and accent settings are gone', () => {
  assert.equal('ytm-look-deep-dark' in YTM_DEFAULTS, false);
  assert.equal('ytm-look-accent' in YTM_DEFAULTS, false);
});
