#!/usr/bin/env node
/*
 * parts.test.mjs — the three parts of the system, and the "why / how do I fix it"
 * queries built on them.
 *
 * Two things matter here and neither is cosmetic. Part scores must roll up
 * without changing the overall — a grouping that moves the number is a
 * re-weighting in disguise. And the site-level overall must be the WORST
 * viewport, never an average, or a strong desktop hides a failing phone.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { score, scoreByViewport, explain, inlineReport } from '../src/score.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const R = (p) => JSON.parse(readFileSync(join(REPO, p), 'utf8'));
const F = 'test/fixtures/regression/';

const rubric = R('data/rubric.json');
const tokens = R('data/tokens.json');
const captures = ['observed-desktop-light.json', 'observed-mobile-light.json'].map((f) => R(F + f));
const judged = R(F + 'judged.json');
const options = { targetType: 'site', targetName: 'Parts fixture', na: ['C3', 'I1', 'I2'] };

let bad = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
  if (!ok) bad++;
};
const ok = (name, cond, detail = '') => eq(name, cond ? true : detail || false, true);

console.log('\n  Parts and explain\n  ' + '─'.repeat(52));

/* ---- the rubric itself --------------------------------------------------- */
eq('three parts declared', rubric.parts.map((p) => p.id), ['foundations', 'components', 'standards']);
// The parts carry the CORE weight only. Extended checks (R2 logical properties, M2
// reduced motion) measure practices DGA never published, so they sit outside the 100 —
// but the two halves must still account for every point, or weight has gone missing.
eq('part weights sum to the declared core weight', rubric.parts.reduce((a, p) => a + p.weight, 0), rubric.scoring.coreWeight);
eq('core + extended = 100', rubric.scoring.coreWeight + rubric.scoring.extendedWeight, 100);
eq('extended weight is exactly the extended checks',
  rubric.categories.flatMap((c) => c.checks).filter((k) => k.scope === 'extended').reduce((a, k) => a + k.weight, 0),
  rubric.scoring.extendedWeight);
ok('every core check names the authority behind it',
  rubric.categories.flatMap((c) => c.checks).filter((k) => k.scope !== 'extended').every((k) => typeof k.authority === 'string' && k.authority.length > 8),
  rubric.categories.flatMap((c) => c.checks).filter((k) => k.scope !== 'extended' && !k.authority).map((k) => k.id).join(', '));
ok('every category is mapped to a part', rubric.categories.every((c) => rubric.parts.some((p) => p.id === c.part)),
  rubric.categories.filter((c) => !c.part).map((c) => c.id).join(', '));
for (const part of rubric.parts) {
  const sum = rubric.categories.filter((c) => c.part === part.id).reduce((a, c) => a + c.weight, 0);
  eq(`${part.id} categories sum to its declared weight`, sum, part.weight);
}

/* ---- the rollup must not move the number --------------------------------- */
const v = score({ rubric, tokens, captures, judged, options });
eq('overall is unchanged by the rollup', v.score, 65.2);
const partPoints = v.parts.reduce((a, p) => a + p.earned, 0);
ok('part points reconcile with the verdict total', Math.abs(partPoints - v.earned) <= 0.02,
  `parts ${partPoints.toFixed(2)} vs earned ${v.earned} — each part is rounded once, so a cent of drift is expected and more is not`);
ok('every part is normalised to 100', v.parts.every((p) => p.score === null || (p.score >= 0 && p.score <= 100)),
  JSON.stringify(v.parts.map((p) => p.score)));
ok('a part with nothing measurable scores null, not zero',
  v.parts.every((p) => p.available > 0 || p.score === null), 'zero would read as total failure');

/* ---- recoverable points are the actionable half -------------------------- */
const comp = v.parts.find((p) => p.id === 'components');
ok('components lists what would recover it', comp.recoverable.length > 0);
ok('…ranked by points, biggest first',
  comp.recoverable.every((r, i, a) => i === 0 || a[i - 1].points >= r.points),
  JSON.stringify(comp.recoverable.map((r) => r.points)));
ok('…and every entry carries a fix', comp.recoverable.every((r) => typeof r.fix === 'string' && r.fix.length > 10));

/* ---- explain ------------------------------------------------------------- */
const eCheck = explain(v, { check: 'T1' });
eq('explain(check) names the check', eCheck.checkId, 'T1');
ok('…states what was lost', eCheck.lost > 0 && eCheck.of === 5, `lost ${eCheck.lost} of ${eCheck.of}`);
ok('…gives the evidence', eCheck.why.length > 0, 'a "why" with no evidence is an assertion');
ok('…and the fix', typeof eCheck.fix === 'string' && eCheck.fix.length > 10);

// The judged checks are the ones a person most often asks about, and they carry
// a stated count in notes rather than findings. An explain that only read
// findings came back empty on exactly those.
const eJudged = explain(v, { check: 'P3' });
ok('explain works on a judged check, which has notes not findings',
  eJudged.why.length > 0 && /\d+ of \d+/.test(eJudged.why[0].summary), JSON.stringify(eJudged.why));

const ePart = explain(v, { part: 'foundations' });
eq('explain(part) scopes to that part', ePart.parts.map((p) => p.id), ['foundations']);
ok('…and reports points still on the table', ePart.parts[0].lost > 0);
eq('explain rejects an unknown part with the valid list',
  /No part "nope"/.test(explain(v, { part: 'nope' }).error || ''), true);

/* ---- the site overall is the worst viewport, never an average ------------- */
const split = scoreByViewport({ rubric, tokens, captures, judged, options });
const web = split.viewports.find((x) => x.id === 'web').verdict.score;
const mob = split.viewports.find((x) => x.id === 'mobile').verdict.score;
eq('overall is the worse viewport', split.overall.score, Math.min(web, mob));
ok('…and is not the average', split.overall.score !== Math.round(((web + mob) / 2) * 100) / 100,
  `web ${web}, mobile ${mob} — an average would hide the weaker one`);
ok('…and says so', /worst viewport/.test(split.overall.basis));
eq('overall names which viewport it came from', split.overall.from, web <= mob ? 'web' : 'mobile');

ok('part scores are compared across viewports too', split.overall.parts.every((p) => p.score === null || p.byViewport.length === 2));
for (const p of split.overall.parts) {
  if (p.score === null) continue;
  const lowest = Math.min(...p.byViewport.map((b) => b.score));
  eq(`${p.id} overall takes the weaker viewport`, p.score, lowest);
}

/* ---- the reports carry it ------------------------------------------------ */
const single = inlineReport(v);
ok('single-verdict report shows the parts table', /\| Part \| Score \| Points \| Checks met \|/.test(single));
const both = inlineReport(split);
ok('split report leads with the overall', /Overall .*\/100/.test(both));
ok('…shows parts per viewport', /\| Part \| Web \| Mobile \| Overall \|/.test(both));
ok('…and states the overall is not an average', /only as compliant as its weakest/.test(both));

/* ---- a declared family name is not the typeface ---------------------------
   Found on dga.gov.sa, which serves IBMPlexSansArabic-*.ttf under the local
   names regularFont / boldFont / mediumFont / semiBoldFont. Matching the ledger
   on the declared name scored the exactly-correct typeface as 0 of 108 runs and
   cost the full 5 points of T1 plus half of R3. The check has to follow the
   @font-face src to the file that actually loads. */
const baseCap = R(F + 'observed-desktop-light.json');
const withFamily = (family, faceMap) => {
  const c = JSON.parse(JSON.stringify(baseCap));
  c.tallies.fontFamily = { total: 100, values: [{ value: family, count: 100, samples: ['p'] }] };
  c.fontFaceMap = faceMap;
  return c;
};
const t1Of = (cap) => score({ rubric, tokens, captures: [cap], judged,
  options: { targetType: 'site', targetName: 'x', na: ['C3', 'I1', 'I2'], allowUnassessed: true } })
  .categories.flatMap((c) => c.checks).find((k) => k.id === 'T1');

const aliasRight = t1Of(withFamily('regularFont', { regularFont: 'IBMPlexSansArabic' }));
eq('an alias resolving to the DGA face passes T1', [aliasRight.status, aliasRight.ratio], ['pass', 1]);

const aliasWrong = t1Of(withFamily('brandFont', { brandFont: 'Diodrum' }));
eq('an alias resolving to another face still fails', [aliasWrong.status, aliasWrong.ratio], ['fail', 0]);

const noMap = t1Of(withFamily('IBM Plex Sans Arabic', {}));
eq('a directly-declared correct family still passes without a map', noMap.status, 'pass');

const unmapped = t1Of(withFamily('Comic Sans MS', {}));
eq('an unmapped wrong family still fails', unmapped.status, 'fail');

console.log('\n  ' + '─'.repeat(52));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
process.exit(bad ? 1 : 0);
