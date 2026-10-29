const getOS = () => {
  try {
    const list = [
      { match: 'window', name: 'Windows' },
      { match: 'mac', name: 'Mac' },
      { match: 'cros', name: 'Chrome+OS' },
      { match: 'ubuntu', name: 'Ubuntu+(Linux)' },
      { match: 'android', name: 'Android' },
      { match: 'ios', name: 'iOS' },
      { match: 'x11', name: 'Linux' },
    ];
    const ua = globalThis.navigator.userAgent;
    const os = list.find((os) => ua.toLowerCase().indexOf(os.match) >= 0);
    return os ? os.name : '';
  } catch {
    return null;
  }
};

const browsersUAList = [
  { ua: 'Firefox', name: 'Firefox' },
  { ua: 'OPR', name: 'Opera' },
  { ua: 'Edg', name: 'Edge' },
  { ua: 'Chrome', name: 'Chrome' },
];

export const getBrowser = () => {
  try {
    const ua = globalThis.navigator.userAgent;
    const browser = browsersUAList.find(
      (browser) => ua.indexOf(browser.ua) >= 0
    );
    return browser ? browser.name : '';
  } catch {
    return null;
  }
};

const getBrowserVersion = () => {
  try {
    const browserName = getBrowser();
    const browserUA = browsersUAList.find(
      (browser) => browserName === browser.name
    ).ua;
    const ua = globalThis.navigator.userAgent;
    const matches = ua.match(`${browserUA}/([0-9.]+)`);
    return matches.length === 2 ? matches[1] : ua;
  } catch {
    return null;
  }
};

export const getVersion = () => {
  try {
    return (chrome.runtime.getManifest() || {}).version;
  } catch {
    return null;
  }
};

const privacyPolicyLinks = {
  Firefox:
    'https://addons.mozilla.org/firefox/addon/youtube-ambientlight/privacy/',
};
export const getPrivacyPolicyLink = () => {
  const browser = getBrowser();
  return (
    privacyPolicyLinks[browser] ||
    'https://github.com/WesselKroos/youtube-ambilight#privacy--security'
  );
};
