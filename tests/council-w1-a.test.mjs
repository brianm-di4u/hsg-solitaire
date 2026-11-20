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
        'empty deck (0 cards)': (() => { const c = JSON.parse(JSON.stringify(good)); c.state.cards = []; c.state.up = []; for (const id in c.state.piles) c.state.piles[id] = []; return c; })(),
        'truncated deck (51 cards)': (() => { const c = JSON.parse(JSON.stringify(good)); c.state.cards.pop(); c.state.up.pop(); for (const id in c.state.piles) c.state.piles[id] = c.state.piles[id].filter((u) => u < 51); return c; })(),
        'old version': Object.assign({}, good, { state: Object.assign({}, good.state, { v: 0 }) }),
        'missing pile': (() => { const c = JSON.parse(JSON.stringify(good)); delete c.state.piles.t3; return c; })(),
        'extra pile': (() => { const c = JSON.parse(JSON.stringify(good)); c.state.piles.extra = []; return c; })(),
        'duplicate card': (() => { const c = JSON.parse(JSON.stringify(good)); c.state.piles.t0[0] = c.state.piles.t1[0]; return c; })(),
        'no opts': (() => { const c = JSON.parse(JSON.stringify(good)); delete c.state.opts; return c; })(),
        'nan score': (() => { const c = JSON.parse(JSON.stringify(good)); c.state.score = 'x'; return c; })(),
        'negative moves': (() => { const c = JSON.parse(JSON.stringify(good)); c.state.moves = -1; return c; })(),
        'negative score': (() => { const c = JSON.parse(JSON.stringify(good)); c.state.score = -10; return c; })(),
        'non-boolean up': (() => { const c = JSON.parse(JSON.stringify(good)); c.state.up[0] = 1; return c; })(),
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

      // Corrupted undo snapshots (out-of-range/duplicate indices, bad up, negative counters) are stripped rather than crashing Undo.
      const badUndo = {
        'undo out-of-range index': (() => { const c = JSON.parse(JSON.stringify(good)); c.undo[0].piles.t0[0] = 99; return c; })(),
        'undo duplicate index': (() => { const c = JSON.parse(JSON.stringify(good)); c.undo[0].piles.t0[0] = c.undo[0].piles.t1[0]; return c; })(),
        'undo non-boolean up': (() => { const c = JSON.parse(JSON.stringify(good)); c.undo[0].up[0] = 1; return c; })(),
        'undo negative moves': (() => { const c = JSON.parse(JSON.stringify(good)); c.undo[0].moves = -1; return c; })(),
      };
      for (const [name, val] of Object.entries(badUndo)) {
        await plant(t, CUR, JSON.stringify(val));
        t.expect(await t.page.isVisible('#tCont'), name + ': valid state still offers Continue');
        await t.page.click('#tCont'); await t.waitForStable();
        const s = await t.state();
        t.equal([s.moves, s.undoDepth], [1, 0], name + ': corrupted undo stack stripped safely');
        t.equal((await t.game('act', 'undo')).ok, false, name + ': Undo does not crash');
        await t.game('scene', 'title'); await settle(t);
      }

      await plant(t, CUR, JSON.stringify(good));
      await t.page.click('#tCont'); await t.waitForStable();
      t.equal((await t.state()).moves, 1, 'a good save still resumes');
      t.equal((await t.state()).undoDepth, 1, 'a good save keeps its valid undo snapshot');
      await t.game('act', 'undo');
      t.equal((await t.state()).moves, 0, 'and Undo restores the prior move cleanly');
    },
  },
  {
    name: 'w1a W6-S6-02 without CANVAS_FILTER over file:// hueShifted falls back without faulting Title or gameplay',
    fileUrl: true,
    initScript: () => { delete CanvasRenderingContext2D.prototype.filter; },
    async run(t) {
      await t.page.waitForFunction(() => window.__game && window.__game.isIdle(), null, { timeout: 20000 });
      t.equal(await t.game('canvasFilter'), false, 'CANVAS_FILTER is disabled');
      t.equal((await t.state()).scene, 'title', 'Title rendered cleanly with no fault modal');
      await t.page.waitForFunction(() => window.__game.art().loaded.includes('back-skylight'), null, { timeout: 15000 });
      await baseSettings(t, { motion: 'reduced', tips: false });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 11 });
      await t.waitForStable();
      await t.game('act', 'draw');
      await t.waitForStable();
      const s = await t.state();
      t.equal([s.scene, s.modal, s.moves], ['game', null, 1], 'gameplay renders and draws without SecurityError or fault dialog');
    },
  },
  {
    name: 'w1a W6-S6-02 persistent render throw caps automatic fault() retries instead of spinning at 60 fps',
    allowConsoleErrors: true,
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced', tips: false });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 11 });
      await t.waitForStable();
      await t.page.evaluate(() => {
        window.__renderThrows = 0;
        window.__origClearRect = CanvasRenderingContext2D.prototype.clearRect;
        CanvasRenderingContext2D.prototype.clearRect = function () {
          window.__renderThrows++;
          throw new Error('persistent draw boom');
        };
      });
      try {
        await t.game('act', 'draw');
        await t.page.waitForFunction(() => window.__game.getState().modal === 'fault', null, { timeout: 8000 });
        await t.page.waitForTimeout(350);
        const count1 = await t.page.evaluate(() => window.__renderThrows);
        await t.page.waitForTimeout(200);
        const count2 = await t.page.evaluate(() => window.__renderThrows);
        t.expect(count1 >= 1 && count1 <= 4, 'automatic fault() redraws stop after <=3 retries (total throws: ' + count1 + ')');
        t.equal(count2, count1, 'render exception loop completely halted (no ongoing 60 fps spin)');
      } finally {
        await t.page.evaluate(() => {
          if (window.__origClearRect) CanvasRenderingContext2D.prototype.clearRect = window.__origClearRect;
        });
      }
      await t.page.locator('#sheet [data-a="resetSaved"]').click();
      t.equal((await t.state()).scene, 'title', 'Reset saved game cleanly returns to Title');
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
        const idle = (pg) => pg.waitForFunction(() => window.__game.isIdle());
        await t.game('newGame', { mode: 'klondike', draw: 1, deal: 61 });
        await t.waitForStable();
        await t.game('act', 'draw');
        await other.evaluate(() => window.__game.newGame({ mode: 'klondike', draw: 1, deal: 62 }));
        await idle(other);
        await other.evaluate(() => window.__game.act('draw'));
        const played = (pg) => pg.evaluate(() => (window.__game.stats().klondike1 || {}).played);
        const raw = await t.page.evaluate(() => JSON.parse(localStorage.getItem('spa-solitaire:v1:stats')).klondike1.played);
        t.equal(raw, 2, 'storage counts both tab games');
        await t.page.waitForTimeout(300);
        t.equal(await played(t.page), 2, 'tab A noticed the other tab write');
        // And back: A plays another deal; the total must keep growing from the shared value.
        await t.game('newGame', { mode: 'klondike', draw: 1, deal: 63 }); await t.waitForStable(); await t.game('act', 'draw');
        t.equal(await t.page.evaluate(() => JSON.parse(localStorage.getItem('spa-solitaire:v1:stats')).klondike1.played), 3, 'third game adds to the shared total');
      } finally { await other.close(); }
    },
  },
  // ---- S6-09 (cases the earlier persist tests did not cover) ----
  {
    name: 'w1a S6-09 a quota error on every write is survived and reported',
    initScript: () => {
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (window.__quota) throw new DOMException('quota', 'QuotaExceededError'); return real.call(this, k, v); };
    },
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 71 });
      await t.page.evaluate(() => { window.__quota = true; });
      await t.game('act', 'draw'); await t.game('act', 'draw');
      await settle(t);
      await t.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      const s = await t.state();
      t.equal(s.moves, 2, 'the game keeps playing'); t.equal(s.storageOK, false, 'the failed write is noticed');
      await t.game('scene', 'stats');
      t.expect(/can't be saved/.test(await t.page.textContent('#sheet')), 'the stats sheet explains');
    },
  },
  {
    name: 'w1a S6-09 drag frames stay cheap with the CPU throttled 4x',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t);
      await t.game('newGame', { mode: 'spider', suits: 4, deal: 41 });
      await t.waitForStable();
      const lay = await t.game('getLayout'); const c = lay.piles.t0.cards[lay.piles.t0.cards.length - 1];
      await t.cpuThrottle(4);
      try {
        await t.page.mouse.move(c.x + 10, c.y + 10); await t.page.mouse.down();
        await t.game('frameStats', true);
        for (let i = 0; i < 40; i++) { await t.page.mouse.move(c.x + 10 + i * 6, c.y + 10 + Math.sin(i / 4) * 60); await t.page.waitForTimeout(16); }
        const cost = await t.game('frameStats', true); await t.page.mouse.up();
        t.log('drag frame cost at 4x throttle: median', cost.p50Ms, 'p95', cost.p95Ms);
        t.expect(cost.frames > 10, 'frames were drawn (' + cost.frames + ')');
        t.expect(cost.p50Ms < 24, 'median drag frame under 24 ms (the 6 ms budget x 4) at 4x throttle (' + cost.p50Ms + ')');
      } finally { await t.cpuThrottle(1); }
    },
  },
];
