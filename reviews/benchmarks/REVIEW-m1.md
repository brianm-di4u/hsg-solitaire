# Spa City Solitaire: adversarial art review, milestone 1 (v3-m1 captures)

Reviewer stance: independent art director with no stake in the game, comparing against the benchmark set in this folder (`INDEX.md`). The previous review is `REVIEW-before.md`. Every status below was checked in the new screenshots; nothing is marked fixed on trust.

Inputs: `screenshots/v3-m1/{desktop,mobile,sheets}`. Desktop captures are 1280x800. Mobile captures are 390x844 CSS at 2x (780x1688 px). Pixel figures below are device pixels in those files.

---

## 1. Verdict

This is a different game from the "before" captures. The shell now belongs to the cards. You get a black-lacquer HUD with a brass Deco display face, brass-cornered recessed slots with ghost "A"/"K" and fan emblems, a bundled heavy serif index, a full-bleed title painting with Deco plaques, a rosette win ceremony, a brass hint arc, and a brass rim on the lifted card. Four of the previous six major gaps are closed or mostly closed.

What still separates it from MSC, MobilityWare and Decked Out is no longer taste. It is **staging and layout**:
- The phone board hugs the top third of a tall screen.
- Compressed desktop columns still clip court ranks.
- The win ceremony plays over a board of ghost slots and gets cut off by the HUD and the screen edge.
- The win modal is still the old static cream sheet.
- The courts are much better, but they are still illustrated portraits with sticker index boxes, not the flat colour-block Deco of the brief.

---

## A. Scores

| Dimension | Ours now | Previous | Best benchmark | Benchmark that sets the bar | Why |
|---|---:|---:|---:|---|---|
| Art | **7.5** | 6 | 9 | Decked Out (cohesion), MSC themes (range) | The new courts fill the card, have distinct personas and share a brass/jade palette with the aces. Backs are still best-in-class. The courts are still shaded illustration with white index stickers and a horizontal mirror cut. Two alternative tables are weak. |
| Lighting & materials | **6.5** | 5 | 8 | Brainium (glow pool, gradient), MSC (centre light) | The felt now has a centre pool and corner falloff, and cards have a bottom lip and soft shadow. The lifted card gets a rim but no deeper shadow. Marble, pool and Quapaw still fight the cards. |
| Animation & game feel (inferred) | **6** | 3 | 9 | MSC (gold rim, ghost trail, cascade and fireworks) | A real signature ceremony (gather, rosette, spray with steam and confetti), brass lift rim and hint arc. The ceremony clips under the HUD and off-screen on mobile and plays over ghost slots. The modal that follows is static. |
| UI | **6.5** | 4 | 8 | Decked Out (HUD), MobilityWare (panels) | The lacquer HUD, brass toolbar, framed sheets and the menu tile grid are a big step. The sheets are still web forms inside (iOS toggles, segmented controls, line icons, blank daily tiles). On mobile, Continue sits below the fold. |
| Typography | **7** | 4 | 8 | MobilityWare (one strong index serif), Decked Out (one family) | Now three faces with clear roles: Deco display, Josefin UI, and a bundled heavy index serif. Courier is confined to the ticket. Desktop HUD values are small. |
| Readability | **7** | 5 | 9 | MobilityWare, MSC portrait | The mobile index is now about 45 % of card width and bold, so Spider and FreeCell read at a glance. Normal desktop fans are clean. Compressed desktop columns still turn J into "I" and Q into "O". |
| Mobile (portrait) | **6** | 5 | 9 | MSC portrait FreeCell/Spider, MobilityWare | Columns run edge to edge, the index is big and the narrow-card cameo courts work. The bottom 60-65 % of the screen is empty felt, the board sits out of thumb reach, the ceremony is cut off at the right edge, and Continue is below the fold on the title. |
| Authenticity of setting | **8** | 7 | 8* | MSC themes / Decked Out (theme carried to every surface) | The theme now reaches the HUD, slots, fan emblems, frame corners, courts (bellhop, jockey silks, sax player, flappers, gambler) and the ceremony. The table surfaces are still generic green felt, and the hero's masonry campanile is questionable for 1920s Hot Springs Mountain. |

\* No benchmark attempts a real historical place. The reference measures how completely each one carries its theme across every surface.

**Overall: about 6.8/10 (previously about 4.9), against a benchmark ceiling of about 8.5.**

---

## B. Status of the 18 previous gaps

| # | Gap (previous) | Status | Evidence |
|---|---|---|---|
| 1 | Fan clips rank glyphs | **Partly** | Normal fans are fixed (`desktop/rules-06-freecell-617.png`, step about 41 px). Compressed columns still clip court ranks: J reads "I", Q reads "O" (`desktop/screens-28-faces.png`, step about 28 px). |
| 2 | No lift, glow or weight on pickup | **Partly** | Brass rim and bloom, slight scale (`desktop/play-13-dragging.png`, `mobile/play-13-dragging.png`). No deeper drop shadow, no tilt, no trail. |
| 3 | Win is a static modal over placeholder effects | **Partly (largely)** | The grey scallops are gone. The gather, rosette and spray ceremony has steam and confetti (`*/play-31-ceremony-*.png`). The staging bugs (gap C3) remain, and the modal is unchanged (`*/play-30-win.png`). |
| 4 | HUD and toolbar look like a web form | **Closed** | Lacquer bar, brass display-face mode name, label-over-value, brass-ringed toolbar with a dim disabled state (`desktop/rules-01-klondike-deal.png`). Residue in C10. |
| 5 | Mobile index too small and light | **Closed** | Rank about 45 % of card width, heavy serif, big centre pip on narrow cards (`mobile/rules-08-spider4.png`, `mobile/rules-06-freecell-617.png`). |
| 6 | Mobile leaves the bottom 60 % as empty felt | **Partly** | The sunburst is gone and the gutters are tight, but the board still ends at about 35 % of screen height (`mobile/rules-01-klondike-deal.png`, `mobile/rules-08-spider4.png`). |
| 7 | Courts are inset postage stamps in a clashing style | **Partly** | Full-bleed, distinct king personas, a painted set kept as an option, and phone cameos (`desktop/screens-29-courts.png`, `mobile/screens-29-courts.png`). Still shaded illustration, a horizontal cut and white sticker index boxes. |
| 8 | Lighting and materials are flat | **Partly** | Felt light pool, card lip and soft shadow (`desktop/rules-01-klondike-deal.png`). Card shadows are still short, the dragged card does not rise, and there is no skylight tint. |
| 9 | Alternative tables wreck contrast | **Partly** | Slots now read on every table. Marble is still pale with ochre blotches, pool caustics are full strength under the tableau, and Quapaw is a busy herringbone (`desktop/screens-27-table-marble.png`, `-pool.png`, `-quapaw.png`). |
| 10 | Ornament layout glitches | **Closed** | No rule through the mobile slot row, the Spider stock sits inside the frame, the steam is a faint wisp, and there is no stray circle (`mobile/rules-08-spider4.png`, `desktop/rules-08-spider4.png`, `desktop/screens-34-lefthanded.png`). A new overrun is in C2. |
| 11 | Typography incoherent | **Closed** | Deco display, Josefin UI, bundled index serif; Courier only on the ticket (`desktop/screens-31-title.png`, `desktop/play-30-win.png`). |
| 12 | Hints are a text toast | **Closed** | Brass dashed arc, glowing source, outlined target (`desktop/play-16-hint.png`). The toast is still visible (C13). |
| 13 | Title is a painting on a web form | **Closed** | Full-bleed hero, Deco plaques with fanned hands, lacquer button row (`desktop/screens-31-title.png`). The legal-sounding footer remains, and the mobile fold is a new problem (C8). |
| 14 | Dialogs are generic cream sheets | **Partly** | Brass stepped frame, display-face header, menu icon-tile grid with a Resume pill (`desktop/screens-37-menu.png`). Settings, Stats and Daily are still web controls (`desktop/screens-32-settings.png`, `screens-37-daily.png`). |
| 15 | Empty slots read as drop zones | **Closed** | Recessed brass-cornered tiles, ghost A/K, fan emblem in Spider, solid free cells (`desktop/rules-06-freecell-617.png`, `desktop/rules-08-spider4.png`). |
| 16 | Pip-card finish | **Closed** | Suit under the mirrored rank, Deco corner brackets (`desktop/screens-35-size-large.png`). |
| 17 | Focus colours off-palette | **Closed** | Brass rim on the held card, ivory ring on the cursor, no table border (`desktop/play-19-keyboard-held.png`). |
| 18 | Dark mode from a different game | **Closed** | Black lacquer, jade and brass (`desktop/screens-38-settings-dark.png`, `screens-38-game-dark.png`). |

**Tally: 10 closed, 8 partly, 0 open.**

---

## C. New ranked gap list

### C1. MAJOR (mobile): the board is a strip across the top of a tall phone
- **Ours:** `mobile/rules-01-klondike-deal.png` (the tableau ends at y≈570 of 1688), `mobile/rules-08-spider4.png` (ends at y≈413), `mobile/rules-06-freecell-617.png`, `mobile/screens-29-courts.png`.
  - About 60-65 % of the screen is empty felt.
  - Face-down strips are about 10-12 px (about 5-6 CSS px, roughly 10 % of card height).
  - All the action sits in the top third, which is the hardest area to reach with a thumb on a 19.5:9 phone.
  - The felt below has nothing in it: no light pool and no emblem.
- **Benchmark:**
  - `mobilityware-01-klondike-hud-portrait.jpg`: the board reaches about 55 % of the height, with face-down strips about 20 % of card height.
  - `msc-05-freecell-portrait.jpg` and `msc-04-klondike-portrait.jpg`: the tableau starts lower under a two-line HUD and runs to about 80 %.
  - `brainium-01-klondike-green-portrait.jpg`: the empty felt below carries a soft glow, so it reads as lit table rather than void.
- **Fix:**
  - **Fan step:** compute it per column from available height. Face-down step = `clamp(0.14*cardH, avail/…, 0.22*cardH)`. Face-up step = `min(0.45*cardH, (availH - cardH - downSteps)/(nUp-1))`, with a floor at the index height plus 4 px.
  - **Board position:** on aspect ratios above 1.9, push the foundation row down so it starts at about 16-18 % of screen height.
  - **Lower felt:** move the warm light pool to the lower-middle felt, and put a 5-6 % opacity Deco fan or Bathhouse Row emblem printed into the felt about 75 % of the way down. Real gaming felts carry a printed logo, so the empty felt reads as a table on purpose.

### C2. MAJOR (desktop): compressed columns still clip court ranks and run through the frame
- **Ours:** `desktop/screens-28-faces.png`.
  - With 13 cards in a column, the face-up step falls to about 28 px. The court index sits in a white box, so J loses its hook ("I") and Q loses its tail ("O").
  - The King row bottoms out at y≈733, across the inner brass frame line (≈725).
  - These are exactly the cards in an endgame run.
- **Benchmark:** `mobilityware-01-klondike-hud-portrait.jpg` and `msc-04-klondike-portrait.jpg`. Long runs compress, but the full glyph (descender included) always stays inside the strip, and stacks never cross chrome.
- **Fix:**
  - Use the **court** index box height, not the pip-card glyph, as the minimum face-up step. Add 3 px.
  - When a column will not fit, compress in this order: face-down steps (down to 12 %), then the gap to the frame, then scale the whole tableau about 0.9.
  - Clamp the column bottom to the frame's inner edge minus 8 px.
  - Add a layout test: a K-to-A run in every column at every card size never lets a rank glyph box exceed the step.

### C3. MAJOR: the win ceremony's staging undercuts it
- **Ours:**
  - `desktop/play-31-ceremony-gather.png` and `desktop/play-31-ceremony-spray.png`: the top of the ring and the flying courts disappear under the HUD at y≈50.
  - `mobile/play-31-ceremony-spray.png`, `mobile/play-30-cascade.png` and `mobile/perf-41-cascade.png`: the ring is off-centre and cut off by the right screen edge.
  - In every ceremony frame, four ghost "A" tiles, seven ghost "K" tiles and the stock slot stay fully visible behind the rosette, so the celebration plays over what looks like an emptied, unfinished board.
  - The spray phase reads as a random toss rather than a choreographed fall.
- **Benchmark:**
  - `msc-06-win-cascade-portrait.jpg`: the cascade owns the whole screen, HUD included.
  - `deckedout-03-win-ceremonies-portrait.jpg`: every ceremony is composed inside its frame.
  - `brainium-06-win-cascade-android.png`: the ribbon sits on a dimmed, re-lit stage.
  - `mobilityware-05-win-animation-portrait.jpg`: cards form one deliberate shape.
- **Fix:**
  - At ceremony start, fade the slots, ghost letters and corner fans to 0 over 300 ms.
  - Dim the felt about 20 % and add a warm skylight-tinted spotlight behind the rosette.
  - Compute the rosette radius from `min(boardW, boardH)/2 - cardDiagonal/2` and centre it on the board rect.
  - Either raise the ceremony layer above the HUD or clip it to the board.
  - Choreograph the spray as a falling bounce trail with card stamps (the MSC homage) or a fan that collapses into the Bath Ticket, not a scatter.

### C4. MEDIUM: the win modal and Bath Ticket are still the old static sheet
- **Ours:** `desktop/play-30-win.png`, `mobile/play-30-win.png`.
  - The same ivory modal with a pill row.
  - The ticket is a beige rectangle with a dashed red border, Courier text and 21 hollow circles.
  - Nothing is punched, stamped or revealed. After the new ceremony, the end beat is the weakest moment.
- **Benchmark:** `mobilityware-02-daily-challenge-portrait.jpg` (navy panel, gold trim, trophy progress bar with crown milestones, glossy primary pill); `grandharvest-04-lucky-wheel-portrait.jpg` (reward staged as an event).
- **Fix:**
  - Make the ticket a painted or engraved asset: guilloche border, a small Bathhouse Row or Fordyce vignette, a serial number from the deal number, and a perforated stub.
  - Animate a brass punch biting the next of the 21 holes, with a sound.
  - Mark milestones at 7, 14 and 21 baths (for example, one unlocks a back).
  - Put "You won!" on a brass plaque in the display face, and give the trivia its own inset card.

### C5. MEDIUM: the lifted card still has no weight
- **Ours:** `desktop/play-13-dragging.png`, `mobile/play-13-dragging.png`.
  - A brass rim and bloom, but the drop shadow is the same as a resting card's and the scale change is barely visible.
  - No tilt.
  - On mobile, the dragged 9♥ barely clears the 10♠ beneath it.
- **Benchmark:** `msc-04-klondike-portrait.jpg` and `msc-05-freecell-portrait.jpg` (thick rim, bloom, ghost-copy trail, card clearly above the table); `brainium-01-klondike-green-portrait.jpg` (halo, light pool and sparkles).
- **Fix:**
  - Scale to 1.06 over 90 ms.
  - Change the shadow to `0 12px 24px rgba(0,0,0,.45)` offset down and right, so the card floats.
  - Tilt ±4° with drag velocity.
  - Add 2-3 fading ghost copies on fast flicks, and a two-frame steam wisp on pickup for the theme.
  - Settle with a 120 ms overshoot on drop.

### C6. MEDIUM: the courts are better but still miss the flat colour-block Deco brief
- **Ours:** `desktop/screens-29-courts.png`, `desktop/rules-06-freecell-617.png`, `mobile/screens-29-courts.png`.
  - Rendered pen-and-ink illustration with hatching and modelled faces (closer to a Leyendecker fashion plate than a Saks court card).
  - The rank and suit sit in **white sticker boxes** that cut holes in the art.
  - The mirror is a horizontal cut with a brass band.
  - On phones the cameo crops vary wildly. The Q♥ cameo is mostly blank cream with a small figure at the edge.
- **Benchmark:** `deckedout-01-klondike-portrait.jpg` (courts drawn in the same flat language as the pips, so the deck is one system); `msc-01-klondike-desktop.png` (the court reads at a glance and fills the card).
- **Fix:**
  - Re-ink as 4-5 flat spot colours (ink, ivory, brass, suit red, jade) with a 1.5 px keyline and no soft shading.
  - Reserve a flat ivory corner in the art for the index instead of a boxed sticker.
  - Use a diagonal split for the double-ended layout.
  - Author phone cameos as tight head-and-shoulders crops with the face filling at least 60 % of the cameo.
  - Keep the current set as the "Painted" option (the toggle already exists in `desktop/screens-32-settings.png`).

### C7. MEDIUM: three of the six tables still fight the cards
- **Ours:**
  - `desktop/screens-27-table-marble.png`: pale cream with ochre-yellow blotches. It reads as stained parchment, not Fordyce marble, and the ivory card edges dissolve.
  - `desktop/screens-27-table-pool.png` and `mobile/screens-27-table-pool.png`: full-contrast caustics run behind every index.
  - `desktop/screens-27-table-quapaw.png`: a high-frequency herringbone at card-index scale that reads as wicker matting.
  - `desktop/screens-27-table-linen.png`: flat blue cloth with no light model.
- **Benchmark:** `mobilityware-04-wood-theme-portrait.jpg` (strong grain tamed by a centre highlight and dark edges); `brainium-04-vegas-pink-portrait.jpg` (even a pastel board keeps the cards popping).
- **Fix:**
  - **Marble:** re-tone to veined grey or verde antico with a 25 % dark scrim.
  - **Pool:** low-pass and darken by 35 % under the play area, and keep caustics animated at the edges only.
  - **Quapaw:** scale the herringbone 2-3x, cut its contrast by 50 %, and add a vignette. Or switch to the dome's mosaic tile at low contrast.
  - **Linen:** add the same centre pool and corner falloff as the felt.
  - **Checks:** gate every table on a measured luminance contrast between the card edge and the table of at least 1.6:1.

### C8. MEDIUM (mobile): the title screen buries the primary action
- **Ours:** `mobile/persist-24-title-continue.png`, `mobile/screens-31-title.png`.
  - The first screen is about 45 % sky.
  - **Continue game** is not visible without scrolling, even though desktop shows it (`desktop/persist-24-title-continue.png`).
  - The Spider and Yukon plaques are cut off.
- **Benchmark:** `brainium-02-wood-customize-portrait.jpg` and `msc-03-themes-desktop.png`. The primary choice is always in the first view.
- **Fix:**
  - On portrait, crop the hero to about 35 % of the height with the title on its lower edge.
  - Add a full-width brass **Continue** pill directly under the title when a save exists.
  - Use a compact 2x2 plaque grid: fan, name and one primary button each, with variants in a small sheet.

### C9. MEDIUM: the inner dialogs are still web controls
- **Ours:**
  - `desktop/screens-32-settings.png`: iOS-style toggles in brick red, plain segmented controls, and a rectangular brass focus box around a pill toggle.
  - `desktop/screens-37-daily.png`, `mobile/screens-37-daily.png`: seven blank cream tiles with text only.
  - `desktop/screens-37-menu.png`: generic line icons.
  - `*/screens-37-stats.png`: pill chips over a plain table.
- **Benchmark:** `mobilityware-02-daily-challenge-portrait.jpg` (themed panels, iconography, progress); `msc-03-themes-desktop.png` (framed illustrated tiles).
- **Fix:**
  - **Daily:** each tile gets a tiny fan of that game's cards, a date stamp and a brass "completed" seal.
  - **Controls:** toggles become small brass lever switches, and segmented controls become stepped brass tabs.
  - **Icons:** one custom stepped-Deco icon set (2 px brass).
  - **Stats:** a ledger look with tabular figures and a small sparkline of recent wins.
  - **Focus:** fit the focus ring to the control's shape.

### C10. MINOR: the desktop HUD values are small, and the toolbar is still a slab
- **Ours:** `desktop/rules-01-klondike-deal.png`.
  - Score, Moves and Time values are about 15 px, crowded into the top-right ~150 px, under 9 px labels. Scores are hard to scan at desktop distance.
  - The bottom toolbar is a full-width dark band holding five identical rectangles.
- **Benchmark:** `deckedout-01-klondike-portrait.jpg` (values about twice the label size, spread across the bar).
- **Fix:**
  - Values at 22-24 px with tabular figures, spaced across the right third with brass hairline dividers.
  - Float the toolbar buttons as round or ziggurat plaques that overlap the table frame's bottom edge, and let the band go transparent.

### C11. MINOR: setting accuracy of the hero painting
- **Ours:** `*/screens-31-title.png`. The hilltop tower is painted as a masonry Italianate campanile.
- **Issue:** The historical observation tower on Hot Springs Mountain in that era was, to my knowledge, a steel lattice tower. Please verify against a period postcard.
- **Benchmark:** none attempts a real place, so this only matters because authenticity is the game's selling point.
- **Fix:** repaint the tower as a steel lattice observation tower, or crop it out.
- **Footer:** the copy ("…no logos, no real people") still reads like legal text. Move it into an About sheet.

### C12. MINOR: ornament intrudes into the index strip
- **Ours:**
  - `mobile/rules-06-freecell-617.png`: the tips of the ace medallions poke up as small brass spikes under the "A".
  - `desktop/screens-29-courts.png`: the 7♥'s top pips peek into its strip.
  - Desktop court strips show a white index box plus the figure's hat, which is busy at a glance.
- **Benchmark:** `msc-04-klondike-portrait.jpg` and `mobilityware-01-klondike-hud-portrait.jpg`. The strip holds only rank and suit on plain card stock.
- **Fix:** reserve the top 30 % of every face (and the mirrored bottom 30 %) as a clean zone. Pull the pips and medallion points below it.

### C13. MINOR: the hint toast duplicates the arrow and sits far from it
- **Ours:** `desktop/play-16-hint.png`, `mobile/play-16-hint.png`. The arc does the job, but a toast at the bottom of the board repeats it in words.
- **Benchmark:** `brainium-03-hint-dark-portrait.jpg` (arrow only).
- **Fix:** keep the text in an `aria-live` region only, or show it as a tiny brass tag beside the arc's midpoint for 1.5 s.

---

## D. At or above benchmark level now

1. **Card backs** (`desktop/art-50-backs.png`, `desktop/screens-26-back-*.png`). There are twelve backs that are specific to Hot Springs. They now also read well as tight face-down strips across every Spider column. Still the best back set in the comparison.
2. **Title screen** (`desktop/screens-31-title.png`). The full-bleed painting, Deco display title and lacquer plaques with fanned hands in the selected back beat the `msc-03` and `brainium-02` menus for mood and place. On desktop it is at benchmark level for layout too.
3. **Mobile index and narrow-card design** (`mobile/rules-08-spider4.png`, `mobile/rules-06-freecell-617.png`). The heavy serif rank at about 45 % of card width, one big centre pip and a cameo on courts match `msc-07` and `msc-05` and look more crafted.
4. **HUD and type system** (`desktop/rules-01-klondike-deal.png`, `mobile/rules-01-klondike-deal.png`). The slim lacquer bar, brass display-face mode name and label-over-value meet the benchmark's minimal-HUD rule with more character than any of them.
5. **Empty slots and frame ornament** (`desktop/rules-08-spider4.png`, `desktop/rules-06-freecell-617.png`). Recessed tiles with stepped brass corners, ghost letters and a fan emblem are on par with KPatience's glassy slots and better themed.
6. **Signature win concept** (`desktop/play-31-ceremony-rosette.png`). The 52-card skylight rosette with radiating light is a real themed ceremony of the kind only `deckedout-03` and `mobilityware-05` attempt. Fix the staging (C3) and the ending (C4) and it is at benchmark level. Accessibility breadth (four-colour, left-handed, court-style toggle, reduced motion, a consistent dark mode) also remains above every benchmark.

---

## Suggested order of attack

1. C2 (court clipping and frame overrun) and C3 (ceremony staging): cheap, visible bugs.
2. C1 (mobile vertical layout) and C8 (mobile title fold).
3. C5 (drag weight) and C4 (ticket punch beat): the feel layer.
4. C7 (tables) and C9 (dialog internals).
5. C6 (flat Deco court re-ink): the biggest art job.
6. Minor items.
