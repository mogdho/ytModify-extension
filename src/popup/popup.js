// ytModify popup: tab bar + the three tabs.
import { getStoredYtmSettings, safeStorage } from '../shared/ytm-settings.js';
import { renderPipTab } from './tab-pip.js';
import { renderLookTab } from './tab-look.js';
import { renderAmbientTab } from './tab-ambient.js';

const TABS = ['pip', 'look', 'ambient'];

const save = (key, value) => safeStorage.set({ [key]: value });

function selectTab(name) {
  for (const tab of TABS) {
    const selected = tab === name;
    document.getElementById(`tab-${tab}`).setAttribute('aria-selected', String(selected));
    document.getElementById(`panel-${tab}`).hidden = !selected;
  }
}

async function main() {
  const settings = await getStoredYtmSettings();

  const updatePip = renderPipTab(document.getElementById('panel-pip'), settings, save);
  const updateLook = renderLookTab(document.getElementById('panel-look'), settings, save);
  await renderAmbientTab(document.getElementById('panel-ambient'), settings);

  for (const tab of TABS) {
    document.getElementById(`tab-${tab}`).addEventListener('click', () => {
      selectTab(tab);
      save('ytm-popup-tab', tab);
    });
  }
  selectTab(settings['ytm-popup-tab']);

  safeStorage.onChanged(async (changes) => {
    if (!Object.keys(changes).some((k) => k.startsWith('ytm-pip-') || k.startsWith('ytm-look-'))) return;
    const next = await getStoredYtmSettings();
    updatePip(next);
    updateLook(next);
  });
}

main();
