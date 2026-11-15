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
  {
    name: 'w3c S2-08 the first card to go home by itself is explained once, and a save from before does not get it',
    async run(t) {
      await baseSettings(t, { autoFoundation: 'safe', autoNoted: false });
      const deal = async () => {
        await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: ['#2C', '#AC'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
        await clearToast(t);
        await t.game('act', 'draw');
        await t.page.waitForFunction(() => window.__game.getState().piles.f0.length > 0);
      };
      await deal();
      await t.page.waitForFunction(() => document.getElementById('toast').textContent.length > 0);
      t.equal(await toastText(t), 'Moved the ace of clubs up. Turn this off in Settings.', 'it names the card and the setting');
      fs.mkdirSync(SHOTS, { recursive: true }); await t.page.screenshot({ path: path.join(SHOTS, 'S2-08-toast-' + t.viewport + '.png') }); // now: a dead-end warning may replace the toast a moment later
      t.equal((await t.state()).settings.autoNoted, true, 'and remembers it has said so');
      await deal();
      t.equal(await toastText(t), '', 'the second time is silent');
      await t.reload();
      t.equal((await t.state()).settings.autoNoted, true, 'saved across a reload');
      // a save written before this change belongs to someone who has played: no toast for them
      await t.page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); delete s.autoNoted; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
      await t.reload();
      t.equal((await t.state()).settings.autoNoted, true, 'an old save counts as told');
      // with auto-move off nothing moves by itself, so nothing is said
      await t.game('setSettings', { autoFoundation: 'off', autoNoted: false });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: ['#AC'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      await clearToast(t); await t.game('act', 'draw'); await t.waitIdle();
      t.equal([await toastText(t), (await t.state()).settings.autoNoted], ['', false], 'Off: no move, no toast, nothing marked');
    },
  },
];
