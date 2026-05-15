---
title: Database schema
description: Tables, foreign keys, and the JSONB shape of Responses.answers.
---

PostgreSQL, seven tables managed by Sequelize. Every foreign key has `ON DELETE CASCADE` so a single `Election.destroy()` cleans up the entire tree.

```
Admins ──┬── Elections ──┬── Questions ── Options
         │               ├── Voters ───── Responses
         │               ├── Responses ◄──┘
         │               └── Subscribers
         └─ (no other parents)
```

## Admins

| Column     | Type      | Notes                                  |
| ---------- | --------- | -------------------------------------- |
| id         | INT PK    |                                        |
| name       | STRING    | not null                               |
| email      | STRING    | not null, unique, validated as email   |
| password   | STRING    | bcrypt hash                            |
| createdAt  | DATE      |                                        |
| updatedAt  | DATE      |                                        |

## Elections

| Column            | Type           | Notes                                            |
| ----------------- | -------------- | ------------------------------------------------ |
| id                | INT PK         |                                                  |
| adminId           | INT FK         | → Admins.id, CASCADE                             |
| name              | STRING         | not null                                         |
| mode              | ENUM           | `'authenticated' \| 'anonymous'`, default auth   |
| customUrl         | STRING UNIQUE  | public link slug                                 |
| launched          | BOOL           | default false                                    |
| ended             | BOOL           | default false                                    |
| resultsPublished  | BOOL           | default false — independent of `ended`           |
| expiresAt         | DATE           | nullable                                         |
| createdAt         | DATE           |                                                  |
| updatedAt         | DATE           |                                                  |

`Election.isAcceptingResponses()` is the canonical "is the poll open?" check — handles `launched && !ended && (expiresAt == null || now < expiresAt)`.

## Questions

| Column      | Type    | Notes                                    |
| ----------- | ------- | ---------------------------------------- |
| id          | INT PK  |                                          |
| electionId  | INT FK  | → Elections.id, CASCADE                  |
| title       | STRING  | not null                                 |
| description | TEXT    | nullable                                 |
| isRequired  | BOOL    | default true                             |

## Options

| Column     | Type    | Notes                                    |
| ---------- | ------- | ---------------------------------------- |
| id         | INT PK  |                                          |
| questionId | INT FK  | → Questions.id, CASCADE                  |
| label      | STRING  | not null (renamed from legacy `option`)  |

## Voters

| Column      | Type    | Notes                                                    |
| ----------- | ------- | -------------------------------------------------------- |
| id          | INT PK  |                                                          |
| electionId  | INT FK  | → Elections.id, CASCADE                                  |
| voterId     | STRING  | not null; **unique together with electionId**            |
| password    | STRING  | bcrypt hash                                              |
| voted       | BOOL    | default false; flipped true on first submit              |

## Responses

| Column     | Type        | Notes                                                  |
| ---------- | ----------- | ------------------------------------------------------ |
| id         | INT PK      |                                                        |
| electionId | INT FK      | → Elections.id, CASCADE                                |
| voterId    | INT FK      | → Voters.id, CASCADE; **NULL for anonymous mode**     |
| answers    | JSONB       | not null — `[{ questionId, optionId }, …]`             |
| ipHash     | STRING      | nullable; HMAC-SHA256 of submitter IP for abuse audits |
| createdAt  | DATE        | acts as `submittedAt`                                  |

Indexed on `electionId` for analytics queries.

## Subscribers

| Column     | Type                       | Notes                                                            |
| ---------- | -------------------------- | ---------------------------------------------------------------- |
| id         | INT PK                     |                                                                  |
| electionId | INT FK                     | → Elections.id, CASCADE; nullable (reserved for future global subs) |
| email      | STRING                     | not null                                                         |
| notifyOn   | ENUM                       | `'results' \| 'all'`, default `'results'`                       |
| createdAt  | DATE                       |                                                                  |
| updatedAt  | DATE                       |                                                                  |

Composite unique index on `(email, electionId)` — one subscription per email per election. Backs the public `POST /api/public/elections/:customUrl/subscribe` endpoint and the email Brevo sends when results publish.

### Why JSONB and not a join table

The legacy schema stored `Voter.responses` as `ARRAY(INTEGER)` keyed by question array position. That broke whenever a question was added or removed mid-poll — array index 2 might mean different questions over time.

Storing `[{ questionId, optionId }]` on each `Response` makes each answer self-describing. Analytics aggregation reduces over the array in JavaScript today; for very large polls, swap in a SQL `GROUP BY answers->>'questionId', answers->>'optionId'` without changing the storage format.

## Migrations

All migration files use 2026-05-10..13 timestamps in `YYYYMMDDHHMMSS-name.js` format and live in `backend/src/db/migrations/`. Editing the original migration in place is preferred over stacking `add-X-to-Y` files — there are no production databases that depend on the migration history.
