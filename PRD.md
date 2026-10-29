# Spa City Solitaire: product requirements

## 1. Vision and pillars

A calm, beautifully made patience collection you can play one-handed on a phone or with only a keyboard
on a laptop, dressed in the architecture and nature of Hot Springs, Arkansas. Every deal ends with a small
true story about the town.

1. **Feels right.** Cards move with snappy, physical feedback; drags never "lose" a card; undo is
   unlimited and instant.
2. **Readable first.** Faces stay standard and crisp at 36 px wide. The decoration lives on backs, tables and
   transitions, never on rank and suit legibility.
3. **A town in the details.** Twelve code-drawn backs and five tables come from Bathhouse Row, the Ouachitas
   and the lakes. The win card shares a sourced fact.
4. **Fair and reproducible.** Every deal has a number, the daily deal is the same for everyone, and FreeCell
   deal numbers match the classic numbering.

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
- **Score:** waste→tableau +5; any card to a foundation +10; turning a tableau card face up +5;
  foundation→tableau −15; each recycle after the first −50 (Draw 1) or −20 (Draw 3). The score never goes
  below 0. A win adds a **time bonus** of max(0, 1000 − 2 × seconds).

### 4.2 Yukon
- **Deal:** 7 columns. Column 1 has 1 face-up card. Columns 2–7 have 1–6 face-down cards topped by 5
  face-up cards, using all 52 cards. There is no stock.
- **Tableau:** build down in alternating colors. **Any face-up card may be moved together with every card on
  top of it**, even if those cards are not in sequence, as long as the moved card fits on the target. Only a
  King-headed group may fill an empty column.
- **Foundations, win and score:** as in Klondike, without the stock items.

### 4.3 FreeCell
- **Deal:** all 52 cards face up in 8 columns (4 columns of 7 and 4 of 6), using the classic numbered shuffle.
- **Cells:** 4 free cells, each holding one card.
- **Tableau:** build down in alternating colors, and any card may go into an empty column. You may move an
  ordered run of up to (free cells + 1) × 2^(empty columns) cards. When the target is itself an empty column,
  that column does not count.
- **Foundations:** up by suit from A to K. Cards may be moved back from a foundation.
- **Win:** all 52 cards are on the foundations.
- **Score:** +10 per card to a foundation, −10 per card taken back from one, plus the time bonus on a win.
- **Unwinnable deals:** deal 11982 is the famously unsolved one among the first 32,000. The game does not
  block it.

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
- **Unlimited undo and redo.** Undo restores the score too. Any undo marks the game "assisted", shown with a
  small mark in stats but not penalized.
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
| Tables | Card-Table Felt, Linen Postcard, Thermal Pool, Bathhall Marble, Midnight Club | §2 |
| Court cards | Bath attendant / jockey jacks, parasol-promenade queens, card-room kings (archetypes) | §4 |
| Aces | ♠ stepped tower, ♥ magnolia | §5 |
| Win | Tufa-cascade animation, bath-ticket score with "course" progress (21 wins), fact card | §6–§8 |
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
    (hideable timer).
  - **Middle:** the table canvas.
  - **Bottom toolbar:** New, Undo, Redo, Hint and Auto (enabled only when available), at least 44 × 44 px.
    The deal number appears under the status strip.
- **Win dialog:** the bath ticket (mode, deal, score, time, moves, best-ever markers, course progress), the
  fact card, and buttons for New Deal, Replay This Deal and Title.
- **Settings:**
  - Sound on/off and volume
  - Motion (Auto / Full / Reduced)
  - Left-handed layout
  - Card size (Compact / Standard / Large)
  - Four-color suits
  - Auto-move to foundations (Off / Safe / All)
  - Show timer
  - Reset statistics (with confirm)
- **Backs & Tables:** a grid of 12 back previews with names and captions and a selected ring, then 5 table
  swatches. "Reshuffle glass" re-seeds the Fordyce Skylight back.
- **Stats:** a tab per mode key showing played, won, win %, current and best streak, best time, fewest
  moves, best score, and a Reset button.
- **Help:** rules per mode, controls (mouse/touch/keyboard table), scoring, and About the art & facts.

## 7. Art direction

- **Palettes** (from `shared/design/tokens.css`):
  - UI chrome uses the default theme: light is gilded-spa, dark is deco-neon.
  - Each back uses its motif palette (town-content §1). Tables use P5 felt, P6 linen, P2 thermal, the
    marble swatch, and P5 midnight.
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

All sound is WebAudio synthesis, so there are no files:
- **pick** and **place:** short filtered-noise ticks and soft thocks
- **flip:** a bright click
- **foundation:** a pentatonic bell tone that rises with rank
- **deal / shuffle:** a burst of ticks
- **invalid:** a low muted blip
- **undo:** a reverse whoosh
- **win:** a three-note brass-like chord and a steam hiss

Master volume and mute are in settings. The AudioContext is created on the first user gesture.

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
- `index.html` stays ≤ 2 MB, and `assets/` stays ≤ 3.5 MB. No requests leave the page's own origin.
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
26. Twelve distinct procedurally drawn card backs are selectable and the choice persists.
27. Five table backgrounds are selectable and persist.
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

- A full solver, or "winnable deals only" filtering for Klondike and Spider.
- Online leaderboards, accounts, sync and multiplayer.
- More games beyond the four (Pyramid, Golf, TriPeaks and so on), jokers, and the fifth "sculpin" suit and
  alternative suit sets from `game-hooks.md` (noted as future ideas).
- Unlockable backs in bathhouse build order (all 12 are available from the start; a future idea).
- Era selector restyling of the whole deck, and the novaculite "sharpen" power-up effect.
- Localization: the game is English only.
- Vegas or cumulative-money scoring.
