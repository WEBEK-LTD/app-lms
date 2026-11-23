# NOUN — clothes template B: contemporary streetwear-chic. Changa, concrete + ink + cobalt.
from lib import *
T="clothes-B"; F="changa"; C="ر.س"
def I(n): return "clothes/%s.jpg"%n
def L(x): return f'<span class="ltr">{x}</span>'

CSS='''
:root{--bg:#EEEEEA;--surface:#FFFFFF;--tint:#E3E3DE;--tint2:#D8D8D2;--ink:#0B0B0C;--ink2:#505156;--ink3:#86878C;--line:#DADAD4;--acc:#2B3FF0;--accT:#2B3FF0;--accS:#DCE0FF;--on:#fff;--bar:rgba(14,14,15,.88)}
html.dark{--bg:#0A0A0B;--surface:#151517;--tint:#1D1D20;--tint2:#26262A;--ink:#F3F3F0;--ink2:#B0B1B6;--ink3:#85868C;--line:#2A2A2E;--acc:#3A4DFF;--accT:#9AA5FF;--accS:#1C2150;--on:#0B0B0C;--bar:rgba(34,34,38,.9)}
body{font-family:'Changa',sans-serif}
.screen{padding-bottom:124px}
.lat{font-family:'Changa';direction:ltr;letter-spacing:.06em;text-transform:uppercase}
.hd{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px 0 8px}
.logo{display:flex;align-items:center;gap:10px}
.logo b{font-size:28px;font-weight:700;letter-spacing:.02em;direction:ltr;line-height:1}
.logo b i{display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--acc);margin-left:3px;vertical-align:baseline}
.logo span{font-size:11px;color:var(--ink3);border-right:1px solid var(--line);padding-right:10px;line-height:1.25}
.hic{display:flex}
.ib{width:42px;height:42px;display:grid;place-items:center;position:relative;color:var(--ink)}
.ib .ms{font-size:25px}
.ib .d{position:absolute;top:8px;right:9px;width:8px;height:8px;border-radius:2px;background:var(--acc);box-shadow:0 0 0 2px var(--bg)}
.ib .n{position:absolute;top:4px;left:3px;min-width:17px;height:17px;border-radius:5px;background:var(--acc);color:#fff;font-size:10.5px;font-weight:600;display:grid;place-items:center;padding:0 4px}
.srch{margin:2px 16px 0;height:48px;border-radius:24px;background:var(--surface);display:flex;align-items:center;gap:10px;padding:0 16px 0 6px}
.srch .ms{font-size:22px;color:var(--ink2)}
.srch .t{flex:1;font-size:14px;color:var(--ink3)}
.srch .ai{height:36px;padding:0 12px;border-radius:18px;background:var(--ink);color:var(--bg);display:flex;align-items:center;gap:5px;font-size:12px;font-weight:500}
.srch .ai .ms{font-size:18px;color:var(--bg)}
.tiles{margin-top:16px;gap:10px}
.tl{flex:0 0 auto;width:74px;text-align:center}
.tl .tp{width:74px;height:74px;border-radius:16px;background-color:var(--tint);position:relative;overflow:hidden}
.tl.drop .tp{background:var(--acc);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.tl.drop .tp b{font-size:24px;font-weight:700;direction:ltr}
.tl.drop .tp small{font-size:9.5px;letter-spacing:.16em;direction:ltr;margin-top:3px}
.tl span{display:block;font-size:12px;margin-top:7px;font-weight:500}
.hero{margin-top:20px;gap:10px}
.hc{flex:0 0 auto;width:342px;height:226px;border-radius:22px;position:relative;overflow:hidden;background-color:var(--tint);color:#fff}
.hc .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(5,5,8,.82) 0%,rgba(5,5,8,.35) 48%,rgba(5,5,8,0) 72%)}
.hc .no{position:absolute;top:14px;left:16px;font-size:13px;font-weight:600;letter-spacing:.14em;direction:ltr;background:rgba(255,255,255,.16);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.35);padding:3px 10px;border-radius:8px}
.hc .tx{position:absolute;right:18px;left:18px;bottom:16px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.hc .tx small{display:block;font-size:11.5px;opacity:.85;letter-spacing:.02em}
.hc .tx h2{font-size:23px;line-height:1.25;font-weight:600;margin-top:4px}
.hc .cta{flex:0 0 auto;height:38px;padding:0 14px 0 12px;border-radius:19px;background:var(--acc);color:#fff;display:flex;align-items:center;gap:5px;font-size:13px;font-weight:500}
.hc .cta .ms{font-size:18px}
.prog{display:flex;gap:4px;margin:12px 16px 0}
.prog i{flex:1;height:3px;border-radius:2px;background:var(--tint2)}
.prog i.on{background:var(--ink)}
.sec{margin-top:28px}
.sh{display:flex;justify-content:space-between;align-items:flex-end;padding:0 16px;margin-bottom:14px}
.sh .k{font-size:11px;letter-spacing:.18em;color:var(--accT);font-weight:600;direction:ltr;text-align:right}
.sh h3{font-size:20px;font-weight:600;line-height:1.2;margin-top:2px}
.sh a{font-size:12.5px;font-weight:500;display:flex;align-items:center;gap:2px;height:30px;padding:0 10px 0 6px;border-radius:15px;box-shadow:inset 0 0 0 1px var(--line)}
.sh a .ms{font-size:17px}
.prow{gap:10px}
.pc{flex:0 0 auto;width:150px}
.pi{height:196px;border-radius:12px;background-color:var(--tint);position:relative;overflow:hidden}
.nw{position:absolute;top:8px;right:8px;font-size:10px;font-weight:600;letter-spacing:.12em;background:var(--acc);color:#fff;padding:2px 7px;border-radius:5px;direction:ltr}
.nw.k{background:#0B0B0C}
.hrt{position:absolute;top:6px;left:6px;width:30px;height:30px;display:grid;place-items:center;color:#fff;filter:drop-shadow(0 1px 3px rgba(0,0,0,.35))}
.hrt .ms{font-size:22px}
.pb{font-size:10.5px;letter-spacing:.12em;color:var(--ink3);margin-top:9px;direction:ltr;text-align:right;font-weight:500}
.pn{font-size:13.5px;margin-top:1px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pf{display:flex;align-items:center;justify-content:space-between;margin-top:5px}
.pp{font-size:15px;font-weight:600;display:flex;gap:5px;align-items:baseline}
.pp small{font-size:10.5px;color:var(--ink2);font-weight:500}
.pp s{font-size:11.5px;color:var(--ink3);font-weight:400}
.pp.sale{color:var(--accT)}
.plus{width:30px;height:30px;border-radius:9px;background:var(--ink);display:grid;place-items:center}
.plus .ms{font-size:19px;color:var(--bg)}
.tick{margin-top:30px;height:40px;background:var(--ink);color:var(--bg);display:flex;align-items:center;gap:18px;white-space:nowrap;overflow:hidden;font-size:13px;font-weight:500;padding:0 16px}
.tick .ms{font-size:16px;color:var(--accT)}
html:not(.dark) .tick .ms{color:#8E9BFF}
.fit{margin:0 16px;height:392px;border-radius:22px;position:relative;overflow:hidden;background-color:var(--tint)}
.fit .pin{position:absolute;display:flex;align-items:center;gap:6px;height:30px;padding:0 10px 0 4px;border-radius:15px;background:rgba(255,255,255,.94);color:#0B0B0C;font-size:12px;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.fit .pin i{width:22px;height:22px;border-radius:11px;background:var(--acc);display:grid;place-items:center;color:#fff}
.fit .pin i .ms{font-size:15px}
.fit .pin small{font-weight:500;color:#55565A;font-size:10px}
.fit .bt{position:absolute;bottom:14px;right:14px;left:14px;height:50px;border-radius:25px;background:rgba(12,12,14,.72);backdrop-filter:blur(16px);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 18px;font-size:13.5px}
.fit .bt b{font-weight:600}
.fit .bt span{height:38px;padding:0 16px;border-radius:19px;background:var(--acc);display:flex;align-items:center;gap:5px;font-weight:500;font-size:13px}
.launch{margin:0 16px;border-radius:22px;background:var(--surface);display:flex;overflow:hidden;box-shadow:inset 0 0 0 1px var(--line)}
.launch .li{width:146px;flex:0 0 auto;background-color:#E9E9E4}
.launch .lb{flex:1;padding:16px 14px 14px 16px;display:flex;flex-direction:column}
.launch .k{font-size:10.5px;letter-spacing:.16em;color:var(--accT);font-weight:600;direction:ltr;text-align:right}
.launch h4{font-size:17px;font-weight:600;line-height:1.3;margin-top:4px}
.launch p{font-size:12px;color:var(--ink2);margin-top:3px}
.cdn{display:flex;gap:6px;margin-top:12px;direction:ltr;justify-content:flex-end}
.cdn div{width:44px;text-align:center;background:var(--tint);border-radius:10px;padding:5px 0 4px}
.cdn b{display:block;font-size:17px;font-weight:600;line-height:1.1;font-variant-numeric:tabular-nums}
.cdn small{display:block;font-size:9.5px;color:var(--ink3)}
.launch .rm{margin-top:12px;height:40px;border-radius:20px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500}
.launch .rm .ms{font-size:18px}
.bento{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.bx{height:160px;border-radius:16px;position:relative;overflow:hidden;background-color:var(--tint);color:#fff}
.bx .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.66),rgba(0,0,0,0) 60%)}
.bx b{position:absolute;bottom:30px;right:12px;font-size:17px;font-weight:600}
.bx small{position:absolute;bottom:12px;right:12px;font-size:10.5px;letter-spacing:.16em;direction:ltr;opacity:.85}
.bx .ar{position:absolute;top:10px;left:10px;width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.2);backdrop-filter:blur(8px);display:grid;place-items:center}
.bx .ar .ms{font-size:17px}
.rank{margin:0 16px;background:var(--surface);border-radius:22px;padding:4px 14px;box-shadow:inset 0 0 0 1px var(--line)}
.rk{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.rk:last-child{border-bottom:0}
.rk .no{width:26px;font-size:24px;font-weight:700;color:var(--ink);direction:ltr;text-align:center}
.rk:first-child .no{color:var(--accT)}
.rk .ri{width:58px;height:70px;border-radius:10px;background-color:var(--tint);flex:0 0 auto}
.rk .rt{flex:1;min-width:0}
.rk .rt .pn{font-size:13.5px}
.rk .rt small{font-size:11px;color:var(--ink3);display:flex;align-items:center;gap:3px}
.rk .rt small .ms{font-size:14px;color:var(--accT)}
.rk .pp{font-size:14.5px}
.moods{gap:8px;margin-bottom:14px}
.md{flex:0 0 auto;height:34px;padding:0 14px;border-radius:9px;font-size:12.5px;font-weight:500;display:flex;align-items:center;box-shadow:inset 0 0 0 1px var(--line);background:var(--surface)}
.md.on{background:var(--ink);color:var(--bg);box-shadow:none}
.g2{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:18px 10px}
.g2 .pi{height:200px}
.ugc{gap:8px}
.ug{flex:0 0 auto;width:118px;height:150px;border-radius:14px;position:relative;overflow:hidden;background-color:var(--tint);color:#fff}
.ug .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.6),rgba(0,0,0,0) 45%)}
.ug span{position:absolute;bottom:9px;right:10px;left:10px;font-size:11.5px;direction:ltr;text-align:right;font-weight:500}
.club{margin:0 16px;border-radius:22px;background:var(--acc);color:#fff;padding:18px;position:relative;overflow:hidden}
.club:after{display:none;content:'NOUN';position:absolute;left:-8px;bottom:-26px;font-size:92px;font-weight:700;letter-spacing:-.02em;opacity:.12;direction:ltr;line-height:1}
.club .r1{display:flex;justify-content:space-between;align-items:flex-start}
.club small{font-size:11.5px;opacity:.85;letter-spacing:.06em}
.club .pts{font-size:32px;font-weight:600;line-height:1.1;margin-top:4px}
.club .pts span{font-size:13px;font-weight:400;opacity:.85;margin-right:4px}
.club .lv{height:28px;padding:0 10px;border-radius:8px;background:rgba(255,255,255,.18);font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px;direction:ltr;letter-spacing:.1em}
.club .bar{height:5px;border-radius:3px;background:rgba(255,255,255,.25);margin-top:14px;overflow:hidden}
.club .bar i{display:block;height:100%;width:64%;background:#fff;border-radius:3px}
.club .r3{display:flex;justify-content:space-between;margin-top:8px;font-size:12px;opacity:.92}
.tabbar{position:absolute;left:16px;right:16px;bottom:30px;height:64px;border-radius:22px;background:var(--bar);backdrop-filter:blur(22px) saturate(1.4);box-shadow:0 12px 30px rgba(0,0,0,.22);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;padding:0 4px}
.tb{display:flex;flex-direction:column;align-items:center;gap:3px;color:#9A9BA0;position:relative}
.tb .ms{font-size:23px}
.tb span:not(.ms){font-size:10.5px;font-weight:500}
.tb.on{color:#fff}
.tb.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tb.on:after{content:'';position:absolute;top:-9px;width:18px;height:3px;border-radius:2px;background:#6E7DFF}
.tb .n{position:absolute;top:-4px;left:50%;margin-left:4px;min-width:17px;height:17px;border-radius:5px;background:var(--acc);color:#fff;font-size:10px;font-weight:600;display:grid;place-items:center;padding:0 4px}
'''
def tabbar(on=0):
    t=[("home","الرئيسية"),("grid_view","تسوّق"),("shopping_bag","السلة"),("package_2","طلباتي"),("person","حسابي")]
    return '<div class="tabbar">'+''.join(f'<div class="tb{" on" if k==on else ""}">{ms(ic)}<span>{l}</span>{"<i class=n>3</i>" if k==2 else ""}</div>' for k,(ic,l) in enumerate(t))+'</div>'+HOMEIND
def pc(img,f,brand,name,price,old=None,tag=None,cls="pc"):
    t=f'<span class="nw{" k" if tag and tag.startswith("-") else ""}">{tag}</span>' if tag else ''
    pr=f'<div class="pp{" sale" if old else ""}">{price} <small>{C}</small>{f"<s>{old}</s>" if old else ""}</div>'
    return f'<div class="{cls}">{ph(I(img),f,"pi",t+"<div class=hrt>"+ms("favorite")+"</div>")}<div class="pb">{brand}</div><div class="pn">{name}</div><div class="pf">{pr}<div class="plus">{ms("add")}</div></div></div>'
HEAD=lambda: STATUS+f'<div class="hd"><div class="logo"><b>NOUN<i></i></b><span>ستايل<br>المدينة</span></div><div class="hic"><div class="ib">{ms("notifications")}<i class="d"></i></div><div class="ib">{ms("segment")}</div></div></div>'

# ---------------- HOME ----------------
b=HEAD()
b+=f'<div class="srch">{ms("search")}<div class="t">جاكيت، سنيكرز، جينز واسع…</div><div class="ai">{ms("photo_camera")}بحث بالصورة</div></div>'
b+='<div class="hscroll tiles"><div class="tl drop"><div class="tp"><b>07</b><small>DROP</small></div><span>الإصدار الجديد</span></div>'
for n,i,f in [("جاكيتات","camel-jacket","0.5 0.3 2.6"),("دنيم","denim","0.5 0.5 1.4"),("سنيكرز","sneak-white","0.55 0.6 1.5"),("تريكو","turtleneck","0.5 0.35 1.6"),("حقائب","white-backpack","0.3 0.5 1.6")]:
    b+=f'<div class="tl">{ph(I(i),f,"tp")}<span>{n}</span></div>'
b+='</div><div class="hscroll hero">'
b+=ph(I("brick-jacket"),"0.5 0.42 1.15","hc",f'<div class="sc"></div><span class="no">DROP 07</span><div class="tx"><div><small>جلد وسويد · كميات محدودة</small><h2>طبقات المدينة<br>لموسم الشتاء</h2></div><div class="cta">اكتشفي{ms("arrow_back")}</div></div>')
b+=ph(I("c-black-coat"),"0.55 0.5 1.1","hc")+'</div><div class="prog"><i class="on"></i><i></i><i></i><i></i></div>'
b+=f'<div class="sec"><div class="sh"><div><div class="k">NEW · DROP 07</div><h3>وصل هذا الأسبوع</h3></div><a>الكل{ms("chevron_left")}</a></div><div class="hscroll prow">'
b+=pc("camel-jacket","0.5 0.42 1.7","NOUN STUDIO","جاكيت سويد قصير بياقة فرو","690","860","-20%")
b+=pc("turtleneck","0.5 0.4 1.25","OFF/GRID","بلوزة بأكمام منفوخة","320",None,"NEW")
b+=pc("fence-jeans","0.5 0.62 2.2","RAWS","جينز واسع بخصر عالٍ","380",None,"NEW")
b+=pc("sneak-white","0.55 0.6 1.3","NOUN STUDIO","سنيكرز جلد مثقّب","540")
b+='</div></div>'
b+=f'<div class="tick hscroll">{ms("local_shipping")}شحن مجاني فوق 300 ر.س{ms("autorenew")}إرجاع مجاني 30 يوماً{ms("bolt")}توصيل خلال ساعتين في الرياض</div>'
b+=f'<div class="sec"><div class="sh"><div><div class="k">SHOP THE FIT</div><h3>إطلالة اليوم</h3></div><a>إطلالات أخرى{ms("chevron_left")}</a></div>'
b+=ph(I("purple-tiles"),"0.42 0.5 1.0","fit",f'<div class="pin" style="top:86px;right:150px"><i>{ms("add")}</i>معطف صوف <small>990</small></div><div class="pin" style="top:196px;right:118px"><i>{ms("add")}</i>تنورة ميدي <small>290</small></div><div class="pin" style="top:270px;right:208px"><i>{ms("add")}</i>كعب أحمر <small>460</small></div><div class="bt"><div>3 قطع · <b>1,740 ر.س</b></div><span>{ms("shopping_bag")}أضيفي الكل</span></div>')
b+='</div>'
b+=f'<div class="sec"><div class="launch">{ph(I("sneak-white"),"0.5 0.6 1.5","li mult")}<div class="lb"><div class="k">LAUNCH · 27.11</div><h4>إطلاق سنيكرز «أبيض المدينة»</h4><p>200 زوج فقط · بالقرعة لأعضاء النادي</p><div class="cdn"><div><b>02</b><small>يوم</small></div><div><b>14</b><small>ساعة</small></div><div><b>36</b><small>دقيقة</small></div></div><div class="rm">{ms("notifications")}ذكّريني بالإطلاق</div></div></div></div>'
b+=f'<div class="sec"><div class="sh"><div><div class="k">CATEGORIES</div><h3>تسوّقي حسب القسم</h3></div></div><div class="bento">'
for n,k,i,f in [("دنيم","DENIM","fleece","0.6 0.55 1.3"),("معاطف","OUTERWEAR","c-black-coat","0.56 0.5 1.6"),("سنيكرز","SNEAKERS","sneak-feet","0.5 0.45 1.3"),("حقائب","BAGS","white-backpack","0.32 0.5 1.4")]:
    b+=ph(I(i),f,"bx",f'<div class="sc"></div><div class="ar">{ms("arrow_outward")}</div><b>{n}</b><small>{k}</small>')
b+='</div></div>'
b+=f'<div class="sec"><div class="sh"><div><div class="k">TOP 4 · THIS WEEK</div><h3>الأكثر رواجاً</h3></div><a>القائمة{ms("chevron_left")}</a></div><div class="rank">'
for k,(i,f,n,p,s) in enumerate([("brick-jacket","0.5 0.4 2.2","جاكيت جلد بني مقصوص","1,150","تم حفظه 2.4k مرة"),("walk-white","0.5 0.35 2.0","بلوزة ساتان بيضاء","290","تم حفظها 1.9k مرة"),("flatlay-sneak","0.5 0.5 1.3","طقم كارديغان وجينز","640","تم حفظه 1.6k مرة"),("leopard","0.5 0.45 1.6","جاكيت مطبّع ملوّن","520","تم حفظه 1.2k مرة")]):
    b+=f'<div class="rk"><div class="no">{k+1}</div>{ph(I(i),f,"ri")}<div class="rt"><div class="pn">{n}</div><small>{ms("trending_up")}{s}</small></div><div class="pp">{p} <small>{C}</small></div></div>'
b+='</div></div>'
b+=f'<div class="sec"><div class="sh"><div><div class="k">BY MOOD</div><h3>حسب مزاجك اليوم</h3></div></div><div class="hscroll moods"><div class="md on">كاجوال</div><div class="md">عمل</div><div class="md">سهرة</div><div class="md">سفر</div><div class="md">رياضي</div></div><div class="g2">'
b+=pc("fleece","0.5 0.45 1.15","RAWS","جاكيت دنيم ببطانة فرو","590",None,"NEW",cls="gi")
b+=pc("flannel","0.45 0.5 1.25","OFF/GRID","قميص فلانيل مربّعات","240","320","-25%",cls="gi")
b+='</div></div>'
b+=f'<div class="sec"><div class="sh"><div><div class="k">#NOUN_STYLE</div><h3>من ستايلكم</h3></div><a>شاركي{ms("chevron_left")}</a></div><div class="hscroll ugc">'
for i,f,h in [("graffiti","0.5 0.4 1.1","@sara.fits"),("street-walk","0.5 0.45 1.2","@noura_k"),("braids","0.5 0.4 1.1","@lama.styles"),("dark-coat","0.42 0.5 1.6","@dana.dxb")]:
    b+=ph(I(i),f,"ug",f'<div class="sc"></div><span>{h}</span>')
b+='</div></div>'
b+=f'<div class="sec"><div class="club"><div class="r1"><div><small>NOUN CLUB · رصيدك</small><div class="pts">1,840<span>نقطة</span></div></div><div class="lv">{ms("bolt","fill")}LEVEL 2</div></div><div class="bar"><i></i></div><div class="r3"><span>160 نقطة لدخول قرعة الإطلاقات</span><b>التفاصيل</b></div></div></div>'
b+=tabbar(0)
write(T,"home",page("NOUN — Home",F,CSS,b))

# ---------------- MENU ----------------
MCSS=CSS+'''
.screen{padding-bottom:40px}
.mh{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.x{width:42px;height:42px;border-radius:12px;background:var(--ink);color:var(--bg);display:grid;place-items:center}
.x .ms{font-size:24px}
.qk{margin:14px 16px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.qk div{height:58px;border-radius:14px;background:var(--surface);display:flex;flex-direction:column;justify-content:center;padding:0 12px;box-shadow:inset 0 0 0 1px var(--line)}
.qk b{font-size:13px;font-weight:600}
.qk small{font-size:10.5px;color:var(--ink3);letter-spacing:.12em;direction:ltr;text-align:right}
.qk .on{background:var(--acc);color:#fff;box-shadow:none}
.qk .on small{color:rgba(255,255,255,.75)}
.mrow{margin-top:16px}
.mrh{display:flex;align-items:baseline;justify-content:space-between;padding:0 16px;margin-bottom:9px}
.mrh .l{display:flex;align-items:baseline;gap:8px}
.mrh .no{font-size:12px;font-weight:600;color:var(--accT);direction:ltr;letter-spacing:.06em}
.mrh b{font-size:17px;font-weight:600}
.mrh small{font-size:11.5px;color:var(--ink3)}
.mrh a{font-size:12px;font-weight:500;display:flex;align-items:center;color:var(--ink2)}
.mrh a .ms{font-size:16px}
.mc{gap:8px}
.cc{flex:0 0 auto;width:100px;height:108px;border-radius:12px;position:relative;overflow:hidden;background-color:var(--tint);color:#fff}
.cc .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.7) 0%,rgba(0,0,0,.15) 52%,rgba(0,0,0,0) 70%)}
.cc span{position:absolute;bottom:8px;right:9px;left:8px;font-size:12.5px;font-weight:500;line-height:1.25}
.cc.all{width:118px}
.cc.all span{font-size:13.5px;font-weight:600}
.cc.all .tagA{position:absolute;top:8px;right:8px;font-size:9.5px;letter-spacing:.14em;background:var(--acc);color:#fff;border-radius:5px;padding:1px 6px;direction:ltr}
.saleb{margin:20px 16px 0;height:80px;border-radius:16px;background:var(--ink);color:var(--bg);display:flex;align-items:center;overflow:hidden}
.saleb .si{width:96px;height:100%;flex:0 0 auto;background-color:var(--tint)}
.saleb .st{flex:1;padding:0 14px}
.saleb b{display:block;font-size:16px;font-weight:600}
.saleb small{display:block;font-size:11.5px;opacity:.7}
.saleb .pc2{font-size:30px;font-weight:700;color:#8E9BFF;direction:ltr;padding-left:16px}
html.dark .saleb .pc2{color:#3A4DFF}
.acct{margin:22px 16px 0;border-radius:18px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);padding:2px 14px}
.ar2{display:flex;align-items:center;gap:12px;height:50px;border-bottom:1px solid var(--line);font-size:14px;font-weight:500}
.ar2:last-child{border-bottom:0}
.ar2 .ms{font-size:21px}
.ar2 .v{margin-right:auto;font-size:12px;color:var(--ink3);font-weight:400;display:flex;align-items:center;gap:2px}
.ar2 .v .ms{font-size:17px}
.ar2 .pill{margin-right:auto;font-size:11px;font-weight:600;background:var(--accS);color:var(--accT);border-radius:6px;padding:1px 7px}
.ar2 .pill + .ms{margin-right:4px}
.soc{display:flex;justify-content:center;gap:8px;margin-top:16px}
.soc span{height:34px;padding:0 12px;border-radius:10px;box-shadow:inset 0 0 0 1px var(--line);display:flex;align-items:center;gap:5px;font-size:12px}
.soc .ms{font-size:17px}
'''
rows=[
 ("01","وصل حديثاً","124 قطعة",[("كل الجديد","walk-white","0.5 0.4 1.5"),("الأكثر مبيعاً","brick-jacket","0.5 0.35 2.0"),("حصري أونلاين","graffiti","0.5 0.32 1.5"),("إصدار 07","turtleneck","0.5 0.35 1.6")]),
 ("02","جاكيتات ومعاطف","98 قطعة",[("كل المعاطف","c-black-coat","0.56 0.5 1.7"),("سويد وجلد","camel-jacket","0.5 0.3 2.6"),("ترنش","pink-trench","0.5 0.4 1.6"),("صوف","dark-coat","0.43 0.55 1.9")]),
 ("03","دنيم","76 قطعة",[("كل الدنيم","denim","0.5 0.5 1.3"),("جاكيت دنيم","fleece","0.65 0.55 1.6"),("جينز واسع","fence-jeans","0.5 0.65 2.2"),("تنانير","red-skirt","0.3 0.6 1.5")]),
 ("04","تريكو وقمصان","88 قطعة",[("كل القطع","knit-dress","0.5 0.45 1.5"),("تريكو","turtleneck","0.5 0.4 1.4"),("فلانيل","flannel","0.45 0.5 1.4"),("بلوزات","walk-white","0.5 0.35 2.0")]),
 ("05","توبات","64 قطعة",[("كل التوبات","braids","0.5 0.45 1.2"),("تانك توب","leopard","0.5 0.45 1.8"),("مطبّعة","graffiti","0.5 0.4 1.3"),("أساسيات","black-top","0.5 0.45 1.4")]),
 ("06","سنيكرز","52 قطعة",[("كل السنيكرز","sneak-feet","0.5 0.45 1.3"),("منخفضة","sneak-white","0.55 0.6 1.4"),("مع الجينز","flatlay-sneak","0.6 0.45 1.6"),("كاجوال","white-backpack","0.75 0.6 1.5")]),
 ("07","حقائب وإكسسوارات","140 قطعة",[("كل القطع","flatlay-black","0.45 0.5 1.3"),("حقائب ظهر","white-backpack","0.3 0.5 1.6"),("نظارات","sunglasses","0.22 0.26 2.4"),("مجوهرات","hand-jewel","0.5 0.5 1.4")]),
]
b=STATUS+f'<div class="mh"><div class="logo"><b>NOUN<i></i></b><span>كل<br>الأقسام</span></div><div class="x">{ms("close")}</div></div>'
b+=f'<div class="srch">{ms("search")}<div class="t">ابحثي في 640 قطعة…</div><div class="ai">{ms("photo_camera")}بالصورة</div></div>'
b+='<div class="qk"><div class="on"><small>DROP 07</small><b>الإصدار الجديد</b></div><div><small>TRENDING</small><b>الأكثر رواجاً</b></div><div><small>GIFTS</small><b>بطاقات هدايا</b></div></div>'
for no,name,cnt,subs in rows:
    b+=f'<div class="mrow"><div class="mrh"><div class="l"><span class="no">{no}</span><b>{name}</b><small>{cnt}</small></div><a>عرض الكل{ms("chevron_left")}</a></div><div class="hscroll mc">'
    for k,(n,i,f) in enumerate(subs):
        b+=ph(I(i),f,"cc"+(" all" if k==0 else ""),'<div class="sc"></div>'+('<i class="tagA">ALL</i>' if k==0 else '')+f'<span>{n}</span>')
    b+='</div></div>'
b+=f'<div class="saleb">{ph(I("purple-tiles"),"0.45 0.5 1.6","si")}<div class="st"><b>تخفيضات الموسم</b><small>أكثر من 180 قطعة</small></div><div class="pc2">-40%</div></div>'
b+=f'<div class="acct"><div class="ar2">{ms("person")}حسابي<span class="v">نورة الشهري{ms("chevron_left")}</span></div><div class="ar2">{ms("package_2")}طلباتي<span class="pill">1 قيد التوصيل</span>{ms("chevron_left")}</div><div class="ar2">{ms("favorite")}المفضلة<span class="v">23 قطعة{ms("chevron_left")}</span></div><div class="ar2">{ms("language")}اللغة<span class="v">العربية · <span class="ltr">EN</span>{ms("chevron_left")}</span></div><div class="ar2">{ms("support_agent")}تواصلي معنا<span class="v">متاح الآن{ms("chevron_left")}</span></div></div>'
b+=f'<div class="soc"><span>{ms("chat")}محادثة</span><span>{ms("call")}اتصال</span><span>{ms("mail")}بريد</span></div>'+HOMEIND
b=b.replace('· 08 الأقسام','· كل الأقسام')
write(T,"menu",page("NOUN — Menu",F,MCSS,b))

# ---------------- LISTING ----------------
LCSS=CSS+'''
.lh{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 8px}
.lh .tt{flex:1;padding-right:4px}
.lh .tt b{display:block;font-size:19px;font-weight:600;line-height:1.2}
.lh .tt small{display:block;font-size:11px;color:var(--ink3);letter-spacing:.12em;direction:ltr;text-align:right}
.subs{margin-top:6px;gap:6px}
.sb{flex:0 0 auto;height:36px;padding:0 14px;border-radius:9px;display:flex;align-items:center;font-size:13px;font-weight:500;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line)}
.sb.on{background:var(--ink);color:var(--bg);box-shadow:none}
.sb small{font-size:11px;color:var(--ink3);margin-right:5px}
.sb.on small{color:var(--bg);opacity:.6}
.fb{margin:12px 16px 0;height:46px;border-radius:14px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);display:flex;align-items:center}
.fb>div{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500;height:100%;border-left:1px solid var(--line)}
.fb>div:last-child{border-left:0;flex:0 0 52px}
.fb .ms{font-size:19px}
.fb b{min-width:18px;height:18px;border-radius:5px;background:var(--acc);color:#fff;font-size:10.5px;display:grid;place-items:center}
.ftags{margin-top:10px;gap:6px}
.ft{flex:0 0 auto;height:30px;border-radius:8px;background:var(--accS);color:var(--accT);display:flex;align-items:center;gap:4px;padding:0 9px 0 6px;font-size:12px;font-weight:500}
.ft .ms{font-size:15px}
.ft.cl{background:none;color:var(--ink2);text-decoration:underline}
.res{margin:14px 16px 10px;font-size:12px;color:var(--ink3)}
.res b{color:var(--ink);font-weight:600}
.grid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:20px 10px}
.grid .pi{height:232px}
.cols{display:flex;gap:4px;margin-top:6px}
.cols i{width:14px;height:6px;border-radius:2px;box-shadow:inset 0 0 0 1px rgba(127,127,127,.35)}
.promo{grid-column:span 2;height:150px;border-radius:16px;background:var(--acc);color:#fff;display:flex;overflow:hidden;position:relative}
.promo .pt{flex:1;padding:16px;display:flex;flex-direction:column}
.promo small{font-size:10.5px;letter-spacing:.16em;opacity:.8;direction:ltr;text-align:right}
.promo b{font-size:19px;font-weight:600;line-height:1.3;margin-top:4px}
.promo .go{margin-top:auto;align-self:flex-start;height:34px;padding:0 12px;border-radius:17px;background:#fff;color:#1A2BD0;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:4px}
.promo .go .ms{font-size:17px}
.promo .pim{width:150px;flex:0 0 auto;background-color:#1E30CC}
.lm{margin:26px 16px 0;display:flex;flex-direction:column;align-items:center}
.lm small{font-size:12px;color:var(--ink3)}
.lm .bar{width:160px;height:3px;background:var(--tint2);border-radius:2px;margin-top:8px;overflow:hidden}
.lm .bar i{display:block;width:25%;height:100%;background:var(--acc)}
.lm .btn{margin-top:14px;height:48px;width:100%;border-radius:14px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px;font-weight:500}
'''
b=STATUS+f'<div class="lh"><div class="ib">{ms("arrow_forward")}</div><div class="tt"><b>جاكيتات ومعاطف</b><small>OUTERWEAR · 98</small></div><div class="ib">{ms("search")}</div><div class="ib">{ms("shopping_bag")}<i class="n">3</i></div></div>'
b+='<div class="hscroll subs">'+''.join(f'<div class="sb{" on" if k==0 else ""}">{n}<small>{c}</small></div>' for k,(n,c) in enumerate([("الكل","98"),("سويد وجلد","24"),("ترنش","18"),("صوف","21"),("بومبر","15"),("بافر","20")]))+'</div>'
b+=f'<div class="fb"><div>{ms("tune")}فلترة<b>2</b></div><div>{ms("swap_vert")}الأحدث أولاً</div><div>{ms("view_agenda")}</div></div>'
b+=f'<div class="hscroll ftags"><div class="ft">{ms("close")}المقاس: S</div><div class="ft">{ms("close")}من 300 إلى 1,200 ر.س</div><div class="ft">{ms("close")}متوفر للتوصيل السريع</div><div class="ft cl">مسح</div></div>'
b+='<div class="res"><b>38</b> قطعة مطابقة</div><div class="grid">'
items=[("camel-jacket","0.5 0.42 1.65","NOUN STUDIO","جاكيت سويد قصير بياقة فرو","690","860","-20%",["#B57A3E","#151515","#5C5A3A"]),
("brick-jacket","0.5 0.4 1.9","RAWS","جاكيت جلد بني مقصوص","1,150",None,"NEW",["#6B3E22","#151515"]),
("c-black-coat","0.42 0.55 1.6","OFF/GRID","معطف بوكليه أسود","990",None,None,["#151515","#E7E0D3"]),
("pink-trench","0.5 0.4 1.5","NOUN STUDIO","ترنش وردي بحزام","840",None,"NEW",["#D38FA8","#C9B48E"]),
("yellow-coat","0.62 0.55 1.3","RAWS","معطف أصفر بقصّة واسعة","760","950","-20%",["#E7A92A","#2B2B2B"]),
("dark-coat","0.43 0.55 1.75","OFF/GRID","معطف صوف بياقة عريضة","1,080",None,None,["#1D1A1A","#5A4636"]),
("fleece","0.55 0.45 1.15","RAWS","جاكيت دنيم ببطانة فرو","590",None,"NEW",["#3E6A9E","#E9E3D6"]),
("orange-coat","0.52 0.5 1.0","NOUN STUDIO","معطف صوف برتقالي ناعم","890",None,None,["#D2602A","#151515"]),
]
for k,(i,f,br,n,p,o,t,cs) in enumerate(items):
    if k==4:
        b+=f'<div class="promo"><div class="pt"><small>MEMBERS ONLY</small><b>خصم إضافي 15%<br>لعضوات النادي</b><div class="go">انضمي مجاناً{ms("arrow_back")}</div></div>{ph(I("graffiti"),"0.5 0.38 1.2","pim")}</div>'
    card=pc(i,f,br,n,p,o,t,cls="gi")
    card=card.replace('</div></div></div>',f'</div></div><div class="cols">{"".join(f"<i style=background:{c}></i>" for c in cs)}</div></div>',1) if False else card
    b+=card
b+=f'</div><div class="lm"><small>عرضتِ 24 من 98</small><div class="bar"><i></i></div><div class="btn">حمّلي المزيد{ms("expand_more")}</div></div>'
b+=tabbar(1)
b=b.replace('خصم إضافي 15%','خصم إضافي <span class="ltr">15%</span>')
write(T,"listing",page("NOUN — Outerwear",F,LCSS,b))

# ---------------- PRODUCT ----------------
PCSS=CSS+'''
.screen{padding-bottom:108px}
.ph2{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 8px}
.ph2 .r{display:flex}
.gal{height:500px;position:relative;background-color:var(--tint);margin:0 16px;border-radius:22px;overflow:hidden}
.gal .vt{position:absolute;top:14px;right:14px;display:flex;flex-direction:column;gap:8px}
.gal .vt div{width:52px;height:64px;border-radius:10px;background-color:#ddd;box-shadow:0 0 0 1.5px rgba(255,255,255,.7)}
.gal .vt div.on{box-shadow:0 0 0 2.5px #fff,0 4px 10px rgba(0,0,0,.25)}
.gal .vt .more{background:rgba(12,12,14,.6);backdrop-filter:blur(8px);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:600}
.gal .bg{position:absolute;bottom:14px;left:14px;right:14px;display:flex;gap:4px}
.gal .bg i{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.45)}
.gal .bg i.on{background:#fff}
.gal .lbl{position:absolute;top:14px;left:14px;display:flex;gap:6px}
.gal .lbl span{height:28px;padding:0 10px;border-radius:8px;background:rgba(255,255,255,.92);color:#0B0B0C;font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px}
.gal .lbl span .ms{font-size:16px}
.gal .lbl span.a{background:var(--acc);color:#fff;letter-spacing:.1em;direction:ltr}
.pinfo{padding:0 16px;margin-top:18px}
.pinfo .r1{display:flex;justify-content:space-between;align-items:center}
.pinfo .br{font-size:11.5px;letter-spacing:.18em;color:var(--ink2);direction:ltr;font-weight:500}
.rt{display:flex;align-items:center;gap:3px;font-size:12px;color:var(--ink2)}
.rt .ms{font-size:15px;color:var(--accT)}
.rt b{color:var(--ink);font-weight:600}
h1{font-size:23px;font-weight:600;line-height:1.3;margin-top:4px}
.prc{display:flex;align-items:baseline;gap:8px;margin-top:8px}
.prc b{font-size:26px;font-weight:600;color:var(--accT)}
.prc b small{font-size:13px;font-weight:500;color:var(--ink2)}
.prc s{font-size:15px;color:var(--ink3)}
.prc .o{height:24px;padding:0 8px;border-radius:6px;background:var(--ink);color:var(--bg);font-size:12px;font-weight:600;display:flex;align-items:center;direction:ltr;align-self:center}
.save{font-size:12px;color:var(--ink2);margin-top:2px}
.save b{color:var(--ink)}
.blk{margin:22px 16px 0}
.bl{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:14px;font-weight:600}
.bl span{font-weight:400;color:var(--ink2)}
.bl a{font-size:12.5px;font-weight:500;color:var(--accT);display:flex;align-items:center;gap:3px}
.bl a .ms{font-size:17px}
.clr{display:flex;gap:8px}
.clr div{width:62px;height:74px;border-radius:12px;background-color:var(--tint);position:relative}
.clr div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--acc)}
.clr div.sw{display:grid;place-items:center}
.clr div.sw i{width:30px;height:30px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(127,127,127,.4)}
.szs{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.sz{height:48px;border-radius:12px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:15px;font-weight:600;direction:ltr;position:relative}
.sz small{font-size:9.5px;font-weight:500;color:var(--accT);direction:rtl;line-height:1}
.sz.on{background:var(--acc);color:#fff;box-shadow:none}
.sz.x{color:var(--ink3);background:none;box-shadow:inset 0 0 0 1px var(--line);text-decoration:line-through}
.fitm{margin-top:12px;border-radius:18px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);padding:14px}
.fitm .t{display:flex;gap:10px;align-items:center}
.fitm .t .ic{width:38px;height:38px;border-radius:11px;background:var(--accS);color:var(--accT);display:grid;place-items:center;flex:0 0 auto}
.fitm .t b{display:block;font-size:14px;font-weight:600}
.fitm .t small{display:block;font-size:12px;color:var(--ink2)}
.scale{margin-top:14px;position:relative;height:30px}
.scale .ln{position:absolute;top:8px;left:0;right:0;height:4px;border-radius:2px;background:var(--tint2)}
.scale .dot{position:absolute;top:2px;width:16px;height:16px;border-radius:8px;background:var(--acc);box-shadow:0 0 0 4px var(--accS)}
.scale .lb{position:absolute;top:20px;left:0;right:0;display:flex;justify-content:space-between;font-size:11px;color:var(--ink3)}
.mtab{margin-top:14px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.mtab div{background:var(--tint);border-radius:12px;padding:9px 0;text-align:center}
.mtab small{display:block;font-size:10.5px;color:var(--ink3)}
.mtab b{display:block;font-size:15px;font-weight:600;margin-top:1px}
.mtab b span{font-size:10.5px;font-weight:400;color:var(--ink2)}
.look{display:flex;gap:10px}
.look .main{width:150px;height:236px;border-radius:16px;background-color:var(--tint);flex:0 0 auto;position:relative;overflow:hidden}
.look .main span{position:absolute;bottom:10px;right:10px;font-size:10.5px;letter-spacing:.14em;background:rgba(255,255,255,.92);color:#0B0B0C;padding:2px 7px;border-radius:5px;direction:ltr;font-weight:600}
.look .its{flex:1;display:grid;grid-template-rows:1fr 1fr 1fr auto;gap:8px;min-width:0}
.li2{display:flex;align-items:center;gap:9px;background:var(--surface);border-radius:12px;padding:6px;box-shadow:inset 0 0 0 1px var(--line)}
.li2 .t{width:44px;height:50px;border-radius:8px;background-color:var(--tint);flex:0 0 auto}
.li2 .n{font-size:12px;line-height:1.35;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.li2 .n b{display:block;font-size:13px;font-weight:600}
.li2 .ck{width:22px;height:22px;border-radius:6px;background:var(--acc);display:grid;place-items:center;flex:0 0 auto}
.li2 .ck .ms{font-size:16px;color:#fff}
.look .all{height:40px;border-radius:12px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;gap:5px;font-size:12.5px;font-weight:500}
.care{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.care div{display:flex;align-items:center;gap:9px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);border-radius:14px;padding:10px 12px;font-size:12px;line-height:1.35}
.care .ms{font-size:22px;color:var(--accT)}
.mat{margin-top:8px;font-size:12px;color:var(--ink2);display:flex;justify-content:space-between;padding:0 2px}
.mat b{color:var(--ink);font-weight:500}
.dlv{border-radius:18px;background:var(--ink);color:var(--bg);padding:6px 16px}
.dlv .d{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(127,127,127,.28)}
.dlv .d:last-child{border-bottom:0}
.dlv .d .ms{font-size:22px;color:#8E9BFF}
html.dark .dlv .d .ms{color:#2B3FF0}
.dlv b{display:block;font-size:13.5px;font-weight:500}
.dlv small{display:block;font-size:11.5px;opacity:.7}
.acc2{border-top:1px solid var(--line)}
.ac{border-bottom:1px solid var(--line);padding:15px 0}
.ac .h{display:flex;justify-content:space-between;align-items:center;font-size:15px;font-weight:500}
.ac .h .ms{font-size:22px;color:var(--ink2)}
.ac p{font-size:12.5px;color:var(--ink2);line-height:1.8;margin-top:8px}
.rv{display:flex;gap:12px;align-items:stretch}
.rv .sc1{width:116px;flex:0 0 auto;border-radius:18px;background:var(--acc);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 0}
.rv .sc1 b{font-size:40px;font-weight:600;line-height:1}
.rv .sc1 .st{display:flex;margin-top:4px}
.rv .sc1 .st .ms{font-size:14px}
.rv .sc1 small{font-size:11px;opacity:.85;margin-top:4px}
.rv .bars{flex:1;display:flex;flex-direction:column;justify-content:center;gap:6px}
.rv .bars div{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--ink2)}
.rv .bars div span:first-child{width:56px}
.rv .bars div i{flex:1;height:6px;border-radius:3px;background:var(--tint2);overflow:hidden;display:block}
.rv .bars div i em{display:block;height:100%;background:var(--ink);border-radius:3px}
.rv .bars div b{font-weight:600;color:var(--ink);width:30px;text-align:left;direction:ltr}
.phr{margin-top:12px;gap:8px}
.phr .p{flex:0 0 auto;width:96px;height:120px;border-radius:12px;background-color:var(--tint);position:relative}
.phr .p span{position:absolute;bottom:6px;right:6px;font-size:10px;background:rgba(12,12,14,.6);color:#fff;border-radius:5px;padding:1px 6px;direction:ltr}
.rc{margin-top:12px;border-radius:16px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);padding:14px}
.rc .t{display:flex;justify-content:space-between;align-items:center}
.rc .t b{font-size:13.5px;font-weight:600}
.rc .t small{font-size:11px;color:var(--ink3);margin-right:6px}
.rc .st{display:flex;color:var(--accT)}
.rc .st .ms{font-size:14px}
.rc p{font-size:12.5px;color:var(--ink2);line-height:1.75;margin-top:6px}
.rc .chips{display:flex;gap:6px;margin-top:8px}
.rc .chips span{font-size:11px;background:var(--tint);border-radius:6px;padding:2px 8px;color:var(--ink2)}
.sticky{position:absolute;left:0;right:0;bottom:0;height:98px;background:var(--bar);backdrop-filter:blur(20px);display:flex;align-items:flex-start;gap:10px;padding:12px 16px 0;color:#fff}
.sticky .sp small{display:block;font-size:11px;opacity:.65}
.sticky .sp b{font-size:19px;font-weight:600}
.sticky .sp b small{display:inline;font-size:11px;opacity:.75}
.sticky .add{flex:1;height:52px;border-radius:16px;background:var(--acc);display:flex;align-items:center;justify-content:center;gap:7px;font-size:15px;font-weight:500}
.sticky .add .ms{font-size:21px}
.sticky .fv{width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,.12);display:grid;place-items:center}
.sticky .homeind{background:#fff}
'''
def stars(n=5): return ''.join(ms("star","fill") for _ in range(n))
b=STATUS+f'<div class="ph2"><div class="ib">{ms("arrow_forward")}</div><div class="r"><div class="ib">{ms("favorite")}</div><div class="ib">{ms("ios_share") if False else ms("share")}</div><div class="ib">{ms("shopping_bag")}<i class="n">3</i></div></div></div>'
b+=ph(I("camel-jacket"),"0.5 0.4 1.12","gal",'<div class="vt">'+ph(I("camel-jacket"),"0.5 0.3 2.4","on")+ph(I("camel-jacket"),"0.47 0.25 4","")+ph(I("camel-jacket"),"0.5 0.55 2.0","")+f'<div class="more"><span class="ltr">+2</span></div></div><div class="lbl"><span class="a">NEW</span><span>{ms("local_fire_department","fill")}يُشاهدها 18 الآن</span></div><div class="bg"><i class="on"></i><i></i><i></i><i></i><i></i></div>')
b+=f'<div class="pinfo"><div class="r1"><span class="br">NOUN STUDIO</span><div class="rt">{ms("star","fill")}<b>4.7</b><span>· 212 تقييماً</span></div></div><h1>جاكيت سويد قصير بياقة فرو</h1>'
b+='<div class="prc"><b>690 <small>ر.س</small></b><s>860</s><span class="o">-20%</span></div><div class="save">وفّرتِ <b>170 ر.س</b> · السعر شامل الضريبة</div></div>'
b+=f'<div class="blk"><div class="bl"><div>اللون <span>· جملي</span></div></div><div class="clr">{ph(I("camel-jacket"),"0.5 0.3 2.6","on")}<div class="sw"><i style="background:#151515"></i></div><div class="sw"><i style="background:#5C5A3A"></i></div><div class="sw"><i style="background:#8A3B2A"></i></div></div></div>'
b+=f'<div class="blk"><div class="bl"><div>المقاس <span>· S</span></div><a>{ms("straighten")}دليل المقاسات</a></div><div class="szs"><div class="sz">XS</div><div class="sz on">S</div><div class="sz">M</div><div class="sz">L<small>آخر قطعة</small></div><div class="sz x">XL</div></div>'
b+=f'<div class="fitm"><div class="t"><div class="ic">{ms("checkroom")}</div><div><b>قصّة قصيرة ومريحة</b><small>يناسب مقاسك المعتاد · 78% من العميلات اخترنه</small></div></div><div class="scale"><div class="ln"></div><div class="dot" style="right:46%"></div><div class="lb"><span>واسع</span><span>مطابق</span><span>ضيّق</span></div></div>'
b+='<div class="mtab"><div><small>الصدر</small><b>92 <span>سم</span></b></div><div><small>الكتف</small><b>40 <span>سم</span></b></div><div><small>الطول</small><b>54 <span>سم</span></b></div><div><small>الكم</small><b>60 <span>سم</span></b></div></div></div></div>'
b=b.replace('· 78% من','· <span class="ltr">78%</span> من')
b+=f'<div class="blk" style="margin-top:28px"><div class="bl"><div style="font-size:18px">نسّقيه مع</div><a>إطلالات أخرى{ms("chevron_left")}</a></div><div class="look">{ph(I("camel-jacket"),"0.5 0.45 1.05","main","<span>THE FIT</span>")}<div class="its">'
for i,f,n,p in [("turtleneck","0.5 0.35 1.8","بلوزة بأكمام منفوخة","320"),("fence-jeans","0.5 0.65 2.6","جينز واسع بخصر عالٍ","380"),("sneak-white","0.55 0.6 1.6","سنيكرز جلد مثقّب","540")]:
    b+=f'<div class="li2">{ph(I(i),f,"t")}<div class="n">{n}<b>{p} ر.س</b></div><div class="ck">{ms("check")}</div></div>'
b+=f'<div class="all">{ms("shopping_bag")}الإطلالة كاملة · 1,930 ر.س</div></div></div></div>'
b+=f'<div class="blk" style="margin-top:28px"><div class="bl"><div style="font-size:18px">الخامة والعناية</div></div><div class="care"><div>{ms("dry_cleaning")}تنظيف جاف<br>متخصص فقط</div><div>{ms("block")}لا يُغسل<br>بالماء</div><div>{ms("iron")}لا يُكوى<br>مباشرة</div><div>{ms("checkroom")}يُعلّق على<br>شمّاعة عريضة</div></div><div class="mat"><span>الخارج</span><b>سويد صناعي ناعم · بطانة فرو</b></div></div>'
b+=f'<div class="blk" style="margin-top:24px"><div class="dlv"><div class="d">{ms("bolt","fill")}<div><b>توصيل خلال ساعتين في الرياض</b><small>اطلبي قبل 8 مساءً · 19 ر.س</small></div></div><div class="d">{ms("local_shipping")}<div><b>شحن مجاني لكل المدن</b><small>للطلبات فوق 300 ر.س · خلال 2–4 أيام</small></div></div><div class="d">{ms("autorenew")}<div><b>إرجاع مجاني 30 يوماً</b><small>من التطبيق مباشرة وبدون أسئلة</small></div></div></div></div>'
b+=f'<div class="blk"><div class="acc2"><div class="ac"><div class="h">الوصف{ms("remove")}</div><p>جاكيت قصير بقصّة مربّعة من السويد الصناعي الناعم، بياقة وبطانة من الفرو الدافئ، وجيبين أماميين وإغلاق بأزرار مخفية.</p></div><div class="ac"><div class="h">المقاسات والقصّة{ms("add")}</div></div><div class="ac"><div class="h">الشحن والإرجاع{ms("add")}</div></div></div></div>'
b=b.replace('خلال 2–4 أيام','خلال 2 إلى 4 أيام')
b+=f'<div class="sec"><div class="sh"><div><div class="k">REVIEWS</div><h3>رأي العميلات</h3></div><a>212 تقييماً{ms("chevron_left")}</a></div><div class="blk" style="margin-top:0"><div class="rv"><div class="sc1"><b>4.7</b><div class="st">{stars()}</div><small>من 5</small></div><div class="bars">'
for l,w,v in [("الجودة",94,"4.8"),("المقاس",88,"4.6"),("الراحة",92,"4.7"),("القيمة",86,"4.5")]:
    b+=f'<div><span>{l}</span><i><em style="width:{w}%"></em></i><b>{v}</b></div>'
b+='</div></div></div><div class="hscroll phr">'
for i,f,h in [("camel-jacket","0.5 0.3 2.2","@reem"),("brick-jacket","0.5 0.35 1.8","@haya"),("street-walk","0.5 0.4 1.3","@dana"),("walk-white","0.5 0.4 1.4","@lulu")]:
    b+=ph(I(i),f,"p",f"<span>{h}</span>")
b+=f'</div><div class="blk" style="margin-top:0"><div class="rc"><div class="t"><div><b>هيا القحطاني</b><small>اشترت مقاس S</small></div><div class="st">{stars()}</div></div><p>اللون جملي دافئ والسويد ناعم جداً. القصّة قصيرة وتطلع حلوة مع الجينز الواسع، والفرو يدفّي بدون ما يكون ثقيل.</p><div class="chips"><span>الطول: 160 سم</span><span>المقاس مطابق</span></div></div></div></div>'
b+=f'<div class="sec"><div class="sh"><div><div class="k">PAIRS WELL</div><h3>يكمّل القطعة</h3></div></div><div class="hscroll prow">'
b+=pc("fence-jeans","0.5 0.62 2.2","RAWS","جينز واسع بخصر عالٍ","380")+pc("sneak-white","0.55 0.6 1.3","NOUN STUDIO","سنيكرز جلد مثقّب","540")+pc("white-backpack","0.3 0.5 1.7","OFF/GRID","حقيبة ظهر جلد ناعم","460")
b+=f'</div></div><div class="sec"><div class="sh"><div><div class="k">MORE LIKE THIS</div><h3>قد يعجبكِ أيضاً</h3></div><a>المزيد{ms("chevron_left")}</a></div><div class="hscroll prow">'
b+=pc("brick-jacket","0.5 0.4 1.9","RAWS","جاكيت جلد بني مقصوص","1,150",None,"NEW")+pc("pink-trench","0.5 0.4 1.5","NOUN STUDIO","ترنش وردي بحزام","840")+pc("c-black-coat","0.42 0.55 1.6","OFF/GRID","معطف بوكليه أسود","990")
b+='</div></div>'
b+=f'<div class="sticky"><div class="fv">{ms("favorite")}</div><div class="add">{ms("shopping_bag")}أضيفي للسلة</div><div class="sp"><small>مقاس S · جملي</small><b>690 <small>ر.س</small></b></div>{HOMEIND}</div>'
write(T,"product",page("NOUN — Product",F,PCSS,b))
print("ok")
