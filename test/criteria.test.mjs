#!/usr/bin/env node
/*
 * criteria.test.mjs — does the tool answer DGA's question, or its own?
 *
 * WHY THIS FILE EXISTS
 *
 * The auditor spent its life reporting a percentage with a compliance word attached, and
 * the question "so what passes?" had no honest answer. It turned out DGA had already
 * answered it, at design.dga.gov.sa/AssessmentCriteria: there is no passing score. There
 * is a checklist, split into الامتثال الإلزامي and الموصى بها, and formal review confirms a
 * project meets ALL of it.
 *
 * So readiness is a GATE on the mandatory tier, not a threshold on a number. These tests
 * hold that line — chiefly against the two ways it would quietly rot: a criterion counting
 * as met when something under it was never looked at, and readiness drifting into being a
 * proxy for the score.
 *
 *   node test/criteria.test.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score, assessCriteria } from '../src/score.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const F = join(HERE, 'fixtures/regression');
const load = (p) => JSON.parse(readFileSync(p, 'utf8'));

const rubric = load(join(REPO, 'data/rubric.json'));
const tokens = load(join(REPO, 'data/tokens.json'));
const criteria = load(join(REPO, 'data/dga-criteria.json'));
const judged = load(join(F, 'judged.json'));
const captures = [load(join(F, 'observed-desktop-light.json'))];

let bad = 0;
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) bad++;
};

console.log('\n  DGA criteria — the gate, not the number\n  ' + '─'.repeat(58));

/* ------------------------------------------------- 1. the mapping is complete */

const all = rubric.categories.flatMap((c) => c.checks);
const ids = new Set(criteria.criteria.map((c) => c.id));

const unmapped = all.filter((k) => !k.dgaCriterion && k.scope !== 'extended');
check('every core check maps to a published DGA criterion', unmapped.length === 0,
  `unmapped: ${unmapped.map((k) => k.id).join(', ')} — a check with no criterion is one nobody asked for`);

const bogus = all.filter((k) => k.dgaCriterion && !ids.has(k.dgaCriterion));
check('no check points at a criterion that does not exist', bogus.length === 0,
  bogus.map((k) => `${k.id}→${k.dgaCriterion}`).join(', '));

const outside = all.filter((k) => !k.dgaCriterion);
check('checks outside the framework are exactly the extended ones',
  outside.every((k) => k.scope === 'extended') && outside.length > 0,
  `outside: ${outside.map((k) => `${k.id}(${k.scope})`).join(', ')}`);

const mandatory = criteria.criteria.filter((c) => c.tier === 'mandatory');
const starved = mandatory.filter((c) => !all.some((k) => k.dgaCriterion === c.id) && c.automatable !== false);
check('every mandatory criterion has at least one check behind it', starved.length === 0,
  `no evidence for: ${starved.map((c) => c.id).join(', ')}`);

check('criteria file records where it came from',
  /^https:\/\/design\.dga\.gov\.sa/.test(criteria.source || '') && !!criteria.capturedAt,
  `source=${criteria.source} capturedAt=${criteria.capturedAt}`);

/* ------------------------------- 2. the gate: absence vs a gap, tested directly */

const row = (id, status, extra = {}) => ({ id, title: id, status, dgaCriterion: 'type-colour', ...extra });
const asCats = (rows) => [{ id: 'x', checks: rows }];
const gate = (rows) => assessCriteria(criteria, asCats(rows)).criteria.find((c) => c.id === 'type-colour');

check('all passing → met', gate([row('C1', 'pass'), row('T1', 'pass')]).status === 'met');

check('one failing → open', gate([row('C1', 'pass'), row('T1', 'fail')]).status === 'open');

check('an ABSENT n/a does not stop a criterion being met',
  gate([row('C1', 'pass'), row('C4', 'n/a', { naKind: 'absent', reason: 'target ships no dark theme' })]).status === 'met',
  'a target with no dark theme is hiding nothing — absence must not block');

check('a GAP n/a makes the criterion unconfirmable, never met',
  gate([row('C1', 'pass'), row('A3', 'n/a', { naKind: 'gap', reason: 'browser would not observe focus' })]).status === 'unknown',
  'an unmeasured check could be hiding a failure, so it can never count as met');

check('an unclassified n/a is treated as a gap, not an absence',
  gate([row('C1', 'pass'), row('X9', 'n/a')]).status === 'unknown',
  'the conservative default matters: a new kind of n/a must not silently count as met');

check('a failure outranks a gap',
  gate([row('C1', 'fail'), row('A3', 'n/a', { naKind: 'gap' })]).status === 'open');

check('all absent → no-check, not met',
  gate([row('C4', 'n/a', { naKind: 'absent' })]).status === 'no-check');

/* ------------------------------- 3. readiness is a gate, not a proxy for the score */

const readiness = (rows) => assessCriteria(criteria, asCats(rows)).readiness;

const clean = criteria.criteria.filter((c) => c.tier === 'mandatory' && c.automatable !== false)
  .map((c, i) => ({ id: 'K' + i, title: 'K' + i, status: 'pass', dgaCriterion: c.id }));
check('every mandatory criterion met → Ready to submit',
  readiness(clean).state === 'ready', JSON.stringify(readiness(clean).open));

const oneOpen = [...clean.slice(1), { id: 'BAD', title: 'BAD', status: 'fail', dgaCriterion: mandatory[0].id }];
check('one mandatory criterion open → Not yet',
  readiness(oneOpen).state === 'not-yet', JSON.stringify(readiness(oneOpen)));

const oneUnknown = [...clean.slice(1), { id: 'HUH', title: 'HUH', status: 'n/a', naKind: 'gap', dgaCriterion: mandatory[0].id }];
check('nothing failing but something unlooked-at → Cannot confirm',
  readiness(oneUnknown).state === 'unconfirmed', JSON.stringify(readiness(oneUnknown)));

check('…and Cannot confirm is never reported as ready',
  readiness(oneUnknown).state !== 'ready');

/* the property that matters most: the gate must not track the number */
const v = score({ rubric, tokens, criteria, captures, judged, options: { na: ['C3', 'I1', 'I2'] } });
check('readiness is decided by the criteria, not by the adoption score',
  v.readiness.state === 'not-yet' && v.score > 60,
  `score ${v.score} with readiness ${v.readiness.state} — a decent number must still be able to read Not yet`);

check('the verdict names which criteria are open, in DGA’s own wording',
  v.readiness.open.length > 0 && v.readiness.open.every((o) => o.ar && o.blocking.length),
  JSON.stringify(v.readiness.open));

check('an extended check never appears in any criterion',
  v.criteria.criteria.every((c) => !c.checks.includes('R2') && !c.checks.includes('M2')),
  'R2 and M2 are outside DGA’s framework and must not reach the gate');

check('the report states how much of DGA’s framework is automated',
  v.criteria.automatedCoverage.automated > 0 &&
    v.criteria.automatedCoverage.automated < v.criteria.automatedCoverage.published &&
    v.criteria.automatedCoverage.needsHumanReview.length > 0,
  JSON.stringify(v.criteria.automatedCoverage));

console.log('\n  ' + '─'.repeat(58));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
process.exit(bad ? 1 : 0);
