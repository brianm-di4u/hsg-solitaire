// Council wave 4, batch C: difficulty, progression and records; feedback, teaching and help; sound.
// S2-10 the goal line, S1-22 touch behaviour, S4-24 picker and credit spacing, P-N04 FreeCell deal 11982, C4-04 volume curve,
// S5-14 Redo cues, P-N06 the foundation ladder. (S4-10, S4-17 and P-N05 are checks only: see the batch report.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-4', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };
const P = 'spa-solitaire:v1:';
const reloadGame = async (t) => { await t.page.reload(); await t.page.waitForFunction(() => !!window.__game); };
const cuesNow = (t, clear) => t.page.evaluate((c) => window.__game.cuesPlayed(c), !!clear);
const goal = (t) => t.page.evaluate(() => { const g = document.getElementById('goal'), r = g.getBoundingClientRect(), b = document.getElementById('bar').getBoundingClientRect(), f = g.firstElementChild.getBoundingClientRect();
  return { now: +g.getAttribute('aria-valuenow'), max: +g.getAttribute('aria-valuemax'), text: g.getAttribute('aria-valuetext'), role: g.getAttribute('role'), frac: f.width / r.width, inBar: r.top >= b.top && r.bottom <= b.bottom + 0.5 && r.left >= 0 && r.right <= innerWidth }; });
const near = (a, b, eps) => Math.abs(a - b) <= eps;

export const tests = [
  // ------------------------------------------------------------------------------------------ S2-10
  {
    name: 'w4c S2-10 a thin line under the bar shows how many cards are home, and says it in words',
    async run(t) {
      await baseSettings(t, { motion: 'reduced', tips: false });
      await t.seed(11); await t.game('newGame', { mode: 'klondike', draw: 1 });
      let g = await goal(t);
      t.equal([g.now, g.max, g.role, g.text], [0, 52, 'progressbar', '0 of 52 cards home'], 'a fresh Klondike deal has none home');
      t.expect(g.frac < 0.005 && g.inBar, 'the line is empty and sits inside the bar');
      await t.game('setState', nearWinKlondike());
      g = await goal(t);
      t.equal([g.now, g.max, g.text], [51, 52, '51 of 52 cards home'], 'a crafted position with 51 cards home says so');
      await t.page.waitForFunction(() => { const g = document.getElementById('goal'); return Math.abs(g.firstElementChild.getBoundingClientRect().width / g.getBoundingClientRect().width - 51 / 52) < 0.01; }, null, { timeout: 5000 });
      g = await goal(t); t.expect(g.inBar && near(g.frac, 51 / 52, 0.01), 'and the line is 51/52 full: ' + g.frac.toFixed(3));
      await t.checkLayout(); await shot(t, 'S2-10', 'goal-line');
      // a card going home adds one to the count and an Undo takes it back out
      const E = { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, E, { f0: ['AC'], t0: ['2C'], t1: ['KH'] }) });
      t.equal((await goal(t)).now, 1, 'one card home');
      await t.game('act', 'move', 't0', 'f0');
      await t.page.waitForFunction(() => document.getElementById('goal').getAttribute('aria-valuenow') === '2');
      await t.game('act', 'undo');
      await t.page.waitForFunction(() => document.getElementById('goal').getAttribute('aria-valuenow') === '1');
      t.equal([(await goal(t)).now, (await goal(t)).max], [1, 3], 'a card goes home, the count is 2, and an Undo takes it back out');
      // Spider counts the cards in finished runs out of two decks
      await t.game('newGame', { mode: 'spider', suits: 1 });
      g = await goal(t); t.equal([g.now, g.max], [0, 104], 'Spider is out of 104');
    },
  },
  // ------------------------------------------------------------------------------------------ S1-22
  {
    name: 'w4c S1-22 the bar, the buttons and the title do not double-tap zoom, and a pull on the page does not refresh',
    async run(t) {
      await baseSettings(t, { motion: 'reduced', tips: false });
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      const r = await t.page.evaluate(() => { const cs = (e) => getComputedStyle(e); return { html: cs(document.documentElement).overscrollBehaviorY, body: cs(document.body).overscrollBehaviorY, bodyTouch: cs(document.body).touchAction, undo: cs(document.getElementById('bUndo')).touchAction, hint: cs(document.getElementById('bHint')).touchAction, menu: cs(document.getElementById('bMenu')).touchAction, table: cs(document.getElementById('cv')).touchAction }; });
      t.equal([r.html, r.body], ['none', 'none'], 'no pull-to-refresh or scroll chaining');
      t.equal([r.bodyTouch, r.undo, r.hint, r.menu], ['manipulation', 'manipulation', 'manipulation', 'manipulation'], 'taps on the page and the buttons are plain taps');
      t.equal(r.table, 'none', 'the table keeps its own touch handling');
    },
  },
  // ------------------------------------------------------------------------------------------ S4-24
  {
    name: 'w4c S4-24 the picker captions clear the artwork and the title credit clears the bottom edge',
    async run(t) {
      await baseSettings(t, { motion: 'reduced', tips: false });
      await t.game('unlockAll');
      await t.seed(11); await t.game('newGame', { mode: 'klondike', draw: 1 });
      await t.game('scene', 'backs');
      await t.waitForStable();
      const m = await t.page.evaluate(() => [...document.querySelectorAll('#sheet .bk')].map((b) => { const c = b.querySelector('canvas').getBoundingClientRect(), l = b.querySelector('b').getBoundingClientRect(), r = b.getBoundingClientRect(), lh = parseFloat(getComputedStyle(b.querySelector('b')).lineHeight), fs = parseFloat(getComputedStyle(b.querySelector('b')).fontSize);
        return { name: b.querySelector('b').textContent, gap: l.top - c.bottom, below: r.bottom - l.bottom, lines: Math.round(l.height / lh), lhRatio: lh / fs }; }));
      t.expect(m.length >= 8, 'the picker lists the backs: ' + m.length);
      t.expect(m.every((x) => x.gap >= 5.5), 'every caption sits at least 6 px under its picture: ' + m.map((x) => x.gap.toFixed(1)).join(', '));
      t.expect(m.every((x) => x.below >= 9.5), 'and 10 px above the bottom of its button');
      t.expect(m.every((x) => x.lhRatio >= 1.2), 'a caption that wraps has room between its lines');
      await shot(t, 'S4-24', 'picker');
      await t.game('scene', 'title');
      await t.waitForStable();
      const c = await t.page.evaluate(() => { const r = document.querySelector('#title .credit').getBoundingClientRect(); return { bottom: r.bottom, h: innerHeight, cont: !document.getElementById('tCont').hidden }; });
      t.expect(c.cont, 'the title shows Continue, its tallest form');
      if (t.viewport === 'desktop') t.expect(c.h - c.bottom >= 12, 'the credit line is at least 12 px above the bottom edge at 1280x800: ' + (c.h - c.bottom).toFixed(1));
      await shot(t, 'S4-24', 'title');
    },
  },
  // ------------------------------------------------------------------------------------------ P-N04
  {
    name: 'w4c P-N04 a random or daily FreeCell deal steps past 11982, and typing it in says what it is',
    async run(t) {
      await baseSettings(t, { motion: 'reduced', tips: false });
      // The random picker: the first draw is the one that would give 11982, the second any other.
      await t.page.evaluate(() => { const seq = [11981 / 32000 + 1e-6, 0.5]; let i = 0; const orig = Math.random; window.__rand = orig; Math.random = () => (i < seq.length ? seq[i++] : orig()); });
      await t.game('newGame', { mode: 'freecell' });
      const d = (await t.state()).deal;
      t.expect(d !== 11982 && d >= 1 && d <= 32000, 'the random deal is not 11982 (got ' + d + ')');
      await t.page.evaluate(() => { Math.random = window.__rand; });
      // The daily: a date string that hashes to 11982 is dealt as 11983; every other deal is untouched.
      // (the date text is hashed, so any text will do: a fixed run of 300,000 of them has a fixed count, no chance in it)
      const c = await t.page.evaluate(() => { let a = 0, b = 0; for (let i = 0; i < 300000; i++) { const d = window.__game.dailyDealFor('freecell', {}, 'day-' + i); if (d === 11982) a++; else if (d === 11983) b++; } return [a, b]; });
      t.equal(c[0], 0, 'no daily deal is ever 11982');
      t.expect(c[1] >= 4, 'the days that would have been 11982 are dealt as 11983 (' + c[1] + ' of them)');
      // Typing it in is still allowed, with a plain note beside the box
      await t.game('scene', 'deal');
      await t.waitForStable();
      const note = () => t.page.evaluate(() => { const n = document.getElementById('dealNote'), r = n.getBoundingClientRect(); return { hidden: n.hidden, text: n.textContent, inside: r.right <= innerWidth && r.left >= 0 }; });
      let n = await note(); t.expect(n.hidden, 'no note for the number the game came with');
      await t.page.fill('#dealIn', '11982');
      n = await note(); t.expect(!n.hidden && n.inside, 'the note shows for 11982');
      t.equal(n.text, 'Deal 11,982 is the famously unsolved FreeCell deal. You can still play it.', 'and says what it is');
      await shot(t, 'P-N04', 'deal-note');
      await t.page.fill('#dealIn', '11983'); n = await note(); t.expect(n.hidden, 'the note goes for another number');
      await t.page.fill('#dealIn', '11982');
      await t.page.press('#dealIn', 'Enter');
      await t.page.waitForFunction(() => window.__game.getState().deal === 11982, null, { timeout: 5000 });
      t.equal((await t.state()).deal, 11982, 'the player who types 11982 gets it');
      // Klondike's box has no note
      await t.game('newGame', { mode: 'klondike' }); await t.game('scene', 'deal'); await t.page.fill('#dealIn', '11982');
      t.expect((await note()).hidden, 'only FreeCell has the note');
    },
  },
];
