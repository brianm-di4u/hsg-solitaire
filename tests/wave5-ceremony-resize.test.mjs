// Wave 5 Batch W5-B03: Rotation / resize mid-ceremony rescales active flyers, clears echoes, and keeps launch schedule (W5-C4)
import { baseSettings, nearWinKlondike } from './_util.mjs';

export const tests = [
  {
    name: 'wave5-c4 portrait-to-landscape and landscape-to-portrait rotation mid-spray preserves flyers, clears echoes, and finishes cleanly',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, tips: false, motion: 'full' });

      for (const [fromVp, toVp, label] of [
        [{ width: 390, height: 844 }, { width: 844, height: 390 }, 'portrait->landscape'],
        [{ width: 844, height: 390 }, { width: 390, height: 844 }, 'landscape->portrait'],
      ]) {
        await t.page.setViewportSize(fromVp);
        await t.game('setState', nearWinKlondike());
        await t.waitForStable();
        await t.game('act', 'move', 't0', 'f3');

        // Advance well into spray so flyers populate the full vertical span (including lower half of screen)
        const pre = await t.game('act', 'ceremonyAt', 2700);
        const ecoPre = await t.game('runtimeEconomy');
        const flyersPre = pre.flyers != null ? pre.flyers : ecoPre.flyers;
        t.expect(flyersPre >= 12, `${label}: active flyers populated before rotation (${flyersPre})`);
        t.expect(ecoPre.echoes > 0, `${label}: echoes active before rotation (${ecoPre.echoes})`);

        // Rotate mid-ceremony
        await t.page.setViewportSize(toVp);
        await t.page.waitForFunction(
          ({ wantLand }) => {
            const lay = window.__game.getLayout();
            const r = document.getElementById('stage').getBoundingClientRect();
            return Math.abs(lay.stageW - Math.round(r.width)) <= 2 && (wantLand ? lay.stageW > lay.stageH : lay.stageH > lay.stageW);
          },
          { wantLand: toVp.width > toVp.height },
          { timeout: 5000 }
        );

        const ecoPostResize = await t.game('runtimeEconomy');
        t.equal(ecoPostResize.echoes, 0, `${label}: resize mid-ceremony clears stale pre-rotation echoes immediately`);

        const post = await t.page.evaluate(() => {
          const nextFrame = window.__game.act('ceremonyAt', 2716, 16);
          const flyersAfter1 = nextFrame.flyers != null ? nextFrame.flyers : window.__game.runtimeEconomy().flyers;
          let lastLaunched = nextFrame.launched != null ? nextFrame.launched : 0;
          let prevLaunchEl = 2716, maxGap = 0, peakFlyers = flyersAfter1, endedClean = false, finalLaunched = lastLaunched, finalFlyers = flyersAfter1;
          const spacingAfter = nextFrame.spacing || 45;
          for (let ms = 2733; ms <= 9000; ms += 1000 / 60) {
            const r = window.__game.act('ceremonyAt', ms, 1000 / 60);
            const f = r.flyers != null ? r.flyers : window.__game.runtimeEconomy().flyers;
            if (f > peakFlyers) peakFlyers = f;
            if (r.launched != null && r.launched > lastLaunched) {
              const gap = ms - prevLaunchEl;
              if (gap > maxGap) maxGap = gap;
              prevLaunchEl = ms;
              lastLaunched = r.launched;
            }
            const st = window.__game.getState();
            if (r.ended || !st.ceremony || st.modal === 'win') {
              endedClean = true;
              finalLaunched = r.launched != null ? r.launched : lastLaunched;
              finalFlyers = f;
              break;
            }
          }
          window.__game.act('unfreeze');
          return { flyersAfter1, spacingAfter, maxGap: +maxGap.toFixed(1), peakFlyers, endedClean, finalLaunched, finalFlyers };
        });

        const dropped = flyersPre - post.flyersAfter1;
        t.log(`${label}: flyersPre=${flyersPre}, flyersAfter1=${post.flyersAfter1}, dropped=${dropped}, newSpacing=${post.spacingAfter}, maxGap=${post.maxGap}, peak=${post.peakFlyers}`);
        t.expect(dropped <= 2, `${label}: rotation did not drop active flyers in one frame (before ${flyersPre}, after 1 frame ${post.flyersAfter1})`);
        t.equal(post.endedClean, true, `${label}: ceremony finished cleanly after mid-spray rotation`);
        t.equal(post.finalLaunched, 52, `${label}: all 52 cards launched (${post.finalLaunched})`);
        t.equal(post.finalFlyers, 0, `${label}: zero flyers aloft at clean exit (${post.finalFlyers})`);
        t.expect(post.peakFlyers < 40, `${label}: flyers never reached 40 after rotation (peak ${post.peakFlyers})`);
        t.expect(post.maxGap <= post.spacingAfter * 2 + 2, `${label}: no launch stall after rotation (maxGap ${post.maxGap} <= ${(post.spacingAfter * 2).toFixed(1)})`);
      }

      await t.page.setViewportSize(t.vp);
    },
  },
];
