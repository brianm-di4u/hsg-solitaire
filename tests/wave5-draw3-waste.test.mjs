// Wave 5 Batch W5-B01: Klondike Draw-3 horizontal waste fan width, rank visibility, mirroring, and drawWaypoints sync (W5-F4)
import { baseSettings } from './_util.mjs';

const EMPTY_K = { stock: ['#2S'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['9S'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };

async function sizeTo(t, w, h) {
  await t.page.setViewportSize({ width: w, height: h });
  await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

export const tests = [
  {
    name: 'wave5-f4 Draw-3 horizontal waste fan exposes 10/J/Q/K/A fully on phones & desktop, both hands, clear of foundations',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, table: 'felt', courts: 'deco', layout: 'classic' });

      const configs = [
        [390, 844, 'standard', false, 'wave5-f4-390x844-std'],
        [390, 844, 'standard', true, null],
        [390, 844, 'large', false, 'wave5-f4-390x844-large'],
        [390, 844, 'large', true, 'wave5-f4-390x844-large-lh'],
        [360, 640, 'standard', false, null],
        [360, 640, 'large', false, null],
        [360, 640, 'large', true, null],
        [1280, 800, 'standard', false, 'wave5-f4-1280x800-classic-std'],
        [1280, 800, 'large', false, null],
        [1280, 800, 'large', true, null],
      ];

      const wasteTriples = [
        [['10', 'TH'], ['K', 'KH'], ['2', '2C']],
        [['J', 'JH'], ['Q', 'QH'], ['3', '3C']],
        [['A', 'AH'], ['9', '9H'], ['4', '4C']],
      ];

      for (const [vw, vh, cardSize, leftHanded, shotName] of configs) {
        await sizeTo(t, vw, vh);
        await t.game('setSettings', { cardSize, leftHanded, layout: 'classic' });
        const large = cardSize === 'large';

        for (let ti = 0; ti < wasteTriples.length; ti++) {
          const triple = wasteTriples[ti];
          await t.game('setState', {
            mode: 'klondike', opts: { draw: 3 },
            piles: Object.assign({}, EMPTY_K, { waste: triple.map((x) => x[1]) }),
          });
          await t.waitForStable();

          const res = await t.page.evaluate(({ labels, isLarge, isLH }) => {
            const cv = document.getElementById('cv'), g = cv.getContext('2d');
            const rect = cv.getBoundingClientRect(), k = cv.width / rect.width;
            const lay = window.__game.getLayout();
            const cw = lay.cardW, ch = lay.cardH;
            const geom = window.__game.cardGeometry(cw, ch, isLarge);
            const wPile = lay.piles.waste, cs = wPile.cards;
            const step01 = Math.abs(cs[1].x - cs[0].x);
            const step12 = Math.abs(cs[2].x - cs[1].x);
            const minX = Math.min(...cs.map((c) => c.x));
            const maxR = Math.max(...cs.map((c) => c.x + cw));
            const f3 = lay.piles.f3, f0 = lay.piles.f0;
            const clearNeighbor = isLH ? (maxR <= f0.x - 0.5) : (f3.x + cw <= minX - 0.5);
            const onTable = minX >= rect.left - 0.5 && maxR <= rect.right + 0.5;
            const topAnchored = isLH ? (Math.abs(cs[0].x - wPile.x) < 0.5) : (Math.abs(cs[2].x - wPile.x) < 0.5);

            // Check that both underneath fanned cards' full rank ink boxes fit strictly inside step01 / step12
            const clipped = [];
            for (let idx = 0; idx < 2; idx++) {
              const lab = labels[idx];
              const box = geom.rankInk[lab].top;
              const inkRight = box.x + box.w;
              const step = idx === 0 ? step01 : step12;
              if (inkRight > step + 0.25) clipped.push(`${lab} inkRight=${inkRight.toFixed(2)} > step=${step.toFixed(2)}`);
            }

            // Pixel verification on the drawn canvas: for '10' (triple 0, idx 0), verify the '0' right half (>0.34*cw) has visible red ink
            let tenZeroPixels = null;
            if (labels[0] === '10') {
              const c0 = cs[0];
              const isRedInk = (r, gr, b, a) => a > 120 && (r - gr) >= 35 && Math.abs(gr - b) <= 32 && r >= 100;
              const sx = Math.round((c0.x - rect.left + cw * 0.34) * k);
              const ex = Math.round((c0.x - rect.left + Math.min(step01 - 0.5, cw * 0.55)) * k);
              const sy = Math.round((c0.y - rect.top + ch * 0.02) * k);
              const ey = Math.round((c0.y - rect.top + lay.idxFull) * k);
              let count = 0;
              if (ex > sx && ey > sy) {
                const d = g.getImageData(sx, sy, ex - sx, ey - sy).data;
                for (let i = 0; i < d.length; i += 4) if (isRedInk(d[i], d[i + 1], d[i + 2], d[i + 3])) count++;
              }
              tenZeroPixels = count;
            }

            return {
              arr: lay.arr, cw, gap: +lay.gap.toFixed(2),
              step01: +step01.toFixed(2), step12: +step12.toFixed(2),
              minStep: +(cw * 0.27).toFixed(2),
              clearNeighbor, onTable, topAnchored, clipped, tenZeroPixels,
            };
          }, { labels: triple.map((x) => x[0]), isLarge: large, isLH: leftHanded });

          const tag = `${vw}x${vh} ${cardSize}${leftHanded ? ' LH' : ''} [${triple.map((x) => x[0]).join(',')}]`;
          t.equal(res.arr, 'top', `${tag}: horizontal top-row arrangement`);
          t.expect(res.step01 >= res.minStep - 0.1 && Math.abs(res.step01 - res.step12) < 0.5, `${tag}: consistent fan step >= 0.27*cw (${JSON.stringify(res)})`);
          t.equal(res.clipped, [], `${tag}: all fanned ranks' measured ink fits inside exposed strip (${JSON.stringify(res)})`);
          t.equal(res.clearNeighbor, true, `${tag}: waste fan stays clear of neighbouring foundation (${JSON.stringify(res)})`);
          t.equal(res.onTable, true, `${tag}: waste fan stays on table (${JSON.stringify(res)})`);
          t.equal(res.topAnchored, true, `${tag}: anchor card position preserved (${JSON.stringify(res)})`);
          if (res.tenZeroPixels !== null) {
            t.expect(res.tenZeroPixels >= 4, `${tag}: '0' of '10' has visible red pixels in exposed strip (got ${res.tenZeroPixels})`);
          }
          if (ti === 0 && shotName) await t.shot(shotName);
        }
      }

      // Verify drawWaypoints parity & top-card hit-test/tap with the wider fan step
      await sizeTo(t, 390, 844);
      await t.game('setSettings', { cardSize: 'large', leftHanded: false, layout: 'classic', motion: 'full', autoFoundation: 'safe' });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 3 },
        piles: Object.assign({}, EMPTY_K, { stock: ['AS', 'KH', 'TH'], waste: [] }),
      });
      await t.game('act', 'draw');
      const wp = await t.page.evaluate(() => ({
        w0: window.__game.dispOf('waste', 0),
        w1: window.__game.dispOf('waste', 1),
        f0: window.__game.dispOf('f0'),
        lay: window.__game.getLayout(),
      }));
      t.expect(Math.abs(wp.f0.sx - wp.w1.tx) < 1 && Math.abs(wp.w1.tx - wp.w0.tx) >= wp.lay.cardW * 0.45,
        `drawWaypoints matches wider waste fan step and top slot anchor: ${JSON.stringify({ f0sx: wp.f0.sx, w0tx: wp.w0.tx, w1tx: wp.w1.tx, cw: wp.lay.cardW })}`);

      // Verify clicking top waste card still plays it cleanly (hit-testing unchanged)
      await t.game('setSettings', { motion: 'reduced', autoFoundation: 'off', tapMove: 'tap' });
      await t.game('setState', {
        mode: 'klondike', opts: { draw: 3 },
        piles: Object.assign({}, EMPTY_K, { waste: ['TH', 'KH', 'AS'] }),
      });
      await t.waitForStable();
      const layTop = await t.game('getLayout');
      const topCard = layTop.piles.waste.cards[2];
      await t.page.mouse.click(topCard.x + topCard.w / 2, topCard.y + topCard.h / 2);
      await t.waitForStable();
      t.equal((await t.game('getState')).piles.f0, ['AS'], 'clicking top waste card plays AS to foundation');

      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
];
