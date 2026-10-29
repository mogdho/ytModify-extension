// ytModify: what used to happen when a setting changed in Ambient light's
// in-player menu (settings.js change handlers), without the menu. The popup
// bridge and the keyboard shortcuts call applySettingChange().
import SettingsConfig from './settings-config';

const configOf = (name) => SettingsConfig.find((s) => s.name === name);

const BAR_CLIP_CONTROLLER = {
  horizontalBarsClipPercentage: 'detectHorizontalBarSizeEnabled',
  verticalBarsClipPercentage: 'detectVerticalBarSizeEnabled',
};
const BAR_DETECTION_CONTROLLED = {
  detectHorizontalBarSizeEnabled: 'horizontalBarsClipPercentage',
  detectVerticalBarSizeEnabled: 'verticalBarsClipPercentage',
};

// Checkboxes the menu stored with set() before running effects.
const CHECKBOXES_SET_FIRST = new Set([
  'energySaver',
  'videoOverlayEnabled',
  'frameBlending',
  'fixedPosition',
  'showFPS',
  'showFrametimes',
  'showResolutions',
  'showBarDetectionStats',
  'chromiumDirectVideoOverlayWorkaround',
  'chromiumBugVideoJitterWorkaround',
  'surroundingContentTextAndBtnOnly',
  'headerTransparentEnabled',
  'horizontalBarsClipPercentageReset',
  'detectHorizontalBarSizeEnabled',
  'detectColoredHorizontalBarSizeEnabled',
  'detectVerticalBarSizeEnabled',
  'detectVideoFillScaleEnabled',
  'directionTopEnabled',
  'directionRightEnabled',
  'directionBottomEnabled',
  'directionLeftEnabled',
  'advancedSettings',
  'relatedScrollbar',
  'hideScrollbar',
  'immersiveTheaterView',
  'layoutPerformanceImprovements',
  'prioritizePageLoadSpeed',
  'enableInPictureInPicture',
  'enableInEmbed',
  'enableInVRVideos',
]);

const STYLE_SETTINGS = new Set([
  'headerShadowSize',
  'headerShadowOpacity',
  'headerFillOpacity',
  'headerImagesOpacity',
  'surroundingContentShadowSize',
  'surroundingContentShadowOpacity',
  'surroundingContentFillOpacity',
  'surroundingContentImagesOpacity',
  'pageBackgroundGreyness',
  'videoDebandingStrength',
  'debandingStrength',
  'debandingBlendMode',
  'videoShadowSize',
  'videoShadowOpacity',
]);

const BAR_DETECTION_TUNING = new Set([
  'detectColoredHorizontalBarSizeEnabled',
  'barSizeDetectionAverageHistorySize',
  'detectHorizontalBarSizeOffsetPercentage',
  'barSizeDetectionAllowedElementsPercentage',
  'barSizeDetectionAllowedUnevenBarsPercentage',
]);

/**
 * Applies one setting change with the same side effects as the old menu.
 * @param settings the page's Settings instance
 * @param name setting name
 * @param value new value; undefined resets to the default
 * @param opts {fromController, fromControlled} internal: avoid controller loops
 */
export async function applySettingChange(settings, name, value, opts = {}) {
  const setting = configOf(name);
  if (!setting) return;
  if (value === undefined) value = setting.default;

  if (setting.type === 'section') {
    settings.set(name, !!value);
    return;
  }
  if (setting.type === 'list') return applyListChange(settings, setting, Number(value), opts);
  if (setting.type === 'checkbox') return applyCheckboxChange(settings, setting, !!value, opts);
}

async function applyListChange(settings, setting, value, opts) {
  const { ambientlight } = settings;
  const name = setting.name;
  if (Number.isNaN(value) || settings[name] === value) return;

  settings.set(name, value);

  if (name === 'theme') {
    ambientlight.theming.updateTheme(true);
    return;
  }

  if (!settings.advancedSettings && name === 'blur2') {
    const edgeValue = value <= 5 ? 2 : value >= 42.5 ? 17 : value / 2.5;
    await applySettingChange(settings, 'edge', edgeValue);
  }

  if (BAR_CLIP_CONTROLLER[name]) {
    if (!opts.fromController) {
      const controller = BAR_CLIP_CONTROLLER[name];
      if (settings[controller]) {
        // Adjusting a detected value by hand turns detection off.
        await applySettingChange(settings, controller, false, { fromControlled: true });
        return;
      }
    }
    ambientlight.barDetection.reset();
    if (settings.enabled && settings.webGL) ambientlight.buffersCleared = true;
  }

  if (
    (settings.detectHorizontalBarSizeEnabled || settings.detectVerticalBarSizeEnabled) &&
    BAR_DETECTION_TUNING.has(name)
  ) {
    ambientlight.barDetection.reset();
    if (settings.enabled && settings.webGL) ambientlight.buffersCleared = true;
  }

  if (STYLE_SETTINGS.has(name) || name.startsWith('videoScale.')) {
    ambientlight.updateStyles();
  }

  if (name === 'frameFading') {
    if (value > 0) {
      if (settings.framerateLimit !== 30) settings.set('framerateLimit', 30);
      if (settings.frameBlending) settings.set('frameBlending', false);
    } else {
      const defaultValue = configOf('framerateLimit').default;
      if (settings.framerateLimit !== defaultValue) settings.set('framerateLimit', defaultValue);
    }
    await settings.updateProjectorWebGLCtx();
  }

  if (name === 'flickerReduction') {
    await settings.updateBufferProjectorWebGLCtx();
    ambientlight.buffersCleared = true;
  }

  if (name === 'framerateLimit') {
    if (settings.frameBlending) settings.set('frameBlending', false);
    settings.resetFrameFading();
  }

  if (name === 'vibrance' || name === 'spread' || name === 'edge') {
    ambientlight.canvassesInvalidated = true;
  }

  if (name === 'spread' || name === 'blur2') {
    ambientlight.chromiumBugVideoJitterWorkaround?.update?.();
  }

  if (name === 'vibrance') {
    try {
      if (!(await ambientlight.projector.updateVibrance())) return;
      settings.setWarning('');
    } catch (ex) {
      ambientlight.projector.setWebGLWarning('change');
      throw ex;
    }
  }

  ambientlight.sizesChanged = true;
  await ambientlight.optionalFrame(true);
}

async function applyCheckboxChange(settings, setting, value, opts) {
  const { ambientlight } = settings;
  const name = setting.name;
  if (setting.disabled) return;
  if (settings[name] === value) return;

  if (CHECKBOXES_SET_FIRST.has(name)) settings.set(name, value);

  if (name === 'chromiumBugVideoJitterWorkaround') ambientlight.applyChromiumBugVideoJitterWorkaround();
  if (name === 'chromiumDirectVideoOverlayWorkaround') ambientlight.applyChromiumBugDirectVideoOverlayWorkaround();
  if (name === 'detectVideoFillScaleEnabled') settings.displayBezel(setting.key, !value);

  if (BAR_DETECTION_CONTROLLED[name]) {
    settings.displayBezel(setting.key, !value);
    if (!opts.fromControlled) {
      const percentage = configOf(BAR_DETECTION_CONTROLLED[name]);
      if (settings[percentage.name] != percentage.default) {
        // Toggling detection resets the manual bar size, like the menu did.
        await applySettingChange(settings, percentage.name, percentage.default, { fromController: true });
        return;
      }
    }
  }

  if (name === 'enabled') await ambientlight.toggleEnabled(value);

  if (name === 'layoutPerformanceImprovements' && settings.enabled) {
    ambientlight.updateLayoutPerformanceImprovements();
  }

  const html = document.documentElement;
  if (name === 'relatedScrollbar' && settings.enabled) {
    if (value) html.setAttribute('data-ambientlight-related-scrollbar', true);
    else html.removeAttribute('data-ambientlight-related-scrollbar');
  }

  if (name === 'hideScrollbar' && settings.enabled) {
    if (value) html.setAttribute('data-ambientlight-hide-scrollbar', true);
    else html.removeAttribute('data-ambientlight-hide-scrollbar');
    ambientlight.updateVideoPlayerSize();
  }

  if (name === 'immersiveTheaterView' && settings.enabled) {
    await ambientlight.updateImmersiveMode();
  }

  if (name === 'frameBlending') {
    if (value) {
      if (settings.framerateLimit !== 0) settings.set('framerateLimit', 0);
      settings.resetFrameFading();
    } else {
      const defaultValue = configOf('framerateLimit').default;
      if (settings.framerateLimit !== defaultValue) settings.set('framerateLimit', defaultValue);
    }
    ambientlight.sizesChanged = true;
  }

  if (name === 'energySaver') {
    if (value) ambientlight.calculateAverageVideoFramesDifference();
    else ambientlight.resetAverageVideoFramesDifference();
  }

  if (
    [
      'videoOverlayEnabled',
      'detectVideoFillScaleEnabled',
      'directionTopEnabled',
      'directionRightEnabled',
      'directionBottomEnabled',
      'directionLeftEnabled',
    ].includes(name)
  ) {
    ambientlight.sizesChanged = true;
  }

  if (['detectHorizontalBarSizeEnabled', 'detectVerticalBarSizeEnabled', 'detectColoredHorizontalBarSizeEnabled'].includes(name)) {
    ambientlight.barDetection.reset();
    if (settings.enabled && settings.webGL) ambientlight.buffersCleared = true;
    ambientlight.sizesChanged = true;
  }

  if (
    [
      'showFPS',
      'showFrametimes',
      'showResolutions',
      'showBarDetectionStats',
      'detectHorizontalBarSizeEnabled',
      'detectVerticalBarSizeEnabled',
    ].includes(name)
  ) {
    if (value) ambientlight.stats.update();
    else ambientlight.stats.hide(true);
  }

  if (name === 'surroundingContentTextAndBtnOnly' || name === 'fixedPosition') {
    ambientlight.updateStyles();
    await ambientlight.optionalFrame(true);
    return;
  }

  if (name === 'webGL') {
    // Switching renderer needs a fresh page, as in the original.
    settings.saveStorageEntry('webGL', value);
    await settings.flushPendingStorageEntries();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    settings.reloadPage();
    return;
  }

  ambientlight.sizesInvalidated = true;
  await ambientlight.optionalFrame(true);
}
