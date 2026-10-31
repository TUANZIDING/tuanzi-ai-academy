/* 团子棋馆 · 9 路小围棋 (go9) v1.0 — 中国数子规则，白贴 7 目；MCTS(UCT+RAVE) 电脑 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
  root.TZGAMES = root.TZGAMES || {};

  /* ===================== 引擎 ===================== */
  var N = 9, W = 11, SZ = W * W, PASS = -1, KOMI = 7;
  var NB = [1, -1, W, -W], DG = [W + 1, W - 1, 1 - W, -1 - W];
  var N8 = [1, W + 1, W, W - 1, -1, -W - 1, -W, 1 - W], CFG = { local: 0.9, pat: true };
  var ON = []; // 81 个棋盘点（带边框的下标）
  for (var _y = 0; _y < N; _y++) for (var _x = 0; _x < N; _x++) ON.push((_y + 1) * W + _x + 1);
  var COLS = 'ABCDEFGHJ';
  var BLACK = 1, WHITE = 2;

  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function P(x, y) { return (y + 1) * W + x + 1; }
  function PX(p) { return p % W - 1; }
  function PY(p) { return ((p / W) | 0) - 1; }
  function coordName(p) { return p < 0 ? '停一手' : COLS[PX(p)] + (N - PY(p)); }
  function lineOf(p) { var x = PX(p), y = PY(p); return Math.min(x, y, N - 1 - x, N - 1 - y) + 1; }

  // 小型可复现随机数
  function makeRng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  /* —— 棋盘：链表棋串 + 伪气（计数、和、平方和，可 O(1) 判断打吃） —— */
  function Board() {
    this.c = new Int8Array(SZ);
    this.head = new Int16Array(SZ);
    this.next = new Int16Array(SZ);
    this.size = new Int16Array(SZ);
    this.plib = new Int32Array(SZ);
    this.ls = new Int32Array(SZ);
    this.ls2 = new Int32Array(SZ);
    this.empty = new Int16Array(81);
    this.epos = new Int16Array(SZ);
    this.ne = 0; this.ko = -1;
    this.caps = new Int32Array(3); // caps[1] 黑提子数, caps[2] 白提子数
    this.mSize = 0; this.mCap = 0;
    this.clear();
  }
  var BP = Board.prototype;
  BP.clear = function () {
    this.c.fill(3); this.ne = 0; this.ko = -1; this.caps.fill(0);
    for (var k = 0; k < 81; k++) { var p = ON[k]; this.c[p] = 0; this.epos[p] = this.ne; this.empty[this.ne++] = p; }
  };
  BP.copyFrom = function (o) {
    this.c.set(o.c); this.head.set(o.head); this.next.set(o.next); this.size.set(o.size);
    this.plib.set(o.plib); this.ls.set(o.ls); this.ls2.set(o.ls2);
    this.empty.set(o.empty); this.epos.set(o.epos); this.ne = o.ne; this.ko = o.ko; this.caps.set(o.caps);
    return this;
  };
  BP.clone = function () { return new Board().copyFrom(this); };
  BP.atari = function (h) { var pl = this.plib[h]; return pl > 0 && pl * this.ls2[h] === this.ls[h] * this.ls[h]; };
  BP.atariLib = function (h) { return (this.ls[h] / this.plib[h]) | 0; };
  // 棋串真实气数（用于显示/测试，非热路径）
  BP.libs = function (p) {
    var h = this.head[p], s = h, seen = {}, n = 0;
    do { for (var i = 0; i < 4; i++) { var q = s + NB[i]; if (this.c[q] === 0 && !seen[q]) { seen[q] = 1; n++; } } s = this.next[s]; } while (s !== h);
    return n;
  };
  BP.stones = function (p) { var h = this.head[p], s = h, r = []; do { r.push(s); s = this.next[s]; } while (s !== h); return r; };
  BP.merge = function (a, b) {
    if (this.size[a] < this.size[b]) { var t = a; a = b; b = t; }
    var s = b; do { this.head[s] = a; s = this.next[s]; } while (s !== b);
    var tn = this.next[a]; this.next[a] = this.next[b]; this.next[b] = tn;
    this.size[a] += this.size[b]; this.plib[a] += this.plib[b]; this.ls[a] += this.ls[b]; this.ls2[a] += this.ls2[b];
  };
  BP.remove = function (h) {
    var c = this.c, s = h, i, n, v, g;
    do { c[s] = 0; this.epos[s] = this.ne; this.empty[this.ne++] = s; s = this.next[s]; } while (s !== h);
    s = h;
    do {
      for (i = 0; i < 4; i++) {
        n = s + NB[i]; v = c[n];
        if (v === 1 || v === 2) { g = this.head[n]; this.plib[g]++; this.ls[g] += s; this.ls2[g] += s * s; }
      }
      s = this.next[s];
    } while (s !== h);
  };
  // 落子（假定合法），返回提子数
  BP.play = function (p, col) {
    this.ko = -1;
    if (p < 0) return 0;
    var c = this.c, head = this.head, plib = this.plib, ls = this.ls, ls2 = this.ls2;
    var k = this.epos[p], last = this.empty[--this.ne]; this.empty[k] = last; this.epos[last] = k;
    c[p] = col; head[p] = p; this.next[p] = p; this.size[p] = 1; plib[p] = 0; ls[p] = 0; ls2[p] = 0;
    var opp = 3 - col, i, n, v, h;
    for (i = 0; i < 4; i++) {
      n = p + NB[i]; v = c[n];
      if (v === 0) { plib[p]++; ls[p] += n; ls2[p] += n * n; }
      else if (v !== 3) { h = head[n]; plib[h]--; ls[h] -= p; ls2[h] -= p * p; }
    }
    for (i = 0; i < 4; i++) { n = p + NB[i]; if (c[n] === col && head[n] !== head[p]) this.merge(head[p], head[n]); }
    var cap = 0, capAt = -1;
    for (i = 0; i < 4; i++) {
      n = p + NB[i];
      if (c[n] === opp && plib[head[n]] === 0) { cap += this.size[head[n]]; capAt = n; this.remove(head[n]); }
    }
    if (cap) {
      this.caps[col] += cap; h = head[p];
      if (cap === 1 && this.size[h] === 1 && plib[h] === 1) this.ko = capAt;
    }
    return cap;
  };
  // 试算落子：-1 非法（占位/打劫/自杀）；1 落后只剩一口气；2 两口气以上（或提子）
  // 副作用：this.mSize 合并后棋串大小，this.mCap 提子数
  BP.moveInfo = function (p, col) {
    var c = this.c;
    if (p < 0) return 2;
    if (c[p] !== 0 || p === this.ko) return -1;
    var head = this.head, opp = 3 - col, pl = 0, l = 0, l2 = 0, sz = 1, cap = 0;
    var g0 = -1, g1 = -1, g2 = -1, e0 = -1, e1 = -1, e2 = -1, i, n, v, h;
    for (i = 0; i < 4; i++) {
      n = p + NB[i]; v = c[n];
      if (v === 0) { pl++; l += n; l2 += n * n; }
      else if (v === col) {
        h = head[n]; pl--; l -= p; l2 -= p * p;
        if (h !== g0 && h !== g1 && h !== g2) {
          pl += this.plib[h]; l += this.ls[h]; l2 += this.ls2[h]; sz += this.size[h];
          if (g0 < 0) g0 = h; else if (g1 < 0) g1 = h; else g2 = h;
        }
      } else if (v === opp) {
        h = head[n];
        if (h !== e0 && h !== e1 && h !== e2 && this.atari(h)) {
          cap += this.size[h];
          if (e0 < 0) e0 = h; else if (e1 < 0) e1 = h; else e2 = h;
        }
      }
    }
    this.mSize = sz; this.mCap = cap;
    if (cap) return 2;
    if (pl === 0) return -1;
    return pl * l2 === l * l ? 1 : 2;
  };
  BP.isLegal = function (p, col) { return p < 0 || this.moveInfo(p, col) > 0; };
  // 己方真眼（近似）：四邻皆己方/边，斜角敌子：中腹 ≤1，边角 0
  BP.isEye = function (p, col) {
    var c = this.c, i, v;
    for (i = 0; i < 4; i++) { v = c[p + NB[i]]; if (v !== col && v !== 3) return false; }
    var bad = 0, edge = 0, opp = 3 - col;
    for (i = 0; i < 4; i++) { v = c[p + DG[i]]; if (v === 3) edge = 1; else if (v === opp) bad++; }
    return bad + edge < 2;
  };
  BP.ownerAt = function (p) {
    var c = this.c, v = c[p];
    if (v === 1 || v === 2) return v;
    var b = 0, w = 0;
    for (var i = 0; i < 4; i++) { var u = c[p + NB[i]]; if (u === 1) b = 1; else if (u === 2) w = 1; }
    return b && !w ? 1 : (w && !b ? 2 : 0);
  };
  // 简单数子（只在终局/随机对局末尾用）：黑 − 白 − 贴目
  BP.areaScore = function (komi) {
    var s = 0;
    for (var k = 0; k < 81; k++) { var o = this.ownerAt(ON[k]); if (o === 1) s++; else if (o === 2) s--; }
    return s - (komi === undefined ? KOMI : komi);
  };
  BP.stoneCount = function () { return 81 - this.ne; };
  BP.toArray = function () { var a = new Int8Array(81); for (var k = 0; k < 81; k++) a[k] = this.c[ON[k]]; return a; };
  BP.captureAdjacent = function (h, col) { // 救援：吃掉与 h 相邻、处于打吃的敌串
    var s = h, opp = 3 - col;
    do {
      for (var i = 0; i < 4; i++) {
        var n = s + NB[i];
        if (this.c[n] === opp) { var g = this.head[n]; if (this.atari(g)) { var lib = this.atariLib(g); if (this.moveInfo(lib, col) > 0) return lib; } }
      }
      s = this.next[s];
    } while (s !== h);
    return -1;
  };
  function boardFrom(rows) { // rows: 9 个字符串，'X' 黑 'O' 白 '.' 空（测试/演示用）
    var b = new Board();
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var ch = rows[y].charAt(x);
      if (ch === 'X' || ch === 'x') b.play(P(x, y), 1); else if (ch === 'O' || ch === 'o') b.play(P(x, y), 2);
    }
    b.ko = -1; b.caps.fill(0);
    return b;
  }

  /* —— 3×3 棋形（MoGo 经典棋形：扳、切断、边上挡）—— */
  // X/O 黑白可互换，'.' 空，'?' 任意，'x' 非 X，'o' 非 O，'#' 盘外；中心为候选点
  var PAT3 = [
    'XOX...???', 'XO....?.?', 'XO?X..x.?', '.O.X.....',
    'XO?O.o?o?', 'XO?O.X???', '?X?O.Oooo', 'OX?o.O???',
    'X.?O.?###', 'OX?X.O###', '?X?x.O###', '?XOx.x###', '?OXX.O###'
  ];
  var N8D = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  var PTAB = null, N8C = null; // N8C: 编码顺序的 8 邻偏移
  function initPatterns() {
    if (PTAB) return;
    PTAB = new Uint8Array(65536);
    N8C = N8D.map(function (d) { return d[1] * W + d[0]; });
    var SYM = [[1, 0, 0, 1], [-1, 0, 0, 1], [1, 0, 0, -1], [-1, 0, 0, -1], [0, 1, 1, 0], [0, -1, 1, 0], [0, 1, -1, 0], [0, -1, -1, 0]];
    PAT3.forEach(function (pt) {
      for (var sw = 1; sw <= 2; sw++) {
        var X = sw, O = 3 - sw;
        for (var si = 0; si < 8; si++) {
          var t = SYM[si], opts = [];
          for (var k = 0; k < 8; k++) {
            var dx = N8D[k][0], dy = N8D[k][1];
            var sx = t[0] * dx + t[1] * dy, sy = t[2] * dx + t[3] * dy;
            var ch = pt.charAt((sy + 1) * 3 + (sx + 1)), o;
            if (ch === 'X') o = [X]; else if (ch === 'O') o = [O]; else if (ch === '.') o = [0]; else if (ch === '#') o = [3];
            else if (ch === 'x') o = [0, O, 3]; else if (ch === 'o') o = [0, X, 3]; else o = [0, 1, 2, 3];
            opts.push(o);
          }
          (function rec(k, code, mul) {
            if (k === 8) { PTAB[code] = 1; return; }
            for (var j = 0; j < opts[k].length; j++) rec(k + 1, code + opts[k][j] * mul, mul * 4);
          })(0, 0, 1);
        }
      }
    });
  }
  function patCode(c, p) {
    return c[p + N8C[0]] + 4 * (c[p + N8C[1]] + 4 * (c[p + N8C[2]] + 4 * (c[p + N8C[3]] + 4 * (c[p + N8C[4]] + 4 * (c[p + N8C[5]] + 4 * (c[p + N8C[6]] + 4 * c[p + N8C[7]]))))));
  }
  function matchPat(b, p) { return PTAB[patCode(b.c, p)] === 1; }

  /* —— 随机对局（轻重结合）—— */
  // 全盘扫描：提对方最大的被打吃棋块，或救自己最大的被打吃棋块（随机对局开头两手用）
  function globalAtariMove(b, col) {
    var c = b.c, best = -1, bs = 0, k, p, v, h, lib;
    for (k = 0; k < 81; k++) {
      p = ON[k]; v = c[p];
      if (v !== 1 && v !== 2) continue;
      h = b.head[p]; if (h !== p || !b.atari(h) || b.size[h] <= bs) continue;
      if (v !== col) { lib = b.atariLib(h); if (b.moveInfo(lib, col) > 0) { best = lib; bs = b.size[h]; } }
      else {
        var cm = b.captureAdjacent(h, col);
        if (cm >= 0) { best = cm; bs = b.size[h]; }
        else { lib = b.atariLib(h); if (b.moveInfo(lib, col) === 2) { best = lib; bs = b.size[h]; } }
      }
    }
    return best;
  }
  function playoutMove(b, col, last, rng, global) {
    var c = b.c, opp = 3 - col, h, lib, i, n;
    if (global) { var gm = globalAtariMove(b, col); if (gm >= 0) return gm; }
    if (last >= 0 && rng() < 0.92) {
      // 1) 对方刚下的子处于打吃 → 提掉
      if (c[last] === opp) {
        h = b.head[last];
        if (b.atari(h)) { lib = b.atariLib(h); if (b.moveInfo(lib, col) > 0) return lib; }
      }
      // 2) 自己相邻棋串被打吃 → 反提或长出
      for (i = 0; i < 4; i++) {
        n = last + NB[i];
        if (c[n] === col) {
          h = b.head[n];
          if (b.atari(h)) {
            var cm = b.captureAdjacent(h, col); if (cm >= 0) return cm;
            lib = b.atariLib(h); if (b.moveInfo(lib, col) === 2) return lib;
          }
        }
      }
      // 3) 上一手周围 8 点里有被打吃的对方棋 → 提
      for (i = 0; i < 8; i++) {
        n = last + N8[i];
        if (c[n] === opp) { h = b.head[n]; if (b.atari(h)) { lib = b.atariLib(h); if (b.moveInfo(lib, col) > 0) return lib; } }
      }
    }
    // 4) 棋形：上一手周围 8 点里符合 3×3 好形的点（不自寻打吃）
    if (last >= 0 && rng() < CFG.local) {
      var k0 = (rng() * 8) | 0;
      for (i = 0; i < 8; i++) {
        var q = last + N8[(k0 + i) & 7];
        if (c[q] !== 0 || (CFG.pat && PTAB[patCode(c, q)] !== 1) || b.isEye(q, col)) continue;
        if (b.moveInfo(q, col) === 2) return q;
      }
    }
    var ne = b.ne; if (!ne) return PASS;
    var k = (rng() * ne) | 0;
    for (var t = 0; t < ne; t++, k++) {
      if (k >= ne) k = 0;
      var p = b.empty[k];
      if (b.isEye(p, col)) continue;
      var r = b.moveInfo(p, col);
      if (r < 0) continue;
      if (r === 1 && b.mSize >= 2) continue; // 不自填气送大串
      return p;
    }
    return PASS;
  }

  /* —— MCTS 节点：子节点统计放在一个 Float32Array 里 —— */
  // 布局：[N | W | AN | AW | RN | RW]，每段 n 个
  function Node(b, col, lastMove) {
    this.toPlay = col; this.visits = 0;
    var mv = [], pri = [], wt = [], k, p, r, stones = b.stoneCount();
    for (k = 0; k < b.ne; k++) {
      p = b.empty[k];
      if (b.isEye(p, col)) continue;
      r = b.moveInfo(p, col);
      if (r < 0) continue;
      var q = 0.5, cap = b.mCap, sz = b.mSize, w = 1;
      if (cap) { q = 0.8 + 0.03 * Math.min(cap, 5); w = 2 + 2 * Math.min(cap, 4); }
      else if (r === 1) q = sz >= 2 ? 0.12 : 0.32;
      else {
        // 救自己被打吃的棋
        for (var i = 0; i < 4; i++) { var n = p + NB[i]; if (b.c[n] === col && b.atari(b.head[n])) { q = 0.75; w = 2; break; } }
        if (q === 0.5) {
          var ln = lineOf(p);
          if (ln === 1) q = stones < 40 ? 0.25 : 0.42;
          else if (stones < 12 && ln >= 3) q = 0.58;
          if (lastMove >= 0) {
            var d = Math.abs(PX(p) - PX(lastMove)) + Math.abs(PY(p) - PY(lastMove));
            if (d <= 2) q += 0.04;
            if (d <= 2 && Math.abs(PX(p) - PX(lastMove)) <= 1 && Math.abs(PY(p) - PY(lastMove)) <= 1 && matchPat(b, p)) q += 0.08;
          }
        }
      }
      mv.push(p); pri.push(q); wt.push(w);
    }
    var m = mv.length;
    this.n = m; this.moves = new Int16Array(mv);
    this.st = new Float32Array(m * 6);
    this.kids = new Array(m);
    for (k = 0; k < m; k++) { var n0 = PRIOR_N * wt[k]; this.st[k] = n0; this.st[m + k] = n0 * pri[k]; }
  }
  var PRIOR_N = 10, RAVE_B = 0.004, UCT_C = 0.18, EXPAND = 2;

  function Search(board, col, opt) {
    opt = opt || {};
    initPatterns();
    this.rootBoard = board.clone(); this.col = col;
    this.rng = opt.rng || makeRng((Math.random() * 4294967296) >>> 0);
    this.lastMove = opt.lastMove === undefined ? -1 : opt.lastMove;
    this.root = new Node(this.rootBoard, col, this.lastMove);
    this.work = new Board();
    this.playouts = 0; this.nodes = 1;
    this.own = new Float32Array(SZ);
    this.seqP = new Int16Array(800); this.seqC = new Int8Array(800);
    this.fc = new Int8Array(SZ); this.fs = new Int32Array(SZ); this.stamp = 0;
    this.path = []; this.edges = [];
    // 动态贴目：大幅领先时给自己“加贴”，让电脑继续追求扩大优势（吃子、守地），而不是随手松懈
    this.dyn = opt.dyn || 0; this.sumS = 0;
    this.komi = KOMI + (col === 1 ? this.dyn : -this.dyn);
  }
  var SP = Search.prototype;
  SP.select = function (nd) {
    var m = nd.n, st = nd.st, best = 0, bv = -1e9, lg = Math.log(nd.visits + 1);
    for (var k = 0; k < m; k++) {
      var n = st[k], q = st[m + k] / n, an = st[2 * m + k];
      var v;
      if (an > 0) { var qa = st[3 * m + k] / an, beta = an / (an + n + an * n * RAVE_B); v = (1 - beta) * q + beta * qa; }
      else v = q;
      v += UCT_C * Math.sqrt(lg / n);
      if (v > bv) { bv = v; best = k; }
    }
    return best;
  };
  SP.iterate = function () {
    var b = this.work.copyFrom(this.rootBoard), nd = this.root, path = this.path, edges = this.edges, rng = this.rng;
    var seqP = this.seqP, seqC = this.seqC, len = 0, last = this.lastMove;
    path.length = 0; edges.length = 0;
    path.push(nd);
    while (true) {
      if (!nd.n) break;
      var k = this.select(nd), mv = nd.moves[k], col = nd.toPlay;
      b.play(mv, col); seqP[len] = mv; seqC[len] = col; len++; last = mv;
      edges.push(k);
      var m = nd.n;
      if (nd.kids[k]) { nd = nd.kids[k]; path.push(nd); continue; }
      if (nd.st[4 * m + k] >= EXPAND) { var ch = new Node(b, 3 - col, mv); nd.kids[k] = ch; this.nodes++; nd = ch; path.push(nd); }
      break;
    }
    // 随机对局
    var col2 = nd.toPlay, passes = 0, moves = 0;
    if (edges.length < path.length) col2 = nd.toPlay; else col2 = 3 - seqC[len - 1];
    while (moves < 260) {
      var pm = playoutMove(b, col2, last, rng, moves < 2);
      b.play(pm, col2);
      if (pm < 0) { if (++passes >= 2) break; }
      else { passes = 0; seqP[len] = pm; seqC[len] = col2; len++; }
      last = pm; col2 = 3 - col2; moves++;
    }
    // 计分 + 地盘统计
    var s = -this.komi, own = this.own;
    for (var q = 0; q < 81; q++) { var p = ON[q], o = b.ownerAt(p); if (o === 1) { s++; own[p]++; } else if (o === 2) { s--; own[p]--; } }
    // 以胜负为主，再加一点点目差奖励（领先时也愿意吃子、扩大优势）
    this.sumS += s + this.komi - KOMI;
    var rb = (s > 0 ? 0.92 : (s < 0 ? 0 : 0.46)) + 0.08 / (1 + Math.exp(-s / 6));
    // 回传（含 AMAF）
    var stamp = ++this.stamp, fc = this.fc, fs = this.fs, j = len - 1;
    for (var i = path.length - 1; i >= 0; i--) {
      while (j >= i) { var pp = seqP[j]; fc[pp] = seqC[j]; fs[pp] = stamp; j--; }
      var node = path[i], tp = node.toPlay, win = tp === 1 ? rb : 1 - rb, mm = node.n, st = node.st, mvs = node.moves;
      node.visits++;
      if (i < edges.length) { var e = edges[i]; st[e]++; st[mm + e] += win; st[4 * mm + e]++; st[5 * mm + e] += win; }
      for (var kk = 0; kk < mm; kk++) { var x = mvs[kk]; if (fs[x] === stamp && fc[x] === tp) { st[2 * mm + kk]++; st[3 * mm + kk] += win; } }
    }
    this.playouts++;
  };
  // 预搜索 300 次：电脑明显领先时开启动态贴目，重新建树
  function makeSearch(board, col, opt) {
    opt = opt || {};
    var S = new Search(board, col, opt);
    if (opt.noDyn) return S;
    S.run(1e9, 300);
    var mean = S.sumS / S.playouts * (col === 1 ? 1 : -1), r = S.best();
    if (r.wr > 0.85 && mean > 6) {
      var o2 = {}; for (var k in opt) o2[k] = opt[k];
      o2.dyn = Math.min(15, Math.round((mean - 6) * 0.5));
      var S2 = new Search(board, col, o2); S2.pre = S.playouts; return S2;
    }
    return S;
  }
  SP.run = function (ms, maxPlayouts) {
    var t0 = now(), lim = maxPlayouts || 1e9;
    while (this.playouts < lim) {
      for (var i = 0; i < 16 && this.playouts < lim; i++) this.iterate();
      if (now() - t0 >= ms) break;
    }
    return this.playouts >= lim;
  };
  SP.ranked = function () { // 按真实访问数排序的着法
    var nd = this.root, m = nd.n, st = nd.st, arr = [];
    for (var k = 0; k < m; k++) {
      var rn = st[4 * m + k];
      arr.push({ move: nd.moves[k], visits: rn, wr: rn ? st[5 * m + k] / rn : st[m + k] / st[k], q: st[m + k] / st[k] });
    }
    arr.sort(function (a, b) { return (b.visits - a.visits) || (b.q - a.q); });
    return arr;
  };
  SP.ownership = function () { // [-1,1]，正为黑
    var o = new Float32Array(SZ), n = Math.max(1, this.playouts);
    for (var k = 0; k < 81; k++) o[ON[k]] = this.own[ON[k]] / n;
    return o;
  };
  SP.best = function () {
    var r = this.ranked();
    if (!r.length) return { move: PASS, wr: 0.5, ranked: r };
    return { move: r[0].move, wr: r[0].wr, ranked: r };
  };

  /* —— 地盘估计 / 死子判断 / 数子 —— */
  function ownershipMC(board, n, rng) {
    initPatterns();
    rng = rng || makeRng(12345);
    var b = new Board(), own = new Float32Array(SZ);
    for (var t = 0; t < n; t++) {
      b.copyFrom(board); b.ko = -1;
      var col = (t & 1) ? 2 : 1, passes = 0, last = -1, moves = 0;
      while (moves < 260) {
        var m = playoutMove(b, col, last, rng, moves < 2); b.play(m, col);
        if (m < 0) { if (++passes >= 2) break; } else passes = 0;
        last = m; col = 3 - col; moves++;
      }
      for (var k = 0; k < 81; k++) { var o = b.ownerAt(ON[k]); if (o === 1) own[ON[k]]++; else if (o === 2) own[ON[k]]--; }
    }
    for (var q = 0; q < 81; q++) own[ON[q]] /= n;
    return own;
  }
  var DEAD_T = 0.35;
  // 返回 {black, white, diff(黑−白−贴), dead[SZ], terr[SZ](1黑/2白/0), own}
  function scoreGame(board, own, komi) {
    komi = komi === undefined ? KOMI : komi;
    var c = board.c, dead = new Int8Array(SZ), alive = new Int8Array(SZ), terr = new Int8Array(SZ), seen = new Int8Array(SZ), k, p;
    for (k = 0; k < 81; k++) {
      p = ON[k]; var v = c[p];
      if ((v === 1 || v === 2) && !seen[p]) {
        var st = board.stones(p), sum = 0;
        st.forEach(function (s) { seen[s] = 1; sum += own ? own[s] : (v === 1 ? 1 : -1); });
        var avg = sum / st.length * (v === 1 ? 1 : -1);
        // 地盘明显归对方 → 死子；小块（≤4 子）只要对方占优即判死（大空里的孤子随机模拟常“误活”）
        var isDead = own && (avg < -DEAD_T || (st.length <= 4 && avg < -0.05));
        st.forEach(function (s) { if (isDead) dead[s] = 1; });
      }
    }
    // 第二步：被对方活棋封闭、又做不出两只眼的棋块 → 死（弥补大空里随机模拟的误差）
    if (own) {
      var done = new Int8Array(SZ);
      for (k = 0; k < 81; k++) {
        p = ON[k]; var col = c[p];
        if ((col !== 1 && col !== 2) || dead[p] || done[p]) continue;
        var sg = col === 1 ? 1 : -1, stack = [p], area = [], mine = [], sealed = true, eyes = 0, ownSum = 0;
        var vis = new Int8Array(SZ); vis[p] = 1;
        while (stack.length) {
          var q = stack.pop(); area.push(q);
          if (c[q] === col) { mine.push(q); done[q] = 1; ownSum += own[q] * sg; }
          for (var i = 0; i < 4; i++) {
            var n = q + NB[i], cn = c[n];
            if (cn === 3 || vis[n]) continue;
            if (cn === 0 || cn === col) { vis[n] = 1; stack.push(n); }
            else if (dead[n]) { vis[n] = 1; stack.push(n); }
            else if (own[n] * -sg < 0.3) sealed = false;
          }
        }
        if (!sealed || ownSum / mine.length >= 0.5) continue;
        var es = 0, en = 0;
        for (var a0 = 0; a0 < area.length; a0++) if (c[area[a0]] !== col) { es += own[area[a0]] * sg; en++; }
        if (en && es / en >= 0) continue; // 空里更偏向自己：是自己的地，不是被困
        for (var a = 0; a < area.length; a++) {
          var e = area[a]; if (c[e] !== 0) continue;
          var isE = true; for (var i2 = 0; i2 < 4; i2++) { var u = c[e + NB[i2]]; if (u !== col && u !== 3) { isE = false; break; } }
          if (isE) eyes++;
        }
        if (eyes < 2) mine.forEach(function (s) { dead[s] = 1; });
      }
    }
    for (k = 0; k < 81; k++) { p = ON[k]; alive[p] = (c[p] === 1 || c[p] === 2) && !dead[p] ? c[p] : 0; }
    var reg = new Int8Array(SZ);
    for (k = 0; k < 81; k++) {
      p = ON[k];
      if (alive[p] || reg[p]) continue;
      var stack = [p], cells = [], tb = 0, tw = 0; reg[p] = 1;
      while (stack.length) {
        var q = stack.pop(); cells.push(q);
        for (var i = 0; i < 4; i++) {
          var n = q + NB[i]; if (c[n] === 3) continue;
          if (alive[n] === 1) tb = 1; else if (alive[n] === 2) tw = 1;
          else if (!reg[n]) { reg[n] = 1; stack.push(n); }
        }
      }
      for (var j = 0; j < cells.length; j++) {
        var cc = cells[j];
        if (tb && !tw) terr[cc] = 1; else if (tw && !tb) terr[cc] = 2;
        else if (own) terr[cc] = own[cc] >= 0.5 ? 1 : (own[cc] <= -0.5 ? 2 : 0); // 边界未封闭时按地盘估计
      }
    }
    var black = 0, white = 0;
    for (k = 0; k < 81; k++) { p = ON[k]; var o2 = alive[p] || terr[p]; if (o2 === 1) black++; else if (o2 === 2) white++; }
    return { black: black, white: white, diff: black - white - komi, dead: dead, terr: terr, alive: alive, own: own, komi: komi };
  }
  function scoreText(sc) {
    var d = sc.diff, head = '黑 ' + sc.black + ' : 白 ' + sc.white + '+' + sc.komi + '，';
    if (d > 0) return head + '黑胜 ' + d + ' 目';
    if (d < 0) return head + '白胜 ' + (-d) + ' 目';
    return head + '和棋';
  }
  function finalScore(board, playouts, rng) {
    var own = ownershipMC(board, playouts || 1200, rng);
    return scoreGame(board, own, KOMI);
  }

  /* —— 难度 / 落子决策 —— */
  var LEVELS = [
    { playouts: 200, ms: 400, noise: 0.3 },
    { playouts: 2000, ms: 1500, noise: 0 },
    { playouts: 8000, ms: 1500, noise: 0 },
    { playouts: 1e9, ms: 1500, noise: 0 }
  ];
  // 还有没有值得下的点：所有空点都已归属明确，且没有被打吃的棋
  function noBeneficial(b, own) {
    var k, p;
    for (k = 0; k < 81; k++) {
      p = ON[k]; var v = b.c[p];
      if ((v === 1 || v === 2) && b.atari(b.head[p])) return false;
    }
    for (k = 0; k < 81; k++) {
      p = ON[k]; if (b.c[p] !== 0) continue;
      if (Math.abs(own[p]) >= 0.7) continue;
      var r1 = b.moveInfo(p, 1), s1 = b.mSize, r2 = b.moveInfo(p, 2), s2 = b.mSize;
      var ok1 = r1 === 2 || (r1 === 1 && s1 < 2), ok2 = r2 === 2 || (r2 === 1 && s2 < 2);
      if (ok1 || ok2) return false;
    }
    return true;
  }
  // ctx: {oppPassed, moveNo}；返回 {move, resign, wr, playouts, own}
  function decide(S, level, ctx, rng) {
    ctx = ctx || {};
    rng = rng || Math.random;
    var col = S.col, b = S.rootBoard, res = S.best(), own = S.ownership(), out = { move: res.move, resign: false, wr: res.wr, playouts: S.playouts, own: own };
    if (!S.root.n) { out.move = PASS; return out; }
    var sign = col === 1 ? 1 : -1;
    if (ctx.oppPassed) {
      var sc = scoreGame(b, own, KOMI);
      if (sc.diff * sign > 0) { out.move = PASS; out.why = 'win-pass'; return out; }
    }
    if (level >= 2 && (ctx.moveNo || 0) >= 24 && res.wr < 0.05 && S.playouts >= 1500) { out.resign = true; return out; }
    if (noBeneficial(b, own)) { out.move = PASS; out.why = 'settled'; return out; }
    if (level >= 1) {
      // 简明优先：提子 / 救出被打吃的棋，只要胜率与最佳着相差不大就选它（人类看来更自然，也更稳）
      var rk = res.ranked, bestT = null, bestSz = 0, minV = Math.max(12, S.playouts * 0.005);
      for (var i = 0; i < rk.length && i < 25; i++) {
        var o = rk[i]; if (o.visits < minV) continue;
        var ri = b.moveInfo(o.move, col), sz = b.mCap;
        if (!sz && ri === 2) {
          for (var j = 0; j < 4; j++) { var nn = o.move + NB[j]; if (b.c[nn] === col && b.atari(b.head[nn]) && b.size[b.head[nn]] >= 2) sz = Math.max(sz, b.size[b.head[nn]]); }
        }
        var tol = Math.min(0.1, 0.015 + 0.015 * sz) + (res.wr > 0.8 ? 0.03 : 0);
        if (sz > bestSz && res.wr - o.wr <= tol) { bestSz = sz; bestT = o; }
      }
      if (bestT && bestT.move !== out.move) { out.move = bestT.move; out.wr = bestT.wr; out.why = 'tactical'; }
    }
    if (level === 0) {
      var r = res.ranked, x = rng();
      if (x < LEVELS[0].noise) {
        // 故意下一步随手棋（但不填自己的眼、不自杀）
        out.move = r[(rng() * r.length) | 0].move; out.why = 'noise';
      } else if (x < 0.6 && r.length > 1) {
        out.move = r[Math.min(r.length - 1, 1 + ((rng() * 3) | 0))].move; out.why = 'top4';
      }
    }
    return out;
  }
  function chooseMove(board, col, level, opt) {
    opt = opt || {};
    var L = LEVELS[Math.max(0, Math.min(3, level | 0))];
    var t0 = now();
    var S = makeSearch(board, col, { rng: opt.rng, lastMove: opt.lastMove, noDyn: level === 0 });
    var lim = opt.playouts || L.playouts;
    S.run(Math.max(1, (opt.time || L.ms) - (now() - t0)), Math.max(1, lim - (S.pre || 0)));
    var d = decide(S, level, { oppPassed: !!opt.oppPassed, moveNo: opt.moveNo || 0 }, opt.rng);
    d.nodes = S.nodes;
    return d;
  }
  // 分片搜索，每片 ≤24ms 后让出主线程
  function searchAsync(S, ms, maxPlayouts, done, alive) {
    var t0 = now();
    function chunk() {
      if (alive && !alive()) return;
      var left = ms - (now() - t0);
      var fin = S.run(Math.max(1, Math.min(24, left)), maxPlayouts);
      if (fin || now() - t0 >= ms) done(); else setTimeout(chunk, 0);
    }
    setTimeout(chunk, 30);
  }

  var engine = {
    N: N, W: W, SZ: SZ, PASS: PASS, KOMI: KOMI, ON: ON, P: P, PX: PX, PY: PY, NB: NB, coordName: coordName,
    Board: Board, boardFrom: boardFrom, makeRng: makeRng, playoutMove: playoutMove, Search: Search, decide: decide,
    initPatterns: initPatterns, matchPat: matchPat, chooseMove: chooseMove, makeSearch: makeSearch, ownershipMC: ownershipMC, scoreGame: scoreGame, scoreText: scoreText, finalScore: finalScore,
    noBeneficial: noBeneficial, LEVELS: LEVELS, CFG: CFG
  };

  /* ===================== 视图 ===================== */
  var CSS = [
    '.go9-wrap{width:var(--bw,min(92vw,560px));margin:0 auto;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}',
    '.go9-board{position:relative;width:100%;padding-top:100%;border-radius:var(--radius,18px);',
    'background:repeating-linear-gradient(88deg,rgba(140,85,35,.08) 0 2px,rgba(255,255,255,0) 2px 9px),repeating-linear-gradient(2deg,rgba(255,255,255,.08) 0 5px,rgba(255,255,255,0) 5px 17px),radial-gradient(ellipse at 30% 20%,#f9dca6 0,#eebf78 55%,#dda45c 100%);',
    'box-shadow:0 10px 24px rgba(120,70,20,.25),inset 0 0 0 3px rgba(255,255,255,.35),inset 0 -6px 14px rgba(120,70,20,.18);touch-action:manipulation;cursor:pointer}',
    '.go9-area{position:absolute;left:4%;top:4%;width:92%;height:92%}',
    '.go9-svg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible}',
    '.go9-coord{font-size:2.6px;fill:#8a5a2b;font-weight:700;opacity:.7}',
    '.go9-stone{position:absolute;width:10.4%;height:10.4%;margin:-5.2% 0 0 -5.2%;border-radius:50%;pointer-events:none;z-index:2;transition:opacity .2s,transform .2s}',
    '.go9-black{background:radial-gradient(circle at 34% 30%,#8a8a98 0,#3a3a46 22%,#14141c 60%,#050508 100%);box-shadow:0 3px 4px rgba(0,0,0,.45),inset -3px -4px 7px rgba(0,0,0,.55)}',
    '.go9-white{background:radial-gradient(circle at 34% 30%,#fff 0,#fbf9f3 30%,#e8e2d4 70%,#c9c0ae 100%);box-shadow:0 3px 4px rgba(0,0,0,.28),inset -3px -4px 7px rgba(0,0,0,.12)}',
    '.go9-last::after{content:"";position:absolute;left:50%;top:50%;width:30%;height:30%;margin:-15% 0 0 -15%;border-radius:50%;background:var(--red,#e5484d);box-shadow:0 0 4px rgba(229,72,77,.9)}',
    '.go9-black.go9-last{box-shadow:0 0 0 3px rgba(255,197,61,.6),0 3px 4px rgba(0,0,0,.45),inset -3px -4px 7px rgba(0,0,0,.55)}',
    '.go9-white.go9-last{box-shadow:0 0 0 3px rgba(255,197,61,.75),0 3px 4px rgba(0,0,0,.28),inset -3px -4px 7px rgba(0,0,0,.12)}',
    '.go9-drop{animation:go9-drop .22s cubic-bezier(.3,1.5,.6,1)}',
    '@keyframes go9-drop{0%{transform:scale(1.35) translateY(-20%);opacity:0}100%{transform:none;opacity:1}}',
    '.go9-gone{opacity:0;transform:scale(.4) translateY(-30%)}',
    '.go9-ghost{opacity:.42;z-index:1}',
    '.go9-ghost.go9-confirm{opacity:.62;box-shadow:0 0 0 3px var(--yellow,#ffc53d)}',
    '.go9-dead{opacity:.42}',
    '.go9-dead::before{content:"";position:absolute;left:22%;top:22%;width:56%;height:56%;background:linear-gradient(45deg,transparent 44%,var(--red,#e5484d) 44% 56%,transparent 56%),linear-gradient(-45deg,transparent 44%,var(--red,#e5484d) 44% 56%,transparent 56%)}',
    '.go9-terr{position:absolute;width:3.8%;height:3.8%;margin:-1.9% 0 0 -1.9%;border-radius:2px;pointer-events:none;z-index:3;animation:go9-pop .3s ease-out both}',
    '.go9-terr.go9-tb{background:#1d1d26;box-shadow:0 0 0 1px rgba(255,255,255,.35)}',
    '.go9-terr.go9-tw{background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)}',
    '@keyframes go9-pop{from{transform:scale(0)}to{transform:none}}',
    '.go9-mark{position:absolute;width:12%;height:12%;margin:-6% 0 0 -6%;border-radius:50%;border:3px solid var(--yellow,#ffc53d);box-sizing:border-box;pointer-events:none;z-index:4;animation:go9-pulse .8s ease-in-out infinite alternate}',
    '.go9-mark.go9-red{border-color:var(--red,#e5484d)}.go9-mark.go9-green{border-color:var(--green,#22a06b);background:rgba(34,160,107,.18)}',
    '.go9-mark.go9-purple{border-color:var(--purple,#8b5cf6);background:rgba(139,92,246,.28);box-shadow:0 0 10px rgba(139,92,246,.6)}',
    '.go9-dot{position:absolute;width:4.4%;height:4.4%;margin:-2.2% 0 0 -2.2%;border-radius:50%;background:rgba(34,160,107,.55);pointer-events:none;z-index:3;animation:go9-pop .25s ease-out both}',
    '.go9-dot.go9-red{background:rgba(229,72,77,.8)}',
    '.go9-x{position:absolute;width:8%;height:8%;margin:-4% 0 0 -4%;pointer-events:none;z-index:4;background:linear-gradient(45deg,transparent 42%,var(--red,#e5484d) 42% 58%,transparent 58%),linear-gradient(-45deg,transparent 42%,var(--red,#e5484d) 42% 58%,transparent 58%);animation:go9-pop .25s ease-out both}',
    '@keyframes go9-pulse{from{transform:scale(.85);opacity:.7}to{transform:scale(1.08);opacity:1}}',
    '.go9-toast{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:6;background:rgba(43,35,64,.88);color:#fff;font-size:14px;font-weight:700;padding:8px 14px;border-radius:999px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .18s}',
    '.go9-toast.go9-show{opacity:1}',
    '.go9-info{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;font-size:13px;color:var(--muted,#7a6f86)}',
    '.go9-chip{display:inline-flex;align-items:center;gap:5px;background:var(--card,#fff);border:1px solid var(--line,#e9dcc8);border-radius:999px;padding:3px 10px}',
    '.go9-chip.go9-turn{border-color:var(--yellow,#ffc53d);box-shadow:0 0 0 2px rgba(255,197,61,.35);color:var(--ink,#2b2340)}',
    '.go9-sw{display:inline-block;width:11px;height:11px;border-radius:50%}',
    '.go9-sw.go9-b{background:#1a1a22}.go9-sw.go9-w{background:#fff;border:1px solid #bbb}',
    '.go9-pass{font:inherit;font-size:13px;font-weight:700;color:var(--ink,#2b2340);background:#fff4d6;border:2px solid var(--yellow,#ffc53d);border-radius:999px;padding:4px 14px;cursor:pointer;touch-action:manipulation}',
    '.go9-pass:disabled{opacity:.45;cursor:default}',
    '.go9-pass:not(:disabled):active{transform:scale(.96)}'
  ].join('\n');
  function injectCss() {
    if (typeof document === 'undefined') return;
    if (document.querySelector('style[data-go9-css]')) return;
    var st = document.createElement('style');
    st.setAttribute('data-go9-css', '1'); st.textContent = CSS;
    document.head.appendChild(st);
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) { var e = document.createElementNS(SVGNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function pct(v) { return ((v + 0.5) * 100 / N) + '%'; }

  function createView(el, withPass) {
    el.innerHTML = '';
    var wrap = document.createElement('div'); wrap.className = 'go9-wrap';
    var board = document.createElement('div'); board.className = 'go9-board';
    var area = document.createElement('div'); area.className = 'go9-area';
    var grid = svgEl('svg', { viewBox: '0 0 90 90', class: 'go9-svg' });
    for (var k = 0; k < N; k++) {
      var p = k * 10 + 5, w = (k === 0 || k === N - 1) ? 0.75 : 0.45;
      grid.appendChild(svgEl('line', { x1: 5, y1: p, x2: 85, y2: p, stroke: '#7a4b1e', 'stroke-width': w, 'stroke-opacity': 0.85, 'stroke-linecap': 'square' }));
      grid.appendChild(svgEl('line', { x1: p, y1: 5, x2: p, y2: 85, stroke: '#7a4b1e', 'stroke-width': w, 'stroke-opacity': 0.85, 'stroke-linecap': 'square' }));
      var t1 = svgEl('text', { x: p, y: -0.6, 'text-anchor': 'middle', class: 'go9-coord' }); t1.textContent = COLS[k]; grid.appendChild(t1);
      var t2 = svgEl('text', { x: -1.6, y: p + 0.9, 'text-anchor': 'middle', class: 'go9-coord' }); t2.textContent = String(N - k); grid.appendChild(t2);
    }
    [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]].forEach(function (s) {
      grid.appendChild(svgEl('circle', { cx: s[0] * 10 + 5, cy: s[1] * 10 + 5, r: 1.15, fill: '#6b3f17' }));
    });
    area.appendChild(grid);
    board.appendChild(area);
    var toastEl = document.createElement('div'); toastEl.className = 'go9-toast'; board.appendChild(toastEl);
    var info = document.createElement('div'); info.className = 'go9-info';
    var chips = document.createElement('span'); chips.style.display = 'contents';
    info.appendChild(chips);
    var passBtn = null;
    if (withPass) { passBtn = document.createElement('button'); passBtn.type = 'button'; passBtn.className = 'go9-pass'; passBtn.textContent = '停一手'; info.appendChild(passBtn); }
    wrap.appendChild(board); wrap.appendChild(info);
    el.appendChild(wrap);

    var shown = {}, lastIdx = -1, ghostEl = null, marks = [], overlay = [], toastT = null;
    function place(e, p) { e.style.left = pct(PX(p)); e.style.top = pct(PY(p)); }
    var v = {
      board: board, passBtn: passBtn,
      addStone: function (p, c, anim) {
        var e = document.createElement('div');
        e.className = 'go9-stone ' + (c === 1 ? 'go9-black' : 'go9-white') + (anim ? ' go9-drop' : '');
        e.setAttribute('data-c', c);
        place(e, p); area.appendChild(e); shown[p] = e; return e;
      },
      removeStone: function (p, anim) {
        var e = shown[p]; if (!e) return; delete shown[p];
        if (anim) { e.classList.add('go9-gone'); setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 230); }
        else if (e.parentNode) e.parentNode.removeChild(e);
      },
      // 与棋盘同步：新子落下动画，被提子淡出
      sync: function (b, anim) {
        for (var k = 0; k < 81; k++) {
          var p = ON[k], c = b.c[p], e = shown[p];
          if (e && (!c || +e.getAttribute('data-c') !== c)) v.removeStone(p, anim);
          if (c && !shown[p]) v.addStone(p, c, anim);
        }
      },
      setLast: function (p) {
        if (lastIdx >= 0 && shown[lastIdx]) shown[lastIdx].classList.remove('go9-last');
        lastIdx = p; if (p >= 0 && shown[p]) shown[p].classList.add('go9-last');
      },
      setGhost: function (p, c, confirm) {
        if (ghostEl) { ghostEl.remove(); ghostEl = null; }
        if (p < 0) return;
        ghostEl = document.createElement('div');
        ghostEl.className = 'go9-stone go9-ghost ' + (c === 1 ? 'go9-black' : 'go9-white') + (confirm ? ' go9-confirm' : '');
        place(ghostEl, p); area.appendChild(ghostEl);
      },
      mark: function (p, kind, cls) {
        var e = document.createElement('div');
        e.className = (cls || 'go9-mark') + (kind ? ' go9-' + kind : '');
        place(e, p); area.appendChild(e); marks.push(e); return e;
      },
      clearMarks: function () { marks.forEach(function (e) { e.remove(); }); marks = []; },
      showScore: function (sc) {
        v.clearScore();
        for (var k = 0; k < 81; k++) {
          var p = ON[k];
          if (sc.dead[p] && shown[p]) { shown[p].classList.add('go9-dead'); overlay.push(shown[p]); }
          if (sc.terr[p] && !sc.alive[p]) {
            var e = document.createElement('div');
            e.className = 'go9-terr ' + (sc.terr[p] === 1 ? 'go9-tb' : 'go9-tw');
            e.style.animationDelay = (k * 6) + 'ms';
            place(e, p); area.appendChild(e); overlay.push(e);
          }
        }
      },
      clearScore: function () {
        overlay.forEach(function (e) { if (e.classList.contains('go9-terr')) e.remove(); else e.classList.remove('go9-dead'); });
        overlay = [];
      },
      toast: function (t) {
        toastEl.textContent = t; toastEl.classList.add('go9-show');
        if (toastT) clearTimeout(toastT);
        toastT = setTimeout(function () { toastEl.classList.remove('go9-show'); }, 1500);
      },
      reset: function () {
        for (var s in shown) shown[s].remove();
        shown = {}; lastIdx = -1; v.setGhost(-1); v.clearMarks(); v.clearScore();
      },
      info: function (html) { chips.innerHTML = html; },
      idxFromEvent: function (ev) {
        var r = area.getBoundingClientRect();
        var fx = (ev.clientX - r.left) / r.width * N, fy = (ev.clientY - r.top) / r.height * N;
        if (fx < -0.4 || fy < -0.4 || fx > N + 0.4 || fy > N + 0.4) return -1;
        var x = Math.min(N - 1, Math.max(0, Math.floor(fx))), y = Math.min(N - 1, Math.max(0, Math.floor(fy)));
        return P(x, y);
      },
      destroy: function () { if (toastT) clearTimeout(toastT); el.innerHTML = ''; }
    };
    return v;
  }

  /* ===================== mount ===================== */
  function mount(el, opts) {
    injectCss();
    opts = opts || {};
    var level = Math.max(0, Math.min(3, opts.level | 0));
    var side = opts.side === 1 ? 1 : 0;
    var human = side === 0 ? BLACK : WHITE, ai = 3 - human;
    var b = new Board(), moves = [], toPlay = BLACK, over = false, thinking = false, destroyed = false, gen = 0;
    var timers = [], ghost = -1, downType = 'mouse', hintTimer = null;
    var view = createView(el, true);

    function status(t) { try { opts.onStatus && opts.onStatus(t); } catch (e) { } }
    function snd(n) { try { opts.sound && opts.sound(n); } catch (e) { } }
    function end(r) { try { opts.onEnd && opts.onEnd(r); } catch (e) { } }
    function later(fn, ms) { var t = setTimeout(function () { var i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); if (!destroyed) fn(); }, ms); timers.push(t); return t; }
    function colName(c) { return c === BLACK ? '黑方' : '白方'; }
    function lastMove() { return moves.length ? moves[moves.length - 1].p : -1; }
    function updateInfo() {
      var lm = moves.length ? ' · 上一手 ' + coordName(lastMove()) : '';
      view.info(
        '<span class="go9-chip' + (toPlay === 1 && !over ? ' go9-turn' : '') + '"><i class="go9-sw go9-b"></i>' + (human === 1 ? '你' : '电脑') + ' · 提 ' + b.caps[1] + '</span>' +
        '<span class="go9-chip' + (toPlay === 2 && !over ? ' go9-turn' : '') + '"><i class="go9-sw go9-w"></i>' + (human === 2 ? '你' : '电脑') + ' · 提 ' + b.caps[2] + '</span>' +
        '<span class="go9-chip">第 ' + moves.length + ' 手' + lm + ' · 白贴 7</span>');
      if (view.passBtn) view.passBtn.disabled = over || thinking || toPlay !== human;
    }
    function inAtariCount(c) {
      var seen = {}, n = 0;
      for (var k = 0; k < 81; k++) { var p = ON[k]; if (b.c[p] === c && !seen[b.head[p]]) { seen[b.head[p]] = 1; if (b.atari(b.head[p])) n += b.size[b.head[p]]; } }
      return n;
    }
    function yourTurn(prefix) {
      var a = inAtariCount(human);
      if (a) status((prefix || '') + '小心！你有 ' + a + ' 子只剩一口气 · 轮到你走');
      else status((prefix || '') + '轮到你走 · ' + colName(human));
    }
    function doMove(p, col) {
      var cap = b.play(p, col);
      moves.push({ p: p, col: col });
      toPlay = 3 - col;
      view.sync(b, true); view.setLast(p);
      if (p >= 0) snd(cap ? 'capture' : 'move');
      updateInfo();
      return cap;
    }
    function rebuild() {
      b = new Board(); toPlay = BLACK;
      for (var i = 0; i < moves.length; i++) { b.play(moves[i].p, moves[i].col); toPlay = 3 - moves[i].col; }
      view.reset(); view.sync(b, false); view.setLast(lastMove()); updateInfo();
    }
    function finish() {
      over = true; thinking = true; updateInfo();
      status('双方停一手 · 正在数子…');
      var myGen = gen;
      later(function () {
        if (myGen !== gen) return;
        var sc = finalScore(b, 1600);
        thinking = false;
        view.showScore(sc); updateInfo();
        var txt = scoreText(sc), winCol = sc.diff > 0 ? BLACK : (sc.diff < 0 ? WHITE : 0);
        var winner = !winCol ? 'draw' : (winCol === human ? 'player' : 'ai');
        status(txt);
        snd(winner === 'player' ? 'win' : winner === 'ai' ? 'lose' : 'move');
        end({ winner: winner, reason: txt });
      }, 40);
    }
    function aiMove() {
      thinking = true; updateInfo(); status('电脑思考中…');
      var myGen = gen, L = LEVELS[level];
      var oppPassed = moves.length > 0 && lastMove() < 0;
      var S = makeSearch(b, ai, { lastMove: lastMove(), noDyn: level === 0 });
      searchAsync(S, L.ms - 60, Math.max(1, L.playouts - (S.pre || 0)), function () {
        if (destroyed || myGen !== gen) return;
        var d = decide(S, level, { oppPassed: oppPassed, moveNo: moves.length });
        thinking = false;
        if (d.resign) {
          over = true; updateInfo(); snd('win');
          var r = '电脑（' + colName(ai) + '）认输，局势已无法挽回';
          status(r + ' 🎉'); end({ winner: 'player', reason: r }); return;
        }
        if (d.move === PASS) {
          doMove(PASS, ai);
          if (oppPassed) { finish(); return; }
          snd('select');
          view.toast('电脑停一手');
          status('电脑停一手 · 你也停一手就终局数子');
          return;
        }
        var cap = doMove(d.move, ai);
        yourTurn(cap ? '电脑提掉你 ' + cap + ' 子 · ' : '');
      }, function () { return !destroyed && myGen === gen; });
    }
    function illegalReason(p, col) {
      if (b.c[p]) return '';
      if (p === b.ko) return '打劫，要先在别处走一步';
      if (b.moveInfo(p, col) < 0) return '这里是禁着点（自杀）';
      return '';
    }
    function tryHuman(p) {
      if (b.c[p]) { snd('illegal'); return false; }
      var why = illegalReason(p, human);
      if (why) { snd('illegal'); view.toast(why); status(why); return false; }
      return true;
    }
    function playHuman(p) {
      clearHint();
      var cap = doMove(p, human);
      if (cap) status('你提掉 ' + cap + ' 子！');
      aiMove();
    }
    function playerPass() {
      if (over || thinking || toPlay !== human || destroyed) return;
      clearHint(); clearGhost();
      var aiPassed = moves.length > 0 && lastMove() < 0;
      doMove(PASS, human); snd('select');
      if (aiPassed) { finish(); return; }
      aiMove();
    }
    function clearGhost() { ghost = -1; view.setGhost(-1); }
    function clearHint() { if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; } view.clearMarks(); }
    function onDown(ev) { downType = ev.pointerType || 'mouse'; }
    function onUp(ev) {
      var p = view.idxFromEvent(ev), type = ev.pointerType || downType;
      if (p < 0) { clearGhost(); return; }
      if (over || thinking || toPlay !== human) { if (!over && b.c[p]) snd('illegal'); return; }
      if (!tryHuman(p)) { clearGhost(); return; }
      if (type === 'touch' || type === 'pen') {
        if (ghost !== p) { ghost = p; view.setGhost(p, human, true); snd('select'); status('再点一次确认落子 · ' + coordName(p)); return; }
      }
      clearGhost();
      playHuman(p);
    }
    function onMove(ev) {
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      if (over || thinking || toPlay !== human) { if (ghost >= 0) clearGhost(); return; }
      var p = view.idxFromEvent(ev);
      if (p >= 0 && !b.c[p]) { if (p !== ghost) { ghost = p; view.setGhost(p, human, false); } }
      else if (ghost >= 0) clearGhost();
    }
    function onLeave(ev) { if (!ev.pointerType || ev.pointerType === 'mouse') clearGhost(); }
    function onPass(ev) { ev.preventDefault(); playerPass(); }
    view.board.addEventListener('pointerdown', onDown);
    view.board.addEventListener('pointerup', onUp);
    view.board.addEventListener('pointermove', onMove);
    view.board.addEventListener('pointerleave', onLeave);
    view.passBtn.addEventListener('click', onPass);

    function start() {
      gen++;
      timers.forEach(clearTimeout); timers = [];
      b = new Board(); moves = []; toPlay = BLACK; over = false; thinking = false; ghost = -1;
      view.reset(); updateInfo();
      if (ai === BLACK) { status('中国数子规则 · 白贴 7 目 · 电脑执黑先走'); aiMove(); }
      else status('中国数子规则 · 白贴 7 目 · 轮到你走 · 黑方');
    }
    start();

    function describeHint(p) {
      if (p < 0) return '提示：没有要紧的地方了，可以停一手';
      var r = b.moveInfo(p, human);
      if (b.mCap) return '提示：这里能吃掉 ' + b.mCap + ' 子';
      for (var i = 0; i < 4; i++) {
        var n = p + NB[i];
        if (b.c[n] === human && b.atari(b.head[n]) && r === 2) return '提示：这里能救出被打吃的 ' + b.size[b.head[n]] + ' 子';
      }
      var t = b.clone(); t.play(p, human);
      for (i = 0; i < 4; i++) {
        n = p + NB[i];
        if (t.c[n] === ai && t.atari(t.head[n])) return '提示：这里可以打吃对方 ' + t.size[t.head[n]] + ' 子';
      }
      return '';
    }
    return {
      undo: function () {
        if (thinking || destroyed) return;
        var k = -1;
        for (var j = moves.length - 1; j >= 0; j--) if (moves[j].col === human) { k = j; break; }
        if (k < 0) return;
        gen++; timers.forEach(clearTimeout); timers = [];
        moves = moves.slice(0, k); over = false; ghost = -1; clearHint();
        rebuild();
        status('已悔棋 · 轮到你走 · ' + colName(human));
      },
      restart: function () { start(); },
      hint: function () {
        if (over || thinking || destroyed || toPlay !== human) return;
        status('正在想提示…'); thinking = true; updateInfo();
        var myGen = gen;
        var S = makeSearch(b, human, { lastMove: lastMove() });
        searchAsync(S, 760, 1e9, function () {
          if (destroyed || myGen !== gen) return;
          thinking = false; updateInfo();
          var res = S.best(), p = res.move, own = S.ownership();
          if (p >= 0 && noBeneficial(b, own)) p = PASS;
          clearHint();
          var txt = describeHint(p);
          if (p >= 0) {
            view.mark(p, 'purple'); snd('select');
            if (!txt) txt = Math.abs(own[p]) < 0.45 ? '提示：' + coordName(p) + ' 是双方必争的要点' : '提示：' + coordName(p) + ' 这里扩大地盘';
          }
          status(txt);
          hintTimer = later(function () { view.clearMarks(); hintTimer = null; }, 2500);
        }, function () { return !destroyed && myGen === gen; });
      },
      destroy: function () {
        destroyed = true; gen++;
        timers.forEach(clearTimeout); timers = [];
        view.board.removeEventListener('pointerdown', onDown);
        view.board.removeEventListener('pointerup', onUp);
        view.board.removeEventListener('pointermove', onMove);
        view.board.removeEventListener('pointerleave', onLeave);
        view.passBtn.removeEventListener('click', onPass);
        view.destroy();
      }
    };
  }

  /* ===================== demo ===================== */
  var FINAL_ROWS = [
    '...XO....',
    '...XO....',
    '...XO..X.',
    '....XO...',
    '.O..XO...',
    '....XO...',
    '...XO....',
    '...XO....',
    '...XO....'
  ];
  function demo(el, opts) {
    injectCss();
    opts = opts || {};
    var view = createView(el, false), timers = [], stopped = false, b = new Board();
    function at(ms, fn) { timers.push(setTimeout(function () { if (!stopped) fn(); }, ms)); }
    function cap(t) { try { opts.onCaption && opts.onCaption(t); } catch (e) { } }
    function setRows(rows) { b = boardFrom(rows); view.reset(); view.sync(b, false); }
    function put(x, y, c) { var p = P(x, y); var n = b.play(p, c); view.sync(b, true); view.setLast(p); return n; }
    function dots(list, kind) { list.forEach(function (s) { view.mark(P(s[0], s[1]), kind, 'go9-dot'); }); }
    function chip(t) { view.info('<span class="go9-chip">' + t + '</span>'); }
    function libDots(x, y) {
      view.clearMarks();
      var p = P(x, y), s = b.stones(p), seen = {};
      s.forEach(function (q) { for (var i = 0; i < 4; i++) { var n = q + NB[i]; if (b.c[n] === 0 && !seen[n]) { seen[n] = 1; view.mark(n, b.libs(p) === 1 ? 'red' : '', 'go9-dot'); } } });
      return b.libs(p);
    }
    var E = '.........';
    var steps = [
      { cap: '目标：用棋子围出地盘，终局时“子+地”多的一方获胜！', run: function () {
        var rows = FINAL_ROWS.slice(); rows[8] = '.........'; rows[4] = '....XO...'; rows[2] = '...XO....';
        setRows(rows); chip('9 路小围棋 · 黑先白后');
        at(700, function () { put(3, 8, 1); });
        at(1200, function () { put(4, 8, 2); });
        at(1800, function () { view.showScore(scoreGame(b, null, KOMI)); var s = scoreGame(b, null, KOMI); chip('黑 ' + s.black + ' 子 · 白 ' + s.white + ' 子'); });
      } },
      { cap: '气：棋子上下左右相邻的空点叫“气”，这颗白子有 4 口气。', run: function () {
        setRows([E, E, E, E, '....O....', E, E, E, E]);
        chip('气 = 绿点'); libDots(4, 4);
        at(900, function () { put(4, 3, 1); chip('还剩 ' + libDots(4, 4) + ' 口气'); });
        at(1700, function () { put(3, 4, 1); chip('还剩 ' + libDots(4, 4) + ' 口气'); });
        at(2500, function () { put(5, 4, 1); chip('只剩 ' + libDots(4, 4) + ' 口气：叫“打吃”'); });
      } },
      { cap: '提子：堵住对方最后一口气，就能把它从棋盘上拿走！', run: function () {
        setRows([E, E, E, '....X....', '...XOX...', '.....O...', '....XO...', '....X....', E]);
        chip('黑提 0 子'); libDots(4, 4);
        at(1100, function () { view.clearMarks(); var n = put(4, 5, 1); chip('黑提 ' + n + ' 子'); });
        at(2000, function () { libDots(5, 6); chip('白两子也只剩 ' + b.libs(P(5, 6)) + ' 口气…'); });
      } },
      { cap: '禁着点：下进去自己没气、又提不掉对方，就不能下。', run: function () {
        setRows([E, E, '...XXX...', '..XX.XX..', '..X...X..', '..XX.XX..', '...XXX...', E, E]);
        chip('黑棋的“眼”');
        at(700, function () { view.mark(P(4, 3), 'red'); view.mark(P(4, 5), 'red'); });
        at(1400, function () { view.setGhost(P(4, 3), 2, false); });
        at(2000, function () { view.setGhost(-1); view.mark(P(4, 3), '', 'go9-x'); chip('白不能下：这是禁着点'); });
      } },
      { cap: '打劫：刚被提一子，不能马上提回，要先在别处走一步。', run: function () {
        setRows([E, E, E, '....XO...', '...XO.O..', '....XO...', E, E, E]);
        chip('打劫');
        at(700, function () { put(5, 4, 1); chip('黑提一子'); });
        at(1400, function () { view.mark(P(4, 4), 'red'); view.mark(P(4, 4), '', 'go9-x'); chip('白不能立刻提回'); });
        at(2200, function () { view.clearMarks(); put(7, 7, 2); chip('白先在别处走一步（找劫材）'); });
        at(2800, function () { put(4, 4, 1); chip('黑趁机粘上，劫就消了'); });
      } },
      { cap: '终局：双方都停一手，提走死子后数“子+地”，白方再贴 7 目。', run: function () {
        setRows(FINAL_ROWS); chip('双方停一手');
        at(900, function () {
          var own = new Float32Array(SZ);
          for (var k = 0; k < 81; k++) { var y = PY(ON[k]); own[ON[k]] = PX(ON[k]) <= (y >= 3 && y <= 5 ? 4 : 3) ? 1 : -1; }
          var s = scoreGame(b, own, KOMI);
          view.showScore(s); chip(scoreText(s));
        });
      } }
    ];
    var t = 0;
    steps.forEach(function (s, k) {
      at(t, function () { view.clearMarks(); view.clearScore(); view.setGhost(-1); cap(s.cap); s.run(); });
      t += 3300;
    });
    at(t, function () { try { opts.onDone && opts.onDone(); } catch (e) { } });
    return { stop: function () { stopped = true; timers.forEach(clearTimeout); timers = []; view.destroy(); } };
  }

  root.TZGAMES['go9'] = {
    id: 'go9', name: '小围棋', tagline: '9 路小棋盘，围地多者胜',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['黑方（先手）', '白方'],
    mount: mount,
    demo: demo,
    _engine: engine
  };
})();
