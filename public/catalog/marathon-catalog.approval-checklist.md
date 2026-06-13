# Marathon Catalog Source-Owner Approval Checklist

Use this checklist before any launch catalog JSON is applied to production. The checklist is for approval evidence only; keep the actual catalog JSON in the approved operational handoff location.

## Source Owner

- Owner name or team:
- Source-of-truth system or document:
- Catalog JSON file path on alfares:
- Intended launch date:

## Required Approval

Confirm every item before an operator runs `npm run load:catalog:pod -- <catalog.json> --apply`.

- [ ] If a legacy SpeakASAP fixture was used, `npm run audit:legacy-catalog` was run first and reviewed as source-discovery evidence only.
- [ ] If a legacy draft was generated with `npm run draft:legacy-catalog`, the owner replaced every incomplete placeholder before dry run.
- [ ] The file contains only `marathons`, `steps`, `products`, and `gifts`.
- [ ] The file contains no participants, users, answers, submissions, winners, payment attempts, JWTs, API keys, or assignment reports.
- [ ] Every active marathon has the intended `languageCode`, `title`, `slug`, and active state.
- [ ] Every active marathon has at least one trial step and at least one gated non-trial step.
- [ ] Every step has approved plain-text `assignmentContent`; do not include HTML.
- [ ] Every active marathon has exactly one approved VIP product with the intended title, price, and currency.
- [ ] Every active marathon has approved gift codes available for launch.
- [ ] Gift-code inventory was checked in the source-of-truth system, but full gift-code values are not pasted into this checklist or validation notes.
- [ ] The dry run completed without unsafe-key, duplicate-slug, duplicate-gift-code, missing-reference, or launch-readiness errors.
- [ ] The redacted approval packet was generated and reviewed.
- [ ] The dry-run `launchChecklist.marathons[]` shows `launchReady: true` for each active marathon.

## Operator Commands

Legacy source discovery only:

```bash
npm run audit:legacy-catalog -- --fixture /path/to/legacy/marathon.json --sql /path/to/legacy/marathon_de.sql
npm run draft:legacy-catalog -- --fixture /path/to/legacy/marathon.json --output /path/to/marathon-catalog-draft.json
```

These commands do not approve or import data. The draft remains incomplete until a source owner fills assignment content, VIP product price/currency, gift-code inventory, and launch activation.

Dry-run first:

```bash
npm run load:catalog:pod -- /path/to/marathon-catalog.json
```

Generate the redacted approval packet:

```bash
npm run load:catalog:pod -- /path/to/marathon-catalog.json --approval-packet
```

This command prints a Markdown approval packet with readiness flags and gift-code counts only.

Apply only after the approval packet is reviewed:

```bash
npm run load:catalog:pod -- /path/to/marathon-catalog.json --apply
```

Verify readiness after apply:

```bash
kubectl exec -n statex-apps deploy/marathon -- sh -lc 'cd /app && npm run check:readiness'
npm run check:journey -- --base-url https://marathon.alfares.cz
```

## Approval Record

- Dry-run timestamp:
- Dry-run operator:
- Source-owner approval timestamp:
- Apply operator:
- Post-apply readiness result:

Do not paste full gift-code inventories, participant exports, JWTs, payment keys, or assignment report payloads into this record.
