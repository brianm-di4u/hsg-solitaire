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
      t.expect(MB <= 6, 'asset folder ≤ 6 MB (' + MB.toFixed(2) + ')');
      await baseSettings(t);
      await t.game('scene', 'backs'); // the picker requests every back and table
      await t.waitForStable();
      const a = await t.game('art');
      const missing = Object.keys(MANIFEST).filter((n) => !a.loaded.includes(n));
      t.equal(missing, [], 'every manifest asset decoded');
      const unknown = a.wanted.filter((n) => !MANIFEST[n]);
      t.equal(unknown, [], 'the game asks only for packed assets');
      await t.shot('art-50-backs');
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
];
