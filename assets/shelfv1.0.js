/* 横滑展馆：把各馆的卡片网格变成可左右滑动的一排（筛选重绘后自动复位） */
(() => {
  const SPECS = [
    ['#conceptGrid', 'w-s'], ['#gearGrid', 'w-m'], ['#grid', 'w-m'], ['#lessonList', 'w-m'],
    ['#libList', 'w-s rows2'], ['#tools', 'w-s rows2']
  ];
  function shelf(el, cls) {
    if (!el || el.dataset.shelf) return; el.dataset.shelf = '1';
    el.classList.add('shelf', ...cls.split(' ').filter(Boolean)); el.tabIndex = 0;
    const wrap = document.createElement('div'); wrap.className = 'shelf-wrap';
    el.parentNode.insertBefore(wrap, el); wrap.appendChild(el);
    const mk = (c, t, d) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sh-btn ' + c; b.textContent = t; b.setAttribute('aria-label', d); wrap.appendChild(b); return b; };
    const prev = mk('prev', '‹', '向左滑'), next = mk('next', '›', '向右滑');
    const go = d => el.scrollBy({ left: d * el.clientWidth * 0.85, behavior: 'smooth' });
    prev.onclick = () => go(-1); next.onclick = () => go(1);
    const upd = () => {
      const s = el.scrollLeft, m = el.scrollWidth - el.clientWidth;
      wrap.classList.toggle('at-start', s < 8); wrap.classList.toggle('at-end', s >= m - 8); wrap.classList.toggle('no-scroll', m < 8);
    };
    el.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd);
    new MutationObserver(() => { el.scrollLeft = 0; requestAnimationFrame(upd); }).observe(el, { childList: true });
    requestAnimationFrame(upd); setTimeout(upd, 400);
  }
  function boot() {
    SPECS.forEach(([s, c]) => shelf(document.querySelector(s), c));
    const ct = document.getElementById('campTracks');
    if (ct) {
      const apply = () => ct.querySelectorAll('.camp-list').forEach(l => shelf(l, 'w-s'));
      apply(); new MutationObserver(apply).observe(ct, { childList: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
