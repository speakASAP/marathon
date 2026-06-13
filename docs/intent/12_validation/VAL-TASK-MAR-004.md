# VAL-TASK-MAR-004: VIP and Assignment Journey Validation

```yaml
id: VAL-TASK-MAR-004
status: blocked
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: partial
upstream:
  - docs/intent/11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md
downstream: []
related_adrs:
  - docs/intent/07_decisions/ADR-002-catalog-only-loader.md
  - docs/intent/07_decisions/ADR-003-payment-attempt-ledger.md
  - docs/intent/07_decisions/ADR-004-plain-text-assignment-content.md
```

## Summary

Validation report for production registration, VIP unlock, gift redemption, assignment submission, saved report readback, winner automation, and aggregate operational analytics.

## Upstream Goal

VG-001 through VG-005 in `docs/intent/01_vision/VISION.md`.

## Criteria Checked

| Criterion | Result | Evidence |
|---|---|---|
| Approved active catalog source identified | Blocked | 2026-06-13 separate Alphares read-only data audit found legacy SpeakASAP catalog candidates, not a second live Marathon DB. TASK-MAR-053 adds redacted legacy fixture audit tooling; source-owner approved catalog JSON is still missing. |
| Catalog dry run passes | Not run | [MISSING: run after approved catalog source exists.] |
| Readiness preflight passes | Failed | 2026-06-12 deploy of `716fff5` ran runtime readiness and reported no active marathons, products, gifts, or steps. |
| Read-only journey smoke passes | Partial | 2026-06-12 `kubectl -n statex-apps exec deploy/marathon -- npm run check:journey` passed public shell, winners, analytics, login-return, guarded auth, and error-state checks; it failed only `catalog-readiness`. |
| VIP payment or gift unlock verified | Blocked | [MISSING: approved test participant/payment or gift-code input required.] |
| Assignment submit/readback verified | Blocked | [MISSING: approved participant auth token and step ID required.] |
| Winner automation verified | Partial | Public winners endpoint shape is covered by journey smoke; end-to-end winner creation remains blocked by missing catalog and participant completion data. |
| Operational analytics verified | Pass | `GET /api/v1/marathons/analytics` on `https://marathon.alfares.cz` returned aggregate catalog, participant, assignment, payment, gift, and winner metrics without participant PII. `/support` rendered the dashboard in Browser QA. |

## Gate Evidence

- Pre-coding checklist: documentation-only IPS adoption/restoration performed before further source changes.
- Runtime readiness: failed as expected because production catalog counts are zero (`activeMarathons=0`, `products=0`, `gifts=0`, `steps=0`, `stepsWithContent=0`).
- Journey smoke: partial pass; all read-only and guarded checks passed through `analytics-dashboard`, then `catalog-readiness` failed because launch catalog data is absent.
- Browser QA: `https://marathon.alfares.cz/support?qa=analytics-716fff5-fresh` rendered the operational dashboard, closed registration state, launch-gate note, and clean current `/support` console logs.

## Invariant Evidence

Applicable invariants are listed in `docs/intent/17_governance/PROJECT_INVARIANTS.md`. Current status is blocked by MAR-INV-002 because approved production catalog source is not recorded. MAR-INV-006 is partially satisfied for implementation slices through build/deploy/journey/browser evidence, but the final end-to-end journey remains unproven.

## Sensitive-Data Scan Evidence

Pass for current report update: no JWTs, callback keys, full gift codes, payment secrets, or raw participant private data are recorded here. Evidence is limited to aggregate counts, route names, commit hash, and masked/absent production state.

## Replay and Determinism Evidence

Read-only checks are replay-safe. Mutating checks are pending approved test inputs and must record masked created IDs.

## Issues Found

- Approved active production catalog JSON and owner approval are not documented; only legacy catalog candidates have been found.
- Live VIP/gift/assignment verification is blocked until catalog and approved test inputs exist.
- Intent-preservation files were present in the local scratch mirror but missing from the remote Marathon repository before this restoration slice, while `SYSTEM.md` already referenced them.

## Recommendation

Reject final release closure until catalog source and live verification evidence are available. Keep implementation work active only when it improves the production journey, guardrails, or operational visibility without inventing catalog/course data.

## Traceability Confirmation

The validation target remains aligned with Marathon vision goals and current known launch blockers.
