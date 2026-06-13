# EP-TASK-MAR-064: Legacy Data Hygiene Audit

```yaml
id: EP-TASK-MAR-064
status: complete
source_task: docs/intent/11_tasks/TASK-MAR-064-legacy-data-hygiene-audit.md
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
```

## Traceability

- Vision: operationally verified Marathon service.
- System: `SYS-001` Marathon platform.
- Invariant: do not expose participant-private data or mutate legacy imports without explicit corrective migration approval.

## Sensitive-Data Handling

The audit reports aggregate counts and masked technical identifiers only. It does not select participant email, phone, name, submission report payload, gift code, JWT, payment secret, or NPS comment fields.

## Contract Impact

No API or schema contract changes. Adds operator-only npm script `audit:data-hygiene`.

## Replay/Determinism

The audit is read-only. Re-running it against the same database state returns the same counts, with samples ordered by duplicate count, completion timing, or rating severity.

## Implementation Steps

1. Add `scripts/check-marathon-data-hygiene.js`.
2. Add `npm run audit:data-hygiene`.
3. Add task, execution-plan, goal-impact, and validation records.
4. Validate syntax and run the audit in JSON mode where the production database is reachable.

## Validation

- `node --check scripts/check-marathon-data-hygiene.js`
- `npm run audit:data-hygiene -- --json`

## Current Status

Complete. The script is intentionally non-mutating and treats findings as warnings unless `--fail-on-findings` is supplied. Production database output was captured inside the deployed Marathon pod after the controlled deploy.
