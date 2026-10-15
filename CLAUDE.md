# 团子 AI 课堂 · 给后续修改用的说明

这是丁海祥（Haixiang Ding，GitHub [TUANZIDING](https://github.com/TUANZIDING)）的教学站，仓库名 `tuanzi-ai-academy`。一句话定位：**临床医生的 AI 实践课堂**。口号：让 AI 有据可查，让学习回到临床。

受众是医护人员、医学生、科研初学者、家长和儿童（漫画伴读），以及 AI 零基础学员。使用场景是线下投屏按模块打开演示，以及课后自学。气质沿用现有站点：临床、严谨、证据可追溯，同时亲切。

不要编造他的经历、职称以外的头衔、课程日期、患者信息或仓库 README 里没有的功能。关于我只使用 `data/projects.yaml` 里已经根据公开主页和简介写好的句子。fork 不是原创，收录理由是课堂注释，不是临床背书，也不是上游作者的原话。

## 信息架构

单页长滚动，分节编号：

1. Hero：身份（创伤外科医生 · 苏大博士生）+ 口号 +「开始上课」「看全部项目」
2. 学习路径 L0 初识 AI → L1 会用工具 → L2 做出作品 → L3 科研工作流 → L4 构建 Agent / Skill
3. 课程模块 A–D 的项目卡片
4. 交互演示馆：只链已经开启的 GitHub Pages
5. 线下课件馆：`data/sessions.yaml` 里的真实课次；没有就明说没有
6. 开源实验室：fork，按科研写作、绘图、Agent 工程、办公与专利、其他
7. AI 使用边界：临床语境优先 / 人类复核在环 / 患者隐私边界
8. 关于我，并链到 https://tuanziding.github.io/
9. 反馈：mailto，不上传第三方
10. 最近更新：按 GitHub push 时间

子页：

- `/modules/<id>/` 模块详情（含 `e` 实验室和 `site` 主页与本站）
- `/projects/` 全部项目，可筛语言、模块、原创/fork、难度、状态

参考结构是编号长页（如 oioi），不是仪表盘。

## 模块

- A 创伤与医学教育互动课堂
- B 医学科研与可复现研究
- C Codex / Agent 工作流与技能
- D 亲子与创意 AI
- E 开源实验室（fork）
- S 主页与本站（学术主页、简介仓库、本站）

卡片要能看到：标题（中/英）、一句话、模块、难度、标签、在线演示 / 源码 /（若有）课件或上游演示、适合人群、课时建议、状态（已上线 / 试用待复核 / 规划中）、最近更新、星标。fork 还要有原作者、收录理由、使用边界。

## 视觉

- 纸感浅底 `#f5f3eb`，卡片 `#fffdf8`，墨色文字 `#18262c`
- 暗色底 `#0b171e`
- 墨绿 `#143c32`，朱红 `#a9463b` / `#9b2a17`，少量金 `#bd8740` 或 `#8a6232`
- 标题 Noto Serif SC，正文 Noto Sans SC
- 中英切换（`localStorage` 键 `tuanzi-lang`）和明暗主题（`tuanzi-theme`）
- 大留白、分节编号 01–10
- 投屏模式加大字号（`tuanzi-display`）

改样式只动 `src/styles/global.css`。不要换成另一套视觉语言。

## 技术

- Astro 静态站。`astro.config.mjs` 里 `site` 为 `https://tuanziding.github.io`，`base` 为 `/tuanzi-ai-academy`。所有站内链接走 `import.meta.env.BASE_URL` 或 `href()`。
- 手工元数据：`data/projects.yaml`。机器元数据：`data/github-meta.json`，由 `scripts/refresh-github.mjs` 从 `GET /users/TUANZIDING/repos` 写入。
- `npm run build` 会先跑 `scripts/check-catalog.mjs`。yaml 与快照的仓库集合必须一致，fork 标记必须一致。缺字段就失败。
- 部署：`.github/workflows/pages.yml` 在 push 到 `main` 和每天定时刷新元数据、构建、用 GitHub Pages（source 必须是 GitHub Actions）发布。不要改成从分支部署。
- 无后端。搜索和筛选在 `/projects/` 用页面内脚本完成。反馈是 mailto。
- 封面截图是可选的 `npm run covers`，只截自己的 Pages。没有截图就用版式封面。

## 本地

```bash
npm install
npm run dev
```

打开 http://localhost:4321/tuanzi-ai-academy/ 。Node 22+。

改完教学数据后跑 `npm run refresh && npm run check && npm run build`。
