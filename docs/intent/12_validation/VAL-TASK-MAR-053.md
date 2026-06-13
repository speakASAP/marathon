# VAL-TASK-MAR-053: Legacy Catalog Audit Validation

```yaml
id: VAL-TASK-MAR-053
task: docs/intent/11_tasks/TASK-MAR-053-legacy-catalog-audit.md
status: verified
created: 2026-06-13
last_updated: 2026-06-13
environment: alfares
```

## Validation Plan

- Run `node --check scripts/audit-legacy-marathon-catalog.js`.
- Run the audit against the found legacy fixture and SQL seed on Alphares.
- Confirm the report remains redacted and does not print participant records, gift-code values, assignment text, JWTs, payment secrets, or raw fixture payloads.
- Confirm the report preserves the current production blocker instead of opening registration.

## Evidence

- `node --check scripts/audit-legacy-marathon-catalog.js` passed on Alphares.
- `npm run audit:legacy-catalog -- --fixture /home/ssf/.cursor/worktrees/speakasap-portal/aiy/portal/fixtures/marathon.json --sql /home/ssf/Documents/Github/speakasap-portal/marathon_data/marathon_de.sql` passed on Alphares and printed a redacted Markdown report.
- The report counted `marathon.marathon=11` and `marathon.step=319`; all 11 marathons were active, with 319 steps, 55 trial steps, 264 gated steps, and 0 orphan steps.
- The report counted `Products=0`, `Gift codes=0`, and `Steps with approved assignmentContent=0`.
- SQL seed metadata showed 29 `INSERT` statements into `marathon_step` with columns only: `title`, `penalize`, `order`, `form_class`, `sn_link`, `trial`, and `marathon_id`.
- Direct JSON mode check returned `{ marathons: 11, steps: 319, activeMarathons: 11, products: 0, gifts: 0, ready: false, blockers: 4 }`.
- Sensitive-data posture passed for the validation artifact: evidence records only paths, counts, model/table names, field/column names, proposed slugs, and blocker classes. It does not include participant records, gift-code values, assignment text, JWTs, payment secrets, or raw fixture payloads.

## Result

Passed for TASK-MAR-053. Legacy SpeakASAP fixtures are now auditable through a repeatable read-only command, but they are not launch-ready catalog data.

The production journey remains blocked until a source owner approves a catalog-only JSON file with selected marathon rows, approved assignment content, VIP product price/currency, and gift-code inventory.
