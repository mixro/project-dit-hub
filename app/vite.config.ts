import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    cssCodeSplit: true,
    // Data lives in public/data and is fetched at runtime, never bundled.
    assetsInlineLimit: 2048,
  },
});
