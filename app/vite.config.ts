import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Social previews (og:image, twitter:image) need absolute URLs. Set SITE_URL
  // (e.g. https://instiwise.example) in the host's build settings; Vercel's and
  // Netlify's own production URLs are used as fallbacks.
  const env = loadEnv(mode, ".", "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  const siteUrl = (env.SITE_URL || vercel || env.URL || "").replace(/\/$/, "");
  if (!siteUrl && mode === "production") console.warn("[seo] SITE_URL is not set: social preview images will use relative URLs and may not show.");

  return {
    plugins: [
      react(),
      { name: "site-url", transformIndexHtml: (html: string) => html.replaceAll("%SITE_URL%", siteUrl) },
    ],
    build: {
      target: "es2020",
      cssCodeSplit: true,
      // Data lives in public/data and is fetched at runtime, never bundled.
      assetsInlineLimit: 2048,
    },
  };
});
