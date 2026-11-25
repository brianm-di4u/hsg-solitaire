// Wave 5 Batch W5-B01: Late font arrival rebakes sprites/hands/table without delaying first deal or snapping active drags (W5-F2)
import { baseSettings } from './_util.mjs';

const TEST_BOARD = {
  mode: 'klondike',
  opts: { draw: 1 },
  deal: 42,
  piles: {
    stock: ['#2C'], waste: [], f0: [], f1: [], f2: [], f3: [],
    t0: ['JH'], t1: ['QH'], t2: ['KH'], t3: ['AH'], t4: ['TH'], t5: ['9H'], t6: ['8H'],
  },
};

async function sampleCardIndexHash(page, pid) {
  return page.evaluate((pileId) => {
    const cv = document.getElementById('cv'), g = cv.getContext('2d');
    const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
    const lay = window.__game.getLayout();
    const c = lay.piles[pileId].cards[0];
    const x = Math.round((c.x - rect.left) * k), y = Math.round((c.y - rect.top) * k);
    const w = Math.max(4, Math.round(lay.cardW * 0.55 * k)), h = Math.max(4, Math.round(lay.cardH * 0.35 * k));
    const d = g.getImageData(x, y, w, h).data;
    let h1 = 2166136261 >>> 0;
    for (let i = 0; i < d.length; i += 4) {
      h1 ^= d[i]; h1 = Math.imul(h1, 16777619) >>> 0;
      h1 ^= d[i + 1]; h1 = Math.imul(h1, 16777619) >>> 0;
      h1 ^= d[i + 2]; h1 = Math.imul(h1, 16777619) >>> 0;
    }
    return h1;
  }, pid);
}

export const tests = [
  {
    name: 'wave5-f2 late fonts (>4s) do not delay first deal, rebake cards in Libre Bodoni without a new deal, and defer during drag',
    viewports: ['desktop'],
    async run(t) {
      // 1. Delay assets/fonts.css past the 4 s timeout on initial reload
      let releaseCss = null;
      const cssHeld = new Promise((r) => { releaseCss = r; });
      await t.page.route('**/assets/fonts.css*', async (route) => {
        await cssHeld;
        await route.continue();
      });

      const t0 = Date.now();
      await t.page.reload({ waitUntil: 'domcontentloaded' });
      await t.page.waitForFunction(() => !!(window.__game && window.__game.isIdle()), null, { timeout: 10000 });
      const bootMs = Date.now() - t0;
      t.log(`boot with held fonts.css became idle in ${bootMs} ms`);
      t.expect(bootMs >= 3500 && bootMs < 8500, `first deal/isIdle released by 4 s timeout without hanging (${bootMs} ms)`);

      const loadedBefore = await t.page.evaluate(() => [...document.fonts].some((f) => /Libre Bodoni/i.test(f.family) && f.status === 'loaded'));
      t.equal(loadedBefore, false, 'Libre Bodoni is not yet loaded before delayed fonts.css arrives');

      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, courts: 'deco', cardSize: 'standard' });
      await t.game('setState', TEST_BOARD);
      await t.waitForStable();

      const beforeHashJ = await sampleCardIndexHash(t.page, 't0');
      const beforeHashQ = await sampleCardIndexHash(t.page, 't1');
      const dealBefore = (await t.game('getState')).deal;

      // Release fonts.css after the 4 s timeout: cards must rebake automatically without a new deal
      releaseCss();
      await t.page.waitForFunction(() => [...document.fonts].some((f) => /Libre Bodoni/i.test(f.family) && f.status === 'loaded'), null, { timeout: 8000 });

      // Wait for the canvas sprite of JH or QH to actually rebake in Libre Bodoni (state-driven poll, no fixed sleep)
      let rebaked = false;
      try {
        await t.page.waitForFunction(({ hJ, hQ }) => {
          const cv = document.getElementById('cv'), g = cv.getContext('2d');
          const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
          const lay = window.__game.getLayout();
          const hashOf = (pid) => {
            const c = lay.piles[pid].cards[0];
            const x = Math.round((c.x - rect.left) * k), y = Math.round((c.y - rect.top) * k);
            const w = Math.max(4, Math.round(lay.cardW * 0.55 * k)), h = Math.max(4, Math.round(lay.cardH * 0.35 * k));
            const d = g.getImageData(x, y, w, h).data;
            let h1 = 2166136261 >>> 0;
            for (let i = 0; i < d.length; i += 4) {
              h1 ^= d[i]; h1 = Math.imul(h1, 16777619) >>> 0;
              h1 ^= d[i + 1]; h1 = Math.imul(h1, 16777619) >>> 0;
              h1 ^= d[i + 2]; h1 = Math.imul(h1, 16777619) >>> 0;
            }
            return h1;
          };
          return window.__game.isIdle() && (hashOf('t0') !== hJ || hashOf('t1') !== hQ);
        }, { hJ: beforeHashJ, hQ: beforeHashQ }, { timeout: 4000 });
        rebaked = true;
      } catch (_) {
        rebaked = false;
      }
      t.equal(rebaked, true, 'late-arriving Libre Bodoni automatically clears caches and rebakes live card faces');
      t.equal((await t.game('runtimeEconomy')).fontRebakes, 1, 'late font arrival triggers exactly one rebake');
      const stAfter = await t.game('getState');
      t.equal(stAfter.deal, dealBefore, 'late font rebake preserves the active deal without starting a new deal');
      t.equal(stAfter.piles.t0, ['JH'], 'late font rebake preserves table piles');
      await t.page.unroute('**/assets/fonts.css*');

      // 2. Late fonts arriving during an active drag must NOT snap or cancel the drag; rebake defers until drag finishes
      let releaseCss2 = null;
      const cssHeld2 = new Promise((r) => { releaseCss2 = r; });
      await t.page.route('**/assets/fonts.css*', async (route) => {
        await cssHeld2;
        await route.continue();
      });
      await t.page.reload({ waitUntil: 'domcontentloaded' });
      await t.page.waitForFunction(() => !!(window.__game && window.__game.isIdle()), null, { timeout: 10000 });
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, courts: 'deco', cardSize: 'standard' });
      await t.game('setState', TEST_BOARD);
      await t.waitForStable();

      const beforeDragHash = await sampleCardIndexHash(t.page, 't0');
      const lay = await t.game('getLayout');
      const card0 = lay.piles.t0.cards[0];
      const sx = card0.x + card0.w / 2, sy = card0.y + card0.h / 2;
      await t.page.mouse.move(sx, sy);
      await t.page.mouse.down();
      await t.page.mouse.move(sx + 40, sy + 60, { steps: 6 });
      const dragMid = await t.game('dragInfo');
      t.expect(!!dragMid, 'drag is active before late fonts arrive');

      releaseCss2();
      await t.page.waitForFunction(() => [...document.fonts].some((f) => /Libre Bodoni/i.test(f.family) && f.status === 'loaded'), null, { timeout: 8000 });
      await t.waitFrames(3);
      const dragStillActive = await t.game('dragInfo');
      t.expect(!!dragStillActive, 'late font arrival does not snap or cancel an active drag');

      // Drop back on origin so card settles at t0, then verify deferred rebake applies
      await t.page.mouse.move(sx, sy, { steps: 4 });
      await t.page.mouse.up();
      await t.waitForStable();

      let deferredRebaked = false;
      try {
        await t.page.waitForFunction((hJ) => {
          const cv = document.getElementById('cv'), g = cv.getContext('2d');
          const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
          const l = window.__game.getLayout();
          const c = l.piles.t0.cards[0];
          const x = Math.round((c.x - rect.left) * k), y = Math.round((c.y - rect.top) * k);
          const w = Math.max(4, Math.round(l.cardW * 0.55 * k)), h = Math.max(4, Math.round(l.cardH * 0.35 * k));
          const d = g.getImageData(x, y, w, h).data;
          let h1 = 2166136261 >>> 0;
          for (let i = 0; i < d.length; i += 4) {
            h1 ^= d[i]; h1 = Math.imul(h1, 16777619) >>> 0;
            h1 ^= d[i + 1]; h1 = Math.imul(h1, 16777619) >>> 0;
            h1 ^= d[i + 2]; h1 = Math.imul(h1, 16777619) >>> 0;
          }
          return window.__game.isIdle() && h1 !== hJ;
        }, beforeDragHash, { timeout: 4000 });
        deferredRebaked = true;
      } catch (_) {
        deferredRebaked = false;
      }
      t.equal(deferredRebaked, true, 'deferred font rebake completes cleanly once drag ends');
      t.equal((await t.game('runtimeEconomy')).fontRebakes, 1, 'deferred font arrival triggers exactly one rebake');
      await t.page.unroute('**/assets/fonts.css*');

      // 3. Timely fonts (<4 s) arriving during an active Draw-3 drag must defer relayout(true) AND actually run it once idle (W5-B01 AC #4)
      let releaseCss3 = null;
      const cssHeld3 = new Promise((r) => { releaseCss3 = r; });
      await t.page.route('**/assets/fonts.css*', async (route) => {
        await cssHeld3;
        await route.continue();
      });
      await t.page.reload({ waitUntil: 'domcontentloaded' });
      // Wait for __game (do NOT wait for isIdle, because fontsPending is still true while fonts.css is held < 4 s)
      await t.page.waitForFunction(() => !!window.__game, null, { timeout: 5000 });
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, courts: 'deco', cardSize: 'large' });
      await t.game('setState', {
        mode: 'klondike',
        opts: { draw: 3 },
        deal: 42,
        piles: {
          stock: ['#2C'], waste: ['TH', 'KS', 'JH'], f0: [], f1: [], f2: [], f3: [],
          t0: ['QH'], t1: ['AH'], t2: ['9H'], t3: ['8H'], t4: ['7H'], t5: ['6H'], t6: ['5H'],
        },
      });
      await t.waitFrames(2);
      const preTimelyDrag = await t.page.evaluate(() => {
        const lay = window.__game.getLayout();
        const wc = lay.piles.waste.cards;
        const t0c = lay.piles.t0.cards[0];
        return {
          idxFull: lay.idxFull,
          step: wc.length >= 2 ? +(wc[1].x - wc[0].x).toFixed(4) : 0,
          sx: t0c.x + t0c.w / 2,
          sy: t0c.y + t0c.h / 2,
          loaded: [...document.fonts].some((f) => /Libre Bodoni/i.test(f.family) && f.status === 'loaded'),
        };
      });
      t.equal(preTimelyDrag.loaded, false, 'timely-busy test starts before Libre Bodoni arrives');

      // Start dragging while fontsPending is still true, then release fonts.css well before the 4 s timeout
      await t.page.mouse.move(preTimelyDrag.sx, preTimelyDrag.sy);
      await t.page.mouse.down();
      await t.page.mouse.move(preTimelyDrag.sx + 40, preTimelyDrag.sy + 50, { steps: 5 });
      t.expect(!!(await t.game('dragInfo')), 'drag is active when timely fonts arrive');

      releaseCss3();
      await t.page.waitForFunction(() => [...document.fonts].some((f) => /Libre Bodoni/i.test(f.family) && f.status === 'loaded'), null, { timeout: 4000 });
      await t.waitFrames(3);
      t.expect(!!(await t.game('dragInfo')), 'timely font arrival during drag does not snap or cancel the drag');

      // Drop back on origin: deferred relayout(true) must now run and update idxFull / wasteFanStep to Libre Bodoni metrics
      await t.page.mouse.move(preTimelyDrag.sx, preTimelyDrag.sy, { steps: 4 });
      await t.page.mouse.up();
      await t.waitForStable();
      const postTimelyDrag = await t.page.evaluate(() => {
        const lay = window.__game.getLayout();
        const wc = lay.piles.waste.cards;
        return {
          idxFull: lay.idxFull,
          step: wc.length >= 2 ? +(wc[1].x - wc[0].x).toFixed(4) : 0,
          rebakes: window.__game.runtimeEconomy().fontRebakes,
        };
      });
      // Compare against a fresh relayout (toggle cardSize back and forth) to get exact ground-truth Libre Bodoni metrics
      await t.game('setSettings', { cardSize: 'standard' });
      await t.game('setSettings', { cardSize: 'large' });
      await t.waitForStable();
      const truthTimely = await t.page.evaluate(() => {
        const lay = window.__game.getLayout();
        const wc = lay.piles.waste.cards;
        return {
          idxFull: lay.idxFull,
          step: wc.length >= 2 ? +(wc[1].x - wc[0].x).toFixed(4) : 0,
        };
      });
      t.log(`timely-busy drag: pre=${JSON.stringify({ idxFull: preTimelyDrag.idxFull, step: preTimelyDrag.step })}, post=${JSON.stringify(postTimelyDrag)}, truth=${JSON.stringify(truthTimely)}`);
      t.expect(Math.abs(postTimelyDrag.idxFull - truthTimely.idxFull) <= 0.05 && Math.abs(postTimelyDrag.step - truthTimely.step) <= 0.05,
        `deferred timely relayout(true) updated idxFull & wasteFanStep to Libre Bodoni metrics (post=${postTimelyDrag.idxFull}/${postTimelyDrag.step}, truth=${truthTimely.idxFull}/${truthTimely.step})`);
      t.equal(postTimelyDrag.rebakes, 1, 'deferred timely font arrival executed one deferred rebake on idle');
      await t.page.unroute('**/assets/fonts.css*');

      // 4. Liveness: pending rebake never deadlocks isIdle() with no rAF queued on showTitle(true) or modal over calm ceremony (W5-B01 AC #4)
      let releaseCss4 = null;
      const cssHeld4 = new Promise((r) => { releaseCss4 = r; });
      await t.page.route('**/assets/fonts.css*', async (route) => {
        await cssHeld4;
        await route.continue();
      });
      await t.page.reload({ waitUntil: 'domcontentloaded' });
      await t.page.waitForFunction(() => !!window.__game, null, { timeout: 5000 });
      await baseSettings(t, { sound: false, motion: 'full', tips: false });
      await t.game('newGame', { mode: 'klondike', deal: 42 });
      // Release fonts while deal tweens are active, then immediately switch to Title (cancelling table rAF)
      releaseCss4();
      await t.page.waitForFunction(() => [...document.fonts].some((f) => /Libre Bodoni/i.test(f.family) && f.status === 'loaded'), null, { timeout: 4000 });
      await t.game('scene', 'title');
      let titleIdleOk = false;
      try {
        await t.page.waitForFunction(() => window.__game.isIdle(), null, { timeout: 3000 });
        titleIdleOk = true;
      } catch (_) {
        titleIdleOk = false;
      }
      t.equal(titleIdleOk, true, 'pending font rebake flushes cleanly on showTitle(true) and never leaves isIdle() false');
      await t.page.unroute('**/assets/fonts.css*');

      // Modal opened over a reduced-motion calm ceremony (rafId === 0) with a pending late font rebake also reaches isIdle() cleanly
      let releaseCss5 = null;
      const cssHeld5 = new Promise((r) => { releaseCss5 = r; });
      await t.page.route('**/assets/fonts.css*', async (route) => {
        await cssHeld5;
        await route.continue();
      });
      await t.page.reload({ waitUntil: 'domcontentloaded' });
      await t.page.waitForFunction(() => !!(window.__game && window.__game.isIdle()), null, { timeout: 10000 });
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 1 },
        piles: {
          stock: [], waste: [],
          f0: ['AC', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', 'TC', 'JC', 'QC', 'KC'],
          f1: ['AD', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D', 'TD', 'JD', 'QD', 'KD'],
          f2: ['AH', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', 'TH', 'JH', 'QH', 'KH'],
          f3: ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS', 'JS', 'QS'],
          t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [],
        },
      });
      await t.waitForStable();
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().ceremony, null, { timeout: 4000 });
      releaseCss5();
      await t.page.waitForFunction(() => [...document.fonts].some((f) => /Libre Bodoni/i.test(f.family) && f.status === 'loaded'), null, { timeout: 6000 });
      await t.game('scene', 'settings');
      let modalIdleOk = false;
      try {
        await t.page.waitForFunction(() => window.__game.isIdle(), null, { timeout: 3000 });
        modalIdleOk = true;
      } catch (_) {
        modalIdleOk = false;
      }
      t.equal(modalIdleOk, true, 'opening a modal over calm ceremony with pending font rebake flushes and reaches isIdle() === true');
      t.equal((await t.game('runtimeEconomy')).fontRebakes, 1, 'modal teardown flushed the pending calm-ceremony font rebake once');
      await t.page.unroute('**/assets/fonts.css*');

      // 5. Normal fast loads: fonts arrive before 4 s timeout => zero repeated rebakes deterministically (3 consecutive reloads, including DOM paint of Josefin Sans:400)
      for (let i = 1; i <= 3; i++) {
        await t.page.reload({ waitUntil: 'domcontentloaded' });
        await t.page.waitForFunction(() => !!(window.__game && window.__game.isIdle()), null, { timeout: 10000 });
        await t.game('scene', 'settings');
        await t.waitForStable();
        await t.waitFrames(4);
        const facesLoaded = await t.page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/['"]/g, '')}:${f.weight}`).sort());
        t.expect(facesLoaded.includes('Josefin Sans:400') && facesLoaded.includes('Libre Bodoni:700'), `normal timely load #${i} preloaded all bundled faces: ${facesLoaded.join(', ')}`);
        t.equal((await t.game('runtimeEconomy')).fontRebakes, 0, `normal timely font load #${i} triggers zero repeated rebakes`);
      }
    },
  },
];
