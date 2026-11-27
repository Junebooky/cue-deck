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

While the audience window is open, its placement is checked periodically. A misplaced or closed window fails closed instead of routing subtitles to another display. PROGRAM shows the exact test view sent to the audience during diagnostic mode.

## Audience caption size
The operator toolbar has 자막 크기 (90–120%, 5% increments, default 100%). Draft changes only update the local proportional sample; Apply changes the audience and both console monitors without advancing the cue or clearing BLACK. Electron persists the setting in userData; browser rehearsal has its own local setting. Shared fit logic measures the actual grid with rounding tolerance and fits uniform text within the 16:9 safe region; exceptionally dense frames can shrink below the requested minimum and are flagged for review in operator monitors. The preview retains its modest readability uplift; the settings sample uses the audience proportional target. Check actual screen readability before the show.

## Cue group reader
C layout preserves original cards inside one frame group, with one GO/preview selection per frame. Explicit sourceBlockIds define membership; old packages without it stay anchor-only and show a warning for non-demo productions. The private 1126 grouped package is distributed separately, not committed. Activate it via Script Manager to enable the reviewed ranges. PROGRAM groups have stronger red elevation and border beam; PREVIEW groups have a subtler blue treatment. The audience frame contents/order do not change.

## Offline audience fonts
Four Korean font families are bundled into the Vite build via local npm assets: Pretendard (default), Noto Sans KR, IBM Plex Sans KR, Noto Serif KR. Install/update dependencies and build before going offline; no CDN or OS font installation is required for these families. The toolbar's 자막 폰트 selector applies immediately after local font loading, preserves the cue and BLACK state, and persists separately in Electron and browser rehearsal. The audience waits for the selected font and fallback to load before acknowledging a nonblack frame. Font changes refit all caption cells; existing size limits remain. Font license notices are copied into dist/font-licenses. Review any uncommon glyph fallback and physical readability at rehearsal. The operator script font is not changed by the selector.

## Source frame grouping compatibility
Legacy data without sourceBlockIds can form a group only when a unique exact text match (ignoring whitespace and an explicit actor/tab prefix) starts at its existing anchor and stops before the next cue. Aligned table columns must match independently. Unresolved lyric ranges remain anchor-only and are counted in the reader; import the reviewed grouped package for complete coverage. No source IDs or audience frames are mutated. Act/scene/song headings are centered separators; any anchored BLACK button remains available. Keyboard and cue playback semantics are unchanged.

## Manual reader steps
Arrow Right/Left (or 대본 buttons) move through the ordered cue anchors plus every unanchored drama/NAR block. Entering a drama/NAR reading-only step manually blacks the audience if necessary, retains the last cue number, and shows READ · BLACK on the source card. Already-black steps do not resend the frame. Entering a mapped cue with arrows sends that cue once. Space/GO retains direct audience cue navigation, including jump confirmation; it intentionally bypasses reading-only steps. Headings and directions without cues are context, not mandatory stops. B never restores a lyric during a reading hold. No audience data change or extra numbered cues. FOLLOW controls scrolling, not step membership.

Explicit arrow navigation always scrolls to the selected script step, even with FOLLOW OFF (which controls automatic cue following). Empty unanchored drama/NAR blocks are skipped; anchored BLACK cues remain. Reading hold state clears on production or output session changes.

## Rehearsal Notes
Start a rehearsal from 리허설 노트. E marks only the current live cue or READ (drama/NAR) stop, never PREVIEW or mouse hover. It does not issue playback commands. Repeated keydown is ignored; separate presses add occurrences; Ctrl/Cmd+Z removes the latest occurrence in the active session. Notes retain source text, full grouped membership, version, scene, actor, cue, timestamp and elapsed time. Filter by rehearsal, actor, scene, type and resolution; edit actual speech, detail and memo (saved on blur), jump to same-version source without GO, export filtered CSV or copy text. Notes are stored separately in operator localStorage (Electron profile or browser origin); no upload, no audience data, no script edits. Mode is off after reload, notes remain. Keep CSV backups; clearing site/app storage removes local notes. Use a single operator tab per rehearsal. Repetition totals are exact-version only to avoid false matches across revisions.

## Keyboard reliability
B or Ctrl+B uses the existing BLACK/RESTORE toggle (READ stays black); E or Ctrl+E marks the active LIVE/READ position only in a started rehearsal. Physical KeyB/KeyE work across keyboard layouts outside active IME composition. Capture-phase keyboard handling allows focused console buttons while protecting text fields, selectors, splitters and dialogs. Electron reserves those shortcuts from the application menu only in the operator window, not system-wide. The operator window must be focused. Holding a key never repeats a toggle or mark. Busy/unavailable actions display a notice. No change to Space or arrow playback semantics.

The script reader shows exact tab-delimited duplicate speaker prefixes in the actor header only, while preserving the source paragraph and formatting in the imported package. Genuine names within lyrics, table cells, and audience frames are unchanged. Rehearsal notes retain the original source text for audit.

Reader typography: A−/A+ now spans 9–28px in 1px steps. At 12px and below, script cards, metadata and group spacing become compact; click the displayed size to restore 17px. This does not affect audience typography or monitor sizing. The smallest settings are intended for operators who prefer a dense overview, not recommended for distant viewing.
