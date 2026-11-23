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
    name: 'w4a C4-08 Klondike/Spider/Yukon carry full-size Spa City marks, tight desktop FreeCell omits textless r<46 arcs (W6-S1-07), and bands under 9% still get none',
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
          if (t.viewport === 'desktop' && mode === 'freecell') {
            // W6-S1-07: require r >= 46 before drawing desktop feltEmblem so FreeCell never paints an orphaned textless half-arc
            const rawR = Math.min(w * .3, band * .8 / 1.55);
            if (rawR < 46) t.expect(!q.emblem, mode + ': tight desktop band (r=' + rawR.toFixed(1) + ' < 46) omits truncated textless arc');
            else t.expect(q.emblem && q.emblem.r >= 46, mode + ': desktop emblem draws only at r >= 46');
            await shot(t, 'C4-08', mode + '-mark');
            continue;
          }
          t.expect(q.emblem, w + 'x' + h + ' ' + mode + ': the empty felt has the mark (band ' + Math.round(band / H * 100) + '% of the table)');
          if (q.emblem && t.viewport === 'desktop') {
            t.expect(q.emblem.r >= 46, mode + ': desktop emblem radius >= 46 so Spa City label renders (' + Math.round(q.emblem.r) + ' px)');
            if (mode === 'yukon') {
              t.expect(q.emblem.inNook && q.nook, 'desktop Yukon side-rail places the Spa City mark cleanly in its right-rail nook: ' + JSON.stringify(q));
              t.expect(q.emblem.cy - q.emblem.r >= q.nook.top - 1 && q.emblem.cy + q.emblem.r * .6 <= q.nook.bottom + 1, 'yukon: and it sits inside the nook');
              await shot(t, 'C4-08', 'yukon-mark');
            } else {
              t.expect(q.emblem.cy - q.emblem.r >= q.band.top - 1 && q.emblem.cy + q.emblem.r * .6 <= q.band.bottom + 1, mode + ': and it sits inside the band');
            }
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
  {
    name: 'w4a W4-B02 4-tab Ledger (21-Bath Journey + sourced Facts), 2-tab lazy Backs & Tables (Starter Suite + fast-tracks), Next Daily / Equip now Win, archive-safe 400-day calendar & venue-biased pickFact (W6-S2-04, W6-S3-07)',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'reduced' });
      const daysAgo = (n) => t.page.evaluate((n) => { const d = new Date(); d.setDate(d.getDate() - n); const p = (x) => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }, n);

      // 1. Bathhouse Ledger at Win 0: visible 21-Bath Row Stamp Journey (8 stops + 7/14/21 seals) + Win-0 Facts invitation
      await t.game('scene', 'ledger');
      const ledger0 = await t.page.evaluate(() => ({
        stops: [...document.querySelectorAll('#lpanel-overview .jstop b')].map((x) => x.textContent),
        seals: [...document.querySelectorAll('#lpanel-overview .jseal')].map((x) => x.textContent),
        overviewText: document.getElementById('lpanel-overview').textContent,
      }));
      t.equal(ledger0.stops, ['Superior', 'Hale', 'Maurice', 'Fordyce', 'Quapaw', 'Ozark', 'Buckstaff', 'Lamar'], '21-Bath Row Stamp Journey lists all 8 historic bathhouses north-to-south from Win 0');
      t.equal(ledger0.seals, ['7 · Maurice', '14 · Ozark', '21 · Lamar'], '7/14/21 milestone seals visible from Win 0');
      t.expect(ledger0.overviewText.includes('0 of 21 baths') && ledger0.overviewText.includes('Superior Medallions'), 'Overview previews 0/21 journey and next unlock');
      await t.page.click('#ltab-facts');
      t.expect(await t.page.locator('#lpanel-facts .fnd-empty').isVisible(), 'Facts tab shows a warm Win-0 invitation instead of an empty list');

      // 2. 2-Tab Lazy-Loaded Backs & Tables (CD-WF2-08, CD-WF3-07, OQ-WF1-02): zero unused Painted courts or inactive table cuts
      await t.game('scene', 'backs');
      await t.waitForStable();
      const artOnBacksTab = await t.game('art');
      t.expect(artOnBacksTab.wanted.every((n) => !n.startsWith('court-')), 'Card Backs tab never eagerly preloads unused Painted court-*.webp (CD-WF3-07)');
      t.expect(!artOnBacksTab.wanted.includes('tex-quapaw') && !artOnBacksTab.wanted.includes('tex-pool') && !artOnBacksTab.wanted.includes('tex-linen'), 'Card Backs tab does not eagerly preload inactive Parlor Tables');
      t.expect(await t.page.locator('#bpanel-backs [data-a="reseed"]').isVisible(), 'Skylight Reshuffle is docked visibly inside Card Backs tab');
      const bkBarBox = await t.page.locator('#bpanel-backs .bk-bar').boundingBox();
      t.expect(bkBarBox && bkBarBox.y + bkBarBox.height <= t.vp.height, 'sticky caption & Skylight Reshuffle appear above the fold');
      await t.page.click('#btab-tables');
      await t.waitForStable();
      const artOnTablesTab = await t.game('art');
      t.expect(artOnTablesTab.wanted.includes('tex-quapaw') && artOnTablesTab.wanted.includes('tex-pool'), 'switching to Parlor Tables lazy-loads table art on demand');
      t.expect(artOnTablesTab.wanted.every((n) => !n.startsWith('court-')), 'Parlor Tables tab still loads zero Painted court-*.webp');
      // Locked table story remains visible on focus alongside unlock requirement
      const tblLockStory = await t.page.evaluate(() => {
        const el = document.querySelector('[data-table="linen"]');
        el.focus();
        return document.getElementById('tblCap').textContent;
      });
      t.expect(tblLockStory.includes('postcard') && tblLockStory.includes('Win 21') && tblLockStory.includes('7-day Daily'), 'locked table focus preserves Hot Springs story + 21-win / Daily fast-track: ' + tblLockStory);
      await t.page.click('#sheet [data-close]');

      // 3. Dual mastery fast-track (OQ-WF1-02): winning FreeCell at Win 1 opens BOTH Win-1 Superior Medallions AND FreeCell fast-track Quapaw Dome!
      await t.game('setState', {
        mode: 'freecell', deal: 601,
        piles: {
          c0: [], c1: [], c2: [], c3: [],
          f0: ['AC', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', 'TC', 'JC', 'QC', 'KC'],
          f1: ['AD', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D', 'TD', 'JD', 'QD', 'KD'],
          f2: ['AH', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', 'TH', 'JH', 'QH', 'KH'],
          f3: ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS', 'JS', 'QS'],
          t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [],
        },
      });
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 15000 });
      const fastMeta = await t.game('meta');
      t.expect(fastMeta.unlock.ids.includes('b:paterae') && fastMeta.unlock.ids.includes('b:quapaw'), 'FreeCell Win 1 unlocks both Win-1 Paterae and FreeCell fast-track Quapaw Dome: ' + JSON.stringify(fastMeta.unlock.ids));
      // Full sourced Fact (Q, A, explanation, source) now appears in Bathhouse Ledger -> Facts
      await t.page.click('#sheet [data-close]');
      await t.game('scene', 'ledger', { tab: 'facts' });
      const factRow = await t.page.evaluate(() => {
        const li = document.querySelector('#lpanel-facts .fnd li');
        return li ? { a: li.querySelector('b').textContent, q: li.querySelector('.fq').textContent, x: li.querySelector('.fx').textContent, s: li.querySelector('.fs').textContent } : null;
      });
      t.expect(factRow && factRow.a && factRow.q && factRow.x && factRow.s.startsWith('Source: '), 'Facts archive displays full Q, A, explanation, and Source: ' + JSON.stringify(factRow));

      // 4. Archive-Safe Interactive 400-Day Calendar & Same-Day Daily Streak Integrity (CD-WF6-04, wf-6 §7.3 #4)
      const d0 = await daysAgo(0), d1 = await daysAgo(1), d2 = await daysAgo(2), d3 = await daysAgo(3);
      await t.page.evaluate(([p, d2, d3]) => {
        const m = JSON.parse(localStorage.getItem(p + 'meta') || '{}');
        m.daily = { [d3 + '|klondike1']: 'won', [d2 + '|klondike1']: 'won' };
        m.dailyBest = 2;
        localStorage.setItem(p + 'meta', JSON.stringify(m));
      }, [P, d2, d3]);
      await reloadGame(t);
      await baseSettings(t, { sound: false, tips: false, motion: 'reduced' });
      await t.game('scene', 'daily');
      // Future dates (if any exist in current month) are disabled 'Upcoming'; past dates in 400d window are playable buttons
      const calCheck = await t.page.evaluate(([d0, d1]) => {
        const fut = [...document.querySelectorAll('#calW button.cday:disabled')];
        const past = document.querySelector('#calW button[data-day="' + d1 + '"]');
        const note = document.querySelector('#sheet .cal-note');
        return {
          futValid: fut.every((b) => /Upcoming|Outside/.test(b.getAttribute('aria-label') || '')),
          hasPastInCurMonth: !!past,
          hasNote: !!(note && /same-day wins/.test(note.textContent)),
        };
      }, [d0, d1]);
      t.equal(calCheck.futValid, true, 'disabled calendar dates are labeled Upcoming / Outside archive');
      t.equal(calCheck.hasNote, true, 'calendar shows 1-line archive vs. same-day streak footer note');
      // Navigate to d1 (stepping to previous month if today is day 1 of the month) and select it
      if (!calCheck.hasPastInCurMonth) await t.page.locator('[data-mo]').first().click();
      await t.page.click('#calW button[data-day="' + d1 + '"]');
      t.expect((await t.page.locator('#dailyDayWrap').textContent()).includes('Archive deals for ' + d1), 'clicking past calendar cell loads archive deals for ' + d1);
      await t.page.click('#sheet [data-close]');

      // Win ALL 7 archive deals on d1 (simulating a 1-afternoon backfill on yesterday) -> must record 'won-archive', earn Full Bath star & d7all, and NOT extend consecutive-day streak or earn d3!
      await t.page.evaluate(([p, d1]) => {
        const m = JSON.parse(localStorage.getItem(p + 'meta') || '{}');
        for (const k of ['klondike3', 'freecell', 'spider1', 'spider2', 'spider4', 'yukon']) m.daily[d1 + '|' + k] = 'won-archive';
        localStorage.setItem(p + 'meta', JSON.stringify(m));
      }, [P, d1]);
      await reloadGame(t);
      await baseSettings(t, { sound: false, tips: false, motion: 'reduced' });
      const winsBefore = (await t.game('meta')).totalWins;
      await t.game('setState', Object.assign(nearWinKlondike(), { daily: d1, deal: 701 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 15000 });
      const afterArchive = await t.page.evaluate(() => ({
        meta: window.__game.meta(),
        ds: window.__game.dailyStats(),
        footerBtns: [...document.querySelectorAll('#sheet .row button')].map((b) => b.textContent.trim()),
      }));
      t.equal(afterArchive.meta.daily[d1 + '|klondike1'], 'won-archive', 'past-date archive win records distinctly as won-archive (CD-WF6-04)');
      t.equal(afterArchive.meta.totalWins, winsBefore + 1, 'archive win advances meta.totalWins and 21-Bath Course');
      t.expect(!!afterArchive.meta.ach.d7all, '7/7 archive completion still earns Full Bath achievement (d7all)');
      t.equal(afterArchive.ds.streak, 0, 'archive win does NOT backfill dailyStreak() (CD-WF6-04)');
      t.equal(afterArchive.ds.best, 2, 'archive win does NOT inflate dailyRun() past same-day best of 2 (CD-WF6-04)');
      t.expect(!afterArchive.meta.ach.d3, 'archive win does NOT exploit ACH[d3] Three Days Running (CD-WF6-04)');
      t.equal(afterArchive.ds.allDays[d1], 7, 'calendar/allDays counts all 7 archive wins for the ★ Full Bath star');
      t.expect(afterArchive.footerBtns.length <= 3, 'MODALS.win keeps <= 3 footer buttons (CD-WF2-08): ' + JSON.stringify(afterArchive.footerBtns));

      // 5. Contextual MODALS.win Daily Chain ('Next Daily (1/7)' primary CTA swap with <= 3 footer buttons)
      await t.game('setState', Object.assign(nearWinKlondike(), { daily: d0, deal: 702 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 15000 });
      const winDaily = await t.page.evaluate(() => ({
        footerBtns: [...document.querySelectorAll('#sheet .row button')].map((b) => b.textContent.trim()),
        metaVal: window.__game.meta().daily,
      }));
      t.equal(winDaily.metaVal[d0 + '|klondike1'], 'won', 'same-day daily win records plain won');
      t.equal(winDaily.footerBtns.length, 3, 'Daily win footer stays strictly 3 buttons (CD-WF2-08)');
      t.equal(winDaily.footerBtns[0], 'Next Daily (1/7)', 'Daily win swaps primary button to Next Daily (1/7)');
      await t.page.click('#sheet [data-a="nextDaily"]');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'game', null, { timeout: 10000 });
      const nextSt = await t.state();
      t.equal([nextSt.daily, nextSt.mode, nextSt.opts.draw], [d0, 'klondike', 3], 'clicking Next Daily (1/7) deals the next remaining daily (Klondike Draw 3)');

      // 6. Venue-biased pickFact() gently favors active Hot Springs venue/back while preserving unseen-first invariant
      await t.game('unlockAll');
      await t.game('setSettings', { table: 'pool', back: 'steam' });
      let matched = 0;
      for (let i = 0; i < 8; i++) {
        await t.page.evaluate(([p]) => { const m = JSON.parse(localStorage.getItem(p + 'meta') || '{}'); m.seenFacts = []; localStorage.setItem(p + 'meta', JSON.stringify(m)); }, [P]);
        await t.game('setState', Object.assign(nearWinKlondike(), { deal: 810 + i }));
        await t.game('act', 'move', 't0', 'f3');
        await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 15000 });
        const ftxt = await t.page.locator('#sheet .fact').textContent();
        if (/thermal|143°F|700,000|4,400|tufa|\b47\b|Hot Springs Creek/i.test(ftxt)) matched++;
        await t.page.click('#sheet [data-close]');
      }
      t.expect(matched >= 3, 'Thermal Pool + Thermal Steam venue biases unseen fact picks toward thermal facts (' + matched + '/8 matched)');
    },
  },
  {
    name: 'w4a W6-S5-01 global M mute hotkey works on Title and non-text modals (ignoring #dealIn), and Title exposes 44x44 brass #tMute button',
    async run(t) {
      await baseSettings(t, { sound: true, tips: false, motion: 'reduced' });
      await t.game('scene', 'title');
      await t.waitForStable();

      // 1. Title #tMute 44x44 brass button visible, inside viewport, clear of #tH and hero tag, toggles sound cleanly
      const tmBox = await t.page.evaluate(() => {
        const b = document.getElementById('tMute');
        const r = b ? b.getBoundingClientRect() : null;
        const h1 = document.getElementById('tH').getBoundingClientRect();
        const tags = window.__game.heroTags().tags;
        const overlapsTag = tags.some((tg) => r && r.left < tg.x + tg.w && r.right > tg.x && r.top < tg.y + tg.h && r.bottom > tg.y);
        return {
          exists: !!b,
          w: r ? Math.round(r.width) : 0,
          h: r ? Math.round(r.height) : 0,
          inView: !!(r && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight),
          pressed: b ? b.getAttribute('aria-pressed') : null,
          label: b ? b.getAttribute('aria-label') : null,
          hasSvg: !!(b && b.querySelector('svg')),
          overlapsH1: !!(r && r.left < h1.right && r.right > h1.left && r.top < h1.bottom && r.bottom > h1.top),
          overlapsTag,
        };
      });
      t.equal([tmBox.exists, tmBox.inView, tmBox.pressed, tmBox.label, tmBox.hasSvg], [true, true, 'false', 'Mute sound', true], '#tMute renders on Title with speaker icon and Mute sound label');
      t.expect(tmBox.w >= 44 && tmBox.h >= 44, '#tMute meets >=44x44 touch target: ' + tmBox.w + 'x' + tmBox.h);
      t.equal([tmBox.overlapsH1, tmBox.overlapsTag], [false, false], '#tMute clears #tH and Bathhouse Row hero tag');
      await t.shot('W6-S5-01-title-mute');

      // One-tap click on #tMute silences audio immediately
      await t.page.click('#tMute');
      t.equal((await t.state()).settings.sound, false, 'one-tap #tMute mutes sound from Title');
      t.equal(await t.page.getAttribute('#tMute', 'aria-pressed'), 'true', '#tMute updates aria-pressed=true');

      // 2. Pressing M on Title unmutes and syncs #tMute
      await t.page.keyboard.press('m');
      t.equal((await t.state()).settings.sound, true, 'M hotkey on Title unmutes sound');
      t.equal(await t.page.getAttribute('#tMute', 'aria-pressed'), 'false', '#tMute syncs after Title M hotkey');

      // 3. Pressing M inside Menu toggles sound and syncs both #mMute and #tMute
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 15 });
      await t.game('scene', 'menu');
      await t.page.keyboard.press('M');
      const afterMenuM = await t.page.evaluate(() => ({
        sound: window.__game.getState().settings.sound,
        mPressed: document.getElementById('mMute').getAttribute('aria-pressed'),
        tPressed: document.getElementById('tMute').getAttribute('aria-pressed'),
      }));
      t.equal(afterMenuM, { sound: false, mPressed: 'true', tPressed: 'true' }, 'M hotkey inside Menu toggles sound and syncs #mMute + #tMute');

      // 4. Pressing M inside Settings Audio syncs [data-tog="sound"] and .is-muted rows live
      await t.game('scene', 'settings', { tab: 'audio' });
      await t.page.keyboard.press('m');
      const afterSetM = await t.page.evaluate(() => ({
        sound: window.__game.getState().settings.sound,
        checked: document.querySelector('#sheet [data-tog="sound"]').getAttribute('aria-checked'),
        dimmed: document.getElementById('row-sfxVol').classList.contains('is-muted'),
      }));
      t.equal(afterSetM, { sound: true, checked: 'true', dimmed: false }, 'M hotkey inside Settings Audio unmutes and syncs switch + row dimming');
      await t.page.keyboard.press('m');
      const afterSetM2 = await t.page.evaluate(() => ({
        sound: window.__game.getState().settings.sound,
        checked: document.querySelector('#sheet [data-tog="sound"]').getAttribute('aria-checked'),
        dimmed: document.getElementById('row-sfxVol').classList.contains('is-muted'),
      }));
      t.equal(afterSetM2, { sound: false, checked: 'false', dimmed: true }, 'second M inside Settings Audio mutes and dims rows');

      // 5. Pressing M while typing inside #dealIn text input is ignored (never hijacks text input)
      await t.game('scene', 'deal');
      await t.page.focus('#dealIn');
      await t.page.keyboard.press('m');
      t.equal((await t.state()).settings.sound, false, 'M while focused in #dealIn text input does not toggle mute');
      // Moving focus to Close button in Deal modal allows M to toggle again
      await t.page.focus('#sheet [data-close]');
      await t.page.keyboard.press('m');
      t.equal((await t.state()).settings.sound, true, 'M on non-text control in Deal modal toggles mute cleanly');
    },
  },
];
