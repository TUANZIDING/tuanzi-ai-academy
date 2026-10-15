import { defineConfig } from "astro/config";

// Project site: https://tuanziding.github.io/tuanzi-ai-academy/
export default defineConfig({
  site: "https://tuanziding.github.io",
  base: "/tuanzi-ai-academy",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
});
