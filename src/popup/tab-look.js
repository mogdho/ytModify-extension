// Look tab: bigger player, font and logo.
import { switchRow, sliderRow, segmentRow, debounce } from './ui.js';
import { PLAYER_SCALE_MIN, PLAYER_SCALE_MAX } from '../shared/ytm-settings.js';

export function renderLookTab(root, settings, save) {
  const saveScale = debounce((v) => save('ytm-look-player-scale', v), 150);

  const size = segmentRow({
    label: 'Player size',
    options: [
      ['normal', 'Normal'],
      ['big', 'Big'],
    ],
    value: settings['ytm-look-player-size'],
    onChange: (v) => {
      save('ytm-look-player-size', v);
      scale.setDisabled(v !== 'big');
    },
  });
  const scale = sliderRow({
    label: 'How much bigger',
    min: PLAYER_SCALE_MIN,
    max: PLAYER_SCALE_MAX,
    value: settings['ytm-look-player-scale'],
    format: (v) => `${v}%`,
    onInput: saveScale,
    sub: true,
  });
  const font = switchRow({
    label: 'YouTube Sans font',
    checked: settings['ytm-look-font'],
    onChange: (v) => save('ytm-look-font', v),
  });
  const logo = switchRow({
    label: 'Premium logo',
    checked: settings['ytm-look-logo'],
    onChange: (v) => save('ytm-look-logo', v),
  });

  scale.setDisabled(settings['ytm-look-player-size'] !== 'big');

  root.replaceChildren(size.row, scale.row, font.row, logo.row);

  return (next) => {
    size.set(next['ytm-look-player-size']);
    scale.set(next['ytm-look-player-scale']);
    scale.setDisabled(next['ytm-look-player-size'] !== 'big');
    font.set(next['ytm-look-font']);
    logo.set(next['ytm-look-logo']);
  };
}
