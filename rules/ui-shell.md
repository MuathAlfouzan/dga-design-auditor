UI Shell Components Rules
Navigation Header (NavHeader)

Use the Navigation Header at the top of each page to guide users through the website structure.



Provide Navigation Links as interactive text elements for moving between pages/sections.



Include a Brand Logo to establish brand identity.



Provide Header Actions for user actions (e.g., “Sign up”, “Log in”).



Variants (Menu Item)

Use Selected to indicate the current page/section.



Use Unselected for non-current navigation options.



Support interaction states: Default, Hovered, Pressed, Focused, Disabled.



Variants (Header Action)

Use action layout variants as needed: Inline, Top, Text only, Icon Only.



Support interaction states for actions: Default, Hovered, Pressed, Focused, Disabled.



Variants (Header Sub-Menu Item)

Support sub-menu formats: Simple List, With Icon, With Helper Text, With Tag.



Support sub-menu interaction states: Default, Hovered, Pressed, Focused.



Accessibility

Apply ARIA roles where appropriate (e.g., role="banner" for the main header, role="navigation" for the navigation region).



Ensure all interactive elements are keyboard accessible (Tab to move, Enter/Space to activate).



Provide clear visible focus indicators for focused elements.



Offer a “Skip to Content” link at the beginning of the header.



Ensure sufficient contrast between text and background colors (WCAG contrast adherence).



Ensure controls like menu toggles and search have descriptive labels or aria-label.



Navigation Drawer (SidePanel)

Use a navigation drawer as a side panel to reveal navigation options (links to sections).

Structure drawer items as:

Parent (Link with Dropdown) for expandable groups (child links).

Link for single-level navigation targets.

Variants (Drawer Item)

Support interaction states: Default, Hovered, Pressed, Focused, Selected, Disabled.

Anatomy

Use List Items as individual selectable entries.

Use Expand/Collapse Arrows (chevrons) to indicate and control submenus:

Upward chevron indicates the submenu is collapsed and can be expanded.

Downward chevron indicates the submenu is expanded and can be collapsed.

Accessibility

Apply appropriate ARIA roles/properties (e.g., role="navigation", aria-expanded for collapsible sections).

Ensure full keyboard access (Tab/Enter and Arrow keys as applicable).

Manage focus for dynamic content:

When expanding a submenu, move focus to the first submenu item.

When collapsing, return focus to the parent item.

Provide a visible focus indicator.

Include “skip to content” links if the drawer is long.

Use sufficient color contrast for text and interactive elements.

Table of Contents (TOC)

Use a TOC to provide a navigable outline/summary of content so users can jump to sections quickly.

Use hierarchy visuals (lines/indentation) to represent nested structure.

Variants

Support Selected (active/current section) and Unselected states.

Support interaction states: Default, Hovered, Pressed, Focused.

Anatomy

Include a Title to indicate purpose.

Include a Current Page Indicator to show current page/section context.

Include Section Titles and Nested Section Titles as clickable navigation items.

Use Hierarchy Indicators (lines/indentation) to show structure.

Accessibility

Apply role="navigation" with a descriptive label (e.g., aria-label="Table of contents").

Use aria-current="page" for the currently active section.

Ensure TOC links are keyboard navigable (Tab) with a clear focus state.

Provide a distinct visible focus indicator.

Implement skip links to bypass the TOC.

Ensure sufficient contrast for default and interactive states.

When a TOC link is activated, update the page (including focus) and update the TOC to reflect the current active section.

Second Nav Header

Use the Second Nav Header as a secondary bar above primary navigation to provide contextual information and quick actions.

Support variants:

Primary (bold/dark green background).

Gray (light gray background).

Anatomy

Include Weather Icon and Status.

Display Date (with calendar icon).

Display Time.

Display Location (with location icon).

Provide Quick Action Icons on the right side for quick-access actions.

Accessibility

Apply aria-label="Second Navigation Header" to describe the region.

Add descriptive labels for elements (e.g., weather, time) for assistive technologies.

Ensure all interactive elements are keyboard accessible (Tab, Enter/Space).

Provide accessible text for icons (aria-label / aria-describedby).

Mark purely decorative icons as aria-hidden="true".

Ensure responsive behavior with accessible/legible layout on desktop and mobile, including appropriately sized touch targets.

For dynamically updating information (weather/time/location), use aria-live="polite".

Ensure focus moves logically between elements and returns appropriately after interactions.

Footer

Use the footer to provide navigation, links to important information, contact info, and (when applicable) social media and accessibility tools.

Support responsive layouts:

Width > 600px: multi-column layout.

Width < 600px: stack elements vertically.

Anatomy

Use Group Labels to categorize footer content.

Provide Footer Links under each group label.

Include Social Media Icons for social links (when applicable).

Include Accessibility Tools (buttons/links improving usability).

Include Legal Text (copyright and policy links).

Include Company Logo.

Accessibility

Identify the footer region with role="contentinfo".

Ensure all footer links are keyboard accessible.

Provide visible focus indicators for interactive elements.

Use clear, descriptive link text (link purpose in context).

Include a “skip to content” link at the top of the page to bypass repetitive navigation.

Maintain high contrast between text and background colors to meet or exceed WCAG standards.