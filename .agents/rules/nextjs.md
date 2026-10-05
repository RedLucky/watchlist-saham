---
description: Next.js App Router — server vs client components, data fetching, route handlers, env vars
globs: ["app/**", "src/app/**", "components/**", "src/components/**", "next.config.*"]
alwaysApply: false
---

# Next.js (App Router)

- **Read the version-matched docs first**: `node_modules/next/dist/docs/` (see the managed block at the top of AGENTS.md). APIs change between majors; heed deprecation notices.
- Keep the `<!-- BEGIN:nextjs-agent-rules -->` block in AGENTS.md; `next dev` re-adds it when missing.
- Do not start a second dev server; reuse the running one (`.next/dev/lock`) and its MCP endpoint `/_next/mcp` for compile errors.

- Components are **Server Components by default**. Add `'use client'` only for state, effects, event handlers or browser APIs — and push it to the smallest leaf component.
- Fetch data in Server Components or server actions; never expose secrets to client components.
- Only `NEXT_PUBLIC_*` env vars reach the browser — never put secrets there.
- Route files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`. Provide `loading`/`error` for data-heavy routes.
- Route segment folders are `kebab-case`; private folders start with `_`; route groups use `(group)`.
- Route handlers (`route.ts`) and server actions validate input with a schema and return typed, consistent errors.
- Use `next/image`, `next/link` and `next/font`. Set metadata via the `metadata` export / `generateMetadata`.
- Be explicit about caching/revalidation (`revalidate`, `cache`, `revalidatePath/Tag`).

## Performance (from Vercel's React best practices)
- Avoid request waterfalls: start independent work together (`Promise.all`) and `await` only in the branch that needs the result.
- Stream with `<Suspense>` boundaries instead of blocking the whole page on slow data.
- Pass the minimum data from Server to Client Components (serialisation cost); deduplicate per-request work with `React.cache()`.
- Import modules directly, not through barrel files; load heavy client components with `next/dynamic`; load third-party scripts after hydration.
