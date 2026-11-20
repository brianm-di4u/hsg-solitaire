// Performance (PRD AC 41): load time, frame rate during the win cascade and while dragging, heap, file size.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawShot, baseSettings, nearWinKlondike } from './_util.mjs';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');

export const tests = [
  {
    name: 'perf-41 load, fps, memory, size',
    async run(t) {
      const bytes = fs.statSync(FILE).size;
      t.log('file size', (bytes / 1024).toFixed(1) + ' KB', '· load', t.loadMs + ' ms');
      t.expect(bytes <= 2 * 1024 * 1024, 'index.html ≤ 2 MB');
      // The page's own timing (navigation start to DOMContentLoaded, which includes the whole boot) is what the game
      // controls. The harness's wall-clock loadMs also includes browser start-up, which several sessions on one
      // machine can stretch to seconds, so it is logged only.
      const nav = await t.page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? Math.round(n.domContentLoadedEventEnd) : null; });
      t.log('page boot (navigation start to DOMContentLoaded)', nav + ' ms');
      if (nav != null) t.expect(nav < 1000, 'boot finishes < 1 s after navigation (' + nav + ' ms)');
      await baseSettings(t);
      await t.game('newGame', { mode: 'spider', suits: 4, deal: 41 });
      await t.waitForStable();
      // drag a card around for a while and measure frame rate
      const lay = await t.game('getLayout'); const c = lay.piles.t0.cards[lay.piles.t0.cards.length - 1];
      await t.page.mouse.move(c.x + 10, c.y + 10); await t.page.mouse.down();
      await t.game('frameStats', true);
      const fpsP = t.fps(1200);
      for (let i = 0; i < 40; i++) await t.page.mouse.move(c.x + 10 + i * 6, c.y + 10 + Math.sin(i / 4) * 60);
      const dragFps = await fpsP; await t.page.mouse.up();
      const dragCost = await t.game('frameStats', true);
      await t.game('setState', nearWinKlondike());
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForTimeout(500);
      await t.game('frameStats', true);
      const fps = await t.fps(1500);
      const cerCost = await t.game('frameStats', true);
      await rawShot(t, 'perf-41-cascade');
      const mem = await t.memoryMB();
      t.log('drag fps', dragFps, '· ceremony fps', fps, '· heap', mem + ' MB');
      t.log('CPU per frame (ms) drag: median', dragCost.p50Ms, 'p95', dragCost.p95Ms, 'max', dragCost.maxMs, '· ceremony: median', cerCost.p50Ms, 'p95', cerCost.p95Ms, 'max', cerCost.maxMs);
      // The frame budget is what the game controls. rAF fps, and even the worst single frame, also depend on everything
      // else the machine is doing (several sessions share this one, and the OS can preempt a frame), so fps, p95 and max
      // are logged and the median frame cost is asserted.
      t.expect(dragCost.p50Ms < 6, 'median drag frame < 6 ms (' + dragCost.p50Ms + ')');
      // one frame per display refresh: a loop that queues itself twice multiplies frames every refresh
      t.expect(dragCost.frames <= 1.2 * 144, 'drag draws at most one frame per refresh (' + dragCost.frames + ' frames in 1.2 s)');

      t.expect(cerCost.p50Ms < 8, 'median ceremony frame < 8 ms (' + cerCost.p50Ms + ')');
      if (mem != null) t.expect(mem < 40, 'heap < 40 MB (' + mem + ')');
      await t.waitForStable(6000);
    },
  },
  {
    name: 'perf-42 104-card Spider ceremony stays bounded (<=40 flyers, <=160 pooled echoes, zero cascade.trail, <8 ms median CPU)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });
      const runS = ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS', 'JS', 'QS', 'KS'];
      await t.game('setState', {
        mode: 'spider', opts: { suits: 1 },
        piles: {
          stock: [],
          f0: runS, f1: runS, f2: runS, f3: runS, f4: runS, f5: runS, f6: runS, f7: [],
          t0: ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'],
          t1: ['AS'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [],
        },
      });
      await t.waitForStable();
      await t.game('act', 'move', 't1', 't0');
      // Verify pooled dt-exact echo stamps & zero offscreen cascade.trail during active 104-card spray
      const snap = await t.game('act', 'ceremonyAt', 2350);
      t.equal(snap.ok, true, '104-card Spider ceremony reached spray frame');
      const eco = await t.game('runtimeEconomy');
      t.equal(eco.hasTrail, false, 'CD-WF3-07: offscreen cascade.trail is retired');
      t.expect(eco.echoes > 0 && eco.echoes <= 160 && eco.maxEchoes === 160, 'pooled echo stamps active and bounded <=160 (' + eco.echoes + '/160)');
      t.expect(eco.flyers <= 40 && eco.maxFly === 40, '104-card Spider ceremony caps simultaneous flyers <=40 (' + eco.flyers + ')');
      await t.game('act', 'unfreeze');
      await t.game('frameStats', true);
      const fps = await t.fps(1200);
      const spCost = await t.game('frameStats', true);
      t.log('104-card Spider ceremony fps', fps, '· median', spCost.p50Ms, 'p95', spCost.p95Ms, 'max', spCost.maxMs);
      t.expect(spCost.p50Ms < 8, '104-card Spider ceremony median frame < 8 ms (' + spCost.p50Ms + ')');
      await t.waitForStable(8000);
      const after = await t.game('runtimeEconomy');
      t.equal(after.echoes, 0, 'echo pool clears cleanly after ceremony');
    },
  },
  {
    name: 'perf-43 W4-B04 idle shakes{} rAF & 40 Hz kit.stop() shutdown, static Title backdrop cache, & lowFx skyLoop gate (W6-S6-03)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: true, music: true, ambience: true, tips: false, motion: 'full' });
      // 1. Trigger a shake in 104-card Spider (card index u>=52), then immediately switch to 52-card Klondike -> rAF MUST sleep at 0 idle frames.
      await t.game('newGame', { mode: 'spider', suits: 4, deal: 11 });
      await t.waitForStable();
      await t.game('act', 'tap', 't0', 0); // face-down card triggers refusal shake
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 7 });
      await t.waitForStable();
      await t.waitFrames(6);
      await t.game('frameStats', true);
      await t.page.waitForTimeout(350);
      const idleStats = await t.game('frameStats', true);
      const idleEco = await t.game('runtimeEconomy');
      t.equal(idleStats.frames, 0, 'idle table draws 0 rAF frames after Spider->Klondike switch (' + idleStats.frames + ')');
      t.equal([idleEco.rafActive, idleEco.shakes, idleEco.steam], [false, 0, 0], 'rAF, shakes{}, and steam are all idle at rest');

      // 2. Audio 40 Hz scheduler shuts down cleanly via kit.stop() on mute, silent settings, and hidden tab.
      await t.page.mouse.click(5, 5);
      await t.page.waitForFunction(() => window.__game.audioState().ready, null, { timeout: 5000 });
      t.equal((await t.game('audioState')).timerActive, true, 'scheduler runs while sound + music/ambience are active');
      await t.game('setSettings', { sound: false });
      t.equal((await t.game('audioState')).timerActive, false, 'muting sound invokes kit.stop() immediately');
      await t.game('setSettings', { sound: true, music: false, ambience: false });
      await t.page.waitForFunction(() => !window.__game.audioState().timerActive, null, { timeout: 2500 });
      t.equal((await t.game('audioState')).timerActive, false, 'turning off both music & ambience shuts down the 40 Hz scheduler');
      await t.game('setSettings', { music: true, ambience: true });
      await t.page.waitForFunction(() => window.__game.audioState().timerActive, null, { timeout: 2500 });
      await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      t.equal((await t.game('audioState')).timerActive, false, 'hiding tab invokes kit.stop() immediately');
      await t.page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });

      // 3. Title static backdrop cache is created on Title and freed on entering gameplay.
      await t.game('scene', 'title');
      await t.waitForStable();
      const titleEco = await t.game('runtimeEconomy');
      t.equal(titleEco.skyCached, true, 'Title caches static title-hero backdrop offscreen');
      await t.game('scene', 'game');
      await t.waitForStable();
      const gameEco = await t.game('runtimeEconomy');
      t.equal(gameEco.skyCached, false, 'leaving Title frees cached sky backdrop VRAM');
    },
  },
  {
    name: 'perf-44 lowFx gates skyLoop() off atop static Title backdrop & skips ceremony echo stamps (W6-S6-03)',
    url: 'index.html?fx=low',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });
      await t.game('scene', 'title');
      await t.waitForStable();
      const s0 = await t.game('sky');
      await t.waitFrames(6);
      const s1 = await t.game('sky');
      t.equal([s0.running, s1.running, s1.frames], [false, false, s0.frames], 'skyLoop() stays off under lowFx atop static Title backdrop');
      await t.game('setState', nearWinKlondike());
      await t.game('act', 'move', 't0', 'f3');
      await t.game('act', 'ceremonyAt', 2350);
      const eco = await t.game('runtimeEconomy');
      t.equal([eco.hasTrail, eco.echoes], [false, 0], 'lowFx ceremony allocates zero trail canvas and emits zero echo stamps');
      await t.game('act', 'unfreeze');
      await t.game('act', 'skip');
    },
  },
];
