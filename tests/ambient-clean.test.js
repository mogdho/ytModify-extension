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
