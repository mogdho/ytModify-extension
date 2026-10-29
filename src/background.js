// ytModify service worker: tells the active YouTube tab when Chrome gets focus
// back (e.g. after alt-tab), so a video popped out with the pop-out key can pop
// back in. Chrome doesn't allow popping out on alt-tab without a key press, so
// there is no signal for losing focus.

const YT_TABS = ['https://www.youtube.com/watch*', 'https://www.youtube.com/shorts/*'];

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId, url: YT_TABS });
    if (tab) chrome.tabs.sendMessage(tab.id, { type: 'ytm-pip-signal', cause: 'app-focus' }).catch(() => {});
  } catch {
    // Window closed mid-query.
  }
});
