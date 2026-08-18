#!/usr/bin/env node
/*
 * a11y.test.mjs — the criterion that decides every verdict.
 *
 * WHY THIS FILE EXISTS
 *
 * Readiness gates on DGA's mandatory tier, and إمكانية الوصول was open on every site ever
 * audited. Two defects were doing most of that work:
 *
 *   A2 judged the hairline around a CONTENT CARD as a component boundary, because the card
 *      is wrapped in a link. SC 1.4.11 covers information required to IDENTIFY a component;
 *      an outline enclosing a headline and a paragraph does not. dga.gov.sa read 3 of 34,
 *      almost entirely news cards.
 *
 *   A3 could not be read at all where the browser will not hold OS focus — which is the
 *      real audit surface — so the criterion went unknown and "Ready to submit" was
 *      literally unreachable. A flawless site could not pass.
 *
 * Both are now fixed, and both are the kind of fix that rots quietly: a widened selector
 * puts cards back in scope, and a fallback that silently disagrees with observation is
 * worse than no fallback. So these tests pin the scope in BOTH directions, and check the
 * predicted reading against the observed one on the same page.
 *
 *   node test/a11y.test.mjs
 */

import { readFileSync, writeFileSync, mkdtempSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const BUNDLE = resolve(REPO, 'dist/dga-rate.js');
const FIXTURES = resolve(HERE, 'fixtures/checks');
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => existsSync(p));

if (!existsSync(BUNDLE)) { console.error('a11y.test: run `npm run build` first.'); process.exit(2); }
if (!CHROME) { console.error('a11y.test: no Chrome found; this test needs a real engine.'); process.exit(0); }

const DIR = mkdtempSync(join(tmpdir(), 'dga-a11y-'));
copyFileSync(BUNDLE, join(DIR, 'dga-rate.js'));

const JUDGED = "{ P1:{ratio:1,counted:{matched:9,total:9}}, P2:{ratio:1,counted:{matched:9,total:9}}, " +
  "P3:{ratio:1,counted:{matched:9,total:9}}, C3:{ratio:1,counted:{matched:9,total:9}}, " +
  "I1:{ratio:1,counted:{matched:9,total:9}}, I2:{ratio:1,counted:{matched:9,total:9}} }";

function run(fixture, { forceCascade = false } = {}) {
  const probe = `
    <pre id="o"></pre>
    <script src="./dga-rate.js"></script>
    <script>
      var v = window.__dga.audit({ label: 'fx', combined: true, allowUnassessed: true,
        allowLowCoverage: true, forceCascade: ${forceCascade}, judged: ${JUDGED} });
      var ks = v.categories.flatMap(function (c) { return c.checks; });
      var pick = function (id) { return ks.find(function (k) { return k.id === id; }) || {}; };
      var a2 = pick('A2'), a3 = pick('A3');
      document.getElementById('o').textContent = JSON.stringify({
        hasFocus: document.hasFocus(),
        A2: { ratio: a2.ratio ?? null, measured: a2.measured || null, notes: a2.notes || null },
        A3: { ratio: a3.ratio ?? null, measured: a3.measured || null,
              measuredBy: a3.measuredBy || 'observed', status: a3.status },
        accessibility: (v.criteria.criteria.find(function (c) { return c.id === 'accessibility-wcag'; }) || {}).status,
        readiness: v.readiness.state
      });
    </script></body>`;
  const page = join(DIR, `${forceCascade ? 'c-' : 'o-'}${fixture}`);
  writeFileSync(page, readFileSync(join(FIXTURES, fixture), 'utf8').replace('</body>', probe));
  const dom = execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-sandbox',
    '--allow-file-access-from-files', '--window-size=1280,900', '--virtual-time-budget=4000',
    '--dump-dom', `file://${page}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  const m = dom.match(/<pre id="o">([\s\S]*?)<\/pre>/);
  if (!m) throw new Error(`${fixture}: no output.\n${dom.slice(0, 400)}`);
  return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
}

let bad = 0;
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) bad++;
};

console.log('\n  Accessibility — the criterion that decides the verdict\n  ' + '─'.repeat(58));

/* ---------------------------------------------- A2: scope, in both directions */

const A = run('a11y.html');
check('A2 checks the borders that identify a control',
  A.A2.measured && A.A2.measured.total === 2,
  `checked ${JSON.stringify(A.A2.measured)} — expected the input and the button-styled link`);

check('A2 excludes the hairline around a content card',
  /2 decorative borders excluded/.test(A.A2.notes || ''),
  `notes: ${A.A2.notes} — two card links are on the page and both must leave scope`);

check('…and says so, rather than shrinking the denominator quietly',
  (A.A2.notes || '').includes('1.4.11'),
  'the exclusion has to carry its reason or it is indistinguishable from a bug');

check('A2 passes when only real component boundaries are judged',
  A.A2.ratio === 1, `got ${A.A2.ratio} — the card borders are 1.31:1 and must not be counted`);

// The other direction: a faint border on a real CONTROL must still fail.
const F = run('fail.html');
check('A2 still catches a faint border on an actual control',
  F.A2.ratio === 0 && F.A2.measured.total > 0,
  `got ${JSON.stringify(F.A2)} — fail.html has a 1px #eeeeee input border at 1.2:1`);

/* ------------------------------------- A3: the fallback must agree with reality */

const P_obs = run('pass.html');
const P_cas = run('pass.html', { forceCascade: true });

check('observation and cascade analysis agree on a compliant page',
  P_obs.A3.ratio === P_cas.A3.ratio,
  `observed ${P_obs.A3.ratio} vs predicted ${P_cas.A3.ratio} — a fallback that disagrees is worse than none`);

check('the cascade reading is labelled as predicted, never as observed',
  P_cas.A3.measuredBy === 'cascade-analysis' && P_obs.A3.measuredBy === 'observed',
  `observed=${P_obs.A3.measuredBy} cascade=${P_cas.A3.measuredBy}`);

const F_cas = run('fail.html', { forceCascade: true });
check('cascade analysis still detects focus removed and not replaced',
  F_cas.A3.ratio < 1,
  `got ${F_cas.A3.ratio} — fail.html kills the outline on :focus, :focus-visible and :focus`);

check('a cascade reading is scored, not written off as unmeasurable',
  P_cas.A3.status === 'pass' && P_cas.A3.ratio !== null,
  `status=${P_cas.A3.status} ratio=${P_cas.A3.ratio}`);

/* ------------------------------------------------- the point of the whole thing */

check('accessibility can be MET without observing focus',
  P_cas.accessibility === 'met',
  `got ${P_cas.accessibility} — if this is unknown, Ready to submit is unreachable again`);

check('a compliant page reaches Ready to submit where focus cannot be observed',
  P_cas.readiness === 'ready',
  `got ${P_cas.readiness} — this single assertion is why the cascade fallback exists`);

check('…and a violating page still does not',
  F_cas.readiness === 'not-yet', `got ${F_cas.readiness}`);

console.log('\n  ' + '─'.repeat(58));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
process.exit(bad ? 1 : 0);
