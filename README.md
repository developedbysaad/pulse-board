# Pulse Board

> **Live:** <https://pulse-board.developedbysaad.com>
> **Docs:** <https://pulse-board.developedbysaad.com/docs/>

A real-time online polling platform. Admins create polls (questions, options, voters), share a link, and watch responses arrive live; respondents fill out a ballot and the creator can publish final results to the same URL.

## What's in the box

- **Single-option questions** with required / optional flag.
- **Two response modes** per poll: authenticated (pre-registered voter login) or anonymous (open link).
- **Expiry & lifecycle** — separate "launch", "end", and "publish results" actions; optional `expiresAt` timestamp.
- **Live analytics** — per-question option counts and participation, streamed over WebSockets.
- **Public results** — once published, anyone with the poll link sees the final outcome.

## Stack

| Layer        | Tech                                                                |
| ------------ | ------------------------------------------------------------------- |
| Backend API  | Node.js, **Express 5**, Sequelize 6 + Postgres, Passport sessions   |
| Realtime     | **socket.io 4** with per-election admin/public rooms                |
| Security     | helmet, **csrf-csrf** (the npm package; double-submit-cookie CSRF protection), express-rate-limit |
| Validation   | **Zod 4** schemas, shared between request validation and FE forms   |
| Frontend     | **React 19**, **Vite 8**, **Tailwind 4** (CSS-first), React Router 7 |
| Docs site    | **Astro 6** + **Starlight 0.39** at `/docs` — same origin           |
| Data fetching | **@tanstack/react-query 5**                                        |
| Testing      | Jest + supertest (BE), Vitest + Testing Library (FE)                |
| Deploy       | **Docker** + **Kamal 2** + GitHub Actions (manual dispatch)         |

## Repo layout

```
pulse-board/
├── backend/                          # Express 5 JSON API + socket.io
│   └── src/{app,index,config,auth,middleware,validators,routes,controllers,models,sockets,db}
├── frontend/                         # React 19 + Vite 8 + Tailwind 4
│   └── src/{main,App,router,api,lib,hooks,context,pages,components,styles}
├── docs/                             # Astro 6 + Starlight — served at /docs in prod
│   └── src/content/docs/
├── config/
│   └── deploy.yml                    # Kamal deploy config
├── .kamal/
│   ├── secrets                       # gitignored; templated from env
│   └── hooks/pre-deploy              # runs sequelize migrations
├── .github/workflows/deploy.yml      # workflow_dispatch → Kamal
├── Dockerfile                        # multi-stage: deps → build → runtime
├── public/images/                    # in-app screenshots — consumed by /docs and the pitch deck
├── plan/todo.md
├── CLAUDE.md
└── package.json                      # npm workspaces root
```

## Local development

Prerequisites:

- Node.js 20+ (Express 5, Vite 8 require it)
- PostgreSQL 14+ running locally

Install everything once at the root:

```bash
npm install
```

Configure `backend/.env` (copy `backend/.env.example`):

```bash
cp backend/.env.example backend/.env
# Generate the three secrets:
node -e "for (const k of ['SESSION_SECRET','CSRF_SECRET','COOKIE_SECRET']) console.log(k+'='+require('crypto').randomBytes(32).toString('hex'))"
# Paste into backend/.env, then fill in DEV_DB_* / TEST_DB_* values
```

Create the dev DB and run migrations:

```bash
cd backend
npx sequelize-cli db:create
npx sequelize-cli db:migrate
cd ..
```

Run all three servers (backend, React SPA, Starlight docs) in parallel from the repo root:

```bash
npm run dev
# backend  → http://localhost:3000
# frontend → http://localhost:5173 (Vite proxies /api and /socket.io to backend)
# docs     → http://localhost:4321/docs/
```

Open http://localhost:5173, sign up, and start creating polls. Read the docs at http://localhost:4321/docs/.

## Tests

**Backend** (needs a TEST_DB_*, drops/recreates on each run):

```bash
npm test --workspace backend
```

**Frontend** (Vitest + Testing Library):

```bash
npm test --workspace frontend
```

**Both:**

```bash
npm test
```

## Production build

`npm run build` builds the React SPA into `frontend/dist/` and the Starlight docs into `docs/dist/`. The Express server (when `NODE_ENV=production`) static-serves both:

- `/api/*` → JSON API
- `/docs/*` → Starlight site (returns 404 for missing pages, doesn't fall through to SPA)
- everything else → React SPA (`index.html` fallback)

Single origin, no CORS configuration needed.

```bash
NODE_ENV=production npm run build
NODE_ENV=production node backend/src/index.js
```

## Deploy (Kamal 2 + GitHub Actions)

```
Dockerfile               # multi-stage: install → build FE+docs → slim runtime
config/deploy.yml        # Kamal config (ERB-templated from env vars)
.kamal/secrets           # gitignored; references SESSION_SECRET / POSTGRES_PASSWORD / etc.
.kamal/hooks/pre-deploy  # runs `npx sequelize-cli db:migrate` on each deploy
.github/workflows/deploy.yml   # manual dispatch only — see workflow inputs below
```

The deploy workflow is **manual-dispatch only** (`on: workflow_dispatch`). There is no auto-deploy on push. Two inputs at run time:

- **`ref`** — branch, tag, or commit SHA to deploy. Defaults to `main`.
- **`action`** — `deploy` (default), `redeploy`, `rollback`, or `proxy-reboot`.

For the full step-by-step "from a blank GitHub repo to a live URL" runbook, see [`plan/setup.md`](plan/setup.md) — including the [TL;DR go-live checklist](plan/setup.md#tldr--go-live-checklist) at the top. The tables below are the secret reference the runbook points at.

### Required GitHub Environment secrets

Set every row below under **Settings → Environments → `production` → Add secret**. The deploy workflow reads each via `${{ secrets.<NAME> }}` and exposes it as an env var; `.kamal/secrets` then templates the value into Kamal's deploy environment.

Tip — generate any of the three app secrets below with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Secret name           | What to paste in                                                                                          | Used for                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `SSH_PRIVATE_KEY`     | Full PEM private key (incl. `-----BEGIN ... PRIVATE KEY-----` lines) whose public half is in the VPS's `~/.ssh/authorized_keys`. | Loaded into the GitHub runner's ssh-agent so Kamal can SSH into the VPS                              |
| `KAMAL_SERVER_HOST`   | VPS IP or hostname Kamal SSHes into — e.g. `123.45.67.89` or `vps.example.com`.                           | Resolved into `servers.web.hosts` and the Postgres accessory's `host` in `config/deploy.yml`         |
| `KAMAL_DEPLOY_HOST`   | Public domain users hit — e.g. `pulse-board.example.com`. DNS A record must already point at `KAMAL_SERVER_HOST`. | `proxy.host`; Kamal's built-in proxy provisions Let's Encrypt TLS for this domain                    |
| `POSTGRES_PASSWORD`   | A strong random password (≥ 24 chars). Used by both the Postgres accessory and the app's `DATABASE_URL`.  | `POSTGRES_PASSWORD` on the accessory; composed into `DATABASE_URL` for the app                       |
| `SESSION_SECRET`      | 64-char hex string from the `node` snippet above. ≥ 16 chars required by env validation.                  | Signing key for express-session cookies                                                              |
| `CSRF_SECRET`         | 64-char hex string from the `node` snippet above. ≥ 16 chars required.                                    | HMAC key for the [`csrf-csrf`](https://www.npmjs.com/package/csrf-csrf) npm package's double-submit-cookie CSRF tokens |
| `COOKIE_SECRET`       | 64-char hex string from the `node` snippet above. ≥ 16 chars required.                                    | `cookie-parser` signing + the HMAC key for `Response.ipHash` (rotating it invalidates all stored hashes) |

### Optional secrets

Without these the app still boots — they unlock outbound email and the demo-seed flow. Add them in the same way (`Settings → Environments → production → Add secret`).

| Secret name           | What to paste in                                                                                          | Used for                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `BREVO_API_KEY`       | A v3 API key from Brevo → **Settings → SMTP & API → API Keys**.                                            | Transactional email sender. Unset → "publish results" emails become no-ops (logged, not delivered)   |
| `BREVO_SENDER_EMAIL`  | The verified sender address on the Brevo side (e.g. `hello@yourdomain.com`).                              | `From:` address on outbound email                                                                    |
| `BREVO_SENDER_NAME`   | Display name shown in inboxes (e.g. `Pulse Board`). Defaults to `Pulse Board` if unset.                   | Friendly `From:` label                                                                               |
| `GUEST_DEMO_EMAIL`    | Email to use for the demo admin login created by `npm run db:seed`.                                       | Demo admin seed                                                                                      |
| `GUEST_DEMO_PASSWORD` | Password to use for that demo admin login.                                                                | Demo admin seed                                                                                      |

### Auto-injected by the workflow (do **not** add as secrets)

The deploy workflow fills these for you — adding them yourself would just be ignored, or worse, drift from the real values.

| Variable                    | Source                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `KAMAL_REGISTRY_USERNAME`   | `${{ github.actor }}` — the user who clicked **Run workflow**                                |
| `KAMAL_REGISTRY_PASSWORD`   | The built-in `${{ secrets.GITHUB_TOKEN }}` (read/write `packages` permission already granted) |
| `PUBLIC_ORIGIN`             | Composed as `https://${KAMAL_DEPLOY_HOST}` — used for absolute URLs in outbound email        |
| `DATABASE_URL`              | Composed in `.kamal/secrets` from `POSTGRES_PASSWORD`, pinned to the `pulse-board-db` accessory hostname |

> **Note** — `KAMAL_SERVER_HOST` and `KAMAL_DEPLOY_HOST` are stored as **secrets** in the current workflow (the hostname/IP is not strictly sensitive, but storing them as secrets keeps them out of public run logs). If you'd rather expose them as GitHub **variables** so they show up plainly in logs, move them under **Environments → production → Add variable** and update the `secrets.*` references in both `.github/workflows/deploy.yml` and `config/deploy.yml` to `vars.*`.

### What the workflow actually does

Every `Run workflow` click goes through these steps:

1. **Validate required secrets** — fails fast with a named-missing list if any of the seven required Environment secrets aren't set.
2. Checkout the chosen `ref`.
3. Install Ruby 3.3 + Kamal 2.11.0 + Docker Buildx.
4. Log into GHCR with the auto-injected `GITHUB_TOKEN`.
5. Load `SSH_PRIVATE_KEY` into ssh-agent and `ssh-keyscan` the deploy host.
6. Release any stale Kamal lock, then run `kamal <action>`.
7. After a successful `deploy`, prune old containers + images on the host so disk doesn't grow forever.
8. Write a step summary with `action / ref / commit / status / URL / docs URL`.

### To deploy

GitHub → **Actions** → **Deploy** → **Run workflow** → pick `ref` and `action` → Run. First time only, run `kamal setup` once from your laptop to boot the Postgres accessory and provision TLS — see [`plan/setup.md` §2.8](plan/setup.md#28-first-deploy-one-time-kamal-setup-from-your-laptop). After that, the Action handles everything.

## API surface (admin)

```
POST   /api/auth/signup | /login | /logout              # admin sessions
GET    /api/auth/me · /api/auth/csrf-token
PATCH  /api/auth/profile

GET    /api/elections                                    # admin's polls
POST   /api/elections                                    # create
GET    /api/elections/:id                                # detail (with questions, options, voters)
PATCH  /api/elections/:id                                # update name/customUrl/mode/expiresAt
DELETE /api/elections/:id

POST   /api/elections/:id/launch · /end · /publish · /unpublish
GET    /api/elections/:id/analytics                      # live counts (also emitted via WS)

POST   /api/elections/:id/questions
PATCH  /api/elections/:id/questions/:qid · DELETE
POST   /api/elections/:id/questions/:qid/options
PATCH  /api/elections/:id/questions/:qid/options/:oid · DELETE

POST   /api/elections/:id/voters
PATCH  /api/elections/:id/voters/:vid · DELETE
```

## API surface (public, no admin auth)

```
GET    /api/public/elections/:customUrl                  # ballot read
POST   /api/public/elections/:customUrl/voter-login      # only if mode=authenticated
POST   /api/public/elections/:customUrl/voter-logout
POST   /api/public/elections/:customUrl/responses        # submit (rate-limited per IP)
GET    /api/public/elections/:customUrl/results          # 404 unless resultsPublished=true
```

## WebSocket events (`socket.io`)

Client → server:

- `election:join { electionId? customUrl? }` — joins `election:<id>:public`; if the connecting session is the admin owner, also joins `election:<id>:admin`.
- `election:leave { electionId }`

Server → client:

- `response:new { totalResponses, newAnswers }` — admin-room only, fires after each submit.
- `election:status { launched, ended, resultsPublished, expiresAt }` — both rooms.

## Credits

**Pulse Board** is built and maintained by **Mohd Saad** — [x.com/developedbysaad](https://x.com/developedbysaad).

Released under the MIT license. PRs welcome on [GitHub](https://github.com/developedbysaad/pulse-board).

