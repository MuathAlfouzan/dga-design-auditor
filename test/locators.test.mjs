#!/usr/bin/env node
/*
 * locators.test.mjs — does a finding know WHERE it is?
 *
 * WHY THIS FILE EXISTS
 *
 * The report used to answer "where did P1 lose 4.84 points?" with a CSS path —
 * `div.container > div.row > a.btn`. That tells a developer how to select the element and
 * tells nobody where it is on the page. The fix was to read the page's own landmarks and
 * headings, so the words in the report are the words on the screen.
 *
 * The failure mode worth testing is the quiet one: `locate()` returning null region and
 * null section for everything, leaving every row filed under "unplaced". That renders as a
 * perfectly tidy table that has lost the entire point of the feature — so these assertions
 * are about resolution, not about shape.
 *
 *   node test/locators.test.mjs
 */

import { writeFileSync, mkdtempSync, readFileSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const BUNDLE = resolve(REPO, 'dist/dga-rate.js');
const FIXTURES = resolve(HERE, 'fixtures/checks');

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => existsSync(p));

if (!existsSync(BUNDLE)) { console.error('locators.test: run `npm run build` first.'); process.exit(2); }
if (!CHROME) { console.error('locators.test: no Chrome found; this test needs a real engine.'); process.exit(0); }

const DIR = mkdtempSync(join(tmpdir(), 'dga-loc-'));
copyFileSync(BUNDLE, join(DIR, 'dga-rate.js'));

function run(fixture) {
  const html = readFileSync(join(FIXTURES, fixture), 'utf8').replace('</body>', `
    <pre id="out"></pre>
    <script src="./dga-rate.js"></script>
    <script>
      try {
        var v = window.__dga.audit({ label: 'fx', combined: true, allowUnassessed: true,
                                     allowLowCoverage: true, na: ['P1','P2','P3','C3','I1','I2'],
                                     evidence: true });
        // every locator the probe produced, from the tally samples
        var locs = [];
        (v.captures || []).forEach(function (c) {
          Object.keys(c.tallies || {}).forEach(function (k) {
            (c.tallies[k].values || []).forEach(function (e) {
              (e.samples || []).forEach(function (sm) { if (sm && typeof sm === 'object') locs.push(sm); });
            });
          });
        });
        document.getElementById('out').textContent = JSON.stringify({ ok: true, locs: locs,
          regions: byRegionSummary(v) });
        function byRegionSummary(v) {
          return (window.__dga.regions ? window.__dga.regions(v) : []).map(function (g) {
            return { region: g.region, section: g.section, points: g.points, rows: g.rows.length };
          });
        }
      } catch (e) {
        document.getElementById('out').textContent = JSON.stringify({ ok: false, error: String(e && e.stack || e) });
      }
    </script></body>`);
  const page = join(DIR, fixture);
  writeFileSync(page, html);
  const dom = execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-sandbox',
    '--allow-file-access-from-files', '--window-size=1280,900', '--virtual-time-budget=4000',
    '--dump-dom', `file://${page}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
  if (!m) throw new Error(`${fixture}: no output. Chrome said:\n${dom.slice(0, 400)}`);
  const p = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  if (!p.ok) throw new Error(`${fixture}: the bundle threw\n${p.error}`);
  return p;
}

let bad = 0;
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${cond ? '' : `\n      ${detail}`}`);
  if (!cond) bad++;
};

console.log('\n  Locators — does a finding know where it is?\n  ' + '─'.repeat(58));

const R = run('regions.html');
const regionsSeen = new Set(R.locs.map((l) => l.region).filter(Boolean));
const sectionsSeen = new Set(R.locs.map((l) => l.section).filter(Boolean));
const namesSeen = new Set(R.locs.map((l) => l.name).filter(Boolean));

check('locators are objects, not bare CSS paths',
  R.locs.length > 0 && R.locs.every((l) => typeof l === 'object' && 'sel' in l),
  `got ${R.locs.length} samples`);

check('the landmark regions resolve',
  ['header', 'navigation', 'main', 'footer'].every((r) => regionsSeen.has(r)),
  `saw: ${[...regionsSeen].join(', ') || '(none)'}`);

check('an aria-label names its section',
  sectionsSeen.has('الخدمات الأكثر استخداماً'),
  `sections: ${[...sectionsSeen].join(' | ') || '(none)'}`);

check('an unlabelled section falls back to its own heading',
  sectionsSeen.has('الأخبار'),
  `sections: ${[...sectionsSeen].join(' | ') || '(none)'}`);

check('elements outside every landmark are still placed by the preceding heading',
  R.locs.some((l) => !l.region && l.section),
  'an element in no landmark should still carry the nearest heading before it');

check('the element name is the words on the screen',
  namesSeen.has('تسجيل الدخول') && namesSeen.has('ابدأ الخدمة'),
  `names: ${[...namesSeen].slice(0, 8).join(' | ')}`);

check('every locator carries document coordinates',
  R.locs.every((l) => l.at === null || (Number.isFinite(l.at.x) && Number.isFinite(l.at.y))),
  'at.x / at.y must be numbers so a human can find the element');

// The quiet failure: everything filed under "unplaced" is a tidy table with no information.
const placed = R.locs.filter((l) => l.region || l.section).length;
check('most locators are actually placed, not filed as unplaced',
  placed / R.locs.length > 0.8,
  `${placed} of ${R.locs.length} placed — a table of "unplaced" rows has lost the point`);

/* the no-landmark case: pass.html has no header/nav/main, only headings */
const P = run('pass.html');
const pSections = new Set(P.locs.map((l) => l.section).filter(Boolean));
check('a page with no landmarks is still placed by its headings',
  pSections.size > 0,
  `pass.html has no landmark elements; headings must carry it. sections: ${[...pSections].join(' | ') || '(none)'}`);

console.log('\n  ' + '─'.repeat(58));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
process.exit(bad ? 1 : 0);
