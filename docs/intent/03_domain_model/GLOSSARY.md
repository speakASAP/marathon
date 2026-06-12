# Marathon Domain Glossary

```yaml
id: MAR-GLOSSARY
status: reviewed
owner: Product Owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/01_vision/VISION.md
downstream:
  - docs/intent/04_systems/SYS-001-marathon-platform.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Core Terms

| Term | Meaning | Source / Validation |
|---|---|---|
| Marathon | Active language-specific course catalog participants register into. | `prisma/schema.prisma`, `/api/v1/marathons` |
| MarathonStep | Ordered assignment step belonging to a marathon. | Requires approved `assignmentContent`. |
| MarathonProduct | VIP product and price used by checkout. | Must exist for launch-ready catalog. |
| MarathonGift | Gift code that unlocks VIP once. | Must be unused for gift readiness. |
| MarathonParticipant | Participant registration and progress state. | Created by registration API. |
| MarathonPaymentAttempt | Ledger row created before checkout. | Payment callback must match it before unlocking VIP. |
| Assignment submission | Participant report for a step. | Created/updated through authenticated submissions API. |
| Launch-ready catalog | Active catalog with marathon, product, gift, trial step, gated step, and assignment content. | Checked by readiness script and public readiness endpoint. |

## Data Ownership

| Data Class | Owner | AI May Invent? |
|---|---|---|
| Product/course catalog | Product Owner | No |
| Assignment content | Product Owner | No |
| Participant profile/progress | Participant/system | No |
| Payment callback secret | Operations | No |
| Example JSON | Engineering | Yes, only synthetic and clearly marked |

## Critical Domain Rules

- Registration must fail unless the selected language has a launch-ready catalog.
- VIP checkout must use server-side product pricing.
- Gift code redemption must mark the gift used and unlock VIP in one validated operation.
- Assignment content is plain text.
- Historical full-export data is unsafe unless a future approved migration plan classifies and validates it.
