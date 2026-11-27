import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { DEFAULT_TITLE, FALLBACK_NAV, SITE_NAME, STATIC_PAGES, type StaticPage } from "./src/lib/seoPages";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Replace the content="" of one meta tag, matched by name= or property=. */
function setMetaTag(html: string, key: string, value: string): string {
  const re = new RegExp(`(<meta\\s+(?:name|property)="${key}"\\s+content=")[^"]*(")`);
  return html.replace(re, `$1${esc(value)}$2`);
}

/**
 * After the build, write one HTML file per fixed route (projects.html, problems.html, ...)
 * plus 404.html. Each carries its own title, description, canonical URL and a short block of
 * real text inside #root, so search engines see a distinct page without running JavaScript.
 * React's createRoot replaces that block on load, so visitors see the normal app.
 * Netlify serves /projects from projects.html (see public/_redirects).
 */
function staticPages(siteUrl: string): Plugin {
  let outDir = "dist";
  const origin = siteUrl || "https://instiwise.micepdev.com";
  const nav = FALLBACK_NAV.map((p) => `<a href="${p.path}">${esc(p.title || "Home")}</a>`).join(" · ");

  const render = (base: string, page: StaticPage) => {
    const title = page.title ? `${page.title} – ${SITE_NAME}` : DEFAULT_TITLE;
    const url = origin + (page.path === "/" ? "/" : page.path);
    let html = base.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
    html = setMetaTag(html, "description", page.description);
    html = setMetaTag(html, "robots", page.noindex ? "noindex, follow" : "index, follow");
    html = setMetaTag(html, "og:title", title);
    html = setMetaTag(html, "og:description", page.description);
    html = setMetaTag(html, "og:url", url);
    html = setMetaTag(html, "twitter:title", title);
    html = setMetaTag(html, "twitter:description", page.description);
    html = page.noindex
      ? html.replace(/\s*<!-- Canonical Link Tag[^>]*-->\s*<link rel="canonical"[^>]*>/, "")
      : html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`);
    const fallback = `<div id="root"><main class="seo-fallback"><h1>${esc(page.heading)}</h1><p>${esc(page.intro)}</p><nav>${nav}</nav></main></div>`;
    return html.replace('<div id="root"></div>', fallback);
  };

  return {
    name: "static-pages",
    apply: "build",
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    closeBundle() {
      const base = readFileSync(resolve(outDir, "index.html"), "utf8");
      for (const page of STATIC_PAGES) writeFileSync(resolve(outDir, page.file), render(base, page));
      // 404.html: same app shell (React shows its "Page not found" view), kept out of search.
      let notFound = base.replace(/<title>[^<]*<\/title>/, `<title>Page not found – ${SITE_NAME}</title>`);
      notFound = setMetaTag(notFound, "robots", "noindex, follow");
      notFound = notFound.replace(/\s*<!-- Canonical Link Tag[^>]*-->\s*<link rel="canonical"[^>]*>/, "");
      writeFileSync(resolve(outDir, "404.html"), notFound);
      console.log(`[seo] wrote ${STATIC_PAGES.length} route pages and 404.html`);
    },
  };
}

export default defineConfig(({ mode }) => {
  // Social previews (og:image, twitter:image) need absolute URLs. SITE_URL comes from
  // .env.production; the host's environment can override it (e.g. for a custom domain).
  const env = loadEnv(mode, ".", "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  const siteUrl = (env.SITE_URL || vercel || env.URL || "").replace(/\/$/, "");
  if (!siteUrl && mode === "production") console.warn("[seo] SITE_URL is not set: social preview images will use relative URLs and may not show.");

  return {
    plugins: [
      react(),
      { name: "site-url", transformIndexHtml: (html: string) => html.replaceAll("%SITE_URL%", siteUrl) },
      staticPages(siteUrl),
    ],
    // Canonical URLs at runtime (src/lib/seo.ts).
    define: { __SITE_URL__: JSON.stringify(siteUrl) },
    build: {
      target: "es2020",
      cssCodeSplit: true,
      // Data lives in public/data and is fetched at runtime, never bundled.
      assetsInlineLimit: 2048,
    },
  };
});
