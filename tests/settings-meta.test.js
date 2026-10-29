import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTROLLED_SETTINGS,
  OPTIONAL_SETTINGS,
  isOptionalSettingVisible,
  getSettingDisplayText,
  DEFAULT_RUNTIME,
} from '../src/ambient/scripts/libs/settings-meta.js';

const visible = (name, values, runtime = DEFAULT_RUNTIME) => isOptionalSettingVisible(name, values, runtime);

test('controlled settings match the original menu', () => {
  assert.deepEqual(
    CONTROLLED_SETTINGS.map((s) => [s.name, s.controllers]),
    [
      ['horizontalBarsClipPercentage', ['detectHorizontalBarSizeEnabled']],
      ['verticalBarsClipPercentage', ['detectVerticalBarSizeEnabled']],
      ['framerateLimit', ['frameBlending', 'frameFading']],
      ['frameBlending', ['frameFading']],
      ['frameFading', ['frameBlending']],
    ]
  );
});

test('frame blending smoothness needs frame blending and non-display sync', () => {
  assert.equal(visible('frameBlendingSmoothness', { frameBlending: true, frameSync: 0 }), true);
  assert.equal(visible('frameBlendingSmoothness', { frameBlending: false, frameSync: 0 }), false);
  assert.equal(visible('frameBlendingSmoothness', { frameBlending: true, frameSync: 1 }), false);
});

test('bar detection details need detection on', () => {
  assert.equal(visible('barSizeDetectionAverageHistorySize', { detectHorizontalBarSizeEnabled: false, detectVerticalBarSizeEnabled: false }), false);
  assert.equal(visible('barSizeDetectionAverageHistorySize', { detectHorizontalBarSizeEnabled: true }), true);
});

test('webGL-only group hides when WebGL is off', () => {
  for (const name of ['resolution', 'vibrance', 'frameFading', 'flickerReduction', 'fixedPosition']) {
    assert.equal(visible(name, { webGL: false }), false, name);
    assert.equal(visible(name, { webGL: true }), true, name);
  }
});

test('video scale shows only for the current view, or all when unknown', () => {
  assert.equal(visible('videoScale.SMALL', {}, { ...DEFAULT_RUNTIME, view: 'THEATER' }), false);
  assert.equal(visible('videoScale.THEATER', {}, { ...DEFAULT_RUNTIME, view: 'THEATER' }), true);
  assert.equal(visible('videoScale.FULLSCREEN', {}, DEFAULT_RUNTIME), true);
});

test('settings not in any optional group are always visible', () => {
  assert.equal(visible('blur2', {}), true);
  assert.ok(OPTIONAL_SETTINGS.every((g) => Array.isArray(g.names) && typeof g.visible === 'function'));
});

test('display text matches the original menu', () => {
  assert.equal(getSettingDisplayText({ name: 'framerateLimit' }, 0), 'max fps');
  assert.equal(getSettingDisplayText({ name: 'framerateLimit' }, 30), '30 fps');
  assert.equal(getSettingDisplayText({ name: 'frameFading' }, 0), 'Off');
  assert.equal(getSettingDisplayText({ name: 'frameSync' }, 1), 'Display framerate');
  assert.equal(getSettingDisplayText({ name: 'blur2' }, 40), '40%');
  assert.equal(getSettingDisplayText({ name: 'x', unit: 'px' }, 3), '3px');
  assert.equal(getSettingDisplayText({ name: 'barSizeDetectionAverageHistorySize' }, 1), '1 frame');
});
