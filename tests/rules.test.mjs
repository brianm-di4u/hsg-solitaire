// Rules tests: deals, legality, stock, Spider runs, FreeCell vectors, determinism (PRD AC 1–11, 20, 21).
import { inflateSync } from 'node:zlib';

function decodePng(buf) {
  let pos = 8, w = 0, h = 0, ct = 6; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') { w = buf.readUInt32BE(pos + 8); h = buf.readUInt32BE(pos + 12); ct = buf[pos + 17]; }
    else if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
    else if (type === 'IEND') break;
    pos += len + 12;
  }
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(h * stride);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], s0 = y * (stride + 1) + 1, d0 = y * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[s0 + x], a = x >= bpp ? out[d0 + x - bpp] : 0, b = y > 0 ? out[d0 - stride + x] : 0, c = y > 0 && x >= bpp ? out[d0 - stride + x - bpp] : 0;
      out[d0 + x] = (v + (f === 1 ? a : f === 2 ? b : f === 3 ? ((a + b) >> 1) : f === 4 ? paeth(a, b, c) : 0)) & 255;
    }
  }
  return { w, h, bpp, data: out };
}

const FC1 = ['JD 2D 9H JC 5D 7H 7C 5H', 'KD KC 9S 5S AD QC KH 3H', '2S KS 9D QD JS AS AH 3C', '4C 5C TS QH 4H AC 4D 7S',
  '3S TD 4S TH 8H 2C JH 7D', '6D 8S 8D QS 6C 3D 8C TC', '6S 9C 2H 6H'];
const FC617 = ['7D AD 5C 3S 5S 8C 2D AH', 'TD 7S QD AC 6D 8H AS KH', 'TH QC 3H 9D 6S 8D 3D TC', 'KD 5H 9S 3C 8S 7H 4D JS',
  '4C QS 9C 9H 7C 6H 2C 2S', '4S TS 2H 5D JC 6C JH QH', 'JD KS KC 4H'];
function rowsToCols(rows) { const cols = [[], [], [], [], [], [], [], []]; rows.forEach((r) => r.split(' ').forEach((c, i) => cols[i].push(c))); return cols; }

export const tests = [
  {
    name: 'rules-01 klondike deal shape',
    async run(t) {
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 1234 });
      const s = await t.state();
      for (let i = 0; i < 7; i++) {
        const p = s.piles['t' + i];
        t.equal(p.length, i + 1, 'column ' + i + ' size');
        t.expect(!p[p.length - 1].startsWith('#'), 'top card face up in column ' + i);
        t.expect(p.slice(0, -1).every((c) => c.startsWith('#')), 'other cards face down in column ' + i);
      }
      t.equal(s.piles.stock.length, 24, 'stock 24'); t.equal(s.piles.waste.length, 0, 'waste empty');
      const all = Object.values(s.piles).flat().map((c) => c.replace('#', ''));
      t.equal(new Set(all).size, 52, '52 distinct cards');
      await t.shot('rules-01-klondike-deal');
      await t.checkLayout();
    },
  },
  {
    name: 'rules-02 klondike draw 1 and draw 3',
    async run(t) {
      await t.game('setSettings', { autoFoundation: 'off' });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 99 });
      await t.game('act', 'draw'); let s = await t.state();
      t.equal([s.piles.stock.length, s.piles.waste.length], [23, 1], 'draw 1 moves one card');
      await t.game('newGame', { mode: 'klondike', draw: 3, deal: 99 });
      await t.game('act', 'draw'); s = await t.state();
      t.equal([s.piles.stock.length, s.piles.waste.length], [21, 3], 'draw 3 moves three cards');
      for (let i = 0; i < 7; i++) await t.game('act', 'draw');
      s = await t.state(); t.equal(s.piles.stock.length, 0, 'stock exhausted after 8 draws');
      await t.game('act', 'draw'); s = await t.state();
      t.equal([s.piles.stock.length, s.piles.waste.length], [24, 0], 'empty stock recycles the waste');
      await t.game('act', 'draw');
      await t.shot('rules-02-draw3');
    },
  },
  {
    name: 'rules-02b klondike draw 3 covered waste micro suit pips (CD-WF3-02)',
    async run(t) {
      const sampleBox = async (pile, idx, kind) => {
        const L = await t.game('getLayout'), c = L.piles[pile].cards[idx];
        const x = Math.round(c.x + c.w * .04), y = Math.round(c.y + L.idxFull + 1);
        const width = Math.max(2, Math.round(c.w * .21)), height = Math.max(2, Math.round(c.h * .24));
        const png = decodePng(await t.page.screenshot({ clip: { x, y, width, height } }));
        const match = (R, G, B) => kind === 'red' ? R > 130 && R - G > 60 && R - B > 60
          : kind === 'blue' ? B > 120 && B - R > 50
          : kind === 'green' ? G > 75 && G - R > 25 && G - B > 15
          : R < 90 && G < 90 && B < 90;
        let count = 0; const mask = [];
        for (let i = 0; i < png.data.length; i += png.bpp) {
          const m = match(png.data[i], png.data[i + 1], png.data[i + 2]) ? 1 : 0;
          if (m) count++;
          mask.push(m);
        }
        return { arr: L.arr, count, mask };
      };
      await t.game('setSettings', { autoFoundation: 'off', fourColor: false, leftHanded: false, layout: 'fit', motion: 'reduced' });
      const basePiles = { stock: ['#9S'], waste: ['2D', '3C', '2H'], f0: [], f1: [], f2: [], f3: [], t0: ['2D'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };
      await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: basePiles });
      await t.waitForStable();
      const d0 = await sampleBox('waste', 0, 'red');
      const c1 = await sampleBox('waste', 1, 'dark');
      const top2 = await sampleBox('waste', 2, 'red');
      const tab0 = await sampleBox('t0', 0, 'red');
      t.equal(d0.arr, 'top', 'top-row layout active on ' + t.viewport);
      t.expect(d0.count >= 12, 'covered waste[0] 2D shows red micro suit pip (' + d0.count + ' px)');
      t.expect(c1.count >= 12, 'covered waste[1] 3C shows dark micro suit pip (' + c1.count + ' px)');
      t.equal(top2.count, 0, 'uncovered top waste[2] 2H omits micro suit pip');
      t.equal(tab0.count, 0, 'vertical tableau t0[0] 2D omits micro suit pip (CD-WF3-02)');
      // Same-color suit shape distinction (Heart vs Diamond in 2-color mode — zero color-only cue)
      await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: Object.assign({}, basePiles, { waste: ['2H', '3C', '2D'] }) });
      await t.waitForStable();
      const h0 = await sampleBox('waste', 0, 'red');
      t.expect(h0.count >= 12, 'covered waste[0] 2H shows red micro suit pip (' + h0.count + ' px)');
      let diff = 0; for (let i = 0; i < Math.min(d0.mask.length, h0.mask.length); i++) if (d0.mask[i] !== h0.mask[i]) diff++;
      t.expect(diff >= 4, 'covered 2D vs 2H render distinct vector suit silhouettes (' + diff + ' differing px)');
      // Covered Art Deco court cards keep crisp micro suit pip contrast
      await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: Object.assign({}, basePiles, { waste: ['QH', 'KS', '2C'] }) });
      await t.waitForStable();
      const qh = await sampleBox('waste', 0, 'red'), ks = await sampleBox('waste', 1, 'dark');
      t.expect(qh.count >= 12, 'covered Art Deco QH shows legible red micro heart (' + qh.count + ' px)');
      t.expect(ks.count >= 12, 'covered Art Deco KS shows legible dark micro spade (' + ks.count + ' px)');
      await t.shot('rules-02b-draw3-courts');
      // Four-color mode: blue Diamond & green Club micro pips
      await t.game('setSettings', { fourColor: true });
      await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: basePiles });
      await t.waitForStable();
      const b0 = await sampleBox('waste', 0, 'blue'), g1 = await sampleBox('waste', 1, 'green');
      t.expect(b0.count >= 12, 'four-color covered waste[0] 2D shows blue micro diamond (' + b0.count + ' px)');
      t.expect(g1.count >= 12, 'four-color covered waste[1] 3C shows green micro club (' + g1.count + ' px)');
      // Left-handed top-row Draw 3 still exposes the left strip with micro suit pips
      await t.game('setSettings', { fourColor: false, leftHanded: true });
      await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: basePiles });
      await t.waitForStable();
      const lh0 = await sampleBox('waste', 0, 'red');
      t.expect(lh0.count >= 12, 'left-handed covered waste[0] 2D shows red micro diamond (' + lh0.count + ' px)');
      await t.game('setSettings', { leftHanded: false });
      // Side-rail vertical waste (L.arr === 'side') must omit left micro suit pip (CD-WF3-02)
      if (t.viewport === 'desktop') {
        await t.page.setViewportSize({ width: 844, height: 390 });
        await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        await t.game('setState', { mode: 'klondike', opts: { draw: 3 }, piles: basePiles });
        await t.waitForStable();
        const side0 = await sampleBox('waste', 0, 'red');
        t.equal(side0.arr, 'side', '844x390 landscape uses side-rail vertical waste');
        t.equal(side0.count, 0, 'side-rail vertical waste[0] 2D omits stacked left micro suit pip (CD-WF3-02)');
        await t.page.setViewportSize({ width: t.vp.width, height: t.vp.height });
        await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      }
    },
  },
  {
    name: 'rules-03 klondike tableau legality and kings',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: ['#2C'], waste: ['QH'], t0: ['KS'], t1: ['#3D', 'JC'], t2: ['KD'], t3: [], t4: ['QS'], t5: ['TD'], t6: ['9S'] } });
      t.equal((await t.game('act', 'move', 't6', 't0')).ok, false, 'nine of spades cannot go on king of spades');
      t.equal((await t.game('act', 'move', 'waste', 't0')).ok, true, 'red queen on black king');
      t.equal((await t.game('act', 'move', 't4', 't2')).ok, true, 'black queen on red king');
      t.equal((await t.game('act', 'move', 't5', 't3')).ok, false, 'ten cannot fill empty column');
      t.equal((await t.game('act', 'move', 't1', 't0')).ok, true, 'jack of clubs onto queen of hearts');
      t.equal((await t.game('act', 'move', 't5', 't0')).ok, true, 'ten of diamonds onto jack of clubs');
      t.equal((await t.game('act', 'move', 't6', 't0')).ok, true, 'nine of spades onto ten of diamonds');
      t.equal((await t.game('act', 'move', 't2', 't3', 2)).ok, true, 'king-headed run into empty column');
      const s = await t.state();
      t.equal(s.piles.t0, ['KS', 'QH', 'JC', 'TD', '9S'], 'built run');
      t.equal(s.piles.t1, ['3D'], 'AC 4: exposed card flipped face up');
    },
  },
  {
    name: 'rules-04 yukon deal and group move',
    async run(t) {
      await t.game('newGame', { mode: 'yukon', deal: 42 });
      let s = await t.state();
      t.equal(s.piles.t0.length, 1, 'column 1 has one card');
      for (let i = 1; i < 7; i++) {
        const p = s.piles['t' + i];
        t.equal(p.length, i + 5, 'column ' + (i + 1) + ' size');
        t.equal(p.filter((c) => !c.startsWith('#')).length, 5, 'five face up in column ' + (i + 1));
      }
      await t.shot('rules-05-yukon');
      await t.game('setState', { mode: 'yukon', piles: { t0: ['#2C', '8H', '3S', 'KD'], t1: ['9S'], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      t.equal((await t.game('act', 'move', 't0', 't1', 3)).ok, true, 'unordered group headed by 8H moves onto 9S');
      s = await t.state();
      t.equal(s.piles.t1, ['9S', '8H', '3S', 'KD'], 'group moved intact'); t.equal(s.piles.t0, ['2C'], 'exposed card flipped');
    },
  },
  {
    name: 'rules-06 freecell deal vectors 1 and 617',
    async run(t) {
      t.equal(await t.game('freecellDeal', 1), rowsToCols(FC1), 'deal 1 layout');
      t.equal(await t.game('freecellDeal', 617), rowsToCols(FC617), 'deal 617 layout');
      await t.game('newGame', { mode: 'freecell', deal: 617 });
      const s = await t.state();
      for (let i = 0; i < 8; i++) t.equal(s.piles['t' + i], rowsToCols(FC617)[i], 'in-game column ' + i);
      await t.shot('rules-06-freecell-617');
      await t.checkLayout();
    },
  },
  {
    name: 'rules-07 freecell supermove capacity',
    viewports: ['desktop'],
    async run(t) {
      const run6 = ['9C', '8D', '7S', '6H', '5C', '4D'];
      await t.game('setState', { mode: 'freecell', piles: { t0: ['KS', ...run6], t1: ['TH'], t2: ['QC'], t3: ['JD'], t4: ['2S'], t5: ['3S'], t6: ['4S'], t7: ['5S'], c0: [], c1: [], c2: [], c3: [] } });
      t.equal((await t.game('act', 'move', 't0', 't1', 6)).ok, false, '6 cards with 4 cells and 0 empty columns is refused');
      t.equal((await t.game('act', 'move', 't0', 't2', 5)).ok, false, 'wrong target refused');
      await t.game('setState', { mode: 'freecell', piles: { t0: ['KS', '9C', '8D', '7S', '6H', '5C'], t1: ['TH'], t2: ['QC'], t3: ['JD'], t4: ['2S'], t5: ['3S'], t6: ['4S'], t7: ['5S'], c0: [], c1: [], c2: [], c3: [] } });
      t.equal((await t.game('act', 'move', 't0', 't1', 5)).ok, true, '5 cards with 4 cells moves');
      await t.game('setState', { mode: 'freecell', piles: { t0: ['KS', '9C', '8D', '7S', '6H', '5C'], t1: ['8H'], t2: ['QC'], t3: ['TH'], t4: ['2S'], t5: ['3S'], t6: ['4S'], t7: ['5S'], c0: ['QH'], c1: ['QD'], c2: [], c3: [] } });
      t.equal((await t.game('act', 'move', 't0', 't3', 5)).ok, false, '5 cards with 2 cells refused');
      t.equal((await t.game('act', 'move', 't0', 't1', 3)).ok, true, '3 cards with 2 cells moves');
    },
  },
  {
    name: 'rules-08 spider deal and stock block',
    async run(t) {
      await t.game('newGame', { mode: 'spider', suits: 4, deal: 7 });
      let s = await t.state();
      for (let i = 0; i < 10; i++) t.equal(s.piles['t' + i].length, i < 4 ? 6 : 5, 'spider column ' + i);
      t.equal(s.stockCount, 50, '50 in stock');
      const suits = new Set(Object.values(s.piles).flat().map((c) => c.slice(-1)));
      t.equal(suits.size, 4, 'four suits');
      await t.shot('rules-08-spider4');
      await t.checkLayout();
      await t.game('setState', { mode: 'spider', opts: { suits: 1 }, piles: { stock: Array(10).fill('#5S'), t0: ['KS'], t1: [], t2: ['QS', 'QS'], t3: ['QS'], t4: ['QS'], t5: ['QS'], t6: ['QS'], t7: ['QS'], t8: ['QS'], t9: ['QS'] } });
      t.equal((await t.game('act', 'draw')).ok, false, 'deal refused with an empty column');
      t.equal((await t.game('act', 'move', 't2', 't1')).ok, true, 'any card fills the empty column');
      t.equal((await t.game('act', 'draw')).ok, true, 'deal allowed once columns are filled');
    },
  },
  {
    name: 'rules-08b spider allows stock deal with fewer than 10 tableau cards',
    viewports: ['desktop'],
    async run(t) {
      const doneRun = ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS', 'JS', 'QS', 'KS'];
      // Authentic 104-card Spider endgame: 7 runs home (91), 3 tableau cards (<10) across 10 columns, 10 cards in stock
      await t.game('setState', {
        mode: 'spider', opts: { suits: 1 },
        piles: {
          stock: ['#AS', '#2S', '#3S', '#4S', '#5S', '#6S', '#7S', '#8S', '#TS', '#QS'],
          f0: doneRun, f1: doneRun, f2: doneRun, f3: doneRun, f4: doneRun, f5: doneRun, f6: doneRun, f7: [],
          t0: ['KS'], t1: ['JS'], t2: ['9S'], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [],
        },
      });
      t.equal((await t.game('act', 'checkStuck')).verdict, 'live', '3-card Spider endgame with 10 in stock is not declared stuck');
      const h = await t.game('act', 'hint');
      t.equal([h.ok, !!h.stuck, !!h.stock], [true, false, true], 'hint recommends dealing the stock row rather than dead-ending');
      t.equal((await t.game('act', 'draw')).ok, true, 'stock deal succeeds with 3 tableau cards and 7 empty columns');
      const s = await t.state();
      t.equal(s.stockCount, 0, 'all 10 stock cards dealt');
      t.equal(s.piles.t0, ['KS', 'QS'], 't0 received top stock card face up');
      t.equal(s.piles.t1, ['JS', 'TS'], 't1 received second stock card face up');
      t.equal(s.piles.t2, ['9S', '8S'], 't2 received third stock card face up');
      for (let i = 3; i < 10; i++) t.equal(s.piles['t' + i].length, 1, 'empty column t' + i + ' received 1 card');
      // Exact boundary: 9 tableau cards (<10) with an empty column is allowed; 10 tableau cards (>=10) with an empty column is refused
      await t.game('setState', { mode: 'spider', opts: { suits: 1 }, piles: { stock: Array(10).fill('#5S'), t0: [], t1: ['5S'], t2: ['5S'], t3: ['5S'], t4: ['5S'], t5: ['5S'], t6: ['5S'], t7: ['5S'], t8: ['5S'], t9: ['5S'] } });
      t.equal((await t.game('act', 'draw')).ok, true, '9 tableau cards with 1 empty column allows stock deal');
      await t.game('setState', { mode: 'spider', opts: { suits: 1 }, piles: { stock: Array(10).fill('#5S'), t0: [], t1: ['5S', '5S'], t2: ['5S'], t3: ['5S'], t4: ['5S'], t5: ['5S'], t6: ['5S'], t7: ['5S'], t8: ['5S'], t9: ['5S'] } });
      t.equal((await t.game('act', 'draw')).ok, false, '10 tableau cards with 1 empty column still refuses stock deal');
    },
  },
  {
    name: 'rules-09 spider completes a run',
    async run(t) {
      const run = ['KH', 'QH', 'JH', 'TH', '9H', '8H', '7H', '6H', '5H', '4H', '3H', '2H'];
      await t.game('setState', { mode: 'spider', opts: { suits: 2 }, score: 500, piles: { stock: [], t0: ['#9S', ...run], t1: ['AH'], t2: ['5S'], t3: ['5S'], t4: ['6S'], t5: ['7S'], t6: ['8S'], t7: ['9S'], t8: ['TS'], t9: ['JS'] } });
      const r = await t.game('act', 'move', 't1', 't0');
      t.equal(r.ok, true, 'ace joins the run');
      const s = await t.state();
      t.equal(s.piles.f0.length, 13, 'run moved to foundation'); t.equal(s.piles.f0[12], 'KH', 'king on top');
      t.equal(s.piles.t0, ['9S'], 'card under run flipped'); t.equal(s.runs, 1, 'one run'); t.equal(s.score, 599, '+100 −1');
      await t.shot('rules-09-spider-run');
    },
  },
  {
    name: 'rules-10 spider suit sets',
    async run(t) {
      await t.game('newGame', { mode: 'spider', suits: 1, deal: 3 });
      let s = await t.state(); let all = Object.values(s.piles).flat();
      t.equal(all.length, 104, '104 cards'); t.equal(new Set(all.map((c) => c.slice(-1))).size, 1, 'one suit'); t.expect(all.every((c) => c.endsWith('S')), 'all spades');
      await t.shot('rules-10-spider1');
      await t.game('newGame', { mode: 'spider', suits: 2, deal: 3 });
      s = await t.state(); all = Object.values(s.piles).flat();
      t.equal([...new Set(all.map((c) => c.slice(-1)))].sort(), ['H', 'S'], 'spades and hearts');
    },
  },
  {
    name: 'rules-11 foundation legality',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { autoFoundation: 'off' });
      await t.game('setState', { mode: 'klondike', piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['2H'], t1: ['AH'], t2: ['3H'], t3: ['AS'], t4: ['2S'], t5: [], t6: [] } });
      t.equal((await t.game('act', 'move', 't0', 'f0')).ok, false, 'two cannot start a foundation');
      t.equal((await t.game('act', 'move', 't1', 'f0')).ok, true, 'ace starts a foundation');
      t.equal((await t.game('act', 'move', 't4', 'f0')).ok, false, 'wrong suit refused');
      t.equal((await t.game('act', 'move', 't2', 'f0')).ok, false, 'skipping a rank refused');
      t.equal((await t.game('act', 'move', 't0', 'f0')).ok, true, 'next rank same suit accepted');
    },
  },
  {
    name: 'rules-20 same deal number same layout, daily determinism',
    viewports: ['desktop'],
    async run(t) {
      for (const mode of ['klondike', 'spider', 'yukon', 'freecell']) {
        await t.game('newGame', { mode, deal: 555 }); const a = (await t.state()).piles;
        await t.game('newGame', { mode, deal: 556 }); const b = (await t.state()).piles;
        await t.game('newGame', { mode, deal: 555 }); const c = (await t.state()).piles;
        t.equal(c, a, mode + ': same deal number reproduces'); t.expect(JSON.stringify(a) !== JSON.stringify(b), mode + ': different deal differs');
      }
      await t.game('newGame', { mode: 'klondike', daily: '2026-10-28' }); const d1 = await t.state();
      await t.game('newGame', { mode: 'klondike', daily: '2026-10-28' }); const d2 = await t.state();
      await t.game('newGame', { mode: 'klondike', daily: '2026-10-29' }); const d3 = await t.state();
      t.equal(d1.deal, d2.deal, 'daily deal stable for a date'); t.expect(d1.deal !== d3.deal, 'daily deal changes by date');
      t.equal(d1.daily, '2026-10-28', 'daily flag');
    },
  },
];
