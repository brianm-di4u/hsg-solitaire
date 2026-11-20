// Council wave 3, batch A: saves, lifecycle and robustness; controls, rules and play.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, clickCard, dragCard, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.HS_ARTIFACT_DIR ? path.resolve(process.env.HS_ARTIFACT_DIR, 'wave-3', 'shots') : path.resolve(HERE, '..', 'screenshots', 'council-waves', 'wave-3', 'shots');
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
      await t.seed(11); await t.game('newGame', { mode: 'klondike' }); // a seeded deal: an unseeded one has no tableau or waste move about one time in eleven
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
    name: 'w3a S1-06 the lit rim is drawn on the canvas over a legal pile, and not away from it',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['6C'], t1: ['5H'], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      await t.waitForStable();
      const lay = await t.game('getLayout');
      const src = lay.piles.t1.cards[0], dst = lay.piles.t0.cards[0];
      // Thermal Jade (#5FE0B8, OQ-WF2-01) corner bracket pixels in a strip above the target card, drawn beneath the held stack
      const jade = (b) => t.page.evaluate((b) => {
        const cv = document.querySelector('#cv'), r = cv.getBoundingClientRect(), c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
        const x = c.getContext('2d'); x.drawImage(cv, 0, 0); const k = cv.width / r.width;
        const d = x.getImageData(Math.max(0, Math.round((b.x - r.left) * k)), Math.max(0, Math.round((b.y - r.top) * k)), Math.round(b.w * k), Math.round(b.h * k)).data;
        let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 150 && d[i + 1] > 175 && d[i + 2] > 135 && d[i + 1] > d[i] + 50) n++; return n;
      }, b);
      const strip = { x: dst.x - 8, y: dst.y - 8, w: dst.w + 16, h: 12 };
      const sx = src.x + src.w / 2, sy = src.y + 14;
      await t.page.mouse.move(sx, sy); await t.page.mouse.down();
      await t.page.mouse.move(sx, sy + 200, { steps: 6 });
      await t.waitForStable();
      t.equal((await t.state()).dropTarget, null, 'no pile is lit while the card is held away');
      t.equal(await jade(strip), 0, 'and no Thermal Jade bracket is drawn above the target');
      await t.page.mouse.move(dst.x + dst.w / 2, dst.y + dst.h * .55, { steps: 8 });
      await t.page.waitForFunction(() => window.__game.getState().dropTarget === 't0', null, { timeout: 8000 });
      let over = 0; const until = Date.now() + 8000;
      while (Date.now() < until) { over = await jade(strip); if (over > 30) break; await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r()))); }
      // Verify the drop brackets render BENEATH the dragged 5H card (zero Thermal Jade bleeding across the dragged card's interior)
      const interior = { x: dst.x + dst.w * .25, y: dst.y + dst.h * .7, w: dst.w * .5, h: dst.h * .4 };
      const bleed = await jade(interior);
      await t.page.mouse.up();
      t.expect(over > 30, 'Thermal Jade corner brackets show above the target once the pile is lit (' + over + ')');
      t.equal(bleed, 0, 'drop brackets stay strictly beneath the dragged card face (0 jade bleed pixels)');
    },
  },
  {
    name: 'w3a S1-10 a press or a key while Finish is playing cards home cuts the run short',
    async run(t) {
      await baseSettings(t, { motion: 'full' });
      for (const how of ['pointer', 'key']) {
        await t.game('setState', finishDeal());
        await t.page.waitForFunction(() => window.__game.getState().canAutoComplete);
        // Finish, the press and the wait for the ceremony all happen inside the page, so the time they take does not
        // include the test's own round trips (which a busy machine stretches past the 3.9 s the full run takes).
        const r = await t.page.evaluate((how) => new Promise((res) => {
          const t0 = performance.now(); document.getElementById('bAuto').click();
          const finishing = window.__game.getState().finishing;
          if (how === 'pointer') document.getElementById('cv').dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true, clientX: 200, clientY: 200 }));
          else window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
          const wait = () => (window.__game.getState().ceremony ? res({ finishing, took: performance.now() - t0 }) : requestAnimationFrame(wait));
          wait();
        }), how);
        t.expect(r.finishing, 'Finish is under way (' + how + ')');
        t.expect(r.took < 2500, 'the ceremony starts well before the 3.9 s the full run takes (' + how + ': ' + Math.round(r.took) + ' ms)');
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
  {
    name: 'w3a S1-13 Move a card by: tap (as before), double-tap, or drag only; saved, and old saves keep tap',
    async run(t) {
      await baseSettings(t);
      t.equal((await t.state()).settings.tapMove, 'tap', 'a profile with no choice taps, as it always did');
      const board = { mode: 'klondike', opts: { draw: 1 }, piles: { stock: ['2C', '3C'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['6C'], t1: ['5H'], t2: [], t3: [], t4: [], t5: [], t6: [] } };
      const reset = async () => { await t.game('setState', board); await t.waitForStable(); };
      const where = async () => (await t.state()).piles;
      // The double-tap window is measured on the game's clock. Around the clicks it is frozen and moves only through advance(), so how long the test's own
      // round trips take cannot turn two quick clicks into two slow ones.
      const freeze = () => t.page.evaluate(() => { const base = performance.now(); window.__off = 0; performance.now = () => base + window.__off; });
      const advance = (ms) => t.page.evaluate((m) => { window.__off += m; }, ms);
      const thaw = async () => { await t.page.evaluate(() => { delete performance.now; }); await t.waitForStable(); };
      await reset();
      await clickCard(t, 't1', 0);
      t.equal((await where()).t0, ['6C', '5H'], 'tap: one click moves the card');
      await t.game('setSettings', { tapMove: 'double' });
      await reset(); await freeze();
      await clickCard(t, 't1', 0);
      await advance(500);
      await clickCard(t, 't1', 0);
      await advance(500);
      t.equal((await where()).t1, ['5H'], 'double-tap: two slow clicks are two single clicks and move nothing');
      await clickCard(t, 't1', 0); await clickCard(t, 't1', 0);
      t.equal((await where()).t0, ['6C', '5H'], 'double-tap: two quick clicks move it');
      await thaw();
      await reset();
      await clickCard(t, 'stock'); await t.page.waitForFunction(() => window.__game.getState().piles.waste.length === 1);
      t.equal((await where()).waste.length, 1, 'double-tap: one click on the stock still draws');
      await t.game('setSettings', { tapMove: 'drag' });
      await reset();
      await clickCard(t, 't1', 0); await clickCard(t, 't1', 0);
      t.equal((await where()).t1, ['5H'], 'drag only: clicks never move a card');
      await dragCard(t, 't1', 0, 't0');
      await t.page.waitForFunction(() => window.__game.getState().piles.t0.length === 2, null, { timeout: 8000 });
      t.equal((await where()).t0, ['6C', '5H'], 'drag only: a drag still does');
      await reset();
      await t.game('act', 'key', 'ArrowRight'); await t.game('act', 'key', 't');
      t.equal((await where()).t0, ['6C', '5H'], 'drag only: the T key still sends the card');
      // the switch is in Settings, saved, and the first-run tip tells the truth about it
      await t.game('scene', 'settings');
      await t.page.locator('[data-set="tapMove"][data-val="double"]').click();
      t.equal((await t.state()).settings.tapMove, 'double', 'Settings sets it');
      await shot(t, 'S1-13', 'settings');
      await t.checkLayout();
      await t.reload();
      t.equal((await t.state()).settings.tapMove, 'double', 'and it is kept');
    },
  },
  {
    name: 'w3a S3-05 streaks and bests count first, unaided wins only; replays and assisted wins still count as wins',
    async run(t) {
      await baseSettings(t, { sound: false });
      const win = async (deal, moves, hint, draw = 1) => {
        await t.game('setState', Object.assign(nearWinKlondike(), { deal, moves, opts: { draw } }));
        if (hint) await t.game('act', 'hint');
        await t.game('act', 'move', 't0', 'f3');
        await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
        return (await t.game('stats'))['klondike' + draw];
      };
      let st = await win(77, 40);
      t.equal([st.won, st.streak, st.fewestMoves, st.assistedWon], [1, 1, 41, 0], 'a first clean win sets the streak and the bests');
      const m0 = await t.game('meta'); t.equal(m0.wonDeals, ['klondike1:77'], 'and the deal is remembered under its variant');
      st = await win(77, 5);
      t.equal([st.won, st.streak, st.fewestMoves], [2, 1, 41], 'the same deal again counts as a win but not as a streak step or a best (6 moves would have been one)');
      t.expect((await t.page.locator('#sheet .meta').first().textContent()).includes('replay'), 'the ticket says replay');
      st = await win(78, 5, true);
      t.equal([st.won, st.streak, st.fewestMoves, st.assistedWon], [3, 1, 41, 1], 'a win after a Hint counts as a win, the streak stays where it was, no best is set');
      const txt = await t.page.locator('#sheet').textContent();
      t.expect(txt.includes('assisted'), 'the ticket says assisted');
      t.expect(!txt.includes('New personal best'), 'and no personal best is claimed');
      t.expect(!txt.includes('wins in a row'), 'and no streak is announced');
      st = await win(79, 30);
      t.equal([st.won, st.streak, st.fewestMoves], [4, 2, 31], 'a new deal, unaided, is a record again');
      await t.game('scene', 'stats');
      t.expect((await t.page.locator('#sheet').textContent()).includes('Wins without Undo or Hint3 of 4'), 'Statistics shows the unaided wins as a share of the wins (C4-10 merged the two rows)');
      await shot(t, 'S3-05', 'stats');
      await t.checkLayout();
      const d3 = await win(77, 20, false, 3);
      t.equal([d3.won, d3.streak, d3.fewestMoves], [1, 1, 21], 'deal 77 in Draw 3 is another deal: a first win with a streak and a best');
      t.equal((await t.game('meta')).wonDeals.slice(-2), ['klondike1:79', 'klondike3:77'], 'each variant keeps its own entry');
    },
  },
  {
    name: 'w3a S3-05 the won-deal list is bounded and saved, a damaged one is ignored, and Restart marks a replay',
    async run(t) {
      await baseSettings(t, { sound: false });
      const old = Array.from({ length: 205 }, (_, i) => 'klondike:' + (1000 + i));
      await t.page.evaluate(([p, old]) => { localStorage.setItem(p + 'meta', JSON.stringify({ lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 205, daily: {}, wonDeals: old })); }, [P, old]);
      await t.reload();
      t.equal((await t.game('meta')).wonDeals.length, 200, 'a list longer than 200 is cut to the newest 200 on load');
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 77 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      let w = (await t.game('meta')).wonDeals;
      t.equal([w.length, w[0], w[w.length - 1]], [200, 'klondike:1006', 'klondike1:77'], 'a win pushes the oldest out');
      t.equal(JSON.parse(await raw(t, 'meta')).wonDeals.length, 200, 'and it is saved');
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 1100 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      t.expect((await t.page.locator('#sheet .meta').first().textContent()).includes('replay'), 'a deal a saved game remembers under the old key is still a replay');
      await t.page.evaluate(([p]) => { localStorage.setItem(p + 'meta', JSON.stringify({ totalWins: 2, wonDeals: 'oops' })); }, [P]);
      await t.reload();
      t.equal((await t.game('meta')).wonDeals, [], 'a damaged list is dropped, nothing else breaks');
      await t.game('newGame', { mode: 'klondike', deal: 5 });
      t.equal((await t.state()).replay, false, 'a new deal is not a replay');
      await firstMove(t);
      await t.game('scene', 'menu');
      await t.page.locator('#sheet [data-a="restart"]').click();
      await t.page.locator('#sheet [data-a="yes"]').click();
      t.equal((await t.state()).replay, true, 'restarting the same deal is');
    },
  },
  {
    name: 'w3a P-N01 Finish is offered only when it can win: not when a needed card is buried, in Klondike or Yukon',
    async run(t) {
      await baseSettings(t);
      const base = (mode, piles) => ({ mode, opts: { draw: 1 }, piles });
      // the Ace of spades is under the Five, the Six stands alone, one card is in the stock: all face up, but Finish could not move a card
      const buried = (mode) => base(mode, Object.assign({ stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['AS', '5H'], t1: ['6C'], t2: [], t3: [], t4: [], t5: [], t6: [] }, mode === 'klondike' ? { stock: ['2S'] } : {}));
      for (const mode of ['klondike', 'yukon']) {
        await t.game('setState', buried(mode)); await t.waitForStable();
        t.equal((await t.state()).canAutoComplete, false, mode + ': a buried Ace means no Finish');
        t.expect(await t.page.locator('#bAuto').isDisabled(), mode + ': the button is disabled');
        t.expect(!(await t.page.locator('#bAuto').getAttribute('class') || '').includes('glow'), mode + ': and does not glow');
        t.equal((await t.game('act', 'autoComplete')).ok, false, mode + ': asking anyway does nothing');
        const s = await t.state(); t.equal([s.moves, s.undoDepth], [0, 0], mode + ': and costs no move and no undo step');
      }
      await t.game('setState', buried('klondike'));
      await t.game('act', 'key', 'a');
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), 'Finish appears once every card can go straight home', 'the A key says why');
      // the stock must be cycled for the win: Finish is offered, and plays it
      await t.game('setState', base('klondike', { stock: ['2S'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['AS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] }));
      await t.waitForStable();
      t.equal((await t.state()).canAutoComplete, true, 'a position Finish can win offers it, even with cards in the stock');
      t.expect(await t.page.locator('#bAuto').isEnabled(), 'the button is enabled');
      await shot(t, 'P-N01', 'finish-offered');
      t.equal((await t.game('act', 'autoComplete')).ok, true, 'it runs');
      await t.page.waitForFunction(() => window.__game.getState().won, null, { timeout: 8000 });
      await t.game('act', 'skip');
    },
  },
  {
    name: 'w3a W2-B01 0-win and 21-win replays freeze meta.totalWins, omit ticket punch/fanfare, and never render -1 course completed (CD-WF6-05)',
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false });
      // Fresh 0-win profile: restart Deal #1 so S.replay === true while totalWins === 0, then win it
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 1 });
      await firstMove(t);
      await t.game('scene', 'menu');
      await t.page.locator('#sheet [data-a="restart"]').click();
      await t.page.locator('#sheet [data-a="yes"]').click();
      t.equal((await t.state()).replay, true, 'restarted Deal #1 is marked replay');
      // Set near-win board on Deal #1 preserving S.replay via wonDeals / restart: restart again from near-win state
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 1 }));
      await t.game('act', 'move', 't0', 't1'); // started=true so Restart flags S.replay
      await t.game('scene', 'menu');
      await t.page.locator('#sheet [data-a="restart"]').click();
      await t.page.locator('#sheet [data-a="yes"]').click();
      // Now win via direct setState with deal 1 already in wonDeals at totalWins=0 (testing 0-win replay directly)
      await t.page.evaluate(([p]) => {
        localStorage.setItem(p + 'meta', JSON.stringify({ lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 0, daily: {}, wonDeals: ['klondike1:1'], unlock: { ids: [] }, ach: {} }));
        localStorage.removeItem(p + 'stats');
      }, [P]);
      await t.reload();
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false });
      await t.game('cuesPlayed', true);
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 1 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      await t.page.waitForTimeout(250);
      const zeroWin = await t.page.evaluate(() => ({
        text: document.getElementById('sheet').textContent,
        punchCount: document.querySelectorAll('#sheet .ticket .punch').length,
        newDots: document.querySelectorAll('#sheet .course i.new').length,
        filledDots: document.querySelectorAll('#sheet .course i.f').length,
        cues: window.__game.cuesPlayed().map((c) => c.name),
        meta: window.__game.meta(),
        st: window.__game.stats().klondike1,
      }));
      t.equal(zeroWin.meta.totalWins, 0, '0-win replay freezes meta.totalWins at 0');
      t.equal(zeroWin.st.won, 1, 'per-mode st.won still increments on replay (w3a S3-05 split)');
      t.expect(zeroWin.text.includes('Course of 21 baths: 0 of 21'), 'ticket displays 0 of 21: ' + zeroWin.text);
      t.expect(!zeroWin.text.includes('-1'), 'ticket never displays -1 course completed');
      t.equal([zeroWin.punchCount, zeroWin.newDots, zeroWin.filledDots], [0, 0, 0], '0-win replay renders zero punch and zero filled/new course dots');
      t.expect(!zeroWin.cues.includes('course'), '0-win replay never triggers 21-bath course fanfare');
      t.equal([Object.keys(zeroWin.meta.ach).length, zeroWin.meta.unlock.ids.length], [0, 0], '0-win replay awards zero achievements or unlocks');

      // 21-win profile replaying an already-won deal never triggers 21-bath course fanfare or punches again
      await t.page.evaluate(([p]) => {
        localStorage.setItem(p + 'meta', JSON.stringify({ lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 21, daily: {}, wonDeals: ['klondike1:21'], unlock: { ids: [] }, ach: {} }));
      }, [P]);
      await t.reload();
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false });
      await t.game('cuesPlayed', true);
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 21 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      await t.page.waitForTimeout(1200);
      const rep21 = await t.page.evaluate(() => ({
        punchCount: document.querySelectorAll('#sheet .ticket .punch').length,
        newDots: document.querySelectorAll('#sheet .course i.new').length,
        cues: window.__game.cuesPlayed().map((c) => c.name),
        totalWins: window.__game.meta().totalWins,
      }));
      t.equal([rep21.totalWins, rep21.punchCount, rep21.newDots], [21, 0, 0], '21-win replay freezes totalWins and omits ticket punch/new dot');
      t.expect(!rep21.cues.includes('course'), '21-win replay never replays the 21-bath course fanfare');
    },
  },
  {
    name: 'w3a W2-B01 mid-game Reset Stats prevents Won 1 of 0 / 200% win rate, and Records never prints score 0 (W6-P-N05)',
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, scoring: 'standard' });
      // Set up an active started deal one move from winning
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 501, score: 20 }));
      await t.game('act', 'move', 't0', 't1'); // S.started === true, st.played === 1
      t.equal((await t.game('stats')).klondike1.played, 1, 'live deal counts as played');
      // Mid-game Reset Stats for active mode
      await t.game('scene', 'stats');
      await t.page.click('[data-a="resetStats"]');
      await t.page.click('#sheet [data-a="yes"]');
      t.equal((await t.game('stats')).klondike1.played, 1, 'resetting active in-progress mode preserves played=1 for the live deal');
      // Finish the active deal
      await t.game('scene', 'game');
      await t.game('act', 'move', 't1', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      let st = (await t.game('stats')).klondike1;
      t.equal([st.played, st.won, st.bestStandardScore], [1, 1, 30], 'finishing active deal records Won 1 of 1 and bestStandardScore=30');
      await t.game('scene', 'records');
      let rec = await t.page.locator('#sheet').textContent();
      t.expect(rec.includes('Won 1 of 1') && rec.includes('score 30 (Standard)') && !rec.includes('score 0'), 'Records shows Won 1 of 1 and score 30 (Standard), never score 0: ' + rec.slice(0, 260));
      // Win a second deal and check Win rate stays 100% (never 200%)
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 502, score: 40 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      st = (await t.game('stats')).klondike1;
      t.equal([st.played, st.won], [2, 2], 'second win reaches 2 of 2');
      await t.game('scene', 'stats');
      const stTxt = await t.page.locator('#sheet table.st').textContent();
      t.expect(stTxt.includes('Win rate100%') && !stTxt.includes('200%'), 'Win rate is 100%, never 200%');
      // Clean scoring:'none' win in FreeCell omits score segment cleanly in Records (never prints score 0)
      await t.game('setSettings', { scoring: 'none' });
      const run = (s) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].map((r) => r + s);
      await t.game('setState', { mode: 'freecell', deal: 503, piles: { c0: [], c1: [], c2: [], c3: [], f0: run('C'), f1: run('D'), f2: run('H'), f3: run('S').slice(0, 12), t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [] } });
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      await t.game('scene', 'records');
      const fcRec = await t.page.evaluate(() => [...document.querySelectorAll('#sheet .rec')].find((e) => e.textContent.startsWith('FreeCell')).textContent);
      t.expect(fcRec.includes('1 moves') && !fcRec.includes('score 0'), 'None scoring win omits score segment cleanly: ' + fcRec);
    },
  },
];
