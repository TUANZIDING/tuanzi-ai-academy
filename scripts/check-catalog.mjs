/**
 * Fail the build when teaching metadata and the GitHub snapshot disagree.
 * Every public repo needs a hand-written entry. New repos must be added
 * to data/projects.yaml before they appear on the site.
 */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const root = process.cwd();
const doc = yaml.load(fs.readFileSync(path.join(root, "data/projects.yaml"), "utf8"));
const meta = JSON.parse(fs.readFileSync(path.join(root, "data/github-meta.json"), "utf8"));
const sessions = yaml.load(fs.readFileSync(path.join(root, "data/sessions.yaml"), "utf8"));

const errors = [];
const modules = new Set((doc.modules ?? []).map((item) => item.id));
const levels = new Set((doc.levels ?? []).map((item) => item.id));
const forkGroups = new Set(["writing", "viz", "agent", "office", "other"]);
const statuses = new Set(["live", "pilot", "planned"]);
const required = [
  "repo",
  "kind",
  "module",
  "level",
  "status",
  "title_zh",
  "title_en",
  "summary_zh",
  "summary_en",
  "audience_zh",
  "audience_en",
  "hours_zh",
  "hours_en",
  "boundary_zh",
  "boundary_en",
  "idea_zh",
  "idea_en",
  "steps_zh",
  "steps_en",
  "reproduce_zh",
  "reproduce_en",
];

const seen = new Set();
for (const project of doc.projects ?? []) {
  const name = project.repo || "(missing repo)";
  if (seen.has(project.repo)) errors.push(`duplicate repo: ${name}`);
  seen.add(project.repo);

  for (const key of required) {
    if (!project[key] || String(project[key]).trim() === "") {
      errors.push(`${name} missing ${key}`);
    }
  }
  if (!Array.isArray(project.topics) || project.topics.length === 0) {
    errors.push(`${name} needs at least one topic`);
  }
  if (!modules.has(project.module)) errors.push(`${name} unknown module ${project.module}`);
  if (!levels.has(project.level)) errors.push(`${name} unknown level ${project.level}`);
  if (!statuses.has(project.status)) errors.push(`${name} unknown status ${project.status}`);
  if (project.kind !== "original" && project.kind !== "fork") {
    errors.push(`${name} kind must be original or fork`);
  }
  if (project.kind === "fork") {
    if (!forkGroups.has(project.fork_group)) errors.push(`${name} missing fork_group`);
    for (const key of ["upstream", "upstream_author", "recommend_zh", "recommend_en"]) {
      if (!project[key]) errors.push(`${name} missing ${key}`);
    }
  }
  if (project.demo && !String(project.demo).startsWith("https://")) {
    errors.push(`${name} demo must be an https URL`);
  }
}

const apiNames = new Set(Object.keys(meta.repos ?? {}));
for (const name of apiNames) {
  if (!seen.has(name)) errors.push(`GitHub repo missing from projects.yaml: ${name}`);
}
for (const name of seen) {
  if (name && !apiNames.has(name)) errors.push(`projects.yaml repo not in github-meta.json: ${name}`);
}

for (const name of seen) {
  const project = (doc.projects ?? []).find((item) => item.repo === name);
  const live = meta.repos?.[name];
  if (!project || !live) continue;
  const apiFork = Boolean(live.fork);
  if (apiFork !== (project.kind === "fork")) {
    errors.push(`${name} kind is ${project.kind} but GitHub fork=${apiFork}`);
  }
}

if (!Array.isArray(sessions.sessions)) errors.push("sessions.yaml must contain a sessions list");

for (const step of doc.journey ?? []) {
  for (const name of step.examples ?? []) {
    if (!seen.has(name)) errors.push(`journey step ${step.n} example not in catalog: ${name}`);
  }
}

if (errors.length) {
  console.error(`Catalog check failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const originals = (doc.projects ?? []).filter((item) => item.kind === "original").length;
const forks = (doc.projects ?? []).filter((item) => item.kind === "fork").length;
console.log(`Catalog ok: ${seen.size} repos (${originals} original, ${forks} fork), meta ${meta.fetched_at}`);
