#!/usr/bin/env python3
"""Build 1920x1080 projector decks for text-only camp lessons.

Format follows Bruce's '干实验汇报' deck: scaled 16:9 stage, glass cards,
kicker + serif headline, staggered reveal, TOC, progress bar, keyboard/swipe, print to PDF.
Usage: python3 scripts/build-decksv1.0.py   (run from repo root)
Writes lessons/camp-<id>v1.0.html and adds "deck" to data/campv1.0.json.
"""
import json, html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'data' / 'campv1.0.json'
BASE_CSS = (ROOT / 'scripts' / 'deck-basev1.0.css').read_text()
E = lambda s: html.escape(str(s), quote=True)

EXTRA_CSS = r"""
#brand .dot{border-color:var(--blue)}
.cv .ttl{position:absolute;left:120px;top:190px;width:1000px}
.cv .k{font-size:22px;letter-spacing:.28em;color:var(--blue);font-weight:600}
.cv h1{font-family:var(--serif);font-weight:600;font-size:66px;line-height:1.22;margin:22px 0 18px}
.cv h1 em{display:block;font-style:normal;font-size:44px;margin-top:10px;background:linear-gradient(90deg,var(--he),var(--eo));-webkit-background-clip:text;background-clip:text;color:transparent}
.cv .sub{font-size:26px;color:var(--ink2);line-height:1.6;max-width:960px}
.cv .meta{margin-top:26px;font-size:20px;color:var(--mute)}
.cv .chips{position:absolute;left:120px;top:742px;width:1000px;display:flex;gap:14px}
.cv .chips div{flex:1;padding:16px 18px;border-radius:16px;font-size:19px;line-height:1.45;color:var(--ink2);border:1px solid var(--line);background:rgba(255,255,255,.6)}
.cv .chips b{display:block;font-family:var(--serif);font-size:32px;color:var(--blue)}
.field{position:absolute;right:150px;top:170px;width:620px;height:620px;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 35% 30%,#fff,#E8F0FA 70%);box-shadow:0 0 0 14px rgba(255,255,255,.75),0 0 0 15px rgba(27,95,168,.25),0 40px 90px rgba(40,30,80,.18)}
.field svg{position:absolute;inset:0;width:100%;height:100%;animation:drift 16s ease-in-out infinite alternate}
@keyframes drift{to{transform:scale(1.08) rotate(-3deg)}}
.field b{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--serif);font-size:200px;color:var(--blue);letter-spacing:-.02em;text-shadow:0 10px 40px rgba(27,95,168,.18)}
.field span{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);font-size:18px;letter-spacing:.3em;color:var(--mute)}
.big{font-family:var(--serif);font-size:40px;line-height:1.5;color:var(--ink)}
.play{position:relative;padding-left:24px}.play:before{content:"";position:absolute;left:0;top:6px;bottom:6px;width:5px;border-radius:4px;background:linear-gradient(var(--gold),var(--eo))}
.pts{display:grid;gap:22px}.pts.c2{grid-template-columns:1fr 1fr}.pts.c3{grid-template-columns:repeat(3,1fr)}
.pt{padding:26px 28px;position:relative}
.pt .n{font-family:var(--serif);font-size:44px;color:var(--eo);line-height:1}
.pt h3{font-family:var(--serif);font-size:30px;margin:12px 0 8px;color:var(--ink)}
.pt p{font-size:22px;line-height:1.55;color:var(--ink2)}
.pts.dense .pt{padding:16px 22px;display:flex;gap:18px;align-items:baseline}
.pts.dense .pt .n{font-size:30px;min-width:46px}.pts.dense .pt p{font-size:22px}
.scene{padding:44px 52px;display:grid;grid-template-columns:120px 1fr;gap:32px;align-items:start}
.scene .ic{width:120px;height:120px;border-radius:30px;display:grid;place-items:center;background:var(--eo3)}
.scene .ic svg{width:64px;height:64px;stroke:#B04679;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.flow{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:28px}
.flow .card{padding:24px 28px}.flow b{font-family:var(--serif);font-size:42px;color:var(--blue)}.flow b small{font-size:20px;color:var(--mute);margin-left:6px}
.flow h3{font-size:24px;margin:8px 0 6px}.flow p{font-size:19px;color:var(--ink2);line-height:1.5}
.warn{border-left:8px solid var(--warn)}
.rule{display:flex;gap:16px;align-items:baseline;font-size:22px;line-height:1.55;color:var(--ink2);padding:14px 0;border-bottom:1px solid var(--line)}
.rule:last-child{border-bottom:0}.rule b{font-family:var(--serif);color:var(--warn);font-size:28px}
.tempo{display:flex;height:64px;border-radius:16px;overflow:hidden;margin-top:14px}
.tempo div{display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:600;color:#fff;white-space:nowrap}
.nx{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.nx a{display:block;padding:34px 38px;text-decoration:none;color:inherit;transition:transform .3s}
.nx a:hover{transform:translateY(-4px)}
.nx small{font-size:18px;letter-spacing:.2em;color:var(--blue);font-weight:600}
.nx h3{font-family:var(--serif);font-size:34px;line-height:1.35;margin-top:12px}
.nx p{font-size:20px;color:var(--mute);margin-top:10px;line-height:1.5}
.home{margin-top:28px;font-size:20px}
.home a{color:var(--blue)}
.page:not(.cv).cur{display:flex;flex-direction:column;justify-content:center}
.page:not(.cv) .hd{margin-top:-40px}
"""

FIELD_SVG = '''<svg viewBox="0 0 620 620" aria-hidden="true"><g fill="none" stroke="rgba(27,95,168,.22)" stroke-width="2">
<rect x="70" y="40" width="480" height="540" rx="6"/><line x1="70" y1="310" x2="550" y2="310"/><circle cx="310" cy="310" r="70"/>
<line x1="70" y1="130" x2="550" y2="130" stroke-dasharray="6 10"/><line x1="70" y1="490" x2="550" y2="490" stroke-dasharray="6 10"/>
<path d="M170 420 C 230 340, 330 360, 420 230" stroke="#D9719C" stroke-width="3" stroke-dasharray="10 10"/>
<circle cx="170" cy="420" r="9" fill="#1B5FA8" stroke="none"/><path d="M412 220 l18 6 -8 16" stroke="#D9719C" stroke-width="3"/>
<g stroke="#1B5FA8" stroke-width="3"><path d="M250 200 l20 20 M270 200 l-20 20"/><path d="M360 420 l20 20 M380 420 l-20 20"/></g></g></svg>'''

ICON_SCENE = '<svg viewBox="0 0 24 24"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>'

JS = r"""
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const pages=$$('.page');let cur=0;
function fit(){const s=Math.min(innerWidth/1920,innerHeight/1080);const st=$('#stage');st.style.transform=`scale(${s})`;st.style.left=(innerWidth-1920*s)/2+'px';st.style.top=(innerHeight-1080*s)/2+'px'}
addEventListener('resize',fit);fit();
const dots=$('#prog .dots');pages.forEach(()=>dots.appendChild(document.createElement('i')));
$('#tocList').innerHTML=pages.map((p,i)=>`<button data-i="${i}"><span class="n">${String(i).padStart(2,'0')}</span>${p.dataset.title}</button>`).join('');
$$('#tocList button').forEach(b=>b.onclick=()=>{go(+b.dataset.i);$('#toc').classList.remove('show')});
function go(i){i=Math.max(0,Math.min(pages.length-1,i));pages[cur].classList.remove('cur');cur=i;const p=pages[i];void p.offsetWidth;p.classList.add('cur');
$('#chapName').textContent=String(i).padStart(2,'0')+' · '+p.dataset.title;$('#magbadge .obj').textContent=p.dataset.mag;$('#magbadge .idx').textContent=(i+1)+' / '+pages.length;
$('#prog .fill').style.width=(i/(pages.length-1)*100)+'%';$$('#prog .dots i').forEach((d,j)=>d.classList.toggle('done',j<=i));$$('#tocList button').forEach((b,j)=>b.classList.toggle('cur',j===i));history.replaceState(null,'','#'+(i+1))}
$('#bPrev').onclick=()=>go(cur-1);$('#bNext').onclick=()=>go(cur+1);$('#bToc').onclick=()=>$('#toc').classList.toggle('show');
$('#bPrint').onclick=()=>print();
$('#bFull').onclick=()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()};
$('#prog').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();go(Math.round((e.clientX-r.left)/r.width*(pages.length-1)))};
addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();go(cur+1)}if(['ArrowLeft','PageUp'].includes(e.key))go(cur-1);if(e.key==='Escape')$('#toc').classList.remove('show');if(e.key==='f'||e.key==='F')$('#bFull').click()});
let tx=null;addEventListener('touchstart',e=>tx=e.touches[0].clientX);addEventListener('touchend',e=>{if(tx===null)return;const d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>50)go(cur+(d<0?1:-1));tx=null});
go(Math.max(0,(parseInt(location.hash.slice(1))||1)-1));
"""

def split_pt(p):
    for sep in ('：', ':'):
        if sep in p:
            h, b = p.split(sep, 1)
            if len(h) <= 14:
                return h.strip(), b.strip()
    return None, p

def page(i, title, mag, body, cls=''):
    return f'<section class="page {cls}" id="p{i}" data-title="{E(title)}" data-mag="{E(mag)}">{body}</section>'

def hd(no, kick, title, lede=''):
    l = f'<div class="lede">{E(lede)}</div>' if lede else ''
    return f'<div class="hd"><div class="kick"><span class="no">{no:02d}</span>{E(kick)}</div><h2 class="t">{E(title)}</h2>{l}</div>'

def link_for(l):
    if l.get('story'):
        return l['story'].rsplit('/', 1)[-1]
    return f"camp-{l['id']}v1.0.html"

def build(l, camp):
    t = camp['tracks'][l['track']]
    same = [x for x in camp['lessons'] if x['track'] == l['track']]
    n = same.index(l) + 1
    code = ('O' if l['track'] == 'basics' else 'S') + f'{n:02d}'
    main, _, sub = l['title'].partition('：')
    pts = l['points']
    m = l['min']
    t_drill = max(3, round(m * 0.3)); t_case = max(2, round(m * 0.2)); t_wrap = max(1, round(m * 0.1)); t_talk = max(2, m - t_drill - t_case - t_wrap)
    P = []
    # 0 cover
    P.append(page(1, '封面', '训练营', f'''
<div class="ttl"><div class="k">aiai 学院 · {E(t['name'])}</div>
<h1>{E(main)}{f'<em>{E(sub)}</em>' if sub else ''}</h1>
<div class="sub">{E(l['one'])}</div>
<div class="meta">丁海祥 · 原创课程 · 第 {n} 课</div></div>
<div class="chips"><div><b>{E(l['level'])}</b>战术档位</div><div><b>{m} 分钟</b>建议课时</div><div><b>{len(pts)} 条</b>本课要点</div></div>
<div class="field">{FIELD_SVG}<b>{code}</b><span>TRAINING CAMP</span></div>''', 'cv'))
    # 1 one + play
    P.append(page(2, '一句话讲清楚', '概念', hd(1, '一句话讲清楚', '先记住这一句，再往下展开') + f'''
<div class="g2" style="grid-template-columns:1.25fr 1fr">
<div class="card box" data-b="1"><h3><span class="tag">核心</span></h3><p class="big">{E(l['one'])}</p></div>
<div class="card box" data-b="2"><h3><span class="tag wn">球场比喻</span></h3><p class="play" style="font-size:26px;line-height:1.65">{E(l['play'])}</p></div></div>'''))
    # 2 points
    cls = 'c2' if len(pts) in (2, 4) else ('c3' if len(pts) in (3, 5, 6) else 'c2 dense')
    items = []
    for k, p in enumerate(pts, 1):
        h, b = split_pt(p)
        if 'dense' in cls:
            items.append(f'<div class="card pt" data-b="{min(5,k)}"><span class="n">{k:02d}</span><p>{f"<b>{E(h)}</b>：" if h else ""}{E(b)}</p></div>')
        else:
            items.append(f'<div class="card pt" data-b="{min(5,k)}"><span class="n">{k:02d}</span>{f"<h3>{E(h)}</h3>" if h else ""}<p>{E(b)}</p></div>')
    P.append(page(3, '本课要点', '要点', hd(2, '本课要点', f'{len(pts)} 条要点，逐条讲、逐条举例') + f'<div class="pts {cls}">{"".join(items)}</div>'))
    # 3 scene
    P.append(page(4, '临床与科研场景', '场景', hd(3, '临床与科研场景', '把这节课放回真实工作里') + f'''
<div class="card scene" data-b="1"><div class="ic">{ICON_SCENE}</div><div><span class="tag eo">场景</span><p class="big" style="margin-top:16px">{E(l['case'])}</p></div></div>
<p class="src" data-b="2" style="margin-top:22px">讲解提示：先请学员说说自己会怎么做，再展示这个做法，对比差别。</p>'''))
    # 4 drill
    P.append(page(5, '课堂练习', '练习', hd(4, '课堂练习', '每人动手做一遍，比听十遍记得牢') + f'''
<div class="card box" data-b="1"><h3><span class="tag ok">练习</span></h3><p class="big">{E(l['drill'])}</p></div>
<div class="flow"><div class="card" data-b="2"><b>{t_drill}<small>分钟</small></b><h3>独立完成</h3><p>每人用自己常用的 AI 工具做一遍，保存输入和输出。</p></div>
<div class="card" data-b="3"><b>2<small>分钟</small></b><h3>同桌互看</h3><p>交换结果，各指出一处最好和一处要改的地方。</p></div>
<div class="card" data-b="4"><b>1–2<small>人</small></b><h3>投屏点评</h3><p>抽一两位学员投屏，现场一起改。</p></div></div>'''))
    # 5 care
    P.append(page(6, '小心', '小心', hd(5, '小心', '本课最容易踩的坑') + f'''
<div class="g2" style="grid-template-columns:1.2fr 1fr">
<div class="card box warn" data-b="1"><h3><span class="tag wn">本课提醒</span></h3><p class="big">{E(l['care'])}</p></div>
<div class="card box" data-b="2"><h3>三条通用红线</h3>
<div class="rule"><b>1</b>患者信息先脱敏，再交给 AI</div>
<div class="rule"><b>2</b>关键数字和结论回到原始来源核对</div>
<div class="rule"><b>3</b>AI 只是帮手，签字负责的是你</div></div></div>'''))
    # 6 recap
    top = ''.join(f'<li>{E(p)}</li>' for p in pts[:4])
    P.append(page(7, '一页小结', '小结', hd(6, '一页小结', main) + f'''
<div class="g2" style="grid-template-columns:1.2fr 1fr">
<div class="card box" data-b="1"><h3><span class="tag">带走三件事</span></h3><ul>
<li><b>记住：</b>{E(l['one'])}</li><li><b>做到：</b>{E(l['drill'])}</li><li><b>小心：</b>{E(l['care'])}</li></ul></div>
<div class="card box" data-b="2"><h3>要点回顾</h3><ul>{top}</ul></div></div>
<div class="card box" data-b="3" style="margin-top:24px"><h3 style="font-size:24px">本课节奏 · 共 {m} 分钟（建议）</h3>
<div class="tempo"><div style="flex:{t_talk};background:var(--blue)">讲解 {t_talk}′</div><div style="flex:{t_case};background:var(--he2)">场景 {t_case}′</div><div style="flex:{t_drill};background:var(--eo)">练习 {t_drill}′</div><div style="flex:{t_wrap};background:var(--gold)">小结 {t_wrap}′</div></div></div>'''))
    # 7 next
    k = same.index(l)
    prv = same[k-1] if k > 0 else None
    nxt = same[k+1] if k + 1 < len(same) else None
    def card(x, lab):
        if not x: return f'<div class="card" style="padding:34px 38px;opacity:.5"><small>{lab}</small><h3>本组已到{"开头" if lab=="上一课" else "最后一课"}</h3></div>'
        return f'<a class="card" href="{E(link_for(x))}"><small>{lab}{" · 故事版" if x.get("story") else ""}</small><h3>{E(x["title"])}</h3><p>{E(x["level"])} · {x["min"]} 分钟</p></a>'
    P.append(page(8, '下一课', '继续', hd(7, '接着练', t['name']) + f'''
<div class="nx" data-b="1">{card(prv,'上一课')}{card(nxt,'下一课')}</div>
<p class="home" data-b="2"><a href="../#camp-{E(l['id'])}">← 回到训练营 · 全部课程</a>　　<span class="src">丁海祥 · aiai 学院原创课程 · 更新于 {E(camp['updated'])}</span></p>'''))
    total = len(P)
    return f'''<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(l['title'])} · aiai 学院训练营 {code}</title>
<meta name="description" content="{E(l['one'])}">
<style>{BASE_CSS}{EXTRA_CSS}</style></head><body>
<div id="viewport"><div id="stage">
<div id="brand"><span class="dot"></span><b>aiai 学院</b><span>· 训练营 {code}</span></div>
<div id="magbadge"><span class="obj">训练营</span><span class="idx">1 / {total}</span></div>
<div id="pages">{''.join(P)}</div>
<div id="toc" class="card"><h4>目录</h4><div id="tocList"></div></div>
<div id="bar"><button class="ib" id="bToc" title="目录"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg></button>
<button class="ib" id="bPrev" title="上一页 ←"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
<button class="ib" id="bNext" title="下一页 →"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
<div id="chapName"></div><div id="prog"><div class="tr"></div><div class="fill"></div><div class="dots"></div></div>
<button class="ib" id="bFull" title="全屏 F"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
<button class="ib" id="bPrint" title="打印 / 导出 PDF"><svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/></svg></button></div>
</div></div><script>{JS}</script></body></html>'''

def main():
    camp = json.loads(DATA.read_text())
    out = ROOT / 'lessons'
    n = 0
    for l in camp['lessons']:
        if l.get('story'):
            continue
        name = f"camp-{l['id']}v1.0.html"
        (out / name).write_text(build(l, camp))
        l['deck'] = f'lessons/{name}'
        n += 1
    DATA.write_text(json.dumps(camp, ensure_ascii=False, indent=1) + '\n')
    print('decks:', n)

if __name__ == '__main__':
    main()
