#!/usr/bin/env node
/*
 * checklist.test.mjs — does the tool answer DGA's actual instrument, honestly?
 *
 * WHY THIS FILE EXISTS
 *
 * For four sessions the gate ran on nine criteria inferred from prose on DGA's website.
 * The real instrument — supplied as a workbook — has fifty-eight, and the inferred model
 * was wrong in four ways: wrong tier labels, wrong tier for the whole service-level family,
 * nine rows where there are fifty-eight, and a gating accessibility criterion the checklist
 * does not contain at all.
 *
 * The failure this invites now is the opposite of the old one: filling rows the tool cannot
 * actually judge, because 49 blanks look like a worse product than 9 confident answers.
 * Every assertion below defends the blanks.
 *
 *   node test/checklist.test.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score, assessChecklist } from '../src/score.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const L = (p) => JSON.parse(readFileSync(join(REPO, p), 'utf8'));

const checklist = L('data/dga-checklist.json');
const map = L('data/checklist-map.json');
const rubric = L('data/rubric.json');
const tokens = L('data/tokens.json');
const judged = L('test/fixtures/regression/judged.json');
const captures = [L('test/fixtures/regression/observed-desktop-light.json')];

let bad = 0;
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) bad++;
};

console.log('\n  DGA checklist — answered, or honestly blank\n  ' + '─'.repeat(58));

/* ------------------------------------------------- the instrument is intact */

check('all 58 criteria are present, 44 essential and 14 secondary',
  checklist.criteria.length === 58 &&
    checklist.criteria.filter((c) => c.tier === 'essential').length === 44 &&
    checklist.criteria.filter((c) => c.tier === 'secondary').length === 14,
  `${checklist.criteria.length} rows`);

check('the four status strings are DGA’s, verbatim',
  map.statuses.full === 'تطبيق كلي' && map.statuses.partial === 'تطبيق جزئي' &&
    map.statuses.notApplied === 'غير مطبق' && map.statuses.na === 'N/A لاينطبق',
  JSON.stringify(map.statuses) + ' — these come from the workbook’s data validation and must not be paraphrased');

check('every criterion is mapped',
  map.entries.length === checklist.criteria.length &&
    checklist.criteria.every((c) => map.entries.some((e) => e.n === c.n)),
  `${map.entries.length} entries for ${checklist.criteria.length} criteria`);

check('every mapped check id exists in the rubric',
  (() => { const ids = new Set(rubric.categories.flatMap((c) => c.checks).map((k) => k.id));
    return map.entries.every((e) => e.checks.every((k) => ids.has(k))); })(),
  'a map pointing at a check that does not exist would silently never answer');

check('every unanswerable row says why, and carries DGA’s reference where one exists',
  map.entries.filter((e) => e.kind === 'manual').every((e) => e.why && e.why.length > 20),
  'a blank with no reason is indistinguishable from a bug');

/* --------------------------------------------- the blanks are the honest part */

const V = score({ rubric, tokens, checklist, checklistMap: map, captures, judged,
  options: { na: ['C3', 'I1', 'I2'], targetName: 'fixture' } });
const cl = V.checklist;

check('no row is silently lost — every row is answered or flagged',
  cl.rows.every((r) => r.status !== null || r.needsReview),
  cl.rows.filter((r) => r.status === null && !r.needsReview).map((r) => '#' + r.n).join(' '));

check('the tool does not claim to answer more than it maps',
  cl.essential.answered <= map.entries.filter((e) => e.kind !== 'manual').length,
  `answered ${cl.essential.answered} from ${map.entries.filter((e) => e.kind !== 'manual').length} answerable`);

check('a GAP never produces a status',
  (() => { const r = cl.rows.find((x) => x.n === 2); // C3 is na in this fixture
    return r.status === null && r.needsReview && /could not be measured/.test(r.why || ''); })(),
  JSON.stringify(cl.rows.find((x) => x.n === 2)) +
    ' — #2 depends on C3, which was not assessed; guessing would hand DGA a fact nobody checked');

check('component rows stay manual — an aggregate cannot answer a per-component question',
  map.entries.filter((e) => /component/i.test(e.en || '')).every((e) => e.kind === 'manual'),
  'P1/P2/P3 measure the share of ALL instances; attaching that to the Dropdown row is an over-claim');

/* ------------------------------------------------ #1 is DGA's own derivation */

const derive = (statuses) => {
  const fake = [{ id: 'x', checks: rubric.categories.flatMap((c) => c.checks).map((k) => ({
    ...k, status: statuses, ratio: statuses === 'pass' ? 1 : 0,
    measured: { matched: 1, total: 1 } })) }];
  return assessChecklist(checklist, map, fake);
};
check('#1 is not تطبيق كلي while any essential row falls short',
  cl.rows.find((r) => r.n === 1).status === null,
  'DGA: هذا الشرط يعتمد على مدى تطبيق الشروط الاساسية');

check('…and #1 reaches تطبيق كلي only when every essential row does',
  (() => { const all = derive('pass');
    const ess = all.rows.filter((r) => r.tier === 'essential' && r.n !== 1);
    const one = all.rows.find((r) => r.n === 1);
    return ess.every((r) => r.status === map.statuses.full) === (one.status === map.statuses.full); })(),
  'the rollup must track the rows it rolls up');

/* --------------------------------------------------------- accessibility apart */

// A1–A3 measure things the checklist never asks about, so mapping them in would put
// words in DGA's mouth. A4 is different and the distinction is the point: criterion #28
// explicitly names touch interactions on small screens, so target size is direct evidence
// for a MOBILE USABILITY row — not an accessibility criterion smuggled into the totals.
check('contrast and focus are never mapped into the checklist',
  map.entries.every((e) => !e.checks.some((k) => /^A[123]$/.test(k))),
  'the checklist has no contrast, focus, keyboard or ARIA criterion — mapping A1–A3 in would invent one');

check('…and A4 is used only where DGA itself names touch interaction',
  map.entries.filter((e) => e.checks.includes('A4')).every((e) => e.n === 28 && /touch/i.test(e.en || '')),
  map.entries.filter((e) => e.checks.includes('A4')).map((e) => `#${e.n} ${e.en}`).join(' | '));

check('…but they are still reported, in their own section',
  cl.accessibility && cl.accessibility.checks.length === 4 && /not in dga/i.test(cl.accessibility.note),
  JSON.stringify(cl.accessibility?.checks?.map((a) => a.id)));

check('the disagreement between DGA’s two artefacts is on the record',
  JSON.stringify(checklist.$findings).includes('إمكانية الوصول'),
  'the page names accessibility as category one; the checklist has no such row. Both facts must survive.');

console.log('\n  ' + '─'.repeat(58));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
process.exit(bad ? 1 : 0);
