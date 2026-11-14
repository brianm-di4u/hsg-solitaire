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
  {
    name: 'w2c S3-04 the daily streak counts consecutive days, resets on a gap, and the calendar shows each day',
    async run(t) {
      const d0 = await daysAgo(t, 0), d1 = await daysAgo(t, 1), d2 = await daysAgo(t, 2), d9 = await daysAgo(t, 9);
      const daily = {}; for (const d of [d0, d1, d2]) daily[d + '|klondike1'] = 'won'; daily[d1 + '|freecell'] = 'won'; daily[d9 + '|klondike1'] = 'won';
      for (const k of KEYS) daily[d2 + '|' + k] = 'won'; daily[d0 + '|yukon'] = 'played';
      await put(t, { meta: Object.assign({}, OLD.meta, { daily }), settings: OLD.settings, stats: OLD.stats }); await reloadGame(t);
      await t.game('scene', 'daily');
      const txt = await t.page.locator('#sheet').textContent();
      t.expect(txt.includes('Streak: 3 days · best 3 · full baths (all seven): 1'), 'streak line: ' + txt.slice(txt.indexOf('Streak')));
      t.expect(await t.page.locator('.cal i.f').count() >= 1, 'a full day gets a star cell'); t.expect(await t.page.locator('.cal i.t').count() <= 1, 'today is outlined once');
      t.expect(await t.page.locator('.cal i.w, .cal i.f').count() >= 1, 'won days are marked');
      const full = await t.page.locator('.cal i.f small').first().textContent(); t.equal(full, '★', 'the star');
      await t.page.evaluate(() => { const s = document.getElementById('sheet'); s.scrollTop = s.scrollHeight; });
      await shot(t, 'S3-04', 'calendar');
      const before = await t.page.locator('.cm b').textContent();
      await t.page.locator('[data-mo]').first().click();
      t.expect((await t.page.locator('.cm b').textContent()) !== before, 'the previous month button moves the calendar');
      await t.page.locator('[data-mo]').last().click();
      t.equal(await t.page.locator('.cm b').textContent(), before, 'and back');
      t.expect(await t.page.locator('[data-mo]').last().isDisabled(), 'the next-month button stops at the current month');
      await t.checkLayout({ allowScrollY: true });
    },
  },
  {
    name: 'w2c S3-04 a streak that ended before yesterday is zero; the best run is kept',
    viewports: ['desktop'],
    async run(t) {
      const daily = {}; for (const n of [5, 6, 7, 8]) daily[(await daysAgo(t, n)) + '|klondike1'] = 'won';
      await put(t, { meta: Object.assign({}, OLD.meta, { daily }), settings: OLD.settings, stats: OLD.stats }); await reloadGame(t);
      await t.game('scene', 'daily');
      const txt = await t.page.locator('#sheet').textContent();
      t.expect(txt.includes('Streak: 0 days · best 4'), 'a gap resets the streak, the best stays: ' + txt.slice(txt.indexOf('Streak'), txt.indexOf('Streak') + 50));
    },
  },
  {
    name: 'w2c S3-04 winning a daily extends the streak, earns the daily achievements, and all seven in a day earn Full Bath',
    viewports: ['desktop'],
    async run(t) {
      const d0 = await daysAgo(t, 0), d1 = await daysAgo(t, 1), d2 = await daysAgo(t, 2);
      const daily = { [d1 + '|klondike1']: 'won', [d2 + '|klondike1']: 'won' }; for (const k of KEYS.slice(1)) daily[d0 + '|' + k] = 'won';
      await put(t, { meta: Object.assign({}, OLD.meta, { daily }), settings: OLD.settings, stats: OLD.stats }); await reloadGame(t);
      await baseSettings(t, { sound: false });
      await t.game('setState', Object.assign(nearWinKlondike(), { daily: d0 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 15000 });
      const m = await meta(t);
      t.equal(m.daily[d0 + '|klondike1'], 'won', 'the win is recorded under today');
      for (const id of ['d1', 'd3', 'd7all']) t.expect(m.ach[id], 'earned ' + id + ': ' + Object.keys(m.ach));
      t.equal(m.dailyBest, 3, 'the best run is stored');
    },
  },
  {
    name: 'w2c S3-04 old daily entries are pruned when the save loads, recent ones stay',
    viewports: ['desktop'],
    async run(t) {
      const old = await daysAgo(t, 500), recent = await daysAgo(t, 300);
      await put(t, { meta: Object.assign({}, OLD.meta, { daily: { [old + '|klondike1']: 'won', [recent + '|klondike1']: 'won' } }), settings: OLD.settings, stats: OLD.stats }); await reloadGame(t);
      const m = await meta(t); t.equal(Object.keys(m.daily), [recent + '|klondike1'], 'only the entry inside 400 days is kept');
    },
  },
  {
    name: 'w2c S2-01 a new player gets the goal, then the move, hint and stock tips, one at a time, each gone when done',
    async run(t) {
      await t.game('newGame', { mode: 'klondike', deal: 5 });
      await waitCoach(t);
      t.equal(await coachText(t), 'Build each suit from Ace to King on the foundations.', 'the goal comes first');
      t.expect(await t.page.locator('#coachSkip').isVisible(), 'a Skip tips control is visible while tips show');
      t.expect((await t.page.locator('#coachSkip').boundingBox()).height >= 44, 'and is a 44 px target');
      t.equal(await t.page.evaluate(() => document.getElementById('sr').textContent), 'Build each suit from Ace to King on the foundations.', 'announced through the live region');
      await shot(t, 'S2-01', 'tip-goal');
      await t.page.click('#coachTx');
      await waitText(t, /send it where it fits/);
      let s = await t.state(); t.equal(s.settings.tipModes, 'klondike', 'the goal is recorded as seen');
      t.expect(/^(Click|Tap) a card to send it where it fits/.test(await coachText(t)), 'then the move tip: ' + await coachText(t));
      t.expect((await coachText(t)).split(/\s+/).length <= 12, 'twelve words or fewer');
      await shot(t, 'S2-01', 'tip-move');
      await move(t);
      await waitText(t, /Hint/);
      t.expect(await t.page.locator('#bHint.pt').count() === 1, 'the Hint button is marked');
      await shot(t, 'S2-01', 'tip-hint');
      await t.game('act', 'hint');
      await waitText(t, /stock/);
      t.equal(await t.page.locator('#bHint.pt').count(), 0, 'the mark is gone');
      await shot(t, 'S2-01', 'tip-stock');
      await t.game('act', 'draw');
      await waitCoach(t, false);
      await t.page.waitForTimeout(1200);
      t.expect(await t.page.evaluate(() => document.getElementById('coach').hidden), 'after the last tip nothing more shows');
      s = await t.state(); t.equal(s.settings.tipStep, 3, 'all three steps are recorded');
      await reloadGame(t); await t.game('newGame', { mode: 'klondike', deal: 6 }); await t.page.waitForTimeout(2300);
      t.expect(await t.page.evaluate(() => document.getElementById('coach').hidden), 'after a reload the tips do not come back');
    },
  },
  {
    name: 'w2c S2-01 doing the thing before its tip appears skips that tip',
    viewports: ['desktop'],
    async run(t) {
      await t.game('newGame', { mode: 'klondike', deal: 5 });
      await waitCoach(t); await t.page.click('#coachTx');
      await move(t);
      await waitText(t, /Hint/);
      t.equal((await t.state()).settings.tipStep, 1, 'the move tip counts as done, the hint tip is next');
    },
  },
  {
    name: 'w2c S2-01 tips wait: the goal fades by itself, Skip tips turns them off for good, Show tips again brings them back',
    viewports: ['desktop'],
    async run(t) {
      await t.game('newGame', { mode: 'freecell', deal: 3 });
      await waitCoach(t);
      t.equal(await coachText(t), 'Move every card to the foundations, Ace up to King.', 'FreeCell has its own goal');
      await t.page.click('#coachSkip');
      t.expect(await t.page.evaluate(() => document.getElementById('coach').hidden), 'Skip hides the tip');
      t.equal((await t.state()).settings.tips, false, 'and turns tips off');
      await t.game('newGame', { mode: 'spider', suits: 1, deal: 4 }); await t.page.waitForTimeout(2300);
      t.expect(await t.page.evaluate(() => document.getElementById('coach').hidden), 'no tip in the next game');
      await reloadGame(t); t.equal((await t.state()).settings.tips, false, 'the choice survives a reload');
      await t.game('scene', 'settings');
      await t.page.click('[data-a="tipsAgain"]'); await t.page.click('#sheet [data-close]');
      t.equal((await t.state()).settings.tips, true, 'Show tips again turns them on');
      await t.game('newGame', { mode: 'spider', suits: 1, deal: 4 }); await waitCoach(t);
      t.equal(await coachText(t), 'Build King-to-Ace runs of one suit; each leaves the table.', 'Spider has its own goal');
      await t.page.waitForTimeout(7200);
      t.expect(/Click a card/.test(await coachText(t)), 'the goal gave way to the next tip by waiting: ' + await coachText(t));
    },
  },
  {
    name: 'w2c S2-01 every tip is twelve words or fewer, and the words follow the input in use',
    viewports: ['desktop'],
    async run(t) {
      const src = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
      const block = src.slice(src.indexOf('const TIP_GOAL'), src.indexOf('function tipHide'));
      const lines = [...block.matchAll(/'([A-Z][^'\n]{10,})'/g)].map((m) => m[1]);
      t.expect(lines.length >= 11, 'found the tip strings: ' + lines.length);
      for (const l of lines) t.expect(l.split(/\s+/).length <= 12, '"' + l + '" is ' + l.split(/\s+/).length + ' words');
      await t.game('newGame', { mode: 'klondike', deal: 5 }); await waitCoach(t);
      await t.page.keyboard.press('ArrowRight'); await t.page.click('#coachTx');
      await waitText(t, /Arrows move/);
    },
  },
  {
    name: 'w2c S2-01 a touch player is told to tap, and reduced motion gets a still marker',
    viewports: ['mobile'],
    reducedMotion: true,
    async run(t) {
      await t.page.touchscreen.tap(5, 5);
      await t.game('newGame', { mode: 'klondike', deal: 5 }); await waitCoach(t);
      await shot(t, 'S2-01', 'tip-goal-touch');
      await t.page.locator('#coachTx').tap();
      await waitText(t, /Tap a card to send it where it fits\./);
      await move(t);
      await waitText(t, /Stuck\? Tap Hint to see a move\./);
      const anim = await t.page.evaluate(() => getComputedStyle(document.getElementById('bHint')).animationName);
      t.equal(anim, 'none', 'no pulsing under reduced motion; the outline is the static marker');
      const box = await t.page.locator('#coach').boundingBox(), vp = t.vp;
      t.expect(box.x >= 0 && box.x + box.width <= vp.width, 'the strip fits the phone width');
      await shot(t, 'S2-01', 'tip-hint-touch');
      await t.checkLayout();
    },
  },
  {
    name: 'w2c S2-01 the tip strip never covers the cards at the first deal, at either size',
    async run(t) {
      await t.game('newGame', { mode: 'klondike', deal: 5 }); await waitCoach(t);
      const c = await t.page.locator('#coach').boundingBox(), lay = await t.game('getLayout');
      let low = 0; for (const id in lay.piles) for (const k of lay.piles[id].cards) low = Math.max(low, k.y + k.h);
      t.expect(c.y >= low - 2, 'the strip (top ' + Math.round(c.y) + ') sits below the lowest card (' + Math.round(low) + ')');
      const bar = await t.page.locator('#tools').boundingBox(); t.expect(c.y + c.height <= bar.y + 1, 'and above the tool bar');
    },
  },
  {
    name: 'w2c S2-01 a player with a save from before this wave is not a newcomer: tips are off until they ask',
    viewports: ['desktop'],
    async run(t) {
      await put(t, OLD); await reloadGame(t);
      t.equal((await t.state()).settings.tips, false, 'tips are off for an existing save');
      await t.game('newGame', { mode: 'klondike' }); await t.page.waitForTimeout(2200);
      t.expect(await t.page.evaluate(() => document.getElementById('coach').hidden), 'no coach strip appears');
      await t.game('scene', 'settings');
      await t.page.click('[data-a="tipsAgain"]'); await t.page.click('#sheet [data-close]');
      await t.game('newGame', { mode: 'klondike' }); await waitCoach(t);
      t.expect(true, 'and Show tips again brings them back');
    },
  },
  {
    name: 'w2c S2-01 saved settings with tip progress round trip, damaged values fall back',
    viewports: ['desktop'],
    async run(t) {
      await put(t, { settings: { sound: false, tips: true, tipStep: 2, tipModes: 'klondike,spider' }, meta: OLD.meta }); await reloadGame(t);
      let s = (await t.state()).settings; t.equal([s.tips, s.tipStep, s.tipModes], [true, 2, 'klondike,spider'], 'progress round trips');
      await put(t, { settings: { sound: false, tips: 'yes', tipStep: 'x', tipModes: 5 } }); await reloadGame(t);
      s = (await t.state()).settings; t.equal([s.tips, s.tipStep, s.tipModes], [false, 0, ''], 'damaged values fall back (the save is an old one, so tips are off)');
    },
  },
];
