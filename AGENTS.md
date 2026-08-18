# DGA design auditor — agent instructions

You are auditing a website or a Figma design against the **DGA Platforms Code**
(كود المنصات), Saudi Arabia's national design system for government platforms, and
returning a score out of 100 built from 28 concrete checks.

These instructions are assistant-agnostic. They assume exactly one capability: **you
can run JavaScript in a web page.** Everything else — the measuring, the scoring, the
report — happens inside that page.

> The score is a compliance signal, not a style opinion. Government services carry
> statutory accessibility duties, and a national design system exists so that a
> citizen moving between two ministries recognises both. Report the honest number.

---

## The one rule

**Measure first, judge last, and never let judgement touch a number a script produced.**

Twenty-two of the 28 checks are computed from extracted data. Six — `C3`, `P1`, `P2`,
`P3`, `I1`, `I2` — need your eyes. Assess those honestly and pass them in; let the
engine decide everything else.

If you find yourself wanting to adjust a computed score because it "feels" wrong, the
fix is a better measurement or a corrected ledger, not a nudged number. A compliance
score that moves between runs of the same target is worthless. The engine is
deterministic by construction — same inputs, same output, every time.

---

## Running an audit

### 1. Load the engine

`dist/dga-rate.js` is one self-contained file: probe, scorer, renderer and the DGA
ledger, ~107 KB, no dependencies and no network calls of its own. Get it into the page
by whichever of these your environment allows, cheapest first:

```js
// a) fetch from a CDN — cheapest when the page's CSP permits it
await fetch('https://unpkg.com/dga-design-auditor/dist/dga-rate.js')
  .then(r => r.text()).then(eval);

// b) paste the file contents directly as the script you execute
//    (use this when connect-src blocks the fetch — most government sites do)

// c) the user runs it themselves from a bookmarklet or DevTools console
```

Confirm it landed: `typeof window.__dga === 'object'`.

### 2. Assert the page is real — every capture, no exceptions

```js
document.querySelectorAll('*').length > 100 &&
  !/Request Rejected|requested URL was rejected|Access Denied/i.test(document.body.innerText)
```

**This check is not optional.** A WAF rejection page renders a valid DOM, and the probe
will happily measure it: Times New Roman on white, one blue link, and a plausible score
for a page the organisation never designed. A wrong number is worse than no number.

If the assertion fails, stop and report the block. Do not retry in a loop, and do not
attempt to evade the WAF — spoofing user agents or proxying would produce a score that
does not describe what a real visitor sees, which is the only thing the number means.
If your environment has a sandboxed browser *and* access to the user's own browser, the
user's own is the one that gets through; say which you used.

### 3. Capture each viewport

```js
__dga.audit({ label: 'desktop-1280' })   // then resize the viewport and repeat
__dga.audit({ label: 'mobile-375' })
```

Captures accumulate inside the page and merge automatically, so each call returns the
verdict for everything measured so far. Take **desktop and mobile** at minimum; add a
dark-scheme capture if the target has one, and a second desktop capture after scrolling
if the page lazy-loads a lot of content.

Reload after resizing so load-time responsive gates re-run.

Only a **~6 KB verdict** comes back. The raw tallies stay in the page unless you pass
`{ evidence: true }` — ask for them only when the audit is a compliance record that
someone will need to re-check.

### 4. Assess the judged checks

Read `__dga.components` first, so you are comparing against a spec rather than an
impression. Pass results into the final `audit()` call:

```js
__dga.audit({ label: 'mobile-375', judged: {
  P1: { ratio: 0.611, counted: { matched: 11, total: 18 }, notes: 'bespoke buttons, pill radius' }
} })
```

`counted` is **required**. The engine recomputes the ratio from it, rejects the pair if
they disagree by more than a rounding step, and reports the count beside the score. A
bare `ratio` is refused, because 0.62 with nothing behind it cannot be checked by the
person reading the scorecard — and the judged checks are 27 of the 100 points.

| Check | What to judge |
| --- | --- |
| `C3` | Are success / warning / error / info tokens used only for their meaning, and do those roles use nothing else? |
| `P1` | Do buttons, inputs, cards, tabs, tables, nav, modals match a DGA component by anatomy — or are they bespoke rebuilds? |
| `P2` | Are the variants, sizes and hover/active/disabled/**focus** states the ones the system defines? |
| `P3` | Do internal padding, icon–label gap and min-height match the spec within 1px? |
| `I1` | One icon family, at scale sizes, at the specified stroke weight. |
| `I2` | **Blocker, binary.** Official marks: approved variant, at or above minimum size, clear space intact, not recoloured or cropped. |

**Every ratio must come from a count you can state** — "11 of 18 instances" — never a
feeling. If a check's baseline was never synced into the ledger, do not guess it: pass
its id in `na` instead. Scoring `I1` against an icon set you never loaded is inventing
evidence, and for `I2` it would move a government identity gate on nothing.

By default the engine **refuses to score** when a judged check is neither assessed nor
marked `na`, because silently dropping the component checks is how a rebuild scores as
compliant.

### Where the points went — never report a check without a place

`__dga.regions()` groups every finding by the part of the page it sits in — header,
navigation, main, footer, and the named section inside it — using the page's own landmarks
and headings. Report it. "P1 lost 4.84" names a check and helps nobody; "the service cards
in «الخدمات الأكثر استخداماً» are at radius 16 where the library says 4" is a task someone
can pick up.

Per-row points are **apportioned** across a check's findings by occurrence, not measured
per element. Print them with `≈` and say so once. The per-check total is exact; the split
across places is arithmetic on top of it, and presenting arithmetic as measurement is the
mistake this rubric has spent its whole life removing.

### The 100, and what is outside it

Every point in the score traces to something DGA published or something the law requires.
Each check names it in `authority`: a Figma token path, or a WCAG 2.2 success criterion,
or a W3C i18n requirement. A check that cannot name one does not belong in the 100.

Two checks measure practices **nobody published** — `R2` (CSS logical properties, which
Figma cannot express) and `M2` (prefers-reduced-motion). They are still measured, still
reported, and scored in `verdict.extended` **outside the 100**. They never cap a band. Do
not fold them back in: 5 points of a government compliance score resting on an inference is
the difference between a number that survives a meeting and one that does not.

### The reference line

`verdict.reference` compares the target to a stored reading from `data/benchmarks.json` —
`dga.gov.sa`, the publisher's own site. Report it beside the score:

> Overall 71.2 · dga.gov.sa scores 71.8 on the same rubric

This is **context, not a threshold.** The band always comes from the absolute score against
the ledger. DGA's own site is evidence of practice, not a definition of compliance — it
diverges from its own published library, which is a finding about the site rather than a
correction to the rubric. And a comparison is only drawn where BOTH sides measured the
check; where the reference has no reading, print `—` and the reason, never a win.

### Coverage — read this before reporting any number

The score is `earned / available`, so **every check that leaves the denominator makes
the rest count for more.** Measuring less raises the number. On the regression fixture,
marking six checks `na` moves it from 64.89 to 82.43.

The verdict therefore carries a `coverage` block, and every report must state it:

- `coverage.pct` — how much of the applicable rubric was actually measured
- `coverage.dropped` — every missing check with its weight and the reason
- `provisional` — true below the evidence floor; the band is capped and cannot read
  above Partial however high the number goes

Two gaps, two treatments. A gap you **chose** — `na`, or an automated-only run that
skips the judged checks — scores, flagged provisional. A gap **nobody chose**, where
the engine expected a measurement and got nothing, stops the audit with
`SILENT_COVERAGE_LOSS`: that is a broken capture, and a broken capture reads as a
better site. Never report a bare score without its coverage.

---

## Reporting the result

Two formats. Pick by what the person asked for; default to inline.

**Inline** — `__dga.inline()` returns compact markdown for a chat reply: the score, the
band, `X of N` checks met, the category table, any blocker, and the three findings that
would move the score most. This is the answer to "rate this site".

**Page** — `__dga.html()` returns the full scorecard as an HTML string: score dial,
category bars, findings grouped by severity, and the methodology. Save it, publish it,
or `__dga.overlay()` to render it over the page for someone looking at the tab.

Screenshots are **not** inlined by default. On real audits they were 97% of the output
size — a 1.5 MB full-page PNG plus the same images again inside the page. Capture them
only when a finding needs visual proof, and downscale to ~900 px JPEG first.

### Always lead with two numbers

The weighted score **and** how many of the checks were met. One without the other
misleads: 90/100 with 12 of 23 checks met is a very different page from 90/100 with 21
of 23.

| Band | Score |
| --- | --- |
| Compliant | 90–100 |
| Substantially compliant | 75–89 |
| Partial | 60–74 |
| Non-compliant | < 60 |

A failed blocker — off-palette brand colour, mark misuse, text or non-text contrast —
holds the band at **Partial** however high the number climbs. The number is never
adjusted; the band carries the gate, and the report names what capped it. Blockers are
held to **full** compliance, not 90%: one text run below 4.5:1 means the page does not
conform, however good the other ninety-nine are.

---

## Reporting discipline

- **Report the honest number.** A low score is the useful output; a flattering one is a
  wasted audit. Never round up, never "adjust for context".
- **Say what you could not measure**, specifically. Cross-origin stylesheets, text over
  photographs, pages behind a login, a component the page simply does not have — each
  lowers confidence somewhere nameable. Checks that cannot be measured leave the
  denominator rather than counting as failures, and you should say which ones did.
- **Name the viewport** when findings cluster in one. "24 of 25 target-size failures are
  desktop-only footer links" is actionable; a merged ratio is not.
- **Never edit the target.** You audit; fixing is a separate decision the user makes.
- **If the ledger looks wrong mid-audit** — a token that cannot be right — say so and
  stop, rather than scoring against it. Re-syncing is cheap; a wrong baseline is not.

---

## Keeping the ledger current

`data/tokens.json` and `data/components.json` are extracted from SDGA's public Figma
Community files; `data/sources.json` lists all 23 of them and which rubric checks each
one closes. Four are the design system itself:

| File | Closes |
| --- | --- |
| Foundations | `S2` `E2` `E3` `M1` `C4` |
| Components Library | `C1–C3` `T1–T4` `S1` `E1` `P1–P3` |
| Icons | `I1` |
| Mobile Components | `P1–P3` `A4` at mobile widths |

Re-syncing needs Figma Dev Mode, which is a separate workflow from auditing — see
`docs/SYNC.md`. Two rules from experience: **keep the Figma variable path as the token
key**, because that path is what a finding quotes back to a designer; and **cross-check
against a page the ledger was not built from**, which is the only step that finds what
you did not know to look for.

Campaign files — National Day, Founding Day, Hajj — are never synced. Their palettes are
seasonal artwork and would teach the auditor that a campaign colour is compliant.

---

## Is the ledger still current?

The score is only as good as the baseline it was measured against, so every report
states what that baseline is — `ledger.dgaVersion` and `ledger.synced` come back in the
verdict and need no network. Whether something **newer** has been published is a
separate, deliberate check.

**Neither source can be fetched without a browser.** DGA's changelog is a
client-rendered SPA, and Figma's community pages return 403 to anything that is not a
browser. Both were tested. So gathering the inputs is your job; `src/updates.js` only
does the parsing and comparison, which keeps the fallible part testable.

Gather three things, then hand them to `compareFreshness()`:

1. **The system version** — open `https://design.dga.gov.sa/updates/change-log` and read
   the page text. It is Arabic-only; entries look like `الإصدار 1.0.3 - 4 نوفمبر 2025`.
   Pass the text to `parseChangelog()`. Per-version detail lives at
   `/updates/change-log/version-history-1-0-3`.
2. **Per-file logs** — for each `system`-tier entry in `data/sources.json`, open its
   community URL and read the `description` out of the page's `application/ld+json`
   (`CreativeWork.description`). It carries a `---- Updates ----` block. Pass each to
   `parseFileUpdates()`. From a figma.com page you can fetch the others same-origin and
   do all four in one call.
3. **What the ledger recorded** — `data/sources.json` and `data/tokens.json`.

```js
import { parseChangelog, parseFileUpdates, compareFreshness, freshnessLine } from './src/updates.js';
const freshness = compareFreshness({ sources, changelog, published, syncedAt: tokens.synced, dgaVersion: tokens.dgaVersion });
freshnessLine(freshness);  // one line, safe to put at the top of a report
```

**What the comparison knows that a date alone does not:**

- A **deferred** source moving does not make the ledger stale. Skipping Icons is a
  decision, not drift, and re-raising it every check is nagging.
- **Template-tier files are ignored.** They are page references, not token sources.
- A file with **no `---- Updates ----` block** has never been amended. That is not an
  error and not a gap — Mobile Components is like this.
- A log entry saying a file is **mid-rewrite** is surfaced as a `notice`, because it is
  a reason *not* to sync. Icons currently carries one dated 11 Jan 2026.

Report the verdict plainly. If the ledger is behind, say which file changed and what its
log says changed in it — "Components Library, 3 Nov 2025: Digital Stamp text" is
actionable in a way that "something moved" is not.

---

## Web and mobile are scored separately

`audit()` returns a **split** by default — one verdict per viewport, no combined
figure. This is deliberate and it is not a display choice.

Target sizes and container widths are properties of a *viewport*, not of a site. A
page can pass at 1440 and fail at 390. Averaging the two produces a number that
describes neither, and the one thing an auditor must not do is report a figure that
is true of nothing. On the regression fixture the split reads **Web 63.63 / Mobile
66.42**, where the blended figure was 64.89 — the 2.8-point spread is the finding,
and blending hid it.

```js
const split = window.__dga.audit({ label: 'desktop' });   // capture 1
// resize to 390, then:
const both  = window.__dga.audit({ label: 'mobile' });    // capture 2, both scored
both.viewports;      // [{ id:'web', captured, verdict }, { id:'mobile', … }]
both.score;          // undefined — there is no combined score, by design
window.__dga.inline(both);   // two tables, then each viewport in full
window.__dga.html(both);     // one page, comparison header, both sections
```

The split point is the ledger's own desktop breakpoint (`768`), so if DGA move it,
this moves with it.

**Capture both viewports.** A viewport with no capture is reported as a stated gap,
never as a pass — but a gap is still a hole in the audit. If a window will not
resize, say which viewport you measured and which you did not, rather than letting
one number stand for both.

`audit({ combined: true })` returns the old single verdict. It exists for the
regression fixture and for comparing against historical scores; it is not the
reporting format.

---

## Three parts, and answering "why" and "how do I fix it"

Every verdict rolls its nine categories into the three parts DGA actually publishes,
so a score can be read against the part of the system it belongs to:

| Part | Pts | Backed by |
| --- | --: | --- |
| **Foundations** | 58 | the Foundations file — colour, type ramp, spacing and radius scales, elevation, motion |
| **Components** | 24 | Components Library + Icons — anatomy, variants, states, icon set, marks |
| **Standards** | 18 | DGA guidance, not a library — RTL/bilingual and WCAG accessibility |

Standards is a part of its own because it is backed by no library; folding it into
either of the others would misattribute an accessibility failure to a component.

Each part is **normalised to 100 within its own weight**, so `Foundations 66` and
`Components 57` are directly comparable. `earned/available` keeps the raw points,
which is what says where the real cost is.

**The rollup never changes the overall.** A grouping that moves the number is a
re-weighting in disguise; `parts.test.mjs` pins the fixture at 64.89 through it.

### The site-level overall is the worst viewport

`split.overall` takes the **weaker** viewport, not an average — per part as well as
in total. An average lets a strong desktop hide a failing phone, which is the blur
the viewport split exists to remove. It carries `from` (which viewport it came from)
and `basis` (saying it is not a mean), so nobody has to assume.

### Answering questions

```js
__dga.explain()                       // every part, worst first
__dga.explain({ part: 'components' }) // one part: points lost, and what recovers them
__dga.explain({ check: 'T1' })        // one check: what was found, versus what was expected, and the fix
```

Every answer has the same shape — **what was lost, why, and what recovers it** — and
`recoverable` is sorted by points, because "fix this and gain 5" is actionable in a
way that "this failed" is not.

Judged checks (`P1`–`P3`, `C3`, `I1`, `I2`) carry a stated count in `notes` rather
than findings, and `explain` reads both. Those are the checks people ask about most,
so an explanation that only read findings would come back empty exactly where it
matters.

When the user asks about a split, `explain` answers per viewport — the same question
can have different answers at 1440 and 390, which is the point of scoring them apart.
