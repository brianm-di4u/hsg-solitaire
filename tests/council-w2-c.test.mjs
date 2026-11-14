// Council wave 2, batch C: unlocks and achievements (S3-03), daily streak and calendar (S3-04), first-run tips (S2-01).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', '_council', 'hsg-solitaire', 'wave-2', 'shots');
const P = 'spa-solitaire:v1:';
const reloadGame = async (t) => { await t.page.reload(); await t.page.waitForFunction(() => !!window.__game); };
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };
const put = (t, o) => t.page.evaluate(([p, o]) => { for (const k in o) localStorage.setItem(p + k, JSON.stringify(o[k])); }, [P, o]);
const raw = (t, k) => t.page.evaluate(([p, k]) => localStorage.getItem(p + k), [P, k]);
const meta = (t) => t.game('meta');
const daysAgo = (t, n) => t.page.evaluate((n) => { const d = new Date(); d.setDate(d.getDate() - n); const p = (x) => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }, n);
const KEYS = ['klondike1', 'klondike3', 'freecell', 'spider1', 'spider2', 'spider4', 'yukon'];
// what a save written before this wave holds: settings, stats and meta with no unlock record and no tips
const OLD = { settings: { sound: false, volume: 0.4, back: 'neon', table: 'linen' },
  stats: { klondike1: { played: 5, won: 3, streak: 1, bestStreak: 2, bestTimeMs: 240000, fewestMoves: 90, bestScore: 1500, totalMs: 900000 } },
  meta: { lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 3, daily: {} } };
const winNow = async (t) => { await t.game('setState', nearWinKlondike()); await t.game('act', 'move', 't0', 'f3'); await t.waitForStable(9000); await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 15000 }); };
const waitCoach = (t, on = true) => t.page.waitForFunction((on) => !document.getElementById('coach').hidden === on, on, { timeout: 8000 });
const waitText = (t, re) => t.page.waitForFunction(([s, f]) => { const e = document.getElementById('coach'); return !e.hidden && new RegExp(s, f).test(document.getElementById('coachTx').textContent); }, [re.source, re.flags], { timeout: 9000 });
const move = async (t) => { const m = (await t.game('legalMoves')).find((x) => x.to && x.from !== 'stock'); await t.game('act', 'move', m.from, m.to, m.count); };
const coachText = (t) => t.page.evaluate(() => document.getElementById('coachTx').textContent);

export const tests = [
  {
    name: 'w2c S3-03 a new player starts with the classic back and the felt, sees what is locked and how to open it',
    async run(t) {
      let m = await meta(t);
      t.equal(m.unlock.ids, [], 'a fresh profile has nothing unlocked');
      await t.game('scene', 'backs');
      t.equal(await t.page.locator('.bk.lk[data-back]').count(), 11, 'eleven backs locked');
      t.equal(await t.page.locator('.bk.lk[data-table]').count(), 5, 'five tables locked');
      t.expect(await t.page.locator('.bk:not(.lk)[data-back="skylight"]').count() === 1 && await t.page.locator('.bk:not(.lk)[data-table="felt"]').count() === 1, 'the classic back and the felt are open');
      const note = await t.page.locator('[data-back="lozenge"] small').textContent();
      t.equal(note, 'Win 1 game to unlock', 'the first lock says what opens it');
      t.expect((await t.page.locator('[data-back="neon"] small').textContent()).startsWith('Win 32 games to unlock'), 'a later one names its count');
      t.equal(await t.page.locator('[data-back="lozenge"]').getAttribute('aria-disabled'), 'true', 'a locked back is marked disabled for screen readers');
      await t.page.locator('[data-back="lozenge"]').click({ force: true });
      t.equal((await t.state()).settings.back, 'skylight', 'tapping a locked back does not select it');
      t.expect((await t.page.locator('#bkCap').textContent()).includes('Win 1 game to unlock'), 'and the caption gives the condition');
      await t.game('setSettings', { back: 'neon', table: 'linen' });
      const s = (await t.state()).settings; t.equal([s.back, s.table], ['skylight', 'felt'], 'a locked choice is refused by the settings too');
      await shot(t, 'S3-03', 'locked-backs');
      await t.checkLayout();
    },
  },
  {
    name: 'w2c S3-03 the first win opens the first back inside a first session, lists what was earned, and it survives a reload',
    async run(t) {
      await baseSettings(t, { sound: false });
      await winNow(t);
      const m = await meta(t);
      t.equal(m.unlock.ids, ['b:lozenge'], 'one win opens the Fordyce Lozenge back');
      const txt = await t.page.locator('#sheet .earn').textContent();
      t.expect(txt.includes('Unlocked: Fordyce Lozenge back'), 'the ticket says so: ' + txt);
      for (const n of ['First Soak', 'Parlor Game', 'Quick Dip', 'Steam Rush', 'Steady Hand', 'Own Two Hands']) t.expect(txt.includes(n), 'earned ' + n);
      t.expect(!txt.includes('New personal best'), 'a first win is not a "new" best');
      await shot(t, 'S3-03', 'win-earned');
      t.equal(Object.keys(m.ach).sort(), ['alone', 'first', 'klon', 'quick', 'rush', 'steady'], 'six achievements recorded with a date');
      await reloadGame(t);
      const m2 = await meta(t); t.equal(m2.unlock.ids, ['b:lozenge'], 'the unlock record survives a reload'); t.equal(Object.keys(m2.ach).length, 6, 'so do the achievements');
      await t.game('scene', 'backs');
      t.equal(await t.page.locator('.bk.lk[data-back]').count(), 10, 'ten backs still locked');
      await t.page.locator('[data-back="lozenge"]').click();
      t.equal((await t.state()).settings.back, 'lozenge', 'the opened back can be picked');
      t.equal(await t.page.locator('[data-back="paterae"] small').textContent(), 'Win 3 games to unlock (1 so far)', 'the next lock counts progress');
    },
  },
  {
    name: 'w2c S3-03 a save from before this wave opens everything and loses nothing',
    async run(t) {
      await put(t, OLD); await reloadGame(t);
      const m = await meta(t), s = (await t.state()).settings;
      t.equal(m.unlock.ids.length, 16, 'all 11 backs and 5 tables are open'); t.equal([s.back, s.table], ['neon', 'linen'], 'the chosen back and table are kept');
      t.equal([s.sound, s.volume], [false, 0.4], 'settings are kept');
      t.equal((await t.game('stats')).klondike1.won, 3, 'records are untouched'); t.equal(m.totalWins, 3, 'wins are untouched');
      await t.game('scene', 'backs');
      t.equal(await t.page.locator('.bk.lk').count(), 0, 'nothing shows as locked');
      await reloadGame(t);
      t.equal((await meta(t)).unlock.ids.length, 16, 'the record survives a reload');
    },
  },
  {
    name: 'w2c S3-03 a damaged unlock record on an old save opens everything; a hand-edited locked choice falls back',
    async run(t) {
      await put(t, Object.assign({}, OLD, { meta: Object.assign({}, OLD.meta, { unlock: 'oops', ach: 7 }) })); await reloadGame(t);
      let m = await meta(t); t.equal(m.unlock.ids.length, 16, 'a damaged record on an old save is treated as an old save'); t.equal(m.ach, {}, 'a damaged achievement record is empty');
      await put(t, { meta: Object.assign({}, OLD.meta, { unlock: { ids: ['b:lozenge', 'b:nonsense'] } }), settings: { sound: false, back: 'neon', table: 'linen', tips: false } }); await reloadGame(t);
      m = await meta(t); const s = (await t.state()).settings;
      t.equal(m.unlock.ids, ['b:lozenge'], 'unknown ids are dropped'); t.equal([s.back, s.table], ['skylight', 'felt'], 'a setting that points at locked content falls back to the default');
      await t.game('newGame', { mode: 'klondike' }); t.equal((await t.state()).scene, 'game', 'and the game runs');
    },
  },
  {
    name: 'w2c S3-03 the achievement list is specific, unique and checked against the records',
    viewports: ['desktop'],
    async run(t) {
      await put(t, { stats: { klondike3: { played: 9, won: 8, streak: 3, bestStreak: 7, bestTimeMs: 100000, fewestMoves: 80, bestScore: 1, totalMs: 1 }, spider2: { played: 2, won: 1, streak: 1, bestStreak: 1, bestTimeMs: 1, fewestMoves: 1, bestScore: 1, totalMs: 1 } },
        meta: { totalWins: 21, daily: {}, unlock: { ids: [] } }, settings: { sound: false, tips: false } });
      await reloadGame(t);
      await baseSettings(t, { sound: false }); await winNow(t);
      const m = await meta(t), got = Object.keys(m.ach);
      for (const id of ['first', 'klon', 'draw3', 'spid', 'spid2', 'st3', 'st7', 'w10', 'w21']) t.expect(got.includes(id), 'earned ' + id + ' from the records: ' + got);
      for (const id of ['spid4', 'free', 'yuk', 'w40', 'w50', 'w100', 'd1', 'd7all', 'run']) t.expect(!got.includes(id), 'did not earn ' + id);
      t.equal(m.unlock.ids.length, 11, 'the 22nd win opens everything up to 21 wins: ' + m.unlock.ids);
      await t.game('scene', 'records');
      const body = await t.page.locator('#sheet').textContent();
      t.expect(body.includes('Achievements: ' + got.length + ' of 24'), 'Records counts them: 24 in all');
      const names = await t.page.locator('.ach li b').allTextContents(); t.equal(new Set(names).size, names.length, 'names are unique');
      t.equal(names.length, 24, '24 achievements');
    },
  },
  {
    name: 'w2c S3-03 closing a Spider run earns an achievement with a toast and a cue',
    async run(t) {
      await baseSettings(t, { sound: false });
      const q = 'QS JS TS 9S 8S 7S 6S 5S 4S 3S 2S AS'.split(' ');
      const piles = { stock: [], t0: ['KS'], t1: q, t2: [], t3: [], t4: [], t5: ['5D'], t6: [], t7: [], t8: [], t9: [] };
      await t.game('setState', { mode: 'spider', opts: { suits: 1 }, piles });
      await t.game('act', 'move', 't1', 't0', 12);
      await t.page.waitForFunction(() => /Achievement: Clear Water/.test(document.getElementById('toast').textContent), null, { timeout: 5000 });
      t.expect((await meta(t)).ach.run, 'recorded');
      await shot(t, 'S3-03', 'toast');
    },
  },
  {
    name: 'w2c S3-03 the ach cue sits in the cue range',
    viewports: ['desktop'],
    async run(t) {
      t.expect((await t.game('audioList')).cues.includes('ach'), 'ach is a cue');
      const r = await t.page.evaluate(() => window.__game.audioRender('ach', 6, false));
      t.log('ach: peak ' + r.peak + ', rms ' + r.rmsDb);
      t.expect(r.peak >= 0.2 && r.peak <= 0.45, 'cue peak 0.2 to 0.45, got ' + r.peak);
    },
  },
  {
    name: 'w2c S3-03 Records shows every game, the streaks, the next unlock and the achievements',
    async run(t) {
      await put(t, OLD); await reloadGame(t);
      await t.page.click('#tRec');
      t.equal((await t.state()).scene, 'records', 'reachable from the title');
      const txt = await t.page.locator('#sheet').textContent();
      t.expect(txt.includes('Won 3 of 5 · streak 1 (best 2)'), 'per-game record: ' + txt.slice(0, 200));
      t.expect(txt.includes('Best 4:00 · 90 moves · score 1500'), 'bests'); t.expect(txt.includes('Baths won: 3'), 'total wins');
      t.equal(await t.page.locator('.rec').count(), 7, 'all seven game variants');
      await shot(t, 'S3-03', 'records');
      await t.page.evaluate(() => { const s = document.getElementById('sheet'); s.scrollTop = s.scrollHeight; });
      await shot(t, 'S3-03', 'records-achievements');
      await t.checkLayout({ allowScrollY: true });
      await t.page.keyboard.press('Escape');
      await t.game('newGame', { mode: 'klondike' }); await t.game('scene', 'menu');
      t.expect(await t.page.locator('[data-a="records"]').count() === 1, 'and from the pause card');
    },
  },
  {
    name: 'w2c S3-03 a new personal best is announced on the ticket',
    viewports: ['desktop'],
    async run(t) {
      await put(t, OLD); await reloadGame(t);
      await baseSettings(t, { sound: false }); await winNow(t);
      t.expect((await t.page.locator('#sheet .earn').textContent()).includes('New personal best'), 'a faster win than the record says so');
    },
  },
];
