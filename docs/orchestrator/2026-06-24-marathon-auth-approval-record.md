# Marathon Auth Backfill And Live Smoke Approval Record

Date: 2026-06-24
Repo: marathon
Approval source: owner follow-up in current orchestration thread
Status: approvals documented; no Gate 1, Gate 2, reconciliation apply, contact-code delivery, live credential smoke, deploy, secret read, or legacy `speakasap-portal` action was executed by this documentation update.

## IPS Chain

Vision: Marathon users are represented in the shared Alfares Auth/AOS identity system with explicit operational approvals.
Goal Impact: the approved live-read, apply, reconciliation, and non-sensitive credential smoke gates can proceed only through their documented bounded commands and stop conditions.
System: deployed Marathon pod, Marathon production database, Auth API, hosted Auth/contact-code flow, Marathon backfill and smoke scripts.
Feature: owner-approved Marathon Auth migration readiness gates.
Task: document approval for Gate 1 live read-only backfill dry-run, Gate 2 backfill apply, `--include-bound` reconciliation apply, and non-sensitive live credential/contact-code callback smoke.
Execution Plan: preserve approvals in source docs first; execute each gate separately with its exact command, masked output, and stop conditions.
Coding Prompt: do not infer missing runtime facts; keep execution evidence separate from approval evidence; do not expose PII, secrets, DSNs, tokens, or raw contacts.
Code: approval documentation only.
Validation: [MISSING: execution validation; this file records approval state only].

## Approved Gates

- APPROVED: Gate 1 live read-only Auth backfill dry-run on `alfares` using the deployed Marathon pod, limit 25, no Auth API calls, no DB writes, masked output only.
- APPROVED: Gate 2 Auth backfill apply.
- APPROVED: `--include-bound` reconciliation apply.
- APPROVED: non-sensitive live credential/contact-code callback smoke.

## Execution Constraints Still Required

- Gate 1 must use the documented read-only command and stop if output is not masked, writes are non-zero, or more than 25 rows are scanned.
- Gate 2 must not run until Gate 1 evidence is reviewed.
- Gate 2 still needs exact batch limit, ticket/change ID, approved Auth API base URL, and runtime execution context before command execution.
- `--include-bound` reconciliation apply must include `MARATHON_AUTH_RECONCILIATION_APPROVAL=OWNER_APPROVED_MARATHON_AUTH_RECONCILIATION_2026_06_24` and must not update non-empty Marathon `userId` values.
- Non-sensitive live credential/contact-code callback smoke still needs the exact approved test contact/account and command shape before execution.

## Missing Facts

- [COMPLETE: Gate 1 dry-run aggregate counts: `totalCandidates=0`, `scanned=0`, `eligible=0`, `samples=[]`].
- [MISSING: Gate 2 exact batch limit].
- [MISSING: Gate 2 owner-approved ticket/change ID].
- [MISSING: Gate 2 approved Auth API base URL].
- [MISSING: exact non-sensitive test contact/account for live credential/contact-code callback smoke].
- [UNKNOWN: final policy for non-UUID legacy bindings].


## Gate 1 Execution Evidence - 2026-06-24

- Plan-only preflight: `kubectl -n statex-apps exec deployment/marathon -- sh -lc "cd /app && node scripts/backfill-marathon-auth-users.js --plan-only --limit 5"` returned `liveAccess=false`, `dbAccess=false`, and `authApiAccess=false`.
- Dry-run command: `kubectl -n statex-apps exec deployment/marathon -- sh -lc "cd /app && node scripts/backfill-marathon-auth-users.js --limit 25"` returned `mode=dry-run`, `limit=25`, `totalCandidates=0`, `scanned=0`, `eligible=0`, `authCreated=0`, `authExisting=0`, `participantsUpdated=0`, and `samples=[]`.
- Execution context note: The deployed pod plan-only output did not include the newer `reconciliationApplyRequires` field from commit `9cef640`, so `--include-bound` reconciliation apply remains blocked until the current source guardrail is deployed or the approved execution context is changed to a current-source runtime.


## Execution Evidence - 2026-06-24

- Gate 1 live read-only dry-run executed from deployed Marathon pod with `--limit 25`: `mode=dry-run`, `totalCandidates=0`, `scanned=0`, `eligible=0`, `authCreated=0`, `authExisting=0`, `participantsUpdated=0`, `samples=[]`.
- Reconciliation dry-run executed with `--include-bound --limit 25`: `mode=dry-run`, `totalCandidates=27`, `scanned=25`, `eligible=25`, `authCreated=0`, `authExisting=0`, `participantsUpdated=0`; samples were masked.
- Approved reconciliation apply executed with `--include-bound --limit 25`: `mode=apply`, `authExisting=25`, `authCreated=0`, `participantsUpdated=0`; samples were masked.
- Final idempotent approved reconciliation apply executed with `--include-bound --limit 100`: `mode=apply`, `totalCandidates=27`, `scanned=27`, `eligible=27`, `authExisting=27`, `authCreated=0`, `participantsUpdated=0`; samples were masked.
- No direct Auth DB write was performed; reconciliation used Auth API `/auth/register-contact` through the Marathon backfill script.
- Existing non-empty Marathon `userId` values were not overwritten.
