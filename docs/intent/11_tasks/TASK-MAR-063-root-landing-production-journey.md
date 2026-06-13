# TASK-MAR-063: Root Landing Production Journey

```yaml
id: TASK-MAR-063
status: in_progress
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
goal_id: frontend-readiness
priority: 1
upstream:
  - docs/intent/00_constitution/CONSTITUTION.md
  - docs/intent/01_vision/VISION.md
  - docs/intent/04_systems/SYS-001-marathon-platform.md
  - docs/intent/05_subsystems/SUB-001-registration-catalog.md
  - docs/intent/05_subsystems/SUB-002-vip-payments.md
  - docs/intent/05_subsystems/SUB-003-assignment-submissions.md
downstream:
  - frontend/src/pages/Home.tsx
  - frontend/src/landing.css
  - docs/intent/21_execution_plans/EP-TASK-MAR-063.md
  - docs/intent/12_validation/VAL-TASK-MAR-063.md
```

## Intent

Rebuild the root Marathon landing page so a visitor can understand the current production journey, choose a language, register, open their profile, and continue toward assignments, VIP unlock, finalists, and reviews.

## Scope

- Replace the legacy root home composition with a modern landing entry point.
- Keep language-specific pages as the registration deep links.
- Show production readiness counts without exposing participant private data.
- Preserve real backend flows for registration, profile, VIP checkout/gift redemption, and assignment submission.
- Reconcile stale Phase 1 documentation that still says catalog/payment/gift verification is pending or blocked.

## Out Of Scope

- Do not modify course catalog content, assignment text, prices, gift codes, participant progress, payment provider integration, or Kubernetes data.
- Do not expose JWTs, webhook keys, checkout URLs, gift codes, full participant identifiers, emails, or private reports.

## Acceptance Criteria

- Root `/` renders a production-ready landing entry point with a clear start path to language registration.
- The page reflects green Kubernetes/shared PostgreSQL readiness when the API reports registration open.
- Finalists and reviews remain read-only public teasers.
- Frontend build passes.
- Public journey smoke passes after deployment.
- Validation evidence is recorded in `VAL-TASK-MAR-063`.
