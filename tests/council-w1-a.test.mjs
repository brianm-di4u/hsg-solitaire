// Council wave 1, batch A: stability, saves and lifecycle (S1-01, S6-01, S6-02, S6-04, S6-07, S6-12, S6-03).
import { baseSettings } from './_util.mjs';

const CUR = 'spa-solitaire:v1:current';
const settle = (t) => t.page.waitForTimeout(450);
const reloadGame = async (t) => { await t.page.reload(); await t.page.waitForFunction(() => !!window.__game); };
async function startedKlondike(t, deal = 11) {
  await baseSettings(t, { motion: 'reduced' });
  await t.game('newGame', { mode: 'klondike', draw: 1, deal });
  await t.game('act', 'draw');
  await t.waitForStable(); await settle(t);
}
const stored = (t, key) => t.page.evaluate((k) => localStorage.getItem(k), key);

export const tests = [
  // ---- S1-01 ----
  {
    name: 'w1a S1-01 New button, N key and restart ask before abandoning a started deal',
    async run(t) {
      await startedKlondike(t);
      const before = await t.state(); t.expect(before.moves === 1, 'one move played');
      await t.page.click('#bNew');
      let s = await t.state(); t.equal(s.modal, 'confirm', 'New button opens the confirm sheet');
      t.equal(s.deal, before.deal, 'deal untouched while asking');
      await t.page.click('#sheet [data-close][data-focus]');
      s = await t.state(); t.equal(s.modal, null, 'Cancel closes the sheet'); t.equal(s.moves, 1, 'game kept after Cancel');
      await t.game('act', 'key', 'n');
      t.equal((await t.state()).modal, 'confirm', 'N key opens the confirm sheet');
      await t.page.click('#sheet [data-close][data-focus]');
      await t.page.click('#bMenu'); await t.page.click('#sheet [data-a="restart"]');
      t.equal((await t.state()).modal, 'confirm', 'Restart from the menu asks too');
      await t.page.click('#sheet [data-close][data-focus]');
      t.equal((await t.state()).moves, 1, 'still the same game');
      t.expect(JSON.parse(await stored(t, CUR)).state.moves === 1, 'saved game untouched');
      await t.page.click('#bNew'); await t.page.click('#sheet [data-a="yes"]');
      s = await t.state(); t.equal(s.modal, null, 'confirm closes'); t.equal(s.moves, 0, 'fresh deal after confirming'); t.expect(s.deal !== before.deal, 'new deal number');
    },
  },
  {
    name: 'w1a S1-01 no confirmation when nothing has been played, or the deal is won',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 12 });
      await t.waitForStable();
      await t.page.click('#bNew');
      const s = await t.state(); t.equal(s.modal, null, 'unstarted deal is replaced without asking'); t.expect(s.deal !== 12, 'new deal dealt');
    },
  },
  {
    name: 'w1a S1-01 title chips keep the saved game until the player confirms',
    async run(t) {
      await startedKlondike(t, 13);
      await reloadGame(t);
      t.expect(await t.page.isVisible('#tCont'), 'Continue offered');
      await t.page.click('#tiles .chip >> nth=4'); // Spider, 1 suit
      let s = await t.state(); t.equal(s.scene, 'confirm', 'chip asks first');
      t.expect(JSON.parse(await stored(t, CUR)).state.mode === 'klondike', 'save still the Klondike game');
      await t.page.click('#sheet [data-close][data-focus]');
      await t.page.waitForTimeout(450);
      t.expect(JSON.parse(await stored(t, CUR)).state.mode === 'klondike', 'save kept after Cancel');
      await t.page.click('#tCont'); await t.waitForStable();
      s = await t.state(); t.equal(s.mode, 'klondike', 'Continue still resumes it'); t.equal(s.moves, 1, 'with its move');
      await t.game('scene', 'title');
      await t.page.click('#tiles .chip >> nth=4'); await t.page.click('#sheet [data-a="yes"]'); await t.waitForStable();
      s = await t.state(); t.equal(s.mode, 'spider', 'confirmed chip starts Spider');
    },
  },
];
