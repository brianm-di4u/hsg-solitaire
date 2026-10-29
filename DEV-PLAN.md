# Spa City Solitaire: development plan

The game is a single hand-written file, `games/solitaire/index.html`, with no build step: the budget is
about 5k lines, and the inliner is used only past that. Tests live in `games/solitaire/tests/*.test.mjs` and
run with `node shared/test-harness/run.mjs games/solitaire --milestone <m>`.

## Milestones and tasks

### M1: foundation
- HTML skeleton with inline tokens (light and dark), the top bar and toolbar DOM, and modal containers.
- A DPR-correct canvas, resize handling, and the render-on-demand loop.
- RNGs: mulberry32, the MS FreeCell LCG, and FNV-1a for the daily seed.
- The state model and the notation encode/decode for `getState` and `setState`.
- The card face renderer (pips, indices, courts placeholder) and the sprite cache. One back (felt table + lozenge).
- Klondike deal and static layout.
- `window.__game`: `seed`, `getState`, `setState`, `isIdle`, `scene`, `newGame`, `getLayout`.
- Tests: deal shape (AC 1), FreeCell vectors (AC 6), and screenshots of the static Klondike table.

### M2: core loop
- The rule objects for Klondike, FreeCell, Spider and Yukon (`canPick`, `canDrop`, `stockAction`, `afterMove`, `isWon`).
- The move executor with snapshot undo and redo, and the scoring hooks.
- Pointer drag and drop, tap to auto-move, and tweens (move, flip, deal).
- Toolbar actions: New, Undo, Redo and Draw; the status strip (score, moves, timer).
- Win detection and a basic win dialog.
- Tests: AC 2–5, 7–15, 20 and 22.

### M3: full rules and content
- Hints, auto-complete and safe autoplay.
- The full keyboard model, the live region and the cursor ring.
- All 12 backs and 5 tables, plus the back and table picker.
- Court archetypes and the ace flourishes.
- The title screen with the skyline and the mode picker, and the Daily Deal.
- The deal chooser dialog.
- Stats, persistence and Continue.
- The bath-ticket win dialog with the fact card (the inlined trivia subset).
- Tests: AC 16–19, 21, 23–27, 29–31.

### M4: polish, audio, accessibility
- WebAudio sound set and the settings dialog: sound, volume, motion, left-handed layout, card size,
  four-color suits, autoplay mode and timer.
- The tufa-cascade win animation and steam on shuffle.
- Help screen. Focus trapping and Esc on dialogs. Reduced motion.
- Contrast checks in dark mode, and a touch-target audit.
- Tests: AC 28, 32–40.

### M5: optimization and release
- Measure FPS, memory, load time and file size; trim.
- Final full matrix run (`--milestone final`), gallery check, and `REPORT.md`.
- Tests: AC 41.

## `window.__game` hook spec

See MECHANICS §9; that table is the contract. Notes:
- `act()` returns `{ok:boolean, reason?:string}`. A failing move never throws.
- `act('skip')` jumps every tween and the cascade to their end state, for screenshot determinism.
- `getLayout()` coordinates are CSS px relative to the viewport, so tests can drive `t.page.mouse` or
  `t.page.touchscreen` straight from them.
- `setSettings()` accepts any subset of the settings keys.

## Test matrix

Screenshots are taken at both viewports (desktop 1280×800, mobile 390×844) unless the test names one, and are
saved as `screenshots/<milestone>/<viewport>/<name>.png`.

| AC | Test (file › name) | Screenshot(s) |
|---|---|---|
| 1 | rules › klondike deal shape | `rules-01-klondike-deal` |
| 2 | rules › klondike draw 1 and draw 3 | `rules-02-draw3` |
| 3 | rules › klondike tableau legality | n/a (assertions) |
| 4 | rules › auto flip exposed card | n/a |
| 5 | rules › yukon deal and group move | `rules-05-yukon` |
| 6 | rules › freecell deal vectors 1 and 617 | `rules-06-freecell-617` |
| 7 | rules › freecell supermove capacity | n/a |
| 8 | rules › spider deal and stock block | `rules-08-spider4` |
| 9 | rules › spider completes a run | `rules-09-spider-run` |
| 10 | rules › spider suit sets | `rules-10-spider1` |
| 11 | rules › foundation legality | n/a |
| 12 | play › win detection per mode | `play-12-win-<mode>` (klondike) |
| 13 | play › pointer drag and drop | `play-13-dragging`, `play-13-dropped` |
| 14 | play › tap auto-move | `play-14-tap` |
| 15 | play › undo redo 30 deep | n/a |
| 16 | play › hint cycle and no-move message | `play-16-hint` |
| 17 | play › auto-complete | `play-17-autocomplete-offer` |
| 18 | play › safe autoplay on/off | n/a |
| 19 | play › keyboard-only game | `play-19-keyboard-held` |
| 20 | rules › same deal number same layout | n/a |
| 21 | rules › daily deal determinism | n/a |
| 22 | play › scoring and timer | n/a |
| 23 | persist › stats survive reload | `persist-23-stats` |
| 24 | persist › continue after reload | `persist-24-continue` |
| 25 | persist › storage throws | `persist-25-nostorage` |
| 26 | screens › twelve backs | `screens-26-backs`, `screens-26-back-<id>` (desktop, all 12) |
| 27 | screens › five tables | `screens-27-table-<id>` |
| 28 | screens › face legibility at spider mobile size | `screens-28-spider-mobile`, `screens-28-faces` |
| 29 | screens › courts and aces | `screens-29-courts` |
| 30 | play › win screen | `play-30-cascade`, `play-30-win` |
| 31 | screens › title | `screens-31-title`, `screens-31-title-dark` |
| 32 | screens › settings persist | `screens-32-settings` |
| 33 | screens › reduced motion | n/a |
| 34 | screens › left-handed | `screens-34-lefthanded` |
| 35 | screens › card sizes | `screens-35-size-large` |
| 36 | screens › four color | `screens-36-fourcolor` |
| 37 | screens › touch targets and overflow (all scenes) | covered by the shots above + `checkLayout` |
| 38 | screens › contrast light/dark | `screens-38-game-dark` |
| 39 | screens › help | `screens-39-help` |
| 40 | all tests (the harness fails on console errors and external requests) | n/a |
| 41 | perf › load, fps, size | `perf-41-cascade` |

## Defect log

| # | Milestone | Found by | Defect | Fix | Status |
|---|---|---|---|---|---|
| 1 | M1 | test (rules-02, rules-11) | Tests assumed no autoplay. With safe autoplay on by default, a drawn ace flew home and broke the expected counts | Tests set `autoFoundation: 'off'` where they count cards. The behavior is correct | Fixed (test) |
| 2 | M1 | test (rules-07, rules-08) | Crafted positions were wrong: a 3-card FreeCell target that didn't fit, and a Spider fill that emptied another column | Corrected the positions | Fixed (test) |
| 3 | M1 | screenshot `rules-01` | A gold focus frame showed around the table even with no keyboard use (programmatic focus matched `:focus-visible`) | The ring now shows only in keyboard mode (`#cv.kb:focus`) | Fixed |
| 4 | M1 | screenshot `rules-06` | The bottom-right rotated index overlapped the court-card frame | Shorter court panel, and a fixed small bottom index (0.19 × width) | Fixed |
| 5 | M1 | screenshot `rules-01` mobile | The shuffle steam burst read as a white glare blob over the stock | Lower alpha (0.16) and smaller puffs | Fixed |
| 6 | M1 | screenshot header | "Klondike · Draw 1" rendered with a lopsided gap (middle-dot spacing in the Deco font) | The header reads "Klondike (Draw 1)" | Fixed |
| 7 | M2 | test (play-16) | Hint list had the same ace move once per empty foundation | Only the first empty foundation is offered | Fixed |
| 8 | M2 | test (play-22) | A one-card FreeCell position counted as a win and added the time bonus | Test position given a second card. The behavior is correct | Fixed (test) |
| 9 | M2 | screenshot `play-30-win` mobile | The bath-ticket header wrapped onto two lines | Shortened to "SPA CITY BATH TICKET" | Fixed |
| 10 | M3 | screenshot `screens-31-title` mobile | The "1 suit" and "Deal #…" chips were clipped | Chips wrap (`flex: 1 0 auto`), with clearer labels ("2 suits", "4 suits", "Deal #") | Fixed |
| 11 | M3 | screenshot `screens-31-title` mobile | On narrow screens the Quapaw dome and Hale bell gable stretched into tall spikes | Dome and gable height capped relative to building width | Fixed |
| 12 | M3 | screenshot `screens-26-backs` | Scallop & Sculpin back was sparse, and the gold "original" fish were too small to see | Redrawn with red-tile parapet bands, large scallops and gold fish, plus white "today" fish in the medallion | Fixed |
| 13 | M3 | screenshot `screens-29-courts` | The court test fanned the courts so only the jacks were visible | The test now uses FreeCell layouts with each court on top (2 shots) | Fixed (test) |
| 14 | M3 | screenshot `screens-37-stats` | Focus went to the first stats tab, not the selected one | The selected tab gets focus | Fixed |
| 15 | M3 | screenshot `persist-25` | A zero-time win showed "Best time n/a" | Best time is stored as at least 1 ms | Fixed |
| 16 | M4 | test (screens-32 sound) | The test clicked the New button under the title overlay | The test starts from a title chip | Fixed (test) |
| 17 | M4 | code review | Undo was possible during the post-win pause, and a pending win timer could fire into a new deal | Undo is blocked once won, and the win timer is cleared on new deal and resume | Fixed |
