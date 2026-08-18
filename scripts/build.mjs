#!/usr/bin/env node
/*
 * build.mjs — src/ + data/ -> dist/dga-rate.js, one self-contained file.
 *
 * The bundle is the whole engine: probe, scorer, renderer and the DGA ledger
 * baked in. It installs `window.__dga` and needs no network, no filesystem and
 * no dependencies, because the only capability it can assume of a host assistant
 * is "run JavaScript in a page".
 *
 *   node scripts/build.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(REPO, p), 'utf8');

// Drop $-prefixed keys: they are documentation for humans reading the JSON and
// roughly a third of its weight. docs/SPEC.md is where that prose belongs.
function strip(o) {
  if (Array.isArray(o)) return o.map(strip);
  if (o && typeof o === 'object') {
    return Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, strip(v)]));
  }
  return o;
}

const rubric = strip(JSON.parse(read('data/rubric.json')));
const tokens = strip(JSON.parse(read('data/tokens.json')));
const components = strip(JSON.parse(read('data/components.json')));
const benchmarks = strip(JSON.parse(read('data/benchmarks.json')));
const criteria = JSON.parse(read('data/dga-criteria.json'));

// Modules are authored as ESM for Node and the tests; the bundle runs as a
// classic script, so the export keywords come off. Nothing else changes.
const demodule = (src) =>
  src
    .replace(/^export (function|class|const) /gm, '$1 ')
    .replace(/^import .*$/gm, '');

const probe = demodule(read('src/probe.js'));
const score = demodule(read('src/score.js'));
const render = demodule(read('src/render.js'));

const pkg = JSON.parse(read('package.json'));

const bundle = `/*!
 * dga-rate ${pkg.version} — DGA Platforms Code compliance auditor, in one file.
 *
 * Runs entirely in the page: nothing is fetched, nothing is written to disk, and
 * only a ~6KB verdict leaves the browser. Ledger extracted ${tokens.synced} from
 * SDGA's public Figma Community files. Derived work, not an official DGA product.
 *
 *   __dga.audit({ label: 'desktop' })   -> verdict for every capture so far
 *   __dga.inline()                      -> compact markdown for a chat reply
 *   __dga.html()                        -> the full scorecard page
 *
 * ${pkg.homepage || 'https://github.com/'}
 */
(function () {
  'use strict';

  var RUBRIC = ${JSON.stringify(rubric)};
  var TOKENS = ${JSON.stringify(tokens)};
  var COMPONENTS = ${JSON.stringify(components)};
  var BENCHMARKS = ${JSON.stringify(benchmarks)};
  var CRITERIA = ${JSON.stringify(criteria)};

${probe}

${score}

${render}

  /* ------------------------------------------------------------- surface */

  // The target minimum comes from the ledger for the viewport being measured, so a
  // 375px capture is not judged by the desktop number.
  function minTargetFor(width) {
    var a = TOKENS.a11y && TOKENS.a11y.minTargetPx;
    if (!a) return RUBRIC.thresholds.minTargetPx;
    if (typeof a === 'number') return a;
    var bps = (TOKENS.breakpoints && TOKENS.breakpoints.list) || [];
    var bp = bps.filter(function (b) { return width >= (b.min || 0); })
                .sort(function (x, y) { return (y.min || 0) - (x.min || 0); })[0];
    var name = bp ? bp.name : 'desktop';
    return a[name] != null ? a[name] : (a.desktop != null ? a.desktop : RUBRIC.thresholds.minTargetPx);
  }

  var api = {
    version: '${pkg.version}',
    ledgerSynced: TOKENS.synced,
    captures: [],
    rubric: RUBRIC,
    tokens: TOKENS,
    components: COMPONENTS,
    benchmarks: BENCHMARKS,
    criteria: CRITERIA,

    /** Probe this viewport, add it to the set, and score everything captured so far. */
    audit: function (opts) {
      opts = opts || {};
      var label = opts.label || ('capture-' + (api.captures.length + 1));
      var capture = probe({ label: label, minTargetPx: minTargetFor(window.innerWidth) });
      api.captures.push(capture);
      var args = {
        rubric: RUBRIC, tokens: TOKENS, criteria: CRITERIA, benchmarks: BENCHMARKS, captures: api.captures,
        judged: opts.judged || {},
        options: {
          targetType: 'site',
          targetName: opts.targetName || document.title || location.hostname,
          targetUrl: opts.targetUrl || location.href,
          na: opts.na || [],
          allowUnassessed: !!opts.allowUnassessed,
        },
      };
      // Web and mobile are scored SEPARATELY and reported that way by default.
      // Target sizes and containers belong to a viewport, not to a site, so one
      // blended number describes neither. combined:true returns the old single
      // verdict, which the regression fixture still pins.
      var verdict = opts.combined ? score(args) : scoreByViewport(args);
      api.verdict = verdict;
      // Raw tallies stay in the page unless explicitly asked for: shipping them back
      // is 32KB per capture, which is the thing that made the old design unusable.
      if (opts.evidence) verdict.captures = api.captures;
      return verdict;
    },

    /**
     * Why is a score what it is, and what raises it?
     *   __dga.explain()                      -> every part, worst first
     *   __dga.explain({ part: "foundations" })
     *   __dga.explain({ check: "T1" })       -> what was found, and the fix
     */
    explain: function (q) { return explain(api.verdict, q || {}); },

    /**
     * Where did the points go, by place on the page?
     *   __dga.regions()            -> header / nav / main / footer, worst first
     * Points are apportioned across a check's findings by occurrence, so they are
     * approximate per row and exact per check.
     */
    regions: function (v) {
      var x = v || api.verdict;
      if (x && x.schema === 'dga-score-split/1') {
        return (x.viewports || []).filter(function (y) { return y.captured; })
          .map(function (y) { return { viewport: y.id, regions: byRegion(y.verdict) }; });
      }
      return byRegion(x);
    },

    /** Compact markdown for a chat reply. Handles a split or a single verdict. */
    inline: function (v) { return inlineReport(v || api.verdict); },

    /** The full scorecard page as an HTML string. Handles a split or a single verdict. */
    html: function (v, o) {
      var x = v || api.verdict;
      return x && x.schema === 'dga-score-split/1'
        ? renderSplitScorecard(x, o || {})
        : renderScorecard(x, o || {});
    },

    /** Render the scorecard over the page itself, for a human looking at the tab. */
    overlay: function (v) {
      var host = document.getElementById('__dga_overlay') || document.createElement('div');
      host.id = '__dga_overlay';
      host.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#f6f7f9');
      host.innerHTML =
        '<button onclick="this.parentNode.remove()" style="position:fixed;top:12px;right:16px;z-index:1;' +
        'font:600 13px system-ui;padding:6px 12px;border:1px solid #c6ccdb;border-radius:5px;background:#fff;cursor:pointer">Close</button>' +
        api.html(v);
      document.body.appendChild(host);
      return 'overlay rendered';
    },

    reset: function () { api.captures = []; api.verdict = null; return 'cleared'; },
  };

  if (typeof window !== 'undefined') window.__dga = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
`;

mkdirSync(resolve(REPO, 'dist'), { recursive: true });
writeFileSync(resolve(REPO, 'dist/dga-rate.js'), bundle);

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`dist/dga-rate.js  ${kb(bundle.length)}`);
console.log(`  ledger   ${kb(JSON.stringify(tokens).length)} (${Object.keys(tokens.color.light).length} colours, synced ${tokens.synced})`);
console.log(`  rubric   ${kb(JSON.stringify(rubric).length)} (${rubric.categories.reduce((a, c) => a + c.checks.length, 0)} checks)`);
console.log(`  code     ${kb(probe.length + score.length + render.length)}`);
