---
title: WebSocket events
description: socket.io rooms and events emitted by the backend.
---

Socket.IO is mounted at `/socket.io/`. The same `express-session` cookie used by HTTP authenticates the connection — `io.engine.use(sessionMiddleware)` shares it. Anonymous connections work too; they just don't get admin-only events.

## Rooms

Each election has two rooms:

- **`election:<id>:public`** — anyone who emits `election:join` for a valid election.
- **`election:<id>:admin`** — only sessions where `req.user.type === 'admin' && req.user.id === election.adminId`.

This split prevents leaking live response counts to respondents in modes where you don't want them to see the running tally.

## Client → server

### `election:join`

```ts
socket.emit("election:join", { electionId?: number, customUrl?: string });
```

Validates the election exists; joins the public room and (if applicable) the admin room. Pass either `electionId` or `customUrl`.

### `election:leave`

```ts
socket.emit("election:leave", { electionId: number });
```

Leaves both rooms.

## Server → client

### `response:new` (admin room only)

```ts
socket.on("response:new", ({ totalResponses, newAnswers }) => …);
// {
//   totalResponses: 47,
//   newAnswers: [{ questionId: 3, optionId: 9 }, …]
// }
```

Emitted once per submission to the admin room. The client typically handles this by invalidating the React Query cache key (`['analytics', id]`) so the chart refetches authoritatively — small WS payload, big REST payload only when needed.

### `election:status` (both rooms)

```ts
socket.on("election:status", ({ launched, ended, resultsPublished, expiresAt }) => …);
```

Emitted when the admin calls launch / end / publish / unpublish. Public listeners can use this to reactively update the landing page (e.g. show "results just published, click here").

## React hook

```jsx
import { useElectionSocket } from "../hooks/useElectionSocket";

function AnalyticsPage() {
  const { latest, status } = useElectionSocket({ electionId });
  // latest: most recent response:new payload
  // status: most recent election:status payload
  // …
}
```

The hook handles `join` on mount, `leave` on unmount, and exposes the latest values from each event. Wire `latest` to a `useEffect` that invalidates queries.

## Implementation pointers

- Backend emitters: `backend/src/sockets/emitters.js` — `emitResponseNew(electionId, payload)` and `emitElectionStatus(electionId, payload)`.
- Backend room joins: `backend/src/sockets/index.js`.
- Controllers import the emitters; they never reference the `io` instance directly.
- The session is the only auth — there is no JWT.
