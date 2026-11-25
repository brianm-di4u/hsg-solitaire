// Wave 5 Batch W5-B03: Win ceremony flight physics, dynamic launch spacing, <40 flyers, clean exit (W5-C1)
import { baseSettings, nearWinKlondike, rawShot } from './_util.mjs';

const VIEWPORTS = [
  { name: '360x640', width: 360, height: 640 },
  { name: '390x844', width: 390, height: 844 },
  { name: '844x390', width: 844, height: 390 },
  { name: '820x1180', width: 820, height: 1180 },
  { name: '1280x800', width: 1280, height: 800 },
];

function nearWinSpider() {
  const runS = ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS', 'JS', 'QS', 'KS'];
  return {
    mode: 'spider', opts: { suits: 1 },
    piles: {
      stock: [],
      f0: runS, f1: runS, f2: runS, f3: runS, f4: runS, f5: runS, f6: runS, f7: [],
      t0: ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'],
      t1: ['AS'], t2: [], t3: [], t4: [], t5: [], t6: [], t7: [], t8: [], t9: [],
    },
  };
}

async function simulateCeremony(t, { mode, expectedN, stepMs, maxTotalMs }) {
  if (mode === 'klondike') {
    await t.game('setState', nearWinKlondike());
    await t.waitForStable();
    await t.game('act', 'move', 't0', 'f3');
  } else {
    await t.game('setState', nearWinSpider());
    await t.waitForStable();
    await t.game('act', 'move', 't1', 't0');
  }

  return t.page.evaluate(({ expectedN, stepMs, ceilingMs }) => {
    let peakFlyers = 0, lastLaunched = 0, prevLaunchEl = null, maxLaunchGap = 0;
    let spacing = 0, total = 0, finalLaunched = 0, finalRemaining = expectedN, finalFlyers = -1;
    let endMs = null;

    for (let ms = 0; ms <= ceilingMs; ms += stepMs) {
      const r = window.__game.act('ceremonyAt', ms, stepMs);
      if (!spacing && r.spacing) spacing = r.spacing;
      if (!total && r.total) total = r.total;
      const eco = window.__game.runtimeEconomy();
      const flyers = r.flyers != null ? r.flyers : eco.flyers;
      if (flyers > peakFlyers) peakFlyers = flyers;

      if (r.launched != null && r.launched > lastLaunched) {
        if (prevLaunchEl !== null && lastLaunched > 0) {
          const gap = ms - prevLaunchEl;
          if (gap > maxLaunchGap) maxLaunchGap = gap;
        }
        prevLaunchEl = ms;
        lastLaunched = r.launched;
      }

      const st = window.__game.getState();
      if (r.ended || !st.ceremony || st.modal === 'win') {
        endMs = Math.round(ms);
        finalLaunched = r.launched != null ? r.launched : lastLaunched;
        finalRemaining = r.remaining != null ? r.remaining : expectedN - finalLaunched;
        finalFlyers = r.flyers != null ? r.flyers : eco.flyers;
        break;
      }
    }

    const modal = window.__game.getState().modal;
    window.__game.act('unfreeze');
    return {
      spacing, total, peakFlyers, maxLaunchGap: +maxLaunchGap.toFixed(1),
      finalLaunched, finalRemaining, finalFlyers, endMs, modal,
    };
  }, { expectedN, stepMs, ceilingMs: maxTotalMs + 3500 });
}

export const tests = [
  {
    name: 'wave5-c1 60 fps ceremony across 5 viewports (52 Klondike & 104 Spider): no 40-flyer stall, clean exit on last card',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });
      const summary = [];
      for (const vp of VIEWPORTS) {
        await t.page.setViewportSize({ width: vp.width, height: vp.height });
        for (const [mode, expectedN, maxTotalMs] of [['klondike', 52, 6500], ['spider', 104, 9000]]) {
          const res = await simulateCeremony(t, { mode, expectedN, stepMs: 1000 / 60, maxTotalMs });
          if (mode === 'klondike' && (vp.name === '390x844' || vp.name === '1280x800')) {
            await t.game('setState', nearWinKlondike());
            await t.waitForStable();
            await t.game('act', 'move', 't0', 'f3');
            await t.game('act', 'ceremonyAt', 3100);
            await rawShot(t, `wave5-c1-spray-${vp.name}`);
            await t.game('act', 'unfreeze');
            await t.game('act', 'skip');
          }
          const tag = `${vp.name} ${mode}(${expectedN}) 60fps`;
          summary.push(`${tag}: spacing=${res.spacing}ms peak=${res.peakFlyers} maxGap=${res.maxLaunchGap}ms end=${res.endMs}ms`);
          t.expect(res.spacing > 0 && res.total === expectedN, `${tag}: hook exposes planned spacing (${res.spacing}) and total (${res.total})`);
          t.equal(res.finalLaunched, expectedN, `${tag}: every card launched (${res.finalLaunched}/${expectedN})`);
          t.equal(res.finalRemaining, 0, `${tag}: zero cards left in ring (${res.finalRemaining})`);
          t.expect(res.peakFlyers > 0 && res.peakFlyers < 40, `${tag}: simultaneous flyers never reached 40 (peak ${res.peakFlyers})`);
          t.expect(res.maxLaunchGap <= res.spacing * 2 + 1, `${tag}: max launch gap <= 2x spacing (${res.maxLaunchGap} <= ${(res.spacing * 2).toFixed(1)})`);
          t.equal(res.finalFlyers, 0, `${tag}: zero flyers aloft at clean exit (${res.finalFlyers})`);
          t.equal(res.modal, 'win', `${tag}: win sheet opened on last exit`);
          t.expect(res.endMs !== null && res.endMs <= maxTotalMs, `${tag}: finished within ${maxTotalMs} ms (got ${res.endMs} ms)`);
        }
      }
      t.log(summary.join(' | '));
      await t.page.setViewportSize(t.vp);
    },
  },
];
