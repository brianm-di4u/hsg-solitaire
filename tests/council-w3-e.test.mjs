// Council wave 3, batch E: sound, layout and accessibility, world, words and ceremony
// (S5-08, S6-08, S4-01, S4-07, S4-23, S2-03, S2-20, S2-04, S4-08).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.HS_ARTIFACT_DIR ? path.resolve(process.env.HS_ARTIFACT_DIR, 'wave-3', 'shots') : path.resolve(HERE, '..', 'screenshots', 'council-waves', 'wave-3', 'shots');
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
      const marks = async () => { await t.page.waitForFunction(() => { const m = window.__game.placeMarks(); return m && m.emblem; }); return t.game('placeMarks'); }; // waits for the table layer to be redrawn with a mark
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
      const lowest = Math.max(...Object.keys(lay.piles).filter((k) => /^t\d$/.test(k)).map((k) => lay.piles[k].y + (lay.piles[k].zoneH || 0)));
      t.expect(m.emblem.cy - m.emblem.r >= m.band.top - 1 && m.emblem.cy + m.emblem.r * .6 <= m.band.bottom, 'it sits inside the free band under the dealt columns: ' + JSON.stringify(m.emblem) + ' in ' + JSON.stringify(m.band));
      t.expect(m.band.top >= lowest - 1, 'and below the lowest column of the deal (' + Math.round(lowest) + ' <= ' + Math.round(m.band.top) + ')');
      t.expect(await ringContrast(m.emblem) > 8, 'the mark is really painted on the table layer: ' + await ringContrast(m.emblem));
      if (t.viewport === 'mobile') {
        const cornerS = Math.min(128, Math.max(44, Math.round(Math.min(390, 844) * 0.13)));
        t.expect(m.skyline && m.skyline.x >= cornerS + 5 && m.skyline.x + m.skyline.w <= 390 - cornerS - 5 && m.skyline.w >= 390 - 2 * cornerS - 20 && m.skyline.h >= 40, 'a phone has the rooflines inset clear of both bottom brass corner fans: ' + JSON.stringify(m.skyline));
        const roof = await t.page.evaluate((sk) => { // Lamar (the low building at the right end): inside it against just above its roof
          const c = document.getElementById('tbl'), k = c.width / c.clientWidth, g = c.getContext('2d'), base = sk.y + sk.h - 6, top = base - sk.h * .64 * .72, x = sk.x + sk.w * .93;
          const l = (y) => { let s = 0; for (let i = -3; i <= 3; i++) { const d = g.getImageData(Math.round((x + i * 4) * k), Math.round(y * k), 1, 1).data; s += .3 * d[0] + .59 * d[1] + .11 * d[2]; } return s / 7; };
          return l(top + 8) - l(top - 8);
        }, m.skyline);
        t.expect(roof > 5, 'the rooflines are painted: ' + roof);
      } else t.expect(!m.skyline, 'a wide table has no rooflines');
      await shot(t, 'S4-07', 'felt-mark');
      // a table where the free band is small gets no mark, and a mark is never drawn into a band under 9% of the table (wave 4, C4-08: it was 22%)
      for (const [w, h] of [[1280, 800], [1280, 600], [1000, 700], [390, 844], [500, 800]]) {
        await t.page.setViewportSize({ width: w, height: h });
        for (const mode of ['klondike', 'freecell', 'spider', 'yukon']) {
          await t.game('newGame', { mode, opts: mode === 'spider' ? { suits: 1 } : {} }); await t.waitForStable();
          await t.page.waitForFunction(() => window.__game.placeMarks());
          const q = await t.game('placeMarks'), H = await t.page.evaluate(() => document.getElementById('stage').clientHeight);
          if (h <= w * 1.4 && q.emblem && !q.emblem.inNook) t.expect(q.band.bottom - q.band.top >= H * .09 - 1, w + 'x' + h + ' ' + mode + ': the mark only where the band is at least 9% of the table');
          if (q.emblem) {
            if (q.emblem.inNook && q.nook) t.expect(q.emblem.cy - q.emblem.r >= q.nook.top - 1 && q.emblem.cy + q.emblem.r * .6 <= q.nook.bottom + 1, w + 'x' + h + ' ' + mode + ': Yukon nook mark sits inside the right-rail nook');
            else t.expect(q.emblem.cy + q.emblem.r * .6 <= q.band.bottom + 1 && q.emblem.cy - q.emblem.r >= 0, w + 'x' + h + ' ' + mode + ': the mark is on the table');
          }
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
    name: 'w3e S4-23 on a small phone the card hands fit their tiles and the tagline keeps its dark scrim',
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
        t.expect(r.plate !== 'rgba(0, 0, 0, 0)', w + 'x' + h + ': tagline keeps a translucent dark scrim over the bright skyline: ' + r.plate);
        if (w === 320) { fs.mkdirSync(SHOTS, { recursive: true }); await t.page.screenshot({ path: path.join(SHOTS, 'S4-23-title-320x568-mobile.png') }); }
      }
      await t.page.setViewportSize({ width: 1280, height: 800 });
      await t.game('scene', 'title'); await t.waitForStable();
      t.expect(await t.page.evaluate(() => getComputedStyle(document.getElementById('tTag')).backgroundColor) !== 'rgba(0, 0, 0, 0)', 'a wide screen keeps its tagline plate');
    },
  },
  {
    name: 'w3e S4-01 the table is never quite still: steam and lamplight under the cards, stopped for reduced motion, dialogs, the title and a hidden tab',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });
      await t.game('newGame', { mode: 'klondike' });
      const amb = () => t.game('ambient');
      await t.page.waitForFunction(() => window.__game.ambient().running);
      const a = await amb();
      t.expect(a.painted > 0, 'the ambient layer has paint on it: ' + a.painted);
      await t.page.waitForFunction((n) => window.__game.ambient().frames >= n + 4, a.frames);
      const rate = await t.page.evaluate(() => new Promise((done) => { const f0 = window.__game.ambient().frames, t0 = performance.now(); setTimeout(() => done((window.__game.ambient().frames - f0) / ((performance.now() - t0) / 1000)), 1000); }));
      t.expect(rate <= 11.5, 'about 10 frames a second at most (C4-12: it was 20), never a full-rate loop: ' + rate.toFixed(1));
      // The floor (K-01): at a set 10 a second, twelve more repaints of the game's own counter arrive inside 4 seconds, which is more than 3 a second. The wait ends on the count, so a busy machine only costs time.
      const f0 = (await amb()).frames;
      await t.page.waitForFunction((n) => window.__game.ambient().frames >= n + 12, f0, { timeout: 4000 }).catch(() => t.fail('the ambient layer repainted fewer than 12 times in 4 seconds (3 a second): ' + JSON.stringify(f0)));
      t.expect(await t.page.evaluate(() => { const r = document.getElementById('cv').getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2).id; }) === 'cv', 'it never takes a press from the table');
      t.expect((await t.game('isIdle')) === true, 'it does not keep the game from being idle');
      const m = await t.frameCost(1500); t.log('frame cost with the ambient layer running: ' + JSON.stringify(m));
      await shot(t, 'S4-01', 'ambient');
      // reduced motion: nothing runs and nothing is left on the canvas
      await t.game('setSettings', { motion: 'reduced' });
      await t.page.waitForFunction(() => { const q = window.__game.ambient(); return !q.running && q.painted === 0; });
      await t.game('setSettings', { motion: 'full' });
      await t.page.waitForFunction(() => window.__game.ambient().running);
      // a dialog over the table, and the title: stopped and cleared
      await t.game('scene', 'settings');
      await t.page.waitForFunction(() => { const q = window.__game.ambient(); return !q.running && q.painted === 0; });
      await t.game('scene', 'game');
      await t.page.waitForFunction(() => window.__game.ambient().running);
      await t.game('scene', 'title');
      await t.page.waitForFunction(() => { const q = window.__game.ambient(); return !q.running && q.painted === 0; });
      await t.game('scene', 'game');
      await t.page.waitForFunction(() => window.__game.ambient().running);
      // a hidden tab
      await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      await t.page.waitForFunction(() => { const q = window.__game.ambient(); return !q.running && q.painted === 0; });
      await t.page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await t.page.waitForFunction(() => window.__game.ambient().running);
    },
  },
  {
    name: 'w3e S4-01 low-effects mode has no ambient layer',
    url: 'index.html?fx=low',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });
      await t.game('newGame', { mode: 'klondike' }); await t.waitForStable();
      t.equal(await t.game('fxLevel'), 'low', 'the page is in low-effects mode');
      const a = await t.game('ambient');
      t.expect(!a.wanted && !a.running && a.painted === 0, 'the ambient layer is off: ' + JSON.stringify(a));
    },
  },
  {
    name: 'w3e S2-03 a refused drop or tap says why, once, and keyboard players hear it too',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'reduced' });
      await t.page.evaluate(() => { window.__toasts = []; new MutationObserver(() => window.__toasts.push(document.getElementById('toast').textContent)).observe(document.getElementById('toast'), { childList: true, characterData: true, subtree: true }); });
      // A frozen clock that moves only through advance(): the 3 s repeat guard cannot lapse between two drops however slow the machine is.
      await t.page.evaluate(() => { const base = performance.now(); window.__off = 0; performance.now = () => base + window.__off; });
      const advance = (ms) => t.page.evaluate((m) => { window.__off += m; }, ms);
      // Animations run on the same clock, so settling steps it in small advances until the game says it is idle (a state, not a delay).
      const settle = async () => { for (let i = 0; i < 400; i++) { if (await t.game('isIdle')) return; await advance(50); } t.fail('the table never settled'); };
      const said = () => t.page.evaluate(() => window.__toasts.slice());
      const fresh = () => t.page.evaluate(() => { window.__toasts.length = 0; });
      const K = (piles) => ({ mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, piles) });
      const spot = async (pile, i = 0) => { const lay = await t.game('getLayout'), p = lay.piles[pile], c = p.cards.length ? p.cards[Math.min(i, p.cards.length - 1)] : p; return { x: c.x + (c.w || lay.cardW) / 2, y: c.y + 14, lay }; };
      const drop = async (from, to, i = 0) => {
        const a = await spot(from, i), b = await spot(to, 99);
        if (t.viewport === 'mobile') await t.touchDrag([a.x, a.y], [b.x, b.y + 10], { steps: 8 });
        else { await t.page.mouse.move(a.x, a.y); await t.page.mouse.down(); await t.page.mouse.move(b.x, b.y + 10, { steps: 8 }); await t.page.mouse.up(); }
        await settle();
      };
      await t.game('setState', K({ t0: ['6H'], t1: ['7D'], t2: ['8S'], t4: ['5C'], t5: ['3S'] }));
      await fresh(); await drop('t0', 't1');
      t.equal(await said(), ['Colors alternate: it needs a black seven'], 'red on red says the colors alternate');
      await shot(t, 'S2-03', 'reason');
      await drop('t0', 't1');
      t.equal((await said()).length, 1, 'the same refusal again straight away stays quiet');
      await advance(3100); await drop('t0', 't1');
      t.equal((await said()).slice(1), ['Colors alternate: it needs a black seven'], 'after three seconds the same refusal speaks again');
      await drop('t0', 't2');
      t.equal((await said()).slice(2), ['Build down: a six goes on a seven'], 'a wrong rank says one rank lower');
      await drop('t4', 't3');
      t.equal((await said()).slice(3), ['Only a King fills an empty column'], 'a six on an empty column wants a King');
      await drop('t5', 'f0');
      t.equal((await said()).slice(4), ['An Ace starts a foundation'], 'a three on an empty foundation wants an Ace');
      t.equal((await t.game('getState')).moves, 0, 'nothing moved');
      // a tap with nowhere to go
      await t.game('setState', K({ t0: ['6H'], t1: ['9C', '4D'], t6: ['#9C', '4H'] }));
      await fresh(); await t.game('act', 'tap', 't0', 0);
      t.equal((await said()).slice(-1), ['No pile takes that card yet'], 'a tapped card with no home says so');
      await fresh(); await advance(3100);
      await t.game('act', 'tap', 't6', 0);
      t.equal((await said()).slice(-1), ['That card is face down'], 'a face-down card says so');
      // FreeCell: cells and columns all taken; and a run that the free cells cannot carry to an empty column
      const FC = (cells, tabs) => ({ mode: 'freecell', opts: {}, piles: Object.assign({ c0: [], c1: [], c2: [], c3: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [] }, cells, tabs) });
      await t.game('setState', FC({ c0: ['2C'], c1: ['2D'], c2: ['2H'], c3: ['2S'] }, { t0: ['9S'], t1: ['KC'], t2: ['KD'], t3: ['KH'], t4: ['QC'], t5: ['QD'], t6: ['QH'], t7: ['JC'] }));
      await fresh(); await advance(3100);
      await t.game('act', 'tap', 't0', 0);
      t.equal((await said()).slice(-1), ['No free cell or column for that card'], 'FreeCell with every cell and column taken says so');
      await t.game('setState', FC({ c0: ['2C'], c1: ['2D'], c2: ['2H'] }, { t0: ['9S', '8H', '7S'], t1: ['KC'], t2: ['KD'], t3: ['KH'], t4: ['QC'], t5: ['QD'], t6: ['QH'] }));
      await fresh(); await drop('t0', 't7', 0);
      t.equal((await said()).slice(-1), ['Only 2 cards can move with these free cells'], 'a run too long for the free cells says how many can move');
      // the keyboard: pick up with Enter, move to the wrong pile, Enter again
      await t.game('setState', K({ t0: ['6H'], t1: ['7D'] }));
      await advance(3100);
      await t.page.focus('#cv'); await fresh();
      const goTo = async (pile) => { for (let i = 0; i < 20 && (await t.game('getState')).cursor.pile !== pile; i++) await t.page.keyboard.press('ArrowRight'); t.equal((await t.game('getState')).cursor.pile, pile, 'the cursor reached ' + pile); };
      await goTo('t0'); await t.page.keyboard.press('Enter'); await goTo('t1'); await t.page.keyboard.press('Enter');
      t.expect((await said()).includes('Colors alternate: it needs a black seven'), 'the keyboard drop says why too: ' + JSON.stringify(await said()));
    },
  },
  {
    name: 'w3e S2-04 a screen reader can explore the piles and play from a list beside the canvas, and S reads out the table',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'reduced' });
      const labels = () => t.page.evaluate(() => [...document.querySelectorAll('#mirror button')].map((b) => b.getAttribute('data-key') + ' = ' + b.textContent));
      const press = (key) => t.page.evaluate((k) => document.querySelector('#mirror [data-key="' + k + '"]').click(), key);
      const sr = () => t.page.evaluate(() => document.getElementById('sr').textContent);
      // The list is rebuilt on the next frame after the table changes, and the live region is rewritten as events arrive:
      // every step waits for the state it expects instead of reading straight after the act.
      const has = (k, txt) => t.page.waitForFunction(([k, txt]) => [...document.querySelectorAll('#mirror button')].some((b) => b.getAttribute('data-key') === k && b.textContent.includes(txt)), [k, txt], { timeout: 10000 }).catch(async () => { t.expect(false, k + ' says "' + txt + '": ' + (await labels()).filter((x) => x.startsWith(k + ' ')).join()); });
      const held = (want) => t.page.waitForFunction((w) => { const h = window.__game.getState().held; return w ? !!h && h.from === w.from && h.index === w.index : !h; }, want, { timeout: 10000 });
      const sayWait = (re, timeout = 10000) => t.page.waitForFunction((s) => new RegExp(s).test(document.getElementById('sr').textContent), re.source, { timeout });
      // This sparse table is a dead end, so the "No more moves" sheet may open at any moment and takes the keys: put it away whenever it is up.
      const putStuckAway = async () => { if ((await t.game('getState')).modal === 'stuck') { await t.page.keyboard.press('Escape'); await t.page.waitForFunction(() => !window.__game.getState().modal, null, { timeout: 10000 }); } };
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { stock: ['2D', '3D'], waste: ['4H'], f0: ['AS'], t0: ['#9C', '6H'], t1: ['7S'], t2: ['KD', 'QC'] }) });
      await has('stock', 'Stock, 2 cards. Press to draw'); await has('waste', 'Waste, Four of hearts'); await has('f0', 'Foundation 1, Ace of spades on top'); await has('f1', 'Foundation 2, empty');
      await has('t0:1', 'Column 1: Six of hearts, 1 face down. Press to pick up'); await has('t1:0', 'Column 2: Seven of spades'); await has('t2:0', 'Column 3: King of diamonds, with 1 card on it'); await has('t2:1', 'Column 3: Queen of clubs'); await has('t3', 'Column 4, empty');
      t.expect(await t.page.evaluate(() => { const m = document.getElementById('mirror'); return !m.hidden && m.getAttribute('role') === 'group' && m.getAttribute('aria-hidden') == null && [...m.querySelectorAll('button')].every((b) => b.tabIndex === -1); }), 'a visible-to-readers group whose buttons are out of the Tab order');
      // pick up the six, and the list now says where it can be dropped
      await press('t0:1'); await held({ from: 't0', index: 1 });
      t.equal((await t.game('getState')).held, { from: 't0', index: 1 }, 'pressing a card in the list picks it up');
      await has('t1:0', 'Press to drop Six of hearts here');
      await press('t1:0'); await held(null); await has('t1:1', 'Column 2: Six of hearts');
      const st = await t.game('getState');
      t.equal([st.piles.t1, st.piles.t0, st.moves], [['7S', '6H'], ['9C'], 1], 'pressing a column drops it there: the move is made');
      t.expect(!(await labels()).some((x) => x.startsWith('t1:0 =')) || (await labels()).some((x) => x.startsWith('t1:0 =') && x.includes('with 1 card on it')), 'and the list follows the move');
      // a refused drop says why, to the same live region
      await press('waste'); await held({ from: 'waste', index: 0 });
      await press('t1:1'); await sayWait(/Build down: a four goes on a five/);
      t.expect(/Build down: a four goes on a five/.test(await sr()), 'a drop the rules refuse is explained: ' + await sr());
      await press('waste'); await held(null); // put it back
      // the stock, by its button
      await press('stock');
      await t.page.waitForFunction(() => window.__game.getState().piles.waste.slice(-1)[0] === '3D', null, { timeout: 10000 });
      t.equal((await t.game('getState')).piles.waste.slice(-1), ['3D'], 'pressing the stock draws a card');
      // keyboard on a list button keeps the screen reader's place
      await has('t2:1', 'Column 3: Queen of clubs');
      // The list is rebuilt after the draw: wait until the same button has stood through three frames with the game idle, then set and check the focus in one retrying step.
      await t.page.waitForFunction(() => { const b = document.querySelector('#mirror [data-key="t2:1"]'); if (!b) return false; if (window.__mb !== b) { window.__mb = b; window.__mbN = 0; return false; } return ++window.__mbN >= 3 && window.__game.isIdle(); }, null, { timeout: 10000 });
      for (let i = 0, ok = false; i < 8 && !ok; i++) { await putStuckAway(); ok = await t.page.waitForFunction(() => { const b = document.querySelector('#mirror [data-key="t2:1"]'); if (!b) return false; if (document.activeElement !== b) b.focus(); return document.activeElement === b && !window.__game.getState().modal; }, null, { timeout: 2000 }).then(() => true, () => false); }
      await t.page.keyboard.press('Enter'); await held({ from: 't2', index: 1 });
      await t.page.waitForFunction(() => { const a = document.activeElement; return !!a && !!a.closest('#mirror') && a.dataset.pile === 't2'; }, null, { timeout: 10000 });
      t.expect(true, 'focus stays in the list, on the same column, after the list is rebuilt');
      await t.page.evaluate(() => { const b = document.querySelector('#mirror [data-key="t2:1"]') || document.querySelector('#mirror [data-pile="t2"]'); b.click(); }); // put the queen back
      await held(null);
      // S reads the table
      let heard = false; // a press that lands while the list is still being rebuilt is lost: press again, until the table is read out
      for (let i = 0; i < 8 && !heard; i++) {
        await putStuckAway(); await t.page.focus('#cv'); await t.page.waitForFunction(() => document.activeElement && document.activeElement.id === 'cv');
        await t.page.keyboard.press('s'); heard = await sayWait(/Foundations: /, 3000).then(() => true, () => false);
      }
      t.expect(heard, 'S reads the table out');
      const sum = await sr();
      t.expect(/Stock, 1 card/.test(sum) && /Waste, Three of diamonds/.test(sum) && /Foundations: Ace of spades, empty/.test(sum) && /Columns: 1, 1 face down, Nine of clubs|Columns: 1, empty|Columns: 1,/.test(sum) && /3, King of diamonds|3, 1 face down|3, /.test(sum), 'S announces stock, waste, foundations and columns: ' + sum);
      // the title hides the list
      await t.game('scene', 'title');
      await t.page.waitForFunction(() => document.getElementById('mirror').hidden, null, { timeout: 10000 });
      t.expect(true, 'the list is hidden on the title');
      await t.game('scene', 'game');
      // FreeCell and Spider have their own piles
      await t.game('newGame', { mode: 'freecell' }); await t.waitForStable();
      await has('c0', 'Free cell 1, empty');
      await t.page.waitForFunction(() => document.querySelectorAll('#mirror [data-key^="t"]').length >= 8, null, { timeout: 10000 });
      t.expect((await labels()).filter((x) => /^t\d+:/.test(x)).length >= 8, 'FreeCell: a button for the cards of every column');
      await t.game('newGame', { mode: 'spider', opts: { suits: 1 } }); await t.waitForStable();
      await has('stock', 'deals left. Press to deal a row');
    },
  },
  {
    name: 'w3e S4-08 the win ceremony stamps the Spa City mark into the ring and lets steam rise from it',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });
      await t.game('setState', nearWinKlondike()); await t.game('act', 'move', 't0', 'f3');
      let r = await t.game('act', 'ceremonyAt', 100);
      t.equal([r.steamed, r.stamp], [0, 0], 'at the start of the gather there is neither steam nor stamp');
      r = await t.game('act', 'ceremonyAt', 700);
      t.expect(r.steamed > 0 && r.stamp > 0 && r.stamp < 1, 'the mark is fading in and the steam has begun: ' + JSON.stringify(r));
      r = await t.game('act', 'ceremonyAt', 1300);
      t.expect(r.steamed >= 6 && r.stamp === 1, 'by the hold the mark is whole and steam keeps coming: ' + JSON.stringify(r));
      await shot(t, 'S4-08', 'ceremony-stamp');
      r = await t.game('act', 'ceremonyAt', 3600);
      t.equal(r.stamp, 0, 'the mark has faded by the end of the spray');
      t.expect(r.steamed < 40, 'and the steam stopped with the rosette: ' + r.steamed);
    },
  },
  {
    name: 'w3e S4-08 the stamped mark is painted on the table canvas: its words, in the pale ink, at the ring centre and a readable size',
    initScript: () => {
      window.__ink = [];
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (txt, x, y) { if (txt === 'Spa City' && this.canvas.id === 'cv') window.__ink.push({ fill: String(this.fillStyle).toLowerCase(), a: this.globalAlpha, px: parseFloat(this.font), x, y }); return f.apply(this, arguments); };
    },
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });
      await t.game('setState', nearWinKlondike()); await t.game('act', 'move', 't0', 'f3');
      const stamps = () => t.page.evaluate(() => { const w = document.querySelector('#cv').getBoundingClientRect(); const a = window.__ink.filter((i) => i.fill === '#f3da92').map((i) => Object.assign({}, i, { cx: w.width / 2, cy: w.height / 2 })); window.__ink.length = 0; return a; });
      await t.game('act', 'ceremonyAt', 100); await stamps();
      await t.game('act', 'ceremonyAt', 100);
      t.equal((await stamps()).length, 0, 'before the gather has begun nothing is stamped');
      await t.game('act', 'ceremonyAt', 1300);
      const s = (await stamps()).slice(-1)[0];
      t.expect(!!s, 'at the hold the words Spa City are painted in the pale ink');
      t.expect(s.px >= 10, 'at a readable size (' + s.px + ' px)');
      t.expect(s.a > .3, 'with enough strength to see (' + (s.a || 0).toFixed(2) + ')');
      t.expect(Math.abs(s.x - s.cx) < 3 && Math.abs(s.y - s.cy) < s.cy * .5, 'in the middle of the ring');
    },
  },
  {
    name: 'w3e S4-08 low-effects mode keeps the stamp but has no steam',
    url: 'index.html?fx=low',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });
      await t.game('setState', nearWinKlondike()); await t.game('act', 'move', 't0', 'f3');
      const r = await t.game('act', 'ceremonyAt', 1300);
      t.equal([r.steamed, r.stamp], [0, 1], 'stamp whole, no steam: ' + JSON.stringify(r));
    },
  },
  {
    name: 'w3e W3-B03 Draw-3 FLIP_GAP_MS 1:1 sync, waste-before-foundation timing, autoplay UID dedup, & flip/redo audio sync (W6-P-N03, W6-S5-05)',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full', autoFoundation: 'off' });
      // 1. Draw-3 visual stagger matches FLIP_GAP_MS (45 ms) 1:1 with audio flips
      await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: Object.assign({}, EMPTY_K, { stock: ['4C', '5C', '6C'], t0: ['9S'] }) });
      await t.game('cuesPlayed', true);
      await t.game('act', 'draw');
      const drawSync = await t.page.evaluate(() => {
        const d0 = window.__game.dispOf('waste', 0), d1 = window.__game.dispOf('waste', 1), d2 = window.__game.dispOf('waste', 2);
        const flips = window.__game.cuesPlayed().filter((c) => c.name === 'flip').map((c) => Math.round(c.wait * 1000));
        return { dt: [Math.round(d0.t0 - d0.t0), Math.round(d1.t0 - d0.t0), Math.round(d2.t0 - d0.t0)], flips };
      });
      t.equal(drawSync.dt, [0, 45, 90], 'Draw-3 visual stagger aligns 1:1 to FLIP_GAP_MS (45 ms): ' + JSON.stringify(drawSync.dt));
      t.equal(drawSync.flips, [0, 45, 90], 'Draw-3 audio flips align 1:1 to FLIP_GAP_MS (45 ms)');

      // 2. Draw-3 card #3 Ace visits Waste in draw order before autoplay lifts it to Foundation (W6-P-N03)
      await t.game('setSettings', { autoFoundation: 'safe' });
      await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: Object.assign({}, EMPTY_K, { stock: ['AS', '8C', '7H'], t0: ['9S'] }) });
      await t.game('cuesPlayed', true);
      await t.game('act', 'draw');
      const d3 = await t.page.evaluate(() => ({
        piles: window.__game.getState().piles,
        w0: window.__game.dispOf('waste', 0),
        w1: window.__game.dispOf('waste', 1),
        f0: window.__game.dispOf('f0'),
        cues: window.__game.cuesPlayed(),
      }));
      t.equal([d3.piles.waste, d3.piles.f0], [['7H', '8C'], ['AS']], 'Draw-3 draws 7H, 8C to Waste and autoplays AS to Foundation');
      t.expect(d3.f0.t0 - d3.w1.t0 >= 200, 'AS launches to Foundation strictly after card #2 + waste settle (>=200 ms after 8C): ' + Math.round(d3.f0.t0 - d3.w1.t0));
      t.expect(!!d3.f0.via && Math.abs((d3.f0.via.t0 - d3.w1.t0) - 45) <= 2, 'AS stages Stage-1 flip onto Waste at t+90 ms (45 ms after card #2): ' + JSON.stringify(d3.f0.via));
      t.expect(Math.hypot(d3.f0.sx - d3.f0.via.sx, d3.f0.sy - d3.f0.via.sy) > 20 && Math.abs(d3.f0.sx - d3.w1.tx) < 1 && Math.abs(d3.f0.sy - d3.w1.ty) < 1, 'AS Stage-2 lifts off from Waste slot, not Stock: ' + JSON.stringify({ sx: d3.f0.sx, sy: d3.f0.sy, via: d3.f0.via, w1: { tx: d3.w1.tx, ty: d3.w1.ty } }));
      const asFound = d3.cues.find((c) => c.name === 'found');
      t.expect(!!asFound && asFound.wait > 0.35, 'AS foundation chime waits until AS lands on Foundation (>350 ms): ' + JSON.stringify(asFound));

      // Draw-1 Ace also visits Waste briefly before lifting to Foundation
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { stock: ['AS'], t0: ['9S'] }) });
      await t.game('act', 'draw');
      const d1 = await t.page.evaluate(() => window.__game.dispOf('f0'));
      t.expect(!!d1.via && d1.t0 - d1.via.t0 >= 155, 'Draw-1 Ace visits Waste before lifting to Foundation (+161 ms): ' + Math.round(d1.t0 - (d1.via ? d1.via.t0 : d1.t0)));

      // 3. Autoplay 'found' replaces intermediate tableau 'place' on same card UID and inherits auto=false (W6-S5-05)
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['AS'], t1: ['2H'], t2: ['KD'] }) });
      await t.game('cuesPlayed', true);
      await t.game('act', 'move', 't0', 't1');
      const ap = await t.page.evaluate(() => ({ f0: window.__game.getState().piles.f0, cues: window.__game.cuesPlayed() }));
      t.equal(ap.f0, ['AS'], 'autoplay sent player-moved AS straight to Foundation');
      t.equal(ap.cues.filter((c) => c.name === 'place').length, 0, 'intermediate tableau place cue deduplicated away');
      const foundCue = ap.cues.find((c) => c.name === 'found');
      t.expect(!!foundCue && foundCue.arg === 1 && foundCue.auto === false, 'found chime replaces place and inherits auto=false: ' + JSON.stringify(foundCue));

      // 4. Uncovered tableau flip fires at mid-flip (not t=0), and redo() fires at landing (not t=0) (W6-S5-05)
      await t.game('setSettings', { autoFoundation: 'off' });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['#5C', '9H'], t1: ['TS'], f0: ['AC'], t2: ['2C'] }) });
      await t.game('cuesPlayed', true);
      await t.game('act', 'move', 't0', 't1');
      const mvCues = await t.game('cuesPlayed', true);
      const revFlip = mvCues.find((c) => c.name === 'flip');
      t.expect(!!revFlip && revFlip.wait >= 0.14, 'uncovered tableau card flip fires at mid-flip (>=140 ms, not t=0): ' + JSON.stringify(revFlip));

      await t.game('act', 'undo'); await t.game('cuesPlayed', true);
      await t.game('act', 'redo');
      const redoPlace = (await t.game('cuesPlayed', true)).find((c) => c.name === 'place');
      t.expect(!!redoPlace && redoPlace.wait >= 0.12, 'redo() tableau cue fires at card landing (>=120 ms, not t=0): ' + JSON.stringify(redoPlace));

      await t.game('act', 'move', 't2', 'f0');
      await t.game('act', 'undo'); await t.game('cuesPlayed', true);
      await t.game('act', 'redo');
      const redoFound = (await t.game('cuesPlayed', true)).find((c) => c.name === 'found');
      t.expect(!!redoFound && redoFound.arg === 2 && redoFound.wait >= 0.12, 'redo() foundation cue fires at card landing (>=120 ms, not t=0): ' + JSON.stringify(redoFound));
    },
  },
];
