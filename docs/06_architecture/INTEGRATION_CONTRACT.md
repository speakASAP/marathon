# Integration Contract

## Purpose
This document records the repository-specific integration decisions for marathon and keeps the project within the actual runtime and governance scope it owns.

## Capability decisions
- auth: required — The project requires identity validation before service operations are accepted.
- postgres: required — The project persists state in the ecosystem PostgreSQL service.
- redis: not-applicable — No Redis coordination dependency is required for this repository.
- logging: required — Structured logging is required for runtime governance.
- notifications: required — Operational and user notifications are part of the project flow.
- ai: not-applicable — No AI capability is required in scope.
- payments: not-applicable — Payment processing is intentionally out of scope.
- catalog: not-applicable — Catalog ownership is outside the repository responsibility.
- orders: not-applicable — Order-processing integration is not part of the project boundary.
- warehouse: not-applicable — Inventory management is not part of the repository scope.
- invoices: not-applicable — The repo does not own invoice generation or billing flows.
- object-storage: not-applicable — No object-storage relationship is required by this project.
- event-bus: not-applicable — No event-bus contract is part of this repository scope.
- docs-rag: required — The repository is discoverable and traceable through the docs-RAG platform.
- monitoring: required — Runtime health and rollout signals are part of the repo ownership model.
- backups: not-applicable — No dedicated backup contract is required for this repo.

## Data ownership
The repository owns the project-local intent and validation evidence it maintains. It does not claim ownership of unrelated platform data or service-level state unless that boundary is explicitly implemented and documented.

## Authentication and authorization
For machine service identity, follow the sole canonical [`SERVICE_IDENTITY_CONSUMER_STANDARD.md`](../../../auth-microservice/docs/SERVICE_IDENTITY_CONSUMER_STANDARD.md). It is not reproduced here.

**Known non-conformance — do not copy or extend.** `ApiKeyGuard` (`src/shared/api-key.guard.ts`) accepts a static `x-api-key` matching either `MARATHON_ADMIN_API_KEY` (held by the speakasap portal as `MARATHON_API_KEY`) or `PAYMENT_WEBHOOK_API_KEY` (payments-microservice).

The admin-route usage is squarely service-to-service authentication and is non-conformant: a shared static key is not an Auth-issued RS256 principal per `(caller -> marathon)` pair, is not revocable per caller, and carries no `internal:marathon:<role>` claim. The guard also accepts either key on the same routes, so the payments webhook credential authenticates admin endpoints too — a single key grants the union of both callers' authority.

Inbound provider webhook verification is a distinct concern from caller identity, but it does not license reusing one shared key across admin routes and callers. Do not add new callers or routes to this guard; the fix is per-pair Auth-issued credentials for the internal callers, with webhook authenticity handled separately by provider signature verification.

## Synchronous dependencies
- central IPS repository for validator and template guidance
- shared ecosystem services only when the project genuinely owns the dependency

## Asynchronous dependencies
- event bus when the project genuinely emits or consumes shared messages
- documentation and validation records when the repository depends on the shared governance model

## Degraded operation
If a required dependency is unavailable, the repository must fail safely and surface the real operational condition in logs, validation records, or state rather than asserting false success.

## Validation
Validation checks are executed through the central IPS validator and must remain truthful to the project boundary.
