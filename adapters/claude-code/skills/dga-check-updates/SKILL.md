---
name: dga-check-updates
description: Check whether the local DGA token ledger is still current against the published design system — the official changelog version and each Figma file's own update log. Use when the user runs /dga-check-updates, asks whether the DGA compliance check is up to date, whether the design system has changed, or whether a re-sync is due.
---

# Is the DGA ledger still current?

Read **`AGENTS.md` → "Is the ledger still current?"** in the repo (`~/dga-design-auditor`,
or `npm root -g`). It has the procedure; this file only notes what Claude Code adds.

Both sources need a browser — DGA's changelog is a client-rendered SPA and Figma returns
403 to non-browsers. The Browser pane is enough for both; neither is WAF-protected, so
there is no need to touch the user's own Chrome.

Fetching all four Figma descriptions is one call: navigate to any
`figma.com/community/file/...` page, then `fetch` the others same-origin and pull
`CreativeWork.description` out of each page's `application/ld+json`.

Then `compareFreshness()` from `src/updates.js`, and report `freshnessLine()` plus, if
anything moved, which file and what its log says changed.

## Recorded state, 18 August 2026

| | Synced | Published |
| --- | --- | --- |
| Foundations | 2026-08-17 | 2025-07-02 |
| Components Library | 2026-08-17 | 2025-11-03 |
| Mobile Components | 2026-08-18 | never amended |
| Icons | deferred | 2026-01-11 — DGA notice: mid-rewrite |

System release **1.0.3**, published 4 Nov 2025. Everything published predates the sync,
so the ledger is current. Re-run this to find out whether that is still true.
