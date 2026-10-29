# Spa City Solitaire: core mechanics

This is the technical foundation, synthesized from the samples in `SAMPLES.md`. Everything lives in one
hand-written `index.html`: inline CSS, then one `<script>`, organized in the sections below.

## 1. Loop and timing

- **Render on demand.** One `requestAnimationFrame` loop runs only while something is "live": tweens,
  dragging, hint pulses, the steam effect, or the win cascade. Otherwise the loop stops and the canvas holds its
  last frame. `markDirty()` schedules a single frame.
- **Tweens** are time-based (`performance.now()`) with ease-out-cubic curves. Card moves take 180 ms, cascaded
  deals 26 ms per card, and flips 160 ms (a scale-X squash). Motion level `reduced` cuts every duration to
  0, so cards jump; the win cascade becomes a 400 ms fade.
- **Game clock.** It starts on the first move, pauses when the tab is hidden or a modal is open, and is stored
  in state as `elapsedMs`. The clock is shown to the second.
- `isIdle()` is `true` when no tween, drag, cascade or deal animation is in flight. Hint pulses and the steam
  idle effect don't count, because they are decorative.

## 2. State model (one serializable object)

```js
state = {
  v: 1,
  mode: 'klondike' | 'freecell' | 'spider' | 'yukon',
  opts: { draw: 1|3, suits: 1|2|4 },          // per mode; unused keys ignored
  deal: 123456,                                // deal number (seed)
  daily: '2026-10-28' | null,
  cards: [{ s: 0..3, r: 1..13 }],              // uid → identity; ♣0 ♦1 ♥2 ♠3
  up:    [true|false],                         // uid → face up?
  piles: { stock:[uid], waste:[uid], f0:[uid].., t0:[uid].., c0:[uid].. },
  score: 0, moves: 0, elapsedMs: 0, recycles: 0, runs: 0,
  started: false, won: false, usedUndo: false,
}
```

- **Pile ids:** `stock` and `waste` (Klondike); `stock` (Spider); `f0…f3` (`f0…f7` in Spider); `t0…t6`
  (`t0…t9` in Spider, `t0…t7` in FreeCell); `c0…c3` (FreeCell cells).
- A **uid** is the index into `cards`. Spider uses 104 uids.
- **Test notation:** `getState()` and `setState()` use a readable form for piles, such as
  `{ t0: ['#KS', '#4H', 'QD'] }`. Ranks are `A 2–9 T J Q K`, suits are `C D H S`, and `#` marks a face-down card.
- **Undo** is a stack of snapshots, each holding `piles`, `up`, the counters and `won`. It is unlimited in
  memory; the last 400 snapshots are saved. **Redo** is a mirror stack, cleared by any new move. One player
  action, including the safe autoplay moves it triggers, is one undo step.

## 3. Rules engine

Shared primitives:

- `color(s)`: red for 1 and 2, black otherwise.
- `isAltDesc(a, b)`: b is one rank below a, in the opposite color.
- `isSameSuitDesc(a, b)`.
- `topOf(pile)`.

Each game is a rule object with these methods:

| Method | Purpose |
|---|---|
| `layoutSpec()` | pile ids, their rows and kinds (`stock waste foundation tableau cell`) |
| `deal(rng or dealNo)` | builds piles from a deal string. Klondike column *i* is `d`×*i* + `u`; Spider columns 0–3 are `ddddd u` and columns 4–9 are `dddd u` |
| `canPick(pileId, index)` | can the run starting at `index` be lifted? |
| `canDrop(run, toId, fromId)` | is the drop legal? |
| `maxRun(toId)` | FreeCell supermove capacity |
| `stockAction()` | draw or recycle (Klondike); deal a row (Spider, only when no column is empty) |
| `afterMove()` | flip exposed tableau tops face up; Spider moves a completed K→A suit run to the next foundation (+100) |
| `isWon()`, `canAutoComplete()`, `score hooks` | win test, auto-complete test, scoring |

| Game | Tableau build | Lift a run | Empty column takes | Foundation | Stock |
|---|---|---|---|---|---|
| Klondike | down, alternating colors | any face-up run | K only (or a run headed by K) | A→K by suit | draw 1 or 3; unlimited recycles |
| Yukon | down, alternating colors | **any face-up card with everything above it** (the run need not be ordered) | K-headed group | A→K by suit | none |
| FreeCell | down, alternating colors | an ordered run, ≤ `(freeCells+1)·2^(emptyCols)`, the empty-column factor excluding the target | any card or run (capacity halves) | A→K by suit | none; 4 cells |
| Spider | down, any suit | a same-suit descending run | any card or run | a completed K→A same-suit run only, automatically | 5 deals of 10; blocked while a column is empty |

**Deals**
- **FreeCell deal numbers** use the classic LCG: `seed = (214013·seed + 2531011) mod 2^31`, `rand = seed >> 16`.
  - The deck is ordered `AC AD AH AS 2C … KS`.
  - The shuffle repeatedly takes `i = rand % n`, swaps card *i* with the last card, and pops it. The popped
    cards are dealt in row order across 8 columns.
  - Deals 1 and 617 are checked against the published layouts.
- **Other games** use `mulberry32(dealNo)` and a Fisher–Yates shuffle. Spider with 1 or 2 suits uses ♠, or
  ♠ and ♥, across 104 cards.

**Safe autoplay** (setting: `off` / `safe` / `all`). After each player action, repeatedly move any exposed card
that can legally go to a foundation:
- `safe` moves a card only if its rank is 2 or lower, or both opposite-color foundations have reached rank − 1.
- `all` moves any foundation-legal card.
- Spider never autoplays, since its runs complete themselves.

**Hints** come from a one-ply move generator ranked by heuristics:
- foundation moves: +50
- reveals a face-down card: +40
- empties a column: +15
- Spider same-suit join: +30
- waste to tableau: +20
- a pointless shuttle, where the same run moves onto an equivalent card without revealing anything: excluded
- moving a king run into an empty column when it is already at the column bottom: excluded

Pressing H again cycles through the ranked list. If no tableau moves remain, the hint says "Draw from the
stock"; if the stock is empty too, it says "No moves left: undo or deal again".

**Auto-complete.** Klondike and Yukon offer it when no face-down tableau cards remain. FreeCell offers it
when every column and cell is in descending order with no blockers. The loop plays foundation moves (and
stock draws in Klondike) until the game is won or a full pass makes no progress. It is animated, and
counts as one undo step.

## 4. Input

- **Pointer Events** cover mouse, pen and touch: `pointerdown`, `pointermove`, `pointerup` on the canvas,
  with `touch-action: none`.
  - A gesture becomes a drag after it moves more than 6 CSS px (10 px on touch). The lifted run follows the
    pointer at the grab offset.
  - On drop, the target is the pile whose rectangle, extended down to the bottom of its fanned column,
    overlaps the dragged card's center. If that is not legal, the best-overlapping legal pile is used. If
    nothing is legal, the cards animate back and a soft "nope" sound plays.
- **Tap, click or double-click to auto-move.** The best legal destination is chosen in this order:
  foundation; a tableau move that reveals a card; a non-empty tableau; an empty column; a free cell. Tapping
  the stock draws or deals.
- **Keyboard** works when the table has focus (`tabindex=0`, `role="application"`):
  - **Moving the cursor:** ←/→ move between piles in the current row. ↑/↓ move between the top row and the
    tableau; inside a tableau pile, ↑ and ↓ step the selection depth through face-up cards.
  - **Picking up and dropping:** Enter or Space picks up the cards at the cursor, or draws when the cursor
    is on the stock. Pressing it again drops the cards on the cursor pile. Esc cancels.
  - **Shortcuts:**
    - number keys 1–9 and 0 jump to a tableau column
    - F sends the cursor card to a foundation; T auto-moves it, as a tap would
    - D draws
    - U, Z or Ctrl+Z undoes; Y or Ctrl+Y redoes
    - H shows a hint; A auto-completes
    - N starts a new deal; ? opens help; P or Esc (with nothing held) opens the menu
  - **Feedback:** a `role="status"` live region announces picks, drops, flips and wins in words, for
    example "Seven of hearts to column 3".

## 5. Rendering

- **Layers**
  1. A cached **table canvas** (felt, linen and so on), redrawn on resize or theme change.
  2. The **main canvas**: pile outlines, cards, the cursor ring, hint glows, drag shadow, and the steam and
     cascade effects.
  3. **DOM chrome**: top bar (menu, title, timer and score), bottom toolbar (New, Undo, Hint, Auto, Deal #), and
     modal dialogs (title, settings, backs, stats, help, win), all as real `<button>` elements.
- **DPR-correct canvas.** The backing store is CSS size × `devicePixelRatio`, and every coordinate is in CSS
  px.
- **Sprite cache.** Each card face and back is drawn once into an offscreen canvas at `cardW × dpr`, keyed by
  `(face or back, size, fourColor, largeIndex)`. Each frame then only blits sprites, so 104 cards cost 104
  `drawImage` calls.
- **Card art**
  - Rounded rectangles with a cream face `#FBF8F1`. The large corner index is about 34% of card width for the
    rank and 28% for the suit, so it stays readable at 36 px wide.
  - Standard pip layouts for ranks 2–10. Suit glyphs are vector paths, not font glyphs.
  - Court cards are framed geometric archetypes (town-content §4).
  - Red suits use `#B3261E` and black suits `#1F2A24`. The four-color option makes ♦ blue `#1F5BA8` and
    ♣ green `#2E6A3C`.
- **Layout.** Card width is the smaller of the width fit `(W − margins − gaps)/cols` and a height fit, scaled
  by the size setting. Each pile's fan offsets (face-down 18% of card height, face-up 28%) are compressed so
  the pile ends above the bottom toolbar. Left-handed layout mirrors the top row horizontally.

## 6. AI

None. The only "AI" is the hint ranker. Auto-complete is deterministic.

## 7. RNG

- `mulberry32(seed)` drives every deal except FreeCell, which uses the MS-compatible LCG.
- Cosmetic randomness (steam, cascade jitter, skylight glass) uses a separate RNG seeded per draw, so it never
  disturbs deal reproducibility.
- `__game.seed(n)` reseeds the next default deal number and the cosmetic RNG.
- The **daily deal** seed is FNV-1a of `"YYYY-MM-DD|modeKey"`; for FreeCell it maps to `1 + h % 32000`.

## 8. Save format (localStorage, every access wrapped in try/catch)

| Key | Value |
|---|---|
| `spa-solitaire:v1:settings` | `{sound, volume, motion:'auto'/'full'/'reduced', leftHanded, cardSize:'compact'/'standard'/'large', fourColor, autoFoundation:'off'/'safe'/'all', back, table, showTimer, deckSeed}` |
| `spa-solitaire:v1:stats` | `{ [modeKey]: {played, won, streak, bestStreak, bestTimeMs, fewestMoves, bestScore, totalMs} }`, where modeKey is one of `klondike1 klondike3 freecell spider1 spider2 spider4 yukon` |
| `spa-solitaire:v1:current` | `{state, undo:[≤400 snapshots]}`, written 300 ms after each move, cleared on a win |
| `spa-solitaire:v1:meta` | `{lastMode, lastOpts, totalWins, daily:{'YYYY-MM-DD|modeKey': 'won'/'played'}, factIndex}` |

If storage is missing or throws, the game runs from memory and the stats screen notes "Stats can't be saved in
this browser".

## 9. `window.__game` hooks

| Method | Returns / does |
|---|---|
| `seed(n)` | sets the next deal number to `n` and reseeds the cosmetic RNG |
| `getState()` | `{scene, mode, opts, deal, daily, piles:{id:[notation]}, score, moves, elapsedMs, won, canAutoComplete, undoDepth, redoDepth, held, cursor, settings, stockCount, runs, modal}` |
| `setState(s)` | loads `{mode, opts, deal, piles, score?, moves?}` in notation, clears undo, redraws |
| `isIdle()` | no animation in flight |
| `scene(name)` | `title`, `game`, `settings`, `backs`, `stats`, `help`, `win`, `deal` |
| `newGame(opts)` | `{mode, draw, suits, deal, daily}` |
| `act(name, ...args)` | `move(from, to, count)`, `draw`, `undo`, `redo`, `hint`, `autoComplete`, `tap(pileId, index)`, `key(key)`, `skip` (finish animations). Returns `{ok, ...}` |
| `getLayout()` | `{cardW, cardH, indexPx, piles:{id:{x,y,w,h,cards:[{x,y,w,h,up}]}}}` in CSS px, for pointer-driven tests |
| `legalMoves()` | `[{from, index, to, count, score}]` |
| `setSettings(obj)` | merge settings, re-layout and redraw |
| `freecellDeal(n)` | the 8 columns of deal `n` in notation (a test vector helper) |
| `stats()` | the stats object |
