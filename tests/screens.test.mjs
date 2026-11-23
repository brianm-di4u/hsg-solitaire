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
  '.fact', '.fact .k', '.fact .q', '.fact .a', '.fact .src', '.earn', '.earn .pb', '.equip-chip',
  '.menu .btn.day b', '.menu .btn.day small', '.menu .btn.day em', '.cal i', '.cal i small', '.cal button:not(:disabled)', '.cal button:not(:disabled) small',
  '.ach li', '.ach li b', '.ach li small', '.fnd li', '.fnd li b', '.fnd li .fq', '.fnd li .fx', '.fnd li .fs', '.fnd-empty', '.rec b', '.rec small',
  '.journey-hd b', '.journey-hd small', '.jstop b', '.jseal',
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
      await t.page.click('#stab-audio');
      await t.page.click('[data-tog="sound"]');
      await t.page.fill('#vol', '0.3'); await t.page.dispatchEvent('#vol', 'input');
      await t.page.click('#stab-comfort');
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
      await t.game('newGame', { mode: 'klondike', deal: 1 });
      await t.waitForStable(); // let the lazy tablePlayArt() finish loading (isIdle also covers it)
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
        if (sc === 'settings') {
          await check('settings-gameplay');
          await t.page.click('#stab-comfort'); await check('settings-comfort');
          await t.page.click('#stab-audio'); await check('settings-audio');
          await t.page.click('[data-tog="sound"]'); await check('settings-audio-muted');
          await t.page.click('[data-tog="sound"]');
        } else if (sc === 'backs') {
          await check('backs-cards');
          await t.page.click('#btab-tables'); await check('backs-tables');
        } else if (sc === 'records') {
          await check('ledger-overview');
          await t.page.click('#ltab-facts'); await check('ledger-facts');
          await t.page.click('#ltab-ach'); await check('ledger-ach');
        } else {
          await check(sc);
        }
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
        if (sc === 'settings') {
          await check('settings-gameplay');
          await t.page.click('#stab-comfort'); await check('settings-comfort');
          await t.page.click('#stab-audio'); await check('settings-audio');
          await t.page.click('[data-tog="sound"]'); await check('settings-audio-muted');
          await t.page.click('[data-tog="sound"]');
        } else if (sc === 'backs') {
          await check('backs-cards');
          await t.page.click('#btab-tables'); await check('backs-tables');
        } else if (sc === 'records') {
          await check('ledger-overview');
          await t.page.click('#ltab-facts'); await check('ledger-facts');
          await t.page.click('#ltab-ach'); await check('ledger-ach');
        } else {
          await check(sc);
        }
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

      // 2. .seg unclipped focus & .tog role="switch" aria-checked (no aria-pressed) across all 3 Settings tabs
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
      await t.page.click('#stab-audio');
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

      // 4. Bathhouse Ledger tablist roving & Tab containment
      await t.game('scene', 'records');
      let sawLedgerTab = false;
      for (let i = 0; i < 6; i++) {
        const info = await t.page.evaluate(() => { const a = document.activeElement; return { inSheet: !!a && document.getElementById('sheet').contains(a), role: a ? a.getAttribute('role') : '', text: a ? a.textContent.trim() : '' }; });
        t.equal(info.inSheet, true, 'Bathhouse Ledger Tab step ' + i + ' stays inside #sheet');
        if (info.role === 'tab' && /Overview|By Game|Facts|Achievements/.test(info.text)) sawLedgerTab = true;
        await t.page.keyboard.press('Tab');
      }
      t.equal(sawLedgerTab, true, 'Bathhouse Ledger Tab walk reaches section tablist');
      await t.page.focus('#ltab-overview');
      await t.page.keyboard.press('ArrowRight');
      await t.page.keyboard.press('ArrowRight');
      t.equal(await t.page.evaluate(() => document.getElementById('ltab-facts').getAttribute('aria-selected')), 'true', 'ArrowRight roves from Overview -> By Game -> Facts');

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
  {
    name: 'screens-40 W4-B03 GPU UI mograph, atomic closeModal, sticky/in-place sheets, 650 ms Bath Ticket sync, #notices dock & 320px/landscape layout (W6-S5-07, W6-S5-08, W6-S5-09)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'full', tips: true });
      await t.game('newGame', { mode: 'klondike', deal: 40 });
      await t.waitForStable();

      // 1. GPU motion tokens, @media(hover:hover) / :active rules, GPU scaleX() #goal i & translateX() .tog::after
      const cssCheck = await t.page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const tokens = {
          press: root.getPropertyValue('--dur-press').trim(),
          fast: root.getPropertyValue('--dur-fast').trim(),
          med: root.getPropertyValue('--dur-med').trim(),
          slow: root.getPropertyValue('--dur-slow').trim(),
          easeOut: root.getPropertyValue('--ease-out').trim(),
        };
        const cssText = [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join('\n'); } catch { return ''; } }).join('\n');
        const goalI = document.querySelector('#goal i');
        const goalCs = getComputedStyle(goalI);
        return {
          tokens,
          hasHoverMedia: /@media\s*\(hover:\s*hover\)/.test(cssText),
          hasActivePress: /:active:not\(:disabled\)/.test(cssText) && /translateY\(1px\)/.test(cssText),
          hasDanger: /\.btn\.danger/.test(cssText),
          goalProp: goalCs.transitionProperty,
          goalInlineTransform: goalI.style.transform,
          goalInlineWidth: goalI.style.width,
        };
      });
      t.equal([cssCheck.tokens.press, cssCheck.tokens.fast, cssCheck.tokens.med, cssCheck.tokens.slow], ['60ms', '140ms', '200ms', '360ms'], 'canonical GPU motion tokens defined on :root');
      t.expect(cssCheck.hasHoverMedia && cssCheck.hasActivePress && cssCheck.hasDanger, 'restrained @media(hover:hover), :active press detents, and .btn.danger CSS rules present');
      t.expect(/transform/.test(cssCheck.goalProp) && !/width/.test(cssCheck.goalProp) && /^scaleX\(/.test(cssCheck.goalInlineTransform) && !cssCheck.goalInlineWidth, '#goal i animates GPU transform: scaleX() rather than width: ' + JSON.stringify(cssCheck));

      // 2. Atomic t=0 closeModal() teardown decoupled from 110 ms non-blocking exit fade + mid-fade cancellation (CD-WF5-03)
      await t.page.focus('#bHelp');
      await t.page.keyboard.press('Enter');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'help');
      const atomicClose = await t.page.evaluate(() => {
        const m = document.getElementById('modal');
        document.querySelector('#sheet [data-close]').click();
        const atZero = {
          modal: window.__game.getState().modal,
          inert: document.getElementById('app').inert,
          activeId: document.activeElement ? document.activeElement.id : null,
          closing: m.classList.contains('closing'),
          on: m.classList.contains('on'),
          pe: getComputedStyle(m).pointerEvents,
        };
        // Immediately re-open another modal mid-fade to verify instant exit cancellation
        document.getElementById('bMenu').click();
        const reopened = {
          modal: window.__game.getState().modal,
          closing: m.classList.contains('closing'),
          on: m.classList.contains('on'),
        };
        return { atZero, reopened };
      });
      t.equal(atomicClose.atZero, { modal: null, inert: false, activeId: 'bHelp', closing: true, on: false, pe: 'none' }, 'closeModal() tears down state/inert/focus atomically at t=0 while non-blocking #modal.closing fades');
      t.equal(atomicClose.reopened, { modal: 'menu', closing: false, on: true }, 'opening a modal mid-exit cancels #modal.closing immediately');
      await t.page.keyboard.press('Escape');
      await t.page.waitForFunction(() => !document.getElementById('modal').classList.contains('closing'), null, { timeout: 2000 });

      // 3. Sticky .sheet-head + scrollable #sheetBody + in-place patching (Settings tabs, tipsAgain, Skylight reseed, Ledger tabs)
      await t.page.setViewportSize({ width: 390, height: 520 });
      await t.game('scene', 'settings');
      const settingsPatch = await t.page.evaluate(() => {
        const sb = document.getElementById('sheetBody'), hd = document.querySelector('#sheet .sheet-head');
        const togCs = getComputedStyle(document.querySelector('#sheet .tog'), '::after');
        const headTopBefore = hd.getBoundingClientRect().top;
        sb.scrollTop = 60;
        const scrolled = sb.scrollTop;
        const headTopAfterScroll = hd.getBoundingClientRect().top;
        document.querySelector('[data-a="tipsAgain"]').click();
        const afterTipsSame = document.getElementById('sheetBody') === sb;
        const afterTipsScroll = sb.scrollTop;
        document.getElementById('stab-comfort').click();
        const afterTabSame = document.getElementById('sheetBody') === sb;
        document.getElementById('stab-audio').click();
        const togProp = togCs.transitionProperty;
        return {
          headPinned: Math.abs(headTopBefore - headTopAfterScroll) < 1,
          scrolled,
          afterTipsSame,
          afterTipsScroll,
          afterTabSame,
          togProp,
        };
      });
      t.expect(settingsPatch.headPinned && settingsPatch.scrolled > 0, 'sticky .sheet-head stays pinned while #sheetBody scrolls');
      t.expect(settingsPatch.afterTipsSame && Math.abs(settingsPatch.afterTipsScroll - settingsPatch.scrolled) <= 2, 'Show tips again patches in place without resetting #sheetBody.scrollTop');
      t.equal(settingsPatch.afterTabSame, true, 'Settings tab switch patches in place without rebuilding #sheetBody');
      t.expect(/transform/.test(settingsPatch.togProp) && !/left/.test(settingsPatch.togProp), '.tog::after animates GPU transform rather than left: ' + settingsPatch.togProp);

      // Skylight Reshuffle hides on non-skylight back until Skylight is focused, then patches in place without overwriting equipped back (W6-S2-05, CD-WF5-03)
      await t.game('setSettings', { back: 'lozenge' });
      await t.game('scene', 'backs');
      const reseedPatch = await t.page.evaluate(() => {
        const sb = document.getElementById('sheetBody');
        const btn = document.querySelector('[data-a="reseed"]');
        const hiddenBefore = !!(btn && btn.hidden);
        const seedBefore = window.__game.getState().settings.deckSeed;
        document.querySelector('[data-back="skylight"]').focus();
        sb.scrollTop = 45;
        const beforeScroll = sb.scrollTop;
        const shownOnFocus = !!(btn && !btn.hidden && !btn.disabled);
        if (btn) btn.click();
        return {
          hadBtn: !!btn,
          hiddenBefore,
          shownOnFocus,
          seedChanged: window.__game.getState().settings.deckSeed !== seedBefore,
          sameBody: document.getElementById('sheetBody') === sb,
          scrollDiff: Math.abs(sb.scrollTop - beforeScroll),
          back: window.__game.getState().settings.back,
        };
      });
      t.expect(reseedPatch.hadBtn && reseedPatch.hiddenBefore && reseedPatch.shownOnFocus && reseedPatch.seedChanged && reseedPatch.sameBody && reseedPatch.scrollDiff <= 2 && reseedPatch.back === 'lozenge', 'Reshuffle skylight glass reveals on Skylight focus and patches in place without overwriting equipped non-skylight back: ' + JSON.stringify(reseedPatch));

      // Bathhouse Ledger tabs patch in place without tearing down #sheetBody
      await t.game('scene', 'records');
      const ledgerPatch = await t.page.evaluate(() => {
        const sb = document.getElementById('sheetBody');
        document.getElementById('ltab-games').click();
        const s1 = document.getElementById('sheetBody') === sb;
        document.getElementById('ltab-facts').click();
        const s2 = document.getElementById('sheetBody') === sb;
        document.getElementById('ltab-ach').click();
        const s3 = document.getElementById('sheetBody') === sb;
        return s1 && s2 && s3;
      });
      t.equal(ledgerPatch, true, 'Bathhouse Ledger tab switches patch #sheetBody in place');
      await t.game('scene', 'game');

      // 4. Synchronized 650 ms Bath Ticket stamp, 3 px corners, 260 ms .sheet-frame.rise, post-Win Ticket recall & 2-col landscape Win (CD-WF5-06, CD-WF5-04)
      await t.page.setViewportSize({ width: 1280, height: 800 });
      await t.game('setState', nearWinKlondike());
      await t.game('cuesPlayed', true);
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 6000 });
      const winOpenAt = await t.page.evaluate(() => Math.round(performance.now()));
      await t.page.waitForFunction(() => window.__game.cuesPlayed().some((c) => c.name === 'punch'), null, { timeout: 2500 });
      const winCheck = await t.page.evaluate((tOpen) => {
        const fr = document.getElementById('sheetFrame');
        const tk = document.querySelector('#sheet .ticket');
        const pn = document.querySelector('#sheet .ticket .punch');
        const nw = document.querySelector('#sheet .course i.new');
        const punchCue = window.__game.cuesPlayed().find((c) => c.name === 'punch');
        return {
          riseDur: getComputedStyle(fr).animationDuration,
          ticketRadius: getComputedStyle(tk).borderRadius,
          ticketDelays: getComputedStyle(tk).animationDelay,
          punchDelay: getComputedStyle(pn).animationDelay,
          dotDelay: nw ? getComputedStyle(nw).animationDelay : 'none',
          punchDeltaMs: punchCue ? punchCue.at - tOpen : null,
        };
      }, winOpenAt);
      t.equal(winCheck.riseDur, '0.26s', 'Win modal sheet-frame rises in calmer 260 ms');
      t.equal(winCheck.ticketRadius, '3px', 'Bath Ticket keeps crisp 3 px die-cut corners (CD-WF5-06)');
      t.equal(winCheck.punchDelay, '0.65s', 'Bath Ticket .punch fires at 650 ms');
      t.equal(winCheck.dotDelay, '0.65s', 'Bath Ticket .course i.new fires at 650 ms');
      t.expect(/0\.65s/.test(winCheck.ticketDelays), 'Bath Ticket recoil aligns to 650 ms: ' + winCheck.ticketDelays);
      t.expect(winCheck.punchDeltaMs != null && winCheck.punchDeltaMs >= 560 && winCheck.punchDeltaMs <= 820, 'bespoke punch SFX fires on the 650 ms beat: ' + winCheck.punchDeltaMs + ' ms');

      // Landscape 844x390: 2-column Win grid + #bNew order:5 (CD-WF5-04); closing Win exposes persistent View Bath Ticket recall
      await t.page.setViewportSize({ width: 844, height: 390 });
      const landWin = await t.page.evaluate(() => {
        const cols = document.querySelector('#sheet .win-cols');
        return {
          winColsGrid: cols ? getComputedStyle(cols).display : '',
          winColsCount: cols ? getComputedStyle(cols).gridTemplateColumns.split(/\s+/).length : 0,
          bNewOrder: getComputedStyle(document.getElementById('bNew')).order,
        };
      });
      t.expect(landWin.winColsGrid === 'grid' && landWin.winColsCount === 2, 'Landscape 844x390 Win modal lays out in 2 columns: ' + JSON.stringify(landWin));
      t.equal(landWin.bNewOrder, '5', 'Landscape phone moves #bNew to bottom of right rail (order: 5, CD-WF5-04)');
      await t.page.keyboard.press('Escape');
      t.equal((await t.state()).modal, null, 'closing Win modal returns to won table');
      const ticketRecall = await t.page.evaluate(() => {
        const b = document.getElementById('bAuto');
        return { disabled: b.disabled, text: b.textContent.trim(), label: b.getAttribute('aria-label') || '' };
      });
      t.expect(!ticketRecall.disabled && /ticket/i.test(ticketRecall.text + ' ' + ticketRecall.label), 'closing Win modal leaves persistent Ticket recall active: ' + JSON.stringify(ticketRecall));
      await t.page.click('#bAuto');
      t.equal((await t.state()).modal, 'win', 'clicking Ticket recall reopens MODALS.win cleanly');
      await t.game('scene', 'game');

      // 5. Mobile 390x844 modal width + aligned 2-row #status + portrait #bNew order:0 + unified #notices dock + tap-to-dismiss toast
      await t.page.setViewportSize({ width: 390, height: 844 });
      await t.game('setSettings', { scoring: 'timed' });
      await t.game('newGame', { mode: 'klondike', deal: 41 });
      await t.waitForStable();
      await t.game('scene', 'settings');
      const mob390 = await t.page.evaluate(() => {
        const sb = document.getElementById('sheetBody');
        const st = document.getElementById('status');
        const bNewOrder = getComputedStyle(document.getElementById('bNew')).order;
        return {
          bodyWidth: Math.round(sb.getBoundingClientRect().width),
          statusHeight: Math.round(st.getBoundingClientRect().height),
          bNewOrder,
        };
      });
      t.expect(mob390.bodyWidth >= 340, '390 px mobile modal reclaims width (>=340 px inner sheet-body): ' + mob390.bodyWidth);
      t.expect(mob390.statusHeight <= 44, 'mobile #status stays on an aligned 2-row baseline even in Timed scoring: ' + mob390.statusHeight);
      t.equal(mob390.bNewOrder, '0', 'portrait #tools keeps #bNew in leftmost slot (order: 0)');

      // 320x568 small phone: zero horizontal .seg clip across all 3 Settings tabs + 2-line full-width Audio sliders
      await t.page.setViewportSize({ width: 320, height: 568 });
      await t.game('scene', 'settings');
      await t.waitForStable();
      const check320Segs = () => t.page.evaluate(() => {
        const bad = [];
        for (const b of document.querySelectorAll('#sheet .seg button')) {
          const r = b.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (r.right > window.innerWidth + 1 || r.left < -1 || r.height < 44) bad.push({ text: b.textContent.trim(), l: Math.round(r.left), r: Math.round(r.right), h: Math.round(r.height) });
        }
        return bad;
      });
      t.equal(await check320Segs(), [], '320x568 Settings Gameplay .seg buttons fit without horizontal clipping');
      await t.page.click('#stab-comfort');
      t.equal(await check320Segs(), [], '320x568 Settings Table & Comfort .seg buttons fit without horizontal clipping');
      await t.page.click('#stab-audio');
      const audio320 = await t.page.evaluate(() => [...document.querySelectorAll('#sheet input[type=range]')].map((el) => Math.round(el.getBoundingClientRect().width)));
      t.expect(audio320.length >= 3 && audio320.every((w) => w >= 240), '320x568 Audio sliders sit full-width on their own line (>=240 px): ' + JSON.stringify(audio320));

      // Unified #notices dock: simultaneous #toast + #coach + #tabNote stack with zero overlap, and clicking #toast dismisses it
      await t.game('scene', 'game');
      await t.page.setViewportSize({ width: 390, height: 844 });
      const dockCheck = await t.page.evaluate(() => {
        const toastEl = document.getElementById('toast'), coachEl = document.getElementById('coach'), tabEl = document.getElementById('tabNote');
        toastEl.textContent = 'Sample long gameplay reminder toast for dock verification.';
        toastEl.classList.add('on');
        coachEl.hidden = false; coachEl.querySelector('span').textContent = 'Tap a card to send it where it fits.';
        tabEl.hidden = false;
        const rects = [toastEl, coachEl, tabEl].map((el) => { const r = el.getBoundingClientRect(); return { id: el.id, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; }).sort((a, b) => a.top - b.top);
        const overlaps = [];
        for (let i = 1; i < rects.length; i++) if (rects[i].top < rects[i - 1].bottom - 1) overlaps.push([rects[i - 1], rects[i]]);
        toastEl.click();
        const dismissed = !toastEl.classList.contains('on');
        coachEl.hidden = true; tabEl.hidden = true;
        return { rects, overlaps, dismissed };
      });
      t.equal(dockCheck.overlaps, [], 'simultaneous #toast, #coach, and #tabNote stack inside #notices with zero overlap: ' + JSON.stringify(dockCheck.rects));
      t.equal(dockCheck.dismissed, true, 'tapping #toast dismisses it immediately');

      // 6. Deal modal validation: out-of-range deal shakes input, shows #dealNote, announces error, and stays open
      await t.game('scene', 'deal');
      await t.page.fill('#dealIn', '999999999999');
      await t.page.click('[data-a="goDeal"]');
      const dealErr = await t.page.evaluate(() => ({
        modal: window.__game.getState().modal,
        shook: document.getElementById('dealIn').classList.contains('shake'),
        noteVisible: !document.getElementById('dealNote').hidden,
        noteText: document.getElementById('dealNote').textContent.trim(),
        sr: document.getElementById('sr').textContent.trim(),
      }));
      t.expect(dealErr.modal === 'deal' && dealErr.shook && dealErr.noteVisible && /Enter a whole number/i.test(dealErr.noteText) && /Enter a whole number/i.test(dealErr.sr), 'invalid deal number shakes #dealIn, populates #dealNote, announces error, and stays open: ' + JSON.stringify(dealErr));
    },
  },
];
