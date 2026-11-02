# Spa City Solitaire: adversarial art review ("before" captures)

Reviewer stance: independent art director with no stake in the game. Compared against the benchmark set in this folder (see `INDEX.md`).
Inputs: `screenshots/visual-before/{desktop,mobile,sheets}`. Desktop captures are 1280x800 at 1x. Mobile captures are 390x844 CSS at 2x (780x1688 px).

> Caveat: the uncommitted `index.html` in the working tree already defines a dark "lacquer" HUD, a brass mode name and a Limelight display face (`--font-display`). None of these appear in the "before" captures, which show a beige bar and a geometric-sans title. Everything below grades the **captures**. If the working tree has moved on, re-shoot before you check items off.

---

## 1. Verdict in one paragraph

The **theme assets are the best thing here, and they are better than anything in the benchmark set.** The twelve painted card backs, the title hero painting, the Bath Ticket win card and the sourced trivia do what no benchmark tries: they make a specific place and decade. The **game around those assets is the weakest part.** You get a generic web-app shell (beige bars, system font, faded pill buttons) and almost no tactile feedback: a dragged card looks exactly like a resting one. The win "celebration" is a modal sitting on top of unstyled grey scallop shapes. There are also real readability bugs. On desktop, the fan clips J into "I" and Q into "O". On mobile, the index is too light and too small. Today it looks like a beautiful deck of cards dropped into a settings page. The benchmarks look like games.

---

## 2. Scores

| Dimension | Ours | Best benchmark | Which benchmark sets the bar | One-line why |
|---|---:|---:|---|---|
| Art (faces, courts, backs, tables, cohesion) | **6** | 9 | Decked Out (cohesion), MSC themes (range) | Backs are 9-level. Courts are pretty but are small inset portraits in a painterly-realist style that fights the flat pips and the owner's flat Saks Deco reference. Tables are uneven. |
| Lighting & materials | **5** | 8 | Brainium (gradient, glow, light pool), MSC (centre light) | Good ivory stock and felt vignette. Card shadows are tiny, cards have no thickness, there is no light pool, and the alternative tables wreck contrast. |
| Animation & game feel (inferred) | **3** | 9 | MSC (gold glow, ghost trail, bouncing cascade with fireworks) | No lift on drag, hints are a text toast, and the cascade is a tumbling pile over placeholder-looking grey scallops and bubbles. |
| UI (HUD, toolbar, dialogs, hierarchy) | **4** | 8 | Decked Out (HUD), MSC (slim strip), MobilityWare (panels) | Beige parchment bars, 11-12 px labels, washed-out disabled buttons, generic cream sheets. Functionally thorough, visually generic. |
| Typography | **4** | 8 | MobilityWare (one strong serif index family), Decked Out (one geometric family) | Four unrelated families: geometric sans title, system UI, system Palatino index, Courier New. The Deco display face never shows in the captures. |
| Readability | **5** | 9 | MobilityWare, MSC portrait | The desktop fan clips rank glyphs (J reads as I, Q as O, 3/5/9 lose their bowls). The mobile Spider index is about 11 CSS px in a thin serif. Pool and marble tables swallow cards and slots. |
| Mobile (portrait) | **5** | 9 | MSC portrait (FreeCell/Spider), MobilityWare | Column widths and touch targets are fine. The fan step does not stretch to use the height, the index is too light, and court art turns into postage stamps. A brass rule cuts through the foundation row. |
| Authenticity of setting | **7** | 8* | MSC themes / Decked Out (theme immersion, not history) | Backs, hero, ticket, trivia and bellhop jack are specifically Hot Springs. The table, HUD, dialogs and courts are generic "1920s". |

\* No benchmark attempts a real historical setting. The reference score measures how completely each one carries its theme across every surface. On that measure MSC themes and Decked Out beat us, because their theme reaches the table, the backs, the face accents and the win ceremony. Ours stops at the backs and the title screen.

**Overall: about 4.9/10 against a benchmark ceiling of about 8.5.** The gap is execution and feel, not taste.

---

## 3. Ranked gap list (most important first)

### 1. MAJOR: The fan clips rank glyphs (J reads as "I", Q as "O")
- **Ours:** `desktop/screens-28-faces.png`, `desktop/screens-29-courts.png`, `desktop/rules-06-freecell-617.png`. Face-up fan step on desktop is about 27 px on a 145 px card (18.6 %). The next card covers the Palatino J hook, the Q tail and the bottoms of 3/5/9. A player scanning a run reads "I O K".
- **Benchmark:** `mobilityware-01-klondike-hud-portrait.jpg` and `msc-05-freecell-portrait.jpg`. The whole glyph, descender included, sits inside a strip that is about 28-32 % of card height.
- **Fix:** Make the face-up step at least the index bounding box (`actualBoundingBoxAscent + actualBoundingBoxDescent` from `measureText`) plus 3-4 px, with a floor of 28 % of card height. Desktop has spare height: tableaus end around y=510 of 736. Alternatively, nudge the glyph up so its descent clears the strip. Add a test that fails if any rank's glyph box is taller than the fan step at each card size.

### 2. MAJOR: Picking up a card gives no lift, glow or weight
- **Ours:** `desktop/play-13-dragging.png` and `mobile/play-13-dragging.png`. The dragged 9 of hearts has the same tiny shadow, the same scale and no rim. It looks pasted on, not lifted.
- **Benchmark:** `msc-04-klondike-portrait.jpg` and `msc-05-freecell-portrait.jpg` (thick gold rim, bloom, ghost-copy trail); `brainium-01-klondike-green-portrait.jpg` (green halo and sparkle trail).
- **Fix:** On pickup, ease 90 ms to scale 1.06. Grow the shadow from `0 1px 3px` to `0 10px 22px rgba(0,0,0,.45)`. Add a 2 px brass rim (#E8C46A) with a soft outer bloom, and tilt ±4° with drag velocity. On a legal drop, settle 120 ms with a slight overshoot and a felt "thup". On an illegal drop, spring back with ease-out-back. On theme: a two-frame steam wisp off the lifted card, and two or three translucent ghost copies on fast flicks.

### 3. MAJOR: The win sequence is a static modal over placeholder-looking effects
- **Ours:** `desktop/play-30-cascade.png`, `desktop/perf-41-cascade.png`, `mobile/play-30-cascade.png`, `*/play-30-win.png`. Cards tumble into a pile while rows of flat grey semicircles and translucent grey discs cross the table. They read as unstyled CSS shapes, not bath steam or water. Then a plain cream modal appears.
- **Benchmark:** `msc-06-win-cascade-portrait.jpg` (bouncing card trail stamps plus fireworks), `deckedout-03-win-ceremonies-portrait.jpg` (themed ceremonies), `mobilityware-05-win-animation-portrait.jpg` (cards form a 3D airplane), `brainium-06-win-cascade-android.png` (sweeping ribbon).
- **Fix:** Delete the scallop bands. Replace them with either:
  - (a) a painted steam layer: blurred alpha sprites rising with additive glow, tinted warm; or
  - (b) a signature Deco ceremony: the 52 cards fly into a Fordyce skylight rosette or sunburst fan, hold for a beat, then fall in a classic bouncing trail with stamping as an homage.

  Then the Bath Ticket slides up and is visibly hole-punched on the next of the "21 baths", with a sound. Add brass confetti and steam motes. Keep a reduced-motion path.

### 4. MAJOR: The HUD and toolbar look like a web form, not a card table
- **Ours:** every in-game shot, for example `desktop/rules-01-klondike-deal.png`. Flat beige bars top and bottom. Score/Moves/Time labels are about 11 px and values about 14 px, in mixed fonts with a monospace "0 : 00". The bottom toolbar is five identical beige rectangles with 18 px icons, and the disabled ones fade to almost nothing. The bars are the largest flat, art-free areas on screen.
- **Benchmark:** `deckedout-01-klondike-portrait.jpg` (dark bar, small label over a big bold value, one round pause button); `msc-04-klondike-portrait.jpg` (slim dark strip in table colour); `mobilityware-01-klondike-hud-portrait.jpg` (values about 2x the label size, two round icon buttons).
- **Fix:**
  - **HUD:** a black or jade lacquer bar with a brass hairline, the mode name in the Deco display face in brass, values at 20 px or more in tabular lining figures, and labels in uppercase 10 px with 0.12 em tracking.
  - **Toolbar:** brass-ringed round buttons (or stepped ziggurat plaques) floating over the table's bottom edge instead of on a beige slab.
  - **Disabled state:** dim the icon to about 45 % on the same lacquer. Do not fade to beige.
  - The working-tree CSS seems to be heading this way. Finish it and re-shoot.

### 5. MAJOR (mobile): The index is too small and too light, worst in Spider and FreeCell
- **Ours:** `mobile/rules-08-spider4.png`. Spider rank glyphs are about 22 device px (about 11 CSS px) in thin Palatino on 33 CSS px cards. `mobile/rules-06-freecell-617.png` is about 13 CSS px. Even in Klondike (`mobile/rules-01-klondike-deal.png`) the index is about half of MobilityWare's relative size.
- **Benchmark:** `msc-07-spider-portrait-android.jpg` and `msc-05-freecell-portrait.jpg` (heavy index at about 40-45 % of card width on narrow cards); `mobilityware-01` (rank glyph about 6 % of screen width, heavy serif).
- **Fix:** For narrow cards (under 70 CSS px wide), set the rank to 44-46 % of card width and the suit to 30 %. Use a heavier bundled face (see gap 11), because system Palatino Bold is spindly at small sizes. Keep the single big centre pip on narrow cards; that part is already right. Turn on the "Large index" setting by default below 400 CSS px wide.

### 6. MAJOR (mobile): The layout leaves the bottom 60 % of the screen as empty felt
- **Ours:** `mobile/rules-06-freecell-617.png`, `mobile/screens-29-courts.png`, `mobile/rules-08-spider4.png`. All play happens in the top 35 % of the screen. The rest is felt with giant gold rays converging on nothing.
- **Benchmark:** `msc-05-freecell-portrait.jpg` and `mobilityware-01`. Fans are taller, so more of every card shows, and the board visibly occupies the screen. Gutters are 2-6 px.
- **Fix:** Compute the face-up step per column from available height: `min(0.45*cardH, (availH - cardH)/(n-1))`, with a floor of 0.30*cardH. Tighten the outer margin and gutters to 4 px so cards gain about 6-8 % width. Shrink the sunburst ornament and pin it to the bottom so it frames the board rather than filling it.

### 7. MEDIUM: Court cards are inset postage stamps in a style that clashes with the pips and with the brief
- **Ours:** `desktop/screens-29-courts.png` and `mobile/screens-29-courts.png`; source art in `assets/court-*.webp`. Each court is a painterly-realist half-figure, mirrored at the chest, inside a gold frame about 75 % of the card width with a wide beige margin. On mobile the figure is about 35 CSS px tall and unreadable. All four kings share the same frontal pose and age. Fanned courts leak gold frame lines into the index strip (`desktop/rules-06-freecell-617.png`). The look is glossy realism, while the owner's references (Saks 1920s Deco court, flapper courts) are **flat, bold colour-block, keylined** and would match the vector pips.
- **Benchmark:** `msc-01-klondike-desktop.png` and `kpatience-01-desktop.png` (court reads at a glance, fills the card); `deckedout-01-klondike-portrait.jpg` (courts share the pips' flat language, so the deck is one system).
- **Fix:** Re-author the courts as flat Deco: 4-5 spot colours (ink, ivory, brass, suit red, jade), 1.5 px black keyline, full-bleed to a 6 % border, double-ended with a diagonal split rather than a horizontal cut. Give each rank a silhouette: K in a top hat or homburg with a cane or cigar, Q in a cloche or bandeau with a fan or pearls, J as an Arlington bellhop's pillbox, caddie, or bath attendant's towel. Give the four kings different personas (gambler, bathhouse proprietor, bandleader, doctor). Keep the current painted set as an optional "Painted Portrait" deck.

### 8. MEDIUM: Lighting and materials are flat
- **Ours:** `desktop/rules-01-klondike-deal.png`. Card shadows are about 1-3 px. There is no edge or thickness, a stack of 12 looks as flat as one card, and the felt has a vignette but no light pool.
- **Benchmark:** `brainium-01` (vertical card gradient, soft shadow, centre glow); `deckedout-01` (bottom thickness lip); `msc-02-spider-desktop.png` (centre-light falloff).
- **Fix:**
  - **Cards:** a 1 px darker edge, a 1.5 px bottom lip in #d8cdb6, and a two-layer shadow (`0 1px 1px rgba(0,0,0,.35), 0 3px 8px rgba(0,0,0,.25)`).
  - **Stock:** offset its edge lines with depth.
  - **Table:** add a soft warm radial pool behind the tableau, lightly tinted blue-green as if lit through the skylight back's stained glass, with stronger falloff at the corners.

### 9. MEDIUM: Alternative tables wreck contrast
- **Ours:** `desktop/screens-27-table-marble.png` (ivory cards on white marble, slot outlines invisible); `desktop/screens-27-table-pool.png` (high-frequency caustics behind the indices, foundations gone); `screens-27-table-linen.png` (flat blue cloth with no light model).
- **Benchmark:** `brainium-04-vegas-pink-portrait.jpg` (pastel boards still keep white cards popping); `mobilityware-04-wood-theme-portrait.jpg` (busy grain tamed by a centre highlight and dark edges).
- **Fix:**
  - **Marble:** re-tone to darker veined verde antico or grey (Fordyce floors and wainscot), or apply a 25-30 % dark scrim.
  - **Pool:** low-pass and darken 35 % under the play area, and keep the animated caustics at the edges only.
  - **All tables:** tune slot outline alpha and fill tint per table, minimum 35 % outline contrast.

### 10. MEDIUM: Ornament layout glitches
- **Ours:**
  - `mobile/rules-01-klondike-deal.png` and `mobile/rules-08-spider4.png`: the brass double rule runs straight through the foundation and cell row.
  - `desktop/rules-08-spider4.png` and the `screens-26-back-*` set: the Spider stock fan overruns the right brass rule to the window edge.
  - `desktop/rules-01-klondike-deal.png` and `screens-35-size-large.png`: the "steam" above the stock reads as a grey smudge.
  - `desktop/screens-34-lefthanded.png`: a stray translucent circle over the last foundation.
- **Benchmark:** every commercial benchmark keeps its frame chrome clear of play elements.
- **Fix:** Inset the horizontal rule above the slot row, or remove it on mobile. Reserve stock-fan width inside the frame. Make the steam a shaped, animated curl sprite at about 25 % alpha that runs occasionally, not a static blob. Audit the stray circles, which look like leftover bubble particles.

### 11. MEDIUM: The typography system is incoherent and depends on the platform
- **Ours:**
  - **Title** (`*/screens-31-title.png`): geometric sans (Josefin/Century Gothic look). The declared Limelight Deco face never shows in any capture.
  - **Body:** system-ui (Segoe UI).
  - **Card index:** system "Palatino Linotype". Android has none, so it falls back to Noto Serif or Times and the deck looks different per device.
  - **Ticket and stats:** Courier New.
  - The "10" is squashed to 78 % width.
- **Benchmark:** `mobilityware-01` (one heavy serif for indices, a clean sans for the HUD); `deckedout-01` (one rounded geometric family everywhere).
- **Fix:** Bundle and use exactly three faces:
  - a Deco display face (Limelight is fine) for titles, plaques and the mode name;
  - Josefin Sans 600/700 for UI and the HUD, with tabular figures;
  - one **bundled** heavy index face with lining figures, tested at 11 px, so the index no longer depends on system Palatino. Pick a narrow-bowled 10 so it does not need squashing.

  Drop Courier, or keep a typewriter face only inside the ticket stub.

### 12. MEDIUM: Hints are a text toast
- **Ours:** `desktop/play-16-hint.png` and `mobile/play-16-hint.png`. A yellow outline on the card, a cyan outline on the slot (off-palette), and "Hint: Ace of spades to foundation 1" in a pill.
- **Benchmark:** `brainium-03-hint-dark-portrait.jpg` (curved arrow from source to target, big round hint button).
- **Fix:** Draw an animated brass arc arrow from source to target, nudge the source card twice (±3 px, 160 ms), and pulse the target slot. Keep the toast text for screen readers only, or shorten it.

### 13. MEDIUM: The title screen is a great painting on top of a web form
- **Ours:** `desktop/screens-31-title.png`. The hero ends in a fade, then come bordered cream boxes with pill buttons. About 15 % of the desktop height is empty below. The footer reads like legal copy ("no logos, no real people").
- **Benchmark:** `msc-03-themes-desktop.png` (framed, illustrated tiles with label bands); `grandharvest-04-lucky-wheel-portrait.jpg` (menus with real production value).
- **Fix:** Run the hero full-bleed behind everything. Put the four games on Deco plaques: a stepped-corner brass frame, a small fanned hand of cards in the selected back, and the game name in the display face. Draw a lacquer button row below. Move credits into an About sheet.

### 14. MEDIUM: Dialogs are generic cream sheets
- **Ours:** `*/screens-32-settings.png`, `*/screens-37-menu.png`, `*/screens-37-stats.png`, `*/screens-37-daily.png`. These are system-font lists with rounded rectangles. The Menu is ten identical text buttons.
- **Benchmark:** `mobilityware-02-daily-challenge-portrait.jpg` (navy panels, gold trim, iconography, glossy primary pill); `msc-03` (gold frames, red label bands).
- **Fix:** One themed sheet component: ivory or lacquer panel, brass stepped-corner frame, the header on a small brass plaque in the display face, and Deco hairline dividers. Make the Menu a 2x4 icon-tile grid (New, Restart, Deal #, Daily, Backs, Settings, Stats, Help) with Resume as a single primary pill.

### 15. MINOR: Empty slots and free cells read as web drop-zones
- **Ours:** `desktop/rules-06-freecell-617.png` (dashed-outline free cells); `desktop/rules-08-spider4.png` (eight spade emblems in 4-suit Spider); thin outlines with a system-serif "A"/"K" everywhere.
- **Benchmark:** `kpatience-01-desktop.png` (glassy recessed slots with emblem); `brainium-01` (translucent tiles with an embossed "A").
- **Fix:** Use the `brass-slot` and `brass-cell` assets already in `assets/`: recessed fill about 12 % darker, inner shadow, brass inlay line, and a Deco fan emblem. Make free cells solid recessed tiles, not dashed. Show a neutral emblem on Spider foundations.

### 16. MINOR: Pip-card finish
- **Ours:** `desktop/rules-01-klondike-deal.png`. The mirrored bottom-right index is rank-only, with no suit, so it looks unfinished. There is no themed ornament on pip cards at all.
- **Benchmark:** `kpatience-01` (filigree on pip cards); `mobilityware-01`, `msc-01` (complete mirrored indices).
- **Fix:** Add the suit under the mirrored rank. Add a 1 px brass hairline frame inset 5 % with stepped Deco corners. Optionally add a 6 % opacity bath-fan watermark behind the centre pips of 2 to 5.

### 17. MINOR: Focus and selection colours are off-palette
- **Ours:** `desktop/play-19-keyboard-held.png` (saturated yellow border around the whole table, dotted card outline); `desktop/play-16-hint.png` (cyan slot outline); `screens-38-settings-dark.png` (cyan focus box).
- **Fix:** One focus language: a 2 px brass ring plus a 4 px ivory halo on cards and slots, and a brass ring on controls. No full-table border.

### 18. MINOR: Dark mode belongs to a different game
- **Ours:** `desktop/screens-31-title-dark.png` and `screens-38-*`. Purple-navy panels and yellow pills, while the game stays green and brass.
- **Fix:** Dark means black lacquer, jade and brass, matching the Midnight Club table and the HUD.

---

## 4. Already at or above benchmark level: preserve these

1. **Card backs** (`desktop/screens-26-backs.png`, `assets/back-*.webp`). Twelve hand-themed backs (Fordyce Skylight stained glass, Quapaw Dome, Row Ironwork, Lake Ouachita Dusk, Racing Silks) beat MSC's damask and Brainium's mandalas on craft and specificity. The Skylight back is the deck's signature; don't touch it.
2. **The Bath Ticket win card with the "Course of 21 baths" punch row and sourced trivia** (`*/play-30-win.png`). It is authentic, characterful and unlike anything in the benchmark set. Keep the content and add motion and staging around it.
3. **Title hero painting** (`*/screens-31-title.png`). It has period mood, Bathhouse Row architecture, steam and lamplight. It should get more screen area, not less.
4. **Ivory textured card stock and the warm red and green-black ink**. On par with MobilityWare's ivory faces; easy on the eye and on brand.
5. **Ace medallions** (`desktop/screens-29-courts.png`), especially the Ace of Spades with the bathhouse. A good model for the Deco language the courts should adopt.
6. **Accessibility and options breadth** (`*/screens-32-settings.png`): left-handed layout, card size with a larger index, four-colour suits, auto-move levels, reduced motion, and the "Finish" highlight. This is at or above every benchmark. Keep it when re-skinning, and also keep the tight face-down strip (about 14 % of card height), which matches MSC.

---

## 5. Suggested order of attack

1. Gaps 1 and 5: readability bugs, cheap and high impact.
2. Gap 2: drag lift, the core feel.
3. Gaps 4 and 11: HUD and type system, which defines the shell.
4. Gap 3: the win ceremony.
5. Gaps 6, 8 and 10: mobile layout, lighting and ornament fixes.
6. Gap 7: the court redraw, the biggest art job, and best done once the shell is settled.
7. Everything else.
