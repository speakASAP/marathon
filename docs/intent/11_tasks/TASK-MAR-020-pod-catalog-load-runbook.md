# TASK-MAR-020: Add Pod-Safe Catalog Load Runbook

```yaml
id: TASK-MAR-020
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the approved catalog load path directly executable from the alfares Marathon repository without requiring operators to manually stage catalog JSON inside the runtime pod.

## Scope

- Add a host-side helper that copies an approved catalog JSON file into the running Marathon pod.
- Run the existing catalog loader in the pod for dry-run or apply.
- Remove the staged pod copy after each run.
- Update operator docs and support UI runbook to use the helper.
- Add read-only journey smoke coverage for the support runbook copy.

## Non-Goals

- Do not change catalog data validation rules.
- Do not load or invent catalog content.
- Do not print gift-code inventories or participant data.
- Do not make registration open without approved catalog data.

## Acceptance Criteria

- [x] `npm run load:catalog:pod -- <catalog.json>` stages a file into the running Marathon pod and runs the existing loader.
- [x] The helper supports `--apply` and `--allow-incomplete` only.
- [x] The staged pod copy is removed after the run.
- [x] `/support` shows pod-safe dry-run/apply commands.
- [x] Build, deploy, smoke, and validation evidence are recorded.
