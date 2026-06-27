# VAL-TASK-MAR-070: Assignment Contract Auditor Validation

## Scope

Read-only auditor for active Marathon catalog assignment blocks.

## Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Syntax | Pass | 2026-06-27 `node --check scripts/check-assignment-contract.js` exited `0`. |
| Package script | Pass | 2026-06-27 `npm run check:assignment-contract -- --json` invokes `node scripts/check-assignment-contract.js --json`. |
| Direct DB runtime | Blocked | 2026-06-27 direct repo run could not resolve `db-server-postgres:5432`; the auditor returned a redacted database-connection failure and recommended running in the deployed pod. |
| Deployed pod runtime | Blocked until deploy | 2026-06-27 deployed pod check returned `missing_in_pod=scripts/check-assignment-contract.js`, so in-cluster DB validation cannot run before deployment. |
| Whitespace | Pass | 2026-06-27 `git diff --check` exited `0`. |
| Integration syntax | Pass | 2026-06-27 integration owner reran `node --check scripts/check-assignment-contract.js` with exit `0`. |
| Integration direct runtime | Blocked by environment | 2026-06-27 integration owner reran `npm run check:assignment-contract -- --json`; it returned the expected redacted database-connection failure because direct checkout runtime cannot reach cluster-only PostgreSQL DNS. |
| First pod runtime | Fail then actionable | 2026-06-27 first deployed pod run reached the production DB and found exactly one invalid block shape: `tr/turkish-9`, sequence 21, `Step9Form1`, field `q7`, missing label. |
| Catalog repair dry-run | Pass | 2026-06-27 dry-run identified exactly one target block: Turkish step 21, block index 52, field `q7`, textarea, new label `Объясните выбранные темы урока своими словами`. |
| Catalog repair apply | Pass | 2026-06-27 applied one `MarathonStep.assignmentBlocks` metadata update; no participant, report, payment, gift, winner, or NPS data changed. |
| Final pod runtime | Pass | 2026-06-27 pod run of `npm run check:assignment-contract -- --json` returned `ok:true` across 13 active marathons and 377 steps. |

## Data Safety

The auditor prints only aggregate counts by language and slug. It does not print assignment text, report payloads, participant identity data, gift codes, JWTs, payment payloads, or secrets.
