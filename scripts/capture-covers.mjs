/**
 * Optional. Screenshots of this site's own GitHub Pages demos.
 * Not part of CI. Requires: npx playwright install chromium
 *
 *   node scripts/capture-covers.mjs
 */
import fs from "node:fs";
import path from "node:path";

const meta = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/github-meta.json"), "utf8"));
const outDir = path.join(process.cwd(), "public", "covers");
fs.mkdirSync(outDir, { recursive: true });

const targets = [];
for (const [name, repo] of Object.entries(meta.repos)) {
  if (!repo.has_pages || repo.fork) continue;
  const url = name === "TUANZIDING.github.io"
    ? "https://tuanziding.github.io/"
    : `https://tuanziding.github.io/${name}/`;
  targets.push({ name, url });
}

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
for (const target of targets) {
  try {
    await page.goto(target.url, { waitUntil: "networkidle", timeout: 45000 });
    await page.screenshot({ path: path.join(outDir, `${target.name}.png`) });
    console.log("saved", target.name);
  } catch (error) {
    console.warn("skip", target.name, error instanceof Error ? error.message : error);
  }
}
await browser.close();
