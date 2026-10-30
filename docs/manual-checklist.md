# ytModify manual checklist

Run after `npm run build`. Load `dist/` at `chrome://extensions`: turn on Developer mode, click **Load unpacked** and pick the `dist` folder. After each rebuild, click the reload icon on the ytModify card and refresh YouTube tabs.

Disable yt-mini-PIP, Ambient light and the Stylus styles first, so they don't mix with ytModify.

## Look
- [ ] The font is YouTube Sans.
- [ ] The top-left logo is the Premium logo.
- [ ] The player is bigger than with ytModify off.
- [ ] `/premium` keeps YouTube's normal look.
- [ ] Red accents: hovering links, video titles, sidebar items and menu items turns them red; selected text is red. A new accent colour applies live; switching Red accents off removes it.

## PiP findings
Play a watch video with sound, then:
- [ ] (a) Switch to another tab: the video pops out. Come back: it pops back in.
- [ ] (c) Popup → PiP → "Pop back in when I return" off: does the window stay open when you return? (Chrome may close it itself.)
- [ ] (d) "When switching tabs" off: tab switch no longer pops out.
- [ ] (e) A paused video: nothing pops out.
- [ ] (f) DevTools console (F12): no red errors from ytModify during any of the above.
- [ ] (g) A Short with "Also on Shorts" off: no pop-out. With it on: pops out.
- [ ] (h) Opening the ytModify popup on a playing video does NOT pop it out.

Alt-tab alone never pops out (Chrome needs a key press); use the pop-out key.

## Ambient light
- [ ] A watch video has a coloured glow around the player.
- [ ] No Ambient gear button appears in the player controls.
- [ ] Pressing `G` toggles the glow and shows a small "G" bezel.
- [ ] Two watch tabs open: a video with black bars in tab A doesn't change the bar clipping in tab B.

## Popup
- [ ] The toolbar icon opens the popup with PiP · Look · Ambient tabs; it reopens on the last tab used.
- [ ] Look: every control changes an open watch tab live (Normal/Big, size slider, font, logo).
- [ ] Ambient: changing a setting in each section changes the glow live. Double-clicking a control resets it.
- [ ] Ambient: the tab shows only the essential settings (no search box, no folding sections).
- [ ] Ambient: the key field next to "Ambient light" (G) can be changed, and the new key works on the page right away.
- [ ] Ambient: Export, then Reset to defaults, then Import restores your values.
- [ ] Ambient: "Appearance (theme)" (General) and "Background greyness" (Page content) change the page live.

## Edge cases
- [ ] Watch → home → another video, without reloading: the look, ambient glow and pop-out all still work on the new video. *(Checked by Claude in a test browser: look and glow OK; pop-out needs your Chrome.)*
- [ ] Three YouTube tabs open: a popup change updates all of them.
- [ ] Reload ytModify at `chrome://extensions` while YouTube tabs stay open: the old tabs don't fill the console with red errors. Refreshing them brings everything back.
- [ ] `/embed/` (a video embedded on another site), live chat, search and channel pages: nothing breaks.
- [ ] `/premium` keeps YouTube's normal look. *(Checked by Claude.)*
- [ ] Switching tabs during an ad, or with a paused or ended video: no pop-out, no errors.
- [ ] Theater mode and fullscreen with Big player plus Ambient light look right.

## More checks
- [ ] Premium logo text is readable on both a light-mode and a dark-mode YouTube account.
- [ ] Turn pop-out off, reload ytModify at `chrome://extensions`, and switch away from an open (not refreshed) YouTube tab: it must not pop out.

## Quality
Check the quality with YouTube's gear menu, or right-click the video → "Stats for nerds".
- [ ] Normal player: 720p.
- [ ] Fullscreen (`f`): 1080p. Leave fullscreen: back to 720p.
- [ ] Mini player (`i`): 360p. Expand it again: back to 720p.
- [ ] Pop-out (switch tabs): stays 720p.
- [ ] A video without 1080p in fullscreen plays its highest quality below 1080p.
- [ ] Pick 480p by hand in the gear menu: it stays until you change view or video.
- [ ] Quality tab master switch off: YouTube picks quality again.

## Pop-out key
- [ ] Press `P` on a watch page: the video pops out. Press `P` again: it pops back in.
- [ ] Press `P`, then alt-tab: the video stays popped out. Come back: it pops back in (if "Pop back in" is on).
- [ ] Typing a `p` in the search box or a comment doesn't pop out.
- [ ] `Shift+P` still goes to YouTube's previous video.
- [ ] Change the key in the PiP tab (e.g. to `O`): the new key works without a refresh. Backspace in the key field turns the key off.
