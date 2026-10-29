// Pure helpers for the Look tab styles. No DOM or chrome.* access here.

export const ASSET_PLACEHOLDER = '__YTM_ASSET__';

// Same exclusions as Deep Dark's original Stylus regexp: youtube.com/(?!premium|howyoutubeworks)
export const isLookExcludedPath = (pathname) => /^\/(premium|howyoutubeworks)/.test(pathname);

const playerScale = (percent) => Number((1 + percent / 100).toFixed(2));

/**
 * @param settings ytModify settings (see getYtmSettings)
 * @param css {deepDark, sans, logo, bigger} raw stylesheet texts
 * @param assetBase URL that replaces __YTM_ASSET__ in Deep Dark (bundled images)
 * @returns Array<{id, text}> active styles, in injection order
 */
export function buildLookStyles(settings, css, assetBase = '') {
  const styles = [];
  if (settings['ytm-look-deep-dark']) {
    styles.push({ id: 'ytm-deep-dark', text: css.deepDark.split(ASSET_PLACEHOLDER).join(assetBase) });
    styles.push({
      id: 'ytm-accent',
      text: `:root {\n  --main-color: ${settings['ytm-look-accent']} !important;\n}`,
    });
  }
  if (settings['ytm-look-font']) styles.push({ id: 'ytm-sans', text: css.sans });
  if (settings['ytm-look-logo']) {
    // Deep Dark is dark even on a light-mode account, so the logo's
    // `html[dark]` (white text) version must always apply.
    const logo = settings['ytm-look-deep-dark'] ? css.logo.split('html[dark] ').join('html ') : css.logo;
    styles.push({ id: 'ytm-logo', text: logo });
  }
  if (settings['ytm-look-player-size'] === 'big') {
    const scale = playerScale(settings['ytm-look-player-scale']);
    styles.push({ id: 'ytm-bigger', text: `:root{--ytm-player-scale:${scale}}\n${css.bigger}` });
  }
  return styles;
}
