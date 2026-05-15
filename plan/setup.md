# Setup guide

End-to-end runbook covering **both** local development and the production deploy at <https://pulse-board.developedbysaad.com>.

- **Part 1** — get it running on your laptop (~15 minutes).
- **Part 2** — ship it to a public URL via Kamal + GitHub Actions (~45 minutes the first time).

> **Mental model:** local dev needs Postgres + Node. Production deploy needs a Linux box + DNS — Kamal handles everything else (Docker install, Postgres accessory, TLS, proxy, rolling deploys). All secrets live in **GitHub Environment secrets**, never in the repo.

---

## TL;DR — go-live checklist

If everything below is already familiar, this is the short version of Part 2. Tick each box once, then every future deploy is just **Actions → Deploy → Run workflow**.

1. ☐ Push the repo to GitHub (`gh repo create developedbysaad/pulse-board --public --source=. --push`).
2. ☐ Provision a Linux box (Ubuntu 24.04, any provider). Note the public IPv4.
3. ☐ Add a DNS **A record**: `pulse-board.developedbysaad.com → <SERVER_IP>`. Wait for it to resolve (`dig +short …`).
4. ☐ Generate a dedicated SSH keypair, copy the **public** half to `root@<SERVER_IP>:~/.ssh/authorized_keys`.
5. ☐ In GitHub → **Settings → Environments → New environment** → name `production`. Enable **Required reviewers** so deploys gate on your approval.
6. ☐ Generate a Docker Hub Personal Access Token at <https://app.docker.com/settings/personal-access-tokens> with `Read & Write` scope. Copy the token. See [`plan/docker-hub.md`](docker-hub.md) for the full Docker Hub guide.
7. ☐ Under **Environment secrets**, add **nine required secrets** (see [§ 2.7](#27-configure-github-environment--secrets) for full values):
   - `SSH_PRIVATE_KEY` — full private key text, incl. `-----BEGIN`/`-----END` lines.
   - `KAMAL_SERVER_HOST` — VPS IP or DNS name.
   - `KAMAL_DEPLOY_HOST` — `pulse-board.developedbysaad.com` (the public domain).
   - `KAMAL_REGISTRY_USERNAME` — your Docker Hub handle.
   - `KAMAL_REGISTRY_PASSWORD` — the Docker Hub PAT from step 6.
   - `POSTGRES_PASSWORD` — strong random password for the bundled Postgres accessory.
   - `SESSION_SECRET`, `CSRF_SECRET`, `COOKIE_SECRET` — three 64-char hex strings (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
8. ☐ (Optional) add the five Brevo + demo-seed secrets if you want outbound email and the demo admin.
9. ☐ One-time, from your laptop: `gem install kamal -v 2.11.0 && kamal setup`. This installs Docker, boots the Postgres accessory, runs migrations, provisions TLS, deploys. ~5 min.
10. ☐ Smoke test: `curl https://pulse-board.developedbysaad.com/api/health` → `{"ok":true}`.
11. ☐ All future deploys: **Actions → Deploy → Run workflow → `production`**. Pick `deploy` / `redeploy` / `rollback` / `proxy-reboot`. Optional `ref` field for deploying a specific tag.

You **don't** add `PUBLIC_ORIGIN` or `DATABASE_URL` — the workflow composes them automatically from the secrets above (see [README → Deploy](../README.md#other-auto-injected-values-do-not-add-as-secrets)).

> **Note on secret masking.** GitHub Actions auto-masks the **value** of every registered secret in the run log — anywhere a secret would otherwise print (the script source, command output, the step summary) the value is replaced with `***`. The secret **names** (`SESSION_SECRET`, `KAMAL_DEPLOY_HOST`, …) are not sensitive; they live in plain text in `.github/workflows/deploy.yml` and the README. One side-effect worth knowing: because `KAMAL_DEPLOY_HOST` is a secret, the URL in the workflow's step summary renders as `https://***` instead of the actual domain. If you'd rather see the URL plainly (the hostname isn't truly sensitive), move `KAMAL_SERVER_HOST` and `KAMAL_DEPLOY_HOST` from **Environment secrets** to **Environment variables** (`vars.*`) and replace `secrets.KAMAL_*` with `vars.KAMAL_*` in both `.github/workflows/deploy.yml` and `config/deploy.yml`.

---

# Part 1 — Run locally

## 1.1 Pre-flight (tools)

```bash
node --version       # need 22+
npm --version        # comes with Node
psql --version       # need PostgreSQL 14+ client; the server can be the same
git --version
```

If `node` is older than 22, install via `mise`, `asdf`, `fnm`, or `nvm`. Don't use `apt install nodejs` — distros ship ancient versions.

If `psql` isn't installed:

```bash
# Ubuntu / Debian / WSL2
sudo apt update && sudo apt install -y postgresql postgresql-client

# macOS
brew install postgresql@16 && brew services start postgresql@16
```

Start the cluster if it isn't running:

```bash
sudo service postgresql start          # WSL2 / Ubuntu
brew services start postgresql@16      # macOS
```

## 1.2 Clone and install

```bash
git clone https://github.com/developedbysaad/pulse-board.git
cd pulse-board
npm install
```

Single `npm install` at the root pulls dependencies for all three workspaces (`backend/`, `frontend/`, `docs/`). **Stay at the repo root for everything below** — every `npm` script delegates into the right workspace via `--workspace`, so you should never need to `cd backend/` or `cd frontend/`.

> **If `npm install` warns and `npm run dev` then crashes the frontend with `Cannot find module '@rolldown/binding-linux-x64-gnu'`** — that's a [known npm bug](https://github.com/npm/cli/issues/4828) where optional native dependencies don't get installed. Fix:
>
> ```bash
> rm -rf node_modules package-lock.json frontend/node_modules backend/node_modules docs/node_modules
> npm install
> ```
>
> The clean re-install pulls the platform-specific Rolldown binary. (Vite 8 uses Rolldown for bundling.)

## 1.3 Set up the local Postgres role + databases

You need a role with `LOGIN` + `CREATEDB` (so the test runner can drop & recreate the test DB on each run).

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE pulse WITH LOGIN PASSWORD 'pulse-dev' CREATEDB;
SQL
```

If `sudo -u postgres psql` says "peer authentication failed" — see [`guide.md` §1.2](./guide.md#12-authentication--the-part-that-traps-everybody) for the `pg_hba.conf` fix. On stock Ubuntu the line above just works.

> **Note:** the `CREATEDB` privilege is what lets `npm test` drop + recreate `pulse_board_test` between runs. Without it, the `pretest` script will fail.

## 1.4 Generate local secrets and write `backend/.env`

```bash
cp backend/.env.example backend/.env
```

Generate three random secrets and append them:

```bash
node -e "for (const k of ['SESSION_SECRET','CSRF_SECRET','COOKIE_SECRET']) console.log(k+'='+require('crypto').randomBytes(32).toString('hex'))" >> backend/.env
```

Open `backend/.env` and fill in the database section:

```dotenv
NODE_ENV=development
PORT=3000
SESSION_SECRET=<auto-generated above>
CSRF_SECRET=<auto-generated above>
COOKIE_SECRET=<auto-generated above>

DEV_DB_USERNAME=pulse
DEV_DB_PASSWORD=pulse-dev
DEV_DB_NAME=pulse_board_dev
DEV_DB_HOST=127.0.0.1
DEV_DB_PORT=5432

TEST_DB_USERNAME=pulse
TEST_DB_PASSWORD=pulse-dev
TEST_DB_NAME=pulse_board_test
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=5432
```

Don't worry about `DATABASE_URL` — that's only read in production.

## 1.5 Create the dev + test databases and run migrations

From the repo root:

```bash
npm run db:create        # creates pulse_board_dev
npm run db:create:test   # creates pulse_board_test
npm run migrate          # runs migrations against dev
```

Or, in a single shot for a fresh checkout (also runs `npm install` if you skipped 1.2):

```bash
npm run setup
```

If `db:create` errors with `permission denied to create database`, the role doesn't have `CREATEDB`. Fix:

```bash
sudo -u postgres psql -c "ALTER ROLE pulse CREATEDB;"
```

## 1.6 Start everything

```bash
npm run dev
```

This launches three processes side-by-side via `concurrently`:

| Service  | URL                              |
| -------- | -------------------------------- |
| Backend  | http://localhost:3000            |
| Frontend | http://localhost:5173            |
| Docs     | http://localhost:4321/docs/      |

Vite proxies `/api` and `/socket.io` from `:5173` → `:3000`, so the browser sees a single origin and session cookies work without configuration.

To run only one workspace:

```bash
npm run dev:backend       # backend only
npm run dev:frontend      # SPA only
npm run dev:docs          # Starlight docs only
```

## 1.7 Run the tests

```bash
# Frontend (Vitest + Testing Library) — fast, no DB needed
npm test --workspace frontend

# Backend (Jest + supertest) — drops & recreates pulse_board_test on each run
npm test --workspace backend

# Both, sequentially
npm test
```

The `pretest` hook in `backend/package.json` runs `db:drop --if-exists && db:create` against `pulse_board_test`. If that fails, the role is missing `CREATEDB` (see 1.3) or the DB host/port in `.env` is wrong.

## 1.8 Verify the local install

In the browser at <http://localhost:5173>:

1. Sign up at `/signup` (any name, email, 8+ char password).
2. Create a poll — pick **Anonymous** mode for the simplest flow.
3. Add 2 questions, 2+ options each.
4. Click **Launch**.
5. Open the **Live analytics** page.
6. In incognito, hit `/e/<customUrl>/vote`, submit a response.
7. The analytics tab updates **without refresh** → WebSockets work.
8. End the poll → publish results → `/e/<customUrl>/results` renders publicly.

Read the dev docs at <http://localhost:4321/docs/> while you're here.

## 1.9 Commands cheatsheet (local)

All of these run from the **repo root** — no `cd` needed.

```bash
npm run setup                                  # install + create dev/test DBs + migrate (one-time)
npm run dev                                    # all three services (backend, frontend, docs)
npm run dev:backend                            # just the API
npm run dev:frontend                           # just the SPA
npm run dev:docs                               # just the docs site
npm test                                       # all tests
npm run lint                                   # eslint, all workspaces
npm run build                                  # frontend/dist + docs/dist
npm start                                      # production-mode backend (NODE_ENV=production)

npm run db:create                              # create pulse_board_dev
npm run db:create:test                         # create pulse_board_test
npm run migrate                                # run pending migrations against dev
npm run migrate:undo                           # roll back the last migration
npm run db:reset                               # drop + recreate + re-migrate dev DB
```

If you ever need a single test file (skips the pretest DB reset):

```bash
NODE_ENV=test npx --workspace backend jest tests/api/auth.test.js
```

---

# Part 2 — Deploy to pulse-board.developedbysaad.com

This section gets you from "code on laptop" to "live at <https://pulse-board.developedbysaad.com>" in eight steps.

## 2.0 What's actually happening

```
┌─ your laptop ─┐                         ┌─ Linux box (any provider) ──────────────┐
│  kamal CLI    │── SSH ─────────────────►│ kamal-proxy   (singleton on the host)   │
│  docker build │── push image ─►docker.io►│ pulse-board-web (the app container)    │
└───────────────┘   (1 image)             │ pulse-board-db  (Postgres 17 accessory) │
                                          └─────────────────────────────────────────┘
                                                      ▲
                                                      │ HTTPS
                                          pulse-board.developedbysaad.com
```

**Kamal does** Docker install, image build, image push, server config, kamal-proxy setup, TLS via Let's Encrypt, **boots the bundled Postgres accessory**, rolling deploys, rollbacks.

**You do** create the box, point DNS, give Kamal an SSH key, set secrets in GitHub, click deploy.

There is **no managed Postgres step** — `config/deploy.yml` declares a `postgres:17` accessory that runs as a sibling container on the same host. `DATABASE_URL` is composed automatically inside `.kamal/secrets` from `POSTGRES_PASSWORD` and resolves to the accessory's container name (`pulse-board-db`) on the kamal Docker network.

## 2.1 Pre-flight

- [ ] Control over `developedbysaad.com` DNS (you can add an A record)
- [ ] A VPS provider account (Hetzner / DigitalOcean / Vultr)
- [ ] GitHub `gh` CLI logged in (`gh auth status`)
- [ ] Local Ruby 3.2+ and Docker (Kamal needs both for the **first** deploy)

```bash
ruby --version          # 3.2+
docker --version
```

If Ruby is older than 3.2:

```bash
# Install via mise (recommended, simplest)
curl https://mise.run | sh
mise install ruby@3.3
mise use --global ruby@3.3
```

## 2.2 Push the code to a fresh GitHub repo

```bash
cd /home/saad/hackathons/pulse-board

git add -A
git commit -m "Initial commit — Pulse Board v1"

gh repo create developedbysaad/pulse-board \
  --public \
  --source=. \
  --remote=origin \
  --description="Real-time online polling platform" \
  --push
```

Verify:

```bash
gh repo view developedbysaad/pulse-board --web
```

## 2.3 Provision the server (Kamal does the heavy lifting)

The trick is to do **almost nothing** to the server beyond creating it. Kamal installs Docker, configures everything else.

### Provision

Pick **Hetzner CX22** (€4/mo, 2 vCPU / 4 GB RAM / 40 GB SSD) or **DigitalOcean basic droplet** ($6/mo). Choose:

- **OS:** Ubuntu 24.04 LTS (default)
- **SSH key:** add your `~/.ssh/id_ed25519.pub` (or generate a fresh one — see 2.6)
- **No firewall rules to configure** — Kamal sets these up

Note the **public IPv4 address**. That's all you need.

### Verify SSH

```bash
ssh root@<SERVER_IP> "uname -a"
# Linux ... 24.04 ...
```

That's it for manual server work. Kamal will:

1. SSH in as `root`.
2. Install Docker (`apt-get install docker-ce`) if missing.
3. Pull `kamal-proxy` and your app image.
4. Provision TLS via Let's Encrypt.
5. Open the firewall (via iptables) for 80/443.

You can optionally create a non-root deploy user and add `ssh.user: deploy` to `config/deploy.yml` for security, but for a hackathon-grade setup, root + key-only auth (already enforced by Hetzner/DO defaults) is fine.

> **Why we don't install Docker manually:** the official Kamal docs say `kamal setup` handles it: *"Install Docker on the servers, if it has permission and it is not already installed."* That's step 1 of `kamal setup`'s three steps (the others are: boot accessories, deploy the app). Manual `apt-get install docker` is just extra friction.

## 2.4 Postgres — bundled, nothing to provision

There is no separate database step. `config/deploy.yml` declares a Postgres 17 **accessory** on the same host:

```yaml
accessories:
  db:
    image: postgres:17
    host: <%= ENV['KAMAL_SERVER_HOST'] %>
    env:
      clear:
        POSTGRES_USER: pulse
        POSTGRES_DB: pulse_board_production
      secret:
        - POSTGRES_PASSWORD
    directories:
      - data:/var/lib/postgresql/data
```

The container's name on the Kamal Docker network is `pulse-board-db`. `.kamal/secrets` composes `DATABASE_URL` from that hostname plus the `POSTGRES_PASSWORD` you'll add as a secret in 2.7:

```
DATABASE_URL=postgres://pulse:${POSTGRES_PASSWORD}@pulse-board-db:5432/pulse_board_production
```

The accessory's data directory is persisted to a named Docker volume (`pulse-board-db-data`), so container restarts and redeploys don't lose data.

> **If you'd rather use managed Postgres (Neon, Supabase, RDS, etc.)** — delete the `accessories` block from `config/deploy.yml`, drop the `DATABASE_URL=…` line from `.kamal/secrets`, and add `DATABASE_URL` as a GitHub Environment secret directly (full connection string with `?sslmode=require`). `backend/src/config/db.js` already enables SSL with `rejectUnauthorized: false` for production, which is what most managed providers require.

## 2.5 DNS

Add an **A record** to `developedbysaad.com`:

```
Type:  A
Name:  pulse-board
Value: <SERVER_IP>
TTL:   300
```

Verify (DNS may take 1–10 minutes to propagate):

```bash
dig +short pulse-board.developedbysaad.com    # must return <SERVER_IP>
```

> kamal-proxy uses Let's Encrypt's HTTP-01 challenge, which means **DNS must resolve before** you run `kamal setup` — otherwise the cert request fails. If you proceed too early, just wait 5 minutes and re-run; `kamal setup` is idempotent.

## 2.6 SSH key for Kamal (and GitHub Actions)

Kamal needs an SSH key to reach the server, both from your laptop and from GitHub's runner.

Generate a dedicated keypair (don't reuse personal keys):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/pulse-board-deploy -C "kamal@pulse-board" -N ""
```

Add the **public** half to the server's `authorized_keys`:

```bash
ssh-copy-id -i ~/.ssh/pulse-board-deploy.pub root@<SERVER_IP>
# or manually: cat ~/.ssh/pulse-board-deploy.pub | ssh root@<SERVER_IP> 'cat >> ~/.ssh/authorized_keys'
```

Test:

```bash
ssh -i ~/.ssh/pulse-board-deploy root@<SERVER_IP> "echo ok"
```

Tell your local SSH agent to use this key for the server (so Kamal picks it up):

```bash
# Append to ~/.ssh/config
cat >> ~/.ssh/config <<EOF

Host <SERVER_IP>
  IdentityFile ~/.ssh/pulse-board-deploy
  IdentitiesOnly yes
  User root
EOF
```

The **private** half goes into the GitHub Environment secret in the next step.

## 2.7 Configure GitHub Environment + secrets

This is where your "where do the keys go?" question gets answered concretely.

### Where each kind of value lives

GitHub has three places you can put values for workflows. Use the right one:

| GitHub UI location                                              | Encrypted? | Per-environment? | Use for                                     |
| --------------------------------------------------------------- | :--------: | :--------------: | ------------------------------------------- |
| Settings → Secrets and variables → Actions → **Repo secrets**   | ✅         | ❌               | Shared, sensitive, same value everywhere     |
| Settings → Secrets and variables → Actions → **Repo variables** | ❌         | ❌               | Shared, non-sensitive (feature flags)        |
| Settings → **Environments → `<env>` → Secrets**                 | ✅         | ✅               | **Sensitive, differs by env (use this!)**   |
| Settings → **Environments → `<env>` → Variables**               | ❌         | ✅               | Non-sensitive, differs by env                |

For Pulse Board, **all of the values below go into Environment secrets**, scoped to a specific environment. They differ between staging and production, and several are sensitive. Repo-level isn't appropriate.

### Create the production environment

In `github.com/developedbysaad/pulse-board`:

1. **Settings → Environments → New environment** → name it `production`.
2. (Recommended) under **Deployment protection rules**, check **Required reviewers** and add yourself. This makes production deploys require a manual click — protects you from accidental shipping.
3. Under **Environment secrets**, click **Add secret** for each row.

#### Required (9)

| Secret name              | Example shape                                            | Where the value comes from                                                                            |
| ------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `SSH_PRIVATE_KEY`        | `-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END...`   | `cat ~/.ssh/pulse-board-deploy` — full PEM text including the `BEGIN`/`END` lines. Keypair from §2.6. |
| `KAMAL_SERVER_HOST`      | `203.0.113.42`                                            | The VPS IP from §2.3.                                                                                  |
| `KAMAL_DEPLOY_HOST`      | `pulse-board.developedbysaad.com`                         | Your public domain — DNS already points at `KAMAL_SERVER_HOST` (§2.5).                                |
| `KAMAL_REGISTRY_USERNAME` | `developedbysaad`                                        | Your Docker Hub handle. Becomes the namespace of `your-handle/pulse-board` on Docker Hub.             |
| `KAMAL_REGISTRY_PASSWORD` | `dckr_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`                  | Docker Hub PAT — generate at <https://app.docker.com/settings/personal-access-tokens> with `Read & Write`. **Not** your Docker Hub password. |
| `POSTGRES_PASSWORD`      | `replace-me-with-a-strong-random-password`                | Strong random password (≥ 24 chars). `openssl rand -base64 32` works.                                 |
| `SESSION_SECRET`         | `0000…0000` (64-char hex)                                | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.                           |
| `CSRF_SECRET`            | `1111…1111` (64-char hex)                                | Same generator, different value. HMAC key for the `csrf-csrf` package.                                |
| `COOKIE_SECRET`          | `2222…2222` (64-char hex)                                | Same generator, different value. `cookie-parser` signing + `Response.ipHash` HMAC key.                 |

For everything Docker Hub — PAT generation, UI tour, common errors, switching to GHCR/ECR/etc. — see [`plan/docker-hub.md`](docker-hub.md).

#### Optional (5) — unlock email + demo seed

| Secret name           | Example shape                                                       | Where the value comes from                                              |
| --------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `BREVO_API_KEY`       | `xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx`             | v3 API key from <https://app.brevo.com/settings/keys/api>.              |
| `BREVO_SENDER_EMAIL`  | `hello@developedbysaad.com`                                         | A sender address verified on Brevo.                                     |
| `BREVO_SENDER_NAME`   | `Pulse Board`                                                       | `From:` display name. Defaults to `Pulse Board`.                        |
| `GUEST_DEMO_EMAIL`    | `demo@developedbysaad.com`                                          | Email for the demo admin account `npm run db:seed` creates.             |
| `GUEST_DEMO_PASSWORD` | `replace-me-with-a-demo-password`                                   | Password for that demo admin login.                                     |

#### Auto-injected / composed — do **not** add as secrets

| Variable         | Source                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_ORIGIN`  | Composed as `https://${KAMAL_DEPLOY_HOST}` — used for absolute URLs in outbound email.                       |
| `DATABASE_URL`   | Composed inside `.kamal/secrets` as `postgres://pulse:${POSTGRES_PASSWORD}@pulse-board-db:5432/pulse_board_production`. |

> **Why environment secrets and not repo secrets?** When you eventually add a staging environment, it gets a *different* `KAMAL_SERVER_HOST`, `POSTGRES_PASSWORD`, and so on. Per-environment secrets prevent staging from accidentally touching production. The workflow's `environment: production` line scopes the secret context to the matching environment.

## 2.8 First deploy (one-time `kamal setup` from your laptop)

### Why `setup` (not `deploy`) for the first run

`kamal deploy` and `kamal setup` are different commands. Pick the wrong one on a fresh host and the first run fails before it even pulls the image. Quick reference:

| Step                            | `kamal setup` | `kamal deploy` |
| ------------------------------- | :-----------: | :------------: |
| 1. Install Docker on the host (if missing) | ✅ | ❌ |
| 2. Boot `kamal-proxy` (if missing) — shared singleton, routes by Host header | ✅ | ❌ |
| 3. **Boot all declared accessories** → `pulse-board-db` (Postgres 17), creates the data volume, Postgres entrypoint auto-creates the `pulse_board_production` DB + `pulse` role from your env vars | ✅ | ❌ |
| 4. Build the image locally → push to the registry | ✅ | ✅ |
| 5. Pull the image on the host, start the container (entrypoint runs `sequelize-cli db:migrate` first, then boots the app), atomic-swap traffic in via `kamal-proxy` | ✅ | ✅ |

The decisive row is **step 3**. On a fresh host the `pulse-board-db` container does not exist, so the migration hook in step 5 has nothing to connect to and the whole deploy aborts. `setup` is the only command that boots the accessory.

After `setup` succeeds, the accessory keeps running across deploys (its data volume is persistent), so every subsequent change ships via `deploy` from this point forward.

### Will it disturb another Kamal app on the same host?

No. Everything `setup` creates is namespaced by `service:` (pulse-board for this repo):

| Resource type          | Yours                              | Theirs                              | Collide? |
| ---------------------- | ---------------------------------- | ----------------------------------- | -------- |
| App container          | `pulse-board-web`                  | `<other-service>-web`               | No       |
| Accessory container    | `pulse-board-db`                   | `<other-service>-db`                | No       |
| Volume                 | `pulse-board-db-data`              | `<other-service>-db-data`           | No       |
| Image path             | `docker.io/<owner>/pulse-board:<sha>` | their registry path              | No       |
| Public domain          | `pulse-board.developedbysaad.com`  | their domain                        | No (proxy routes by Host) |
| Docker bridge network  | shared `kamal`                     | shared `kamal`                      | Shared, but addressed by container name — neither app can accidentally hit the other's DB |
| `kamal-proxy`          | shared singleton                   | shared singleton                    | Shared, **not restarted** by your `setup` — your domain is added alongside |

The three shared pieces (host, Docker network, `kamal-proxy`) are all extended, not modified. The other app keeps serving without a blip. `setup` detects Docker is already installed and skips the install; detects `kamal-proxy` is already running and just adds your domain rule.

### What `setup` does for pulse-board, step by step

- Installs Docker on the server (no-op if already there).
- Pulls and configures kamal-proxy (no-op if already running; just adds the new domain rule).
- Boots the `pulse-board-db` Postgres accessory and creates its data volume.
- Builds the image locally and pushes to Docker Hub.
- The container's entrypoint runs `sequelize-cli db:migrate` on start, then boots the app.
- Starts the app container behind kamal-proxy.
- Configures TLS for `pulse-board.developedbysaad.com` via Let's Encrypt.

You run this **once** from your laptop. After that, GitHub Actions handles every deploy via the `deploy` action.

### 2.8a Install Kamal locally

```bash
gem install kamal -v 2.11.0 --no-document
kamal version          # should print 2.11.0
```

### 2.8b Log into Docker Hub locally

```bash
# Generate a PAT at https://app.docker.com/settings/personal-access-tokens
#   Scope: Read & Write
#   Save it somewhere — you'll need it for Kamal too.
echo $DOCKERHUB_PAT | docker login -u developedbysaad --password-stdin
```

(No `--registry` flag — Docker Hub is the default registry for `docker login`.)

### 2.8c Fill in `.env` so Kamal picks up the values

The dotenv loader at the top of `config/deploy.yml` reads `.env` from the repo root. Copy the example and fill in the same values you put in GitHub Environment secrets:

```bash
cp .env.example .env
$EDITOR .env
```

Required for `kamal setup`:

```
KAMAL_SERVER_HOST=<SERVER_IP>
KAMAL_DEPLOY_HOST=pulse-board.developedbysaad.com

KAMAL_REGISTRY_USERNAME=developedbysaad
KAMAL_REGISTRY_PASSWORD=<DOCKERHUB_PAT>

POSTGRES_PASSWORD=<from 2.7>

SESSION_SECRET=<from 2.7>
CSRF_SECRET=<from 2.7>
COOKIE_SECRET=<from 2.7>

PUBLIC_ORIGIN=https://pulse-board.developedbysaad.com
```

Optional (only if you set them in Environment secrets):

```
BREVO_API_KEY=<from 2.7>
BREVO_SENDER_EMAIL=<from 2.7>
BREVO_SENDER_NAME=Pulse Board
GUEST_DEMO_EMAIL=<from 2.7>
GUEST_DEMO_PASSWORD=<from 2.7>
```

`.env` is gitignored — never commit it. The exact same names work as `export VAR=value` in your shell if you prefer that over a file.

### 2.8d Run `kamal setup`

```bash
cd /home/saad/hackathons/pulse-board
kamal setup
```

Watch the output. According to the [official docs](https://kamal-deploy.org/docs/commands/setup/), `kamal setup` does three things in order:

1. **Install Docker** on each server (via `get.docker.com`) if it isn't already there — needs root SSH for this, which is why we connect as `root`.
2. **Boot accessories** — pulls `postgres:17`, starts `pulse-board-db` on the host with the persistent `pulse-board-db-data` volume mounted. After this step, the app's `DATABASE_URL` resolves on the kamal Docker network.
3. **Deploy the app** — same as `kamal deploy` from then on:
   - Build the multi-stage image locally → push to `docker.io/developedbysaad/pulse-board:<sha>`.
   - Boot kamal-proxy on the server, configure the route for `pulse-board.developedbysaad.com`, request a Let's Encrypt cert.
   - Pull the image on the server, start the container — the entrypoint runs `npx sequelize-cli db:migrate` first, then boots the app — and atomically swap proxy traffic to the new container.

Total time: 3–5 minutes.

If anything fails, it usually says exactly what's wrong — see [Troubleshooting](#troubleshooting) below.

### 2.8e Smoke test

```bash
curl -sI https://pulse-board.developedbysaad.com/api/health
# HTTP/2 200
# content-type: application/json; charset=utf-8

curl -s https://pulse-board.developedbysaad.com/api/health
# {"ok":true}

curl -sI https://pulse-board.developedbysaad.com/docs/
# HTTP/2 200
```

Open <https://pulse-board.developedbysaad.com> in a browser — login page renders. Open `/docs/` — Starlight site renders.

## 2.9 Verify the full flow on the live site

1. Sign up at `/signup` (real email, 8+ char password).
2. Create a poll, mode = **anonymous**.
3. Add 2 questions, 2+ options each.
4. Click **Launch**.
5. Open `/elections/1/analytics` in one tab.
6. In another browser/incognito, hit `/e/<customUrl>/vote`, submit a response.
7. Analytics tab updates **without refresh** → WebSockets work behind the proxy.
8. End the poll → publish results.
9. Open `/e/<customUrl>/results` in incognito → public results render.

If all 9 pass, you're shipping.

## 2.10 Future deploys go through GitHub Actions only

`kamal setup` from your laptop was a one-time thing. Every deploy after that lives in `Actions → Deploy → Run workflow`. The workflow is **manual-dispatch only** — there is no auto-deploy on push, PR, or schedule.

To ship a new version:

1. Open `https://github.com/developedbysaad/pulse-board/actions/workflows/deploy.yml`.
2. Click **Run workflow**.
3. Choose:
   - **Action** — one of the Kamal-native actions in the table below (defaults to `deploy`).
   - **Ref** — branch, tag, or commit SHA (defaults to `main`).
4. Click **Run**. Wait ~3 minutes for `deploy`. Zero downtime — Kamal does atomic blue-green via the proxy.

### Available actions

Each option in the dropdown is a thin wrapper around a documented [Kamal command](https://kamal-deploy.org/docs/commands/).

| `action`        | Wraps                                                  | When to use                                                              |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `deploy`        | `kamal deploy`                                         | Default. Every normal release: build → push → migrate → atomic swap.    |
| `redeploy`      | `kamal redeploy`                                       | Restart with the same image (no rebuild). Picked up new env values.     |
| `rollback`      | `kamal rollback`                                       | Latest release is broken — flip back to the previous image.             |
| `setup`         | `kamal setup`                                          | Brand-new host (usually run from laptop instead — included as safety).  |
| `migrate`       | `kamal app exec --reuse "npx sequelize-cli db:migrate"` | Re-run migrations on the live container.                                |
| `seed`          | `kamal app exec --reuse "npx sequelize-cli db:seed:all"` | Load demo data (uses `GUEST_DEMO_*` secrets).                          |
| `logs`          | SSH + `docker logs --tail 500`                         | Last 500 timestamped lines from `pulse-board-web`.                      |
| `logs-errors`   | SSH + `docker logs --since 24h` filtered               | Error / exception / 5xx / failed / stack lines, last 24h.               |
| `proxy-reboot`  | `kamal proxy reboot --confirmed`                       | Rare — only after proxy config change or stuck TLS renewal.             |
| `prune`         | `kamal prune all`                                      | Disk cleanup. `deploy` already prunes on success.                       |

### What the workflow does on every run

The `kamal` job (everything except `logs` / `logs-errors`):

1. Verifies the 7 required Environment secrets are present (fails fast with a named-missing list otherwise).
2. Checks out the chosen ref.
3. Installs Ruby 3.3 + Kamal 2.11.0.
4. Sets up Docker Buildx + logs into Docker Hub — **only** for `deploy` / `setup`, since the others don't build.
5. Loads `SSH_PRIVATE_KEY` into ssh-agent and `ssh-keyscan`s `KAMAL_SERVER_HOST`.
6. Releases any stale `kamal lock` from a cancelled prior run, then runs the wrapped Kamal command.
7. On a successful `deploy`, runs `kamal prune all` so old containers + images don't pile up on the host.
8. Writes a step summary with `action / ref / commit / actor / status / URL / docs URL`.

The `logs` job (`logs` / `logs-errors` only):

1. Verifies just `SSH_PRIVATE_KEY` + `KAMAL_SERVER_HOST` (no Ruby / Docker / Kamal needed).
2. Loads SSH and trusts the host.
3. SSHes in, finds the running `pulse-board-web` container, prints either the last 500 lines or the filtered error lines.

If you set up required reviewers in 2.7, you'll get a "Waiting for approval" prompt before it runs.

---

## Cloning this setup for another project

If you fork or copy this layout for a second app — especially one running on the **same host** — the values listed here must be different per project, otherwise containers / volumes / images will collide. GitHub Environment **secrets** are already scoped per repository, so secret *names* like `SESSION_SECRET` or `POSTGRES_PASSWORD` can stay identical across repos with zero risk of leaking values between them.

### What must be unique per project

| Where it lives                           | Pulse Board value                                       | Why it has to differ                                                                                          |
| ---------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `config/deploy.yml` → `service:`         | `pulse-board`                                           | Kamal prefixes every container, image tag, accessory, and volume with this. Two services on one host must differ. |
| `config/deploy.yml` → `image:`           | `<KAMAL_REGISTRY_USERNAME>/pulse-board` (on `index.docker.io`)            | The Docker image path. Different Docker Hub handle → different image path automatically; only collides if you hand-pick the same name. |
| `config/deploy.yml` → `builder.cache.image` | `<owner>/pulse-board-buildcache`                     | Build-cache layer image. Same naming logic as `image:`.                                                       |
| `config/deploy.yml` → `proxy.host`       | `pulse-board.developedbysaad.com`                       | kamal-proxy routes by `Host:` header. Two services on one proxy must use different domains.                   |
| `config/deploy.yml` → `accessories.db.env.clear.POSTGRES_USER` | `pulse`                                | Cosmetic — but matching it to the project keeps `psql` sessions self-evident.                                 |
| `config/deploy.yml` → `accessories.db.env.clear.POSTGRES_DB`   | `pulse_board_production`               | Same — match it to the project so logs and queries are unambiguous.                                           |
| `.kamal/secrets` → `DATABASE_URL` host   | `pulse-board-db`                                        | Resolved on the Kamal Docker network as `<service>-<accessory>`. Changing `service:` changes this hostname.   |
| `.kamal/secrets` → `DATABASE_URL` path   | `/pulse_board_production`                               | Must match the accessory's `POSTGRES_DB`.                                                                     |
| `.kamal/secrets` → `DATABASE_URL` user   | `pulse`                                                 | Must match the accessory's `POSTGRES_USER`.                                                                   |

The actual GitHub repository name and your domain typically drive everything else — pick those first, derive the rest.

### What stays the same across projects

- All seven required Environment secret **names** (`SESSION_SECRET`, `POSTGRES_PASSWORD`, …). Their *values* are different per repo because Environment secrets are repo-scoped.
- The Docker registry (`index.docker.io`) and the `KAMAL_REGISTRY_USERNAME` / `KAMAL_REGISTRY_PASSWORD` secret pair (the values differ per maintainer but the *names* are identical across forks).
- The workflow file shape (`.github/workflows/deploy.yml`) — only the seven required-secret names in the validate step need to change if you add or remove app-level secrets.
- Migrations run automatically when the container starts (via the entrypoint in `Dockerfile`).

### Worked example — cloning to `voter-pulse` on the same host

Suppose you fork pulse-board into a new repo `github.com/developedbysaad/voter-pulse` and want it live at `voter-pulse.developedbysaad.com`, on the same Linux box that already runs Pulse Board.

`config/deploy.yml` diff:

```diff
-service: pulse-board
+service: voter-pulse

-image: <%= ENV.fetch('KAMAL_IMAGE', "#{ENV['GITHUB_REPOSITORY_OWNER'] || 'developedbysaad'}/pulse-board") %>
+image: <%= ENV.fetch('KAMAL_IMAGE', "#{ENV['GITHUB_REPOSITORY_OWNER'] || 'developedbysaad'}/voter-pulse") %>

 builder:
   arch: amd64
   cache:
     type: registry
-    image: <%= "#{ENV['GITHUB_REPOSITORY_OWNER'] || 'developedbysaad'}/pulse-board-buildcache" %>
+    image: <%= "#{ENV['GITHUB_REPOSITORY_OWNER'] || 'developedbysaad'}/voter-pulse-buildcache" %>

 accessories:
   db:
     image: postgres:17
     host: <%= ENV['KAMAL_SERVER_HOST'] %>
     env:
       clear:
-        POSTGRES_USER: pulse
-        POSTGRES_DB: pulse_board_production
+        POSTGRES_USER: voter
+        POSTGRES_DB: voter_pulse_production
       secret:
         - POSTGRES_PASSWORD
     directories:
       - data:/var/lib/postgresql/data
```

`.kamal/secrets` diff (the parts that derive from `service:` + the accessory env):

```diff
-DATABASE_URL=postgres://pulse:${POSTGRES_PASSWORD}@pulse-board-db:5432/pulse_board_production
+DATABASE_URL=postgres://voter:${POSTGRES_PASSWORD}@voter-pulse-db:5432/voter_pulse_production
```

GitHub side, in the new repo:

- Set `KAMAL_DEPLOY_HOST` = `voter-pulse.developedbysaad.com`.
- Set `KAMAL_SERVER_HOST` = the same VPS IP both apps share.
- Generate **fresh** values for `SESSION_SECRET`, `CSRF_SECRET`, `COOKIE_SECRET`, `POSTGRES_PASSWORD` — don't reuse Pulse Board's, even though the names are identical (Environment secrets are repo-scoped, so the names colliding is harmless, but reusing values dilutes blast-radius isolation).
- Add an A record `voter-pulse.developedbysaad.com → <SERVER_IP>`.

After `kamal setup` from your laptop, the host will be running:

```
pulse-board-web · pulse-board-db          (existing — untouched)
voter-pulse-web · voter-pulse-db          (new — provisioned by the second `kamal setup`)
kamal-proxy                               (singleton — routes both by Host header)
```

Both apps share only the proxy and the Docker network. Adding, removing, or redeploying one can never affect the other.

---

## Optional — staging environment

Create a parallel pipeline for testing changes before production. You'll need to extend the workflow with an `environment` input, since the current `deploy.yml` is wired straight to `production`.

1. Provision a second box (smaller is fine).
2. Add A record `pulse-board-staging.developedbysaad.com → <STAGING_SERVER_IP>`.
3. In GitHub → **Settings → Environments → New environment** → `staging`. Add the same 7 required secrets with **staging values** (separate `POSTGRES_PASSWORD`, separate `SESSION_SECRET`, etc.).
4. Add a `config/deploy.staging.yml` overlay (different `service:`, different `proxy.host`, different accessory name).
5. In `.github/workflows/deploy.yml`, add an `environment` input alongside `ref` and `action`, and pass `-d ${{ inputs.environment }}` to every `kamal` command.
6. Run `kamal setup -d staging` once from your laptop.

The same workflow then handles both — `environment: ${{ inputs.environment }}` swaps the secret context, `-d` swaps the Kamal destination.

---

## Troubleshooting

### `kamal setup` hangs at "Configure proxy" or cert request fails

DNS hasn't propagated yet, or it points at the wrong IP.

```bash
dig +short pulse-board.developedbysaad.com   # must equal <SERVER_IP>
```

Wait a few minutes, then re-run `kamal setup -d production`. It's idempotent.

### `Permission denied (publickey)` from Kamal SSH

Server doesn't have the key in `authorized_keys`, or your `~/.ssh/config` isn't pointing at the right private key. Re-run:

```bash
ssh-copy-id -i ~/.ssh/pulse-board-deploy.pub root@<SERVER_IP>
ssh -i ~/.ssh/pulse-board-deploy root@<SERVER_IP> "echo ok"
```

For the GitHub Action: the `SSH_PRIVATE_KEY` secret must contain the **private** half of the keypair whose **public** half is on the server.

### `unauthorized: authentication required` from Docker Hub

The Docker Hub PAT in `KAMAL_REGISTRY_PASSWORD` is missing, wrong, or expired. Regenerate at <https://app.docker.com/settings/personal-access-tokens> with `Read & Write` scope, update the `KAMAL_REGISTRY_PASSWORD` Environment secret AND your local `.env`, re-run `docker login -u <handle>`, retry. See `plan/docker-hub.md` §8 for the full error catalogue.

### Migrations fail with `database "pulse_board_production" does not exist`

The Postgres accessory normally creates the database on first boot using `POSTGRES_DB: pulse_board_production` from `config/deploy.yml`. If the migrations hook runs before the accessory finishes booting, retry the deploy — `kamal deploy` is idempotent.

If you switched to managed Postgres, the database name in your `DATABASE_URL` must already exist on the provider side. Most providers let you pick it at project creation; check the URL's path component:

```bash
psql "$DATABASE_URL" -c "SELECT current_database();"
```

### Sequelize complains about SSL on connect

This only happens with managed Postgres. `backend/src/config/db.js` requires SSL in production. If your provider doesn't support SSL (rare), use a different provider — don't disable SSL. The bundled accessory speaks plaintext on the internal Docker network, which is fine because that network is host-internal.

### Container exits immediately after deploy

Env validation (Zod) failed — usually a missing or short secret. Check:

```bash
ssh root@<SERVER_IP> "docker logs \$(docker ps -a --filter name=pulse-board-web --format '{{.Names}}' | head -1) --tail 50"
```

The Zod error names exactly which env var is bad.

### Frontend loads but `/api/*` returns 404

You're probably hitting a stale cached build. Force a redeploy:

```bash
# Or click Run workflow in GitHub Actions
kamal redeploy
```

### Health check fails right after deploy

```bash
ssh root@<SERVER_IP> "docker logs pulse-board-web-<latest> --tail 100"
```

Most common: the container can't reach Postgres. With the bundled accessory, that means the `pulse-board-db` container isn't running — try `kamal accessory boot db`. With managed Postgres, check `DATABASE_URL` and the provider's allow-list.

---

## Daily ops cheatsheet

### Local

```bash
npm run dev                                    # backend + frontend + docs
npm test                                       # all tests
npm run lint
npm run build                                  # produces dist for FE + docs
```

### Production (from your laptop, after first deploy)

```bash
# These all run from your local clone of the repo, against the configured -d
kamal app logs -f -d production                 # tail logs
kamal app exec --reuse "node -e 'console.log(process.versions)'" -d production
kamal redeploy -d production                    # redeploy current image
kamal env push -d production                    # push secret changes without rebuilding
kamal rollback <prev-version> -d production     # roll back; prev-version from `kamal app version`
kamal proxy logs -d production                  # see proxy / TLS / routing
```

### Production (from GitHub)

- **Deploy** — Actions → Deploy → Run workflow → `production`.
- **Logs** — `kamal app logs -f` from your laptop is faster than the GitHub UI.
- **Rollback** — same workflow re-targeted to a previous commit, OR `kamal rollback` locally.

---

## You're done

Once 2.9 passes:

- ✅ Public GitHub repo: <https://github.com/developedbysaad/pulse-board>
- ✅ Live deploy: <https://pulse-board.developedbysaad.com>
- ✅ Docs: <https://pulse-board.developedbysaad.com/docs/>
- ✅ All 13 spec features verified live by the smoke test
- ✅ README updated, deploy workflow ready for future changes

Submit the GitHub URL and the deploy URL.

---

## Where to look next

- **DB queries / Postgres concepts** — [`plan/guide.md`](./guide.md) §1
- **Multi-app on one server** — [`plan/guide.md`](./guide.md) §2
- **Architecture deep-dive** — [`CLAUDE.md`](../CLAUDE.md) and the deployed `/docs/architecture/`
- **Migration history / decisions** — [`plan/todo.md`](./todo.md)
