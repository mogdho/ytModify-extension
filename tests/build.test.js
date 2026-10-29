import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');

test('dist manifest is valid', () => {
  execSync('npm run build', { cwd: root, stdio: 'pipe' });
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'ytModify');
  assert.equal(manifest.version, '1.0.0');
  assert.equal(manifest.action.default_popup, 'popup/popup.html');
  assert.deepEqual(manifest.permissions, ['storage', 'scripting', 'tabs']);

  const files = [manifest.background.service_worker];
  for (const cs of manifest.content_scripts ?? []) {
    files.push(...(cs.js ?? []), ...(cs.css ?? []));
  }
  for (const icon of Object.values(manifest.icons)) files.push(icon);
  for (const war of manifest.web_accessible_resources ?? []) {
    files.push(...war.resources);
  }
  files.push(manifest.action.default_popup);

  for (const file of files) {
    assert.ok(existsSync(join(dist, file)), `missing in dist: ${file}`);
  }
});
