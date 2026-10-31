(function(){
'use strict';
var G = window.TZGAMES || {};
var ORDER = ['xiangqi','chess','gomoku','go9','junqi','sudoku','huarong','point24','nonogram','english','blaster'];
var $ = function(s,r){return (r||document).querySelector(s)};
var app = $('.app');

var META = {
  xiangqi:{bg:'linear-gradient(135deg,#ffe3c2,#ffd09a)',color:'#e5484d',tag:'楚河汉界，将帅对决',
    svg:'<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="#f6dba5" stroke="#b0793a" stroke-width="6"/><circle cx="50" cy="50" r="33" fill="none" stroke="#e5484d" stroke-width="2.5"/><text x="50" y="64" text-anchor="middle" font-size="40" font-family="Songti SC,STSong,serif" font-weight="700" fill="#e5484d">帅</text></svg>',
    ask:['对方上一步，想用哪个子攻击你？','你的车和马，哪一个还没出动？','如果你走了这步，对方最想吃你哪个子？','你的帅周围，有没有对方的车或炮能直接照到？','有没有一步棋，既能防守又能顺便进攻？']},
  chess:{bg:'linear-gradient(135deg,#dff0ff,#c4e1ff)',color:'#3b82f6',tag:'王车易位，兵到底升变',
    svg:'<svg viewBox="0 0 100 100"><text x="50" y="80" text-anchor="middle" font-size="84" fill="#2b2340">♞</text></svg>',
    ask:['对方刚走的子，现在攻击了你的哪些子？','你有没有没被保护、能被白吃的子？','中心四格，现在是谁控制得更多？','你的王安全吗？易位了没有？','有没有一步棋能同时攻击对方两个目标（双捉）？']},
  gomoku:{bg:'linear-gradient(135deg,#e3f7ea,#c9eed6)',color:'#22a06b',tag:'连成五子，先到先赢',
    svg:'<svg viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="10" fill="#f3d39b" stroke="#c39a5a" stroke-width="3"/><g stroke="#a47a3c" stroke-width="2"><path d="M28 8v84M50 8v84M72 8v84M8 28h84M8 50h84M8 72h84"/></g><circle cx="28" cy="28" r="9" fill="#2b2340"/><circle cx="50" cy="50" r="9" fill="#2b2340"/><circle cx="72" cy="72" r="9" fill="#fff" stroke="#999"/><circle cx="72" cy="28" r="9" fill="#fff" stroke="#999"/></svg>',
    ask:['对方有没有已经连成三个、两头都空的「活三」？','你自己哪里离连五最近？','如果你不堵，对方下一步能不能形成两个威胁？','有没有一个点，能同时连出你的两条线？']},
  junqi:{bg:'linear-gradient(135deg,#ece4ff,#d9ccff)',color:'#8b5cf6',tag:'暗棋布阵，夺旗为王',
    svg:'<svg viewBox="0 0 100 100"><rect x="14" y="26" width="72" height="48" rx="10" fill="#e5484d" stroke="#a52a2e" stroke-width="4"/><text x="50" y="60" text-anchor="middle" font-size="26" font-weight="800" fill="#fff" font-family="PingFang SC,sans-serif">司令</text><path d="M70 10v26" stroke="#2b2340" stroke-width="4"/><path d="M70 10h20l-6 7 6 7H70z" fill="#ffc53d"/></svg>',
    ask:['对方哪个子一直没动过？会不会是地雷或军旗？','你的军旗附近，有没有留下足够的守卫？','先用小子去试探，还是直接派大官冲？','对方的炸弹可能藏在哪？你的司令安全吗？']},
  huarong:{bg:'linear-gradient(135deg,#ffe0cc,#ffc29e)',color:'#d4651f',tag:'把曹操从下面的出口救出去',
    svg:'<svg viewBox="0 0 100 100"><rect x="18" y="8" width="64" height="84" rx="8" fill="#c98b4a"/><rect x="34" y="14" width="32" height="32" rx="6" fill="#e5484d"/><text x="50" y="36" font-size="13" font-weight="800" text-anchor="middle" fill="#fff">曹</text><rect x="22" y="14" width="10" height="32" rx="4" fill="#3b82f6"/><rect x="68" y="14" width="10" height="32" rx="4" fill="#3b82f6"/><rect x="34" y="50" width="32" height="14" rx="4" fill="#22a06b"/><rect x="22" y="68" width="10" height="10" rx="3" fill="#f3d9a4"/><rect x="68" y="68" width="10" height="10" rx="3" fill="#f3d9a4"/><path d="M42 92h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
    ask:['曹操要出去，正下方挡着的是谁？','哪个棋子最占地方？能不能先把它挪开？','两个空格现在在哪？它们挨在一起吗？','如果先动这一块，下一步空格会跑到哪？']},
  point24:{bg:'linear-gradient(135deg,#dbeafe,#bfdbfe)',color:'#2563eb',tag:'四张牌，加减乘除凑出 24',
    svg:'<svg viewBox="0 0 100 100"><rect x="14" y="22" width="34" height="48" rx="6" fill="#fff" stroke="#2b2340" stroke-width="3" transform="rotate(-10 31 46)"/><rect x="52" y="22" width="34" height="48" rx="6" fill="#fff" stroke="#2b2340" stroke-width="3" transform="rotate(10 69 46)"/><text x="30" y="54" font-size="20" font-weight="800" text-anchor="middle" fill="#e5484d">8</text><text x="70" y="54" font-size="20" font-weight="800" text-anchor="middle" fill="#2b2340">3</text><text x="50" y="92" font-size="16" font-weight="800" text-anchor="middle" fill="#2563eb">=24</text></svg>',
    ask:['24 可以拆成哪些乘法？3×8、4×6、2×12……你手里有吗？','能不能先用两张牌凑出 3、4、6 或 8？','如果加减凑不出来，试试先做除法？','有没有哪张牌可以先放一边，最后再用？']},
  nonogram:{bg:'linear-gradient(135deg,#fce7f3,#fbcfe8)',color:'#db2777',tag:'按数字线索涂格子，涂出一幅画',
    svg:'<svg viewBox="0 0 100 100"><rect x="24" y="24" width="64" height="64" rx="6" fill="#fff" stroke="#2b2340" stroke-width="3"/><g fill="#db2777"><rect x="40" y="40" width="12" height="12"/><rect x="56" y="40" width="12" height="12"/><rect x="40" y="56" width="28" height="12"/><rect x="52" y="72" width="4" height="0"/></g><g font-size="10" font-weight="800" fill="#2b2340" text-anchor="middle"><text x="14" y="50">1 1</text><text x="14" y="66">2</text><text x="46" y="18">2</text><text x="62" y="18">2</text></g></svg>',
    ask:['哪一行或哪一列的数字加起来最大？它几乎占满了吗？','这个数字比格子数的一半还大吗？中间哪几格一定要涂？','哪一行已经满足了？剩下的格子是不是都该打叉？','有没有被叉隔开的小空间，放不下这个数字？']},
  go9:{bg:'linear-gradient(135deg,#f5e6c8,#e8cf9a)',color:'#8a5a1f',tag:'9 路小棋盘，围地多者胜',
    svg:'<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="8" fill="#e8c27c"/><path d="M22 22v56M36 22v56M50 22v56M64 22v56M78 22v56M22 22h56M22 36h56M22 50h56M22 64h56M22 78h56" stroke="#7a5420" stroke-width="1.6"/><circle cx="36" cy="36" r="7" fill="#2b2340"/><circle cx="50" cy="50" r="7" fill="#2b2340"/><circle cx="64" cy="36" r="7" fill="#fff" stroke="#999"/><circle cx="64" cy="64" r="7" fill="#fff" stroke="#999"/></svg>',
    ask:['对方哪块棋只剩一口气了？','你自己有没有哪块棋气很紧，需要先补一手？','棋盘上哪片空地还没人占？谁先下就是谁的地？','这步下了以后，能不能连成一片更安全？']},
  english:{bg:'linear-gradient(135deg,#dcfce7,#bbf7d0)',color:'#16a34a',tag:'团子的英语大冒险：抓单词、拼句子、羽毛球对打',
    svg:'<svg viewBox="0 0 100 100"><circle cx="40" cy="50" r="24" fill="#fff" stroke="#2b2340" stroke-width="3"/><circle cx="33" cy="47" r="3" fill="#2b2340"/><circle cx="47" cy="47" r="3" fill="#2b2340"/><path d="M34 57q6 5 12 0" stroke="#2b2340" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="58" y="16" width="34" height="24" rx="10" fill="#16a34a"/><text x="75" y="33" font-size="13" font-weight="800" text-anchor="middle" fill="#fff">ABC</text><path d="M70 62l14 18" stroke="#2b2340" stroke-width="4" stroke-linecap="round"/><ellipse cx="66" cy="57" rx="9" ry="7" fill="none" stroke="#2b2340" stroke-width="3"/></svg>',
    ask:['先听一听，这个词开头是什么音？','图里的人在做什么？他会说哪句话？','句子一般谁在最前面？I、You 还是 This？','对方问你问题，你要先说 Yes 还是 No？']},
  sudoku:{bg:'linear-gradient(135deg,#fff3c4,#ffe28a)',color:'#d48806',tag:'每行每列每宫 1 到 9',
    svg:'<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="10" fill="#fff" stroke="#2b2340" stroke-width="4"/><path d="M36.7 10v80M63.3 10v80M10 36.7h80M10 63.3h80" stroke="#2b2340" stroke-width="2.5"/><g font-family="PingFang SC,sans-serif" font-weight="800" font-size="18" text-anchor="middle"><text x="23" y="30" fill="#2b2340">5</text><text x="50" y="57" fill="#3b82f6">9</text><text x="77" y="83" fill="#2b2340">1</text><text x="77" y="30" fill="#3b82f6">3</text></g></svg>',
    ask:['哪一行、哪一列或哪一宫已经快填满了？','这个格子所在的行、列、宫里，已经出现了哪些数字？','数字 1 到 9 里，哪个在盘面上出现得最多？它还缺在哪一宫？','有没有一个数字，在某一宫里只剩一个位置能放？']},
  blaster:{bg:'linear-gradient(135deg,#ffd6d6,#ffb3a7)',color:'#e5484d',tag:'横版闯关射击，八方向开火',
    svg:'<svg viewBox="0 0 100 100"><ellipse cx="44" cy="58" rx="26" ry="24" fill="#fff" stroke="#2b2340" stroke-width="3"/><rect x="20" y="40" width="48" height="8" rx="4" fill="#ff8a3d"/><circle cx="38" cy="60" r="3" fill="#2b2340"/><circle cx="52" cy="60" r="3" fill="#2b2340"/><rect x="60" y="62" width="30" height="8" rx="3" fill="#3b4a6b"/><circle cx="94" cy="66" r="4" fill="#ffc53d"/></svg>',
    ask:['敌人的子弹是平着飞还是斜着飞？趴下能不能躲？','哪种武器胶囊最适合打天上的无人机？','炮塔什么时候停火？那是你冲过去的时机吗？','关底大炮哪个部位在闪？']}
};
var LV_DESC = ['会走就能赢，电脑偶尔犯错','电脑会抓你的明显漏洞','俱乐部水平，需要算两三步','电脑全力计算，敢来挑战吗'];

/* ---------- 存储 ---------- */
function load(){try{return JSON.parse(localStorage.getItem('tz-hall')||'{}')}catch(e){return {}}}
function save(d){try{localStorage.setItem('tz-hall',JSON.stringify(d))}catch(e){}}
var DB = load(); DB.rec = DB.rec || {}; DB.seen = DB.seen || {};
function rec(id){return DB.rec[id] = DB.rec[id] || {games:0,wins:[0,0,0,0],last:1}}

/* ---------- 声音 ---------- */
var muted = localStorage.getItem('tz-hall-mute') === '1', ac = null;
function tone(f,d,type,vol,when){
  if(!ac) return; var t=ac.currentTime+(when||0), o=ac.createOscillator(), g=ac.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(vol||.15,t); g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+d);
}
function sound(n){
  if(muted) return;
  try{ ac = ac || new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==='suspended') ac.resume(); }catch(e){return}
  if(n==='move'){tone(520,.08,'triangle',.18);tone(330,.1,'sine',.12,.02)}
  else if(n==='capture'){tone(220,.12,'square',.08);tone(160,.16,'triangle',.18,.03)}
  else if(n==='check'){tone(880,.12,'sawtooth',.06);tone(660,.18,'sawtooth',.06,.12)}
  else if(n==='select'){tone(760,.05,'sine',.08)}
  else if(n==='illegal'){tone(180,.1,'sine',.08)}
  else if(n==='win'){[523,659,784,1046].forEach(function(f,i){tone(f,.25,'triangle',.16,i*.11)})}
  else if(n==='lose'){[392,330,262].forEach(function(f,i){tone(f,.3,'sine',.12,i*.16)})}
}
function setMuteIcons(){document.querySelectorAll('[data-act=mute]').forEach(function(b){b.textContent=muted?'🔇':'🔊'})}

/* ---------- 大厅 ---------- */
function renderStats(){
  var g=0,w=0,best=-1;
  ORDER.forEach(function(id){var r=DB.rec[id];if(!r)return;g+=r.games;r.wins.forEach(function(x,i){w+=x;if(x>0&&i>best)best=i})});
  $('[data-stat=games]').textContent=g; $('[data-stat=wins]').textContent=w;
  $('[data-stat=best]').textContent=best<0?'—':'胜'+['新手','入门','进阶','大师'][best];
}
var ZONES = [
  {id:'board',name:'棋类对弈',en:'BOARD GAMES',img:'assets/art/zone-boardv1.0.webp',desc:'和电脑下一盘：四档难度，开局动画讲规则，团子教练先提问再给答案。',ids:['xiangqi','chess','gomoku','go9','junqi'],color:'#e5484d'},
  {id:'puzzles',name:'益智解谜',en:'PUZZLES',img:'assets/art/zone-puzzlesv1.0.webp',desc:'数字、方块和图画谜题，一个人安静地想，想通那一下最开心。',ids:['sudoku','huarong','point24','nonogram'],color:'#d48806'},
  {id:'english',name:'英语大冒险',en:'ENGLISH',img:'assets/art/zone-englishv1.0.webp',desc:'跟着地图一站站走：抓单词、拼句子、羽毛球对话对打，英式发音原声朗读。',ids:['english'],color:'#16a34a'},
  {id:'blaster',name:'闯关冒险',en:'ADVENTURE',img:'assets/art/zone-blasterv1.0.webp',desc:'团子突击队：横版跑跳射击，跳过水坑、打败关底大炮。',ids:['blaster'],color:'#3b82f6'}
];
function tableCard(id){
  var g=G[id], m=META[id], r=DB.rec[id];
  var b=document.createElement('button'); b.className='tcard'+(g?'':' off');
  b.innerHTML='<div class="art" style="background:'+m.bg+'">'+m.svg+'</div>'+
    (r&&r.games?'<span class="rec">'+r.games+' 局</span>':'')+
    '<h4>'+(g?g.name:id)+'</h4><p>'+(g&&g.tagline||m.tag)+'</p><span class="play-tag" style="color:'+m.color+'">'+(g?'开一局 ›':'准备中')+'</span>';
  b.onclick=function(){sound('select');openSetup(id)};
  return b;
}
function renderTables(){
  var box=$('.tables'); box.innerHTML='';
  var nav=$('.zone-nav'); if(nav) nav.innerHTML='';
  ZONES.forEach(function(z,i){
    var sec=document.createElement('section'); sec.className='zone'+(i%2?' flip':''); sec.id='zone-'+z.id;
    sec.style.setProperty('--zc',z.color);
    sec.innerHTML='<div class="zone-head"><img src="'+z.img+'" alt="'+z.name+'插画（AI 生成）" loading="lazy"><div class="zone-txt"><span class="zone-en">'+('0'+(i+1)).slice(-2)+' · '+z.en+'</span><h3>'+z.name+'</h3><p>'+z.desc+'</p><span class="zone-n">'+z.ids.length+' 款</span></div></div><div class="zone-grid"></div>';
    var grid=sec.querySelector('.zone-grid');
    z.ids.forEach(function(id){grid.appendChild(tableCard(id))});
    box.appendChild(sec);
    if(nav){var a=document.createElement('a');a.href='#zone-'+z.id;a.textContent=z.name;a.style.setProperty('--zc',z.color);
      a.onclick=function(e){e.preventDefault();sec.scrollIntoView({behavior:'smooth',block:'start'})};nav.appendChild(a)}
  });
}

/* ---------- 设置 ---------- */
var backFromDemo=null;
var cur={id:null,level:1,side:0}, ctrl=null, demoCtl=null, hintStep=0;
function openSetup(id){
  var g=G[id], m=META[id], r=rec(id);
  cur.id=id; cur.level=r.last; cur.side=0; app.dataset.game=id;
  $('.setup-title').textContent=g.name;
  var art=$('.setup-art'); art.style.background=m.bg; art.innerHTML=m.svg;
  var lv=$('.levels'); lv.innerHTML='';
  g.levels.forEach(function(name,i){
    var b=document.createElement('button'); b.className='lv'; b.setAttribute('aria-pressed',i===cur.level);
    b.innerHTML='<b>'+name+' <span class="stars">'+'★'.repeat(i+1)+'</span>'+(r.wins[i]?'<span class="won">赢过 '+r.wins[i]+' 次</span>':'')+'</b><small>'+LV_DESC[i]+'</small>';
    b.onclick=function(){cur.level=i;sound('select');lv.querySelectorAll('.lv').forEach(function(x,j){x.setAttribute('aria-pressed',j===i)})};
    lv.appendChild(b);
  });
  var sd=$('.sides'); sd.innerHTML=''; var one=g.sides.length<2; sd.hidden=one; sd.previousElementSibling.hidden=one;
  g.sides.forEach(function(name,i){
    var b=document.createElement('button'); b.className='sd'; b.setAttribute('aria-pressed',i===0);
    b.innerHTML=name+'<small>'+(i===0?'先手':'后手 · 电脑先走')+'</small>';
    b.onclick=function(){cur.side=i;sound('select');sd.querySelectorAll('.sd').forEach(function(x,j){x.setAttribute('aria-pressed',j===i)})};
    sd.appendChild(b);
  });
  $('.want-demo').checked=!DB.seen[id];
  show('setup');
}

function show(v){
  app.dataset.view=v;
  document.querySelectorAll('.view').forEach(function(s){s.setAttribute('aria-hidden',!s.classList.contains(v))});
  window.scrollTo(0,0);
}

/* ---------- 演示 ---------- */
function startDemo(thenPlay,fromPlay){
  var g=G[cur.id]; if(demoCtl){try{demoCtl.stop()}catch(e){} demoCtl=null} if(!fromPlay) stopAll();
  $('.demo-title').textContent=g.name+' · 规则演示';
  var el=$('.demo-board'); el.innerHTML='';
  var dots=$('.dots'); dots.innerHTML=''; var step=0;
  $('.cap-txt').textContent='准备…'; $('.cap-step').textContent='1';
  show('demo');
  var finish=function(){DB.seen[cur.id]=1;save(DB); if(demoCtl){demoCtl.stop();demoCtl=null} if(thenPlay) startPlay(); else show(fromPlay?'play':'setup')};
  $('.skip').onclick=finish;
  $('.skip').textContent=thenPlay?'跳过，开始下 ›':fromPlay?'回到对局 ›':'结束演示 ›';
  backFromDemo=finish;
  try{
    demoCtl=g.demo(el,{
      onCaption:function(t){step++; var p=$('.cap-txt'); p.textContent=t; p.style.animation='none'; void p.offsetWidth; p.style.animation='';
        $('.cap-step').textContent=step; var i=document.createElement('i'); dots.appendChild(i); dots.querySelectorAll('i').forEach(function(x,j){x.className=j===step-1?'on':''}); sound('select')},
      onDone:function(){$('.cap-txt').textContent=thenPlay?'记住了吗？马上开局！':'演示结束，可以开局了。'; $('.skip').textContent=thenPlay?'开始下 ›':fromPlay?'回到对局 ›':'返回 ›'; setTimeout(function(){if(app.dataset.view==='demo'&&thenPlay)finish()},1800)}
    });
  }catch(e){console.error(e); finish();}
}

/* ---------- 对局 ---------- */
function setStatus(t){
  var s=$('.status'); s.querySelector('span').textContent=t;
  s.classList.toggle('think',/思考/.test(t)); s.classList.toggle('alert',/将军|将！|check|小心|危险/.test(t));
}
function startPlay(){
  var g=G[cur.id]; app.dataset.game=cur.id; stopAll(); hideCoach(); hintStep=0;
  var r=rec(cur.id); r.last=cur.level; save(DB);
  $('.play-title b').textContent=g.name;
  $('.play-title small').textContent=g.levels[cur.level]+(g.sides.length>1?' · 你执'+g.sides[cur.side]:'');
  var el=$('.play-board'); el.innerHTML='';
  show('play'); setStatus('准备中…');
  try{
    ctrl=g.mount(el,{level:cur.level,side:cur.side,sound:function(n){sound(n); if((n==='move'||n==='capture')&&cur.id!=='blaster'){hintStep=0;hideCoach()}},onStatus:setStatus,onEnd:onEnd});
  }catch(e){console.error(e); setStatus('这张棋桌出了点问题，换一张试试');}
}
function onEnd(res){
  var r=rec(cur.id); r.games++;
  var win=res.winner==='player', draw=res.winner==='draw';
  if(win) r.wins[cur.level]++;
  save(DB);
  setTimeout(function(){
    $('.m-emoji').textContent=win?'🏆':draw?'🤝':'🥟';
    $('.m-title').textContent=win?'你赢了！':draw?'和棋':'这局电脑赢了';
    $('.m-reason').textContent=(res.reason||'')+(win?'':draw?'':' · 别灰心，按「提示」让教练问你几个问题');
    var up=$('.m-up'); up.hidden=!(win&&cur.level<3);
    up.textContent='挑战「'+G[cur.id].levels[Math.min(3,cur.level+1)]+'」';
    $('.modal').hidden=false; sound(win?'win':draw?'move':'lose'); if(win) confetti();
  },700);
}
function stopAll(){
  if(ctrl&&ctrl.destroy){try{ctrl.destroy()}catch(e){}} ctrl=null;
  if(demoCtl){try{demoCtl.stop()}catch(e){}} demoCtl=null;
}
function hideCoach(){$('.coach-bubble').hidden=true}
function coachSay(t){var b=$('.coach-bubble'); b.querySelector('p').textContent=t; b.hidden=false; clearTimeout(coachSay._t); if(cur&&cur.id==='blaster')coachSay._t=setTimeout(hideCoach,6000)}
function hint(){
  if(!ctrl) return;
  var qs=META[cur.id].ask;
  if(hintStep===0){ coachSay('先想一想：'+qs[Math.floor(Math.random()*qs.length)]+'（想好了再按一次「提示」看推荐）'); hintStep=1; sound('select'); }
  else { coachSay(cur.id==='sudoku'?'看亮起来的那一格，想想为什么只能是它？':cur.id==='blaster'?'看画面上的操作提示，试试这招。':'看棋盘上亮起来的那步。想想它为什么好？'); try{ctrl.hint()}catch(e){} hintStep=0; }
}
function toast(t){var x=$('.toast');x.textContent=t;x.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){x.hidden=true},1800)}

/* ---------- 撒花 ---------- */
function confetti(){
  var c=$('.confetti'), ctx=c.getContext('2d'), dpr=window.devicePixelRatio||1;
  c.width=innerWidth*dpr; c.height=innerHeight*dpr; ctx.scale(dpr,dpr);
  var cols=['#e5484d','#ffc53d','#22a06b','#3b82f6','#8b5cf6','#ff8a3d'], P=[];
  for(var i=0;i<140;i++)P.push({x:innerWidth/2,y:innerHeight*.35,vx:(Math.random()-.5)*12,vy:-Math.random()*12-4,r:Math.random()*6+4,c:cols[i%6],a:Math.random()*6,s:(Math.random()-.5)*.3});
  var t0=performance.now();
  (function f(t){ctx.clearRect(0,0,innerWidth,innerHeight);
    P.forEach(function(p){p.vy+=.35;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.a+=p.s;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.c;ctx.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);ctx.restore()});
    if(t-t0<2600)requestAnimationFrame(f);else ctx.clearRect(0,0,innerWidth,innerHeight)})(t0);
}

/* ---------- 事件 ---------- */
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-act]'); if(!b) return;
  var a=b.dataset.act;
  if(a==='mute'){muted=!muted;localStorage.setItem('tz-hall-mute',muted?'1':'0');setMuteIcons();if(!muted)sound('select')}
  else if(a==='home'){stopAll();renderTables();renderStats();show('lobby')}
  else if(a==='back-setup'){if(backFromDemo&&app.dataset.view==='demo'&&ctrl){backFromDemo()}else{stopAll();show('setup')}}
  else if(a==='leave'){stopAll();openSetup(cur.id)}
  else if(a==='undo'){if(ctrl){ctrl.undo();hideCoach();hintStep=0;sound('select')}}
  else if(a==='hint'){hint()}
  else if(a==='restart'){sound('select');startPlay();toast('新的一局开始了')}
  else if(a==='rules'){startDemo(false,true)}
});
$('.go').onclick=function(){sound('select'); if($('.want-demo').checked) startDemo(true); else startPlay()};
$('.demo-only').onclick=function(){startDemo(false)};
$('.m-again').onclick=function(){$('.modal').hidden=true;startPlay()};
$('.m-up').onclick=function(){$('.modal').hidden=true;cur.level=Math.min(3,cur.level+1);startPlay();toast('升到「'+G[cur.id].levels[cur.level]+'」，加油！')};
$('.m-home').onclick=function(){$('.modal').hidden=true;stopAll();renderTables();renderStats();show('lobby')};
window.addEventListener('pagehide',stopAll);

setMuteIcons(); renderTables(); renderStats();
var q=location.hash.replace('#',''); if(G[q]) openSetup(q);
else if(/^zone-/.test(q)){var zs=document.getElementById(q); if(zs) setTimeout(function(){zs.scrollIntoView({block:'start'})},60);}
})();
