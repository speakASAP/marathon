# Marathon Deployment Readiness Gate

```yaml
id: MAR-DEPLOYMENT-READINESS-GATE
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/23_documentation_contracts/OPERATIONAL_GATE_STANDARD.md
downstream:
  - docs/intent/12_validation/VAL-TASK-MAR-004.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

This gate must pass before deployment closure, merge, or task completion when code or production behavior changed.

## Blocking Checks

- Pre-coding gate passed.
- Tests/checks listed in the execution plan passed or deviations are documented.
- Validation report exists and has a recommendation.
- No unresolved `[MISSING: ...]` marker remains in closure-critical sections.
- Runtime readiness evidence exists for launch-affecting changes.
- Journey smoke evidence exists for frontend/API journey changes.
- Sensitive-data review confirms reports do not contain secrets or raw participant private data.
- Constitution and vision were not changed without approved amendment.

## Product Runtime Commands

```bash
npm run check:readiness
npm run check:journey -- --base-url https://marathon.alfares.cz
```

For production pod readiness:

```bash
kubectl exec -n statex-apps deploy/marathon -- sh -lc 'cd /app && npm run check:readiness'
```

## Report Location

Store durable command output summaries in `reports/validation/` when available and summarize them in the task validation report.
