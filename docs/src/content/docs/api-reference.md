---
title: REST API reference
description: All HTTP endpoints under /api with auth, body shapes, and status codes.
---

All routes are JSON. State-changing requests (`POST`, `PATCH`, `DELETE`) require an `X-CSRF-Token` header — see [Architecture → CSRF](/docs/architecture/#csrf).

`/api/auth/csrf-token` (GET) issues a fresh token and sets the matching cookie.

## Auth (admin)

| Method | Path                              | Notes                              |
| ------ | --------------------------------- | ---------------------------------- |
| GET    | `/api/auth/me`                    | Returns `{ user: null \| { type, id, … } }` |
| GET    | `/api/auth/csrf-token`            | Issues CSRF cookie + returns token |
| POST   | `/api/auth/signup`                | `{ name, email, password }` — creates admin + session |
| POST   | `/api/auth/login`                 | `{ email, password }` — rate-limited (20/15min/IP)    |
| POST   | `/api/auth/logout`                | Destroys session                   |
| POST   | `/api/auth/forgot-password`       | `{ email }` — always returns 200; sends a reset email if the account exists. Rate-limited (20/15min/IP). |
| POST   | `/api/auth/reset-password`        | `{ token, password }` — consumes a hex token from the reset email, sets new password. 400 if token expired / already used / invalid. |
| PATCH  | `/api/auth/profile`               | `{ name, email, password? }`       |

### Password-reset flow

1. Admin posts `/forgot-password` with their email.
2. Server looks up the `Admin`. **If found**, it invalidates any outstanding `PasswordReset` rows for that admin, generates a 64-char random hex token, stores only its SHA-256 hash with a 15-minute `expiresAt`, and fires a Brevo email (fire-and-forget) with `https://${PUBLIC_ORIGIN}/reset-password?token=<rawToken>`. **If not found**, the server takes no action.
3. Response shape is identical either way (`{ ok: true, message: "If an account exists for that email, a reset link is on its way." }`) so the endpoint can't be used to enumerate accounts.
4. Admin opens the link and posts `/reset-password` with `{ token, password }`.
5. Server SHA-256s the token, looks up the matching `PasswordReset` row, verifies it isn't used or expired, bcrypt-hashes the new password onto the `Admin`, and marks the token row `usedAt = NOW()`.

Raw tokens never hit disk — a DB leak can't be used to hijack a pending reset. Tokens are single-use; re-submitting a successful link returns 400. The 15-minute TTL matches the industry standard for transactional password-reset links.

## Elections (admin only)

| Method | Path                                | Body / notes                       |
| ------ | ----------------------------------- | ---------------------------------- |
| GET    | `/api/elections`                    | Lists the admin's polls            |
| POST   | `/api/elections`                    | `{ name, mode?, expiresAt?, customUrl? }` — slug auto-generated from `name` if absent |
| GET    | `/api/elections/slug-available`     | Query: `?slug=foo&excludeId=42`. Returns `{ available: true }` or `{ available: false, reason, suggestion? }` (`reason` ∈ `taken \| reserved \| not-canonical`) |
| GET    | `/api/elections/:id`                | Detail with questions, options, voters |
| PATCH  | `/api/elections/:id`                | Update name/customUrl/mode/expiresAt — locked once `launched`. Slug uniqueness validated; 409 on collision |
| DELETE | `/api/elections/:id`                | Cascade-deletes everything (incl. subscribers) |
| POST   | `/api/elections/:id/launch`         | Validates ≥1 question, ≥2 options each, ≥1 voter (auth mode) |
| POST   | `/api/elections/:id/end`            | Stops accepting submissions        |
| POST   | `/api/elections/:id/publish`        | Requires `ended === true`. Triggers Brevo notify to subscribers (fire-and-forget) |
| POST   | `/api/elections/:id/unpublish`      | Reverts publish                    |
| GET    | `/api/elections/:id/analytics`      | Live per-question counts + participation. Includes `election: { id, name, customUrl }` |

### Nested resources

| Method | Path                                                                     |
| ------ | ------------------------------------------------------------------------ |
| GET / POST   | `/api/elections/:id/questions`                                     |
| PATCH / DELETE | `/api/elections/:id/questions/:qid`                              |
| POST   | `/api/elections/:id/questions/:qid/options`                              |
| PATCH / DELETE | `/api/elections/:id/questions/:qid/options/:oid`                 |
| GET / POST   | `/api/elections/:id/voters`                                        |
| PATCH / DELETE | `/api/elections/:id/voters/:vid`                                 |

## Public

No admin session required. Voter-login starts a per-voter session for `mode === authenticated` polls.

| Method | Path                                                | Notes                       |
| ------ | --------------------------------------------------- | --------------------------- |
| GET    | `/api/public/elections/:customUrl`                  | Ballot read. Sets `alreadyVoted` based on session + `ipHash` (anon mode) or `Voter.voted` (auth mode) |
| POST   | `/api/public/elections/:customUrl/voter-login`      | `{ voterId, password }`, rate-limited |
| POST   | `/api/public/elections/:customUrl/voter-logout`     |                             |
| POST   | `/api/public/elections/:customUrl/responses`        | `{ answers: [{questionId, optionId}] }` — rate-limited per IP. 409 on duplicate vote (session match) or "vote already recorded from this network" (ipHash match) |
| GET    | `/api/public/elections/:customUrl/results`          | 404 unless `resultsPublished`        |
| POST   | `/api/public/elections/:customUrl/subscribe`        | `{ email }` — opt-in for the results email. Idempotent; rate-limited |

## Errors

| Status | Meaning                                              |
| ------ | ---------------------------------------------------- |
| 400    | Validation failure (`details: [{path, message}]`)    |
| 401    | Authentication required                              |
| 403    | CSRF rejected, or wrong owner                        |
| 404    | Resource not found / results not published           |
| 409    | Lifecycle conflict (already launched, voted, etc.)   |
| 410    | Poll expired or ended — submit refused               |
| 429    | Rate limit exceeded                                  |
