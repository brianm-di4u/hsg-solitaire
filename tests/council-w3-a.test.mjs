// Council wave 3, batch A: saves, lifecycle and robustness; controls, rules and play.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-3', 'shots');
const rawShot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };

const P = 'spa-solitaire:v1:';
const raw = (t, k) => t.page.evaluate(([p, k]) => localStorage.getItem(p + k), [P, k]);
const waitModal = (t, kind) => t.page.waitForFunction((k) => window.__game.getState().scene === k, kind, { timeout: 8000 });
const suitDown = (s) => ['K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2', 'A'].map((r) => r + s);
// four columns that each end in an Ace: Finish plays all 52 cards home, 70 ms apart (about 3.6 s)
const finishDeal = () => ({ mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: suitDown('C'), t1: suitDown('D'), t2: suitDown('H'), t3: suitDown('S'), t4: [], t5: [], t6: [] } });
const firstMove = async (t) => { const m = (await t.game('legalMoves')).find((x) => x.to && x.from !== 'stock'); await t.game('act', 'move', m.from, m.to, m.count); };

export const tests = [
  {
    name: 'w3a S2-27 the page can be installed: a theme colour, and a standalone manifest that starts this page',
    async run(t) {
      const info = await t.page.evaluate(async () => {
        const tc = document.querySelector('meta[name="theme-color"]');
        const lk = document.querySelector('link[rel="manifest"]');
        const man = lk ? await (await fetch(lk.href)).json() : null;
        return { theme: tc && tc.content, man, page: location.href.split('#')[0].split('?')[0] };
      });
      t.equal(info.theme, '#101813', 'the browser bar takes the lacquer colour');
      t.expect(!!info.man, 'a manifest is linked');
      t.equal(info.man.display, 'standalone', 'it runs without the browser bar');
      t.equal(info.man.start_url, info.page, 'it starts this page');
      t.equal(info.man.name, 'Spa City Solitaire', 'named for the game');
      t.expect(info.man.icons.length > 0 && info.man.icons[0].src.startsWith('data:image/svg+xml'), 'the icon is drawn, not a file');
    },
  },
  {
    name: 'w3a S6-05 an error or a broken promise shows one notice with a way out, and reset clears the saved game',
    async run(t) {
      await baseSettings(t);
      await t.seed(11); await t.game('newGame', { mode: 'klondike' });
      await firstMove(t);
      await t.page.waitForFunction(([p]) => !!localStorage.getItem(p + 'current'), [P], { timeout: 8000 });
      await t.page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'boom' })));
      await waitModal(t, 'fault');
      t.expect((await t.page.locator('#sheet').textContent()).includes('Something went wrong'), 'the notice says so');
      await shot(t, 'S6-05', 'notice');
      await t.checkLayout();
      await t.page.locator('#sheet [data-close]').last().click();
      t.equal((await t.state()).scene, 'game', 'Carry on goes back to the table');
      await t.page.evaluate(() => window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: 'again' })));
      t.equal((await t.state()).modal, null, 'a second fault does not nag');
      await t.page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'ResizeObserver loop limit exceeded' })));
      t.equal((await t.state()).modal, null, 'harmless browser noise is ignored');
      await t.reload(); await t.waitForStable();
      await t.page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'boom' })));
      await waitModal(t, 'fault');
      await t.page.locator('[data-a="resetSaved"]').click();
      t.equal((await t.state()).scene, 'title', 'reset goes to the title');
      t.equal(await raw(t, 'current'), null, 'the saved game is gone');
      t.expect(await t.page.locator('#tCont').isHidden(), 'and there is nothing to Continue');
      await t.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      t.equal(await raw(t, 'current'), null, 'a closing page does not write it back');
    },
  },
  {
    name: 'w3a S6-05 a real throw in the draw loop is caught and the table draws again afterwards',
    allowConsoleErrors: true, // the page throws on purpose
    async run(t) {
      await baseSettings(t);
      await t.seed(11); await t.game('newGame', { mode: 'klondike' }); await t.waitForStable();
      await t.page.evaluate(() => { const o = CanvasRenderingContext2D.prototype.clearRect; window.__o = o; CanvasRenderingContext2D.prototype.clearRect = function () { CanvasRenderingContext2D.prototype.clearRect = o; throw new Error('boom'); }; });
      await t.game('act', 'draw');
      await waitModal(t, 'fault');
      await t.page.locator('#sheet [data-close]').last().click();
      await t.game('frameStats', true);
      await t.game('act', 'draw');
      await t.page.waitForFunction(() => window.__game.frameStats().frames > 0, null, { timeout: 8000 });
      t.expect((await t.game('frameStats')).frames > 0, 'frames run again after the throw');
    },
  },
  {
    name: 'w3a S6-06 blocked storage is said on the title and once in a toast, and a save that works again clears it',
    initScript: () => {
      window.__block = true;
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (window.__block) throw new Error('quota'); return set.call(this, k, v); };
    },
    async run(t) {
      await t.page.waitForFunction(() => document.getElementById('toast').textContent.includes('cannot be saved'), null, { timeout: 8000 });
      t.expect(await t.page.locator('#tStore').isVisible(), 'the title carries a notice while progress is not kept');
      t.equal(await t.page.locator('#tStore').textContent(), "Progress won't be kept in this browser.", 'in plain words');
      await shot(t, 'S6-06', 'title-notice');
      await t.checkLayout();
      await baseSettings(t);
      await t.game('newGame', { mode: 'klondike' });
      t.equal((await t.state()).storageOK, false, 'the game knows');
      await t.page.evaluate(() => { const e = document.getElementById('toast'); e.textContent = ''; });
      await firstMove(t);
      await t.page.waitForFunction(() => window.__game.getState().storageOK === false);
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), '', 'a later failed save does not toast again');
      await t.page.evaluate(() => { window.__block = false; });
      await t.game('act', 'draw');
      await t.page.waitForFunction(() => window.__game.getState().storageOK === true, null, { timeout: 8000 });
      await t.game('scene', 'title');
      t.expect(await t.page.locator('#tStore').isHidden(), 'the notice goes once saving works');
      t.expect(await t.page.locator('#tCont').isVisible(), 'and the game can be continued');
    },
  },
  {
    name: 'w3a S3-12 a deal with no winning line left says so once, a winnable one stays quiet, and a deal with many cards face down is not asked',
    async run(t) {
      await baseSettings(t);
      const run = (s, n) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].slice(0, n).map((r) => r + s);
      // The Jack of spades sits on the Ten, every column is held by a king or a card that cannot move, so the Ten can never go home.
      // The Nine of spades in the waste can still go up, so the old "no more moves" check has nothing to say.
      const lost = { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: ['9S'], f0: run('C', 7), f1: run('D', 12), f2: run('H', 12), f3: run('S', 8),
        t0: ['TS', 'JS'], t1: ['KD'], t2: ['KH'], t3: ['KC'], t4: ['KS'], t5: ['9C'], t6: ['TC'] } };
      await t.game('setState', lost);
      await t.game('act', 'move', 'waste', 'f3'); // the one move left that helps; the checks run after a move, as in play
      await t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });
      await t.page.waitForFunction(() => window.__game.getState().lost === 'dead', null, { timeout: 15000 });
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), 'No winning line left from here. Undo takes you back.', 'the toast says so');
      t.equal((await t.state()).scene, 'game', 'and it does not block play: no sheet opened');
      t.equal((await t.state()).stuck, 'live', 'the old dead-end check still sees a move, so this is the new warning');
      await shot(t, 'S3-12', 'lost-toast');
      await t.checkLayout();
      // the same position with the Ten on top is a win
      const won = { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: ['9S'], f0: run('C', 13), f1: run('D', 13), f2: run('H', 13), f3: run('S', 8),
        t0: ['KS', 'QS', 'JS', 'TS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } };
      await t.game('setState', won);
      await t.game('act', 'move', 'waste', 'f3');
      await t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });
      await t.page.waitForFunction(() => window.__game.getState().lost === 'won', null, { timeout: 15000 });
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), '', 'a winnable position is not warned about');
      // and one that needs a real search: the Jack must move onto the red Queen before the Ten can go home
      const search = { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: ['9S'], f0: run('C', 13), f1: run('D', 13), f2: run('H', 11), f3: run('S', 8),
        t0: ['TS', 'JS'], t1: [], t2: [], t3: ['KS', 'QH'], t4: ['KH'], t5: ['QS'], t6: [] } };
      await t.game('setState', search);
      await t.game('act', 'move', 'waste', 'f3');
      await t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });
      await t.page.waitForFunction(() => window.__game.getState().lost === 'won', null, { timeout: 15000 });
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), '', 'a win that takes a few moves is not warned about either');
      // a fresh deal has far too many cards face down to be worth asking
      await t.game('newGame', { mode: 'klondike', deal: 5 });
      await t.game('act', 'draw');
      await t.page.waitForFunction(() => window.__game.getState().stuck !== null, null, { timeout: 8000 });
      t.equal((await t.state()).lost, null, 'no search while many cards are face down');
    },
  },
  {
    name: 'w3a S1-06 while a card is held the pile it would land on is lit, and letting go lands it there',
    async run(t) {
      await baseSettings(t, { motion: 'full' });
      // Spider columns are narrow on a phone: a card held between two columns goes to the one it covers more
      await t.game('setState', { mode: 'spider', opts: { suits: 4 }, piles: { stock: [], t0: ['6S'], t1: ['6H'], t2: ['5D'], t3: ['KC'], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [] } });
      await t.waitForStable();
      const lay = await t.game('getLayout');
      const c = lay.piles.t2.cards[0], w = lay.cardW, x0 = lay.piles.t0.x, x1 = lay.piles.t1.x, y = lay.piles.t0.y + lay.piles.t0.cards.length * 4;
      const at = async (cardX) => { await t.page.mouse.move(cardX + c.w / 2, y + 10, { steps: 4 }); await t.page.waitForFunction(() => window.__game.getState().dropTarget !== undefined); return (await t.state()).dropTarget; };
      t.equal((await t.state()).dropTarget, null, 'nothing is lit when nothing is held');
      await t.page.mouse.move(c.x + c.w / 2, c.y + 10); await t.page.mouse.down();
      await t.page.mouse.move(c.x + c.w / 2, c.y - 40, { steps: 4 });
      t.equal(await at(x0 + (x1 - x0) * 0.3), 't0', 'held nearer the first column: it is lit');
      await rawShot(t, 'S1-06', 'lit-first');
      t.equal(await at(x0 + (x1 - x0) * 0.7), 't1', 'nearer the second: that one is');
      await rawShot(t, 'S1-06', 'lit-second');
      t.equal(await at(lay.piles.t3.x), null, 'over a column that will not take it: nothing is lit');
      await at(x0 + (x1 - x0) * 0.8);
      await t.page.mouse.up();
      await t.waitForStable();
      t.equal((await t.state()).piles.t1, ['6H', '5D'], 'letting go lands it on the column that was lit');
      t.equal((await t.state()).dropTarget, null, 'and the light goes out');
      await t.checkLayout();
    },
  },
  {
    name: 'w3a S1-10 a press or a key while Finish is playing cards home cuts the run short',
    async run(t) {
      await baseSettings(t, { motion: 'full' });
      for (const how of ['pointer', 'key']) {
        await t.game('setState', finishDeal());
        await t.page.waitForFunction(() => window.__game.getState().canAutoComplete);
        await t.page.locator('#bAuto').click();
        const t0 = await t.page.evaluate(() => performance.now());
        t.expect((await t.state()).finishing, 'Finish is under way (' + how + ')');
        if (how === 'pointer') { const b = await t.page.locator('#cv').boundingBox(); await t.page.mouse.click(b.x + b.width / 2, b.y + b.height - 20); }
        else await t.page.keyboard.press('Space');
        await t.page.waitForFunction(() => window.__game.getState().ceremony, null, { timeout: 8000 });
        const took = await t.page.evaluate((t0) => performance.now() - t0, t0);
        t.expect(took < 2500, 'the ceremony starts well before the 3.9 s the full run takes (' + how + ': ' + Math.round(took) + ' ms)');
        const s = await t.state();
        t.equal(s.finishing, false, 'and the run is over');
        t.equal(s.piles.f0.length + s.piles.f1.length + s.piles.f2.length + s.piles.f3.length, 52, 'every card is home');
        await t.game('act', 'skip');
      }
    },
  },
  {
    name: 'w3a S1-11 after a mouse press on a toolbar button the arrow keys move the table cursor again; a key press keeps its focus',
    async run(t) {
      await baseSettings(t);
      await t.seed(7); await t.game('newGame', { mode: 'klondike' }); await t.waitForStable();
      for (const id of ['bHint', 'bUndo', 'bRedo']) {
        if (id === 'bUndo') { await firstMove(t); await t.waitForStable(); }
        await t.page.evaluate(() => { window.__game.act('key', 'ArrowLeft'); }); // a known start
        const before = (await t.state()).cursor.pile;
        await t.page.locator('#' + id).click({ force: true });
        t.equal(await t.page.evaluate(() => document.activeElement.id), 'cv', id + ': the table has the keys again');
        await t.page.keyboard.press('ArrowRight');
        t.expect((await t.state()).cursor.pile !== before, id + ': ArrowRight moved the cursor (' + before + ' to ' + (await t.state()).cursor.pile + ')');
      }
      await t.page.locator('#bHint').focus();
      await t.page.keyboard.press('Enter');
      t.equal(await t.page.evaluate(() => document.activeElement.id), 'bHint', 'a keyboard press leaves focus on the button');
    },
  },
];
