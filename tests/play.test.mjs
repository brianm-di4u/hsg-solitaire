// Interaction tests: drag, tap, undo/redo, hints, auto-complete, autoplay, keyboard, scoring, win (PRD AC 12–19, 22, 30).
import { rawShot, dragCard, clickCard, baseSettings, nearWinKlondike } from './_util.mjs';

const run = (s, n = 13) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].slice(0, n).map((r) => r + s);

export const tests = [
  {
    name: 'play-12 win detection in every mode',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      const cases = [
        nearWinKlondike(),
        { mode: 'freecell', piles: { f0: run('C'), f1: run('D'), f2: run('H'), f3: run('S', 12), c0: ['KS'], c1: [], c2: [], c3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [] }, to: ['c0', 'f3'] },
        { mode: 'yukon', piles: { f0: run('C'), f1: run('D'), f2: run('H'), f3: run('S', 12), t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] }, to: ['t0', 'f3'] },
      ];
      for (const c of cases) {
        await t.game('setState', c);
        const [from, to] = c.to || ['t0', 'f3'];
        t.equal((await t.game('act', 'move', from, to)).ok, true, c.mode + ' final move');
        await t.waitForStable();
        const s = await t.state();
        t.equal(s.won, true, c.mode + ' won'); t.equal(s.scene, 'win', c.mode + ' win dialog shown');
        if (c.mode === 'klondike') await t.shot('play-12-win-klondike');
      }
      // Spider: the last run completes itself
      const spiderRun = ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'];
      const fp = {}; for (let i = 0; i < 7; i++) fp['f' + i] = run('S').reverse();
      await t.game('setState', { mode: 'spider', opts: { suits: 1 }, piles: Object.assign({ stock: [], f7: [], t0: spiderRun, t1: ['AS'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [] }, fp) });
      t.equal((await t.game('act', 'move', 't1', 't0')).ok, true, 'spider final move');
      await t.waitForStable();
      const s = await t.state(); t.equal(s.won, true, 'spider won'); t.equal(s.runs, 1, 'spider run counted');
    },
  },
  {
    name: 'play-13 pointer drag and drop',
    async run(t) {
      await baseSettings(t);
      await t.game('setState', { mode: 'klondike', piles: { stock: ['#2C', '#3C'], waste: [], t0: ['#5C', '9H'], t1: ['#2D', 'TS'], t2: ['#KH', '8C'], t3: ['JS'], t4: ['QD'], t5: ['#4S', 'JC', 'TH', '9C'], t6: ['KC'] } });
      await dragCard(t, 't0', 1, 't1', { midShot: 'play-13-dragging' });
      await t.waitForStable();
      let s = await t.state();
      t.equal(s.piles.t1, ['#2D', 'TS', '9H'], 'nine of hearts dropped on ten of spades');
      t.equal(s.piles.t0, ['5C'], 'source column flipped its next card');
      await t.shot('play-13-dropped');
      await dragCard(t, 't2', 1, 't4');
      await t.waitForStable(); s = await t.state();
      t.equal(s.piles.t2, ['#KH', '8C'], 'illegal drop (8C on QD) returns the card');
      await dragCard(t, 't5', 2, 't3');
      await t.waitForStable(); s = await t.state();
      t.equal(s.piles.t5, ['#4S', 'JC'], 'two-card run left the column');
      t.equal(s.piles.t3, ['JS', 'TH', '9C'], 'run landed on the jack of spades');
    },
  },
  {
    name: 'play-14 tap auto-move',
    async run(t) {
      await baseSettings(t);
      await t.game('setState', { mode: 'klondike', piles: { stock: ['#2C'], waste: ['AH'], t0: ['#5C', '9H'], t1: ['TS'], t2: [], t3: [], t4: [], t5: [], t6: ['KD'] } });
      await clickCard(t, 'waste', 0);
      await t.waitForStable();
      let s = await t.state(); t.equal(s.piles.f0, ['AH'], 'tapped ace flew to a foundation');
      await clickCard(t, 't0', 1);
      await t.waitForStable(); s = await t.state();
      t.equal(s.piles.t1, ['TS', '9H'], 'tapped nine moved onto the ten');
      await clickCard(t, 'stock');
      await t.waitForStable(); s = await t.state(); t.equal(s.piles.waste.length, 1, 'tapping the stock draws');
      await t.shot('play-14-tap');
    },
  },
  {
    name: 'play-15 undo and redo 30 deep',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { autoFoundation: 'safe', motion: 'reduced' });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 31337 });
      const hist = [await t.state()];
      for (let i = 0; i < 30; i++) {
        const m = (await t.game('legalMoves')).filter((x) => x.score > 0)[0];
        const r = m && i % 3 !== 2 ? await t.game('act', 'move', m.from, m.to, m.count) : await t.game('act', 'draw');
        if (!r.ok) await t.game('act', 'draw');
        hist.push(await t.state());
      }
      const key = (s) => JSON.stringify([s.piles, s.score]);
      for (let i = 30; i > 0; i--) { await t.game('act', 'undo'); t.equal(key(await t.state()), key(hist[i - 1]), 'undo to step ' + (i - 1)); }
      for (let i = 1; i <= 30; i++) { await t.game('act', 'redo'); t.equal(key(await t.state()), key(hist[i]), 'redo to step ' + i); }
    },
  },
  {
    name: 'play-16 hints',
    async run(t) {
      await baseSettings(t);
      await t.game('setState', { mode: 'klondike', piles: { stock: ['#2C'], waste: ['5D'], t0: ['#5C', '9H'], t1: ['#4D', 'TS'], t2: ['AS'], t3: [], t4: [], t5: [], t6: ['6C'] } });
      const h1 = await t.game('act', 'hint');
      t.expect(h1.ok && h1.move, 'a hint is offered');
      t.equal([h1.move.from, h1.move.to], ['t2', 'f0'], 'best hint is the ace to a foundation');
      await t.shot('play-16-hint');
      const h2 = await t.game('act', 'hint'); t.expect(h2.move && JSON.stringify(h2.move) !== JSON.stringify(h1.move), 'second press cycles to another move');
      await t.game('setState', { mode: 'klondike', piles: { stock: [], waste: [], t0: ['5C'], t1: ['5S'], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      const h3 = await t.game('act', 'hint'); t.equal(h3.move, null, 'no move available');
      const toast = await t.page.textContent('#toast'); t.expect(/No moves left/.test(toast), 'no-move message shown: ' + toast);
    },
  },
  {
    name: 'play-17 auto-complete',
    async run(t) {
      await baseSettings(t);
      await t.game('setState', { mode: 'klondike', piles: { stock: ['3H'], waste: ['2S'], f0: run('C', 10), f1: run('D', 11), f2: run('H', 2), f3: run('S', 1),
        t0: ['KC', 'QD', 'JC'], t1: ['KD', 'QC'], t2: ['KH', 'QS', 'JH', 'TS', '9H', '8S', '7H', '6S', '5H', '4S'], t3: ['KS', 'QH', 'JS', 'TH', '9S', '8H', '7S', '6H', '5S', '4H', '3S'], t4: [], t5: [], t6: [] } });
      let s = await t.state(); t.equal(s.canAutoComplete, true, 'auto-complete offered');
      t.equal(await t.page.isDisabled('#bAuto'), false, 'Finish button enabled');
      await t.shot('play-17-autocomplete-offer');
      t.equal((await t.game('act', 'autoComplete')).ok, true, 'auto-complete runs');
      await t.waitForStable(); s = await t.state(); t.equal(s.won, true, 'auto-complete wins');
      await t.game('setState', { mode: 'klondike', piles: { stock: [], waste: [], t0: ['#KC', 'QD'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      t.equal((await t.state()).canAutoComplete, false, 'not offered with a face-down card');
    },
  },
  {
    name: 'play-18 safe autoplay on and off',
    viewports: ['desktop'],
    async run(t) {
      const pos = { mode: 'klondike', piles: { stock: [], waste: [], t0: ['AH', '5S'], t1: ['6H'], t2: ['9C'], t3: [], t4: [], t5: [], t6: [] } };
      await baseSettings(t, { autoFoundation: 'safe' });
      await t.game('setState', pos); await t.game('act', 'move', 't0', 't1');
      t.equal((await t.state()).piles.f0, ['AH'], 'safe autoplay sent the ace home');
      await baseSettings(t, { autoFoundation: 'off' });
      await t.game('setState', pos); await t.game('act', 'move', 't0', 't1');
      t.equal((await t.state()).piles.t0, ['AH'], 'with autoplay off the ace stays');
    },
  },
  {
    name: 'play-19 keyboard-only play',
    async run(t) {
      await baseSettings(t);
      await t.game('setState', { mode: 'klondike', piles: { stock: ['#4C', '#7D'], waste: [], t0: ['#5C', '9H'], t1: ['#2D', 'TS'], t2: ['AS'], t3: [], t4: [], t5: [], t6: ['KD'] } });
      await t.page.focus('#cv');
      await t.page.keyboard.press('1');          // cursor to column 1
      await t.page.keyboard.press('Enter');      // pick up 9H
      t.expect((await t.state()).held, 'card held after Enter');
      await t.page.keyboard.press('ArrowRight'); // to column 2
      await t.shot('play-19-keyboard-held');
      await t.page.keyboard.press('Enter');      // drop on TS
      let s = await t.state();
      t.equal(s.piles.t1, ['#2D', 'TS', '9H'], 'keyboard move onto the ten');
      await t.page.keyboard.press('3'); await t.page.keyboard.press('f');
      s = await t.state(); t.equal(s.piles.f0.concat(s.piles.f1, s.piles.f2, s.piles.f3), ['AS'], 'F sends the ace home');
      await t.page.keyboard.press('d'); s = await t.state(); t.equal(s.piles.waste.length, 1, 'D draws');
      await t.page.keyboard.press('u'); s = await t.state(); t.equal(s.piles.waste.length, 0, 'U undoes');
      await t.page.keyboard.press('h'); await t.waitForStable();
      t.expect(/Hint/.test(await t.page.textContent('#toast')), 'H shows a hint');
      await t.page.keyboard.press('Escape'); t.equal((await t.state()).scene, 'menu', 'Esc opens the menu');
      await t.page.keyboard.press('Escape'); t.equal((await t.state()).scene, 'game', 'Esc closes it');
    },
  },
  {
    name: 'play-22 scoring and timer',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t);
      await t.game('setState', { mode: 'klondike', piles: { stock: [], waste: ['9H'], f0: [], t0: ['#5C', 'AD'], t1: ['TS'], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      await t.game('act', 'move', 'waste', 't1'); t.equal((await t.state()).score, 5, 'waste to tableau +5');
      await t.game('act', 'move', 't0', 'f0'); t.equal((await t.state()).score, 20, 'to foundation +10 and flip +5');
      await t.game('act', 'move', 'f0', 't2'); t.equal((await t.state()).score, 20, 'ace cannot go to an empty column (kings only)');
      await t.page.waitForTimeout(1300);
      const s = await t.state(); t.expect(s.elapsedMs >= 900, 'timer runs after the first move: ' + s.elapsedMs);
      t.equal(s.moves, 2, 'two moves counted');
      await t.game('setState', { mode: 'freecell', piles: { t0: ['AS'], t1: ['KD'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [], c0: [], c1: [], c2: [], c3: [], f0: [], f1: [], f2: [], f3: [] } });
      await t.game('act', 'move', 't0', 'f0'); t.equal((await t.state()).score, 10, 'freecell +10 per card home');
    },
  },
  {
    name: 'play-31 win ceremony frames',
    async run(t) {
      await baseSettings(t);
      await t.game('setState', nearWinKlondike());
      await t.game('act', 'move', 't0', 'f3');
      // frozen-clock frames: the rosette forming, the rosette under the skylight glow, the fountain spray
      for (const [ms, name] of [[600, 'gather'], [1350, 'rosette'], [2500, 'spray']]) {
        t.expect((await t.game('act', 'ceremonyAt', ms)).ok, 'ceremony frame at ' + ms + ' ms');
        await t.shot('play-31-ceremony-' + name);
      }
      await t.game('act', 'unfreeze');
      await t.waitForStable(8000);
      t.equal((await t.state()).scene, 'win', 'win dialog after the ceremony');
    },
  },
  {
    name: 'play-30 win screen with cascade and fact card',
    async run(t) {
      await baseSettings(t);
      await t.game('setState', nearWinKlondike());
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForTimeout(1500);
      await rawShot(t, 'play-30-cascade');
      t.expect(!(await t.game('isIdle')), 'ceremony is running');
      await t.waitForStable(6000);
      const s = await t.state(); t.equal(s.scene, 'win', 'win dialog after the cascade');
      const txt = await t.page.textContent('#sheet');
      t.expect(/Did you know\?/.test(txt) && /Source:/.test(txt), 'fact card with a source');
      t.expect(/bath ticket/i.test(txt), 'bath ticket');
      await t.shot('play-30-win', { fullPage: false });
      await t.checkLayout();
    },
  },
];
