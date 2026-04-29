# marathon — Platform Specification

> ⚠️ Human-editable sections are marked. AI agents may append to §Current State per module only.

---

## Overview

Marathon (marathon.alfares.cz) is a standalone product for intensive language learning marathon programs. The platform uses NestJS + Prisma on the backend and integrates with shared ecosystem microservices for authentication, notifications, and logging.

---

## Module 1: Marathons

> ⚠️ Human-editable

### Data Models

**Marathon** (Prisma): `id`, `languageCode`, `title`, `slug` (unique), `rulesTemplate`, `active`, `landingVideoUrl`, `vipGateDate`, `discountEndsAt`, `coverImageUrl`, `createdAt`, `updatedAt`

**MarathonProduct** (Prisma): `id`, `marathonId` (unique), `title`, `price`, `currency`, `totalHours` — defines the paid VIP product linked to a marathon.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/marathons` | None | List marathons; optional `?languageCode=` and `?active=true` filters |
| GET | `/api/v1/marathons/languages` | None | Distinct language codes with active marathon titles |
| GET | `/api/v1/marathons/by-language/:languageCode` | None | First active marathon for a language |
| GET | `/api/v1/marathons/:marathonId` | None | Marathon detail by ID |

### Business Rules

- Each marathon has a unique `languageCode` — at most one active marathon per language is served via `by-language`.
- `vipGateDate` controls when free participants are prompted to upgrade to VIP.
- `discountEndsAt` supports timed discount offers for VIP upgrades.

**Current State:** Marathon listing and detail endpoints operational.

---

## Module 2: Registrations

> ⚠️ Human-editable

### Data Models

**MarathonParticipant** (Prisma): `id`, `userId`, `marathonId`, `email`, `phone`, `name`, `isFree`, `vipRequired`, `paymentReported`, `bonusDaysLeft` (default 7), `canUsePenalty`, `active`, `reportHour`, `hasWarning`, `createdAt`, `finishedAt`

### Registration Flow

1. Client POSTs `{ email, phone?, name?, password?, languageCode? }` to `/api/v1/registrations`.
2. Service finds the latest active marathon matching `languageCode`.
3. Creates a `MarathonParticipant` record (`isFree: true`, `vipRequired: !!marathon.vipGateDate`).
4. Sends registration confirmation email via `notifications-microservice:3368`.
5. Returns `{ marathonerId, redirectUrl }` — `redirectUrl` points to frontend marathon page.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/registrations` | None | Register participant for the active marathon in given language |

### Anti-Chaos Rules

- AI must never create or modify `MarathonParticipant` records directly.
- VIP upgrade (payment) must route through `payments-microservice:3468`.

**Current State:** Registration endpoint operational. VIP payment upgrade not yet wired.

---

## Module 3: Steps & Submissions

> ⚠️ Human-editable

### Data Models

**MarathonStep** (Prisma): `id`, `marathonId`, `title`, `sequence`, `isPenalized`, `formKey`, `socialLink`, `isTrialStep`, `createdAt`, `updatedAt`. Unique on `(marathonId, sequence)`.

**StepSubmission** (Prisma): `id`, `participantId`, `stepId`, `startAt`, `endAt`, `isCompleted`, `isChecked`, `rating`, `payloadJson` (JSON), `createdAt`, `updatedAt`

**PenaltyReport** (Prisma): `id`, `participantId`, `completed`, `completeTime`, `value` (JSON), `createdAt`

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/steps?marathonId=` | None | List steps for a marathon ordered by sequence |
| GET | `/api/v1/steps/:stepId` | None | Step detail by ID |

### Step Lifecycle

- Steps are sequential (`sequence` field). Participants progress through one step per day.
- `isPenalized`: if the step is not completed on time, a `PenaltyReport` is created.
- `isTrialStep`: trial steps are available to free participants before VIP gate.
- `formKey`: links a step to a specific submission form (e.g. `Step11Form3` — final review form).
- `payloadJson` on `StepSubmission` stores structured form answers. Keys `q14`/`q15` on `Step11Form3` are participant review and thanks text used in winner profiles.

**Current State:** Steps listing operational. Submission creation not exposed via API (managed internally).

---

## Module 4: Answers (Peer Review Feed)

> ⚠️ Human-editable

### Purpose

Provides a peer-learning feed: participants can see a randomly selected completed submission from another participant for the same step.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/answers/random?stepId=&excludeMarathonerId=` | None | Random completed submission for a step, excluding the requester |

### Response Shape

```json
{
  "marathoner": { "name": "string" },
  "report": "<html report string>",
  "complete_time": "ISO datetime"
}
```

### Notes

- `report` is generated from `StepSubmission.payloadJson` as structured HTML.
- `excludeMarathonerId` prevents participants from seeing their own submission.

**Current State:** Answers endpoint operational.

---

## Module 5: My Marathons (Authenticated Participant View)

> ⚠️ Human-editable

### Purpose

Returns a logged-in user's marathon participations with their full step schedule and current progress.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/me/marathons` | JWT (auth-microservice) | List all marathon participations for the current user |
| GET | `/api/v1/me/marathons/:marathonerId` | JWT (auth-microservice) | Detail for one participation |

### Response Shape (`MyMarathon`)

| Field | Description |
|-------|-------------|
| `title` | Marathon title |
| `type` | `trial` / `free` / `vip` |
| `needs_payment` | True when VIP gate date passed and participant is still free |
| `registered` | Always `true` |
| `id` | `MarathonParticipant.id` |
| `bonus_total` | Total bonus days (7) |
| `bonus_left` | Remaining bonus days (`bonusDaysLeft`) |
| `can_change_report_time` | True if active, not a winner, and current step is not penalized |
| `report_time` | Last submission `endAt` ISO string |
| `current_step` | Latest `Answer` object |
| `answers` | Full step schedule (completed + projected future steps) |

### Participant Type Logic

| `vipRequired` | `isFree` | `type` |
|---|---|---|
| true | true | `trial` |
| false | true | `free` |
| any | false | `vip` |

**Current State:** Authenticated participant view operational.

---

## Module 6: Winners & Leaderboard

> ⚠️ Human-editable

### Data Models

**MarathonWinner** (Prisma): `id`, `userId`, `goldCount`, `silverCount`, `bronzeCount`, `createdAt`. Indexed on medal counts descending.

### Medal Logic

| State | Condition |
|-------|-----------|
| Gold | `canUsePenalty = true` AND `bonusDaysLeft >= 7` (no penalties used, full bonus) |
| Silver | `bonusDaysLeft >= 7` AND no incomplete penalty reports |
| Bronze | All steps completed but penalties used |

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/winners?page=&limit=` | None | Paginated winner leaderboard (default 24/page, max 30) |
| GET | `/api/v1/winners/:winnerId` | None | Winner detail with reviews; resolves name/avatar from auth-microservice |

### Performance Note

`GET /winners` is intentionally DB-only (no auth-microservice call) for fast list rendering. Name resolution happens only in `GET /winners/:winnerId` for the detail modal.

**Current State:** Winners leaderboard and detail endpoints operational.

---

## Module 7: Reviews

> ⚠️ Human-editable

### Purpose

Static hardcoded testimonials displayed on the landing page. Not database-driven.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/reviews` | None | List static testimonial reviews |

**Current State:** Reviews endpoint operational (static data).

---

## Module 8: Gifts

> ⚠️ Human-editable

### Data Models

**MarathonGift** (Prisma): `id`, `marathonId`, `code` (unique), `createdAt`, `usedAt`, `redeemedByUserId`

### Purpose

Gift codes allow free VIP access to a marathon. A gift code is redeemed to unlock VIP participation without payment.

**Current State:** Gift model exists in schema. Gift redemption API not yet implemented.

---

## Module 9: VIP Payments

> ⚠️ Human-editable

### Purpose

Participants who start free and hit the `vipGateDate` are prompted to upgrade to VIP (`MarathonProduct`). Payment must route through `payments-microservice:3468`.

### Blockers

| ID | Blocker | Impact |
|----|---------|--------|
| **P0** | VIP upgrade payment flow not wired to payments-microservice | VIP upsell non-functional |
| **P1** | `paymentReported` flag on `MarathonParticipant` — no webhook handler to set it | Payment confirmation not persisted |

**Current State:** VIP payment flow not implemented. `MarathonProduct` prices exist in DB but no checkout endpoint exists.

---

## Orchestrator Integration

> ⚠️ Human-editable

### MCP Paths

| Resource | Path |
|----------|------|
| Service root | `marathon/` |
| Spec (this file) | `marathon/SPEC.md` |
| Current state | `marathon/STATE.json` |
| Task backlog | `marathon/TASKS.md` |
| Business constraints | `marathon/BUSINESS.md` |
| System integrations | `marathon/SYSTEM.md` |
| Prisma schema | `marathon/prisma/schema.prisma` |

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Service listen port (3000) |
| `SERVICE_NAME` | `marathon` |
| `DATABASE_URL` | PostgreSQL via database-server:5432 |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | Redis connection |
| `AUTH_SERVICE_URL` | auth-microservice:3370 |
| `NOTIFICATION_SERVICE_URL` | notifications-microservice:3368 |
| `LOGGING_SERVICE_URL` | logging-microservice:3367 |
| `LOGGING_SERVICE_API_PATH` | `/api/logs` |
| `FRONTEND_URL` | Base URL for registration redirect |
| `CORS_ORIGIN` | Allowed CORS origins |

### Anti-Chaos Rules

- AI must never modify `MarathonStep` content (title, formKey, sequence) without human review.
- AI must never process payments directly — all payments via `payments-microservice:3468`.
- User progress data (`StepSubmission`, `PenaltyReport`) is private — no bulk export without human approval.
