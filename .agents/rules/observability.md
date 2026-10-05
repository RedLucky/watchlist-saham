---
description: Observability — read when you change a service, logs, metrics or health checks — correlation IDs, tracing
globs: []
alwaysApply: false
---

# Observability

- **Logs** — structured (JSON in production), leveled, with a correlation/request ID on every entry (see error-handling-logging).
- **Correlation** — accept or generate a request ID at the edge and propagate it to downstream calls, jobs and logs (`traceparent`/`X-Request-Id`).
- **Tracing** — instrument services with OpenTelemetry when the project uses it; create spans around external calls and slow operations.
- **Metrics** — expose the four golden signals for services: latency, traffic, errors, saturation. Name metrics consistently with units (`http_request_duration_seconds`).
- **Health** — liveness (`/health`) and readiness (`/ready`, checks dependencies) endpoints for services.
- **Error tracking** — unhandled errors in backend and frontend go to the project's error tracker (e.g. Sentry) with release version and context, without PII.
- **Alerts** are based on symptoms users feel (error rate, latency), not on every log line.
