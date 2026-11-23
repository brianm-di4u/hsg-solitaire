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
];
