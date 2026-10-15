<h1 align="center">团子 AI 学院 · Tuanzi AI Academy</h1>

<p align="center"><strong>一名急诊创伤外科医生的 AI 战术手册：先会用，再用对。</strong><br>
An AI playbook for clinicians, built from my own public GitHub projects.</p>

<p align="center"><a href="https://tuanziding.github.io/tuanzi-ai-academy/"><strong>打开网站 · Open the site</strong></a></p>

## 这是什么
把我在 GitHub 上的公开项目集中到一个页面，用于线上与线下的「AI 使用策略」授课。

- **战术路线 L0–L4**：会问 → 会核对 → 会搭流程 → 会做作品 → 会治理
- **作品馆**：每个项目一张卡，标明档位、能否在线演示、课上讲什么
- **课件馆**：按同一主线组织的示范课路线，课后课件按场次上架
- **安全边界**：隐私、证据分层、人类复核、失败即停
- **开源工具箱**：我收藏的他人开源项目，与自建作品分开
- **投屏模式**：线下上课一键放大字号

## 怎么更新
所有作品数据都在 `data/projectsv1.0.json`，页面不用改。

1. 新项目推上 GitHub 后，运行 `python3 scripts/sync-reposv0.1.py`，它会列出还没收录的仓库并给出 JSON 草稿。
2. 把草稿粘进 `projects`，补上 `category`、`level` 和 `teach`（课上讲什么）。
3. 提交即上线。

`category` 可选：`trauma` 创伤教学 · `workflow` AI 工作流 · `govern` 证据与智能体治理 · `research` 可复现科研 · `family` 亲子与创作 · `explore` 趣味探索

## 结构
```
index.html                 页面骨架
assets/stylev1.0.css       样式（深蓝底 · 电光青 · 橙色，橄榄球战术板）
assets/appv1.0.js          渲染与筛选
data/projectsv1.0.json     作品与工具箱数据
scripts/sync-reposv0.1.py  查找未收录的公开仓库
```

纯静态，无构建步骤、无第三方依赖，GitHub Pages 直接发布。
