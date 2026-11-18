// Packs dist/ into dist/ytModify.zip for sharing (run after `npm run build`).
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dist = join(import.meta.dirname, '..', 'dist');
const zip = join(dist, 'ytModify.zip');
if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('dist/ is missing: run `npm run build` first.');
  process.exit(1);
}
rmSync(zip, { force: true });

const entries = readdirSync(dist);
// Windows ships bsdtar, which writes zip files; elsewhere use `zip`.
const [cmd, args] =
  process.platform === 'win32'
    ? [join(process.env.SystemRoot ?? 'C:\Windows', 'System32', 'tar.exe'), ['-a', '-c', '-f', 'ytModify.zip', ...entries]]
    : ['zip', ['-r', '-q', 'ytModify.zip', ...entries]];
const result = spawnSync(cmd, args, { cwd: dist, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Wrote dist/ytModify.zip');
