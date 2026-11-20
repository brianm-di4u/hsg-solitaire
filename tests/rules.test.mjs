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
  {
    name: 'rules-21 makeSolver collision-free B..u keys (3C/10C/AD..9D), Yukon 2s safety, and split/pullback verification (W6-S3-03, CD-WF6-03)',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { autoFoundation: 'off', motion: 'reduced', tips: false });
      // 1. Key uniqueness across all 52 card codes (specifically verifying 3C !== '#', 10C !== ':', AD..9D !== digits)
      const alphabet = await t.page.evaluate(() => {
        const seen = new Set(), bad = [];
        for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) {
          const x = (s << 4) | r, ch = String.fromCharCode(65 + (x >> 4) * 13 + (x & 15));
          seen.add(ch);
          if (/[0-9:#|,]/.test(ch)) bad.push([s, r, ch]);
        }
        return { unique: seen.size, bad };
      });
      t.equal([alphabet.unique, alphabet.bad.length], [52, 0], 'all 52 compact card symbols B..u are unique and disjoint from delimiters/digits');
      // 2. Real top-3C and previously false-dead Draw 1 deals now solve cleanly
      for (const deal of [75, 172, 203, 313, 316, 440, 505, 767, 821]) {
        const r = await t.game('solve', 'klondike', { draw: 1 }, deal, 4000);
        t.equal(r.result, 'won', 'Draw 1 deal #' + deal + ' solves won without 3C/# key collision (used ' + r.used + ')');
      }
      // 3. Yukon rank-2 safety: buried black Ace (AS under KS) must land on red 2H (emptying t1 for KS) rather than 2H eagerly settling
      const fullRun = (s, n = 13) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].slice(0, n).map((r) => r + s);
      await t.game('setState', {
        mode: 'yukon',
        piles: {
          f0: fullRun('C', 13), f1: fullRun('D', 13), f2: ['AH'], f3: [],
          t0: ['KH', '2H'],
          t1: ['AS', 'KS'],
          t2: ['QH', 'JH', 'TH', '9H', '8H', '7H', '6H', '5H', '4H', '3H'],
          t3: ['QS', 'JS', 'TS', '9S'],
          t4: ['8S', '7S'], t5: ['6S', '5S'], t6: ['4S', '3S', '2S'],
        },
      });
      const ykSolve = await t.game('solveState', 500);
      t.equal(ykSolve.result, 'won', 'Yukon 2H stays off foundation so [AS, KS] can land on 2H and win (used ' + ykSolve.used + ')');
      // Verify safe autoplay in Yukon does NOT auto-play 2H while opposite-color AS is still on tableau
      await t.game('setSettings', { autoFoundation: 'safe' });
      await t.game('act', 'move', 't1', 't0', 2); // moves [AS, KS] onto 2H, emptying t1
      t.equal((await t.state()).piles.t0, ['KH', '2H', 'AS', 'KS'], 'Yukon safe autoplay kept 2H on tableau so [AS, KS] landed cleanly');
      await t.game('setSettings', { autoFoundation: 'off' });

      // 4. Verification mode for lostKick(): partial-run split (splitting 7H off 8S onto 8C is the sole legal move, exposing 8S -> f3 and buried 6H -> f2)
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: {
          stock: [], waste: [],
          f0: fullRun('C', 6), f1: fullRun('D', 13), f2: fullRun('H', 5), f3: fullRun('S', 7),
          t0: ['#7C', '#6H', '8S', '7H'],
          t1: ['8C'],
          t2: ['#9S', '#9C', '#9H', '8H'],
          t3: ['#KS', '#QS', '#JS', 'TS'],
          t4: ['#KC', '#QC', '#JC', 'TC'],
          t5: ['#KH', '#QH', '#JH', 'TH'],
          t6: [],
        },
      });
      t.equal((await t.game('solveState', 4000)).result, 'dead', 'pruned default solver misses partial-run split');
      const splitRes = await t.game('solveState', 4000, { verify: true });
      t.equal(splitRes.result, 'won', 'verify mode allows partial-run split (7H off 8S onto 8C) and solves won');
      // Bounded foundation pullback: QD on f1 (12) pulls onto KS so JS moves off TS -> TS..KS win
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: {
          stock: [], waste: [],
          f0: fullRun('C', 13), f1: fullRun('D', 12), f2: fullRun('H', 12), f3: fullRun('S', 9),
          t0: ['TS', 'JS'], t1: ['KD'], t2: ['KH'], t3: ['KS'], t4: ['QS'], t5: [], t6: [],
        },
      });
      const pbRes = await t.game('solveState', 4000, { verify: true });
      t.equal(pbRes.result, 'won', 'verify mode allows bounded foundation pullback (QD onto KS) and solves won');
    },
  },
  {
    name: 'rules-22 hintSearch backtrack recovery on live Klondike & FreeCell detour boards + deferred assisted stamp (W6-P-N01)',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { autoFoundation: 'off', motion: 'reduced', tips: false });
      const fullRun = (s, n = 13) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].slice(0, n).map((r) => r + s);

      // 1. Klondike 1-move detour: moving 9D from t1 -> t0 makes t0 -> t1 a history state; Hint MUST return t0 -> t1 instead of 'nope'
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: {
          stock: [], waste: [],
          f0: fullRun('C', 9), f1: fullRun('D', 7), f2: fullRun('H', 7), f3: fullRun('S', 7),
          t0: ['8D', 'TC'], t1: ['8S', '9S', 'TS', '9D'], t2: [], t3: [], t4: [], t5: [], t6: [],
        },
      });
      t.equal((await t.game('act', 'move', 't1', 't0')).ok, true, 'Klondike detour t1 -> t0 legal');
      await t.game('cuesPlayed', true);
      const kh = await t.game('act', 'hint');
      const kCues = await t.game('cuesPlayed', true);
      const kToast = await t.page.locator('#toast').textContent();
      t.expect(kh.ok && kh.move && kh.move.from === 't0' && kh.move.to === 't1' && kh.move.backtrack === true, 'Klondike Hint returns concrete backtrack move t0 -> t1: ' + JSON.stringify(kh));
      t.equal((await t.state()).stuck, 'live', 'Klondike board stays live');
      t.expect(kCues.some((c) => c.name === 'hint') && !kCues.some((c) => c.name === 'nope'), 'Klondike backtrack hint plays hint chime, never nope');
      t.expect(/back to column 2/i.test(kToast) && !/Nothing useful/.test(kToast), 'Klondike toast explains moving back: ' + kToast);

      // 2. FreeCell 1-move detour (no empty columns or free cells, no other legal moves): identical live-board backtrack recovery
      await t.game('setState', {
        mode: 'freecell',
        piles: {
          c0: ['KC'], c1: ['KD'], c2: ['KH'], c3: ['KS'],
          f0: fullRun('C', 9), f1: fullRun('D', 7), f2: fullRun('H', 7), f3: fullRun('S', 7),
          t0: ['8D', 'TC'], t1: ['8S', '9S', 'TS', '9D'], t2: ['QC'], t3: ['QD'], t4: ['QH'], t5: ['QS'], t6: ['TH'], t7: ['TD'],
        },
      });
      t.equal((await t.game('act', 'move', 't1', 't0')).ok, true, 'FreeCell detour t1 -> t0 legal');
      await t.game('cuesPlayed', true);
      const fh = await t.game('act', 'hint');
      const fCues = await t.game('cuesPlayed', true);
      t.expect(fh.ok && fh.move && fh.move.from === 't0' && fh.move.to === 't1' && fh.move.backtrack === true, 'FreeCell Hint returns concrete backtrack move t0 -> t1: ' + JSON.stringify(fh));
      t.equal((await t.state()).stuck, 'live', 'FreeCell board stays live');
      t.expect(fCues.some((c) => c.name === 'hint') && !fCues.some((c) => c.name === 'nope'), 'FreeCell backtrack hint plays hint chime, never nope');

      // 3. Dead-end Hint never stamps S.usedHint / S.assisted
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: [], t0: ['5C'], t1: ['5S'], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      const dh = await t.game('act', 'hint');
      t.equal(dh.stuck, true, 'dead board reports stuck');
      t.equal(await t.page.locator('#assistTag').isHidden(), true, 'dead-end Hint does not stamp assisted tag');
    },
  },
  {
    name: 'rules-23 Draw 3 stockPlays() visited-Set cycle guard & FreeCell buried-low-rank potential() (W6-S3-06)',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { autoFoundation: 'off', motion: 'reduced', tips: false });
      // 1. Draw 3 stock=18, waste=5 (n=23, mod-3 phase shift after playing 1 card from waste): stockPlays() MUST terminate on visited stock size without duplicates
      await t.game('newGame', { mode: 'klondike', draw: 3, deal: 92 });
      // Draw twice (stock=18, waste=6) then remove top waste card onto a synthetic 23-card stock/waste cycle
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 3 },
        piles: {
          stock: ['#2C', '#3C', '#4C', '#5C', '#6C', '#7C', '#8C', '#9C', '#TC', '#JC', '#QC', '#KC', '#2D', '#3D', '#4D', '#5D', '#6D', '#7D'],
          waste: ['8D', '9D', 'TD', 'JD', 'QD'],
          f0: [], f1: [], f2: [], f3: [],
          t0: ['KH'], t1: ['KS'], t2: ['8H'], t3: ['9H'], t4: ['TH'], t5: ['JH'], t6: ['QH'],
        },
      });
      const plays = await t.game('stockPlays');
      const maxDraws = Math.max(0, ...plays.map((p) => p.draws));
      const drawKeys = plays.map((p) => p.draws + ':' + p.to);
      t.expect(plays.length > 0 && plays.length <= 16, 'Draw 3 stockPlays terminates cleanly without 4.2x duplicate blowup (count=' + plays.length + ', maxDraws=' + maxDraws + ')');
      t.expect(maxDraws <= 15, 'maxDraws stays within single post-recycle pass (' + maxDraws + ' <= 15, never 49)');
      t.equal(new Set(drawKeys).size, drawKeys.length, 'every emitted stockPlay is unique');

      // 2. FreeCell potential() buried-low-rank evaluation: with all 4 free cells occupied and no empty-column move, Hint spots moving 8D onto 9C to uncover buried AS
      await t.game('setState', {
        mode: 'freecell',
        piles: {
          c0: ['KC'], c1: ['KD'], c2: ['KH'], c3: ['KS'],
          f0: [], f1: [], f2: [], f3: [],
          t0: ['AS', '8D'], t1: ['9C'], t2: ['QC', '5H'], t3: ['QD', '6S'], t4: ['QH', '7C'], t5: ['QS', '7D'], t6: ['JC', '4H'], t7: ['JD', '4S'],
        },
      });
      const fh = await t.game('act', 'hint');
      t.expect(fh.ok && fh.move && fh.move.from === 't0' && fh.move.to === 't1', 'FreeCell buried-low-rank potential() hints uncovering buried AS (8D -> 9C): ' + JSON.stringify(fh));
    },
  },
  {
    name: 'rules-24 Spider deterministic Finish (104-card win ceremony), stuck-Undo suppression & streak confirm, and tabletop economy cues (W6-S3-06, CD-WF5-07)',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { autoFoundation: 'off', motion: 'reduced', tips: false });
      const doneRun = ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS', 'JS', 'QS', 'KS'];
      // 1. Spider deterministic Finish: 6 runs home (78 cards), 2 monotonic same-suit runs split across 4 columns (26 cards), stock empty, 0 face-down
      await t.game('setState', {
        mode: 'spider', opts: { suits: 1 }, score: 500, moves: 10,
        piles: {
          stock: [],
          f0: doneRun, f1: doneRun, f2: doneRun, f3: doneRun, f4: doneRun, f5: doneRun, f6: [], f7: [],
          t0: ['KS', 'QS', 'JS', 'TS', '9S', '8S'],
          t1: ['7S', '6S', '5S', '4S', '3S', '2S', 'AS'],
          t2: ['KS', 'QS', 'JS', 'TS'],
          t3: ['9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S', 'AS'],
          t4: [], t5: [], t6: [], t7: [], t8: [], t9: [],
        },
      });
      let st = await t.state();
      t.equal(st.canAutoComplete, true, 'Spider Finish enabled on verifiable monotonic same-suit board');
      t.equal(await t.page.isDisabled('#bAuto'), false, 'Finish button active for Spider');
      const ac = await t.game('act', 'autoComplete');
      t.equal(ac.ok, true, 'Spider Finish executes cleanly');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 15000 });
      st = await t.state();
      // 2 consolidation moves (-2 pts, +2 moves) + 2 completed runs (+200 pts) = 698 score, 12 moves
      t.equal([st.won, st.runs, st.moves, st.score], [true, 2, 12, 698], 'Spider Finish wins with exact per-move S.moves++ and -1/+100 score accounting');

      // Spider Finish stays disabled if stock has cards or a card is face-down or out-of-order
      await t.game('setState', {
        mode: 'spider', opts: { suits: 1 },
        piles: {
          stock: ['#AS'],
          f0: doneRun, f1: doneRun, f2: doneRun, f3: doneRun, f4: doneRun, f5: doneRun, f6: doneRun, f7: [],
          t0: ['KS', 'QS', 'JS', 'TS', '9S', '8S'], t1: ['7S', '6S', '5S', '4S', '3S', '2S'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [],
        },
      });
      t.equal((await t.state()).canAutoComplete, false, 'Spider Finish disabled while stock non-empty');

      // 2. Stuck-Undo loop suppression & streak warning on stuck Restart/New
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['#2D', '6S'], t1: ['#3D', '6C', '5H'], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      await t.game('act', 'move', 't1', 't0', 1); // shuttle into dead end; previous state was ALSO a dead end!
      await t.page.waitForFunction(() => window.__game.getState().modal === 'stuck', null, { timeout: 4000 });
      await t.page.click('#sheet [data-a="undo"]');
      t.equal((await t.state()).modal, null, 'Undo from stuck closes modal');
      await t.page.waitForTimeout(900);
      t.equal((await t.state()).modal, null, 'stuck modal does NOT auto-repop 500 ms after stuck-Undo');
      // Set an active win streak of 3, open stuck via Hint, click New deal -> Confirm must warn about streak and Cancel returns to stuck
      await t.page.evaluate(() => { const k = 'spa-solitaire:v1:stats', s = JSON.parse(localStorage.getItem(k) || '{}'); s.klondike1 = Object.assign(s.klondike1 || {}, { played: 4, won: 3, streak: 3, bestStreak: 3 }); localStorage.setItem(k, JSON.stringify(s)); });
      await t.game('act', 'hint');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'stuck', null, { timeout: 4000 });
      await t.page.click('#sheet [data-a="new"]');
      t.equal((await t.state()).modal, 'confirm', 'New deal from stuck warns streak-holder before resetting streak');
      t.expect((await t.page.locator('#sheet').textContent()).includes('streak of 3 will reset'), 'Confirm text names active streak');
      await t.page.click('#sheet [data-close]:not(.x)');
      t.equal((await t.state()).modal, 'stuck', 'Cancel returns cleanly to stuck dialog without wiping streak');

      // 3. Tabletop economy & progress cues (CD-WF5-07): #subRow #homeCount, #goal .rev secondary reveal track, #status b === 3, FreeCell maxMove
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 1234 });
      const hud0 = await t.page.evaluate(() => ({
        statusB: document.querySelectorAll('#status b').length,
        homeCount: document.getElementById('homeCount').textContent,
        goalPrimary: document.getElementById('goal').firstElementChild.style.width,
        goalRev: document.getElementById('goal').children[1].style.width,
      }));
      t.equal([hud0.statusB, hud0.homeCount, hud0.goalPrimary, hud0.goalRev], [3, '0/52', '0%', '0%'], 'Klondike starts with 3 #status cells, 0/52 in #subRow, 0% primary & 0% reveal track');
      // Reveal 1 face-down card on a Spider board -> #goal > i stays 0% while #goal .rev advances > 0%
      await t.game('setState', {
        mode: 'spider', opts: { suits: 1 },
        piles: { stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [], t0: ['#KS', '8S'], t1: ['9S'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [] },
      });
      await t.game('act', 'move', 't0', 't1');
      const spHud = await t.page.evaluate(() => ({
        homeCount: document.getElementById('homeCount').textContent,
        goalPrimary: document.getElementById('goal').firstElementChild.style.width,
        goalRev: parseFloat(document.getElementById('goal').children[1].style.width),
      }));
      t.equal([spHud.homeCount, spHud.goalPrimary], ['0/8', '0%'], 'Spider #homeCount shows 0/8 and #goal > i stays 0%');
      t.expect(spHud.goalRev > 0, 'Spider secondary reveal track advances when face-down card flips (' + spHud.goalRev + '%)');

      // FreeCell live maxMove updates dynamically
      await t.game('newGame', { mode: 'freecell', deal: 617 });
      t.equal((await t.state()).maxMove, 5, 'FreeCell starts at Max move: 5 (4 free cells, 0 empty columns)');
      await t.game('act', 'move', 't0', 'c0');
      t.equal((await t.state()).maxMove, 4, 'FreeCell Max move updates to 4 when a free cell is used');
    },
  },
];
