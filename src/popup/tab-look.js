// Look tab: bigger player, font, logo and red accents.
import { switchRow, sliderRow, segmentRow, colorRow, debounce } from './ui.js';
import { PLAYER_SCALE_MIN, PLAYER_SCALE_MAX } from '../shared/ytm-settings.js';

export function renderLookTab(root, settings, save) {
  const saveScale = debounce((v) => save('ytm-look-player-scale', v), 150);
  const saveColor = debounce((v) => save('ytm-look-accent-color', v), 150);

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
  const accents = switchRow({
    label: 'Red accents',
    hint: 'Hover colour on links, titles, icons and menus; text selection',
    checked: settings['ytm-look-accents'],
    onChange: (v) => {
      save('ytm-look-accents', v);
      color.setDisabled(!v);
    },
  });
  const color = colorRow({
    label: 'Accent colour',
    value: settings['ytm-look-accent-color'],
    onChange: saveColor,
    sub: true,
  });

  scale.setDisabled(settings['ytm-look-player-size'] !== 'big');
  color.setDisabled(!settings['ytm-look-accents']);

  root.replaceChildren(size.row, scale.row, font.row, logo.row, accents.row, color.row);

  return (next) => {
    size.set(next['ytm-look-player-size']);
    scale.set(next['ytm-look-player-scale']);
    scale.setDisabled(next['ytm-look-player-size'] !== 'big');
    font.set(next['ytm-look-font']);
    logo.set(next['ytm-look-logo']);
    accents.set(next['ytm-look-accents']);
    color.set(next['ytm-look-accent-color']);
    color.setDisabled(!next['ytm-look-accents']);
  };
}
