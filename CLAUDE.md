# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pulse Board — an online polling platform. Admins create polls (questions + options + optionally pre-registered voters), share a link, and watch live analytics; respondents either log in (per-poll voter credentials) or submit anonymously, and the creator can publish final results to the same public link.

Two-workspace monorepo (`npm workspaces`): `backend/` (Express 5 JSON API + socket.io) and `frontend/` (React 19 + Vite 8 + Tailwind 4). One Postgres database. One session cookie shared between HTTP and WebSocket connections.

## Commands

```bash
# at repo root
npm install                         # installs both workspaces
npm run dev                         # concurrently starts BE :3000 and FE :5173
npm run dev:backend                 # backend only
npm run dev:frontend                # frontend only
npm test                            # runs tests in both workspaces
npm run build                       # builds frontend → frontend/dist
npm run migrate                     # runs sequelize migrations against backend DB

# inside backend/
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:migrate:undo
npm test                            # Jest+supertest; pretest drops & recreates the test DB
NODE_ENV=test npx jest tests/api/auth.test.js   # single file (skip pretest DB reset)
```

`backend/.env` is required — see `backend/.env.example`. Three random secrets needed: `SESSION_SECRET`, `CSRF_SECRET`, `COOKIE_SECRET` (all min 16 chars; generate with `crypto.randomBytes(32).toString('hex')`). `backend/src/config/env.js` validates the env via Zod and exits 1 on missing/invalid values — that's the reason every test/launch starts by checking the file.

In dev, Vite proxies `/api/*` and `/socket.io/*` to `http://localhost:3000` so the browser sees a single origin and session cookies "just work". In production, Express serves `frontend/dist/` itself with a SPA fallback (the `app.get(/^(?!\/api\/).*/, …)` line in `backend/src/app.js`) — also single origin, no CORS configured.

## Architecture

**Backend is a thin layered app.** The chain for every mutating route is roughly: `helmet → bodyparsers → cookieParser → session → passport → csrfProtection → router → validate(zod) → guard middleware → controller → emitter → response`. Read `backend/src/app.js` first when orienting — it shows the order.

**Two Passport strategies, one session.** `backend/src/auth/passport.js` registers `admin-local` (email + password against `Admin`) and `voter-local` (voterId + password scoped to a `customUrl` against `Voter`). `serializeUser` writes `{ type: 'admin' | 'voter', id, … }` into the session. Every guard middleware (`requireAdmin`, `requireVoter`) and every controller branch reads `req.user.type` — never duck-type on `req.user.voterId` or similar. `deserializeUser` re-hydrates from the DB on each request so a deleted voter or admin instantly loses access without a manual session sweep.

**CSRF is `csrf-csrf` (double-submit cookie).** Server sets `x-csrf-token` cookie (readable by JS); SPA's axios interceptor (`frontend/src/api/client.js`) reads the cookie and sends it as `X-CSRF-Token` header on every state-changing request. The first mutating request from a fresh page primes the cookie via `GET /api/auth/csrf-token`. Anonymous public submit is *not* exempt — every browser-driven mutation goes through CSRF; bot floods are blocked separately by `express-rate-limit` on `POST /api/public/elections/:customUrl/responses`.

**`Response` is the analytics source of truth.** Submissions write to `Responses` (`{electionId, voterId nullable, answers JSONB, ipHash}`). For authenticated mode, the same DB transaction also flips `Voter.voted = true`. Analytics queries reduce over `Responses.answers`, never over `Voter.responses` (that column is gone). When working on counts/charts/aggregations, always go through `Response`, not `Voter`.

**Lifecycle is three independent flags on `Election`.** `launched`, `ended`, `resultsPublished` are not a state machine and they're not the same thing — `end` stops accepting responses, `publish` shows the final results to the public link. `Election.isAcceptingResponses()` is the canonical "is this poll still open?" check (handles `launched && !ended && now < expiresAt`). Don't reimplement that logic in controllers; call the method.

**Two socket.io rooms per election.** `election:<id>:public` (everyone who hits `/e/:customUrl`) and `election:<id>:admin` (only the owning admin's session). Emitters live in `backend/src/sockets/emitters.js` — controllers import `emitResponseNew(electionId, payload)` and `emitElectionStatus(electionId, status)`, never the io instance directly. `response:new` only goes to the admin room (so respondents don't see live counts unless we explicitly opt them in); `election:status` goes to both. Session-aware room joins live in `backend/src/sockets/index.js` — `io.engine.use(sessionMiddleware)` shares the express-session cookie so socket connections authenticate against the same `req.user`.

**Frontend data flow:** TanStack Query owns server state, AuthContext owns the user. Mutations always invalidate the relevant query keys (e.g. updating an election invalidates `['election', id]`). The `useElectionSocket(electionId, customUrl)` hook on the analytics page joins the room on mount, subscribes to `response:new` / `election:status`, and triggers `qc.invalidateQueries(['analytics', id])` so the chart refetches. Don't implement client-side counters by mutating cache directly — let WS deltas trigger refetches.

## Migration files

- All migrations are dated 2026-05-10..13. Order is preserved by lexicographic sort (timestamps in filenames).
- We edit existing migration files in place rather than stacking `add-X-to-Y` migrations. The DB has no backwards-compat constraints; every Phase ran `db:drop && db:create && db:migrate` from scratch. Adding `ON DELETE CASCADE` to an existing FK or adding a column to a `createTable` is normal here.
- `Voter.responses` (the legacy ARRAY(INTEGER)) was deleted from the original `create-voter` migration entirely — there's no migration that adds and then removes it.

## Conventions worth knowing

- **Models stay thin** — `init` and `associate` only. Avoid resurrecting the legacy static helpers (`Election.add`, `Voter.createVoter`, etc.); use Sequelize's built-ins (`Election.create`, `findByPk`, `update`) directly in controllers. The one method on a model worth keeping is `Election.isAcceptingResponses()` — it encodes a non-trivial cross-field invariant.
- **Validators are Zod schemas under `backend/src/validators/`**, one file per resource. Routes wrap handlers with `validate({ body, params })` so controllers can trust `req.body` and `req.params`.
- **`onDelete: 'CASCADE'` is everywhere** in the FK constraints. Cleanup like "delete election → its questions/options/voters/responses go too" happens at the DB layer; controllers do a single `model.destroy()` and trust the cascade. Don't reintroduce manual `forEach(async)` cleanup — that was the bug the rewrite fixed.
- **CSRF token is server-issued, not user-typed.** When writing tests with supertest, use `tests/helpers/agent.js` which exposes `csrfToken()` to fetch a fresh token before each mutating request.
- **Tailwind v4 is CSS-first.** All theme tokens (`--color-brand-500`, etc.) live in `frontend/src/styles/tailwind.css` inside an `@theme {}` block — there is no `tailwind.config.js`. Adding a new color or font means editing that CSS file.
- **No `cors` package.** The deployment topology is single-origin (dev: Vite proxy; prod: Express serves SPA). If FE and BE ever live on different origins, add `cors({ origin: env.FRONTEND_ORIGIN, credentials: true })` and set the cookie's `sameSite: 'none'` + `secure: true` — but until then, don't.
- **Rate limit lives on one endpoint only.** `submitResponseLimiter` guards `POST /api/public/.../responses`. There's also an `authLimiter` (20/15m) on `/api/auth/login` and the public voter login. Don't sprinkle it elsewhere; admin endpoints rely on session auth.
