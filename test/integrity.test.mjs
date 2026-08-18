#!/usr/bin/env node
/*
 * integrity.test.mjs — can the score be made to look better than the evidence?
 *
 * WHY THIS FILE EXISTS
 *
 * Every check in the rubric asks whether a page is compliant. Nothing asked whether
 * the VERDICT was sound. That gap has a history: a capture once filed itself under
 * the wrong colour scheme, the whole 18-point colour category went n/a, and the site
 * scored HIGHER for never having been measured. The score is earned/available, so
 * anything that leaves the denominator makes the survivors count for more.
 *
 * Measured on the regression fixture before this was closed: marking six checks n/a
 * moved the score from 64.89 to 82.43. Seventeen points, for measuring less, silently.
 *
 * So these tests attack the arithmetic rather than the page. Each one asserts that a
 * way of getting a better number without deserving it is refused, and refused loudly.
 *
 *   node test/integrity.test.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score, scoreByViewport, inlineReport } from '../src/score.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const F = join(HERE, 'fixtures/regression');
const load = (p) => JSON.parse(readFileSync(p, 'utf8'));

const rubric = load(join(REPO, 'data/rubric.json'));
const tokens = load(join(REPO, 'data/tokens.json'));
const judged = load(join(F, 'judged.json'));
const captures = [load(join(F, 'observed-desktop-light.json')), load(join(F, 'observed-mobile-light.json'))];
const BASE_NA = ['C3', 'I1', 'I2'];

let bad = 0;
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) bad++;
};

const run = (opts = {}, j = judged) =>
  score({ rubric, tokens, captures, judged: j, options: { na: BASE_NA, ...opts } });

/** Returns the DgaError code, or the verdict's score if it did not throw. */
const codeOf = (fn) => {
  try { const v = fn(); return { threw: false, score: v.score, verdict: v }; }
  catch (e) { return { threw: true, code: e.code || e.name, message: e.message }; }
};

console.log('\n  Can the score be gamed?\n  ' + '─'.repeat(58));

/* ---------------------------------------------------- 1. the denominator */

const base = run();

check('the verdict states how much of the rubric it measured',
  base.coverage && typeof base.coverage.pct === 'number' && base.coverage.applicableWeight === rubric.scoring.coreWeight,
  `coverage=${JSON.stringify(base.coverage?.pct)} applicable=${base.coverage?.applicableWeight}`);

// Itemisation has to reconcile with the arithmetic, or it is decoration: the weights
// of the dropped checks must be exactly the gap between applicable and measured.
const droppedWeight = base.coverage.dropped.reduce((a, d) => a + d.weight, 0);
check('every unmeasured check is named, and the weights account for the whole gap',
  base.coverage.dropped.every((d) => d.id && typeof d.weight === 'number' && d.reason && d.kind) &&
    BASE_NA.every((id) => base.coverage.dropped.some((d) => d.id === id)) &&
    droppedWeight === base.coverage.applicableWeight - base.coverage.measuredWeight,
  `dropped ${droppedWeight}pt vs gap ${base.coverage.applicableWeight - base.coverage.measuredWeight}pt: ` +
    JSON.stringify(base.coverage.dropped));

// The exact attack that worked before: mark the worst checks n/a and watch it climb.
const worst = base.categories.flatMap((c) => c.checks)
  .filter((k) => k.status === 'fail')
  .sort((a, b) => ((b.available ?? 0) - (b.earned ?? 0)) - ((a.available ?? 0) - (a.earned ?? 0)))
  .map((k) => k.id);

// An ACKNOWLEDGED gap — someone passed --na — is a scoping decision, so it scores.
// But the number rose 64.89 -> 82.43 for measuring less, so it cannot pass unlabelled:
// it must be provisional, banded down, and say coverage is why.
const thin = run({ na: [...BASE_NA, ...worst.slice(0, 6)] });
check('dropping the six worst checks still raises the raw number',
  thin.score > base.score,
  `${base.score} -> ${thin.score} — if this ever stops being true the attack changed shape`);
check('…but the audit is marked provisional',
  thin.provisional === true, `provisional=${thin.provisional}`);
check('…and cannot claim a high adoption level however high the number goes',
  thin.band.id === 'moderate' || thin.score < 75,
  `score ${thin.score} banded ${thin.band.id}`);
check('…and says coverage is why',
  (thin.capReasons || []).some((r) => /measured/.test(r)),
  JSON.stringify(thin.capReasons));
check('…and the reader is told the denominator, not just the score',
  /Measured \*\*\d+(\.\d+)?%\*\* of the rubric/.test(inlineReport(thin)),
  inlineReport(thin).split('\n').slice(0, 4).join('\n'));

/* ------------------------------------------- the silent gap: the real bug */

// The dark-mode bug reproduced: the colour category becomes UNMEASURABLE — not
// skipped by anyone, just absent — and the score goes up. Nobody chose it, so
// nobody would have caught it. This is the case that must stop the audit.
const blinded = captures.map((c) => ({ ...c, tallies: Object.fromEntries(
  Object.entries(c.tallies || {}).filter(([k]) => !/color|colour|background|fill|text/i.test(k))) }));
const blind = codeOf(() => score({ rubric, tokens, captures: blinded, judged, options: { na: BASE_NA } }));
check('a capture that silently lost colour is refused, not scored higher',
  blind.threw && blind.code === 'SILENT_COVERAGE_LOSS',
  blind.threw ? `threw ${blind.code}` : `scored ${blind.score} having never measured colour (baseline ${base.score})`);
check('…and the refusal names the checks that went dark',
  blind.threw && /C1|C2/.test(blind.message), blind.message);

check('an automated-only audit stays possible — judged gaps are acknowledged, not silent',
  (() => {
    const autoOnly = codeOf(() => run({ na: ['C3', 'P1', 'P2', 'P3', 'I1', 'I2'] }));
    return !autoOnly.threw && autoOnly.verdict.provisional === true;
  })(),
  'skipping all 27 points of judged checks must score, flagged provisional, not throw');

/* ------------------------------------------------------- 2. judged checks */

const bare = codeOf(() => run({}, { ...judged, P1: { ratio: 0.99 } }));
check('a judged ratio with no count is rejected',
  bare.threw && bare.code === 'JUDGED_WITHOUT_COUNT',
  bare.threw ? bare.code : `accepted, scored ${bare.score}`);

const drifted = codeOf(() => run({}, { ...judged, P1: { ratio: 0.99, counted: { matched: 3, total: 38 } } }));
check('a ratio that disagrees with its own count is rejected',
  drifted.threw && drifted.code === 'JUDGED_COUNT_MISMATCH',
  drifted.threw ? drifted.code : `accepted 0.99 against 3/38, scored ${drifted.score}`);

const over = codeOf(() => run({}, { ...judged, P1: { ratio: 5, counted: { matched: 50, total: 10 } } }));
check('a ratio above 1.0 is rejected rather than clamped to perfect',
  over.threw && over.code === 'RATIO_OUT_OF_RANGE',
  over.threw ? over.code : `clamped to a free pass, scored ${over.score}`);

check('the count, not the restated ratio, is what scores',
  Math.abs(base.categories.flatMap((c) => c.checks).find((k) => k.id === 'P1').ratio - 31 / 38) < 0.005,
  'P1 should score 31/38, not the rounded 0.816 written beside it');

/* ---------------------------------------------------------- 3. viewports */

const noWidth = codeOf(() => scoreByViewport({
  rubric, tokens, judged,
  captures: [{ ...captures[0], viewport: undefined, label: 'widthless' }],
  options: { na: BASE_NA },
}));
check('a capture with no viewport width is refused, not filed as mobile',
  noWidth.threw && noWidth.code === 'CAPTURE_WITHOUT_VIEWPORT',
  noWidth.threw ? noWidth.code : 'silently bucketed');

const split = scoreByViewport({ rubric, tokens, captures, judged, options: { na: BASE_NA } });
check('the split still reports both viewports separately',
  split.viewports.length === 2 && split.viewports.every((v) => v.captured),
  JSON.stringify(split.viewports.map((v) => [v.id, v.captured])));
check('overall is the worst viewport, and says so',
  split.overall.score === Math.min(...split.viewports.map((v) => v.verdict.score)) &&
    /worst/.test(split.overall.basis),
  `overall ${split.overall.score} vs ${split.viewports.map((v) => v.verdict.score)}`);

console.log('\n  ' + '─'.repeat(58));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
process.exit(bad ? 1 : 0);
