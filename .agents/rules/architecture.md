---
description: Architecture — read when you add or restructure modules, layers or services — reusability, testability, scalability
globs: []
alwaysApply: false
---

# Architecture: Reusability, Testability, Maintainability & Scalability

## Structure (reusability, testability, maintainability)
- **Layers** — keep transport (HTTP/UI/CLI), business logic and data access separate. Business logic must not import framework or DB specifics directly.
- **Pure core, thin edges** — put decisions in pure functions; keep side effects (I/O, time, randomness) at the edges and pass them in as dependencies.
- **Dependency direction** — high-level modules depend on abstractions, not concrete infrastructure. Inject dependencies (constructor/function parameters); avoid hidden globals and singletons.
- **Feature modules** — organise by domain; each module exposes a small public API and hides its internals.
- **Reuse deliberately** — share code only when it represents the same concept; similar-looking code with different reasons to change stays separate.
- **Configuration** — read config/env once at startup, validate it, and pass typed config down.
- **Small, stable interfaces** — minimise public surface; changes inside a module should not ripple outward.
- **Testability check** — if a unit is hard to test without heavy mocking, the design is too coupled; fix the design, not the test.

## Scalability
Design so the system *can* scale; do not build infrastructure the task does not need (measure before optimising).

- **Stateless processes** — no user/session state in process memory or local disk; keep it in a shared store (DB, cache, object storage) so instances can be added or removed freely.
- **Bounded work** — paginate every list, cap request/payload sizes, and never load unbounded data sets into memory; stream large files.
- **Efficient data access** — index columns used in filters/joins/sorts, avoid N+1 queries, select only needed fields, use connection pooling.
- **Async for slow work** — move long-running or retryable tasks (emails, reports, third-party calls) to a queue/background job instead of the request path.
- **Idempotency** — writes that can be retried (webhooks, jobs, payments) must be safe to run twice (idempotency keys, upserts).
- **Resilience** — timeouts on every outbound call, retries with exponential backoff and jitter only for idempotent operations, circuit breaking/fallbacks for flaky dependencies.
- **Caching with intent** — cache only measured hot paths, with an explicit TTL and invalidation strategy; never cache per-user data under a shared key.
- **Concurrency safety** — guard shared resources against races (transactions, optimistic locking, unique constraints) instead of relying on single-instance assumptions.
- **Frontend** — code-split routes, lazy-load heavy components, virtualise long lists, avoid over-fetching.
- **Observable load** — expose metrics (latency, error rate, throughput) and health checks so scaling decisions are based on data.
- **Extractable modules** — keep feature boundaries clean (no cross-module DB table access) so a module can later become its own service without a rewrite.
