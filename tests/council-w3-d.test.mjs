// Council wave 3, batch D: sound (CL-01, S1-07, S1-08, S1-12, S1-17, S3-18, S5-03, S5-05, S5-06).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, dragCard } from './_util.mjs';

const SHOTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '_council', 'hsg-solitaire', 'wave-3', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };

const MAX = { volume: 1, musicVol: 1, ambVol: 1 };
// The refusal cue (nope) is the only one built from square waves, so counting them counts refusals: two per cue.
const spySquares = () => { const d = Object.getOwnPropertyDescriptor(OscillatorNode.prototype, 'type'); window.__sq = 0; Object.defineProperty(OscillatorNode.prototype, 'type', Object.assign({}, d, { set(v) { if (v === 'square') window.__sq++; d.set.call(this, v); } })); };
const nopes = async (t) => (await t.page.evaluate(() => window.__sq)) / 2;
const EMPTY_K = { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };
const card0 = async (t, pile, i = 0) => { const lay = await t.game('getLayout'); const c = lay.piles[pile].cards[i]; return { x: c.x + c.w / 2, y: c.y + 12, lay }; };
const stubVibrate = () => { window.__vib = []; navigator.vibrate = (p) => { window.__vib.push(p); return true; }; };
const vib = (t) => t.page.evaluate(() => window.__vib.slice());
// a buzz for a card landing comes when it lands: wait for the n-th buzz, or for the cards to settle when none is expected
const vibWait = async (t, n) => { await t.page.waitForFunction((k) => window.__vib.length >= k, n); return vib(t); };
const vibQuiet = async (t) => { await t.waitForStable(); return vib(t); };
const fingerDown = (t) => t.page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })));
// Every tone the game starts, as seconds from now until it sounds.
const spyStarts = () => { window.__lead = []; const st = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function (when) { window.__lead.push((when || 0) - this.context.currentTime); return st.apply(this, arguments); }; };
const leads = (t) => t.page.evaluate(() => { const a = window.__lead.slice(); window.__lead.length = 0; return a; });
const render = (t, name, secs, over) => t.page.evaluate(([n, s, o]) => window.__game.audioRender(n, s, false, o), [name, secs, over]);

export const tests = [
  {
    name: 'w3d CL-01 the busiest moment with every volume control at its maximum stays under 0.95',
    viewports: ['desktop'],
    async run(t) {
      const shipped = await render(t, 'mix', 12);
      const full = await render(t, 'mix', 12, MAX);
      t.log('mix peak: shipped ' + shipped.peak + ', every control at maximum ' + full.peak);
      t.expect(full.peak > shipped.peak, 'the render hook takes the volume: maximum is louder than the shipped level');
      t.expect(full.peak < 0.95, 'no clipping at maximum volume: ' + full.peak);
      for (const name of ['win', 'found', 'place', 'nope', 'hint']) {
        const r = await render(t, name, 21, { volume: 1 });
        t.expect(r.peak < 0.95, name + ' at full volume stays under 0.95: ' + r.peak);
      }
    },
  },
  {
    name: 'w3d S1-07 a drag released over its own pile is no refusal, and a wobbly tap still moves the card',
    initScript: spySquares,
    async run(t) {
      await baseSettings(t, { sound: true });
      const setup = () => t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['AS'], t1: ['KD'] }) });
      // a tap that travelled a little: the ace goes home, with no refusal
      await setup(); let c = await card0(t, 't0');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 10, c.y + 3); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.f0, ['AS'], 'a wobbly tap sent the ace home');
      t.equal(await nopes(t), 0, 'and no refusal sounded');
      // taken out and put back over its own pile: stays, quietly
      await setup(); c = await card0(t, 't0');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 160, c.y + 160, { steps: 4 }); await t.page.mouse.move(c.x, c.y + 40, { steps: 4 }); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['AS'], 'put back: the card stays');
      t.equal(await nopes(t), 0, 'and no refusal sounded');
      // dropped on a pile that refuses it: still a refusal
      await setup(); c = await card0(t, 't0'); const k = await card0(t, 't1');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(k.x, k.y + 20, { steps: 6 }); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['AS'], 'the ace did not fit on the king');
      t.equal(await nopes(t), 1, 'the refusal still sounds for a real mistake');
      // drag-only mode: a wobble is not a tap, so nothing moves and nothing sounds
      await t.game('setSettings', { tapMove: 'drag' }); await setup(); c = await card0(t, 't0');
      await t.page.evaluate(() => { window.__sq = 0; });
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 10, c.y + 3); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['AS'], 'drag-only: the card stays');
      t.equal(await nopes(t), 0, 'drag-only: no refusal for a wobble');
    },
  },
  {
    name: 'w3d S1-08 dragging a card that cannot be lifted shakes, sounds once, and a FreeCell run says why',
    initScript: spySquares,
    async run(t) {
      await baseSettings(t, { sound: true });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['#KD', 'QS'], t1: ['5C'] }) });
      let c = await card0(t, 't0', 0);
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down();
      await t.page.mouse.move(c.x + 20, c.y + 20); await t.page.mouse.move(c.x + 60, c.y + 60); await t.page.mouse.move(c.x + 90, c.y + 40);
      t.equal(await nopes(t), 1, 'a face-down card dragged: one refusal, not one per move');
      await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['#KD', 'QS'], 'nothing moved');
      t.expect(!/free cells/.test(await t.page.evaluate(() => document.getElementById('toast').textContent)), 'no free-cell message for a face-down card');
      // FreeCell: three cells full and no empty column, so two cards can move at once, and the run is three
      const fc = (cells) => ({ mode: 'freecell', opts: {}, piles: { c0: cells > 0 ? ['2C'] : [], c1: cells > 1 ? ['2D'] : [], c2: cells > 2 ? ['2H'] : [], c3: [], f0: [], f1: [], f2: [], f3: [], t0: ['9S', '8H', '7S'], t1: ['KC'], t2: ['KD'], t3: ['KH'], t4: ['QC'], t5: ['QD'], t6: ['QH'], t7: ['JC'] } });
      await t.game('setState', fc(3));
      await t.page.evaluate(() => { window.__sq = 0; document.getElementById('toast').textContent = ''; });
      c = await card0(t, 't0', 0);
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 30, c.y + 30); await t.page.mouse.move(c.x + 60, c.y + 50);
      await t.page.waitForFunction(() => /Not enough free cells for that run/.test(document.getElementById('toast').textContent));
      t.equal(await nopes(t), 1, 'the long run refuses once');
      await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['9S', '8H', '7S'], 'the run did not move');
      // with the cells free the same run lifts: no refusal, no message
      await t.game('setState', fc(0));
      await t.page.evaluate(() => { window.__sq = 0; document.getElementById('toast').textContent = ''; });
      c = await card0(t, 't0', 0);
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 30, c.y + 30); await t.page.mouse.move(c.x + 60, c.y + 50);
      t.equal(await nopes(t), 0, 'a run the cells allow lifts without a refusal');
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), '', 'and says nothing');
      await t.page.mouse.up();
    },
  },
  {
    name: 'w3d S1-12 touch gets short buzzes on pick, place, foundation and refusal, behind a Vibration switch',
    initScript: stubVibrate,
    async run(t) {
      await baseSettings(t, { sound: false });
      const setup = () => t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['AS'], t1: ['6S'], t2: ['5H'], t3: ['9C'] }) });
      await setup();
      t.equal(await vib(t), [], 'nothing buzzes before a touch');
      await t.game('act', 'move', 't2', 't1');
      t.equal(await vibQuiet(t), [], 'a mouse player on a laptop never buzzes');
      await setup(); await fingerDown(t);
      await t.game('act', 'move', 't2', 't1');
      t.equal(await vibWait(t, 1), [12], 'a card placed: 12 ms');
      await t.game('act', 'move', 't0', 'f0');
      t.equal((await vibWait(t, 2)).slice(1), [[10, 40, 10]], 'a card sent home: a double pulse');
      await t.game('act', 'tap', 't3', 0);
      t.equal((await vib(t)).slice(2), [25], 'a refused move: 25 ms');
      // picking a card up with a finger
      await setup(); await fingerDown(t); await t.page.evaluate(() => { window.__vib.length = 0; });
      const c = await card0(t, 't0');
      await t.page.evaluate(([x, y]) => { const cv = document.getElementById('cv'), ev = (type, dx) => cv.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: 7, isPrimary: true, clientX: x + dx, clientY: y, bubbles: true })); ev('pointerdown', 0); ev('pointermove', 30); }, [c.x, c.y]);
      t.equal(await vibWait(t, 1), [10], 'a card lifted: 10 ms');
      await t.page.evaluate(([x, y]) => document.getElementById('cv').dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 7, isPrimary: true, clientX: x + 30, clientY: y, bubbles: true })), [c.x, c.y]);
      // the switch, and reduced motion
      await t.game('scene', 'settings');
      t.expect(await t.page.isVisible('[data-tog="haptics"]'), 'Settings has a Vibration switch');
      await t.page.locator('[data-tog="haptics"]').scrollIntoViewIfNeeded(); await shot(t, 'S1-12', 'settings');
      await t.page.click('[data-tog="haptics"]');
      t.equal((await t.state()).settings.haptics, false, 'it turns off and is saved');
      await t.game('scene', 'game'); await setup(); await fingerDown(t); await t.page.evaluate(() => { window.__vib.length = 0; });
      await t.game('act', 'move', 't2', 't1');
      t.equal(await vibQuiet(t), [], 'switched off: silent');
      await t.game('setSettings', { haptics: true, motion: 'reduced' }); await setup(); await fingerDown(t);
      await t.game('act', 'move', 't2', 't1');
      t.equal(await vibQuiet(t), [], 'reduced motion: silent');
    },
  },
  {
    name: 'w3d S1-17 the thump and the chime sound as the card lands, not when it is let go',
    initScript: spyStarts,
    async run(t) {
      await baseSettings(t, { sound: true, music: false, ambience: false }); // the music also starts tones; only cues are wanted here
      const setup = () => t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['AS'], t1: ['6S'], t2: ['5H'] }) });
      await setup();
      await t.page.mouse.click(5, 5); await leads(t); // the first gesture starts the audio
      await t.game('act', 'move', 't2', 't1');
      let l = await leads(t);
      t.expect(l.length > 0 && Math.min(...l) > 0.12 && Math.min(...l) < 0.45, 'a card placed sounds as it lands, after its 190 to 420 ms flight: ' + l.map((x) => x.toFixed(3)));
      await t.game('act', 'move', 't0', 'f0');
      l = await leads(t);
      t.expect(l.length > 0 && Math.min(...l) > 0.12 && Math.min(...l) < 0.45, 'a card sent home chimes as it lands: ' + l.map((x) => x.toFixed(3)));
      // a card dropped by hand lands after its own glide (200 to 320 ms)
      await setup(); await leads(t);
      await dragCard(t, 't2', 0, 't1');
      l = await leads(t);
      t.expect(l.length > 0 && Math.max(...l) > 0.12 && Math.max(...l) < 0.45, 'a dropped card sounds after its glide: ' + l.map((x) => x.toFixed(3)));
      t.equal((await t.game('getState')).piles.t1, ['6S', '5H'], 'and it went where it was dropped');
      // picking up is immediate
      await setup(); await leads(t);
      const c = await card0(t, 't0');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 30, c.y + 10);
      l = await leads(t);
      t.expect(l.length > 0 && Math.max(...l) < 0.05, 'a card lifted sounds at once: ' + l.map((x) => x.toFixed(3)));
      await t.page.mouse.up();
      // with reduced motion the card is there at once, so is the sound
      await t.game('setSettings', { motion: 'reduced' }); await setup(); await leads(t);
      await t.game('act', 'move', 't2', 't1');
      l = await leads(t);
      t.expect(l.length > 0 && Math.max(...l) < 0.05, 'reduced motion: no wait: ' + l.map((x) => x.toFixed(3)));
    },
  },
];
