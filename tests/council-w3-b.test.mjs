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
];
