// ytModify: setting rules moved out of Ambient light's old in-player menu
// (settings.js), so both the page and the ytModify popup can use them.
// No DOM access here.
import { VIEW_SMALL, VIEW_THEATER, VIEW_FULLSCREEN } from './generic';

export const FRAMESYNC_DECODEDFRAMES = 0;
export const FRAMESYNC_DISPLAYFRAMES = 1;
export const FRAMESYNC_VIDEOFRAMES = 2;

export const DEBANDING_BLEND_MODE_LCD = 0;
export const DEBANDING_BLEND_MODE_OLED = 1;

// What the page reports about the current video (see the status message).
// Used when no YouTube tab is open: show everything that could apply.
export const DEFAULT_RUNTIME = Object.freeze({
  getImageDataAllowed: true,
  enableChromiumBugVideoJitterWorkaround: false,
  enableChromiumBugDirectVideoOverlayWorkaround: false,
  isVrVideo: false,
  view: null,
});

// A controlled setting is changed automatically while a controller is on;
// adjusting it by hand turns the controller off.
export const CONTROLLED_SETTINGS = [
  { name: 'horizontalBarsClipPercentage', controllers: ['detectHorizontalBarSizeEnabled'] },
  { name: 'verticalBarsClipPercentage', controllers: ['detectVerticalBarSizeEnabled'] },
  { name: 'framerateLimit', controllers: ['frameBlending', 'frameFading'] },
  { name: 'frameBlending', controllers: ['frameFading'] },
  { name: 'frameFading', controllers: ['frameBlending'] },
];

const viewMatches = (runtime, view) => !runtime.view || runtime.view === view;

// Settings only shown when they apply. visible(values, runtime)
export const OPTIONAL_SETTINGS = [
  {
    names: ['detectHorizontalBarSizeEnabled', 'detectVerticalBarSizeEnabled'],
    visible: (v, r) => r.getImageDataAllowed,
  },
  {
    names: [
      'detectColoredHorizontalBarSizeEnabled',
      'barSizeDetectionAverageHistorySize',
      'detectHorizontalBarSizeOffsetPercentage',
      'barSizeDetectionAllowedElementsPercentage',
      'barSizeDetectionAllowedUnevenBarsPercentage',
    ],
    visible: (v, r) =>
      r.getImageDataAllowed && !!(v.detectHorizontalBarSizeEnabled || v.detectVerticalBarSizeEnabled),
  },
  { names: ['frameBlending'], visible: (v) => v.frameSync !== 1 },
  { names: ['frameBlendingSmoothness'], visible: (v) => !!v.frameBlending && v.frameSync !== 1 },
  {
    names: ['chromiumBugVideoJitterWorkaround'],
    visible: (v, r) => r.enableChromiumBugVideoJitterWorkaround && !!v.webGL,
  },
  { names: ['videoOverlaySyncThreshold'], visible: (v) => !!v.videoOverlayEnabled },
  { names: ['headerShadowOpacity'], visible: (v) => !!v.headerShadowSize },
  { names: ['surroundingContentShadowOpacity'], visible: (v) => !!v.surroundingContentShadowSize },
  {
    names: ['surroundingContentTextAndBtnOnly'],
    visible: (v) =>
      !!(
        (v.surroundingContentShadowSize && v.surroundingContentShadowOpacity) ||
        (v.headerShadowSize && v.headerShadowOpacity)
      ),
  },
  { names: ['videoShadowOpacity'], visible: (v) => !!v.videoShadowSize },
  {
    names: ['resolution', 'vibrance', 'frameFading', 'flickerReduction', 'fixedPosition'],
    visible: (v) => !!v.webGL,
  },
  {
    names: ['chromiumDirectVideoOverlayWorkaround'],
    visible: (v, r) => r.enableChromiumBugDirectVideoOverlayWorkaround,
  },
  { names: ['framerateLimit'], visible: (v, r) => !r.isVrVideo },
  {
    names: ['showBarDetectionStats'],
    visible: (v) => !!(v.detectHorizontalBarSizeEnabled || v.detectVerticalBarSizeEnabled),
  },
  { names: ['webGL'], visible: (v) => !!v.advancedSettings || !v.webGL },
  { names: [`videoScale.${VIEW_SMALL}`], visible: (v, r) => viewMatches(r, VIEW_SMALL) },
  { names: [`videoScale.${VIEW_THEATER}`], visible: (v, r) => viewMatches(r, VIEW_THEATER) },
  { names: [`videoScale.${VIEW_FULLSCREEN}`], visible: (v, r) => viewMatches(r, VIEW_FULLSCREEN) },
];

export function isOptionalSettingVisible(name, values, runtime = DEFAULT_RUNTIME) {
  const group = OPTIONAL_SETTINGS.find((g) => g.names.includes(name));
  return group ? !!group.visible(values, runtime) : true;
}

export const frameFadingValueToDuration = (value) => {
  if (!value) return 'Off';
  const frames = Math.pow(value, 2);
  const seconds = frames / 30;
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  return `${Math.round(seconds * 10) / 10} seconds`;
};

// The value label shown next to a "list" setting.
export function getSettingDisplayText(setting, value) {
  if (setting.name === 'frameSync') {
    return {
      [FRAMESYNC_DECODEDFRAMES]: 'Decoded framerate',
      [FRAMESYNC_DISPLAYFRAMES]: 'Display framerate',
      [FRAMESYNC_VIDEOFRAMES]: 'Video framerate',
    }[value];
  }
  if (setting.name === 'debandingBlendMode') {
    return { [DEBANDING_BLEND_MODE_LCD]: 'LCD', [DEBANDING_BLEND_MODE_OLED]: 'OLED' }[value];
  }
  if (setting.name === 'barSizeDetectionAverageHistorySize') {
    return value == 1 ? '1 frame' : `${value} frames`;
  }
  if (setting.name === 'framerateLimit') return value == 0 ? 'max fps' : `${value} fps`;
  if (setting.name === 'frameFading') return frameFadingValueToDuration(value);
  if (setting.name === 'theme' || setting.name === 'enableInViews') {
    const point = setting.snapPoints?.find((p) => p.value === value);
    return point?.hiddenLabel || point?.label;
  }
  return `${value}${setting.unit || '%'}`;
}

/**
 * The full set of writes for one change made in the popup, including the
 * linked settings the old menu changed with it (settings-effects.js does the
 * same on the page). Lets the popup store a consistent state even when no
 * watch page is open.
 * @returns {Record<string, any>} name → value, starting with the changed setting
 */
export function derivedWrites(config, name, value, values) {
  const def = (n) => config.find((s) => s.name === n)?.default;
  const writes = { [name]: value };
  const set = (n, v) => {
    if (values[n] !== v) writes[n] = v;
  };

  if (name === 'blur2' && !values.advancedSettings) {
    set('edge', value <= 5 ? 2 : value >= 42.5 ? 17 : value / 2.5);
  }

  const clipController = {
    horizontalBarsClipPercentage: 'detectHorizontalBarSizeEnabled',
    verticalBarsClipPercentage: 'detectVerticalBarSizeEnabled',
  }[name];
  if (clipController && values[clipController]) set(clipController, false);

  const controlledClip = {
    detectHorizontalBarSizeEnabled: 'horizontalBarsClipPercentage',
    detectVerticalBarSizeEnabled: 'verticalBarsClipPercentage',
  }[name];
  if (controlledClip) set(controlledClip, def(controlledClip));

  if (name === 'frameFading') {
    if (value > 0) {
      set('framerateLimit', 30);
      set('frameBlending', false);
    } else {
      set('framerateLimit', def('framerateLimit'));
    }
  }

  if (name === 'frameBlending') {
    if (value) {
      set('framerateLimit', 0);
      set('frameFading', def('frameFading'));
    } else {
      set('framerateLimit', def('framerateLimit'));
    }
  }

  if (name === 'framerateLimit') {
    set('frameBlending', false);
    set('frameFading', def('frameFading'));
  }

  return writes;
}
