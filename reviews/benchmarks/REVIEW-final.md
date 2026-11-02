# Spa City Solitaire: final adversarial art review (visual-final captures)

Reviewer stance: independent art director with no stake in the game, comparing against the benchmark set in this folder (`INDEX.md`). The previous round is `REVIEW-m3.md`. Every status below was checked in the FINAL screenshots only. Nothing is marked fixed on trust.

Inputs: `screenshots/visual-final/{desktop,mobile,sheets,before-after}`. Desktop captures are 1280x800. Mobile captures are 390x844 CSS at 2x (780x1688 px). Pixel figures are in those files. Paths below are relative to `screenshots/visual-final/` unless they name a benchmark file.

Method note: I also pixel-diffed every final capture against its `v3-m3` twin to see what actually moved this round. Several captures are pixel-identical or nearly so (difference under 0.1 of 255):
- `desktop/screens-29-courts.png`, `desktop/screens-29-courts-2.png`
- `mobile/screens-29-courts.png`, `mobile/rules-06-freecell-617.png`, `mobile/visual-60-long-runs.png`
- `desktop/screens-37-menu.png`, `desktop/screens-37-stats.png`, `desktop/screens-32-settings.png`

So the court art, the Menu and Stats sheets, the desktop toolbar and the phone FreeCell/long-run layouts did not change after m3. The real work this round went into five areas:
- the win sheet (`play-30-win`)
- the ceremony gather and spray
- Marble and Quapaw
- desktop long-run scaling
- the Daily tiles and the title screen

---

## 1. Verdict

This is a handsome, coherent, unmistakably place-specific solitaire game. On theme and card backs it beats every benchmark. On everything else it sits between Brainium and MSC.

This round closed or mostly closed four gaps:
- The desktop gather frame bug is fixed.
- Marble no longer washes out the cards.
- The board shrink on long columns is down from about 35 % to about 20 %.
- The win sheet is now a dark lacquer panel with a brass primary button, a display-face header, an inset trivia slip and marked milestones.

It did nothing about two things:
- **The court cards.** These remain the one place where the game does not deliver the owner's own brief. The default set, labelled "Flat Art Deco" in Settings, is not flat colour-block Deco: it is a ligne-claire fashion plate fading into blank cream.
- **The UI chrome.** The Menu, Stats, toolbar and the phone title fold are unchanged.

**No MAJOR gaps remain.** The court style (G3) is the most important open item. It is the one gap measured against the owner's references rather than against the market.

---

## A. Scores

| Dimension | Final | m3 | Best benchmark | Sets the bar | Why |
|---|---:|---:|---:|---|---|
| Art | **8** | 8 | 9 | Decked Out (cohesion), MSC themes (range) | The title hero improved: a painted Deco sunburst sky, the lattice tower, and game tiles with fanned hands in the chosen back (`desktop/screens-31-title.png`). The twelve backs are still best in class. The courts are byte-identical to m3 (`desktop/screens-29-courts.png`) and still miss the flat colour-block brief, so the score holds. |
| Lighting & materials | **7.5** | 7 | 8 | Brainium, MSC | Marble's mid-felt grey level went from 168 to 134 (about 2.0:1 to about 3.1:1 against the card stock), so card edges now separate (`desktop/screens-27-table-marble.png`). Quapaw is dimmer (130 to 119). The win panel now has real lacquer and brass materials. The ticket punch is still a flat black disc. |
| Animation & game feel (inferred) | **7.5** | 7.5 | 9 | MSC (rim, trail, cascade, fireworks) | The desktop gather now sits fully inside the frame (`desktop/play-31-ceremony-gather.png`). The spray adds confetti. The phone spray still runs off the right edge (`mobile/play-31-ceremony-spray.png`), and the end beat is still a static modal with no punch animation that a still frame can show. Not raised. |
| UI | **7.5** | 7 | 8 | Decked Out (HUD), MobilityWare (panels) | The win sheet is re-skinned (lacquer, brass frame, one gold primary and two lacquer secondaries). Daily tiles now carry card fans. Menu and Stats are unchanged cream web sheets with line icons and a plain table. The desktop toolbar is unchanged. |
| Typography | **7.5** | 7.5 | 8 | MobilityWare, Decked Out | The display face now carries "You won!" and the title. Dialog body text is still small light Josefin (Stats rows about 13 px, `desktop/screens-37-stats.png`). The phone subtitle now sits on a scrim but is still widely tracked. |
| Readability | **8.5** | 8 | 9 | MobilityWare, MSC portrait | Long runs on desktop now use cards about 83 px wide instead of 68 (`desktop/visual-60-long-runs.png`). Marble passes. Ornament slivers under the phone indices are unchanged (`mobile/rules-06-freecell-617.png`). |
| Mobile (portrait) | **7.5** | 7.5 | 9 | MSC portrait, MobilityWare | Spider back strips grew from about 16 px to about 26 px (27 % of card height), so the backs now read as a pattern (`mobile/rules-08-spider4.png`). But the Spider deal still ends at about 32 % of the height, FreeCell is unchanged at 47 %, Spider and Yukon on the title are still below the fold, and the spray still clips. |
| Authenticity of setting | **8.5** | 8.5 | 8* | MSC themes / Decked Out | Unchanged strengths: lattice tower, felt print "Hot Springs, Ark.", engraved Bath Ticket, KTHS trivia, and backs named and annotated after real buildings (`desktop/art-50-backs.png`). Marble now reads more like smoky plaster than Fordyce marble: the veining is mostly gone. |

\* No benchmark attempts a real historical place. The reference measures how completely each one carries its theme across every surface. We exceed it.

**Overall: about 7.8/10.** For comparison: m3 7.6, m1 6.8, original 4.9. The benchmark ceiling is about 8.5.

---

## B. Status of REVIEW-m3 section C (G1-G10)

| # | Gap (m3) | Status | Evidence |
|---|---|---|---|
| G1 | Ceremony breaks its frame | **Partly** | Desktop is fixed: the ace row's top edge is at y≈62, below the HUD (≈50) and inside the frame (`desktop/play-31-ceremony-gather.png`). Phone gather is clean (`mobile/play-31-ceremony-gather.png`). The phone spray still runs past x=780, with 9/10/J cards cut at y≈900-1110 (`mobile/play-31-ceremony-spray.png`). |
| G2 | End beat is a web sheet | **Partly (mostly)** | Dark lacquer panel, brass Deco frame, gold display "You won!", trivia on an inset slip with a green rule, a gold "New deal" plus two lacquer secondaries, and gold rings marking holes 7/14/21 (`desktop/play-30-win.png`, `mobile/play-30-win.png`). It is still a modal box rather than a ticket floating on the felt, and the punch is still a flat black disc with no felt showing through. |
| G3 | Courts not flat colour-block Deco | **Open** | Pixel-identical to m3 (`desktop/screens-29-courts.png`). Faces are still modelled, figures still fade to cream, the cut is still a horizontal mirror band, and Q♥'s hair still sits under the ♥ index (`desktop/rules-08-spider4.png`). |
| G4 | Daily, Menu, Stats are web UI | **Partly** | Daily tiles now show a card fan per game (`desktop/screens-37-daily.png`, `mobile/screens-37-daily.png`). There is still no date stamp, "bathed" seal or streak row. Menu (`desktop/screens-37-menu.png`) and Stats (`desktop/screens-37-stats.png`) are unchanged. |
| G5 | Phone Spider/FreeCell deal leaves the screen empty | **Partly** | Spider strips are about 26 px (was 16) and the deal ends at y≈540 of 1688, 32 % (was 30 %) (`mobile/rules-08-spider4.png`). FreeCell is unchanged at y≈790, 47 % (`mobile/rules-06-freecell-617.png`). |
| G6 | Long columns shrink the desktop board by 35 % | **Partly (mostly)** | Card width is about 104 px at the deal and about 83 px with 13-card runs (`desktop/visual-60-long-runs.png`, `desktop/screens-28-faces.png`), down from 68 px in m3. That is about a 20 % shrink against a 15 % target. The right half of the felt is still empty. |
| G7 | Marble washes out; Quapaw busy | **Partly (mostly)** | Marble is fixed for contrast: grey level 134 against card stock 237, about 3:1 (`desktop/screens-27-table-marble.png`, `mobile/screens-27-table-marble.png`). Quapaw is still a legible chevron at card scale (`desktop/screens-27-table-quapaw.png`). |
| G8 | Ornament slivers in the index strip | **Partly (unchanged)** | Same as m3: brass ace-medallion tip under A♦, court-frame lines under Q and K, and red pip tops under 10♥ (`mobile/rules-06-freecell-617.png`, identical to m3). Faint corner brackets show under the 10s on desktop (`desktop/screens-28-faces.png`). |
| G9 | Desktop toolbar is a slab | **Open** | Unchanged: five equal dark rectangles, with Score/Moves/Time crammed into the top-right ~170 px (`desktop/rules-01-klondike-deal.png`). |
| G10 | Phone title and sheet polish | **Partly (minor)** | The subtitle now has a scrim. Still open: the top ~18 % of the phone title is empty sky, and Spider/Yukon buttons are below the fold (`mobile/screens-31-title.png`). The desktop Settings frame still runs into the toolbar (bottom ≈752 vs toolbar top ≈745, `desktop/screens-32-settings.png`). The Backs sheet still cuts the Tables row with no scroll cue (`desktop/art-50-backs.png`). |

**Tally: 0 closed, 8 partly (3 of them mostly), 2 open.**

---

## C. Remaining gaps, ranked

**No MAJOR gaps remain.** G3 is the most important: it is the only gap against the owner's stated references.

### 1. MEDIUM-HIGH: the courts still miss the flat colour-block Deco brief (G3)
- **Ours:** `desktop/screens-29-courts.png`, `desktop/rules-08-spider4.png`, `desktop/visual-60-long-runs.png`.
  - The default set is labelled "Flat Art Deco" in Settings (`desktop/screens-32-settings.png`), but it is a modelled ligne-claire figure fading into cream.
  - The double-ended cut is a horizontal brass band.
  - Q♥ is still a small figure pushed right, with her hair under the index. In compressed strips Q♥ is a pale smudge next to the strong K♦ and Q♦.
- **Brief and benchmark:** the 1920s Saks court card and flapper courts (solid colour masses, hard edges, figure as a poster shape). `deckedout-01-klondike-portrait.jpg` draws courts in the same flat language as the pips, with every figure at the same scale.
- **Fix:**
  - Give each court a solid suit-family field (jade, brass, ink or lacquer red) clipped to a stepped cartouche.
  - Flatten faces to two tones plus a keyline, and end every garment in a hard colour edge (no gradient fades).
  - Use a diagonal split with a brass chevron instead of the horizontal band.
  - Re-compose Q♥ so her head is below the index zone, at Q♠'s scale.
  - Gate the art on a check: the face bounding box must sit inside 30-70 % of half-card height, and no pixel within the index box may differ from card stock by more than ΔE 3.
  - Until then, relabel the option "Deco portraits" so the label does not overclaim.

### 2. MEDIUM: the phone ceremony spray still leaves the screen (G1 residue)
- **Ours:** `mobile/play-31-ceremony-spray.png`. The court cluster and the 9/10/J cards are cut by the right edge at x=780. `mobile/perf-41-cascade.png` changed but shows the same tendency.
- **Benchmark:** `msc-06-win-cascade-portrait.jpg`, `deckedout-03-win-ceremonies-portrait.jpg`. Every frame is composed inside the device.
- **Fix:**
  - On portrait, rotate the spray's exit vector to point down into the empty lower 40 % of felt.
  - Clamp the x-extent to `boardRight - 0.5*cardW`.
  - Add a capture test asserting that no ceremony card's bounding box crosses the board rect at any sampled frame.

### 3. MEDIUM: the end beat is a nicer box, but still a box (G2 residue)
- **Ours:** `desktop/play-30-win.png`, `mobile/play-30-win.png`.
  - The lacquer panel, brass frame and buttons are good.
  - The punch is still a flat black disc.
  - The ticket is still a framed picture inside a dialog rather than an object on the table.
  - The panel has dead dark bands above the header and below the buttons.
- **Benchmark:** `grandharvest-04-lucky-wheel-portrait.jpg` and `mobilityware-02-daily-challenge-portrait.jpg` both stage the reward as an event.
- **Fix:**
  - Drop the panel background. Float the ticket on the dimmed felt with a soft cast shadow and set "You won!" on a brass plaque above it.
  - Render the punch as a hole: the felt shows through, with a 1 px torn paper rim and a small chad that falls.
  - Animate the punch biting.
  - Put the trivia slip and buttons below the ticket on the felt.

### 4. MEDIUM: Menu and Stats are still web UI; Daily is half done (G4)
- **Ours:**
  - `desktop/screens-37-menu.png`, `mobile/screens-37-menu.png`: cream tiles with thin generic line icons.
  - `desktop/screens-37-stats.png`: pill chips over a plain table in small light type.
  - `desktop/screens-37-daily.png`: the new card fans help, but every tile still reads "NOT PLAYED" with no date or seal.
- **Benchmark:** `mobilityware-02-daily-challenge-portrait.jpg` (milestone bar, framed panels, badge); `msc-03-themes-desktop.png`.
- **Fix:**
  - **Menu:** one stepped-Deco icon set with 2 px brass strokes on lacquer tiles, matching the win panel.
  - **Stats:** a ledger look with tabular figures, a win-rate dial and a sparkline of the last 20 games.
  - **Daily:** a date stamp, a brass "bathed" seal when done, and a 7-day streak row.

### 5. MEDIUM (mobile): Spider and FreeCell deals still sit in the top third (G5)
- **Ours:**
  - `mobile/rules-08-spider4.png`: the deal ends at 32 % of the height.
  - `mobile/rules-06-freecell-617.png`: the deal ends at 47 %.
  - `mobile/screens-29-courts.png`: the deal ends at 31 %.
- **Benchmark:** `msc-07-spider-portrait-android.jpg`. The Spider deal reaches about 60 % of the screen.
- **Fix:**
  - When columns are short, grow the face-up step toward `availH / maxColumnLength`, capped at about 0.45 of card height, so FreeCell's 7-card columns fan to about 70 % of the height.
  - Start the tableau about 4 % lower on aspect ratios over 2:1.

### 6. MINOR-MEDIUM (desktop): long columns still shrink the board by about 20 % (G6 residue)
- **Ours:** `desktop/visual-60-long-runs.png`. Cards drop from about 104 px to about 83 px wide while the right half of the felt is empty.
- **Benchmark:** `msc-01-klondike-desktop.png`. Card size is stable for the whole game.
- **Fix:**
  - Floor the scale at 0.85.
  - Before scaling, compress face-up steps to the index height plus 2 px. The court strips already show the index fully at about 30 px, as `desktop/visual-60-long-runs.png` proves.
  - Ease any scale change over 250 ms between moves.

### 7. MINOR: the desktop toolbar and HUD are a slab (G9)
- **Ours:** `desktop/rules-01-klondike-deal.png`.
- **Benchmark:** `deckedout-01-klondike-portrait.jpg`.
- **Fix:**
  - Spread Score/Moves/Time across the right third with brass hairline dividers.
  - Make the toolbar buttons stepped plaques that overlap the frame's bottom edge, with a transparent band behind them.

### 8. MINOR: ornament slivers in the index strip (G8)
- **Ours:** `mobile/rules-06-freecell-617.png` (A♦ medallion tip, Q/K frame lines, 10♥ pip tops) and `desktop/screens-28-faces.png` (brackets under 10s).
- **Benchmark:** `msc-04-klondike-portrait.jpg`. The strip holds only rank and suit.
- **Fix:** reserve a clean zone of `minStep + 2px` at the top and bottom of every face. Move pips, medallion points and the court-frame top rule below it.

### 9. MINOR: Quapaw is still busy; Marble lost its marble (G7 residue)
- **Ours:**
  - `desktop/screens-27-table-quapaw.png`: the chevron weave still reads at index scale.
  - `desktop/screens-27-table-marble.png`: the darkening fixed contrast but erased most of the veining, so it now reads as smoky plaster.
- **Fix:**
  - **Quapaw:** cut the weave contrast another 40 % and add a 1-2 px blur.
  - **Marble:** move to dark Fordyce grey or verde antico (base grey level about 90-110) with crisp light veins. That keeps both contrast and the material.

### 10. MINOR: title and sheet framing (G10 residue, plus one new item)
- **Phone title:**
  - `mobile/screens-31-title.png`: 18 % empty sky, and Spider/Yukon buttons below the fold.
  - **Fix:** crop the sky by about 12 % and shrink the tile art so all four primary buttons fit in 844 px.
- **Desktop title with Continue (new):**
  - `desktop/persist-24-title-continue.png`: the secondary row (Daily, Backs & tables, Statistics, Settings, How to play) is pushed below 800 px, with only its pill tops showing at y≈785.
  - `desktop/screens-31-title.png`: the footer line is clipped at the bottom edge.
  - **Fix:** tighten the tile height or the hero gap when Continue is present.
- **Sheets:**
  - `desktop/screens-32-settings.png`: the Settings frame overlaps the toolbar.
  - `mobile/screens-32-settings.png`: the Settings frame covers the HUD title.
  - `desktop/art-50-backs.png`: the Tables row is cut with no scroll cue.
  - **Fix:** cap sheet height at the viewport minus the HUD and toolbar, and add a bottom fade.

**Major-gap verdict: no MAJOR gap remains.** The game is shippable at a commercial-quality bar. The single most important remaining job is G3, the court cards. They are good illustrations in the wrong style for the owner's brief, and they did not change this round.

---

## D. At or above benchmark level

1. **Card backs** (`desktop/art-50-backs.png`, `desktop/screens-26-back-*.png`). Twelve Hot Springs-specific Deco backs with a provenance line for each one ("Fordyce Skylight ... 1914-15"). They read well even as tight Spider strips. Best back set in the comparison, ahead of `brainium-02` and `msc-03`.
2. **Title screen** (`desktop/screens-31-title.png`, `mobile/persist-24-title-continue.png`). A full-bleed period painting with a Deco sunburst sky, the corrected lattice tower, brass-framed game tiles with fanned hands and a gold Continue pill. Better than any benchmark menu for mood and place.
3. **Drag feel** (`desktop/play-13-dragging.png`, `mobile/play-13-dragging.png`). Tilt, about 1.1x scale, a deep offset shadow and a brass rim. On a still frame it matches MSC's gold-glow lift (`msc-04-klondike-portrait.jpg`) and fits its own style better.
4. **Win rosette and gather** (`desktop/play-31-ceremony-rosette.png`, `desktop/play-31-ceremony-gather.png`, `mobile/play-31-ceremony-rosette.png`). A 52-card skylight rosette on a cleared, lit stage, now framed correctly on desktop. It is a real themed ceremony of the kind only `deckedout-03` and `mobilityware-05` attempt.
5. **Phone readability system** (`mobile/visual-60-long-runs.png`, `mobile/rules-06-freecell-617.png`). A heavy serif rank at about 45 % of card width, a fan step that adapts to height, and tight court cameos. At `msc-04`/`msc-05` level for legibility, and more crafted.
6. **Theme coverage** (`desktop/play-30-win.png`, `mobile/rules-01-klondike-deal.png`):
   - the felt print and the slots with ghost A/K and fan emblems
   - the brass frame corners
   - the engraved Bath Ticket with its 21-bath course and KTHS trivia
   - a consistent dark mode, four-colour suits, a left-handed layout and the court-style toggle

   On how far the theme reaches, this is above every benchmark.
7. **Table contrast** is now acceptable on all six tables. Felt, Midnight and Pool are at Brainium level.
