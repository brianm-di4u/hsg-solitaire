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
  // ------------------------------------------------------------------------------------------ S1-16
  {
    name: 'w4b S1-16 a card dropped almost on its place settles briskly; one dropped far away still glides back the usual time',
    async run(t) {
      await baseSettings(t, { motion: 'full', tapMove: 'drag' });
      await t.seed(11); await t.game('newGame', { mode: 'klondike', draw: 1 });
      await idle(t);
      const lay = await t.game('getLayout'), top = lay.piles.t6.cards[lay.piles.t6.cards.length - 1];
      const x0 = top.x + top.w / 2, y0 = top.y + top.h / 2;
      const drag = async (dx, dy) => {
        await t.page.mouse.move(x0, y0); await t.page.mouse.down();
        for (let i = 1; i <= 8; i++) await t.page.mouse.move(x0 + dx * i / 8, y0 + dy * i / 8);
        await t.page.mouse.up();
      };
      // out 60 px and back to within 4 px of where the card was picked up
      await t.page.mouse.move(x0, y0); await t.page.mouse.down();
      for (let i = 1; i <= 6; i++) await t.page.mouse.move(x0 + 10 * i, y0);
      for (let i = 5; i >= 0; i--) await t.page.mouse.move(x0 + 10 * i + (i === 0 ? 4 : 0), y0);
      await t.page.mouse.up();
      const near = await t.page.evaluate(() => window.__game.glideOf('t6'));
      t.expect(near !== null && near < 150, 'a card let go within a few pixels of its place settles in under 150 ms: ' + near);
      await idle(t);
      await drag(-40, 330);
      const far = await t.page.evaluate(() => window.__game.glideOf('t6'));
      t.log('glide ms: near ' + near + ', far ' + far);
      t.expect(far >= 200 && far <= 320, 'a card let go far from its place glides back the usual 200 to 320 ms: ' + far);
      await idle(t);
      await shot(t, 'S1-16', 'table');
    },
  },
  // ------------------------------------------------------------------------------------------ S3-11
  {
    name: 'w4b S3-11 Undo is free as it always was; with the new setting on, each Undo costs 15 points and none of it comes back',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      const play = async (extra, undos) => { // one move home (+10 from 100, and the game is not won), then the undos; returns the score after each
        await t.game('setSettings', extra);
        await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, score: 100, piles: { stock: [], waste: [], f0: ['AC'], t0: ['2C'], t1: ['KH'] } });
        t.expect((await t.game('act', 'move', 't0', 'f0', 1)).ok, 'the deuce goes home');
        const out = [(await t.state()).score];
        for (const u of undos) { await t.game('act', u); out.push((await t.state()).score); }
        return out;
      };
      t.equal((await t.state()).settings.undoCost, false, 'the setting starts off');
      t.equal(await play({ undoCost: false }, ['undo']), [110, 100], 'off: the move scored 10 and the Undo gave it back, free');
      t.equal(await play({ undoCost: true }, ['undo', 'redo', 'undo']), [110, 85, 95, 70], 'on: each Undo takes 15 and a Redo does not refund it');
      t.equal(await play({ undoCost: true, scoring: 'none' }, ['undo']), [110, 100], 'with scoring set to None there is nothing to charge');
      t.equal(await play({ undoCost: true, scoring: 'standard' }, ['undo']), [110, 85], 'Standard scoring charges it too');
      // a save from before has no such key and starts with it off
      await t.page.evaluate(() => { const k = 'spa-solitaire:v1:settings', o = JSON.parse(localStorage.getItem(k)); delete o.undoCost; localStorage.setItem(k, JSON.stringify(o)); });
      await reloadGame(t);
      t.equal((await t.state()).settings.undoCost, false, 'an older save reads as off');
      // the switch is in Settings and works
      await t.game('scene', 'settings');
      const sw = t.page.locator('[data-tog="undoCost"]'); await sw.scrollIntoViewIfNeeded();
      t.equal(await sw.getAttribute('aria-pressed'), 'false', 'the switch shows off');
      await sw.click();
      t.equal([await sw.getAttribute('aria-pressed'), (await t.state()).settings.undoCost], ['true', true], 'pressing it turns it on and keeps it');
      await t.checkLayout(); await shot(t, 'S3-11', 'settings-switch');
    },
  },
  // ------------------------------------------------------------------------------------------ S3-14
  {
    name: 'w4b S3-14 a score change of 5 points or more floats up from the pile where it happened; penalties are red; none with reduced motion or no score',
    async run(t) {
      await baseSettings(t, { motion: 'full', scoring: 'standard', tips: false });
      // a frozen clock that moves only through advance(), so how far a float has risen is exactly what the test says
      await t.page.evaluate(() => { const base = performance.now(); window.__off = 0; performance.now = () => base + window.__off; });
      const advance = (ms) => t.page.evaluate((m) => { window.__off += m; }, ms);
      const floats = () => t.game('scoreFx');
      const K = (piles, extra) => Object.assign({ mode: 'klondike', opts: { draw: 1 }, score: 200, piles: Object.assign({ stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] }, piles) }, extra);
      const move = async (from, to) => { t.expect((await t.game('act', 'move', from, to, 1)).ok, from + ' to ' + to + ' is legal'); };
      await t.game('setState', K({ f0: ['AC'], t0: ['2C'], t1: ['#9H', '8S'], t2: ['9D'], t3: ['3D'], t4: ['8C'], waste: ['7H'], t6: ['KS'] }));
      await move('t0', 'f0');
      t.equal((await floats()).map((f) => f.text + '@' + f.pile + (f.neg ? '-' : '')), ['+10@f0'], 'a card home: +10 at the foundation');
      await move('t1', 't2');
      t.equal((await floats()).map((f) => f.text + '@' + f.pile), ['+10@f0', '+5@t1'], 'turning a card over: +5 at its column');
      await move('waste', 't4');
      t.equal((await floats()).map((f) => f.text + '@' + f.pile).slice(2), ['+5@t4'], 'waste to a column: +5 at the column');
      await move('f0', 't3');
      const last = (await floats()).slice(-1)[0];
      t.equal([last.text, last.neg, last.pile], ['−15', true, 't3'], 'a card back from a foundation: a red minus 15 at the column');
      // the float is painted: gold digits near the foundation a little way into its life (and red ones for the penalty)
      await t.game('setState', K({ f0: ['AC'], t0: ['2C'], t6: ['KS'] }));
      await move('t0', 'f0');
      await advance(170 + 300); await t.waitFrames(3);
      const lay = await t.game('getLayout'), f0 = lay.piles.f0;
      const count = (rgb, box) => t.page.evaluate(([rgb, b]) => {
        const cv = document.getElementById('cv'), r = cv.getBoundingClientRect(), k = cv.width / r.width, g = cv.getContext('2d');
        const d = g.getImageData(Math.max(0, Math.round((b.x - r.left) * k)), Math.max(0, Math.round((b.y - r.top) * k)), Math.round(b.w * k), Math.round(b.h * k)).data; let n = 0;
        for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - rgb[0]) < 14 && Math.abs(d[i + 1] - rgb[1]) < 14 && Math.abs(d[i + 2] - rgb[2]) < 14) n++;
        return n;
      }, [rgb, box]);
      const box = { x: f0.x - 10, y: f0.y - 6, w: f0.w + 20, h: f0.h * .8 };
      const gold = await count([248, 231, 166], box); t.log('gold pixels near the foundation: ' + gold);
      t.expect(gold >= 15, 'gold digits are painted above the foundation: ' + gold);
      await shot(t, 'S3-14', 'plus-ten');
      await advance(1000); await t.waitFrames(3);
      t.equal(await floats(), [], 'the float is gone a second later');
      t.expect(await t.game('isIdle'), 'and the table is idle again');
      // a float does not outlive the game it belongs to, or the move that is taken back
      await t.game('setState', K({ f0: ['AC'], t0: ['2C'], t6: ['KS'] }));
      await move('t0', 'f0'); t.expect((await floats()).length === 1, 'a float is up');
      await t.game('act', 'undo'); t.equal(await floats(), [], 'taking the move back takes its float away');
      await move('t0', 'f0'); await t.game('newGame', { mode: 'klondike' }); t.equal(await floats(), [], 'a new deal starts with none');
      // no float with reduced motion, and none with scoring set to None
      for (const extra of [{ motion: 'reduced' }, { motion: 'full', scoring: 'none' }]) {
        await t.game('setSettings', extra);
        await t.game('setState', K({ f0: ['AC'], t0: ['2C'], t6: ['KS'] }));
        await move('t0', 'f0');
        t.equal(await floats(), [], 'no float with ' + JSON.stringify(extra));
      }
      // small changes are left to the number in the bar: a Spider move costs 1 point
      await t.game('setSettings', { motion: 'full', scoring: 'standard' });
      await t.game('newGame', { mode: 'spider', suits: 1 });
      const lm = await t.game('legalMoves'); t.expect(lm.length > 0 && (await t.game('act', 'move', lm[0].from, lm[0].to, lm[0].count)).ok, 'a Spider move is made');
      t.equal(await floats(), [], 'a one-point move has no float');
    },
  },
];
