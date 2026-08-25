#!/usr/bin/env node
/*
 * library.test.mjs — is this site BUILT on the DGA library, or does it just look like it?
 *
 * WHY THIS FILE EXISTS
 *
 * Every other check in this engine measures resemblance: whether computed values match a
 * token ledger. For four sessions that was reported as design-system conformance, which is
 * a different claim — and DGA's first mandatory criterion asks for the second one.
 *
 * It has a direct answer, because DGA ships the system as @platformscode/core: 70 custom
 * elements and ~695 root custom properties. Measured while this was built,
 * design.dga.gov.sa carries 46 dga-* elements and the library tokens; dga.gov.sa carries
 * neither. DGA's own website does not use DGA's own component library.
 *
 * The failure this invites is a false positive — calling a site "implemented" because it
 * happens to define a token name. Hence three signals, and hence the spoofing assertion
 * below, which is the one that matters.
 *
 *   node test/library.test.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score } from '../src/score.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const L = (p) => JSON.parse(readFileSync(join(REPO, p), 'utf8'));
const rubric = L('data/rubric.json');
const tokens = L('data/tokens.json');
const checklist = L('data/dga-checklist.json');
const map = L('data/checklist-map.json');
const base = L('test/fixtures/regression/observed-desktop-light.json');
const judged = L('test/fixtures/regression/judged.json');

let bad = 0;
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) bad++;
};

const run = (library) => {
  const cap = { ...base };
  if (library === undefined) delete cap.library; else cap.library = library;
  const v = score({ rubric, tokens, checklist, checklistMap: map, captures: [cap], judged,
    options: { na: ['C3', 'I1', 'I2'], targetName: 't' } });
  const d1 = v.categories.flatMap((c) => c.checks).find((k) => k.id === 'D1');
  const row = v.checklist.rows.find((r) => r.n === 1);
  return { d1, row, v };
};

const LIB = (over = {}) => ({ elementCount: 0, elements: {}, tokensFound: [], tokensProbed: 8, packageRefs: [], ...over });

console.log('\n  DGA library — implemented, or merely resembled?\n  ' + '─'.repeat(58));

/* ------------------------------------------------------------ three states */

const full = run(LIB({ elementCount: 46, elements: { 'dga-icon': 45, 'dga-featured-icon': 1 },
  tokensFound: ['--colors-alpha-alpha-black-0', '--button-background-black-default'] }));
check('elements AND tokens → implemented',
  full.d1.ratio === 1 && full.row.status === map.statuses.full,
  `D1=${full.d1.ratio} criterion1=${full.row.status}`);

const elsOnly = run(LIB({ elementCount: 12, elements: { 'dga-button': 12 } }));
check('elements only → partial, not full',
  elsOnly.d1.ratio === 0.5 && elsOnly.row.status === map.statuses.partial,
  `D1=${elsOnly.d1.ratio} criterion1=${elsOnly.row.status} — a library user can render a page with no custom elements, so one signal is not proof`);

const tokensOnly = run(LIB({ tokensFound: ['--notification-alert-h-padding'] }));
check('tokens only → partial, not full',
  tokensOnly.d1.ratio === 0.5, `D1=${tokensOnly.d1.ratio}`);

const neither = run(LIB());
check('neither → not implemented',
  neither.d1.ratio === 0 && neither.row.status === map.statuses.notApplied,
  `D1=${neither.d1.ratio} criterion1=${neither.row.status}`);

check('…and the finding says resemblance, not failure to style',
  /resembles the design system rather than using it/.test(neither.d1.notes || ''),
  neither.d1.notes);

/* ------------------------------------- the false positive this design prevents */

// The whole reason D1 probes compound names rather than --radius-sm: any design system
// might coin the short ones independently. A site that defines its own --radius-sm and
// --spacing-4 must NOT read as running the DGA library.
const coincidence = run(LIB({ tokensFound: [] }));
check('a site that merely coins similar token names is not "implemented"',
  coincidence.d1.ratio === 0,
  'D1 probes --colors-alpha-alpha-black-0 and friends precisely because --radius-sm proves nothing');

check('the probed token names are compound, not generic',
  (() => { const src = readFileSync(join(REPO, 'src/probe.js'), 'utf8');
    const block = src.slice(src.indexOf('const PROBE = ['), src.indexOf('];', src.indexOf('const PROBE = [')));
    return !/--radius-sm|--spacing-4\b/.test(block) && /colors-alpha-alpha-black-0/.test(block); })(),
  'a generic name in the probe set would turn any tokenised site into a false positive');

/* ----------------------------------------------- an old capture is not a "no" */

const old = run(undefined);
check('a capture predating detection reports n/a, never "not implemented"',
  old.d1.status === 'n/a' && old.row.status === null,
  `D1=${old.d1.status} — "no library" and "never looked" are opposite answers to criterion 1`);

/* ------------------------------------------------------- the population banner */

import('../src/score.js').then(({ inlineReport }) => {
  const md = inlineReport(neither.v);
  check('the report opens by naming which population this is',
    /Not built on the DGA library/.test(md) && /resemblance, not of implementation/.test(md),
    md.split('\n').slice(0, 3).join('\n'));
  const mdFull = inlineReport(full.v);
  check('…and says so the other way for a library site',
    /Built on the DGA library/.test(mdFull) && !/Not built/.test(mdFull),
    mdFull.split('\n').slice(0, 2).join('\n'));

  console.log('\n  ' + '─'.repeat(58));
  console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
  process.exit(bad ? 1 : 0);
});
