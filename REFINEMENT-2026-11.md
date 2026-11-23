# Spa City Solitaire refinement record, November 2026

> **Status: Superseded historical note.** The early November 4, 2026 scoped refinement pass recorded below (commit `3c95afd1`, Restart/New Deal immediate autosave) was closed early during an earlier external campaign and has since been superseded by the full HSAR council implementation waves (waves 1–4b) and the November 2026 WF-6/WF-7 triage refinement waves.

## Current shipped build summary

- **Architecture:** Hand-written single-file `index.html` (no `src/` bundler) plus local `assets/` (54 WebP files + `fonts.css`, 3.19 MB total ≤ 5 MB cap, ~1.3 MB first load ≤ 1.6 MB budget) and `vendor/fonts/` (5 OFL WOFF2 faces). Zero external network calls; `file://` verified by `tools/check-file-url.mjs`.
- **Content & progression:** 4 games (7 variants), 12 card backs (4 starter + 8 earnable), 6 parlor tables (Card-Room Felt default + Fordyce Bath Hall starter + 4 earnable), 50 sourced Hot Springs facts, 24 achievements, 21-win Bathhouse Row course with dual mastery fast-tracks, permanently free unlimited Undo, untimed Standard par-moves efficiency scoring + opt-in Timed scoring, and a solver-verified 2-bit FreeCell 1–32,000 grade table.
- **Verification:** `npm run check:pipeline`, `npm run check:offline`, and 24 Playwright test files in `tests/*.test.mjs` (see `PRD.md`, `MECHANICS.md`, `REPORT.md`, and `VISUAL-REPORT.md`).

## Historical November 4, 2026 scoped pass (preserved for provenance)

### Integrated fix
- **Commit `3c95afd1de73693176e2e5b9ccad10140bd9f683` (S1):** Restart and New Deal were not autosaved until the first move; integrated so starting over or dealing again records the new board immediately before the first move (covered by `tests/reset-save-regression.test.mjs`).
- **Historical release baseline prior to council waves:** `v2.3.0` (`60b95b8df964b5ce54d75721d5b0d8f849371a99`).

### Scoped observations from the November 4, 2026 pass
- **Core loop & input:** Desktop Chrome/Edge pointer and keyboard play, save/reload, and physical iPad Safari touch draws/drags/Undo were exercised in a bounded session (including a legitimate 68-move Klondike dead end).
- **Persistence:** Restart/New Deal autosave regression, reload checks, and legacy save-reader checks passed after `3c95afd1`.
- **Subsequent resolution:** The open coverage items from that early scoped pass (full rules, layout, persistence, WebAudio, lifecycle, performance, accessibility, content/fact audit, and visual review) were addressed in the subsequent council waves (1–4b) and the 2026-11 WF-6/WF-7 triage refinement waves. Physical handset hardware checks (iPhone/Android) and human ear/hand audio & tactile checks remain part of post-wave human sign-off.
