// Council wave 3, batch D: sound (CL-01, S1-07, S1-08, S1-12, S1-17, S3-18, S5-03, S5-05, S5-06).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, dragCard, nearWinKlondike } from './_util.mjs';

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
const P = 'spa-solitaire:v1:';
const put = (t, o) => t.page.evaluate(([p, o]) => { for (const k in o) localStorage.setItem(p + k, JSON.stringify(o[k])); }, [P, o]);
const reloadGame = async (t) => { await t.page.reload(); await t.page.waitForFunction(() => !!window.__game); };
const cuesNow = (t, clear) => t.page.evaluate((c) => window.__game.cuesPlayed(c), !!clear);
// win the near-won Klondike deal (as the winner of a save with these records) and wait for the win sheet
const KL = { played: 9, won: 8, streak: 0, bestStreak: 9, bestTimeMs: 1, fewestMoves: 1, bestScore: 99999, totalMs: 1, assistedWon: 0, recent: '' };
// (an assisted win is never a record, so it shows a streak on its own)
const winWith = async (t, stats, meta, assisted) => {
  await put(t, { stats: { klondike1: Object.assign({}, KL, stats) }, meta: Object.assign({ lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 5, daily: {}, unlock: { ids: [] } }, meta), settings: { sound: false, tips: false } });
  await reloadGame(t); await baseSettings(t, { sound: false });
  await t.game('setState', nearWinKlondike()); if (assisted) await t.game('act', 'hint');
  await cuesNow(t, true);
  await t.game('act', 'move', 't0', 'f3');
  await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
  await t.page.waitForFunction(() => window.__game.cuesPlayed().some((c) => ['best', 'streak', 'course'].includes(c.name)) || document.querySelector('#sheet .ticket'), null, { timeout: 5000 }).catch(() => {});
};
const heard = async (t) => (await cuesNow(t)).map((c) => c.name).filter((n) => ['best', 'streak', 'course'].includes(n));
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
  {
    name: 'w3d S3-18 a record, a streak and a finished course each get a cue of their own on the win sheet',
    async run(t) {
      // nothing earned: no milestone cue
      await winWith(t, {}, { totalWins: 5 }, true);
      await t.page.waitForFunction(() => !window.__game.audioState().hush, null, { timeout: 8000 }); // negative check: the music returns at 1.8 s, after the latest a milestone cue waits (1.5 s)
      t.equal(await heard(t), [], 'an ordinary win: no milestone cue');
      // a faster time than the record
      await winWith(t, { bestTimeMs: 600000 }, { totalWins: 5 });
      await t.page.waitForFunction(() => window.__game.cuesPlayed().some((c) => c.name === 'best'), null, { timeout: 5000 });
      t.equal(await heard(t), ['best'], 'a new personal best: the best cue');
      t.expect((await t.page.locator('#sheet .earn').textContent()).includes('New personal best'), 'and the sheet says so');
      // three in a row (two before this one), no record
      await winWith(t, { streak: 2 }, { totalWins: 5 }, true);
      await t.page.waitForFunction(() => window.__game.cuesPlayed().some((c) => c.name === 'streak'), null, { timeout: 5000 });
      const st = (await cuesNow(t)).find((c) => c.name === 'streak');
      t.equal(st.arg, 3, 'a streak of three: three notes');
      t.expect((await t.page.locator('#sheet .earn').textContent()).includes('3 wins in a row'), 'and the sheet says so');
      await shot(t, 'S3-18', 'win-streak');
      // the 21st win completes a course (it wins over a record on the same win)
      await winWith(t, { bestTimeMs: 600000 }, { totalWins: 20 });
      await t.page.waitForFunction(() => window.__game.cuesPlayed().some((c) => ['best', 'streak', 'course'].includes(c.name)), null, { timeout: 5000 });
      t.equal(await heard(t), ['course'], 'a finished course of 21 baths: the course cue, once');
    },
  },
  {
    name: 'w3d S5-03 cards that go home by themselves each sound their rung of the ladder, spaced, on both Auto-move and Finish',
    async run(t) {
      const gaps = (l) => l.slice(1).map((c, i) => c.wait - l[i].wait);
      await baseSettings(t, { sound: true, autoFoundation: 'all', motion: 'full' });
      // Auto-move: a move by hand, then five spades climb to the foundation on their own
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['5S', '4S', '3S', '2S', 'AS'], t1: ['KD'], t2: ['QS'] }) });
      await cuesNow(t, true);
      await t.game('act', 'move', 't2', 't1');
      let l = (await cuesNow(t)).filter((c) => c.name === 'found');
      t.equal(l.map((c) => c.arg), [1, 2, 3, 4, 5], 'each card sounds its own rank: the ladder climbs');
      t.expect(gaps(l).every((g) => g >= 0.058), 'no two closer than 60 ms: ' + gaps(l).map((g) => g.toFixed(3)));
      t.expect(l[0].wait > 0.1, 'the first waits for the player move to settle: ' + l[0].wait.toFixed(3));
      // Finish: thirteen cards home, one cue each
      const run = ['K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2', 'A'], sorted = (x) => run.slice().reverse().map((r) => r + x);
      const fin = () => t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { f0: sorted('C'), f1: sorted('D'), f2: sorted('H'), t0: run.map((r) => r + 'S') }) });
      await t.game('setSettings', { autoFoundation: 'off' }); await fin(); await cuesNow(t, true);
      await t.game('act', 'autoComplete');
      l = (await cuesNow(t)).filter((c) => c.name === 'found');
      t.equal(l.map((c) => c.arg), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 'Finish: a cue per card, climbing');
      t.expect(gaps(l).every((g) => g >= 0.058), 'Finish: spaced');
      // reduced motion: the cards arrive together, so they sound as one
      await t.game('setSettings', { motion: 'reduced' }); await t.waitForStable(9000); await fin(); await cuesNow(t, true);
      await t.game('act', 'autoComplete');
      l = (await cuesNow(t)).filter((c) => c.name === 'found');
      t.expect(l.length >= 1 && l.length <= 2, 'reduced motion: one cue, not thirteen at once: ' + l.length);
    },
  },
  {
    name: 'w3d S5-05 the win ceremony has a shimmer as the cards gather and a whoosh when they spray, and a skip cuts the whoosh',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: true, motion: 'full' });
      const win = async () => { await t.game('setState', nearWinKlondike()); await cuesNow(t, true); await t.game('act', 'move', 't0', 'f3'); await t.page.waitForFunction(() => window.__game.getState().ceremony, null, { timeout: 15000 }); };
      await win();
      await t.page.waitForFunction(() => window.__game.cuesPlayed().some((c) => c.name === 'spray'), null, { timeout: 15000 });
      const l = await cuesNow(t), g = l.find((c) => c.name === 'gather'), p = l.find((c) => c.name === 'spray');
      t.expect(l.findIndex((c) => c.name === 'win') < l.findIndex((c) => c.name === 'gather'), 'the fanfare, then the shimmer: ' + l.map((c) => c.name));
      t.expect(p.at - g.at >= 1550 && p.at - g.at < 6000, 'the whoosh comes when the rosette has held (gather 950 + hold 650 ms): ' + (p.at - g.at) + ' ms');
      await t.game('act', 'skip'); await t.waitForStable(9000);
      // a press that ends the ceremony early takes the whoosh with it
      await win();
      await t.page.waitForFunction(() => window.__game.cuesPlayed().some((c) => c.name === 'gather'));
      await t.game('act', 'key', 'Enter');
      await t.page.waitForTimeout(2000); // negative check: the whoosh is due 1.6 s after the gather; a slower machine only makes this pass more easily
      t.expect(!(await cuesNow(t)).some((c) => c.name === 'spray'), 'skipped: no whoosh over the win sheet');
    },
  },
  {
    name: 'w3d S5-06 the volume slider plays a cue as it moves, switches and the menu tick, the stock hint chimes',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: true, music: false, ambience: false });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { stock: ['AC', '3D'], t0: ['KS'] }) });
      await t.page.mouse.click(5, 5); await cuesNow(t, true);
      await t.page.click('#bMenu');
      t.equal((await cuesNow(t, true)).map((c) => c.name), ['tick'], 'opening the menu ticks');
      await t.page.click('[data-a="settings"]');
      await cuesNow(t, true);
      await t.page.click('[data-tog="fourColor"]');
      t.equal((await cuesNow(t, true)).map((c) => c.name), ['tick'], 'a switch ticks');
      await t.page.click('[data-set="cardSize"][data-val="large"]');
      t.equal((await cuesNow(t, true)).map((c) => c.name), ['tick'], 'a choice ticks');
      // the slider: two quick moves are one preview, a later move another
      const slide = (v) => t.page.evaluate((v) => { const e = document.getElementById('vol'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v);
      await slide(0.3); await slide(0.35);
      let l = await cuesNow(t, true);
      t.equal(l.map((c) => c.name), ['place'], 'moving the master volume plays a card cue, once for a quick run of moves');
      t.equal((await t.state()).settings.volume, 0.35, 'and the volume is what the slider says');
      await t.page.evaluate(() => { window.__w = performance.now(); });
      await t.page.waitForFunction(() => performance.now() - window.__w > 200); // the preview is rate-limited to one per 140 ms
      await slide(0.4);
      t.equal((await cuesNow(t, true)).map((c) => c.name), ['place'], 'a later move previews again');
      // the stock hint
      await t.game('scene', 'game'); await cuesNow(t, true);
      const h = await t.game('act', 'hint');
      t.expect(h.stock, 'the hint points at the stock');
      t.equal((await cuesNow(t)).map((c) => c.name), ['hint'], 'and the stock hint sounds');
    },
  },
];
