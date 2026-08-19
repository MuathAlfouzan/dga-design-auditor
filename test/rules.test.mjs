#!/usr/bin/env node
/*
 * rules.test.mjs — do the two modes still share one source of truth?
 *
 * WHY THIS FILE EXISTS
 *
 * The agent now has two halves that judge the same design system by different means:
 * Mode A measures a rendered page against data/tokens.json, Mode B reads source against
 * rules/*.md. The failure mode of a merge like this is drift — a rule file that no check
 * knows about, a check no rule covers, a conflict quietly resolved in one place and not
 * the other — and none of it shows up as a broken build. It shows up as two tools giving
 * a ministry different answers.
 *
 * So these tests hold the binding: every rule file is mapped, every id is real, every
 * disagreement between the imported corpus and the extracted ledger stays visible, and
 * the corpus keeps the provenance warning it has to carry.
 *
 *   node test/rules.test.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => JSON.parse(readFileSync(join(REPO, p), 'utf8'));

const map = load('data/rules-map.json');
const rubric = load('data/rubric.json');
const criteria = load('data/dga-criteria.json');
const tokens = load('data/tokens.json');

let bad = 0;
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) bad++;
};

console.log('\n  Two modes, one source of truth\n  ' + '─'.repeat(58));

/* --------------------------------------------------- the corpus is intact */

const onDisk = readdirSync(join(REPO, 'rules')).filter((f) => f.endsWith('.md') && f !== 'README.md');
const mapped = map.files.map((f) => f.file.replace('rules/', ''));
check('every rule file on disk is mapped',
  onDisk.every((f) => mapped.includes(f)),
  `unmapped: ${onDisk.filter((f) => !mapped.includes(f)).join(', ')}`);
check('every mapped rule file exists',
  map.files.every((f) => existsSync(join(REPO, f.file))),
  `missing: ${map.files.filter((f) => !existsSync(join(REPO, f.file))).map((f) => f.file).join(', ')}`);

/* ------------------------------------------- ids are real, in both directions */

const checkIds = new Set(rubric.categories.flatMap((c) => c.checks).map((k) => k.id));
const critIds = new Set(criteria.criteria.map((c) => c.id));
const badChecks = map.files.flatMap((f) => f.checks.filter((k) => !checkIds.has(k)));
const badCrit = map.files.flatMap((f) => f.criteria.filter((c) => !critIds.has(c)));
check('every check id in the map exists in the rubric', badChecks.length === 0, badChecks.join(', '));
check('every criterion id in the map exists in DGA\'s criteria', badCrit.length === 0, badCrit.join(', '));

const covered = new Set(map.files.flatMap((f) => f.checks));
const uncovered = [...checkIds].filter((k) => !covered.has(k));
const documented = JSON.stringify(map.$notCoveredByAnyRuleFile || []);
check('a check with no rule file is documented, not just absent',
  uncovered.every((k) => documented.includes(k)),
  `undocumented: ${uncovered.filter((k) => !documented.includes(k)).join(', ')}`);

/* ------------------------------ the reason both modes exist stays on the record */

check('every rule area names what only a review can see',
  map.files.every((f) => Array.isArray(f.reviewOnly) && f.reviewOnly.length > 0),
  `missing reviewOnly: ${map.files.filter((f) => !f.reviewOnly?.length).map((f) => f.file).join(', ')}`);

/* -------------------------------------- conflicts stay visible, never resolved */

check('the ledger records its disagreements with the corpus',
  Array.isArray(tokens.conflicts) && tokens.conflicts.length >= 4,
  `conflicts: ${tokens.conflicts?.length}`);

check('each conflict states both readings, which one is in use, and how to settle it',
  (tokens.conflicts || []).every((c) =>
    c.id && c.ledger !== undefined && c.corpus !== undefined &&
    c.ledgerBasis && c.corpusBasis && c.inUse && c.resolve),
  JSON.stringify((tokens.conflicts || []).filter((c) => !(c.ledgerBasis && c.corpusBasis && c.inUse && c.resolve)).map((c) => c.id)));

check('a conflict is resolved in favour of the MEASURED value, not the transcribed one',
  (tokens.conflicts || []).every((c) => c.inUse === 'ledger'),
  'the corpus has no source, date or version; it cannot silently override a live extract');

/* ------------------------------------- the corrections the corpus actually made */

const sizes = new Set((tokens.typography?.ramp || []).map((r) => r.size));
check('the type ramp carries the steps the component walk missed',
  sizes.has(72) && sizes.has(36),
  `ramp sizes: ${[...sizes].sort((a, b) => b - a).join(', ')} — 36 and 72 caused false positives while absent`);

check('the icon size scale is populated',
  (tokens.icons?.sizes || []).length >= 8,
  `icons.sizes: ${JSON.stringify(tokens.icons?.sizes)}`);

check('…but I1 still says what it cannot measure',
  /stroke|family|SIZE ONLY/i.test(tokens.icons?.$note || ''),
  'the set name is not detectable from a rendered page and no stroke width exists in either source');

/* -------------------------------------------------- provenance must not be lost */

const readme = readFileSync(join(REPO, 'rules/README.md'), 'utf8');
check('the corpus carries its provenance warning',
  /no source URL/.test(readme) && /SDAIA/.test(readme) && /2026-08-19/.test(readme),
  'imported material without provenance is indistinguishable from invention');

const agents = readFileSync(join(REPO, 'AGENTS.md'), 'utf8');
check('AGENTS.md documents both modes and how to choose',
  /# Mode A/.test(agents) && /# Mode B/.test(agents) && /Pick by target/.test(agents));
check('…and states that neither mode covers the whole framework',
  /7 of DGA's 9 published criteria/.test(agents));

console.log('\n  ' + '─'.repeat(58));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
process.exit(bad ? 1 : 0);
