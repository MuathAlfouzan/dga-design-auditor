/*!
 * dga-rate 0.1.0 — DGA Platforms Code compliance auditor, in one file.
 *
 * Runs entirely in the page: nothing is fetched, nothing is written to disk, and
 * only a ~6KB verdict leaves the browser. Ledger extracted 2026-08-18 from
 * SDGA's public Figma Community files. Derived work, not an official DGA product.
 *
 *   __dga.audit({ label: 'desktop' })   -> verdict for every capture so far
 *   __dga.inline()                      -> compact markdown for a chat reply
 *   __dga.html()                        -> the full scorecard page
 *
 * https://github.com/
 */
(function () {
  'use strict';

  var RUBRIC = {"version":1,"standard":{"name":"DGA Platforms Code","arabicName":"كود المنصات","authority":"Digital Government Authority, Saudi Arabia","source":"https://www.figma.com/community/file/1392264328585493958/components-library-platforms-code"},"bands":[{"id":"full","label":"Full adoption","min":90},{"id":"high","label":"High adoption","min":75},{"id":"moderate","label":"Moderate adoption","min":60},{"id":"limited","label":"Limited adoption","min":0}],"passThreshold":{"default":0.9,"blocker":1},"thresholds":{"colorMatchDeltaE":2,"colorNearMissDeltaE":10,"contrastNormalText":4.5,"contrastLargeText":3,"contrastNonText":3,"largeTextPx":24,"largeBoldPx":18.66,"minTargetPx":24,"offPaletteMinOccurrences":3,"coverageIgnoreBelowOccurrences":1,"minCoverage":0.75,"maxSilentDropWeight":15},"categories":[{"id":"color","label":"Color & tokens","weight":18,"checks":[{"id":"C1","weight":8,"title":"Color token coverage","description":"Every text, background, border and fill color resolves to a DGA color token.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of color-bearing declarations within deltaE <= colorMatchDeltaE of some ledger color.","blocker":false,"fix":"Replace the literal color with the named DGA token. The finding names the nearest token for each offender.","provenance":"ledger","authority":"Foundations / Colours — the published token palette","scope":"core","dgaCriterion":"type-colour","dgaCategory":"consistency","dgaTier":"mandatory"},{"id":"C2","weight":4,"title":"No off-palette brand color","description":"No color far from every DGA token (deltaE > colorNearMissDeltaE) is used repeatedly as a brand or accent surface.","applies_to":"both","method":"auto","scoring":"fraction","measure":"1 minus the occurrence-weighted share of far-off-palette colors used at least offPaletteMinOccurrences times. Near-misses are C1's problem, not this one.","blocker":true,"fix":"An unrecognisable brand color is an identity violation, not a styling preference. Move it onto the DGA palette or get the addition approved into the library.","provenance":"ledger","authority":"Foundations / Colours / Brand","scope":"core","dgaCriterion":"type-colour","dgaCategory":"consistency","dgaTier":"mandatory"},{"id":"C3","weight":3,"title":"Semantic colors used semantically","description":"success / warning / error / info tokens appear only in their semantic roles, and those roles use no other color.","applies_to":"both","method":"judged","scoring":"fraction","measure":"Share of semantic-token usages whose surrounding role matches the token's meaning, plus destructive/among-status affordances that use the correct token.","blocker":false,"fix":"Error text in the brand green, or a success toast in red, breaks the one convention users carry between government platforms.","provenance":"ledger","authority":"Foundations / Colours — success · warning · error · info roles","scope":"core","dgaCriterion":"type-colour","dgaCategory":"consistency","dgaTier":"mandatory"},{"id":"C4","weight":3,"title":"Dark theme from the DS dark set","description":"If the target ships a dark theme, its colors come from the DGA dark-mode tokens rather than ad-hoc darkening.","applies_to":"both","method":"auto","scoring":"fraction","na_when":"target has no dark theme","measure":"Same coverage calculation as C1, run against the dark-scheme capture and the ledger's dark set.","blocker":false,"fix":"Point the dark theme at the DGA dark tokens. Inverting or dimming light tokens drifts within one release.","provenance":"ledger","authority":"Foundations / Colours — dark set","scope":"core","dgaCriterion":"type-colour","dgaCategory":"consistency","dgaTier":"mandatory"}],"part":"foundations"},{"id":"typography","label":"Typography","weight":16,"checks":[{"id":"T1","weight":5,"title":"Typeface stack","description":"Latin and Arabic text render in the DGA typefaces, each script in the face specified for it.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of rendered text whose resolved font family is in the ledger's font stack for that script.","blocker":false,"fix":"A substituted face is the single most visible compliance failure — it reads as a different government at a glance.","provenance":"ledger","authority":"Foundations / Typography — IBM Plex Sans Arabic","scope":"core","dgaCriterion":"type-colour","dgaCategory":"consistency","dgaTier":"mandatory"},{"id":"T2","weight":5,"title":"Type scale","description":"Font sizes come from the DGA type ramp.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of computed font-size values matching a ramp step exactly (px, after rem resolution).","blocker":false,"fix":"Snap to the nearest ramp step; the finding names it.","provenance":"ledger","authority":"Foundations / Typography — the type ramp","scope":"core","dgaCriterion":"type-colour","dgaCategory":"consistency","dgaTier":"mandatory"},{"id":"T3","weight":3,"title":"Font weights","description":"Only the weights the DGA system defines are used.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of computed font-weight values in the ledger's allowed weight set.","blocker":false,"fix":"Synthetic or off-scale weights render inconsistently across platforms, especially in Arabic.","provenance":"ledger","authority":"Foundations / Typography — weights 400 · 500 · 600 · 700","scope":"core","dgaCriterion":"type-colour","dgaCategory":"consistency","dgaTier":"mandatory"},{"id":"T4","weight":3,"title":"Line height and tracking","description":"Line-height and letter-spacing match the ramp step's paired values.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of text runs whose (size, line-height, letter-spacing) triple matches one ramp step. Matching leading alone lets a 14px body carry 72px display leading and pass, which is the mismatch this check exists to catch.","blocker":false,"fix":"Set the ramp's paired leading rather than a global multiplier — Arabic ascenders and descenders need the extra room.","provenance":"ledger","authority":"Foundations / Typography — the ramp step (size, leading, tracking) triples","scope":"core","dgaCriterion":"type-colour","dgaCategory":"consistency","dgaTier":"mandatory"}],"part":"foundations"},{"id":"spacing","label":"Spacing & layout","weight":12,"checks":[{"id":"S1","weight":6,"title":"Spacing scale","description":"Padding, margin and gap values sit on the DGA spacing grid.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of non-zero spacing values matching a scale step.","blocker":false,"fix":"Off-grid spacing is what makes an otherwise on-token page feel unlike the rest of the platform.","provenance":"ledger","authority":"Foundations / Spacing — the spacing scale","scope":"core","dgaCriterion":"layout-spacing","dgaCategory":"design","dgaTier":"mandatory"},{"id":"S2","weight":3,"title":"Container widths and gutters","description":"Page container max-widths, gutters and column behaviour follow the DGA breakpoints.","applies_to":"site","method":"auto","scoring":"fraction","measure":"Measured at desktop, tablet and mobile captures; each breakpoint whose container width and gutter match the ledger scores its third.","blocker":false,"fix":"Match the DGA container at each breakpoint so content lines up across linked government services.","provenance":"ledger","authority":"Foundations / Grid — breakpoints, container widths and gutters","scope":"core","dgaCriterion":"layout-spacing","dgaCategory":"design","dgaTier":"mandatory"},{"id":"S3","weight":3,"title":"Vertical rhythm","description":"Section and block spacing uses the DGA rhythm steps rather than arbitrary gaps.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of between-section vertical gaps matching a rhythm step.","blocker":false,"fix":"Use the rhythm steps for section separation; the page reads as one document rather than stacked fragments.","provenance":"ledger","authority":"Foundations / Spacing — section rhythm steps","scope":"core","dgaCriterion":"layout-spacing","dgaCategory":"design","dgaTier":"mandatory"}],"part":"foundations"},{"id":"shape","label":"Shape & elevation","weight":8,"checks":[{"id":"E1","weight":3,"title":"Corner radii","description":"border-radius values come from the DGA radius scale.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of non-zero radii matching a scale step (fully-round pills excluded and checked against the pill token).","blocker":false,"fix":"Snap to the nearest radius step.","provenance":"ledger","authority":"Foundations / Radius — the radius scale","scope":"core","dgaCriterion":"design-system","dgaCategory":"design","dgaTier":"mandatory"},{"id":"E2","weight":2,"title":"Borders","description":"Border widths and colors come from the DGA border tokens.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of visible borders whose width is on the scale and whose color is a ledger border token.","blocker":false,"fix":"Use the border tokens; hairlines that vary by a fraction of a pixel show up as banding on scaled displays.","provenance":"ledger","authority":"Foundations / Borders — widths and border-role colours","scope":"core","dgaCriterion":"design-system","dgaCategory":"design","dgaTier":"mandatory"},{"id":"E3","weight":3,"title":"Elevation","description":"box-shadow values come from the DGA elevation set.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of shadows matching an elevation token. Both sides are normalised to x/y/blur/spread plus rgba before comparison, because the ledger writes hex and the browser reports rgba() — comparing raw strings, or numbers scraped from them, can never match.","blocker":false,"fix":"Use the named elevation level. Hand-tuned shadows break the depth ordering the system defines.","provenance":"ledger","authority":"Foundations / Shadows — the elevation levels","scope":"core","dgaCriterion":"design-system","dgaCategory":"design","dgaTier":"mandatory"}],"part":"foundations"},{"id":"components","label":"Components","weight":18,"checks":[{"id":"P1","weight":8,"title":"DS components, not rebuilds","description":"Buttons, inputs, selects, cards, tabs, tables, navigation, modals and alerts correspond to DGA components rather than bespoke reimplementations.","applies_to":"both","method":"judged","scoring":"fraction","measure":"Share of identified component instances matching a DGA component by anatomy. On Figma targets, whether the instance is a library instance rather than a detached or hand-drawn frame.","blocker":false,"fix":"Adopt the library component. A rebuild that looks right today is the thing that drifts at the next DGA release.","provenance":"ledger","authority":"Components Library — component anatomy","scope":"core","dgaCriterion":"design-system","dgaCategory":"design","dgaTier":"mandatory"},{"id":"P2","weight":5,"title":"Variants, sizes and states","description":"Component variants (primary / secondary / tertiary), sizes and interaction states are the ones the system defines.","applies_to":"both","method":"judged","scoring":"fraction","measure":"Share of instances whose variant, size and hover/active/disabled/focus treatments match the spec.","blocker":false,"fix":"Missing disabled or focus treatments are the usual failure; both are specified, neither is optional.","provenance":"ledger","authority":"Components Library — variants, sizes and states","scope":"core","dgaCriterion":"design-system","dgaCategory":"design","dgaTier":"mandatory"},{"id":"P3","weight":5,"title":"Component anatomy","description":"Internal padding, icon-and-label spacing and order, and minimum heights match the component spec.","applies_to":"both","method":"judged","scoring":"fraction","measure":"Share of instances whose measured internal geometry matches the spec within 1px.","blocker":false,"fix":"Restore the specified padding and min-height. Squeezed buttons are also the usual cause of an A4 target-size failure.","provenance":"ledger","authority":"Components Library — internal geometry","scope":"core","dgaCriterion":"design-consistency","dgaCategory":"design","dgaTier":"recommended"}],"part":"components"},{"id":"brand","label":"Iconography & brand","weight":6,"checks":[{"id":"I1","weight":3,"title":"Icon set","description":"Icons come from the DGA icon set, at scale sizes, with the specified stroke weight.","applies_to":"both","method":"judged","scoring":"fraction","measure":"Share of icons identifiable as DGA set members at a scale size. Mixed icon libraries on one page fail proportionally.","blocker":false,"fix":"Standardise on the DGA icon set. Two icon families on one screen is visible even to users who cannot name why.","provenance":"ledger","authority":"Icons Library — family, size scale and stroke weight","scope":"core","dgaCriterion":"design-consistency","dgaCategory":"design","dgaTier":"recommended"},{"id":"I2","weight":3,"title":"Logo and lockup","description":"Official marks use approved variants at or above minimum size, with the specified clear space, uncropped and unrecoloured.","applies_to":"both","method":"judged","scoring":"binary","measure":"Pass only if every mark on the target satisfies variant, minimum size, clear space and color rules.","blocker":true,"fix":"Misuse of a government mark is an identity violation. Use the approved asset at approved size with its clear space intact.","provenance":"ledger","authority":"Brand / identity — approved marks, minimum size, clear space","scope":"core","dgaCriterion":"design-consistency","dgaCategory":"design","dgaTier":"recommended"}],"part":"components"},{"id":"rtl","label":"RTL & bilingual","weight":5,"checks":[{"id":"R1","weight":3,"title":"Direction and mirroring","description":"Arabic renders with dir=rtl and the layout mirrors — not just the text.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Correct dir/lang on the document and on mixed-script runs, plus evidence that layout order, alignment and navigation actually mirror in the RTL capture.","blocker":false,"fix":"Set dir on the document and let logical properties carry the mirroring, rather than a per-component RTL override sheet.","provenance":"standard","authority":"HTML dir attribute · W3C i18n — an Arabic interface must be mirrored","scope":"core","dgaCriterion":"content-strategy","dgaCategory":"usability","dgaTier":"recommended"},{"id":"R2","weight":3,"title":"Logical properties","description":"Layout uses inline/block logical properties instead of left/right physical ones.","applies_to":"site","method":"auto","scoring":"fraction","measure":"Share of directional declarations written logically rather than physically, in FIRST-PARTY stylesheets only. Vendor bundles are counted separately and reported as context — scoring them measures the framework choice rather than the team's work.","blocker":false,"fix":"margin-inline-start over margin-left. Physical properties are why an RTL layout needs a second stylesheet and then diverges from the first.","provenance":"practice","authority":null,"scope":"extended","dgaCriterion":null,"dgaCategory":null},{"id":"R3","weight":2,"title":"Arabic typography and numerals","description":"Arabic runs use the Arabic face, directional icons mirror, and the numeral system is consistent throughout.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Arabic-range text resolving to the Arabic face; chevrons and arrows mirrored in RTL; one numeral system (Arabic-Indic or Western) used consistently.","blocker":false,"fix":"Mixed numeral systems inside one interface is the most common bilingual defect and the easiest to fix.","provenance":"standard","authority":"W3C i18n — one numeral system, Arabic set in an Arabic face","scope":"core","dgaCriterion":"content-strategy","dgaCategory":"usability","dgaTier":"recommended"}],"part":"standards"},{"id":"a11y","label":"Accessibility","weight":10,"checks":[{"id":"A1","weight":4,"title":"Text contrast (WCAG AA)","description":"Every text run meets 4.5:1, or 3:1 where it qualifies as large text.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of text runs meeting their applicable threshold against their effective background.","blocker":true,"fix":"Government services carry a statutory accessibility obligation. Darken the text token or lighten the surface — the finding gives the measured ratio and the needed delta.","provenance":"wcag","authority":"WCAG 2.2 SC 1.4.3 Contrast (Minimum), AA","scope":"core","dgaCriterion":"accessibility-wcag","dgaCategory":"accessibility","dgaTier":"mandatory"},{"id":"A2","weight":2,"title":"Non-text contrast","description":"UI boundaries, icons and graphical affordances meet 3:1 against their surroundings.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of borders that identify a UI COMPONENT or its state meeting 3:1 against their surroundings. Decoration is excluded and the exclusions are counted: dividers, and content cards that happen to be links — a hairline enclosing a heading and a paragraph is not information required to identify a component. No independent implementation exists for SC 1.4.11; see docs/VALIDATION.md.","blocker":true,"fix":"An input whose border disappears against its background is not usable at low vision or in sunlight.","provenance":"wcag","authority":"WCAG 2.2 SC 1.4.11 Non-text Contrast, AA","scope":"core","dgaCriterion":"accessibility-wcag","dgaCategory":"accessibility","dgaTier":"mandatory"},{"id":"A3","weight":2,"title":"Visible focus","description":"Every interactive element shows a visible focus indicator on keyboard focus.","applies_to":"site","method":"auto","scoring":"fraction","measure":"Share of a sample of focusable elements that show a focus indicator. Measured live where the browser will enter :focus-visible (seeded via a text input, since el.focus() alone does not match it). Where it will not — the in-app audit browser never holds OS focus — the CSS cascade is resolved statically instead and the reading is labelled measuredBy: cascade-analysis. Predicted, not observed: blind to focus styling applied by script or drawn on a pseudo-element.","blocker":false,"fix":"Never remove the outline without replacing it. Keyboard-only users navigate the whole service through this one affordance.","provenance":"wcag","authority":"WCAG 2.2 SC 2.4.7 Focus Visible, AA","scope":"core","dgaCriterion":"accessibility-wcag","dgaCategory":"accessibility","dgaTier":"mandatory"},{"id":"A4","weight":2,"title":"Target size","description":"Interactive targets are at least 24x24 CSS px (WCAG 2.2 AA), spacing exceptions allowed.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of interactive elements meeting the minimum, with the WCAG 2.2 exceptions applied: a target inline in a sentence leaves the denominator, and an undersized target passes if a 24px circle centred on it intersects no other target. Both exemption counts are reported.","blocker":false,"fix":"Grow the control or its padding. Icon-only buttons are the usual offenders.","provenance":"wcag","authority":"WCAG 2.2 SC 2.5.8 Target Size (Minimum), AA","scope":"core","dgaCriterion":"mobile-usability","dgaCategory":"usability","dgaTier":"mandatory"}],"part":"standards"},{"id":"motion","label":"Motion","weight":2,"checks":[{"id":"M1","weight":2,"title":"Motion tokens","description":"Transition durations and easing curves come from the DGA motion tokens.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of transition/animation declarations whose duration and timing function match motion tokens.","blocker":false,"fix":"Use the named duration and curve so motion feels the same across services.","provenance":"ledger","authority":"Foundations / Motion — duration and easing tokens","scope":"core","dgaCriterion":"design-system","dgaCategory":"design","dgaTier":"mandatory"},{"id":"M2","weight":2,"title":"Reduced motion","description":"prefers-reduced-motion is honoured.","applies_to":"site","method":"auto","scoring":"binary","measure":"Pass if the stylesheet carries a prefers-reduced-motion rule and animation is actually suppressed under the emulated preference.","blocker":false,"fix":"Add a reduced-motion block that skips the motion rather than shortening it.","provenance":"practice","authority":null,"scope":"extended","dgaCriterion":null,"dgaCategory":null}],"part":"foundations"}],"parts":[{"id":"foundations","label":"Foundations","weight":56,"source":"Foundations - Platforms Code","covers":"Colour tokens, the type ramp, the spacing and radius scales, elevation and motion."},{"id":"components","label":"Components","weight":24,"source":"Components Library + Icons - Platforms Code","covers":"Component anatomy, variants and states, the icon set and official marks."},{"id":"standards","label":"Standards","weight":15,"source":"DGA guidance, not a Figma library","covers":"RTL and bilingual behaviour, and WCAG accessibility."}],"scoring":{"coreWeight":95,"extendedWeight":5,"note":"The score out of 100 is earned/available over CORE checks only — every core point traces to a DGA Figma token, a WCAG success criterion, or a W3C i18n requirement, named in each check's `authority`. `extended` checks measure practices nobody published; they are scored and reported separately and never fold into the headline or cap a band."},"provisionalCapBand":"moderate"};
  var TOKENS = {"synced":"2026-08-18","source":{"standard":"DGA Platforms Code","publisher":"SDGA / Digital Government Authority, Saudi Arabia","profile":"https://www.figma.com/@sdga","manifest":"See sources.json — 23 published files, 4 of them the system itself.","syncedFiles":[{"name":"Foundations - Platforms Code","id":"1392267405633663431","synced":"2026-08-17","pages":["FOUNDATIONS 2:2","Colors 2:3","Typography 2:4","Effect styles 2:5","Spacing, radius & grids 2:6"]},{"name":"Components Library - Platforms Code","id":"1392264328585493958","synced":"2026-08-17","pages":["Get Started 16026:49769","Buttons 1:1183","Inline Alert 1730:46041","Text input 954:19434","Card 8940:22264","UI Shell Nav Header 429:130167","Tags 12:539"]},{"name":"Mobile Components - Platforms Code","id":"1392271796654597578","synced":"2026-08-18","pages":["Buttons 1:1183","Text input 954:19434","Card 11367:20133","UI Shell - Tab Bar 8332:23832","Checkbox 954:11220 (cross-check)"]}],"precedence":"Foundations > Components Library > templates. Conflicts are listed in $notes, never averaged."},"color":{"light":{"Button/button-background-primary-default":"#1b8354","Button/button-background-primary-hovered":"#166a45","Button/button-background-primary-pressed":"#104631","Button/button-background-primary-selected":"#14573a","Button/button-background-primary-focused":"#1b8354","Text/text-primary":"#0d121c","Background/background-primary-50":"#f3fcf6","Background/background-primary-400":"#54c08a","Background/background-SA-Flag":"#074d31","Icon/background-brand-light":"#f3fcf6","Link/link-primary-hovered":"#54c08a","Link/link-primary-pressed":"#88d8ad","Text/text-default":"#161616","Text/text-display":"#1f2a37","Text/text-primary-paragraph":"#384250","Text/text-secondary-paragraph":"#6c737f","Text/text-oncolor-primary":"#ffffff","Text/text-success":"#067647","Text/text-warning":"#b54708","Text/text-error":"#b42318","Text/text-info":"#175cd3","Global/text-default-disabled":"#9da4ae","Global/text-default-oncolor-disabled":"#ffffff66","Global/input-text-disabled":"#9da4ae","Background/background-white":"#ffffff","Background/background-card":"#ffffff","Background/background-menu":"#ffffff","Background/background-notification-white":"#ffffff","Background/background-neutral-25":"#fcfcfd","Background/background-neutral-50":"#f9fafb","Background/background-neutral-200":"#e5e7eb","Background/background-neutral-400":"#9da4ae","Background/background-neutral-800":"#1f2a37","Global/background-disabled":"#e5e7eb","Global/background-inverse-disabled":"#f3f4f6","Background/background-success":"#079455","Background/background-success-25":"#f6fef9","Background/background-warning":"#dc6803","Background/background-warning-25":"#fffcf5","Background/background-warning-50":"#fffaeb","Background/background-error":"#d92d20","Background/background-error-25":"#fffbfa","Background/background-info":"#1570ef","Background/background-info-25":"#f5faff","Border/border-neutral-primary":"#d2d6db","Border/border-neutral-secondary":"#e5e7eb","Border/border-black":"#161616","Border/border-white":"#ffffff","Border/border-white-40":"#ffffff66","Border/border-secondary":"#e5e7eb","Border/border-success-light":"#abefc6","Border/border-warning-light":"#fedf89","Border/border-error-light":"#fecdca","Border/border-info-light":"#b2ddff","Border/border-disabled":"#d2d6db","Global/border-disabled":"#9da4ae","Button/button-background-neutral-default":"#f9fafb","Button/button-background-neutral-hovered":"#f3f4f6","Button/button-background-neutral-pressed":"#e5e7eb","Button/button-background-neutral-selected":"#e5e7eb","Button/button-background-neutral-focused":"#f3f4f6","Button/button-background-black-default":"#0d121c","Button/button-background-black-hovered":"#1f2a37","Button/button-background-black-pressed":"#4d5761","Button/button-background-black-selected":"#384250","Button/button-background-black-focused":"#0d121c","Button/button-background-oncolor-default":"#ffffff","Button/button-background-oncolor-hovered":"#ffffffcc","Button/button-background-oncolor-pressed":"#ffffff99","Button/button-background-oncolor-selected":"#ffffffb2","Button/button-background-oncolor-focused":"#ffffff","Button/button-background-transparent-hovered":"#ffffff33","Button/button-background-transparent-pressed":"#ffffff66","Button/button-background-transparent-selected":"#ffffff4d","Button/button-background-disabled-on-color":"#ffffff33","Button/button-label-transparent-hovered-on-color":"#54c08a","Button/button-label-transparent-pressed-on-color":"#88d8ad","Button/button-label-transparent-selected-on-color":"#54c08a","Button/button-background-danger-primary-default":"#d92d20","Button/button-background-danger-primary-hovered":"#b42318","Button/button-background-danger-primary-pressed":"#7a271a","Button/button-background-danger-primary-selected":"#912018","Button/button-background-danger-primary-focused":"#d92d20","Button/button-background-danger-secondary-default":"#fef3f2","Button/button-background-danger-secondary-hovered":"#fee4e2","Button/button-background-danger-secondary-pressed":"#fecdca","Button/button-background-danger-secondary-focused":"#fef3f2","Button/button-label-danger-primary-default-oncolor":"#fecdca","Button/button-label-danger-primary-hovered-oncolor":"#fda29b","Button/button-label-danger-primary-pressed-oncolor":"#f97066","Form/field-background-default":"#ffffff","Form/field-background-darker":"#f3f4f6","Form/field-background-lighter":"#fcfcfd","Form/field-background-pressed":"#f3f4f6","Form/field-border-default":"#9da4ae","Form/field-border-hovered":"#384250","Form/field-border-pressed":"#0d121c","Form/field-border-error":"#b42318","Form/field-text-label":"#161616","Form/field-text-placeholder":"#6c737f","Form/field-text-filled":"#161616","Form/field-text-focused":"#384250","Form/field-text-hovered":"#161616","Form/field-text-pressed":"#384250","Form/field-text-readonly":"#161616","Icon/icon-default":"#161616","Icon/icon-oncolor":"#ffffff","Icon/icon-warning":"#b54708","Icon/background-success-light":"#ecfdf3","Icon/background-warning-light":"#fffaeb","Icon/background-error-light":"#fef3f2","Icon/background-info-light":"#eff8ff","Global/icon-default-oncolor-disabled":"#ffffff66","Tag/tag-text-neutral":"#1f2a37","Tag/tag-background-neutral":"#4d5761","Tag/tag-background-neutral-light":"#f9fafb","Tag/tag-border-neutral":"#4d5761","Tag/tag-text-success":"#085d3a","Tag/tag-background-success":"#067647","Tag/tag-background-success-light":"#ecfdf3","Tag/tag-border-success":"#067647","Tag/tag-border-success-light":"#abefc6","Tag/tag-icon-success":"#085d3a","Tag/tag-text-warning":"#93370d","Tag/tag-background-warning":"#b54708","Tag/tag-background-warning-light":"#fffaeb","Tag/tag-border-warning":"#b54708","Tag/tag-border-warning-light":"#fedf89","Tag/tag-icon-warning":"#93370d","Tag/tag-text-error":"#912018","Tag/tag-background-error":"#d92d20","Tag/tag-background-error-light":"#fef3f2","Tag/tag-border-error":"#b42318","Tag/tag-border-error-light":"#fecdca","Tag/tag-icon-error":"#912018","Tag/tag-text-info":"#1849a9","Tag/tag-background-info":"#1570ef","Tag/tag-background-info-light":"#eff8ff","Tag/tag-border-info":"#175cd3","Tag/tag-border-info-light":"#b2ddff","Tag/tag-icon-info":"#1849a9","Tag/tag-background-on-color":"#ffffff33","Tag/tag-border-on-color":"#ffffff99","Tag/tag-dot":"#ffffff99","Alpha/alpha-white-100":"#ffffff","Alpha/alpha-white-10":"#ffffff1a","Alpha/alpha-black-10":"#0000001a","Colors/Base/white":"#ffffff","Colors/Neutral/25":"#fcfcfd","Colors/Neutral/100":"#f3f4f6","Colors/Neutral/300":"#d2d6db","Colors/Neutral/400":"#9da4ae","Colors/Neutral/950":"#0d121c","Colors/SA-Flag/600":"#1b8354","Colors/Foreground/fg-brand-primary (600)":"#1b8354","Colors/Background/bg-primary":"#ffffff","Colors/Background/bg-secondary":"#f9fafb","Colors/Background/bg-quaternary":"#eaecf0","Colors/Background/bg-brand-primary_alt":"#f3fcf6","Component colors/Utility/Gray/utility-gray-50":"#f9fafb","Component colors/Utility/Gray/utility-gray-200":"#eaecf0","Component colors/Utility/Gray/utility-gray-700":"#344054","Component colors/Components/Buttons/Secondary/button-secondary-bg":"#ffffff","Component colors/Components/Buttons/Secondary/button-secondary-border":"#d0d5dd","Text/text-secondary":"#384250","Text/text-tertiary":"#4d5761","Text/text-white":"#ffffff","Text 2/text-primary_on-color":"#ffffff","Text 2/text-secondary_on-color":"#ffffffb2","Text 2/text-tertiary_on-color":"#ffffff99","Text 2/text-tertiary":"#4d5761","Text 2/text-brand-primary":"#14573a","Text 2/text-brand-secondary":"#1b8354","Text 2/text-brand-tertiary":"#25935f","Text 2/text-warning-primary":"#b54708","Text 2/text-success-primary":"#067647","Text 2/text-info-primary":"#175cd3","Border/border-primary":"#d2d6db","Border 2/border-primary":"#d2d6db","Background/background-body":"#f9fafb","Background/background-neutral-100":"#f3f4f6","Background/background-info-50":"#eff8ff","Icon/icon-primary":"#1b8354","Icon/icon-success":"#067647","Table/table-cell-border":"#d2d6db","Table/table-text-head":"#384250","Table/table-background-header":"#f3f4f6","Controls/control-border":"#6c737f","Controls/control-primary-checked":"#1b8354","Controls/control-neutral-checked":"#0d121c","Controls/control-ripple-effect":"#f3f4f6","Controls/control-pressed":"#d2d6db","Controls/control-primary-pressed":"#104631","Controls/control-neutral-pressed":"#6c737f","Controls/control-primary-focused":"#1b8354","Controls/control-neutral-focused":"#0d121c","Colors/Base/black":"#000000","Colors/SA-Flag/800":"#14573a","Colors/SA-Flag/900":"#104631","Colors/Gray neutral/400":"#9da4ae","Colors/Gray neutral/600":"#4d5761","Colors/Gray neutral/700":"#384250","Colors/Error/50":"#fef3f2","Colors/Error/200":"#fecdca","Colors/Error/400":"#f97066","Colors/Error/600":"#d92d20","Colors/Error/900":"#7a271a","Background/background-black":"#161616","Background/background-primary":"#1b8354","Border/border-background-white":"#f3f4f6","Text/text-placeholder":"#6c737f","Text/text-error-primary":"#b42318","Text/text-primary_on-color":"#ffffff","Icon/Bg-icon-brand-light":"#f3fcf6","Alpha/alpha-white-50":"#ffffff80","Alpha/alpha-white-70":"#ffffffb2","Button/button-background-transparent-default":"#ffffff00","Button/button-background-transparent-focused":"#ffffff00"},"dark":{},"roles":{"brand":["Button/button-background-primary-default","Button/button-background-primary-hovered","Button/button-background-primary-pressed","Button/button-background-primary-selected","Text/text-primary","Background/background-primary-50","Background/background-primary-400","Background/background-SA-Flag"],"border":["Border/border-neutral-primary","Border/border-neutral-secondary","Border/border-black","Border/border-white","Border/border-white-40","Border/border-secondary","Border/border-success-light","Border/border-warning-light","Border/border-error-light","Border/border-info-light","Border/border-disabled","Global/border-disabled","Form/field-border-default","Form/field-border-hovered","Form/field-border-pressed","Form/field-border-error"],"semantic":{"success":["Background/background-success","Background/background-success-25","Text/text-success","Border/border-success-light","Icon/background-success-light"],"warning":["Background/background-warning","Background/background-warning-25","Background/background-warning-50","Text/text-warning","Border/border-warning-light","Icon/icon-warning","Icon/background-warning-light"],"error":["Background/background-error","Background/background-error-25","Text/text-error","Border/border-error-light","Icon/background-error-light","Button/button-background-danger-primary-default","Form/field-border-error"],"info":["Background/background-info","Background/background-info-25","Text/text-info","Border/border-info-light","Icon/background-info-light","Tag/tag-text-info","Tag/tag-background-info","Tag/tag-background-info-light","Tag/tag-border-info","Tag/tag-border-info-light","Tag/tag-icon-info"]}}},"typography":{"families":{"latin":["IBM Plex Sans Arabic"],"arabic":["IBM Plex Sans Arabic"]},"weights":[400,500,600,700],"ramp":[{"name":"Display xl","size":60,"lineHeight":72,"letterSpacing":-2,"weight":600,"script":"both"},{"name":"Display lg","size":48,"lineHeight":60,"letterSpacing":-2,"weight":600,"script":"both"},{"name":"Display sm","size":30,"lineHeight":38,"letterSpacing":0,"weight":700,"script":"both"},{"name":"Display xs","size":24,"lineHeight":32,"letterSpacing":0,"weight":600,"script":"both"},{"name":"Text xl","size":20,"lineHeight":30,"letterSpacing":0,"weight":600,"script":"both"},{"name":"Text lg","size":18,"lineHeight":28,"letterSpacing":0,"weight":700,"script":"both"},{"name":"Text md","size":16,"lineHeight":24,"letterSpacing":0,"weight":400,"script":"both"},{"name":"Text sm","size":14,"lineHeight":20,"letterSpacing":0,"weight":400,"script":"both"},{"name":"Text xs","size":12,"lineHeight":18,"letterSpacing":0,"weight":500,"script":"both"},{"name":"Text 2xs","size":10,"lineHeight":14,"letterSpacing":0,"weight":600,"script":"both"}]},"spacing":{"base":2,"scale":[0,2,4,6,8,12,16,20,24,32,40,48,64,80,96,128,160,192,224,256,320,384,480,640,720,768,1024,1280,1440,1600,1920],"rhythm":[24,32,40,48,64,80,96,128]},"radius":{"scale":[0,2,4,6,8,16,24],"pill":9999},"border":{"widths":[1,2]},"elevation":{"levels":{"Shadows/shadow-xs":"0 1px 2px 0 #1018280d","Shadows/shadow-sm":"0 1px 2px 0 #1018280d, 0 1px 3px 0 #1018280d","Shadows/shadow-md":"0 2px 4px -2px #1018280f, 0 4px 8px -2px #1018281a","Shadows/shadow-lg":"0 4px 6px -2px #10182808, 0 12px 16px -4px #10182814","Shadows/shadow-xl":"0 8px 8px -4px #10182808, 0 20px 24px -4px #10182814","Shadows/shadow-2xl":"0 24px 48px -12px #1018282e","Shadows/shadow-3xl":"0 32px 64px -12px #10182824"},"backdropBlur":{"backdrop-blur-sm":8,"backdrop-blur-md":16,"backdrop-blur-lg":24,"backdrop-blur-xl":40}},"breakpoints":{"list":[{"name":"mobile","min":0,"container":null,"gutter":16},{"name":"desktop","min":768,"container":1280,"gutter":32}],"widths":{"xxs":320,"xs":384,"sm":480,"md":560,"lg":640,"xl":768,"2xl":1024,"3xl":1280,"4xl":1440,"5xl":1600,"6xl":1920,"paragraph-max-width":720}},"icons":{"set":"DGA Platforms Code icon set","sizes":[],"strokeWidth":null,"deferred":true},"motion":{"durations":[],"easings":[]},"numerals":null,"a11y":{"minTargetPx":{"desktop":24,"mobile":24}},"dgaVersion":"1.0.3"};
  var COMPONENTS = {"synced":"2026-08-18","source":{"standard":"DGA Platforms Code","publisher":"SDGA / Digital Government Authority, Saudi Arabia","profile":"https://www.figma.com/@sdga","manifest":"See sources.json"},"components":[{"name":"Button","figmaNodeId":"1:1183","variants":["primary","neutral","black","oncolor","transparent","danger-primary","danger-secondary"],"sizes":[{"name":"lg","height":null,"paddingInline":16,"iconGap":4,"fontSize":16,"radius":4},{"name":"md","height":null,"paddingInline":12,"iconGap":4,"fontSize":14,"radius":4},{"name":"sm","height":null,"paddingInline":8,"iconGap":4,"fontSize":12,"radius":4}],"states":["default","hovered","pressed","selected","focused","disabled"],"anatomy":"Optional leading icon, label, optional trailing icon. Gap is 4 at every size — only the inline padding and type step change. Corner is radius-sm (4) throughout, not the size-dependent radius some systems use.","identifiers":{"roles":["button"],"tags":["button","a"],"classHints":[]},"appliesTo":["desktop","mobile"]},{"name":"Text input","figmaNodeId":"954:19434","variants":["default","darker","lighter"],"sizes":[{"name":"default","height":null,"paddingInlineStart":8,"paddingInlineEnd":16,"iconGap":8,"labelGap":8,"fontSize":16,"radius":4}],"states":["default","hovered","pressed","focused","filled","readonly","error","disabled"],"anatomy":"Label above field with an 8 gap; field carries a 1px border (border colour changes per state), radius-sm (4). Placeholder uses text-secondary-paragraph, filled text uses text-default. Error state swaps the border to field-border-error.","identifiers":{"roles":["textbox"],"tags":["input","textarea"],"classHints":[]},"appliesTo":["desktop","mobile"]},{"name":"Card","figmaNodeId":"8940:22264","variants":["default"],"sizes":[{"name":"lg","height":null,"gap":24,"fontSize":18,"radius":16}],"states":["default","disabled"],"anatomy":"background-card on radius-lg (16), internal gap 24, title at Text lg/Bold (18/28). Elevation is Shadows/shadow-md when raised.","identifiers":{"roles":["article","group"],"tags":["article","section","div"],"classHints":["card"]},"appliesTo":["desktop","mobile"]},{"name":"Inline alert / Notification","figmaNodeId":"1730:46041","variants":["info","success","warning","error"],"sizes":[{"name":"default","height":null,"padding":16,"paddingInline":24,"gap":16,"radius":8}],"states":["default"],"anatomy":"Icon, then title at Text md/Semibold with body at Text sm/Regular separated by text-content-gap 8, then an optional button group with buttons-group-gap 8. Each variant pairs its background-<role>-25 surface with its border-<role>-light edge and text-<role> label — the three always move together.","identifiers":{"roles":["alert","status"],"tags":["div"],"classHints":["alert","notification","toast"]},"appliesTo":["desktop","mobile"]},{"name":"Table","figmaNodeId":"2:5 (Foundations/Effect styles)","variants":["default"],"sizes":[{"name":"default","height":null,"cellPaddingInline":16,"cellPaddingBlock":8,"cellGap":8,"fontSize":14,"radius":8}],"states":["default","header"],"anatomy":"Header row on table-background-header #f3f4f6 with table-text-head #384250; cells separated by table-cell-border #d2d6db. Cell padding is 16 inline / 8 block with an 8 gap between cell contents.","identifiers":{"roles":["table"],"tags":["table"],"classHints":["table"]},"appliesTo":["desktop","mobile"]},{"name":"UI Shell — Tab Bar","figmaNodeId":"8332:23832","appliesTo":["mobile"],"variants":["1-5 tabs","no selection","on-color","RTL"],"sizes":[{"name":"default","width":375,"height":84,"itemWidth":46,"itemWidthRtl":54,"itemHeight":70,"itemGap":4,"fontSize":12}],"states":["normal","pressed","selected"],"anatomy":"Bottom bar 84 tall across a 375 viewport. Each tab item is 46x70 (54 wide in RTL — the item widens rather than the label truncating), icon over a 12/18 label, tab-button-gap 4. Supports 1-5 tabs plus a no-selection state, each with an on-color variant. Badge indicators are 12x12 small, 16x16 large, 30x16 with max digits.","identifiers":{"roles":["tablist","navigation"],"tags":["nav"],"classHints":["tabbar","bottom-nav"]}},{"name":"UI Shell — Navigation Bar","figmaNodeId":"8335:15199","appliesTo":["mobile"],"variants":[],"sizes":[],"states":[],"anatomy":"Mobile top bar. Present in the library and recorded so an auditor knows it exists; measurements not yet extracted.","identifiers":{"roles":["banner","navigation"],"tags":["header","nav"],"classHints":["navbar","appbar"]},"incomplete":true}]};
  var BENCHMARKS = {"schema":"dga-benchmarks/1","sites":[{"id":"dga.gov.sa","label":"dga.gov.sa/ar — the publisher's own site","auditedAt":"2026-08-18","ledgerSynced":"2026-08-18","dgaVersion":"1.0.3","engine":"db28d0f","viewports":{"web":{"score":71.76,"band":"Partial","coverage":83.16,"checks":{"C1":0.71,"C2":1,"T1":0.78,"T2":0.88,"T3":1,"T4":0.76,"S1":0.81,"S2":0,"S3":0.98,"E1":0.71,"E2":0.87,"E3":0.74,"P1":0.4,"P2":0.89,"P3":0.2,"R1":1,"R3":1,"A1":0.95,"A2":0.09,"A4":1}},"mobile":{"score":69.72,"band":"Partial","coverage":83.16,"checks":{"C1":0.7,"C2":1,"T1":0.76,"T2":0.77,"T3":1,"T4":0.65,"S1":0.73,"S2":0,"S3":0.98,"E1":0.69,"E2":0.87,"E3":0.74,"P1":0.4,"P2":0.89,"P3":0.2,"R1":1,"R3":1,"A1":0.94,"A2":0.09,"A4":1}}},"notMeasured":["A3","C3","C4","I1","I2","M1"],"caveats":["A3 has no reading: the in-app browser never holds window focus, so :focus-visible cannot be observed","P2 excludes component states for the same reason — it measures size/type conformance only","C3 withdrawn: the semantic-context measure resolved every hit to a single page-level wrapper, so it proved nothing","Captured by resize without an intervening reload, so load-time responsive gates did not re-run at 375px"]}],"baseline":{"web":71.8,"mobile":70.7,"setOn":"2026-08-18","from":"dga.gov.sa","reason":"first two-viewport capture at real widths (1280 and 375) through a browser that renders the full desktop layout","note":"PINNED. Moving this is a deliberate act, recorded here with a reason. Re-auditing dga.gov.sa does NOT move it — a verdict that changes because someone else was re-measured is not reproducible.","basis":"context for reading a score, never a pass threshold. DGA publishes no passing score; readiness is decided on its mandatory tier."}};
  var CRITERIA = {"$comment":"DGA's OWN published assessment framework, read from design.dga.gov.sa/AssessmentCriteria. This is the authority the auditor answers to. Recorded here the way the token ledger is recorded — with its source and capture date — so the mapping can be checked rather than trusted. The headline finding: DGA does not publish a passing score. It publishes a checklist with a compliance status per criterion, and states that formal review confirms a project meets ALL the criteria. Any percentage this tool produces is its own adoption metric and must never be presented as DGA's verdict.","schema":"dga-criteria/1","source":"https://design.dga.gov.sa/AssessmentCriteria","capturedAt":"2026-08-18","dgaVersion":"1.0","submitTo":"DS-DGA@dga.gov.sa","$quotes":["حدد \"حالة الامتثال\" وأضف التعليقات إذا لزم الأمر — mark the compliance status and add comments if needed","تضمن المراجعة الرسمية أن مشروعك يفي بجميع المعايير — formal review ensures your project meets ALL the criteria","قم بتضمين قائمة التحقق عند تقديم مشروعك — include the checklist when you submit your project"],"categories":[{"id":"accessibility","ar":"إمكانية الوصول","en":"Accessibility","summary":"Conformance to WCAG for users with disabilities, and compatibility with assistive technology."},{"id":"consistency","ar":"الاتساق","en":"Consistency","summary":"Unified use of design tokens — colour, typography, spacing — to hold a coherent identity."},{"id":"design","ar":"التصميم","en":"Design","summary":"Visual consistency with the design tokens and UI kit, and responsive behaviour across devices."},{"id":"usability","ar":"سهولة الاستخدام","en":"Usability","summary":"Clarity, intuitiveness and logical flow, including load times and task completion."}],"tiers":[{"id":"mandatory","ar":"الامتثال الإلزامي","en":"Mandatory","gates":true},{"id":"recommended","ar":"المعايير الموصى بها","en":"Recommended","gates":false}],"criteria":[{"id":"design-system","tier":"mandatory","category":"design","ar":"الامتثال لنظام التصميم","en":"Implement version 1.0 of the unified design system (Platforms Code) correctly."},{"id":"type-colour","tier":"mandatory","category":"consistency","ar":"معايير الخطوط و الألوان","en":"Implement the approved primary text colours and functional colours in line with the unified design system."},{"id":"layout-spacing","tier":"mandatory","category":"design","ar":"التخطيط و التباعد","en":"Follow the defined layout and spacing guidelines, including grid frame dimensions, a mobile-first methodology, and the spacing grid."},{"id":"mobile-usability","tier":"mandatory","category":"usability","ar":"قابلية الاستخدام من خلال الجوال","en":"Ensure the application or website is fully usable on mobile devices, accounting for touch interactions, viewport size, and reaching navigation on small screens."},{"id":"accessibility-wcag","tier":"mandatory","category":"accessibility","ar":"إمكانية الوصول (فئة تقييم)","en":"Conformance to WCAG, assessed as an evaluation category in its own right.","$placement":"DGA lists إمكانية الوصول as one of four assessment CATEGORIES rather than inside the four الأساسي items. It is treated as gating here because the design system's own accessibility page adopts WCAG by name — «إرشادات الوصول إلى محتوى الويب (WCAG)» — and requires «توفير تباين بين النص والخلفية» and keyboard access to all interactive elements, and because WCAG AA carries a statutory duty for Saudi government services. This is the one placement decision in this file that is a reading rather than a quotation; it is called out so it can be challenged.","supportedBy":"https://design.dga.gov.sa/thoughts/AccessibilityEase"},{"id":"design-consistency","tier":"recommended","category":"design","ar":"اتساق التصميم والمعايير","en":"Use approved icons, follow the custom-icon guidelines and consistent visual design elements, and implement components according to the design system."},{"id":"ux-interaction","tier":"recommended","category":"usability","ar":"تجربة المستخدم وتصميم التفاعل","en":"Effective interaction design, intuitive navigation, efficient task completion, clearly explained errors, immediate feedback and predictable interface behaviour.","automatable":false},{"id":"content-strategy","tier":"recommended","category":"usability","ar":"استراتيجية المحتوى والترجمة","en":"A sitemap supporting navigation and content discovery, an Arabic-first content strategy, and clear concise language for the intended audience.","automatable":"partial"},{"id":"usability-accessibility","tier":"recommended","category":"usability","ar":"سهولة الاستخدام وإمكانية الوصول","en":"Effective search, accessible help resources, user feedback mechanisms, visible privacy notice, and consistent error handling across the platform.","automatable":false}],"$notAutomatable":"ux-interaction, usability-accessibility and most of content-strategy cannot be measured by reading a rendered page. Task completion, load times, error messaging, help resources and feedback mechanisms need human review against DGA's downloadable checklist. Any report from this tool must say so rather than implying it covers the whole framework."};

/*
 * probe.js — the deterministic half of a DGA audit. Pure: walks the rendered DOM
 * and returns an inventory of what actually reached the screen. No judgement
 * happens here and none should; score.js turns this into numbers.
 *
 * Extracted mechanically from the original in-page script so the measurements
 * are byte-for-byte the ones that produced the audits already on record.
 */
function probe(OPTS_IN = {}) {
  const OPTS = OPTS_IN || {};
  const LABEL = OPTS.label || 'default';
  const MAX_ENTRIES = OPTS.maxEntries || 200; // per tally, by frequency
  const MAX_SAMPLES = 6;
  const MAX_ELEMENTS = OPTS.maxElements || 6000;
  const MAX_FOCUS_PROBES = OPTS.maxFocusProbes || 40;
  // Test and diagnostic switch: force the cascade path even where the browser CAN observe
  // focus. Without it the fallback is unreachable in headless Chrome, which does hold OS
  // focus — so the code that runs on the real audit surface would never be exercised.
  const FORCE_CASCADE = OPTS.forceCascade === true;
  // WCAG 2.2 AA floor unless the ledger raises it for this viewport — DGA mobile
  // guidance is larger, and judging a 375px capture by the desktop number is how
  // mobile target sizes came out wrong before.
  const MIN_TARGET = OPTS.minTargetPx || 24;

  /* ---------------------------------------------------------------- colour */

  // One canvas resolves every colour syntax the platform accepts — rgb, hsl,
  // oklch, color-mix, named — to straight RGBA. Parsing strings by hand breaks
  // the first time a stylesheet ships a colour space we did not anticipate.
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  const cx = cvs.getContext('2d', { willReadFrequently: true });
  const colorCache = new Map();

  function parseColor(str) {
    if (!str) return null;
    const s = String(str).trim();
    if (!s || s === 'none') return null;
    if (s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return { r: 0, g: 0, b: 0, a: 0 };
    if (colorCache.has(s)) return colorCache.get(s);
    let out = null;
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[,\/\s]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && p.every((n) => Number.isFinite(n))) {
        out = { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      }
    }
    if (!out) {
      try {
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = '#000';
        cx.fillStyle = s;
        // A fillStyle the browser rejected stays '#000'; that is indistinguishable
        // from a real black, so only trust the readback when it changed or the
        // input plausibly *is* black.
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
      } catch (e) {
        out = null;
      }
    }
    colorCache.set(s, out);
    return out;
  }

  const hex = (c) =>
    '#' +
    [c.r, c.g, c.b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('');

  function over(fg, bg) {
    // Source-over composite of a translucent fg onto an opaque bg.
    const a = fg.a;
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
  }

  function luminance(c) {
    const f = (v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function contrast(a, b) {
    const l1 = luminance(a);
    const l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /* -------------------------------------------------------------- selectors */

  function selectorFor(el) {
    const parts = [];
    let n = el;
    for (let depth = 0; n && n.nodeType === 1 && depth < 4; depth++, n = n.parentElement) {
      let p = n.tagName.toLowerCase();
      if (n.id) {
        parts.unshift('#' + n.id);
        break;
      }
      const cls = (n.getAttribute('class') || '')
        .trim()
        .split(/\s+/)
        .filter((c) => c && c.length < 32 && !/^(css|sc)-[a-z0-9]{4,}$/i.test(c))
        .slice(0, 2);
      if (cls.length) p += '.' + cls.join('.');
      parts.unshift(p);
    }
    return parts.join(' > ').slice(0, 160);
  }

  /* -------------------------------------------------------------- locators */

  /**
   * Where on the page is this, in words a person can act on?
   *
   * selectorFor gives a CSS path, which tells a developer how to SELECT an element and
   * tells nobody where it IS. "div.row > a.btn" cannot be found by eye; "header ·
   * navigation · «تسجيل الدخول»" can. Region and section are read off the page's own
   * landmarks and headings, so the words in the report are the words on the screen.
   */
  const REGION_SEL = 'header,nav,main,footer,aside,form,' +
    '[role=banner],[role=navigation],[role=main],[role=contentinfo],[role=complementary],[role=search],[role=form]';
  const REGION_NAME = {
    header: 'header', banner: 'header',
    nav: 'navigation', navigation: 'navigation',
    main: 'main',
    footer: 'footer', contentinfo: 'footer',
    aside: 'aside', complementary: 'aside',
    form: 'form', search: 'search',
  };

  function textOf(el, max) {
    const t = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title')))
      || el.textContent || '';
    return String(t).replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function labelledBy(el) {
    const ids = el.getAttribute('aria-labelledby');
    if (!ids) return '';
    return ids.split(/\s+/).map((i) => document.getElementById(i)).filter(Boolean)
      .map((n) => textOf(n, 60)).join(' ').trim();
  }

  function regionOf(el) {
    const host = el.closest(REGION_SEL);
    if (!host) return null;
    const key = String(host.getAttribute('role') || host.tagName).toLowerCase();
    return REGION_NAME[key] || key;
  }

  // Collected once. sectionOf runs for every sample on the page, and re-walking the
  // document per call turned a 20ms probe into a visible stall.
  let HEADINGS = null;
  const headings = () => (HEADINGS || (HEADINGS = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]));

  function sectionOf(el) {
    const box = el.closest('section,article,[role=region],[aria-label],[aria-labelledby]');
    if (box && box !== document.body) {
      const named = box.getAttribute('aria-label') || labelledBy(box);
      if (named) return named.replace(/\s+/g, ' ').trim().slice(0, 60);
      const h = box.querySelector('h1,h2,h3,h4,h5,h6');
      if (h) { const t = textOf(h, 60); if (t) return t; }
    }
    // The fallback that makes this work at all: the nearest heading BEFORE this element
    // in document order. Most pages carry no section landmarks; nearly all carry headings.
    let last = null;
    for (const h of headings()) {
      if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) last = h;
      else break;
    }
    return last ? (textOf(last, 60) || null) : null;
  }

  /**
   * A NAME, not a transcript. textContent on a container concatenates every descendant,
   * which produced report rows reading «PersonalizedThe services are created acc» — the
   * card heading welded to its body copy. A label a person recognises comes from the
   * element itself: its accessible name, then its own direct text, then the heading
   * inside it. Only fall back to the flattened subtree when nothing else exists.
   */
  function nameOf(el) {
    const aria = el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title'));
    if (aria && aria.trim()) return aria.replace(/\s+/g, ' ').trim().slice(0, 40);
    let own = '';
    for (const n of el.childNodes || []) if (n.nodeType === 3) own += n.nodeValue;
    own = own.replace(/\s+/g, ' ').trim();
    if (own) return own.slice(0, 40);
    const h = el.querySelector && el.querySelector('h1,h2,h3,h4,h5,h6,legend,figcaption');
    if (h) { const t = textOf(h, 40); if (t) return t; }
    return textOf(el, 40);
  }

  const LOC_CACHE = new WeakMap();
  function locate(el) {
    if (LOC_CACHE.has(el)) return LOC_CACHE.get(el);
    let out;
    try {
      const r = el.getBoundingClientRect();
      out = {
        sel: selectorFor(el),
        region: regionOf(el),
        section: sectionOf(el),
        name: nameOf(el) || null,
        at: { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY),
              w: Math.round(r.width), h: Math.round(r.height) },
      };
    } catch (e) {
      out = { sel: selectorFor(el), region: null, section: null, name: null, at: null };
    }
    LOC_CACHE.set(el, out);
    return out;
  }

  /* ----------------------------------------------------------------- tally */

  function tally() {
    const map = new Map();
    return {
      add(value, el, extra) {
        if (value == null || value === '') return;
        const k = String(value);
        let e = map.get(k);
        if (!e) {
          e = { value: k, count: 0, samples: [] };
          if (extra) Object.assign(e, extra);
          map.set(k, e);
        }
        e.count++;
        if (el && e.samples.length < MAX_SAMPLES) e.samples.push(locate(el));
      },
      dump() {
        return [...map.values()].sort((a, b) => b.count - a.count).slice(0, MAX_ENTRIES);
      },
      total() {
        let t = 0;
        for (const e of map.values()) t += e.count;
        return t;
      },
    };
  }

  const T = {
    textColor: tally(),
    bgColor: tally(),
    borderColor: tally(),
    svgFill: tally(),
    fontFamily: tally(),
    fontSize: tally(),
    fontWeight: tally(),
    lineHeight: tally(),
    letterSpacing: tally(),
    spacing: tally(),
    gap: tally(),
    radius: tally(),
    borderWidth: tally(),
    shadow: tally(),
    duration: tally(),
    easing: tally(),
    iconSize: tally(),
    strokeWidth: tally(),
    // size|line-height|tracking as one key, because T4 asks whether a ramp STEP was
    // used — a 14px body with 72px display leading passes any test that looks at
    // leading alone, and that is what the old check did despite documenting a triple.
    typePair: tally(),
  };

  /* ------------------------------------------------------------- traversal */

  const px = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  };
  const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const ARABIC_INDIC = /[٠-٩۰-۹]/;
  const WESTERN_DIGIT = /[0-9]/;

  function visible(el, cs, rect) {
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    if (rect.width <= 0 || rect.height <= 0) return false;
    return true;
  }

  function ownText(el) {
    let s = '';
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
    return s.trim();
  }

  function effectiveBackground(el) {
    // Walk up compositing translucent layers until something opaque stops us.
    const stack = [];
    let n = el;
    let imageBehind = false;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') imageBehind = true;
      const c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) {
        stack.push(c);
        if (c.a >= 1) break;
      }
      n = n.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    const rootBg = parseColor(getComputedStyle(document.documentElement).backgroundColor);
    if (rootBg && rootBg.a >= 1) base = rootBg;
    let acc = base;
    for (let i = stack.length - 1; i >= 0; i--) acc = stack[i].a >= 1 ? stack[i] : over(stack[i], acc);
    return { color: acc, imageBehind };
  }

  const contrastFindings = [];
  const nonTextFindings = [];
  const targetFindings = [];
  let textRuns = 0;
  let textRunsPassing = 0;
  let textRunsIndeterminate = 0;
  let nonTextChecked = 0;
  let nonTextPassing = 0;
  let interactiveCount = 0;
  let interactivePassingTarget = 0;

  const INTERACTIVE = 'a[href],button,input,select,textarea,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=switch],[role=menuitem],[tabindex]:not([tabindex="-1"])';

  let arabicRuns = 0;
  let arabicRunsInArabicFace = 0;
  let arabicIndicSeen = 0;
  let westernDigitSeen = 0;
  let mirroredIconSuspects = 0;
  let rtlElements = 0;
  let ltrElements = 0;
  let decorativeBordersSkipped = 0;
  let inlineTargetsExempt = 0;
  let spacedTargetsExempt = 0;

  /**
   * Is this border carrying information needed to identify a control or its state?
   * WCAG 1.4.11 covers that; it does not cover decoration. Controls, things with a
   * widget role, and elements a control lives inside all qualify. A plain div whose
   * only job is a hairline does not.
   */
  const COMPONENTISH = 'input,select,textarea,button,a[href],summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=radio],[role=switch],[role=combobox],[role=listbox],[role=menuitem],[role=textbox],[role=searchbox],[role=slider],[role=spinbutton],[contenteditable="true"]';
  // SC 1.4.11 covers visual information required to IDENTIFY a component. A link
  // wrapped around a headline and a paragraph is a content CARD: its outline encloses
  // content rather than identifying an affordance, and the link is already identified
  // by its text and its hit area. Counting those hairlines is what put dga.gov.sa at
  // 3 of 34 — almost entirely news cards bordered #d2d6db on #f7fdf9.
  const CARD_CONTENT = 'h1,h2,h3,h4,h5,h6,p,article,section,ul,ol,table,figure,blockquote';
  function looksLikeContentCard(el) {
    try {
      const r = el.getBoundingClientRect();
      if (r.height <= 96) return false;                 // too small to be a card
      return !!(el.querySelector && el.querySelector(CARD_CONTENT));
    } catch (e) { return false; }
  }

  function isComponentBoundary(el) {
    if (el.matches && el.matches(COMPONENTISH)) {
      if (el.matches('a[href],[role=link]') && looksLikeContentCard(el)) return false;
      return true;
    }
    // A wrapper drawn around a control — the bordered shell of a search field, say —
    // is carrying that control's boundary.
    try {
      if (el.querySelector && el.querySelector(COMPONENTISH)) {
        const r = el.getBoundingClientRect();
        if (r.height <= 96) return true; // a control shell, not a page section
      }
    } catch (e) {}
    return false;
  }

  /**
   * The value as AUTHORED, not as resolved. Walks the cascade for the winning
   * declaration so `auto` and percentages can be told apart from real lengths.
   * Returns null when nothing authored it.
   */
  const authoredCache = new Map();
  function authoredValue(el, prop) {
    if (el.style && el.style.getPropertyValue(prop)) return el.style.getPropertyValue(prop).trim();
    const key = el.tagName + '|' + (el.getAttribute('class') || '') + '|' + prop;
    if (authoredCache.has(key)) return authoredCache.get(key);
    let found = null;
    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (e) { continue; }
        for (const r of rules) {
          if (!r.style || !r.selectorText) continue;
          const v = r.style.getPropertyValue(prop);
          if (!v) continue;
          try { if (el.matches(r.selectorText)) found = v.trim(); } catch (e) {}
        }
      }
    } catch (e) {}
    if (authoredCache.size < 400) authoredCache.set(key, found);
    return found;
  }

  /**
   * WCAG 2.2 spacing exception: an undersized target passes if a MIN_TARGET-wide
   * circle centred on it does not intersect the equivalent circle of any other
   * target. Small controls with room around them are reachable; small controls
   * crowded together are not, and that is the distinction the SC draws.
   */
  let targetRects = null;
  function spacingExceptionMet(el, rect) {
    if (targetRects === null) {
      targetRects = [];
      for (const t of document.querySelectorAll(INTERACTIVE)) {
        const r = t.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) targetRects.push({ el: t, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
      }
    }
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (const t of targetRects) {
      if (t.el === el) continue;
      const d = Math.hypot(t.cx - cx, t.cy - cy);
      if (d < MIN_TARGET) return false; // the two circles overlap
    }
    return true;
  }

  /**
   * A shadow reduced to comparable numbers: [x, y, blur, spread, r, g, b, a] per
   * layer, inset flagged. Both `#1018280d` and `rgba(16,24,40,0.05)` land on the
   * same values, which is the whole point — the ledger writes one and the browser
   * reports the other.
   */
  function normaliseShadow(value) {
    return String(value)
      .split(/,(?![^(]*\))/)
      .map((layer) => {
        const inset = /\binset\b/.test(layer);
        let rest = layer.replace(/\binset\b/, '');
        let colour = null;
        const fn = rest.match(/(rgba?|hsla?|oklch|color)\([^)]*\)/i);
        if (fn) { colour = fn[0]; rest = rest.replace(fn[0], ''); }
        else {
          const hexM = rest.match(/#[0-9a-f]{3,8}\b/i);
          if (hexM) { colour = hexM[0]; rest = rest.replace(hexM[0], ''); }
        }
        const lens = (rest.match(/-?\d*\.?\d+(px|rem|em)?/g) || [])
          .map((n) => Math.round(parseFloat(n) * 100) / 100)
          .filter((n) => Number.isFinite(n));
        while (lens.length < 4) lens.push(0);
        const c = colour ? parseColor(colour) : null;
        const rgba = c ? [Math.round(c.r), Math.round(c.g), Math.round(c.b), Math.round(c.a * 100) / 100] : [0, 0, 0, 1];
        return (inset ? 'inset ' : '') + lens.slice(0, 4).join(' ') + ' / ' + rgba.join(' ');
      })
      .join(', ');
  }

  // Declared family name -> the file it actually loads. Built before the walk
  // because both T1 and R3 need to resolve an alias before judging it: a site
  // serving IBMPlexSansArabic-Regular.ttf under the name `regularFont` is using
  // the specified typeface, and the name alone would say the opposite.
  const FACE_SRC = (() => {
    const map = {};
    const fromSrc = (src) => {
      const m = String(src || '').match(/url\(\s*["']?([^"')]+)/i);
      if (!m) return null;
      const file = m[1].split('/').pop().split('?')[0];
      return file.replace(/\.(woff2?|ttf|otf|eot)$/i, '').replace(/[-_](regular|bold|semibold|medium|light|thin|black|italic|\d{3})$/i, '');
    };
    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (e) { continue; }
        const walk = (list) => {
          for (const r of list) {
            if (r.cssRules && r.cssRules.length) walk(r.cssRules);
            if (!r.style || !r.style.src) continue;
            const fam = (r.style.fontFamily || '').replace(/["']/g, '').trim();
            const resolved = fromSrc(r.style.src);
            if (fam && resolved && Object.keys(map).length < 60) map[fam] = resolved;
          }
        };
        walk(rules);
      }
    } catch (e) {}
    return map;
  })();

  const all = document.querySelectorAll('*');
  const elements = all.length > MAX_ELEMENTS ? [...all].slice(0, MAX_ELEMENTS) : [...all];
  let examined = 0;

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta' || tag === 'head') continue;
    let cs, rect;
    try {
      cs = getComputedStyle(el);
      rect = el.getBoundingClientRect();
    } catch (e) {
      continue;
    }
    if (!visible(el, cs, rect)) continue;
    examined++;

    /* colour */
    const bgc = parseColor(cs.backgroundColor);
    if (bgc && bgc.a > 0) T.bgColor.add(hex(bgc), el);

    const text = ownText(el);
    if (text) {
      const fg = parseColor(cs.color);
      if (fg && fg.a > 0) T.textColor.add(hex(fg), el);
      T.fontFamily.add(cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), el);
      T.fontSize.add(px(cs.fontSize), el);
      T.fontWeight.add(cs.fontWeight, el);
      T.lineHeight.add(cs.lineHeight === 'normal' ? 'normal' : px(cs.lineHeight), el);
      T.letterSpacing.add(cs.letterSpacing === 'normal' ? '0' : px(cs.letterSpacing), el);
      T.typePair.add(
        [px(cs.fontSize), cs.lineHeight === 'normal' ? 'normal' : px(cs.lineHeight),
         cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing)].join('|'), el);

      /* A1 — text contrast */
      const size = px(cs.fontSize) || 16;
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const need = large ? 3.0 : 4.5;
      const { color: bg, imageBehind } = effectiveBackground(el);
      textRuns++;
      if (imageBehind || !fg || fg.a <= 0) {
        textRunsIndeterminate++;
      } else {
        const eff = fg.a < 1 ? over(fg, bg) : fg;
        const ratio = Math.round(contrast(eff, bg) * 100) / 100;
        if (ratio >= need) textRunsPassing++;
        else if (contrastFindings.length < 60) {
          contrastFindings.push({
            selector: selectorFor(el),
            loc: locate(el),
            text: text.slice(0, 60),
            fg: hex(eff),
            bg: hex(bg),
            ratio,
            required: need,
            fontSize: size,
            fontWeight: weight,
          });
        }
      }

      /* R3 — script and numerals */
      if (ARABIC.test(text)) {
        arabicRuns++;
        // Test the FILE the family loads, not just the declared name. A site
        // serving IBMPlexSansArabic-Regular.ttf as `regularFont` is using an
        // Arabic face; the declared name alone says otherwise.
        const declared = cs.fontFamily.toLowerCase();
        const resolved = (declared.split(',')[0].replace(/["']/g, '').trim());
        const viaFace = FACE_SRC[resolved] || FACE_SRC[Object.keys(FACE_SRC).find((k) => k.toLowerCase() === resolved) || ''] || '';
        const hay = (declared + ' ' + viaFace).toLowerCase();
        if (/arab|kufi|naskh|cairo|tajawal|almarai|ibmplexsansarabic|ibm plex sans arabic|readex|noto/.test(hay)) arabicRunsInArabicFace++;
      }
      if (ARABIC_INDIC.test(text)) arabicIndicSeen++;
      if (WESTERN_DIGIT.test(text)) westernDigitSeen++;
    }

    /* borders */
    const bw = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];
    const bc = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
    for (let i = 0; i < 4; i++) {
      const w = px(cs[bw[i]]);
      if (w && w > 0) {
        T.borderWidth.add(w, el);
        const c = parseColor(cs[bc[i]]);
        if (c && c.a > 0) {
          T.borderColor.add(hex(c), el);
          /* A2 — non-text contrast.
             WCAG 1.4.11 covers visual information needed to IDENTIFY user interface
             components and states, plus graphical objects. It does not cover
             decoration. Checking every border on the page turned faint dividers and
             card outlines into conformance failures, which they are not — on one real
             audit that put the check at 1 of 44 and capped the band on hairlines. */
          if (isComponentBoundary(el)) {
            const { color: behind, imageBehind } = effectiveBackground(el.parentElement || el);
            if (!imageBehind) {
              nonTextChecked++;
              const eff = c.a < 1 ? over(c, behind) : c;
              const r = Math.round(contrast(eff, behind) * 100) / 100;
              if (r >= 3.0) nonTextPassing++;
              else if (nonTextFindings.length < 40) {
                nonTextFindings.push({ selector: selectorFor(el), loc: locate(el), border: hex(eff), against: hex(behind), ratio: r, required: 3.0 });
              }
            }
          } else {
            decorativeBordersSkipped++;
          }
        }
        break; // one border per element is enough for the tally
      }
    }

    /* shape */
    for (const p of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']) {
      const r = px(cs[p]);
      if (r && r > 0) {
        const pill = r >= Math.min(rect.width, rect.height) / 2 - 0.5;
        T.radius.add(pill ? 'pill' : r, el);
        break;
      }
    }
    // Shadows are tallied in a NORMALISED form, not as the browser's string. The
    // ledger stores `0 1px 2px 0 #1018280d` and Chrome serialises the same shadow
    // as `rgba(16, 24, 40, 0.05) 0px 1px 2px 0px`; comparing those as text, or by
    // scraping numbers out of them, can never match — the hex reads as one integer
    // and rgba() as four. E3 was structurally unpassable until this.
    if (cs.boxShadow && cs.boxShadow !== 'none') T.shadow.add(normaliseShadow(cs.boxShadow), el, { raw: cs.boxShadow.slice(0, 120) });

    // Spacing counts only what the AUTHOR wrote. Computed style cannot tell a design
    // decision from a browser default or a resolved layout value, and both were being
    // scored as off-scale choices: `margin: auto` arrived as 1231.47px, and Chrome's
    // own `button { padding: 1px 6px }` arrived as a 1px spacing token nobody chose.
    // Logical longhands are read too — a site that uses margin-block-end (which R2
    // rewards) must not become invisible to S1.
    for (const p of ['padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                     'padding-block-start', 'padding-block-end', 'padding-inline-start', 'padding-inline-end',
                     'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                     'margin-block-start', 'margin-block-end', 'margin-inline-start', 'margin-inline-end']) {
      const authored = authoredValue(el, p);
      if (authored === null || /auto|%|calc|var\(/i.test(authored)) continue;
      const v = px(authored);
      if (v && v > 0) T.spacing.add(v, el);
    }
    for (const p of ['rowGap', 'columnGap']) {
      const v = px(cs[p]);
      if (v && v > 0) T.gap.add(v, el);
    }

    /* motion */
    if (cs.transitionDuration && cs.transitionDuration !== '0s') {
      for (const d of cs.transitionDuration.split(',')) {
        const ms = Math.round(parseFloat(d) * 1000);
        if (ms > 0) T.duration.add(ms, el);
      }
      for (const e of (cs.transitionTimingFunction || '').split(/,(?![^(]*\))/)) {
        const v = e.trim();
        if (v) T.easing.add(v, el);
      }
    }
    if (cs.animationDuration && cs.animationDuration !== '0s') {
      for (const d of cs.animationDuration.split(',')) {
        const ms = Math.round(parseFloat(d) * 1000);
        if (ms > 0) T.duration.add(ms, el);
      }
    }

    /* icons */
    if (tag === 'svg') {
      const s = Math.round(Math.max(rect.width, rect.height));
      if (s > 0 && s <= 96) T.iconSize.add(s, el);
      const sw = el.getAttribute('stroke-width') || cs.strokeWidth;
      if (sw && sw !== '0px' && sw !== '0') T.strokeWidth.add(px(sw) ?? sw, el);
      const f = parseColor(cs.fill);
      if (f && f.a > 0 && cs.fill !== 'none') T.svgFill.add(hex(f), el);
      // A chevron or arrow that did not mirror under RTL is the classic defect.
      if (getComputedStyle(el).direction === 'rtl') {
        const cls = (el.getAttribute('class') || '') + ' ' + (el.getAttribute('data-icon') || '');
        if (/chevron|arrow|caret|back|forward|next|prev/i.test(cls) && !/scale\(-1|matrix\(-1/.test(cs.transform)) {
          mirroredIconSuspects++;
        }
      }
    }

    /* direction */
    const dir = cs.direction;
    if (dir === 'rtl') rtlElements++;
    else ltrElements++;

    /* A4 — target size, with the exceptions WCAG 2.2 actually grants.
       2.5.8 exempts a target that is INLINE in a sentence or block of text, and one
       with enough SPACING that a 24px circle centred on it touches no other target.
       Counting every link meant body and footer prose links were reported as
       failures they are not, which buried the genuinely small controls. */
    if (el.matches && el.matches(INTERACTIVE)) {
      // The inline exception is for a link sitting IN A SENTENCE. Three things all
      // have to hold, and the loose version of this wrongly exempted standalone
      // icon links: `inline-block` is a discrete box rather than running text, and a
      // target with no text of its own is not part of a sentence at all.
      const ownLabel = (el.textContent || '').trim();
      const inlineFlow = cs.display === 'inline' || cs.display === 'contents';
      const inProse = (() => {
        const p = el.parentElement;
        if (!p || !ownLabel) return false;
        if (!/^(P|LI|TD|TH|SPAN|EM|STRONG|BLOCKQUOTE|FIGCAPTION|DD|DT|LABEL|SMALL)$/.test(p.tagName)) return false;
        const parentText = (p.textContent || '').trim().length;
        return parentText > ownLabel.length + 20; // real prose around it
      })();
      if (inlineFlow && inProse) { inlineTargetsExempt++; continue; }

      interactiveCount++;
      const w = rect.width;
      const h = rect.height;
      if (w >= MIN_TARGET && h >= MIN_TARGET) interactivePassingTarget++;
      else if (spacingExceptionMet(el, rect)) { spacedTargetsExempt++; interactivePassingTarget++; }
      else if (targetFindings.length < 40) {
        targetFindings.push({
          selector: selectorFor(el),
          loc: locate(el),
          width: Math.round(w * 10) / 10,
          height: Math.round(h * 10) / 10,
          required: MIN_TARGET,
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
        });
      }
    }
  }

  /* ------------------------------------------------------- authored CSS */

  // R2 and M2 are about what the stylesheet SAYS, not what computed style shows
  // — a physical margin-left and a logical margin-inline-start compute to the
  // same pixels in LTR and diverge only in RTL, so the authored rule is the only
  // place the defect is visible.
  const cssStats = {
    rulesRead: 0,
    inaccessibleSheets: 0,
    logicalDecls: 0,
    physicalDecls: 0,
    physicalSamples: [],
    reducedMotionRules: 0,
    focusVisibleRules: 0,
    outlineNoneRules: 0,
    rtlOverrideRules: 0,
    // vendor CSS is measured but not scored — reported so a reader can see the split
    vendorLogicalDecls: 0,
    vendorPhysicalDecls: 0,
    vendorSheets: 0,
    firstPartySheets: 0,
  };
  /**
   * Was this directional longhand written by the author, or produced by expanding a
   * shorthand? If the covering shorthand is present in the same rule, the CSSOM
   * generated the longhand and it carries no directional intent.
   */
  function fromShorthand(style, prop) {
    const covers = {
      "margin-left": ["margin"], "margin-right": ["margin"],
      "padding-left": ["padding"], "padding-right": ["padding"],
      left: ["inset"], right: ["inset"],
      "border-left-width": ["border", "border-width"], "border-right-width": ["border", "border-width"],
      "border-left-style": ["border", "border-style"], "border-right-style": ["border", "border-style"],
      "border-left-color": ["border", "border-color"], "border-right-color": ["border", "border-color"],
      "border-left": ["border"], "border-right": ["border"],
    }[prop];
    if (!covers) return false;
    return covers.some((sh) => (style.getPropertyValue(sh) || "").trim() !== "");
  }

  const LOGICAL = /^(margin|padding|inset|border)-(inline|block)(-(start|end))?$|^(inset|margin|padding)-(inline|block)$|^border-(inline|block)-(start|end)-(width|color|style)$/;
  const PHYSICAL = /^(margin|padding)-(left|right)$|^(left|right)$|^border-(left|right)-(width|color|style)$|^border-(left|right)$|^float$|^clear$/;

  function walkRules(rules, inReducedMotion) {
    for (const rule of rules) {
      cssStats.rulesRead++;
      if (cssStats.rulesRead > 20000) return;
      if (rule.type === 4 || rule.media) {
        const mt = String(rule.conditionText || rule.media?.mediaText || '');
        const rm = /prefers-reduced-motion/.test(mt);
        if (rm) cssStats.reducedMotionRules++;
        if (rule.cssRules) walkRules(rule.cssRules, inReducedMotion || rm);
        continue;
      }
      // A plain CSSStyleRule exposes an EMPTY cssRules list in every engine that
      // supports CSS Nesting, so an unguarded `continue` here skipped the
      // declarations of every ordinary rule — silently zeroing logicalDecls and
      // physicalDecls (and the focus/rtl rule counts) on any real page. Recurse
      // only into rules that actually have children, then fall through so the
      // rule's own declarations are still read.
      if (rule.cssRules && rule.cssRules.length) walkRules(rule.cssRules, inReducedMotion);
      const sel = rule.selectorText || '';
      if (/:focus-visible|:focus\b/.test(sel)) cssStats.focusVisibleRules++;
      if (/\[dir=["']?rtl|:dir\(rtl\)|\.rtl\b/.test(sel)) cssStats.rtlOverrideRules++;
      const st = rule.style;
      if (!st) continue;
      if (/^(none|0)$/.test(st.getPropertyValue('outline') || '') || /^(none|0)$/.test(st.getPropertyValue('outline-style') || '')) {
        cssStats.outlineNoneRules++;
      }
      for (let i = 0; i < st.length; i++) {
        const p = st[i];
        if (LOGICAL.test(p)) cssStats.logicalDecls++;
        else if (PHYSICAL.test(p)) {
          // A longhand the CSSOM produced by expanding a shorthand is not a
          // directional choice. `margin: 0` sets all four sides and lists
          // margin-left among them; `border: 1px solid` lists border-right-width.
          // Neither has a "more logical" form the author declined to use, and
          // counting them made a page written entirely in logical properties read
          // as 24 physical declarations.
          if (fromShorthand(st, p)) continue;
          cssStats.physicalDecls++;
          if (cssStats.physicalSamples.length < 25) cssStats.physicalSamples.push({ selector: sel.slice(0, 100), property: p });
        }
      }
    }
  }
  // First-party versus vendor. R2 asks whether the TEAM wrote logical properties;
  // counting Bootstrap's thousands of physical declarations measures their framework
  // choice instead, and no site built on such a framework could ever score well no
  // matter how carefully its own CSS was written.
  const VENDOR = /(bootstrap|foundation|bulma|tailwind|materialize|semantic-ui|font-?awesome|slick|swiper|owl\.?carousel|jquery|select2|datatables|fullcalendar|aos|animate(\.min)?\.css|normalize|reset|primeng|primereact|antd|mui|chakra)/i;
  const isVendor = (href) => {
    if (!href) return false;
    try {
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return true;   // a CDN is not your code
      return VENDOR.test(u.pathname);
    } catch (e) { return false; }
  };
  for (const sheet of document.styleSheets) {
    const vendor = isVendor(sheet.href);
    const before = { l: cssStats.logicalDecls, p: cssStats.physicalDecls };
    try {
      walkRules(sheet.cssRules, false);
    } catch (e) {
      cssStats.inaccessibleSheets++;
      continue;
    }
    const added = { l: cssStats.logicalDecls - before.l, p: cssStats.physicalDecls - before.p };
    if (vendor) {
      cssStats.vendorLogicalDecls += added.l;
      cssStats.vendorPhysicalDecls += added.p;
      cssStats.logicalDecls = before.l;
      cssStats.physicalDecls = before.p;
      cssStats.vendorSheets++;
    } else {
      cssStats.firstPartySheets++;
    }
  }

  /* --------------------------------------------------------- A3 focus ring */

  // Actually focus a sample of controls and diff the computed style. Reading the
  // stylesheet alone cannot tell a replaced indicator from a removed one.
  //
  // The trap that made this check report zero on every modern site: el.focus() does
  // NOT make :focus-visible match. Nearly every design system now writes
  //     *:focus { outline: none }   /   *:focus-visible { outline: ... }
  // so a programmatic focus lands in the first rule, nothing changes, and a working
  // keyboard ring gets filed as missing. Measured on dga.gov.sa: 118 :focus rules in
  // the stylesheets, and zero computed-style change across all 59 controls.
  //
  // Per the :focus-visible spec, focus moved by script inherits the state when the
  // previously focused element matched it — and a text input always matches on
  // programmatic focus. So park focus on a throwaway input between probes, which puts
  // every subsequent .focus() into a genuine focus-visible state. Same page, same
  // engine: 9 of 59 controls show a ring.
  const focusProbe = { probed: 0, visible: 0, ring: 0, colourOnly: 0, seeded: false, method: 'observed', missing: [] };
  const prevActive = document.activeElement;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const probes = [...document.querySelectorAll(INTERACTIVE)].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !el.hasAttribute('disabled');
  });


  /**
   * When the browser will not hold OS focus, :focus-visible can never match and the live
   * probe reports nothing at all — which used to make A3 unmeasurable, and with it made
   * "Ready to submit" unreachable on the only surface that renders a real desktop layout.
   *
   * So resolve the CSS instead of observing it: strip the pseudo-class off every focus
   * rule, find which controls the remainder lands on, and order the matches by specificity
   * then source order to see which declaration finally wins.
   *
   * This is EVIDENCE, NOT OBSERVATION, and every consumer is told so via `method`. It is
   * blind to focus styling applied by script, and to anything a pseudo-element draws.
   */
  function specificity(sel) {
    const s = String(sel).replace(/\[[^\]]*\]/g, '\u0000A').replace(/::[a-z-]+/gi, '');
    const ids = (s.match(/#[\w-]+/g) || []).length;
    const cls = (s.match(/\.[\w-]+/g) || []).length
              + (s.match(/\u0000A/g) || []).length
              + (s.match(/:(?!:)[a-z-]+/gi) || []).length;
    const els = (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
    return ids * 10000 + cls * 100 + els;
  }

  function focusByCascade(probes) {
    const rules = [];
    let order = 0;
    const walk = (list) => {
      for (const r of list) {
        try { if (r.cssRules) walk(r.cssRules); } catch (e) {}
        const sel = r.selectorText;
        if (!sel || !/:focus/.test(sel) || !r.style) continue;
        for (const part of sel.split(',')) {
          if (!/:focus/.test(part)) continue;
          let bare = part.replace(/:focus-visible|:focus-within|:focus/g, '')
                         .replace(/::(before|after)/g, '').trim();
          if (!bare || /[>+~]$/.test(bare)) bare = bare ? bare + ' *' : '*';
          rules.push({ bare, spec: specificity(part), order: order++, style: r.style });
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules); } catch (e) {}
    }
    // weakest first, so the last write wins the same way the cascade resolves it
    rules.sort((a, b) => a.spec - b.spec || a.order - b.order);

    const out = { probed: 0, visible: 0, ring: 0, colourOnly: 0, seeded: false,
                  method: 'cascade-analysis', rulesConsidered: rules.length, missing: [] };
    for (const el of probes) {
      out.probed++;
      let os = null, ow = null, shadow = null, colour = false;
      for (const r of rules) {
        let hit = false;
        try { hit = el.matches(r.bare); } catch (e) { continue; }
        if (!hit) continue;
        const o = r.style.getPropertyValue('outline');
        if (o) {
          os = /none/.test(o) ? 'none' : 'solid';
          ow = /none/.test(o) ? '0px' : (o.match(/[\d.]+px/) || ['2px'])[0];
        }
        const st = r.style.getPropertyValue('outline-style'); if (st) os = st;
        const w = r.style.getPropertyValue('outline-width'); if (w) ow = w;
        const b = r.style.getPropertyValue('box-shadow'); if (b) shadow = b;
        if (r.style.getPropertyValue('color') || r.style.getPropertyValue('background-color') ||
            r.style.getPropertyValue('border-color') || r.style.getPropertyValue('text-decoration') ||
            r.style.getPropertyValue('text-decoration-line')) colour = true;
      }
      // Nothing in the author CSS touched the outline, so the UA default ring still
      // draws. Missing this counted well-behaved controls as bare.
      const uaDefault = os === null && shadow === null;
      const hasRing = uaDefault
        || (os && os !== 'none' && parseFloat(ow || '0') > 0)
        || (shadow && shadow !== 'none');
      if (hasRing) { out.visible++; out.ring++; }
      else if (colour) { out.visible++; out.colourOnly++; }
      else if (out.missing.length < 20) {
        out.missing.push({ selector: selectorFor(el), loc: locate(el),
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) });
      }
    }
    return out;
  }

  let seed = null;
  try {
    if (FORCE_CASCADE) throw new Error('cascade forced');
    seed = document.createElement('input');
    seed.type = 'text';
    seed.tabIndex = -1;
    seed.setAttribute('aria-hidden', 'true');
    seed.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(seed);
    seed.focus({ preventScroll: true });
    focusProbe.seeded = seed.matches(':focus-visible');
  } catch (e) { seed = null; }

  // color and text-decoration are in the key because underline-on-focus and
  // colour-on-focus are both real indicators the previous six properties missed.
  const focusKey = (cs) => [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow,
    cs.borderColor, cs.backgroundColor, cs.color, cs.textDecorationLine].join('|');

  for (const el of probes.slice(0, MAX_FOCUS_PROBES)) {
    try {
      const b = focusKey(getComputedStyle(el));
      el.focus({ preventScroll: true });
      const after = getComputedStyle(el);
      const a = focusKey(after);
      focusProbe.probed++;
      const bp = b.split('|');
      const ap = a.split('|');
      const ringChanged = ap.slice(0, 4).some((v, i) => v !== bp[i]);        // outline*, box-shadow
      const colourChanged = ap.slice(4).some((v, i) => v !== bp[i + 4]);     // border, bg, text, underline
      const hasOutline = after.outlineStyle !== 'none' && parseFloat(after.outlineWidth) > 0;
      if (ringChanged || hasOutline) {
        focusProbe.visible++;
        focusProbe.ring++;
      } else if (colourChanged) {
        // A colour swap alone satisfies SC 2.4.7 (technique C15) but not SC 2.4.13,
        // so it counts as visible and is tallied apart rather than merged.
        focusProbe.visible++;
        focusProbe.colourOnly++;
      } else if (focusProbe.missing.length < 20) {
        focusProbe.missing.push({ selector: selectorFor(el), loc: locate(el), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) });
      }
      el.blur();
      if (seed) seed.focus({ preventScroll: true });   // re-arm focus-visible for the next probe
    } catch (e) {
      /* some controls refuse focus; not a finding */
    }
  }
  try { if (seed) seed.remove(); } catch (e) {}
  // The live pass only means anything if the browser actually entered :focus-visible.
  // When it did not, every control looks bare and the reading is worthless — so replace
  // it with the cascade estimate rather than reporting a page-wide failure that is really
  // a property of the audit environment.
  if (!focusProbe.seeded) {
    const est = focusByCascade(probes.slice(0, MAX_FOCUS_PROBES));
    focusProbe.probed = est.probed;
    focusProbe.visible = est.visible;
    focusProbe.ring = est.ring;
    focusProbe.colourOnly = est.colourOnly;
    focusProbe.missing = est.missing;
    focusProbe.method = est.method;
    focusProbe.rulesConsidered = est.rulesConsidered;
  }
  try {
    if (prevActive && prevActive.focus) prevActive.focus({ preventScroll: true });
    window.scrollTo(scrollX, scrollY);
  } catch (e) {}

  /* ------------------------------------------------------------- layout */

  const main = document.querySelector('main, [role=main], #main, .container, .page') || document.body;
  const mainRect = main.getBoundingClientRect();
  const mainCs = getComputedStyle(main);

  /* ------------------------------------------------------------- output */

  return {
    schema: 'dga-observed/1',
    label: LABEL,
    capturedAt: new Date().toISOString(),
    url: location.href,
    title: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    // What the viewer PREFERS. Recorded for information only — never bucket a
    // capture on this. A page with no dark theme renders light on a machine set
    // to dark, and bucketing on the preference silently empties the light set.
    colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    documentDark: /dark/.test(document.documentElement.className) || document.documentElement.getAttribute('data-theme') === 'dark',
    // What the page ACTUALLY RENDERED, from the luminance of the ground the
    // content sits on. This is what the colour checks bucket by.
    renderedScheme: (() => {
      let bg = parseColor(getComputedStyle(document.body).backgroundColor);
      if (!bg || bg.a < 1) {
        const rootBg = parseColor(getComputedStyle(document.documentElement).backgroundColor);
        if (rootBg && rootBg.a >= 1) bg = rootBg;
      }
      if (!bg || bg.a <= 0) return 'light'; // an unpainted ground is white by default
      return luminance(bg) < 0.45 ? 'dark' : 'light';
    })(),
    document: {
      dir: document.documentElement.getAttribute('dir') || getComputedStyle(document.documentElement).direction,
      lang: document.documentElement.getAttribute('lang') || null,
      elementsExamined: examined,
      elementsTotal: all.length,
      truncated: all.length > MAX_ELEMENTS,
    },
    rootCustomProperties: (() => {
      const out = {};
      try {
        for (const sheet of document.styleSheets) {
          let rules;
          try {
            rules = sheet.cssRules;
          } catch (e) {
            continue;
          }
          for (const r of rules) {
            if (r.selectorText && /(^|,)\s*:root\s*($|,)/.test(r.selectorText) && r.style) {
              for (let i = 0; i < r.style.length; i++) {
                const p = r.style[i];
                if (p.startsWith('--') && Object.keys(out).length < 300) out[p] = r.style.getPropertyValue(p).trim();
              }
            }
          }
        }
      } catch (e) {}
      return out;
    })(),
    fontFaces: (() => {
      const s = new Set();
      try {
        document.fonts.forEach((f) => s.add(f.family.replace(/["']/g, '')));
      } catch (e) {}
      return [...s].slice(0, 40);
    })(),
    // A declared family name says nothing about which typeface actually renders.
    // A site can serve the exactly-right face under a local alias — dga.gov.sa
    // ships IBM Plex Sans Arabic as `regularFont`, `boldFont` and so on — and
    // matching the ledger on the declared name alone scores that as a total
    // failure. Map each @font-face family to the file it actually loads, so the
    // scorer can resolve the alias before judging it.
    fontFaceMap: FACE_SRC,
    tallies: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, { total: v.total(), values: v.dump() }])),
    layout: {
      container: Math.round(mainRect.width),
      gutter: Math.round(parseFloat(mainCs.paddingLeft) || 0),
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    },
    contrast: {
      textRuns,
      passing: textRunsPassing,
      indeterminate: textRunsIndeterminate,
      findings: contrastFindings,
    },
    nonTextContrast: {
      checked: nonTextChecked, passing: nonTextPassing, findings: nonTextFindings,
      // decorative borders are outside 1.4.11 and are skipped, not failed
      decorativeSkipped: decorativeBordersSkipped,
    },
    targets: {
      interactive: interactiveCount, passing: interactivePassingTarget,
      minTargetPx: MIN_TARGET, findings: targetFindings,
      // WCAG 2.2 exceptions applied, reported so the number stays legible: inline
      // targets left the denominator, spaced ones counted as passing.
      inlineExempt: inlineTargetsExempt, spacingExempt: spacedTargetsExempt,
    },
    focus: focusProbe,
    rtl: {
      rtlElements,
      ltrElements,
      arabicRuns,
      arabicRunsInArabicFace,
      arabicIndicNumerals: arabicIndicSeen,
      westernNumerals: westernDigitSeen,
      unmirroredDirectionalIcons: mirroredIconSuspects,
    },
    css: cssStats,
  };
}


/*
 * score.js — the scoring core. Pure: no filesystem, no process, no console.
 *
 * Same arithmetic as the original Node script it was extracted from; only the
 * edges changed. That matters because a compliance score that moves between
 * refactors is not a compliance score — test/parity.mjs re-scores a real saved
 * audit and requires the number to come back byte-identical.
 *
 *   const verdict = score({ rubric, tokens, captures, judged, options });
 *
 * Runs unchanged in a browser tab and in Node.
 */

class DgaError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'DgaError';
    this.code = code;
    this.detail = detail;
  }
}

/* ---------------------------------------------------------------- colour */

// sRGB -> OKLab, then Euclidean distance x100 (CSS Color 4's deltaEOK).
// ~2.0 is about one just-noticeable difference, which is why the match
// threshold sits there: a designer cannot see a pass, and can see a fail.
function srgbToOklab(r, g, b) {
  const f = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = f(r), G = f(g), B = f(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function parseHex(h) {
  if (typeof h !== 'string') return null;
  let s = h.trim().replace(/^#/, '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(s.slice(0, 6))) return null;
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}

function deltaEOK(hexA, hexB) {
  const A = parseHex(hexA), B = parseHex(hexB);
  if (!A || !B) return Infinity;
  const x = srgbToOklab(A.r, A.g, A.b), y = srgbToOklab(B.r, B.g, B.b);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b) * 100;
}

function nearestToken(hexValue, palette) {
  let best = null, bestD = Infinity;
  for (const [name, value] of Object.entries(palette)) {
    const d = deltaEOK(hexValue, value);
    if (d < bestD) { bestD = d; best = name; }
  }
  return { token: best, delta: Math.round(bestD * 100) / 100 };
}

/* ------------------------------------------------------------------ main */

function score({ rubric, tokens, criteria = null, benchmarks = null, captures = [], judged = {}, options = {} }) {
  const {
    targetType = 'site',
    targetName = '(unnamed target)',
    targetUrl = null,
    na: naList = [],
    benchmarkViewport = 'web',
    benchmarkId = null,
    allowUnassessed = false,
    allowUncountedJudged = false,
    allowLowCoverage = false,
  } = options;

  if (!tokens || !tokens.synced) {
    throw new DgaError(
      'LEDGER_UNSYNCED',
      'The DGA token ledger has never been synced. Run the sync with your copy of the ' +
        'Platforms Code library open in Figma desktop. Refusing to score against an empty ' +
        'baseline — a made-up ledger produces a made-up number.'
    );
  }
  if (!captures.length && targetType === 'site') {
    throw new DgaError('NO_CAPTURES', 'A site audit needs at least one capture.');
  }

  const TH = rubric.thresholds;
  const round2 = (n) => Math.round(n * 100) / 100;
  const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;
  const onScale = (v, scale, tol = 0.5) => scale.some((s) => near(Number(v), Number(s), tol));

  function mergedTally(key, filter = () => true) {
    const map = new Map();
    for (const c of captures) {
      if (!filter(c)) continue;
      const t = c.tallies?.[key];
      if (!t) continue;
      for (const e of t.values) {
        const cur = map.get(e.value) || { value: e.value, count: 0, samples: [] };
        cur.count += e.count;
        for (const s of e.samples || []) if (cur.samples.length < 3 && !cur.samples.includes(s)) cur.samples.push(s);
        map.set(e.value, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }
  const sum = (rows) => rows.reduce((a, r) => a + r.count, 0);

  const findings = [];
  function finding(checkId, severity, summary, detail) {
    findings.push({ checkId, severity, summary, ...detail });
  }

  const palette = (scheme) => ({ ...(tokens.color?.[scheme] || {}) });
  const lightPalette = palette('light');
  const darkPalette = palette('dark');
  const anyPalette = { ...lightPalette, ...darkPalette };

  /* ------------------------------------------------- coverage evaluators */

  function colorCoverage(rows, pal, checkId, what) {
    const total = sum(rows);
    if (!total) return { ratio: null, matched: 0, total: 0, offenders: [] };
    let matched = 0;
    const offenders = [];
    for (const r of rows) {
      const { token, delta } = nearestToken(r.value, pal);
      if (delta <= TH.colorMatchDeltaE) matched += r.count;
      else offenders.push({ value: r.value, count: r.count, nearestToken: token, delta, samples: r.samples });
    }
    offenders.sort((a, b) => b.count - a.count);
    for (const o of offenders.slice(0, 12)) {
      finding(checkId, o.count >= 20 ? 'major' : 'minor', `${what} ${o.value} is not a DGA token`, {
        found: o.value,
        expected: o.nearestToken ? `${o.nearestToken} (ΔE ${o.delta})` : 'a DGA colour token',
        occurrences: o.count,
        where: o.samples,
        fix: o.delta <= TH.colorNearMissDeltaE
          ? `Almost certainly meant to be \`${o.nearestToken}\` — swap the literal for the token.`
          : 'Not close to any DGA colour. Either replace it or get the addition approved into the library.',
      });
    }
    return { ratio: matched / total, matched, total, offenders };
  }

  function scaleCoverage(rows, scale, checkId, what, unit = 'px', tol = 0.5) {
    const total = sum(rows);
    if (!total || !scale?.length) return { ratio: null, matched: 0, total, offenders: [] };
    let matched = 0;
    const offenders = [];
    for (const r of rows) {
      const v = r.value === 'pill' ? 'pill' : Number(r.value);
      const ok = v === 'pill' ? true : onScale(v, scale, tol);
      if (ok) matched += r.count;
      else {
        const nearest = scale.reduce((a, s) => (Math.abs(s - v) < Math.abs(a - v) ? s : a), scale[0]);
        offenders.push({ value: r.value, count: r.count, nearest, samples: r.samples });
      }
    }
    offenders.sort((a, b) => b.count - a.count);
    for (const o of offenders.slice(0, 12)) {
      finding(checkId, o.count >= 20 ? 'major' : 'minor', `${what} ${o.value}${unit} is off the DGA scale`, {
        found: `${o.value}${unit}`,
        expected: `${o.nearest}${unit}`,
        occurrences: o.count,
        where: o.samples,
        fix: `Snap to ${o.nearest}${unit}.`,
      });
    }
    return { ratio: matched / total, matched, total, offenders };
  }

  function setCoverage(rows, allowed, checkId, what, normalise = (x) => String(x)) {
    const total = sum(rows);
    if (!total || !allowed?.length) return { ratio: null, matched: 0, total, offenders: [] };
    const set = new Set(allowed.map(normalise));
    let matched = 0;
    const offenders = [];
    for (const r of rows) {
      if (set.has(normalise(r.value))) matched += r.count;
      else offenders.push({ value: r.value, count: r.count, samples: r.samples });
    }
    offenders.sort((a, b) => b.count - a.count);
    // Dedupe for display: T1 concatenates the Latin and Arabic stacks, and when one
    // family serves both scripts — as it does in Platforms Code — the raw list reads
    // "IBM Plex Sans Arabic, IBM Plex Sans Arabic".
    const shown = [...new Set(allowed.map(String))];
    for (const o of offenders.slice(0, 12)) {
      finding(checkId, o.count >= 20 ? 'major' : 'minor', `${what} "${o.value}" is not in the DGA set`, {
        found: String(o.value),
        expected: shown.slice(0, 8).join(', ') + (shown.length > 8 ? ', …' : ''),
        occurrences: o.count,
        where: o.samples,
        fix: `Use one of the defined values.`,
      });
    }
    return { ratio: matched / total, matched, total, offenders };
  }

  function shadowCoverage(rows, levels, checkId) {
    const total = sum(rows);
    const tokenShadows = Object.entries(levels || {});
    if (!total || !tokenShadows.length) return { ratio: null, matched: 0, total, offenders: [] };
    // The probe reports shadows already normalised to "x y blur spread / r g b a".
    // The ledger stores CSS text, so normalise that the same way before comparing.
    // Scraping numbers out of the raw strings — as this did — read `#1018280d` as
    // the integer 1018280 while the browser gave four rgba components, so the arrays
    // were never even the same length and E3 could not pass on any page, ever.
    const normLedger = (css) =>
      String(css)
        .split(/,(?![^(]*\))/)
        .map((layer) => {
          const inset = /\binset\b/.test(layer);
          let rest = layer.replace(/\binset\b/, '');
          let colour = null;
          const fn = rest.match(/(rgba?|hsla?)\([^)]*\)/i);
          if (fn) { colour = fn[0]; rest = rest.replace(fn[0], ''); }
          else {
            const h = rest.match(/#[0-9a-f]{3,8}\b/i);
            if (h) { colour = h[0]; rest = rest.replace(h[0], ''); }
          }
          const lens = (rest.match(/-?\d*\.?\d+(px|rem|em)?/g) || [])
            .map((n) => Math.round(parseFloat(n) * 100) / 100)
            .filter((n) => Number.isFinite(n));
          while (lens.length < 4) lens.push(0);
          let rgba = [0, 0, 0, 1];
          if (colour) {
            const hx = colour.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
            if (hx) {
              const n = parseInt(hx[1], 16);
              rgba = [(n >> 16) & 255, (n >> 8) & 255, n & 255, hx[2] ? Math.round((parseInt(hx[2], 16) / 255) * 100) / 100 : 1];
            } else {
              const m = colour.match(/\(([^)]+)\)/);
              if (m) {
                const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
                rgba = [p[0] | 0, p[1] | 0, p[2] | 0, p.length > 3 ? Math.round(p[3] * 100) / 100 : 1];
              }
            }
          }
          return (inset ? 'inset ' : '') + lens.slice(0, 4).join(' ') + ' / ' + rgba.join(' ');
        })
        .join(', ');

    // The probe now reports shadows already normalised ("x y blur spread / r g b a").
    // Captures taken before that change carry the browser's raw string, so normalise
    // anything that is not already in the normalised shape.
    const isNormalised = (s) => / \/ /.test(String(s));
    const nums = (s) => (String(s).match(/-?\d*\.?\d+/g) || []).map(Number);
    let matched = 0;
    const offenders = [];
    for (const r of rows) {
      const observed = isNormalised(r.value) ? r.value : normLedger(r.value);
      const a = nums(observed);
      const hit = tokenShadows.some(([, v]) => {
        const nv = normLedger(v);
        if (observed === nv) return true;           // normalised forms agree exactly
        const b = nums(nv);
        if (a.length !== b.length) return false;    // fall back to a tolerant compare
        return a.every((n, i) => Math.abs(n - b[i]) <= 1.5);
      });
      if (hit) matched += r.count;
      else offenders.push({ value: r.value, count: r.count, samples: r.samples });
    }
    offenders.sort((a, b) => b.count - a.count);
    for (const o of offenders.slice(0, 8)) {
      finding(checkId, 'minor', 'Shadow is not a DGA elevation level', {
        found: o.value,
        expected: Object.keys(levels).join(' | '),
        occurrences: o.count,
        where: o.samples,
        fix: 'Use the named elevation level so depth ordering stays consistent.',
      });
    }
    return { ratio: matched / total, matched, total, offenders };
  }

  /* ------------------------------------------------------------ checks */

  // Bucket on what the page RENDERED, not on what the viewer prefers. A site
  // with no dark theme still renders light on a machine set to dark, and
  // bucketing on the media query empties the light set — which silently voids
  // the whole 18-point colour category and reports it as "nothing to measure".
  // Captures predating renderedScheme fall back to the theme class, then the
  // preference.
  const schemeOf = (c) => c.renderedScheme || (c.documentDark ? 'dark' : c.colorScheme) || 'light';
  const darkCaptures = captures.filter((c) => schemeOf(c) === 'dark');
  const lightOnly = (c) => schemeOf(c) !== 'dark';
  const darkOnly = (c) => schemeOf(c) === 'dark';

  const auto = {};

  /* colour */
  {
    const rows = [
      ...mergedTally('textColor', lightOnly),
      ...mergedTally('bgColor', lightOnly),
      ...mergedTally('borderColor', lightOnly),
      ...mergedTally('svgFill', lightOnly),
    ];
    auto.C1 = colorCoverage(rows, lightPalette, 'C1', 'Colour');

    const far = (auto.C1.offenders || []).filter(
      (o) => o.delta > TH.colorNearMissDeltaE && o.count >= TH.offPaletteMinOccurrences
    );
    const totalC = auto.C1.total || 0;
    const farCount = far.reduce((a, o) => a + o.count, 0);
    auto.C2 = { ratio: totalC ? 1 - farCount / totalC : null, matched: totalC - farCount, total: totalC, offenders: far };
    for (const o of far.slice(0, 8)) {
      finding('C2', 'blocker', `Off-palette colour ${o.value} used ${o.count}×`, {
        found: o.value,
        expected: 'a colour from the DGA palette',
        occurrences: o.count,
        where: o.samples,
        fix: 'An unrecognisable brand colour is an identity violation, not a styling preference. Replace it, or get the addition approved into the DGA library.',
      });
    }

    if (darkCaptures.length && Object.keys(darkPalette).length) {
      const drows = [
        ...mergedTally('textColor', darkOnly),
        ...mergedTally('bgColor', darkOnly),
        ...mergedTally('borderColor', darkOnly),
      ];
      auto.C4 = colorCoverage(drows, darkPalette, 'C4', 'Dark-theme colour');
    } else {
      auto.C4 = darkCaptures.length
        ? { ratio: null, na: true, reason: 'ledger has no dark token set' }             // we cannot look
        : { ratio: null, na: true, absent: true, reason: 'target ships no dark theme' }; // nothing to look at
    }
  }

  /* typography */
  {
    // Resolve local aliases before judging. A site may serve exactly the right
    // typeface under its own family name — @font-face { font-family: regularFont;
    // src: url(IBMPlexSansArabic-Regular.ttf) } — and matching the declared name
    // against the ledger would score the correct face as a total failure. The
    // probe records which file each declared family loads; this follows it.
    const faceMap = {};
    for (const c of captures) Object.assign(faceMap, c.fontFaceMap || {});
    const norm = (x) => String(x).toLowerCase().replace(/["']/g, '').replace(/[^a-z0-9]/g, '').trim();
    const resolveFamily = (declared) => {
      const hit = Object.keys(faceMap).find((k) => norm(k) === norm(declared));
      return hit ? faceMap[hit] : declared;
    };
    const fams = mergedTally('fontFamily').map((r) => ({ ...r, declared: r.value, value: resolveFamily(r.value) }));
    const allowed = [...(tokens.typography?.families?.latin || []), ...(tokens.typography?.families?.arabic || [])];
    auto.T1 = setCoverage(fams, allowed, 'T1', 'Font family', norm);

    const ramp = tokens.typography?.ramp || [];
    auto.T2 = scaleCoverage(mergedTally('fontSize'), ramp.map((r) => r.size), 'T2', 'Font size');
    auto.T3 = setCoverage(mergedTally('fontWeight'), tokens.typography?.weights || [], 'T3', 'Font weight', (x) => String(Number(x)));

    const lhRows = mergedTally('lineHeight');
    const sizes = new Set(ramp.map((r) => r.size));
    const legalLH = new Set(ramp.map((r) => r.lineHeight).filter((n) => Number.isFinite(n)));
    const lhTotal = sum(lhRows);
    let lhMatched = 0;
    for (const r of lhRows) {
      if (r.value === 'normal') continue;
      if ([...legalLH].some((l) => near(Number(r.value), l, 1))) lhMatched += r.count;
    }
    // A ramp step is a size AND its paired leading AND its tracking. Testing leading
    // against a flat list let a 14px body carry 72px display leading and pass, which
    // is exactly the mismatch this check exists to catch. Where the probe reports the
    // triple, match on it; fall back to the old leading-only test for older captures.
    const pairRows = mergedTally('typePair');
    if (sum(pairRows) > 0) {
      const pairTotal = sum(pairRows);
      let pairMatched = 0;
      const pairOff = [];
      for (const r of pairRows) {
        const [szS, lhS, lsS] = String(r.value).split('|');
        const sz = Number(szS);
        const step = ramp.find((s) => near(s.size, sz, 0.6));
        const lhOk = step
          ? (lhS === 'normal' ? false : near(Number(lhS), step.lineHeight, 1))
          : false;
        const lsOk = step ? near(Number(lsS || 0), step.letterSpacing ?? 0, 0.3) : false;
        if (step && lhOk && lsOk) pairMatched += r.count;
        else pairOff.push({ value: r.value, count: r.count, samples: r.samples, size: sz, step });
      }
      auto.T4 = { ratio: pairTotal ? pairMatched / pairTotal : null, matched: pairMatched, total: pairTotal, offenders: pairOff };
      pairOff.sort((a, b) => b.count - a.count);
      for (const o of pairOff.slice(0, 6)) {
        const [sz, lh, ls] = String(o.value).split('|');
        finding('T4', o.count >= 20 ? 'major' : 'minor', `Type step ${sz}px is not paired with its ramp leading`, {
          found: `${sz}px / ${lh} leading / ${ls} tracking`,
          expected: o.step
            ? `${o.step.name}: ${o.step.size}px / ${o.step.lineHeight} / ${o.step.letterSpacing ?? 0}`
            : `${sz}px is not a ramp size at all`,
          occurrences: o.count,
          where: o.samples,
          fix: 'Set the ramp step’s paired leading rather than a global multiplier — Arabic needs the extra room and a multiplier will not give it.',
        });
      }
    } else {
      auto.T4 = { ratio: lhTotal ? lhMatched / lhTotal : null, matched: lhMatched, total: lhTotal, offenders: [] };
      if (lhTotal && lhMatched / lhTotal < 0.9) {
        finding('T4', 'minor', 'Line heights do not match the DGA ramp', {
          found: `${lhTotal - lhMatched} of ${lhTotal} text runs`,
          expected: [...legalLH].sort((a, b) => a - b).join(', ') + ' px',
          where: lhRows.filter((r) => r.value !== 'normal' && ![...legalLH].some((l) => near(Number(r.value), l, 1))).slice(0, 5).flatMap((r) => r.samples),
          fix: 'Set the ramp step’s paired leading rather than a global multiplier — Arabic needs the extra room and a multiplier will not give it.',
          note: `Ramp sizes present: ${[...sizes].sort((a, b) => a - b).join(', ')}`,
        });
      }
    }
  }

  /* spacing */
  {
    const scale = tokens.spacing?.scale || [];
    auto.S1 = scaleCoverage([...mergedTally('spacing'), ...mergedTally('gap')], scale, 'S1', 'Spacing');

    const bps = tokens.breakpoints?.list || [];
    if (targetType === 'site' && bps.length && captures.length) {
      let hit = 0, checked = 0;
      for (const c of captures) {
        const w = c.viewport?.width;
        if (!w) continue;
        const bp = bps.filter((b) => w >= (b.min ?? 0)).sort((a, b) => (b.min ?? 0) - (a.min ?? 0))[0];
        if (!bp) continue;
        checked++;
        const containerOk = bp.container ? Math.abs((c.layout?.container ?? 0) - bp.container) <= Math.max(8, bp.container * 0.02) : true;
        const gutterOk = bp.gutter != null ? near(c.layout?.gutter ?? 0, bp.gutter, 4) : true;
        if (containerOk && gutterOk) hit++;
        else {
          finding('S2', 'minor', `Container at ${w}px viewport does not match the ${bp.name} breakpoint`, {
            found: `container ${c.layout?.container}px, gutter ${c.layout?.gutter}px`,
            expected: `container ${bp.container}px, gutter ${bp.gutter}px`,
            where: [c.label],
            viewport: c.label,
            fix: 'Match the DGA container so content lines up across linked government services.',
          });
        }
        if (c.layout?.horizontalOverflow) {
          finding('S2', 'major', `Page overflows horizontally at ${w}px`, {
            found: `document ${c.layout.documentWidth}px wide in a ${w}px viewport`,
            expected: 'no horizontal scroll',
            where: [c.label],
            viewport: c.label,
            fix: 'Something is wider than its container — usually a fixed width or an unwrapped table.',
          });
        }
      }
      auto.S2 = { ratio: checked ? hit / checked : null, matched: hit, total: checked };
    } else {
      auto.S2 = targetType !== 'site'
        ? { ratio: null, na: true, absent: true, reason: 'not measurable on a Figma frame' }
        : { ratio: null, na: true, reason: 'ledger has no breakpoints' };
    }

    const rhythm = tokens.spacing?.rhythm || [];
    if (rhythm.length) {
      auto.S3 = scaleCoverage(mergedTally('spacing').filter((r) => Number(r.value) >= Math.min(...rhythm)), rhythm, 'S3', 'Section spacing', 'px', 2);
    } else {
      auto.S3 = { ratio: null, na: true, reason: 'ledger defines no rhythm steps' };
    }
  }

  /* shape */
  {
    auto.E1 = scaleCoverage(mergedTally('radius'), tokens.radius?.scale || [], 'E1', 'Radius');

    const widths = scaleCoverage(mergedTally('borderWidth'), tokens.border?.widths || [], 'E2', 'Border width');
    const borderTokenNames = tokens.color?.roles?.border || [];
    const borderPal = Object.fromEntries(borderTokenNames.map((n) => [n, anyPalette[n]]).filter(([, v]) => v));
    const colors = Object.keys(borderPal).length
      ? colorCoverage(mergedTally('borderColor'), borderPal, 'E2', 'Border colour')
      : { ratio: null };
    const parts = [widths.ratio, colors.ratio].filter((r) => r != null);
    auto.E2 = { ratio: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null, detail: { widths, colors } };

    auto.E3 = shadowCoverage(mergedTally('shadow'), tokens.elevation?.levels, 'E3');
  }

  /* rtl */
  {
    const r = captures.reduce(
      (a, c) => {
        const x = c.rtl || {};
        a.arabicRuns += x.arabicRuns || 0;
        a.arabicInFace += x.arabicRunsInArabicFace || 0;
        a.rtlElements += x.rtlElements || 0;
        a.ltrElements += x.ltrElements || 0;
        a.arabicIndic += x.arabicIndicNumerals || 0;
        a.western += x.westernNumerals || 0;
        a.unmirrored += x.unmirroredDirectionalIcons || 0;
        return a;
      },
      { arabicRuns: 0, arabicInFace: 0, rtlElements: 0, ltrElements: 0, arabicIndic: 0, western: 0, unmirrored: 0 }
    );

    const anyArabic = r.arabicRuns > 0;
    const docDirs = captures.map((c) => c.document?.dir);
    if (!anyArabic) {
      auto.R1 = { ratio: null, na: true, absent: true, reason: 'no Arabic content in the captures' };
      auto.R3 = { ratio: null, na: true, absent: true, reason: 'no Arabic content in the captures' };
    } else {
      const dirOk = docDirs.some((d) => d === 'rtl');
      const mirrored = r.rtlElements > r.ltrElements;
      auto.R1 = { ratio: (dirOk ? 0.5 : 0) + (mirrored ? 0.5 : 0), detail: { docDirs, ...r } };
      if (!dirOk) {
        finding('R1', 'major', 'Arabic content renders without dir="rtl"', {
          found: `document dir = ${docDirs.join(', ') || 'unset'}`,
          expected: 'dir="rtl" on the document for Arabic',
          where: captures.map((c) => c.label),
          fix: 'Set dir on the document and let logical properties carry the mirroring.',
        });
      } else if (!mirrored) {
        finding('R1', 'major', 'dir is rtl but most of the layout still computes ltr', {
          found: `${r.rtlElements} rtl vs ${r.ltrElements} ltr elements`,
          expected: 'the layout mirrors, not just the text',
          where: captures.map((c) => c.label),
          fix: 'Something is pinning direction back to ltr on subtrees — usually a component-level override.',
        });
      }

      const faceRatio = r.arabicRuns ? r.arabicInFace / r.arabicRuns : 1;
      const numeralsMixed = r.arabicIndic > 0 && r.western > 0;
      const iconsOk = r.unmirrored === 0;
      auto.R3 = { ratio: faceRatio * 0.5 + (numeralsMixed ? 0 : 0.3) + (iconsOk ? 0.2 : 0), detail: r };
      if (faceRatio < 1) {
        finding('R3', 'major', 'Arabic text is not rendering in an Arabic face', {
          found: `${r.arabicRuns - r.arabicInFace} of ${r.arabicRuns} Arabic runs`,
          expected: (tokens.typography?.families?.arabic || []).join(', ') || 'the DGA Arabic face',
          fix: 'Put the Arabic face ahead of the Latin one in the stack; the browser falls through per glyph.',
        });
      }
      if (numeralsMixed) {
        finding('R3', 'minor', 'Arabic-Indic and Western numerals both appear', {
          found: `${r.arabicIndic} runs with ٠١٢, ${r.western} with 012`,
          expected: `one system throughout (ledger says: ${tokens.numerals || 'unspecified'})`,
          fix: 'Pick one numeral system and apply it everywhere — this is the most common bilingual defect and the easiest to fix.',
        });
      }
      if (!iconsOk) {
        finding('R3', 'minor', 'Directional icons did not mirror under RTL', {
          found: `${r.unmirrored} chevron/arrow icons unmirrored`,
          expected: 'directional icons flip with the layout',
          fix: 'Mirror them with a transform driven off [dir=rtl], or use the RTL-aware icon variants.',
        });
      }
    }

    if (targetType === 'site') {
      const css = captures.reduce((a, c) => {
        a.logical += c.css?.logicalDecls || 0;
        a.physical += c.css?.physicalDecls || 0;
        a.inaccessible += c.css?.inaccessibleSheets || 0;
        a.samples.push(...(c.css?.physicalSamples || []));
        return a;
      }, { logical: 0, physical: 0, inaccessible: 0, samples: [] });
      const tot = css.logical + css.physical;
      auto.R2 = { ratio: tot ? css.logical / tot : null, detail: css };
      if (tot && css.physical > 0) {
        finding('R2', css.physical > css.logical ? 'major' : 'minor', `${css.physical} directional declarations are physical, not logical`, {
          found: `${css.physical} physical vs ${css.logical} logical in first-party CSS` +
          (css.vendorSheets ? ` (plus ${css.vendorPhysical} physical in ${css.vendorSheets} vendor stylesheet${css.vendorSheets > 1 ? 's' : ''}, not scored)` : ''),
          expected: 'inline/block logical properties throughout',
          where: [...new Set(css.samples.map((s) => `${s.selector} { ${s.property} }`))].slice(0, 8),
          fix: 'margin-inline-start over margin-left. Physical properties are why an RTL layout needs a second stylesheet, and then diverges from the first.',
        });
      }
      if (css.inaccessible) {
        finding('R2', 'minor', `${css.inaccessible} stylesheet(s) were cross-origin and could not be read`, {
          found: `${css.inaccessible} unreadable sheets`,
          expected: 'same-origin stylesheets, or accept reduced confidence',
          fix: 'This lowers confidence in R2 and M2 only. Self-host the stylesheet to measure it.',
        });
      }
    } else {
      auto.R2 = { ratio: null, na: true, absent: true, reason: 'authored CSS does not exist on a Figma frame' };
    }
  }

  /* accessibility */
  {
    const c = captures.reduce((a, x) => {
      a.runs += x.contrast?.textRuns || 0;
      a.pass += x.contrast?.passing || 0;
      a.ind += x.contrast?.indeterminate || 0;
      a.find.push(...(x.contrast?.findings || []));
      return a;
    }, { runs: 0, pass: 0, ind: 0, find: [] });
    const measurable = c.runs - c.ind;
    auto.A1 = { ratio: measurable > 0 ? c.pass / measurable : null, matched: c.pass, total: measurable, indeterminate: c.ind };
    for (const f of c.find.sort((a, b) => a.ratio - b.ratio).slice(0, 15)) {
      finding('A1', 'blocker', `Text contrast ${f.ratio}:1 is below the required ${f.required}:1`, {
        found: `${f.fg} on ${f.bg} at ${f.fontSize}px/${f.fontWeight} → ${f.ratio}:1`,
        expected: `${f.required}:1`,
        where: [f.loc || f.selector],
        sample: f.text,
        fix: `Needs about ${round2(f.required - f.ratio)} more contrast. Government services carry a statutory accessibility obligation — darken the text token or lighten the surface.`,
      });
    }
    if (c.ind) {
      finding('A1', 'minor', `${c.ind} text runs sit on an image or gradient and could not be measured`, {
        found: `${c.ind} of ${c.runs} runs`,
        expected: 'measurable contrast',
        fix: 'Excluded from the score rather than guessed. Check these by eye, or add a scrim so the ratio is determinate.',
      });
    }

    const n = captures.reduce((a, x) => {
      a.checked += x.nonTextContrast?.checked || 0;
      a.pass += x.nonTextContrast?.passing || 0;
      a.skipped += x.nonTextContrast?.decorativeSkipped || 0;
      a.find.push(...(x.nonTextContrast?.findings || []));
      return a;
    }, { checked: 0, pass: 0, skipped: 0, find: [] });
    // The skip count rides along so narrowing A2's scope can never quietly inflate the
    // ratio: a reviewer can see how many borders left the denominator, and why.
    auto.A2 = {
      ratio: n.checked ? n.pass / n.checked : null, matched: n.pass, total: n.checked,
      notes: n.skipped
        ? n.skipped + ' decorative borders excluded \u2014 SC 1.4.11 covers information that identifies a component, not enclosure'
        : undefined,
    };
    for (const f of n.find.sort((a, b) => a.ratio - b.ratio).slice(0, 8)) {
      finding('A2', 'blocker', `Boundary contrast ${f.ratio}:1 is below 3:1`, {
        found: `${f.border} against ${f.against} → ${f.ratio}:1`,
        expected: '3:1',
        where: [f.loc || f.selector],
        fix: 'An input whose border disappears against its background is not usable at low vision or in sunlight.',
      });
    }

    if (targetType === 'site') {
      const f = captures.reduce((a, x) => {
        a.probed += x.focus?.probed || 0;
        a.visible += x.focus?.visible || 0;
        a.ring += x.focus?.ring || 0;
        a.colourOnly += x.focus?.colourOnly || 0;
        a.seeded = a.seeded && (x.focus?.seeded !== false);
        if (x.focus?.method) a.method = x.focus.method;
        a.missing.push(...(x.focus?.missing || []));
        return a;
      }, { probed: 0, visible: 0, ring: 0, colourOnly: 0, seeded: true, method: null, missing: [] });
      const predicted = f.method === 'cascade-analysis';
      auto.A3 = { ratio: f.probed ? f.visible / f.probed : null, matched: f.visible, total: f.probed };
      // Three cases, and they are not interchangeable:
      //   observed          — the browser entered :focus-visible and we watched it
      //   cascade-analysis  — it would not, so the CSS was resolved statically instead
      //   neither           — a capture predating both, which can tell a removed
      //                       indicator from an unmatched pseudo-class not at all
      if (predicted) {
        auto.A3.notes = `${f.visible} of ${f.probed} controls would receive a focus indicator, ` +
          'predicted from the CSS cascade rather than observed — this browser would not enter ' +
          ':focus-visible. Blind to focus styling applied by script or drawn on a pseudo-element.';
        auto.A3.measuredBy = 'cascade-analysis';
      } else if (f.probed && !f.seeded) {
        auto.A3 = { ratio: null, na: true, reason: 'browser would not enter :focus-visible, so focus styling could not be observed' };
      } else if (f.colourOnly) {
        finding('A3', 'minor', `${f.colourOnly} of ${f.probed} controls signal focus by colour change alone`, {
          found: `${f.colourOnly} colour-only, ${f.ring} with a ring`,
          expected: 'an indicator with its own shape, not colour alone',
          fix: 'A colour swap meets SC 2.4.7 but fails SC 2.4.13 Focus Appearance. Add an outline so the indicator survives low vision and greyscale.',
        });
      }
      if (f.missing.length && (f.seeded || predicted)) {
        // Count from probed-minus-visible, never from missing.length — the probe caps
        // its missing[] sample at 20 per capture, so that array understates the failure
        // on any page with more than 20 unfocusable controls.
        finding('A3', 'major', `${f.probed - f.visible} of ${f.probed} probed controls show no focus indicator`, {
          found: `${f.probed - f.visible} controls unchanged on focus${predicted ? ' (predicted from CSS, not observed)' : ''}`,
          expected: 'a visible indicator on every interactive element',
          where: f.missing.slice(0, 8).map((m) => m.loc || m.selector),
          fix: 'Never remove the outline without replacing it. Keyboard-only users navigate the whole service through this one affordance.',
        });
      }
    } else {
      auto.A3 = { ratio: null, na: true, absent: true, reason: 'focus state does not exist on a static frame' };
    }

    // A4 is viewport-aware: the probe already measured against the threshold its own
    // viewport called for (mobile guidance is larger than the 24px WCAG floor), so the
    // aggregation just sums. The per-capture threshold is echoed into the finding.
    const t = captures.reduce((a, x) => {
      a.i += x.targets?.interactive || 0;
      a.p += x.targets?.passing || 0;
      a.find.push(...(x.targets?.findings || []).map((f) => ({ ...f, viewport: x.label })));
      a.thresholds.add(x.targets?.minTargetPx ?? TH.minTargetPx);
      return a;
    }, { i: 0, p: 0, find: [], thresholds: new Set() });
    auto.A4 = { ratio: t.i ? t.p / t.i : null, matched: t.p, total: t.i, thresholds: [...t.thresholds] };
    for (const f of t.find.sort((a, b) => a.width * a.height - b.width * b.height).slice(0, 8)) {
      finding('A4', 'major', `Target ${f.width}×${f.height}px is below the ${f.required}×${f.required}px minimum`, {
        found: `${f.width}×${f.height}px`,
        expected: `${f.required}×${f.required}px`,
        where: [f.loc || f.selector],
        sample: f.label,
        viewport: f.viewport,
        fix: 'Grow the control or its padding. Icon-only buttons are the usual offenders.',
      });
    }
  }

  /* motion */
  {
    const durs = mergedTally('duration');
    const eases = mergedTally('easing');
    const dCov = scaleCoverage(durs, tokens.motion?.durations || [], 'M1', 'Transition duration', 'ms', 10);
    const eCov = setCoverage(eases, tokens.motion?.easings || [], 'M1', 'Easing', (x) => String(x).replace(/\s+/g, ''));
    const parts = [dCov.ratio, eCov.ratio].filter((r) => r != null);
    // A page with no transitions has no motion values to be wrong, which is an absence
    // rather than a gap — saying otherwise left the design-system criterion permanently
    // unconfirmable on any site that simply does not animate.
    auto.M1 = parts.length
      ? { ratio: parts.reduce((a, b) => a + b, 0) / parts.length, detail: { dCov, eCov } }
      : { ratio: null, na: true, absent: true, detail: { dCov, eCov },
          reason: 'no transition durations or easings are used on the page' };

    if (targetType === 'site') {
      const rm = captures.reduce((a, c) => a + (c.css?.reducedMotionRules || 0), 0);
      auto.M2 = { ratio: rm > 0 ? 1 : 0, detail: { reducedMotionRules: rm } };
      if (!rm) {
        finding('M2', 'major', 'No prefers-reduced-motion rule found', {
          found: '0 reduced-motion blocks in the readable stylesheets',
          expected: 'motion suppressed under the preference',
          fix: 'Add a reduced-motion block that skips the motion rather than shortening it.',
        });
      }
    } else {
      auto.M2 = { ratio: null, na: true, absent: true, reason: 'runtime preference does not apply to a static frame' };
    }
  }

  /* ------------------------------------------------------------ assemble */

  function meta(chk) {
    // dgaCriterion travels with the row because assessCriteria reads it off the
    // VERDICT, not off the rubric — omitting it here made every criterion report
    // "no-check" while the mapping sat correctly in rubric.json, unused.
    return { id: chk.id, title: chk.title, description: chk.description, weight: chk.weight,
             blocker: !!chk.blocker, method: chk.method, fix: chk.fix,
             dgaCriterion: chk.dgaCriterion ?? null, dgaCategory: chk.dgaCategory ?? null,
             dgaTier: chk.dgaTier ?? null, authority: chk.authority ?? null, scope: chk.scope ?? "core" };
  }

  // A check is "met" for the X-of-N headline at this much compliance. Blockers are
  // held to 100%: one text run below 4.5:1 means the page does not conform, however
  // good the other ninety-nine are.
  const PASS_DEFAULT = rubric.passThreshold?.default ?? 0.9;
  const PASS_BLOCKER = rubric.passThreshold?.blocker ?? 1.0;

  const unassessed = [];
  const dropped = [];
  const categories = [];
  let earnedTotal = 0, availableTotal = 0, applicableTotal = 0, checksPassed = 0, checksCounted = 0;
  const failedBlockers = [];

  /**
   * Evaluate one check. Extracted so CORE and EXTENDED checks go through identical
   * arithmetic — the only difference between them is which total they land in, and
   * that difference must not be able to hide a second implementation.
   *
   * Returns { row } always, plus { pts, weight } when the check was actually graded.
   */
  function evaluate(chk, { countCoverage }) {
    const applies = chk.applies_to === 'both' || chk.applies_to === targetType;
    const forcedNa = naList.includes(chk.id);
    const result = chk.method === 'auto' ? auto[chk.id] : judged[chk.id];

    // A check that does not apply to this KIND of target was never in scope, so it is
    // not a coverage gap — a Figma frame has no runtime motion preference.
    if (!applies) {
      return { row: { ...meta(chk), status: 'n/a', naKind: 'absent', reason: `only applies to ${chk.applies_to} targets` } };
    }
    // Everything past this point could have been measured. Whether it was is the
    // coverage question, and every miss is recorded with its weight and its reason.
    if (countCoverage) applicableTotal += chk.weight;

    const miss = (kind, reason, absent = false) => {
      if (countCoverage) dropped.push({ id: chk.id, weight: chk.weight, kind, reason });
      return { row: { ...meta(chk), status: kind === 'unassessed' ? 'unassessed' : 'n/a',
                      naKind: absent ? 'absent' : 'gap', reason } };
    };

    if (forcedNa) return miss('forced', 'marked N/A for this audit');
    if (chk.method === 'judged' && (!result || typeof result.ratio !== 'number')) {
      unassessed.push(chk.id);
      return miss('unassessed', 'judged check was never assessed');
    }
    if (!result || result.na || result.ratio == null) {
      // No result at all means the probe found none of this kind on the page — an
      // absence. A result that declares itself absent says so explicitly. Everything
      // else is a gap: we could not look.
      // Absence takes three shapes, and all of them hide nothing:
      //   no result at all      — the probe found none of this kind
      //   absent: true          — the check says so outright
      //   total === 0           — a coverage helper with an empty denominator
      // The third was missed at first, which left M1 (no motion values on the page)
      // permanently blocking the design-system criterion for every site.
      return miss('unmeasurable', result?.reason || 'nothing of this kind present to measure',
                  !result || result.absent === true || result.total === 0);
    }

    // A judgement without a count is unfalsifiable: nobody can check 0.51 against
    // anything. Requiring the count is what let the button reading be challenged.
    let raw = result.ratio;
    if (chk.method === 'judged' && !allowUncountedJudged) {
      const c = result.counted;
      if (!c || !Number.isFinite(c.matched) || !Number.isFinite(c.total) || c.total <= 0) {
        throw new DgaError(
          'JUDGED_WITHOUT_COUNT',
          `${chk.id} was given a bare ratio (${result.ratio}) with no count. Supply ` +
            `counted: { matched, total } so the number can be checked, or set allowUncountedJudged.`,
          { checkId: chk.id }
        );
      }
      const implied = c.matched / c.total;
      if (Math.abs(implied - result.ratio) > 0.01) {
        throw new DgaError(
          'JUDGED_COUNT_MISMATCH',
          `${chk.id} states ratio ${result.ratio} but its count says ${c.matched}/${c.total} = ` +
            `${implied.toFixed(4)}. The number and the evidence for it have drifted apart.`,
          { checkId: chk.id, stated: result.ratio, implied }
        );
      }
      raw = implied;   // the count is the source of truth, not the rounded restatement
    }

    // Out of range means a counting bug upstream. Clamping it silently turns that
    // bug into a free perfect score, which is precisely how it would stay hidden.
    if (!Number.isFinite(raw) || raw < -1e-9 || raw > 1 + 1e-9) {
      throw new DgaError(
        'RATIO_OUT_OF_RANGE',
        `${chk.id} produced a ratio of ${raw}, which is not a fraction between 0 and 1. ` +
          'Something counted wrong; refusing to clamp it into a score.',
        { checkId: chk.id, ratio: raw }
      );
    }
    const ratio = Math.max(0, Math.min(1, raw));
    const pts = chk.scoring === 'binary' ? (ratio >= 1 ? chk.weight : 0) : chk.weight * ratio;
    const passAt = chk.blocker ? PASS_BLOCKER : PASS_DEFAULT;
    const passed = chk.scoring === 'binary' ? ratio >= 1 : ratio >= passAt;

    return {
      pts,
      weight: chk.weight,
      passed,
      row: {
        ...meta(chk),
        status: passed ? 'pass' : 'fail',
        ratio: round2(ratio),
        earned: round2(pts),
        available: chk.weight,
        measured: result.total != null ? { matched: result.matched, total: result.total } : undefined,
        // How the number was arrived at, when that is not simply "observed". Distinct from
        // `method`, which says auto vs judged — conflating the two hid the cascade note.
        measuredBy: result.measuredBy,
        notes: result.notes,
      },
    };
  }

  for (const cat of rubric.categories) {
    const outChecks = [];
    let earned = 0, available = 0;
    for (const chk of cat.checks) {
      // Extended checks measure practices nobody published. They are scored, but in
      // their own block — never in the 100, and never able to cap a band.
      if (chk.scope === 'extended') continue;
      const r = evaluate(chk, { countCoverage: true });
      outChecks.push(r.row);
      if (r.pts === undefined) continue;
      earned += r.pts;
      available += r.weight;
      checksCounted++;
      if (r.passed) checksPassed++;
      else if (chk.blocker) failedBlockers.push({ id: chk.id, title: chk.title, ratio: r.row.ratio });
    }
    earnedTotal += earned;
    availableTotal += available;
    categories.push({ id: cat.id, label: cat.label, weight: cat.weight, earned: round2(earned), available, checks: outChecks });
  }

  /* -------------------------------------------------------------- extended */

  // Scored the same way, reported apart. R2 (CSS logical properties) and M2
  // (prefers-reduced-motion) are good practice that DGA has never published in any
  // form — Figma cannot express either. Carrying them inside a government compliance
  // score meant 5 of the 100 points traced to nothing but my own opinion.
  const extRows = [];
  let extEarned = 0, extAvailable = 0, extPassed = 0;
  for (const cat of rubric.categories) {
    for (const chk of cat.checks) {
      if (chk.scope !== 'extended') continue;
      const r = evaluate(chk, { countCoverage: false });
      extRows.push({ ...r.row, category: cat.id });
      if (r.pts === undefined) continue;
      extEarned += r.pts;
      extAvailable += r.weight;
      if (r.passed) extPassed++;
    }
  }
  const extended = {
    label: 'Extended practice',
    note: 'Measured, but outside the 100: nothing here is published by DGA, so it carries no compliance weight and never caps a band.',
    earned: round2(extEarned),
    available: round2(extAvailable),
    score: extAvailable > 0 ? round2((extEarned / extAvailable) * 100) : null,
    checksPassed: extPassed,
    checksCounted: extRows.filter((r) => r.status === 'pass' || r.status === 'fail').length,
    checks: extRows,
  };

  if (unassessed.length && !allowUnassessed) {
    throw new DgaError(
      'UNASSESSED_JUDGED',
      `${unassessed.length} judged check(s) were never assessed: ${unassessed.join(', ')}. ` +
        'Assess them and pass them in, or set allowUnassessed. Refusing by default, because ' +
        'silently dropping the component checks is how a rebuild scores as compliant.',
      { unassessed }
    );
  }

  /* -------------------------------------------------------------- coverage */

  // The score is earned/available, so every check that drops out of `available`
  // makes the remaining ones count for more. Measuring LESS therefore raises the
  // number. That is not hypothetical: a capture once filed itself under the wrong
  // colour scheme, the entire 18-point colour category went n/a, and the site
  // scored HIGHER for never having been measured. Nothing warned, because nothing
  // was looking at the denominator.
  //
  // So the denominator is now part of the verdict, itemised, and there is a floor
  // under it. A number computed from a third of the rubric is not a lower-confidence
  // score — it is a different measurement wearing the same units.
  // Two kinds of gap, and they are not the same risk.
  //
  //   acknowledged — someone passed --na, or left a judged check unassessed. A
  //                  deliberate scope decision. An automated-only audit legitimately
  //                  skips all 27 points of judged checks; that is a real mode, not
  //                  an error, and it must stay possible.
  //   silent       — the engine could not measure something it expected to. Nobody
  //                  chose this and nobody will notice it. THIS is the dark-mode bug:
  //                  18 points of colour quietly became unmeasurable and the score
  //                  went UP. A budget on it turns that class of failure into a stop.
  //
  // So: refuse what nobody chose; label what someone did.
  const coveragePct = applicableTotal > 0 ? availableTotal / applicableTotal : 0;
  const minCoverage = rubric.thresholds?.minCoverage ?? 0.75;
  const maxSilent = rubric.thresholds?.maxSilentDropWeight ?? 15;
  const silent = dropped.filter((d) => d.kind === 'unmeasurable');
  const silentWeight = silent.reduce((a, d) => a + d.weight, 0);

  const coverage = {
    measuredWeight: round2(availableTotal),
    applicableWeight: round2(applicableTotal),
    pct: round2(coveragePct * 100),
    floor: round2(minCoverage * 100),
    silentWeight: round2(silentWeight),
    silentBudget: maxSilent,
    dropped: dropped.sort((a, b) => b.weight - a.weight),
  };

  if (silentWeight > maxSilent && !allowLowCoverage) {
    throw new DgaError(
      'SILENT_COVERAGE_LOSS',
      `${round2(silentWeight)} points of the rubric could not be measured at all, over a budget of ` +
        `${maxSilent}: ` + silent.map((d) => `${d.id} (${d.weight}pt, ${d.reason})`).join('; ') +
        '. Nobody asked for these to be skipped, so this is a broken capture rather than a ' +
        'scoping decision — and because the score is earned/available, a broken capture reads ' +
        'as a better site. Fix the capture, or set allowLowCoverage to score it anyway.',
      { coverage }
    );
  }

  const finalScore = availableTotal > 0 ? round2((earnedTotal / availableTotal) * 100) : 0;

  // The band is an ADOPTION level, not a compliance verdict. DGA publishes no passing
  // score — it publishes a checklist and confirms conformance by formal review — so a
  // tool printing "Compliant" would claim an authority it does not have. Readiness is
  // decided by DGA mandatory tier, below, and never by this number.
  let band = rubric.bands.find((b) => finalScore >= b.min) || rubric.bands[rubric.bands.length - 1];
  const capIndex = rubric.bands.findIndex((b) => b.id === rubric.provisionalCapBand);
  let cappedFrom = null;
  const capReasons = [];
  const capTo = (why) => {
    const at = rubric.bands.findIndex((b) => b.id === band.id);
    capReasons.push(why);
    if (capIndex >= 0 && at < capIndex) { cappedFrom = cappedFrom ?? band.label; band = rubric.bands[capIndex]; }
  };
  // Only EVIDENCE caps the adoption level now. Failing checks are already priced into
  // the number; capping for them too would charge twice for the same fault.
  // Thin evidence caps the band too. Either gate counts: coverage below the floor, or
  // a silent loss that was forced through. A verdict standing on 60% of the rubric
  // cannot claim a band the other 40% never had a chance to disprove.
  if (coveragePct < minCoverage) capTo(`only ${coverage.pct}% of the rubric was measured`);
  if (silentWeight > maxSilent) capTo(`${round2(silentWeight)} points could not be measured at all`);
  const provisional = coveragePct < minCoverage || silentWeight > maxSilent;

  // DGA own gate, decided on its published mandatory tier rather than on the number.
  const assessed = criteria ? assessCriteria(criteria, categories) : null;

  // R2 and M2 still produce real observations, but they are not compliance failures.
  // Stamping the scope onto each finding is what stops a renderer presenting an
  // extended note beside a WCAG blocker as though they carried the same authority.
  const scopeOf = new Map();
  for (const cat of rubric.categories) for (const chk of cat.checks) scopeOf.set(chk.id, chk.scope || 'core');
  for (const f of findings) f.scope = scopeOf.get(f.checkId) || 'core';

  const severityRank = { blocker: 0, major: 1, minor: 2 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || (b.occurrences || 0) - (a.occurrences || 0));

  const verdict = {
    schema: 'dga-score/1',
    standard: rubric.standard,
    target: {
      name: targetName,
      url: targetUrl,
      type: targetType,
      captures: captures.map((c) => ({ label: c.label, viewport: c.viewport, colorScheme: c.colorScheme, url: c.url })),
    },
    ledger: { synced: tokens.synced, source: tokens.source, dgaVersion: tokens.dgaVersion || null },
    scoredAt: new Date().toISOString(),
    score: finalScore,
    earned: round2(earnedTotal),
    available: availableTotal,
    checksPassed,
    checksCounted,
    checksTotal: rubric.categories.reduce((a, c) => a + c.checks.length, 0),
    band: { id: band.id, label: band.label },
    adoption: { score: finalScore, level: band.label, basis: 'share of the interface built from the DGA system, occurrence-weighted' },
    criteria: assessed,
    readiness: assessed ? assessed.readiness : null,
    cappedFrom,
    capReasons,
    coverage,
    provisional,
    failedBlockers,
    unassessed,
    parts: rollUpParts(rubric, categories, findings, round2),
    extended,
    categories,
    findings,
  };

  // A reference reading, so the number has something to be read against. Attached
  // last because it is computed FROM the finished verdict. Context only: the band
  // still comes from the absolute score against the ledger.
  verdict.reference = benchmarks ? compareToBenchmark(verdict, benchmarks, { id: benchmarkId, viewport: benchmarkViewport }) : null;
  return verdict;
}

/* ---------------------------------------------------------------- parts */

/**
 * Roll the nine categories up into the parts DGA actually publishes, so a score
 * can be read against the part of the system it belongs to.
 *
 * Each part is normalised to 100 within its own available weight. That makes
 * them comparable to each other and to the overall — 40/58 and 12/24 are hard to
 * weigh by eye, 69 and 50 are not. `weightedShare` keeps the raw points, because
 * that is what says which part is actually costing the most.
 */
function rollUpParts(rubric, categories, findings, round2 = (n) => Math.round(n * 100) / 100) {
  const defs = rubric.parts || [];
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const findingsByCheck = new Map();
  for (const f of findings) {
    if (!findingsByCheck.has(f.checkId)) findingsByCheck.set(f.checkId, []);
    findingsByCheck.get(f.checkId).push(f);
  }

  return defs.map((def) => {
    const cats = rubric.categories.filter((c) => c.part === def.id).map((c) => byId[c.id]).filter(Boolean);
    const earned = cats.reduce((a, c) => a + c.earned, 0);
    const available = cats.reduce((a, c) => a + c.available, 0);
    const checks = cats.flatMap((c) => c.checks);
    const graded = checks.filter((k) => k.status === 'pass' || k.status === 'fail');
    const failed = graded.filter((k) => k.status === 'fail');
    return {
      id: def.id,
      label: def.label,
      source: def.source,
      covers: def.covers,
      weight: def.weight,
      earned: round2(earned),
      available: round2(available),
      // null, not 0, when nothing in the part could be measured — a part with no
      // applicable checks has no score, and 0 would read as total failure.
      score: available > 0 ? round2((earned / available) * 100) : null,
      weightedShare: round2(earned),
      checksPassed: graded.filter((k) => k.status === 'pass').length,
      checksCounted: graded.length,
      categories: cats.map((c) => c.id),
      // What it would take to make this part whole, biggest win first.
      recoverable: failed
        .map((k) => ({
          checkId: k.id,
          title: k.title,
          points: round2((k.available ?? k.weight) - (k.earned ?? 0)),
          ratio: k.ratio ?? null,
          blocker: !!k.blocker,
          fix: k.fix,
          findings: (findingsByCheck.get(k.id) || []).length,
        }))
        .sort((a, b) => b.points - a.points),
      failedBlockers: failed.filter((k) => k.blocker).map((k) => k.id),
    };
  });
}

/* -------------------------------------------------------------- criteria */

/**
 * Roll the checks up into DGA OWN published assessment criteria, and decide readiness
 * the way DGA decides it.
 *
 * This exists because the tool spent its life answering a question DGA never asked. DGA
 * publishes no passing score: it publishes a checklist with a compliance status per
 * criterion, split into الامتثال الإلزامي (mandatory) and الموصى بها (recommended), and
 * states that formal review confirms a project meets ALL of them. So "is 72 a pass?" has
 * no official answer, while "are the mandatory criteria met?" has a precise one.
 *
 * A criterion is met only when every check under it passes at its own threshold, blockers
 * at 100%. A check that could not be measured makes the criterion "unknown", never "met":
 * the same rule the coverage gate applies to the denominator, for the same reason.
 */
function assessCriteria(criteria, categories) {
  const checks = categories.flatMap((c) => c.checks);
  const rows = (criteria.criteria || []).map((def) => {
    const mine = checks.filter((k) => k.dgaCriterion === def.id);
    const failing = mine.filter((k) => k.status === "fail");
    // An absence is not a gap. "This target ships no dark theme" hides nothing, so it
    // must not stop a criterion being met; "the browser could not observe focus" hides
    // everything it would have measured, so it must.
    const unknown = mine.filter((k) => (k.status === "n/a" && k.naKind !== "absent") || k.status === "unassessed");
    const absent = mine.filter((k) => k.status === "n/a" && k.naKind === "absent");
    const passing = mine.filter((k) => k.status === "pass");
    let status;
    if (!mine.length || mine.length === absent.length) status = def.automatable === false ? "manual" : "no-check";
    else if (failing.length) status = "open";
    else if (unknown.length) status = "unknown";
    else status = "met";
    return {
      id: def.id, ar: def.ar, en: def.en, tier: def.tier, category: def.category,
      status,
      checks: mine.map((k) => k.id),
      failing: failing.map((k) => ({ id: k.id, title: k.title, ratio: k.ratio ?? null })),
      unknown: unknown.map((k) => ({ id: k.id, title: k.title, reason: k.reason ?? null })),
      passing: passing.map((k) => k.id),
      notApplicable: absent.map((k) => ({ id: k.id, reason: k.reason ?? null })),
      note: status === "manual"
        ? "Not measurable from a rendered page — assess against the DGA downloadable checklist."
        : null,
    };
  });

  const mandatory = rows.filter((r) => r.tier === "mandatory");
  const open = mandatory.filter((r) => r.status === "open");
  const unsure = mandatory.filter((r) => r.status === "unknown" || r.status === "no-check");
  const met = mandatory.filter((r) => r.status === "met");

  // Three states, not two. "Cannot confirm" is the honest verdict when nothing has failed
  // but something could not be looked at — collapsing that into ready would repeat the
  // mistake of counting an unmeasured check as a pass.
  const readiness = {
    state: open.length ? "not-yet" : unsure.length ? "unconfirmed" : "ready",
    label: open.length ? "Not yet" : unsure.length ? "Cannot confirm" : "Ready to submit",
    met: met.length,
    total: mandatory.length,
    open: open.map((r) => ({ id: r.id, ar: r.ar, blocking: r.failing.map((x) => x.id) })),
    unknown: unsure.map((r) => ({ id: r.id, ar: r.ar, why: r.unknown.map((u) => u.id) })),
    basis: "DGA gates on its mandatory tier and confirms conformance by formal review — this is not a score threshold",
    submitTo: criteria.submitTo || null,
  };

  const manual = rows.filter((r) => r.status === "manual" || r.status === "no-check");
  return {
    source: criteria.source, capturedAt: criteria.capturedAt,
    readiness,
    criteria: rows,
    automatedCoverage: {
      automated: rows.filter((r) => r.checks.length).length,
      published: rows.length,
      needsHumanReview: manual.map((r) => r.id),
      note: "Task completion, load times, error messaging, help resources and feedback mechanisms cannot be read off a rendered page. This tool covers part of the DGA framework, not all of it.",
    },
  };
}

/* ---------------------------------------------------------------- region */

/**
 * A location can arrive as a bare CSS path (older captures, and the parity fixture) or
 * as a full locator. Normalising both here is what lets the region view work without
 * invalidating a single stored capture.
 */
function asLocator(x) {
  if (!x) return null;
  if (typeof x === 'string') return { sel: x, region: null, section: null, name: null, at: null };
  return { sel: x.sel ?? x.selector ?? null, region: x.region ?? null, section: x.section ?? null,
           name: x.name ?? null, at: x.at ?? null };
}

/**
 * Where on the page did the points go?
 *
 * "P1 lost 4.84" is true and unusable. This groups every finding by the part of the page
 * it sits in — header, navigation, main, footer, and the named section within it — so the
 * answer becomes "the service cards in «الخدمات الأكثر استخداماً»".
 *
 * IMPORTANT, and stated in the output as well as here: the per-row points are an
 * APPORTIONMENT, not a measurement. Points are computed per check across the whole page;
 * a check that lost X points over findings totalling M occurrences contributes
 * X x (occurrences / M) to each. That is a reasonable split, but it is arithmetic laid on
 * top of a measurement, and printing it as though it were measured would be exactly the
 * proxy-for-the-real-thing mistake this rubric has been cleaned of. Hence `pointsApprox`,
 * and the ~ in every renderer.
 */
function byRegion(verdict, { maxRowsPerSection = 8 } = {}) {
  if (!verdict || !Array.isArray(verdict.categories)) return [];
  const round2 = (n) => Math.round(n * 100) / 100;

  const lostFor = new Map();
  for (const k of verdict.categories.flatMap((c) => c.checks)) {
    if (k.status === 'fail') lostFor.set(k.id, (k.available ?? k.weight ?? 0) - (k.earned ?? 0));
  }
  const occFor = new Map();
  for (const f of verdict.findings || []) {
    if (!lostFor.has(f.checkId)) continue;
    occFor.set(f.checkId, (occFor.get(f.checkId) || 0) + (f.occurrences || 1));
  }

  const groups = new Map();
  for (const f of verdict.findings || []) {
    const lost = lostFor.get(f.checkId);
    if (lost === undefined) continue;
    const locs = (f.where || []).map(asLocator).filter(Boolean);
    const head = locs[0] || {};
    const occ = f.occurrences || 1;
    // Three states, not two. "unplaced" is only honest when NOTHING resolved; an
    // element that sits outside every landmark but under a heading is on the page and
    // findable, and filing it as unplaced throws away the section that was found.
    const section = head.section || null;
    const region = head.region || (section ? 'page' : 'unplaced');
    const key = region + '\u0000' + (section || '');
    if (!groups.has(key)) groups.set(key, { region, section, points: 0, rows: [] });
    const g = groups.get(key);
    const pts = round2(lost * (occ / (occFor.get(f.checkId) || 1)));
    g.points = round2(g.points + pts);
    g.rows.push({
      checkId: f.checkId, severity: f.severity, summary: f.summary,
      found: f.found ?? null, expected: f.expected ?? null,
      occurrences: occ, pointsApprox: pts,
      elements: locs.slice(0, 4).map((l) => ({ name: l.name, sel: l.sel, at: l.at })),
      fix: f.fix ?? null,
    });
  }

  const ORDER = ['header', 'navigation', 'search', 'main', 'form', 'aside', 'footer', 'page', 'unplaced'];
  return [...groups.values()]
    .map((g) => ({ ...g, rows: g.rows.sort((a, b) => b.pointsApprox - a.pointsApprox).slice(0, maxRowsPerSection) }))
    .sort((a, b) => {
      const d = ORDER.indexOf(a.region) - ORDER.indexOf(b.region);
      return d !== 0 ? d : b.points - a.points;
    });
}

/**
 * A reference reading from data/benchmarks.json, so a score has something to be read
 * against. dga.gov.sa is the publisher's own site: useful context, and explicitly NOT a
 * definition of compliance — the band still comes from the absolute score against the
 * ledger. A comparison is only drawn where BOTH sides measured the check; showing a real
 * reading against a blank would invent a win.
 */
function compareToBenchmark(verdict, benchmarks, { id = null, viewport = 'web' } = {}) {
  const site = (benchmarks?.sites || []).find((x) => (id ? x.id === id : true));
  if (!site) return null;
  const ref = site.viewports?.[viewport] || null;
  if (!ref) return null;
  const mine = new Map();
  for (const k of verdict.categories.flatMap((c) => c.checks)) {
    if (k.ratio != null && (k.status === 'pass' || k.status === 'fail')) mine.set(k.id, k.ratio);
  }
  const checks = [];
  for (const [cid, ratio] of mine) {
    const theirs = ref.checks?.[cid];
    checks.push({
      id: cid, mine: ratio,
      reference: typeof theirs === 'number' ? theirs : null,
      comparable: typeof theirs === 'number',
      whyNot: typeof theirs === 'number' ? null
        : (site.notMeasured || []).includes(cid) ? 'the reference site has no reading for this check' : 'not present in the reference',
    });
  }
  return {
    id: site.id, label: site.label, auditedAt: site.auditedAt,
    dgaVersion: site.dgaVersion ?? null, viewport,
    score: ref.score ?? null,
    delta: ref.score == null ? null : round2delta(verdict.score - ref.score),
    caveats: site.caveats || [],
    checks: checks.sort((a, b) => (a.comparable === b.comparable ? 0 : a.comparable ? -1 : 1)),
    basis: 'context, not a threshold — the band still comes from the absolute score against the ledger',
  };
}
const round2delta = (n) => Math.round(n * 100) / 100;

/* --------------------------------------------------------------- explain */

/**
 * Why is this score what it is, and what would raise it?
 *
 * Answers a question about the whole verdict, one part, or one check, always in
 * the same shape: what was lost, why, and what recovers it. Points are the
 * ordering, because "fix this and gain 5" is actionable in a way that "this
 * failed" is not.
 *
 *   explain(verdict)                    -> the whole thing, worst first
 *   explain(verdict, { part: 'foundations' })
 *   explain(verdict, { check: 'T1' })
 */
function explain(verdict, { part = null, check = null, maxFindings = 6 } = {}) {
  if (verdict && verdict.schema === 'dga-score-split/1') {
    return {
      scope: 'split',
      viewports: verdict.viewports
        .filter((v) => v.captured)
        .map((v) => ({ id: v.id, label: v.label, ...explain(v.verdict, { part, check, maxFindings }) })),
    };
  }

  const allChecks = verdict.categories.flatMap((c) => c.checks);
  const byCheck = (id) => allChecks.find((k) => k.id === id);

  if (check) {
    const k = byCheck(check);
    if (!k) return { scope: 'check', checkId: check, error: `No check ${check} in this rubric.` };
    const fs = verdict.findings.filter((f) => f.checkId === check);
    return {
      scope: 'check', checkId: k.id, title: k.title, status: k.status,
      description: k.description,
      lost: k.status === 'fail' ? Math.round(((k.available ?? k.weight) - (k.earned ?? 0)) * 100) / 100 : 0,
      of: k.available ?? k.weight,
      ratio: k.ratio ?? null,
      measured: k.measured ?? null,
      reason: k.reason ?? null,
      notes: k.notes ?? null,
      blocker: !!k.blocker,
      why: fs.length
        ? fs.slice(0, maxFindings).map((f) => ({
            summary: f.summary, found: f.found, expected: f.expected,
            occurrences: f.occurrences ?? 1, where: (f.where || []).slice(0, 3),
          }))
        : (k.notes ? [{ summary: k.notes, assessed: true }] : []),
      moreFindings: Math.max(0, fs.length - maxFindings),
      fix: k.fix,
    };
  }

  const parts = verdict.parts || [];
  const scope = part ? parts.filter((p) => p.id === part) : parts;
  if (part && !scope.length) return { scope: 'part', part, error: `No part "${part}". Try: ${parts.map((p) => p.id).join(', ')}.` };

  return {
    scope: part ? 'part' : 'verdict',
    score: verdict.score,
    band: verdict.band,
    parts: scope.map((p) => ({
      id: p.id, label: p.label, score: p.score, earned: p.earned, available: p.available,
      checksPassed: p.checksPassed, checksCounted: p.checksCounted,
      lost: Math.round((p.available - p.earned) * 100) / 100,
      recoverable: p.recoverable.map((r) => {
        const fs = verdict.findings.filter((f) => f.checkId === r.checkId);
        const k = byCheck(r.checkId);
        return {
          ...r,
          // Judged checks produce a stated count in `notes` rather than findings,
          // so a "why" that only read findings came back empty on exactly the
          // checks a person is most likely to ask about.
          why: fs.length
            ? fs.slice(0, 3).map((f) => ({ summary: f.summary, found: f.found, expected: f.expected, occurrences: f.occurrences ?? 1 }))
            : (k?.notes ? [{ summary: k.notes, assessed: true }] : []),
        };
      }),
    })),
  };
}

/* --------------------------------------------------------- split by viewport */

/**
 * Score web and mobile SEPARATELY rather than as one blended number.
 *
 * Merging the two hides exactly what matters most. A4 target sizes and S2
 * containers are properties of a viewport, not of a site: a page can pass at
 * 1440 and fail at 390, and averaging the two produces a figure describing
 * neither. Two numbers say where the problem is; one says only that there is one.
 *
 * `score()` is untouched and still takes whatever captures it is given — this
 * groups and calls it twice, so every existing guarantee, including the
 * regression fixture, holds unchanged.
 */
function scoreByViewport({ rubric, tokens, criteria = null, benchmarks = null, captures = [], judged = {}, options = {} }) {
  // The split point is the ledger's own desktop breakpoint, not a number picked
  // here — if DGA moves it, this moves with it.
  const bps = (tokens.breakpoints && tokens.breakpoints.list) || [];
  const webMin = bps.filter((b) => b.min > 0).map((b) => b.min).sort((a, b) => a - b)[0] ?? 768;

  // A capture with no width used to fall through `?? 0` and land silently in Mobile,
  // where it polluted a viewport it was never taken at. Same shape as the bug that
  // filed captures under the wrong colour scheme: a missing field quietly became a
  // real-looking value. Refuse it instead.
  const widthless = captures.filter((c) => !Number.isFinite(c.viewport?.width));
  if (widthless.length) {
    throw new DgaError(
      'CAPTURE_WITHOUT_VIEWPORT',
      `${widthless.length} capture(s) carry no viewport width: ` +
        `${widthless.map((c) => c.label || '(unlabelled)').join(', ')}. ` +
        'A viewport split cannot place them, and defaulting them to mobile would ' +
        'report findings against a width they were never taken at.',
      { labels: widthless.map((c) => c.label ?? null) }
    );
  }

  const groups = [
    { id: 'web', label: 'Web', match: (c) => c.viewport.width >= webMin },
    { id: 'mobile', label: 'Mobile', match: (c) => c.viewport.width < webMin },
  ];

  const viewports = groups.map((g) => {
    const caps = captures.filter(g.match);
    if (!caps.length) {
      return { id: g.id, label: g.label, captured: false, captures: [], verdict: null,
        note: `No ${g.label.toLowerCase()} capture was taken, so nothing is reported for it. This is a gap in the audit, not a pass.` };
    }
    return {
      id: g.id, label: g.label, captured: true,
      captures: caps.map((c) => ({ label: c.label, width: c.viewport?.width ?? null })),
      // benchmarkViewport is the group's own id, so a mobile reading is never compared
      // against a desktop reference.
      verdict: score({ rubric, tokens, criteria, benchmarks, captures: caps, judged, options: { ...options, benchmarkViewport: g.id } }),
    };
  });

  const scored = viewports.filter((v) => v.captured);

  // A site-level figure, taken as the WORST viewport rather than an average.
  // Averaging would let a strong desktop hide a failing phone, which is the
  // blur the split exists to remove; a gate takes the weakest reading. Named
  // `overall` because that is what it answers, and `basis` says how, so nobody
  // has to assume it is a mean.
  const worst = scored.length
    ? scored.reduce((a, b) => (b.verdict.score < a.verdict.score ? b : a))
    : null;

  // Part scores across the site follow the same rule, part by part: a part is
  // only as compliant as its weakest viewport.
  const partIds = (rubric.parts || []).map((p) => p.id);
  const overallParts = partIds.map((id) => {
    const rows = scored.map((v) => ({ v, p: (v.verdict.parts || []).find((x) => x.id === id) })).filter((r) => r.p && r.p.score != null);
    if (!rows.length) return { id, label: (rubric.parts.find((p) => p.id === id) || {}).label, score: null, note: 'not measurable in any captured viewport' };
    const w = rows.reduce((a, b) => (b.p.score < a.p.score ? b : a));
    return {
      id, label: w.p.label, score: w.p.score, from: w.v.id,
      byViewport: rows.map((r) => ({ viewport: r.v.id, score: r.p.score, earned: r.p.earned, available: r.p.available })),
    };
  });

  return {
    schema: 'dga-score-split/1',
    standard: rubric.standard,
    target: { name: options.targetName ?? '(unnamed target)', url: options.targetUrl ?? null, type: options.targetType ?? 'site' },
    ledger: { synced: tokens.synced, dgaVersion: tokens.dgaVersion || null },
    scoredAt: new Date().toISOString(),
    breakpoint: webMin,
    viewports,
    overall: worst
      ? {
          score: worst.verdict.score,
          band: worst.verdict.band,
          cappedFrom: worst.verdict.cappedFrom,
          from: worst.id,
          basis: 'worst viewport, not an average — a site is only as compliant as its weakest viewport',
          parts: overallParts,
          incomplete: scored.length < viewports.length
            ? `Only ${scored.map((v) => v.label.toLowerCase()).join(' and ')} was captured, so this is not a full site reading.`
            : null,
        }
      : null,
  };
}

/* ------------------------------------------------------------- inline out */

/** Compact markdown for a chat reply — the default result format. */
function inlineReport(v, { maxFindings = 3 } = {}) {
  // A split carries no score of its own; report each viewport in turn.
  if (v && v.schema === 'dga-score-split/1') return inlineSplitReport(v, { maxFindings });
  const L = [];
  // DGA publishes no passing score, so the headline is its question, not a number
  // dressed as a verdict: are the mandatory criteria met?
  const rd = v.readiness;
  if (rd) {
    const mark = rd.state === "ready" ? "✓" : rd.state === "unconfirmed" ? "?" : "✗";
    L.push(`**${v.target.name} — ${mark} ${rd.label}** · DGA mandatory criteria ${rd.met} of ${rd.total} met`);
    if (rd.open.length) L.push(`> Open: ${rd.open.map((o) => `**${o.ar}** (${o.blocking.join(", ")})`).join(" · ")}`);
    if (rd.unknown.length) L.push(`> Cannot confirm: ${rd.unknown.map((o) => `**${o.ar}** (${o.why.join(", ")} not measurable here)`).join(" · ")}`);
    L.push(`> _${rd.basis}._`);
    L.push("");
    L.push(`**Adoption ${v.score}%** · ${v.band.label} · ${v.checksPassed} of ${v.checksCounted} checks met`);
  } else {
    L.push(`**${v.target.name} — adoption ${v.score}% · ${v.checksPassed} of ${v.checksCounted} checks met · ${v.band.label}**`);
  }
  if (v.cappedFrom) {
    L.push(`> Capped from **${v.cappedFrom}** by ${(v.capReasons || []).join('; ') || v.failedBlockers.map((b) => `\`${b.id}\` ${b.title}`).join(', ')}. ` +
      `A service cannot be reported as compliant while failing these.`);
  }
  // The denominator, stated. A score off 60% of the rubric is a different measurement
  // from a score off all of it, and the reader cannot tell them apart from the number.
  const cell = (x) => String(x ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  if (v.reference && v.reference.score != null) {
    const d = v.reference.delta;
    L.push(`> Reference: **${v.reference.label}** scores **${v.reference.score}** on the same rubric` +
      ` (${v.reference.viewport}${v.reference.dgaVersion ? `, DGA ${v.reference.dgaVersion}` : ''}) — ` +
      `you are **${d == null ? '?' : d >= 0 ? `+${d}` : d}**. ${v.reference.basis}.`);
  }
  if (v.extended && v.extended.score != null) {
    const failed = v.extended.checks.filter((k) => k.status === 'fail').map((k) => `\`${k.id}\` ${k.title}`);
    L.push(`> Extended practice, **outside the 100**: ${v.extended.score}/100` +
      `${failed.length ? ` — ${failed.join(', ')}` : ' — all clear'}. DGA publishes none of this, so it carries no compliance weight.`);
  }
  if (v.criteria && v.criteria.automatedCoverage) {
    const ac = v.criteria.automatedCoverage;
    L.push(`> Automates **${ac.automated} of ${ac.published}** published DGA criteria. ${ac.needsHumanReview.length ? `Needs human review against DGA\u2019s checklist: ${ac.needsHumanReview.join(", ")}.` : ""}`);
  }
  if (v.coverage && v.coverage.pct < 100) {
    const worst3 = v.coverage.dropped.slice(0, 3).map((d) => `\`${d.id}\` ${d.reason}`).join(', ');
    L.push(`> Measured **${v.coverage.pct}%** of the rubric (${v.coverage.measuredWeight} of ${v.coverage.applicableWeight} points).` +
      ` Not measured: ${worst3}${v.coverage.dropped.length > 3 ? `, +${v.coverage.dropped.length - 3} more` : ''}.` +
      (v.provisional ? ' **Provisional** — below the evidence floor.' : ''));
  }
  L.push('');
  if (v.parts?.length) {
    L.push('| Part | Score | Points | Checks met |');
    L.push('| --- | --- | --- | --- |');
    for (const p of v.parts) {
      L.push(`| **${p.label}** | ${p.score == null ? 'n/a' : `${p.score}/100`} | ${p.earned}/${p.available} | ${p.checksPassed} of ${p.checksCounted} |`);
    }
    L.push('');
  }
  L.push('| Category | Points |');
  L.push('| --- | --- |');
  for (const c of v.categories) {
    const graded = c.checks.filter((k) => k.status === 'pass' || k.status === 'fail');
    L.push(`| ${c.label} | ${graded.length ? `${c.earned}/${c.available}` : 'n/a'} |`);
  }
  /* ------------------------------------------- where the points went ---- */

  // The question the old report could not answer. "P1 lost 4.84" is true and useless;
  // this says which part of the page it happened in and what to look for there.
  const regions = byRegion(v, { maxRowsPerSection: 4 });
  if (regions.length) {
    L.push('');
    L.push('**Where the points went** — by where it sits on the page.');
    L.push('_Points are ≈apportioned across a check\'s findings by occurrence, not measured per element._');
    L.push('');
    L.push('| Where | What | Found → expected | ≈pts |');
    L.push('| --- | --- | --- | --: |');
    for (const g of regions.slice(0, 7)) {
      const place = g.section ? `${g.region} · ${g.section}` : g.region;
      L.push(`| **${cell(place)}** | | | **≈${g.points}** |`);
      for (const r of g.rows) {
        const named = r.elements.map((e) => e.name).filter(Boolean).slice(0, 2).map((n) => `«${cell(n)}»`).join(' ');
        const who = named || (r.elements[0]?.sel ? `\`${cell(r.elements[0].sel)}\`` : '—');
        const val = r.found
          ? `\`${cell(r.found)}\`${r.expected ? ` → \`${cell(r.expected)}\`` : ''}`
          : '';
        L.push(`| ${who} | \`${r.checkId}\` ${cell(r.summary)}${r.occurrences > 1 ? ` ×${r.occurrences}` : ''} | ${val} | ≈${r.pointsApprox} |`);
      }
    }
  }

  // One row per failing check, not per finding. A page with 40 invisible borders
  // produces 40 near-identical A2 findings, and listing the same sentence three
  // times is noise — the count is the useful part, and the fix is one fix.
  const byCheck = new Map();
  for (const f of v.findings) {
    if (f.severity === 'minor') continue;
    const e = byCheck.get(f.checkId);
    if (e) { e.n++; continue; }
    byCheck.set(f.checkId, { ...f, n: 1 });
  }
  // Rank by what would actually move the score: points still on the table.
  const lost = new Map();
  for (const c of v.categories) for (const k of c.checks) {
    if (k.status === 'fail') lost.set(k.id, (k.available ?? k.weight) - (k.earned ?? 0));
  }
  const top = [...byCheck.values()]
    .sort((a, b) => (lost.get(b.checkId) ?? 0) - (lost.get(a.checkId) ?? 0))
    .slice(0, maxFindings);
  if (top.length) {
    L.push('');
    L.push(`**Top ${top.length} to fix**`);
    top.forEach((f, i) => {
      const pts = lost.get(f.checkId);
      const worth = pts ? ` _(+${Math.round(pts * 10) / 10} pts)_` : '';
      const at = (f.where || []).map(asLocator).filter(Boolean)[0];
      const place = at && (at.region || at.section)
        ? ` _[${[at.region, at.section].filter(Boolean).join(' · ')}${at.name ? ` — «${at.name}»` : ''}]_`
        : '';
      L.push(`${i + 1}. \`${f.checkId}\`${f.n > 1 ? ` ×${f.n}` : ''} ${f.summary}${worth}${place} — ${f.fix}`);
    });
  }
  const na = v.categories.flatMap((c) => c.checks).filter((k) => k.status === 'n/a');
  if (na.length) L.push('', `_Not applicable: ${na.map((k) => k.id).join(', ')} — these leave the denominator rather than counting as failures._`);
  return L.join('\n');
}

/**
 * Two results, side by side. No combined figure: a single number across both
 * viewports is what this split exists to stop producing.
 */
function inlineSplitReport(split, { maxFindings = 3 } = {}) {
  const L = [];
  L.push(`**${split.target.name}** — scored separately per viewport (split at ${split.breakpoint}px, the DGA desktop breakpoint).`);
  L.push('');

  const scored = split.viewports.filter((v) => v.captured);
  if (split.overall) {
    L.push(`**Overall ${split.overall.score}/100 · ${split.overall.band.label}** — the ${split.overall.from} reading, which is the weaker one. Not an average: a site is only as compliant as its weakest viewport.`);
    if (split.overall.incomplete) L.push(`> ⚠ ${split.overall.incomplete}`);
    L.push('');
  }
  if (scored.length) {
    // Parts across viewports, which is the table most questions are actually about.
    const partIds = (split.overall?.parts || []).map((p) => p.id);
    if (partIds.length) {
      L.push(`| Part | ${scored.map((v) => v.label).join(' | ')} | Overall |`);
      L.push(`| --- | ${scored.map(() => '---').join(' | ')} | --- |`);
      for (const op of split.overall.parts) {
        const cells = scored.map((v) => {
          const p = (v.verdict.parts || []).find((x) => x.id === op.id);
          return p && p.score != null ? `${p.score}` : 'n/a';
        });
        L.push(`| **${op.label}** | ${cells.join(' | ')} | ${op.score == null ? 'n/a' : `**${op.score}**`} |`);
      }
      L.push('');
    }
    L.push('| Viewport | Score | Checks met | Band |');
    L.push('| --- | --- | --- | --- |');
    for (const v of scored) {
      const d = v.verdict;
      L.push(`| **${v.label}** ${v.captures.map((c) => `${c.width}px`).join(', ')} | ${d.score}/100 | ${d.checksPassed} of ${d.checksCounted} | ${d.band.label}${d.cappedFrom ? ` _(capped from ${d.cappedFrom})_` : ''} |`);
    }
  }
  for (const v of split.viewports.filter((x) => !x.captured)) {
    L.push('', `⚠ **${v.label}** — ${v.note}`);
  }

  for (const v of scored) {
    L.push('', `### ${v.label}`, '', inlineReport(v.verdict, { maxFindings }));
  }
  L.push('', `_Ledger ${split.ledger.synced}${split.ledger.dgaVersion ? `, DGA ${split.ledger.dgaVersion}` : ''}._`);
  return L.join('\n');
}


/*
 * render.js — verdict -> scorecard page. Pure: returns an HTML string, touches
 * no filesystem. Emits page content only (no doctype/html/head/body) so it can be
 * wrapped by a publisher, written to a file, or injected as an overlay.
 *
 *   renderScorecard(verdict, { shots: [{ label, dataUri }] })
 *
 * Screenshots are NOT inlined unless passed. On the audits measured so far they
 * were 97% of the disk footprint — 2.1MB of a 2.9MB report — and the same images
 * again inside the page. Downscale to ~900px JPEG before passing any.
 */



function renderScorecard(S, { shots = [] } = {}) {

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');


const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso || '';
  }
};

const bandTone = { compliant: 'pass', substantial: 'pass', partial: 'warn', 'non-compliant': 'fail' }[S.band?.id] || 'warn';

/* ------------------------------------------------------------------ dial */

const R = 52;
const C = 2 * Math.PI * R;
const pct = Math.max(0, Math.min(100, S.score ?? 0));
// Never round the headline up: 99.57 displayed as "100" on a card whose whole
// point is that the target is not compliant is the one lie this page must not
// tell. One decimal, trailing .0 trimmed.
const shown = Number.isInteger(pct) ? String(pct) : (Math.floor(pct * 10) / 10).toFixed(1);
const dial = `
<svg class="dial" viewBox="0 0 128 128" role="img" aria-label="Score ${shown} out of 100">
  <circle cx="64" cy="64" r="${R}" class="dial-track"></circle>
  <circle cx="64" cy="64" r="${R}" class="dial-fill tone-${bandTone}"
    stroke-dasharray="${(C * pct) / 100} ${C}" stroke-dashoffset="0"
    transform="rotate(-90 64 64)"></circle>
  <text x="64" y="62" class="dial-num" text-anchor="middle" style="font-size:${shown.length > 3 ? '1.65rem' : '2.1rem'}">${shown}</text>
  <text x="64" y="82" class="dial-den" text-anchor="middle">/ 100</text>
</svg>`;

/* -------------------------------------------------------------- sections */

const statusTone = { pass: 'pass', fail: 'fail', 'n/a': 'mute', unassessed: 'warn' };
const statusLabel = { pass: 'Met', fail: 'Not met', 'n/a': 'N/A', unassessed: 'Not assessed' };

const categoryRows = (S.categories || [])
  .map((c) => {
    const graded = c.checks.filter((k) => k.status === 'pass' || k.status === 'fail');
    const applicable = c.available || 0;
    const share = applicable ? (c.earned / applicable) * 100 : 0;
    const naNote = !graded.length
      ? 'Not applicable to this target'
      : `${graded.filter((k) => k.status === 'pass').length} of ${graded.length} check${graded.length === 1 ? '' : 's'} met`;
    return `
  <details class="cat" ${share < 90 && graded.length ? 'open' : ''}>
    <summary>
      <span class="cat-name">${esc(c.label)}</span>
      <span class="cat-meter" aria-hidden="true"><span class="cat-meter-fill tone-${share >= 90 ? 'pass' : share >= 60 ? 'warn' : 'fail'}" style="width:${applicable ? share : 0}%"></span></span>
      <span class="cat-pts">${applicable ? `${c.earned}<span class="dim">/${applicable}</span>` : '<span class="dim">n/a</span>'}</span>
    </summary>
    <p class="cat-note">${esc(naNote)}${applicable ? '' : ' — its weight leaves the denominator rather than counting against the target.'}</p>
    <table class="checks">
      <thead><tr><th>Check</th><th>Requirement</th><th class="num">Compliance</th><th>Status</th></tr></thead>
      <tbody>
      ${c.checks
        .map(
          (k) => `<tr>
        <th scope="row"><code>${esc(k.id)}</code> ${esc(k.title)}${k.blocker ? ' <span class="stamp-mini" title="Blocker check">blocker</span>' : ''}</th>
        <td class="req">${esc(k.description)}</td>
        <td class="num">${k.ratio != null ? `${Math.round(k.ratio * 100)}%` : '<span class="dim">—</span>'}${k.measured?.total ? `<span class="sub">${k.measured.matched} of ${k.measured.total}</span>` : ''}</td>
        <td><span class="pill tone-${statusTone[k.status]}">${statusLabel[k.status]}</span>${k.status === 'n/a' && k.reason ? `<span class="sub">${esc(k.reason)}</span>` : ''}</td>
      </tr>`
        )
        .join('')}
      </tbody>
    </table>
  </details>`;
  })
  .join('');

const sevOrder = ['blocker', 'major', 'minor'];
const sevLabel = { blocker: 'Blockers', major: 'Major', minor: 'Minor' };
const grouped = sevOrder
  .map((sev) => ({ sev, items: (S.findings || []).filter((f) => f.severity === sev) }))
  .filter((g) => g.items.length);

const findingsHtml = grouped
  .map(
    (g) => `
  <section class="sev sev-${g.sev}">
    <h3><span class="sev-dot"></span>${sevLabel[g.sev]} <span class="count">${g.items.length}</span></h3>
    <ul class="findings">
      ${g.items
        .map(
          (f) => `<li>
        <p class="f-head"><code>${esc(f.checkId)}</code> ${esc(f.summary)}${f.occurrences ? `<span class="occ">${f.occurrences}×</span>` : ''}</p>
        <dl>
          <div><dt>Found</dt><dd><code>${esc(f.found ?? '—')}</code></dd></div>
          <div><dt>Expected</dt><dd><code>${esc(f.expected ?? '—')}</code></dd></div>
          ${f.sample ? `<div><dt>Content</dt><dd>${esc(f.sample)}</dd></div>` : ''}
          ${f.where?.length ? `<div><dt>Where</dt><dd class="where">${f.where.slice(0, 6).map(asLocator).filter(Boolean).map((w) => {
            const place = [w.region, w.section].filter(Boolean).join(' · ');
            return `<code>${esc(w.name ? `«${w.name}» ` : '')}${esc(w.sel || '')}${place ? ` — ${esc(place)}` : ''}</code>`;
          }).join('')}</dd></div>` : ''}
          <div><dt>Fix</dt><dd>${esc(f.fix ?? '')}</dd></div>
        </dl>
      </li>`
        )
        .join('')}
    </ul>
  </section>`
  )
  .join('');

const shotsHtml = shots.length
  ? `<section class="block">
  <h2>Evidence</h2>
  <p class="lede">The captures the measurements were taken from.</p>
  <div class="shots">
    ${shots.map((s) => `<figure><img src="${s.dataUri}" alt="${esc(s.label)} capture of ${esc(S.target?.name)}"><figcaption>${esc(s.label)}</figcaption></figure>`).join('')}
  </div>
</section>`
  : '';

/* ------------------------------------------------------- DGA readiness */

// The headline is DGA own question. DGA publishes no passing score — it publishes a
// checklist and confirms conformance by formal review — so the page leads with whether
// the mandatory tier is met, and treats the percentage as adoption, which is all it is.
const rd = S.readiness;
const critRows = (S.criteria && S.criteria.criteria) || [];
const STATUS = { met: ["pass", "Met"], open: ["fail", "Open"], unknown: ["warn", "Cannot confirm"],
                 "no-check": ["warn", "Not applicable"], manual: ["warn", "Human review"] };
const readinessHtml = rd
  ? `<section class="block">
  <h2>DGA assessment criteria</h2>
  <p class="lede">DGA publishes a checklist, not a passing score: <em>«تضمن المراجعة الرسمية أن مشروعك يفي بجميع المعايير»</em>. Readiness below is the state of the <strong>mandatory tier</strong> — it is not a threshold on the adoption percentage.</p>
  <p class="cap"><span class="stamp ${rd.state === "ready" ? "" : rd.state === "unconfirmed" ? "warn" : "fail"}">${rd.label}</span><strong>${rd.met} of ${rd.total} mandatory criteria met.</strong>${rd.open.length ? ` Open: ${rd.open.map((o) => `<b>${esc(o.ar)}</b> (${o.blocking.map(esc).join(", ")})`).join(" · ")}.` : ""}${rd.unknown.length ? ` Cannot confirm: ${rd.unknown.map((o) => `<b>${esc(o.ar)}</b>`).join(" · ")}.` : ""}</p>
  <div class="scroll-x"><table>
    <thead><tr><th>Tier</th><th>Criterion</th><th>Status</th><th>Evidence</th></tr></thead>
    <tbody>${critRows.map((c) => `<tr>
      <td>${c.tier === "mandatory" ? "<b>إلزامي</b>" : "موصى بها"}</td>
      <td dir="auto"><strong>${esc(c.ar || c.id)}</strong><br><span style="font-size:.78rem">${esc(c.en || "")}</span></td>
      <td style="color:var(--${(STATUS[c.status] || ["slate"])[0]})"><b>${(STATUS[c.status] || ["", c.status])[1]}</b></td>
      <td>${c.checks.length ? c.checks.map((x) => `<code>${esc(x)}</code>`).join(" ") : `<span style="font-size:.78rem">${esc(c.note || "no automated check")}</span>`}</td>
    </tr>`).join("")}</tbody>
  </table></div>
  ${S.criteria && S.criteria.automatedCoverage ? `<p class="lede">Automates <strong>${S.criteria.automatedCoverage.automated} of ${S.criteria.automatedCoverage.published}</strong> published criteria. ${esc(S.criteria.automatedCoverage.note)}</p>` : ""}
</section>`
  : '';
/* --------------------------------------------------- where the points went */

// The section the report was missing. "P1 lost 4.84" names a check; this names a place.
// Points are apportioned across a check's findings by occurrence — arithmetic on top of a
// measurement, so every figure here carries a ~ and the lede says so outright.
const regions = byRegion(S, { maxRowsPerSection: 6 });
const regionHtml = regions.length
  ? `<section class="block">
  <h2>Where the points went</h2>
  <p class="lede">Grouped by where it sits on the page. Points are <strong>≈apportioned</strong> across each check's findings by how often it occurs — they are not measured per element.</p>
  ${regions.map((g) => `
  <section class="region">
    <h3>${esc(g.region)}${g.section ? ` <span class="sub">${esc(g.section)}</span>` : ''} <span class="count">≈${g.points} pts</span></h3>
    <div class="scroll-x"><table class="rgn">
      <thead><tr><th>Element</th><th>Check</th><th>Found</th><th>Expected</th><th class="n">×</th><th class="n">≈pts</th></tr></thead>
      <tbody>${g.rows.map((r) => `<tr>
        <td>${r.elements.map((e) => e.name ? `<strong>«${esc(e.name)}»</strong>` : `<code>${esc(e.sel || '—')}</code>`).slice(0, 2).join(' ')}</td>
        <td><code>${esc(r.checkId)}</code> ${esc(r.summary)}</td>
        <td><code>${esc(r.found ?? '—')}</code></td>
        <td><code>${esc(r.expected ?? '—')}</code></td>
        <td class="n">${r.occurrences}</td>
        <td class="n">≈${r.pointsApprox}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  </section>`).join('')}
</section>`
  : '';

const refNote = S.reference && S.reference.score != null
  ? `<p class="cap"><span class="stamp">Reference</span> <strong>${esc(S.reference.label)}</strong> scores <strong>${S.reference.score}</strong> on this same rubric (${esc(S.reference.viewport)}${S.reference.dgaVersion ? `, DGA ${esc(S.reference.dgaVersion)}` : ''}) — this target is <strong>${S.reference.delta >= 0 ? '+' : ''}${S.reference.delta}</strong> against it. ${esc(S.reference.basis)}.${S.reference.caveats?.length ? ` Reference caveats: ${S.reference.caveats.map(esc).join('; ')}.` : ''}</p>`
  : '';

const extNote = S.extended && S.extended.score != null
  ? `<p class="cap"><span class="stamp warn">Outside the 100</span> <strong>Extended practice ${S.extended.score}/100</strong> — ${S.extended.checks.map((k) => `<code>${esc(k.id)}</code> ${esc(k.title)}${k.ratio != null ? ` (${k.ratio})` : ''}`).join(', ')}. DGA publishes none of this, so it carries no compliance weight and never caps a band.</p>`
  : '';

const capNote = S.cappedFrom
  ? `<p class="cap"><span class="stamp">Capped</span> The weighted score alone would read <strong>${esc(S.cappedFrom)}</strong>. ${S.failedBlockers.length} blocker check${S.failedBlockers.length > 1 ? 's' : ''} — ${S.failedBlockers.map((b) => `<code>${esc(b.id)}</code> ${esc(b.title)}`).join(', ')} — hold${S.failedBlockers.length > 1 ? '' : 's'} it at <strong>${esc(S.band.label)}</strong>. A service cannot be reported as compliant while failing these.</p>`
  : '';

const unassessedNote = S.unassessed?.length
  ? `<p class="cap"><span class="stamp warn">Incomplete</span> ${S.unassessed.length} judged check${S.unassessed.length > 1 ? 's were' : ' was'} not assessed (${S.unassessed.map((u) => `<code>${esc(u)}</code>`).join(', ')}) and left the denominator. The score covers everything else.</p>`
  : '';

/* ------------------------------------------------------------------ page */

const html = `<title>${esc(S.target?.name || 'Design')} Compliance Audit</title>
<style>
  /* Light is the base set; dark redefines only tokens, twice, so the toggle
     wins in both directions and the un-stamped system state still resolves. */
  :root {
    --paper:#f6f7f9; --surface:#ffffff; --sunken:#eef0f5;
    --ink:#161a22; --slate:#5c6478; --faint:#8a91a3;
    --rule:#dfe3ec; --rule-strong:#c6ccdb;
    --accent:#2d3f6b;
    --pass:#2e7d55; --warn:#94620f; --fail:#b23a30;
    --pass-bg:#e7f3ec; --warn-bg:#f8f0dd; --fail-bg:#fbeae8;
    --shadow:0 1px 2px rgba(22,26,34,.05), 0 8px 24px -12px rgba(22,26,34,.16);
    --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic",sans-serif;
    --mono:ui-monospace,SFMono-Regular,"SF Mono","Cascadia Mono","Roboto Mono",Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --paper:#0f1219; --surface:#171b24; --sunken:#1d222d;
      --ink:#e7eaf2; --slate:#a3abbd; --faint:#727a8d;
      --rule:#282e3a; --rule-strong:#3a4252;
      --accent:#8ea6dd;
      --pass:#5cbb87; --warn:#d9a441; --fail:#e8756a;
      --pass-bg:#172a20; --warn-bg:#2b2415; --fail-bg:#2d1a19;
      --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
    }
  }
  :root[data-theme="dark"] {
    --paper:#0f1219; --surface:#171b24; --sunken:#1d222d;
    --ink:#e7eaf2; --slate:#a3abbd; --faint:#727a8d;
    --rule:#282e3a; --rule-strong:#3a4252;
    --accent:#8ea6dd;
    --pass:#5cbb87; --warn:#d9a441; --fail:#e8756a;
    --pass-bg:#172a20; --warn-bg:#2b2415; --fail-bg:#2d1a19;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
  }

  * { box-sizing:border-box; }
  body {
    margin:0; background:var(--paper); color:var(--ink);
    font-family:var(--sans); font-size:16px; line-height:1.6;
    -webkit-font-smoothing:antialiased;
  }
  .wrap { max-width:60rem; margin:0 auto; padding:clamp(1.25rem,4vw,3rem) clamp(1rem,4vw,2rem) 4rem; }
  code, .num, .mono { font-family:var(--mono); font-variant-numeric:tabular-nums; }
  h1,h2,h3 { text-wrap:balance; margin:0; }
  a { color:var(--accent); }
  :focus-visible { outline:2px solid var(--accent); outline-offset:2px; border-radius:2px; }

  /* ---- masthead: this is an inspection record, so it reads like one ---- */
  .eyebrow {
    font-family:var(--mono); font-size:.7rem; letter-spacing:.14em; text-transform:uppercase;
    color:var(--faint); margin:0 0 .75rem;
  }
  .masthead { border-bottom:2px solid var(--ink); padding-bottom:1.25rem; margin-bottom:2rem; }
  .masthead h1 { font-size:clamp(1.6rem,4.5vw,2.4rem); line-height:1.15; letter-spacing:-.02em; font-weight:650; }
  .masthead .target { font-family:var(--mono); font-size:.9rem; color:var(--slate); margin:.5rem 0 0; word-break:break-all; }
  .meta { display:flex; flex-wrap:wrap; gap:.4rem 1.5rem; margin-top:1rem;
    font-family:var(--mono); font-size:.72rem; letter-spacing:.06em; text-transform:uppercase; color:var(--faint); }
  .meta b { color:var(--slate); font-weight:500; }

  /* ---- verdict ---- */
  .verdict {
    display:grid; grid-template-columns:auto 1fr; gap:clamp(1rem,4vw,2.5rem); align-items:center;
    background:var(--surface); border:1px solid var(--rule); border-radius:6px;
    padding:clamp(1.25rem,3vw,2rem); box-shadow:var(--shadow);
  }
  @media (max-width:34rem) { .verdict { grid-template-columns:1fr; text-align:left; } }
  .dial { width:128px; height:128px; display:block; }
  .dial-track { fill:none; stroke:var(--sunken); stroke-width:10; }
  .dial-fill { fill:none; stroke-width:10; stroke-linecap:butt; transition:stroke-dasharray .6s ease; }
  .dial-fill.tone-pass { stroke:var(--pass); } .dial-fill.tone-warn { stroke:var(--warn); } .dial-fill.tone-fail { stroke:var(--fail); }
  .dial-num { font-family:var(--mono); font-size:2.1rem; font-weight:600; fill:var(--ink); }
  .dial-den { font-family:var(--mono); font-size:.72rem; fill:var(--faint); letter-spacing:.08em; }
  @media (prefers-reduced-motion:reduce) { .dial-fill { transition:none; } }

  .band { font-size:clamp(1.3rem,3.5vw,1.9rem); font-weight:650; letter-spacing:-.015em; margin:0 0 .35rem; }
  .band.tone-pass { color:var(--pass); } .band.tone-warn { color:var(--warn); } .band.tone-fail { color:var(--fail); }
  .tally { font-family:var(--mono); font-size:.85rem; color:var(--slate); }
  .cap { margin:1rem 0 0; padding:.75rem .9rem; background:var(--sunken); border-inline-start:3px solid var(--fail);
    border-radius:0 4px 4px 0; font-size:.88rem; line-height:1.55; }
  .stamp { display:inline-block; font-family:var(--mono); font-size:.62rem; letter-spacing:.14em; text-transform:uppercase;
    color:var(--fail); border:1.5px solid var(--fail); border-radius:3px; padding:.1rem .4rem; margin-inline-end:.5rem;
    transform:rotate(-1.5deg); vertical-align:.05em; }
  .stamp.warn { color:var(--warn); border-color:var(--warn); }
  .stamp-mini { font-family:var(--mono); font-size:.6rem; letter-spacing:.1em; text-transform:uppercase;
    color:var(--fail); border:1px solid var(--fail); border-radius:2px; padding:0 .25rem; }

  /* ---- blocks ---- */
  .block { margin-top:3rem; }
  .block > h2 { font-size:1.15rem; letter-spacing:-.01em; padding-bottom:.5rem; border-bottom:1px solid var(--rule-strong); }
  .lede { color:var(--slate); font-size:.92rem; margin:.75rem 0 1.25rem; max-width:62ch; }

  /* ---- category ledger ---- */
  .cat { border-bottom:1px solid var(--rule); }
  .cat > summary { display:grid; grid-template-columns:minmax(7rem,14rem) 1fr auto; gap:1rem; align-items:center;
    padding:.8rem .25rem; cursor:pointer; list-style:none; }
  .cat > summary::-webkit-details-marker { display:none; }
  .cat > summary:hover .cat-name { color:var(--accent); }
  .cat-name { font-family:var(--mono); font-size:.75rem; letter-spacing:.09em; text-transform:uppercase; color:var(--ink); }
  .cat-meter { height:7px; background:var(--sunken); border-radius:1px; overflow:hidden; min-width:3rem; }
  .cat-meter-fill { display:block; height:100%; }
  .cat-meter-fill.tone-pass { background:var(--pass); } .cat-meter-fill.tone-warn { background:var(--warn); } .cat-meter-fill.tone-fail { background:var(--fail); }
  .cat-pts { font-family:var(--mono); font-size:.85rem; min-width:4.5rem; text-align:end; }
  .dim { color:var(--faint); }
  .cat-note { margin:.25rem .25rem 1rem; font-size:.84rem; color:var(--slate); }

  table.checks { width:100%; border-collapse:collapse; font-size:.85rem; margin-bottom:1.5rem; }
  .checks th, .checks td { text-align:start; padding:.55rem .6rem; border-top:1px solid var(--rule); vertical-align:top; }
  .checks thead th { font-family:var(--mono); font-size:.65rem; letter-spacing:.12em; text-transform:uppercase;
    color:var(--faint); border-top:0; border-bottom:1px solid var(--rule-strong); font-weight:500; }
  .checks tbody th { font-weight:550; width:32%; }
  .checks .req { color:var(--slate); width:38%; }
  .checks .num { text-align:end; white-space:nowrap; }
  .sub { display:block; font-family:var(--mono); font-size:.68rem; color:var(--faint); margin-top:.15rem; font-weight:400; }
  .pill { display:inline-block; font-family:var(--mono); font-size:.65rem; letter-spacing:.08em; text-transform:uppercase;
    padding:.15rem .45rem; border-radius:3px; white-space:nowrap; }
  .pill.tone-pass { background:var(--pass-bg); color:var(--pass); }
  .pill.tone-fail { background:var(--fail-bg); color:var(--fail); }
  .pill.tone-warn { background:var(--warn-bg); color:var(--warn); }
  .pill.tone-mute { background:var(--sunken); color:var(--faint); }
  .scroll-x { overflow-x:auto; }

  /* ---- findings ---- */
  .sev { margin-top:2rem; }
  .sev h3 { font-family:var(--mono); font-size:.75rem; letter-spacing:.12em; text-transform:uppercase;
    display:flex; align-items:center; gap:.5rem; color:var(--slate); }
  .sev .count { font-size:.7rem; color:var(--faint); }
  .sev-dot { width:9px; height:9px; border-radius:50%; display:inline-block; }
  .sev-blocker .sev-dot { background:var(--fail); } .sev-major .sev-dot { background:var(--warn); } .sev-minor .sev-dot { background:var(--faint); }
  ul.findings { list-style:none; margin:.75rem 0 0; padding:0; display:flex; flex-direction:column; gap:.6rem; }
  ul.findings > li { background:var(--surface); border:1px solid var(--rule); border-radius:5px; padding:.9rem 1rem; }
  .sev-blocker ul.findings > li { border-inline-start:3px solid var(--fail); }
  .sev-major ul.findings > li { border-inline-start:3px solid var(--warn); }
  .sev-minor ul.findings > li { border-inline-start:3px solid var(--rule-strong); }
  .f-head { margin:0 0 .6rem; font-weight:550; font-size:.95rem; }
  .f-head code { font-size:.72rem; background:var(--sunken); padding:.1rem .35rem; border-radius:3px; color:var(--accent); margin-inline-end:.4rem; }
  .occ { font-family:var(--mono); font-size:.7rem; color:var(--faint); margin-inline-start:.5rem; }
  .findings dl { margin:0; display:grid; gap:.3rem; font-size:.85rem; }
  .findings dl > div { display:grid; grid-template-columns:5.5rem 1fr; gap:.75rem; }
  @media (max-width:30rem) { .findings dl > div { grid-template-columns:1fr; gap:.1rem; } }
  .findings dt { font-family:var(--mono); font-size:.64rem; letter-spacing:.1em; text-transform:uppercase;
    color:var(--faint); padding-top:.22rem; }
  .findings dd { margin:0; color:var(--slate); min-width:0; overflow-wrap:anywhere; }
  .region { border-top:1px solid var(--rule); padding-top:.9rem; margin-top:1.1rem; }
  .region h3 { display:flex; align-items:baseline; gap:.5rem; flex-wrap:wrap; margin:0 0 .6rem;
               font-size:.95rem; letter-spacing:.02em; text-transform:uppercase; color:var(--accent); }
  .region h3 .sub { text-transform:none; letter-spacing:0; color:var(--ink); font-weight:600; }
  .region h3 .count { margin-inline-start:auto; font-family:var(--mono); font-size:.78rem; color:var(--slate); text-transform:none; }
  table.rgn { width:100%; border-collapse:collapse; font-size:.82rem; }
  table.rgn th { text-align:start; font-weight:600; color:var(--faint); font-size:.72rem;
                 text-transform:uppercase; letter-spacing:.04em; padding:.3rem .5rem; border-bottom:1px solid var(--rule); }
  table.rgn td { padding:.4rem .5rem; border-bottom:1px solid var(--rule); vertical-align:top; color:var(--slate); }
  table.rgn td strong { color:var(--ink); }
  table.rgn .n { text-align:end; font-family:var(--mono); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .findings dd code { font-size:.78rem; color:var(--ink); }
  .where code { display:block; color:var(--slate); font-size:.72rem; }

  /* ---- evidence ---- */
  .shots { display:grid; grid-template-columns:repeat(auto-fit,minmax(15rem,1fr)); gap:1rem; }
  .shots figure { margin:0; }
  .shots img { width:100%; height:auto; display:block; border:1px solid var(--rule); border-radius:4px; background:var(--sunken); }
  .shots figcaption { font-family:var(--mono); font-size:.68rem; letter-spacing:.1em; text-transform:uppercase;
    color:var(--faint); margin-top:.45rem; }

  /* ---- method ---- */
  .method { margin-top:3rem; padding-top:1.25rem; border-top:1px solid var(--rule-strong);
    font-size:.83rem; color:var(--slate); }
  .method h2 { font-family:var(--mono); font-size:.7rem; letter-spacing:.12em; text-transform:uppercase;
    color:var(--faint); margin-bottom:.75rem; font-weight:500; }
  .method p { margin:0 0 .7rem; max-width:70ch; }
  .method code { font-size:.78rem; }
  .formula { font-family:var(--mono); font-size:.8rem; background:var(--sunken); padding:.6rem .8rem;
    border-radius:4px; display:block; overflow-x:auto; color:var(--ink); }
</style>

<div class="wrap">

  <header class="masthead">
    <p class="eyebrow">${esc(S.standard?.name || 'Design system')} · compliance audit</p>
    <h1>${esc(S.target?.name || 'Untitled target')}</h1>
    ${S.target?.url ? `<p class="target">${esc(S.target.url)}</p>` : ''}
    <div class="meta">
      <span>Audited <b>${esc(fmtDate(S.scoredAt))}</b></span>
      <span>Target <b>${esc(S.target?.type || '—')}</b></span>
      <span>Ledger synced <b>${esc(S.ledger?.synced ? fmtDate(S.ledger.synced) : 'never')}</b></span>
      ${S.ledger?.dgaVersion ? `<span>DGA release <b>${esc(S.ledger.dgaVersion)}</b></span>` : ''}
      <span>Captures <b>${(S.target?.captures || []).length}</b></span>
    </div>
  </header>

  <section class="verdict">
    ${dial}
    <div>
      <p class="band tone-${bandTone}">${esc(S.band?.label || '—')}</p>
      <p class="tally">${S.checksPassed} of ${S.checksCounted} applicable checks met · ${S.earned} of ${S.available} points${S.checksTotal && S.checksCounted !== S.checksTotal ? ` · ${S.checksTotal - S.checksCounted} of ${S.checksTotal} not applicable to a ${esc(S.target?.type)} target` : ''}</p>
      ${capNote}
      ${refNote}
      ${extNote}
      ${unassessedNote}
    </div>
  </section>

  ${S.parts?.length ? `<section class="block">
    <h2>The three parts of the system</h2>
    <p class="lede">Each part is scored out of 100 within its own weight, so they can be compared with each other and with the overall. Foundations is what the Foundations file defines; Components is the Components Library and Icons; Standards is the RTL and accessibility guidance, which is not a library and so is a part of its own.</p>
    <div class="scroll-x"><table class="checks">
      <thead><tr><th>Part</th><th>Covers</th><th class="num">Score</th><th class="num">Points</th><th class="num">Checks met</th></tr></thead>
      <tbody>${S.parts.map((p) => `<tr>
        <th scope="row">${esc(p.label)}<span class="sub">${esc(p.source || "")}</span></th>
        <td class="req">${esc(p.covers || "")}</td>
        <td class="num">${p.score == null ? '<span class="dim">n/a</span>' : `${esc(p.score)}<span class="sub">of 100</span>`}</td>
        <td class="num">${esc(p.earned)}<span class="sub">of ${esc(p.available)}</span></td>
        <td class="num">${p.checksPassed} of ${p.checksCounted}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </section>` : ""}

  <section class="block">
    <h2>Where the points went</h2>
    <p class="lede">Nine categories, ${S.checksTotal} checks. Each category shows points earned against points available for this target — a check that cannot apply leaves the denominator rather than counting as a failure. Open a row for the individual checks.</p>
    <div class="scroll-x">${categoryRows}</div>
  </section>

  ${readinessHtml}

  ${regionHtml}

  ${
    findingsHtml
      ? `<section class="block">
    <h2>Findings</h2>
    <p class="lede">${S.findings.length} finding${S.findings.length === 1 ? '' : 's'}, most severe first. Blockers cap the compliance band regardless of the score.</p>
    ${findingsHtml}
  </section>`
      : `<section class="block"><h2>Findings</h2><p class="lede">No findings — every applicable check was met.</p></section>`
  }

  ${shotsHtml}

  <section class="method">
    <h2>How the number was produced</h2>
    <p>Every measured value came from a deterministic pass over the target — computed styles, contrast ratios and authored CSS for a site; bound variables and node metadata for a Figma frame. The same target audited twice produces the same score.</p>
    <span class="formula">score = Σ(weight × compliance) ÷ Σ(applicable weight) × 100</span>
    <p>Coverage checks return a fraction weighted by how often a value actually occurs, so one stray colour on a rarely-used element does not cost what a wrong body colour does. An ordinary check counts as met at 90% compliance or above; a blocker check only at 100%, because WCAG conformance and mark usage are not proportional. Colours are matched in OKLab at ΔE ≤ 2 — about one just-noticeable difference.</p>
    <p>Blocker checks — off-palette brand colour, mark misuse, text and non-text contrast — cap the band at <em>Partial</em> however high the number climbs. The score itself is never adjusted.</p>
    <p>Measured against <code>${esc(S.ledger?.source?.fileName || 'the DGA library')}</code>${S.ledger?.synced ? `, extracted ${esc(fmtDate(S.ledger.synced))}` : ''}. ${esc(S.standard?.authority || '')}${S.standard?.arabicName ? ` · ${esc(S.standard.arabicName)}` : ''}.</p>
  </section>

</div>
`;

  return html;
}

/* ------------------------------------------------- split: web vs mobile */

/**
 * Two viewports on one page, each with its own score.
 *
 * Built by rendering each verdict through renderScorecard and stitching the
 * bodies under one masthead — the per-verdict renderer stays untouched and
 * therefore stays the thing the tests already cover. The shared header carries
 * the comparison, which is the reason for the split: seeing 63.6 against 66.4
 * tells you where to look, and a single blended 64.9 does not.
 */
function renderSplitScorecard(split, { shots = [] } = {}) {
  const scored = split.viewports.filter((v) => v.captured);
  if (!scored.length) throw new Error('renderSplitScorecard: no captured viewport to render');

  const parts = scored.map((v) => ({ v, html: renderScorecard(v.verdict, { shots }) }));
  const head = parts[0].html.slice(0, parts[0].html.indexOf('<div class="wrap">'));

  const bodyOf = (html) => {
    const open = html.indexOf('<div class="wrap">') + '<div class="wrap">'.length;
    const close = html.lastIndexOf('</div>');
    return html
      .slice(open, close)
      // one masthead for the page, not one per viewport
      .replace(/<header class="masthead">[\s\S]*?<\/header>/, '');
  };

  const e = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const tone = (b) => ({ compliant: 'pass', substantial: 'pass', partial: 'warn', 'non-compliant': 'fail' }[b] || 'warn');

  const compare = `
  <section class="block" style="margin-top:0">
    <h2>Two viewports, scored separately</h2>
    <p class="lede">A page can pass at desktop width and fail at phone width — target sizes and containers are
    properties of a viewport, not of a site. Blending them into one number describes neither, so each is scored
    on its own. Split at ${split.breakpoint}px, the DGA desktop breakpoint.</p>
    <div class="scroll-x">
      <table class="checks">
        <thead><tr><th>Viewport</th><th class="num">Score</th><th class="num">Checks met</th><th>Band</th></tr></thead>
        <tbody>
        ${scored.map((v) => `<tr>
          <th scope="row">${e(v.label)} <span class="sub">${v.captures.map((c) => e(c.width) + 'px').join(', ')}</span></th>
          <td class="num">${e(v.verdict.score)}<span class="sub">of 100</span></td>
          <td class="num">${v.verdict.checksPassed} of ${v.verdict.checksCounted}</td>
          <td><span class="pill tone-${tone(v.verdict.band.id)}">${e(v.verdict.band.label)}</span>${v.verdict.cappedFrom ? `<span class="sub">capped from ${e(v.verdict.cappedFrom)}</span>` : ''}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${split.viewports.filter((v) => !v.captured).map((v) => `<p class="cap"><span class="stamp warn">Not captured</span> ${e(v.note)}</p>`).join('')}
  </section>`;

  const masthead = `
  <header class="masthead">
    <p class="eyebrow">${e(split.standard?.name || 'DGA Platforms Code')} · compliance audit</p>
    <h1>${e(split.target?.name || 'Untitled target')}</h1>
    ${split.target?.url ? `<p class="target">${e(split.target.url)}</p>` : ''}
    <div class="meta">
      <span>Audited <b>${e((split.scoredAt || '').slice(0, 10))}</b></span>
      <span>Ledger synced <b>${e(split.ledger?.synced || 'never')}</b></span>
      ${split.ledger?.dgaVersion ? `<span>DGA release <b>${e(split.ledger.dgaVersion)}</b></span>` : ''}
      <span>Viewports <b>${scored.length}</b></span>
    </div>
  </header>`;

  const sections = parts.map(({ v, html }) => `
  <section class="block">
    <h2 style="font-size:1.35rem">${e(v.label)} — ${e(v.verdict.score)}/100 · ${e(v.verdict.band.label)}</h2>
    ${bodyOf(html)}
  </section>`).join('\n');

  return `${head}<div class="wrap">\n${masthead}\n${compare}\n${sections}\n</div>\n`;
}


  /* ------------------------------------------------------------- surface */

  // The target minimum comes from the ledger for the viewport being measured, so a
  // 375px capture is not judged by the desktop number.
  function minTargetFor(width) {
    var a = TOKENS.a11y && TOKENS.a11y.minTargetPx;
    if (!a) return RUBRIC.thresholds.minTargetPx;
    if (typeof a === 'number') return a;
    var bps = (TOKENS.breakpoints && TOKENS.breakpoints.list) || [];
    var bp = bps.filter(function (b) { return width >= (b.min || 0); })
                .sort(function (x, y) { return (y.min || 0) - (x.min || 0); })[0];
    var name = bp ? bp.name : 'desktop';
    return a[name] != null ? a[name] : (a.desktop != null ? a.desktop : RUBRIC.thresholds.minTargetPx);
  }

  var api = {
    version: '0.1.0',
    ledgerSynced: TOKENS.synced,
    captures: [],
    rubric: RUBRIC,
    tokens: TOKENS,
    components: COMPONENTS,
    benchmarks: BENCHMARKS,
    criteria: CRITERIA,

    /** Probe this viewport, add it to the set, and score everything captured so far. */
    audit: function (opts) {
      opts = opts || {};
      var label = opts.label || ('capture-' + (api.captures.length + 1));
      var capture = probe({ label: label, minTargetPx: minTargetFor(window.innerWidth), forceCascade: opts.forceCascade === true });
      api.captures.push(capture);
      var args = {
        rubric: RUBRIC, tokens: TOKENS, criteria: CRITERIA, benchmarks: BENCHMARKS, captures: api.captures,
        judged: opts.judged || {},
        options: {
          targetType: 'site',
          targetName: opts.targetName || document.title || location.hostname,
          targetUrl: opts.targetUrl || location.href,
          na: opts.na || [],
          allowUnassessed: !!opts.allowUnassessed,
        },
      };
      // Web and mobile are scored SEPARATELY and reported that way by default.
      // Target sizes and containers belong to a viewport, not to a site, so one
      // blended number describes neither. combined:true returns the old single
      // verdict, which the regression fixture still pins.
      var verdict = opts.combined ? score(args) : scoreByViewport(args);
      api.verdict = verdict;
      // Raw tallies stay in the page unless explicitly asked for: shipping them back
      // is 32KB per capture, which is the thing that made the old design unusable.
      if (opts.evidence) verdict.captures = api.captures;
      return verdict;
    },

    /**
     * Why is a score what it is, and what raises it?
     *   __dga.explain()                      -> every part, worst first
     *   __dga.explain({ part: "foundations" })
     *   __dga.explain({ check: "T1" })       -> what was found, and the fix
     */
    explain: function (q) { return explain(api.verdict, q || {}); },

    /**
     * Where did the points go, by place on the page?
     *   __dga.regions()            -> header / nav / main / footer, worst first
     * Points are apportioned across a check's findings by occurrence, so they are
     * approximate per row and exact per check.
     */
    regions: function (v) {
      var x = v || api.verdict;
      if (x && x.schema === 'dga-score-split/1') {
        return (x.viewports || []).filter(function (y) { return y.captured; })
          .map(function (y) { return { viewport: y.id, regions: byRegion(y.verdict) }; });
      }
      return byRegion(x);
    },

    /** Compact markdown for a chat reply. Handles a split or a single verdict. */
    inline: function (v) { return inlineReport(v || api.verdict); },

    /** The full scorecard page as an HTML string. Handles a split or a single verdict. */
    html: function (v, o) {
      var x = v || api.verdict;
      return x && x.schema === 'dga-score-split/1'
        ? renderSplitScorecard(x, o || {})
        : renderScorecard(x, o || {});
    },

    /** Render the scorecard over the page itself, for a human looking at the tab. */
    overlay: function (v) {
      var host = document.getElementById('__dga_overlay') || document.createElement('div');
      host.id = '__dga_overlay';
      host.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#f6f7f9');
      host.innerHTML =
        '<button onclick="this.parentNode.remove()" style="position:fixed;top:12px;right:16px;z-index:1;' +
        'font:600 13px system-ui;padding:6px 12px;border:1px solid #c6ccdb;border-radius:5px;background:#fff;cursor:pointer">Close</button>' +
        api.html(v);
      document.body.appendChild(host);
      return 'overlay rendered';
    },

    reset: function () { api.captures = []; api.verdict = null; return 'cleared'; },
  };

  if (typeof window !== 'undefined') window.__dga = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
