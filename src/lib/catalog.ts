import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export interface Bilingual {
  zh: string;
  en: string;
}

export interface SiteInfo {
  name: Bilingual;
  position: Bilingual;
  slogan: Bilingual;
  person: Bilingual;
  role: Bilingual;
  aboutRole: Bilingual;
  about: Bilingual;
  principles: Bilingual;
  research: Bilingual;
  hospital: Bilingual;
  places: Bilingual;
  email: string;
  github: string;
  website: string;
  linkedin: string;
}

export interface ModuleInfo {
  id: string;
  code: string;
  title: Bilingual;
  summary: Bilingual;
}

export interface LevelInfo {
  id: string;
  title: Bilingual;
  summary: Bilingual;
}

export interface SessionInfo {
  id: string;
  date: string;
  place: Bilingual;
  title: Bilingual;
  notes: Bilingual;
  slides: string | null;
  module: string | null;
}

export interface Project {
  repo: string;
  kind: "original" | "fork";
  module: ModuleInfo;
  forkGroup: string | null;
  level: LevelInfo;
  status: "live" | "pilot" | "planned";
  projectable: boolean;
  title: Bilingual;
  summary: Bilingual;
  topics: string[];
  audience: Bilingual;
  hours: Bilingual;
  boundary: Bilingual;
  recommend: Bilingual | null;
  local: Bilingual | null;
  demo: string | null;
  courseware: string | null;
  upstream: string | null;
  upstreamAuthor: string | null;
  upstreamUrl: string | null;
  upstreamDemo: string | null;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string;
  htmlUrl: string;
  search: string;
}

interface RawProject {
  repo: string;
  kind: "original" | "fork";
  module: string;
  fork_group?: string;
  level: string;
  status: "live" | "pilot" | "planned";
  projectable?: boolean;
  title_zh: string;
  title_en: string;
  summary_zh: string;
  summary_en: string;
  topics: string[];
  audience_zh: string;
  audience_en: string;
  hours_zh: string;
  hours_en: string;
  boundary_zh: string;
  boundary_en: string;
  recommend_zh?: string;
  recommend_en?: string;
  local_zh?: string;
  local_en?: string;
  demo?: string;
  courseware?: string;
  upstream?: string;
  upstream_author?: string;
  upstream_demo?: string;
}

interface MetaRepo {
  description: string | null;
  language: string | null;
  stars: number;
  pushed_at: string;
  updated_at: string;
  html_url: string;
  homepage: string;
  has_pages: boolean;
  fork: boolean;
  topics: string[];
  default_branch: string;
}

interface MetaFile {
  fetched_at: string;
  user: string;
  repos: Record<string, MetaRepo>;
}

export const FORK_GROUPS: Record<string, Bilingual> = {
  writing: { zh: "科研写作", en: "Scientific writing" },
  viz: { zh: "绘图与可视化", en: "Figures and visualization" },
  agent: { zh: "Agent 工程", en: "Agent engineering" },
  office: { zh: "办公与专利", en: "Slides and patents" },
  other: { zh: "其他", en: "Other" },
};

export const STATUS_LABEL: Record<Project["status"], Bilingual> = {
  live: { zh: "已上线", en: "Live" },
  pilot: { zh: "试用待复核", en: "Pilot" },
  planned: { zh: "规划中", en: "Planned" },
};

export const KIND_LABEL: Record<Project["kind"], Bilingual> = {
  original: { zh: "原创", en: "Original" },
  fork: { zh: "Fork", en: "Fork" },
};

function bi(zh: string, en: string): Bilingual {
  return { zh, en };
}

function readYaml<T>(relative: string): T {
  const file = path.join(process.cwd(), relative);
  return yaml.load(fs.readFileSync(file, "utf8")) as T;
}

export function pagesUrl(repo: string, hasPages: boolean): string | null {
  if (!hasPages) return null;
  if (repo === "TUANZIDING.github.io") return "https://tuanziding.github.io/";
  return `https://tuanziding.github.io/${repo}/`;
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function coverUrl(repo: string): string | null {
  const covers = path.join(process.cwd(), "public", "covers");
  for (const ext of ["webp", "png", "jpg"]) {
    if (fs.existsSync(path.join(covers, `${repo}.${ext}`))) {
      return `${import.meta.env.BASE_URL}covers/${repo}.${ext}`;
    }
  }
  return null;
}

export function href(pathname: string): string {
  const base = import.meta.env.BASE_URL;
  if (!pathname || pathname === "/") return base;
  return `${base}${pathname.replace(/^\//, "")}`;
}

export interface Catalog {
  site: SiteInfo;
  modules: ModuleInfo[];
  levels: LevelInfo[];
  projects: Project[];
  sessions: SessionInfo[];
  fetchedAt: string;
  languages: string[];
}

export function getCatalog(): Catalog {
  const doc = readYaml<{
    site: Record<string, string>;
    modules: Array<{ id: string; code: string; title_zh: string; title_en: string; summary_zh: string; summary_en: string }>;
    levels: Array<{ id: string; title_zh: string; title_en: string; summary_zh: string; summary_en: string }>;
    projects: RawProject[];
  }>("data/projects.yaml");

  const sessionDoc = readYaml<{ sessions: Array<Record<string, string>> }>("data/sessions.yaml");
  const meta = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/github-meta.json"), "utf8")) as MetaFile;

  const siteRaw = doc.site;
  const site: SiteInfo = {
    name: bi(siteRaw.name_zh, siteRaw.name_en),
    position: bi(siteRaw.position_zh, siteRaw.position_en),
    slogan: bi(siteRaw.slogan_zh, siteRaw.slogan_en),
    person: bi(siteRaw.person_zh, siteRaw.person_en),
    role: bi(siteRaw.role_zh, siteRaw.role_en),
    aboutRole: bi(siteRaw.about_role_zh, siteRaw.about_role_en),
    about: bi(siteRaw.about_zh, siteRaw.about_en),
    principles: bi(siteRaw.principles_zh, siteRaw.principles_en),
    research: bi(siteRaw.research_zh, siteRaw.research_en),
    hospital: bi(siteRaw.hospital_zh, siteRaw.hospital_en),
    places: bi(siteRaw.places_zh, siteRaw.places_en),
    email: siteRaw.email,
    github: siteRaw.github,
    website: siteRaw.website,
    linkedin: siteRaw.linkedin,
  };

  const modules = doc.modules.map((item) => ({
    id: item.id,
    code: item.code,
    title: bi(item.title_zh, item.title_en),
    summary: bi(item.summary_zh, item.summary_en),
  }));
  const levels = doc.levels.map((item) => ({
    id: item.id,
    title: bi(item.title_zh, item.title_en),
    summary: bi(item.summary_zh, item.summary_en),
  }));
  const moduleById = new Map(modules.map((item) => [item.id, item]));
  const levelById = new Map(levels.map((item) => [item.id, item]));

  const projects: Project[] = doc.projects.map((raw) => {
    const live = meta.repos[raw.repo];
    const moduleInfo = moduleById.get(raw.module);
    const levelInfo = levelById.get(raw.level);
    if (!moduleInfo) throw new Error(`Unknown module ${raw.module} on ${raw.repo}`);
    if (!levelInfo) throw new Error(`Unknown level ${raw.level} on ${raw.repo}`);
    const demo = raw.demo || pagesUrl(raw.repo, Boolean(live?.has_pages));
    const groupLabel = raw.fork_group ? FORK_GROUPS[raw.fork_group] : null;
    const search = [
      raw.repo,
      raw.title_zh,
      raw.title_en,
      raw.summary_zh,
      raw.summary_en,
      raw.topics.join(" "),
      raw.audience_zh,
      raw.audience_en,
      raw.upstream,
      raw.upstream_author,
      live?.description,
      live?.language,
      groupLabel?.zh,
      groupLabel?.en,
      moduleInfo.title.zh,
      moduleInfo.title.en,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      repo: raw.repo,
      kind: raw.kind,
      module: moduleInfo,
      forkGroup: raw.fork_group ?? null,
      level: levelInfo,
      status: raw.status,
      projectable: Boolean(raw.projectable),
      title: bi(raw.title_zh, raw.title_en),
      summary: bi(raw.summary_zh, raw.summary_en),
      topics: raw.topics,
      audience: bi(raw.audience_zh, raw.audience_en),
      hours: bi(raw.hours_zh, raw.hours_en),
      boundary: bi(raw.boundary_zh, raw.boundary_en),
      recommend:
        raw.recommend_zh && raw.recommend_en ? bi(raw.recommend_zh, raw.recommend_en) : null,
      local: raw.local_zh && raw.local_en ? bi(raw.local_zh, raw.local_en) : null,
      demo,
      courseware: raw.courseware ?? null,
      upstream: raw.upstream ?? null,
      upstreamAuthor: raw.upstream_author ?? null,
      upstreamUrl: raw.upstream ? `https://github.com/${raw.upstream}` : null,
      upstreamDemo: raw.upstream_demo ?? null,
      description: live?.description ?? null,
      language: live?.language ?? null,
      stars: live?.stars ?? 0,
      pushedAt: live?.pushed_at || live?.updated_at || "",
      htmlUrl: live?.html_url || `https://github.com/TUANZIDING/${raw.repo}`,
      search,
    };
  });

  const sessions: SessionInfo[] = (sessionDoc.sessions ?? []).map((item) => ({
    id: item.id,
    date: item.date,
    place: bi(item.place_zh, item.place_en),
    title: bi(item.title_zh, item.title_en),
    notes: bi(item.notes_zh || "", item.notes_en || ""),
    slides: item.slides || null,
    module: item.module || null,
  }));

  const languages = [...new Set(projects.map((item) => item.language || "none"))].sort((a, b) =>
    a.localeCompare(b),
  );

  return {
    site,
    modules,
    levels,
    projects,
    sessions,
    fetchedAt: meta.fetched_at,
    languages,
  };
}
