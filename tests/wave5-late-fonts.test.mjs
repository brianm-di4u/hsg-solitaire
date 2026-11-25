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

      // 3. Normal fast load: fonts arrive before 4 s timeout => zero extra rebakes
      await t.page.reload({ waitUntil: 'domcontentloaded' });
      await t.page.waitForFunction(() => !!(window.__game && window.__game.isIdle()), null, { timeout: 10000 });
      await t.waitFrames(3);
      t.equal((await t.game('runtimeEconomy')).fontRebakes, 0, 'normal timely font load triggers zero repeated rebakes');
    },
  },
];
