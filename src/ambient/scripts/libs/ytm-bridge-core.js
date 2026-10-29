// ytModify: pure helpers for the popup → Ambient light bridge (no DOM/chrome).

// The popup writes this key in the same storage.set() call as the settings it
// changes. Changes without it came from a page (e.g. auto-detected bar sizes)
// and must not be pushed into other tabs.
export const POPUP_ORIGIN_KEY = 'ytm-popup-origin';

const PREFIX = 'setting-';

/**
 * @param {object} changes chrome.storage.onChanged changes
 * @returns {Array<[string, any]>} [name, newValue] pairs; names keep a "-key" suffix for shortcut keys
 */
export function extractPopupChanges(changes) {
  if (!changes[POPUP_ORIGIN_KEY]) return [];
  const result = [];
  for (const [key, change] of Object.entries(changes)) {
    if (!key.startsWith(PREFIX)) continue;
    result.push([key.slice(PREFIX.length), change.newValue]);
  }
  return result;
}

// The popup asks the active tab for Ambient light's status with this message.
export const STATUS_MESSAGE = 'ytm-ambient-status';
export const NOT_LOADED_STATUS = Object.freeze({
  loaded: false,
  warning: null,
  info: null,
  webGLCrashed: false,
  webGLCrashText: null,
  runtime: null,
});

export const ambientStatus = (ambientlight) => ambientlight?.settings?.getStatus?.() ?? NOT_LOADED_STATUS;

// The page caches stored settings until Ambient light starts on a watch page.
// Popup changes made before then must drop that cache.
export const invalidatesSettingsCache = (changes) =>
  Object.keys(changes).some((key) => key.startsWith('setting-'));

