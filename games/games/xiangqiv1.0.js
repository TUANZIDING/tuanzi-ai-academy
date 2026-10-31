/* 团子棋馆 · 中国象棋 (xiangqi) v1.0 */
(function () {
  'use strict';
  var W = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
  W.TZGAMES = W.TZGAMES || {};
  var HAS_DOM = (typeof document !== 'undefined');

  /* ===================== ENGINE ===================== */
  // board: Int8Array(90), index r*9+c, row 0 = 黑方底线 (top), row 9 = 红方底线 (bottom)
  // piece: type | (color<<3); type K1 A2 B3 N4 R5 C6 P7; color 0 red, 1 black
  var K = 1, A = 2, B = 3, N = 4, R = 5, C = 6, P = 7;
  var NAMES = [
    ['', '帅', '仕', '相', '马', '车', '炮', '兵'],
    ['', '将', '士', '象', '马', '车', '炮', '卒']
  ];
  var VAL = [0, 0, 120, 120, 270, 600, 285, 30];
  var MATE = 30000, INF = 32000;

  function startBoard() {
    var b = new Int8Array(90);
    var back = [R, N, B, A, K, A, B, N, R];
    for (var c = 0; c < 9; c++) { b[c] = back[c] | 8; b[81 + c] = back[c]; }
    b[2 * 9 + 1] = C | 8; b[2 * 9 + 7] = C | 8;
    b[7 * 9 + 1] = C; b[7 * 9 + 7] = C;
    for (c = 0; c <= 8; c += 2) { b[3 * 9 + c] = P | 8; b[6 * 9 + c] = P; }
    return b;
  }

  function inPalace(side, r, c) {
    if (c < 3 || c > 5) return false;
    return side === 0 ? (r >= 7 && r <= 9) : (r >= 0 && r <= 2);
  }
  function onBoard(r, c) { return r >= 0 && r < 10 && c >= 0 && c < 9; }

  var ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var HORSE = [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
    [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]];

  function addMove(b, side, from, to, out, capOnly) {
    var q = b[to];
    if (q) { if ((q >> 3) === side) return; out.push((from << 8) | to); }
    else if (!capOnly) out.push((from << 8) | to);
  }

  function genFrom(b, s, out, capOnly) {
    var p = b[s]; if (!p) return;
    var side = p >> 3, t = p & 7, r = (s / 9) | 0, c = s - r * 9, i, nr, nc, d;
    switch (t) {
      case K:
        for (i = 0; i < 4; i++) { nr = r + ORTH[i][0]; nc = c + ORTH[i][1]; if (inPalace(side, nr, nc)) addMove(b, side, s, nr * 9 + nc, out, capOnly); }
        break;
      case A:
        for (i = 0; i < 4; i++) { nr = r + DIAG[i][0]; nc = c + DIAG[i][1]; if (inPalace(side, nr, nc)) addMove(b, side, s, nr * 9 + nc, out, capOnly); }
        break;
      case B:
        for (i = 0; i < 4; i++) {
          nr = r + 2 * DIAG[i][0]; nc = c + 2 * DIAG[i][1];
          if (!onBoard(nr, nc)) continue;
          if (side === 0 ? nr < 5 : nr > 4) continue; // 不过河
          if (b[(r + DIAG[i][0]) * 9 + c + DIAG[i][1]]) continue; // 塞象眼
          addMove(b, side, s, nr * 9 + nc, out, capOnly);
        }
        break;
      case N:
        for (i = 0; i < 8; i++) {
          d = HORSE[i]; nr = r + d[0]; nc = c + d[1];
          if (!onBoard(nr, nc)) continue;
          if (b[(r + d[2]) * 9 + c + d[3]]) continue; // 蹩马腿
          addMove(b, side, s, nr * 9 + nc, out, capOnly);
        }
        break;
      case R:
        for (i = 0; i < 4; i++) {
          nr = r + ORTH[i][0]; nc = c + ORTH[i][1];
          while (onBoard(nr, nc)) {
            var q = b[nr * 9 + nc];
            if (q) { if ((q >> 3) !== side) out.push((s << 8) | (nr * 9 + nc)); break; }
            if (!capOnly) out.push((s << 8) | (nr * 9 + nc));
            nr += ORTH[i][0]; nc += ORTH[i][1];
          }
        }
        break;
      case C:
        for (i = 0; i < 4; i++) {
          nr = r + ORTH[i][0]; nc = c + ORTH[i][1];
          var jumped = false;
          while (onBoard(nr, nc)) {
            var q2 = b[nr * 9 + nc];
            if (!jumped) {
              if (q2) jumped = true;
              else if (!capOnly) out.push((s << 8) | (nr * 9 + nc));
            } else if (q2) {
              if ((q2 >> 3) !== side) out.push((s << 8) | (nr * 9 + nc));
              break;
            }
            nr += ORTH[i][0]; nc += ORTH[i][1];
          }
        }
        break;
      case P:
        var fd = side === 0 ? -1 : 1;
        nr = r + fd; if (onBoard(nr, c)) addMove(b, side, s, nr * 9 + c, out, capOnly);
        if (side === 0 ? r <= 4 : r >= 5) {
          if (c > 0) addMove(b, side, s, r * 9 + c - 1, out, capOnly);
          if (c < 8) addMove(b, side, s, r * 9 + c + 1, out, capOnly);
        }
        break;
    }
  }

  function genPseudo(b, side, out, capOnly) {
    for (var s = 0; s < 90; s++) { var p = b[s]; if (p && (p >> 3) === side) genFrom(b, s, out, capOnly); }
    return out;
  }

  function findKing(b, side) {
    var k = K | (side << 3), r0 = side === 0 ? 7 : 0;
    for (var r = r0; r < r0 + 3; r++) for (var c = 3; c <= 5; c++) if (b[r * 9 + c] === k) return r * 9 + c;
    return -1;
  }

  // is square sq (holding side's king) attacked by the opponent? includes 将帅照面
  function attacked(b, sq, side) {
    var en = 1 - side, r = (sq / 9) | 0, c = sq - r * 9, i, nr, nc, q;
    for (i = 0; i < 4; i++) {
      var dr = ORTH[i][0], dc = ORTH[i][1];
      nr = r + dr; nc = c + dc; var cnt = 0;
      while (onBoard(nr, nc)) {
        q = b[nr * 9 + nc];
        if (q) {
          if (cnt === 0) {
            if ((q >> 3) === en) { var t = q & 7; if (t === R || (t === K && dc === 0)) return true; }
            cnt = 1;
          } else {
            if (q === (C | (en << 3))) return true;
            break;
          }
        }
        nr += dr; nc += dc;
      }
    }
    var enN = N | (en << 3);
    for (i = 0; i < 4; i++) {
      var ddr = DIAG[i][0], ddc = DIAG[i][1];
      var lr = r + ddr, lc = c + ddc;
      if (!onBoard(lr, lc) || b[lr * 9 + lc]) continue;
      nr = r + 2 * ddr; nc = c + ddc; if (onBoard(nr, nc) && b[nr * 9 + nc] === enN) return true;
      nr = r + ddr; nc = c + 2 * ddc; if (onBoard(nr, nc) && b[nr * 9 + nc] === enN) return true;
    }
    var enP = P | (en << 3), efd = en === 0 ? -1 : 1;
    nr = r - efd; if (onBoard(nr, c) && b[nr * 9 + c] === enP) return true;
    if (c > 0 && b[sq - 1] === enP) return true;
    if (c < 8 && b[sq + 1] === enP) return true;
    return false;
  }

  function inCheck(b, side) {
    var k = findKing(b, side);
    if (k < 0) return false;
    return attacked(b, k, side);
  }

  function legalMoves(b, side, fromSq) {
    var ps = [], out = [];
    if (fromSq === undefined) genPseudo(b, side, ps, false); else genFrom(b, fromSq, ps, false);
    for (var i = 0; i < ps.length; i++) {
      var m = ps[i], f = m >> 8, t = m & 255, cap = b[t], pc = b[f];
      if (fromSq !== undefined && (pc >> 3) !== side) continue;
      b[t] = pc; b[f] = 0;
      if (!inCheck(b, side)) out.push(m);
      b[f] = pc; b[t] = cap;
    }
    return out;
  }

  /* ---- evaluation tables ---- */
  function pstVal(t, r, c) { // r from red's view (9 = own back rank)
    var cd = Math.abs(c - 4);
    switch (t) {
      case P:
        if (r >= 5) return r === 5 ? 6 : 0;
        var v = [18, 60, 66, 58, 42][r];
        if (r > 0) v += (4 - cd) * 4;
        return v;
      case N:
        var vn = (4 - cd) * 6 - ((c === 0 || c === 8) ? 18 : 0);
        if (r >= 1 && r <= 5) vn += 16; else if (r === 9) vn -= 12;
        if (r === 2 && (c === 3 || c === 5)) vn += 12;
        return vn;
      case R:
        var vr = (4 - cd) * 3;
        if (r <= 4) vr += 12;
        if (r === 1) vr += 10;
        if (r === 9) vr -= 6;
        return vr;
      case C:
        var vc = 0;
        if (c === 4) vc += 16;
        if (r === 7) vc += 4;
        if (r <= 2) vc += 6;
        if (r === 0 && (c === 3 || c === 5)) vc += 6;
        return vc;
      case K:
        return (r === 9 ? 6 : r === 8 ? 0 : -12) + (c === 4 ? 4 : 0);
      case A:
        return (r === 8 && c === 4) ? 6 : 0;
      case B:
        return (r === 7 && c === 4) ? 6 : (r === 9 && c === 4) ? 4 : 0;
    }
    return 0;
  }
  var PS = []; // PS[p][s] red-positive score
  (function () {
    for (var p = 0; p < 16; p++) {
      PS[p] = new Int16Array(90);
      var t = p & 7, col = p >> 3;
      if (!t) continue;
      for (var s = 0; s < 90; s++) {
        var r = (s / 9) | 0, c = s % 9;
        var rr = col === 0 ? r : 9 - r;
        var v = VAL[t] + pstVal(t, rr, c);
        PS[p][s] = col === 0 ? v : -v;
      }
    }
  })();

  // Zobrist (two 32-bit keys)
  var Z1 = [], Z2 = [], ZS1, ZS2;
  (function () {
    var seed = 0x1234567;
    function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
    for (var p = 0; p < 16; p++) { Z1[p] = new Int32Array(90); Z2[p] = new Int32Array(90); for (var s = 0; s < 90; s++) { Z1[p][s] = rnd(); Z2[p][s] = rnd(); } }
    ZS1 = rnd(); ZS2 = rnd();
  })();
  function hashOf(b, side) {
    var h1 = 0, h2 = 0;
    for (var s = 0; s < 90; s++) if (b[s]) { h1 ^= Z1[b[s]][s]; h2 ^= Z2[b[s]][s]; }
    if (side) { h1 ^= ZS1; h2 ^= ZS2; }
    return [h1, h2];
  }
  function hashKey(b, side) { var h = hashOf(b, side); return h[0] + ':' + h[1]; }
  function evalBoard(b) { var sc = 0; for (var s = 0; s < 90; s++) if (b[s]) sc += PS[b[s]][s]; return sc; }

  var now = (typeof performance !== 'undefined' && performance.now) ? function () { return performance.now(); } : function () { return Date.now(); };

  /* ---- search ---- */
  function Searcher(board, side, gameHashes) {
    this.b = new Int8Array(board);
    this.side = side;
    var h = hashOf(this.b, side); this.h1 = h[0]; this.h2 = h[1];
    this.score = evalBoard(this.b);
    this.path = (gameHashes || []).slice(-60); // keys "h1:h2" of game history
    this.stack = [];
    this.tt = new Map();
    this.killers = []; for (var i = 0; i < 64; i++) this.killers.push([0, 0]);
    this.hist = new Int32Array(90 * 90);
    this.nodes = 0; this.stopped = false; this.deadline = Infinity;
  }
  var SP = Searcher.prototype;
  SP.make = function (m) {
    var b = this.b, f = m >> 8, t = m & 255, pc = b[f], cap = b[t];
    if (cap) { this.score -= PS[cap][t]; this.h1 ^= Z1[cap][t]; this.h2 ^= Z2[cap][t]; }
    this.score += PS[pc][t] - PS[pc][f];
    this.h1 ^= Z1[pc][f] ^ Z1[pc][t] ^ ZS1; this.h2 ^= Z2[pc][f] ^ Z2[pc][t] ^ ZS2;
    b[t] = pc; b[f] = 0; this.side ^= 1;
    this.stack.push(cap);
    this.path.push(this.h1 + ':' + this.h2);
  };
  SP.unmake = function (m) {
    var b = this.b, f = m >> 8, t = m & 255, pc = b[t], cap = this.stack.pop();
    this.path.pop();
    b[f] = pc; b[t] = cap; this.side ^= 1;
    this.score -= PS[pc][t] - PS[pc][f];
    this.h1 ^= Z1[pc][f] ^ Z1[pc][t] ^ ZS1; this.h2 ^= Z2[pc][f] ^ Z2[pc][t] ^ ZS2;
    if (cap) { this.score += PS[cap][t]; this.h1 ^= Z1[cap][t]; this.h2 ^= Z2[cap][t]; }
  };
  SP.isRep = function () {
    var p = this.path, key = p[p.length - 1];
    for (var i = p.length - 3; i >= 0 && i >= p.length - 40; i -= 2) if (p[i] === key) return true;
    return false;
  };
  SP.tick = function () {
    if ((++this.nodes & 1023) === 0 && now() > this.deadline) this.stopped = true;
    return this.stopped;
  };
  SP.orderScores = function (moves, ttMove, ply) {
    var b = this.b, sc = new Array(moves.length), kl = this.killers[ply] || [0, 0];
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i], cap = b[m & 255];
      if (m === ttMove) sc[i] = 1e9;
      else if (cap) sc[i] = 1e8 + VAL[cap & 7] * 16 + ((cap & 7) === K ? 1e6 : 0) - VAL[b[m >> 8] & 7] / 8;
      else if (m === kl[0]) sc[i] = 9e7;
      else if (m === kl[1]) sc[i] = 8e7;
      else sc[i] = this.hist[(m >> 8) * 90 + (m & 255)];
    }
    return sc;
  };
  function pickNext(moves, sc, i) {
    var bi = i, bv = sc[i];
    for (var j = i + 1; j < moves.length; j++) if (sc[j] > bv) { bv = sc[j]; bi = j; }
    if (bi !== i) { var t = moves[i]; moves[i] = moves[bi]; moves[bi] = t; t = sc[i]; sc[i] = sc[bi]; sc[bi] = t; }
    return moves[i];
  }
  SP.qs = function (alpha, beta, ply, qd) {
    if (this.tick()) return 0;
    var stand = this.side === 0 ? this.score : -this.score;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (qd > 8) return stand;
    var moves = genPseudo(this.b, this.side, [], true);
    var sc = this.orderScores(moves, 0, ply);
    var me = this.side;
    for (var i = 0; i < moves.length; i++) {
      var m = pickNext(moves, sc, i);
      this.make(m);
      if (inCheck(this.b, me)) { this.unmake(m); continue; }
      var v = -this.qs(-beta, -alpha, ply + 1, qd + 1);
      this.unmake(m);
      if (this.stopped) return 0;
      if (v > alpha) { alpha = v; if (alpha >= beta) break; }
    }
    return alpha;
  };
  SP.negamax = function (depth, alpha, beta, ply) {
    if (this.tick()) return 0;
    if (ply > 0 && this.isRep()) return 0;
    var me = this.side, chk = inCheck(this.b, me);
    if (chk && ply < 40) depth++;
    if (depth <= 0) return this.qs(alpha, beta, ply, 0);
    var key = this.h1, ent = this.tt.get(key), ttMove = 0;
    if (ent && ent.h2 === this.h2) {
      ttMove = ent.m;
      if (ply > 0 && ent.d >= depth) {
        var es = ent.s;
        if (es > MATE - 500) es -= ply; else if (es < -MATE + 500) es += ply;
        if (ent.f === 0) return es;
        if (ent.f === 1 && es >= beta) return es;
        if (ent.f === 2 && es <= alpha) return es;
      }
    }
    var moves = genPseudo(this.b, me, [], false);
    var sc = this.orderScores(moves, ttMove, ply);
    var best = -INF, bestMove = 0, legal = 0, a0 = alpha;
    for (var i = 0; i < moves.length; i++) {
      var m = pickNext(moves, sc, i);
      var isCap = this.b[m & 255] !== 0;
      this.make(m);
      if (inCheck(this.b, me)) { this.unmake(m); continue; }
      legal++;
      var v;
      if (legal === 1) v = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      else {
        v = -this.negamax(depth - 1, -alpha - 1, -alpha, ply + 1);
        if (v > alpha && v < beta && !this.stopped) v = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      }
      this.unmake(m);
      if (this.stopped) return 0;
      if (v > best) { best = v; bestMove = m; }
      if (v > alpha) {
        alpha = v;
        if (alpha >= beta) {
          if (!isCap && ply < 64) {
            var kl = this.killers[ply];
            if (kl[0] !== m) { kl[1] = kl[0]; kl[0] = m; }
            this.hist[(m >> 8) * 90 + (m & 255)] += depth * depth;
          }
          break;
        }
      }
    }
    if (legal === 0) return -MATE + ply; // 将死或困毙都判负
    var st = best;
    if (st > MATE - 500) st += ply; else if (st < -MATE + 500) st -= ply;
    if (this.tt.size > 400000) this.tt.clear();
    this.tt.set(key, { h2: this.h2, d: depth, s: st, f: best <= a0 ? 2 : (best >= beta ? 1 : 0), m: bestMove });
    return best;
  };
  // root search for one depth; returns {move, score, complete}
  SP.root = function (depth, rootMoves) {
    var alpha = -INF, beta = INF, bestM = 0, bestS = -INF, done = 0, me = this.side;
    for (var i = 0; i < rootMoves.length; i++) {
      var m = rootMoves[i];
      this.make(m);
      var v;
      if (i === 0) v = -this.negamax(depth - 1, -beta, -alpha, 1);
      else {
        v = -this.negamax(depth - 1, -alpha - 1, -alpha, 1);
        if (v > alpha && !this.stopped) v = -this.negamax(depth - 1, -beta, -alpha, 1);
      }
      this.unmake(m);
      if (this.stopped) break;
      done++;
      if (v > bestS) { bestS = v; bestM = m; }
      if (v > alpha) alpha = v;
    }
    void me;
    return { move: bestM, score: bestS, done: done };
  };

  var LEVELS = [
    { depth: 1, time: 400, randomTop: 5, randomP: 0.35 },
    { depth: 2, time: 1100 },
    { depth: 4, time: 600 },
    { depth: 40, time: 1150 }
  ];

  // returns {move, from, to, score, depth} or null if no legal move
  function bestMove(board, side, level, gameHashes, rng) {
    rng = rng || Math.random;
    var cfg = LEVELS[Math.max(0, Math.min(3, level | 0))];
    var legal = legalMoves(new Int8Array(board), side);
    if (!legal.length) return null;
    var S = new Searcher(board, side, gameHashes);
    var t0 = now();
    if (cfg.randomTop) {
      // depth-1 + quiescence score for every move, then sometimes pick from the top 5
      S.deadline = t0 + cfg.time;
      var scored = [];
      for (var i = 0; i < legal.length; i++) {
        S.make(legal[i]);
        var v = S.isRep() ? 0 : -S.qs(-INF, INF, 1, 0);
        S.unmake(legal[i]);
        if (S.stopped) { S.stopped = false; v = -INF + 1; }
        scored.push({ m: legal[i], s: v + rng() * 0.5 });
      }
      scored.sort(function (a, b) { return b.s - a.s; });
      var pick = scored[0];
      if (rng() < cfg.randomP) pick = scored[Math.floor(rng() * Math.min(cfg.randomTop, scored.length))];
      return { move: pick.m, from: pick.m >> 8, to: pick.m & 255, score: Math.round(pick.s), depth: 1 };
    }
    S.deadline = t0 + cfg.time;
    var rootMoves = legal.slice();
    var sc0 = S.orderScores(rootMoves, 0, 0);
    var idx = rootMoves.map(function (m, i) { return i; }).sort(function (a, b) { return sc0[b] - sc0[a]; });
    rootMoves = idx.map(function (i) { return rootMoves[i]; });
    var best = { move: rootMoves[0], score: 0, depth: 0 };
    for (var d = 1; d <= cfg.depth; d++) {
      var res = S.root(d, rootMoves);
      if (res.done > 0 && res.move) {
        best = { move: res.move, score: res.score, depth: d };
        var k = rootMoves.indexOf(res.move);
        rootMoves.splice(k, 1); rootMoves.unshift(res.move);
      }
      if (S.stopped) break;
      if (Math.abs(res.score) > MATE - 200) break; // found a forced mate
      if (now() - t0 > cfg.time * 0.45) break;
    }
    return { move: best.move, from: best.move >> 8, to: best.move & 255, score: best.score, depth: best.depth };
  }

  function hasAttackers(b, side) {
    for (var s = 0; s < 90; s++) { var p = b[s]; if (p && (p >> 3) === side) { var t = p & 7; if (t === R || t === N || t === C || t === P) return true; } }
    return false;
  }

  // status of position for side to move: {over, loser, reason, draw}
  function gameStatus(b, side, hashes) {
    var lm = legalMoves(b, side);
    if (!lm.length) {
      var chk = inCheck(b, side);
      return { over: true, loser: side, reason: chk ? 'mate' : 'stalemate' };
    }
    if (!hasAttackers(b, 0) && !hasAttackers(b, 1)) return { over: true, draw: true, reason: 'material' };
    if (hashes && hashes.length) {
      var key = hashes[hashes.length - 1], n = 0;
      for (var i = 0; i < hashes.length; i++) if (hashes[i] === key) n++;
      if (n >= 3) return { over: true, draw: true, reason: 'repetition' };
      if (hashes.length > 300) return { over: true, draw: true, reason: 'limit' };
    }
    return { over: false };
  }

  var ENGINE = {
    K: K, A: A, B: B, N: N, R: R, C: C, P: P, NAMES: NAMES,
    startBoard: startBoard, genPseudo: genPseudo, legalMoves: legalMoves, inCheck: inCheck,
    findKing: findKing, attacked: attacked, bestMove: bestMove, gameStatus: gameStatus,
    hashKey: hashKey, evalBoard: evalBoard, LEVELS: LEVELS
  };

  /* ===================== VIEW ===================== */
  var CSS = [
    '.xq-wrap{--xqW:var(--bw,min(92vw,560px));display:flex;flex-direction:column;align-items:center;gap:8px;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}',
    '.xq-board{position:relative;width:var(--xqW);height:calc(var(--xqW) * 10 / 9);border-radius:var(--radius,18px);background:radial-gradient(120% 90% at 30% 20%,#ffe9c2 0%,#f7d59c 55%,#eec37f 100%);box-shadow:0 10px 24px rgba(120,80,30,.18),inset 0 0 0 4px #e3b46d,inset 0 0 0 6px #fbe3b8;touch-action:manipulation;overflow:hidden}',
    '.xq-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}',
    '.xq-layer{position:absolute;inset:0;pointer-events:none}',
    '.xq-pc{position:absolute;width:10.4%;height:9.36%;transform:translate(-50%,-50%);transition:left .18s ease,top .18s ease,transform .15s ease,opacity .18s;z-index:3}',
    '.xq-pc i{position:absolute;inset:0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;font-size:calc(var(--xqW) * 0.058);line-height:1;background:radial-gradient(circle at 35% 30%,#fff6df 0%,#f6dcaa 45%,#e2b571 100%);box-shadow:0 3px 0 #b7843f,0 5px 8px rgba(90,55,20,.28),inset 0 0 0 2px #c99552,inset 0 0 0 4px #f8e6c2;font-family:"Kaiti SC","STKaiti","KaiTi","Songti SC",serif}',
    '.xq-pc i::after{content:"";position:absolute;inset:14%;border-radius:50%;border:1.5px solid currentColor;opacity:.45}',
    '.xq-pc.xq-red i{color:#d6333a}.xq-pc.xq-black i{color:#2b2340}',
    '.xq-pc.xq-sel{transform:translate(-50%,-58%) scale(1.06);z-index:5}',
    '.xq-pc.xq-sel i{box-shadow:0 0 0 3px var(--yellow,#ffc53d),0 6px 0 #b7843f,0 10px 14px rgba(90,55,20,.3),inset 0 0 0 2px #c99552,inset 0 0 0 4px #f8e6c2}',
    '.xq-pc.xq-gone{opacity:0;transform:translate(-50%,-50%) scale(.6)}',
    '.xq-mk{position:absolute;transform:translate(-50%,-50%);border-radius:50%}',
    '.xq-dot{width:3.4%;height:3.06%;background:rgba(34,160,107,.55);z-index:6}',
    '.xq-cap{width:11.4%;height:10.26%;border:3px solid rgba(34,160,107,.75);box-sizing:border-box;z-index:6}',
    '.xq-last{width:11.6%;height:10.44%;background:rgba(255,197,61,.35);box-shadow:0 0 0 2px rgba(255,170,30,.45);z-index:2}',
    '.xq-chk{width:12.4%;height:11.16%;background:rgba(229,72,77,.25);box-shadow:0 0 0 3px var(--red,#e5484d);z-index:4;animation:xqpulse .8s ease-in-out infinite}',
    '.xq-hint{width:12%;height:10.8%;box-shadow:0 0 0 3px var(--purple,#8b5cf6);background:rgba(139,92,246,.18);z-index:4;animation:xqpulse 1s ease-in-out infinite}',
    '.xq-flash{width:11.6%;height:10.44%;background:rgba(229,72,77,.28);box-shadow:0 0 0 2px rgba(229,72,77,.6);z-index:2;animation:xqpulse 1s ease-in-out infinite}',
    '.xq-area{width:11.6%;height:10.44%;background:rgba(59,130,246,.18);z-index:1;border-radius:22%}',
    '@keyframes xqpulse{0%,100%{opacity:1}50%{opacity:.45}}',
    '.xq-info{width:var(--xqW);display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;color:var(--muted,#7a6f86);min-height:26px}',
    '.xq-caps{display:flex;flex-wrap:wrap;gap:2px;align-items:center;min-height:22px}',
    '.xq-caps b{font-weight:600;margin-right:4px;color:var(--ink,#2b2340)}',
    '.xq-mini{display:inline-flex;width:20px;height:20px;border-radius:50%;align-items:center;justify-content:center;font-size:12px;font-weight:800;background:#f6dcaa;box-shadow:inset 0 0 0 1.5px #c99552}',
    '.xq-mini.xq-red{color:#d6333a}.xq-mini.xq-black{color:#2b2340}',
    '.xq-count{white-space:nowrap;background:var(--card,#fff);border:1px solid var(--line,#e9dcc8);border-radius:999px;padding:2px 10px;color:var(--ink,#2b2340)}'
  ].join('\n');

  function injectCSS() {
    if (!HAS_DOM || document.querySelector('style[data-xq-css]')) return;
    var st = document.createElement('style'); st.setAttribute('data-xq-css', '1'); st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function boardSVG() {
    var L = [], x, y;
    var stroke = 'stroke="#9a6a2f" stroke-width="0.55" stroke-linecap="round"';
    L.push('<rect x="5" y="5" width="80" height="90" fill="none" stroke="#9a6a2f" stroke-width="1.1"/>');
    for (y = 0; y < 10; y++) L.push('<line x1="5" y1="' + (5 + y * 10) + '" x2="85" y2="' + (5 + y * 10) + '" ' + stroke + '/>');
    for (x = 1; x < 8; x++) {
      L.push('<line x1="' + (5 + x * 10) + '" y1="5" x2="' + (5 + x * 10) + '" y2="45" ' + stroke + '/>');
      L.push('<line x1="' + (5 + x * 10) + '" y1="55" x2="' + (5 + x * 10) + '" y2="95" ' + stroke + '/>');
    }
    L.push('<line x1="35" y1="5" x2="55" y2="25" ' + stroke + '/><line x1="55" y1="5" x2="35" y2="25" ' + stroke + '/>');
    L.push('<line x1="35" y1="75" x2="55" y2="95" ' + stroke + '/><line x1="55" y1="75" x2="35" y2="95" ' + stroke + '/>');
    // star marks at cannon/pawn points
    var pts = [[2, 1], [2, 7], [7, 1], [7, 7], [3, 0], [3, 2], [3, 4], [3, 6], [3, 8], [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]];
    pts.forEach(function (p) {
      var cx = 5 + p[1] * 10, cy = 5 + p[0] * 10, g = 1.2, l = 2.6;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) {
        var ex = cx + d[0] * g, ey = cy + d[1] * g;
        if (ex < 5 || ex > 85) return;
        L.push('<polyline points="' + (ex + d[0] * l) + ',' + ey + ' ' + ex + ',' + ey + ' ' + ex + ',' + (ey + d[1] * l) + '" fill="none" ' + stroke + '/>');
      });
    });
    L.push('<text x="25" y="52.6" font-size="6.2" text-anchor="middle" fill="#9a6a2f" font-family="Kaiti SC,STKaiti,KaiTi,serif" letter-spacing="3" opacity=".85">楚 河</text>');
    L.push('<text x="65" y="52.6" font-size="6.2" text-anchor="middle" fill="#9a6a2f" font-family="Kaiti SC,STKaiti,KaiTi,serif" letter-spacing="3" opacity=".85">汉 界</text>');
    return '<svg class="xq-svg" viewBox="0 0 90 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' + L.join('') + '</svg>';
  }

  function View(el, flipped) {
    injectCSS();
    this.el = el; this.flipped = !!flipped;
    el.innerHTML = '';
    var wrap = document.createElement('div'); wrap.className = 'xq-wrap';
    this.topInfo = document.createElement('div'); this.topInfo.className = 'xq-info';
    var board = document.createElement('div'); board.className = 'xq-board';
    board.innerHTML = boardSVG();
    this.marks = document.createElement('div'); this.marks.className = 'xq-layer';
    this.pieces = document.createElement('div'); this.pieces.className = 'xq-layer';
    board.appendChild(this.marks); board.appendChild(this.pieces);
    this.botInfo = document.createElement('div'); this.botInfo.className = 'xq-info';
    wrap.appendChild(this.topInfo); wrap.appendChild(board); wrap.appendChild(this.botInfo);
    el.appendChild(wrap);
    this.board = board; this.wrap = wrap;
    this.sqEl = new Array(90);
  }
  View.prototype.xy = function (sq) {
    var r = (sq / 9) | 0, c = sq % 9;
    if (this.flipped) { r = 9 - r; c = 8 - c; }
    return { x: ((c + 0.5) / 9 * 100) + '%', y: ((r + 0.5) / 10 * 100) + '%' };
  };
  View.prototype.sqFromPoint = function (clientX, clientY) {
    var rc = this.board.getBoundingClientRect();
    var c = Math.floor((clientX - rc.left) / rc.width * 9), r = Math.floor((clientY - rc.top) / rc.height * 10);
    if (c < 0 || c > 8 || r < 0 || r > 9) return -1;
    if (this.flipped) { r = 9 - r; c = 8 - c; }
    return r * 9 + c;
  };
  View.prototype.makePiece = function (p, sq) {
    var d = document.createElement('div');
    d.className = 'xq-pc ' + ((p >> 3) ? 'xq-black' : 'xq-red');
    d.innerHTML = '<i>' + NAMES[p >> 3][p & 7] + '</i>';
    var xy = this.xy(sq); d.style.left = xy.x; d.style.top = xy.y;
    this.pieces.appendChild(d);
    return d;
  };
  View.prototype.setBoard = function (b) {
    this.pieces.innerHTML = '';
    for (var s = 0; s < 90; s++) this.sqEl[s] = b[s] ? this.makePiece(b[s], s) : null;
  };
  View.prototype.move = function (f, t) {
    var e = this.sqEl[f], victim = this.sqEl[t];
    if (victim && victim !== e) {
      victim.classList.add('xq-gone');
      setTimeout(function () { if (victim.parentNode) victim.parentNode.removeChild(victim); }, 200);
    }
    if (e) { var xy = this.xy(t); e.style.left = xy.x; e.style.top = xy.y; e.classList.remove('xq-sel'); }
    this.sqEl[t] = e; this.sqEl[f] = null;
  };
  View.prototype.setMarks = function (o) {
    o = o || {};
    var self = this, html = [];
    function mk(cls, sq) { var xy = self.xy(sq); html.push('<div class="xq-mk ' + cls + '" style="left:' + xy.x + ';top:' + xy.y + '"></div>'); }
    (o.area || []).forEach(function (s) { mk('xq-area', s); });
    (o.last || []).forEach(function (s) { mk('xq-last', s); });
    (o.flash || []).forEach(function (s) { mk('xq-flash', s); });
    if (o.check >= 0) mk('xq-chk', o.check);
    (o.hint || []).forEach(function (s) { mk('xq-hint', s); });
    (o.dots || []).forEach(function (s) { mk('xq-dot', s); });
    (o.caps || []).forEach(function (s) { mk('xq-cap', s); });
    this.marks.innerHTML = html.join('');
    for (var s = 0; s < 90; s++) if (this.sqEl[s]) this.sqEl[s].classList.toggle('xq-sel', s === o.sel);
  };

  function splitTargets(b, moves) {
    var dots = [], caps = [];
    moves.forEach(function (m) { var t = m & 255; (b[t] ? caps : dots).push(t); });
    return { dots: dots, caps: caps };
  }
  function miniHTML(p) { return '<span class="xq-mini ' + ((p >> 3) ? 'xq-black' : 'xq-red') + '">' + NAMES[p >> 3][p & 7] + '</span>'; }

  /* ===================== MOUNT ===================== */
  function mount(el, opts) {
    opts = opts || {};
    var level = Math.max(0, Math.min(3, opts.level | 0));
    var me = opts.side === 1 ? 1 : 0, ai = 1 - me;
    var SIDES = ['红方', '黑方'];
    var sound = function (n) { try { opts.sound && opts.sound(n); } catch (e) { } };
    var status = function (t) { try { opts.onStatus && opts.onStatus(t); } catch (e) { } };
    var view = new View(el, me === 1);
    var st, timers = [], hintTimer = null, hintSq = null, destroyed = false;

    function later(fn, ms) { var id = setTimeout(function () { timers = timers.filter(function (x) { return x !== id; }); if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; } hintSq = null; }

    function fresh() {
      var b = startBoard();
      st = { b: b, side: 0, last: [], sel: -1, selMoves: [], over: false, thinking: false, plies: 0,
        hashes: [hashKey(b, 0)], capMe: [], capAi: [], snaps: [] };
    }
    function snapshot() {
      return { b: new Int8Array(st.b), side: st.side, last: st.last.slice(), plies: st.plies, hashes: st.hashes.slice(), capMe: st.capMe.slice(), capAi: st.capAi.slice() };
    }
    function refreshInfo() {
      view.topInfo.innerHTML = '<div class="xq-caps"><b>电脑吃子</b>' + st.capAi.map(miniHTML).join('') + '</div><span class="xq-count">电脑 · ' + SIDES[ai] + '</span>';
      view.botInfo.innerHTML = '<div class="xq-caps"><b>你吃子</b>' + st.capMe.map(miniHTML).join('') + '</div><span class="xq-count">第 ' + (Math.floor(st.plies / 2) + 1) + ' 回合</span>';
    }
    function refreshMarks() {
      var tg = splitTargets(st.b, st.selMoves);
      var chk = inCheck(st.b, st.side) ? findKing(st.b, st.side) : -1;
      view.setMarks({ sel: st.sel, dots: tg.dots, caps: tg.caps, last: st.last, check: chk, hint: hintSq || [] });
    }
    function turnStatus() {
      if (st.over) return;
      if (st.thinking) { status('电脑思考中…'); return; }
      if (st.side === me) status(inCheck(st.b, me) ? '将军！快应将 · ' + SIDES[me] : '轮到你走 · ' + SIDES[me]);
    }
    function finish(gs) {
      st.over = true; st.sel = -1; st.selMoves = [];
      var res;
      if (gs.draw) {
        res = { winner: 'draw', reason: gs.reason === 'repetition' ? '局面重复三次，和棋' : gs.reason === 'material' ? '双方都没有进攻子力，和棋' : '步数过多，判和' };
      } else {
        var loserName = SIDES[gs.loser];
        res = { winner: gs.loser === me ? 'ai' : 'player', reason: gs.reason === 'mate' ? loserName + '被将死（绝杀）' : loserName + '无子可走（困毙）' };
      }
      sound(res.winner === 'player' ? 'win' : res.winner === 'ai' ? 'lose' : 'move');
      status(res.winner === 'player' ? '你赢了！' + res.reason : res.winner === 'ai' ? '电脑获胜 · ' + res.reason : res.reason);
      refreshMarks();
      try { opts.onEnd && opts.onEnd(res); } catch (e) { }
    }
    function play(m) {
      var f = m >> 8, t = m & 255, cap = st.b[t], mover = st.side;
      view.move(f, t);
      st.b[t] = st.b[f]; st.b[f] = 0;
      st.side ^= 1; st.plies++;
      st.last = [f, t]; st.sel = -1; st.selMoves = [];
      st.hashes.push(hashKey(st.b, st.side));
      if (cap) (mover === me ? st.capMe : st.capAi).push(cap);
      var chk = inCheck(st.b, st.side);
      sound(chk ? 'check' : cap ? 'capture' : 'move');
      refreshInfo(); refreshMarks();
      var gs = gameStatus(st.b, st.side, st.hashes);
      if (gs.over) { finish(gs); return; }
      if (st.side === ai) aiTurn();
      else { turnStatus(); }
    }
    function aiTurn() {
      st.thinking = true; status('电脑思考中…');
      later(function () {
        var res = bestMove(st.b, st.side, level, st.hashes);
        st.thinking = false;
        if (!res) { finish(gameStatus(st.b, st.side, st.hashes)); return; }
        play(res.move);
      }, 260);
    }
    function onDown(ev) {
      if (destroyed || !st || st.over || st.thinking || st.side !== me) return;
      if (ev.button !== undefined && ev.button > 0) return;
      ev.preventDefault && ev.preventDefault();
      var sq = view.sqFromPoint(ev.clientX, ev.clientY);
      if (sq < 0) return;
      if (st.sel >= 0) {
        for (var i = 0; i < st.selMoves.length; i++) {
          if ((st.selMoves[i] & 255) === sq) {
            st.snaps.push(snapshot());
            hintSq = null;
            play(st.selMoves[i]);
            return;
          }
        }
      }
      var p = st.b[sq];
      if (p && (p >> 3) === me && sq !== st.sel) {
        st.sel = sq; st.selMoves = legalMoves(st.b, me, sq);
        sound(st.selMoves.length ? 'select' : 'illegal');
      } else {
        if (st.sel >= 0 || p) sound('illegal');
        st.sel = -1; st.selMoves = [];
      }
      refreshMarks();
    }
    view.board.addEventListener('pointerdown', onDown);

    function start() {
      clearTimers(); fresh();
      view.setBoard(st.b); refreshInfo(); refreshMarks();
      if (me === 1) aiTurn(); else turnStatus();
    }
    start();

    return {
      undo: function () {
        if (destroyed || !st || st.thinking || !st.snaps.length) return;
        var s = st.snaps.pop();
        if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; } hintSq = null;
        st.b = s.b; st.side = s.side; st.last = s.last; st.plies = s.plies; st.hashes = s.hashes;
        st.capMe = s.capMe; st.capAi = s.capAi; st.sel = -1; st.selMoves = []; st.over = false;
        view.setBoard(st.b); refreshInfo(); refreshMarks(); turnStatus();
      },
      restart: function () { if (!destroyed) start(); },
      hint: function () {
        if (destroyed || !st || st.over || st.thinking || st.side !== me) return;
        status('正在想提示…');
        later(function () {
          if (st.over || st.thinking || st.side !== me) return;
          var res = bestMove(st.b, me, 2, st.hashes);
          if (!res) return;
          hintSq = [res.from, res.to]; refreshMarks(); turnStatus();
          if (hintTimer) clearTimeout(hintTimer);
          hintTimer = setTimeout(function () { hintTimer = null; hintSq = null; if (!destroyed) refreshMarks(); }, 2000);
        }, 30);
      },
      destroy: function () {
        destroyed = true; clearTimers();
        view.board.removeEventListener('pointerdown', onDown);
        el.innerHTML = '';
      }
    };
  }

  /* ===================== DEMO ===================== */
  function demo(el, opts) {
    opts = opts || {};
    var view = new View(el, false);
    var timers = [], stopped = false, b;
    view.topInfo.innerHTML = '<div class="xq-caps"><b>规则小课堂</b></div><span class="xq-count">中国象棋</span>';
    view.botInfo.innerHTML = '';
    function cap(t) { try { opts.onCaption && opts.onCaption(t); } catch (e) { } }
    function at(ms, fn) { timers.push(setTimeout(function () { if (!stopped) fn(); }, ms)); }
    function sq(r, c) { return r * 9 + c; }
    var RED = 0, BLK = 8;
    function setPos(list) {
      b = new Int8Array(90);
      list.forEach(function (x) { b[sq(x[0], x[1])] = x[2]; });
      view.setBoard(b); view.setMarks({});
    }
    function mv(f, t, extra) {
      view.move(f, t); b[t] = b[f]; b[f] = 0;
      var o = extra || {}; o.last = [f, t]; view.setMarks(o);
    }
    function showMoves(s, extra) {
      var side = b[s] >> 3, tg = splitTargets(b, legalMoves(b, side, s));
      var o = extra || {}; o.sel = s; o.dots = tg.dots; o.caps = tg.caps; view.setMarks(o);
    }
    var steps = [
      function () { // goal
        setPos([[0, 4, K | BLK], [1, 0, R], [5, 8, R], [9, 3, K]]);
        cap('目标：把对方的「将」将死，就赢啦！');
        at(900, function () { showMoves(sq(5, 8)); });
        at(1700, function () { mv(sq(5, 8), sq(0, 8), { check: sq(0, 4) }); });
        at(2300, function () { cap('车沉底照将，将无处可逃 → 绝杀获胜！'); view.setMarks({ last: [sq(5, 8), sq(0, 8)], check: sq(0, 4), flash: [sq(1, 3), sq(1, 4), sq(1, 5), sq(0, 3), sq(0, 5)] }); });
      },
      function () { // rook
        setPos([[0, 3, K | BLK], [3, 1, P | BLK], [7, 1, R], [9, 4, K]]);
        cap('车：横竖直走，格数不限，但不能跳过棋子');
        at(600, function () { showMoves(sq(7, 1)); });
        at(1700, function () { mv(sq(7, 1), sq(3, 1)); cap('车一路直冲，吃掉对方的卒！'); });
      },
      function () { // horse
        setPos([[0, 3, K | BLK], [7, 4, N], [6, 4, P], [9, 4, K]]);
        cap('马走「日」字；脚边有子挡住叫「蹩马腿」');
        at(600, function () { showMoves(sq(7, 4), { flash: [sq(6, 4)] }); });
        at(1500, function () { cap('上方被兵挡住，往上的两步都走不了'); });
        at(2300, function () { mv(sq(7, 4), sq(6, 2)); });
      },
      function () { // cannon
        setPos([[0, 3, K | BLK], [2, 1, N | BLK], [4, 1, P | BLK], [7, 1, C], [9, 4, K]]);
        cap('炮：平时像车一样走，吃子要隔一个「炮架」');
        at(700, function () { showMoves(sq(7, 1), { flash: [sq(4, 1)] }); });
        at(1800, function () { mv(sq(7, 1), sq(2, 1)); cap('隔着卒，一炮打掉黑马！'); });
      },
      function () { // elephant
        setPos([[0, 3, K | BLK], [5, 2, B], [6, 1, P], [9, 4, K]]);
        cap('相走「田」字；田心有子叫塞象眼；相不能过河');
        at(700, function () { showMoves(sq(5, 2), { flash: [sq(6, 1)], area: [sq(3, 0), sq(3, 4)] }); });
        at(1500, function () { cap('左下被塞象眼，河对岸也去不了，只剩一步'); });
        at(2400, function () { mv(sq(5, 2), sq(7, 4)); });
      },
      function () { // pawn
        setPos([[0, 5, K | BLK], [6, 4, P], [9, 3, K]]);
        cap('兵：一次一步只能向前，过了河还能左右走');
        at(500, function () { showMoves(sq(6, 4)); });
        at(1000, function () { mv(sq(6, 4), sq(5, 4)); });
        at(1600, function () { mv(sq(5, 4), sq(4, 4)); });
        at(2100, function () { showMoves(sq(4, 4)); cap('过河了！现在可以横着走（但不能后退）'); });
        at(2900, function () { mv(sq(4, 4), sq(4, 3)); });
      },
      function () { // king
        setPos([[0, 3, K | BLK], [8, 4, K], [9, 3, A]]);
        cap('帅只能在九宫里走，且将帅不能直接照面');
        var palace = [sq(7, 3), sq(7, 4), sq(7, 5), sq(8, 3), sq(8, 4), sq(8, 5), sq(9, 3), sq(9, 4), sq(9, 5)];
        at(600, function () { showMoves(sq(8, 4), { area: palace }); });
        at(1500, function () {
          var line = []; for (var r = 1; r <= 8; r++) line.push(sq(r, 3));
          showMoves(sq(8, 4), { area: palace, flash: line });
          cap('走到左边就和黑将同一直线面对面，不允许！');
        });
        at(2700, function () { mv(sq(8, 4), sq(8, 5)); });
      }
    ];
    var STEP_MS = 3300, i;
    for (i = 0; i < steps.length; i++) (function (k) { at(k * STEP_MS, steps[k]); })(i);
    at(steps.length * STEP_MS, function () { cap('规则学会啦，开始对局吧！'); try { opts.onDone && opts.onDone(); } catch (e) { } });
    return { stop: function () { stopped = true; timers.forEach(clearTimeout); timers = []; } };
  }

  W.TZGAMES['xiangqi'] = {
    id: 'xiangqi', name: '中国象棋', tagline: '楚河汉界，车马炮齐上阵',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['红方', '黑方'],
    mount: mount, demo: demo,
    _engine: ENGINE
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = W.TZGAMES['xiangqi'];
})();
