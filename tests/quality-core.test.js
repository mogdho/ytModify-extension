import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectView, wantedQuality, pickQuality, qualityRequest, QUALITY_LEVELS, QUALITY_LABELS } from '../src/quality/quality-core.js';
import { YTM_DEFAULTS as S } from '../src/shared/ytm-settings.js';

test('levels run low to high and all have labels', () => {
  assert.deepEqual(QUALITY_LEVELS, ['tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160']);
  for (const q of [...QUALITY_LEVELS, 'auto']) assert.ok(QUALITY_LABELS[q], q);
  assert.equal(QUALITY_LABELS.medium, '360p');
});

test('view detection: fullscreen wins over the mini player', () => {
  assert.equal(detectView({ fullscreen: true, mini: true }), 'fullscreen');
  assert.equal(detectView({ mini: true }), 'mini');
  assert.equal(detectView({}), 'normal');
});

test('each view has its own setting', () => {
  assert.equal(wantedQuality(S, 'normal'), 'hd720');
  assert.equal(wantedQuality(S, 'fullscreen'), 'hd1080');
  assert.equal(wantedQuality(S, 'mini'), 'medium');
});

test('never picks higher than chosen', () => {
  assert.equal(pickQuality('hd1080', ['hd720', 'large', 'medium', 'auto']), 'hd720');
  assert.equal(pickQuality('hd720', ['hd1080', 'hd720']), 'hd720');
});

test('falls back to the lowest when nothing is low enough', () => {
  assert.equal(pickQuality('medium', ['hd720', 'hd1080']), 'hd720');
});

test('no levels yet gives null; auto stays auto', () => {
  assert.equal(pickQuality('hd720', []), null);
  assert.equal(pickQuality('auto', ['hd720']), 'auto');
});

test('quality request', () => {
  const av = ['hd1080', 'hd720', 'medium', 'auto'];
  assert.deepEqual(qualityRequest({ settings: S, view: 'mini', available: av, forcedBefore: false }), { action: 'set', quality: 'medium' });
  assert.deepEqual(qualityRequest({ settings: { ...S, 'ytm-quality-enabled': false }, view: 'mini', available: av, forcedBefore: true }), { action: 'auto' });
  assert.deepEqual(qualityRequest({ settings: { ...S, 'ytm-quality-enabled': false }, view: 'mini', available: av, forcedBefore: false }), { action: 'none' });
  assert.deepEqual(qualityRequest({ settings: { ...S, 'ytm-quality-normal': 'auto' }, view: 'normal', available: av, forcedBefore: true }), { action: 'auto' });
  assert.deepEqual(qualityRequest({ settings: { ...S, 'ytm-quality-normal': 'auto' }, view: 'normal', available: av, forcedBefore: false }), { action: 'none' });
  assert.deepEqual(qualityRequest({ settings: S, view: 'normal', available: [], forcedBefore: false }), { action: 'none' });
});
