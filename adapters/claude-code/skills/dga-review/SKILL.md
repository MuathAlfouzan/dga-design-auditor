---
name: dga-review
description: Review a codebase against the DGA "Platforms Code" design system — component anatomy, states, semantic HTML, ARIA, RTL and bilingual parity — and optionally apply the fixes. Use when the user runs /dga-review, asks to check code or a component for DGA compliance, or wants source-level fixes. For a running site or a Figma frame use /dga-audit instead: that measures, this reads.
---

# Review code against DGA Platforms Code

`/dga-review <path or component>` — a repository, a route, or a single component.
With no argument, ask what to review.

**This is Mode B.** It reads source. It does not measure anything, and it must never
report a number as though it had.

> If the target is a **URL or a Figma frame**, stop and use `/dga-audit`. Reasoning about
> a rendered result from source is how a review invents findings — the cascade, the
> effective background and the loaded typeface are only knowable from the page.

## The workflow lives in the repo

Find the checkout (try `~/dga-design-auditor`), then read:

1. **`AGENTS.md` → Mode B** — the working rules, what may not be claimed, the response
   shape, and how to hand off to Mode A.
2. **`rules/README.md`** — provenance for the rule corpus, and the conflicts it has with
   the token ledger. Read this before quoting any rule.
3. **`data/rules-map.json`** — which rule file binds to which checks and DGA criteria, and
   the `reviewOnly` behaviours that only this mode can see.

## The short version

- Judge behaviour and anatomy against `rules/*.md`; cite `rules/<file>.md / <section>`.
- Judge **values** against `data/tokens.json` — the prose says "use the spacing scale",
  the scale itself is in the ledger.
- Blocking: WCAG 2.2 AA, mobile, Arabic and RTL, bilingual parity.
- Never claim compliance. DGA's formal review decides that; this prepares a project for it.
- End with `Validation Needed`, naming the checks Mode A would have to run.

## What this mode is for

The measured audit reaches 7 of DGA's 9 published criteria and none of the behaviour below.
This mode is the only one that can see:

| | |
| --- | --- |
| Semantics | `<button>` vs `<div>`, heading order, landmarks, `aria-current` |
| Focus behaviour | modal traps and restore, roving tabindex, skip links |
| Announcement | live regions, `aria-busy`, results and error announcement |
| Localisation | translation parity, hardcoded English, direction-aware logic |
| Task flow | three-clicks-to-service, empty and no-result states, error copy that explains the fix |

A check passing in Mode A says nothing about any of these. Do not treat one as evidence
for the other.
