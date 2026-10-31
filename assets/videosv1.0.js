/* aiai 放映厅：按分类横向滚动的视频转轮 + HLS 播放弹窗 */
(function(){
var root=document.getElementById('reels'); if(!root) return;
var dlg=document.getElementById('vplayer'), vid=dlg.querySelector('video'), ttl=dlg.querySelector('.vp-title'), sub=dlg.querySelector('.vp-sub'), hls=null, BASE='media/v/';
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
fetch('data/videosv1.0.json?v=1.0').then(function(r){return r.json()}).then(function(d){
  BASE=d.base||BASE; var n=0;
  d.rows.forEach(function(row,i){
    n+=row.items.length;
    var sec=document.createElement('div'); sec.className='reel rv'; sec.id='reel-'+row.id;
    sec.innerHTML='<div class="reel-head"><div><span class="reel-en">'+('0'+(i+1)).slice(-2)+' · '+esc(row.en)+'</span><h3>'+esc(row.name)+' <small>'+row.items.length+' 部</small></h3><p>'+esc(row.desc)+'</p></div>'+
      '<div class="reel-nav"><button class="rb prev" aria-label="向左滚动">‹</button><button class="rb next" aria-label="向右滚动">›</button></div></div><div class="reel-track" tabindex="0"></div>';
    var tr=sec.querySelector('.reel-track');
    row.items.forEach(function(it){
      var b=document.createElement('button'); b.className='vcard'+(it.v?' vert':''); b.type='button';
      b.innerHTML='<span class="vthumb"><img src="'+BASE+it.id+'/poster.webp" alt="" loading="lazy"><span class="vplay" aria-hidden="true">▶</span><span class="vdur">'+esc(it.dur)+'</span>'+(it.tag?'<span class="vtag">'+esc(it.tag)+'</span>':'')+'</span><b>'+esc(it.title)+'</b><small>'+esc(it.sub)+'</small>';
      b.onclick=function(){open(it)};
      tr.appendChild(b);
    });
    function step(dir){tr.scrollBy({left:dir*tr.clientWidth*0.85,behavior:'smooth'})}
    sec.querySelector('.prev').onclick=function(){step(-1)}; sec.querySelector('.next').onclick=function(){step(1)};
    function upd(){sec.querySelector('.prev').disabled=tr.scrollLeft<8; sec.querySelector('.next').disabled=tr.scrollLeft+tr.clientWidth>=tr.scrollWidth-8}
    tr.addEventListener('scroll',upd,{passive:true}); window.addEventListener('resize',upd); setTimeout(upd,50);
    root.appendChild(sec);
    if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){sec.classList.add('in');io.disconnect()}})});io.observe(sec)} else sec.classList.add('in');
  });
  var c=document.querySelector('[data-n="videos"]'); if(c) c.firstChild.nodeValue=n;
  var q=location.hash.match(/^#v-(.+)$/); if(q) d.rows.forEach(function(r){r.items.forEach(function(it){if(it.id===q[1]) open(it)})});
});
function open(it){
  var src=BASE+it.id+'/index.m3u8';
  ttl.textContent=it.title; sub.textContent=it.sub+' · '+it.dur;
  dlg.classList.toggle('vert',!!it.v);
  [].slice.call(vid.querySelectorAll('track')).forEach(function(t){t.remove()});
  if(it.id==='starlink'){var t=document.createElement('track');t.kind='subtitles';t.src=BASE+it.id+'/subs.vtt';t.srclang='en';t.label='字幕';t.default=true;vid.appendChild(t)}
  vid.poster=BASE+it.id+'/poster.webp';
  if(vid.canPlayType('application/vnd.apple.mpegurl')){vid.src=src}
  else if(window.Hls&&Hls.isSupported()){hls=new Hls({maxBufferLength:30});hls.loadSource(src);hls.attachMedia(vid)}
  else {vid.src=src}
  var m=document.querySelector('audio'); if(m&&!m.paused){m.pause();dlg.dataset.music='1'}
  if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open','');
  vid.play().catch(function(){});
  history.replaceState(null,'','#v-'+it.id);
}
function close(){
  vid.pause(); if(hls){hls.destroy();hls=null} vid.removeAttribute('src'); vid.load();
  if(dlg.open&&dlg.close) dlg.close(); else dlg.removeAttribute('open');
  history.replaceState(null,'','#videos');
}
dlg.querySelector('.vp-x').onclick=close;
dlg.addEventListener('click',function(e){if(e.target===dlg) close()});
dlg.addEventListener('cancel',function(e){e.preventDefault();close()});
})();
