# Spa City Solitaire: product requirements

## 1. Vision and pillars (Unrushed Parlor Mastery contract)

A calm 1920s Bathhouse Row card table where every hand is a fair, unrushed puzzle of clean skill—crisp ivory cards gliding over emerald felt and brushed brass, playable one-handed on a phone or with only a keyboard on a laptop, ending in a punched 21-bath ticket, a truthful measure of economy of hand, and one true story about Hot Springs, Arkansas.

- **Target experience:** *Mastery of a Challenge or Skill* (primary: unrushed, fair, reproducible patience where economical cardcraft is rewarded without clock pressure) paired with *Alternate Fantasy* (secondary: stepping into a quiet 1920s Hot Springs bathhouse parlor).
- **Anti-goals:** zero countdown pressure or Undo point penalties in default Standard play; zero live `-1/move` drain in Klondike, FreeCell, or Yukon; zero Vegas/gambling wagering or violence flavor; zero silent replay confiscation on fresh New Deals or first-ever retried comebacks.

1. **P1 — Calm craft over clock pressure.** Default Standard play rewards surgical, economical cardcraft at the player's own pace via an untimed par-moves efficiency win bonus, permanently free unlimited Undo, and opt-in Timed speed kept strictly separate.
2. **P2 — Fair, reproducible, transparent progression.** Every winnable New Deal and Daily across all seven variants delivers an unseen-first, honestly graded hand (including all classic FreeCell deals 1–32,000 except #11982); first-ever wins—including assisted or retried comebacks—advance the 21-bath course, graded wins, and unlocks, while streaks, personal bests, and speed/unaided achievements remain strictly guarded for first-try unaided wins.
3. **P3 — Clarity first, Bathhouse Row in the details.** Standard ivory faces stay crisp down to 36 px mobile Spider width over calm dark Card-Room Felt at Win 0, while 12 Hot Springs backs, 6 parlor tables, brass hardware, venue-coupled acoustics, and 50 sourced stories frame the table.
4. **P4 — One integrated parlor.** Card legality, look-ahead simulation, Standard efficiency scoring, Bath Ticket stamps, HUD tags, Bathhouse Ledger records, Help text, and design docs obey one single-source contract.

## 2. Target players

- **Casual daily players** on phones, in short sessions, playing with touch.
- **Experienced patience players** who want FreeCell deal numbers, Spider 4-suit, statistics and keyboard speed.
- **Visitors and locals** who enjoy Hot Springs history in small doses.
- **Players with access needs:** keyboard-only, low vision (large indices, high contrast), color vision
  deficiency (four-color suits), and motion sensitivity (reduced motion).

## 3. Modes

| Mode | Variants | Stats key |
|---|---|---|
| Klondike | Draw 1, Draw 3 | `klondike1`, `klondike3` |
| FreeCell | numbered deals 1–1,000,000 (1–32,000 match the classic set) | `freecell` |
| Spider | 1 suit, 2 suits, 4 suits | `spider1`, `spider2`, `spider4` |
| Yukon | (one variant): added because it reuses the Klondike layout and adds a distinct "move any face-up group" puzzle | `yukon` |

Every mode can be played as a random deal, a chosen deal number, or the **Daily Deal** (one per mode per day).

## 4. Complete rules

The cards are a standard 52-card deck, and Spider uses two decks (104 cards). Ranks run A (low) to K.

### 4.1 Klondike
- **Deal:** 7 tableau columns. Column *n* (1–7) gets *n* cards, with only the top card face up. The other 24
  cards form the stock.
- **Tableau:** build down in alternating colors. Any face-up run may move as a unit. Only a King, or a run
  headed by a King, may fill an empty column. A face-down card that becomes exposed turns face up
  automatically.
- **Stock:** each tap turns 1 card (Draw 1) or 3 cards (Draw 3) onto the waste, and only the top waste card is
  playable. When the stock is empty, a tap turns the whole waste back over. Recycles are unlimited.
- **Foundations:** 4 piles, built up by suit from A to K. A foundation's top card may be moved back to the
  tableau.
- **Win:** all 52 cards are on the foundations.
- **Score:** waste→tableau +5; tableau→foundation +10; direct waste→foundation +15; turning a tableau card
  face up +5; foundation→tableau −15; turning the waste back over the first time is free, then each recycle
  −50 (Draw 1) or −20 (Draw 3). Signed net score is conserved internally (`rawScore`) and floored at 0 for
  display and win totals. Default **Standard** scoring is untimed and adds a move-efficiency win bonus
  (`max(0, min(maxBonus, round((parCeil − moves) × ptsPerMove)))`: Draw 1 `220 / 3 / 450`, Draw 3 `240 / 3 / 450`).
  Opt-in **Timed** scoring replaces the efficiency bonus with a speed bonus of `max(0, 1000 − 2 × seconds)`.
  **None** hides the score. Standard and Timed best scores are tracked separately, and the active scoring lane
  locks at deal start.

### 4.2 Yukon
- **Deal:** 7 columns. Column 1 has 1 face-up card. Columns 2–7 have 1–6 face-down cards topped by 5
  face-up cards, using all 52 cards. There is no stock.
- **Tableau:** build down in alternating colors. **Any face-up card may be moved together with every card on
  top of it**, even if those cards are not in sequence, as long as the moved card fits on the target. Only a
  King-headed group may fill an empty column.
- **Foundations, win and score:** as in Klondike, without the stock items. Standard scoring adds an untimed
  move-efficiency win bonus (par ceiling 140, 5 pts/move, cap 475); opt-in Timed scoring uses the speed bonus
  instead.

### 4.3 FreeCell
- **Deal:** all 52 cards face up in 8 columns (4 columns of 7 and 4 of 6), using the classic numbered shuffle.
- **Cells:** 4 free cells, each holding one card.
- **Tableau:** build down in alternating colors, and any card may go into an empty column. You may move an
  ordered run of up to (free cells + 1) × 2^(empty columns) cards. When the target is itself an empty column,
  that column does not count.
- **Foundations:** up by suit from A to K. Cards may be moved back from a foundation.
- **Win:** all 52 cards are on the foundations.
- **Score:** +10 per card to a foundation, −10 per card taken back from one. Standard scoring (default) adds
  an untimed move-efficiency win bonus (par ceiling 160, 5 pts/move, cap 540); opt-in Timed scoring adds the
  speed bonus instead. All classic deals 1–32,000 (except #11982) carry solver-verified Easy, Medium, or Hard
  grades via an embedded 2-bit lookup table.
- **Unwinnable deals:** deal 11982 is the famously unsolved one among the first 32,000. A random or daily
  FreeCell deal steps past it (a daily that would have been 11982 is 11983). Typing it into the Deal # box
  still deals it, and the box says what it is.

### 4.4 Spider
- **Deal:** 104 cards. Ten columns: columns 1–4 get 6 cards and columns 5–10 get 5, with only the top card
  face up. The other 50 cards form the stock (5 deals of 10).
- **Suits:**
  - 1 suit: 8 sets of ♠
  - 2 suits: 4 sets each of ♠ and ♥
  - 4 suits: 2 full decks
- **Tableau:** build down regardless of suit, and any card may go into an empty column. A run may move as a
  unit only if it is a same-suit descending sequence. An exposed face-down card turns face up.
- **Stock:** a tap deals one face-up card onto every column. This isn't allowed while any column is empty (a
  message explains why).
- **Completed runs:** a same-suit K→A run of 13 cards at the top of a column moves to the next free
  foundation automatically and can't be moved back.
- **Win:** all 8 runs are complete.
- **Score:** start at 500. Each move or deal −1, each completed run +100, and the score never goes below 0. No
  time bonus.

### 4.5 Common
- **Unlimited free undo and redo.** Undo and Hint are always free (`undoCost` is permanently retired). Undo
  restores the exact position and signed net score. Any Undo or Hint marks the hand "assisted", shown beside
  the deal number as a small tag ("undo used", "hint used", "undo + hint") and in the Bathhouse Ledger. A
  score change of 5 points or more floats up from the pile where it happened (not with reduced motion or with
  scoring set to None).
- **Three-state victory & progression contract:**
  - *First-try clean win* (`!alreadyWon && !retried && !assisted`): increments `won`, advances streaks and
    personal bests (Standard or Timed lane), punches the 21-bath course (`totalWins`), credits `gradeWins`,
    evaluates unlocks and all achievements (including `Quick Dip`, `Steam Rush`, `Steady Hand`, `Own Two Hands`).
  - *First-try assisted win* (`!alreadyWon && !retried && assisted`): increments `won` and `assistedWon`,
    punches the 21-bath course (`totalWins`), credits `gradeWins`, unlocks cosmetics, and awards completion /
    Daily achievements (`Quick Dip`, `Steam Rush`, `Own Two Hands` require unaided play; `Steady Hand` requires
    no Undo), while freezing streaks and personal bests.
  - *Retried first-ever comeback* (`!alreadyWon && retried`, marked by a quiet `retried` HUD pill and
    `· retried` Bath Ticket tag): increments `won`, punches the 21-bath course (`totalWins`), credits
    `gradeWins`, unlocks cosmetics, and awards completion / Daily achievements, while freezing streaks,
    personal bests, and execution achievements (`quick`, `rush`, `steady`, `alone`).
  - *Already-won practice replay* (`alreadyWon`, marked by a quiet `replay` HUD pill and unpunched `· replay`
    Bath Ticket tag): increments `won` only; freezes the 21-bath course, `gradeWins`, streaks, personal bests,
    unlocks, and achievements.
- **Hint:** H or the Hint button shows the best move with a glow. Pressing it again cycles to the next move.
- **Auto-complete:** shown when the game can no longer be lost (§3 in MECHANICS). It plays out the rest of
  the cards with animation.
- **Auto-move to foundations** (setting `off`, `safe` or `all`, default `safe`): after each move, safe
  cards fly to the foundations. This is not used in Spider.

## 5. Hot Springs content map

| Where | Content | Source (see `research/town-content.md`) |
|---|---|---|
| Title screen | A Bathhouse Row skyline (8 bathhouses, N→S) with steam curls; tagline "Patience, the Spa City way" | §3 |
| Card backs | 12 backs (Fordyce Skylight, Fordyce Lozenge, Quapaw Dome, Row Ironwork, Superior Medallions, Scallop & Sculpin, Neon Night, Medical Arts Deco, Ouachita Pines, Thermal Steam, Lake Ouachita Dusk, Racing Silks), each with an "inspired by" caption | §1 |
| Tables | Six parlor tables: Card-Room Felt (Win-0 default), Fordyce Bath Hall, Quapaw Mosaic, Thermal Pool, Midnight Club, Linen Postcard | §2 |
| Court cards | Bath attendant / jockey jacks, parasol-promenade queens, card-room kings (archetypes) | §4 |
| Aces | ♠ stepped tower, ♥ magnolia | §5 |
| Win | Skylight-rosette ceremony, engraved bath ticket with 21-bath course progress, and one of 50 sourced Hot Springs facts (plus 24 achievements tracked in the Bathhouse Ledger) | §6–§8 |
| Help → About | Notes on sources and invented designs | §10 |

## 6. Screens and UX flow

```
Title ──► Game ──► Win dialog ──► (New deal | Replay | Title)
  │         ├─► Menu (Title, New deal, Choose deal…, Daily deal, Restart, Settings, Backs, Stats, Help)
  │         └─► Settings / Backs & tables / Stats / Help  (modals; Esc closes)
  └─► Continue (if a saved game exists) · Daily Deal · Stats · Settings · Help
```

- **Title:** the game logo, the skyline, and a mode picker with four large tiles (Klondike, FreeCell, Spider,
  Yukon), each with variant chips (Draw 1/3; 1/2/4 suits). Below them: Play, Daily Deal (✓ when today's is
  won), Continue (when a game is saved), Stats, Settings and Help.
- **Game:**
  - **Top bar:** Menu button, mode name and variant, and a status strip with score, moves and time
    (hideable timer). A thin jade line along the bottom of the bar fills as cards go home (Spider: cards in
    finished runs); a screen reader reads it as "n of 52 cards home".
  - **Middle:** the table canvas.
  - **Bottom toolbar:** New, Undo, Redo, Hint and Auto (enabled only when available), at least 44 × 44 px.
    The deal number appears under the status strip.
- **Win dialog:** the bath ticket (mode, deal, score, time, moves, best-ever markers, course progress), the
  fact card, and buttons for New Deal, Replay This Deal and Title.
- **Settings** (three tabs: Gameplay, Comfort, Audio):
  - *Gameplay:* Deal fairness (`Winnable (Any)` / `Easy` / `Medium` / `Hard` / `Classic Random`), Scoring (`Standard` / `Timed` / `None`), Auto-move to foundations (`Off` / `Safe` / `All`), Tap-to-move (`Tap` / `Double-tap` / `Select & place` / `Drag only`).
  - *Comfort:* Motion (`Auto` / `Full` / `Reduced`), Left-handed layout, Card size (`Compact` / `Standard` / `Large`), Table layout (`Fit` / `Classic`), Four-color suits, Court cards (`Art Deco` / `Painted`), Show timer, First-run tips.
  - *Audio:* Master sound on/off and volume (squared curve for new profiles starting at 0.75; legacy saves keep linear), separate Sound effects / Music / Ambience toggles and volume sliders, and touch Vibration toggle.
- **Backs & Tables:** a two-tab gallery of 12 card backs and 6 parlor tables with names, stories, and a selected
  ring. Four starter backs and two starter tables (Card-Room Felt and Fordyce Bath Hall) are open at Win 0; the
  remaining 8 backs and 4 tables unlock across the 21-bath course or dual mastery fast-tracks (pre-unlock saves
  keep all 12 backs and 6 tables open). "Reshuffle the skylight glass" re-seeds the Fordyce Skylight back.
- **Bathhouse Ledger** (four tabs: Overview, By Game, Hot Springs Facts, Achievements):
  - *Overview:* 21-bath course progress across the 8 historic Bathhouse Row stops, total baths won, next cosmetic unlock, and per-variant summary.
  - *By Game:* per-mode statistics for all 7 variants (played, won, win %, current and best streak, best time, fewest moves, separate Standard and Timed best scores) with per-mode Reset (with confirm).
  - *Hot Springs Facts:* browsable catalog of all 50 sourced Hot Springs facts.
  - *Achievements:* all 24 achievements with completion state and criteria.
- **Help:** rules per mode, controls (mouse/touch/keyboard/gamepad table), scoring, and About the art & facts.

## 7. Art direction

- **Palettes** (from `shared/design/tokens.css`):
  - UI chrome uses the default theme: light is gilded-spa, dark is deco-neon.
  - Each back uses its motif palette (town-content §1). The 6 parlor tables use Card-Room Felt (P5 felt, Win-0 default), Fordyce Bath Hall (veined marble), Quapaw Mosaic (warm chevron tile), Thermal Pool (P2 thermal), Midnight Club (P5 dark walnut & brass), and Linen Postcard (P6 linen).
- **v3 visual campaign (2026-10):** see `VISUAL-PLAN.md` and `VISUAL-REPORT.md`. In short:
  - six lit tables (Card-Room Felt, Fordyce Bath Hall, Quapaw Mosaic, Thermal Pool, Midnight Club, Linen Postcard);
  - Blender brass hardware;
  - a dark lacquer HUD and toolbar;
  - three bundled OFL faces;
  - flat Art Deco courts as the default, with the painted set as an option;
  - card motion with arc, lift, lean, settle and sheen;
  - a skylight-rosette win ceremony and an engraved bath ticket;
  - a full-bleed title and themed dialogs.

  The "Faces" and "Courts" bullets below describe v2. In v3 the indices use Libre Bodoni, and the default courts
  are the Art Deco set (town-content §11).
- **Painted art (v2):** the deck follows the reference photos in `Sample Images/` (an Art Deco deck with
  illustrated courts and painted backs). Original illustrations were generated with Codex image generation and
  packed to `assets/*.webp` (`art-src/art.json`, `node shared/test-harness/art-pack.mjs games/solitaire`).
  They are composited into the cached card sprites, so frame cost is unchanged. Every painted layer keeps its
  vector drawing as a fallback, used when an image is missing or with `?art=0`.
- **Faces:** ivory card stock with a faint grain and an inner highlight, a thin border `#A99D82`, red `#B3261E`, black `#1F2A24`. In the
  four-color option ♦ is blue `#1F5BA8` and ♣ is green `#2E6A3C`. Indices use a bold system serif
  (`--font-serif-victorian` stack); UI text uses `--font-sans`; titles use `--font-deco`.
- **Courts:** painted waist-up 1920s portraits (bath attendant, jockey, bellhop and saxophonist jacks; promenade
  and evening queens; card-room, proprietor and racing kings), mirrored through a gilt band into a
  double-ended card, inside a gilt double rule. The rank letter stays large in the corner.
- **Aces** sit on a gilt Deco sunburst medallion. **Backs** are painted Deco scenes on the same 12 themes in a
  gilt-ruled ivory border. **Tables** are painted surfaces with a soft vignette.
- **Motion:** quick ease-out moves, a squash-flip for turning cards, steam curls on shuffle, the tufa cascade
  on a win, and a gold glow pulse for hints.

## 8. Audio direction

All sound is WebAudio synthesis in a unified Bb/Eb harmonic universe (`{C, Eb, F, G, Bb}`), with zero external audio files:
- **pick** and **place:** short filtered-noise ticks and soft card-on-felt thocks
- **flip:** band-limited crisp linen snap
- **foundation:** Bb/Eb pentatonic bell ladder rising from C4 (King = F6 at 1,396.9 Hz, plus warm fifth tail)
- **deal / shuffle:** a burst of paper riffles; Klondike recycle plays a reverse riffle (plus brass clink on Pass 2+)
- **invalid / refusal:** acoustic muted wood-and-felt double-thud Foley (zero square waves)
- **undo:** a reverse whoosh; **redo** replays the restored move's cue
- **win & milestones:** brass fanfare, skylight gather/spray sweeps, 650 ms bath-ticket punch, and distinct cues for personal best, streak, achievement, and 21-bath course completion
- **music & ambience:** adaptive Title and Table parlor scores with intensity-coupled jazz brushes, three venue-coupled ambient beds (`bathhouse`, `parlor`, `valley`), and subtle 2-tap early-reflection room glue (`<= 10%` wet)

Master volume, mute, and separate Sound effects / Music / Ambience controls are in Settings. The AudioContext is created on the first user gesture and suspends cleanly when hidden. A profile made from the wave-4 build on has the master slider on a squared curve (half way is a quarter of the gain, slider starting at 0.75); a profile that already existed keeps the straight line it had. There is no control for it.

## 9. Accessibility

- Full keyboard play (MECHANICS §4), visible focus rings on every control, and a cursor ring on the canvas.
- Every text and background pair meets at least 4.5:1. Card indices on face stock reach about 8:1.
- Four-color suits; suit glyph shapes are always shown, so color is never the only cue.
- `prefers-reduced-motion` is honored by default (Motion: Auto), with a manual override.
- UI text scales with the browser zoom (rem units). The Large card size enlarges indices.
- A live region announces moves and results. Buttons have accessible names. Dialogs trap focus and close on Esc.

## 10. Mobile and touch

- Portrait at 390 × 844 fits every mode without horizontal scroll. Spider's 10 columns get about 35 px cards
  with large indices.
- All touch targets are at least 44 px (toolbar buttons and dialog controls).
- Tap to auto-move is the primary touch interaction, and drag also works.
- Landscape phones and tablets re-layout on resize.
- No double-tap zoom on the table (`touch-action: none`), and `viewport-fit=cover` safe-area padding.

## 11. Performance budgets

- A steady 60 fps while dragging and during the cascade on a mid-range laptop, measured with `t.fps`. The
  aim is ≥ 50 in headless Chromium during the cascade.
- `index.html` stays ≤ 2 MB, `assets/` stays ≤ 5 MB, and first-load transfer stays ≤ 1.6 MB. No requests leave the page's own origin.
- Interactive in ≤ 2 s (`t.loadMs` < 2000), and the JS heap stays under 40 MB.

## 12. Save and load

The settings, stats, meta and current game persist in localStorage (MECHANICS §8). On reload, Continue
resumes the exact position with its undo history. The game works when storage throws.

## 13. Acceptance criteria

**Core and rules**
1. Klondike deals 7 columns sized 1–7 with only the top cards face up, a 24-card stock and an empty waste.
2. Klondike Draw 1 turns one card and Draw 3 turns three; an empty stock recycles the waste.
3. Klondike rejects illegal tableau drops (same color or wrong rank) and accepts legal ones; only a King fills an empty column.
4. An exposed face-down tableau card turns face up after a move (Klondike, Yukon, Spider).
5. Yukon deals 1 + (n−1 face-down + 5 face-up) per column, and allows moving an unordered face-up group whose base fits.
6. FreeCell deals 1 and 617 match the published layouts exactly.
7. FreeCell enforces the supermove capacity (e.g. 4 free cells + 0 empty columns lets 5 cards move, not 6).
8. Spider deals 54 + 50 cards with the 6/5 column split, and the stock deal is refused while a column is empty.
9. Spider moves a completed same-suit K→A run to a foundation automatically and adds +100.
10. Spider 1 and 2 suit decks contain only ♠, or only ♠ and ♥.
11. Foundations accept only the next rank of the same suit, starting from an ace.
12. A won game is detected in each mode and shows the win dialog.

**Interaction**
13. Dragging a card with the pointer onto a legal pile moves it; an illegal drop returns it.
14. Tapping or clicking a card auto-moves it to its best legal destination (foundation first).
15. Unlimited undo and redo restore the exact previous positions and scores (verified 30 levels deep).
16. A hint highlights a legal move, and repeating it cycles through moves; with no moves it says so.
17. Auto-complete appears when the game is safe and plays it out to a win.
18. Safe autoplay moves aces and twos automatically when enabled and does nothing when off.
19. The whole game can be played with the keyboard only: select, pick, drop, draw, undo and hint.

**Deals, scoring, stats**
20. The same deal number gives the same layout, and the deal number is shown.
21. The Daily Deal is the same for a given date and mode, and differs between dates.
22. Score and moves update per the rules for each mode, and the timer runs from the first move.
23. Stats per mode key record played, won, streaks, best time, fewest moves and best score, and survive a reload.
24. The current game resumes after a reload (Continue).
25. The game runs with no errors when localStorage throws.

**Art and content**
26. Twelve distinct Art Deco card backs (painted with procedural vector fallback via `?art=0`, 4 open at Win 0 and 8 earnable across the 21-bath course or mastery fast-tracks; pre-unlock saves keep all 12) are selectable and the choice persists.
27. Six table backgrounds are selectable and persist (two open at Win 0, four earned across the 21-bath course or mastery fast-tracks; pre-unlock saves keep all six).
28. Card faces are legible at the mobile Spider size: the index is at least 11 CSS px tall at 35 px card width.
29. Court cards show original archetype figures; aces of spades and hearts show the tower and magnolia.
30. The win screen shows the cascade animation, a bath ticket and a Hot Springs fact with its source.
31. The title screen shows the Bathhouse Row skyline and the mode picker.

**Settings and accessibility**
32. Sound can be muted and the volume set, and both persist.
33. Motion: Reduced (or OS reduce) removes the tweens and the cascade.
34. Left-handed layout mirrors the top row.
35. Card size changes the card dimensions (Compact < Standard < Large where space allows).
36. Four-color suits recolor ♦ and ♣.
37. All interactive controls are at least 44 px tall on mobile, and nothing overflows horizontally at either viewport.
38. Text contrast in the UI chrome is at least 4.5:1 in light and dark color schemes.
39. A help screen documents the rules for every mode and the controls.
40. Zero console errors and zero external requests in every test. (Same-origin `assets/` loads are allowed.)

**Performance**
41. Load to interactive in under 2 s; at least 50 fps during the win cascade in the test browser; the file is ≤ 2 MB.

## 14. Out of scope

- An unbounded exact solver for arbitrary Classic Random deals (bounded solvers, pre-verified Spider 2/4 pools,
  and the 2-bit FreeCell 1–32,000 grade table power Winnable / Easy / Medium / Hard deals, hints, and dead-end
  checks).
- Online leaderboards, accounts, sync and multiplayer.
- More games beyond the four (Pyramid, Golf, TriPeaks and so on), jokers, and the fifth "sculpin" suit and
  alternative suit sets from `game-hooks.md` (noted as future ideas).
- Post-Win-21 retention milestones (monthly Daily Bathhouse Seals, per-variant difficulty stamps), deferred to
  a future feature wave.
- Era selector restyling of the whole deck, and the novaculite "sharpen" power-up effect.
- Localization: the game is English only.
- Vegas or cumulative-money scoring.
