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
];
