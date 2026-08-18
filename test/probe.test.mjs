#!/usr/bin/env node
/*
 * probe.test.mjs — exercises the PROBE in a real browser engine.
 *
 * This is the test that did not exist, and its absence is exactly how a bug
 * survived into production: `walkRules` recursed with `if (rule.cssRules)`, but a
 * plain CSSStyleRule exposes an EMPTY cssRules list under CSS Nesting, so the
 * `continue` skipped every ordinary rule's declarations. The probe read 25 of 1021
 * rules on a live page and silently reported zero logical/physical declarations —
 * which made the RTL logical-properties check vanish from the denominator on the
 * one kind of page where it matters most.
 *
 * selftest.mjs drives the SCORER with synthetic captures and cannot catch that
 * class of fault. This loads a fixture DOM in headless Chrome, runs the real
 * bundle against it, and asserts on measurements whose right answers are known
 * because the fixture was built to have them.
 *
 *   node test/probe.test.mjs
 */

import { writeFileSync, mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const BUNDLE = resolve(REPO, 'dist/dga-rate.js');

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p));

if (!existsSync(BUNDLE)) {
  console.error('probe.test: dist/dga-rate.js missing — run `npm run build` first.');
  process.exit(2);
}
if (!CHROME) {
  console.error('probe.test: no Chrome/Chromium found. Skipping (this test needs a real engine).');
  process.exit(0);
}

const DIR = mkdtempSync(join(tmpdir(), 'dga-probe-'));

/* ------------------------------------------------------------- the fixture */

// Counts here are deliberate. The assertions below are only meaningful because
// this page was built to have known right answers.
//   physical directional declarations : 6  (margin-left, margin-right, padding-left,
//                                           padding-right, border-left-width, float)
//   logical directional declarations   : 4  (margin-inline-start, padding-inline-end,
//                                           inset-inline-start, border-inline-start-width)
//   nested rule (CSS Nesting)          : 1  — the shape that broke walkRules
const FIXTURE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>probe fixture</title>
<style>
  :root { --x: 1; }
  body { margin: 0; background: #ffffff; font-family: system-ui; }
  .physical-a { margin-left: 8px; margin-right: 8px; padding-left: 12px; }
  .physical-b { padding-right: 16px; border-left-width: 1px; float: left; }
  .logical-a  { margin-inline-start: 8px; padding-inline-end: 12px; }
  .logical-b  { inset-inline-start: 0; border-inline-start-width: 1px; }
  .card { background: #ffffff; border: 1px solid #d2d6db; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px 0 #1018280d; }
  .card { color: #161616; font-size: 16px; line-height: 24px;
    & .nested-child { color: #384250; font-size: 14px; line-height: 20px; }
  }
  .low-contrast { color: #bbbbbb; background: #ffffff; font-size: 14px; }
  .tiny-target { width: 16px; height: 16px; display: inline-block; }
  .ok-target { width: 48px; height: 48px; display: inline-block; }
  @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
</style></head>
<body>
  <main class="card">
    <p class="physical-a">Physical properties block A</p>
    <p class="physical-b">Physical properties block B</p>
    <p class="logical-a">Logical properties block A</p>
    <p class="logical-b">Logical properties block B</p>
    <p class="nested-child">Nested child, only reachable if nesting is walked</p>
    <p class="low-contrast">This text fails contrast on purpose</p>
    <p dir="rtl" lang="ar" style="font-family: 'IBM Plex Sans Arabic', sans-serif">مرحبا بكم في المنصة</p>
    <a href="#" class="tiny-target" aria-label="too small"></a>
    <a href="#" class="ok-target" aria-label="big enough"></a>
    <button type="button" style="padding: 12px 16px; border-radius: 4px; background: #1b8354; color: #ffffff; border: 0">Primary</button>
  </main>
  <pre id="out"></pre>
  <script src="./dga-rate.js"></script>
  <script>
    try {
      var na = ['C3','P1','P2','P3','I1','I2'];
      // combined:true is the single-verdict path the rest of these assertions
      // were written against; the split is checked separately just below.
      var v = window.__dga.audit({ label: 'fixture', na: na, combined: true });
      var c = window.__dga.captures[0];
      window.__dga.reset();
      var sp = window.__dga.audit({ label: 'fixture', na: na });
      var web = sp.viewports.filter(function (x) { return x.id === 'web'; })[0];
      var mob = sp.viewports.filter(function (x) { return x.id === 'mobile'; })[0];
      document.getElementById('out').textContent = JSON.stringify({
        ok: true,
        score: v.score, band: v.band.id, checksCounted: v.checksCounted,
        css: c.css, targets: c.targets, contrast: c.contrast, rtl: c.rtl,
        tallyKeys: Object.keys(c.tallies).length,
        fontSizes: c.tallies.fontSize.values.map(function (x) { return x.value; }),
        radii: c.tallies.radius.values.map(function (x) { return x.value; }),
        htmlLen: window.__dga.html(v).length, inlineLen: window.__dga.inline(v).length,
        split: {
          schema: sp.schema, breakpoint: sp.breakpoint,
          hasCombinedScore: 'score' in sp,
          webCaptured: web.captured, mobileCaptured: mob.captured,
          scoredScore: (web.captured ? web : mob).verdict.score,
          missingNote: (web.captured ? mob : web).note,
          splitHtmlLen: window.__dga.html(sp).length,
          splitInlineLen: window.__dga.inline(sp).length
        }
      });
    } catch (e) {
      document.getElementById('out').textContent = JSON.stringify({ ok: false, error: String(e && e.stack || e) });
    }
  </script>
</body></html>`;

writeFileSync(join(DIR, 'fixture.html'), FIXTURE);
writeFileSync(join(DIR, 'dga-rate.js'), readFileSync(BUNDLE));

/* --------------------------------------------------------------- run it */

const dom = execFileSync(
  CHROME,
  ['--headless', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
   '--virtual-time-budget=4000', '--dump-dom', `file://${join(DIR, 'fixture.html')}`],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
);

const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!m) {
  console.error('probe.test: the fixture never produced output. Chrome dumped:\n', dom.slice(0, 600));
  process.exit(1);
}
const R = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));

let bad = 0;
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) bad++;
};

console.log('\n  Probe — real engine, known fixture\n  ' + '─'.repeat(52));

if (!R.ok) {
  console.error('  the bundle threw:\n', R.error);
  process.exit(1);
}

check('bundle installs and audits without throwing', R.ok);

/* the regression this file exists for */
check('CSS walk reads far more than the rule count alone',
  R.css.rulesRead >= 12, `rulesRead=${R.css.rulesRead}`);
check('physical declarations are counted, not silently zero',
  R.css.physicalDecls >= 6, `physicalDecls=${R.css.physicalDecls}, expected >= 6`);
check('logical declarations are counted, not silently zero',
  R.css.logicalDecls >= 4, `logicalDecls=${R.css.logicalDecls}, expected >= 4`);
// Tally keys are strings, so compare numerically — 16 is .card's own declaration
// and 14 is its nested child's. Seeing both is the proof that walkRules descends
// into a nested rule AND still reads the parent's declarations on the way past.
const sizes = R.fontSizes.map(Number);
check('nesting did not swallow the parent rule’s own declarations',
  sizes.includes(16) && sizes.includes(14),
  `font sizes seen: ${R.fontSizes.join(', ')} — 16 comes from .card itself, 14 from its nested child`);
check('reduced-motion block found', R.css.reducedMotionRules >= 1, `got ${R.css.reducedMotionRules}`);

/* the rest of the instrument */
check('contrast measured, and the deliberate failure caught',
  R.contrast.textRuns >= 6 && R.contrast.passing < R.contrast.textRuns,
  `runs=${R.contrast.textRuns} passing=${R.contrast.passing}`);
check('target sizes measured against the ledger minimum',
  R.targets.interactive >= 2 && R.targets.passing >= 1 && R.targets.minTargetPx > 0,
  `interactive=${R.targets.interactive} passing=${R.targets.passing} min=${R.targets.minTargetPx}`);
check('the 16px target was flagged and the 48px one was not',
  R.targets.interactive - R.targets.passing >= 1, JSON.stringify(R.targets));
check('Arabic run detected and attributed to an Arabic face',
  R.rtl.arabicRuns >= 1 && R.rtl.arabicRunsInArabicFace >= 1, JSON.stringify(R.rtl));
check('radius scale captured', R.radii.length >= 1, `radii=${R.radii.join(', ')}`);
check('all 18 tallies present', R.tallyKeys === 18, `got ${R.tallyKeys}`);

/* the surface */
check('scored a real number', typeof R.score === 'number' && R.score >= 0 && R.score <= 100, `score=${R.score}`);
check('renderer produced a page', R.htmlLen > 20000, `${R.htmlLen} chars`);
check('inline report produced', R.inlineLen > 100 && R.inlineLen < 4000, `${R.inlineLen} chars`);

/* the split is the default: web and mobile scored separately, never blended */
check('audit() returns a split by default', R.split.schema === 'dga-score-split/1', R.split.schema);
check('split carries NO combined score', R.split.hasCombinedScore === false,
  'a single figure across both viewports is the thing the split exists to prevent');
check('split point is the ledger breakpoint', R.split.breakpoint === 768, `got ${R.split.breakpoint}`);
// One capture at one width, so exactly one viewport is scored and the other is
// a stated gap. Which one depends on the headless window, so assert the shape
// rather than the side.
check('exactly one viewport is scored from one capture',
  (R.split.webCaptured ? 1 : 0) + (R.split.mobileCaptured ? 1 : 0) === 1,
  `web=${R.split.webCaptured} mobile=${R.split.mobileCaptured}`);
check('the scored viewport carries a number', typeof R.split.scoredScore === 'number',
  `got ${R.split.scoredScore}`);
check('the uncaptured viewport is a stated gap, not a pass', typeof R.split.missingNote === 'string' && R.split.missingNote.length > 20,
  `note=${R.split.missingNote}`);
check('split renders a page', R.split.splitHtmlLen > 20000, `${R.split.splitHtmlLen} chars`);
check('split renders an inline report', R.split.splitInlineLen > 150, `${R.split.splitInlineLen} chars`);

console.log('\n  ' + '─'.repeat(52));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : `\x1b[32m  all passing\x1b[0m  (fixture scored ${R.score}, ${R.checksCounted} checks)\n`);
console.log(`  fixture: ${DIR}\n`);
process.exit(bad ? 1 : 0);
