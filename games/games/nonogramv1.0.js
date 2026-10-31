/* 团子棋馆 · 数织 (nonogram / picross) v1.0 — 单人解谜，手绘像素画题库，全部可用行列逻辑唯一解出 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
  root.TZGAMES = root.TZGAMES || {};

  /* ===================== 题库 ===================== */
  // 每题：t=标题（完成后揭晓），r=像素行，'.'=空格，字母=涂色格在揭晓时的颜色（见 PAL）
  var PAL = {
    k: '#3b3355', r: '#ff6b6b', p: '#ffa8c5', o: '#ffa94d', y: '#ffd43b', g: '#69db7c', d: '#2f9e44',
    b: '#4dabf7', l: '#a5d8ff', n: '#b07a50', u: '#b197fc', w: '#e9ecef', s: '#ffd8a8', m: '#fff3d6', e: '#adb5bd'
  };
  var BANK = [
    [ // 新手 5×5
      { t: '爱心', r: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'] },
      { t: '星星', r: ['..y..', 'yyyyy', '.yyy.', '.y.y.', 'y...y'] },
      { t: '团子', r: ['.ppp.', 'ppppp', 'p.p.p', 'ppppp', '.ppp.'] },
      { t: '小房子', r: ['..r..', '.rrr.', 'rrrrr', '.y.y.', '.yyy.'] },
      { t: '小树', r: ['..g..', '.ggg.', 'ggggg', '..n..', '..n..'] },
      { t: '蘑菇', r: ['.rrr.', 'rrrrr', 'r.r.r', '..s..', '.sss.'] },
      { t: '雨伞', r: ['.bbb.', 'bbbbb', '..n..', '..n..', '.nn..'] },
      { t: '小帆船', r: ['..u..', '..uu.', '.uuuu', 'rrrrr', '.rrr.'] },
      { t: '小猫', r: ['o...o', 'ooooo', 'o.o.o', 'ooooo', '.ooo.'] },
      { t: '笑脸', r: ['.yyy.', 'y.y.y', 'yyyyy', 'y...y', '.yyy.'] }
    ],
    [ // 入门 8×8
      { t: '团子', r: ['..pppp..', '.pppppp.', 'pppppppp', 'pp.pp.pp', 'prpppprp', 'ppp..ppp', '.pppppp.', '..pppp..'] },
      { t: '小猫', r: ['o......o', 'oo....oo', 'oooooooo', 'o.oooo.o', 'oooooooo', 'oookkooo', '.oooooo.', '..oooo..'] },
      { t: '小鱼', r: ['........', '..bbbb.b', '.bbbbbbb', 'b.bbbbb.', 'bbbbbbb.', '.bbbbbbb', '..bbbb.b', '........'] },
      { t: '火箭', r: ['...rr...', '..rrrr..', '..wbbw..', '..wbbw..', '.rwwwwr.', 'rrwwwwrr', 'r..ooo.r', '...oo...'] },
      { t: '太阳', r: ['..y..y..', 'y......y', '..oooo..', '.oooooo.', '.oooooo.', '..oooo..', 'y......y', '..y..y..'] },
      { t: '雨伞', r: ['...uu...', '.uuuuuu.', 'uuuuuuuu', '....n...', '....n...', '....n...', '..n.n...', '...n....'] },
      { t: '冰淇淋', r: ['...r....', '..pppp..', '.pppppp.', '.pppppp.', '.oooooo.', '..oooo..', '...oo...', '...o....'] },
      { t: '小鸡', r: ['..yyyy..', '.yy.yyy.', 'yyyyyyoo', 'yyyyyyy.', 'yyyyyyy.', '.yyyyy..', '..o..o..', '.oo.oo..'] },
      { t: '星星', r: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyyyyy.', '.yy..yy.', 'yy.....y'] }
    ],
    [ // 进阶 10×10
      { t: '熊猫', r: ['.kk....kk.', 'kkkkkkkkkk', 'kk......kk', 'k.kk..kk.k', 'k.kk..kk.k', 'k...kk...k', 'k........k', 'kk..kk..kk', '.kk....kk.', '...kkkk...'] },
      { t: '房子', r: ['....rr..n.', '...rrrr.n.', '..rrrrrrn.', '.rrrrrrrr.', 'rrrrrrrrrr', '.yyyyyyyy.', '.y..yyyyy.', '.y..y..yy.', '.yyyy..yy.', '.yyyy..yy.'] },
      { t: '足球', r: ['...kkkk...', '.kk.kk.kk.', '.k.kkkk.k.', 'k...kk...k', 'kk......kk', 'kkk....kkk', 'k...kk...k', '.k.kkkk.k.', '.kk..k.kk.', '...kkkk...'] },
      { t: '帆船', r: ['....rr....', '....k.....', '...lk.....', '..llkl....', '.lllkll...', 'llllklll..', '....k.....', 'nnnnnnnnnn', '.nnnnnnnn.', 'bbbbbbbbbb'] },
      { t: '圣诞树', r: ['....yy....', '....gg....', '...gggg...', '..ggrggg..', '...gggg...', '..gggggr..', '.grggggrg.', 'gggggggggg', '....nn....', '...nnnn...'] },
      { t: '蘑菇', r: ['...rrrr...', '.rr..rrrr.', 'rrr..rr.rr', 'rrrrrrr.rr', 'rrrrrrrrrr', '..ssssss..', '..s.ss.s..', '..ssssss..', '..ssssss..', '...ssss...'] },
      { t: '星星', r: ['....yy....', '....yy....', '...yyyy...', 'yyyyyyyyyy', '.yyyyyyyy.', '..yyyyyy..', '..yyyyyy..', '.yyy..yyy.', '.yy....yy.', 'yy.......y'] },
      { t: '鲸鱼', r: ['..l.l.....', '...l......', '.bbbbb....', 'bbbbbbb.bb', 'b.bbbbbb.b', 'bbbbbbbbbb', 'bbbbbbbbb.', '.lllllll..', '..lllll...', '..........'] },
      { t: '火箭', r: ['....rr....', '...rrrr...', '...wwww...', '...wbbw...', '...wbbw...', '...wwww...', '..rwwwwr..', '.rrwwwwrr.', '.rr.oo.rr.', '....oo....'] }
    ],
    [ // 大师 15×15
      { t: '熊猫', r: ['..kkk.....kkk..', '.kkkkkkkkkkkkk.', '.kkk.......kkk.', '.kk.........kk.', 'kk...........kk', 'k...kk...kk...k', 'k..kkkk.kkkk..k', 'k.kkwkk.kkwkk.k', 'k.kkkk...kkkk.k', 'k..kk.kkk.kk..k', 'k......k......k', 'kpp...k.k...ppk', '.k...........k.', '..kkk.....kkk..', '....kkkkkkk....'] },
      { t: '足球', r: ['.....kkkkk.....', '...kk.kkk.kk...', '..k..kkkkk..k..', 'kk....kkk....kk', '.kk....k....kk.', 'kkkk.......kkkk', 'kkk...kkk...kkk', 'kk...kkkkk...kk', 'k....kkkkk....k', 'k.....kkk.....k', 'kk...........kk', '.kkk...k...kkk.', '..kk..kkk..kk..', '...kk.kkk.kk...', '.....kkkkk.....'] },
      { t: '火箭', r: ['.......r.......', '......rrr......', '.....rrrrr.....', '.....wwwww.....', '.....w...w.....', '.....w.b.w.....', '.....w...w.....', '.....wwwww.....', '.....wwwww.....', '....rwwwwwr....', '...rrwwwwwrr...', '..rrrwwwwwrrr..', '..rr..ooo..rr..', '......ooo......', '.......o.......'] },
      { t: '帆船', r: ['.......r.......', '.......rr......', '.......k.......', '......lk.......', '.....llkl......', '....lllkll.....', '...llllklll....', '..lllllkllll...', '.llllllklllll..', '.......k.......', 'nnnnnnnnnnnnnnn', '.nnnnnnnnnnnnn.', '..nnnnnnnnnnn..', '.bb..bb..bb..bb', 'bbbbbbbbbbbbbbb'] },
      { t: '房子', r: ['...........nn..', '......rr...nn..', '.....rrrr..nn..', '....rrrrrr.nn..', '...rrrrrrrrnn..', '..rrrrrrrrrrr..', '.rrrrrrrrrrrrr.', 'rrrrrrrrrrrrrrr', '.yyyyyyyyyyyyy.', '.y...yyyyy...y.', '.y...yyyyy...y.', '.y...y...y...y.', '.yyyyy...yyyyy.', '.yyyyy...yyyyy.', 'ggggggggggggggg'] },
      { t: '大团子', r: ['....ppppppp....', '..ppppppppppp..', '.ppppppppppppp.', '.ppppppppppppp.', 'ppppppppppppppp', 'pp..ppppppp..pp', 'pp..ppppppp..pp', 'ppppppppppppppp', 'prrppp.p.ppprrp', 'ppppppp.ppppppp', 'ppppppppppppppp', '.ppppppppppppp.', '.ppppppppppppp.', '..ppppppppppp..', '....ppppppp....'] },
      { t: '小猫', r: ['.oo..........o.', '.oo.........oo.', '.ooo.......ooo.', '.ooooo.o.ooooo.', 'ooooooooooooooo', 'ooo..ooooo..ooo', 'ooo..ooooo..ooo', 'ooooooopooooooo', 'oooooo.o.oooooo', 'ooooooooooooooo', '.ooooooooooooo.', '..ooooooooooo..', '...ooooooooo...', '....ooo.ooo....', '.....ooooo.....'] },
      { t: '鲸鱼', r: ['..l.l.l........', '...l.l.........', '....l..........', '...bbbbbb......', '.bbbbbbbbbb..bb', 'bbbbbbbbbbbb.bb', 'bb.bbbbbbbbbbb.', 'bbbbbbbbbbbbbb.', 'bbbbbbbbbbbbb..', 'llllllllllll...', '.llllllllll....', '..llllllll.....', '...............', '.bb..bb..bb..bb', 'bbbbbbbbbbbbbbb'] },
      { t: '企鹅', r: ['.....kkkkk.....', '....kkkkkkk....', '...kkkkkkkkk...', '...kk.kkk.kk...', '...kkkoookkk...', '..kkk..o..kkk..', '.kkk...o...kkk.', 'kkkk.......kkkk', 'kkk.........kkk', '.kk.........kk.', '..k.........k..', '..k.........k..', '...k.......k...', '....kkkkkkk....', '...ooo...ooo...'] }
    ]
  ];
  var SIZES = [5, 8, 10, 15];

  /* ===================== 引擎 ===================== */
  var UNKNOWN = 0, FILL = 1, CROSS = 2;

  function cluesOf(line) { // line: 真值数组 → 线索
    var c = [], run = 0;
    for (var i = 0; i < line.length; i++) { if (line[i]) run++; else if (run) { c.push(run); run = 0; } }
    if (run) c.push(run);
    return c;
  }
  function parsePuzzle(p) {
    var h = p.r.length, w = p.r[0].length, n = w * h, sol = new Uint8Array(n), col = new Array(n), i, r, c;
    for (r = 0; r < h; r++) for (c = 0; c < w; c++) {
      var ch = p.r[r].charAt(c); i = r * w + c;
      if (ch !== '.') { sol[i] = 1; col[i] = (p.pal && p.pal[ch]) || PAL[ch] || PAL.k; } else col[i] = null;
    }
    var rc = [], cc = [];
    for (r = 0; r < h; r++) rc.push(cluesOf(Array.prototype.slice.call(sol, r * w, r * w + w)));
    for (c = 0; c < w; c++) { var l = []; for (r = 0; r < h; r++) l.push(sol[r * w + c]); cc.push(cluesOf(l)); }
    var total = 0; for (i = 0; i < n; i++) total += sol[i];
    return { t: p.t, w: w, h: h, n: n, sol: sol, col: col, rc: rc, cc: cc, total: total };
  }

  // 单行推理：clue 线索，cells 当前（0 未知 1 涂 2 叉）。返回推理后的新数组；矛盾返回 null
  function solveLine(clue, cells) {
    var n = cells.length, k = clue.length, memo = {};
    function fits(j, i) {
      var L = clue[j]; if (i + L > n) return false;
      for (var t = i; t < i + L; t++) if (cells[t] === CROSS) return false;
      return !(i + L < n && cells[i + L] === FILL);
    }
    function S(j, i) { // 第 j 块起能否放进 [i, n)
      var key = j * 64 + i; if (key in memo) return memo[key];
      var res = false, t;
      if (j === k) { res = true; for (t = i; t < n; t++) if (cells[t] === FILL) { res = false; break; } }
      else if (i < n) {
        if (cells[i] !== FILL && S(j, i + 1)) res = true;
        else if (fits(j, i)) res = (i + clue[j] === n) ? (j + 1 === k) : S(j + 1, i + clue[j] + 1);
      }
      memo[key] = res; return res;
    }
    if (!S(0, 0)) return null;
    var canF = new Uint8Array(n), canE = new Uint8Array(n), reach = {}; reach[0] = 1;
    for (var i = 0; i <= n; i++) for (var j = 0; j <= k; j++) {
      if (!reach[j * 64 + i] || !S(j, i)) continue;
      if (j === k) { for (var t = i; t < n; t++) canE[t] = 1; continue; }
      if (i >= n) continue;
      if (cells[i] !== FILL && S(j, i + 1)) { canE[i] = 1; reach[j * 64 + i + 1] = 1; }
      if (fits(j, i)) {
        var e = i + clue[j], ok = (e === n) ? (j + 1 === k) : S(j + 1, e + 1);
        if (ok) {
          for (t = i; t < e; t++) canF[t] = 1;
          if (e < n) { canE[e] = 1; reach[(j + 1) * 64 + e + 1] = 1; } else reach[(j + 1) * 64 + e] = 1;
        }
      }
    }
    var out = cells.slice();
    for (i = 0; i < n; i++) if (cells[i] === UNKNOWN) { if (canF[i] && !canE[i]) out[i] = FILL; else if (canE[i] && !canF[i]) out[i] = CROSS; }
    return out;
  }
  function getLine(st, P, L) { // L: 0..h-1 行，h..h+w-1 列
    var a = [], i;
    if (L < P.h) for (i = 0; i < P.w; i++) a.push(st[L * P.w + i]);
    else for (i = 0; i < P.h; i++) a.push(st[i * P.w + (L - P.h)]);
    return a;
  }
  function lineIdx(P, L, k) { return L < P.h ? L * P.w + k : k * P.w + (L - P.h); }
  function lineClue(P, L) { return L < P.h ? P.rc[L] : P.cc[L - P.h]; }
  function lineName(P, L) { return L < P.h ? '第 ' + (L + 1) + ' 行' : '第 ' + (L - P.h + 1) + ' 列'; }
  // 整盘行列逻辑：反复做单行推理直到不动。返回 {grid, solved, steps}；矛盾返回 null
  function lineSolve(P, start) {
    var g = start ? Array.prototype.slice.call(start) : new Array(P.n).fill(UNKNOWN), changed = true, passes = 0;
    while (changed) {
      changed = false; passes++;
      for (var L = 0; L < P.h + P.w; L++) {
        var cur = getLine(g, P, L), o = solveLine(lineClue(P, L), cur);
        if (!o) return null;
        for (var k = 0; k < cur.length; k++) if (o[k] !== cur[k]) { g[lineIdx(P, L, k)] = o[k]; changed = true; }
      }
    }
    var solved = true;
    for (var i = 0; i < P.n; i++) if (g[i] === UNKNOWN) { solved = false; break; }
    return { grid: g, solved: solved, passes: passes };
  }
  function isLineSolvable(P) {
    var r = lineSolve(P); if (!r || !r.solved) return false;
    for (var i = 0; i < P.n; i++) if ((r.grid[i] === FILL ? 1 : 0) !== P.sol[i]) return false;
    return true;
  }
  function lineSatisfied(clue, cells) {
    var c = cluesOf(cells.map(function (v) { return v === FILL; }));
    if (c.length !== clue.length) return false;
    for (var i = 0; i < c.length; i++) if (c[i] !== clue[i]) return false;
    return true;
  }

  // 提示理由
  function describe(P, L, cells, newK, v) {
    var name = lineName(P, L), unit = L < P.h ? '行' : '列', clue = lineClue(P, L), n = cells.length, m = newK.length;
    var ct = clue.join(' '), sum = 0, i, hasF = false, hasX = false;
    for (i = 0; i < clue.length; i++) sum += clue[i];
    for (i = 0; i < n; i++) { if (cells[i] === FILL) hasF = true; else if (cells[i] === CROSS) hasX = true; }
    if (!clue.length) return name + '的线索是 0，整' + unit + '都是空的，打叉';
    var nf = 0; for (i = 0; i < n; i++) if (cells[i] === FILL) nf++;
    if (v === CROSS && nf === sum) return name + '的 ' + ct + ' 已经涂齐了，其余格子打叉';
    if (!hasF && !hasX && v === FILL) {
      if (sum + clue.length - 1 === n) return clue.length === 1 ? name + '的 ' + ct + ' 正好占满 ' + n + ' 格，整' + unit + '涂满' : name + '的 ' + ct + ' 加上空隙正好 ' + n + ' 格，直接涂';
      if (clue.length === 1) return name + '的 ' + ct + ' 在 ' + n + ' 格里，中间 ' + m + ' 格一定要涂';
      return name + '的 ' + ct + ' 靠左摆、靠右摆，重叠的 ' + m + ' 格一定要涂';
    }
    if (!hasF && clue.length === 1) {
      var segs = [], s = -1;
      for (i = 0; i <= n; i++) { if (i < n && cells[i] !== CROSS) { if (s < 0) s = i; } else if (s >= 0) { segs.push([s, i - s]); s = -1; } }
      var big = segs.filter(function (q) { return q[1] >= clue[0]; });
      if (v === FILL && big.length === 1) {
        if (big[0][1] === clue[0]) return name + '的 ' + ct + ' 只能放进剩下的 ' + clue[0] + ' 格，正好涂满';
        return name + '的 ' + ct + ' 只能放在剩下的 ' + big[0][1] + ' 格里，中间 ' + m + ' 格要涂';
      }
      if (v === CROSS) {
        var allSmall = newK.every(function (kk) { return segs.some(function (q) { return kk >= q[0] && kk < q[0] + q[1] && q[1] < clue[0]; }); });
        if (allSmall) return name + '有的空隙不到 ' + clue[0] + ' 格，放不下，打叉';
      }
    }
    if (v === FILL) return '看' + name + '（' + ct + '）已有的涂色和叉，这 ' + m + ' 格一定要涂';
    return '看' + name + '（' + ct + '）已有的涂色和叉，这 ' + m + ' 格一定是空的';
  }
  // 提示：st 当前标记。返回 {cells:[i..], v:FILL|CROSS, line, reason, kind}
  function findHint(st, P) {
    var i;
    for (i = 0; i < P.n; i++) if (st[i] === CROSS && P.sol[i]) {
      return { cells: [i], v: FILL, line: -1, kind: 'fix', reason: '第 ' + ((i / P.w | 0) + 1) + ' 行第 ' + (i % P.w + 1) + ' 列不该打叉，它其实要涂' };
    }
    var bestF = null, bestX = null;
    for (var L = 0; L < P.h + P.w; L++) {
      var cur = getLine(st, P, L), o = solveLine(lineClue(P, L), cur);
      if (!o) continue;
      var nf = [], nx = [];
      for (var k = 0; k < cur.length; k++) if (o[k] !== cur[k]) (o[k] === FILL ? nf : nx).push(k);
      if (nf.length && (!bestF || nf.length > bestF.k.length)) bestF = { L: L, k: nf, cur: cur };
      if (nx.length && (!bestX || nx.length > bestX.k.length)) bestX = { L: L, k: nx, cur: cur };
    }
    var b = bestF || bestX;
    if (b) {
      var v = bestF ? FILL : CROSS;
      return { cells: b.k.map(function (kk) { return lineIdx(P, b.L, kk); }), v: v, line: b.L, kind: 'logic', reason: describe(P, b.L, b.cur, b.k, v) };
    }
    for (i = 0; i < P.n; i++) if (P.sol[i] && st[i] !== FILL) return { cells: [i], v: FILL, line: -1, kind: 'reveal', reason: '先帮你涂上第 ' + ((i / P.w | 0) + 1) + ' 行第 ' + (i % P.w + 1) + ' 列' };
    return null;
  }

  // 纯逻辑棋盘（mount 与测试共用）：笔画 = 一次点按或一次拖动，可整笔撤销
  function Board(P) {
    this.P = P; this.st = new Uint8Array(P.n); this.mistakes = 0; this.stack = []; this.cur = null; this.touched = null;
  }
  Board.prototype.begin = function () { this.cur = []; this.touched = {}; };
  Board.prototype._set = function (i, v) {
    if (!this.cur) this.begin();
    if (!this.touched[i]) { this.touched[i] = 1; this.cur.push([i, this.st[i]]); }
    this.st[i] = v;
  };
  Board.prototype.fill = function (i) { // 'ok' | 'bad' | 'skip'
    if (this.st[i] !== UNKNOWN) return 'skip';
    if (this.P.sol[i]) { this._set(i, FILL); return 'ok'; }
    this._set(i, CROSS); this.mistakes++; return 'bad';
  };
  Board.prototype.cross = function (i) { if (this.st[i] !== UNKNOWN) return 'skip'; this._set(i, CROSS); return 'ok'; };
  Board.prototype.clear = function (i, kind) { if (this.st[i] !== kind) return 'skip'; this._set(i, UNKNOWN); return 'ok'; };
  Board.prototype.end = function () { if (this.cur && this.cur.length) this.stack.push(this.cur); this.cur = null; this.touched = null; };
  Board.prototype.undo = function () {
    if (this.cur) this.end();
    var s = this.stack.pop(); if (!s) return null;
    for (var k = s.length - 1; k >= 0; k--) this.st[s[k][0]] = s[k][1];
    return s;
  };
  Board.prototype.applyHint = function (h) {
    this.begin();
    for (var k = 0; k < h.cells.length; k++) this._set(h.cells[k], h.v);
    this.end();
  };
  Board.prototype.hint = function () { var h = findHint(this.st, this.P); if (h) this.applyHint(h); return h; };
  Board.prototype.filled = function () { var c = 0; for (var i = 0; i < this.P.n; i++) if (this.st[i] === FILL) c++; return c; };
  Board.prototype.won = function () { for (var i = 0; i < this.P.n; i++) if (this.P.sol[i] && this.st[i] !== FILL) return false; return true; };
  Board.prototype.lineDone = function (L) { return lineSatisfied(lineClue(this.P, L), getLine(this.st, this.P, L)); };

  function fmtTime(sec) { sec = Math.max(0, Math.floor(sec)); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  // 每档轮换：首次随机起点，之后按顺序循环（模块级，重新 mount 也接着往下）
  var NEXT = [-1, -1, -1, -1];
  function pickIndex(level, rng) {
    var len = BANK[level].length;
    if (NEXT[level] < 0) NEXT[level] = ((rng || Math.random)() * len) | 0;
    var i = NEXT[level]; NEXT[level] = (i + 1) % len;
    return i;
  }
  // 线索区尺寸（单位：格宽）
  function clueUnits(P) {
    var ru = 1, cu = 1;
    P.rc.forEach(function (c) { var u = 0.25; (c.length ? c : [0]).forEach(function (x) { u += String(x).length * 0.42 + 0.16; }); ru = Math.max(ru, u); });
    P.cc.forEach(function (c) { cu = Math.max(cu, Math.max(1, c.length) * 0.86 + 0.34); });
    return { ru: Math.round(ru * 100) / 100, cu: Math.round(cu * 100) / 100 };
  }
  var BOARD_PAD = 8, CELL_MAX = 72; // 棋盘内边距（左右合计 px）、大屏格宽上限
  function cellPx(P, widthPx) { return Math.min((widthPx - BOARD_PAD) / (P.w + clueUnits(P).ru), CELL_MAX); }

  var engine = {
    PAL: PAL, BANK: BANK, SIZES: SIZES, UNKNOWN: UNKNOWN, FILL: FILL, CROSS: CROSS,
    cluesOf: cluesOf, parsePuzzle: parsePuzzle, solveLine: solveLine, lineSolve: lineSolve, isLineSolvable: isLineSolvable,
    lineSatisfied: lineSatisfied, getLine: getLine, lineIdx: lineIdx, lineClue: lineClue, lineName: lineName,
    describe: describe, findHint: findHint, Board: Board, fmtTime: fmtTime, pickIndex: pickIndex, NEXT: NEXT, clueUnits: clueUnits, cellPx: cellPx
  };

  /* ===================== 视图 ===================== */
  var CSS = [
    '.nono-wrap{--nono-w:var(--bw,min(92vw,560px));width:var(--nono-w);margin:0 auto;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}',
    '.nono-info{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;font-size:13px;color:var(--muted,#7a6f86)}',
    '.nono-chip{display:inline-flex;align-items:center;gap:5px;background:var(--card,#fff);border:1px solid var(--line,#e9dcc8);border-radius:999px;padding:3px 11px;font-variant-numeric:tabular-nums}',
    '.nono-chip b{color:var(--ink,#2b2340);font-weight:700}',
    '.nono-chip.nono-err b{color:var(--red,#e5484d)}',
    '.nono-board{display:grid;margin:0 auto;width:max-content;background:#fffaf2;border-radius:14px;padding:4px;box-shadow:0 8px 22px rgba(80,55,130,.14),0 2px 0 #eadfce;font-variant-numeric:tabular-nums}',
    '.nono-corner{grid-column:1;grid-row:1;display:flex;align-items:center;justify-content:center}',
    '.nono-mini{display:grid;width:72%;aspect-ratio:1/1;max-width:calc(var(--nono-cs)*var(--nono-cu)*.82);max-height:calc(var(--nono-cs)*var(--nono-cu)*.82);background:#fff;border-radius:4px;box-shadow:0 0 0 1px #e2d6f2;overflow:hidden}',
    '.nono-mini i{display:block}',
    '.nono-mini i.nono-mf{background:#5b4b8a}',
    '.nono-rcs{grid-column:1;grid-row:2/-1;display:grid}',
    '.nono-ccs{grid-column:2/-1;grid-row:1;display:grid}',
    '.nono-rc{display:flex;align-items:center;justify-content:flex-end;gap:calc(var(--nono-cs)*.16);padding-right:calc(var(--nono-cs)*.2);font-size:calc(var(--nono-cs)*.56);font-weight:800;color:#4b3f72;border-radius:8px 0 0 8px;transition:background-color .12s,color .2s}',
    '.nono-cc{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:calc(var(--nono-cs)*.14);font-size:calc(var(--nono-cs)*.56);line-height:1.5;font-weight:800;color:#4b3f72;border-radius:8px 8px 0 0;transition:background-color .12s,color .2s}',
    '.nono-rc:nth-child(10n+6),.nono-rc:nth-child(10n+7),.nono-rc:nth-child(10n+8),.nono-rc:nth-child(10n+9),.nono-rc:nth-child(10n+10){background:#f7f1ff}',
    '.nono-cc:nth-child(10n+6),.nono-cc:nth-child(10n+7),.nono-cc:nth-child(10n+8),.nono-cc:nth-child(10n+9),.nono-cc:nth-child(10n+10){background:#f7f1ff}',
    '.nono-board .nono-done{color:#cfc6dc}',
    '.nono-board .nono-cur{background:#ffeaa6}',
    '.nono-area{grid-column:2/-1;grid-row:2/-1;position:relative;display:grid;background:#fffdf7;box-shadow:0 0 0 2px #8f7bb8;border-radius:3px;touch-action:none;cursor:pointer;font-size:var(--nono-cs)}',
    '.nono-c{position:relative;box-sizing:border-box;border-right:1px solid #e6dcf3;border-bottom:1px solid #e6dcf3;min-width:0;min-height:0}',
    '.nono-c.nono-r5{border-right:2px solid #a593c9}.nono-c.nono-b5{border-bottom:2px solid #a593c9}',
    '.nono-c.nono-rl{border-right:0}.nono-c.nono-bl{border-bottom:0}',
    '.nono-c::before{content:"";position:absolute;inset:9%;border-radius:24%;background:transparent;transform:scale(.3);opacity:0;transition:transform .14s ease-out,opacity .14s,background-color .45s,inset .45s,border-radius .45s}',
    '.nono-c.nono-f::before{background:#5b4b8a;transform:scale(1);opacity:1}',
    '.nono-c::after{content:"";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.82em;line-height:1;font-weight:700;color:#c3b2de;transition:opacity .3s}',
    '.nono-c.nono-x::after{content:"×"}',
    '.nono-c.nono-hl{background:#fff0c2}',
    '.nono-c.nono-hlx::after{content:"×";color:#f0a0a3}',
    '.nono-c.nono-bad::before{background:var(--red,#e5484d);transform:scale(1);opacity:1;animation:nono-shake .4s ease-in-out}',
    '.nono-c.nono-bad::after{content:""}',
    '@keyframes nono-shake{0%,100%{translate:0}25%{translate:-3px}50%{translate:3px}75%{translate:-2px}}',
    '.nono-c.nono-flash{background:#c9f2dc;animation:nono-flash .45s ease-in-out 4 alternate}',
    '@keyframes nono-flash{from{box-shadow:inset 0 0 0 1px rgba(34,160,107,.3)}to{box-shadow:inset 0 0 0 3px var(--green,#22a06b)}}',
    '.nono-bar{position:absolute;pointer-events:none;background:rgba(255,197,61,.2);display:none;z-index:1}',
    '.nono-bar.nono-on{display:block}',
    '.nono-reveal{cursor:default}',
    '.nono-reveal .nono-c{border-color:transparent}',
    '.nono-reveal .nono-c::before{transition-delay:var(--nono-d,0s)}',
    '.nono-reveal .nono-c.nono-f::before{background:var(--nono-pc,#5b4b8a);inset:0;border-radius:0}',
    '.nono-reveal .nono-c::after{opacity:0;transition-delay:var(--nono-d,0s)}',
    '.nono-reveal .nono-bar{display:none}',
    '.nono-area.nono-reveal{box-shadow:0 0 0 2px #f3d27a;animation:nono-glow 1.2s ease-in-out 1s 2 alternate}',
    '@keyframes nono-glow{to{box-shadow:0 0 0 4px #ffc53d,0 0 18px rgba(255,197,61,.6)}}',
    '.nono-pad{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px auto 0;max-width:360px}',
    '.nono-key{appearance:none;-webkit-appearance:none;border:1px solid var(--line,#e9dcc8);background:var(--card,#fff);border-radius:14px;min-height:54px;padding:4px 0;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--ink,#2b2340);font:inherit;font-weight:700;cursor:pointer;box-shadow:0 3px 0 #eadfce;touch-action:manipulation;transition:transform .08s,background .15s}',
    '.nono-key:active{transform:translateY(2px);box-shadow:0 1px 0 #eadfce}',
    '.nono-key b{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:7px;font-size:22px;line-height:1}',
    '.nono-key[data-k=fill] b{background:#5b4b8a;color:#5b4b8a}',
    '.nono-key[data-k=cross] b{background:#fffdf7;color:#b9a6d8;box-shadow:inset 0 0 0 1.5px #d9cdec}',
    '.nono-key.nono-on{background:var(--purple,#8b5cf6);border-color:var(--purple,#8b5cf6);color:#fff;box-shadow:0 3px 0 #6d43d6}',
    '.nono-key.nono-on[data-k=fill] b{background:#fff;color:#fff}',
    '.nono-banner{display:none;margin:12px auto 0;text-align:center;font-size:20px;font-weight:800;color:var(--ink,#2b2340);background:#fffbe8;border:2px dashed #f3d27a;border-radius:16px;padding:10px 14px;max-width:360px}',
    '.nono-banner small{display:block;font-size:12px;font-weight:600;color:var(--muted,#7a6f86);margin-top:2px}',
    '.nono-won .nono-banner{display:block;animation:nono-pop .35s ease-out}',
    '.nono-won .nono-pad{display:none}',
    '@keyframes nono-pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}',
    '.nono-demo .nono-area,.nono-demo .nono-pad{pointer-events:none}',
    '.nono-wait .nono-area,.nono-wait .nono-pad{pointer-events:none;opacity:.6}'
  ].join('\n');
  function injectCss() {
    if (typeof document === 'undefined') return;
    if (document.querySelector('style[data-nono-css]')) return;
    var st = document.createElement('style');
    st.setAttribute('data-nono-css', '1');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function div(cls, parent) { var e = document.createElement('div'); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  function createView(el, P, demo) {
    injectCss();
    el.innerHTML = '';
    var W = P.w, H = P.h, cu = clueUnits(P);
    var wrap = div('nono-wrap' + (demo ? ' nono-demo' : ''), el);
    var info = div('nono-info', wrap);
    var chipLv = div('nono-chip', info), chipT = div('nono-chip', info), chipE = div('nono-chip nono-err', info);
    var board = div('nono-board', wrap);
    // 格宽：总宽（含线索区）= --nono-w；大屏封顶 72px
    board.style.setProperty('--nono-cs', 'min(calc((var(--nono-w) - ' + BOARD_PAD + 'px) / ' + (W + cu.ru) + '), ' + CELL_MAX + 'px)');
    board.style.setProperty('--nono-cu', String(cu.cu));
    board.style.gridTemplateColumns = 'calc(var(--nono-cs) * ' + cu.ru + ') repeat(' + W + ', var(--nono-cs))';
    board.style.gridTemplateRows = 'calc(var(--nono-cs) * ' + cu.cu + ') repeat(' + H + ', var(--nono-cs))';
    var corner = div('nono-corner', board), mini = div('nono-mini', corner), minis = [];
    mini.style.gridTemplateColumns = 'repeat(' + W + ',1fr)'; mini.style.gridTemplateRows = 'repeat(' + H + ',1fr)';
    for (var i = 0; i < P.n; i++) { var it = document.createElement('i'); mini.appendChild(it); minis.push(it); }
    var ccs = div('nono-ccs', board), rcs = div('nono-rcs', board), colEls = [], rowEls = [];
    ccs.style.gridTemplateColumns = 'repeat(' + W + ', var(--nono-cs))';
    rcs.style.gridTemplateRows = 'repeat(' + H + ', var(--nono-cs))';
    function clueEl(parent, cls, clue) {
      var e = div(cls, parent);
      (clue.length ? clue : [0]).forEach(function (x) { var s = document.createElement('span'); s.textContent = String(x); e.appendChild(s); });
      return e;
    }
    for (var c = 0; c < W; c++) colEls.push(clueEl(ccs, 'nono-cc', P.cc[c]));
    for (var r = 0; r < H; r++) rowEls.push(clueEl(rcs, 'nono-rc', P.rc[r]));
    var area = div('nono-area', board), cells = [], base = [], lastCls = [];
    area.style.gridTemplateColumns = 'repeat(' + W + ', 1fr)';
    area.style.gridTemplateRows = 'repeat(' + H + ', 1fr)';
    for (i = 0; i < P.n; i++) {
      r = (i / W) | 0; c = i % W;
      var b = 'nono-c' + (c === W - 1 ? ' nono-rl' : (c % 5 === 4 ? ' nono-r5' : '')) + (r === H - 1 ? ' nono-bl' : (r % 5 === 4 ? ' nono-b5' : ''));
      var ce = div(b, area); ce.setAttribute('data-i', i);
      cells.push(ce); base.push(b); lastCls.push(b);
    }
    var barR = div('nono-bar', area), barC = div('nono-bar', area);
    barR.style.left = '0'; barR.style.right = '0'; barR.style.height = (100 / H) + '%';
    barC.style.top = '0'; barC.style.bottom = '0'; barC.style.width = (100 / W) + '%';
    var pad = div('nono-pad', wrap), keys = {};
    function key(k, sym, label) {
      var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'nono-key'; bt.setAttribute('data-k', k);
      var bb = document.createElement('b'); bb.textContent = sym; bt.appendChild(bb);
      var sp = document.createElement('span'); sp.textContent = label; bt.appendChild(sp);
      pad.appendChild(bt); keys[k] = bt;
    }
    key('fill', '■', '涂色'); key('cross', '×', '打叉');
    var banner = div('nono-banner', wrap);
    var lastDone = {}, lastCur = { r: -2, c: -2 };

    var view = {
      wrap: wrap, board: board, area: area, pad: pad, cells: cells, rowEls: rowEls, colEls: colEls, P: P,
      setInfo: function (lv, t, e) {
        chipLv.innerHTML = '<b>' + lv + '</b> · ' + W + '×' + H;
        chipT.innerHTML = '⏱ <b>' + t + '</b>';
        chipE.innerHTML = '✗ 错误 <b>' + e + '</b>';
      },
      setMode: function (m) { keys.fill.classList.toggle('nono-on', m === FILL); keys.cross.classList.toggle('nono-on', m === CROSS); },
      // m: {st, hl, hlx, flash, bad, cur:{r,c}, done:{L:1}}
      render: function (m) {
        var st = m.st, hl = m.hl || {}, hlx = m.hlx || {}, fl = m.flash || {}, bad = m.bad || {};
        for (var i = 0; i < P.n; i++) {
          var v = st[i], cls = base[i];
          if (bad[i]) cls += ' nono-bad';
          else if (v === FILL) cls += ' nono-f';
          else if (v === CROSS) cls += ' nono-x';
          if (hl[i]) cls += ' nono-hl';
          if (hlx[i] && v === UNKNOWN) cls += ' nono-hlx';
          if (fl[i]) cls += ' nono-flash';
          if (lastCls[i] !== cls) { cells[i].className = cls; lastCls[i] = cls; }
          var mc = v === FILL ? 'nono-mf' : '';
          if (minis[i].className !== mc) minis[i].className = mc;
        }
        var done = m.done || {};
        for (var L = 0; L < H + W; L++) {
          var d = !!done[L];
          if (lastDone[L] !== d) { (L < H ? rowEls[L] : colEls[L - H]).classList.toggle('nono-done', d); lastDone[L] = d; }
        }
        var cur = m.cur || { r: -1, c: -1 };
        if (cur.r !== lastCur.r) {
          if (lastCur.r >= 0) rowEls[lastCur.r].classList.remove('nono-cur');
          if (cur.r >= 0) { rowEls[cur.r].classList.add('nono-cur'); barR.style.top = (cur.r * 100 / H) + '%'; }
          barR.classList.toggle('nono-on', cur.r >= 0);
        }
        if (cur.c !== lastCur.c) {
          if (lastCur.c >= 0) colEls[lastCur.c].classList.remove('nono-cur');
          if (cur.c >= 0) { colEls[cur.c].classList.add('nono-cur'); barC.style.left = (cur.c * 100 / W) + '%'; }
          barC.classList.toggle('nono-on', cur.c >= 0);
        }
        lastCur = { r: cur.r, c: cur.c };
      },
      reveal: function () {
        for (var i = 0; i < P.n; i++) {
          var r = (i / W) | 0, c = i % W;
          cells[i].style.setProperty('--nono-d', ((r + c) * Math.min(40, 900 / (W + H))).toFixed(0) + 'ms');
          if (P.col[i]) cells[i].style.setProperty('--nono-pc', P.col[i]);
        }
        area.classList.add('nono-reveal');
      },
      unreveal: function () { area.classList.remove('nono-reveal'); wrap.classList.remove('nono-won'); },
      revealMs: function () { return (W + H) * Math.min(40, 900 / (W + H)) + 500; },
      showBanner: function (html) { banner.innerHTML = html; wrap.classList.add('nono-won'); },
      cellAt: function (x, y) {
        var rc = area.getBoundingClientRect();
        if (!rc.width || !rc.height) return null;
        var c = Math.floor((x - rc.left) / rc.width * W), r = Math.floor((y - rc.top) / rc.height * H);
        return { r: Math.max(0, Math.min(H - 1, r)), c: Math.max(0, Math.min(W - 1, c)), inside: x >= rc.left && x < rc.right && y >= rc.top && y < rc.bottom };
      }
    };
    return view;
  }
  function doneMap(bd) { var o = {}, P = bd.P; for (var L = 0; L < P.h + P.w; L++) if (bd.lineDone(L)) o[L] = 1; return o; }

  /* ===================== 对局 ===================== */
  function mount(el, opts) {
    opts = opts || {};
    var level = Math.max(0, Math.min(3, opts.level | 0));
    var onStatus = opts.onStatus || function () {}, onEnd = opts.onEnd || function () {}, snd = opts.sound || function () {};
    var P, bd, view, mode = FILL, ended = false, ready = false, dead = false, timers = [], tick = null;
    var elapsed = 0, lastTick = 0, idx = 0, drag = null, cur = { r: -1, c: -1 }, flash = null, bad = {}, lastSnd = 0;

    function later(fn, ms) { var t = setTimeout(function () { var k = timers.indexOf(t); if (k >= 0) timers.splice(k, 1); if (!dead) fn(); }, ms); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; if (tick) { clearInterval(tick); tick = null; } }
    function hidden() { return typeof document !== 'undefined' && document.hidden; }
    function updInfo() { view.setInfo(root.TZGAMES.nonogram.levels[level], fmtTime(elapsed / 1000), bd.mistakes); }
    function draw() { view.render({ st: bd.st, flash: flash, bad: bad, cur: cur, done: doneMap(bd) }); updInfo(); }
    function startTimer() {
      lastTick = now();
      tick = setInterval(function () { var t = now(); if (!hidden() && !ended) elapsed += Math.min(t - lastTick, 2000); lastTick = t; updInfo(); }, 500);
    }
    function newGame() {
      clearTimers();
      idx = pickIndex(level);
      P = parsePuzzle(BANK[level][idx]); bd = new Board(P);
      ended = false; ready = true; elapsed = 0; drag = null; cur = { r: -1, c: -1 }; flash = null; bad = {};
      view = createView(el, P, false); view.setMode(mode);
      draw(); startTimer();
      onStatus('第 ' + (idx + 1) + '/' + BANK[level].length + ' 幅 · 点格子涂色，按住拖动可连涂');
    }
    function sfx(name) { var t = now(); if (t - lastSnd > 90) { lastSnd = t; snd(name); } }
    function markBad(i) {
      bad[i] = 1;
      later(function () { delete bad[i]; draw(); }, 650);
    }
    function apply(i) {
      if (!drag || drag.dead) return;
      var a = drag.action, res;
      if (a === 'fill') {
        res = bd.fill(i);
        if (res === 'ok') sfx('move');
        else if (res === 'bad') {
          markBad(i); snd('illegal'); drag.dead = true;
          onStatus('这格应该是空的，已帮你打叉 · 错误 ' + bd.mistakes + ' 次');
        }
      } else if (a === 'cross') { if (bd.cross(i) === 'ok') sfx('select'); }
      else if (a === 'clear1') bd.clear(i, FILL);
      else if (a === 'clear2') bd.clear(i, CROSS);
    }
    function finishStroke() {
      if (!drag) return;
      var d = drag; bd.end(); drag = null;
      if (checkWin()) return;
      if (!d.dead && d.action === 'fill') onStatus('已涂 ' + bd.filled() + '/' + P.total + ' 格');
      draw();
    }
    function checkWin() {
      if (ended || !bd.won()) return false;
      ended = true; drag = null; bd.end();
      for (var i = 0; i < P.n; i++) if (bd.st[i] === UNKNOWN) bd.st[i] = CROSS;
      cur = { r: -1, c: -1 }; flash = null; bad = {};
      if (tick) { clearInterval(tick); tick = null; }
      draw(); view.reveal();
      var t = fmtTime(elapsed / 1000), reason = '《' + P.t + '》 · 用时 ' + t + ' · 错误 ' + bd.mistakes + ' 次';
      snd('win');
      onStatus('完成！涂出了《' + P.t + '》🎉');
      later(function () { view.showBanner('🎉 《' + P.t + '》<small>用时 ' + t + ' · 错误 ' + bd.mistakes + ' 次</small>'); }, view.revealMs() - 200);
      later(function () { onEnd({ winner: 'player', reason: reason }); }, view.revealMs() + 400);
      return true;
    }
    function setCur(r, c) { if (cur.r !== r || cur.c !== c) { cur = { r: r, c: c }; return true; } return false; }

    function onDown(e) {
      if (!ready || ended || !view || !e.target.closest || !e.target.closest('.nono-area')) return;
      if (e.button === 1) return;
      e.preventDefault();
      var p = view.cellAt(e.clientX, e.clientY); if (!p) return;
      var i = p.r * P.w + p.c, m = e.button === 2 ? CROSS : mode, s = bd.st[i], action;
      if (m === FILL) action = s === UNKNOWN ? 'fill' : s === FILL ? 'clear1' : 'clear2';
      else action = s === UNKNOWN ? 'cross' : s === CROSS ? 'clear2' : null;
      setCur(p.r, p.c);
      if (!action) { snd('illegal'); draw(); return; }
      if (drag) finishStroke();
      try { if (view.area.setPointerCapture && e.pointerId !== undefined) view.area.setPointerCapture(e.pointerId); } catch (er) {}
      bd.begin();
      drag = { r: p.r, c: p.c, action: action, axis: null, id: e.pointerId, last: i, dead: false };
      apply(i);
      if (action === 'clear1' || action === 'clear2') snd('select');
      if (checkWin()) return;
      draw();
    }
    function onMove(e) {
      if (!ready || ended || !view) return;
      var p = view.cellAt(e.clientX, e.clientY); if (!p) return;
      if (!drag) {
        if (e.pointerType === 'mouse' && e.target.closest && e.target.closest('.nono-area')) { if (setCur(p.r, p.c)) draw(); }
        return;
      }
      if (e.pointerId !== drag.id) return;
      var r = p.r, c = p.c;
      if (!drag.axis) { if (r === drag.r && c === drag.c) return; drag.axis = (r === drag.r) ? 'h' : (c === drag.c) ? 'v' : (Math.abs(c - drag.c) >= Math.abs(r - drag.r) ? 'h' : 'v'); }
      if (drag.axis === 'h') r = drag.r; else c = drag.c;
      var i = r * P.w + c; if (i === drag.last) return;
      // 把起点到当前点之间的格子都刷一遍（快速划动不漏格）
      var a = drag.axis === 'h' ? drag.c : drag.r, b = drag.axis === 'h' ? c : r, step = b >= a ? 1 : -1;
      for (var k = a; k !== b + step; k += step) apply(drag.axis === 'h' ? drag.r * P.w + k : k * P.w + drag.c);
      drag.last = i; setCur(r, c);
      if (checkWin()) return;
      draw();
    }
    function onUp(e) { if (drag && (e.pointerId === undefined || e.pointerId === drag.id)) finishStroke(); }
    function onLeave(e) { if (view && e.target === view.area && !drag && e.pointerType === 'mouse' && setCur(-1, -1)) draw(); }
    function onCtx(e) { if (e.target.closest && e.target.closest('.nono-board')) e.preventDefault(); }
    function onPad(e) {
      var b = e.target.closest ? e.target.closest('.nono-key') : null; if (!b || ended) return;
      setMode(b.getAttribute('data-k') === 'cross' ? CROSS : FILL);
    }
    function setMode(m) {
      mode = m; view.setMode(mode); snd('select');
      onStatus(mode === FILL ? '涂色模式：点格子涂色（电脑上右键直接打叉）' : '打叉模式：把确定是空的格子标上 ×');
    }
    function onKey(e) {
      if (!el.isConnected || !ready || ended) return;
      var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'x' || e.key === 'X') { setMode(mode === FILL ? CROSS : FILL); e.preventDefault(); }
      else if (e.key === 'f' || e.key === 'F') { setMode(FILL); e.preventDefault(); }
    }
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave, true);
    el.addEventListener('contextmenu', onCtx);
    el.addEventListener('click', onPad);
    if (typeof document !== 'undefined') document.addEventListener('keydown', onKey);
    newGame();

    return {
      undo: function () {
        if (!ready || ended) return;
        if (drag) finishStroke();
        var s = bd.undo();
        if (!s) { onStatus('没有可以撤销的了'); return; }
        bad = {}; flash = null; draw();
        onStatus('已撤销上一笔（' + s.length + ' 格）');
      },
      hint: function () {
        if (!ready || ended) return;
        if (drag) finishStroke();
        var h = findHint(bd.st, P); if (!h) return;
        bd.applyHint(h);
        var f = {}; h.cells.forEach(function (i) { f[i] = 1; }); flash = f;
        if (h.line >= 0) { cur = h.line < P.h ? { r: h.line, c: -1 } : { r: -1, c: h.line - P.h }; }
        snd('select'); onStatus('💡 ' + h.reason);
        if (checkWin()) return;
        draw();
        later(function () { if (flash === f) { flash = null; draw(); } }, 2000);
      },
      restart: function () { newGame(); },
      destroy: function () {
        dead = true; clearTimers();
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        el.removeEventListener('pointerleave', onLeave, true);
        el.removeEventListener('contextmenu', onCtx);
        el.removeEventListener('click', onPad);
        if (typeof document !== 'undefined') document.removeEventListener('keydown', onKey);
        el.innerHTML = '';
      },
      _state: function () { return { P: P, board: bd, mode: mode, ended: ended, index: idx, view: view }; }
    };
  }

  /* ===================== 规则演示 ===================== */
  function demo(el, opts) {
    opts = opts || {};
    var cap = opts.onCaption || function () {}, done = opts.onDone || function () {};
    var src = BANK[0].filter(function (p) { return p.t === '团子'; })[0] || BANK[0][0];
    var P = parsePuzzle(src), bd = new Board(P), view = createView(el, P, true), timers = [], stopped = false;
    var m = { st: bd.st, hl: null, hlx: null, flash: null, cur: null, done: null };
    view.setInfo('规则', '00:00', 0); view.setMode(FILL);
    function draw() { m.st = bd.st; m.done = doneMap(bd); view.render(m); }
    function at(ms, fn) { timers.push(setTimeout(function () { if (!stopped) fn(); }, ms)); }
    function set(list) { var o = {}; list.forEach(function (i) { o[i] = 1; }); return o; }
    function rowCells(r, cs) { return cs.map(function (c) { return r * P.w + c; }); }
    function colCells(c, rs) { return rs.map(function (r) { return r * P.w + c; }); }
    function clear() { m.hl = null; m.hlx = null; m.flash = null; m.cur = null; }
    function fillSeq(list, t0, gap) { list.forEach(function (i, k) { at(t0 + k * gap, function () { bd.st[i] = FILL; draw(); }); }); }
    var steps = [
      function () { // 1 目标
        clear(); cap('目标：按边上的数字线索涂格子，最后会涂出一幅画');
        at(700, function () { for (var i = 0; i < P.n; i++) bd.st[i] = P.sol[i] ? FILL : UNKNOWN; draw(); view.reveal(); });
        at(2600, function () { view.unreveal(); for (var i = 0; i < P.n; i++) bd.st[i] = UNKNOWN; draw(); });
      },
      function () { // 2 线索 = 连续块
        clear(); m.cur = { r: 0, c: -1 }; draw();
        cap('数字 = 连续涂色的格数：第 1 行的 3 就是连着涂 3 格');
        at(900, function () { m.hl = set(rowCells(0, [1, 2, 3])); draw(); });
      },
      function () { // 3 块之间至少空一格
        clear(); m.cur = { r: 2, c: -1 }; draw();
        cap('有好几个数字时按顺序排，块和块之间至少空一格');
        at(800, function () { m.hl = set(rowCells(2, [0, 2, 4])); draw(); });
        at(1700, function () { m.hlx = set(rowCells(2, [1, 3])); draw(); });
      },
      function () { // 4 满行直接涂
        clear(); m.cur = { r: 1, c: -1 }; draw();
        cap('满行直接涂：5 格宽的行写着 5，整行涂满');
        fillSeq(rowCells(1, [0, 1, 2, 3, 4]), 700, 110);
        at(1500, function () { m.cur = { r: 3, c: -1 }; draw(); });
        fillSeq(rowCells(3, [0, 1, 2, 3, 4]), 1700, 110);
      },
      function () { // 5 重叠法
        clear(); m.cur = { r: 0, c: -1 }; draw();
        cap('重叠法：3 放进 5 格，靠左靠右都会盖住中间那格，必涂');
        at(600, function () { m.hl = set(rowCells(0, [0, 1, 2])); draw(); });
        at(1300, function () { m.hl = set(rowCells(0, [2, 3, 4])); draw(); });
        at(2000, function () { m.hl = null; bd.st[2] = FILL; m.flash = set([2]); draw(); });
        at(2500, function () { m.cur = { r: 4, c: -1 }; m.flash = null; bd.st[22] = FILL; m.flash = set([22]); draw(); });
      },
      function () { // 6 打叉 + 完成
        clear(); m.cur = { r: -1, c: 0 }; draw();
        cap('第 1 列的 3 要连起第 2、4 格，两头一定是空的：打 ×');
        at(700, function () { bd.st[10] = FILL; m.flash = set([10]); draw(); });
        at(1300, function () { bd.st[0] = CROSS; bd.st[20] = CROSS; m.flash = set([0, 20]); draw(); });
        at(2300, function () { m.cur = { r: -1, c: 4 }; bd.st[14] = FILL; bd.st[4] = CROSS; bd.st[24] = CROSS; m.flash = set([4, 14, 24]); draw(); });
        at(3300, function () {
          clear(); cap('一步步推下去，就涂出了《' + P.t + '》！');
          for (var i = 0; i < P.n; i++) bd.st[i] = P.sol[i] ? FILL : CROSS;
          draw(); view.reveal();
        });
      }
    ];
    var t = 0, DUR = [3200, 3000, 3000, 3200, 3400, 5600];
    steps.forEach(function (fn, k) { at(t, fn); t += DUR[k]; });
    at(t, function () { done(); });
    draw();
    return { stop: function () { stopped = true; timers.forEach(clearTimeout); timers = []; } };
  }

  root.TZGAMES.nonogram = {
    id: 'nonogram', name: '数织', tagline: '按数字线索涂格子，涂出一幅画',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['单人'],
    mount: mount,
    demo: demo,
    _engine: engine
  };
})();
