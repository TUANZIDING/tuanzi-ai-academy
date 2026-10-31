/* 团子棋馆 · 团子突击队 (blaster) v1.0 — 原创横版闯关射击：丛林 → 河桥 → 基地 → 关底大炮墙 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
  root.TZGAMES = root.TZGAMES || {};

  /* ===================== 常量 ===================== */
  var W = 480, H = 270, GROUND = 230, WATER_Y = 244, WATER_TOP = 238;
  var WORLD_W = 6200, CAM_MAX = WORLD_W - W, BOSS_X = 6110;
  var STEP = 1000 / 60;
  var GRAV = 0.25, JUMP_V = -5.6, RUN = 1.5, MAXFALL = 6;
  var PI = Math.PI, D45 = Math.SQRT1_2;

  var LEVELS = [
    { name: '新手', lives: 5, shield: 1, enemyMul: 0.6, fireMul: 0.55, bulletSpeed: 0.7, gruntShoot: 0, keepWeapon: true, coreHp: 45, turretHp: 10 },
    { name: '入门', lives: 4, shield: 0, enemyMul: 0.8, fireMul: 0.75, bulletSpeed: 0.85, gruntShoot: 0, keepWeapon: false, coreHp: 55, turretHp: 12 },
    { name: '进阶', lives: 4, shield: 0, enemyMul: 1.0, fireMul: 1.0, bulletSpeed: 1.0, gruntShoot: 0.004, keepWeapon: false, coreHp: 66, turretHp: 14 },
    { name: '大师', lives: 3, shield: 0, enemyMul: 1.3, fireMul: 1.35, bulletSpeed: 1.2, gruntShoot: 0.008, keepWeapon: false, coreHp: 78, turretHp: 16 }
  ];

  var WEAPONS = {
    N: { name: '普通', icon: '普', cd: 10, speed: 5, dmg: 1, max: 5, col: '#fff3a8' },
    S: { name: '散弹', icon: '散', cd: 16, speed: 4.5, dmg: 1, max: 25, spread: [-0.32, -0.16, 0, 0.16, 0.32], col: '#ff9f43' },
    L: { name: '激光', icon: '激', cd: 22, speed: 7, dmg: 3, max: 3, laser: true, len: 34, col: '#5ef2ff' },
    R: { name: '连发', icon: '连', cd: 9, speed: 6, dmg: 1, max: 12, twin: true, col: '#b4ff6b' },
    M: { name: '速射', icon: '速', cd: 5, speed: 5.5, dmg: 1, max: 12, jitter: 0.05, col: '#ff7bd5' }
  };
  var WCOL = { S: '#ff8a3d', L: '#3b82f6', R: '#22a06b', M: '#8b5cf6', N: '#7a6f86' };

  // 枪口位置（相对脚底，x 乘以朝向）
  var MUZ = { fwd: [10, -14], diagUp: [8, -21], up: [2, -27], diagDown: [8, -7], prone: [13, -5], down: [0, -1], dive: [10, -12] };

  var TIPS = [
    '趴下（只按↓）能躲开炮塔的平射炮弹',
    '狙击手缩在沙袋后时打不动，等他探头再开火',
    '「散」字武器一次五发，打无人机最好用',
    '关底核心在半空，跳上左边的平台平射最准',
    '桥会一节节塌，别停，一口气跑过去',
    '在水里按↓潜水，子弹打不到你',
    '站在细平台上按 ↓ + 跳 可以跳下去',
    '空中按↓能往正下方开火'
  ];

  /* ===================== 工具 ===================== */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  // 矩形重叠
  function aabb(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
  function rectHit(a, b) { return !!a && !!b && aabb(a.x, a.y, a.w, a.h, b.x, b.y, b.w, b.h); }
  // 圆与矩形
  function circleRect(cx, cy, r, b) {
    if (!b) return false;
    var nx = clamp(cx, b.x, b.x + b.w), ny = clamp(cy, b.y, b.y + b.h);
    var dx = cx - nx, dy = cy - ny; return dx * dx + dy * dy <= r * r;
  }
  function pointIn(x, y, b) { return !!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
  function angDiff(a, b) { var d = b - a; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return d; }

  /* 八方向瞄准：返回单位向量与姿势 */
  function aimVector(up, down, h, facing, onGround, inWater) {
    var f = h || facing || 1;
    if (up && h) return { x: f * D45, y: -D45, pose: 'diagUp' };
    if (up) return { x: 0, y: -1, pose: 'up' };
    if (down) {
      if (inWater && onGround) return { x: f, y: 0, pose: 'dive' };
      if (h) return { x: f * D45, y: D45, pose: 'diagDown' };
      if (!onGround) return { x: 0, y: 1, pose: 'down' };
      return { x: f, y: 0, pose: 'prone' };
    }
    return { x: f, y: 0, pose: 'fwd' };
  }

  /* 武器子弹：返回子弹数组 */
  function weaponBullets(wid, x, y, ax, ay, rnd) {
    var w = WEAPONS[wid] || WEAPONS.N, base = Math.atan2(ay, ax), out = [];
    rnd = rnd || Math.random;
    function mk(a, ox, oy) {
      return { x: x + ox, y: y + oy, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, a: a, dmg: w.dmg,
        r: w.laser ? 3 : (wid === 'N' ? 2 : 2.5), laser: !!w.laser, len: w.len || 0, pierce: !!w.laser, life: 110, hit: null, wid: wid };
    }
    if (w.spread) w.spread.forEach(function (o) { out.push(mk(base + o, 0, 0)); });
    else if (w.twin) { var px = -Math.sin(base) * 3, py = Math.cos(base) * 3; out.push(mk(base, px, py), mk(base, -px, -py)); }
    else if (w.jitter) out.push(mk(base + (rnd() * 2 - 1) * w.jitter, 0, 0));
    else out.push(mk(base, 0, 0));
    return out;
  }

  /* ===================== 关卡 ===================== */
  function buildStage() {
    var floors = [];
    [[0, 886], [918, 1506], [1538, 2206], [2238, 2650]].forEach(function (a) { floors.push({ x0: a[0], x1: a[1], y: GROUND, kind: 'ground', theme: 'jungle' }); });
    floors.push({ x0: 2650, x1: 4150, y: WATER_Y, kind: 'water' });
    [[4150, 4706], [4738, 5306], [5338, WORLD_W]].forEach(function (a) { floors.push({ x0: a[0], x1: a[1], y: GROUND, kind: 'ground', theme: 'base' }); });
    var plats = [];
    [[300, 420, 185], [500, 600, 140], [700, 840, 185], [1080, 1240, 185], [1260, 1370, 140], [1620, 1740, 185],
      [1780, 1920, 140], [1980, 2080, 185], [2380, 2520, 185]].forEach(function (a) { plats.push({ x0: a[0], x1: a[1], y: a[2], theme: 'jungle' }); });
    [[4280, 4400, 185], [4460, 4560, 140], [4820, 4980, 185], [5040, 5160, 140], [5420, 5540, 185], [5860, 5960, 185]]
      .forEach(function (a) { plats.push({ x0: a[0], x1: a[1], y: a[2], theme: 'base' }); });
    var spans = [], pieces = [];
    [[2700, 2940], [3080, 3380], [3540, 3800], [3900, 4116]].forEach(function (a, k) {
      spans.push({ x0: a[0], x1: a[1], k: k, collapsing: false, timer: 0, next: 0 });
      for (var x = a[0]; x < a[1]; x += 24) pieces.push({ x0: x, x1: Math.min(x + 24, a[1]), y: 200, alive: true, span: k });
    });
    var spawns = [
      { x: 520, t: 'capsule', w: 'S', y: 80 },
      { x: 760, t: 'turret', y: GROUND },
      { x: 1200, t: 'cannon', y: GROUND },
      { x: 1310, t: 'turret', y: 140 },
      { x: 1500, t: 'capsule', w: 'M', y: 70 },
      { x: 1700, t: 'drone', y: 70, minLv: 2 },
      { x: 1850, t: 'sniper', y: 140 },
      { x: 2030, t: 'turret', y: 185 },
      { x: 2200, t: 'drone', y: 80 },
      { x: 2450, t: 'cannon', y: GROUND },
      { x: 2850, t: 'drone', y: 70 },
      { x: 2950, t: 'capsule', w: 'L', y: 70 },
      { x: 3050, t: 'drone', y: 100 },
      { x: 3250, t: 'drone', y: 60, minLv: 1 },
      { x: 3450, t: 'drone', y: 90 },
      { x: 3650, t: 'drone', y: 70, minLv: 2 },
      { x: 3700, t: 'capsule', w: 'S', y: 80 },
      { x: 3850, t: 'drone', y: 100 },
      { x: 4000, t: 'drone', y: 60, minLv: 3 },
      { x: 4350, t: 'turret', y: 185 },
      { x: 4500, t: 'capsule', w: 'R', y: 70 },
      { x: 4650, t: 'cannon', y: GROUND },
      { x: 4800, t: 'drone', y: 70 },
      { x: 4900, t: 'turret', y: GROUND },
      { x: 5100, t: 'sniper', y: 140 },
      { x: 5200, t: 'drone', y: 90, minLv: 1 },
      { x: 5250, t: 'cannon', y: GROUND },
      { x: 5400, t: 'capsule', w: 'S', y: 70 },
      { x: 5480, t: 'turret', y: 185 }
    ];
    var zones = [{ x0: 150, x1: 2600, every: 100 }, { x0: 2700, x1: 4100, every: 170 }, { x0: 4150, x1: 5650, every: 95 }];
    zones.forEach(function (z) { z.timer = 40; });
    return { floors: floors, plats: plats, spans: spans, pieces: pieces, spawns: spawns, zones: zones };
  }

  function newBoss(P) {
    return {
      active: false, coreCool: 150, doorCool: 200,
      core: { x: BOSS_X - 6, y: 158, w: 26, h: 30, hp: P.coreHp, max: P.coreHp, flash: 0, core: true },
      turrets: [
        { x: BOSS_X - 4, y: 96, w: 22, h: 16, hp: P.turretHp, max: P.turretHp, cool: 70, flash: 0 },
        { x: BOSS_X - 4, y: 204, w: 22, h: 18, hp: P.turretHp, max: P.turretHp, cool: 120, flash: 0 }
      ]
    };
  }

  function newGame(lv, o) {
    o = o || {};
    lv = clamp(lv | 0, 0, 3);
    var P = LEVELS[lv], st = buildStage();
    var g = {
      lv: lv, P: P, t: 0, rnd: rng(o.seed || 20261031), demo: !!o.demo, noSpawn: !!o.noSpawn,
      floors: st.floors, plats: st.plats, spans: st.spans, pieces: st.pieces, spawns: st.spawns, zones: st.zones, si: 0,
      cam: { x: 0, shake: 0 }, pb: [], eb: [], enemies: [], pickups: [], parts: [],
      score: 0, lives: P.lives, status: 'play', cleared: false, endT: 0, events: [], uid: 0, lastShotT: -99, prevJump: false,
      boss: newBoss(P)
    };
    g.player = newPlayer(g, 60, GROUND);
    return g;
  }
  function newPlayer(g, x, y) {
    return { x: x, y: y, vx: 0, vy: 0, facing: 1, onGround: true, onThin: false, inWater: false, prone: false, dive: false,
      spin: false, spinA: 0, dropT: 0, invT: 0, cool: 0, flashT: 0, weapon: 'N', shield: g.P.shield, dead: false, deadT: 0,
      anim: 0, aim: { x: 1, y: 0, pose: 'fwd' } };
  }

  /* ===================== 地形 ===================== */
  function landY(g, x, prevY, newY, ignoreThin) {
    var best = null, i, s;
    function cand(s, kind, thin) {
      if (x >= s.x0 && x <= s.x1 && prevY <= s.y + 0.01 && newY >= s.y && (!best || s.y < best.y)) best = { y: s.y, kind: kind, thin: thin };
    }
    for (i = 0; i < g.floors.length; i++) { s = g.floors[i]; cand(s, s.kind, false); }
    if (!ignoreThin) {
      for (i = 0; i < g.plats.length; i++) cand(g.plats[i], 'plat', true);
      for (i = 0; i < g.pieces.length; i++) if (g.pieces[i].alive) cand(g.pieces[i], 'bridge', true);
    }
    return best;
  }
  function surfacesAt(g, x, withWater) {
    var r = [], i, s;
    for (i = 0; i < g.floors.length; i++) { s = g.floors[i]; if (x >= s.x0 && x <= s.x1 && (withWater || s.kind !== 'water')) r.push(s.y); }
    for (i = 0; i < g.plats.length; i++) { s = g.plats[i]; if (x >= s.x0 + 6 && x <= s.x1 - 6) r.push(s.y); }
    for (i = 0; i < g.pieces.length; i++) { s = g.pieces[i]; if (s.alive && x >= s.x0 && x <= s.x1) r.push(s.y); }
    return r;
  }
  // 实心地面的侧墙
  function wallBlock(g, ox, nx, y, hw) {
    for (var i = 0; i < g.floors.length; i++) {
      var f = g.floors[i];
      if (f.kind !== 'ground' || y <= f.y + 2) continue;
      if (nx + hw > f.x0 && nx - hw < f.x1) nx = (ox <= f.x0) ? f.x0 - hw : f.x1 + hw;
    }
    return nx;
  }

  /* ===================== 实体 ===================== */
  function playerBox(p) {
    if (p.dive) return null;
    if (p.prone) return { x: p.x - 10, y: p.y - 9, w: 20, h: 9 };
    if (p.inWater) return { x: p.x - 5, y: p.y - 18, w: 10, h: 12 };
    if (p.spin && !p.onGround) return { x: p.x - 6, y: p.y - 19, w: 12, h: 13 };
    return { x: p.x - 5, y: p.y - 21, w: 10, h: 20 };
  }
  var HP = { grunt: 1, turret: 6, cannon: 8, drone: 2, sniper: 3, capsule: 1 };
  var PTS = { grunt: 100, turret: 500, cannon: 400, drone: 200, sniper: 300, capsule: 50 };
  function addEnemy(g, t, x, y, o) {
    o = o || {};
    var e = { t: t, x: x, y: y, by: y, hp: HP[t], flash: 0, id: ++g.uid, cool: 50 + g.rnd() * 60, vy: 0, dir: -1,
      sp: 1.05 + g.rnd() * 0.3, ang: PI, turn: 0, cyc: 0, fired: false, up: false, ph: g.rnd() * 6, w: o.w || 'S', c: (g.uid % 3), anim: 0, burst: 0 };
    for (var k in o) e[k] = o[k];
    g.enemies.push(e); return e;
  }
  function ebox(e) {
    switch (e.t) {
      case 'grunt': return { x: e.x - 6, y: e.y - 20, w: 12, h: 20 };
      case 'turret': return { x: e.x - 9, y: e.y - 18, w: 18, h: 18 };
      case 'cannon': return { x: e.x - 11, y: e.y - 16, w: 22, h: 16 };
      case 'drone': return { x: e.x - 9, y: e.y - 6, w: 18, h: 12 };
      case 'sniper': return e.up ? { x: e.x - 6, y: e.y - 24, w: 12, h: 14 } : null;
      case 'capsule': return { x: e.x - 9, y: e.y - 6, w: 18, h: 12 };
    }
    return null;
  }
  function sandbag(e) { return e.t === 'sniper' ? { x: e.x - 11, y: e.y - 10, w: 22, h: 10 } : null; }

  function fireE(g, x, y, ang, speed, kind) {
    g.eb.push({ x: x, y: y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: kind === 'orb' ? 4 : 2.5, kind: kind || 'b' });
  }
  function pTarget(p) { return { x: p.x, y: p.prone ? p.y - 4 : (p.inWater ? p.y - 12 : p.y - 12) }; }
  function onScreen(g, x) { return x > g.cam.x + 4 && x < g.cam.x + W - 4; }

  /* —— 粒子 —— */
  function addPart(g, o) { if (g.parts.length < 280) g.parts.push(o); }
  function boom(g, x, y, n, big) {
    var cols = ['#ffd23f', '#ff8a3d', '#ff5d8f', '#ffffff', '#8be9ff'];
    for (var i = 0; i < n; i++) {
      var a = g.rnd() * PI * 2, s = (big ? 1.5 : 0.6) + g.rnd() * (big ? 3 : 2);
      addPart(g, { x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, life: 20 + g.rnd() * 20, max: 40, col: cols[i % cols.length],
        size: (big ? 3 : 2) + g.rnd() * 2, g: 0.08, sq: i % 4 === 0 });
    }
    addPart(g, { x: x, y: y, vx: 0, vy: 0, life: 12, max: 12, ring: big ? 22 : 12, col: '#fff' });
  }
  function floatText(g, x, y, txt) { addPart(g, { x: x, y: y, vx: 0, vy: -0.5, life: 45, max: 45, text: txt, col: '#fff' }); }
  function splash(g, x) {
    for (var i = 0; i < 10; i++) addPart(g, { x: x + (g.rnd() - 0.5) * 10, y: WATER_TOP, vx: (g.rnd() - 0.5) * 2, vy: -1 - g.rnd() * 2.2, life: 25, max: 25, col: '#d8f3ff', size: 2, g: 0.15 });
  }

  /* ===================== 玩家 ===================== */
  function hitPlayer(g) {
    var p = g.player;
    if (g.demo || g.cleared || p.dead || p.invT > 0 || p.dive) return false;
    if (p.shield > 0) {
      p.shield--; p.invT = 70; g.events.push('hit'); boom(g, p.x, p.y - 12, 10, false); return true;
    }
    killPlayer(g); return true;
  }
  function killPlayer(g) {
    var p = g.player;
    if (p.dead) return;
    if (g.demo) { respawn(g); return; }
    p.dead = true; p.deadT = 75; p.vy = -3.2; p.vx = -p.facing * 1.1; p.spin = false; p.prone = false; p.dive = false;
    g.lives--; g.events.push('hit'); boom(g, p.x, p.y - 12, 16, true); g.cam.shake = 5;
  }
  function respawn(g) {
    var p = g.player, keepW = g.P.keepWeapon ? p.weapon : 'N';
    var x = g.cam.x + 50, tries = 0;
    while (!surfacesAt(g, x, true).length && tries++ < 40) x += 8;
    var np = newPlayer(g, Math.min(x, BOSS_X - 30), 30);
    np.onGround = false; np.invT = 150; np.weapon = keepW;
    g.player = np;
  }
  function updatePlayer(g, inp, jp) {
    var p = g.player;
    if (p.dead) {
      p.vy = Math.min(p.vy + GRAV, MAXFALL); p.x += p.vx; p.spinA += 0.3;
      var L0 = p.vy >= 0 ? landY(g, p.x, p.y, p.y + p.vy, true) : null;
      if (L0) { p.y = L0.y; p.vy = 0; p.vx *= 0.8; } else p.y += p.vy;
      if (--p.deadT <= 0) {
        if (g.lives <= 0) { g.status = 'over'; g.events.push('over'); }
        else respawn(g);
      }
      return;
    }
    if (p.invT > 0) p.invT--; if (p.flashT > 0) p.flashT--; if (p.cool > 0) p.cool--; if (p.dropT > 0) p.dropT--;
    var h = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (h) p.facing = h;
    p.prone = p.onGround && !p.inWater && !!inp.down && !h && !inp.up;
    p.dive = p.inWater && p.onGround && !!inp.down;
    p.vx = (p.prone || p.dive) ? 0 : h * RUN * (p.inWater ? 0.7 : 1);
    // 手感辅助：跳跃缓冲（早按一点也算）+ 土狼时间（刚走出边缘还能跳）
    if (jp) p.jbuf = 9; else if (p.jbuf > 0) p.jbuf--;
    if (p.onGround) p.coyote = 9; else if (p.coyote > 0) p.coyote--;
    var canJump = (p.onGround || (p.coyote > 0 && p.vy >= 0 && !p.jumped)) && !p.dive;
    if (p.jbuf > 0 && canJump) {
      p.jbuf = 0;
      if (inp.down && p.onThin && p.onGround) { p.dropT = 12; p.onGround = false; p.onThin = false; p.prone = false; }
      else { p.vy = p.inWater ? -5.4 : JUMP_V; p.onGround = false; p.spin = true; p.prone = false; p.jumped = true; p.coyote = 0; }
    }
    if (p.onGround) p.jumped = false;
    p.vy = Math.min(p.vy + GRAV, MAXFALL);
    // 攀边辅助：差一点没跳上对岸时，脚在地面下 14px 以内就自动爬上去
    for (var li = 0; li < g.floors.length; li++) {
      var lf = g.floors[li], tx = p.x + p.vx;
      if (lf.kind === 'ground' && p.y > lf.y + 2 && p.y <= lf.y + 14 && tx + 5 > lf.x0 && tx - 5 < lf.x1) { p.y = lf.y; p.vy = 0; break; }
    }
    var nx = wallBlock(g, p.x, p.x + p.vx, p.y, 5);
    p.x = clamp(nx, g.cam.x + 6, BOSS_X - 8);
    var ny = p.y + p.vy, wasWater = p.inWater, wasGround = p.onGround;
    var L = p.vy >= 0 ? landY(g, p.x, p.y, ny, p.dropT > 0) : null;
    if (L) {
      p.y = L.y; p.vy = 0; p.onGround = true; p.onThin = L.thin; p.inWater = L.kind === 'water'; p.spin = false;
      if (!wasGround && !p.inWater) for (var i = 0; i < 4; i++) addPart(g, { x: p.x, y: p.y, vx: (i - 1.5) * 0.6, vy: -0.4, life: 14, max: 14, col: '#ffffff', size: 2, g: 0 });
    } else { p.y = ny; p.onGround = false; p.onThin = false; p.inWater = false; }
    if (p.inWater && !wasWater) splash(g, p.x);
    if (p.spin) p.spinA += 0.42 * p.facing; else p.spinA = 0;
    p.anim += Math.abs(p.vx);
    var a = aimVector(!!inp.up, !!inp.down, h, p.facing, p.onGround, p.inWater);
    p.aim = a;
    if (inp.fire && p.cool <= 0 && !p.dive) {
      var w = WEAPONS[p.weapon];
      if (g.pb.length < w.max) {
        var m = MUZ[a.pose], f = (a.x < 0 || (a.x === 0 && p.facing < 0)) ? -1 : 1, mx, my;
        if (p.spin && !p.onGround) { mx = p.x + a.x * 9; my = p.y - 12 + a.y * 9; }
        else { mx = p.x + m[0] * f; my = p.y + m[1] + (p.inWater ? 4 : 0); }
        var bs = weaponBullets(p.weapon, mx, my, a.x, a.y, g.rnd);
        for (var j = 0; j < bs.length; j++) g.pb.push(bs[j]);
        p.cool = w.cd; p.flashT = 3; p.mx = mx; p.my = my;
        if (g.t - g.lastShotT >= 8) { g.events.push('shot'); g.lastShotT = g.t; }
      }
    }
    if (p.y > H + 24) killPlayer(g);
  }

  /* ===================== 敌人 ===================== */
  function killEnemy(g, e, i) {
    g.enemies.splice(i, 1);
    var pts = PTS[e.t] || 100;
    g.score += pts; floatText(g, e.x, e.y - 22, '+' + pts);
    boom(g, e.x, e.y - 8, e.t === 'turret' || e.t === 'cannon' ? 18 : 10, e.t === 'turret' || e.t === 'cannon');
    g.events.push('kill');
    if (e.t === 'capsule') g.pickups.push({ x: e.x, y: e.y, vy: -3, w: e.w, onG: false, bob: 0 });
  }
  function spawnGrunt(g, x) {
    var n = 0; g.enemies.forEach(function (e) { if (e.t === 'grunt') n++; });
    if (n >= 6) return null;
    var ys = surfacesAt(g, x, false);
    if (!ys.length) return null;
    return addEnemy(g, 'grunt', x, ys[Math.floor(g.rnd() * ys.length)]);
  }
  function spawnOne(g, s) {
    if (s.t === 'drone') addEnemy(g, 'drone', g.cam.x + W + 16, s.y || 70, { by: s.y || 70 });
    else if (s.t === 'capsule') addEnemy(g, 'capsule', g.cam.x - 12, s.y || 80, { by: s.y || 80, w: s.w });
    else addEnemy(g, s.t, s.x, s.y);
  }
  function updateEnemies(g) {
    var p = g.player, P = g.P, tg = pTarget(p), bsp = P.bulletSpeed;
    for (var i = g.enemies.length - 1; i >= 0; i--) {
      var e = g.enemies[i]; if (e.flash > 0) e.flash--;
      var vis = onScreen(g, e.x) && !p.dead;
      switch (e.t) {
        case 'grunt': {
          e.vy = Math.min(e.vy + GRAV, MAXFALL);
          var nx = wallBlock(g, e.x, e.x + e.dir * e.sp, e.y, 5);
          if (nx !== e.x + e.dir * e.sp) e.dir = -e.dir;
          e.x = nx; e.anim += e.sp;
          var L = e.vy >= 0 ? landY(g, e.x, e.y, e.y + e.vy, false) : null;
          if (L) {
            if (L.kind === 'water') { splash(g, e.x); g.enemies.splice(i, 1); continue; }
            e.y = L.y; e.vy = 0;
          } else e.y += e.vy;
          if (e.y > H + 20) { g.enemies.splice(i, 1); continue; }
          if (P.gruntShoot && vis && g.rnd() < P.gruntShoot && (p.x - e.x) * e.dir > 0) fireE(g, e.x + e.dir * 8, e.y - 13, e.dir > 0 ? 0 : PI, 2 * bsp, 'flat');
          break;
        }
        case 'turret': {
          var ang = Math.atan2(tg.y - (e.y - 12), tg.x - e.x), target = Math.round(ang / (PI / 6)) * (PI / 6);
          if (--e.turn <= 0) { e.turn = 14; var d = angDiff(e.ang, target); if (Math.abs(d) > 0.01) e.ang += (d > 0 ? 1 : -1) * PI / 6; }
          if (vis) { e.cool -= P.fireMul; if (e.cool <= 0) { e.cool = 110; fireE(g, e.x + Math.cos(e.ang) * 12, e.y - 12 + Math.sin(e.ang) * 12, e.ang, 2.1 * bsp, 'b'); } }
          break;
        }
        case 'cannon': {
          if (vis && p.x < e.x) {
            e.cool -= P.fireMul;
            if (e.cool <= 0) { e.cool = 130; e.burst = g.lv >= 2 ? 1 : 0; fireE(g, e.x - 14, e.y - 14, PI, 2.2 * bsp, 'flat'); e.recoil = 6; }
            else if (e.burst && e.cool <= 116) { e.burst = 0; fireE(g, e.x - 14, e.y - 14, PI, 2.2 * bsp, 'flat'); e.recoil = 6; }
          }
          if (e.recoil > 0) e.recoil--;
          break;
        }
        case 'drone': {
          e.x -= 1.1; e.y = e.by + Math.sin(e.ph + g.t * 0.06) * 18;
          if (vis) { e.cool -= P.fireMul; if (e.cool <= 0) { e.cool = 120; fireE(g, e.x, e.y + 6, Math.atan2(tg.y - e.y, tg.x - e.x), 1.8 * bsp, 'b'); } }
          if (e.x < g.cam.x - 30) { g.enemies.splice(i, 1); continue; }
          break;
        }
        case 'sniper': {
          e.cyc += P.fireMul;
          if (e.cyc >= 150) { e.cyc = 0; e.fired = false; }
          e.up = e.cyc >= 70;
          if (vis && e.cyc >= 105 && !e.fired) { e.fired = true; fireE(g, e.x - 8, e.y - 19, Math.atan2(tg.y - (e.y - 19), tg.x - e.x), 3 * bsp, 'b'); }
          break;
        }
        case 'capsule': {
          e.x += 1.8; e.y = e.by + Math.sin(g.t * 0.08) * 16;
          if (e.x > g.cam.x + W + 30) { g.enemies.splice(i, 1); continue; }
          break;
        }
      }
      if (e.t !== 'capsule' && e.t !== 'drone' && e.x < g.cam.x - 50) { g.enemies.splice(i, 1); continue; }
      if ((e.t === 'grunt' || e.t === 'drone') && rectHit(ebox(e), playerBox(p))) hitPlayer(g);
    }
  }

  /* ===================== 关底 ===================== */
  function damagePart(g, part, dmg) {
    if (part.hp <= 0 || g.cleared) return;
    part.hp -= dmg; part.flash = 4; g.cam.shake = Math.max(g.cam.shake, part.core ? 4 : 3);
    if (part.hp <= 0) {
      part.hp = 0;
      if (!part.core) { g.score += 1000; floatText(g, part.x, part.y, '+1000'); boom(g, part.x + 10, part.y + 8, 22, true); g.events.push('kill'); g.cam.shake = 8; }
    }
  }
  function clearStage(g) {
    g.cleared = true; g.endT = 120;
    var bonus = 5000 + Math.max(0, g.lives) * 1000;
    g.score += bonus; floatText(g, g.boss.core.x, g.boss.core.y - 10, '+' + bonus);
    g.eb.length = 0;
    g.enemies.forEach(function (e) { boom(g, e.x, e.y - 8, 8, false); });
    g.enemies.length = 0;
    g.events.push('kill'); g.cam.shake = 12;
  }
  function updateBoss(g) {
    var B = g.boss, P = g.P, p = g.player, tg = pTarget(p), bsp = P.bulletSpeed;
    if (B.core.flash > 0) B.core.flash--;
    B.turrets.forEach(function (t) { if (t.flash > 0) t.flash--; });
    if (!g.cleared && B.core.hp <= 0) clearStage(g);
    if (g.cleared) {
      if (g.endT % 6 === 0) { boom(g, BOSS_X + g.rnd() * 90, 50 + g.rnd() * 170, 12, true); g.cam.shake = Math.max(g.cam.shake, 4); }
      if (--g.endT <= 0 && g.status === 'play') { g.status = 'won'; g.events.push('win'); }
      return;
    }
    if (!B.active && g.cam.x >= CAM_MAX - 0.5) B.active = true;
    if (!B.active || p.dead) return;
    B.turrets.forEach(function (t) {
      if (t.hp <= 0) return;
      t.cool -= P.fireMul;
      if (t.cool <= 0) { t.cool = 95; var ox = t.x - 4, oy = t.y + t.h / 2; fireE(g, ox, oy, Math.atan2(tg.y - oy, tg.x - ox), 2 * bsp, 'b'); }
    });
    B.coreCool -= P.fireMul;
    if (B.coreCool <= 0) {
      B.coreCool = 170; var cx = B.core.x - 2, cy = B.core.y + 15, a = Math.atan2(tg.y - cy, tg.x - cx);
      [-0.28, 0, 0.28].forEach(function (o) { fireE(g, cx, cy, a + o, 1.5 * bsp, 'orb'); });
    }
    B.doorCool -= P.enemyMul;
    if (B.doorCool <= 0 && !g.noSpawn) { B.doorCool = 240; addEnemy(g, 'grunt', BOSS_X - 6, GROUND); }
  }

  /* ===================== 子弹与碰撞 ===================== */
  function updateBullets(g) {
    var cx = g.cam.x, i, j, b;
    for (i = g.pb.length - 1; i >= 0; i--) {
      b = g.pb[i]; b.x += b.vx; b.y += b.vy; b.life--;
      if (b.life <= 0 || b.x < cx - 40 || b.x > cx + W + 40 || b.y < -40 || b.y > H + 20) { g.pb.splice(i, 1); continue; }
      var pts = [[b.x, b.y]];
      if (b.laser) { var ux = Math.cos(b.a), uy = Math.sin(b.a); pts.push([b.x - ux * b.len / 2, b.y - uy * b.len / 2], [b.x - ux * b.len, b.y - uy * b.len]); }
      var gone = false;
      for (j = g.enemies.length - 1; j >= 0 && !gone; j--) {
        var e = g.enemies[j], bx = ebox(e), sb = sandbag(e);
        if (b.hit && b.hit.indexOf(e.id) >= 0) continue;
        var hitE = false, hitS = false;
        for (var k = 0; k < pts.length; k++) {
          if (bx && circleRect(pts[k][0], pts[k][1], b.r, bx)) hitE = true;
          else if (sb && circleRect(pts[k][0], pts[k][1], b.r, sb)) hitS = true;
        }
        if (hitE) {
          e.hp -= b.dmg; e.flash = 4;
          if (b.pierce) { (b.hit = b.hit || []).push(e.id); } else gone = true;
          if (e.hp <= 0) killEnemy(g, e, j);
          else addPart(g, { x: b.x, y: b.y, vx: 0, vy: 0, life: 6, max: 6, ring: 5, col: '#fff' });
        } else if (hitS) { gone = true; addPart(g, { x: b.x, y: b.y, vx: -1, vy: -1, life: 10, max: 10, col: '#e6c58f', size: 2, g: 0.1 }); }
      }
      if (!gone && g.boss.active && !g.cleared) {
        var parts = [g.boss.core].concat(g.boss.turrets);
        for (j = 0; j < parts.length && !gone; j++) {
          var pt = parts[j];
          if (pt.hp > 0 && (circleRect(b.x, b.y, b.r, pt) || (b.laser && circleRect(pts[1][0], pts[1][1], b.r, pt)))) {
            if (b.hit && b.hit.indexOf('b' + j) >= 0) continue;
            damagePart(g, pt, b.dmg);
            if (b.pierce) (b.hit = b.hit || []).push('b' + j); else gone = true;
            addPart(g, { x: b.x, y: b.y, vx: 0, vy: 0, life: 8, max: 8, ring: 7, col: '#ffe066' });
          }
        }
      }
      if (!gone && b.x > BOSS_X + 8) { gone = true; addPart(g, { x: b.x, y: b.y, vx: -1, vy: 0, life: 8, max: 8, col: '#ffe066', size: 2, g: 0 }); }
      if (gone) g.pb.splice(i, 1);
    }
    var pbx = playerBox(g.player);
    for (i = g.eb.length - 1; i >= 0; i--) {
      b = g.eb[i]; b.x += b.vx; b.y += b.vy;
      if (b.x < cx - 20 || b.x > cx + W + 20 || b.y < -20 || b.y > H + 20) { g.eb.splice(i, 1); continue; }
      if (pbx && !g.player.dead && circleRect(b.x, b.y, b.r, pbx)) { if (hitPlayer(g)) { g.eb.splice(i, 1); pbx = playerBox(g.player); } }
    }
  }
  function updatePickups(g) {
    var p = g.player, pbx = playerBox(p) || { x: p.x - 5, y: p.y - 14, w: 10, h: 12 };
    for (var i = g.pickups.length - 1; i >= 0; i--) {
      var k = g.pickups[i]; k.bob++;
      if (!k.onG) {
        k.vy = Math.min(k.vy + 0.18, 4);
        var L = k.vy >= 0 ? landY(g, k.x, k.y, k.y + k.vy, false) : null;
        if (L) { k.y = L.kind === 'water' ? WATER_TOP : L.y; k.onG = true; k.vy = 0; } else k.y += k.vy;
      }
      if (k.y > H + 20 || k.x < g.cam.x - 30) { g.pickups.splice(i, 1); continue; }
      if (!p.dead && aabb(k.x - 7, k.y - 14, 14, 14, pbx.x, pbx.y, pbx.w, pbx.h)) {
        p.weapon = k.w; g.score += 100; floatText(g, k.x, k.y - 18, WEAPONS[k.w].name + '！');
        g.events.push('pickup'); g.pickups.splice(i, 1);
      }
    }
  }
  function updateBridges(g) {
    var p = g.player;
    g.spans.forEach(function (s) {
      if (!s.collapsing && !p.dead && p.x > s.x0 + 14 && p.x < s.x1) { s.collapsing = true; s.timer = 0; s.next = s.x0; }
      if (!s.collapsing) return;
      if (++s.timer >= 18) {
        s.timer = 0;
        for (var i = 0; i < g.pieces.length; i++) {
          var pc = g.pieces[i];
          if (pc.span === s.k && pc.alive) { pc.alive = false; boom(g, (pc.x0 + pc.x1) / 2, pc.y, 8, false); break; }
        }
      }
    });
  }

  /* ===================== 主循环（固定步长，一帧 1/60 秒） ===================== */
  function update(g, inp) {
    inp = inp || {};
    g.t++;
    var jp = !!inp.jump && !g.prevJump; g.prevJump = !!inp.jump;
    if (g.status === 'play') {
      updatePlayer(g, inp, jp);
      var p = g.player, target = p.x - 170;
      if (target > g.cam.x) g.cam.x = Math.min(target, CAM_MAX);
      if (!g.noSpawn) {
        while (g.si < g.spawns.length && g.cam.x + W + 20 >= g.spawns[g.si].x) {
          var s = g.spawns[g.si++];
          if (!(s.minLv && g.lv < s.minLv)) spawnOne(g, s);
        }
        var edge = g.cam.x + W;
        g.zones.forEach(function (z) {
          if (edge >= z.x0 && edge <= z.x1) { z.timer -= g.P.enemyMul; if (z.timer <= 0) { z.timer = z.every * (0.7 + g.rnd() * 0.6); spawnGrunt(g, edge + 8); } }
        });
      }
      updateBridges(g);
      updateEnemies(g);
      updateBoss(g);
      updateBullets(g);
      updatePickups(g);
    }
    for (var i = g.parts.length - 1; i >= 0; i--) {
      var q = g.parts[i]; q.x += q.vx; q.y += q.vy; if (q.g) q.vy += q.g;
      if (--q.life <= 0) g.parts.splice(i, 1);
    }
    if (g.cam.shake > 0) g.cam.shake = Math.max(0, g.cam.shake - 0.4);
  }
  function zoneName(g) {
    if (g.boss.active || g.cam.x >= CAM_MAX - 40) return '关底';
    var x = g.player.x;
    return x < 2650 ? '丛林' : x < 4150 ? '河桥' : '基地';
  }
  function statusText(g) { return '第 1 关 · ' + zoneName(g) + ' · 命 ×' + Math.max(0, g.lives) + ' · 分数 ' + g.score; }

  /* ===================== 绘制 ===================== */
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    var A = hexRgb(a), B = hexRgb(b), r = [];
    for (var i = 0; i < 3; i++) r.push(Math.round(A[i] + (B[i] - A[i]) * t));
    return 'rgb(' + r.join(',') + ')';
  }
  function sm(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function circle(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, PI * 2); ctx.fill(); }

  function drawBG(ctx, g) {
    var cx = g.cam.x, kr = sm((cx - 2300) / 300), kb = sm((cx - 3850) / 300), i, x;
    var top = kb > 0 ? mix('#7cc8ff', '#ffb38a', kb) : mix('#8fdcff', '#7cc8ff', kr);
    var bot = kb > 0 ? mix('#e6f8ff', '#fff0cf', kb) : mix('#effff0', '#e6f8ff', kr);
    var gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    circle(ctx, 400 - cx * 0.02, 46, 20, kb > 0.5 ? 'rgba(255,240,180,.9)' : 'rgba(255,248,200,.95)');
    // 云
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (i = Math.floor(cx * 0.1 / 170) - 1; i < Math.floor(cx * 0.1 / 170) + 5; i++) {
      x = i * 170 - cx * 0.1 + hash(i) * 60; var y = 26 + hash(i + 9) * 40;
      ctx.beginPath(); ctx.arc(x, y, 12, 0, PI * 2); ctx.arc(x + 14, y - 5, 14, 0, PI * 2); ctx.arc(x + 30, y, 11, 0, PI * 2); ctx.fill();
    }
    // 远山
    ctx.fillStyle = kb > 0 ? mix('#a9dcc0', '#d9b7e8', kb) : mix('#b6e8c4', '#a9dcc0', kr);
    var f = 0.25;
    for (i = Math.floor(cx * f / 120) - 1; i < Math.floor(cx * f / 120) + 6; i++) {
      x = i * 120 - cx * f; var hh = 50 + hash(i + 3) * 50;
      ctx.beginPath(); ctx.moveTo(x - 40, 200); ctx.quadraticCurveTo(x + 40, 200 - hh * 2, x + 120, 200); ctx.fill();
    }
    ctx.fillRect(0, 199, W, 80);
    // 中景：丛林树木 → 基地厂房
    f = 0.5;
    if (kb < 1) {
      ctx.globalAlpha = 1 - kb;
      for (i = Math.floor(cx * f / 70) - 1; i < Math.floor(cx * f / 70) + 9; i++) {
        x = i * 70 - cx * f + hash(i) * 30; var th = 60 + hash(i + 5) * 40;
        ctx.fillStyle = '#8a6a4a'; ctx.fillRect(x - 3, 215 - th, 6, th + 20);
        var lc = i % 2 ? '#58c46a' : '#4cb562';
        circle(ctx, x, 215 - th, 18, lc); circle(ctx, x - 14, 222 - th, 12, lc); circle(ctx, x + 14, 222 - th, 12, lc);
      }
      ctx.globalAlpha = 1;
    }
    if (kb > 0) {
      ctx.globalAlpha = kb;
      for (i = Math.floor(cx * f / 90) - 1; i < Math.floor(cx * f / 90) + 8; i++) {
        x = i * 90 - cx * f; var bh = 50 + hash(i + 7) * 60;
        ctx.fillStyle = i % 2 ? '#b8a3d9' : '#a893cf'; ctx.fillRect(x, 215 - bh, 70, bh + 20);
        ctx.fillStyle = '#ffe9a8';
        for (var wy = 225 - bh; wy < 200; wy += 16) for (var wx = x + 8; wx < x + 62; wx += 18) ctx.fillRect(wx, wy, 8, 6);
        ctx.fillStyle = '#9580c0'; ctx.fillRect(x + 50, 200 - bh, 8, 20);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawTerrain(ctx, g) {
    var cx = g.cam.x, i, s, x;
    for (i = 0; i < g.floors.length; i++) {
      s = g.floors[i]; if (s.x1 < cx || s.x0 > cx + W) continue;
      var x0 = Math.max(s.x0, cx - 2) - cx, x1 = Math.min(s.x1, cx + W + 2) - cx;
      if (s.kind === 'water') {
        ctx.fillStyle = '#4fb6f5'; ctx.fillRect(x0, WATER_TOP, x1 - x0, H - WATER_TOP);
        continue;
      }
      if (s.theme === 'jungle') {
        ctx.fillStyle = '#b8743f'; ctx.fillRect(x0, s.y + 5, x1 - x0, H - s.y);
        ctx.fillStyle = '#9a5f31';
        for (x = Math.ceil(Math.max(s.x0, cx) / 26) * 26; x < Math.min(s.x1, cx + W); x += 26) ctx.fillRect(x - cx + hash(x) * 10, s.y + 16 + hash(x + 1) * 20, 5, 4);
        ctx.fillStyle = '#5ccf5c'; ctx.fillRect(x0, s.y, x1 - x0, 7);
        for (x = Math.ceil(Math.max(s.x0, cx) / 10) * 10; x <= Math.min(s.x1, cx + W); x += 10) circle(ctx, x - cx, s.y + 7, 4, '#5ccf5c');
        ctx.fillStyle = '#86e07a'; ctx.fillRect(x0, s.y, x1 - x0, 2);
      } else {
        ctx.fillStyle = '#7d8bb5'; ctx.fillRect(x0, s.y, x1 - x0, H - s.y);
        ctx.fillStyle = '#6a77a1';
        for (x = Math.ceil(Math.max(s.x0, cx) / 32) * 32; x < Math.min(s.x1, cx + W); x += 32) ctx.fillRect(x - cx, s.y + 6, 2, H);
        ctx.fillStyle = '#d4dcf2'; ctx.fillRect(x0, s.y, x1 - x0, 5);
        ctx.fillStyle = '#ffc53d';
        for (x = Math.ceil(Math.max(s.x0, cx) / 16) * 16; x < Math.min(s.x1, cx + W); x += 16) ctx.fillRect(x - cx, s.y + 5, 8, 3);
      }
    }
    for (i = 0; i < g.plats.length; i++) {
      s = g.plats[i]; if (s.x1 < cx || s.x0 > cx + W) continue;
      x = s.x0 - cx; var w = s.x1 - s.x0;
      if (s.theme === 'jungle') {
        rr(ctx, x, s.y, w, 7, 3); ctx.fillStyle = '#c98a4b'; ctx.fill();
        ctx.fillStyle = '#a36a34'; for (var k = 8; k < w; k += 18) ctx.fillRect(x + k, s.y + 2, 6, 2);
        ctx.fillStyle = '#5ccf5c'; ctx.fillRect(x, s.y - 1, w, 3);
        circle(ctx, x + 4, s.y + 1, 4, '#5ccf5c'); circle(ctx, x + w - 4, s.y + 1, 4, '#5ccf5c');
      } else {
        ctx.fillStyle = '#9aa7cf'; ctx.fillRect(x, s.y, w, 6);
        ctx.strokeStyle = '#6f7ca6'; ctx.lineWidth = 1; ctx.beginPath();
        for (k = 0; k < w; k += 12) { ctx.moveTo(x + k, s.y + 6); ctx.lineTo(x + k + 6, s.y); ctx.lineTo(x + k + 12, s.y + 6); }
        ctx.stroke(); ctx.fillStyle = '#e1e7fa'; ctx.fillRect(x, s.y, w, 2);
      }
    }
    // 桥
    g.spans.forEach(function (sp) {
      if (sp.x1 < cx || sp.x0 > cx + W) return;
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(sp.x0 - cx - 4, 196, 4, 48); ctx.fillRect(sp.x1 - cx, 196, 4, 48);
    });
    for (i = 0; i < g.pieces.length; i++) {
      s = g.pieces[i]; if (!s.alive || s.x1 < cx || s.x0 > cx + W) continue;
      x = s.x0 - cx;
      ctx.fillStyle = '#e0a868'; ctx.fillRect(x, s.y, s.x1 - s.x0 - 1, 6);
      ctx.fillStyle = '#b07a3e'; ctx.fillRect(x + 5, s.y + 1, 1, 4); ctx.fillRect(x + 13, s.y + 1, 1, 4);
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, s.y - 8); ctx.quadraticCurveTo(x + 12, s.y - 4, x + 24, s.y - 8); ctx.stroke();
    }
  }
  function drawWaterFront(ctx, g) {
    var f = g.floors[4], cx = g.cam.x;
    if (f.x1 < cx || f.x0 > cx + W) return;
    var x0 = Math.max(f.x0, cx) - cx, x1 = Math.min(f.x1, cx + W) - cx;
    ctx.fillStyle = 'rgba(70,170,240,.62)'; ctx.fillRect(x0, WATER_TOP + 3, x1 - x0, H);
    ctx.strokeStyle = '#d8f3ff'; ctx.lineWidth = 2; ctx.beginPath();
    for (var x = x0; x <= x1; x += 4) { var y = WATER_TOP + 3 + Math.sin((x + cx) * 0.08 + g.t * 0.08) * 1.5; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }

  function drawHero(ctx, p, sx, t) {
    var sy = p.y, f = p.facing;
    ctx.save();
    if (p.invT > 0 && !p.dead && (t >> 2) % 2) ctx.globalAlpha = 0.45;
    ctx.translate(sx, sy);
    if (p.dive) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, -5, 9 + Math.sin(t * 0.2) * 2, 2.5, 0, 0, PI * 2); ctx.stroke();
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(-f * 4, -9, 3, 4);
      ctx.restore(); return;
    }
    var spin = (p.spin && !p.onGround) || p.dead;
    if (spin) {
      ctx.translate(0, -12); ctx.rotate(p.spinA);
      circle(ctx, 0, 0, 9, '#fffdf7'); ctx.strokeStyle = '#e7d7c0'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(-9, -3, 18, 4);
      circle(ctx, 4, -1, 1.3, '#2b2340');
      if (p.dead) { ctx.strokeStyle = '#2b2340'; ctx.beginPath(); ctx.moveTo(1, -3); ctx.lineTo(5, 1); ctx.moveTo(5, -3); ctx.lineTo(1, 1); ctx.stroke(); }
      ctx.restore(); return;
    }
    var a = p.aim, prone = p.prone, by = prone ? -6 : -11, rx = prone ? 12 : 9, ry = prone ? 6 : 10;
    var bob = p.onGround && Math.abs(p.vx) > 0 ? Math.abs(Math.sin(p.anim * 0.25)) * 1.2 : 0;
    // 脚
    if (!prone) {
      var st = Math.sin(p.anim * 0.25) * 3;
      ell(ctx, -3 + st, -1, 3, 2, '#f1e3cc'); ell(ctx, 3 - st, -1, 3, 2, '#f1e3cc');
    }
    ctx.translate(0, -bob);
    // 头巾飘带
    var wv = Math.sin(t * 0.3) * 2;
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath(); ctx.moveTo(-f * (rx - 2), by - 4); ctx.lineTo(-f * (rx + 8), by - 6 + wv); ctx.lineTo(-f * (rx + 7), by - 1 + wv); ctx.closePath(); ctx.fill();
    // 身体（团子）
    ell(ctx, 0, by, rx, ry, '#fffdf7'); ctx.strokeStyle = '#e7d7c0'; ctx.lineWidth = 1; ctx.stroke();
    // 褶子
    ctx.strokeStyle = '#efe2cd'; ctx.beginPath();
    ctx.moveTo(-3, by - ry + 1); ctx.quadraticCurveTo(0, by - ry + 4, 3, by - ry + 1);
    ctx.moveTo(-5, by - ry + 3); ctx.quadraticCurveTo(-2, by - ry + 5, 0, by - ry + 3); ctx.stroke();
    // 头巾
    ctx.fillStyle = '#ff8a3d'; ctx.fillRect(-rx + 1, by - (prone ? 3 : 5), rx * 2 - 2, 3);
    // 眼睛和腮红
    var ex = f * (prone ? 5 : 3), ey = by + (prone ? 0 : -1);
    circle(ctx, ex, ey, 1.4, '#2b2340'); circle(ctx, ex + f * 4, ey, 1.4, '#2b2340');
    circle(ctx, ex + f * 6.5, ey + 2.5, 1.3, '#ffb3b3'); circle(ctx, ex - f * 1.5, ey + 2.5, 1.3, '#ffb3b3');
    // 枪
    ctx.save();
    var sx0 = prone ? f * 6 : f * 3, sy0 = prone ? -5 : -10;
    if (a.pose === 'up') sx0 = f * 2;
    ctx.translate(sx0, sy0); ctx.rotate(Math.atan2(a.y, a.x === 0 ? 0.0001 * f : a.x));
    ctx.fillStyle = '#4b4b63'; rr(ctx, 0, -1.5, 11, 3, 1); ctx.fill();
    ctx.fillStyle = '#ff8a3d'; ctx.fillRect(9, -1.5, 2, 3);
    circle(ctx, 1, 0, 2, '#fffdf7');
    ctx.restore();
    if (p.shield > 0) { ctx.strokeStyle = 'rgba(80,200,255,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, by, rx + 5, 0, PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  function drawEnemy(ctx, g, e) {
    var x = e.x - g.cam.x, y = e.y, t = g.t, fl = e.flash > 0;
    ctx.save(); ctx.translate(x, y);
    switch (e.t) {
      case 'grunt': {
        var body = fl ? '#fff' : ['#ff6b6b', '#a78bfa', '#2dd4bf'][e.c], legs = Math.sin(e.anim * 0.3) * 3;
        ctx.strokeStyle = '#3f3a55'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(-3, -8); ctx.lineTo(-3 + legs, 0); ctx.moveTo(3, -8); ctx.lineTo(3 - legs, 0); ctx.stroke();
        rr(ctx, -7, -20, 14, 13, 4); ctx.fillStyle = body; ctx.fill();
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(Math.sin(t * 0.2) * 2, -26); ctx.stroke();
        circle(ctx, Math.sin(t * 0.2) * 2, -26, 2, '#ffc53d');
        circle(ctx, e.dir * 2, -14, 4, '#fff'); circle(ctx, e.dir * 3.5, -14, 1.8, '#2b2340');
        ctx.fillStyle = '#3f3a55'; ctx.fillRect(-4, -10, 8, 1.5);
        break;
      }
      case 'turret': {
        ctx.save(); ctx.translate(0, -12); ctx.rotate(e.ang);
        ctx.fillStyle = fl ? '#fff' : '#4b4b63'; ctx.fillRect(0, -2.5, 14, 5); ctx.fillStyle = '#ff5d8f'; ctx.fillRect(12, -2.5, 2, 5);
        ctx.restore();
        ctx.beginPath(); ctx.arc(0, -6, 10, PI, 0); ctx.closePath(); ctx.fillStyle = fl ? '#fff' : '#6c8cff'; ctx.fill();
        ctx.fillStyle = '#4f6ad8'; ctx.fillRect(-11, -6, 22, 6);
        circle(ctx, 0, -10, 2.5, (t >> 4) % 2 ? '#ffe066' : '#ff5d8f');
        break;
      }
      case 'cannon': {
        var rc = e.recoil || 0;
        ctx.fillStyle = '#3f3a55'; ctx.fillRect(-16 + rc * 0.5, -17, 10, 6);
        rr(ctx, -11, -18, 22, 18, 3); ctx.fillStyle = fl ? '#fff' : '#ffb347'; ctx.fill();
        ctx.fillStyle = '#2b2340';
        for (var k = -9; k < 10; k += 6) ctx.fillRect(k, -4, 3, 3);
        circle(ctx, 3, -11, 3.5, '#fff'); circle(ctx, 2, -11, 1.6, '#2b2340');
        break;
      }
      case 'drone': {
        var pr = Math.abs(Math.sin(t * 0.6)) * 10 + 2;
        ctx.strokeStyle = '#3f3a55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -9); ctx.stroke();
        ctx.fillStyle = '#dfe7ff'; ctx.fillRect(-pr, -10, pr * 2, 2);
        ell(ctx, 0, 0, 10, 6, fl ? '#fff' : '#ffd23f');
        circle(ctx, -3, 0, 3.5, '#fff'); circle(ctx, -4, 0.5, 1.6, '#2b2340');
        ctx.fillStyle = '#ff8a3d'; ctx.fillRect(4, -1, 5, 2);
        break;
      }
      case 'sniper': {
        if (e.up) {
          rr(ctx, -6, -24, 12, 14, 4); ctx.fillStyle = fl ? '#fff' : '#3ecf8e'; ctx.fill();
          ctx.fillStyle = '#2f8f62'; ctx.fillRect(-7, -25, 14, 4);
          circle(ctx, -2, -17, 3, '#fff'); circle(ctx, -3, -17, 1.4, '#2b2340');
          ctx.fillStyle = '#4b4b63'; ctx.fillRect(-16, -19, 12, 2);
          if (e.cyc > 90 && e.cyc < 105 && (t >> 2) % 2) circle(ctx, -17, -18, 2, '#ff5d8f');
        } else {
          ctx.fillStyle = '#2f8f62'; ctx.fillRect(-6, -13, 12, 4);
        }
        ell(ctx, -6, -4, 6, 4.5, '#e6c58f'); ell(ctx, 6, -4, 6, 4.5, '#d9b57a'); ell(ctx, 0, -8, 6, 4, '#ecd09e');
        break;
      }
      case 'capsule': {
        var fw = Math.sin(t * 0.5) * 4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-14, -6 - fw); ctx.lineTo(-10, 1); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(14, -6 - fw); ctx.lineTo(10, 1); ctx.closePath(); ctx.fill();
        ell(ctx, 0, 0, 10, 7, fl ? '#fff' : WCOL[e.w]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(WEAPONS[e.w].icon, 0, 0.5);
        break;
      }
    }
    ctx.restore();
  }
  function drawBoss(ctx, g) {
    var B = g.boss, x = BOSS_X - g.cam.x, t = g.t;
    if (x > W + 10) return;
    ctx.fillStyle = '#6d7bb0'; ctx.fillRect(x, 40, WORLD_W - BOSS_X, GROUND - 40);
    ctx.fillStyle = '#5a6799';
    for (var yy = 52; yy < GROUND; yy += 26) ctx.fillRect(x, yy, WORLD_W - BOSS_X, 2);
    ctx.fillStyle = '#d4dcf2';
    for (var k = 0; k < 6; k++) ctx.fillRect(x + k * 16, 30, 10, 12);
    ctx.fillStyle = '#ffc53d'; ctx.fillRect(x, GROUND - 10, WORLD_W - BOSS_X, 10);
    ctx.fillStyle = '#2b2340';
    for (k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(x + k * 14, GROUND); ctx.lineTo(x + k * 14 + 7, GROUND - 10); ctx.lineTo(x + k * 14 + 12, GROUND - 10); ctx.lineTo(x + k * 14 + 5, GROUND); ctx.fill(); }
    // 门
    rr(ctx, x + 40, GROUND - 40, 26, 30, 4); ctx.fillStyle = '#4c5788'; ctx.fill();
    // 炮台
    B.turrets.forEach(function (tu) {
      var tx = tu.x - g.cam.x;
      if (tu.hp <= 0) { ctx.fillStyle = '#3f3a55'; ctx.fillRect(tx, tu.y + 4, tu.w, tu.h - 4); circle(ctx, tx + 6, tu.y + 4, 3, 'rgba(120,120,140,.7)'); return; }
      rr(ctx, tx, tu.y, tu.w, tu.h, 4); ctx.fillStyle = tu.flash ? '#fff' : '#ff8a3d'; ctx.fill();
      ctx.fillStyle = '#4b4b63'; ctx.fillRect(tx - 10, tu.y + tu.h / 2 - 2.5, 12, 5);
      circle(ctx, tx + 13, tu.y + tu.h / 2, 3.5, '#fff'); circle(ctx, tx + 12, tu.y + tu.h / 2, 1.6, '#2b2340');
    });
    // 核心（弱点，闪光）
    var c = B.core, cxp = c.x - g.cam.x;
    if (c.hp > 0) {
      var pulse = (Math.sin(t * 0.2) + 1) / 2;
      circle(ctx, cxp + c.w / 2, c.y + c.h / 2, 18 + pulse * 4, 'rgba(255,93,143,' + (0.18 + pulse * 0.22) + ')');
      rr(ctx, cxp, c.y, c.w, c.h, 8); ctx.fillStyle = c.flash ? '#ffffff' : ((t >> 3) % 2 ? '#ff5d8f' : '#ffc53d'); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      circle(ctx, cxp + c.w / 2, c.y + c.h / 2, 6, '#fff'); circle(ctx, cxp + c.w / 2 - 2, c.y + c.h / 2, 3, '#2b2340');
    } else {
      rr(ctx, cxp, c.y, c.w, c.h, 8); ctx.fillStyle = '#3f3a55'; ctx.fill();
    }
  }
  function drawBullets(ctx, g) {
    var cx = g.cam.x, i, b;
    for (i = 0; i < g.pb.length; i++) {
      b = g.pb[i]; var col = WEAPONS[b.wid].col;
      if (b.laser) {
        var ux = Math.cos(b.a), uy = Math.sin(b.a);
        ctx.strokeStyle = 'rgba(94,242,255,.45)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.x - cx, b.y); ctx.lineTo(b.x - cx - ux * b.len, b.y - uy * b.len); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineCap = 'butt';
      } else {
        circle(ctx, b.x - cx, b.y, b.r + 1.5, col); circle(ctx, b.x - cx, b.y, b.r * 0.6, '#fff');
      }
    }
    for (i = 0; i < g.eb.length; i++) {
      b = g.eb[i];
      if (b.kind === 'orb') { circle(ctx, b.x - cx, b.y, b.r + 2, 'rgba(139,92,246,.5)'); circle(ctx, b.x - cx, b.y, b.r, '#c084fc'); circle(ctx, b.x - cx, b.y, 1.5, '#fff'); }
      else { circle(ctx, b.x - cx, b.y, b.r + 1, '#ff3d71'); circle(ctx, b.x - cx, b.y, 1.2, '#fff'); }
    }
  }
  function drawPickups(ctx, g) {
    g.pickups.forEach(function (k) {
      var x = k.x - g.cam.x, y = k.y - 8 + (k.onG ? Math.sin(k.bob * 0.15) * 1.5 : 0);
      circle(ctx, x, y, 9, 'rgba(255,255,255,.6)'); circle(ctx, x, y, 7, WCOL[k.w]);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(WEAPONS[k.w].icon, x, y + 0.5);
    });
  }
  function drawParts(ctx, g) {
    var cx = g.cam.x;
    g.parts.forEach(function (q) {
      var a = clamp(q.life / q.max, 0, 1);
      ctx.globalAlpha = a;
      if (q.text) { ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = '#2b2340'; ctx.strokeText(q.text, q.x - cx, q.y); ctx.fillStyle = '#fff'; ctx.fillText(q.text, q.x - cx, q.y); }
      else if (q.ring) { ctx.strokeStyle = q.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x - cx, q.y, q.ring * (1 - a) + 2, 0, PI * 2); ctx.stroke(); }
      else if (q.sq) { ctx.fillStyle = q.col; ctx.fillRect(q.x - cx - q.size / 2, q.y - q.size / 2, q.size, q.size); }
      else circle(ctx, q.x - cx, q.y, q.size * (0.5 + a * 0.5), q.col);
    });
    ctx.globalAlpha = 1;
  }
  function drawMuzzle(ctx, g) {
    var p = g.player; if (!(p.flashT > 0) || p.dead || p.mx == null) return;
    var x = p.mx - g.cam.x, y = p.my;
    circle(ctx, x, y, 5 + p.flashT, 'rgba(255,230,120,.7)'); circle(ctx, x, y, 3, '#fff');
  }
  function drawHUD(ctx, g) {
    var p = g.player, i, n = Math.max(0, g.lives);
    for (i = 0; i < Math.min(n, 5); i++) {
      var x = 12 + i * 13;
      ell(ctx, x, 13, 5, 5, '#fffdf7'); ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(x - 5, 10, 10, 2);
    }
    ctx.font = 'bold 9px sans-serif'; ctx.textBaseline = 'middle';
    if (n > 5) { ctx.textAlign = 'left'; ctx.fillStyle = '#2b2340'; ctx.fillText('×' + n, 76, 13); }
    var wx = 12, wy = 30;
    circle(ctx, wx, wy, 7, WCOL[p.weapon]); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(WEAPONS[p.weapon].icon, wx, wy + 0.5);
    if (p.shield > 0) { ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(wx + 18, wy, 6, 0, PI * 2); ctx.stroke(); ctx.fillStyle = '#3b82f6'; ctx.fillText('盾', wx + 18, wy + 0.5); }
    ctx.textAlign = 'right'; ctx.font = 'bold 11px sans-serif';
    var sc = '分数 ' + ('000000' + g.score).slice(-6);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(sc, W - 10, 14); ctx.fillStyle = '#2b2340'; ctx.fillText(sc, W - 10, 14);
    if (g.boss.active && !g.cleared) {
      var c = g.boss.core, bw = 140, bx = (W - bw) / 2;
      ctx.fillStyle = 'rgba(43,35,64,.55)'; rr(ctx, bx - 2, 8, bw + 4, 9, 4); ctx.fill();
      ctx.fillStyle = '#ff5d8f'; rr(ctx, bx, 10, Math.max(0, bw * c.hp / c.max), 5, 2); ctx.fill();
      ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('大炮墙 · 核心', W / 2, 24);
    }
    if (g.cleared || g.status === 'won') banner(ctx, '关卡完成！', '#ffc53d');
    else if (g.status === 'over') banner(ctx, '再接再厉！', '#ff5d8f');
  }
  function banner(ctx, txt, col) {
    ctx.fillStyle = 'rgba(43,35,64,.45)'; ctx.fillRect(0, 110, W, 46);
    ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = '#2b2340'; ctx.strokeText(txt, W / 2, 134); ctx.fillStyle = col; ctx.fillText(txt, W / 2, 134);
  }
  function render(ctx, g) {
    ctx.save();
    if (g.cam.shake > 0) ctx.translate((Math.random() - 0.5) * g.cam.shake * 1.4, (Math.random() - 0.5) * g.cam.shake * 1.4);
    drawBG(ctx, g);
    drawTerrain(ctx, g);
    drawBoss(ctx, g);
    drawPickups(ctx, g);
    for (var i = 0; i < g.enemies.length; i++) drawEnemy(ctx, g, g.enemies[i]);
    if (g.status !== 'over') drawHero(ctx, g.player, g.player.x - g.cam.x, g.t);
    drawWaterFront(ctx, g);
    drawBullets(ctx, g);
    drawMuzzle(ctx, g);
    drawParts(ctx, g);
    ctx.restore();
    drawHUD(ctx, g);
  }

  /* ===================== DOM ===================== */
  var CSS = [
    '.blaster-root{position:relative;width:100%;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}',
    '.blaster-screen{position:relative;width:100%;aspect-ratio:16/9;border-radius:var(--radius,18px);overflow:hidden;background:#bfe9ff;box-shadow:0 4px 0 var(--line,#e9dcc8);touch-action:none}',
    '@supports not (aspect-ratio:16/9){.blaster-screen{height:0;padding-top:56.25%}.blaster-canvas{position:absolute;left:0;top:0}}',
    '.blaster-canvas{display:block;width:100%;height:100%;touch-action:none}',
    '.blaster-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px;background:rgba(43,35,64,.62);color:#fff;text-align:center;font-weight:700;font-size:14px;line-height:1.5;opacity:0;pointer-events:none;transition:opacity .2s}',
    '.blaster-overlay.blaster-on{opacity:1;pointer-events:auto}',
    '.blaster-overlay b{font-size:17px;color:var(--yellow,#ffc53d)}',
    '.blaster-overlay small{font-weight:600;opacity:.9;font-size:12px}',
    '.blaster-tip{background:rgba(255,197,61,.95);color:var(--ink,#2b2340);border-radius:12px;padding:4px 10px;font-size:13px}',
    '.blaster-pad{display:none;justify-content:space-between;align-items:center;padding:14px 4px 4px;touch-action:none}',
    '.blaster-root.blaster-touch .blaster-pad{display:flex}',
    '@media (hover:none) and (pointer:coarse){.blaster-pad{display:flex}.blaster-keys{display:none}}',
    '.blaster-stick{position:relative;flex:none;width:132px;height:132px;border-radius:50%;background:radial-gradient(circle,#fff 0,#fff 45%,#f3e6d2 46%);box-shadow:inset 0 0 0 3px var(--line,#e9dcc8),0 3px 0 var(--line,#e9dcc8);touch-action:none}',
    '.blaster-stick:before{content:"";position:absolute;inset:10px;border-radius:50%;border:2px dashed rgba(122,111,134,.25)}',
    '.blaster-knob{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:var(--orange,#ff8a3d);box-shadow:0 3px 0 rgba(0,0,0,.15),inset 0 -4px 0 rgba(0,0,0,.12);pointer-events:none;transition:transform .05s}',
    '.blaster-btns{display:flex;gap:14px;align-items:flex-end}',
    '.blaster-btn{flex:none;width:76px;height:76px;border-radius:50%;border:none;font:inherit;font-size:22px;font-weight:800;color:#fff;box-shadow:0 4px 0 rgba(0,0,0,.18),inset 0 -5px 0 rgba(0,0,0,.12);touch-action:none;-webkit-user-select:none;user-select:none}',
    '.blaster-jump{background:var(--blue,#3b82f6);margin-bottom:30px}',
    '.blaster-fire{background:var(--red,#e5484d);width:84px;height:84px}',
    '.blaster-btn.blaster-down{transform:translateY(3px) scale(.95);filter:brightness(1.12)}',
    '.blaster-rotate{display:none;text-align:center;font-size:12px;color:var(--muted,#7a6f86);margin-top:6px}',
    '@media (hover:none) and (pointer:coarse) and (orientation:portrait){.blaster-rotate{display:block}}',
    '.blaster-keys{text-align:center;font-size:12px;color:var(--muted,#7a6f86);margin-top:8px}',
    '@media (hover:none) and (pointer:coarse) and (orientation:landscape) and (max-height:500px){',
    '.blaster-pad{position:fixed;left:0;right:0;bottom:0;padding:0 max(12px,env(safe-area-inset-right)) 12px max(12px,env(safe-area-inset-left));pointer-events:none;z-index:40}',
    '.blaster-pad>*{pointer-events:auto;opacity:.82}.blaster-stick{width:112px;height:112px}.blaster-btn{width:62px;height:62px;font-size:18px}.blaster-fire{width:70px;height:70px}.blaster-jump{margin-bottom:22px}}'
  ].join('\n');
  function injectCSS() {
    if (document.querySelector('style[data-blaster]')) return;
    var s = document.createElement('style'); s.setAttribute('data-blaster', '1'); s.textContent = CSS; document.head.appendChild(s);
  }
  function mk(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // 画布：按容器宽度与 devicePixelRatio 设置清晰的后备尺寸
  function makeScreen(el) {
    injectCSS();
    var rootEl = mk('div', 'blaster-root'), screen = mk('div', 'blaster-screen'), cv = mk('canvas', 'blaster-canvas'), ov = mk('div', 'blaster-overlay');
    screen.appendChild(cv); screen.appendChild(ov); rootEl.appendChild(screen); el.appendChild(rootEl);
    var ctx = cv.getContext('2d');
    function fit() {
      var r = screen.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
      var cw = Math.max(1, Math.round((r.width || 480) * dpr)), ch = Math.max(1, Math.round((r.width || 480) * 9 / 16 * dpr));
      if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
      ctx.setTransform(cw / W, 0, 0, ch / H, 0, 0);
    }
    fit();
    var ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(fit); ro.observe(screen); }
    window.addEventListener('resize', fit);
    return {
      root: rootEl, screen: screen, canvas: cv, ctx: ctx, overlay: ov, fit: fit,
      draw: function (g) { ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); render(ctx, g); },
      destroy: function () { if (ro) ro.disconnect(); window.removeEventListener('resize', fit); if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl); }
    };
  }
  function blockTouch(node) {
    var pv = function (e) { if (e.cancelable) e.preventDefault(); };
    ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'dblclick', 'contextmenu'].forEach(function (n) { node.addEventListener(n, pv, { passive: false }); });
  }

  // 固定步长循环
  function makeLoop(step, draw) {
    var raf = 0, last = 0, acc = 0, on = true;
    var rq = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
    var cq = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : clearTimeout;
    function frame(ts) {
      if (!on) return;
      if (!last) last = ts;
      acc += Math.min(250, Math.max(0, ts - last)); last = ts;
      var n = 0;
      while (acc >= STEP && n < 5) { step(); acc -= STEP; n++; }
      if (n === 5) acc = 0;
      draw();
      raf = rq(frame);
    }
    raf = rq(frame);
    return { stop: function () { on = false; cq(raf); }, reset: function () { last = 0; acc = 0; } };
  }

  /* ===================== mount ===================== */
  function mount(el, opts) {
    opts = opts || {};
    var noop = function () {};
    var onStatus = opts.onStatus || noop, onEnd = opts.onEnd || noop, sound = opts.sound || noop;
    var level = clamp(opts.level | 0, 0, 3);
    var S = makeScreen(el), g = newGame(level, { seed: (Date.now() & 0xffff) + 1 });
    var keys = {}, touch = { left: false, right: false, up: false, down: false, fire: false, jump: false };
    var paused = false, ended = false, lastStatus = '', hintTimer = 0, alive = true;

    var keysTip = mk('div', 'blaster-keys', '键盘：←→↑↓ / WASD 移动瞄准 · J 或 Z 射击（按住连发）· K 或 X 跳 · P 暂停');
    var rotate = mk('div', 'blaster-rotate', '📱 横过来玩更爽');
    var pad = mk('div', 'blaster-pad');
    var stick = mk('div', 'blaster-stick'), knob = mk('div', 'blaster-knob'); stick.appendChild(knob);
    var btns = mk('div', 'blaster-btns'), bJump = mk('button', 'blaster-btn blaster-jump', '跳'), bFire = mk('button', 'blaster-btn blaster-fire', '射');
    bJump.type = bFire.type = 'button'; bJump.setAttribute('aria-label', '跳'); bFire.setAttribute('aria-label', '射击');
    btns.appendChild(bJump); btns.appendChild(bFire); pad.appendChild(stick); pad.appendChild(btns);
    S.root.appendChild(pad); S.root.appendChild(rotate); S.root.appendChild(keysTip);
    blockTouch(pad); blockTouch(S.screen);

    function input() {
      return {
        left: !!(keys.left || touch.left), right: !!(keys.right || touch.right), up: !!(keys.up || touch.up),
        down: !!(keys.down || touch.down), fire: !!(keys.fire || touch.fire), jump: !!(keys.jump || touch.jump)
      };
    }
    // —— 摇杆（8 向） ——
    var stickId = null;
    function stickSet(e) {
      var r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = e.clientX - cx, dy = e.clientY - cy, R = r.width / 2, d = Math.sqrt(dx * dx + dy * dy);
      var k = d > R * 0.62 ? R * 0.62 / d : 1;
      knob.style.transform = 'translate(' + (dx * k) + 'px,' + (dy * k) + 'px)';
      touch.left = touch.right = touch.up = touch.down = false;
      if (d < R * 0.25) return;
      var sec = Math.round(Math.atan2(dy, dx) / (PI / 4)); // -4..4
      sec = (sec + 8) % 8; // 0=右 1=右下 2=下 3=左下 4=左 5=左上 6=上 7=右上
      touch.right = sec === 0 || sec === 1 || sec === 7;
      touch.left = sec === 3 || sec === 4 || sec === 5;
      touch.down = sec === 1 || sec === 2 || sec === 3;
      touch.up = sec === 5 || sec === 6 || sec === 7;
    }
    function stickEnd(e) {
      if (e.pointerId !== stickId) return;
      stickId = null; knob.style.transform = ''; touch.left = touch.right = touch.up = touch.down = false;
    }
    function stickDown(e) {
      e.preventDefault(); markTouch(e); resume();
      stickId = e.pointerId; try { stick.setPointerCapture(e.pointerId); } catch (x) {}
      stickSet(e);
    }
    function stickMove(e) { if (e.pointerId === stickId) { e.preventDefault(); stickSet(e); } }
    stick.addEventListener('pointerdown', stickDown);
    stick.addEventListener('pointermove', stickMove);
    stick.addEventListener('pointerup', stickEnd);
    stick.addEventListener('pointercancel', stickEnd);
    stick.addEventListener('lostpointercapture', stickEnd);
    // —— 按钮 ——
    function bindBtn(b, key) {
      var ids = {};
      function cnt() { return Object.keys(ids).length; }
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); markTouch(e); resume();
        ids[e.pointerId] = 1; touch[key] = true; b.classList.add('blaster-down');
        try { b.setPointerCapture(e.pointerId); } catch (x) {}
      });
      var up = function (e) { delete ids[e.pointerId]; if (!cnt()) { touch[key] = false; b.classList.remove('blaster-down'); } };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    }
    bindBtn(bJump, 'jump'); bindBtn(bFire, 'fire');
    function markTouch(e) { if (e.pointerType === 'touch' || e.pointerType === 'pen') S.root.classList.add('blaster-touch'); }
    function onScreenDown(e) { markTouch(e); if (paused) { e.preventDefault(); resume(); } }
    S.screen.addEventListener('pointerdown', onScreenDown);

    // —— 键盘 ——
    var MAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
      KeyJ: 'fire', KeyZ: 'fire', KeyK: 'jump', KeyX: 'jump', Space: 'jump' };
    var KEYMAP = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', j: 'fire', z: 'fire', k: 'jump', x: 'jump', ' ': 'jump' };
    function keyName(e) { return MAP[e.code] || KEYMAP[(e.key || '').toLowerCase()]; }
    function typing(e) { var t = e.target && e.target.tagName; return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT'; }
    function kd(e) {
      if (!alive || typing(e) || !S.root.isConnected || S.root.offsetParent === null) return;
      if (e.code === 'KeyP' || e.key === 'Escape') { if (paused) resume(); else pause(); e.preventDefault(); return; }
      var k = keyName(e); if (!k) return;
      e.preventDefault(); if (paused) resume(); keys[k] = true;
    }
    function ku(e) { var k = keyName(e); if (k) { keys[k] = false; if (alive && !typing(e) && S.root.isConnected) e.preventDefault(); } }
    function blur() { keys = {}; }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);

    // —— 暂停 ——
    function showOverlay(html) { S.overlay.innerHTML = html; S.overlay.classList.add('blaster-on'); }
    function hideOverlay() { S.overlay.classList.remove('blaster-on'); }
    function pause() {
      if (paused || ended) return; paused = true; keys = {};
      showOverlay('<b>已暂停</b><small>点一下画面或按任意键继续</small>');
      onStatus('已暂停 · 点画面继续');
    }
    function resume() { if (!paused) return; paused = false; hideOverlay(); loop.reset(); lastStatus = ''; }
    function vis() { if (document.hidden) pause(); }
    document.addEventListener('visibilitychange', vis);
    S.overlay.addEventListener('pointerdown', function (e) { if (paused) { e.preventDefault(); resume(); } });

    function step() {
      if (paused || ended) return;
      update(g, input());
      while (g.events.length) {
        var ev = g.events.shift();
        if (ev === 'shot') sound('move');
        else if (ev === 'kill') sound('capture');
        else if (ev === 'hit') sound('check');
        else if (ev === 'pickup') sound('select');
        else if (ev === 'win') { ended = true; onStatus('关卡完成！分数 ' + g.score); onEnd({ winner: 'player', reason: '打爆了关底大炮墙！最终得分 ' + g.score }); }
        else if (ev === 'over') { ended = true; onStatus('命用完了 · 分数 ' + g.score); onEnd({ winner: 'ai', reason: '命用完了，冲到了' + zoneName(g) + '，得分 ' + g.score + '，再来一次！' }); }
      }
      if (!ended && g.t % 10 === 0) { var s = statusText(g); if (s !== lastStatus) { lastStatus = s; onStatus(s); } }
    }
    var loop = makeLoop(step, function () { S.draw(g); });
    onStatus(statusText(g));

    return {
      undo: function () { onStatus('动作游戏不能悔棋，加油！'); },
      hint: function () {
        clearTimeout(hintTimer);
        var tip = TIPS[Math.floor(Math.random() * TIPS.length)];
        showOverlay('<b>操作提示</b><small>←→ 跑 · ↑ 斜上/朝上瞄准 · ↓ 趴下 · 空中↓朝下打</small><small>射 / J：开火（按住连发）　跳 / K：翻跟头跳</small><span class="blaster-tip">💡 ' + tip + '</span>');
        hintTimer = setTimeout(function () { if (!paused) hideOverlay(); else showOverlay('<b>已暂停</b><small>点一下画面或按任意键继续</small>'); }, 3600);
      },
      restart: function () {
        g = newGame(level, { seed: (Date.now() & 0xffff) + 1 }); ended = false; paused = false; hideOverlay(); keys = {}; lastStatus = '';
        onStatus(statusText(g));
      },
      destroy: function () {
        alive = false; loop.stop(); clearTimeout(hintTimer);
        window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur);
        document.removeEventListener('visibilitychange', vis);
        if (pad.parentNode) pad.parentNode.removeChild(pad);
        S.destroy();
      },
      _game: function () { return g; }
    };
  }

  /* ===================== demo ===================== */
  function demoSteps() {
    function put(g, camX, px, py) {
      g.cam.x = camX; g.player = newPlayer(g, px, py); g.enemies.length = 0; g.eb.length = 0; g.pb.length = 0; g.pickups.length = 0;
      g.player.onGround = true; g.boss.active = false;
    }
    return [
      { cap: '目标：一路向右闯关，打败关底的大炮墙！',
        setup: function (g) { put(g, CAM_MAX, 5900, GROUND); g.boss.active = true; },
        input: function (g, f) { return { right: f < 50, fire: f > 30 }; } },
      { cap: '←→ 跑，按「跳」翻跟头跳上高台',
        setup: function (g) { put(g, 180, 250, GROUND); },
        input: function (g, f) { return { right: f < 150, jump: (f > 18 && f < 24) || (f > 95 && f < 101) }; } },
      { cap: '八方向射击：前、斜上、朝上、斜下都能打',
        setup: function (g) {
          put(g, 1560, 1700, GROUND);
          addEnemy(g, 'drone', 1880, 70, { by: 70, cool: 9999 }); addEnemy(g, 'drone', 1960, 110, { by: 110, cool: 9999 });
          addEnemy(g, 'grunt', 1900, GROUND);
        },
        input: function (g, f) {
          var s = Math.floor(f / 26);
          var seq = [{ right: 1 }, { right: 1, up: 1 }, { up: 1 }, { left: 1, up: 1 }, { left: 1 }, { right: 1, down: 1 }, { jump: f % 26 < 3, down: 1 }][Math.min(s, 6)];
          var o = { fire: true }; for (var k in seq) o[k] = !!seq[k]; return o;
        } },
      { cap: '只按↓趴下，平射的炮弹从头顶飞过',
        setup: function (g) { put(g, 1000, 1110, GROUND); addEnemy(g, 'cannon', 1200, GROUND, { cool: 10, hp: 4 }); },
        input: function (g, f) { return { down: true, fire: f > 150 }; } },
      { cap: '打掉飞过的胶囊，吃下「散」字武器',
        setup: function (g) { put(g, 2000, 2150, GROUND); addEnemy(g, 'capsule', 2030, 120, { by: 120, w: 'S' }); },
        input: function (g, f) {
          var cap = g.enemies.filter(function (e) { return e.t === 'capsule'; })[0];
          if (cap && f > 70) killEnemy(g, cap, g.enemies.indexOf(cap));
          var k = g.pickups[0];
          if (k) return { right: k.x > g.player.x + 2, left: k.x < g.player.x - 2 };
          if (g.player.weapon === 'S') return { right: true, up: f % 40 < 20, fire: true };
          return { up: true, right: f % 30 < 15, left: f % 30 >= 15 && f % 30 < 18, fire: true };
        } },
      { cap: '关底：跳上平台，猛打闪光的核心弱点！',
        setup: function (g) { put(g, CAM_MAX, 5840, GROUND); g.boss.active = true; g.boss.core.hp = 8; g.boss.turrets[1].hp = 0; },
        input: function (g, f) {
          var p = g.player;
          if (f < 60) return { right: p.x < 5900, jump: f > 8 && f < 12, fire: f > 40 };
          return { fire: true, right: f % 50 < 2 };
        } }
    ];
  }
  function demo(el, opts) {
    opts = opts || {};
    var onCaption = opts.onCaption || function () {}, onDone = opts.onDone || function () {};
    var S = makeScreen(el), g = newGame(0, { demo: true, noSpawn: true, seed: 7 });
    blockTouch(S.screen);
    var steps = demoSteps(), si = -1, f = 0, PER = 190, stopped = false, doneT = 0;
    function next() {
      si++;
      if (si >= steps.length) { stopped = true; loop.stop(); doneT = setTimeout(onDone, 400); return; }
      g = newGame(0, { demo: true, noSpawn: true, seed: 7 + si });
      steps[si].setup(g); f = 0; onCaption(steps[si].cap);
    }
    function step() {
      if (stopped) return;
      if (si < 0 || f >= PER) { next(); if (stopped) return; }
      update(g, steps[si].input(g, f)); g.events.length = 0; f++;
    }
    var paused = false;
    function vis() { paused = document.hidden; if (!paused) loop.reset(); }
    document.addEventListener('visibilitychange', vis);
    var loop = makeLoop(function () { if (!paused) step(); }, function () { S.draw(g); });
    return {
      stop: function () { stopped = true; loop.stop(); clearTimeout(doneT); document.removeEventListener('visibilitychange', vis); S.destroy(); }
    };
  }

  /* ===================== 导出 ===================== */
  var engine = {
    W: W, H: H, GROUND: GROUND, WATER_Y: WATER_Y, WORLD_W: WORLD_W, CAM_MAX: CAM_MAX, BOSS_X: BOSS_X, LEVELS: LEVELS, WEAPONS: WEAPONS, TIPS: TIPS,
    aabb: aabb, rectHit: rectHit, circleRect: circleRect, pointIn: pointIn, aimVector: aimVector, weaponBullets: weaponBullets,
    newGame: newGame, update: update, landY: landY, wallBlock: wallBlock, playerBox: playerBox, ebox: ebox, addEnemy: addEnemy,
    damagePart: damagePart, hitPlayer: hitPlayer, statusText: statusText, zoneName: zoneName, render: render, demoSteps: demoSteps
  };
  root.TZGAMES.blaster = {
    id: 'blaster', name: '团子突击队', tagline: '横版闯关射击，八方向开火',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['单人'],
    mount: mount, demo: demo,
    _engine: engine
  };
})();
