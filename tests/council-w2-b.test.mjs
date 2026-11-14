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
const KEYS = { klondike1: ['klondike', { draw: 1 }], klondike3: ['klondike', { draw: 3 }], yukon: ['yukon', {}], freecell: ['freecell', {}], spider1: ['spider', { suits: 1 }], spider2: ['spider', { suits: 2 }] };

// The solver, cut out of index.html, for tests that need no browser.
function loadSolver() {
  const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  const cut = (a, b) => html.slice(html.indexOf(a), html.indexOf(b));
  const code = 'const isObj=(v)=>v&&typeof v==="object";\n' + cut('function mulberry32', 'function todayStr') + cut('const isRed =', '// --- Rule primitives ---') +
    cut('const solCode', '// --- Dead-end search') + cut('const WIN_SEARCH', 'let dealPending') + 'return { newState, makeSolver, WIN_SEARCH, WIN_DAILY_TRIES, candidateDeal, fnv1a };';
  return new Function('now', code)(() => performance.now());
}

// Replay a solver's winning line through the game's own rules, with auto-move off, move by move.
const replayInPage = async ([mode, opts, deal, budget]) => {
  const g = window.__game;
  const r = g.solve(mode, opts, deal, budget);
  if (r.result !== 'won') return { result: r.result, used: r.used };
  await g.newGame({ mode, draw: opts.draw, suits: opts.suits, deal });
  const R = 'A23456789TJQK', Su = 'CDHS', cells = ['c0', 'c1', 'c2', 'c3'], founds = ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'];
  let step = 0;
  for (const m of r.path) {
    step++;
    if (m.draw) { if (!g.act('draw').ok) return { result: 'bad', step, why: 'draw refused' }; continue; }
    let from = m.from, to = m.to, ok = false;
    const note = R[(m.card & 15) - 1] + Su[m.card >> 4];
    if (from === 'cell') { const st = g.getState(); from = cells.find((id) => st.piles[id].length && st.piles[id][0] === note); }
    if (to === 'cell') { const st = g.getState(); to = cells.find((id) => !st.piles[id].length); }
    if (to === 'found') { for (const id of founds) { if (g.act('move', from, id, 1).ok) { ok = true; break; } } }
    else ok = g.act('move', from, to, m.n).ok;
    if (!ok) return { result: 'bad', step, why: JSON.stringify(m) + ' refused' };
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
        const opts = Object.assign({ draw: 1, suits: 1 }, o), budget = G.WIN_SEARCH[key].budget;
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
      t.expect(compared >= 36, 'compared ' + compared + ' searches');
      // the limit is a count of positions: a limit of 1 position can never search more than that
      const sv = G.makeSolver(G.newState('klondike', { draw: 1, suits: 1 }, 5, null), 1); sv.step(1e9);
      t.expect(sv.used <= 1, 'a limit of one position stops after one: ' + sv.used);
    },
  },
  {
    name: 'w2b S3-01 every deal the solver calls won is won move by move under the game\'s own rules',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced', autoFoundation: 'off' });
      const cfg = await t.game('winConfig');
      for (const [key, [mode, o]] of Object.entries(KEYS)) {
        const opts = Object.assign({ draw: 1, suits: 1 }, o), budget = cfg.search[key].budget;
        let proven = 0, tried = 0;
        for (let d = 1; d <= 60 && proven < 5; d++) {
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
      t.equal(await t.game('lastSearch'), null, 'no search ran');
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
      await baseSettings(t, { motion: 'reduced' });
      await t.game('setSettings', { winnable: true });
      const cfg = await t.game('winConfig');
      for (const [key, [mode, o]] of Object.entries(KEYS)) {
        const opts = Object.assign({ draw: 1, suits: 1 }, o);
        let marked = 0;
        for (const seed of [31, 777, 13113]) {
          await t.seed(seed);
          const res = await t.page.evaluate(([m, op]) => window.__game.newGame(Object.assign({ mode: m }, op)), [mode, opts]);
          const s = await t.state(), info = await t.game('lastSearch');
          t.equal(res.deal, s.deal, key + ' newGame reports the deal it dealt');
          if (!info.found) { t.expect(s.winnable === false && s.deal === seed, key + ' seed ' + seed + ': a failed search deals the plain shuffle'); continue; }
          marked++;
          t.equal(s.winnable, true, key + ' seed ' + seed + ' is marked winnable');
          const rule = []; for (let a = 0; a < info.attempts; a++) rule.push(await t.game('dealCandidate', mode, opts, seed, String(seed), a));
          t.equal(s.deal, rule[info.attempts - 1], key + ' seed ' + seed + ': the deal is attempt ' + info.attempts + ' of the fixed sequence');
          const earlier = []; for (let a = 0; a < info.attempts - 1; a++) earlier.push(await t.game('solve', mode, opts, rule[a], cfg.search[key].budget));
          t.expect(earlier.every((e) => e.result !== 'won'), key + ' seed ' + seed + ': no earlier attempt would have won');
          const again = await t.game('solve', mode, opts, s.deal, cfg.search[key].budget);
          t.equal(again.result, 'won', key + ' seed ' + seed + ': the dealt deal solves again inside the limit');
          // same seed, same deal
          await t.seed(seed); await t.page.evaluate(([m, op]) => window.__game.newGame(Object.assign({ mode: m }, op)), [mode, opts]);
          t.equal((await t.state()).deal, s.deal, key + ' seed ' + seed + ' lands on the same deal twice');
        }
        t.expect(marked >= 2, key + ' found winnable deals for most seeds: ' + marked + '/3');
      }
      t.expect((await t.state()).opts !== undefined, 'game still running');
    },
  },
  {
    name: 'w2b S3-01 four-suit Spider has no winnable option and says so',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('setSettings', { winnable: true });
      const cfg = await t.game('winConfig');
      t.expect(!cfg.search.spider4, 'no search for spider4');
      await t.seed(99); await t.game('newGame', { mode: 'spider', suits: 4 });
      let s = await t.state(); t.equal(s.deal, 99, 'a four-suit random deal is the plain shuffle'); t.equal(s.winnable, false, 'not marked winnable');
      await t.game('newGame', { mode: 'spider', suits: 4, daily: '2026-11-13' });
      s = await t.state(); t.equal(s.winnable, false, 'the four-suit daily is not marked winnable');
      await t.game('scene', 'daily');
      const txt = await t.page.evaluate(() => document.querySelector('#sheet').textContent);
      t.expect(/Spider with four suits/.test(txt), 'the Daily deals sheet names the exception');
      await t.game('scene', 'settings');
      const set = await t.page.evaluate(() => document.querySelector('#sheet').textContent);
      t.expect(/Winnable deals only/.test(set) && /four suits/.test(set), 'the Settings row names the exception');
    },
  },
  {
    name: 'w2b S3-01 daily deals are winnable, the same for everyone, new each day, and a restart keeps them',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      const cfg = await t.game('winConfig');
      for (const [key, [mode, o]] of Object.entries(KEYS)) {
        const opts = Object.assign({ draw: 1, suits: 1 }, o);
        const day = (d) => t.page.evaluate(([m, op, dd]) => window.__game.newGame(Object.assign({ mode: m, daily: dd }, op)), [mode, opts, d]);
        await day('2026-11-13'); const a = await t.state(), info = await t.game('lastSearch');
        await t.reload();
        await day('2026-11-13'); const b = await t.state();
        t.equal(a.deal, b.deal, key + ' the daily is the same deal on two loads');
        t.equal(a.winnable, true, key + ' the daily is marked winnable');
        t.equal(a.daily, '2026-11-13', key + ' keeps its date');
        if (info.attempts > 1) t.equal(a.deal, await t.game('dealCandidate', mode, opts, 0, '2026-11-13|' + key, info.attempts - 1), key + ' the daily is attempt ' + info.attempts + ' of date|key|attempt');
        t.equal((await t.game('solve', mode, opts, a.deal, cfg.search[key].budget)).result, 'won', key + ' the daily deal solves again inside the limit');
        await day('2026-11-14'); const c = await t.state();
        t.expect(c.deal !== a.deal, key + ' the next day brings a different deal');
        // restart from the menu keeps the deal and the mark
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
      let pending = 0, sawPill = 0, worst = 0;
      for (const [key, [mode, o]] of Object.entries(KEYS)) {
        const opts = Object.assign({ draw: 1, suits: 1 }, o);
        for (let i = 0; i < 6; i++) {
          const r = await t.page.evaluate(async ([m, op, n]) => {
            window.__game.seed(1000 + n * 37);
            const el = document.querySelector('#dealing'), out = window.__game.newGame(Object.assign({ mode: m }, op));
            const isP = !!out && typeof out.then === 'function', pill = isP && el.classList.contains('on');
            const res = await out;
            return { isP, pill, after: el.classList.contains('on'), ok: res.ok };
          }, [mode, opts, i]);
          t.equal(r.ok, true, key + ' deal arrives'); t.equal(r.after, false, key + ' the notice is gone once the deal is dealt');
          if (r.isP) { pending++; if (r.pill) sawPill++; }
        }
      }
      const longs = await t.page.evaluate(() => window.__long); worst = Math.max(0, ...longs);
      t.log('long tasks over 50 ms during 36 searches: ' + longs.length + ', worst ' + worst + ' ms; ' + pending + ' searches ran past the first slice');
      t.expect(worst <= 130, 'no single stretch of solver work over about 130 ms (first slice 45 ms + one step), worst ' + worst);
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
      const ov = await t.page.evaluate(() => { const b = document.querySelector('#ttl').getBoundingClientRect(), st = document.querySelector('#status').getBoundingClientRect(); return { right: b.right, statusLeft: st.left, sw: document.querySelector('#modeSub').scrollWidth, cw: document.querySelector('#modeSub').clientWidth }; });
      t.expect(ov.right <= ov.statusLeft + 1, 'title block stays clear of the score block');
      await shot(t, 'hud');
      await t.page.evaluate(() => document.querySelector('#dealing').classList.add('on'));
      await shot(t, 'working-notice');
      const box = await t.page.evaluate(() => { const r = document.querySelector('#dealing').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
      t.expect(box.l >= 0 && box.r <= box.w, 'the notice fits the screen');
      await t.game('scene', 'daily'); await shot(t, 'working-notice-sheet');
      const top = await t.page.evaluate(() => { const p = document.querySelector('#dealing'), m = document.querySelector('#modal'); return getComputedStyle(p).zIndex > getComputedStyle(m).zIndex || Number(getComputedStyle(p).zIndex) > Number(getComputedStyle(m).zIndex); });
      t.expect(top, 'the notice sits above an open sheet');
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
