# ytModify development

```sh
npm test     # unit tests and a build check
npm run build
npm run zip   # build, then pack dist/ into dist/ytModify.zip for sharing
```

- `src/look/`: the Look styles and the script that injects them.
- `src/pip/`: the auto pop-out controller. `pip-decide.js` holds the rules. When you return to the tab, a window Chrome opened is left for Chrome to close (`CHROME_CLOSE_MS`); closing it in the same moment makes Chrome hang with the window hidden.
- `src/ambient/`: Ambient light's source. Its in-player settings menu is replaced by `libs/settings-effects.js` and `libs/ytm-bridge.js`, which apply popup changes live.
- `src/popup/`: the toolbar popup.
- `docs/manual-checklist.md`: what to check by hand in Chrome.

Manual checks to run in Chrome: [manual-checklist.md](manual-checklist.md).
