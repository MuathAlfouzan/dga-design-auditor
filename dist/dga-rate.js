/*!
 * dga-rate 0.1.0 — DGA Platforms Code compliance auditor, in one file.
 *
 * Runs entirely in the page: nothing is fetched, nothing is written to disk, and
 * only a ~6KB verdict leaves the browser. Ledger extracted 2026-08-17 from
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

  var RUBRIC = {"version":1,"standard":{"name":"DGA Platforms Code","arabicName":"كود المنصات","authority":"Digital Government Authority, Saudi Arabia","source":"https://www.figma.com/community/file/1392264328585493958/components-library-platforms-code"},"bands":[{"id":"compliant","label":"Compliant","min":90},{"id":"substantial","label":"Substantially compliant","min":75},{"id":"partial","label":"Partial","min":60},{"id":"non-compliant","label":"Non-compliant","min":0}],"blockerCapBand":"partial","passThreshold":{"default":0.9,"blocker":1},"thresholds":{"colorMatchDeltaE":2,"colorNearMissDeltaE":10,"contrastNormalText":4.5,"contrastLargeText":3,"contrastNonText":3,"largeTextPx":24,"largeBoldPx":18.66,"minTargetPx":24,"offPaletteMinOccurrences":3,"coverageIgnoreBelowOccurrences":1},"categories":[{"id":"color","label":"Color & tokens","weight":18,"checks":[{"id":"C1","weight":8,"title":"Color token coverage","description":"Every text, background, border and fill color resolves to a DGA color token.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of color-bearing declarations within deltaE <= colorMatchDeltaE of some ledger color.","blocker":false,"fix":"Replace the literal color with the named DGA token. The finding names the nearest token for each offender."},{"id":"C2","weight":4,"title":"No off-palette brand color","description":"No color far from every DGA token (deltaE > colorNearMissDeltaE) is used repeatedly as a brand or accent surface.","applies_to":"both","method":"auto","scoring":"fraction","measure":"1 minus the occurrence-weighted share of far-off-palette colors used at least offPaletteMinOccurrences times. Near-misses are C1's problem, not this one.","blocker":true,"fix":"An unrecognisable brand color is an identity violation, not a styling preference. Move it onto the DGA palette or get the addition approved into the library."},{"id":"C3","weight":3,"title":"Semantic colors used semantically","description":"success / warning / error / info tokens appear only in their semantic roles, and those roles use no other color.","applies_to":"both","method":"judged","scoring":"fraction","measure":"Share of semantic-token usages whose surrounding role matches the token's meaning, plus destructive/among-status affordances that use the correct token.","blocker":false,"fix":"Error text in the brand green, or a success toast in red, breaks the one convention users carry between government platforms."},{"id":"C4","weight":3,"title":"Dark theme from the DS dark set","description":"If the target ships a dark theme, its colors come from the DGA dark-mode tokens rather than ad-hoc darkening.","applies_to":"both","method":"auto","scoring":"fraction","na_when":"target has no dark theme","measure":"Same coverage calculation as C1, run against the dark-scheme capture and the ledger's dark set.","blocker":false,"fix":"Point the dark theme at the DGA dark tokens. Inverting or dimming light tokens drifts within one release."}]},{"id":"typography","label":"Typography","weight":16,"checks":[{"id":"T1","weight":5,"title":"Typeface stack","description":"Latin and Arabic text render in the DGA typefaces, each script in the face specified for it.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of rendered text whose resolved font family is in the ledger's font stack for that script.","blocker":false,"fix":"A substituted face is the single most visible compliance failure — it reads as a different government at a glance."},{"id":"T2","weight":5,"title":"Type scale","description":"Font sizes come from the DGA type ramp.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of computed font-size values matching a ramp step exactly (px, after rem resolution).","blocker":false,"fix":"Snap to the nearest ramp step; the finding names it."},{"id":"T3","weight":3,"title":"Font weights","description":"Only the weights the DGA system defines are used.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of computed font-weight values in the ledger's allowed weight set.","blocker":false,"fix":"Synthetic or off-scale weights render inconsistently across platforms, especially in Arabic."},{"id":"T4","weight":3,"title":"Line height and tracking","description":"Line-height and letter-spacing match the ramp step's paired values.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of text runs whose (size, line-height, letter-spacing) triple matches a ramp step. Arabic needs its own leading, so mismatches here are counted per script.","blocker":false,"fix":"Set the ramp's paired leading rather than a global multiplier — Arabic ascenders and descenders need the extra room."}]},{"id":"spacing","label":"Spacing & layout","weight":12,"checks":[{"id":"S1","weight":6,"title":"Spacing scale","description":"Padding, margin and gap values sit on the DGA spacing grid.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of non-zero spacing values matching a scale step.","blocker":false,"fix":"Off-grid spacing is what makes an otherwise on-token page feel unlike the rest of the platform."},{"id":"S2","weight":3,"title":"Container widths and gutters","description":"Page container max-widths, gutters and column behaviour follow the DGA breakpoints.","applies_to":"site","method":"auto","scoring":"fraction","measure":"Measured at desktop, tablet and mobile captures; each breakpoint whose container width and gutter match the ledger scores its third.","blocker":false,"fix":"Match the DGA container at each breakpoint so content lines up across linked government services."},{"id":"S3","weight":3,"title":"Vertical rhythm","description":"Section and block spacing uses the DGA rhythm steps rather than arbitrary gaps.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of between-section vertical gaps matching a rhythm step.","blocker":false,"fix":"Use the rhythm steps for section separation; the page reads as one document rather than stacked fragments."}]},{"id":"shape","label":"Shape & elevation","weight":8,"checks":[{"id":"E1","weight":3,"title":"Corner radii","description":"border-radius values come from the DGA radius scale.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of non-zero radii matching a scale step (fully-round pills excluded and checked against the pill token).","blocker":false,"fix":"Snap to the nearest radius step."},{"id":"E2","weight":2,"title":"Borders","description":"Border widths and colors come from the DGA border tokens.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of visible borders whose width is on the scale and whose color is a ledger border token.","blocker":false,"fix":"Use the border tokens; hairlines that vary by a fraction of a pixel show up as banding on scaled displays."},{"id":"E3","weight":3,"title":"Elevation","description":"box-shadow values come from the DGA elevation set.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of non-none shadows matching an elevation token within a small numeric tolerance.","blocker":false,"fix":"Use the named elevation level. Hand-tuned shadows break the depth ordering the system defines."}]},{"id":"components","label":"Components","weight":18,"checks":[{"id":"P1","weight":8,"title":"DS components, not rebuilds","description":"Buttons, inputs, selects, cards, tabs, tables, navigation, modals and alerts correspond to DGA components rather than bespoke reimplementations.","applies_to":"both","method":"judged","scoring":"fraction","measure":"Share of identified component instances matching a DGA component by anatomy. On Figma targets, whether the instance is a library instance rather than a detached or hand-drawn frame.","blocker":false,"fix":"Adopt the library component. A rebuild that looks right today is the thing that drifts at the next DGA release."},{"id":"P2","weight":5,"title":"Variants, sizes and states","description":"Component variants (primary / secondary / tertiary), sizes and interaction states are the ones the system defines.","applies_to":"both","method":"judged","scoring":"fraction","measure":"Share of instances whose variant, size and hover/active/disabled/focus treatments match the spec.","blocker":false,"fix":"Missing disabled or focus treatments are the usual failure; both are specified, neither is optional."},{"id":"P3","weight":5,"title":"Component anatomy","description":"Internal padding, icon-and-label spacing and order, and minimum heights match the component spec.","applies_to":"both","method":"judged","scoring":"fraction","measure":"Share of instances whose measured internal geometry matches the spec within 1px.","blocker":false,"fix":"Restore the specified padding and min-height. Squeezed buttons are also the usual cause of an A4 target-size failure."}]},{"id":"brand","label":"Iconography & brand","weight":6,"checks":[{"id":"I1","weight":3,"title":"Icon set","description":"Icons come from the DGA icon set, at scale sizes, with the specified stroke weight.","applies_to":"both","method":"judged","scoring":"fraction","measure":"Share of icons identifiable as DGA set members at a scale size. Mixed icon libraries on one page fail proportionally.","blocker":false,"fix":"Standardise on the DGA icon set. Two icon families on one screen is visible even to users who cannot name why."},{"id":"I2","weight":3,"title":"Logo and lockup","description":"Official marks use approved variants at or above minimum size, with the specified clear space, uncropped and unrecoloured.","applies_to":"both","method":"judged","scoring":"binary","measure":"Pass only if every mark on the target satisfies variant, minimum size, clear space and color rules.","blocker":true,"fix":"Misuse of a government mark is an identity violation. Use the approved asset at approved size with its clear space intact."}]},{"id":"rtl","label":"RTL & bilingual","weight":8,"checks":[{"id":"R1","weight":3,"title":"Direction and mirroring","description":"Arabic renders with dir=rtl and the layout mirrors — not just the text.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Correct dir/lang on the document and on mixed-script runs, plus evidence that layout order, alignment and navigation actually mirror in the RTL capture.","blocker":false,"fix":"Set dir on the document and let logical properties carry the mirroring, rather than a per-component RTL override sheet."},{"id":"R2","weight":3,"title":"Logical properties","description":"Layout uses inline/block logical properties instead of left/right physical ones.","applies_to":"site","method":"auto","scoring":"fraction","measure":"Share of directional declarations (margin, padding, inset, border, text-align, float) written logically rather than physically, from authored stylesheet rules.","blocker":false,"fix":"margin-inline-start over margin-left. Physical properties are why an RTL layout needs a second stylesheet and then diverges from the first."},{"id":"R3","weight":2,"title":"Arabic typography and numerals","description":"Arabic runs use the Arabic face, directional icons mirror, and the numeral system is consistent throughout.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Arabic-range text resolving to the Arabic face; chevrons and arrows mirrored in RTL; one numeral system (Arabic-Indic or Western) used consistently.","blocker":false,"fix":"Mixed numeral systems inside one interface is the most common bilingual defect and the easiest to fix."}]},{"id":"a11y","label":"Accessibility","weight":10,"checks":[{"id":"A1","weight":4,"title":"Text contrast (WCAG AA)","description":"Every text run meets 4.5:1, or 3:1 where it qualifies as large text.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Occurrence-weighted share of text runs meeting their applicable threshold against their effective background.","blocker":true,"fix":"Government services carry a statutory accessibility obligation. Darken the text token or lighten the surface — the finding gives the measured ratio and the needed delta."},{"id":"A2","weight":2,"title":"Non-text contrast","description":"UI boundaries, icons and graphical affordances meet 3:1 against their surroundings.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of borders, icon fills and control boundaries meeting 3:1.","blocker":true,"fix":"An input whose border disappears against its background is not usable at low vision or in sunlight."},{"id":"A3","weight":2,"title":"Visible focus","description":"Every interactive element shows a visible focus indicator on keyboard focus.","applies_to":"site","method":"auto","scoring":"fraction","measure":"Share of focusable elements whose computed style changes visibly on :focus-visible, with an indicator meeting 3:1.","blocker":false,"fix":"Never remove the outline without replacing it. Keyboard-only users navigate the whole service through this one affordance."},{"id":"A4","weight":2,"title":"Target size","description":"Interactive targets are at least 24x24 CSS px (WCAG 2.2 AA), spacing exceptions allowed.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of interactive elements whose hit box meets the minimum, counting the spacing exception where neighbours are far enough apart.","blocker":false,"fix":"Grow the control or its padding. Icon-only buttons are the usual offenders."}]},{"id":"motion","label":"Motion","weight":4,"checks":[{"id":"M1","weight":2,"title":"Motion tokens","description":"Transition durations and easing curves come from the DGA motion tokens.","applies_to":"both","method":"auto","scoring":"fraction","measure":"Share of transition/animation declarations whose duration and timing function match motion tokens.","blocker":false,"fix":"Use the named duration and curve so motion feels the same across services."},{"id":"M2","weight":2,"title":"Reduced motion","description":"prefers-reduced-motion is honoured.","applies_to":"site","method":"auto","scoring":"binary","measure":"Pass if the stylesheet carries a prefers-reduced-motion rule and animation is actually suppressed under the emulated preference.","blocker":false,"fix":"Add a reduced-motion block that skips the motion rather than shortening it."}]}]};
  var TOKENS = {"synced":"2026-08-17","source":{"standard":"DGA Platforms Code","publisher":"SDGA / Digital Government Authority, Saudi Arabia","profile":"https://www.figma.com/@sdga","manifest":"See sources.json — 23 published files, 4 of them the system itself.","syncedFiles":[{"name":"Foundations - Platforms Code","id":"1392267405633663431","synced":"2026-08-17","pages":["FOUNDATIONS 2:2","Colors 2:3","Typography 2:4","Effect styles 2:5","Spacing, radius & grids 2:6"]},{"name":"Components Library - Platforms Code","id":"1392264328585493958","synced":"2026-08-17","pages":["Get Started 16026:49769","Buttons 1:1183","Inline Alert 1730:46041","Text input 954:19434","Card 8940:22264","UI Shell Nav Header 429:130167","Tags 12:539"]}],"precedence":"Foundations > Components Library > templates. Conflicts are listed in $notes, never averaged."},"color":{"light":{"Button/button-background-primary-default":"#1b8354","Button/button-background-primary-hovered":"#166a45","Button/button-background-primary-pressed":"#104631","Button/button-background-primary-selected":"#14573a","Button/button-background-primary-focused":"#1b8354","Text/text-primary":"#0d121c","Background/background-primary-50":"#f3fcf6","Background/background-primary-400":"#54c08a","Background/background-SA-Flag":"#074d31","Icon/background-brand-light":"#f3fcf6","Link/link-primary-hovered":"#54c08a","Link/link-primary-pressed":"#88d8ad","Text/text-default":"#161616","Text/text-display":"#1f2a37","Text/text-primary-paragraph":"#384250","Text/text-secondary-paragraph":"#6c737f","Text/text-oncolor-primary":"#ffffff","Text/text-success":"#067647","Text/text-warning":"#b54708","Text/text-error":"#b42318","Text/text-info":"#175cd3","Global/text-default-disabled":"#9da4ae","Global/text-default-oncolor-disabled":"#ffffff66","Global/input-text-disabled":"#9da4ae","Background/background-white":"#ffffff","Background/background-card":"#ffffff","Background/background-menu":"#ffffff","Background/background-notification-white":"#ffffff","Background/background-neutral-25":"#fcfcfd","Background/background-neutral-50":"#f9fafb","Background/background-neutral-200":"#e5e7eb","Background/background-neutral-400":"#9da4ae","Background/background-neutral-800":"#1f2a37","Global/background-disabled":"#e5e7eb","Global/background-inverse-disabled":"#f3f4f6","Background/background-success":"#079455","Background/background-success-25":"#f6fef9","Background/background-warning":"#dc6803","Background/background-warning-25":"#fffcf5","Background/background-warning-50":"#fffaeb","Background/background-error":"#d92d20","Background/background-error-25":"#fffbfa","Background/background-info":"#1570ef","Background/background-info-25":"#f5faff","Border/border-neutral-primary":"#d2d6db","Border/border-neutral-secondary":"#e5e7eb","Border/border-black":"#161616","Border/border-white":"#ffffff","Border/border-white-40":"#ffffff66","Border/border-secondary":"#e5e7eb","Border/border-success-light":"#abefc6","Border/border-warning-light":"#fedf89","Border/border-error-light":"#fecdca","Border/border-info-light":"#b2ddff","Border/border-disabled":"#d2d6db","Global/border-disabled":"#9da4ae","Button/button-background-neutral-default":"#f9fafb","Button/button-background-neutral-hovered":"#f3f4f6","Button/button-background-neutral-pressed":"#e5e7eb","Button/button-background-neutral-selected":"#e5e7eb","Button/button-background-neutral-focused":"#f3f4f6","Button/button-background-black-default":"#0d121c","Button/button-background-black-hovered":"#1f2a37","Button/button-background-black-pressed":"#4d5761","Button/button-background-black-selected":"#384250","Button/button-background-black-focused":"#0d121c","Button/button-background-oncolor-default":"#ffffff","Button/button-background-oncolor-hovered":"#ffffffcc","Button/button-background-oncolor-pressed":"#ffffff99","Button/button-background-oncolor-selected":"#ffffffb2","Button/button-background-oncolor-focused":"#ffffff","Button/button-background-transparent-hovered":"#ffffff33","Button/button-background-transparent-pressed":"#ffffff66","Button/button-background-transparent-selected":"#ffffff4d","Button/button-background-disabled-on-color":"#ffffff33","Button/button-label-transparent-hovered-on-color":"#54c08a","Button/button-label-transparent-pressed-on-color":"#88d8ad","Button/button-label-transparent-selected-on-color":"#54c08a","Button/button-background-danger-primary-default":"#d92d20","Button/button-background-danger-primary-hovered":"#b42318","Button/button-background-danger-primary-pressed":"#7a271a","Button/button-background-danger-primary-selected":"#912018","Button/button-background-danger-primary-focused":"#d92d20","Button/button-background-danger-secondary-default":"#fef3f2","Button/button-background-danger-secondary-hovered":"#fee4e2","Button/button-background-danger-secondary-pressed":"#fecdca","Button/button-background-danger-secondary-focused":"#fef3f2","Button/button-label-danger-primary-default-oncolor":"#fecdca","Button/button-label-danger-primary-hovered-oncolor":"#fda29b","Button/button-label-danger-primary-pressed-oncolor":"#f97066","Form/field-background-default":"#ffffff","Form/field-background-darker":"#f3f4f6","Form/field-background-lighter":"#fcfcfd","Form/field-background-pressed":"#f3f4f6","Form/field-border-default":"#9da4ae","Form/field-border-hovered":"#384250","Form/field-border-pressed":"#0d121c","Form/field-border-error":"#b42318","Form/field-text-label":"#161616","Form/field-text-placeholder":"#6c737f","Form/field-text-filled":"#161616","Form/field-text-focused":"#384250","Form/field-text-hovered":"#161616","Form/field-text-pressed":"#384250","Form/field-text-readonly":"#161616","Icon/icon-default":"#161616","Icon/icon-oncolor":"#ffffff","Icon/icon-warning":"#b54708","Icon/background-success-light":"#ecfdf3","Icon/background-warning-light":"#fffaeb","Icon/background-error-light":"#fef3f2","Icon/background-info-light":"#eff8ff","Global/icon-default-oncolor-disabled":"#ffffff66","Tag/tag-text-neutral":"#1f2a37","Tag/tag-background-neutral":"#4d5761","Tag/tag-background-neutral-light":"#f9fafb","Tag/tag-border-neutral":"#4d5761","Tag/tag-text-success":"#085d3a","Tag/tag-background-success":"#067647","Tag/tag-background-success-light":"#ecfdf3","Tag/tag-border-success":"#067647","Tag/tag-border-success-light":"#abefc6","Tag/tag-icon-success":"#085d3a","Tag/tag-text-warning":"#93370d","Tag/tag-background-warning":"#b54708","Tag/tag-background-warning-light":"#fffaeb","Tag/tag-border-warning":"#b54708","Tag/tag-border-warning-light":"#fedf89","Tag/tag-icon-warning":"#93370d","Tag/tag-text-error":"#912018","Tag/tag-background-error":"#d92d20","Tag/tag-background-error-light":"#fef3f2","Tag/tag-border-error":"#b42318","Tag/tag-border-error-light":"#fecdca","Tag/tag-icon-error":"#912018","Tag/tag-text-info":"#1849a9","Tag/tag-background-info":"#1570ef","Tag/tag-background-info-light":"#eff8ff","Tag/tag-border-info":"#175cd3","Tag/tag-border-info-light":"#b2ddff","Tag/tag-icon-info":"#1849a9","Tag/tag-background-on-color":"#ffffff33","Tag/tag-border-on-color":"#ffffff99","Tag/tag-dot":"#ffffff99","Alpha/alpha-white-100":"#ffffff","Alpha/alpha-white-10":"#ffffff1a","Alpha/alpha-black-10":"#0000001a","Colors/Base/white":"#ffffff","Colors/Neutral/25":"#fcfcfd","Colors/Neutral/100":"#f3f4f6","Colors/Neutral/300":"#d2d6db","Colors/Neutral/400":"#9da4ae","Colors/Neutral/950":"#0d121c","Colors/SA-Flag/600":"#1b8354","Colors/Foreground/fg-brand-primary (600)":"#1b8354","Colors/Background/bg-primary":"#ffffff","Colors/Background/bg-secondary":"#f9fafb","Colors/Background/bg-quaternary":"#eaecf0","Colors/Background/bg-brand-primary_alt":"#f3fcf6","Component colors/Utility/Gray/utility-gray-50":"#f9fafb","Component colors/Utility/Gray/utility-gray-200":"#eaecf0","Component colors/Utility/Gray/utility-gray-700":"#344054","Component colors/Components/Buttons/Secondary/button-secondary-bg":"#ffffff","Component colors/Components/Buttons/Secondary/button-secondary-border":"#d0d5dd","Text/text-secondary":"#384250","Text/text-tertiary":"#4d5761","Text/text-white":"#ffffff","Text 2/text-primary_on-color":"#ffffff","Text 2/text-secondary_on-color":"#ffffffb2","Text 2/text-tertiary_on-color":"#ffffff99","Text 2/text-tertiary":"#4d5761","Text 2/text-brand-primary":"#14573a","Text 2/text-brand-secondary":"#1b8354","Text 2/text-brand-tertiary":"#25935f","Text 2/text-warning-primary":"#b54708","Text 2/text-success-primary":"#067647","Text 2/text-info-primary":"#175cd3","Border/border-primary":"#d2d6db","Border 2/border-primary":"#d2d6db","Background/background-body":"#f9fafb","Background/background-neutral-100":"#f3f4f6","Background/background-info-50":"#eff8ff","Icon/icon-primary":"#1b8354","Icon/icon-success":"#067647","Table/table-cell-border":"#d2d6db","Table/table-text-head":"#384250","Table/table-background-header":"#f3f4f6"},"dark":{},"roles":{"brand":["Button/button-background-primary-default","Button/button-background-primary-hovered","Button/button-background-primary-pressed","Button/button-background-primary-selected","Text/text-primary","Background/background-primary-50","Background/background-primary-400","Background/background-SA-Flag"],"border":["Border/border-neutral-primary","Border/border-neutral-secondary","Border/border-black","Border/border-white","Border/border-white-40","Border/border-secondary","Border/border-success-light","Border/border-warning-light","Border/border-error-light","Border/border-info-light","Border/border-disabled","Global/border-disabled","Form/field-border-default","Form/field-border-hovered","Form/field-border-pressed","Form/field-border-error"],"semantic":{"success":["Background/background-success","Background/background-success-25","Text/text-success","Border/border-success-light","Icon/background-success-light"],"warning":["Background/background-warning","Background/background-warning-25","Background/background-warning-50","Text/text-warning","Border/border-warning-light","Icon/icon-warning","Icon/background-warning-light"],"error":["Background/background-error","Background/background-error-25","Text/text-error","Border/border-error-light","Icon/background-error-light","Button/button-background-danger-primary-default","Form/field-border-error"],"info":["Background/background-info","Background/background-info-25","Text/text-info","Border/border-info-light","Icon/background-info-light","Tag/tag-text-info","Tag/tag-background-info","Tag/tag-background-info-light","Tag/tag-border-info","Tag/tag-border-info-light","Tag/tag-icon-info"]}}},"typography":{"families":{"latin":["IBM Plex Sans Arabic"],"arabic":["IBM Plex Sans Arabic"]},"weights":[400,500,600,700],"ramp":[{"name":"Display xl","size":60,"lineHeight":72,"letterSpacing":-2,"weight":600,"script":"both"},{"name":"Display lg","size":48,"lineHeight":60,"letterSpacing":-2,"weight":600,"script":"both"},{"name":"Display sm","size":30,"lineHeight":38,"letterSpacing":0,"weight":700,"script":"both"},{"name":"Display xs","size":24,"lineHeight":32,"letterSpacing":0,"weight":600,"script":"both"},{"name":"Text xl","size":20,"lineHeight":30,"letterSpacing":0,"weight":600,"script":"both"},{"name":"Text lg","size":18,"lineHeight":28,"letterSpacing":0,"weight":700,"script":"both"},{"name":"Text md","size":16,"lineHeight":24,"letterSpacing":0,"weight":400,"script":"both"},{"name":"Text sm","size":14,"lineHeight":20,"letterSpacing":0,"weight":400,"script":"both"},{"name":"Text xs","size":12,"lineHeight":18,"letterSpacing":0,"weight":500,"script":"both"},{"name":"Text 2xs","size":10,"lineHeight":14,"letterSpacing":0,"weight":600,"script":"both"}]},"spacing":{"base":2,"scale":[0,2,4,6,8,12,16,20,24,32,40,48,64,80,96,128,160,192,224,256,320,384,480,640,720,768,1024,1280,1440,1600,1920],"rhythm":[24,32,40,48,64,80,96,128]},"radius":{"scale":[0,2,4,6,8,16,24],"pill":9999},"border":{"widths":[1,2]},"elevation":{"levels":{"Shadows/shadow-xs":"0 1px 2px 0 #1018280d","Shadows/shadow-sm":"0 1px 2px 0 #1018280d, 0 1px 3px 0 #1018280d","Shadows/shadow-md":"0 2px 4px -2px #1018280f, 0 4px 8px -2px #1018281a","Shadows/shadow-lg":"0 4px 6px -2px #10182808, 0 12px 16px -4px #10182814","Shadows/shadow-xl":"0 8px 8px -4px #10182808, 0 20px 24px -4px #10182814","Shadows/shadow-2xl":"0 24px 48px -12px #1018282e","Shadows/shadow-3xl":"0 32px 64px -12px #10182824"},"backdropBlur":{"backdrop-blur-sm":8,"backdrop-blur-md":16,"backdrop-blur-lg":24,"backdrop-blur-xl":40}},"breakpoints":{"list":[{"name":"mobile","min":0,"container":null,"gutter":16},{"name":"desktop","min":768,"container":1280,"gutter":32}],"widths":{"xxs":320,"xs":384,"sm":480,"md":560,"lg":640,"xl":768,"2xl":1024,"3xl":1280,"4xl":1440,"5xl":1600,"6xl":1920,"paragraph-max-width":720}},"icons":{"set":"DGA Platforms Code icon set","sizes":[],"strokeWidth":null,"deferred":true},"motion":{"durations":[],"easings":[]},"numerals":null};
  var COMPONENTS = {"synced":"2026-08-17","source":{"standard":"DGA Platforms Code","publisher":"SDGA / Digital Government Authority, Saudi Arabia","profile":"https://www.figma.com/@sdga","manifest":"See sources.json"},"components":[{"name":"Button","figmaNodeId":"1:1183","variants":["primary","neutral","black","oncolor","transparent","danger-primary","danger-secondary"],"sizes":[{"name":"lg","height":null,"paddingInline":16,"iconGap":4,"fontSize":16,"radius":4},{"name":"md","height":null,"paddingInline":12,"iconGap":4,"fontSize":14,"radius":4},{"name":"sm","height":null,"paddingInline":8,"iconGap":4,"fontSize":12,"radius":4}],"states":["default","hovered","pressed","selected","focused","disabled"],"anatomy":"Optional leading icon, label, optional trailing icon. Gap is 4 at every size — only the inline padding and type step change. Corner is radius-sm (4) throughout, not the size-dependent radius some systems use.","identifiers":{"roles":["button"],"tags":["button","a"],"classHints":[]}},{"name":"Text input","figmaNodeId":"954:19434","variants":["default","darker","lighter"],"sizes":[{"name":"default","height":null,"paddingInlineStart":8,"paddingInlineEnd":16,"iconGap":8,"labelGap":8,"fontSize":16,"radius":4}],"states":["default","hovered","pressed","focused","filled","readonly","error","disabled"],"anatomy":"Label above field with an 8 gap; field carries a 1px border (border colour changes per state), radius-sm (4). Placeholder uses text-secondary-paragraph, filled text uses text-default. Error state swaps the border to field-border-error.","identifiers":{"roles":["textbox"],"tags":["input","textarea"],"classHints":[]}},{"name":"Card","figmaNodeId":"8940:22264","variants":["default"],"sizes":[{"name":"lg","height":null,"gap":24,"fontSize":18,"radius":16}],"states":["default","disabled"],"anatomy":"background-card on radius-lg (16), internal gap 24, title at Text lg/Bold (18/28). Elevation is Shadows/shadow-md when raised.","identifiers":{"roles":["article","group"],"tags":["article","section","div"],"classHints":["card"]}},{"name":"Inline alert / Notification","figmaNodeId":"1730:46041","variants":["info","success","warning","error"],"sizes":[{"name":"default","height":null,"padding":16,"paddingInline":24,"gap":16,"radius":8}],"states":["default"],"anatomy":"Icon, then title at Text md/Semibold with body at Text sm/Regular separated by text-content-gap 8, then an optional button group with buttons-group-gap 8. Each variant pairs its background-<role>-25 surface with its border-<role>-light edge and text-<role> label — the three always move together.","identifiers":{"roles":["alert","status"],"tags":["div"],"classHints":["alert","notification","toast"]}},{"name":"Table","figmaNodeId":"2:5 (Foundations/Effect styles)","variants":["default"],"sizes":[{"name":"default","height":null,"cellPaddingInline":16,"cellPaddingBlock":8,"cellGap":8,"fontSize":14,"radius":8}],"states":["default","header"],"anatomy":"Header row on table-background-header #f3f4f6 with table-text-head #384250; cells separated by table-cell-border #d2d6db. Cell padding is 16 inline / 8 block with an 8 gap between cell contents.","identifiers":{"roles":["table"],"tags":["table"],"classHints":["table"]}}]};

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
  const MAX_SAMPLES = 3;
  const MAX_ELEMENTS = OPTS.maxElements || 6000;
  const MAX_FOCUS_PROBES = OPTS.maxFocusProbes || 40;
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
        if (el && e.samples.length < MAX_SAMPLES) e.samples.push(selectorFor(el));
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
        const fam = cs.fontFamily.toLowerCase();
        if (/arab|kufi|naskh|cairo|tajawal|almarai|ibm plex sans arabic|readex|noto/.test(fam)) arabicRunsInArabicFace++;
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
          /* A2 — non-text contrast of the boundary against what is behind it */
          const { color: behind, imageBehind } = effectiveBackground(el.parentElement || el);
          if (!imageBehind) {
            nonTextChecked++;
            const eff = c.a < 1 ? over(c, behind) : c;
            const r = Math.round(contrast(eff, behind) * 100) / 100;
            if (r >= 3.0) nonTextPassing++;
            else if (nonTextFindings.length < 40) {
              nonTextFindings.push({ selector: selectorFor(el), border: hex(eff), against: hex(behind), ratio: r, required: 3.0 });
            }
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
    if (cs.boxShadow && cs.boxShadow !== 'none') T.shadow.add(cs.boxShadow.slice(0, 120), el);

    /* spacing */
    for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft']) {
      const v = px(cs[p]);
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

    /* A4 — target size */
    if (el.matches && el.matches(INTERACTIVE)) {
      interactiveCount++;
      const w = rect.width;
      const h = rect.height;
      if (w >= MIN_TARGET && h >= MIN_TARGET) interactivePassingTarget++;
      else if (targetFindings.length < 40) {
        targetFindings.push({
          selector: selectorFor(el),
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
  };
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
          cssStats.physicalDecls++;
          if (cssStats.physicalSamples.length < 25) cssStats.physicalSamples.push({ selector: sel.slice(0, 100), property: p });
        }
      }
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      walkRules(sheet.cssRules, false);
    } catch (e) {
      cssStats.inaccessibleSheets++;
    }
  }

  /* --------------------------------------------------------- A3 focus ring */

  // Actually focus a sample of controls and diff the computed style. Reading the
  // stylesheet alone cannot tell a replaced indicator from a removed one.
  const focusProbe = { probed: 0, visible: 0, missing: [] };
  const prevActive = document.activeElement;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const probes = [...document.querySelectorAll(INTERACTIVE)].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !el.hasAttribute('disabled');
  });
  for (const el of probes.slice(0, MAX_FOCUS_PROBES)) {
    try {
      const before = getComputedStyle(el);
      const b = [before.outlineStyle, before.outlineWidth, before.outlineColor, before.boxShadow, before.borderColor, before.backgroundColor].join('|');
      el.focus({ preventScroll: true });
      const after = getComputedStyle(el);
      const a = [after.outlineStyle, after.outlineWidth, after.outlineColor, after.boxShadow, after.borderColor, after.backgroundColor].join('|');
      focusProbe.probed++;
      const changed = a !== b;
      const hasOutline = after.outlineStyle !== 'none' && parseFloat(after.outlineWidth) > 0;
      if (changed || hasOutline) focusProbe.visible++;
      else if (focusProbe.missing.length < 20) {
        focusProbe.missing.push({ selector: selectorFor(el), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) });
      }
      el.blur();
    } catch (e) {
      /* some controls refuse focus; not a finding */
    }
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
    colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    documentDark: /dark/.test(document.documentElement.className) || document.documentElement.getAttribute('data-theme') === 'dark',
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
    nonTextContrast: { checked: nonTextChecked, passing: nonTextPassing, findings: nonTextFindings },
    targets: { interactive: interactiveCount, passing: interactivePassingTarget, minTargetPx: MIN_TARGET, findings: targetFindings },
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

function score({ rubric, tokens, captures = [], judged = {}, options = {} }) {
  const {
    targetType = 'site',
    targetName = '(unnamed target)',
    targetUrl = null,
    na: naList = [],
    allowUnassessed = false,
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
    const nums = (s) => (String(s).match(/-?\d*\.?\d+/g) || []).map(Number);
    let matched = 0;
    const offenders = [];
    for (const r of rows) {
      const a = nums(r.value);
      const hit = tokenShadows.some(([, v]) => {
        const b = nums(v);
        if (a.length !== b.length) return false;
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

  const darkCaptures = captures.filter((c) => c.colorScheme === 'dark' || c.documentDark);
  const lightOnly = (c) => !(c.colorScheme === 'dark' || c.documentDark);
  const darkOnly = (c) => c.colorScheme === 'dark' || c.documentDark;

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
      auto.C4 = { ratio: null, na: true, reason: darkCaptures.length ? 'ledger has no dark token set' : 'target ships no dark theme' };
    }
  }

  /* typography */
  {
    const fams = mergedTally('fontFamily');
    const allowed = [...(tokens.typography?.families?.latin || []), ...(tokens.typography?.families?.arabic || [])];
    auto.T1 = setCoverage(fams, allowed, 'T1', 'Font family', (x) => String(x).toLowerCase().replace(/["']/g, '').trim());

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
      auto.S2 = { ratio: null, na: true, reason: targetType !== 'site' ? 'not measurable on a Figma frame' : 'ledger has no breakpoints' };
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
      auto.R1 = { ratio: null, na: true, reason: 'no Arabic content in the captures' };
      auto.R3 = { ratio: null, na: true, reason: 'no Arabic content in the captures' };
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
          found: `${css.physical} physical vs ${css.logical} logical`,
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
      auto.R2 = { ratio: null, na: true, reason: 'authored CSS does not exist on a Figma frame' };
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
        where: [f.selector],
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
      a.find.push(...(x.nonTextContrast?.findings || []));
      return a;
    }, { checked: 0, pass: 0, find: [] });
    auto.A2 = { ratio: n.checked ? n.pass / n.checked : null, matched: n.pass, total: n.checked };
    for (const f of n.find.sort((a, b) => a.ratio - b.ratio).slice(0, 8)) {
      finding('A2', 'blocker', `Boundary contrast ${f.ratio}:1 is below 3:1`, {
        found: `${f.border} against ${f.against} → ${f.ratio}:1`,
        expected: '3:1',
        where: [f.selector],
        fix: 'An input whose border disappears against its background is not usable at low vision or in sunlight.',
      });
    }

    if (targetType === 'site') {
      const f = captures.reduce((a, x) => {
        a.probed += x.focus?.probed || 0;
        a.visible += x.focus?.visible || 0;
        a.missing.push(...(x.focus?.missing || []));
        return a;
      }, { probed: 0, visible: 0, missing: [] });
      auto.A3 = { ratio: f.probed ? f.visible / f.probed : null, matched: f.visible, total: f.probed };
      if (f.missing.length) {
        // Count from probed-minus-visible, never from missing.length — the probe caps
        // its missing[] sample at 20 per capture, so that array understates the failure
        // on any page with more than 20 unfocusable controls.
        finding('A3', 'major', `${f.probed - f.visible} of ${f.probed} probed controls show no focus indicator`, {
          found: `${f.probed - f.visible} controls unchanged on focus`,
          expected: 'a visible indicator on every interactive element',
          where: f.missing.slice(0, 8).map((m) => m.selector),
          fix: 'Never remove the outline without replacing it. Keyboard-only users navigate the whole service through this one affordance.',
        });
      }
    } else {
      auto.A3 = { ratio: null, na: true, reason: 'focus state does not exist on a static frame' };
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
        where: [f.selector],
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
    auto.M1 = { ratio: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null, detail: { dCov, eCov } };

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
      auto.M2 = { ratio: null, na: true, reason: 'runtime preference does not apply to a static frame' };
    }
  }

  /* ------------------------------------------------------------ assemble */

  function meta(chk) {
    return { id: chk.id, title: chk.title, description: chk.description, weight: chk.weight, blocker: !!chk.blocker, method: chk.method, fix: chk.fix };
  }

  // A check is "met" for the X-of-N headline at this much compliance. Blockers are
  // held to 100%: one text run below 4.5:1 means the page does not conform, however
  // good the other ninety-nine are.
  const PASS_DEFAULT = rubric.passThreshold?.default ?? 0.9;
  const PASS_BLOCKER = rubric.passThreshold?.blocker ?? 1.0;

  const unassessed = [];
  const categories = [];
  let earnedTotal = 0, availableTotal = 0, checksPassed = 0, checksCounted = 0;
  const failedBlockers = [];

  for (const cat of rubric.categories) {
    const outChecks = [];
    let earned = 0, available = 0;
    for (const chk of cat.checks) {
      const applies = chk.applies_to === 'both' || chk.applies_to === targetType;
      const forcedNa = naList.includes(chk.id);
      const result = chk.method === 'auto' ? auto[chk.id] : judged[chk.id];

      if (!applies || forcedNa) {
        outChecks.push({ ...meta(chk), status: 'n/a', reason: forcedNa ? 'marked N/A for this audit' : `only applies to ${chk.applies_to} targets` });
        continue;
      }
      if (chk.method === 'judged' && (!result || typeof result.ratio !== 'number')) {
        unassessed.push(chk.id);
        outChecks.push({ ...meta(chk), status: 'unassessed' });
        continue;
      }
      if (!result || result.na || result.ratio == null) {
        outChecks.push({ ...meta(chk), status: 'n/a', reason: result?.reason || 'nothing of this kind present to measure' });
        continue;
      }

      const ratio = Math.max(0, Math.min(1, result.ratio));
      const pts = chk.scoring === 'binary' ? (ratio >= 1 ? chk.weight : 0) : chk.weight * ratio;
      earned += pts;
      available += chk.weight;
      checksCounted++;
      const passAt = chk.blocker ? PASS_BLOCKER : PASS_DEFAULT;
      const passed = chk.scoring === 'binary' ? ratio >= 1 : ratio >= passAt;
      if (passed) checksPassed++;
      else if (chk.blocker) failedBlockers.push({ id: chk.id, title: chk.title, ratio: round2(ratio) });

      outChecks.push({
        ...meta(chk),
        status: passed ? 'pass' : 'fail',
        ratio: round2(ratio),
        earned: round2(pts),
        available: chk.weight,
        measured: result.total != null ? { matched: result.matched, total: result.total } : undefined,
        notes: result.notes,
      });
    }
    earnedTotal += earned;
    availableTotal += available;
    categories.push({ id: cat.id, label: cat.label, weight: cat.weight, earned: round2(earned), available, checks: outChecks });
  }

  if (unassessed.length && !allowUnassessed) {
    throw new DgaError(
      'UNASSESSED_JUDGED',
      `${unassessed.length} judged check(s) were never assessed: ${unassessed.join(', ')}. ` +
        'Assess them and pass them in, or set allowUnassessed. Refusing by default, because ' +
        'silently dropping the component checks is how a rebuild scores as compliant.',
      { unassessed }
    );
  }

  const finalScore = availableTotal > 0 ? round2((earnedTotal / availableTotal) * 100) : 0;

  let band = rubric.bands.find((b) => finalScore >= b.min) || rubric.bands[rubric.bands.length - 1];
  const capIndex = rubric.bands.findIndex((b) => b.id === rubric.blockerCapBand);
  const bandIndex = rubric.bands.findIndex((b) => b.id === band.id);
  let cappedFrom = null;
  if (failedBlockers.length && bandIndex < capIndex) {
    cappedFrom = band.label;
    band = rubric.bands[capIndex];
  }

  const severityRank = { blocker: 0, major: 1, minor: 2 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || (b.occurrences || 0) - (a.occurrences || 0));

  return {
    schema: 'dga-score/1',
    standard: rubric.standard,
    target: {
      name: targetName,
      url: targetUrl,
      type: targetType,
      captures: captures.map((c) => ({ label: c.label, viewport: c.viewport, colorScheme: c.colorScheme, url: c.url })),
    },
    ledger: { synced: tokens.synced, source: tokens.source },
    scoredAt: new Date().toISOString(),
    score: finalScore,
    earned: round2(earnedTotal),
    available: availableTotal,
    checksPassed,
    checksCounted,
    checksTotal: rubric.categories.reduce((a, c) => a + c.checks.length, 0),
    band: { id: band.id, label: band.label },
    cappedFrom,
    failedBlockers,
    unassessed,
    categories,
    findings,
  };
}

/* ------------------------------------------------------------- inline out */

/** Compact markdown for a chat reply — the default result format. */
function inlineReport(v, { maxFindings = 3 } = {}) {
  const L = [];
  L.push(`**${v.target.name} — ${v.score}/100 · ${v.checksPassed} of ${v.checksCounted} checks met · ${v.band.label}**`);
  if (v.cappedFrom) {
    L.push(`> Capped from **${v.cappedFrom}** by ${v.failedBlockers.map((b) => `\`${b.id}\` ${b.title}`).join(', ')}. ` +
      `A service cannot be reported as compliant while failing these.`);
  }
  L.push('');
  L.push('| Category | Points |');
  L.push('| --- | --- |');
  for (const c of v.categories) {
    const graded = c.checks.filter((k) => k.status === 'pass' || k.status === 'fail');
    L.push(`| ${c.label} | ${graded.length ? `${c.earned}/${c.available}` : 'n/a'} |`);
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
      L.push(`${i + 1}. \`${f.checkId}\`${f.n > 1 ? ` ×${f.n}` : ''} ${f.summary}${worth} — ${f.fix}`);
    });
  }
  const na = v.categories.flatMap((c) => c.checks).filter((k) => k.status === 'n/a');
  if (na.length) L.push('', `_Not applicable: ${na.map((k) => k.id).join(', ')} — these leave the denominator rather than counting as failures._`);
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
          ${f.where?.length ? `<div><dt>Where</dt><dd class="where">${f.where.slice(0, 6).map((w) => `<code>${esc(w)}</code>`).join('')}</dd></div>` : ''}
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
      <span>Captures <b>${(S.target?.captures || []).length}</b></span>
    </div>
  </header>

  <section class="verdict">
    ${dial}
    <div>
      <p class="band tone-${bandTone}">${esc(S.band?.label || '—')}</p>
      <p class="tally">${S.checksPassed} of ${S.checksCounted} applicable checks met · ${S.earned} of ${S.available} points${S.checksTotal && S.checksCounted !== S.checksTotal ? ` · ${S.checksTotal - S.checksCounted} of ${S.checksTotal} not applicable to a ${esc(S.target?.type)} target` : ''}</p>
      ${capNote}
      ${unassessedNote}
    </div>
  </section>

  <section class="block">
    <h2>Where the points went</h2>
    <p class="lede">Nine categories, ${S.checksTotal} checks. Each category shows points earned against points available for this target — a check that cannot apply leaves the denominator rather than counting as a failure. Open a row for the individual checks.</p>
    <div class="scroll-x">${categoryRows}</div>
  </section>

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

    /** Probe this viewport, add it to the set, and score everything captured so far. */
    audit: function (opts) {
      opts = opts || {};
      var label = opts.label || ('capture-' + (api.captures.length + 1));
      var capture = probe({ label: label, minTargetPx: minTargetFor(window.innerWidth) });
      api.captures.push(capture);
      var verdict = score({
        rubric: RUBRIC, tokens: TOKENS, captures: api.captures,
        judged: opts.judged || {},
        options: {
          targetType: 'site',
          targetName: opts.targetName || document.title || location.hostname,
          targetUrl: opts.targetUrl || location.href,
          na: opts.na || [],
          allowUnassessed: !!opts.allowUnassessed,
        },
      });
      api.verdict = verdict;
      // Raw tallies stay in the page unless explicitly asked for: shipping them back
      // is 32KB per capture, which is the thing that made the old design unusable.
      if (opts.evidence) verdict.captures = api.captures;
      return verdict;
    },

    /** Compact markdown for a chat reply. */
    inline: function (v) { return inlineReport(v || api.verdict); },

    /** The full scorecard page as an HTML string. */
    html: function (v, o) { return renderScorecard(v || api.verdict, o || {}); },

    /** Render the scorecard over the page itself, for a human looking at the tab. */
    overlay: function (v) {
      var host = document.getElementById('__dga_overlay') || document.createElement('div');
      host.id = '__dga_overlay';
      host.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#f6f7f9');
      host.innerHTML =
        '<button onclick="this.parentNode.remove()" style="position:fixed;top:12px;right:16px;z-index:1;' +
        'font:600 13px system-ui;padding:6px 12px;border:1px solid #c6ccdb;border-radius:5px;background:#fff;cursor:pointer">Close</button>' +
        renderScorecard(v || api.verdict, {});
      document.body.appendChild(host);
      return 'overlay rendered';
    },

    reset: function () { api.captures = []; api.verdict = null; return 'cleared'; },
  };

  if (typeof window !== 'undefined') window.__dga = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
