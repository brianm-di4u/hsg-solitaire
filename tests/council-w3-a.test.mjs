// Council wave 3, batch A: saves, lifecycle and robustness; controls, rules and play.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-3', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };

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
];
