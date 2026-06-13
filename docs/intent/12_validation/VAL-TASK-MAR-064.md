# VAL-TASK-MAR-064: Legacy Data Hygiene Audit Validation

```yaml
id: VAL-TASK-MAR-064
status: verified
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
upstream:
  - docs/intent/11_tasks/TASK-MAR-064-legacy-data-hygiene-audit.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Script syntax passes | Pass | 2026-06-13 remote `node --check scripts/check-marathon-data-hygiene.js` completed successfully. |
| NPM command exists | Pass | 2026-06-13 remote `npm run audit:data-hygiene -- --json` invoked the new script. |
| SSH-host database reachability | Expected Blocked | The remote SSH host cannot reach `db-server-postgres:5432`; output returned a redacted `DATABASE_URL` and Prisma connection error before deployment. |
| Controlled deploy completed | Pass | 2026-06-13 `./scripts/deploy.sh codex-data-hygiene-20260613-1825` completed successfully. |
| Readiness smoke passed | Pass | In-pod `npm run check:readiness` reported 13 active marathons, 377 steps, 377 steps with content, 13 products, 29 gifts, 13 unused gifts, 53,523 participants, and 22 payment attempts. |
| User-flow smoke passed | Pass | In-pod `npm run check:user-flows` passed visitor routes, navigation actions, registration, payment auth gate, and checkout skip boundary. |
| Production smoke passed | Pass | In-pod `npm run check:production-smoke` completed payment unlock, gift unlock, 29 submissions, winner creation, and NPS create/update with masked identifiers. |
| Output is read-only and masked | Pass | In-pod `npm run audit:data-hygiene -- --json` returned aggregate counts and masked IDs only. |
| Duplicate submission groups reported | Pass | Audit reported 8 duplicate participant/step groups and 8 extra rows. |
| Finished-active participants reported | Pass | Audit reported 4,410 active participants that have completed every catalog step. |
| Negative ratings reported | Pass | Audit reported 415 negative-rating submissions across 199 participants; distribution was -4: 2, -3: 11, -2: 44, -1: 358. |

## Sensitive-Data Scan

Pass. Static review and in-pod output confirm the script does not select participant contact fields, payload JSON, gift-code values, JWTs, payment secrets, or NPS comments. Output uses aggregate counts plus masked technical IDs.

## Closure Note

Verified. The audit is deployed, executable in the Marathon pod, and reports the known legacy hygiene findings without mutating data or exposing participant-private fields.
