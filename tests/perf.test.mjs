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
      t.expect(t.loadMs < 2000, 'interactive in < 2 s (' + t.loadMs + ' ms)');
      await baseSettings(t);
      await t.game('newGame', { mode: 'spider', suits: 4, deal: 41 });
      await t.waitForStable();
      // drag a card around for a while and measure frame rate
      const lay = await t.game('getLayout'); const c = lay.piles.t0.cards[lay.piles.t0.cards.length - 1];
      await t.page.mouse.move(c.x + 10, c.y + 10); await t.page.mouse.down();
      const fpsP = t.fps(1200);
      for (let i = 0; i < 40; i++) await t.page.mouse.move(c.x + 10 + i * 6, c.y + 10 + Math.sin(i / 4) * 60);
      const dragFps = await fpsP; await t.page.mouse.up();
      await t.game('setState', nearWinKlondike());
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForTimeout(500);
      const fps = await t.fps(1500);
      await rawShot(t, 'perf-41-cascade');
      const mem = await t.memoryMB();
      t.log('drag fps', dragFps, '· cascade fps', fps, '· heap', mem + ' MB');
      t.expect(fps >= 50, 'cascade ≥ 50 fps (' + fps + ')');
      t.expect(dragFps >= 50, 'drag ≥ 50 fps (' + dragFps + ')');
      if (mem != null) t.expect(mem < 40, 'heap < 40 MB (' + mem + ')');
      await t.waitForStable(6000);
    },
  },
];
