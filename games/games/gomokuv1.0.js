/* 团子棋馆 · 五子棋 (gomoku) v1.0 — 自由规则 15×15，五连及以上即胜 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
  root.TZGAMES = root.TZGAMES || {};

  /* ===================== 引擎 ===================== */
  var N = 15, SZ = N * N, CENTER = 7 * N + 7;
  var DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  var WIN = 1e9;
  var S_FIVE = 1e7, S_FOURWIN = 2e5, S_FOURTHREE = 1e5, S_DOUBLETHREE = 5e4;
  var COLS = 'ABCDEFGHIJKLMNO';

  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function inb(x, y) { return x >= 0 && y >= 0 && x < N && y < N; }
  function I(x, y) { return y * N + x; }
  function newBoard() { return new Int8Array(SZ); }
  function coordName(i) { return COLS[i % N] + (N - ((i / N) | 0)); }

  // 经过 i 的同色连线（i 视作 color，不读取 b[i]）
  function lineCells(b, i, color, dx, dy) {
    var x = i % N, y = (i / N) | 0, cells = [i], xx, yy;
    xx = x + dx; yy = y + dy;
    while (inb(xx, yy) && b[yy * N + xx] === color) { cells.push(yy * N + xx); xx += dx; yy += dy; }
    xx = x - dx; yy = y - dy;
    while (inb(xx, yy) && b[yy * N + xx] === color) { cells.unshift(yy * N + xx); xx -= dx; yy -= dy; }
    return cells;
  }
  function checkWin(b, i) {
    var c = b[i]; if (!c) return null;
    for (var d = 0; d < 4; d++) {
      var cells = lineCells(b, i, c, DIRS[d][0], DIRS[d][1]);
      if (cells.length >= 5) return cells;
    }
    return null;
  }
  function makesFive(b, i, color) {
    for (var d = 0; d < 4; d++) if (lineCells(b, i, color, DIRS[d][0], DIRS[d][1]).length >= 5) return true;
    return false;
  }
  function isFull(b) { for (var i = 0; i < SZ; i++) if (!b[i]) return false; return true; }
  function legalMoves(b) { var r = []; for (var i = 0; i < SZ; i++) if (!b[i]) r.push(i); return r; }

  /* —— 棋型：9 格窗口（中心为落子点），1=己 0=空 2=敌/边 —— */
  // 0 无, 1 活二, 2 眠三, 3 活三, 4 冲四, 5 活四, 6 五连
  var PAT = [
    [6, ['11111']],
    [5, ['011110']],
    [4, ['11110', '01111', '11011', '10111', '11101']],
    [3, ['001110', '011100', '011010', '010110']],
    [2, ['01110', '11100', '00111', '11010', '01011', '10110', '01101', '11001', '10011', '10101']],
    [1, ['00110', '01100', '01010', '010010']]
  ];
  function classify(s) {
    for (var a = 0; a < PAT.length; a++) {
      var pats = PAT[a][1];
      for (var p = 0; p < pats.length; p++) {
        var pt = pats[p], L = pt.length;
        for (var st = Math.max(0, 4 - L + 1); st <= Math.min(4, 9 - L); st++) {
          if (pt.charAt(4 - st) === '1' && s.substr(st, L) === pt) return PAT[a][0];
        }
      }
    }
    return 0;
  }
  var SHAPE = new Int8Array(19683);
  (function () {
    for (var k = 0; k < 19683; k++) {
      var s = '', v = k;
      for (var j = 0; j < 9; j++) { s = (v % 3) + s; v = (v / 3) | 0; }
      if (s.charAt(4) === '1') SHAPE[k] = classify(s);
    }
  })();
  function dirKey(b, i, color, dx, dy) {
    var x = i % N, y = (i / N) | 0, key = 0;
    for (var k = -4; k <= 4; k++) {
      var d;
      if (k === 0) d = 1;
      else {
        var xx = x + k * dx, yy = y + k * dy;
        if (!inb(xx, yy)) d = 2;
        else { var v = b[yy * N + xx]; d = v === 0 ? 0 : (v === color ? 1 : 2); }
      }
      key = key * 3 + d;
    }
    return key;
  }
  function shapes(b, i, color) {
    var c = [0, 0, 0, 0, 0, 0, 0];
    for (var d = 0; d < 4; d++) c[SHAPE[dirKey(b, i, color, DIRS[d][0], DIRS[d][1])]]++;
    return c;
  }
  function scoreCounts(c) {
    if (c[6]) return S_FIVE;
    if (c[5] || c[4] >= 2) return S_FOURWIN;
    if (c[4] && c[3]) return S_FOURTHREE;
    if (c[3] >= 2) return S_DOUBLETHREE;
    return c[4] * 900 + c[3] * 1000 + c[2] * 150 + c[1] * 100 + 1;
  }
  function pointScore(b, i, color) { return scoreCounts(shapes(b, i, color)); }

  function candidates(b, dist) {
    dist = dist || 2;
    var res = [], any = false;
    for (var i = 0; i < SZ; i++) {
      if (b[i]) { any = true; continue; }
      var x = i % N, y = (i / N) | 0, ok = false;
      for (var dy = -dist; dy <= dist && !ok; dy++) for (var dx = -dist; dx <= dist; dx++) {
        var xx = x + dx, yy = y + dy;
        if (inb(xx, yy) && b[yy * N + xx]) { ok = true; break; }
      }
      if (ok) res.push(i);
    }
    if (!any) return [CENTER];
    if (!res.length) return legalMoves(b);
    return res;
  }
  function centerBias(i) { var x = i % N, y = (i / N) | 0; return (14 - Math.abs(x - 7) - Math.abs(y - 7)) * 0.5; }

  /* —— 全盘静态评估（按线缓存） —— */
  var LINES = (function () {
    var L = [], x, y, k, a;
    for (y = 0; y < N; y++) { a = []; for (x = 0; x < N; x++) a.push(I(x, y)); L.push(a); }
    for (x = 0; x < N; x++) { a = []; for (y = 0; y < N; y++) a.push(I(x, y)); L.push(a); }
    for (k = -(N - 5); k <= N - 5; k++) { // x - y = k
      a = []; for (y = 0; y < N; y++) { x = y + k; if (inb(x, y)) a.push(I(x, y)); } L.push(a);
    }
    for (k = 4; k <= 2 * N - 6; k++) { // x + y = k
      a = []; for (y = 0; y < N; y++) { x = k - y; if (inb(x, y)) a.push(I(x, y)); } L.push(a);
    }
    return L;
  })();
  var LP = [['11111', 1e6], ['011110', 5e4], ['11110', 2500], ['01111', 2500], ['11011', 2500], ['10111', 2500], ['11101', 2500],
    ['001110', 2000], ['011100', 2000], ['011010', 2000], ['010110', 2000],
    ['11100', 200], ['00111', 200], ['11010', 200], ['01011', 200], ['10110', 200], ['01101', 200], ['11001', 150], ['10011', 150], ['10101', 150],
    ['001100', 120], ['01010', 100], ['010010', 80]];
  var LINE_MEMO = new Map();
  function countPat(s, p) { var n = 0, k = s.indexOf(p); while (k >= 0) { n++; k = s.indexOf(p, k + 1); } return n; }
  function lineScore(str) {
    var v = LINE_MEMO.get(str); if (v) return v;
    v = [0, 0, 0];
    for (var c = 1; c <= 2; c++) {
      var t = '2';
      for (var j = 0; j < str.length; j++) { var ch = str.charCodeAt(j) - 48; t += ch === 0 ? '0' : (ch === c ? '1' : '2'); }
      t += '2';
      var sc = 0;
      if (t.indexOf('1') >= 0) for (var p = 0; p < LP.length; p++) sc += countPat(t, LP[p][0]) * LP[p][1];
      v[c] = sc;
    }
    if (LINE_MEMO.size > 200000) LINE_MEMO.clear();
    LINE_MEMO.set(str, v);
    return v;
  }
  function evaluate(b, color) {
    var s1 = 0, s2 = 0;
    for (var l = 0; l < LINES.length; l++) {
      var a = LINES[l], str = '', has = false;
      for (var j = 0; j < a.length; j++) { var v = b[a[j]]; if (v) has = true; str += v; }
      if (!has) continue;
      var r = lineScore(str); s1 += r[1]; s2 += r[2];
    }
    return color === 1 ? s1 * 1.1 - s2 : s2 * 1.1 - s1;
  }

  /* —— 搜索 —— */
  var TIMEOUT = { t: 1 };
  function search(b, color, depth, alpha, beta, ctx, ply) {
    ctx.nodes++;
    if ((ctx.nodes & 31) === 0 && now() > ctx.deadline) throw TIMEOUT;
    var opp = 3 - color, cands = candidates(b), list = [], oppFive = [], maxA = 0;
    for (var k = 0; k < cands.length; k++) {
      var i = cands[k], a = pointScore(b, i, color);
      if (a >= S_FIVE) return WIN - ply;
      var d = pointScore(b, i, opp);
      if (d >= S_FIVE) oppFive.push(i);
      if (a > maxA) maxA = a;
      list.push({ i: i, s: a + d * 0.85 });
    }
    if (oppFive.length >= 2) return -(WIN - ply - 1);
    if (!oppFive.length && maxA >= S_FOURWIN) return WIN - ply - 2;
    if (depth <= 0) return evaluate(b, color);
    var moves;
    if (oppFive.length === 1) moves = [oppFive[0]];
    else {
      list.sort(function (p, q) { return q.s - p.s; });
      moves = []; for (k = 0; k < list.length && k < ctx.topN; k++) moves.push(list[k].i);
    }
    var best = -2 * WIN;
    for (k = 0; k < moves.length; k++) {
      var m = moves[k];
      b[m] = color;
      var v = -search(b, opp, depth - 1, -beta, -alpha, ctx, ply + 1);
      b[m] = 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    if (!moves.length) return 0;
    return best;
  }

  function fivePointsAround(b, color, at) {
    var res = [], x = at % N, y = (at / N) | 0;
    for (var d = 0; d < 4; d++) for (var k = -4; k <= 4; k++) {
      var xx = x + k * DIRS[d][0], yy = y + k * DIRS[d][1];
      if (!inb(xx, yy)) continue;
      var j = yy * N + xx;
      if (!b[j] && res.indexOf(j) < 0 && makesFive(b, j, color)) res.push(j);
    }
    return res;
  }
  // 连续冲四取胜（VCF）。调用前须保证对方没有立即成五的点。
  function vcf(b, color, depth, ctx) {
    if (depth <= 0 || ctx.to) return null;
    if ((++ctx.nodes & 15) === 0 && now() > ctx.deadline) { ctx.to = true; return null; }
    var opp = 3 - color, cands = candidates(b), fours = [];
    for (var k = 0; k < cands.length; k++) {
      var i = cands[k], sh = shapes(b, i, color);
      if (sh[6]) return [i];
      if (sh[5] || sh[4]) fours.push({ i: i, s: sh[5] * 10 + sh[4] * 3 + sh[3] * 2 + sh[2] });
    }
    fours.sort(function (p, q) { return q.s - p.s; });
    for (k = 0; k < fours.length; k++) {
      var f = fours[k].i, r = null;
      b[f] = color;
      var fp = fivePointsAround(b, color, f);
      if (fp.length >= 2) { b[f] = 0; return [f]; }
      if (fp.length === 1) {
        var blk = fp[0];
        b[blk] = opp;
        if (!fivePointsAround(b, opp, blk).length) r = vcf(b, color, depth - 1, ctx);
        b[blk] = 0;
      }
      b[f] = 0;
      if (r) return [f].concat(r);
      if (ctx.to) return null;
    }
    return null;
  }
  function hasThreat(b, color, thr) {
    var c = candidates(b);
    for (var k = 0; k < c.length; k++) if (pointScore(b, c[k], color) >= thr) return true;
    return false;
  }

  // 主入口：返回落子下标
  function chooseMove(board, color, level, opt) {
    opt = opt || {};
    var rng = opt.rng || Math.random;
    var t0 = now(), budget = opt.time || 1000;
    var b = board.slice ? board.slice() : Int8Array.from(board);
    var opp = 3 - color, stones = 0;
    for (var q = 0; q < SZ; q++) if (b[q]) stones++;
    if (!stones) {
      if (level === 0) { var off = [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0]][Math.floor(rng() * 5)]; return I(7 + off[0], 7 + off[1]); }
      return CENTER;
    }
    var cands = candidates(b), info = [];
    for (var k = 0; k < cands.length; k++) {
      var i = cands[k], sa = shapes(b, i, color), sd = shapes(b, i, opp);
      var a = scoreCounts(sa), d = scoreCounts(sd);
      info.push({ i: i, a: a, d: d, four: !!(sa[4] || sa[5]), s: a + d * 0.85 + centerBias(i) });
    }
    function bestBy(arr, key) { var bo = null; for (var j = 0; j < arr.length; j++) if (!bo || arr[j][key] > bo[key]) bo = arr[j]; return bo; }
    // 1. 自己成五
    var wins = info.filter(function (o) { return o.a >= S_FIVE; });
    if (wins.length) return wins[0].i;
    // 2. 堵对方成五（冲四/活四）
    var blocks = info.filter(function (o) { return o.d >= S_FIVE; });
    if (blocks.length) return bestBy(blocks, 'a').i;
    // 3. 自己活四 / 双四 / 四三
    var fw = info.filter(function (o) { return o.a >= S_FOURWIN; });
    if (fw.length) return bestBy(fw, 's').i;
    if (level >= 1) {
      var f3 = info.filter(function (o) { return o.a >= S_FOURTHREE; });
      if (f3.length) return bestBy(f3, 's').i;
    }
    // 4. VCF
    if (level >= 2) {
      var vctx = { deadline: t0 + budget * (level === 3 ? 0.35 : 0.15), nodes: 0, to: false };
      var seq = vcf(b, color, level === 3 ? 12 : 5, vctx);
      if (seq) return seq[0];
    }
    // 5. 防守：对方下一手能形成活四/双四/四三（即对方有活三等）
    var thr = level >= 2 ? S_DOUBLETHREE : S_FOURTHREE;
    var rootSet = info;
    var threat = info.some(function (o) { return o.d >= thr; });
    var ignore = level === 0 && rng() < 0.45; // 新手：有时会忽视你的活三
    if (threat && !ignore) {
      var byD = info.slice().sort(function (p, q2) { return q2.d - p.d; });
      var defend = [];
      for (k = 0; k < byD.length && k < 40; k++) {
        b[byD[k].i] = color;
        if (!hasThreat(b, opp, thr)) defend.push(byD[k]);
        b[byD[k].i] = 0;
      }
      if (!defend.length && thr === S_DOUBLETHREE) {
        for (k = 0; k < byD.length && k < 40; k++) {
          b[byD[k].i] = color;
          if (!hasThreat(b, opp, S_FOURTHREE)) defend.push(byD[k]);
          b[byD[k].i] = 0;
        }
      }
      if (defend.length) {
        var set = defend.slice();
        info.forEach(function (o) { if (o.four && set.indexOf(o) < 0) set.push(o); });
        rootSet = set;
      }
    }
    var sorted = rootSet.slice().sort(function (p, q2) { return q2.s - p.s; });
    if (level === 0) {
      var r = rng();
      var pick = r < 0.5 ? 0 : r < 0.75 ? 1 : r < 0.9 ? 2 : Math.floor(rng() * Math.min(6, sorted.length));
      return sorted[Math.min(pick, sorted.length - 1)].i;
    }
    if (level === 1) {
      var top = sorted[0].s, near = sorted.filter(function (o) { return o.s >= top * 0.92; }).slice(0, 3);
      return near[Math.floor(rng() * near.length)].i;
    }
    // 6. α-β 迭代加深
    var rootN = level === 3 ? 12 : 9;
    var ctx = { deadline: t0 + budget, nodes: 0, topN: level === 3 ? 10 : 8 };
    var maxD = level === 3 ? 8 : 4;
    var order = sorted.slice(0, rootN).map(function (o) { return o.i; });
    var bestMove = order[0];
    for (var depth = 1; depth <= maxD; depth++) {
      var work = b.slice(), localBest = order[0], localV = -2 * WIN, alpha = -2 * WIN, scores = {};
      try {
        for (k = 0; k < order.length; k++) {
          var m = order[k];
          work[m] = color;
          var v = -search(work, opp, depth - 1, -2 * WIN, -alpha, ctx, 1);
          work[m] = 0;
          scores[m] = v;
          if (v > localV) { localV = v; localBest = m; }
          if (v > alpha) alpha = v;
        }
      } catch (e) {
        if (e !== TIMEOUT) throw e;
        break;
      }
      bestMove = localBest;
      order.sort(function (p, q2) { return (scores[q2] || -3 * WIN) - (scores[p] || -3 * WIN); });
      if (localV >= WIN - 100) break;
      if (now() - t0 > budget * (level === 3 ? 0.3 : 0.2)) break; // 下一层大概率超时
    }
    return bestMove;
  }

  var engine = {
    N: N, SZ: SZ, I: I, newBoard: newBoard, checkWin: checkWin, makesFive: makesFive, isFull: isFull,
    legalMoves: legalMoves, shapes: shapes, pointScore: pointScore, candidates: candidates, evaluate: evaluate,
    vcf: vcf, hasThreat: hasThreat, chooseMove: chooseMove, coordName: coordName,
    S_FIVE: S_FIVE, S_FOURWIN: S_FOURWIN, S_FOURTHREE: S_FOURTHREE
  };

  /* ===================== 视图 ===================== */
  var CSS = [
    '.gomoku-wrap{width:var(--bw,min(92vw,560px));margin:0 auto;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}',
    '.gomoku-board{position:relative;width:100%;padding-top:100%;border-radius:var(--radius,18px);',
    'background:repeating-linear-gradient(92deg,rgba(150,95,40,.07) 0 3px,rgba(255,255,255,0) 3px 11px),radial-gradient(ellipse at 30% 20%,#f8d8a0 0,#ecbb72 55%,#dca25a 100%);',
    'box-shadow:0 10px 24px rgba(120,70,20,.25),inset 0 0 0 3px rgba(255,255,255,.35),inset 0 -6px 14px rgba(120,70,20,.18);touch-action:manipulation;cursor:pointer}',
    '.gomoku-area{position:absolute;left:3.5%;top:3.5%;width:93%;height:93%}',
    '.gomoku-svg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible}',
    '.gomoku-over{z-index:3}',
    '.gomoku-stone{position:absolute;width:6%;height:6%;margin:-3% 0 0 -3%;border-radius:50%;pointer-events:none;z-index:2;transition:opacity .18s,transform .18s}',
    '.gomoku-black{background:radial-gradient(circle at 32% 28%,#7a7a88 0,#2c2c36 36%,#0a0a10 78%);box-shadow:0 2px 3px rgba(0,0,0,.45),inset -2px -3px 5px rgba(0,0,0,.5)}',
    '.gomoku-white{background:radial-gradient(circle at 32% 28%,#fff 0,#f5f2ea 42%,#cdc5b6 100%);box-shadow:0 2px 3px rgba(0,0,0,.3),inset -2px -3px 5px rgba(0,0,0,.12)}',
    '.gomoku-black.gomoku-last{box-shadow:0 0 0 3px rgba(255,197,61,.65),0 2px 3px rgba(0,0,0,.45),inset -2px -3px 5px rgba(0,0,0,.5)}',
    '.gomoku-white.gomoku-last{box-shadow:0 0 0 3px rgba(255,197,61,.75),0 2px 3px rgba(0,0,0,.3),inset -2px -3px 5px rgba(0,0,0,.12)}',
    '.gomoku-last::after{content:"";position:absolute;left:50%;top:50%;width:28%;height:28%;margin:-14% 0 0 -14%;border-radius:50%;background:var(--red,#e5484d);box-shadow:0 0 4px rgba(229,72,77,.9)}',
    '.gomoku-drop{animation:gomoku-drop .24s cubic-bezier(.3,1.5,.6,1)}',
    '@keyframes gomoku-drop{0%{transform:scale(1.4) translateY(-22%);opacity:0}100%{transform:none;opacity:1}}',
    '.gomoku-ghost{opacity:.42;z-index:1}',
    '.gomoku-ghost.gomoku-confirm{opacity:.6;box-shadow:0 0 0 3px var(--yellow,#ffc53d)}',
    '.gomoku-winstone{animation:gomoku-glow .9s ease-in-out infinite alternate}',
    '@keyframes gomoku-glow{from{filter:drop-shadow(0 0 2px #ffc53d)}to{filter:drop-shadow(0 0 9px #ffc53d)}}',
    '.gomoku-winline{stroke:#ffe27a;stroke-width:2.4;stroke-linecap:round;filter:drop-shadow(0 0 2px #ffb000) drop-shadow(0 0 5px #ff8a3d);stroke-dasharray:200;stroke-dashoffset:200;animation:gomoku-draw .5s ease-out forwards}',
    '@keyframes gomoku-draw{to{stroke-dashoffset:0}}',
    '.gomoku-mark{position:absolute;width:7.6%;height:7.6%;margin:-3.8% 0 0 -3.8%;border-radius:50%;border:3px solid var(--yellow,#ffc53d);box-sizing:border-box;pointer-events:none;z-index:4;animation:gomoku-pulse .8s ease-in-out infinite alternate}',
    '.gomoku-mark.gomoku-red{border-color:var(--red,#e5484d)}.gomoku-mark.gomoku-green{border-color:var(--green,#22a06b);background:rgba(34,160,107,.25)}',
    '@keyframes gomoku-pulse{from{transform:scale(.85);opacity:.7}to{transform:scale(1.08);opacity:1}}',
    '.gomoku-info{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:10px;font-size:13px;color:var(--muted,#7a6f86)}',
    '.gomoku-chip{display:inline-flex;align-items:center;gap:5px;background:var(--card,#fff);border:1px solid var(--line,#e9dcc8);border-radius:999px;padding:3px 10px}',
    '.gomoku-dot{display:inline-block;width:11px;height:11px;border-radius:50%}',
    '.gomoku-dot.gomoku-b{background:#1a1a22}.gomoku-dot.gomoku-w{background:#fff;border:1px solid #bbb}',
    '.gomoku-chip.gomoku-turn{border-color:var(--yellow,#ffc53d);box-shadow:0 0 0 2px rgba(255,197,61,.35);color:var(--ink,#2b2340)}'
  ].join('\n');
  function injectCss() {
    if (typeof document === 'undefined') return;
    if (document.querySelector('style[data-gomoku-css]')) return;
    var st = document.createElement('style');
    st.setAttribute('data-gomoku-css', '1');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function pct(v) { return ((v + 0.5) * 100 / N) + '%'; }

  function createView(el) {
    el.innerHTML = '';
    var wrap = document.createElement('div'); wrap.className = 'gomoku-wrap';
    var board = document.createElement('div'); board.className = 'gomoku-board';
    var area = document.createElement('div'); area.className = 'gomoku-area';
    var grid = svgEl('svg', { viewBox: '0 0 150 150', class: 'gomoku-svg' });
    for (var k = 0; k < N; k++) {
      var p = k * 10 + 5, w = (k === 0 || k === N - 1) ? 0.9 : 0.55;
      grid.appendChild(svgEl('line', { x1: 5, y1: p, x2: 145, y2: p, stroke: '#7a4b1e', 'stroke-width': w, 'stroke-opacity': 0.8 }));
      grid.appendChild(svgEl('line', { x1: p, y1: 5, x2: p, y2: 145, stroke: '#7a4b1e', 'stroke-width': w, 'stroke-opacity': 0.8 }));
    }
    [[3, 3], [11, 3], [3, 11], [11, 11], [7, 7]].forEach(function (s) {
      grid.appendChild(svgEl('circle', { cx: s[0] * 10 + 5, cy: s[1] * 10 + 5, r: s[0] === 7 ? 1.7 : 1.4, fill: '#6b3f17' }));
    });
    var over = svgEl('svg', { viewBox: '0 0 150 150', class: 'gomoku-svg gomoku-over' });
    area.appendChild(grid); area.appendChild(over);
    board.appendChild(area);
    var info = document.createElement('div'); info.className = 'gomoku-info';
    wrap.appendChild(board); wrap.appendChild(info);
    el.appendChild(wrap);

    var stones = {}, lastIdx = -1, ghostEl = null, marks = [], winStones = [];
    function place(e, i) { e.style.left = pct(i % N); e.style.top = pct((i / N) | 0); }
    var v = {
      board: board,
      addStone: function (i, c, anim) {
        var e = document.createElement('div');
        e.className = 'gomoku-stone ' + (c === 1 ? 'gomoku-black' : 'gomoku-white') + (anim ? ' gomoku-drop' : '');
        place(e, i); area.appendChild(e); stones[i] = e; return e;
      },
      removeStone: function (i) { if (stones[i]) { stones[i].remove(); delete stones[i]; } },
      setLast: function (i) {
        if (lastIdx >= 0 && stones[lastIdx]) stones[lastIdx].classList.remove('gomoku-last');
        lastIdx = i; if (i >= 0 && stones[i]) stones[i].classList.add('gomoku-last');
      },
      setGhost: function (i, c, confirm) {
        if (ghostEl) { ghostEl.remove(); ghostEl = null; }
        if (i < 0) return;
        ghostEl = document.createElement('div');
        ghostEl.className = 'gomoku-stone gomoku-ghost ' + (c === 1 ? 'gomoku-black' : 'gomoku-white') + (confirm ? ' gomoku-confirm' : '');
        place(ghostEl, i); area.appendChild(ghostEl);
      },
      showWin: function (cells) {
        cells.forEach(function (i) { if (stones[i]) { stones[i].classList.add('gomoku-winstone'); winStones.push(stones[i]); } });
        var a = cells[0], z = cells[cells.length - 1];
        over.appendChild(svgEl('line', { class: 'gomoku-winline', x1: (a % N) * 10 + 5, y1: ((a / N) | 0) * 10 + 5, x2: (z % N) * 10 + 5, y2: ((z / N) | 0) * 10 + 5 }));
      },
      clearWin: function () {
        winStones.forEach(function (e) { e.classList.remove('gomoku-winstone'); }); winStones = [];
        while (over.firstChild) over.removeChild(over.firstChild);
      },
      mark: function (i, kind) {
        var e = document.createElement('div');
        e.className = 'gomoku-mark' + (kind ? ' gomoku-' + kind : '');
        place(e, i); area.appendChild(e); marks.push(e); return e;
      },
      clearMarks: function () { marks.forEach(function (e) { e.remove(); }); marks = []; },
      reset: function () {
        for (var s in stones) stones[s].remove();
        stones = {}; lastIdx = -1; v.setGhost(-1); v.clearMarks(); v.clearWin();
      },
      render: function (b, hist) {
        v.reset();
        for (var j = 0; j < hist.length; j++) v.addStone(hist[j], b[hist[j]], false);
        if (hist.length) v.setLast(hist[hist.length - 1]);
      },
      info: function (html) { info.innerHTML = html; },
      idxFromEvent: function (ev) {
        var r = area.getBoundingClientRect();
        var fx = (ev.clientX - r.left) / r.width * N, fy = (ev.clientY - r.top) / r.height * N;
        if (fx < -0.45 || fy < -0.45 || fx > N + 0.45 || fy > N + 0.45) return -1;
        var x = Math.min(N - 1, Math.max(0, Math.floor(fx))), y = Math.min(N - 1, Math.max(0, Math.floor(fy)));
        return I(x, y);
      },
      destroy: function () { el.innerHTML = ''; }
    };
    return v;
  }

  /* ===================== mount ===================== */
  function mount(el, opts) {
    injectCss();
    opts = opts || {};
    var level = Math.max(0, Math.min(3, opts.level | 0));
    var side = opts.side === 1 ? 1 : 0;
    var human = side === 0 ? 1 : 2, ai = 3 - human;
    var SIDE_NAMES = ['黑方（先手）', '白方'];
    var b = newBoard(), hist = [], over = false, thinking = false, destroyed = false;
    var timers = [], ghost = -1, downType = 'mouse', hintTimer = null;
    var view = createView(el);

    function status(t) { try { opts.onStatus && opts.onStatus(t); } catch (e) { } }
    function snd(n) { try { opts.sound && opts.sound(n); } catch (e) { } }
    function later(fn, ms) { var t = setTimeout(function () { timers.splice(timers.indexOf(t), 1); if (!destroyed) fn(); }, ms); timers.push(t); return t; }
    function turn() { return hist.length % 2 === 0 ? 1 : 2; }
    function myName() { return human === 1 ? '黑方' : '白方'; }
    function updateInfo() {
      var t = turn();
      var last = hist.length ? ' · 上一手 ' + coordName(hist[hist.length - 1]) : '';
      view.info(
        '<span class="gomoku-chip' + (t === 1 && !over ? ' gomoku-turn' : '') + '"><i class="gomoku-dot gomoku-b"></i>' + (human === 1 ? '你' : '电脑') + '</span>' +
        '<span class="gomoku-chip' + (t === 2 && !over ? ' gomoku-turn' : '') + '"><i class="gomoku-dot gomoku-w"></i>' + (human === 2 ? '你' : '电脑') + '</span>' +
        '<span class="gomoku-chip">第 ' + hist.length + ' 手' + last + '</span>');
    }
    function yourTurnStatus() {
      // 电脑是否已冲四 / 活三，提醒防守
      var cands = candidates(b), five = false, l4 = false;
      for (var k = 0; k < cands.length; k++) {
        var s = pointScore(b, cands[k], ai);
        if (s >= S_FIVE) { five = true; break; }
        if (s >= S_FOURWIN) l4 = true;
      }
      if (five) { snd('check'); status('电脑冲四！快堵 · 轮到你走'); }
      else if (l4) status('小心电脑的活三 · 轮到你走 · ' + myName());
      else status('轮到你走 · ' + myName());
    }
    function place(i, color) {
      b[i] = color; hist.push(i);
      view.addStone(i, color, true); view.setLast(i);
      snd('move');
      var w = checkWin(b, i);
      if (w) {
        over = true; updateInfo(); view.showWin(w);
        var who = color === 1 ? '黑方' : '白方';
        if (color === human) { snd('win'); status('五连！你赢了 🎉'); end({ winner: 'player', reason: who + '连成五子' }); }
        else { snd('lose'); status('电脑连成五子 · 再来一局？'); end({ winner: 'ai', reason: who + '连成五子' }); }
        return true;
      }
      if (isFull(b)) { over = true; updateInfo(); status('棋盘下满 · 和棋'); end({ winner: 'draw', reason: '棋盘下满，和棋' }); return true; }
      updateInfo();
      return false;
    }
    function end(r) { try { opts.onEnd && opts.onEnd(r); } catch (e) { } }
    function aiMove() {
      thinking = true; status('电脑思考中…');
      later(function () {
        var m = chooseMove(b, ai, level, { time: 1000 });
        thinking = false;
        if (destroyed || over) return;
        if (place(m, ai)) return;
        yourTurnStatus();
      }, 30);
    }
    function clearGhost() { ghost = -1; view.setGhost(-1); }
    function onDown(ev) { downType = ev.pointerType || 'mouse'; }
    function onUp(ev) {
      var i = view.idxFromEvent(ev);
      var type = ev.pointerType || downType;
      if (i < 0) { clearGhost(); return; }
      if (over || thinking || turn() !== human) { if (!over && b[i]) snd('illegal'); return; }
      if (b[i]) { snd('illegal'); clearGhost(); return; }
      if (type === 'touch' || type === 'pen') {
        if (ghost !== i) { ghost = i; view.setGhost(i, human, true); snd('select'); status('再点一次确认落子 · ' + coordName(i)); return; }
      }
      clearGhost();
      if (place(i, human)) return;
      aiMove();
    }
    function onMove(ev) {
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      if (over || thinking || turn() !== human) { if (ghost >= 0) clearGhost(); return; }
      var i = view.idxFromEvent(ev);
      if (i >= 0 && !b[i]) { if (i !== ghost) { ghost = i; view.setGhost(i, human, false); } }
      else if (ghost >= 0) clearGhost();
    }
    function onLeave(ev) { if (!ev.pointerType || ev.pointerType === 'mouse') clearGhost(); }
    view.board.addEventListener('pointerdown', onDown);
    view.board.addEventListener('pointerup', onUp);
    view.board.addEventListener('pointermove', onMove);
    view.board.addEventListener('pointerleave', onLeave);

    function start() {
      b = newBoard(); hist = []; over = false; thinking = false; ghost = -1;
      view.reset(); updateInfo();
      if (ai === 1) { status('自由规则 · 五连即胜 · 电脑执黑先手'); aiMove(); }
      else status('自由规则 · 五连即胜 · 轮到你走 · 黑方');
    }
    start();

    return {
      undo: function () {
        if (thinking || destroyed) return;
        var k = -1;
        for (var j = hist.length - 1; j >= 0; j--) if ((j % 2 === 0 ? 1 : 2) === human) { k = j; break; }
        if (k < 0) return;
        hist = hist.slice(0, k);
        b = newBoard(); for (j = 0; j < hist.length; j++) b[hist[j]] = (j % 2 === 0 ? 1 : 2);
        over = false; ghost = -1;
        view.render(b, hist); updateInfo();
        status('已悔棋 · 轮到你走 · ' + myName());
      },
      restart: function () {
        timers.forEach(clearTimeout); timers = [];
        start();
      },
      hint: function () {
        if (over || thinking || destroyed || turn() !== human) return;
        status('正在想提示…');
        thinking = true;
        later(function () {
          var m = chooseMove(b, human, 2, { time: 700 });
          thinking = false;
          view.clearMarks();
          view.mark(m, 'green');
          snd('select');
          status('提示：试试 ' + coordName(m));
          if (hintTimer) clearTimeout(hintTimer);
          hintTimer = later(function () { view.clearMarks(); if (!over && turn() === human) status('轮到你走 · ' + myName()); }, 2000);
        }, 30);
      },
      destroy: function () {
        destroyed = true;
        timers.forEach(clearTimeout); timers = [];
        view.board.removeEventListener('pointerdown', onDown);
        view.board.removeEventListener('pointerup', onUp);
        view.board.removeEventListener('pointermove', onMove);
        view.board.removeEventListener('pointerleave', onLeave);
        view.destroy();
      }
    };
  }

  /* ===================== demo ===================== */
  function demo(el, opts) {
    injectCss();
    opts = opts || {};
    var view = createView(el), timers = [], stopped = false;
    function at(ms, fn) { timers.push(setTimeout(function () { if (!stopped) fn(); }, ms)); }
    function cap(t) { try { opts.onCaption && opts.onCaption(t); } catch (e) { } }
    function setPos(list) { view.reset(); list.forEach(function (s) { view.addStone(I(s[0], s[1]), s[2], false); }); }
    function put(x, y, c) { view.addStone(I(x, y), c, true); view.setLast(I(x, y)); }
    function marks(list, kind) { list.forEach(function (s) { view.mark(I(s[0], s[1]), kind); }); }
    var B = 1, W = 2;
    var steps = [
      { cap: '目标：横、竖、斜任意一条线连成五子就赢！', run: function () {
        setPos([[5, 7, B], [6, 7, B], [7, 7, B], [8, 7, B], [5, 8, W], [7, 6, W], [8, 8, W]]);
        at(900, function () { put(9, 7, B); });
        at(1250, function () { view.showWin([I(5, 7), I(6, 7), I(7, 7), I(8, 7), I(9, 7)]); });
      } },
      { cap: '黑方先手、白方后手，轮流各下一子，落下不再移动。', run: function () {
        setPos([]);
        at(400, function () { put(7, 7, B); });
        at(1200, function () { put(8, 6, W); });
        at(2000, function () { put(6, 8, B); });
      } },
      { cap: '活三：三子相连、两头都空，再走一步就成活四，必须堵！', run: function () {
        setPos([[6, 7, B], [7, 7, B], [8, 7, B], [7, 8, W], [6, 6, W]]);
        marks([[5, 7], [9, 7]], 'yellow');
        at(1600, function () { view.clearMarks(); put(9, 7, W); });
      } },
      { cap: '冲四只有一头能成五；活四两头都空，堵不住！', run: function () {
        setPos([[5, 7, B], [6, 7, B], [7, 7, B], [8, 7, B], [6, 8, W], [7, 6, W], [8, 8, W]]);
        marks([[4, 7], [9, 7]], 'red');
        at(1100, function () { view.clearMarks(); view.mark(I(9, 7), 'red'); put(4, 7, W); });
        at(2100, function () { view.clearMarks(); put(9, 7, B); view.showWin([I(5, 7), I(6, 7), I(7, 7), I(8, 7), I(9, 7)]); });
      } },
      { cap: '四三杀/双活三：一手造出两个威胁，对手只能堵一个。', run: function () {
        setPos([[5, 9, B], [6, 9, B], [7, 9, B], [8, 7, B], [8, 8, B], [4, 9, W], [6, 8, W], [9, 7, W], [7, 6, W]]);
        marks([[8, 9]], 'yellow');
        at(1100, function () { view.clearMarks(); put(8, 9, B); });
        at(1500, function () { marks([[9, 9]], 'red'); marks([[8, 6], [8, 10]], 'yellow'); });
      } },
      { cap: '小技巧：黑棋先下天元，围着中心发展，空间最大。', run: function () {
        setPos([]);
        marks([[7, 7]], 'green');
        at(600, function () { view.clearMarks(); put(7, 7, B); });
        at(1300, function () { put(8, 6, W); });
        at(1900, function () { marks([[6, 6], [8, 8], [6, 8], [7, 8]], 'green'); });
      } }
    ];
    var t = 0;
    steps.forEach(function (s, k) {
      at(t, function () {
        view.clearMarks(); view.clearWin();
        view.info('<span class="gomoku-chip">教程 ' + (k + 1) + '/' + steps.length + ' · 自由规则</span>');
        cap(s.cap); s.run();
      });
      t += 3100;
    });
    at(t, function () { try { opts.onDone && opts.onDone(); } catch (e) { } });
    return { stop: function () { stopped = true; timers.forEach(clearTimeout); timers = []; } };
  }

  root.TZGAMES['gomoku'] = {
    id: 'gomoku', name: '五子棋', tagline: '黑白对弈，五子连珠，一步定胜负',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['黑方（先手）', '白方'],
    mount: mount,
    demo: demo,
    _engine: engine
  };
})();
