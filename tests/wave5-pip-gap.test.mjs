// Wave 5 Batch W5-B02: Large-size 9 & 10 side-column pip vertical separation (W5-F5)
import { baseSettings } from './_util.mjs';

const PIPS_STATE = {
  mode: 'klondike',
  opts: { draw: 1 },
  piles: {
    stock: [], waste: [], f0: [], f1: [], f2: [], f3: [],
    t0: ['9S'], t1: ['TS'], t2: ['9H'], t3: ['TH'], t4: ['9D'], t5: ['TD'], t6: ['9C', 'TC'],
  },
};

function boxGap(a, b) {
  const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w));
  const dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
  return Math.hypot(dx, dy);
}

// Minimum vertical edge-to-edge gap between consecutive pips in the L and R columns (ranks 9 & 10 have 4 per column)
function sideColMinGap(pipBoxes) {
  const cols = new Map();
  for (const p of pipBoxes) {
    const key = Math.round(p.x);
    if (!cols.has(key)) cols.set(key, []);
    cols.get(key).push(p);
  }
  let minGap = 999;
  for (const arr of cols.values()) {
    if (arr.length < 4) continue;
    arr.sort((a, b) => a.y - b.y);
    for (let i = 1; i < arr.length; i++) {
      const gap = arr[i].y - (arr[i - 1].y + arr[i - 1].h);
      if (gap < minGap) minGap = gap;
    }
  }
  return minGap;
}

function minIndexClearance(geom) {
  const idxBoxes = [...geom.topBoxes, ...geom.botBoxes];
  let minGap = 999, worst = '';
  for (let r = 2; r <= 10; r++) {
    for (const p of geom.ranks[r]) {
      for (const ib of idxBoxes) {
        const d = boxGap(p, ib);
        if (d < minGap) { minGap = d; worst = 'rank ' + r; }
      }
    }
  }
  return { minGap, worst };
}

export const tests = [
  {
    name: 'wave5-f5 Large 9 and 10 side-column pips separate cleanly while clearing corner indices and leaving Standard unchanged',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, table: 'felt', cardSize: 'large' });
      await t.game('setState', PIPS_STATE);
      await t.waitForStable();

      // 1. Standard size geometry must remain identical (topF=0.375, spanF=0.365, ps=0.155*w for 9/10)
      const gStd100 = await t.game('cardGeometry', 100, 140, false);
      const std9 = gStd100.ranks[9];
      const stdFirstY = std9[0].y + std9[0].h / 2;
      const stdLastY = std9[std9.length - 1].y + std9[std9.length - 1].h / 2;
      t.expect(Math.abs(stdFirstY - 140 * 0.375) < 0.05, 'Standard 9 top pip center unchanged at 0.375h (got ' + stdFirstY.toFixed(2) + ')');
      t.expect(Math.abs((stdLastY - stdFirstY) - 140 * 0.365) < 0.05, 'Standard 9 vertical span unchanged at 0.365h (got ' + (stdLastY - stdFirstY).toFixed(2) + ')');
      t.expect(Math.abs(std9[0].h - 15.5) < 0.05, 'Standard 9 pip height unchanged at 0.155w (got ' + std9[0].h.toFixed(2) + ')');

      // 2. Large geometry across desktop & landscape phone widths: >= 1.5 px gap at cw=100 (>= 0.015*w) and >= 4 px index clearance
      for (const [w, h, minIdx] of [[100, 140, 4], [114, 160, 4], [120, 168, 4], [69, 96.6, 2.5]]) {
        const g = await t.game('cardGeometry', w, h, true);
        const gap9 = sideColMinGap(g.ranks[9]);
        const gap10 = sideColMinGap(g.ranks[10]);
        const clr = minIndexClearance(g);
        t.log(`Large ${w}x${h}: gap9=${gap9.toFixed(2)}px gap10=${gap10.toFixed(2)}px minIdxGap=${clr.minGap.toFixed(2)}px (${clr.worst})`);
        t.expect(gap9 >= w * 0.015, `Large ${w}x${h} rank 9 side-column pip gap >= ${(w * 0.015).toFixed(2)} px (got ${gap9.toFixed(2)} px)`);
        t.expect(gap10 >= w * 0.015, `Large ${w}x${h} rank 10 side-column pip gap >= ${(w * 0.015).toFixed(2)} px (got ${gap10.toFixed(2)} px)`);
        t.expect(clr.minGap >= minIdx, `Large ${w}x${h} all 2-10 pips clear corner indices >= ${minIdx} px (got ${clr.minGap.toFixed(2)} px at ${clr.worst})`);
      }

      // 3. Rendered canvas pixel check on live Large desktop 9S, TS, 9H, TH, 9D, TD
      const pxCheck = await t.page.evaluate(() => {
        const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
        const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
        const lay = window.__game.getLayout();
        const geom = window.__game.cardGeometry(lay.cardW, lay.cardH, true);
        const isIvory = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) >= 220 && (Math.max(r, g, b) - Math.min(r, g, b)) <= 26;
        const results = {};
        for (const [pid, rank] of [['t0', 9], ['t1', 10], ['t2', 9], ['t3', 10], ['t4', 9], ['t5', 10]]) {
          const card = lay.piles[pid].cards[0];
          const pips = geom.ranks[rank].filter((p) => p.x < lay.cardW * 0.4).sort((a, b) => a.y - b.y); // left column 4 pips
          let minIvoryRows = 999;
          for (let i = 1; i < pips.length; i++) {
            const y0 = Math.floor((card.y - rect.top + pips[i - 1].y + pips[i - 1].h - 1) * k);
            const y1 = Math.ceil((card.y - rect.top + pips[i].y + 1) * k);
            const x0 = Math.round((card.x - rect.left + pips[i].x + pips[i].w * 0.2) * k);
            const x1 = Math.round((card.x - rect.left + pips[i].x + pips[i].w * 0.8) * k);
            const sw = Math.max(2, x1 - x0), sh = Math.max(1, y1 - y0);
            const d = ctx.getImageData(x0, y0, sw, sh).data;
            let ivoryRows = 0;
            for (let row = 0; row < sh; row++) {
              let allIvory = true;
              for (let col = 0; col < sw; col++) {
                const o = (row * sw + col) * 4;
                if (!isIvory(d[o], d[o + 1], d[o + 2])) { allIvory = false; break; }
              }
              if (allIvory) ivoryRows++;
            }
            if (ivoryRows < minIvoryRows) minIvoryRows = ivoryRows;
          }
          results[pid] = { rank, minIvoryCssPx: +(minIvoryRows / k).toFixed(2) };
        }
        return { cardW: lay.cardW, cardH: lay.cardH, results };
      });
      t.log('Rendered Large desktop pip gap rows:', JSON.stringify(pxCheck));
      for (const [pid, info] of Object.entries(pxCheck.results)) {
        t.expect(info.minIvoryCssPx >= 1.5, `${pid} (rank ${info.rank}) shows >= 1.5 CSS px clean ivory gap between side-column pips (got ${info.minIvoryCssPx} px)`);
      }
      await t.shot('wave5-f5-pips-large-desktop');

      // 4. Landscape phone Large (844x390) screenshot & live check
      await t.page.setViewportSize({ width: 844, height: 390 });
      await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await t.waitForStable();
      const landLay = await t.game('getLayout');
      const landGeom = await t.game('cardGeometry', landLay.cardW, landLay.cardH, true);
      const landGap9 = sideColMinGap(landGeom.ranks[9]);
      t.log(`Live 844x390 Large (${landLay.cardW}x${landLay.cardH}): gap9=${landGap9.toFixed(2)}px`);
      t.expect(landGap9 >= landLay.cardW * 0.015, `844x390 Large rank 9 pip gap >= ${(landLay.cardW * 0.015).toFixed(2)} px (got ${landGap9.toFixed(2)} px)`);
      await t.shot('wave5-f5-pips-large-landscape');
      await t.page.setViewportSize(t.vp);
    },
  },
];
