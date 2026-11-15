// Council wave 3, batch B: controls, rules and play; difficulty, progression and records.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-3', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };

const winNear = async (t, deal) => {
  await t.game('setState', Object.assign(nearWinKlondike(), { deal, moves: 30 }));
  await t.game('act', 'move', 't0', 'f3');
  await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
};

export const tests = [
  {
    name: 'w3b S2-19 Scoring: Timed keeps the speed bonus, Standard drops it, None hides the score',
    async run(t) {
      await baseSettings(t);
      t.equal((await t.state()).settings.scoring, 'timed', 'a new profile is scored the way the game always was');
      await winNear(t, 301);
      let txt = await t.page.locator('#sheet').textContent();
      t.expect(txt.includes('time bonus +'), 'Timed: the ticket shows the speed bonus');
      const timedScore = (await t.state()).score;
      t.expect(timedScore > 900, 'Timed: the bonus is in the score (' + timedScore + ')');
      const best = (await t.game('stats')).klondike1.bestScore;
      t.equal(best, timedScore, 'Timed: the best score is saved');

      await t.game('setSettings', { scoring: 'standard' });
      await winNear(t, 302);
      txt = await t.page.locator('#sheet').textContent();
      t.expect(!txt.includes('time bonus'), 'Standard: no speed bonus on the ticket');
      const stdScore = (await t.state()).score;
      t.expect(stdScore < 100, 'Standard: the score is points only (' + stdScore + ')');
      t.equal((await t.game('stats')).klondike1.bestScore, best, 'Standard: a points-only score does not touch the Timed best');

      await t.game('setSettings', { scoring: 'none' });
      await winNear(t, 303);
      txt = await t.page.locator('#sheet').textContent();
      t.expect(!txt.includes('Score') && !txt.includes('time bonus'), 'None: the ticket shows no score at all');
      await shot(t, 'S2-19', 'ticket-none');
      await t.game('scene', 'game');
      t.expect(await t.page.locator('#sScoreW').isHidden(), 'None: the Score cell leaves the status bar');
      t.expect(await t.page.locator('#sMoves').isVisible(), 'while Moves stays');
      await t.game('setSettings', { scoring: 'timed' });
      t.expect(await t.page.locator('#sScoreW').isVisible(), 'choosing Timed brings it back');
    },
  },
  {
    name: 'w3b S2-19 a points-only win is not recorded as a best score, so it can never stand in front of a Timed one',
    async run(t) {
      await baseSettings(t, { scoring: 'standard' });
      // a high points score, as a long game with many moves home would have: more than a slow Timed win could ever reach
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 311, moves: 30, score: 5000 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      t.equal([(await t.game('stats')).klondike1.won, (await t.game('stats')).klondike1.bestScore], [1, 0], 'Standard: the win counts, but no best score is kept for it');
      await t.game('setSettings', { scoring: 'timed' });
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 312, moves: 30, score: 100 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      const best = (await t.game('stats')).klondike1.bestScore;
      t.expect(best > 1000 && best < 5000, 'Timed: its own win sets the best score (' + best + ')');
    },
  },
  {
    name: 'w3b S2-19 Settings has a Scoring row, it is saved, and a damaged value falls back to Timed',
    async run(t) {
      await baseSettings(t);
      await t.game('scene', 'settings');
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
      t.equal((await t.state()).settings.scoring, 'timed', 'a damaged value is replaced by the default');
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
    name: 'w3b S3-02 Deal difficulty picks a solver-won random deal of the asked grade, says so, and counts first wins per grade',
    async run(t) {
      await baseSettings(t, { dealGrade: 'any', winnable: false });
      // the bands for Klondike Draw 1, as the page sets them: easy up to 100 positions, medium up to 400, then hard
      const gradeOf = (n) => (n <= 100 ? 'easy' : n <= 400 ? 'medium' : 'hard');
      await t.seed(5); await t.game('newGame', { mode: 'klondike', draw: 1 });
      let s = await t.state();
      t.equal([s.deal, s.winnable, s.grade], [5, false, ''], 'Any is the plain shuffle, as before');
      const seen = [];
      for (const want of ['easy', 'medium', 'hard']) {
        await t.game('setSettings', { dealGrade: want });
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
      await t.game('scene', 'settings');
      t.equal(await t.page.locator('#sheet [data-set="dealGrade"]').count(), 4, 'Settings has Any, Easy, Medium and Hard');
      await t.page.locator('#sheet [data-set="dealGrade"]').first().scrollIntoViewIfNeeded();
      await shot(t, 'S3-02', 'settings');
      await t.checkLayout();
      await t.game('scene', 'game'); await shot(t, 'S3-02', 'header');
      // FreeCell and two-suit Spider are left alone
      await t.seed(9); await t.game('newGame', { mode: 'freecell' });
      s = await t.state(); t.equal([s.deal, s.winnable], [9, false], 'FreeCell is dealt as before');
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
      t.expect(txt.includes('Wins without Undo or Hint2'), 'three wins, one assisted, leaves two unaided');
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
      t.expect((await t.page.locator('#sheet').textContent()).includes('Facts found: 50 of 50'), 'Records counts them');
      await t.page.locator('#sheet details.hp summary').first().click();
      t.equal(await t.page.locator('#sheet details.hp[open] .fnd li').count(), 50, 'and lists them');
      await t.page.locator('#sheet details.hp[open] .fnd li').nth(3).scrollIntoViewIfNeeded();
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
          else if (r.result === 'dead' && !none.length) none.push(deal);
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
];
