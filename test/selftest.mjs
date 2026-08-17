#!/usr/bin/env node
/*
 * selftest.mjs — proves the scoring engine does what the rubric says.
 *
 *   node test/selftest.mjs
 *
 * Builds synthetic captures against a known ledger and asserts the five
 * behaviours the score depends on: a clean target scores 100, a blocker caps the
 * band without touching the number, unassessed judged checks refuse to score, an
 * unsynced ledger refuses to score, and the same input scores identically twice.
 *
 * Run this after any change to score.mjs or rubric.json.
 */

import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score } from '../src/score.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = mkdtempSync(join(tmpdir(), 'dga-selftest-'));

/* ------------------------------------------------------------ the ledger */

const tokens = {
  synced: '2026-01-01',
  source: { fileKey: 'FIXTURE', fileName: 'Fixture Library' },
  color: {
    light: {
      'color/brand/primary': '#006C35',
      'color/text/primary': '#1A1A1A',
      'color/text/secondary': '#5C5C5C',
      'color/surface/default': '#FFFFFF',
      'color/surface/subtle': '#F4F4F4',
      'color/border/default': '#767676',
      'color/status/success': '#127C39',
      'color/status/error': '#C0281C',
    },
    dark: {},
    roles: {
      brand: ['color/brand/primary'],
      border: ['color/border/default'],
      semantic: { success: ['color/status/success'], warning: [], error: ['color/status/error'], info: [] },
    },
  },
  typography: {
    families: { latin: ['IBM Plex Sans'], arabic: ['IBM Plex Sans Arabic'] },
    weights: [400, 500, 600, 700],
    ramp: [
      { name: 'body/md', size: 16, lineHeight: 24, letterSpacing: 0, weight: 400, script: 'both' },
      { name: 'heading/lg', size: 24, lineHeight: 32, letterSpacing: 0, weight: 700, script: 'both' },
    ],
  },
  spacing: { base: 4, scale: [4, 8, 12, 16, 24, 32, 48, 64], rhythm: [32, 48, 64] },
  radius: { scale: [0, 4, 8, 12], pill: 9999 },
  border: { widths: [1, 2] },
  elevation: { levels: { 'level-1': '0 1px 2px rgba(0, 0, 0, 0.08)' } },
  breakpoints: {
    list: [
      { name: 'mobile', min: 0, container: 375, gutter: 16 },
      { name: 'desktop', min: 1280, container: 1200, gutter: 24 },
    ],
  },
  icons: { set: 'DGA', sizes: [16, 20, 24], strokeWidth: 1.5 },
  motion: { durations: [150, 250], easings: ['cubic-bezier(0.4, 0, 0.2, 1)'] },
  numerals: 'western',
};

/* ---------------------------------------------------------- the captures */

const t = (pairs) => ({ total: pairs.reduce((a, [, n]) => a + n, 0), values: pairs.map(([value, count]) => ({ value, count, samples: ['main > div.card'] })) });

function capture({ label, width, container, gutter, textRuns = 100, textPassing = 100, contrastFindings = [],
                   colorScheme = 'light', renderedScheme = 'light' }) {
  return {
    schema: 'dga-observed/1',
    label,
    capturedAt: '2026-01-01T00:00:00.000Z',
    url: 'https://fixture.test/',
    title: 'Fixture',
    viewport: { width, height: 800, dpr: 2 },
    colorScheme,
    renderedScheme,
    documentDark: false,
    document: { dir: 'ltr', lang: 'en', elementsExamined: 400, elementsTotal: 400, truncated: false },
    rootCustomProperties: {},
    fontFaces: ['IBM Plex Sans'],
    tallies: {
      textColor: t([['#1a1a1a', 60], ['#5c5c5c', 25]]),
      bgColor: t([['#ffffff', 40], ['#f4f4f4', 12], ['#006c35', 6]]),
      borderColor: t([['#767676', 18]]),
      svgFill: t([['#1a1a1a', 9]]),
      fontFamily: t([['IBM Plex Sans', 85]]),
      fontSize: t([['16', 70], ['24', 15]]),
      fontWeight: t([['400', 70], ['700', 15]]),
      lineHeight: t([['24', 70], ['32', 15]]),
      letterSpacing: t([['0', 85]]),
      spacing: t([['8', 30], ['16', 40], ['24', 20], ['32', 10], ['48', 6]]),
      gap: t([['8', 12], ['16', 10]]),
      radius: t([['4', 14], ['8', 9]]),
      borderWidth: t([['1', 18]]),
      shadow: t([['0 1px 2px rgba(0, 0, 0, 0.08)', 7]]),
      duration: t([['150', 12], ['250', 5]]),
      easing: t([['cubic-bezier(0.4, 0, 0.2, 1)', 17]]),
      iconSize: t([['20', 9]]),
      strokeWidth: t([['1.5', 9]]),
    },
    layout: { container, gutter, documentWidth: width, horizontalOverflow: false },
    contrast: { textRuns, passing: textPassing, indeterminate: 0, findings: contrastFindings },
    nonTextContrast: { checked: 18, passing: 18, findings: [] },
    targets: { interactive: 24, passing: 24, findings: [] },
    focus: { probed: 20, visible: 20, missing: [] },
    rtl: { rtlElements: 0, ltrElements: 400, arabicRuns: 0, arabicRunsInArabicFace: 0, arabicIndicNumerals: 0, westernNumerals: 12, unmirroredDirectionalIcons: 0 },
    css: { rulesRead: 900, inaccessibleSheets: 0, logicalDecls: 140, physicalDecls: 0, physicalSamples: [], reducedMotionRules: 2, focusVisibleRules: 6, outlineNoneRules: 0, rtlOverrideRules: 0 },
  };
}

const judgedPerfect = Object.fromEntries(
  ['C3', 'P1', 'P2', 'P3', 'I1', 'I2'].map((id) => [id, { ratio: 1, notes: 'fixture: fully compliant' }])
);

const w = (name, obj) => {
  const p = join(DIR, name);
  writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
};

const tokensPath = w('tokens.json', tokens);
const unsyncedPath = w('tokens-unsynced.json', { ...tokens, synced: null });
const judgedPath = w('judged.json', judgedPerfect);
const judgedPartialPath = w('judged-partial.json', { C3: { ratio: 1 }, P1: { ratio: 1 } });

const desktop = w('observed-desktop.json', capture({ label: 'desktop-light', width: 1280, container: 1200, gutter: 24 }));
const mobile = w('observed-mobile.json', capture({ label: 'mobile-light', width: 375, container: 375, gutter: 16 }));

const failing = w(
  'observed-contrast.json',
  capture({
    label: 'desktop-light',
    width: 1280,
    container: 1200,
    gutter: 24,
    textRuns: 100,
    textPassing: 80,
    contrastFindings: [
      { selector: 'footer > p.legal', text: 'All rights reserved', fg: '#9a9a9a', bg: '#ffffff', ratio: 2.61, required: 4.5, fontSize: 14, fontWeight: 400 },
    ],
  })
);

/* -------------------------------------------------------------- harness */

// Calls the pure core directly. The CLI-shaped argument arrays are kept as-is,
// because every assertion below reads better as the command a person would run —
// and keeping them meant none of the 13 assertions had to change when scoring
// moved out of Node and into the page.
const rubric = JSON.parse(readFileSync(resolve(HERE, '../data/rubric.json'), 'utf8'));
const CODES = { NO_CAPTURES: 2, LEDGER_UNSYNCED: 3, UNASSESSED_JUDGED: 4 };

function run(extra, expectCode = 0, tokensFile = tokensPath) {
  const captures = [];
  let judged = {}, na = [];
  for (let i = 0; i < extra.length; i += 2) {
    const flag = extra[i], val = extra[i + 1];
    if (flag === '--observed') captures.push(JSON.parse(readFileSync(val, 'utf8')));
    else if (flag === '--judged') judged = JSON.parse(readFileSync(val, 'utf8'));
    else if (flag === '--na') na = val.split(',');
  }
  try {
    const json = score({
      rubric,
      tokens: JSON.parse(readFileSync(tokensFile, 'utf8')),
      captures, judged,
      options: { targetType: 'site', targetName: 'Fixture', na },
    });
    return { ok: expectCode === 0, status: 0, stderr: '', json };
  } catch (e) {
    const status = CODES[e.code] ?? 1;
    return { ok: status === expectCode, status, stderr: e.message, json: null };
  }
}

let failures = 0;
function check(name, cond, detail = '') {
  const mark = cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m';
  console.log(`  ${mark} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) failures++;
}

console.log('\n  DGA scoring engine — self test\n  ' + '─'.repeat(50));

/* 1 — a clean target scores 100 */
const clean = run(['--observed', desktop, '--observed', mobile, '--judged', judgedPath]);
check('clean target scores exactly 100', clean.json?.score === 100, `got ${clean.json?.score} (${clean.stderr || ''})`);
check('clean target bands as Compliant', clean.json?.band?.id === 'compliant', `got ${clean.json?.band?.id}`);
check('clean target has no findings', (clean.json?.findings?.length ?? -1) === 0, `got ${clean.json?.findings?.length} — ${JSON.stringify(clean.json?.findings?.slice(0, 2))}`);
check(
  'inapplicable checks leave the denominator',
  clean.json?.available === 92 && clean.json?.checksCounted === 25,
  `available ${clean.json?.available} (expected 92: 100 less C4 dark 3, R1 3, R3 2), counted ${clean.json?.checksCounted} of ${clean.json?.checksTotal} (expected 25 of 28)`
);

/* 2 — the government gate: a blocker caps the band without touching the number */
const gated = run(['--observed', failing, '--observed', mobile, '--judged', judgedPath]);
check('contrast failure still scores in the 90s', gated.json?.score > 90 && gated.json?.score < 100, `got ${gated.json?.score}`);
check('…but the band is capped at Partial', gated.json?.band?.id === 'partial', `got ${gated.json?.band?.id}`);
check('…and the cap records what it dropped from', gated.json?.cappedFrom === 'Compliant', `got ${gated.json?.cappedFrom}`);
check('…naming A1 as the blocker', gated.json?.failedBlockers?.some((b) => b.id === 'A1'), JSON.stringify(gated.json?.failedBlockers));
check('…and the finding carries blocker severity', gated.json?.findings?.some((f) => f.checkId === 'A1' && f.severity === 'blocker'), 'no blocker-severity A1 finding');

/* 3 — judged checks cannot be silently skipped */
const skipped = run(['--observed', desktop, '--judged', judgedPartialPath], 4);
check('unassessed judged checks refuse to score', skipped.ok, `exit ${skipped.status}, expected 4`);
check('…and the error names them', /P2.*P3.*I1.*I2|P2, P3, I1, I2/.test(skipped.stderr || ''), (skipped.stderr || '').split('\n')[0]);

/* 4 — an unsynced ledger refuses to score */
const unsynced = run(['--observed', desktop], 3, unsyncedPath);
check('unsynced ledger refuses to score', unsynced.status === 3, `got ${unsynced.status}, expected 3`);

/* 5 — determinism, which is the whole premise */
const again = run(['--observed', desktop, '--observed', mobile, '--judged', judgedPath]);
const strip = (j) => JSON.stringify({ ...j, scoredAt: null });
check('the same input scores identically twice', strip(clean.json) === strip(again.json), `${clean.json?.score} vs ${again.json?.score}`);

/* 6 — a dark-mode MACHINE auditing a light page must still score colour.
   Found on a real audit: the viewer's OS was in dark mode, the target had no
   dark theme and rendered light, and bucketing on prefers-color-scheme emptied
   the light set. C1 and C2 came back "nothing of this kind present to measure"
   and the entire 18-point colour category left the denominator without a word. */
const darkMachine = run([
  '--observed', w('observed-darkmachine.json', capture({ label: 'desktop', width: 1280, container: 1200, gutter: 24, colorScheme: 'dark', renderedScheme: 'light' })),
  '--judged', judgedPath,
]);
const dmColour = darkMachine.json?.categories?.find((c) => c.id === 'color');
check(
  'a dark-mode machine on a light page still scores colour',
  dmColour?.available === 15,
  `colour available ${dmColour?.available} (expected 15: C1 8 + C2 4 + C3 3, C4 n/a without a dark set)`
);
check(
  '…and C1 is graded rather than written off as nothing to measure',
  dmColour?.checks?.find((k) => k.id === 'C1')?.status === 'pass',
  `C1 ${dmColour?.checks?.find((k) => k.id === 'C1')?.status} — ${dmColour?.checks?.find((k) => k.id === 'C1')?.reason || ''}`
);

/* …while a genuinely dark page still routes to the dark set, which is empty in
   this ledger, so C1 correctly finds nothing. */
const trulyDark = run([
  '--observed', w('observed-trulydark.json', capture({ label: 'dark', width: 1280, container: 1200, gutter: 24, colorScheme: 'dark', renderedScheme: 'dark' })),
  '--judged', judgedPath,
]);
check(
  'a genuinely dark render still routes to the dark set',
  trulyDark.json?.categories?.find((c) => c.id === 'color')?.checks?.find((k) => k.id === 'C1')?.status === 'n/a',
  `C1 ${trulyDark.json?.categories?.find((c) => c.id === 'color')?.checks?.find((k) => k.id === 'C1')?.status}`
);

console.log('\n  ' + '─'.repeat(50));
console.log(failures ? `\x1b[31m  ${failures} failing\x1b[0m` : '\x1b[32m  all passing\x1b[0m');
// Kept so the renderer can be eyeballed against a known verdict without running a
// real audit: the blocker case is the interesting one, since it is the only fixture
// where the band and the number disagree.
writeFileSync(join(DIR, 'verdict-clean.json'), JSON.stringify(clean.json, null, 2));
writeFileSync(join(DIR, 'verdict-blocker.json'), JSON.stringify(gated.json, null, 2));
console.log(`  fixtures  ${DIR}\n`);
process.exit(failures ? 1 : 0);
