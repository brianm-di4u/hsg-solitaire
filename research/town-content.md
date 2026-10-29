# Spa City Solitaire: town content

Every Hot Springs place, fact, name, color and story this game uses, with its corpus source. The corpus
lives in `research/` at the repo root; links inside it go to the primary sources. Nothing here comes from
new research or from memory. **All hex colors are estimates** (`research/visual-style-guide.md`,
`shared/design/README.md`), so the in-game card backs are labelled "inspired by", never as exact
reproductions.

## 1. Card backs (12)

Each back is drawn in code from a motif recipe in `visual-style-guide.md` → *Motif and pattern library*
and *Architecture by building*. The caption shown in the back picker is in quotes.

| # | Back id | Name in game | What it draws | Colors (est.) | Source |
|---|---|---|---|---|---|
| 1 | `skylight` | Fordyce Skylight | Seeded Voronoi leaded glass in a "sea of blue and green", amber ring, frame of small squares (Motif 4). The seed is the player's deck seed, so every player's deck is unique. Caption: "Inspired by the Fordyce men's bath hall skylight (Condi-Neal Glass, 1914–15)" | `#1F5F6B → #2A9D8F → #7FC8B8 → #2B4C9B`, lead `#2A2A2A`, amber `#D9A23A` | visual-style-guide → Fordyce; Motif 4; trivia hs-0065 |
| 2 | `lozenge` | Fordyce Lozenge | Cream running-bond brick with a diagonal diamond grid (Motif 1). Caption: "Lozenge-patterned brick of the Fordyce's upper stories" | brick `#E6D7B5`, mortar `#CDBF9F`, lozenge `#B89A6A`, terra cotta `#C46A3E` | visual-style-guide → Fordyce; Motif 1 |
| 3 | `quapaw` | Quapaw Dome | Chevron-mosaic dome medallion with a copper cupola over red tile (Motif 2). Caption: "The Quapaw's chevron-mosaic dome (1922). Tile colors are a guess" | cobalt `#2B4C9B`, gold `#D9A23A`, terra cotta `#C46A3E`, green `#4E7D5B`, cream `#E6D7B5`, copper `#B87333`, red tile `#A9432C` | visual-style-guide → Quapaw; Motif 2 |
| 4 | `ironwork` | Row Ironwork | Mirrored wrought-iron C- and S-scrolls with pickets and spear finials on marble (Motif 5). Caption: "Wrought-iron grilles of the Hale and the Administration Building" | iron `#1F2A24`, marble `#F2EFE8`, brass `#C9A23F` | visual-style-guide → Hale, Administration Building; Motif 5 |
| 5 | `paterae` | Superior Medallions | Green paterae rosettes on painted-tile pilasters (Motif 9). Caption: "The Superior's green tile medallions (1916)" | green `#4E7D5B`, body `#E6D7B5`, brick `#B5654A` | visual-style-guide → Superior; Motif 9; trivia hs-0066 |
| 6 | `sculpin` | Scallop & Sculpin | Scallop fans framing small fish (Motif 3). Two variants in one back: gold fish ("original") in the border, white fish ("today") in the center band. Caption: "The Quapaw parapet's sculpin, originally gold, now white" | gold `#D4AF37`, cream `#F3E9D2`, red tile `#A9432C` | visual-style-guide → Quapaw; Motif 3; trivia hs-0084 |
| 7 | `neon` | Neon Night | Neon outline sunburst and diamond on midnight with a faint card-table felt (Motif 15). Caption: "Roaring-era nightlife. The neon colors are invented: club neon is not documented" | midnight `#14121F`, neon red `#FF3B3B`, neon blue `#4FC3FF`, gold `#D4AF37`, felt `#1E5B3A` | visual-style-guide → roaring look, P5; gangster-era-and-gambling → Clubs |
| 8 | `deco` | Medical Arts Deco | Bronze sunburst and stepped setbacks on limestone (Motif 6). Caption: "Art Deco bronze and limestone of the Medical Arts Building (1929–30)" | limestone `#D8CFBD`, bronze `#7C5A2E`, gold `#D4AF37` | visual-style-guide → Medical Arts; Motif 6 |
| 9 | `pines` | Ouachita Pines | Layered shortleaf-pine ridges, novaculite outcrops and creek steam. Caption: "Shortleaf pine on the south slopes of the Ouachitas" | P1: `#1F3324`, `#2F4A2C`, `#5C7A3A`, novaculite `#EDEAE2`, rose `#C99A92` | visual-style-guide → ancient look, P1; fish-and-wildlife → forest |
| 10 | `steam` | Thermal Steam | Tufa terraces in gray with emerald algae fringe and rising steam curls (Motifs 7, 8). Caption: "Thermal water at about 143°F, tufa and blue-green algae" | P2: pool `#1F5F6B`, algae `#2A9D8F` / `#2F8F5B`, tufa `#9A968C` / `#C8C3B6` | visual-style-guide → Thermal water rendering; geography → springs |
| 11 | `lake` | Lake Ouachita Dusk | A dusk sky over a lake with islands and ripple lines. Caption: "Lake Ouachita at dusk. Its roughly 200 islands are numbered for boaters" | P8: lake `#1E4E79`, shallows `#4C8FA8`, sunset gold `#F2A541`, redbud `#B5568F` | visual-style-guide → P8 (lake colors are general knowledge); trivia hs-0127 |
| 12 | `silks` | Racing Silks | A generic jockey-silks pattern: a diamond harlequin field with hoops and a sleeve band. Caption: "Generic racing silks. Horse racing has run in Hot Springs since the 1890s." No track logo or real stable colors | P10 gold `#D4A017`, deco red, cobalt, cream | oaklawn-and-racing → summary (racing since the early 1890s); content rules (no logos) |

The brief's ideas map onto these backs as follows: Fordyce skylight (1), Quapaw dome (3), Row ironwork (4),
Art Deco neon (7 and 8), Ouachita pines (9), steam curls (10), Lake Ouachita at dusk (11) and racing silks (12).
`game-hooks.md` §1 idea 1 suggests one back per bathhouse. This build covers the Fordyce (1, 2), Quapaw
(3, 6), Superior (5) and Hale (4). The Maurice, Buckstaff, Ozark and Lamar appear in the title-screen
skyline instead (§3).

## 2. Tables (5)

| Id | Name | Look | Source |
|---|---|---|---|
| `felt` | Card-Table Felt | Felt `#1E5B3A` with a faint Deco bronze-grille watermark | visual-style-guide → Per-game hooks (A9), P5 felt |
| `linen` | Linen Postcard | Cerulean-to-cyan airbrush gradient with a linen crosshatch and cream border | visual-style-guide → Linen-postcard shader recipe, P6 |
| `pool` | Thermal Pool | A radial pool gradient `#1F5F6B → #2A9D8F` with ripple arcs and a tufa rim | visual-style-guide → Thermal water rendering |
| `marble` | Bathhall Marble | Marble `#F2EFE8` with gray veins `#B9B4AA` and a terra-cotta border | visual-style-guide → Material swatches |
| `midnight` | Midnight Club | Midnight `#14121F` with a dark-glass sheen (Southern Club's dark Pittsburgh glass, 1927) | visual-style-guide → Southern Club; trivia hs-0088 |

## 3. Title-screen skyline

Bathhouse Row drawn north to south as flat polygons, from the *Skyline recipe and row order* table:
Superior (flat, pilasters), Hale (red hip roof, bell gable), Maurice (green tile cap), Fordyce (lozenge band,
red hip), Quapaw (chevron dome, cupola), Ozark (twin three-tier towers), Buckstaff (seven bays), Lamar
(flat parapet). The order and the "Superior northernmost, Lamar southernmost" reading are from
`bathhouse-row-and-springs.md` → *Row overview* (Wikipedia: Bathhouse Row); the visual notes flag the order
as needing a check against an NPS map. Steam curls rise behind the Row.

## 4. Court cards (original archetypes, no real people)

The corpus gives no sources on period dress (00-INDEX corpus-wide gaps), so every costume is invented
flavor, drawn as flat geometric shapes. Following the content rules, no court card depicts or names a real person.

| Rank | Archetype | Drawn as |
|---|---|---|
| Jack | Bath attendant (♠ ♣) / jockey (♥ ♦) | Attendant: white jacket, towel over the shoulder. Jockey: silks cap and diamond-pattern blouse (generic). Bath attendants are first mentioned in records in 1875 (`bathhouse-row-and-springs.md` → Bathing practice) |
| Queen | Promenade lady with a parasol | Wide hat, high collar, parasol. Gilded-era promenaders per `game-hooks.md` §1 idea 7 (adjusted). The parasol look itself is not documented (visual-style-guide → gilded-spa) |
| King | 1920s card-room gentleman | A generic fedora-and-bow-tie silhouette, with no likeness of any gangster or other real person (visual-style-guide → content rules) |

Card faces otherwise stay standard: big corner indices and conventional pip layouts.

## 5. Ace and joker flourishes

- **Ace of spades:** the pip contains a small stepped-setback tower outline, a nod to the Medical Arts
  Building silhouette (`game-hooks.md` §1 idea 10; `downtown-and-landmarks.md` → Tall buildings).
- **Ace of hearts:** a magnolia blossom inside the heart, a nod to the 1890s Magnolia Promenade
  (`bathhouse-row-and-springs.md` → Promenades).
- No jokers are used. None of the games needs one.

## 6. Bath-ticket score card (invented design)

The win screen shows the score on a serrated "bath ticket". The ticket design is invented, because no
historical bath ticket design is documented (`bathhouse-row-and-springs.md` → Bathing practice and prices;
visual-style-guide → Undocumented ephemera). The ticket shows "Course progress: N of 21 baths". Every 21
wins completes a "course", after the 21-bath course of 1920 (NPS 1920 brochure, via
`bathhouse-row-and-springs.md`; trivia hs-0022).

## 7. Win animation

The **tufa cascade**: cards slide off the foundations and tumble down three tufa terraces drawn across the
table, trailing steam curls. It recalls the 1901 diversion of spring water into a cascade and the NPS's 1982
Thermal Water Cascade (`geography-lakes-mountains.md` → Thermal springs; trivia-bank context). With
reduced motion on, the cards fade instead.

## 8. Fact cards on win (from `research/trivia-bank.json`)

The win screen shows one "Did you know?" card: the question, the answer, the one-line explanation, and the
source name. The cards rotate through 52 hand-picked items with `confidence: "confirmed"`, taken
mostly from Places & Landmarks, Nature & Lakes, Legends & Oddities and History. Items about sensitive
history (disease treatment, segregation, violence) and fishing regulations were left out, because a light win
screen is the wrong place for them. The inlined subset is generated from the bank, keeping `id`, `question`,
`answer`, `explanation` and `source`. IDs used:

```
hs-0002 hs-0003 hs-0018 hs-0022 hs-0026 hs-0030 hs-0033 hs-0034 hs-0053 hs-0056
hs-0057 hs-0058 hs-0061 hs-0062 hs-0064 hs-0065 hs-0066 hs-0070 hs-0076 hs-0077
hs-0082 hs-0084 hs-0085 hs-0088 hs-0093 hs-0094 hs-0102 hs-0109 hs-0112 hs-0117
hs-0121 hs-0127 hs-0143 hs-0144 hs-0145 hs-0146 hs-0147 hs-0148 hs-0154 hs-0156
hs-0168 hs-0170 hs-0171 hs-0348 hs-0352 hs-0363 hs-0378 hs-0399 hs-0401 hs-0402
hs-0474 hs-0490
```

Which card appears depends on the deal, so a given daily deal always shows the same fact. Hedges in the
source text, such as "about" and "usually said to have 47", are kept word for word.

## 9. Names used in UI copy

- **Spa City:** the town's nickname, as used across the corpus and in the collection's titles.
- **Valley of Vapors:** the steam nickname, used only in the help text's flavor line
  (visual-style-guide → ancient: "Steam rising off the springs gave the 'Valley of Vapors' nickname").
- **Bathhouse Row** and the eight bathhouse names: places used as setting only.
- **Lake Ouachita, Ouachita Mountains, novaculite:** nature references.
- No business logos or trademarks anywhere. Club names appear only inside quoted trivia facts.

## 10. Gaps and how the game handles them

- The real Quapaw dome tile colors and Maurice inset colors are unknown, so the back captions say "inspired
  by" and "tile colors are a guess".
- Club neon colors, period dress and historical playing cards or bath tickets are undocumented. Their designs
  are invented and labelled as such in Help → About the art.
- Sources disagree on which Fordyce room has the mermaid glass. The skylight back does not name a room for
  the figural glass.
