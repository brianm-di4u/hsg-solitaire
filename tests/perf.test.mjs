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
];
