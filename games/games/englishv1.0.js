/* 团子棋馆 · 英语小冒险 (english) v1.0 — 单人：9 站场景，单词捕捉 / 句子拼拼乐 / 羽毛球对话对打，抓团团兽进图鉴
   原创内容：怪兽、角色、句子均为原创；只借用入门教材常见的单词与句型。 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
  root.TZGAMES = root.TZGAMES || {};

  /* ===================== 数据 ===================== */
  // 团团兽：0–8 每站一只，9–11 按总星数解锁（zh 只给家长/代码看；孩子看到的名字一律是英文 en）
  var MONSTERS = [
    { k: 'bagbun', zh: '包包兔', en: 'Bag Bunny', c: '#ffc2d4' },
    { k: 'brella', zh: '雨伞龟', en: 'Umbrella Turtle', c: '#9ad98a' },
    { k: 'hatcat', zh: '帽帽猫', en: 'Hat Cat', c: '#ffbe7a' },
    { k: 'toolbear', zh: '工具熊', en: 'Tool Bear', c: '#d2a77e' },
    { k: 'sunchick', zh: '太阳鸡', en: 'Sunny Chick', c: '#ffe066' },
    { k: 'octo', zh: '抓抓章鱼', en: 'Catch Octopus', c: '#c4a7ff' },
    { k: 'snail', zh: '彩虹蜗牛', en: 'Rainbow Snail', c: '#a7e8d8' },
    { k: 'fox', zh: '护照狐', en: 'Passport Fox', c: '#ff9a62' },
    { k: 'shuttle', zh: '羽毛啾', en: 'Shuttle Bird', c: '#ffd7a8' },
    { k: 'whale', zh: '星星鲸', en: 'Star Whale', c: '#7cc4ff', need: 10 },
    { k: 'dragon', zh: '铅笔龙', en: 'Pencil Dragon', c: '#9be37a', need: 20 },
    { k: 'gold', zh: '金冠团团', en: 'Golden Tuantuan', c: '#ffd34d', need: 27 }
  ];
  var BONUS = [9, 10, 11];

  // words: [英文, 图（emoji 或 #色块）, 例句]   —— 给孩子看的一律只有英文，不放中文翻译
  //   例句：原创短句（4–8 词），只用新概念一 L1–17 程度的词和句型，单词本身出现在句子里
  // sents: [英文, 图画提示]  （原创短句，借用课本句型；提示用 emoji 小漫画，不用中文）
  // rally: [对方说, 正确回答, 错误回答1, 错误回答2, 图画提示]
  var SCENES = [
    {
      zh: '失物招领', les: 'L1–2', ico: '🧳', props: '🧳 📦', bg: ['#fff3d6', '#ffd9a8'],
      words: [['handbag', '👜', 'This is my mother\'s handbag.'], ['pen', '🖊️', 'Is this your blue pen?'], ['pencil', '✏️', 'This is my new pencil.'],
        ['book', '📕', 'This book is very old.'], ['watch', '⌚', 'Is this your new watch?'],
        ['coat', '🧥', 'This is my brown coat.'], ['dress', '👗', 'Is that your new dress?'], ['shirt', '👕', 'Is that a white shirt?'],
        ['car', '🚗', 'This is my red car.'], ['house', '🏠', 'This is our new house.']],
      sents: [['Excuse me!', '🙋‍♂️👋❗'], ['Is this your pen?', '🖊️👉🧒❓'], ['Is this your watch?', '⌚👉🧒❓'],
        ['Yes, it is.', '👍😊'], ['Thank you very much.', '🙏💖💖'], ['This is my book.', '📕👉🙋‍♂️']],
      rally: [['Excuse me!', 'Yes?', 'Thank you very much.', 'This is my book.', '🙋‍♂️👋❗'],
        ['Is this your pen?', 'Yes, it is.', 'Excuse me!', 'Thank you very much.', '🖊️👉🧒❓'],
        ['Here is your watch.', 'Thank you very much.', 'Is this your pen?', 'Excuse me!', '🤲⌚➡️🧒'],
        ['Pardon?', 'Is this your coat?', 'Yes, it is.', 'Thank you very much.', '👂❓🔁'],
        ['Is this your car?', 'No, it isn\'t.', 'Thank you very much.', 'Excuse me!', '🚗👉🧒❓']]
    },
    {
      zh: '寄存处', les: 'L3–4', ico: '🎫', props: '🎫 ☂️', bg: ['#e6f4ff', '#bfe0ff'],
      words: [['umbrella', '☂️', 'Here is your umbrella.'], ['ticket', '🎫', 'Here is my green ticket.'], ['number', '🔢', 'My number is five.'],
        ['five', '5️⃣', 'My ticket is number five.'], ['suit', '🤵', 'This is my father\'s suit.'],
        ['school', '🏫', 'This is my new school.'], ['teacher', '👩‍🏫', 'She is a very good teacher.'], ['son', '👦', 'This is my son, Ben.'],
        ['daughter', '👧', 'Is this your daughter?'], ['coat', '🧥', 'Here is your coat, sir.']],
      sents: [['My coat, please.', '🧥🙏'], ['Here is my ticket.', '🎫➡️🤲'], ['Number five.', '🔢5️⃣'],
        ['Here is your umbrella.', '☂️➡️🧒'], ['This is not my umbrella.', '☂️🙅‍♂️']],
      rally: [['Your ticket, please.', 'Here is my ticket.', 'Yes, it is.', 'Excuse me!', '🎫🙏'],
        ['What number is it?', 'Number five.', 'My coat, please.', 'Thank you.', '🔢❓'],
        ['Is this your umbrella?', 'No, it isn\'t.', 'Here is my ticket.', 'Number five.', '☂️👉🧒❓'],
        ['Here is your coat.', 'Thank you very much.', 'Is this your book?', 'Here is my ticket.', '🧥➡️🧒'],
        ['Is this your son?', 'Yes, he is.', 'Yes, it is.', 'Number five.', '👦👉🧒❓']]
    },
    {
      zh: '新同学', les: 'L5–6', ico: '🏫', props: '🏫 ✏️', bg: ['#f0ffe6', '#c9f0b4'],
      words: [['French', '🇫🇷', 'He is a French student.'], ['German', '🇩🇪', 'This is a German car.'], ['Japanese', '🇯🇵', 'She is Japanese, not Korean.'],
        ['Korean', '🇰🇷', 'He is a Korean boy.'], ['Chinese', '🇨🇳', 'We are Chinese students.'],
        ['student', '🧑‍🎓', 'Ben is a new student.'], ['bike', '🚲', 'Is this your new bike?'], ['morning', '🌅', 'Good morning, Miss Li.'], ['new', '🆕', 'My pencil is new.']],
      sents: [['Good morning.', '🌅👋😊'], ['This is a new student.', '🆕🧑‍🎓👉'], ['He is French.', '👦🇫🇷'],
        ['She is Japanese.', '👧🇯🇵'], ['Nice to meet you.', '🤝😊'], ['It is a Chinese bike.', '🚲🇨🇳']],
      rally: [['Good morning.', 'Good morning.', 'Thank you very much.', 'Number five.', '🌅👋'],
        ['This is Ben. He is a new student.', 'Nice to meet you.', 'Here is my ticket.', 'Yes, it is.', '👦🆕🧑‍🎓'],
        ['Is Mei Chinese?', 'Yes, she is.', 'Yes, it is.', 'Yes, he is.', '👧🇨🇳❓'],
        ['Is Hans French?', 'No, he isn\'t. He is German.', 'Yes, she is.', 'Nice to meet you.', '👦🇫🇷❓'],
        ['Is it a Japanese bike?', 'Yes, it is.', 'Yes, she is.', 'Good morning.', '🚲🇯🇵❓']]
    },
    {
      zh: '你是做什么的', les: 'L7–8', ico: '🔧', props: '🔧 📮', bg: ['#fff0f5', '#ffd0e0'],
      words: [['teacher', '👩‍🏫', 'My mother is a teacher.'], ['engineer', '👷', 'My father is an engineer.'], ['policeman', '👮', 'That man is a policeman.'],
        ['nurse', '🧑‍⚕️', 'She is a very busy nurse.'], ['mechanic', '🔧', 'Is he a mechanic?'],
        ['hairdresser', '💇', 'My sister is a hairdresser.'], ['postman', '📮', 'The postman is very busy.'], ['keyboard operator', '⌨️', 'She is a keyboard operator.'],
        ['student', '🧑‍🎓', 'I am a student, too.'], ['name', '📛', 'My name is Ben.'], ['job', '💼', 'What is your job?']],
      sents: [['What\'s your name?', '📛❓'], ['My name is Tuanzi.', '🙋‍♂️📛'], ['What nationality are you?', '🌍🧒❓'],
        ['I\'m Chinese.', '🙋‍♂️🇨🇳'], ['What\'s your job?', '💼❓'], ['I\'m a student.', '🙋‍♂️🧑‍🎓']],
      rally: [['What\'s your name?', 'My name is Tuanzi.', 'I\'m a nurse.', 'I\'m Chinese.', '📛❓'],
        ['What nationality are you?', 'I\'m Chinese.', 'I\'m a student.', 'My name is Tuanzi.', '🌍🧒❓'],
        ['What\'s your job?', 'I\'m a student.', 'I\'m Chinese.', 'Good morning.', '💼❓'],
        ['Are you a policeman?', 'Yes, I am.', 'Yes, it is.', 'Yes, she is.', '👮🧒❓'],
        ['Is she a hairdresser?', 'Yes, she is.', 'Yes, he is.', 'I\'m a postman.', '👩💇❓']]
    },
    {
      zh: '早上好吗', les: 'L9–10', ico: '☀️', props: '☀️ 🌤️', bg: ['#fffbe0', '#ffeaa0'],
      words: [['hot', '🔥', 'It is very hot today.'], ['cold', '🥶', 'Is it cold today?'], ['old', '👴', 'My car is very old.'],
        ['young', '👶', 'My sister is very young.'], ['tall', '🦒', 'My father is very tall.'], ['short', '🐭', 'My brother is very short.'],
        ['fat', '🐷', 'That cat is very fat.'], ['thin', '🥢', 'That woman is very thin.'], ['dirty', '🐾', 'My shirt is very dirty.'],
        ['clean', '🧼', 'This shirt is clean.'], ['busy', '🐝', 'My mother is very busy.'], ['lazy', '🦥', 'That dog is very lazy.']],
      sents: [['Hello, Tuanzi.', '👋🙂'], ['How are you today?', '🙂❓'], ['I\'m very well, thank you.', '😄👍🙏'],
        ['I\'m fine, thanks.', '🙂👍'], ['Goodbye. See you.', '👋🚪'], ['The cat is very lazy.', '🐱😴💤']],
      rally: [['Hello! How are you today?', 'I\'m very well, thank you.', 'I\'m a student.', 'Yes, it is.', '👋🙂❓'],
        ['How is Mei today?', 'She\'s fine, thanks.', 'She\'s Chinese.', 'Nice to meet you.', '👧🙂❓'],
        ['Goodbye!', 'See you!', 'Good morning.', 'Here is my ticket.', '👋🚪'],
        ['Is the cat lazy?', 'Yes, it is.', 'Yes, he is.', 'I\'m fine.', '🐱😴❓'],
        ['Is the water hot?', 'No, it isn\'t. It\'s cold.', 'Yes, she is.', 'I\'m very well.', '💧🔥❓']]
    },
    {
      zh: '这是谁的', les: 'L11–12', ico: '👕', props: '👕 🧺', bg: ['#f3ecff', '#dccbff'],
      words: [['whose', '❓', 'Whose pen is this?'], ['blue', '#3b82f6', 'My bike is blue.'], ['white', '#ffffff', 'My new shirt is white.'],
        ['shirt', '👕', 'Is this your blue shirt?'], ['perhaps', '🤔', 'Perhaps it is Ben\'s pen.'],
        ['catch', '🙌', 'Here is your bag. Catch!'], ['father', '👨', 'My father is a policeman.'], ['mother', '👩', 'My mother is a nurse.'],
        ['brother', '🧒', 'Is this your brother?'], ['sister', '👧', 'My sister is a student.'], ['tie', '👔', 'This is my father\'s tie.']],
      sents: [['Whose shirt is this?', '👕❓'], ['Is this your shirt?', '👕👉🧒❓'], ['Perhaps it is Ben\'s.', '🤔👦'],
        ['It is my father\'s tie.', '👔👨'], ['My shirt is white.', '👕⚪']],
      rally: [['Whose racket is that?', 'Perhaps it is Ben\'s.', 'It\'s very hot.', 'Nice to meet you.', '🏸❓'],
        ['Is this your blue shirt?', 'No, it isn\'t. My shirt is white.', 'Yes, he is.', 'Goodbye.', '👕🔵❓'],
        ['Catch!', 'Thanks, Dad!', 'I\'m a nurse.', 'Number five.', '👨🙌'],
        ['Is this your mother\'s coat?', 'Yes, it is.', 'Yes, she is.', 'I\'m Chinese.', '🧥👩❓'],
        ['Whose book is this?', 'It\'s my sister\'s.', 'It\'s blue.', 'I\'m fine.', '📕❓']]
    },
    {
      zh: '新裙子', les: 'L13–14', ico: '🌈', props: '🌈 👗', bg: ['#e6fff8', '#b5f0df'],
      words: [['red', '#e5484d', 'My new hat is red.'], ['green', '#22a06b', 'Is your coat green?'], ['yellow', '#ffc53d', 'My pencil is yellow.'],
        ['black', '#2b2340', 'My father\'s car is black.'], ['brown', '#8a5a2b', 'My dog is brown.'],
        ['grey', '#9a9aa6', 'My cat is grey.'], ['orange', '#ff8a3d', 'This orange hat is lovely.'], ['hat', '👒', 'My hat is new.'],
        ['dress', '👗', 'My sister\'s dress is red.'], ['lovely', '💖', 'It\'s a lovely dress.'], ['same', '👯', 'Our coats are the same.'], ['smart', '😎', 'You look very smart today.']],
      sents: [['What colour is your new hat?', '👒🎨❓'], ['It\'s yellow.', '👒🟡'], ['Come and see it.', '👋👀'],
        ['Your dress is lovely.', '👗💖'], ['My hat is the same colour.', '👒🟰👒']],
      rally: [['What colour is your new hat?', 'It\'s orange.', 'It\'s my sister\'s.', 'Yes, he is.', '👒🎨❓'],
        ['Is it the same colour?', 'Yes, it is.', 'Yes, she is.', 'I\'m fine.', '🎨🟰❓'],
        ['Look at my new dress!', 'It\'s lovely!', 'Number five.', 'What\'s your job?', '👀👗✨'],
        ['What colour is your coat?', 'It\'s brown.', 'It\'s lovely.', 'It\'s Ben\'s.', '🧥🎨❓'],
        ['Come and see my hat.', 'Wow, it\'s very smart!', 'Goodbye. See you.', 'I\'m a mechanic.', '👋👀👒']]
    },
    {
      zh: '机场出发打比赛', les: 'L15–16', ico: '✈️', props: '✈️ 🛂', bg: ['#e8f0ff', '#c4d4ff'],
      words: [['passport', '🛂', 'Here is my passport.'], ['tourist', '🧳', 'He is a Danish tourist.'], ['friend', '🤝', 'Ben is my good friend.'],
        ['girl', '👧', 'That girl is my sister.'], ['boy', '👦', 'This boy is very tall.'],
        ['customs', '🛃', 'We are at the customs.'], ['plane', '✈️', 'This is our plane.'], ['Danish', '🇩🇰', 'Are you Danish too?'],
        ['racket', '🏸', 'This is my new racket.'], ['bag', '🎒', 'Is this your school bag?']],
      sents: [['Your passport, please.', '🛂🙏'], ['Here is my passport.', '🛂➡️🤲'], ['Are you a tourist?', '🧳🧒❓'],
        ['No, we are a badminton team.', '🙅‍♂️🏸👥'], ['Are your friends Chinese too?', '👫🇨🇳❓'], ['Yes, they are.', '👍👫']],
      rally: [['Your passport, please.', 'Here is my passport.', 'It\'s green.', 'Goodbye.', '🛂🙏'],
        ['Are you Danish?', 'No, I\'m not. I\'m Chinese.', 'Yes, it is.', 'I\'m fine, thanks.', '🧒🇩🇰❓'],
        ['Are you tourists?', 'No, we are a badminton team!', 'Yes, it is.', 'It\'s my sister\'s.', '🧳👥❓'],
        ['Are your friends Chinese too?', 'Yes, they are.', 'Yes, it is.', 'Yes, she is.', '👫🇨🇳❓'],
        ['Is this your racket?', 'Yes, it is. Thank you!', 'Yes, they are.', 'I\'m a nurse.', '🏸👉🧒❓']]
    },
    {
      zh: '认识新队友', les: 'L17–18', ico: '🏸', props: '🏸 🏆', bg: ['#fff0e6', '#ffd2b0'],
      words: [['coach', '🧑‍🏫', 'This is our new coach.'], ['player', '🏸', 'He is a very good player.'], ['man', '👨', 'That man is a coach.'],
        ['woman', '👩', 'That woman is a nurse.'], ['team', '👥', 'We are a badminton team.'],
        ['shuttlecock', '🪶', 'Here is a white shuttlecock.'], ['net', '🥅', 'Look at the net!'], ['hard-working', '💪', 'Our coach is very hard-working.'],
        ['lazy', '🦥', 'They aren\'t lazy players.'], ['these', '👇', 'These are my rackets.'], ['those', '👉', 'Those are our new players.']],
      sents: [['How do you do?', '🤝🙂'], ['These are our new players.', '👇🆕🏸👥'], ['Those are our coaches.', '👉🧑‍🏫🧑‍🏫'],
        ['They\'re very hard-working.', '👥💪💪'], ['This is our coach.', '👉🧑‍🏫'], ['They aren\'t lazy.', '👥🙅‍♂️🦥']],
      rally: [['How do you do?', 'How do you do?', 'I\'m fine, thanks.', 'Here is my ticket.', '🤝🙂'],
        ['Who are these girls?', 'They\'re our new players.', 'It\'s lovely.', 'Yes, it is.', '👧👧❓'],
        ['Are they hard-working?', 'Yes, they\'re very hard-working.', 'Yes, it is.', 'No, I\'m a nurse.', '👥💪❓'],
        ['Is your coach lazy?', 'No! She\'s very busy.', 'Yes, they are.', 'It\'s blue.', '🧑‍🏫🦥❓'],
        ['Ready? Play!', 'Let\'s play!', 'Goodbye. See you.', 'Number five.', '🏸🏁']]
    }
  ];
  // 大师档句子里的干扰块
  var DISTRACT = ['is', 'are', 'a', 'an', 'not', 'my', 'your', 'it', 'this', 'that', 'he', 'she', 'they', 'am', 'the', 'very'];

  var LEVELS = [
    { name: '新手', wordOpts: 3, types: [['pic', 0.7], ['word', 0.3]], cueBuild: true, cueRally: true, distract: 0, shuttle: 6000, rallyOpts: 2, nWords: 6, nSent: 4, mix: false },
    { name: '入门', wordOpts: 4, types: [['pic', 0.4], ['word', 0.6]], cueBuild: true, cueRally: true, distract: 0, shuttle: 5200, rallyOpts: 3, nWords: 8, nSent: 4, mix: false },
    { name: '进阶', wordOpts: 4, types: [['listen', 0.6], ['word', 0.4]], cueBuild: false, cueRally: false, distract: 0, shuttle: 4200, rallyOpts: 3, nWords: 8, nSent: 4, mix: false },
    { name: '大师', wordOpts: 4, types: [['listen', 0.5], ['word', 0.5]], cueBuild: false, cueRally: false, distract: 2, shuttle: 3300, rallyOpts: 3, nWords: 8, nSent: 4, mix: true }
  ];
  var RALLY_WIN = 5, RALLY_MAX = 12, STORE = 'tz-eng-v1';
  var LEIT = [0, 1, 2, 4, 8]; // 每个盒子隔几次冒险再复习

  /* ===================== 引擎 ===================== */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(a, rng) {
    rng = rng || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = (rng() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function range(n) { var r = []; for (var i = 0; i < n; i++) r.push(i); return r; }
  function tilesOf(en) { return en.split(' '); }
  // 例句里找到目标词（不分大小写，允许 -s / -es 复数），返回 [前, 词, 后]；找不到返回 null
  function exParts(ex, word) {
    var esc = String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var m = new RegExp('(^|[^A-Za-z])(' + esc + '(?:es|s)?)(?![A-Za-z])', 'i').exec(String(ex));
    if (!m) return null;
    var at = m.index + m[1].length;
    return [ex.slice(0, at), m[2], ex.slice(at + m[2].length)];
  }
  function norm(t) { return String(t).toLowerCase().replace(/[^a-z'\-]/g, ''); }

  function itemId(kind, si, k) { return kind + '|' + si + '|' + k; }
  function getItem(id) {
    var p = String(id).split('|'), kind = p[0], si = +p[1], k = +p[2], sc = SCENES[si];
    if (!sc) return null;
    if (kind === 'w') { var w = sc.words[k]; return w ? { id: id, kind: kind, si: si, k: k, en: w[0], pic: w[1], ex: w[2] } : null; }
    if (kind === 's') { var s = sc.sents[k]; return s ? { id: id, kind: kind, si: si, k: k, en: s[0], cue: s[1], tiles: tilesOf(s[0]) } : null; }
    if (kind === 'r') { var r = sc.rally[k]; return r ? { id: id, kind: kind, si: si, k: k, q: r[0], a: r[1], w: [r[2], r[3]], cue: r[4] } : null; }
    return null;
  }

  // ---- 题目生成 ----
  function pickType(level, rng) {
    var T = LEVELS[level].types, x = rng(), acc = 0;
    for (var i = 0; i < T.length; i++) { acc += T[i][1]; if (x < acc) return T[i][0]; }
    return T[T.length - 1][0];
  }
  function wordQuestion(item, level, rng, type) {
    rng = rng || Math.random;
    var L = LEVELS[level], n = L.wordOpts, pool = SCENES[item.si].words, opts = [item], usedEn = {}, usedPic = {};
    usedEn[norm(item.en)] = 1; usedPic[item.pic] = 1;
    var cand = shuffle(range(pool.length), rng);
    for (var c = 0; c < cand.length && opts.length < n; c++) {
      var w = getItem(itemId('w', item.si, cand[c]));
      if (usedEn[norm(w.en)] || usedPic[w.pic]) continue;
      usedEn[norm(w.en)] = 1; usedPic[w.pic] = 1; opts.push(w);
    }
    shuffle(opts, rng);
    var ans = 0;
    for (var i = 0; i < opts.length; i++) if (opts[i].id === item.id) ans = i;
    return { kind: 'w', type: type || pickType(level, rng), item: item, options: opts, answer: ans, dim: {} };
  }
  function sentenceQuestion(item, level, rng) {
    rng = rng || Math.random;
    var L = LEVELS[level], ans = item.tiles.slice(), pool = ans.map(function (t) { return { t: t, d: false }; });
    if (L.distract) {
      var inAns = {}; ans.forEach(function (t) { inAns[norm(t)] = 1; });
      var cand = DISTRACT.concat(SCENES[item.si].words.map(function (w) { return w[0]; }).filter(function (w) { return w.indexOf(' ') < 0; }));
      shuffle(cand, rng);
      for (var c = 0; c < cand.length && pool.length < ans.length + L.distract; c++) {
        var nt = norm(cand[c]); if (!nt || inAns[nt]) continue;
        inAns[nt] = 1; pool.push({ t: cand[c], d: true });
      }
    }
    // 打乱，且不要正好是正确顺序
    for (var g = 0; g < 8; g++) {
      shuffle(pool, rng);
      if (pool.length < 2 || pool.map(function (p) { return p.t; }).join(' ') !== ans.join(' ')) break;
    }
    if (pool.length >= 2 && pool.map(function (p) { return p.t; }).join(' ') === ans.join(' ')) pool.push(pool.shift());
    pool.forEach(function (p, i) { p.k = i; p.used = false; });
    return { kind: 's', item: item, answer: ans, pool: pool, line: [], cue: L.cueBuild, helped: false };
  }
  function rallyQuestion(item, level, rng) {
    rng = rng || Math.random;
    var n = LEVELS[level].rallyOpts, opts = [item.a];
    for (var i = 0; i < item.w.length && opts.length < n; i++) if (opts.indexOf(item.w[i]) < 0) opts.push(item.w[i]);
    shuffle(opts, rng);
    return { kind: 'r', item: item, options: opts, answer: opts.indexOf(item.a), cue: LEVELS[level].cueRally, wrong: {}, helped: false };
  }

  // ---- 进度 / 星星 / 解锁 ----
  function defaultProgress() { return { v: 1, stars: [0, 0, 0, 0, 0, 0, 0, 0, 0], all: false, session: 0, box: {}, bonus: {} }; }
  function normalizeProgress(p) {
    var d = defaultProgress();
    if (!p || typeof p !== 'object') return d;
    for (var i = 0; i < 9; i++) d.stars[i] = Math.max(0, Math.min(3, (p.stars && +p.stars[i]) || 0));
    d.all = !!p.all; d.session = Math.max(0, +p.session || 0);
    if (p.box && typeof p.box === 'object') for (var id in p.box) { var e = p.box[id]; if (e && getItem(id) && e.b >= 1 && e.b <= 4) d.box[id] = { b: e.b | 0, n: +e.n || 0 }; }
    if (p.bonus && typeof p.bonus === 'object') BONUS.forEach(function (m) { if (p.bonus[m]) d.bonus[m] = 1; });
    return d;
  }
  function isUnlocked(p, i) { return i >= 0 && i < SCENES.length && (p.all || i === 0 || p.stars[i - 1] > 0); }
  function unlockedList(p) { return range(SCENES.length).filter(function (i) { return isUnlocked(p, i); }); }
  function totalStars(p) { return p.stars.reduce(function (a, b) { return a + b; }, 0); }
  function starsFor(correct, total) {
    if (!total) return 3;
    var r = correct / total;
    return r >= 0.9 ? 3 : r >= 0.7 ? 2 : 1;
  }
  function isCaught(p, m) { return m < 9 ? p.stars[m] > 0 : !!p.bonus[m]; }
  function recordScene(p, si, stars) {
    var prev = p.stars[si];
    p.stars[si] = Math.max(prev, Math.max(1, Math.min(3, stars)));
    var tot = totalStars(p), got = [];
    BONUS.forEach(function (m) { if (!p.bonus[m] && tot >= MONSTERS[m].need) { p.bonus[m] = 1; got.push(m); } });
    return { newCatch: prev === 0, bonus: got, total: tot, improved: p.stars[si] > prev };
  }
  function nextScene(p) { for (var i = 0; i < SCENES.length; i++) if (isUnlocked(p, i) && !p.stars[i]) return i; return -1; }

  // ---- Leitner 复习盒 ----
  function leitnerMiss(box, id, s) { box[id] = { b: 1, n: s }; }
  function leitnerHit(box, id, s) {
    var e = box[id]; if (!e) return;
    if (e.b >= 4) { delete box[id]; return; }
    box[id] = { b: e.b + 1, n: s };
  }
  function leitnerDue(box, s) {
    return Object.keys(box).filter(function (id) { return s - box[id].n >= LEIT[box[id].b]; })
      .sort(function (x, y) { return (box[x].b - box[y].b) || (box[x].n - box[y].n) || (x < y ? -1 : 1); });
  }

  // ---- 本站计划：三格漫画的题目队列 ----
  function insertMid(arr, id, rng) { var pos = arr.length ? 1 + ((rng() * arr.length) | 0) : 0; arr.splice(Math.min(pos, arr.length), 0, id); }
  function buildPlan(si, level, prog, rng) {
    rng = rng || Math.random;
    var L = LEVELS[level], sc = SCENES[si];
    var A = shuffle(range(sc.words.length), rng).slice(0, L.nWords).map(function (k) { return itemId('w', si, k); });
    var B = shuffle(range(sc.sents.length), rng).slice(0, L.nSent).map(function (k) { return itemId('s', si, k); });
    var C = shuffle(range(sc.rally.length), rng).map(function (k) { return itemId('r', si, k); });
    var has = {}; A.concat(B, C).forEach(function (id) { has[id] = 1; });
    if (L.mix && prog) {
      var others = unlockedList(prog).filter(function (j) { return j !== si; });
      if (others.length) {
        var take = [['w', A, 3], ['s', B, 1], ['r', C, 1]];
        take.forEach(function (t) {
          for (var n = 0; n < t[2]; n++) {
            var sj = others[(rng() * others.length) | 0], arr = t[0] === 'w' ? SCENES[sj].words : t[0] === 's' ? SCENES[sj].sents : SCENES[sj].rally;
            var id = itemId(t[0], sj, (rng() * arr.length) | 0);
            if (!has[id]) { has[id] = 1; insertMid(t[1], id, rng); }
          }
        });
      }
    }
    if (prog && prog.box) {
      var lim = { w: 2, s: 1, r: 1 }, dst = { w: A, s: B, r: C };
      leitnerDue(prog.box, prog.session).forEach(function (id) {
        var it = getItem(id); if (!it || has[id] || !lim[it.kind]) return;
        if (!isUnlocked(prog, it.si)) return;
        lim[it.kind]--; has[id] = 1; insertMid(dst[it.kind], id, rng);
      });
    }
    return [A, B, C];
  }

  // ---- 一站冒险（纯逻辑，界面和测试共用） ----
  function Session(si, level, prog, rng) {
    this.si = si; this.level = level; this.rng = rng || Math.random; this.prog = prog || defaultProgress();
    this.plan = buildPlan(si, level, this.prog, this.rng);
    this.r = 0; this.queue = this.plan[0].slice(); this.correct = 0; this.total = 0; this.seen = {}; this.requeued = {};
    this.hits = 0; this.serves = 0; this.done = false; this.missed = [];
    this.present();
  }
  Session.prototype.present = function () {
    var id = this.queue[0], it = id != null ? getItem(id) : null;
    if (!it) { this.q = null; return null; }
    var q = it.kind === 'w' ? wordQuestion(it, this.level, this.rng) : it.kind === 's' ? sentenceQuestion(it, this.level, this.rng) : rallyQuestion(it, this.level, this.rng);
    q.first = !this.seen[id]; q.counted = false; q.finished = false;
    if (q.kind === 'r') this.serves++;
    this.q = q; return q;
  };
  Session.prototype.record = function (ok) {
    var q = this.q; if (!q || q.counted) return; q.counted = true;
    if (!q.first) return;
    this.seen[q.item.id] = 1; this.total++;
    if (ok) { this.correct++; leitnerHit(this.prog.box, q.item.id, this.prog.session); }
    else { leitnerMiss(this.prog.box, q.item.id, this.prog.session); this.missed.push(q.item.id); }
  };
  Session.prototype.requeue = function () {
    var id = this.q.item.id;
    if (this.r === 2) { this.queue.push(id); return; }
    if (this.requeued[id]) return;
    this.requeued[id] = 1; this.queue.push(id);
  };
  // 单词捕捉：选第 i 个
  Session.prototype.pick = function (i) {
    var q = this.q; if (!q || q.kind !== 'w' || q.finished || q.dim[i]) return null;
    var ok = i === q.answer;
    this.record(ok && !q.helped); q.finished = true; q.ok = ok;
    if (!ok) this.requeue();
    return { ok: ok, answer: q.answer };
  };
  Session.prototype.hintWord = function () {
    var q = this.q; if (!q || q.kind !== 'w' || q.finished) return -1;
    var left = [];
    for (var i = 0; i < q.options.length; i++) if (i !== q.answer && !q.dim[i]) left.push(i);
    if (left.length < 1 || q.options.length - Object.keys(q.dim).length <= 2) return -1;
    var d = left[(this.rng() * left.length) | 0]; q.dim[d] = 1; q.helped = true; return d;
  };
  // 句子拼拼乐
  Session.prototype.place = function (k) {
    var q = this.q; if (!q || q.kind !== 's' || q.finished) return null;
    var p = q.pool[k]; if (!p || p.used) return null;
    if (q.line.length >= q.answer.length) return null;
    p.used = true; q.line.push(k);
    return { full: q.line.length === q.answer.length, tile: p.t, right: p.t === q.answer[q.line.length - 1] };
  };
  Session.prototype.unplace = function (pos) {
    var q = this.q; if (!q || q.kind !== 's' || q.finished || pos < 0 || pos >= q.line.length) return false;
    var k = q.line.splice(pos, 1)[0]; q.pool[k].used = false; return true;
  };
  Session.prototype.undoTile = function () { var q = this.q; return !!(q && q.kind === 's' && q.line.length && this.unplace(q.line.length - 1)); };
  Session.prototype.lineText = function () { var q = this.q; return q.line.map(function (k) { return q.pool[k].t; }).join(' '); };
  Session.prototype.check = function () {
    var q = this.q; if (!q || q.kind !== 's' || q.finished || q.line.length !== q.answer.length) return null;
    var ok = this.lineText() === q.answer.join(' ');
    this.record(ok && !q.helped); q.finished = true; q.ok = ok;
    if (!ok) this.requeue();
    return { ok: ok };
  };
  Session.prototype.hintTile = function () {
    var q = this.q; if (!q || q.kind !== 's' || q.finished) return null;
    var m = 0; while (m < q.line.length && q.pool[q.line[m]].t === q.answer[m]) m++;
    while (q.line.length > m) this.unplace(q.line.length - 1);
    if (m >= q.answer.length) return null;
    var best = -1;
    for (var i = 0; i < q.pool.length; i++) if (!q.pool[i].used && q.pool[i].t === q.answer[m] && (best < 0 || (q.pool[best].d && !q.pool[i].d))) best = i;
    if (best < 0) return null;
    q.helped = true;
    var r = this.place(best); r.k = best; return r;
  };
  // 羽毛球对打
  Session.prototype.reply = function (i) {
    var q = this.q; if (!q || q.kind !== 'r' || q.finished || q.wrong[i]) return null;
    if (i === q.answer) {
      this.record(!q.helped); q.finished = true; q.ok = true; this.hits++;
      return { ok: true, hits: this.hits };
    }
    q.wrong[i] = 1;
    if (!q.counted) { this.record(false); this.requeue(); }
    return { ok: false, answer: q.answer };
  };
  Session.prototype.land = function () {
    var q = this.q; if (!q || q.kind !== 'r' || q.finished) return null;
    if (!q.counted) { this.record(false); this.requeue(); }
    q.finished = true; q.ok = false; q.landed = true;
    return { answer: q.answer };
  };
  Session.prototype.hintRally = function () { var q = this.q; if (!q || q.kind !== 'r' || q.finished) return -1; q.helped = true; return q.answer; };
  // 下一题；返回 'same' | 'round' | 'done'
  Session.prototype.next = function () {
    if (this.done) return 'done';
    this.queue.shift();
    if (this.r === 2) {
      if (this.hits >= RALLY_WIN || this.serves >= RALLY_MAX) return this.advance();
      if (!this.queue.length) this.queue = shuffle(this.plan[2].slice(), this.rng);
      this.present(); return 'same';
    }
    if (!this.queue.length) return this.advance();
    this.present(); return 'same';
  };
  Session.prototype.advance = function () {
    this.r++;
    if (this.r >= 3) { this.done = true; this.q = null; return 'done'; }
    this.queue = this.plan[this.r].slice(); this.present(); return 'round';
  };
  Session.prototype.jump = function (r) { this.r = r; this.queue = this.plan[r].slice(); this.hits = 0; this.serves = 0; this.present(); return this.q; };
  Session.prototype.stars = function () { return starsFor(this.correct, this.total); };
  Session.prototype.roundSize = function () { return this.r === 2 ? RALLY_WIN : this.plan[this.r] ? this.plan[this.r].length : 0; };

  // ---- 本地存储 ----
  function store() { try { return root.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null); } catch (e) { return null; } }
  function loadProgress() {
    var s = store(); if (!s) return defaultProgress();
    try { return normalizeProgress(JSON.parse(s.getItem(STORE) || 'null')); } catch (e) { return defaultProgress(); }
  }
  function saveProgress(p) { var s = store(); if (!s) return false; try { s.setItem(STORE, JSON.stringify(p)); return true; } catch (e) { return false; } }

  // ---- 发音：预录 MP3（英式女声 en-GB-SoniaNeural，语速 -12%），失败时退回系统 speechSynthesis ----
  // 文件名 = 文本的短哈希：assets/eng-audio/<key>.mp3；scripts/gen-eng-audiov1.0.py 用同一套规则生成
  function speechText(t) {
    t = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
    if (t.indexOf(' ') < 0) t = t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').toLowerCase(); // 单个词块：去标点、小写
    return t;
  }
  function ttsInput(t) { // 送去合成的文本（保留大小写，只把名字写成好读的拼法）
    t = String(t).replace(/\s+/g, ' ').trim();
    if (t.indexOf(' ') < 0) t = t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    return t.replace(/Tuanzi/gi, 'Twan-zee');
  }
  function cyrb53(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  function audioKey(t) { var x = cyrb53(speechText(t)).toString(16); while (x.length < 14) x = '0' + x; return x.slice(-10); }
  var AUDIO_BASE = 'assets/eng-audio/';
  try {
    var cs = typeof document !== 'undefined' && document.currentScript;
    if (cs && cs.src && /games\/[^\/]*$/.test(cs.src)) AUDIO_BASE = cs.src.replace(/games\/[^\/]*$/, '') + 'assets/eng-audio/';
  } catch (e) { /* 忽略 */ }
  function audioUrl(t) { return AUDIO_BASE + audioKey(t) + '.mp3'; }
  // 模块里所有会读出来的文本（生成器和测试共用）
  function audioStrings() {
    var seen = {}, out = [];
    function add(t) { var k = speechText(t); if (!k || seen[k]) return; seen[k] = 1; out.push({ key: audioKey(t), text: k, tts: ttsInput(t) }); }
    SCENES.forEach(function (sc) {
      sc.words.forEach(function (w) { add(w[0]); add(w[2]); });
      sc.sents.forEach(function (x) { add(x[0]); tilesOf(x[0]).forEach(add); });
      sc.rally.forEach(function (r) { add(r[0]); add(r[1]); });
    });
    DISTRACT.forEach(add);
    MONSTERS.forEach(function (m) { add(m.en); });
    return out;
  }

  var voiceCache = null;
  function pickVoice(list) {
    list = list || [];
    var en = list.filter(function (v) { return v && /^en[-_]/i.test(v.lang || ''); });
    var gb = en.filter(function (v) { return /^en[-_]GB/i.test(v.lang); }), us = en.filter(function (v) { return /^en[-_]US/i.test(v.lang); });
    var fem = /Sonia|Libby|Maisie|Hazel|Serena|Kate|Stephanie|Martha|Susan|Fiona|Moira|Tessa|Karen|Samantha|Ava|Allison|Zira|Jenny|Aria|Female/i;
    var male = /Daniel|Arthur|Oliver|George|Ryan|Thomas|Fred|Alex|Aaron|Rishi|Gordon|David|Mark|Guy|Male/i;
    function first(a, f) { for (var i = 0; i < a.length; i++) if (f(a[i])) return a[i]; return null; }
    function isF(v) { return fem.test(v.name || ''); }
    function notM(v) { return !male.test(v.name || ''); }
    return first(gb, isF) || first(gb, notM) || first(us, isF) || first(en, isF) || first(en, notM) || gb[0] || en[0] || null;
  }
  function ttsSpeak(text, rate, onend) {
    try {
      var ss = root.speechSynthesis, U = root.SpeechSynthesisUtterance;
      if (!ss || !U || !text) return null;
      if (!voiceCache && ss.getVoices) voiceCache = pickVoice(ss.getVoices());
      var u = new U(String(text).replace(/Tuanzi/g, 'Twan-zee'));
      u.lang = voiceCache ? voiceCache.lang : 'en-GB';
      if (voiceCache) u.voice = voiceCache;
      u.rate = rate || 0.85; u.pitch = 1.05;
      if (onend) { u.onend = onend; u.onerror = onend; }
      ss.speak(u);
      return u;
    } catch (e) { return null; }
  }
  // 只用一个可复用的 <audio>：iOS / 微信内置浏览器在第一次点击里解锁后，定时器里也能播
  var AUD = null, audTok = 0, audUnlocked = false;
  var SILENT = 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';
  function audioEl() {
    if (AUD) return AUD;
    var A = root.Audio; if (typeof A !== 'function') return null;
    try { AUD = new A(); AUD.preload = 'auto'; if (AUD.setAttribute) { AUD.setAttribute('playsinline', ''); AUD.setAttribute('webkit-playsinline', ''); } } catch (e) { AUD = null; }
    return AUD;
  }
  function stopSpeech() {
    audTok++;
    if (AUD) { try { AUD.onended = null; AUD.onerror = null; AUD.pause(); } catch (e) { /* 忽略 */ } }
    try { var ss = root.speechSynthesis; if (ss && ss.cancel) ss.cancel(); } catch (e) { /* 忽略 */ }
  }
  // 依次读一串（单词 → 例句）；新的一次会先停掉上一次
  function speakSeq(list, rate) {
    list = (list || []).filter(function (t) { return t; });
    stopSpeech();
    var tok = audTok, a = audioEl(), i = 0;
    function next() {
      if (tok !== audTok || i >= list.length) return null;
      var t = list[i++];
      if (!a) { var u = ttsSpeak(t, rate, next); return u || next(); }
      var done = false;
      function fallback() { if (done || tok !== audTok) return; done = true; ttsSpeak(t, rate, next); }
      a.onended = function () { if (done || tok !== audTok) return; done = true; next(); };
      a.onerror = fallback;
      try {
        a.src = audioUrl(t);
        var p = a.play();
        if (p && p.then) p.then(null, function (err) { if (err && err.name === 'AbortError') return; fallback(); });
      } catch (e) { fallback(); }
      return a;
    }
    return next();
  }
  function speak(text, rate) { return speakSeq([text], rate); }
  // 第一次点击时调用：解锁 <audio>（静音片段），也顺便唤醒 speechSynthesis
  var primed = false;
  function primeSpeech() {
    var a = audioEl();
    if (a && !audUnlocked) {
      audUnlocked = true;
      try { if (!a.src || a.paused) { a.src = SILENT; var p = a.play(); if (p && p.then) p.then(null, function () {}); } } catch (e) { /* 忽略 */ }
    }
    if (primed) return; primed = true;
    try { var ss = root.speechSynthesis, U = root.SpeechSynthesisUtterance; if (!ss || !U) return; var u = new U(' '); u.volume = 0; ss.speak(u); } catch (e) { /* 忽略 */ }
  }
  if (root.speechSynthesis && root.speechSynthesis.addEventListener) {
    try { root.speechSynthesis.addEventListener('voiceschanged', function () { voiceCache = null; }); } catch (e) { /* 忽略 */ }
  }
  function capReason(m, stars) { return '抓到了 ' + MONSTERS[m].en + '！' + new Array(stars + 1).join('⭐'); }

  var engine = {
    MONSTERS: MONSTERS, BONUS: BONUS, SCENES: SCENES, LEVELS: LEVELS, DISTRACT: DISTRACT, RALLY_WIN: RALLY_WIN, RALLY_MAX: RALLY_MAX, STORE: STORE, LEIT: LEIT,
    mulberry32: mulberry32, shuffle: shuffle, tilesOf: tilesOf, exParts: exParts, norm: norm, itemId: itemId, getItem: getItem,
    wordQuestion: wordQuestion, sentenceQuestion: sentenceQuestion, rallyQuestion: rallyQuestion, pickType: pickType,
    defaultProgress: defaultProgress, normalizeProgress: normalizeProgress, isUnlocked: isUnlocked, unlockedList: unlockedList, totalStars: totalStars,
    starsFor: starsFor, isCaught: isCaught, recordScene: recordScene, nextScene: nextScene,
    leitnerMiss: leitnerMiss, leitnerHit: leitnerHit, leitnerDue: leitnerDue, buildPlan: buildPlan, Session: Session,
    loadProgress: loadProgress, saveProgress: saveProgress, pickVoice: pickVoice, speak: speak, speakSeq: speakSeq, stopSpeech: stopSpeech, primeSpeech: primeSpeech,
    speechText: speechText, audioKey: audioKey, audioUrl: audioUrl, audioStrings: audioStrings, setAudioBase: function (b) { AUDIO_BASE = b; }, capReason: capReason
  };

  /* ===================== 画：原创 SVG ===================== */
  var INK = '#2b2340', SW = ' stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
  function face(x, y, s, noMouth) {
    s = s || 1;
    var e = 9 * s, r = 4.2 * s, o = '';
    o += '<circle cx="' + (x - e) + '" cy="' + y + '" r="' + r + '" fill="' + INK + '"/><circle cx="' + (x + e) + '" cy="' + y + '" r="' + r + '" fill="' + INK + '"/>';
    o += '<circle cx="' + (x - e + 1.4 * s) + '" cy="' + (y - 1.5 * s) + '" r="' + 1.5 * s + '" fill="#fff"/><circle cx="' + (x + e + 1.4 * s) + '" cy="' + (y - 1.5 * s) + '" r="' + 1.5 * s + '" fill="#fff"/>';
    o += '<ellipse cx="' + (x - 16 * s) + '" cy="' + (y + 8 * s) + '" rx="' + 4.6 * s + '" ry="' + 2.8 * s + '" fill="#ff7f9e" opacity=".55"/><ellipse cx="' + (x + 16 * s) + '" cy="' + (y + 8 * s) + '" rx="' + 4.6 * s + '" ry="' + 2.8 * s + '" fill="#ff7f9e" opacity=".55"/>';
    if (!noMouth) o += '<path d="M' + (x - 4 * s) + ' ' + (y + 7 * s) + ' Q' + x + ' ' + (y + 11.5 * s) + ' ' + (x + 4 * s) + ' ' + (y + 7 * s) + '" fill="none" stroke="' + INK + '" stroke-width="' + 2.6 * s + '" stroke-linecap="round"/>';
    return o;
  }
  function body(c, cx, cy, rx, ry) { return '<ellipse cx="' + (cx || 50) + '" cy="' + (cy || 60) + '" rx="' + (rx || 30) + '" ry="' + (ry || 27) + '" fill="' + c + '"' + SW + '/>'; }
  var MON_ART = [
    function (c) { // 包包兔
      return '<ellipse cx="38" cy="26" rx="8" ry="20" fill="' + c + '"' + SW + '/><ellipse cx="62" cy="26" rx="8" ry="20" fill="' + c + '"' + SW + '/>' +
        '<ellipse cx="38" cy="27" rx="3.5" ry="13" fill="#ff8fb0"/><ellipse cx="62" cy="27" rx="3.5" ry="13" fill="#ff8fb0"/>' + body(c) + face(50, 58) +
        '<path d="M60 72 Q67 61 74 72" fill="none"' + SW + '/><rect x="56" y="71" width="22" height="17" rx="5" fill="#8b5cf6"' + SW + '/><circle cx="67" cy="79" r="2.4" fill="#ffc53d"/>';
    },
    function (c) { // 雨伞龟
      return '<ellipse cx="50" cy="74" rx="38" ry="19" fill="#4f9d4a"' + SW + '/><path d="M28 72 L40 64 L60 64 L72 72 L60 82 L40 82Z" fill="none" stroke="#2f6d2c" stroke-width="2.5"/>' +
        '<ellipse cx="20" cy="86" rx="7" ry="5" fill="' + c + '"' + SW + '/><ellipse cx="80" cy="86" rx="7" ry="5" fill="' + c + '"' + SW + '/>' +
        '<circle cx="50" cy="50" r="22" fill="' + c + '"' + SW + '/>' + face(50, 50, 0.85) +
        '<path d="M50 28 L50 18" stroke="' + INK + '" stroke-width="3"/><path d="M20 20 Q50 -10 80 20 Q72 14 65 20 Q57 13 50 20 Q43 13 35 20 Q28 14 20 20Z" fill="#3b82f6"' + SW + '/><circle cx="50" cy="4" r="2.5" fill="' + INK + '"/>';
    },
    function (c) { // 帽帽猫
      return '<path d="M23 48 L26 18 L44 36Z" fill="' + c + '"' + SW + '/><path d="M77 48 L74 18 L56 36Z" fill="' + c + '"' + SW + '/>' + body(c) + face(50, 60) +
        '<path d="M20 64 L32 66 M20 72 L32 70 M80 64 L68 66 M80 72 L68 70" stroke="' + INK + '" stroke-width="2"/>' +
        '<rect x="37" y="6" width="26" height="22" rx="3" fill="' + INK + '"/><rect x="37" y="20" width="26" height="5" fill="#e5484d"/><rect x="29" y="27" width="42" height="6" rx="3" fill="' + INK + '"/>';
    },
    function (c) { // 工具熊
      return '<circle cx="28" cy="36" r="11" fill="' + c + '"' + SW + '/><circle cx="72" cy="36" r="11" fill="' + c + '"' + SW + '/><circle cx="28" cy="36" r="5" fill="#a8774f"/><circle cx="72" cy="36" r="5" fill="#a8774f"/>' +
        body(c) + '<ellipse cx="50" cy="68" rx="12" ry="8" fill="#f3dcc2"/><ellipse cx="50" cy="64" rx="3.5" ry="2.5" fill="' + INK + '"/>' + face(50, 56, 1, true) +
        '<path d="M66 88 L84 66" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/><path d="M66 88 L84 66" stroke="#c0c8d6" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="86" cy="63" r="8" fill="#c0c8d6"' + SW + '/><rect x="84" y="55" width="6" height="7" fill="' + c + '"/>';
    },
    function (c) { // 太阳鸡
      var rays = '';
      for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2; rays += '<path d="M' + (50 + Math.cos(a) * 38).toFixed(1) + ' ' + (58 + Math.sin(a) * 38).toFixed(1) + ' L' + (50 + Math.cos(a) * 46).toFixed(1) + ' ' + (58 + Math.sin(a) * 46).toFixed(1) + '" stroke="#ff8a3d" stroke-width="5" stroke-linecap="round"/>'; }
      return rays + '<circle cx="50" cy="58" r="31" fill="' + c + '"' + SW + '/>' +
        '<path d="M44 28 Q42 16 50 20 Q52 10 58 22" fill="' + c + '"' + SW + '/>' + face(50, 56, 1, true) + '<path d="M45 64 L55 64 L50 71Z" fill="#ff8a3d"' + SW + '/>' +
        '<path d="M20 64 Q12 70 22 76" fill="' + c + '"' + SW + '/><path d="M80 64 Q88 70 78 76" fill="' + c + '"' + SW + '/>';
    },
    function (c) { // 抓抓章鱼
      var t = '';
      [24, 40, 60, 76].forEach(function (x, i) { t += '<path d="M' + (x - 7) + ' 62 Q' + (x - 10) + ' 82 ' + (x - 2 + (i % 2 ? 6 : -6)) + ' 92 Q' + (x + 4) + ' 84 ' + (x + 7) + ' 62Z" fill="' + c + '"' + SW + '/>'; });
      return t + '<ellipse cx="50" cy="46" rx="31" ry="29" fill="' + c + '"' + SW + '/>' + face(50, 50) + '<circle cx="36" cy="28" r="4" fill="#fff" opacity=".7"/>';
    },
    function (c) { // 彩虹蜗牛
      return '<path d="M8 86 Q10 70 26 70 L86 76 Q92 86 80 88Z" fill="' + c + '"' + SW + '/>' +
        '<circle cx="60" cy="52" r="27" fill="#e5484d"' + SW + '/><circle cx="62" cy="54" r="21" fill="#ff8a3d"/><circle cx="64" cy="55" r="15" fill="#ffc53d"/><circle cx="65" cy="56" r="10" fill="#22a06b"/><circle cx="66" cy="57" r="5" fill="#3b82f6"/>' +
        '<circle cx="26" cy="62" r="16" fill="' + c + '"' + SW + '/><path d="M20 48 L16 32 M30 47 L34 32" stroke="' + INK + '" stroke-width="3"/><circle cx="16" cy="30" r="4" fill="' + c + '"' + SW + '/><circle cx="34" cy="30" r="4" fill="' + c + '"' + SW + '/>' + face(26, 62, 0.6);
    },
    function (c) { // 护照狐
      return '<path d="M78 80 Q100 66 92 46 Q86 62 70 70Z" fill="' + c + '"' + SW + '/><path d="M92 46 Q86 62 84 60 Q90 52 92 46Z" fill="#fff"/>' +
        '<path d="M22 44 L24 12 L44 34Z" fill="' + c + '"' + SW + '/><path d="M78 44 L76 12 L56 34Z" fill="' + c + '"' + SW + '/>' + body(c) +
        '<path d="M26 64 Q38 82 50 70 Q62 82 74 64 Q62 90 50 86 Q38 90 26 64Z" fill="#fff"/>' + face(50, 58) +
        '<rect x="58" y="70" width="18" height="22" rx="3" fill="#2f4ea8"' + SW + '/><circle cx="67" cy="80" r="4" fill="#ffc53d"/>';
    },
    function (c) { // 羽毛啾（羽毛球鸟）
      var f = '';
      for (var i = 0; i < 7; i++) { var x = 22 + i * 9.3; f += '<path d="M' + (50 + (x - 50) * 0.45).toFixed(1) + ' 44 L' + x.toFixed(1) + ' 8" stroke="#d9d2c6" stroke-width="2"/>'; }
      return '<path d="M30 46 L16 10 Q50 0 84 10 L70 46Z" fill="#fff"' + SW + '/>' + f + '<path d="M22 22 Q50 14 78 22" fill="none" stroke="#e5484d" stroke-width="3"/>' +
        '<circle cx="50" cy="64" r="26" fill="' + c + '"' + SW + '/><path d="M26 54 Q50 46 74 54" fill="none" stroke="#3b82f6" stroke-width="4"/>' + face(50, 64, 0.95, true) +
        '<path d="M45 70 L55 70 L50 77Z" fill="#ff8a3d"' + SW + '/><path d="M24 66 Q12 62 16 76 Q22 74 26 72" fill="' + c + '"' + SW + '/><path d="M76 66 Q88 62 84 76 Q78 74 74 72" fill="' + c + '"' + SW + '/>';
    },
    function (c) { // 星星鲸
      return '<path d="M78 58 Q96 40 96 30 Q90 42 82 44 Q88 34 86 26 Q80 44 74 52Z" fill="' + c + '"' + SW + '/>' +
        '<ellipse cx="46" cy="64" rx="38" ry="24" fill="' + c + '"' + SW + '/><path d="M14 70 Q46 92 80 68" fill="#d8efff" stroke="none"/>' + face(34, 60, 0.85) +
        '<path d="M44 40 Q42 30 46 24 M44 40 Q52 32 56 30" stroke="#3b82f6" stroke-width="3" fill="none"/><path d="M46 8 L49 16 L57 16 L51 21 L53 29 L46 24 L39 29 L41 21 L35 16 L43 16Z" fill="#ffc53d"' + SW + '/>';
    },
    function (c) { // 铅笔龙
      return '<path d="M30 40 L36 12 L44 36Z" fill="#ffc53d"' + SW + '/><path d="M33 22 L36 12 L39 22Z" fill="' + INK + '"/><path d="M70 40 L64 12 L56 36Z" fill="#ffc53d"' + SW + '/><path d="M67 22 L64 12 L61 22Z" fill="' + INK + '"/>' +
        '<path d="M18 56 Q2 44 8 30 Q16 44 26 46Z" fill="#7bcf5c"' + SW + '/><path d="M82 56 Q98 44 92 30 Q84 44 74 46Z" fill="#7bcf5c"' + SW + '/>' + body(c) + face(50, 58) +
        '<path d="M40 82 L44 76 L48 82 L52 76 L56 82 L60 76" fill="none" stroke="#5aa83e" stroke-width="3"/>';
    },
    function (c) { // 金冠团团
      return body(c, 50, 62, 33, 28) + face(50, 62) + '<path d="M30 36 L34 16 L44 28 L50 12 L56 28 L66 16 L70 36Z" fill="#ff8a3d"' + SW + '/><circle cx="50" cy="12" r="3.5" fill="#e5484d"' + SW + '/>' +
        '<path d="M14 30 L17 24 L20 30 L17 36Z M84 74 L87 68 L90 74 L87 80Z" fill="#fff" stroke="#ffc53d" stroke-width="2"/>';
    }
  ];
  function monSvg(m) { var M = MONSTERS[m]; return '<svg viewBox="0 0 100 100" aria-hidden="true">' + MON_ART[m](M.c) + '</svg>'; }
  var TZ_SVG = '<svg viewBox="0 0 100 130" aria-hidden="true"><g' + SW + '>' +
    '<path d="M77 92 L85 66" stroke-width="5"/><ellipse cx="88" cy="48" rx="9.5" ry="16" fill="#fff" transform="rotate(16 88 48)"/>' +
    '<path d="M81 42 L95 48 M80 50 L94 56 M85 35 L83 62 M91 36 L89 63" stroke-width="1.3" stroke="#9a8fae"/>' +
    '<rect x="37" y="100" width="10" height="20" rx="4" fill="#ffe0c2"/><rect x="53" y="100" width="10" height="20" rx="4" fill="#ffe0c2"/>' +
    '<ellipse cx="41" cy="122" rx="9" ry="5" fill="#fff"/><ellipse cx="59" cy="122" rx="9" ry="5" fill="#fff"/>' +
    '<path d="M28 106 Q28 74 50 74 Q72 74 72 106Z" fill="#e5484d"/><path d="M31 96 H69 V108 H31Z" fill="#3b82f6"/>' +
    '<path d="M68 82 Q76 88 78 92" fill="none"/><circle cx="78" cy="92" r="5" fill="#ffe0c2"/>' +
    '<path d="M32 82 Q24 92 27 100" fill="none"/><circle cx="27" cy="101" r="5" fill="#ffe0c2"/>' +
    '<circle cx="50" cy="46" r="28" fill="#ffe0c2"/><path d="M22 44 Q24 18 50 18 Q76 18 78 44 Q68 30 52 34 Q36 30 22 44Z" fill="' + INK + '"/>' +
    '<circle cx="50" cy="13" r="7" fill="' + INK + '"/><path d="M24 36 Q50 26 76 36" fill="none" stroke="#ffc53d" stroke-width="4"/></g>' +
    '<circle cx="41" cy="50" r="3.4" fill="' + INK + '"/><circle cx="59" cy="50" r="3.4" fill="' + INK + '"/><circle cx="42.2" cy="48.6" r="1.2" fill="#fff"/><circle cx="60.2" cy="48.6" r="1.2" fill="#fff"/>' +
    '<ellipse cx="34" cy="58" rx="4.5" ry="2.6" fill="#ff8fa8" opacity=".6"/><ellipse cx="66" cy="58" rx="4.5" ry="2.6" fill="#ff8fa8" opacity=".6"/>' +
    '<path d="M44 60 Q50 66 56 60" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/></svg>';
  // 团子球：软糯白团子 + 粉色漩涡
  var BALL_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="40" fill="#fffaf2"' + SW + '/>' +
    '<path d="M24 34 Q50 10 76 34 Q62 28 54 36 Q46 26 38 36 Q32 28 24 34Z" fill="#ff9fbd"/><path d="M50 22 Q62 22 60 32 Q58 38 50 36" fill="none" stroke="#ff6f99" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="39" cy="55" r="4.6" fill="' + INK + '"/><circle cx="61" cy="55" r="4.6" fill="' + INK + '"/><circle cx="40.5" cy="53.5" r="1.6" fill="#fff"/><circle cx="62.5" cy="53.5" r="1.6" fill="#fff"/><path d="M45 64 Q50 69 55 64" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<ellipse cx="32" cy="64" rx="5" ry="3" fill="#ff8fa8" opacity=".6"/><ellipse cx="68" cy="64" rx="5" ry="3" fill="#ff8fa8" opacity=".6"/></svg>';
  var SHUTTLE_SVG = '<svg viewBox="0 0 60 60" aria-hidden="true"><g' + SW + '><path d="M12 4 L48 4 L38 38 L22 38Z" fill="#fff"/>' +
    '<path d="M21 5 L27 37 M30 5 L30 37 M39 5 L33 37" stroke-width="1.5" stroke="#b9b2c4"/><path d="M15 16 L45 16" stroke-width="2.2" stroke="#e5484d"/>' +
    '<path d="M21 38 H39 V42 A9 9 0 0 1 21 42Z" fill="#ffd7a8"/></g></svg>';

  /* ===================== 样式 ===================== */
  var CSS = [
    '.eng-wrap{width:var(--bw,min(92vw,560px));min-width:min(94vw,380px);margin:0 auto;color:#2b2340;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;--eng-f:clamp(17px,calc(var(--bw,min(92vw,560px))*.045),26px)}',
    '.eng-stop{font-family:inherit;color:inherit}',
    '.eng-top{display:flex;align-items:center;gap:8px;margin:0 0 10px;min-height:56px}',
    '.eng-ttl{flex:1;font-weight:900;font-size:calc(var(--eng-f)*1.1);line-height:1.15}',
    '.eng-ttl small{display:block;font-size:.62em;font-weight:700;color:#7a6f86}',
    '.eng-chip{display:inline-flex;align-items:center;gap:4px;background:#fff;border:2.5px solid #2b2340;border-radius:999px;padding:4px 12px;font-weight:900;box-shadow:2px 2px 0 #2b2340;white-space:nowrap}',
    '.eng-btn{appearance:none;-webkit-appearance:none;font-family:inherit;color:#2b2340;border:3px solid #2b2340;background:#fff;border-radius:16px;min-height:56px;min-width:56px;font-weight:900;font-size:var(--eng-f);box-shadow:3px 3px 0 #2b2340;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 14px;transition:transform .08s,box-shadow .08s,opacity .2s,background .2s;touch-action:manipulation}',
    '.eng-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #2b2340}',
    '.eng-btn.eng-go{background:#ffc53d}',
    '.eng-btn.eng-ghost{background:#fff7ec}',
    '.eng-panel{position:relative;border:3.5px solid #2b2340;border-radius:16px 11px 18px 10px;box-shadow:5px 5px 0 #2b2340;overflow:hidden;background:linear-gradient(170deg,var(--eng-a,#fff3d6),var(--eng-b,#ffd9a8));aspect-ratio:16/10.5;margin:0 0 16px}',
    '.eng-panel::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(43,35,64,.09) 1.3px,transparent 1.6px);background-size:12px 12px;pointer-events:none}',
    '.eng-props{position:absolute;right:4%;top:3%;font-size:calc(var(--eng-f)*1.4);opacity:.45;letter-spacing:4px;pointer-events:none}',
    '.eng-tz{position:absolute;display:block;left:2%;bottom:0;width:24%;line-height:0}',
    '.eng-tz svg,.eng-mon svg,.eng-ball svg,.eng-mc svg,.eng-dot svg,.eng-shut svg,.eng-me svg{width:100%;height:auto;display:block;overflow:visible}',
    '.eng-mon{position:absolute;display:block;right:5%;bottom:5%;width:31%;line-height:0;animation:eng-bob 2.4s ease-in-out infinite}',
    '.eng-mon.eng-in{animation:eng-popin .45s cubic-bezier(.2,.8,.3,1.3) both,eng-bob 2.4s ease-in-out .45s infinite}',
    '.eng-mon.eng-sucked{animation:eng-suck .45s ease-in forwards}',
    '.eng-card{position:absolute;right:28%;bottom:16%;width:24%;aspect-ratio:1;background:#fff;border:3px solid #2b2340;border-radius:14px;box-shadow:3px 3px 0 #2b2340;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-6deg);z-index:2}',
    '.eng-card b{font-size:calc(var(--eng-f)*2.4);line-height:1}',
    '.eng-card i{font-style:normal;font-size:calc(var(--eng-f)*.7);font-weight:800;color:#7a6f86;margin-top:3px}',
    '.eng-card.eng-q b{font-size:calc(var(--eng-f)*2.6);color:#8b5cf6;font-weight:900}',
    '.eng-sw{display:inline-block;width:1.15em;height:1.15em;border-radius:50%;border:3px solid #2b2340;vertical-align:middle;box-shadow:inset -4px -4px 0 rgba(0,0,0,.12)}',
    '.eng-bub{position:absolute;left:24%;top:5%;max-width:54%;background:#fff;border:3px solid #2b2340;border-radius:20px;padding:8px 12px;box-shadow:3px 3px 0 #2b2340;z-index:3;text-align:center}',
    '.eng-bub::after{content:"";position:absolute;left:18px;bottom:-13px;border:7px solid transparent;border-top:9px solid #2b2340}',
    '.eng-bub.eng-r::after{left:auto;right:20px}',
    '.eng-say{display:inline-flex;align-items:center;gap:6px;font-weight:900;font-size:calc(var(--eng-f)*1.15);cursor:pointer;line-height:1.2;font-family:"Comic Sans MS","Chalkboard SE","Marker Felt",ui-rounded,system-ui,sans-serif;letter-spacing:.01em}',
    '.eng-say::after{content:"🔊";font-size:.72em;opacity:.8}',
    '.eng-zh{display:block;font-size:calc(var(--eng-f)*.78);color:#7a6f86;font-weight:800;margin-top:2px}',
    '.eng-ear{font-size:calc(var(--eng-f)*1.6);line-height:1}',
    '.eng-ex{display:block;margin-top:5px;padding-top:5px;border-top:2px dashed #e2d6c4;font-weight:800;font-size:calc(var(--eng-f)*.8);line-height:1.3;color:#3a3150;cursor:pointer;font-family:"Comic Sans MS","Chalkboard SE","Marker Felt",ui-rounded,system-ui,sans-serif;opacity:0;animation:eng-fade .35s ease-out .9s forwards}',
    '.eng-ex::after{content:" 🔊";font-size:.8em;opacity:.75}',
    '.eng-ex b{color:#e5484d;background:#fff1b8;border-radius:6px;padding:0 3px}',
    '.eng-ex .eng-blank{display:inline-block;min-width:2.4em;border-bottom:3px solid #8b5cf6;height:.9em;vertical-align:baseline}',
    '.eng-ex.eng-now{opacity:1;animation:none}',
    '.eng-steps{display:flex;gap:6px}',
    '.eng-step{width:40px;height:40px;border-radius:10px;border:2.5px solid #2b2340;background:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;opacity:.45}',
    '.eng-step.eng-on{opacity:1;background:#ffc53d;transform:rotate(-4deg) scale(1.08);box-shadow:2px 2px 0 #2b2340}',
    '.eng-step.eng-ok{opacity:1;background:#bdf0cf}',
    '.eng-pips{display:flex;justify-content:center;gap:6px;margin:-6px 0 12px}',
    '.eng-pip{width:12px;height:12px;border-radius:50%;background:#e9dcc8;border:2px solid #2b2340}',
    '.eng-pip.eng-ok{background:#22a06b}.eng-pip.eng-miss{background:#ffc53d}.eng-pip.eng-now{transform:scale(1.35);background:#fff}',
    '.eng-opts{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    '.eng-opts.eng-one{grid-template-columns:1fr}',
    '.eng-opt{min-height:76px;font-size:calc(var(--eng-f)*1.15);border-radius:18px;padding:8px 10px;line-height:1.2;font-family:"Comic Sans MS","Chalkboard SE","Marker Felt",ui-rounded,system-ui,sans-serif}',
    '.eng-opt.eng-pic{font-size:calc(var(--eng-f)*2.4);min-height:96px}',
    '.eng-opt.eng-pic .eng-sw{width:1em;height:1em}',
    '.eng-opt.eng-yes{background:#bdf0cf;animation:eng-glow .5s ease-in-out 3 alternate}',
    '.eng-opt.eng-no{background:#ffe6e6;animation:eng-wob .4s ease-in-out}',
    '.eng-opt.eng-dim{opacity:.22;pointer-events:none}',
    '.eng-opt.eng-hl{animation:eng-glow .45s ease-in-out infinite alternate;background:#fff4c4}',
    '.eng-opts.eng-wait .eng-opt{pointer-events:none}',
    '.eng-bar{display:flex;justify-content:center;gap:10px;margin:0 0 12px}',
    '.eng-fx{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);z-index:6;font-weight:900;font-size:calc(var(--eng-f)*1.6);color:#fff;-webkit-text-stroke:2px #2b2340;text-shadow:3px 3px 0 #2b2340;white-space:nowrap;animation:eng-fx 1.1s ease-out forwards;pointer-events:none}',
    '.eng-fx.eng-soft{color:#ffc53d;font-size:calc(var(--eng-f)*1.25)}',
    '.eng-ball{position:absolute;width:13%;z-index:5;line-height:0;left:20%;top:62%;transform:translate(-50%,-50%)}',
    '.eng-ball.eng-throw{animation:eng-throw .6s cubic-bezier(.3,.6,.5,1) forwards}',
    '.eng-ball.eng-wig{left:72%;top:58%;animation:eng-wig .5s ease-in-out 2}',
    '.eng-spark{position:absolute;width:10px;height:10px;border-radius:3px;z-index:6;pointer-events:none;animation:eng-burst .8s ease-out forwards}',
    /* 句子拼拼乐 */
    '.eng-bpanel{aspect-ratio:auto;padding:12px 12px 0;display:flex;flex-direction:column;gap:10px}',
    '.eng-note{position:relative;align-self:center;background:#fff7b8;border:3px solid #2b2340;border-radius:6px;padding:6px 14px;font-weight:900;font-size:var(--eng-f);transform:rotate(-1.5deg);box-shadow:2px 2px 0 #2b2340;z-index:1}',
    '.eng-sbub{position:relative;background:#fff;border:3px solid #2b2340;border-radius:22px;padding:10px;min-height:74px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;box-shadow:3px 3px 0 #2b2340;z-index:1}',
    '.eng-sbub::after{content:"";position:absolute;left:14%;bottom:-15px;border:8px solid transparent;border-top:10px solid #2b2340}',
    '.eng-sbub.eng-good{background:#e3f7ea}.eng-sbub.eng-bad{background:#fff4c4}',
    '.eng-cast{display:flex;justify-content:space-between;align-items:flex-end;height:clamp(80px,22vw,130px);margin-top:4px;position:relative;z-index:1}',
    '.eng-cast .eng-tz,.eng-cast .eng-mon{position:static;width:auto;height:100%;aspect-ratio:100/130;animation:none}',
    '.eng-cast .eng-mon{aspect-ratio:1;animation:eng-bob 2.4s ease-in-out infinite}',
    '.eng-cast .eng-tz svg,.eng-cast .eng-mon svg{height:100%;width:auto}',
    '.eng-slot{min-width:52px;height:52px;border:3px dashed #b9aac9;border-radius:12px}',
    '.eng-tiles{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:0 0 12px}',
    '.eng-tile{background:#fff3c9;font-size:calc(var(--eng-f)*1.1);padding:6px 14px;font-family:"Comic Sans MS","Chalkboard SE","Marker Felt",ui-rounded,system-ui,sans-serif}',
    '.eng-tile.eng-used{visibility:hidden}',
    '.eng-tile.eng-inl{background:#dff3ff;animation:eng-popin .22s ease-out}',
    '.eng-tile.eng-fix{background:#ffd9d9}',
    '.eng-tile.eng-hl{animation:eng-glow .45s ease-in-out 4 alternate}',
    '.eng-answer{display:block;width:100%;text-align:center;font-weight:900;font-size:calc(var(--eng-f)*.9);color:#22a06b;margin-top:2px}',
    /* 羽毛球 */
    '.eng-court{background:linear-gradient(180deg,#bfe8ff 0 34%,#5cc38a 34% 100%)}',
    '.eng-court::after{content:"";position:absolute;left:4%;right:4%;top:52%;bottom:6%;border:3px solid rgba(255,255,255,.9);border-radius:4px;pointer-events:none}',
    '.eng-net{position:absolute;left:49%;width:2%;top:40%;bottom:6%;background:repeating-linear-gradient(0deg,#fff 0 3px,transparent 3px 8px),repeating-linear-gradient(90deg,#fff 0 2px,transparent 2px 6px);border-top:5px solid #fff;z-index:2}',
    '.eng-court .eng-tz{width:21%;left:6%}',
    '.eng-court .eng-mon{width:24%;right:6%;bottom:6%}',
    '.eng-tz.eng-swing{animation:eng-swing .35s ease-out}',
    '.eng-shut{position:absolute;width:8%;z-index:4;transform:translate(-50%,-50%) rotate(70deg);transition:left .06s linear,top .06s linear;line-height:0}',
    '.eng-shut.eng-back{transition:left .5s ease-out,top .5s ease-out;transform:translate(-50%,-50%) rotate(-70deg)}',
    '.eng-shut.eng-down{transition:none;transform:translate(-50%,-50%) rotate(10deg)}',
    '.eng-score{position:absolute;left:3%;top:4%;z-index:3}',
    '.eng-feath{display:flex;gap:3px}',
    '.eng-feath i{font-style:normal;font-size:calc(var(--eng-f)*.9);opacity:.25;filter:grayscale(1)}',
    '.eng-feath i.eng-ok{opacity:1;filter:none}',
    '.eng-court .eng-bub{left:auto;right:4%;top:4%;max-width:60%}',
    /* 地图 */
    '.eng-map{position:relative;aspect-ratio:1/1.08;border:3.5px solid #2b2340;border-radius:22px;box-shadow:5px 5px 0 #2b2340;background:radial-gradient(circle at 20% 15%,#fff8e1,#ffe9b8 70%,#ffdb94);overflow:hidden;margin:0 0 12px}',
    '.eng-map::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(43,35,64,.07) 1.3px,transparent 1.6px);background-size:14px 14px}',
    '.eng-map>svg{position:absolute;inset:0;width:100%;height:100%}',
    '.eng-stop{position:absolute;width:23%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:0;padding:0;cursor:pointer;min-height:56px}',
    '.eng-dot{width:72%;aspect-ratio:1;border-radius:50%;border:3.5px solid #2b2340;background:#fff;box-shadow:3px 3px 0 #2b2340;display:flex;align-items:center;justify-content:center;font-size:calc(var(--eng-f)*1.5);position:relative;padding:6%}',
    '.eng-dot em{position:absolute;left:-8%;top:-8%;width:42%;aspect-ratio:1;border-radius:50%;background:#8b5cf6;color:#fff;font-style:normal;font-size:calc(var(--eng-f)*.62);font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #2b2340}',
    '.eng-stop.eng-lock .eng-dot{background:#e9e2d6;filter:grayscale(.7)}',
    '.eng-stop.eng-done .eng-dot{background:#fff}',
    '.eng-stop.eng-next .eng-dot{background:#fff4c4;animation:eng-pulse 1.2s ease-in-out infinite}',
    '.eng-lbl{font-weight:900;font-size:calc(var(--eng-f)*.62);background:#fff;border:2px solid #2b2340;border-radius:8px;padding:1px 6px;white-space:nowrap;max-width:118%;overflow:hidden;text-overflow:ellipsis}',
    '.eng-st{font-size:calc(var(--eng-f)*.62);letter-spacing:-1px;min-height:1.1em}',
    /* 团子站在当前站圆点的右侧，不再盖住站名（原来 bob 动画覆盖了 translate，导致小人下移压住标签） */
    '.eng-me{position:absolute;right:-44%;bottom:6%;width:56%;z-index:3;pointer-events:none;animation:eng-bob 1.6s ease-in-out infinite;line-height:0}',
    '.eng-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}',
    '.eng-par{font-size:13px;min-height:36px;padding:4px 10px;border-width:2px;box-shadow:2px 2px 0 #2b2340;border-radius:10px;color:#7a6f86;font-weight:700}',
    '.eng-par.eng-on{background:#e3f7ea;color:#22a06b}',
    /* 图鉴 & 抓到 */
    '.eng-dex{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 12px}',
    '.eng-mc{background:#fff;border:3px solid #2b2340;border-radius:16px;box-shadow:3px 3px 0 #2b2340;padding:8px 6px 6px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;min-height:56px}',
    '.eng-mc .eng-art{width:78%;line-height:0}',
    '.eng-mc b{font-size:calc(var(--eng-f)*.72)}',
    '.eng-mc .eng-say{font-size:calc(var(--eng-f)*.62)}',
    '.eng-mc small{font-size:12px;color:#7a6f86;font-weight:700}',
    '.eng-mc.eng-new{background:#fff4c4;animation:eng-popin .5s cubic-bezier(.2,.8,.3,1.3)}',
    '.eng-sil svg{filter:brightness(0);opacity:.16}',
    '.eng-catch{aspect-ratio:auto;padding:14px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}',
    '.eng-catch .eng-big{width:46%;line-height:0;position:relative;z-index:1;animation:eng-popin .6s cubic-bezier(.2,.8,.3,1.3) .5s both}',
    '.eng-catch .eng-big svg{width:100%;height:auto}',
    '.eng-catch .eng-ball{position:relative;left:auto;top:auto;transform:none;width:16%;animation:eng-wig .4s ease-in-out 2}',
    '.eng-name{background:#fff;border:3px solid #2b2340;border-radius:14px;padding:6px 16px;box-shadow:3px 3px 0 #2b2340;position:relative;z-index:1}',
    '.eng-name b{display:block;font-size:calc(var(--eng-f)*1.1)}',
    '.eng-stars{font-size:calc(var(--eng-f)*1.6);letter-spacing:2px;position:relative;z-index:1}',
    '.eng-stars i{font-style:normal;display:inline-block;animation:eng-popin .4s cubic-bezier(.2,.8,.3,1.3) both}',
    '.eng-stars i.eng-off{filter:grayscale(1);opacity:.25}',
    '.eng-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;position:relative;z-index:1}',
    '.eng-intro{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center}',
    '.eng-intro .eng-ic{font-size:calc(var(--eng-f)*3.2);line-height:1;animation:eng-popin .5s cubic-bezier(.2,.8,.3,1.3)}',
    '.eng-intro b{font-size:calc(var(--eng-f)*1.4);position:relative}',
    '.eng-intro span{font-size:calc(var(--eng-f)*.9);color:#5a5070;font-weight:800;position:relative}',
    '.eng-demo .eng-act{pointer-events:none}',
    '@keyframes eng-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
    '@keyframes eng-popin{0%{transform:scale(.3);opacity:0}70%{transform:scale(1.1);opacity:1}100%{transform:scale(1)}}',
    '@keyframes eng-suck{to{transform:scale(.05) translateY(40px);opacity:0}}',
    '@keyframes eng-throw{0%{left:20%;top:64%;transform:translate(-50%,-50%) scale(.6) rotate(0)}50%{top:16%}100%{left:72%;top:58%;transform:translate(-50%,-50%) scale(1) rotate(540deg)}}',
    '@keyframes eng-wig{0%,100%{transform:translate(-50%,-50%) rotate(0)}25%{transform:translate(-50%,-50%) rotate(-16deg)}75%{transform:translate(-50%,-50%) rotate(16deg)}}',
    '.eng-catch .eng-ball{animation-name:eng-wig2}',
    '@keyframes eng-wig2{0%,100%{transform:rotate(0)}25%{transform:rotate(-16deg)}75%{transform:rotate(16deg)}}',
    '@keyframes eng-glow{from{box-shadow:0 0 0 2px rgba(34,160,107,.35),3px 3px 0 #2b2340}to{box-shadow:0 0 0 7px #22a06b,3px 3px 0 #2b2340}}',
    '@keyframes eng-wob{0%,100%{transform:translateX(0)}30%{transform:translateX(-5px) rotate(-1.5deg)}70%{transform:translateX(5px) rotate(1.5deg)}}',
    '@keyframes eng-fx{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}25%{transform:translate(-50%,-50%) scale(1.12);opacity:1}75%{opacity:1}100%{transform:translate(-50%,-90%) scale(1);opacity:0}}',
    '@keyframes eng-burst{from{transform:translate(0,0);opacity:1}to{transform:translate(var(--dx),var(--dy)) rotate(240deg);opacity:0}}',
    '@keyframes eng-swing{0%{transform:rotate(0)}40%{transform:rotate(-14deg)}100%{transform:rotate(0)}}',
    '@keyframes eng-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}',
    '@keyframes eng-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}',
    '@media (prefers-reduced-motion:reduce){.eng-wrap *{animation-duration:.01s!important;animation-iteration-count:1!important}}'
  ].join('\n');
  function injectCss() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.querySelector && document.querySelector('style[data-eng-css]')) return;
    var st = document.createElement('style'); st.setAttribute('data-eng-css', '1'); st.textContent = CSS; document.head.appendChild(st);
  }
  function h(tag, cls, txt, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (parent) parent.appendChild(e); return e; }
  function btn(cls, a, i, parent, txt) {
    var b = h('button', 'eng-act eng-btn ' + (cls || ''), txt, parent); b.type = 'button'; b.setAttribute('data-a', a);
    if (i != null) b.setAttribute('data-i', String(i));
    return b;
  }
  function art(cls, svg, parent) { var s = h('span', cls, null, parent); s.innerHTML = svg; return s; }
  function sayEl(text, parent, cls) { var s = h('span', 'eng-act eng-say' + (cls ? ' ' + cls : ''), text, parent); s.setAttribute('data-a', 'say'); s.setAttribute('data-t', text); return s; }
  function picEl(pic, parent) {
    if (pic.charAt(0) === '#') { var s = h('span', 'eng-sw', null, parent); s.style.background = pic; return s; }
    return h('span', '', pic, parent);
  }
  var ROUND_INFO = [['🎯', '单词捕捉', '听单词，点对的答案'], ['🧩', '句子拼拼乐', '点单词块，排成一句话'], ['🏸', '羽毛球对打', '球落地前，点对的回答']];
  var CHEER = ['太棒了！', 'Great!', '真厉害！', 'Good job!', '漂亮！', 'Yes!'];
  var SOFT = ['差一点点～', '没关系，记住它！', '下次一定行！'];
  // 地图站点坐标（蛇形三行）
  var STOPS = [[17, 15], [50, 15], [83, 15], [83, 47], [50, 47], [17, 47], [17, 79], [50, 79], [83, 79]];

  /* ===================== 视图（对局和演示共用） ===================== */
  function createView(el, demo) {
    injectCss();
    el.innerHTML = '';
    var wrap = h('div', 'eng-wrap' + (demo ? ' eng-demo' : ''), null, el);
    var top = h('div', 'eng-top', null, wrap), bodyEl = h('div', 'eng-body', null, wrap);
    var V = { wrap: wrap, top: top, body: bodyEl, refs: {} };
    function clear() { top.innerHTML = ''; bodyEl.innerHTML = ''; V.refs = {}; }
    function scenePanel(si, cls, parent) {
      var sc = SCENES[si], p = h('div', 'eng-panel ' + (cls || ''), null, parent || bodyEl);
      p.style.setProperty('--eng-a', sc.bg[0]); p.style.setProperty('--eng-b', sc.bg[1]);
      h('div', 'eng-props', sc.props, p);
      return p;
    }
    function sceneTop(S) {
      btn('eng-ghost', 'map', null, top, '🗺️');
      var t = h('div', 'eng-ttl', null, top); h('span', '', '第 ' + (S.si + 1) + ' 站 · ' + SCENES[S.si].zh, t);
      h('small', '', SCENES[S.si].les + ' · ' + LEVELS[S.level].name, t);
      var st = h('div', 'eng-steps', null, top);
      for (var r = 0; r < 3; r++) h('span', 'eng-step' + (r === S.r ? ' eng-on' : r < S.r ? ' eng-ok' : ''), ROUND_INFO[r][0], st);
    }
    function pips(S) {
      var n = S.roundSize(), row = h('div', 'eng-pips', null, bodyEl), done = S.r === 2 ? S.hits : n - S.queue.length;
      for (var i = 0; i < n; i++) h('span', 'eng-pip' + (i < done ? ' eng-ok' : i === done ? ' eng-now' : ''), null, row);
    }
    V.map = function (prog, level) {
      clear();
      var t = h('div', 'eng-ttl', '团子英语冒险', top); h('small', '', '等级：' + LEVELS[level].name, t);
      h('span', 'eng-chip', '⭐ ' + totalStars(prog), top);
      btn('', 'dex', null, top, '📖 图鉴');
      var map = h('div', 'eng-map', null, bodyEl);
      var path = 'M' + STOPS.map(function (p) { return p[0] + ' ' + (p[1] / 1.08).toFixed(1); }).join(' L');
      art('', '<svg viewBox="0 0 100 92.6" preserveAspectRatio="none" width="100%" height="100%" style="display:block"><path d="' + path + '" fill="none" stroke="#c98b4a" stroke-width="2.4" stroke-dasharray="3 3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>', map).style.cssText = 'position:absolute;inset:0';
      var nx = nextScene(prog), refs = [], dots = [];
      for (var i = 0; i < SCENES.length; i++) {
        var un = isUnlocked(prog, i), s = prog.stars[i];
        var b = btn((un ? '' : 'eng-lock ') + (s ? 'eng-done ' : '') + (i === nx ? 'eng-next' : ''), 'scene', i, map);
        b.className = 'eng-act eng-stop' + (un ? '' : ' eng-lock') + (s ? ' eng-done' : '') + (i === nx ? ' eng-next' : '');
        b.style.left = STOPS[i][0] + '%'; b.style.top = STOPS[i][1] + '%';
        var d = h('span', 'eng-dot', null, b); dots.push(d);
        if (s) art('', monSvg(i), d).style.cssText = 'width:100%;line-height:0';
        else h('span', '', un ? SCENES[i].ico : '🔒', d);
        h('em', '', String(i + 1), d);
        h('span', 'eng-lbl', SCENES[i].zh, b);
        h('span', 'eng-st', s ? new Array(s + 1).join('⭐') : '', b);
        refs.push(b);
      }
      var at = nx >= 0 ? nx : SCENES.length - 1;
      var me = art('eng-me', TZ_SVG, dots[at]);
      var foot = h('div', 'eng-foot', null, bodyEl);
      h('span', 'eng-chip', '📖 已抓到 ' + MONSTERS.filter(function (m, k) { return isCaught(prog, k); }).length + '/' + MONSTERS.length, foot);
      var par = btn('eng-par' + (prog.all ? ' eng-on' : ''), 'all', null, foot, (prog.all ? '☑ ' : '☐ ') + '家长：全部解锁');
      V.refs = { stops: refs, par: par, map: map, me: me };
    };
    V.dex = function (prog, fresh) {
      clear();
      btn('eng-ghost', 'map', null, top, '🗺️');
      var t = h('div', 'eng-ttl', '团团兽图鉴', top); h('small', '', '抓到 ' + MONSTERS.filter(function (m, k) { return isCaught(prog, k); }).length + ' / ' + MONSTERS.length, t);
      var g = h('div', 'eng-dex', null, bodyEl);
      MONSTERS.forEach(function (M, k) {
        var got = isCaught(prog, k), c = h('div', 'eng-mc' + (fresh && fresh.indexOf(k) >= 0 ? ' eng-new' : ''), null, g);
        art('eng-art' + (got ? '' : ' eng-sil'), monSvg(k), c);
        if (got) sayEl(M.en, c);
        else { h('b', '', '？？？', c); h('small', '', k < 9 ? '第 ' + (k + 1) + ' 站' : '集满 ' + M.need + ' ⭐', c); }
      });
      var row = h('div', 'eng-row', null, bodyEl); btn('eng-go', 'map', null, row, '🗺️ 回地图');
    };
    V.intro = function (S) {
      clear(); sceneTop(S);
      var info = ROUND_INFO[S.r], p = scenePanel(S.si, 'eng-intro');
      h('div', 'eng-ic', info[0], p); h('b', '', '第 ' + (S.r + 1) + ' 格 · ' + info[1], p); h('span', '', info[2], p);
      var row = h('div', 'eng-row', null, bodyEl); btn('eng-go', 'go', null, row, '开始！');
    };
    V.word = function (S, fx) {
      clear(); sceneTop(S); fx = fx || {};
      var q = S.q, it = q.item, p = scenePanel(S.si);
      art('eng-tz', TZ_SVG, p);
      var mon = art('eng-mon' + (fx.enter ? ' eng-in' : ''), monSvg(S.si), p);
      var card = h('div', 'eng-card' + (q.type === 'listen' ? ' eng-q' : ''), null, p);
      if (q.type === 'word') picEl(it.pic, h('b', '', null, card));
      else h('b', '', '?', card);
      var bub = h('div', 'eng-bub', null, p);
      if (q.type === 'pic') sayEl(it.en, bub);
      else { var e = h('span', 'eng-act eng-ear', '🔊', bub); e.setAttribute('data-a', 'again'); h('span', 'eng-zh', q.type === 'word' ? '点对的英语' : '听一听', bub); }
      var ex = h('span', 'eng-act eng-ex' + (fx.exNow ? ' eng-now' : ''), null, bub); ex.setAttribute('data-a', 'ex');
      V.fillEx(ex, q);
      pips(S);
      var opts = h('div', 'eng-opts', null, bodyEl), ob = [];
      q.options.forEach(function (o, i) {
        var b = btn('eng-opt' + (q.type === 'word' ? '' : ' eng-pic') + (q.dim[i] ? ' eng-dim' : ''), 'opt', i, opts);
        if (q.type === 'word') b.textContent = o.en; else picEl(o.pic, b);
        ob.push(b);
      });
      V.refs = { panel: p, mon: mon, card: card, opts: opts, ob: ob, bub: bub, ex: ex };
    };
    // 例句：目标词高亮；「看图选英语」题在答完前把目标词留空，免得直接看到答案
    V.fillEx = function (ex, q) {
      if (!ex) return;
      ex.textContent = '';
      var it = q.item, parts = exParts(it.ex, it.en) || [it.ex, '', ''];
      if (parts[0]) h('span', '', parts[0], ex);
      if (parts[1]) { if (q.type === 'word' && !q.finished) h('span', 'eng-blank', null, ex); else h('b', '', parts[1], ex); }
      if (parts[2]) h('span', '', parts[2], ex);
    };
    V.revealEx = function (q) { var ex = V.refs.ex; if (!ex) return; ex.className = 'eng-act eng-ex eng-now'; V.fillEx(ex, q); };
    V.build = function (S, fx) {
      clear(); sceneTop(S); fx = fx || {};
      var q = S.q, p = scenePanel(S.si, 'eng-bpanel');
      if (q.cue || q.showCue) h('div', 'eng-note', '💬 ' + q.item.cue, p);
      else { var zb = btn('eng-note', 'cue', null, p, '💡 看图提示'); zb.style.boxShadow = '2px 2px 0 #2b2340'; }
      var sb = h('div', 'eng-sbub' + (fx.good ? ' eng-good' : fx.bad ? ' eng-bad' : ''), null, p), lineB = [];
      q.line.forEach(function (k, pos) {
        var b = btn('eng-tile eng-inl' + (fx.bad && fx.wrongAt != null && pos >= fx.wrongAt ? ' eng-fix' : ''), 'untile', pos, sb, q.pool[k].t); lineB.push(b);
      });
      for (var s = q.line.length; s < q.answer.length; s++) h('span', 'eng-slot', null, sb);
      if (fx.bad) h('span', 'eng-answer', '✔ ' + q.answer.join(' '), sb);
      var cast = h('div', 'eng-cast', null, p); art('eng-tz', TZ_SVG, cast); art('eng-mon', monSvg(S.si), cast);
      pips(S);
      var bar = h('div', 'eng-bar', null, bodyEl); btn('', 'again', null, bar, '🔊 听一听');
      var tiles = h('div', 'eng-tiles', null, bodyEl), tb = [];
      q.pool.forEach(function (t, k) { tb.push(btn('eng-tile' + (t.used ? ' eng-used' : '') + (fx.hl === k ? ' eng-hl' : ''), 'tile', k, tiles, t.t)); });
      V.refs = { panel: p, sbub: sb, tiles: tiles, tb: tb, lineB: lineB };
    };
    V.rally = function (S, fx) {
      clear(); sceneTop(S); fx = fx || {};
      var q = S.q, p = scenePanel(S.si, 'eng-court');
      h('div', 'eng-net', null, p);
      var tz = art('eng-tz', TZ_SVG, p), mon = art('eng-mon', monSvg(S.si), p);
      var sc = h('div', 'eng-score eng-chip', null, p); var fe = h('span', 'eng-feath', null, sc);
      for (var i = 0; i < RALLY_WIN; i++) h('i', i < S.hits ? 'eng-ok' : '', '🏸', fe);
      var bub = h('div', 'eng-bub eng-r', null, p); sayEl(q.item.q, bub); if (q.cue) h('span', 'eng-zh', q.item.cue, bub);
      var sh = art('eng-shut', SHUTTLE_SVG, p); sh.style.left = '78%'; sh.style.top = '52%';
      var opts = h('div', 'eng-opts eng-one', null, bodyEl), ob = [];
      q.options.forEach(function (o, k) { ob.push(btn('eng-opt' + (q.wrong[k] ? ' eng-dim' : ''), 'reply', k, opts, o)); });
      V.refs = { panel: p, tz: tz, mon: mon, shut: sh, opts: opts, ob: ob, feath: fe };
    };
    V.caught = function (si, stars, res, level) {
      clear();
      var t = h('div', 'eng-ttl', '第 ' + (si + 1) + ' 站完成！', top); h('small', '', SCENES[si].zh + ' · ' + LEVELS[level].name, t);
      var p = scenePanel(si, 'eng-catch'), M = MONSTERS[si];
      art('eng-ball', BALL_SVG, p);
      art('eng-big', monSvg(si), p);
      var nm = h('div', 'eng-name', null, p); h('b', '', '抓到了！', nm); sayEl(M.en, nm);
      var st = h('div', 'eng-stars', null, p);
      for (var i = 0; i < 3; i++) { var s = h('i', i < stars ? '' : 'eng-off', '⭐', st); s.style.animationDelay = (0.9 + i * 0.25) + 's'; }
      if (res && res.bonus && res.bonus.length) h('div', 'eng-name', '🎁 还抓到了 ' + res.bonus.map(function (m) { return MONSTERS[m].en; }).join(', ') + '！', p);
      var row = h('div', 'eng-row', null, bodyEl);
      btn('eng-ghost', 'map', null, row, '🗺️ 地图'); btn('', 'dex', null, row, '📖 图鉴');
      if (si + 1 < SCENES.length) btn('eng-go', 'scene', si + 1, row, '下一站 ▶');
      V.refs = { panel: p };
    };
    V.fx = function (text, soft) {
      var p = V.refs.panel; if (!p) return;
      h('div', 'eng-fx' + (soft ? ' eng-soft' : ''), text, p);
    };
    V.throwBall = function () {
      var p = V.refs.panel; if (!p) return;
      var b = art('eng-ball eng-throw', BALL_SVG, p);
      V.refs.ball = b;
      return b;
    };
    V.capture = function () {
      var r = V.refs; if (r.mon) r.mon.className = 'eng-mon eng-sucked';
      if (r.ball) r.ball.className = 'eng-ball eng-wig';
      var p = r.panel; if (!p) return;
      var cols = ['#e5484d', '#ffc53d', '#22a06b', '#3b82f6', '#8b5cf6', '#ff8a3d'];
      for (var k = 0; k < 12; k++) {
        var sp = h('span', 'eng-spark', null, p), a = k / 12 * Math.PI * 2;
        sp.style.left = '72%'; sp.style.top = '58%'; sp.style.background = cols[k % 6];
        sp.style.setProperty('--dx', (Math.cos(a) * 60).toFixed(0) + 'px'); sp.style.setProperty('--dy', (Math.sin(a) * 60).toFixed(0) + 'px');
      }
    };
    V.shuttleAt = function (prog) {
      var s = V.refs.shut; if (!s) return;
      var x = 78 - 58 * prog, y = 52 + 20 * prog - 40 * Math.sin(Math.PI * prog);
      s.style.left = x.toFixed(1) + '%'; s.style.top = y.toFixed(1) + '%';
    };
    V.clear = clear;
    return V;
  }

  /* ===================== 对局 ===================== */
  function mount(el, opts) {
    opts = opts || {};
    var level = Math.max(0, Math.min(3, opts.level | 0));
    var onStatus = opts.onStatus || function () {}, onEnd = opts.onEnd || function () {}, snd = opts.sound || function () {};
    var say = opts.speak || speak, rng = opts.rng || Math.random;
    // 依次读：外部传入 speak（测试）时逐条调用；否则用同一个 <audio> 排队播放
    var sayQ = opts.speak ? function (list) { list.forEach(function (t) { if (t) opts.speak(t); }); } : function (list) { return speakSeq(list); };
    var V = createView(el, false), prog = loadProgress();
    var screen = 'map', sub = '', S = null, timers = [], dead = false, lock = false, rally = null, lastFresh = null;

    function later(fn, ms) { var t = setTimeout(function () { var k = timers.indexOf(t); if (k >= 0) timers.splice(k, 1); if (!dead) fn(); }, ms); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; rally = null; }
    function hidden() { return typeof document !== 'undefined' && document.hidden; }
    function save() { saveProgress(prog); }
    function pickOne(a) { return a[(Math.random() * a.length) | 0]; }

    function showMap() {
      clearTimers(); screen = 'map'; sub = ''; S = null; lock = false;
      V.map(prog, level);
      var nx = nextScene(prog);
      onStatus(nx >= 0 ? '点亮着的第 ' + (nx + 1) + ' 站，开始冒险！' : '全部通关！可以再玩，拿更多 ⭐');
    }
    function showDex(fresh) { clearTimers(); screen = 'dex'; sub = ''; S = null; V.dex(prog, fresh || null); onStatus('这是你抓到的团团兽'); }
    function startScene(i) {
      if (!isUnlocked(prog, i)) { snd('illegal'); onStatus('先完成前面一站，这里就会亮起来'); return; }
      clearTimers(); snd('select');
      prog.session++; save();
      S = new Session(i, level, prog, rng); screen = 'scene';
      showIntro();
    }
    function showIntro() {
      sub = 'intro'; lock = false; V.intro(S);
      onStatus(ROUND_INFO[S.r][1] + ' · ' + ROUND_INFO[S.r][2]);
      later(beginRound, 1500);
    }
    function beginRound() { if (screen !== 'scene' || sub !== 'intro') return; sub = 'play'; present(true); }
    function present(enter) {
      lock = false;
      var q = S.q;
      if (q.kind === 'w') {
        V.word(S, { enter: enter !== false });
        onStatus(q.type === 'pic' ? '听一听，点对的图' : q.type === 'word' ? '看图，点对的英语' : '听声音，点对的图');
        later(function () { sayQ([q.item.en, q.item.ex]); }, 250);
      } else if (q.kind === 's') {
        V.build(S); onStatus('点单词块，排成一句英语');
        later(function () { say(q.item.en); }, 250);
      } else {
        V.rally(S); onStatus('🏸 ' + S.hits + '/' + RALLY_WIN + ' · 球落地前点对的回答');
        say(q.item.q);
        startShuttle();
      }
    }
    function advance(ms) {
      lock = true;
      later(function () {
        var r = S.next();
        if (r === 'done') finishScene();
        else if (r === 'round') showIntro();
        else present(true);
      }, ms);
    }
    // ---- 单词捕捉 ----
    function pickWord(i) {
      if (lock || !S || !S.q || S.q.kind !== 'w') return;
      var q = S.q, r = S.pick(i); if (!r) return;
      lock = true; V.refs.opts.className = 'eng-opts eng-wait';
      if (r.ok) {
        V.refs.ob[i].className += ' eng-yes'; snd('select'); V.revealEx(q); say(q.item.ex);
        V.throwBall();
        later(function () { V.capture(); snd('capture'); V.fx(pickOne(CHEER)); }, 600);
        onStatus('抓到啦！' + q.item.en);
        advance(2800);
      } else {
        V.refs.ob[i].className += ' eng-no'; V.refs.ob[r.answer].className += ' eng-yes';
        snd('illegal'); V.fx(pickOne(SOFT), true); V.revealEx(q); sayQ([q.item.en, q.item.ex]);
        onStatus('是这个哦：' + q.item.en + '，等会儿再来一次');
        advance(3600);
      }
    }
    // ---- 句子拼拼乐 ----
    function tapTile(k) {
      if (lock || !S || !S.q || S.q.kind !== 's') return;
      var r = S.place(k); if (!r) { snd('illegal'); return; }
      snd('move'); say(r.tile, 0.9);
      V.build(S);
      if (r.full) checkSentence();
    }
    function untile(pos) {
      if (lock || !S || !S.q || S.q.kind !== 's') return;
      if (S.unplace(pos)) { snd('select'); V.build(S); }
    }
    function checkSentence() {
      var q = S.q, wrongAt = 0;
      while (wrongAt < q.line.length && q.pool[q.line[wrongAt]].t === q.answer[wrongAt]) wrongAt++;
      var r = S.check(); if (!r) return;
      lock = true;
      if (r.ok) { V.build(S, { good: true }); V.fx(pickOne(CHEER)); snd('capture'); onStatus('说得对！' + q.item.en); }
      else { V.build(S, { bad: true, wrongAt: wrongAt }); V.fx(pickOne(SOFT), true); snd('illegal'); onStatus('正确的是：' + q.answer.join(' ') + '，等会儿再拼一次'); }
      later(function () { say(q.item.en); }, 200);
      advance(r.ok ? 2000 : 3000);
    }
    // ---- 羽毛球 ----
    function startShuttle() {
      var token = {}; rally = { p: 0, dur: LEVELS[level].shuttle, token: token };
      V.shuttleAt(0);
      function step() {
        if (!rally || rally.token !== token || lock) return;
        if (!hidden()) rally.p += 50 / rally.dur;
        if (rally.p >= 1) { landed(); return; }
        V.shuttleAt(rally.p);
        later(step, 50);
      }
      later(step, 350);
    }
    function reply(i) {
      if (lock || !S || !S.q || S.q.kind !== 'r') return;
      var q = S.q, r = S.reply(i); if (!r) return;
      if (r.ok) {
        lock = true; rally = null;
        V.refs.ob[i].className += ' eng-yes'; V.refs.opts.className = 'eng-opts eng-one eng-wait';
        V.refs.tz.className = 'eng-tz eng-swing'; V.refs.shut.className = 'eng-shut eng-back';
        V.refs.shut.style.left = '78%'; V.refs.shut.style.top = '40%';
        snd('move'); say(q.item.a); V.fx(S.hits >= RALLY_WIN ? '赢一分！' : pickOne(CHEER));
        var f = V.refs.feath.children; if (f && f[S.hits - 1]) f[S.hits - 1].className = 'eng-ok';
        onStatus('打回去了！🏸 ' + S.hits + '/' + RALLY_WIN);
        advance(1500);
      } else {
        V.refs.ob[i].className += ' eng-dim'; snd('illegal');
        onStatus('不是这句，快再选一个！');
      }
    }
    function landed() {
      if (!S || !S.q || S.q.kind !== 'r') return;
      var q = S.q, r = S.land(); if (!r) return;
      lock = true; rally = null;
      V.refs.shut.className = 'eng-shut eng-down'; V.shuttleAt(1);
      V.refs.ob[r.answer].className += ' eng-yes'; V.refs.opts.className = 'eng-opts eng-one eng-wait';
      snd('illegal'); V.fx('没接到～', true); say(q.item.a);
      onStatus('可以这样回答：' + q.item.a);
      advance(2600);
    }
    // ---- 完成 ----
    function finishScene() {
      var si = S.si, stars = S.stars(), res = recordScene(prog, si, stars); save();
      lastFresh = [si].concat(res.bonus);
      screen = 'caught'; sub = ''; lock = false;
      V.caught(si, stars, res, level);
      snd('capture');
      later(function () { say(MONSTERS[si].en); }, 700);
      var reason = capReason(si, stars);
      onStatus(reason);
      S = null;
      later(function () { onEnd({ winner: 'player', reason: reason }); }, 1600);
    }

    function act(a, i, elx) {
      if (dead) return;
      if (a === 'say') { var t = elx && elx.getAttribute ? elx.getAttribute('data-t') : i; if (t) { say(t); snd('select'); } return; }
      if (a === 'map') { snd('select'); showMap(); return; }
      if (a === 'dex') { snd('select'); showDex(lastFresh); lastFresh = null; return; }
      if (a === 'scene') { startScene(+i); return; }
      if (a === 'all') { prog.all = !prog.all; save(); snd('select'); showMap(); onStatus(prog.all ? '家长模式：全部站点已解锁' : '已恢复按顺序解锁'); return; }
      if (a === 'go') { beginRound(); return; }
      if (a === 'again') { if (S && S.q) { if (S.q.kind === 'w') sayQ([S.q.item.en, S.q.item.ex]); else say(S.q.kind === 'r' ? S.q.item.q : S.q.item.en); snd('select'); } return; }
      if (a === 'ex') { if (S && S.q && S.q.kind === 'w') { say(S.q.item.ex); snd('select'); } return; }
      if (a === 'cue') { if (S && S.q && S.q.kind === 's') { S.q.showCue = true; V.build(S); snd('select'); } return; }
      if (a === 'opt') return pickWord(+i);
      if (a === 'tile') return tapTile(+i);
      if (a === 'untile') return untile(+i);
      if (a === 'reply') return reply(+i);
    }
    function onClick(e) {
      var b = e.target && e.target.closest ? e.target.closest('.eng-act') : null; if (!b) return;
      if (!opts.speak) primeSpeech();
      var a = b.getAttribute('data-a'), i = b.getAttribute('data-i');
      act(a, i, b);
    }
    V.wrap.addEventListener('click', onClick);

    function undo() {
      if (S && S.q && S.q.kind === 's' && !lock) {
        if (S.undoTile()) { V.build(S); onStatus('拿回了最后一块'); snd('select'); }
        else onStatus('答案栏还是空的，点下面的单词块');
        return;
      }
      onStatus('拼句子的时候，可以用「撤销」拿回一块');
    }
    function hint() {
      if (!S || !S.q || lock || sub !== 'play') { onStatus(screen === 'map' ? '点亮着的那一站开始冒险' : '先看完这一格的动画哦'); return; }
      var q = S.q;
      if (q.kind === 'w') {
        say(q.item.en); var d = S.hintWord();
        if (d >= 0 && V.refs.ob[d]) V.refs.ob[d].className += ' eng-dim';
        onStatus(d >= 0 ? '再听一遍，去掉了一个错的' : '再仔细听一遍～');
        snd('select');
      } else if (q.kind === 's') {
        var r = S.hintTile();
        if (!r) { onStatus('已经拼好啦'); return; }
        snd('move'); say(r.tile, 0.9);
        V.build(S); onStatus('下一块是「' + r.tile + '」');
        if (r.full) checkSentence();
      } else {
        S.hintRally(); if (rally) rally.dur *= 1.8;
        var ob = V.refs.ob[q.answer]; if (ob) ob.className += ' eng-hl';
        say(q.item.q); snd('select'); onStatus('球变慢了！亮起来的就是答案');
      }
    }
    function restart() {
      if (screen === 'scene' && S) { var si = S.si; prog.session = Math.max(0, prog.session - 1); startScene(si); onStatus('重新开始第 ' + (si + 1) + ' 站'); }
      else showMap();
    }

    showMap();
    return {
      undo: undo, hint: hint, restart: restart,
      destroy: function () {
        dead = true; clearTimers();
        V.wrap.removeEventListener('click', onClick);
        if (!opts.speak) stopSpeech();
        el.innerHTML = '';
      },
      _act: act,
      _state: function () { return { screen: screen, sub: sub, lock: lock, session: S, q: S ? S.q : null, prog: prog, timers: timers.length, view: V, rally: rally }; }
    };
  }

  /* ===================== 规则演示 ===================== */
  function demo(el, opts) {
    opts = opts || {};
    var cap = opts.onCaption || function () {}, done = opts.onDone || function () {};
    var V = createView(el, true), timers = [], stopped = false;
    var fake = defaultProgress(); fake.stars = [3, 2, 0, 0, 0, 0, 0, 0, 0];
    var S = new Session(0, 0, fake, mulberry32(7));
    function at(ms, fn) { timers.push(setTimeout(function () { if (!stopped) fn(); }, ms)); }
    var steps = [
      [3000, function () { cap('冒险地图：一站一站往前走，点亮的站就能玩'); V.map(fake, 0); }],
      [3400, function () {
        cap('单词捕捉：听单词，点对的图，扔出团子球！');
        S.jump(0); S.q.type = 'pic'; V.word(S, { enter: true });
        at(1300, function () { V.refs.ob[S.q.answer].className += ' eng-yes'; V.throwBall(); });
        at(1950, function () { V.capture(); V.fx('太棒了！'); });
      }],
      [3600, function () {
        cap('句子拼拼乐：点单词块，排成一句英语');
        S.jump(1); V.build(S);
        var n = S.q.answer.length;
        for (var i = 0; i < n; i++) at(500 + i * 450, function () { S.hintTile(); V.build(S, S.q.line.length === S.q.answer.length ? { good: true } : {}); });
      }],
      [3800, function () {
        cap('羽毛球对打：球落地前点对的回答，打回去！');
        S.jump(2); V.rally(S);
        for (var k = 0; k <= 10; k++) (function (k) { at(200 + k * 120, function () { V.shuttleAt(k / 20); }); })(k);
        at(1300, function () { V.refs.ob[S.q.answer].className += ' eng-hl'; });
        at(2200, function () {
          V.refs.ob[S.q.answer].className = 'eng-act eng-btn eng-opt eng-yes'; V.refs.tz.className = 'eng-tz eng-swing';
          V.refs.shut.className = 'eng-shut eng-back'; V.refs.shut.style.left = '78%'; V.refs.shut.style.top = '40%'; V.fx('Great!');
          var f = V.refs.feath.children; if (f && f[0]) f[0].className = 'eng-ok';
        });
      }],
      [3000, function () { cap('过一站就抓到一只团团兽，答得越准 ⭐ 越多'); V.caught(0, 3, null, 0); }],
      [3000, function () { cap('抓到的团团兽都收在图鉴里，点名字听英语'); V.dex(fake, [1]); }]
    ];
    var t = 0;
    steps.forEach(function (s) { at(t, s[1]); t += s[0]; });
    at(t, function () { done(); });
    return { stop: function () { stopped = true; timers.forEach(clearTimeout); timers = []; } };
  }

  root.TZGAMES.english = {
    id: 'english', name: '英语大冒险', tagline: '抓团团兽，学说英语',
    levels: ['新手', '入门', '进阶', '大师'],
    sides: ['单人'],
    mount: mount,
    demo: demo,
    _engine: engine
  };
})();
