/*
 * render.js — verdict -> scorecard page. Pure: returns an HTML string, touches
 * no filesystem. Emits page content only (no doctype/html/head/body) so it can be
 * wrapped by a publisher, written to a file, or injected as an overlay.
 *
 *   renderScorecard(verdict, { shots: [{ label, dataUri }] })
 *
 * Screenshots are NOT inlined unless passed. On the audits measured so far they
 * were 97% of the disk footprint — 2.1MB of a 2.9MB report — and the same images
 * again inside the page. Downscale to ~900px JPEG before passing any.
 */

export function renderScorecard(S, { shots = [] } = {}) {

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');


const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso || '';
  }
};

const bandTone = { compliant: 'pass', substantial: 'pass', partial: 'warn', 'non-compliant': 'fail' }[S.band?.id] || 'warn';

/* ------------------------------------------------------------------ dial */

const R = 52;
const C = 2 * Math.PI * R;
const pct = Math.max(0, Math.min(100, S.score ?? 0));
// Never round the headline up: 99.57 displayed as "100" on a card whose whole
// point is that the target is not compliant is the one lie this page must not
// tell. One decimal, trailing .0 trimmed.
const shown = Number.isInteger(pct) ? String(pct) : (Math.floor(pct * 10) / 10).toFixed(1);
const dial = `
<svg class="dial" viewBox="0 0 128 128" role="img" aria-label="Score ${shown} out of 100">
  <circle cx="64" cy="64" r="${R}" class="dial-track"></circle>
  <circle cx="64" cy="64" r="${R}" class="dial-fill tone-${bandTone}"
    stroke-dasharray="${(C * pct) / 100} ${C}" stroke-dashoffset="0"
    transform="rotate(-90 64 64)"></circle>
  <text x="64" y="62" class="dial-num" text-anchor="middle" style="font-size:${shown.length > 3 ? '1.65rem' : '2.1rem'}">${shown}</text>
  <text x="64" y="82" class="dial-den" text-anchor="middle">/ 100</text>
</svg>`;

/* -------------------------------------------------------------- sections */

const statusTone = { pass: 'pass', fail: 'fail', 'n/a': 'mute', unassessed: 'warn' };
const statusLabel = { pass: 'Met', fail: 'Not met', 'n/a': 'N/A', unassessed: 'Not assessed' };

const categoryRows = (S.categories || [])
  .map((c) => {
    const graded = c.checks.filter((k) => k.status === 'pass' || k.status === 'fail');
    const applicable = c.available || 0;
    const share = applicable ? (c.earned / applicable) * 100 : 0;
    const naNote = !graded.length
      ? 'Not applicable to this target'
      : `${graded.filter((k) => k.status === 'pass').length} of ${graded.length} check${graded.length === 1 ? '' : 's'} met`;
    return `
  <details class="cat" ${share < 90 && graded.length ? 'open' : ''}>
    <summary>
      <span class="cat-name">${esc(c.label)}</span>
      <span class="cat-meter" aria-hidden="true"><span class="cat-meter-fill tone-${share >= 90 ? 'pass' : share >= 60 ? 'warn' : 'fail'}" style="width:${applicable ? share : 0}%"></span></span>
      <span class="cat-pts">${applicable ? `${c.earned}<span class="dim">/${applicable}</span>` : '<span class="dim">n/a</span>'}</span>
    </summary>
    <p class="cat-note">${esc(naNote)}${applicable ? '' : ' — its weight leaves the denominator rather than counting against the target.'}</p>
    <table class="checks">
      <thead><tr><th>Check</th><th>Requirement</th><th class="num">Compliance</th><th>Status</th></tr></thead>
      <tbody>
      ${c.checks
        .map(
          (k) => `<tr>
        <th scope="row"><code>${esc(k.id)}</code> ${esc(k.title)}${k.blocker ? ' <span class="stamp-mini" title="Blocker check">blocker</span>' : ''}</th>
        <td class="req">${esc(k.description)}</td>
        <td class="num">${k.ratio != null ? `${Math.round(k.ratio * 100)}%` : '<span class="dim">—</span>'}${k.measured?.total ? `<span class="sub">${k.measured.matched} of ${k.measured.total}</span>` : ''}</td>
        <td><span class="pill tone-${statusTone[k.status]}">${statusLabel[k.status]}</span>${k.status === 'n/a' && k.reason ? `<span class="sub">${esc(k.reason)}</span>` : ''}</td>
      </tr>`
        )
        .join('')}
      </tbody>
    </table>
  </details>`;
  })
  .join('');

const sevOrder = ['blocker', 'major', 'minor'];
const sevLabel = { blocker: 'Blockers', major: 'Major', minor: 'Minor' };
const grouped = sevOrder
  .map((sev) => ({ sev, items: (S.findings || []).filter((f) => f.severity === sev) }))
  .filter((g) => g.items.length);

const findingsHtml = grouped
  .map(
    (g) => `
  <section class="sev sev-${g.sev}">
    <h3><span class="sev-dot"></span>${sevLabel[g.sev]} <span class="count">${g.items.length}</span></h3>
    <ul class="findings">
      ${g.items
        .map(
          (f) => `<li>
        <p class="f-head"><code>${esc(f.checkId)}</code> ${esc(f.summary)}${f.occurrences ? `<span class="occ">${f.occurrences}×</span>` : ''}</p>
        <dl>
          <div><dt>Found</dt><dd><code>${esc(f.found ?? '—')}</code></dd></div>
          <div><dt>Expected</dt><dd><code>${esc(f.expected ?? '—')}</code></dd></div>
          ${f.sample ? `<div><dt>Content</dt><dd>${esc(f.sample)}</dd></div>` : ''}
          ${f.where?.length ? `<div><dt>Where</dt><dd class="where">${f.where.slice(0, 6).map((w) => `<code>${esc(w)}</code>`).join('')}</dd></div>` : ''}
          <div><dt>Fix</dt><dd>${esc(f.fix ?? '')}</dd></div>
        </dl>
      </li>`
        )
        .join('')}
    </ul>
  </section>`
  )
  .join('');

const shotsHtml = shots.length
  ? `<section class="block">
  <h2>Evidence</h2>
  <p class="lede">The captures the measurements were taken from.</p>
  <div class="shots">
    ${shots.map((s) => `<figure><img src="${s.dataUri}" alt="${esc(s.label)} capture of ${esc(S.target?.name)}"><figcaption>${esc(s.label)}</figcaption></figure>`).join('')}
  </div>
</section>`
  : '';

const capNote = S.cappedFrom
  ? `<p class="cap"><span class="stamp">Capped</span> The weighted score alone would read <strong>${esc(S.cappedFrom)}</strong>. ${S.failedBlockers.length} blocker check${S.failedBlockers.length > 1 ? 's' : ''} — ${S.failedBlockers.map((b) => `<code>${esc(b.id)}</code> ${esc(b.title)}`).join(', ')} — hold${S.failedBlockers.length > 1 ? '' : 's'} it at <strong>${esc(S.band.label)}</strong>. A service cannot be reported as compliant while failing these.</p>`
  : '';

const unassessedNote = S.unassessed?.length
  ? `<p class="cap"><span class="stamp warn">Incomplete</span> ${S.unassessed.length} judged check${S.unassessed.length > 1 ? 's were' : ' was'} not assessed (${S.unassessed.map((u) => `<code>${esc(u)}</code>`).join(', ')}) and left the denominator. The score covers everything else.</p>`
  : '';

/* ------------------------------------------------------------------ page */

const html = `<title>${esc(S.target?.name || 'Design')} Compliance Audit</title>
<style>
  /* Light is the base set; dark redefines only tokens, twice, so the toggle
     wins in both directions and the un-stamped system state still resolves. */
  :root {
    --paper:#f6f7f9; --surface:#ffffff; --sunken:#eef0f5;
    --ink:#161a22; --slate:#5c6478; --faint:#8a91a3;
    --rule:#dfe3ec; --rule-strong:#c6ccdb;
    --accent:#2d3f6b;
    --pass:#2e7d55; --warn:#94620f; --fail:#b23a30;
    --pass-bg:#e7f3ec; --warn-bg:#f8f0dd; --fail-bg:#fbeae8;
    --shadow:0 1px 2px rgba(22,26,34,.05), 0 8px 24px -12px rgba(22,26,34,.16);
    --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic",sans-serif;
    --mono:ui-monospace,SFMono-Regular,"SF Mono","Cascadia Mono","Roboto Mono",Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --paper:#0f1219; --surface:#171b24; --sunken:#1d222d;
      --ink:#e7eaf2; --slate:#a3abbd; --faint:#727a8d;
      --rule:#282e3a; --rule-strong:#3a4252;
      --accent:#8ea6dd;
      --pass:#5cbb87; --warn:#d9a441; --fail:#e8756a;
      --pass-bg:#172a20; --warn-bg:#2b2415; --fail-bg:#2d1a19;
      --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
    }
  }
  :root[data-theme="dark"] {
    --paper:#0f1219; --surface:#171b24; --sunken:#1d222d;
    --ink:#e7eaf2; --slate:#a3abbd; --faint:#727a8d;
    --rule:#282e3a; --rule-strong:#3a4252;
    --accent:#8ea6dd;
    --pass:#5cbb87; --warn:#d9a441; --fail:#e8756a;
    --pass-bg:#172a20; --warn-bg:#2b2415; --fail-bg:#2d1a19;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
  }

  * { box-sizing:border-box; }
  body {
    margin:0; background:var(--paper); color:var(--ink);
    font-family:var(--sans); font-size:16px; line-height:1.6;
    -webkit-font-smoothing:antialiased;
  }
  .wrap { max-width:60rem; margin:0 auto; padding:clamp(1.25rem,4vw,3rem) clamp(1rem,4vw,2rem) 4rem; }
  code, .num, .mono { font-family:var(--mono); font-variant-numeric:tabular-nums; }
  h1,h2,h3 { text-wrap:balance; margin:0; }
  a { color:var(--accent); }
  :focus-visible { outline:2px solid var(--accent); outline-offset:2px; border-radius:2px; }

  /* ---- masthead: this is an inspection record, so it reads like one ---- */
  .eyebrow {
    font-family:var(--mono); font-size:.7rem; letter-spacing:.14em; text-transform:uppercase;
    color:var(--faint); margin:0 0 .75rem;
  }
  .masthead { border-bottom:2px solid var(--ink); padding-bottom:1.25rem; margin-bottom:2rem; }
  .masthead h1 { font-size:clamp(1.6rem,4.5vw,2.4rem); line-height:1.15; letter-spacing:-.02em; font-weight:650; }
  .masthead .target { font-family:var(--mono); font-size:.9rem; color:var(--slate); margin:.5rem 0 0; word-break:break-all; }
  .meta { display:flex; flex-wrap:wrap; gap:.4rem 1.5rem; margin-top:1rem;
    font-family:var(--mono); font-size:.72rem; letter-spacing:.06em; text-transform:uppercase; color:var(--faint); }
  .meta b { color:var(--slate); font-weight:500; }

  /* ---- verdict ---- */
  .verdict {
    display:grid; grid-template-columns:auto 1fr; gap:clamp(1rem,4vw,2.5rem); align-items:center;
    background:var(--surface); border:1px solid var(--rule); border-radius:6px;
    padding:clamp(1.25rem,3vw,2rem); box-shadow:var(--shadow);
  }
  @media (max-width:34rem) { .verdict { grid-template-columns:1fr; text-align:left; } }
  .dial { width:128px; height:128px; display:block; }
  .dial-track { fill:none; stroke:var(--sunken); stroke-width:10; }
  .dial-fill { fill:none; stroke-width:10; stroke-linecap:butt; transition:stroke-dasharray .6s ease; }
  .dial-fill.tone-pass { stroke:var(--pass); } .dial-fill.tone-warn { stroke:var(--warn); } .dial-fill.tone-fail { stroke:var(--fail); }
  .dial-num { font-family:var(--mono); font-size:2.1rem; font-weight:600; fill:var(--ink); }
  .dial-den { font-family:var(--mono); font-size:.72rem; fill:var(--faint); letter-spacing:.08em; }
  @media (prefers-reduced-motion:reduce) { .dial-fill { transition:none; } }

  .band { font-size:clamp(1.3rem,3.5vw,1.9rem); font-weight:650; letter-spacing:-.015em; margin:0 0 .35rem; }
  .band.tone-pass { color:var(--pass); } .band.tone-warn { color:var(--warn); } .band.tone-fail { color:var(--fail); }
  .tally { font-family:var(--mono); font-size:.85rem; color:var(--slate); }
  .cap { margin:1rem 0 0; padding:.75rem .9rem; background:var(--sunken); border-inline-start:3px solid var(--fail);
    border-radius:0 4px 4px 0; font-size:.88rem; line-height:1.55; }
  .stamp { display:inline-block; font-family:var(--mono); font-size:.62rem; letter-spacing:.14em; text-transform:uppercase;
    color:var(--fail); border:1.5px solid var(--fail); border-radius:3px; padding:.1rem .4rem; margin-inline-end:.5rem;
    transform:rotate(-1.5deg); vertical-align:.05em; }
  .stamp.warn { color:var(--warn); border-color:var(--warn); }
  .stamp-mini { font-family:var(--mono); font-size:.6rem; letter-spacing:.1em; text-transform:uppercase;
    color:var(--fail); border:1px solid var(--fail); border-radius:2px; padding:0 .25rem; }

  /* ---- blocks ---- */
  .block { margin-top:3rem; }
  .block > h2 { font-size:1.15rem; letter-spacing:-.01em; padding-bottom:.5rem; border-bottom:1px solid var(--rule-strong); }
  .lede { color:var(--slate); font-size:.92rem; margin:.75rem 0 1.25rem; max-width:62ch; }

  /* ---- category ledger ---- */
  .cat { border-bottom:1px solid var(--rule); }
  .cat > summary { display:grid; grid-template-columns:minmax(7rem,14rem) 1fr auto; gap:1rem; align-items:center;
    padding:.8rem .25rem; cursor:pointer; list-style:none; }
  .cat > summary::-webkit-details-marker { display:none; }
  .cat > summary:hover .cat-name { color:var(--accent); }
  .cat-name { font-family:var(--mono); font-size:.75rem; letter-spacing:.09em; text-transform:uppercase; color:var(--ink); }
  .cat-meter { height:7px; background:var(--sunken); border-radius:1px; overflow:hidden; min-width:3rem; }
  .cat-meter-fill { display:block; height:100%; }
  .cat-meter-fill.tone-pass { background:var(--pass); } .cat-meter-fill.tone-warn { background:var(--warn); } .cat-meter-fill.tone-fail { background:var(--fail); }
  .cat-pts { font-family:var(--mono); font-size:.85rem; min-width:4.5rem; text-align:end; }
  .dim { color:var(--faint); }
  .cat-note { margin:.25rem .25rem 1rem; font-size:.84rem; color:var(--slate); }

  table.checks { width:100%; border-collapse:collapse; font-size:.85rem; margin-bottom:1.5rem; }
  .checks th, .checks td { text-align:start; padding:.55rem .6rem; border-top:1px solid var(--rule); vertical-align:top; }
  .checks thead th { font-family:var(--mono); font-size:.65rem; letter-spacing:.12em; text-transform:uppercase;
    color:var(--faint); border-top:0; border-bottom:1px solid var(--rule-strong); font-weight:500; }
  .checks tbody th { font-weight:550; width:32%; }
  .checks .req { color:var(--slate); width:38%; }
  .checks .num { text-align:end; white-space:nowrap; }
  .sub { display:block; font-family:var(--mono); font-size:.68rem; color:var(--faint); margin-top:.15rem; font-weight:400; }
  .pill { display:inline-block; font-family:var(--mono); font-size:.65rem; letter-spacing:.08em; text-transform:uppercase;
    padding:.15rem .45rem; border-radius:3px; white-space:nowrap; }
  .pill.tone-pass { background:var(--pass-bg); color:var(--pass); }
  .pill.tone-fail { background:var(--fail-bg); color:var(--fail); }
  .pill.tone-warn { background:var(--warn-bg); color:var(--warn); }
  .pill.tone-mute { background:var(--sunken); color:var(--faint); }
  .scroll-x { overflow-x:auto; }

  /* ---- findings ---- */
  .sev { margin-top:2rem; }
  .sev h3 { font-family:var(--mono); font-size:.75rem; letter-spacing:.12em; text-transform:uppercase;
    display:flex; align-items:center; gap:.5rem; color:var(--slate); }
  .sev .count { font-size:.7rem; color:var(--faint); }
  .sev-dot { width:9px; height:9px; border-radius:50%; display:inline-block; }
  .sev-blocker .sev-dot { background:var(--fail); } .sev-major .sev-dot { background:var(--warn); } .sev-minor .sev-dot { background:var(--faint); }
  ul.findings { list-style:none; margin:.75rem 0 0; padding:0; display:flex; flex-direction:column; gap:.6rem; }
  ul.findings > li { background:var(--surface); border:1px solid var(--rule); border-radius:5px; padding:.9rem 1rem; }
  .sev-blocker ul.findings > li { border-inline-start:3px solid var(--fail); }
  .sev-major ul.findings > li { border-inline-start:3px solid var(--warn); }
  .sev-minor ul.findings > li { border-inline-start:3px solid var(--rule-strong); }
  .f-head { margin:0 0 .6rem; font-weight:550; font-size:.95rem; }
  .f-head code { font-size:.72rem; background:var(--sunken); padding:.1rem .35rem; border-radius:3px; color:var(--accent); margin-inline-end:.4rem; }
  .occ { font-family:var(--mono); font-size:.7rem; color:var(--faint); margin-inline-start:.5rem; }
  .findings dl { margin:0; display:grid; gap:.3rem; font-size:.85rem; }
  .findings dl > div { display:grid; grid-template-columns:5.5rem 1fr; gap:.75rem; }
  @media (max-width:30rem) { .findings dl > div { grid-template-columns:1fr; gap:.1rem; } }
  .findings dt { font-family:var(--mono); font-size:.64rem; letter-spacing:.1em; text-transform:uppercase;
    color:var(--faint); padding-top:.22rem; }
  .findings dd { margin:0; color:var(--slate); min-width:0; overflow-wrap:anywhere; }
  .findings dd code { font-size:.78rem; color:var(--ink); }
  .where code { display:block; color:var(--slate); font-size:.72rem; }

  /* ---- evidence ---- */
  .shots { display:grid; grid-template-columns:repeat(auto-fit,minmax(15rem,1fr)); gap:1rem; }
  .shots figure { margin:0; }
  .shots img { width:100%; height:auto; display:block; border:1px solid var(--rule); border-radius:4px; background:var(--sunken); }
  .shots figcaption { font-family:var(--mono); font-size:.68rem; letter-spacing:.1em; text-transform:uppercase;
    color:var(--faint); margin-top:.45rem; }

  /* ---- method ---- */
  .method { margin-top:3rem; padding-top:1.25rem; border-top:1px solid var(--rule-strong);
    font-size:.83rem; color:var(--slate); }
  .method h2 { font-family:var(--mono); font-size:.7rem; letter-spacing:.12em; text-transform:uppercase;
    color:var(--faint); margin-bottom:.75rem; font-weight:500; }
  .method p { margin:0 0 .7rem; max-width:70ch; }
  .method code { font-size:.78rem; }
  .formula { font-family:var(--mono); font-size:.8rem; background:var(--sunken); padding:.6rem .8rem;
    border-radius:4px; display:block; overflow-x:auto; color:var(--ink); }
</style>

<div class="wrap">

  <header class="masthead">
    <p class="eyebrow">${esc(S.standard?.name || 'Design system')} · compliance audit</p>
    <h1>${esc(S.target?.name || 'Untitled target')}</h1>
    ${S.target?.url ? `<p class="target">${esc(S.target.url)}</p>` : ''}
    <div class="meta">
      <span>Audited <b>${esc(fmtDate(S.scoredAt))}</b></span>
      <span>Target <b>${esc(S.target?.type || '—')}</b></span>
      <span>Ledger synced <b>${esc(S.ledger?.synced ? fmtDate(S.ledger.synced) : 'never')}</b></span>
      ${S.ledger?.dgaVersion ? `<span>DGA release <b>${esc(S.ledger.dgaVersion)}</b></span>` : ''}
      <span>Captures <b>${(S.target?.captures || []).length}</b></span>
    </div>
  </header>

  <section class="verdict">
    ${dial}
    <div>
      <p class="band tone-${bandTone}">${esc(S.band?.label || '—')}</p>
      <p class="tally">${S.checksPassed} of ${S.checksCounted} applicable checks met · ${S.earned} of ${S.available} points${S.checksTotal && S.checksCounted !== S.checksTotal ? ` · ${S.checksTotal - S.checksCounted} of ${S.checksTotal} not applicable to a ${esc(S.target?.type)} target` : ''}</p>
      ${capNote}
      ${unassessedNote}
    </div>
  </section>

  ${S.parts?.length ? `<section class="block">
    <h2>The three parts of the system</h2>
    <p class="lede">Each part is scored out of 100 within its own weight, so they can be compared with each other and with the overall. Foundations is what the Foundations file defines; Components is the Components Library and Icons; Standards is the RTL and accessibility guidance, which is not a library and so is a part of its own.</p>
    <div class="scroll-x"><table class="checks">
      <thead><tr><th>Part</th><th>Covers</th><th class="num">Score</th><th class="num">Points</th><th class="num">Checks met</th></tr></thead>
      <tbody>${S.parts.map((p) => `<tr>
        <th scope="row">${esc(p.label)}<span class="sub">${esc(p.source || "")}</span></th>
        <td class="req">${esc(p.covers || "")}</td>
        <td class="num">${p.score == null ? '<span class="dim">n/a</span>' : `${esc(p.score)}<span class="sub">of 100</span>`}</td>
        <td class="num">${esc(p.earned)}<span class="sub">of ${esc(p.available)}</span></td>
        <td class="num">${p.checksPassed} of ${p.checksCounted}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </section>` : ""}

  <section class="block">
    <h2>Where the points went</h2>
    <p class="lede">Nine categories, ${S.checksTotal} checks. Each category shows points earned against points available for this target — a check that cannot apply leaves the denominator rather than counting as a failure. Open a row for the individual checks.</p>
    <div class="scroll-x">${categoryRows}</div>
  </section>

  ${
    findingsHtml
      ? `<section class="block">
    <h2>Findings</h2>
    <p class="lede">${S.findings.length} finding${S.findings.length === 1 ? '' : 's'}, most severe first. Blockers cap the compliance band regardless of the score.</p>
    ${findingsHtml}
  </section>`
      : `<section class="block"><h2>Findings</h2><p class="lede">No findings — every applicable check was met.</p></section>`
  }

  ${shotsHtml}

  <section class="method">
    <h2>How the number was produced</h2>
    <p>Every measured value came from a deterministic pass over the target — computed styles, contrast ratios and authored CSS for a site; bound variables and node metadata for a Figma frame. The same target audited twice produces the same score.</p>
    <span class="formula">score = Σ(weight × compliance) ÷ Σ(applicable weight) × 100</span>
    <p>Coverage checks return a fraction weighted by how often a value actually occurs, so one stray colour on a rarely-used element does not cost what a wrong body colour does. An ordinary check counts as met at 90% compliance or above; a blocker check only at 100%, because WCAG conformance and mark usage are not proportional. Colours are matched in OKLab at ΔE ≤ 2 — about one just-noticeable difference.</p>
    <p>Blocker checks — off-palette brand colour, mark misuse, text and non-text contrast — cap the band at <em>Partial</em> however high the number climbs. The score itself is never adjusted.</p>
    <p>Measured against <code>${esc(S.ledger?.source?.fileName || 'the DGA library')}</code>${S.ledger?.synced ? `, extracted ${esc(fmtDate(S.ledger.synced))}` : ''}. ${esc(S.standard?.authority || '')}${S.standard?.arabicName ? ` · ${esc(S.standard.arabicName)}` : ''}.</p>
  </section>

</div>
`;

  return html;
}

/* ------------------------------------------------- split: web vs mobile */

/**
 * Two viewports on one page, each with its own score.
 *
 * Built by rendering each verdict through renderScorecard and stitching the
 * bodies under one masthead — the per-verdict renderer stays untouched and
 * therefore stays the thing the tests already cover. The shared header carries
 * the comparison, which is the reason for the split: seeing 63.6 against 66.4
 * tells you where to look, and a single blended 64.9 does not.
 */
export function renderSplitScorecard(split, { shots = [] } = {}) {
  const scored = split.viewports.filter((v) => v.captured);
  if (!scored.length) throw new Error('renderSplitScorecard: no captured viewport to render');

  const parts = scored.map((v) => ({ v, html: renderScorecard(v.verdict, { shots }) }));
  const head = parts[0].html.slice(0, parts[0].html.indexOf('<div class="wrap">'));

  const bodyOf = (html) => {
    const open = html.indexOf('<div class="wrap">') + '<div class="wrap">'.length;
    const close = html.lastIndexOf('</div>');
    return html
      .slice(open, close)
      // one masthead for the page, not one per viewport
      .replace(/<header class="masthead">[\s\S]*?<\/header>/, '');
  };

  const e = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const tone = (b) => ({ compliant: 'pass', substantial: 'pass', partial: 'warn', 'non-compliant': 'fail' }[b] || 'warn');

  const compare = `
  <section class="block" style="margin-top:0">
    <h2>Two viewports, scored separately</h2>
    <p class="lede">A page can pass at desktop width and fail at phone width — target sizes and containers are
    properties of a viewport, not of a site. Blending them into one number describes neither, so each is scored
    on its own. Split at ${split.breakpoint}px, the DGA desktop breakpoint.</p>
    <div class="scroll-x">
      <table class="checks">
        <thead><tr><th>Viewport</th><th class="num">Score</th><th class="num">Checks met</th><th>Band</th></tr></thead>
        <tbody>
        ${scored.map((v) => `<tr>
          <th scope="row">${e(v.label)} <span class="sub">${v.captures.map((c) => e(c.width) + 'px').join(', ')}</span></th>
          <td class="num">${e(v.verdict.score)}<span class="sub">of 100</span></td>
          <td class="num">${v.verdict.checksPassed} of ${v.verdict.checksCounted}</td>
          <td><span class="pill tone-${tone(v.verdict.band.id)}">${e(v.verdict.band.label)}</span>${v.verdict.cappedFrom ? `<span class="sub">capped from ${e(v.verdict.cappedFrom)}</span>` : ''}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${split.viewports.filter((v) => !v.captured).map((v) => `<p class="cap"><span class="stamp warn">Not captured</span> ${e(v.note)}</p>`).join('')}
  </section>`;

  const masthead = `
  <header class="masthead">
    <p class="eyebrow">${e(split.standard?.name || 'DGA Platforms Code')} · compliance audit</p>
    <h1>${e(split.target?.name || 'Untitled target')}</h1>
    ${split.target?.url ? `<p class="target">${e(split.target.url)}</p>` : ''}
    <div class="meta">
      <span>Audited <b>${e((split.scoredAt || '').slice(0, 10))}</b></span>
      <span>Ledger synced <b>${e(split.ledger?.synced || 'never')}</b></span>
      ${split.ledger?.dgaVersion ? `<span>DGA release <b>${e(split.ledger.dgaVersion)}</b></span>` : ''}
      <span>Viewports <b>${scored.length}</b></span>
    </div>
  </header>`;

  const sections = parts.map(({ v, html }) => `
  <section class="block">
    <h2 style="font-size:1.35rem">${e(v.label)} — ${e(v.verdict.score)}/100 · ${e(v.verdict.band.label)}</h2>
    ${bodyOf(html)}
  </section>`).join('\n');

  return `${head}<div class="wrap">\n${masthead}\n${compare}\n${sections}\n</div>\n`;
}
