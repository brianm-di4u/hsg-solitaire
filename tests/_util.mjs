// Shared helpers for the Spa City Solitaire tests (no playwright import; everything goes through `t`).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A screenshot taken immediately (no wait for idle) — for frames in the middle of an animation or drag.
// It lands in the same folder as t.shot() output so the gallery picks it up.
export async function rawShot(t, name) {
  const a = process.argv; const i = a.indexOf('--milestone'); const m = i >= 0 ? a[i + 1] : 'latest';
  const dir = path.join(GAME_DIR, 'screenshots', m, t.viewport);
  fs.mkdirSync(dir, { recursive: true });
  await t.page.screenshot({ path: path.join(dir, name + '.png') });
}

export const center = (r) => ({ x: r.x + r.w / 2, y: r.y + Math.min(r.h, 30) / 2 + 4 });

// Drag the card at `index` of pile `from` onto pile `to` with the mouse, in small steps.
export async function dragCard(t, from, index, to, { midShot } = {}) {
  const lay = await t.game('getLayout');
  const src = lay.piles[from].cards[index];
  const dst = lay.piles[to]; const dc = dst.cards.length ? dst.cards[dst.cards.length - 1] : dst;
  const sx = src.x + src.w / 2, sy = src.y + Math.min(14, src.h / 4);
  const tx = dc.x + lay.cardW / 2, ty = dc.y + lay.cardH * .45;
  await t.page.mouse.move(sx, sy); await t.page.mouse.down();
  const n = 12;
  for (let i = 1; i <= n; i++) {
    await t.page.mouse.move(sx + (tx - sx) * i / n, sy + (ty - sy) * i / n);
    if (midShot && i === 8) await rawShot(t, midShot);
  }
  await t.page.mouse.up();
}

// Click the visible strip of a card.
export async function clickCard(t, pile, index) {
  const lay = await t.game('getLayout');
  const c = index == null ? lay.piles[pile] : lay.piles[pile].cards[index];
  await t.page.mouse.click(c.x + c.w / 2, c.y + 10);
}

// Fresh, deterministic settings for each test.
export async function baseSettings(t, extra = {}) {
  await t.game('setSettings', Object.assign({ autoFoundation: 'off', sound: false, motion: 'full', leftHanded: false, cardSize: 'standard', fourColor: false, back: 'skylight', table: 'felt' }, extra));
}

// A Klondike position one move from a win: everything home except the king of spades.
export function nearWinKlondike() {
  const run = (s) => ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'].map((r) => r + s);
  return { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: [], f0: run('C'), f1: run('D'), f2: run('H'), f3: run('S').slice(0, 12), t0: ['KS'], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] } };
}
