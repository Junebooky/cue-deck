# Cue Deck — Manual Performance Console

React / Tailwind CSS / Vite / Electron. A-1 Studio Console: scene explorer, full script, program and preview, manual GO/PREV/BLACK. No ASR, no AI, no external runtime services.

## Run (development)
Install Node.js 22.12+ and use:
```sh
npm install
npm run start
```
First installation needs internet; runtime uses local files only. `npm run dev` is browser UI preview (no native output). Not a packaged .app yet.

Connect an extended display (not mirror). Click 공연 시작, choose a display other than the operator's, start in black. Space / right = GO, left = PREV, B = BLACK / restore. Clicking a cue arms preview only. Scene navigation and search never issue GO. The audience renderer acknowledges a rendered frame; this is not proof of physical projection. Verify actual HDMI output, fullscreen and readability before use. Disconnect closes output; reopen in black. No automatic live resume.

## Production package
Import `.cuedeck.json` from Script Manager, review, then activate. Previous packages are retained in Electron userData/shows and selected version persists. Import/activation blocked during output. Sample data is invented; no actual performance script is committed. Do not commit private scripts, fonts, recordings, or packages.

See [data contract](docs/package.md). Future DOCX/PDF updates should be extracted and reviewed externally, then exported as the same versioned package; no application rebuild required. Existing source IDs retained when possible; displayed cue number is derived from order. Full script includes dialogue, NAR and directions; audience frames contain only approved captions/place/black. Private 1126 packages may be imported; no performance text is committed. Native display tests, type migration, packaging and rehearsal remain separate milestones.

`npm test`: pure model tests. `npm run build`: frontend build. CI does not test physical screens.
