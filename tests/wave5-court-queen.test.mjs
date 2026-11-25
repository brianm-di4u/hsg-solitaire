// Wave 5 Batch W5-B01: Queen ('Q') descender clears top gilded border of Painted and vector court panels in Large size (W5-F3)
import { baseSettings } from './_util.mjs';

const COURTS_KL = {
  mode: 'klondike',
  opts: { draw: 1 },
  piles: {
    stock: [], waste: [], f0: [], f1: [], f2: [], f3: [],
    t0: ['QH'], t1: ['KH'], t2: ['JH'], t3: ['QS'], t4: ['KS'], t5: ['QD'], t6: ['QC'],
  },
};

const COURTS_SP = {
  mode: 'spider',
  opts: { suits: 4 },
  piles: {
    stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [],
    t0: ['QH'], t1: ['KH'], t2: ['JH'], t3: ['QS'], t4: ['KS'], t5: ['QD'], t6: ['QC'], t7: ['AH'], t8: ['2H'], t9: ['3H'],
  },
};

async function sizeTo(t, w, h) {
  await t.page.setViewportSize({ width: w, height: h });
  await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

async function measureQVsFrame(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('cv'), g = cv.getContext('2d');
    const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
    const lay = window.__game.getLayout();
    const cw = lay.cardW, ch = lay.cardH;
    const isRedInk = (r, gr, b, a) => a > 120 && (r - gr) >= 35 && Math.abs(gr - b) <= 32 && r >= 100;
    const isIvory = (r, gr, b) => (0.299 * r + 0.587 * gr + 0.114 * b) >= 228 && (Math.max(r, gr, b) - Math.min(r, gr, b)) <= 24;

    const cardImg = (pid) => {
      const c = lay.piles[pid].cards[0];
      const pw = Math.round(cw * k), ph = Math.round(ch * k);
      return { pw, ph, d: g.getImageData(Math.round((c.x - rect.left) * k), Math.round((c.y - rect.top) * k), pw, ph).data };
    };

    // Measure court panel top & bottom outer gilded border on KH (no descender below baseline) across center-left x=[0.22..0.50]*cw
    const kh = cardImg('t1');
    const xStart = Math.round(kh.pw * 0.22), xEnd = Math.round(kh.pw * 0.50);
    let frameTop = -1, frameBot = -1;
    const scanStartY = Math.round(kh.ph * 0.26), scanEndY = Math.round(kh.ph * 0.45);
    for (let y = scanStartY; y < scanEndY; y++) {
      let hits = 0;
      for (let x = xStart; x < xEnd; x++) {
        const o = (y * kh.pw + x) * 4;
        if (!isIvory(kh.d[o], kh.d[o + 1], kh.d[o + 2])) hits++;
      }
      if (hits >= Math.max(3, Math.floor((xEnd - xStart) * 0.5))) { frameTop = y / k; break; }
    }
    for (let y = Math.round(kh.ph * 0.98); y >= Math.round(kh.ph * 0.70); y--) {
      let hits = 0;
      for (let x = xStart; x < xEnd; x++) {
        const o = (y * kh.pw + x) * 4;
        if (!isIvory(kh.d[o], kh.d[o + 1], kh.d[o + 2])) hits++;
      }
      if (hits >= Math.max(3, Math.floor((xEnd - xStart) * 0.5))) { frameBot = y / k; break; }
    }

    // Measure lowest red ink pixel of 'Q' on QH in x=[0.06..0.44]*cw up to frameTop+1px (above the inner panel corner suit)
    const qh = cardImg('t0');
    const qx0 = Math.round(qh.pw * 0.06), qx1 = Math.round(qh.pw * 0.44);
    const qMaxY = Math.min(qh.ph, Math.round((frameTop + 1.5) * k));
    let qBottom = -1;
    for (let y = Math.round(qh.ph * 0.15); y < qMaxY; y++) {
      for (let x = qx0; x < qx1; x++) {
        const o = (y * qh.pw + x) * 4;
        if (isRedInk(qh.d[o], qh.d[o + 1], qh.d[o + 2], qh.d[o + 3])) qBottom = y / k;
      }
    }

    return {
      cw, ch,
      frameTop: +frameTop.toFixed(2),
      frameBot: +frameBot.toFixed(2),
      qBottom: +qBottom.toFixed(2),
      gapPx: +(frameTop - qBottom).toFixed(2),
    };
  });
}

export const tests = [
  {
    name: 'wave5-f3 painted court Queen descender clears top gilded border in Large while preserving Standard and bottom edge',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, table: 'felt', courts: 'painted', cardSize: 'standard' });
      await t.game('setState', COURTS_KL);
      await t.waitForStable();
      await t.page.waitForFunction(() => {
        const a = window.__game.art().loaded;
        return a.includes('court-qh') && a.includes('court-kh');
      }, null, { timeout: 15000 });
      await t.waitForStable();

      // Standard desktop baseline (must remain at y = 0.31*h - halfStroke)
      const stdDesk = await measureQVsFrame(t.page);
      const expectedStdTop = stdDesk.ch * 0.31 - Math.max(1, stdDesk.cw * 0.022) / 2;
      t.expect(Math.abs(stdDesk.frameTop - expectedStdTop) <= 1.2, `Painted Standard desktop keeps frame top at 0.31h (${JSON.stringify(stdDesk)})`);
      t.expect(stdDesk.gapPx >= 4, `Painted Standard desktop Q clears frame (${JSON.stringify(stdDesk)})`);

      // Large desktop Klondike
      await t.game('setSettings', { cardSize: 'large' });
      await t.waitForStable();
      const lgDesk = await measureQVsFrame(t.page);
      t.log('Painted Large desktop Klondike:', JSON.stringify(lgDesk));
      t.expect(lgDesk.gapPx >= 1.0, `Painted Large desktop Klondike Q tail clears gilded border by >= 1 px (${JSON.stringify(lgDesk)})`);
      const expectedTallBot = lgDesk.ch * 0.95 + Math.max(1, lgDesk.cw * 0.022) / 2;
      t.expect(Math.abs(lgDesk.frameBot - expectedTallBot) <= 1.5, `Painted Large desktop keeps panel bottom at 0.95h (${JSON.stringify(lgDesk)})`);
      await t.shot('wave5-f3-painted-large-desktop');

      // Large desktop Spider
      await t.game('setState', COURTS_SP);
      await t.waitForStable();
      const lgSpider = await measureQVsFrame(t.page);
      t.log('Painted Large desktop Spider:', JSON.stringify(lgSpider));
      t.expect(lgSpider.gapPx >= 1.0, `Painted Large desktop Spider Q tail clears gilded border by >= 1 px (${JSON.stringify(lgSpider)})`);

      // Large landscape phone (844x390, cw >= 58, non-small)
      await sizeTo(t, 844, 390);
      await t.game('setState', COURTS_KL);
      await t.waitForStable();
      const lgLand = await measureQVsFrame(t.page);
      t.log('Painted Large landscape 844x390:', JSON.stringify(lgLand));
      t.expect(lgLand.gapPx >= 1.0, `Painted Large 844x390 Q tail clears gilded border by >= 1 px (${JSON.stringify(lgLand)})`);

      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
  {
    name: 'wave5-f3 vector fallback court (?art=0) Queen descender clears top gilded border in Large while keeping bottom clearance',
    url: 'index.html?art=0',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, table: 'felt', courts: 'painted', cardSize: 'large' });
      await t.game('setState', COURTS_KL);
      await t.waitForStable();

      const lgVec = await measureQVsFrame(t.page);
      t.log('Vector Large desktop Klondike:', JSON.stringify(lgVec));
      t.expect(lgVec.gapPx >= 1.0, `Vector Large desktop Q tail clears gilded border by >= 1 px (${JSON.stringify(lgVec)})`);
      const expectedVecBot = lgVec.ch * 0.85 + Math.max(1, lgVec.cw * 0.022) / 2;
      t.expect(Math.abs(lgVec.frameBot - expectedVecBot) <= 1.5, `Vector Large desktop keeps panel bottom at 0.85h (${JSON.stringify(lgVec)})`);
      await t.shot('wave5-f3-vector-large-desktop');
    },
  },
];
