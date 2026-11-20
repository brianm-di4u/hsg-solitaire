// Screens, art and settings tests (PRD AC 26–29, 31–39).
import { baseSettings, nearWinKlondike } from './_util.mjs';

const BACK_IDS = ['skylight', 'lozenge', 'quapaw', 'ironwork', 'paterae', 'sculpin', 'neon', 'deco', 'pines', 'steam', 'lake', 'silks'];
const TABLE_IDS = ['felt', 'marble', 'quapaw', 'pool', 'midnight', 'linen'];
const suitRun = (s) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].map((r) => r + s);
const facesState = { mode: 'klondike', piles: { stock: ['#2C'], waste: [], t0: suitRun('S'), t1: suitRun('H'), t2: suitRun('D'), t3: suitRun('C'), t4: ['#5C', '#6C', 'KH'], t5: ['QS'], t6: ['JD'] } };
const courtsState = { mode: 'freecell', piles: { c0: ['AS'], c1: ['AH'], c2: ['AD'], c3: ['AC'], f0: [], f1: [], f2: [], f3: [], t0: ['QD', 'KS'], t1: ['QC', 'KH'], t2: ['JS', 'KD'], t3: ['JH', 'KC'], t4: ['JD', 'QS'], t5: ['JC', 'QH'], t6: ['TS', 'JS'], t7: ['7H', 'JD'] } };
const DEAD_K = { mode: 'klondike', piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['5C'], t1: ['5S'], t2: [], t3: [], t4: [], t5: [], t6: [] } };

// Opacity-aware WCAG relative luminance contrast of each visible non-inert element's text against its composited background.
async function contrastReport(t, selectors) {
  return t.page.evaluate((sels) => {
    const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const over = (fg, bg) => { const a = fg.a; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; };
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratioOf = (a, b) => { const la = lum(a), lb = lum(b); return +((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2); };
    const chainOf = (el) => { const a = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) a.push(e); return a.reverse(); };
    const resolveColors = (el) => {
      const chain = chainOf(el);
      let bg = parse(getComputedStyle(document.body).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
      let op = 1;
      for (const node of chain) {
        const cs = getComputedStyle(node);
        const o = parseFloat(cs.opacity);
        if (!Number.isNaN(o)) op *= o;
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0) bg = over({ r: c.r, g: c.g, b: c.b, a: c.a * op }, bg);
      }
      const fgRaw = parse(getComputedStyle(el).color);
      if (!fgRaw) return null;
      const fg = over({ r: fgRaw.r, g: fgRaw.g, b: fgRaw.b, a: fgRaw.a * op }, bg);
      return { fg, bg, op };
    };
    const seen = new Set(), out = [];
    for (const s of sels) for (const el of document.querySelectorAll(s)) {
      if (seen.has(el)) continue;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden], [inert]') || !el.textContent.trim()) continue;
      if (el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true') continue;
      // Skip ancestor containers whose text belongs only to styled child elements when those children have distinct colors (e.g. .fact wrapping .k/.a)
      const directText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!directText && el.children.length) continue;
      const cols = resolveColors(el); if (!cols) continue;
      seen.add(el);
      out.push({ s, text: el.textContent.trim().slice(0, 28), ratio: ratioOf(cols.fg, cols.bg) });
    }
    return out;
  }, selectors);
}
async function nonTextContrastReport(t) {
  return t.page.evaluate(() => {
    const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const over = (fg, bg) => { const a = fg.a; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; };
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratioOf = (a, b) => { const la = lum(a), lb = lum(b); return +((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2); };
    const hex = (h) => { const s = h.trim(); if (s.startsWith('#')) { const n = s.length === 4 ? s.slice(1).replace(/./g, '$&$&') : s.slice(1); return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16), a: 1 }; } return parse(s); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
    const out = [];
    // Verify --focus-ring against --focus-moat / container background
    const activeRoot = document.querySelector('#modal.on .sheet') || document.querySelector('#title.on') || document.getElementById('bar');
    if (activeRoot) {
      const cs = getComputedStyle(activeRoot);
      const ring = hex(cs.getPropertyValue('--focus-ring')) || hex('#4FC3FF');
      const moat = hex(cs.getPropertyValue('--focus-moat')) || bgOf(activeRoot);
      if (ring && moat) out.push({ what: 'focus-ring', ratio: ratioOf(ring, moat) });
    }
    // Verify interactive control borders (.btn:not(.solid), .numin) >= 3.0:1 against container background
    for (const el of document.querySelectorAll('.sheet .btn:not(.solid), .sheet .numin')) {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[hidden], [inert]') || el.disabled) continue;
      const bc = parse(cs.borderTopColor), bg = bgOf(el.parentElement);
      if (bc && bg) out.push({ what: 'border:' + (el.id || el.className), ratio: ratioOf(over(bc, bg), bg) });
    }
    return out;
  });
}
async function touchTargets(t) {
  return t.page.evaluate(() => [...document.querySelectorAll('button, input, summary')].filter((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden], [inert]') && r.bottom > 0 && r.top < innerHeight;
  }).map((el) => { const r = el.getBoundingClientRect(); return { id: el.id || el.className || el.tagName, label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; }));
}
const UI_TEXT = [
  '#modeName', '#modeSub', '#assistTag', '#status span', '#status b', '.tb:not(:disabled)', '.chip', '.btn',
  '.sheet p', '.sheet h2', '.sheet h3', '.sheet label', '.set small', '.tag', '.credit', '.tile p', '.tile h2', '.tile .tsub', '#title h1',
  '.fact', '.fact .k', '.fact .q', '.fact .a', '.fact .src', '.earn', '.earn .pb',
  '.menu .btn.day b', '.menu .btn.day small', '.menu .btn.day em', '.cal i', '.cal i small',
  '.ach li', '.ach li b', '.ach li small', '.fnd li', '.fnd li b', '.rec b', '.rec small',
  '.cap', '.hp summary', '.ticket .hd', '.ticket .big', '.ticket .grid', '.ticket .grid b', '.ticket .meta', '.ticket .best',
  'table.st td', 'table.keys td', 'kbd', '#coach', '#toast', '#dealing', '#tabNote',
];

export const tests = [
  {
    name: 'screens-31 title screen',
    async run(t) {
      await t.game('scene', 'title');
      const s = await t.state(); t.equal(s.scene, 'title', 'title scene');
      t.equal(await t.page.locator('#tiles .tile').count(), 4, 'four mode tiles');
      await t.shot('screens-31-title');
      await t.checkLayout();
    },
  },
  {
    name: 'screens-31 title screen dark',
    colorScheme: 'dark',
    async run(t) {
      await t.game('scene', 'title');
      await t.shot('screens-31-title-dark');
      const bad = (await contrastReport(t, UI_TEXT)).filter((r) => r.ratio < 4.5);
      t.equal(bad, [], 'dark title text contrast ≥ 4.5');
    },
  },
  {
    name: 'screens-26 twelve card backs',
    async run(t) {
      await baseSettings(t); await t.game('unlockAll');
      await t.game('scene', 'backs');
      t.equal(await t.page.locator('[data-back]').count(), 12, 'twelve backs in the picker');
      t.equal(await t.page.locator('[data-table]').count(), 6, 'six tables in the picker');
      await t.shot('screens-26-backs');
      await t.checkLayout();
      await t.page.click('[data-back="quapaw"]');
      t.equal((await t.state()).settings.back, 'quapaw', 'clicking a back selects it');
      if (t.viewport === 'desktop') {
        const seen = new Set();
        for (const id of BACK_IDS) {
          await t.game('setSettings', { back: id });
          await t.game('newGame', { mode: 'spider', suits: 1, deal: 11 });
          const r = await t.shot('screens-26-back-' + id);
          seen.add(r.stats.mean + '/' + r.stats.stddev + '/' + r.stats.colors);
        }
        t.equal(seen.size, 12, 'all twelve backs render differently');
      }
      await t.game('setSettings', { back: 'neon' });
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      t.equal((await t.state()).settings.back, 'neon', 'back choice persists after reload');
    },
  },
  {
    name: 'screens-27 six tables',
    async run(t) {
      await baseSettings(t); await t.game('unlockAll');
      for (const id of TABLE_IDS) {
        await t.game('setSettings', { table: id });
        await t.game('newGame', { mode: 'klondike', deal: 2024 });
        await t.shot('screens-27-table-' + id);
      }
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      t.equal((await t.state()).settings.table, TABLE_IDS[TABLE_IDS.length - 1], 'table persists after reload');
    },
  },
  {
    name: 'screens-28 face legibility',
    async run(t) {
      await baseSettings(t);
      await t.game('newGame', { mode: 'spider', suits: 4, deal: 28 });
      const lay = await t.game('getLayout');
      t.log('spider card width', lay.cardW, 'index px', lay.indexPx);
      t.expect(lay.indexPx >= 11, 'corner index at least 11 px (' + lay.indexPx + ')');
      await t.shot('screens-28-spider-mobile');
      await t.game('setState', facesState);
      await t.shot('screens-28-faces');
    },
  },
  {
    name: 'screens-29 courts and aces',
    async run(t) {
      await baseSettings(t, { cardSize: 'large' });
      await t.game('setState', courtsState);
      await t.shot('screens-29-courts');
      await t.game('setState', { mode: 'freecell', piles: { c0: [], c1: [], c2: [], c3: [], f0: [], f1: [], f2: [], f3: [], t0: ['KS', 'QD'], t1: ['KH', 'QC'], t2: ['KD', 'JS'], t3: ['KC', 'JH'], t4: ['QS', 'JD'], t5: ['QH', 'JC'], t6: ['AS'], t7: ['AH'] } });
      await t.shot('screens-29-courts-2');
    },
  },
  {
    name: 'screens-32 settings dialog and persistence',
    async run(t) {
      await baseSettings(t, { sound: true });
      await t.game('newGame', { mode: 'klondike', deal: 5 });
      await t.game('scene', 'settings');
      await t.shot('screens-32-settings');
      await t.checkLayout();
      await t.page.click('[data-tog="sound"]');
      await t.page.fill('#vol', '0.3'); await t.page.dispatchEvent('#vol', 'input');
      await t.page.click('[data-set="cardSize"][data-val="large"]');
      let s = await t.state(); t.equal([s.settings.sound, s.settings.volume, s.settings.cardSize], [false, 0.3, 'large'], 'settings changed');
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      s = await t.state(); t.equal([s.settings.sound, s.settings.volume, s.settings.cardSize], [false, 0.3, 'large'], 'settings persist after reload');
    },
  },
  {
    name: 'screens-32 sound on plays without errors',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { sound: true, volume: 0.5 });
      await t.page.click('#tiles .chip');
      await t.waitForStable();
      const m = (await t.game('legalMoves'))[0]; if (m) await t.game('act', 'move', m.from, m.to, m.count);
      await t.game('act', 'hint'); await t.game('act', 'undo');
      await t.game('setState', { mode: 'klondike', piles: { stock: [], waste: [], t0: ['5C'], t1: ['5S'], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      await t.game('act', 'tap', 't0', 0);
      t.expect(true, 'sound effects ran (console errors would fail this test)');
    },
  },
  {
    name: 'screens-33 reduced motion',
    reducedMotion: true,
    viewports: ['desktop'],
    async run(t) {
      await t.game('setSettings', { motion: 'auto', sound: false });
      await t.waitForStable(); // let the painted art finish loading (isIdle also covers it)
      await t.game('newGame', { mode: 'klondike', deal: 9 });
      t.equal(await t.game('isIdle'), true, 'no deal animation with reduced motion');
      await t.game('act', 'draw');
      t.equal(await t.game('isIdle'), true, 'no move tween with reduced motion');
    },
  },
  {
    name: 'screens-33b reduced motion three-state authority, static canvas & punch SFX (W6-S5-01)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'auto', sound: false, tips: false });
      await t.game('newGame', { mode: 'klondike', deal: 9 });
      await t.waitForStable();
      // 1. OS no-preference + motion: auto => :root.rm is false, transitions active
      let rm = await t.page.evaluate(() => ({
        hasRm: document.documentElement.classList.contains('rm'),
        goalDur: getComputedStyle(document.querySelector('#goal i')).transitionDuration,
        toastDur: getComputedStyle(document.getElementById('toast')).transitionDuration,
      }));
      t.equal(rm.hasRm, false, 'OS normal + auto: no :root.rm');
      t.expect(rm.goalDur !== '0s' && rm.toastDur !== '0s', 'OS normal + auto: CSS transitions active');

      // 2. OS no-preference + motion: reduced => :root.rm is true, ALL CSS transitions/animations suppressed
      await t.game('setSettings', { motion: 'reduced' });
      await t.game('scene', 'settings');
      const cssOff = await t.page.evaluate(() => {
        const bh = document.getElementById('bHint'); bh.classList.add('pt');
        const out = {
          hasRm: document.documentElement.classList.contains('rm'),
          goal: getComputedStyle(document.querySelector('#goal i')).transitionDuration,
          tb: getComputedStyle(document.getElementById('bNew')).transitionDuration,
          toast: getComputedStyle(document.getElementById('toast')).transitionDuration,
          dealing: getComputedStyle(document.getElementById('dealing')).transitionDuration,
          tog: getComputedStyle(document.querySelector('.tog'), '::after').transitionDuration,
          hintAnim: getComputedStyle(bh).animationName,
        };
        bh.classList.remove('pt');
        return out;
      });
      t.equal(cssOff, { hasRm: true, goal: '0s', tb: '0s', toast: '0s', dealing: '0s', tog: '0s', hintAnim: 'none' }, 'OS normal + Reduced: :root.rm suppresses every UI transition & hint pulse');
      await t.game('scene', 'help');
      const hpDur = await t.page.evaluate(() => getComputedStyle(document.querySelector('.hp summary'), '::after').transitionDuration);
      t.equal(hpDur, '0s', 'OS normal + Reduced: .hp summary chevron transition suppressed');

      // 3. Canvas hint under Reduced: zero 60 fps rAF frames after initial static paint
      await t.game('scene', 'game');
      await t.game('act', 'hint');
      await t.page.waitForTimeout(80);
      await t.game('frameStats', true);
      await t.page.waitForTimeout(350);
      t.equal((await t.game('frameStats')).frames, 0, 'Reduced motion hint renders statically with 0 continuous rAF frames');

      // 4. Canvas drag.tilt === 0 under Reduced vs non-zero under Full
      const lay = await t.game('getLayout');
      const c0 = lay.piles.t0.cards[lay.piles.t0.cards.length - 1];
      await t.page.mouse.move(c0.x + c0.w / 2, c0.y + 12);
      await t.page.mouse.down();
      await t.page.mouse.move(c0.x + c0.w / 2 + 120, c0.y + 40, { steps: 6 });
      const rmTilt = await t.game('dragTilt');
      await t.page.mouse.up();
      t.equal(rmTilt, 0, 'Reduced motion suppresses drag.tilt');

      // 5. Reduced-motion win shows calm skippable emblem beat AND fires Bath Ticket punch SFX
      await t.game('setState', nearWinKlondike());
      await t.game('cuesPlayed', true);
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().ceremony === true, null, { timeout: 3000 });
      t.equal((await t.state()).modal, null, 'calm static emblem beat runs before win sheet');
      await t.page.keyboard.press('Enter'); // skippable immediately
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 3000 });
      await t.page.waitForFunction(() => window.__game.cuesPlayed().some((c) => c.name === 'punch'), null, { timeout: 2500 });
      t.expect(true, 'Bath Ticket punch SFX fires even under reducedMotion()');
      await t.game('scene', 'game');

      // 6. OS reduce + motion: full => truthfully overrides OS prefers-reduced-motion
      await t.page.emulateMedia({ reducedMotion: 'reduce' });
      await t.game('setSettings', { motion: 'full' });
      const fullOver = await t.page.evaluate(() => {
        const bh = document.getElementById('bHint'); bh.classList.add('pt');
        const out = {
          hasRm: document.documentElement.classList.contains('rm'),
          goal: getComputedStyle(document.querySelector('#goal i')).transitionDuration,
          hintAnim: getComputedStyle(bh).animationName,
        };
        bh.classList.remove('pt');
        return out;
      });
      t.equal(fullOver.hasRm, false, 'OS reduce + Full: :root.rm cleared');
      t.expect(fullOver.goal !== '0s' && fullOver.hintAnim !== 'none', 'OS reduce + Full: CSS transitions and hint animation active');

      // 7. Switching to Auto under OS reduce immediately engages :root.rm and stops ambient; OS change back to no-preference restores it
      await t.game('setSettings', { motion: 'auto' });
      t.equal(await t.page.evaluate(() => document.documentElement.classList.contains('rm')), true, 'OS reduce + Auto: :root.rm engaged');
      t.equal((await t.game('ambient')).running, false, 'OS reduce + Auto: ambient halted immediately');
      await t.page.emulateMedia({ reducedMotion: 'no-preference' });
      await t.page.waitForFunction(() => !document.documentElement.classList.contains('rm'), null, { timeout: 3000 });
      t.expect(true, 'dynamic OS prefers-reduced-motion change syncs :root.rm');
    },
  },
  {
    name: 'screens-34 left-handed layout',
    async run(t) {
      await baseSettings(t);
      await t.game('newGame', { mode: 'klondike', deal: 34 });
      let lay = await t.game('getLayout'); t.expect(lay.piles.stock.x > lay.piles.f0.x, 'right-handed: stock on the right');
      await t.game('setSettings', { leftHanded: true });
      lay = await t.game('getLayout'); t.expect(lay.piles.stock.x < lay.piles.f0.x, 'left-handed: stock on the left');
      await t.shot('screens-34-lefthanded');
      await t.game('newGame', { mode: 'freecell', deal: 34 });
      lay = await t.game('getLayout'); t.expect(lay.piles.f0.x < lay.piles.c0.x, 'left-handed FreeCell mirrors cells and foundations');
    },
  },
  {
    name: 'screens-35 card sizes',
    async run(t) {
      await baseSettings(t);
      await t.game('newGame', { mode: 'klondike', deal: 35 });
      const w = {};
      for (const sz of ['compact', 'standard', 'large']) { await t.game('setSettings', { cardSize: sz }); w[sz] = (await t.game('getLayout')).cardW; }
      t.log('card widths', JSON.stringify(w));
      t.expect(w.compact < w.standard && w.standard <= w.large, 'compact < standard <= large');
      if (t.viewport === 'desktop') t.expect(w.standard < w.large, 'large is bigger on desktop');
      await t.shot('screens-35-size-large');
      await t.checkLayout();
    },
  },
  {
    name: 'screens-36 four-color suits',
    async run(t) {
      await baseSettings(t, { fourColor: true });
      await t.game('setState', facesState);
      await t.shot('screens-36-fourcolor');
      t.equal((await t.state()).settings.fourColor, true, 'four-color on');
    },
  },
  {
    name: 'screens-37 touch targets and overflow in every scene',
    async run(t) {
      await baseSettings(t);
      const scenes = ['title', 'game', 'menu', 'settings', 'backs', 'stats', 'records', 'help', 'daily', 'deal', 'win', 'fault'];
      await t.game('newGame', { mode: 'spider', suits: 2, deal: 37 });
      for (const sc of scenes) {
        await t.game('scene', sc);
        await t.waitForStable(); // the win ticket rises in; measure it at rest
        await t.checkLayout();
        if (t.viewport === 'mobile') {
          const small = (await touchTargets(t)).filter((b) => b.h < 44 || b.w < 44);
          t.equal(small, [], sc + ': all touch targets ≥ 44 px');
        }
        if (sc === 'menu') await t.shot('screens-37-menu');
        if (sc === 'daily') await t.shot('screens-37-daily');
        if (sc === 'stats') await t.shot('screens-37-stats');
      }
      // Phone landscape (844x390), small portrait (320x568), and active #assistTag stage-bleed containment (W6-S5-02, CD-WF5-01)
      if (t.viewport === 'mobile') {
        for (const [w, h, tag] of [[844, 390, '844x390 landscape'], [320, 568, '320x568 small']]) {
          await t.page.setViewportSize({ width: w, height: h });
          await t.game('newGame', { mode: 'spider', suits: 2, deal: 37 });
          await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          for (const sc of ['title', 'game', 'menu', 'settings', 'help', 'win']) {
            await t.game('scene', sc);
            await t.waitForStable();
            const small = (await touchTargets(t)).filter((b) => b.h < 44 || b.w < 44);
            t.equal(small, [], tag + ' ' + sc + ': all touch targets ≥ 44 px');
          }
          if (w === 844) {
            await t.game('scene', 'game');
            const sh = await t.page.evaluate(() => document.getElementById('stage').getBoundingClientRect().height);
            t.expect(sh >= 340, '844x390 landscape stageH ≥ 340 px (' + Math.round(sh) + ')');
          }
          if (w === 320) {
            await t.game('scene', 'settings');
            const clipped = await t.page.evaluate(() => [...document.querySelectorAll('#sheet .seg')].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
            t.equal(clipped, 0, '320x568 settings .seg has zero horizontal clipping');
          }
          // Active #assistTag stays strictly inside #bar with zero stage bleed onto top cards
          await t.game('scene', 'game');
          await t.game('newGame', { mode: 'klondike', deal: 37 });
          await t.game('act', 'hint');
          await t.page.waitForFunction(() => !document.getElementById('assistTag').hidden);
          const bleed = await t.page.evaluate(() => {
            const bar = document.getElementById('bar').getBoundingClientRect();
            const tagEl = document.getElementById('assistTag'), r = tagEl.getBoundingClientRect();
            const after = getComputedStyle(tagEl, '::after');
            const bOff = parseFloat(after.bottom) || 0, tOff = parseFloat(after.top) || 0;
            const hitBelow = document.elementFromPoint(r.left + r.width / 2, bar.bottom + 2);
            return {
              afterBottom: Math.round((r.bottom - bOff) * 10) / 10,
              afterTop: Math.round((r.top + tOff) * 10) / 10,
              barTop: Math.round(bar.top * 10) / 10,
              barBottom: Math.round(bar.bottom * 10) / 10,
              belowId: hitBelow ? hitBelow.id : null,
            };
          });
          t.expect(bleed.afterBottom <= bleed.barBottom + 0.5 && bleed.afterTop >= bleed.barTop - 0.5, tag + ': #assistTag::after stays inside #bar ' + JSON.stringify(bleed));
          t.equal(bleed.belowId, 'cv', tag + ': pointer just below #bar hits #cv, never #assistTag');
        }
        await t.page.setViewportSize(t.vp);
      }
    },
  },
  {
    name: 'screens-38 contrast light',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      const check = async (label) => {
        const bad = (await contrastReport(t, UI_TEXT)).filter((r) => r.ratio < 4.5);
        t.equal(bad, [], label + ': light text contrast ≥ 4.5');
        const badNt = (await nonTextContrastReport(t)).filter((r) => r.ratio < 3.0);
        t.equal(badNt, [], label + ': light non-text contrast ≥ 3.0');
      };
      await t.game('scene', 'title'); await check('title');
      // Seed a full-bath 7/7 daily so .btn.day.won em and .cal i.f are audited
      await t.page.evaluate(() => {
        const d = new Date(), p = (n) => String(n).padStart(2, '0'), day = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
        const m = JSON.parse(localStorage.getItem('spa-solitaire:v1:meta') || '{}');
        m.daily = m.daily || {};
        for (const k of ['klondike1', 'klondike3', 'freecell', 'spider1', 'spider2', 'spider4', 'yukon']) m.daily[day + '|' + k] = 'won';
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify(m));
      });
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      await baseSettings(t, { motion: 'reduced' });
      await t.game('newGame', { mode: 'klondike', deal: 38 });
      await t.game('act', 'hint'); // show #assistTag on game HUD
      await check('game');
      for (const sc of ['menu', 'settings', 'backs', 'stats', 'records', 'help', 'daily', 'deal', 'fault']) {
        await t.game('scene', sc);
        if (sc === 'records') await t.page.locator('#sheet details.hp summary').first().click().catch(() => {});
        await check(sc);
      }
      // confirm modal
      await t.game('scene', 'stats');
      await t.page.click('[data-a="resetStats"]');
      await check('confirm');
      await t.page.click('#sheet [data-close]');
      // stuck modal with real .fact card
      await t.game('setState', DEAD_K);
      await t.game('act', 'checkStuck');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'stuck', null, { timeout: 5000 });
      await check('stuck');
      // win modal with real .earn .pb + .fact card (two wins so second triggers pb)
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 381, moves: 40 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.waitForStable(5000);
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 382, moves: 20 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.waitForStable(5000);
      await check('win');
    },
  },
  {
    name: 'screens-38 contrast dark',
    colorScheme: 'dark',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      const check = async (label) => {
        const bad = (await contrastReport(t, UI_TEXT)).filter((r) => r.ratio < 4.5);
        t.equal(bad, [], label + ': dark text contrast ≥ 4.5');
        const badNt = (await nonTextContrastReport(t)).filter((r) => r.ratio < 3.0);
        t.equal(badNt, [], label + ': dark non-text contrast ≥ 3.0');
      };
      await t.page.evaluate(() => {
        const d = new Date(), p = (n) => String(n).padStart(2, '0'), day = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
        const m = JSON.parse(localStorage.getItem('spa-solitaire:v1:meta') || '{}');
        m.daily = m.daily || {};
        for (const k of ['klondike1', 'klondike3', 'freecell', 'spider1', 'spider2', 'spider4', 'yukon']) m.daily[day + '|' + k] = 'won';
        localStorage.setItem('spa-solitaire:v1:meta', JSON.stringify(m));
      });
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      await baseSettings(t, { motion: 'reduced' });
      await t.game('newGame', { mode: 'freecell', deal: 38 });
      await t.shot('screens-38-game-dark');
      await t.game('act', 'hint');
      await check('game');
      for (const sc of ['menu', 'settings', 'backs', 'stats', 'records', 'help', 'daily', 'deal', 'fault']) {
        await t.game('scene', sc);
        if (sc === 'records') await t.page.locator('#sheet details.hp summary').first().click().catch(() => {});
        await check(sc);
      }
      await t.game('scene', 'stats');
      await t.page.click('[data-a="resetStats"]');
      await check('confirm');
      await t.page.click('#sheet [data-close]');
      await t.game('setState', DEAD_K);
      await t.game('act', 'checkStuck');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'stuck', null, { timeout: 5000 });
      await check('stuck');
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 383, moves: 40 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.waitForStable(5000);
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 384, moves: 20 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.waitForStable(5000);
      await check('win');
      await t.game('scene', 'settings');
      await t.shot('screens-38-settings-dark');
    },
  },
  {
    name: 'screens-39 help',
    async run(t) {
      await t.game('scene', 'help');
      const txt = await t.page.textContent('#sheet');
      for (const w of ['Klondike', 'FreeCell', 'Spider', 'Yukon', 'Controls', 'Scoring', 'About the art']) t.expect(txt.includes(w), 'help mentions ' + w);
      await t.shot('screens-39-help');
      await t.checkLayout();
    },
  },
  {
    name: 'screens-39b modal focus trap, inert isolation, ARIA naming, .seg focus & role=switch (W6-S5-03)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      // 1. Title vs Game inert isolation + Title opener focus return
      await t.game('scene', 'title');
      await t.waitForStable();
      let iso = await t.page.evaluate(() => ({ app: document.getElementById('app').inert, title: document.getElementById('title').inert }));
      t.equal(iso, { app: true, title: false }, 'Title open: #app inert, #title interactive');
      await t.page.focus('#tSet');
      await t.page.keyboard.press('Enter');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'settings', null, { timeout: 5000 });
      iso = await t.page.evaluate(() => ({ app: document.getElementById('app').inert, title: document.getElementById('title').inert }));
      t.equal(iso, { app: true, title: true }, 'Modal open over Title: both #app and #title inert');

      // 2. .seg unclipped focus & .tog role="switch" aria-checked (no aria-pressed)
      const setCheck = await t.page.evaluate(() => {
        const segs = [...document.querySelectorAll('#sheet .seg')];
        const togs = [...document.querySelectorAll('#sheet .tog')];
        return {
          segOverflowBad: segs.filter((s) => getComputedStyle(s).overflow === 'hidden').length,
          togCount: togs.length,
          togBad: togs.filter((b) => b.getAttribute('role') !== 'switch' || !['true', 'false'].includes(b.getAttribute('aria-checked')) || b.hasAttribute('aria-pressed')).length,
        };
      });
      t.equal(setCheck.segOverflowBad, 0, '.seg removes overflow:hidden so focus rings render unclipped');
      t.expect(setCheck.togCount >= 6 && setCheck.togBad === 0, 'all Settings .tog switches expose role=switch aria-checked and omit aria-pressed');
      const soundBefore = await t.page.locator('[data-tog="sound"]').getAttribute('aria-checked');
      await t.page.click('[data-tog="sound"]');
      const soundAfter = await t.page.locator('[data-tog="sound"]').getAttribute('aria-checked');
      t.expect(soundAfter !== soundBefore, '.tog toggles aria-checked on click');

      // Escape restores focus cleanly to #tSet on Title
      await t.page.keyboard.press('Escape');
      t.equal(await t.page.evaluate(() => document.activeElement && document.activeElement.id), 'tSet', 'closing Title modal restores focus to opener #tSet');

      // 3. Gameplay inert state + #bHelp opener focus return + Help <summary> Tab trap
      await t.game('newGame', { mode: 'klondike', deal: 39 });
      await t.waitForStable();
      iso = await t.page.evaluate(() => ({ app: document.getElementById('app').inert, title: document.getElementById('title').inert }));
      t.equal(iso, { app: false, title: true }, 'Gameplay: #app interactive, #title inert');
      await t.page.focus('#bHelp');
      await t.page.keyboard.press('Enter');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'help');
      const seenSummaries = new Set();
      let sawClose = false;
      for (let i = 0; i < 16; i++) {
        const cur = await t.page.evaluate(() => {
          const a = document.activeElement;
          return { inSheet: !!a && document.getElementById('sheet').contains(a), tag: a ? a.tagName : '', close: !!(a && a.hasAttribute('data-close')), text: a ? a.textContent.trim() : '' };
        });
        t.equal(cur.inSheet, true, 'Help Tab step ' + i + ' stays inside #sheet');
        if (cur.tag === 'SUMMARY') seenSummaries.add(cur.text);
        if (cur.close) sawClose = true;
        await t.page.keyboard.press('Tab');
      }
      t.expect(seenSummaries.size === 7 && sawClose, 'Help Tab walk reaches all 7 <summary> accordions and Close (' + seenSummaries.size + ')');
      // Toggle Controls accordion with keyboard Enter
      await t.page.locator('#sheet details.hp summary', { hasText: 'Controls' }).focus();
      await t.page.keyboard.press('Enter');
      t.equal(await t.page.locator('#sheet details.hp', { hasText: 'Controls' }).evaluate((d) => d.open), true, 'Controls accordion opens via keyboard Enter');
      await t.page.keyboard.press('Escape');
      t.equal(await t.page.evaluate(() => document.activeElement && document.activeElement.id), 'bHelp', 'closing Help restores focus to opener #bHelp');

      // 4. Records <summary> Tab reachability
      await t.game('scene', 'records');
      let sawFactsSummary = false;
      for (let i = 0; i < 6; i++) {
        const info = await t.page.evaluate(() => { const a = document.activeElement; return { inSheet: !!a && document.getElementById('sheet').contains(a), tag: a ? a.tagName : '', text: a ? a.textContent.trim() : '' }; });
        t.equal(info.inSheet, true, 'Records Tab step ' + i + ' stays inside #sheet');
        if (info.tag === 'SUMMARY' && /Facts found/.test(info.text)) sawFactsSummary = true;
        await t.page.keyboard.press('Tab');
      }
      t.equal(sawFactsSummary, true, 'Records Tab walk reaches Facts found <summary>');

      // 5. Clean ARIA dialog accessible naming across modals (no nested .ib.x inside #mT)
      for (const sc of ['menu', 'settings', 'backs', 'stats', 'records', 'help', 'daily', 'deal', 'win', 'fault']) {
        await t.game('scene', sc);
        const heading = await t.page.evaluate(() => {
          const h = document.getElementById('mT'), sh = document.getElementById('sheet');
          return {
            labelledBy: sh.getAttribute('aria-labelledby'),
            hasBtnInside: !!h.querySelector('button'),
            siblingClose: !!(h.parentElement && h.parentElement.classList.contains('sheet-head') && h.parentElement.querySelector('.ib.x[data-close]')),
            text: h.textContent.trim(),
          };
        });
        t.equal([heading.labelledBy, heading.hasBtnInside, heading.siblingClose], ['mT', false, true], sc + ': clean #mT heading with sibling Close button (' + heading.text + ')');
      }

      // 6. Global shortcuts S and Ctrl+Y work while focus is on #tools or inside #mirror
      await t.game('scene', 'game');
      await t.game('act', 'draw');
      await t.game('act', 'undo');
      await t.page.focus('#bHint');
      await t.page.keyboard.press('s');
      t.expect(/Foundations:/.test(await t.page.textContent('#sr')), 'S reads table summary while focus sits on #tools');
      await t.page.keyboard.press('Control+y');
      t.equal((await t.state()).redoDepth, 0, 'Ctrl+Y redoes while focus sits on #tools');
    },
  },
];
