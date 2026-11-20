// v3 visual campaign checks: index clearance in fans, phone index size, the first-load budget,
// the low-effects fallback and the court-style setting.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(GAME, 'assets', 'manifest.json'), 'utf8'));
const KB = (n) => (n / 1024).toFixed(0) + ' KB';

// Every face-up step in every column shows the whole rank glyph, and no column runs past the table's bottom edge.
function checkColumns(t, lay, label) {
  for (const id of Object.keys(lay.piles).filter((k) => k[0] === 't')) {
    const cs = lay.piles[id].cards; if (!cs.length) continue;
    const end = cs[cs.length - 1].y + lay.cardH;
    if (end > lay.bottom + .5) t.fail(label + ' ' + id + ': column ends at ' + end.toFixed(1) + ', past the table edge ' + lay.bottom.toFixed(1));
    for (let i = 1; i < cs.length; i++) if (cs[i - 1].up && cs[i].up) {
      // the whole glyph, unless the board is already at its 80% floor: then down to the glyph's cap line
      const step = cs[i].y - cs[i - 1].y, need = lay.fit <= lay.fitFloor + 1e-6 ? lay.idxCap : lay.idxFull;
      if (step < need - .5) t.fail(label + ' ' + id + ': cards ' + (i - 1) + '/' + i + ' step ' + step.toFixed(1) + ' hides the index (' + need.toFixed(1) + ', board scale ' + lay.fit.toFixed(2) + ')');
    }
  }
}

export const tests = [
  {
    name: 'visual-60 fanned columns show every rank glyph',
    async run(t) {
      await baseSettings(t);
      const seen = [];
      for (const cardSize of ['compact', 'standard', 'large']) {
        await t.game('setSettings', { cardSize });
        for (const [mode, o] of [['klondike', {}], ['freecell', {}], ['spider', { suits: 4 }]]) {
          await t.game('newGame', Object.assign({ mode, deal: 5 }, o));
          await t.waitForStable();
          const lay = await t.game('getLayout');
          seen.push(cardSize + '/' + mode + ': step ' + lay.fanUp.toFixed(1) + ' ≥ glyph ' + lay.idxFull.toFixed(1));
          t.expect(lay.fanUp >= lay.idxFull, cardSize + ' ' + mode + ': fan step ' + lay.fanUp.toFixed(1) + ' clears the index (' + lay.idxFull.toFixed(1) + ')');
          // the real spacing on screen, between two face-up cards of a column
          checkColumns(t, lay, cardSize + ' ' + mode);
        }
      }
      // the worst case: a King-to-Ace run in four columns at once, at every card size
      const run = (su) => ['K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2', 'A'].map((r) => r + su);
      for (const cardSize of ['compact', 'standard', 'large']) {
        await t.game('setSettings', { cardSize });
        await t.game('setState', { mode: 'klondike', piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: run('S'), t1: run('H'), t2: run('C'), t3: run('D'), t4: [], t5: [], t6: [] } });
        await t.waitForStable();
        const lay = await t.game('getLayout');
        checkColumns(t, lay, cardSize + ' K-to-A runs');
        t.expect(lay.fit >= lay.fitFloor - 1e-6, cardSize + ': the board never shrinks below its floor (' + lay.fit.toFixed(2) + ' ≥ ' + lay.fitFloor + ')');
        if (cardSize === 'large') await t.shot('visual-60-long-runs');
      }
      t.log(seen.join(' · '));
    },
  },
  {
    name: 'visual-61 phone index is jumbo',
    viewports: ['mobile'],
    async run(t) {
      await baseSettings(t);
      for (const [mode, o] of [['klondike', {}], ['freecell', {}], ['spider', { suits: 2 }]]) {
        await t.game('newGame', Object.assign({ mode, deal: 9 }, o));
        const lay = await t.game('getLayout');
        t.log(mode + ': card ' + lay.cardW + ' px, rank ' + lay.indexPx + ' px (' + Math.round(lay.indexPx / lay.cardW * 100) + '%)');
        t.expect(lay.indexPx >= lay.cardW * .4, mode + ': rank glyph ≥ 40% of the card width');
        t.expect(lay.indexPx >= 15, mode + ': rank glyph ≥ 15 CSS px');
      }
    },
  },
  {
    name: 'visual-62 first-load download budget',
    async run(t) {
      await t.waitForStable();
      const a = await t.game('art');
      const missing = a.wanted.filter((n) => !MANIFEST[n]);
      t.equal(missing, [], 'every first-load request is a packed asset');
      const art = a.wanted.reduce((s, n) => s + (MANIFEST[n] ? MANIFEST[n].bytes : 0), 0);
      const html = fs.statSync(path.join(GAME, 'index.html')).size, fonts = fs.statSync(path.join(GAME, 'assets', 'fonts.css')).size;
      const total = art + html + fonts, all = Object.values(MANIFEST).reduce((s, m) => s + m.bytes, 0);
      t.log('first load: html ' + KB(html) + ' + fonts ' + KB(fonts) + ' + ' + a.wanted.length + ' images ' + KB(art) + ' = ' + KB(total) + '; whole assets folder ' + KB(all + fonts));
      // 1.75 MB first load / 5.0 MB total assets ratified by owner decision OQ-WF1-03 (CD-WF1-07 preserves zero-first-load Painted courts).
      t.expect(total <= 1.75 * 1024 * 1024, 'first load ≤ 1.75 MB (' + KB(total) + ')');
      t.expect(all + fonts <= 5 * 1024 * 1024, 'all assets ≤ 5 MB (' + KB(all + fonts) + ')');
    },
  },
  {
    name: 'visual-63 low-effects mode still plays the full ceremony',
    url: 'index.html?fx=low',
    async run(t) {
      await baseSettings(t);
      t.equal(await t.game('fxLevel'), 'low', 'low effects forced by ?fx=low');
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: [], f0: ['AC', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', 'TC', 'JC', 'QC', 'KC'], f1: ['AD', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D', 'TD', 'JD', 'QD', 'KD'], f2: ['AH', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', 'TH', 'JH', 'QH', 'KH'], f3: ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS', 'JS', 'QS'], t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      await t.game('act', 'move', 't0', 'f3');
      t.expect((await t.game('act', 'ceremonyAt', 2500)).ok, 'ceremony frame');
      await t.shot('visual-63-lowfx-spray');
      await t.game('act', 'unfreeze');
      await t.waitForStable(8000);
      t.equal((await t.state()).scene, 'win', 'win dialog after the ceremony');
    },
  },
  {
    name: 'visual-64 court styles: Art Deco default, painted option',
    async run(t) {
      await baseSettings(t);
      t.equal((await t.state()).settings.courts, 'deco', 'Art Deco courts by default');
      await t.game('newGame', { mode: 'freecell', deal: 1 });
      await t.waitForStable();
      const a1 = await t.game('art');
      t.expect(a1.loaded.includes('deco-ks'), 'Art Deco court art loaded');
      await t.game('setSettings', { courts: 'painted' });
      await t.waitForStable();
      const a2 = await t.game('art');
      t.expect(a2.loaded.includes('court-ks'), 'painted court art loads on demand');
      await t.shot('visual-64-painted-courts');
      await t.reload();
      t.equal((await t.state()).settings.courts, 'painted', 'court style persists');
    },
  },
  {
    name: 'visual-65 W3-B01 opaque 9-slice brass shell, court centering, pip clearance, 5-viewport brassInlay, bounded VFX, & live Title fan repaint',
    async run(t) {
      await baseSettings(t);
      // 1. W6-S4-02: Opaque border-box lacquer + pointer-events:none ::after 9-slice brass-frame.webp on .tile & .sheet-frame (CD-WF3-03)
      await t.game('scene', 'title');
      await t.waitForStable();
      const tileCss = await t.page.evaluate(() => {
        const el = document.querySelector('#tiles .tile'), cs = getComputedStyle(el), af = getComputedStyle(el, '::after');
        return { bgClip: cs.backgroundClip, bgCol: cs.backgroundColor, afPtr: af.pointerEvents, afBi: af.borderImageSource, afSlice: af.borderImageSlice };
      });
      t.equal(tileCss.bgClip, 'border-box', '.tile paints opaque lacquer across full border-box');
      t.expect(tileCss.bgCol !== 'rgba(0, 0, 0, 0)', '.tile has opaque dark lacquer background');
      t.equal(tileCss.afPtr, 'none', '.tile::after 9-slice brass overlay is pointer-events:none');
      t.expect(tileCss.afBi.includes('brass-frame.webp') && tileCss.afSlice.includes('118'), '.tile::after slices brass-frame.webp at 118');

      await t.game('scene', 'settings');
      await t.waitForStable();
      const sheetCss = await t.page.evaluate(() => {
        const fr = document.getElementById('sheetFrame'), sh = document.getElementById('sheet');
        const fcs = getComputedStyle(fr), af = getComputedStyle(fr, '::after'), scs = getComputedStyle(sh);
        return { bgClip: fcs.backgroundClip, bgCol: fcs.backgroundColor, afPtr: af.pointerEvents, afBi: af.borderImageSource, afSlice: af.borderImageSlice, sheetBg: scs.backgroundColor };
      });
      t.equal(sheetCss.bgClip, 'border-box', '.sheet-frame paints opaque lacquer across full border-box');
      t.equal(sheetCss.afPtr, 'none', '.sheet-frame::after 9-slice brass overlay is pointer-events:none');
      t.expect(sheetCss.afBi.includes('brass-frame.webp') && sheetCss.afSlice.includes('118'), '.sheet-frame::after slices brass-frame.webp at 118');
      t.equal(sheetCss.sheetBg, 'rgb(22, 32, 27)', '#sheet preserves opaque dark-lacquer background');

      // 2. W6-P-N04: applyLook() repaints Title mini-card fans immediately on fourColor, courts, back, and deckSeed changes
      await t.game('scene', 'title');
      await t.waitForStable();
      const c0 = await t.game('titleHandsPainted');
      await t.game('scene', 'settings');
      await t.page.locator('#sheet [data-tog="fourColor"]').click();
      const c1 = await t.game('titleHandsPainted');
      t.expect(c1 > c0, 'toggling fourColor on Title repaints Title mini-card fans live (' + c0 + ' -> ' + c1 + ')');
      await t.page.locator('#sheet [data-set="courts"][data-val="painted"]').click();
      const c2 = await t.game('titleHandsPainted');
      t.expect(c2 > c1, 'switching courts on Title repaints Title mini-card fans live (' + c1 + ' -> ' + c2 + ')');
      await t.game('setSettings', { fourColor: false, courts: 'deco', deckSeed: 2026 });
      const c3 = await t.game('titleHandsPainted');
      t.expect(c3 > c2, 'updating deckSeed/settings on Title repaints Title mini-card fans live (' + c2 + ' -> ' + c3 + ')');
      await t.game('scene', 'title');

      // 3. W6-S4-03: 5 right-extreme Deco halves re-centered <= 0.58 + parity with art-src/court-focus.json + >= 4px pip-to-index clearance
      const cfDisk = JSON.parse(fs.readFileSync(path.join(GAME, 'art-src', 'court-focus.json'), 'utf8'));
      const geomStd = await t.game('cardGeometry', 100, 140, false);
      const geomLg = await t.game('cardGeometry', 114, 160, true);
      const geomNar = await t.game('cardGeometry', 64, 90, false);
      t.equal(geomStd.courtFocus, cfDisk, 'COURT_FOCUS matches art-src/court-focus.json 1:1');
      for (const id of ['deco-qh', 'deco-kh', 'deco-ks', 'deco-kd', 'deco-qc']) {
        t.expect(geomStd.courtFocus[id] <= 0.58, id + ' re-centered focusX <= 0.58 (' + geomStd.courtFocus[id] + ')');
      }
      const boxGap = (a, b) => {
        const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w));
        const dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
        return Math.hypot(dx, dy);
      };
      const cases = t.viewport === 'desktop'
        ? [['std-100', geomStd], ['large-114', geomLg], ['narrow-64', geomNar]]
        : [['std-100', geomStd], ['large-114', geomLg]];
      for (const [label, g] of cases) {
        const idxBoxes = [...g.topBoxes, ...g.botBoxes];
        let minGap = 999, worst = '';
        for (let r = 2; r <= 10; r++) {
          for (const p of g.ranks[r]) {
            for (const ib of idxBoxes) {
              const d = boxGap(p, ib);
              if (d < minGap) { minGap = d; worst = label + ' rank ' + r; }
            }
          }
        }
        t.expect(minGap >= 4, label + ': all ranks 2-10 pips clear all corner indices >= 4 px (min ' + minGap.toFixed(1) + ' px at ' + worst + ')');
      }

      // 4. Mobile Card size: Large widens cards and scales index genuinely above Standard (rs 0.52 > 0.46)
      if (t.viewport === 'mobile') {
        await t.game('setSettings', { cardSize: 'standard' });
        await t.game('newGame', { mode: 'klondike', deal: 5 });
        const stdL = await t.game('getLayout');
        await t.game('setSettings', { cardSize: 'large' });
        const lgL = await t.game('getLayout');
        t.expect(lgL.cardW >= stdL.cardW + 2, 'mobile Large widens Klondike cards (' + stdL.cardW + ' -> ' + lgL.cardW + ')');
        t.expect(lgL.indexPx >= stdL.indexPx + 3, 'mobile Large enlarges rank index (' + stdL.indexPx + ' -> ' + lgL.indexPx + ')');
        await t.game('setSettings', { cardSize: 'standard' });
      }

      // 5. W6-S4-05: 5-viewport brassInlay() zero collision with playable cards/slots + bounded dark-haloed VFX pool + ceremony toast flush
      if (t.viewport === 'desktop') {
        const vps = [[390, 844], [844, 390], [768, 1024], [1024, 768], [1280, 800]];
        const hit = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
        for (const [vw, vh] of vps) {
          await t.page.setViewportSize({ width: vw, height: vh });
          for (const [mode, o] of [['klondike', {}], ['freecell', {}], ['spider', { suits: 4 }], ['yukon', {}]]) {
            await t.game('newGame', Object.assign({ mode, deal: 5 }, o));
            await t.waitForStable();
            const im = await t.game('inlayMetrics');
            const lay = await t.game('getLayout');
            const stageTop = await t.page.evaluate(() => document.getElementById('cv').getBoundingClientRect().top);
            const stageLeft = await t.page.evaluate(() => document.getElementById('cv').getBoundingClientRect().left);
            if (Math.min(vw, vh) < 560) {
              t.equal(im.compact, true, vw + 'x' + vh + ' ' + mode + ': compact brass hairline');
              t.equal(im.topChevrons.length, 0, vw + 'x' + vh + ' ' + mode + ': zero 30px top chevrons');
              if (vw > vh) t.equal(im.hasBottomFans, false, vw + 'x' + vh + ' ' + mode + ': phone landscape omits bottom fans');
            }
            for (const chv of im.topChevrons) {
              for (const [pid, pb] of Object.entries(lay.piles)) {
                const pr = { x: pb.x - stageLeft, y: pb.y - stageTop, w: pb.w, h: lay.cardH };
                t.equal(hit(chv, pr), false, vw + 'x' + vh + ' ' + mode + ' ' + pid + ': brass chevron clears playable slot');
              }
            }
          }
        }
        await t.page.setViewportSize(t.vp);

        // Bounded source-over VFX pool & Spider 13-card run coalescing (<=64 sparks, <=8 rings)
        await t.game('setSettings', { motion: 'full' });
        await t.game('setState', {
          mode: 'spider', opts: { suits: 1 },
          piles: {
            stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [],
            t0: ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'],
            t1: ['AS'], t2: ['KH'], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [],
          },
        });
        await t.game('act', 'move', 't1', 't0');
        await t.page.waitForTimeout(700);
        const vc = await t.game('vfxCounts');
        t.equal(vc.composite, 'source-over', 'VFX pool renders source-over (never additive lighter whiteout)');
        t.expect(vc.maxSparks === 64 && vc.maxRings === 8, 'VFX pool caps locked at 64 sparks / 8 rings');
        t.expect(vc.sparks <= 64 && vc.rings <= 8, 'Spider 13-card run stays strictly within bounded pool (' + vc.sparks + '/' + vc.rings + ')');

        // Ceremony start flushes stale toasts cleanly
        await t.game('setState', {
          mode: 'klondike', opts: { draw: 1 },
          piles: {
            stock: [], waste: [],
            f0: ['AC', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', 'TC', 'JC', 'QC', 'KC'],
            f1: ['AD', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D', 'TD', 'JD', 'QD', 'KD'],
            f2: ['AH', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', 'TH', 'JH', 'QH', 'KH'],
            f3: ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS', 'JS', 'QS'],
            t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [],
          },
        });
        await t.page.evaluate(() => { const el = document.getElementById('toast'); el.textContent = 'Stale toast'; el.classList.add('on'); });
        await t.game('act', 'move', 't0', 'f3');
        await t.game('act', 'ceremonyAt', 300);
        const toastOn = await t.page.evaluate(() => document.getElementById('toast').classList.contains('on'));
        t.equal(toastOn, false, 'startCascade() flushes stale #toast cleanly off the rosette');
        await t.game('act', 'unfreeze');
        await t.game('act', 'skip');
      }
    },
  },
];
