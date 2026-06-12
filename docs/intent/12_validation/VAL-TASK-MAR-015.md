# VAL-TASK-MAR-015: Root Mobile Menu Toggle Position Validation

```yaml
id: VAL-TASK-MAR-015
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-015-root-mobile-menu-toggle-position.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Backend build passes | Pass | 2026-06-12 remote `npm run build` completed. |
| Frontend build passes | Pass | 2026-06-12 remote `npm run build:frontend` completed and generated updated Vite assets. |
| Mobile toggle stays anchored | Pass | 2026-06-12 Browser QA on `https://marathon.alfares.cz/?qa=root-menu-anchor-29bc783` found the closed and open menu toggle at top/right `left=258 top=8 right=304 bottom=45`; `toggleInFirstRow=true`. Screenshot: `/private/tmp/marathon-root-menu-anchor-29bc783.png`. |
| Expanded menu links are usable | Pass | 2026-06-12 Browser QA found expanded links `Финалисты`, `Отзывы`, `О марафоне`, `Правила`, `Помощь`, `Мой профиль`, `Регистрация`, `Награды`, `Поддержка`, and `Скоро`, with nav row below the toggle. |
| Deployment passes | Pass | 2026-06-12 deployment rolled out image `localhost:5000/marathon:29bc783`; deployed pod `npm run check:journey` passed read-only checks until expected `catalog-readiness`. |

## Sensitive-Data Scan

Validation referenced only public root landing navigation state and aggregate readiness status. No JWTs, participant data, gift-code inventories, payment secrets, or assignment reports were recorded.
