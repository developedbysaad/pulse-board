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
│   ├── .env.example                  # backend runtime env (DB creds, app secrets) — copy to .env
│   └── src/{app,index,config,auth,middleware,validators,routes,controllers,models,sockets,db}
├── frontend/                         # React 19 + Vite 8 + Tailwind 4
│   └── src/{main,App,router,api,lib,hooks,context,pages,components,styles}
├── docs/                             # Astro 6 + Starlight — served at /docs in prod
│   └── src/content/docs/
├── config/
│   └── deploy.yml                    # Kamal deploy config — every value is ERB-read from env
├── .kamal/
│   ├── secrets                       # gitignored; composes DATABASE_URL + forwards env vars
│   └── hooks/                        # Kamal lifecycle hooks (empty by default)
├── .github/workflows/deploy.yml      # manual-dispatch only → wraps Kamal commands
├── .env.example                      # ROOT — Kamal deploy env vars (used by local `kamal deploy`)
├── Dockerfile                        # multi-stage: deps → build → runtime
├── public/images/                    # in-app screenshots — consumed by /docs and the pitch deck
├── plan/{setup.md,todo.md}           # go-live runbook + project plan
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

Create the dev DB and run migrations from the repo root:

```bash
npm run db:create     # creates pulse_board_dev (per backend/.env)
npm run migrate       # runs every migration in order
npm run db:seed       # optional — loads a demo admin + five demo polls
```

If you already have a partially-migrated dev DB and want a fresh start:

```bash
npm run db:reset && npm run db:seed
```

`db:reset` chains `db:drop || true && db:create && db:migrate`. Every sequelize command is wrapped as an npm script (see `package.json`) so you never need to `cd backend && npx sequelize-cli ...` — the `.sequelizerc` lives in the backend workspace and the npm scripts delegate into it.

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

Pulse Board ships as one Docker image. Kamal 2 builds it, pushes to **Docker Hub**, boots a bundled Postgres accessory the first time, runs migrations, and atomic-swaps the new container behind a shared `kamal-proxy` with Let's Encrypt TLS — all of it driven by `kamal` CLI commands wrapped by a manual-dispatch GitHub workflow.

> **New to Docker Hub?** Walk through [`plan/docker-hub.md`](plan/docker-hub.md) first — it covers PAT generation, the auth model, the UI, and the typical first-deploy flow.

```
Dockerfile               # multi-stage: install → build FE+docs → slim runtime
config/deploy.yml        # Kamal config — every value is ERB-read from env (no hardcoded names)
.kamal/secrets           # committed template ($VAR refs only, no literal secrets); forwards env vars + composes DATABASE_URL
.kamal/hooks/            # Kamal lifecycle hooks (empty by default)
.env.example             # root — Kamal env vars when deploying from your laptop (see "Local Kamal" below)
.github/workflows/deploy.yml   # manual-dispatch only — every action wraps a kamal command
```

Nothing in `config/deploy.yml` or `.kamal/secrets` is hardcoded — every name (service, registry, image path, postgres user/db, port, rate-limit window) is read via `ENV.fetch(..., '<default>')` so forking pulse-board into another app is a pure env-vars exercise. The defaults match the values pulse-board itself uses, so a vanilla deploy just works.

The deploy workflow is **manual-dispatch only** (`on: workflow_dispatch`). There is no `on: push` / `on: pull_request` / `on: schedule`. Two inputs at run time:

- **`action`** — one of the Kamal-native actions in the table below.
- **`ref`** — branch, tag, or commit SHA to deploy. Defaults to `main`.

#### Workflow actions

Each action is a thin wrapper around the named Kamal command. The dropdown is grouped: lifecycle (deploy/redeploy/rollback/setup) → database (migrate/seed) → observability (logs/logs-errors) → maintenance (proxy-reboot/prune).

| `action` value   | Wraps                                                  | What it does                                                                                              | When to use                                                              |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `deploy`         | `kamal deploy`                                         | Build the image → push to Docker Hub → atomic blue-green swap. Migrations run automatically in the container's entrypoint on start. | The default. Every normal release.                                       |
| `redeploy`       | `kamal redeploy`                                       | Restart the existing container with the **same** image (no rebuild, no push). Drops in-memory state.      | Picked up new env-var values; need a fresh process without a code change. |
| `rollback`       | `kamal rollback`                                       | Flip the live container back to the previous image version Kamal still has on disk                        | Latest release is broken and you want it gone now.                       |
| `setup`          | `kamal setup`                                          | FIRST-TIME provision — install Docker, boot the Postgres accessory, run migrations, deploy                | Only on a brand-new host. Usually run from your laptop once.             |
| `migrate`        | `kamal app exec --reuse "npx sequelize-cli db:migrate"` | Re-run migrations against the current container                                                          | Migrations failed mid-deploy or were added without redeploying.          |
| `seed`           | `kamal app exec --reuse "npx sequelize-cli db:seed:all"` | Load demo data (uses `GUEST_DEMO_EMAIL` / `GUEST_DEMO_PASSWORD`)                                         | Showcasing the app on a fresh deploy.                                    |
| `logs`           | (SSH + `docker logs --tail 500`)                       | Print the last 500 timestamped log lines from `pulse-board-web`                                           | Quick peek without opening a terminal.                                   |
| `logs-errors`    | (SSH + `docker logs --since 24h` filtered)             | Grep error / exception / 5xx / `failed` / `stack` lines from the last 24 hours                            | Triage after an incident.                                                |
| `proxy-reboot`   | `kamal proxy reboot --confirmed`                       | Restart the host's `kamal-proxy` singleton                                                                | Rare — only if proxy config changed or TLS renewal hung.                 |
| `prune`          | `kamal prune all`                                      | Remove old containers + dangling images on the host                                                       | Disk-pressure cleanup. `deploy` already prunes on success.               |

The `logs` and `logs-errors` actions run in a separate, lightweight job that only sets up SSH (no Ruby, no Docker, no Kamal install). Everything else runs in the main `kamal` job.

For the full step-by-step "from a blank GitHub repo to a live URL" runbook, see [`plan/setup.md`](plan/setup.md) — including the [TL;DR go-live checklist](plan/setup.md#tldr--go-live-checklist) at the top. The tables below are the secret reference the runbook points at.

### Required GitHub Environment secrets

Set every row below under **Settings → Environments → `production` → Add secret**. The deploy workflow reads each via `${{ secrets.<NAME> }}` and exposes it as an env var; `.kamal/secrets` then templates the value into Kamal's deploy environment.

Tip — generate any of the three app secrets below with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Secret name              | Example shape                                                                | What to paste in                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `SSH_PRIVATE_KEY`        | `-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----` | Full PEM private key (incl. the `-----BEGIN`/`-----END` lines) whose public half is in the server's `~/.ssh/authorized_keys`. |
| `KAMAL_SERVER_HOST`      | `203.0.113.42` *or* `vps.example.com`                                        | VPS IPv4/IPv6/DNS name Kamal SSHes into.                                                                  |
| `KAMAL_DEPLOY_HOST`      | `pulse-board.example.com`                                                    | Public domain visitors hit. DNS A record must already point at `KAMAL_SERVER_HOST`.                       |
| `KAMAL_REGISTRY_USERNAME` | `your-dockerhub-handle`                                                     | Your Docker Hub handle — the namespace the image will live under.                                         |
| `KAMAL_REGISTRY_PASSWORD` | `dckr_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`                                     | A Docker Hub PAT from <https://app.docker.com/settings/personal-access-tokens>, scope `Read & Write`. **Not** your account password. |
| `POSTGRES_PASSWORD`      | `replace-me-with-a-strong-random-password`                                   | Strong random password (≥ 24 chars). `openssl rand -base64 32` works.                                     |
| `SESSION_SECRET`         | `0000…0000` (64-char hex)                                                    | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. ≥ 16 chars required.          |
| `CSRF_SECRET`            | `1111…1111` (64-char hex)                                                    | Same generator, different value. HMAC key for [`csrf-csrf`](https://www.npmjs.com/package/csrf-csrf).     |
| `COOKIE_SECRET`          | `2222…2222` (64-char hex)                                                    | Same generator, different value. `cookie-parser` signing + HMAC key for `Response.ipHash`.                |

### Optional secrets

Without these the app still boots — they unlock outbound email and the demo-seed flow. Add them in the same way (`Settings → Environments → production → Add secret`).

| Secret name           | Example shape                                                       | What to paste in                                                                                          |
| --------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `BREVO_API_KEY`       | `xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx`             | v3 API key from <https://app.brevo.com/settings/keys/api>. Unset → results / password-reset emails fall back to `console.log`. |
| `BREVO_SENDER_EMAIL`  | `hello@example.com`                                                 | A sender address verified on Brevo. Becomes the `From:` address.                                          |
| `BREVO_SENDER_NAME`   | `Pulse Board`                                                       | `From:` display name. Defaults to `Pulse Board`.                                                          |
| `GUEST_DEMO_EMAIL`    | `demo@example.com`                                                  | Email for the demo admin login `npm run db:seed` creates.                                                 |
| `GUEST_DEMO_PASSWORD` | `replace-me-with-a-demo-password`                                   | Password for that demo admin login.                                                                       |

### Optional GitHub Environment **variables** (non-sensitive overrides)

These are *variables* not *secrets* — values you might tweak per-fork but don't need to hide. Add them under **Settings → Environments → `production` → Add variable**. Every row has a workflow-side default, so leave them unset to use Pulse Board's defaults. The workflow reads each as `${{ vars.<NAME> || '<default>' }}`.

| Variable                  | Default                  | Example value to put in vars  | When to set                                                                              |
| ------------------------- | ------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------- |
| `KAMAL_SERVICE`           | `pulse-board`            | `voter-pulse`                 | Forking the repo into another app on the same host — namespaces every container/volume. |
| `KAMAL_REGISTRY_SERVER`   | `index.docker.io`        | `ghcr.io`                     | Pushing to a registry other than Docker Hub.                                              |
| `KAMAL_IMAGE`             | `<USER>/<SERVICE>`       | `acme-org/pulse-board`        | The image path differs from `<KAMAL_REGISTRY_USERNAME>/<KAMAL_SERVICE>` (e.g. org-owned). |
| `APP_PORT`                | `3000`                   | `4000`                        | Multiple services on the host that all want :3000 internally.                            |
| `RATE_LIMIT_WINDOW_MS`    | `900000` (15 min)        | `60000`                       | Tighten / loosen the public submit-response rate limit window.                            |
| `RATE_LIMIT_MAX`          | `100`                    | `30`                          | Max requests per window per IP.                                                           |
| `POSTGRES_USER`           | `pulse`                  | `voter`                       | Forking — match the new app's name for clarity in `psql`.                                |
| `POSTGRES_DB`             | `pulse_board_production` | `voter_pulse_production`      | Forking — same.                                                                          |

### Registry credentials

Docker Hub requires **explicit** credentials — there's no auto-injected token like GHCR's `GITHUB_TOKEN`. The two values above (`KAMAL_REGISTRY_USERNAME`, `KAMAL_REGISTRY_PASSWORD`) are read directly with no fallback:

```yaml
KAMAL_REGISTRY_SERVER:   ${{ vars.KAMAL_REGISTRY_SERVER   || 'index.docker.io' }}
KAMAL_REGISTRY_USERNAME: ${{ secrets.KAMAL_REGISTRY_USERNAME }}
KAMAL_REGISTRY_PASSWORD: ${{ secrets.KAMAL_REGISTRY_PASSWORD }}
```

The validate-secrets step at the top of the `kamal` job fails fast if either is missing.

To use a Docker Hub PAT:

1. <https://app.docker.com/settings/personal-access-tokens> → **Generate new token** → `Read & Write` scope.
2. Copy the token (Docker Hub shows it once).
3. Set both Environment secrets:
   - `KAMAL_REGISTRY_USERNAME` = your Docker Hub handle
   - `KAMAL_REGISTRY_PASSWORD` = the PAT

For full Docker Hub coverage — image visibility, rate limits, the "auto-create on first push" behaviour, common errors — see [`plan/docker-hub.md`](plan/docker-hub.md).

> **Switching to GHCR or another registry?** Set `KAMAL_REGISTRY_SERVER` (variable) to the new endpoint (`ghcr.io`, your ECR host, etc.) and update `KAMAL_REGISTRY_USERNAME` / `KAMAL_REGISTRY_PASSWORD` to credentials for that registry. Optionally set `KAMAL_IMAGE` to the full image path if it doesn't match `<username>/<service>`.

### Other auto-injected values (do not add as secrets)

| Variable                | Source                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_ORIGIN`         | Composed as `https://${KAMAL_DEPLOY_HOST}` — used for absolute URLs in outbound email / password-reset links       |
| `DATABASE_URL`          | Composed in `.kamal/secrets` as `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${KAMAL_SERVICE}-db:5432/${POSTGRES_DB}` |

> **Note** — `KAMAL_SERVER_HOST` and `KAMAL_DEPLOY_HOST` are stored as **secrets** in the default workflow (the hostname/IP isn't truly sensitive but storing them as secrets keeps them out of public run logs and out of the step summary). If you'd rather see the URL on the deployment card and in the summary, move them to **Environments → production → Add variable** and replace `secrets.KAMAL_*` with `vars.KAMAL_*` in `.github/workflows/deploy.yml` + `config/deploy.yml`. A comment in the workflow records the single-line change.

### Local Kamal (laptop deploys + first-time `kamal setup`)

The GitHub workflow handles every routine deploy. But you need a local Kamal install for the **one-time** `kamal setup` (the workflow can do it too, but running it from your laptop gives clearer output and lets you debug DNS / SSH issues).

`config/deploy.yml` starts with:

```yaml
<% begin; require "dotenv"; Dotenv.load(".env"); rescue LoadError; end %>
```

…so if a `.env` exists at the repo root, every value below is read from it. **Copy `.env.example` to `.env`** (the file is gitignored) and fill in the same values you'd put in GitHub Environment secrets/variables. Top of `.env.example` documents the policy — GitHub secrets are preferred; the `.env` is the local fallback. Then from the repo root:

```bash
gem install kamal -v 2.11.0
kamal setup     # boots accessories + deploys, all 3 steps in one
```

After that, deploy from the laptop with `kamal deploy`, or hand off to the GitHub Action.

### What the workflow actually does

For `deploy` / `redeploy` / `rollback` / `setup` / `migrate` / `seed` / `proxy-reboot` / `prune`, the `kamal` job runs:

1. **Validate required Environment secrets** — fails fast with a named-missing list if any of the nine required secrets aren't set (including `KAMAL_REGISTRY_USERNAME` / `_PASSWORD`).
2. Checkout the chosen `ref`.
3. Install Ruby 3.3 + Kamal 2.11.0.
4. Set up Docker Buildx + log into Docker Hub (only for `deploy` / `setup` — the others don't build).
5. Load `SSH_PRIVATE_KEY` into ssh-agent and configure SSH to skip strict host-key checking (avoids `Net::SSH::HostKeyMismatch` when the server advertises multiple host-key algorithms).
6. Release any stale `kamal lock`, then run the wrapped Kamal command.
7. After a successful `deploy`, run `kamal prune all` so old containers + images don't pile up on the host.
8. Write a step summary with `action / ref / commit / status / URL / docs URL`.

For `logs` / `logs-errors`, the lightweight `logs` job runs:

1. **Validate required Environment secrets** — only needs `SSH_PRIVATE_KEY` + `KAMAL_SERVER_HOST`.
2. Load `SSH_PRIVATE_KEY` into ssh-agent and `ssh-keyscan` the deploy host.
3. SSH in, find the running `pulse-board-web` container, and emit either the last 500 lines or filtered error lines from the last 24h.
4. Write a step summary.

### To deploy

GitHub → **Actions** → **Deploy** → **Run workflow** → pick `action` + `ref` → Run. First time only, run `kamal setup` once from your laptop (cleaner than CI for the bring-up — see [`plan/setup.md` §2.8](plan/setup.md#28-first-deploy-one-time-kamal-setup-from-your-laptop)); after that, the Action handles everything.

## API surface (admin)

```
POST   /api/auth/signup | /login | /logout              # admin sessions
POST   /api/auth/forgot-password                         # email a one-time reset link (rate-limited)
POST   /api/auth/reset-password                          # consume the token, set a new password
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

