// Council wave 1, batch B: input and fact cards (S1-09, S4-02, P-N03).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings } from './_util.mjs';

const HTML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
function readFacts() {
  const src = fs.readFileSync(HTML, 'utf8');
  const a = src.indexOf('const FACTS = ['); const b = src.indexOf('\n];', a);
  return (0, eval)('(' + src.slice(a + 'const FACTS = '.length, b + 2) + ')');
}

export const tests = [
  {
    name: 'w1b S1-09 a second finger during a drag does not freeze or drop the card',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 4 });
      const m = (await t.game('legalMoves')).find((x) => /^t\d/.test(x.from) && /^t\d/.test(x.to));
      t.expect(!!m, 'a tableau to tableau move exists');
      const lay = await t.game('getLayout');
      const src = lay.piles[m.from].cards[lay.piles[m.from].cards.length - (m.count || 1)];
      const dst = lay.piles[m.to]; const dc = dst.cards.length ? dst.cards[dst.cards.length - 1] : dst;
      const sx = src.x + src.w / 2, sy = src.y + 12;
      const tx = dc.x + lay.cardW / 2, ty = dc.y + lay.cardH * .45;
      const before = (await t.state()).moves;
      await t.page.evaluate(([sx, sy, tx, ty]) => {
        const cv = document.getElementById('cv'); const r = cv.getBoundingClientRect();
        const fire = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, bubbles: true, cancelable: true, button: 0, clientX: r.left + x, clientY: r.top + y }));
        fire('pointerdown', 1, sx, sy);
        for (let i = 1; i <= 2; i++) fire('pointermove', 1, sx + (tx - sx) * i / 12, sy + (ty - sy) * i / 12);
        fire('pointerdown', 2, 5, 5);                 // a palm lands elsewhere
        for (let i = 3; i <= 12; i++) fire('pointermove', 1, sx + (tx - sx) * i / 12, sy + (ty - sy) * i / 12);
        fire('pointerup', 2, 5, 5);
        fire('pointerup', 1, tx, ty);
      }, [sx, sy, tx, ty]);
      await t.waitForStable();
      t.equal((await t.state()).moves, before + 1, 'the first finger completed its drag onto the target pile');
    },
  },
  {
    name: 'w1b P-N03 the Arlington card duration matches its dates',
    async run(t) {
      const a = readFacts().find((f) => f[0] === 'hs-0076'); const m = /Begun (\w+)\. (\d+), (\d+), it was completed (\w+)\. (\d+), (\d+)/.exec(a[3]);
      t.expect(!!m, 'hs-0076 explanation has parseable dates');
      const mon = { Oct: 9, Nov: 10 };
      const d0 = new Date(Date.UTC(+m[3], mon[m[1]], +m[2])), d1 = new Date(Date.UTC(+m[6], mon[m[4]], +m[5]));
      let months = (d1.getUTCFullYear() - d0.getUTCFullYear()) * 12 + d1.getUTCMonth() - d0.getUTCMonth();
      if (d1.getUTCDate() < d0.getUTCDate()) months--;
      const anchor = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + months, d0.getUTCDate()));
      const days = Math.round((d1 - anchor) / 864e5);
      t.equal(a[2], `${months} months and ${days} days`, 'hs-0076 duration matches its dates');
    },
  },
  {
    name: 'w1b S4-02 fact cards are unique and do not repeat or contradict themselves',
    async run(t) {
      const F = readFacts(); const byId = Object.fromEntries(F.map((f) => [f[0], f]));
      t.equal(new Set(F.map((f) => f[0])).size, F.length, 'card ids are unique');
      t.expect(!byId['hs-0034'], 'national park number card folded into hs-0033');
      t.expect(/18th/.test(byId['hs-0033'][3]), 'hs-0033 keeps the 18th national park fact');
      t.expect(!byId['hs-0154'], 'hottest-springs card appears once (hs-0147)');
      t.expect(!/\b4[0-9]\b/.test(byId['hs-0148'][3].replace(/47/g, '')), 'hs-0148 explanation gives no second spring count');
    },
  },
];
