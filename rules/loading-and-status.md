Loading and Status components rules
Loading (Spinner)

Use the Loading component to indicate that a process is ongoing and the user should wait for it to complete.



Use one of the available Loading sizes depending on the space and prominence needed: XX-Small, X-Small, Small, Medium, Large, X-Large, XX-Large.



Implement Loading using the Spinner component (example shown: size="md" and style="brand").



Progress Bar

Use a Progress Bar to visually represent the progress of a task/process (e.g., file download, data processing, form submission).



Use one of the two Progress Bar variants:

Linear Progress Bar: a horizontal bar showing how much of a task is complete (e.g., 50%, 70%).



Circular Progress Bar: a circular visual element representing progress as a circle.



Radial Stepper

Use the Radial Stepper as a circular progress indicator for multi-step processes so users can track progress through steps.



Use one of the two Radial Stepper variants:

Primary: uses the brand’s main color and stands out in the interface.



Neutral: uses a subdued neutral color and blends with other UI elements without demanding attention.



Skeleton

Use Skeleton to display a placeholder version of content while data is loading (to avoid leaving the screen blank and improve perceived load time).



Use one of the four Skeleton variants:

Skeleton Circle (24px–240px) for profile pictures/icons/logos.



Skeleton Square (24px–240px) for compact visuals like images/buttons/product cards.



Skeleton Rectangle for primary content blocks (multiple sizes; short/long widths).



Skeleton Line for text-like placeholders (stacked lines; multiple sizes).



Match Skeleton anatomy to the intended layout: Square, Rectangle, Line, Circle, and use an Animated Gradient to indicate loading subtly.



Skeleton accessibility rules

Use role="status" or role="alert" on the Skeleton parent container to communicate loading status to screen readers.



Use aria-live="polite" when you want screen readers to announce updates only after finishing other announcements.



Provide context with aria-label or aria-describedby (e.g., “Content loading, please wait.”).



When loading completes, remove the Skeleton from the accessibility tree (e.g., aria-hidden="true" or remove elements dynamically).



Prevent keyboard focus on Skeleton elements (e.g., tabindex="-1").



Set aria-hidden="true" on purely decorative Skeleton elements (especially icon-like shapes).



Minimize animations (keep them subtle) and use prefers-reduced-motion to disable animations for users who request reduced motion; provide an option to pause/disable animations if used.



Ensure Skeletons are responsive across screen sizes; use subtle but visible high-contrast colors so they remain discernible across environments/screens.