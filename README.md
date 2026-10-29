# ytModify

One Chrome extension for YouTube that combines:

- **Auto pop-out.** A playing video pops out into picture-in-picture when you switch tabs or alt-tab to another app, and pops back in when you return.
- **Fixed quality per view.** 1080p in fullscreen, 720p in the normal player and pop-out, 360p in the mini player, or whatever you choose.
- **Look.** Deep Dark theme (with your own accent colour), YouTube Sans font, Premium logo, and a bigger player you can switch between Normal and Big.
- **Ambient light.** The full Ambient light for YouTube extension, rebuilt from its source: glow around the video, black-bar removal, smooth motion, HDR filters, WebGL renderer, stats and more.

Every setting lives in one popup that opens from the toolbar icon. Changes apply to open YouTube tabs straight away, with no reload.

ytModify sends nothing anywhere: no analytics, no error reporting, no cloud sync.

## Install

You need [Node.js](https://nodejs.org/) 22 or newer.

```sh
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `dist` folder.

If you also have yt-mini-PIP, Ambient light for YouTube or the Stylus styles installed, turn them off. ytModify replaces them.

After pulling changes, run `npm run build` again, then click the reload icon on the ytModify card and refresh your YouTube tabs.

## Popup

| Tab | Settings |
|---|---|
| **PiP** | Auto pop-out (master switch): when switching tabs, when switching to another app, pop back in when I return. Also on Shorts. **Pop-out key** (default ): press it on a YouTube page to pop out or back in. |
| **Look** | Player size Normal/Big, with a "How much bigger" slider. Deep Dark theme, with an accent colour. YouTube Sans font. Premium logo. |
| **Quality** | Fixed playback quality per view: Normal & pop-out (default 720p), Fullscreen (1080p), Mini player (360p), or Auto. If a video lacks your choice, the next lower quality is used. Picking a quality yourself in YouTube's menu stays until the view or video changes. |
| **Ambient** | Every Ambient light setting, in its original sections, plus a search box. Keyboard-shortcut keys can be changed. File import/export and reset. A status line shows warnings from the current tab. |

While Deep Dark is on, Ambient light's own "Appearance (theme)" and "Background greyness" settings are hidden, so they can't fight the theme. They come back when Deep Dark is off.

### Auto pop-out notes

Chrome decides when a page may open picture-in-picture. ytModify uses Chrome's automatic picture-in-picture (Media Session) plus the tab and window focus events. Paused, ended or ad-playing videos never pop out.

Chrome only lets a page open picture-in-picture by itself on a **tab switch**. For anything else, including alt-tab to another app, it needs a click or key press on the page within the last few seconds. That is why the **pop-out key** exists: press  (or your own key) before you alt-tab and the video pops out every time.

## Development

```sh
npm test     # unit tests and a build check
npm run build
```

- `src/look/`: the Look styles and the script that injects them.
- `src/pip/`: the auto pop-out controller. `pip-decide.js` holds the rules.
- `src/ambient/`: Ambient light's source. Its in-player settings menu is replaced by `libs/settings-effects.js` and `libs/ytm-bridge.js`, which apply popup changes live.
- `src/popup/`: the toolbar popup.
- `docs/manual-checklist.md`: what to check by hand in Chrome.

## Credits

- **Ambient light for YouTube™** by Wessel Kroos, https://github.com/WesselKroos/youtube-ambilight (MIT License). ytModify includes its source (commit 18d1718), with error reporting, cloud sync, feedback and donate links removed and the settings menu moved into the popup. The original license is in [`src/ambient/LICENSE-ambient-light.txt`](src/ambient/LICENSE-ambient-light.txt):

  > MIT License. Copyright (c) 2017 Wessel Kroos

- **YouTube Deep Dark** by RaitaroH, https://github.com/RaitaroH/YouTube-DeepDark (GNU GPL v3.0). Its images are bundled in `src/look/images/`.
- **YouTube Premium svg logo** by Phoenix~ (CC BY-NC 4.0). Used without changes, for non-commercial use only.
- **yt-mini-PIP** and **YouTube Bigger Default Player** by Mogdho Paul.

YouTube is a trademark of Google LLC. ytModify isn't affiliated with or endorsed by Google.

## License

GNU General Public License v3.0. See [LICENSE](LICENSE).
