# TASK-MAR-042: Extend Marathon-First Branding Across Public Routes

```yaml
id: TASK-MAR-042
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/01_vision/VISION.md
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-041-public-marathon-branding.md
```

## Objective

Finish the Marathon-first public rebrand beyond the root page by updating language landing chrome and static information pages that users can visit before registration opens.

## Scope

- Make the language landing header/footer lead with Marathon.
- Make static About, Rules, FAQ, Awards, and Winners copy/titles Marathon-first where they name the product.
- Keep SpeakASAP as provider, certificate, legal, and auth-provider context.
- Extend read-only journey smoke coverage for public-route brand consistency.
- Record production validation evidence.

## Non-Goals

- Do not alter payment, gift, assignment, auth, or catalog data behavior.
- Do not remove legitimate SpeakASAP provider/legal references.
- Do not invent catalog data, winners, reviews, prices, assignment text, or gift codes.

## Acceptance Criteria

- [x] `/en/` language landing chrome shows Marathon as the primary brand.
- [x] Static information pages use Marathon-first titles/headings.
- [x] Smoke coverage protects language/static public brand markers.
- [x] Production Browser QA records root-adjacent public route evidence.
- [x] Validation is recorded in `docs/intent/12_validation/VAL-TASK-MAR-042.md`.

## Current Blocker

The full registration/payment/assignment journey remains blocked by missing approved catalog rows. This task only closes public-route rebrand consistency before that load.

## Verification Summary

- Commit: `0690852`.
- Deployed image: `localhost:5000/marathon:0690852`.
- `npm run check:journey` passes the expanded `public-marathon-branding` check and all frontend/read-only checks before the known `catalog-readiness` failure.
- Browser QA verified `/en/`, `/about`, `/rules`, and `/winners`; screenshots:
  - `/private/tmp/marathon-landing-en-0690852.png`
  - `/private/tmp/marathon-about-0690852.png`
  - `/private/tmp/marathon-rules-0690852.png`
  - `/private/tmp/marathon-winners-0690852.png`
