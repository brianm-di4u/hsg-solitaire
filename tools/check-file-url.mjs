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
let failed = 0;
for (const [name, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  const errors = [], external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });
  await page.goto(pathToFileURL(path.join(GAME, 'index.html')).href + '?mode=klondike');
  await page.waitForFunction(() => window.__game && window.__game.isIdle(), null, { timeout: 20000 });
  const r = await page.evaluate(() => ({
    fonts: ['700 20px "Libre Bodoni"', '20px Limelight', '700 20px "Josefin Sans"'].every((f) => document.fonts.check(f)),
    art: window.__game.art(),
  }));
  const missing = r.art.wanted.filter((n) => !r.art.loaded.includes(n));
  const ok = r.fonts && !missing.length && !errors.length && !external.length;
  if (!ok) failed++;
  console.log((ok ? 'PASS' : 'FAIL') + `  [${name}] fonts ${r.fonts ? 'ok' : 'MISSING'} · ${r.art.loaded.length}/${r.art.wanted.length} images` +
    (missing.length ? ' · missing ' + missing.join(',') : '') + (errors.length ? ' · errors ' + errors.join(' | ') : '') +
    (external.length ? ' · external ' + external.join(' ') : ''));
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
