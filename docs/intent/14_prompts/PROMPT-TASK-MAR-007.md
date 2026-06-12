# PROMPT-TASK-MAR-007: Catalog Handoff Contract

```yaml
id: PROMPT-TASK-MAR-007
task: docs/intent/11_tasks/TASK-MAR-007-catalog-handoff-contract.md
created: 2026-06-12
last_updated: 2026-06-12
```

## Coding Prompt

Improve the catalog-only handoff path without inventing or loading course content. Add a machine-readable catalog schema, update the operator runbook, and make the existing loader dry-run output show redacted per-marathon launch readiness counts. Preserve the no-progress-import invariant and do not print gift-code values in dry-run evidence.

## Validation Commands

```bash
node --check scripts/load-marathon-catalog.js
node scripts/load-marathon-catalog.js docs/examples/marathon-catalog.example.json
npm run build
```

After deployment, verify that the runtime image can run the same dry-run command from the Marathon pod.

