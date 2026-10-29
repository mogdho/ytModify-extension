// ytModify: console-only error reporter. The original sent crash reports to a
// third-party error tracker; ytModify sends nothing off the machine.
export default class ErrorReporter {
  static captureException(ex) {
    console.error(ex);
  }
}
