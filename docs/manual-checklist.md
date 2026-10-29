# ytModify manual checklist

Run after `npm run build`. Load `dist/` at `chrome://extensions`: turn on Developer mode, click **Load unpacked** and pick the `dist` folder. After each rebuild, click the reload icon on the ytModify card and refresh YouTube tabs.

Disable yt-mini-PIP, Ambient light and the Stylus styles first, so they don't mix with ytModify.

## Look
- [ ] A watch page is Deep Dark (near-black `#111` background).
- [ ] The font is YouTube Sans.
- [ ] The top-left logo is the Premium logo.
- [ ] The player is bigger than with ytModify off.
- [ ] `/premium` keeps YouTube's normal look.

## PiP findings
Play a watch video with sound, then:
- [ ] (a) Switch to another tab: the video pops out. Come back: it pops back in.
- [ ] (b) Alt-tab to another app: the video pops out. Come back: it pops back in.
- [ ] (c) Popup → PiP → "Pop back in when I return" off: does the window stay open when you return? (Chrome may close it itself.)
- [ ] (d) "When switching tabs" off, app switch on: tab switch no longer pops out, but alt-tab still does.
- [ ] (e) A paused video: nothing pops out.
- [ ] (f) DevTools console (F12): no red errors from ytModify during any of the above.
- [ ] (g) A Short with "Also on Shorts" off: no pop-out. With it on: pops out.
- [ ] (h) Opening the ytModify popup on a playing video does NOT pop it out.

If (a) or (b) fails but worked with yt-mini-PIP, note which, and Claude adds that path to the controller.
