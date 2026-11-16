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
];
