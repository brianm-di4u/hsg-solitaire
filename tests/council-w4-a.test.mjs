// Council wave 4, batch A: saves, lifecycle and robustness.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-4', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };

const P = 'spa-solitaire:v1:';
const KEYS = ['settings', 'stats', 'meta', 'current'];
const rawAll = (t) => t.page.evaluate(([p, ks]) => Object.fromEntries(ks.map((k) => [k, localStorage.getItem(p + k)])), [P, KEYS]);
const reloadGame = async (t) => { await t.page.reload(); await t.page.waitForFunction(() => !!window.__game); };
const idle = (t) => t.page.waitForFunction(() => window.__game.isIdle(), null, { timeout: 15000 });

export const tests = [
  {
    name: 'w4a C4-01 a save from a newer version is left byte for byte as it was, and the player is told',
    async run(t) {
      // Make a real save, then mark its game state as written by version 2 of the game.
      await baseSettings(t);
      await t.seed(11); await t.game('newGame', { mode: 'klondike', draw: 1 });
      await t.game('act', 'draw');
      await t.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      const made = await rawAll(t);
      t.expect(made.current && made.stats !== undefined, 'a normal visit saves a game');
      await t.page.evaluate(([p, ks]) => {
        const c = JSON.parse(localStorage.getItem(p + 'current')); c.state.v = 2; localStorage.setItem(p + 'current', JSON.stringify(c));
        const s = JSON.parse(localStorage.getItem(p + 'settings')); s.volume = 0.31; s.table = 'marble'; localStorage.setItem(p + 'settings', JSON.stringify(s));
        localStorage.setItem(p + 'stats', JSON.stringify({ klondike1: { played: 77, won: 40, streak: 5, bestStreak: 9, recent: '' } }));
      }, [P, KEYS]);
      const before = await rawAll(t);
      // The old page would write its own game back as it unloads; this stands in for a browser that shows the newer save as it is.
      await t.page.evaluate(() => { Storage.prototype.setItem = () => {}; Storage.prototype.removeItem = () => {}; });

      await reloadGame(t);
      const s0 = await t.state();
      t.equal(s0.settings.volume, 0.6, 'it plays from defaults in memory, not from the newer settings');
      t.equal(s0.settings.table, 'felt', 'the table is the default too');
      const note = await t.page.locator('#tStore').textContent();
      t.expect(/not being saved/.test(note) && /newer version/.test(note), 'the title says this visit is not being saved, and why: ' + note);
      t.expect(await t.page.locator('#tStore').isVisible(), 'the notice is on screen');
      t.expect(/not being saved/.test(await t.page.locator('#toast').textContent()), 'a toast says it once');
      t.expect(await t.page.locator('#tCont').isHidden(), 'the newer game is not offered as Continue');

      // A visit that would normally save a great deal.
      await t.game('setSettings', { volume: 0.9, table: 'quapaw', motion: 'reduced' });
      await t.seed(12); await t.game('newGame', { mode: 'spider', suits: 1 });
      await t.game('act', 'draw'); await t.game('act', 'undo'); await t.game('act', 'draw');
      await t.page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
      await t.page.waitForFunction(() => window.__game.getState().moves >= 1, null, { timeout: 5000 });
      t.equal(await rawAll(t), before, 'every saved key is byte for byte the same after the visit');
      t.equal((await t.state()).settings.table, 'quapaw', 'the visit itself still uses what the player chose');

      // Back on a second visit nothing has been lost.
      await reloadGame(t);
      t.equal(await rawAll(t), before, 'and the same after another load');
      await shot(t, 'C4-01', 'notice');
    },
  },
  {
    name: 'w4a C4-01 a damaged or wrong-shaped save is still repaired as before, with no newer-version notice',
    async run(t) {
      await t.page.evaluate(([p]) => {
        localStorage.setItem(p + 'settings', '{not json');
        localStorage.setItem(p + 'current', JSON.stringify({ state: { v: 1, mode: 'klondike', piles: {} }, undo: [] }));
      }, [P]);
      await reloadGame(t);
      t.equal(await t.page.evaluate(([p]) => localStorage.getItem(p + 'settings'), [P]), null, 'the unreadable settings were set aside, as before');
      t.expect(await t.page.locator('#tStore').isHidden(), 'no newer-version notice for a damaged save');
      await t.page.locator('#tCont').waitFor({ state: 'hidden', timeout: 5000 });
      t.equal(await t.page.evaluate(([p]) => localStorage.getItem(p + 'current'), [P]), null, 'the wrong-shaped game was dropped, as before');
      await baseSettings(t, { volume: 0.42 });
      t.equal(await t.page.evaluate(([p]) => JSON.parse(localStorage.getItem(p + 'settings')).volume, [P]), 0.42, 'and saving works again');
    },
  },
  {
    name: 'w4a C4-03 a second tab that saves a different position gets one quiet line, in both orders',
    async run(t) {
      const A = t.page;
      const B = await A.context().newPage();
      try {
        const open = async (p) => { await p.goto(A.url()); await p.waitForFunction(() => !!window.__game); };
        const seen = (p) => p.evaluate(() => { window.__seen = 0; window.addEventListener('storage', () => { window.__seen++; }); });
        const flush = (p) => p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        const eventsAt = (p, n) => p.waitForFunction((n) => window.__seen >= n, n, { timeout: 10000 });
        const noteShown = (p) => p.locator('#tabNote').isVisible();
        const moves = (p) => p.evaluate(() => window.__game.getState().moves);

        await baseSettings(t, { tips: false });
        await t.seed(21); await t.game('newGame', { mode: 'klondike', draw: 1 });
        await A.evaluate(() => window.__game.act('draw')); await flush(A);
        await open(B); await B.evaluate(() => window.__game.setSettings({ tips: false, sound: false }));
        await B.locator('#tCont').click();
        t.equal(await moves(B), 1, 'the second tab picked up the same game');
        await seen(A); await seen(B);

        // The other tab saves the same position again: nothing could be lost, so nothing is said.
        await flush(B); await eventsAt(A, 1);
        t.expect(!(await noteShown(A)), 'no line for a write of the position this tab already shows');

        // Order 1: B moves on, A is told.
        await B.evaluate(() => window.__game.act('draw')); await flush(B); await eventsAt(A, 2);
        await A.locator('#tabNote').waitFor({ state: 'visible', timeout: 10000 });
        const text = await A.locator('#tabNote').textContent();
        t.expect(/another tab/.test(text) && /last move/.test(text), 'the line says the game is open twice and the last move is kept: ' + text);
        t.equal(await A.locator('#sr').textContent(), await A.locator('#tabNote span').textContent(), 'a screen reader is told the same words');
        t.expect(!(await noteShown(B)), 'the tab that wrote is not told');
        await shot(t, 'C4-03', 'note');
        t.expect((await A.evaluate(() => { const r = document.querySelector('#tabNote').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })), 'the line is fully on screen');

        // Another save while it is up does not say it again.
        await A.evaluate(() => { document.querySelector('#sr').textContent = ''; });
        await B.evaluate(() => window.__game.act('draw')); await flush(B); await eventsAt(A, 3);
        t.equal(await A.locator('#sr').textContent(), '', 'it is read out once, not on every save');

        // A moves: the line goes, and A's game is the one kept.
        await A.evaluate(() => window.__game.act('draw'));
        t.expect(!(await noteShown(A)), 'a move in this tab takes the line away');
        await flush(A);
        t.equal(await A.evaluate(() => JSON.parse(localStorage.getItem('spa-solitaire:v1:current')).state.moves), await moves(A), "the last mover's game is what is saved");

        // Order 2: A moves on, B is told; the button puts the line away and nothing was blocked.
        await B.evaluate(() => { window.__seen = 0; });
        await A.evaluate(() => window.__game.act('draw')); await flush(A); await eventsAt(B, 1);
        await B.locator('#tabNote').waitFor({ state: 'visible', timeout: 10000 });
        await B.locator('#tabNoteX').click();
        t.expect(!(await noteShown(B)), 'the button dismisses the line');
        const before = await moves(B); await B.evaluate(() => window.__game.act('draw'));
        t.equal(await moves(B), before + 1, 'play is not blocked');
        t.equal(await B.evaluate(() => window.__game.getState().scene), 'game', 'the table is still there');
      } finally { await B.close(); }
    },
  },
  {
    name: 'w4a C4-08 FreeCell and Yukon at desktop size carry a smaller Spa City mark, and a band under 9% still gets none',
    async run(t) {
      await t.game('unlockAll');
      await baseSettings(t, { sound: false, tips: false, motion: 'reduced', table: 'felt' });
      const marks = async () => { await t.page.waitForFunction(() => window.__game.placeMarks()); return t.game('placeMarks'); };
      const stageH = () => t.page.evaluate(() => document.getElementById('stage').clientHeight);
      const sizes = t.viewport === 'desktop' ? [[1280, 800]] : [[390, 844]];
      for (const [w, h] of sizes) {
        await t.page.setViewportSize({ width: w, height: h });
        for (const mode of ['klondike', 'freecell', 'yukon', 'spider']) {
          await t.game('newGame', { mode, opts: mode === 'spider' ? { suits: 1 } : {} }); await t.waitForStable();
          const q = await marks(), H = await stageH(), band = q.band.bottom - q.band.top;
          t.expect(q.emblem, w + 'x' + h + ' ' + mode + ': the empty felt has the mark (band ' + Math.round(band / H * 100) + '% of the table)');
          if (q.emblem && t.viewport === 'desktop') t.expect(q.emblem.cy - q.emblem.r >= q.band.top - 1 && q.emblem.cy + q.emblem.r * .6 <= q.band.bottom + 1, mode + ': and it sits inside the band');
          if (t.viewport === 'desktop' && (mode === 'freecell' || mode === 'yukon')) {
            t.expect(band >= H * .09 && band < H * .22, mode + ': this is the band that had no mark before, 9% to 22% (' + Math.round(band / H * 100) + '%)');
            t.expect(q.emblem.r < 50, mode + ': and the mark is a smaller one (radius ' + Math.round(q.emblem.r) + ' px)');
            await shot(t, 'C4-08', mode + '-mark');
          }
        }
      }
      // under 9% there is still no mark: Yukon at 1280x720 deals columns that reach the foot of the table
      await t.page.setViewportSize({ width: 1280, height: 720 });
      await t.game('newGame', { mode: 'yukon' }); await t.waitForStable();
      await t.page.waitForFunction(() => window.__game.placeMarks());
      const q = await t.game('placeMarks'), H = await stageH();
      t.expect(q.band.bottom - q.band.top < H * .09, 'this band is under 9% (' + Math.round((q.band.bottom - q.band.top) / H * 100) + '%)');
      t.expect(!q.emblem, 'and it has no mark');
      await t.page.setViewportSize(t.vp);
    },
  },
  {
    name: 'w4a C4-09 on a very short phone on its side every Play chip is above the fold, with Continue showing too',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { tips: false });
      await t.seed(31); await t.game('newGame', { mode: 'spider', suits: 1 });
      await t.game('act', 'draw'); // a game in progress, so the title offers Continue
      await t.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      for (const [w, h] of [[568, 320], [640, 360], [667, 375], [844, 390], [1280, 600]]) {
        await t.page.setViewportSize({ width: w, height: h });
        await t.game('scene', 'title');
        await t.page.waitForFunction(() => !document.getElementById('tCont').hidden);
        await t.waitForStable();
        const r = await t.page.evaluate(() => {
          const chips = [...document.querySelectorAll('#tiles .chip')].map((c) => c.getBoundingClientRect()), cont = document.getElementById('tCont').getBoundingClientRect();
          return { n: chips.length, lowest: Math.round(Math.max(...chips.map((c) => c.bottom))), cont: Math.round(cont.height), vh: innerHeight, wide: document.documentElement.scrollWidth > innerWidth };
        });
        t.equal(r.n, 8, w + 'x' + h + ': eight Play chips');
        t.expect(r.lowest <= r.vh, w + 'x' + h + ' with Continue: the lowest chip ends at ' + r.lowest + ', inside the ' + r.vh + ' px screen');
        t.expect(!r.wide, w + 'x' + h + ': nothing sideways');
        t.expect(r.cont >= 44, w + 'x' + h + ': Continue is still a full-size target (' + r.cont + ' px)');
        if (h <= 340) await shot(t, 'C4-09', 'title-' + w + 'x' + h);
      }
      await t.page.setViewportSize(t.vp);
    },
  },
  {
    name: 'w4a C4-10 Statistics has one row for wins without Undo or Hint, and Records shows graded wins only once there are some',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false });
      const put = (o) => t.page.evaluate(([p, o]) => { for (const k in o) localStorage.setItem(p + k, JSON.stringify(o[k])); }, [P, o]);
      const base = { played: 4, won: 3, streak: 1, bestStreak: 2, bestTimeMs: 60000, fewestMoves: 90, bestScore: 900, totalMs: 270000, assistedWon: 1, recent: '' };
      await put({ stats: { klondike1: base }, meta: { lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 3, daily: {}, unlock: { ids: [] } } });
      await reloadGame(t); await baseSettings(t, { sound: false, tips: false });
      await t.game('scene', 'stats');
      const rows = await t.page.locator('#sheet table.st tr').allTextContents();
      t.expect(rows.includes('Wins without Undo or Hint2 of 3'), 'one row: two of the three wins were unaided: ' + JSON.stringify(rows));
      t.equal(rows.filter((r) => /Undo or Hint/.test(r)).length, 1, 'and the near-duplicate row is gone');
      await shot(t, 'C4-10', 'stats');
      await t.checkLayout();
      await t.game('scene', 'records');
      let txt = await t.page.locator('#sheet').textContent();
      t.expect(!/Graded deals won/.test(txt), 'a player who never chose a grade sees no Graded line');
      await t.page.evaluate(([p]) => { const m = JSON.parse(localStorage.getItem(p + 'meta')); m.gradeWins = { easy: 0, medium: 2, hard: 1 }; localStorage.setItem(p + 'meta', JSON.stringify(m)); }, [P]);
      await reloadGame(t); await baseSettings(t, { sound: false, tips: false });
      await t.game('scene', 'records');
      txt = await t.page.locator('#sheet').textContent();
      t.expect(/Graded deals won: Easy 0 · Medium 2 · Hard 1/.test(txt), 'once a graded deal has been won the line is there: ' + txt.slice(0, 200));
      await shot(t, 'C4-10', 'records');
    },
  },
  {
    name: 'w4a C4-11 the line under Move a card by says what the choice does',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false });
      const note = () => t.page.locator('#tapNote').textContent();
      const want = { tap: /^Tap sends a card to its best pile$/, double: /^Double-tap sends a card/, drag: /^Drag only: a tap never moves a card$/ };
      for (const mode of ['double', 'drag', 'tap']) {
        await t.game('setSettings', { tapMove: mode });
        await t.game('scene', 'settings');
        t.expect(want[mode].test(await note()), 'opened with ' + mode + ' saved, the line reads: ' + await note());
      }
      for (const mode of ['double', 'drag', 'tap']) {
        await t.page.locator('[data-set="tapMove"][data-val="' + mode + '"]').click();
        t.expect(want[mode].test(await note()), 'choosing ' + mode + ' changes the line at once: ' + await note());
      }
      const texts = new Set();
      for (const mode of ['double', 'drag', 'tap']) { await t.page.locator('[data-set="tapMove"][data-val="' + mode + '"]').click(); texts.add(await note()); }
      t.equal(texts.size, 3, 'three choices, three different lines');
      await t.page.locator('[data-set="tapMove"][data-val="drag"]').click(); await shot(t, 'C4-11', 'settings');
      await t.checkLayout();
    },
  },
  {
    name: 'w4a C4-12 the ambient table layer repaints at 10 a second at most',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });
      await t.game('newGame', { mode: 'klondike' });
      await t.page.waitForFunction(() => window.__game.ambient().running);
      t.equal((await t.game('ambient')).fps, 10, 'the layer is set to ten repaints a second');
      // A timer cannot fire faster than it was set, however idle the machine: over any window the count has a ceiling.
      const rate = await t.page.evaluate(() => new Promise((done) => { const f0 = window.__game.ambient().frames, t0 = performance.now(); setTimeout(() => done((window.__game.ambient().frames - f0) / ((performance.now() - t0) / 1000)), 1500); }));
      t.expect(rate <= 11.5, 'no more than about 10 frames a second: ' + rate.toFixed(1));
      t.expect((await t.game('ambient')).painted > 0, 'and it still paints');
    },
  },
];
