// 训练营：丁医生原创 AI 课（data/campv1.0.json）
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let camp = null;
  function render() {
    const html = Object.entries(camp.tracks).map(([k, t], ti) => {
      const ls = camp.lessons.filter(l => l.track === k);
      return `<div class="camp-track t-${k}">
        <header><span class="ct-en">${esc(t.en)}</span><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p>
        <span class="ct-meta">${ls.length} 堂 · 约 ${ls.reduce((a, l) => a + l.min, 0)} 分钟</span></header>
        <ol class="camp-list">${ls.map((l, i) => `
          <li><button class="camp-card" data-id="${l.id}">
            <span class="cc-no">${ti ? 'S' : 'O'}${String(i + 1).padStart(2, '0')}</span>
            <span class="cc-main"><b>${esc(l.title)}</b><em>${esc(l.one)}</em></span>
            <span class="cc-tag${l.story ? ' story' : l.deck ? ' deck' : ''}">${l.story ? '▶ 故事版' : l.deck ? '▣ 课件 · ' + l.min + '′' : l.level + ' · ' + l.min + '′'}</span>
          </button></li>`).join('')}</ol></div>`;
    }).join('');
    $('#campTracks').innerHTML = html;
    $('#campTracks').querySelectorAll('.camp-card').forEach(b => b.onclick = () => { const l = camp.lessons.find(x => x.id === b.dataset.id); if (l.story) location.href = l.story; else open(b.dataset.id, true); });
  }
  function open(id, push) {
    const all = camp.lessons, idx = all.findIndex(l => l.id === id); if (idx < 0) return;
    const l = all[idx], t = camp.tracks[l.track], same = all.filter(x => x.track === l.track), n = same.indexOf(l) + 1;
    const prev = all[idx - 1], next = all[idx + 1];
    $('#crBody').innerHTML = `
      <p class="cr-kick">${esc(t.name)} · 第 ${n} 课 · ${l.level} · ${l.min} 分钟</p>
      <h2 id="crTitle">${esc(l.title)}</h2>
      ${l.deck ? `<a class="cr-deck" href="${esc(l.deck)}" target="_blank" rel="noopener">▣ 打开投屏课件 ↗</a>` : ''}
      <p class="cr-one">${esc(l.one)}</p>
      <div class="cr-play"><span>🏈 球场比喻</span><p>${esc(l.play)}</p></div>
      <h4>本课要点</h4><ol class="cr-points">${l.points.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
      <div class="cr-grid">
        <div class="cr-box case"><span>🚑 临床与科研场景</span><p>${esc(l.case)}</p></div>
        <div class="cr-box drill"><span>✍️ 课堂练习</span><p>${esc(l.drill)}</p></div>
      </div>
      <div class="cr-care"><b>⚠️ 小心：</b>${esc(l.care)}</div>
      <nav class="cr-nav">${prev ? `<button data-go="${prev.id}">← ${esc(prev.title)}</button>` : '<span></span>'}${next ? `<button data-go="${next.id}">${esc(next.title)} →</button>` : '<span></span>'}</nav>
      <p class="cr-sign">丁海祥 · aiai 学院原创课程 · 更新于 ${esc(camp.updated)}</p>`;
    $('#crBody').querySelectorAll('[data-go]').forEach(b => b.onclick = () => open(b.dataset.go, true));
    const r = $('#campReader'); r.hidden = false; document.documentElement.classList.add('cr-open');
    r.querySelector('.cr-sheet').scrollTop = 0;
    if (push) history.replaceState(null, '', '#camp-' + id);
  }
  function close() { $('#campReader').hidden = true; document.documentElement.classList.remove('cr-open'); history.replaceState(null, '', '#camp'); }
  document.addEventListener('click', e => { if (e.target.closest('[data-cr-close]')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#campReader').hidden) close(); });
  fetch('data/campv1.0.json?v=1.4').then(r => r.json()).then(d => {
    camp = d; render();
    const m = location.hash.match(/^#camp-(\w+)/); if (m) { $('#camp').scrollIntoView(); open(m[1], false); }
  }).catch(() => { $('#campTracks').innerHTML = '<p class="sub">课程加载失败，请刷新页面。</p>'; });
})();
