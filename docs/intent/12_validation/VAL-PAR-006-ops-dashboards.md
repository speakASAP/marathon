# VAL-PAR-006: Operations Dashboards Participant-Safe Validation

---
id: VAL-PAR-006-ops-dashboards
task_id: TASK-MAR-068
parallel_item: PAR-006
status: pass
validated_at: 2026-06-14
validation_type: production-read-only-smoke
---

## Intent Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

This validation closes the PAR-006 operations-dashboard lane for safe Marathon operations. It preserves the RunLayer read-only contract from `FEAT-003-runlayer-orchestration`, `TASK-MAR-006`, and `TASK-MAR-068`: operational task outputs may expose readiness and aggregate analytics, but must not expose participant-private rows, participant emails, full participant identifiers, JWTs, gift codes, payment secrets, checkout URLs, NPS comments, assignment answers, or report text.

## Scope

Allowed implementation scope was limited to the Marathon RunLayer bridge output shape and `scripts/check-marathon-journey.js` aggregate-only regression guard. Frontend routes, payment/VIP/gift behavior, migrations, catalog import/runtime data scripts, secrets, and participant-private evidence were out of scope.

## Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| RunLayer task-id reflection hardening | Pass | Production image `localhost:5000/marathon:task-mar-068-runlayer-20260614` serves RunLayer responses without `output_ref.task_id`. Unsupported task errors no longer echo request-controlled type text. |
| Aggregate-only smoke guard | Pass | `scripts/check-marathon-journey.js` scans analytics and RunLayer responses for sensitive field names and rejects `$.output_ref.task_id`. |
| Read-only production journey smoke | Pass | `npm run check:journey -- --base-url https://marathon.alfares.cz --json` returned `ok: true` in read-only mode on 2026-06-14. |
| RunLayer readiness task | Pass | Smoke passed `runlayer-readiness-task`; output shape retained `source`, `task_type`, readiness data, timestamp, and recommendation only. |
| RunLayer analytics task | Pass | Smoke passed `runlayer-analytics-task`; output shape retained aggregate catalog, participant count metrics, assignment, payment, gift, winner, and NPS aggregate fields only. |
| RunLayer engagement task | Pass | Smoke passed `runlayer-engagement-task`; output shape retained aggregate task planning data and privacy copy that excludes participant identifiers. |
| Sensitive evidence handling | Pass | Validation records only aggregate counts, check names, image tag, and command status. Participant rows, emails, full participant IDs, JWTs, gift codes, payment secrets, checkout URLs, NPS comments, assignment answers, and report text are not recorded. |
| Mutating journey checks | Pass | The requested read-only smoke reported `mutation-skipped`; no additional mutating smoke was invoked after the final rollout. |

## Production Result

The first post-deploy read-only smoke still failed because Kubernetes was serving the old pod under an unchanged git-SHA image tag. The corrected rollout used a unique TASK-MAR-068 image tag and replaced the old pod. The second read-only smoke passed all checks, including the strengthened RunLayer `task_id` reflection guard.

## Closure

PAR-006 and TASK-MAR-068 are closed for the scoped RunLayer task-id reflection hardening. Remaining work in unrelated PAR lanes must not reuse this validation as evidence for frontend route changes, VIP/payment/gift behavior, catalog migrations, participant data exports, or mutating production smoke.
