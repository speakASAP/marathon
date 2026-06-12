# Marathon Sensitive Data Policy

```yaml
id: MAR-SENSITIVE-DATA-POLICY
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/00_constitution/CONSTITUTION.md
downstream:
  - docs/intent/16_operations/PRE_CODING_GATE.md
  - docs/intent/12_validation/VAL-TASK-MAR-004.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Data Classes

| Class | Examples | Documentation Rule |
|---|---|---|
| Public | Endpoint names, non-secret route names, synthetic examples. | Allowed. |
| Internal | Service URLs, module names, validation status. | Allowed when useful and non-secret. |
| Sensitive | JWTs, callback API keys, payment payload secrets, private participant reports, full gift codes, personal contact details. | Do not store in docs, prompts, tests, or reports. |
| Synthetic | Fake participants, fake catalog examples, fake gift codes. | Allowed when clearly synthetic. |

## Masking Rules

- JWTs: never paste.
- Callback keys: never paste.
- Gift codes: show only masked form such as `GIFT-****-1234` when needed.
- Participant IDs/order IDs: show partial or labeled masked IDs.
- Private participant report text: summarize behavior, not content.

## Validation Evidence Rule

Validation reports should record command status, high-level result, masked IDs, and next action. They must not contain raw secrets or private participant data.
