// Pure decision for the auto pop-out. Every trigger goes through here.

const ENTER_CAUSES = {
  'tab-hidden': 'ytm-pip-tab-switch',
  'media-session': 'ytm-pip-tab-switch',
};
const EXIT_CAUSES = new Set(['tab-visible', 'app-focus']);

/**
 * @param {{cause: string, settings: object, video: {paused, ended, isShorts, isAd}, inPip: boolean}} input
 * @returns {'enter'|'exit'|'none'}
 */
export function decidePip({ cause, settings, video, inPip }) {
  if (!settings['ytm-pip-enabled']) return 'none';

  if (EXIT_CAUSES.has(cause)) {
    return inPip && settings['ytm-pip-return'] ? 'exit' : 'none';
  }

  const toggle = ENTER_CAUSES[cause];
  if (!toggle || !settings[toggle] || inPip) return 'none';
  if (video.paused || video.ended || video.isAd) return 'none';
  if (video.isShorts && !settings['ytm-pip-shorts']) return 'none';
  return 'enter';
}
