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

## Operator navigation (A-1)
Scene and musical-number links browse the original script without issuing GO. The search field keeps the whole script visible, marks matching passages, and allows next/previous results. Ctrl/Cmd+F focuses search. FOLLOW ON scrolls to the current cue after GO/PREV, keeping preceding context; turn it off for independent browsing. Drag either panel divider, use arrow keys while its separator is focused, or double-click to reset. Panel widths, script size and follow preference persist locally. Non-sequential cue selection is preview-only; GO opens an explicit confirmation before sending that cue. Cancel returns to sequential operation. The browser preview exercises operator controls but not native display APIs. Run `npm run test:ui` after installing Playwright Chromium (`npx playwright install chromium`).

## Local file import and console colors
Store private show packages anywhere on your machine (for example `private/decadence-gyeongseong_1126.cuedeck.json`, which is gitignored). In Script Manager, choose JSON, then activate the imported revision. Browser rehearsal mode (`npm run dev`) now imports and stores packages in local IndexedDB for the same browser/origin; this library is separate from the Electron userData library. Re-import into Electron (`npm run start`) for actual dual-display output. No upload or API is involved. Clearing browser site data removes the rehearsal library, so keep the original JSON. PROGRAM's red lamp gently pulses; the separate PREVIEW/WAIT/ON AIR label communicates connection status. Cue type (CUE, DUET, PLACE, BLACK) remains visible independently of NEXT/LIVE; the source reader distinguishes lyrics, dialogue, NAR, directions and scene headings. Audience colors unchanged.

## Revision review
Import the new private JSON while off-air. Compare it with the active version. Scene, full-script block and audience cue changes are listed side by side, with original anchors, cue type, column text and GO trigger. Same-production activation requires an explicit review acknowledgement against the currently active package. Older versions remain available, including rollback through the same review flow. Comparisons use declared IDs; new/deleted IDs are not automatically matched by lyrics, and changed positions are measured relative to common IDs so simple insertions do not flag all later cues. This is a textual/data diff, not a proof of live timing or correct ID assignment. DOCX/PDF conversion remains an external reviewed preparation step.

## Console readability
PROGRAM/PREVIEW use an independent operator-only caption renderer with larger short-line font sizes and measured fitting after resize/font load. All simultaneous lyric rows share one fitted size. The physical audience renderer is unchanged. PROGRAM frame uses the red label color; PREVIEW uses the blue label color. Source cards have stronger current-cue elevation and a subtler next-cue border beam. Reduced-motion settings disable beam animation. These are visual indicators of the selected cue, not proof of physical output.

## Extended display troubleshooting
Use the Electron app, not browser rehearsal. Display selection shows coordinates and excludes the operator's actual display, even if it is not primary. On macOS the audience uses simple fullscreen to avoid native Spaces transitions; other platforms use native fullscreen. Startup checks actual selected-display geometry, renderer ACK, retries and timeouts. After connection, the audience is intentionally black until GO. Use 화면 테스트 to show an explicit diagnostic pattern and 테스트 종료 · BLACK to return to black. GO/PREV are blocked during testing. Physical HDMI/three-monitor testing is still required; the automated display tests cover geometry and selection policy, not actual hardware.
