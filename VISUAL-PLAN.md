# Spa City Solitaire: visual enhancement plan (v3)

Inputs: the `visual-before` run (77/77 passing, every shot inspected), 31 benchmark screenshots of seven titles
(`benchmarks/INDEX.md`: Microsoft Solitaire Collection, MobilityWare, Brainium, Solitaire Grand Harvest,
Solitaire: Decked Out, KPatience, AisleRiot, PySolFC), and an independent adversarial review
(`benchmarks/REVIEW-before.md`). Benchmarks and reviews are git-ignored and stay on this machine.

**Starting score from the review: about 4.9/10 against a benchmark ceiling of about 8.5.** The reviewer put
the theme assets (backs, title painting, bath ticket, sourced facts) above every benchmark. The shell and the
feel are the weak part: a beige web-app HUD, no lift on drag, a static win modal, clipped rank glyphs, a small
mobile index and an empty phone layout.

## 1. Direction: 2D, lit, with 3D-rendered hardware

The game stays a **2D canvas game**. Solitaire is read flat from above. Every benchmark is 2D, and crisp
pixel-aligned cards matter more than a camera. Depth comes from four things:

1. **Light.** Each table is a frameless material texture (landscape and portrait cuts), lit in code by a warm
   overhead lamp, a vignette and, at the Fordyce Bath Hall table, coloured light from the skylight.
2. **3D-rendered brass hardware.** Blender renders the corner fans, the empty-pile inlays, the recycle token
   and the dialog frame (`art-src/blender/brass.py`, procedural, Cycles). Real metal lighting, shipped as small
   WebP sprites.
3. **Card physics.** Arcs, lift, lean, perspective flips, settle and spring-back, sheen, a card-edge lip and
   shadows that grow with height.
4. **Painted art** for the courts, backs and title, made with Codex image generation.

WebGL and three.js were considered and rejected. The canvas path already runs at 60 fps, and lighting this
flat a scene gains nothing from shaders. WebGL would also add a ~600 KB vendor file and a no-WebGL fallback
for no visible gain.

## 2. Milestones and the review gaps they close

| Milestone | Work | Review gaps |
|---|---|---|
| **M1 Shell & table** | Lit tables (seven, two of them new: Fordyce Bath Hall and Quapaw Mosaic); brass corners and slot inlays; dark lacquer HUD and toolbar; three bundled faces (Limelight, Josefin Sans, Libre Bodoni); a lacquer dark mode; ornament fixes (rule through the slot row, Spider stock overrun, steam smudge); one brass focus language | 4, 8, 9, 10, 11, 15, 17, 18 |
| **M2 Cards & readability** | The fan step always clears the index glyph; larger, heavier mobile index; taller phone fans and tighter gutters; full mirrored index with suit; pip-card brass hairline; card-edge lip and two-layer shadows; stack depth on the stock and foundations; **a new flat Art Deco court set** (the painted set stays as a "Painted portraits" option) | 1, 5, 6, 7, 16 |
| **M3 Feel** | Lift, lean and gold rim on drag; settle with overshoot; spring-back on illegal drops; arc flights; perspective flips with sheen; landing glints; a brass hint arrow with a nudge; a dealing flick | 2, 12 |
| **M4 Ceremony & menus** | New win ceremony (cards gather into a Fordyce-skylight rosette, then pour out as a thermal fountain with steam and brass confetti; the bath ticket slides up and is punched); title screen with a full-bleed hero and Deco plaques; themed dialogs with a brass frame; menu as an icon grid | 3, 13, 14 |
| **M5 Performance & close-out** | fps in the busiest scenes, load, memory, download size, low-end fallbacks; `visual-final` run; VISUAL-REPORT.md | — |

After every milestone the tests are updated and run at both viewports, every screenshot is inspected, and the
adversarial reviewer re-scores the fresh shots against the benchmarks.

## 3. Asset list

| Asset | Tool | Notes |
|---|---|---|
| `tex-{felt,marble,pool,midnight,linen,quapaw}-{l,p}` | Codex | Frameless, evenly lit surfaces; the game adds the light. Landscape 1536×1024, portrait 1024×1536 |
| `glow-skylight` | Codex | Blurred coloured light cast by a stained-glass skylight, blended over marble for the Fordyce Bath Hall table. Colours from the HABS photo of the Fordyce men's bath hall skylight (amber and honey border, blue-green centre oval) |
| `court-*` v3 (12 halves) | Codex | Flat Art Deco colour-block with keylines, after the owner's Saks and flapper references (mood only). Twelve distinct personas from 1920s Hot Springs life. A pilot first, then a batch that uses the pilot as its style reference |
| `fx-steam` | Codex | Steam wisps on black, used with additive blending for the stock steam, the drag wisp and the ceremony |
| `brass-corner`, `brass-slot`, `brass-cell`, `brass-recycle`, `brass-frame` | Blender 5.2 (Cycles) | `art-src/blender/brass.py` builds every piece procedurally; renders are packed to WebP |
| Fonts | npm `@fontsource/*` 5.3.0 (OFL) | Vendored in `vendor/fonts/` with their licences; `tools/build-fonts.mjs` inlines them as data URIs in `assets/fonts.css`, because Chrome blocks font files from file:// |

Kept: the 12 painted backs, the title hero and the ace medallion (the reviewer rated them at or above benchmark).
The old framed `table-*` images are retired once every table has a frameless texture.

## 4. Research additions

`research/interiors-1920s.md` (in progress, sourced) and `research/ref-photos/` (public-domain HABS photos,
Library of Congress). Two findings already change the art:
- The **Fordyce men's bath hall skylight** is mostly amber, honey and cream glass around a blue-green oval with
  mermaids and fish (HABS colour photo). The v2 "Fordyce Skylight" back is blue-green throughout, so its caption
  will say it uses the blue-green centre of the skylight, and the new table light uses the true balance.
- The **Quapaw dome** is tan and buff chevron mosaic with an ochre band and turquoise diamond tiles (HABS colour
  photo). The v2 back's caption already says "tile colours are a guess"; the new Quapaw Mosaic table follows the photo.

## 5. Performance plan

- **60 fps on a mid laptop, 30+ fps on phones.** Rendering stays on demand; the loop sleeps when idle. The lit table
  is drawn once per resize into its own canvas. Cards are baked sprites. Moving cards cost one transformed
  `drawImage` plus a shadow. The particle cap is 300 during the ceremony.
- **Fast first paint and progressive loading.** The game is playable with vector art before any image decodes.
  The essential set is the current table cut, the current back, 12 courts, the brass hardware and the fonts.
  Everything else (other tables, backs, ceremony art) loads when it is first needed.
- **Download budget.** First load ≤ 1.5 MB; the whole `assets/` folder ≤ 6 MB.
- **Low-end fallback.** `?art=0` and a missing image both give the vector look. Reduced motion skips flights,
  flips and the ceremony. A frame-time watchdog turns off particles and the skylight glow animation if frames
  run long (more than 24 ms on average).

## 6. Test plan

- All existing tests are kept and updated for the new visuals (77 runs across the two viewports).
- New:
  - **fan clearance:** at every card size and both viewports, the face-up fan step is at least the rank glyph's
    measured height, so J and Q are never clipped (review gap 1);
  - **mobile index:** the index is at least 40 % of the card width on narrow cards;
  - **assets:** every manifest asset decodes, the game asks only for packed files, the budgets in §5 hold, and
    the first frame paints before the art arrives;
  - **frozen-clock frames** for a card in flight, a flip, a drag and the win ceremony (`act('freeze', ms)`), so
    mid-animation shots are deterministic;
  - **performance:** fps while dragging in 4-suit Spider and during the ceremony, at both viewports.
- Zero console errors and zero external requests in every test, from the harness server. A file:// smoke test
  confirms the fonts and images load without a server.
