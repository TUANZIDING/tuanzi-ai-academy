/* v3.0 首页：数字从数据实时计算 + 滚动渐显 */
(() => {
  const set = (k, v) => document.querySelectorAll(`[data-n="${k}"]`).forEach(el => {
    const small = el.querySelector('small');
    el.textContent = v; if (small) el.appendChild(small);
  });
  const j = u => fetch(u + '?v=3.0').then(r => r.json()).catch(() => null);
  Promise.all([j('data/projectsv1.0.json'), j('data/learnv1.0.json'), j('data/campv1.0.json')]).then(([p, l, c]) => {
    if (p) set('projects', p.projects.length);
    if (l) { set('concepts', l.concepts.length); set('library', l.library.length); }
    if (c) set('camp', c.lessons.length);
  });
  // 课件馆：示范路线数 + 实战案例
  const countLessons = () => {
    const n = document.querySelectorAll('#lessonList .lesson').length;
    if (n) { set('lessons', n + document.querySelectorAll('#lessons .case-feature').length); return true; }
  };
  if (!countLessons()) { let t = 0; const iv = setInterval(() => { if (countLessons() || ++t > 40) clearInterval(iv); }, 150); }

  const els = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
  setTimeout(() => els.forEach(e => e.classList.add('in')), 2500); // 兜底：投屏/打印时不丢内容
})();
