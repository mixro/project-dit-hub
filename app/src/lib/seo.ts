// Keeps <title>, description, canonical, robots and social tags in step with the current route.
// The built HTML for each fixed route already carries the right values (see vite.config.ts);
// this updates them after client-side navigation and for detail pages.
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, pageForPath } from "./seoPages";

declare const __SITE_URL__: string | undefined;

/** Public origin for canonical URLs. Set from SITE_URL at build time; falls back to the live domain. */
export const SITE_URL = (typeof __SITE_URL__ === "string" && __SITE_URL__) || "https://instiwise.micepdev.com";

export interface PageMeta {
  description?: string;
  /** Keep the page out of search results (not-found pages, personal views). */
  noindex?: boolean;
}

function normalisePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

export function applyPageMeta(title: string, rawPath: string, meta: PageMeta = {}) {
  const path = normalisePath(rawPath);
  const known = pageForPath(path);
  const fullTitle = title ? `${title} – ${SITE_NAME}` : DEFAULT_TITLE;
  const description = meta.description || known?.description || DEFAULT_DESCRIPTION;
  const noindex = meta.noindex ?? known?.noindex ?? false;
  // Query strings (search, filters) never change the canonical: /projects?q=solar → /projects.
  const url = SITE_URL + (path === "/" ? "/" : path);

  document.title = fullTitle;
  setMeta("name", "description", description);
  setMeta("name", "robots", noindex ? "noindex, follow" : "index, follow");
  setCanonical(noindex ? null : url);
  setMeta("property", "og:title", fullTitle);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", url);
  setMeta("name", "twitter:title", fullTitle);
  setMeta("name", "twitter:description", description);
}
