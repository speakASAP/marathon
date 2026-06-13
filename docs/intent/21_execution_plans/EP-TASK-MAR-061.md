# EP-TASK-MAR-061: Smoke Data Isolation Execution Plan

```yaml
id: EP-TASK-MAR-061
status: complete
source_task: docs/intent/11_tasks/TASK-MAR-061-smoke-data-isolation.md
validation: docs/intent/12_validation/VAL-TASK-MAR-061.md
```

## Steps

1. Add a central smoke participant predicate using the production smoke name marker.
2. Apply the predicate to Marathon analytics counts, submission counts, payment counts, survey counts, and winner counts.
3. Hide smoke-only winners from public winner list/detail.
4. Add a guarded `smoke:production-safe` script for phone-only registration, gift redemption, full submission completion, NPS, gift replenishment, readiness, and journey checks.
5. Build, deploy, and run readiness, journey, analytics, and winners checks.

## Risk Controls

- No deletion or mutation of existing participant progress.
- No email-based Marathon registration in the runner.
- No secrets or full gift codes in output.
- If gift inventory is consumed, create a replacement unused smoke gift before final readiness.

## Result

Complete on 2026-06-13. Implementation deployed with image `localhost:5000/marathon:smoke-isolation-20260613-2`; validation passed in `docs/intent/12_validation/VAL-TASK-MAR-061.md`.
