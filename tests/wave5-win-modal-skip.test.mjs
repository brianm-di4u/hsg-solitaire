// Wave 5 Batch W5-B04: Single Win modal & clean ceremony/Finish teardown across Ticket click, Enter/Space, canvas press, Escape & calm non-win modal (W5-M1)
import { baseSettings, nearWinKlondike } from './_util.mjs';

const P = 'spa-solitaire:v1:';
const run = (s) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].map((r) => r + s);

function full52Klondike() {
  return {
    mode: 'klondike', opts: { draw: 1 },
    piles: {
      stock: [], waste: [], f0: [], f1: [], f2: [], f3: [],
      t0: run('C').reverse(), t1: run('D').reverse(), t2: run('H').reverse(), t3: run('S').reverse(),
      t4: [], t5: [], t6: [],
    },
  };
}

async function seedFirstWinWithPB(t) {
  await t.page.evaluate((p) => {
    const KL = { played: 3, won: 2, streak: 2, bestStreak: 2, bestTimeMs: 600000, fewestMoves: 500, bestScore: 100, bestStandardScore: 100, bestTimedScore: 0, totalMs: 600000, assistedWon: 0, recent: '' };
    localStorage.setItem(p + 'stats', JSON.stringify({ klondike1: KL }));
    localStorage.setItem(p + 'meta', JSON.stringify({ lastMode: 'klondike', lastOpts: { draw: 1, suits: 1 }, totalWins: 2, daily: {}, unlock: { ids: [] }, ach: {}, seenDeals: [], wonDeals: [], seenFacts: [], gradeWins: { easy: 0, medium: 0, hard: 0 } }));
  }, P);
  await t.page.reload();
  await t.page.waitForFunction(() => !!window.__game, null, { timeout: 10000 });
}

async function installWinSheetCounter(t) {
  await t.page.evaluate(() => {
    window.__winOpens = 0;
    if (window.__winObs) window.__winObs.disconnect();
    const sh = document.getElementById('sheet');
    window.__winObs = new MutationObserver(() => {
      if (sh.querySelector('.ticket')) window.__winOpens++;
    });
    window.__winObs.observe(sh, { childList: true });
  });
}

export const tests = [
  {
    name: 'wave5-m1 Ticket click during ceremony tears down cascade and opens Win sheet & cues exactly once',
    viewports: ['desktop'],
    async run(t) {
      await seedFirstWinWithPB(t);
      await baseSettings(t, { sound: true, music: false, ambience: false, tips: false, motion: 'full', autoFoundation: 'off' });
      await t.page.mouse.click(5, 5);
      await t.page.waitForFunction(() => window.__game.audioState().ready, null, { timeout: 5000 });
      await installWinSheetCounter(t);

      // 1. Click #bAuto (Ticket) during full-FX ceremony
      await t.game('setState', nearWinKlondike());
      await t.waitForStable();
      await t.game('cuesPlayed', true);
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().ceremony, null, { timeout: 5000 });
      t.equal(await t.page.evaluate(() => document.getElementById('bAuto').dataset.mode), 'ticket', '#bAuto shows Ticket while ceremony runs');

      await t.page.click('#bAuto');
      const rightAfter = await t.page.evaluate(() => ({
        st: window.__game.getState(),
        eco: window.__game.runtimeEconomy(),
        hush: window.__game.audioState().hush,
        opens: window.__winOpens,
      }));
      t.equal(rightAfter.st.modal, 'win', 'Ticket click opens Win modal');
      t.equal(rightAfter.st.ceremony, false, 'Ticket click immediately tears down running cascade');
      t.equal(rightAfter.eco.echoes, 0, 'Ticket click clears ceremony echoes');
      t.equal(rightAfter.hush, true, 'openModal(win) keeps musicHush active for its 1.8 s release timer');
      t.equal(rightAfter.opens, 1, 'Win sheet built once on Ticket click');

      // Wait for musicHush release (1.8 s) — covers all win cues (punch 650 ms, ach 900 ms, milestone 1500 ms)
      await t.page.waitForFunction(() => !window.__game.audioState().hush, null, { timeout: 5000 });
      const afterWait = await t.page.evaluate(() => {
        const cues = window.__game.cuesPlayed();
        const cnt = (n) => cues.filter((c) => c.name === n).length;
        return {
          opens: window.__winOpens,
          ceremony: window.__game.getState().ceremony,
          punch: cnt('punch'), ach: cnt('ach'), best: cnt('best'), streak: cnt('streak'), course: cnt('course'),
        };
      });
      t.equal(afterWait.opens, 1, `Win sheet never double-opened after Ticket click (got ${afterWait.opens})`);
      t.equal(afterWait.ceremony, false, 'cascade stayed torn down');
      t.equal(afterWait.punch, 1, `punch cue fired once (got ${afterWait.punch})`);
      t.expect(afterWait.ach <= 1 && afterWait.best <= 1 && afterWait.streak <= 1 && afterWait.course <= 1, `each win cue fired at most once: ${JSON.stringify(afterWait)}`);

      // 2. Direct openModal('win') via scene('win') during active cascade also tears down cleanly
      await t.game('scene', 'game');
      await t.game('setState', nearWinKlondike());
      await t.waitForStable();
      await t.page.evaluate(() => { window.__winOpens = 0; });
      await t.game('cuesPlayed', true);
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().ceremony, null, { timeout: 5000 });
      await t.game('scene', 'win');
      const directState = await t.page.evaluate(() => ({
        ceremony: window.__game.getState().ceremony,
        modal: window.__game.getState().modal,
        echoes: window.__game.runtimeEconomy().echoes,
        hush: window.__game.audioState().hush,
      }));
      t.equal([directState.ceremony, directState.modal, directState.echoes, directState.hush], [false, 'win', 0, true], 'direct openModal(win) tears down cascade, clears echoes, and keeps musicHush');
      await t.page.waitForFunction(() => !window.__game.audioState().hush, null, { timeout: 5000 });
      t.equal(await t.page.evaluate(() => window.__winOpens), 1, 'direct openModal(win) opens Win sheet exactly once');
    },
  },
  {
    name: 'wave5-m1 Enter/Space on focused Ticket, Ticket click, canvas press, Escape during Finish and ceremony, plus calm non-win modal clear',
    viewports: ['desktop'],
    initScript: () => {
      window.__apRamps = [];
      const lr = AudioParam.prototype.linearRampToValueAtTime;
      AudioParam.prototype.linearRampToValueAtTime = function (value, endTime) {
        window.__apRamps.push({ value, endTime, dur: endTime - (window.__acNow ? window.__acNow() : 0) });
        return lr.apply(this, arguments);
      };
      const OrigAC = window.AudioContext || window.webkitAudioContext;
      if (OrigAC) {
        const Wrap = function (...a) { const ac = new OrigAC(...a); window.__acNow = () => ac.currentTime; return ac; };
        Wrap.prototype = OrigAC.prototype;
        window.AudioContext = Wrap;
      }
    },
    async run(t) {
      await baseSettings(t, { sound: true, music: false, ambience: false, tips: false, motion: 'full', autoFoundation: 'off' });
      await t.page.mouse.click(5, 5);
      await t.page.waitForFunction(() => window.__game.audioState().ready, null, { timeout: 5000 });
      await installWinSheetCounter(t);

      // A. Enter on focused #bAuto starts Finish, then Space skips Finish (1st press) and Enter opens Win sheet once (2nd press)
      await t.game('setState', full52Klondike());
      await t.waitForStable();
      await t.page.evaluate(() => { window.__winOpens = 0; window.__apRamps.length = 0; });
      await t.game('cuesPlayed', true);
      await t.page.focus('#bAuto');
      await t.page.keyboard.press('Enter');
      const afterStart = await t.page.evaluate(() => ({
        st: window.__game.getState(),
        ae: document.activeElement && document.activeElement.id,
        mode: document.getElementById('bAuto').dataset.mode,
      }));
      t.equal([afterStart.st.finishing, afterStart.ae, afterStart.mode], [true, 'bAuto', 'ticket'], 'keyboard Finish leaves focus on #bAuto (Ticket)');

      await t.page.keyboard.press(' ');
      const afterFirstSkip = await t.page.evaluate(() => ({
        st: window.__game.getState(),
        ramps: window.__apRamps.slice(),
      }));
      t.equal([afterFirstSkip.st.finishing, afterFirstSkip.st.modal], [false, null], '1st Space on focused Ticket skips Finish without prematurely opening Win modal');
      t.expect(afterFirstSkip.ramps.some((r) => r.value <= 0.001 && r.dur <= 0.05), '1st Space cancels Finish autoCueBus');

      await t.page.keyboard.press('Enter');
      const afterSecondPress = await t.state();
      t.equal([afterSecondPress.modal, afterSecondPress.ceremony, afterSecondPress.finishing], ['win', false, false], '2nd Enter on focused Ticket opens Win modal immediately');
      // Bounded negative check (ruling #2): 250 ms skip winTimer must stay cancelled (wait 400 ms)
      await t.page.waitForTimeout(400);
      t.equal(await t.page.evaluate(() => ({ opens: window.__winOpens, cer: window.__game.getState().ceremony })), { opens: 1, cer: false }, 'Win sheet stayed single after keyboard Finish skip');

      // B. Enter on focused #bAuto during ceremony (after 1st skip led into ceremony) opens Win sheet once
      await t.game('setState', full52Klondike());
      await t.waitForStable();
      await t.page.evaluate(() => { window.__winOpens = 0; });
      await t.page.focus('#bAuto');
      await t.page.keyboard.press('Enter'); // start Finish
      await t.page.keyboard.press('Enter'); // skip Finish -> starts ceremony in 250 ms
      await t.page.waitForFunction(() => window.__game.getState().ceremony, null, { timeout: 5000 });
      t.equal(await t.page.evaluate(() => document.activeElement && document.activeElement.id), 'bAuto', '#bAuto still focused when ceremony begins');
      await t.page.keyboard.press('Enter'); // skip ceremony via focused Ticket
      const afterCerEnter = await t.state();
      t.equal([afterCerEnter.modal, afterCerEnter.ceremony], ['win', false], 'Enter on focused Ticket during ceremony tears down cascade and opens Win modal');
      await t.page.waitForFunction(() => !window.__game.audioState().hush, null, { timeout: 5000 });
      t.equal(await t.page.evaluate(() => window.__winOpens), 1, 'Win sheet opened exactly once for Enter on focused Ticket during ceremony');

      // C. Ticket click, canvas press, and Escape during Finish AND during ceremony
      for (const trigger of ['ticket', 'canvas', 'escape']) {
        await t.game('setState', full52Klondike());
        await t.waitForStable();
        await t.page.evaluate(() => { window.__winOpens = 0; window.__apRamps.length = 0; });
        await t.game('act', 'autoComplete');
        t.equal((await t.state()).finishing, true, `${trigger}: Finish running`);

        const fire = async () => {
          if (trigger === 'ticket') await t.page.click('#bAuto');
          else if (trigger === 'canvas') await t.page.mouse.click(200, 200);
          else await t.page.keyboard.press('Escape');
        };
        await fire(); // 1st press skips Finish
        const s1 = await t.state();
        t.equal([s1.finishing, s1.modal], [false, null], `${trigger} during Finish: 1st press skips Finish`);
        await t.page.waitForFunction(() => window.__game.getState().ceremony, null, { timeout: 5000 });
        await fire(); // press during ceremony opens Win sheet once
        const s2 = await t.state();
        t.equal([s2.ceremony, s2.modal], [false, 'win'], `${trigger} during ceremony: ends ceremony and opens Win modal`);
        await t.page.waitForFunction(() => !window.__game.audioState().hush, null, { timeout: 5000 });
        t.equal(await t.page.evaluate(() => window.__winOpens), 1, `${trigger}: Win sheet opened exactly once`);
      }

      // D. Opening a non-win modal over reduced-motion calm ceremony clears the dimmed emblem from #cv
      await t.game('setSettings', { motion: 'reduced', sound: false });
      await t.game('setState', nearWinKlondike());
      await t.waitForStable();
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().ceremony, null, { timeout: 5000 });
      const calmDimAlpha = await t.page.evaluate(() => {
        const cv = document.getElementById('cv');
        const g = cv.getContext('2d');
        // Sample bottom-center margin (below placeholders) where calm ceremony paints its >=0.50 alpha radial dim overlay
        const d = g.getImageData(Math.round(cv.width / 2) - 20, cv.height - 24, 40, 16).data;
        let sum = 0, n = 0;
        for (let i = 3; i < d.length; i += 4) { sum += d[i]; n++; }
        return Math.round(sum / n);
      });
      t.expect(calmDimAlpha >= 80, `calm ceremony dim overlay visibly painted on #cv before Menu (mean alpha ${calmDimAlpha})`);
      await t.game('scene', 'menu');
      await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const afterCalmMenu = await t.page.evaluate(() => {
        const cv = document.getElementById('cv');
        const g = cv.getContext('2d');
        const d = g.getImageData(Math.round(cv.width / 2) - 20, cv.height - 24, 40, 16).data;
        let sum = 0, n = 0;
        for (let i = 3; i < d.length; i += 4) { sum += d[i]; n++; }
        return { meanAlpha: Math.round(sum / n), st: window.__game.getState() };
      });
      t.equal([afterCalmMenu.st.modal, afterCalmMenu.st.ceremony], ['menu', false], 'Menu opened cleanly over calm ceremony');
      t.equal(afterCalmMenu.meanAlpha, 0, `opening non-win modal over calm ceremony repaints #cv and clears frozen dim/emblem (got mean alpha ${afterCalmMenu.meanAlpha})`);
    },
  },
];
