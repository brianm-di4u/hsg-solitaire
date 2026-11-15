// Council wave 3, batch E: sound, layout and accessibility, world, words and ceremony
// (S5-08, S6-08, S4-01, S4-07, S4-23, S2-03, S2-20, S2-04, S4-08).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const SHOTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '_council', 'hsg-solitaire', 'wave-3', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };
const EMPTY_K = { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };

export const tests = [
  {
    name: 'w3e S5-08 Draw 3 flips once per card, Draw 1 once, and the stock hint chimes',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false });
      const deal = (draw) => t.game('setState', { mode: 'klondike', opts: { draw }, piles: Object.assign({}, EMPTY_K, { stock: ['2C', '3C', '4C', '5C', '6C'], t0: ['9S'] }) });
      const flips = async () => (await t.game('cuesPlayed', true)).filter((c) => c.name === 'flip');
      await deal(3); await t.game('cuesPlayed', true);
      await t.game('act', 'draw');
      let f = await flips();
      t.equal(f.length, 3, 'Draw 3 sounds three flips');
      t.equal(f.map((c) => Math.round(c.wait * 1000)), [0, 45, 90], 'they come 45 ms apart');
      await t.waitForStable();
      await deal(1); await t.game('cuesPlayed', true);
      await t.game('act', 'draw');
      f = await flips();
      t.equal(f.length, 1, 'Draw 1 sounds one flip');
      // the last draw of a short stock flips only the cards there are
      await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: Object.assign({}, EMPTY_K, { stock: ['2C', '3C'], t0: ['9S'] }) });
      await t.game('cuesPlayed', true); await t.game('act', 'draw');
      t.equal((await flips()).length, 2, 'two cards left: two flips');
      // the stock hint: a chime
      await t.waitForStable();
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { stock: ['AH'], t0: ['9S'], t1: ['KD'] }) });
      await t.game('cuesPlayed', true); await t.game('act', 'hint');
      const names = (await t.game('cuesPlayed')).map((c) => c.name);
      t.expect(names.includes('hint'), 'the hint toward the stock chimes: ' + names.join());
    },
  },
];
