// Isolated-world relay: passes ytModify settings and the background "Chrome got
// focus" signal to the MAIN-world scripts, which can't read chrome.storage.
import { getStoredYtmSettings, isExtensionAlive, pipSettingsForPage, safeStorage } from '../shared/ytm-settings.js';

const post = (message) => window.postMessage({ source: 'ytm', ...message }, location.origin);

async function sendSettings() {
  const settings = await getStoredYtmSettings();
  post({ type: 'pip-settings', settings: pipSettingsForPage(isExtensionAlive(), settings) });
}

sendSettings();
// Re-send after each SPA navigation in case the MAIN script loaded late.
document.addEventListener('yt-navigate-finish', sendSettings);

safeStorage.onChanged((changes) => {
  if (Object.keys(changes).some((k) => k.startsWith('ytm-pip-') || k.startsWith('ytm-quality-'))) sendSettings();
});

try {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'ytm-pip-signal') post({ type: 'pip-signal', cause: message.cause });
  });
} catch {
  // Orphaned script.
}
