---
id: VAL-TASK-MAR-070
task: TASK-MAR-070
feature: FEAT-001
status: deployed-validated
---

# Validation: TASK-MAR-070

## Required Checks

```bash
git diff --check
```

Implementation validation has landed for documentation, backend contract enforcement, read-only auditor syntax, frontend renderer extraction, deployment, pod-level assignment-contract auditing, readiness, user-flow smoke, and production-safe smoke.

## Implementation Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Documentation chain | Pass | ADR-008 and TASK-MAR-070 define the shared structured block contract and IPS chain. |
| Backend TypeScript build | Pass | 2026-06-27 `npm run build` completed `tsc -p tsconfig.build.json` with exit `0`. |
| Frontend renderer build | Pass | 2026-06-27 `npm run build:frontend` completed `tsc -b && vite build` with exit `0`; Vite transformed 69 modules and emitted the production bundle. |
| Auditor syntax | Pass | 2026-06-27 `node --check scripts/check-assignment-contract.js` exited `0`. |
| Whitespace | Pass | 2026-06-27 `git diff --check` exited `0`. |
| Direct assignment-contract runtime | Blocked by environment | 2026-06-27 direct checkout run returned a redacted database-connection failure because `db-server-postgres:5432` is only reachable in-cluster. |
| Deploy | Pass | 2026-06-27 `./scripts/deploy.sh 467ccc5` completed successfully and rolled out image `localhost:5000/marathon:467ccc5`. |
| Pod assignment-contract runtime | Pass | 2026-06-27 `kubectl exec -n statex-apps deploy/marathon -- sh -lc 'cd /app && npm run check:assignment-contract -- --json'` returned `ok:true` across 13 active marathons and 377 steps after the catalog metadata repair below. |
| Readiness | Pass | 2026-06-27 in-pod `npm run check:readiness -- --json` returned `ok:true`, `activeMarathons:13`, `steps:377`, and `stepsWithContent:377`. |
| User flow smoke | Pass | 2026-06-27 deploy user-flow smoke passed 15 visitor routes, registration handoff, payment return routes, payment auth gate, and dashboard markers. |
| Production-safe smoke | Pass | 2026-06-27 deploy production-safe smoke completed payment/gift/winner/finished/NPS flow with masked identifiers and no printed tokens, gift codes, or payment webhook key. |
| Live bundle | Pass | 2026-06-27 `https://marathon.alfares.cz/` references `/assets/index-BZaGjM8N.js`, and that asset returned HTTP 200. |

## Catalog Metadata Repair

The first deployed assignment-contract auditor run found one contract defect in the production catalog: `tr/turkish-9`, sequence 21, `formKey=Step9Form1`, field `q7` was a textarea with no persisted label. The legacy Django template placed the question text outside `{% render_field form.q7 %}`, which was acceptable in the old template system but invalid in the structured block contract.

Repair performed on 2026-06-27:

- Dry-run identified exactly one target block: Turkish step 21, block index 52, field `q7`.
- Applied one `MarathonStep.assignmentBlocks` metadata update to set label `Объясните выбранные темы урока своими словами`.
- No participant rows, submissions, reports, payments, gifts, winners, or NPS rows were modified.
- Re-running the pod auditor returned `ok:true`, with no violations or warnings.

Final implementation closure includes sanitized pod evidence for:

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

- Browser pixel-level rendered route QA is [MISSING: not run in this pass]. Public user-flow smoke and live bundle verification passed.
