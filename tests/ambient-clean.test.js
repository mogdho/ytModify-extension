import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const FORBIDDEN = ['sentry', 'Sentry', 'storage.sync', 'ko-fi', 'docs.google.com/forms', 'setUninstallURL'];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(js|scss|css|html|json)$/.test(name)) yield path;
  }
}

test('ambient source exists', () => {
  assert.ok(existsSync(join(root, 'src/ambient/scripts/libs/ambientlight.js')));
});

for (const dir of ['src/ambient', 'dist']) {
  test(`no telemetry, sync or donate code in ${dir}`, () => {
    if (!existsSync(join(root, dir))) return;
    for (const file of walk(join(root, dir))) {
      const text = readFileSync(file, 'utf8');
      for (const word of FORBIDDEN) {
        assert.ok(!text.includes(word), `${word} found in ${file}`);
      }
    }
  });
}

test('code outside settings.js only uses Settings members that still exist', () => {
  const libs = join(root, 'src/ambient/scripts');
  const settingsSrc = readFileSync(join(libs, 'libs/settings.js'), 'utf8');
  const configSrc = readFileSync(join(libs, 'libs/settings-config.js'), 'utf8');
  const defined = new Set([
    ...[...settingsSrc.matchAll(/^  (?:async |static )?([A-Za-z_]\w*)\s*(?:=|\()/gm)].map((m) => m[1]),
    ...[...settingsSrc.matchAll(/this\.([A-Za-z_]\w*)\s*(?:\?\?)?=/g)].map((m) => m[1]),
    ...[...configSrc.matchAll(/name: '([^'.]+)/g)].map((m) => m[1]),
  ]);
  const missing = [];
  for (const file of walk(libs)) {
    if (file.endsWith('settings.js') || !file.endsWith('.js')) continue;
    for (const m of readFileSync(file, 'utf8').matchAll(/\bsettings\.([A-Za-z_]\w*)/g)) {
      if (m[1] === 'js') continue; // "settings.js" in comments
      if (!defined.has(m[1])) missing.push(`${m[1]} in ${file}`);
    }
  }
  assert.deepEqual(missing, []);
});
