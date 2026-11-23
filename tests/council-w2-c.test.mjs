// Council wave 2, batch C: unlocks and achievements (S3-03), daily streak and calendar (S3-04), first-run tips (S2-01).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, clickCard, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.HS_ARTIFACT_DIR ? path.resolve(process.env.HS_ARTIFACT_DIR, 'wave-2', 'shots') : path.resolve(HERE, '..', 'screenshots', 'council-waves', 'wave-2', 'shots');
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
    name: 'w2c S3-03 Day-1 Starter Suite opens 4 backs and Felt/Marble at Win 0, caps unlocks at 21 wins, and shows full stories in 2-tab Backs & Tables',
    async run(t) {
      let m = await meta(t);
      t.equal(m.unlock.ids, [], 'a fresh profile has zero earned unlocks yet');
      await t.game('scene', 'backs');
      t.equal(await t.page.locator('#bpanel-backs .bk.lk[data-back]').count(), 8, 'eight earnable backs locked (4 starter backs open at Win 0)');
      for (const id of ['skylight', 'lozenge', 'ironwork', 'pines']) {
        t.equal(await t.page.locator('#bpanel-backs .bk:not(.lk)[data-back="' + id + '"]').count(), 1, 'starter back ' + id + ' is open at Win 0');
      }
      t.equal(await t.page.locator('#bpanel-tables').isHidden(), true, 'Parlor Tables tabpanel starts hidden (2-tab lazy gallery)');
      await t.page.click('#btab-tables');
      t.equal(await t.page.locator('#bpanel-tables .bk.lk[data-table]').count(), 4, 'four earnable tables locked (Felt & Marble open at Win 0)');
      for (const id of ['felt', 'marble']) {
        t.equal(await t.page.locator('#bpanel-tables .bk:not(.lk)[data-table="' + id + '"]').count(), 1, 'starter table ' + id + ' is open at Win 0');
      }
      t.expect(/Win 21/.test(await t.page.locator('[data-table="linen"] small').textContent()), 'final prestige table caps at 21 wins');
      await t.page.click('#btab-backs');
      const note = await t.page.locator('[data-back="paterae"] small').textContent();
      t.equal(note, 'Win 1 game', 'the first lock says what opens it');
      t.expect(/Win 18/.test(await t.page.locator('[data-back="neon"] small').textContent()), 'Neon Night caps <= 21 wins with a mastery fast-track');
      t.equal(await t.page.locator('[data-back="paterae"]').getAttribute('aria-disabled'), 'true', 'a locked back is marked disabled for screen readers');
      // Locked previews preserve muted full color (never grayscale(1)) + corner brass lock badge
      const lkStyle = await t.page.evaluate(() => ({
        filter: getComputedStyle(document.querySelector('[data-back="paterae"] canvas')).filter,
        hasBadge: !!document.querySelector('[data-back="paterae"] .bk-lock'),
      }));
      t.expect(!lkStyle.filter.includes('grayscale') && lkStyle.hasBadge, 'locked preview uses muted color + corner brass lock badge: ' + JSON.stringify(lkStyle));
      await t.page.locator('[data-back="paterae"]').click({ force: true });
      t.equal((await t.state()).settings.back, 'skylight', 'tapping a locked back does not select it');
      const bkCap = await t.page.locator('#bkCap').textContent();
      t.expect(bkCap.includes('Superior Bathhouse') && bkCap.includes('Win 1 game to unlock'), 'locked caption preserves the Hot Springs story AND unlock condition: ' + bkCap);
      await t.game('setSettings', { back: 'neon', table: 'linen' });
      let s = (await t.state()).settings; t.equal([s.back, s.table], ['skylight', 'felt'], 'a locked choice is refused by the settings too');
      await t.game('setSettings', { back: 'lozenge', table: 'marble' });
      s = (await t.state()).settings; t.equal([s.back, s.table], ['lozenge', 'marble'], 'Day-1 starter back & Marble table equip cleanly at Win 0');
      await t.game('setSettings', { back: 'skylight', table: 'felt' });
      await shot(t, 'S3-03', 'locked-backs');
      await t.checkLayout();
    },
  },
  {
    name: 'w2c S3-03 the first win opens Superior Medallions with inline Equip now chip, lists what was earned, and survives a reload',
    async run(t) {
      await baseSettings(t, { sound: false });
      await winNow(t);
      const m = await meta(t);
      t.equal(m.unlock.ids, ['b:paterae'], 'one win opens the Superior Medallions back');
      const txt = await t.page.locator('#sheet .earn').textContent();
      t.expect(txt.includes('Unlocked: Superior Medallions back'), 'the ticket says so: ' + txt);
      const eqBtn = t.page.locator('#sheet [data-equip="b:paterae"]');
      t.equal(await eqBtn.textContent(), 'Equip now', 'Win ticket shows inline Equip now chip');
      await eqBtn.click();
      t.equal((await t.state()).settings.back, 'paterae', 'inline Equip now equips unlocked back live');
      t.equal(await eqBtn.textContent(), 'Equipped ✓', 'Equip now flips to Equipped ✓ in place');
      // W6-S1-02: win card condenses >3 simultaneous achievements to top 3 non-redundant headlines + '+N more' while meta.ach stores all 6
      for (const n of ['First Soak', 'Parlor Game', 'Steam Rush']) t.expect(txt.includes(n), 'headline achievement ' + n + ' shown on ticket');
      t.expect(txt.includes('+3 more') && !txt.includes('Quick Dip') && !txt.includes('Steady Hand'), 'ticket condenses 6 simultaneous achievements without crowding nested tiers: ' + txt);
      t.expect(!txt.includes('New personal best'), 'a first win is not a "new" best');
      await shot(t, 'S3-03', 'win-earned');
      t.equal(Object.keys(m.ach).sort(), ['alone', 'first', 'klon', 'quick', 'rush', 'steady'], 'six achievements recorded with a date');
      await reloadGame(t);
      const m2 = await meta(t); t.equal(m2.unlock.ids, ['b:paterae'], 'the unlock record survives a reload'); t.equal(Object.keys(m2.ach).length, 6, 'so do the achievements');
      t.equal((await t.state()).settings.back, 'paterae', 'equipped unlocked back survives reload');
      await t.game('scene', 'backs');
      t.equal(await t.page.locator('#bpanel-backs .bk.lk[data-back]').count(), 7, 'seven backs still locked');
      await t.page.locator('[data-back="quapaw"]').click({ force: true });
      const qCap = await t.page.locator('#bkCap').textContent();
      t.expect(qCap.includes('Win 2 games (1 so far)') && qCap.includes('win FreeCell'), 'the next lock shows live progress and dual mastery fast-track: ' + qCap);
    },
  },
  {
    name: 'w2c S3-03 a save from before this wave opens everything and loses nothing',
    async run(t) {
      await put(t, OLD); await reloadGame(t);
      const m = await meta(t), s = (await t.state()).settings;
      t.equal(m.unlock.ids.length, 12, 'all 12 earnable unlocks (+ 6 starters = all 12 backs & 6 tables) are open'); t.equal([s.back, s.table], ['neon', 'linen'], 'the chosen back and table are kept');
      t.equal([s.sound, s.volume], [false, 0.4], 'settings are kept');
      t.equal((await t.game('stats')).klondike1.won, 3, 'records are untouched'); t.equal(m.totalWins, 3, 'wins are untouched');
      await t.game('scene', 'backs');
      t.equal(await t.page.locator('.bk.lk').count(), 0, 'nothing shows as locked on Card Backs or Parlor Tables');
      await reloadGame(t);
      t.equal((await meta(t)).unlock.ids.length, 12, 'the record survives a reload');
    },
  },
  {
    name: 'w2c S3-03 a damaged unlock record on an old save opens everything; a hand-edited locked choice falls back',
    async run(t) {
      await put(t, Object.assign({}, OLD, { meta: Object.assign({}, OLD.meta, { unlock: 'oops', ach: 7 }) })); await reloadGame(t);
      let m = await meta(t); t.equal(m.unlock.ids.length, 12, 'a damaged record on an old save opens all 12 earnable unlocks'); t.equal(m.ach, {}, 'a damaged achievement record is empty');
      await put(t, { meta: Object.assign({}, OLD.meta, { unlock: { ids: ['b:paterae', 'b:nonsense'] } }), settings: { sound: false, back: 'neon', table: 'linen', tips: false } }); await reloadGame(t);
      m = await meta(t); const s = (await t.state()).settings;
      t.equal(m.unlock.ids, ['b:paterae'], 'unknown ids are dropped'); t.equal([s.back, s.table], ['skylight', 'felt'], 'a setting that points at locked content falls back to the default');
      await t.game('newGame', { mode: 'klondike' }); t.equal((await t.state()).scene, 'game', 'and the game runs');
    },
  },
  {
    name: 'w2c S3-03 the achievement list is specific, unique and checked against the records (21-win cap earns Fully Furnished ACH[w40])',
    viewports: ['desktop'],
    async run(t) {
      await put(t, { stats: { klondike3: { played: 9, won: 8, streak: 3, bestStreak: 7, bestTimeMs: 100000, fewestMoves: 80, bestScore: 1, totalMs: 1 }, spider2: { played: 2, won: 1, streak: 1, bestStreak: 1, bestTimeMs: 1, fewestMoves: 1, bestScore: 1, totalMs: 1 } },
        meta: { totalWins: 20, daily: {}, unlock: { ids: [] } }, settings: { sound: false, tips: false } });
      await reloadGame(t);
      await baseSettings(t, { sound: false }); await winNow(t); // 21st win — Full Course!
      const m = await meta(t), got = Object.keys(m.ach);
      for (const id of ['first', 'klon', 'draw3', 'spid', 'spid2', 'st3', 'st7', 'w10', 'w21', 'w40']) t.expect(got.includes(id), 'earned ' + id + ' at 21 wins (OQ-WF1-02, OQ-WF6-02): ' + got);
      for (const id of ['spid4', 'free', 'yuk', 'w50', 'w100', 'd1', 'd7all', 'run']) t.expect(!got.includes(id), 'did not earn ' + id);
      t.equal(m.unlock.ids.length, 12, 'the 21st win opens all 12 earnable cosmetics (all 12 backs & 6 tables): ' + m.unlock.ids);
      await t.game('scene', 'records');
      await t.page.click('#ltab-ach');
      const body = await t.page.locator('#lpanel-ach').textContent();
      t.expect(body.includes('Achievements: ' + got.length + ' of 24'), 'Bathhouse Ledger Achievements counts them: 24 in all');
      const names = await t.page.locator('#lpanel-ach .ach li b').allTextContents(); t.equal(new Set(names).size, names.length, 'names are unique');
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
      await t.page.click('#tLedger');
      t.equal((await t.state()).scene, 'ledger', 'Bathhouse Ledger reachable from the title');
      const txt = await t.page.locator('#sheet').textContent();
      t.expect(txt.includes('Won 3 of 5 · streak 1 (best 2)'), 'per-game record: ' + txt.slice(0, 200));
      t.expect(txt.includes('Best 4:00 · 90 moves · score 1500'), 'bests'); t.expect(txt.includes('Baths won: 3'), 'total wins');
      t.equal(await t.page.locator('.rec').count(), 7, 'all seven game variants');
      await shot(t, 'S3-03', 'records');
      await t.page.click('#ltab-ach');
      await shot(t, 'S3-03', 'records-achievements');
      await t.checkLayout({ allowScrollY: true });
      await t.page.keyboard.press('Escape');
      await t.game('newGame', { mode: 'klondike' }); await t.game('scene', 'menu');
      t.expect(await t.page.locator('[data-a="ledger"]').count() === 1, 'and from the pause card');
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
      t.expect(await t.page.locator('.cal button.f').count() >= 1, 'a full day gets a star button cell'); t.expect(await t.page.locator('.cal button.t').count() <= 1, 'today is outlined once');
      t.expect(await t.page.locator('.cal button.w, .cal button.f').count() >= 1, 'won days are marked');
      const full = await t.page.locator('.cal button.f small').first().textContent(); t.equal(full, '★', 'the star');
      const fullBg = await t.page.evaluate(() => getComputedStyle(document.querySelector('.cal button.f')).backgroundColor);
      t.equal(fullBg, 'rgb(217, 178, 86)', 'Full Bath calendar cell renders solid brushed gold (#D9B256)');
      // Past dates are clickable <button> cells that load that date's deals in place; future dates are disabled 'Upcoming'
      const pastBtn = t.page.locator('.cal button[data-day="' + d1 + '"]');
      if (await pastBtn.count()) {
        await pastBtn.click();
        t.expect((await t.page.locator('#dailyDayWrap').textContent()).includes('Archive deals for ' + d1), 'clicking a past calendar date loads its archive deals in place');
        await t.page.click('#dailyTodayBtn');
        t.expect((await t.page.locator('#dailyDayWrap').textContent()).includes('today (' + d0 + ')'), 'Back to today restores today');
      }
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
    name: 'w2c S2-01 a new player gets goal, move (dismissed by real tap), and stock tips with no Move-1 Hint trap, plus passive idle Hint awareness',
    async run(t) {
      await t.game('newGame', { mode: 'klondike', deal: 5 });
      await waitCoach(t);
      t.equal(await coachText(t), 'Build each suit from Ace to King on the foundations.', 'the goal comes first');
      t.expect(await t.page.locator('#coachOk').isVisible(), 'a Got it button is visible');
      t.expect(await t.page.locator('#coachSkip').isVisible(), 'a Skip tips control is visible while tips show');
      t.expect((await t.page.locator('#coachOk').boundingBox()).height >= 44, 'Got it is a 44 px target');
      t.expect((await t.page.locator('#coachSkip').boundingBox()).height >= 44, 'Skip tips is a 44 px target');
      t.equal(await t.page.evaluate(() => document.getElementById('sr').textContent), 'Build each suit from Ace to King on the foundations.', 'announced through the live region');
      await shot(t, 'S2-01', 'tip-goal');
      await t.page.click('#coachOk');
      await waitText(t, /send it where it fits/);
      let s = await t.state(); t.equal(s.settings.tipModes, 'klondike', 'the goal is recorded as seen');
      t.expect(/^(Click|Tap) a card to send it where it fits/.test(await coachText(t)), 'then the move tip: ' + await coachText(t));
      t.expect((await coachText(t)).split(/\s+/).length <= 12, 'twelve words or fewer');
      await shot(t, 'S2-01', 'tip-move');
      // Real pointer tap on a playable card (covering tapAt() -> why === 'tap') must dismiss the move tip and advance to stock (never pulsing Hint!)
      const m = (await t.game('legalMoves')).find((x) => x.to && x.from !== 'stock' && (x.count || 1) === 1);
      t.expect(!!m, 'a single-card playable move exists on deal 5');
      const pilesBefore = (await t.state()).piles;
      await clickCard(t, m.from, pilesBefore[m.from].length - 1);
      await waitText(t, /stock/);
      t.equal(await t.page.locator('#bHint.pt').count(), 0, 'Hint button never pulses after Move 1 (CD-WF2-06)');
      t.equal(await t.page.locator('#assistTag').isHidden(), true, 'clean Move 1 never stamps assisted');
      await shot(t, 'S2-01', 'tip-stock');
      // Capture the >=25 s idle timer when stock completes so we can verify passive non-pulsing idle Hint awareness without sleeping 25 s
      await t.page.evaluate(() => {
        window.__idleTips = [];
        const orig = window.setTimeout.bind(window);
        window.setTimeout = (fn, ms, ...rest) => {
          if (ms >= 25000) window.__idleTips.push({ fn, ms });
          return orig(fn, ms, ...rest);
        };
      });
      await t.game('act', 'draw');
      await waitCoach(t, false);
      await t.page.waitForTimeout(1100);
      t.expect(await t.page.evaluate(() => document.getElementById('coach').hidden), 'after stock tip, no immediate Hint nag shows');
      s = await t.state(); t.equal(s.settings.tipStep, 2, 'both core independent steps (move, stock) are recorded');
      // Trigger the captured >= 25 s idle reminder
      const idleMeta = await t.page.evaluate(() => {
        const list = window.__idleTips || [];
        if (!list.length) return { count: 0 };
        const last = list[list.length - 1];
        last.fn();
        return {
          count: list.length,
          ms: last.ms,
          hidden: document.getElementById('coach').hidden,
          text: document.getElementById('coachTx').textContent,
          pulsing: document.getElementById('bHint').classList.contains('pt'),
        };
      });
      t.expect(idleMeta.count >= 1 && idleMeta.ms >= 25000, 'idle Hint reminder is scheduled at >= 25 s: ' + JSON.stringify(idleMeta));
      t.equal([idleMeta.hidden, idleMeta.pulsing], [false, false], 'idle Hint reminder appears passively without #bHint.pt pulse');
      t.expect(/Hint/.test(idleMeta.text) && /Undo/.test(idleMeta.text), 'idle reminder mentions Hint and Undo: ' + idleMeta.text);
      // Pressing Hint during the idle reminder STILL marks S.assisted (zero guided-hint loophole per CD-WF2-06 / CD-WF1-04)
      await t.game('act', 'hint');
      t.equal(await t.page.locator('#assistTag').isHidden(), false, 'Hint during idle reminder still stamps assisted (CD-WF2-06)');
      await reloadGame(t); await t.game('newGame', { mode: 'klondike', deal: 6 }); await t.page.waitForTimeout(2300);
      t.expect(await t.page.evaluate(() => document.getElementById('coach').hidden), 'after a reload the core tips do not come back');
    },
  },
  {
    name: 'w2c S2-01 doing the thing before its tip appears skips that tip (move -> stock)',
    viewports: ['desktop'],
    async run(t) {
      await t.game('newGame', { mode: 'klondike', deal: 5 });
      await waitCoach(t); await t.page.click('#coachOk');
      await move(t);
      await waitText(t, /stock/);
      t.equal((await t.state()).settings.tipStep, 1, 'the move tip counts as done, the stock tip is next');
      t.equal(await t.page.locator('#bHint.pt').count(), 0, 'no Hint pulse');
    },
  },
  {
    name: 'w2c S2-01 FreeCell/Yukon goals teach core verbs, passive fade does not burn unread tips, modals/setState hide tips, and Skip/Show again work',
    viewports: ['desktop'],
    async run(t) {
      await t.game('newGame', { mode: 'freecell', deal: 3 });
      await waitCoach(t);
      const fcGoal = await coachText(t);
      t.expect(/four free cells/i.test(fcGoal) && fcGoal.split(/\s+/).length <= 12, 'FreeCell goal teaches the four free cells in <=12 words: ' + fcGoal);
      // Opening Settings must immediately hide #coach and prevent leaking behind modal
      await t.game('scene', 'settings');
      t.equal(await t.page.evaluate(() => document.getElementById('coach').hidden), true, 'opening a modal hides #coach cleanly');
      await t.page.click('#sheet [data-close]');
      await waitCoach(t);
      // Switch to Yukon and verify Yukon goal teaches lift-any-face-up-stack rule in <= 12 words
      await t.game('newGame', { mode: 'yukon', deal: 3 });
      await waitCoach(t);
      const ykGoal = await coachText(t);
      t.expect(/lift any face-up card/i.test(ykGoal) && ykGoal.split(/\s+/).length <= 12, 'Yukon goal teaches lift-any-face-up-stack in <=12 words: ' + ykGoal);
      // Calling setState across modes must immediately hide #coach and cancel pending timers (no Spider tip stranding on Klondike!)
      await t.game('newGame', { mode: 'spider', suits: 1, deal: 4 });
      await waitCoach(t);
      t.equal(await coachText(t), 'Build King-to-Ace runs of one suit; each leaves the table.', 'Spider has its own goal');
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: ['#2C'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['9H'], t1: ['TS'], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      t.equal(await t.page.evaluate(() => document.getElementById('coach').hidden), true, 'setState hides #coach immediately across modes');
      await t.page.waitForTimeout(1600);
      t.equal(await t.page.evaluate(() => document.getElementById('coach').hidden), true, 'no stale delayed tip leaks after setState');
      // Passive fade hides #coach visually WITHOUT permanently burning the unread goal tip
      await t.game('newGame', { mode: 'spider', suits: 1, deal: 4 });
      await waitCoach(t);
      await waitCoach(t, false);
      const afterFade = await t.state();
      t.expect(!afterFade.settings.tipModes.split(',').includes('spider'), 'passive fade does not permanently burn unread Spider goal tip');
      // Skip tips turns tips off for good; Show tips again brings them back
      await t.game('newGame', { mode: 'freecell', deal: 3 });
      await waitCoach(t);
      await t.page.click('#coachSkip');
      t.expect(await t.page.evaluate(() => document.getElementById('coach').hidden), 'Skip hides the tip');
      t.equal((await t.state()).settings.tips, false, 'and turns tips off');
      await t.game('newGame', { mode: 'spider', suits: 1, deal: 4 }); await t.page.waitForTimeout(2000);
      t.expect(await t.page.evaluate(() => document.getElementById('coach').hidden), 'no tip in the next game');
      await reloadGame(t); t.equal((await t.state()).settings.tips, false, 'the choice survives a reload');
      await t.game('scene', 'settings');
      await t.page.click('[data-a="tipsAgain"]'); await t.page.click('#sheet [data-close]');
      t.equal((await t.state()).settings.tips, true, 'Show tips again turns them on');
      await t.game('newGame', { mode: 'spider', suits: 1, deal: 4 }); await waitCoach(t);
      t.equal(await coachText(t), 'Build King-to-Ace runs of one suit; each leaves the table.', 'Spider goal re-appears after Show tips again');
      await t.page.click('#coachOk');
      await waitText(t, /Click a card/);
      t.expect(/Click a card/.test(await coachText(t)), 'acknowledging Got it advances cleanly to move tip: ' + await coachText(t));
    },
  },
  {
    name: 'w2c S2-01 every tip is twelve words or fewer, and the words follow the input in use',
    viewports: ['desktop'],
    async run(t) {
      const lines = await t.game('tipsCatalog');
      t.expect(lines.length >= 11, 'found the tip strings via window.__game.tipsCatalog(): ' + lines.length);
      for (const l of lines) t.expect(l.split(/\s+/).length <= 12, '"' + l + '" is ' + l.split(/\s+/).length + ' words');
      await t.game('newGame', { mode: 'klondike', deal: 5 }); await waitCoach(t);
      await t.page.keyboard.press('ArrowRight'); await t.page.click('#coachOk');
      await waitText(t, /Arrows move/);
    },
  },
  {
    name: 'w2c S2-01 a touch player is told to tap, real touch tap dismisses move tip, and #coach buttons never clip on mobile',
    viewports: ['mobile'],
    reducedMotion: true,
    async run(t) {
      await t.page.touchscreen.tap(5, 5);
      await t.game('newGame', { mode: 'klondike', deal: 5 }); await waitCoach(t);
      await shot(t, 'S2-01', 'tip-goal-touch');
      const gBoxes = await t.page.evaluate(() => {
        const c = document.getElementById('coach').getBoundingClientRect();
        const ok = document.getElementById('coachOk').getBoundingClientRect();
        const sk = document.getElementById('coachSkip').getBoundingClientRect();
        return { c, ok, sk, vw: innerWidth };
      });
      t.expect(gBoxes.c.left >= 0 && gBoxes.c.right <= gBoxes.vw + 1, 'coach pill fits phone width');
      t.expect(gBoxes.ok.right <= gBoxes.c.right + 1 && gBoxes.sk.right <= gBoxes.c.right + 1, 'Got it and Skip tips never clip past #coach border');
      t.expect(gBoxes.ok.height >= 44 && gBoxes.sk.height >= 44, 'both #coach buttons meet 44 px touch floor');
      await t.page.locator('#coachOk').tap();
      await waitText(t, /Tap a card to send it where it fits\./);
      // Real touch tap on a playable card must dismiss the move tip via tapAt() -> why === 'tap'
      const m = (await t.game('legalMoves')).find((x) => x.to && x.from !== 'stock' && (x.count || 1) === 1);
      const lay = await t.game('getLayout'), cards = lay.piles[m.from].cards, c = cards[cards.length - 1];
      await t.page.touchscreen.tap(c.x + c.w / 2, c.y + 10);
      await waitText(t, /Tap the stock pile for more cards\./);
      t.equal(await t.page.locator('#bHint.pt').count(), 0, 'no Hint button pulse on mobile');
      await shot(t, 'S2-01', 'tip-stock-touch');
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
  {
    name: 'w2c W1-S3-05 Daily Deals shows unified X of 7 won Full Bath progress header and Attempted eligibility note without asymmetric badges',
    async run(t) {
      const d0 = await daysAgo(t, 0), d1 = await daysAgo(t, 1);
      const daily = { [d0 + '|klondike1']: 'won', [d0 + '|freecell']: 'won', [d0 + '|yukon']: 'played' };
      for (const k of KEYS) daily[d1 + '|' + k] = 'won-archive';
      await put(t, { meta: Object.assign({}, OLD.meta, { daily }), settings: OLD.settings, stats: OLD.stats }); await reloadGame(t);
      await t.game('scene', 'daily');

      const prog = t.page.locator('#dailyProg');
      t.equal(await prog.count(), 1, 'Daily Deals renders #dailyProg progress header');
      const noteLoc = t.page.locator('#dailyDayWrap .daily-note');
      t.equal(await noteLoc.count(), 1, 'Daily Deals renders .daily-note Attempted eligibility note');
      if (await prog.count()) {
        t.equal((await prog.textContent()).trim(), '2 of 7 won · Full Bath ★', 'today shows 2 of 7 won · Full Bath ★ header');
        t.equal(await prog.evaluate((el) => el.classList.contains('full')), false, 'partial day does not mark Full Bath header full');
      }
      if (await noteLoc.count()) {
        const note = (await noteLoc.textContent()).trim();
        t.expect(/Attempted/.test(note) && /seal/i.test(note) && /21-bath ticket/i.test(note), 'Attempted retry eligibility note explains seal and 21-bath ticket punch: ' + note);
      }

      const tileTexts = await t.page.locator('#dailyDayWrap .btn.day').allTextContents();
      t.equal(tileTexts.length, 7, 'all seven Daily tiles render');
      t.equal(tileTexts.every((tx) => !/\b(Easy|Medium|Hard)\b/i.test(tx)), true, 'tiles omit asymmetric difficulty badges (CD-WF1-05): ' + JSON.stringify(tileTexts));

      await t.shot('w2c-W1-S3-05-daily-today', { fullPage: false });
      await t.checkLayout({ allowScrollY: true });

      let pastBtn = t.page.locator('#calW button[data-day="' + d1 + '"]');
      if (!(await pastBtn.count())) {
        await t.page.locator('[data-mo]').first().click();
        pastBtn = t.page.locator('#calW button[data-day="' + d1 + '"]');
      }
      await pastBtn.click();
      t.equal(await prog.count(), 1, '7/7 archive day keeps #dailyProg progress header');
      if (await prog.count()) {
        t.equal((await prog.textContent()).trim(), '7 of 7 won · Full Bath ★ earned', '7/7 archive day updates progress header to Full Bath ★ earned');
        t.equal(await prog.evaluate((el) => el.classList.contains('full')), true, '7/7 day highlights Full Bath progress pill in gold');
        t.equal(await prog.evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(217, 178, 86)', 'Full Bath header uses brushed gold (#D9B256)');
      }
      if (t.viewport === 'desktop') await t.shot('w2c-W1-S3-05-daily-full', { fullPage: false });
      await t.page.click('#dailyTodayBtn');
      if (await prog.count()) t.equal((await prog.textContent()).trim(), '2 of 7 won · Full Bath ★', 'Back to today restores today progress count');
    },
  },
  {
    name: 'w2c W1-P-N04 Quick Dip and Steam Rush require unaided first-try wins and state unaided in Ledger descriptions',
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, scoring: 'standard' });
      const winFast = async (patch, prep) => {
        await t.game('setState', Object.assign(nearWinKlondike(), patch));
        if (prep) await prep();
        await t.game('act', 'move', 't0', 'f3');
        await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 15000 });
        return meta(t);
      };

      // 1. Fast Hint-assisted win must NOT earn Quick Dip, Steam Rush, or Own Two Hands (blocks solver-hint speedruns)
      let m = await winFast({ deal: 811 }, async () => {
        await t.game('act', 'hint');
      });
      t.expect(!!m.ach.first && !!m.ach.klon && !!m.ach.steady, 'Hint-assisted win still awards completion and Steady Hand');
      t.expect(!m.ach.quick && !m.ach.rush && !m.ach.alone, 'Hint-assisted <1s win blocks quick, rush, and alone: ' + JSON.stringify(Object.keys(m.ach)));

      // 2. Fast Undo-assisted win must NOT earn Quick Dip or Steam Rush
      m = await winFast({ deal: 812 }, async () => {
        await t.game('act', 'move', 't0', 't1');
        await t.game('act', 'undo');
      });
      t.expect(!m.ach.quick && !m.ach.rush && !m.ach.alone, 'Undo-assisted <1s win blocks quick, rush, and alone: ' + JSON.stringify(Object.keys(m.ach)));

      // 3. Retried fast win (no Undo/Hint) must NOT earn Quick Dip or Steam Rush (P-F03 / CD-WF1-06)
      m = await winFast({ deal: 813, replay: true });
      t.expect(!m.ach.quick && !m.ach.rush && !m.ach.alone, 'Retried <1s win blocks quick, rush, and alone: ' + JSON.stringify(Object.keys(m.ach)));

      // 4. Clean unaided first-try fast win earns Quick Dip, Steam Rush, and Own Two Hands
      m = await winFast({ deal: 814 });
      t.expect(!!m.ach.quick && !!m.ach.rush && !!m.ach.alone, 'Clean unaided <1s win earns quick, rush, and alone: ' + JSON.stringify(Object.keys(m.ach)));

      // 5. Ledger Achievements tab renders updated unaided descriptions cleanly
      await t.game('scene', 'records');
      await t.page.click('#ltab-ach');
      const achText = await t.page.locator('#lpanel-ach').textContent();
      t.expect(achText.includes('Quick Dip') && achText.includes('Win an unaided game in under five minutes.'), 'Quick Dip description states unaided win: ' + achText);
      t.expect(achText.includes('Steam Rush') && achText.includes('Win an unaided game in under three minutes.'), 'Steam Rush description states unaided win: ' + achText);
      if (t.viewport === 'desktop') await t.shot('w2c-W1-P-N04-ach-ledger', { fullPage: false });
      await t.checkLayout({ allowScrollY: true });

      // 6. Existing saves with previously earned quick/rush preserve them across reload
      await put(t, { meta: Object.assign({}, OLD.meta, { ach: { quick: '2026-10-01', rush: '2026-10-01' } }) });
      await reloadGame(t);
      const preserved = await meta(t);
      t.equal([preserved.ach.quick, preserved.ach.rush], ['2026-10-01', '2026-10-01'], 'Existing saves preserve previously earned quick and rush achievements');
    },
  },
  {
    name: 'w2c W6-S5-03 #toast and #coach mutually defer without double-banner stacking, and dockNotices uses live #notices height',
    async run(t) {
      // 1. Fresh opening deal: auto-foundation toast fires while opening goal tip is visible.
      // Place Ace of Hearts on top of stock on an opening-like board (with face-down cards so dead-end solver stays idle)
      // so drawing triggers the exact first-time auto-foundation toast while #coach is open.
      await t.game('setSettings', { sound: false, motion: 'reduced', tips: true, tipStep: 0, tipModes: '', autoFoundation: 'safe', autoNoted: false });
      await t.game('newGame', { mode: 'klondike', deal: 5 });
      await waitCoach(t, true);
      t.equal(await coachText(t), 'Build each suit from Ace to King on the foundations.', 'opening goal tip is visible before auto-foundation');

      await t.game('setState', {
        mode: 'klondike',
        opts: { draw: 1 },
        piles: {
          stock: ['#2C', '#AH'],
          waste: [],
          f0: [], f1: [], f2: [], f3: [],
          t0: ['KD'], t1: ['QS'], t2: ['#3C', '#4C', '#5C', 'JC'], t3: ['#3D', '#4D', '#5D', 'TH'],
          t4: ['#3S', '#4S', '#5S', '9S'], t5: ['#3H', '#4H', '#5H', '8D'], t6: ['#6H', '#7H', '7C'],
        },
      });
      await t.game('scene', 'settings');
      await t.page.click('#sheet [data-close]');
      await waitCoach(t, true);
      t.equal(await coachText(t), 'Build each suit from Ace to King on the foundations.', 'goal tip appears cleanly after modal close');

      // Drawing Ace of Hearts triggers first-time auto-foundation toast while #coach is open.
      await t.game('act', 'draw');
      await t.page.waitForFunction(() => document.getElementById('toast').classList.contains('on'), null, { timeout: 4000 });
      const duringToast = await t.page.evaluate(() => ({
        toastOn: document.getElementById('toast').classList.contains('on'),
        toastText: document.getElementById('toast').textContent,
        coachHidden: document.getElementById('coach').hidden,
        noticesH: Math.round(document.getElementById('notices').getBoundingClientRect().height),
      }));
      t.expect(duringToast.toastOn && /ace of hearts/i.test(duringToast.toastText), 'first-time auto-foundation toast shows: ' + duringToast.toastText);
      t.equal(duringToast.coachHidden, true, '#coach is paused while #toast.on is active (no double-banner stacking): ' + JSON.stringify(duringToast));
      await t.shot('W6-S5-03-toast-defers-coach', { fullPage: false });

      // Dismissing #toast cleanly resumes the unburned opening goal tip after toast clears.
      await t.page.click('#toast');
      await waitCoach(t, true);
      const afterToast = await t.page.evaluate(() => ({
        toastOn: document.getElementById('toast').classList.contains('on'),
        coachHidden: document.getElementById('coach').hidden,
        coachText: document.getElementById('coachTx').textContent,
      }));
      t.equal(afterToast.toastOn, false, '#toast is dismissed');
      t.equal(afterToast.coachHidden, false, 'deferred opening goal tip resumes cleanly once #toast clears');
      t.equal(afterToast.coachText, 'Build each suit from Ace to King on the foundations.', 'paused goal tip was not burned');

      // 2. Reverse order: while #toast.on is already visible, a scheduled tipShow() (Move 1 -> stock tip at 700 ms) must stay deferred until #toast clears.
      await t.game('setSettings', { autoNoted: false });
      await t.game('setState', {
        mode: 'klondike',
        opts: { draw: 1 },
        piles: {
          stock: ['#2H'],
          waste: [],
          f0: [], f1: [], f2: [], f3: [],
          t0: ['AH', '6C'], t1: ['7D'], t2: ['#3C', '#4C', '#5C', 'JC'], t3: ['#3D', '#4D', '#5D', 'TH'],
          t4: ['#3S', '#4S', '#5S', '9S'], t5: ['#3H', '#4H', '#5H', '8D'], t6: ['#6H', '#7H', 'KD'],
        },
      });
      await t.game('scene', 'settings');
      await t.page.click('#sheet [data-close]');
      await waitCoach(t, true);
      // Real move of 6C -> 7D marks goal+move done (scheduling stock tip at 700 ms) AND exposes AH which auto-plays with a ~4.8 s toast.
      await t.game('act', 'move', 't0', 't1');
      await t.page.waitForFunction(() => document.getElementById('toast').classList.contains('on'), null, { timeout: 4000 });
      await t.page.waitForTimeout(850); // bounded did-not-fire check past the 700 ms tipSchedule delay
      const duringScheduled = await t.page.evaluate(() => ({
        toastOn: document.getElementById('toast').classList.contains('on'),
        coachHidden: document.getElementById('coach').hidden,
      }));
      t.equal(duringScheduled, { toastOn: true, coachHidden: true }, 'scheduled stock tip stays deferred while #toast.on is visible');
      await t.page.click('#toast');
      await waitText(t, /stock/i);
      t.equal(await t.page.evaluate(() => document.getElementById('toast').classList.contains('on')), false, 'stock tip appears only after #toast clears');

      // 3. Dynamic dockNotices() height check: a tall central column extending into the live #notices height band (above hardcoded H - 74) shifts #notices horizontally away from it.
      if (t.viewport === 'desktop') {
        const deck = ['KS', 'QD', 'JC', 'TH', '9S', '8D', '7C', '6H', '5S', '4D', '3C', '2H', 'AS'];
        let docked = null;
        for (let k = 6; k <= deck.length; k++) {
          await t.game('setSettings', { tips: true, tipStep: 0, tipModes: '' });
          await t.game('setState', {
            mode: 'klondike',
            opts: { draw: 1 },
            piles: { stock: ['#AC'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: deck.slice(0, k), t4: [], t5: [], t6: [] },
          });
          await t.game('scene', 'settings');
          await t.page.click('#sheet [data-close]');
          await waitCoach(t, true);
          const probe = await t.page.evaluate(() => {
            const n = document.getElementById('notices');
            const stage = document.getElementById('stage');
            const H = stage.clientHeight, W = stage.clientWidth;
            const t3 = window.__game.getLayout().piles.t3;
            const last = t3.cards[t3.cards.length - 1];
            const colBot = Math.round(last.y + last.h - stage.getBoundingClientRect().top);
            const bandOld = Math.round(H - 74);
            const bandDyn = Math.round(H - (n.offsetHeight + 24));
            return { W, H, colBot, noticesH: n.offsetHeight, leftStyle: n.style.left, bandOld, bandDyn };
          });
          if (probe.colBot < probe.bandOld && probe.colBot > probe.bandDyn) { docked = probe; break; }
        }
        t.expect(!!docked, 'found a center column height strictly between dynamic bandY and old hardcoded H-74');
        if (docked) {
          t.expect(!!docked.leftStyle && Math.abs(parseFloat(docked.leftStyle) - docked.W / 2) > 40, 'dockNotices() shifts #notices clear of center column using live noticesEl.offsetHeight: ' + JSON.stringify(docked));
        }
      }
    },
  },
  {
    name: 'w2c W6-S1-02 Win #1 suppresses BEST badges, removes duplicate Score from .ticket .grid, and condenses >3 achievements while Win #2 stamps genuine PBs',
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, scoring: 'standard' });
      // 1. Fresh Win #1 (moves: 60 -> final moves 61, card 10 + effBonus(61)=450 -> 460)
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 921, moves: 60 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 15000 });

      const lw1 = await t.game('lastWin');
      t.equal([lw1.pb, lw1.best.time, lw1.best.moves, lw1.best.score], [false, false, false, false], 'Win #1 with no prior record gates pb and all best flags to false');
      const st1 = (await t.game('stats')).klondike1;
      t.expect(st1.bestTimeMs > 0 && st1.fewestMoves === 61 && st1.bestStandardScore === 460, 'Win #1 still saves baseline records in stats: ' + JSON.stringify({ bestTimeMs: st1.bestTimeMs, fewestMoves: st1.fewestMoves, bestStandardScore: st1.bestStandardScore }));

      const tk1 = await t.page.evaluate(() => ({
        bestCount: document.querySelectorAll('#sheet .ticket .best').length,
        bigText: document.querySelector('#sheet .ticket .big').textContent.trim(),
        gridCols: [...document.querySelectorAll('#sheet .ticket .grid > div')].map((d) => d.firstChild.textContent.trim()),
        achBold: [...document.querySelectorAll('#sheet .earn-ach b')].map((b) => b.textContent),
        achMore: document.querySelector('#sheet .earn-ach .ach-more')?.textContent || '',
        achTitle: document.querySelector('#sheet .earn-ach')?.getAttribute('title') || '',
      }));
      t.equal(tk1.bestCount, 0, 'Win #1 Bath Ticket stamps zero BEST badges');
      t.equal(tk1.bigText, '460', 'Win #1 focal .big shows score');
      t.equal(tk1.gridCols, ['Time', 'Moves'], '.ticket .grid keeps only Time and Moves without duplicating Score');
      t.equal(tk1.achBold, ['First Soak', 'Parlor Game', 'Steam Rush'], 'Win #1 condenses 6 achievements to 3 non-redundant headlines');
      t.equal(tk1.achMore, '+3 more', 'Win #1 shows +3 more counter');
      t.expect(tk1.achTitle.includes('Quick Dip') && tk1.achTitle.includes('Own Two Hands'), 'full list preserved in title tooltip: ' + tk1.achTitle);
      await t.shot('w2c-W6-S1-02-win1', { fullPage: false });
      await t.checkLayout({ allowScrollY: true });

      // 2. Win #2 beating prior moves (10 < 61) and score (score 500 + 10 + 450 = 960 > 460)
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 922, moves: 10, score: 500 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 15000 });

      const lw2 = await t.game('lastWin');
      t.equal([lw2.pb, lw2.best.moves, lw2.best.score], [true, true, true], 'Win #2 beating prior records sets pb, best.moves, and best.score');
      const tk2 = await t.page.evaluate(() => ({
        bigBest: document.querySelectorAll('#sheet .ticket .big .best').length,
        gridBest: document.querySelectorAll('#sheet .ticket .grid .best').length,
        gridCols: [...document.querySelectorAll('#sheet .ticket .grid > div')].map((d) => d.firstChild.textContent.trim()),
        pbText: document.querySelector('#sheet .earn .pb')?.textContent || '',
      }));
      t.equal(tk2.bigBest, 1, 'Win #2 stamps BEST beside focal .big score');
      t.expect(tk2.gridBest >= 1, 'Win #2 stamps BEST in .ticket .grid for beaten moves/time');
      t.equal(tk2.gridCols, ['Time', 'Moves'], 'Win #2 .ticket .grid keeps 2 columns');
      t.equal(tk2.pbText, 'New personal best', 'Win #2 announces New personal best');
      await t.shot('w2c-W6-S1-02-win2-pb', { fullPage: false });
      await t.checkLayout({ allowScrollY: true });

      // 3. <=3 simultaneous achievements render in full without +N more
      await t.game('scene', 'win', { ach: ['Cooling Room', 'Two Springs'], best: {}, totalWins: 3 });
      const tk3 = await t.page.evaluate(() => ({
        achBold: [...document.querySelectorAll('#sheet .earn-ach b')].map((b) => b.textContent),
        achMore: document.querySelectorAll('#sheet .earn-ach .ach-more').length,
      }));
      t.equal([tk3.achBold, tk3.achMore], [['Cooling Room', 'Two Springs'], 0], '<=3 achievements render in full without +N more');
    },
  },
  {
    name: 'w2c W6-S2-01 Bath Ticket weaves active Bathhouse Row stop inline and shows next-unlock breadcrumb only on non-unlock wins',
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, scoring: 'standard' });
      // Seed 2 wins already earned (b:paterae + b:quapaw open) so Win #3 is a non-unlock win (next unlock: t:quapaw at Win 4 or Spider)
      await put(t, {
        meta: { lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 2, daily: {}, unlock: { ids: ['b:paterae', 'b:quapaw'] }, ach: { first: '2026-11-20', klon: '2026-11-20' } },
        stats: { klondike1: { played: 2, won: 2, assistedWon: 0, streak: 2, bestStreak: 2, bestTimeMs: 30000, fewestMoves: 40, bestScore: 900, bestStandardScore: 900, bestTimedScore: 0, totalMs: 60000, recent: 'WW' } },
      });
      await reloadGame(t);
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false, scoring: 'standard' });

      // 1. Real non-unlock Win #3 -> Bath 3 (Superior) inline + concise next-unlock note
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 931, moves: 90 }));
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 15000 });
      const win3 = await t.page.evaluate(() => {
        const metas = [...document.querySelectorAll('#sheet .ticket .meta')].map((x) => x.textContent.trim());
        const nextEl = document.querySelector('#sheet .earn-next');
        const unlEl = document.querySelector('#sheet .earn-u');
        const tk = document.querySelector('#sheet .ticket');
        const lastMeta = document.querySelectorAll('#sheet .ticket .meta')[1];
        return {
          courseCap: metas[1] || '',
          nextText: nextEl ? nextEl.textContent.trim() : '',
          hasUnlockBanner: !!unlEl,
          fitsInTicket: !!(tk && lastMeta && lastMeta.getBoundingClientRect().bottom <= tk.getBoundingClientRect().bottom + 1),
          milestoneTitles: [...document.querySelectorAll('#sheet .course i.m')].map((i) => i.title),
        };
      });
      t.equal(win3.courseCap, 'Course of 21 baths: 3 of 21 · Superior', 'Win #3 weaves active stop name inline in course caption');
      t.equal(win3.hasUnlockBanner, false, 'Win #3 is a non-unlock win');
      t.expect(win3.nextText.includes('Next unlock: Quapaw Mosaic table') && win3.nextText.includes('in 1 win') && win3.nextText.includes('win Spider'), 'non-unlock win shows concise next-unlock breadcrumb: ' + win3.nextText);
      t.equal(win3.fitsInTicket, true, 'inline stop name keeps course caption inside .ticket with zero height overflow');
      t.equal(win3.milestoneTitles, ['Bath 7 · Maurice', 'Bath 14 · Ozark', 'Bath 21 · Lamar'], '7/14/21 milestone rings carry stop names');
      await t.shot('w2c-W6-S2-01-win-non-unlock', { fullPage: false });
      await t.checkLayout({ allowScrollY: true });

      // 2. Active stop names across milestone boundaries + 0-win replay without stop suffix
      for (const [tw, want] of [[1, 'Course of 21 baths: 1 of 21 · Superior'], [7, 'Course of 21 baths: 7 of 21 · Maurice'], [14, 'Course of 21 baths: 14 of 21 · Ozark'], [21, 'Course of 21 baths: 21 of 21 · Lamar'], [0, 'Course of 21 baths: 0 of 21']]) {
        await t.game('scene', 'win', { totalWins: tw, opened: [], openedIds: [], alreadyWon: tw === 0 });
        const cap = await t.page.locator('#sheet .ticket .meta').nth(1).textContent();
        t.equal(cap.trim(), want, 'totalWins=' + tw + ' course caption');
      }

      // 3. Unlock win omits .earn-next so it never crowds Unlocked + Equip now banners
      await t.game('scene', 'win', { totalWins: 4, opened: ['Quapaw Mosaic table'], openedIds: ['t:quapaw'] });
      const winUnlock = await t.page.evaluate(() => ({
        hasUnlock: !!document.querySelector('#sheet .earn-u'),
        hasNext: !!document.querySelector('#sheet .earn-next'),
      }));
      t.equal(winUnlock, { hasUnlock: true, hasNext: false }, 'unlock win hides next-unlock note so Unlocked + Equip now stays uncrowded');

      // 4. Fully unlocked profile omits .earn-next
      await t.game('unlockAll');
      await t.game('scene', 'win', { totalWins: 21, opened: [], openedIds: [] });
      t.equal(await t.page.locator('#sheet .earn-next').count(), 0, 'fully unlocked profile omits next-unlock note');

      // 5. #tRow Title button labels stay untouched (CD-WF6-05)
      await t.game('scene', 'title');
      const rowLabels = await t.page.locator('#tRow button').allTextContents();
      t.expect(rowLabels.every((x) => !/\(0\/21\)|\(4\/12\)|\(0\/7\)/.test(x)), '#tRow Title buttons omit Win-0 counters (CD-WF6-05): ' + JSON.stringify(rowLabels));
    },
  },
  {
    name: 'w2c W6-S2-04 Daily Deals uses wide 2-column desktop layout above the fold, places archive cue above #calW, and scrolls selected date on portrait mobile',
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 1 });
      await t.game('scene', 'daily');
      await t.waitForStable();
      const info = await t.page.evaluate(() => {
        const frame = document.getElementById('sheetFrame');
        const body = document.getElementById('sheetBody');
        const bodyR = body.getBoundingClientRect();
        const cols = document.querySelector('#sheet .daily-cols');
        const dayWrap = document.getElementById('dailyDayWrap').getBoundingClientRect();
        const hist = document.querySelector('#sheet .daily-hist').getBoundingClientRect();
        const cue = document.getElementById('calCue');
        const calW = document.getElementById('calW');
        const todayCell = document.querySelector('#calW .cday.t');
        const calDays = [...document.querySelectorAll('#calW .cday')];
        const lastCell = calDays[calDays.length - 1];
        const archBtn = document.getElementById('dailyArchBtn');
        return {
          isWide: frame.classList.contains('wide'),
          gridDisplay: getComputedStyle(cols).display,
          sideBySide: hist.left >= dayWrap.right - 2,
          cueText: cue ? cue.textContent.trim() : '',
          cueAboveCal: !!(cue && calW && cue.getBoundingClientRect().bottom <= calW.getBoundingClientRect().top + 1),
          todayInFold: !!(todayCell && todayCell.getBoundingClientRect().bottom <= bodyR.bottom + 1 && todayCell.getBoundingClientRect().top >= bodyR.top - 1),
          fullMonthInFold: !!(lastCell && lastCell.getBoundingClientRect().bottom <= bodyR.bottom + 1),
          allDealsInFold: dayWrap.bottom <= bodyR.bottom + 1,
          archBtnVisible: !!(archBtn && getComputedStyle(archBtn).display !== 'none'),
          archBtnH: archBtn ? Math.round(archBtn.getBoundingClientRect().height) : 0,
        };
      });
      t.equal(info.isWide, true, 'Daily modal uses .sheet-frame.wide');
      t.expect(info.cueText.includes('Select any past date to play the 400-day archive'), 'interactive archive cue sits above calendar: ' + info.cueText);
      t.equal(info.cueAboveCal, true, 'archive cue renders directly above #calW');

      if (t.viewport === 'desktop') {
        t.equal([info.gridDisplay, info.sideBySide], ['grid', true], 'desktop Daily Deals renders 2-column side-by-side .daily-cols');
        t.equal([info.allDealsInFold, info.todayInFold, info.fullMonthInFold], [true, true, true], 'desktop Daily Deals fits all 7 deals, today cell, and full month calendar above the fold: ' + JSON.stringify(info));
        t.equal(info.archBtnVisible, false, 'desktop hides narrow-mobile jump button');
        await t.shot('w2c-W6-S2-04-daily-desktop', { fullPage: false });
        await t.checkLayout();
      } else {
        t.equal(info.archBtnVisible, true, 'portrait mobile exposes above-the-fold 400-day archive jump button');
        t.expect(info.archBtnH >= 44, 'portrait mobile 400-day archive jump button meets 44px touch target: ' + info.archBtnH);
        t.equal(await t.page.evaluate(() => document.getElementById('sheetBody').scrollTop), 0, 'initial Daily open on portrait mobile keeps today deals at top');
        await t.shot('w2c-W6-S2-04-daily-mobile-top', { fullPage: false });
        // Clicking the archive jump button scrolls the selected date row into view on portrait mobile
        await t.page.click('#dailyArchBtn');
        const afterJump = await t.page.evaluate(() => {
          const bodyR = document.getElementById('sheetBody').getBoundingClientRect();
          const sel = document.querySelector('#calW .cday.sel');
          const r = sel ? sel.getBoundingClientRect() : null;
          return {
            scrollTop: document.getElementById('sheetBody').scrollTop,
            selInView: !!(r && r.top >= bodyR.top - 1 && r.bottom <= bodyR.bottom + 1),
          };
        });
        t.expect(afterJump.scrollTop > 0 && afterJump.selInView, 'portrait mobile scrolls selected date row into view: ' + JSON.stringify(afterJump));
        await t.shot('w2c-W6-S2-04-daily-mobile-cal', { fullPage: false });
        // Opening an explicit archive date on portrait mobile scrolls the selected date row into view automatically
        const d1 = await daysAgo(t, 1);
        await t.game('scene', 'daily', { day: d1 });
        await t.page.waitForFunction(() => {
          const bodyR = document.getElementById('sheetBody').getBoundingClientRect();
          const sel = document.querySelector('#calW .cday.sel');
          if (!sel) return false;
          const r = sel.getBoundingClientRect();
          return r.top >= bodyR.top - 1 && r.bottom <= bodyR.bottom + 1;
        }, null, { timeout: 5000 });
        await t.checkLayout({ allowScrollY: true });
      }
    },
  },
  {
    name: 'w2c W6-S2-05 Backs & Tables groups unlocked items first with dividers, scopes Skylight Reshuffle to Skylight, and adds mode fast-track quick-launch',
    async run(t) {
      await baseSettings(t, { sound: false, motion: 'reduced', tips: false });
      await t.game('scene', 'backs');
      await t.waitForStable();

      // 1. Unlocked starter backs grouped first ahead of Earnable divider
      const backOrder = await t.page.evaluate(() => ({
        ids: [...document.querySelectorAll('#bkGrid [data-back]')].map((el) => ({ id: el.dataset.back, locked: el.classList.contains('lk') })),
        secs: [...document.querySelectorAll('#bkGrid .bk-sec')].map((el) => el.textContent.trim()),
        reseedHidden: document.querySelector('#bpanel-backs [data-a="reseed"]').hidden,
        launchHidden: document.getElementById('bkLaunch').hidden,
      }));
      t.equal(backOrder.ids.slice(0, 4).map((x) => x.id), ['skylight', 'lozenge', 'ironwork', 'pines'], 'all 4 Win-0 starter backs appear first together');
      t.equal(backOrder.ids.slice(0, 4).every((x) => !x.locked) && backOrder.ids.slice(4).every((x) => x.locked), true, 'all unlocked backs precede all locked backs');
      t.equal(backOrder.secs, ['Unlocked (4)', 'Earnable (8)'], 'Card Backs renders Unlocked / Earnable dividers');
      t.equal([backOrder.reseedHidden, backOrder.launchHidden], [false, true], 'Skylight selected shows Reshuffle and hides quick-launch');
      await t.shot('w2c-W6-S2-05-backs-grouped', { fullPage: false });

      // 2. Switching to another unlocked back hides/disables Reshuffle; focusing Skylight reveals it without switching back
      await t.page.click('[data-back="lozenge"]');
      const onLozenge = await t.page.evaluate(() => {
        const b = document.querySelector('#bpanel-backs [data-a="reseed"]');
        return { back: window.__game.getState().settings.back, hidden: b.hidden, disabled: b.disabled };
      });
      t.equal(onLozenge, { back: 'lozenge', hidden: true, disabled: true }, 'selecting Lozenge hides and disables Skylight Reshuffle');

      await t.page.focus('[data-back="skylight"]');
      const onSkylightFocus = await t.page.evaluate(() => {
        const b = document.querySelector('#bpanel-backs [data-a="reseed"]');
        return { back: window.__game.getState().settings.back, hidden: b.hidden, disabled: b.disabled };
      });
      t.equal(onSkylightFocus, { back: 'lozenge', hidden: false, disabled: false }, 'focusing Skylight reveals Reshuffle while keeping Lozenge equipped');

      // 3. Inspecting locked back with mode fast-track renders contextual quick-launch in .bk-bar; non-fast-track hides it
      await t.page.locator('[data-back="paterae"]').click({ force: true });
      t.equal(await t.page.locator('#bkLaunch').isHidden(), true, 'locked Win-1 back without mode fast-track hides quick-launch');
      await t.page.locator('[data-back="quapaw"]').click({ force: true });
      const quapawBar = await t.page.evaluate(() => ({
        launchHidden: document.getElementById('bkLaunch').hidden,
        launchText: document.getElementById('bkLaunch').textContent.trim(),
        reseedHidden: document.querySelector('#bpanel-backs [data-a="reseed"]').hidden,
      }));
      t.equal(quapawBar, { launchHidden: false, launchText: 'Play FreeCell', reseedHidden: true }, 'inspecting locked Quapaw Dome offers Play FreeCell quick-launch');
      await t.shot('w2c-W6-S2-05-backs-locked-launch', { fullPage: false });

      // 4. Parlor Tables also groups unlocked items first and offers contextual quick-launch on locked tables
      await t.page.click('#btab-tables');
      const tblOrder = await t.page.evaluate(() => ({
        ids: [...document.querySelectorAll('#tblGrid [data-table]')].map((el) => ({ id: el.dataset.table, locked: el.classList.contains('lk') })),
        secs: [...document.querySelectorAll('#tblGrid .bk-sec')].map((el) => el.textContent.trim()),
      }));
      t.equal(tblOrder.ids.slice(0, 2).map((x) => x.id), ['felt', 'marble'], 'Win-0 unlocked tables appear first');
      t.equal(tblOrder.secs, ['Unlocked (2)', 'Earnable (4)'], 'Parlor Tables renders Unlocked / Earnable dividers');
      await t.page.locator('[data-table="quapaw"]').click({ force: true });
      t.equal(await t.page.locator('#tblLaunch').textContent(), 'Play Spider', 'locked Quapaw Mosaic table offers Play Spider quick-launch');
      await t.page.locator('[data-table="pool"]').click({ force: true });
      t.equal(await t.page.locator('#tblLaunch').textContent(), 'Open Daily deals', 'locked Thermal Pool table offers Open Daily deals quick-launch');
      await t.checkLayout({ allowScrollY: true });

      // 5. Clicking Play FreeCell on Quapaw Dome actually launches FreeCell
      await t.page.click('#btab-backs');
      await t.page.locator('[data-back="quapaw"]').click({ force: true });
      await t.page.click('#bkLaunch');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'game' && window.__game.getState().mode === 'freecell', null, { timeout: 10000 });
      t.equal((await t.state()).mode, 'freecell', 'Play FreeCell quick-launch starts a FreeCell game');

      // 6. Fully unlocked profile omits Unlocked/Earnable dividers
      await t.game('unlockAll');
      await t.game('scene', 'backs');
      t.equal(await t.page.locator('#bkGrid .bk-sec').count(), 0, 'fully unlocked profile omits Unlocked/Earnable dividers');
    },
  },
];
