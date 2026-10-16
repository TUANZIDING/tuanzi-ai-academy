(() => {
  const root = document.documentElement;
  const w = document.getElementById('welcome');
  const KEY = 'tz-welcome-seen';
  const seen = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const deep = location.hash && location.hash !== '#top' && location.hash !== '#welcome';
  function open() { w.hidden = false; w.classList.remove('leaving'); root.classList.add('w-open'); startNet(); document.getElementById('wEnter').focus(); }
  function close() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    w.classList.add('leaving'); root.classList.remove('w-open');
    setTimeout(() => { w.hidden = true; stopNet(); }, 550);
  }
  document.getElementById('wEnter').onclick = close;
  document.getElementById('reWelcome').onclick = open;
  w.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  if (deep || seen()) { w.hidden = true; } else { root.classList.add('w-open'); }

  // 作品数同步
  fetch('data/projectsv1.0.json').then(r => r.json()).then(d => { const n = document.getElementById('wWorks'); if (n && d.projects) n.textContent = d.projects.length; }).catch(() => {});

  // AI 神经网络背景
  const cv = document.getElementById('wNet'); const ctx = cv ? cv.getContext('2d') : null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pts = [], raf = null;
  function size() { cv.width = cv.offsetWidth * devicePixelRatio; cv.height = cv.offsetHeight * devicePixelRatio;
    const n = Math.min(90, Math.floor(cv.offsetWidth * cv.offsetHeight / 16000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, vx: (Math.random() - .5) * .35 * devicePixelRatio, vy: (Math.random() - .5) * .35 * devicePixelRatio })); }
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height); const D = 130 * devicePixelRatio;
    for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > cv.width) p.vx *= -1; if (p.y < 0 || p.y > cv.height) p.vy *= -1; }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < D) { ctx.strokeStyle = `rgba(34,211,238,${.22 * (1 - d / D)})`; ctx.lineWidth = devicePixelRatio; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
    for (const p of pts) { ctx.fillStyle = 'rgba(165,243,252,.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 * devicePixelRatio, 0, 7); ctx.fill(); }
    if (!reduce) raf = requestAnimationFrame(draw);
  }
  function startNet() { if (!cv || raf) return; size(); draw(); }
  function stopNet() { cancelAnimationFrame(raf); raf = null; }
  addEventListener('resize', () => { if (cv && !w.hidden) size(); });
  if (!w.hidden) startNet();

  // 音乐：站内 MP3（CC BY 4.0），首次点击页面即播放，记住开关与音量
  const audio = document.getElementById('bgm');
  const toggles = document.querySelectorAll('[data-music-toggle]');
  const statuses = document.querySelectorAll('[data-music-status]');
  const vol = document.querySelector('.music-vol');
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const sv = Number(read('tz-music-volume'));
  audio.volume = read('tz-music-volume') !== null && isFinite(sv) ? Math.max(0, Math.min(1, sv)) : 0.3;
  vol.value = String(Math.round(audio.volume * 100));
  let auto = read('tz-music') !== 'off', loading = false, failed = false;
  function render() {
    const playing = !audio.paused;
    const txt = failed ? '点击重试' : loading ? '正在加载…' : playing ? '暂停音乐' : '播放音乐';
    statuses.forEach(s => { s.textContent = s.closest('.w-music') ? (playing ? '热血钢琴 · 播放中' : failed ? '音乐 · 点击重试' : '热血钢琴 · Unity') : txt; });
    toggles.forEach(t => t.setAttribute('aria-pressed', String(playing)));
    document.documentElement.classList.toggle('music-on', playing);
  }
  async function play(manual) {
    if (manual) { auto = false; save('tz-music', 'on'); }
    if (!audio.src) audio.src = audio.dataset.src;
    loading = true; failed = false; render();
    try { await audio.play(); } catch (e) { failed = !!manual; }
    loading = false; render();
  }
  function stop() { auto = false; save('tz-music', 'off'); audio.pause(); render(); }
  toggles.forEach(t => t.addEventListener('click', e => { e.stopPropagation(); audio.paused ? play(true) : stop(); }));
  function first(e) {
    document.removeEventListener('pointerdown', first, true);
    if (auto && audio.paused && !e.target.closest('[data-music-toggle],.music-vol')) play(false);
  }
  document.addEventListener('pointerdown', first, true);
  vol.addEventListener('input', () => { audio.volume = vol.value / 100; save('tz-music-volume', String(audio.volume)); });
  ['playing', 'pause', 'waiting', 'error'].forEach(ev => audio.addEventListener(ev, () => { if (ev === 'error') failed = true; if (ev === 'playing') loading = false; render(); }));
  render();
})();
