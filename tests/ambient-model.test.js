import { test } from 'node:test';
import assert from 'node:assert/strict';
import SettingsConfig, { WebGLOnlySettings } from '../src/ambient/scripts/libs/settings-config.js';
import { buildAmbientSections, defaultValues, AMBIENT_KEEP, buildExport, parseImport } from '../src/popup/ambient-model.js';
import { DEFAULT_RUNTIME } from '../src/ambient/scripts/libs/settings-meta.js';

const defaults = defaultValues(SettingsConfig);
const build = (values = {}, opts = {}) =>
  buildAmbientSections(SettingsConfig, { ...defaults, ...values }, { runtime: DEFAULT_RUNTIME, ...opts });
const names = (sections) => sections.flatMap((s) => s.settings.map((e) => e.setting.name));

const ESSENTIAL_DEFAULT = [
  'framerateLimit',
  'detectHorizontalBarSizeEnabled',
  'detectVerticalBarSizeEnabled',
  'detectVideoFillScaleEnabled',
  'brightness',
  'vibrance',
  'saturation',
  'blur2',
  'spread',
  'frameBlending',
  'enableInViews',
  'theme',
];

test('only the essential settings are shown, in settings-config order', () => {
  assert.deepEqual(names(build()), ESSENTIAL_DEFAULT);
});

test('the keep list is exactly the essential settings', () => {
  assert.deepEqual([...AMBIENT_KEEP].sort(), [...ESSENTIAL_DEFAULT, 'frameBlendingSmoothness'].sort());
});

test('essential settings show even when the original marks them advanced', () => {
  const shown = names(build({ advancedSettings: false, webGL: true }));
  assert.ok(shown.includes('saturation')); // advanced while WebGL is on
  assert.ok(shown.includes('frameBlending')); // advanced in the original
});

test('smooth motion strength appears only with smooth motion on', () => {
  assert.ok(!names(build({ frameBlending: false })).includes('frameBlendingSmoothness'));
  assert.ok(names(build({ frameBlending: true, frameSync: 0 })).includes('frameBlendingSmoothness'));
});

test('sections are only the ones with essential settings', () => {
  assert.deepEqual(
    build().map((s) => s.label),
    ['Quality', 'Remove black & colored bars', 'Filters', 'Ambient light', 'View modes', 'General']
  );
});

test('WebGL-only settings are disabled without WebGL', () => {
  const vibrance = build({ webGL: false }).flatMap((s) => s.settings).find((e) => e.setting.name === 'vibrance');
  assert.equal(vibrance?.disabled ?? true, true);
});

test('enabled is the master switch, not a row', () => {
  assert.ok(!names(build()).includes('enabled'));
});

test('spread max drops to 200 without WebGL', () => {
  const spread = build({ webGL: false }).flatMap((s) => s.settings).find((e) => e.setting.name === 'spread');
  assert.equal(spread.setting.max, 200);
  assert.equal(SettingsConfig.find((s) => s.name === 'spread').max === 200, false, 'config itself is not mutated');
});

test('export uses the original file format', () => {
  const out = buildExport({ 'setting-blur2': 30, 'setting-spread': 20, 'setting-gone': 1, 'ytm-look-font': true }, SettingsConfig);
  assert.deepEqual(out, { blur: 30, spread: 20 });
});

test('import validates, clips and maps blur to blur2', () => {
  const { values, warnings } = parseImport(JSON.stringify({ blur: 30, spread: 99999, enabled: 'yes', nope: 1, webGL: false }), SettingsConfig);
  assert.equal(values['setting-blur2'], 30);
  assert.equal(values['setting-spread'], SettingsConfig.find((s) => s.name === 'spread').max);
  assert.equal(values['setting-webGL'], false);
  assert.ok(!('setting-enabled' in values));
  assert.ok(!('setting-nope' in values));
  assert.equal(warnings.length, 3);
});

test('import of an empty or invalid file throws', () => {
  assert.throws(() => parseImport('', SettingsConfig));
  assert.throws(() => parseImport('{}', SettingsConfig));
  assert.throws(() => parseImport('not json', SettingsConfig));
});
