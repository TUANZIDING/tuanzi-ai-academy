(() => {
  const CATS = {
    all: '全部', trauma: '创伤教学', workflow: 'AI 工作流 / 技能', govern: '证据与智能体治理',
    research: '可复现科研', family: '亲子与创作', explore: '趣味探索'
  };
  const LEVELS = [
    { id: 'L0', name: '会问', en: 'ASK', desc: '把临床问题说清楚：角色、背景、目标、格式。', yard: '10 YDS' },
    { id: 'L1', name: '会核对', en: 'VERIFY', desc: '每个论断找到出处，分清事实、关联与推测。', yard: '20 YDS' },
    { id: 'L2', name: '会搭流程', en: 'WORKFLOW', desc: '把一次好结果变成可复用的技能和工作流。', yard: '40 YDS' },
    { id: 'L3', name: '会做作品', en: 'BUILD', desc: '互动课件、3D 图谱、亲子读物，做成能点开的东西。', yard: '70 YDS' },
    { id: 'L4', name: '会治理', en: 'GOVERN', desc: '可审计智能体、可复现科研：让 AI 出错时能被发现。', yard: 'END ZONE' }
  ];
  const LESSONS = [
    { meta: '线下 · 约 60 分钟 · 入门', title: 'AI 使用策略入门：先问，再核对', steps: [
      ['L0 现场演示：同一个临床问题，三种问法的差别', null],
      ['L1 证据审阅：让 AI 给出处、标边界', 'research-evidence'],
      ['L1 统计方法怎么问 AI、怎么验收', 'clinical-stats-languages-guide'],
      ['看成品：创伤救治学院', 'trauma-master-academy'] ] },
    { meta: '线上 / 线下 · 约 90 分钟 · 进阶', title: '从一次对话到一套工作流', steps: [
      ['L2 笔记到推文：证据可追溯的写作流', 'codex-obsidian-wechat-workflow'],
      ['L2 多智能体接力：谁动手、谁决定', 'codex-hark-bridge'],
      ['L2 把好结果沉淀成技能', 'github-homepage-style'],
      ['L4 防幻觉引用：fail-closed 文献智能体', 'Paper-AI-Research-Agent'] ] },
    { meta: '线下工作坊 · 半天 · 实操', title: '医生也能做出互动作品', steps: [
      ['L3 骨科创伤 3D 图谱拆解', 'orthopaedic-trauma-atlas'],
      ['L3 证据分层的机制图谱', 'radiation-muscle-pathway'],
      ['L3 亲子伴读：给自己孩子做读物', 'peter-rabbit-interactive'],
      ['L3 事实与推测分开画：阿房宫复原', 'epang-palace'] ] }
  ];

  let data = { projects: [], toolbox: [] };
  let cat = 'all', level = null;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderStats() {
    const live = data.projects.filter(p => p.live).length;
    $('#stats').innerHTML = `
      <li><b>${data.projects.length}</b>个公开作品</li>
      <li><b>${live}</b>个可在线演示</li>
      <li><b>5</b>档战术路线</li>
      <li><b>${data.toolbox.length}</b>件开源装备</li>`;
    $('#updated').textContent = `作品数据更新于 ${data.updated}`;
  }

  function renderLevels() {
    $('#levels').innerHTML = LEVELS.map(l => {
      const n = data.projects.filter(p => p.level === l.id).length;
      return `<li><button data-level="${l.id}" aria-pressed="${level === l.id}">
        <span class="yard">${l.yard}</span>
        <span class="lv">${l.id}</span><h3>${l.name} <small style="color:var(--muted);font-weight:500">${l.en}</small></h3>
        <p>${l.desc}</p><span class="count">${n ? n + ' 个示范作品 →' : '现场演示为主'}</span></button></li>`;
    }).join('');
    $('#levels').querySelectorAll('button').forEach(b => b.onclick = () => {
      level = level === b.dataset.level ? null : b.dataset.level;
      renderLevels(); renderGrid();
      if (level) $('#gallery').scrollIntoView({ behavior: 'smooth' });
    });
  }

  function renderFilters() {
    $('#filters').innerHTML = Object.entries(CATS).map(([k, v]) => {
      const n = k === 'all' ? data.projects.length : data.projects.filter(p => p.category === k).length;
      return `<button class="chip" data-cat="${k}" aria-pressed="${cat === k}">${v} ${n}</button>`;
    }).join('');
    $('#filters').querySelectorAll('.chip').forEach(b => b.onclick = () => { cat = b.dataset.cat; renderFilters(); renderGrid(); });
  }

  function card(p) {
    const lv = LEVELS.find(l => l.id === p.level);
    return `<article class="card">
      <div class="thumb">
        <div class="ph">${esc(p.title)}</div>
        <img src="${esc(p.cover)}" alt="${esc(p.title)} 封面" loading="lazy" onerror="this.remove()">
        <div class="badges"><span class="badge lv">${p.level} ${lv ? lv.name : ''}</span>${p.live ? '<span class="badge live">在线演示</span>' : ''}</div>
      </div>
      <div class="card-body">
        <span class="tag">${CATS[p.category]}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.summary)}</p>
        <p class="teach"><b>课上讲：</b>${esc(p.teach)}</p>
        <div class="links">
          ${p.live ? `<a class="go" href="${esc(p.live)}" target="_blank" rel="noopener">打开演示 ↗</a>` : ''}
          <a class="src" href="${esc(p.source)}" target="_blank" rel="noopener">看源码 ↗</a>
        </div>
      </div></article>`;
  }

  function renderGrid() {
    const list = data.projects
      .filter(p => cat === 'all' || p.category === cat)
      .filter(p => !level || p.level === level)
      .sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0));
    $('#grid').innerHTML = list.map(card).join('') || '<p class="sub">这个组合下暂时没有作品。</p>';
    const parts = [];
    if (level) parts.push(`${level} 档`);
    if (cat !== 'all') parts.push(CATS[cat]);
    $('#filterState').innerHTML = parts.length ? `正在看：${parts.join(' · ')}（${list.length} 个） <button id="clr">清除筛选</button>` : '';
    const clr = $('#clr'); if (clr) clr.onclick = () => { cat = 'all'; level = null; renderFilters(); renderLevels(); renderGrid(); };
  }

  function renderLessons() {
    const byRepo = Object.fromEntries(data.projects.map(p => [p.repo, p]));
    $('#lessonList').innerHTML = LESSONS.map(l => `<article class="lesson">
      <span class="meta">${l.meta}</span><h3>${l.title}</h3>
      <ol>${l.steps.map(([t, r]) => {
        const p = r && byRepo[r]; const href = p ? (p.live || p.source) : null;
        return `<li>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(t)} ↗</a>` : esc(t)}</li>`;
      }).join('')}</ol>
      <span class="status">示范路线 · 课后课件按场次上架</span></article>`).join('');
  }

  function renderTools() {
    $('#tools').innerHTML = data.toolbox.map(t =>
      `<a class="tool" href="${esc(t.source)}" target="_blank" rel="noopener"><b>${esc(t.title)}</b><span>${esc(t.summary)}</span></a>`).join('');
  }

  const pj = $('#projector');
  pj.onclick = () => {
    const on = document.documentElement.classList.toggle('projector');
    pj.setAttribute('aria-pressed', on);
    try { localStorage.setItem('projector', on ? '1' : '0'); } catch (e) {}
  };
  try { if (localStorage.getItem('projector') === '1') pj.click(); } catch (e) {}

  fetch('data/projectsv1.0.json').then(r => r.json()).then(d => {
    data = d; renderStats(); renderLevels(); renderFilters(); renderGrid(); renderLessons(); renderTools();
  }).catch(() => { $('#grid').innerHTML = '<p class="sub">作品数据加载失败，请刷新页面。</p>'; });

  let learn = null, cLevel = 'all', libTopic = 'all';
  function renderConcepts() {
    const opts = [['all', '全部']].concat(LEVELS.map(l => [l.id, `${l.id} ${l.name}`]));
    $('#conceptFilters').innerHTML = opts.map(([k, v]) => {
      const n = k === 'all' ? learn.concepts.length : learn.concepts.filter(c => c.level === k).length;
      return `<button class="chip" data-k="${k}" aria-pressed="${cLevel === k}">${v} ${n}</button>`;
    }).join('');
    $('#conceptFilters').querySelectorAll('.chip').forEach(b => b.onclick = () => { cLevel = b.dataset.k; renderConcepts(); });
    $('#conceptGrid').innerHTML = learn.concepts.filter(c => cLevel === 'all' || c.level === cLevel).map(c => `
      <article class="concept"><span class="badge lv">${c.level}</span>
        <h3>${esc(c.term)}</h3><p>${esc(c.def)}</p>
        <p class="play"><b>战术板比喻</b>${esc(c.play)}</p>
        <a href="${esc(c.more)}" target="_blank" rel="noopener">深入学 ↗</a></article>`).join('');
  }
  function renderGear() {
    $('#gearGrid').innerHTML = learn.gear.map(g => `
      <article class="gear-card"><span class="tag">${esc(g.group)}</span>
        <h3><a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.name)} ↗</a></h3>
        <dl><dt>擅长</dt><dd>${esc(g.good)}</dd><dt>医生怎么用</dt><dd>${esc(g.use)}</dd><dt>小心</dt><dd>${esc(g.care)}</dd></dl></article>`).join('');
  }
  function renderLibrary() {
    $('#libCredit').innerHTML = `精选自好友 <a href="${esc(learn.credit.url)}" target="_blank" rel="noopener">${esc(learn.credit.name)}</a> 的公开课程，点击跳转原站学习。像赛前看录像一样，按主题挑着看。`;
    const opts = [['all', '全部']].concat(Object.entries(learn.topics));
    $('#libFilters').innerHTML = opts.map(([k, v]) => {
      const n = k === 'all' ? learn.library.length : learn.library.filter(c => c.topic === k).length;
      return n ? `<button class="chip" data-k="${k}" aria-pressed="${libTopic === k}">${v} ${n}</button>` : '';
    }).join('');
    $('#libFilters').querySelectorAll('.chip').forEach(b => b.onclick = () => { libTopic = b.dataset.k; renderLibrary(); });
    $('#libList').innerHTML = learn.library.filter(c => libTopic === 'all' || c.topic === libTopic).map(c =>
      `<a class="lib-item" href="${esc(c.url)}" target="_blank" rel="noopener"><span>${esc(learn.topics[c.topic])}</span><b>${esc(c.title)}</b></a>`).join('');
  }
  fetch('data/learnv1.0.json').then(r => r.json()).then(d => { learn = d; renderConcepts(); renderGear(); renderLibrary(); })
    .catch(() => { $('#conceptGrid').innerHTML = '<p class="sub">词典数据加载失败，请刷新页面。</p>'; });
})();
