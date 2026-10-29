// Pure helpers for the Look tab styles. No DOM or chrome.* access here.

// YouTube's own Premium and "How YouTube works" pages are left untouched.
export const isLookExcludedPath = (pathname) => /^\/(premium|howyoutubeworks)/.test(pathname);

const playerScale = (percent) => Number((1 + percent / 100).toFixed(2));

/**
 * @param settings ytModify settings (see getYtmSettings)
 * @param css {sans, logo, bigger} raw stylesheet texts
 * @returns Array<{id, text}> active styles, in injection order
 */
export function buildLookStyles(settings, css) {
  const styles = [];
  if (settings['ytm-look-font']) styles.push({ id: 'ytm-sans', text: css.sans });
  if (settings['ytm-look-logo']) styles.push({ id: 'ytm-logo', text: css.logo });
  if (settings['ytm-look-player-size'] === 'big') {
    const scale = playerScale(settings['ytm-look-player-scale']);
    styles.push({ id: 'ytm-bigger', text: `:root{--ytm-player-scale:${scale}}\n${css.bigger}` });
  }
  return styles;
}
