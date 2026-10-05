---
name: nextjs-add-route
description: Add a Next.js App Router page or API route handler with loading/error states, validation and tests. Use when the user asks for a new page, screen or API endpoint in a Next.js app.
---

# Add Next.js Route

1. **Locate** the `app/` (or `src/app/`) directory and mirror existing route structure.
2. **Page** — create `app/<segment>/page.tsx` as a Server Component. Fetch data on the server through the existing API/data layer.
3. **States** — add `loading.tsx` and `error.tsx` (client component) when the page loads data.
4. **Client parts** — isolate interactivity in a small `'use client'` component.
5. **API route** — `app/api/<name>/route.ts`: validate input with a schema, call a service function, return consistent JSON errors and status codes.
6. **Metadata** — export `metadata` or `generateMetadata`.
7. **Test** — unit test the service/logic and any client component behaviour.
8. Finish with `definition-of-done`.
