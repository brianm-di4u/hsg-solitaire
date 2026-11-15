// Council wave 3, batch D: sound (CL-01, S1-07, S1-08, S1-12, S1-17, S3-18, S5-03, S5-05, S5-06).
import { baseSettings } from './_util.mjs';

const MAX = { volume: 1, musicVol: 1, ambVol: 1 };
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
];
