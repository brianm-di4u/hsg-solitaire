// Before/after contact sheets for the visual campaign: pairs the same screenshot from two milestone runs side by side.
// Run: node games/solitaire/tools/before-after.mjs [before=visual-before] [after=visual-final]
// Writes screenshots/<after>/before-after/<viewport>-NN.png (screenshots/ is git-ignored). Uses the harness's Playwright.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(GAME, '..', '..', 'shared', 'test-harness', 'package.json'));
const { chromium } = require('playwright');
const [before = 'visual-before', after = 'visual-final'] = process.argv.slice(2);
const SHOTS = ['rules-01-klondike-deal', 'rules-06-freecell-617', 'rules-08-spider4', 'screens-29-courts', 'screens-28-faces',
  'play-13-dragging', 'play-16-hint', 'play-30-cascade', 'play-30-win', 'screens-31-title', 'screens-37-menu', 'screens-32-settings',
  'screens-27-table-marble', 'screens-27-table-pool', 'screens-38-game-dark', 'persist-24-title-continue'];

const out = path.join(GAME, 'screenshots', after, 'before-after');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const vp of ['desktop', 'mobile']) {
  const pairs = SHOTS.map((n) => [n, path.join(GAME, 'screenshots', before, vp, n + '.png'), path.join(GAME, 'screenshots', after, vp, n + '.png')])
    .filter(([, a, b]) => fs.existsSync(a) && fs.existsSync(b));
  const per = vp === 'desktop' ? 3 : 4, w = vp === 'desktop' ? 620 : 300;
  for (let i = 0; i < pairs.length; i += per) {
    const page = await browser.newPage({ viewport: { width: w * 2 + 40, height: 400 } });
    const img = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    let html = '<body style="margin:0;background:#1a1a1a;color:#ddd;font:13px sans-serif;padding:8px">';
    for (const [n, a, b] of pairs.slice(i, i + per)) {
      html += `<div style="margin:6px 0 2px">${n}</div><div style="display:flex;gap:8px">` +
        `<figure style="margin:0"><img style="width:${w}px;display:block" src="${img(a)}"><figcaption>before (${before})</figcaption></figure>` +
        `<figure style="margin:0"><img style="width:${w}px;display:block" src="${img(b)}"><figcaption>after (${after})</figcaption></figure></div>`;
    }
    await page.setContent(html); await page.waitForTimeout(300);
    const file = path.join(out, `${vp}-${String(i / per + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: file, fullPage: true }); await page.close();
    console.log(path.relative(GAME, file));
  }
}
await browser.close();
