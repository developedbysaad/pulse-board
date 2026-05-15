---
title: Publishing results
description: How "end" and "publish" differ, and what respondents see at each stage.
---

## End vs. publish

These are **two separate actions** on `Election`:

| Action      | What changes                              | What respondents see                                   |
| ----------- | ----------------------------------------- | ------------------------------------------------------ |
| **End**     | `ended = true`                            | `/e/:customUrl/vote` returns 410 Gone on submit.       |
| **Publish** | `resultsPublished = true`                 | `/e/:customUrl/results` becomes accessible (was 404).  |

Calling `publish` requires `ended === true`. The reverse (`unpublish`) flips `resultsPublished` back to `false` if you need to redact temporarily.

## Why split them

Common scenarios:

- **End now, publish after a review.** Stop accepting responses immediately, then audit the data, then publish.
- **Publish then keep accepting.** Not supported — publish requires `ended`. (You can still preview results live in the admin analytics page; just don't share that URL.)
- **Reopen.** Not supported. Once ended, an election can't be relaunched. (Create a new poll instead.)

## What the public sees

Visiting `/e/:customUrl` triggers an auto-redirect based on state:

```
            launched? ──┐
   ┌──── no ────────────┴──────── "not launched yet"
   ▼
   ended? ──────yes────► resultsPublished?
                              │
   ┌──── no ◄─────────────────┘
   ▼
   anonymous mode → ballot
   authenticated mode → /voterLogin (or already logged in → ballot)
   already voted → /thanks
```

If `resultsPublished` is `true` at any point, the redirect goes straight to `/e/:customUrl/results`.

## Embedded analytics

Even before publish, the admin can always see live counts via:

- The `/elections/:id/analytics` page in the SPA.
- `GET /api/elections/:id/analytics` (admin auth required).
- `response:new` socket event in the `election:<id>:admin` room.

The admin's view never depends on `resultsPublished` — only the public view does.
