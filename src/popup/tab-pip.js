// PiP tab: auto pop-out switches.
import { switchRow } from './ui.js';

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
    ['ytm-pip-app-switch', 'When switching to another app', 'Alt-tab, or clicking outside Chrome'],
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

  const setSubsDisabled = (disabled) => {
    subs.forEach((s) => s.setDisabled(disabled));
    shorts.setDisabled(disabled);
  };
  setSubsDisabled(!settings['ytm-pip-enabled']);

  root.replaceChildren(master.row, ...subs.map((s) => s.row), shorts.row);

  return (next) => {
    master.set(next['ytm-pip-enabled']);
    subs.forEach((s) => s.set(next[s.key]));
    shorts.set(next['ytm-pip-shorts']);
    setSubsDisabled(!next['ytm-pip-enabled']);
  };
}
