// Persistence tests: stats, resume, storage failure (PRD AC 23–25).
import { baseSettings, nearWinKlondike } from './_util.mjs';

export const tests = [
  {
    name: 'persist-23 stats survive reload',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('setState', nearWinKlondike());
      await t.game('act', 'move', 't0', 'f3');
      await t.waitForStable();
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 4 });
      await t.game('act', 'draw');           // counts as played
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 5 }); // abandons it: streak resets
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      const st = (await t.game('stats')).klondike1;
      t.expect(st && st.won === 1, 'one win recorded: ' + JSON.stringify(st));
      t.expect(st && st.played >= 2, 'two games played');
      t.equal(st && st.streak, 0, 'abandoning resets the streak'); t.equal(st && st.bestStreak, 1, 'best streak kept');
      t.expect(st && st.fewestMoves === 1, 'fewest moves recorded');
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 6 });
      await t.game('scene', 'stats');
      await t.shot('persist-23-stats');
    },
  },
  {
    name: 'persist-24 continue after reload',
    async run(t) {
      await baseSettings(t, { autoFoundation: 'off' });
      await t.game('newGame', { mode: 'spider', suits: 2, deal: 777 });
      const m = (await t.game('legalMoves'))[0];
      await t.game('act', 'move', m.from, m.to, m.count);
      await t.game('act', 'draw');
      await t.waitForStable(); await t.page.waitForTimeout(450);
      const before = await t.state();
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      t.equal((await t.state()).scene, 'title', 'reload lands on the title');
      t.expect(await t.page.isVisible('#tCont'), 'Continue button shown');
      await t.shot('persist-24-title-continue');
      await t.page.click('#tCont');
      await t.waitForStable();
      const after = await t.state();
      t.equal(after.piles, before.piles, 'same position'); t.equal(after.score, before.score, 'same score');
      t.equal(after.undoDepth, 2, 'undo history restored');
      await t.game('act', 'undo'); await t.game('act', 'undo');
      t.equal((await t.state()).stockCount, 50, 'undo after resume reaches the deal');
      await t.shot('persist-24-continue');
    },
  },
  {
    name: 'persist-25 storage throws',
    async run(t) {
      await t.page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage disabled'); } }); });
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      await t.game('setSettings', { motion: 'reduced', sound: false });
      await t.game('setState', nearWinKlondike());
      await t.game('act', 'move', 't0', 'f3');
      await t.waitForStable();
      const s = await t.state(); t.equal(s.won, true, 'game still playable'); t.equal(s.storageOK, false, 'storage failure detected');
      await t.game('scene', 'stats');
      t.expect(/can't be saved/.test(await t.page.textContent('#sheet')), 'stats screen explains');
      await t.shot('persist-25-nostorage');
    },
  },
];
