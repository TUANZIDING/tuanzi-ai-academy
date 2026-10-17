// 橄榄球光标：精确小点 + 跟随的橄榄球（随运动方向旋转）+ 战术路线尾迹
(() => {
  if (!matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const css = `
  html.fb-cursor, html.fb-cursor *{cursor:none!important}
  html.fb-cursor input, html.fb-cursor textarea, html.fb-cursor select, html.fb-cursor [contenteditable]{cursor:text!important}
  .fb-dot{position:fixed;left:0;top:0;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#c8692c;z-index:2147483647;pointer-events:none;box-shadow:0 0 0 2px rgba(255,255,255,.85)}
  .fb-ball{position:fixed;left:0;top:0;width:34px;height:22px;margin:-11px 0 0 -17px;z-index:2147483646;pointer-events:none;filter:drop-shadow(0 4px 6px rgba(60,35,15,.28));transition:width .25s,height .25s,margin .25s,opacity .3s}
  .fb-ball svg{width:100%;height:100%;display:block}
  html.fb-hover .fb-ball{width:46px;height:30px;margin:-15px 0 0 -23px}
  html.fb-hover .fb-dot{background:#2f6f5e}
  .fb-ball.spin svg{animation:fbSpin .55s cubic-bezier(.2,.7,.3,1)}
  @keyframes fbSpin{to{transform:rotate(360deg)}}
  .fb-trail{position:fixed;inset:0;z-index:2147483645;pointer-events:none}
  .fb-hide .fb-ball,.fb-hide .fb-dot,.fb-hide .fb-trail{opacity:0}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const dot = document.createElement('div'); dot.className = 'fb-dot';
  const ball = document.createElement('div'); ball.className = 'fb-ball';
  ball.innerHTML = '<svg viewBox="0 0 68 44" aria-hidden="true"><defs><radialGradient id="fbG" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#b8693a"/><stop offset=".6" stop-color="#8a4321"/><stop offset="1" stop-color="#5e2c14"/></radialGradient></defs><path d="M2 22C10 6 26 2 34 2s24 4 32 20c-8 16-24 20-32 20S10 38 2 22Z" fill="url(#fbG)"/><path d="M9 13c2 6 2 12 0 18M59 13c-2 6-2 12 0 18" stroke="#f4ede3" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/><path d="M22 20h24" stroke="#f4ede3" stroke-width="2.4" stroke-linecap="round"/><path d="M25 16.5v7M29.5 16.5v7M34 16.5v7M38.5 16.5v7M43 16.5v7" stroke="#f4ede3" stroke-width="2" stroke-linecap="round"/><ellipse cx="26" cy="10" rx="12" ry="3" fill="#fff" opacity=".18"/></svg>';
  const cv = document.createElement('canvas'); cv.className = 'fb-trail';
  document.body.append(cv, ball, dot);
  document.documentElement.classList.add('fb-cursor');
  const ctx = cv.getContext('2d'); let dpr = 1;
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); addEventListener('resize', size);

  let mx = innerWidth / 2, my = innerHeight / 2, bx = mx, by = my, ang = 0, seen = false;
  const pts = [];
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    if (!seen) { bx = mx; by = my; seen = true; }
    dot.style.transform = `translate(${mx}px,${my}px)`;
    const t = e.target.closest && e.target.closest('a,button,[role=button],input[type=range],summary,label,.card,[data-music-toggle]');
    document.documentElement.classList.toggle('fb-hover', !!t);
  }, { passive: true });
  document.addEventListener('mouseleave', () => document.documentElement.classList.add('fb-hide'));
  document.addEventListener('mouseenter', () => document.documentElement.classList.remove('fb-hide'));
  addEventListener('pointerdown', () => { ball.classList.remove('spin'); void ball.offsetWidth; ball.classList.add('spin'); });

  function tick() {
    const dx = mx - bx, dy = my - by;
    bx += dx * 0.2; by += dy * 0.2;
    const sp = Math.hypot(dx, dy);
    if (sp > 1.5) {
      let target = Math.atan2(dy, dx) * 180 / Math.PI, d = ((target - ang + 540) % 360) - 180;
      ang += d * 0.18;
    }
    const stretch = 1 + Math.min(sp / 260, 0.18);
    ball.style.transform = `translate(${bx}px,${by}px) rotate(${ang}deg) scale(${stretch},${1 / stretch})`;
    if (sp > 2) pts.push({ x: bx, y: by, life: 1 });
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = pts.length - 1; i >= 0; i--) { pts[i].life -= 0.028; if (pts[i].life <= 0) pts.splice(i, 1); }
    if (pts.length > 1) {
      ctx.lineCap = 'round'; ctx.setLineDash([6, 7]);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        ctx.strokeStyle = `rgba(47,143,157,${b.life * 0.55})`; ctx.lineWidth = 2.2 * b.life + 0.4;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.setLineDash([]);
      const o = pts[0]; ctx.fillStyle = `rgba(200,105,44,${o.life * 0.6})`;
      ctx.beginPath(); ctx.arc(o.x, o.y, 3.5 * o.life + 1, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
