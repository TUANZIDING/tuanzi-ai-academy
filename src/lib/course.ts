export interface LadderRung {
  id: string;
  en: string;
  zh: string;
}

export interface LayerInfo {
  id: string;
  n: string;
  name: string;
  line: string;
  repo?: string;
  href?: string;
  link_zh: string;
  link_en: string;
}

export interface CourseExample {
  repo: string;
  fit_zh: string;
  fit_en: string;
  note_zh: string;
  note_en: string;
}

export interface CourseParagraph {
  text: string;
  anchor?: string;
}

export interface CourseSection {
  id: string;
  label: string;
  title: string;
  paragraphs: CourseParagraph[];
  discuss_zh: string;
  discuss_en: string;
  examples?: CourseExample[];
  omit_zh?: string;
  omit_en?: string;
  bridge_zh?: string;
  bridge_en?: string;
}

export const ladder: LadderRung[] = [
  { id: "prompt", en: "Prompt", zh: "只是入口" },
  { id: "context", en: "Context", zh: "问题环境" },
  { id: "skill", en: "Skill", zh: "封装稳定的方法" },
  { id: "agent", en: "Agent", zh: "给一个目标" },
  { id: "harness", en: "Harness", zh: "脚手架" },
  { id: "loop", en: "Loop", zh: "反馈和修正" },
  { id: "graph", en: "Graph", zh: "不同节点" },
];

export const layers: LayerInfo[] = [
  {
    id: "domain",
    n: "第一层",
    name: "Domain Knowledge",
    line: "医学专业知识。这是地基。",
    repo: "radiation-muscle-pathway",
    link_zh: "辐射后的肌肉损伤，按阶段写清，并标出证据等级",
    link_en: "Radiation muscle injury, staged, with evidence grades kept visible",
  },
  {
    id: "literacy",
    n: "第二层",
    name: "AI Literacy",
    line: "理解模型能做什么、不能做什么。知道什么时候可以相信，什么时候必须验证。",
    repo: "research-evidence",
    link_zh: "把一句话收回原文。材料不够就停，留给人确认",
    link_en: "Pull one sentence back to the source. Stop if the material is missing",
  },
  {
    id: "engineering",
    n: "第三层",
    name: "AI Engineering Mindset",
    line: "如何把一个复杂问题拆开，给机器足够的信息、工具和约束，让人与 AI 一起把事情完成。",
    href: "start/",
    link_zh: "从自己的想法开始：说出、拆开、做成、发布",
    link_en: "Start from your idea: say it, break it down, make it, publish it",
  },
];

const bridgeZh =
  "这一节说的是：想法不必停在脑子里。站点上的走法是五步：说出想法，拆开，和 AI 一起做，做成打得开的原型，再发布。";
const bridgeEn =
  "This part is about an idea not staying in your head. The site walks it in five steps: say it, break it down, work with an AI tool, make a prototype you can open, then publish.";

export const sections: CourseSection[] = [
  {
    id: "intro",
    label: "引言",
    title: "未来的医生，可能需要同时懂医学与 AI",
    paragraphs: [
      {
        text: "从 Prompt、Context、Skill 到 Agent、Harness、Loop、Graph，我越来越觉得：AI 不是医生多学的一个软件，而是一种新的能力体系。",
      },
      {
        text: "过去很长一段时间里，我们对一个医生的要求其实非常清楚。学好解剖、生理、病理和药理，掌握诊断与治疗原则，熟悉指南，积累临床经验，在一次又一次值班、抢救和病例讨论中形成自己的判断。这些当然依然重要。甚至可以说，无论人工智能发展到什么程度，医学专业能力始终是医生最重要的底座。但最近一两年，我越来越明显地感觉到：仅仅懂医学，可能已经不足以定义下一代医生的全部能力。因为一个新的变量正在进入医学——人工智能。",
      },
    ],
    discuss_zh: "如果医学专业能力仍是底座，你觉得自己还缺的是哪一块？先不要报软件的名字。",
    discuss_en: "If medical skill is still the base, which piece do you think you are missing? Do not start by naming a product.",
  },
  {
    id: "s01",
    label: "01",
    title: "医生面对的，不再只是 ChatGPT",
    paragraphs: [
      {
        text: "很多医生第一次接触 AI，是从 ChatGPT 开始的。问一个疾病，翻译一篇论文，润色一段英文，或者写一份病历。但如果今天仍然把 AI 理解为“一个更聪明的搜索框”，我们可能严重低估了它。",
      },
      {
        text: "OpenAI、Anthropic、Google、Meta、xAI，以及 Cursor 等围绕 AI 编程和智能体构建的产品与生态正在快速发展。真正值得医生关注的，不只是：“哪个 AI 更好用？”而是：这些系统正在怎样改变人类解决问题的方式？这也是我最近使用 AI 最大的感受。",
      },
      {
        text: "最开始，我也是“问问题”。后来开始让 AI 帮我检索和整理文献。再后来，我开始让它比较证据、拆解研究问题、设计实验框架、梳理机制、构建图表、检查逻辑。直到现在，我越来越多地思考：能不能让 AI 不只是回答我的问题，而是和我共同完成一个完整的科研任务？这中间其实发生了一次非常重要的变化：从使用 AI，走向设计 AI 的工作方式。",
      },
    ],
    discuss_zh: "你上次用 AI，是在问一个问题，还是在让它把一件事做完？这两件事差在哪里？",
    discuss_en: "Last time you used an AI tool, were you asking a question, or asking it to finish a piece of work? What is the difference?",
  },
  {
    id: "prompt",
    label: "02",
    title: "Prompt，只是第一层",
    paragraphs: [
      {
        text: "很多人学习 AI，是从“提示词工程（Prompt Engineering）”开始的。怎么问，决定了 AI 怎么回答。但真正使用久了就会发现：Prompt 只是入口。一个复杂医学问题，很少能够靠一句“神奇提示词”解决。",
      },
      {
        text: "比如：“帮我研究电离辐射导致骨骼肌损伤的机制。”这句话 AI 可以回答。但如果真正要形成一个博士课题，问题就完全不同了。我们需要告诉 AI：已有研究做到哪里？哪些是直接证据？哪些只是其他损伤模型的间接证据？哪些结论来自细胞实验？哪些经过动物实验验证？MuSC、FAP、免疫细胞、微血管和 ECM 之间究竟是什么关系？哪些机制值得进一步验证？哪些实验是现有实验室真正能够完成的？",
      },
      {
        text: "这时你会发现：真正重要的已经不只是 Prompt。而是 Context——上下文。",
      },
    ],
    discuss_zh: "用你自己的题目，不用一句“神奇提示词”。按这一节的问法写下来：证据到哪，哪些只是间接的，实验室真正做得了什么。",
    discuss_en: "Take your own topic. Skip the magic prompt. Write the questions from this section: how far the evidence goes, what is only indirect, and what the lab can actually do.",
  },
  {
    id: "context",
    label: "03",
    title: "从 Prompt Engineering 到 Context Engineering",
    paragraphs: [
      {
        text: "我越来越喜欢“上下文工程（Context Engineering）”这个概念。因为医生其实天然理解 Context。同样一句“胸痛”，放在 20 岁年轻人和 70 岁有冠心病史患者身上，意义完全不同。AI 也是一样。你给它什么背景、文献、实验条件、既往结果、研究目标和限制条件，它才能在什么样的世界里进行判断。",
      },
      {
        text: "所以未来医生使用 AI 的一个重要能力，也许不是：“我会不会写提示词？”而是：“我能不能给 AI 构建一个高质量的问题环境？”这与临床诊疗其实惊人地相似。病史、查体、检验、影像、既往史——这些本质上也是 Context。医生根据 Context 做决策。未来，我们还需要学会给 AI 构建 Context。",
      },
    ],
    discuss_zh: "同样一句主诉，换一位病人，Context 变了什么？如果要把这句话交给 AI，你必须补上哪三条背景？",
    discuss_en: "The same chief complaint, a different patient: what in the context changed? Which three pieces of background would you have to add before handing the sentence to an AI tool?",
  },
  {
    id: "skill",
    label: "04",
    title: "再往后，是 Skill",
    paragraphs: [
      {
        text: "如果一个任务需要反复完成，就不应该每一次都从头告诉 AI：第一步做什么，第二步做什么，第三步检查什么。我们可以把稳定的方法封装起来。这就开始接近 Skill 的概念。",
      },
      {
        text: "例如我做科研时，可以把一个固定流程定义成：“检索辐射性骨骼肌损伤最新文献 → 判断证据等级 → 提取模型、剂量、时间点和关键结果 → 判断与 MuSC/FAP/血管/免疫/ECM 哪个模块有关 → 分析是否改变当前研究假说。”以后面对新论文，就不必重新设计整个过程。AI 可以按照这个 Skill 执行。",
      },
      {
        text: "这意味着什么？我们正在把一个人的经验，逐渐变成机器可以重复调用的能力。这对医学尤其重要。因为医学里存在大量这样的隐性知识：怎么读一篇论文。怎么判断证据强弱。怎么设计一个实验。怎么做鉴别诊断。怎么准备 MDT。怎么检查科研数据。怎么避免漏掉危险信号。过去这些能力只能通过多年经验传递。未来，其中一部分也许可以被结构化、标准化，并进一步与 AI 协作。",
      },
    ],
    examples: [
      {
        repo: "github-homepage-style",
        fit_zh: "Skill",
        fit_en: "Skill",
        note_zh:
          "README 写它是给 Codex 的技能：把已经用顺的仓库首页布局收下来，下次还能沿用。念景是版式来源。它不是一个单独的网站生成器。",
        note_en:
          "The README calls it a Codex skill: a repository homepage layout that already works, kept so it can be used again. Nianjing is the layout source. It is not a standalone site generator.",
      },
    ],
    discuss_zh: "你每周都在重复的一件事，哪三步已经稳定，可以写成以后不用重讲的方法？哪一步必须你自己判断？",
    discuss_en: "Of something you repeat every week, which three steps are stable enough to write down so you do not explain them again? Which step must you judge yourself?",
  },
  {
    id: "agent",
    label: "05",
    title: "Agent：从“回答我”变成“帮我完成”",
    paragraphs: [
      {
        text: "再进一步，就是 Agent。传统聊天模式是：我问 → AI 答。Agent 的思路更接近：我给目标 → AI 分解任务 → 调用工具 → 检查结果 → 继续执行。",
      },
      {
        text: "例如我不再只是问：“帮我找几篇论文。”而是给它一个目标：帮我判断“辐射后 FAP 是否可能成为连接早期炎症与晚期纤维化的关键转换节点”。为了回答这个问题，AI 需要自己完成多个步骤：检索文献、筛选研究、提取证据、比较模型、识别证据缺口，再回到原始问题。这已经不再只是聊天。它开始接近一个科研工作流。",
      },
    ],
    examples: [
      {
        repo: "Paper-AI-Research-Agent",
        fit_zh: "Agent",
        fit_en: "Agent",
        note_zh:
          "README 写的是本地的开放文献检索：PubMed、Europe PMC、书目核对、出版后状态和证据保存，分成可审计的步骤，过不了门槛就停。这接近“给一个目标，分步做，再检查”。citation_ready 不等于已经读过全文。",
        note_en:
          "The README describes a local open-literature search: PubMed, Europe PMC, bibliographic checks, post-publication status, and saved evidence, split into auditable steps that stop when a gate fails. That is close to giving a goal, doing it in steps, then checking. citation_ready does not mean the full text was read.",
      },
    ],
    discuss_zh: "把一句“帮我找几篇论文”改成一个目标。要做到哪几步，你才愿意看结果？哪一步失败了就必须停？",
    discuss_en: "Turn “find me a few papers” into a goal. Which steps have to happen before you will look at the result? Which failure means it must stop?",
  },
  {
    id: "system",
    label: "06",
    title: "Harness、Loop、Graph：AI 开始成为一个“系统”",
    paragraphs: [
      {
        anchor: "harness",
        text: "当任务越来越复杂，仅仅有 Agent 还不够。我们还需要考虑：它能调用哪些工具？能够访问哪些资料？什么时候必须停止？什么时候需要人工确认？出现错误以后怎么办？如何验证结果？如何记录整个过程？这些围绕 AI 工作的“脚手架”和运行环境，可以用 Harness 的视角来理解。",
      },
      {
        anchor: "loop",
        text: "而科研和医学的问题，往往也不是一次就能解决。于是又出现另一个非常重要的概念：Loop。检索 → 阅读 → 提出假说 → 找证据 → 发现矛盾 → 修改假说 → 再检索。这不就是科研本身吗？甚至临床也是如此：病史 → 初步诊断 → 检查 → 更新判断 → 补充检查 → 修正诊断 → 治疗 → 再评价。所以 AI 的 Loop，并不是离医学很遥远的计算机概念。恰恰相反。医学本身，就是一个不断反馈和修正的 Loop。",
      },
      {
        anchor: "graph",
        text: "而当问题进一步复杂以后，我们还可以把任务组织成 Graph。不同节点承担不同任务：一个负责检索。一个负责证据评价。一个负责统计。一个负责机制推理。一个负责反驳。一个负责检查引用。最后再汇总。这时，AI 已经不再是“一个聊天机器人”。它开始像一个由多个能力节点组成的协作系统。",
      },
    ],
    examples: [
      {
        repo: "topic-drift-guard",
        fit_zh: "Harness",
        fit_en: "Harness",
        note_zh:
          "README 写它在本地检查多轮代理是否还在最初目标上，以及已经答应的决定有没有在后面的回合里消失。可以对照这一节里的停止、确认和记录。监测分数不是医学结论。示例已脱敏。",
        note_en:
          "The README says it locally checks whether a long agent run still serves the root goal, and whether approved decisions disappeared in later turns. That lines up with stop, confirm, and record in this section. The score is not a medical conclusion. The example is de-identified.",
      },
      {
        repo: "research-evidence",
        fit_zh: "Loop",
        fit_en: "Loop",
        note_zh:
          "README 是一份审查记录：固定一句话，定位原文，写明支持范围和缺口，留下人工确认。材料不够就停。这是要回头改的一小圈。README 没有使用 Loop 这个词。",
        note_en:
          "The README is a review record: fix a sentence, locate the source, state the support and the gaps, and leave a field for a person to confirm. Stop if the source is missing. It is a small pass you can revise. The README does not use the word Loop.",
      },
      {
        repo: "medical-paper-pipeline",
        fit_zh: "Loop",
        fit_en: "Loop",
        note_zh:
          "README 写明这是 Claude Code 技能，复制到 ~/.claude/skills/ 后调用。从清理数据到回复审稿分成六段，每段有人检查。提交记录里至少有一次写了 Claude Opus 的共同署名。它不代替作者核对数据、伦理和文献。",
        note_en:
          "The README says this is a Claude Code skill, copied into ~/.claude/skills/. From cleaning data to answering reviewers it is six stages, with a person at each check. At least one commit lists Claude Opus as co-author. It does not replace the author's check of data, ethics, and citations.",
      },
    ],
    omit_zh: "Graph 这一级，公开仓库的 README 里还没有一份写成“多个节点各做一事再汇总”，这里不配例子。",
    omit_en: "For Graph, no public README yet describes separate nodes that each do one job and then combine. No example is attached.",
    discuss_zh: "挑你手头的一件事，回答三个问题：什么时候必须停？谁来确认？出错以后记在哪里？",
    discuss_en: "Take one task you are actually doing. When must it stop? Who confirms? Where is an error written down?",
  },
  {
    id: "s07",
    label: "07",
    title: "我为什么开始学习 Codex、Cursor，而不仅仅是医学 AI？",
    paragraphs: [
      {
        text: "以前我不会编程时，有很多想法会停在一句话：“这个东西如果有人能做出来就好了。”现在这句话正在发生变化。因为自然语言正在逐渐成为人与计算机之间新的接口。",
      },
      {
        text: "以前，一个医生想开发科研工具、建立数据库、制作交互式网页、分析复杂数据，往往需要先掌握大量计算机知识。今天，我们仍然需要理解逻辑，但不一定必须亲手写完每一行代码。我可以告诉 Codex 或 Cursor：我要解决什么医学问题。数据是什么。用户是谁。整个流程应该怎样运行。哪里不能出错。结果应该怎样验证。然后与 AI 一轮又一轮地迭代。",
      },
      {
        text: "这意味着一个非常有意思的变化：医生第一次有机会用自然语言，把自己脑海中的医学逻辑直接变成软件、工具和工作流。很多过去因为“我不会编程”而被放弃的想法，现在重新有了实现的可能。",
      },
    ],
    examples: [
      {
        repo: "tuanzi-ai-academy",
        fit_zh: "已经做成的一页",
        fit_en: "A page that exists",
        note_zh:
          "就是你正在看的这间课。README 写它用 Astro 做成静态页，教学说明手写在 data/projects.yaml，构建时向 GitHub 查询星标和更新时间，再用 GitHub Actions 发布。对话里用过哪个模型，README 没有写，待补充。",
        note_en:
          "This classroom. The README says the pages are static Astro, the teaching notes are written in data/projects.yaml, stars and update times are read from GitHub at build, and GitHub Actions publishes the site. Which model was used in the chat is not in the README. Still to be added.",
      },
      {
        repo: "radiation-muscle-pathway",
        fit_zh: "已经做成的一页",
        fit_en: "A page that exists",
        note_zh:
          "上文里的辐射骨骼肌问题，这个仓库做成了能打开的图谱：按阶段讲，证据等级写在页面上。README 写数据在 pathway-data.js，Pages 入口是 docs/index.html。协助编写的工具，待补充。不要顺着动画下治疗结论。",
        note_en:
          "The radiation-muscle question from the essay is an atlas you can open: stages, with evidence grades on the page. The README puts the data in pathway-data.js and the Pages entry at docs/index.html. Which tool helped write it is not recorded. Still to be added. Do not turn the animation into treatment advice.",
      },
    ],
    discuss_zh: "你有没有一句“要是有人能做出来就好了”？试着用这一节的说法把它说完：医学问题、数据、用户、哪里不能出错、结果怎样核对。说不到的地方就空着。",
    discuss_en: "Is there something you have left as “if only someone could build it”? Say it the way this section does: the medical question, the data, the user, where it must not go wrong, and how the result is checked. Leave a blank where you cannot say it yet.",
    bridge_zh: bridgeZh,
    bridge_en: bridgeEn,
  },
  {
    id: "s08",
    label: "08",
    title: "所以，未来医生到底需要学什么？",
    paragraphs: [
      { text: "我现在越来越倾向于把未来医生的能力理解成三层。" },
      {
        text: "第一层：Domain Knowledge。医学专业知识。这是地基。没有医学知识，再强的 AI 也无法替你建立真正可靠的临床判断。",
      },
      {
        text: "第二层：AI Literacy。理解模型能做什么、不能做什么。理解幻觉、证据、引用、隐私、安全和边界。知道什么时候可以相信，什么时候必须验证。",
      },
      {
        text: "第三层：AI Engineering Mindset。这可能是未来真正拉开差距的一层。Prompt ↓ Context ↓ Skill ↓ Agent ↓ Harness ↓ Loop ↓ Graph。这些词表面上属于计算机和人工智能。但背后的核心其实只有一句话：如何把一个复杂问题拆开，给机器足够的信息、工具和约束，让人与 AI 一起把事情完成。",
      },
    ],
    discuss_zh: "三层里，你哪一层最厚，哪一层还是空的？空的那一层，这学期只定一个具体动作。",
    discuss_en: "Of the three layers, which is thickest for you, and which is still empty? For the empty one, name one concrete action for this term.",
  },
  {
    id: "s09",
    label: "09",
    title: "AI 最让我兴奋的，并不是“帮我省时间”",
    paragraphs: [
      {
        text: "很多人谈 AI，首先想到的是效率。以前三小时完成，现在三十分钟完成。当然，这非常重要。但我越来越觉得，这可能并不是 AI 最大的价值。AI 更重要的意义也许是：它开始降低“把一个想法变成现实”的门槛。",
      },
      {
        text: "过去一个医生脑子里有一个想法：不会编程。不会画图。不会搭数据库。不会做网页。不会自动化。于是想法最终停留在想法。今天，一个医生可以与 AI 对话：把模糊想法变成问题。把问题变成结构。把结构变成方案。把方案变成代码。把代码变成工具。再把工具拿回来解决医学问题。",
      },
      {
        text: "所以真正让我感兴趣的，不是：“AI 能替医生做什么？”而是另一个问题：有了 AI 以后，一个医生以前做不到的事情，现在能不能做到了？这两个问题，看起来很像。其实完全不同。",
      },
    ],
    discuss_zh: "“省下的时间”和“以前做不到、现在也许做得到”，你更在意哪一个？举一个你曾经停住的想法。",
    discuss_en: "Which matters more to you: time saved, or something you could not do before and might do now? Name one idea you once left unfinished.",
    bridge_zh: bridgeZh,
    bridge_en: bridgeEn,
  },
  {
    id: "s10",
    label: "10",
    title: "医生不会被一个“会聊天的 AI”重新定义",
    paragraphs: [
      {
        text: "真正值得关注的，也许是另一种变化：未来医生身边可能会逐渐出现一个属于自己的 AI 工作系统。它知道你的专业方向。知道你的研究问题。知道你长期阅读的文献。知道实验条件。知道你的证据标准。拥有不同的 Skills。能够调用不同工具。能够执行 Loop。能够组织复杂 Graph。但最后的医学判断、科学责任和价值判断，仍然属于人。",
      },
      {
        text: "所以我并不认为医生未来需要变成程序员。但我越来越相信：未来优秀的医生，需要理解如何与智能系统协作。就像上一代医生需要学习循证医学、数据库检索和统计学一样。",
      },
    ],
    discuss_zh: "如果身边有一套记得你研究方向的系统，哪些判断你仍然不会交给它？写两件。",
    discuss_en: "If a system remembered your research questions, which judgments would you still not hand over? Name two.",
  },
  {
    id: "close",
    label: "写在最后",
    title: "写在最后",
    paragraphs: [
      {
        text: "医学的核心没有改变。我们面对的仍然是疾病，是生命，是一个个具体的人。改变的是我们的工具。听诊器扩展了听觉。影像设备扩展了视觉。实验室检查让我们看到肉眼无法看到的生理变化。而人工智能，也许正在扩展另一种东西：人的认知能力。",
      },
      {
        text: "因此，医生学习 AI 的目的，不应该只是为了追赶一个热点。更不是为了在简历上增加一个“懂 AI”的标签。真正值得我们思考的是：当人类第一次拥有这样一种可以帮助我们阅读、推理、编程、设计、连接知识并执行复杂任务的工具时，我们能够用它，把哪些过去只存在于脑海里的医学想法真正实现？",
      },
      {
        text: "也许未来医学真正有意思的地方，就从这里开始。医学给 AI 方向。AI 给医学新的可能。而医生，站在两者之间。",
      },
    ],
    discuss_zh: "医学给 AI 方向。你手头哪一个想法，值得沿着这架梯子，做成一个别人打得开的东西？",
    discuss_en: "Medicine gives AI its direction. Which idea of yours is worth walking up this ladder until someone else can open it?",
    bridge_zh: bridgeZh,
    bridge_en: bridgeEn,
  },
];
