// PiP tab: auto pop-out switches.
import { keyRow, switchRow } from './ui.js';

export function renderPipTab(root, settings, save) {
  const master = switchRow({
    label: 'Auto pop-out',
    hint: 'Pop a playing video out when you leave its tab',
    checked: settings['ytm-pip-enabled'],
    onChange: (v) => {
      save('ytm-pip-enabled', v);
      setSubsDisabled(!v);
    },
  });
  const subs = [
    ['ytm-pip-tab-switch', 'When switching tabs'],
    ['ytm-pip-app-switch', 'When switching to another app', 'Chrome only allows this within a few seconds of a click or key press on the page'],
    ['ytm-pip-return', 'Pop back in when I return'],
  ].map(([key, label, hint]) => ({
    key,
    ...switchRow({ label, hint, sub: true, checked: settings[key], onChange: (v) => save(key, v) }),
  }));
  const shorts = switchRow({
    label: 'Also on Shorts',
    hint: 'Shorts loop, so this is off by default',
    checked: settings['ytm-pip-shorts'],
    onChange: (v) => save('ytm-pip-shorts', v),
  });

  const key = keyRow({
    label: 'Pop-out key',
    hint: 'Press it on a YouTube page to pop out or back in. Works before alt-tab too.',
    value: settings['ytm-pip-key'],
    onChange: (v) => save('ytm-pip-key', v),
  });

  const setSubsDisabled = (disabled) => {
    subs.forEach((s) => s.setDisabled(disabled));
    shorts.setDisabled(disabled);
  };
  setSubsDisabled(!settings['ytm-pip-enabled']);

  root.replaceChildren(master.row, ...subs.map((s) => s.row), shorts.row, key.row);

  return (next) => {
    master.set(next['ytm-pip-enabled']);
    subs.forEach((s) => s.set(next[s.key]));
    shorts.set(next['ytm-pip-shorts']);
    key.set(next['ytm-pip-key']);
    setSubsDisabled(!next['ytm-pip-enabled']);
  };
}
