# Rule corpus — the qualitative half of DGA compliance

These ten files describe what DGA's design system *says*, in prose: component anatomy,
states, do/don't guidance, semantic HTML and ARIA expectations. They are the source of
truth for **Mode B (code review)**, where there is no rendered page to measure.

They are not a replacement for `data/tokens.json`. The ledger holds values a machine can
compare against a screen; these hold judgement a person or a model has to apply.

## Provenance — read before quoting any of it

Imported 2026-08-19 from a DGA compliance agent package built independently by developers
at **SDAIA**, received as `aostda4uenztutnkp69ipx4q-agent-package`. Files are verbatim;
only the `rule-` filename prefix was dropped.

**The original carries no source URL, no capture date, and no DGA version.** So it cannot
be told which release of Platforms Code it reflects, and it cannot be re-derived. That is
the opposite of how `data/tokens.json` is kept, and it is the single biggest caveat on
everything here. Treat these as a well-informed secondary reading of DGA's documentation,
not as an extract.

Where the corpus and the ledger disagree, `data/tokens.json` records both under
`conflicts` rather than silently picking one. Neither side automatically wins: the ledger
is a machine extract from live Figma variables, this is a human transcription of the
documentation, and each fails in different ways.

## What it corrected in the ledger

The corpus is not merely a second opinion — it found real gaps, because it was
transcribed from documentation while the ledger was extracted by walking *component*
pages, so ramp steps no component used were never captured:

| Added to the ledger | Consequence of having missed it |
| --- | --- |
| `Display 2xl` 72/90 | any 72px heading read as off-scale |
| `Display md` 36/44 | dga.gov.sa's own «أرقام وإنجازات» figures at 36px were flagged `T2 36→30` and `T4 "not a ramp size at all"` — false positives against the publisher's own site |
| Icon sizes 10/14/16/18/20/24/28/32 | `I1` had an empty size scale and could not score |

## How these map to the checks

`data/rules-map.json` binds each file to the check IDs that measure part of it and to the
DGA criterion it evidences. It also names, per file, what **only** a code review can see —
semantics, ARIA, translation parity, error copy, task flow. That column is the honest
statement of why both modes exist.
