# Marathon-only Auth boundary correction packet

Date: 2026-07-06
Ticket: codex-owner-approved-2026-07-06

## Intent Preservation

- Vision: migrated SpeakASAP/legacy marathon participants can log in to Marathon and see their historical marathon profile/progress, while marathon-only imported users are not usable as accounts for other Alfares applications until they explicitly register or receive access there.
- Goal Impact: protect roughly 250k imported identities from accidentally becoming global ecosystem accounts, without breaking Marathon history access.
- System: `marathon`, `auth-microservice`, and downstream Alfares services that call `/auth/validate`.
- Feature: Marathon legacy identity reconciliation and marathon-only Auth access boundary.
- Task: verify Marathon access, verify Auth role/marker scope, classify remaining cross-service access risk, and define safe correction lanes.
- Execution Plan: aggregate-only DB validation, masked live API smoke, source-level guard audit, then bounded service-specific patches.
- Coding Prompt: `[MISSING: downstream service owners/contract approval for cross-service guard changes]`.
- Code: reconciliation helpers already exist in `scripts/dry-run-marathon-auth-reconciliation.js` and `scripts/apply-marathon-auth-reconciliation.js`; downstream guard patches are `[MISSING]`.
- Validation: see evidence below.

## Current Evidence

### Marathon/Auth reconciliation

`node scripts/dry-run-marathon-auth-reconciliation.js` on `alfares:/home/ssf/Documents/Github/marathon` returned:

- `uuidParticipantRows.distinctUuidUserIds`: 46328
- `uuidParticipantRows.existingAuthUsers`: 46328
- `uuidParticipantRows.missingAuthUsers`: 0
- `uuidParticipantRows.existingMarkedMarathonUsers`: 46328
- `authMarathonAccess.missingMarathonUserRoleAssignments`: 0
- `auth.marathonUserRole.assignments`: 46331

The 348 owner-approved missing UUID Auth users were created with the same UUIDs and have:

- `created_users`: 348
- `with_marathon_role`: 348
- `users_with_non_marathon_roles`: 0
- `non_marathon_role_assignments`: 0

### Marathon runtime access

Masked live smoke generated a short-lived token inside the Auth pod and called Marathon inside the Marathon pod without printing token, user id, participant id, contacts, or hashes.

Result:

- `/api/v1/me/marathons`: 200, `count`: 1, `answersCount`: 29
- `/api/v1/me/marathons/:id`: 200, `answersCount`: 29
- `/api/v1/me/marathons/:id/progress-report`: 200, `totalSteps`: 29, `completedSteps`: 17
- `/api/v1/me/profile`: 200, profile shape includes `displayName`, `email`, `phone`

### Role scope

For all 46328 marathon-marked target users:

- `users_with_non_marathon_roles`: 2
- `non_platform_users_with_non_marathon_roles`: 0
- the 2 exceptions both have platform/global admin role and marathon admin role

Interpretation: marathon-only imported users have no non-marathon roles. The two exceptions are platform/admin accounts and must not be bulk-stripped by the migration cleanup.

### Residual numeric orphan

One legacy numeric `MarathonParticipant.userId` remains:

- `numericRows`: 1
- `finishedRows`: 1
- `rowsWithSubmissions`: 1
- `rowsWithEmail`: 1
- Auth hash/contact match: 0

Interpretation: there is no safe existing Auth user to bind this participant to. Creating a new Auth identity and rewriting this participant needs a separate owner approval because the approved 348 operation covered missing UUID users with same UUIDs, not generating a new UUID for a legacy numeric orphan.

## Cross-service gap

Role cleanup alone does not prove that other applications cannot use marathon-only users. Some services correctly require app-specific roles or entitlements; others accept any valid Auth identity for at least some endpoints.

Source evidence from read-only inspection:

- Marathon controllers use `AuthGuard` only; they do not require `app:marathon:user` directly. Access is effectively controlled by successful Auth validation plus Marathon-local `MarathonParticipant.userId`.
- Auth `/auth/validate` returns roles, but services decide how to enforce them.
- Examples of generic access patterns:
  - `orders-microservice`: `authenticated:user` allows any non-internal valid user in `src/auth/jwt-roles.guard.ts`.
  - `catalog-microservice`: `catalog:authenticated` bypasses app-specific role checks once token validation succeeds in `src/auth/catalog-auth.guard.ts`.
  - `invoices-microservice`: `CustomerAuthGuard` validates Auth token without app-specific role evidence in the guard.
- Examples of stronger access patterns:
  - `runlayer`: guard requires `app:runlayer:user` or `app:runlayer:admin`.
  - `shop-assistant` `/me`: entitlement guard requires global superadmin, `app:shop-assistant:*`, or active entitlement.

## Required correction lanes

### Lane A: Auth validation contract

Status: dependency-gated.

Objective: define one shared way for services to distinguish marathon-only identities from application-authorized identities.

Options:

1. Add an optional `/auth/validate` request field such as `application: "<app-name>"` and have Auth return `applicationAuthorized: true|false`.
2. Add explicit `restrictedApplications` / `authSources` metadata to the validate response and require consumers to reject marathon-only users unless the app is `marathon`.
3. Keep `/auth/validate` unchanged but patch every consumer guard to require its own `app:<service>:user/admin` role or explicit entitlement.

Recommended: option 1 for new/updated guards, with option 3 as an immediate patch for high-risk consumers. This avoids breaking Marathon and avoids guessing at service-specific access semantics.

Owner: Auth/platform integration owner.
Shared contract: `/auth/validate` response/request DTO.
Validation owner: Auth owner plus one consumer owner.
Blocker: `[MISSING: owner-approved cross-service auth contract]`.

### Lane B: High-risk generic consumer guards

Status: ready after Lane A contract or explicit per-service policy approval.

Initial targets from source inspection:

- `orders-microservice`: replace broad `authenticated:user` for customer lifecycle if this route should not be available to marathon-only identities.
- `catalog-microservice`: replace or constrain `catalog:authenticated` where app-specific catalog access is required.
- `invoices-microservice`: update `CustomerAuthGuard` to require invoice/customer entitlement rather than only a valid Auth token.
- `shop-assistant`: verify billing endpoints that currently use only `JwtAuthGuard`.

Owner: per-service owners.
Forbidden: do not weaken admin/internal roles; do not add `Auth.email == buyerEmail` style authorization.
Validation: service tests plus a masked marathon-only JWT smoke expecting 403 on non-Marathon protected routes and 200 on Marathon routes.

### Lane C: One numeric orphan

Status: blocked on owner approval.

Objective: decide whether to create a new Auth user for the single finished numeric legacy participant and rewrite that participant.

Allowed correction only after approval:

- create new Auth user from participant contact using a generated UUID;
- assign `app:marathon:user`;
- set `authSources.marathon`;
- create `legacy_identity_mappings` row for the numeric legacy id;
- rewrite the single `MarathonParticipant.userId` to the new UUID.

Validation:

- dry-run shows `numericRows: 0`;
- `missingAuthUsers: 0`;
- masked Marathon API smoke returns profile/history for that user.

Blocker: `[MISSING: owner approval for generating a new UUID Auth identity and rewriting one numeric participant]`.

## Parallel execution

- Workstream 1: Auth contract design and implementation.
  - Status: dependency-gated.
  - Allowed files: `auth-microservice/src/auth/**`, DTO/tests/docs.
  - Output: validate contract that lets consumers ask if a user is authorized for a target app.

- Workstream 2: Consumer guard audit.
  - Status: ready now, read-only.
  - Allowed files: docs/report only until contract is approved.
  - Output: repo-by-repo table of `role-required`, `authenticated-only`, `public`, and proposed patch owner.

- Workstream 3: High-risk consumer patches.
  - Status: dependency-gated.
  - Allowed files: one consumer repo per agent.
  - Output: role/entitlement guard patch and masked smoke.

- Workstream 4: Numeric orphan correction.
  - Status: blocked.
  - Allowed files: owner-gated helper script/runbook only until approval.
  - Output: approved one-row correction or documented exception.

## Current verdict

Completed:

- Migrated UUID marathon users can access Marathon history/profile.
- The 348 newly created missing UUID users have only Marathon role.
- Non-platform marathon-marked users have no non-Marathon roles.

Not complete:

- Cross-service use is not fully blocked solely by Auth role state because several consumers accept generic authenticated users.
- One numeric legacy orphan remains without a safe Auth identity binding.

