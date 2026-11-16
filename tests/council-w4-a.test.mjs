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
];
