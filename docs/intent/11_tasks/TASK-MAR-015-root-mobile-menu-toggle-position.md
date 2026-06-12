# TASK-MAR-015: Stabilize Root Mobile Menu Toggle Position

```yaml
id: TASK-MAR-015
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Keep the root mobile navigation toggle in a stable top-right position when the menu is opened.

## Scope

- Preserve the existing root hamburger menu behavior.
- Keep the brand and toggle on the first mobile header row.
- Place the expanded nav links on the following row.

## Non-Goals

- Do not change route targets.
- Do not change registration readiness gates.
- Do not load catalog data.

## Acceptance Criteria

- [x] Root mobile menu opens with the toggle still visible in the first header row.
- [x] Expanded menu links remain visible and usable.
- [x] Backend and frontend builds pass.
- [x] Deployment and Browser QA evidence are recorded.
