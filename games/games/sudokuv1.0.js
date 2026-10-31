/* 团子棋馆 · 数独 (sudoku) v1.0 — 单人解谜，浏览器内生成唯一解题目 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
  root.TZGAMES = root.TZGAMES || {};

  /* ===================== 引擎 ===================== */
  var ALL = 0x3FE; // bits 1..9
  var POP = new Uint8Array(1024);
  for (var pi = 1; pi < 1024; pi++) POP[pi] = POP[pi >> 1] + (pi & 1);
  var ROWOF = new Uint8Array(81), COLOF = new Uint8Array(81), BOXOF = new Uint8Array(81);
  var UNITS = [], PEERS = [];
  (function () {
    var i, k;
    for (i = 0; i < 81; i++) {
      ROWOF[i] = (i / 9) | 0; COLOF[i] = i % 9;
      BOXOF[i] = ((ROWOF[i] / 3) | 0) * 3 + ((COLOF[i] / 3) | 0);
    }
    for (k = 0; k < 27; k++) UNITS.push([]);
    for (i = 0; i < 81; i++) { UNITS[ROWOF[i]].push(i); UNITS[9 + COLOF[i]].push(i); UNITS[18 + BOXOF[i]].push(i); }
    for (i = 0; i < 81; i++) {
      var s = [];
      for (var j = 0; j < 81; j++) if (j !== i && (ROWOF[j] === ROWOF[i] || COLOF[j] === COLOF[i] || BOXOF[j] === BOXOF[i])) s.push(j);
      PEERS.push(s);
    }
  })();
  var BOXNAME = ['左上宫', '上中宫', '右上宫', '左中宫', '正中宫', '右中宫', '左下宫', '下中宫', '右下宫'];
  var LEVEL_GIVENS = [42, 34, 28, 24];
  var LEVEL_TOL = [0, 0, 1, 2];               // 允许比目标多给几个数
  var LEVEL_PREF = [[1, 2], [2, 1], [2, 3], [3, 2]]; // 难度评级偏好：1=只靠显性唯一 2=需要隐性唯一 3=需要更高技巧

  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function bitDigit(m) { return 31 - Math.clz32(m & -m); }
  function unitName(u) { return u < 9 ? '第 ' + (u + 1) + ' 行' : u < 18 ? '第 ' + (u - 8) + ' 列' : BOXNAME[u - 18]; }
  function cellName(i) { return '第 ' + (ROWOF[i] + 1) + ' 行第 ' + (COLOF[i] + 1) + ' 列'; }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(a, rng) {
    for (var i = a.length - 1; i > 0; i--) { var j = (rng() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function parse(s) { var g = new Int8Array(81); for (var i = 0; i < 81; i++) { var c = s.charCodeAt(i) - 48; g[i] = (c >= 1 && c <= 9) ? c : 0; } return g; }
  function stringify(g) { var s = ''; for (var i = 0; i < 81; i++) s += g[i] ? g[i] : '.'; return s; }
  function countGivens(g) { var n = 0; for (var i = 0; i < 81; i++) if (g[i]) n++; return n; }
  function candMask(g, i) {
    if (g[i]) return 0;
    var used = 0, ps = PEERS[i];
    for (var k = 0; k < 20; k++) used |= 1 << g[ps[k]];
    return ALL & ~used;
  }

  // 位运算回溯（最少候选优先）。返回解的个数（到 limit 为止），out.sol 为第一个解
  function searchCount(grid, limit, rng, out) {
    var g = Int8Array.from(grid), rows = new Int32Array(9), cols = new Int32Array(9), boxes = new Int32Array(9);
    for (var i = 0; i < 81; i++) {
      var d = g[i]; if (!d) continue;
      var b = 1 << d;
      if ((rows[ROWOF[i]] | cols[COLOF[i]] | boxes[BOXOF[i]]) & b) return 0;
      rows[ROWOF[i]] |= b; cols[COLOF[i]] |= b; boxes[BOXOF[i]] |= b;
    }
    var count = 0, digs = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    function rec() {
      var best = -1, bestM = 0, bestN = 10;
      for (var i = 0; i < 81; i++) {
        if (g[i]) continue;
        var m = ALL & ~(rows[ROWOF[i]] | cols[COLOF[i]] | boxes[BOXOF[i]]), n = POP[m];
        if (n < bestN) { best = i; bestM = m; bestN = n; if (n <= 1) break; }
      }
      if (best < 0) { count++; if (out && !out.sol) out.sol = Int8Array.from(g); return; }
      if (bestN === 0) return;
      var r = ROWOF[best], c = COLOF[best], bx = BOXOF[best];
      if (rng) {
        var order = shuffle(digs.slice(), rng);
        for (var k = 0; k < 9 && count < limit; k++) {
          var dd = order[k], bit = 1 << dd; if (!(bestM & bit)) continue;
          g[best] = dd; rows[r] |= bit; cols[c] |= bit; boxes[bx] |= bit;
          rec();
          g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[bx] &= ~bit;
        }
      } else {
        var m2 = bestM;
        while (m2 && count < limit) {
          var bit2 = m2 & -m2; m2 &= m2 - 1;
          g[best] = bitDigit(bit2); rows[r] |= bit2; cols[c] |= bit2; boxes[bx] |= bit2;
          rec();
          g[best] = 0; rows[r] &= ~bit2; cols[c] &= ~bit2; boxes[bx] &= ~bit2;
        }
      }
    }
    rec();
    return count;
  }
  function countSolutions(g, limit) { return searchCount(g, limit || 2, null, null); }
  function solve(g) { var out = {}; return searchCount(g, 1, null, out) ? out.sol : null; }
  function randomFull(rng) { var out = {}; searchCount(new Int8Array(81), 1, rng, out); return out.sol; }

  // 单一技巧：返回一步 {cell,digit,kind:'full'|'hidden'|'naked',unit}，没有返回 null
  function findSingle(g, allowHidden, allowNaked) {
    var masks = new Int32Array(81), u, k, i, d;
    for (i = 0; i < 81; i++) masks[i] = candMask(g, i);
    // 1) 一个单元只剩一格
    for (u = 0; u < 27; u++) {
      var cells = UNITS[u], empty = -1, ne = 0;
      for (k = 0; k < 9; k++) if (!g[cells[k]]) { ne++; empty = cells[k]; }
      if (ne === 1 && POP[masks[empty]] === 1) return { cell: empty, digit: bitDigit(masks[empty]), kind: 'full', unit: u };
    }
    var order = [18, 19, 20, 21, 22, 23, 24, 25, 26, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    // 2) 宫内隐性唯一（最直观）
    if (allowHidden) {
      for (k = 0; k < 9; k++) { var hs = hiddenIn(g, masks, order[k]); if (hs) return hs; }
    }
    // 3) 显性唯一
    if (allowNaked) {
      for (i = 0; i < 81; i++) if (!g[i] && POP[masks[i]] === 1) return { cell: i, digit: bitDigit(masks[i]), kind: 'naked', unit: -1 };
    }
    // 4) 行/列隐性唯一
    if (allowHidden) {
      for (k = 9; k < 27; k++) { var h2 = hiddenIn(g, masks, order[k]); if (h2) return h2; }
    }
    return null;
  }
  function hiddenIn(g, masks, u) {
    var cells = UNITS[u], have = 0, k;
    for (k = 0; k < 9; k++) have |= 1 << g[cells[k]];
    for (var d = 1; d <= 9; d++) {
      var bit = 1 << d; if (have & bit) continue;
      var pos = -1, n = 0;
      for (k = 0; k < 9; k++) if (masks[cells[k]] & bit) { n++; pos = cells[k]; if (n > 1) break; }
      if (n === 1) return { cell: pos, digit: d, kind: 'hidden', unit: u };
    }
    return null;
  }
  // 评级：1=只靠显性唯一可解 2=加上隐性唯一可解 3=需要更高技巧
  function singlesSolve(grid, allowHidden) {
    var g = Int8Array.from(grid), left = 81 - countGivens(g);
    while (left > 0) {
      var s = findSingle(g, allowHidden, true);
      if (!s) return false;
      g[s.cell] = s.digit; left--;
    }
    return true;
  }
  function rate(g) { return singlesSolve(g, false) ? 1 : singlesSolve(g, true) ? 2 : 3; }

  // 挖洞：随机顺序删数，保持唯一解
  function dig(sol, target, rng) {
    var g = Int8Array.from(sol), order = shuffle(Array.from({ length: 81 }, function (_, i) { return i; }), rng), givens = 81;
    for (var k = 0; k < 81 && givens > target; k++) {
      var i = order[k], t = g[i];
      g[i] = 0;
      if (countSolutions(g, 2) !== 1) g[i] = t; else givens--;
    }
    return g;
  }

  function fromBank(level, rng) {
    var list = BANK[level], s = list[(rng() * list.length) | 0], p = parse(s);
    return { puzzle: p, solution: solve(p), givens: countGivens(p), rating: rate(p), source: 'bank' };
  }
  // opts: {rng, budgetMs}
  function generate(level, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random, budget = opts.budgetMs || 600, t0 = now();
    var target = LEVEL_GIVENS[level], tol = LEVEL_TOL[level], pref = LEVEL_PREF[level];
    var best = null, bestRank = 99, attempts = 0;
    while (now() - t0 < budget) {
      attempts++;
      var sol = randomFull(rng), p = dig(sol, target, rng), n = countGivens(p);
      if (n > target + tol) continue;
      var r = rate(p), pi2 = pref.indexOf(r); if (pi2 < 0) continue;
      var rank = pi2 * 10 + (n - target); // 先看技巧偏好，再看给数是否贴近目标
      if (rank < bestRank) { best = { puzzle: p, solution: sol, givens: n, rating: r, source: 'gen' }; bestRank = rank; }
      if (rank === 0 || (bestRank < 10 && attempts >= 25)) break;
    }
    var res = best || fromBank(level, rng);
    res.ms = now() - t0; res.attempts = attempts;
    return res;
  }

  function conflictPeers(g, i, d) {
    var r = [], ps = PEERS[i];
    for (var k = 0; k < 20; k++) if (g[ps[k]] === d) r.push(ps[k]);
    return r;
  }
  function mistakeReason(g, i, d) {
    var c = conflictPeers(g, i, d);
    for (var k = 0; k < c.length; k++) if (ROWOF[c[k]] === ROWOF[i]) return '第 ' + (ROWOF[i] + 1) + ' 行已经有 ' + d + ' 了';
    for (k = 0; k < c.length; k++) if (COLOF[c[k]] === COLOF[i]) return '第 ' + (COLOF[i] + 1) + ' 列已经有 ' + d + ' 了';
    if (c.length) return BOXNAME[BOXOF[i]] + '已经有 ' + d + ' 了';
    return d + ' 放这里，后面会无解，再想想';
  }
  // 提示：优先“单一技巧”可推出的格子
  function findHint(g, sol) {
    var s = findSingle(g, true, true), reason;
    if (s) {
      if (s.kind === 'full') reason = unitName(s.unit) + '只剩 ' + s.digit + ' 能放';
      else if (s.kind === 'hidden') reason = unitName(s.unit) + '里，' + s.digit + ' 只能放在这一格';
      else reason = '这格的行、列、宫已占掉 8 个数，只剩 ' + s.digit + ' 能放';
      s.reason = reason; s.ok = s.digit === sol[s.cell];
      return s;
    }
    // 兜底：候选最少的空格直接揭晓
    var bi = -1, bn = 10;
    for (var i = 0; i < 81; i++) if (!g[i]) { var n = POP[candMask(g, i)]; if (n < bn) { bn = n; bi = i; } }
    if (bi < 0) return null;
    return { cell: bi, digit: sol[bi], kind: 'reveal', unit: -1, ok: true, reason: '这步要用高阶技巧，先帮你揭晓' + cellName(bi) + '：' + sol[bi] };
  }
  function fmtTime(sec) { sec = Math.max(0, Math.floor(sec)); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }

  /* 备用题库：每档 10 题（生成器离线挑选，均已验证唯一解） */
  var BANK = [[], [], [], []]; // 由下方 BANK_DATA 填充
  var BANK_DATA = [
    [
      '4.73.2.8...5..8.428.9.453.1..2.5..39956.3.82...19..56...84...53....6329.5.32...16',
      '768.9.1.39.....86.54..1..9.8549.1...1.9.2..84..7.4..1..95.8.63738..59..1..14.3.58',
      '926.1.....1..54..645.79.132375.68.2124.9..36..89..145..3.....8...7..2...86.53..19',
      '1.63.9..85.8..614..9......6...843561.1..25984.8....2...64..789.8..96.43...2438.15',
      '..713..8..5......1..1.579.3.7.59.4..564712.9823....157...36..1.3..8..7299452.1.3.',
      '54.6..13...7315498..987462548.26.5799........6.1.....2.9..52.1..2.78.9.67.5....8.',
      '..94.23.1.4.5.82.76..193.8.234.85..9.86...4.55.16.48......519369.....7.....9.7158',
      '...25...4..1...6824.916.....96....4331.9.456.84.3.697..8.69..259.37..81..645.1.3.',
      '24...359.56.1.9243.....28...3.65.78..5.89....7..3..6.56..9..1289152.83.4.2...69.7',
      '.57.2436..469..78..9...6...6...8.93..38..1.26..2563.4.184..7.93...64.815....184.2'
    ],
    [
      '68.13......49..51..1..6.8.3.96.4..3....62.958..3.19..4......6477....1...3.92.6...',
      '.8.61.......587..9........1..2.4..7883...69.275..21...1...6...726....8943..4.812.',
      '..746...53.958.....85.97...9..3...6.5.6...1...1..5.49.258.3.6.77.18.4.......7...1',
      '8...3...2.341.7.....9.8...4...8...6..65..1..3....65..16.8...7154.37162.9...2...46',
      '345978.....1.653.......4.7.6.2.....3.53.4..9.4.......72..697.811....2.3...7.81..4',
      '....9436....1...2824....1.9157.....6....5.712..3......614.3.2..89.72164.3....5...',
      '..361.75.6....8.1......264..16....2..5.2...368..16...4.61.4...7284...39.3....1..5',
      '.45.9.2...7.4.2..9...5134.6167..48...34.56.9..9......4.1.........6.4..2..8..3.645',
      '..4....5..89.5.7..2....3...965..7.2..12..5.39..8.2167.8..7.259.5.7.1.34.....9....',
      '52.73...4...9.4.2.7..2619...513.7.4..9.4.5213..2......27......6...87...1..3...4.2'
    ],
    [
      '.24...6............6..25..3..5..9......5..17....267..53.6..4..22918..4....8...73.',
      '2....4.3...91..........5...4..7.36.867..81..5.8.24..7....63...93.1......7.6...2..',
      '...9....5..4.1..3.8..3...9..634.1.87.2.6.....49.8..3........4.2..2..6...67..9.8..',
      '..392.4.5..8.7.1..2....473...6..1.4.......291.2...8...7...1.9..3.2...5...1...9...',
      '..68....24786..9..1..9.4....91...8......13...2.......4.1.3......45.8.2..36.7....9',
      '.....94.8...1..5..8.....62...5...2.3.8.6.2.54.2..53.1...9.45....4...8.6....7....2',
      '..1.5.4.38..12....39.78.2.6.......3...729.....4.3.8.....2..59.......9.4...6...37.',
      '...3.....3..57.91..891..7.55736....8......56..18.5.....4.8...5.....9........65..4',
      '.13..27.5..25.........7...92.57.3..4.79.58.....42...........5......64...4.7...912',
      '4..3..6....29..3.76....14.2.....3.1....82..36.3..4.2.8...2.....29...7...158......'
    ],
    [
      '...9.26.35.2.....8.........61.25....2..........4.7..9.1...6...23...478.....3.8...',
      '.......7.2....8.5957.2.46.....8.1...6.8............51..426.....9..78....3.......6',
      '.....1..64..6..8....5....297...2...3...7......59..6.........4..6.39.7.1...24..3..',
      '.2..94.....7....4.18...........81...761...5..........6.3.1..7.5..2.4..1..15...8..',
      '........3..16..9.5....35.4......7..1.2.....5.7..41...6..3192.......8.63...5......',
      '.......6172.9.635.....8.9..5.........791.......3...6...8...5........7..5.9..6.1.3',
      '21...7.5......9...7.....2.....9..5...4...6..169.1.2..4...53.8...6....4..5....1...',
      '1.....2.7...8.7.9..5.........8.......9....51656.2..........8...4.3.59...9.5.1..3.',
      '....63......9..7.686.......6....2..8.3.7.5.4.2....6.5....3...85..9....3...5.1....',
      '.7.3..1..9.......48....2.3.....2.581.6.5....3.......7...394.............1....5829'
    ]
  ];
  for (var bl = 0; bl < 4; bl++) BANK[bl] = BANK_DATA[bl];

  var engine = {
    ALL: ALL, POP: POP, ROWOF: ROWOF, COLOF: COLOF, BOXOF: BOXOF, UNITS: UNITS, PEERS: PEERS,
    LEVEL_GIVENS: LEVEL_GIVENS, LEVEL_TOL: LEVEL_TOL, LEVEL_PREF: LEVEL_PREF, BANK: BANK,
    mulberry32: mulberry32, parse: parse, stringify: stringify, countGivens: countGivens, candMask: candMask,
    countSolutions: countSolutions, solve: solve, randomFull: randomFull, dig: dig, rate: rate,
    findSingle: findSingle, findHint: findHint, generate: generate, fromBank: fromBank,
    conflictPeers: conflictPeers, mistakeReason: mistakeReason, fmtTime: fmtTime, bitDigit: bitDigit
  };

  /* ===================== 视图 ===================== */
  var CSS = [
    '.sudoku-wrap{--sdw:var(--bw,min(92vw,560px));width:var(--sdw);margin:0 auto;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}',
    '.sudoku-info{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;font-size:13px;color:var(--muted,#7a6f86)}',
    '.sudoku-chip{display:inline-flex;align-items:center;gap:5px;background:var(--card,#fff);border:1px solid var(--line,#e9dcc8);border-radius:999px;padding:3px 11px;font-variant-numeric:tabular-nums}',
    '.sudoku-chip b{color:var(--ink,#2b2340);font-weight:700}',
    '.sudoku-chip.sudoku-err b{color:var(--red,#e5484d)}',
    '.sudoku-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;padding:3px;background:#8f7bb8;border-radius:16px;box-shadow:0 8px 22px rgba(80,55,130,.18),0 2px 0 #7a66a3;aspect-ratio:1/1;width:100%;box-sizing:border-box}',
    '.sudoku-box{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#e2d6f2;overflow:hidden}',
    '.sudoku-box:nth-child(1){border-top-left-radius:13px}.sudoku-box:nth-child(3){border-top-right-radius:13px}.sudoku-box:nth-child(7){border-bottom-left-radius:13px}.sudoku-box:nth-child(9){border-bottom-right-radius:13px}',
    '.sudoku-cell{position:relative;background:#fffdf7;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background-color .15s;aspect-ratio:1/1;min-width:0}',
    '.sudoku-box.sudoku-alt .sudoku-cell{background:#f8f4ff}',
    '.sudoku-v{font-size:calc(var(--sdw)/9*.56);line-height:1;font-weight:600;color:var(--blue,#3b82f6)}',
    '.sudoku-given .sudoku-v{color:var(--ink,#2b2340);font-weight:800}',
    '.sudoku-notes{position:absolute;inset:6%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);pointer-events:none}',
    '.sudoku-notes span{display:flex;align-items:center;justify-content:center;font-size:calc(var(--sdw)/9*.24);line-height:1;color:#8a7fa0;font-weight:600;border-radius:4px}',
    '.sudoku-notes span.sudoku-nhl{background:#cfe3ff;color:#1d4ed8}',
    '.sudoku-box .sudoku-cell.sudoku-peer{background:#efe7ff}',
    '.sudoku-box .sudoku-cell.sudoku-same{background:#d6e7ff}',
    '.sudoku-box .sudoku-cell.sudoku-hl{background:#fff0c2}',
    '.sudoku-box .sudoku-cell.sudoku-x{background:#ffe3e3}',
    '.sudoku-box .sudoku-cell.sudoku-x::after{content:"×";position:absolute;font-size:calc(var(--sdw)/9*.5);color:rgba(229,72,77,.45);font-weight:700}',
    '.sudoku-box .sudoku-cell.sudoku-sel{background:#ffe08a;box-shadow:inset 0 0 0 2px var(--yellow,#ffc53d)}',
    '.sudoku-box .sudoku-cell.sudoku-conf{background:#ffd6d6}',
    '.sudoku-box .sudoku-cell.sudoku-conf .sudoku-v{color:var(--red,#e5484d)}',
    '.sudoku-box .sudoku-cell.sudoku-bad{background:#ffe1e1}',
    '.sudoku-bad .sudoku-v{color:var(--red,#e5484d);animation:sudoku-shake .45s ease-in-out}',
    '@keyframes sudoku-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}',
    '.sudoku-box .sudoku-cell.sudoku-flash{background:#c9f2dc;animation:sudoku-flash .5s ease-in-out 4 alternate}',
    '@keyframes sudoku-flash{from{box-shadow:inset 0 0 0 2px rgba(34,160,107,.3)}to{box-shadow:inset 0 0 0 4px var(--green,#22a06b)}}',
    '.sudoku-pop .sudoku-v{animation:sudoku-pop .22s ease-out}',
    '@keyframes sudoku-pop{from{transform:scale(.4);opacity:.3}to{transform:scale(1);opacity:1}}',
    '.sudoku-won .sudoku-cell{animation:sudoku-wave .6s ease-in-out}',
    '@keyframes sudoku-wave{50%{background:#d9f7e6}}',
    '.sudoku-pad{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:12px}',
    '.sudoku-key{appearance:none;-webkit-appearance:none;border:1px solid var(--line,#e9dcc8);background:var(--card,#fff);border-radius:14px;min-height:58px;padding:4px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--ink,#2b2340);font:inherit;cursor:pointer;box-shadow:0 3px 0 #eadfce;touch-action:manipulation;transition:transform .08s,background .15s}',
    '.sudoku-key:active{transform:translateY(2px);box-shadow:0 1px 0 #eadfce}',
    '.sudoku-key b{font-size:26px;line-height:1;font-weight:800;color:#4b3f72}',
    '.sudoku-key small{font-size:11px;color:var(--muted,#7a6f86);line-height:1}',
    '.sudoku-key.sudoku-done{visibility:hidden}',
    '.sudoku-key.sudoku-cur{background:#e6efff;border-color:#a9c7ff}',
    '.sudoku-tool b{font-size:20px}',
    '.sudoku-tool.sudoku-notes-key{grid-column:span 2}',
    '.sudoku-tool.sudoku-on{background:var(--purple,#8b5cf6);border-color:var(--purple,#8b5cf6);box-shadow:0 3px 0 #6d43d6}',
    '.sudoku-tool.sudoku-on b,.sudoku-tool.sudoku-on small{color:#fff}',
    '.sudoku-demo .sudoku-pad,.sudoku-demo .sudoku-grid{pointer-events:none}',
    '.sudoku-pad.sudoku-wait{opacity:.5;pointer-events:none}'
  ].join('\n');
  function injectCss() {
    if (typeof document === 'undefined') return;
    if (document.querySelector('style[data-sudoku-css]')) return;
    var st = document.createElement('style');
    st.setAttribute('data-sudoku-css', '1');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function div(cls, parent) { var e = document.createElement('div'); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  function createView(el, demo) {
    injectCss();
    el.innerHTML = '';
    var wrap = div('sudoku-wrap' + (demo ? ' sudoku-demo' : ''), el);
    var info = div('sudoku-info', wrap);
    var chipLv = div('sudoku-chip', info), chipT = div('sudoku-chip', info), chipE = div('sudoku-chip sudoku-err', info);
    var grid = div('sudoku-grid', wrap);
    var cells = new Array(81), vals = new Array(81), notes = new Array(81), lastCls = new Array(81);
    var boxes = [];
    for (var b = 0; b < 9; b++) boxes.push(div('sudoku-box' + (b % 2 ? ' sudoku-alt' : ''), grid));
    for (var i = 0; i < 81; i++) {
      var c = div('sudoku-cell', boxes[BOXOF[i]]);
      c.setAttribute('data-i', i);
      var v = document.createElement('span'); v.className = 'sudoku-v'; c.appendChild(v);
      var ns = div('sudoku-notes', c), arr = [];
      for (var d = 1; d <= 9; d++) { var s = document.createElement('span'); ns.appendChild(s); arr.push(s); }
      cells[i] = c; vals[i] = v; notes[i] = arr; lastCls[i] = '';
    }
    // 子格要按行列顺序摆进宫格：上面按 i 递增插入，同宫内恰好是行优先
    var pad = div('sudoku-pad', wrap), keys = {};
    function key(k, label, sub, cls) {
      var bt = document.createElement('button'); bt.type = 'button';
      bt.className = 'sudoku-key' + (cls ? ' ' + cls : ''); bt.setAttribute('data-k', k);
      var bb = document.createElement('b'); bb.textContent = label; bt.appendChild(bb);
      var sm = document.createElement('small'); sm.textContent = sub; bt.appendChild(sm);
      pad.appendChild(bt); keys[k] = { el: bt, sub: sm };
    }
    [1, 2, 3, 4, 5].forEach(function (d) { key(String(d), String(d), '9'); });
    key('erase', '⌫', '擦除', 'sudoku-tool');
    [6, 7, 8, 9].forEach(function (d) { key(String(d), String(d), '9'); });
    key('notes', '✎', '笔记 关', 'sudoku-tool sudoku-notes-key');

    function setCls(i, cls) { if (lastCls[i] !== cls) { cells[i].className = cls; lastCls[i] = cls; } }
    var view = {
      wrap: wrap, grid: grid, pad: pad, cells: cells,
      setInfo: function (lv, t, e) {
        chipLv.innerHTML = '<b>' + lv + '</b>';
        chipT.innerHTML = '⏱ <b>' + t + '</b>';
        chipE.innerHTML = '✗ 错误 <b>' + e + '</b>';
      },
      render: function (m) {
        var sel = m.sel, selD = (sel >= 0 && m.g[sel]) ? m.g[sel] : (m.hlDigit || 0);
        var hl = m.hl || {}, xs = m.xs || {}, conf = m.conf || {}, pop = m.pop;
        var cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (var i = 0; i < 81; i++) {
          var gv = m.g[i]; cnt[gv]++;
          var cls = 'sudoku-cell';
          if (m.given[i]) cls += ' sudoku-given';
          if (sel >= 0 && i !== sel && (ROWOF[i] === ROWOF[sel] || COLOF[i] === COLOF[sel] || BOXOF[i] === BOXOF[sel])) cls += ' sudoku-peer';
          if (hl[i]) cls += ' sudoku-hl';
          if (xs[i]) cls += ' sudoku-x';
          if (selD && gv === selD) cls += ' sudoku-same';
          if (i === sel) cls += ' sudoku-sel';
          if (conf[i]) cls += ' sudoku-conf';
          var bad = m.bad && m.bad.cell === i;
          if (bad) cls += ' sudoku-bad';
          if (m.flash === i) cls += ' sudoku-flash';
          if (pop === i) cls += ' sudoku-pop';
          setCls(i, cls);
          var txt = bad ? String(m.bad.digit) : (gv ? String(gv) : '');
          if (vals[i].textContent !== txt) vals[i].textContent = txt;
          var nm = (gv || bad) ? 0 : m.notes[i], arr = notes[i];
          for (var d = 1; d <= 9; d++) {
            var on = nm & (1 << d), t2 = on ? String(d) : '', c2 = (on && d === selD) ? 'sudoku-nhl' : '';
            if (arr[d - 1].textContent !== t2) arr[d - 1].textContent = t2;
            if (arr[d - 1].className !== c2) arr[d - 1].className = c2;
          }
        }
        for (var k = 1; k <= 9; k++) {
          var ky = keys[String(k)], left = 9 - cnt[k];
          ky.sub.textContent = '剩 ' + left;
          ky.el.classList.toggle('sudoku-done', left <= 0);
          ky.el.classList.toggle('sudoku-cur', k === selD && left > 0);
        }
        keys.notes.el.classList.toggle('sudoku-on', !!m.notesMode);
        keys.notes.sub.textContent = m.notesMode ? '笔记 开' : '笔记 关';
        pad.classList.toggle('sudoku-wait', !m.ready && !demo);
      }
    };
    return view;
  }
  function blankModel() {
    return { given: new Uint8Array(81), g: new Int8Array(81), notes: new Uint16Array(81), sel: -1, hlDigit: 0, notesMode: false, flash: -1, bad: null, conf: null, hl: null, xs: null, pop: -1, ready: false };
  }
  function toSet(list) { var o = {}; for (var k = 0; k < list.length; k++) o[list[k]] = 1; return o; }

  /* ===================== 对局 ===================== */
  function mount(el, opts) {
    opts = opts || {};
    var level = Math.max(0, Math.min(3, opts.level | 0));
    var onStatus = opts.onStatus || function () {}, onEnd = opts.onEnd || function () {}, snd = opts.sound || function () {};
    var view = createView(el, false), m, sol, stack, mistakes, elapsed, lastTick, ended, timers = [], tick = null, dead = false;

    function later(fn, ms) { var t = setTimeout(function () { timers.splice(timers.indexOf(t), 1); if (!dead) fn(); }, ms); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; if (tick) { clearInterval(tick); tick = null; } }
    function updInfo() { view.setInfo(root.TZGAMES.sudoku.levels[level], fmtTime(elapsed / 1000), mistakes); }
    function draw() { view.render(m); updInfo(); }
    function hidden() { return typeof document !== 'undefined' && document.hidden; }
    function startTimer() {
      lastTick = now();
      tick = setInterval(function () {
        var t = now(); if (!hidden() && !ended) elapsed += Math.min(t - lastTick, 2000); lastTick = t; updInfo();
      }, 500);
    }

    function newGame() {
      clearTimers();
      m = blankModel(); stack = []; mistakes = 0; elapsed = 0; ended = false; sol = null;
      draw(); onStatus('正在出题…');
      later(function () {
        var p = generate(level, { budgetMs: 600 });
        sol = p.solution;
        for (var i = 0; i < 81; i++) { m.g[i] = p.puzzle[i]; m.given[i] = p.puzzle[i] ? 1 : 0; }
        m.ready = true; m.sel = -1;
        draw(); startTimer();
        onStatus('选一格，再点下面的数字 · 给出 ' + p.givens + ' 个数');
      }, 30);
    }

    function applyDigit(i, d) { // 正确落子（含清理同伴笔记），返回 changes
      var ch = [[i, m.g[i], m.notes[i]]], bit = 1 << d, ps = PEERS[i];
      m.g[i] = d; m.notes[i] = 0;
      for (var k = 0; k < 20; k++) { var p = ps[k]; if (m.notes[p] & bit) { ch.push([p, m.g[p], m.notes[p]]); m.notes[p] &= ~bit; } }
      return ch;
    }
    function remaining(d) { var n = 9; for (var i = 0; i < 81; i++) if (m.g[i] === d) n--; return n; }
    function checkWin() {
      for (var i = 0; i < 81; i++) if (m.g[i] !== sol[i]) return false;
      ended = true; m.sel = -1; m.hlDigit = 0;
      var t = fmtTime(elapsed / 1000);
      draw(); view.grid.classList.add('sudoku-won');
      onStatus('完成！用时 ' + t + ' · 错误 ' + mistakes + ' 次');
      later(function () { onEnd({ winner: 'player', reason: '用时 ' + t + ' · 错误 ' + mistakes + ' 次' }); }, 300);
      return true;
    }
    function popAt(i) { m.pop = i; later(function () { if (m.pop === i) { m.pop = -1; } }, 260); }

    function enterDigit(d) {
      if (!m.ready || ended) return;
      var i = m.sel;
      if (i < 0 || m.given[i]) { m.hlDigit = (m.hlDigit === d && i < 0) ? 0 : d; if (i >= 0) m.sel = -1; draw(); snd('select'); return; }
      if (m.notesMode) {
        if (m.g[i]) { snd('illegal'); return; }
        stack.push([[i, m.g[i], m.notes[i]]]);
        m.notes[i] ^= 1 << d; m.hlDigit = d; draw(); snd('select'); return;
      }
      if (m.g[i] === d) return;
      if (sol[i] !== d) {
        mistakes++;
        var reason = mistakeReason(m.g, i, d);
        m.bad = { cell: i, digit: d }; m.conf = toSet(conflictPeers(m.g, i, d));
        draw(); snd('illegal');
        onStatus(reason + ' · 错误 ' + mistakes + ' 次');
        var mark = m.bad;
        later(function () { if (m.bad === mark) { m.bad = null; m.conf = null; draw(); } }, 750);
        return;
      }
      m.bad = null; m.conf = null;
      stack.push(applyDigit(i, d)); popAt(i);
      draw(); snd('move');
      if (checkWin()) return;
      if (remaining(d) === 0) onStatus('数字 ' + d + ' 已经全部填完 ✨');
      else onStatus('填得好！继续 · 已填 ' + filled() + '/81');
    }
    function filled() { var n = 0; for (var i = 0; i < 81; i++) if (m.g[i]) n++; return n; }
    function erase() {
      if (!m.ready || ended) return;
      var i = m.sel;
      if (i < 0 || m.given[i] || (!m.g[i] && !m.notes[i])) { snd('illegal'); return; }
      stack.push([[i, m.g[i], m.notes[i]]]);
      if (m.g[i]) m.g[i] = 0; else m.notes[i] = 0;
      draw(); snd('select');
    }
    function select(i) {
      if (!m.ready || ended) return;
      m.sel = (m.sel === i) ? -1 : i; m.hlDigit = 0; draw(); snd('select');
    }
    function move(dx, dy) {
      if (!m.ready || ended) return;
      var i = m.sel < 0 ? 40 : m.sel, r = (ROWOF[i] + dy + 9) % 9, c = (COLOF[i] + dx + 9) % 9;
      if (m.sel < 0) { r = 4; c = 4; }
      m.sel = r * 9 + c; m.hlDigit = 0; draw();
    }
    function toggleNotes() { if (!m.ready || ended) return; m.notesMode = !m.notesMode; draw(); snd('select'); onStatus(m.notesMode ? '笔记模式：点数字记下候选数，再点一次划掉' : '笔记模式已关，点数字直接填'); }

    function onCell(e) {
      var c = e.target.closest ? e.target.closest('.sudoku-cell') : null; if (!c) return;
      e.preventDefault(); select(+c.getAttribute('data-i'));
    }
    function onPad(e) {
      var b = e.target.closest ? e.target.closest('.sudoku-key') : null; if (!b) return;
      var k = b.getAttribute('data-k');
      if (k === 'erase') erase(); else if (k === 'notes') toggleNotes(); else enterDigit(+k);
    }
    function onKey(e) {
      if (!el.isConnected || !m || !m.ready || ended) return;
      var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k >= '1' && k <= '9' && k.length === 1) { enterDigit(+k); e.preventDefault(); }
      else if (k === 'Backspace' || k === 'Delete' || k === '0') { erase(); e.preventDefault(); }
      else if (k === 'ArrowUp') { move(0, -1); e.preventDefault(); }
      else if (k === 'ArrowDown') { move(0, 1); e.preventDefault(); }
      else if (k === 'ArrowLeft') { move(-1, 0); e.preventDefault(); }
      else if (k === 'ArrowRight') { move(1, 0); e.preventDefault(); }
      else if (k === 'n' || k === 'N') { toggleNotes(); }
      else if (k === 'Escape') { m.sel = -1; m.hlDigit = 0; draw(); }
    }
    view.grid.addEventListener('pointerdown', onCell);
    view.pad.addEventListener('click', onPad);
    document.addEventListener('keydown', onKey);
    newGame();

    return {
      undo: function () {
        if (!m.ready || ended || !stack.length) return;
        var ch = stack.pop();
        for (var k = ch.length - 1; k >= 0; k--) { m.g[ch[k][0]] = ch[k][1]; m.notes[ch[k][0]] = ch[k][2]; }
        m.bad = null; m.conf = null; m.sel = ch[0][0];
        draw(); onStatus('已撤销上一步');
      },
      hint: function () {
        if (!m.ready || ended) return;
        var h = findHint(m.g, sol); if (!h) return;
        m.bad = null; m.conf = null;
        stack.push(applyDigit(h.cell, h.digit));
        m.sel = h.cell; m.hlDigit = 0; m.flash = h.cell;
        draw(); snd('select');
        onStatus('💡 ' + h.reason);
        later(function () { if (m.flash === h.cell) { m.flash = -1; draw(); } }, 2000);
        checkWin();
      },
      restart: function () { view.grid.classList.remove('sudoku-won'); newGame(); },
      destroy: function () {
        dead = true; clearTimers();
        view.grid.removeEventListener('pointerdown', onCell);
        view.pad.removeEventListener('click', onPad);
        document.removeEventListener('keydown', onKey);
        el.innerHTML = '';
      }
    };
  }

  /* ===================== 规则演示 ===================== */
  function demo(el, opts) {
    opts = opts || {};
    var cap = opts.onCaption || function () {}, done = opts.onDone || function () {};
    var view = createView(el, true), timers = [], stopped = false;
    var p = parse(BANK[0][0]), S = solve(p), m = blankModel();
    for (var i = 0; i < 81; i++) { m.g[i] = p[i]; m.given[i] = p[i] ? 1 : 0; }
    m.ready = true;
    view.setInfo('规则', '00:00', 0);
    function draw() { view.render(m); }
    function at(ms, fn) { timers.push(setTimeout(function () { if (!stopped) fn(); }, ms)); }
    function clearMarks() { m.sel = -1; m.hl = null; m.xs = null; m.hlDigit = 0; m.flash = -1; m.notesMode = false; }
    function put(i, d) { m.g[i] = d; m.notes[i] = 0; var ps = PEERS[i]; for (var k = 0; k < 20; k++) m.notes[ps[k]] &= ~(1 << d); m.pop = i; }
    function emptiesOf(u) { return UNITS[u].filter(function (c) { return !m.g[c]; }); }
    function bestUnit(from, to) { // 已填最多但未满的单元
      var best = from, bn = -1;
      for (var u = from; u < to; u++) { var n = 9 - emptiesOf(u).length; if (n < 9 && n > bn) { bn = n; best = u; } }
      return best;
    }
    function fillUnitButOne(u) {
      var e = emptiesOf(u), keep = e[e.length - 1];
      e.forEach(function (c) { if (c !== keep) { m.g[c] = S[c]; } });
      return keep;
    }
    var steps = [];
    // 1 目标
    steps.push(function () {
      clearMarks(); cap('目标：每行、每列、每宫都填齐 1–9，不重复');
      m.hl = toSet(UNITS[0]); draw();
      at(1000, function () { m.hl = toSet(UNITS[9]); draw(); });
      at(2000, function () { m.hl = toSet(UNITS[18]); draw(); });
    });
    // 2 看一行
    steps.push(function () {
      clearMarks();
      var u = bestUnit(0, 9), cell = fillUnitButOne(u);
      m.hl = toSet(UNITS[u]); m.sel = cell; draw();
      cap('看一行：第 ' + (u + 1) + ' 行已有 8 个数，缺的 ' + S[cell] + ' 就填这格');
      at(1700, function () { put(cell, S[cell]); draw(); });
    });
    // 3 看一宫
    steps.push(function () {
      clearMarks();
      var u = bestUnit(18, 27), cell = fillUnitButOne(u);
      m.hl = toSet(UNITS[u]); m.sel = cell; draw();
      cap('看一宫：' + BOXNAME[u - 18] + '只差一个数，1–9 里缺 ' + S[cell]);
      at(1700, function () { put(cell, S[cell]); draw(); });
    });
    // 4 唯一候选数（显性唯一）
    steps.push(function () {
      clearMarks();
      var c = -1, guard = 0;
      while (guard++ < 60) {
        for (var i = 0; i < 81 && c < 0; i++) if (!m.g[i] && POP[candMask(m.g, i)] === 1) {
          // 避开“单元只剩一格”的简单情况
          var simple = [UNITS[ROWOF[i]], UNITS[9 + COLOF[i]], UNITS[18 + BOXOF[i]]].some(function (U) { return U.filter(function (x) { return !m.g[x]; }).length === 1; });
          if (!simple) c = i;
        }
        if (c >= 0) break;
        var em = []; for (var j = 0; j < 81; j++) if (!m.g[j]) em.push(j);
        if (!em.length) break; var f = em[(em.length * 0.37) | 0]; m.g[f] = S[f];
      }
      if (c < 0) { for (var z = 0; z < 81; z++) if (!m.g[z]) { c = z; break; } }
      var peers = PEERS[c].filter(function (x) { return m.g[x]; });
      m.sel = c; draw();
      cap('唯一候选：这格的行列宫已占掉 8 个数，只剩 ' + S[c]);
      at(1000, function () { m.hl = toSet(peers); draw(); });
      at(2300, function () { put(c, S[c]); m.hl = null; m.hlDigit = S[c]; draw(); });
    });
    // 5 排除法（宫内隐性唯一）
    steps.push(function () {
      clearMarks();
      var masks = new Int32Array(81), hs = null, u, k;
      for (k = 0; k < 81; k++) masks[k] = candMask(m.g, k);
      for (u = 18; u < 27 && !hs; u++) {
        var cand = hiddenSingleIn(u, masks); if (cand) hs = cand;
      }
      if (!hs) { for (u = 0; u < 18 && !hs; u++) hs = hiddenSingleIn(u, masks); }
      if (!hs) { // 极少见：退化成直接填
        for (k = 0; k < 81; k++) if (!m.g[k]) { hs = { cell: k, digit: S[k], unit: 18 + BOXOF[k] }; break; }
      }
      var d = hs.digit, others = UNITS[hs.unit].filter(function (x) { return !m.g[x] && x !== hs.cell; });
      m.hl = toSet(UNITS[hs.unit]); m.hlDigit = d; draw();
      cap('排除法：同行同列的 ' + d + ' 挡住其他格，' + d + ' 只能放这里');
      at(1100, function () { m.xs = toSet(others); draw(); });
      at(2300, function () { m.sel = hs.cell; put(hs.cell, d); m.xs = null; draw(); });
      function hiddenSingleIn(uu, mk) {
        var cells = UNITS[uu], have = 0;
        cells.forEach(function (x) { have |= 1 << m.g[x]; });
        for (var dd = 1; dd <= 9; dd++) {
          if (have & (1 << dd)) continue;
          var pos = cells.filter(function (x) { return mk[x] & (1 << dd); });
          var emp = cells.filter(function (x) { return !m.g[x]; });
          if (pos.length === 1 && emp.length >= 3 && POP[mk[pos[0]]] > 1) return { cell: pos[0], digit: dd, unit: uu };
        }
        return null;
      }
    });
    // 6 笔记模式
    steps.push(function () {
      clearMarks();
      var a = -1, b = -1;
      for (var i = 0; i < 81 && b < 0; i++) {
        if (m.g[i]) continue;
        var mk = candMask(m.g, i), n = POP[mk]; if (n < 2 || n > 4) continue;
        var ps = PEERS[i];
        for (var k = 0; k < 20; k++) { var q = ps[k]; if (!m.g[q] && (mk & (1 << S[q])) && S[q] !== S[i]) { a = q; b = i; break; } }
      }
      if (b < 0) { for (var z = 0; z < 81; z++) if (!m.g[z]) { b = z; break; } a = -1; }
      var digs = []; var mm = candMask(m.g, b); for (var d = 1; d <= 9; d++) if (mm & (1 << d)) digs.push(d);
      m.notesMode = true; m.sel = b; draw();
      cap('拿不准就开「笔记」记候选；填好数，同伴笔记自动划掉');
      digs.forEach(function (dd, j) { at(500 + j * 380, function () { m.notes[b] |= 1 << dd; draw(); }); });
      if (a >= 0) {
        at(2000, function () { m.notesMode = false; m.sel = a; draw(); });
        at(2700, function () { put(a, S[a]); m.hlDigit = S[a]; draw(); });
      }
    });
    var t = 0, DUR = [3200, 3300, 3300, 3400, 3400, 3500];
    steps.forEach(function (fn, k) { at(t, fn); t += DUR[k]; });
    at(t, function () { clearMarks(); draw(); done(); });
    draw();
    return { stop: function () { stopped = true; timers.forEach(clearTimeout); timers = []; } };
  }

  root.TZGAMES.sudoku = {
    id: 'sudoku', name: '数独', tagline: '九宫填数，越解越上头',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['单人'],
    mount: mount,
    demo: demo,
    _engine: engine
  };
})();
