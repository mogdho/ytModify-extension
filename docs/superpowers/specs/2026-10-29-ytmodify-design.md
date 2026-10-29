# ytModify — Design

Date: 2026-10-29
Owner: Mogdho Paul (GitHub: mogdho), author of yt-mini-PIP and the Bigger Default Player style

## 1. Intent

The owner currently runs four separate things on YouTube: their own **yt-mini-PIP** extension, a set of **Stylus** user styles, and the **Ambient light for YouTube** extension. ytModify merges all of them into one Chrome extension with one settings popup opened from the toolbar icon.

It is for the owner's personal use. It is loaded unpacked into their own Chrome and the source is published on GitHub. It will **not** be submitted to the Chrome Web Store, so store policies (trademark use, privacy policy) don't apply.

## 2. Goals

1. **Auto pop-out (PiP)**: the yt-mini-PIP behaviour, made reliable.
2. **Look**: the four Stylus styles built in, each switchable: Deep Dark theme, YouTube Sans font, Premium logo, bigger player.
3. **Ambient light**: every feature of Ambient light for YouTube v2.38.17, rebuilt from its source, with all its settings moved into the ytModify popup.
4. One popup holds all settings, and changes apply to open YouTube tabs live, with no page reload.

### Non-goals
- No custom mini-player controls (Document PiP). The owner chose the basic Chrome pop-out.
- No Chrome Web Store release. No Firefox build. (The Ambient source supports Firefox, but we don't test or ship it.)
- No code from **Enhancer for YouTube**. It is "All Rights Reserved" and is in the reference folder only by accident. Nothing from it is used.

### Anti-goals (it fails if any of these happen, even if it technically works)
- Ambient light loses any feature or setting compared with the original (except the ones deliberately removed in §5.3).
- ytModify sends any data off the machine. All Sentry error reporting is removed.
- Ambient light's page theming fights Deep Dark (flashes of light theme, grey backgrounds).
- The pop-out fires on paused videos, or the page logs a stream of PiP errors.
- Ambient light's settings still appear inside the YouTube player. The popup must be the only settings screen.

## 3. Sources (input material)

All are on the owner's machine under `C:\Users\Lenovo\Desktop\Youtube\`:

| Source | Location | License |
|---|---|---|
| yt-mini-PIP | `yt-mini-PIP/` (clone of github.com/mogdho/yt-mini-PIP) | owner's own; relicensed into ytModify as GPL-3.0 |
| Bigger Default Player | `features i want/Stylus - Yt modify/Stylus - Yt modify/YouTube Bigger Default Player.user.css` | owner's own; relicensed into ytModify as GPL-3.0 |
| YouTube Sans | `…/YouTube Sans.css` | no license stated; trivial font-family CSS |
| YouTube Premium svg logo | `…/YouTube Premium svg logo.css` (author "Phoenix~") | CC-BY-NC-4.0 |
| Deep Dark theme v4.7.4 | `…/Deep dark theme.user.css` (github.com/RaitaroH/YouTube-DeepDark) | GPL-3.0 |
| Ambient light for YouTube v2.38.17 | source: github.com/WesselKroos/youtube-ambilight (commit 18d1718, 2025-11-21). The built copy in `features i want/Ambient light for Youtube/` is for reference only. | MIT (the LICENSE file; `package.json` says ISC, but LICENSE wins) |
| Icon | `logo insparation.png` (red rounded "play" logo) | owner-supplied |

**Licensing consequence:** because Deep Dark is GPL-3.0, ytModify is released under **GPL-3.0**. The README has a Credits section that keeps the MIT notice for Ambient light, names the Premium logo author with its CC-BY-NC-4.0 terms, and credits Deep Dark.

## 4. Approaches considered (Ambient light)

| | Approach | Trade-off |
|---|---|---|
| A | Reuse Ambient light's built bundle as-is | Every feature on day one, no build step. But the code is bundled and hard to edit, and its settings would stay in the in-player menu. |
| **B (chosen)** | **Rebuild from the public source on GitHub** | Same features from readable code. All settings can move into the popup, and Sentry can be removed cleanly. Needs Node and a build step. |
| C | Write a new ambient light from scratch | Rejected. Full parity would take very long and still be worse than the original. |

The owner picked **B** because having every Ambient setting in the ytModify popup matters to them.

## 5. What gets built

### 5.1 Auto pop-out (PiP tab)

Behaviour:
- When the YouTube tab with a **playing** video loses visibility, the video goes into Chrome's standard Picture-in-Picture. "Loses visibility" covers two cases: switching to another tab, and switching to another app or window.
- When the user comes back to that tab, PiP closes and the video returns to the page.
- Paused or ended videos never pop out.
- If Chrome refuses the request (for example, no recent user activation), retry once after a short delay, then give up silently. No uncaught promise errors, no console spam.

**What works today:** the owner confirms that with yt-mini-PIP, both tab switch and alt-tab currently pop the video out on their Chrome. That's the baseline: ytModify must do at least as well on both.

**Chrome's limits:** `requestPictureInPicture()` called from `visibilitychange`, `onFocusChanged` or `executeScript` usually fails because there's no recent user click or key press. The path that works in practice is Chrome's own auto-PiP, triggered through the Media Session `enterpictureinpicture` handler and `autoPictureInPicture`. Chrome decides when that fires and closes the window itself when the user returns. So:
- The builder must first find out which mechanism actually produces today's working behaviour, and make that the single primary path. Retries and fallbacks are allowed only if they don't spam errors.
- If a toggle turns out to be impossible to honour, for example "Pop back in when I return = off" (because Chrome closes the window itself) or "tab switch off but app switch on", keep the toggle only if it can be honoured. Otherwise remove it and note this in the README. Don't ship a switch that does nothing.

Reliability changes compared with yt-mini-PIP (the builder decides how):
- **Exactly one trigger path.** Today, the background `tabs.onActivated` / `windows.onFocusChanged` handlers and the content-script `visibilitychange` handler both fire, and they race.
- Remove the `setInterval(…, 1500)` loop and the whole-`body` `MutationObserver`. Re-apply the "allow PiP" fixes only when a video element appears or changes (for example, on `yt-navigate-finish` or a `loadedmetadata`-type event).
- Keep the useful tricks: clear `disablePictureInPicture`, set `autoPictureInPicture`, and register the Media Session `enterpictureinpicture` handler.

Settings (popup → **PiP** tab):
| Setting | Default |
|---|---|
| Auto pop-out (master) | on |
| ├ When switching tabs | on |
| ├ When switching to another app | on |
| └ Pop back in when I return | on |
| Also on Shorts | **off** |

### 5.2 Look (Look tab)

Each style is injected as its own stylesheet that can be switched on or off independently, live.

| Setting | Default | Notes |
|---|---|---|
| Player size: Normal / Big | Big | "Big" applies the Bigger Default Player CSS. "Normal" removes it. |
| └ How much bigger (slider) | 15% | Replaces the hard-coded `1.15` multiplier. Suggested range 0–30%. |
| Deep Dark theme | on | Applies Deep Dark v4.7.4. |
| └ Accent colour (picker) | `#ff0033` | Drives Deep Dark's `--main-color`. |
| YouTube Sans font | on | |
| Premium logo | on | Light and dark variants, as in the original CSS. |

Notes:
- The Stylus files are wrapped in `@-moz-document`. Chrome doesn't support that, so strip the wrapper and apply the inner CSS only on matching pages. Deep Dark's regexp excludes gaming/music/tv/studio/premium; keep those exclusions.
- **Deep Dark wins every conflict** with Ambient light (see §5.3).

### 5.3 Ambient light (Ambient tab)

Port the Ambient light source into the ytModify project and build it with ytModify's build.

Keep **all** features: the canvas and WebGL renderers, black-bar and coloured-bar detection (the worker), frame blending, frame sync, HDR adjustments, directions, video resizing, view modes (small, theater, fullscreen, picture-in-picture, embeds, VR/360), page header and page content shadows, stats overlays, energy saver, the Chromium workarounds, the live-chat styling, and the keyboard shortcuts (for example `G` for on/off).

Deliberate removals and changes:
1. **The in-player settings menu and its button are removed.** The popup is the only settings screen.
2. **Sentry is removed completely.** That means `libs/errors/sentry-reporter`, every `SentryReporter.*` call, the `crashOptions` plumbing, and the `@sentry/*` dependencies. Errors go to `console` only.
3. **Theme control is handed to Deep Dark.** While Deep Dark is on, the `theme` setting ("Appearance (theme)") is forced to **Dark (1)** and hidden. (Build finding: on "Default", Ambient paints the page white for light-mode YouTube accounts, which beats Deep Dark. On Dark, `html[dark]` switches once on load and stays, which is invisible under Deep Dark.) `pageBackgroundGreyness` is also hidden and forced to 0. When Deep Dark is switched **off**, both settings come back in the popup with their saved values. The header and page-content shadow and opacity settings always stay, because they only affect the glow.
4. Remove the donate link, the feedback-form links, the "settings moved" image and the update/intro notices.
5. Import/export of settings: keep **file** import/export, in the popup's Ambient tab (§5.4). **Cloud import/export (`chrome.storage.sync`) is dropped.** The owner decided this, so no settings leave the machine.

**The key technical gap:** Ambient light stores each setting in `chrome.storage.local` as `setting-<name>`, but the running page does **not** react to outside changes. Today only the in-player menu changes settings, and it calls into the `Ambientlight` instance directly with the right side effects (re-init the canvas, restart the worker, and so on). ytModify needs a bridge: popup writes to storage → the `Ambientlight` instance hears `storage.onChanged` and applies the change with the **same side effects the menu's change handlers had**. The instance runs in the content script's isolated world (`content-main.js` is loaded by `import()`), so it can listen to storage directly. When the old menu code is removed, its "on change" logic must be kept and reused by the bridge, not lost.

The bridge must ignore values the page writes for itself, such as the detected bar sizes that bar detection auto-saves. Otherwise one tab's detected bars would be pushed into every other tab. Only popup-originated changes are applied live; the builder decides how to tell them apart.

**Status and warnings:** the in-player menu was the only place Ambient showed its warnings and errors: failed to load, DRM/encrypted video, WebGL crash fallback, frame-fading and flicker notices. These move to a **status strip at the top of the popup's Ambient tab**, showing the current warnings for the active tab, and are also written to the console. Nothing is shown inside the player. (Claude's call.)

**Keyboard shortcuts** stay **rebindable**, as in the original (`setting-<name>-key`, defaults G/B/V/H). The popup shows a key-capture field next to each setting that has one, and rebinding applies live.

**Big player vs Ambient video resizing:** they layer. Big player changes the page layout (how big the player box is), and Ambient's `videoScale.*` scales the video inside that box. No coordination is needed beyond checking that both together look right. (Claude's call.)

Settings (popup → **Ambient** tab):
- A master **Ambient light** on/off switch at the top.
- A **search box** that filters settings by label.
- **Collapsible sections**, built from Ambient's own `settings-config.js`, in the order that file defines them (its section names and order are the source of truth). Advanced-only settings stay hidden until "Advanced" is switched on, as in the original.
- Ambient's own toolbar popup (`src/options.html` / `options.js`) is replaced by the ytModify popup. Its import/export features move into the Ambient tab footer, and its crash-report options are dropped along with Sentry.
- Every setting has the same type, range, step, snap points, default and description as in the original. WebGL-only settings stay greyed out when WebGL is off, as in the original.

### 5.4 Popup

- About 360px wide, in the Deep Dark palette (`#111` / `#181818` / `#232323`, accent `#ff0033`), with the ytModify icon and name in the header.
- Three tabs, **PiP · Look · Ambient**. The last tab used is remembered.
- Every change saves immediately and applies to all open YouTube tabs without a reload.
- The Ambient tab has a small footer for importing and exporting settings (the JSON format of the original) and resetting to defaults.
- Mockups that were approved: see `.superpowers/brainstorm/…/popup-layout.html` (layout A) and `pip-look-tabs.html`.

### 5.5 Packaging

- Manifest V3, Chrome only. Host scope `https://www.youtube.com/*` (plus `/embed/*` and `live_chat` as Ambient needs). Permissions: `storage`, plus whatever the PiP trigger path really needs. Drop unused ones (yt-mini-PIP's `activeTab` is likely unneeded).
- Name "ytModify". Icon from `logo insparation.png` in 16/32/48/128.
- New folder `C:\Users\Lenovo\Desktop\Youtube\ytModify\` as its own git repo. The old `yt-mini-PIP` repo stays untouched.
- Node build (Ambient already uses Rollup + Sass). `npm run build` → `dist/`, which is loaded unpacked. The README explains build, load, and credits.

## 6. Decided by the owner

- Approach B (rebuild Ambient light from source).
- Deep Dark wins all theme conflicts.
- Settings live in a toolbar popup. The popup is the **only** settings screen.
- Popup layout A: tabs PiP · Look · Ambient, with search and collapsible sections in the Ambient tab.
- Basic Chrome pop-out, not a custom mini player.
- Keep all three suggested extras: Also on Shorts, the size slider, the accent colour.
- Personal use plus a public GitHub repo. No store release.
- Pop-out currently works on both tab switch and alt-tab, and ytModify must keep both working.
- Ambient's cloud settings sync is dropped.
- The owner is Mogdho Paul, so their own yt-mini-PIP and Bigger Player code can be relicensed under GPL-3.0.

## 7. Claude's calls (owner may override)

- Each Look style gets its own switch.
- Ambient keyboard shortcuts are kept.
- Sentry, donate and feedback links are removed.
- While Deep Dark is on, `theme` is forced to Dark and hidden, and `pageBackgroundGreyness` is hidden. Both come back when Deep Dark is off.
- Ambient warnings go to a status strip in the popup's Ambient tab.
- Shortcut keys stay rebindable in the popup.
- Big player and Ambient video resizing simply layer.
- GPL-3.0 license for the repo.
- New repo folder instead of evolving yt-mini-PIP in place.

## 8. Left to the builder

- Project structure and module layout, and whether to keep Rollup or switch bundlers.
- The exact PiP trigger mechanism, as long as there is one path and §5.1's behaviour holds.
- The popup's UI implementation (plain JS is fine; no framework is required).
- How the styles are injected (`chrome.scripting.insertCSS`, `<style>` elements from a content script, or similar).
- Default value for "How much bigger", slider range and step.
- Testing approach. At minimum, a manual checklist covering every popup setting on a real YouTube watch page.
