---
name: dga-audit
description: Audit a live site or a Figma design against the DGA "Platforms Code" design system — readiness against DGA's mandatory criteria, plus an adoption score and a per-check breakdown. Use when the user runs /dga-audit, or asks to check a site or design for DGA / SDAIA / national design system compliance, to score design-system adherence, or to find off-token colours, type, spacing or accessibility failures against the standard. For a codebase use /dga-review instead — that reads source, this measures a rendered page.
---

# Audit a design against DGA Platforms Code

`/dga-audit <target>` — a URL, or a Figma node id for a design open in Figma desktop.
With no argument, ask what to audit.

> **A codebase belongs to `/dga-review`.** This mode measures what rendered; reasoning
> about a rendered result from source is how an audit invents findings, because the
> cascade, the effective background and the loaded typeface are only knowable from the page.

**The workflow lives in the repo, not here.** Find the checkout (try
`~/dga-design-auditor`, then `npm root -g`), then read:

1. **`AGENTS.md` → Mode A** — the probe/score/render loop, the judged checks, the
   reporting rules. Portable, and shared with every other assistant.
2. **`adapters/claude-code/dga-design-auditor.md`** — only what differs in Claude Code:
   which of the two browsers to reach for, and how to publish a scorecard as an Artifact.

Keeping one copy of the workflow is what stops this skill and the portable agent from
drifting into two subtly different auditors.

## Loading the engine

```js
// 1. open the CDN URL AT A PINNED COMMIT, and carry the source across the navigation
//    (dga.gov.sa and most government targets block every cross-origin request)
//    → https://cdn.jsdelivr.net/gh/MuathAlfouzan/dga-design-auditor@<sha>/dist/dga-rate.js
window.name = document.body.innerText;   // then navigate to the target
(0, eval)(window.name);                  // and evaluate it there

// 2. or paste dist/dga-rate.js directly when even that is blocked
```

⚠ **Pin the commit SHA. Never `@main`** — jsDelivr caches branch refs hard and has served
a stale bundle that cost a debugging cycle. Confirm the build landed by checking for a
string from the current commit, not just a non-zero byte count.

## The short version

The engine runs **inside the page**. Nothing is written to disk unless the user asks
for evidence.

```javascript
window.__dga.audit({ label: 'desktop-1280', judged: {...}, na: [...] });
window.__dga.regions();   // where the points went, by part of the page
```

**Two viewports, always** — web and mobile are scored separately. There is no combined
number: a single figure across both describes neither. A viewport you did not capture is
reported as a gap, not a pass.

**Judged checks require a count.** `C3` `P1` `P2` `P3` `I1` `I2` need your eyes, and each
must be supplied as `{ ratio, counted: { matched, total } }`. A bare ratio is refused —
0.62 with nothing behind it cannot be checked by the person reading the scorecard.

## Reporting

Ask, or infer from how the request was phrased:

- **inline** — a compact report in chat. The default for "what does this score?"
- **page** — build the HTML with `html()` and publish it with the Artifact tool, for
  anything being shared with other people.

**Lead with the verdict, never with the number.** DGA publishes no passing score: it
publishes a checklist, gates on its mandatory tier, and confirms conformance by formal
review. So the headline is DGA's question, not ours:

```
✗ Not yet · DGA mandatory criteria 1 of 5 met
Open: معايير الخطوط و الألوان (C1, T1) · إمكانية الوصول (A1, A2, A3)

Adoption 70.8% · Moderate adoption · dga.gov.sa baseline 71.8
Coverage 88.4% of the rubric measured
```

Then the region table — *where* the points went, by part of the page — then the ranked
losses. Points in the region table are ≈apportioned by occurrence; say so once.

`verdict.readiness` has three states, and collapsing them loses the point:

| | |
| --- | --- |
| `ready` | every mandatory criterion met |
| `not-yet` | one or more open, each named with its blocking checks |
| `unconfirmed` | nothing failed, but something could not be looked at |

**An unmeasured check never counts as met.** Absence is different from a gap: "this target
ships no dark theme" hides nothing, "the browser could not observe focus" hides everything
it would have measured.

## Adoption levels — not compliance verdicts

| Level | Score |
| --- | --- |
| Full adoption | 90–100 |
| High adoption | 75–89 |
| Moderate adoption | 60–74 |
| Limited adoption | < 60 |

These describe **how much of the interface is built from the DGA system**. They are not a
compliance judgement, and must never be reported as one — that verdict belongs to DGA's own
review. The gate is `verdict.readiness`; blockers feed the criterion they belong to rather
than capping this band. Only thin evidence caps it, and then the report says so.
