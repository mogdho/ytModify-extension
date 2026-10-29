import resolve from '@rollup/plugin-node-resolve';

// Imports files under src/look/*.css as default-exported strings.
const cssAsString = () => ({
  name: 'css-as-string',
  transform(code, id) {
    if (!id.split('\\').join('/').includes('/src/look/') || !id.endsWith('.css')) return null;
    return { code: `export default ${JSON.stringify(code)};`, map: null };
  },
});

const entry = (input, file, format = 'iife') => ({
  input,
  output: { file, format, sourcemap: false },
  plugins: [cssAsString(), resolve()],
});

export default [
  entry('src/background.js', 'dist/background.js', 'es'),
  entry('src/look/look-content.js', 'dist/look/look-content.js'),
  entry('src/pip/pip-main.js', 'dist/pip/pip-main.js'),
  entry('src/pip/pip-isolated.js', 'dist/pip/pip-isolated.js'),
];
