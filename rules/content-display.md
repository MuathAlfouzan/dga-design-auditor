Content Display Components Rules
Accordion Rules

Use the Accordion to collapse and expand content to organize it efficiently and reduce clutter.


Use the Accordion for progressive disclosure: show key details first and allow users to expand for full content.


Support the defined interaction states: Default, Hovered, Pressed, Focused, Disabled.


Keep the Accordion anatomy consistent:

Accordion title is the control that reveals the panel.

Expand/Collapse icon indicates open/closed state.

Panel contains the associated content.



Implement required accessibility for Accordion:

Apply role="button" to each accordion header.



Use aria-expanded="true|false" to reflect the open/closed state.



Use aria-controls to link header to its panel.



Use aria-disabled when a header is not interactive.



Ensure full keyboard support: users can Tab to headers and use Enter/Space to expand/collapse.



Ensure focus indicators are clear and distinct.



Ensure sufficient color contrast for text and interactive elements per WCAG expectations.



Card Rules

Use a Card as a container for information and actions related to a concept/object, typically combining images, text, and interactive elements.



Use Cards to enhance information visibility and provide predictable layout patterns.



Use the supported Card variants: Default, Expandable, Selectable.



For Selectable and Expandable cards, support states: Default, Hovered, Focused, Disabled.



Maintain Card anatomy as applicable to the variant:

Default card may include: Image, Featured Icon, Card Title, Description, Custom component (e.g., Avatar), Tags, Rating, Actions, Container.



Expandable card includes: Featured Icon, Card Title, Description, Expand/Collapse icon, Container.



Selectable card includes: Featured Icon, Card Title, Description, Checkbox, Container.



Digital Stamp Rules

Use the Digital Stamp to confirm site authenticity and integrity and reinforce user trust in official government/affiliated sources.



Support the Digital Stamp variants:

Closed: default compact view for quick assurance.

Opened: expanded view triggered by clicking “How you know?” for detailed verification.



Display authenticity indicators as part of the component’s purpose and content:

domain type/extension confirmation (e.g., .gov.sa, .edu.sa, .med.sa, .org.sa, .sch.sa, .sa)

HTTPS/security confirmation

Digital Government Authority registration/verification details



Follow the documented extension meaning for stamp context:

.gov.sa ministries/authorities/public institutions/national centers and equivalents

.edu.sa educational/training institutions providing direct services

.org.sa non-profit entities and affiliated activities

.sch.sa public secondary education and below

.med.sa government health entities/hospitals under government agencies

.sa government activities/initiatives/programs



Maintain Digital Stamp anatomy:

Government website indicator label

“How You Know?” link to expand details

Domain verification icon/message

Security confirmation icon/message

DGA registration and linked license/registration number



Implement required accessibility for Digital Stamp:

Use role="status" for status information.



Use aria-label or aria-describedby for non-text elements like icons.



Ensure keyboard accessibility for interactive elements (e.g., “How you know?” expand).



Provide a visible focus indicator on all focusable elements.



Mark decorative icons with aria-hidden="true".



Ensure responsive readability across devices.