// Wave 5 Batch W5-B04: Klondike multi-pass Finish drops virtual stock-draw stagger padding & resize during Finish calls skipFinish semantics (W5-M4)
import { baseSettings } from './_util.mjs';

const run = (s) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].map((r) => r + s);

function multiPassStockDraw1() {
  // AH is blocked on t0 under KS, so 2H..KH stay in stock/waste as blockers between every Spade card.
  // Draw order (stock.pop()): QS, KH, JS, QH, TS, JH, 9S, TH, 8S, 9H, 7S, 8H, 6S, 7H, 5S, 6H, 4S, 5H, 3S, 4H, 2S, 3H, AS, 2H.
  // Forces 12 full passes (222 virtual stock draws + 12 recycles). Previously injected 234*40 = 9360 ms of dead pauses
  // (up to 920 ms between consecutive cards, pushing total d past LAND_MAX_MS = 8000 ms and clamping/dropping late chimes).
  const stock = [
    '2H', 'AS', '3H', '2S', '4H', '3S', '5H', '4S', '6H', '5S', '7H', '6S',
    '8H', '7S', '9H', '8S', 'TH', '9S', 'JH', 'TS', 'QH', 'JS', 'KH', 'QS',
  ];
  return {
    mode: 'klondike', opts: { draw: 1 }, score: 1000, moves: 10, recycles: 0,
    piles: {
      stock, waste: [],
      f0: run('C'), f1: run('D'), f2: [], f3: [],
      t0: ['AH', 'KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [],
    },
  };
}

function multiPassStockDraw3() {
  // Draw 3 with blockers: AH under KS on t0, f3 has A..7S, t1 has QS,JS,TS.
  // Pass 1: draw 3 (5H,4H,9S -> top 9S), draw 3 (3H,2H,8S -> top 8S), play 8S -> waste [5H,4H,9S,3H,2H]
  // Recycle 1 (recycles 1->2 => -20 fee!): stock = [2H,3H,9S,4H,5H]
  // Pass 2: draw 3 (5H,4H,9S -> top 9S), play 9S, play TS,JS,QS,KS,AH from t1/t0, draw 2 (3H,2H), play 2H,3H,4H,5H -> win!
  // Moves: 10 + 2 draws + 1 play + 1 recycle + 1 draw + 6 plays + 1 draw + 4 plays = 26
  // Card pts: 500 + 6*15 (waste->found: 8S,9S,2H,3H,4H,5H) + 5*10 (tab->found: TS,JS,QS,KS,AH) - 20 (recycle 2) = 620
  // Standard effBonus(klondike3, 26) = min(450, (240 - 26)*3) = 450 => final score 1070
  return {
    mode: 'klondike', opts: { draw: 3 }, score: 500, moves: 10, recycles: 1,
    piles: {
      stock: ['8S', '2H', '3H', '9S', '4H', '5H'], waste: [],
      f0: run('C'), f1: run('D'), f2: [], f3: ['AS', '2S', '3S', '4S', '5S', '6S', '7S'],
      t0: ['AH', 'KS'], t1: ['QS', 'JS', 'TS'], t2: [], t3: [], t4: [], t5: [], t6: [],
    },
  };
}

function full52Klondike() {
  return {
    mode: 'klondike', opts: { draw: 1 },
    piles: {
      stock: [], waste: [], f0: [], f1: [], f2: [], f3: [],
      t0: run('C').reverse(), t1: run('D').reverse(), t2: run('H').reverse(), t3: run('S').reverse(),
      t4: [], t5: [], t6: [],
    },
  };
}

export const tests = [
  {
    name: 'wave5-m4 Klondike multi-pass stock Finish plays at steady 70 ms beat with identical score/moves and no >150 ms dead pauses',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: true, music: false, ambience: false, tips: false, motion: 'full', autoFoundation: 'off', scoring: 'standard' });
      await t.page.mouse.click(5, 5);
      await t.page.waitForFunction(() => window.__game.audioState().ready, null, { timeout: 5000 });

      // 1. 26-card multi-pass Draw 1 stock (222 virtual draws + 11 recycles; Pass 12 plays QS directly without a 12th recycle):
      // Moves: 10 + 222 draws + 11 recycles + 26 plays = 269 (exceeds parCeil 220 => effBonus = 0)
      // Score: 1000 + 24*15 (waste->found) + 2*10 (tab->found: KS,AH) - 10*50 (Pass 2+ recycles 2..11) = 1000 + 360 + 20 - 500 = 880
      await t.game('setState', multiPassStockDraw1());
      await t.waitForStable();
      await t.game('cuesPlayed', true);
      t.equal((await t.game('act', 'autoComplete')).ok, true, '26-card multi-pass Draw 1 Finish starts');
      const d1Cues = (await t.game('cuesPlayed')).filter((c) => c.name === 'found');
      const d1MaxWait = Math.max(...d1Cues.map((c) => c.wait));
      const d1Gaps = d1Cues.slice(1).map((c, i) => c.wait - d1Cues[i].wait);
      const d1MaxGap = Math.max(...d1Gaps);
      const d1LaunchGaps = await t.page.evaluate(() => {
        const ts = [];
        for (const p of ['f2', 'f3']) for (let i = 0; i < 13; i++) ts.push(window.__game.dispOf(p, i).t0);
        ts.sort((a, b) => a - b);
        return ts.slice(1).map((x, i) => x - ts[i]);
      });
      const s1 = await t.state();
      t.log(`Draw 1 12-pass (222 draws, 11 recycles): cues=${d1Cues.length}, maxWait=${d1MaxWait.toFixed(3)}s, maxCueGap=${(d1MaxGap * 1000).toFixed(1)}ms, maxLaunchGap=${Math.max(...d1LaunchGaps).toFixed(1)}ms, moves=${s1.moves}, score=${s1.score}`);
      t.expect(d1Cues.length >= 22, `foundation chimes sound across the 12-pass Finish without LAND_MAX_MS collapse (got ${d1Cues.length}, pre-fix dropped to 9)`);
      t.expect(d1Cues.some((c) => c.arg === 13), 'Kings chime near the end of the 12-pass Finish');
      t.expect(d1MaxWait < 3.0, `12-pass Finish stays far below 8 s clamp (got ${d1MaxWait.toFixed(3)} s)`);
      t.expect(d1MaxGap <= 0.15, `no pause > 150 ms between found cues (got ${(d1MaxGap * 1000).toFixed(1)} ms)`);
      t.expect(Math.max(...d1LaunchGaps) <= 100, `steady 70 ms beat between card launches (got ${Math.max(...d1LaunchGaps).toFixed(1)} ms)`);
      t.equal([s1.moves, s1.score], [269, 880], 'exact moves (269) and score (880 with 10 Pass-2+ recycle fees) preserved');
      await t.game('act', 'skip');

      // 2. Draw 3 multi-pass stock with Pass-2+ recycle fee (-20)
      await t.game('setState', multiPassStockDraw3());
      await t.waitForStable();
      await t.game('cuesPlayed', true);
      t.equal((await t.game('act', 'autoComplete')).ok, true, 'Draw 3 multi-pass Finish starts');
      const d3Cues = (await t.game('cuesPlayed')).filter((c) => c.name === 'found');
      const d3MaxGap = Math.max(...d3Cues.slice(1).map((c, i) => c.wait - d3Cues[i].wait));
      const d3LaunchGaps = await t.page.evaluate(() => {
        const ts = [];
        for (let i = 0; i < 5; i++) ts.push(window.__game.dispOf('f2', i).t0);
        for (let i = 7; i < 13; i++) ts.push(window.__game.dispOf('f3', i).t0);
        ts.sort((a, b) => a - b);
        return ts.slice(1).map((x, i) => x - ts[i]);
      });
      const s3 = await t.state();
      t.log(`Draw 3 multi-pass: cues=${d3Cues.length}, maxCueGap=${(d3MaxGap * 1000).toFixed(1)}ms, maxLaunchGap=${Math.max(...d3LaunchGaps).toFixed(1)}ms, moves=${s3.moves}, score=${s3.score}`);
      t.expect(Math.max(...d3LaunchGaps) <= 85, `Draw 3 multi-pass launches at steady 70 ms beat without virtual stock padding (got ${Math.max(...d3LaunchGaps).toFixed(1)} ms)`);
      t.expect(d3MaxGap <= 0.18, `Draw 3 multi-pass cue gap stays free of virtual-draw pauses (got ${(d3MaxGap * 1000).toFixed(1)} ms)`);
      t.equal([s3.moves, s3.score], [26, 1070], 'Draw 3 exact moves (26) and score (1070 with -20 recycle fee & Standard effBonus) preserved');
      await t.game('act', 'skip');
    },
  },
  {
    name: 'wave5-m4 resize/rotation during Finish cancels autoCueBus and starts ceremony after 250 ms beat instead of frozen board',
    viewports: ['desktop'],
    initScript: () => {
      window.__apRamps = [];
      const lr = AudioParam.prototype.linearRampToValueAtTime;
      AudioParam.prototype.linearRampToValueAtTime = function (value, endTime) {
        window.__apRamps.push({ value, endTime, dur: endTime - (window.__acNow ? window.__acNow() : 0) });
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
      await baseSettings(t, { sound: true, music: false, ambience: false, tips: false, motion: 'full', autoFoundation: 'off' });
      await t.page.setViewportSize({ width: 390, height: 844 });
      await t.page.mouse.click(5, 5);
      await t.page.waitForFunction(() => window.__game.audioState().ready, null, { timeout: 5000 });

      await t.game('setState', full52Klondike());
      await t.waitForStable();
      await t.game('act', 'autoComplete');
      t.equal((await t.state()).finishing, true, '52-card Finish is running before rotation');

      await t.page.evaluate(() => { window.__apRamps.length = 0; window.__rotT0 = performance.now(); });
      await t.page.setViewportSize({ width: 844, height: 390 });
      await t.page.waitForFunction(() => window.__game.getLayout().stageW > 600, null, { timeout: 5000 });

      const afterRot = await t.page.evaluate(() => ({
        finishing: window.__game.getState().finishing,
        ramps: window.__apRamps.slice(),
      }));
      t.equal(afterRot.finishing, false, 'rotation during Finish exits finishing state immediately (skipFinish semantics)');
      t.expect(afterRot.ramps.some((r) => r.value <= 0.001 && r.dur <= 0.05), 'rotation during Finish cancels pending Finish chimes on autoCueBus');

      const cerMs = await t.page.evaluate(() => new Promise((resolve) => {
        const deadline = window.__rotT0 + 5000;
        const poll = () => {
          if (window.__game.getState().ceremony || performance.now() > deadline) {
            resolve(Math.round(performance.now() - window.__rotT0));
            return;
          }
          requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
      }));
      t.log(`Rotation during 52-card Finish -> ceremony in ${cerMs} ms`);
      t.equal((await t.state()).ceremony, true, 'ceremony started promptly after rotation');
      t.expect(cerMs < 1500, `ceremony started after ~250 ms beat instead of waiting ~3.9 s frozen (got ${cerMs} ms)`);

      await t.game('act', 'skip');
      await t.page.setViewportSize(t.vp);
    },
  },
];
