---
title: Environment variables
description: Every env var Pulse Board reads, what it does, and where it's set.
---

Backend env validation lives in `backend/src/config/env.js` (Zod schema). Missing or invalid values cause the server to log a Zod error and exit `1`.

## Required

| Variable          | Type                                       | Notes                                                                  |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `SESSION_SECRET`  | string, min 16                             | Signs the `pulse.sid` session cookie                                   |
| `CSRF_SECRET`     | string, min 16                             | Used by `csrf-csrf` to derive double-submit tokens                     |
| `COOKIE_SECRET`   | string, min 16                             | `cookie-parser` signing secret + `Response.ipHash` HMAC key            |

Generate locally:

```bash
node -e "for (const k of ['SESSION_SECRET','CSRF_SECRET','COOKIE_SECRET']) console.log(k+'='+require('crypto').randomBytes(32).toString('hex'))"
```

## Optional

| Variable                | Default              | Notes                                                          |
| ----------------------- | -------------------- | -------------------------------------------------------------- |
| `NODE_ENV`              | `development`        | `development \| test \| production`                            |
| `PORT`                  | `3000`               | HTTP port                                                      |
| `FRONTEND_ORIGIN`       | (unset)              | Set if FE is on a different origin and you need CORS           |
| `PUBLIC_ORIGIN`         | falls back to `FRONTEND_ORIGIN`, then `http://localhost:5173` | Used to build absolute URLs in outbound email. Set to `https://<your-domain>` in production. |
| `RATE_LIMIT_WINDOW_MS`  | `900000` (15 min)    | Anonymous submit window                                        |
| `RATE_LIMIT_MAX`        | `100`                | Anonymous submits allowed per IP per window                    |

## Email (Brevo) — optional

When `BREVO_API_KEY` is unset, `backend/src/lib/email.js` logs the would-be email payload to the console instead of failing — the publish-results flow still works end-to-end on your laptop without a Brevo account. Set all three in production to actually deliver email. See [Secrets, deploys & safety](/docs/secrets-and-safety/#email-setup-brevo) for the Brevo signup walkthrough.

| Variable              | Default          | Notes                                              |
| --------------------- | ---------------- | -------------------------------------------------- |
| `BREVO_API_KEY`       | (unset)          | v3 API key from Brevo's SMTP & API → API Keys      |
| `BREVO_SENDER_EMAIL`  | (unset)          | Verified sender address on the Brevo side          |
| `BREVO_SENDER_NAME`   | `Pulse Board`    | Display name on outbound email                     |

## Demo seed credentials

Read by `backend/src/db/seeders/<ts>-demo-data.js` when you run `npm run db:seed`. Override locally to pick your own admin login; in production stash real values in GitHub Environment secrets so they never enter git history.

| Variable               | Default (watermark, NOT working) | Notes                                |
| ---------------------- | -------------------------------- | ------------------------------------ |
| `GUEST_DEMO_EMAIL`     | `contact@developedbysaad.com`    | Demo admin email for the seeded user |
| `GUEST_DEMO_PASSWORD`  | `x.com/developedbysaad`          | Demo admin password                  |

## Database

Sequelize reads via `backend/src/config/db.js`. The `NODE_ENV` decides which set:

### development / test

| Variable                                      |
| --------------------------------------------- |
| `DEV_DB_USERNAME` / `TEST_DB_USERNAME`        |
| `DEV_DB_PASSWORD` / `TEST_DB_PASSWORD`        |
| `DEV_DB_NAME` / `TEST_DB_NAME`                |
| `DEV_DB_HOST` / `TEST_DB_HOST`                |
| `DEV_DB_PORT` / `TEST_DB_PORT` (default 5432) |

### production

| Variable        |
| --------------- |
| `DATABASE_URL`  |

`DATABASE_URL` is used as `use_env_variable` and parsed by Sequelize. SSL is enabled with `rejectUnauthorized: false` for compatibility with managed providers (Render, Railway, Heroku).

## Where each is set

| Environment       | Where you set them                                                              |
| ----------------- | ------------------------------------------------------------------------------- |
| Local dev / test  | `backend/.env` (gitignored)                                                     |
| CI tests          | GitHub Actions repo secrets, exposed to the test job                            |
| Staging deploy    | GitHub Environment `staging` secrets — pulled into the runner, then `.kamal/secrets` templates them in |
| Production deploy | GitHub Environment `production` secrets — same flow, different values           |

`.kamal/secrets` is a small shell script that reads `$KAMAL_REGISTRY_PASSWORD`, `$SESSION_SECRET`, etc. from the runner and exposes them to the deployed container via Kamal's `env.secret` block.
