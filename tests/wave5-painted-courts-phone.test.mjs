// Wave 5 Batch W5-B02: Small-card Painted courts render one upright portrait without center band (W5-F7 / OD-W5-PAINTED)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const GAME_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALL_12 = ['JC', 'JD', 'JH', 'JS', 'QC', 'QD', 'QH', 'QS', 'KC', 'KD', 'KH', 'KS'];
const ALL_12_ART = ALL_12.map((c) => 'court-' + c.toLowerCase());

async function sizeTo(t, w, h) {
  await t.page.setViewportSize({ width: w, height: h });
  await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

function makeKlondikeBatch(cards) {
  const piles = { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };
  cards.forEach((c, i) => { piles['t' + i] = [c]; });
  return { mode: 'klondike', opts: { draw: 1 }, piles };
}

function makeSpiderBatch(cards) {
  const piles = { stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [] };
  for (let i = 0; i < 10; i++) piles['t' + i] = cards[i] ? [cards[i]] : [];
  return { mode: 'spider', opts: { suits: 4 }, piles };
}

// Measure 180-degree rotational symmetry inside the painted court panel on #cv:
// Double-headed panels (top half + 180-deg rotated bottom half) have tiny symDiff (< 15);
// Single upright portraits (head at top, torso/shoulders at bottom) have large symDiff (>= 28).
// Also checks that no edge strip inside the panel is an empty cream void (#F4EDE0).
async function inspectPaintedPanels(page, pids, isSmall) {
  return page.evaluate(({ pids, isSmall }) => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
    const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
    const lay = window.__game.getLayout(), st = window.__game.getState();
    const cw = lay.cardW, ch = lay.cardH;
    const out = [];

    for (const pid of pids) {
      const card = lay.piles[pid].cards[0];
      if (!card) continue;
      // Interior of court panel inset symmetrically around the panel's exact vertical & horizontal center
      const panelY = isSmall ? Math.max(ch * 0.485, lay.idxFull + ch * 0.025) : ch * 0.31;
      const panelH = isSmall ? Math.max(ch * 0.44, ch - panelY - ch * 0.04) : ch * 0.64;
      const px0 = isSmall ? cw * 0.14 : cw * 0.12;
      const px1 = isSmall ? cw * 0.86 : cw * 0.88;
      const py0 = panelY + panelH * 0.07;
      const py1 = panelY + panelH * 0.93;
      const sx = Math.round((card.x - rect.left + px0) * k);
      const sy = Math.round((card.y - rect.top + py0) * k);
      const sw = Math.max(8, Math.round((px1 - px0) * k));
      const sh = Math.max(8, Math.round((py1 - py0) * k));
      const d = ctx.getImageData(sx, sy, sw, sh).data;

      // 180-deg rotational difference between upper and lower halves (skipping middle 10% band).
      // Search +-1 px shift to absorb 0.5 px subpixel rounding on odd-height desktop cards while single upright portraits remain >> 30.
      const halfH = Math.floor(sh * 0.40);
      let symDiff = 999;
      for (const oy of [-1, 0, 1]) {
        for (const ox of [-1, 0, 1]) {
          let diffSum = 0, diffN = 0;
          for (let y = 1; y < halfH; y++) {
            const my = sh - 1 - y + oy;
            if (my < 0 || my >= sh) continue;
            for (let x = 1; x < sw - 1; x++) {
              const mx = sw - 1 - x + ox;
              if (mx < 0 || mx >= sw) continue;
              const o1 = (y * sw + x) * 4, o2 = (my * sw + mx) * 4;
              diffSum += (Math.abs(d[o1] - d[o2]) + Math.abs(d[o1 + 1] - d[o2 + 1]) + Math.abs(d[o1 + 2] - d[o2 + 2])) / 3;
              diffN++;
            }
          }
          if (diffN) symDiff = Math.min(symDiff, +(diffSum / diffN).toFixed(1));
        }
      }

      // Check for flat cream void (#F4EDE0 = 244,237,224) along left/right/top/bottom 1px interior edges
      const isVoidStrip = (coords) => {
        let voidPx = 0;
        for (const [x, y] of coords) {
          const o = (y * sw + x) * 4;
          if (Math.abs(d[o] - 244) <= 4 && Math.abs(d[o + 1] - 237) <= 4 && Math.abs(d[o + 2] - 224) <= 4) voidPx++;
        }
        return voidPx / coords.length;
      };
      const topStrip = Array.from({ length: sw }, (_, x) => [x, 0]);
      const botStrip = Array.from({ length: sw }, (_, x) => [x, sh - 1]);
      const leftStrip = Array.from({ length: sh }, (_, y) => [0, y]);
      const rightStrip = Array.from({ length: sh }, (_, y) => [sw - 1, y]);
      const maxVoidEdge = +Math.max(
        isVoidStrip(topStrip), isVoidStrip(botStrip), isVoidStrip(leftStrip), isVoidStrip(rightStrip)
      ).toFixed(2);

      out.push({ pid, card: st.piles[pid][0], cw, ch, symDiff, maxVoidEdge });
    }
    return out;
  }, { pids, isSmall });
}

// Capture individual card bitmap dataURLs from #cv so we can assemble a crisp labelled contact sheet of all 12
async function captureCardsFromCanvas(page, pids) {
  return page.evaluate((pids) => {
    const cv = document.getElementById('cv');
    const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
    const lay = window.__game.getLayout(), st = window.__game.getState();
    const out = [];
    for (const pid of pids) {
      const card = lay.piles[pid].cards[0];
      if (!card) continue;
      const sx = Math.round((card.x - rect.left) * k);
      const sy = Math.round((card.y - rect.top) * k);
      const sw = Math.round(lay.cardW * k), sh = Math.round(lay.cardH * k);
      const tmp = document.createElement('canvas');
      tmp.width = sw; tmp.height = sh;
      tmp.getContext('2d').drawImage(cv, sx, sy, sw, sh, 0, 0, sw, sh);
      out.push({ card: st.piles[pid][0], cw: lay.cardW, ch: lay.cardH, dataUrl: tmp.toDataURL('image/png') });
    }
    return out;
  }, pids);
}

export const tests = [
  {
    name: 'wave5-f7 small phone Painted courts render one upright portrait without center band and save 12-card contact sheet',
    viewports: ['mobile'],
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, table: 'felt', courts: 'painted', cardSize: 'standard' });
      await t.game('setState', makeKlondikeBatch(ALL_12.slice(0, 6)));
      await t.waitForStable();
      await t.page.waitForFunction((names) => {
        const loaded = window.__game.art().loaded;
        return names.every((n) => loaded.includes(n));
      }, ALL_12_ART, { timeout: 15000 });
      await t.waitForStable();

      const sheetRows = [];
      const rowSpecs = [
        { label: '390x844 Klondike Std', vw: 390, vh: 844, cardSize: 'standard', mode: 'klondike' },
        { label: '390x844 Klondike Large', vw: 390, vh: 844, cardSize: 'large', mode: 'klondike' },
        { label: '390x844 Spider Std', vw: 390, vh: 844, cardSize: 'standard', mode: 'spider' },
        { label: '390x844 Spider Large', vw: 390, vh: 844, cardSize: 'large', mode: 'spider' },
        { label: '360x640 Klondike Std', vw: 360, vh: 640, cardSize: 'standard', mode: 'klondike' },
        { label: '360x640 Spider Std', vw: 360, vh: 640, cardSize: 'standard', mode: 'spider' },
      ];

      for (const spec of rowSpecs) {
        await sizeTo(t, spec.vw, spec.vh);
        await t.game('setSettings', { cardSize: spec.cardSize });
        const rowCaptures = [];

        const batches = spec.mode === 'klondike'
          ? [ALL_12.slice(0, 6), ALL_12.slice(6, 12)]
          : [ALL_12.slice(0, 10), ALL_12.slice(10, 12)];

        for (const batch of batches) {
          const state = spec.mode === 'klondike' ? makeKlondikeBatch(batch) : makeSpiderBatch(batch);
          const pids = batch.map((_, i) => 't' + i);
          await t.game('setState', state);
          await t.waitForStable();

          const stats = await inspectPaintedPanels(t.page, pids, true);
          for (const s of stats) {
            t.expect(s.symDiff >= 26, `${spec.label} ${s.card} (${s.cw}x${s.ch}) renders single upright portrait, not double-headed (symDiff=${s.symDiff})`);
            t.expect(s.maxVoidEdge < 0.92, `${spec.label} ${s.card} has no flat cream void edge strip (maxVoidEdge=${s.maxVoidEdge})`);
          }
          const caps = await captureCardsFromCanvas(t.page, pids);
          rowCaptures.push(...caps);
        }

        const cw = rowCaptures[0].cw, ch = rowCaptures[0].ch;
        t.log(`${spec.label}: cw=${cw}, ch=${ch} — all 12 single upright portrait`);
        sheetRows.push({ label: `${spec.label} (${cw}x${ch})`, cards: rowCaptures });
      }

      // Assemble and save a crisp labelled contact sheet of all 12 painted courts across all 6 phone rows
      const a = process.argv;
      const mi = a.indexOf('--milestone');
      const milestone = mi >= 0 ? a[mi + 1] : 'latest';
      const outDir = path.join(GAME_DIR, 'screenshots', milestone, t.viewport);
      fs.mkdirSync(outDir, { recursive: true });
      const sheetDataUrl = await t.page.evaluate(async (rows) => {
        const scale = 2.2, padX = 10, padY = 14, labelW = 190, headerH = 34;
        const maxCw = Math.max(...rows.map((r) => r.cards[0].cw));
        const maxCh = Math.max(...rows.map((r) => r.cards[0].ch));
        const cellW = Math.ceil(maxCw * scale) + padX;
        const rowH = Math.ceil(maxCh * scale) + padY + 14;
        const W = labelW + 12 * cellW + 16;
        const H = headerH + rows.length * rowH + 16;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.fillStyle = '#18241E'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#F3DA92'; g.font = 'bold 16px sans-serif';
        g.fillText('Wave 5 W5-F7: All 12 Painted Courts at Phone Sizes (2.2x)', 14, 23);

        const load = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
        for (let ri = 0; ri < rows.length; ri++) {
          const row = rows[ri], y0 = headerH + ri * rowH;
          g.fillStyle = '#E8DFC9'; g.font = 'bold 12px sans-serif';
          g.fillText(row.label, 12, y0 + rowH * 0.45);
          for (let ci = 0; ci < row.cards.length; ci++) {
            const item = row.cards[ci], im = await load(item.dataUrl);
            const dw = Math.round(item.cw * scale), dh = Math.round(item.ch * scale);
            const x = labelW + ci * cellW;
            g.imageSmoothingEnabled = false;
            g.drawImage(im, x, y0, dw, dh);
            g.fillStyle = '#C9C2B2'; g.font = '11px monospace';
            g.fillText(item.card, x + 2, y0 + dh + 12);
          }
        }
        return c.toDataURL('image/png');
      }, sheetRows);
      const b64 = sheetDataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.join(outDir, 'wave5-f7-painted-contact-sheet.png'), Buffer.from(b64, 'base64'));

      // Also verify buried painted courts on mobile Large clear fanUp cleanly (zero peeking frame sliver)
      await sizeTo(t, 390, 844);
      await t.game('setSettings', { cardSize: 'large', courts: 'painted' });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: {
          stock: [], waste: [], f0: [], f1: [], f2: [], f3: [],
          t0: ['JH', 'QD', 'KS'], t1: ['QC', 'KH', 'JS'], t2: ['JC', 'QH', 'KD'],
          t3: ['JD', 'QS', 'KC'], t4: ['JH'], t5: ['QD'], t6: ['KS'],
        },
      });
      await t.waitForStable();
      const buriedCheck = await t.page.evaluate(() => {
        const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
        const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
        const lay = window.__game.getLayout(), st = window.__game.getState();
        const out = [];
        for (const [pid, idx] of [['t0', 0], ['t0', 1], ['t1', 0], ['t1', 1], ['t2', 0], ['t3', 0]]) {
          const c = lay.piles[pid].cards[idx], nxt = lay.piles[pid].cards[idx + 1];
          const sx = Math.round((c.x - rect.left + lay.cardW * 0.22) * k);
          const sw = Math.max(4, Math.round(lay.cardW * 0.56 * k));
          const sy = Math.round((nxt.y - rect.top - 2.5) * k);
          const sh = Math.max(3, Math.round(2.0 * k));
          const d = ctx.getImageData(sx, sy, sw, sh).data;
          let minLum = 255, maxChroma = 0;
          for (let i = 0; i < d.length; i += 4) {
            const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const chm = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
            if (lum < minLum) minLum = lum;
            if (chm > maxChroma) maxChroma = chm;
          }
          out.push({ card: st.piles[pid][idx], minLum: +minLum.toFixed(1), maxChroma });
        }
        return out;
      });
      for (const b of buriedCheck) {
        t.expect(b.minLum >= 185 && b.maxChroma <= 34, `buried phone Large painted ${b.card} leaves clean ivory seam above fanUp: ${JSON.stringify(b)}`);
      }
      await t.shot('wave5-f7-painted-phone-large');

      // Title hands follow small painted courts cleanly
      await t.game('scene', 'title');
      await t.waitForStable();
      await t.shot('wave5-f7-title-hands-painted-mobile');
      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
  {
    name: 'wave5-f7 desktop (non-small) Painted courts remain double-headed with center band unchanged',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, table: 'felt', courts: 'painted', cardSize: 'standard' });
      await t.game('setState', makeKlondikeBatch(['JH', 'QH', 'KH', 'JS', 'QS', 'KS']));
      await t.waitForStable();
      await t.page.waitForFunction(() => {
        const a = window.__game.art().loaded;
        return ['court-jh', 'court-qh', 'court-kh', 'court-js', 'court-qs', 'court-ks'].every((n) => a.includes(n));
      }, null, { timeout: 15000 });
      await t.waitForStable();

      const deskStats = await inspectPaintedPanels(t.page, ['t0', 't1', 't2', 't3', 't4', 't5'], false);
      t.log('Desktop non-small Painted courts:', JSON.stringify(deskStats));
      for (const s of deskStats) {
        t.expect(s.symDiff <= 18, `Desktop ${s.card} (${s.cw}x${s.ch}) remains double-headed 180-deg symmetric (symDiff=${s.symDiff})`);
      }
      await t.shot('wave5-f7-painted-desktop-unchanged');
    },
  },
];
