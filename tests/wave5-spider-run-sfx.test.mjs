// Wave 5 Batch W5-B04: Spider run fanfares staggered to run lift on cancellable autoCueBus; manual moves stay immediate (W5-M3)
import { baseSettings } from './_util.mjs';

const run = (s) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].map((r) => r + s);

function multiRunSpider() {
  const f = run('S');
  return {
    mode: 'spider', opts: { suits: 1 },
    piles: {
      stock: [],
      f0: f, f1: f, f2: f, f3: f, f4: f, f5: [], f6: [], f7: [],
      t0: ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'], t1: ['AS'],
      t2: ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'], t3: ['AS'],
      t4: ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'], t5: ['AS'],
      t6: [], t7: [], t8: [], t9: [],
    },
  };
}

function stockDealCompletesRunSpider() {
  // 10 cards in stock; stock.pop() deals from end -> t0 gets AS, completing KS..AS on t0
  return {
    mode: 'spider', opts: { suits: 1 },
    piles: {
      stock: ['9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S', 'KS', 'AS'],
      f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [],
      t0: ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'],
      t1: ['9S'], t2: ['9S'], t3: ['9S'], t4: ['9S'], t5: ['9S'], t6: ['9S'], t7: ['9S'], t8: ['9S'], t9: ['9S'],
    },
  };
}

function manualRunSpider() {
  return {
    mode: 'spider', opts: { suits: 1 },
    piles: {
      stock: [],
      f0: [], f1: [], f2: [], f3: [], f4: [], f5: [], f6: [], f7: [],
      t0: ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'],
      t1: ['AS'], t2: ['9S'], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [],
    },
  };
}

export const tests = [
  {
    name: 'wave5-m3 Spider Finish & stock-deal run cues spread with their runs on autoCueBus, skip/newGame cancels them, and manual moves sound at once',
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
      await baseSettings(t, { sound: true, music: false, ambience: false, tips: false, motion: 'full' });
      await t.page.mouse.click(5, 5);
      await t.page.waitForFunction(() => window.__game.audioState().ready, null, { timeout: 5000 });

      // 1. Spider Finish: 3 runs spread at their lift staggers (~0.14 s, ~0.68 s, ~1.22 s) on autoCueBus
      await t.game('setState', multiRunSpider());
      await t.waitForStable();
      await t.game('cuesPlayed', true);
      t.equal((await t.game('act', 'autoComplete')).ok, true, 'Spider Finish starts');
      const finRuns = (await t.game('cuesPlayed')).filter((c) => c.name === 'run');
      t.log('Spider Finish run cues: ' + JSON.stringify(finRuns));
      t.equal(finRuns.length, 3, `3 run cues scheduled (got ${finRuns.length})`);
      t.expect(finRuns.every((c) => c.auto === true), 'all Spider Finish run cues route through cancellable autoCueBus');
      t.expect(finRuns[0].wait >= 0.12 && finRuns[0].wait <= 0.20, `1st run cue delayed to 1st run lift (~0.14 s, got ${finRuns[0].wait})`);
      t.expect(finRuns[1].wait - finRuns[0].wait >= 0.50, `2nd run cue staggered after 1st (>=0.50 s gap, got ${(finRuns[1].wait - finRuns[0].wait).toFixed(3)})`);
      t.expect(finRuns[2].wait - finRuns[1].wait >= 0.50, `3rd run cue staggered after 2nd (>=0.50 s gap, got ${(finRuns[2].wait - finRuns[1].wait).toFixed(3)})`);

      // Skip silences pending auto-bus run cues promptly
      await t.page.evaluate(() => { window.__apRamps.length = 0; });
      await t.game('act', 'key', ' ');
      const skipRamps = await t.page.evaluate(() => window.__apRamps.slice());
      t.expect(skipRamps.some((r) => r.value <= 0.001 && r.dur <= 0.05), 'skipFinish cancels autoCueBus holding pending run cues');
      await t.game('act', 'skip');

      // Starting a new deal during Spider Finish also cancels pending auto-bus run cues
      await t.game('setState', multiRunSpider());
      await t.waitForStable();
      await t.game('act', 'autoComplete');
      await t.page.evaluate(() => { window.__apRamps.length = 0; });
      await t.game('newGame', { mode: 'spider', suits: 1, deal: 12 });
      const dealRamps = await t.page.evaluate(() => window.__apRamps.slice());
      t.expect(dealRamps.some((r) => r.value <= 0.001 && r.dur <= 0.05), 'newGame cancels autoCueBus holding pending run cues');

      // 2. Spider stock deal completing a run delays run fanfare to the 460 ms deal stagger on autoCueBus
      await t.game('setState', stockDealCompletesRunSpider());
      await t.waitForStable();
      await t.game('cuesPlayed', true);
      t.equal((await t.game('act', 'draw')).ok, true, 'Spider stock deal succeeds');
      const dealRuns = (await t.game('cuesPlayed')).filter((c) => c.name === 'run');
      t.log('Spider stock-deal run cue: ' + JSON.stringify(dealRuns));
      t.equal(dealRuns.length, 1, 'stock deal completed 1 run');
      t.equal(dealRuns[0].auto, true, 'stock-deal run cue routes through cancellable autoCueBus');
      t.expect(dealRuns[0].wait >= 0.44 && dealRuns[0].wait <= 0.50, `stock-deal run cue delayed to 0.46 s lift (got ${dealRuns[0].wait})`);

      // 3. Player's own move completing a run sounds at once (wait === 0, auto === false)
      await t.game('setState', manualRunSpider());
      await t.waitForStable();
      await t.game('cuesPlayed', true);
      t.equal((await t.game('act', 'move', 't1', 't0')).ok, true, 'manual run move succeeds');
      const manRuns = (await t.game('cuesPlayed')).filter((c) => c.name === 'run');
      t.equal(manRuns.length, 1, 'manual move completed 1 run');
      t.equal([manRuns[0].wait, manRuns[0].auto], [0, false], 'manual move run cue sounds immediately on main sfx bus');

      // 4. Reduced motion: Spider Finish run cues use 0 delay
      await t.game('setSettings', { motion: 'reduced' });
      await t.game('setState', multiRunSpider());
      await t.waitForStable();
      await t.game('cuesPlayed', true);
      t.equal((await t.game('act', 'autoComplete')).ok, true, 'reduced-motion Spider Finish succeeds');
      const rmRuns = (await t.game('cuesPlayed')).filter((c) => c.name === 'run');
      t.equal(rmRuns.length, 3, 'reduced-motion Spider Finish completes 3 runs');
      t.expect(rmRuns.every((c) => c.wait === 0), `reduced-motion run cues have 0 delay: ${JSON.stringify(rmRuns)}`);
      await t.game('act', 'skip');

      // 5. Full-volume clipping check for 'run' cue (unaffected, < 0.95)
      const runPeak = await t.page.evaluate(() => window.__game.audioRender('run', 10, false, { volume: 1, sfxVol: 1 }));
      t.log(`Full-volume 'run' cue peak: ${runPeak.peak}`);
      t.expect(runPeak.peak < 0.95, `full-volume 'run' stays below 0.95 (${runPeak.peak})`);
    },
  },
];
