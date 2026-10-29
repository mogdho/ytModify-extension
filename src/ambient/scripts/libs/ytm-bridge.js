// ytModify: applies setting changes made in the ytModify popup to this page's
// Ambient light, live, with the same side effects the old menu had.
import { storage } from './storage';
import { DEEP_DARK_KEY, DEEP_DARK_LOCKED, extractPopupChanges } from './ytm-bridge-core';
import { applySettingChange } from './settings-effects';

export function attachBridge(settings) {
  // Apply changes one at a time, in order; effects can be async.
  let queue = Promise.resolve();
  const enqueue = (fn) => {
    queue = queue.then(fn).catch((ex) => console.error(ex));
  };

  storage.addListener((changes) => {
    if (changes[DEEP_DARK_KEY]) {
      const on = changes[DEEP_DARK_KEY].newValue !== false;
      enqueue(() => settings.onDeepDarkChanged(on));
    }

    for (const [name, value] of extractPopupChanges(changes)) {
      enqueue(async () => {
        if (name.endsWith('-key')) {
          settings.setKey(name.slice(0, -'-key'.length), value);
          return;
        }
        if (settings.deepDarkOn && name in DEEP_DARK_LOCKED) {
          // Remember it for when Deep Dark is turned off; don't apply now.
          settings.unlockedValues[name] = settings.processStorageEntry(name, value);
          return;
        }
        await applySettingChange(settings, name, value);
      });
    }
  });
}
