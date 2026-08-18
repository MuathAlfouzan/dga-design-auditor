---
name: dga-audit
description: Score a live site or a Figma design against the DGA "Platforms Code" design system, out of 100, with a per-check breakdown. Use when the user runs /dga-audit, or asks to check a design or site for DGA / SDAIA / national design system compliance, to score design-system adherence, or to find off-token colours, type, spacing or accessibility failures against the standard.
---

# Audit a design against DGA Platforms Code

`/dga-audit <target>` — a URL, or a Figma node id for a design open in Figma desktop.
With no argument, ask what to audit.

**The workflow lives in the repo, not here.** Find the checkout (try
`~/dga-design-auditor`, then `npm root -g`), then read:

1. **`AGENTS.md`** — the agent itself: the probe/score/render loop, the judged checks,
   the reporting rules. Portable, and shared with every other assistant.
2. **`adapters/claude-code/dga-design-auditor.md`** — only what differs in Claude Code:
   which of the two browsers to reach for, and how to publish a scorecard as an Artifact.

Keeping one copy of the workflow is what stops this skill and the portable agent from
drifting into two subtly different auditors.

## The short version

The engine runs **inside the page**. Nothing is written to disk unless the user asks
for evidence.

```javascript
// in the page, via whichever browser tool applies
window.__dga.audit({ label: 'desktop' });   // then resize and capture mobile
```

**Two scores, always** — web and mobile are scored separately and reported as two
results. There is no combined number: a single figure across both viewports describes
neither. Capture both; a viewport you did not measure is reported as a gap, not a pass.

Load it from the CDN when the page allows it, or paste `dist/dga-rate.js` when CSP or a
WAF blocks the fetch. `AGENTS.md` covers both.

## Reporting

Ask, or infer from how the request was phrased:

- **inline** — a compact table in chat. The default for "what does this score?"
- **page** — build the HTML with `render()` and publish it with the Artifact tool, for
  anything being shared with other people.

Lead with the two numbers together: the weighted score **and** `X of N` checks met.
Then the band, then any blocker that capped it.

| Band | Score |
| --- | --- |
| Compliant | 90–100 |
| Substantially compliant | 75–89 |
| Partial | 60–74 |
| Non-compliant | < 60 |

A failed blocker holds the band at **Partial** however high the number goes. The number
is never adjusted; the band carries the gate.
