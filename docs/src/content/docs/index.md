---
title: Pulse Board
description: Real-time online polling platform with live analytics, anonymous + authenticated modes, and one-click result publishing.
template: splash
hero:
  tagline: Build polls. Share a link. Watch responses arrive live.
  actions:
    - text: Get started
      link: /docs/local-development/
      icon: right-arrow
    - text: REST API
      link: /docs/api-reference/
      variant: minimal
---

## What it does

- **Single-option questions** with required / optional flags
- **Two response modes** per poll — authenticated voters or anonymous open links
- **Lifecycle** — separate launch, end, and publish actions plus optional `expiresAt`
- **Live analytics** — per-question option counts streamed over WebSockets
- **Public results** — once published, anyone with the link can see the final outcome

## How it's built

Express 5 JSON API + Sequelize/Postgres on the backend, React 19 + Vite 8 + Tailwind 4 SPA on the frontend, socket.io for real-time. One Postgres database, one session cookie shared between HTTP and WebSocket connections, one origin in production (Express serves the SPA bundle).

See [Architecture](/docs/architecture/) for the high-level diagram, or [Technical architecture](/docs/technical-architecture/) for the deeper dive.

## Design

The interface isn't generic dashboard chrome — it's modelled around the act of marking a paper ballot.

- **[Design principles](/docs/design-principles/)** — the eight rules behind every visual choice (and the ones we deliberately reject).
- **[Design system](/docs/design-system/)** — concrete colour tokens, type scale, components, motion. Where each piece lives in the codebase.
- **[Technical architecture](/docs/technical-architecture/)** — request lifecycle, auth, real-time, performance budget.

---

*Pulse Board · made by Saad · [x.com/developedbysaad](https://x.com/developedbysaad)*
