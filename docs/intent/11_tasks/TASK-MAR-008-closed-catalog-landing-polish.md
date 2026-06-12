# TASK-MAR-008: Polish Closed-Catalog Landing State

```yaml
id: TASK-MAR-008
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Improve the rendered language landing fallback while production catalog data is absent, so visitors see honest launch status instead of active-marathon marketing copy for an unconfigured language.

## Scope

- Replace fallback `EN language`-style copy with natural language names where known.
- Show preparation/status copy when no active marathon exists.
- Keep mobile landing navigation readable without wrapping individual links.
- Preserve all registration readiness gates.

## Non-Goals

- Do not invent catalog/course content.
- Do not open registration.
- Do not change checkout, gift, assignment, or readiness API semantics.

## Acceptance Criteria

- [ ] `/en/` no-catalog hero says the marathon is being prepared.
- [ ] Mobile landing nav links do not split words/phrases across lines.
- [ ] Frontend build passes.
- [ ] Browser QA captures rendered evidence and console status.

