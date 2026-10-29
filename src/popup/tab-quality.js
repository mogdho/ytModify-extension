// Quality tab: a fixed playback quality for each way of watching.
import { selectRow, switchRow } from './ui.js';
import { QUALITY_LABELS, QUALITY_LEVELS } from '../quality/quality-core.js';

const OPTIONS = [['auto', 'Auto (YouTube decides)'], ...[...QUALITY_LEVELS].reverse().map((q) => [q, QUALITY_LABELS[q]])];

const VIEWS = [
  ['ytm-quality-normal', 'Normal & pop-out', 'Also theater mode'],
  ['ytm-quality-fullscreen', 'Fullscreen'],
  ['ytm-quality-mini', 'Mini player', 'The corner player (key i)'],
];

export function renderQualityTab(root, settings, save) {
  const master = switchRow({
    label: 'Fixed quality per view',
    hint: 'Uses the next lower quality if a video lacks yours',
    checked: settings['ytm-quality-enabled'],
    onChange: (v) => {
      save('ytm-quality-enabled', v);
      rows.forEach((r) => r.setDisabled(!v));
    },
  });
  const rows = VIEWS.map(([key, label, hint]) => ({
    key,
    ...selectRow({ label, hint, options: OPTIONS, value: settings[key], sub: true, onChange: (v) => save(key, v) }),
  }));
  rows.forEach((r) => r.setDisabled(!settings['ytm-quality-enabled']));

  root.replaceChildren(master.row, ...rows.map((r) => r.row));

  return (next) => {
    master.set(next['ytm-quality-enabled']);
    rows.forEach((r) => {
      r.set(next[r.key]);
      r.setDisabled(!next['ytm-quality-enabled']);
    });
  };
}
