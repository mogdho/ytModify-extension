import { readFileSync } from 'node:fs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';

// Imports files under src/look/*.css as default-exported strings.
const cssAsString = () => ({
  name: 'css-as-string',
  transform(code, id) {
    if (!id.split('\\').join('/').includes('/src/look/') || !id.endsWith('.css')) return null;
    return { code: `export default ${JSON.stringify(code)};`, map: null };
  },
});

const entry = (input, file, format = 'iife', extra = {}) => ({
  input,
  context: 'window',
  output: { file, format, sourcemap: false, ...extra.output },
  plugins: [cssAsString(), resolve(), ...(extra.plugins ?? [])],
});

// Ambient light: same inputs and replacements as its original build.
const ambientIntro = readFileSync('src/ambient/scripts/intros/console.js', 'utf8').replace(
  /.*\/\/ eslint-disable.*/g,
  ''
);
const ambient = (name) =>
  entry(`src/ambient/scripts/${name}.js`, `dist/ambient/scripts/${name}.js`, 'iife', {
    output: { intro: ambientIntro },
    plugins: [
      replace({
        preventAssignment: true,
        values: { 'globalThis.BARDETECTION_EDGE_RANGE': '32' },
      }),
    ],
  });

export default [
  entry('src/background.js', 'dist/background.js', 'es'),
  entry('src/look/look-content.js', 'dist/look/look-content.js'),
  entry('src/pip/pip-main.js', 'dist/pip/pip-main.js'),
  entry('src/pip/pip-isolated.js', 'dist/pip/pip-isolated.js'),
  entry('src/quality/quality-main.js', 'dist/quality/quality-main.js'),
  ...['content', 'content-main', 'injected', 'live-chat'].map(ambient),
  entry('src/popup/popup.js', 'dist/popup/popup.js'),
];
