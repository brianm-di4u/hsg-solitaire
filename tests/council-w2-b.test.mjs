// Council wave 2, batch B: winnable deals (S3-01).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-2', 'shots');
const SET = 'spa-solitaire:v1:settings';
const reloadGame = async (t) => { await t.page.reload(); await t.page.waitForFunction(() => !!window.__game); };
const shot = async (t, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, 'S3-01-' + name + '-' + t.viewport + '.png') }); };
// the variants that have a search, and how the game names them
const KEYS = { klondike1: ['klondike', { draw: 1 }], klondike3: ['klondike', { draw: 3 }], yukon: ['yukon', {}], spider1: ['spider', { suits: 1 }], spider2: ['spider', { suits: 2 }] };
const full = (o) => Object.assign({ draw: 1, suits: 1 }, o);

// The solver and the attempt rule, cut out of index.html, for tests that need no browser.
function loadSolver() {
  const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  const cut = (a, b) => html.slice(html.indexOf(a), html.indexOf(b));
  const code = 'const isObj=(v)=>v&&typeof v==="object";\n' + cut('function mulberry32', 'function todayStr') + cut('const isRed =', '// --- Rule primitives ---') +
    cut('const makeSolver', '// --- Dead-end search') + cut('const WIN_SEARCH', 'let dealPending') + 'return { newState, makeSolver, WIN_SEARCH, candidateDeal, fnv1a };';
  return new Function(code)();
}

// Replay the solver's winning line through the game's own rules, move by move, with auto-move off. The solver also sends
// safe cards home by itself (an ace or deuce, or both opposite colours close behind), so the replay does the same after each move.
const replayInPage = async ([mode, opts, deal, budget]) => {
  const g = window.__game, r = g.solve(mode, opts, deal, budget);
  if (r.result !== 'won') return { result: r.result };
  await g.newGame({ mode, draw: opts.draw, suits: opts.suits, deal });
  const rank = (n) => 'A23456789TJQK'.indexOf(n[n.length - 2]) + 1, suit = (n) => 'CDHS'.indexOf(n[n.length - 1]), spider = mode === 'spider';
  const sendHome = () => {
    for (let moved = !spider; moved;) {
      moved = false;
      const p = g.getState().piles, count = [0, 0, 0, 0];
      for (const id of ['f0', 'f1', 'f2', 'f3']) if (p[id].length) count[suit(p[id][0])] = p[id].length;
      for (const from of ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 'waste']) {
        const pile = p[from]; if (!pile || !pile.length) continue;
        const n = pile[pile.length - 1]; if (n[0] === '#') continue;
        const red = suit(n) === 1 || suit(n) === 2, a = red ? Math.min(count[0], count[3]) : Math.min(count[1], count[2]);
        if (count[suit(n)] === rank(n) - 1 && (rank(n) <= 2 || a >= rank(n) - 1)) {
          for (const f of ['f0', 'f1', 'f2', 'f3']) if (g.act('move', from, f, 1).ok) { moved = true; break; }
          if (moved) break;
        }
      }
    }
  };
  sendHome();
  let step = 0;
  for (const m of r.moves) {
    step++;
    const draw = spider ? m[0] < 0 : m[1] === -2;
    let ok;
    if (draw) ok = g.act('draw').ok;
    else {
      const from = m[1] < 0 ? 'waste' : 't' + m[1], len = g.getState().piles[from].length;
      if (!spider && m[3] < 0) { ok = false; for (const f of ['f0', 'f1', 'f2', 'f3']) if (g.act('move', from, f, 1).ok) { ok = true; break; } }
      else ok = g.act('move', from, 't' + m[3], m[1] < 0 ? 1 : len - m[2]).ok;
    }
    if (!ok) return { result: 'bad', step, why: JSON.stringify(m) + ' refused' };
    sendHome();
  }
  return { result: 'won', steps: step, used: r.used, won: g.getState().won };
};

export const tests = [
  {
    name: 'w2b S3-01 the solver gives the same answer however its work is cut into slices',
    node: true,
    async run(t) {
      const G = loadSolver();
      let compared = 0;
      for (const [key, [mode, o]] of Object.entries(KEYS)) {
        const opts = full(o), budget = G.WIN_SEARCH[key][0];
        for (let d = 1; d <= 6; d++) {
          const deal = d * 7919;
          const run = (chunk) => {
            const sv = G.makeSolver(G.newState(mode, opts, deal, null), budget); let r = 'more', calls = 0;
            while (r === 'more' && calls++ < 1e6) r = sv.step(chunk);
            return r + ':' + sv.used;
          };
          const whole = run(1e9), tiny = run(1), odd = run(37);
          t.equal(tiny, whole, key + ' deal ' + deal + ' one position at a time = whole search');
          t.equal(odd, whole, key + ' deal ' + deal + ' slices of 37 = whole search');
          compared++;
        }
      }
      t.expect(compared >= 30, 'compared ' + compared + ' searches');
      const sv = G.makeSolver(G.newState('klondike', full({}), 5, null), 1); sv.step(1e9);
      t.expect(sv.used <= 1, 'a limit of one position stops after one: ' + sv.used);
      t.equal(G.candidateDeal(77, 0, 'x'), 77, 'attempt zero is the deal itself');
      t.expect(G.candidateDeal(77, 1, 'x') !== 77 && G.candidateDeal(77, 1, 'x') === G.candidateDeal(5, 1, 'x'), 'later attempts depend on the tag and attempt only');
    },
  },
  {
    name: 'w2b S3-01 every deal the solver calls won is won move by move under the game\'s own rules',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced', autoFoundation: 'off' });
      const cfg = await t.game('winConfig');
      for (const [key, [mode, o]] of Object.entries(KEYS)) {
        const opts = full(o), budget = cfg[key][0];
        let proven = 0, tried = 0;
        for (let d = 1; d <= 70 && proven < 5; d++) {
          tried++;
          const r = await t.page.evaluate(replayInPage, [mode, opts, d * 7919, budget * 3]);
          if (r.result === 'won') { t.expect(r.won === true, key + ' deal ' + d * 7919 + ' reached a won game after ' + r.steps + ' steps'); proven++; }
          else if (r.result === 'bad') t.fail(key + ' deal ' + d * 7919 + ' step ' + r.step + ': ' + r.why);
        }
        t.log(key + ': ' + proven + ' proven wins replayed out of ' + tried + ' deals tried');
        t.expect(proven >= 3, key + ' has proven wins to replay: ' + proven);
      }
    },
  },
  {
    name: 'w2b S3-01 the setting is off by default, saved, and a plain deal is dealt exactly as before',
    async run(t) {
      await t.page.evaluate((k) => localStorage.removeItem(k), SET); await reloadGame(t);
      let s = await t.state();
      t.equal(s.settings.winnable, false, 'Winnable deals only starts off');
      await t.seed(4242); await t.game('newGame', { mode: 'klondike', draw: 1 });
      s = await t.state();
      t.equal(s.deal, 4242, 'with the setting off the random deal is the seed itself');
      t.equal(s.winnable, false, 'not marked winnable');
      // settings from before this wave have no such key
      await t.page.evaluate(([k, v]) => localStorage.setItem(k, v), [SET, JSON.stringify({ sound: false, volume: 0.4, back: 'deco' })]); await reloadGame(t);
      s = await t.state(); t.equal(s.settings.winnable, false, 'an old save gets the default'); t.equal(s.settings.back, 'deco', 'and keeps what it had');
      await t.page.evaluate(([k, v]) => localStorage.setItem(k, v), [SET, JSON.stringify({ winnable: 'yes' })]); await reloadGame(t);
      t.equal((await t.state()).settings.winnable, false, 'a damaged value falls back');
      await t.game('setSettings', { winnable: true }); await reloadGame(t);
      t.equal((await t.state()).settings.winnable, true, 'switching it on survives a reload');
    },
  },
  {
    name: 'w2b S3-01 with the setting on a random deal is one the solver won, found by the fixed attempt rule',
    async run(t) {
      const G = loadSolver();
      await baseSettings(t, { motion: 'reduced' });
      await t.game('setSettings', { winnable: true });
      const cfg = await t.game('winConfig');
      for (const [key, [mode, o]] of Object.entries(KEYS)) {
        const opts = full(o), [budget, tries] = cfg[key];
        let marked = 0;
        for (const seed of [31, 777, 13113]) {
          await t.seed(seed);
          const res = await t.page.evaluate(([m, op]) => window.__game.newGame(Object.assign({ mode: m }, op)), [mode, opts]);
          const s = await t.state();
          t.equal(res.deal, s.deal, key + ' newGame reports the deal it dealt');
          if (!s.winnable) { t.expect(s.deal === seed, key + ' seed ' + seed + ': a failed search deals the plain shuffle'); continue; }
          marked++;
          let at = -1; for (let a = 0; a < tries && at < 0; a++) if (G.candidateDeal(seed, a, String(seed)) === s.deal) at = a;
          t.expect(at >= 0, key + ' seed ' + seed + ': the deal is in the fixed sequence (attempt ' + (at + 1) + ')');
          for (let a = 0; a < at; a++) t.expect((await t.game('solve', mode, opts, G.candidateDeal(seed, a, String(seed)), budget)).result !== 'won', key + ' seed ' + seed + ': earlier attempt ' + (a + 1) + ' would not have won');
          t.equal((await t.game('solve', mode, opts, s.deal, budget)).result, 'won', key + ' seed ' + seed + ': the dealt deal solves again inside the limit');
          await t.seed(seed); await t.page.evaluate(([m, op]) => window.__game.newGame(Object.assign({ mode: m }, op)), [mode, opts]);
          t.equal((await t.state()).deal, s.deal, key + ' seed ' + seed + ' lands on the same deal twice');
        }
        t.expect(marked >= 2, key + ' found winnable deals for most seeds: ' + marked + '/3');
      }
    },
  },
  {
    name: 'w2b S3-01 FreeCell and four-suit Spider have no winnable option and say so',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('setSettings', { winnable: true });
      const cfg = await t.game('winConfig');
      t.expect(!cfg.spider4 && !cfg.freecell, 'no search for spider4 or freecell');
      await t.seed(99); await t.game('newGame', { mode: 'spider', suits: 4 });
      let s = await t.state(); t.equal(s.deal, 99, 'a four-suit random deal is the plain shuffle'); t.equal(s.winnable, false, 'not marked winnable');
      await t.seed(99); await t.game('newGame', { mode: 'freecell' });
      s = await t.state(); t.equal(s.deal, 99, 'a FreeCell random deal is the plain numbered deal'); t.equal(s.winnable, false, 'not marked winnable');
      for (const o of [{ mode: 'spider', suits: 4 }, { mode: 'freecell' }]) {
        await t.game('newGame', Object.assign({ daily: '2026-11-13' }, o));
        t.equal((await t.state()).winnable, false, o.mode + ' daily is not marked winnable');
      }
      await t.game('scene', 'daily');
      const txt = await t.page.evaluate(() => document.querySelector('#sheet').textContent);
      t.expect(/FreeCell and four-suit Spider/.test(txt), 'the Daily deals sheet names the exceptions');
      await t.game('scene', 'settings');
      const set = await t.page.evaluate(() => document.querySelector('#sheet').textContent);
      t.expect(/Winnable deals only/.test(set) && /FreeCell or four-suit Spider/.test(set), 'the Settings row names the exceptions');
    },
  },
  {
    name: 'w2b S3-01 daily deals are winnable, the same for everyone, new each day, and a restart keeps them',
    async run(t) {
      const G = loadSolver();
      await baseSettings(t, { motion: 'reduced' });
      const cfg = await t.game('winConfig');
      for (const [key, [mode, o]] of Object.entries(KEYS)) {
        const opts = full(o), budget = cfg[key][0];
        const day = (d) => t.page.evaluate(([m, op, dd]) => window.__game.newGame(Object.assign({ mode: m, daily: dd }, op)), [mode, opts, d]);
        await day('2026-11-13'); const a = await t.state();
        await t.reload();
        await day('2026-11-13'); const b = await t.state();
        t.equal(a.deal, b.deal, key + ' the daily is the same deal on two loads');
        t.equal(a.winnable, true, key + ' the daily is marked winnable');
        t.equal(a.daily, '2026-11-13', key + ' keeps its date');
        const tag = '2026-11-13|' + key, base = 1 + G.fnv1a(tag) % 2000000000;
        const seq = (n) => G.candidateDeal(base, n, tag);
        let at = -1; for (let n = 0; n < 160 && at < 0; n++) if (seq(n) === a.deal) at = n;
        t.expect(at >= 0, key + ' the daily is attempt ' + (at + 1) + ' of date|key|attempt');
        for (let n = 0; n < at; n++) t.expect((await t.game('solve', mode, opts, seq(n), budget)).result !== 'won', key + ' attempt ' + (n + 1) + ' would not have won');
        t.equal((await t.game('solve', mode, opts, a.deal, budget)).result, 'won', key + ' the daily deal solves again inside the limit');
        await day('2026-11-14'); const c = await t.state();
        t.expect(c.deal !== a.deal, key + ' the next day brings a different deal');
        await day('2026-11-13');
        await t.page.click('#bMenu'); await t.page.click('#sheet [data-a="restart"]');
        await t.waitForStable();
        const d = await t.state();
        t.equal(d.deal, a.deal, key + ' restart replays the same deal'); t.equal(d.winnable, true, key + ' restart keeps the mark'); t.equal(d.daily, '2026-11-13', key + ' restart keeps the daily');
      }
    },
  },
  {
    name: 'w2b S3-01 searching never holds the page for long, and the table says so while it works',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('setSettings', { winnable: true });
      await t.page.evaluate(() => { window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch (e) { /* no long task API */ } });
      let pending = 0, sawPill = 0; const ms = [];
      for (const [, [mode, o]] of Object.entries(KEYS)) {
        for (let i = 0; i < 6; i++) {
          const r = await t.page.evaluate(async ([m, op, n]) => {
            window.__game.seed(1000 + n * 37);
            const el = document.querySelector('#dealing'), t0 = performance.now(), out = window.__game.newGame(Object.assign({ mode: m }, op));
            const isP = !!out && typeof out.then === 'function', pill = isP && el.classList.contains('on');
            const res = await out;
            return { isP, pill, after: el.classList.contains('on'), ok: res.ok, ms: Math.round(performance.now() - t0) };
          }, [mode, full(o), i]);
          t.equal(r.ok, true, mode + ' deal arrives'); t.equal(r.after, false, mode + ' the notice is gone once the deal is dealt');
          ms.push(r.ms);
          if (r.isP) { pending++; if (r.pill) sawPill++; }
        }
      }
      const longs = await t.page.evaluate(() => window.__long), worst = Math.max(0, ...longs);
      ms.sort((a, b) => a - b);
      t.log('30 searches: median ' + ms[15] + ' ms, slowest ' + ms[29] + ' ms; long tasks over 50 ms: ' + longs.length + ', worst ' + worst + ' ms; ' + pending + ' ran past the first slice');
      t.expect(worst <= 150, 'no single task over about 150 ms (a 45 ms slice, a step, then dealing the cards; the machine may be loaded), worst ' + worst);
      t.equal(sawPill, pending, 'every search that ran past the first slice showed the notice');
      t.expect(pending >= 1, 'at least one search was slow enough to test the notice: ' + pending);
    },
  },
  {
    name: 'w2b S3-01 settings row, winnable mark and the working notice at both sizes',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('setSettings', { winnable: true });
      await t.page.evaluate(() => window.__game.newGame({ mode: 'klondike', draw: 3, daily: '2026-11-13' }));
      const sub = await t.page.evaluate(() => document.querySelector('#modeSub').textContent);
      t.expect(/winnable/.test(sub), 'the HUD says winnable: ' + sub);
      const ov = await t.page.evaluate(() => ({ right: document.querySelector('#ttl').getBoundingClientRect().right, statusLeft: document.querySelector('#status').getBoundingClientRect().left, sw: document.querySelector('#modeSub').scrollWidth, cw: document.querySelector('#modeSub').clientWidth }));
      t.expect(ov.right <= ov.statusLeft + 1, 'title block stays clear of the score block');
      t.expect(ov.sw <= ov.cw + 1, 'the sub-label is not cut off: ' + ov.sw + ' in ' + ov.cw);
      await shot(t, 'hud');
      await t.page.evaluate(() => document.querySelector('#dealing').classList.add('on'));
      await shot(t, 'working-notice');
      const box = await t.page.evaluate(() => { const r = document.querySelector('#dealing').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth, h: r.height }; });
      t.expect(box.l >= 0 && box.r <= box.w, 'the notice fits the screen'); t.expect(box.h < 60, 'and stays on one line: ' + box.h);
      await t.game('scene', 'daily'); await shot(t, 'working-notice-sheet');
      const above = await t.page.evaluate(() => Number(getComputedStyle(document.querySelector('#dealing')).zIndex) > Number(getComputedStyle(document.querySelector('#modal')).zIndex));
      t.expect(above, 'the notice sits above an open sheet');
      await t.page.evaluate(() => document.querySelector('#dealing').classList.remove('on'));
      await t.game('scene', 'settings');
      await t.page.evaluate(() => { const r = [...document.querySelectorAll('#sheet .set')].find((e) => /Winnable/.test(e.textContent)); r.scrollIntoView({ block: 'center' }); });
      await shot(t, 'settings');
      const tg = await t.page.evaluate(() => { const b = [...document.querySelectorAll('#sheet .set')].find((e) => /Winnable/.test(e.textContent)).querySelector('.tog'); const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, on: b.getAttribute('aria-pressed') }; });
      t.equal(tg.on, 'true', 'the switch shows on'); t.expect(tg.h >= 28 && tg.w >= 44, 'the switch is a usable size: ' + tg.w + 'x' + tg.h);
      await t.page.click('#sheet [data-close]').catch(() => {});
      await t.game('scene', 'daily'); await shot(t, 'daily');
      await t.checkLayout({ allowScrollY: true });
    },
  },
];
