# Marathon Auth Reconciliation Dry-Run

Date: 2026-07-06
Repo: marathon
Status: dry-run evidence only; no DB mutation, no Auth API mutation, no deploy

## IPS Chain

Vision: Migrated Marathon-only users can authenticate through central Auth and see their historical Marathon profile, stages, submissions, completion state, and certificates without gaining unintended access to other Alfares applications.
Goal Impact: Legacy SpeakASAP Marathon participant ownership is reconciled to Auth UUID ownership while preserving Marathon history and avoiding broad ecosystem access.
System: Marathon `MarathonParticipant.userId`, Auth `legacy_identity_mappings`, Auth RBAC `applications`/`roles`/`user_roles`, hosted Auth token validation.
Feature: Dry-run-only Marathon/Auth identity reconciliation plan.
Task: prove the exact numeric legacy id to Auth UUID rewrite scope and required `app:marathon:user` assignments without outputting PII or changing data.
Execution Plan: run read-only aggregate queries through deployed Marathon and Auth pods, transfer only temporary user-id statistics between pods, delete temporary files, and block apply in this tool.
Coding Prompt: add a dry-run script that has no apply path, prints aggregate counts only, and reports approval gates for future mutating reconciliation.
Code: `scripts/dry-run-marathon-auth-reconciliation.js`.
Validation: `node --check scripts/dry-run-marathon-auth-reconciliation.js`; `node scripts/dry-run-marathon-auth-reconciliation.js --plan-only`; `node scripts/dry-run-marathon-auth-reconciliation.js`.

## Dry-Run Evidence

Command:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/marathon && node scripts/dry-run-marathon-auth-reconciliation.js'
```

Result:

- `ok=true`, `mode=dry-run`, `applyAllowed=false`.
- Marathon participants: `54283`.
- Bound participant rows: `54212`.
- Numeric legacy `userId` rows: `53469`.
- UUID-like `userId` rows: `743`.
- Unbound rows: `71`.
- Finished numeric rows: `53437`.
- Numeric rows with submissions: `53469`.
- Distinct numeric legacy ids: `45683`.
- Distinct UUID-like ids: `648`.
- Duplicate user/language groups: `87`.

Auth/RBAC evidence:

- Auth users: `214588`.
- `source=marathon`: `154`.
- `authSources.marathon` marker: `155`.
- `source=speakasap-portal`: `214225`.
- Marathon application role `user` exists.
- Current `app:marathon:user` assignments: `0`.

Correction plan:

- Numeric legacy participant rows candidate for rewrite: `53469`.
- Mapped distinct legacy ids: `45682` of `45683`.
- Mapped participant rows: `53468`.
- Missing mapping: `1` distinct legacy id / `1` participant row.
- Mapping rows without Auth user: `0`.
- Duplicate target Auth users: `0`.
- Target distinct Auth users for Marathon access: `45682`.
- Missing `app:marathon:user` assignments: `45682`.
- Existing roles on target Auth users that require separate classification before any destructive scope cleanup: `2` global, `22` other app, `11` internal.
- UUID-like participant ids: `648` distinct; `300` exist in Auth, `348` missing in Auth; rows affected by missing UUID Auth users: `424`.

## Safety Boundaries

- This dry-run does not write Marathon DB, Auth DB, Auth API, files inside pods beyond temporary `/tmp` transfer files, or Kubernetes resources.
- Output intentionally excludes raw user ids, emails, phones, names, JWTs, DB URLs, and secret values.
- Any apply must be a separate owner-approved operation with an exact runtime context, rollback/forward-fix policy, batch size, and stop conditions.
- Do not delete or strip non-Marathon roles in the same operation. The dry-run found existing global/other-app/internal roles among target Auth users; these must be classified before any access cleanup.

## Proposed Apply Gates

Gate 1 - review dry-run:
- Confirm that numeric legacy `MarathonParticipant.userId` values should be rewritten to Auth UUIDs using `legacy_identity_mappings(legacySystem='speakasap-portal')`.
- Decide how to handle the one missing numeric mapping.
- Decide how to handle the `348` UUID-like participant ids missing in Auth.

Gate 2 - Marathon rewrite:
- Approved script rewrites only numeric legacy ids with an Auth mapping.
- It must not change unbound rows, UUID-like rows, emails, phones, submissions, penalty reports, payment attempts, certificates, winners, or profiles.
- It must emit aggregate before/after counts only.

Gate 3 - Auth access marking:
- Approved Auth-side operation grants `app:marathon:user` to the same mapped Auth users.
- It marks `perApplicationPreferences.authSources.marathon` without overwriting existing `source`.
- It must not remove global, other-app, or internal roles.

Gate 4 - consumer-side scope audit:
- Independently audit user-facing services that show personal cabinets to ensure they do not treat every valid Auth user as entitled to that service.
- Required policy: a service must require its own `app:<service>:...` role or a service-owned entitlement before showing user-specific data.

## Parallel Execution

- Ready now: Marathon apply script design and dry-run extension owner. Scope: `scripts/*`, docs only. Forbidden: direct DB mutation without owner approval.
- Ready now: Auth RBAC marking design owner. Scope: Auth-side dry-run/apply design for `app:marathon:user`. Forbidden: stripping roles or changing login/token semantics.
- Ready now: consumer-side scope audit owner. Scope: read-only audit of user-facing services for "any valid Auth user" profile access. Forbidden: broad auth contract changes without integration owner.
- Dependency-gated: production apply. Depends on owner approval, exact batch/rollback policy, and classification of existing non-Marathon roles on target Auth users.
- Final integration owner: Marathon/Auth orchestration thread.
- Validation owner: run read-only before/after aggregate checks plus one approved migrated completed-user smoke.
- Merge/order: dry-run script and docs first, Auth/Marathon apply scripts second, consumer-side policy fixes independently, production apply last.

## Current Verdict

Current production state does not yet prove that migrated completed Marathon users can log in and see their history through central Auth. Most historical participant rows still use numeric legacy ids, while central Auth login returns UUID subjects. The correction is feasible for `53468` participant rows through the existing Auth legacy mapping, but apply remains approval-gated.
