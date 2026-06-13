# EP-TASK-MAR-062: VIP Checkout Customer Identity Execution Plan

```yaml
id: EP-TASK-MAR-062
status: complete
source_task: docs/intent/11_tasks/TASK-MAR-062-vip-checkout-auth-customer.md
validation: docs/intent/12_validation/VAL-TASK-MAR-062.md
```

## Steps

1. Extend the Auth client user shape returned by token validation to include safe contact fields needed by checkout.
2. Pass the full authenticated user object from `VipController` to `VipService.createCheckout`.
3. Build checkout customer data from participant contact fields first, then validated Auth user email/name/phone.
4. Keep checkout fail-closed when no email is available.
5. Extend `smoke:production-safe` to cover payment checkout, webhook settlement, VIP profile state, and ledger confirmation before the gift/winner/NPS flow.
6. Build, deploy a commit-based image, run guarded production-safe smoke, and re-run read-only journey/readiness checks.

## Risk Controls

- Do not store or print JWTs, webhook keys, gift-code values, checkout URLs, full IDs, emails, or report text.
- Keep phone-only Marathon registration for smoke so notifications are not sent from Marathon registration.
- Use synthetic Auth users and smoke-marked Marathon participants only.
- Preserve payment callback ledger validation for order, participant, product, amount, and currency.

## Result

Complete on 2026-06-13. The first deployed dirty-image smoke proved the original problem by failing checkout with missing customer email. The committed fix passes validated Auth user contact data into checkout, was deployed as image `localhost:5000/marathon:953b05d`, and passed guarded production-safe payment/gift/winner/NPS smoke plus readiness and journey checks.
