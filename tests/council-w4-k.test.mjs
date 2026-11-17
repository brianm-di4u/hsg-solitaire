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
  {
    name: 'w4k K-03 Enter in the Deal # box opened from the title deals, as the Deal button does',
    async run(t) {
      await baseSettings(t, { tips: false, motion: 'reduced' });
      await t.game('scene', 'title'); await t.waitForStable();
      await t.page.locator('#tiles .chip[aria-label="FreeCell: Deal #"]').click();
      await t.page.waitForSelector('#dealIn');
      await t.page.fill('#dealIn', '4242');
      await t.page.press('#dealIn', 'Enter');
      await t.page.waitForFunction(() => { const s = window.__game.getState(); return s.deal === 4242 && s.mode === 'freecell' && !s.modal; }, null, { timeout: 5000 });
      const s = await t.state(); t.equal([s.mode, s.deal], ['freecell', 4242], 'Enter from the title chip dealt FreeCell 4242, and no other chip was pressed after it');
    },
  },
  {
    name: 'w4k K-04 the plaque lines stay on one line at 390, 360 and 320 px wide',
    viewports: ['mobile'],
    async run(t) {
      await baseSettings(t, { tips: false });
      for (const [w, h] of [[390, 844], [360, 640], [320, 568]]) {
        await t.page.setViewportSize({ width: w, height: h });
        await t.game('scene', 'title'); await t.waitForStable();
        const p = await t.page.evaluate(() => [...document.querySelectorAll('.tile .tsub')].map((e) => {
          const r = document.createRange(); r.selectNodeContents(e);
          return { text: e.textContent, lines: new Set([...r.getClientRects()].map((q) => Math.round(q.top))).size, clipped: e.scrollWidth > e.clientWidth + 1, over: e.getBoundingClientRect().right > e.closest('.tile').getBoundingClientRect().right };
        }));
        t.expect(p.every((x) => x.lines === 1 && !x.clipped && !x.over), w + 'x' + h + ': one line each, none cut off: ' + JSON.stringify(p.map((x) => [x.text, x.lines])));
        await t.checkLayout(); await shot(t, 'K-04', 'plaques-' + w);
      }
    },
  },
];
