---
title: Design principles
description: The visual and editorial choices behind Pulse Board, and how they map to specific code in the SPA.
---

Pulse Board's interface isn't generic dashboard chrome. It's tuned around a single metaphor — **hand-counted ballots, in real time** — and every visual choice flows from that. This page is the rationale; the next page ([Design system](/docs/design-system/)) is the concrete reference.

## The metaphor

A polling app should feel like the act it represents: someone marking a paper ballot, dropping it in a box, and watching the count tick up. We resisted the default SaaS dashboard look (slate background, blue buttons, glass-morphism cards) because it has nothing to do with polling and looks like every other app a user has half-forgotten.

The chosen direction is **editorial / civic-paper**:

- **Cream paper background**, not white or charcoal. The hue (warm, ~oklch 0.97 0.013 85) recalls newsprint and ballot stock.
- **Deep ink foreground** with a single vivid coral accent for live signals and primary CTAs. Two-color systems force every visual decision through a meaningful constraint.
- **Hand-drawn tally marks** as the unit of measure — used as decorative SVG strokes for "you've signed in N times" and on the marketing pillars. They're animated by `stroke-dashoffset` so the strokes appear to be drawn.
- **Stamped wordmarks** rotated -2deg to suggest a rubber stamp pressed onto paper.

## Eight principles

### 1. Two colours plus paper, never more

The palette is **paper · ink · coral**. An indigo backup exists for results charts (so they don't compete with live coral analytics), and tuned status hues exist for banners. That's it. We don't add gradients, we don't add a fifth brand colour for "info". Constraint forces clarity.

### 2. Display in serif, body in sans, marks in mono, accents in script — never blend

Four roles, four typefaces, no overlap:

| Role | Family | Where you see it |
| --- | --- | --- |
| Display | **Fraunces** (variable opsz + SOFT) | Page titles, hero headlines, stat numbers |
| Body | **Inter** | Paragraphs, labels |
| Marks / meta | **JetBrains Mono** | Tags, eyebrows, status pills, timestamps |
| Accents | **Caveat** | Hand-script asides ("↳ no setup · the demo poll is already running") |

Sans-serif headings feel generic. Display serif headlines are the single biggest aesthetic differentiator. We pair Fraunces with monospaced metadata for the "press / civic record" feel and reserve Caveat for moments that are deliberately personal.

### 3. Hierarchy through type size, not weight or colour

Compare two ways of saying "Live":

- ❌ *bold + green*: every dashboard does this, the eye stops noticing.
- ✅ *small mono caps with a pulsing coral dot*: the dot moves, the type doesn't shout.

Headings get to be loud (4–7rem in Fraunces). Everything else is calm: body 16px, meta 11px in tabular mono. The contrast does the work.

### 4. Cards are paper, not glass

Each card is an ink-bordered rectangle, sometimes with a hard 6–8px ink shadow (offset, not blurred). No backdrop-blur. No glow. The shadow says "physical object on paper" — which is the whole metaphor.

### 5. Motion is purposeful, never decorative

We use motion for moments where it earns its keep:

- **`pulse-dot`** on every "live" indicator — half a second per beat, says "this is updating without you".
- **`marquee`** on the marketing ticker — endless, slow, one-direction, reads like a stock ticker.
- **`bar-grow`** on result bars (entry only) — the scaleX origin is left, so bars feel like they grow from the question.
- **`draw-tally`** for `<TallyMark>` SVGs — strokes draw via `stroke-dashoffset` with stagger.
- **`stamp`** for the rubber-stamp eyebrow on auth pages — over-rotates then settles to -2deg.
- **`rise`** + `.stagger` for page entry — children reveal in 100ms increments.

We **do not** animate hover-out, content shifts, or anything that fights the user. Reduced motion is honoured by avoiding repeating animations on elements that aren't critical.

### 6. Inputs sit on the line, not in a box

The auth and CTA forms use `.line-underline` — a 1.5px ink rule, no border-box, no padding-rectangle. It echoes signing your name on a paper form. It also makes the form smaller and quieter, so the headline can be loud.

### 7. Buttons are stamps, not pills

The primary action across the site is `.stamp-btn`: hard ink shadow, -1.5deg rotation, snaps inward when active. It looks like the action it represents (stamping the ballot) and reads as decisive — never a flat rectangle.

### 8. Honesty in numbers

Pulse Board never fakes a count. The "you've signed in N times" tally on `/login` reads from `localStorage` and shows the real number — including 0, which renders as "first time on this browser? welcome." This is a small thing, but: a polling app that lies about *its own* numbers can't be trusted with anyone else's.

Track the tally per browser (not server-side, not by IP) — it's the right scope, and it never accidentally implies surveillance.

## What we don't do

| Pattern | Why we skip it |
| --- | --- |
| Purple/blue gradients on white | The default AI-generated SaaS look. Generic by 2024. |
| Glass-morphism, backdrop blur | Conflicts with the paper metaphor. Looks dated already. |
| Skeleton screens with shimmer | We use a single mono "Loading…" line. Flashier loading is dishonest about how fast the app actually is. |
| Modal-driven flows | Almost everything is a route or an inline section — back/forward should always work. |
| Tooltips on icons | Icons are paired with labels. If a label doesn't fit, drop the icon. |
| Brand colour on body text | Coral is reserved for live state and primary CTA. Body text is ink. Always. |

## When to break the rules

If you're adding a feature that doesn't fit the metaphor (for example: a billing page, an admin console for user management), do **not** twist the visual language to make it fit. Build the feature plainly — minimal type, ink on paper, no decorative elements. The metaphor is for the polling experience itself, not the support surfaces.

When the right move is *less* design, less wins.

— *Made by Saad · [x.com/developedbysaad](https://x.com/developedbysaad)*
