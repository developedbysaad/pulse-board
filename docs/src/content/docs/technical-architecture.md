---
title: Technical architecture
description: How the pieces fit. Request lifecycle, auth model, real-time, performance budget, and the trade-offs behind each.
---

For a higher-level overview, see [Architecture](/docs/architecture/). This page goes deeper on *why* each layer is the way it is, and on the performance / a11y / DX targets we hold the codebase to.

## Two workspaces, one origin

Pulse Board is an `npm workspaces` monorepo with three packages:

```
pulse-board/
├── backend/         Express 5 JSON API + socket.io
├── frontend/        React 19 + Vite 8 + Tailwind 4 SPA
└── docs/            Astro 6 + Starlight (this site)
```

In **dev**, Vite proxies `/api/*` and `/socket.io/*` to `:3000`, so the browser sees a single origin and session cookies "just work" without CORS configuration.

In **production**, Express serves the SPA bundle from `frontend/dist/` with a SPA fallback (`app.get(/^(?!\/api\/).*/, …)`). Same origin, no `cors` package, `sameSite: lax` cookies — simpler topology, smaller security surface.

If FE and BE ever live on different origins, add `cors({ origin: env.FRONTEND_ORIGIN, credentials: true })` and switch session cookie to `sameSite: none` + `secure: true`. Until then: don't.

## Request lifecycle

Every mutating route runs the same chain:

```
helmet
  → bodyparsers
  → cookieParser
  → session (express-session, pulse.sid)
  → passport.session()
  → csrfProtection (csrf-csrf, double-submit)
  → router
  → validate({ body, params }) (Zod)
  → guard middleware (requireAdmin / requireVoter / loadElectionByCustomUrl)
  → controller
  → emitter (socket.io rooms)
  → JSON response
```

Reading `backend/src/app.js` first is the fastest way to orient — it shows the order.

## Authentication

Two Passport strategies, **one** session:

| Strategy | Where it's used | Identity stored |
| --- | --- | --- |
| `admin-local` | `POST /api/auth/login`, `POST /api/auth/signup` | `{ type: "admin", id, name, email }` |
| `voter-local` | `POST /api/public/elections/:customUrl/voter-login` | `{ type: "voter", id, voterId, electionId }` |

`serializeUser` writes the typed identity to the session; `deserializeUser` re-hydrates from the DB on each request, so a deleted admin/voter loses access without a manual session sweep.

Every guard reads `req.user.type` — never duck-types on `req.user.voterId` or similar. There is no JWT, no refresh token, no localStorage-stored auth state. Cookies do all the work.

### Admin sign-in count

Per-browser only (`localStorage` in `frontend/src/lib/signinTally.js`). The backend doesn't track count-of-logins by Admin and doesn't fingerprint the browser or hash the IP for this purpose. We display 0 honestly — the page reads "first time on this browser? welcome." rather than fabricating a number.

### IP hashing for responses

`Response.ipHash` is computed via HMAC-SHA-256 keyed by `COOKIE_SECRET` and truncated to 32 chars. We never store raw IP. The hash is bucket-scoped to the deploy (rotating `COOKIE_SECRET` invalidates all hashes), and it's used only for ballot-stuffing heuristics — never surfaced to the admin UI.

## CSRF

We use [`csrf-csrf`](https://github.com/Psifi-Solutions/csrf-csrf) v4 in double-submit-cookie mode:

- The server sets a non-`HttpOnly` cookie `x-csrf-token` carrying `<plaintext>.<hmac>`. Non-HttpOnly is **deliberate** — the SPA reads it from `document.cookie` and echoes it as `X-CSRF-Token` on every state-changing request. The HMAC is keyed by `CSRF_SECRET` + `req.sessionID`, so a stolen cookie is useless without the matching session.
- The first mutating request from a fresh page primes the cookie via `GET /api/auth/csrf-token`. **That route writes `req.session.csrfPrimed = true`** so `saveUninitialized: false` doesn't drop the brand-new session. Without that one-line touch, the POST that follows would create a *different* session and the CSRF hash wouldn't match. (Real bug, fixed once.)

Anonymous public submission is *not* CSRF-exempt — every browser-driven mutation goes through the same gate. Bot floods are a separate concern handled by `express-rate-limit` on the public submit endpoint.

## Real-time

socket.io with `io.engine.use(sessionMiddleware)` so socket connections share `pulse.sid` and authenticate against the same `req.user`. Two rooms per election:

- `election:<id>:admin` — only the owning admin's session.
- `election:<id>:public` — everyone on the public ballot/results page.

Emitters live in `backend/src/sockets/emitters.js`. Controllers import `emitResponseNew(electionId, payload)` and `emitElectionStatus(electionId, status)` — they never touch the io instance directly. `response:new` only goes to the admin room; `election:status` goes to both. The frontend `useElectionSocket` hook joins the room on mount and re-invalidates the analytics query on each event.

## Database

Single Postgres database. Sequelize models in `backend/src/models/`. The lifecycle is **three independent flags** on `Election`, not a state machine:

- `launched` — accepts responses now (combined with `expiresAt` and `ended`).
- `ended` — explicit "stop" by the admin or via `expiresAt`.
- `resultsPublished` — flips the public results page on.

`Election.isAcceptingResponses()` is the canonical "is this poll still open?" check (handles `launched && !ended && now < expiresAt`). Don't reimplement that logic; call the method.

`Response` is the analytics source of truth. Submissions write to `Responses { electionId, voterId nullable, answers JSONB, ipHash }`. Analytics queries reduce over `Responses.answers`, never over `Voter.responses` (that legacy column is gone). For authenticated mode, the same DB transaction also flips `Voter.voted = true`.

`onDelete: 'CASCADE'` is everywhere — questions, options, voters, responses, subscribers all die with the election. Controllers do a single `.destroy()` and trust the cascade.

## Validation

Every route wraps its handlers with `validate({ body, params })` driven by Zod schemas in `backend/src/validators/`. Controllers can *trust* `req.body` and `req.params`. Zod errors become 400 responses with field-level details:

```json
{ "error": "Validation failed",
  "details": [{ "path": "email", "message": "Enter a valid email" }] }
```

The frontend forms (`react-hook-form` + the same Zod schemas — see `LoginPage`, `QuestionsTab`, `VotersTab`, `NotifyCTA`) **mirror** the backend rules so users see immediate feedback. Same length caps, same regex constraints. The two layers don't drift because limits are short enough to live in both files; if a constraint grew complex, we'd extract a shared `@pulse-board/validators` package.

## Frontend data flow

| Concern | Owner |
| --- | --- |
| Server cache | TanStack Query (`@tanstack/react-query`) |
| Auth user | `AuthContext` |
| Form state | `react-hook-form` + Zod |
| Route state | `react-router-dom` v7 |
| Real-time delta | `useElectionSocket` → invalidate query keys |

Mutations always invalidate the relevant query key. Live deltas on the analytics page **invalidate** `['analytics', id]` — they don't mutate cache directly. Letting React Query refetch keeps the source-of-truth singular and avoids "cache says X, but server says Y" drift.

## Performance budget

| Surface | Target | Current |
| --- | --- | --- |
| Initial JS (gzip) | <120 KB | ~93 KB |
| Initial CSS (gzip) | <10 KB | ~7 KB |
| Time to first response on `/` | <300ms (warm) | ~50ms (proxy/dev) |
| WS vote → admin dashboard | <300ms | ~80ms (LAN) |

Achieved by:

1. **Route-level code-splitting.** `App.jsx` lazy-imports every page except marketing/auth (which ships in the initial bundle so the very first paint is instant).
2. **Chart.js carved off.** AnalyticsPage is its own ~46KB chunk, only loaded for `/elections/:id/analytics`.
3. **Tailwind v4 only ships used utilities.** No purge step needed; the `@theme` block is the only place tokens live.
4. **No font-loading shifts.** Google Fonts are preconnected in `index.html` and we use `display=swap` + system fallbacks tuned by metric (Fraunces → Iowan Old Style, Inter → system-ui).

## Accessibility

- All four ink colour tokens carry text contrast targets (see [Design system](/docs/design-system/#colour-tokens)).
- Inputs labelled via `<Field label>` (which renders a `<label>` parent) — never via `placeholder` alone.
- `<button>` over `<a role="button">` everywhere except link-styled CTAs.
- `aria-busy` on the Suspense fallback and analytics spinners.
- Tab order is left-to-right, top-to-bottom — no `tabindex` overrides.
- Reduced-motion: repeating keyframes are decorative-only (`pulse-dot`, `marquee`). The user lands on a usable page even if motion is disabled.

## Testing

| Layer | Tool | Scope |
| --- | --- | --- |
| Backend integration | Jest + supertest | Auth flow, CSRF, election CRUD, public submit, analytics, results |
| Frontend unit | Vitest + Testing Library | Auth components |
| End-to-end | (none yet — Playwright is the right next step) | — |

The backend `pretest` hook drops & recreates `pulse_board_test` so every run starts from a known schema. Use `tests/helpers/agent.js` to fetch a fresh CSRF token before each mutating request.

## Deploy topology

- **Container:** Single Docker image built from `Dockerfile`, runs `node backend/src/index.js` and serves both API and SPA on port 3000.
- **Proxy + TLS:** `kamal-proxy` (replaces traditional Nginx). Atomic blue-green deploys, Let's Encrypt certs.
- **Database:** Managed Postgres (Neon / Supabase / RDS). SSL required in prod (`backend/src/config/db.js`).
- **CI:** GitHub Actions workflow `Deploy → Run workflow → production` runs `kamal deploy` against the configured environment.

See [Deploying with Kamal](/docs/deploying/) for the runbook.

— *Made by Saad · [x.com/developedbysaad](https://x.com/developedbysaad)*
