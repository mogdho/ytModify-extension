// Pure rules for "fixed quality per view". No DOM access here.

// YouTube's quality names, low to high.
export const QUALITY_LEVELS = ['tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160'];

export const QUALITY_LABELS = {
  auto: 'Auto',
  tiny: '144p',
  small: '240p',
  medium: '360p',
  large: '480p',
  hd720: '720p',
  hd1080: '1080p',
  hd1440: '1440p',
  hd2160: '2160p (4K)',
};

// Theater mode and the pop-out window count as "normal".
export const detectView = ({ fullscreen = false, mini = false } = {}) =>
  fullscreen ? 'fullscreen' : mini ? 'mini' : 'normal';

export const wantedQuality = (settings, view) => settings[`ytm-quality-${view}`];

// Highest available quality not above the wanted one; if none is low enough,
// the lowest available. null while YouTube hasn't listed the levels yet.
export function pickQuality(wanted, available) {
  if (wanted === 'auto') return 'auto';
  const levels = QUALITY_LEVELS.filter((q) => available.includes(q));
  if (!levels.length) return null;
  const limit = QUALITY_LEVELS.indexOf(wanted);
  const allowed = levels.filter((q) => QUALITY_LEVELS.indexOf(q) <= limit);
  return allowed.length ? allowed[allowed.length - 1] : levels[0];
}

/**
 * @param {{settings, view, available: string[], forcedBefore: boolean}} input
 * @returns {{action: 'set', quality: string} | {action: 'auto'} | {action: 'none'}}
 */
export function qualityRequest({ settings, view, available, forcedBefore }) {
  const release = forcedBefore ? { action: 'auto' } : { action: 'none' };
  if (!settings['ytm-quality-enabled']) return release;
  const wanted = wantedQuality(settings, view);
  if (wanted === 'auto') return release;
  const quality = pickQuality(wanted, available);
  return quality ? { action: 'set', quality } : { action: 'none' };
}
