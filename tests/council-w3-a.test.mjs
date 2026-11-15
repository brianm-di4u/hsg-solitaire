// Council wave 3, batch A: saves, lifecycle and robustness; controls, rules and play.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-3', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };

const P = 'spa-solitaire:v1:';
const raw = (t, k) => t.page.evaluate(([p, k]) => localStorage.getItem(p + k), [P, k]);
const waitModal = (t, kind) => t.page.waitForFunction((k) => window.__game.getState().scene === k, kind, { timeout: 8000 });
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
];
