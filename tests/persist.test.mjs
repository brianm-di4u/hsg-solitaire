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
  {
    name: 'persist-26 bounded meta.seenDeals flags pre-win Deal # and Daily re-entries as replay while preserving resumeSaved (W6-S3-08)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced', tips: false });
      // 1. Start Deal #4242 -> make 1 move -> abandon -> re-enter Deal #4242 via Deal # -> must be flagged replay
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 4242 });
      t.equal((await t.state()).replay, false, 'first start of Deal #4242 is not a replay');
      await t.game('act', 'draw'); // records klondike1:4242 in meta.seenDeals
      t.expect((await t.game('meta')).seenDeals.includes('klondike1:4242'), 'started deal recorded in meta.seenDeals');
      // Reload and resume in-progress first attempt via Continue: must NOT become a replay!
      await t.waitForStable(); await t.page.waitForTimeout(400);
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      await t.page.click('#tCont');
      await t.waitForStable();
      t.equal([((await t.state()).deal), (await t.state()).replay], [4242, false], 'resuming the same unfinished first attempt stays non-replay');
      // Now abandon Deal #4242 and re-enter Deal #4242 via Deal # flow -> must be flagged S.replay = true
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 4243 });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 4242 });
      t.equal((await t.state()).replay, true, 're-entering a previously started deal via Deal # is flagged replay');

      // 2. Same protection for Daily re-entry after abandoning a started Daily deal
      await t.game('newGame', { mode: 'klondike', draw: 1, daily: '2026-11-19' });
      t.equal((await t.state()).replay, false, 'first start of Daily is not a replay');
      await t.game('act', 'draw');
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 9999 });
      await t.game('newGame', { mode: 'klondike', draw: 1, daily: '2026-11-19' });
      t.equal((await t.state()).replay, true, 're-entering a started Daily deal is flagged replay');

      // 3. meta.seenDeals is bounded to 200 entries on load and handles corrupted data cleanly
      await t.page.evaluate(() => {
        const k = 'spa-solitaire:v1:meta';
        const m = JSON.parse(localStorage.getItem(k) || '{}');
        m.seenDeals = Array.from({ length: 215 }, (_, i) => 'klondike1:' + (1000 + i));
        localStorage.setItem(k, JSON.stringify(m));
      });
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      const sd = (await t.game('meta')).seenDeals;
      t.equal([sd.length, sd[0], sd[sd.length - 1]], [200, 'klondike1:1015', 'klondike1:1214'], 'seenDeals trims to newest 200 entries on load');
      await t.page.evaluate(() => {
        const k = 'spa-solitaire:v1:meta';
        const m = JSON.parse(localStorage.getItem(k) || '{}');
        m.seenDeals = 'corrupt';
        localStorage.setItem(k, JSON.stringify(m));
      });
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      t.equal((await t.game('meta')).seenDeals, [], 'corrupt seenDeals resets safely to []');
    },
  },
];
