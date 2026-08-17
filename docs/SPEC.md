# DGA Platforms Code — what the auditor enforces

Synced **17 August 2026** from two SDGA Figma Community files:
[Foundations](https://www.figma.com/community/file/1392267405633663431/foundations-platforms-code)
and [Components Library](https://www.figma.com/community/file/1392264328585493958/components-library-platforms-code).
Precedence is **Foundations → Components Library → templates**; conflicts are listed
at the bottom rather than averaged away.

This is a readable view of `tokens.json` and `components.json`. Those are what
`score.mjs` reads; this is for people. If they disagree, the JSON wins.

**Ledger state: 2 of 4 system files synced.** Icons and Mobile Components are still
outstanding — see `sources.json` for the full manifest of all 23 published files.

---

## Typography

**One family for both scripts: `IBM Plex Sans Arabic`.** The library binds it to
`font-family-display` *and* `font-family-text`, and it carries Arabic and Latin. A page
setting Latin in Inter and Arabic in something else fails `T1` twice over.

| Step | Size | Line height | Tracking | Weights |
| --- | --: | --: | --: | --- |
| Display xl | 60 | 72 | −2 | 400 · 500 · 600 · 700 |
| Display lg | 48 | 60 | −2 | 400 · 600 |
| Display sm | 30 | 38 | 0 | 700 |
| Display xs | 24 | 32 | 0 | 400 · 600 |
| Text xl | 20 | 30 | 0 | 600 |
| Text lg | 18 | 28 | 0 | 400 · 500 · 600 · 700 |
| Text md | 16 | 24 | 0 | 400 · 500 · 600 |
| Text sm | 14 | 20 | 0 | 400 · 500 |
| Text xs | 12 | 18 | 0 | 500 |
| Text 2xs | 10 | 14 | 0 | 500 · 600 |

Weights: **400** Regular · **500** Medium · **600** Semibold · **700** Bold.

> ⚠️ **Display md** is still missing. The ramp runs 60 → 48 → ? → 30 → 24, so a step
> around 36 is implied, but none of the four Foundations pages emitted it. Not invented.

---

## Colour — 187 tokens

### Brand

| Token | Value |
| --- | --- |
| `Colors/SA-Flag/600` · `fg-brand-primary (600)` · `Icon/icon-primary` | `#1b8354` |
| `Button/button-background-primary-hovered` | `#166a45` |
| `Text 2/text-brand-primary` · `…primary-selected` | `#14573a` |
| `Button/button-background-primary-pressed` | `#104631` |
| `Text 2/text-brand-tertiary` | `#25935f` |
| `Background/background-primary-400` · `Link/link-primary-hovered` | `#54c08a` |
| `Link/link-primary-pressed` | `#88d8ad` |
| `bg-brand-primary_alt` · `Icon/background-brand-light` | `#f3fcf6` |
| `Background/background-SA-Flag` | `#074d31` |

### Text

`text-primary` `#0d121c` · `text-secondary` `#384250` · `text-tertiary` `#4d5761` ·
`text-default` `#161616` · `text-display` `#1f2a37` · `text-secondary-paragraph` `#6c737f`
· `text-white` `#ffffff` · disabled `#9da4ae`

On colour: `text-primary_on-color` `#ffffff` · `secondary_on-color` `#ffffffb2` ·
`tertiary_on-color` `#ffffff99`

### Semantic — the four roles move as a set

Using one without the others is what `C3` catches.

| Role | Solid | Surface (25) | Text | Border (light) |
| --- | --- | --- | --- | --- |
| Success | `#079455` | `#f6fef9` | `#067647` | `#abefc6` |
| Warning | `#dc6803` | `#fffcf5` | `#b54708` | `#fedf89` |
| Error | `#d92d20` | `#fffbfa` | `#b42318` | `#fecdca` |
| Info | `#1570ef` | `#f5faff` | `#175cd3` | `#b2ddff` |

Tags carry darker text shades of the same roles — success `#085d3a`, warning `#93370d`,
error `#912018`, info `#1849a9` — on `-light` surfaces. Neutral tags: `#4d5761` on `#f9fafb`.

### Neutrals

`Colors/Neutral/` 25 `#fcfcfd` · 100 `#f3f4f6` · 300 `#d2d6db` · 400 `#9da4ae` · 950 `#0d121c`
Backgrounds: body `#f9fafb` · primary `#ffffff` · secondary `#f9fafb` · quaternary `#eaecf0`
Borders: `border-primary` `#d2d6db` · `border-secondary` `#e5e7eb`

---

## Scales

**Spacing** — base 2, full numeric scale from Foundations:

`0 · 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 128 · 160 · 192 · 224 · 256 · 320 · 384 · 480 · 640 · 720 · 768 · 1024 · 1280 · 1440 · 1600 · 1920`

Aliases run `spacing-none` through `spacing-11xl`. **`spacing-sm` is 6** — the gap the
first sync flagged, now closed.

**Radius** — `0 · 2 · 4 · 6 · 8 · 16 · 24`, plus `radius-full` 9999 for pills.

**Border widths** — 1 and 2. Observed on guidance frames, not exposed as variables, so
lower confidence than the rest of the ledger.

**Elevation — seven levels** (was two before Foundations):

| Token | Value |
| --- | --- |
| `shadow-xs` | `0 1px 2px 0 #1018280d` |
| `shadow-sm` | `0 1px 2px 0 #1018280d, 0 1px 3px 0 #1018280d` |
| `shadow-md` | `0 2px 4px -2px #1018280f, 0 4px 8px -2px #1018281a` |
| `shadow-lg` | `0 4px 6px -2px #10182808, 0 12px 16px -4px #10182814` |
| `shadow-xl` | `0 8px 8px -4px #10182808, 0 20px 24px -4px #10182814` |
| `shadow-2xl` | `0 24px 48px -12px #1018282e` |
| `shadow-3xl` | `0 32px 64px -12px #10182824` |

Backdrop blurs: sm 8 · md 16 · lg 24 · xl 40.

**Layout** — container padding **16 mobile / 32 desktop**, container max-width **1280**,
paragraph max-width **720**. Width scale xxs 320 → 6xl 1920.

> The desktop breakpoint `min: 768` is **inferred** from `Width/width-xl`; the library
> exposes no explicit breakpoint variable.

---

## Components

| Component | Key measurements |
| --- | --- |
| **Button** | Inline padding lg 16 / md 12 / sm 8. Icon gap **4 at every size**. Radius 4 throughout. Seven variants — primary, neutral, black, oncolor, transparent, danger-primary, danger-secondary — each with default, hovered, pressed, selected, focused, disabled. |
| **Text input** | Padding-start 8, padding-end 16, label gap 8, radius 4. Border colour carries the state: default `#9da4ae`, hovered `#384250`, pressed `#0d121c`, error `#b42318`. |
| **Card** | Radius 16, internal gap 24, title Text lg/Bold, `shadow-md` when raised. |
| **Inline alert** | Padding 16, inline padding 24, gap 16, radius 8. Title Text md/Semibold over body Text sm/Regular with an 8 gap. |
| **Table** | Cell padding 16 inline / 8 block, cell gap 8. Header `#f3f4f6` with head text `#384250`; cell borders `#d2d6db`. |

---

## Still not in the ledger

These report **n/a** and leave the denominator — a check that cannot be measured must
not look like a failure.

| Missing | Effect | Fixed by |
| --- | --- | --- |
| Icon size scale, stroke weight | `I1` degrades to visual judgement | syncing **Icons** |
| Mobile component anatomy | `P1–P3`, `A4` judged by desktop specs at 375px | syncing **Mobile Components** |
| Dark mode variable set | `C4` n/a | not present in either file |
| Motion durations and easings | `M1` n/a | Platforms Code appears not to define these |
| Numeral policy | `R3` checks consistency only, not a specific system | — |
| `Display md` ramp step | one gap in `T2` | — |

---

## Conflicts inside the library

Recorded, not averaged. A token that means two things is a finding about the library.

| Token | Values | Resolution |
| --- | --- | --- |
| `Text/text-primary` | `#0d121c` (Foundations) vs `#1b8354` (Components) | Foundations |
| `Border/border-secondary` | `#e5e7eb` (Foundations) vs `#dba102` (Components) | Foundations |
| `Button/button-background-neutral-default` | `#f9fafb` vs `#f3f4f6` | Foundations |
| `Border/border-primary` | `#d2d6db` (Typography page) vs `#1b8354` (Colors page) | `#d2d6db` — matches `Border 2/border-primary` |
| `radius-sm` | 4 almost everywhere, 6 on the grid page | **both** kept in scale, so neither scores as a violation |

## What the sync deliberately threw away

Six values that look like tokens and are not:

- **Shopify Polaris leftovers** on Components Library → Get Started: `var(--p-color-text)`
  `#303030`, `var(--p-color-bg-surface)`, `var(--p-sapce-600)` 24, `var(--p-sapce-1000)` 40.
  The `p-` prefix and the `sapce` misspelling are Polaris's own.
- **Do/avoid annotation swatches** on Foundations → Spacing, radius & grids:
  `guide-container-do` `#abefc6`, `guide-container-avoid` `#fecdca`.

Admitting any of them would have taught the auditor that an off-brand grey, or the
green used to mean "correct" in a diagram, is a compliant colour — and every audit
afterwards would have been quietly wrong.
