1) Buttons

Use buttons to trigger specific actions; the label must describe the action that will occur when clicked.

Use the appropriate button type: Standard, Destructive, Menu, Icon, and Close buttons (close buttons dismiss dialogs/exit functions).

Use emphasis levels correctly: buttons convey high / medium / low emphasis; reserve high-emphasis for critical CTAs / primary actions, and use lower emphasis for less critical functions.

States
Support these button states: default, hovered, pressed, selected (toggle scenarios), focused, disabled.


Icons
Icons may be leading (before label) or trailing (after label).



Use leading icons when you want the icon to draw attention first; use trailing icons to complement the label when emphasis is on the text.



Anatomy
Button anatomy consists of: container, button label, and leading or trailing icon.



Do / Don’t (layout & usage)
DO group related actions into cohesive button clusters.

DON’T scatter related actions randomly across the interface.

DO place primary actions prominently (e.g., bottom of forms or central locations).

DON’T hide critical buttons or bury them in menus.

DO maintain consistent button placement across screens/components.

DON’T change button placement inconsistently across screens.

DO use whitespace around buttons to prevent crowding and accidental clicks.

DON’T overcrowd the UI with too many buttons or place them too close together.

DO adhere to the established button anatomy to maintain uniformity.

DON’T deviate from the established button anatomy.

Accessibility

Always use the <button> element for buttons (supports focus and disabled natively).

Do not use non-semantic elements like <div> for actions; if using <a>, it must perform navigation and have a valid href.

Provide visual feedback for hover, focus, active states.

Ensure contrast for text/icons against the background is at least 4.5:1 (WCAG AA).

Ensure minimum touch target size of 44×44 px.

Use aria-label when a button does not contain descriptive text (especially icon buttons).

Ensure buttons can receive focus; if using non-button elements (to be avoided), set tabindex="0".



2) Floating Button

Use a Floating Button as a circular button that floats above the UI to represent the primary/most important action on a screen.

States

Support: default, hovered, pressed, focused, disabled.

Anatomy

Container, Icon, and optional Label.

Accessibility

Apply aria-label="Floating Action Button", and use descriptive labels (e.g., aria-label="Create new item") especially for icon-only floating buttons.

Ensure full keyboard access: focus via Tab; activation via Enter or Space.

Ensure sufficient contrast and visibility between the button and surrounding UI.

If icon-only, ensure the icon has an accessible label (e.g., via aria-label) / screen reader support.

Ensure a large enough touch target and that activation requires minimal effort on touchscreens/assistive devices.

Place it so it does not obstruct important content or block access to other elements.

Ensure responsive behavior across screen sizes, preserving touch target and visibility.

3) Dropdown

Use Dropdowns to present a list of options where a user can select one option or several.

Variants

Default, Filled Lighter, Filled Darker.

Helper / Error

Support helper text and an error helper text state that provides clear feedback.

Anatomy

Label, Option, Dropdown list item (open list of options).

Accessibility

Use ARIA roles/attributes:

role="listbox" on the list container

role="option" on each option

aria-haspopup="listbox" on the trigger

aria-expanded on the trigger (true/false)

aria-selected on the selected option

aria-labelledby or aria-label for the accessible name

Keyboard navigation:

Tab moves focus into/out of the dropdown

Arrow keys open and navigate options

Enter/Space selects and closes

Esc closes without changing selection

Focus management: on open, move focus to the selected option (or first option).

Provide clear visual focus indicators (e.g., border highlight).

Indicate errors using both color and text (e.g., “Invalid selection”, “Required field”).

4) Link

Use links for navigation to another location (site/resource/section).

States

Default, hovered, pressed, focused, visited, disabled.

Anatomy

Link text and optional icon.

Accessibility

Ensure links are focusable via Tab and activatable via Enter.

If a link triggers an action (button-like), ensure it also responds to Space.

Use descriptive link text; avoid vague “click here” / “go to”.

If link text is generic (e.g., “read more”), use the title attribute for context.

If link text is insufficient, use aria-label to clarify destination/action.

Underline links by default (don’t rely on color alone).

Ensure sufficient color contrast; WCAG recommends at least 4.5:1 for text.

For external links opening in a new tab, include rel="noopener noreferrer".

Clearly indicate when a link opens in a new tab (including for screen readers via visually hidden text).

5) Chip

Use chips as small interactive elements to display information, trigger actions, or allow selections.

States

Default, hovered, pressed, selected, focused, disabled.

Anatomy

Container, Text, optional leading icon, optional trailing icon.

Accessibility

Use appropriate ARIA roles (e.g., role="button" for dismissible chips).

Use aria-label / aria-describedby when chips include non-text elements (icons).

For dismissible chips, use an accessible label like aria-label="Dismiss [chip name]".

Provide clear visible focus indicators when focused/selected.

Ensure keyboard navigation: focus chip via keyboard; if dismissible, allow focus on dismiss button via Tab; activate/select via Enter or Space.

Ensure text is legible with sufficient contrast; avoid very small text.

Icons must have appropriate accessibility handling (aria-label or aria-hidden depending on whether informative or decorative).

Avoid overuse to prevent clutter and cognitive overload.