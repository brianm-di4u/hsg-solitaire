// Council wave 1, batch A: stability, saves and lifecycle (S1-01, S6-01, S6-02, S6-04, S6-07, S6-12, S6-03).
import { baseSettings } from './_util.mjs';

const CUR = 'spa-solitaire:v1:current';
const settle = (t) => t.page.waitForTimeout(450);
const reloadGame = async (t) => { await t.page.reload(); await t.page.waitForFunction(() => !!window.__game); };
async function startedKlondike(t, deal = 11) {
  await baseSettings(t, { motion: 'reduced' });
  await t.game('newGame', { mode: 'klondike', draw: 1, deal });
  await t.game('act', 'draw');
  await t.waitForStable(); await settle(t);
}
// Put a raw value in storage as the page unloads (after the game's own pagehide and hidden saves), then reload.
const plant = async (t, key, raw) => {
  await t.page.evaluate(([k, v]) => { const w = () => localStorage.setItem(k, v); window.addEventListener('pagehide', w); document.addEventListener('visibilitychange', w); }, [key, raw]);
  await reloadGame(t);
};
const stored = (t, key) => t.page.evaluate((k) => localStorage.getItem(k), key);

export const tests = [
  // ---- S1-01 ----
  {
    name: 'w1a S1-01 New button, N key and restart ask before abandoning a started deal',
    async run(t) {
      await startedKlondike(t);
      const before = await t.state(); t.expect(before.moves === 1, 'one move played');
      await t.page.click('#bNew');
      let s = await t.state(); t.equal(s.modal, 'confirm', 'New button opens the confirm sheet');
      t.equal(s.deal, before.deal, 'deal untouched while asking');
      await t.page.click('#sheet [data-close][data-focus]');
      s = await t.state(); t.equal(s.modal, null, 'Cancel closes the sheet'); t.equal(s.moves, 1, 'game kept after Cancel');
      await t.game('act', 'key', 'n');
      t.equal((await t.state()).modal, 'confirm', 'N key opens the confirm sheet');
      await t.page.click('#sheet [data-close][data-focus]');
      await t.page.click('#bMenu'); await t.page.click('#sheet [data-a="restart"]');
      t.equal((await t.state()).modal, 'confirm', 'Restart from the menu asks too');
      await t.page.click('#sheet [data-close][data-focus]');
      t.equal((await t.state()).moves, 1, 'still the same game');
      t.expect(JSON.parse(await stored(t, CUR)).state.moves === 1, 'saved game untouched');
      await t.page.click('#bNew'); await t.page.click('#sheet [data-a="yes"]');
      s = await t.state(); t.equal(s.modal, null, 'confirm closes'); t.equal(s.moves, 0, 'fresh deal after confirming'); t.expect(s.deal !== before.deal, 'new deal number');
    },
  },
  {
    name: 'w1a S1-01 no confirmation when nothing has been played, or the deal is won',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 12 });
      await t.waitForStable();
      await t.page.click('#bNew');
      const s = await t.state(); t.equal(s.modal, null, 'unstarted deal is replaced without asking'); t.expect(s.deal !== 12, 'new deal dealt');
    },
  },
  {
    name: 'w1a S1-01 title chips keep the saved game until the player confirms',
    async run(t) {
      await startedKlondike(t, 13);
      await reloadGame(t);
      t.expect(await t.page.isVisible('#tCont'), 'Continue offered');
      await t.page.click('#tiles .chip >> nth=4'); // Spider, 1 suit
      let s = await t.state(); t.equal(s.scene, 'confirm', 'chip asks first');
      t.expect(JSON.parse(await stored(t, CUR)).state.mode === 'klondike', 'save still the Klondike game');
      await t.page.click('#sheet [data-close][data-focus]');
      await t.page.waitForTimeout(450);
      t.expect(JSON.parse(await stored(t, CUR)).state.mode === 'klondike', 'save kept after Cancel');
      await t.page.click('#tCont'); await t.waitForStable();
      s = await t.state(); t.equal(s.mode, 'klondike', 'Continue still resumes it'); t.equal(s.moves, 1, 'with its move');
      await t.game('scene', 'title');
      await t.page.click('#tiles .chip >> nth=4'); await t.page.click('#sheet [data-a="yes"]'); await t.waitForStable();
      s = await t.state(); t.equal(s.mode, 'spider', 'confirmed chip starts Spider');
    },
  },
  // ---- S6-01 ----
  {
    name: 'w1a S6-01 a saved game of the wrong shape is dropped, not resumed',
    async run(t) {
      await startedKlondike(t, 21);
      const good = JSON.parse(await stored(t, CUR));
      const bad = {
        'empty state': { state: { mode: 'klondike' }, undo: [] },
        'old version': Object.assign({}, good, { state: Object.assign({}, good.state, { v: 0 }) }),
        'missing pile': (() => { const c = JSON.parse(JSON.stringify(good)); delete c.state.piles.t3; return c; })(),
        'duplicate card': (() => { const c = JSON.parse(JSON.stringify(good)); c.state.piles.t0[0] = c.state.piles.t1[0]; return c; })(),
        'no opts': (() => { const c = JSON.parse(JSON.stringify(good)); delete c.state.opts; return c; })(),
        'nan score': (() => { const c = JSON.parse(JSON.stringify(good)); c.state.score = 'x'; return c; })(),
        'array state': { state: [], undo: [] },
      };
      for (const [name, val] of Object.entries(bad)) {
        await plant(t, CUR, JSON.stringify(val));
        t.expect(!(await t.page.isVisible('#tCont')), name + ': Continue hidden');
        t.equal(await stored(t, CUR), null, name + ': bad save removed');
        await t.page.click('#tiles .chip >> nth=0'); await t.waitForStable();
        const s = await t.state(); t.equal([s.mode, s.moves], ['klondike', 0], name + ': a new Klondike deal starts');
        await t.game('scene', 'title'); await settle(t);
      }
      await plant(t, CUR, JSON.stringify(good).slice(0, 200));
      t.expect(!(await t.page.isVisible('#tCont')), 'truncated JSON: Continue hidden');
      await plant(t, CUR, JSON.stringify(good));
      await t.page.click('#tCont'); await t.waitForStable();
      t.equal((await t.state()).moves, 1, 'a good save still resumes');
    },
  },
  // ---- S6-02 ----
  {
    name: 'w1a S6-02 pagehide and a hidden tab write the save at once',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 31 });
      await settle(t);
      const read = () => { const c = localStorage.getItem('spa-solitaire:v1:current'); return c ? JSON.parse(c).state.moves : -1; };
      const viaPagehide = await t.page.evaluate((fn) => {
        window.__game.act('draw'); window.dispatchEvent(new Event('pagehide')); return eval('(' + fn + ')')();
      }, read.toString());
      t.equal(viaPagehide, 1, 'pagehide flushed the move that was still inside the debounce');
      await settle(t);
      const viaHidden = await t.page.evaluate((fn) => {
        window.__game.act('draw');
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
        const n = eval('(' + fn + ')')();
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        return n;
      }, read.toString());
      t.equal(viaHidden, 2, 'a hidden tab flushed the move that was still inside the debounce');
    },
  },
  // ---- S6-04 ----
  {
    name: 'w1a S6-04 stats, meta and settings of the wrong shape fall back to defaults',
    async run(t) {
      const P = 'spa-solitaire:v1:';
      const cases = [
        ['stats null', { stats: 'null' }], ['stats number', { stats: '7' }], ['stats array', { stats: '[1]' }],
        ['stats entry null', { stats: '{"klondike1":null,"spider2":5}' }], ['stats entry partial', { stats: '{"klondike1":{"played":"x"}}' }],
        ['meta daily null', { meta: '{"daily":null}' }], ['meta number', { meta: '3' }],
        ['meta bad lastMode', { meta: '{"lastMode":"zzz","lastOpts":null,"totalWins":"many"}' }],
        ['settings bad values', { settings: '{"table":"zzz","back":"zzz","cardSize":"huge","motion":5,"volume":"loud","courts":"x","sound":"yes"}' }],
        ['settings string', { settings: '"abc"' }],
        ['truncated json', { stats: '{"klondike1":{"played":', meta: '{"lastMode":', settings: '{"table":"fe' }],
      ];
      for (const [name, kv] of cases) {
        await t.page.evaluate(([pre, o]) => { for (const k of ['stats', 'meta', 'settings', 'current']) localStorage.removeItem(pre + k); for (const k in o) localStorage.setItem(pre + k, o[k]); }, [P, kv]);
        await reloadGame(t);
        await t.page.click('#tiles .chip >> nth=0'); await t.waitForStable();
        const s = await t.state();
        t.expect(s.storageOK === true, name + ': storage is not reported broken');
        t.expect(['felt', 'marble', 'quapaw', 'pool', 'midnight', 'linen'].includes(s.settings.table), name + ': table valid: ' + s.settings.table);
        t.expect(s.settings.back === 'skylight' || s.settings.back.length > 0, name + ': back valid');
        t.expect(['compact', 'standard', 'large'].includes(s.settings.cardSize), name + ': cardSize valid');
        t.expect(['auto', 'full', 'reduced'].includes(s.settings.motion), name + ': motion valid');
        t.expect(typeof s.settings.volume === 'number' && s.settings.volume >= 0 && s.settings.volume <= 1, name + ': volume valid');
        await t.game('scene', 'stats'); await t.game('scene', 'title');
        await t.page.waitForSelector('#tDaily');
        { const k1 = (await t.game('stats')).klondike1; t.expect(k1 && typeof k1.played === 'number', name + ': stats entry usable'); }
        if (name === 'truncated json') for (const k of ['stats', 'meta', 'settings']) t.expect((await stored(t, P + k)) !== kv[k], name + ': bad ' + k + ' no longer kept as is');
        await settle(t);
      }
    },
  },
  // ---- S6-07 ----
  {
    name: 'w1a S6-07 a throttled hidden tab does not add its gap to the game clock',
    initScript: () => { window.__off = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__off; },
    async run(t) {
      await startedKlondike(t, 41);
      const e0 = (await t.state()).elapsedMs;
      // Hide the tab, let 60 s pass with no timer firing (as a throttled background tab does), show it again.
      await t.page.evaluate(() => {
        const hidden = (v) => Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
        hidden(true); document.dispatchEvent(new Event('visibilitychange'));
        window.__off += 60000;
        hidden(false); document.dispatchEvent(new Event('visibilitychange'));
      });
      const e1 = (await t.state()).elapsedMs;
      t.expect(e1 - e0 < 5000, 'clock advanced ' + (e1 - e0) + ' ms across a 60 s hidden gap');
    },
  },
  // ---- S6-12 ----
  {
    name: 'w1a S6-12 audio resumes from interrupted and follows tab visibility',
    initScript: () => {
      const Real = window.AudioContext;
      window.__ac = { resume: 0, suspend: 0, fake: null };
      window.AudioContext = class extends Real {
        resume() { window.__ac.resume++; window.__ac.fake = null; return super.resume(); }
        suspend() { window.__ac.suspend++; return super.suspend(); }
        get state() { return window.__ac.fake || super.state; }
      };
    },
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 51 });
      await t.game('setSettings', { sound: true });
      const ac = () => t.page.evaluate(() => ({ resume: window.__ac.resume, suspend: window.__ac.suspend }));
      const hide = (v) => t.page.evaluate((h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); }, v);
      // iOS reports 'interrupted' after a call or alarm; the next cue has to wake it.
      await t.page.evaluate(() => { window.__ac.fake = 'interrupted'; });
      const r0 = (await ac()).resume;
      await t.game('act', 'draw');
      t.expect((await ac()).resume > r0, 'a cue resumes an interrupted context');
      // Hiding the tab suspends audio and showing it resumes it.
      let a = await ac();
      await hide(true);
      t.expect((await ac()).suspend > a.suspend, 'hiding the tab suspends the audio context');
      a = await ac();
      await t.game('act', 'draw');
      t.equal((await ac()).resume, a.resume, 'no cue wakes the context while the tab is hidden');
      await hide(false);
      t.expect((await ac()).resume > a.resume, 'showing the tab resumes the audio context');
    },
  },
  // ---- S6-03 ----
  {
    name: 'w1a S6-03 two tabs add to each other stats instead of overwriting them',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      const other = await t.page.context().newPage();
      try {
        await other.goto(t.page.url()); await other.waitForFunction(() => !!window.__game);
        await other.evaluate(() => window.__game.setSettings({ sound: false, motion: 'reduced' }));
        // Tab A starts a game (played 1). Tab B, loaded before that, starts another.
        await t.game('newGame', { mode: 'klondike', draw: 1, deal: 61 });
        await t.game('act', 'draw');
        await other.evaluate(() => { window.__game.newGame({ mode: 'klondike', draw: 1, deal: 62 }); window.__game.act('draw'); });
        const played = (pg) => pg.evaluate(() => (window.__game.stats().klondike1 || {}).played);
        const raw = await t.page.evaluate(() => JSON.parse(localStorage.getItem('spa-solitaire:v1:stats')).klondike1.played);
        t.equal(raw, 2, 'storage counts both tab games');
        await t.page.waitForTimeout(300);
        t.equal(await played(t.page), 2, 'tab A noticed the other tab write');
        // And back: A plays another deal; the total must keep growing from the shared value.
        await t.game('newGame', { mode: 'klondike', draw: 1, deal: 63 }); await t.game('act', 'draw');
        t.equal(await t.page.evaluate(() => JSON.parse(localStorage.getItem('spa-solitaire:v1:stats')).klondike1.played), 3, 'third game adds to the shared total');
      } finally { await other.close(); }
    },
  },
];
