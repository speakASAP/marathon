# Marathon Vision

```yaml
id: MAR-VISION
status: reviewed
owner: Product Owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/00_constitution/CONSTITUTION.md
downstream:
  - docs/intent/02_business_case/BUSINESS_CASE.md
  - docs/intent/04_systems/SYS-001-marathon-platform.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Original Intent

Marathon is a production-ready learning marathon platform where participants register for an active language-specific marathon, progress through scheduled assignments, unlock VIP-gated content through payment or gift code, submit reports, and see completion/winner outcomes.

## Vision Goals

| ID | Goal | Success Signal |
|---|---|---|
| VG-001 | Open registration only for launch-ready approved catalog data. | Public registration is available only when active marathon, product, gift, trial step, gated step, and assignment content exist. |
| VG-002 | Preserve participant progress and payment integrity. | Submissions, bonus days, late penalties, payment attempts, VIP state, and gift usage are auditable and not overwritten by unsafe imports. |
| VG-003 | Provide authenticated participant self-service. | Participants can view profile dashboard, current step, VIP state, saved reports, and next action after portal login. |
| VG-004 | Support operationally verified releases. | Readiness and journey checks run before live verification, deploy closure, or code commit. |
| VG-005 | Keep the frontend honest about readiness. | UI distinguishes registration closed, gift unavailable, API failure, auth required, and not-found states. |

## Non-Goals

- Do not recreate the archived legacy exporter as a direct production import path.
- Do not bulk-load user progress, participant answers, winners, or payment state without a new approved migration task.
- Do not expose secret callback keys, raw production participant data, or gift-code inventories in docs, prompts, logs, or examples.
- Do not open registration for partial catalog rows.

## Protected Assumptions

- Approved catalog data is the source of public registration and assignment content.
- Runtime payment callbacks are authoritative only when they match a recorded `MarathonPaymentAttempt`.
- Missing production catalog data is a launch blocker, not a frontend bug.
- `assignmentContent` must be approved plain text for every step before registration is launch-ready.

## Validation

Vision alignment is validated through:

- task traceability to a vision goal;
- project invariant checks;
- readiness preflight;
- guarded journey smoke verification;
- validation reports before task closure.
