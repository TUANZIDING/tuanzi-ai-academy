/**
 * Pull public repo metadata for TUANZIDING and write data/github-meta.json.
 * Teaching copy stays in data/projects.yaml. This file only stores facts
 * the GitHub API returns: description, stars, language, timestamps, Pages.
 */
import fs from "node:fs";
import path from "node:path";

const USER = "TUANZIDING";
const OUT = path.join(process.cwd(), "data", "github-meta.json");

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "tuanzi-ai-academy",
  "X-GitHub-Api-Version": "2022-11-28",
};

if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function fetchPage(page) {
  const url = `https://api.github.com/users/${USER}/repos?per_page=100&page=${page}&type=public`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} on page ${page}: ${body.slice(0, 240)}`);
  }
  return response.json();
}

const repos = [];
for (let page = 1; page <= 10; page += 1) {
  const batch = await fetchPage(page);
  repos.push(...batch);
  if (batch.length < 100) break;
}

const byName = {};
for (const repo of repos) {
  byName[repo.name] = {
    description: repo.description ?? null,
    language: repo.language ?? null,
    stars: repo.stargazers_count ?? 0,
    pushed_at: repo.pushed_at ?? "",
    updated_at: repo.updated_at ?? "",
    html_url: repo.html_url,
    homepage: repo.homepage || "",
    has_pages: Boolean(repo.has_pages),
    fork: Boolean(repo.fork),
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    default_branch: repo.default_branch ?? "main",
  };
}

const names = Object.keys(byName).sort((a, b) => a.localeCompare(b));
const ordered = {};
for (const name of names) ordered[name] = byName[name];

const payload = {
  fetched_at: new Date().toISOString(),
  user: USER,
  repos: ordered,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${names.length} repos to ${path.relative(process.cwd(), OUT)}`);
