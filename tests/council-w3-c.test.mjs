// Council wave 3, batch C: feedback, teaching and help.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, nearWinKlondike } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.HS_ARTIFACT_DIR ? path.resolve(process.env.HS_ARTIFACT_DIR, 'wave-3', 'shots') : path.resolve(HERE, '..', 'screenshots', 'council-waves', 'wave-3', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };
const KEY = 'spa-solitaire:v1:settings';
const toastText = (t) => t.page.evaluate(() => document.getElementById('toast').textContent);
const clearToast = (t) => t.page.evaluate(() => { document.getElementById('toast').textContent = ''; });

export const tests = [
  {
    name: 'w3c S2-05 the assisted tag appears after a Hint or Undo and tapping it says what it means',
    async run(t) {
      await baseSettings(t);
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      t.expect(await t.page.locator('#assistTag').isHidden(), 'no tag on a fresh deal');
      await t.page.click('#bHint');
      await t.page.waitForFunction(() => !document.getElementById('assistTag').hidden);
      t.expect(!(await t.page.locator('#modeSub').textContent()).includes('assisted'), 'the sub-label stays about the deal');
      const box = await t.page.locator('#assistTag').boundingBox();
      t.expect(box && box.height >= 12 && box.width >= 40, 'the tag is a real control');
      await clearToast(t);
      await shot(t, 'S2-05', 'tag');
      await t.page.click('#assistTag');
      await t.page.waitForFunction(() => /Undo or Hint was used/.test(document.getElementById('toast').textContent));
      t.equal(await toastText(t), 'Undo or Hint was used. Wins still count, flagged as assisted.', 'a tap explains it');
      await shot(t, 'S2-05', 'toast');
      await t.checkLayout();
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      t.expect(await t.page.locator('#assistTag').isHidden(), 'a new deal starts clean');
    },
  },
  {
    name: 'w3c S2-08 the first card to go home by itself is explained once, and a save from before does not get it',
    async run(t) {
      await baseSettings(t, { autoFoundation: 'safe', autoNoted: false });
      const deal = async () => {
        await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: ['#2C', '#AC'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
        await clearToast(t);
        await t.game('act', 'draw');
        await t.page.waitForFunction(() => window.__game.getState().piles.f0.length > 0);
      };
      await deal();
      await t.page.waitForFunction(() => document.getElementById('toast').textContent.length > 0);
      t.equal(await toastText(t), 'Moved the ace of clubs up. Turn this off in Settings.', 'it names the card and the setting');
      fs.mkdirSync(SHOTS, { recursive: true }); await t.page.screenshot({ path: path.join(SHOTS, 'S2-08-toast-' + t.viewport + '.png') }); // now: a dead-end warning may replace the toast a moment later
      t.equal((await t.state()).settings.autoNoted, true, 'and remembers it has said so');
      await deal();
      t.equal(await toastText(t), '', 'the second time is silent');
      await t.reload();
      t.equal((await t.state()).settings.autoNoted, true, 'saved across a reload');
      // a save written before this change belongs to someone who has played: no toast for them
      await t.page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); delete s.autoNoted; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
      await t.reload();
      t.equal((await t.state()).settings.autoNoted, true, 'an old save counts as told');
      // with auto-move off nothing moves by itself, so nothing is said
      await t.game('setSettings', { autoFoundation: 'off', autoNoted: false });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: ['#AC'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      await clearToast(t); await t.game('act', 'draw'); await t.waitIdle();
      t.equal([await toastText(t), (await t.state()).settings.autoNoted], ['', false], 'Off: no move, no toast, nothing marked');
    },
  },
  {
    name: 'w3c S2-09 a ? button sits in the header and How to play is second in the menu',
    async run(t) {
      await baseSettings(t);
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      const b = await t.page.locator('#bHelp').boundingBox();
      t.expect(b && b.width >= 34 && b.height >= 34, 'the help button is a full-size control: ' + JSON.stringify(b));
      const geo = await t.page.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const h = r('#bHelp'), st = r('#status'), ttl = r('#ttl'), m = r('#bMenu'); return { helpRight: h.right, vw: innerWidth, statusRight: st.right, helpLeft: h.left, ttlRight: ttl.right, statusLeft: st.left, menuRight: m.right, ttlLeft: ttl.left }; });
      t.expect(geo.helpRight <= geo.vw && geo.statusRight <= geo.helpLeft + 1 && geo.ttlRight <= geo.statusLeft + 1 && geo.menuRight <= geo.ttlLeft + 1, 'the header does not overlap: ' + JSON.stringify(geo));
      const clip = await t.page.evaluate(() => { const n = document.querySelector('#modeName'); return n.scrollWidth - n.clientWidth; });
      t.expect(clip <= 1, 'the game name is not cut short by the new button: ' + clip + ' px over');
      await shot(t, 'S2-09', 'header');
      await t.page.click('#bHelp');
      t.equal((await t.state()).modal, 'help', 'a press opens How to play');
      await t.page.keyboard.press('Escape');
      await t.game('scene', 'game');
      await t.page.click('#bMenu');
      const order = await t.page.evaluate(() => [...document.querySelectorAll('#sheet .menu .btn')].map((x) => x.dataset.a));
      t.equal(order.slice(0, 3), ['resume', 'help', 'new'], 'Resume, then How to play');
      t.equal(order.length, 11, 'nothing was dropped from the menu');
      await shot(t, 'S2-09', 'menu');
      await t.page.click('#sheet [data-a="help"]');
      t.equal((await t.state()).modal, 'help', 'the menu entry still opens help');
      await t.checkLayout();
    },
  },
  {
    name: 'w3c S3-07 the Score cell shows the speed bonus a win would add, only when there is one',
    async run(t) {
      await baseSettings(t, { scoring: 'timed', showTimer: true });
      await t.game('setState', Object.assign(nearWinKlondike(), { deal: 311, moves: 30 }));
      await t.page.waitForFunction(() => !document.getElementById('sBonus').hidden);
      const shown = await t.page.evaluate(() => document.getElementById('sBonus').textContent);
      const n = +shown.replace('+', '');
      t.expect(/^\+\d+$/.test(shown) && n <= 1000 && n >= 900, 'a number up to 1000 (' + shown + ')');
      await shot(t, 'S3-07', 'bonus');
      await t.checkLayout();
      const before = n;
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.getState().scene === 'win', null, { timeout: 20000 });
      const ticket = await t.page.locator('#sheet').textContent();
      const got = +(/time bonus \+(\d+)/.exec(ticket) || [0, -1])[1];
      t.expect(got <= before && got >= before - 30, 'the ticket pays about what the header showed (' + before + ' then ' + got + ')');
      await t.game('scene', 'game');
      t.expect(await t.page.locator('#sBonus').isHidden(), 'a finished game shows no bonus');
      for (const o of [{ scoring: 'standard' }, { scoring: 'none' }, { scoring: 'timed', showTimer: false }]) {
        await t.game('setSettings', Object.assign({ scoring: 'timed', showTimer: true }, o));
        await t.game('setState', Object.assign(nearWinKlondike(), { deal: 312 }));
        t.expect(await t.page.locator('#sBonus').isHidden(), 'no bonus for ' + JSON.stringify(o));
      }
      await t.game('setSettings', { scoring: 'timed', showTimer: true });
      await t.game('newGame', { mode: 'spider', suits: 1 });
      t.expect(await t.page.locator('#sBonus').isHidden(), 'Spider has no speed bonus, so none is shown');
    },
  },
  {
    name: 'w3c S4-03 the win sheet, the dead end, the toasts and the plaques speak in the spa attendant\'s voice',
    async run(t) {
      await baseSettings(t);
      await t.game('scene', 'title');
      const subs = await t.page.evaluate(() => [...document.querySelectorAll('.tile .tsub')].map((e) => e.textContent));
      t.equal(subs.length, 4, 'every plaque has its own line');
      t.expect(new Set(subs).size === 4 && subs.every((x) => x.length > 8 && x.length < 45), 'four different short lines: ' + subs.join(' | '));
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      await t.game('scene', 'stuck');
      t.equal(await t.page.locator('#sheet h2').textContent(), 'The waters have gone still', 'the dead-end title');
      await shot(t, 'S4-03', 'stuck');
      await t.game('scene', 'win');
      t.equal(await t.page.locator('#sheet h2').textContent(), 'Your bath is drawn', 'the win title');
      await t.game('scene', 'game');
      await t.game('setState', { mode: 'spider', opts: { suits: 1 }, piles: { stock: ['#AC'], t0: [], t1: ['5H', '5H'], t2: ['5H', '5H'], t3: ['5H'], t4: ['5H'], t5: ['5H'], t6: ['5H'], t7: ['5H'], t8: ['5H'], t9: [] } });
      await t.game('act', 'draw');
      t.equal(await toastText(t), 'Every column needs a card before the next row', 'the Spider toast');
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: ['#AC'], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      await t.game('act', 'hint');
      t.equal(await toastText(t), 'Hint: the stock has something for you', 'the stock hint');
    },
  },
  {
    name: 'w3c S4-03 the line under the title changes each time the title comes up, the first being the plain description',
    async run(t) {
      await baseSettings(t);
      await t.reload();
      const first = await t.page.locator('#tTag').textContent();
      t.expect(/four classic games, twelve Hot Springs card backs/.test(first), 'the first line says what the game is');
      const seen = [first];
      for (let i = 0; i < 3; i++) { await t.game('scene', 'game'); await t.game('scene', 'title'); seen.push(await t.page.locator('#tTag').textContent()); }
      t.equal(new Set(seen).size, 4, 'four visits, four lines: ' + seen.join(' | '));
      await t.game('scene', 'game'); await t.game('scene', 'title');
      t.equal(await t.page.locator('#tTag').textContent(), first, 'and it comes round again');
      await shot(t, 'S4-03', 'title');
      await t.checkLayout();
    },
  },
  {
    name: 'w3c S4-22 help and the code no longer claim a trivia bank or style guide that is not in the repo',
    async run(t) {
      await baseSettings(t);
      await t.game('scene', 'help');
      const txt = await t.page.evaluate(() => document.querySelector('#sheet').textContent);
      t.expect(!/sourced trivia bank/.test(txt), 'the old claim is gone');
      t.expect(/50 hand-picked items, each with its source named on the card/.test(txt), 'the facts are described as they are');
      const root = path.resolve(HERE, '..');
      t.expect(!fs.existsSync(path.join(root, 'research', 'trivia-bank.json')) && !fs.existsSync(path.join(root, 'research', 'visual-style-guide.md')), 'those files really are not here');
      const doc = fs.readFileSync(path.join(root, 'research', 'town-content.md'), 'utf8');
      t.expect(/painted images in `assets\/`/.test(doc) && /six tables/.test(doc) && /not in this repo/.test(doc), 'town-content.md says what shipped');
      const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      t.expect(!/subset of research\/trivia-bank\.json/.test(src), 'the source comment no longer points at it');
    },
  },
  {
    name: 'w3c S4-04 S4-05 the title painting wears a brass frame and name tags where the picture shows them',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.reload();
      await t.page.waitForFunction(() => window.__game.heroTags().drawn, null, { timeout: 15000 });
      const info = await t.page.evaluate(() => {
        const c = document.getElementById('sky'), k = c.width / c.clientWidth, W = c.clientWidth, H = c.clientHeight;
        const m = Math.min(Math.max(Math.min(W, H) * .014, 6), 12), g = c.getContext('2d');
        const px = (x, y) => Array.from(g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data);
        let best = 0; // the frame line is 2 px wide: look across it for the most brass-coloured pixel
        for (let dx = -2; dx <= 2; dx++) { const [r, gr, b] = px(m + dx, H * .5); best = Math.max(best, Math.min(r - b, gr - b)); }
        const h1 = document.getElementById('tH').getBoundingClientRect();
        return { W, H, best, tags: window.__game.heroTags().tags, h1: { top: h1.top, bottom: h1.bottom } };
      });
      t.expect(info.best > 60, 'a brass line runs inside the edge of the picture (colour spread ' + info.best + ')');
      if (t.viewport === 'desktop') {
        t.equal(info.tags.map((x) => x.text), ['CENTRAL AVENUE · BATHHOUSE ROW'], 'the road name is on the picture (the hotel tag was dropped by the owner, C4-05)');
        t.expect(info.tags.every((x) => x.x >= 0 && x.x + x.w <= info.W && x.y + x.h < info.h1.top), 'and sit clear of the title: ' + JSON.stringify(info.tags));
      } else {
        t.equal(info.tags, [], 'a phone crops the picture to the right of the hotel: no tags are drawn on empty ground');
      }
      await shot(t, 'S4-04', 'title');
      await t.checkLayout();
    },
  },
];
