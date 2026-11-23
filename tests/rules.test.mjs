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

      // 3. Tabletop economy & progress cues (CD-WF5-07, GPU scaleX() per W6-S5-07): #subRow #homeCount, #goal .rev secondary reveal track, #status b === 3, FreeCell maxMove
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 1234 });
      const goalFrac = () => t.page.evaluate(() => {
        const g = document.getElementById('goal'), gw = g.getBoundingClientRect().width || 1;
        return {
          statusB: document.querySelectorAll('#status b').length,
          homeCount: document.getElementById('homeCount').textContent,
          goalPrimary: +(g.firstElementChild.getBoundingClientRect().width / gw).toFixed(4),
          goalRev: +(g.children[1].getBoundingClientRect().width / gw).toFixed(4),
        };
      });
      const hud0 = await goalFrac();
      t.equal([hud0.statusB, hud0.homeCount, hud0.goalPrimary, hud0.goalRev], [3, '0/52', 0, 0], 'Klondike starts with 3 #status cells, 0/52 in #subRow, 0 primary & 0 reveal track');
      // Reveal 1 face-down card on a Spider board -> #goal > i stays 0 while #goal .rev advances > 0
      await t.game('setState', {
        mode: 'spider', opts: { suits: 1 },
        piles: { stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [], t0: ['#KS', '8S'], t1: ['9S'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [] },
      });
      await t.game('act', 'move', 't0', 't1');
      const spHud = await goalFrac();
      t.equal([spHud.homeCount, spHud.goalPrimary], ['0/8', 0], 'Spider #homeCount shows 0/8 and #goal > i stays 0');
      t.expect(spHud.goalRev > 0, 'Spider secondary reveal track advances when face-down card flips (' + Math.round(spHud.goalRev * 100) + '%)');

      // FreeCell live maxMove updates dynamically
      await t.game('newGame', { mode: 'freecell', deal: 617 });
      t.equal((await t.state()).maxMove, 5, 'FreeCell starts at Max move: 5 (4 free cells, 0 empty columns)');
      await t.game('act', 'move', 't0', 'c0');
      t.equal((await t.state()).maxMove, 4, 'FreeCell Max move updates to 4 when a free cell is used');
    },
  },
  {
    name: 'rules-25 controller exploits: found->found Ace farming, F-key stock leak, autoplay boomerang/Yukon 2s, bestDestination mis-routes, & async Cancel race (W6-S3-05, CD-WF1-06)',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { autoFoundation: 'off', motion: 'reduced', tips: false, scoring: 'standard' });
      // 1. found -> found Ace score farming rejected across Klondike, FreeCell, and Yukon
      for (const mode of ['klondike', 'freecell', 'yukon']) {
        const piles = mode === 'freecell'
          ? { c0: [], c1: [], c2: [], c3: [], f0: ['AS'], f1: [], f2: [], f3: [], t0: ['KH'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [] }
          : { stock: [], waste: [], f0: ['AS'], f1: [], f2: [], f3: [], t0: ['KH'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };
        await t.game('setState', { mode, score: 10, piles });
        const r = await t.game('act', 'move', 'f0', 'f1');
        const st = await t.state();
        t.equal([r.ok, st.score, st.moves, st.piles.f0, st.piles.f1], [false, 10, 0, ['AS'], []], mode + ': found->found Ace transfer rejected with 0 pts');
      }

      // 2. Keyboard F on face-down stock / foundation / face-down tableau card never leaks hidden card identity
      const probeF = async (stockTop) => {
        await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [stockTop], waste: [], f0: ['AS'], f1: [], f2: [], f3: [], t0: ['#AH'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
        await t.game('cuesPlayed', true);
        // Move keyboard cursor onto the stock pile
        await t.game('act', 'key', '1');
        await t.game('act', 'key', 'ArrowUp');
        for (let step = 0; step < 8 && (await t.state()).cursor.pile !== 'stock'; step++) await t.game('act', 'key', 'ArrowRight');
        const curBefore = (await t.state()).cursor.pile;
        await t.game('act', 'key', 'f');
        const cues = (await t.game('cuesPlayed', true)).map((c) => c.name);
        const sr = await t.page.evaluate(() => document.getElementById('sr').textContent);
        return { curBefore, cues, sr, stock: (await t.state()).piles.stock };
      };
      const aceStock = await probeF('#AH'), nonAceStock = await probeF('#9C');
      t.equal(aceStock.curBefore, 'stock', 'cursor reached stock');
      t.equal(aceStock.cues, nonAceStock.cues, 'F on hidden Ace stock produces identical cues to non-Ace stock (zero info leak)');
      t.expect(aceStock.cues.includes('nope') && aceStock.sr === 'No foundation move', 'F on hidden stock always refuses with nope + No foundation move');
      t.equal(aceStock.stock, ['#AH'], 'hidden Ace stays in stock');
      // F on foundation f0 (with Ace and empty f1) and on face-down t0 also refuse cleanly
      await t.game('act', 'key', '1');
      await t.game('cuesPlayed', true);
      await t.game('act', 'key', 'f');
      t.expect((await t.game('cuesPlayed', true)).some((c) => c.name === 'nope'), 'F on face-down tableau card refuses');

      // 3. Autoplay boomerang prevention & per-deal pullback hold Set + Yukon 2s safety
      await t.game('setSettings', { autoFoundation: 'safe' });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 }, score: 100,
        piles: { stock: [], waste: [], f0: ['AC', '2C'], f1: [], f2: [], f3: [], t0: ['3D'], t1: ['9H'], t2: ['TS'], t3: ['AD'], t4: [], t5: [], t6: [] },
      });
      t.equal((await t.game('act', 'move', 'f0', 't0')).ok, true, 'pulling 2C down from f0 to t0 is legal');
      let st = await t.state();
      t.equal([st.piles.t0, st.piles.f0, st.score], [['3D', '2C'], ['AC'], 85], '2C stays on t0 (no boomerang back to f0, -15 once)');
      // Moving another card elsewhere still respects pullbackHold on 2C while allowing AD to autoplay normally
      t.equal((await t.game('act', 'move', 't1', 't2')).ok, true, 'unrelated move t1 -> t2');
      st = await t.state();
      t.equal([st.piles.t0, st.piles.f0], [['3D', '2C'], ['AC']], '2C remains held on t0 during subsequent autoplay');
      t.expect(st.piles.f1.includes('AD') || st.piles.f2.includes('AD') || st.piles.f3.includes('AD'), 'unheld AD still autoplays home');
      // Manually sending 2C back home clears the pullback hold cleanly
      t.equal((await t.game('act', 'move', 't0', 'f0')).ok, true, 'manual return 2C -> f0 succeeds');
      t.equal((await t.state()).piles.f0, ['AC', '2C'], '2C returned home');
      // Undo of a pullback restores clean state without stranding hold
      await t.game('act', 'move', 'f0', 't0');
      await t.game('act', 'undo');
      t.equal((await t.state()).piles.f0, ['AC', '2C'], 'Undo after pullback restores 2C to f0');

      // Yukon 2s safety: safe autoplay holds 2H while black Ace AS is missing, then auto-sends 2H once both AC & AS are home
      await t.game('setState', {
        mode: 'yukon',
        piles: { f0: ['AC'], f1: [], f2: ['AH'], f3: [], t0: ['2H'], t1: ['AS'], t2: ['8H'], t3: ['9S'], t4: [], t5: [], t6: [] },
      });
      await t.game('act', 'move', 't2', 't3');
      t.equal((await t.state()).piles.f2, ['AH', '2H'], 'once AS autoplays to f1 (both opposite-color Aces home), Yukon 2H safely autoplays to f2');
      await t.game('setSettings', { autoFoundation: 'off' });

      // 4. bestDestination() & tapAt(): foundation-first (CD-WF1-06), Spider same-suit bond protection & run-length tie-break, FreeCell free-cell preference, ordered-run fallback excluding Yukon
      // (a) Foundation-first preserved under autoFoundation: 'safe'
      await t.game('setSettings', { autoFoundation: 'safe' });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: [], waste: ['4H'], f0: ['AH', '2H', '3H'], f1: [], f2: [], f3: [], t0: ['5S'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      await t.game('act', 'tap', 'waste', 0);
      t.equal((await t.state()).piles.f0, ['AH', '2H', '3H', '4H'], 'CD-WF1-06: tapping 4H sends it to foundation ahead of tableau 5S even under Safe autoplay');
      await t.game('setSettings', { autoFoundation: 'off' });

      // (b) Spider: tapping bonded 6S refuses off-suit 7H; prefers longest same-suit target run; upward run fallback moves whole ['7S','6S'] onto 8S
      await t.game('setState', {
        mode: 'spider', opts: { suits: 2 },
        piles: { stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [], t0: ['9H', '7S', '6S'], t1: ['7H'], t2: ['2H'], t3: ['2H'], t4: ['2H'], t5: ['2H'], t6: ['2H'], t7: ['2H'], t8: ['2H'], t9: ['2H'] },
      });
      t.equal((await t.game('act', 'tap', 't0', 2)).ok, false, 'Spider tap refuses ripping bonded 6S off 7S onto off-suit 7H');
      t.equal((await t.state()).piles.t0, ['9H', '7S', '6S'], 'Spider same-suit bond stayed intact');
      // Also verify tapping bonded 6S when t2 is empty moves the WHOLE intact [7S, 6S] run rather than ripping 6S off 7S!
      await t.game('setState', {
        mode: 'spider', opts: { suits: 2 },
        piles: { stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [], t0: ['9H', '7S', '6S'], t1: ['7H'], t2: [], t3: ['2H'], t4: ['2H'], t5: ['2H'], t6: ['2H'], t7: ['2H'], t8: ['2H'], t9: ['2H'] },
      });
      t.equal((await t.game('act', 'tap', 't0', 2)).ok, true, 'Spider tap with empty column moves intact bonded run via upward fallback');
      t.equal([(await t.state()).piles.t0, (await t.state()).piles.t2], [['9H'], ['7S', '6S']], 'intact [7S, 6S] moved together (6S was NOT ripped off 7S)');
      // Same-suit tie-breaking by contiguous target run length (unbonded 6S picks 8S-7S over bare 7S)
      await t.game('setState', {
        mode: 'spider', opts: { suits: 2 },
        piles: { stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [], t0: ['9H', '6S'], t1: ['7S'], t2: ['9S', '8S', '7S'], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [] },
      });
      t.equal((await t.game('act', 'tap', 't0', 1)).ok, true, 'unbonded 6S taps to best same-suit column');
      t.equal((await t.state()).piles.t2, ['9S', '8S', '7S', '6S'], 'Spider tie-breaker picks longer contiguous same-suit target run (t2 over t1)');
      // Upward run fallback in Spider: tapping bottom 6S of ['#KH','7S','6S'] moves entire ['7S','6S'] onto 8S
      await t.game('setState', {
        mode: 'spider', opts: { suits: 2 },
        piles: { stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [], t0: ['#KH', '7S', '6S'], t1: ['7H'], t2: ['8S'], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [] },
      });
      t.equal((await t.game('act', 'tap', 't0', 2)).ok, true, 'tapping 6S falls back upward to move bonded run [7S, 6S]');
      t.equal([(await t.state()).piles.t0, (await t.state()).piles.t2], [['KH'], ['8S', '7S', '6S']], 'whole run moved onto 8S and flipped #KH');

      // (c) FreeCell: single non-King prefers open free cell ahead of empty column; single King prefers empty column; cell card does not bounce to another cell
      await t.game('setState', {
        mode: 'freecell',
        piles: { c0: [], c1: [], c2: [], c3: [], f0: [], f1: [], f2: [], f3: [], t0: ['9C', '5H'], t1: ['8C', 'KS'], t2: [], t3: ['2C'], t4: ['2D'], t5: ['2H'], t6: ['2S'], t7: ['3C'] },
      });
      await t.game('act', 'tap', 't0', 1); // tap single non-King 5H
      st = await t.state();
      t.equal([st.piles.c0, st.piles.t2, st.maxMove], [['5H'], [], 8], 'FreeCell single non-King prefers open free cell c0 ahead of empty column t2 (preserving 2^empty maxMove=8)');
      await t.game('act', 'tap', 't1', 1); // tap single King KS
      st = await t.state();
      t.equal(st.piles.t2, ['KS'], 'FreeCell single King prefers empty column t2 ahead of free cell');
      // Card in c0 with no tableau build and no empty column refuses instead of bouncing c0 -> c1
      t.equal((await t.game('act', 'tap', 'c0', 0)).ok, false, 'FreeCell tap on c0 does not bounce pointlessly to c1');

      // (d) Klondike ordered-run fallback vs Yukon lift==='any' exclusion
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['#2C', '8H', '7S'], t1: ['9C'], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      t.equal((await t.game('act', 'tap', 't0', 2)).ok, true, 'Klondike tapping 7S falls back upward to move [8H, 7S] onto 9C');
      t.equal((await t.state()).piles.t1, ['9C', '8H', '7S'], 'ordered run moved cleanly');
      await t.game('setState', {
        mode: 'yukon',
        piles: { f0: [], f1: [], f2: [], f3: [], t0: ['8H', '3S', 'QD'], t1: ['9S'], t2: ['2C'], t3: ['2D'], t4: ['2H'], t5: ['2S'], t6: ['3C'] },
      });
      t.equal((await t.game('act', 'tap', 't0', 2)).ok, false, 'Yukon (lift === any) strictly excludes upward run fallback when tapping QD');
      t.equal((await t.state()).piles.t0, ['8H', '3S', 'QD'], 'Yukon stack untouched');

      // 5. Async dealPending Cancel Race: cancelling Confirm while a >45 ms search is pending aborts dealPending and preserves live board & streak
      await t.game('setSettings', { dealFairness: 'hard' });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 1234 });
      await t.game('act', 'draw'); // started = true, moves = 1
      await t.page.evaluate(() => {
        const k = 'spa-solitaire:v1:stats', s = JSON.parse(localStorage.getItem(k) || '{}');
        s.klondike1 = Object.assign(s.klondike1 || {}, { played: 5, won: 4, streak: 4, bestStreak: 4 });
        localStorage.setItem(k, JSON.stringify(s));
        // Force slice(45) to yield immediately so newGame enters the async dealPending branch deterministically
        const origNow = performance.now.bind(performance);
        let bumps = 0;
        window.__origNow = origNow;
        performance.now = () => origNow() + (++bumps) * 60;
      });
      await t.page.click('#bNew');
      t.equal((await t.state()).modal, 'confirm', 'Confirm modal opened over live deal');
      await t.page.click('#sheet [data-a="yes"]');
      const midSearch = await t.page.evaluate(() => ({
        dealingOn: document.getElementById('dealing').classList.contains('on'),
        yesDisabled: !!document.querySelector('#sheet [data-a="yes"]')?.disabled,
      }));
      t.equal([midSearch.dealingOn, midSearch.yesDisabled], [true, true], 'active async search shows #dealing and disables confirm button');
      // Cancel the modal while dealPending is active -> must abort search immediately
      await t.page.click('#sheet [data-close]:not(.x)');
      await t.page.evaluate(() => { if (window.__origNow) performance.now = window.__origNow; });
      await t.page.waitForTimeout(300);
      const afterCancel = await t.page.evaluate(() => ({
        st: window.__game.getState(),
        stats: window.__game.stats().klondike1,
        dealingOn: document.getElementById('dealing').classList.contains('on'),
      }));
      t.equal([afterCancel.st.deal, afterCancel.st.moves, afterCancel.stats.streak, afterCancel.dealingOn], [1234, 1, 4, false], 'cancelling modal aborted dealPending without wiping live board or win streak');
    },
  },
  {
    name: 'rules-26 W1-S3-03 FreeCell 2-bit solver grade table grades 100% of classic deals 1..32000, matches 180 anchors, and credits gradeWins/unlocks',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { dealFairness: 'winnable', motion: 'reduced', tips: false, sound: false });
      const audit = await t.page.evaluate(() => {
        const g = window.__game;
        if (typeof g.gradeFreecellDeal !== 'function') return { missing: true };
        const pools = g.seedPools().freecell;
        const counts = { '': 0, easy: 0, medium: 0, hard: 0 };
        let ungraded = 0;
        for (let d = 1; d <= 32000; d++) {
          const gr = g.gradeFreecellDeal(d);
          if (d === 11982) { if (gr !== '') return { bad11982: gr }; }
          else if (!['easy', 'medium', 'hard'].includes(gr)) ungraded++;
          counts[gr] = (counts[gr] || 0) + 1;
        }
        let anchorHits = 0, anchorTotal = 0;
        for (const gr of ['easy', 'medium', 'hard']) {
          for (const d of pools[gr]) {
            anchorTotal++;
            if (g.gradeFreecellDeal(d) === gr) anchorHits++;
          }
        }
        // Pick first non-anchor deal > 500 of each grade
        const sample = {};
        for (const gr of ['easy', 'medium', 'hard']) {
          for (let d = 501; d <= 32000; d++) {
            if (d !== 11982 && g.gradeFreecellDeal(d) === gr) { sample[gr] = d; break; }
          }
        }
        return {
          missing: false,
          counts,
          ungraded,
          anchorHits,
          anchorTotal,
          d11982: g.gradeFreecellDeal(11982),
          oobLow: g.gradeFreecellDeal(0),
          oobHigh: g.gradeFreecellDeal(32001),
          sample,
        };
      });
      t.equal(audit.missing, false, 'window.__game.gradeFreecellDeal() is exposed');
      t.equal([audit.ungraded, audit.d11982, audit.oobLow, audit.oobHigh], [0, '', '', ''], '0 ungraded solvable deals in 1..32000, #11982 and OOB return empty');
      t.equal([audit.anchorHits, audit.anchorTotal], [180, 180], '100% concordance across all 180 FC_GRADE_MAP anchors');
      for (const gr of ['easy', 'medium', 'hard']) {
        const pct = audit.counts[gr] / 31999;
        t.expect(pct >= 0.31 && pct <= 0.36, 'FreeCell ' + gr + ' tertile balanced (' + audit.counts[gr] + ' = ' + (pct * 100).toFixed(2) + '%)');
      }

      // Non-anchor Winnable (Any) FreeCell deals carry verified grade in S.grade & #modeSub (never generic 'winnable')
      for (const gr of ['easy', 'medium', 'hard']) {
        const d = audit.sample[gr];
        await t.seed(d);
        await t.game('newGame', { mode: 'freecell' });
        const st = await t.state();
        const sub = await t.page.locator('#modeSub').textContent();
        t.equal([st.deal, st.winnable, st.grade], [d, true, gr], 'Winnable (Any) non-anchor FreeCell #' + d + ' graded ' + gr);
        t.expect(sub.includes(' · ' + gr) && !sub.includes('· winnable'), '#modeSub shows verified grade (' + sub + ')');
      }

      // FreeCell Daily deals across 10 consecutive dates all carry verified grades
      const dailyGrades = await t.page.evaluate(() => {
        const out = [];
        for (let i = 1; i <= 10; i++) {
          const dt = '2026-06-' + String(i).padStart(2, '0');
          window.__game.newGame({ mode: 'freecell', daily: dt });
          const st = window.__game.getState();
          out.push({ dt, deal: st.deal, grade: st.grade, sub: document.getElementById('modeSub').textContent });
        }
        return out;
      });
      t.expect(dailyGrades.every((x) => ['easy', 'medium', 'hard'].includes(x.grade) && x.sub.includes(' · ' + x.grade)), 'all 10 FreeCell Daily deals carry verified grades');

      // Winning a non-anchor Hard FreeCell deal credits meta.gradeWins.hard and unlocks b:lake + b:silks fast-tracks
      const hardDeal = audit.sample.hard;
      await t.seed(hardDeal);
      await t.game('newGame', { mode: 'freecell' });
      const preWin = await t.state();
      const run = (s, n = 13) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].slice(0, n).map((r) => r + s);
      await t.game('setState', {
        mode: 'freecell', deal: hardDeal, grade: preWin.grade,
        piles: { c0: [], c1: [], c2: [], c3: [], f0: run('C'), f1: run('D'), f2: run('H'), f3: run('S', 12), t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [] },
      });
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      const m = await t.game('meta');
      t.equal(m.gradeWins.hard, 1, 'winning non-anchor Hard FreeCell deal increments meta.gradeWins.hard');
      t.expect(m.unlock.ids.includes('b:lake') && m.unlock.ids.includes('b:silks'), 'Hard FreeCell win unlocks b:lake and b:silks mastery fast-tracks');
    },
  },
  {
    name: 'rules-27 W1-S3-01 unseen-first pickPoolDeal() probing (step 17), graduated exhaustion, Spider 4 wrap toast, and randomFreecellDeal() avoidance',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { dealFairness: 'easy', motion: 'reduced', tips: false, sound: false });

      // 1. FreeCell Easy: 65 consecutive New Deals (recording each in seenDeals via 1 move or meta) -> 0 S.replay collisions;
      // first 60 exhaust SEED_POOLS.freecell.easy, deals 61..65 spill over into unseen classic deals graded 'easy'
      const fcRes = await t.page.evaluate(() => {
        const g = window.__game;
        const poolSet = new Set(g.seedPools().freecell.easy);
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const todayFc = g.dailyDealFor('freecell', {}, today);
        const deals = [], replays = [], badGrades = [];
        let spilled = 0, hitToday = 0;
        for (let i = 0; i < 65; i++) {
          g.seed(12345); // identical seed every time to prove step-17 probing + spillover never collide
          g.newGame({ mode: 'freecell' });
          const st = g.getState();
          deals.push(st.deal);
          if (st.replay) replays.push(st.deal);
          if (!st.winnable || st.grade !== 'easy' || g.gradeFreecellDeal(st.deal) !== 'easy' || st.deal === 11982) badGrades.push(st);
          if (st.deal === todayFc) hitToday++;
          if (!poolSet.has(st.deal)) spilled++;
          // Make a legal move so startClock() records freecell:<deal> in meta.seenDeals
          const mv = g.legalMoves()[0];
          if (mv) g.act('move', mv.from, mv.to, mv.count);
        }
        return { total: deals.length, unique: new Set(deals).size, replays, badGrades, spilled, hitToday };
      });
      t.equal([fcRes.total, fcRes.unique, fcRes.replays.length, fcRes.badGrades.length, fcRes.hitToday], [65, 65, 0, 0, 0], '65 consecutive FreeCell Easy New Deals produce 65 unique fresh easy deals with 0 replays');
      t.expect(fcRes.spilled >= 5, 'FreeCell Easy spills past 60-deal bucket into unseen graded classic deals (spilled=' + fcRes.spilled + ')');

      // 2. Current S.deal avoidance (without making any move, same seed skips current deal)
      await t.page.evaluate(() => { localStorage.removeItem('spa-solitaire:v1:meta'); });
      await t.reload();
      await t.game('setSettings', { dealFairness: 'easy', motion: 'reduced', tips: false, sound: false });
      await t.seed(77); await t.game('newGame', { mode: 'spider', suits: 4 });
      const s4a = await t.state();
      await t.seed(77); await t.game('newGame', { mode: 'spider', suits: 4 });
      const s4b = await t.state();
      t.expect(s4a.deal !== s4b.deal && !s4b.replay, 're-dealing Spider 4-suit without moving avoids current S.deal (' + s4a.deal + ' -> ' + s4b.deal + ')');

      // 3. Spider 2-suit Easy: 121/122 seen picks the exact last unseen deal; 122/122 seen spills into live WIN_SEARCH.spider2 on unseen seed
      const s2Res = await t.page.evaluate(async () => {
        const g = window.__game;
        const arr = g.seedPools().spider2.easy;
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const todayS2 = g.dailyDealFor('spider', { suits: 2 }, today);
        const lastFresh = arr.find((d) => d !== todayS2);
        const seen121 = arr.filter((d) => d !== lastFresh).map((d) => 'spider2:' + d);
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify({ lastMode: 'spider', lastOpts: { draw: 1, suits: 2 }, totalWins: 0, daily: {}, seenDeals: seen121, wonDeals: [] }));
        return { lastFresh, poolSize: arr.length, todayS2 };
      });
      await t.reload();
      await t.game('setSettings', { dealFairness: 'easy', motion: 'reduced', tips: false, sound: false });
      await t.seed(42);
      await t.game('newGame', { mode: 'spider', suits: 2 });
      let st = await t.state();
      t.equal([st.deal, st.replay, st.grade], [s2Res.lastFresh, false, 'easy'], 'Spider 2-suit Easy with 121/122 seen finds the 1 remaining fresh pool deal');

      // Now mark ALL 122 Spider 2-suit Easy deals seen -> spills to live WIN_SEARCH.spider2 on unseen seed
      await t.page.evaluate(() => {
        const arr = window.__game.seedPools().spider2.easy;
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify({ lastMode: 'spider', lastOpts: { draw: 1, suits: 2 }, totalWins: 0, daily: {}, seenDeals: arr.map((d) => 'spider2:' + d), wonDeals: [] }));
      });
      await t.reload();
      await t.game('setSettings', { dealFairness: 'easy', motion: 'reduced', tips: false, sound: false });
      await t.seed(5001);
      await t.page.evaluate(() => window.__game.newGame({ mode: 'spider', suits: 2 }));
      await t.page.waitForFunction(() => window.__game.getState().scene === 'game', null, { timeout: 25000 });
      st = await t.state();
      const inS2Easy = await t.page.evaluate((d) => window.__game.seedPools().spider2.easy.includes(d), st.deal);
      t.equal([inS2Easy, st.replay, st.winnable], [false, false, true], 'Spider 2-suit Easy exhaustion spills to unseen solver-verified deal #' + st.deal + ' (grade=' + st.grade + ')');
      const sv2 = await t.game('solve', 'spider', { suits: 2 }, st.deal, 3000);
      t.equal(sv2.result, 'won', 'spilled Spider 2-suit deal #' + st.deal + ' solves won via makeSolver');

      // 4. Spider 4-suit Easy exhaustion: (a) least-recently-seen unwon first (no wrap toast), (b) 100% won wraps to oldest won with calm toast & S.replay=true (CD-WF1-04)
      const s4Info = await t.page.evaluate(() => {
        const arr = window.__game.seedPools().spider4.easy;
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const todayS4 = window.__game.dailyDealFor('spider', { suits: 4 }, today);
        const nonToday = arr.filter((d) => d !== todayS4);
        const oldestUnwon = nonToday[0], newerUnwon = nonToday[1];
        const wonRest = arr.filter((d) => d !== oldestUnwon && d !== newerUnwon);
        // Put oldestUnwon first in seenDeals, newerUnwon later, all others won
        const seenAll = [oldestUnwon, ...wonRest, newerUnwon].map((d) => 'spider4:' + d);
        const won122 = wonRest.map((d) => 'spider4:' + d);
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify({ lastMode: 'spider', lastOpts: { draw: 1, suits: 4 }, totalWins: 0, daily: {}, seenDeals: seenAll, wonDeals: won122 }));
        return { oldestUnwon, newerUnwon, count: arr.length, oldestWonAll: nonToday[3] };
      });
      await t.reload();
      await t.game('setSettings', { dealFairness: 'easy', motion: 'reduced', tips: false, sound: false });
      await t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });
      await t.seed(99); await t.game('newGame', { mode: 'spider', suits: 4 });
      st = await t.state();
      const unwonToast = await t.page.locator('#toast').textContent();
      t.equal([st.deal, st.replay], [s4Info.oldestUnwon, true], 'Spider 4-suit exhaustion picks least-recently-seen unwon deal first (retried && !alreadyWon)');
      t.expect(!/All \d+ deals in this tier won/.test(unwonToast), 'unwon fallback does not emit all-won wrap toast: ' + unwonToast);

      // Now mark ALL 124 Spider 4-suit Easy deals WON with oldestWonAll at index 0
      await t.page.evaluate((oldest) => {
        const arr = window.__game.seedPools().spider4.easy;
        const ordered = [oldest, ...arr.filter((d) => d !== oldest)].map((d) => 'spider4:' + d);
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify({ lastMode: 'spider', lastOpts: { draw: 1, suits: 4 }, totalWins: 124, daily: {}, seenDeals: ordered, wonDeals: ordered }));
      }, s4Info.oldestWonAll);
      await t.reload();
      await t.game('setSettings', { dealFairness: 'easy', motion: 'reduced', tips: false, sound: false });
      await t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });
      await t.seed(99); await t.game('newGame', { mode: 'spider', suits: 4 });
      st = await t.state();
      const wrapToast = await t.page.locator('#toast').textContent();
      t.equal([st.deal, st.replay], [s4Info.oldestWonAll, true], '100%-won Spider 4-suit tier wraps to oldest won deal while preserving S.replay=true (CD-WF1-04)');
      t.equal(wrapToast, 'All ' + s4Info.count + ' deals in this tier won — replaying oldest.', 'emits calm tier-wrap toast');

      // 5. Today's Daily is skipped in non-daily Spider 4-suit Winnable (Any), while Daily itself remains date-deterministic
      const dailyAvoid = await t.page.evaluate(() => {
        const g = window.__game;
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const todayS4 = g.dailyDealFor('spider', { suits: 4 }, today);
        const flat = [...g.seedPools().spider4.easy, ...g.seedPools().spider4.medium, ...g.seedPools().spider4.hard];
        const idxToday = flat.indexOf(todayS4);
        // Find a seed whose fnv1a(seed + '|spider4') % flat.length === idxToday
        let collidingSeed = 1;
        for (let s = 1; s < 50000; s++) {
          if (g.fnv1a(String(s) + '|spider4') % flat.length === idxToday) { collidingSeed = s; break; }
        }
        localStorage.removeItem('spa-solitaire:v1:meta');
        return { today, todayS4, collidingSeed };
      });
      await t.reload();
      await t.game('setSettings', { dealFairness: 'winnable', motion: 'reduced', tips: false, sound: false });
      await t.seed(dailyAvoid.collidingSeed);
      await t.game('newGame', { mode: 'spider', suits: 4 });
      st = await t.state();
      t.expect(st.deal !== dailyAvoid.todayS4 && !st.replay, 'non-daily Spider 4-suit skips today\'s Daily #' + dailyAvoid.todayS4 + ' (dealt #' + st.deal + ')');
      await t.game('newGame', { mode: 'spider', suits: 4, daily: dailyAvoid.today });
      t.equal((await t.state()).deal, dailyAvoid.todayS4, 'Daily Deal itself remains strictly date-deterministic');

      // 6. randomFreecellDeal() retries up to 32 draws to avoid #11982, current S.deal, seenDeals, wonDeals, and today's Daily
      await t.page.evaluate(() => {
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify({ lastMode: 'freecell', lastOpts: { draw: 1, suits: 1 }, totalWins: 1, daily: {}, seenDeals: ['freecell:555'], wonDeals: ['freecell:556'] }));
      });
      await t.reload();
      await t.game('setSettings', { dealFairness: 'winnable', motion: 'reduced', tips: false, sound: false });
      await t.game('newGame', { mode: 'freecell', deal: 554 }); // current S.deal = 554
      const randFc = await t.page.evaluate(() => {
        const g = window.__game;
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const todayFc = g.dailyDealFor('freecell', {}, today);
        const fresh = [557, 558, 559].find((n) => n !== todayFc);
        const seq = [11982, 554, 555, 556, todayFc, fresh];
        let idx = 0;
        const origRand = Math.random;
        Math.random = () => ((seq[Math.min(idx++, seq.length - 1)] - 0.5) / 32000);
        try { g.newGame({ mode: 'freecell' }); } finally { Math.random = origRand; }
        const st = g.getState();
        return { deal: st.deal, replay: st.replay, fresh, draws: idx };
      });
      t.equal([randFc.deal, randFc.replay, randFc.draws], [randFc.fresh, false, 6], 'randomFreecellDeal() skips #11982, current, seenDeals, wonDeals, and todayDaily to land on fresh deal');
    },
  },
  {
    name: 'rules-28 W1-P-N01 simChild respects pullbackHold and noAutoplay on foundation pullbacks under autoFoundation: all',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { autoFoundation: 'all', motion: 'reduced', tips: false, sound: false });

      // 1. Klondike Draw 1: only winning line pulls 3H down from f0 onto 4S so 2S can uncover #AS
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: [], waste: [], f0: ['AH', '2H', '3H'], f1: [], f2: [], f3: [], t0: ['4S'], t1: ['#AS', '2S'], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      const kStuck = await t.game('act', 'checkStuck');
      t.equal(kStuck.verdict, 'live', 'Klondike: checkStuck() returns live when foundation pullback unblocks board under autoFoundation: all');
      t.equal((await t.state()).modal, null, 'Klondike: no false dead-end modal');
      const kHint = await t.game('act', 'hint');
      t.equal([kHint.ok, !!kHint.stuck, kHint.move && kHint.move.from, kHint.move && kHint.move.to], [true, false, 'f0', 't0'], 'Klondike: hint() suggests pulling 3H from f0 to t0');
      // Performing the hinted pullback succeeds and keeps 3H on t0 (pullbackHold)
      t.equal((await t.game('act', 'move', 'f0', 't0')).ok, true, 'Klondike: manual pullback f0 -> t0 succeeds');
      t.equal((await t.state()).piles.t0, ['4S', '3H'], 'Klondike: 3H remains held on t0 under autoFoundation: all');

      // 2. Klondike Draw 3: tests held-card exclusion across an intermediate stock draw inside simChild -> simAutoplay(hold)
      // Stock [QC, JC, AS, 2S, TD, 9C]: without pulling 3H down and playing 2S onto 3H, Draw-3 cycles 2S/QC forever and never exposes AS.
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 3 },
        piles: { stock: ['QC', 'JC', 'AS', '2S', 'TD', '9C'], waste: [], f0: ['AH', '2H', '3H'], f1: [], f2: [], f3: [], t0: ['4S'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      const d3Stuck = await t.game('act', 'checkStuck');
      t.equal(d3Stuck.verdict, 'live', 'Klondike Draw 3: checkStuck() keeps pulled-back 3H held across stock draw inside simAutoplay(hold)');
      const d3Hint = await t.game('act', 'hint');
      t.equal([d3Hint.ok, !!d3Hint.stuck, d3Hint.move && d3Hint.move.from, d3Hint.move && d3Hint.move.to], [true, false, 'f0', 't0'], 'Klondike Draw 3: hint() suggests foundation pullback f0 -> t0');

      // 3. FreeCell: all 4 free cells and all 8 columns occupied with no tableau-to-tableau move; only pullback 3H -> 4S frees 2S to expose AS
      await t.game('setState', {
        mode: 'freecell',
        piles: {
          c0: ['9C'], c1: ['9D'], c2: ['9H'], c3: ['9S'],
          f0: ['AH', '2H', '3H'], f1: [], f2: [], f3: [],
          t0: ['4S'], t1: ['AS', '2S'], t2: ['7C'], t3: ['7D'], t4: ['7H'], t5: ['7S'], t6: ['JC'], t7: ['JD'],
        },
      });
      const fcStuck = await t.game('act', 'checkStuck');
      t.equal(fcStuck.verdict, 'live', 'FreeCell: checkStuck() returns live when foundation pullback unblocks AS under autoFoundation: all');
      t.equal((await t.state()).modal, null, 'FreeCell: no false dead-end modal');
      const fcHint = await t.game('act', 'hint');
      t.equal([fcHint.ok, !!fcHint.stuck, fcHint.move && fcHint.move.from, fcHint.move && fcHint.move.to], [true, false, 'f0', 't0'], 'FreeCell: hint() suggests foundation pullback f0 -> t0');

      // 4. Yukon: only foundation pullback 3H -> 4S frees 2S to uncover #AS
      await t.game('setState', {
        mode: 'yukon',
        piles: { f0: ['AH', '2H', '3H'], f1: [], f2: [], f3: [], t0: ['4S'], t1: ['#AS', '2S'], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      const ykStuck = await t.game('act', 'checkStuck');
      t.equal(ykStuck.verdict, 'live', 'Yukon: checkStuck() returns live when foundation pullback unblocks #AS under autoFoundation: all');
      t.equal((await t.state()).modal, null, 'Yukon: no false dead-end modal');
      const ykHint = await t.game('act', 'hint');
      t.equal([ykHint.ok, !!ykHint.stuck, ykHint.move && ykHint.move.from, ykHint.move && ykHint.move.to], [true, false, 'f0', 't0'], 'Yukon: hint() suggests foundation pullback f0 -> t0');
    },
  },
  {
    name: 'rules-29 W1-S3-07 FreeCell solver-backed winning-line hints and bounded <2,000-position cluttered deadlock probe in lostKick()',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { autoFoundation: 'off', motion: 'reduced', tips: false, sound: false });
      const runS = (s, n = 13) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].slice(0, n).map((r) => r + s);

      // 1. Solver-backed winning-line hints in FreeCell (including cell & tableau moves): following hints wins a multi-step cluttered FreeCell position
      await t.game('setState', {
        mode: 'freecell',
        piles: {
          c0: ['KC'], c1: ['KD'], c2: ['KH'], c3: ['KS'],
          f0: runS('C', 9), f1: runS('D', 9), f2: runS('H', 9), f3: runS('S', 9),
          t0: ['TC', 'JS'], t1: ['TD', 'JH'], t2: ['TH', 'JD'], t3: ['TS', 'JC'],
          t4: ['QC'], t5: ['QD'], t6: ['QH'], t7: ['QS'],
        },
      });
      const svWin = await t.game('solveState', 1500);
      t.equal(svWin.result, 'won', 'makeSolver solves cluttered 52-card FreeCell position within <2,000 budget (used ' + svWin.used + ')');
      const followWin = await t.page.evaluate(() => {
        const G = window.__game;
        let firstSolver = null, steps = 0;
        for (; steps < 40; steps++) {
          const st = G.getState(); if (st.won) break;
          const h = G.act('hint'); if (!h.ok || h.stuck || !h.move) break;
          if (firstSolver === null) firstSolver = !!h.move.solver;
          G.act('move', h.move.from, h.move.to, st.piles[h.move.from].length - h.move.index);
        }
        return { won: G.getState().won || G.getState().scene === 'win', firstSolver, steps };
      });
      t.equal([followWin.firstSolver, followWin.won], [true, true], 'FreeCell Hint leads with solver winning line and following hints wins (' + followWin.steps + ' steps)');

      // 2. Cluttered FreeCell deadlock (all 4 cells full, all 8 columns non-empty, no immediate foundation/column-freeing move, yet bury-reducing move keeps checkStuck live):
      // lostKick() proves dead within <2,000 positions and shows the non-blocking early warning toast.
      await t.game('setState', {
        mode: 'freecell',
        piles: {
          c0: ['KC'], c1: ['KD'], c2: ['KH'], c3: ['KS'],
          f0: runS('C', 7), f1: runS('D', 7), f2: runS('H', 7), f3: runS('S', 7),
          t0: ['8C', 'QC'], t1: ['8D', 'QD'], t2: ['8H', 'QH'], t3: ['TS', 'QS', 'JD'],
          t4: ['TD', 'JC', '9C'], t5: ['TH', 'JH', '9D'], t6: ['TC', 'JS', '9H'], t7: ['8S', '9S'],
        },
      });
      await t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });
      t.equal((await t.game('act', 'move', 't3', 't0')).ok, true, 'legal move into cluttered FreeCell deadlock triggers scheduleStuckCheck/lostKick');
      await t.page.waitForFunction(() => window.__game.getState().lost === 'dead', null, { timeout: 10000 });
      const deadSnap = await t.page.evaluate(() => ({
        st: window.__game.getState(),
        toast: document.getElementById('toast').textContent,
      }));
      t.equal(deadSnap.st.stuck, 'live', 'checkStuck stays live because bury-reducing JD move still exists');
      t.equal(deadSnap.st.scene, 'game', 'early dead-branch warning does not block play with a modal');
      t.equal(deadSnap.toast, 'No winning line left from here. Undo takes you back.', 'FreeCell lostKick emits early dead-branch warning toast');

      // 3. Cluttered but WINNABLE FreeCell position (all 4 cells full, all 8 cols non-empty, no immediate foundation/col-freeing move) resolves 'won' and stays quiet
      await t.game('setState', {
        mode: 'freecell',
        piles: {
          c0: ['KC'], c1: ['KD'], c2: ['KH'], c3: ['KS'],
          f0: runS('C', 8), f1: runS('D', 8), f2: runS('H', 8), f3: runS('S', 8),
          t0: ['9C', 'JS'], t1: ['9D', 'JH'], t2: ['9H', 'QD', 'JD'], t3: ['9S', 'JC'],
          t4: ['TC', 'QH'], t5: ['TD', 'QS'], t6: ['TH', 'TS'], t7: ['QC'],
        },
      });
      await t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });
      t.equal((await t.game('act', 'move', 't2', 't7')).ok, true, 'move JD onto QC keeps all 4 cells & 8 cols occupied with no immediate foundation/col-freeing move');
      await t.page.waitForFunction(() => window.__game.getState().lost === 'won', null, { timeout: 10000 });
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), '', 'cluttered winnable FreeCell board stays completely quiet (no false warning)');

      // 4. Open free cell skips lostKick() cleanly (lost remains null)
      await t.game('newGame', { mode: 'freecell', deal: 1 });
      const m0 = (await t.game('legalMoves')).find((m) => m.to === 'c0');
      t.expect(!!m0, 'deal #1 has legal move to c0');
      await t.game('act', 'move', m0.from, m0.to, 1);
      await t.page.waitForFunction(() => window.__game.getState().stuck !== null, null, { timeout: 8000 });
      t.equal((await t.state()).lost, null, 'FreeCell with open free cells skips deadlock probe (lost === null)');
    },
  },
  {
    name: 'rules-30 W6-S3-07 non-Spider tap-to-move prefers longer descending runs, clean bases, face-down reveals & column clears over lateral leftmost ties',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { autoFoundation: 'off', motion: 'reduced', tips: false, sound: false });
      const EK = { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };
      const EF = { c0: [], c1: [], c2: [], c3: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [] };

      // 1. Klondike: prefer extending a longer descending alternating run (t2) ahead of leftmost bare equal-rank column (t1)
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EK, { t0: ['#5C', '7S'], t1: ['8H'], t2: ['TD', '9C', '8D'] }) });
      t.equal((await t.game('act', 'tap', 't0', 1)).ok, true, 'Klondike tap 7S succeeds');
      t.equal([(await t.state()).piles.t1, (await t.state()).piles.t2], [['8H'], ['TD', '9C', '8D', '7S']], 'Klondike chooses longer descending run t2 over leftmost bare 8H on t1');

      // 2. Klondike: prefer clean column (t2) over piling onto a column with buried face-down cards (t1)
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EK, { waste: ['7S'], t1: ['#4C', '#3D', '8H'], t2: ['8D'] }) });
      t.equal((await t.game('act', 'tap', 'waste', 0)).ok, true, 'Klondike waste tap 7S succeeds');
      t.equal([(await t.state()).piles.t1, (await t.state()).piles.t2], [['#4C', '#3D', '8H'], ['8D', '7S']], 'Klondike avoids burying face-down column t1 when clean t2 is available');

      // 3. Klondike: tapping bonded 7S on ['#KH','8H','7S'] prefers exposing #KH by moving [8H,7S] onto 9C (t2) over a lateral swap 7S->8D (t1)
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EK, { t0: ['#KH', '8H', '7S'], t1: ['8D'], t2: ['9C'] }) });
      t.equal((await t.game('act', 'tap', 't0', 2)).ok, true, 'Klondike tap on bonded 7S succeeds');
      t.equal([(await t.state()).piles.t0, (await t.state()).piles.t1, (await t.state()).piles.t2], [['KH'], ['8D'], ['9C', '8H', '7S']], 'Klondike exposes #KH via [8H,7S]->9C instead of lateral swap 7S->8D');

      // 4. Klondike: deliberate lateral swap still works when no better upward move exists
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EK, { t0: ['8H', '7S'], t1: ['8D'] }) });
      t.equal((await t.game('act', 'tap', 't0', 1)).ok, true, 'deliberate lateral swap still permitted when no better run exists');
      t.equal([(await t.state()).piles.t0, (await t.state()).piles.t1], [['8H'], ['8D', '7S']], '7S moved onto 8D');

      // 5. FreeCell: prefer clean longer run (t2) over burying low Ace on leftmost column (t1), and vacate column via upward run ahead of lateral swap
      await t.game('setState', { mode: 'freecell', piles: Object.assign({}, EF, { t0: ['7S'], t1: ['AS', '8H'], t2: ['9C', '8D'] }) });
      t.equal((await t.game('act', 'tap', 't0', 0)).ok, true, 'FreeCell tap 7S succeeds');
      t.equal([(await t.state()).piles.t1, (await t.state()).piles.t2], [['AS', '8H'], ['9C', '8D', '7S']], 'FreeCell prefers longer clean run t2 over burying AS on leftmost t1');

      await t.game('setState', { mode: 'freecell', piles: Object.assign({}, EF, { t0: ['8H', '7S'], t1: ['8D'], t2: ['9C'], t3: ['2C'], t4: ['2D'], t5: ['2H'], t6: ['2S'], t7: ['3C'] }) });
      t.equal((await t.game('act', 'tap', 't0', 1)).ok, true, 'FreeCell tap on bonded 7S succeeds');
      t.equal([(await t.state()).piles.t0, (await t.state()).piles.t1, (await t.state()).piles.t2], [[], ['8D'], ['9C', '8H', '7S']], 'FreeCell vacates t0 via [8H,7S]->9C ahead of lateral 7S->8D swap');

      // 6. Yukon: prefer King-anchored longer run (t2) over leftmost buried face-down column (t1) while still keeping upward fallback excluded
      await t.game('setState', { mode: 'yukon', piles: Object.assign({}, EK, { t0: ['JH', '3C'], t1: ['#2S', 'QS'], t2: ['KD', 'QC'] }) });
      t.equal((await t.game('act', 'tap', 't0', 0)).ok, true, 'Yukon tap on [JH,3C] succeeds');
      t.equal([(await t.state()).piles.t1, (await t.state()).piles.t2], [['#2S', 'QS'], ['KD', 'QC', 'JH', '3C']], 'Yukon prefers King-anchored run t2 over leftmost face-down column t1');
    },
  },
];
