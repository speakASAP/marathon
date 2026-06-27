---
id: VAL-TASK-MAR-070
task: TASK-MAR-070
feature: FEAT-001
status: implementation-validated-predeploy
---

# Validation: TASK-MAR-070

## Required Checks

```bash
git diff --check
```

Implementation validation has landed for documentation, backend contract enforcement, read-only auditor syntax, and frontend renderer extraction. Pod-level catalog validation remains deployment-gated because the current deployed image does not yet contain `scripts/check-assignment-contract.js`.

## Implementation Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Documentation chain | Pass | ADR-008 and TASK-MAR-070 define the shared structured block contract and IPS chain. |
| Backend TypeScript build | Pass | 2026-06-27 `npm run build` completed `tsc -p tsconfig.build.json` with exit `0`. |
| Frontend renderer build | Pass | 2026-06-27 `npm run build:frontend` completed `tsc -b && vite build` with exit `0`; Vite transformed 69 modules and emitted the production bundle. |
| Auditor syntax | Pass | 2026-06-27 `node --check scripts/check-assignment-contract.js` exited `0`. |
| Whitespace | Pass | 2026-06-27 `git diff --check` exited `0`. |
| Direct assignment-contract runtime | Blocked by environment | 2026-06-27 direct checkout run returned a redacted database-connection failure because `db-server-postgres:5432` is only reachable in-cluster. |
| Pod assignment-contract runtime | Deployment-gated | The current deployed pod does not yet contain the new auditor script; run after deploy from `/app`. |

Final implementation closure still needs sanitized pod evidence for:

- All active marathons. Current expected baseline: 13 active marathons.
- All current steps. Current expected baseline: 377 steps.
- Structured content block rendering for text, media, and supported reference blocks.
- Structured input block rendering and required-answer behavior.
- Branch visibility consistency across assignment rendering, validation, saved submissions, peer report generation, and answer-row display.
- Report generation boundaries for participant reports and peer reports.
- Review, winner review, NPS, profile progress report, support knowledge, readiness report, and operations-dashboard boundaries.
- Negative checks proving raw HTML, Django template tags, scripts, iframe strings, unsupported tags, private participant data, payment data, gift-code values, JWTs, and raw payload dumps are not rendered or recorded.

## Evidence

- Worker A created `docs/intent/07_decisions/ADR-008-unified-assignment-renderer-contract.md`.
- Worker A created `docs/intent/11_tasks/TASK-MAR-070-unified-assignment-report-contract.md`.
- Worker A created this validation record.
- Worker B created `scripts/check-assignment-contract.js`, `npm run check:assignment-contract`, and `VAL-TASK-MAR-070-auditor.md`.
- Worker C split `StepAssignmentRenderer` into shared renderer components under `frontend/src/components/assignment/`.
- Integration owner added backend `src/steps/assignment-contract.ts` and moved peer report generation plus required-answer validation onto the shared backend contract.
- `git diff --check`: passed on 2026-06-27 with no output.

## Sensitive-Data Posture

This validation record contains only task names, route/surface categories, aggregate expected counts, and command names. It does not include full assignment text, private participant reports, participant rows, emails, JWTs, payment secrets, gift-code values, checkout URLs, NPS comments, or raw submission payloads.

## Blockers

- Runtime catalog validation with `npm run check:assignment-contract -- --json` must run inside the deployed pod after deployment, because the remote checkout cannot reach `db-server-postgres:5432`.
- Browser/rendered route QA is [MISSING: post-deploy rendered route validation].
