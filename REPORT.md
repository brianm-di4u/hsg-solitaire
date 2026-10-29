# Spa City Solitaire: report

## What was built

`games/solitaire/index.html` is one hand-written, self-contained file. It is 2,358 lines and 162 KB, with no
build step, no network requests and no image or font files. It holds a four-game patience collection set in
Hot Springs, Arkansas.

- **Games**
  - Klondike: Draw 1 and Draw 3.
  - FreeCell: deals 1–1,000,000; 1–32,000 match the classic numbered set. Deals 1 and 617 are verified
    against the published layouts.
  - Spider: 1, 2 or 4 suits.
  - Yukon: added in the PRD because it reuses the Klondike layout and adds a distinct "move any face-up
    group" puzzle.
- **Card backs:** 12, all procedural, each captioned "inspired by":
  - Fordyce Skylight: seeded Voronoi leaded glass, unique per player, with a "Reshuffle the glass" button.
  - Fordyce Lozenge, Quapaw Dome, Row Ironwork, Superior Medallions, Scallop & Sculpin.
  - Neon Night, Medical Arts Deco.
  - Ouachita Pines, Thermal Steam, Lake Ouachita Dusk, Racing Silks.
- **Tables:** 5, namely Card-Table Felt, Linen Postcard, Thermal Pool, Bathhall Marble and Midnight Club.
- **Faces:** standard and readable at 34 px wide (13.6 px index on mobile Spider).
  - Court cards are original archetypes: bath attendant and jockey jacks, parasol-promenade queens, and
    card-room kings in fedoras. No real people.
  - The ace of spades carries a stepped Medical Arts-style tower, and the ace of hearts a magnolia.
- **Play:**
  - Drag and drop, and tap or click to auto-move to the best spot.
  - Full keyboard play: cursor, pick and drop, number keys and shortcuts, with a live region announcing moves.
  - Unlimited undo and redo, and hints that cycle through ranked moves with glow highlights.
  - Auto-complete, and safe, all or off autoplay to the foundations.
- **Deals and stats:**
  - Seeded deal numbers, a "choose deal" dialog and daily deals (7 per day, one per variant).
  - Scoring per mode, a timer, and per-variant statistics in `localStorage`: played, won, streaks, best time,
    fewest moves, best score.
  - Continue resumes the exact position with its undo history.
- **Win:** a tufa-cascade animation, where cards tumble down three tufa terraces with steam puffs, then a
  "bath ticket" score card.
  - The ticket tracks a "course of 21 baths". The 21-bath course is from the 1920 NPS brochure; the ticket
    design is invented.
  - A "Did you know?" fact card shows one of 52 confirmed items from `research/trivia-bank.json`, with its source.
- **Title screen:** a procedural Bathhouse Row skyline (8 bathhouses north to south) with steam, the mode
  tiles, daily progress and Continue.
- **Settings:**
  - sound and volume
  - motion: Auto (follows `prefers-reduced-motion`), Full or Reduced
  - left-handed layout
  - card size: Compact, Standard or Large (Large also enlarges indices)
  - four-color suits
  - autoplay mode and the timer
- **Help** covers the rules for all four games, a controls table, scoring, and "About the art & facts".
- **Audio** is pure WebAudio synthesis: pick, place, flip, a foundation chime that rises with rank, deal,
  hint, nope, undo, run complete and the win fanfare.

Docs:
- `research/town-content.md` (every place, color and fact used, with sources)
- `SAMPLES.md` (six samples with licenses and verdicts)
- `MECHANICS.md`
- `PRD.md` (41 acceptance criteria)
- `DEV-PLAN.md` (milestones, hook spec, test matrix, defect log of 17 items, all fixed)
- this report

## Acceptance criteria (PRD §13)

| AC | Status | Evidence |
|---|---|---|
| 1 Klondike deal shape | Met | rules-01 |
| 2 Draw 1 / 3, recycle | Met | rules-02 |
| 3 Tableau legality, kings only | Met | rules-03 |
| 4 Auto-flip exposed cards | Met | rules-03, rules-04, rules-09 |
| 5 Yukon deal and group moves | Met | rules-04 |
| 6 FreeCell deals 1 and 617 | Met | rules-06 (exact match, in-game and helper) |
| 7 Supermove capacity | Met | rules-07 |
| 8 Spider deal, stock blocked by empty column | Met | rules-08 |
| 9 Spider run completes (+100) | Met | rules-09 |
| 10 Spider 1 and 2 suit sets | Met | rules-10 |
| 11 Foundation legality | Met | rules-11 |
| 12 Win detected in every mode | Met | play-12 (Klondike, FreeCell, Yukon, Spider) |
| 13 Pointer drag and drop, illegal drop returns | Met | play-13 (real mouse events) |
| 14 Tap auto-move | Met | play-14 |
| 15 Undo/redo 30 deep | Met | play-15 |
| 16 Hint, cycle, no-move message | Met | play-16 |
| 17 Auto-complete | Met | play-17 |
| 18 Safe autoplay on/off | Met | play-18 |
| 19 Keyboard-only play | Met | play-19 (real key presses) |
| 20 Same deal number, same layout | Met | rules-20 (all 4 modes) |
| 21 Daily deal determinism | Met | rules-20 |
| 22 Scoring and timer | Met | play-22, rules-09 |
| 23 Stats survive reload | Met | persist-23 |
| 24 Continue after reload | Met | persist-24 (position, score, undo history) |
| 25 Runs when localStorage throws | Met | persist-25 |
| 26 Twelve distinct backs, persist | Met | screens-26 (12 distinct renders, reload check) |
| 27 Five tables, persist | Met | screens-27 |
| 28 Legibility at mobile Spider size | Met | screens-28: 34 px cards, 13.6 px index (≥ 11) |
| 29 Courts and ace flourishes | Met | screens-29 (all 12 courts, 4 aces) |
| 30 Cascade, bath ticket, sourced fact | Met | play-30 |
| 31 Title skyline and mode picker | Met | screens-31 (light and dark) |
| 32 Sound mute/volume persist | Met | screens-32 (plus a sound-on smoke test with no errors) |
| 33 Reduced motion | Met | screens-33 |
| 34 Left-handed mirror | Met | screens-34 (Klondike and FreeCell) |
| 35 Card sizes | Met | screens-35. Desktop widths are 89 / 105 / 120 px. Mobile is width-bound at 39 / 50 / 51 px, so Large mainly enlarges the index there |
| 36 Four-color suits | Met | screens-36 |
| 37 Touch targets ≥ 44 px, no overflow | Met | screens-37 checks 10 scenes on mobile |
| 38 Contrast ≥ 4.5:1, light and dark | Met for DOM text | screens-38 measures DOM text in 5 scenes. Canvas-drawn labels (the "A"/"K" placeholders, the Spider stock badge) are decorative and not measured |
| 39 Help covers every mode | Met | screens-39 |
| 40 No console errors or external requests | Met | every test (harness-enforced) |
| 41 Load < 2 s, ≥ 50 fps, ≤ 2 MB | Met | perf-41: 55–65 ms load; 60 fps during drag and cascade; 162 KB; 9.5 MB heap |

## Test results

`node shared/test-harness/run.mjs games/solitaire --milestone final` gives **73/73 passed** across desktop
(1280×800) and mobile (390×844 @2×). There were zero console errors and zero external requests.

- **Test files:** `tests/rules.test.mjs`, `play.test.mjs`, `screens.test.mjs`, `persist.test.mjs` and
  `perf.test.mjs`, plus `_util.mjs` with helpers for mouse drag, click, raw mid-animation shots and
  crafted positions.
- **Screenshots:** `screenshots/final/` holds 55 desktop and 43 mobile images. Every one was opened and
  inspected, at full size during M1–M4 and as labelled contact sheets for the final pass. The gallery is
  `screenshots/index.html`.
- **Milestone runs:** m1 (18 tests), m2 (35), m3 (72), m4 (73) and final (73). Each milestone's
  screenshots were reviewed, and the defects found are logged in DEV-PLAN.

## Performance

| Metric | Desktop | Mobile |
|---|---|---|
| File size | 162.2 KB | same |
| Load to `__game` | 65 ms | 55 ms |
| FPS while dragging (Spider 4-suit, 104 cards) | 60.3 | 60.2 |
| FPS during win cascade | 60.3 | 60.2 |
| JS heap | 9.5 MB | 9.5 MB |

- **Rendering:** the game renders on demand. The rAF loop stops when idle, and each card face and back is
  drawn once into a DPR-sized sprite cache.
- **Measurement caveat:** the numbers come from headless Chromium on the dev machine. A real mid-range
  laptop or phone was not measured.

## Known gaps

- **No solver.** Hints are a ranked one-ply move list, not a search, and there is no "winnable deals only"
  option. Both are listed as out of scope in the PRD.
- **Klondike Draw 3 auto-complete** plays foundation moves and cycles the stock. In a rare Draw 3 stock
  order it can stop short and leave a few cards for the player. The button is only offered once no
  face-down tableau cards remain.
- **Screen readers:** the live-region announcements and keyboard flow are tested programmatically. They
  were not tried with a real screen reader (NVDA or VoiceOver).
- **Sound:** sound was verified only as "runs without errors". It was not listened to in a browser.
- **Real devices:** no real-device touch testing. Mobile was emulated, with touch and 2× DPR.
- **Facts:** the fact card picks by a hash of the mode and deal number. The same deal always shows the same
  fact, but two different deals can repeat a fact.
- **Ideas left out of scope:** unlockable backs in bathhouse build order, an era selector, sculpin or
  alternative suits, and the novaculite "sharpen" effect from `game-hooks.md`.

## Harness requests

1. **A no-wait screenshot**, such as `t.shot(name, { wait: false })`. `t.shot` always waits for
   `isIdle()`, so frames in the middle of an animation (the win cascade, a drag in progress) can't be
   captured through it. `tests/_util.mjs` works around this with `rawShot()`, which writes a PNG straight
   into the milestone folder so the gallery still finds it.
2. **Expose `t.milestone`.** `rawShot()` currently reads `--milestone` from `process.argv`.
3. **A `t.reload()` helper** that reloads and waits for `window.__game`. Several tests repeat
   `page.reload()` followed by `waitForFunction`.
4. **A per-test `initScript` option** that runs before the first navigation. The storage-failure test has
   to `addInitScript` and then reload.
