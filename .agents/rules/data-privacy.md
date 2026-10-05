---
description: Data privacy — read when code stores, logs, sends or tests personal data — PII, masking, retention (UU PDP, GDPR)
globs: []
alwaysApply: false
---

# Data Privacy

Applies to personal data (PII): names, emails, phone numbers, addresses, national IDs (NIK), birth dates, location, device IDs, financial and health data.

- **Minimise** — collect and store only the personal data the feature needs; do not copy it into other tables, caches or analytics without a reason.
- **Classify** — mark PII fields in models/schemas (comments or annotations) so they are easy to find.
- **Protect** — encrypt sensitive data at rest where required; always TLS in transit; restrict access by role.
- **Mask** — never log, trace or send PII to error trackers in clear text; mask it (`j***@mail.com`, `****1234`).
- **Retention** — define how long data is kept; support deletion/anonymisation requests (right to erasure) without breaking referential integrity.
- **Consent & purpose** — use data only for the purpose it was collected for; respect consent flags.
- **Non-production** — never use real personal data in tests, fixtures, seeds or local dumps; use synthetic data.
- Comply with UU PDP (Indonesia, UU No. 27/2022) and GDPR where applicable; ask when unsure.
