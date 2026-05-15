---
title: Deploying with Kamal
description: Ship the monorepo as a single Docker image to a Hetzner VPS via GitHub Actions + Kamal 2.
---

Pulse Board ships as one Docker container — the Express app serves the API, the React SPA, and the `/docs` site (this page) from a single origin.

A dedicated Postgres accessory ships alongside it, so the app brings its own database. The Kamal config is single-target (Hetzner) and designed to coexist on the same VPS as other Kamal apps without touching them:

- `kamal-proxy` on the host is a singleton that routes by `Host:` header — different `proxy.host` values never interfere.
- Kamal namespaces every container, volume, and accessory by the `service:` name (`pulse-board`), so nothing clashes with another app's `db` or `web` container.
- Pulse Board's `DATABASE_URL` resolves to its own `pulse-board-db` accessory only.

## Prerequisites

Provision once:

- A Hetzner VPS (or any Linux box) with Docker installed and an SSH user that can run `docker`.
- A DNS A record (e.g. `pulse-board.example.com`) pointing to the VPS — Kamal's built-in proxy will issue TLS via Let's Encrypt.

You **don't** need a managed database. The Kamal config boots a `postgres:17` accessory on the same host.

## Secrets you need

These end up as **GitHub Environment secrets** on `production` (configure under repo Settings → Environments → `production`). The deploy workflow injects them as env vars; `.kamal/secrets` references them by name. For the safety story (public-repo guarantees, who can read run logs, required reviewers) see [Secrets, deploys & safety](/docs/secrets-and-safety/).

### Required

| Secret                       | Used by                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `SSH_PRIVATE_KEY`            | Pulled into the action's ssh-agent                       |
| `KAMAL_SERVER_HOST`          | Hetzner VPS IP/hostname                                  |
| `KAMAL_DEPLOY_HOST`          | Public domain (e.g. `pulse-board.example.com`)           |
| `POSTGRES_PASSWORD`          | Password for the dedicated `pulse-board-db` accessory    |
| `SESSION_SECRET`             | Express session signing                                  |
| `CSRF_SECRET`                | csrf-csrf double-submit secret                           |
| `COOKIE_SECRET`              | cookie-parser + `Response.ipHash` HMAC key               |

`KAMAL_REGISTRY_USERNAME` / `KAMAL_REGISTRY_PASSWORD` use the auto-injected `${{ github.actor }}` and `${{ secrets.GITHUB_TOKEN }}` — **don't** set those manually.

`DATABASE_URL` is **not** a secret you set. It's composed inside `.kamal/secrets` from `POSTGRES_PASSWORD`, so the app and the Postgres accessory can never drift on credentials.

### Optional

| Secret                       | Used by                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `BREVO_API_KEY`              | Outbound email when results are published                  |
| `BREVO_SENDER_EMAIL`         | Verified sender on the Brevo side                          |
| `BREVO_SENDER_NAME`          | Display name on outbound email (defaults to `Pulse Board`) |
| `GUEST_DEMO_EMAIL`           | Demo admin login for `npm run db:seed`                     |
| `GUEST_DEMO_PASSWORD`        | Demo admin password                                        |

`PUBLIC_ORIGIN` is derived by the workflow as `https://${{ secrets.KAMAL_DEPLOY_HOST }}` — used to build absolute URLs in outbound email.

## One-time setup

Because `kamal deploy` doesn't boot accessories on a brand-new service, you run `kamal setup` once from your laptop to provision the host, register pulse-board with the shared proxy, and start the Postgres container. After that, the GitHub Action takes over.

```bash
# 1) Install Kamal locally.
gem install kamal -v 2.11.0

# 2) Export the same env vars the GitHub Action would set.
export KAMAL_REGISTRY_USERNAME=<your-github-handle>
export KAMAL_REGISTRY_PASSWORD=<a-PAT-with-read:packages,write:packages>
export KAMAL_SERVER_HOST=<vps-ip>
export KAMAL_DEPLOY_HOST=pulse-board.example.com
export POSTGRES_PASSWORD=<strong-password>
export SESSION_SECRET=...
export CSRF_SECRET=...
export COOKIE_SECRET=...
export PUBLIC_ORIGIN=https://pulse-board.example.com
# (BREVO_* / GUEST_DEMO_* optional)

# 3) Boot the accessory, build, push, deploy.
kamal setup
```

If another Kamal app is already running on this host, `kamal setup` will leave its proxy and containers untouched and just register pulse-board alongside.

## Manual dispatch (every deploy after the first)

In the **Actions** tab of GitHub: **Deploy** → **Run workflow**. Production secrets are scoped to the `production` GitHub Environment, so you can gate runs behind a required-reviewer rule if you want.

The job:

1. Checks out the repo.
2. Sets up Ruby + installs Kamal 2.
3. Logs into GHCR with `GITHUB_TOKEN`.
4. Loads `SSH_PRIVATE_KEY` into ssh-agent.
5. Runs `kamal deploy`.

Kamal then:

1. Builds the multi-stage Docker image (frontend + docs + backend prod deps).
2. Pushes to `ghcr.io/<owner>/pulse-board`.
3. SSHes to the Hetzner VPS.
4. Pulls the image, runs the pre-deploy migration hook, starts the new container, and the shared proxy swaps traffic to it.

## Files involved

| Path                                | Role                                              |
| ----------------------------------- | ------------------------------------------------- |
| `Dockerfile`                        | Multi-stage build                                 |
| `.dockerignore`                     | Keeps node_modules, .git, .env out of the image   |
| `config/deploy.yml`                 | Kamal config — service, proxy, env, Postgres accessory |
| `.kamal/secrets`                    | Shell-style template — gitignored, env-substituted |
| `.kamal/hooks/pre-deploy`           | Runs `sequelize-cli db:migrate` against the new image |
| `.github/workflows/deploy.yml`      | Manual-dispatch deploy workflow                   |

## Migrations

Wired into `.kamal/hooks/pre-deploy`:

```bash
kamal app exec --reuse "npx sequelize-cli db:migrate"
```

This runs against the **new** image (not the live container), using the same env vars and secrets the running container will use — including `DATABASE_URL`, which points at the `pulse-board-db` accessory on the kamal Docker network. Kamal only swaps traffic onto the new container if the migration step succeeds.

## Coexisting with other Kamal apps

If you're running another Kamal app on the same Hetzner box, nothing extra is required. As long as:

- The two apps use **different domains** (e.g. `pulse-board.example.com` vs `app2.example.com`).
- They have **different `service:` names** in their respective `deploy.yml`.
- Each app brings its own database (pulse-board does, via the `db` accessory above).

…they share only the host's `kamal-proxy` and the `kamal` Docker network. Adding, removing, or redeploying one can never affect the other.
