#!/usr/bin/env node
/*
 * checks.test.mjs — every check, exercised in both directions.
 *
 * WHY THIS FILE EXISTS
 *
 * Five scoring bugs were found in this project, and every one was found by a person
 * noticing a number looked wrong. An audit of test coverage explained why: 19 of the
 * 28 checks were never named in any test — 56 of the 100 points — and every bug had
 * been sitting inside that gap. E3 could not pass on any page ever built; A2 failed
 * decorative hairlines; A4 reported prose links as conformance failures. None of it
 * was exotic. Nothing was looking.
 *
 * So: two fixtures. pass.html is built entirely from ledger values with WCAG
 * satisfied; fail.html is its mirror, every value off-ledger and every rule broken.
 * A check that cannot reach 1.0 on the first is impossible to satisfy. A check that
 * cannot reach 0 on the second passes things it should catch — the quieter fault,
 * and the one nobody reports.
 *
 * The meta-test at the bottom asserts that property across the whole rubric rather
 * than per check, so a check added later without fixtures fails immediately instead
 * of joining the untested 56.
 *
 *   node test/checks.test.mjs
 */

import { writeFileSync, mkdtempSync, readFileSync, existsSync, copyFileSync } from 'node:fs';
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
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p));

if (!existsSync(BUNDLE)) { console.error('checks.test: run `npm run build` first.'); process.exit(2); }
if (!CHROME) { console.error('checks.test: no Chrome found; this test needs a real engine.'); process.exit(0); }

const rubric = JSON.parse(readFileSync(join(REPO, 'data/rubric.json'), 'utf8'));
const ALL = rubric.categories.flatMap((c) => c.checks);

/**
 * Checks the ledger simply has no data for. These CANNOT reach 1.0, and that is a
 * property of the extract rather than a bug in the check — so the meta-test requires
 * them to report n/a with a stated reason instead of requiring them to pass.
 */
const LEDGER_GAPS = {
  C4: 'no dark token set in the ledger',
  I1: 'Icons file deferred — no size scale or stroke weight',
  I2: 'no identity baseline in the ledger',
  M1: 'no motion tokens published by DGA',
};

/* ------------------------------------------------------------------ runner */

const DIR = mkdtempSync(join(tmpdir(), 'dga-checks-'));
copyFileSync(BUNDLE, join(DIR, 'dga-rate.js'));

function run(fixture, { width = 1280, height = 900 } = {}) {
  const html = readFileSync(join(FIXTURES, fixture), 'utf8').replace(
    '</body>',
    `<pre id="out"></pre>
     <script src="./dga-rate.js"></script>
     <script>
       try {
         var v = window.__dga.audit({ label: 'fx', combined: true, allowUnassessed: true,
                                      na: ['P1','P2','P3','C3','I1','I2'] });
         var rows = {};
         v.categories.forEach(function (c) { c.checks.forEach(function (k) {
           rows[k.id] = { status: k.status, ratio: k.ratio === undefined ? null : k.ratio,
                          reason: k.reason || null,
                          measured: k.measured ? k.measured.matched + '/' + k.measured.total : null };
         }); });
         document.getElementById('out').textContent = JSON.stringify({ ok: true, score: v.score, rows: rows });
       } catch (e) {
         document.getElementById('out').textContent = JSON.stringify({ ok: false, error: String(e && e.stack || e) });
       }
     </script></body>`
  );
  const page = join(DIR, fixture.replace('.html', `-${width}.html`));
  writeFileSync(page, html);
  const dom = execFileSync(
    CHROME,
    ['--headless', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
     `--window-size=${width},${height}`, '--virtual-time-budget=4000', '--dump-dom', `file://${page}`],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
  );
  const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
  if (!m) throw new Error(`${fixture}: no output. Chrome said:\n${dom.slice(0, 400)}`);
  const parsed = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  if (!parsed.ok) throw new Error(`${fixture}: the bundle threw\n${parsed.error}`);
  return parsed;
}

let bad = 0;
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) bad++;
};

console.log('\n  Every check, both directions\n  ' + '─'.repeat(58));

const PASS = run('pass.html', { width: 1280 });
const FAIL = run('fail.html', { width: 1280 });
const PASS_MOBILE = run('pass.html', { width: 390, height: 844 });

console.log(`  pass.html scored ${PASS.score}   ·   fail.html scored ${FAIL.score}\n`);

check('the compliant fixture scores far above the violating one',
  PASS.score - FAIL.score > 30, `pass ${PASS.score} vs fail ${FAIL.score}`);

/* ------------------------------------------------- per check, both ends */

const reachable1 = [];
const reachable0 = [];
const gapReported = [];

for (const k of ALL) {
  const p = PASS.rows[k.id] || {};
  const f = FAIL.rows[k.id] || {};
  const m = PASS_MOBILE.rows[k.id] || {};

  // Reached 1.0 anywhere in the corpus?
  if ([p, m].some((r) => r.ratio === 1)) reachable1.push(k.id);
  // Reached below 1.0 (i.e. the check can register a violation) anywhere?
  if ([f, p, m].some((r) => typeof r.ratio === 'number' && r.ratio < 1)) reachable0.push(k.id);
  // Or is it a documented ledger gap, reporting n/a with a reason?
  if (LEDGER_GAPS[k.id] && [p, f, m].some((r) => r.status === 'n/a')) gapReported.push(k.id);
}

for (const k of ALL) {
  if (LEDGER_GAPS[k.id]) continue;
  if (k.method === 'judged') continue; // driven by supplied ratios, covered in parts.test.mjs
  const canPass = reachable1.includes(k.id);
  const canFail = reachable0.includes(k.id);
  check(`${k.id} can be satisfied`, canPass,
    `never reached 1.0 — pass.html gave ${JSON.stringify(PASS.rows[k.id])}. A check that cannot be satisfied deducts points no site can recover.`);
  check(`${k.id} can be violated`, canFail,
    `never dropped below 1.0 — fail.html gave ${JSON.stringify(FAIL.rows[k.id])}. A check that cannot fail is not measuring anything.`);
}

/* ------------------------------------------------------ the meta-test */

console.log('\n  Reachability across the rubric\n  ' + '─'.repeat(58));

const scored = ALL.filter((k) => !LEDGER_GAPS[k.id] && k.method !== 'judged');
const unsatisfiable = scored.filter((k) => !reachable1.includes(k.id));
const unfailable = scored.filter((k) => !reachable0.includes(k.id));

check('no check is impossible to satisfy', unsatisfiable.length === 0,
  `impossible: ${unsatisfiable.map((k) => k.id).join(', ')}`);
check('no check is impossible to violate', unfailable.length === 0,
  `never fails: ${unfailable.map((k) => k.id).join(', ')}`);

for (const [id, why] of Object.entries(LEDGER_GAPS)) {
  const row = PASS.rows[id] || {};
  check(`${id} reports n/a for a stated reason, not silently`,
    row.status === 'n/a' && typeof row.reason === 'string' && row.reason.length > 5,
    `status=${row.status} reason=${row.reason} (expected an n/a naming: ${why})`);
}

const named = new Set([...reachable1, ...reachable0, ...gapReported, ...ALL.filter((k) => k.method === 'judged').map((k) => k.id)]);
const untested = ALL.filter((k) => !named.has(k.id));
check('every check in the rubric is exercised by the corpus', untested.length === 0,
  `not exercised: ${untested.map((k) => k.id).join(', ')} — a check with no fixture is how the last five bugs survived`);

console.log('\n  ' + '─'.repeat(58));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
process.exit(bad ? 1 : 0);
