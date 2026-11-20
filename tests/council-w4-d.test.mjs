// Council wave 4, batch D: layout and accessibility; world, words and ceremony.
// S2-11 the status group, C4-02 the art credit, C4-05 the title painting's tags, C4-06 the brewery year, S2-21 a fact on the dead-end dialog,
// S3-09 the recycle penalty and the help that states it, S4-11 place names on the plaques.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.HS_ARTIFACT_DIR ? path.resolve(process.env.HS_ARTIFACT_DIR, 'wave-4', 'shots') : path.resolve(HERE, '..', 'screenshots', 'council-waves', 'wave-4', 'shots');
const shot = async (t, id, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await t.waitForStable(); await t.page.screenshot({ path: path.join(SHOTS, id + '-' + name + '-' + t.viewport + '.png') }); };
const MK = 'spa-solitaire:v1:meta';
// The order of the facts in the page's own list (the game's hooks do not list them)
const FACT_IDS = [...fs.readFileSync(path.resolve(HERE, '..', 'index.html'), 'utf8').split('const FACTS = [')[1].split('\n];')[0].matchAll(/^\s*\["(hs-\d+)"/gm)].map((m) => m[1]);
const DEAD = { mode: 'klondike', piles: { stock: [], waste: [], t0: ['5C'], t1: ['5S'], t2: [], t3: [], t4: [], t5: [], t6: [] } };
const ART = 'Art: painted with AI image tools for this game.';

export const tests = [
  {
    name: 'w4d S2-11 the status cells are one labelled group',
    async run(t) {
      await baseSettings(t, { tips: false });
      await t.game('newGame', { mode: 'klondike', draw: 1 });
      const r = await t.page.evaluate(() => { const e = document.getElementById('status'); return { role: e.getAttribute('role'), label: e.getAttribute('aria-label'), cells: e.querySelectorAll('b').length }; });
      t.equal([r.role, r.label, r.cells], ['group', 'Game status', 3], 'Score, Moves and Time sit in a group named Game status');
    },
  },
  {
    name: 'w4d C4-02 the title credit says how the art was made, and the About fold repeats it',
    async run(t) {
      await baseSettings(t, { tips: false });
      await t.game('scene', 'title'); await t.waitForStable();
      const c = await t.page.evaluate(() => { const e = document.querySelector('#title .credit'), r = e.getBoundingClientRect(); return { text: e.textContent, ok: r.left >= 0 && r.right <= innerWidth && e.scrollWidth <= e.clientWidth + 1 && r.height > 0 }; });
      t.expect(c.text.includes(ART.slice(0, -1) + ';'), 'the line is on the title: ' + c.text);
      t.expect(c.ok, 'and it is not cut off at the sides');
      await t.checkLayout(); await shot(t, 'C4-02', 'title-credit');
      await t.game('scene', 'help'); await t.waitForStable();
      const about = await t.page.evaluate(() => [...document.querySelectorAll('#sheet details.hp')].find((d) => d.textContent.includes('About the art')).textContent);
      t.expect(about.includes(ART), 'the About fold says it too');
      t.expect(!/Anthropic|Claude|OpenAI|Codex|Midjourney/i.test(c.text + about), 'and names no company or product');
    },
  },
  {
    name: 'w4d C4-05 the title painting carries the Central Avenue tag and no hotel name',
    async run(t) {
      await baseSettings(t, { tips: false, motion: 'reduced' });
      await t.game('scene', 'title'); await t.waitForStable();
      const tags = await t.page.evaluate(() => window.__game.heroTags().tags.map((x) => x.text));
      t.expect(!tags.some((x) => /ARLINGTON/i.test(x)), 'no tag names the Arlington: ' + JSON.stringify(tags));
      if (t.viewport === 'desktop') t.equal(tags, ['CENTRAL AVENUE · BATHHOUSE ROW'], 'the road tag stays on a wide screen');
      await shot(t, 'C4-05', 'title');
    },
  },
  {
    name: 'w4d C4-06 + S2-21 the dead-end dialog shows a fact (a new one first) and the brewery fact says 2013',
    async run(t) {
      await baseSettings(t, { tips: false, motion: 'reduced' });
      const i = FACT_IDS.indexOf('hs-0102');
      t.expect(i >= 0 && FACT_IDS.length === 50, 'the fact list read from the page: ' + FACT_IDS.length + ' facts, brewery at ' + i);
      await t.page.evaluate(([k, seen]) => { const m = JSON.parse(localStorage.getItem(k) || '{}'); m.seenFacts = seen; localStorage.setItem(k, JSON.stringify(m)); }, [MK, FACT_IDS.map((_, n) => n).filter((n) => n !== i)]);
      await t.reload();
      await t.game('setState', DEAD);
      const h = await t.game('act', 'hint'); t.equal(h.stuck, true, 'the position is a dead end');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'stuck');
      const f = await t.page.evaluate(() => { const e = document.querySelector('#sheet .fact'); if (!e) return null; const r = e.getBoundingClientRect(), s = document.getElementById('sheet').getBoundingClientRect(); return { text: e.textContent, inside: r.left >= s.left && r.right <= s.right }; });
      t.expect(f && f.text.includes('Superior Bathhouse Brewery opened in the 1916 building in 2013.') && !f.text.includes('2012'), 'the only unmet fact is shown, with the corrected year: ' + (f && f.text));
      t.expect(f.text.includes('Source: Wikipedia: Hot Springs, Arkansas; Superior Bathhouse Brewery: History'), 'and its source names the brewery history');
      t.expect(f.inside, 'the card sits inside the dialog');
      t.equal((await t.game('meta')).seenFacts.length, 50, 'it counts in the Records collection');
      await t.checkLayout(); await shot(t, 'S2-21', 'stuck-fact');
    },
  },
  {
    name: 'w4d S3-09 the first recycle of the waste is free, each later one costs 50, and the help says so',
    async run(t) {
      await baseSettings(t, { tips: false, motion: 'reduced', scoring: 'timed' });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, score: 300, piles: { stock: [], waste: ['5D'], t0: ['#9C', 'KH'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } });
      const sc = async () => (await t.game('getState')).score;
      await t.game('act', 'draw'); t.equal(await sc(), 300, 'the first turn of the waste back over costs nothing');
      await t.game('act', 'draw'); await t.game('act', 'draw'); t.equal(await sc(), 250, 'the second costs 50 (Draw 1)');
      await t.game('act', 'draw'); await t.game('act', 'draw'); t.equal(await sc(), 200, 'and so does the third');
      await t.game('scene', 'help');
      const help = await t.page.evaluate(() => [...document.querySelectorAll('#sheet details.hp')].find((d) => d.textContent.includes('Scoring')).textContent);
      t.expect(help.includes('turning the waste back over the first time is free, then each time costs 50 points (20 in Draw 3)'), 'the Scoring help states the same rule');
      t.expect(!help.includes('after the first pass'), 'and no longer says "after the first pass"');
      t.expect(help.includes('Standard scoring (the default)') && help.includes('Best scores are kept separately for Standard and Timed play'), 'Scoring help matches OQ-WF1-01 Standard default and independent bests');
      t.expect(help.includes('Undo and Hint are always free') && !help.includes('15 points') && !help.includes('kept only for Timed'), 'Scoring help reflects retired undoCost and Standard bests (CD-WF1-03)');
    },
  },
  {
    name: 'w4d W2-B01 HABS facts hs-0065/hs-0088, refusalReason grammar (an ace / an eight), & ACH[w40] copy align with primary sources (W6-S1-05)',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { tips: false, motion: 'reduced' });
      // Verify hs-0065 (Condie-Bray) and hs-0088 (1927 purchase / 1940s remodel) via dead-end fact cards
      for (const [id, want, forbid] of [
        ['hs-0065', 'Condie-Bray Glass & Paint Co.', 'Condi-Neal'],
        ['hs-0088', '1940s', 'add to the Southern Club\'s front in 1927'],
      ]) {
        const idx = FACT_IDS.indexOf(id);
        t.expect(idx >= 0, id + ' present in FACTS');
        await t.page.evaluate(([k, seen]) => { const m = JSON.parse(localStorage.getItem(k) || '{}'); m.seenFacts = seen; localStorage.setItem(k, JSON.stringify(m)); }, [MK, FACT_IDS.map((_, n) => n).filter((n) => n !== idx)]);
        await t.reload();
        await t.game('setState', DEAD);
        await t.game('act', 'hint');
        await t.page.waitForFunction(() => window.__game.getState().modal === 'stuck');
        const txt = await t.page.locator('#sheet .fact').textContent();
        t.expect(txt.includes(want) && !txt.includes(forbid), id + ' matches primary HABS/HFR/CAHD notes: ' + txt);
      }
      // Verify refusalReason grammar: "an eight" and "an ace"
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['8S'], t1: ['KH'], t2: ['7S'], t3: [], t4: [], t5: [], t6: [] } });
      await t.game('act', 'key', '1'); await t.game('act', 'key', 'Enter'); await t.game('act', 'key', '2'); await t.game('act', 'key', 'Enter');
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), 'Build down: an eight goes on a nine', 'refusalReason says "an eight"');
      await t.game('act', 'key', 'Escape');
      await t.game('act', 'key', '3'); await t.game('act', 'key', 'Enter'); await t.game('act', 'key', '2'); await t.game('act', 'key', 'Enter');
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), 'Build down: a seven goes on an eight', 'refusalReason says "on an eight"');
      // Verify ACH['w40'] ('Fully Furnished') copy is reconciled to owning all backs & tables (OQ-WF6-02)
      await t.game('scene', 'records');
      await t.page.click('#ltab-ach');
      const rec = await t.page.locator('#lpanel-ach').textContent();
      t.expect(rec.includes('Open every card back and parlor table.') && !rec.includes('Win 40 games'), 'ACH[w40] matches OQ-WF6-02');
      // Verify player-facing Backs, Tables & Settings prose avoids fourth-wall historiography caveats (W6-S1-04)
      await t.game('unlockAll');
      await t.game('scene', 'backs');
      const backCaps = await t.page.evaluate(() => {
        const out = [];
        for (const b of document.querySelectorAll('#sheet [data-back]')) { b.focus(); out.push(document.getElementById('bkCap').textContent); }
        return out.join(' || ');
      });
      await t.page.click('#btab-tables');
      const tableCaps = await t.page.evaluate(() => {
        const out = [];
        for (const tb of document.querySelectorAll('#sheet [data-table]')) { tb.focus(); out.push(document.getElementById('tblCap').textContent); }
        return out.join(' || ');
      });
      const caps = backCaps + ' || ' + tableCaps;
      t.expect(!/not documented|invented colors|No real stable colors|no club's own table|how much searching/i.test(caps), 'Backs & Tables speak in warm 1920s parlor prose without historiography caveats: ' + caps.slice(0, 200));
    },
  },
  {
    name: 'w4d S4-11 each plaque names a place already in the game, under the standard name',
    async run(t) {
      await baseSettings(t, { tips: false });
      await t.game('scene', 'title'); await t.waitForStable();
      const p = await t.page.evaluate(() => [...document.querySelectorAll('.tile')].map((e) => ({ h: e.querySelector('h2').textContent, sub: e.querySelector('.tsub').textContent, lines: Math.round(e.querySelector('.tsub').getBoundingClientRect().height / parseFloat(getComputedStyle(e.querySelector('.tsub')).fontSize) * 1.2) })));
      t.equal(p.map((x) => x.h), ['Klondike', 'FreeCell', 'Spider', 'Yukon'], 'the standard names stay first');
      const PLACES = ['Fordyce', 'Row', 'Central Avenue', 'Quapaw'];
      t.expect(p.every((x, n) => x.sub.includes(PLACES[n])), 'each line holds a place: ' + p.map((x) => x.sub).join(' | '));
      t.expect(p.every((x) => x.lines === 1), 'and fits on one line: ' + p.map((x) => x.lines).join(','));
      await t.checkLayout(); await shot(t, 'S4-11', 'plaques');
    },
  },
];
