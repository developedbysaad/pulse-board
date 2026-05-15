/**
 * Mirrors backend/src/lib/slug.js#slugify so the preview shown while
 * typing matches what the server stores. Keep these two in sync — any
 * divergence is a UX trap.
 *
 * Public URLs live at /e/<slug>. Numeric IDs are internal only, so any
 * slug shape the regex accepts is fine — including all-digit ones.
 */

export const SLUG_MAX_LEN = 64;

// Empty by default — slugs sit on /e/<slug>, not on the SPA's top-level
// routes, so there's nothing to actually clash with. Add entries only
// if a future feature lands a special sub-route under /e/.
export const RESERVED_SLUGS = new Set();

export function slugify(text) {
  if (text == null) return "";
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['"`’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX_LEN);
}

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(slug);
}

const SLUG_REGEX = /^[a-z0-9-]+$/;
const HAS_ALNUM = /[a-z0-9]/;

/**
 * Local sanity check before bothering the server. Returns null if OK,
 * otherwise the human-readable reason it's invalid.
 */
export function localSlugError(slug) {
  if (!slug) return "Pick a link slug for your poll.";
  if (slug.length > SLUG_MAX_LEN)
    return `Slug is too long — keep it under ${SLUG_MAX_LEN} characters.`;
  if (!SLUG_REGEX.test(slug))
    return "Use lowercase letters, numbers, and dashes only.";
  if (slug.startsWith("-") || slug.endsWith("-"))
    return "Slug can't start or end with a dash.";
  if (!HAS_ALNUM.test(slug))
    return "Slug needs at least one letter or number.";
  if (RESERVED_SLUGS.has(slug)) return "That slug is reserved.";
  return null;
}
