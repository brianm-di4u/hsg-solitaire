// Wave 5 Batch W5-B03: Foil flakes have bounded 1.4-2 s lifetime and never block clean ceremony exit (W5-C3)
import { baseSettings, nearWinKlondike } from './_util.mjs';

export const tests = [
  {
    name: 'wave5-c3 foil flakes expire within 2 s and never block clean ceremony exit',
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });

      // 1. Non-blocking clean exit: 2-card foundation ceremony finishes immediately after cards clear
      //    even while full-FX foil flakes are still drifting (must NOT stall until hard cutoff).
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: {
          stock: [], waste: [],
          f0: ['AC', '2C'], f1: [], f2: [], f3: [],
          t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [],
        },
      });
      await t.waitForStable();

      const res2 = await t.page.evaluate(() => {
        let exitMs = null, peakFlakes = 0, flyersClearedAt = null, maxStallAfterClear = 0;
        for (let ms = 0; ms <= 6000; ms += 50) {
          const r = window.__game.act('ceremonyAt', ms, 50);
          const st = window.__game.getState();
          const eco = window.__game.runtimeEconomy();
          const flakes = r.flakes != null ? r.flakes : (eco.flakes || 0);
          if (flakes > peakFlakes) peakFlakes = flakes;
          if (!st.ceremony || st.modal === 'win' || r.ended) {
            exitMs = ms;
            break;
          }
          if (ms >= 2250 && eco.flyers === 0) {
            if (flyersClearedAt === null) flyersClearedAt = ms;
            maxStallAfterClear = ms - flyersClearedAt;
          }
        }
        const modal = window.__game.getState().modal;
        window.__game.act('unfreeze');
        return { exitMs, peakFlakes, flyersClearedAt, maxStallAfterClear, modal };
      });
      t.log(`${t.viewport} 2-card ceremony: ${JSON.stringify(res2)}`);
      t.expect(res2.exitMs !== null, '2-card full-FX ceremony exited cleanly');
      t.expect(res2.maxStallAfterClear <= 100, `ceremony did not stall waiting for foil flakes after last card left (stalled ${res2.maxStallAfterClear} ms, exited at ${res2.exitMs} ms)`);
      t.equal(res2.modal, 'win', 'win sheet opened cleanly when last card exited');

      // 2. Bounded flake lifetime on a full 52-card win: flakes spawn, stay <= 60, and expire within 2.0 s
      await t.game('setState', nearWinKlondike());
      await t.waitForStable();
      await t.game('act', 'move', 't0', 'f3');

      const res52 = await t.page.evaluate(() => {
        let sawFlakes = 0, maxAge = 0, endedAt = null;
        for (let ms = 1400; ms <= 7500; ms += 50) {
          const r = window.__game.act('ceremonyAt', ms, 50);
          const st = window.__game.getState();
          const eco = window.__game.runtimeEconomy();
          const flakes = r.flakes != null ? r.flakes : (eco.flakes != null ? eco.flakes : -1);
          if (flakes > sawFlakes) sawFlakes = flakes;
          if (r.flakeMaxAge != null && r.flakeMaxAge > maxAge) maxAge = r.flakeMaxAge;
          if (!st.ceremony || st.modal === 'win' || r.ended) {
            endedAt = ms;
            break;
          }
        }
        window.__game.act('unfreeze');
        return { sawFlakes, maxAge: Math.round(maxAge), endedAt };
      });
      t.log(`${t.viewport} 52-card flakes: ${JSON.stringify(res52)}`);
      t.expect(res52.sawFlakes > 0 && res52.sawFlakes <= 60, `full-FX ceremony spawned bounded foil flakes (peak ${res52.sawFlakes})`);
      t.expect(res52.maxAge > 0 && res52.maxAge <= 2050, `every foil flake expired within its bounded <= 2.0 s lifetime (maxAge=${res52.maxAge} ms)`);
    },
  },
];
