// Council wave 3, batch D: sound (CL-01, S1-07, S1-08, S1-12, S1-17, S3-18, S5-03, S5-05, S5-06).
import { baseSettings } from './_util.mjs';

const MAX = { volume: 1, musicVol: 1, ambVol: 1 };
// The refusal cue (nope) is the only one built from square waves, so counting them counts refusals: two per cue.
const spySquares = () => { const d = Object.getOwnPropertyDescriptor(OscillatorNode.prototype, 'type'); window.__sq = 0; Object.defineProperty(OscillatorNode.prototype, 'type', Object.assign({}, d, { set(v) { if (v === 'square') window.__sq++; d.set.call(this, v); } })); };
const nopes = async (t) => (await t.page.evaluate(() => window.__sq)) / 2;
const EMPTY_K = { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };
const card0 = async (t, pile, i = 0) => { const lay = await t.game('getLayout'); const c = lay.piles[pile].cards[i]; return { x: c.x + c.w / 2, y: c.y + 12, lay }; };
const render = (t, name, secs, over) => t.page.evaluate(([n, s, o]) => window.__game.audioRender(n, s, false, o), [name, secs, over]);

export const tests = [
  {
    name: 'w3d CL-01 the busiest moment with every volume control at its maximum stays under 0.95',
    viewports: ['desktop'],
    async run(t) {
      const shipped = await render(t, 'mix', 12);
      const full = await render(t, 'mix', 12, MAX);
      t.log('mix peak: shipped ' + shipped.peak + ', every control at maximum ' + full.peak);
      t.expect(full.peak > shipped.peak, 'the render hook takes the volume: maximum is louder than the shipped level');
      t.expect(full.peak < 0.95, 'no clipping at maximum volume: ' + full.peak);
      for (const name of ['win', 'found', 'place', 'nope', 'hint']) {
        const r = await render(t, name, 21, { volume: 1 });
        t.expect(r.peak < 0.95, name + ' at full volume stays under 0.95: ' + r.peak);
      }
    },
  },
  {
    name: 'w3d S1-07 a drag released over its own pile is no refusal, and a wobbly tap still moves the card',
    initScript: spySquares,
    async run(t) {
      await baseSettings(t, { sound: true });
      const setup = () => t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['AS'], t1: ['KD'] }) });
      // a tap that travelled a little: the ace goes home, with no refusal
      await setup(); let c = await card0(t, 't0');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 10, c.y + 3); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.f0, ['AS'], 'a wobbly tap sent the ace home');
      t.equal(await nopes(t), 0, 'and no refusal sounded');
      // taken out and put back over its own pile: stays, quietly
      await setup(); c = await card0(t, 't0');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 160, c.y + 160, { steps: 4 }); await t.page.mouse.move(c.x, c.y + 40, { steps: 4 }); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['AS'], 'put back: the card stays');
      t.equal(await nopes(t), 0, 'and no refusal sounded');
      // dropped on a pile that refuses it: still a refusal
      await setup(); c = await card0(t, 't0'); const k = await card0(t, 't1');
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(k.x, k.y + 20, { steps: 6 }); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['AS'], 'the ace did not fit on the king');
      t.equal(await nopes(t), 1, 'the refusal still sounds for a real mistake');
      // drag-only mode: a wobble is not a tap, so nothing moves and nothing sounds
      await t.game('setSettings', { tapMove: 'drag' }); await setup(); c = await card0(t, 't0');
      await t.page.evaluate(() => { window.__sq = 0; });
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 10, c.y + 3); await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['AS'], 'drag-only: the card stays');
      t.equal(await nopes(t), 0, 'drag-only: no refusal for a wobble');
    },
  },
  {
    name: 'w3d S1-08 dragging a card that cannot be lifted shakes, sounds once, and a FreeCell run says why',
    initScript: spySquares,
    async run(t) {
      await baseSettings(t, { sound: true });
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: Object.assign({}, EMPTY_K, { t0: ['#KD', 'QS'], t1: ['5C'] }) });
      let c = await card0(t, 't0', 0);
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down();
      await t.page.mouse.move(c.x + 20, c.y + 20); await t.page.mouse.move(c.x + 60, c.y + 60); await t.page.mouse.move(c.x + 90, c.y + 40);
      t.equal(await nopes(t), 1, 'a face-down card dragged: one refusal, not one per move');
      await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['#KD', 'QS'], 'nothing moved');
      t.expect(!/free cells/.test(await t.page.evaluate(() => document.getElementById('toast').textContent)), 'no free-cell message for a face-down card');
      // FreeCell: three cells full and no empty column, so two cards can move at once, and the run is three
      const fc = (cells) => ({ mode: 'freecell', opts: {}, piles: { c0: cells > 0 ? ['2C'] : [], c1: cells > 1 ? ['2D'] : [], c2: cells > 2 ? ['2H'] : [], c3: [], f0: [], f1: [], f2: [], f3: [], t0: ['9S', '8H', '7S'], t1: ['KC'], t2: ['KD'], t3: ['KH'], t4: ['QC'], t5: ['QD'], t6: ['QH'], t7: ['JC'] } });
      await t.game('setState', fc(3));
      await t.page.evaluate(() => { window.__sq = 0; document.getElementById('toast').textContent = ''; });
      c = await card0(t, 't0', 0);
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 30, c.y + 30); await t.page.mouse.move(c.x + 60, c.y + 50);
      await t.page.waitForFunction(() => /Not enough free cells for that run/.test(document.getElementById('toast').textContent));
      t.equal(await nopes(t), 1, 'the long run refuses once');
      await t.page.mouse.up();
      t.equal((await t.game('getState')).piles.t0, ['9S', '8H', '7S'], 'the run did not move');
      // with the cells free the same run lifts: no refusal, no message
      await t.game('setState', fc(0));
      await t.page.evaluate(() => { window.__sq = 0; document.getElementById('toast').textContent = ''; });
      c = await card0(t, 't0', 0);
      await t.page.mouse.move(c.x, c.y); await t.page.mouse.down(); await t.page.mouse.move(c.x + 30, c.y + 30); await t.page.mouse.move(c.x + 60, c.y + 50);
      t.equal(await nopes(t), 0, 'a run the cells allow lifts without a refusal');
      t.equal(await t.page.evaluate(() => document.getElementById('toast').textContent), '', 'and says nothing');
      await t.page.mouse.up();
    },
  },
];
