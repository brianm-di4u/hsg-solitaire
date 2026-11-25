// Wave 5 Batch W5-B03: Unified ceremony clock, fixed <=1/60 s substeps (15 fps parity), hidden-tab pause/resume, clock-driven spray SFX (W5-C2)
import { baseSettings, nearWinKlondike } from './_util.mjs';

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

export const tests = [
  {
    name: 'wave5-c2 15 fps frozen-clock ceremony matches 60 fps across 5 viewports (52 Klondike & 104 Spider)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });
      const summary = [];
      const step15 = 1000 / 15;
      for (const vp of VIEWPORTS) {
        await t.page.setViewportSize({ width: vp.width, height: vp.height });
        for (const [mode, expectedN, maxTotalMs] of [['klondike', 52, 6500], ['spider', 104, 9000]]) {
          if (mode === 'klondike') {
            await t.game('setState', nearWinKlondike());
            await t.waitForStable();
            await t.game('act', 'move', 't0', 'f3');
          } else {
            await t.game('setState', nearWinSpider());
            await t.waitForStable();
            await t.game('act', 'move', 't1', 't0');
          }
          const res = await t.page.evaluate(({ expectedN, step15, ceilingMs }) => {
            let peakFlyers = 0, lastLaunched = 0, prevLaunchEl = null, maxLaunchGap = 0;
            let spacing = 0, endMs = null, finalLaunched = 0, finalRemaining = expectedN, finalFlyers = -1;
            for (let ms = 0; ms <= ceilingMs; ms += step15) {
              const r = window.__game.act('ceremonyAt', ms, step15);
              if (!spacing && r.spacing) spacing = r.spacing;
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
            return { spacing, peakFlyers, maxLaunchGap: +maxLaunchGap.toFixed(1), endMs, finalLaunched, finalRemaining, finalFlyers, modal };
          }, { expectedN, step15, ceilingMs: maxTotalMs + 3500 });
          const tag = `${vp.name} ${mode}(${expectedN}) 15fps`;
          summary.push(`${tag}: spacing=${res.spacing}ms peak=${res.peakFlyers} maxGap=${res.maxLaunchGap}ms end=${res.endMs}ms`);
          t.expect(res.spacing > 0, `${tag}: spacing reported (${res.spacing})`);
          t.equal(res.finalLaunched, expectedN, `${tag}: every card launched (${res.finalLaunched}/${expectedN})`);
          t.equal(res.finalRemaining, 0, `${tag}: zero cards left in ring (${res.finalRemaining})`);
          t.expect(res.peakFlyers > 0 && res.peakFlyers < 40, `${tag}: flyers never reached 40 (peak ${res.peakFlyers})`);
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
  {
    name: 'wave5-c2 hidden-tab 5 s gap mid-spray, clock-driven spray SFX, reduced-motion calm pause, and backward ceremonyAt seek',
    viewports: ['desktop'],
    initScript: () => {
      window.__clockOffset = 0;
      const origNow = performance.now.bind(performance);
      performance.now = () => origNow() + window.__clockOffset;
    },
    async run(t) {
      await baseSettings(t, { sound: true, music: false, ambience: false, tips: false, motion: 'full' });

      // 1. Hidden-tab 5 s gap mid-spray (including raw 5 s frame jump): no el jump, no early end, remaining cards finish cleanly
      await t.game('setState', nearWinKlondike());
      await t.waitForStable();
      await t.game('act', 'move', 't0', 'f3');

      const gapRes = await t.page.evaluate(() => {
        const mid = window.__game.act('ceremonyAt', 2500);
        const midLaunched = mid.launched != null ? mid.launched : 0;
        const midEl = mid.el != null ? mid.el : 2500;
        // Hide tab, jump wall clock by 5000 ms, unhide tab
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
        window.__clockOffset += 5000;
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));

        // Step one real frame past the 5 s gap via ceremonyAt (tests both visibilitychange shift and large-gap guard)
        const afterResume = window.__game.act('ceremonyAt', 2520, 20);
        const stResume = window.__game.getState();

        // Also test a raw 5 s frame stall without visibilitychange by passing a single 5000 ms step jump
        const stallBeforeEl = afterResume.el != null ? afterResume.el : 2520;
        const afterStall = window.__game.act('ceremonyAt', stallBeforeEl + 5000, 5000);
        const stStall = window.__game.getState();

        let finishedCleanly = false, peakAfter = 0, finalLaunched = 0, finalFlyers = -1;
        const startMs = (afterStall.el != null ? afterStall.el : 2540) + 20;
        for (let ms = startMs; ms <= 8500; ms += 20) {
          const r = window.__game.act('ceremonyAt', ms, 20);
          if (r.flyers > peakAfter) peakAfter = r.flyers;
          const st = window.__game.getState();
          if (r.ended || !st.ceremony || st.modal === 'win') {
            finishedCleanly = true;
            finalLaunched = r.launched;
            finalFlyers = r.flyers;
            break;
          }
        }
        window.__game.act('unfreeze');
        return {
          midOk: mid.ok && !mid.ended, midLaunched, midEl,
          resumeCeremony: stResume.ceremony, resumeModal: stResume.modal, resumeEnded: !!afterResume.ended, resumeLaunched: afterResume.launched,
          stallCeremony: stStall.ceremony, stallModal: stStall.modal, stallEnded: !!afterStall.ended, stallEl: afterStall.el, stallBeforeEl,
          finishedCleanly, peakAfter, finalLaunched, finalFlyers,
        };
      });
      t.log(`5 s hidden-tab + stall gap: ${JSON.stringify(gapRes)}`);
      t.equal(gapRes.midOk, true, 'mid-spray frame reached at 2500 ms');
      t.expect(gapRes.midLaunched > 0 && gapRes.midLaunched < 52, `mid-spray has cards launched and remaining (${gapRes.midLaunched}/52)`);
      t.equal([gapRes.resumeCeremony, gapRes.resumeModal, gapRes.resumeEnded], [true, null, false], 'ceremony stays active with no early end across 5 s hidden-tab gap');
      t.equal([gapRes.stallCeremony, gapRes.stallModal, gapRes.stallEnded], [true, null, false], 'raw 5 s stall frame gap does not jump past ceremony end');
      t.expect(gapRes.stallEl != null && gapRes.stallEl - gapRes.stallBeforeEl <= 120, `5 s stall shifted clock instead of jumping el (${gapRes.stallBeforeEl} -> ${gapRes.stallEl})`);
      t.equal(gapRes.finishedCleanly, true, 'remaining cards finish cleanly after 5 s gap');
      t.equal(gapRes.finalLaunched, 52, `all 52 cards launched after resume (${gapRes.finalLaunched})`);
      t.equal(gapRes.finalFlyers, 0, `zero flyers aloft at end after resume (${gapRes.finalFlyers})`);
      t.expect(gapRes.peakAfter < 40, `flyers stayed below 40 after resume (peak ${gapRes.peakAfter})`);

      // 2. Hidden tab BEFORE T2 suppresses spray SFX while hidden, then fires it once on resume when crossing T2
      await t.game('setState', nearWinKlondike());
      await t.waitForStable();
      await t.game('cuesPlayed', true);
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().ceremony, null, { timeout: 5000 });
      await t.page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      // Bounded negative check (ruling #2): old wall-clock setTimeout(..., 1600) fired into hidden tab before 1800 ms
      await t.page.waitForTimeout(1800);
      const hiddenCues = await t.game('cuesPlayed');
      t.equal(hiddenCues.some((c) => c.name === 'spray'), false, 'spray SFX does not fire while tab is hidden');
      await t.page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await t.page.waitForFunction(() => window.__game.cuesPlayed().some((c) => c.name === 'spray'), null, { timeout: 5000 });
      const sprayCount = (await t.game('cuesPlayed')).filter((c) => c.name === 'spray').length;
      t.equal(sprayCount, 1, `spray SFX fired exactly once after resuming across T2 (${sprayCount})`);
      await t.game('act', 'skip');
      await t.waitForStable();

      // 3. Reduced-motion 600 ms calm timer pauses while hidden and resumes on return
      await t.game('setSettings', { motion: 'reduced', sound: false });
      await t.game('setState', nearWinKlondike());
      await t.waitForStable();
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().ceremony, null, { timeout: 5000 });
      await t.page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      // Bounded negative check (ruling #2): calm timer is 600 ms; waiting 750 ms while hidden proves timer paused
      await t.page.waitForTimeout(750);
      const calmHidden = await t.state();
      t.equal([calmHidden.ceremony, calmHidden.modal], [true, null], 'reduced-motion calm ceremony stays paused while tab is hidden');
      await t.page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 5000 });
      t.equal((await t.state()).modal, 'win', 'reduced-motion calm ceremony resumes and opens win sheet after unhide');

      // 4. ceremonyAt backward seek (earlier time after later time) works cleanly
      await t.game('setSettings', { motion: 'full', sound: false });
      await t.game('setState', nearWinKlondike());
      await t.waitForStable();
      await t.game('act', 'move', 't0', 'f3');
      const seekRes = await t.page.evaluate(() => {
        const late = window.__game.act('ceremonyAt', 2600);
        const early = window.__game.act('ceremonyAt', 700);
        window.__game.act('unfreeze');
        window.__game.act('skip');
        return { late, early };
      });
      t.expect(seekRes.late.launched > 0, `late frame at 2600 ms has launched cards (${seekRes.late.launched})`);
      t.expect(seekRes.early.ok && seekRes.early.launched === 0 && seekRes.early.stamp > 0 && seekRes.early.stamp < 1, `backward seek to 700 ms restores gather state: ${JSON.stringify(seekRes.early)}`);
    },
  },
];
