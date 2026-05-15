/**
 * Resolves a docs URL that works in both dev and prod.
 *
 *   dev  → Astro runs on its own port (:4321). Vite proxying /docs back
 *          breaks because Astro emits asset URLs outside /docs (virtual
 *          imports, /node_modules, /_astro) that overlap Vite's own
 *          module loader. So in dev we just link absolutely to :4321.
 *   prod → Express serves docs/dist at /docs on the same origin, so the
 *          relative path works.
 *
 * Use docsHref() instead of a hardcoded "/docs/..." string for any
 * link that crosses the SPA → docs boundary.
 */

const DEV_DOCS_ORIGIN = "http://localhost:4321";

export function docsHref(path = "/") {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  const withDocsBase = normalised.startsWith("/docs")
    ? normalised
    : `/docs${normalised}`;

  if (import.meta.env.DEV) {
    return `${DEV_DOCS_ORIGIN}${withDocsBase}`;
  }
  return withDocsBase;
}
