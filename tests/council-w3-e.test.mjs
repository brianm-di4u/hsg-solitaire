// Council wave 3, batch E: sound, layout and accessibility, world, words and ceremony
// (S5-08, S6-08, S4-01, S4-07, S4-23, S2-03, S2-20, S2-04, S4-08).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const SHOTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '_council', 'hsg-solitaire', 'wave-3', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };
const EMPTY_K = { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };

export const tests = [
  {
    name: 'w3e S5-08 Draw 3 flips once per card, Draw 1 once, and the stock hint chimes',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false });
      const deal = (draw) => t.game('setState', { mode: 'klondike', opts: { draw }, piles: Object.assign({}, EMPTY_K, { stock: ['2C', '3C', '4C', '5C', '6C'], t0: ['9S'] }) });
      const flips = async () => (await t.game('cuesPlayed', true)).filter((c) => c.name === 'flip');
      await deal(3); await t.game('cuesPlayed', true);
      await t.game('act', 'draw');
      let f = await flips();
      t.equal(f.length, 3, 'Draw 3 sounds three flips');
      t.equal(f.map((c) => Math.round(c.wait * 1000)), [0, 45, 90], 'they come 45 ms apart');
      await t.waitForStable();
      await deal(1); await t.game('cuesPlayed', true);
      await t.game('act', 'draw');
      f = await flips();
      t.equal(f.length, 1, 'Draw 1 sounds one flip');
      // the last draw of a short stock flips only the cards there are
      await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: Object.assign({}, EMPTY_K, { stock: ['2C', '3C'], t0: ['9S'] }) });
      await t.game('cuesPlayed', true); await t.game('act', 'draw');
      t.equal((await flips()).length, 2, 'two cards left: two flips');
      // the stock hint: a chime
      await t.waitForStable();
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { stock: ['AH'], t0: ['9S'], t1: ['KD'] }) });
      await t.game('cuesPlayed', true); await t.game('act', 'hint');
      const names = (await t.game('cuesPlayed')).map((c) => c.name);
      t.expect(names.includes('hint'), 'the hint toward the stock chimes: ' + names.join());
    },
  },
  {
    name: 'w3e S6-08 on a short screen on its side every game has its Play chips above the fold',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { sound: false, tips: false });
      for (const [w, h, name] of [[844, 390, 'phone'], [667, 375, 'small-phone'], [1280, 600, 'laptop']]) {
        await t.page.setViewportSize({ width: w, height: h });
        await t.game('scene', 'title'); await t.waitForStable();
        const r = await t.page.evaluate(() => {
          const vh = innerHeight, chips = [...document.querySelectorAll('#tiles .chip')].map((c) => c.getBoundingClientRect());
          return { n: chips.length, lowest: Math.round(Math.max(...chips.map((c) => c.bottom))), vh, wide: document.documentElement.scrollWidth > innerWidth };
        });
        t.equal(r.n, 8, w + 'x' + h + ': eight Play chips');
        t.expect(r.lowest <= r.vh, w + 'x' + h + ': the lowest chip ends at ' + r.lowest + ', inside the ' + r.vh + ' px screen');
        t.expect(!r.wide, w + 'x' + h + ': nothing sideways');
        fs.mkdirSync(SHOTS, { recursive: true });
        await t.page.screenshot({ path: path.join(SHOTS, 'S6-08-title-' + w + 'x' + h + '-' + (w < 900 ? 'mobile' : 'desktop') + '.png') });
      }
      // a tall phone keeps its title as it was: the painting, the name, and the tiles' hands
      await t.page.setViewportSize({ width: 390, height: 844 });
      await t.game('scene', 'title'); await t.waitForStable();
      t.expect(await t.page.evaluate(() => getComputedStyle(document.querySelector('#tiles canvas')).display !== 'none'), 'portrait still shows the card hands');
    },
  },
  {
    name: 'w3e S4-07 S2-20 the empty felt carries the Spa City mark, and a phone the rooflines of Bathhouse Row',
    async run(t) {
      await t.game('unlockAll');
      await baseSettings(t, { sound: false, tips: false, motion: 'reduced', table: 'felt' });
      const marks = async () => { await t.page.waitForFunction(() => window.__game.placeMarks()); return t.game('placeMarks'); };
      // the mark is painted: gold along the arc, plain felt between the arcs and outside them
      const ringContrast = (e, dark) => t.page.evaluate(([e, dark]) => {
        const c = document.getElementById('tbl'), k = c.width / c.clientWidth, g = c.getContext('2d');
        const lum = (x, y) => { const d = g.getImageData(Math.round(x * k) - 1, Math.round(y * k) - 1, 3, 3).data; let m = dark ? 999 : 0; for (let i = 0; i < 36; i += 4) { const v = .3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2]; m = dark ? Math.min(m, v) : Math.max(m, v); } return m; };
        const at = (rr) => { let s = 0; for (let i = 1; i < 40; i++) { const a = Math.PI + i / 40 * Math.PI; s += lum(e.cx + Math.cos(a) * e.r * rr, e.cy + Math.sin(a) * e.r * rr); } return s / 39; };
        return at(1) - (at(.91) + at(1.12)) / 2;
      }, [e, dark]);
      await t.game('newGame', { mode: 'klondike' }); await t.waitForStable();
      let m = await marks(), lay = await t.game('getLayout');
      t.expect(m.emblem, 'a Klondike table has the Spa City mark on the empty felt');
      const lowest = Math.max(...Object.keys(lay.piles).filter((k) => /^td$/.test(k)).map((k) => lay.piles[k].y + (lay.piles[k].zoneH || 0)));
      t.expect(m.emblem.cy - m.emblem.r >= m.band.top - 1 && m.emblem.cy + m.emblem.r * .6 <= m.band.bottom, 'it sits inside the free band under the dealt columns: ' + JSON.stringify(m.emblem) + ' in ' + JSON.stringify(m.band));
      t.expect(m.band.top >= lowest - 1, 'and below the lowest column of the deal (' + Math.round(lowest) + ' <= ' + Math.round(m.band.top) + ')');
      t.expect(await ringContrast(m.emblem) > 8, 'the mark is really painted on the table layer: ' + await ringContrast(m.emblem));
      if (t.viewport === 'mobile') {
        t.expect(m.skyline && m.skyline.w >= 380 && m.skyline.h >= 40, 'a phone also has the rooflines along the foot of the table: ' + JSON.stringify(m.skyline));
        const roof = await t.page.evaluate((sk) => { // Lamar (the low building at the right end): inside it against just above its roof
          const c = document.getElementById('tbl'), k = c.width / c.clientWidth, g = c.getContext('2d'), base = sk.y + sk.h - 6, top = base - sk.h * .64 * .72, x = sk.x + sk.w * .93;
          const l = (y) => { let s = 0; for (let i = -3; i <= 3; i++) { const d = g.getImageData(Math.round((x + i * 4) * k), Math.round(y * k), 1, 1).data; s += .3 * d[0] + .59 * d[1] + .11 * d[2]; } return s / 7; };
          return l(top + 8) - l(top - 8);
        }, m.skyline);
        t.expect(roof > 5, 'the rooflines are painted: ' + roof);
      } else t.expect(!m.skyline, 'a wide table has no rooflines');
      await shot(t, 'S4-07', 'felt-mark');
      // a table where the free band is small gets no mark, and a mark is never drawn into a band under 22% of the table
      for (const [w, h] of [[1280, 800], [1280, 600], [1000, 700], [390, 844], [500, 800]]) {
        await t.page.setViewportSize({ width: w, height: h });
        for (const mode of ['klondike', 'freecell', 'spider', 'yukon']) {
          await t.game('newGame', { mode, opts: mode === 'spider' ? { suits: 1 } : {} }); await t.waitForStable();
          await t.page.waitForFunction(() => window.__game.placeMarks());
          const q = await t.game('placeMarks'), H = await t.page.evaluate(() => document.getElementById('stage').clientHeight);
          if (h <= w * 1.4 && q.emblem) t.expect(q.band.bottom - q.band.top >= H * .22 - 1, w + 'x' + h + ' ' + mode + ': the mark only where the band is at least 22% of the table');
          if (q.emblem) t.expect(q.emblem.cy + q.emblem.r * .6 <= q.band.bottom + 1 && q.emblem.cy - q.emblem.r >= 0, w + 'x' + h + ' ' + mode + ': the mark is on the table');
        }
      }
      await t.page.setViewportSize(t.vp);
      // a light table keeps the mark: dark ink on marble
      await t.game('setSettings', { table: 'marble' }); await t.game('newGame', { mode: 'klondike' }); await t.waitForStable();
      t.expect(await ringContrast((await marks()).emblem, true) < -3, 'on marble the mark is darker than the stone');
      await shot(t, 'S4-07', 'marble-mark');
    },
  },
  {
    name: 'w3e S4-23 on a small phone the card hands fit their tiles and the tagline has no plate',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { sound: false, tips: false });
      for (const [w, h] of [[320, 568], [360, 640], [390, 844]]) {
        await t.page.setViewportSize({ width: w, height: h });
        await t.game('scene', 'title'); await t.waitForStable();
        const r = await t.page.evaluate(() => ({
          hands: [...document.querySelectorAll('#tiles canvas')].map((c) => { // painted pixels in the first and last column of each hand's canvas
            const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let edge = 0;
            for (let y = 0; y < c.height; y++) for (const x of [0, c.width - 1]) if (d[(y * c.width + x) * 4 + 3] > 8) edge++;
            return { edge, painted: d.some((v, i) => i % 4 === 3 && v > 8) };
          }),
          plate: getComputedStyle(document.getElementById('tTag')).backgroundColor,
        }));
        t.expect(r.hands.length === 4 && r.hands.every((x) => x.painted), w + 'x' + h + ': four hands are painted');
        t.expect(r.hands.every((x) => x.edge === 0), w + 'x' + h + ': no hand is cut off at its canvas edge: ' + r.hands.map((x) => x.edge));
        t.expect(r.plate === 'rgba(0, 0, 0, 0)', w + 'x' + h + ': no plate behind the tagline on a phone: ' + r.plate);
        if (w === 320) { fs.mkdirSync(SHOTS, { recursive: true }); await t.page.screenshot({ path: path.join(SHOTS, 'S4-23-title-320x568-mobile.png') }); }
      }
      await t.page.setViewportSize({ width: 1280, height: 800 });
      await t.game('scene', 'title'); await t.waitForStable();
      t.expect(await t.page.evaluate(() => getComputedStyle(document.getElementById('tTag')).backgroundColor) !== 'rgba(0, 0, 0, 0)', 'a wide screen keeps its tagline plate');
    },
  },
];
