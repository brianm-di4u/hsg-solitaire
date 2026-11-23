// Adaptive layout: the waste sits beside the stock, every pile stays on the table without overlapping another, and
// the board takes the arrangement (top row or side rails) that gives the biggest cards for the screen's shape.
const SIZES = [
  { name: 'phone portrait', w: 390, h: 844 },
  { name: 'phone landscape', w: 844, h: 390, side: true, minCw: 55 },
  { name: 'phone landscape in the site player', w: 844, h: 300, side: true, minCw: 45 },
  { name: 'tablet portrait', w: 768, h: 1024 },
  { name: 'tablet landscape', w: 1024, h: 768 },
  { name: 'laptop', w: 1280, h: 800 },
  { name: 'desktop', w: 1920, h: 1080, minCw: 150 },
];
const MODES = [
  { mode: 'klondike', draw: 1 }, { mode: 'klondike', draw: 3 }, { mode: 'freecell' }, { mode: 'spider', suits: 1 }, { mode: 'yukon' },
];

async function sizeTo(t, w, h) {
  await t.page.setViewportSize({ width: w, height: h });
  await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

export const tests = [
  {
    name: 'layout-01 piles fit and the waste sits beside the stock',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { sound: false, motion: 'reduced' });
      for (const lh of [false, true]) {
        await t.game('setSettings', { leftHanded: lh });
        for (const sz of SIZES) {
          await sizeTo(t, sz.w, sz.h);
          for (const m of MODES) {
            await t.game('newGame', Object.assign({ deal: 5 }, m));
            if (m.mode === 'klondike') for (let i = 0; i < 3; i++) await t.game('act', 'draw');
            await t.waitForStable();
            const L = await t.game('getLayout'), tag = `${sz.name}${lh ? ' (left-handed)' : ''} ${m.mode}${m.draw ? m.draw : ''}`;
            // every pile's base slot lies inside the stage
            const r = await t.page.evaluate(() => { const b = document.getElementById('stage').getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; });
            const out = Object.entries(L.piles).filter(([, p]) => p.x < r.l - .5 || p.y < r.t - .5 || p.x + L.cardW > r.r + .5 || p.y + L.cardH > r.b + .5).map(([id]) => id);
            t.expect(!out.length, `${tag}: piles inside the table${out.length ? ' (outside: ' + out.join(',') + ')' : ''}`);
            // no two base slots overlap
            let clash = '';
            const ids = Object.keys(L.piles);
            for (let i = 0; i < ids.length && !clash; i++) for (let j = i + 1; j < ids.length; j++) {
              const a = L.piles[ids[i]], b = L.piles[ids[j]];
              if (a.x < b.x + L.cardW - 1 && b.x < a.x + L.cardW - 1 && a.y < b.y + L.cardH - 1 && b.y < a.y + L.cardH - 1) { clash = ids[i] + '/' + ids[j]; break; }
            }
            t.expect(!clash, `${tag}: no piles overlap${clash ? ' (' + clash + ')' : ''}`);
            if (m.mode === 'klondike') {
              const st = L.piles.stock, w = L.piles.waste, top = w.cards[w.cards.length - 1];
              const near = L.arr === 'side' ? Math.abs(st.x - w.x) < 1 && w.y - st.y <= L.cardH + L.gap + 9 : Math.abs(st.x - w.x) <= L.cardW + L.gap + 1;
              t.expect(near, `${tag}: waste slot next to the stock (${L.arr})`);
              if (L.arr === 'top' && st.x > w.x) t.expect(w.cards.every((c) => c.x <= top.x + .5) && Math.abs(top.x - w.x) < 1, `${tag}: playable waste card on the slot nearest the stock`);
            }
            if (sz.side && (m.mode === 'klondike' || m.mode === 'yukon')) t.expect(L.arr === 'side', `${tag}: short landscape uses the side rails`);
            if (sz.minCw && m.mode === 'klondike') t.expect(L.cardW >= sz.minCw, `${tag}: card ${L.cardW}px ≥ ${sz.minCw}px`);
            if (m.mode === 'klondike' && m.draw === 1 && !lh) t.log(`${sz.name}: ${L.arr}, card ${L.cardW}px`);
          }
        }
      }
      await t.game('setSettings', { leftHanded: false });
      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
  {
    name: 'layout-02 short landscape puts the actions in a side rail',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { sound: false, motion: 'reduced' });
      await sizeTo(t, 844, 390);
      await t.game('newGame', { mode: 'klondike', deal: 2 });
      await t.waitForStable();
      const g = await t.page.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(), k = document.getElementById('tools').getBoundingClientRect(); return { sh: s.height, kl: k.left, sr: s.right, kh: k.height }; });
      t.expect(g.kl >= g.sr - 1, 'tool rail sits right of the table');
      t.expect(g.sh >= 340, `table keeps the height (${Math.round(g.sh)}px)`);
      await t.shot('layout-02-phone-landscape');
      await t.game('setSettings', { leftHanded: true }); await t.waitForStable();
      const k2 = await t.page.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(), k = document.getElementById('tools').getBoundingClientRect(); return { kr: k.right, sl: s.left }; });
      t.expect(k2.kr <= k2.sl + 1, 'left-handed: tool rail on the left');
      await t.shot('layout-02-phone-landscape-lefthanded');
      await t.game('setSettings', { leftHanded: false });
      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
  {
    name: 'layout-03 Classic table layout keeps the top row',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { sound: false, motion: 'reduced', layout: 'fit' });
      for (const [w, h] of [[844, 390], [1920, 1080]]) {
        await sizeTo(t, w, h);
        await t.game('newGame', { mode: 'klondike', deal: 3 });
        const fit = await t.game('getLayout');
        await t.game('setSettings', { layout: 'classic' }); await t.waitForStable();
        const classic = await t.game('getLayout');
        t.expect(fit.arr === 'side' && classic.arr === 'top', `${w}×${h}: Fit screen uses rails, Classic the top row`);
        t.expect(classic.piles.stock.y === classic.piles.f0.y && classic.piles.t0.y > classic.piles.f0.y, `${w}×${h}: Classic piles sit in a row above the columns`);
        t.expect(Math.abs(classic.piles.stock.x - classic.piles.waste.x) <= classic.cardW + classic.gap + 1, `${w}×${h}: Classic keeps the waste beside the stock`);
        t.log(`${w}×${h}: fit ${fit.cardW}px, classic ${classic.cardW}px`);
        if (w === 844) await t.shot('layout-03-classic-phone-landscape');
        await t.game('setSettings', { layout: 'fit' });
      }
      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
  {
    name: 'layout-04 W6-S4-01 title landmark two-pocket clearance across laptop, landscape phone, and portrait tablets',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { sound: false, motion: 'reduced', tips: false });
      await t.game('scene', 'title');
      await t.page.waitForFunction(() => window.__game.heroTags().drawn, null, { timeout: 15000 });

      const measure = async (w, h) => {
        await sizeTo(t, w, h);
        await t.game('scene', 'title');
        await t.page.waitForFunction(() => {
          const c = document.getElementById('sky');
          return c && c.clientWidth === window.innerWidth && window.__game.heroTags().drawn;
        }, null, { timeout: 10000 });
        return t.page.evaluate(() => {
          const h1 = document.getElementById('tH');
          const rng = document.createRange();
          rng.selectNodeContents(h1);
          const hb = h1.getBoundingClientRect(), ht = rng.getBoundingClientRect();
          const tr = document.getElementById('tiles').getBoundingClientRect();
          const cont = document.getElementById('tCont');
          const cr = cont && !cont.hidden ? cont.getBoundingClientRect() : null;
          return {
            W: innerWidth, H: innerHeight,
            tags: window.__game.heroTags().tags,
            h1: { left: ht.left, right: ht.right, top: Math.min(hb.top, ht.top), bottom: Math.max(hb.bottom, ht.bottom) },
            tilesTop: tr.top,
            cont: cr && cr.height > 0 ? { left: cr.left, right: cr.right, top: cr.top, bottom: cr.bottom } : null,
          };
        });
      };

      const checkSweep = async (phase) => {
        for (const [w, h, expectPocket, shotName] of [
          [1280, 800, 'above', null],
          [1024, 600, 'above', phase === 'fresh' ? 'layout-04-w6-s4-01-1024x600' : null],
          [844, 390, 'left', phase === 'fresh' ? 'layout-04-w6-s4-01-844x390' : 'layout-04-w6-s4-01-844x390-saved'],
          [800, 1100, 'above', phase === 'fresh' ? 'layout-04-w6-s4-01-800x1100' : null],
          [820, 1180, 'above', phase === 'fresh' ? 'layout-04-w6-s4-01-820x1180' : null],
          [390, 844, 'above', null],
        ]) {
          const m = await measure(w, h);
          const label = `${phase} ${w}x${h}`;
          t.equal(m.tags.map((x) => x.text), ['CENTRAL AVENUE · BATHHOUSE ROW'], `${label}: keeps verbatim Central Avenue · Bathhouse Row tag (CD-WF0-07)`);
          t.expect(!m.tags.some((x) => /ARLINGTON/i.test(x.text)), `${label}: never adds Arlington tag (CD-WF0-07)`);
          const tag = m.tags[0];
          if (tag) {
            t.expect(tag.x >= 15.5 && tag.x + tag.w <= m.W - 15.5 && tag.y >= 11.5, `${label}: tag stays inside frame margins (${JSON.stringify(tag)})`);
            if (expectPocket === 'above') {
              t.expect(tag.y + tag.h <= m.h1.top - 7.5 && tag.y + tag.h <= m.tilesTop - 7.5, `${label}: above-pocket tag clears <h1> (top=${m.h1.top.toFixed(1)}) and #tiles (top=${m.tilesTop.toFixed(1)}): ${JSON.stringify(tag)}`);
            } else {
              const cy = tag.y + tag.h / 2;
              t.expect(tag.x + tag.w <= m.h1.left - 13.5, `${label}: left-pocket tag clears <h1> text left (${m.h1.left.toFixed(1)}): ${JSON.stringify(tag)}`);
              t.expect(cy + 12 <= m.tilesTop - 5.5, `${label}: left-pocket tag clears #tiles top (${m.tilesTop.toFixed(1)}): ${JSON.stringify(tag)}`);
              if (m.cont) {
                const clearsCont = cy + 12 <= m.cont.top - 5.5 || tag.x + tag.w <= m.cont.left - 13.5;
                t.expect(clearsCont, `${label}: left-pocket tag clears #tCont (${JSON.stringify(m.cont)}): ${JSON.stringify(tag)}`);
              }
            }
          }
          if (shotName) await t.shot(shotName);
        }
        // Ultra-compact landscape where neither sky pocket clears both DOM rects: omit cleanly rather than colliding.
        for (const [w, h] of [[640, 360], [568, 320]]) {
          const m = await measure(w, h);
          t.equal(m.tags, [], `${phase} ${w}x${h}: omits tag cleanly when neither sky pocket fits`);
        }
      };

      await checkSweep('fresh');
      // Verify with Continue CTA (#tCont) visible as well
      await sizeTo(t, 1280, 800);
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 5 });
      await t.game('act', 'draw');
      await t.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      await checkSweep('saved');
      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
];
