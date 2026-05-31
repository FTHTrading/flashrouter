# Audit Findings Tracker

Every finding from every audit, tracked to closure with a linked commit or written rationale.

## Status counts

| Severity | Open | Acknowledged (won't fix, rationale below) | Fixed |
|---|---|---|---|
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |
| Informational | 0 | 0 | 0 |

No audits completed yet — table will populate as findings arrive.

## How a finding flows

1. Auditor submits finding in their report
2. We open a GitHub issue with `[audit-<firm>-<date>] <severity>: <title>`
3. We respond in the issue: fix proposed, fix implemented, or "acknowledged with rationale"
4. Issue closed when fix lands on `main` AND retest by the auditor passes
5. Issue linked here under the appropriate firm/date

## Acknowledged-without-fix policy

We will only mark a finding as "acknowledged, won't fix" with explicit written agreement from the auditor that the rationale is acceptable. No silent dismissals. Every such finding gets a public rationale here.
