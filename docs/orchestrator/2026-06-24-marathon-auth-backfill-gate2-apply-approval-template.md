# Marathon Auth Backfill Gate 2 Apply Approval Template

Date: 2026-06-24
Repo: marathon
Operation class: owner-approved live DB mutation plus Auth API provisioning
Status: owner-approved on 2026-06-24; execution remains blocked until Gate 1 dry-run evidence and exact command facts are reviewed

## IPS Chain

Vision: existing Marathon participants use the shared Alfares Auth identity.
Goal Impact: eligible Marathon participants receive canonical Auth user IDs without losing Marathon progress, VIP/payment state, or source history.
System: deployed Marathon application runtime, Marathon production database, auth-microservice `/auth/register-contact`.
Feature: bounded contact provisioning and participant `userId` binding.
Task: apply a small reviewed batch after Gate 1 dry-run proves candidate counts and masking.
Execution Plan: use the guarded script with explicit approval env, ticket, approved Auth API base URL, and deployed runtime DB profile; stop after one bounded batch.
Coding Prompt: never run this template directly; fill missing facts only after owner approval and Gate 1 evidence review.
Code: `scripts/backfill-marathon-auth-users.js`.
Validation: JSON apply summary with masked samples and reviewed counts.

## Preconditions

- Gate 1 dry-run has completed successfully.
- Gate 1 output was reviewed and contained:
  - `mode: "dry-run"`;
  - `authCreated: 0`;
  - `authExisting: 0`;
  - `participantsUpdated: 0`;
  - masked samples only.
- Owner selected an apply batch size and change/ticket ID.
- Owner approved the Auth API target and runtime execution context.
- `--include-bound` is excluded unless a separate reconciliation approval phrase is provided.

## Approval Phrase

Owner approval must explicitly include this exact phrase after Gate 1 evidence is reviewed:

```text
I approve Marathon Gate 2 Auth backfill apply on alfares for batch limit <N>, ticket <TICKET>, using Auth API <AUTH_SERVICE_URL>, with masked output only and forward-fix recovery.
```

## Approved Command Shape After Phrase

Fill placeholders only after approval:

```bash
ssh alfares 'kubectl -n statex-apps exec deployment/marathon -- sh -lc "cd /app && MARATHON_AUTH_BACKFILL_APPROVAL=OWNER_APPROVED_MARATHON_AUTH_BACKFILL_2026_06_24 MARATHON_AUTH_BACKFILL_TICKET=<TICKET> AUTH_SERVICE_URL=<AUTH_SERVICE_URL> node scripts/backfill-marathon-auth-users.js --apply --limit <N>"'
```

For a separately approved already-bound UUID reconciliation apply only, add both `--include-bound` and:

```bash
MARATHON_AUTH_RECONCILIATION_APPROVAL=OWNER_APPROVED_MARATHON_AUTH_RECONCILIATION_2026_06_24
```

## Expected Writes

- Calls Auth `POST /auth/register-contact` with `source=marathon`.
- Auth may create new users or mark existing users with `perApplicationPreferences.authSources.marathon`.
- Marathon updates `MarathonParticipant.userId` only when currently empty.

## Forbidden Actions

- Do not edit Auth DB directly.
- Do not update non-empty Marathon `userId` values in this batch.
- Do not include `--include-bound` unless a separate reconciliation approval exists and the reconciliation approval environment variable is present.
- Do not print raw emails, raw phones, names, JWTs, refresh tokens, cookies, DB URLs, secret values, or full participant exports.
- Do not run more than the approved limit.

## Stop Conditions

Stop and do not retry automatically if:

- Auth API returns non-2xx;
- any unmasked contact appears in output;
- script attempts to update a non-empty `userId`;
- `participantsUpdated` exceeds approved limit;
- duplicate/conflict evidence appears;
- runtime DB/Auth API errors occur.

## Recovery Policy

Default recovery is forward-fix:

- Wrong Auth contact: stop and open an Auth-owned correction task; do not delete Auth users from Marathon.
- Wrong Marathon binding: stop and prepare a separate owner-approved targeted correction with masked row evidence.
- Partial success: preserve JSON summary, reduce batch size, and rerun dry-run before any next apply.

Direct rollback requires a new explicit owner approval with exact target IDs kept out of chat.

## Current Missing Facts

- [COMPLETE: Gate 1 dry-run evidence reviewed with `totalCandidates=0`, `scanned=0`, `eligible=0`, and `participantsUpdated=0`].
- [APPROVED: Gate 2 apply approved by owner follow-up on 2026-06-24].
- [MISSING: approved batch limit].
- [MISSING: owner-approved ticket/change ID].
- [MISSING: approved Auth API base URL].
- [UNKNOWN: final policy for non-UUID legacy bindings].
- [APPROVED: `--include-bound` already-bound UUID reconciliation apply approved by owner follow-up on 2026-06-24].


## Execution Context Note - 2026-06-24

The deployed pod plan-only output did not include the newer `reconciliationApplyRequires` field from commit `9cef640`, so `--include-bound` reconciliation apply remains blocked until the current source guardrail is deployed or the approved execution context is changed to a current-source runtime.
