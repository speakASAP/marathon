# FEAT-002: Post-Marathon NPS Flow

```yaml
id: FEAT-002
status: active
owner: Product
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/01_vision/VISION.md
  - docs/intent/02_business_case/BUSINESS_CASE.md
```

## Intent

Collect participant satisfaction after a marathon is completed so Marathon can measure NPS as a production success metric.

## User Outcome

A completed participant can submit a 0-10 score and optional private note from their marathon profile. Operators see aggregate NPS health on the support dashboard.

## Guardrails

- Require authentication.
- Require participant ownership.
- Require completed marathon state.
- Do not expose raw comments or participant identifiers in analytics.
- Do not ask unfinished participants for NPS.

## Success Criteria

- Finished participants see a feedback panel.
- Unfinished participants do not see the panel.
- API rejects unauthenticated access.
- API rejects incomplete participant submissions.
- Support analytics includes PII-free NPS aggregates.
