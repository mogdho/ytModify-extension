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
