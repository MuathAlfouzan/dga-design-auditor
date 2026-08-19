Color System Rules
Purpose & structure

Use color intentionally: every color usage must have a clear purpose (e.g., message/status users can identify).



Use a neutral base for surfaces so colored elements can stand out and draw attention.



Use the defined palette structure: Neutral + Primary + Semantic palettes.



Brand & semantic meaning

Primary brand color is Green (selected to reflect values associated with the Saudi flag; used as a key symbol for unified government platform identity).



Semantic colors must map to meaning consistently:

Red = danger / error



Yellow = caution / warning



Blue = information / clarity / trust



Green = success / positive outcomes



Secondary palettes exist (e.g., Gold, Lavender) and should be used as accents with their described intent (Gold for prestige; Lavender for softness/serenity).



Gradients

Gradients are supported to enable modern visuals and smooth transitions when appropriate.



Accessibility & contrast (must-haves)

Meet WCAG contrast requirements:

Small text (<24px): ≥ 4.5:1

Large text (≥24px): ≥ 3:1

UI components/graphics: ≥ 3:1



Use the system’s “12-grade” palette structure (Black, White, and 10 shades per hue) to maintain consistent contrast relationships.



Elevation Rules
When and why

Use elevation to represent depth/hierarchy via shadows/light and to direct focus to key content.



Use shadows strategically (direction, color, spread, blur define perceived depth).



Standard shadow tokens (use these names/values)

Use these Platforms Code shadow effects (some are multi-layer for smoother appearance).



Shadows-shadow-xs: x=0, y=1, blur=2, spread=0, color=101828 @ 5%



Shadows-shadow-sm (2-layer):

(0,0,1,0) color 101828 @10%

(0,1,2,0) color 101828 @6%



Shadows-shadow-md (2-layer):

(0,0,4,-2) color 101828 @10%

(0,2,8,-2) color 101828 @6%



Shadows-shadow-lg (2-layer):

(0,0,12,-6) color 101828 @8%

(0,4,16,-2) color 101828 @3%



Shadows-shadow-xl (2-layer):

(0,0,20,-4) color 101828 @8%

(0,8,24,-4) color 101828 @3%



Shadows-shadow-2xl: x=0, y=240, blur=48, spread=-12, color=101828 @18%



Shadows-shadow-3xl: x=0, y=32, blur=64, spread=-12, color=101828 @14%



Backdrop blur tokens

Backdrop-blur-sm: blur 8 (small size)



Backdrop-blur-sm: blur 16 (small size)



Backdrop-blur-lg: blur 24 (small size)



Backdrop-blur-lg: blur 40 (small size)



Use backdrop blur cautiously to avoid harming readability/usability.



Do / Avoid

Do apply subtle elevation (light shadows, slight height) to create depth without clutter.



Avoid excessive elevation (too many shadows / exaggerated heights).



Accessibility

Keep text/important graphics at ≥ 4.5:1 contrast even when elevated.



Add borders/outlines when depth cues may not be perceivable.



For hover/focus elevation, also differentiate state by other means (e.g., color/underline).



Iconography Rules
What icon set to use

Use the Hugeicons set (kept consistent and continuously updated; available across design/dev formats including React).



Icon types/containers in the system

System icons are foundational and used across icon types.



Icon/container types include: Main Icon, Item icons, Featured icons, Feedback response icons, Rating star icons, Social media logo icons, National flags icons, Integration tools icons, Payment method icons, Help icon.



Standard sizes (use these sizing rules)

Extra Small: 10 / 14 / 16px (very tight spaces; e.g., small buttons/badges).



Small: 18 / 20px (small spaces; e.g., badges).



Medium: 24px (standard for most UI components).



Large: 28 / 32px (use sparingly for emphasis; ensure balance/accuracy).



Select size based on context and surrounding elements for visual harmony.



Do / Avoid

Do use icons cautiously according to their function and purpose.



Avoid icons that do not match their meaning/purpose.



Accessibility requirements (for implementation)

Functional icons must have text alternatives via alt or ARIA labels (aria-label / aria-labelledby).



Decorative icons must be hidden from assistive tech (aria-hidden="true" or alt="").



SVG icons: include role="img" and accessible naming.



Interactive icons must have adequate target size: at least 44x44px.



Provide adequate spacing around interactive icons (buttons/links).



Layout and Spacing Rules
Grid fundamentals

Use a grid system with columns, margins, and gutters to ensure structure/consistency/adaptability.



Column grids are commonly used; desktop often uses 12 columns, reducing to 2–4 columns on smaller sizes.



Definitions:

Columns = vertical divisions



Margins = space between outer edges and content



Gutters = space between columns



Spacing scale (use these tokens; 16px base)

spacing-none = 0rem (0px)



spacing-xxs = 0.125rem (2px)



spacing-xs = 0.25rem (4px)



spacing-sm = 0.375rem (6px)



spacing-md = 0.5rem (8px)



spacing-lg = 0.75rem (12px)



spacing-xl = 1rem (16px)



spacing-2xl = 1.25rem (20px)



spacing-3xl = 1.5rem (24px)



spacing-4xl = 2rem (32px)



spacing-5xl = 2.5rem (40px)



spacing-6xl = 3rem (48px)



spacing-7xl = 5rem (64px)



spacing-8xl = 6rem (80px)



spacing-9xl = 7rem (96px)



spacing-10xl = 8rem (128px)



spacing-11xl = 11rem (160px)



Container rules

container-padding-mobile = 1rem (16px)



container-padding-desktop = 2rem (32px)



container-max-width-desktop = 80rem (1280px)



paragraph-max-width = 20rem (720px)



Breakpoints (use these ranges)

Small / Mobile: 0–599 (breakpoint 600)



Medium / Tablet: 600–959 (breakpoint 960)



Large / Desktop: 960–1279 (breakpoint 1280)



X Large / Desktop: 1280+



Accessibility layout rules (implementation)

Keep logical reading order aligned with visual order.



Use spacing/borders to group related items; fieldsets/ARIA grouping where relevant.



Ensure adequate spacing between interactive targets; minimum 44x44px target size guidance.



Use whitespace to reduce cognitive load and improve readability.



Ensure text contrast is ≥ 4.5:1 against background.



Use adequate line spacing; WCAG suggests line height ≥ 1.5× font size for body text.



Typography Rules
Font family & usage

Use IBM Plex Sans.



Use Display styles for headings (large sizes), and Text styles for most UI copy (body, labels, smaller UI text).



Font weights (allowed set)

Use weights from: Regular, Medium, Semibold, Bold.



Type scale (use these sizes/line-heights)

Display

Display 2xl: 72px, line-height 90px, tracking -2%



Display xl: 60px, line-height 72px, tracking -2%



Display lg: 48px, line-height 60px, tracking -2%



Display md: 36px, line-height 44px, tracking -2%



Display sm: 30px, line-height 38px



Display xs: 24px, line-height 32px



Text

Text xl: 20px, line-height 30px



Text lg: 18px, line-height 28px



Text md: 16px, line-height 24px



Text small: 14px, line-height 20px



Text xs: 12px, line-height 18px



Text 2xs: 10px, line-height 14px



Do / Avoid

Do set appropriate line height to avoid crowding and maintain comfortable reading.



Avoid excessively long/short line lengths; aim for optimal readability.



Do prioritize readable body sizes.



Avoid excessively small font sizes, especially for body text.



Avoid inconsistent spacing (margins/padding/line heights).



Text color accessibility guidance

Aim to comply with WCAG 2.1 AA.



Suggested text colors on light backgrounds (<= 400 backgrounds): Gray 500/600/700/950; on dark backgrounds (>= 500 backgrounds): use white text.



Contrast ratios (WCAG 2.1):

AA: 4.5:1

AA (large text): 3:1

AAA: 7:1

AAA (large text): 4.5:1
