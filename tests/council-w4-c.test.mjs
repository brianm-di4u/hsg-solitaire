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
];
