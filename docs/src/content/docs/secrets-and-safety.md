---
title: Secrets, deploys & safety
description: How Pulse Board secrets flow from GitHub Environment → Action runner → Kamal → container, and what's actually safe to put in a public repo.
---

Pulse Board ships from a public GitHub repo. This page explains how secrets travel from the GitHub Environment to the running container, what GitHub Actions guarantees and *doesn't* guarantee for public repos, and how to wire up a fresh deploy.

## What's safe in a public repo

Short answer: **yes, secrets in a public repo are safe — if you do four things.**

The longer answer:

| Concern | Reality |
| --- | --- |
| Can strangers read repo secrets? | **No.** Secrets are encrypted at rest, only injected into workflow runs by GitHub's runner, and never exposed in repo files. |
| Can strangers read workflow logs? | **Yes — they can read run logs in a public repo.** But GitHub auto-masks secret values as `***` in stdout, environment dumps, and step output. |
| Can a PR from a fork read secrets? | **No** — `pull_request` runs from forks have no access to `secrets.*`. (Avoid `pull_request_target` unless you understand the trade-off; that one *does* expose secrets.) |
| Can a malicious collaborator with `Write` push a workflow that exfiltrates secrets? | **Yes** — anyone who can edit `.github/workflows/*` can dump secrets via base64 or off-band channels (the `***` mask only catches the literal value). |
| Can a malicious npm/Action dependency leak secrets? | **Yes**, if used. Pin third-party Actions to commit SHAs, audit `package.json` deps. |

### Four things to do

1. **Use Environment secrets, not Repository secrets.** They scope the secret to a specific environment (`production`) and let you add **deployment protection rules**: required reviewers, wait timers, allowed branches. Pulse Board's deploy workflow already has `environment: { name: production }` for exactly this.

2. **Turn on "Required reviewers" for production.** *Settings → Environments → production → Deployment protection rules → Required reviewers → add yourself*. Now production deploys block until a human clicks Approve.

3. **Limit `Write` permission.** Only people you trust should be able to push to `main` or modify `.github/workflows/*`. Branch protection rules can require PR review even for collaborators.

4. **Pin third-party Actions to commit SHAs.** Tags can be moved; commit SHAs can't. Update with Dependabot.

### Things you'll get for free

- The repo's `.gitignore` already blocks `.env` and the `node_modules` paths. Literal secret values never enter your working tree.
- `.kamal/secrets` is committed but it's a **template** — every line is `KEY=$KEY` style, never a literal value. Kamal substitutes from process env at deploy time. The file's job is just to declare which env vars to forward into the deployed container.
- `backend/src/config/env.js` validates required secrets via Zod at boot. The container exits 1 (with a clean error) if `SESSION_SECRET` etc. are missing, instead of running half-broken.

## Secret flow, end to end

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  GitHub repo                                                       │
│    Settings → Environments → production → Secrets                  │
│                              │                                     │
│                              ▼                                     │
│  Deploy workflow run (workflow_dispatch + manual approval)         │
│    .github/workflows/deploy.yml                                    │
│      env:                                                          │
│        BREVO_API_KEY: ${{ secrets.BREVO_API_KEY }}    ─┐           │
│        DATABASE_URL:  ${{ secrets.DATABASE_URL }}     ─┤           │
│        ...                                            ─┤           │
│                                                       ▼           │
│  Kamal (`kamal deploy`)                                            │
│    .kamal/secrets is a shell-style file:                           │
│      BREVO_API_KEY=$BREVO_API_KEY    ← templated from process env  │
│      POSTGRES_PASSWORD=$POSTGRES_PASSWORD                          │
│      DATABASE_URL=postgres://pulse:$POSTGRES_PASSWORD@…  ← composed │
│                                  │                                 │
│                                  ▼                                 │
│  config/deploy.yml `env: secret:` list                             │
│      - BREVO_API_KEY                                               │
│      - DATABASE_URL                                                │
│      ...                                                           │
│                                  │                                 │
│                                  ▼                                 │
│  Running container                                                 │
│    process.env.BREVO_API_KEY    ← read by backend/src/lib/email.js │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Three things have to line up for a new secret to reach the container:

1. **GitHub UI** — add the secret to the production Environment.
2. **`.github/workflows/deploy.yml`** — pass it through the `env:` block.
3. **`config/deploy.yml`** — list it under `env.secret:` so Kamal injects it.
4. **`.kamal/secrets`** — add a `KEY=$KEY` line so Kamal can find it in the deploy process env.

Miss any of those and the variable will be empty inside the container.

## The full secret list (production)

| Secret | Purpose |
| --- | --- |
| `SSH_PRIVATE_KEY` | SSH key for the runner to reach the VPS |
| `KAMAL_SERVER_HOST` | Hetzner VPS public IP |
| `KAMAL_DEPLOY_HOST` | Public hostname (e.g. `pulse-board.example.com`) |
| `POSTGRES_PASSWORD` | Password for the dedicated `pulse-board-db` Postgres accessory |
| `SESSION_SECRET` | Express-session signing |
| `CSRF_SECRET` | csrf-csrf double-submit signing |
| `COOKIE_SECRET` | cookie-parser + IP hashing |
| `BREVO_API_KEY` | Brevo transactional email key (optional in dev) |
| `BREVO_SENDER_EMAIL` | Verified sender address on the Brevo side |
| `BREVO_SENDER_NAME` | Display name (default: `Pulse Board`) |
| `GUEST_DEMO_EMAIL` | Demo admin email for `npm run db:seed` |
| `GUEST_DEMO_PASSWORD` | Demo admin password |

`KAMAL_REGISTRY_USERNAME` / `KAMAL_REGISTRY_PASSWORD` use the auto-injected `${{ github.actor }}` and `${{ secrets.GITHUB_TOKEN }}` — **don't** set those manually.

`DATABASE_URL` is **not** a secret you set. It's composed in `.kamal/secrets` from `POSTGRES_PASSWORD` so the app and the accessory can't drift on credentials.

## Email setup (Brevo)

We use [Brevo](https://brevo.com) (formerly Sendinblue) for transactional email. Free tier is 300 emails/day, more than enough for a hackathon-grade polling app.

1. Sign up at <https://brevo.com>.
2. **Senders, Domains & Dedicated IPs → Senders → Add sender**. Verify your address (or domain — better deliverability).
3. **SMTP & API → API Keys → Create new API key**. Copy it — you'll only see it once.
4. Add three secrets to the GitHub `production` Environment:
   - `BREVO_API_KEY` — the key you just copied
   - `BREVO_SENDER_EMAIL` — the verified sender
   - `BREVO_SENDER_NAME` — display name (default `Pulse Board`)
5. Re-run **Deploy → production**. The runtime picks up the new env vars on the next container boot.

In dev with no key set, `backend/src/lib/email.js` logs the would-be email payload to the console instead of failing, so you can iterate on email templates without an account.

## Local-deploy fallback

If you ever need to run `kamal deploy` from your laptop (e.g. troubleshooting), just export the same env vars before running:

```bash
export SSH_PRIVATE_KEY="$(cat ~/.ssh/pulse-board-deploy)"
export KAMAL_REGISTRY_USERNAME=developedbysaad
export KAMAL_REGISTRY_PASSWORD=$GH_PAT_WITH_PACKAGES
export KAMAL_SERVER_HOST=<vps-ip>
export KAMAL_DEPLOY_HOST=pulse-board.example.com
export POSTGRES_PASSWORD=...
export SESSION_SECRET=...
export CSRF_SECRET=...
export COOKIE_SECRET=...
export BREVO_API_KEY=...
export BREVO_SENDER_EMAIL=...
export PUBLIC_ORIGIN=https://pulse-board.example.com

kamal deploy
```

Same `.kamal/secrets` template, same Kamal config — Kamal reads from your shell instead of from the GitHub runner.

— *Made by Saad · [x.com/developedbysaad](https://x.com/developedbysaad)*
