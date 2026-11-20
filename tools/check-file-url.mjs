// Opens the game straight from disk (file://), with no server, and checks that the vendored fonts and the painted
// art load, with no console errors and no requests leaving the machine. The harness only serves over http, so this
// covers the other way people open the game. Uses the harness's Playwright.
// Run: node tools/check-file-url.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(GAME, 'shared', 'test-harness', 'package.json'));
const { chromium } = require('playwright');

const browser = await chromium.launch();
const fileHref = pathToFileURL(path.join(GAME, 'index.html')).href;
const cases = [
  { name: 'desktop', viewport: { width: 1280, height: 800 }, query: '?mode=klondike', noFilter: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, query: '?mode=klondike', noFilter: false },
  { name: 'desktop-title', viewport: { width: 1280, height: 800 }, query: '', noFilter: false },
  { name: 'mobile-title', viewport: { width: 390, height: 844 }, query: '', noFilter: false },
  { name: 'desktop-nofilter', viewport: { width: 1280, height: 800 }, query: '', noFilter: true },
  { name: 'mobile-nofilter', viewport: { width: 390, height: 844 }, query: '', noFilter: true },
];
let failed = 0;
for (const c of cases) {
  const context = await browser.newContext({ viewport: c.viewport });
  if (c.noFilter) await context.addInitScript(() => { delete CanvasRenderingContext2D.prototype.filter; });
  const page = await context.newPage();
  const errors = [], external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });
  let ok = false, r = null, missing = [], extraNote = '';
  try {
    await page.goto(fileHref + c.query);
    await page.waitForFunction(() => window.__game && window.__game.isIdle(), null, { timeout: 20000 });
    let extraOk = true;
    if (c.noFilter) {
      const cf = await page.evaluate(() => window.__game.canvasFilter());
      const sc0 = await page.evaluate(() => window.__game.getState().scene);
      await page.evaluate(() => window.__game.newGame({ mode: 'klondike', draw: 1, deal: 11 }));
      await page.waitForFunction(() => window.__game && window.__game.isIdle(), null, { timeout: 20000 });
      await page.evaluate(() => window.__game.act('draw'));
      await page.waitForFunction(() => window.__game && window.__game.isIdle(), null, { timeout: 20000 });
      const sc1 = await page.evaluate(() => window.__game.getState().scene);
      extraOk = cf === false && sc0 === 'title' && sc1 === 'game';
      extraNote = ` · filter=${cf} · scenes=${sc0}->${sc1}`;
    }
    r = await page.evaluate(() => ({
      fonts: ['700 20px "Libre Bodoni"', '20px Limelight', '700 20px "Josefin Sans"'].every((f) => document.fonts.check(f)),
      art: window.__game.art(),
    }));
    missing = r.art.wanted.filter((n) => !r.art.loaded.includes(n));
    ok = r.fonts && !missing.length && !errors.length && !external.length && extraOk;
  } catch (e) {
    errors.push(e.message);
  }
  if (!ok) failed++;
  console.log((ok ? 'PASS' : 'FAIL') + `  [${c.name}] fonts ${r && r.fonts ? 'ok' : 'MISSING'} · ${r ? r.art.loaded.length + '/' + r.art.wanted.length : '0/0'} images` + extraNote +
    (missing.length ? ' · missing ' + missing.join(',') : '') + (errors.length ? ' · errors ' + errors.join(' | ') : '') +
    (external.length ? ' · external ' + external.join(' ') : ''));
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
