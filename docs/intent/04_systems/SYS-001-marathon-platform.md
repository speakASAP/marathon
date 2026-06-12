# SYS-001: Marathon Platform

```yaml
id: SYS-001
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/01_vision/VISION.md
  - docs/intent/02_business_case/BUSINESS_CASE.md
downstream:
  - docs/intent/05_subsystems/SUB-001-registration-catalog.md
  - docs/intent/05_subsystems/SUB-002-vip-payments.md
  - docs/intent/05_subsystems/SUB-003-assignment-submissions.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

Provide the production Marathon application: public discovery, registration, authenticated participant profile, assignment progress, VIP checkout/gift unlock, winner/review surfaces, readiness checks, and deployment support.

## Responsibilities

- Serve React frontend and NestJS API.
- Store catalog, participant, submission, gift, payment-attempt, winner, and review state in PostgreSQL.
- Validate JWTs with auth-microservice.
- Send payments through payments-microservice and validate callbacks.
- Expose readiness and journey verification hooks for operators.

## Non-Responsibilities

- Do not own portal identity issuance.
- Do not own card processing or payment provider settlement.
- Do not generate or approve course content.
- Do not bulk-migrate archived participant progress without a separate approved migration chain.

## Inputs

- Approved catalog JSON for loader.
- Public registration/profile/gift/assignment requests.
- JWTs from auth-microservice.
- Payment callbacks from payments-microservice.
- Runtime environment variables and Kubernetes secrets.

## Outputs

- Participant records and progress.
- Payment-attempt ledger and VIP state.
- Assignment submissions and reports.
- Public readiness status.
- Operational check results.

## Dependencies

- PostgreSQL database `marathon`.
- auth-microservice.
- notifications-microservice.
- logging-microservice.
- payments-microservice.
- Kubernetes namespace `statex-apps`.

## Upstream Traceability

- VG-001: Launch-ready approved catalog.
- VG-002: Participant progress and payment integrity.
- VG-003: Authenticated self-service.
- VG-004: Operationally verified releases.
- VG-005: Honest readiness UX.

## Downstream Artifacts

Subsystems, feature specs, task docs, execution plans, context packages, coding prompts, validation reports, and audits under `docs/intent/`.

## Validation Criteria

- `npm run check:readiness` passes in the runtime pod after approved catalog load.
- `npm run check:journey -- --base-url https://marathon.alfares.cz` passes in read-only mode.
- Mutating journey verification passes only with explicit approved inputs.
- IPS pre-coding checklist passes before future source edits.

## Open Questions

- [MISSING: provide approved production catalog JSON source and owner.]
- [MISSING: confirm first live VIP payment or gift-code verification participant.]
