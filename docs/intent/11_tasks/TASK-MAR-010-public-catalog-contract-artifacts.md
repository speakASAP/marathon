# TASK-MAR-010: Publish Catalog Contract Artifacts

```yaml
id: TASK-MAR-010
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the catalog-only schema and example accessible from the deployed Marathon service so source owners and operators can retrieve the exact handoff contract without SSH access.

## Scope

- Publish the catalog schema and shape-only example as static frontend artifacts.
- Link the schema, example, and readiness API from the `/support` launch runbook.
- Preserve the no-progress-import and sensitive-data constraints.

## Non-Goals

- Do not publish real catalog content.
- Do not publish gift-code inventories.
- Do not add a mutating upload/import endpoint.
- Do not open registration.

## Acceptance Criteria

- [ ] `/catalog/marathon-catalog.schema.json` is served by production.
- [ ] `/catalog/marathon-catalog.example.json` is served by production and contains placeholder-only values.
- [ ] `/support` links to schema, example, and readiness API from the launch runbook panel.
- [ ] Browser QA and static curl checks pass after deploy.

