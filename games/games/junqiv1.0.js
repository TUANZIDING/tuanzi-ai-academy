/* 团子棋馆 · 军棋（两人陆战棋 · 暗棋） v1.0 */
(function () {
  'use strict';
  var G = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
  G.TZGAMES = G.TZGAMES || {};
  var HAS_DOM = typeof document !== 'undefined' && !!document.createElement;

  /* ================= 引擎 ================= */
  var ROWS = 12, COLS = 5, N = 60;
  // 0 军旗 1 地雷 2 炸弹 3 工兵 4 排长 5 连长 6 营长 7 团长 8 旅长 9 师长 10 军长 11 司令
  var NAMES = ['军旗', '地雷', '炸弹', '工兵', '排长', '连长', '营长', '团长', '旅长', '师长', '军长', '司令'];
  var COUNTS = [1, 3, 2, 3, 3, 3, 2, 2, 2, 2, 1, 1];
  var VAL = [0, 2.5, 4, 2.6, 1.2, 1.6, 2.2, 3, 4, 5.5, 7.5, 10];
  var FLAGV = 300;
  var FLAG = 0, MINE = 1, BOMB = 2, SAPPER = 3, CMDR = 11;
  var QUIET_DRAW = 200;

  function rowOf(i) { return (i / 5) | 0; }
  function colOf(i) { return i % 5; }
  function code(side, rank) { return 1 + side * 12 + rank; }
  function cSide(c) { return ((c - 1) / 12) | 0; }
  function cRank(c) { return (c - 1) % 12; }
  function halfOf(r) { return r >= 6 ? 0 : 1; }               // 红方(0)在下半区 6..11，蓝方(1)在上半区 0..5
  function fromBack(side, r) { return side === 0 ? 12 - r : r + 1; } // 1 = 己方底线，6 = 己方前线

  var CAMP = [], HQ = [], RAIL = [], ADJ = [], RN = [], EDGES = [], RAILEDGES = [];
  (function build() {
    var i, r, c;
    for (i = 0; i < N; i++) { CAMP[i] = false; HQ[i] = false; ADJ[i] = []; RN[i] = [-1, -1, -1, -1]; }
    [[2, 1], [2, 3], [3, 2], [4, 1], [4, 3], [7, 1], [7, 3], [8, 2], [9, 1], [9, 3]].forEach(function (p) { CAMP[p[0] * 5 + p[1]] = true; });
    [[0, 1], [0, 3], [11, 1], [11, 3]].forEach(function (p) { HQ[p[0] * 5 + p[1]] = true; });
    function link(a, b) { if (ADJ[a].indexOf(b) < 0) { ADJ[a].push(b); ADJ[b].push(a); EDGES.push([a, b]); } }
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
      i = r * 5 + c;
      if (c < 4) link(i, i + 1);
      if (r < 11 && (r !== 5 || c % 2 === 0)) link(i, i + 5);   // 山界只在 1、3、5 列相通
      if (r < 11 && halfOf(r) === halfOf(r + 1)) {
        [-1, 1].forEach(function (dc) {
          var nc = c + dc; if (nc < 0 || nc > 4) return;
          var j = (r + 1) * 5 + nc;
          if (CAMP[i] || CAMP[j]) link(i, j);                   // 行营的斜线
        });
      }
    }
    // 铁路：方向 0上 1下 2左 3右
    function rl(a, b, d) { RN[a][d] = b; RN[b][d ^ 1] = a; RAILEDGES.push([a, b]); }
    [1, 5, 6, 10].forEach(function (rr) { for (var cc = 0; cc < 4; cc++) rl(rr * 5 + cc, rr * 5 + cc + 1, 3); });
    [0, 4].forEach(function (cc) { for (var rr = 1; rr <= 9; rr++) rl(rr * 5 + cc, (rr + 1) * 5 + cc, 1); });
    rl(5 * 5 + 2, 6 * 5 + 2, 1);                                  // 中路跨山界
    for (i = 0; i < N; i++) RAIL[i] = RN[i][0] >= 0 || RN[i][1] >= 0 || RN[i][2] >= 0 || RN[i][3] >= 0;
  })();

  var STAMP = new Int32Array(N), VIS = new Int32Array(N), stampV = 0, visV = 0;
  function genMoves(grid, side, onlyFrom) {
    var out = [], i, j, k, c, tc, rk, n, d;
    for (i = 0; i < N; i++) {
      if (onlyFrom != null && i !== onlyFrom) continue;
      c = grid[i]; if (!c || cSide(c) !== side) continue;
      rk = cRank(c); if (rk <= MINE || HQ[i]) continue;          // 军旗地雷不动；大本营里不能出来
      stampV++;
      var adj = ADJ[i];
      for (k = 0; k < adj.length; k++) {
        j = adj[k]; tc = grid[j];
        if (tc && (cSide(tc) === side || CAMP[j])) continue;       // 行营里的子不能被攻击
        if (STAMP[j] !== stampV) { STAMP[j] = stampV; out.push({ from: i, to: j }); }
      }
      if (!RAIL[i]) continue;
      if (rk === SAPPER) {                                          // 工兵：铁路上任意拐弯
        visV++; VIS[i] = visV; var q = [i], qh = 0;
        while (qh < q.length) {
          var x = q[qh++];
          for (d = 0; d < 4; d++) {
            n = RN[x][d]; if (n < 0 || VIS[n] === visV) continue;
            VIS[n] = visV; tc = grid[n];
            if (!tc) { if (STAMP[n] !== stampV) { STAMP[n] = stampV; out.push({ from: i, to: n }); } q.push(n); }
            else if (cSide(tc) !== side && !CAMP[n]) { if (STAMP[n] !== stampV) { STAMP[n] = stampV; out.push({ from: i, to: n }); } }
          }
        }
      } else {
        for (d = 0; d < 4; d++) {                                   // 其他子：铁路直线
          n = RN[i][d];
          while (n >= 0) {
            tc = grid[n];
            if (!tc) { if (STAMP[n] !== stampV) { STAMP[n] = stampV; out.push({ from: i, to: n }); } n = RN[n][d]; }
            else { if (cSide(tc) !== side && STAMP[n] !== stampV) { STAMP[n] = stampV; out.push({ from: i, to: n }); } break; }
          }
        }
      }
    }
    return out;
  }

  // 1 进攻方胜；-1 进攻方亡；0 同归于尽
  function combat(a, d) {
    if (d === FLAG) return 1;
    if (a === BOMB || d === BOMB) return 0;
    if (d === MINE) return a === SAPPER ? 1 : -1;
    return a > d ? 1 : a < d ? -1 : 0;
  }

  function shuffle(a, rng) { for (var i = a.length - 1; i > 0; i--) { var j = (rng() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function halfCells(side) { var out = []; for (var i = 0; i < N; i++) if (halfOf(rowOf(i)) === side && !CAMP[i]) out.push(i); return out; }

  function randomDeploy(side, rng, smart) {
    rng = rng || Math.random;
    var cells = halfCells(side), asg = {}, free = cells.slice();
    function take(i) { free.splice(free.indexOf(i), 1); }
    var hqs = cells.filter(function (i) { return HQ[i]; });
    var fc = hqs[(rng() * 2) | 0]; asg[fc] = FLAG; take(fc);
    var mc = free.filter(function (i) { return fromBack(side, rowOf(i)) <= 2; });
    var chosen = [];
    if (smart) {
      var nb = shuffle(ADJ[fc].filter(function (j) { return mc.indexOf(j) >= 0; }), rng);
      nb.forEach(function (j) { if (chosen.length < 2 && rng() < 0.75) chosen.push(j); });
    }
    shuffle(mc, rng).forEach(function (j) { if (chosen.length < 3 && chosen.indexOf(j) < 0) chosen.push(j); });
    chosen.forEach(function (j) { asg[j] = MINE; take(j); });
    var bc = shuffle(free.filter(function (i) { return fromBack(side, rowOf(i)) !== 6; }), rng).slice(0, 2);
    bc.forEach(function (j) { asg[j] = BOMB; take(j); });
    var rest = [];
    for (var rk = 3; rk <= 11; rk++) for (var k = 0; k < COUNTS[rk]; k++) rest.push(rk);
    shuffle(rest, rng);
    if (smart) { // 司令别放最前排
      var ci = rest.indexOf(CMDR), fi = free.map(function (i) { return fromBack(side, rowOf(i)) === 6; });
      if (fi[ci]) { for (var t = 0; t < free.length; t++) if (!fi[t]) { var tmp = rest[t]; rest[t] = rest[ci]; rest[ci] = tmp; break; } }
    }
    free.forEach(function (i, n) { asg[i] = rest[n]; });
    return cells.map(function (i) { return [i, asg[i]]; });
  }

  function isLegalDeploy(grid, side) {
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var i = 0; i < N; i++) {
      var c = grid[i]; if (!c || cSide(c) !== side) continue;
      var r = rowOf(i), rk = cRank(c);
      if (halfOf(r) !== side || CAMP[i]) return false;
      if (rk === FLAG && !HQ[i]) return false;
      if (rk === MINE && fromBack(side, r) > 2) return false;
      if (rk === BOMB && fromBack(side, r) === 6) return false;
      counts[rk]++;
    }
    for (var k = 0; k < 12; k++) if (counts[k] !== COUNTS[k]) return false;
    return true;
  }

  function emptyState() {
    var g = [], ids = [];
    for (var i = 0; i < N; i++) { g.push(0); ids.push(-1); }
    return { grid: g, ids: ids, pieces: [], turn: 0, over: null, quiet: 0, ply: 0, known: [{}, {}], flagRevealed: [false, false], dead: [[], []], last: null, lastBy: [null, null] };
  }
  function addPiece(st, side, idx, rank) {
    var id = st.pieces.length;
    st.pieces.push({ id: id, side: side, rank: rank, orig: idx, at: idx, moved: false, alive: true });
    st.grid[idx] = code(side, rank); st.ids[idx] = id; return id;
  }
  function newGame(o) {
    o = o || {}; var rng = o.rng || Math.random, smart = o.smart || [false, false];
    var st = emptyState();
    randomDeploy(0, rng, smart[0]).forEach(function (p) { addPiece(st, 0, p[0], p[1]); });
    randomDeploy(1, rng, smart[1]).forEach(function (p) { addPiece(st, 1, p[0], p[1]); });
    st.turn = 0; return st;
  }
  function redeploySide(st, side, rng, smart) {
    var ps = st.pieces.filter(function (p) { return p.side === side; });
    ps.forEach(function (p) { st.grid[p.at] = 0; st.ids[p.at] = -1; });
    randomDeploy(side, rng, smart).forEach(function (d, k) {
      var p = ps[k]; p.rank = d[1]; p.at = p.orig = d[0]; p.moved = false; p.alive = true;
      st.grid[d[0]] = code(side, d[1]); st.ids[d[0]] = p.id;
    });
  }
  function swapPieces(st, a, b) {
    var ca = st.grid[a], cb = st.grid[b];
    if (!ca || !cb || cSide(ca) !== cSide(cb)) return false;
    var pa = st.pieces[st.ids[a]], pb = st.pieces[st.ids[b]];
    if (pa.moved || pb.moved) return false;
    var side = cSide(ca);
    st.grid[a] = cb; st.grid[b] = ca;
    if (!isLegalDeploy(st.grid, side)) { st.grid[a] = ca; st.grid[b] = cb; return false; }
    st.ids[a] = pb.id; st.ids[b] = pa.id; pa.at = pa.orig = b; pb.at = pb.orig = a;
    return true;
  }
  function cloneState(s) {
    return {
      grid: s.grid.slice(), ids: s.ids.slice(), pieces: s.pieces.map(function (p) { return { id: p.id, side: p.side, rank: p.rank, orig: p.orig, at: p.at, moved: p.moved, alive: p.alive }; }),
      turn: s.turn, over: s.over ? { winner: s.over.winner, reason: s.over.reason } : null, quiet: s.quiet, ply: s.ply,
      known: [Object.assign({}, s.known[0]), Object.assign({}, s.known[1])], flagRevealed: s.flagRevealed.slice(),
      dead: [s.dead[0].slice(), s.dead[1].slice()], last: s.last, lastBy: s.lastBy.slice()
    };
  }
  function flagOf(st, side) { for (var k = 0; k < st.pieces.length; k++) { var p = st.pieces[k]; if (p.side === side && p.rank === FLAG && p.alive) return p; } return null; }

  function kill(st, p) {
    p.alive = false; st.dead[p.side].push(p.rank);
    if (st.ids[p.at] === p.id) { st.grid[p.at] = 0; st.ids[p.at] = -1; }
    if (p.rank === CMDR) {                                         // 司令阵亡 → 亮军旗
      st.flagRevealed[p.side] = true;
      var f = flagOf(st, p.side); if (f) st.known[1 - p.side][f.id] = FLAG;
    }
  }

  function applyMove(st, m) {
    var aid = st.ids[m.from], did = st.ids[m.to];
    var A = st.pieces[aid], side = A.side;
    var ev = { from: m.from, to: m.to, side: side, aid: aid, ar: A.rank, did: -1, dr: -1, res: null, flag: false, cmdrDied: [] };
    A.moved = true;
    st.grid[m.from] = 0; st.ids[m.from] = -1;
    if (did < 0) {
      A.at = m.to; st.grid[m.to] = code(side, A.rank); st.ids[m.to] = aid; st.quiet++;
    } else {
      var D = st.pieces[did]; ev.did = did; ev.dr = D.rank;
      var res = combat(A.rank, D.rank); ev.res = res; st.quiet = 0;
      st.known[1 - side][aid] = A.rank; st.known[side][did] = D.rank;   // 双方都看到了亮牌
      if (res === 1) { kill(st, D); A.at = m.to; st.grid[m.to] = code(side, A.rank); st.ids[m.to] = aid; if (D.rank === FLAG) ev.flag = true; }
      else if (res === -1) { A.at = m.from; A.alive = false; st.dead[side].push(A.rank); if (A.rank === CMDR) { st.flagRevealed[side] = true; var f = flagOf(st, side); if (f) st.known[1 - side][f.id] = FLAG; } }
      else { A.at = m.from; A.alive = false; st.dead[side].push(A.rank); if (A.rank === CMDR) { st.flagRevealed[side] = true; var f2 = flagOf(st, side); if (f2) st.known[1 - side][f2.id] = FLAG; } kill(st, D); }
      if (A.rank === CMDR && res !== 1) ev.cmdrDied.push(side);
      if (D.rank === CMDR && res !== -1) ev.cmdrDied.push(1 - side);
    }
    st.ply++; st.turn = 1 - side; st.last = { from: m.from, to: m.to }; st.lastBy[side] = { from: m.from, to: m.to, id: aid };
    if (ev.flag) st.over = { winner: side, reason: 'flag' };
    else if (!genMoves(st.grid, st.turn).length) st.over = { winner: side, reason: 'nomove' };
    else if (!genMoves(st.grid, side).length) st.over = { winner: 1 - side, reason: 'nomove' };
    else if (st.quiet >= QUIET_DRAW) st.over = { winner: -1, reason: 'draw' };
    return ev;
  }
  function checkWinner(st) { return st.over; }

  /* ---------- AI：信念模型（不偷看对方暗子） ---------- */
  function poolFor(st, s) {
    var e = 1 - s, pool = COUNTS.slice();
    st.dead[e].forEach(function (r) { pool[r]--; });
    st.pieces.forEach(function (p) { if (p.side === e && p.alive && st.known[s][p.id] != null) pool[st.known[s][p.id]]--; });
    for (var k = 0; k < 12; k++) if (pool[k] < 0) pool[k] = 0;
    return pool;
  }
  function unknownEnemies(st, s) { return st.pieces.filter(function (p) { return p.side !== s && p.alive && st.known[s][p.id] == null; }); }
  function canFlag(p) { return !p.moved && HQ[p.orig]; }
  function canMine(p) { return !p.moved && fromBack(p.side, rowOf(p.orig)) <= 2; }
  function canBomb(p) { return fromBack(p.side, rowOf(p.orig)) !== 6; }
  function allowed(p, r) { return r === FLAG ? canFlag(p) : r === MINE ? canMine(p) : r === BOMB ? canBomb(p) : true; }

  function sampleAssign(st, s, rng, U, pool) {
    var asg = {}, left = shuffle(U.slice(), rng);
    function pick(rank, n, preds) {
      for (var k = 0; k < n && left.length; k++) {
        var idx = -1;
        for (var t = 0; t < preds.length && idx < 0; t++) for (var j = 0; j < left.length; j++) if (preds[t](left[j])) { idx = j; break; }
        if (idx < 0) idx = 0;
        asg[left[idx].id] = rank; left.splice(idx, 1);
      }
    }
    var notMoved = function (p) { return !p.moved; };
    pick(FLAG, pool[FLAG], [canFlag, notMoved]);
    pick(MINE, pool[MINE], [canMine, notMoved]);
    pick(BOMB, pool[BOMB], [canBomb]);
    var rest = [];
    for (var r = 3; r < 12; r++) for (var k = 0; k < pool[r]; k++) rest.push(r);
    shuffle(rest, rng);
    left.forEach(function (p, n) { asg[p.id] = n < rest.length ? rest[n] : 4; });
    return asg;
  }

  // 返回 s 方对每个敌子的等级概率（按 id）。mode 0 只按剩余子力；1 加上“动过/位置”约束；2 联合抽样
  function belief(st, s, mode, rng) {
    rng = rng || Math.random;
    var B = {}, U = unknownEnemies(st, s), pool = poolFor(st, s), k, r;
    st.pieces.forEach(function (p) {
      if (p.side === s || !p.alive) return;
      var arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      if (st.known[s][p.id] != null) arr[st.known[s][p.id]] = 1;
      B[p.id] = arr;
    });
    if (!U.length) return B;
    if (mode >= 2) {
      var NS = 40;
      for (k = 0; k < NS; k++) { var asg = sampleAssign(st, s, rng, U, pool); for (var id in asg) B[id][asg[id]] += 1 / NS; }
    } else {
      U.forEach(function (p) {
        var arr = B[p.id], tot = 0;
        for (r = 0; r < 12; r++) { var w = pool[r]; if (mode === 1 && !allowed(p, r)) w = 0; arr[r] = w; tot += w; }
        if (!tot) { for (r = 0; r < 12; r++) { arr[r] = pool[r]; tot += pool[r]; } }
        for (r = 0; r < 12; r++) arr[r] = tot ? arr[r] / tot : 0;
      });
    }
    return B;
  }

  function viewGrid(st, s) {
    var g = st.grid.slice(), e = 1 - s;
    for (var i = 0; i < N; i++) {
      var c = g[i]; if (!c || cSide(c) === s) continue;
      var k = st.known[s][st.ids[i]];
      g[i] = code(e, k != null ? k : 4);              // 未知子：当作会走直线的普通子
    }
    return g;
  }

  function threat(vg, ids, s, Bm, pm, oppB) {
    var e = 1 - s, ms = genMoves(vg, e), mx = 0, sum = 0;
    for (var k = 0; k < ms.length; k++) {
      var m = ms[k], tc = vg[m.to];
      if (!tc || cSide(tc) !== s) continue;
      var R = cRank(tc), id = ids[m.from], P = Bm[id], g = 0;
      if (!P) continue;
      if (R === FLAG) g = FLAGV;
      else for (var a = 2; a < 12; a++) { if (!P[a]) continue; var res = combat(a, R); g += P[a] * (res === 1 ? VAL[R] : res === -1 ? -VAL[a] : VAL[R] - VAL[a]); }
      g *= pm[id];
      if (oppB && R !== FLAG && oppB[ids[m.to]]) {            // 对方只按它对我方暗子的猜测决定敢不敢攻
        var Q = oppB[ids[m.to]], pc = 0;
        for (var a2 = 2; a2 < 12; a2++) { if (!P[a2]) continue; for (var x = 0; x < 12; x++) { if (!Q[x]) continue; var r2 = combat(a2, x); pc += P[a2] * Q[x] * (r2 === 1 ? (x === FLAG ? FLAGV : VAL[x]) : r2 === -1 ? -VAL[a2] : VAL[x] - VAL[a2]); } }
        if (pc < 0) g *= 0.35;
      }
      if (g > 0) { sum += g; if (g > mx) mx = g; }
    }
    return mx + 0.2 * (sum - mx);
  }

  function pos(side, rk, i) {
    if (rk <= MINE) return 0;
    var r = rowOf(i), c = colOf(i), fb = fromBack(side, r);
    var er = side === 0 ? 0 : 11, d = Math.min(Math.abs(r - er) + Math.abs(c - 1), Math.abs(r - er) + Math.abs(c - 3));
    var v = 0;
    if (rk === CMDR) v += fb <= 7 ? 0.02 * fb : 0.14 - 0.04 * (fb - 7);
    else if (rk === SAPPER) v += fb >= 7 ? 0.05 * (12 - d) + 0.1 : 0.01 * fb;
    else if (rk === BOMB) v += 0.015 * fb;
    else v += 0.035 * (14 - d);
    if (CAMP[i]) v += 0.12;
    if (HQ[i]) v -= 0.6;
    return v;
  }

  function resolve(g, ids, m) {   // 在“完全信息”的假想局面里走一步；返回是否夺旗
    var a = g[m.from], d = g[m.to], aid = ids[m.from];
    g[m.from] = 0; ids[m.from] = -1;
    if (!d) { g[m.to] = a; ids[m.to] = aid; return false; }
    var dr = cRank(d), res = combat(cRank(a), dr);
    if (res === 1) { g[m.to] = a; ids[m.to] = aid; return dr === FLAG; }
    if (res === 0) { g[m.to] = 0; ids[m.to] = -1; }
    return false;
  }
  function matEval(g, s) {
    var v = 0, fl = [false, false];
    for (var i = 0; i < N; i++) { var c = g[i]; if (!c) continue; var sd = cSide(c), r = cRank(c); if (r === FLAG) fl[sd] = true; v += sd === s ? VAL[r] : -VAL[r]; }
    if (!fl[s]) v -= FLAGV; if (!fl[1 - s]) v += FLAGV;
    return v;
  }

  var L3W = 0.5;
  var NOISE = [2.4, 0.8, 0.15, 0.05], WT = [0.3, 0.6, 0.85, 0.85];
  function I5(r, c) { return r * 5 + c; }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  function chooseMove(st, s, level, opt) {
    level = Math.max(0, Math.min(3, level | 0));
    var rng = (opt && opt.rng) || Math.random, t0 = now(), e = 1 - s;
    var moves = genMoves(st.grid, s);
    if (!moves.length) return null;
    if (moves.length === 1) return moves[0];
    if (level === 0 && rng() < 0.18) return moves[(rng() * moves.length) | 0];
    var B = belief(st, s, level === 0 ? 0 : level === 1 ? 1 : 2, rng);
    var Bm = {}, pm = {};
    for (var id in B) {
      var P = B[id], mv = 1 - P[FLAG] - P[MINE], arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      if (mv > 1e-9) for (var r = 2; r < 12; r++) arr[r] = P[r] / mv;
      Bm[id] = arr; pm[id] = Math.max(0, mv);
    }
    var oppB0 = level === 3 ? belief(st, e, 1, rng) : null;
    var vg = viewGrid(st, s), t = threat(vg, st.ids, s, Bm, pm, oppB0), wT = WT[level];
    var lb = st.lastBy[s];
    // 大师：按“哪个大本营更像军旗”调整进攻方向；清除逼近我方军旗的敌子
    var hqW = null, myFlag = -1;
    if (level === 3) {
      var eh = e === 0 ? [I5(11, 1), I5(11, 3)] : [I5(0, 1), I5(0, 3)], wsum = 0;
      hqW = eh.map(function (h) { var id = st.ids[h]; var w = (id >= 0 && st.pieces[id].side === e && B[id]) ? B[id][FLAG] : 0; wsum += w; return [h, w]; });
      hqW.forEach(function (x) { x[1] = wsum > 0 ? x[1] / wsum : 0.5; });
      var mf = flagOf(st, s); if (mf) myFlag = mf.at;
    }
    function md(a, b) { return Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)); }
    function pos3(rk, i) { if (!hqW || rk <= BOMB || rk === CMDR) return 0; var v = 0; hqW.forEach(function (x) { v += x[1] * (14 - md(i, x[0])); }); return (rk === SAPPER ? 0.07 : 0.05) * v; }
    var scored = moves.map(function (m) {
      var a = st.grid[m.from], ar = cRank(a), sc = 0, ta;
      var g2 = vg.slice(), ids2 = st.ids.slice(); g2[m.from] = 0; ids2[m.from] = -1;
      if (vg[m.to]) {
        var P = B[st.ids[m.to]], ev = 0, pw = 0, mxp = 0;
        for (var r = 0; r < 12; r++) {
          if (!P[r]) continue; if (P[r] > mxp) mxp = P[r];
          var res = combat(ar, r);
          ev += P[r] * (res === 1 ? (r === FLAG ? FLAGV : VAL[r]) : res === -1 ? -VAL[ar] : VAL[r] - VAL[ar]);
          if (res === 1) pw += P[r];
        }
        if (P[FLAG] > 0.999) return { m: m, s: 1e6 };
        sc += ev;
        if (ar >= SAPPER && ar <= 5 && mxp < 0.99 && level > 0) sc += 0.25;   // 小子探路
        var gl = g2.slice(), gw = g2.slice(), idw = ids2.slice();
        gw[m.to] = a; idw[m.to] = st.ids[m.from];
        ta = pw * threat(gw, idw, s, Bm, pm, oppB0) + (1 - pw) * threat(gl, ids2, s, Bm, pm, oppB0);
      } else {
        g2[m.to] = a; ids2[m.to] = st.ids[m.from];
        ta = threat(g2, ids2, s, Bm, pm, oppB0);
      }
      sc -= wT * (ta - t);
      sc += pos(s, ar, m.to) - pos(s, ar, m.from);
      if (hqW) {
        sc += pos3(ar, m.to) - pos3(ar, m.from);
        if (vg[m.to] && myFlag >= 0) { var dd = md(m.to, myFlag); if (dd <= 3) sc += (4 - dd) * 0.5 * (1 - B[st.ids[m.to]][BOMB] * 0.5); }
      }
      if (lb && lb.id === st.ids[m.from] && lb.from === m.to) sc -= 0.5;
      return { m: m, s: sc + (rng() - 0.5) * 2 * NOISE[level] };
    });
    scored.sort(function (x, y) { return y.s - x.s; });
    if (level === 3 && scored[0].s < 1e5) {
      var cands = scored.slice(0, 10), acc = cands.map(function () { return 0; }), nw = 0;
      var U = unknownEnemies(st, s), pool = poolFor(st, s), oppB = oppB0;
      while (nw < 24 && (nw < 4 || now() - t0 < 280)) {
        var asg = sampleAssign(st, s, rng, U, pool), wg = st.grid.slice();
        for (var i = 0; i < N; i++) {
          var c = wg[i]; if (!c || cSide(c) !== e) continue;
          var kid = st.ids[i], kn = st.known[s][kid];
          wg[i] = code(e, kn != null ? kn : asg[kid]);
        }
        var base = matEval(wg, s);
        for (var ci = 0; ci < cands.length; ci++) {
          var g = wg.slice(), ids = st.ids.slice(), v;
          if (resolve(g, ids, cands[ci].m)) v = FLAGV;
          else {
            var rep = genMoves(g, e), best = null, bv = 0.3;
            for (var k = 0; k < rep.length; k++) {
              var rp = rep[k], tc = g[rp.to]; if (!tc || cSide(tc) !== s) continue;
              var Pq = oppB[ids[rp.to]]; if (!Pq) continue;
              var oa = cRank(g[rp.from]), evq = 0;
              for (var x = 0; x < 12; x++) { if (!Pq[x]) continue; var rq = combat(oa, x); evq += Pq[x] * (rq === 1 ? (x === FLAG ? FLAGV : VAL[x]) : rq === -1 ? -VAL[oa] : VAL[x] - VAL[oa]); }
              if (evq > bv) { bv = evq; best = rp; }
            }
            if (best && resolve(g, ids, best)) v = -FLAGV;
            else {
              if (best && g[best.to] && cSide(g[best.to]) === e) {   // 第三层：对方亮了牌的进攻子，我能否反吃
                var tr = cRank(g[best.to]), my = genMoves(g, s), bg = 0, bm = null;
                for (var q = 0; q < my.length; q++) {
                  if (my[q].to !== best.to) continue;
                  var rr = combat(cRank(g[my[q].from]), tr), gv = rr === 1 ? VAL[tr] : rr === 0 ? VAL[tr] - VAL[cRank(g[my[q].from])] : -1;
                  if (gv > bg) { bg = gv; bm = my[q]; }
                }
                if (bm) resolve(g, ids, bm);
              }
              v = matEval(g, s) - base;
            }
          }
          acc[ci] += v;
        }
        nw++;
      }
      cands.forEach(function (cd, ci) { cd.s = cd.s + L3W * acc[ci] / nw; });
      cands.sort(function (x, y) { return y.s - x.s; });
      return cands[0].m;
    }
    return scored[0].m;
  }

  var ENGINE = {
    ROWS: ROWS, COLS: COLS, N: N, NAMES: NAMES, COUNTS: COUNTS, CAMP: CAMP, HQ: HQ, RAIL: RAIL, ADJ: ADJ, RN: RN,
    FLAG: FLAG, MINE: MINE, BOMB: BOMB, SAPPER: SAPPER, CMDR: CMDR,
    idx: function (r, c) { return r * 5 + c; }, rowOf: rowOf, colOf: colOf, code: code, cSide: cSide, cRank: cRank, fromBack: fromBack,
    genMoves: genMoves, combat: combat, randomDeploy: randomDeploy, isLegalDeploy: isLegalDeploy, newGame: newGame, emptyState: emptyState,
    addPiece: addPiece, redeploySide: redeploySide, swapPieces: swapPieces, cloneState: cloneState, applyMove: applyMove, checkWinner: checkWinner,
    belief: belief, chooseMove: chooseMove, sampleAssign: sampleAssign
  };

  /* ================= 视图 ================= */
  var U = 900 / 13;
  function vx(vc) { return 50 + 100 * vc; }
  function vy(vr) { return vr < 6 ? (vr + 0.5) * U : (vr + 1.5) * U; }

  function boardSVG() {
    var s = [], i;
    s.push('<svg class="junqi-svg" viewBox="0 0 500 900" preserveAspectRatio="none" aria-hidden="true">');
    s.push('<rect x="4" y="4" width="492" height="892" rx="26" fill="#86c97a" stroke="#5fa356" stroke-width="6"/>');
    s.push('<rect x="10" y="' + (6 * U + 4) + '" width="480" height="' + (U - 8) + '" rx="14" fill="#c9e8b9" opacity=".9"/>');
    s.push('<text x="150" y="' + (6.5 * U + 7) + '" text-anchor="middle" font-size="20" fill="#5c8a4f" font-weight="700">山　界</text>');
    s.push('<text x="350" y="' + (6.5 * U + 7) + '" text-anchor="middle" font-size="20" fill="#5c8a4f" font-weight="700">山　界</text>');
    function P(i) { return [vx(colOf(i)), vy(rowOf(i))]; }
    var railSet = {};
    RAILEDGES.forEach(function (e) { railSet[Math.min(e[0], e[1]) + '-' + Math.max(e[0], e[1])] = 1; });
    EDGES.forEach(function (e) {
      if (railSet[Math.min(e[0], e[1]) + '-' + Math.max(e[0], e[1])]) return;
      var a = P(e[0]), b = P(e[1]);
      s.push('<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="rgba(255,255,255,.8)" stroke-width="2.5"/>');
    });
    var rails = RAILEDGES.map(function (e) { var a = P(e[0]), b = P(e[1]); return [a[0], a[1], b[0], b[1]]; });
    [['#ffffff', 14, ''], ['#3d3a36', 9, ''], ['#f4efe4', 3.5, ' stroke-dasharray="7 7"']].forEach(function (st) {
      rails.forEach(function (l) { s.push('<line x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] + '" stroke="' + st[0] + '" stroke-width="' + st[1] + '" stroke-linecap="round"' + st[2] + '/>'); });
    });
    for (i = 0; i < N; i++) {
      var p = P(i);
      if (CAMP[i]) s.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="30" fill="#bfe6ad" stroke="#fff" stroke-width="4"/>');
      else if (HQ[i]) {
        s.push('<rect x="' + (p[0] - 40) + '" y="' + (p[1] - 25) + '" width="80" height="50" rx="16" fill="#f7e7b4" stroke="#fff" stroke-width="4"/>');
        s.push('<text x="' + p[0] + '" y="' + (p[1] + 6) + '" text-anchor="middle" font-size="16" fill="#9a7a3c" font-weight="700">大本营</text>');
      } else s.push('<rect x="' + (p[0] - 30) + '" y="' + (p[1] - 17) + '" width="60" height="34" rx="7" fill="rgba(255,255,255,.28)" stroke="rgba(255,255,255,.9)" stroke-width="2"/>');
    }
    s.push('</svg>');
    return s.join('');
  }

  function makeView(el, flip) {
    var wrap = document.createElement('div'); wrap.className = 'junqi-wrap';
    var board = document.createElement('div'); board.className = 'junqi-board';
    board.innerHTML = '<div class="junqi-sizer"></div>' + boardSVG() + '<div class="junqi-marks"></div><div class="junqi-pieces"></div><div class="junqi-toast"></div>';
    wrap.appendChild(board); el.appendChild(wrap);
    var marks = board.querySelector('.junqi-marks'), layer = board.querySelector('.junqi-pieces'), toastEl = board.querySelector('.junqi-toast');
    var nodes = {}, timers = [], toastT = null;
    function V(i) { var r = rowOf(i), c = colOf(i); if (flip) { r = 11 - r; c = 4 - c; } return [vx(c) / 5, vy(r) / 9]; }  // 百分比
    function place(node, i) { var p = V(i); node.style.left = p[0] + '%'; node.style.top = p[1] + '%'; }
    function mark(i, cls, txt) { var d = document.createElement('div'); d.className = cls; place(d, i); if (txt) d.textContent = txt; marks.appendChild(d); }
    function render(st, ui) {
      ui = ui || {};
      marks.innerHTML = '';
      if (st.last) { mark(st.last.from, 'junqi-mark'); mark(st.last.to, 'junqi-mark'); }
      if (ui.hint) { mark(ui.hint.from, 'junqi-hint'); mark(ui.hint.to, 'junqi-hint'); }
      (ui.safe || []).forEach(function (i) { mark(i, 'junqi-safe', '安全'); });
      (ui.dots || []).forEach(function (i) { mark(i, st.grid[i] ? 'junqi-ring' : 'junqi-dot'); });
      var seen = {};
      st.pieces.forEach(function (p) {
        if (!p.alive) return;
        seen[p.id] = 1;
        var n = nodes[p.id];
        if (!n) { n = document.createElement('div'); nodes[p.id] = n; place(n, p.at); layer.appendChild(n); }
        var hidden = !ui.revealAll && p.side !== ui.me && !(p.rank === FLAG && st.flagRevealed[p.side]);
        var cls = 'junqi-pc ' + (p.side === 0 ? 'junqi-red' : 'junqi-blue');
        if (hidden) cls += ' junqi-hidden';
        if (ui.sel === p.at) cls += ' junqi-sel';
        if (ui.danger === p.at) cls += ' junqi-danger';
        if (p.rank === FLAG && st.flagRevealed[p.side] && !hidden) cls += ' junqi-exposed';
        if (ui.attackId === p.id) cls += ' junqi-top';
        n.className = cls;
        var txt = hidden ? '?' : NAMES[p.rank];
        if (n.textContent !== txt) n.textContent = txt;
        place(n, ui.attackId === p.id && ui.attackTo != null ? ui.attackTo : p.at);
      });
      Object.keys(nodes).forEach(function (id) {
        if (seen[id]) return;
        var n = nodes[id]; delete nodes[id];
        n.classList.add('junqi-gone');
        timers.push(setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 260));
      });
    }
    function toast(txt, ms) {
      toastEl.textContent = txt; toastEl.classList.add('junqi-show');
      if (toastT) clearTimeout(toastT);
      toastT = setTimeout(function () { toastEl.classList.remove('junqi-show'); }, ms || 1500);
    }
    function cellAt(cx, cy) {
      var rc = board.getBoundingClientRect();
      var x = (cx - rc.left) / rc.width * 500, y = (cy - rc.top) / rc.height * 900;
      if (x < 0 || y < 0 || x > 500 || y > 900) return -1;
      var c = Math.max(0, Math.min(4, Math.floor(x / 100))), r;
      if (y < 6 * U) r = Math.floor(y / U); else if (y < 7 * U) r = y < 6.5 * U ? 5 : 6; else r = Math.floor(y / U) - 1;
      r = Math.max(0, Math.min(11, r));
      if (flip) { r = 11 - r; c = 4 - c; }
      return r * 5 + c;
    }
    function clear() { Object.keys(nodes).forEach(function (id) { var n = nodes[id]; if (n.parentNode) n.parentNode.removeChild(n); }); nodes = {}; }
    function destroy() { timers.forEach(clearTimeout); if (toastT) clearTimeout(toastT); if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    return { wrap: wrap, board: board, render: render, toast: toast, cellAt: cellAt, clear: clear, destroy: destroy };
  }

  /* ================= 对局 ================= */
  var SIDES = ['红方', '蓝方'];
  function mount(el, opts) {
    opts = opts || {};
    var level = Math.max(0, Math.min(3, opts.level | 0)), me = opts.side === 1 ? 1 : 0, ai = 1 - me;
    var onStatus = opts.onStatus || function () {}, onEnd = opts.onEnd || function () {}, snd = opts.sound || function () {};
    el.innerHTML = '';
    var view = makeView(el, me === 1);
    var info = document.createElement('div'); info.className = 'junqi-info';
    view.wrap.appendChild(info);
    var st, sel = -1, busy = false, timers = [], undoStack = [], playerMoved = false, hintMv = null, dangerIdx = -1, ended = false, destroyed = false;
    function later(fn, ms) { var t = setTimeout(function () { timers = timers.filter(function (x) { return x !== t; }); if (!destroyed) fn(); }, ms); timers.push(t); return t; }

    function start() {
      timers.forEach(clearTimeout); timers = [];
      st = newGame({ smart: me === 0 ? [false, level >= 1] : [level >= 1, false] });
      sel = -1; busy = false; undoStack = []; playerMoved = false; hintMv = null; dangerIdx = -1; ended = false;
      view.clear(); draw(); 
      if (st.turn === ai) aiTurn(); else status();
    }
    function myMovesFrom(i) { return genMoves(st.grid, me, i); }
    function draw(extra) {
      var ui = { me: me, sel: sel, dots: [], hint: hintMv, danger: dangerIdx, revealAll: !!st.over };
      if (sel >= 0) ui.dots = myMovesFrom(sel).map(function (m) { return m.to; });
      if (extra) for (var k in extra) ui[k] = extra[k];
      view.render(st, ui);
      drawInfo();
    }
    function chips(list) { return list.map(function (r) { return '<span class="junqi-chip">' + NAMES[r] + '</span>'; }).join(''); }
    function drawInfo() {
      var html = '<div class="junqi-row"><b>第 ' + (st.ply + 1) + ' 手</b>';
      if (!playerMoved && !st.over) html += '<button class="junqi-btn" type="button">🔀 重新布阵</button>';
      html += '</div>';
      if (!playerMoved && !st.over) html += '<div class="junqi-tip">开局前：点两枚己方棋子可互换位置（须合规）</div>';
      html += '<div class="junqi-row"><span class="junqi-lbl">对方阵亡</span>' + (chips(st.dead[ai]) || '<span class="junqi-none">—</span>') + '</div>';
      html += '<div class="junqi-row"><span class="junqi-lbl">我方阵亡</span>' + (chips(st.dead[me]) || '<span class="junqi-none">—</span>') + '</div>';
      info.innerHTML = html;
      var b = info.querySelector('.junqi-btn'); if (b) b.onclick = function () { ctl.redeploy(); };
    }
    function status() {
      if (st.over) return;
      if (st.turn !== me) { onStatus('电脑思考中…'); return; }
      var t = !playerMoved ? '布阵：可点两子互换，或直接走棋 · ' + SIDES[me] : '轮到你走 · ' + SIDES[me];
      if (dangerIdx >= 0) t = '⚠ 军旗危险！' + t;
      onStatus(t);
    }
    function fightText(ev) {
      var a = NAMES[ev.ar], d = NAMES[ev.dr], t;
      if (ev.side === me) t = '你的 ' + a + ' ⚔ 对方 ' + d + ' → ' + (ev.res === 1 ? (ev.dr === FLAG ? '夺得军旗！' : '你赢') : ev.res === -1 ? (ev.dr === MINE ? '踩雷了' : '你输') : '同归于尽');
      else t = '对方 ' + a + ' ⚔ 你的 ' + d + ' → ' + (ev.res === 1 ? (ev.dr === FLAG ? '军旗被夺' : '对方赢') : ev.res === -1 ? '你守住了' : '同归于尽');
      if (ev.cmdrDied.length) t += ev.cmdrDied.indexOf(ai) >= 0 ? ' · 对方司令阵亡，军旗亮出！' : ' · 我方司令阵亡，军旗暴露';
      return t;
    }
    function doMove(m, byPlayer) {
      hintMv = null; sel = -1; busy = true;
      if (byPlayer) { undoStack.push({ st: cloneState(st), pm: playerMoved }); playerMoved = true; dangerIdx = -1; }
      var isAtk = !!st.grid[m.to];
      var fin = function () {
        var ev = applyMove(st, m);
        if (ev.did >= 0) { snd('capture'); view.toast(fightText(ev), 1700); } else snd('move');
        if (byPlayer) dangerIdx = -1;
        else {
          var f = flagOf(st, me); dangerIdx = -1;
          if (f && !st.over && genMoves(st.grid, ai).some(function (x) { return x.to === f.at; })) { dangerIdx = f.at; snd('check'); }
        }
        draw(); after();
      };
      if (isAtk) { draw({ attackId: st.ids[m.from], attackTo: m.to }); later(fin, 220); } else fin();
    }
    function after() {
      if (st.over) { finish(); return; }
      if (st.turn === ai) aiTurn(); else { busy = false; status(); }
    }
    function aiTurn() {
      busy = true; onStatus('电脑思考中…');
      later(function () { var m = chooseMove(st, ai, level); if (m) doMove(m, false); else { busy = false; } }, 380);
    }
    function finish() {
      busy = false; if (ended) return; ended = true; dangerIdx = -1; draw();
      var o = st.over, w = o.winner === -1 ? 'draw' : o.winner === me ? 'player' : 'ai', reason;
      if (o.reason === 'draw') reason = '长时间无交战，和棋';
      else if (o.reason === 'flag') reason = w === 'player' ? '夺得对方军旗' : '军旗被对方夺走';
      else reason = w === 'player' ? '对方已无子可动' : '我方已无子可动';
      onStatus(w === 'player' ? '你赢了！' + reason : w === 'ai' ? '你输了 · ' + reason : reason);
      snd(w === 'player' ? 'win' : w === 'ai' ? 'lose' : 'move');
      onEnd({ winner: w, reason: reason });
    }
    function onTap(e) {
      if (destroyed) return;
      var i = view.cellAt(e.clientX, e.clientY); if (i < 0) return;
      if (e.preventDefault) e.preventDefault();
      if (busy || st.over || st.turn !== me) return;
      var c = st.grid[i], own = c && cSide(c) === me;
      if (sel >= 0) {
        if (i === sel) { sel = -1; draw(); return; }
        var mv = myMovesFrom(sel).filter(function (m) { return m.to === i; })[0];
        if (mv) { doMove(mv, true); return; }
        if (own) {
          if (!playerMoved) {
            if (swapPieces(st, sel, i)) { snd('select'); sel = -1; draw(); onStatus('已互换 · 继续调整或直接走棋'); return; }
            snd('illegal'); sel = i; draw(); onStatus('这样换不合规（军旗在大本营、地雷后两排、炸弹不在第一排）'); return;
          }
          if (myMovesFrom(i).length) { sel = i; snd('select'); } else { sel = -1; snd('illegal'); }
          draw(); return;
        }
        sel = -1; snd('illegal'); draw(); return;
      }
      if (own && (!playerMoved || myMovesFrom(i).length)) { sel = i; snd('select'); draw(); }
      else { snd('illegal'); }
    }
    view.board.addEventListener('pointerdown', onTap);

    var ctl = {
      undo: function () {
        if (busy || !undoStack.length) return;
        var u = undoStack.pop(); st = u.st; playerMoved = u.pm; sel = -1; hintMv = null; dangerIdx = -1; ended = false;
        view.clear(); draw(); status();
      },
      restart: function () { start(); },
      hint: function () {
        if (busy || st.over || st.turn !== me) return;
        var m = chooseMove(st, me, 2); if (!m) return;
        hintMv = m; draw();
        later(function () { hintMv = null; draw(); }, 2000);
      },
      redeploy: function () {
        if (busy || playerMoved || st.over) return false;
        redeploySide(st, me, Math.random, false); sel = -1; draw(); snd('select'); status(); return true;
      },
      destroy: function () {
        destroyed = true; timers.forEach(clearTimeout); timers = [];
        view.board.removeEventListener('pointerdown', onTap); view.destroy(); el.innerHTML = '';
      }
    };
    start();
    return ctl;
  }

  /* ================= 规则演示 ================= */
  function demo(el, opts) {
    opts = opts || {};
    var cap = opts.onCaption || function () {}, done = opts.onDone || function () {};
    el.innerHTML = '';
    var view = makeView(el, false), timers = [], stopped = false, st;
    function T(fn, ms) { timers.push(setTimeout(function () { if (!stopped) fn(); }, ms)); }
    function I(r, c) { return r * 5 + c; }
    function setup(list) { view.clear(); st = emptyState(); list.forEach(function (p) { addPiece(st, p[2], I(p[0], p[1]), p[3]); }); show(); }
    var ui = {};
    function show(extra) { ui = Object.assign({ me: 0, revealAll: true }, extra || {}); view.render(st, ui); }
    function go(from, to, toastTxt) {
      var m = { from: from, to: to };
      if (st.grid[to]) {
        show({ attackId: st.ids[from], attackTo: to });
        T(function () { applyMove(st, m); st.over = null; show(); if (toastTxt) view.toast(toastTxt, 1400); }, 220);
      } else { applyMove(st, m); st.over = null; show(); }
    }
    function path(pts, k) {     // 沿路径逐站移动（演示工兵拐弯）
      var p = st.pieces[st.ids[pts[0]]];
      pts.slice(1).forEach(function (to, n) {
        T(function () { st.grid[p.at] = 0; st.ids[p.at] = -1; p.at = to; st.grid[to] = code(p.side, p.rank); st.ids[to] = p.id; st.last = { from: pts[0], to: to }; show(); }, n * k);
      });
    }
    var steps = [
      [3000, '目标：攻进对方大本营，吃掉军旗就赢！', function () {
        setup([[1, 1, 0, 7], [0, 1, 1, FLAG], [0, 3, 1, 4], [0, 0, 1, MINE]]);
        show({ hint: { from: I(1, 1), to: I(0, 1) } });
        T(function () { go(I(1, 1), I(0, 1), '团长 ⚔ 军旗 → 夺旗胜利！🚩'); }, 1200);
      }],
      [3000, '大官吃小官：司令>军长>师长>…>排长>工兵', function () {
        setup([[6, 2, 0, 10], [5, 2, 1, 9], [4, 0, 1, 3]]);
        T(function () { show({ dots: genMoves(st.grid, 0, I(6, 2)).map(function (m) { return m.to; }), sel: I(6, 2) }); }, 500);
        T(function () { go(I(6, 2), I(5, 2), '军长 ⚔ 师长 → 军长赢'); }, 1300);
      }],
      [3000, '铁路（黑白轨道）上能沿直线一口气跑到底', function () {
        setup([[10, 0, 0, 6], [1, 2, 1, 5]]);
        T(function () { show({ sel: I(10, 0), dots: genMoves(st.grid, 0, I(10, 0)).map(function (m) { return m.to; }) }); }, 500);
        T(function () { go(I(10, 0), I(1, 0)); }, 1600);
      }],
      [3400, '工兵最灵活：在铁路上可以随意拐弯', function () {
        setup([[10, 4, 0, SAPPER], [4, 2, 1, 8]]);
        T(function () { show({ sel: I(10, 4), dots: genMoves(st.grid, 0, I(10, 4)).map(function (m) { return m.to; }) }); }, 400);
        T(function () { path([I(10, 4), I(9, 4), I(8, 4), I(7, 4), I(6, 4), I(6, 3), I(6, 2), I(5, 2)], 170); }, 1500);
      }],
      [3000, '炸弹碰谁都同归于尽，专门炸大官', function () {
        setup([[6, 0, 0, BOMB], [5, 0, 1, CMDR]]);
        T(function () { go(I(6, 0), I(5, 0), '炸弹 ⚔ 司令 → 同归于尽💥'); }, 1100);
      }],
      [4200, '地雷炸死来犯的子，只有工兵能挖掉它', function () {
        setup([[0, 0, 1, MINE], [1, 0, 0, 9], [2, 0, 0, SAPPER], [0, 2, 1, FLAG]]);
        T(function () { go(I(1, 0), I(0, 0), '师长 ⚔ 地雷 → 师长阵亡'); }, 800);
        T(function () { go(I(2, 0), I(1, 0)); }, 2000);
        T(function () { go(I(1, 0), I(0, 0), '工兵 ⚔ 地雷 → 挖雷成功⛏'); }, 2800);
      }],
      [3400, '圆圈是行营：躲在里面的棋子不能被攻击', function () {
        setup([[4, 1, 1, 5], [5, 1, 0, 10], [5, 0, 1, 4]]);
        T(function () { show({ sel: I(5, 1), dots: genMoves(st.grid, 0, I(5, 1)).map(function (m) { return m.to; }), safe: [I(4, 1)] }); }, 700);
        T(function () { show({ safe: [I(4, 1)] }); view.toast('行营里的连长很安全', 1300); }, 2200);
      }]
    ];
    var at = 0;
    function next() {
      if (stopped) return;
      if (at >= steps.length) { done(); return; }
      var s = steps[at++]; cap(s[1]); s[2](); T(next, s[0]);
    }
    T(next, 50);
    return { stop: function () { stopped = true; timers.forEach(clearTimeout); timers = []; view.destroy(); } };
  }

  G.TZGAMES.junqi = {
    id: 'junqi', name: '军棋', tagline: '暗棋对决，工兵挖雷、炸弹换司令，夺旗才算赢',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['红方', '蓝方'],
    mount: mount, demo: demo, _engine: ENGINE
  };
  void HAS_DOM;
})();
