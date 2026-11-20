// Council wave 3, batch D: sound (CL-01, S1-07, S1-08, S1-12, S1-17, S3-18, S5-03, S5-05, S5-06).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, dragCard, nearWinKlondike } from './_util.mjs';

const SHOTS = process.env.HS_ARTIFACT_DIR
  ? path.resolve(process.env.HS_ARTIFACT_DIR, 'wave-3', 'shots')
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'screenshots', 'council-waves', 'wave-3', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };

const MAX = { volume: 1, musicVol: 1, ambVol: 1 };
// Refusal cues now use acoustic wood/felt Foley (zero square waves per CD-WF4-06); count via window.__game.cuesPlayed().
const nopes = async (t, clear = false) => (await cuesNow(t, clear)).filter((c) => c.name === 'nope').length;
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
// (a slow win cannot beat KL's records, so it is a record only where a test lowers one; an assisted win never grows the streak)
const winWith = async (t, stats, meta, assisted, slow) => {
  await put(t, { stats: { klondike1: Object.assign({}, KL, stats) }, meta: Object.assign({ lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 5, daily: {}, unlock: { ids: [] } }, meta), settings: { sound: false, tips: false } });
  await reloadGame(t); await baseSettings(t, { sound: false });
  await t.game('setState', nearWinKlondike()); if (assisted) await t.game('act', 'hint');
  await cuesNow(t, true);
  // slow: a first move and a moment on the clock, so the win is slower than KL's 1 ms record and cannot be a record by being instant
  if (slow) { await t.game('act', 'move', 't0', 't1'); await t.page.waitForFunction(() => window.__game.getState().elapsedMs > 50, null, { timeout: 10000 }); await t.game('act', 'move', 't1', 'f3'); } else await t.game('act', 'move', 't0', 'f3');
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
      // The title piece is seeded, so its two renders are the same every time: the ratio is set by the volume controls alone
      // (about 2.8), and a hook that ignores them gives exactly 1.
      const quiet = (await render(t, 'title', 8)).peak, loud = (await render(t, 'title', 8, MAX)).peak;
      t.log('title piece peak: shipped ' + quiet + ', every control at maximum ' + loud);
      t.expect(loud / quiet > 2, 'the render hook takes the volume: maximum is more than twice the shipped level (' + (loud / quiet).toFixed(2) + ')');
      // The cues carry unseeded noise, so single renders of the mix differ by about 10%: clip-check the loudest of three.
      const mix = []; for (let i = 0; i < 3; i++) mix.push((await render(t, 'mix', 12, MAX)).peak);
      t.log('mix peaks at maximum: ' + mix);
      t.expect(Math.max(...mix) < 0.95, 'no clipping at maximum volume: ' + Math.max(...mix));
      for (const name of ['win', 'found', 'place', 'nope', 'hint']) {
        const r = await render(t, name, 21, { volume: 1 });
        t.expect(r.peak < 0.95, name + ' at full volume stays under 0.95: ' + r.peak);
      }
    },
  },
  {
    name: 'w3d S1-07 a drag released over its own pile is no refusal, and a wobbly tap still moves the card',
    async run(t) {
      await baseSettings(t, { sound: true });
      const setup = () => t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['AS'], t1: ['KD'] }) });
      // a tap that travelled a little: the ace goes home, with no refusal
      await setup(); await cuesNow(t, true); let c = await card0(t, 't0');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 10, c.y + 3); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.f0, ['AS'], 'a wobbly tap sent the ace home');
      t.equal(await nopes(t, true), 0, 'and no refusal sounded');
      // taken out and put back over its own pile: stays, quietly
      await setup(); await cuesNow(t, true); c = await card0(t, 't0');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 160, c.y + 160, { steps: 4 }); await t.page.mouse.move(c.x, c.y + 40, { steps: 4 }); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['AS'], 'put back: the card stays');
      t.equal(await nopes(t, true), 0, 'and no refusal sounded');
      // dropped on a pile that refuses it: still a refusal
      await setup(); await cuesNow(t, true); c = await card0(t, 't0'); const k = await card0(t, 't1');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(k.x, k.y + 20, { steps: 6 }); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['AS'], 'the ace did not fit on the king');
      t.equal(await nopes(t, true), 1, 'the refusal still sounds for a real mistake');
      // drag-only mode: a wobble is not a tap, so nothing moves and nothing sounds
      await t.game('setSettings', { tapMove: 'drag' }); await setup(); await cuesNow(t, true); c = await card0(t, 't0');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 10, c.y + 3); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['AS'], 'drag-only: the card stays');
      t.equal(await nopes(t, true), 0, 'drag-only: no refusal for a wobble');
    },
  },
  {
    name: 'w3d S1-08 dragging a card that cannot be lifted shakes, sounds once, and a FreeCell run says why',
    async run(t) {
      await baseSettings(t, { sound: true });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['#KD', 'QS'], t1: ['5C'] }) });
      await cuesNow(t, true);
      let c = await card0(t, 't0', 0);
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down();
      await t.page.mouse.move(c.x + 20, c.y + 20); await t.page.mouse.move(c.x + 60, c.y + 60); await t.page.mouse.move(c.x + 90, c.y + 40);
      t.equal(await nopes(t, true), 1, 'a face-down card dragged: one refusal, not one per move');
      await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['#KD', 'QS'], 'nothing moved');
      t.expect(!/free cells/.test(await t.page.evaluate(() => document.getElementById('toast').textContent)), 'no free-cell message for a face-down card');
      // FreeCell: three cells full and no empty column, so two cards can move at once, and the run is three
      const fc = (cells) => ({ mode: 'freecell', opts: {}, piles: { c0: cells > 0 ? ['2C'] : [], c1: cells > 1 ? ['2D'] : [], c2: cells > 2 ? ['2H'] : [], c3: [], f0: [], f1: [], f2: [], f3: [], t0: ['9S', '8H', '7S'], t1: ['KC'], t2: ['KD'], t3: ['KH'], t4: ['QC'], t5: ['QD'], t6: ['QH'], t7: ['JC'] } });
      await t.game('setState', fc(3));
      await cuesNow(t, true);
      await t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });
      c = await card0(t, 't0', 0);
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 30, c.y + 30); await t.page.mouse.move(c.x + 60, c.y + 50);
      await t.page.waitForFunction(() => /Not enough free cells for that run/.test(document.getElementById('toast').textContent));
      t.equal(await nopes(t, true), 1, 'the long run refuses once');
      await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['9S', '8H', '7S'], 'the run did not move');
      // with the cells free the same run lifts: no refusal, no message
      await t.game('setState', fc(0));
      await cuesNow(t, true);
      await t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });
      c = await card0(t, 't0', 0);
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 30, c.y + 30); await t.page.mouse.move(c.x + 60, c.y + 50);
      t.equal(await nopes(t, true), 0, 'a run the cells allow lifts without a refusal');
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
      await t.page.click('#stab-audio');
      t.expect(await t.page.isVisible('[data-tog="haptics"]'), 'Settings Audio tab has a Vibration switch');
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
      // a card dropped by hand lands after its own glide (90 to 320 ms: S1-16 made a drop that lands within 20 px of its place settle in as little as 90 ms)
      await setup(); await leads(t);
      await dragCard(t, 't2', 0, 't1');
      l = await leads(t);
      t.expect(l.length > 0 && Math.max(...l) > 0.07 && Math.max(...l) < 0.45, 'a dropped card sounds after its glide: ' + l.map((x) => x.toFixed(3)));
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
      // a win with a Hint does not grow the streak: no streak cue, no "in a row" line
      await winWith(t, { streak: 2 }, { totalWins: 5 }, true);
      t.equal(await heard(t), [], 'an assisted win after two: no streak cue');
      t.expect(!(await t.page.locator('#sheet').textContent()).includes('in a row'), 'and the sheet does not say wins in a row');
      // three in a row (two before this one), no record
      await winWith(t, { streak: 2 }, { totalWins: 5 }, false, true);
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
      await t.page.click('#stab-comfort');
      await cuesNow(t, true);
      await t.page.click('[data-tog="fourColor"]');
      t.equal((await cuesNow(t, true)).map((c) => c.name), ['tick'], 'a switch ticks');
      await t.page.click('[data-set="cardSize"][data-val="large"]');
      t.equal((await cuesNow(t, true)).map((c) => c.name), ['tick'], 'a choice ticks');
      await t.page.click('#stab-audio');
      await cuesNow(t, true);
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
  {
    name: 'w3d W3-B04 bespoke parlor cues, delegated UI audio, stereo pan, 45 ms cooldown, expanded haptics, SR open-info & WAI-ARIA + Select & place (W6-S5-06, W6-S5-10)',
    initScript: stubVibrate,
    async run(t) {
      await baseSettings(t, { sound: true, music: false, ambience: false, tips: false, motion: 'reduced' });
      // 1. Bespoke parlor cues: stuck (not nope), recycle (pass 1 free vs pass 2+ penalized), king, shimmer, ready
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['2C'], t1: ['2S'], t2: ['4D'], t3: ['4H'], t4: ['6C'], t5: ['6S'], t6: ['8D'] }) });
      await cuesNow(t, true);
      await t.game('act', 'checkStuck');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'stuck', null, { timeout: 5000 });
      let names = (await cuesNow(t, true)).map((c) => c.name);
      t.expect(names.includes('stuck') && !names.includes('nope'), 'dead end plays calm stuck cadence, never nope: ' + JSON.stringify(names));
      await t.page.keyboard.press('Escape');

      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { waste: ['2C'], t0: ['KS'] }) });
      await cuesNow(t, true);
      await t.game('act', 'draw'); // pass 1 recycle (free)
      let rec = (await cuesNow(t, true)).find((c) => c.name === 'recycle');
      t.expect(!!rec && rec.arg === false, 'Klondike Pass 1 recycle fires recycle(false): ' + JSON.stringify(rec));
      await t.game('act', 'draw'); // draw 2C back to waste
      await cuesNow(t, true);
      await t.game('act', 'draw'); // pass 2 recycle (penalized)
      rec = (await cuesNow(t, true)).find((c) => c.name === 'recycle');
      t.expect(!!rec && rec.arg === true, 'Klondike Pass 2+ recycle fires recycle(true) with brass clink: ' + JSON.stringify(rec));

      // Final face-down reveal shimmer + Finish-ready chime + King foundation bloom + spatial stereo pan [-0.55, 0.55]
      const runS = ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS', 'JS', 'QS'];
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { f0: runS, f1: ['AH'], t0: ['#3H', 'KS'], t6: ['2H'] }) });
      await cuesNow(t, true);
      await t.game('act', 'move', 't0', 'f0');
      const km = await cuesNow(t, true);
      t.expect(km.some((c) => c.name === 'found' && c.arg === 13), 'King plays found(13)');
      t.expect(km.some((c) => c.name === 'king'), 'King plays warm Eb/Bb consonant fifth tail');
      t.expect(km.some((c) => c.name === 'shimmer'), 'final face-down reveal plays shimmer');
      t.expect(km.some((c) => c.name === 'ready'), 'canAutoComplete false -> true plays ready chime');
      t.expect(km.every((c) => c.pan >= -0.55 && c.pan <= 0.55), 'all pans strictly clamped to [-0.55, 0.55]');

      // Stereo pan polarity: leftmost column negative pan, rightmost column positive pan
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['7S'], t1: ['6H'], t5: ['5C'], t6: ['6D'] }) });
      await cuesNow(t, true);
      await t.game('act', 'move', 't1', 't0');
      const leftPan = (await cuesNow(t, true)).find((c) => c.name === 'place').pan;
      await t.game('act', 'move', 't5', 't6');
      const rightPan = (await cuesNow(t, true)).find((c) => c.name === 'place').pan;
      t.expect(leftPan < -0.1 && rightPan > 0.1 && leftPan >= -0.55 && rightPan <= 0.55, 'left column pans left (' + leftPan + ') and right column pans right (' + rightPan + ')');

      // 2. Delegated Bathhouse Row UI audio: Title chips (tick), modal open (brush), unlocked/locked cosmetics (brush/latch), Skylight Reshuffle (glass)
      await t.game('scene', 'title');
      await cuesNow(t, true);
      await t.page.click('#tBacks');
      t.equal((await cuesNow(t, true)).map((c) => c.name), ['brush'], 'opening Backs & tables plays linen brush');
      await t.page.click('[data-back="skylight"]');
      t.equal((await cuesNow(t, true)).map((c) => c.name), ['brush'], 'picking unlocked back plays linen brush');
      const lockedSel = await t.page.evaluate(() => !!document.querySelector('#sheet .bk.lk'));
      if (lockedSel) {
        await t.page.locator('#sheet .bk.lk').first().click({ force: true });
        t.equal((await cuesNow(t, true)).map((c) => c.name), ['latch'], 'tapping locked cosmetic plays muted brass latch');
      }
      await t.page.click('[data-a="reseed"]');
      t.equal((await cuesNow(t, true)).map((c) => c.name), ['glass'], 'Reshuffle the skylight glass plays Eb/Bb leaded-glass clink');
      await t.page.keyboard.press('Escape');
      await cuesNow(t, true);
      await t.page.locator('#tiles .chip').first().click();
      t.expect((await cuesNow(t, true)).some((c) => c.name === 'tick'), 'Title game chip emits turned-brass detent tick');

      // 3. 45 ms per-cue direct-call cooldown suppresses rapid 30 Hz repeat bursts
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['9C'], t1: ['KD'] }) });
      await cuesNow(t, true);
      const burst = await t.page.evaluate(() => {
        for (let i = 0; i < 8; i++) window.__game.act('tap', 't0', 0);
        return window.__game.cuesPlayed().filter((c) => c.name === 'nope').length;
      });
      t.equal(burst, 1, '8 immediate rapid nope bursts within <45 ms collapse to 1 cue');

      // 4. Expanded BUZZ haptics (flip, undo) + hidden-tab re-check
      await t.game('setSettings', { motion: 'full', haptics: true });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { stock: ['2C'], t0: ['KS'] }) });
      await fingerDown(t);
      await t.page.evaluate(() => { window.__vib.length = 0; });
      await t.game('act', 'draw');
      t.expect((await vib(t)).includes(6), 'Draw flip fires 6 ms haptic pulse: ' + JSON.stringify(await vib(t)));
      await t.page.evaluate(() => { window.__vib.length = 0; });
      await t.game('act', 'undo');
      t.expect((await vib(t)).includes(10), 'Undo fires 10 ms haptic pulse: ' + JSON.stringify(await vib(t)));
      await t.game('setSettings', { motion: 'reduced' });

      // 5. Screen-reader open-info parity: buried FreeCell stacks in S & I/Shift+ArrowUp, 3-card Draw-3 waste, alternating #srA/#srB
      await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: Object.assign({}, EMPTY_K, { waste: ['2C', '5H', '9S'], t0: ['KS'] }) });
      await t.game('act', 'key', 's');
      const w3Sum = await t.page.evaluate(() => document.getElementById('sr').textContent);
      t.expect(/Nine of spades on top, showing Five of hearts, Two of clubs beneath/.test(w3Sum), 'Draw 3 waste speech exposes all 3 visible cards: ' + w3Sum);

      await t.game('setState', { mode: 'freecell', opts: {}, piles: { c0: [], c1: [], c2: [], c3: [], f0: [], f1: [], f2: [], f3: [], t0: ['AS', '7D', 'KH'], t1: ['4C'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [] } });
      await t.game('act', 'key', '1');
      await t.game('act', 'key', 's');
      const fcSum = await t.page.evaluate(() => document.getElementById('sr').textContent);
      t.expect(/Ace of spades, Seven of diamonds, King of hearts on top/.test(fcSum), 'S tableSummary exposes buried FreeCell face-up cards: ' + fcSum);
      await t.game('act', 'key', 'i');
      const fcInsp = await t.page.evaluate(() => document.getElementById('sr').textContent);
      t.expect(/Column 1: bottom to top: Ace of spades, Seven of diamonds, King of hearts/.test(fcInsp), 'I column-inspect reads full bottom-to-top stack: ' + fcInsp);
      const mirrorCount = await t.page.evaluate(() => document.querySelectorAll('#mirror [data-pile="t0"]').length);
      t.equal(mirrorCount, 1, 'FreeCell #mirror stays strictly actionable (CD-WF5-04: 1 button for non-run column, not 3)');

      // Alternating two #sr live nodes (#srA / #srB) on repeated identical announcements
      const srAlt = await t.page.evaluate(() => {
        window.__game.act('key', 'i');
        const firstA = document.getElementById('srA').textContent, firstB = document.getElementById('srB').textContent;
        window.__game.act('key', 'i');
        const secondA = document.getElementById('srA').textContent, secondB = document.getElementById('srB').textContent;
        return { firstA, firstB, secondA, secondB, full: document.getElementById('sr').textContent };
      });
      t.expect((srAlt.firstA && !srAlt.firstB && !srAlt.secondA && srAlt.secondB) || (!srAlt.firstA && srAlt.firstB && srAlt.secondA && !srAlt.secondB), 'identical consecutive announcements alternate between #srA and #srB: ' + JSON.stringify(srAlt));

      // 6. WAI-ARIA controls: linked Settings groups/switches, aria-valuetext="N%", aria-live captions, table onfocus, tablist ArrowRight roving
      await t.game('scene', 'settings');
      const aria = await t.page.evaluate(() => {
        const segs = [...document.querySelectorAll('#sheet .seg[role="group"]')];
        const togs = [...document.querySelectorAll('#sheet .tog[role="switch"]')];
        const sliders = ['vol', 'sfxVol', 'musicVol', 'ambVol'].map((id) => { const e = document.getElementById(id); return { id, vt: e.getAttribute('aria-valuetext') }; });
        return {
          segsLinked: segs.every((g) => g.getAttribute('aria-labelledby') && document.getElementById(g.getAttribute('aria-labelledby'))),
          togsLinked: togs.every((b) => b.getAttribute('aria-labelledby') && document.getElementById(b.getAttribute('aria-labelledby')) && !b.hasAttribute('aria-pressed')),
          sliders,
          hasSelectMode: !!document.querySelector('[data-set="tapMove"][data-val="select"]'),
        };
      });
      t.equal([aria.segsLinked, aria.togsLinked, aria.hasSelectMode], [true, true, true], 'Settings groups & switches link labels and expose Select & place');
      t.expect(aria.sliders.every((x) => /^\d+%$/.test(x.vt)), 'volume sliders expose aria-valuetext="N%": ' + JSON.stringify(aria.sliders));
      await t.page.click('#stab-audio');
      await t.page.fill('#vol', '0.45'); await t.page.dispatchEvent('#vol', 'input');
      t.equal(await t.page.getAttribute('#vol', 'aria-valuetext'), '45%', 'slider aria-valuetext updates live');

      await t.game('scene', 'backs');
      const bkLive = await t.page.evaluate(() => document.getElementById('bkCap').getAttribute('aria-live'));
      await t.page.click('#btab-tables');
      const backsAria = await t.page.evaluate((bkLive) => {
        const tbl = document.querySelector('[data-table="marble"]');
        if (tbl) tbl.focus();
        return {
          bkLive,
          tblLive: document.getElementById('tblCap').getAttribute('aria-live'),
          tblCapText: document.getElementById('tblCap').textContent,
        };
      }, bkLive);
      t.equal([backsAria.bkLive, backsAria.tblLive], ['polite', 'polite'], '#bkCap and #tblCap carry aria-live="polite"');
      t.expect(/Marble|Fordyce|wins/i.test(backsAria.tblCapText), 'focusing [data-table] updates #tblCap via onfocus: ' + backsAria.tblCapText);

      await t.game('scene', 'stats');
      const tabRove = await t.page.evaluate(() => {
        const active = document.querySelector('#sheet .sub-tabs [role="tab"][aria-selected="true"]');
        active.focus();
        return { before: active.dataset.key, panel: !!document.querySelector('#sheet #ledgerGamePanel[role="tabpanel"]') };
      });
      await t.page.keyboard.press('ArrowRight');
      const afterKey = await t.page.evaluate(() => document.querySelector('#sheet .sub-tabs [role="tab"][aria-selected="true"]').dataset.key);
      t.expect(tabRove.panel && afterKey !== tabRove.before, 'tablist ArrowRight roves to next variant tab (' + tabRove.before + ' -> ' + afterKey + ')');
      await t.page.keyboard.press('Escape');

      // 7. Opt-in Select & place pointer mode (OQ-WF5-02): tap #1 picks up, tap #2 drops on legal pile
      await t.game('setSettings', { tapMove: 'select' });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['6C'], t1: ['5H'] }) });
      const c1 = await card0(t, 't1', 0), c0 = await card0(t, 't0', 0);
      await t.page.mouse.click(c1.x, c1.y);
      t.equal((await t.state()).held, { from: 't1', index: 0 }, 'Select & place tap #1 picks up 5H');
      await t.page.mouse.click(c0.x, c0.y);
      t.equal((await t.state()).piles.t0, ['6C', '5H'], 'Select & place tap #2 drops 5H onto 6C');
      t.equal((await t.state()).held, null, 'held clears after placement');
    },
  },
];
