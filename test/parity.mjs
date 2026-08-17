#!/usr/bin/env node
/*
 * parity.mjs — proves the maths does not drift.
 *
 * Re-scores a real captured page through src/score.js and requires the verdict to
 * match the baseline the original Node engine produced before the pure-core
 * extraction: 64.89 / 8 of 23 / Partial / blocker A2, and all 53 findings
 * identical down to their severity and wording.
 *
 * The fixture beside this file is a genuine capture of a government portal with
 * its identity removed — URLs, titles, selectors, text content and custom
 * properties are all replaced. None of that feeds the score, so the verdict is
 * unchanged; that it is unchanged is itself evidence the scrub touched nothing
 * load-bearing.
 *
 * It stays real rather than synthetic because real pages are messy in ways a
 * hand-written fixture is not: 60 distinct colours, hundreds of off-scale
 * spacings, 371 physical against 182 logical declarations. selftest.mjs covers
 * the clean cases and the gate rules; this covers the ones that actually occur.
 *
 * If this fails, a change altered behaviour. A compliance score that shifts when
 * the code is reorganised is not a compliance score.
 *
 *   node test/parity.mjs [path/to/capture-dir]
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score } from '../src/score.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const FIXTURE = process.argv[2] || join(HERE, 'fixtures/regression');

if (!existsSync(join(FIXTURE, 'expected.json'))) {
  console.error(`parity.mjs: no baseline at ${FIXTURE}/expected.json`);
  console.error('Point this at a capture directory holding expected.json, judged.json and observed-*.json.');
  process.exit(2);
}

const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const expected = J(join(FIXTURE, 'expected.json'));
const rubric = J(join(REPO, 'data/rubric.json'));
const tokens = J(join(REPO, 'data/tokens.json'));
const judged = J(join(FIXTURE, 'judged.json'));
const captures = ['observed-desktop-light.json', 'observed-mobile-light.json'].map((f) => J(join(FIXTURE, f)));

const fresh = score({ rubric, tokens, captures, judged, options: expected.scoreOptions });

let bad = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${ok ? '' : `\n      got ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
  if (!ok) bad++;
};

console.log('\n  Parity — pure core vs the original Node engine\n  ' + '─'.repeat(52));
check('score', fresh.score, expected.score);
check('checks passed', fresh.checksPassed, expected.checksPassed);
check('checks counted', fresh.checksCounted, expected.checksCounted);
check('earned / available', [fresh.earned, fresh.available], [expected.earned, expected.available]);
check('band', fresh.band.id, expected.band);
check('cappedFrom', fresh.cappedFrom, expected.cappedFrom);
check('failed blockers', fresh.failedBlockers.map((b) => b.id), expected.failedBlockers);
check('finding count', fresh.findings.length, expected.findingCount);

const sig = (f) => `${f.checkId}|${f.severity}|${f.summary}`;
check('every finding identical (id · severity · summary)', fresh.findings.map(sig).sort(), expected.findingSignatures);
check('per-category points', fresh.categories.map((c) => `${c.id}:${c.earned}/${c.available}`), expected.perCategory);

console.log('\n  ' + '─'.repeat(52));
console.log(bad ? `\x1b[31m  ${bad} failing — behaviour changed\x1b[0m\n` : '\x1b[32m  parity holds\x1b[0m\n');
process.exit(bad ? 1 : 0);
