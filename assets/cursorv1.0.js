// 橄榄球光标 v2：球在最前，彗星式发光尾迹紧贴球尾，高速时有火花与速度线，点击螺旋旋转+爆点
(() => {
  const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  function boot(e0) {
    if (e0.pointerType && e0.pointerType !== 'mouse') return;
    removeEventListener('pointermove', boot);
    const css = `
    html.fb-cursor, html.fb-cursor *{cursor:none!important}
    html.fb-cursor input:not([type=range]), html.fb-cursor textarea, html.fb-cursor select, html.fb-cursor [contenteditable]{cursor:text!important}
    .fb-trail{position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483645;pointer-events:none}
    .fb-ball{position:fixed;left:0;top:0;width:36px;height:24px;margin:-12px 0 0 -18px;z-index:2147483647;pointer-events:none;will-change:transform;transition:opacity .3s}
    .fb-ball .fb-in{width:100%;height:100%;transition:transform .25s cubic-bezier(.3,1.6,.5,1);filter:drop-shadow(0 3px 5px rgba(60,35,15,.35))}
    .fb-ball svg{width:100%;height:100%;display:block}
    .fb-ring{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;border:1.5px dashed rgba(200,105,44,.9);opacity:0;transform:scale(.4);transition:.3s;animation:fbRot 3s linear infinite}
    html.fb-hover .fb-ring{opacity:1;transform:scale(1)}
    html.fb-hover .fb-in{transform:scale(1.25)}
    .fb-ball.spin .fb-in svg{animation:fbSpiral .6s cubic-bezier(.2,.7,.3,1)}
    @keyframes fbSpiral{0%{transform:scaleY(1)}20%{transform:scaleY(.25)}40%{transform:scaleY(1)}60%{transform:scaleY(.25)}100%{transform:scaleY(1)}}
    @keyframes fbRot{to{rotate:360deg}}
    html.fb-hide .fb-ball, html.fb-hide .fb-trail{opacity:0}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const ball = document.createElement('div'); ball.className = 'fb-ball';
    ball.innerHTML = '<span class="fb-ring"></span><div class="fb-in"><svg viewBox="0 0 68 44" aria-hidden="true"><defs><radialGradient id="fbG" cx="42%" cy="28%" r="78%"><stop offset="0" stop-color="#c47640"/><stop offset=".55" stop-color="#8a4321"/><stop offset="1" stop-color="#562812"/></radialGradient></defs><path d="M2 22C10 6 26 2 34 2s24 4 32 20c-8 16-24 20-32 20S10 38 2 22Z" fill="url(#fbG)"/><path d="M10 13c2 6 2 12 0 18M58 13c-2 6-2 12 0 18" stroke="#f4ede3" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/><path d="M22 20h24" stroke="#f4ede3" stroke-width="2.4" stroke-linecap="round"/><path d="M25 16.5v7M29.5 16.5v7M34 16.5v7M38.5 16.5v7M43 16.5v7" stroke="#f4ede3" stroke-width="2" stroke-linecap="round"/><ellipse cx="27" cy="10" rx="12" ry="3" fill="#fff" opacity=".22"/></svg></div>';
    const cv = document.createElement('canvas'); cv.className = 'fb-trail';
    document.body.append(cv, ball);
    document.documentElement.classList.add('fb-cursor');
    const ctx = cv.getContext('2d');
    function size() { const d = Math.min(devicePixelRatio || 1, 2); cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
    size(); addEventListener('resize', size);

    let mx = e0.clientX, my = e0.clientY, bx = mx, by = my, ang = 0, vx = 0, vy = 0;
    const hist = [], sparks = [];
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      const t = e.target.closest && e.target.closest('a,button,[role=button],input,summary,label,select,[data-music-toggle]');
      document.documentElement.classList.toggle('fb-hover', !!t);
    }, { passive: true });
    document.addEventListener('mouseleave', () => document.documentElement.classList.add('fb-hide'));
    document.addEventListener('mouseenter', () => document.documentElement.classList.remove('fb-hide'));
    addEventListener('pointerdown', () => {
      ball.classList.remove('spin'); void ball.offsetWidth; ball.classList.add('spin');
      if (calm) return;
      for (let i = 0; i < 16; i++) { const a = Math.PI * 2 * i / 16, s = 2 + Math.random() * 2.5; sparks.push({ x: bx, y: by, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: i % 2 ? '200,105,44' : '47,170,180' }); }
    });

    function tick() {
      const nx = bx + (mx - bx) * 0.42, ny = by + (my - by) * 0.42;
      vx = nx - bx; vy = ny - by; bx = nx; by = ny;
      const sp = Math.hypot(vx, vy);
      if (sp > 0.6) { const tgt = Math.atan2(vy, vx) * 180 / Math.PI, d = ((tgt - ang + 540) % 360) - 180; ang += d * 0.3; }
      const st = 1 + Math.min(sp / 90, 0.22);
      ball.style.transform = `translate(${bx}px,${by}px) rotate(${ang}deg) scale(${st},${1 / st})`;

      // 尾迹起点 = 球尾（沿运动反方向偏移半个球长）
      const r = ang * Math.PI / 180, tx = bx - Math.cos(r) * 15, ty = by - Math.sin(r) * 15;
      hist.unshift({ x: tx, y: ty, s: sp });
      if (hist.length > 22) hist.pop();
      if (sp < 0.4 && hist.length > 1) hist.splice(-2, 2);

      if (!calm && sp > 7 && Math.random() < 0.6) sparks.push({ x: tx, y: ty, vx: -vx * 0.08 + (Math.random() - .5) * 1.4, vy: -vy * 0.08 + (Math.random() - .5) * 1.4, life: 1, c: Math.random() < .5 ? '255,170,80' : '120,220,230' });

      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (!calm && hist.length > 2) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // 外层辉光
        ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(47,170,180,.65)';
        for (let i = 1; i < hist.length; i++) {
          const k = 1 - i / hist.length, a = hist[i - 1], b = hist[i];
          ctx.strokeStyle = `rgba(${Math.round(200 - 150 * (1 - k))},${Math.round(120 + 50 * (1 - k))},${Math.round(60 + 120 * (1 - k))},${k * 0.85})`;
          ctx.lineWidth = 9 * k + 0.5;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        // 内芯白光
        ctx.strokeStyle = 'rgba(255,255,255,.75)';
        for (let i = 1; i < Math.min(hist.length, 9); i++) { const k = 1 - i / 9; ctx.lineWidth = 2.6 * k; ctx.beginPath(); ctx.moveTo(hist[i - 1].x, hist[i - 1].y); ctx.lineTo(hist[i].x, hist[i].y); ctx.stroke(); }
        // 高速速度线
        if (sp > 12) {
          const px = -Math.sin(r), py = Math.cos(r);
          ctx.strokeStyle = `rgba(47,111,94,${Math.min((sp - 12) / 30, .5)})`; ctx.lineWidth = 1.4;
          [-1, 1].forEach(sg => { const ox = px * 10 * sg, oy = py * 10 * sg; ctx.beginPath(); ctx.moveTo(tx + ox, ty + oy); ctx.lineTo(tx + ox - Math.cos(r) * sp * 2.2, ty + oy - Math.sin(r) * sp * 2.2); ctx.stroke(); });
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]; p.x += p.vx; p.y += p.vy; p.vx *= .93; p.vy *= .93; p.life -= .035;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(${p.c},${p.life})`; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 * p.life + .4, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  addEventListener('pointermove', boot, { passive: true });
})();
