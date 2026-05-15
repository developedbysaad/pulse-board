---
title: Creating polls
description: Walk through the admin flow from sign-up to launch.
---

## Sign up

Visit `/signup`, give a name + email + password (min 8 characters). You're logged in immediately.

## Create a poll

From the dashboard, click **+ New poll**. You pick:

- **Name** — internal label, also the source of the auto-generated slug
- **Response mode** — see [Response modes](/docs/response-modes/)

The **Public link** preview appears under the form as you type. By default the slug is generated from the name (`Q1 product survey` → `q1-product-survey`). Click **Customise →** to type your own — uniqueness is checked live, with collision suggestions (`team-lunch` taken → `team-lunch-2`). Reserved or non-canonical slugs (uppercase, non-ASCII) are flagged with the canonical version offered as a one-click fix.

The slug becomes the public URL: `/e/<slug>`. Once the poll is launched, the slug is locked alongside name and mode — only `expiresAt` can change post-launch.

## Add questions and options

Open the poll and use the **Questions** tab:

1. Type a question title.
2. (Optional) add a description.
3. Toggle **Required** — required questions reject submissions that skip them, both on the frontend (HTML5 form validation) and backend (zod + DB cross-check).
4. Add at least two options before launch.

Questions and options are locked once the poll is launched.

## Add voters (authenticated mode only)

If your poll is in **authenticated** mode, the **Voters** tab lets you pre-register login credentials. Each voter gets:

- A `voterId` — string identifier (employee ID, ticket number, email)
- A `password` — pre-shared with the voter

Voter IDs are unique within a poll, so the same voter ID can be reused across different polls without conflict.

## Launch

The launch action checks that:

- At least one question exists.
- Every question has at least two options.
- (Authenticated mode) at least one voter is registered.

After launch, the **Live analytics** button takes you to the realtime dashboard — see counts climb as responses arrive over WebSockets.

## End and publish

These are independent steps:

- **End** stops accepting new responses. Returns `410 Gone` to any further submit attempts.
- **Publish results** flips `resultsPublished = true`, after which `GET /api/public/elections/:customUrl/results` returns the public summary. Anyone visiting `/e/:customUrl` is auto-redirected there.

You can publish, unpublish, then publish again — the data doesn't change.
