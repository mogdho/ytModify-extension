import { test } from 'node:test';
import assert from 'node:assert/strict';
import ErrorReporter from '../src/ambient/scripts/libs/errors/error-reporter.js';

test('logs at most 3 errors per page, with details', () => {
  const logged = [];
  const warned = [];
  const orig = { error: console.error, warn: console.warn };
  console.error = (...a) => logged.push(a);
  console.warn = (...a) => warned.push(a);
  try {
    ErrorReporter.overflowProtection = 0;
    const withDetails = Object.assign(new Error('a'), { details: { x: 1 } });
    ErrorReporter.captureException(withDetails);
    for (let i = 0; i < 10; i++) ErrorReporter.captureException(new Error(`e${i}`));
    assert.equal(logged.length, 3);
    assert.deepEqual(logged[0][1], { x: 1 });
    assert.equal(warned.length, 1);
  } finally {
    Object.assign(console, orig);
  }
});

test('ignores dead-object errors', () => {
  const logged = [];
  const orig = console.error;
  console.error = (...a) => logged.push(a);
  try {
    ErrorReporter.overflowProtection = 0;
    ErrorReporter.captureException(new Error("can't access dead object"));
    assert.equal(logged.length, 0);
  } finally {
    console.error = orig;
  }
});
