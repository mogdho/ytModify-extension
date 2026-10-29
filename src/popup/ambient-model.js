// Pure model for the popup's Ambient tab: which sections and settings to show,
// built from Ambient light's own settings-config.js.
import { WebGLOnlySettings } from '../ambient/scripts/libs/settings-config.js';
import { CONTROLLED_SETTINGS, DEFAULT_RUNTIME, isOptionalSettingVisible } from '../ambient/scripts/libs/settings-meta.js';

// Shown as the tab's master switch instead of a row.
const MASTER = 'enabled';

// The settings the popup shows. Every other Ambient light setting stays at its
// saved or default value; it just isn't offered, to keep the tab simple.
export const AMBIENT_KEEP = new Set([
  'framerateLimit',
  'detectHorizontalBarSizeEnabled',
  'detectVerticalBarSizeEnabled',
  'detectVideoFillScaleEnabled',
  'brightness',
  'vibrance',
  'saturation',
  'blur2',
  'spread',
  'frameBlending',
  'frameBlendingSmoothness',
]);

export const defaultValues = (config) => Object.fromEntries(config.map((s) => [s.name, s.default]));

// Per-browser adjustment the page also makes (settings.js getStoredSettingsCached).
const adjust = (setting, values) => (setting.name === 'spread' && !values.webGL ? { ...setting, max: 200 } : setting);

/**
 * @param config SettingsConfig
 * @param values current setting values by name (stored, else default)
 * @param {{runtime?: object}} opts
 * @returns Array<{label, name, settings: Array<{setting, disabled, disabledReason?, controlledBy?}>}>
 */
export function buildAmbientSections(config, values, { runtime = DEFAULT_RUNTIME } = {}) {
  const sections = [];
  let current = null;

  for (const raw of config) {
    if (raw.type === 'section') {
      current = { label: raw.label, name: raw.name, settings: [] };
      sections.push(current);
      continue;
    }
    if (!current || raw.name === MASTER || !AMBIENT_KEEP.has(raw.name)) continue;

    const setting = adjust(raw, values);
    if (!isOptionalSettingVisible(setting.name, values, runtime)) continue;

    const entry = { setting, disabled: false };
    if (setting.disabled) {
      entry.disabled = true;
      entry.disabledReason = setting.disabled;
    } else if (!values.webGL && WebGLOnlySettings.includes(setting.name)) {
      entry.disabled = true;
      entry.disabledReason = 'Needs WebGL, which is turned off';
    }

    const controlled = CONTROLLED_SETTINGS.find((c) => c.name === setting.name);
    const controller = controlled?.controllers.find((name) => values[name] && AMBIENT_KEEP.has(name));
    if (controller) entry.controlledBy = config.find((s) => s.name === controller)?.label;

    current.settings.push(entry);
  }
  return sections.filter((s) => s.settings.length);
}

// Settings file export, in the same format as Ambient light's own options page:
// names without the "setting-" prefix, and blur2 written as "blur".
export function buildExport(stored, config) {
  const out = {};
  for (const [key, value] of Object.entries(stored)) {
    if (!key.startsWith('setting-')) continue;
    const name = key.slice('setting-'.length);
    if (!config.some((s) => s.name === name)) continue;
    out[name === 'blur2' ? 'blur' : name] = value;
  }
  return out;
}

// Settings file import, with the original's checks. Returns storage entries.
export function parseImport(json, config) {
  if (!json) throw new Error('No settings found to import');
  const imported = JSON.parse(json);
  if (!imported || typeof imported !== 'object') throw new Error('No settings found to import');
  if ('blur' in imported) {
    imported.blur2 = imported.blur;
    delete imported.blur;
  }

  const values = {};
  const warnings = [];
  for (const name of Object.keys(imported).sort()) {
    let value = imported[name];
    const setting = config.find((s) => s.name === name);
    if (!setting) {
      warnings.push(`Skipped "${name}": unknown setting.`);
      continue;
    }
    const { type, min = 0, step = 0.1, max } = setting;
    if (type === 'checkbox' || type === 'section') {
      if (typeof value !== 'boolean') {
        warnings.push(`Skipped "${name}": ${JSON.stringify(value)} is not a boolean.`);
        continue;
      }
    } else if (type === 'list') {
      if (typeof value !== 'number') {
        warnings.push(`Skipped "${name}": ${JSON.stringify(value)} is not a number.`);
        continue;
      }
      const left = ((value - min) * 1000) % (step * 1000);
      if (left !== 0) value = Math.round(value * 1000 - left) / 1000;
      if (value < min) value = min;
      if (max !== undefined && value > max) {
        warnings.push(`Clipped "${name}": ${value} is higher than the maximum of ${max}.`);
        value = max;
      }
    }
    values[`setting-${name}`] = value;
  }
  if (!Object.keys(values).length) throw new Error('No settings found to import');
  return { values, warnings };
}
