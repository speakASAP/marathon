# Marathon numeric orphan correction runbook

Date: 2026-07-06

## Intent Preservation

- Vision: every migrated marathon participant who can be safely represented in Auth can log in to Marathon and see historical marathon data, while marathon-only users remain scoped away from non-Marathon apps.
- Goal Impact: close the final `numericRows: 1` MarathonParticipant legacy identity gap without bulk mutation or PII exposure.
- System: `marathon`, `auth-microservice`.
- Feature: Marathon/Auth reconciliation.
- Task: prepare an approval-gated one-row correction for the remaining numeric legacy orphan.
- Execution Plan: dry-run first; apply only with explicit owner approval; create one Auth user, one role assignment, one legacy mapping, and rewrite one Marathon participant.
- Coding Prompt: `scripts/apply-marathon-numeric-orphan-correction.js`.
- Code: approval-gated helper; no runtime service code change.
- Validation: dry-run output, post-apply `scripts/dry-run-marathon-auth-reconciliation.js`, and masked Marathon API smoke.

## Safety

The helper is dry-run by default and never prints raw legacy ids, Auth UUIDs, participant ids, emails, phones, names, tokens, DB URLs, or secrets.

Apply is blocked unless all gates are present:

```bash
MARATHON_NUMERIC_ORPHAN_APPLY=OWNER_APPROVED_MARATHON_NUMERIC_ORPHAN_2026_07_06
MARATHON_NUMERIC_ORPHAN_TICKET=<ticket/change id>
node scripts/apply-marathon-numeric-orphan-correction.js --apply
```

## Dry-run

```bash
ssh -o HostName=192.168.88.53 alfares 'cd /home/ssf/Documents/Github/marathon && node scripts/apply-marathon-numeric-orphan-correction.js'
```

Expected current dry-run shape:

- `mode`: `dry-run`
- `marathon.totals.numericRows`: `1`
- `marathon.totals.finishedRows`: `1`
- `marathon.totals.rowsWithSubmissions`: `1`
- `auth.planned.duplicateContactUsers`: `0`
- `auth.planned.willCreateAuthUser`: `true`
- `auth.planned.willCreateMapping`: `true`

## Apply

Only after owner approval for generating a new Auth UUID identity and rewriting the one numeric participant:

```bash
ssh -o HostName=192.168.88.53 alfares 'cd /home/ssf/Documents/Github/marathon && MARATHON_NUMERIC_ORPHAN_APPLY=OWNER_APPROVED_MARATHON_NUMERIC_ORPHAN_2026_07_06 MARATHON_NUMERIC_ORPHAN_TICKET=<ticket/change id> node scripts/apply-marathon-numeric-orphan-correction.js --apply'
```

Apply semantics:

- Auth DB:
  - aborts if the candidate contact matches an existing Auth user;
  - creates one Auth user with generated UUID;
  - marks `perApplicationPreferences.authSources.marathon`;
  - assigns `app:marathon:user`;
  - creates one `legacy_identity_mappings` row for `speakasap-portal`.
- Marathon DB:
  - rewrites exactly one matching `MarathonParticipant.userId` from the numeric legacy id to the generated Auth UUID.

## Post-apply validation

```bash
ssh -o HostName=192.168.88.53 alfares 'cd /home/ssf/Documents/Github/marathon && node scripts/dry-run-marathon-auth-reconciliation.js'
```

Expected after apply:

- `marathon.totals.numericRows`: `0`
- `correctionPlan.uuidParticipantRows.missingAuthUsers`: `0`
- `correctionPlan.authMarathonAccess.missingMarathonUserRoleAssignments`: `0`

Run a masked Marathon API smoke for the corrected user without printing token, UUID, participant id, or contacts.

## Rollback / forward fix

Preferred recovery is forward-fix:

- if Auth creation succeeds but Marathon rewrite fails, rerun the helper with the same approval; it will reuse the existing mapping and perform the rewrite;
- if Marathon rewrite succeeds but a later validation fails, do not delete the Auth user blindly; inspect the one mapping and participant state under a new owner-approved fix ticket.

## Current blocker

`[MISSING: owner approval for generating a new UUID Auth identity and rewriting one numeric participant]`
