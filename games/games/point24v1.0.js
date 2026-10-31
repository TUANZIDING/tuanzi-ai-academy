/* 团子棋馆 · 24 点 (point24) v1.0 — 单人算牌：四张牌加减乘除凑出 24，每局 10 题 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
  root.TZGAMES = root.TZGAMES || {};

  /* ===================== 引擎：精确有理数 + 全表达式树枚举 ===================== */
  var TARGET = 24, ROUNDS = 10, PASS = 6;
  // tier：0=只用加减  1=加减乘（整数中间值）  2=需要除法（整数中间值）  3=必须走分数或负数（冷门结构）
  var LEVELS = [
    { max: 10, tiers: [0, 1], maxInter: 48, limit: 0 },  // 新手
    { max: 10, tiers: [0, 1, 2], maxInter: 0, limit: 0 }, // 入门
    { max: 13, tiers: [1, 2], maxInter: 0, limit: 60 },   // 进阶
    { max: 13, tiers: [2, 3], maxInter: 0, limit: 45, hardShare: 0.6 } // 大师：60% 的题必须走分数，其余必须用除法
  ];
  // 1–13 中“只有走分数才凑得出”的全部 16 手（求解器全表算出，测试里会复核）
  var FRACTION_ONLY = [[1, 3, 4, 6], [1, 4, 5, 6], [1, 5, 5, 5], [1, 6, 6, 8], [1, 8, 12, 12], [2, 2, 11, 11], [2, 2, 13, 13], [2, 3, 5, 12],
    [2, 4, 10, 10], [2, 5, 5, 10], [2, 7, 7, 10], [3, 3, 7, 7], [3, 3, 8, 8], [4, 4, 7, 7], [5, 5, 7, 11], [5, 7, 7, 11]];
  // 万一随机抽样在预算内没抽到（极少见），从这些已验证的手牌里挑
  var FALLBACK = [
    [[2, 3, 4, 1], [6, 6, 6, 6], [2, 2, 2, 3], [1, 2, 3, 4], [5, 5, 2, 2], [3, 3, 4, 4]],
    [[2, 4, 6, 8], [3, 3, 5, 9], [1, 4, 7, 9], [2, 2, 6, 9], [4, 5, 6, 8], [1, 2, 7, 7]],
    [[2, 6, 9, 12], [1, 5, 11, 12], [3, 6, 9, 13], [4, 6, 11, 12], [4, 7, 9, 13], [5, 8, 11, 12]],
    null // 大师用 FRACTION_ONLY
  ];
  FALLBACK[3] = FRACTION_ONLY;
  var SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function R(n, d) { if (d === undefined) d = 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return [n / g, d / g]; }
  function calc(op, a, b) {
    switch (op) {
      case '+': return R(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
      case '-': return R(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
      case '*': return R(a[0] * b[0], a[1] * b[1]);
      case '/': return b[0] === 0 ? null : R(a[0] * b[1], a[1] * b[0]);
    }
    return null;
  }
  function isInt(v, n) { return v[1] === 1 && (n === undefined || v[0] === n); }
  function rstr(v) { return v[1] === 1 ? String(v[0]) : v[0] + '/' + v[1]; }
  function rval(v) { return v[0] / v[1]; }

  function leaf(v, i) {
    v = typeof v === 'number' ? R(v) : v;
    return { leaf: true, v: v, i: i, mul: 0, div: false, frac: !isInt(v) || v[0] < 0, max: Math.abs(rval(v)) };
  }
  function node(op, l, r) {
    var v = calc(op, l.v, r.v); if (!v) return null;
    return {
      leaf: false, op: op, l: l, r: r, v: v,
      mul: l.mul + r.mul + (op === '*' ? 1 : 0),
      div: l.div || r.div || op === '/',
      frac: l.frac || r.frac || v[1] !== 1 || v[0] < 0,
      max: Math.max(l.max, r.max, Math.abs(rval(v)))
    };
  }
  function tierOf(n) { return n.frac ? 3 : n.div ? 2 : n.mul ? 1 : 0; }
  function rankOf(n) { return tierOf(n) * 100000 + Math.min(99999, Math.round(n.max)); }

  // 枚举所有表达式树：每次任取两张合成一张（含两种减法、两种除法），直到只剩一张
  function search(items, cb) {
    var n = items.length;
    if (n === 1) return isInt(items[0].v, TARGET) ? cb(items[0]) === true : false;
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var a = items[i], b = items[j], rest = [];
        for (var k = 0; k < n; k++) if (k !== i && k !== j) rest.push(items[k]);
        var same = a.v[0] === b.v[0] && a.v[1] === b.v[1];
        var cand = [node('+', a, b), node('*', a, b), node('-', a, b), same ? null : node('-', b, a), node('/', a, b), same ? null : node('/', b, a)];
        for (var c = 0; c < 6; c++) {
          if (!cand[c]) continue;
          rest.push(cand[c]);
          if (search(rest, cb)) return true;
          rest.pop();
        }
      }
    }
    return false;
  }
  // nums: 数字或有理数 [n,d]；返回 {solvable, tier, best(最简解), count}
  function analyze(nums) {
    var items = nums.map(function (x, i) { return leaf(x, i); });
    var best = null, br = Infinity, count = 0;
    search(items, function (e) { count++; var r = rankOf(e); if (r < br) { br = r; best = e; } });
    return { solvable: !!best, tier: best ? tierOf(best) : -1, best: best, count: count };
  }
  function solvable(nums) { return search(nums.map(function (x, i) { return leaf(x, i); }), function () { return true; }); }

  function prec(n) { return n.leaf ? 3 : (n.op === '+' || n.op === '-') ? 1 : 2; }
  function fmt(n) {
    if (n.leaf) return n.v[1] === 1 ? (n.v[0] < 0 ? '(' + n.v[0] + ')' : String(n.v[0])) : '(' + rstr(n.v) + ')';
    var p = prec(n), L = fmt(n.l), Rr = fmt(n.r);
    if (prec(n.l) < p) L = '(' + L + ')';
    if (prec(n.r) < p || (!n.r.leaf && prec(n.r) === p && (n.op === '-' || n.op === '/'))) Rr = '(' + Rr + ')';
    return L + SYM[n.op] + Rr;
  }
  function evalTree(n) { return n.leaf ? n.v : calc(n.op, evalTree(n.l), evalTree(n.r)); }
  function leavesOf(n, out) { out = out || []; if (n.leaf) out.push(n); else { leavesOf(n.l, out); leavesOf(n.r, out); } return out; }
  // 第一步：两个孩子都是原始牌的那个运算（最深的左侧优先）
  function firstStep(n) {
    if (!n || n.leaf) return null;
    if (n.l.leaf && n.r.leaf) return n;
    return firstStep(n.l) || firstStep(n.r);
  }
  // 从当前牌面（[{slot, v}]）找一条通向 24 的第一步；凑不出返回 null
  function hintFor(cards) {
    if (cards.length < 2) return null;
    var items = cards.map(function (c) { return leaf(c.v, c.slot); });
    var best = null, br = Infinity;
    search(items, function (e) { var r = rankOf(e); if (r < br) { br = r; best = e; } });
    if (!best) return null;
    var st = firstStep(best);
    return { a: st.l.i, b: st.r.i, op: st.op, av: st.l.v, bv: st.r.v, result: st.v, solution: best, text: '先算 ' + rstr(st.l.v) + ' ' + SYM[st.op] + ' ' + rstr(st.r.v) + ' 试试' };
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function handKey(nums) { return nums.slice().sort(function (a, b) { return a - b; }).join(','); }
  // 有没有不走分数/负数的解？（找到一个就停，用来快速淘汰“不够难”的手牌）
  function hasPlainSolution(nums) { return search(nums.map(function (x, i) { return leaf(x, i); }), function (e) { return !e.frac; }); }
  function accepts(level, a) {
    var L = LEVELS[level];
    if (!a.solvable || L.tiers.indexOf(a.tier) < 0) return false;
    if (L.maxInter && a.best.max > L.maxInter) return false;
    return true;
  }
  // opts: {rng, avoid:{key:1}, budgetMs}
  function generate(level, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random, avoid = opts.avoid || {}, budget = opts.budgetMs || 250;
    var L = LEVELS[level], t0 = now(), tries = 0;
    var needFrac = opts.needFrac != null ? !!opts.needFrac : (L.hardShare ? rng() < L.hardShare : false);
    while (tries < 20 || now() - t0 < budget) {
      tries++;
      var nums = [];
      for (var k = 0; k < 4; k++) nums.push(1 + ((rng() * L.max) | 0));
      var key = handKey(nums);
      if (avoid[key]) continue;
      if (needFrac && hasPlainSolution(nums)) continue;
      var a = analyze(nums);
      if (accepts(level, a) && (!needFrac || a.tier === 3)) return { nums: nums, key: key, tier: a.tier, solution: a.best, text: fmt(a.best), tries: tries, ms: now() - t0, source: 'gen' };
      if (tries > 5000) break;
    }
    var list = (needFrac ? FRACTION_ONLY : FALLBACK[level]).filter(function (h) { return !avoid[handKey(h)]; });
    if (!list.length) list = FALLBACK[level];
    var h = list[(rng() * list.length) | 0].slice(), b = analyze(h);
    return { nums: h, key: handKey(h), tier: b.tier, solution: b.best, text: fmt(b.best), tries: tries, ms: now() - t0, source: 'bank' };
  }
  function fmtTime(sec) { sec = Math.max(0, Math.floor(sec)); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function endResult(solved, ms) { return { winner: solved >= PASS ? 'player' : 'ai', reason: '答对 ' + solved + '/' + ROUNDS + ' · 用时 ' + fmtTime(ms / 1000) }; }

  var engine = {
    TARGET: TARGET, ROUNDS: ROUNDS, PASS: PASS, LEVELS: LEVELS, FALLBACK: FALLBACK, FRACTION_ONLY: FRACTION_ONLY, hasPlainSolution: hasPlainSolution, SYM: SYM,
    R: R, calc: calc, rstr: rstr, leaf: leaf, node: node, tierOf: tierOf, search: search, analyze: analyze, solvable: solvable,
    fmt: fmt, evalTree: evalTree, leavesOf: leavesOf, firstStep: firstStep, hintFor: hintFor,
    mulberry32: mulberry32, handKey: handKey, accepts: accepts, generate: generate, fmtTime: fmtTime, endResult: endResult
  };

  /* ===================== 视图 ===================== */
  var CSS = [
    '.p24-wrap{--cw:120px;width:var(--bw,min(92vw,560px));margin:0 auto;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;color:var(--ink,#2b2340)}',
    '.p24-info{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;font-size:13px;color:var(--muted,#7a6f86)}',
    '.p24-chip{display:inline-flex;align-items:center;gap:5px;background:var(--card,#fff);border:1px solid var(--line,#e9dcc8);border-radius:999px;padding:3px 11px;font-variant-numeric:tabular-nums}',
    '.p24-chip b{color:var(--ink,#2b2340);font-weight:700}',
    '.p24-chip.p24-warn b{color:var(--red,#e5484d)}',
    '.p24-chip:empty{display:none}',
    '.p24-dots{display:flex;justify-content:center;gap:7px;margin:0 0 10px}',
    '.p24-dot{width:11px;height:11px;border-radius:50%;background:var(--line,#e9dcc8);transition:background .2s,transform .2s}',
    '.p24-dot.p24-ok{background:var(--green,#22a06b)}',
    '.p24-dot.p24-miss{background:#f4a9ab}',
    '.p24-dot.p24-now{background:var(--yellow,#ffc53d);transform:scale(1.3);box-shadow:0 0 0 3px rgba(255,197,61,.3)}',
    '.p24-table{position:relative;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:12px;border-radius:var(--radius,18px);background:radial-gradient(120% 90% at 50% 0%,#bfe8cf 0%,#9fd8b6 60%,#8acba5 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.5),0 8px 22px rgba(40,110,70,.18),0 3px 0 #74b58f}',
    '.p24-row .p24-table{grid-template-columns:repeat(4,1fr);gap:10px}',
    '.p24-slot{position:relative;aspect-ratio:5/5.6;perspective:900px;-webkit-perspective:900px}',
    '.p24-row .p24-slot{aspect-ratio:5/7}',
    '.p24-empty{position:absolute;inset:0;border:2px dashed rgba(255,255,255,.65);border-radius:14px}',
    '.p24-card{position:absolute;inset:0;cursor:pointer;transition:transform .18s ease-out,opacity .18s ease-out;will-change:transform}',
    '.p24-inner{position:absolute;inset:0;transform-style:preserve-3d;-webkit-transform-style:preserve-3d}',
    '.p24-face{position:absolute;inset:0;border-radius:14px;-webkit-backface-visibility:hidden;backface-visibility:hidden;box-shadow:0 4px 0 rgba(43,35,64,.12),0 6px 14px rgba(43,35,64,.14)}',
    '.p24-front{background:#fffdf7;border:2px solid #efe3cf;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--ink,#2b2340);overflow:hidden;transition:box-shadow .15s}',
    '.p24-red .p24-front{color:var(--red,#e5484d)}',
    '.p24-big{font-size:calc(var(--cw)*.5);font-weight:800;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}',
    '.p24-pip{font-size:calc(var(--cw)*.2);line-height:1;margin-top:4%}',
    '.p24-sub{font-size:calc(var(--cw)*.13);line-height:1;margin-top:3%;opacity:.6;font-weight:700}',
    '.p24-corner{position:absolute;top:6%;left:8%;font-size:calc(var(--cw)*.14);line-height:1.05;text-align:center;font-weight:800}',
    '.p24-corner.p24-br{top:auto;left:auto;bottom:6%;right:8%;transform:rotate(180deg)}',
    '.p24-merged .p24-front{background:linear-gradient(160deg,#f6f0ff,#fffdf7 70%);border-color:#cdbaf6;color:#4b3f72}',
    '.p24-tag{position:absolute;top:6%;left:8%;font-size:calc(var(--cw)*.12);font-weight:700;color:#9b87d4}',
    '.p24-frac{display:inline-flex;flex-direction:column;align-items:center;font-size:calc(var(--cw)*.34);font-weight:800;line-height:1.02}',
    '.p24-frac i{font-style:normal;padding:0 .12em}',
    '.p24-frac i:first-child{border-bottom:.07em solid currentColor}',
    '.p24-neg{font-size:calc(var(--cw)*.34);font-weight:800;margin-right:.05em}',
    '.p24-fw{display:flex;align-items:center}',
    '.p24-back{transform:rotateY(180deg);background:repeating-linear-gradient(45deg,#ffb3cb 0 8px,#ffc2d6 8px 16px);border:3px solid #fff;display:flex;align-items:center;justify-content:center}',
    '.p24-tz{position:relative;width:54%;aspect-ratio:1.15/1;border-radius:50% 50% 45% 45%;background:#fff;box-shadow:0 5px 0 rgba(160,60,100,.18)}',
    '.p24-tz::before{content:"";position:absolute;top:44%;left:27%;width:calc(var(--cw)*.05);height:calc(var(--cw)*.05);border-radius:50%;background:#2b2340;box-shadow:calc(var(--cw)*.2) 0 0 #2b2340}',
    '.p24-tz::after{content:"";position:absolute;top:58%;left:15%;width:calc(var(--cw)*.08);height:calc(var(--cw)*.045);border-radius:50%;background:#ffb3c7;box-shadow:calc(var(--cw)*.3) 0 0 #ffb3c7}',
    '.p24-flip .p24-inner{animation:p24-flip .6s cubic-bezier(.2,.7,.3,1.2) both}',
    '@keyframes p24-flip{0%{transform:translateY(-14px) rotateY(180deg) scale(.85)}55%{transform:translateY(0) rotateY(180deg) scale(1)}100%{transform:rotateY(0)}}',
    '.p24-pop .p24-inner{animation:p24-pop .32s ease-out}',
    '@keyframes p24-pop{0%{transform:scale(.55)}70%{transform:scale(1.08)}100%{transform:scale(1)}}',
    '.p24-card.p24-sel{transform:translateY(-6px)}',
    '.p24-sel .p24-front{box-shadow:0 0 0 4px var(--yellow,#ffc53d),0 10px 18px rgba(43,35,64,.2)}',
    '.p24-hint .p24-front{animation:p24-glow .5s ease-in-out 4 alternate}',
    '@keyframes p24-glow{from{box-shadow:0 0 0 2px rgba(34,160,107,.35)}to{box-shadow:0 0 0 6px var(--green,#22a06b)}}',
    '.p24-shake .p24-inner{animation:p24-shake .45s ease-in-out}',
    '@keyframes p24-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px) rotate(-2deg)}40%{transform:translateX(7px) rotate(2deg)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}',
    '.p24-shake .p24-front{box-shadow:0 0 0 4px var(--red,#e5484d)}',
    '.p24-win .p24-front{box-shadow:0 0 0 5px var(--green,#22a06b),0 10px 22px rgba(34,160,107,.35)}',
    '.p24-burst{position:absolute;width:10px;height:10px;border-radius:3px;pointer-events:none;animation:p24-burst .85s ease-out forwards;z-index:3}',
    '@keyframes p24-burst{from{transform:translate(0,0) scale(1);opacity:1}to{transform:translate(var(--dx),var(--dy)) rotate(260deg) scale(.4);opacity:0}}',
    '.p24-badge{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:calc(var(--cw)*.42);font-weight:900;color:#fff;text-shadow:0 3px 0 #1b7a4f,0 6px 14px rgba(0,0,0,.2);pointer-events:none;animation:p24-badge .9s ease-out forwards;z-index:4;white-space:nowrap}',
    '@keyframes p24-badge{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}30%{transform:translate(-50%,-50%) scale(1.15);opacity:1}100%{transform:translate(-50%,-80%) scale(1);opacity:0}}',
    '.p24-hist{min-height:2.9em;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-align:center;margin:10px 0 0;font-variant-numeric:tabular-nums;word-break:break-word}',
    '.p24-steps{font-size:13px;color:var(--muted,#7a6f86);line-height:1.35}',
    '.p24-expr{font-size:17px;font-weight:800;color:var(--ink,#2b2340);line-height:1.3}',
    '.p24-expr.p24-good{color:var(--green,#22a06b)}',
    '.p24-expr.p24-bad{color:var(--red,#e5484d)}',
    '.p24-expr.p24-sol{color:#7c5cd6}',
    '.p24-ops{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}',
    '.p24-tools{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}',
    '.p24-btn{appearance:none;-webkit-appearance:none;border:1px solid var(--line,#e9dcc8);background:var(--card,#fff);border-radius:14px;min-height:56px;display:flex;align-items:center;justify-content:center;gap:6px;color:#4b3f72;font:inherit;cursor:pointer;box-shadow:0 3px 0 #eadfce;touch-action:manipulation;transition:transform .08s,background .15s,box-shadow .15s}',
    '.p24-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #eadfce}',
    '.p24-op{font-size:30px;font-weight:800;line-height:1}',
    '.p24-tool{min-height:46px;font-size:15px;font-weight:700;color:var(--ink,#2b2340)}',
    '.p24-tool b{font-size:18px}',
    '.p24-op.p24-on{background:var(--purple,#8b5cf6);border-color:var(--purple,#8b5cf6);color:#fff;box-shadow:0 3px 0 #6d43d6}',
    '.p24-btn.p24-hintop{animation:p24-glow .5s ease-in-out 4 alternate;background:#e3f7ea}',
    '.p24-ops.p24-wait .p24-btn,.p24-tools.p24-wait .p24-btn{opacity:.45}',
    '.p24-demo .p24-ops,.p24-demo .p24-tools,.p24-demo .p24-table{pointer-events:none}'
  ].join('\n');
  function injectCss() {
    if (typeof document === 'undefined') return;
    if (document.querySelector('style[data-p24-css]')) return;
    var st = document.createElement('style');
    st.setAttribute('data-p24-css', '1');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function div(cls, parent) { var e = document.createElement('div'); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function span(cls, txt, parent) { var e = document.createElement('span'); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (parent) parent.appendChild(e); return e; }

  var SUITS = ['♠', '♥', '♣', '♦'];
  var RANK = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  function randomSuits(rng) { rng = rng || Math.random; var s = []; for (var i = 0; i < 4; i++) s.push((rng() * 4) | 0); return s; }

  // 牌桌：牌面状态 + 渲染 + 合成/撤销（对局和演示共用）
  function createTable(el, demo) {
    injectCss();
    el.innerHTML = '';
    var wrap = div('p24-wrap' + (demo ? ' p24-demo' : ''), el);
    var info = div('p24-info', wrap);
    var chipLv = div('p24-chip', info), chipRd = div('p24-chip', info), chipOk = div('p24-chip', info), chipT = div('p24-chip', info);
    var dotsEl = div('p24-dots', wrap), dots = [];
    for (var d = 0; d < ROUNDS; d++) dots.push(div('p24-dot', dotsEl));
    var table = div('p24-table', wrap), slots = [];
    for (var s = 0; s < 4; s++) { var sl = div('p24-slot', table); sl.setAttribute('data-s', s); slots.push(sl); }
    var hist = div('p24-hist', wrap), stepsEl = div('p24-steps', hist), exprEl = div('p24-expr', hist);
    var opsEl = div('p24-ops', wrap), opBtns = {};
    ['+', '-', '*', '/'].forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'p24-btn p24-op'; b.setAttribute('data-op', o);
      b.setAttribute('aria-label', { '+': '加', '-': '减', '*': '乘', '/': '除' }[o]); b.textContent = SYM[o];
      opsEl.appendChild(b); opBtns[o] = b;
    });
    var toolsEl = div('p24-tools', wrap), toolBtns = {};
    [['undo', '↶', '撤一步'], ['skip', '⏭', '跳过']].forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'p24-btn p24-tool'; b.setAttribute('data-t', t[0]);
      var bb = document.createElement('b'); bb.textContent = t[1]; b.appendChild(bb); span('', t[2], b);
      toolsEl.appendChild(b); toolBtns[t[0]] = b;
    });

    var st = { cards: [null, null, null, null], sel: -1, op: null, stack: [], steps: [], hint: null };

    function layout() {
      var w = wrap.clientWidth;
      if (!w && typeof window !== 'undefined') w = Math.min((window.innerWidth || 390) * 0.92, 560);
      var row = w >= 520, gap = row ? 10 : 12, cw = row ? (w - 24 - 3 * gap) / 4 : (w - 24 - gap) / 2;
      wrap.classList.toggle('p24-row', row);
      wrap.style.setProperty('--cw', Math.max(60, cw).toFixed(1) + 'px');
    }
    var ro = null, onWinResize = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(layout); ro.observe(wrap); }
    else if (typeof window !== 'undefined' && window.addEventListener) { onWinResize = layout; window.addEventListener('resize', onWinResize); }
    layout();

    function valueFace(front, v) {
      if (v[1] === 1) { span('p24-big', String(v[0]), front); return; }
      var fw = div('p24-fw', front), fr = span('p24-frac', null, null);
      if (v[0] < 0) span('p24-neg', '−', fw);
      var a = document.createElement('i'); a.textContent = String(Math.abs(v[0]));
      var b = document.createElement('i'); b.textContent = String(v[1]);
      fr.appendChild(a); fr.appendChild(b); fw.appendChild(fr);
    }
    function buildCard(c, i, fx) {
      var cls = 'p24-card' + (c.merged ? ' p24-merged' : '') + (c.red && !c.merged ? ' p24-red' : '');
      if (st.sel === i) cls += ' p24-sel';
      if (st.hint && (st.hint.a === i || st.hint.b === i)) cls += ' p24-hint';
      if (fx.flip) cls += ' p24-flip';
      if (fx.pop === i) cls += ' p24-pop';
      if (fx.shake === i) cls += ' p24-shake';
      if (fx.win === i) cls += ' p24-win';
      var card = div(cls), inner = div('p24-inner', card), front = div('p24-face p24-front', inner), back = div('p24-face p24-back', inner);
      div('p24-tz', back);
      if (fx.flip) inner.style.animationDelay = (i * 90) + 'ms';
      if (c.merged) {
        span('p24-tag', '团', front);
        valueFace(front, c.v);
      } else {
        var rk = RANK[c.rank] || String(c.rank), suit = SUITS[c.suit];
        var tl = div('p24-corner', front); tl.innerHTML = ''; span('', rk, tl); tl.appendChild(document.createElement('br')); span('', suit, tl);
        var br = div('p24-corner p24-br', front); span('', rk, br); br.appendChild(document.createElement('br')); span('', suit, br);
        if (c.rank > 10) { span('p24-big', rk, front); span('p24-sub', '= ' + c.rank, front); }
        else { span('p24-big', String(c.rank), front); span('p24-pip', suit, front); }
      }
      return card;
    }

    var api = {
      wrap: wrap, table: table, slots: slots, opsEl: opsEl, toolsEl: toolsEl, opBtns: opBtns, toolBtns: toolBtns, st: st, layout: layout,
      deal: function (nums, suits) {
        for (var i = 0; i < 4; i++) {
          var n = nums[i];
          st.cards[i] = { v: R(n), e: leaf(n, i), rank: n, suit: suits[i], red: suits[i] === 1 || suits[i] === 3, merged: false };
        }
        st.sel = -1; st.op = null; st.stack = []; st.steps = []; st.hint = null;
      },
      alive: function () { var r = []; for (var i = 0; i < 4; i++) if (st.cards[i]) r.push(i); return r; },
      // a op b → 新牌放在 b 的位置。返回新牌，除以 0 返回 null
      merge: function (a, op, b) {
        var ca = st.cards[a], cb = st.cards[b], v = calc(op, ca.v, cb.v);
        if (!v) return null;
        st.stack.push({ cards: st.cards.slice(), steps: st.steps.slice() });
        var e = node(op, ca.e, cb.e);
        var nc = { v: v, e: e, merged: true };
        st.cards[b] = nc; st.cards[a] = null;
        st.steps.push(rstr(ca.v) + ' ' + SYM[op] + ' ' + rstr(cb.v) + ' = ' + rstr(v));
        st.sel = -1; st.op = null; st.hint = null;
        return nc;
      },
      undo: function () {
        if (!st.stack.length) return false;
        var s = st.stack.pop(); st.cards = s.cards; st.steps = s.steps; st.sel = -1; st.op = null; st.hint = null;
        return true;
      },
      resetRound: function () { if (st.stack.length) { var s = st.stack[0]; st.stack = []; st.cards = s.cards; st.steps = s.steps; } st.sel = -1; st.op = null; st.hint = null; },
      render: function (fx) {
        fx = fx || {};
        for (var i = 0; i < 4; i++) {
          var sl = slots[i]; sl.innerHTML = '';
          if (st.cards[i]) sl.appendChild(buildCard(st.cards[i], i, fx)); else div('p24-empty', sl);
        }
        for (var o in opBtns) {
          opBtns[o].classList.toggle('p24-on', st.op === o);
          opBtns[o].classList.toggle('p24-hintop', !!(st.hint && st.hint.op === o));
        }
        api.renderHist(fx.exprText, fx.exprCls);
      },
      renderHist: function (exprText, exprCls) {
        stepsEl.textContent = st.steps.join('  →  ');
        var txt = exprText, cls = exprCls || '';
        if (txt == null) {
          // 最近合成的那张牌的完整算式
          var last = null;
          for (var i = 0; i < 4; i++) { var c = st.cards[i]; if (c && c.merged && (!last || leavesOf(c.e).length > leavesOf(last.e).length)) last = c; }
          txt = last ? fmt(last.e) + ' = ' + rstr(last.v) : (demo ? '' : '每张牌用一次，凑出 24');
          if (!last) cls = 'p24-steps';
        }
        exprEl.textContent = txt;
        exprEl.className = 'p24-expr' + (cls ? ' ' + cls : '');
      },
      cardEl: function (i) { return slots[i].firstChild; },
      // 合成动画：a 飞向 b，结束后回调
      animateMerge: function (a, b, cb) {
        var ea = slots[a].firstChild;
        try {
          var ra = slots[a].getBoundingClientRect(), rb = slots[b].getBoundingClientRect();
          if (ea && ea.classList.contains('p24-card')) {
            ea.style.zIndex = 2;
            ea.style.transform = 'translate(' + (rb.left - ra.left) + 'px,' + (rb.top - ra.top) + 'px) scale(.7)';
            ea.style.opacity = '.25';
          }
        } catch (e) { /* 忽略 */ }
        return setTimeout(cb, 190);
      },
      burst: function (i) {
        var sl = slots[i], x = sl.offsetLeft + sl.offsetWidth / 2, y = sl.offsetTop + sl.offsetHeight / 2;
        var cols = ['#e5484d', '#ffc53d', '#22a06b', '#3b82f6', '#8b5cf6', '#ff8a3d'], made = [];
        for (var k = 0; k < 16; k++) {
          var p = span('p24-burst', null, table), ang = (k / 16) * Math.PI * 2 + Math.random() * 0.4, dist = 70 + Math.random() * 70;
          p.style.left = (x - 5) + 'px'; p.style.top = (y - 5) + 'px'; p.style.background = cols[k % 6];
          p.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px'); p.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(0) + 'px');
          made.push(p);
        }
        var bd = span('p24-badge', '24!', table); bd.style.left = x + 'px'; bd.style.top = y + 'px'; made.push(bd);
        return setTimeout(function () { made.forEach(function (m) { if (m.parentNode) m.parentNode.removeChild(m); }); }, 950);
      },
      setInfo: function (lv, rd, ok, t, warn) {
        chipLv.innerHTML = lv ? '<b>' + lv + '</b>' : '';
        chipRd.innerHTML = rd ? rd : '';
        chipOk.innerHTML = ok ? ok : '';
        chipT.innerHTML = t ? t : '';
        chipT.classList.toggle('p24-warn', !!warn);
      },
      setDots: function (results, cur) {
        for (var i = 0; i < ROUNDS; i++) {
          var r = results[i];
          dots[i].className = 'p24-dot' + (r === 'ok' ? ' p24-ok' : r === 'miss' ? ' p24-miss' : '') + (i === cur && !r ? ' p24-now' : '');
        }
      },
      setWait: function (on) { opsEl.classList.toggle('p24-wait', on); toolsEl.classList.toggle('p24-wait', on); },
      destroy: function () { if (ro) ro.disconnect(); if (onWinResize) window.removeEventListener('resize', onWinResize); }
    };
    return api;
  }

  /* ===================== 对局 ===================== */
  function mount(el, opts) {
    opts = opts || {};
    var level = Math.max(0, Math.min(3, opts.level | 0)), cfg = LEVELS[level];
    var onStatus = opts.onStatus || function () {}, onEnd = opts.onEnd || function () {}, snd = opts.sound || function () {};
    var T = createTable(el, false), st = T.st;
    var round, results, solved, elapsed, roundMs, phase, hand, seen, lastTick, timers = [], tick = null, dead = false, hintTimer = null;
    var LVNAME = ['新手', '入门', '进阶', '大师'];

    function later(fn, ms) { var t = setTimeout(function () { var k = timers.indexOf(t); if (k >= 0) timers.splice(k, 1); if (!dead) fn(); }, ms); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; if (tick) { clearInterval(tick); tick = null; } hintTimer = null; }
    function hidden() { return typeof document !== 'undefined' && document.hidden; }
    function updInfo() {
      var left = cfg.limit ? Math.max(0, Math.ceil(cfg.limit - roundMs / 1000)) : 0;
      T.setInfo(LVNAME[level], '第 <b>' + Math.max(1, round) + '</b>/' + ROUNDS + ' 题', '答对 <b>' + solved + '</b>',
        cfg.limit ? '⏳ <b>' + left + 's</b>' : '⏱ <b>' + fmtTime(elapsed / 1000) + '</b>', cfg.limit && left <= 10 && phase === 'play');
      T.setDots(results, round - 1);
    }
    function draw(fx) { T.render(fx); updInfo(); }

    function startSession() {
      clearTimers();
      round = 0; results = []; solved = 0; elapsed = 0; roundMs = 0; phase = 'deal'; seen = {};
      lastTick = now();
      tick = setInterval(function () {
        var t = now(), dt = Math.min(t - lastTick, 1000); lastTick = t;
        if (hidden() || phase === 'end') return;
        elapsed += dt;
        if (phase === 'play' && cfg.limit) {
          roundMs += dt;
          if (roundMs >= cfg.limit * 1000) { reveal('timeout'); return; }
        }
        updInfo();
      }, 250);
      nextRound();
    }
    function nextRound() {
      if (round >= ROUNDS) { finish(); return; }
      round++; roundMs = 0; phase = 'deal';
      hand = generate(level, { avoid: seen }); seen[hand.key] = 1;
      T.deal(hand.nums, randomSuits());
      T.setWait(true);
      draw({ flip: true });
      onStatus('第 ' + round + '/' + ROUNDS + ' 题 · 发牌…');
      later(function () {
        phase = 'play'; T.setWait(false); draw();
        onStatus('第 ' + round + '/' + ROUNDS + ' 题 · 点一张牌，再点运算' + (cfg.limit ? ' · 限时 ' + cfg.limit + ' 秒' : ''));
      }, 700);
    }
    function clearHint() { if (st.hint) { st.hint = null; } }
    function tapCard(i) {
      if (phase !== 'play' || !st.cards[i]) return;
      clearHint();
      if (st.sel < 0) { st.sel = i; snd('select'); onStatus('已选 ' + rstr(st.cards[i].v) + ' · 再点 + − × ÷'); }
      else if (st.sel === i) { st.sel = -1; st.op = null; snd('select'); onStatus('已取消选择'); }
      else if (st.op) { doMerge(st.sel, st.op, i); return; }
      else { st.sel = i; snd('select'); onStatus('已选 ' + rstr(st.cards[i].v) + ' · 再点 + − × ÷'); }
      draw();
    }
    function tapOp(op) {
      if (phase !== 'play') return;
      clearHint();
      if (st.sel < 0) { snd('illegal'); onStatus('先点一张牌，再选运算'); draw(); return; }
      st.op = st.op === op ? null : op; snd('select');
      if (st.op) onStatus(rstr(st.cards[st.sel].v) + ' ' + SYM[op] + ' ？ · 点另一张牌');
      draw();
    }
    function doMerge(a, op, b) {
      var cb = st.cards[b];
      if (op === '/' && cb.v[0] === 0) { snd('illegal'); onStatus('不能除以 0，换一张牌'); draw({ shake: b }); return; }
      phase = 'anim';
      T.animateMerge(a, b, function () {
        if (dead || phase !== 'anim') return;
        var nc = T.merge(a, op, b);
        snd('move');
        var alive = T.alive();
        if (alive.length > 1) {
          phase = 'play';
          draw({ pop: b });
          onStatus('得到 ' + rstr(nc.v) + ' · 还剩 ' + alive.length + ' 张，继续');
          return;
        }
        if (isInt(nc.v, TARGET)) success(b);
        else {
          phase = 'play';
          draw({ shake: b, exprCls: 'p24-bad', exprText: fmt(nc.e) + ' = ' + rstr(nc.v) + ' ≠ 24' });
          snd('illegal');
          onStatus('= ' + rstr(nc.v) + '，不是 24 · 点「撤一步」再试');
        }
      });
    }
    function success(i) {
      phase = 'done'; results[round - 1] = 'ok'; solved++;
      var c = st.cards[i];
      draw({ pop: i, win: i, exprCls: 'p24-good', exprText: fmt(c.e) + ' = 24' });
      T.burst(i); snd('capture');
      onStatus('漂亮！' + fmt(c.e) + ' = 24');
      later(nextRound, 1400);
    }
    function reveal(kind) {
      if (phase !== 'play' && phase !== 'anim') return;
      phase = 'done'; results[round - 1] = 'miss';
      T.resetRound(); T.setWait(true);
      var sol = hand.text + ' = 24';
      draw({ exprCls: 'p24-sol', exprText: '一种解法：' + sol });
      snd(kind === 'timeout' ? 'illegal' : 'select');
      onStatus((kind === 'timeout' ? '时间到！' : '跳过 · ') + '一种解法：' + sol);
      later(nextRound, 2800);
    }
    function finish() {
      phase = 'end'; T.setWait(true);
      var res = endResult(solved, elapsed);
      updInfo(); T.setDots(results, -1);
      onStatus('10 题完成 · ' + res.reason);
      later(function () { onEnd(res); }, 400);
    }
    function undo() {
      if (phase !== 'play') return;
      if (!T.undo()) { onStatus('这一题还没合成过牌'); return; }
      draw(); onStatus('已撤回一步 · 还剩 ' + T.alive().length + ' 张');
    }
    function hint() {
      if (phase !== 'play') return;
      var cards = T.alive().map(function (i) { return { slot: i, v: st.cards[i].v }; });
      var h = hintFor(cards);
      if (!h) {
        st.sel = -1; st.op = null; draw();
        var ub = T.toolBtns.undo; ub.classList.add('p24-hintop');
        later(function () { ub.classList.remove('p24-hintop'); }, 2000);
        onStatus(st.stack.length ? '现在这几张凑不出 24 了，先点「撤一步」' : '这一手凑不出 24？点「跳过」看解法');
        return;
      }
      st.sel = -1; st.op = null; st.hint = { a: h.a, b: h.b, op: h.op };
      draw(); snd('select');
      onStatus(h.text);
      var mark = st.hint;
      later(function () { if (st.hint === mark) { st.hint = null; if (phase === 'play') draw(); } }, 2200);
    }

    function onTable(e) {
      var s = e.target.closest ? e.target.closest('.p24-slot') : null; if (!s) return;
      if (e.cancelable) e.preventDefault();
      tapCard(+s.getAttribute('data-s'));
    }
    function onOps(e) { var b = e.target.closest ? e.target.closest('[data-op]') : null; if (b) tapOp(b.getAttribute('data-op')); }
    function onTools(e) {
      var b = e.target.closest ? e.target.closest('[data-t]') : null; if (!b) return;
      if (b.getAttribute('data-t') === 'undo') undo(); else reveal('skip');
    }
    var KEYOP = { '+': '+', '=': '+', '-': '-', '_': '-', '*': '*', 'x': '*', 'X': '*', '/': '/', '÷': '/' };
    function onKey(e) {
      if (!el.isConnected || dead) return;
      var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k >= '1' && k <= '4' && k.length === 1) { tapCard(+k - 1); e.preventDefault(); }
      else if (KEYOP[k]) { tapOp(KEYOP[k]); e.preventDefault(); }
      else if (k === 'Backspace' || k === 'Delete') { undo(); e.preventDefault(); }
      else if (k === 'Escape') { if (phase === 'play') { st.sel = -1; st.op = null; draw(); } }
    }
    T.table.addEventListener('pointerdown', onTable);
    T.opsEl.addEventListener('click', onOps);
    T.toolsEl.addEventListener('click', onTools);
    document.addEventListener('keydown', onKey);
    startSession();

    return {
      undo: undo,
      hint: hint,
      restart: function () { startSession(); },
      destroy: function () {
        dead = true; clearTimers();
        T.table.removeEventListener('pointerdown', onTable);
        T.opsEl.removeEventListener('click', onOps);
        T.toolsEl.removeEventListener('click', onTools);
        document.removeEventListener('keydown', onKey);
        T.destroy();
        el.innerHTML = '';
      },
      _state: function () { return { round: round, solved: solved, phase: phase, results: results.slice(), hand: hand, elapsed: elapsed, cards: T.alive().map(function (i) { return { slot: i, v: st.cards[i].v }; }) }; }
    };
  }

  /* ===================== 规则演示 ===================== */
  function demo(el, opts) {
    opts = opts || {};
    var cap = opts.onCaption || function () {}, done = opts.onDone || function () {};
    var T = createTable(el, true), st = T.st, timers = [], stopped = false;
    T.setInfo('规则演示', '', '', '');
    T.setDots([], -1);
    function at(ms, fn) { timers.push(setTimeout(function () { if (!stopped) fn(); }, ms)); }
    function deal(nums, suits) { T.deal(nums, suits); T.render({ flip: true }); }
    function sel(i) { st.sel = i; st.op = null; T.render(); }
    function op(o) { st.op = o; T.render(); }
    function merge(a, o, b, after) {
      T.animateMerge(a, b, function () {
        if (stopped) return;
        var nc = T.merge(a, o, b);
        if (T.alive().length === 1 && isInt(nc.v, TARGET)) { T.render({ pop: b, win: b, exprCls: 'p24-good', exprText: fmt(nc.e) + ' = 24' }); T.burst(b); }
        else if (T.alive().length === 1) T.render({ shake: b, exprCls: 'p24-bad', exprText: fmt(nc.e) + ' = ' + rstr(nc.v) + ' ≠ 24' });
        else T.render({ pop: b });
        if (after) after();
      });
    }
    // 一步合成的脚本：选 a → 选运算 → 点 b → 合成，共约 1.3 s
    function play(t0, a, o, b) { at(t0, function () { sel(a); }); at(t0 + 400, function () { op(o); }); at(t0 + 800, function () { merge(a, o, b); }); }

    var steps = [
      [3000, function (t) {
        cap('目标：四张牌每张用一次，加减乘除凑出 24');
        deal([1, 2, 3, 4], [0, 1, 2, 3]);
        at(1400, function () { st.hint = { a: 0, b: 1, op: null }; T.render(); });
        at(2000, function () { st.hint = { a: 2, b: 3, op: null }; T.render(); });
      }],
      [2600, function (t) {
        st.hint = null; T.render();
        cap('先点一张牌，再点运算符号，比如 1 ＋');
        at(500, function () { sel(0); });
        at(1300, function () { op('+'); });
      }],
      [4200, function (t) {
        cap('再点第二张：两张合成一张新牌，一直合到只剩一张');
        at(300, function () { merge(0, '+', 1); });
        play(1200, 1, '+', 2);
        play(2600, 2, '*', 3);
      }],
      [4300, function (t) {
        cap('分数也可以：1 ÷ 5 = 1/5，5 − 1/5，再 × 5');
        deal([1, 5, 5, 5], [3, 0, 1, 2]);
        play(800, 0, '/', 1);
        play(2000, 2, '-', 1);
        play(3000, 1, '*', 3);
      }],
      [4800, function (t) {
        cap('算错了？卡住就点「撤一步」，退回去换条路');
        deal([3, 8, 8, 3], [0, 1, 2, 3]);
        play(500, 1, '+', 2);
        play(1400, 0, '+', 2);
        play(2300, 2, '+', 3);
        at(3500, function () { T.toolBtns.undo.classList.add('p24-hintop'); T.undo(); T.render(); });
        at(3900, function () { T.undo(); T.render(); });
        at(4300, function () { T.undo(); T.render(); });
      }],
      [5200, function (t) {
        T.toolBtns.undo.classList.remove('p24-hintop');
        cap('示例 3 8 8 3 → 8 ÷ (3 − 8 ÷ 3) = 24');
        deal([3, 8, 8, 3], [1, 0, 3, 2]);
        play(800, 2, '/', 3);
        play(2100, 0, '-', 3);
        play(3300, 1, '/', 3);
      }]
    ];
    var t = 0;
    steps.forEach(function (s) { var t0 = t; at(t0, function () { s[1](t0); }); t += s[0]; });
    at(t, function () { st.hint = null; T.render(); done(); });
    T.deal([1, 2, 3, 4], [0, 1, 2, 3]); st.cards = [null, null, null, null]; T.render();
    return { stop: function () { stopped = true; timers.forEach(clearTimeout); timers = []; T.destroy(); } };
  }

  root.TZGAMES.point24 = {
    id: 'point24', name: '24 点', tagline: '四张牌，加减乘除凑出 24',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['单人'],
    mount: mount,
    demo: demo,
    _engine: engine
  };
})();
