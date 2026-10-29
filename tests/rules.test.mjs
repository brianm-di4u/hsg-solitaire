// Rules tests: deals, legality, stock, Spider runs, FreeCell vectors, determinism (PRD AC 1–11, 20, 21).
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
