# VAL-TASK-MAR-004: VIP and Assignment Journey Validation

```yaml
id: VAL-TASK-MAR-004
status: partial
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-13
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
| Approved active catalog source identified | Pass | 2026-06-13 the user explicitly approved preparing Marathon data from the SpeakASAP legacy export. The separate migration task copied the 1.1 GB export remote-to-remote, verified checksum parity, and generated a launch-ready catalog without printing participant rows, gift-code values, JWTs, payment secrets, or assignment payloads. |
| Catalog dry run passes | Pass | 2026-06-13 catalog dry run passed with 13 active marathons, 377 steps with assignment content, 13 VIP products, and 13 gift-code inventory rows. |
| Catalog apply completed | Pass | 2026-06-13 runtime readiness after apply reported 13 active marathons, 377 steps, 377 steps with content, 13 products, 13 gifts, 13 unused gifts, and 53,469 participants. |
| Full legacy aggregate import completed | Pass | 2026-06-13 the separate visible migration task completed with aggregate target counts: 13 marathons, 377 steps, 13 products, 13 gifts, 53,469 participants, 238,674 submissions, and 18,603 winners. The report did not include participant rows, emails, gift-code values, answer payloads, JWTs, payment secrets, or full assignment content. |
| Readiness preflight passes | Pass | 2026-06-13 in-pod `npm run check:readiness -- --json` returned `ok: true` with payment environment checks and payment-attempt ledger availability passing. |
| Read-only journey smoke passes | Pass | 2026-06-13 `npm run check:journey -- --base-url https://marathon.alfares.cz` returned `Marathon journey smoke: ready`; all read-only checks passed, including `catalog-readiness`, language APIs, step detail, assignment content, registration shell, checkout handoff, gift guard, analytics, RunLayer tasks, and frontend guard states. Mutating checks remained skipped by design. |
| VIP payment or gift unlock verified | Blocked | [MISSING: approved authenticated smoke token plus either controlled checkout settlement evidence or single-use gift-code input. Do not paste gift-code values or tokens into docs.] |
| Assignment submit/readback verified | Blocked | [MISSING: approved participant auth token, marathoner ID, and step ID for a controlled mutating smoke submission/readback. Do not paste private report text or tokens into docs.] |
| Winner automation verified | Partial | Public winners endpoint shape is covered by journey smoke and legacy winner rows are present by aggregate import count. End-to-end new winner creation still requires controlled mutating completion proof. |
| Operational analytics verified | Pass | `GET /api/v1/marathons/analytics` and the journey smoke analytics assertion passed with aggregate catalog, registration, assignment, payment, gift, and winner metrics without participant PII. |

## Gate Evidence

- Pre-coding checklist: documentation-only IPS adoption/restoration performed before further source changes.
- Runtime readiness: passed from the deployed pod. Aggregate counts recorded in this report are limited to catalog and participant totals; no participant rows, emails, answer payloads, gift-code values, JWTs, payment secrets, or full assignment text are recorded.
- Journey smoke: passed in read-only mode against `https://marathon.alfares.cz`; mutating checks were intentionally skipped because they require explicit `--mutating` plus approved authenticated inputs.
- Migration status: the separate visible migration task completed the full aggregate import after adding a null-character sanitizer for legacy JSONB payloads. Final evidence is recorded only as aggregate counts and command status.

## Invariant Evidence

Applicable invariants are listed in `docs/intent/17_governance/PROJECT_INVARIANTS.md`. MAR-INV-002 is now satisfied for the active launch catalog by explicit user approval and runtime readiness evidence. MAR-INV-006 is satisfied for catalog/read-only verification, but the final end-to-end journey remains unproven until mutating registration/payment/gift/assignment checks pass with masked evidence.

## Sensitive-Data Scan Evidence

Pass for current report update: no JWTs, callback keys, full gift codes, payment secrets, raw participant private data, private answer payloads, or full assignment content are recorded here. Evidence is limited to aggregate counts, route names, command status, and blocker classes.

## Replay and Determinism Evidence

Read-only checks are replay-safe. Mutating checks are pending approved test inputs and must record masked created IDs.

## Issues Found

- Mutating live VIP/gift/assignment verification is blocked until approved authenticated test inputs exist and are recorded only as masked references.
- Intent-preservation files were present in the local scratch mirror but missing from the remote Marathon repository before this restoration slice, while `SYSTEM.md` already referenced them.

## Recommendation

Reject final release closure until mutating registration, VIP payment or gift unlock, assignment submission/readback, and completion/winner evidence are available. Keep implementation work active only when it improves the production journey, migration integrity, guardrails, or operational visibility without exposing sensitive data.

## Traceability Confirmation

The validation target remains aligned with Marathon vision goals and current known launch blockers.
