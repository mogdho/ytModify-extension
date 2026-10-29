// ytModify: applies setting changes made in the ytModify popup to this page's
// Ambient light, live, with the same side effects the old menu had.
import { storage } from './storage';
import { extractPopupChanges } from './ytm-bridge-core';
import { applySettingChange } from './settings-effects';

export function attachBridge(settings) {
  // Apply changes one at a time, in order; effects can be async.
  let queue = Promise.resolve();
  storage.addListener((changes) => {
    for (const [name, value] of extractPopupChanges(changes)) {
      queue = queue
        .then(async () => {
          if (name.endsWith('-key')) {
            settings.setKey(name.slice(0, -'-key'.length), value);
            return;
          }
          await applySettingChange(settings, name, value);
        })
        .catch((ex) => console.error(ex));
    }
  });
}
