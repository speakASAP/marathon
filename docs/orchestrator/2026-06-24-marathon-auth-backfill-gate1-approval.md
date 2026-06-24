# Marathon Auth Backfill Gate 1 Approval Packet

Date: 2026-06-24
Repo: marathon
Operation class: owner-approved read-only live DB dry-run
Status: approval-ready; not approved by this document alone

## IPS Chain

Vision: existing Marathon participants are represented by the shared Alfares Auth identity system.
Goal Impact: the team can estimate and validate the Auth backfill batch before any Auth API provisioning or Marathon row update.
System: deployed Marathon application pod, Marathon production database, `scripts/backfill-marathon-auth-users.js`.
Feature: masked read-only participant eligibility dry-run.
Task: run a bounded live DB read-only dry-run for participants that are active and have email plus phone.
Execution Plan: run the script inside the deployed Marathon pod so runtime DB configuration stays inside Kubernetes; do not print env values or secrets; do not call Auth API; do not update rows.
Coding Prompt: execute only after owner approval with the exact approval phrase below.
Code: `scripts/backfill-marathon-auth-users.js`.
Validation: masked JSON output with zero writes and aggregate counts only.

## Approval Phrase

Owner approval must explicitly include this exact phrase:

```text
I approve Marathon Gate 1 live read-only Auth backfill dry-run on alfares using the deployed Marathon pod, limit 25, no Auth API calls, no DB writes, masked output only.
```

## Approved Command After Phrase

```bash
ssh alfares 'kubectl -n statex-apps exec deployment/marathon -- sh -lc "cd /app && node scripts/backfill-marathon-auth-users.js --limit 25"'
```

## Expected Access

- Reads Marathon participant rows through the deployed app runtime DB connection.
- Does not call Auth API.
- Does not update Marathon rows.
- Does not read, print, or export `.env`, Kubernetes Secrets, database URLs, passwords, tokens, cookies, raw emails, raw phones, or participant exports.

## Expected Output Contract

Allowed output:

- `mode` must be `dry-run`.
- `authCreated`, `authExisting`, and `participantsUpdated` must be `0`.
- Aggregate counts: `totalCandidates`, `scanned`, `eligible`, `skippedMissingContact`, `skippedBound`, `skippedLegacyBound`.
- Up to five masked samples only.

Forbidden output:

- Raw email, phone, names, participant exports, JWTs, refresh tokens, DB connection strings, secret values, cookies, or full Auth response bodies.

## Stop Conditions

Stop and do not proceed to apply if:

- output contains raw contacts or secret-looking values;
- `mode` is not `dry-run`;
- `participantsUpdated`, `authCreated`, or `authExisting` is non-zero;
- command fails with DB/schema/runtime error;
- sample masking is incomplete;
- more than 25 rows are scanned without explicit approval.

## Follow-Up After Gate 1

Gate 1 success does not approve Gate 2 apply. After the dry-run, review aggregate counts and masked samples, then prepare a separate Gate 2 approval packet with:

- explicit batch size;
- approved Auth API base URL;
- approved rollback/forward-fix policy;
- owner-approved ticket/change id;
- exact apply command using `MARATHON_AUTH_BACKFILL_APPROVAL=OWNER_APPROVED_MARATHON_AUTH_BACKFILL_2026_06_24`.

## Current Missing Facts

- [MISSING: owner approval phrase].
- [UNKNOWN: dry-run aggregate candidate counts until Gate 1 is approved].
- [UNKNOWN: whether any non-UUID legacy participant bindings require a separate mapping plan].
