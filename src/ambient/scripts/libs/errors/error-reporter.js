// ytModify: console-only error reporter. The original sent crash reports to a
// third-party error tracker; ytModify sends nothing off the machine. It keeps
// the original's limit of 3 logged errors per page, so a failing render loop
// can't flood the console.
export default class ErrorReporter {
  static overflowProtection = 0;

  static captureException(ex) {
    try {
      // Firefox destroyed the page before the extension's script: nothing to fix.
      if (ex?.message?.includes?.(`can't access dead object`)) return;

      this.overflowProtection++;
      if (this.overflowProtection > 3) return;

      // DOMExceptions don't print their stack; copy it onto an Error.
      if (ex?.stack && ['[object DOMException]', '[object DOMError]'].includes(Object.prototype.toString.call(ex))) {
        const withStack = new Error(ex.message);
        withStack.code = ex.code;
        withStack.stack = ex.stack;
        withStack.name = ex.name;
        ex = withStack;
      }

      if (ex?.details) console.error(ex, ex.details);
      else console.error(ex);

      if (this.overflowProtection === 3) console.warn('Exception overflow protection enabled');
    } catch {
      // Never throw from the error reporter.
    }
  }
}
