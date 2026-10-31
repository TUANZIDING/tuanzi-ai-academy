/* 团子棋馆 · 华容道 (huarong) v1.0 — 单人滑块解谜：把曹操从底部出口救出去 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
  root.TZGAMES = root.TZGAMES || {};

  /* ===================== 引擎 ===================== */
  // 棋盘 4 宽 × 5 高，格子编号 cell = r*4+c。形状：1=曹操 2×2，2=横将 2×1，3=竖将 1×2，4=卒 1×1
  // 状态键 key = Σ shape × 5^anchorCell（锚点=棋子左上格）。同形棋子互换得到同一个键。
  // 计步口径（piece-move metric）：同一枚棋子一次连续滑动（可多格、可拐弯）算 1 步。
  var W = 4, H = 5, N = 20, GOAL_CELL = 13; // 曹操锚点在第 4 行第 2 列 = 占据底部中间 2×2
  var SH = [null, { w: 2, h: 2 }, { w: 2, h: 1 }, { w: 1, h: 2 }, { w: 1, h: 1 }];
  var P5 = [], COVER = [null, [], [], [], []], STEP = [];
  (function () {
    var i, s;
    for (i = 0; i < N; i++) P5.push(Math.pow(5, i));
    for (s = 1; s <= 4; s++) {
      for (i = 0; i < N; i++) {
        var r = (i / W) | 0, c = i % W, w = SH[s].w, h = SH[s].h;
        if (r + h > H || c + w > W) { COVER[s].push(null); continue; }
        var cv = [];
        for (var dr = 0; dr < h; dr++) for (var dc = 0; dc < w; dc++) cv.push((r + dr) * W + c + dc);
        COVER[s].push(cv);
      }
    }
    for (i = 0; i < N; i++) {
      var rr = (i / W) | 0, cc = i % W;
      STEP.push([rr > 0 ? i - W : -1, rr < H - 1 ? i + W : -1, cc > 0 ? i - 1 : -1, cc < W - 1 ? i + 1 : -1]);
    }
  })();
  var NAMES = { C: '曹操', G: '关羽', a: '张飞', b: '赵云', c: '马超', d: '黄忠', s: '卒' };
  var SHAPE_OF = { C: 1, G: 2, a: 3, b: 3, c: 3, d: 3, s: 4 };

  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  // 布局串：20 字符，逐行。C 曹操 / G 关羽(横) / a b c d 张飞 赵云 马超 黄忠(竖) / s 卒 / . 空
  // 返回 {pieces:[{id,letter,name,shape,cell}], error}
  function parseLayout(str) {
    var res = { pieces: [], error: null };
    if (typeof str !== 'string' || str.length !== N) { res.error = '长度应为 20'; return res; }
    var seen = new Array(N), i;
    for (i = 0; i < N; i++) seen[i] = false;
    for (i = 0; i < N; i++) {
      var ch = str[i];
      if (ch === '.' || seen[i]) continue;
      var s = SHAPE_OF[ch];
      if (!s) { res.error = '未知字符 ' + ch; return res; }
      var cv = COVER[s][i];
      if (!cv) { res.error = ch + ' 越界'; return res; }
      for (var k = 0; k < cv.length; k++) {
        if (str[cv[k]] !== ch || seen[cv[k]]) { res.error = ch + ' 形状不对（第 ' + i + ' 格）'; return res; }
        seen[cv[k]] = true;
      }
      res.pieces.push({ id: res.pieces.length, letter: ch, name: NAMES[ch], shape: s, cell: i });
    }
    var cnt = {};
    res.pieces.forEach(function (p) { cnt[p.letter] = (cnt[p.letter] || 0) + 1; });
    for (var L in cnt) if (L !== 's' && cnt[L] > 1) { res.error = L + ' 出现多次'; return res; }
    if (cnt.C !== 1) res.error = '必须恰好一个曹操';
    return res;
  }
  function keyOfPieces(pieces) { var k = 0; for (var i = 0; i < pieces.length; i++) k += pieces[i].shape * P5[pieces[i].cell]; return k; }
  function decode(key, d) {
    var lo = key % 9765625, hi = (key - lo) / 9765625, i, x; // 5^10：拆成两个整数段，整数取模更快
    lo = lo | 0; hi = hi | 0;
    for (i = 0; i < 10; i++) { x = lo % 5; d[i] = x; lo = (lo - x) / 5 | 0; }
    for (i = 10; i < 20; i++) { x = hi % 5; d[i] = x; hi = (hi - x) / 5 | 0; }
    return d;
  }
  function isGoal(key) { return Math.floor(key / P5[GOAL_CELL]) % 5 === 1; }

  // 展开一个状态的所有后继（每枚棋子一次连续滑动可到达的每个新位置 = 1 步）
  var _d = new Int8Array(N), _occ = new Int8Array(N), _vis = new Int32Array(N), _fq = new Int8Array(N), _stamp = 0;
  function expand(key, out) {
    var d = decode(key, _d), occ = _occ, n = 0, i, k;
    for (i = 0; i < N; i++) occ[i] = -1;
    for (i = 0; i < N; i++) if (d[i]) { var cv = COVER[d[i]][i]; for (k = 0; k < cv.length; k++) occ[cv[k]] = i; }
    for (var a = 0; a < N; a++) {
      var s = d[a]; if (!s) continue;
      // 快速判断：棋子四周没有空格就不能动
      var cva = COVER[s][a], free = false;
      for (k = 0; k < cva.length && !free; k++) { var st = STEP[cva[k]]; for (var j = 0; j < 4; j++) if (st[j] >= 0 && occ[st[j]] === -1) { free = true; break; } }
      if (!free) continue;
      var tag = ++_stamp, qh = 0, qt = 0;
      _vis[a] = tag; _fq[qt++] = a;
      while (qh < qt) {
        var p = _fq[qh++], sp = STEP[p];
        for (var dir = 0; dir < 4; dir++) {
          var q = sp[dir]; if (q < 0 || _vis[q] === tag) continue;
          var cq = COVER[s][q]; if (!cq) continue;
          var ok = true;
          for (k = 0; k < cq.length; k++) { var o = occ[cq[k]]; if (o !== -1 && o !== a) { ok = false; break; } }
          if (!ok) continue;
          _vis[q] = tag; _fq[qt++] = q;
          out[n++] = key + s * (P5[q] - P5[a]);
        }
      }
    }
    return n;
  }

  // 开放寻址哈希表（Float64 键）：比 Map 快几倍，手机上整张连通图也能在几十毫秒内搜完
  function HTab(cap) { this.cap = cap; this.mask = cap - 1; this.slot = new Int32Array(cap).fill(-1); this.keys = new Float64Array(cap >> 1); this.par = new Int32Array(cap >> 1); this.n = 0; }
  function hkey(k) { var h = Math.imul((k >>> 0) ^ 0x5bd1e995, 0x9E3779B1) ^ Math.imul(((k / 4294967296) | 0) + 0x27d4eb2f, 0x85EBCA77); return (h ^ (h >>> 15)) >>> 0; }
  // 返回新下标；已存在返回 -1
  HTab.prototype.add = function (k, p) {
    if (this.n >= (this.cap >> 1)) this.grow();
    var m = this.mask, i = hkey(k) & m, sl = this.slot, ks = this.keys;
    while (sl[i] !== -1) { if (ks[sl[i]] === k) return -1; i = (i + 1) & m; }
    var id = this.n++; sl[i] = id; ks[id] = k; this.par[id] = p; return id;
  };
  HTab.prototype.grow = function () {
    var ok = this.keys, op = this.par, n = this.n, c = this.cap * 2;
    this.cap = c; this.mask = c - 1; this.slot = new Int32Array(c).fill(-1); this.keys = new Float64Array(c >> 1); this.par = new Int32Array(c >> 1); this.n = 0;
    for (var j = 0; j < n; j++) this.add(ok[j], op[j]);
  };

  // BFS 最优解（同形棋子视为相同）。返回 {dist, path:[key…], states, ms} 或 null（无解）
  var _buf = new Array(64);
  function solve(start, maxStates) {
    var t0 = now();
    if (isGoal(start)) return { dist: 0, path: [start], states: 1, ms: 0 };
    var T = new HTab(1 << 15), head = 0, lim = maxStates || 2e6;
    T.add(start, -1);
    while (head < T.n) {
      var k = T.keys[head], n = expand(k, _buf);
      for (var i = 0; i < n; i++) {
        var nk = _buf[i], id = T.add(nk, head);
        if (id < 0) continue;
        if (isGoal(nk)) {
          var path = [], x = id;
          while (x !== -1) { path.push(T.keys[x]); x = T.par[x]; }
          path.reverse();
          return { dist: path.length - 1, path: path, states: T.n, ms: now() - t0 };
        }
      }
      head++;
      if (T.n > lim) return null;
    }
    return null;
  }
  // 整个连通分量大小（测试用）
  function componentSize(start) {
    var T = new HTab(1 << 15), head = 0;
    T.add(start, -1);
    while (head < T.n) { var n = expand(T.keys[head++], _buf); for (var i = 0; i < n; i++) T.add(_buf[i], 0); }
    return T.n;
  }
  // 两个相邻状态之间的那一步：{from, to, shape}（锚点格）
  var _d2 = new Int8Array(N);
  function diffMove(k1, k2) {
    var a = decode(k1, new Int8Array(N)), b = decode(k2, _d2), from = -1, to = -1, s = 0;
    for (var i = 0; i < N; i++) if (a[i] !== b[i]) { if (a[i] && !b[i]) { from = i; s = a[i]; } else if (!a[i] && b[i]) to = i; }
    return { from: from, to: to, shape: s };
  }
  // 某枚棋子在当前盘面能到达的所有位置，带路径（锚点序列）
  function reachable(pieces, pid) {
    var occ = new Int8Array(N), i, k;
    for (i = 0; i < N; i++) occ[i] = -1;
    pieces.forEach(function (p) { var cv = COVER[p.shape][p.cell]; for (var j = 0; j < cv.length; j++) occ[cv[j]] = p.id; });
    var pc = pieces[pid], s = pc.shape, par = {}, q = [pc.cell], res = [];
    par[pc.cell] = -1;
    for (var h = 0; h < q.length; h++) {
      var p = q[h];
      for (var dir = 0; dir < 4; dir++) {
        var nq = STEP[p][dir]; if (nq < 0 || par[nq] !== undefined) continue;
        var cq = COVER[s][nq]; if (!cq) continue;
        var ok = true;
        for (k = 0; k < cq.length; k++) if (occ[cq[k]] !== -1 && occ[cq[k]] !== pid) { ok = false; break; }
        if (!ok) continue;
        par[nq] = p; q.push(nq);
        var path = [nq], x = p; while (x !== -1) { path.push(x); x = par[x]; }
        res.push({ cell: nq, path: path.reverse(), cover: cq });
      }
    }
    return res;
  }

  /* 题库：[布局, 最少步数]。最少步数由 BFS 求出（piece-move 口径），测试会逐题复核。
     新手含简化开局（少子），入门起都是标准 10 子（曹操、关羽、四员竖将、四卒）。 */
  var LAYOUTS = [
    [['.CC..CC......ss.....', 3], ['.CC..CC.sGGs........', 4], ['aCCbaCCbc..dc..dGGss', 9], ['aCCbaCCbGGcd..cd..ss', 11], ['aCCbaCCbGGcdsscd....', 13], ['aCCbaCCbcGGdcssd....', 15], ['aCCbaCCbGGscds.cd...', 17], ['aCCsaCC.sbcd.bcd.GG.', 19]],
    [['CCGGCCabcdabcdss..ss', 22], ['GGCCabCCabcssscd..sd', 25], ['CCGGCCabscabscds..ds', 28], ['GGCCabCCabcsdscsds..', 31], ['sCCssCCsGGabcdabcd..', 33], ['aCCsaCCssbGGsbcd..cd', 36], ['aCCsaCCsbGGcbsdc.sd.', 39]],
    [['aCCsaCCbcGGbcssd.s.d', 45], ['aCCsaCCsbcGGbcsds..d', 51], ['aCCbaCCbcsdscsdsGG..', 56], ['aCCbaCCbcdsscdGGss..', 61], ['aCCbaCCbGGcssscd..sd', 65], ['aCCbaCCbGGssscds.cd.', 70], ['aCCbaCCbGGcdsscd..ss', 73], ['aCCbaCCbGGcsdscsd.s.', 77]],
    [['aCCbaCCbcGGdcssds..s', 81, '横刀立马'], ['aCCsaCCbGGcbdscsd..s', 84], ['aCCsaCCbGGcbdscsd.s.', 85], ['aCCsaCCbcGGbcsds.sd.', 88], ['aCCsaCCbcGGbcsdss.d.', 89], ['aCCsaCCbcGGbc.d.ssds', 91], ['.CCasCCabGGcbd.csdss', 93]]
  ];
  function layoutName(level, idx) { var L = LAYOUTS[level][idx]; return L[2] || ('第 ' + (idx + 1) + '/' + LAYOUTS[level].length + ' 题'); }

  /* 纯逻辑对局（无 DOM，测试可直接用） */
  function Game(str, opt) { this.str = str; this.opt = opt; this.reset(); }
  Game.prototype.reset = function () {
    var p = parseLayout(this.str);
    if (p.error) throw new Error('华容道布局错误：' + p.error);
    this.pieces = p.pieces; this.stack = []; this.cache = null;
  };
  Game.prototype.key = function () { return keyOfPieces(this.pieces); };
  Game.prototype.moves = function () { return this.stack.length; };
  Game.prototype.won = function () { return isGoal(this.key()); };
  Game.prototype.reach = function (pid) { return reachable(this.pieces, pid); };
  Game.prototype.pieceAt = function (cell) { // 覆盖该格的棋子 id，空格 -1
    for (var i = 0; i < this.pieces.length; i++) { var p = this.pieces[i]; if (COVER[p.shape][p.cell].indexOf(cell) >= 0) return p.id; }
    return -1;
  };
  // 把 pid 滑到锚点 cell。同一枚棋子连续滑动合并为 1 步（与最少步数口径一致）。非法返回 null
  Game.prototype.move = function (pid, cell) {
    var r = this.reach(pid), hit = null;
    for (var i = 0; i < r.length; i++) if (r[i].cell === cell) { hit = r[i]; break; }
    if (!hit) return null;
    var pc = this.pieces[pid], from = pc.cell, top = this.stack[this.stack.length - 1], merged = false;
    pc.cell = cell;
    if (top && top.pid === pid) { merged = true; top.to = cell; if (top.to === top.from) this.stack.pop(); }
    else this.stack.push({ pid: pid, from: from, to: cell });
    return { pid: pid, from: from, to: cell, path: hit.path, merged: merged };
  };
  Game.prototype.undo = function () {
    var t = this.stack.pop(); if (!t) return null;
    var pc = this.pieces[t.pid], r = reachable(this.pieces, t.pid), path = [t.to, t.from];
    for (var i = 0; i < r.length; i++) if (r[i].cell === t.from) { path = r[i].path; break; }
    pc.cell = t.from;
    return { pid: t.pid, from: t.to, to: t.from, path: path };
  };
  // 最优下一步：{pid, to, path, remaining}；已到出口返回 null
  Game.prototype.hint = function () {
    var key = this.key(), path = null, idx = -1;
    if (this.cache) { idx = this.cache.indexOf(key); if (idx >= 0 && idx < this.cache.length - 1) path = this.cache; }
    if (!path) {
      var r = solve(key); if (!r || r.dist === 0) return null;
      path = this.cache = r.path; idx = 0;
    }
    var mv = diffMove(path[idx], path[idx + 1]), pid = -1;
    for (var i = 0; i < this.pieces.length; i++) if (this.pieces[i].cell === mv.from && this.pieces[i].shape === mv.shape) { pid = i; break; }
    if (pid < 0) return null;
    var rr = this.reach(pid), pth = [mv.from, mv.to];
    for (i = 0; i < rr.length; i++) if (rr[i].cell === mv.to) { pth = rr[i].path; break; }
    return { pid: pid, to: mv.to, path: pth, remaining: path.length - 1 - idx };
  };

  var engine = {
    W: W, H: H, N: N, GOAL_CELL: GOAL_CELL, SH: SH, P5: P5, COVER: COVER, NAMES: NAMES, LAYOUTS: LAYOUTS,
    parseLayout: parseLayout, keyOfPieces: keyOfPieces, decode: decode, isGoal: isGoal, expand: expand,
    solve: solve, componentSize: componentSize, diffMove: diffMove, reachable: reachable, Game: Game, layoutName: layoutName
  };

  /* ===================== 视图 ===================== */
  var CSS = [
    '.huarong-wrap{--hrw:calc(var(--bw,min(92vw,560px)) * .8);width:var(--hrw);margin:0 auto;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}',
    '.huarong-info{display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 10px;font-size:13px;color:var(--muted,#7a6f86)}',
    '.huarong-chip{display:inline-flex;align-items:center;gap:4px;background:var(--card,#fff);border:1px solid var(--line,#e9dcc8);border-radius:999px;padding:3px 10px;font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.huarong-chip b{color:var(--ink,#2b2340);font-weight:800}',
    '.huarong-next{appearance:none;-webkit-appearance:none;font:inherit;font-size:13px;font-weight:700;color:#fff;background:var(--orange,#ff8a3d);border:0;border-radius:999px;padding:4px 12px;box-shadow:0 2px 0 #d9682a;cursor:pointer;touch-action:manipulation}',
    '.huarong-next:active{transform:translateY(1px);box-shadow:0 1px 0 #d9682a}',
    '.huarong-tray{position:relative;padding:calc(var(--hrw) * .045) calc(var(--hrw) * .045) calc(var(--hrw) * .085);border-radius:22px;background:radial-gradient(120% 80% at 30% 10%,#e9b878 0%,#d69a55 55%,#c4823f 100%);box-shadow:0 10px 24px rgba(120,70,20,.22),inset 0 2px 0 rgba(255,255,255,.35),inset 0 -3px 0 rgba(0,0,0,.12)}',
    '.huarong-board{position:relative;width:100%;aspect-ratio:4/5;border-radius:12px;background-color:#f7e6c4;background-image:linear-gradient(rgba(160,110,50,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(160,110,50,.13) 1px,transparent 1px);background-size:25% 20%;box-shadow:inset 0 3px 8px rgba(120,70,20,.25);touch-action:none}',
    '.huarong-gate{position:absolute;left:25%;width:50%;top:100%;height:calc(var(--hrw) * .085);background:#f7e6c4;border-radius:0 0 12px 12px;display:flex;align-items:center;justify-content:center;gap:4px;color:var(--red,#e5484d);font-weight:900;font-size:calc(var(--hrw) * .036);letter-spacing:2px;box-shadow:inset 0 -3px 6px rgba(120,70,20,.18)}',
    '.huarong-gate i{font-style:normal;display:inline-block;animation:huarong-bob 1.2s ease-in-out infinite}',
    '.huarong-gate.huarong-open{background:#fff3c4;box-shadow:0 0 0 3px var(--yellow,#ffc53d),0 0 18px rgba(255,197,61,.8)}',
    '@keyframes huarong-bob{50%{transform:translateY(3px)}}',
    '.huarong-piece{position:absolute;box-sizing:border-box;padding:calc(var(--hrw) * .009);z-index:2;transition:left .16s ease-out,top .16s ease-out;cursor:grab}',
    '.huarong-tile{position:relative;box-sizing:border-box;width:100%;height:100%;border-radius:calc(var(--hrw) * .035);display:flex;align-items:center;justify-content:center;gap:2%;overflow:hidden;transition:transform .12s,box-shadow .12s}',
    '.huarong-name{font-family:"STKaiti","Kaiti SC","KaiTi","楷体","BiauKai","STXingkai",serif;font-weight:900;line-height:1;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.18)}',
    '.huarong-face{display:block;flex:none}',
    '.huarong-t1 .huarong-tile{flex-direction:column;background:linear-gradient(160deg,#ff6b6b,#d93a3f 60%,#b82a30);border:calc(var(--hrw) * .012) solid #ffc53d;box-shadow:0 5px 0 #8f1f24,0 8px 14px rgba(140,30,30,.3)}',
    '.huarong-t1 .huarong-name{font-size:calc(var(--hrw) * .12);color:#ffe28a;letter-spacing:4px}',
    '.huarong-t1 .huarong-face{width:calc(var(--hrw) * .17);height:calc(var(--hrw) * .17)}',
    '.huarong-t2 .huarong-tile{flex-direction:row;background:linear-gradient(160deg,#4cc98e,#22a06b 60%,#178555);box-shadow:0 5px 0 #0f6b43,0 7px 12px rgba(20,110,70,.28)}',
    '.huarong-t2 .huarong-name{font-size:calc(var(--hrw) * .08)}',
    '.huarong-t2 .huarong-face{width:calc(var(--hrw) * .12);height:calc(var(--hrw) * .12)}',
    '.huarong-t3 .huarong-tile{flex-direction:column;background:linear-gradient(170deg,#6ea8ff,#3b82f6 60%,#2a6be0);box-shadow:0 5px 0 #1d4fb0,0 7px 12px rgba(30,80,180,.28)}',
    '.huarong-t3 .huarong-name{font-size:calc(var(--hrw) * .075);writing-mode:vertical-rl;letter-spacing:2px}',
    '.huarong-t3 .huarong-face{width:calc(var(--hrw) * .11);height:calc(var(--hrw) * .11)}',
    '.huarong-t4 .huarong-tile{flex-direction:column;background:linear-gradient(160deg,#f1d9b0,#dcb983 70%,#cfa86d);box-shadow:0 4px 0 #a9824b,0 6px 10px rgba(120,80,30,.25)}',
    '.huarong-t4 .huarong-name{font-size:calc(var(--hrw) * .05);color:#7a4a1c;text-shadow:none}',
    '.huarong-t4 .huarong-face{width:calc(var(--hrw) * .1);height:calc(var(--hrw) * .1)}',
    '.huarong-sel{z-index:4}',
    '.huarong-sel .huarong-tile{transform:translateY(-2px) scale(1.02);outline:calc(var(--hrw) * .01) solid var(--yellow,#ffc53d);outline-offset:1px}',
    '.huarong-drag{z-index:6;transition:left .07s linear,top .07s linear;cursor:grabbing}',
    '.huarong-drag .huarong-tile{transform:scale(1.04)}',
    '.huarong-hintp .huarong-tile{animation:huarong-pulse .6s ease-in-out infinite alternate}',
    '@keyframes huarong-pulse{from{outline:3px solid rgba(34,160,107,.35);outline-offset:1px}to{outline:5px solid var(--green,#22a06b);outline-offset:3px}}',
    '.huarong-shake .huarong-tile{animation:huarong-shake .32s ease-in-out}',
    '@keyframes huarong-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}50%{transform:translateX(4px)}75%{transform:translateX(-2px)}}',
    '.huarong-exit{transition:top 1s cubic-bezier(.5,-.3,.7,1),opacity .5s ease-in .6s !important;opacity:0}',
    '.huarong-exit .huarong-tile{animation:huarong-wiggle .25s ease-in-out 4}',
    '@keyframes huarong-wiggle{50%{transform:rotate(-4deg) scale(1.05)}}',
    '.huarong-mark{position:absolute;box-sizing:border-box;pointer-events:none}',
    '.huarong-dot{z-index:3;display:flex;align-items:center;justify-content:center}',
    '.huarong-dot::after{content:"";width:28%;height:28%;max-width:22px;max-height:22px;border-radius:50%;background:rgba(34,160,107,.55);box-shadow:0 0 0 4px rgba(34,160,107,.15)}',
    '.huarong-last{z-index:1;padding:calc(var(--hrw) * .009)}',
    '.huarong-last::after{content:"";display:block;width:100%;height:100%;border-radius:calc(var(--hrw) * .035);background:rgba(255,197,61,.35)}',
    '.huarong-ghost{z-index:3;padding:calc(var(--hrw) * .009)}',
    '.huarong-ghost::after{content:"";display:block;width:100%;height:100%;box-sizing:border-box;border-radius:calc(var(--hrw) * .035);border:3px dashed var(--green,#22a06b);background:rgba(34,160,107,.14)}',
    '.huarong-arrow{position:absolute;inset:0;width:100%;height:100%;z-index:7;pointer-events:none;overflow:visible}',
    '.huarong-spark{position:absolute;z-index:8;font-size:calc(var(--hrw) * .08);pointer-events:none;animation:huarong-float 1.3s ease-out forwards}',
    '@keyframes huarong-float{from{transform:translateY(0) scale(.5);opacity:0}20%{opacity:1}to{transform:translateY(-90px) scale(1.2);opacity:0}}',
    '.huarong-demo .huarong-board,.huarong-demo .huarong-piece{cursor:default}'
  ].join('\n');
  function injectCss() {
    if (typeof document === 'undefined') return;
    if (document.querySelector('style[data-huarong-css]')) return;
    var st = document.createElement('style');
    st.setAttribute('data-huarong-css', '1');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function div(cls, parent) { var e = document.createElement('div'); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  // 简笔脸：曹操金冠、关羽绿巾长髯、众将蓝盔、卒子头巾
  function faceSvg(shape) {
    var hat, extra = '', brow = '';
    if (shape === 1) {
      hat = '<path d="M7 15 L10 4 L15 11 L20 2 L25 11 L30 4 L33 15 Z" fill="#ffc53d" stroke="#b7791f" stroke-width="1.2" stroke-linejoin="round"/><circle cx="20" cy="9" r="2" fill="#e5484d"/>';
      brow = '<path d="M11.5 18.5 L17 20.5 M28.5 18.5 L23 20.5" stroke="#2b2340" stroke-width="1.8" stroke-linecap="round"/>';
      extra = '<path d="M15 29 Q17 31 20 29.5 Q23 31 25 29" stroke="#2b2340" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    } else if (shape === 2) {
      hat = '<path d="M6 17 Q20 1 34 17 Z" fill="#14724a"/><rect x="6" y="15" width="28" height="3.5" rx="1.7" fill="#0f5c3b"/>';
      extra = '<path d="M13 29 Q20 46 27 29 Q20 33 13 29 Z" fill="#2b2340"/>';
      brow = '<path d="M12 19 L17 18.5 M28 19 L23 18.5" stroke="#2b2340" stroke-width="1.8" stroke-linecap="round"/>';
    } else if (shape === 3) {
      hat = '<path d="M5 18 Q20 -1 35 18 Z" fill="#cfd8e6" stroke="#64748b" stroke-width="1.2"/><path d="M20 4 Q23 -2 26 1" stroke="#e5484d" stroke-width="3" fill="none" stroke-linecap="round"/>';
    } else {
      hat = '<rect x="6" y="12" width="28" height="5.5" rx="2.5" fill="#b45309"/><path d="M33 14 L38 11 M33 15.5 L38 18" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>';
    }
    var smile = (shape === 1 || shape === 2) ? '' : '<path d="M15 27.5 Q20 32 25 27.5" stroke="#2b2340" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    return '<svg class="huarong-face" viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle cx="20" cy="23" r="13.5" fill="#ffe0bd" stroke="#8a5a34" stroke-width="1.2"/>' +
      '<circle cx="13" cy="27" r="2.6" fill="#ffb3b3" opacity=".7"/><circle cx="27" cy="27" r="2.6" fill="#ffb3b3" opacity=".7"/>' +
      '<circle cx="15.5" cy="22.5" r="1.9" fill="#2b2340"/><circle cx="24.5" cy="22.5" r="1.9" fill="#2b2340"/>' +
      brow + smile + extra + hat + '</svg>';
  }
  function rectOf(shape, cell) {
    var r = (cell / W) | 0, c = cell % W;
    return { left: c * 25, top: r * 20, width: SH[shape].w * 25, height: SH[shape].h * 20 };
  }
  function placeEl(e, rc) { e.style.left = rc.left + '%'; e.style.top = rc.top + '%'; e.style.width = rc.width + '%'; e.style.height = rc.height + '%'; }

  function createView(el, demo, later) {
    injectCss();
    el.innerHTML = '';
    var wrap = div('huarong-wrap' + (demo ? ' huarong-demo' : ''), el);
    var info = div('huarong-info', wrap);
    var chipName = div('huarong-chip', info), chipMoves = div('huarong-chip', info), chipOpt = div('huarong-chip', info), nextBtn = null;
    if (!demo) { nextBtn = document.createElement('button'); nextBtn.type = 'button'; nextBtn.className = 'huarong-next'; nextBtn.textContent = '换一题 ⟳'; info.appendChild(nextBtn); }
    var tray = div('huarong-tray', wrap), board = div('huarong-board', tray);
    var gate = div('huarong-gate', board); gate.innerHTML = '<i>⬇</i>出口<i>⬇</i>';
    var els = [], shapes = [], marks = [], hintMarks = [];
    function clearList(list) { list.forEach(function (m) { if (m.parentNode) m.parentNode.removeChild(m); }); list.length = 0; }
    var view = {
      wrap: wrap, board: board, nextBtn: nextBtn, els: els,
      setInfo: function (name, moves, opt) {
        chipName.innerHTML = '<b>' + name + '</b>';
        chipMoves.innerHTML = '步数 <b>' + moves + '</b>';
        chipOpt.innerHTML = '最少 <b>' + opt + '</b> 步';
      },
      setPieces: function (pieces) {
        els.forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); });
        els.length = 0; shapes.length = 0; clearList(marks); clearList(hintMarks);
        gate.classList.remove('huarong-open');
        pieces.forEach(function (p) {
          var e = div('huarong-piece huarong-t' + p.shape, board);
          e.setAttribute('data-p', p.id);
          var t = div('huarong-tile', e);
          t.innerHTML = faceSvg(p.shape) + '<span class="huarong-name">' + p.name + '</span>';
          placeEl(e, rectOf(p.shape, p.cell));
          els.push(e); shapes.push(p.shape);
        });
      },
      place: function (pid, cell, cls) {
        var e = els[pid]; if (!e) return;
        if (cls) e.classList.add(cls);
        placeEl(e, rectOf(shapes[pid], cell));
      },
      // 沿路径滑动（拐点分段），返回总时长 ms
      slide: function (pid, path, done) {
        var pts = [path[0]];
        for (var i = 1; i < path.length; i++) {
          var a = pts[pts.length - 1], b = path[i], nx = path[i + 1];
          if (nx === undefined || (b - a) !== (nx - b)) pts.push(b);
        }
        var e = els[pid], t = 0;
        e.classList.remove('huarong-drag');
        for (var k = 1; k < pts.length; k++) {
          (function (cell, from, at) {
            var cells = Math.abs(((cell / W) | 0) - ((from / W) | 0)) + Math.abs(cell % W - from % W), dur = 90 + 70 * cells;
            later(function () { e.style.transitionDuration = dur + 'ms'; placeEl(e, rectOf(shapes[pid], cell)); }, at);
            t = at + dur;
          })(pts[k], pts[k - 1], t);
        }
        later(function () { e.style.transitionDuration = ''; if (done) done(); }, t + 20);
        return t + 20;
      },
      cls: function (pid, cls, on) { if (els[pid]) els[pid].classList.toggle(cls, !!on); },
      setSel: function (pid) { els.forEach(function (e, i) { e.classList.toggle('huarong-sel', i === pid); }); },
      shake: function (pid) {
        var e = els[pid]; if (!e) return;
        e.classList.remove('huarong-shake'); void e.offsetWidth; e.classList.add('huarong-shake');
        later(function () { e.classList.remove('huarong-shake'); }, 340);
      },
      setDots: function (cells) {
        marks.filter(function (m) { return m.classList.contains('huarong-dot'); }).forEach(function (m) { board.removeChild(m); marks.splice(marks.indexOf(m), 1); });
        (cells || []).forEach(function (c) { var m = div('huarong-mark huarong-dot', board); placeEl(m, rectOf(4, c)); marks.push(m); });
      },
      setLast: function (shape, from, to) {
        marks.filter(function (m) { return m.classList.contains('huarong-last'); }).forEach(function (m) { board.removeChild(m); marks.splice(marks.indexOf(m), 1); });
        if (shape) [from, to].forEach(function (c) { var m = div('huarong-mark huarong-last', board); placeEl(m, rectOf(shape, c)); marks.push(m); });
      },
      showHint: function (pid, fromCell, toCell, noPulse) {
        view.clearHint();
        var s = shapes[pid], a = rectOf(s, fromCell), b = rectOf(s, toCell);
        var g = div('huarong-mark huarong-ghost', board); placeEl(g, b); hintMarks.push(g);
        if (!noPulse) { els[pid].classList.add('huarong-hintp'); }
        var x1 = (a.left + a.width / 2) * 4, y1 = (a.top + a.height / 2) * 5, x2 = (b.left + b.width / 2) * 4, y2 = (b.top + b.height / 2) * 5;
        var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L, hl = 34, hw = 22;
        var bx = x2 - ux * hl, by = y2 - uy * hl;
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'huarong-arrow'); svg.setAttribute('viewBox', '0 0 400 500'); svg.setAttribute('preserveAspectRatio', 'none');
        svg.innerHTML = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + bx + '" y2="' + by + '" stroke="#22a06b" stroke-width="13" stroke-linecap="round" opacity=".9"/>' +
          '<polygon points="' + x2 + ',' + y2 + ' ' + (bx - uy * hw) + ',' + (by + ux * hw) + ' ' + (bx + uy * hw) + ',' + (by - ux * hw) + '" fill="#22a06b" opacity=".95" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>';
        board.appendChild(svg); hintMarks.push(svg);
      },
      clearHint: function () { clearList(hintMarks); els.forEach(function (e) { e.classList.remove('huarong-hintp'); }); },
      gateGlow: function (on) { gate.classList.toggle('huarong-open', !!on); },
      exit: function (pid) {
        var e = els[pid]; gate.classList.add('huarong-open');
        e.classList.add('huarong-exit'); e.style.top = (3 * 20 + 55) + '%';
        ['🎉', '✨', '🏮', '✨', '🎊'].forEach(function (s, i) {
          later(function () {
            var sp = div('huarong-spark', board); sp.textContent = s;
            sp.style.left = (22 + i * 12) + '%'; sp.style.top = (72 + (i % 2) * 8) + '%';
            later(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 1400);
          }, 250 + i * 140);
        });
      },
      cellAt: function (x, y) {
        var r = board.getBoundingClientRect(), c = Math.floor((x - r.left) / r.width * W), rr = Math.floor((y - r.top) / r.height * H);
        if (c < 0 || c >= W || rr < 0 || rr >= H) return -1;
        return rr * W + c;
      }
    };
    return view;
  }

  function store(k, v) { try { if (v === undefined) return root.localStorage ? root.localStorage.getItem(k) : null; root.localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ===================== 对局 ===================== */
  function mount(el, opts) {
    opts = opts || {};
    var level = Math.max(0, Math.min(3, opts.level | 0));
    var onStatus = opts.onStatus || function () {}, onEnd = opts.onEnd || function () {}, snd = opts.sound || function () {};
    var timers = [], dead = false;
    function later(fn, ms) { var t = setTimeout(function () { var i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); if (!dead) fn(); }, ms); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    var view = createView(el, false, later), LV = LAYOUTS[level];
    var idx = parseInt(store('huarong-idx-' + level), 10); if (!(idx >= 0 && idx < LV.length)) idx = 0;
    var game, opt, ended, busy, sel, down = null, hintT = null;

    function name() { return layoutName(level, idx); }
    function info() { view.setInfo(name(), game.moves(), opt); }
    function pname(pid) { return game.pieces[pid].name; }
    function load() {
      clearTimers(); down = null;
      game = new Game(LV[idx][0]); opt = LV[idx][1];
      ended = false; busy = false; sel = -1;
      view.setPieces(game.pieces); view.setSel(-1); info();
      onStatus('拖动棋子滑进空格，把曹操送到下方出口 · 最少 ' + opt + ' 步');
    }
    function clearHint() { if (hintT) { clearTimeout(hintT); hintT = null; } view.clearHint(); }
    function select(pid) {
      sel = pid; view.setSel(pid);
      if (pid < 0) { view.setDots(null); return; }
      var r = game.reach(pid), set = {}, cells = [];
      r.forEach(function (x) { x.cover.forEach(function (c) { if (game.pieceAt(c) < 0 && !set[c]) { set[c] = 1; cells.push(c); } }); });
      view.setDots(cells);
    }
    function afterMove(mv) {
      var top = game.stack[game.stack.length - 1];
      if (top) view.setLast(game.pieces[top.pid].shape, top.from, top.to); else view.setLast(0);
      info();
      if (game.won()) { win(); return; }
      onStatus('已走 ' + game.moves() + ' 步 · 本题最少 ' + opt + ' 步' + (mv && mv.merged ? '（同一枚连着滑算 1 步）' : ''));
    }
    function doMove(pid, cell, animate) {
      var mv = game.move(pid, cell); if (!mv) return false;
      clearHint(); select(-1); snd('move');
      if (animate) { busy = true; view.slide(pid, mv.path, function () { busy = false; afterMove(mv); }); }
      else { view.place(pid, cell); view.cls(pid, 'huarong-drag', false); afterMove(mv); }
      return true;
    }
    function win() {
      ended = true; busy = true; view.setDots(null); view.setLast(0);
      var n = game.moves(), cao = 0;
      game.pieces.forEach(function (p) { if (p.shape === 1) cao = p.id; });
      store('huarong-idx-' + level, String((idx + 1) % LV.length)); // 下次进来换下一题
      onStatus('曹操脱险！用了 ' + n + ' 步' + (n <= opt ? '，正好是最优解 🎯' : '（最少 ' + opt + ' 步）'));
      later(function () { view.exit(cao); }, 200);
      later(function () { onEnd({ winner: 'player', reason: '用了 ' + n + ' 步（最少 ' + opt + ' 步）' }); }, 1500);
    }
    function blocked(pid, msg) { snd('illegal'); if (pid >= 0) view.shake(pid); if (msg) onStatus(msg); }

    // —— 指针：拖动/轻扫/点选 ——
    function onDown(e) {
      if (ended || busy || down) return;
      if (e.button !== undefined && e.button > 0) return;
      var pe = e.target.closest ? e.target.closest('.huarong-piece') : null, pid = pe ? +pe.getAttribute('data-p') : -1;
      e.preventDefault();
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, pid: pid, moved: false, cur: pid >= 0 ? game.pieces[pid].cell : -1, reach: pid >= 0 ? game.reach(pid) : null };
      try { view.board.setPointerCapture(e.pointerId); } catch (er) { /* 忽略 */ }
    }
    function onMove(e) {
      if (!down || e.pointerId !== down.id) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && dx * dx + dy * dy < 64) return;
      down.moved = true;
      if (down.pid < 0 || !down.reach.length) return;
      e.preventDefault();
      var b = view.board.getBoundingClientRect(), cw = b.width / W, ch = b.height / H, start = game.pieces[down.pid].cell;
      var rr = ((start / W) | 0) + dy / ch, cc = start % W + dx / cw, best = start, bd = 1e9;
      [start].concat(down.reach.map(function (x) { return x.cell; })).forEach(function (cell) {
        var d1 = ((cell / W) | 0) - rr, d2 = cell % W - cc, d = d1 * d1 + d2 * d2;
        if (d < bd) { bd = d; best = cell; }
      });
      if (best !== down.cur) {
        if (down.cur === start) { clearHint(); select(-1); }
        down.cur = best; view.place(down.pid, best, 'huarong-drag');
      }
    }
    function swipeTarget(dx, dy) { // 轻扫：取方向最贴合、路程最短的位置
      var L = Math.sqrt(dx * dx + dy * dy), start = game.pieces[down.pid].cell, best = null, bs = -1;
      down.reach.forEach(function (x) {
        var vr = ((x.cell / W) | 0) - ((start / W) | 0), vc = x.cell % W - start % W, vl = Math.sqrt(vr * vr + vc * vc);
        var cos = (vc * dx + vr * dy) / (vl * L);
        if (cos < 0.8) return;
        var score = cos * 10 - x.path.length;
        if (score > bs) { bs = score; best = x; }
      });
      return best;
    }
    function onUp(e) {
      if (!down || e.pointerId !== down.id) return;
      var d = down; down = null;
      try { view.board.releasePointerCapture(e.pointerId); } catch (er) { /* 忽略 */ }
      if (ended || busy) return;
      var dx = e.clientX - d.x, dy = e.clientY - d.y, b = view.board.getBoundingClientRect(), cw = b.width / W;
      if (d.moved && d.pid >= 0) {
        var start = game.pieces[d.pid].cell;
        view.cls(d.pid, 'huarong-drag', false);
        if (d.cur !== start) { doMove(d.pid, d.cur, false); return; }
        if (Math.sqrt(dx * dx + dy * dy) > cw * 0.25) {
          if (!d.reach.length) { blocked(d.pid, '「' + pname(d.pid) + '」四周没空格，动不了'); return; }
          down = d; var t = swipeTarget(dx, dy); down = null;
          if (t) doMove(d.pid, t.cell, true); else blocked(d.pid, '这个方向被挡住了');
          return;
        }
      }
      if (d.moved && d.pid < 0) return;
      tap(d.pid, view.cellAt(e.clientX, e.clientY));
    }
    function onCancel(e) {
      if (!down || e.pointerId !== down.id) return;
      var d = down; down = null;
      if (d.pid >= 0) { view.cls(d.pid, 'huarong-drag', false); view.place(d.pid, game.pieces[d.pid].cell); }
    }
    function tap(pid, cell) {
      if (pid >= 0) {
        if (sel === pid) { select(-1); return; }
        if (!game.reach(pid).length) { select(-1); blocked(pid, '「' + pname(pid) + '」四周没空格，先挪开旁边的棋子'); return; }
        clearHint(); select(pid); snd('select');
        onStatus('选中「' + pname(pid) + '」，点亮点的空格把它滑过去');
        return;
      }
      if (sel < 0 || cell < 0) { if (cell >= 0) onStatus('先点一枚棋子，再点空格；也可以直接拖动'); return; }
      var best = null;
      game.reach(sel).forEach(function (x) {
        if (x.cover.indexOf(cell) < 0) return;
        if (!best || x.path.length < best.path.length) best = x;
      });
      if (best) doMove(sel, best.cell, true);
      else blocked(sel, '「' + pname(sel) + '」滑不到那里');
    }
    var bd = view.board;
    bd.addEventListener('pointerdown', onDown);
    bd.addEventListener('pointermove', onMove);
    bd.addEventListener('pointerup', onUp);
    bd.addEventListener('pointercancel', onCancel);
    function onNext() { if (busy && !ended) return; idx = (idx + 1) % LV.length; store('huarong-idx-' + level, String(idx)); clearHint(); load(); snd('select'); }
    view.nextBtn.addEventListener('click', onNext);
    load();

    return {
      undo: function () {
        if (ended || busy) return;
        var u = game.undo(); if (!u) { onStatus('还没走呢，没有可撤销的'); return; }
        clearHint(); select(-1); busy = true; snd('move');
        view.slide(u.pid, u.path, function () {
          busy = false;
          var top = game.stack[game.stack.length - 1];
          if (top) view.setLast(game.pieces[top.pid].shape, top.from, top.to); else view.setLast(0);
          info(); onStatus('已撤销 · 已走 ' + game.moves() + ' 步');
        });
      },
      hint: function () {
        if (ended || busy) return;
        var h = game.hint(); if (!h) return;
        clearHint(); select(-1);
        view.showHint(h.pid, game.pieces[h.pid].cell, h.to);
        snd('select');
        onStatus('💡 动「' + pname(h.pid) + '」· 离最优解还差 ' + h.remaining + ' 步');
        hintT = setTimeout(function () { hintT = null; if (!dead) view.clearHint(); }, 2600);
      },
      restart: function () { clearHint(); load(); },
      next: onNext,
      destroy: function () {
        dead = true; clearTimers(); if (hintT) clearTimeout(hintT);
        bd.removeEventListener('pointerdown', onDown);
        bd.removeEventListener('pointermove', onMove);
        bd.removeEventListener('pointerup', onUp);
        bd.removeEventListener('pointercancel', onCancel);
        view.nextBtn.removeEventListener('click', onNext);
        el.innerHTML = '';
      }
    };
  }

  /* ===================== 规则演示 ===================== */
  function demo(el, opts) {
    opts = opts || {};
    var cap = opts.onCaption || function () {}, done = opts.onDone || function () {};
    var timers = [], stopped = false;
    function later(fn, ms) { var t = setTimeout(function () { if (!stopped) fn(); }, ms); timers.push(t); return t; }
    var view = createView(el, true, later), game = null, n = 0;
    function setup(str) { game = new Game(str); n = 0; view.setPieces(game.pieces); view.setInfo('规则演示', 0, '—'); }
    function slide(cell, to) {
      var pid = game.pieceAt(cell), mv = game.move(pid, to); if (!mv) return;
      view.clearHint(); view.setSel(-1);
      view.slide(pid, mv.path); n++; view.setInfo('规则演示', n, '—');
      view.setLast(game.pieces[pid].shape, mv.from, mv.to);
    }
    var HDLM = 'aCCbaCCbcGGdcssds..s', steps = [
      [3200, function () {
        setup(HDLM); cap('目标：把曹操（2×2）从底部中间的出口救出去');
        view.gateGlow(true);
        later(function () { view.showHint(game.pieceAt(1), 1, GOAL_CELL); }, 500);
      }],
      [3200, function () {
        setup(HDLM); cap('棋子只能滑进空格，不能跳过别人');
        later(function () { slide(16, 17); }, 700);
        later(function () { view.shake(game.pieceAt(1)); }, 1900);
      }],
      [3400, function () {
        setup('aCCbaCCbcGGdcs.d...s'); cap('一次可以滑多格，拐个弯也只算一步');
        later(function () { view.showHint(game.pieceAt(13), 13, 16, true); }, 300);
        later(function () { slide(13, 16); }, 1000);
        later(function () { slide(19, 17); }, 2100);
      }],
      [3200, function () {
        setup('aCCbaCCbcGGdc..dssss'); cap('关羽是横着放的，正好挡在曹操下面');
        later(function () { view.setSel(game.pieceAt(9)); }, 300);
        later(function () { slide(9, 13); }, 1500);
      }],
      [3000, function () {
        setup('aGGbassbcCCdcCCd.ss.'); cap('先给曹操让路：把挡住出口的卒挪开');
        later(function () { slide(17, 16); }, 700);
        later(function () { slide(18, 19); }, 1600);
      }],
      [3400, function () {
        cap('曹操到达出口，就能走出去啦！🎉');
        later(function () { slide(9, GOAL_CELL); }, 400);
        later(function () { view.setLast(0); view.exit(game.pieceAt(GOAL_CELL)); }, 1100);
      }]
    ];
    var t = 0;
    steps.forEach(function (s) { later(s[1], t); t += s[0]; });
    later(function () { view.clearHint(); done(); }, t);
    setup(HDLM);
    return { stop: function () { stopped = true; timers.forEach(clearTimeout); timers = []; } };
  }

  root.TZGAMES.huarong = {
    id: 'huarong', name: '华容道', tagline: '把曹操从下面的出口救出去',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['单人'],
    mount: mount,
    demo: demo,
    _engine: engine
  };
})();
