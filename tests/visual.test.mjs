// v3 visual campaign checks: index clearance in fans, phone index size, the first-load budget,
// the low-effects fallback and the court-style setting.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(GAME, 'assets', 'manifest.json'), 'utf8'));
const KB = (n) => (n / 1024).toFixed(0) + ' KB';

// Every face-up step in every column shows the whole rank glyph, and no column runs past the table's bottom edge.
function checkColumns(t, lay, label) {
  for (const id of Object.keys(lay.piles).filter((k) => k[0] === 't')) {
    const cs = lay.piles[id].cards; if (!cs.length) continue;
    const end = cs[cs.length - 1].y + lay.cardH;
    if (end > lay.bottom + .5) t.fail(label + ' ' + id + ': column ends at ' + end.toFixed(1) + ', past the table edge ' + lay.bottom.toFixed(1));
    for (let i = 1; i < cs.length; i++) if (cs[i - 1].up && cs[i].up) {
      // the whole glyph, unless the board is already at its 80% floor: then down to the glyph's cap line
      const step = cs[i].y - cs[i - 1].y, need = lay.fit <= lay.fitFloor + 1e-6 ? lay.idxCap : lay.idxFull;
      if (step < need - .5) t.fail(label + ' ' + id + ': cards ' + (i - 1) + '/' + i + ' step ' + step.toFixed(1) + ' hides the index (' + need.toFixed(1) + ', board scale ' + lay.fit.toFixed(2) + ')');
    }
  }
}

export const tests = [
  {
    name: 'visual-60 fanned columns show every rank glyph',
    async run(t) {
      await baseSettings(t);
      const seen = [];
      for (const cardSize of ['compact', 'standard', 'large']) {
        await t.game('setSettings', { cardSize });
        for (const [mode, o] of [['klondike', {}], ['freecell', {}], ['spider', { suits: 4 }]]) {
          await t.game('newGame', Object.assign({ mode, deal: 5 }, o));
          await t.waitForStable();
          const lay = await t.game('getLayout');
          seen.push(cardSize + '/' + mode + ': step ' + lay.fanUp.toFixed(1) + ' ≥ glyph ' + lay.idxFull.toFixed(1));
          t.expect(lay.fanUp >= lay.idxFull, cardSize + ' ' + mode + ': fan step ' + lay.fanUp.toFixed(1) + ' clears the index (' + lay.idxFull.toFixed(1) + ')');
          // the real spacing on screen, between two face-up cards of a column
          checkColumns(t, lay, cardSize + ' ' + mode);
        }
      }
      // the worst case: a King-to-Ace run in four columns at once, at every card size
      const run = (su) => ['K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2', 'A'].map((r) => r + su);
      for (const cardSize of ['compact', 'standard', 'large']) {
        await t.game('setSettings', { cardSize });
        await t.game('setState', { mode: 'klondike', piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: run('S'), t1: run('H'), t2: run('C'), t3: run('D'), t4: [], t5: [], t6: [] } });
        await t.waitForStable();
        const lay = await t.game('getLayout');
        checkColumns(t, lay, cardSize + ' K-to-A runs');
        t.expect(lay.fit >= lay.fitFloor - 1e-6, cardSize + ': the board never shrinks below its floor (' + lay.fit.toFixed(2) + ' ≥ ' + lay.fitFloor + ')');
        if (cardSize === 'large') await t.shot('visual-60-long-runs');
      }
      t.log(seen.join(' · '));
    },
  },
  {
    name: 'visual-61 phone index is jumbo',
    viewports: ['mobile'],
    async run(t) {
      await baseSettings(t);
      for (const [mode, o] of [['klondike', {}], ['freecell', {}], ['spider', { suits: 2 }]]) {
        await t.game('newGame', Object.assign({ mode, deal: 9 }, o));
        const lay = await t.game('getLayout');
        t.log(mode + ': card ' + lay.cardW + ' px, rank ' + lay.indexPx + ' px (' + Math.round(lay.indexPx / lay.cardW * 100) + '%)');
        t.expect(lay.indexPx >= lay.cardW * .4, mode + ': rank glyph ≥ 40% of the card width');
        t.expect(lay.indexPx >= 15, mode + ': rank glyph ≥ 15 CSS px');
      }
    },
  },
  {
    name: 'visual-62 first-load download budget',
    async run(t) {
      await t.waitForStable();
      const a = await t.game('art');
      const missing = a.wanted.filter((n) => !MANIFEST[n]);
      t.equal(missing, [], 'every first-load request is a packed asset');
      const art = a.wanted.reduce((s, n) => s + (MANIFEST[n] ? MANIFEST[n].bytes : 0), 0);
      const html = fs.statSync(path.join(GAME, 'index.html')).size, fonts = fs.statSync(path.join(GAME, 'assets', 'fonts.css')).size;
      const total = art + html + fonts, all = Object.values(MANIFEST).reduce((s, m) => s + m.bytes, 0);
      t.log('first load: html ' + KB(html) + ' + fonts ' + KB(fonts) + ' + ' + a.wanted.length + ' images ' + KB(art) + ' = ' + KB(total) + '; whole assets folder ' + KB(all + fonts));
      t.expect(total <= 1.5 * 1024 * 1024, 'first load ≤ 1.5 MB (' + KB(total) + ')');
      t.expect(all + fonts <= 6 * 1024 * 1024, 'all assets ≤ 6 MB');
    },
  },
  {
    name: 'visual-63 low-effects mode still plays the full ceremony',
    url: 'index.html?fx=low',
    async run(t) {
      await baseSettings(t);
      t.equal(await t.game('fxLevel'), 'low', 'low effects forced by ?fx=low');
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: [], f0: ['AC', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', 'TC', 'JC', 'QC', 'KC'], f1: ['AD', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D', 'TD', 'JD', 'QD', 'KD'], f2: ['AH', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', 'TH', 'JH', 'QH', 'KH'], f3: ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS', 'JS', 'QS'], t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      await t.game('act', 'move', 't0', 'f3');
      t.expect((await t.game('act', 'ceremonyAt', 2500)).ok, 'ceremony frame');
      await t.shot('visual-63-lowfx-spray');
      await t.game('act', 'unfreeze');
      await t.waitForStable(8000);
      t.equal((await t.state()).scene, 'win', 'win dialog after the ceremony');
    },
  },
  {
    name: 'visual-64 court styles: Art Deco default, painted option',
    async run(t) {
      await baseSettings(t);
      t.equal((await t.state()).settings.courts, 'deco', 'Art Deco courts by default');
      await t.game('newGame', { mode: 'freecell', deal: 1 });
      await t.waitForStable();
      const a1 = await t.game('art');
      t.expect(a1.loaded.includes('deco-ks'), 'Art Deco court art loaded');
      await t.game('setSettings', { courts: 'painted' });
      await t.waitForStable();
      const a2 = await t.game('art');
      t.expect(a2.loaded.includes('court-ks'), 'painted court art loads on demand');
      await t.shot('visual-64-painted-courts');
      await t.reload();
      t.equal((await t.state()).settings.courts, 'painted', 'court style persists');
    },
  },
];
