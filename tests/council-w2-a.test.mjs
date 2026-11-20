// Council wave 2, batch A: music, ambience and cue variation (S5-01, S5-02).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseSettings, nearWinKlondike } from './_util.mjs';

const OUT = process.env.HS_ARTIFACT_DIR
  ? path.resolve(process.env.HS_ARTIFACT_DIR, 'wave-2', 'audio')
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'screenshots', 'council-waves', 'wave-2', 'audio');
const SET = 'spa-solitaire:v1:settings';
const state = (t) => t.game('audioState');
const render = (t, name, secs, wav) => t.page.evaluate(([n, s, w]) => window.__game.audioRender(n, s, w), [name, secs, !!wav]);
const reloadGame = async (t) => { await t.page.reload(); await t.page.waitForFunction(() => !!window.__game); };
const gesture = async (t) => { await t.page.mouse.click(t.vp.width / 2, t.vp.height / 2); await t.page.waitForTimeout(150); };
const counting = () => { const R = window.AudioContext; window.__acMade = 0; window.AudioContext = class extends R { constructor(...a) { super(...a); window.__acMade++; } }; };
const save = (name, b64) => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, name), Buffer.from(b64, 'base64')); };

export const tests = [
  {
    name: 'w2a S5-01 every music piece renders 60 s inside the mix limits and has form',
    viewports: ['desktop'],
    async run(t) {
      const list = await t.game('audioList');
      t.expect(list.music.includes('title') && list.music.includes('table'), 'a title and a table piece: ' + list.music);
      for (const name of list.music) {
        const r = await render(t, name, 60, true);
        t.log(name + ': peak ' + r.peak + ', rms ' + r.rmsDb + ' dBFS, longest silence ' + r.longestSilence + ' s, ' + JSON.stringify(r.built));
        t.expect(r.peak >= 0.06 && r.peak <= 0.16, name + ' music peak 0.06 to 0.16, got ' + r.peak);
        t.expect(r.rmsDb >= -40 && r.rmsDb <= -28, name + ' music RMS -40 to -28 dBFS, got ' + r.rmsDb);
        t.expect(r.longestSilence < 2, name + ' has no silence over 2 s, got ' + r.longestSilence);
        t.expect(r.built.formBars * list.barSeconds[name] >= 45, name + ' form lasts at least 45 s: ' + r.built.formBars * list.barSeconds[name]);
        t.expect(r.built.distinctBars >= 6, name + ' distinct lead bars >= 6, got ' + r.built.distinctBars);
        t.expect(r.built.pitches >= 6, name + ' pitches >= 6, got ' + r.built.pitches);
        save('music-' + name + '.wav', r.wav);
      }
    },
  },
  {
    name: 'w2a S5-01 all three venue ambiences (bathhouse, parlor, valley) render 30 s quietly with no silent stretch',
    viewports: ['desktop'],
    async run(t) {
      const list = await t.game('audioList');
      t.expect(['bathhouse', 'parlor', 'valley'].every((s) => list.ambience.includes(s)), 'bathhouse, parlor, and valley scenes present: ' + list.ambience);
      for (const name of list.ambience) {
        const r = await render(t, name, 30, true);
        t.log(name + ': peak ' + r.peak + ', rms ' + r.rmsDb + ' dBFS, longest silence ' + r.longestSilence + ' s, stereo ' + r.stereo);
        t.expect(r.peak < 0.07, name + ' ambience peak under 0.07, got ' + r.peak);
        t.expect(r.rmsDb >= -52 && r.rmsDb <= -38, name + ' ambience RMS -52 to -38 dBFS, got ' + r.rmsDb);
        t.expect(r.longestSilence < 2, name + ' no silence over 2 s');
        save('ambience-' + name + '.wav', r.wav);
      }
      // Verify valley twilight (night=1) activates crickets within mix limits
      const night = await t.page.evaluate(() => window.__game.audioRender('valley', 30, false, { night: 1 }));
      t.log('valley (night): peak ' + night.peak + ', rms ' + night.rmsDb + ' dBFS');
      t.expect(night.peak < 0.07 && night.rmsDb >= -52 && night.rmsDb <= -38 && night.longestSilence < 2, 'valley twilight renders inside mix limits');
    },
  },
  {
    name: 'w2a S5-02 every cue is in the cue range and no two repeats are alike',
    viewports: ['desktop'],
    async run(t) {
      const list = await t.game('audioList');
      const music = await render(t, 'table', 30), amb = await render(t, 'bathhouse', 30);
      let loudest = 0;
      for (const name of list.cues) {
        const r = await render(t, name, name === 'win' ? 4 : 9, true);
        const n = r.secs.length, vals = r.secs.slice(0, n - 1).map((x) => String(x));
        loudest = Math.max(loudest, r.peak);
        t.log('cue ' + name + ': peak ' + r.peak + ', rms ' + r.rmsDb + ' dBFS, distinct repeats ' + new Set(vals).size + '/' + vals.length);
        t.expect(r.peak >= 0.2 && r.peak <= 0.45, name + ' cue peak 0.2 to 0.45, got ' + r.peak);
        t.equal(new Set(vals).size, vals.length, name + ' repeats all differ');
        save('cue-' + name + '.wav', r.wav);
      }
      t.expect(music.peak + amb.peak + loudest < 0.95, 'music + ambience + loudest cue stay under 0.95: ' + (music.peak + amb.peak + loudest).toFixed(3));
    },
  },
  {
    name: 'w2a S5-01 nothing plays before the first gesture, then title music and ambience start',
    initScript: counting,
    async run(t) {
      await t.page.evaluate(() => localStorage.removeItem('spa-solitaire:v1:settings'));
      await reloadGame(t);
      await t.page.waitForTimeout(500);
      t.equal(await t.page.evaluate(() => window.__acMade), 0, 'no AudioContext before a gesture');
      t.equal((await state(t)).ready, false, 'audio not started');
      await gesture(t);
      const s = await state(t);
      t.expect(s.ready, 'audio starts on the first gesture'); t.equal(s.music, 'title', 'title mood on the title screen'); t.equal(s.ambience, 'valley', 'valley ambience on outdoor title (OQ-WF4-02)');
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 9 });
      t.equal((await state(t)).music, 'table', 'play mood at the table');
      t.equal((await state(t)).ambience, 'parlor', 'parlor ambience on default felt table');
      await t.game('unlockAll');
      await t.game('setSettings', { table: 'marble' }); t.equal((await state(t)).ambience, 'bathhouse', 'bathhouse ambience on marble table');
      await t.game('setSettings', { table: 'pool' }); t.equal((await state(t)).ambience, 'bathhouse', 'bathhouse ambience on pool table');
      await t.game('setSettings', { table: 'linen' }); t.equal((await state(t)).ambience, 'valley', 'valley ambience on linen table');
      await t.game('setSettings', { table: 'quapaw' }); t.equal((await state(t)).ambience, 'parlor', 'parlor ambience on quapaw table');
      await t.game('setSettings', { table: 'midnight' }); t.equal((await state(t)).ambience, 'parlor', 'parlor ambience on midnight table');
      await t.game('setSettings', { table: 'felt' }); t.equal((await state(t)).ambience, 'parlor', 'parlor ambience back on felt table');
      await t.game('scene', 'title');
      t.equal((await state(t)).music, 'title', 'back to the title mood');
      t.equal((await state(t)).ambience, 'valley', 'back to valley ambience on title');
    },
  },
  {
    name: 'w2a S5-01 Music, Ambience and Sound effects settings: separate, saved, obey the master switch',
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('setSettings', { sound: true }); await t.game('newGame', { mode: 'klondike', draw: 1, deal: 21 });
      await gesture(t);
      let s = await state(t); t.equal([s.music, s.ambience], ['table', 'parlor'], 'both on by default (felt -> parlor)');
      await t.game('scene', 'settings');
      for (const id of ['musicVol', 'ambVol']) t.expect(await t.page.isVisible('#' + id), id + ' slider is in Settings');
      for (const k of ['sfx', 'music', 'ambience']) t.expect(await t.page.isVisible('[data-tog="' + k + '"]'), k + ' toggle is in Settings');
      await t.shot('S5-01-settings');
      await t.page.click('[data-tog="music"]');
      s = await state(t); t.equal([s.music, s.ambience], [null, 'parlor'], 'Music off silences only the music');
      await t.page.click('[data-tog="ambience"]');
      s = await state(t); t.equal([s.music, s.ambience], [null, null], 'Ambience off silences the bed');
      await t.page.click('[data-tog="music"]'); await t.page.click('[data-tog="ambience"]');
      s = await state(t); t.equal([s.music, s.ambience], ['table', 'parlor'], 'both come back');
      await t.page.click('[data-tog="sfx"]');
      let st = await t.state(); t.equal(st.settings.sfx, false, 'sound effects can be off on their own');
      t.equal((await state(t)).music, 'table', 'music keeps playing with effects off');
      await t.page.click('[data-tog="sfx"]');
      await t.page.fill('#musicVol', '0.25'); await t.page.dispatchEvent('#musicVol', 'input');
      await t.page.fill('#ambVol', '0.35'); await t.page.dispatchEvent('#ambVol', 'input');
      await t.page.click('[data-tog="music"]');
      await reloadGame(t);
      st = await t.state();
      t.equal([st.settings.music, st.settings.ambience, st.settings.musicVol, st.settings.ambVol, st.settings.sfx], [false, true, 0.25, 0.35, true], 'settings persist across a reload');
      await t.game('setSettings', { music: true, sound: false });
      s = await state(t); t.equal([s.music, s.ambience], [null, null], 'the master Sound switch silences music and ambience');
      await t.game('setSettings', { sound: true });
      s = await state(t); t.equal([s.music, s.ambience], ['title', 'valley'], 'master back on restores Title music & valley ambience');
    },
  },
  {
    name: 'w2a S5-01 saves from before this wave load: sound stays as it was, new settings default on',
    viewports: ['desktop'],
    async run(t) {
      const old = (o) => t.page.evaluate(([k, v]) => localStorage.setItem(k, v), [SET, JSON.stringify(o)]);
      await old({ sound: false, volume: 0.4, motion: 'reduced', back: 'skylight', table: 'felt' });
      await reloadGame(t); await gesture(t);
      let st = await t.state(); t.equal([st.settings.sound, st.settings.volume, st.settings.music, st.settings.ambience], [false, 0.4, true, true], 'old silent save stays silent');
      t.equal((await state(t)).ready, false, 'no audio context for a player who had sound off');
      await old({ sound: true, volume: 0.4, motion: 'reduced' });
      await reloadGame(t); await gesture(t);
      st = await t.state(); t.equal([st.settings.sound, st.settings.volume, st.settings.musicVol], [true, 0.4, 0.6], 'old sound-on save keeps its volume and gets music at the quiet default');
      t.equal((await state(t)).music, 'title', 'music plays for it');
      await old({ sound: true, musicVol: 'loud', ambVol: 9, music: 'yes', ambience: null });
      await reloadGame(t);
      st = await t.state(); t.equal([st.settings.musicVol, st.settings.ambVol, st.settings.music, st.settings.ambience], [0.6, 1, true, true], 'damaged new settings fall back per key');
    },
  },
  {
    name: 'w2a S5-01 the pause card and a hidden tab hold the music; nothing is scheduled while held',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'reduced' });
      await t.game('setSettings', { sound: true }); await t.game('newGame', { mode: 'klondike', draw: 1, deal: 31 });
      await gesture(t);
      await t.page.waitForFunction(() => window.__game.audioState().ctx === 'running', null, { timeout: 5000 }).catch(() => {});
      const s0 = await state(t);
      if (s0.ctx !== 'running') t.log('audio context did not run in this browser; checking the hold flags only');
      else {
        t.expect(s0.bars >= 1, 'the first bar is scheduled');
        await t.page.waitForFunction((n) => window.__game.audioState().bars > n, s0.bars, { timeout: 8000 }).then(() => t.expect(true, 'music keeps scheduling bars while playing'), () => t.fail('no new bar scheduled in 8 s'));
      }
      await t.game('scene', 'menu');
      let s = await state(t); t.equal(s.held, true, 'the menu is the pause card: audio held');
      await t.page.waitForTimeout(300); const b1 = (await state(t)).bars; await t.page.waitForTimeout(700);
      t.equal((await state(t)).bars, b1, 'no bars scheduled while paused');
      await t.page.keyboard.press('Escape'); await t.page.waitForTimeout(100);
      t.equal((await state(t)).held, false, 'closing the card releases the audio');
      await t.game('scene', 'settings');
      t.equal((await state(t)).held, false, 'Settings keeps playing so a slider can be heard');
      await t.game('scene', 'game');
      await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      t.equal((await state(t)).held, true, 'hidden tab holds the audio');
      const b2 = (await state(t)).bars; await t.page.waitForTimeout(700);
      t.equal((await state(t)).bars, b2, 'no bars scheduled while hidden');
      await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
      t.equal((await state(t)).held, false, 'visible again releases it');
    },
  },
  {
    name: 'w2a S5-01 the music steps back for the win ceremony and returns on the ticket',
    viewports: ['desktop'],
    async run(t) {
      await baseSettings(t, { motion: 'full' });
      await t.game('setSettings', { sound: true }); await gesture(t);
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 41 });
      t.equal((await state(t)).music, 'table', 'table music before the win');
      await t.game('setState', nearWinKlondike());
      await t.game('act', 'move', 't0', 'f3');
      await t.page.waitForFunction(() => window.__game.audioState().hush === true, null, { timeout: 4000 });
      t.equal((await state(t)).music, null, 'music hushed for the ceremony');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'win', null, { timeout: 20000 });
      await t.page.waitForFunction(() => window.__game.audioState().hush === false, null, { timeout: 5000 });
      t.equal((await state(t)).music, 'table', 'music returns with the win ticket');
    },
  },
  {
    name: 'w2a W3-B04 Bb/Eb harmonic unification, zero-clash Title->Table breath, adaptive intensity + DRUM.b brushes, stuck pause & 2-tap room glue (W6-S5-06)',
    viewports: ['desktop'],
    async run(t) {
      // 1. All 10 melodic SFX cues + new Bb/Eb cues sit strictly in {C, Eb, F, G, Bb} (pitch classes 0,3,5,7,10), <= 1600 Hz, with zero square waves
      const harmonic = await t.page.evaluate(() => {
        const allow = new Set([0, 3, 5, 7, 10]);
        const pc = (hz) => ((Math.round(69 + 12 * Math.log2(hz / 440)) % 12) + 12) % 12;
        const checks = [
          ...Array.from({ length: 13 }, (_, i) => ['found', i + 1]),
          ['hint'], ['run'], ['undo'], ['win'], ['gather'], ['ach'], ['best'], ['streak', 5], ['course'], ['stuck'], ['king'], ['ready'], ['shimmer'], ['glass'], ['tick'],
        ];
        const badPitch = [], tooHigh = [], squares = [];
        for (const [name, arg] of checks) {
          const tones = window.__game.cueTones(name, arg);
          for (const x of tones) {
            if (x.type === 'square') squares.push(name);
            if (x.f > 1600) tooHigh.push(name + '@' + Math.round(x.f));
            if (!allow.has(pc(x.f))) badPitch.push(name + '@' + Math.round(x.f) + '(pc=' + pc(x.f) + ')');
          }
        }
        for (const name of window.__game.audioList().cues) {
          for (const x of window.__game.cueTones(name, 1)) if (x.type === 'square') squares.push(name);
        }
        return { badPitch, tooHigh, squares };
      });
      t.equal(harmonic.squares, [], 'zero square-wave oscillators across every cue (CD-WF4-06)');
      t.equal(harmonic.badPitch, [], 'all melodic cues sit strictly inside Bb/Eb {C, Eb, F, G, Bb} (CD-WF4-01)');
      t.equal(harmonic.tooHigh, [], 'no melodic partial exceeds 1.6 kHz');

      // 2. Zero-clash Title -> Table breath: rapid launch (<250 ms) uses 0.05 s outFade + 0.35 s breath; steady switch uses 0.45 s + 0.35 s breath
      await baseSettings(t, { sound: true, tips: false, motion: 'reduced', dealFairness: 'random' });
      await reloadGame(t);
      await t.seed(9);
      await t.page.locator('#tiles .chip').first().click(); // capture pointerdown starts Title ~0-60 ms before click starts Table
      await t.page.waitForFunction(() => window.__game.audioState().music === 'table', null, { timeout: 5000 });
      const rapid = (await state(t)).lastTransition;
      t.expect(!!rapid && rapid.outFade <= 0.06 && Math.abs(rapid.breath - 0.35) < 0.01 && rapid.enterAt >= rapid.retireEnd + 0.34, 'rapid launch from Title fades out in 0.05 s + 0.35 s breath with zero overlap: ' + JSON.stringify(rapid));
      await t.page.waitForTimeout(850); // allow 0.40 s breath + >0.25 s live table playback before steady Table -> Title switch
      await t.game('scene', 'title');
      const steady = (await state(t)).lastTransition;
      t.expect(!!steady && Math.abs(steady.outFade - 0.45) < 0.01 && Math.abs(steady.breath - 0.35) < 0.01 && steady.enterAt >= steady.retireEnd + 0.34, 'steady Table -> Title transition fades in 0.45 s + 0.35 s breath: ' + JSON.stringify(steady));

      // 3. Adaptive music intensity(0..0.70) + whisper jazz brushes DRUM.b above 0.5 + stuck modal holds music
      await t.game('newGame', { mode: 'klondike', draw: 1, deal: 9 });
      const startInten = (await state(t)).intensity;
      t.equal(startInten, 0, 'fresh deal resets music intensity to 0');
      await t.game('setState', nearWinKlondike());
      const nearInten = (await state(t)).intensity;
      t.expect(nearInten > 0.5 && nearInten <= 0.70, 'near-win Finish-ready board drives intensity into (0.5, 0.70]: ' + nearInten);
      const lowBrush = await t.page.evaluate(() => window.__game.audioRender('table', 16, false, { intensity: 0.2 }));
      const hiBrush = await t.page.evaluate(() => window.__game.audioRender('table', 16, false, { intensity: 0.65 }));
      t.equal(lowBrush.built.brushes, 0, 'jazz brush DRUM.b stays silent below intensity 0.5');
      t.expect(hiBrush.built.brushes >= 4 && hiBrush.peak <= 0.16 && hiBrush.rmsDb <= -28, 'jazz brush DRUM.b activates above 0.5 inside mix limits: ' + JSON.stringify({ brushes: hiBrush.built.brushes, peak: hiBrush.peak, rmsDb: hiBrush.rmsDb }));

      // Stuck modal pauses table music (PAUSE_MODALS includes 'stuck')
      await t.game('setState', { mode: 'klondike', opts: { draw: 1 }, piles: { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [], t0: ['2C'], t1: ['2S'], t2: ['4D'], t3: ['4H'], t4: ['6C'], t5: ['6S'], t6: ['8D'] } });
      await t.game('act', 'checkStuck');
      await t.page.waitForFunction(() => window.__game.getState().modal === 'stuck', null, { timeout: 5000 });
      t.equal((await state(t)).held, true, 'stuck modal holds table music cleanly');
      await t.page.keyboard.press('Escape');
      t.equal((await state(t)).held, false, 'closing stuck modal releases music');

      // 4. Zero-FFT 2-tap room glue stays <= 10% wet and adapts to venue surface (marble/pool roomier than felt/midnight)
      await t.game('unlockAll');
      await t.game('setSettings', { table: 'felt' }); const feltWet = (await state(t)).roomWet;
      await t.game('setSettings', { table: 'marble' }); const marbleWet = (await state(t)).roomWet;
      t.expect(feltWet > 0 && feltWet <= 0.1 && marbleWet <= 0.1 && marbleWet > feltWet, '2-tap room glue <=10% wet and roomier on tiled marble (' + marbleWet + ') than damped felt (' + feltWet + ')');
    },
  },
];
