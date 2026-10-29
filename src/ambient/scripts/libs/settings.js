import { on, off, setTimeout, supportsWebGL, setWarning, setDisplayErrorHandler } from './generic';
import ErrorReporter from './errors/error-reporter';
import SettingsConfig, { prepareSettingsConfigOnce, WebGLOnlySettings } from './settings-config';
import { getVersion } from './utils';
import { storage } from './storage';
import { applySettingChange } from './settings-effects';
import { attachBridge } from './ytm-bridge';
import { getSettingDisplayText } from './settings-meta';
import { invalidatesSettingsCache } from './ytm-bridge-core';

// ytModify: these moved to settings-meta.js; re-exported for existing imports.
export {
  FRAMESYNC_DECODEDFRAMES,
  FRAMESYNC_DISPLAYFRAMES,
  FRAMESYNC_VIDEOFRAMES,
  DEBANDING_BLEND_MODE_LCD,
  DEBANDING_BLEND_MODE_OLED,
} from './settings-meta';

const version = getVersion(); // document.currentScript?.getAttribute('data-version') || ''

// ytModify: Ambient light's in-player settings menu was removed. Settings are
// changed from the ytModify popup and applied through ytm-bridge.js.
export default class Settings {
  saveStorageEntryTimeout = {};

  // Status reported to the ytModify popup (see content-main.js).
  warning = null;
  warningType = undefined;
  info = '';
  loaded = false;

  constructor(ambientlight, bezelParent) {
    return async function settingsConstructor() {
      this.ambientlight = ambientlight;
      this.bezelParent = bezelParent;

      await this.getAll();
      this.initBezel();
      setDisplayErrorHandler(this.onError);
      if (this.webGLCrashDate) this.updateWebGLCrashDescription();
      attachBridge(this);
      return this;
    }.bind(this)();
  }

  static getStoredSettingsCached = async () => {
    if (Settings.storedSettingsCached) {
      return Settings.storedSettingsCached;
    }

    prepareSettingsConfigOnce();

    const names = [];
    for (const setting of SettingsConfig) {
      names.push(`setting-${setting.name}`);

      if (setting.defaultKey !== undefined) {
        names.push(`setting-${setting.name}-key`);
      }
    }
    names.push('setting-webGLCrash');
    names.push('setting-webGLCrashVersion');
    names.push('setting-surroundingContentImagesTransparency');

    // Migrate old settings
    names.push('setting-blur');
    names.push('setting-bloom');
    names.push('setting-fadeOutEasing');

    const warningTimeout = setTimeout(
      () =>
        setWarning(
          `It is taking more than 5 seconds to load your previous settings.
If this is your first warning and it does not disappear, then the extension might have updated. 
You can reload the webpage to complete the update.

But if this happens frequently, here are some possible causes:
- Another extension is blocking code execution on this webpage for a long duration.
  Disable other extensions temporarely to find out which one it is.
- If your computer is very slow or frequently freezing in other applications as well,
  there could be a problem with your hardware, likely the memory (DDR).`
        ),
      5000
    );
    try {
      Settings.storedSettingsCached = (await storage.get(names, true)) || {};
    } catch (ex) {
      clearTimeout(warningTimeout);
      throw ex;
    }
    clearTimeout(warningTimeout);
    setWarning();

    // Migrate old settings
    if (Settings.storedSettingsCached['setting-blur'] != null) {
      const value =
        (Math.round(Settings.storedSettingsCached['setting-blur'] + 30) * 10) /
        10; // Prevent rounding error

      delete Settings.storedSettingsCached['setting-blur'];
      await storage.set('setting-blur', undefined);

      Settings.storedSettingsCached['setting-blur2'] = value;
      await storage.set('setting-blur2', value);
    }
    if (Settings.storedSettingsCached['setting-bloom'] != null) {
      const value =
        Math.round((Settings.storedSettingsCached['setting-bloom'] + 7) * 10) /
        10; // Prevent rounding error
      delete Settings.storedSettingsCached['setting-bloom'];
      await storage.set('setting-bloom', undefined);

      Settings.storedSettingsCached['setting-spreadFadeStart'] = value;
      await storage.set('setting-spreadFadeStart', value);
    }
    if (Settings.storedSettingsCached['setting-fadeOutEasing'] != null) {
      Settings.storedSettingsCached['setting-spreadFadeCurve'] =
        Settings.storedSettingsCached['setting-fadeOutEasing'];
      delete Settings.storedSettingsCached['setting-fadeOutEasing'];
      await storage.set('setting-fadeOutEasing', undefined);
    }
    if (Settings.storedSettingsCached['setting-frameFading'] != null) {
      const value = Settings.storedSettingsCached['setting-frameFading'];
      const max = SettingsConfig.find(
        (setting) => setting.name === 'frameFading'
      ).max;
      if (value > max) {
        const newValue = Math.min(max, Math.round(Math.sqrt(value) * 50) / 50);
        Settings.storedSettingsCached['setting-frameFading'] = newValue;
        await storage.set('setting-frameFading', newValue);
      }
    }

    const webGLEnabled =
      Settings.storedSettingsCached['setting-webGL'] === true ||
      (Settings.storedSettingsCached['setting-webGL'] == null &&
        supportsWebGL());
    if (webGLEnabled) {
      // Disable enabled WebGL setting if not supported anymore
      if (!supportsWebGL()) {
        Settings.storedSettingsCached['setting-webGL'] = null;
        SettingsConfig.find((setting) => setting.name === 'spread').max = 200;
      } else {
        SettingsConfig.find(
          (setting) => setting.name === 'saturation'
        ).advanced = true;
      }
    } else {
      SettingsConfig.find((setting) => setting.name === 'spread').max = 200;
      for (const settingName of WebGLOnlySettings) {
        if (
          Settings.storedSettingsCached[`setting-${settingName}`] !== undefined
        )
          delete Settings.storedSettingsCached[`setting-${settingName}`];
      }
      if (Settings.storedSettingsCached['setting-spread'] > 200)
        Settings.storedSettingsCached['setting-spread'] = 200;
    }

    return Settings.storedSettingsCached;
  };

  async getAll() {
    let storedSettings = {};
    try {
      storedSettings = await Settings.getStoredSettingsCached();
    } catch {
      this.setWarning(
        'Your previous settings cannot be loaded because the extension could have been updated.\nRefresh the page to retry again.'
      );
    }

    const webGLCrash = storedSettings['setting-webGLCrash'];
    const webGLCrashVersion = storedSettings['setting-webGLCrashVersion'];
    if (webGLCrash && webGLCrashVersion === version) {
      this.webGLCrashDate = new Date(webGLCrash);
      this.webGLCrashVersion = webGLCrashVersion;
    }

    for (const setting of SettingsConfig) {
      const value = storedSettings[`setting-${setting.name}`];
      this[setting.name] = this.processStorageEntry(setting.name, value);

      if (setting.defaultKey !== undefined) {
        let key = storedSettings[`setting-${setting.name}-key`];
        if (key == null) key = setting.defaultKey;
        setting.key = key;
      }
    }

    this.migrate(storedSettings);

    // Makes the new default framerateLimit of 30 backwards compatible with a previously enabled frameBlending
    if (this.frameBlending && this.framerateLimit !== 0) {
      this.set('framerateLimit', 0);
    }

    await this.flushPendingStorageEntries(); // Complete migrations

    if (this.enabled)
      document.documentElement.toggleAttribute(
        'data-ambientlight-hide-scrollbar',
        this.hideScrollbar
      );
  }

  migrate(storedSettings) {
    const surroundingContentImagesTransparency =
      storedSettings['setting-surroundingContentImagesTransparency'];
    if (typeof surroundingContentImagesTransparency === 'number') {
      const opacity = 100 - surroundingContentImagesTransparency;
      this.set('surroundingContentImagesOpacity', opacity);
      this['surroundingContentImagesOpacity'] = opacity;

      this.saveStorageEntry('surroundingContentImagesTransparency', undefined);
    }
  }


  handleWebGLCrash = async () => {
    this.webGLCrashDate = new Date();
    this.saveStorageEntry('webGLCrash', +this.webGLCrashDate);
    this.saveStorageEntry('webGLCrashVersion', version);

    this.set('webGL', false, true, true);

    this.saveStorageEntry('flickerReduction', undefined); // Override potential crash reason
    this.saveStorageEntry('frameFading', undefined); // Override potential crash reason
    this.saveStorageEntry('resolution', undefined); // Override potential crash reason

    SettingsConfig.find((setting) => setting.name === 'spread').max = 200;
    if (this.spread > 200) this.set('spread', 200, true, false); // Override potential crash reason

    await this.flushPendingStorageEntries();
    this.updateWebGLCrashDescription();
  };

  // ytModify: kept as text for the popup's status strip.
  updateWebGLCrashDescription = () => {
    if (!this.webGLCrashDate) {
      this.webGLCrashText = '';
      return;
    }
    this.webGLCrashText = `The WebGL renderer failed at ${this.webGLCrashDate.toLocaleTimeString()} ${this.webGLCrashDate.toLocaleDateString()} and was turned off.
Check the hardware acceleration and WebGL settings in your browser. You can turn WebGL back on in Advanced to try again.`;
  };

  initBezel() {
    this.bezelElem = this.createBezelElem();
    this.bezelTextElem = this.bezelElem.querySelector('text');
    this.bezelParent?.prepend(this.bezelElem);
  }

  createBezelElem() {
    const elem = document.createElement('div');
    elem.className = 'ytal-bezel ytp-bezel ytal-bezel--no-animation';
    elem.setAttribute('role', 'status');

    const iconElem = document.createElement('div');
    iconElem.className = 'ytp-bezel-icon';

    const xmlns = 'http://www.w3.org/2000/svg';

    const svgElem = document.createElementNS(xmlns, 'svg');
    svgElem.setAttributeNS(null, 'height', '100%');
    svgElem.setAttributeNS(null, 'width', '100%');
    svgElem.setAttributeNS(null, 'version', '1.1');
    svgElem.setAttributeNS(null, 'viewBox', '0 0 36 36');

    const textElem = document.createElementNS(xmlns, 'text');
    textElem.setAttributeNS(null, 'class', 'ytp-svg-fill');
    textElem.setAttributeNS(null, 'x', '50%');
    textElem.setAttributeNS(null, 'y', '59%');
    textElem.setAttributeNS(null, 'dominant-baseline', 'middle');
    textElem.setAttributeNS(null, 'text-anchor', 'middle');

    svgElem.appendChild(textElem);
    iconElem.appendChild(svgElem);
    elem.appendChild(iconElem);

    return elem;
  }

  async updateBufferProjectorWebGLCtx() {
    if (!this.ambientlight.projectorBuffer?.ctx?.initCtx) return; // Can be undefined when migrating from previous settings

    try {
      await new Promise((resolve) => setTimeout(resolve, 0)); // Await for update sizes
      if (!this.ambientlight.projectorBuffer?.ctx?.initCtx) return; // Can be undefined when migrating from previous settings

      if (!(await this.ambientlight.projectorBuffer.ctx.initCtx(true))) return;
      this.setWarning('');
    } catch (ex) {
      this.ambientlight.projectorBuffer.ctx.setWebGLWarning('change');
      throw ex;
    }
  }

  resetFrameFading() {
    const frameFadingDefaultValue = SettingsConfig.find(
      (s) => s.name === 'frameFading'
    )?.default;
    if (this['frameFading'] === frameFadingDefaultValue) return;

    this.set('frameFading', frameFadingDefaultValue, true);
    this.updateProjectorWebGLCtx();
  }

  async updateProjectorWebGLCtx() {
    if (!this.ambientlight.projector?.initCtx) return; // Can be undefined when migrating from previous settings

    try {
      await new Promise((resolve) => setTimeout(resolve, 0)); // Await for update sizes
      if (!this.ambientlight.projector?.initCtx) return; // Can be undefined when migrating from previous settings

      if (!(await this.ambientlight.projector.initCtx(true))) return;
      this.setWarning('');
    } catch (ex) {
      this.ambientlight.projector.setWebGLWarning('change');
      throw ex;
    }
  }

  reloadPage() {
    const search = new URLSearchParams(location.search);
    const time = Math.max(
      0,
      Math.floor(this.ambientlight.videoElem?.currentTime || 0) - 2
    );
    time ? search.set('t', time) : search.delete('t');
    history.replaceState(
      null,
      null,
      `${location.pathname}?${search.toString()}`
    );
    location.reload();
  }

  getSettingListDisplayText(setting) {
    return getSettingDisplayText(setting, this[setting.name]);
  }

  onLoaded = () => {
    this.loaded = true;
  };

  onError = (ex) => {
    const message = ex?.message ?? typeof ex;
    this.setWarning(`${this.loaded ? 'An error occured' : 'Ambient light failed to load'}:\n${message}`, true);
  };

  // ytModify: the popup re-renders from storage, so there is no menu to update.
  updateVisibility() {}
  updateHdr() {}

  setKey(name, key) {
    const setting =
      SettingsConfig.find((setting) => setting.name === name) || {};
    const clear = key === undefined;
    if (clear) key = setting.defaultKey;

    setting.key = key;
    this.saveStorageEntry(`${setting.name}-key`, clear ? undefined : key);
  }

  set(name, value, updateUI, dontSave = false) {
    const clear = value === undefined;
    if (clear)
      value = SettingsConfig.find(
        (setting) => setting.name === name
      )?.defaultValue;

    const changed = this[name] !== value;
    this[name] = value;

    // Migrated to blur2
    if (name === 'blur') value = Math.round((value - 30) * 10) / 10; // Prevent rounding error
    // Migrated to spreadFadeStart
    if (name === 'bloom') value = Math.round((value - 7) * 10) / 10; // Prevent rounding error

    if (!dontSave && (clear || changed)) {
      this.saveStorageEntry(name, clear ? undefined : value);
    }

  }

  // Keyboard shortcuts toggle a checkbox setting.
  clickUI(name) {
    return applySettingChange(this, name, !this[name]).catch((ex) => ErrorReporter.captureException(ex));
  }

  processStorageEntry(name, value) {
    const setting =
      SettingsConfig.find((setting) => setting.name === name) || {};
    if (value == null) {
      value = setting.default;
    } else if (setting.type === 'checkbox' || setting.type === 'section') {
      value =
        value === 'true' || // localStorage
        value === true; // storage.local
    } else if (setting.type === 'list') {
      value = parseFloat(value);

      // Migrated to blur2
      if (name === 'blur') value = Math.round((value + 30) * 10) / 10; // Prevent rounding error

      // Migrated to spreadFadeStart
      if (name === 'bloom') value = Math.round((value + 7) * 10) / 10; // Prevent rounding error

      if (name === 'frameSync' && value >= 50) {
        value = {
          50: FRAMESYNC_DECODEDFRAMES,
          100: FRAMESYNC_DISPLAYFRAMES,
          150: FRAMESYNC_VIDEOFRAMES,
        }[value];
      }
    }

    return value;
  }

  pendingStorageEntries = {};
  saveStorageEntry(name, value) {
    this.pendingStorageEntries[name] = value;
    if (this.saveStorageEntryTimeout)
      clearTimeout(this.saveStorageEntryTimeout);

    this.saveStorageEntryTimeout = setTimeout(
      function saveStorageEntryTimeout() {
        delete this.saveStorageEntryTimeout;
        this.flushPendingStorageEntries();
      }.bind(this),
      500
    );
  }

  async flushPendingStorageEntries() {
    try {
      if (this.saveStorageEntryTimeout)
        clearTimeout(this.saveStorageEntryTimeout);

      const names = Object.keys(this.pendingStorageEntries);
      for (const name of names) {
        await storage.set(
          `setting-${name}`,
          this.pendingStorageEntries[name],
          true
        );
        delete this.pendingStorageEntries[name];
      }
    } catch (ex) {
      if (ex.message.includes('QuotaExceededError')) {
        this.setWarning(
          'The changes could not be saved because the settings have changed too often.\nWait a few seconds...'
        );
        return;
      }

      if (ex.message === 'uninstalled') {
        this.setWarning(
          'The changes could not be saved because the extension has been updated.\nRefresh the webpage to reload the updated extension.'
        );
        return;
      }

      if (ex.message !== 'An unexpected error occurred')
        ErrorReporter.captureException(ex);

      this.logStorageWarningOnce(
        `Failed to save settings ${JSON.stringify(
          this.pendingStorageEntries
        )}: ${ex.message}`
      );
    }
  }

  logStorageWarningOnce(...args) {
    if (this.loggedStorageWarning) return;

    console.warn(...args);
    this.loggedStorageWarning = true;
  }

  getKeys = () => ({
    enabled: SettingsConfig.find((setting) => setting.name === 'enabled').key,
    detectHorizontalBarSizeEnabled: SettingsConfig.find(
      (setting) => setting.name === 'detectHorizontalBarSizeEnabled'
    ).key,
    detectVerticalBarSizeEnabled: SettingsConfig.find(
      (setting) => setting.name === 'detectVerticalBarSizeEnabled'
    ).key,
    detectVideoFillScaleEnabled: SettingsConfig.find(
      (setting) => setting.name === 'detectVideoFillScaleEnabled'
    ).key,
  });

  displayBezelForSetting(name) {
    const key = SettingsConfig.find((setting) => setting.name === name).key;
    const strike = !this[name];
    this.displayBezel(key, strike);
  }

  displayBezel(text, strike = false) {
    if (this.onBezelElemAnimationEndTimeout) {
      this.onBezelElemAnimationEnd();
    }

    this.bezelElem.classList.add('ytal-bezel--no-animation');
    setTimeout(() => {
      this.bezelElem.classList.toggle('ytal-bezel--strike', strike);
      this.bezelTextElem.textContent = text;

      on(this.bezelElem, 'animationend', this.onBezelElemAnimationEnd);
      this.onBezelElemAnimationEndTimeout = setTimeout(() => {
        this.onBezelElemAnimationEndTimeout = undefined;
        this.onBezelElemAnimationEnd();
      }, 1000);

      this.bezelElem.classList.remove('ytal-bezel--no-animation');
    }, 1);
  }

  onBezelElemAnimationEnd = () => {
    off(this.bezelElem, 'animationend', this.onBezelElemAnimationEnd);
    if (this.onBezelElemAnimationEndTimeout) {
      clearTimeout(this.onBezelElemAnimationEndTimeout);
      this.onBezelElemAnimationEndTimeout = undefined;
    }
    this.bezelElem.classList.add('ytal-bezel--no-animation');
  };


  updateAverageVideoFramesDifferenceInfo = () => {
    let message = '';
    if (this.energySaver) {
      if (this.ambientlight.averageVideoFramesDifference < 0.002) {
        message =
          'Detected a still image as video\nThe framerate has been limited to: 0.2 fps\n\nLimited by the advanced setting:\nQuality > Save energy on static videos';
      } else if (this.ambientlight.averageVideoFramesDifference < 0.0175) {
        message =
          'Detected only small movements in the video\nThe framerate has been limited to: 1 fps\n\nLimited by the advanced setting:\nQuality > Save energy on static videos';
      }
    }
    this.info = message;
  };

  // ytModify: warnings are stored for the popup's status strip and logged once.
  setWarning = (message, optional = false, icon = true, type = undefined) => {
    message = message || null;
    if (optional && this.warning) return;
    if (this.warning === message) return;
    if (!message && type && this.warningType !== type) return;

    this.warning = message;
    this.warningType = type;
    if (message) console.warn(message);
  };

  // Status for the ytModify popup.
  getStatus() {
    const a = this.ambientlight;
    return {
      loaded: this.loaded,
      warning: this.warning,
      info: this.info || null,
      webGLCrashed: !!this.webGLCrashDate,
      webGLCrashText: this.webGLCrashText || null,
      runtime: {
        getImageDataAllowed: !!a?.getImageDataAllowed,
        enableChromiumBugVideoJitterWorkaround: !!a?.enableChromiumBugVideoJitterWorkaround,
        enableChromiumBugDirectVideoOverlayWorkaround: !!a?.enableChromiumBugDirectVideoOverlayWorkaround,
        isVrVideo: !!a?.isVrVideo,
        isHdr: !!a?.isHdr,
        view: a?.view ?? null,
      },
    };
  }
}

// ytModify: settings can now change from the popup while this page hasn't
// started Ambient light yet (home, search, waiting for a video). Drop the
// cache so getAll() reads the latest values.
storage.addListener((changes) => {
  if (invalidatesSettingsCache(changes)) Settings.storedSettingsCached = undefined;
});
