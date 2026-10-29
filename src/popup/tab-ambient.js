// Ambient tab: every Ambient light setting, with search, sections, shortcut
// keys, status of the current tab, and file import/export.
import SettingsConfig, { prepareSettingsConfigOnce } from '../ambient/scripts/libs/settings-config.js';
import { getSettingDisplayText, derivedWrites } from '../ambient/scripts/libs/settings-meta.js';
import { POPUP_ORIGIN_KEY, STATUS_MESSAGE } from '../ambient/scripts/libs/ytm-bridge-core.js';
import { buildAmbientSections, filterSections, buildExport, parseImport } from './ambient-model.js';
import { el, switchRow, sliderRow, debounce } from './ui.js';
import { safeStorage } from '../shared/ytm-settings.js';

const KEY = (name) => `setting-${name}`;
const configOf = (name) => SettingsConfig.find((s) => s.name === name);

// Writes go through the bridge: one set() call carrying the origin marker.
const writeSettings = (entries) => safeStorage.set({ ...entries, [POPUP_ORIGIN_KEY]: Date.now() + Math.random() });

function readValues(stored) {
  const values = {};
  for (const s of SettingsConfig) {
    const raw = stored[KEY(s.name)];
    if (raw == null) values[s.name] = s.default;
    else if (s.type === 'checkbox' || s.type === 'section') values[s.name] = raw === true || raw === 'true';
    else values[s.name] = parseFloat(raw);
  }
  return values;
}

const readKeys = (stored) =>
  Object.fromEntries(
    SettingsConfig.filter((s) => s.defaultKey !== undefined).map((s) => [s.name, stored[KEY(`${s.name}-key`)] ?? s.defaultKey])
  );

async function activeTabStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.startsWith('https://www.youtube.com/')) return { noTab: true };
    return (await chrome.tabs.sendMessage(tab.id, { type: STATUS_MESSAGE })) ?? { loaded: false };
  } catch {
    return { loaded: false };
  }
}

export async function renderAmbientTab(root) {
  prepareSettingsConfigOnce();

  let stored = await safeStorage.get(null);
  let status = await activeTabStatus();
  let query = '';
  let lastSignature = '';
  const updaters = new Map(); // setting name → (values, keys) => void

  // One change plus the linked settings the old menu changed with it.
  const writeSetting = (name, value) =>
    writeSettings(
      Object.fromEntries(
        Object.entries(derivedWrites(SettingsConfig, name, value, readValues(stored))).map(([n, v]) => [KEY(n), v])
      )
    );
  const resetSetting = (name) => writeSetting(name, configOf(name).default);

  const master = switchRow({
    label: 'Ambient light',
    hint: 'Glow around the video',
    checked: readValues(stored).enabled,
    onChange: (v) => writeSetting('enabled', v),
  });
  const masterKey = keyField('enabled', 'Ambient light', readKeys(stored).enabled);
  master.row.insertBefore(masterKey.input, master.row.lastElementChild);
  const statusBox = el('div', { class: 'status', role: 'status', hidden: true });
  const search = el('input', {
    class: 'search',
    type: 'search',
    placeholder: 'Search settings…',
    'aria-label': 'Search Ambient light settings',
    oninput: () => {
      query = search.value;
      render(true);
    },
  });
  const list = el('div', { class: 'sections' });
  const footer = renderFooter(() => stored);
  root.replaceChildren(master.row, statusBox, el('div', { class: 'search-row' }, search), list, footer);

  function renderStatus() {
    const lines = [];
    if (status.noTab) lines.push(['muted', 'Open a YouTube video to see Ambient light’s status.']);
    else if (!status.loaded && !status.warning) lines.push(['muted', 'Ambient light is waiting for the video to load.']);
    if (status.warning) lines.push(['warn', status.warning]);
    if (status.webGLCrashText) lines.push(['warn', status.webGLCrashText]);
    if (status.info) lines.push(['muted', status.info]);
    statusBox.replaceChildren(...lines.map(([kind, text]) => el('p', { class: `status__line status__line--${kind}` }, text)));
    statusBox.hidden = !lines.length;
  }

  function render(force = false) {
    const values = readValues(stored);
    const keys = readKeys(stored);
    const sections = filterSections(
      buildAmbientSections(SettingsConfig, values, { runtime: status.runtime ?? undefined }),
      query
    );
    master.set(values.enabled);
    masterKey.set(keys.enabled);

    // Rebuild only when the set of rows changes; otherwise update in place so
    // a slider being dragged keeps working.
    const signature = JSON.stringify(
      sections.map((s) => [s.name, s.collapsed, s.settings.map((e) => [e.setting.name, e.disabled, e.controlledBy, e.setting.max])])
    );
    if (!force && signature === lastSignature) {
      for (const update of updaters.values()) update(values, keys);
      return;
    }
    lastSignature = signature;
    updaters.clear();

    if (!sections.length) {
      list.replaceChildren(el('p', { class: 'empty' }, query ? `No settings match “${query}”.` : 'No settings.'));
      return;
    }
    list.replaceChildren(
      ...sections.map((section) => {
        const header = el(
          'button',
          {
            type: 'button',
            class: 'section__head',
            'aria-expanded': String(!section.collapsed),
            onclick: () => {
              if (query) return;
              // Section state isn't page state: no origin marker needed.
              safeStorage.set({ [KEY(section.name)]: !section.collapsed });
            },
          },
          el('span', {}, section.label),
          el('span', { class: 'section__chevron', 'aria-hidden': 'true' }, section.collapsed ? '▸' : '▾')
        );
        const body = el('div', { class: 'section__body', hidden: section.collapsed });
        for (const entry of section.settings) body.append(renderSetting(entry, values, keys));
        return el('div', { class: 'section' }, header, body);
      })
    );
  }

  function renderSetting({ setting, disabled, disabledReason, controlledBy }, values, keys) {
    const title =
      [setting.description, setting.questionMark?.title, disabledReason, controlledBy && `Controlled by "${controlledBy}". Adjusting this turns "${controlledBy}" off.`]
        .filter(Boolean)
        .join('\n\n') || undefined;
    const hint = controlledBy ? `Controlled by ${controlledBy}` : setting.description;
    const label = setting.label;
    let row;

    if (setting.type === 'checkbox') {
      const control = switchRow({ label, hint, title, checked: values[setting.name], onChange: (v) => writeSetting(setting.name, v) });
      control.setDisabled(disabled);
      control.row.addEventListener('dblclick', () => resetSetting(setting.name));
      updaters.set(setting.name, (v) => control.set(v[setting.name]));
      row = control.row;
    } else {
      const points = setting.valuePoints;
      const toSlider = (value) => (points ? Math.max(0, points.indexOf(value)) : value);
      const fromSlider = (pos) => (points ? points[pos] : pos);
      const listId = setting.snapPoints ? `snap-${setting.name.replace(/\W/g, '-')}` : undefined;
      const save = debounce((pos) => writeSetting(setting.name, fromSlider(pos)), 120);
      const control = sliderRow({
        label,
        hint,
        title,
        min: points ? 0 : setting.min ?? 0,
        max: points ? points.length - 1 : setting.max,
        step: points ? 1 : setting.step ?? 0.1,
        value: toSlider(values[setting.name]),
        format: (pos) => getSettingDisplayText(setting, fromSlider(pos)),
        onInput: save,
        list: listId,
      });
      control.setDisabled(disabled);
      control.input.addEventListener('dblclick', () => resetSetting(setting.name));
      if (setting.snapPoints) {
        control.row.append(
          el('datalist', { id: listId }, setting.snapPoints.map((p) => el('option', { value: toSlider(p.value), label: p.label })))
        );
      }
      let manual;
      if (setting.manualinput) {
        manual = el('input', {
          type: 'number',
          class: 'manual',
          min: setting.min,
          max: setting.max,
          step: setting.step,
          value: values[setting.name],
          'aria-label': `${label} value`,
          onchange: () => manual.value !== '' && writeSetting(setting.name, Number(manual.value)),
        });
        control.row.querySelector('.slider').prepend(manual);
      }
      updaters.set(setting.name, (v) => {
        if (document.activeElement !== control.input) control.set(toSlider(v[setting.name]));
        if (manual && document.activeElement !== manual) manual.value = v[setting.name];
      });
      row = control.row;
    }

    if (setting.defaultKey !== undefined) {
      const field = keyField(setting.name, label, keys[setting.name]);
      row.insertBefore(field.input, row.lastElementChild);
      const previous = updaters.get(setting.name);
      updaters.set(setting.name, (v, k) => {
        previous?.(v, k);
        field.set(k[setting.name]);
      });
    }
    if (setting.new) row.querySelector('.row__label > span')?.append(el('span', { class: 'badge' }, 'new'));
    if (setting.experimental) row.querySelector('.row__label > span')?.append(el('span', { class: 'badge' }, 'experimental'));
    return row;
  }

  renderStatus();
  render(true);

  safeStorage.onChanged(async (changes) => {
    if (!Object.keys(changes).some((k) => k.startsWith('setting-'))) return;
    stored = await safeStorage.get(null);
    render();
  });
  // Refresh the status while the popup is open (e.g. video finished loading).
  setInterval(async () => {
    status = await activeTabStatus();
    renderStatus();
    render();
  }, 2000);
}

// A one-letter shortcut key field: click it, press a key.
function keyField(name, label, value) {
  const input = el('input', {
    class: 'key',
    value,
    maxlength: 1,
    'aria-label': `Shortcut key for ${label}`,
    title: 'Shortcut key. Click and press a key to change it.',
    readOnly: true,
    onkeydown: (e) => {
      if (e.key === 'Tab') return;
      e.preventDefault();
      const key = e.key.length === 1 ? e.key.toUpperCase() : ' ';
      input.value = key;
      input.blur();
      writeSettings({ [KEY(`${name}-key`)]: key });
    },
  });
  return {
    input,
    set: (v) => {
      if (document.activeElement !== input) input.value = v;
    },
  };
}

function renderFooter(getStored) {
  const message = el('p', { class: 'footer__msg', role: 'status' });
  const fileInput = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  const say = (text, isError = false) => {
    message.textContent = text;
    message.classList.toggle('is-error', isError);
  };

  const exportBtn = el('button', {
    type: 'button',
    class: 'btn',
    onclick: () => {
      const data = buildExport(getStored(), SettingsConfig);
      if (!Object.keys(data).length) return say('Nothing to export: all settings are at their defaults.');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      el('a', { href: url, download: 'ytmodify-ambient-settings.json' }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say('Exported.');
    },
  }, 'Export');

  const importBtn = el('button', { type: 'button', class: 'btn', onclick: () => fileInput.click() }, 'Import');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const { values, warnings } = parseImport(await file.text(), SettingsConfig);
      await writeSettings(values);
      say(`Imported ${Object.keys(values).length} settings${warnings.length ? `. ${warnings.length} skipped or adjusted.` : '.'}`);
    } catch (ex) {
      say(`Import failed: ${ex.message}`, true);
    }
  });

  const resetBtn = el('button', {
    type: 'button',
    class: 'btn btn--danger',
    onclick: async () => {
      if (!confirm('Reset all Ambient light settings to their defaults?')) return;
      const entries = {};
      for (const s of SettingsConfig) {
        if (s.type === 'section') continue;
        entries[KEY(s.name)] = s.default;
        if (s.defaultKey !== undefined) entries[KEY(`${s.name}-key`)] = s.defaultKey;
      }
      await writeSettings(entries);
      say('All Ambient light settings are back to their defaults.');
    },
  }, 'Reset to defaults');

  return el('footer', { class: 'footer' }, el('div', { class: 'footer__btns' }, exportBtn, importBtn, resetBtn), fileInput, message);
}
