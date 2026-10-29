// Test-only: lets Node resolve Ambient light's extensionless imports
// (`import x from './generic'`), which Rollup resolves at build time.
import { register } from 'node:module';

// Minimal browser globals that Ambient's generic.js touches at import time.
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {}, addListener() {} });
globalThis.window ??= globalThis;

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        try {
          return await next(specifier, context);
        } catch (err) {
          if (err.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !specifier.endsWith('.js')) {
            return next(specifier + '.js', context);
          }
          throw err;
        }
      }
    `)
);
