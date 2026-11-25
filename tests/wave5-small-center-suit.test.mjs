// Wave 5 Batch W5-B02: Small-card 2-10 center suit and Ace medallion clear portrait fanUp (W5-F6)
import { baseSettings } from './_util.mjs';

async function sizeTo(t, w, h) {
  await t.page.setViewportSize({ width: w, height: h });
  await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// Column setup with buried 2-10 & Aces in t0..t3 (each overlapped at fanUp by a card below) and unburied references in t4..t6
const BURIED_KL = {
  mode: 'klondike',
  opts: { draw: 1 },
  piles: {
    stock: [], waste: [], f0: [], f1: [], f2: [], f3: [],
    t0: ['2H', '5D', '8S', '4C'],
    t1: ['9H', 'TC', '6D', '3S'],
    t2: ['AH', 'AS', 'AD', '7C'],
    t3: ['AC', '7H', '9S', '2D'],
    t4: ['2H'],
    t5: ['8S'],
    t6: ['AH'],
  },
};

const BURIED_SP = {
  mode: 'spider',
  opts: { suits: 4 },
  piles: {
    stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [],
    t0: ['2H', '5D', '4C'],
    t1: ['9H', 'TC', '3S'],
    t2: ['AH', 'AS', '7C'],
    t3: ['AC', '8S', '2D'],
    t4: ['2H'], t5: ['5D'], t6: ['8S'], t7: ['9C'], t8: ['AH'], t9: ['AS'],
  },
};

async function measureBuriedAndUnburied(page, buriedPairs, unburiedPids) {
  return page.evaluate(({ buriedPairs, unburiedPids }) => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
    const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
    const lay = window.__game.getLayout(), st = window.__game.getState();
    const cw = lay.cardW, ch = lay.cardH;

    // 1. Check seam strip 2.5px..0.5px above the overlapping card on buried cards (middle 56% of card width)
    const seams = [];
    for (const [pid, idx] of buriedPairs) {
      const c = lay.piles[pid].cards[idx], nxt = lay.piles[pid].cards[idx + 1];
      const sx = Math.round((c.x - rect.left + cw * 0.22) * k);
      const sw = Math.max(4, Math.round(cw * 0.56 * k));
      const sy = Math.round((nxt.y - rect.top - 2.5) * k);
      const sh = Math.max(3, Math.round(2.0 * k));
      const d = ctx.getImageData(sx, sy, sw, sh).data;
      let minLum = 255, maxChroma = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const chm = Math.max(r, g, b) - Math.min(r, g, b);
        if (lum < minLum) minLum = lum;
        if (chm > maxChroma) maxChroma = chm;
      }
      seams.push({ pid, idx, card: st.piles[pid][idx], step: +(nxt.y - c.y).toFixed(2), minLum: +minLum.toFixed(1), maxChroma });
    }

    // 2. Measure actual rendered top & bottom y of the center suit/medallion on unburied cards
    // Scan middle x=[0.28..0.72]*cw starting below top index (y >= idxFull + 1) down to inner border (ch - 2.5)
    const artBounds = [];
    const isIvory = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) >= 218 && (Math.max(r, g, b) - Math.min(r, g, b)) <= 26;
    for (const pid of unburiedPids) {
      const c = lay.piles[pid].cards[0];
      const sx = Math.round((c.x - rect.left + cw * 0.28) * k);
      const sw = Math.max(4, Math.round(cw * 0.44 * k));
      const yStart = Math.ceil((c.y - rect.top + lay.idxFull + 1.0) * k);
      const yEnd = Math.floor((c.y - rect.top + ch - Math.max(2, cw * 0.04)) * k);
      const sh = Math.max(1, yEnd - yStart);
      const d = ctx.getImageData(sx, yStart, sw, sh).data;
      let topRow = -1, botRow = -1;
      for (let row = 0; row < sh; row++) {
        let nonIvory = 0;
        for (let col = 0; col < sw; col++) {
          const o = (row * sw + col) * 4;
          if (!isIvory(d[o], d[o + 1], d[o + 2])) nonIvory++;
        }
        if (nonIvory >= 2) {
          if (topRow < 0) topRow = row;
          botRow = row;
        }
      }
      const artTop = topRow >= 0 ? (yStart + topRow) / k - (c.y - rect.top) : -1;
      const artBot = botRow >= 0 ? (yStart + botRow) / k - (c.y - rect.top) : -1;
      artBounds.push({
        pid,
        card: st.piles[pid][0],
        artTop: +artTop.toFixed(2),
        artBot: +artBot.toFixed(2),
        clearBelowFanUp: +(artTop - lay.fanUp).toFixed(2),
        bottomMargin: +(ch - artBot).toFixed(2),
      });
    }

    return { cardW: cw, cardH: ch, fanUp: +lay.fanUp.toFixed(2), idxFull: +lay.idxFull.toFixed(2), seams, artBounds };
  }, { buriedPairs, unburiedPids });
}

export const tests = [
  {
    name: 'wave5-f6 small-card 2-10 center suit and Ace medallion clear portrait fanUp with margin across Standard, Large, Klondike, and Spider',
    viewports: ['mobile'],
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, table: 'felt', cardSize: 'standard' });

      const klPairs = [['t0', 0], ['t0', 1], ['t0', 2], ['t1', 0], ['t1', 1], ['t1', 2], ['t2', 0], ['t2', 1], ['t2', 2], ['t3', 0], ['t3', 1]];
      const spPairs = [['t0', 0], ['t0', 1], ['t1', 0], ['t1', 1], ['t2', 0], ['t2', 1], ['t3', 0], ['t3', 1]];

      const configs = [
        ['390x844', 390, 844, 'standard', 'klondike', BURIED_KL, klPairs, ['t4', 't5', 't6'], 'wave5-f6-small-center-std'],
        ['390x844', 390, 844, 'large', 'klondike', BURIED_KL, klPairs, ['t4', 't5', 't6'], 'wave5-f6-small-center-large'],
        ['390x844', 390, 844, 'large', 'spider', BURIED_SP, spPairs, ['t4', 't5', 't6', 't7', 't8', 't9'], 'wave5-f6-small-spider-large'],
        ['360x640', 360, 640, 'standard', 'klondike', BURIED_KL, klPairs, ['t4', 't5', 't6'], null],
        ['360x640', 360, 640, 'large', 'klondike', BURIED_KL, klPairs, ['t4', 't5', 't6'], null],
      ];

      for (const [vpLbl, vw, vh, cardSize, mode, state, pairs, unburied, shotName] of configs) {
        await sizeTo(t, vw, vh);
        await t.game('setSettings', { cardSize });
        await t.game('setState', state);
        await t.waitForStable();
        await t.page.waitForFunction(() => window.__game.art().loaded.includes('ace-medallion'), null, { timeout: 15000 });
        await t.waitForStable();

        const m = await measureBuriedAndUnburied(t.page, pairs, unburied);
        const tag = `${vpLbl} ${mode} ${cardSize} (${m.cardW}x${m.cardH}, fanUp=${m.fanUp})`;
        t.log(tag, 'artBounds:', JSON.stringify(m.artBounds));

        // Every buried 2-10 and Ace card leaves a clean ivory seam immediately above the overlapping card
        for (const s of m.seams) {
          t.expect(s.minLum >= 185 && s.maxChroma <= 34, `${tag} buried ${s.card} (${s.pid}[${s.idx}]) has clean ivory seam above overlap: ${JSON.stringify(s)}`);
        }

        // Every unburied 2-10 center suit and Ace medallion starts strictly below portrait fanUp with margin and stays inside card bottom
        for (const b of m.artBounds) {
          t.expect(b.artTop > 0, `${tag} ${b.card} rendered center art (${JSON.stringify(b)})`);
          t.expect(b.clearBelowFanUp >= 1.0, `${tag} ${b.card} center art starts >= 1 px below fanUp (artTop=${b.artTop}, fanUp=${m.fanUp}, clear=${b.clearBelowFanUp})`);
          t.expect(b.bottomMargin >= Math.max(1.5, m.cardW * 0.035), `${tag} ${b.card} stays cleanly inside card bottom (margin=${b.bottomMargin} px)`);
        }

        // Check geometry hook if smallCenter is exposed
        const geom = await t.game('cardGeometry', m.cardW, m.cardH, cardSize === 'large');
        if (geom.smallCenter) {
          const refFan = m.cardH * (cardSize === 'large' ? 0.48 : 0.46);
          t.expect(geom.smallCenter.suitTop >= refFan + 1.0, `${tag} smallCenter.suitTop (${geom.smallCenter.suitTop.toFixed(2)}) >= fanUp+1 (${(refFan + 1).toFixed(2)})`);
          t.expect(geom.smallCenter.aceTop >= refFan + 0.8, `${tag} smallCenter.aceTop (${geom.smallCenter.aceTop.toFixed(2)}) >= fanUp+0.8 (${(refFan + 0.8).toFixed(2)})`);
        }

        if (shotName) await t.shot(shotName);
      }

      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
];
