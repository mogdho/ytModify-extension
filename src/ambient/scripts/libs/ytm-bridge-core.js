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

// While ytModify's Deep Dark theme is on, Ambient light stays on its Dark theme
// (theme 1; on "Default" it paints the page white for light-mode accounts) and
// must not grey the page. These settings are forced (in memory only, so the saved
// values come back when Deep Dark is turned off).
export const DEEP_DARK_LOCKED = Object.freeze({ theme: 1, pageBackgroundGreyness: 0 });
export const DEEP_DARK_KEY = 'ytm-look-deep-dark';

export const effectiveAmbientValue = (name, stored, deepDarkOn) =>
  deepDarkOn && name in DEEP_DARK_LOCKED ? DEEP_DARK_LOCKED[name] : stored;

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
