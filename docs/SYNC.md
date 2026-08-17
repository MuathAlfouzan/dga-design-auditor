# Re-syncing the ledger from Figma

Extracts colour, type, spacing, radius, elevation, icon, breakpoint and motion tokens
from the DGA **Platforms Code** components library into `data/tokens.json`,
and component anatomy into `data/components.json`. Those two files are the
baseline every compliance score is measured against, so accuracy here is worth more
than speed.

**The source is not one file.** SDGA publishes 23 at <https://www.figma.com/@sdga>, and
`data/sources.json` classifies every one: which tier it belongs to, which
rubric checks it closes, and whether it has been synced yet. Read that manifest first —
it is what makes a multi-pass sync resumable instead of something you have to remember.

Four files are the system itself and the ledger is incomplete without them:

| Priority | File | Closes |
| --- | --- | --- |
| 1 | **Foundations** | `S2` `E2` `E3` `M1` `C4` |
| 2 | **Components Library** | `C1–C3` `T1–T4` `S1` `E1` `P1–P3` |
| 3 | **Icons** | `I1` |
| 4 | **Mobile Components** | `P1–P3` `A4` at mobile viewports |

Template files (Home Page, Service Page, Form, …) are page-level references for the
judged checks, not token sources. Campaign files — Hajj, National Day, Founding Day —
are **never** synced: their palettes are seasonal artwork and would pollute the ledger.

Re-run per file whenever DGA publishes a change.

## Why this is a separate step

Two constraints stack up, and the local ledger is what resolves both.

**The MCP reads only the focused file.** The Figma Dev Mode MCP's tools take a
`nodeId` and nothing else — no file key, no URL — so they address whichever file is
frontmost in Figma desktop. An auditor cannot hold the DGA library and a candidate
design open at once.

**A Community file cannot be read directly.** Community files open read-only in a
viewer, which Dev Mode does not drive. It has to be duplicated into the user's own
drafts first (**Open in Figma** on the community page), which produces a normal
editable copy with its own file key.

Extracting once into a local ledger is not a workaround for either; it is also what
makes the score reproducible, since the baseline stops moving between runs.

## Preflight — do this before anything else

1. Check the MCP is reachable:

   ```bash
   curl -s -m 4 -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3845/sse
   ```

   `200` means Figma desktop is running with Dev Mode MCP enabled. Anything else:
   tell the user to open Figma desktop and enable **Preferences → Enable Dev Mode MCP
   server**, and stop.

   If the `mcp__figma__*` tools are not present in the session at all, the server is
   running but not registered. Have the user register it once:

   ```bash
   claude mcp add --scope user figma --transport sse http://127.0.0.1:3845/sse
   ```

2. Confirm the user has a working copy. Ask if they have already duplicated the
   library; if not, give them these steps and stop:

   > 1. Open <https://www.figma.com/community/file/1392264328585493958/components-library-platforms-code>
   > 2. Press **Open in Figma** — this duplicates it into your drafts as an editable copy.
   > 3. Open that copy in the Figma **desktop app** and click into it so it is frontmost.
   >    A browser tab does not drive this MCP.
   > 4. Select the library's first page or any top-level frame.

   The duplicate is theirs and keeps its own file key; there is no fixed key or entry
   node to hardcode, which is why step 3 discovers the tree instead of assuming it.

3. Discover the tree. Call `get_metadata` **with no `nodeId`** — it falls back to the
   current selection in the focused file.
   - An error mentioning **FigJam** means a board is frontmost, not the library.
   - An empty or missing-node result means nothing is selected, or a different file is
     frontmost.

   Either way, **stop and say exactly what to open and select**. Do not guess values
   to fill the gap, and do not fall back to a different design system's tokens.

4. Identify which source is in front. Match the page-name inventory against
   `sources.json` — Foundations reads as colour/type/grid pages, Components Library as
   ~48 component pages, Icons as icon grids, Mobile Components as phone-width frames.
   Say which one you matched before extracting; if it matches none of them, stop rather
   than merging an unknown file into the ledger.

5. Record provenance into that source's entry in `sources.json` — set `synced` to
   today, and record the page ids walked. A ledger whose origin cannot be traced cannot
   be re-synced with confidence.

## Merging, not overwriting

**Every pass after the first must merge.** Read the existing `tokens.json` and
`components.json`, add what the new file contributes, and keep what is already there.
Overwriting is the failure that silently undoes a previous sync — the ledger looks
healthy and has quietly lost half its palette.

Where a later file disagrees with an earlier one on the same token path, **Foundations
wins**, then Components Library, then the rest. Record the conflict in `$notes` with
both values; a token that means two things is a finding about the library, not
something to average away.

## Extract

Work from the node inventory `get_metadata` returned. Foundation pages are usually
named for what they hold — Colour/Colors, Typography, Spacing, Radius/Corner,
Elevation/Shadow, Icons, Grid/Breakpoints, Motion. The Platforms Code library is
bilingual, so expect Arabic page names too (الألوان، الخطوط، المسافات) and treat them
as the same foundations.

1. **Tokens** — `get_variable_defs` on each foundation frame. It returns the bound
   variables as `{'color/brand/primary': '#006C35'}`. **Keep the Figma variable path
   as the key**: it is what a finding quotes back to a designer, and a renamed key
   makes the finding unactionable.
2. **Modes** — if the library has light and dark modes, extract both and file them
   under `color.light` and `color.dark`. Where there is only one mode, leave
   `color.dark` empty; the `C4` check drops out on its own rather than scoring zero.
3. **Roles** — fill `color.roles.brand`, `color.roles.border` and
   `color.roles.semantic.{success,warning,error,info}` with the token paths that carry
   those meanings. `C2`, `C3` and `E2` are only as good as this mapping, and it is the
   part `get_variable_defs` cannot tell you — read the frame labels.
4. **Type ramp** — one entry per step: `{name, size, lineHeight, letterSpacing,
   weight, script}` in px. Record the Arabic and Latin families separately under
   `typography.families`; the ledger needs both because `T1` and `R3` check each script
   against its own face.
5. **Components** — `get_design_context` on representative frames for button, input,
   select, checkbox, card, tab, table, navigation, modal and alert. Record real
   measurements per size — height, inline padding, icon gap, font size, radius — plus
   the variant and state names. These feed the judged checks `P1`–`P3`, which without
   them degrade into guesswork.
6. **Screenshots** — `get_screenshot` on each foundation page, saved to
   `data/reference/`, so a disputed finding can be checked against the source.

## Write

Fill `data/tokens.json` and `components.json` in place, keeping the documented
shape — `score.mjs` reads these keys directly, and a renamed field silently disables a
check rather than erroring. Set `"synced"` to today's ISO date in both.

Then write `data/SPEC.md`: a readable summary — the palette with swatch hexes,
the type ramp as a table, the scales, and one line per component. This is what a person
reads when they want to know what the auditor is enforcing.

Record anything you had to infer in the `$notes` array of the file it affects. A token
you could not find is a gap in the ledger, and a gap should be visible rather than
filled with a plausible value.

## Verify

```bash
node -e 'const t=require(process.env.HOME+"/.claude/dga/tokens.json");
console.log("synced:",t.synced,"| light:",Object.keys(t.color.light).length,
"| dark:",Object.keys(t.color.dark).length,"| ramp:",t.typography.ramp.length,
"| spacing:",t.spacing.scale.length,"| radius:",t.radius.scale.length)'
```

Spot-check three colours and two type steps against the Figma UI by eye before
telling the user the sync is good — an extraction that silently pulled a documentation
swatch instead of a token is the failure mode worth catching here, and it is invisible
downstream.

**Always cross-check against a page the ledger was not built from.** On the first sync
this caught a whole missing ramp step and a 31-token component family that six pages
of extraction had missed. It costs one call and it is the only check that finds what
you did not know to look for.

Finally, report what is still unsynced: read `sources.json`, list the `system`-tier
entries whose `synced` is still null, and name the checks each would close. A ledger
that is 60% built should say so rather than presenting itself as the standard.

**Keep `deferred: true` sources out of that list.** A deferred source is a decision the
user already made, not an outstanding gap, and re-raising it every sync is nagging.
Mention it once, in a separate line, only if its absence changes how a score should be
read.
