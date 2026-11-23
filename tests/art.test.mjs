// Painted art (assets/*.webp): every packed asset loads and is used; ?art=0 still gives a full game in vector art.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const MB = Object.values(MANIFEST).reduce((a, m) => a + m.bytes, 0) / 1024 / 1024;

export const tests = [
  {
    name: 'art-50 painted assets load',
    async run(t) {
      t.log(Object.keys(MANIFEST).length + ' assets, ' + MB.toFixed(2) + ' MB');
      t.expect(MB <= 5, 'asset folder ≤ 5 MB per OQ-WF1-03 (' + MB.toFixed(2) + ')');
      await baseSettings(t);
      await t.game('loadAllArt'); // diagnostic hook verifies every manifest asset decodes without forcing production BIND.backs() to preload unused art (CD-WF3-07)
      await t.waitForStable();
      const a = await t.game('art');
      const missing = Object.keys(MANIFEST).filter((n) => !a.loaded.includes(n));
      t.equal(missing, [], 'every manifest asset decoded');
      const unknown = a.wanted.filter((n) => !MANIFEST[n]);
      t.equal(unknown, [], 'the game asks only for packed assets');
      await t.game('scene', 'backs');
      await t.waitForStable();
      await t.waitForAnimations();
      const modalOpacity = await t.page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('modal')).opacity));
      t.equal(modalOpacity, 1, 'Backs modal fade finished before art-50-backs capture');
      await t.shot('art-50-backs', { animations: true });
      await t.game('newGame', { mode: 'freecell', deal: 1 });
      await t.shot('art-50-courts');
    },
  },
  {
    name: 'art-51 vector fallback (?art=0)',
    url: 'index.html?art=0',
    async run(t) {
      const a = await t.game('art');
      t.equal(a.on, false, 'art disabled by the query flag');
      t.equal(a.wanted, [], 'no asset requests');
      await baseSettings(t);
      await t.game('newGame', { mode: 'freecell', deal: 1 });
      await t.shot('art-51-fallback');
    },
  },
  {
    name: 'art-52 lazy titleArt/tablePlayArt split and inactive court/table eviction (W6-S6-03)',
    viewports: ['desktop'],
    async run(t) {
      await t.waitForStable();
      const atTitle = await t.game('art');
      t.expect(atTitle.loaded.includes('title-hero'), 'Title boot loads title-hero');
      t.expect(!atTitle.wanted.some((n) => n.startsWith('tex-')), 'Title boot defers full-res table textures (' + atTitle.wanted.length + ' wanted)');
      t.expect(!atTitle.wanted.some((n) => n.startsWith('court-')), 'Title boot never loads unused Painted courts');

      await t.game('unlockAll');
      await baseSettings(t, { table: 'marble', courts: 'deco' });
      await t.game('newGame', { mode: 'freecell', deal: 1 });
      await t.waitForStable();
      let a = await t.game('art');
      t.expect(a.loaded.includes('tex-marble-l') && a.loaded.includes('deco-ks'), 'gameplay loads active table and Deco courts');

      await t.game('setSettings', { table: 'felt', courts: 'painted' });
      await t.waitForStable();
      a = await t.game('art');
      t.expect(a.loaded.includes('tex-felt-l') && a.loaded.includes('court-ks'), 'switching venue/courts loads new assets');
      t.expect(!a.loaded.includes('tex-marble-l') && !a.loaded.includes('glow-skylight'), 'inactive full-res table textures evicted from memory');
      t.expect(!a.loaded.some((n) => n.startsWith('deco-')), 'inactive Deco court set evicted when switching to Painted');
    },
  },
  {
    name: 'art-53 direct ?mode= gameplay boot skips title-hero.webp (OQ-WF3-02, W6-S6-03)',
    url: 'index.html?mode=klondike',
    viewports: ['desktop'],
    async run(t) {
      await t.waitForStable();
      const a = await t.game('art');
      t.expect(!a.wanted.includes('title-hero') && !a.loaded.includes('title-hero'), 'direct gameplay boot skips 306 KB title-hero.webp');
      t.expect(a.loaded.includes('tex-felt-l') && a.loaded.includes('brass-slot'), 'direct gameplay boot loads active table & brass hardware');
    },
  },
  {
    name: 'art-54 W6-S6-03 repo hygiene: unused inline.mjs removed, art-src/*.png gitignored, and PRD/REPORT/REFINEMENT/README reconciled',
    node: true,
    async run(t) {
      const root = path.resolve(DIR, '..');
      const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
      t.expect(!fs.existsSync(path.join(root, 'shared', 'tools', 'inline.mjs')), 'unused shared/tools/inline.mjs is removed');
      t.expect(!fs.existsSync(path.join(root, 'art-src', 'sheet.png')), 'art-src/sheet.png is not present in clean checkout');
      t.expect(read('.gitignore').includes('art-src/**/*.png'), '.gitignore ignores regenerable art-src/**/*.png contact sheets');

      const readme = read('README.md');
      t.expect(!readme.includes('shared/tools/inline.mjs'), 'README.md no longer lists removed shared/tools/inline.mjs');

      const prd = read('PRD.md');
      t.expect(prd.includes('50 sourced Hot Springs facts') && prd.includes('24 achievements') && prd.includes('6 parlor tables'), 'PRD.md states 6 tables, 50 facts, and 24 achievements');
      t.expect(!prd.includes('assets/` stays ≤ 3.5 MB') && !prd.includes('Tables use P5 felt, P6 linen, P2 thermal, the\n    marble swatch, and P5 midnight.'), 'PRD.md removes stale 5-table and 3.5 MB asset statements');

      const rep = read('REPORT.md');
      t.expect(rep.includes('6 parlor tables') && rep.includes('50 sourced Hot Springs facts') && rep.includes('24 achievements') && rep.includes('21-win') && rep.includes('free unlimited Undo'), 'REPORT.md reconciles shipped counts (6 tables, 50 facts, 24 achievements, 21-win unlocks, free Undo)');

      const ref = read('REFINEMENT-2026-11.md');
      t.expect(!ref.includes('Formal release HOLD'), 'REFINEMENT-2026-11.md removes obsolete release HOLD banner');
      t.expect(!ref.includes('D:/hsg-campaign/') && !ref.includes('C:/Video Game Projects/'), 'REFINEMENT-2026-11.md removes broken machine-local absolute paths');
      t.expect(ref.includes('6 parlor tables') && ref.includes('50 sourced Hot Springs facts') && ref.includes('24 achievements'), 'REFINEMENT-2026-11.md reconciles current shipped counts');
    },
  },
];
