# EP-TASK-MAR-007: Catalog Handoff Contract

```yaml
id: EP-TASK-MAR-007
status: active
source_task: docs/intent/11_tasks/TASK-MAR-007-catalog-handoff-contract.md
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
```

## Steps

1. Inspect current catalog loader and import runbook.
2. Add a JSON Schema for catalog-only data.
3. Update the runbook with the schema path and human approval checklist.
4. Extend dry-run output with a redacted per-marathon launch checklist.
5. Validate syntax, example dry run, TypeScript build, and whitespace.
6. Deploy Marathon so the runtime pod includes the updated loader and docs.
7. Record validation evidence.

## Risk Controls

- Keep loader validation authoritative; the schema is an operator/source-owner contract.
- Report gift codes only as counts.
- Do not alter the create-only apply semantics.
- Do not weaken launch-ready validation.

## Completion Checklist

- [ ] Schema added.
- [ ] Runbook updated.
- [ ] Loader dry-run checklist added.
- [ ] Local validation passed.
- [ ] Production runtime validation passed.
- [ ] Intent validation report completed.

