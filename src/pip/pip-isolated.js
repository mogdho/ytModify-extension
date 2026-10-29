// Isolated-world relay: passes PiP settings and background focus signals to
// the MAIN-world controller (pip-main.js), which can't read chrome.storage.
import { getStoredYtmSettings, safeStorage } from '../shared/ytm-settings.js';

const post = (message) => window.postMessage({ source: 'ytm', ...message }, location.origin);

async function sendSettings() {
  post({ type: 'pip-settings', settings: await getStoredYtmSettings() });
}

sendSettings();
// Re-send after each SPA navigation in case the MAIN script loaded late.
document.addEventListener('yt-navigate-finish', sendSettings);

safeStorage.onChanged((changes) => {
  if (Object.keys(changes).some((k) => k.startsWith('ytm-pip-'))) sendSettings();
});

try {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'ytm-pip-signal') post({ type: 'pip-signal', cause: message.cause });
  });
} catch {
  // Orphaned script.
}
