// Wave 5 Batch W5-B04: Reduced-motion Finish and autoplay wins enter calm emblem at the 250 ms beat without fake finishRun stall (W5-M2)
import { baseSettings } from './_util.mjs';

const run = (s) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].map((r) => r + s);

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

function autoplayWinKlondike() {
  // Moving AS from t0 -> f3 triggers autoFoundation:'all' to sweep 2S..KS and KH (13 autoplayed cards) straight home
  return {
    mode: 'klondike', opts: { draw: 1 },
    piles: {
      stock: [], waste: [],
      f0: run('C'), f1: run('D'), f2: run('H').slice(0, 12), f3: [],
      t0: ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S', 'AS'],
      t1: ['KH'], t2: [], t3: [], t4: [], t5: [], t6: [],
    },
  };
}

async function measureToCeremony(t, triggerExpr) {
  return t.page.evaluate((expr) => new Promise((resolve) => {
    const t0 = performance.now();
    const res = expr === 'autoComplete'
      ? window.__game.act('autoComplete')
      : window.__game.act('move', 't0', 'f3');
    const stNow = window.__game.getState();
    const deadline = t0 + 12000;
    const poll = () => {
      const st = window.__game.getState();
      if (st.ceremony || st.modal === 'win' || performance.now() > deadline) {
        const eco = window.__game.runtimeEconomy();
        resolve({
          ok: res.ok,
          wonNow: stNow.won,
          finishingNow: stNow.finishing,
          ceremony: st.ceremony,
          calm: !!(eco.ceremony && eco.ceremony.calm),
          tookMs: Math.round(performance.now() - t0),
        });
        return;
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }), triggerExpr);
}

export const tests = [
  {
    name: 'wave5-m2 reduced motion enters calm emblem within ~400 ms with finishing=false for Klondike Finish, Spider Finish, and autoplay wins',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced', sound: false, tips: false, autoFoundation: 'off' });

      // 1. Klondike 52-card Finish under Reduced Motion
      await t.game('setState', full52Klondike());
      await t.waitForStable();
      const k = await measureToCeremony(t, 'autoComplete');
      t.log('Klondike 52-card reduced Finish: ' + JSON.stringify(k));
      t.equal([k.ok, k.wonNow, k.finishingNow], [true, true, false], 'Klondike reduced Finish wins immediately with finishing=false');
      t.equal([k.ceremony, k.calm], [true, true], 'Klondike reduced Finish reaches calm emblem');
      t.expect(k.tookMs <= 450, `Klondike reduced Finish reaches calm emblem within ~400 ms (got ${k.tookMs} ms)`);
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 5000 });

      // 2. Spider 3-run Finish under Reduced Motion
      await t.game('setState', multiRunSpider());
      await t.waitForStable();
      const sp = await measureToCeremony(t, 'autoComplete');
      t.log('Spider 3-run reduced Finish: ' + JSON.stringify(sp));
      t.equal([sp.ok, sp.wonNow, sp.finishingNow], [true, true, false], 'Spider reduced Finish wins immediately with finishing=false');
      t.equal([sp.ceremony, sp.calm], [true, true], 'Spider reduced Finish reaches calm emblem');
      t.expect(sp.tookMs <= 450, `Spider reduced Finish reaches calm emblem within ~400 ms (got ${sp.tookMs} ms)`);
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 5000 });

      // 3. Autoplay (autoFoundation:'all') 13-card win under Reduced Motion
      await t.game('setSettings', { autoFoundation: 'all' });
      await t.game('setState', autoplayWinKlondike());
      await t.waitForStable();
      const ap = await measureToCeremony(t, 'move');
      t.log('Autoplay 13-card reduced win: ' + JSON.stringify(ap));
      t.equal([ap.ok, ap.wonNow, ap.finishingNow], [true, true, false], 'Autoplay reduced win wins immediately with finishing=false');
      t.equal([ap.ceremony, ap.calm], [true, true], 'Autoplay reduced win reaches calm emblem');
      t.expect(ap.tookMs <= 450, `Autoplay reduced win reaches calm emblem within ~400 ms (got ${ap.tookMs} ms)`);
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 5000 });

      // 4. Full motion unchanged: 52-card Klondike Finish still sets finishing=true
      await t.game('setSettings', { motion: 'full', autoFoundation: 'off' });
      await t.game('setState', full52Klondike());
      await t.waitForStable();
      await t.game('act', 'autoComplete');
      t.equal((await t.state()).finishing, true, 'Full motion Finish still sets finishing=true');
      await t.game('act', 'skip');
    },
  },
];
