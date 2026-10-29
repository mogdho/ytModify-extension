import { test } from 'node:test';
import assert from 'node:assert/strict';
import SettingsConfig, { WebGLOnlySettings } from '../src/ambient/scripts/libs/settings-config.js';
import { buildAmbientSections, filterSections, defaultValues } from '../src/popup/ambient-model.js';
import { DEFAULT_RUNTIME } from '../src/ambient/scripts/libs/settings-meta.js';

const defaults = defaultValues(SettingsConfig);
const build = (values = {}, opts = {}) =>
  buildAmbientSections(SettingsConfig, { ...defaults, ...values }, { runtime: DEFAULT_RUNTIME, ...opts });
const names = (sections) => sections.flatMap((s) => s.settings.map((e) => e.setting.name));

test('sections follow settings-config order', () => {
  const all = SettingsConfig.filter((s) => s.type === 'section').map((s) => s.label);
  const shown = build({ advancedSettings: true }).map((s) => s.label);
  assert.deepEqual(shown, all.filter((label) => shown.includes(label)));
  assert.ok(shown.includes('Ambient light'));
  assert.ok(shown.includes('General'));
});

test('advanced settings only show when Advanced is on', () => {
  const advancedNames = SettingsConfig.filter((s) => s.advanced && s.type !== 'section').map((s) => s.name);
  const off = names(build({ advancedSettings: false }));
  assert.ok(advancedNames.every((n) => !off.includes(n)));
  assert.ok(!build({ advancedSettings: false }).some((s) => s.label === 'Stats'));
  const on = names(build({ advancedSettings: true }));
  assert.ok(on.includes('showFPS'));
});

test('WebGL-only settings are disabled without WebGL', () => {
  const entries = build({ advancedSettings: true, webGL: false }).flatMap((s) => s.settings);
  for (const e of entries) {
    if (WebGLOnlySettings.includes(e.setting.name)) assert.equal(e.disabled, true, e.setting.name);
  }
});

test('optional settings hide when their condition is off', () => {
  assert.ok(!names(build({ frameBlending: false })).includes('frameBlendingSmoothness'));
  assert.ok(names(build({ frameBlending: true, frameSync: 0, advancedSettings: true })).includes('frameBlendingSmoothness'));
});

test('enabled is the master switch, not a row', () => {
  assert.ok(!names(build({ advancedSettings: true })).includes('enabled'));
});

test('controlled settings say what controls them', () => {
  const entries = build({ detectHorizontalBarSizeEnabled: true, advancedSettings: true }).flatMap((s) => s.settings);
  const clip = entries.find((e) => e.setting.name === 'horizontalBarsClipPercentage');
  assert.ok(clip.controlledBy);
});

test('spread max drops to 200 without WebGL', () => {
  const spread = build({ webGL: false }).flatMap((s) => s.settings).find((e) => e.setting.name === 'spread');
  assert.equal(spread.setting.max, 200);
  assert.equal(SettingsConfig.find((s) => s.name === 'spread').max === 200, false, 'config itself is not mutated');
});

test('search keeps matching settings and opens their sections', () => {
  const sections = filterSections(build({ advancedSettings: true }), 'blur');
  assert.ok(sections.length > 0);
  for (const s of sections) {
    assert.equal(s.collapsed, false);
    for (const e of s.settings) {
      assert.match(`${e.setting.label} ${e.setting.description ?? ''}`.toLowerCase(), /blur/);
    }
  }
});

test('search with no match is empty, blank search changes nothing', () => {
  assert.deepEqual(filterSections(build(), 'zzz'), []);
  const all = build();
  assert.equal(filterSections(all, '  '), all);
});

test('section collapsed state comes from values', () => {
  const s = build({ sectionAmbientlightCollapsed: false }).find((x) => x.label === 'Ambient light');
  assert.equal(s.collapsed, false);
  const c = build({ sectionAmbientlightCollapsed: true }).find((x) => x.label === 'Ambient light');
  assert.equal(c.collapsed, true);
});

import { buildExport, parseImport } from '../src/popup/ambient-model.js';

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

test('theme and page greyness are ordinary settings again', () => {
  const shown = names(build({ advancedSettings: true }));
  assert.ok(shown.includes('theme'));
  assert.ok(shown.includes('pageBackgroundGreyness'));
});
