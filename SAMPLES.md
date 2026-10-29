# Code-sample survey: Spa City Solitaire

The samples were surveyed on 2026-10-28. Each repo was cloned with `--depth 1` into `reference-samples/`
(gitignored) and only read: nothing was installed, built, run, or opened in a browser. Each license was read
from the repo's own LICENSE or README file.

| # | Project | URL | License | Commit / version | Verdict |
|---|---|---|---|---|---|
| 1 | Solitairey (Paul Harrington; maintained by Shlomi Fish) | https://github.com/shlomif/Solitairey | 2-clause BSD ("FreeBSD License", LICENSE file, © 2011 Paul Harrington) | `84ddfe3364afad73cbec2551278d5eacc8184eca` (2019-05-10) | **Ideas only** (license would allow adaptation). Rules reference for Klondike, FreeCell, Spider (1/2/4) and Yukon; supermove formula |
| 2 | FreecellJS (Brent Ely) | https://github.com/GitBrent/FreecellJS | MIT (README "License" section, © 2015–2016 Brent Ely) | `2aba32024af7ba503179427ff4bc6aba6e84ac0a` (2016-08-04) | **Ideas only**. jQuery UI drag/drop; not the architecture we want |
| 3 | Oddstream Solitaire (Gilbert Oddstream) | https://github.com/oddstream/Solitaire | **None / "All rights reserved"** (faq.html: "Copyright © 2018-2020 Gilbert Oddstream. All rights reserved.") | `0ed0d7ec3591753e93cfacbdfc9e94b6eba36e30` (2020-02-10) | **Reference only, no copying.** Best architecture of the set: a data-driven rules engine |
| 4 | webguy83/solitaire (Phaser 3 + TypeScript, from the Phaser template) | https://github.com/webguy83/solitaire | MIT (LICENSE, © 2025 Phaser Studio Inc.; README says MIT) | `4b9d109261ed7b26ecab98051edac2ac32f1462d` (2026-01-06) | **Ideas only**. Clean Klondike model; tap-vs-drag threshold |
| 5 | Rosetta Code, "Deal cards for FreeCell" | https://rosettacode.org/wiki/Deal_cards_for_FreeCell | GFDL 1.2 (site content) | page as fetched 2026-10-28 | **Algorithm description and test vectors only.** No code copied; the generator was written from the prose description |
| 6 | Freecell Solver (Shlomi Fish) | https://fc-solve.shlomifish.org/ (Debian `freecell-solver` COPYING) | MIT/Expat (earlier releases public domain) | 5.0.x per Debian copyright file; not cloned | **Ideas only.** Background for the "safe autoplay" rule and solver-style hint ordering; the C solver itself is far beyond scope |

No third-party code was copied into `index.html`. Every rule, algorithm and drawing routine in the game was
written fresh for this project. The attributions below record where ideas came from.

## 1. Solitairey

- **What it does well**
  - It has many games on one shared `Solitaire` base. Each game declares its `fields` (Foundation, Reserve,
    Tableau, Stock, Waste), a `deal()` and per-card `validTarget()` and `playable()` rules. That split
    between a generic pile engine and per-game rule objects is the shape we adopt.
  - The FreeCell `openSlots()` computes the supermove limit as `(free cells + 1) × 2^(empty columns)` and
    excludes the destination column when it is empty. We use the same well-known formula.
  - It has autoplay and an "effectively won" check. Separate Spider 1-, 2- and 4-suit games confirm the
    deal shape: 10 columns, 4 × 6 cards + 6 × 5 cards, and 50 stock cards dealt in rows of ten.
- **What it does badly**
  - It depends on YUI 3, a defunct library, plus a Ruby/Rake build and bitmap card assets.
  - DOM-heavy rendering and a global `Solitaire.game` singleton make testing awkward.
  - It saves game state only as a serialized move log.
- **Verdict:** BSD-2 would permit adaptation, but nothing is copied. We take the per-game rule-object idea and
  cross-check our rules against it.

## 2. FreecellJS

- **What it does well:** It is a small, readable single-page FreeCell. Its explicit "cards you can move"
  check agrees with the supermove formula, and its touch-punch shim shows that mobile drag needs care.
- **What it does badly**
  - Everything hangs on jQuery and jQuery UI: draggable widgets, DOM positions as state, and no undo stack
    worth keeping.
  - It has image assets and no keyboard play.
- **Verdict:** MIT, but there is nothing worth adapting. We note only its pitfall: game state must never live
  in DOM positions.

## 3. Oddstream Solitaire

- **What it does well**
  - Each of its 100+ variants is a small JSON rules block (`build`, `move`, `accept`, deal strings such as
    `"dddddu"`) plus an SVG layout. The engine reads "suit/rank" build codes, so new games need no code.
  - Undo is a stack of whole-state snapshots, which is simple and bulletproof.
  - It has toast messages and a safe autoplay to foundations.
- **What it does badly**
  - It is one 4,400-line module with global state and DOM-SVG cards (slow with 104 cards on old phones),
    and it sniffs the user agent to detect mobile.
  - It is **all rights reserved**.
- **Verdict:** **Reference only.** We use two ideas, not code: the declarative "deal string" for tableau
  setup (face-down `d` and face-up `u`) and snapshot undo.

## 4. webguy83/solitaire

- **What it does well:** It has a clean model class (`Solitaire`) that is separate from the Phaser scene, and
  a pointer-up handler that treats `distance < 5 px` as a tap (auto-move) rather than a drag. It also has a
  card-back swatcher scene.
- **What it does badly:** It is Klondike draw-1 only, relies on a texture atlas, uses Phaser (about a 1 MB
  dependency), has no keyboard support and no seeded deals.
- **Verdict:** MIT, but nothing is adapted. We keep the idea of a tap threshold of 5–6 px, scaled for touch,
  for telling tap-to-auto-move apart from a drag.

## 5. Rosetta Code: Deal cards for FreeCell

- **What it does well:** It is the de facto reference for numbered FreeCell deals.
  - The generator is `state = (214013·state + 2531011) mod 2^31`, with output `state >> 16`.
  - The deck is ordered rank by rank with suits interleaved: AC AD AH AS 2C …
  - The shuffle repeatedly picks `rand % remaining`, swaps that card with the last one, pops it, and deals it
    into 8 columns in row order.
  - The page lists the full layouts of deals 1 and 617.
- **What it does badly:** It is a multi-language wiki whose content is GFDL, so its code isn't MIT-compatible.
- **Verdict:** We implemented the algorithm from the prose description above and use the deal 1 and deal
  617 layouts as test vectors (`tests/rules.test.mjs`). Facts and algorithms are not copyrightable; no code
  was copied.

## 6. Freecell Solver

- **What it does well:** It is the authority on solver techniques and the "safe autoplay" rule. A card may go
  to the foundation automatically when both opposite-color cards of the rank below are already there, or
  when it is an ace or a two.
- **What it does badly:** It is a large C library, too much for a browser hint system.
- **Verdict:** Ideas only (MIT). Hints use a ranked one-ply move generator, not a solver. We list a full
  solver as out of scope.

## Side-by-side review: what becomes the foundation

| Concern | Best sample | Our choice |
|---|---|---|
| Rules engine | Oddstream (declarative) + Solitairey (rule objects) | Per-game rule objects with shared pile primitives, using a deal-string idea for setup (MECHANICS §3) |
| State | Oddstream snapshots | One serializable plain object, with an undo stack of compact snapshots |
| Rendering | none great (DOM/SVG or Phaser) | One Canvas 2D table with pre-rendered card sprites per size and DPR, plus DOM chrome for buttons and dialogs |
| Input | webguy83 tap threshold | Pointer Events (mouse and touch unified), a drag threshold, tap to auto-move, and full keyboard cursor play |
| Deal numbers | Rosetta description | MS-compatible LCG for FreeCell, and mulberry32 seeded deals for the other games |
| Autoplay | Freecell Solver rule | Safe autoplay: optional, on by default in FreeCell |
| Supermove | Solitairey formula | `(cells+1)·2^(empty cols)`, halved when the destination is empty |
