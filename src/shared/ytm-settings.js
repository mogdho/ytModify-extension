// ytModify's own settings (PiP, Look, popup). Ambient light keeps its own
// `setting-<name>` keys; these all start with `ytm-`.

export const YTM_DEFAULTS = Object.freeze({
  'ytm-pip-enabled': true,
  'ytm-pip-tab-switch': true,
  'ytm-pip-return': true,
  'ytm-pip-shorts': false,
  'ytm-pip-key': 'P',
  'ytm-look-player-size': 'big',
  'ytm-look-player-scale': 15,
  'ytm-look-font': true,
  'ytm-look-logo': true,
  'ytm-quality-enabled': true,
  'ytm-quality-normal': 'hd720',
  'ytm-quality-fullscreen': 'hd1080',
  'ytm-quality-mini': 'medium',
  'ytm-popup-tab': 'pip',
});

const QUALITY_VALUES = ['auto', 'tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160'];

export const PLAYER_SCALE_MIN = 0;
export const PLAYER_SCALE_MAX = 30;

const oneOf = (...allowed) => (v) => (allowed.includes(v) ? v : undefined);

// Each returns the cleaned value, or undefined to use the default.
const VALIDATORS = {
  'ytm-look-player-size': oneOf('big', 'normal'),
  'ytm-look-player-scale': (v) =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.min(PLAYER_SCALE_MAX, Math.max(PLAYER_SCALE_MIN, Math.round(v)))
      : undefined,
  'ytm-pip-key': (v) => (typeof v === 'string' && /^[A-Z0-9]?$/.test(v) ? v : undefined),
  'ytm-popup-tab': oneOf('pip', 'look', 'quality', 'ambient'),
  'ytm-quality-normal': oneOf(...QUALITY_VALUES),
  'ytm-quality-fullscreen': oneOf(...QUALITY_VALUES),
  'ytm-quality-mini': oneOf(...QUALITY_VALUES),
};

const validate = (key, value) => {
  const check = VALIDATORS[key];
  if (check) return check(value);
  return typeof value === typeof YTM_DEFAULTS[key] ? value : undefined;
};

export function getYtmSettings(stored = {}) {
  const settings = { ...YTM_DEFAULTS };
  for (const key of Object.keys(YTM_DEFAULTS)) {
    if (!(key in stored)) continue;
    const value = validate(key, stored[key]);
    if (value !== undefined) settings[key] = value;
  }
  return settings;
}

// chrome.storage.local wrappers that never throw once the extension has been
// reloaded or removed while a YouTube tab keeps the old script running.
const alive = () => {
  try {
    return !!globalThis.chrome?.runtime?.id;
  } catch {
    return false;
  }
};

export const safeStorage = {
  async get(keys) {
    if (!alive()) return {};
    try {
      return (await chrome.storage.local.get(keys)) ?? {};
    } catch {
      return {};
    }
  },
  async set(values) {
    if (!alive()) return;
    try {
      await chrome.storage.local.set(values);
    } catch {
      // Extension context went away mid-call.
    }
  },
  onChanged(handler) {
    if (!alive()) return;
    try {
      chrome.storage.local.onChanged.addListener((changes) => {
        if (alive()) handler(changes);
      });
    } catch {
      // Ignore.
    }
  },
};

export const getStoredYtmSettings = async () =>
  getYtmSettings(await safeStorage.get(Object.keys(YTM_DEFAULTS)));

export const isExtensionAlive = alive;

// What the page's PiP controller should use. After ytModify is reloaded or
// turned off, an old script can't read storage any more; it must switch
// pop-out off rather than fall back to the defaults.
export const pipSettingsForPage = (extensionAlive, settings) =>
  extensionAlive ? settings : { ...settings, 'ytm-pip-enabled': false, 'ytm-pip-key': '', 'ytm-quality-enabled': false };
