// Wave 5 Batch W5-B01: Card index ink placement (W5-F1)
import { baseSettings } from './_util.mjs';

const RANKS_H = ['AH', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', 'TH', 'JH', 'QH', 'KH'];
const RANK_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Place all 13 Heart ranks in FreeCell (t0..t7 = A..8, c0..c3 = 9..Q, f0 = K) so every rank draws unobstructed on one table.
const ALL_HEARTS_FC = {
  mode: 'freecell',
  piles: {
    t0: ['AH'], t1: ['2H'], t2: ['3H'], t3: ['4H'], t4: ['5H'], t5: ['6H'], t6: ['7H'], t7: ['8H'],
    c0: ['9H'], c1: ['TH'], c2: ['JH'], c3: ['QH'],
    f0: ['KH'], f1: [], f2: [], f3: [],
  },
};
const RANK_PILE = [
  ['A', 't0'], ['2', 't1'], ['3', 't2'], ['4', 't3'], ['5', 't4'], ['6', 't5'], ['7', 't6'], ['8', 't7'],
  ['9', 'c0'], ['10', 'c1'], ['J', 'c2'], ['Q', 'c3'], ['K', 'f0'],
];

async function sizeTo(t, w, h) {
  await t.page.setViewportSize({ width: w, height: h });
  await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

export const tests = [
  {
    name: 'wave5-f1 drawn card pixel ink placement across all 13 ranks, court styles, sizes, and viewports',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, table: 'felt', courts: 'deco', cardSize: 'standard' });
      const viewports = [
        [360, 640],
        [390, 844],
        [844, 390],
        [1280, 800],
      ];

      for (const [vw, vh] of viewports) {
        await sizeTo(t, vw, vh);
        for (const courts of ['deco', 'painted']) {
          for (const cardSize of ['standard', 'large']) {
            await t.game('setSettings', { courts, cardSize });
            await t.game('setState', ALL_HEARTS_FC);
            await t.waitForStable();
            // Ensure court art for JH/QH/KH is loaded before pixel inspection
            const pref = courts === 'painted' ? 'court-' : 'deco-';
            await t.page.waitForFunction((p) => {
              const a = window.__game.art().loaded;
              return a.includes(p + 'jh') && a.includes(p + 'qh') && a.includes(p + 'kh');
            }, pref, { timeout: 15000 });
            await t.waitForStable();

            const res = await t.page.evaluate(({ pairs, courtsStyle, sizeName }) => {
              const cv = document.getElementById('cv'), g = cv.getContext('2d');
              const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
              const lay = window.__game.getLayout();
              const cw = lay.cardW, ch = lay.cardH;
              const large = sizeName === 'large';
              const phoneJumbo = cw < 70 && innerWidth < 560;
              const small = cw < 58 || phoneJumbo;
              const geom = window.__game.cardGeometry(cw, ch, large);

              // Red Heart ink (#B3261E) is cleanly separated from ivory stock, card border (#A99D82), and gilded brass.
              const isRedInk = (r, gr, b, a) => a > 120 && (r - gr) >= 35 && Math.abs(gr - b) <= 32 && r >= 100;
              // Keep the top scan band strictly above small cards' large center suit (starts at ~0.454*ch) while covering all rank/suit ink.
              const topBandH = Math.min(Math.ceil(Math.max(lay.idxFull + 1, ch * 0.30)), Math.floor(ch * 0.44));
              const decoBotBandH = Math.ceil(Math.max(lay.idxFull + 1, ch * 0.34));
              const stdBotBandH = Math.ceil(ch * 0.20);

              const findings = [];
              for (const [lab, pid] of pairs) {
                const c = lay.piles[pid].cards[0];
                const cx0 = (c.x - rect.left) * k, cy0 = (c.y - rect.top) * k;
                const pw = Math.round(cw * k), ph = Math.round(ch * k);
                const img = g.getImageData(Math.round(cx0), Math.round(cy0), pw, ph).data;

                // 1. Top corner scan: find all columns x in [0, pw) containing red ink in top index band
                const tyMax = Math.min(ph, Math.ceil(topBandH * k));
                const colHasInk = new Uint8Array(pw);
                for (let x = 0; x < pw; x++) {
                  for (let y = 0; y < tyMax; y++) {
                    const o = (y * pw + x) * 4;
                    if (isRedInk(img[o], img[o + 1], img[o + 2], img[o + 3])) { colHasInk[x] = 1; break; }
                  }
                }
                // Leftmost ink pixel in left 60% of card (rank)
                let topRankLeft = -1, topRankRight = -1;
                const splitX = Math.floor(pw * 0.62);
                for (let x = 0; x < splitX; x++) {
                  if (colHasInk[x]) { if (topRankLeft < 0) topRankLeft = x; topRankRight = x; }
                }
                // Suit ink starts from right side moving left, stopping at first gap
                let suitLeft = -1, suitRight = -1;
                for (let x = pw - 1; x >= 0; x--) {
                  if (colHasInk[x]) { if (suitRight < 0) suitRight = x; suitLeft = x; }
                  else if (suitRight >= 0) break;
                }
                // Walk rank from topRankLeft rightward while checking for gap before suitLeft
                let gapCols = 0;
                if (topRankLeft >= 0 && suitLeft > topRankLeft) {
                  // Find rightmost rank pixel strictly left of suitLeft by scanning from suitLeft-1 leftward until ink
                  let rEnd = -1;
                  for (let x = suitLeft - 1; x >= topRankLeft; x--) {
                    if (colHasInk[x]) { rEnd = x; break; }
                  }
                  if (rEnd >= 0) {
                    topRankRight = rEnd;
                    gapCols = suitLeft - rEnd - 1;
                  }
                }

                const topLeftPct = topRankLeft >= 0 ? (topRankLeft / k) / cw : -1;
                const isCourt = lab === 'J' || lab === 'Q' || lab === 'K';
                // Mirrored corner exists when: !small && (deco court OR non-court)
                const hasMirrored = !small && (courtsStyle === 'deco' || !isCourt);
                let botRightInsetPct = null;
                if (hasMirrored) {
                  const bh = isCourt && courtsStyle === 'deco' ? decoBotBandH : stdBotBandH;
                  const byMin = Math.max(0, ph - Math.ceil(bh * k));
                  let botRankRight = -1;
                  for (let x = pw - 1; x >= Math.floor(pw * 0.4); x--) {
                    let hit = false;
                    for (let y = byMin; y < ph; y++) {
                      const o = (y * pw + x) * 4;
                      if (isRedInk(img[o], img[o + 1], img[o + 2], img[o + 3])) { hit = true; break; }
                    }
                    if (hit) { botRankRight = x; break; }
                  }
                  botRightInsetPct = botRankRight >= 0 ? ((pw - 1 - botRankRight) / k) / cw : -1;
                }

                const minPct = 0.04;
                if (topRankLeft < 0 || topLeftPct < minPct) {
                  findings.push(`${lab} top-left ink at ${(topLeftPct * 100).toFixed(2)}% of cw=${cw} (< 4%)`);
                }
                if (suitLeft < 0 || gapCols < Math.max(1, Math.floor(k * 0.5))) {
                  findings.push(`${lab} touches suit mark (rankRight=${topRankRight}, suitLeft=${suitLeft}, gapCols=${gapCols}, cw=${cw})`);
                }
                if (hasMirrored && (botRightInsetPct == null || botRightInsetPct < minPct)) {
                  findings.push(`${lab} bottom-right mirrored ink at ${(botRightInsetPct * 100).toFixed(2)}% of cw=${cw} (< 4%)`);
                }
                // On desktop Art Deco courts, rank ink must also stay inside the Deco frame (px = 5% of cw)
                if (!small && isCourt && courtsStyle === 'deco') {
                  if (topLeftPct < 0.05) findings.push(`${lab} Deco top-left ink ${(topLeftPct * 100).toFixed(2)}% protrudes past 5% frame`);
                  if (botRightInsetPct < 0.05) findings.push(`${lab} Deco bottom-right ink ${(botRightInsetPct * 100).toFixed(2)}% protrudes past 5% frame`);
                }
              }
              return { cw, ch, small, hasRankInk: !!(geom && geom.rankInk), findings };
            }, { pairs: RANK_PILE, courtsStyle: courts, sizeName: cardSize });

            const tag = `${vw}x${vh} ${courts} ${cardSize} (cw=${res.cw})`;
            t.equal(res.findings, [], `${tag}: all 13 ranks clear >=4% edge, stay inside Deco frame, and clear suit mark`);
            t.equal(res.hasRankInk, true, `${tag}: __game.cardGeometry exposes rankInk`);

            if ((vw === 390 && vh === 844 && courts === 'deco' && cardSize === 'large') ||
                (vw === 1280 && vh === 800 && courts === 'deco' && cardSize === 'standard')) {
              await t.shot(`wave5-f1-${vw}x${vh}-${courts}-${cardSize}`);
            }
          }
        }
      }

      // Check __game.cardGeometry per-rank ink boxes & minimal shift invariants (preserving existing fields)
      await sizeTo(t, 1280, 800);
      await t.game('setSettings', { courts: 'deco', cardSize: 'standard' });
      const geomCheck = await t.page.evaluate((labels) => {
        const g100 = window.__game.cardGeometry(100, 140, false);
        const g118 = window.__game.cardGeometry(118, 165, true);
        const existingKeys = ['w', 'h', 'large', 'topBoxes', 'botBoxes', 'ranks', 'courtFocus'].every((k) => k in g100);
        const nonOverhang = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Q', 'K'];
        const badShifts = [];
        for (const [name, g] of [['std100', g100], ['lg118', g118]]) {
          if (!g.rankInk) { badShifts.push(name + ': missing rankInk'); continue; }
          for (const lab of labels) {
            const b = g.rankInk[lab];
            if (!b || !b.top || !b.bot) { badShifts.push(name + ' ' + lab + ': missing box'); continue; }
            if (b.top.x < g.w * 0.06 - 0.05) badShifts.push(`${name} ${lab}: top inkLeft ${b.top.x.toFixed(2)} < inset ${(g.w * 0.06).toFixed(2)}`);
            if (nonOverhang.includes(lab) && b.top.shift > 0.6) badShifts.push(`${name} ${lab}: shift ${b.top.shift.toFixed(2)} > 0.6px`);
            if (lab === 'A' && b.top.shift > 1.1) badShifts.push(`${name} A: shift ${b.top.shift.toFixed(2)} > 1.1px`);
            if (lab === 'J' && b.top.shift < 2.0) badShifts.push(`${name} J: shift ${b.top.shift.toFixed(2)} too small to correct overhang`);
          }
        }
        return { existingKeys, badShifts, jStd: g100.rankInk && g100.rankInk.J, aStd: g100.rankInk && g100.rankInk.A };
      }, RANK_LABELS);
      t.equal(geomCheck.existingKeys, true, 'cardGeometry preserves all existing fields');
      t.equal(geomCheck.badShifts, [], 'cardGeometry rankInk shifts and insets satisfy bounds');
      t.log('cardGeometry J@100:', JSON.stringify(geomCheck.jStd), 'A@100:', JSON.stringify(geomCheck.aStd));

      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
];
