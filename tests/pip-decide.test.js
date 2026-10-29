import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidePip } from '../src/pip/pip-decide.js';
import { YTM_DEFAULTS as S } from '../src/shared/ytm-settings.js';

const playing = { paused: false, ended: false, isShorts: false, isAd: false };
const d = (cause, { settings = {}, video = {}, inPip = false } = {}) =>
  decidePip({ cause, settings: { ...S, ...settings }, video: { ...playing, ...video }, inPip });

test('playing video pops out on tab hide', () => {
  assert.equal(d('tab-hidden'), 'enter');
});

test('paused video never pops out', () => {
  assert.equal(d('tab-hidden', { video: { paused: true } }), 'none');
});

test('ended video never pops out', () => {
  assert.equal(d('tab-hidden', { video: { ended: true } }), 'none');
});

test('ad playing does not pop out', () => {
  assert.equal(d('tab-hidden', { video: { isAd: true } }), 'none');
});

test('shorts only pop out when enabled', () => {
  assert.equal(d('tab-hidden', { video: { isShorts: true } }), 'none');
  assert.equal(d('tab-hidden', { video: { isShorts: true }, settings: { 'ytm-pip-shorts': true } }), 'enter');
});

test('tab-switch toggle off blocks tab hide', () => {
  assert.equal(d('tab-hidden', { settings: { 'ytm-pip-tab-switch': false } }), 'none');
});

test('switching to another app never pops out by itself', () => {
  assert.equal(d('app-blur'), 'none');
});

test('master switch off blocks every cause', () => {
  for (const cause of ['tab-hidden', 'tab-visible', 'app-focus', 'media-session']) {
    assert.equal(d(cause, { settings: { 'ytm-pip-enabled': false }, inPip: true }), 'none', cause);
  }
});

test('returning exits pip unless pop-back-in is off', () => {
  assert.equal(d('tab-visible', { inPip: true }), 'exit');
  assert.equal(d('app-focus', { inPip: true }), 'exit');
  assert.equal(d('tab-visible', { inPip: true, settings: { 'ytm-pip-return': false } }), 'none');
  assert.equal(d('tab-visible', { inPip: false }), 'none');
});

test('no double enter while already in pip', () => {
  assert.equal(d('tab-hidden', { inPip: true }), 'none');
});

test('media-session follows tab-hidden rules', () => {
  assert.equal(d('media-session'), 'enter');
  assert.equal(d('media-session', { video: { paused: true } }), 'none');
  assert.equal(d('media-session', { settings: { 'ytm-pip-tab-switch': false } }), 'none');
});
