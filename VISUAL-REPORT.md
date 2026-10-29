# Spa City Solitaire: visual enhancement report (v3)

The plan is in `VISUAL-PLAN.md`. The benchmarks and the four adversarial reviews are in `benchmarks/`
(git-ignored, kept on this machine): `INDEX.md`, `REVIEW-before.md`, `REVIEW-m1.md`, `REVIEW-m3.md` and
`REVIEW-final.md`.

**Result.** The game kept its rules, saves and options. Visually it went from about **4.9/10 to about
7.8/10**, against a benchmark ceiling of about 8.5 (MSC, MobilityWare, Brainium, Grand Harvest, Decked
Out, KPatience, AisleRiot, PySolFC). After round 3 the reviewer found **no major gaps**; the medium and minor
ones left are listed under "Known gaps". All 88/88 test runs pass at both viewports, with zero console
errors and zero external requests, from the harness server and from file://.

## 1. Direction

The game stays **2D canvas, lit, with 3D-rendered hardware**. Every benchmark is 2D; solitaire reads flat from
above; and crisp cards matter more than a camera. Depth comes from light (lamp, vignette, skylight glow), card
physics (arc, lift, lean, settle, shadow growth, sheen) and real-metal brass rendered in Blender. WebGL and
three.js were rejected. Rendering costs about 1 ms of CPU per frame without them, so they would add a large
download and a fallback path for no visible gain.

## 2. What changed

### Table and hardware
- **Six lit tables**, each a frameless Codex texture in a landscape and a portrait cut. Code adds a tone wash,
  a soft-light lamp pool and a vignette:
  - **Card-Room Felt** (default).
  - **Fordyce Bath Hall**: grey-veined marble under amber and honey skylight glass with a blue-green centre,
    coloured from the HABS colour photo.
  - **Quapaw Mosaic** (new): buff and tan chevron tile, from the HABS colour photo of the dome.
  - **Thermal Pool**, **Midnight Club** (walnut) and **Linen Postcard**.

  The old framed table paintings are retired.
- **Brass hardware rendered in Blender 5.2** (`art-src/blender/brass.py`: procedural, Cycles, transparent):
  - Deco corner fans.
  - Empty-pile inlays with engraved A, K and fan marks; the free-cell inlays have jade studs.
  - A recycle token.
  - A dialog frame used as a CSS 9-slice border on every sheet and title plaque.
- On tall phones a faint "Spa City · Hot Springs, Ark." emblem is printed into the lower felt.

### Cards
- **Three bundled OFL faces** (`vendor/fonts`, inlined in `assets/fonts.css`): Libre Bodoni for indices,
  Josefin Sans for the UI, Limelight for display. The deck no longer depends on system Palatino, which looked
  different on every platform.
- **Readability.**
  - Phones get a jumbo index: 46% of card width, about 23 px in Klondike and 15.6 px in Spider.
  - The face-up fan step is never smaller than the measured rank glyph, so J and Q never lose their tails.
  - When a long column can't fit, the board shrinks in 6% steps down to a floor of 80% of a Standard card. It
    never grows back mid-deal.
  - Phone fans use the spare height.
- **Card stock** gains a printed-deck edge lip, stacked edges on squared piles, stepped Deco corner brackets
  on pip cards, and the suit under the mirrored index.
- **New default court set: "Art Deco"**. Twelve fictional 1920s Hot Springs characters by suit:
  - ♠ Bathhouse Row: proprietor, society lady, bath attendant.
  - ♥ Ballroom: bandleader, dancer, saxophonist.
  - ♦ Races: owner, lady with parasol, jockey.
  - ♣ Card rooms and nightlife: host, singer, bellhop.

  They are drawn in ink-line flat colour, full-bleed and double-ended, with feathered ivory corners under the
  indices. On phones they show a head-and-shoulders cameo framed by a measured figure centre. The v2 painted
  portraits remain as a **Court cards: Painted** setting.

### Motion and feel
- **Moves.** Cards fly on an arc: they lift (+5.5% scale, a longer and softer shadow thrown away from the
  lamp), lean into the direction of travel and land.
- **Flips.** A flip foreshortens with a perspective shear and a sweeping sheen.
- **Drags.** A dragged run lifts higher, tilts with hand speed, wears a gold rim, leaves ghost copies on fast
  flicks and settles with a small overshoot.
- **Foundations.** Gold glints burst where a card lands.
- **Hints.** A brass dashed arc runs from the card to its target, the source card gets a nudge, and the text
  goes to the screen-reader live region.
- **Win ceremony.** The board fades and dims. The cards gather into a rosette under a glow coloured like the
  Fordyce skylight and hold there. They then peel off in bouncing arcs that stamp a fading trail, rebound off
  the side rails, and raise steam, while brass confetti falls.
- **Bath ticket.** It rises on a lacquer sheet: engraved guilloche stock (a Codex painting), a serial number
  from the deal, and the next of the 21 holes punched through to the felt. Every 7th hole is a brass
  milestone. The trivia card sits on a cream slip.

### Shell
- **In-game chrome.**
  - **Top bar and toolbar:** dark lacquer bars with brass rules, a Limelight mode name, and label-over-value
    figures at about 21 px.
  - **Toolbar buttons:** brass-edged; the Finish button lights up brass.
  - **Focus:** one brass and ivory focus language.
- **Title.** A full-bleed painting; the Hot Springs Mountain tower was edited from a masonry campanile to the
  period's steel lattice tower. Deco plaques show a fanned hand in the player's own back and court style. On
  phones a Continue pill sits above the fold.
- **Dialogs.**
  - **Frames:** a brass 9-slice frame and Limelight headings on every sheet.
  - **Menu:** an icon grid, with Resume as the one primary pill.
  - **Daily:** tiles each with a fanned hand and a brass seal when won.
  - **Controls:** brass lever toggles and stepped brass tabs.
- **Dark mode** is now lacquer, jade and brass instead of the shared tokens' purple-navy, so it matches the
  game.

## 3. Review scores

Scored by an independent adversarial subagent against the benchmark screenshots each round. The final
review's verdict: "no MAJOR gap remains ... shippable at a commercial-quality bar."

| Dimension | Before | M1 | M3 | Final | Best benchmark |
|---|---:|---:|---:|---:|---:|
| Art | 6 | 7.5 | 8 | 8 | 9 |
| Lighting & materials | 5 | 6.5 | 7 | 7.5 | 8 |
| Animation & game feel | 3 | 6 | 7.5 | 7.5 | 9 |
| UI | 4 | 6.5 | 7 | 7.5 | 8 |
| Typography | 4 | 7 | 7.5 | 7.5 | 8 |
| Readability | 5 | 7 | 8 | 8.5 | 9 |
| Mobile | 5 | 6 | 7.5 | 7.5 | 9 |
| Authenticity of setting | 7 | 8 | 8.5 | 8.5 | 8* |
| **Overall** | **4.9** | **6.8** | **7.6** | **7.8** | **8.5** |

\* No benchmark attempts a real place. That score measures how completely each game carries its theme.

Gap tallies:
- Before: 18 gaps, 6 of them major.
- After M1: 10 closed, 8 partly, 0 open, and 13 new (3 major).
- After M3: 5 closed, 8 partly, 0 open, and no major gaps.
- Final (G1–G10 from M3): 0 closed, 8 partly (3 of them mostly), 2 open, and no major gaps. Three of those were
  then fixed before the definitive run: the phone spray clamp, the sheet framing and the desktop title with
  Continue.

## 4. Tests

`node shared/test-harness/run.mjs games/solitaire --milestone visual-final` gives **88/88**. Every
screenshot was inspected: 118 (65 desktop, 53 mobile) files, through contact sheets (`screenshots/visual-final/sheets/`), with
the key shots opened full size. Before/after sheets are in `screenshots/visual-final/before-after/`
(`tools/before-after.mjs`).

| File | Tests | What v3 added or changed |
|---|---|---|
| `rules.test.mjs` | 11 | unchanged |
| `play.test.mjs` | 11 | **play-31**: frozen-clock ceremony frames at 0.6, 1.35 and 2.5 s. **play-16**: cycling no longer depends on the 2.2 s glow window. **play-30**: ticket text check |
| `screens.test.mjs` | 16 | **screens-27**: six tables. **screens-37**: measures the win sheet after it settles. **screens-38**: contrast on the lacquer chrome |
| `persist.test.mjs` | 3 | unchanged (saves are compatible; the new `courts` setting defaults to `deco`) |
| `art.test.mjs` | 2 | asset budget raised to 6 MB |
| `perf.test.mjs` | 1 | asserts the **median CPU per frame** for drag and ceremony, and **at most one frame per refresh** (this caught a double-scheduling bug). fps, p95 and max are logged |
| `visual.test.mjs` (new) | 5 | **visual-60**: every face-up step shows the whole rank glyph, at three card sizes in three games plus K-to-A runs in four columns, and no column passes the table edge. **visual-61**: phone index ≥ 40% of card width and ≥ 15 px. **visual-62**: first-load download ≤ 1.5 MB, all assets ≤ 6 MB. **visual-63**: `?fx=low` still plays the full ceremony. **visual-64**: court-style setting, lazy loading and persistence |
| `tools/check-file-url.mjs` | — | opens the game from disk (file://) at both viewports: fonts, all images, no errors, no external requests. It caught a tainted-canvas bug that the http harness could not see |

## 5. Performance

Measured in headless Chromium **on a machine running about 26 other headless browsers, Blender and Codex at
100% CPU**. rAF fps here mostly measures that contention, so the game's own CPU cost per frame is the number
to trust.

| Metric | Desktop | Mobile (390×844 @2×) |
|---|---|---|
| CPU per frame while dragging (4-suit Spider), median / p95 | 0.5 / 0.9 ms | 0.5 / 0.7 ms |
| CPU per frame in the win ceremony, median / p95 | 1.2 / 1.9 ms | 0.7 / 1.0 ms |
| rAF fps while dragging / during the ceremony (contended) | 60.6 / 41.1 in the final run (as low as 7 / 3 in earlier contended runs) | 60.5 / 43.1 in the final run |
| Load to `__game` | 247 ms wall; 71 ms from navigation to DOMContentLoaded | 237 ms wall; 76 ms boot |
| JS heap | 9.5 MB | 9.5 MB |
| First-load download (html + fonts + 21 images) | 1.42 MB | 1.38 MB (portrait textures) |
| Whole game folder shipped (`index.html` + `assets/`) | about 4.5 MB | same |

- **Rendering.** Still on demand: the loop sleeps when idle. Cards are baked sprites. The table is drawn once
  per resize. The ceremony trail canvas runs at 1× resolution.
- **Fixed during the pass.**
  - A self-inflicted rAF double-scheduling bug: frames of 200–300 ms, and frame counts that multiplied while
    dragging.
  - A full-resolution trail canvas that cost 10 ms a frame at 2× DPR.
  - A render-blocking font stylesheet. Load dropped from about 2.1 s under load to about 0.3–0.5 s; the
    stylesheet now loads as non-blocking print media and is awaited before sprites bake.
  - `getState` returned a stale timer.
- **Low-end fallbacks.**
  - **Effects watchdog:** an EMA of frame CPU above 12 ms (or `?fx=low`) turns off glints, confetti, ceremony
    steam, the skylight glow, ghost trails and stamps. Cards, flights and flips stay.
  - **Reduced motion:** skips flights, flips and the ceremony.
  - **No art:** `?art=0`, or any missing file, gives the full vector look.
  - **No WebGL dependency** at all.
- **Download.** 13 textures were repacked at quality 0.66–0.78. The landscape and portrait cuts mean a phone
  downloads only the portrait one.

## 6. Known gaps (from `REVIEW-final.md` and REVIEW-m3)

No **major** gap remains: three successive reviews found none. The final review's medium and minor gaps,
in its order:

1. **Court style (medium-high, the main open item).** The Art Deco set is clean ink-line art with flat fills,
   but the figures carry soft modelling and fade into cream rather than ending in hard colour masses. The
   double-ended split is a horizontal band, and the Q♥ figure sits off to one side, with her hair under her
   index. The settings label now says "Art Deco line art" so it doesn't overclaim.
   - **Next step:** a Codex re-ink of all 12 courts with a solid suit-colour field in a stepped cartouche,
     two-tone faces and a recomposed Q♥, using `c3-ks.png` as the style reference. Then a check that every face
     sits in the middle band of the card.
2. **Win end beat (medium).** It is now a lacquer-and-brass sheet with a gold "You won!", milestone holes and a
   trivia slip. It is still a dialog rather than a ticket lying on the felt, and the punch hole has no
   punch-bite animation or falling chad.
3. **Menu and Stats (medium).** Both are still cream web sheets with line icons and a plain table. Daily tiles
   have card fans and a brass seal when won, but no streak row.
4. **Phone deal height (medium).** Spider's face-down strips grew from about 16 px to about 26 px. The Spider
   deal still ends at about 32% of the screen height and FreeCell at 47%: face-up fans grow only when a column
   is long.
5. **Long desktop columns (minor-medium).** The board may shrink to 80% (Large size: 70%) to keep every rank
   visible. In the four-column K-to-A worst case at Large size, the floor is reached and the Q and J tails
   tuck under the next card; the cap line stays visible.
6. **Desktop toolbar (minor).** It is still a band of five equal buttons, with the score figures at the top
   right.
7. **Index-strip slivers (minor).** Tips of ace medallions and court-frame rules peek out under a few phone
   indices.
8. **Tables (minor).** Quapaw's chevrons are still busy at index scale. Fordyce marble was darkened for card
   contrast (about 3:1) and lost most of its veining.
9. **Title on phones (minor).** Spider and Yukon need one scroll.
10. **Human checks still owed.** Nobody has listened to the audio, used a screen reader, or tried a real
    phone. Frame timings come from headless Chromium on a heavily loaded machine.
12. **Court source PNGs (local only).** Codex's court batch rewrote `art-src/c3-jc.png`, `c3-jh.png` and
    `c3-qs.png` (and possibly `c3-kc.png` and `c3-kd.png`) after they had been packed. The shipped and tested
    `assets/deco-*.webp` files are the earlier versions. The raw PNGs are git-ignored, but re-running `art-pack`
    on this machine would swap those courts for untested variants and leave `court-focus.json` stale. Review the
    new variants before any repack.
11. **Fonts while loading.** Under file:// the first frame can paint with fallback fonts, for up to about
    100 ms, before the bundled faces apply. After that, sprites rebake once.

## 7. New research and sources

- **`research/interiors-1920s.md`**: Fordyce, Arlington, other Row interiors, the gaming clubs, 1920s
  playing-card conventions and period material names. Each line has a URL and is tagged
  confirmed / single-source / observed. Key sources:
  - NPS *Historic Structures Report* and *Historic Furnishings Report* for the Fordyce (npshistory.com). These
    quote the 1915 newspapers word for word.
  - The Bathhouse Row and Central Avenue National Register nominations.
  - HABS AR-28 (Library of Congress).
- **`research/ref-photos/`**: 13 public-domain photos, 12 of them HABS (Jack Boucher, 1984) and 1 by Carol M.
  Highsmith (LOC), each with its rights line. They show the Fordyce bath hall skylight and stalls, the
  assembly-room glass, the Quapaw dome mosaic, and the Maurice, Ozark and Buckstaff interiors.
- **`research/town-content.md` §11** maps the new tables, courts and ceremony to their sources. Invented
  details are labelled as invented.
- **In-game captions corrected**: the skylight back no longer names a glass maker and now says the real glass
  is mostly amber; the Quapaw back says its colours are invented and that the real dome is buff and tan.

### Facts worth adding to the shared `research/` (the corpus currently disagrees)

1. **Fordyce skylight maker.** The 1917 *Ornamental Glass Bulletin* credits **Condie-Bray Glass & Paint Co.,
   St. Louis** with the men's bath hall ceiling light. "Condi-Neal" is named by the NPS only for the assembly
   room and ladies' glass.
2. **Mermaid glass location.** The 1915 sources put the mermaids in the **men's bath hall** skylight, so the
   "[DISPUTED]" flag can be dropped.
3. **Piece count.** Period sources print both "about 8,000" and "about 18,000".
4. **DeSoto fountain.** It was installed **Dec. 1915 – Mar. 1916**, after the opening; the statue is "American
   bisque" on "verdi antique marble".
5. **Quapaw dome colours.** Buff and tan chevrons with gold and blue diamonds, an ochre band and turquoise
   panels (HABS 1984 colour photo). Not cobalt or terra cotta.
6. **Southern Club dark glass.** The 1985 Central Avenue National Register nomination puts the structural-glass
   front in the **1940s**, not 1927.
7. **Maurice glass.** It shows "mythical sea scenes" and water lilies; the maker was Rossbach Art Glass Co.
8. **Fordyce lozenge brick.** Darker brown diamonds in light-yellow brick; only the first storey is cream.
9. **Room naming.** The glass-ceilinged room was the **assembly/palm room** in 1915; today's "Music Room" name
   came later.

Full citations are in `research/interiors-1920s.md` → "Conflicts with shared research".

## 8. Requests

**Shared data.** Apply the nine corrections above to `research/bathhouse-row-and-springs.md`,
`research/visual-style-guide.md` and the trivia bank. hs-0088's "1927" date for the Southern Club glass is
the one shown to players. Also consider copying the 13 HABS photos to a shared `research/ref-photos/`.

**Harness.**
1. **A file:// mode** (`--file-url`). `tools/check-file-url.mjs` caught a bug that the http server cannot:
   `getImageData` on a local image taints the canvas under file://.
2. **A per-frame CPU metric next to `t.fps()`**, such as a page-side `performance.now()` wrapper around the
   game's frame callback, reporting median and p95. On a contended machine rAF fps is noise.
3. **A built-in before/after sheet**: `sheets.mjs --compare <milestoneA>`. See `tools/before-after.mjs`.
4. **A `t.assertOneFramePerRefresh()` check.** This campaign shipped, then caught, a rAF double-scheduling bug.

**LESSONS candidates.**
- Fonts under file:// work only as base64 inside a CSS file.
- Never read pixels of local images at runtime; precompute.
- Guard `startLoop` against re-entry from inside a frame.
- A Codex "frameless, evenly lit" texture plus code lighting fits every aspect ratio.
- Codex can edit an existing painting in place.

## 9. Files

- **New:**
  - `VISUAL-PLAN.md`, `VISUAL-REPORT.md`
  - `tests/visual.test.mjs`
  - `tools/build-fonts.mjs`, `tools/check-file-url.mjs`, `tools/before-after.mjs`
  - `vendor/fonts/` (4 woff2 files and 3 licences)
  - `assets/fonts.css`; new `assets/*.webp`: 12 tex, 1 glow, 5 brass, 12 deco, 1 ticket
  - `art-src/blender/brass.py`, `art-src/court-focus.json`
  - `research/interiors-1920s.md`, `research/ref-photos/`
- **Changed:** `index.html`, `art-src/art.json`, `assets/manifest.json`, `assets/title-hero.webp`,
  `research/town-content.md` (§1 caption note, §7, §10 and the new §11), `PRD.md`, `MECHANICS.md`,
  `SAMPLES.md` (vendored fonts), `REPORT.md`, and the tests listed above.
- **Removed:** `assets/table-*.webp` (5).
- **Git-ignored and kept locally:** `benchmarks/`, `screenshots/`, the raw `art-src/*.png` files and the Blender
  `renders/`.

Nothing is committed.
