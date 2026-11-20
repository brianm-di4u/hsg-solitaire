// Council wave 4, batch A: saves, lifecycle and robustness.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.HS_ARTIFACT_DIR ? path.resolve(process.env.HS_ARTIFACT_DIR, 'wave-4', 'shots') : path.resolve(HERE, '..', 'screenshots', 'council-waves', 'wave-4', 'shots');
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
        const hideTab = (p) => p.evaluate(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
          document.dispatchEvent(new Event('visibilitychange'));
          delete document.hidden;
        });
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

        // W6-S6-01: hiding or closing a superseded tab without moving never overwrites the newer save.
        const bMoves = await moves(B);
        await hideTab(A); await flush(A);
        t.equal(await A.evaluate(() => JSON.parse(localStorage.getItem('spa-solitaire:v1:current')).state.moves), bMoves, 'hiding/closing a superseded tab preserves the active tab save');

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
        const aMoves = await moves(A);
        await hideTab(B); await flush(B);
        t.equal(await B.evaluate(() => JSON.parse(localStorage.getItem('spa-solitaire:v1:current')).state.moves), aMoves, 'dismissing the banner still keeps hide/close from overwriting the active tab');
        const before = await moves(B); await B.evaluate(() => window.__game.act('draw'));
        t.equal(await moves(B), before + 1, 'play is not blocked');
        t.equal(await B.evaluate(() => window.__game.getState().scene), 'game', 'the table is still there');

        // Title-idle tab (S still non-null in memory after Change game) superseded by B never overwrites B on hide/close.
        await A.evaluate(() => { window.__seen = 0; window.__game.scene('title'); });
        await A.waitForFunction(() => window.__game.getState().scene === 'title', null, { timeout: 10000 });
        await B.evaluate(() => {
          window.__game.newGame({ mode: 'freecell', deal: 42 });
          const m = window.__game.legalMoves()[0];
          window.__game.act('move', m.from, m.to, m.count);
        });
        await flush(B); await eventsAt(A, 1);
        t.expect(!(await noteShown(A)), 'Title stays clean while marking the idle tab superseded');
        await hideTab(A); await flush(A);
        const savedAfterTitle = await B.evaluate(() => JSON.parse(localStorage.getItem('spa-solitaire:v1:current')).state);
        t.equal([savedAfterTitle.mode, savedAfterTitle.deal, savedAfterTitle.moves], ['freecell', 42, 1], 'hiding/closing a Title-idle tab never overwrites the active tab save');
      } finally { await B.close(); }
    },
  },
  {
    name: 'w4a W6-S6-01 immediate Change game within 300 ms shows Continue, and superseded/Title-idle hide/close preserves newer saves',
    async run(t) {
      await baseSettings(t, { tips: false, motion: 'reduced' });
      await t.seed(27); await t.game('newGame', { mode: 'klondike', draw: 1 });
      await idle(t);
      // Clear current so only the <300 ms pending saveTimer from the move below can populate it.
      const quick = await t.page.evaluate(([p]) => {
        localStorage.removeItem(p + 'current');
        window.__game.act('draw');
        document.getElementById('bMenu').click();
        document.querySelector('#sheet [data-a="title"]').click();
        const saved = localStorage.getItem(p + 'current');
        return {
          scene: window.__game.getState().scene,
          contHidden: document.getElementById('tCont').hidden,
          savedMoves: saved ? JSON.parse(saved).state.moves : -1,
        };
      }, [P]);
      t.equal(quick.scene, 'title', 'Menu -> Change game returns to Title');
      t.equal(quick.contHidden, false, 'Continue is visible immediately even within 300 ms of a move');
      t.equal(quick.savedMoves, 1, 'pending saveTimer flushed synchronously before Title checked loadSaved()');

      // Resume and verify simulated cross-tab superseding protects newer save on hide/close in active, dismissed, and Title-idle states.
      await t.page.locator('#tCont').click(); await idle(t);
      t.equal((await t.state()).moves, 1, 'Continue resumes the flushed move');
      const newerActive = await t.page.evaluate(([p]) => {
        const cur = JSON.parse(localStorage.getItem(p + 'current'));
        cur.state.moves = 4;
        const raw = JSON.stringify(cur);
        localStorage.setItem(p + 'current', raw);
        window.dispatchEvent(new StorageEvent('storage', { key: p + 'current', newValue: raw, storageArea: localStorage }));
        const noteVisible = !document.getElementById('tabNote').hidden;
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
        delete document.hidden;
        window.dispatchEvent(new Event('pagehide'));
        const afterHide = JSON.parse(localStorage.getItem(p + 'current')).state.moves;
        document.getElementById('tabNoteX').click();
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
        delete document.hidden;
        window.dispatchEvent(new Event('pagehide'));
        const afterDismissHide = JSON.parse(localStorage.getItem(p + 'current')).state.moves;
        return { noteVisible, afterHide, afterDismissHide };
      }, [P]);
      t.equal(newerActive, { noteVisible: true, afterHide: 4, afterDismissHide: 4 }, 'superseded active tab (with or without banner dismissed) never overwrites newer save');

      // Making a move reclaims save ownership; then returning to Title and receiving a newer save stays superseded on hide/close.
      const titleGuarded = await t.page.evaluate(([p]) => {
        window.__game.act('draw');
        window.dispatchEvent(new Event('pagehide'));
        const ownMoves = JSON.parse(localStorage.getItem(p + 'current')).state.moves;
        window.__game.scene('title');
        const other = JSON.parse(localStorage.getItem(p + 'current'));
        other.state.deal = 999; other.state.moves = 7;
        const raw = JSON.stringify(other);
        localStorage.setItem(p + 'current', raw);
        window.dispatchEvent(new StorageEvent('storage', { key: p + 'current', newValue: raw, storageArea: localStorage }));
        const noteHiddenOnTitle = document.getElementById('tabNote').hidden;
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
        delete document.hidden;
        window.dispatchEvent(new Event('pagehide'));
        const finalState = JSON.parse(localStorage.getItem(p + 'current')).state;
        return { ownMoves, noteHiddenOnTitle, finalDeal: finalState.deal, finalMoves: finalState.moves };
      }, [P]);
      t.equal(titleGuarded, { ownMoves: 2, noteHiddenOnTitle: true, finalDeal: 999, finalMoves: 7 }, 'Title-idle tab stays quiet and never overwrites a newer save on hide/close');
    },
  },
  {
    name: 'w4a C4-08 FreeCell carries a smaller bottom-band Spa City mark, Yukon side-rail uses its right-rail nook, and a band under 9% still gets none',
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
          if (q.emblem && t.viewport === 'desktop') {
            if (mode === 'yukon') {
              t.expect(q.emblem.inNook && q.nook, 'desktop Yukon side-rail places the Spa City mark cleanly in its right-rail nook: ' + JSON.stringify(q));
              t.expect(q.emblem.cy - q.emblem.r >= q.nook.top - 1 && q.emblem.cy + q.emblem.r * .6 <= q.nook.bottom + 1, 'yukon: and it sits inside the nook');
              await shot(t, 'C4-08', 'yukon-mark');
            } else {
              t.expect(q.emblem.cy - q.emblem.r >= q.band.top - 1 && q.emblem.cy + q.emblem.r * .6 <= q.band.bottom + 1, mode + ': and it sits inside the band');
            }
          }
          if (t.viewport === 'desktop' && mode === 'freecell') {
            t.expect(band >= H * .09 && band < H * .22, mode + ': this is the band that had no mark before, 9% to 22% (' + Math.round(band / H * 100) + '%)');
            t.expect(q.emblem.r < 50, mode + ': and the mark is a smaller one (radius ' + Math.round(q.emblem.r) + ' px)');
            await shot(t, 'C4-08', mode + '-mark');
          }
        }
      }
      // under 9% without a side-rail nook there is still no mark: Yukon top-row (classic) at 1280x720 reaches the foot of the table
      await t.page.setViewportSize({ width: 1280, height: 720 });
      await t.game('setSettings', { layout: 'classic' });
      await t.game('newGame', { mode: 'yukon' }); await t.waitForStable();
      await t.page.waitForFunction(() => window.__game.placeMarks());
      const q = await t.game('placeMarks'), H = await stageH();
      t.expect(q.band.bottom - q.band.top < H * .09, 'this band is under 9% (' + Math.round((q.band.bottom - q.band.top) / H * 100) + '%)');
      t.expect(!q.emblem, 'and it has no mark');
      await t.game('setSettings', { layout: 'side' });
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
    name: 'w4a C4-10 Bathhouse Ledger By Game has one row for wins without Undo or Hint, and Overview shows graded wins only once there are some',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false });
      const put = (o) => t.page.evaluate(([p, o]) => { for (const k in o) localStorage.setItem(p + k, JSON.stringify(o[k])); }, [P, o]);
      const base = { played: 4, won: 3, streak: 1, bestStreak: 2, bestTimeMs: 60000, fewestMoves: 90, bestScore: 900, totalMs: 270000, assistedWon: 1, recent: '' };
      await put({ stats: { klondike1: base }, meta: { lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 3, daily: {}, unlock: { ids: [] } } });
      await reloadGame(t); await baseSettings(t, { sound: false, tips: false });
      await t.game('scene', 'stats');
      t.equal(await t.page.locator('#mT').textContent(), 'Bathhouse Ledger', 'stats alias opens Bathhouse Ledger');
      const rows = await t.page.locator('#sheet table.st tr').allTextContents();
      t.expect(rows.includes('Wins without Undo or Hint2 of 3'), 'one row: two of the three wins were unaided: ' + JSON.stringify(rows));
      t.equal(rows.filter((r) => /Undo or Hint/.test(r)).length, 1, 'and the near-duplicate row is gone');
      await shot(t, 'C4-10', 'stats');
      await t.checkLayout();
      await t.game('scene', 'records');
      t.equal(await t.page.locator('#sheet .journey .jstop').count(), 8, 'Overview shows the 8-bathhouse 21-Bath Row Stamp Journey');
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
    name: 'w4a C4-11 the line under Move a card by says what each of the four choices does',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false });
      const note = () => t.page.locator('#tapNote').textContent();
      const want = { tap: /^Tap sends a card to its best pile$/, double: /^Double-tap sends a card/, select: /^Select & place: tap a card to pick it up/, drag: /^Drag only: a tap never moves a card$/ };
      for (const mode of ['double', 'select', 'drag', 'tap']) {
        await t.game('setSettings', { tapMove: mode });
        await t.game('scene', 'settings');
        t.expect(want[mode].test(await note()), 'opened with ' + mode + ' saved, the line reads: ' + await note());
      }
      for (const mode of ['double', 'select', 'drag', 'tap']) {
        await t.page.locator('[data-set="tapMove"][data-val="' + mode + '"]').click();
        t.expect(want[mode].test(await note()), 'choosing ' + mode + ' changes the line at once: ' + await note());
      }
      const texts = new Set();
      for (const mode of ['double', 'select', 'drag', 'tap']) { await t.page.locator('[data-set="tapMove"][data-val="' + mode + '"]').click(); texts.add(await note()); }
      t.equal(texts.size, 4, 'four choices, four different lines');
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
  {
    name: 'w4a S2-13 starting a new game over a saved deal asks first (the title stays, nothing is abandoned by accident)',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false });
      await t.seed(41); await t.game('newGame', { mode: 'klondike', draw: 1 });
      await t.game('act', 'draw');
      await t.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      await reloadGame(t); // the page being left writes its game once more as it unloads, so the saved text is read after the reload
      const saved = await t.page.evaluate(([p]) => localStorage.getItem(p + 'current'), [P]);
      t.equal(await t.page.evaluate(() => window.__game.getState().scene), 'title', 'a returning player still lands on the title');
      await t.page.locator('#tCont').waitFor({ state: 'visible', timeout: 10000 });
      for (const name of ['Klondike: Draw 3', 'FreeCell: Play', 'Spider: 4 suits']) {
        await t.page.getByRole('button', { name, exact: true }).click();
        await t.page.locator('#sheet [data-a="yes"]').waitFor({ state: 'visible', timeout: 10000 });
        t.expect(/Abandon this deal\?/.test(await t.page.locator('#sheet').textContent()), name + ': a question first: the game in progress would be lost');
        t.equal(await t.page.evaluate(([p]) => localStorage.getItem(p + 'current'), [P]), saved, name + ': the saved deal is untouched while it is asked');
        await shot(t, 'S2-13', 'ask-' + name.split(':')[0].toLowerCase());
        await t.page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await t.page.waitForFunction(() => !window.__game.getState().modal, null, { timeout: 10000 });
      }
      t.equal(await t.page.evaluate(([p]) => localStorage.getItem(p + 'current'), [P]), saved, 'Cancel leaves the saved deal as it was');
      await t.page.locator('#tCont').click();
      t.equal((await t.state()).deal, JSON.parse(saved).state.deal, 'and Continue brings it back');
    },
  },
  {
    name: 'w4a W4-B01 responsive single-CTA Title, 3-tab Gameplay-first Settings, modalStack[], 3x3 Menu, non-destructive Daily & post-Win Ticket recall (W6-S1-04, W6-S2-01, W6-S2-05)',
    async run(t) {
      await baseSettings(t, { sound: true, tips: false, motion: 'reduced' });
      // 1. Fresh 0-win Title: ONE solid primary CTA (Klondike Draw 1) + Start here + 5 text-only #tRow pills + spectrum badges
      await t.game('scene', 'title');
      await t.waitForStable();
      const fresh = await t.page.evaluate(() => {
        const solids = [...document.querySelectorAll('#title button.solid')].filter((b) => !b.hidden && b.getClientRects().length > 0);
        const start = document.getElementById('tStartHere');
        const badges = [...document.querySelectorAll('.tile .tbadge')].map((x) => x.textContent.trim());
        const rowBtns = [...document.querySelectorAll('#tRow button')];
        const tag = document.querySelector('#title .tag');
        return {
          solidCount: solids.length,
          solidText: solids[0] ? solids[0].textContent.trim() : '',
          startVisible: !!(start && !start.hidden && start.textContent.trim() === 'Start here'),
          badges,
          rowCount: rowBtns.length,
          rowSvgs: document.querySelectorAll('#tRow svg').length,
          tagBg: tag ? getComputedStyle(tag).backgroundColor : '',
        };
      });
      t.equal([fresh.solidCount, fresh.solidText, fresh.startVisible], [1, 'Draw 1', true], '0-win Title has exactly ONE solid primary CTA (Draw 1) with Start here');
      t.equal(fresh.badges, ['Relaxed', 'Pure Skill', 'Two-Deck', 'Tactical'], 'each mode carries a short spectrum badge separate from .tsub');
      t.equal([fresh.rowCount, fresh.rowSvgs], [5, 0], '#tRow is trimmed to 5 text-only pills');
      t.expect(fresh.tagBg && fresh.tagBg !== 'rgba(0, 0, 0, 0)', '#title .tag keeps a dark scrim behind the tagline: ' + fresh.tagBg);

      // 1b. Mobile 390x844 portrait fold: Bathhouse Row landmark visible above h1, all 4 modes' Play chips + #tDaily <= 844
      if (t.viewport === 'mobile') {
        await t.page.setViewportSize({ width: 390, height: 844 });
        await t.game('scene', 'title');
        await t.waitForStable();
        const port = await t.page.evaluate(() => {
          const tags = window.__game.heroTags().tags;
          const h1 = document.querySelector('#title h1').getBoundingClientRect();
          const chips = [...document.querySelectorAll('#tiles .chip')].map((c) => c.getBoundingClientRect());
          const daily = document.getElementById('tDaily').getBoundingClientRect();
          return {
            tagText: tags[0] ? tags[0].text : null,
            tagY: tags[0] ? Math.round(tags[0].y) : -1,
            h1Top: Math.round(h1.top),
            lowestChip: Math.round(Math.max(...chips.map((c) => c.bottom))),
            dailyBottom: Math.round(daily.bottom),
            vh: innerHeight,
          };
        });
        t.equal(port.tagText, 'CENTRAL AVENUE · BATHHOUSE ROW', 'portrait hero retains CENTRAL AVENUE · BATHHOUSE ROW landmark');
        t.expect(port.tagY > 0 && port.tagY < port.h1Top, 'portrait hero tag clears h1 cleanly: ' + JSON.stringify(port));
        t.expect(port.lowestChip <= port.vh && port.dailyBottom <= port.vh, '390x844 portrait keeps all 4 modes + Daily deals above fold: ' + JSON.stringify(port));
        await t.page.setViewportSize(t.vp);
      }

      // 2. Dynamic #tCont becomes SOLE solid CTA when a game is saved + landscape 341-520px keeps full 'Central Avenue'
      await t.seed(47);
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      await t.game('act', 'draw');
      await t.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      await t.game('scene', 'title');
      await t.waitForStable();
      const savedTitle = await t.page.evaluate(() => {
        const solids = [...document.querySelectorAll('#title button.solid')].filter((b) => !b.hidden && b.getClientRects().length > 0);
        return {
          solidCount: solids.length,
          solidId: solids[0] ? solids[0].id : '',
          contText: document.getElementById('tCont').textContent.trim(),
        };
      });
      t.equal([savedTitle.solidCount, savedTitle.solidId], [1, 'tCont'], 'saved deal promotes #tCont to sole solid CTA on Title');
      t.expect(/Continue Klondike Draw 1 · Move 1/.test(savedTitle.contText), 'dynamic #tCont shows mode, variant and move count: ' + savedTitle.contText);

      if (t.viewport === 'desktop') {
        for (const [w, h] of [[640, 360], [667, 375], [844, 390]]) {
          await t.page.setViewportSize({ width: w, height: h });
          await t.game('scene', 'title');
          await t.waitForStable();
          const land = await t.page.evaluate(() => {
            const subs = [...document.querySelectorAll('.tile .tsub')].map((e) => ({ txt: e.textContent.trim(), vis: getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0 }));
            const chips = [...document.querySelectorAll('#tiles .chip')].map((c) => c.getBoundingClientRect().bottom);
            const cont = document.getElementById('tCont').getBoundingClientRect();
            return { subs, lowestChip: Math.round(Math.max(...chips)), contBottom: Math.round(cont.bottom), vh: innerHeight };
          });
          t.expect(land.subs.every((x) => x.vis) && land.subs.some((x) => x.txt.includes('Central Avenue')), w + 'x' + h + ' keeps 1-line .tsub with full Central Avenue: ' + JSON.stringify(land.subs));
          t.expect(land.lowestChip <= land.vh && land.contBottom <= land.vh, w + 'x' + h + ' fits #tCont + all Play chips inside viewport: ' + JSON.stringify(land));
        }
        await t.page.setViewportSize(t.vp);
        await t.game('scene', 'title');
      }

      // 3. 3-tab Gameplay-first Settings, in-place tipsAgain, mobile 2-line sliders, .is-muted, & modalStack[] multi-hop
      await t.page.focus('#tSet');
      await t.page.keyboard.press('Enter');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'settings');
      const setFirst = await t.page.evaluate(() => ({
        activeTab: document.querySelector('#sheet [data-stab][aria-selected="true"]').dataset.stab,
        firstLabel: document.querySelector('#spanel-gameplay .set label').childNodes[0].textContent.trim(),
        audioHidden: document.getElementById('spanel-audio').hidden,
      }));
      t.equal(setFirst, { activeTab: 'gameplay', firstLabel: 'Deal fairness', audioHidden: true }, 'Settings opens on Gameplay tab with Deal fairness first');

      await t.page.evaluate(() => { document.getElementById('sheet').scrollTop = 60; });
      const stBefore = await t.page.evaluate(() => document.getElementById('sheet').scrollTop);
      await t.page.click('[data-a="tipsAgain"]');
      const afterTips = await t.page.evaluate(() => ({
        scrollTop: document.getElementById('sheet').scrollTop,
        toast: document.getElementById('toast').textContent,
        checked: document.querySelector('[data-tog="tips"]').getAttribute('aria-checked'),
      }));
      t.equal(afterTips.scrollTop, stBefore, 'Show tips again patches in place without resetting scrollTop');
      t.equal(afterTips.checked, 'true', 'Show tips again flips tips switch on in place');
      t.expect(/Tips reset/i.test(afterTips.toast), 'Show tips again confirms via toast: ' + afterTips.toast);
      await t.game('setSettings', { tips: false });

      // Audio tab: #sfxVol slider, mobile 2-line width check, & .is-muted dimming
      await t.page.click('#stab-audio');
      const audioTab = await t.page.evaluate(() => {
        const sfx = document.getElementById('sfxVol');
        const row = document.getElementById('row-sfxVol');
        return {
          hasSfxVol: !!sfx && !document.getElementById('spanel-audio').hidden,
          inputW: sfx ? Math.round(sfx.getBoundingClientRect().width) : 0,
          rowW: row ? Math.round(row.getBoundingClientRect().width) : 0,
        };
      });
      t.equal(audioTab.hasSfxVol, true, 'Audio tab exposes #sfxVol slider');
      if (t.viewport === 'mobile') {
        t.expect(audioTab.inputW >= audioTab.rowW * 0.85, 'mobile Audio slider stacks full width (' + audioTab.inputW + ' / ' + audioTab.rowW + ')');
      }
      await t.page.click('[data-tog="sound"]');
      t.equal(await t.page.evaluate(() => document.getElementById('row-sfxVol').classList.contains('is-muted')), true, 'muting master sound dims dependent audio rows');
      await t.page.click('[data-tog="sound"]');

      // Multi-hop modalStack[]: Title (#tSet) -> Settings (Table & Comfort, scrolled) -> Backs (reseed in-place preserving equipped back) -> Close -> Settings restored -> Close -> #tSet focused
      await t.game('unlockAll');
      await t.game('setSettings', { back: 'lozenge' });
      await t.page.click('#stab-comfort');
      await t.page.evaluate(() => { document.getElementById('sheet').scrollTop = 90; });
      const comfortScroll = await t.page.evaluate(() => document.getElementById('sheet').scrollTop);
      await t.page.click('[data-a="backs"]');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'backs');
      t.equal(await t.game('modalStackDepth'), 1, 'modalStack pushes Settings underneath Backs');
      await t.page.locator('[data-a="reseed"]').scrollIntoViewIfNeeded();
      await t.page.evaluate(() => { const s = document.getElementById('sheet'); if (s.scrollTop === 0) s.scrollTop = 80; });
      const backsScroll = await t.page.evaluate(() => document.getElementById('sheet').scrollTop);
      await t.page.click('[data-a="reseed"]');
      const afterReseed = await t.page.evaluate(() => ({
        back: window.__game.getState().settings.back,
        scrollTop: document.getElementById('sheet').scrollTop,
      }));
      t.equal(afterReseed, { back: 'lozenge', scrollTop: backsScroll }, 'Skylight Reshuffle patches swatch in place without changing equipped back or scrollTop');
      await t.page.click('#sheet [data-close]');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'settings');
      const restoredSet = await t.page.evaluate(() => ({
        tab: document.querySelector('#sheet [data-stab][aria-selected="true"]').dataset.stab,
        scrollTop: document.getElementById('sheet').scrollTop,
      }));
      t.equal(restoredSet, { tab: 'comfort', scrollTop: comfortScroll }, 'closing Backs pops modalStack back to Table & Comfort preserving scrollTop');
      await t.page.click('#sheet [data-close]');
      await t.page.waitForFunction(() => !window.__game.getState().modal);
      t.equal(await t.page.evaluate(() => document.activeElement && document.activeElement.id), 'tSet', 'final close restores focus to Title opener #tSet');

      // 4. Inline Menu variant strip (confirm-gated), #mMute, 'M' hotkey, & Deal # draft preservation across Confirm -> Cancel
      await t.page.click('#tCont');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'game');
      await t.page.click('#bMenu');
      await t.page.click('#sheet [data-mvar-mode="klondike"][data-mvar-draw="3"]');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'confirm');
      t.expect(/Klondike · Draw 1.*1 move/i.test(await t.page.locator('#sheet').textContent()), 'variant switch over live deal confirm-gates naming active deal & moves');
      await t.page.click('#sheet [data-close]');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'menu');

      await t.page.click('#sheet [data-a="deal"]');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'deal');
      await t.page.fill('#dealIn', '12345');
      await t.page.click('#sheet [data-a="goDeal"]');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'confirm');
      await t.page.click('#sheet [data-close]');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'deal');
      t.equal(await t.page.inputValue('#dealIn'), '12345', 'Deal # typed draft survives Confirm -> Cancel via modalStack');
      await t.page.click('#sheet [data-close]'); // back to menu
      await t.page.waitForFunction(() => window.__game.getState().modal === 'menu');

      const snd0 = (await t.state()).settings.sound;
      await t.page.click('#mMute');
      t.equal((await t.state()).settings.sound, !snd0, '#mMute toggles sound inside Menu');
      await t.page.click('#sheet [data-a="resume"]');
      await t.page.keyboard.press('m');
      t.equal((await t.state()).settings.sound, snd0, 'M hotkey toggles mute/unmute from game table');

      // 5. Non-destructive active Daily ('In progress · Resume') vs stale 'Attempted'
      await t.game('newGame', { mode: 'klondike', draw: 1, daily: true });
      await t.game('act', 'draw');
      await t.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      await t.game('scene', 'daily');
      const d0Btn = t.page.locator('#sheet [data-daily="0"]');
      t.expect(/In progress · Resume/.test(await d0Btn.textContent()), 'active live Daily reads In progress · Resume');
      await d0Btn.click();
      await t.page.waitForFunction(() => window.__game.getState().scene === 'game');
      t.equal((await t.state()).moves, 1, 'clicking active Daily resumes non-destructively without wiping moves');
      await t.game('newGame', { mode: 'freecell', deal: 12 });
      await t.game('scene', 'daily');
      t.expect(/Attempted/.test(await t.page.locator('#sheet [data-daily="0"]').textContent()), 'abandoned earlier Daily reads Attempted');
      await t.page.click('#sheet [data-close]');

      // 6. Post-Win Bath Ticket recall via #bAuto ('Ticket') and Menu ('View Bath Ticket')
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 401, moves: 25 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 10000 });
      await t.page.click('#sheet [data-close]');
      await t.page.waitForFunction(() => !window.__game.getState().modal);
      const autoBtn = await t.page.evaluate(() => { const b = document.getElementById('bAuto'); return { text: b.textContent.trim(), disabled: b.disabled }; });
      t.equal(autoBtn, { text: 'Ticket', disabled: false }, 'dismissed win sheet turns #bAuto into enabled Ticket recall');
      await t.page.click('#bAuto');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win');
      await t.page.click('#sheet [data-close]');
      await t.page.click('#bMenu');
      t.equal(await t.page.locator('#sheet [data-a="ticket"]').textContent(), 'View Bath Ticket', 'post-Win Menu primary CTA offers View Bath Ticket');
      await t.page.click('#sheet [data-a="ticket"]');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win');
    },
  },
  {
    name: 'w4a W4-B01 desktop fine-pointer hover signifiers, sfxVol attenuation & length-scaled toasts (W6-S2-06)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'reduced' });
      // 1. Desktop hover signifiers on Klondike stock & Yukon movable stack + idle-safe rAF + pointerleave clear
      await t.game('setState', { mode: 'yukon', piles: { f0: [], f1: [], f2: [], f3: [], t0: ['KS', 'QH', '4C'], t1: ['KD'], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      const lay = await t.game('getLayout');
      const card = lay.piles.t0.cards[0]; // KS with 2 cards above it — movable run of 3 in Yukon (getLayout already returns viewport coords)
      await t.page.mouse.move(card.x + card.w / 2, card.y + 12);
      await t.waitForStable();
      const hv = await t.page.evaluate(() => ({ state: window.__game.hoverState(), cursor: document.getElementById('cv').style.cursor }));
      t.equal(hv.state, { pile: 't0', index: 0, count: 3, cursor: 'grab' }, 'Yukon hover highlights entire pickable 3-card run');
      t.equal(hv.cursor, 'grab', 'movable stack shows grab cursor');
      await t.game('frameStats', true);
      await t.page.waitForTimeout(250);
      t.equal((await t.game('frameStats')).frames, 0, 'stationary hover stays 100% idle-safe (0 rAF frames)');
      await t.page.evaluate(() => document.getElementById('cv').dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse', bubbles: true })));
      const hvAfter = await t.page.evaluate(() => ({ state: window.__game.hoverState(), cursor: document.getElementById('cv').style.cursor }));
      t.equal(hvAfter, { state: null, cursor: '' }, 'pointerleave clears hover highlight and cursor');

      // Stock hover shows pointer cursor
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: ['AS', '2S'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['KH'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      const kLay = await t.game('getLayout'), st = kLay.piles.stock;
      await t.page.mouse.move(st.x + st.w / 2, st.y + st.h / 2);
      const hvStock = await t.page.evaluate(() => ({ state: window.__game.hoverState(), cursor: document.getElementById('cv').style.cursor }));
      t.equal([hvStock.state && hvStock.state.pile, hvStock.cursor], ['stock', 'pointer'], 'stock hover reports pile=stock and pointer cursor');

      // 2. sfxVol audio attenuation via sfxBus
      const rFull = await t.page.evaluate(() => window.__game.audioRender('hint', 6, false, { sfxVol: 1 }));
      const rHalf = await t.page.evaluate(() => window.__game.audioRender('hint', 6, false, { sfxVol: 0.5 }));
      const ratio = rHalf.peak / rFull.peak;
      t.expect(ratio > 0.45 && ratio < 0.55, 'sfxVol=0.5 attenuates SFX cue peak to ~50% (' + rFull.peak + ' -> ' + rHalf.peak + ', ratio ' + ratio.toFixed(2) + ')');
      await t.game('setSettings', { sfxVol: 0.5 });
      t.equal((await t.game('audioState')).sfxVol, 0.5, 'audioState() reflects sfxVol setting');
      await t.game('setSettings', { sfxVol: 1 });

      // 3. Length-scaled toast duration
      await t.page.keyboard.press('m'); // short toast: 'Sound on' / 'Sound muted'
      const tShort = await t.game('toastInfo');
      t.expect(tShort.ms >= 2600 && tShort.ms <= 3600, 'short toast uses compact duration: ' + JSON.stringify(tShort));
      await t.game('scene', 'settings');
      await t.page.click('[data-a="tipsAgain"]'); // longer toast (~49 chars)
      const tMed = await t.game('toastInfo');
      t.expect(tMed.ms > tShort.ms && tMed.ms <= 6000, 'longer toast scales duration proportionally: ' + JSON.stringify(tMed));
    },
  },
];
