# ytModify development

```sh
npm test     # unit tests and a build check
npm run build
```

- `src/look/`: the Look styles and the script that injects them.
- `src/pip/`: the auto pop-out controller. `pip-decide.js` holds the rules.
- `src/ambient/`: Ambient light's source. Its in-player settings menu is replaced by `libs/settings-effects.js` and `libs/ytm-bridge.js`, which apply popup changes live.
- `src/popup/`: the toolbar popup.
- `docs/manual-checklist.md`: what to check by hand in Chrome.

Manual checks to run in Chrome: [manual-checklist.md](manual-checklist.md).
