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
  {
    name: 'persist-27 W1-S4-02 orthogonal alreadyWon/retried/clean flags award first-ever retried punches, gradeWins, Daily unlocks, completion/Daily/run ACH & course cue while freezing streaks/PBs/execution ACH',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced', tips: false, sound: false, scoring: 'standard' });

      // Compute local today, yesterday, and 2 days ago matching in-page todayStr()
      const dates = await t.page.evaluate(() => {
        const fmt = (off) => {
          const d = new Date(); d.setDate(d.getDate() + off);
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        };
        return { d0: fmt(0), d1: fmt(-1), d2: fmt(-2) };
      });

      // 1. Seed 2 prior Daily days won + 6 of 7 today's other Daily variants won, plus an active klondike1 streak/PB.
      await t.page.evaluate(({ d0, d1, d2 }) => {
        const daily = {
          [d2 + '|klondike1']: 'won',
          [d1 + '|klondike1']: 'won',
          [d0 + '|klondike3']: 'won',
          [d0 + '|freecell']: 'won',
          [d0 + '|spider1']: 'won',
          [d0 + '|spider2']: 'won',
          [d0 + '|spider4']: 'won',
          [d0 + '|yukon']: 'won',
        };
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify({
          lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 0, daily,
          seenDeals: [], wonDeals: [], gradeWins: { easy: 0, medium: 0, hard: 0 }, unlock: { ids: [] }, ach: {},
        }));
        localStorage.setItem('spa-solitaire:v1:stats', JSON.stringify({
          klondike1: { played: 2, won: 2, streak: 2, bestStreak: 2, bestTimeMs: 90000, fewestMoves: 80, bestStandardScore: 50, bestTimedScore: 0, bestScore: 50, totalMs: 180000, assistedWon: 0, recent: 'WW' },
        }));
      }, dates);
      await t.reload();
      await baseSettings(t, { motion: 'reduced', tips: false, sound: false, scoring: 'standard' });

      // Start Today's Daily -> make 1 move -> abandon -> re-enter Today's Daily -> S.replay must stay true (CD-WF6-04)
      await t.game('newGame', { mode: 'klondike', draw: 1, daily: dates.d0 });
      await t.game('act', 'draw');
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 9999 });
      await t.game('newGame', { mode: 'klondike', draw: 1, daily: dates.d0 });
      const retriedDailyState = await t.state();
      t.equal(retriedDailyState.replay, true, 'abandoned-and-retried Daily preserves S.replay=true (CD-WF6-04)');

      // Win that retried first-ever Daily (Hard) in <1s without Undo/Hint
      await t.game('cuesPlayed', true);
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: retriedDailyState.deal, daily: dates.d0, grade: 'hard', replay: true }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      await t.page.waitForTimeout(1700);
      const r1 = await t.page.evaluate(() => ({
        meta: window.__game.meta(),
        st: window.__game.stats().klondike1,
        cues: window.__game.cuesPlayed().map((c) => c.name),
        punchCount: document.querySelectorAll('#sheet .ticket .punch').length,
        newDots: document.querySelectorAll('#sheet .course i.new').length,
      }));
      t.equal(r1.meta.totalWins, 1, 'retried first-ever Daily win increments meta.totalWins');
      t.equal(r1.meta.gradeWins.hard, 1, 'retried first-ever Daily win increments meta.gradeWins.hard');
      t.equal(r1.meta.daily[dates.d0 + '|klondike1'], 'won', 'Daily slot stamped won');
      t.equal([r1.punchCount, r1.newDots], [1, 1], 'Bath Ticket renders punch and new course dot on retried first win');
      t.expect(r1.cues.includes('punch') && r1.cues.includes('course'), 'punch SFX and Daily course milestoneCue fire on retried first win: ' + JSON.stringify(r1.cues));
      for (const uid of ['b:paterae', 't:pool', 'b:neon', 'b:lake', 'b:silks']) {
        t.expect(r1.meta.unlock.ids.includes(uid), 'retried first-ever Daily unlocks ' + uid);
      }
      for (const aid of ['first', 'klon', 'd1', 'd3', 'd7all']) {
        t.expect(!!r1.meta.ach[aid], 'retried first-ever Daily awards completion/Daily ACH ' + aid);
      }
      for (const blocked of ['quick', 'rush', 'steady', 'alone']) {
        t.expect(!r1.meta.ach[blocked], 'CD-WF1-06: retried win blocks peeked execution ACH ' + blocked);
      }
      t.equal([r1.st.streak, r1.st.bestStreak, r1.st.fewestMoves, r1.st.bestTimeMs, r1.st.bestStandardScore], [0, 2, 80, 90000, 50], 'retried win never advances streaks or PBs');

      // 2. Replaying that SAME already-won Daily a second time (alreadyWon = true) freezes everything and suppresses punch/cues
      await t.game('cuesPlayed', true);
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: retriedDailyState.deal, daily: dates.d0, grade: 'hard', replay: true }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      await t.page.waitForTimeout(1700);
      const r2 = await t.page.evaluate(() => ({
        meta: window.__game.meta(),
        cues: window.__game.cuesPlayed().map((c) => c.name),
        punchCount: document.querySelectorAll('#sheet .ticket .punch').length,
        newDots: document.querySelectorAll('#sheet .course i.new').length,
      }));
      t.equal([r2.meta.totalWins, r2.meta.gradeWins.hard, r2.punchCount, r2.newDots], [1, 1, 0, 0], 'already-won Daily replay freezes totalWins/gradeWins and omits punch');
      t.expect(!r2.cues.includes('punch') && !r2.cues.includes('course'), 'already-won Daily replay suppresses punch and course cues: ' + JSON.stringify(r2.cues));

      // 3. Non-daily retried first win on Bath 21 -> punches, awards w21 + course cue, blocks execution ACH;
      //    and non-21st retried first win with streak/PB eligibility -> punches, fires punch SFX, suppresses best/streak cue.
      await t.page.evaluate(() => {
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify({
          lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 20, daily: {},
          seenDeals: ['klondike1:8888'], wonDeals: [], gradeWins: { easy: 0, medium: 0, hard: 0 }, unlock: { ids: [] }, ach: {},
        }));
        localStorage.setItem('spa-solitaire:v1:stats', JSON.stringify({
          klondike1: { played: 20, won: 20, streak: 3, bestStreak: 3, bestTimeMs: 90000, fewestMoves: 80, bestStandardScore: 50, bestTimedScore: 0, bestScore: 50, totalMs: 1800000, assistedWon: 0, recent: 'WWW' },
        }));
      });
      await t.reload();
      await baseSettings(t, { motion: 'reduced', tips: false, sound: false, scoring: 'standard' });
      await t.game('cuesPlayed', true);
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 8888, grade: 'medium', replay: true }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      await t.page.waitForTimeout(1700);
      const r21 = await t.page.evaluate(() => ({
        meta: window.__game.meta(),
        st: window.__game.stats().klondike1,
        cues: window.__game.cuesPlayed().map((c) => c.name),
        punchCount: document.querySelectorAll('#sheet .ticket .punch').length,
      }));
      t.equal([r21.meta.totalWins, r21.meta.gradeWins.medium, r21.punchCount], [21, 1, 1], 'retried 21st regular win punches Bath Ticket and advances totalWins/gradeWins');
      t.expect(!!r21.meta.ach.w21 && !r21.meta.ach.quick && !r21.meta.ach.rush && !r21.meta.ach.steady && !r21.meta.ach.alone, 'retried 21st win awards w21 while blocking execution ACH');
      t.expect(r21.cues.includes('punch') && r21.cues.includes('course'), 'retried 21st win fires punch and course milestoneCue');
      t.equal([r21.st.streak, r21.st.fewestMoves], [3, 80], 'retried 21st win freezes streak and PBs');

      // Non-21st retried regular win (22nd) suppresses pb/streak milestoneCue while still punching
      await t.game('cuesPlayed', true);
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 8889, replay: true }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      await t.page.waitForTimeout(1700);
      const r22 = await t.page.evaluate(() => ({
        totalWins: window.__game.meta().totalWins,
        cues: window.__game.cuesPlayed().map((c) => c.name),
        punchCount: document.querySelectorAll('#sheet .ticket .punch').length,
      }));
      t.equal([r22.totalWins, r22.punchCount], [22, 1], 'non-21st retried first win punches and increments totalWins');
      t.expect(r22.cues.includes('punch') && !r22.cues.includes('best') && !r22.cues.includes('streak') && !r22.cues.includes('course'), 'non-21st retried win fires punch but suppresses best/streak/course cues: ' + JSON.stringify(r22.cues));

      // 4. Spider ach:run (Clear Water) fires on retried unwon deal, blocked on already-won deal
      const run12 = ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'];
      const spiderBoard = (deal) => ({
        mode: 'spider', opts: { suits: 1 }, deal, replay: true,
        piles: { stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [], t0: run12, t1: ['AS'], t2: ['KS'], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [] },
      });
      await t.page.evaluate(() => {
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify({
          lastMode: 'spider', lastOpts: { draw: 1, suits: 1 }, totalWins: 0, daily: {},
          seenDeals: ['spider1:7001'], wonDeals: ['spider1:7002'], gradeWins: { easy: 0, medium: 0, hard: 0 }, unlock: { ids: [] }, ach: {},
        }));
      });
      await t.reload();
      await baseSettings(t, { motion: 'reduced', tips: false, sound: false });
      await t.game('setState', spiderBoard(7001));
      await t.game('act', 'move', 't1', 't0');
      t.expect(!!(await t.game('meta')).ach.run, 'retried unwon Spider deal awards ach:run (Clear Water)');

      // Already-won Spider deal suppresses ach:run
      await t.page.evaluate(() => {
        const m = JSON.parse(localStorage.getItem('spa-solitaire:v1:meta') || '{}');
        m.ach = {};
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify(m));
      });
      await t.reload();
      await baseSettings(t, { motion: 'reduced', tips: false, sound: false });
      await t.game('setState', spiderBoard(7002));
      await t.game('act', 'move', 't1', 't0');
      t.expect(!(await t.game('meta')).ach.run, 'already-won Spider deal suppresses ach:run');
    },
  },
  {
    name: 'persist-28 W1-S2-06 400-day Daily Archive wins evicted past the 200-entry wonDeals/seenDeals buffers still flag S.replay and alreadyWon',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced', tips: false, sound: false, scoring: 'standard' });
      // Seed meta.daily with archive wins ('won' and 'won-archive') + an unwon 'played' entry,
      // while seenDeals and wonDeals hold 200 unrelated newer deals (simulating >200-deal ring-buffer eviction).
      const evictedDateWon = '2026-06-10', evictedDateArch = '2026-06-11', evictedDatePlayed = '2026-06-12', freshDate = '2026-06-13';
      await t.page.evaluate(({ dWon, dArch, dPlayed }) => {
        const filler = Array.from({ length: 200 }, (_, i) => 'klondike1:' + (50000 + i));
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify({
          lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 5,
          daily: {
            [dWon + '|klondike1']: 'won',
            [dArch + '|klondike1']: 'won-archive',
            [dPlayed + '|klondike1']: 'played',
          },
          seenDeals: filler, wonDeals: filler,
          gradeWins: { easy: 1, medium: 1, hard: 1 }, unlock: { ids: [] }, ach: {},
        }));
        localStorage.setItem('spa-solitaire:v1:stats', JSON.stringify({
          klondike1: { played: 5, won: 5, streak: 2, bestStreak: 2, bestTimeMs: 90000, fewestMoves: 80, bestStandardScore: 100, bestTimedScore: 0, bestScore: 100, totalMs: 450000, assistedWon: 0, recent: 'WWWWW' },
        }));
      }, { dWon: evictedDateWon, dArch: evictedDateArch, dPlayed: evictedDatePlayed });
      await t.reload();
      await baseSettings(t, { motion: 'reduced', tips: false, sound: false, scoring: 'standard' });

      // 1. Evicted 'won' Daily Archive deal sets S.replay=true immediately in startDeal(), shows 'replay' pill, and freezes totalWins/gradeWins/streak/PBs/punch on win
      await t.game('newGame', { mode: 'klondike', draw: 1, daily: evictedDateWon });
      let s = await t.state();
      t.equal(s.replay, true, 'evicted won Daily sets S.replay=true immediately in startDeal()');
      t.equal(await t.page.evaluate(() => ({ hidden: document.getElementById('replayTag').hidden, text: document.getElementById('replayTag').textContent })), { hidden: false, text: 'replay' }, 'evicted won Daily shows replay HUD pill');
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: s.deal, daily: evictedDateWon, grade: 'hard', replay: s.replay }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      let lw = await t.game('lastWin'), m = await t.game('meta'), st = (await t.game('stats')).klondike1;
      t.equal([lw.alreadyWon, lw.retried, m.totalWins, m.gradeWins.hard, st.streak, st.bestStandardScore], [true, false, 5, 1, 2, 100], 'evicted won Daily win is alreadyWon=true and freezes totalWins/gradeWins/streak/PB');
      t.equal(await t.page.locator('#sheet .ticket .punch').count(), 0, 'evicted won Daily Bath Ticket is unpunched');

      // 2. Evicted 'won-archive' Daily Archive deal also sets S.replay=true immediately in startDeal() and alreadyWon=true on win
      await t.game('newGame', { mode: 'klondike', draw: 1, daily: evictedDateArch });
      s = await t.state();
      t.equal(s.replay, true, 'evicted won-archive Daily sets S.replay=true immediately in startDeal()');
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: s.deal, daily: evictedDateArch, grade: 'medium', replay: s.replay }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      lw = await t.game('lastWin'); m = await t.game('meta');
      t.equal([lw.alreadyWon, m.totalWins, m.gradeWins.medium], [true, 5, 1], 'evicted won-archive Daily win stays alreadyWon=true');

      // 3. Unplayed past Daily Archive deal starts fresh (S.replay=false) and punches normally
      await t.game('newGame', { mode: 'klondike', draw: 1, daily: freshDate });
      s = await t.state();
      t.equal(s.replay, false, 'unplayed Daily Archive date starts with S.replay=false');

      // 4. Evicted unwon 'played' Daily is not alreadyWon and still punches on first victory
      await t.game('newGame', { mode: 'klondike', draw: 1, daily: evictedDatePlayed });
      s = await t.state();
      t.equal(s.replay, false, 'evicted unwon played Daily does not falsely trigger won-Daily check');
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: s.deal, daily: evictedDatePlayed, grade: 'easy', replay: false }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      lw = await t.game('lastWin'); m = await t.game('meta');
      t.equal([lw.alreadyWon, m.totalWins, m.gradeWins.easy], [false, 6, 2], 'unwon archive Daily still punches and increments totalWins/gradeWins on first win');
      t.equal(await t.page.locator('#sheet .ticket .punch').count(), 1, 'unwon archive Daily Bath Ticket is punched');
    },
  },
];
