// Council wave 3, batch B: controls, rules and play; difficulty, progression and records.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.HS_ARTIFACT_DIR ? path.resolve(process.env.HS_ARTIFACT_DIR, 'wave-3', 'shots') : path.resolve(HERE, '..', 'screenshots', 'council-waves', 'wave-3', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };

const winNear = async (t, deal) => {
  await t.game('setState', Object.assign(nearWinKlondike(), { deal, moves: 30 }));
  await t.game('act', 'move', 't0', 'f3');
  await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
};

export const tests = [
  {
    name: 'w3b S2-19 Scoring: Standard is the calm default with its own best; Timed is opt-in with speed bonus; None hides score',
    async run(t) {
      await baseSettings(t);
      t.equal((await t.state()).settings.scoring, 'standard', 'a new profile defaults to calm Standard scoring (OQ-WF1-01)');
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 300 });
      t.expect(await t.page.locator('#sBonus').isHidden(), 'Standard default shows no draining countdown badge in the HUD');

      await winNear(t, 301);
      let txt = await t.page.locator('#sheet').textContent();
      t.expect(!txt.includes('time bonus') && txt.includes('efficiency +450'), 'Standard: no speed bonus on the ticket; discloses untimed efficiency bonus');
      const stdScore = (await t.state()).score;
      t.equal(stdScore, 460, 'Standard: score is card points (10) + untimed efficiency bonus (450) (' + stdScore + ')');
      let st = (await t.game('stats')).klondike1;
      t.equal([st.bestStandardScore, st.bestTimedScore], [stdScore, 0], 'Standard: saves bestStandardScore without touching bestTimedScore');

      await t.game('setSettings', { scoring: 'timed' });
      await winNear(t, 302);
      txt = await t.page.locator('#sheet').textContent();
      t.expect(txt.includes('time bonus +'), 'Timed: the ticket shows the speed bonus');
      const timedScore = (await t.state()).score;
      t.expect(timedScore > 900, 'Timed: the bonus is in the score (' + timedScore + ')');
      st = (await t.game('stats')).klondike1;
      t.equal([st.bestStandardScore, st.bestTimedScore], [stdScore, timedScore], 'Timed: saves bestTimedScore independently of bestStandardScore');

      await t.game('setSettings', { scoring: 'none' });
      await winNear(t, 303);
      txt = await t.page.locator('#sheet').textContent();
      t.expect(!txt.includes('Score') && !txt.includes('time bonus'), 'None: the ticket shows no score at all');
      await shot(t, 'S2-19', 'ticket-none');
      await t.game('scene', 'game');
      t.expect(await t.page.locator('#sScoreW').isHidden(), 'None: the Score cell leaves the status bar');
      t.expect(await t.page.locator('#sMoves').isVisible(), 'while Moves stays');
      await t.game('setSettings', { scoring: 'standard' });
      t.expect(await t.page.locator('#sScoreW').isVisible(), 'choosing Standard brings it back');
    },
  },
  {
    name: 'w3b S2-19 Standard and Timed best scores stay independent so neither overwrites the other',
    async run(t) {
      await baseSettings(t, { scoring: 'standard' });
      // a high Standard score never stands in front of a Timed best, and a Timed win never overwrites Standard best
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 311, moves: 30, score: 5000 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      let st = (await t.game('stats')).klondike1;
      t.equal([st.won, st.bestStandardScore, st.bestTimedScore], [1, 5460, 0], 'Standard: records bestStandardScore (5460 = 5010 card + 450 efficiency) and leaves bestTimedScore at 0');
      await t.game('setSettings', { scoring: 'timed' });
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 312, moves: 30, score: 100 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      st = (await t.game('stats')).klondike1;
      t.equal(st.bestStandardScore, 5460, 'Timed win leaves bestStandardScore untouched');
      t.expect(st.bestTimedScore > 1000 && st.bestTimedScore < 5000, 'Timed: its own win sets bestTimedScore (' + st.bestTimedScore + ')');
      await t.game('scene', 'records');
      const rec = await t.page.locator('#sheet').textContent();
      t.expect(rec.includes('5460 (Standard)') && rec.includes(st.bestTimedScore + ' (Timed)'), 'Records displays both independent Standard and Timed best scores');
    },
  },
  {
    name: 'w3b S2-19 Settings has a Scoring row, unified dark-lacquer shell in light OS mode, and a damaged value falls back to Standard',
    async run(t) {
      await baseSettings(t);
      await t.game('scene', 'settings');
      const sheetBg = await t.page.evaluate(() => getComputedStyle(document.getElementById('sheet')).backgroundColor);
      t.equal(sheetBg, 'rgb(22, 32, 27)', 'non-win modal uses unified dark-lacquer #16201B shell even in light OS scheme (CD-WF1-08)');
      const row = t.page.locator('#sheet [data-set="scoring"]');
      t.equal(await row.count(), 3, 'three choices');
      await t.page.locator('#sheet [data-set="scoring"][data-val="none"]').click();
      t.equal((await t.state()).settings.scoring, 'none', 'a click chooses it');
      await row.first().scrollIntoViewIfNeeded();
      await shot(t, 'S2-19', 'settings');
      await t.checkLayout();
      await t.reload();
      t.equal((await t.state()).settings.scoring, 'none', 'it survives a reload');
      await t.page.evaluate(() => { const k = 'spa-solitaire:v1:settings'; const s = JSON.parse(localStorage.getItem(k)); s.scoring = 'bogus'; localStorage.setItem(k, JSON.stringify(s)); });
      await t.reload();
      t.equal((await t.state()).settings.scoring, 'standard', 'a damaged value falls back to calm Standard default');
    },
  },
  {
    name: 'w3b S4-06 Help folds into sections with the hand of each game; the key caps are brass; the sheet has a pattern',
    async run(t) {
      await baseSettings(t);
      await t.game('newGame', { mode: 'spider', suits: 1 });
      await t.game('scene', 'help');
      const info = await t.page.evaluate(() => {
        const ds = [...document.querySelectorAll('#sheet details.hp')];
        const kbd = document.querySelector('#sheet kbd');
        const inked = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; };
        return {
          titles: ds.map((d) => d.querySelector('summary').textContent.trim()), open: ds.map((d) => d.open),
          hands: ds.filter((d) => d.querySelector('canvas')).map((d) => inked(d.querySelector('canvas'))),
          kbdFont: kbd ? getComputedStyle(kbd).fontFamily : '', kbdBorder: kbd ? getComputedStyle(kbd).borderBottomColor : '',
          pattern: getComputedStyle(document.querySelector('#sheet')).backgroundImage, goal: document.querySelector('#sheet').textContent.includes('Goal:'),
        };
      });
      t.equal(info.titles, ['Klondike', 'FreeCell', 'Spider', 'Yukon', 'Controls', 'Scoring', 'About the art & facts'], 'one fold for each game and each topic');
      t.equal(info.open, [false, false, true, false, false, false, false], 'the game being played starts open');
      t.expect(info.hands.length === 4 && info.hands.every((n) => n > 400), 'each game shows its hand, drawn (' + info.hands.join(', ') + ' pixels)');
      t.expect(/Josefin/.test(info.kbdFont), 'key caps use the display face, not the monospace one');
      t.expect(info.pattern.includes('gradient'), 'the sheet has its lattice');
      t.expect(info.goal, 'the goal is stated up top');
      await shot(t, 'S4-06', 'help-folded');
      await t.page.locator('#sheet details.hp').nth(4).locator('summary').click();
      t.expect(await t.page.locator('#sheet details.hp').nth(4).evaluate((d) => d.open), 'a click opens Controls');
      t.expect(await t.page.locator('#sheet kbd').first().isVisible(), 'and the key caps show');
      await t.page.locator('#sheet details.hp').nth(4).locator('summary').focus();
      await t.page.keyboard.press('Enter');
      t.expect(!(await t.page.locator('#sheet details.hp').nth(4).evaluate((d) => d.open)), 'Enter folds it again');
      await t.page.locator('#sheet details.hp').nth(4).locator('summary').click();
      await shot(t, 'S4-06', 'help-controls');
      await t.checkLayout();
      await t.game('scene', 'stats'); await shot(t, 'S4-06', 'stats');
    },
  },
  {
    name: 'w3b S3-02 Unified Deal Fairness defaults fresh profiles to stratified Winnable (Any), supports Easy/Medium/Hard/Classic Random across all games, preserves S.grade, and counts gradeWins',
    async run(t) {
      // Fresh profile defaults to unified dealFairness: 'winnable' (Winnable (Any), winnable: true)
      await t.page.evaluate(() => localStorage.removeItem('spa-solitaire:v1:settings'));
      await t.reload();
      let s = await t.state();
      t.equal([s.settings.dealFairness, s.settings.winnable, s.settings.dealGrade], ['winnable', true, 'any'], 'fresh profile defaults to Winnable (Any) (W6-S3-04)');

      await baseSettings(t, { dealFairness: 'random' });
      // the bands for Klondike Draw 1: easy up to 100 positions, medium up to 400, then hard
      const gradeOf = (n) => (n <= 100 ? 'easy' : n <= 400 ? 'medium' : 'hard');
      await t.seed(5); await t.game('newGame', { mode: 'klondike', draw: 1 });
      s = await t.state();
      t.equal([s.deal, s.winnable, s.grade], [5, false, ''], 'Classic Random deals the plain unverified shuffle');

      // Winnable (Any) preserves solver-measured S.grade rather than stripping it
      await t.game('setSettings', { dealFairness: 'winnable' });
      await t.seed(5); await t.game('newGame', { mode: 'klondike', draw: 1 });
      await t.page.waitForFunction(() => window.__game.getState().scene === 'game', null, { timeout: 30000 });
      s = await t.state();
      t.expect(s.winnable && ['easy', 'medium', 'hard'].includes(s.grade), 'Winnable (Any) preserves solver-measured S.grade: ' + s.grade);

      const seen = [];
      for (const want of ['easy', 'medium', 'hard']) {
        await t.game('setSettings', { dealFairness: want });
        await t.seed(5);
        await t.game('newGame', { mode: 'klondike', draw: 1 });
        await t.page.waitForFunction(() => window.__game.getState().scene === 'game', null, { timeout: 30000 });
        s = await t.state();
        t.expect(s.winnable, want + ': the deal is one the solver won');
        t.equal(s.grade, want, want + ': the deal carries the grade asked for');
        const r = await t.game('solve', 'klondike', { draw: 1 }, s.deal, 3000);
        t.equal([r.result, gradeOf(r.used)], ['won', want], want + ': measured on its own, the solver agrees (used ' + r.used + ' positions)');
        t.expect((await t.page.locator('#modeSub').textContent()).includes(' · ' + want), want + ': the header says so');
        seen.push(s.deal);
      }
      t.equal(new Set(seen).size, 3, 'three grades, three different deals from one seed');

      // Unified Settings selector: 5 buttons (Winnable (Any), Easy, Medium, Hard, Classic Random), zero legacy conflicting toggles
      await t.game('scene', 'settings');
      t.equal(await t.page.locator('#sheet [data-set="dealFairness"]').count(), 5, 'Settings has 5 unified Deal fairness choices');
      t.equal(await t.page.locator('#sheet [data-set="dealGrade"]').count(), 0, 'legacy separate dealGrade selector retired');
      t.equal(await t.page.locator('#sheet [data-tog="winnable"]').count(), 0, 'legacy conflicting winnable switch retired');
      await t.page.locator('#sheet [data-set="dealFairness"]').first().scrollIntoViewIfNeeded();
      await shot(t, 'S3-02', 'settings');
      await t.checkLayout();
      await t.game('scene', 'game'); await shot(t, 'S3-02', 'header');

      // FreeCell now supports Easy / Medium / Hard classic MS buckets (1..32,000 excluding #11982) + Winnable (Any) + Classic Random
      const fcSeen = [];
      for (const want of ['easy', 'medium', 'hard']) {
        await t.game('setSettings', { dealFairness: want });
        await t.seed(9); await t.game('newGame', { mode: 'freecell' });
        s = await t.state();
        t.expect(s.winnable && s.grade === want && s.deal >= 1 && s.deal <= 32000 && s.deal !== 11982, 'FreeCell ' + want + ': classic deal #' + s.deal);
        fcSeen.push(s.deal);
      }
      t.equal(new Set(fcSeen).size, 3, 'FreeCell Easy/Medium/Hard pick distinct classic buckets');
      await t.game('setSettings', { dealFairness: 'random' });
      await t.seed(9); await t.game('newGame', { mode: 'freecell' });
      s = await t.state(); t.equal([s.deal, s.winnable], [9, false], 'FreeCell Classic Random deals the plain numbered deal');

      // Spider 2-suit & Spider 4-suit serve pre-verified Easy/Medium/Hard pools instantly (< 15 ms)
      for (const suits of [2, 4]) {
        for (const want of ['easy', 'medium', 'hard']) {
          await t.game('setSettings', { dealFairness: want });
          const res = await t.page.evaluate(([su]) => {
            window.__game.seed(17);
            const t0 = performance.now();
            window.__game.newGame({ mode: 'spider', suits: su });
            const st = window.__game.getState();
            return { ms: performance.now() - t0, deal: st.deal, winnable: st.winnable, grade: st.grade };
          }, [suits]);
          t.expect(res.winnable && res.grade === want, 'Spider ' + suits + '-suit ' + want + ': verified pool deal #' + res.deal);
          if (suits === 2) {
            const sv = await t.game('solve', 'spider', { suits: 2 }, res.deal, 3000);
            t.equal(sv.result, 'won', 'Spider 2-suit ' + want + ' deal #' + res.deal + ' verifies won via makeSolver');
          }
        }
      }

      // first wins of a graded deal are counted, replays are not
      const win = async (deal) => {
        await t.game('setState', Object.assign(nearWinKlondike(), { deal, grade: 'hard' }));
        await t.game('act', 'move', 't0', 'f3');
        await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      };
      await win(41); await win(41); await win(42);
      t.equal((await t.game('meta')).gradeWins, { easy: 0, medium: 0, hard: 2 }, 'two hard deals won, the replay not counted');
      await t.game('scene', 'records');
      t.expect((await t.page.locator('#sheet').textContent()).includes('Hard 2'), 'Records shows the count');
      await t.reload();
      t.equal((await t.game('meta')).gradeWins.hard, 2, 'it survives a reload');
      await t.page.evaluate(() => { const k = 'spa-solitaire:v1:meta'; const m = JSON.parse(localStorage.getItem(k)); m.gradeWins = { easy: 'x', hard: -4, medium: 3.7 }; localStorage.setItem(k, JSON.stringify(m)); });
      await t.reload();
      t.equal((await t.game('meta')).gradeWins, { easy: 0, medium: 3, hard: 0 }, 'a damaged count is mended, nothing else breaks');
      // Damaged dealFairness falls back cleanly to Winnable (Any)
      await t.page.evaluate(() => { const k = 'spa-solitaire:v1:settings'; const o = JSON.parse(localStorage.getItem(k) || '{}'); o.dealFairness = 'bogus'; localStorage.setItem(k, JSON.stringify(o)); });
      await t.reload();
      t.equal((await t.state()).settings.dealFairness, 'winnable', 'damaged dealFairness falls back to winnable');
    },
  },
  {
    name: 'w3b S3-06 Statistics shows the average win time, unaided wins and the last 20 results; a damaged list is mended',
    async run(t) {
      await baseSettings(t, { sound: false });
      const SK = 'spa-solitaire:v1:stats';
      const seeded = (o) => t.page.evaluate(([k, o]) => { localStorage.setItem(k, JSON.stringify(o)); }, [SK, o]);
      const base = { played: 4, won: 3, streak: 1, bestStreak: 2, bestTimeMs: 60000, fewestMoves: 90, bestScore: 900, totalMs: 270000, assistedWon: 1 };
      await seeded({ klondike1: Object.assign({}, base, { recent: 'WWAL' }), klondike3: Object.assign({}, base, { recent: 'W'.repeat(25) }), yukon: Object.assign({}, base, { recent: 'Wxyz' }), freecell: Object.assign({}, base, { totalMs: 0, won: 0 }) });
      await t.reload();
      let st = await t.game('stats');
      t.equal(st.klondike1.recent, 'WWAL', 'a good list is kept');
      t.equal(st.klondike3.recent.length, 20, 'a list longer than 20 is cut to the newest 20');
      t.equal(st.yukon.recent, '', 'a damaged list is dropped, the numbers beside it stay (' + st.yukon.won + ' won)');
      await t.game('scene', 'stats');
      let txt = await t.page.locator('#sheet table.st').textContent();
      t.expect(txt.includes('Average win time1:30'), 'average win time is total time over wins (270 s over 3 wins)');
      t.expect(txt.includes('Wins without Undo or Hint2 of 3'), 'three wins, one assisted, leaves two unaided (C4-10: one row, "2 of 3")');
      t.equal(await t.page.locator('#sheet .rs i').allTextContents(), ['W', 'W', 'A', 'L'], 'the strip shows the results, oldest first');
      t.expect((await t.page.locator('#sheet .rs').getAttribute('aria-label')).includes('won with help'), 'and says them to a screen reader');
      await t.page.locator('#sheet [data-key="freecell"]').click();
      t.expect((await t.page.locator('#sheet table.st').textContent()).includes('Average win timen/a'), 'no wins means no average');
      t.equal(await t.page.locator('#sheet .rs').count(), 0, 'and no strip for a game never played');
      // a win and an abandoned game add to the strip
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 51 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 52 });
      const m = (await t.game('legalMoves')).find((x) => x.to && x.from !== 'stock'); await t.game('act', 'move', m.from, m.to, m.count);
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 53 });
      st = await t.game('stats');
      t.equal(st.klondike1.recent, 'WWALWL', 'a win adds W, a deal left behind adds L');
      await t.game('scene', 'stats');
      await t.page.locator('#sheet .rs').scrollIntoViewIfNeeded();
      await shot(t, 'S3-06', 'stats');
      await t.checkLayout();
      await t.reload();
      t.equal((await t.game('stats')).klondike1.recent, 'WWALWL', 'it survives a reload');
    },
  },
  {
    name: 'w3b S3-16 Win facts are ones not yet met, then the longest unseen; Records keeps the collection; damaged lists are mended',
    async run(t) {
      await baseSettings(t, { sound: false });
      const MK = 'spa-solitaire:v1:meta';
      const setSeen = (seen) => t.page.evaluate(([k, seen]) => { const m = JSON.parse(localStorage.getItem(k) || '{}'); m.seenFacts = seen; localStorage.setItem(k, JSON.stringify(m)); }, [MK, seen]);
      const win = async (deal) => {
        await t.game('setState', Object.assign(nearWinKlondike(), { deal }));
        await t.game('act', 'move', 't0', 'f3');
        await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
        return (await t.page.locator('#sheet .fact .q').textContent());
      };
      t.equal((await t.game('meta')).seenFacts, [], 'a new profile has met none');
      await setSeen(['x', -1, 3.5, 2, 2, 7]); await t.reload();
      t.equal((await t.game('meta')).seenFacts, [2, 7], 'a damaged list keeps whole numbers once each (' + JSON.stringify((await t.game('meta')).seenFacts) + ')');
      const all = Array.from({ length: 50 }, (_, i) => i);
      await setSeen(all.slice(0, 48)); await t.reload();
      const a = await win(11);
      let seen = (await t.game('meta')).seenFacts;
      t.equal([seen.length, all.slice(48).includes(seen[48])], [49, true], 'with 48 met, the win shows one of the two others');
      const b = await win(12);
      seen = (await t.game('meta')).seenFacts;
      t.equal(seen.length, 50, 'the next win shows the last one');
      t.expect(a !== b, 'two different facts back to back');
      const c = await win(13);
      const seen2 = (await t.game('meta')).seenFacts;
      t.equal([seen2.length, new Set(seen2).size], [50, 50], 'all met: nothing is lost from the collection');
      t.expect(c !== b && c !== a, 'a fourth is a repeat, but not one of the last two shown');
      t.expect(seen.slice(0, 25).includes(seen2[49]), 'it came from the half shown longest ago');
      await t.game('scene', 'records');
      await t.page.click('#ltab-facts');
      t.expect((await t.page.locator('#lpanel-facts').textContent()).includes('Facts found: 50 of 50'), 'Bathhouse Ledger Facts counts them');
      t.equal(await t.page.locator('#lpanel-facts .fnd li').count(), 50, 'and lists them');
      await t.page.locator('#lpanel-facts .fnd li').nth(3).scrollIntoViewIfNeeded();
      await shot(t, 'S3-16', 'records');
      await t.checkLayout();
      await t.reload();
      t.equal((await t.game('meta')).seenFacts.length, 50, 'the collection survives a reload');
    },
  },
  {
    name: 'w3b S3-10 Hint leads with the first move of a winning line; following hints wins a deal that needs search; a deal with no line still gets hints',
    async run(t) {
      await baseSettings(t, { autoFoundation: 'safe', motion: 'reduced', tips: false });
      // deals chosen by the solver itself, so the test does not depend on luck: Klondike deals that need a real search, and one it cannot win
      const picks = await t.page.evaluate(() => {
        const G = window.__game, hard = [], none = [], yukon = [];
        for (let d = 1; d <= 80 && (hard.length < 2 || !none.length); d++) {
          const deal = d * 7919, r = G.solve('klondike', { draw: 1 }, deal, 2000);
          if (r.result === 'won' && r.used >= 150 && hard.length < 2) hard.push(deal);
          else if (r.result !== 'won' && !none.length) none.push(deal);
        }
        for (let d = 1; d <= 80 && !yukon.length; d++) { const r = G.solve('yukon', {}, d * 7919, 2000); if (r.result === 'won' && r.used >= 80) yukon.push(d * 7919); }
        return { hard, none, yukon };
      });
      t.expect(picks.hard.length === 2 && picks.none.length === 1 && picks.yukon.length === 1, 'found deals to use (' + JSON.stringify(picks) + ')');
      const follow = (deal, mode = 'klondike') => t.page.evaluate(async ([deal, mode]) => {
        const G = window.__game; await G.newGame({ mode, draw: 1, deal });
        let firstSolver = null, k = 0, last;
        for (; k < 300; k++) {
          const st = G.getState(); if (st.won) break;
          const h = G.act('hint'); if (!h.ok || h.stuck) { last = h; break; }
          if (firstSolver === null) firstSolver = !!(h.move ? h.move.solver : h.stock);
          if (h.move) G.act('move', h.move.from, h.move.to, st.piles[h.move.from].length - h.move.index); else G.act('draw');
        }
        return { won: G.getState().won || G.getState().scene === 'win', steps: k, firstSolver, ok: !last };
      }, [deal, mode]);
      for (const deal of picks.hard) {
        const r = await follow(deal);
        t.expect(r.firstSolver, 'deal ' + deal + ': the first hint comes from the solver line');
        t.expect(r.won, 'deal ' + deal + ': taking every hint wins it (' + r.steps + ' hints)');
        await t.game('scene', 'game');
      }
      const yk = await follow(picks.yukon[0], 'yukon');
      t.expect(yk.firstSolver && yk.won, 'Yukon deal ' + picks.yukon[0] + ': solver hint first, and taking every hint wins it (' + yk.steps + ' hints)');
      await t.game('scene', 'game');
      const none = await follow(picks.none[0]);
      t.equal(none.firstSolver, false, 'a deal with no winning line gets the old kind of hint');
      t.expect(none.steps > 0, 'and still gets hints (' + none.steps + ')');
      await t.game('scene', 'game');
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: picks.hard[0] });
      await t.game('act', 'hint'); await shot(t, 'S3-10', 'hint');
    },
  },
  {
    name: 'w3b W1-S2-01 Standard efficiency bonus (FreeCell/Yukon/Klondike), Klondike waste->found +15 parity, and Spider/Timed orthogonality',
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, scoring: 'standard', autoFoundation: 'off' });
      const runS = (s, n = 13) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].slice(0, n).map((r) => r + s);
      const fcNear = (deal, moves) => ({
        mode: 'freecell', deal, score: 510, moves,
        piles: { c0: [], c1: [], c2: [], c3: [], f0: runS('C'), f1: runS('D'), f2: runS('H'), f3: runS('S', 12), t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [] },
      });
      const ykNear = (deal, moves) => ({
        mode: 'yukon', deal, score: 615, moves,
        piles: { f0: runS('C'), f1: runS('D'), f2: runS('H'), f3: runS('S', 12), t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      const klNear = (draw, deal, moves, fromWaste) => ({
        mode: 'klondike', opts: { draw }, deal, score: 500, moves,
        piles: { stock: [], waste: fromWaste ? ['KS'] : [], f0: runS('C'), f1: runS('D'), f2: runS('H'), f3: runS('S', 12), t0: fromWaste ? [] : ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      const winAndRead = async (setup, from, to) => {
        await t.game('setState', setup);
        await t.game('act', 'move', from, to);
        await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
        return {
          st: await t.state(),
          lw: await t.game('lastWin'),
          meta: await t.page.locator('#sheet .ticket .meta').first().textContent(),
        };
      };

      // 1. Klondike direct waste->found awards +15 mid-game (matching waste->tab +5 + tab->found +10)
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 }, deal: 700,
        piles: { stock: [], waste: ['AS'], f0: [], f1: [], f2: [], f3: [], t0: ['KD'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      await t.game('act', 'move', 'waste', 'f0');
      t.equal((await t.state()).score, 15, 'Klondike direct waste->found awards +15');

      // 2. Klondike direct vs waste->tab->found detour parity at moves=90 (inside par) and moves=240 (above parCeil)
      const dir90 = await winAndRead(klNear(1, 701, 89, true), 'waste', 'f3');
      t.equal([dir90.st.moves, dir90.lw.effBonus, dir90.st.score], [90, 390, 905], 'Klondike Draw 1 direct waste->found at 90 moves: +15 card + 390 eff = 905');
      await t.game('setState', klNear(1, 702, 89, true));
      await t.game('act', 'move', 'waste', 't0');
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      const det91 = { st: await t.state(), lw: await t.game('lastWin') };
      t.equal([det91.st.moves, det91.lw.effBonus, det91.st.score], [91, 387, 902], 'Klondike Draw 1 detour waste->tab->found at 91 moves: +15 card + 387 eff = 902');
      t.expect(dir90.st.score > det91.st.score, 'direct waste->found strictly beats detour inside par window');

      const dir240 = await winAndRead(klNear(1, 703, 239, true), 'waste', 'f3');
      t.equal([dir240.st.moves, dir240.lw.effBonus, dir240.st.score], [240, 0, 515], 'Klondike Draw 1 direct waste->found at 240 moves: +15 card + 0 eff = 515');
      await t.game('setState', klNear(1, 704, 239, true));
      await t.game('act', 'move', 'waste', 't0');
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      const det241 = { st: await t.state(), lw: await t.game('lastWin') };
      t.equal([det241.st.moves, det241.lw.effBonus, det241.st.score], [241, 0, 515], 'Klondike Draw 1 detour at 241 moves equals direct score (515, strictly detour-neutral)');

      // 3. Klondike Draw 1 & Draw 3 par curves (cap, mid, zero)
      const k1Cap = await winAndRead(klNear(1, 705, 69, false), 't0', 'f3');
      t.equal([k1Cap.lw.effBonus, k1Cap.st.score], [450, 960], 'Klondike Draw 1 at 70 moves hits 450 cap');
      const k3Mid = await winAndRead(klNear(3, 706, 139, false), 't0', 'f3');
      t.equal([k3Mid.lw.effBonus, k3Mid.st.score], [300, 810], 'Klondike Draw 3 at 140 moves earns (240-140)*3 = 300 effBonus');
      const k3Zero = await winAndRead(klNear(3, 707, 239, false), 't0', 'f3');
      t.equal([k3Zero.lw.effBonus, k3Zero.st.score], [0, 510], 'Klondike Draw 3 at 240 moves earns 0 effBonus');
      t.expect(!k3Zero.meta.includes('efficiency'), 'zero effBonus omits efficiency tag on Bath Ticket: ' + k3Zero.meta);

      // 4. FreeCell Standard efficiency bonus unlocks PB progression (110 -> 80 -> 52 moves) & 160+ floor
      const fc110 = await winAndRead(fcNear(710, 109), 't0', 'f3');
      t.equal([fc110.lw.effBonus, fc110.st.score], [250, 770], 'FreeCell 110 moves: 520 + 250 = 770');
      t.expect(fc110.meta.includes(' · efficiency +250') && !fc110.meta.includes('time bonus'), 'FreeCell Bath Ticket discloses · efficiency +250 without time bonus: ' + fc110.meta);
      await shot(t, 'W1-S2-01', 'freecell-ticket-eff');
      await t.checkLayout();
      t.equal((await t.game('stats')).freecell.bestStandardScore, 770, 'FreeCell first win records bestStandardScore=770');

      const fc80 = await winAndRead(fcNear(711, 79), 't0', 'f3');
      t.equal([fc80.lw.effBonus, fc80.st.score], [400, 920], 'FreeCell 80 moves: 520 + 400 = 920');
      t.equal((await t.game('stats')).freecell.bestStandardScore, 920, 'FreeCell cleaner win advances bestStandardScore from 770 to 920');

      const fc52 = await winAndRead(fcNear(712, 51), 't0', 'f3');
      t.equal([fc52.lw.effBonus, fc52.st.score], [540, 1060], 'FreeCell 52 moves hits 540 cap (1060)');

      const fc160 = await winAndRead(fcNear(713, 159), 't0', 'f3');
      t.equal([fc160.lw.effBonus, fc160.st.score], [0, 520], 'FreeCell 160 moves floors effBonus at 0 (520)');
      t.expect(!fc160.meta.includes('efficiency'), 'FreeCell 160-move Bath Ticket omits zero efficiency tag: ' + fc160.meta);

      // 5. Yukon Standard efficiency bonus (45 cap, 90 mid, 140 floor)
      const yk90 = await winAndRead(ykNear(720, 89), 't0', 'f3');
      t.equal([yk90.lw.effBonus, yk90.st.score], [250, 875], 'Yukon 90 moves: 625 + 250 = 875');
      const yk45 = await winAndRead(ykNear(721, 44), 't0', 'f3');
      t.equal([yk45.lw.effBonus, yk45.st.score], [475, 1100], 'Yukon 45 moves hits 475 cap (1100)');
      const yk140 = await winAndRead(ykNear(722, 139), 't0', 'f3');
      t.equal([yk140.lw.effBonus, yk140.st.score], [0, 625], 'Yukon 140 moves floors effBonus at 0 (625)');

      // 6. Spider stays strictly orthogonal (effBonus === 0; 500 - moves + 100*runs)
      const spRun = ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'];
      const spRes = await winAndRead({
        mode: 'spider', opts: { suits: 1 }, deal: 730, score: 1150, moves: 49, runs: 7,
        piles: { stock: [], f0: runS('S'), f1: runS('S'), f2: runS('S'), f3: runS('S'), f4: runS('S'), f5: runS('S'), f6: runS('S'), f7: [], t0: spRun, t1: ['AS'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [] },
      }, 't1', 't0');
      t.equal([spRes.lw.effBonus, spRes.st.score], [0, 1249], 'Spider remains untouched: effBonus=0, score=1150-1+100=1249');
      t.expect(!spRes.meta.includes('efficiency'), 'Spider Bath Ticket never shows efficiency tag: ' + spRes.meta);

      // 7. Timed mode remains strictly orthogonal (CD-WF1-02: timeBonus only, effBonus === 0)
      await t.game('setSettings', { scoring: 'timed' });
      const fcTimed = await winAndRead(fcNear(740, 79), 't0', 'f3');
      t.equal(fcTimed.lw.effBonus, 0, 'Timed mode never stacks Standard efficiencyBonus (CD-WF1-02)');
      t.expect(fcTimed.lw.bonus > 0 && fcTimed.st.score === 520 + fcTimed.lw.bonus, 'Timed FreeCell score is strictly cardPoints + timeBonus');
      t.expect(fcTimed.meta.includes(' · time bonus +') && !fcTimed.meta.includes('efficiency'), 'Timed Bath Ticket shows time bonus only, never efficiency: ' + fcTimed.meta);
    },
  },
];
