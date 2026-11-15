// Council wave 3, batch C: feedback, teaching and help.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-3', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };
const KEY = 'spa-solitaire:v1:settings';
const toastText = (t) => t.page.evaluate(() => document.getElementById('toast').textContent);
const clearToast = (t) => t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });

export const tests = [
  {
    name: 'w3c S2-05 the assisted tag appears after a Hint or Undo and tapping it says what it means',
    async run(t) {
      await baseSettings(t);
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      t.expect(await t.page.locator('#assistTag').isHidden(), 'no tag on a fresh deal');
      await t.page.click('#bHint');
      await t.page.waitForFunction(() => !document.getElementById('assistTag').hidden);
      t.expect(!(await t.page.locator('#modeSub').textContent()).includes('assisted'), 'the sub-label stays about the deal');
      const box = await t.page.locator('#assistTag').boundingBox();
      t.expect(box && box.height >= 12 && box.width >= 40, 'the tag is a real control');
      await clearToast(t);
      await shot(t, 'S2-05', 'tag');
      await t.page.click('#assistTag');
      await t.page.waitForFunction(() => /Undo or Hint was used/.test(document.getElementById('toast').textContent));
      t.equal(await toastText(t), 'Undo or Hint was used. Wins still count, flagged as assisted.', 'a tap explains it');
      await shot(t, 'S2-05', 'toast');
      await t.checkLayout();
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      t.expect(await t.page.locator('#assistTag').isHidden(), 'a new deal starts clean');
    },
  },
];
