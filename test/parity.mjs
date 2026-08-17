#!/usr/bin/env node
/*
 * parity.mjs — proves the pure-core extraction did not change the maths.
 *
 * Re-scores a real saved audit (qiwa.sa/ar, 17 Aug 2026) through src/score.js and
 * requires the verdict to match the score.json the original Node script produced:
 * 64.89 / 8 of 23 / Partial / blocker A2.
 *
 * If this fails, the refactor changed behaviour and is not done. A compliance
 * score that shifts when the code is reorganised is not a compliance score.
 *
 *   node test/parity.mjs [path/to/report-dir]
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score } from '../src/score.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const REPORT = process.argv[2] || join(process.env.HOME, '.claude/dga/reports/qiwa-sa-ar-2026-08-17');

const EXPECTED = { score: 64.89, checksPassed: 8, checksCounted: 23, band: 'partial', blocker: 'A2' };

if (!existsSync(join(REPORT, 'score.json'))) {
  console.error(`parity.mjs: no baseline at ${REPORT}/score.json`);
  console.error('This gate needs the saved Qiwa audit. Point it at a report directory that has one.');
  process.exit(2);
}

const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const baseline = J(join(REPORT, 'score.json'));
const rubric = J(join(REPO, 'data/rubric.json'));
const tokens = J(join(REPO, 'data/tokens.json'));
const judged = J(join(REPORT, 'judged.json'));
const captures = ['observed-desktop-light.json', 'observed-mobile-light.json'].map((f) => J(join(REPORT, f)));

const fresh = score({
  rubric, tokens, captures, judged,
  options: { targetType: 'site', targetName: 'Qiwa (Arabic)', targetUrl: 'https://www.qiwa.sa/ar', na: ['C3', 'I1', 'I2'] },
});

let bad = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${ok ? '' : `\n      got ${JSON.stringify(got)}  want ${JSON.stringify(want)}`}`);
  if (!ok) bad++;
};

console.log('\n  Parity — pure core vs the original Node script\n  ' + '─'.repeat(52));
check('score', fresh.score, baseline.score);
check('score matches the recorded 64.89', fresh.score, EXPECTED.score);
check('checks passed', fresh.checksPassed, baseline.checksPassed);
check('checks counted', fresh.checksCounted, baseline.checksCounted);
check('earned / available', [fresh.earned, fresh.available], [baseline.earned, baseline.available]);
check('band', fresh.band.id, baseline.band.id);
check('cappedFrom', fresh.cappedFrom, baseline.cappedFrom);
check('failed blockers', fresh.failedBlockers.map((b) => b.id), baseline.failedBlockers.map((b) => b.id));
check('blocker is A2', fresh.failedBlockers.map((b) => b.id), [EXPECTED.blocker]);
check('finding count', fresh.findings.length, baseline.findings.length);

const sig = (f) => `${f.checkId}|${f.severity}|${f.summary}`;
const a = fresh.findings.map(sig).sort();
const b = baseline.findings.map(sig).sort();
check('every finding identical (id · severity · summary)', a, b);

const perCat = (v) => v.categories.map((c) => `${c.id}:${c.earned}/${c.available}`);
check('per-category points', perCat(fresh), perCat(baseline));

console.log('\n  ' + '─'.repeat(52));
console.log(bad ? `\x1b[31m  ${bad} failing — the refactor changed behaviour\x1b[0m\n` : '\x1b[32m  parity holds\x1b[0m\n');
process.exit(bad ? 1 : 0);
