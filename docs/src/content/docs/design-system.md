---
title: Design system
description: Colour tokens, type scale, components, motion. Where to find each piece in the codebase, what it looks like, and when to use it.
---

The concrete reference. For the *why*, see [Design principles](/docs/design-principles/).

All tokens live in **`frontend/src/styles/tailwind.css`** under the `@theme` block (Tailwind v4's CSS-first config). All components live in **`frontend/src/components/ui.jsx`**.

## Colour tokens

| Token | OKLCH | Approx hex | Role |
| --- | --- | --- | --- |
| `--color-paper` | `0.97 0.013 85` | `#FAF7EE` | Page background. Warm cream. |
| `--color-paper-dim` | `0.945 0.018 85` | `#F4EEE0` | Section bands, hover surfaces. |
| `--color-paper-deep` | `0.91 0.02 85` | `#EDE3CC` | Bar-track fills, deeper surface. |
| `--color-ink` | `0.20 0.012 75` | `#22201D` | Body & display type, primary borders. |
| `--color-ink-soft` | `0.32 0.01 80` | `#3A3733` | Body paragraphs (≥7:1 on paper). |
| `--color-ink-muted` | `0.46 0.008 80` | `#5C5854` | Meta text, eyebrows (≥4.5:1, AA). |
| `--color-ink-faint` | `0.62 0.006 80` | `#827F7B` | Decorative-only — never body text. |
| `--color-brand-500` | `0.66 0.205 25` | `#E04A2B` | Live indicator, primary highlights. |
| `--color-brand-600` | `0.59 0.215 25` | `#C53D1F` | Primary CTA fill (stamp). |
| `--color-brand-700` | `0.50 0.20 25` | `#A23316` | Pressed / active state. |
| `--color-indigo-soft` | `0.32 0.115 270` | `#2A2D6D` | Final-results bars (distinguishes from live coral). |
| `--color-emerald-soft` | `0.45 0.12 155` | success banner |
| `--color-amber-soft` | `0.62 0.16 75` | warn banner |
| `--color-rose-soft` | `0.55 0.20 20` | error / destructive |

**Rule:** brand coral never appears on body text. It's reserved for live indicators (`<LiveDot/>`), the primary CTA fill, and a small handful of accent words like the italicised "ballots" in the marketing hero.

**Contrast targets:**

- Body paragraphs: `text-ink-soft` on `bg-paper` ≈ 7:1 (AAA).
- Meta / eyebrows: `text-ink-muted` ≈ 4.5:1 (AA).
- `text-ink-faint` is *not* WCAG-compliant for body. It's only for decorative timestamps on cards already labelled in higher-contrast text.

## Typography

```css
--font-display: "Fraunces", serif;       /* variable: opsz 9–144, wght 300–900, SOFT 0–100 */
--font-sans:    "Inter", sans-serif;
--font-mono:    "JetBrains Mono", monospace;
--font-hand:    "Caveat", cursive;
```

### Scale (used)

| Token | Class | Size | Where |
| --- | --- | --- | --- |
| Display XL | `text-[clamp(3rem,9vw,7.5rem)]` | 48–120px | Marketing hero |
| Display L | `text-7xl` / `text-8xl` | 72/96px | Section CTAs, ThankYouPage |
| Display M | `text-5xl` / `text-6xl` | 48/60px | Page H1 |
| Display S | `text-3xl` / `text-4xl` | 30/36px | Card headlines, NotifyCTA |
| Body | `text-base` | 16px | Paragraphs |
| Meta | `text-sm` | 14px | Hints, secondary |
| Mono caps | `text-[10px]` / `text-[11px]` + `tracking-[0.22em]` | 10–11px | Tags, eyebrows, mono labels |
| Hand | `text-base` / `text-xl` in `font-hand` | 16–20px | Asides only |

**Italic usage:** Fraunces italic is loud and characterful. Use it on **at most one word per heading** for emphasis (e.g. "Hand-counted *ballots*"). Never in body copy. Never on metadata.

**Tabular numerals:** All stat displays use `tabular-nums` so digits don't shift width as counts tick up.

## Components

All exports from `frontend/src/components/ui.jsx`. Shape is intentionally minimal — most of the system is composition.

### `<Button variant size>`

```jsx
<Button variant="primary" size="lg">Launch poll →</Button>
```

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `primary` · `accent` · `secondary` · `ghost` · `danger` · `link` | `primary` |
| `size` | `sm` · `md` · `lg` | `md` |
| `as` | element / component | `button` |

`primary` = ink fill, hovers to coral. `accent` = coral fill (use only when you want the coral CTA, like "publish results"). `secondary` = paper fill, ink border. `danger` = paper fill with rose border, hovers to rose fill.

For the **stamp-look button**, layer `.stamp-btn` (defined in `tailwind.css`) on top of any variant.

### `<Card>`

```jsx
<Card className="p-6">…</Card>
```

Renders a 1px ink-bordered rectangle on paper. Hover deepens the border. Compose with `paper-grain` (an SVG-noise overlay) and `style={{ boxShadow: "8px 8px 0 0 var(--color-ink)" }}` for the heroic "ballot card" look used in auth pages and the demo card.

### `<Field label hint error>` + `<Input>` / `<Select>` / `<Textarea>`

Form layouts. `Input` is the boxed style; for the "sign on the line" look use the bare `.line-underline` utility class on a raw `<input>` (see auth pages and `<NotifyCTA>`).

`<Select>` is a styled `<select>` with a custom inline-SVG chevron, so it stays in the paper aesthetic across browsers.

### `<Tag tone>`

```jsx
<Tag tone="live">Live</Tag>
```

Inline status pill, mono caps, 1px coloured border. `tone` is one of `neutral · live · ended · published · draft`. The `live` tone auto-renders a `<LiveDot/>`.

### `<LiveDot>`

A 6×6 px coral dot pulsing via `pulse-dot` keyframe (1.6s, infinite). Use anywhere you want to communicate "this is updating in real time".

### `<Stat label value sub align>`

A big tabular Fraunces numeral with mono caps below. For dashboards and analytics headers.

### `<TallyMark count animate>`

SVG five-bar tally. Each stroke draws via `stroke-dashoffset` with a stagger (`draw-tally` keyframe). Used for "sign-in count" and the marketing pillars. Pass `animate={false}` to disable the entry animation if you're rendering many at once.

### `<Stamp tone>`

Rotated `-3deg` rubber-stamp word with mono caps and a 2px border. Animates in via `stamp` keyframe (over-rotates, then settles). Used for the "Voter roll" / "Sign-in slip" eyebrows on auth pages and the marketing hero.

### `<NotifyCTA customUrl variant resultsAt>`

The smart email-capture component. Renders a paper-grain card with a context-appropriate headline and an inline `<input type="email">` + stamp button. Variants:

| Variant | When to use | Headline |
| --- | --- | --- |
| `live` | Poll is running | "Want a heads-up when the results drop?" |
| `awaiting` | Poll ended, results not yet published | "Be the first to see the outcome." |
| `voted` | Visitor just submitted (ThankYouPage) | "We'll close the loop with you." |
| `results` | Final results page | "Run your own poll in three minutes." |

POSTs to `/api/public/elections/:customUrl/subscribe`. Idempotent — re-submitting the same email returns "already on the list" rather than 409.

## Motion

All keyframes are CSS-only and live in `tailwind.css`.

| Animation | Duration | Use |
| --- | --- | --- |
| `pulse-dot` | 1.6s, infinite | `<LiveDot>` heartbeat |
| `rise` | 0.55s | Page entry — apply to top-level wrappers |
| `stamp` | 0.65s | Rubber-stamp eyebrows |
| `marquee` | 38s, infinite | Endless ticker on marketing |
| `bar-grow` | 1.2s | Result bars on entry (origin: left) |
| `draw-tally` | 0.55s | Tally-mark SVG strokes (drawn via `stroke-dashoffset`) |
| `blink` | 1.1s, infinite | Caret-style attention |
| `flicker` | 4s, infinite | Reserved for "fragile" decorative elements |

The `.stagger > *` helper applies sequential 100ms delays to children — used on the dashboard grid, marketing pillars, and sign-up steps.

## Utility classes

Defined in `tailwind.css` (not Tailwind built-ins):

- `.input-paper` — faint linear-gradient inset for boxed inputs.
- `.line-underline` — bottom-rule input style ("write on the line").
- `.stamp-btn` — rubber-stamp button shell with rotation + offset shadow.
- `.paper-grain` — SVG-noise overlay (use on a positioned parent; `::before` paints it).
- `.deckle-top` — perforated top edge for ballot cards (mask-image).
- `.stagger` — staggered `rise` for direct children.

## Adding a new component

1. **Match the metaphor.** If you can't justify a new component in two sentences ("this is the X part of the ballot/counting flow"), reach for an existing primitive instead.
2. **Use existing tokens.** No raw colours, no raw font families.
3. **Compose, don't recreate.** Most "new" UI is a `<Card>` with new content inside.
4. **Keep motion sparing.** A new keyframe needs a paragraph of justification.

— *Made by Saad · [x.com/developedbysaad](https://x.com/developedbysaad)*
