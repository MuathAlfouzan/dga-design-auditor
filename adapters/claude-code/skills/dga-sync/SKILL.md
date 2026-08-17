---
name: dga-sync
description: Re-extract the DGA "Platforms Code" design system from the SDGA Figma Community files into the local token ledger the auditor scores against. Use when the user runs /dga-sync, asks to refresh or re-extract the DGA tokens, says the design system has been updated, or when an audit reports the ledger is stale or unsynced.
---

# Sync the DGA token ledger from Figma

**The procedure lives in the repo: read `docs/SYNC.md`.** Find the checkout at
`~/dga-design-auditor`, or via `npm root -g`.

It covers the parts that are easy to get wrong: Community files open read-only and must
be duplicated into your own drafts first; the Dev Mode MCP addresses whichever file is
frontmost and takes no file key; and every pass after the first must **merge** rather
than overwrite, with Foundations winning conflicts.

`data/sources.json` is the manifest — all 23 published SDGA files, which tier each
belongs to, which checks it closes, and whether it has been synced.

## State as of the last sync

| File | |
| --- | --- |
| Foundations | ✔ synced |
| Components Library | ✔ synced |
| Mobile Components | ✔ synced |
| Icons | deferred by choice — `I1` scores n/a until it is synced |

## After any sync

```bash
npm run build && npm test
```

`build` regenerates `dist/dga-rate.js` with the new ledger baked in; `test` proves the
change did not move any existing score. A ledger edit that shifts the parity fixture is
a bug unless you meant it.
