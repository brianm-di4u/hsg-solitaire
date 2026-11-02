# Spa City Solitaire: adversarial art review, milestone 3 (v3-m3 captures)

Reviewer stance: independent art director with no stake in the game, comparing against the benchmark set in this folder (`INDEX.md`). Earlier reviews: `REVIEW-before.md` (original) and `REVIEW-m1.md` (round 2). I checked every status below in the new screenshots. Nothing is marked fixed on trust.

Inputs: `screenshots/v3-m3/{desktop,mobile,sheets}`. Desktop captures are 1280x800. Mobile captures are 390x844 CSS at 2x (780x1688 px). Pixel figures are device pixels in those files. Paths below are relative to `screenshots/v3-m3/` unless they name a benchmark file.

---

## 1. Verdict

This round fixed the feel layer and the readability bugs:
- The lifted card now tilts, scales and casts a deep offset shadow.
- Compressed court strips no longer clip J and Q.
- The hint toast is gone.
- The ghost slots fade out before the ceremony.
- The phone fan step stretches to the available height.
- Continue is above the fold on the phone title screen.
- The hilltop tower is now a steel lattice.
- The felt carries a printed "Spa City / Hot Springs, Ark." sunburst.
- A new default "Art Deco" court set drops the white sticker boxes and moves toward flat inked fills.

**No MAJOR gaps remain.** The game now sits roughly between Brainium and MSC on most axes, and above all of them on theme. What is left is finish work:
- The ceremony still has two framing bugs.
- The end-of-win modal is still a web sheet.
- The courts are cleaner but are not yet the flat colour-block Deco of the owner's references.
- Daily, Menu and Stats are still web controls.
- Long columns on desktop shrink the whole board by about 35 %.

---

## A. Scores

| Dimension | m3 (now) | m1 | before | Best benchmark | Sets the bar | Why |
|---|---:|---:|---:|---:|---|---|
| Art | **8** | 7.5 | 6 | 9 | Decked Out (cohesion), MSC themes (range) | The new Art Deco courts use clean ink line, a limited palette (ink, ivory, brass, red, jade), the index on bare card stock and a fan motif. The phone cameos are now tight head-and-shoulders crops. The backs are still best-in-class. Against the brief, the courts are still figurative fashion plates that fade into blank cream, with a horizontal mirror band, and Q♥ hides her face behind the index. |
| Lighting & materials | **7** | 6.5 | 5 | 8 | Brainium, MSC | The drag shadow now has real depth and offset. A steam wisp rises off the stock. Pool and Quapaw are tamed. The ceremony gets a centre glow with skylight rays. Marble is still pale enough that ivory card edges dissolve. |
| Animation & game feel (inferred) | **7.5** | 6 | 3 | 9 | MSC (rim, trail, cascade, fireworks) | Pickup now has tilt, scale, shadow and a brass rim. The stage clears before the rosette. The spray collapses with a ghost-trail smear. The hint uses the arc only. Still wrong: the gather frame is cut by the HUD on desktop, the spray leaves the right edge of the phone screen, and the end beat is a static modal. |
| UI | **7** | 6.5 | 4 | 8 | Decked Out (HUD), MobilityWare (panels) | Brass lever toggles and brass segmented fills in Settings. A big thumb-height toolbar on the phone. A full-width Continue pill. Daily, Menu and Stats are unchanged web tiles and tables. |
| Typography | **7.5** | 7 | 4 | 8 | MobilityWare, Decked Out | The desktop HUD values are now about 20 px. The ticket has proper engraved type. Dialog body text is still small light Josefin, and the phone title's wide-tracked subtitle is hard to read over the painting. |
| Readability | **8** | 7 | 5 | 9 | MobilityWare, MSC portrait | No clipped ranks at any size checked (`desktop/visual-60-long-runs.png`, `desktop/screens-28-faces.png`, `mobile/visual-60-long-runs.png`). Small ornament slivers still sit in index strips, and marble is low contrast. |
| Mobile (portrait) | **7.5** | 6 | 5 | 9 | MSC portrait, MobilityWare | The fan step adapts: a full K-to-A run reaches about 76 % of the height. The empty felt carries the printed emblem, the toolbar is thumb-sized and Continue is above the fold. At the deal, Spider still ends at about 30 % of the height with thin back strips, and the spray runs off the right edge. |
| Authenticity of setting | **8.5** | 8 | 7 | 8* | MSC themes / Decked Out | The lattice tower is fixed. The felt print ("Hot Springs, Ark."), the walnut table, the steam-vignette ticket and the KTHS trivia carry the place to every surface. Courts and ceremony are on theme. |

\* No benchmark attempts a real historical place. The reference measures how completely each one carries its theme across every surface. We now exceed it.

**Overall: about 7.6/10.** m1 was about 6.8 and "before" was about 4.9, against a benchmark ceiling of about 8.5.

---

## B. Status of REVIEW-m1 section C

| # | Gap (m1) | Status | Evidence |
|---|---|---|---|
| C1 | Mobile board is a strip across the top | **Partly (mostly)** | Long runs now stretch to about 76 % of the height (`mobile/visual-60-long-runs.png`). The foundation row is lower, at about 12 %. The empty felt carries the "Spa City" sunburst print, and the toolbar is thumb-sized (`mobile/rules-01-klondike-deal.png`). At the deal, Spider still ends at y≈505 of 1688 with back strips about 16 px (`mobile/rules-08-spider4.png`). |
| C2 | Compressed desktop columns clip court ranks and cross the frame | **Closed** | J hook and Q tail are intact, and the K bottom sits at y≈705, inside the frame at ≈725 (`desktop/screens-28-faces.png`, `desktop/visual-60-long-runs.png`). The cost is a 35 % board shrink (new gap G6). |
| C3 | Ceremony staging | **Partly** | Ghost slots fade, the rosette is centred, rays and a centre glow light the stage, and the spray has a choreographed ghost trail (`desktop/play-31-ceremony-rosette.png`, `desktop/play-31-ceremony-spray.png`). The gather's ace row is cut by the HUD at y≈50 (`desktop/play-31-ceremony-gather.png`). The phone spray leaves the right edge (`mobile/play-31-ceremony-spray.png`). |
| C4 | Win modal and Bath Ticket are a static sheet | **Partly** | The ticket is now an engraved asset with a guilloche border, a perforated stub, a steam vignette and the first of 21 holes filled (`desktop/play-30-win.png`). The modal around it is still the ivory sheet with a plain "You won!" and a pill row. The punch reads as a flat black blob. |
| C5 | Lifted card has no weight | **Closed** | On desktop: visible tilt, about 1.1x scale, a deep offset shadow and a brass rim (`desktop/play-13-dragging.png`). On the phone: lift, rim and shadow, but no tilt visible (`mobile/play-13-dragging.png`). |
| C6 | Courts miss the flat colour-block Deco brief | **Partly** | The new default "Art Deco" set uses ink line and flat fills, puts the index on card stock with no sticker box, and adds tight phone cameos (`desktop/screens-29-courts.png`, `mobile/screens-29-courts.png`). It still has a horizontal mirror band, figures that fade into blank cream, modelled faces and uneven composition. Q♥'s face sits behind the ♥ index (`desktop/rules-08-spider4.png`). |
| C7 | Three of six tables fight the cards | **Partly** | Pool is darker and calmer, and Quapaw is scaled up and dimmed (`desktop/screens-27-table-pool.png`, `-quapaw.png`). Marble is now grey-veined but still pale, so ivory card edges dissolve (`desktop/screens-27-table-marble.png`). |
| C8 | Mobile title buries the primary action | **Closed** | A full-width Continue pill sits directly under the title (`mobile/persist-24-title-continue.png`). The residue is minor (G10). |
| C9 | Inner dialogs are web controls | **Partly** | Settings now has brass lever toggles and brass segment fills (`desktop/screens-32-settings.png`). Daily has blank text tiles (`desktop/screens-37-daily.png`), Menu has line icons (`screens-37-menu.png`), and Stats has pills over a plain table (`screens-37-stats.png`). All three are unchanged. |
| C10 | Desktop HUD values small; toolbar a slab | **Partly** | HUD values went from about 15 px to about 20 px (`desktop/rules-01-klondike-deal.png`). They still cluster top-right, and the toolbar is still a band of five equal rectangles. |
| C11 | Hero tower accuracy; legal footer | **Closed** | The tower is now a steel lattice (`desktop/screens-31-title.png`). The footer now points to "About the art & facts". |
| C12 | Ornament intrudes into the index strip | **Partly** | The white sticker boxes are gone. Ace-medallion tips, court-frame top lines and the tops of 10/9 pips still show under the indices (`mobile/rules-06-freecell-617.png`, `desktop/visual-60-long-runs.png`). |
| C13 | Hint toast duplicates the arc | **Closed** | Arc and glow only, no toast (`desktop/play-16-hint.png`, `mobile/play-16-hint.png`). |

**Tally: 5 closed, 8 partly, 0 open.**

---

## C. Remaining gap list (ranked)

**No MAJOR gaps remain.** Everything below is medium or minor.

### G1. MEDIUM: the ceremony still breaks its frame in two places
- **Ours:**
  - `desktop/play-31-ceremony-gather.png`: the incoming A/2 row is sliced off by the HUD's bottom edge at y≈50.
  - `mobile/play-31-ceremony-spray.png` and `mobile/perf-41-cascade.png`: the court cluster flies past x=780 and is cut by the screen edge.
- **Benchmark:** `msc-06-win-cascade-portrait.jpg` owns the whole screen; `deckedout-03-win-ceremonies-portrait.jpg` composes every frame inside the device.
- **Fix:**
  - Clamp every gather keyframe's start position to the board rect, inset by half the card diagonal. Alternatively, put the ceremony layer above the HUD for the whole sequence.
  - On portrait, aim the spray's exit vector downward (toward the lower 40 % of empty felt) instead of to the right, and clamp its x-extent to the board width minus half a card width.

### G2. MEDIUM: the end beat is still a web sheet
- **Ours:** `desktop/play-30-win.png`, `mobile/play-30-win.png`. The ticket is now lovely. Around it sit an ivory modal, a plain red "You won!" header, a grey trivia box and three pill buttons. The punch on the stub is a flat black disc that reads as a blot, not a hole.
- **Benchmark:** `mobilityware-02-daily-challenge-portrait.jpg` (navy panel, gold trim, milestone bar, glossy primary pill); `grandharvest-04-lucky-wheel-portrait.jpg` (the reward is staged as an event).
- **Fix:**
  - Drop the ivory sheet. Float the ticket on the dimmed felt under a brass Deco plaque that reads "You won!" in the display face.
  - Make the punch show the felt through it, with a torn paper edge and a small paper chad that falls.
  - Animate the punch biting the hole.
  - Mark the 7/14/21 milestones on the hole row.
  - Set the trivia on a small inset card (postcard or ledger slip). Make the buttons one brass primary plus two lacquer secondaries.

### G3. MEDIUM: the courts are cleaner but not yet the flat colour-block Deco brief
- **Ours:** `desktop/screens-29-courts.png`, `desktop/rules-08-spider4.png`, `desktop/rules-01-klondike-deal.png`.
  - **Brief:** the set is now ligne claire with flat fills, but it is still a fashion-plate figure on mostly blank cream. Edges fade out instead of ending in hard colour shapes, and faces carry soft modelling.
  - **Layout:** the double-ended layout is still a horizontal cut with a brass band.
  - **Composition is uneven:** K♠ and J♣ fill the card, but Q♥ is a small figure pushed to the right edge with her face behind the ♥ index, and Q♥ also shows only a pale blob in compressed strips (`desktop/visual-60-long-runs.png`).
- **Benchmark:** `deckedout-01-klondike-portrait.jpg` (courts drawn in the same flat language as the pips, solid colour masses, every figure the same scale); `msc-01-klondike-desktop.png` (the court fills the card and reads at a glance).
- **Fix:**
  - Give each court a solid background field in the suit's colour family (jade, brass, ink or red) behind the figure, clipped to a stepped Deco cartouche, so there is colour mass instead of fade-out.
  - Remove the soft face shading: use two flat tones and a keyline.
  - Try a diagonal split with a brass chevron.
  - Re-compose Q♥ so the head sits below the index zone, at the same scale as Q♠.
  - Add a layout check: the face bounding box must sit fully inside the 30-70 % band of the card height.

### G4. MEDIUM: Daily, Menu and Stats are still web UI
- **Ours:**
  - `desktop/screens-37-daily.png`, `mobile/screens-37-daily.png`: seven blank cream tiles with a title and "NOT PLAYED".
  - `desktop/screens-37-menu.png`: thin generic line icons.
  - `desktop/screens-37-stats.png`: pill chips over a plain table.
- **Benchmark:** `mobilityware-02-daily-challenge-portrait.jpg`; `msc-03-themes-desktop.png` (framed illustrated tiles).
- **Fix:**
  - **Daily:** each tile gets a tiny fan of that game's cards in the current back, a date stamp and a brass "bathed" seal when done. Add a 7-day streak row.
  - **Menu:** one stepped-Deco icon set with 2 px brass strokes, matching the toolbar.
  - **Stats:** a ledger look with tabular figures, a win-rate dial and a sparkline of the last 20 games.

### G5. MEDIUM (mobile): Spider and FreeCell at the deal still leave most of the phone empty
- **Ours:** `mobile/rules-08-spider4.png`. Ten columns end at y≈505 of 1688 (30 %). Back strips are about 16 px on a card about 95 px tall. `mobile/screens-29-courts.png` and `mobile/rules-06-freecell-617.png` end at 31 % and 47 %. The printed emblem helps, but the action still sits in the top third.
- **Benchmark:** `msc-07-spider-portrait-android.jpg`. Back strips are about 25-30 % of card height, so the Spider deal reaches about 60 % of the screen and the backs read as a pattern.
- **Fix:** with long-run compression already adaptive (`mobile/visual-60-long-runs.png`), apply the same budget at the deal.
  - **Face-down step:** use `min(0.28*cardH, availH_share)` when columns are short.
  - **Spider on aspect ratios over 2:1:** start the tableau about 4 % lower.

### G6. MEDIUM (desktop): long columns shrink the whole board by about 35 %
- **Ours:** normal cards are about 104 px wide (`desktop/rules-01-klondike-deal.png`). With 13-card runs they drop to about 80 px (`desktop/screens-28-faces.png`) and about 68 px (`desktop/visual-60-long-runs.png`), leaving more than half the felt empty. If this rescale fires mid-game, every card jumps size under the player's hand.
- **Benchmark:** `msc-02-spider-desktop.png`, `msc-01-klondike-desktop.png`. Card size is stable for the whole game, and long fans compress instead.
- **Fix:**
  - Floor the board scale at about 0.85.
  - Before scaling, compress face-down steps to about 12 %, pull the foundation row up by its 16-20 px top margin, and let the face-up step fall to the court index height plus 2 px (the court glyph box is the binding limit, not 28 % of card height).
  - When the scale must change, ease it over 250 ms between moves, never during a drag.

### G7. MINOR: marble still washes out the cards; Quapaw is still busy
- **Ours:**
  - `desktop/screens-27-table-marble.png`, `mobile/screens-27-table-marble.png`: pale grey-cream marble under ivory cards. The 4♥ and 2♦ edges barely separate, and the slots look like smudges.
  - `desktop/screens-27-table-quapaw.png`: the herringbone is calmer but still reads as wicker at card-index scale.
- **Benchmark:** `mobilityware-04-wood-theme-portrait.jpg` (busy grain tamed by a strong centre light and dark edges); `brainium-04-vegas-pink-portrait.jpg`.
- **Fix:**
  - **Marble:** move to verde antico or dark Fordyce grey (base L* about 35-45) with light veins, or add a 30 % dark scrim inside the frame.
  - **Quapaw:** cut its contrast another 40 % and blur it slightly.
  - **Check:** gate every table on a card-edge-to-table luminance ratio of at least 1.6:1. Midnight walnut (`desktop/screens-27-table-midnight.png`) is the model.

### G8. MINOR: ornament slivers in the index strip (C12 residue)
- **Ours:**
  - `mobile/rules-06-freecell-617.png`: brass ace-medallion tips under A♦ and A♠, brass court-frame lines under Q, K and J, and the tops of heart pips under 10♥.
  - `desktop/visual-60-long-runs.png`: 10 and 9 pip tops and corner brackets peek out under the rank.
- **Benchmark:** `msc-04-klondike-portrait.jpg`, `mobilityware-01-klondike-hud-portrait.jpg`. The strip holds only rank and suit on plain stock.
- **Fix:** reserve the top 30 % (and the mirrored bottom 30 %) of every face as a clean zone. Pull pips, medallion points and the court frame top edge below `max(stepUp)+2px` at the smallest step the layout can produce.

### G9. MINOR: the desktop toolbar is still a slab
- **Ours:** `desktop/rules-01-klondike-deal.png`. The HUD values are fixed (about 20 px). The bottom bar is still five equal dark rectangles in a full-width band, and Score/Moves/Time are crammed into the top-right ~170 px.
- **Benchmark:** `deckedout-01-klondike-portrait.jpg` (values spread across the bar, one strong round action).
- **Fix:**
  - Spread the HUD values across the right third with brass hairline dividers.
  - Make the toolbar buttons stepped ziggurat plaques that overlap the frame's bottom edge, and let the band go transparent. Hint and New get the brass fill; Undo and Redo stay lacquer.

### G10. MINOR: polish on the phone title and sheets
- **Ours:**
  - `mobile/screens-31-title.png`: the top ~17 % is empty sky. The wide-tracked subtitle over the painting is hard to read. The Spider and Yukon buttons are still below the fold.
  - `desktop/screens-32-settings.png`: the sheet's brass frame runs down into the toolbar (frame bottom ≈752, toolbar top ≈745).
  - `desktop/art-50-backs.png`: the Tables row is cut off at the sheet's bottom edge, with no visible scroll cue.
- **Benchmark:** `brainium-02-wood-customize-portrait.jpg` (whole picker in one view).
- **Fix:**
  - **Phone title:** crop the sky by about 12 %, set the subtitle at normal tracking with a soft dark scrim, and shrink the plaque art so all four primary buttons fit on an 844 px screen.
  - **Settings sheet:** cap its height at the viewport minus the HUD and toolbar.
  - **Backs sheet:** add a fade at the bottom edge as a scroll cue.

---

## D. At or above benchmark level

1. **Card backs** (`desktop/art-50-backs.png`, `desktop/screens-26-back-*.png`). Twelve Hot Springs-specific backs that also read well as tight Spider strips. Still the best back set in the comparison.
2. **Drag feel** (`desktop/play-13-dragging.png`). Tilt, about 1.1x scale, a deep offset shadow and a brass rim. On a still frame this matches MSC's gold-glow lift (`msc-04-klondike-portrait.jpg`) and is more in keeping with the game's own style.
3. **Title screen** (`desktop/screens-31-title.png`, `mobile/persist-24-title-continue.png`). A full-bleed period painting with the corrected lattice tower, Deco plaques with fanned hands in the chosen back, and now a primary Continue pill on the phone. Better than `msc-03` and `brainium-02` for mood and place.
4. **Phone readability system** (`mobile/visual-60-long-runs.png`, `mobile/rules-06-freecell-617.png`, `mobile/screens-29-courts.png`). A heavy serif rank at about 45 % of card width, a fan step that adapts to height, and the new tight court cameos. At `msc-05`/`msc-07` level for legibility and more crafted.
5. **Win rosette** (`desktop/play-31-ceremony-rosette.png`). A 52-card skylight rosette on a cleared, lit stage. The spray's ghost-trail collapse (`desktop/play-31-ceremony-spray.png`) is a real themed ceremony of the kind only `deckedout-03` and `mobilityware-05` attempt. Fix G1 and G2 and the whole sequence is at benchmark level.
6. **Theme coverage and options.** The felt print, the slots with ghost A/K and fan emblems, the brass frame corners, the walnut table, the engraved Bath Ticket with KTHS trivia, a consistent dark mode, four-colour suits, a left-handed layout and the court-style toggle. On how far the theme reaches, this is above every benchmark.

---

## Suggested order of attack

1. G1 (ceremony clamps) and G6 (board-scale floor): cheap, visible bugs.
2. G2 (win plaque and punch): this finishes the signature moment.
3. G5 (phone deal spacing) and G8 (clean index zone).
4. G3 (court colour fields and Q♥ recomposition): the biggest art job.
5. G4, G7, G9 and G10.
