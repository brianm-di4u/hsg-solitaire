# Spa City Solitaire

Klondike, FreeCell, Spider, and Yukon with town-themed cards. Part of **Hot Springs Games**, an open-source (MIT) collection of browser games set in
Hot Springs, Arkansas. The game ships as a self-contained `index.html`: art is drawn in code or painted into
`assets/`, sound is synthesized with WebAudio, and nothing loads from the network.

All games in the collection are original designs. Real places, schools and businesses appear as setting and
history only; no logos are reproduced and nothing implies endorsement. School rosters are fictional.

## Play

Open `index.html` in a browser, or serve the folder (`python -m http.server 8765`) and open http://127.0.0.1:8765/.

## Develop

```bash
npm run setup   # installs Playwright and Chromium for the test harness
npm test        # runs tests/*.test.mjs; screenshots land in screenshots/
```

There is no `src/` folder: the hand-written `index.html` is the source, and there is no build step. The images in `assets/`
are the game's own painted art; its working files are in `art-src/`.

Design docs: `PRD.md`, `MECHANICS.md`, `DEV-PLAN.md`, `REPORT.md`, `VISUAL-PLAN.md`, `VISUAL-REPORT.md`.

## Vendored from the collection

This repo was split out of the original Hot Springs Games monorepo (kept offline), which holds the full research
corpus, `LESSONS.md` and the session brief. Copies kept here so the game builds and tests on its own:

- `shared/test-harness/`: the Playwright screenshot test runner (`run.mjs`, `art-pack.mjs`, `sheets.mjs`, `gallery.mjs`).
- `shared/tools/inline.mjs`: the collection's bundler (this game does not use it; its `index.html` is edited directly).

Older docs in this repo refer to monorepo paths such as `games/solitaire/` and `shared/...`; here the game
folder is the repo root.

## License

MIT (see `LICENSE`). Third-party code in `vendor/` keeps its own license.
