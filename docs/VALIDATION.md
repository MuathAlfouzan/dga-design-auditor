# Validation — what has been checked against something other than itself

The rubric's 28 checks are implemented once, by one author, from one reading of the DGA
ledger and of WCAG. That reading has already produced errors that shipped:

| Found | What was wrong |
| --- | --- |
| `E3` | Compared a hex integer against four rgba components, so elevation could not pass on any page ever built |
| `A2` | Counted decorative dividers, then decorative card outlines, as component boundaries |
| `A4` | Exempted anything `inline-block`, which wrongly excused standalone icon links |
| `T1` | Judged the declared family name without resolving `@font-face`, so a site serving the correct typeface scored zero |
| `A3` | Called `el.focus()`, which never matches `:focus-visible`, and reported working focus rings as missing |

Every one was found by a person noticing a number looked wrong. This file records what has
since been checked against an **independent** implementation, and what has not.

---

## axe-core 4.13.0 — `test/axe.test.mjs`

Both engines run over the same fixtures and the results are compared. Disagreements are
**reported, never auto-resolved**: deferring to axe would swap one unexamined authority for
another, and a divergence is either a bug here or a difference of interpretation that a
person has to settle.

| Check | axe rule | Status |
| --- | --- | --- |
| `A1` Text contrast | `color-contrast` | **agrees** on `pass.html` (0 violations, ours 1.0) and on `fail.html` (2 violations, ours 0.75) |
| `A4` Target size | `target-size` | **agrees** on `pass.html` (0 violations, ours 1.0) and on `fail.html` (3 violations, ours 0.4) |
| `A2` Non-text contrast | — | **no independent check exists** |
| `A3` Visible focus | — | **no independent check exists** |

**Accepted divergences: none.** At the time of writing the two engines agree wherever both
have an opinion.

## The gap that matters

axe 4.13 implements no rule for **SC 1.4.11 (non-text contrast)** or **SC 2.4.7 (focus
visible)**. Those are exactly the two checks changed most recently, and both feed the
`accessibility-wcag` criterion that gates readiness on every audit.

So `A2` and `A3` rest on this tool alone. What stands behind them instead:

- **`A2` scope** is pinned in both directions by `test/a11y.test.mjs` — a control border
  must be judged, a content-card hairline must be excluded, and the count of exclusions is
  reported so narrowing the scope can never quietly inflate the ratio.
- **`A3`'s cascade fallback** is checked against live observation on the same page: where
  the browser can observe focus, the predicted reading must equal the observed one. A
  fallback that silently disagreed with reality would be worse than no fallback.

Neither substitutes for a second implementation. If one appears for 1.4.11 or 2.4.7, wiring
it in is the single highest-value addition to this suite.

## Not validated at all

The other 24 checks compare a rendered page against `data/tokens.json`. There is no second
implementation of "does this colour match a DGA token", because the ledger is specific to
this project. Their correctness rests on:

- `test/checks.test.mjs` — every check must reach 1.0 on a compliant fixture and below 1.0
  on a violating one, so a check that cannot pass or cannot fail is caught
- `test/integrity.test.mjs` — the arithmetic cannot be made to flatter a target
- `test/parity.mjs` — a pinned real-world capture, so a verdict cannot drift unnoticed

That is coverage, not independence. It is worth being clear about the difference.

---

*axe-core is a devDependency rather than a vendored blob: it is versioned, updatable, and
`npm ci` already needs the network. Re-run `node test/axe.test.mjs` after any axe upgrade —
a new rule for 1.4.11 or 2.4.7 would close the gap above.*
