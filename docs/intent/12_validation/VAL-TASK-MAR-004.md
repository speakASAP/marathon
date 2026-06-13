# VAL-TASK-MAR-004: VIP and Assignment Journey Validation

```yaml
id: VAL-TASK-MAR-004
status: pass
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-13
completeness_level: complete
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
| Registration verified | Pass | 2026-06-13 controlled mutating smoke created a synthetic Auth user and registered a bound Marathon participant for active language `en`. Evidence records only masked user/participant/email references. |
| VIP payment unlock verified | Pass | 2026-06-13 controlled mutating smoke created a VIP checkout, then called the Marathon payment webhook with the runtime callback key from inside the pod. The profile changed from `type=trial`, `needsPayment=true` to `type=vip`, `needsPayment=false`. Evidence records only masked order/participant references and does not record callback key, JWT, full payment payload secret, or checkout URL. |
| Assignment submit/readback verified | Pass | 2026-06-13 controlled mutating smoke submitted one assignment for the smoke participant and read it back through the authenticated saved-submission API. Evidence records only masked submission/step references and does not record private report text or JWT. |
| Winner automation verified | Partial follow-up | Public winners endpoint shape is covered by journey smoke and legacy winner rows are present by aggregate import count. New winner creation from a fresh smoke participant was not forced because it would require creating a public finalist record and is outside T4 registration/VIP/assignment acceptance criteria. |
| Operational analytics verified | Pass | `GET /api/v1/marathons/analytics` and the journey smoke analytics assertion passed with aggregate catalog, registration, assignment, payment, gift, and winner metrics without participant PII. |

## Gate Evidence

- Pre-coding checklist: documentation-only IPS adoption/restoration performed before further source changes.
- Runtime readiness: passed from the deployed pod. Aggregate counts recorded in this report are limited to catalog and participant totals; no participant rows, emails, answer payloads, gift-code values, JWTs, payment secrets, or full assignment text are recorded.
- Journey smoke: passed in read-only mode against `https://marathon.alfares.cz`; mutating checks were intentionally skipped because they require explicit `--mutating` plus approved authenticated inputs.
- Migration status: the separate visible migration task completed the full aggregate import after adding a null-character sanitizer for legacy JSONB payloads. Final evidence is recorded only as aggregate counts and command status.
- Mutating smoke: a temporary runner executed inside the Marathon pod against `http://127.0.0.1:3000`. It created a synthetic Auth user, registered a bound Marathon participant, created checkout, settled the checkout through the Marathon payment webhook, verified VIP profile state, submitted one assignment, and verified saved-submission readback. Output was masked and omitted tokens, webhook key, full IDs, gift codes, email, checkout URL, and report text.

## Invariant Evidence

Applicable invariants are listed in `docs/intent/17_governance/PROJECT_INVARIANTS.md`. MAR-INV-002 is satisfied for the active launch catalog by explicit user approval and runtime readiness evidence. MAR-INV-004 is satisfied for the payment unlock path by checkout ledger creation plus webhook settlement proof. MAR-INV-006 is satisfied for T4 registration, VIP payment unlock, and assignment submit/readback verification with masked evidence.

## Sensitive-Data Scan Evidence

Pass for current report update: no JWTs, callback keys, full gift codes, payment secrets, raw participant private data, private answer payloads, or full assignment content are recorded here. Evidence is limited to aggregate counts, route names, command status, and blocker classes.

## Replay and Determinism Evidence

Read-only checks are replay-safe. The mutating smoke used a unique synthetic Auth user and participant, recorded only masked identifiers, did not consume gift codes, and should not be rerun with the same generated participant/order.

## Issues Found

- Gift-code redemption was not used in the final mutating smoke to avoid consuming real single-use gift inventory. VIP unlock was verified through the payment checkout/webhook path.
- New winner creation from a fresh smoke participant remains a follow-up verification item because forcing 29 smoke submissions would create a public finalist record.

## Recommendation

Accept T4 release verification for registration, VIP payment unlock, and assignment submit/readback. Keep the broader Marathon goal active only for any remaining frontend polish, follow-up winner-creation proof, or operational cleanup requested by the owner.

## Traceability Confirmation

The validation target remains aligned with Marathon vision goals and current known launch blockers.
