# Fixed quality per view: design

Date: 2026-10-29. Size: small change.

## Intent
The owner wants YouTube to always play at a chosen quality depending on how they're watching: 1080p in fullscreen, 720p in the normal player and the pop-out window, and 360p in YouTube's mini player (the corner player that opens with `i`). That saves data and CPU in small views and gives the best picture full screen.

## Goals
- One quality per view, applied automatically when the view changes and when a new video loads, including YouTube's in-page (SPA) navigation.
- Views:
  - **Normal & pop-out**: the normal player, theater mode (owner doesn't use it), and the PiP pop-out window.
  - **Fullscreen**.
  - **Mini player**.
- If a video doesn't offer the chosen quality, use the highest one *below* it, and never a higher one.
- "Auto" per view leaves the choice to YouTube.

## Non-goals / anti-goals
- No clicking through YouTube's gear menu, and nothing visible on screen.
- Must not depend on Ambient light being on.
- Must not fight a manual change: if the owner picks a quality in YouTube's menu, ytModify leaves it until the next view change or the next video.

## Approach (chosen)
Use YouTube's player commands (`getAvailableQualityLevels`, `setPlaybackQualityRange` / `setPlaybackQuality` on `#movie_player`) from ytModify's MAIN-world page script. Rejected:
- Automating the gear menu: visible, and breaks when YouTube redesigns it.
- Driving it from Ambient light's view detection: it would stop working with Ambient off.

## Settings (popup → new **Quality** tab)
| Key | Default |
|---|---|
| `ytm-quality-enabled` | true |
| `ytm-quality-normal` (normal, theater, pop-out) | `hd720` |
| `ytm-quality-fullscreen` | `hd1080` |
| `ytm-quality-mini` | `medium` (360p) |

Choices: Auto, 144p `tiny`, 240p `small`, 360p `medium`, 480p `large`, 720p `hd720`, 1080p `hd1080`, 1440p `hd1440`, 2160p `hd2160`.

## View detection (Claude's call)
- **Fullscreen:** `document.fullscreenElement`.
- **Mini player:** `ytd-miniplayer` is active, or `ytd-app[miniplayer-is-active]`.
- **Pop-out:** `document.pictureInPictureElement` counts as normal.
- **Normal:** everything else.
- Re-applied on `fullscreenchange`, mini-player attribute changes, `enter/leavepictureinpicture`, `loadedmetadata`, `yt-navigate-finish`, and a ytModify settings change.

## Left to the builder
The exact attribute YouTube uses for the mini player, the debounce timing, and the Shorts behaviour (apply Normal).
Testing: unit tests for the pure "pick quality" and "which view" logic. The owner tests in Chrome.
