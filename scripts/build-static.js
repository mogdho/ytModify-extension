// Copies static files and compiles Sass into dist/, then writes the manifest.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as sass from 'sass';

const root = join(import.meta.dirname, '..');
const src = (p) => join(root, 'src', p);
const dist = (p) => join(root, 'dist', p);

// [from (under src/), to (under dist/)]
const STATIC = [
  ['images', 'images'],
  ['ambient/images', 'ambient/images'],
  ['popup/popup.html', 'popup/popup.html'],
  ['popup/popup.css', 'popup/popup.css'],
];

// [scss (under src/), css (under dist/)]
const SASS = [
  ['ambient/styles/content.scss', 'ambient/styles/content.css'],
  ['ambient/styles/live-chat.scss', 'ambient/styles/live-chat.css'],
];

for (const [from, to] of STATIC) {
  if (!existsSync(src(from))) continue;
  mkdirSync(dirname(dist(to)), { recursive: true });
  cpSync(src(from), dist(to), { recursive: true });
}

for (const [from, to] of SASS) {
  const { css } = sass.compile(src(from), { style: 'expanded', sourceMap: false });
  mkdirSync(dirname(dist(to)), { recursive: true });
  writeFileSync(dist(to), css);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(src('manifest.json'), 'utf8'));
manifest.version = pkg.version;
writeFileSync(dist('manifest.json'), JSON.stringify(manifest, null, 2));
