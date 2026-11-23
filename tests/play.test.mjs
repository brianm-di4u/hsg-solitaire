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
      t.equal(h3.stuck, true, 'hint reports a dead end');
      t.equal((await t.state()).modal, 'stuck', 'no-more-moves popup shown');
    },
  },
  {
    name: 'play-16b hints skip futile loops',
    async run(t) {
      await baseSettings(t);
      // 5H can shuttle between the black sixes and the stock can cycle forever, but nothing ever plays
      const deadKlondike = { mode: 'klondike', opts: { draw: 1 }, piles: { stock: ['#9C', '#9S'], waste: [], t0: ['#2D', '6S'], t1: ['#3D', '6C', '5H'], t2: [], t3: [], t4: [], t5: [], t6: [] } };
      await t.game('setState', deadKlondike);
      const h = await t.game('act', 'hint');
      t.equal([h.move, h.stock, h.stuck], [null, undefined, true], 'no shuttle or stock hint, reported stuck');
      t.equal((await t.state()).modal, 'stuck', 'popup shown from the hint');
      await t.shot('play-16b-stuck');
      await t.page.click('#sheet [data-close]:not(.x)');
      t.equal((await t.state()).modal, null, 'Keep looking closes it');
      const c1 = await t.game('act', 'checkStuck'); t.equal(c1.verdict, 'dead', 'auto-check agrees');
      t.equal((await t.state()).modal, null, 'not shown twice for the same position');

      // the automatic check fires after a move, once things settle
      t.expect((await t.game('act', 'move', 't1', 't0', 1)).ok, 'the shuttle is a legal move'); await t.game('act', 'skip');
      const auto = await t.page.waitForFunction(() => window.__game.getState().modal === 'stuck', null, { timeout: 4000 }).then(() => true, () => false);
      t.expect(auto, 'popup appears on its own after a move into a dead end');
      await t.page.click('#sheet [data-a="undo"]');
      const s = await t.state(); t.equal([s.modal, s.undoDepth], [null, 0], 'Undo button closes the popup and undoes');

      // FreeCell: cards can only trade places with the free cell and empty column; no move is ever useful
      await t.game('setState', { mode: 'freecell', piles: { c0: ['3C'], c1: ['3S'], c2: ['5C'], c3: [], t0: ['9C'], t1: ['9S'], t2: ['7C'], t3: ['7S'], t4: ['KC'], t5: ['KS'], t6: ['JC'], t7: ['JS'] } });
      const fh = await t.game('act', 'hint'); t.equal(fh.stuck, true, 'FreeCell cell shuffling is a dead end');

      // the only way on is to cycle the stock to the ace: drawing is hinted and the game is live
      await t.game('setState', Object.assign({}, deadKlondike, { piles: Object.assign({}, deadKlondike.piles, { stock: ['#AH', '#9C', '#9S'] }) }));
      const dh = await t.game('act', 'hint'); t.equal([dh.move, dh.stock, dh.stuck], [null, true, undefined], 'draw from the stock is hinted');
      t.equal((await t.game('act', 'checkStuck')).verdict, 'live', 'not a dead end');
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
      // the 2S in the stock keeps the game alive, so H gives a hint rather than the no-more-moves popup
      await t.game('setState', { mode: 'klondike', piles: { stock: ['#4C', '#7D', '#2S'], waste: [], t0: ['#5C', '9H'], t1: ['#2D', 'TS'], t2: ['AS'], t3: [], t4: [], t5: [], t6: ['KD'] } });
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
  {
    name: 'play-32 clean-run parity: autoplay/autoComplete move & recycle parity, superseded hint non-stamping, and drag/waste refusal feedback (W6-S3-08, W6-S2-03)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced', scoring: 'standard', tips: false });
      // 1. autoplay() increments S.moves per autoplayed card while remaining one Undo snapshot
      await t.game('setSettings', { autoFoundation: 'safe' });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['AH', '5S'], t1: ['6H'], t2: ['2H'], t3: [], t4: [], t5: [], t6: [] },
      });
      await t.game('act', 'move', 't0', 't1'); // 1 manual move + 2 autoplayed cards (AH, 2H) = 3 moves, 1 undo step
      let s = await t.state();
      t.equal([s.piles.f0, s.moves, s.undoDepth], [['AH', '2H'], 3, 1], 'autoplay counts each autoplayed card in S.moves inside a single Undo snapshot');
      await t.game('act', 'undo');
      s = await t.state();
      t.equal([s.piles.f0, s.moves, s.undoDepth], [[], 0, 0], 'single Undo reverts manual move plus all autoplayed cards and restores S.moves');
      await t.game('setSettings', { autoFoundation: 'off' });

      // 2. autoComplete() increments S.moves per card/draw/recycle AND applies Klondike Pass 2+ recycle fees
      // 1st pass (recycles: 1 already) with 1 card in waste (2S) and 1 card on tableau (AS) ->
      // Finish plays AS (move 1, +10), recycles waste->stock (move 2, recycles becomes 2 -> -50 fee!), draws 2S (move 3), plays 2S (move 4, +10)
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 }, score: 100, moves: 10, recycles: 1,
        piles: {
          stock: [], waste: ['KS', 'QS'],
          f0: run('C'), f1: run('D'), f2: run('H'), f3: run('S', 11),
          t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [],
        },
      });
      // Wait: with waste=['KS','QS'] (QS is top of waste), QS plays directly -> f3 (+10, move 1), then KS is exposed on waste -> f3 (+10, move 2) -> no recycle needed.
      // To force a recycle inside autoComplete, put KS on top of waste and QS buried under KS in waste (waste=['QS','KS']), stock=[]:
      // Recycle waste->stock (stock=['KS','QS'], QS on top! recycles 1->2 => -50 pts, move +1), draw QS (move +1), play QS waste->f3 (+15, move +1), draw KS (move +1), play KS waste->f3 (+15, move +1) => +5 moves (15), card pts 80 + Klondike Draw 1 efficiencyBonus(15)=450 => 530!
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 }, score: 100, moves: 10, recycles: 1,
        piles: {
          stock: [], waste: ['QS', 'KS'],
          f0: run('C'), f1: run('D'), f2: run('H'), f3: run('S', 11),
          t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [],
        },
      });
      t.equal((await t.state()).canAutoComplete, true, 'Finish enabled on waste-recycle endgame');
      t.equal((await t.game('act', 'autoComplete')).ok, true, 'autoComplete succeeds');
      await t.page.waitForFunction(() => window.__game.getState().won, null, { timeout: 10000 });
      s = await t.state();
      t.equal([s.moves, s.score, s.undoDepth], [15, 530, 1], 'autoComplete applies exact per-action moves (+5), Pass 2 recycle fee (-50 + 30 direct waste->found = 80), Standard efficiency bonus (+450 = 530), and single Undo snapshot');

      // 3. Superseded async hint(true) never stamps S.assisted
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: ['#2C'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['9H'], t1: ['TS'], t2: ['AS'], t3: [], t4: [], t5: [], t6: [] },
      });
      await t.page.evaluate(() => {
        document.getElementById('bHint').click(); // queues async hintJob via setTimeout(..., 0)
        window.__game.act('move', 't0', 't1');    // supersedes hintJob before its turn fires
      });
      await t.page.waitForTimeout(150);
      t.equal(await t.page.locator('#assistTag').isHidden(), true, 'superseded async Hint does not stamp assisted tag');

      // 4. refuseDrag() explains non-capacity illegal drags via explain(tapReason()) & Waste drops explain waste rule
      await t.game('setState', {
        mode: 'spider', opts: { suits: 2 },
        piles: { stock: [], f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [], t0: ['7H', '6S'], t1: ['8H'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [] },
      });
      await dragCard(t, 't0', 0, 't1'); // mixed-suit 7H-6S cannot lift
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), 'Only a run of one suit, in order, moves together', 'refuseDrag explains mixed-suit Spider refusal');

      await t.game('setState', {
        mode: 'freecell',
        piles: { c0: [], c1: [], c2: [], c3: [], f0: [], f1: [], f2: [], f3: [], t0: ['8S', '6C'], t1: ['9H'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [] },
      });
      await dragCard(t, 't0', 0, 't1'); // non-alternating/non-sequential stack cannot lift
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), 'Only a run that builds down in alternating colors moves together', 'refuseDrag explains non-alternating FreeCell refusal');

      // Dropping onto Klondike Waste explains the Waste rule
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: ['#2C'], waste: ['8H'], f0: [], f1: [], f2: [], f3: [], t0: ['7S'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      await dragCard(t, 't0', 0, 'waste');
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), 'Cards draw from the waste, not onto it', 'dropping onto Klondike Waste explains Waste rule');
    },
  },
  {
    name: 'play-33 52-card Finish audio past 1500 ms, autoCueBus skip cancellation, click-free master mute/volume, 0.2 s manual toggles, & non-win modal guard (W6-S5-05)',
    viewports: ['desktop'],
    initScript: () => {
      window.__ap = { targets: [], ramps: [] };
      const st = AudioParam.prototype.setTargetAtTime;
      AudioParam.prototype.setTargetAtTime = function (target, startTime, timeConstant) {
        window.__ap.targets.push({ target, startTime, tc: timeConstant });
        return st.apply(this, arguments);
      };
      const lr = AudioParam.prototype.linearRampToValueAtTime;
      AudioParam.prototype.linearRampToValueAtTime = function (value, endTime) {
        window.__ap.ramps.push({ value, endTime, dur: endTime - (window.__acNow ? window.__acNow() : 0) });
        return lr.apply(this, arguments);
      };
      const OrigAC = window.AudioContext || window.webkitAudioContext;
      if (OrigAC) {
        const Wrap = function (...a) { const ac = new OrigAC(...a); window.__acNow = () => ac.currentTime; return ac; };
        Wrap.prototype = OrigAC.prototype;
        window.AudioContext = Wrap;
      }
    },
    async run(t) {
      const full52 = () => ({
        mode: 'klondike', opts: { draw: 1 },
        piles: {
          stock: [], waste: [], f0: [], f1: [], f2: [], f3: [],
          t0: run('C').reverse(), t1: run('D').reverse(), t2: run('H').reverse(), t3: run('S').reverse(),
          t4: [], t5: [], t6: [],
        },
      });
      await baseSettings(t, { sound: true, music: true, ambience: true, motion: 'full', autoFoundation: 'off' });
      await t.page.mouse.click(5, 5); // gesture initializes AudioContext
      await t.page.waitForFunction(() => window.__game.audioState().ready, null, { timeout: 5000 });

      // 1. Full 52-card Finish chimes past 1500 ms all the way through the Kings (<= 8000 ms clamp)
      await t.game('setState', full52());
      await t.game('cuesPlayed', true);
      await t.page.evaluate(() => { window.__ap.targets.length = 0; window.__ap.ramps.length = 0; });
      t.equal((await t.game('act', 'autoComplete')).ok, true, '52-card Finish starts');
      const finCues = (await t.game('cuesPlayed')).filter((c) => c.name === 'found');
      const maxWait = Math.max(...finCues.map((c) => c.wait));
      const gaps = finCues.slice(1).map((c, i) => c.wait - finCues[i].wait);
      t.expect(finCues.length >= 45, '52-card Finish sounds past the old 19-card cutoff (got ' + finCues.length + ' found cues)');
      t.expect(maxWait > 3.0 && maxWait <= 8.0, 'final Finish chimes extend past 3.0 s within 8.0 s clamp: ' + maxWait.toFixed(3) + ' s');
      t.expect(finCues.some((c) => c.arg === 13 && c.wait > 3.0), 'Kings chime near the end of the 52-card cascade');
      t.expect(gaps.every((g) => g >= 0.058), 'sorted auto cues preserve >= 60 ms thinning floor');

      // 2. Modifier keys do NOT skip Finish; real key skips & immediately cancels autoCueBus (15 ms ramp to 0.0001); 2nd press jumps to Win modal
      t.equal((await t.state()).finishing, true, '52-card Finish marks finishing=true');
      await t.game('act', 'key', 'Shift');
      await t.game('act', 'key', 'Tab');
      t.equal((await t.state()).finishing, true, 'Shift/Tab modifier keys do not skip Finish');
      await t.page.evaluate(() => { window.__ap.ramps.length = 0; });
      await t.game('act', 'key', ' ');
      const skipRamps = await t.page.evaluate(() => window.__ap.ramps.slice());
      t.expect(skipRamps.some((r) => r.value <= 0.001 && r.dur <= 0.05), 'skipFinish cancels autoCueBus promptly (<=50 ms ramp to 0.0001): ' + JSON.stringify(skipRamps));
      t.equal((await t.state()).finishing, false, 'first skip press exits finishing state');
      // Second press within 250 ms skip window jumps straight to Win modal
      await t.game('act', 'key', ' ');
      t.equal((await t.state()).modal, 'win', 'second press during skip window opens Win modal immediately');
      await t.game('scene', 'game');

      // 3. Smooth master.gain ramp (tau=0.018) on volume & mute + synchronous masterGain() + 0.2 s manual Music/Ambience toggle fades
      await t.page.evaluate(() => { window.__ap.targets.length = 0; window.__ap.ramps.length = 0; });
      await t.game('setSettings', { volume: 0.5 });
      const volCheck = await t.page.evaluate(() => ({ mg: window.__game.masterGain(), targets: window.__ap.targets.slice() }));
      t.expect(volCheck.mg === 0.25 || volCheck.mg === 0.5, 'masterGain() updates synchronously: ' + volCheck.mg);
      t.expect(volCheck.targets.some((x) => Math.abs(x.tc - 0.018) < 0.002 && Math.abs(x.target - volCheck.mg) < 0.002), 'volume ramps smoothly with tau=0.018 (no zipper steps): ' + JSON.stringify(volCheck.targets));

      await t.page.evaluate(() => { window.__ap.targets.length = 0; window.__ap.ramps.length = 0; });
      await t.game('setSettings', { sound: false });
      const muteCheck = await t.page.evaluate(() => ({ mg: window.__game.masterGain(), targets: window.__ap.targets.slice() }));
      t.equal(muteCheck.mg, 0, 'masterGain() reports 0 synchronously on mute');
      t.expect(muteCheck.targets.some((x) => x.target === 0 && Math.abs(x.tc - 0.018) < 0.002), 'Master Sound OFF ramps master.gain smoothly to 0 in ~80 ms (tau=0.018): ' + JSON.stringify(muteCheck.targets));

      await t.game('setSettings', { sound: true, music: true, ambience: true });
      await t.page.evaluate(() => { window.__ap.ramps.length = 0; });
      await t.game('setSettings', { music: false });
      const musRamps = await t.page.evaluate(() => window.__ap.ramps.slice());
      t.expect(musRamps.some((r) => r.value <= 0.001 && r.dur >= 0.15 && r.dur <= 0.35), 'manual Music OFF fades crisply in ~0.2 s (not 2.5 s): ' + JSON.stringify(musRamps));

      await t.page.evaluate(() => { window.__ap.ramps.length = 0; });
      await t.game('setSettings', { ambience: false });
      const ambRamps = await t.page.evaluate(() => window.__ap.ramps.slice());
      t.expect(ambRamps.some((r) => r.value <= 0.001 && r.dur >= 0.15 && r.dur <= 0.35), 'manual Ambience OFF fades crisply in ~0.2 s (not 2.5 s): ' + JSON.stringify(ambRamps));

      // 4. Opening a non-win modal during winTimer/cascade cancels ceremony cleanly (never hijacks open modal) & S.won blocks gameplay shortcuts
      await t.game('setState', nearWinKlondike());
      await t.game('act', 'move', 't0', 'f3');
      t.equal((await t.state()).won, true, 'game won');
      t.equal((await t.game('act', 'key', 'd')).ok, false, 'S.won blocks gameplay shortcuts in gameKey()');
      await t.game('scene', 'menu');
      await t.page.waitForTimeout(700);
      const afterMenu = await t.state();
      t.equal([afterMenu.modal, afterMenu.ceremony], ['menu', false], 'opening Menu during winTimer/cascade cancels ceremony cleanly without hijack');
    },
  },
  {
    name: 'play-34 W4-B03 2D side-rail keyboard, scroll-aware 16 ms radial Gamepad & shoulders, canvas hover & lifted keyboard hold (W6-S5-08)',
    viewports: ['desktop'],
    initScript: () => {
      const pad = { id: 'Test pad W4-B03', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      window.__pad = pad;
      navigator.getGamepads = () => (pad.connected ? [pad, null, null, null] : [null, null, null, null]);
    },
    async run(t) {
      const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, VIEW: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
      const polled = async (n) => { const p0 = await t.game('pad'); await t.page.waitForFunction((k) => window.__game.pad().polls >= k, p0.polls + n, { timeout: 8000 }); };
      const tapBtn = async (name) => {
        await t.page.evaluate((i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; }, BTN[name]);
        await polled(2);
        await t.page.evaluate((i) => { window.__pad.buttons[i] = { pressed: false, value: 0 }; }, BTN[name]);
        await polled(2);
      };

      await baseSettings(t, { sound: false, tips: false, motion: 'reduced', autoFoundation: 'off' });

      // 1. 2D Geometric Side-Rail Keyboard Navigation on Yukon desktop (1280x800, L.arr === 'side')
      await t.page.setViewportSize({ width: 1280, height: 800 });
      await t.game('newGame', { mode: 'yukon', deal: 42 });
      await t.waitForStable();
      await t.page.focus('#cv');
      // Jump directly to column 7 (t6) via '7', then step right into foundation rail, down, left, back to tableau
      await t.page.keyboard.press('7');
      t.equal((await t.state()).cursor.pile, 't6', 'Yukon desktop: 7 jumps to t6');
      await t.page.keyboard.press('ArrowRight');
      t.equal((await t.state()).cursor.pile, 'f0', 'Yukon side-rail: ArrowRight from t6 enters f0');
      await t.page.keyboard.press('ArrowRight');
      t.equal((await t.state()).cursor.pile, 'f1', 'Yukon side-rail: ArrowRight from f0 reaches f1');
      await t.page.keyboard.press('ArrowDown');
      t.equal((await t.state()).cursor.pile, 'f3', 'Yukon side-rail: ArrowDown from f1 steps down to f3');
      await t.page.keyboard.press('ArrowLeft');
      t.equal((await t.state()).cursor.pile, 'f2', 'Yukon side-rail: ArrowLeft from f3 reaches f2');
      await t.page.keyboard.press('ArrowLeft');
      t.equal((await t.state()).cursor.pile, 't6', 'Yukon side-rail: ArrowLeft from f2 returns to t6');
      // Tableau ArrowUp/ArrowDown run-depth stepping stays intact on Yukon side-rail
      const depthEnd = (await t.state()).cursor.depth;
      await t.page.keyboard.press('ArrowUp');
      const depthUp = (await t.state()).cursor.depth;
      t.expect(depthUp < depthEnd, 'Yukon side-rail preserves tableau ArrowUp run-depth stepping: ' + depthEnd + ' -> ' + depthUp);
      await t.page.keyboard.press('ArrowDown');
      t.equal((await t.state()).cursor.depth, depthEnd, 'Yukon side-rail preserves tableau ArrowDown run-depth stepping');

      // Klondike phone landscape (844x390, L.arr === 'side') + left-handed mirroring
      await t.page.setViewportSize({ width: 844, height: 390 });
      await t.game('newGame', { mode: 'klondike', deal: 43 });
      await t.waitForStable();
      await t.page.focus('#cv');
      await t.page.keyboard.press('7');
      await t.page.keyboard.press('ArrowRight');
      const rightRail = (await t.state()).cursor.pile;
      t.expect(['stock', 'waste', 'f0', 'f1', 'f2', 'f3'].includes(rightRail), 'Klondike 844x390 side-rail: ArrowRight from t6 enters right rail (' + rightRail + ')');
      await t.page.keyboard.press('ArrowDown');
      const railDown = (await t.state()).cursor.pile;
      t.expect(railDown !== rightRail && ['stock', 'waste', 'f0', 'f1', 'f2', 'f3'].includes(railDown), 'Klondike 844x390 side-rail: ArrowDown moves vertically along side rail (' + rightRail + ' -> ' + railDown + ')');
      // Left-handed layout mirrors side rail to left of t0
      await t.game('setSettings', { leftHanded: true });
      await t.page.focus('#cv');
      await t.page.keyboard.press('1');
      await t.page.keyboard.press('ArrowLeft');
      const leftRail = (await t.state()).cursor.pile;
      t.expect(['stock', 'waste', 'f0', 'f1', 'f2', 'f3'].includes(leftRail), 'Klondike 844x390 left-handed: ArrowLeft from t0 enters left rail (' + leftRail + ')');
      await t.game('setSettings', { leftHanded: false });

      // 2. Desktop canvas hover signifiers (grab/pointer/clear) & lifted keyboard hold cleanliness
      await t.page.setViewportSize({ width: 1280, height: 800 });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: ['2C', '3C'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['AS'], t1: ['9H'], t2: ['TS'], t3: [], t4: [], t5: [], t6: [] },
      });
      await t.waitForStable();
      const lay = await t.game('getLayout');
      const t0c = lay.piles.t0.cards[0], stp = lay.piles.stock;
      await t.page.mouse.move(t0c.x + t0c.w / 2, t0c.y + 20);
      t.equal(await t.page.evaluate(() => document.getElementById('cv').style.cursor), 'grab', 'hovering a movable card sets grab cursor');
      await t.page.mouse.move(stp.x + lay.cardW / 2, stp.y + 20);
      t.equal(await t.page.evaluate(() => document.getElementById('cv').style.cursor), 'pointer', 'hovering stock sets pointer cursor');
      await t.page.mouse.move(lay.piles.t5.x + lay.cardW / 2, lay.piles.t5.y + 20);
      t.equal(await t.page.evaluate(() => document.getElementById('cv').style.cursor), '', 'hovering empty felt clears cursor');

      // Keyboard hold keeps getState().held schema exact ({from, index}) with zero internal leaks
      await t.page.focus('#cv');
      await t.page.keyboard.press('2');
      await t.page.keyboard.press('Enter');
      t.equal((await t.state()).held, { from: 't1', index: 0 }, 'keyboard hold keeps clean {from, index} state');
      await t.page.keyboard.press('Escape');
      t.equal((await t.state()).held, null, 'Escape puts back keyboard-held card');

      // 3. 16 ms rAF Gamepad polling, radial stick deadzone (>0.38), RB/LB/View bindings & B cascade skip
      const pStart = (await t.game('pad')).polls;
      await t.page.waitForTimeout(300);
      const pAfter = (await t.game('pad')).polls;
      t.expect(pAfter - pStart >= 10, 'Gamepad rAF polls briskly (~60 Hz, got ' + (pAfter - pStart) + ' polls in 300 ms)');

      // Radial deadzone: (0.25, 0.25) has hypot 0.354 <= 0.38 -> ignored; (0.55, 0) > 0.38 -> moves cursor
      await t.page.keyboard.press('1');
      const cBefore = (await t.state()).cursor.pile;
      await t.page.evaluate(() => { window.__pad.axes[0] = 0.25; window.__pad.axes[1] = 0.25; });
      await polled(4);
      t.equal((await t.state()).cursor.pile, cBefore, 'diagonal stick (0.25, 0.25) inside 0.38 radial deadzone does not drift cursor');
      await t.page.evaluate(() => { window.__pad.axes[0] = 0.55; window.__pad.axes[1] = 0; });
      await polled(2);
      await t.page.evaluate(() => { window.__pad.axes[0] = 0; window.__pad.axes[1] = 0; });
      await polled(2);
      t.equal((await t.state()).cursor.pile, 't1', 'stick deflection (0.55, 0) outside 0.38 radial deadzone moves cursor right');

      // RB auto-moves cursor card (9H -> TS), B undoes, LB redoes
      await tapBtn('RB');
      t.equal((await t.state()).piles.t2, ['TS', '9H'], 'Gamepad RB auto-moves selected card (t)');
      await tapBtn('B');
      t.equal((await t.state()).piles.t2, ['TS'], 'Gamepad B undoes move');
      await tapBtn('LB');
      t.equal((await t.state()).piles.t2, ['TS', '9H'], 'Gamepad LB redoes move (y)');

      // View triggers Finish / Bath Ticket; B skips active cascade
      await t.game('setSettings', { motion: 'full' });
      await t.game('setState', nearWinKlondike());
      await tapBtn('VIEW');
      await t.page.waitForFunction(() => window.__game.getState().won, null, { timeout: 5000 });
      await t.page.waitForFunction(() => window.__game.getState().ceremony || window.__game.getState().modal === 'win', null, { timeout: 5000 });
      if ((await t.state()).ceremony) await tapBtn('B'); // B skips active cascade -> opens Win modal
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 5000 });
      await tapBtn('B'); // close Win modal
      t.equal((await t.state()).modal, null, 'Gamepad B closes Win modal');
      await tapBtn('VIEW'); // View reopens Bath Ticket on won board
      t.equal((await t.state()).modal, 'win', 'Gamepad View reopens Bath Ticket after closing Win');
      await tapBtn('B');

      // 4. Scroll-aware Gamepad modal navigation & right-stick scrolling (844x390 landscape forces #sheetBody overflow)
      await t.game('setSettings', { motion: 'reduced' });
      await t.page.setViewportSize({ width: 844, height: 390 });
      await t.game('scene', 'settings');
      const overflowCheck = await t.page.evaluate(() => { const sb = document.getElementById('sheetBody'); return sb.scrollHeight > sb.clientHeight; });
      t.equal(overflowCheck, true, '844x390 Settings #sheetBody overflows vertically');
      // Walk D-pad down 14 steps so focus travels deep into #sheetBody
      for (let i = 0; i < 14; i++) await tapBtn('DOWN');
      const scrollNav = await t.page.evaluate(() => {
        const sb = document.getElementById('sheetBody'), ae = document.activeElement;
        const sbr = sb.getBoundingClientRect(), aer = ae ? ae.getBoundingClientRect() : null;
        return {
          scrollTop: Math.round(sb.scrollTop),
          inBody: !!ae && sb.contains(ae),
          visibleInBody: !!aer && aer.top >= sbr.top - 4 && aer.bottom <= sbr.bottom + 4,
        };
      });
      t.expect(scrollNav.scrollTop > 0 && (!scrollNav.inBody || scrollNav.visibleInBody), 'Gamepad D-pad modal nav scrolls focused controls into #sheetBody viewport: ' + JSON.stringify(scrollNav));

      // Right-stick Y axis scrolls #sheetBody cleanly
      await t.page.evaluate(() => { document.getElementById('sheetBody').scrollTop = 0; window.__pad.axes[3] = 0.85; });
      await polled(6);
      await t.page.evaluate(() => { window.__pad.axes[3] = 0; });
      const rsScroll = await t.page.evaluate(() => Math.round(document.getElementById('sheetBody').scrollTop));
      t.expect(rsScroll >= 30, 'Gamepad right-stick Y axis scrolls #sheetBody (' + rsScroll + ' px)');

      // Disconnecting gamepad stops rAF polling completely
      await t.page.evaluate(() => { window.__pad.connected = false; window.dispatchEvent(new Event('gamepaddisconnected')); });
      const pOff1 = (await t.game('pad')).polls;
      await t.page.waitForTimeout(160);
      const pOff2 = (await t.game('pad')).polls;
      t.equal(pOff2, pOff1, 'disconnecting gamepad halts rAF polling (0 idle polls)');
    },
  },
  {
    name: 'play-35 signed rawScore conservation blocks zero-clamped foundation pullback farming (W1-P-N03)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced', scoring: 'standard', autoFoundation: 'off', tips: false });
      // 1. Klondike Draw 1 Pass-2 recycle drives rawScore negative while keeping displayed S.score floored at 0;
      //    pulling a foundation card down (-15) and re-pushing it (+10) must never regenerate positive points.
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 }, score: 20, recycles: 1,
        piles: {
          stock: [], waste: ['9C'],
          f0: ['AS', '2S'], f1: [], f2: [], f3: [],
          t0: ['3H'], t1: ['KD'], t2: [], t3: [], t4: [], t5: [], t6: [],
        },
      });
      await t.game('act', 'draw'); // Pass 2 recycle: -50 => rawScore -30, displayed score 0
      let s = await t.state();
      t.equal([s.score, s.rawScore], [0, -30], 'Pass-2 recycle clamps display score at 0 while conserving rawScore = -30');
      t.equal(await t.page.textContent('#sScore'), '0', 'HUD #sScore displays non-negative 0');

      await t.game('act', 'move', 'f0', 't0'); // pullback 2S -> 3H: -15 => rawScore -45, score 0
      s = await t.state();
      t.equal([s.score, s.rawScore], [0, -45], 'foundation pullback at 0 decrements rawScore to -45');

      await t.game('act', 'move', 't0', 'f0'); // re-push 2S -> f0: +10 => rawScore -35, score 0 (NOT +10!)
      s = await t.state();
      t.equal([s.score, s.rawScore], [0, -35], 're-pushing pulled card cannot regenerate points (score stays 0, rawScore = -35)');
      t.equal(await t.page.textContent('#sScore'), '0', 'HUD #sScore stays 0 after pullback/re-push cycle');

      // 2. Undo and Redo restore signed rawScore accurately across negative states
      await t.game('act', 'undo');
      s = await t.state();
      t.equal([s.score, s.rawScore], [0, -45], 'Undo restores rawScore = -45');
      await t.game('act', 'undo');
      s = await t.state();
      t.equal([s.score, s.rawScore], [0, -30], 'second Undo restores rawScore = -30');
      await t.game('act', 'undo');
      s = await t.state();
      t.equal([s.score, s.rawScore], [20, 20], 'third Undo restores pre-recycle score = 20 and rawScore = 20');
      await t.game('act', 'redo');
      await t.game('act', 'redo');
      await t.game('act', 'redo');
      s = await t.state();
      t.equal([s.score, s.rawScore], [0, -35], 'Redo re-applies signed rawScore = -35');

      // 3. Direct zero-floor pullback (starting at score 0, rawScore 0) also conserves signed net score
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 }, score: 0,
        piles: {
          stock: [], waste: [],
          f0: ['AS', '2S'], f1: [], f2: [], f3: [],
          t0: ['3H'], t1: ['AH'], t2: [], t3: [], t4: [], t5: [], t6: [],
        },
      });
      await t.game('act', 'move', 'f0', 't0'); // -15 => rawScore -15, score 0
      await t.game('act', 'move', 't0', 'f0'); // +10 => rawScore -5, score 0
      s = await t.state();
      t.equal([s.score, s.rawScore], [0, -5], 'zero-floor pullback + re-push nets -5 instead of +10');
      await t.game('act', 'move', 't1', 'f1'); // +10 => rawScore +5, score 5
      s = await t.state();
      t.equal([s.score, s.rawScore], [5, 5], 'subsequent legitimate +10 lifts rawScore from -5 to +5 and display score to 5');

      // 4. Negative rawScore persists across reload (save + resumeSaved), and legacy saves without rawScore default cleanly
      // Use a full 52-card deck so validSave() accepts the persisted save across reload.
      const rest48 = run('C').concat(run('D'), run('H'), run('S')).filter((c) => !['AS', '2S', '3H', '9C'].includes(c));
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 }, deal: 903, score: 20, recycles: 1,
        piles: {
          stock: [], waste: ['9C'],
          f0: ['AS', '2S'], f1: [], f2: [], f3: [],
          t0: ['3H'], t1: rest48, t2: [], t3: [], t4: [], t5: [], t6: [],
        },
      });
      await t.game('act', 'draw');             // rawScore -30, score 0
      await t.game('act', 'move', 'f0', 't0'); // rawScore -45, score 0
      await t.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      await t.page.waitForFunction(() => {
        const raw = localStorage.getItem('spa-solitaire:v1:current');
        return raw && JSON.parse(raw).state && JSON.parse(raw).state.deal === 903 && JSON.parse(raw).state.rawScore === -45;
      });
      await t.page.reload({ waitUntil: 'domcontentloaded' });
      await t.page.waitForFunction(() => !!window.__game);
      await t.page.click('#tCont');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'game');
      s = await t.state();
      t.equal([s.score, s.rawScore, s.undoDepth], [0, -45, 2], 'reloaded save preserves negative rawScore and undo snapshots');
      await t.game('act', 'move', 't0', 'f0'); // +10 => rawScore -35, score 0
      s = await t.state();
      t.equal([s.score, s.rawScore], [0, -35], 're-pushing after reload still cannot regenerate points');

      // Legacy save without rawScore field restores cleanly with rawScore === score
      await t.game('scene', 'title');
      await t.page.evaluate(() => {
        const k = 'spa-solitaire:v1:current';
        const cur = JSON.parse(localStorage.getItem(k));
        delete cur.state.rawScore;
        cur.state.score = 15;
        if (Array.isArray(cur.undo)) cur.undo.forEach((sn) => delete sn.rawScore);
        localStorage.setItem(k, JSON.stringify(cur));
      });
      await t.page.reload({ waitUntil: 'domcontentloaded' });
      await t.page.waitForFunction(() => !!window.__game);
      await t.page.click('#tCont');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'game');
      s = await t.state();
      t.equal([s.score, s.rawScore], [15, 15], 'legacy save without rawScore defaults rawScore to saved score');
    },
  },
  {
    name: 'play-36 Select & place and hybrid tap-to-drop accept full-lane empty tableau hit zones down to L.bottom (W6-P-N02)',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'reduced', tapMove: 'select', autoFoundation: 'off' });

      // 1. Klondike in Select & place: pick up King, tap well below top card box inside empty column t2 lane -> drops King
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['#5C', 'KS'], t1: ['9H'], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      await t.waitForStable();
      let lay = await t.game('getLayout');
      const kCard = lay.piles.t0.cards[1], t2 = lay.piles.t2;
      const laneY = Math.min(lay.bottom - 14, t2.y + lay.cardH + Math.max(40, (lay.bottom - (t2.y + lay.cardH)) * 0.5));
      t.expect(laneY > t2.y + lay.cardH + 10, 'lower empty-lane click y sits well below single-card box: ' + Math.round(laneY) + ' > ' + Math.round(t2.y + lay.cardH));
      await t.page.mouse.click(kCard.x + kCard.w / 2, kCard.y + kCard.h / 2);
      t.equal((await t.state()).held, { from: 't0', index: 1 }, 'Select & place picks up KS');
      await t.page.mouse.click(t2.x + lay.cardW / 2, laneY);
      let s = await t.state();
      t.equal([s.held, s.piles.t2, s.piles.t0], [null, ['KS'], ['5C']], 'tapping lower empty tableau lane places KS and flips #5C');

      // 2. FreeCell in Select & place: pick up non-King card, tap lower empty column t3 lane -> drops card
      await t.game('setState', {
        mode: 'freecell',
        piles: { c0: [], c1: [], c2: [], c3: [], f0: [], f1: [], f2: [], f3: [], t0: ['9C', '5H'], t1: ['KD'], t2: ['QC'], t3: [], t4: ['2S'], t5: ['3S'], t6: ['4S'], t7: ['5S'] },
      });
      await t.waitForStable();
      lay = await t.game('getLayout');
      const c5 = lay.piles.t0.cards[1], t3 = lay.piles.t3;
      const fcLaneY = Math.min(lay.bottom - 14, t3.y + lay.cardH + Math.max(40, (lay.bottom - (t3.y + lay.cardH)) * 0.5));
      await t.page.mouse.click(c5.x + c5.w / 2, c5.y + c5.h / 2);
      t.equal((await t.state()).held, { from: 't0', index: 1 }, 'Select & place picks up 5H in FreeCell');
      await t.page.mouse.click(t3.x + lay.cardW / 2, fcLaneY);
      s = await t.state();
      t.equal([s.held, s.piles.t3, s.piles.t0], [null, ['5H'], ['9C']], 'FreeCell lower empty tableau lane accepts held 5H');

      // 3. Hybrid keyboard pickup (tapMove:'tap') + pointer tap on lower empty column lane -> drops King
      await t.game('setSettings', { tapMove: 'tap' });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['#2D', 'KH'], t1: ['8C'], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      await t.waitForStable();
      lay = await t.game('getLayout');
      await t.page.focus('#cv');
      await t.page.keyboard.press('1');
      await t.page.keyboard.press('Enter');
      t.equal((await t.state()).held, { from: 't0', index: 1 }, 'keyboard Enter picks up KH');
      const t4 = lay.piles.t4;
      const hybLaneY = Math.min(lay.bottom - 14, t4.y + lay.cardH + Math.max(40, (lay.bottom - (t4.y + lay.cardH)) * 0.5));
      await t.page.mouse.click(t4.x + lay.cardW / 2, hybLaneY);
      s = await t.state();
      t.equal([s.held, s.piles.t4, s.piles.t0], [null, ['KH'], ['2D']], 'hybrid keyboard pickup + lower empty-lane tap places KH');

      // 4. Tapping empty felt outside any column x (or below L.bottom) while holding still puts the card back cleanly
      await t.game('setSettings', { tapMove: 'select' });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['#2D', 'KH'], t1: ['8C'], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      await t.waitForStable();
      lay = await t.game('getLayout');
      const kh = lay.piles.t0.cards[1];
      await t.page.mouse.click(kh.x + kh.w / 2, kh.y + kh.h / 2);
      t.equal((await t.state()).held, { from: 't0', index: 1 }, 'KH held before miss-click');
      // Click the narrow horizontal gap between columns t2 and t3 (or far left margin) where no pile spans x
      const missX = lay.piles.t0.x > 6 ? 2 : (lay.piles.t2.x + lay.cardW + lay.piles.t3.x) / 2;
      await t.page.mouse.click(missX, lay.bottom - 10);
      t.equal((await t.state()).held, null, 'tapping outside column lanes still puts held card back');
      t.equal((await t.state()).piles.t0, ['#2D', 'KH'], 'KH remains on t0 after put-back');
    },
  },
  {
    name: 'play-37 Select & place sets t0 and runs 90 ms lift ease on wobbly-tap and same-column re-select (W6-S5-06)',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full', tapMove: 'select', autoFoundation: 'off' });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['KH', 'QS'], t1: ['9C'], t2: [], t3: [], t4: [], t5: [], t6: [] },
      });
      await t.waitForStable();
      const lay = await t.game('getLayout');
      const c0 = lay.piles.t0.cards[0], c1 = lay.piles.t0.cards[1];

      // 1. Wobbly-tap pickup (exceeds 6px mouse drag threshold to enter finishDrag(), stays < DRAG_TAP_REACH * 6 = 15px)
      const cx1 = c1.x + c1.w / 2, cy1 = c1.y + c1.h / 2;
      await t.page.mouse.move(cx1, cy1);
      await t.page.mouse.down();
      await t.page.mouse.move(cx1 + 9, cy1, { steps: 3 });
      const wasDrag = await t.game('dragInfo');
      t.expect(!!wasDrag, 'wobbly press crosses drag threshold into finishDrag() path');
      const tBeforeWobble = await t.page.evaluate(() => performance.now());
      await t.page.mouse.up();
      const afterWobble = await t.page.evaluate(() => ({
        now: performance.now(),
        held: window.__game.heldInfo(),
        raf: window.__game.runtimeEconomy().rafActive,
      }));
      t.equal([afterWobble.held && afterWobble.held.from, afterWobble.held && afterWobble.held.index], ['t0', 1], 'wobbly-tap picks up QS in Select & place');
      t.expect(afterWobble.held && afterWobble.held.t0 >= tBeforeWobble - 2 && afterWobble.held.t0 <= afterWobble.now + 2, 'wobbly-tap pickup stamps fresh t0 for 90 ms lift ease: ' + JSON.stringify({ tBeforeWobble, afterWobble }));
      t.equal(afterWobble.raf, true, 'wobbly-tap pickup schedules rAF loop via startLoop()');

      // Wait until the 90 ms lift ease completes and the loop returns to idle
      await t.page.waitForFunction(() => !window.__game.runtimeEconomy().rafActive, null, { timeout: 5000 });
      const wobbleT0 = afterWobble.held.t0;

      // 2. Same-column depth re-select (tap exposed strip of KH while holding QS)
      await t.game('frameStats', true);
      const tBeforeReselect = await t.page.evaluate(() => performance.now());
      await t.page.mouse.click(c0.x + c0.w / 2, c0.y + Math.max(4, Math.min(12, (c1.y - c0.y) * 0.5)));
      const afterReselect = await t.page.evaluate(() => ({
        now: performance.now(),
        held: window.__game.heldInfo(),
        raf: window.__game.runtimeEconomy().rafActive,
      }));
      t.equal([afterReselect.held && afterReselect.held.from, afterReselect.held && afterReselect.held.index], ['t0', 0], 'same-column re-select shifts held depth to KH (index 0)');
      t.expect(afterReselect.held && afterReselect.held.t0 >= tBeforeReselect - 2 && afterReselect.held.t0 > wobbleT0, 'same-column re-select stamps fresh t0 for 90 ms lift ease: ' + JSON.stringify({ wobbleT0, tBeforeReselect, afterReselect }));
      t.equal(afterReselect.raf, true, 'same-column re-select schedules rAF loop via startLoop()');

      // Confirm multiple lift animation frames render over the 90 ms ease and stop cleanly once complete
      await t.page.waitForFunction(() => !window.__game.runtimeEconomy().rafActive, null, { timeout: 5000 });
      const stats = await t.game('frameStats');
      t.expect(stats.frames >= 2, 'same-column re-select renders multi-frame 90 ms lift ease (' + stats.frames + ' frames)');
      await t.shot('play-37-w6-s5-06-reselect-held');
    },
  },
];
