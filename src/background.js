// ytModify service worker: tells YouTube tabs when Chrome loses or regains
// focus (alt-tab), so the page's PiP controller can pop the video out or in.

const YT_TABS = ['https://www.youtube.com/watch*', 'https://www.youtube.com/shorts/*'];

const signal = (tabId, cause) =>
  chrome.tabs.sendMessage(tabId, { type: 'ytm-pip-signal', cause }).catch(() => {});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  try {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Only the visible tab of each window has a video worth popping out.
      const tabs = await chrome.tabs.query({ url: YT_TABS, active: true });
      for (const tab of tabs) signal(tab.id, 'app-blur');
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, windowId, url: YT_TABS });
    if (tab) signal(tab.id, 'app-focus');
  } catch {
    // Window closed mid-query.
  }
});
