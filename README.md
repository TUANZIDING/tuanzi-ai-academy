# 团子 AI 课堂

临床医生的 AI 实践课堂。这个静态网站用来看一件事：怎么样让自己的想法实现。路径是说出想法、拆开、和 Codex / Claude Code 或其他代理一起做、做出打得开的原型、再发布（例如 GitHub Pages）。[TUANZIDING](https://github.com/TUANZIDING) 的公开仓库是这条路上的例子，可以投屏，也可以自学。

线上地址（开启 Pages 之后）：<https://tuanziding.github.io/tuanzi-ai-academy/>

## 页面

- `/` 单页课堂：开场、从想法到发布的五步、L0–L4、模块 A–E、演示馆、线下课件、开源实验室、使用边界、关于、邮件反馈、最近更新
- `/course/future-doctor/` 总纲课。正文是原文；每节有一张插图；讨论题和仓库例子分开。阅读是长文。总纲课的「投屏」是幻灯片：一节一张，方向键或空格翻页，讨论题单独一页，可以离线打开构建结果
- `/start/` 从自己的想法开始，含一段可抄进 README 的记录
- `/modules/<id>/` 每个模块一页（`a` `b` `c` `d` `e` `site`）
- `/projects/` 全部项目，可按来源、模块、分组、难度、语言、状态筛选
- `/projects/<仓库名>/` 这一则想法是怎样做成的

右上角可以切换中文 / English、浅色 / 深色，以及「投屏」。在总纲课里，投屏是一节一张的幻灯片；在其他页，投屏只是把字号加大。

## 总纲课的插图

图在 `public/course/future-doctor/`，都是 16:9 的 webp。要换图，用同名文件覆盖即可。

| 文件 | 用在 |
|---|---|
| `cover.webp` | 封面，也出现在首页第 0 课 |
| `intro.webp` | 引言 |
| `01.webp` … `10.webp` | 第 01 到第 10 节 |
| `10.webp` | 写在最后，和第 10 节同一张 |

插图是配图，不是临床图像。图里不放文字。

## 改一节课的资料

教学分组、难度、受众、课时建议、边界，以及「想法是怎样做成的」，写在 [`data/projects.yaml`](data/projects.yaml)。星标、仓库自带简介、编程语言、推送时间和是否开启 GitHub Pages **不要手写**，它们来自 [`data/github-meta.json`](data/github-meta.json)。

每一则有三组中英文字段：`idea_*`（原来的想法）、`steps_*`（用过的工具和步骤）、`reproduce_*`（别人可以照着做的部分）。只写 README 或提交记录里有的内容。写不清就写「待补充」，不要补一个没出现过的模型或提示词。`journey` 里的 `examples` 必须是已经收录的仓库名。

1. 找到对应的 `repo:`。
2. 改中英文字段。不要写该仓库 README 里没有的个人经历，也不要把 fork 写成原创。
3. 新出现的公开仓库要补上完整的一条，否则检查会失败，网站不会带上一个没有说明的仓库。
4. 本地更新星标和 Pages 状态：

```bash
npm run refresh
npm run check
```

`refresh` 调用 GitHub 的公开接口 `GET /users/TUANZIDING/repos`。有 `GITHUB_TOKEN` 时用它，没有也能拉公开仓库。

### 状态

| `status` | 页面上 | 什么时候用 |
|---|---|---|
| `live` | 已上线 | 有可以打开的教学页 |
| `pilot` | 试用待复核 | 仓库能看，但 README 要求教师复核，或还没有公开演示 |
| `planned` | 规划中 | README 写明还没做，或仓库几乎是空的 |

在线演示按钮只在 GitHub Pages 已开启，或该条自己写了核实过的 `demo:` 地址时出现。不要填打不开的链接。

### 线下课

[`data/sessions.yaml`](data/sessions.yaml) 现在是空的。公开仓库里还没有某一次课的日期和地点，页面会如实说明。上过课之后追加：

```yaml
sessions:
  - id: "2026-03-wuxi-01"
    date: "2026-03-01"
    place_zh: "无锡 · 实际教室"
    place_en: "Wuxi, the real room"
    title_zh: "课的名字"
    title_en: "Class title"
    notes_zh: "课后可以重看的说明"
    notes_en: "What to revisit"
    slides: "https://例子/讲义"
    module: "a"
```

只写已经发生的课。

## 本地预览

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

浏览器打开 <http://localhost:4321/tuanzi-ai-academy/>。基路径是 `/tuanzi-ai-academy/`，因为站点部署在用户主页下面的项目站，不是域名根目录。

```bash
npm run check
npm run build
npm run preview
```

`npm run build` 会先检查：yaml 里的仓库和 `github-meta.json` 是否一一对应，以及 fork 标记是否和 GitHub 一致。

可选：给已经开启 Pages 的**原创**仓库截封面（不在自动部署里跑）。

```bash
npx playwright install chromium
npm run covers
```

图片放到 `public/covers/<仓库名>.png` 或 `.webp`。仓库里已经放了目前能打开的 Pages 封面。没有截图时，卡片用版式封面，不拿别的图冒充界面。

## 部署到 GitHub Pages

仓库名保持 `tuanzi-ai-academy`，所有者是 `TUANZIDING`。

1. 把 `main` 推上去。
2. 打开仓库 **Settings → Pages**。
3. 在 **Build and deployment** 里，**Source 选择 GitHub Actions**。不要选 Deploy from a branch。
4. 若 Actions 页提示需要批准 Pages 环境，批准一次。
5. 工作流 [`.github/workflows/pages.yml`](.github/workflows/pages.yml) 会在推送到 `main` 时，以及每天 UTC 02:17，重新拉取仓库元数据、构建、部署。
6. 部署完成后的地址是 <https://tuanziding.github.io/tuanzi-ai-academy/>。

工作流只在构建机里刷新元数据，不会把新的星标写回 git。本地如果要更新快照，自己运行 `npm run refresh` 再提交 `data/github-meta.json`。

拉请求上的 [`.github/workflows/ci.yml`](.github/workflows/ci.yml) 只构建，不部署。

## 反馈

页面上的「想学什么」只用 `mailto:` 打开访客自己的邮箱，收件人是个人主页上公开的邮箱。没有服务器，也没有第三方表单。
