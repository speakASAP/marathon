# Marathon Auth Reconciliation Apply Runbook

Date: 2026-07-06
Repo: marathon
Status: apply helper prepared; production mutation not executed

## IPS Chain

Vision: Migrated Marathon-only users can authenticate through central Auth, see their historical Marathon profile and stages, and remain scoped to Marathon unless another application explicitly grants access.
Goal Impact: Completed legacy Marathon participants regain profile/history access through Auth UUID ownership, while Auth RBAC can distinguish Marathon users from other application users.
System: Marathon production DB, Auth production DB, `legacy_identity_mappings`, Auth RBAC, consumer service entitlement checks.
Feature: Approval-gated reconciliation helper.
Task: prepare a guarded apply path for numeric legacy Marathon participant ownership and Marathon RBAC marking.
Execution Plan: default dry-run builds an aggregate-only plan; apply requires explicit env approval, ticket, phase, and limit; Auth role/marker changes and Marathon userId rewrites are separate phases.
Coding Prompt: create an apply helper that never prints PII/secrets, does not delete roles, does not touch UUID-like participant rows, and fails closed without approval.
Code: `scripts/apply-marathon-auth-reconciliation.js`.
Validation: syntax check, plan-only, blocked apply check, and default dry-run.

## Helper Contract

Plan-only:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/marathon && node scripts/apply-marathon-auth-reconciliation.js --plan-only'
```

Dry-run:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/marathon && node scripts/apply-marathon-auth-reconciliation.js'
```

Fail-closed apply shape:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/marathon && \
  MARATHON_AUTH_RECONCILIATION_APPLY=OWNER_APPROVED_MARATHON_AUTH_RECONCILIATION_2026_07_06 \
  MARATHON_AUTH_RECONCILIATION_TICKET=<ticket/change-id> \
  node scripts/apply-marathon-auth-reconciliation.js --apply --phase=auth --limit=<positive-integer>'
```

Phases:

- `--phase=auth`: grants `app:marathon:user` and marks `perApplicationPreferences.authSources.marathon`; does not remove roles.
- `--phase=marathon`: rewrites only numeric `MarathonParticipant.userId` values with verified Auth UUID mappings.
- `--phase=both`: runs Auth phase first, then Marathon phase; there is no cross-DB transaction, so use small batches first.

## Validation Evidence

Commands run:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/marathon && node --check scripts/apply-marathon-auth-reconciliation.js'
ssh alfares 'cd /home/ssf/Documents/Github/marathon && node scripts/apply-marathon-auth-reconciliation.js --plan-only'
ssh alfares 'cd /home/ssf/Documents/Github/marathon && node scripts/apply-marathon-auth-reconciliation.js --apply --phase=auth --limit=1'
ssh alfares 'cd /home/ssf/Documents/Github/marathon && node scripts/apply-marathon-auth-reconciliation.js'
```

Results:

- Syntax check passed.
- Plan-only returned `applyAllowed=false`.
- Apply without approval failed closed with missing approval env/ticket.
- Default dry-run returned `ok=true`, `mode=dry-run`, `applyAllowed=false`.

Dry-run plan:

- Participants: `54283`.
- Bound rows: `54212`.
- Numeric legacy rows: `53469`.
- UUID-like rows: `743`.
- Finished numeric rows: `53437`.
- Active numeric rows: `4442`.
- Distinct numeric legacy ids: `45683`.
- Distinct UUID-like ids: `648`.
- Mapped distinct legacy ids: `45682`.
- Mapped participant rows: `53468`.
- Target distinct Auth users: `45682`.
- Missing `app:marathon:user` assignments before apply: `45682`.
- Missing `authSources.marathon` markers before apply: `45681`.
- Marathon candidate rows for rewrite: `53468`.
- Dry-run `updatedRows=0`, `insertedRoleAssignments=0`, `updatedMarkers=0`.

Non-Marathon role caveat:

- The dry-run found existing non-Marathon roles on target Auth users, mostly one-count admin/internal assignments across many applications plus `global:platform_admin` and `global:superadmin`.
- Treat these as an admin/operator collision until classified.
- The helper intentionally does not remove any existing roles.

## Apply Gates

Gate A - owner approval:

- Approval phrase: `OWNER_APPROVED_MARATHON_AUTH_RECONCILIATION_2026_07_06`.
- Required ticket/change id.
- Required phase and positive batch limit.
- Start with `--phase=auth --limit=25`, then validate aggregates.
- Then run `--phase=marathon --limit=25`, then validate aggregates and one approved user smoke.

Gate B - batch validation after each Auth batch:

- `missingRoleAssignmentsBefore` should decrease by batch target count.
- `missingMarkersBefore` should decrease by batch target count except users already marked.
- Existing non-Marathon roles must remain unchanged.

Gate C - batch validation after each Marathon batch:

- Numeric legacy participant rows should decrease by mapped participant rows in the batch.
- UUID-like rows should not be touched.
- Submissions, payments, penalty reports, certificates, winners, email, phone, and names must not change.

Gate D - completion validation:

- `numericRows` should be reduced by `53468`; one missing-mapping row remains unless separately resolved.
- Target Auth users should have `app:marathon:user`.
- A known migrated completed user should authenticate through central Auth and see `/profile`, `/api/v1/me/marathons`, stages/submissions/progress/certificate where applicable.

## Consumer Scope Findings

Read-only consumer audit found high risk in these services:

- `shop-assistant`: customer `/me` and dashboard APIs appear to accept any valid Auth user.
- `runlayer`: core dashboard/project APIs appear to accept any valid Auth user.
- `crypto-ai-agent`: backend auto-creates a local user row for any valid Auth token.

Safer/partial:

- `speakasap`: local student/teacher/manager rows limit cabinets; central Auth alone tends to hit missing profile.
- `school-committee`: admin/staff is role-gated; non-school users may still enter onboarding/pending profile.
- `leads-microservice`: admin surfaces require accepted roles/workspace/source mapping.

Follow-up requirement:

- Add fail-closed app entitlement checks to high-risk services before treating Marathon-only scoping as complete.
- Required policy: services should require their own `app:<service>:user|admin` or local entitlement before showing personal/dashboard data.

## Consumer Hardening Prepared

Source-level hardening patches were prepared on 2026-07-06. No deploy was run.

`shop-assistant`:

- Added `src/auth/shop-assistant-entitlement.guard.ts`.
- Guard allows `global:superadmin`, `app:shop-assistant:admin`, `app:shop-assistant:user`, or active local `UserEntitlement`.
- Applied to `/me`, `/profiles`, and `/saved-criteria` controllers.
- Validation: `npm run build` passed; `git diff --check` passed.

`runlayer`:

- Extended Auth validate contract to preserve role claims.
- `JwtGuard` now requires `app:runlayer:user`, `app:runlayer:admin`, `global:superadmin`, or configured admin id for Auth-user tokens.
- Static internal service-token bypass is preserved.
- `AdminGuard` no longer has open-admin mode; it requires admin role or configured admin id.
- `/admin` shell validates admin entitlement before serving the app.
- Previously unguarded task/execution evidence controllers now use `JwtGuard`.
- Added `src/common/auth/jwt.guard.spec.ts` for positive RunLayer role, configured admin id, Marathon-only negative, service-token bypass, and missing-token cases.
- Updated contract tests to preserve role claims from Auth validate responses.
- Validation: `npm run build` passed; `npm test -- common/auth contracts/contracts.spec.ts` passed with `142` tests; `git diff --check` passed.

`crypto-ai-agent`:

- `backend/app/dependencies/auth.py` now allows existing local Crypto AI users.
- New local profile auto-create is allowed only when Auth roles include `app:crypto-ai-agent:user` or `app:crypto-ai-agent:admin`.
- Marathon-only Auth users without a local Crypto AI row should receive `403`.
- Added `backend/tests/test_auth_entitlements.py` for accepted Crypto roles, Marathon-only rejection, and malformed/missing role rejection.
- Validation: `python3 -m py_compile app/dependencies/auth.py tests/test_auth_entitlements.py` passed; AST parse passed; `git diff --check` passed.
- Validation blocker: `python3 -m pytest tests/test_auth_entitlements.py -v` could not run because `pytest` is not installed in the remote backend environment.

Remaining hardening caveats:

- These source patches are not deployed.
- Live behavior remains unverified until deployment and approved smoke tests.
- Auth must issue app roles for legitimate users of each application, or they will fail closed.
- Broader commerce/customer-cabinet services still need a narrower follow-up audit.

## Remaining Blockers

- [MISSING: owner approval for any production mutation].
- [MISSING: known migrated completed user/test account for post-apply smoke].
- [MISSING: resolution policy for one numeric legacy id without Auth mapping].
- [MISSING: resolution policy for `348` UUID-like Marathon user ids missing in Auth].
- [SOURCE-PREPARED: consumer-side hardening patches for `shop-assistant`, `runlayer`, and `crypto-ai-agent`; deployment and live smoke remain missing].

## Verdict

The required correction is now safely prepared but not applied. Current production still does not satisfy the full goal because legacy Marathon rows are not reconciled to Auth UUIDs, the high-risk consumer hardening patches are not deployed, and live smoke with a known migrated completed user is still missing.
