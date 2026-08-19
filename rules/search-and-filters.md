Search Box rules
Variants

Support these states: Default, Hovered, Pressed, Focused, Read-Only, Disabled.

Anatomy

Include an Input Field where users type the query.

Use Placeholder Text (e.g., “Search”) that disappears when the user starts typing.

Include a Search Icon as a visual cue for search.

Provide a Clear Button to quickly remove entered text.

If voice search is supported, include a Voice Search (microphone) Icon.

Accessibility (required behaviors)

Use role="search" to define the search region (especially when the search box is part of a larger interface).

Ensure the search box has a clear accessible label using aria-label or aria-labelledby (e.g., aria-label="Search for products").

Use aria-placeholder when the placeholder text is essential for context (e.g., “Search by name or ID”).

Ensure full keyboard access:

Focus with Tab and type without needing a mouse.

Support Esc to clear text (where applicable).

Support Enter to submit the search.

Provide a visible focus indicator when focused.

Keep placeholder text descriptive (and ensure it disappears once typing begins).

For icons:

If decorative, use aria-hidden.

If interactive (e.g., clear button, microphone), use aria-label (e.g., aria-label="Clear search").

Ensure responsive usability:

Usable on all screen sizes, including mobile.

Ensure interactive elements (clear/voice buttons) have sufficiently large hit areas.

Filter Tags rules (used for applied filters / chips)
What tags are for

Use tags to visually convey important information or actions using brief text, color, and icons.



Variants and styles

Support two variants: Standard Tag and Status Tags.



Support these five styles: Outline, Neutral, Inverted, Subtle, Ghost.



Anatomy

Include: Container, Text, and a Leading or Trailing Icon (when applicable).



For status tags, include: Container, Text, and a Status Indicator.



Do / Avoid usage rules

Do group related statuses into cohesive tag clusters aligned with specific functionalities.



Avoid mixing unrelated statuses in the same cluster.



Do use words that describe a state/status.



Avoid labels that will truncate.



Do allow tags to hug their labels.



Avoid stretching tag containers.



Accessibility rules

Use appropriate HTML elements:

Non-interactive tags can be <span>.



Interactive tags should be <button> to provide keyboard accessibility and correct semantics.



Use aria-label for interactive elements when visible text is insufficient (e.g., close icon).



Ensure interactive tags can receive focus and have logical focus order.



Ensure keyboard operation (Enter/Space).



If tags are in a collection, provide arrow-key navigation.



Provide visual feedback for focus/hover/active states.



Ensure adequate size/spacing and sufficient contrast for readability.



If tags can be removed, consider confirmation or undo for accidental removals.



Announce tag add/remove changes via ARIA live regions.



Filtration (Filters) rules
What filtration is for

Use filtration to refine content by selecting criteria (categories/attributes), narrowing results to help users find relevant information quickly.



Variants

Support these states:

Closed (default overview, minimal space).



Opened (expanded options for precise filtering).



Results (after apply: show selected filters as chips and indicate active criteria).



Anatomy (capabilities to support)

Provide a Filter Button Menu that opens/closes the panel and shows icon, label, and active filter count.



Show Applied Filter Results as tags with an “X” to remove.



For large multi-select lists:

Show a search bar at the top once a threshold is exceeded.

Default to a limited number of options (e.g., 5–10) and provide Show more to expand.



Support input types and layout elements as described:

Checkboxes, Divider, Scroll Bar, Single Select, Radio Button, Multi-Select Chips, Range Slider, Input Range, Date Picker, Rating Filter, Swap Placeholder, and Action area holding Apply and Clear.



Accessibility rules

ARIA

Apply role="listbox" or role="menu" to the filtration options container; each option should use appropriate roles (e.g., option/checkbox/radio).



Use aria-expanded="true/false" on the Filter Button Menu to indicate expanded/collapsed state.



Use aria-live="polite" where results update dynamically.



Ensure clear labels via aria-label or aria-labelledby for controls (e.g., “Apply Filters,” “Clear Filters,” filter categories).



Screen reader context

Use aria-label / aria-describedby to clarify each filter type (e.g., “Price range slider”, “Color multi-select options”).



Announce selection changes (e.g., “Price range filter set to $10 - $100”); use aria-live="assertive" when immediate feedback is crucial.



When filters are hidden/removed (Show more/less), exclude them from the accessibility tree using aria-hidden="true".



Keyboard navigation

Ensure logical tab order from the Filter Button Menu through options to “Apply” and “Clear”; use tabindex to manage focus for expandable content.



Support keyboard interactions across all inputs (checkbox, radio, slider, etc.), including arrow keys for sliders and Enter/Space for selection.



Provide clear visual focus indicators on each option and action button.



Visual feedback

Ensure selected filters are visually distinct (e.g., high-contrast colors or checkmarks).



If results update dynamically, consider a loading indicator (e.g., spinner with role="status").



Motion

For expand/collapse animations, support reduced motion (via prefers-reduced-motion) and keep transitions subtle and minimal.



Responsive

Adapt filtration for mobile (drop-downs/collapsible menus) and increase touch target size.



For large option sets, use scrollable containers with keyboard and swipe support.
