// Council wave 4, batch B: saves, lifecycle and robustness; controls, rules and play.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-4', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };
const idle = (t) => t.page.waitForFunction(() => window.__game.isIdle(), null, { timeout: 15000 });
const reloadGame = async (t) => { await t.page.reload(); await t.page.waitForFunction(() => !!window.__game); };

export const tests = [
  // ------------------------------------------------------------------------------------------ S6-10
  {
    name: 'w4b S6-10 without canvas filters the table photograph is still softened and the card back still takes its hue',
    // A browser with no CanvasRenderingContext2D.filter (Safari) is made here by deleting it before the page's scripts run, on the second load only.
    initScript: () => { try { if (sessionStorage.getItem('w4b-nofilter')) delete CanvasRenderingContext2D.prototype.filter; } catch (e) { /* no storage: the first load only */ } },
    async run(t) {
      const measure = () => t.page.evaluate(() => {
        const tbl = document.getElementById('tbl'), g = tbl.getContext('2d'), w = tbl.width, h = tbl.height, d = g.getImageData(0, 0, w, h).data;
        let sum = 0, n = 0; // the mean step between neighbouring pixels in the middle of the table: a sharp photograph has more of it than a soft one
        for (let y = Math.floor(h * .3); y < h * .7; y += 2) for (let x = Math.floor(w * .3); x < w * .7; x += 2) { const i = (y * w + x) * 4; sum += Math.abs(d[i + 1] - d[i + 5]); n++; }
        return { step: sum / n };
      }).then(async (r) => Object.assign(r, { filter: await t.game('canvasFilter'), tinted: await t.game('backMean', 1914), plain: await t.game('backMean', 0) }));
      const ready = async () => {
        await t.page.waitForFunction(() => { const a = window.__game.art(); return a.loaded.some((n) => n.startsWith('tex-quapaw')) && a.loaded.includes('back-skylight'); }, null, { timeout: 20000 });
        await idle(t);
      };
      await t.page.evaluate(() => { try { sessionStorage.removeItem('w4b-nofilter'); } catch (e) { /* storage blocked */ } });
      await reloadGame(t);
      await t.game('unlockAll'); await baseSettings(t, { table: 'quapaw', motion: 'reduced' });
      await t.game('newGame', { mode: 'klondike' });
      await ready();
      await t.game('tableBlur', 'quapaw', 1.4);
      await idle(t); await t.waitFrames(3);
      const native = await measure();
      await shot(t, 'S6-10', 'quapaw-with-filter');
      t.expect(native.filter, 'the test browser has canvas filters, so this is the reference');

      await t.page.evaluate(() => sessionStorage.setItem('w4b-nofilter', '1'));
      await reloadGame(t);
      await t.game('newGame', { mode: 'klondike' });
      await ready(); await t.waitFrames(3);
      const off = await measure();
      t.expect(!off.filter, 'the second load has no canvas filter');
      await shot(t, 'S6-10', 'quapaw-no-filter');
      // the same table with its blur taken out altogether is the sharp reference
      await t.game('tableBlur', 'quapaw', 0);
      await idle(t); await t.waitFrames(3);
      const sharp = await measure();
      t.log('step between pixels: sharp ' + sharp.step.toFixed(3) + ', native blur ' + native.step.toFixed(3) + ', fallback blur ' + off.step.toFixed(3));
      t.expect(off.step < sharp.step * 0.8, 'the fallback table is softer than the unblurred one: ' + off.step.toFixed(3) + ' against ' + sharp.step.toFixed(3));
      t.expect(Math.abs(off.step - native.step) < Math.max(0.35 * native.step, 0.2), 'and about as soft as the real blur: ' + off.step.toFixed(3) + ' against ' + native.step.toFixed(3));
      const dTint = off.tinted.map((v, i) => Math.abs(v - off.plain[i])), dRef = off.tinted.map((v, i) => Math.abs(v - native.tinted[i]));
      t.expect(Math.max(...dTint) > 1.5, 'the card back is not left untinted: its colours moved by ' + dTint.map((v) => v.toFixed(1)).join(', '));
      t.expect(Math.max(...dRef) < 3, 'and it lands on the colours the filter gives: off by ' + dRef.map((v) => v.toFixed(1)).join(', '));
    },
  },
  // ------------------------------------------------------------------------------------------ S1-14
  {
    name: 'w4b S1-14 the tag after an Undo says "undo used" in quiet words and a Hint says "hint used"',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      const tag = () => t.page.evaluate(() => { const b = document.getElementById('assistTag'), r = b.getBoundingClientRect(); return { text: b.textContent, hidden: b.hidden, right: r.right, left: r.left, w: innerWidth }; });
      await t.seed(11); await t.game('newGame', { mode: 'klondike', draw: 1 });
      t.expect((await tag()).hidden, 'a fresh deal shows no tag');
      await t.game('act', 'draw'); await t.game('act', 'undo');
      let g = await tag();
      t.equal([g.hidden, g.text], [false, 'undo used'], 'an Undo shows the quiet words');
      t.expect(g.left >= 0 && g.right <= g.w, 'the tag sits inside the screen');
      await shot(t, 'S1-14', 'undo-used');
      await t.game('act', 'hint');
      g = await tag(); t.equal(g.text, 'undo + hint', 'an Undo and a Hint say both');
      t.expect(g.left >= 0 && g.right <= g.w, 'the longer words still fit');
      await t.checkLayout(); await shot(t, 'S1-14', 'undo-and-hint');
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      await t.game('act', 'hint');
      t.equal((await tag()).text, 'hint used', 'a Hint alone says so');
    },
  },
  // ------------------------------------------------------------------------------------------ S1-15
  // A simulated pad: nobody here has a controller, so a real one needs trying by hand. The test holds a button until the game has acted on it, then lets go and
  // waits until the game has polled the pad again (the game counts its polls), so it waits for the game and never for a time.
  {
    name: 'w4b S1-15 a gamepad moves the cursor, picks up, puts back, undoes, hints, draws and opens the menu, and steps through a dialog',
    initScript: () => {
      const pad = { id: 'Test pad (simulated)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null];
    },
    async run(t) {
      const BTN = { A: 0, B: 1, X: 2, Y: 3, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
      const polled = async (n) => { const p0 = await t.game('pad'); await t.page.waitForFunction((k) => window.__game.pad().polls >= k, p0.polls + n, { timeout: 8000 }); };
      const press = async (name, cond, arg) => {
        await t.page.evaluate((i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; }, BTN[name]);
        try { await t.page.waitForFunction(cond, arg, { timeout: 8000 }); } catch (e) { t.fail('the game did not answer the ' + name + ' button: ' + String(cond).slice(0, 100)); } finally {
          await t.page.evaluate((i) => { window.__pad.buttons[i] = { pressed: false, value: 0 }; }, BTN[name]);
          await polled(2); // the game has seen the button up, so the next press is a new press
        }
      };
      await baseSettings(t, { motion: 'reduced', tips: false });
      await t.seed(11); await t.game('newGame', { mode: 'klondike', draw: 1 });
      t.expect((await t.game('pad')).connected, 'the game sees the pad');
      await press('RIGHT', () => window.__game.getState().cursor.pile === 't1');
      await press('RIGHT', () => window.__game.getState().cursor.pile === 't2');
      await press('LEFT', () => window.__game.getState().cursor.pile === 't1');
      // the left stick does the same as the D-pad
      await t.page.evaluate(() => { window.__pad.axes[0] = 0.9; });
      await t.page.waitForFunction(() => window.__game.getState().cursor.pile === 't2');
      await t.page.evaluate(() => { window.__pad.axes[0] = 0; }); await polled(2);
      // held, the D-pad repeats: the cursor walks along the row until it is let go
      await t.page.evaluate(() => { window.__pad.buttons[15] = { pressed: true, value: 1 }; });
      await t.page.waitForFunction(() => window.__game.getState().cursor.pile === 't5', null, { timeout: 8000 });
      await t.page.evaluate(() => { window.__pad.buttons[15] = { pressed: false, value: 0 }; }); await polled(2);
      await press('LEFT', () => window.__game.getState().cursor.pile === 't4');
      await t.game('act', 'key', '2'); // back to the second column for the pick-up below
      // A picks up what is under the cursor, B puts it back
      await press('A', () => window.__game.getState().held !== null);
      await press('B', () => window.__game.getState().held === null);
      // Y draws from the stock; B, with nothing held, undoes it
      const s0 = await t.state();
      await press('Y', (n) => window.__game.getState().stockCount < n, s0.stockCount);
      await press('B', () => window.__game.getState().undoDepth === 0);
      t.equal((await t.state()).stockCount, s0.stockCount, 'B undid the draw');
      // X asks for a hint
      await press('X', () => !document.getElementById('assistTag').hidden);
      // Start opens the menu; the D-pad steps through its buttons; A presses the one in focus; B goes back
      await press('START', () => window.__game.getState().modal === 'menu');
      const focus = () => t.page.evaluate(() => document.activeElement && (document.activeElement.dataset.a || document.activeElement.id || document.activeElement.tagName));
      const f0 = await focus();
      await press('DOWN', (f) => { const e = document.activeElement; return (e && (e.dataset.a || e.id || e.tagName)) !== f; }, f0);
      await shot(t, 'S1-15', 'menu-focus');
      await press('UP', (f) => { const e = document.activeElement; return (e && (e.dataset.a || e.id || e.tagName)) === f; }, f0);
      await press('DOWN', (f) => { const e = document.activeElement; return (e && (e.dataset.a || e.id || e.tagName)) !== f; }, f0);
      await press('A', () => window.__game.getState().modal === 'help');
      await t.page.evaluate(() => { const d = document.querySelector('table.keys').closest('details'); d.open = true; d.scrollIntoView(); });
      t.expect(/Gamepad/.test(await t.page.textContent('table.keys')), 'How to play lists the gamepad buttons');
      await t.checkLayout(); await shot(t, 'S1-15', 'help-gamepad');
      await press('B', () => window.__game.getState().modal === 'menu');
      await press('START', () => window.__game.getState().modal === null);
      // on a slider, left and right move it
      await t.game('scene', 'settings'); await t.page.focus('#vol');
      const v0 = await t.page.$eval('#vol', (e) => +e.value);
      await press('LEFT', (v) => +document.getElementById('vol').value < v, v0);
      await press('B', () => window.__game.getState().modal === null);
      // on the title the D-pad moves between the Play buttons
      await t.game('scene', 'title');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'title');
      await t.page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
      await press('DOWN', () => !!document.activeElement && document.activeElement.closest('#title') !== null && document.activeElement.tagName === 'BUTTON');
      await shot(t, 'S1-15', 'title-focus');
    },
  },
];
