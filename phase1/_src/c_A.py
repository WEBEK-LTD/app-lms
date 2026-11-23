# LUJAIN — clothes template A (approved pilot) : home (pilot + menu icon), menu, listing, product; light + dark
import re,os
from lib import *
PILOT=os.path.join(HERE,"../../../pilot/_src/clothes.html")
T="clothes-A"; F="plex"; CUR="ر.س"

DARK_TOK='''html.dark{--bg:#0F0F0E;--surface:#191917;--tint:#23221F;--tint2:#2B2A26;--ink:#F3F0EA;--ink2:#B6B0A6;--ink3:#8F8A81;--line:#2E2C28}
html.dark .mult{background-color:#E8E3DA}
'''
# ---------- HOME: approved pilot, patched (paths, currentColor status, menu icon, dark mode) ----------
h=open(PILOT).read()
h=h.replace('href="fonts/','href="../fonts/').replace('data-src="img/','data-src="../img/').replace('src="common.js"','src="../common.js"')
h=h.replace('fill="#111"','fill="currentColor"').replace('stroke="#111"','stroke="currentColor"')
h=h.replace('<link rel="stylesheet" href="../fonts/plex.css">','<script>if(location.hash==="#dark")document.documentElement.classList.add("dark")</script><link rel="stylesheet" href="../fonts/plex.css">')
h=h.replace('<div class="ibtn"><span class="ms">notifications</span><i class="dot"></i></div>','<div class="ibtn"><span class="ms">notifications</span><i class="dot"></i></div>\n      <div class="ibtn"><span class="ms">menu</span></div>')
h=h.replace('.status{height:54px;position:relative;direction:ltr}','.status{height:54px;position:relative;direction:ltr;color:var(--ink)}')
h=h.replace('background:#111}','background:var(--ink)}')
HOME_DARK=DARK_TOK+'''
.fav,.tag,.hot{color:#121212}
html.dark .search .scan .ms,html.dark .cat .av.new,html.dark .addb .ms,html.dark .litem .th b,html.dark .look .buy,html.dark .fit .btn,html.dark .tab.on,html.dark .tab .badge{color:#121212}
html.dark .dots i{background:#3A3833}html.dark .dots i.on{background:var(--ink)}
html.dark .flash{background:#1A1917;box-shadow:inset 0 0 0 1px #2E2C28}
html.dark .flash .cd b{background:#2B2A27}
html.dark .meter .track i{background:#3A3732}html.dark .meter .track i.on{background:var(--ink)}
html.dark .fit .r3{border-top-color:#38352F}
html.dark .tabbar{background:rgba(32,31,28,.84);border-color:rgba(255,255,255,.07);box-shadow:0 10px 30px rgba(0,0,0,.55)}
html.dark .tab{color:#A29D94}html.dark .tab .badge{box-shadow:0 0 0 2px #201F1C}
html.dark .brand{background:var(--surface)}
'''
h=h.replace('</style>',HOME_DARK+'</style>')
write(T,"home",h)

# ---------- shared CSS for new screens ----------
CSS=''':root{--bg:#F8F6F1;--surface:#FFFFFF;--tint:#EEEAE3;--tint2:#E6E1D8;--ink:#121212;--ink2:#5F5B55;--ink3:#8E8A83;--line:#E4DFD6;--on:#fff;--sale:#9B2C2C}
'''+DARK_TOK+'''html.dark{--on:#121212;--sale:#E58C84}
html.dark .swatch i,html.dark .cols i:not(.on){box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}
body{font-family:'IBM Plex Sans Arabic',sans-serif}
.screen{padding-bottom:120px}
.ibtn{width:42px;height:42px;border-radius:21px;display:grid;place-items:center;position:relative;color:var(--ink)}
.ibtn .ms{font-size:24px}
.ibtn.b{box-shadow:inset 0 0 0 1px var(--line);background:var(--surface)}
.ibtn .n{position:absolute;top:3px;left:3px;min-width:17px;height:17px;border-radius:9px;background:var(--ink);color:var(--on);font-size:10px;font-weight:600;display:grid;place-items:center;padding:0 4px;box-shadow:0 0 0 2px var(--bg)}
.search{margin:4px 16px 0;height:48px;border-radius:24px;background:var(--surface);border:1px solid var(--line);display:flex;align-items:center;padding:0 16px 0 6px;gap:10px}
.search .ms{font-size:22px;color:var(--ink2)}
.search .t{flex:1;font-size:14px;color:var(--ink3)}
.search .scan{width:36px;height:36px;border-radius:18px;background:var(--ink);display:grid;place-items:center}
.search .scan .ms{color:var(--on);font-size:19px}
.fav{position:absolute;top:9px;left:9px;width:32px;height:32px;border-radius:16px;background:rgba(255,255,255,.9);display:grid;place-items:center;color:#121212}
.fav .ms{font-size:18px}
.addb{position:absolute;bottom:9px;left:9px;width:32px;height:32px;border-radius:16px;background:#121212;display:grid;place-items:center}
.addb .ms{font-size:20px;color:#fff}
.tag{position:absolute;top:11px;right:11px;font-size:10.5px;font-weight:600;color:#121212;background:rgba(255,255,255,.9);padding:3px 8px;border-radius:6px}
.tag.s{background:#121212;color:#fff;direction:ltr}
.pbrand{font-size:10.5px;letter-spacing:.14em;color:var(--ink3);margin-top:10px;direction:ltr;text-align:right;font-weight:500}
.pname{font-size:13.5px;margin-top:3px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.price{margin-top:4px;display:flex;align-items:baseline;gap:6px;font-size:14.5px;font-weight:600}
.price small{font-size:11px;font-weight:500;color:var(--ink2)}
.price s{font-size:12px;color:var(--ink3);font-weight:400}
.price .off{font-size:11px;color:var(--sale);font-weight:600;direction:ltr}
.swatch{display:flex;gap:5px;margin-top:8px;align-items:center}
.swatch i{width:11px;height:11px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.14)}
.swatch span{font-size:10.5px;color:var(--ink3);margin-right:2px}
.shead{display:flex;align-items:baseline;justify-content:space-between;padding:0 16px;margin-bottom:14px}
.shead h3{font-size:18px;font-weight:600}
.shead .sub{font-size:12.5px;color:var(--ink3);margin-top:3px}
.shead a{font-size:13px;color:var(--ink);font-weight:500;display:flex;align-items:center;gap:1px;border-bottom:1px solid var(--ink);padding-bottom:1px}
.shead a .ms{font-size:18px;margin-bottom:-3px}
.sec{margin-top:30px}
.tabbar{position:absolute;left:16px;right:16px;bottom:30px;height:66px;border-radius:33px;background:rgba(255,255,255,.8);backdrop-filter:blur(22px) saturate(1.6);border:1px solid rgba(0,0,0,.06);box-shadow:0 10px 30px rgba(20,18,14,.12),0 1px 2px rgba(20,18,14,.06);display:flex;align-items:center;justify-content:space-between;padding:0 9px}
.tab{height:48px;min-width:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#6F6B64;position:relative}
.tab span:not(.ms){font-size:10.5px;font-weight:500}
.tab.on{flex-direction:row;gap:7px;background:var(--ink);color:var(--on);border-radius:24px;padding:0 18px 0 16px}
.tab.on span:not(.ms){font-size:13px}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tab .badge{position:absolute;top:1px;left:4px;min-width:17px;height:17px;border-radius:9px;background:var(--ink);color:var(--on);font-size:10px;font-weight:600;display:grid;place-items:center;padding:0 4px;box-shadow:0 0 0 2px #fff}
html.dark .tabbar{background:rgba(32,31,28,.84);border-color:rgba(255,255,255,.07);box-shadow:0 10px 30px rgba(0,0,0,.55)}
html.dark .tab{color:#A29D94}html.dark .tab .badge{box-shadow:0 0 0 2px #201F1C}
'''
def tabbar(on=1):
    t=[("home","الرئيسية"),("grid_view","تسوّق"),("shopping_bag","السلة"),("package_2","طلباتي"),("person","حسابي")]
    o='<div class="tabbar">'
    for k,(ic,l) in enumerate(t):
        o+='<div class="tab%s">%s<span>%s</span>%s</div>'%(" on" if k==on else "",ms(ic),l,'<i class="badge">2</i>' if k==2 else "")
    return o+'</div>'+HOMEIND

# ---------- MENU ----------
MCSS=CSS+'''
.sheet{position:relative}
.grab{width:38px;height:5px;border-radius:3px;background:var(--line);margin:2px auto 0}
.mh{height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 16px 0 14px}
.wm b{display:block;font-weight:500;font-size:20px;letter-spacing:.36em;direction:ltr;line-height:1;margin-left:-.36em}
.wm span{display:block;font-size:10.5px;color:var(--ink3);margin-top:5px}
.quick{margin-top:14px;gap:8px}
.q{flex:0 0 auto;height:36px;border-radius:18px;padding:0 14px;display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;box-shadow:inset 0 0 0 1px var(--line);background:var(--surface)}
.q .ms{font-size:17px}
.q.on{background:var(--ink);color:var(--on);box-shadow:none}
.cats{margin-top:18px}
.row{margin-top:16px}
.row .hscroll{gap:10px}
.main{flex:0 0 auto;width:124px;height:140px;border-radius:18px;position:relative;overflow:hidden;background-color:var(--tint);color:#fff}
.main .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(8,8,8,.78) 0%,rgba(8,8,8,.35) 55%,rgba(8,8,8,.05) 100%)}
.main .tx{position:absolute;right:12px;left:10px;bottom:11px}
.main .tx b{display:block;font-size:15.5px;font-weight:600;line-height:1.3}
.main .tx small{display:flex;align-items:center;justify-content:space-between;font-size:11px;opacity:.85;margin-top:3px}
.main .tx small .ms{font-size:16px}
.main .num{position:absolute;top:10px;right:12px;font-size:10px;letter-spacing:.16em;font-weight:500;direction:ltr;opacity:.85}
.main.solid{background:#121212}
html.dark .main.solid{background:#24221F;box-shadow:inset 0 0 0 1px #37342F}
.main.solid .big{position:absolute;top:30px;right:12px;font-size:30px;font-weight:600;direction:ltr;line-height:1}
.main.solid .big small{font-size:14px;font-weight:500}
.sub{flex:0 0 auto;width:96px}
.sub .si{width:96px;height:108px;border-radius:14px;background-color:var(--tint)}
.sub>span{display:block;font-size:12.5px;margin-top:7px;text-align:center;white-space:nowrap;color:var(--ink)}
.sub .si.more{display:grid;place-items:center;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line)}
.sub .si.more .ms{font-size:24px}
.div{height:1px;background:var(--line);margin:22px 16px 0}
.links{margin:20px 16px 0;display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.lk{height:76px;border-radius:18px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:500;position:relative}
.lk .ms{font-size:23px}
.lk i{position:absolute;top:10px;left:14px;width:7px;height:7px;border-radius:50%;background:var(--ink)}
.lang{margin:10px 16px 0;height:56px;border-radius:18px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 16px 0 6px}
.lang .l{display:flex;align-items:center;gap:10px;font-size:13.5px;font-weight:500}
.lang .l .ms{font-size:22px}
.seg{display:flex;background:var(--tint);border-radius:22px;padding:3px}
.seg span{height:38px;padding:0 16px;border-radius:19px;display:flex;align-items:center;font-size:12.5px;color:var(--ink2)}
.seg span.on{background:var(--ink);color:var(--on);font-weight:500}
.contact{margin:10px 16px 0;height:56px;border-radius:18px;background:var(--tint);display:flex;align-items:center;justify-content:space-between;padding:0 16px 0 10px}
.contact .l{display:flex;align-items:center;gap:10px}
.contact .l .ms{font-size:22px}
.contact b{display:block;font-size:13.5px;font-weight:500}
.contact small{display:block;font-size:11.5px;color:var(--ink3);margin-top:1px}
.contact .cb{display:flex;gap:6px}
.contact .cb span{width:38px;height:38px;border-radius:19px;background:var(--surface);display:grid;place-items:center}
.contact .cb .ms{font-size:19px}
.foot{text-align:center;font-size:11px;color:var(--ink3);margin-top:18px;letter-spacing:.02em}
'''
rows=[
 ("01","وصل حديثاً","86 قطعة","hero-green","0.45 0.45 1.3",[("هذا الأسبوع","olive-jacket","0.6 0.5 1.25",""),("فساتين","blue-dot","0.52 0.5 1.25",""),("حقائب","floral-bag","0.42 0.52 1.5","mult"),("أحذية","nude-heels","0.52 0.56 1.45","mult")]),
 ("02","فساتين","248 قطعة","red-dress","0.1 0.45 1.4",[("ميدي","rust-1","0.5 0.48 1.2",""),("ماكسي","cream-maxi","0.4 0.45 1.1",""),("سهرة","black-dress","0.46 0.5 1.3",""),("كاجوال","floral-romper","0.5 0.42 1.15","")]),
 ("03","عبايات","164 قطعة","abaya-sil","0.55 0.6 1.3",[("كلاسيكية","abaya-road","0.5 0.62 3.2",""),("كيمونو","long-floral","0.5 0.62 1.9",""),("صيفية فاتحة","abaya-white","0.36 0.47 3.2",""),("مطرّزة","abaya-desert","0.43 0.62 4.2","")]),
 ("04","معاطف وجاكيتات","112 قطعة","hero-trench","0.42 0.4 1.25",[("ترنش","pink-trench","0.5 0.4 1.6",""),("صوف","orange-coat","0.45 0.6 1.3",""),("جاكيتات","olive-jacket","0.5 0.5 1.1",""),("معاطف طويلة","yellow-coat","0.62 0.6 1.4","")]),
 ("05","حقائب","96 قطعة","patent-clutch","0.47 0.45 1.4",[("حقائب كتف","floral-bag","0.45 0.48 1.25","mult"),("حقائب يد","black-bag","0.5 0.8 1.25","mult"),("كلاتش","red-skirt","0.33 0.75 2.2",""),("جلدية","brown-bag","0.48 0.4 1.7","")]),
 ("06","أحذية","134 قطعة","red-pumps","0.6 0.72 1.5",[("كعب عالٍ","black-heels","0.62 0.55 1.5","mult"),("صنادل","nude-heels","0.52 0.56 1.4","mult"),("رياضية","sneak-white","0.55 0.6 1.4",""),("مسطّحة","sneak-feet","0.5 0.4 1.4","")]),
 ("07","إكسسوارات","210 قطعة","accessories","0.62 0.5 1.1",[("نظارات","sunglasses","0.22 0.26 2.4",""),("خواتم","ring","0.6 0.45 1.6",""),("أساور","bracelets","0.4 0.55 1.6",""),("قلادات","necklace","0.5 0.5 1.6","")]),
]
def mrow(r):
    num,name,cnt,img,f,subs=r
    o='<div class="row"><div class="hscroll">'
    o+=ph("clothes/%s.jpg"%img,f,"main",'<div class="sc"></div><span class="num">%s</span><div class="tx"><b>%s</b><small>%s%s</small></div>'%(num,name,cnt,ms("arrow_back")))
    for n,i,ff,c in subs:
        o+='<div class="sub">%s<span>%s</span></div>'%(ph("clothes/%s.jpg"%i,ff,"si "+c),n)
    return o+'</div></div>'
body=STATUS+'<div class="sheet"><div class="grab"></div><div class="mh"><div class="wm"><b>LUJAIN</b><span>دار أزياء نسائية</span></div><div class="ibtn b">%s</div></div>'%ms("close")
body+='<div class="search">%s<div class="t">ابحثي في كل الأقسام…</div><div class="scan">%s</div></div>'%(ms("search"),ms("center_focus_weak"))
body+='<div class="hscroll quick"><div class="q on">%sالأكثر طلباً</div><div class="q">%sإصدارات حصرية</div><div class="q">%sهدايا</div><div class="q">%sمصمّمات</div></div>'%(ms("trending_up"),ms("diamond"),ms("redeem"),ms("styler"))
body+='<div class="cats">'+''.join(mrow(r) for r in rows)
# sale row
body+='<div class="row"><div class="hscroll"><div class="main solid"><span class="num">08</span><div class="big">-50%%</div><div class="tx"><b>تخفيضات</b><small>حتى نصف السعر%s</small></div></div>'%ms("arrow_back")
for n,i,ff in [("حتى <span class='ltr'>30%</span>","velvet","0.55 0.5 1.6"),("حتى <span class='ltr'>50%</span>","knit-dress","0.5 0.45 1.3"),("آخر القطع","lace-top","0.5 0.55 1.2"),("أحذية","black-heels","0.6 0.55 1.4")]:
    body+='<div class="sub">%s<span>%s</span></div>'%(ph("clothes/%s.jpg"%i,ff,"si"+(" mult" if i=="black-heels" else "")),n)
body+='</div></div></div><div class="div"></div>'
body+='<div class="links"><div class="lk">%s حسابي</div><div class="lk">%s طلباتي<i></i></div><div class="lk">%s المفضلة</div><div class="lk">%s العناوين</div></div>'%(ms("person"),ms("package_2"),ms("favorite"),ms("location_on"))
body+='<div class="lang"><div class="l">%sاللغة</div><div class="seg"><span class="on">العربية</span><span>English</span></div></div>'%ms("language")
body+='<div class="contact"><div class="l">%s<div><b>تواصلي معنا</b><small>خدمة العميلات يومياً 9 ص – 11 م</small></div></div><div class="cb"><span>%s</span><span>%s</span></div></div>'%(ms("support_agent"),ms("chat"),ms("call"))
body+='<div class="foot ltr" style="display:block">LUJAIN · v4.2</div></div>'+HOMEIND
write(T,"menu",page("Lujain — Menu",F,MCSS.replace('.screen{padding-bottom:120px}','.screen{padding-bottom:44px}'),body))

# ---------- LISTING ----------
LCSS=CSS+'''
.lh{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 10px}
.lh .tt{text-align:center}
.lh .tt b{display:block;font-size:17px;font-weight:600}
.lh .tt small{display:block;font-size:11.5px;color:var(--ink3);margin-top:1px}
.lh .ic{display:flex}
.subs{margin-top:6px;gap:8px}
.sc{flex:0 0 auto;height:36px;border-radius:18px;padding:0 16px;display:flex;align-items:center;font-size:13px;box-shadow:inset 0 0 0 1px var(--line);background:var(--surface)}
.sc.on{background:var(--ink);color:var(--on);box-shadow:none;font-weight:500}
.fbar{margin:14px 16px 0;display:flex;gap:8px;align-items:center}
.fb{height:40px;border-radius:12px;display:flex;align-items:center;gap:7px;padding:0 13px;font-size:13px;font-weight:500;box-shadow:inset 0 0 0 1px var(--line);background:var(--surface)}
.fb .ms{font-size:19px}
.fb b{min-width:18px;height:18px;border-radius:9px;background:var(--ink);color:var(--on);font-size:10.5px;display:grid;place-items:center;font-weight:600}
.fb.sort{flex:1}
.fb.sort span.v{color:var(--ink3);font-weight:400}
.fb.vw{width:40px;padding:0;justify-content:center}
.tags{margin-top:10px;gap:6px}
.tg{flex:0 0 auto;height:30px;border-radius:15px;background:var(--tint);display:flex;align-items:center;gap:4px;padding:0 10px 0 7px;font-size:12px}
.tg .ms{font-size:15px;color:var(--ink2)}
.tg.clr{background:none;text-decoration:underline;color:var(--ink2);padding:0 4px}
.count{margin:14px 16px 0;font-size:12px;color:var(--ink3);display:flex;justify-content:space-between}
.count b{color:var(--ink);font-weight:500}
.grid{margin:10px 16px 0;display:grid;grid-template-columns:1fr 1fr;column-gap:11px;row-gap:22px}
.gi .pimg{height:228px;border-radius:16px;background-color:var(--tint);position:relative;overflow:hidden}
.promo{grid-column:span 2;height:180px;border-radius:20px;position:relative;overflow:hidden;color:#fff;background-color:var(--tint)}
.promo .sc2{position:absolute;inset:0;background:linear-gradient(270deg,rgba(10,10,10,.7) 0%,rgba(10,10,10,.35) 50%,rgba(10,10,10,0) 75%)}
.promo .tx{position:absolute;right:18px;top:18px;bottom:18px;width:190px;display:flex;flex-direction:column}
.promo small{font-size:11px;opacity:.85}
.promo b{font-size:19px;font-weight:600;line-height:1.35;margin-top:5px}
.promo .cta{margin-top:auto;align-self:flex-start;height:34px;padding:0 14px 0 11px;border-radius:17px;display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.45);backdrop-filter:blur(14px)}
.promo .cta .ms{font-size:17px}
.more{margin:28px 16px 0;text-align:center}
.more .pr{height:3px;border-radius:2px;background:var(--line);width:140px;margin:0 auto;overflow:hidden}
.more .pr i{display:block;height:100%;width:20%;background:var(--ink)}
.more small{display:block;font-size:12px;color:var(--ink3);margin-top:9px}
.more .btn{margin:14px auto 0;height:46px;width:220px;border-radius:23px;box-shadow:inset 0 0 0 1.5px var(--ink);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;font-weight:500}
.more .btn .ms{font-size:19px}
'''
def gcard(img,f,brand,name,price,old=None,tag=None,sw=(),mult=False,fav=False):
    inner=(('<span class="tag%s">%s</span>'%(" s" if tag.startswith("-") else "",tag)) if tag else '')+'<div class="fav">%s</div><div class="addb">%s</div>'%(ms("favorite","fill" if fav else ""),ms("add"))
    pr='%s <small>%s</small>'%(price,CUR)+(' <s>%s</s>'%old if old else '')
    swh=('<div class="swatch">'+''.join('<i style="background:%s"></i>'%c for c in sw[:3])+('<span class="ltr">+%d</span>'%(len(sw)-3) if len(sw)>3 else '')+'</div>') if sw else ''
    return '<div class="gi">%s<div class="pbrand">%s</div><div class="pname">%s</div><div class="price">%s</div>%s</div>'%(ph("clothes/%s.jpg"%img,f,"pimg"+(" mult" if mult else ""),inner),brand,name,pr,swh)
prods=[
 ("rust-2","0.5 0.52 1.12","LINA K.","فستان ساتان ميدي بحمالات","1,190","1,490","-20%",("#B4532A","#151515","#E7D7BE","#5B6142")),
 ("blue-dot","0.52 0.55 1.05","SAHAR","فستان منقّط بقصّة A","690",None,"جديد",("#1F49A8","#151515")),
 ("black-dress","0.46 0.6 1.15","ATELIER NOOR","فستان أسود بقصّة ضيّقة","1,040",None,None,("#151515","#6B1E2B","#2D3A55")),
 ("cream-maxi","0.4 0.5 1.05","MAISON RAYA","فستان ماكسي بكشكش","1,290",None,"حصري",("#EADFCB","#C9B79B")),
 ("red-dress","0.09 0.5 1.25","LINA K.","فستان ميدي بفتحة أمامية","960",None,None,("#C62C35","#151515")),
 ("knit-dress","0.5 0.5 1.25","SAHAR","فستان صوف قصير","490","820","-40%",("#151515","#8A7E72")),
 ("beige-dress","0.45 0.52 1.05","DAR AL HAREER","فستان محبوك بلون الرمل","780",None,None,("#D9C6AA","#151515","#7C5A3C")),
 ("floral-romper","0.5 0.45 1.05","MAISON RAYA","جمبسوت قصير مطبّع","640",None,"جديد",("#20232E","#C8473F")),
]
body=STATUS+'<div class="lh"><div class="ibtn">%s</div><div class="tt"><b>فساتين</b><small>248 قطعة</small></div><div class="ic"><div class="ibtn">%s</div><div class="ibtn">%s<i class="n">2</i></div></div></div>'%(ms("arrow_forward"),ms("search"),ms("shopping_bag"))
body+='<div class="hscroll subs">'+''.join('<div class="sc%s">%s</div>'%(" on" if k==0 else "",s) for k,s in enumerate(["الكل","ميدي","ماكسي","سهرة","كاجوال","ساتان","مطرّزة"]))+'</div>'
body+='<div class="fbar"><div class="fb">%sفلترة<b>3</b></div><div class="fb sort">%sترتيب: <span class="v">الأحدث</span></div><div class="fb vw">%s</div><div class="fb vw">%s</div></div>'%(ms("tune"),ms("swap_vert"),ms("grid_view"),ms("view_agenda"))
body+='<div class="hscroll tags"><div class="tg">%sالمقاس: M</div><div class="tg">%sاللون: أسود، أحمر</div><div class="tg">%sمن 500 إلى 1,500 ر.س</div><div class="tg clr">مسح الكل</div></div>'%(ms("close"),ms("close"),ms("close"))
body+='<div class="count"><span><b>124</b> نتيجة</span><span>شحن مجاني فوق 500 ر.س</span></div><div class="grid">'
for k,p in enumerate(prods):
    if k==4:
        body+=ph("clothes/camel-dress.jpg","0.5 0.4 1.25","promo",'<div class="sc2"></div><div class="tx"><small>مجموعة النهار</small><b>فستانان بخصم <span class="ltr">15%%</span> إضافي</b><div class="cta">تسوّقي العرض%s</div></div>'%ms("arrow_back"))
    body+=gcard(p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],fav=(k==2))
body+='</div><div class="more"><div class="pr"><i></i></div><small>شاهدتِ 24 من 124 قطعة</small><div class="btn">عرض المزيد%s</div></div>'%ms("expand_more")
body+=tabbar(1)
write(T,"listing",page("Lujain — Dresses",F,LCSS,body))

# ---------- PRODUCT ----------
PCSS=CSS+'''
.screen{padding-bottom:112px}
.ph{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 10px}
.ph .ic{display:flex}
.gal{margin:0 16px;height:470px;border-radius:24px;position:relative;overflow:hidden;background-color:var(--tint)}
.gal .cnt{position:absolute;top:14px;right:14px;height:26px;padding:0 10px;border-radius:13px;background:rgba(18,18,18,.55);color:#fff;font-size:11.5px;display:flex;align-items:center;direction:ltr;backdrop-filter:blur(8px)}
.gal .badge3{position:absolute;top:14px;left:14px;height:26px;padding:0 10px;border-radius:13px;background:rgba(255,255,255,.9);color:#121212;font-size:11.5px;font-weight:500;display:flex;align-items:center;gap:4px}
.gal .badge3 .ms{font-size:15px}
.gal .gd{position:absolute;bottom:14px;left:0;right:0;display:flex;justify-content:center;gap:5px}
.gal .gd i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.55)}
.gal .gd i.on{width:20px;background:#fff}
.thumbs{margin-top:10px;gap:8px}
.th{flex:0 0 auto;width:62px;height:78px;border-radius:12px;background-color:var(--tint)}
.th.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--ink)}
.th.more{display:grid;place-items:center;background:var(--tint);font-size:12px;color:var(--ink2)}
.info{padding:0 16px;margin-top:20px}
.info .br{display:flex;justify-content:space-between;align-items:center}
.info .br b{font-size:11.5px;letter-spacing:.18em;font-weight:500;direction:ltr;color:var(--ink2)}
.rate{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--ink2)}
.rate .ms{font-size:15px;color:var(--ink)}
.rate b{color:var(--ink);font-weight:600}
h1{font-size:21px;font-weight:600;margin-top:6px;line-height:1.4}
.pr2{display:flex;align-items:center;gap:8px;margin-top:10px}
.pr2 b{font-size:22px;font-weight:600}
.pr2 b small{font-size:13px;font-weight:500;color:var(--ink2)}
.pr2 s{font-size:14px;color:var(--ink3)}
.pr2 .off{height:24px;padding:0 8px;border-radius:7px;background:var(--sale);color:#fff;font-size:12px;font-weight:600;display:flex;align-items:center;direction:ltr}
html.dark .pr2 .off{color:#1A0E0D}
.inst{font-size:12px;color:var(--ink2);margin-top:6px}
.inst b{color:var(--ink);font-weight:600}
.opt{margin-top:22px;padding:0 16px}
.opt .ol{display:flex;justify-content:space-between;align-items:baseline;font-size:13.5px;font-weight:500}
.opt .ol span{color:var(--ink2);font-weight:400}
.opt .ol a{font-size:12.5px;display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--ink)}
.opt .ol a .ms{font-size:16px}
.cols{display:flex;gap:12px;margin-top:12px}
.cols i{width:38px;height:38px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.cols i.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--ink)}
.sizes{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:12px}
.sz{height:46px;border-radius:14px;box-shadow:inset 0 0 0 1px var(--line);background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:14px;font-weight:500;direction:ltr;position:relative}
.sz small{font-size:9.5px;color:var(--sale);font-weight:500;direction:rtl}
.sz.on{background:var(--ink);color:var(--on);box-shadow:none}
.sz.x{color:var(--ink3);background:transparent}
.sz.x:after{content:'';position:absolute;left:12px;right:12px;top:50%;height:1px;background:var(--ink3);transform:rotate(-20deg)}
.fitbox{margin:14px 16px 0;background:var(--tint);border-radius:20px;padding:16px}
.fitbox .r1{display:flex;gap:12px;align-items:center}
.fitbox .ic{width:40px;height:40px;border-radius:20px;background:var(--surface);display:grid;place-items:center;flex:0 0 auto}
.fitbox .ic .ms{font-size:22px}
.fitbox h4{font-size:14.5px;font-weight:600}
.fitbox p{font-size:12px;color:var(--ink2);margin-top:2px}
.meter{margin-top:14px}
.meter .track{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px}
.meter .track i{height:5px;border-radius:3px;background:#D6D0C6}
html.dark .meter .track i{background:#3A3732}
.meter .track i.on{background:var(--ink)}
.meter .lbl{display:grid;grid-template-columns:1fr 1fr 1fr;margin-top:6px;font-size:11px;color:var(--ink2);text-align:center}
.meter .lbl b{color:var(--ink);font-weight:600}
table.st{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px;text-align:center;background:var(--surface);border-radius:14px;overflow:hidden}
table.st th{font-weight:500;color:var(--ink2);padding:9px 0;font-size:11.5px;border-bottom:1px solid var(--line)}
table.st td{padding:8px 0;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
table.st tr:last-child td{border-bottom:0}
table.st td:first-child{font-weight:600}
table.st tr.on td{background:var(--tint2);font-weight:600}
.unit{font-size:10.5px;color:var(--ink3);margin-top:7px}
.look{margin:0 16px;background:var(--surface);border-radius:22px;padding:10px;display:flex;gap:12px;border:1px solid var(--line)}
.look .lim{width:150px;height:262px;border-radius:16px;flex:0 0 auto;position:relative;background-color:var(--tint)}
.hot{position:absolute;width:24px;height:24px;border-radius:12px;background:rgba(255,255,255,.95);display:grid;place-items:center;font-size:11.5px;font-weight:600;color:#121212;box-shadow:0 0 0 5px rgba(255,255,255,.32)}
.look .items{flex:1;display:flex;flex-direction:column;padding:4px 0 2px;min-width:0}
.litem{display:flex;gap:10px;align-items:center;margin-top:10px}
.litem:first-child{margin-top:2px}
.litem .t{width:48px;height:56px;border-radius:10px;background-color:var(--tint);flex:0 0 auto;position:relative}
.litem .t b{position:absolute;top:-5px;right:-5px;width:18px;height:18px;border-radius:9px;background:var(--ink);color:var(--on);font-size:10px;font-weight:600;display:grid;place-items:center}
.litem .n{font-size:12.5px;line-height:1.4}
.litem .p{font-size:13px;font-weight:600;margin-top:2px}
.litem .p small{font-size:10px;color:var(--ink2);font-weight:500}
.look .buy{margin-top:auto;white-space:nowrap;height:42px;border-radius:21px;background:var(--ink);color:var(--on);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500}
.look .buy .ms{font-size:18px}
.look .save{font-size:11px;color:var(--ink2);text-align:center;margin-top:7px}
.care{margin:0 16px;border-radius:22px;background:var(--surface);border:1px solid var(--line);padding:16px}
.care .cg{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.care .c{text-align:center}
.care .c span.ms{width:46px;height:46px;border-radius:23px;background:var(--tint);display:grid;place-items:center;margin:0 auto;font-size:22px}
.care .c small{display:block;font-size:11px;color:var(--ink2);margin-top:7px;line-height:1.4}
.care .comp{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);display:flex;justify-content:space-between;font-size:12.5px}
.care .comp span{color:var(--ink2)}
.deliv{margin:0 16px;border-radius:22px;background:var(--tint);padding:4px 16px}
.dv{display:flex;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line)}
html.dark .dv{border-bottom-color:#36332E}
.dv:last-child{border-bottom:0}
.dv .ms{font-size:22px}
.dv b{display:block;font-size:13px;font-weight:500}
.dv small{display:block;font-size:11.5px;color:var(--ink2);margin-top:1px}
.dv .go{margin-right:auto;font-size:18px;color:var(--ink3)}
.acc{margin:0 16px;border-top:1px solid var(--line)}
.ac{border-bottom:1px solid var(--line);padding:16px 0}
.ac .ah{display:flex;justify-content:space-between;align-items:center;font-size:14.5px;font-weight:500}
.ac .ah .ms{font-size:22px;color:var(--ink2)}
.ac ul{margin-top:10px;padding-right:16px;font-size:12.5px;color:var(--ink2);line-height:1.9}
.rev{margin:0 16px}
.rs{display:flex;gap:18px;align-items:center}
.rs .big{text-align:center;flex:0 0 auto;width:96px}
.rs .big b{font-size:40px;font-weight:600;line-height:1}
.rs .big .stars{display:flex;justify-content:center;margin-top:6px}
.rs .big .stars .ms{font-size:15px}
.rs .big small{display:block;font-size:11px;color:var(--ink3);margin-top:4px}
.bars{flex:1}
.bars .b{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--ink2);margin:3px 0}
.bars .b span{width:8px;text-align:center}
.bars .b i{flex:1;height:5px;border-radius:3px;background:var(--line);overflow:hidden;display:block}
.bars .b i em{display:block;height:100%;background:var(--ink);border-radius:3px}
.fitsum{margin-top:14px;display:flex;gap:8px}
.fitsum div{flex:1;background:var(--tint);border-radius:14px;padding:10px 12px}
.fitsum small{display:block;font-size:11px;color:var(--ink2)}
.fitsum b{display:block;font-size:13px;font-weight:600;margin-top:2px}
.prv{margin-top:14px;gap:8px}
.pv{flex:0 0 auto;width:86px;height:104px;border-radius:14px;background-color:var(--tint);position:relative}
.pv.more{display:grid;place-items:center;background:var(--tint);font-size:12px;color:var(--ink2);text-align:center;line-height:1.4}
.rcard{margin-top:12px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:14px}
.rcard .top{display:flex;justify-content:space-between;align-items:center}
.rcard .who{display:flex;gap:9px;align-items:center}
.rcard .av{width:34px;height:34px;border-radius:17px;background:var(--tint2);display:grid;place-items:center;font-size:13px;font-weight:600}
.rcard .who b{display:block;font-size:13px;font-weight:500}
.rcard .who small{display:block;font-size:11px;color:var(--ink3)}
.rcard .st5{display:flex}.rcard .st5 .ms{font-size:14px}
.rcard p{font-size:12.5px;line-height:1.75;color:var(--ink2);margin-top:9px}
.rcard .meta{display:flex;gap:6px;margin-top:9px}
.rcard .meta span{font-size:11px;background:var(--tint);border-radius:8px;padding:3px 8px;color:var(--ink2)}
.prow{gap:12px}
.pc{flex:0 0 auto;width:140px}
.pc .pimg{height:176px;border-radius:16px;background-color:var(--tint);position:relative;overflow:hidden}
.mini{flex:0 0 auto;width:250px;display:flex;gap:10px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:8px}
.mini .mi{width:70px;height:84px;border-radius:12px;background-color:var(--tint);flex:0 0 auto}
.mini .mt{flex:1;min-width:0}
.mini .mt .pname{font-size:12.5px;margin-top:2px}
.mini .pbrand{margin-top:0}
.mini .ad{width:34px;height:34px;border-radius:17px;background:var(--ink);display:grid;place-items:center;flex:0 0 auto}
.mini .ad .ms{color:var(--on);font-size:19px}
.sticky{position:absolute;left:0;right:0;bottom:0;height:100px;background:rgba(248,246,241,.9);backdrop-filter:blur(20px);border-top:1px solid var(--line);display:flex;align-items:flex-start;gap:10px;padding:12px 16px 0}
html.dark .sticky{background:rgba(20,20,19,.9)}
.sticky .sp{flex:0 0 auto}
.sticky .sp small{display:block;font-size:11px;color:var(--ink3)}
.sticky .sp b{font-size:18px;font-weight:600}
.sticky .sp b small{display:inline;font-size:11px;color:var(--ink2)}
.sticky .cart{flex:1;height:52px;border-radius:26px;background:var(--ink);color:var(--on);display:flex;align-items:center;justify-content:center;gap:8px;font-size:14.5px;font-weight:500}
.sticky .cart .ms{font-size:21px}
.sticky .fv{width:52px;height:52px;border-radius:26px;box-shadow:inset 0 0 0 1px var(--line);background:var(--surface);display:grid;place-items:center}
.sticky .homeind{bottom:8px}
'''
def stars(n=5,half=False):
    return ''.join(ms("star","fill") for _ in range(n))+(ms("star_half","fill") if half else '')
body=STATUS+'<div class="ph"><div class="ibtn">%s</div><div class="ic"><div class="ibtn">%s</div><div class="ibtn">%s<i class="n">2</i></div></div></div>'%(ms("arrow_forward"),ms("share"),ms("shopping_bag"))
body+=ph("clothes/rust-1.jpg","0.5 0.5 1","gal",'<div class="cnt">1 / 5</div><div class="badge3">%sالأكثر طلباً</div><div class="gd"><i class="on"></i><i></i><i></i><i></i><i></i></div>'%ms("local_fire_department","fill"))
body+='<div class="hscroll thumbs">'+ph("clothes/rust-1.jpg","0.5 0.45 1.3","th on")+ph("clothes/rust-2.jpg","0.5 0.4 1.4","th")+ph("clothes/rust-3.jpg","0.5 0.55 1.4","th")+ph("clothes/rust-4.jpg","0.5 0.6 1.2","th")+'<div class="th more"><span class="ltr">+1</span></div></div>'
body+='<div class="info"><div class="br"><b>LINA K.</b><div class="rate">%s<b>4.8</b><span>(126 تقييماً)</span></div></div><h1>فستان ساتان ميدي بحمالات رفيعة</h1>'%ms("star","fill")
body+='<div class="pr2"><b>1,190 <small>ر.س</small></b><s>1,490</s><span class="off">-20%</span></div><div class="inst">أو 4 دفعات بقيمة <b>297.50 ر.س</b> بدون فوائد</div></div>'
body+='<div class="opt"><div class="ol"><div>اللون: <span>برتقالي محروق</span></div></div><div class="cols"><i class="on" style="background:#B4532A"></i><i style="background:#151515"></i><i style="background:#E7D7BE"></i><i style="background:#5B6142"></i><i style="background:#7A2433"></i></div></div>'
body+='<div class="opt"><div class="ol"><div>المقاس: <span>M</span></div><a>%sدليل المقاسات</a></div><div class="sizes"><div class="sz">XS</div><div class="sz">S</div><div class="sz on">M</div><div class="sz">L<small>قطعتان</small></div><div class="sz x">XL</div></div></div>'%ms("straighten")
body+='<div class="fitbox"><div class="r1"><div class="ic">%s</div><div><h4>نقترح لكِ مقاس M</h4><p>حسب قياساتك المحفوظة: الطول 165 سم · الوزن 58 كغ</p></div></div>'%ms("check_circle")
body+='<div class="meter"><div class="track"><i></i><i class="on"></i><i></i></div><div class="lbl"><span>ضيّق</span><b>مطابق للمقاس</b><span>واسع</span></div></div>'
body+='<table class="st"><tr><th>المقاس</th><th>الصدر</th><th>الخصر</th><th>الورك</th><th>الطول</th></tr><tr><td>S</td><td>84</td><td>66</td><td>92</td><td>118</td></tr><tr class="on"><td>M</td><td>88</td><td>70</td><td>96</td><td>120</td></tr><tr><td>L</td><td>94</td><td>76</td><td>102</td><td>122</td></tr></table><div class="unit">القياسات بالسنتيمتر · العارضة طولها 172 سم وترتدي مقاس S</div></div>'
body+='<div class="sec"><div class="shead"><div><h3>أكملي الإطلالة</h3><div class="sub">نسّقتها خبيرة الأزياء مع هذا الفستان</div></div></div><div class="look">'+ph("clothes/rust-3.jpg","0.5 0.5 1.05","lim",'<div class="hot" style="top:96px;left:70px">1</div><div class="hot" style="top:226px;left:40px">2</div>')
body+='<div class="items">'
for k,(img,f,n,p,m) in enumerate([("nude-heels","0.52 0.56 1.6","صندل بكعب رفيع","890",1),("patent-clutch","0.47 0.45 1.9","حقيبة يد جلد لامع","740",1),("sunglasses","0.2 0.24 3.0","نظارة شمسية دائرية","450",0)]):
    body+='<div class="litem">%s<div><div class="n">%s</div><div class="p">%s <small>ر.س</small></div></div></div>'%(ph("clothes/%s.jpg"%img,f,"t"+(" mult" if m else ""),"<b>%d</b>"%(k+1)),n,p)
body+='<div class="buy">%sأضيفي الإطلالة · 3,032 ر.س</div><div class="save">وفّري <span class="ltr">10%%</span> عند شراء القطع الأربع</div></div></div></div>'%ms("shopping_bag")
body+='<div class="sec"><div class="shead"><div><h3>الخامة والعناية</h3></div></div><div class="care"><div class="cg">'
for ic,t in [("local_laundry_service","غسيل يدوي<br>30°"),("dry_cleaning","تنظيف جاف<br>مُفضّل"),("iron","كيّ بحرارة<br>منخفضة"),("block","لا تستخدمي<br>المبيّض")]:
    body+='<div class="c"><span class="ms">%s</span><small>%s</small></div>'%(ic,t)
body+='</div><div class="comp"><span>التركيب</span><b style="font-weight:500">ساتان فسكوز <span class="ltr">95%</span> · إيلاستين <span class="ltr">5%</span></b></div></div></div>'
body+='<div class="sec"><div class="deliv"><div class="dv">%s<div><b>توصيل سريع إلى الرياض</b><small>اطلبي خلال 3 ساعات ويصلك غداً</small></div></div><div class="dv">%s<div><b>إرجاع مجاني خلال 14 يوماً</b><small>نستلم القطعة من باب منزلك</small></div>%s</div><div class="dv">%s<div><b>أصلي <span class="ltr">100%%</span> ومن المصمّمة مباشرة</b><small>مع تغليف هدايا فاخر عند الطلب</small></div></div></div></div>'%(ms("local_shipping"),ms("autorenew"),ms("chevron_left","go"),ms("verified"))
body+='<div class="sec"><div class="acc"><div class="ac"><div class="ah">تفاصيل المنتج%s</div><ul><li>قصّة منسدلة بطول ميدي وفتحة جانبية خفيفة</li><li>حمالات رفيعة قابلة للتعديل وظهر مكشوف</li><li>مبطّن بالكامل · سحّاب مخفي جانبي</li></ul></div><div class="ac"><div class="ah">المقاس والقصّة%s</div></div><div class="ac"><div class="ah">الشحن والإرجاع%s</div></div></div></div>'%(ms("expand_less"),ms("expand_more"),ms("expand_more"))
body+='<div class="sec"><div class="shead"><div><h3>آراء العميلات</h3></div><a>كل التقييمات%s</a></div><div class="rev"><div class="rs"><div class="big"><b>4.8</b><div class="stars">%s</div><small>126 تقييماً</small></div><div class="bars">'%(ms("chevron_left"),stars(4,True))
for s,w in [(5,82),(4,12),(3,4),(2,1),(1,1)]:
    body+='<div class="b"><span>%d</span><i><em style="width:%d%%"></em></i></div>'%(s,w)
body+='</div></div><div class="fitsum"><div><small>المقاس</small><b>مطابق · <span class="ltr">87%</span></b></div><div><small>الطول</small><b>مناسب · <span class="ltr">91%</span></b></div><div><small>الخامة</small><b>ممتازة · <span class="ltr">94%</span></b></div></div></div>'
body+='<div class="hscroll prv">'+ph("clothes/rust-4.jpg","0.5 0.55 1.3","pv")+ph("clothes/rust-3.jpg","0.5 0.35 1.6","pv")+ph("clothes/rust-2.jpg","0.5 0.5 1.6","pv")+ph("clothes/rust-1.jpg","0.5 0.3 1.8","pv")+'<div class="pv more"><span class="ltr">+38</span><br>صورة</div></div>'
body+='<div class="rev"><div class="rcard"><div class="top"><div class="who"><div class="av">ر</div><div><b>ريم العتيبي</b><small>مشترية موثّقة · قبل 3 أيام</small></div></div><div class="st5">%s</div></div><p>الخامة ناعمة جداً واللون أجمل من الصور. أخذت مقاس M كما اقترح التطبيق وكان مثالياً، والطول مناسب مع كعب متوسط.</p><div class="meta"><span>المقاس: M</span><span>الطول: 163 سم</span></div></div></div></div>'%stars()
body+='<div class="sec"><div class="shead"><div><h3>تتناسق معه</h3></div><a>الكل%s</a></div><div class="hscroll prow">'%ms("chevron_left")
for img,f,b,n,p,m in [("nude-heels","0.52 0.56 1.5","MAISON RAYA","صندل بكعب رفيع لامع","890",1),("patent-clutch","0.47 0.45 1.6","ATELIER NOOR","حقيبة يد جلد لامع","740",1),("ring","0.6 0.45 1.4","DAR AL HAREER","خاتم ذهبي بحجر وردي","1,350",0)]:
    body+='<div class="mini">%s<div class="mt"><div class="pbrand">%s</div><div class="pname">%s</div><div class="price">%s <small>ر.س</small></div></div><div class="ad">%s</div></div>'%(ph("clothes/%s.jpg"%img,f,"mi"+(" mult" if m else "")),b,n,p,ms("add"))
body+='</div></div><div class="sec"><div class="shead"><div><h3>قد يعجبكِ أيضاً</h3></div><a>المزيد%s</a></div><div class="hscroll prow">'%ms("chevron_left")
for img,f,b,n,p in [("blue-dot","0.52 0.55 1.05","SAHAR","فستان منقّط بقصّة A","690"),("cream-maxi","0.4 0.5 1.05","MAISON RAYA","فستان ماكسي بكشكش","1,290"),("beige-dress","0.45 0.52 1.05","DAR AL HAREER","فستان محبوك بلون الرمل","780"),("red-dress","0.09 0.5 1.25","LINA K.","فستان ميدي بفتحة أمامية","960")]:
    body+='<div class="pc">%s<div class="pbrand">%s</div><div class="pname">%s</div><div class="price">%s <small>ر.س</small></div></div>'%(ph("clothes/%s.jpg"%img,f,"pimg",'<div class="fav">%s</div>'%ms("favorite")),b,n,p)
body+='</div></div>'
body+='<div class="sticky"><div class="fv">%s</div><div class="cart">%sأضيفي إلى السلة</div><div class="sp"><small>المقاس M</small><b>1,190 <small>ر.س</small></b></div>%s</div>'%(ms("favorite"),ms("shopping_bag"),HOMEIND)
write(T,"product",page("Lujain — Product",F,PCSS,body))
print("ok")
