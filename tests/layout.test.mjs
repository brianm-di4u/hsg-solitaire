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
  {
    name: 'layout-05 W1-S5-07 compact 320x568 and 360x600 phone title surfaces primary CTA and all four mode titles above fold',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { sound: false, motion: 'reduced', tips: false });

      const inspectTitle = async (w, h, resetTagline = false) => {
        await sizeTo(t, w, h);
        await t.game('scene', 'title');
        if (resetTagline) {
          await t.page.evaluate(() => {
            const el = document.getElementById('tTag');
            if (el) el.textContent = 'Patience, the Spa City way: four classic games, twelve Hot Springs card backs.';
          });
          await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        }
        await t.page.waitForFunction(() => {
          const c = document.getElementById('sky');
          return c && c.clientWidth === window.innerWidth && window.__game.heroTags().drawn;
        }, null, { timeout: 10000 });
        return t.page.evaluate(() => {
          const h1 = document.getElementById('tH');
          const rng = document.createRange();
          rng.selectNodeContents(h1);
          const hb = h1.getBoundingClientRect(), ht = rng.getBoundingClientRect();
          const h1Top = Math.min(hb.top, ht.top);
          const tiles = [...document.querySelectorAll('#tiles .tile')].map((el) => {
            const h2 = el.querySelector('h2').getBoundingClientRect();
            const sub = el.querySelector('.tsub');
            const subR = sub.getBoundingClientRect();
            const cv = el.querySelector('canvas');
            const cvR = cv.getBoundingClientRect();
            const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
            let edge = 0;
            for (let y = 0; y < cv.height; y++) for (const x of [0, cv.width - 1]) if (d[(y * cv.width + x) * 4 + 3] > 8) edge++;
            const painted = d.some((v, i) => i % 4 === 3 && v > 8);
            const chips = [...el.querySelectorAll('.chip')].map((c) => {
              const r = c.getBoundingClientRect();
              return { txt: c.textContent.trim(), solid: c.classList.contains('solid'), top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) };
            });
            return {
              name: el.querySelector('h2').textContent.trim(),
              h2Bottom: Math.round(h2.bottom),
              subBottom: Math.round(subR.bottom),
              subLines: Math.round(subR.height / parseFloat(getComputedStyle(sub).fontSize) * 1.2),
              canvasH: Math.round(cvR.height),
              painted,
              edge,
              chips,
            };
          });
          const tRow = [...document.querySelectorAll('#tRow .btn')].map((b) => b.textContent.trim());
          const allBtns = [...document.querySelectorAll('#title button')].filter((b) => !b.hidden && b.getClientRects().length > 0);
          const smallBtns = allBtns.filter((b) => { const r = b.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).map((b) => b.textContent.trim());
          const cont = document.getElementById('tCont');
          const contR = cont && !cont.hidden ? cont.getBoundingClientRect() : null;
          return {
            W: innerWidth, H: innerHeight,
            overflowX: document.documentElement.scrollWidth > innerWidth,
            tags: window.__game.heroTags().tags,
            h1Top,
            tTagBg: getComputedStyle(document.getElementById('tTag')).backgroundColor,
            tRow,
            smallBtns,
            contBottom: contR ? Math.round(contR.bottom) : null,
            tiles,
          };
        });
      };

      // 1. Fresh 320x568 (with longest initial tagline) and 360x600: all 4 mode titles, fans, subtitles, and all 8 Play chips fit cleanly above the fold
      for (const [w, h, shotName] of [[320, 568, 'layout-05-w1-s5-07-320x568'], [360, 600, null]]) {
        const m = await inspectTitle(w, h, true);
        const lbl = `fresh ${w}x${h}`;
        t.expect(!m.overflowX, `${lbl}: zero horizontal overflow`);
        t.equal(m.tags.map((x) => x.text), ['CENTRAL AVENUE · BATHHOUSE ROW'], `${lbl}: preserves CENTRAL AVENUE · BATHHOUSE ROW verbatim (CD-WF0-07)`);
        t.expect(m.tags[0] && m.tags[0].y + m.tags[0].h <= m.h1Top - 7.5, `${lbl}: Bathhouse Row tag clears <h1> (h1Top=${m.h1Top.toFixed(1)}, tag=${JSON.stringify(m.tags[0])})`);
        t.equal(m.tRow, ['Daily deals', 'Backs & tables', 'Bathhouse Ledger', 'Settings', 'How to play'], `${lbl}: preserves #tRow button copy verbatim (CD-WF6-05)`);
        t.equal(m.smallBtns, [], `${lbl}: all Title buttons keep >= 44x44 touch targets`);
        t.expect(m.tTagBg !== 'rgba(0, 0, 0, 0)', `${lbl}: tagline keeps dark scrim (w3e S4-23)`);
        t.expect(m.tiles.every((tl) => tl.painted && tl.edge === 0), `${lbl}: all 4 card hands stay painted and unclipped at canvas edges`);
        t.expect(m.tiles.every((tl) => tl.subLines === 1), `${lbl}: all 4 Hot Springs subtitles stay single-line`);
        const maxH2 = Math.max(...m.tiles.map((tl) => tl.h2Bottom));
        const maxChip = Math.max(...m.tiles.flatMap((tl) => tl.chips.map((c) => c.bottom)));
        const draw1 = m.tiles[0].chips[0];
        t.expect(draw1.solid && draw1.bottom <= m.H, `${lbl}: primary Klondike Draw 1 CTA above fold (${draw1.bottom} <= ${m.H})`);
        t.expect(maxH2 <= m.H, `${lbl}: all 4 mode titles above fold (max h2 bottom=${maxH2} <= ${m.H})`);
        t.expect(maxChip <= m.H, `${lbl}: all 8 mode Play chips above fold (max chip bottom=${maxChip} <= ${m.H})`);
        if (shotName) await t.shot(shotName);
      }

      // 2. Saved-deal 320x568 (#tCont visible): Continue CTA, Bathhouse Row tag, and all 4 mode titles + subtitles stay cleanly above the fold
      await sizeTo(t, 1280, 800);
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 5 });
      await t.game('act', 'draw');
      await t.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      const sv = await inspectTitle(320, 568, true);
      t.equal(sv.tags.map((x) => x.text), ['CENTRAL AVENUE · BATHHOUSE ROW'], 'saved 320x568: preserves CENTRAL AVENUE · BATHHOUSE ROW tag (CD-WF0-07)');
      t.expect(sv.tags[0] && sv.tags[0].y + sv.tags[0].h <= sv.h1Top - 7.5, `saved 320x568: Bathhouse Row tag clears <h1> (h1Top=${sv.h1Top.toFixed(1)})`);
      t.expect(sv.contBottom !== null && sv.contBottom <= sv.H, `saved 320x568: Continue CTA above fold (${sv.contBottom} <= ${sv.H})`);
      t.expect(sv.tiles.every((tl) => tl.h2Bottom <= sv.H && tl.subBottom <= sv.H), 'saved 320x568: all 4 mode titles and subtitles stay above fold: ' + JSON.stringify(sv.tiles.map((x) => [x.name, x.h2Bottom, x.subBottom])));
      t.equal(sv.smallBtns, [], 'saved 320x568: all Title buttons keep >= 44x44 touch targets');
      await t.shot('layout-05-w1-s5-07-320x568-saved');

      // 3. Non-compact portrait phones (360x640, 390x844) stay outside the <=360x600 breakpoint
      for (const [w, h] of [[360, 640], [390, 844]]) {
        const reg = await inspectTitle(w, h, false);
        t.equal(reg.tiles[0].canvasH, 52, `${w}x${h}: keeps standard 52px portrait card-fan height outside <=360x600 breakpoint`);
      }

      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
  {
    name: 'layout-06 W6-S4-06 hint arc clears destination corner indices and mobile <560px notices clear bottom brass corner fans',
    async run(t) {
      await t.game('setSettings', { sound: false, motion: 'reduced', tips: false, autoFoundation: 'off' });
      const checkArcClearsIndices = async (label) => {
        await t.page.waitForFunction(() => !!window.__game.hintArrowGeom(), null, { timeout: 5000 });
        const res = await t.page.evaluate(() => {
          const a = window.__game.hintArrowGeom();
          const lay = window.__game.getLayout();
          const geom = window.__game.cardGeometry(lay.cardW, lay.cardH, false);
          const pad = Math.max(2, lay.cardW * 0.025);
          const hits = [];
          for (let i = 0; i <= 40; i++) {
            const k = i / 40, u = 1 - k;
            const x = u * u * a.x0 + 2 * u * k * a.qx + k * k * a.x1;
            const y = u * u * a.y0 + 2 * u * k * a.qy + k * k * a.y1;
            for (const [bi, b] of geom.topBoxes.entries()) {
              const bx = a.dl.x + b.x - pad, by = a.dl.y + b.y - pad, bw = b.w + pad * 2, bh = b.h + pad * 2;
              if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
                hits.push({ bi, k: +k.toFixed(2), x: Math.round(x), y: Math.round(y), box: [Math.round(bx), Math.round(by), Math.round(bx + bw), Math.round(by + bh)] });
              }
            }
          }
          return { a, hits };
        });
        t.equal(res.hits, [], `${label}: hint arc clears destination top-left & top-right corner index boxes (${JSON.stringify(res.a)})`);
      };

      // 1. Left-to-right Klondike tableau move (2D -> 3S): classic repro from mobile/desktop klondike-hint.png
      const EK = { stock: ['#9C'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EK, { t1: ['#7C', '2D'], t3: ['#8D', '3S'], t6: ['KH'] }) });
      await t.waitForStable();
      await t.game('act', 'hint');
      await t.waitFrames(2);
      await checkArcClearsIndices('left-to-right 2D->3S');
      await t.shot('layout-06-hint-arc');

      // 2. Right-to-left tableau move (5H -> 6C)
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EK, { t1: ['#7C', '6C'], t5: ['#8D', '5H'], t6: ['KH'] }) });
      await t.waitForStable();
      await t.game('act', 'hint');
      await t.waitFrames(2);
      await checkArcClearsIndices('right-to-left 5H->6C');

      // 3. Downward Waste -> adjacent tableau column move (5H -> 6S on t5)
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EK, { waste: ['5H'], t5: ['6S'], t6: ['KH'] }) });
      await t.waitForStable();
      await t.game('act', 'hint');
      await t.waitFrames(2);
      await checkArcClearsIndices('downward waste->t5');

      // 4. Mobile (<560px) #notices floats cleanly above bottom brass corner fans (no overlap with bottom corners)
      if (t.viewport === 'mobile') {
        await t.game('setSettings', { tips: true, tipModes: '', tipStep: 0 });
        await t.game('newGame', { mode: 'klondike', draw: 1, deal: 5 });
        await t.page.waitForFunction(() => !document.getElementById('coach').hidden && window.__game.inlayMetrics() && window.__game.inlayMetrics().hasBottomFans, null, { timeout: 8000 });
        const clearance = await t.page.evaluate(() => {
          const st = document.getElementById('stage').getBoundingClientRect();
          const n = document.getElementById('notices').getBoundingClientRect();
          const inl = window.__game.inlayMetrics();
          const fanTop = st.bottom - inl.m - inl.cornerS;
          return {
            noticesBottom: Math.round(n.bottom),
            fanTop: Math.round(fanTop),
            stageBottom: Math.round(st.bottom),
            m: inl.m,
            cornerS: inl.cornerS,
            hasBottomFans: inl.hasBottomFans,
          };
        });
        t.expect(clearance.hasBottomFans && clearance.noticesBottom <= clearance.fanTop + 1, 'mobile <560px #notices clears bottom brass corner fans: ' + JSON.stringify(clearance));
        await t.shot('layout-06-mobile-notices-clearance');
      }
    },
  },
  {
    name: 'layout-07 W6-S5-05 compact <=360x620 Title with scroll-fade cue, #tStore .credit clearance, and 390x844 Settings Audio Vibration clearance',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { sound: false, motion: 'reduced', tips: false });

      // 1. Compact <=360x620 Title (320x568 and 360x620): compact card hands, all 4 mode titles + chips above fold, and subtle scroll-fade cue when #title overflows
      for (const [w, h, shotName] of [[320, 568, 'layout-07-w6-s5-05-320x568-cue'], [360, 620, null]]) {
        await sizeTo(t, w, h);
        await t.game('scene', 'title');
        await t.page.evaluate(() => {
          const el = document.getElementById('tTag');
          if (el) el.textContent = 'Patience, the Spa City way: four classic games, twelve Hot Springs card backs.';
          document.getElementById('title').scrollTop = 0;
        });
        await t.page.waitForFunction(() => {
          const c = document.getElementById('sky');
          return c && c.clientWidth === window.innerWidth && window.__game.heroTags().drawn;
        }, null, { timeout: 10000 });
        await t.waitFrames(2);
        const topState = await t.page.evaluate(() => {
          const title = document.getElementById('title');
          const cue = document.getElementById('tScrollCue');
          const tiles = [...title.querySelectorAll('.tile')].map((el) => ({
            name: el.querySelector('h2').textContent.trim(),
            h2Bot: Math.round(el.querySelector('h2').getBoundingClientRect().bottom),
            cvH: Math.round(el.querySelector('canvas').getBoundingClientRect().height),
            maxChipBot: Math.round(Math.max(...[...el.querySelectorAll('.chip')].map((c) => c.getBoundingClientRect().bottom))),
          }));
          return {
            H: innerHeight,
            overflowX: document.documentElement.scrollWidth > innerWidth,
            scrollH: title.scrollHeight,
            clientH: title.clientHeight,
            hasMore: title.classList.contains('has-more'),
            cueExists: !!cue,
            cueOpacity: cue ? parseFloat(getComputedStyle(cue).opacity) : 0,
            cuePtr: cue ? getComputedStyle(cue).pointerEvents : '',
            tiles,
          };
        });
        const lbl = `${w}x${h}`;
        t.expect(!topState.overflowX, `${lbl}: zero horizontal overflow`);
        t.equal(topState.tiles[0].cvH, 38, `${lbl}: <=360x620 applies compact 38px card-fan height`);
        t.expect(topState.tiles.every((tl) => tl.h2Bot <= topState.H && tl.maxChipBot <= topState.H), `${lbl}: all 4 mode titles and Play chips fit above fold: ${JSON.stringify(topState.tiles)}`);
        t.equal([topState.cueExists, topState.hasMore, topState.cueOpacity, topState.cuePtr], [true, true, 1, 'none'], `${lbl}: shows non-blocking bottom scroll-fade cue when #title overflows`);
        if (shotName) await t.shot(shotName);

        // Scrolling #title to the bottom dismisses the scroll-fade cue cleanly
        await t.page.evaluate(() => {
          const title = document.getElementById('title');
          title.scrollTop = title.scrollHeight;
          title.dispatchEvent(new Event('scroll'));
        });
        await t.waitFrames(2);
        const botState = await t.page.evaluate(() => {
          const title = document.getElementById('title');
          const cue = document.getElementById('tScrollCue');
          return { hasMore: title.classList.contains('has-more'), cueOpacity: cue ? parseFloat(getComputedStyle(cue).opacity) : 0 };
        });
        t.equal(botState, { hasMore: false, cueOpacity: 0 }, `${lbl}: hides bottom scroll-fade cue once scrolled to the bottom`);
        await t.page.evaluate(() => { document.getElementById('title').scrollTop = 0; });
      }

      // 2. Non-overflowing viewports (1280x800 and 390x844 fresh) keep the scroll-fade cue hidden, and 1280x800 blocked-storage #tStore keeps .credit clear of the bottom brass border
      await sizeTo(t, 390, 844);
      await t.game('scene', 'title');
      await t.waitFrames(2);
      const mob390 = await t.page.evaluate(() => ({
        hasMore: document.getElementById('title').classList.contains('has-more'),
        cvH: Math.round(document.querySelector('#tiles .tile canvas').getBoundingClientRect().height),
      }));
      t.equal(mob390, { hasMore: false, cvH: 52 }, '390x844 fresh Title keeps standard 52px fans and hides scroll-fade cue when all controls fit');

      await sizeTo(t, 1280, 800);
      await t.game('scene', 'title');
      await t.waitFrames(2);
      const deskFresh = await t.page.evaluate(() => ({
        hasMore: document.getElementById('title').classList.contains('has-more'),
        padTop: parseFloat(getComputedStyle(document.querySelector('#title .wrap')).paddingTop),
      }));
      t.equal(deskFresh.hasMore, false, '1280x800 fresh Title hides scroll-fade cue');

      // Show blocked-storage #tStore notice on 1280x800 Title: top padding compacts like #tCont so .credit clears the bottom brass border (inner line at H - 16.2px)
      await t.page.evaluate(() => {
        const el = document.getElementById('tStore');
        el.textContent = "Progress won't be kept in this browser.";
        el.hidden = false;
        window.dispatchEvent(new Event('resize'));
      });
      await t.waitFrames(2);
      const deskStore = await t.page.evaluate(() => {
        const title = document.getElementById('title');
        const wrap = title.querySelector('.wrap');
        const cred = title.querySelector('.credit').getBoundingClientRect();
        const m = Math.min(12, Math.max(6, Math.min(innerWidth, innerHeight) * 0.014));
        const innerBrassTop = innerHeight - (m + 5);
        return {
          padTop: parseFloat(getComputedStyle(wrap).paddingTop),
          scrollH: title.scrollHeight,
          clientH: title.clientHeight,
          credBot: Math.round(cred.bottom),
          innerBrassTop: Math.round(innerBrassTop),
          clearance: Math.round(innerBrassTop - cred.bottom),
          hasMore: title.classList.contains('has-more'),
        };
      });
      t.expect(deskStore.padTop < deskFresh.padTop - 10, `1280x800 #tStore compacts #title .wrap top padding (${deskFresh.padTop} -> ${deskStore.padTop})`);
      t.expect(deskStore.credBot <= deskStore.innerBrassTop - 12 && deskStore.scrollH <= deskStore.clientH + 1, `1280x800 #tStore keeps .credit clear of bottom brass border with zero vertical overflow: ${JSON.stringify(deskStore)}`);
      t.equal(deskStore.hasMore, false, '1280x800 #tStore Title stays unclipped with scroll-fade cue hidden');
      await t.shot('layout-07-w6-s5-05-1280x800-tstore');
      await t.page.evaluate(() => { document.getElementById('tStore').hidden = true; });

      // 3. 390x844 Settings -> Audio (both from Title and from Game table, with Vibration visible): Vibration clears the bottom brass border with zero scroll clipping and >=44px touch targets
      await sizeTo(t, 390, 844);
      await t.page.evaluate(() => { if (!navigator.vibrate) navigator.vibrate = () => true; });
      for (const [origin, shotName] of [['title', null], ['game', 'layout-07-w6-s5-05-390x844-audio']]) {
        if (origin === 'game') await t.game('newGame', { mode: 'klondike', draw: 1, deal: 5 });
        else await t.game('scene', 'title');
        await t.game('scene', 'settings', { tab: 'audio' });
        await t.waitFrames(2);
        const audio = await t.page.evaluate(() => {
          const sf = document.getElementById('sheetFrame').getBoundingClientRect();
          const sb = document.getElementById('sheetBody');
          const sbr = sb.getBoundingClientRect();
          const vib = document.getElementById('lbl-haptics')?.closest('.set');
          const vr = vib ? vib.getBoundingClientRect() : null;
          const borderW = parseFloat(getComputedStyle(document.getElementById('sheetFrame'), '::after').borderBottomWidth) || 14;
          const brassInnerBot = sf.bottom - borderW;
          const controls = [...document.querySelectorAll('#spanel-audio input[type=range], #spanel-audio button.tog')].map((el) => {
            const r = el.getBoundingClientRect();
            return { id: el.id || el.dataset.tog, w: Math.round(r.width), h: Math.round(r.height) };
          });
          return {
            hasVib: !!vib,
            sbOverflow: sb.scrollHeight - sb.clientHeight,
            vibBot: vr ? Math.round(vr.bottom) : null,
            sbBot: Math.round(sbr.bottom),
            brassInnerBot: Math.round(brassInnerBot),
            clearsBrass: vr ? Math.round(brassInnerBot - vr.bottom) : null,
            controls,
          };
        });
        t.equal(audio.hasVib, true, `390x844 Settings->Audio (${origin}): Vibration row rendered`);
        t.expect(audio.sbOverflow <= 1, `390x844 Settings->Audio (${origin}): fits without vertical scroll overflow (${audio.sbOverflow}px): ${JSON.stringify(audio)}`);
        t.expect(audio.clearsBrass !== null && audio.clearsBrass >= 0, `390x844 Settings->Audio (${origin}): Vibration clears bottom brass border (${audio.vibBot} <= ${audio.brassInnerBot}): ${JSON.stringify(audio)}`);
        t.expect(audio.controls.every((c) => c.w >= 44 && c.h >= 44), `390x844 Settings->Audio (${origin}): all sliders and toggles preserve >=44px touch targets: ${JSON.stringify(audio.controls)}`);
        if (shotName) await t.shot(shotName);
      }

      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
  {
    name: 'layout-08 W6-S4-05 title .credit keeps approved AI-art wording inside a translucent dark pill scrim across tall and standard viewports',
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { sound: false, tips: false, motion: 'reduced' });
      const vps = [[800, 1100, 'layout-08-w6-s4-05-800x1100'], [820, 1180, 'layout-08-w6-s4-05-820x1180'], [1280, 800, null], [390, 844, null]];
      for (const [w, h, shotName] of vps) {
        await sizeTo(t, w, h);
        await t.game('scene', 'title');
        await t.waitFrames(2);
        const info = await t.page.evaluate(() => {
          const el = document.querySelector('#title .credit');
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const m = cs.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          const bg = m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] != null ? +m[4] : 1 } : null;
          return {
            text: el.textContent.trim(),
            bg,
            textShadow: cs.textShadow,
            radius: parseFloat(cs.borderTopLeftRadius) || 0,
            padX: parseFloat(cs.paddingLeft) || 0,
            padY: parseFloat(cs.paddingTop) || 0,
            left: Math.round(r.left),
            right: Math.round(r.right),
            centerErr: Math.abs((r.left + r.right) / 2 - innerWidth / 2),
            vw: innerWidth,
            overflowX: el.scrollWidth > el.clientWidth + 1,
          };
        });
        t.expect(info.text.includes('Art: painted with AI image tools for this game'), `${w}x${h}: preserves approved AI-art credit wording (CD-WF0-04)`);
        t.expect(info.bg && info.bg.a >= 0.6 && info.bg.r <= 20 && info.bg.g <= 20 && info.bg.b <= 20, `${w}x${h}: #title .credit carries translucent dark scrim: ${JSON.stringify(info.bg)}`);
        t.expect(info.textShadow && info.textShadow !== 'none', `${w}x${h}: #title .credit has text-shadow (${info.textShadow})`);
        t.expect(info.radius >= 12 && info.padX >= 10 && info.padY >= 2, `${w}x${h}: #title .credit renders as a padded pill: ${JSON.stringify(info)}`);
        t.expect(info.left >= 0 && info.right <= info.vw && info.centerErr <= 2 && !info.overflowX, `${w}x${h}: #title .credit stays centered and unclipped: ${JSON.stringify(info)}`);
        if (shotName) await t.shot(shotName);
      }
      await sizeTo(t, t.vp.width, t.vp.height);
    },
  },
];
