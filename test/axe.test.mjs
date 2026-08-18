#!/usr/bin/env node
/*
 * axe.test.mjs — an independent opinion on the accessibility checks.
 *
 * WHY THIS FILE EXISTS
 *
 * A1–A4 rested entirely on one reading of WCAG — mine — and that reading has already
 * produced two errors: A2 counted decorative card outlines as component boundaries, and A4
 * over-exempted anything inline-block. Both were found by inspection, not by testing,
 * which is not a method.
 *
 * axe-core is the industry reference implementation. Running both engines over the same
 * fixture and comparing is the only genuinely independent evidence in this suite.
 *
 * DISAGREEMENTS ARE REPORTED, NOT RESOLVED. Deferring to axe automatically would swap one
 * unexamined authority for another; a divergence is either a bug here or a difference of
 * interpretation, and either way a person has to look at it. Accepted divergences are
 * recorded in docs/VALIDATION.md with a reason.
 *
 * COVERAGE IS PARTIAL, AND THAT IS THE HEADLINE FINDING: axe 4.13 implements no rule for
 * SC 1.4.11 (non-text contrast) or SC 2.4.7 (focus visible), so A2 and A3 — the two checks
 * changed most recently — have no independent check at all.
 *
 *   node test/axe.test.mjs
 */

import { readFileSync, writeFileSync, mkdtempSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const BUNDLE = resolve(REPO, 'dist/dga-rate.js');
const AXE = resolve(REPO, 'node_modules/axe-core/axe.min.js');
const FIXTURES = resolve(HERE, 'fixtures/checks');
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => existsSync(p));

if (!existsSync(BUNDLE)) { console.error('axe.test: run `npm run build` first.'); process.exit(2); }
if (!existsSync(AXE)) { console.error('axe.test: axe-core not installed; run `npm i`.'); process.exit(0); }
if (!CHROME) { console.error('axe.test: no Chrome found.'); process.exit(0); }

const DIR = mkdtempSync(join(tmpdir(), 'dga-axe-'));
copyFileSync(BUNDLE, join(DIR, 'dga-rate.js'));
copyFileSync(AXE, join(DIR, 'axe.min.js'));

/** Which axe rule speaks to which of our checks. Empty means nobody is watching. */
const CORRESPONDENCE = {
  A1: ['color-contrast'],
  A2: [],           // axe implements no SC 1.4.11 rule
  A3: [],           // axe implements no SC 2.4.7 rule
  A4: ['target-size'],
};

function run(fixture) {
  const probe = `
    <pre id="o"></pre>
    <script src="./dga-rate.js"></script>
    <script src="./axe.min.js"></script>
    <script>
      var v = window.__dga.audit({ label: 'fx', combined: true, allowUnassessed: true,
        allowLowCoverage: true, na: ['P1','P2','P3','C3','I1','I2'] });
      var ks = v.categories.flatMap(function (c) { return c.checks; });
      var mine = {};
      ['A1','A2','A3','A4'].forEach(function (id) {
        var k = ks.find(function (x) { return x.id === id; }) || {};
        mine[id] = { ratio: k.ratio ?? null, status: k.status || 'missing' };
      });
      axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast', 'target-size'] } })
        .then(function (r) {
          var byRule = {};
          r.violations.forEach(function (v2) { byRule[v2.id] = v2.nodes.length; });
          r.passes.forEach(function (p) { byRule[p.id] = byRule[p.id] || 0; });
          document.getElementById('o').textContent = JSON.stringify({ mine: mine, axe: byRule,
            incomplete: r.incomplete.map(function (i) { return i.id + ':' + i.nodes.length; }) });
        })
        .catch(function (e) {
          document.getElementById('o').textContent = JSON.stringify({ error: String(e && e.message || e) });
        });
    </script></body>`;
  const page = join(DIR, fixture);
  writeFileSync(page, readFileSync(join(FIXTURES, fixture), 'utf8').replace('</body>', probe));
  const dom = execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-sandbox',
    '--allow-file-access-from-files', '--window-size=1280,900', '--virtual-time-budget=8000',
    '--dump-dom', `file://${page}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  const m = dom.match(/<pre id="o">([\s\S]*?)<\/pre>/);
  if (!m || !m[1].trim()) throw new Error(`${fixture}: axe produced no output`);
  const parsed = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  if (parsed.error) throw new Error(`${fixture}: ${parsed.error}`);
  return parsed;
}

let bad = 0;
const disagreements = [];
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) bad++;
};

console.log('\n  axe-core cross-validation\n  ' + '─'.repeat(58));

const PASS = run('pass.html');
const FAIL = run('fail.html');
console.log(`  pass.html  ours ${JSON.stringify(PASS.mine.A1.ratio)}/${JSON.stringify(PASS.mine.A4.ratio)}   axe ${JSON.stringify(PASS.axe)}`);
console.log(`  fail.html  ours ${JSON.stringify(FAIL.mine.A1.ratio)}/${JSON.stringify(FAIL.mine.A4.ratio)}   axe ${JSON.stringify(FAIL.axe)}\n`);

/* On a compliant page neither engine should find anything. */
for (const [id, rules] of Object.entries(CORRESPONDENCE)) {
  if (!rules.length) continue;
  const axeHits = rules.reduce((a, r) => a + (PASS.axe[r] || 0), 0);
  const oursClean = PASS.mine[id].ratio === 1 || PASS.mine[id].status === 'n/a';
  const agree = axeHits === 0 && oursClean;
  check(`${id}: both engines find the compliant fixture clean`, agree,
    `axe ${rules.join('/')} = ${axeHits} violations, ours ratio ${PASS.mine[id].ratio}`);
  if (!agree) disagreements.push(`pass.html ${id}: axe ${axeHits} vs ours ${PASS.mine[id].ratio}`);
}

/* On the violating page both should object. */
for (const [id, rules] of Object.entries(CORRESPONDENCE)) {
  if (!rules.length) continue;
  const axeHits = rules.reduce((a, r) => a + (FAIL.axe[r] || 0), 0);
  const oursFlags = FAIL.mine[id].ratio !== null && FAIL.mine[id].ratio < 1;
  const agree = axeHits > 0 && oursFlags;
  check(`${id}: both engines object to the violating fixture`, agree,
    `axe ${rules.join('/')} = ${axeHits} violations, ours ratio ${FAIL.mine[id].ratio}`);
  if (!agree) disagreements.push(`fail.html ${id}: axe ${axeHits} vs ours ${FAIL.mine[id].ratio}`);
}

/* The coverage gap is itself a finding, and it must stay visible. */
const unwatched = Object.entries(CORRESPONDENCE).filter(([, r]) => !r.length).map(([id]) => id);
check('the unvalidated checks are named, not quietly assumed correct',
  unwatched.length === 2 && unwatched.includes('A2') && unwatched.includes('A3'),
  `unwatched: ${unwatched.join(', ')}`);
console.log(`      → axe implements no rule for SC 1.4.11 or SC 2.4.7, so ${unwatched.join(' and ')} rest on this tool alone.`);

if (disagreements.length) {
  console.log('\n  \x1b[33mDisagreements — each is a bug here or a difference of reading:\x1b[0m');
  disagreements.forEach((d) => console.log('    · ' + d));
  console.log('  Record every accepted divergence in docs/VALIDATION.md with its reason.');
}

console.log('\n  ' + '─'.repeat(58));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
process.exit(bad ? 1 : 0);
