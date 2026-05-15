---
title: Local development
description: Get Pulse Board running on your machine in under five minutes.
---

## Prerequisites

- Node.js 22+ (Express 5, Vite 8, Astro 6 require it)
- PostgreSQL 14+ running locally
- Git

## Install

Clone, then run a single install at the repo root — npm workspaces handles `backend/`, `frontend/`, and `docs/` together. **Stay at the repo root for everything below** — every script delegates into the right workspace, so you never need to `cd backend/` or `cd frontend/`.

```bash
git clone https://github.com/developedbysaad/pulse-board.git
cd pulse-board
npm install
```

> **If `npm install` warns and `npm run dev` then crashes with `Cannot find module '@rolldown/binding-linux-x64-gnu'`** — known [npm bug](https://github.com/npm/cli/issues/4828) where optional native deps don't install. Fix:
>
> ```bash
> rm -rf node_modules package-lock.json frontend/node_modules backend/node_modules docs/node_modules
> npm install
> ```

## Configure secrets

```bash
cp backend/.env.example backend/.env
node -e "for (const k of ['SESSION_SECRET','CSRF_SECRET','COOKIE_SECRET']) console.log(k+'='+require('crypto').randomBytes(32).toString('hex'))" >> backend/.env
```

Open `backend/.env` and fill in the database section (`DEV_DB_*` and `TEST_DB_*`). The `TEST_DB_*` block is required — the backend test runner drops & recreates that database between runs. See [Environment variables](/docs/environment/) for the full list.

## Create the database + seed demo data

From the repo root:

```bash
npm run db:create        # creates pulse_board_dev
npm run db:create:test   # creates pulse_board_test
npm run migrate          # runs migrations against dev
npm run db:seed          # populates 5 demo polls + 2 subscribers
```

Or, in a single shot for a fresh checkout:

```bash
npm run setup
```

`npm run setup` runs `install` + `db:create` + `db:create:test` + `migrate` + `db:seed` in order.

## Run

```bash
npm run dev
```

This starts everything in parallel via `concurrently`:

| Service  | URL                            |
| -------- | ------------------------------ |
| Backend  | http://localhost:3000          |
| Frontend | http://localhost:5173          |
| Docs     | http://localhost:4321/docs/    |

Vite proxies `/api/*` and `/socket.io/*` to the backend, so the browser sees a single origin and session cookies "just work". The docs run on a separate port in dev — they're served from the same Express origin only in production. The marketing footer's "Documentation" link uses `docsHref()` (`frontend/src/lib/docsLink.js`) so it resolves correctly in both environments.

To run only one workspace:

```bash
npm run dev:backend
npm run dev:frontend
npm run dev:docs
```

## Sign in to the demo

After `npm run db:seed`, a guest admin exists. Credentials come from `backend/.env`:

```dotenv
GUEST_DEMO_EMAIL=guest-demo@yourdomain.example
GUEST_DEMO_PASSWORD=<your-choice>
```

The defaults in `.env.example` are watermarks (`contact@developedbysaad.com` / `x.com/developedbysaad`) and **will not** log you in — pick your own values before seeding.

The seed creates five polls in different lifecycle states:

| Slug              | State                                           |
| ----------------- | ----------------------------------------------- |
| `/e/team-lunch`   | Live · expires today · ~62 votes                |
| `/e/q1-roadmap`   | Live · ending today · ~140 votes                |
| `/e/town-hall-may`| **Results published** · 287 votes               |
| `/e/feature-vote` | Ended · awaiting publish · 178 votes (NotifyCTA target) |
| `/e/the-dev-poll` | Authenticated · 6/10 voted (`dev-01`…`dev-10` / `vote1234`) |

## Test

```bash
npm test                         # both workspaces
npm test --workspace backend     # Jest + supertest API tests
npm test --workspace frontend    # Vitest + Testing Library
```

The backend test runner drops and recreates `TEST_DB_NAME` on every run via the `pretest` script — make sure those env vars are set.

## Reset the database

```bash
npm run db:reset                  # drop + recreate + migrate dev DB
npm run db:seed                   # re-seed demo data
```
