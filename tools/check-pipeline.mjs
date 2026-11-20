#!/usr/bin/env node
// Fast (<1 s) asset & pipeline parity check (WF-3 §5.2, W6-S6-04, OQ-WF1-03).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

const artSpec = JSON.parse(read('art-src', 'art.json'));
const manifest = JSON.parse(read('assets', 'manifest.json'));
const specNames = artSpec.items.map((i) => i.name).sort();
const manNames = Object.keys(manifest).sort();
const diskWebps = fs.readdirSync(path.join(ROOT, 'assets')).filter((f) => f.endsWith('.webp')).sort();

check(JSON.stringify(specNames) === JSON.stringify(manNames), `art.json (${specNames.length}) !== manifest.json (${manNames.length})`);
check(JSON.stringify(manNames.map((n) => n + '.webp')) === JSON.stringify(diskWebps), `manifest files !== assets/*.webp (${diskWebps.length})`);
for (const it of artSpec.items) {
  const m = manifest[it.name];
  if (!m) continue;
  const p = path.join(ROOT, 'assets', m.file);
  check(m.w === it.w && m.h === it.h, `${it.name}: manifest ${m.w}x${m.h} !== art.json ${it.w}x${it.h}`);
  check(fs.existsSync(p) && fs.statSync(p).size === m.bytes, `${it.name}: disk size !== manifest bytes`);
}

const html = read('index.html');
const cfDisk = JSON.parse(read('art-src', 'court-focus.json'));
const cfMatch = html.match(/const COURT_FOCUS = (\{[^\n]+\});/);
check(!!cfMatch, 'COURT_FOCUS missing in index.html');
if (cfMatch) {
  const cfHtml = JSON.parse(cfMatch[1]);
  check(JSON.stringify(cfDisk) === JSON.stringify(cfHtml), 'COURT_FOCUS in index.html !== art-src/court-focus.json');
  for (const id of ['deco-qh', 'deco-kh', 'deco-ks', 'deco-kd', 'deco-qc']) {
    check(cfHtml[id] <= 0.58, `${id} focusX ${cfHtml[id]} > 0.58`);
  }
}

const brassPy = read('art-src', 'blender', 'brass.py');
const pySlice = brassPy.match(/DIALOG_FRAME_SLICE\s*=\s*(\d+)/)?.[1];
const cssSlices = [...html.matchAll(/url\(assets\/brass-frame\.webp\)\s+(\d+)/g)].map((m) => m[1]);
check(!!pySlice && cssSlices.length >= 2 && cssSlices.every((s) => s === pySlice), `brass.py slice (${pySlice}) !== CSS (${cssSlices.join(',')})`);
check(brassPy.includes("'AgX'"), 'brass.py missing AgX color management');

const fontsCss = read('assets', 'fonts.css');
const woff2s = fs.readdirSync(path.join(ROOT, 'vendor', 'fonts')).filter((f) => f.endsWith('.woff2')).sort();
check(woff2s.length >= 5, `expected >= 5 vendor woff2 fonts, found ${woff2s.length}`);
for (const f of woff2s) {
  const b64 = fs.readFileSync(path.join(ROOT, 'vendor', 'fonts', f)).toString('base64');
  check(fontsCss.includes(b64), `assets/fonts.css out of date vs vendor/fonts/${f}`);
}

check(!/['"]table-/.test(html) && !specNames.some((n) => n.startsWith('table-')), 'dead table-* asset prefix found');
const assetsBytes = Object.values(manifest).reduce((s, m) => s + m.bytes, 0) + fs.statSync(path.join(ROOT, 'assets', 'fonts.css')).size;
check(assetsBytes <= 5 * 1024 * 1024, `assets/ ${(assetsBytes / 1048576).toFixed(2)} MB > 5.00 MB (OQ-WF1-03)`);
check(fs.statSync(path.join(ROOT, 'index.html')).size <= 2 * 1024 * 1024, 'index.html > 2 MB');

for (const f of fs.readdirSync(path.join(ROOT, 'tests')).filter((x) => x.endsWith('.mjs'))) {
  const src = read('tests', f);
  check(!src.includes('_council'), `tests/${f} references repo-escaping _council path (CD-WF6-06)`);
  if (f.startsWith('council-')) check(!/readFileSync\([^)]*index\.html/.test(src), `tests/${f} raw-scrapes index.html (W6-S6-04)`);
}

if (fails.length) {
  console.error('FAIL  check-pipeline (' + fails.length + ' issue' + (fails.length === 1 ? '' : 's') + '):');
  for (const m of fails) console.error('  - ' + m);
  process.exit(1);
}
console.log(`PASS  check-pipeline · ${specNames.length} assets (${(assetsBytes / 1048576).toFixed(2)} MB <= 5.00 MB) · COURT_FOCUS · brass slice ${pySlice} · ${woff2s.length} fonts · repo-local tests`);
