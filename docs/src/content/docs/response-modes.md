---
title: Response modes
description: Authenticated vs. anonymous — pick the right mode per poll.
---

Each poll has a `mode` set at creation:

## Authenticated

- The admin pre-registers voters with `voterId` + `password`.
- Voters hit `/e/:customUrl`, get redirected to `/e/:customUrl/voterLogin`, sign in, then vote.
- Each voter can submit exactly once — `Voter.voted` flips `true` and the submit endpoint returns `409 Conflict` on retry.
- Analytics shows participation: `responses / total registered voters`.

Use when: you have a known list of eligible respondents (employees, club members, ticket holders).

## Anonymous

- No login required. Anyone with the link submits.
- No `Voter` row created — the `Response` is written with `voterId: null` and an `ipHash` for stuffing protection.
- **Re-submission is blocked in three layers** (defence in depth):
  - **Session** — `req.session.votedIn = [electionId, …]` is the canonical "you voted" record. Per-browser, accurate, persists across reloads/tabs/closes for the lifetime of the session cookie (24h). Re-submit returns `409 You've already voted in this poll. Thanks!`
  - **`ipHash`** — HMAC-SHA-256 of the request IP, keyed by `COOKIE_SECRET`. Catches the case where someone clears their cookies and reloads from the same network. Re-submit returns `409 Looks like a vote was already recorded from this network.`
  - **`localStorage`** — `pb.votedIn` in the SPA, set on submit. Lets the FE redirect to `/thanks` instantly on revisit, before the API even responds.
- Rate limiting (`express-rate-limit`) caps brute-force bursts on top of all three — 100 submits per 15 min per IP by default; tunable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`.

Honest scope: a determined voter can still re-vote by clearing cookies AND switching networks. That's an intentional trade-off — tighter checks would break shared-network legitimate voters (NAT, libraries, cafés). For high-stakes counts, use authenticated mode.

Use when: open feedback, public surveys, NPS-style polling where the audience isn't pre-known.

## Switching modes

You can change mode anytime *before* launch via the Settings tab. Once launched the mode is locked, since changing it mid-flight would orphan responses and confuse the auth flow.

## What changes server-side

| Behavior                          | Authenticated         | Anonymous          |
| --------------------------------- | --------------------- | ------------------ |
| Voter login required              | Yes (`voter-local`)   | No                 |
| `Voters` rows used                | Yes                   | No                 |
| `Response.voterId`                | FK to `Voters.id`     | `NULL`             |
| Duplicate submit prevention       | DB flag + check       | None (rate limit only) |
| Participation in analytics        | `n / total_voters`    | Absolute count only |
| CSRF protection                   | Yes                   | Yes                |
| Per-IP rate limit                 | Yes (shared limiter)  | Yes                |
