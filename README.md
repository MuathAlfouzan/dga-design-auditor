# dga-design-auditor

**[Handbook](docs/guide.html)** — what it does, the four ways to run it, how the score is built, and what it refuses to do.

Score any website against the **DGA Platforms Code** — Saudi Arabia's national design
system for government platforms — out of 100, from 28 concrete checks, with a
per-check breakdown and a shareable scorecard.

It runs entirely inside the page. No server, no build step in the target, nothing
written to disk, and only a ~6 KB verdict leaves the browser.

```js
// paste dist/dga-rate.js into any browser console, then:
__dga.audit({ label: 'desktop' });
__dga.inline();     // compact markdown for a chat reply
__dga.overlay();    // the full scorecard, rendered over the page
```

## What it measures

| | Category | Pts |
| --- | --- | --: |
| C1–C4 | Colour & tokens | 18 |
| T1–T4 | Typography | 16 |
| S1–S3 | Spacing & layout | 12 |
| E1–E3 | Shape & elevation | 8 |
| P1–P3 | Components | 18 |
| I1–I2 | Iconography & brand | 6 |
| R1–R3 | RTL & bilingual | 8 |
| A1–A4 | Accessibility | 10 |
| M1–M2 | Motion | 4 |

Colours are matched in OKLab at ΔE ≤ 2 — about one just-noticeable difference, so a
designer cannot see a pass and can see a fail. Coverage checks are weighted by how often
a value actually occurs, so one stray colour on a rarely-used element does not cost what
a wrong body colour does.

**The government gate:** a failed blocker — off-palette brand colour, mark misuse, text
or non-text contrast — holds the band at *Partial* however high the number climbs. The
score itself is never adjusted. Blockers are held to full compliance, not 90%, because
WCAG conformance is not proportional.

**Checks that cannot be measured leave the denominator** rather than counting as
failures. A page with no status components does not fail the semantic-colour check; it
reports `n/a`, and the report says so.

## Use it with an AI assistant

[`AGENTS.md`](AGENTS.md) is the whole agent, written for any assistant that can run
JavaScript in a page. Paste it in, or point your assistant at it. It carries the
workflow, the judged checks, both output formats, and the reporting discipline.

## Use it directly

```bash
npm install dga-design-auditor
```

```js
import { score, inlineReport } from 'dga-design-auditor';
import { probe } from 'dga-design-auditor/probe';
import { renderScorecard } from 'dga-design-auditor/render';
```

`probe()` runs in a browser and returns a capture; `score()` and `renderScorecard()` are
pure and run anywhere.

## Tests

```bash
npm test
```

Three suites, 41 assertions:

- **selftest** — the scoring rules: a clean target scores exactly 100, a single contrast
  blocker scores 99.57 but bands *Partial*, unassessed judged checks refuse to score,
  an unsynced ledger refuses to score, and the same input scores identically twice.
- **parity** — re-scores a real saved audit and requires the number to come back
  byte-identical. Guards against a refactor quietly changing the maths.
- **probe** — loads a fixture DOM in headless Chrome and asserts on measurements whose
  right answers are known. It exists because a bug once made the probe read 25 of 1021
  CSS rules and silently report zero logical properties; reintroduce that bug and this
  suite fails.

## Attribution

**This is a derived work and not an official DGA product.**

The design system is authored and published by the **Digital Government Authority
(DGA / SDGA), Kingdom of Saudi Arabia**. Everything in `data/` is an extract of their
public Figma Community files, listed with their source ids in
[`data/sources.json`](data/sources.json).

The extract is offered for convenience, not as an authority. Regenerate it from source
whenever you need to be certain — see [`docs/SYNC.md`](docs/SYNC.md) — and treat the
Figma files as the truth if they ever disagree with this copy.

Two things were deliberately excluded from the ledger and are worth knowing about,
because both look like tokens and are not: Shopify Polaris variables left in a
documentation page (`var(--p-color-text)`, and a `--p-sapce-600` carrying Polaris's own
misspelling), and the green/red "do and avoid" annotation swatches from the guidance
frames. Admitting either would teach the auditor that an off-brand grey, or the colour
used to mean *correct* in a diagram, is compliant.

MIT licensed. The licence covers this tooling, not the design standard.
