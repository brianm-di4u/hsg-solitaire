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
];
