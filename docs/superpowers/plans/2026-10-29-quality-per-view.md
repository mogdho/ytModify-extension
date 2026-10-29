# Fixed Quality per View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** YouTube automatically plays at a chosen quality per view: Normal & pop-out, Fullscreen, Mini player.

**Architecture:** A pure core (`src/quality/quality-core.js`) decides the view and the quality to request. A MAIN-world script (`src/quality/quality-main.js`) watches view changes and calls `#movie_player`'s quality API. Settings travel the same way as PiP's: `pip-isolated.js` already relays every ytModify setting to the page. A new popup tab edits them.

**Tech Stack:** as ytModify: plain JS modules, Rollup, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-29-quality-per-view-design.md`

## Global Constraints
- Keys and defaults: `ytm-quality-enabled` true, `ytm-quality-normal` `'hd720'`, `ytm-quality-fullscreen` `'hd1080'`, `ytm-quality-mini` `'medium'`.
- Allowed values: `auto, tiny, small, medium, large, hd720, hd1080, hd1440, hd2160`.
- Never request a higher quality than chosen. A manual change in YouTube's menu stands until the next view change, video change or setting change.
- No new permissions. The owner tests in Chrome (no browser automation for this feature).

## Review Focus
1. The video has no levels yet when `loadedmetadata` fires (levels list empty): retry a few times, then give up quietly. Covered by the Task 2 retry and the owner's check.
2. Pressing `i` on a watch page, then expanding the mini player again: the quality switches back to Normal. Covered by the Task 1 `detectView` test and the owner's check.
3. An "Auto" view after a forced one: YouTube's automatic choice is restored, not left at the forced level. Covered by the Task 1 `qualityRequest` test.

---

### Task 1: Settings and pure quality logic

**Files:**
- Modify: `src/shared/ytm-settings.js`, `tests/ytm-settings.test.js`
- Create: `src/quality/quality-core.js`, `tests/quality-core.test.js`

**Interfaces:**
- Produces:
  - `QUALITY_LEVELS = ['tiny','small','medium','large','hd720','hd1080','hd1440','hd2160']` (low → high).
  - `QUALITY_LABELS`: `{auto:'Auto', tiny:'144p', small:'240p', medium:'360p', large:'480p', hd720:'720p', hd1080:'1080p', hd1440:'1440p', hd2160:'2160p (4K)'}`.
  - `detectView({fullscreen, mini}) => 'fullscreen'|'mini'|'normal'`. Fullscreen wins over mini.
  - `wantedQuality(settings, view) => string`: the setting for that view.
  - `pickQuality(wanted, available: string[]) => string|null`: the highest available ≤ wanted; for `'auto'` it returns `'auto'`; if nothing ≤ wanted is available, the lowest available; `null` if `available` is empty.
  - `qualityRequest({settings, view, available, forcedBefore}) => {action:'set', quality}|{action:'auto'}|{action:'none'}`. Disabled → `'auto'` if `forcedBefore`, else `'none'`. Wanted `'auto'` → `'auto'` if `forcedBefore`, else `'none'`.

- [ ] **Step 1:** Write the failing tests:
  - Defaults include the 4 keys.
  - `getYtmSettings({'ytm-quality-normal':'bogus'})` returns `'hd720'`.
  - `detectView`: `{fullscreen:true, mini:true}` → `'fullscreen'`, `{mini:true}` → `'mini'`, `{}` → `'normal'`.
  - `pickQuality('hd1080', ['hd720','large','medium','auto'])` → `'hd720'`.
  - `pickQuality('hd720', ['hd1080','hd720'])` → `'hd720'`.
  - `pickQuality('medium', ['hd720','hd1080'])` → `'hd720'` (lowest available).
  - `pickQuality('hd720', [])` → `null`.
  - `qualityRequest` cases: set; disabled with/without `forcedBefore`; auto with/without `forcedBefore`; `available` empty → `'none'`.
- [ ] **Step 2:** Run → FAIL. Implement → PASS. Commit: `feat: quality-per-view logic`.

### Task 2: Page script

**Files:**
- Create: `src/quality/quality-main.js`
- Modify: `src/manifest.json` (MAIN world, `document_start`, same matches as PiP), `rollup.config.js`, `src/pip/pip-isolated.js` (also relay on `ytm-quality-*` changes)

**Interfaces:**
- Consumes: the `pip-settings` window message (full ytModify settings) and Task 1 functions.

- [ ] **Step 1:** Implement `quality-main.js`:
  - Listens for `{source:'ytm', type:'pip-settings'}`, stores the settings, and calls `apply()`.
  - `apply()` gets `player = document.getElementById('movie_player')`. The view comes from `detectView({fullscreen: !!document.fullscreenElement, mini: !!document.querySelector('ytd-app[miniplayer-is-active], ytd-miniplayer[active]')})`.
  - It applies when `view` or `videoId` (`player.getVideoData?.().video_id`) differs from the last applied one, or when settings changed.
  - Available levels come from `player.getAvailableQualityLevels()`. If empty, retry up to 5× at 500 ms.
  - `set` calls `player.setPlaybackQualityRange(q, q)`, then `player.setPlaybackQuality?.(q)`. `auto` calls `player.setPlaybackQualityRange('auto','auto')`. Everything is wrapped in try/catch with no console output.
  - Triggers: `fullscreenchange`, `enterpictureinpicture`/`leavepictureinpicture`/`loadedmetadata` (capture), `yt-navigate-finish`, and a `MutationObserver` on `ytd-app`'s `miniplayer-is-active` attribute only (`attributeFilter`). Debounced 150 ms.
- [ ] **Step 2:** Register it in the manifest and Rollup. Add `ytm-quality-` to the relay filter in `pip-isolated.js`.
- [ ] **Step 3:** Run `npm test` → PASS (the build test checks the new script exists). Commit: `feat: apply quality per view`.

### Task 3: Popup Quality tab

**Files:**
- Create: `src/popup/tab-quality.js`
- Modify: `src/popup/popup.html` (a tab plus a panel between Look and Ambient), `src/popup/popup.js` (`TABS`, render, update), `src/popup/ui.js` (`selectRow`), `src/shared/ytm-settings.js` (`ytm-popup-tab` accepts `'quality'`)

- [ ] **Step 1:** Write the failing test: `getYtmSettings({'ytm-popup-tab':'quality'})['ytm-popup-tab'] === 'quality'`. Run → FAIL, implement → PASS.
- [ ] **Step 2:** Add `selectRow({label, hint, options:[[value,label]], value, onChange})` (a `<select>` styled like the other controls). The tab shows the master switch "Fixed quality per view", then **Normal & pop-out** (hint "Also theater mode"), **Fullscreen**, **Mini player** (hint "The corner player, key i"). The selects disable when the master is off. Options run from `auto` and then high → low.
- [ ] **Step 3:** Run `npm run build` and `npm test` → PASS. Add a "Quality" section to `docs/manual-checklist.md` and a row to the README table. Commit: `feat: popup Quality tab`.
