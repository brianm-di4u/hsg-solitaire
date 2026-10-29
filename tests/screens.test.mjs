// Screens, art and settings tests (PRD AC 26–29, 31–39).
import { baseSettings } from './_util.mjs';

const BACK_IDS = ['skylight', 'lozenge', 'quapaw', 'ironwork', 'paterae', 'sculpin', 'neon', 'deco', 'pines', 'steam', 'lake', 'silks'];
const TABLE_IDS = ['felt', 'linen', 'pool', 'marble', 'midnight'];
const suitRun = (s) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].map((r) => r + s);
const facesState = { mode: 'klondike', piles: { stock: ['#2C'], waste: [], t0: suitRun('S'), t1: suitRun('H'), t2: suitRun('D'), t3: suitRun('C'), t4: ['#5C', '#6C', 'KH'], t5: ['QS'], t6: ['JD'] } };
const courtsState = { mode: 'freecell', piles: { c0: ['AS'], c1: ['AH'], c2: ['AD'], c3: ['AC'], f0: [], f1: [], f2: [], f3: [], t0: ['QD', 'KS'], t1: ['QC', 'KH'], t2: ['JS', 'KD'], t3: ['JH', 'KC'], t4: ['JD', 'QS'], t5: ['JC', 'QH'], t6: ['TS', 'JS'], t7: ['7H', 'JD'] } };

// WCAG relative luminance contrast of each element's text against its nearest opaque background.
async function contrastReport(t, selectors) {
  return t.page.evaluate((sels) => {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
    const out = [];
    for (const s of sels) for (const el of document.querySelectorAll(s)) {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (!r.width || cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden]') || !el.textContent.trim()) continue;
      const fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) continue;
      const a = lum(fg), b = lum(bg); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      out.push({ s, text: el.textContent.trim().slice(0, 24), ratio: +ratio.toFixed(2), disabled: !!el.disabled });
    }
    return out;
  }, selectors);
}
async function touchTargets(t) {
  return t.page.evaluate(() => [...document.querySelectorAll('button, input')].filter((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < innerHeight;
  }).map((el) => { const r = el.getBoundingClientRect(); return { id: el.id || el.className || el.tagName, label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; }));
}
const UI_TEXT = ['#modeName', '#modeSub', '#status span', '#status b', '.tb:not(:disabled)', '.chip', '.btn', '.sheet p', '.sheet h2', '.sheet label', '.set small', '.tag', '.credit', '.tile p', '.tile h2', '#title h1'];

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
      await baseSettings(t);
      await t.game('scene', 'backs');
      t.equal(await t.page.locator('[data-back]').count(), 12, 'twelve backs in the picker');
      t.equal(await t.page.locator('[data-table]').count(), 5, 'five tables in the picker');
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
          seen.add(r.stats.mean + '/' + r.stats.stddev);
        }
        t.equal(seen.size, 12, 'all twelve backs render differently');
      }
      await t.game('setSettings', { back: 'neon' });
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      t.equal((await t.state()).settings.back, 'neon', 'back choice persists after reload');
    },
  },
  {
    name: 'screens-27 five tables',
    async run(t) {
      await baseSettings(t);
      for (const id of TABLE_IDS) {
        await t.game('setSettings', { table: id });
        await t.game('newGame', { mode: 'klondike', deal: 2024 });
        await t.shot('screens-27-table-' + id);
      }
      await t.page.reload(); await t.page.waitForFunction(() => !!window.__game);
      t.equal((await t.state()).settings.table, 'midnight', 'table persists after reload');
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
      await t.game('newGame', { mode: 'klondike', deal: 9 });
      t.equal(await t.game('isIdle'), true, 'no deal animation with reduced motion');
      await t.game('act', 'draw');
      t.equal(await t.game('isIdle'), true, 'no move tween with reduced motion');
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
      const scenes = ['title', 'game', 'menu', 'settings', 'backs', 'stats', 'help', 'daily', 'deal', 'win'];
      await t.game('newGame', { mode: 'spider', suits: 2, deal: 37 });
      for (const sc of scenes) {
        await t.game('scene', sc);
        await t.checkLayout();
        if (t.viewport === 'mobile') {
          const small = (await touchTargets(t)).filter((b) => b.h < 44 || b.w < 44);
          t.equal(small, [], sc + ': all touch targets ≥ 44 px');
        }
        if (sc === 'menu') await t.shot('screens-37-menu');
        if (sc === 'daily') await t.shot('screens-37-daily');
        if (sc === 'stats') await t.shot('screens-37-stats');
      }
    },
  },
  {
    name: 'screens-38 contrast light',
    async run(t) {
      await baseSettings(t);
      for (const sc of ['title', 'game', 'settings', 'help', 'win']) {
        if (sc !== 'title') await t.game('newGame', { mode: 'klondike', deal: 38 });
        await t.game('scene', sc);
        const bad = (await contrastReport(t, UI_TEXT)).filter((r) => r.ratio < 4.5);
        t.equal(bad, [], sc + ': light text contrast ≥ 4.5');
      }
    },
  },
  {
    name: 'screens-38 contrast dark',
    colorScheme: 'dark',
    async run(t) {
      await baseSettings(t);
      await t.game('newGame', { mode: 'freecell', deal: 38 });
      await t.shot('screens-38-game-dark');
      for (const sc of ['game', 'settings', 'help', 'win']) {
        await t.game('scene', sc);
        const bad = (await contrastReport(t, UI_TEXT)).filter((r) => r.ratio < 4.5);
        t.equal(bad, [], sc + ': dark text contrast ≥ 4.5');
      }
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
];
