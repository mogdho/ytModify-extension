// Isolated-world content script: injects the Look styles and keeps them in
// sync with the popup, without reloading the page.
import sans from './youtube-sans.css';
import logo from './premium-logo.css';
import bigger from './bigger-player.css';
import { buildLookStyles, isLookExcludedPath } from './look.js';
import { getStoredYtmSettings, safeStorage } from '../shared/ytm-settings.js';

const CSS = { sans, logo, bigger };
const ALL_IDS = ['ytm-sans', 'ytm-logo', 'ytm-bigger'];

let current = null;

function render() {
  if (!current) return;
  const styles = isLookExcludedPath(location.pathname) ? [] : buildLookStyles(current, CSS);
  const root = document.documentElement;
  const wanted = new Set(styles.map((s) => s.id));

  for (const id of ALL_IDS) {
    if (!wanted.has(id)) document.getElementById(id)?.remove();
  }
  for (const { id, text } of styles) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
    }
    if (el.textContent !== text) el.textContent = text;
    // Re-append keeps our styles after anything YouTube added, so they win ties.
    root.appendChild(el);
  }
}

async function refresh() {
  current = await getStoredYtmSettings();
  render();
}

refresh();

safeStorage.onChanged((changes) => {
  if (Object.keys(changes).some((k) => k.startsWith('ytm-look-'))) refresh();
});

// YouTube is a single-page app: re-check the excluded paths after navigation.
document.addEventListener('yt-navigate-finish', render);
