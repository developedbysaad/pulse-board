"use strict";

/**
 * Slug utilities — single source of truth for what counts as a valid
 * Pulse Board slug, plus the helpers that turn a poll title into one.
 *
 * Public URLs live at /e/<slug>. The numeric election id stays internal
 * (admin API only); it never appears in a user-facing URL, so the
 * id-namespace and slug-namespace can't collide. Anything the regex
 * accepts is a valid slug — including all-digit ones like "2026".
 *
 * Conventions chosen here (industry-standard for shareable URLs):
 *   - Lowercase, ASCII only — diacritics folded via NFKD normalisation.
 *   - Words separated by single dashes; punctuation/whitespace → dash.
 *   - Trim leading/trailing dashes, collapse runs.
 *   - Max length 64 chars (matches the DB column).
 *   - Must contain at least one alphanumeric char (so "---" isn't valid).
 *
 * The frontend (frontend/src/lib/slugify.js) mirrors slugify() so the
 * preview shown while typing matches what the server stores.
 */

const MAX_LEN = 64;

// Keep this empty unless a slug would genuinely clash with something on
// the same /e/ path (it doesn't today). If we add a future /e/admin
// admin-only sub-route, list it here.
const RESERVED = new Set();

function slugify(text) {
  if (text == null) return "";
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks (diacritics)
    .toLowerCase()
    .replace(/['"`’]/g, "") // collapse apostrophes/quotes inline
    .replace(/[^a-z0-9]+/g, "-") // anything else → dash
    .replace(/-+/g, "-") // collapse runs
    .replace(/^-|-$/g, "") // trim
    .slice(0, MAX_LEN);
}

function isReserved(slug) {
  return RESERVED.has(slug);
}

/**
 * Resolve `base` to a slug that no other Election row uses.
 * Strategy: if base is taken, append "-2", "-3", … up to "-50". After
 * 50 attempts, fall back to a 4-char random suffix so we never spin.
 */
async function findAvailableSlug(base, Election, { excludeId } = {}) {
  let candidate = slugify(base);
  if (!candidate) candidate = "poll";

  if (await isAvailable(candidate, Election, excludeId)) return candidate;

  for (let i = 2; i <= 50; i++) {
    const c = truncate(`${candidate}-${i}`);
    if (await isAvailable(c, Election, excludeId)) return c;
  }

  const random = Math.random().toString(36).slice(2, 6);
  return truncate(`${candidate}-${random}`);
}

async function isAvailable(slug, Election, excludeId) {
  if (isReserved(slug)) return false;
  const where = { customUrl: slug };
  const existing = await Election.findOne({ where, attributes: ["id"] });
  if (!existing) return true;
  if (excludeId && existing.id === Number(excludeId)) return true;
  return false;
}

function truncate(s) {
  return s.slice(0, MAX_LEN).replace(/-$/, "");
}

module.exports = {
  MAX_LEN,
  RESERVED,
  slugify,
  isReserved,
  isAvailable,
  findAvailableSlug,
};
