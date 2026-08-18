#!/usr/bin/env node
/*
 * benchmark.mjs — turn a real verdict into a reference entry in data/benchmarks.json.
 *
 *   node scripts/benchmark.mjs verdict.json --id dga.gov.sa --label "dga.gov.sa/ar — the publisher's own site"
 *
 * Why a script rather than a hand-edited file: a reference line that nobody can reproduce
 * is worth less than no reference line at all. This reads the verdict the auditor actually
 * produced, carries its caveats across, and records which checks had no reading — so the
 * report can refuse to draw a comparison where one side measured nothing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const src = args.find((a) => !a.startsWith('--'));
const flag = (n, d = null) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };

if (!src) {
  console.error('usage: node scripts/benchmark.mjs <verdict.json> --id <id> [--label "..."] [--caveat "..."]');
  process.exit(2);
}

const v = JSON.parse(readFileSync(src, 'utf8'));
const id = flag('id') || (v.target?.url ? new URL(v.target.url).hostname : null);
if (!id) { console.error('benchmark: need --id'); process.exit(2); }

// Accept either a split verdict or a single one.
const perViewport = v.schema === 'dga-score-split/1'
  ? Object.fromEntries(v.viewports.filter((x) => x.captured).map((x) => [x.id, x.verdict]))
  : { web: v };

const viewports = {};
const notMeasured = new Set();
for (const [vp, d] of Object.entries(perViewport)) {
  const checks = {};
  for (const k of d.categories.flatMap((c) => c.checks)) {
    if (k.ratio != null && (k.status === 'pass' || k.status === 'fail')) checks[k.id] = k.ratio;
    else notMeasured.add(k.id);
  }
  viewports[vp] = { score: d.score, band: d.band?.label ?? null, coverage: d.coverage?.pct ?? null, checks };
}

let engine = null;
try { engine = execSync('git rev-parse --short HEAD', { cwd: REPO, encoding: 'utf8' }).trim(); } catch (e) {}

const entry = {
  id,
  label: flag('label') || id,
  auditedAt: (v.scoredAt || new Date().toISOString()).slice(0, 10),
  ledgerSynced: v.ledger?.synced ?? null,
  dgaVersion: v.ledger?.dgaVersion ?? null,
  engine,
  viewports,
  notMeasured: [...notMeasured].sort(),
  caveats: args.reduce((a, x, i) => (x === '--caveat' ? [...a, args[i + 1]] : a), []),
};

const F = join(REPO, 'data/benchmarks.json');
const db = JSON.parse(readFileSync(F, 'utf8'));
db.sites = [...(db.sites || []).filter((x) => x.id !== id), entry];
writeFileSync(F, JSON.stringify(db, null, 2) + '\n');

console.log(`benchmarks.json: ${id} recorded`);
for (const [vp, r] of Object.entries(viewports)) console.log(`  ${vp}: ${r.score} (coverage ${r.coverage}%, ${Object.keys(r.checks).length} checks)`);
if (entry.notMeasured.length) console.log(`  no reading: ${entry.notMeasured.join(', ')}`);
