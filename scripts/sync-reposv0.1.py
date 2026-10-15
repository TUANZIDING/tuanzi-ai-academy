#!/usr/bin/env python3
"""列出 GitHub 上尚未收录进作品馆的公开自建仓库。
List public, non-fork TUANZIDING repos missing from data/projectsv1.0.json.
用法 Usage: python3 scripts/sync-reposv0.1.py
"""
import json, pathlib, urllib.request

USER = "TUANZIDING"
SKIP = {"tuanzi-ai-academy", "TUANZIDING", "TUANZIDING.github.io", "medical-science-shorts"}
root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / "data" / "projectsv1.0.json").read_text(encoding="utf-8"))
have = {p["repo"] for p in data["projects"]}

url = f"https://api.github.com/users/{USER}/repos?per_page=100&type=owner"
repos = json.load(urllib.request.urlopen(url))
missing = [r for r in repos if not r["fork"] and r["name"] not in have and r["name"] not in SKIP]
for r in missing:
    pages = f"https://{USER.lower()}.github.io/{r['name']}/" if r.get("has_pages") else None
    print(json.dumps({
        "repo": r["name"], "title": r["name"], "category": "workflow", "level": "L2",
        "live": pages, "source": r["html_url"],
        "cover": f"https://opengraph.githubassets.com/1/{USER}/{r['name']}",
        "summary": r.get("description") or "", "teach": "（填写：课上用它讲什么）"
    }, ensure_ascii=False) + ",")
print(f"# {len(missing)} 个待收录 / to add" if missing else "# 全部已收录 / all included")
