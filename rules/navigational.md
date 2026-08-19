Navigational Components Rules
Breadcrumbs

Support seven item states: enabled, hover, active, focus, visited, disabled, and read-only.



Allow wrapping when a breadcrumb exceeds the content width.



Apply trail truncation by default: show up to five breadcrumb items; if more, show only the first and last items with an ellipsis; clicking the ellipsis expands the trail to show all items.



For Large breakpoints (L to 5XL): use the full breadcrumb trail until it exceeds available space, then truncate; clicking the ellipsis reveals the full breadcrumb.



For Medium breakpoints: automatically use a truncated breadcrumb version to fit smaller grids.



For Small and Extra Small (Mobile): display only a link to the previous page and a back arrow.



Implement breadcrumbs as a list of links (semantic structure) and use a navigation wrapper with aria-label (e.g., “Breadcrumb”).



Use aria-current="page" to indicate the current page in the breadcrumb trail.



Ensure all breadcrumb links have discernible text and are focusable.



Ensure all breadcrumb links are navigable using the Tab key.



Provide visual feedback for focus, hover, and active states.



Use visual separators between breadcrumb items; if a custom icon is used as a separator, set aria-hidden="true" (decorative).



Slide-out Menu

Use the White Background variant when a clean/minimal look is preferred or when the menu appears over darker backgrounds.



Use the Gray Background variant when the menu needs to blend subtly or when it appears over lighter backgrounds.



Include these anatomy elements: Header, Grouped Content Sections, Divider, Scroll Bar (when content exceeds visible area), Border, and Actions (bottom buttons).



Assign role="menu" to the slide-out menu.



Assign role="menuitem" to each interactive item within the menu.



Use aria-label on buttons/icons (e.g., close button: aria-label="Close menu").



Ensure full keyboard accessibility: all interactive elements must be focusable and operable via keyboard.



Provide a visible focus indicator on all elements.



Use a focus trap to keep keyboard navigation within the slide-out menu while it is open.



Set aria-hidden="true" for decorative icons that don’t add essential information.



Use aria-label or aria-labelledby for buttons/links to provide descriptive labels for screen readers.



Allow users to close the menu with the Esc key (in addition to a close button).



Ensure responsive design: adapt to different screen sizes/orientations; ensure font sizes, spacing, and interactive elements scale appropriately.



Menu

Use a menu as a temporary surface that shows a list of options, triggered by user interaction with buttons/controls; organize items (often grouped) to enhance navigation and functionality.



Support menu item states: Default, Hovered, Pressed, Focused, Disabled.



Support trailing elements per menu item (data or interaction): Text, Button, Tag, Switch, Icon, None.



Include these anatomy elements: Group label, Item, Item lead icon, Item trailing element, Divider, Container.



Pagination

Use pagination to divide large sets of content into multiple pages for sequential navigation.



Support pagination states: Default, Hovered, Current Page, Focused.



Include these anatomy elements: Previous Navigation, Active Page, Page Items, Next Navigation.



Encapsulate pagination links within a <ul> or <ol>, with each page link wrapped in an <li>.



Use aria-label="Pagination" on the navigation element.



Use aria-current="page" to indicate the active page.



Use <a href> for links that lead to other pages.



If pagination is dynamic (e.g., via AJAX), use <button> elements and manage content updates accessibly.



Ensure focus can move between pagination links using the Tab key, and activation using the Enter key.



If the pagination has many pages, support additional keyboard shortcuts (e.g., arrow keys to move between pages).



Tabs

Use tabs (tablist) to navigate between related information categories without switching pages.



Allow tablists to be configured for horizontal or vertical display.



In a horizontal tablist: tabs are confined by container width and do not scroll or wrap; if more tabs are needed, incorporate an overflow menu button.



Support tab states: Default, Hovered, Pressed, Focused, Disabled.



Include these anatomy elements: Container, Tab title, Icon, Selection indicator.



Include additional anatomy elements: More button (ellipsis), Divider.



Support keyboard navigation: Arrow keys to navigate between tabs; Home/End to jump to first/last tab; Tab key to navigate into/out of the tab list.



Use ARIA roles: role="tablist", role="tab", role="tabpanel".



Implement ARIA attributes: aria-controls, aria-selected, aria-labelledby, and manage focus with tabindex.



Ensure visual design includes visible focus indicators and high contrast for readability and active tab distinction.