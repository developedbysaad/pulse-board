---
title: Architecture
description: How the backend, frontend, and realtime layers fit together.
---

## High-level

```
┌──────────────┐     ┌────────────────────────────┐     ┌────────────┐
│   Browser    │ ⇄  HTTP /api/*  + /socket.io/* ⇄  │  Express 5  │ ⇄ │ PostgreSQL │
│ React 19 SPA │                                    │  + Sequelize│   └────────────┘
│ + socket.io  │                                    │  + Passport │
└──────────────┘                                    │  + socket.io│
                                                    └─────────────┘
```

In **dev**: Vite serves the SPA on `:5173`, proxies `/api` and `/socket.io` to the backend on `:3000`. Browser sees one origin.

In **prod**: Express serves `frontend/dist/` *and* `docs/dist/` *and* `/api/*`. Single origin, no CORS configured.

## Backend layout

```
backend/src/
├── app.js · index.js                # Express app · HTTP server boot + socket.io
├── config/{db,env}.js               # DB config · zod-validated env
├── auth/passport.js                 # admin-local + voter-local strategies
├── middleware/                      # auth · csrf · rateLimit · validate · error
├── validators/                      # zod schemas, one per resource
├── routes/                          # /api/auth · /api/elections · /api/public
├── controllers/                     # JSON-only handlers
├── models/                          # Admin · Election · Question · Option · Voter · Response
├── sockets/{index,emitters}.js      # session-aware rooms
└── db/migrations/
```

The middleware chain for every mutating route runs roughly:

```
helmet → bodyParsers → cookieParser → session → passport
       → csrfProtection → validate(zod) → guard → controller → emit → respond
```

## Authentication

One `express-session` cookie powers both admins and voters. `serializeUser` writes `{ type: 'admin' | 'voter', id, … }` into the session. Every guard middleware (`requireAdmin`, `requireVoter`) and every controller branch reads `req.user.type` — never duck-typing on `voterId`.

The same session middleware is shared with socket.io (`io.engine.use(sessionMiddleware)`) so socket connections authenticate exactly like routes.

## CSRF

`csrf-csrf` (double-submit cookie) protects every state-changing request:

1. Server sets a JS-readable `x-csrf-token` cookie.
2. SPA's axios interceptor (`frontend/src/api/client.js`) reads the cookie and sends it as `X-CSRF-Token` header on every POST/PATCH/DELETE.
3. Middleware verifies cookie matches header.

The first mutating request from a fresh page primes the cookie via `GET /api/auth/csrf-token`. Anonymous public submit is *not* CSRF-exempt — bot floods are blocked separately by `express-rate-limit`.

## Lifecycle flags

`Election` carries three independent booleans, **not** a state machine:

| Flag                | Meaning                                               |
| ------------------- | ----------------------------------------------------- |
| `launched`          | Started accepting responses.                          |
| `ended`             | No longer accepting responses.                        |
| `resultsPublished`  | Final results visible at `/e/:customUrl/results`.     |

Plus `expiresAt` (optional timestamp). The `Election.isAcceptingResponses()` method is the canonical "is the poll open?" check — handles `launched && !ended && now < expiresAt`.

## Analytics source of truth

Submissions write to `Responses` (`{electionId, voterId nullable, answers JSONB, ipHash}`). For authenticated mode the same DB transaction also flips `Voter.voted = true`. All analytics queries reduce over `Responses.answers`, never over a column on `Voter`.

The legacy `Voter.responses` `ARRAY(INTEGER)` column was removed entirely — keyed by question array position, it broke whenever a question was added or removed.
