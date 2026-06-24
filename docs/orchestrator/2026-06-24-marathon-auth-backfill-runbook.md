# Marathon Auth Users Backfill Dry-Run Runbook

Date: 2026-06-24
Repo: marathon
Owner role: WS-H Marathon Users Auth Backfill Dry-Run Runbook Owner
Status: owner-approval-ready dry-run plan; apply is blocked until explicit approval

## IPS Chain

Vision: Marathon users are represented in the shared Alfares auth-microservice/AOS identity system.
Goal Impact: Existing Marathon participants can later authenticate through central Auth without losing Marathon progress, VIP/payment state, or profile continuity.
System: Marathon participant records, auth-microservice `/auth/register-contact`, Marathon `scripts/backfill-marathon-auth-users.js`.
Feature: Marathon-sourced contact provisioning into Auth with canonical Auth user id binding.
Task: prepare a dry-run-first backfill runbook that never writes Auth DB directly and never applies without owner approval.
Execution Plan: run non-live plan checks first, then approved dry-run against the Marathon runtime DB, then apply only through Auth API in bounded batches after owner approval.
Coding Prompt: docs/runbook and dry-run script safety only; no migrations, no deploy, no live DB query in this session, no secrets.
Code: `docs/orchestrator/2026-06-24-marathon-auth-backfill-runbook.md`, `scripts/backfill-marathon-auth-users.js`.
Validation: static syntax and non-live `--plan-only` output only in this session.

## Non-Negotiable Boundaries

- Do not connect to the Marathon database until the owner approves a dry-run live read.
- Do not read `.env`, secret stores, Kubernetes secrets, Docker environment, or DSN values without explicit approval.
- Do not write Auth DB directly. Provision contacts only through Auth API `POST /auth/register-contact`.
- Do not run migrations, deploys, seeders, dumps, restores, or backfill apply without explicit approval.
- Do not print raw emails, phone numbers, tokens, passwords, connection strings, or participant exports.
- Keep `source=marathon` on every Auth contact provisioning request.
- Auth stores new users with `source=marathon`; for existing users it preserves the original primary `source` and marks Marathon membership at `perApplicationPreferences.authSources.marathon`.
- Treat `sessionId=marathon:<participantId>` as compatibility metadata only, not authentication.

## DB Profile Placeholders

```yaml
project: marathon
remote:
  host_alias: alfares
  repo_path: /home/ssf/Documents/Github/marathon

classification: sensitive
last_reviewed: 2026-06-24
reviewed_by: [MISSING: owner]

database:
  engine: [MISSING: postgres assumed from Prisma, not live-verified in this session]
  runtime: [MISSING: docker|kubernetes|managed|unknown]
  service_name: [MISSING: Marathon DB service/container/pod name]
  host_source: DATABASE_URL or DB_HOST, value omitted
  port_source: DATABASE_URL or DB_PORT, value omitted
  database_name_source: DATABASE_URL or DB_NAME, value omitted
  username_source: DATABASE_URL or DB_USER, value omitted
  password_source: DATABASE_URL or DB_PASSWORD, value omitted

connection:
  approved_method: [MISSING: in-pod runtime command|ssh tunnel|docker exec|kubectl exec]
  bastion_or_host: alfares
  local_port: [MISSING: optional]
  ssl_required: [UNKNOWN: true|false]
  read_only_role_available: [UNKNOWN: true|false]
  production_access_policy: approval_required

backfill:
  tool: node Prisma script
  script: scripts/backfill-marathon-auth-users.js
  command_plan_only: node scripts/backfill-marathon-auth-users.js --plan-only --limit 5
  command_dry_run: node scripts/backfill-marathon-auth-users.js --limit 25
  command_apply: MARATHON_AUTH_BACKFILL_APPROVAL=OWNER_APPROVED_MARATHON_AUTH_BACKFILL_2026_06_24 MARATHON_AUTH_BACKFILL_TICKET=<ticket> node scripts/backfill-marathon-auth-users.js --apply --limit 25
  auth_endpoint: POST /auth/register-contact
  auth_source: marathon
```

## Approval Gates

Gate 0 - Non-live plan review:
- Allowed now.
- Command: `node scripts/backfill-marathon-auth-users.js --plan-only --limit 5`.
- Expected access: no DB, no Auth API, no secrets.

Gate 1 - Owner-approved dry-run live read:
- Requires explicit approval for a read-only live DB query through the approved runtime profile.
- Command: `node scripts/backfill-marathon-auth-users.js --limit 25`.
- Expected access: reads Marathon participant rows through Prisma; does not call Auth API; does not write DB.
- Output must be aggregate counts plus masked samples only.

Gate 2 - Owner-approved apply batch:
- Requires explicit approval that names the repo, runtime profile, batch limit, and rollback/forward-fix policy.
- Command shape:

```bash
MARATHON_AUTH_BACKFILL_APPROVAL=OWNER_APPROVED_MARATHON_AUTH_BACKFILL_2026_06_24 \
MARATHON_AUTH_BACKFILL_TICKET=<owner-approved change/ticket id> \
AUTH_SERVICE_URL=<approved Auth API base URL> \
DATABASE_URL=<approved Marathon DB DSN> \
node scripts/backfill-marathon-auth-users.js --apply --limit 25
```

- Expected access: reads Marathon participants, calls Auth `POST /auth/register-contact`, and updates `MarathonParticipant.userId` only when it is currently empty.
- The script must fail closed if the approval phrase, ticket, `DATABASE_URL`, or `AUTH_SERVICE_URL` is missing.

Gate 3 - Larger apply batches:
- Requires review of the previous batch output.
- Increase `--limit` or `MARATHON_AUTH_BACKFILL_BATCH_SIZE` only after owner approval.
- Do not use `--include-bound` in apply mode unless the owner explicitly approves a reconciliation run.

## Dry-Run Procedure

1. Confirm repo state:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/marathon && git status --short --branch'
```

2. Run non-live plan mode:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/marathon && node scripts/backfill-marathon-auth-users.js --plan-only --limit 5'
```

3. Request owner approval for live read-only dry-run using the DB profile placeholders above.

4. After approval, run a bounded dry-run inside the approved runtime context:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/marathon && node scripts/backfill-marathon-auth-users.js --limit 25'
```

5. Review only masked JSON output:
- `totalCandidates`
- `scanned`
- `eligible`
- `skippedMissingContact`
- `skippedBound`
- `skippedLegacyBound`
- `authCreated` and `authExisting` must stay `0` in dry-run.
- `participantsUpdated` must stay `0` in dry-run.
- `samples` must contain only masked IDs/contact fields.

## Apply Procedure

Apply is not approved by this runbook alone. The owner must approve the exact command, runtime profile, batch size, and ticket.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/marathon && MARATHON_AUTH_BACKFILL_APPROVAL=OWNER_APPROVED_MARATHON_AUTH_BACKFILL_2026_06_24 MARATHON_AUTH_BACKFILL_TICKET=<ticket> AUTH_SERVICE_URL=<approved Auth API base URL> DATABASE_URL=<approved Marathon DB DSN> node scripts/backfill-marathon-auth-users.js --apply --limit 25'
```

The script sends each eligible participant to Auth as:

```json
{
  "name": "<participant name or email>",
  "contactInfo": [
    { "type": "email", "value": "<normalized email>", "isPrimary": true },
    { "type": "phone", "value": "<trimmed phone>", "isPrimary": false }
  ],
  "source": "marathon",
  "sessionId": "marathon:<participantId>"
}
```

Auth returns the canonical `userId`. Auth also records the Marathon provisioning marker at `perApplicationPreferences.authSources.marathon` without overwriting another service's primary `source`. Marathon stores that canonical Auth user id in `MarathonParticipant.userId` only when the participant currently has no `userId`. Existing non-UUID legacy bindings are skipped and must be handled by a separate approved mapping plan.

## Rollback And Forward-Fix Policy

Preferred recovery is forward-fix, not destructive rollback:
- If Auth provisioning created or updated the wrong contact, stop the batch and open an Auth-owned correction task. Do not edit Auth DB directly from Marathon.
- If Marathon stored the wrong canonical Auth user id, stop the batch and prepare an owner-approved targeted Marathon correction script using masked evidence and exact row IDs kept out of chat.
- If a duplicate is detected, stop and use Auth API/owner-approved Auth remediation. Do not delete Auth users directly.
- If a batch partially succeeds, preserve the JSON summary and rerun dry-run with a smaller limit before any next apply.

Direct rollback requires separate explicit owner approval and a precise target list. No rollback is authorized by this runbook.

## Masked Reporting Contract

Allowed output:
- Aggregate counts.
- Up to five masked samples.
- Masked participant IDs, masked emails, masked phones, masked existing user ids.
- Auth API status code on failure, without response body contact details.

Forbidden output:
- Raw emails, phones, names, participant exports, JWTs, refresh tokens, passwords, DSNs, `.env` contents, cookies, or secret values.
- Full Auth response bodies if they could include contact or profile data.

## Missing Facts

- [MISSING: owner approval for live read-only dry-run].
- [MISSING: owner approval for apply].
- [MISSING: approved Marathon runtime DB profile and execution context].
- [MISSING: approved Auth API base URL for apply].
- [MISSING: owner-approved batch size beyond initial limit 25].
- [UNKNOWN: whether a read-only DB role exists for Marathon production].
- [UNKNOWN: final reconciliation policy for already-bound UUID participants].
- [UNKNOWN: mapping policy for non-UUID legacy `MarathonParticipant.userId` values].
