---
description: Frontend UI standards — component design, state, data fetching, accessibility, performance
globs: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.css", "**/*.scss"]
alwaysApply: false
---

# Frontend UI

## Components
- One component per file; small and focused. Split when a component handles more than one concern.
- Separate presentational components (props in, events out) from data/containers.
- Props are typed and minimal; avoid passing whole objects when two fields are needed.
- Reuse the existing design system/components before creating new ones.

## State & data
- Keep state as local as possible; lift it only when shared. Derive values instead of duplicating state.
- Fetch data through one API layer (typed client), not inline `fetch` calls scattered in components.
- Handle loading, empty and error states explicitly for every async view.
- Never put secrets in frontend code or public env vars.

## Accessibility (required)
- Semantic HTML first (`button`, `nav`, `label`), ARIA only when needed.
- Every interactive element is keyboard reachable with a visible focus state.
- Images have `alt`; form inputs have labels; colour contrast meets WCAG AA.

## Performance
- Lazy-load routes and heavy components; optimise images; avoid unnecessary re-renders.

## Design
- Use the **ui-ux-pro-max** skill for visual/UX decisions when it is installed; follow existing design tokens.
