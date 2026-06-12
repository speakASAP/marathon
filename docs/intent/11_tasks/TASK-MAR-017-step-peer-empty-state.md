# TASK-MAR-017: Harden Assignment Empty and Error States

```yaml
id: TASK-MAR-017
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make assignment pages handle no-example and saved-status failure states explicitly instead of leaving participants with blank peer-report panels or submit buttons that fail later.

## Scope

- Add a post-load empty state to the `Отчет` tab on assignment pages.
- Give the participant a clear next action back to their own report flow.
- Disable report submission when the saved-report status lookup fails, so stale or not-owned assignment links do not continue into a later submit failure.
- Add read-only journey smoke coverage for the peer-report empty-state bundle copy.
- Add read-only journey smoke coverage for the saved-report status error submit guard.

## Non-Goals

- Do not create peer reports.
- Do not expose private participant submissions.
- Do not change random answer API semantics.
- Do not load catalog data.

## Acceptance Criteria

- [ ] Assignment peer-report tab renders a no-examples explanation when the random report request returns no answer.
- [ ] Empty-state copy directs the participant to submit their own report from `Мой отчет`.
- [ ] Assignment report submission is disabled when saved-report status cannot be loaded.
- [ ] `npm run check:journey` reports assignment peer-report empty-state and saved-status submit-guard UI coverage.
- [ ] Build, deploy, Browser QA, and validation evidence are recorded.
