// Council wave 4b, batch A (clean-up): K-02 a failed Hint search does not stick later Hints, K-03 Enter deals from the title's Deal # box,
// K-04 plaque lines on small phones, K-05 a dead end keeps its fact while the position is unchanged, K-06 room right of the two-tab notice's button.
// (K-01, the ambient layer's floor, is in council-w3-e.test.mjs where that test lives.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-4b', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };
const MK = 'spa-solitaire:v1:meta';
const DEAD = { mode: 'klondike', piles: { stock: [], waste: [], t0: ['5C'], t1: ['5S'], t2: [], t3: [], t4: [], t5: [], t6: [] } };

export const tests = [
  {
    name: 'w4k K-02 a Hint search that throws part-way does not leave every later Hint on pending',
    allowConsoleErrors: true, // the thrown error is meant to reach the console: the fix clears the job, it does not hide the failure
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { tips: false, motion: 'reduced' });
      await t.seed(7); await t.game('newGame', { mode: 'klondike', draw: 1 });
      // A press of the button runs the sliced search; the hook makes that search throw on its first turn.
      await t.game('failNextHint');
      await t.page.click('#bHint');
      await t.page.waitForFunction(() => !window.__game.getState().hinting, null, { timeout: 5000 });
      t.equal(await t.page.evaluate(() => window.__game.getState().hinting), false, 'the failed search is no longer pending');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'fault');
      await t.page.keyboard.press('Escape'); // the game's own 'Something went wrong' dialog told the player; the failure is shown, not hidden
      await t.page.waitForFunction(() => !window.__game.getState().modal);
      // the next press must start a real search (it answers pending until that search has finished), then give an answer
      await t.page.click('#bHint');
      await t.page.waitForFunction(() => { const s = window.__game.getState(); return !s.hinting; }, null, { timeout: 5000 });
      const h = await t.page.evaluate(() => window.__game.act('hint'));
      t.expect(h.ok === true && !h.pending, 'a later Hint answers, not pending: ' + JSON.stringify(h));
    },
  },
];
