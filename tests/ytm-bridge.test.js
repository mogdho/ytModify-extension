import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPopupChanges, POPUP_ORIGIN_KEY } from '../src/ambient/scripts/libs/ytm-bridge-core.js';

test('popup origin key name', () => {
  assert.equal(POPUP_ORIGIN_KEY, 'ytm-popup-origin');
});

test('page-originated writes are ignored', () => {
  assert.deepEqual(extractPopupChanges({ 'setting-blur2': { newValue: 40 } }), []);
});

test('popup-originated setting values are applied', () => {
  assert.deepEqual(
    extractPopupChanges({ 'setting-blur2': { newValue: 40 }, 'ytm-popup-origin': { newValue: 1 } }),
    [['blur2', 40]]
  );
});

test('dotted setting names survive', () => {
  assert.deepEqual(
    extractPopupChanges({ 'setting-videoScale.small': { newValue: 110 }, 'ytm-popup-origin': { newValue: 1 } }),
    [['videoScale.small', 110]]
  );
});

test('shortcut keys come through with a -key suffix', () => {
  assert.deepEqual(
    extractPopupChanges({ 'setting-enabled-key': { newValue: 'K' }, 'ytm-popup-origin': { newValue: 2 } }),
    [['enabled-key', 'K']]
  );
});

test('non-ambient keys are ignored', () => {
  assert.deepEqual(
    extractPopupChanges({ 'ytm-look-font': { newValue: false }, 'ytm-popup-origin': { newValue: 3 } }),
    []
  );
});

test('removed values (reset) come through as undefined', () => {
  assert.deepEqual(
    extractPopupChanges({ 'setting-blur2': { oldValue: 40 }, 'ytm-popup-origin': { newValue: 4 } }),
    [['blur2', undefined]]
  );
});

import { effectiveAmbientValue, DEEP_DARK_LOCKED } from '../src/ambient/scripts/libs/ytm-bridge-core.js';

test('Deep Dark locks theme and page greyness', () => {
  assert.deepEqual(DEEP_DARK_LOCKED, { theme: 1, pageBackgroundGreyness: 0 });
  assert.equal(effectiveAmbientValue('theme', -1, true), 1);
  assert.equal(effectiveAmbientValue('theme', -1, false), -1);
  assert.equal(effectiveAmbientValue('pageBackgroundGreyness', 20, true), 0);
  assert.equal(effectiveAmbientValue('pageBackgroundGreyness', 20, false), 20);
  assert.equal(effectiveAmbientValue('blur2', 30, true), 30);
});

import { ambientStatus, NOT_LOADED_STATUS, STATUS_MESSAGE } from '../src/ambient/scripts/libs/ytm-bridge-core.js';

test('status before Ambient light has loaded', () => {
  assert.equal(STATUS_MESSAGE, 'ytm-ambient-status');
  assert.deepEqual(ambientStatus(undefined), NOT_LOADED_STATUS);
  assert.deepEqual(ambientStatus(false), NOT_LOADED_STATUS);
  assert.equal(NOT_LOADED_STATUS.loaded, false);
  assert.equal(NOT_LOADED_STATUS.warning, null);
});

test('status comes from the page settings once loaded', () => {
  const status = { loaded: true, warning: 'x' };
  assert.equal(ambientStatus({ settings: { getStatus: () => status } }), status);
});
