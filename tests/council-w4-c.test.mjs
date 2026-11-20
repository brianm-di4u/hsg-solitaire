// Council wave 4, batch C: difficulty, progression and records; feedback, teaching and help; sound.
// S2-10 the goal line, S1-22 touch behaviour, S4-24 picker and credit spacing, P-N04 FreeCell deal 11982, C4-04 volume curve,
// S5-14 Redo cues, P-N06 the foundation ladder. (S4-10, S4-17 and P-N05 are checks only: see the batch report.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.HS_ARTIFACT_DIR ? path.resolve(process.env.HS_ARTIFACT_DIR, 'wave-4', 'shots') : path.resolve(HERE, '..', 'screenshots', 'council-waves', 'wave-4', 'shots');
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
      const measureBks = () => t.page.evaluate(() => [...document.querySelectorAll('#sheet .bk')].filter((b) => !b.closest('[hidden]')).map((b) => { const c = b.querySelector('canvas').getBoundingClientRect(), l = b.querySelector('b').getBoundingClientRect(), r = b.getBoundingClientRect(), lh = parseFloat(getComputedStyle(b.querySelector('b')).lineHeight), fs = parseFloat(getComputedStyle(b.querySelector('b')).fontSize);
        return { name: b.querySelector('b').textContent, gap: l.top - c.bottom, below: r.bottom - l.bottom, lines: Math.round(l.height / lh), lhRatio: lh / fs }; }));
      const mBacks = await measureBks();
      await t.page.click('#btab-tables');
      await t.waitForStable();
      const mTables = await measureBks();
      const m = [...mBacks, ...mTables];
      t.expect(mBacks.length === 12 && mTables.length === 6, 'the 2-tab picker lists 12 backs and 6 tables: ' + mBacks.length + '+' + mTables.length);
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
  // ------------------------------------------------------------------------------------------ C4-04
  {
    name: 'w4c C4-04 a new profile gets the squared volume curve; a profile that exists keeps the straight one',
    viewports: ['desktop'],
    async run(t) {
      const gain = (v, c) => t.page.evaluate(([v, c]) => window.__game.volumeGain(v, c), [v, c]);
      const stored = () => t.page.evaluate((p) => JSON.parse(localStorage.getItem(p + 'settings')), P);
      // fresh: nothing stored, so the profile is new
      await t.page.evaluate(() => localStorage.clear()); await reloadGame(t);
      let s = (await t.state()).settings;
      t.equal([s.volumeCurve, s.volume], ['square', 0.75], 'a new profile is on the squared curve, slider at 0.75');
      t.equal((await stored()).volumeCurve, 'square', 'and it is written once, at the start');
      t.equal(await gain(0.5, s.volumeCurve), 0.25, 'half way is a quarter of the gain');
      t.equal(await gain(0.75, s.volumeCurve), 0.5625, 'the starting slider gives 0.5625, close to the old 0.6');
      await t.page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }))); // the first gesture starts the sound
      await t.page.waitForFunction(() => window.__game.masterGain() !== null, null, { timeout: 8000 });
      t.equal(await t.game('masterGain'), 0.5625, 'the real master gain is the squared value');
      await t.game('setSettings', { volume: 0.5 });
      t.equal(await t.game('masterGain'), 0.25, 'and follows the slider through the curve');
      t.equal((await stored()).volumeCurve, 'square', 'the setting stays what it was');
      // an existing wave-3 profile: settings and stats stored, no curve
      const old = { sound: true, volume: 0.4, music: true, sfx: true };
      await t.page.evaluate(([p, o]) => { localStorage.clear(); localStorage.setItem(p + 'settings', JSON.stringify(o)); localStorage.setItem(p + 'stats', JSON.stringify({ klondike1: { played: 3, won: 1 } })); }, [P, old]);
      await reloadGame(t);
      s = (await t.state()).settings;
      t.equal([s.volumeCurve, s.volume], ['linear', 0.4], 'a profile that already exists stays on the straight line with its own slider');
      t.equal(await gain(0.4, s.volumeCurve), 0.4, 'its loudness at the saved position is exactly what it was');
      t.expect((await stored()).volumeCurve !== 'square', 'nothing has switched it');
      await t.page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true })));
      await t.page.waitForFunction(() => window.__game.masterGain() !== null, null, { timeout: 8000 });
      t.equal(await t.game('masterGain'), 0.4, 'the real master gain is the saved slider position, not its square');
      await t.game('setSettings', { volume: 0.5 });
      t.equal(await t.game('masterGain'), 0.5, 'and moving the slider is as it always was');
      await reloadGame(t);
      t.equal((await t.state()).settings.volumeCurve, 'linear', 'a later visit does not switch it either');
    },
  },
  {
    name: 'w4c C4-04 the volume curve reaches the render: half on the squared curve is the same loudness as a quarter on the straight one, and full volume stays clear of clipping on both',
    viewports: ['desktop'],
    async run(t) {
      const render = (name, secs, over) => t.page.evaluate(([n, s, o]) => window.__game.audioRender(n, s, false, o), [name, secs, over]);
      // The title piece is seeded, so every render of it is the same sound: the levels differ only by the gain.
      const sq = await render('title', 8, { volume: 0.5, volumeCurve: 'square' }), lin = await render('title', 8, { volume: 0.25, volumeCurve: 'linear' }), half = await render('title', 8, { volume: 0.5, volumeCurve: 'linear' });
      t.expect(near(sq.rms / lin.rms, 1, 0.03), 'squared 0.5 and straight 0.25 render the same level: ' + sq.rms + ' and ' + lin.rms);
      t.expect(half.rms / sq.rms > 1.8, 'straight 0.5 is about twice as loud as squared 0.5: ' + (half.rms / sq.rms).toFixed(2));
      const MAX = { volume: 1, musicVol: 1, ambVol: 1 };
      for (const curve of ['linear', 'square']) {
        const mix = await render('mix', 12, Object.assign({ volumeCurve: curve }, MAX));
        t.expect(mix.peak < 0.95, 'the busiest moment at full volume stays under 0.95 on the ' + curve + ' curve: ' + mix.peak);
      }
    },
  },
  // ------------------------------------------------------------------------------------------ S5-14
  {
    name: 'w4c S5-14 Redo plays the cue of the move it puts back: a rank note for a card home, a thud for a column, the run cue for a Spider run',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced', tips: false });
      const E = { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };
      const redoCue = async () => { await t.game('act', 'undo'); await cuesNow(t, true); await t.game('act', 'redo'); const c = await cuesNow(t, true); return c.filter((x) => ['found', 'place', 'run', 'undo'].includes(x.name)).map((x) => [x.name, x.arg]); };
      // a card home: the deuce of clubs goes up on its ace
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, E, { f0: ['AC'], t0: ['2C'], t1: ['KH', '9S'] }) });
      await t.game('act', 'move', 't0', 'f0');
      t.equal(await redoCue(), [['found', 2]], 'Redo of a card going home plays the foundation note for its rank (a deuce)');
      // a column move: the nine of spades on the red ten is a plain place
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, E, { t0: ['TH'], t1: ['KS', '9S'] }) });
      await t.game('act', 'move', 't1', 't0');
      t.equal(await redoCue(), [['place', 1]], 'Redo of a column move is the plain thud');
      // a higher rank: the queen of hearts home reaches for a higher note than the deuce
      const base = { f1: ['AH', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', 'TH', 'JH'], t0: ['QH'], t1: ['KS'] };
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, E, base) });
      await t.game('act', 'move', 't0', 'f1');
      t.equal(await redoCue(), [['found', 12]], 'a queen sings the twelfth step');
      // Spider: a run that completes and leaves
      const run = ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'];
      await t.game('setState', { mode: 'spider', opts: { suits: 1 }, piles: { stock: [], t0: run, t1: ['AS'], t2: ['KH'] } });
      await t.game('act', 'move', 't1', 't0');
      t.equal((await t.state()).runs, 1, 'the Spider run left the table');
      t.equal(await redoCue(), [['run', undefined]], 'Redo of a finished Spider run plays the run cue');
    },
  },
  // ------------------------------------------------------------------------------------------ P-N06
  {
    name: 'w4c P-N06 the foundation cue climbs with the rank but stays out of the shrillest band: the King is at 1.32 kHz and no partial lands above 1.5 kHz',
    viewports: ['desktop'],
    async run(t) {
      const tones = [];
      for (let r = 1; r <= 13; r++) tones.push(await t.page.evaluate((r) => window.__game.cueTones('found', r), r));
      const lead = tones.map((x) => x.find((y) => y.type === 'triangle').f);
      t.expect(lead.every((f, i) => i === 0 || f > lead[i - 1]), 'the pitch still rises with every rank: ' + lead.map((f) => Math.round(f)).join(' '));
      t.expect(Math.max(...lead) < 1400, 'the King is under 1.4 kHz: ' + Math.round(lead[12]) + ' Hz (it was 2637)');
      t.expect(lead[0] > 250, 'and the Ace is not left in the mud: ' + Math.round(lead[0]) + ' Hz');
      const all = tones.flat().map((x) => x.f);
      t.expect(Math.max(...all) <= 1500, 'no tone of the cue, partials included, lands above 1.5 kHz: ' + Math.round(Math.max(...all)) + ' Hz (it was 5274)');
      t.expect(tones[0].length === 2 && tones[12].length === 1, 'low ranks keep their bright octave partial, the top ones drop it: ' + tones[0].length + ' and ' + tones[12].length + ' tones');
    },
  },
];
