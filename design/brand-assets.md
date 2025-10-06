# Component Guidelines

Use these rules to keep the UI cohesive across pages and future features.

## Buttons
- **Sizes:** M (40px), L (48px). Padding 16px horizontal.
- **Primary button:** Primary 600 background, white text, 16px radius, shadow: none; hover to Primary 700.
- **Secondary button:** White bg, border Grey 200, text Grey 900; hover bg Grey 50.
- **Focus:** 2px focus ring using `focus.ring` token.
- **Icons:** optional, 16–20px left of label.

## Inputs (text, number, math)
- Height 44px, 12px radius, 1px border Grey 200, inner padding 12px.
- Placeholder: Grey 400. Helper text: 0.875rem Grey 600.
- Error state: border Error, helper text in Error.
- **Math input:** same metrics; ensure clear focus outline and an always-visible keyboard icon on touch devices.

## Cards
- Padding: 16–24px, radius 16px, shadow `shadow.card`, background white.
- Title H3, body text normal. Use muted text for hints.

## Alerts / Feedback
- **Success:** green left bar 4px; neutral white background; concise message.
- **Error:** red left bar 4px; include next-step guidance.

## Page layout
- Max width 1200px with 16–24px side padding.
- Section spacing: 40–64px between major blocks.
- Breadcrumbs above H1 when relevant.

## Tables (results/dashboards)
- Row height 48px; zebra stripes using Grey 50.
- Header: semibold; 12px radius on outer table corners.
- Numeric columns right-aligned.

## Accessibility
- Ensure tab order is logical. Provide visible labels (not placeholders) for inputs.
- Provide aria-labels for icon-only buttons.

## Microcopy
- Button labels: action-first ("Check", "Assign", "Save").
- Empty states: explain purpose + primary action (max 2 lines).
