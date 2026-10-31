/* 团子棋馆 · 国际象棋 module v1.0
 * Pure engine (0x88 board, zobrist, PeSTO tapered eval, alpha-beta negamax + quiescence,
 * TT, MVV-LVA + killers + history, null move, LMR, time-budgeted iterative deepening)
 * plus a touch-friendly board UI and an auto-playing rules demo.
 */
(function () {
  'use strict';
  var G = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});

  /* ======================================================================
   * ENGINE
   * ==================================================================== */
  var PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
  var KN = [33, 31, 18, 14, -33, -31, -18, -14];
  var KG = [1, -1, 16, -16, 17, 15, -17, -15];
  var DG = [17, 15, -17, -15];
  var OR = [1, -1, 16, -16];
  var MATE = 100000, INF = 1000000, MAXPLY = 96;
  var F_CAP = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8;

  function now() { return Date.now(); }

  // ---- zobrist ----
  var seed = 0x2545F491;
  function rnd32() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
  var Z1 = new Int32Array(16 * 128), Z2 = new Int32Array(16 * 128);
  for (var zi = 0; zi < 16 * 128; zi++) { Z1[zi] = rnd32(); Z2[zi] = rnd32(); }
  var ZS1 = rnd32(), ZS2 = rnd32();
  var ZC1 = new Int32Array(16), ZC2 = new Int32Array(16), ZE1 = new Int32Array(8), ZE2 = new Int32Array(8);
  for (zi = 0; zi < 16; zi++) { ZC1[zi] = rnd32(); ZC2[zi] = rnd32(); }
  for (zi = 0; zi < 8; zi++) { ZE1[zi] = rnd32(); ZE2[zi] = rnd32(); }

  // ---- castling masks ----
  var CMASK = new Int32Array(128);
  for (zi = 0; zi < 128; zi++) CMASK[zi] = 15;
  CMASK[0] &= ~2; CMASK[7] &= ~1; CMASK[4] &= ~3;
  CMASK[112] &= ~8; CMASK[119] &= ~4; CMASK[116] &= ~12;

  // ---- PeSTO tables (index 0 = a8, white's view) ----
  var MGV = [0, 82, 337, 365, 477, 1025, 0], EGV = [0, 94, 281, 297, 512, 936, 0];
  var PHASE = [0, 0, 1, 1, 2, 4, 0];
  var MGT = [], EGT = [];
  MGT[1] = [0,0,0,0,0,0,0,0, 98,134,61,95,68,126,34,-11, -6,7,26,31,65,56,25,-20, -14,13,6,21,23,12,17,-23, -27,-2,-5,12,17,6,10,-25, -26,-4,-4,-10,3,3,33,-12, -35,-1,-20,-23,-15,24,38,-22, 0,0,0,0,0,0,0,0];
  EGT[1] = [0,0,0,0,0,0,0,0, 178,173,158,134,147,132,165,187, 94,100,85,67,56,53,82,84, 32,24,13,5,-2,4,17,17, 13,9,-3,-7,-7,-8,3,-1, 4,7,-6,1,0,-5,-1,-8, 13,8,8,10,13,0,2,-7, 0,0,0,0,0,0,0,0];
  MGT[2] = [-167,-89,-34,-49,61,-97,-15,-107, -73,-41,72,36,23,62,7,-17, -47,60,37,65,84,129,73,44, -9,17,19,53,37,69,18,22, -13,4,16,13,28,19,21,-8, -23,-9,12,10,19,17,25,-16, -29,-53,-12,-3,-1,18,-14,-19, -105,-21,-58,-33,-17,-28,-19,-23];
  EGT[2] = [-58,-38,-13,-28,-31,-27,-63,-99, -25,-8,-25,-2,-9,-25,-24,-52, -24,-20,10,9,-1,-9,-19,-41, -17,3,22,22,22,11,8,-18, -18,-6,16,25,16,17,4,-18, -23,-3,-1,15,10,-3,-20,-22, -42,-20,-10,-5,-2,-20,-23,-44, -29,-51,-23,-15,-22,-18,-50,-64];
  MGT[3] = [-29,4,-82,-37,-25,-42,7,-8, -26,16,-18,-13,30,59,18,-47, -16,37,43,40,35,50,37,-2, -4,5,19,50,37,37,7,-2, -6,13,13,26,34,12,10,4, 0,15,15,15,14,27,18,10, 4,15,16,0,7,21,33,1, -33,-3,-14,-21,-13,-12,-39,-21];
  EGT[3] = [-14,-21,-11,-8,-7,-9,-17,-24, -8,-4,7,-12,-3,-13,-4,-14, 2,-8,0,-1,-2,6,0,4, -3,9,12,9,14,10,3,2, -6,3,13,19,7,10,-3,-9, -12,-3,8,10,13,3,-7,-15, -14,-18,-7,-1,4,-9,-15,-27, -23,-9,-23,-5,-9,-16,-5,-17];
  MGT[4] = [32,42,32,51,63,9,31,43, 27,32,58,62,80,67,26,44, -5,19,26,36,17,45,61,16, -24,-11,7,26,24,35,-8,-20, -36,-26,-12,-1,9,-7,6,-23, -45,-25,-16,-17,3,0,-5,-33, -44,-16,-20,-9,-1,11,-6,-71, -19,-13,1,17,16,7,-37,-26];
  EGT[4] = [13,10,18,15,12,12,8,5, 11,13,13,11,-3,3,8,3, 7,7,7,5,4,-3,-5,-3, 4,3,13,1,2,1,-1,2, 3,5,8,4,-5,-6,-8,-11, -4,0,-5,-1,-7,-12,-8,-16, -6,-6,0,2,-9,-9,-11,-3, -9,2,3,-1,-5,-13,4,-20];
  MGT[5] = [-28,0,29,12,59,44,43,45, -24,-39,-5,1,-16,57,28,54, -13,-17,7,8,29,56,47,57, -27,-27,-16,-16,-1,17,-2,1, -9,-26,-9,-10,-2,-4,3,-3, -14,2,-11,-2,-5,2,14,5, -35,-8,11,2,8,15,-3,1, -1,-18,-9,10,-15,-25,-31,-50];
  EGT[5] = [-9,22,22,27,27,19,10,20, -17,20,32,41,58,25,30,0, -20,6,9,49,47,35,19,9, 3,22,24,45,57,40,57,36, -18,28,19,47,31,34,39,23, -16,-27,15,6,9,17,10,5, -22,-23,-30,-16,-16,-23,-36,-32, -33,-28,-22,-43,-5,-32,-20,-41];
  MGT[6] = [-65,23,16,-15,-56,-34,2,13, 29,-1,-20,-7,-8,-4,-38,-29, -9,24,2,-16,-20,6,22,-22, -17,-20,-12,-27,-30,-25,-14,-36, -49,-1,-27,-39,-46,-44,-33,-51, -14,-14,-22,-46,-44,-30,-15,-27, 1,7,-8,-64,-43,-16,9,8, -15,36,12,-54,8,-28,24,14];
  EGT[6] = [-74,-35,-18,-18,-11,15,4,-17, -12,17,14,17,17,38,23,11, 10,17,23,15,20,45,44,13, -8,22,24,27,26,33,26,3, -18,-4,21,24,27,23,9,-11, -19,-3,11,21,23,16,7,-9, -27,-11,4,13,14,4,-5,-17, -53,-34,-21,-11,-28,-14,-24,-43];
  var PMG = [], PEG = [];
  (function () {
    for (var p = 0; p < 16; p++) { PMG[p] = new Int32Array(128); PEG[p] = new Int32Array(128); }
    for (var t = 1; t <= 6; t++) {
      for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
        var sq = r * 16 + f, iw = (7 - r) * 8 + f, ib = r * 8 + f;
        PMG[t][sq] = MGV[t] + MGT[t][iw]; PEG[t][sq] = EGV[t] + EGT[t][iw];
        PMG[t + 8][sq] = MGV[t] + MGT[t][ib]; PEG[t + 8][sq] = EGV[t] + EGT[t][ib];
      }
    }
  })();

  // ---- position ----
  function newPos() {
    return { b: new Int8Array(128), side: 0, castle: 0, ep: -1, half: 0, full: 1, king: [4, 116],
      h1: 0, h2: 0, mg: [0, 0], eg: [0, 0], phase: 0, cnt: new Int8Array(16), hh1: [], hh2: [], st: [] };
  }
  function put(P, sq, p) {
    P.b[sq] = p; P.h1 ^= Z1[p * 128 + sq]; P.h2 ^= Z2[p * 128 + sq];
    var c = p >> 3; P.mg[c] += PMG[p][sq]; P.eg[c] += PEG[p][sq]; P.phase += PHASE[p & 7]; P.cnt[p]++;
  }
  function rem(P, sq) {
    var p = P.b[sq]; P.b[sq] = 0; P.h1 ^= Z1[p * 128 + sq]; P.h2 ^= Z2[p * 128 + sq];
    var c = p >> 3; P.mg[c] -= PMG[p][sq]; P.eg[c] -= PEG[p][sq]; P.phase -= PHASE[p & 7]; P.cnt[p]--;
    return p;
  }
  function sqIdx(s) { return (s.charCodeAt(1) - 49) * 16 + (s.charCodeAt(0) - 97); }
  function sqName(sq) { return String.fromCharCode(97 + (sq & 7)) + String.fromCharCode(49 + (sq >> 4)); }

  var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var FEN_P = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };
  function fromFen(fen) {
    var P = newPos(), parts = fen.trim().split(/\s+/), rows = parts[0].split('/');
    for (var r = 0; r < 8; r++) {
      var f = 0, row = rows[r];
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch >= '1' && ch <= '8') { f += +ch; continue; }
        var lo = ch.toLowerCase(), p = FEN_P[lo] | (ch === lo ? 8 : 0), sq = (7 - r) * 16 + f;
        put(P, sq, p); if ((p & 7) === KING) P.king[p >> 3] = sq; f++;
      }
    }
    P.side = parts[1] === 'b' ? 1 : 0;
    var c = parts[2] || '-';
    P.castle = (c.indexOf('K') >= 0 ? 1 : 0) | (c.indexOf('Q') >= 0 ? 2 : 0) | (c.indexOf('k') >= 0 ? 4 : 0) | (c.indexOf('q') >= 0 ? 8 : 0);
    P.ep = (parts[3] && parts[3] !== '-') ? sqIdx(parts[3]) : -1;
    P.half = parts[4] ? +parts[4] : 0; P.full = parts[5] ? +parts[5] : 1;
    if (P.side) { P.h1 ^= ZS1; P.h2 ^= ZS2; }
    P.h1 ^= ZC1[P.castle]; P.h2 ^= ZC2[P.castle];
    if (P.ep >= 0) { P.h1 ^= ZE1[P.ep & 7]; P.h2 ^= ZE2[P.ep & 7]; }
    P.hh1.push(P.h1); P.hh2.push(P.h2);
    return P;
  }
  function toFen(P) {
    var s = '';
    for (var r = 7; r >= 0; r--) {
      var e = 0;
      for (var f = 0; f < 8; f++) {
        var p = P.b[r * 16 + f];
        if (!p) { e++; continue; }
        if (e) { s += e; e = 0; }
        var ch = ' pnbrqk'[p & 7]; s += (p >> 3) ? ch : ch.toUpperCase();
      }
      if (e) s += e;
      if (r) s += '/';
    }
    var c = (P.castle & 1 ? 'K' : '') + (P.castle & 2 ? 'Q' : '') + (P.castle & 4 ? 'k' : '') + (P.castle & 8 ? 'q' : '');
    return s + ' ' + (P.side ? 'b' : 'w') + ' ' + (c || '-') + ' ' + (P.ep >= 0 ? sqName(P.ep) : '-') + ' ' + P.half + ' ' + P.full;
  }

  function attacked(P, sq, by) {
    var b = P.b, s, i, p, d;
    if (by === 0) {
      s = sq - 15; if (!(s & 0x88) && b[s] === 1) return true;
      s = sq - 17; if (!(s & 0x88) && b[s] === 1) return true;
    } else {
      s = sq + 15; if (!(s & 0x88) && b[s] === 9) return true;
      s = sq + 17; if (!(s & 0x88) && b[s] === 9) return true;
    }
    var base = by << 3, kn = base | 2, kg = base | 6, bi = base | 3, ro = base | 4, qu = base | 5;
    for (i = 0; i < 8; i++) {
      s = sq + KN[i]; if (!(s & 0x88) && b[s] === kn) return true;
      s = sq + KG[i]; if (!(s & 0x88) && b[s] === kg) return true;
    }
    for (i = 0; i < 4; i++) {
      d = DG[i]; s = sq + d;
      while (!(s & 0x88)) { p = b[s]; if (p) { if (p === bi || p === qu) return true; break; } s += d; }
      d = OR[i]; s = sq + d;
      while (!(s & 0x88)) { p = b[s]; if (p) { if (p === ro || p === qu) return true; break; } s += d; }
    }
    return false;
  }
  function inCheck(P) { return attacked(P, P.king[P.side], P.side ^ 1); }

  // move = from | to<<7 | promo<<14 | flags<<17
  function gen(P, out, caps) {
    var b = P.b, us = P.side, them = us ^ 1, sq, p, t, to, i, q, d, dirs, k;
    for (sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq]; if (!p || (p >> 3) !== us) continue; t = p & 7;
      if (t === PAWN) {
        var fw = us === 0 ? 16 : -16, r = sq >> 4, last = us === 0 ? 6 : 1, start = us === 0 ? 1 : 6;
        to = sq + fw;
        if (!b[to]) {
          if (r === last) {
            out.push(sq | to << 7 | 5 << 14);
            if (!caps) out.push(sq | to << 7 | 4 << 14, sq | to << 7 | 3 << 14, sq | to << 7 | 2 << 14);
          } else if (!caps) {
            out.push(sq | to << 7);
            if (r === start && !b[to + fw]) out.push(sq | (to + fw) << 7 | F_DOUBLE << 17);
          }
        }
        for (i = -1; i <= 1; i += 2) {
          to = sq + fw + i; if (to & 0x88) continue; q = b[to];
          if (q && (q >> 3) === them) {
            if (r === last) { for (k = 5; k >= 2; k--) out.push(sq | to << 7 | k << 14 | F_CAP << 17); }
            else out.push(sq | to << 7 | F_CAP << 17);
          } else if (!q && to === P.ep) out.push(sq | to << 7 | (F_CAP | F_EP) << 17);
        }
      } else if (t === KNIGHT || t === KING) {
        dirs = t === KNIGHT ? KN : KG;
        for (i = 0; i < 8; i++) {
          to = sq + dirs[i]; if (to & 0x88) continue; q = b[to];
          if (!q) { if (!caps) out.push(sq | to << 7); }
          else if ((q >> 3) === them) out.push(sq | to << 7 | F_CAP << 17);
        }
      } else {
        dirs = t === BISHOP ? DG : t === ROOK ? OR : KG;
        for (i = 0; i < dirs.length; i++) {
          d = dirs[i]; to = sq + d;
          while (!(to & 0x88)) {
            q = b[to];
            if (!q) { if (!caps) out.push(sq | to << 7); }
            else { if ((q >> 3) === them) out.push(sq | to << 7 | F_CAP << 17); break; }
            to += d;
          }
        }
      }
    }
    if (!caps && P.castle) {
      if (us === 0) {
        if (b[4] === 6) {
          if ((P.castle & 1) && b[7] === 4 && !b[5] && !b[6] && !attacked(P, 4, 1) && !attacked(P, 5, 1) && !attacked(P, 6, 1)) out.push(4 | 6 << 7 | F_CASTLE << 17);
          if ((P.castle & 2) && b[0] === 4 && !b[3] && !b[2] && !b[1] && !attacked(P, 4, 1) && !attacked(P, 3, 1) && !attacked(P, 2, 1)) out.push(4 | 2 << 7 | F_CASTLE << 17);
        }
      } else if (b[116] === 14) {
        if ((P.castle & 4) && b[119] === 12 && !b[117] && !b[118] && !attacked(P, 116, 0) && !attacked(P, 117, 0) && !attacked(P, 118, 0)) out.push(116 | 118 << 7 | F_CASTLE << 17);
        if ((P.castle & 8) && b[112] === 12 && !b[115] && !b[114] && !b[113] && !attacked(P, 116, 0) && !attacked(P, 115, 0) && !attacked(P, 114, 0)) out.push(116 | 114 << 7 | F_CASTLE << 17);
      }
    }
    return out;
  }

  function make(P, m) {
    var from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = (m >> 17) & 15;
    var us = P.side, them = us ^ 1, b = P.b;
    var capSq = (flag & F_EP) ? (us === 0 ? to - 16 : to + 16) : to;
    var cap = b[capSq];
    P.st.push({ m: m, cap: cap, castle: P.castle, ep: P.ep, half: P.half, full: P.full, h1: P.h1, h2: P.h2 });
    if (cap) rem(P, capSq);
    var p = rem(P, from);
    put(P, to, promo ? ((us << 3) | promo) : p);
    if (flag & F_CASTLE) {
      if (to === 6) put(P, 5, rem(P, 7));
      else if (to === 2) put(P, 3, rem(P, 0));
      else if (to === 118) put(P, 117, rem(P, 119));
      else if (to === 114) put(P, 115, rem(P, 112));
    }
    if ((p & 7) === KING) P.king[us] = to;
    if (P.ep >= 0) { P.h1 ^= ZE1[P.ep & 7]; P.h2 ^= ZE2[P.ep & 7]; }
    P.h1 ^= ZC1[P.castle]; P.h2 ^= ZC2[P.castle];
    P.castle &= CMASK[from] & CMASK[to];
    P.h1 ^= ZC1[P.castle]; P.h2 ^= ZC2[P.castle];
    P.ep = -1;
    if (flag & F_DOUBLE) {
      var ep = (them << 3) | PAWN;
      if ((!((to + 1) & 0x88) && b[to + 1] === ep) || (!((to - 1) & 0x88) && b[to - 1] === ep)) {
        P.ep = (from + to) >> 1; P.h1 ^= ZE1[P.ep & 7]; P.h2 ^= ZE2[P.ep & 7];
      }
    }
    P.half = ((p & 7) === PAWN || cap) ? 0 : P.half + 1;
    if (us === 1) P.full++;
    P.side = them; P.h1 ^= ZS1; P.h2 ^= ZS2;
    P.hh1.push(P.h1); P.hh2.push(P.h2);
    if (attacked(P, P.king[us], them)) { unmake(P); return false; }
    return true;
  }
  function unmake(P) {
    var u = P.st.pop(), m = u.m;
    var from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = (m >> 17) & 15;
    P.hh1.pop(); P.hh2.pop();
    var us = P.side ^ 1; P.side = us;
    var p = rem(P, to); if (promo) p = (us << 3) | PAWN;
    put(P, from, p);
    if (flag & F_CASTLE) {
      if (to === 6) put(P, 7, rem(P, 5));
      else if (to === 2) put(P, 0, rem(P, 3));
      else if (to === 118) put(P, 119, rem(P, 117));
      else if (to === 114) put(P, 112, rem(P, 115));
    }
    if (u.cap) put(P, (flag & F_EP) ? (us === 0 ? to - 16 : to + 16) : to, u.cap);
    if ((p & 7) === KING) P.king[us] = from;
    P.castle = u.castle; P.ep = u.ep; P.half = u.half; P.full = u.full; P.h1 = u.h1; P.h2 = u.h2;
  }
  function makeNull(P) {
    P.st.push({ m: 0, cap: 0, castle: P.castle, ep: P.ep, half: P.half, full: P.full, h1: P.h1, h2: P.h2 });
    if (P.ep >= 0) { P.h1 ^= ZE1[P.ep & 7]; P.h2 ^= ZE2[P.ep & 7]; }
    P.ep = -1; P.side ^= 1; P.h1 ^= ZS1; P.h2 ^= ZS2; P.half = 0;
    P.hh1.push(P.h1); P.hh2.push(P.h2);
  }
  function unmakeNull(P) {
    var u = P.st.pop(); P.hh1.pop(); P.hh2.pop();
    P.side ^= 1; P.ep = u.ep; P.half = u.half; P.h1 = u.h1; P.h2 = u.h2;
  }

  function legalMoves(P) {
    var all = gen(P, [], false), out = [];
    for (var i = 0; i < all.length; i++) if (make(P, all[i])) { unmake(P); out.push(all[i]); }
    return out;
  }
  function perft(P, d) {
    if (d === 0) return 1;
    var moves = gen(P, [], false), n = 0;
    for (var i = 0; i < moves.length; i++) {
      if (make(P, moves[i])) { n += d === 1 ? 1 : perft(P, d - 1); unmake(P); }
    }
    return n;
  }
  function insufficient(P) {
    var c = P.cnt;
    if (c[1] || c[9] || c[4] || c[12] || c[5] || c[13]) return false;
    var minors = c[2] + c[3] + c[10] + c[11];
    if (minors <= 1) return true;
    if (c[2] || c[10]) return false;
    var col = -1;
    for (var sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      if ((P.b[sq] & 7) === BISHOP) {
        var sc = ((sq >> 4) + (sq & 7)) & 1;
        if (col < 0) col = sc; else if (col !== sc) return false;
      }
    }
    return true;
  }
  function isRep(P) {
    var n = P.hh1.length - 1, h1 = P.h1, h2 = P.h2, lim = n - P.half;
    for (var i = n - 2; i >= 0 && i >= lim; i -= 2) if (P.hh1[i] === h1 && P.hh2[i] === h2) return true;
    return false;
  }
  function repCount(P) {
    var n = P.hh1.length - 1, h1 = P.h1, h2 = P.h2, lim = n - P.half, c = 1;
    for (var i = n - 2; i >= 0 && i >= lim; i -= 2) if (P.hh1[i] === h1 && P.hh2[i] === h2) c++;
    return c;
  }
  function status(P) {
    var moves = legalMoves(P), chk = inCheck(P);
    if (!moves.length) return chk ? { over: true, winner: P.side ^ 1, reason: '将死' } : { over: true, winner: -1, reason: '逼和（无子可动）' };
    if (insufficient(P)) return { over: true, winner: -1, reason: '子力不足，和棋' };
    if (P.half >= 100) return { over: true, winner: -1, reason: '五十回合规则，和棋' };
    if (repCount(P) >= 3) return { over: true, winner: -1, reason: '同一局面重复三次，和棋' };
    return { over: false, inCheck: chk, moves: moves };
  }

  // ---- evaluation ----
  function nonKing(P, c) { var o = c << 3; return P.cnt[o | 1] + P.cnt[o | 2] + P.cnt[o | 3] + P.cnt[o | 4] + P.cnt[o | 5]; }
  function nonPawn(P, c) { var o = c << 3; return P.cnt[o | 2] + P.cnt[o | 3] + P.cnt[o | 4] + P.cnt[o | 5] > 0; }
  function evaluate(P) {
    var ph = P.phase > 24 ? 24 : P.phase;
    var mg = P.mg[0] - P.mg[1], eg = P.eg[0] - P.eg[1];
    var s = ((mg * ph + eg * (24 - ph)) / 24) | 0;
    if (P.cnt[3] >= 2) s += 30;
    if (P.cnt[11] >= 2) s -= 30;
    if (ph <= 8) { // mop-up: drive a bare king to the edge
      for (var c = 0; c < 2; c++) {
        if (nonKing(P, c ^ 1) === 0 && (P.cnt[(c << 3) | 4] + P.cnt[(c << 3) | 5] > 0 || P.cnt[(c << 3) | 1] > 0)) {
          var lk = P.king[c ^ 1], wk = P.king[c];
          var lf = lk & 7, lr = lk >> 4;
          var cd = Math.max(3 - lf, lf - 4) + Math.max(3 - lr, lr - 4);
          var kd = Math.abs(lf - (wk & 7)) + Math.abs(lr - (wk >> 4));
          var bonus = 12 * cd + 5 * (14 - kd);
          s += c === 0 ? bonus : -bonus;
        }
      }
    }
    return (P.side === 0 ? s : -s) + 10;
  }

  // ---- search ----
  var TT_SIZE = 1 << 18, TT_MASK = TT_SIZE - 1;
  var tK = new Int32Array(TT_SIZE), tM = new Int32Array(TT_SIZE), tS = new Int32Array(TT_SIZE);
  var tD = new Int8Array(TT_SIZE), tF = new Int8Array(TT_SIZE);
  var killers = new Int32Array(MAXPLY * 2 + 4), hist = new Int32Array(16 * 128);
  var nodes = 0, stopFlag = false, deadline = 0;

  function scoreMoves(P, moves, sc, ttMove, ply) {
    var b = P.b;
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i], s;
      if (m === ttMove) s = 4000000;
      else {
        var flag = (m >> 17) & 15, promo = (m >> 14) & 7;
        if (flag & F_CAP) {
          var victim = (flag & F_EP) ? 1 : (b[(m >> 7) & 127] & 7), att = b[m & 127] & 7;
          s = 2000000 + victim * 100 - att + (promo === 5 ? 1000 : 0);
        } else if (promo === 5) s = 1900000;
        else if (promo) s = -100000;
        else if (m === killers[ply * 2]) s = 1800000;
        else if (m === killers[ply * 2 + 1]) s = 1700000;
        else s = hist[b[m & 127] * 128 + ((m >> 7) & 127)];
      }
      sc[i] = s;
    }
  }
  function pick(moves, sc, i) {
    var bi = i, bs = sc[i];
    for (var j = i + 1; j < moves.length; j++) if (sc[j] > bs) { bs = sc[j]; bi = j; }
    if (bi !== i) { var t = moves[i]; moves[i] = moves[bi]; moves[bi] = t; t = sc[i]; sc[i] = sc[bi]; sc[bi] = t; }
  }
  var QVAL = [0, 100, 320, 330, 500, 900, 0];
  function qs(P, alpha, beta, ply) {
    if ((++nodes & 2047) === 0 && now() > deadline) stopFlag = true;
    if (stopFlag) return 0;
    var stand = evaluate(P);
    if (ply >= MAXPLY) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    var moves = gen(P, [], true), sc = new Array(moves.length);
    scoreMoves(P, moves, sc, 0, ply);
    for (var i = 0; i < moves.length; i++) {
      pick(moves, sc, i);
      var m = moves[i], flag = (m >> 17) & 15;
      if (!((m >> 14) & 7)) {
        var victim = (flag & F_EP) ? 1 : (P.b[(m >> 7) & 127] & 7);
        if (stand + QVAL[victim] + 200 < alpha) continue; // delta pruning
      }
      if (!make(P, m)) continue;
      var v = -qs(P, -beta, -alpha, ply + 1);
      unmake(P);
      if (stopFlag) return 0;
      if (v > alpha) { if (v >= beta) return v; alpha = v; }
    }
    return alpha;
  }
  function search(P, depth, alpha, beta, ply, allowNull) {
    if ((++nodes & 2047) === 0 && now() > deadline) stopFlag = true;
    if (stopFlag) return 0;
    if (ply >= MAXPLY - 1) return evaluate(P);
    if (P.half >= 100 || isRep(P) || insufficient(P)) return 0;
    var inC = attacked(P, P.king[P.side], P.side ^ 1);
    if (inC) depth++;
    if (depth <= 0) return qs(P, alpha, beta, ply);
    var idx = P.h1 & TT_MASK, ttMove = 0;
    if (tK[idx] === P.h2) {
      ttMove = tM[idx];
      if (tD[idx] >= depth) {
        var ts = tS[idx];
        if (ts > MATE - 1000) ts -= ply; else if (ts < -MATE + 1000) ts += ply;
        var tf = tF[idx];
        if (tf === 1 || (tf === 2 && ts >= beta) || (tf === 3 && ts <= alpha)) return ts;
      }
    }
    var pv = beta - alpha > 1, ev;
    if (!pv && !inC) {
      ev = evaluate(P);
      if (depth <= 2 && ev - 120 * depth >= beta && beta < MATE - 1000) return ev; // reverse futility
      if (allowNull && depth >= 3 && ev >= beta && nonPawn(P, P.side)) {
        makeNull(P);
        var nv = -search(P, depth - 1 - (depth >= 6 ? 3 : 2), -beta, -beta + 1, ply + 1, false);
        unmakeNull(P);
        if (stopFlag) return 0;
        if (nv >= beta) return nv > MATE - 1000 ? beta : nv;
      }
    }
    var moves = gen(P, [], false), n = moves.length, sc = new Array(n);
    scoreMoves(P, moves, sc, ttMove, ply);
    var legal = 0, best = -INF, bestM = 0, a0 = alpha;
    for (var i = 0; i < n; i++) {
      pick(moves, sc, i);
      var m = moves[i];
      if (!make(P, m)) continue;
      legal++;
      var quiet = !((m >> 17) & F_CAP) && !((m >> 14) & 7), v;
      if (legal === 1) v = -search(P, depth - 1, -beta, -alpha, ply + 1, true);
      else {
        var red = 0;
        if (depth >= 3 && legal > 3 && quiet && !inC && sc[i] < 1700000 && !attacked(P, P.king[P.side], P.side ^ 1)) red = legal > 10 ? 2 : 1;
        v = -search(P, depth - 1 - red, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && red && !stopFlag) v = -search(P, depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && v < beta && !stopFlag) v = -search(P, depth - 1, -beta, -alpha, ply + 1, true);
      }
      unmake(P);
      if (stopFlag) return 0;
      if (v > best) { best = v; bestM = m; }
      if (v > alpha) {
        alpha = v;
        if (v >= beta) {
          if (quiet) {
            if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
            hist[P.b[m & 127] * 128 + ((m >> 7) & 127)] += depth * depth;
          }
          break;
        }
      }
    }
    if (!legal) return inC ? -MATE + ply : 0;
    var st = best;
    if (st > MATE - 1000) st += ply; else if (st < -MATE + 1000) st -= ply;
    tK[idx] = P.h2; tM[idx] = bestM; tS[idx] = st; tD[idx] = depth > 120 ? 120 : depth;
    tF[idx] = best >= beta ? 2 : (best > a0 ? 1 : 3);
    return best;
  }
  function resetSearch(timeMs) {
    nodes = 0; stopFlag = false; deadline = now() + timeMs;
    for (var i = 0; i < killers.length; i++) killers[i] = 0;
    for (i = 0; i < hist.length; i++) hist[i] >>= 3;
  }
  // returns { move, score, depth, nodes }
  function bestMove(P, o) {
    o = o || {};
    var time = o.time || 1000, maxDepth = o.maxDepth || 64, start = now();
    resetSearch(time);
    var moves = legalMoves(P);
    if (!moves.length) return { move: 0, score: 0, depth: 0, nodes: 0 };
    var sc = new Array(moves.length); scoreMoves(P, moves, sc, 0, 0);
    var ordered = [];
    for (var i = 0; i < moves.length; i++) { pick(moves, sc, i); ordered.push(moves[i]); }
    moves = ordered;
    var best = moves[0], bestScore = -INF, dDone = 0;
    if (moves.length === 1) return { move: best, score: 0, depth: 0, nodes: 0 };
    for (var d = 1; d <= maxDepth; d++) {
      var alpha = -INF, beta = INF, cb = 0, cs = -INF;
      for (i = 0; i < moves.length; i++) {
        var m = moves[i], v;
        make(P, m);
        if (i === 0) v = -search(P, d - 1, -beta, -alpha, 1, true);
        else {
          v = -search(P, d - 1, -alpha - 1, -alpha, 1, true);
          if (v > alpha && !stopFlag) v = -search(P, d - 1, -beta, -alpha, 1, true);
        }
        unmake(P);
        if (stopFlag) break;
        if (v > cs) { cs = v; cb = m; }
        if (v > alpha) {
          alpha = v;
          if (i > 0) { moves.splice(i, 1); moves.unshift(m); } // new best to front
        }
      }
      if (cb) { best = cb; bestScore = cs; }
      if (stopFlag) break;
      dDone = d;
      if (Math.abs(bestScore) > MATE - 200) break;
      if (now() - start > time * 0.5) break;
    }
    return { move: best, score: bestScore, depth: dDone, nodes: nodes };
  }
  // score every root move at a shallow depth (for the beginner level)
  function rootScores(P, depth) {
    resetSearch(1500);
    var moves = legalMoves(P), out = [];
    for (var i = 0; i < moves.length; i++) {
      make(P, moves[i]);
      var v = -search(P, depth - 1, -INF, INF, 1, false);
      unmake(P);
      out.push({ move: moves[i], score: v });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }
  var LEVEL_TIME = [300, 1200, 600, 1200];
  function think(P, level, rand) {
    rand = rand || Math.random;
    var moves = legalMoves(P);
    if (!moves.length) return 0;
    if (moves.length === 1) return moves[0];
    if (level <= 0) {
      var rs = rootScores(P, 1);
      if (rand() < 0.5) return rs[Math.floor(rand() * Math.min(4, rs.length))].move;
      return rs[0].move;
    }
    if (level === 1) return bestMove(P, { time: 1100, maxDepth: 2 }).move;
    if (level === 2) return bestMove(P, { time: 600 }).move;
    return bestMove(P, { time: 1150 }).move;
  }

  // ---- notation helpers ----
  function san(P, m) {
    var from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = (m >> 17) & 15;
    var p = P.b[from], t = p & 7, s;
    if (flag & F_CASTLE) s = (to & 7) === 6 ? 'O-O' : 'O-O-O';
    else if (t === PAWN) {
      s = (flag & F_CAP) ? sqName(from)[0] + 'x' : '';
      s += sqName(to);
      if (promo) s += '=' + ' PNBRQK'[promo];
    } else {
      s = ' PNBRQK'[t];
      var others = legalMoves(P).filter(function (x) { return x !== m && ((x >> 7) & 127) === to && P.b[x & 127] === p; });
      if (others.length) {
        var sameFile = others.some(function (x) { return ((x & 127) & 7) === (from & 7); });
        var sameRank = others.some(function (x) { return ((x & 127) >> 4) === (from >> 4); });
        if (!sameFile) s += sqName(from)[0];
        else if (!sameRank) s += sqName(from)[1];
        else s += sqName(from);
      }
      if (flag & F_CAP) s += 'x';
      s += sqName(to);
    }
    if (make(P, m)) {
      if (inCheck(P)) s += legalMoves(P).length ? '+' : '#';
      unmake(P);
    }
    return s;
  }
  function moveToUci(m) {
    var promo = (m >> 14) & 7;
    return sqName(m & 127) + sqName((m >> 7) & 127) + (promo ? ' pnbrqk'[promo] : '');
  }
  function moveFromUci(P, u) {
    var from = sqIdx(u.slice(0, 2)), to = sqIdx(u.slice(2, 4)), pr = u[4] ? FEN_P[u[4]] : 0;
    var ms = legalMoves(P);
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if ((m & 127) === from && ((m >> 7) & 127) === to && ((m >> 14) & 7) === (pr || ((m >> 14) & 7 ? 5 : 0))) return m;
    }
    return 0;
  }

  var ENGINE = {
    START_FEN: START_FEN, fromFen: fromFen, toFen: toFen, legalMoves: legalMoves, make: make, unmake: unmake,
    perft: perft, status: status, inCheck: inCheck, attacked: attacked, evaluate: evaluate, insufficient: insufficient,
    repCount: repCount, bestMove: bestMove, think: think, rootScores: rootScores, san: san,
    moveToUci: moveToUci, moveFromUci: moveFromUci, sqIdx: sqIdx, sqName: sqName,
    from: function (m) { return m & 127; }, to: function (m) { return (m >> 7) & 127; },
    promo: function (m) { return (m >> 14) & 7; }, flags: function (m) { return (m >> 17) & 15; },
    LEVEL_TIME: LEVEL_TIME
  };

  /* ======================================================================
   * UI
   * ==================================================================== */
  var GLYPH = ['', '\u265F', '\u265E', '\u265D', '\u265C', '\u265B', '\u265A'];
  var VS = '\uFE0E';
  var FIG_W = { N: '\u2658', B: '\u2657', R: '\u2656', Q: '\u2655', K: '\u2654' };
  var FIG_B = { N: '\u265E', B: '\u265D', R: '\u265C', Q: '\u265B', K: '\u265A' };
  var SIDES = ['白方', '黑方'];

  function div(cls, parent) {
    var d = document.createElement('div'); d.className = cls;
    if (parent) parent.appendChild(d);
    return d;
  }

  function makeView(container, flip) {
    var V = { flip: !!flip, pieces: [], dots: [], tapCb: null, timers: [] };
    var frame = div('chess-frame', container);
    var board = div('chess-board', frame);
    var grid = div('chess-grid', board);
    var layer = div('chess-pieces', board);
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 8 8'); svg.setAttribute('class', 'chess-arrows');
    board.appendChild(svg);
    V.board = board; V.frame = frame;
    var sqEl = new Array(128);
    function rc(sq) {
      var f = sq & 7, r = sq >> 4;
      return V.flip ? { col: 7 - f, row: r } : { col: f, row: 7 - r };
    }
    V.rc = rc;
    for (var row = 0; row < 8; row++) for (var col = 0; col < 8; col++) {
      var f = V.flip ? 7 - col : col, r = V.flip ? row : 7 - row, sq = r * 16 + f;
      var s = div('chess-sq ' + (((f + r) & 1) ? 'chess-light' : 'chess-dark'), grid);
      if (row === 7) { var fl = div('chess-cf', s); fl.textContent = 'abcdefgh'[f]; }
      if (col === 0) { var rl = div('chess-cr', s); rl.textContent = String(r + 1); }
      sqEl[sq] = s;
    }
    function fit() {
      var w = board.clientWidth;
      if (w > 0) board.style.fontSize = (w / 8) + 'px';
    }
    fit();
    var ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(fit); ro.observe(board); }
    else G.addEventListener('resize', fit);
    V.timers.push(setTimeout(fit, 50));

    function placeEl(e, sq) {
      var p = rc(sq);
      e.el.style.transform = 'translate(' + (p.col * 100) + '%,' + (p.row * 100) + '%)';
    }
    function setGlyph(e) {
      e.el.className = 'chess-pc ' + ((e.p >> 3) ? 'chess-pc-b' : 'chess-pc-w');
      e.el.textContent = GLYPH[e.p & 7] + VS;
    }
    V.sync = function (P, instant) {
      var want = [], sq, i, j, e;
      for (sq = 0; sq < 120; sq++) { if (sq & 0x88) { sq += 7; continue; } if (P.b[sq]) want.push({ sq: sq, p: P.b[sq], done: false }); }
      var els = V.pieces; for (i = 0; i < els.length; i++) els[i].used = false;
      for (i = 0; i < want.length; i++) for (j = 0; j < els.length; j++) {
        e = els[j];
        if (!e.used && e.sq === want[i].sq && e.p === want[i].p) { e.used = true; want[i].done = true; break; }
      }
      function nearest(w, test) {
        var bj = -1, bd = 99;
        for (var k = 0; k < els.length; k++) {
          var x = els[k]; if (x.used || !test(x)) continue;
          var d = Math.abs((x.sq & 7) - (w.sq & 7)) + Math.abs((x.sq >> 4) - (w.sq >> 4));
          if (d < bd) { bd = d; bj = k; }
        }
        return bj;
      }
      for (i = 0; i < want.length; i++) {
        var w = want[i]; if (w.done) continue;
        var k = nearest(w, function (x) { return x.p === w.p; });
        if (k < 0) k = nearest(w, function (x) { return (x.p >> 3) === (w.p >> 3) && (((x.p & 7) === PAWN) || ((w.p & 7) === PAWN)); });
        if (k >= 0) {
          e = els[k]; e.used = true; e.sq = w.sq;
          if (e.p !== w.p) { e.p = w.p; setGlyph(e); }
          if (instant) e.el.style.transition = 'none';
          placeEl(e, w.sq);
          if (instant) { void e.el.offsetWidth; e.el.style.transition = ''; }
        } else {
          e = { el: document.createElement('div'), sq: w.sq, p: w.p, used: true };
          setGlyph(e); e.el.style.transition = 'none'; placeEl(e, w.sq);
          if (!instant) e.el.classList.add('chess-pop');
          layer.appendChild(e.el); void e.el.offsetWidth; e.el.style.transition = '';
          els.push(e);
        }
      }
      var keep = [];
      for (i = 0; i < els.length; i++) {
        e = els[i];
        if (e.used) keep.push(e);
        else if (instant) { if (e.el.parentNode) e.el.parentNode.removeChild(e.el); }
        else {
          e.el.classList.add('chess-gone');
          (function (node) { V.timers.push(setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 260)); })(e.el);
        }
      }
      V.pieces = keep;
    };
    // marks: { sel, moves:[m...], last:[a,b], check, hint:[a,b] }
    V.mark = function (o) {
      o = o || {};
      for (var sq = 0; sq < 120; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        var c = sqEl[sq].classList;
        c.remove('chess-sel', 'chess-last', 'chess-check', 'chess-hint');
      }
      for (var i = 0; i < V.dots.length; i++) if (V.dots[i].parentNode) V.dots[i].parentNode.removeChild(V.dots[i]);
      V.dots = [];
      if (o.last) { sqEl[o.last[0]].classList.add('chess-last'); sqEl[o.last[1]].classList.add('chess-last'); }
      if (o.hint) { sqEl[o.hint[0]].classList.add('chess-hint'); sqEl[o.hint[1]].classList.add('chess-hint'); }
      if (o.sel >= 0 && o.sel !== undefined) sqEl[o.sel].classList.add('chess-sel');
      if (o.check >= 0 && o.check !== undefined) sqEl[o.check].classList.add('chess-check');
      if (o.moves) {
        var seen = {};
        for (i = 0; i < o.moves.length; i++) {
          var m = o.moves[i], to = (m >> 7) & 127;
          if (seen[to]) continue; seen[to] = 1;
          var d = div(((m >> 17) & F_CAP) ? 'chess-ring' : 'chess-dot', sqEl[to]);
          V.dots.push(d);
        }
      }
    };
    V.arrows = function (list) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      (list || []).forEach(function (a) {
        var p1 = rc(a[0]), p2 = rc(a[1]);
        var x1 = p1.col + 0.5, y1 = p1.row + 0.5, x2 = p2.col + 0.5, y2 = p2.row + 0.5;
        var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
        var hl = 0.42, hw = 0.3, bx = x2 - ux * hl, by = y2 - uy * hl;
        var col = a[2] || 'rgba(139,92,246,.75)';
        var ln = document.createElementNS(svgNS, 'line');
        ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', bx); ln.setAttribute('y2', by);
        ln.setAttribute('stroke', col); ln.setAttribute('stroke-width', '0.16'); ln.setAttribute('stroke-linecap', 'round');
        var pg = document.createElementNS(svgNS, 'polygon');
        pg.setAttribute('points', x2 + ',' + y2 + ' ' + (bx - uy * hw) + ',' + (by + ux * hw) + ' ' + (bx + uy * hw) + ',' + (by - ux * hw));
        pg.setAttribute('fill', col);
        svg.appendChild(ln); svg.appendChild(pg);
      });
    };
    function onDown(ev) {
      if (!V.tapCb) return;
      var rect = grid.getBoundingClientRect();
      var col = Math.floor((ev.clientX - rect.left) / rect.width * 8), row = Math.floor((ev.clientY - rect.top) / rect.height * 8);
      if (col < 0 || col > 7 || row < 0 || row > 7) return;
      if (ev.cancelable) ev.preventDefault();
      var f = V.flip ? 7 - col : col, r = V.flip ? row : 7 - row;
      V.tapCb(r * 16 + f);
    }
    board.addEventListener('pointerdown', onDown);
    V.destroy = function () {
      board.removeEventListener('pointerdown', onDown);
      if (ro) ro.disconnect(); else G.removeEventListener('resize', fit);
      V.timers.forEach(clearTimeout); V.timers = [];
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    };
    return V;
  }

  function figurine(s, color) {
    var map = color ? FIG_B : FIG_W, c = s.charAt(0);
    return map[c] ? map[c] + VS + s.slice(1) : s;
  }

  function mount(el, opts) {
    opts = opts || {};
    var level = Math.max(0, Math.min(3, opts.level | 0));
    var player = opts.side === 1 ? 1 : 0, ai = player ^ 1;
    var sound = function (n) { try { opts.sound && opts.sound(n); } catch (e) { } };
    var say = function (t) { try { opts.onStatus && opts.onStatus(t); } catch (e) { } };
    var E = ENGINE;
    el.innerHTML = '';
    var wrap = div('chess-wrap', el);
    var topBar = div('chess-bar', wrap);
    var view = makeView(wrap, player === 1);
    var botBar = div('chess-bar', wrap);
    var movesLine = div('chess-moves', wrap);
    var pos, log, sel, legal, thinking, ended, destroyed = false, timers = [], hintMarks = null, promoEl = null;

    function later(fn, ms) { var t = setTimeout(function () { timers.splice(timers.indexOf(t), 1); if (!destroyed) fn(); }, ms); timers.push(t); return t; }

    function reset() {
      pos = E.fromFen(E.START_FEN); log = []; sel = -1; thinking = false; ended = false; hintMarks = null;
      closePromo();
      view.sync(pos, true);
      refresh();
    }
    function lastMove() { var l = log[log.length - 1]; return l ? [l.m & 127, (l.m >> 7) & 127] : null; }
    function refresh() {
      legal = E.legalMoves(pos);
      var chk = E.inCheck(pos);
      view.mark({
        sel: sel, moves: sel >= 0 ? legal.filter(function (m) { return (m & 127) === sel; }) : null,
        last: lastMove(), check: chk ? pos.king[pos.side] : -1, hint: hintMarks
      });
      view.arrows(hintMarks ? [[hintMarks[0], hintMarks[1], 'rgba(34,160,107,.8)']] : []);
      bars();
    }
    function bars() {
      var VALS = [0, 1, 3, 3, 5, 9, 0];
      var capBy = [[], []], mat = [0, 0];
      log.forEach(function (l) { if (l.cap) { capBy[l.by].push(l.cap); mat[l.by] += VALS[l.cap & 7]; } if (l.promo) mat[l.by] += VALS[l.promo] - 1; });
      function bar(node, who, c) {
        var caps = capBy[c].slice().sort(function (a, b) { return (b & 7) - (a & 7); });
        var adv = mat[c] - mat[c ^ 1];
        node.innerHTML = '';
        var n = document.createElement('span'); n.className = 'chess-who' + (pos.side === c && !ended ? ' chess-turn' : '');
        n.textContent = who + ' · ' + SIDES[c]; node.appendChild(n);
        var cp = document.createElement('span'); cp.className = 'chess-caps ' + (c ? 'chess-capw' : 'chess-capb');
        cp.textContent = caps.map(function (p) { return GLYPH[p & 7] + VS; }).join(''); node.appendChild(cp);
        if (adv > 0) { var a = document.createElement('span'); a.className = 'chess-adv'; a.textContent = '+' + adv; node.appendChild(a); }
      }
      bar(topBar, '电脑', ai); bar(botBar, '你', player);
      var parts = [], start = Math.max(0, log.length - 8);
      if (start % 2) start--;
      for (var i = start; i < log.length; i++) {
        var txt = figurine(log[i].san, i % 2);
        parts.push(i % 2 === 0 ? (i / 2 + 1) + '. ' + txt : txt);
      }
      movesLine.textContent = '第 ' + pos.full + ' 回合' + (parts.length ? ' · ' + parts.join(' ') : ' · 白方先走');
    }
    function statusLine() {
      if (ended) return;
      if (pos.side === player) say((E.inCheck(pos) ? '将军！' : '') + '轮到你走 · ' + SIDES[player]);
      else say('电脑思考中…');
    }
    function playMove(m) {
      var by = pos.side, flag = (m >> 17) & 15;
      var cap = (flag & F_EP) ? ((by ^ 1) << 3 | PAWN) : pos.b[(m >> 7) & 127];
      var s = E.san(pos, m);
      E.make(pos, m);
      log.push({ m: m, san: s, cap: cap, by: by, promo: (m >> 14) & 7 });
      sel = -1; hintMarks = null;
      view.sync(pos);
      refresh();
      var st = E.status(pos);
      if (st.over) {
        ended = true;
        var w = st.winner < 0 ? 'draw' : (st.winner === player ? 'player' : 'ai');
        say(w === 'draw' ? '和棋 · ' + st.reason : (w === 'player' ? '将死！你赢了 🎉' : '被将死了，电脑获胜'));
        if (w === 'player') sound('win'); else if (w === 'ai') sound('lose'); else sound('move');
        bars();
        try { opts.onEnd && opts.onEnd({ winner: w, reason: st.reason }); } catch (e) { }
        return;
      }
      sound(st.inCheck ? 'check' : (cap ? 'capture' : 'move'));
      if (pos.side === ai) aiMove(); else statusLine();
    }
    function aiMove() {
      thinking = true; say('电脑思考中…');
      later(function () {
        var m = E.think(pos, level);
        thinking = false;
        if (m) playMove(m);
      }, 220);
    }
    function closePromo() {
      if (promoEl && promoEl.parentNode) promoEl.parentNode.removeChild(promoEl);
      promoEl = null;
    }
    function openPromo(to, cands) {
      closePromo();
      var ov = div('chess-promo', view.board), card = div('chess-promo-card', ov);
      var tip = div('chess-promo-tip', card); tip.textContent = '兵升变为：';
      var row = div('chess-promo-row', card);
      [QUEEN, ROOK, BISHOP, KNIGHT].forEach(function (t) {
        var btn = div('chess-promo-btn ' + (player ? 'chess-pc-b' : 'chess-pc-w'), row);
        btn.textContent = GLYPH[t] + VS;
        btn.addEventListener('pointerdown', function (ev) {
          ev.stopPropagation(); if (ev.cancelable) ev.preventDefault();
          closePromo();
          for (var i = 0; i < cands.length; i++) if (((cands[i] >> 14) & 7) === t) { playMove(cands[i]); return; }
        });
      });
      card.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
      ov.addEventListener('pointerdown', function (ev) {
        ev.stopPropagation(); if (ev.cancelable) ev.preventDefault();
        closePromo(); sel = -1; refresh();
      });
      promoEl = ov;
    }
    view.tapCb = function (sq) {
      if (ended || thinking || destroyed || promoEl || pos.side !== player) return;
      var p = pos.b[sq];
      if (sel >= 0) {
        var c = legal.filter(function (m) { return (m & 127) === sel && ((m >> 7) & 127) === sq; });
        if (c.length > 1) { openPromo(sq, c); return; }
        if (c.length === 1) { playMove(c[0]); return; }
      }
      if (p && (p >> 3) === player && sq !== sel) {
        var has = legal.some(function (m) { return (m & 127) === sq; });
        sel = has ? sq : -1;
        sound(has ? 'select' : 'illegal');
        refresh(); return;
      }
      if (sel >= 0 || p) sound('illegal');
      sel = -1; refresh();
    };

    reset();
    statusLine();
    if (player === 1) aiMove();

    return {
      undo: function () {
        if (thinking || destroyed) return;
        var need = player === 0 ? 1 : 2;
        if (log.length < need) return;
        closePromo();
        E.unmake(pos); log.pop();
        while (pos.side !== player && log.length) { E.unmake(pos); log.pop(); }
        ended = false; sel = -1; hintMarks = null;
        view.sync(pos);
        refresh(); statusLine();
      },
      restart: function () {
        if (destroyed) return;
        timers.forEach(clearTimeout); timers = [];
        reset(); statusLine();
        if (player === 1) aiMove();
      },
      hint: function () {
        if (ended || thinking || destroyed || pos.side !== player) return;
        thinking = true; say('团子正在帮你想…');
        later(function () {
          var r = E.bestMove(pos, { time: E.LEVEL_TIME[2] });
          thinking = false;
          if (!r.move) { statusLine(); return; }
          hintMarks = [r.move & 127, (r.move >> 7) & 127]; sel = -1;
          refresh(); statusLine();
          later(function () { hintMarks = null; refresh(); }, 2000);
        }, 30);
      },
      destroy: function () {
        destroyed = true;
        timers.forEach(clearTimeout); timers = [];
        view.destroy();
        el.innerHTML = '';
      }
    };
  }

  function demo(el, opts) {
    opts = opts || {};
    var E = ENGINE, stopped = false, timers = [], P;
    el.innerHTML = '';
    var wrap = div('chess-wrap chess-demo', el);
    var view = makeView(wrap, false);
    function cap(t) { try { opts.onCaption && opts.onCaption(t); } catch (e) { } }
    function at(ms, fn) { timers.push(setTimeout(function () { if (!stopped) fn(); }, ms)); }
    function setFen(f) { P = E.fromFen(f); view.sync(P, true); view.mark({}); view.arrows([]); }
    function forSide(sq) { var c = P.b[sq] >> 3; if (P.side !== c) { P.side = c; } }
    function dots(name) {
      var s = E.sqIdx(name); forSide(s);
      view.mark({ sel: s, moves: E.legalMoves(P).filter(function (m) { return (m & 127) === s; }) });
    }
    function mv(u, arrowsAfter) {
      var s = E.sqIdx(u.slice(0, 2)); forSide(s);
      var m = E.moveFromUci(P, u); if (!m) return;
      E.make(P, m); view.sync(P); view.arrows(arrowsAfter || []);
      view.mark({ last: [m & 127, (m >> 7) & 127], check: E.inCheck(P) ? P.king[P.side] : -1 });
    }
    function arrow(a, b) { view.arrows([[E.sqIdx(a), E.sqIdx(b)]]); }
    var steps = [
      { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', cap: '目标：将死对方的王！王被将军又无路可逃就赢了', dur: 3400,
        acts: [[700, function () { arrow('d1', 'd8'); }], [1500, function () { mv('d1d8'); }],
               [2300, function () { cap('黑王被车将军，无处可逃——将死，白方胜！'); }]] },
      { fen: '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1', cap: '车：横着竖着走直线，格数不限', dur: 3200,
        acts: [[500, function () { dots('d4'); }], [1500, function () { mv('d4d7'); }], [2300, function () { mv('d7a7'); }]] },
      { fen: '4k3/8/8/8/8/8/8/2B1K3 w - - 0 1', cap: '象：沿斜线走，格数不限，永远走同色格', dur: 3200,
        acts: [[500, function () { dots('c1'); }], [1500, function () { mv('c1f4'); }], [2300, function () { mv('f4b8'); }]] },
      { fen: '4k3/8/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', cap: '马：走 L 形（“日”字），可以跳过其他棋子', dur: 3200,
        acts: [[500, function () { dots('g1'); }], [1500, function () { mv('g1f3'); }], [2300, function () { mv('f3g5'); }]] },
      { fen: '4k3/3p4/8/8/8/8/4P3/4K3 w - - 0 1', cap: '兵：只向前走，斜着吃子，第一步可走两格', dur: 3700,
        acts: [[400, function () { dots('e2'); }], [1200, function () { mv('e2e4'); }], [1900, function () { mv('d7d5'); }],
               [2500, function () { arrow('e4', 'd5'); }], [2900, function () { mv('e4d5'); }]] },
      { fen: '4k3/8/8/8/8/8/PPP2PPP/R3K2R w KQ - 0 1', cap: '王车易位：王向车走两格，车跳到王的另一侧', dur: 3800,
        acts: [[500, function () { dots('e1'); }], [1500, function () { mv('e1g1'); }],
               [2300, function () { cap('注意：被将军时、或王经过被攻击的格子，不能易位'); }]] },
      { fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1', cap: '兵升变：兵走到底线，可变成后、车、象或马', dur: 3200,
        acts: [[500, function () { dots('b7'); }], [1300, function () { mv('b7b8q'); }],
               [2100, function () { cap('通常选最强的后！还有“吃过路兵”等着你发现'); }]] }
    ];
    var t = 0;
    steps.forEach(function (s) {
      at(t, function () { setFen(s.fen); cap(s.cap); });
      s.acts.forEach(function (a) { at(t + a[0], a[1]); });
      t += s.dur;
    });
    at(t, function () { try { opts.onDone && opts.onDone(); } catch (e) { } });
    return {
      stop: function () {
        stopped = true; timers.forEach(clearTimeout); timers = [];
        view.destroy();
      }
    };
  }

  G.TZGAMES = G.TZGAMES || {};
  G.TZGAMES['chess'] = {
    id: 'chess', name: '国际象棋', tagline: '王车易位、吃过路兵、兵升变，规则一个不少',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['白方', '黑方'],
    mount: mount, demo: demo,
    _engine: ENGINE
  };
})();
