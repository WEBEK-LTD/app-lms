from lib import *
CSS=open(os.path.join(HERE,'furnB.css')).read()
F=['plex']
SAR='<small>ر.س</small>'
def dims(w,d,h): return f'W {w} × D {d} × H {h} cm'

def header():
    return f'''<div class="header"><div class="wm"><b>KANAF</b><small>{ms('location_on','fill')}جدة · التوصيل غداً</small></div>
<div class="hseg"><span class="b">{ms('notifications')}<i class="dot"></i></span><span class="b">{ms('segment')}</span></div></div>'''

def pcard(img,f,name,dm,price,old=None,tag=None,tagc='',fav=False,sws=(),cls='pcard'):
    t=f'<span class="tag {tagc}">{tag}</span>' if tag else ''
    o=f'<s>{old} ر.س</s>' if old else ''
    sw=''.join(f'<i style="background:{x}"></i>' for x in sws)
    sw=f'<div class="sws">{sw}</div>' if sws else '<div class="sws"><i style="visibility:hidden"></i></div>'
    return f'''<div class="{cls}">{ph(img,f,'pimg',f'<div class="fav{" on" if fav else ""}">{ms("favorite")}</div>'+t)}
<div class="pname">{name}</div><div class="pdim">{dm}</div>{sw}
<div class="pfoot"><div class="price{" red" if old else ""}">{o}{price} {SAR}</div><div class="addb">{ms('add')}</div></div></div>'''

MOD1='<svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#DCEAE6" stroke-width="1.5"><rect x="4" y="3" width="36" height="9" rx="3"/><rect x="4" y="12" width="36" height="10" rx="3"/></svg>'
MOD2='<svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#DCEAE6" stroke-width="1.5"><rect x="2" y="3" width="8" height="19" rx="3"/><rect x="10" y="3" width="32" height="9" rx="3"/><rect x="10" y="12" width="32" height="10" rx="3"/></svg>'
MOD3='<svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#8DCBBB" stroke-width="1.6"><path d="M3 4h38v8H15v11H3z" stroke-linejoin="round"/><path d="M3 12h12M15 12v0"/></svg>'
MOD4='<svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#DCEAE6" stroke-width="1.5"><rect x="12" y="6" width="20" height="16" rx="4"/></svg>'

def home():
    cats=[('furn/loveseat.jpg','0.5 0.6 1.5','المعيشة',1),('furn/bed-hotel.jpg','0.45 0.62 1.4','النوم',0),('furn/dining-white.jpg','0.5 0.72 1.3','الطعام',0),('furn/desk-minimal.jpg','0.55 0.72 2.3','المكتب',0),('furn/out-wicker.jpg','0.22 0.72 1.8','الخارجي',0),('furn/wardrobe.jpg','0.55 0.6 1.0','التخزين',0)]
    cat=''.join(f'<div class="ct{" on" if on else ""}">{ph(i,f,"im")}<span>{n}</span></div>' for i,f,n,on in cats)
    qs=[('furn/lounge.jpg','0.62 0.6 1.0','كرسي «سكون» للاسترخاء','1,650'),('furn/dining-white.jpg','0.5 0.7 1.2','طاولة «بياض» مع كرسيين','1,890'),('furn/side-table.jpg','0.5 0.8 1.4','طاولة «جذع» الجانبية','420')]
    q=''.join(f'<div class="qc">{ph(i,f,"qi")}<div class="qt"><em>{ms("bolt","fill")}توصيل خلال 48 ساعة</em><b>{n}</b><span>{p} <small>ر.س</small></span></div></div>' for i,f,n,p in qs)
    best=''.join([
      pcard('furn/sofa-grey.jpg','0.36 0.64 1.4','كنبة «مدى» المعيارية',dims(260,95,82),'5,200',sws=('#8C8C88','#D8CFC0','#2B3549'),tag='الأكثر مبيعاً'),
      pcard('furn/bed-tufted.jpg','0.26 0.6 1.25','سرير «سحاب» المنجّد',dims(196,214,120),'4,390',sws=('#EDEAE4','#7D8A86')),
      pcard('furn/out-wicker2.jpg','0.5 0.72 1.25','كرسيا «فيء» الخارجيان',dims(78,74,70),'1,280',old='1,590',tag='-20%',tagc='sale'),
    ])
    ins=[('furn/bed-warm.jpg','0.5 0.6 1.0','ر','ريم الشهري','غرفة نوم دافئة بطابع خشبي','14 قطعة'),('furn/dining-classic.jpg','0.45 0.6 1.0','م','مازن العتيبي','مجلس عائلي كلاسيكي','9 قطع'),('furn/out-lounge.jpg','0.5 0.55 1.0','س','سارة الحربي','جلسة حديقة لليالي الشتاء','7 قطع'),('furn/living-set.jpg','0.4 0.6 1.0','ن','نواف القرني','معيشة بيضاء مشرقة','11 قطعة')]
    inn=''.join(ph(i,f,'ic2',f'<div class="sc"></div><div class="who"><i>{a}</i>{w}</div><div class="it"><b>{t}</b><small>{ms("chair")}{c} · تسوّق الإطلالة</small></div>') for i,f,a,w,t,c in ins)
    grid=''.join([
      pcard('furn/dining-loft.jpg','0.6 0.66 1.9','كرسي طعام «نقطة»',dims(47,55,81),'390',sws=('#F2F2EF','#1F1F1E')),
      pcard('furn/wardrobe.jpg','0.5 0.55 1.0','خزانة «مرسى» بأبواب منزلقة',dims(200,62,236),'3,950',tag='جديد'),
      pcard('furn/desk-minimal.jpg','0.6 0.7 1.45','طقم مكتب «سطر» مع كرسي',dims(120,60,75),'1,150',fav=True,sws=('#F2F2EF','#C8B08A')),
      pcard('furn/tv-unit.jpg','0.72 0.66 1.35','وحدة تلفاز «أفق» معلّقة',dims(240,40,45),'2,480',sws=('#F2F2EF','#3A3A38')),
    ])
    b=f'''<div class="screen">{STATUS}{header()}
<div class="srow"><div class="search">{ms('search')}<div class="t">ابحث بالاسم أو المقاس…</div><span class="kbd">{ms('photo_camera')}</span></div><div class="filt">{ms('tune')}</div></div>
<div class="hscroll cats">{cat}</div>
<div class="hscroll hero">
 {ph('furn/out-rattan.jpg','0.5 0.55 1.05','hcard','<span class="badge">'+ms('wb_sunny')+'موسم الجلسات الخارجية</span><div class="sc"></div><div class="txt"><div><div class="lab">مجموعة «واحة» 2026</div><h2>أمسيات الشتاء<br>تبدأ في الحديقة</h2><p>راتان طبيعي ووسائد مقاومة للماء</p></div><div class="cta">'+ms('arrow_back')+'</div></div>')}
 {ph('furn/bed-hotel.jpg','0.5 0.6 1.0','hcard')}
</div>
<div class="segi"><i class="on"></i><i></i><i></i><i></i></div>

<div class="sec"><div class="shead"><div><span class="k">جاهز في المستودع</span><h3>يصلك خلال 48 ساعة</h3></div><a>الكل{ms('chevron_left')}</a></div>
<div class="hscroll qs">{q}</div></div>

<div class="sec"><div class="shead"><div><span class="k">المجموعات</span><h3>تسوّق المساحة كاملة</h3></div><a>كل المجموعات{ms('chevron_left')}</a></div>
<div class="bento">
 {ph('furn/bed-bright.jpg','0.35 0.6 1.0','bx tall','<div class="sc"></div><span class="go">'+ms('arrow_back')+'</span><div class="bt"><small>186 قطعة</small><b>غرف نوم هادئة</b></div>')}
 {ph('furn/office-loft.jpg','0.3 0.6 1.2','bx','<div class="sc"></div><span class="go">'+ms('arrow_back')+'</span><div class="bt"><small>94 قطعة</small><b>المكتب المنزلي</b></div>')}
 {ph('furn/dining-rustic.jpg','0.4 0.55 1.1','bx','<div class="sc"></div><span class="go">'+ms('arrow_back')+'</span><div class="bt"><small>120 قطعة</small><b>زوايا الطعام</b></div>')}
</div></div>

<div class="sec"><div class="conf">
 <small>مُصمّم الكنب المعياري</small><h4>ركّب كنبتك قطعة بقطعة</h4><p>اختر الوحدات والقماش والمقاس، وشاهد السعر يتحدّث مباشرة.</p>
 <div class="mods"><div class="mod">{MOD1}<span>مستقيمة</span></div><div class="mod">{MOD2}<span>مع ذراع</span></div><div class="mod on">{MOD3}<span>زاوية L</span></div><div class="mod">{MOD4}<span>بوف</span></div></div>
 <div class="cf"><div class="t"><small>زاوية L · 5 وحدات</small><b>من 7,450 <small>ر.س</small></b></div><div class="btnm">ابدأ التصميم{ms('arrow_back')}</div></div>
</div></div>

<div class="sec"><div class="shead"><div><span class="k">الأكثر مبيعاً</span><h3>يحبّه عملاؤنا</h3></div><a>عرض الكل{ms('chevron_left')}</a></div>
<div class="hscroll prow">{best}</div></div>

<div class="sec"><div class="svcs">
 <div class="sv"><div class="ic">{ms('calendar_month')}</div><b>توصيل بموعد تختاره</b><small>حدد اليوم والفترة عند الدفع</small></div>
 <div class="sv"><div class="ic">{ms('construction')}</div><b>تركيب احترافي مجاني</b><small>فريق مدرّب يركّب ويرتّب المكان</small></div>
 <div class="sv"><div class="ic">{ms('verified_user')}</div><b>ضمان 10 سنوات</b><small>على الهياكل والمفصلات</small></div>
 <div class="sv"><div class="ic">{ms('credit_card')}</div><b>طرق دفع مرنة</b><span class="soon">{ms('schedule')}التقسيط قريبًا</span></div>
</div></div>

<div class="sec"><div class="shead"><div><span class="k">من بيوت حقيقية</span><h3>إلهام من عملائنا</h3></div><a>المزيد{ms('chevron_left')}</a></div>
<div class="hscroll ins">{inn}</div></div>

<div class="sec"><div class="shead"><div><span class="k">مختارات</span><h3>قطع تستحق مكانها</h3></div><a>عرض الكل{ms('chevron_left')}</a></div>
<div class="grid">{grid}</div></div>

<div class="sec"><div class="rstrip"><b class="n">4.8</b><div class="t"><b>أكثر من 24 ألف تقييم موثّق</b><small>«التركيب كان سريعاً والفريق محترف جداً» — لمى، جدة</small></div><div class="stars">{ms('star','fill')*4}{ms('star_half','fill flip')}</div></div></div>
'''+f'''
<div class="sec" style="margin-top:12px"><div class="show">
 <div class="sm" style="background:linear-gradient(90deg,transparent 0 47%,var(--surface) 47% 53%,transparent 53%) 0 0/120px 100%,linear-gradient(0deg,transparent 0 44%,var(--surface) 44% 52%,transparent 52%) 0 0/100% 70px,linear-gradient(35deg,transparent 0 48%,var(--surface) 48% 51%,transparent 51%),var(--tint)"><span class="pin">{ms('chair','fill')}</span></div>
 <div class="sb"><div><b>معرض كنف — جدة، حي الشاطئ</b><small><span class="open">مفتوح الآن</span> · حتى 11 مساءً · 2.4 كم</small></div><div class="btn line">{ms('near_me')}الاتجاهات</div></div>
</div></div>
{tabbar(0,3)}</div>'''
    return page('كنف — الرئيسية',F,CSS,b)

def menu():
    cats=[
     ('01','غرف المعيشة','1,320',[('furn/living-set.jpg','0.45 0.6 1.2','الكل','1,320'),('furn/sofa-ivory.jpg','0.65 0.75 1.4','أرائك','412'),('furn/living-set.jpg','0.28 0.72 1.8','كنب زاوية','96'),('furn/armchair.jpg','0.42 0.56 1.3','كراسي بذراعين','188'),('furn/sofa-table.jpg','0.62 0.74 1.4','طاولات قهوة','143'),('furn/tv-unit.jpg','0.72 0.66 1.6','وحدات تلفاز','74')]),
     ('02','غرف النوم','940',[('furn/bed-bright.jpg','0.35 0.6 1.1','الكل','940'),('furn/bed-tufted.jpg','0.26 0.6 1.6','أسرّة','226'),('furn/bed-oak.jpg','0.4 0.72 1.5','مراتب','58'),('furn/wardrobe.jpg','0.5 0.5 1.1','خزائن ملابس','131'),('furn/bed-wardrobe.jpg','0.41 0.72 2.1','كومودينو','97'),('furn/bed-detail.jpg','0.5 0.5 1.4','لوح رأس','42')]),
     ('03','غرف الطعام','610',[('furn/dining-classic.jpg','0.45 0.65 1.1','الكل','610'),('furn/dining-rustic.jpg','0.3 0.6 1.3','طاولات طعام','164'),('furn/dining-loft.jpg','0.62 0.66 2.0','كراسي طعام','212'),('furn/dining-classic.jpg','0.84 0.66 2.8','بوفيهات','48'),('furn/dining-round.jpg','0.35 0.75 1.6','طاولات مستديرة','63')]),
     ('04','المكتب المنزلي','380',[('furn/office-loft.jpg','0.35 0.6 1.2','الكل','380'),('furn/desk-minimal.jpg','0.55 0.72 2.2','مكاتب','110'),('furn/chairs-moody.jpg','0.3 0.65 1.6','كراسي عمل','86'),('furn/office-loft.jpg','0.08 0.4 2.2','مكتبات','92')]),
     ('05','الأثاث الخارجي','290',[('furn/out-lounge.jpg','0.5 0.55 1.1','الكل','290'),('furn/out-wicker.jpg','0.5 0.72 1.4','جلسات','74'),('furn/out-dining.jpg','0.45 0.65 1.4','طاولات','41'),('furn/out-adirondack.jpg','0.45 0.75 1.6','كراسي استرخاء','58'),('furn/out-rattan.jpg','0.27 0.45 1.5','راتان','36')]),
     ('06','التخزين والتنظيم','215',[('furn/wardrobe.jpg','0.55 0.6 1.0','الكل','215'),('furn/office-loft.jpg','0.06 0.3 2.6','أرفف','64'),('furn/dining-classic.jpg','0.86 0.66 3.2','خزائن جانبية','39'),('furn/tv-unit.jpg','0.74 0.7 2.6','أدراج','52')]),
    ]
    rows=''
    for n,t,c,items in cats:
        cards=''.join(f'<div class="mc{" all" if k==0 else ""}">{ph(i,f,"mi")}<b>{nm if k else "كل "+t}</b><small>{cc} قطعة</small></div>' for k,(i,f,nm,cc) in enumerate(items))
        rows+=f'<div class="mcat"><div class="mh"><div class="l"><i>{n}</i><b>{t}</b><small>{c} قطعة</small></div><a>عرض الكل{ms("chevron_left")}</a></div><div class="hscroll mrow">{cards}</div></div>'
    b=f'''<div class="screen" style="padding-bottom:40px">{STATUS}
<div class="mtop"><div class="wm"><b>KANAF</b><small>كل ما يحتاجه بيتك</small></div><div class="sq">{ms('close')}</div></div>
<div class="srow"><div class="search">{ms('search')}<div class="t">ابحث في 3,750 قطعة…</div><span class="kbd">{ms('photo_camera')}</span></div></div>
<div class="mintro"><div><b>{ms('local_offer')}العروض</b><small>حتى 30%</small></div><div><b>{ms('bolt')}جاهز للشحن</b><small>خلال 48 ساعة</small></div><div><b>{ms('dashboard')}المصمّم</b><small>كنب معياري</small></div></div>
{rows}
<div class="mgrid">
 <div class="mg">{ms('person')}حسابي<small>لمى الزهراني</small></div>
 <div class="mg">{ms('package_2')}طلباتي<small>1 قيد التوصيل</small></div>
 <div class="mg">{ms('favorite')}المفضلة<small>12 قطعة</small></div>
</div>
<div class="lang"><b>{ms('language')}اللغة</b><div class="lseg"><span class="on">العربية</span><span>English</span></div></div>
<div class="contact"><b>تحتاج مساعدة في الاختيار؟</b><small>مستشارو كنف متاحون يومياً من 9 صباحاً حتى 11 مساءً</small>
 <div class="cbtns"><div>{ms('chat')}واتساب</div><div>{ms('call')}اتصال</div><div>{ms('mail')}بريد</div></div></div>
</div>'''
    return page('كنف — القائمة',F,CSS,b)

def listing():
    chips=[('الكل',1),('جلسات',0),('كراسي',0),('طاولات',0),('مظلات',0),('راتان',0)]
    ch=''.join(f'<div class="chip{" on" if on else ""}">{n}</div>' for n,on in chips)
    cards=[
     pcard('furn/out-rattan.jpg','0.27 0.45 1.45','كرسي «واحة» من الراتان',dims(78,70,82),'890',sws=('#C7A36F','#2A2A28'),tag=ms('bolt','fill')+'48 ساعة',tagc='ship'),
     pcard('furn/out-wicker.jpg','0.27 0.72 1.9','كرسي «ظلال» بوسادة',dims(84,86,80),'1,190',old='1,450',tag='-18%',tagc='sale',sws=('#A9C7C4','#D9D2C4')),
     pcard('furn/out-adirondack.jpg','0.45 0.72 1.6','كرسيا «أفق» للاسترخاء',dims(74,92,96),'1,640',sws=('#9EA39E','#F0EEE8')),
     pcard('furn/out-wicker2.jpg','0.5 0.72 1.25','كرسيا «فيء» المجدولان',dims(78,74,70),'1,280',fav=True),
     pcard('furn/out-lounge.jpg','0.5 0.55 1.2','جلسة «بادية» الخشبية',dims(210,85,90),'4,850',tag='جديد'),
     pcard('furn/out-dining.jpg','0.5 0.65 1.3','طقم طعام «سمر» 6 أشخاص',dims(180,90,75),'3,990',sws=('#F2F2EF','#2A2A28')),
     pcard('furn/out-terrace.jpg','0.4 0.68 1.6','كرسي «مدار» المعدني',dims(62,66,78),'560',sws=('#2A2A28',)),
    ]
    promo=f'''<div class="promo">{ms('water_drop','big')}<small>مقاوم للعوامل الجوية</small><b>ضمان 5 سنوات على الأثاث الخارجي</b><p>خامات مختبرة لحرارة الصيف وأمطار الشتاء.</p><div class="go">اعرف المزيد{ms('arrow_back')}</div></div>'''
    grid=''.join(cards[:3])+promo+''.join(cards[3:])
    b=f'''<div class="screen">{STATUS}
<div class="topbar"><div class="sq">{ms('arrow_forward')}</div><div class="tt"><small>الأقسام / الخارجي</small><b>الأثاث الخارجي</b></div><div class="sq">{ms('search')}</div><div class="sq">{ms('shopping_bag')}</div></div>
{ph('furn/out-lounge.jpg','0.5 0.5 1.0','lhero','<div class="sc"></div><div class="lt"><b>موسم الجلسات الخارجية</b><small>290 قطعة · خصم حتى 20%</small></div>')}
<div class="hscroll chips">{ch}</div>
<div class="fbar"><div>{ms('tune')}الفلاتر<span class="c">2</span></div><div>{ms('swap_vert')}الأحدث</div><div>{ms('straighten')}المقاس</div></div>
<div class="atags"><span class="atag">راتان وخيزران{ms('close')}</span><span class="atag">500 – 2,000 ر.س{ms('close')}</span><span class="atag" style="background:transparent;color:var(--ink2);box-shadow:inset 0 0 0 1px var(--line)">مسح الكل</span></div>
<div class="count"><span><b>96</b> منتجاً</span><span>{ms('local_shipping')}</span></div>
<div class="grid">{grid}</div>
<div class="more">عرض 8 منتجات أخرى</div>
<div class="prog"><i></i></div><div class="progt">شاهدت 8 من 96</div>
{tabbar(1,3)}</div>'''
    b=b.replace("<span>"+ms('local_shipping')+"</span>","<span style=\"display:flex;align-items:center;gap:4px\">"+ms('local_shipping')+"تركيب مجاني</span>")
    return page('كنف — الأثاث الخارجي',F,CSS,b)

BED_SVG='''<svg width="290" height="120" viewBox="0 0 290 120" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">
<rect x="40" y="14" width="200" height="50" rx="10"/><path d="M60 24v30M80 24v30M100 24v30M120 24v30M140 24v30M160 24v30M180 24v30M200 24v30M220 24v30" opacity=".35"/>
<rect x="30" y="64" width="220" height="22" rx="6"/><rect x="34" y="56" width="212" height="10" rx="4" opacity=".6"/><path d="M40 86v8M240 86v8"/>
<path d="M30 106h220" stroke-dasharray="3 4" opacity=".7"/><path d="M30 101v10M250 101v10" opacity=".7"/>
<path d="M268 14v80" stroke-dasharray="3 4" opacity=".7"/><path d="M263 14h10M263 94h10" opacity=".7"/>
<text x="140" y="119" font-size="10.5" fill="currentColor" stroke="none" text-anchor="middle">196 cm</text>
<text x="282" y="54" font-size="10.5" fill="currentColor" stroke="none" text-anchor="middle" transform="rotate(-90 282 54)">120 cm</text></svg>'''

def product():
    th=''.join(ph(i,f,'on' if n==0 else '') for n,(i,f) in enumerate([('furn/bed-wardrobe.jpg','0.3 0.6 1.2'),('furn/bed-tufted.jpg','0.3 0.5 1.1'),('furn/bed-wardrobe.jpg','0.26 0.35 2.4'),('furn/bed-detail.jpg','0.5 0.5 1.3'),('furn/bed-wardrobe.jpg','0.6 0.6 2.4')]))
    gal=ph('furn/bed-wardrobe.jpg','0.32 0.62 1.12','gal',f'<span class="chipx">{ms("bolt","fill")}يصل خلال 48 ساعة</span><span class="arb">{ms("view_in_ar")}</span><div class="gdots"><i class="on"></i><i></i><i></i><i></i><i></i></div>')
    good=''.join([
     pcard('furn/bed-wardrobe.jpg','0.41 0.72 2.1','كومودينو «سحاب» بدرجين',dims(50,40,55),'690',sws=('#F2F2EF',)),
     pcard('furn/bed-oak.jpg','0.4 0.72 1.4','مرتبة «غيمة» الطبية',dims(180,200,30),'2,150',tag='يُنصح به'),
     pcard('furn/wardrobe.jpg','0.5 0.55 1.0','خزانة «مرسى» المنزلقة',dims(200,62,236),'3,950'),
    ])
    like=''.join([
     pcard('furn/bed-bright.jpg','0.3 0.62 1.2','سرير «نسيم» بإطار مخملي',dims(190,212,110),'3,780',sws=('#B9B2AA','#4E4252')),
     pcard('furn/bed-warm.jpg','0.5 0.82 1.25','سرير «سدر» الخشبي',dims(186,210,95),'3,250',sws=('#3A2E28',)),
    ])
    b=f'''<div class="screen" style="padding-bottom:110px">{STATUS}
<div class="ptop"><div class="sq">{ms('arrow_forward')}</div><div style="display:flex;gap:8px"><div class="sq">{ms('share')}</div><div class="sq">{ms('favorite')}</div></div></div>
{gal}
<div class="thumbs">{th}</div>
<div class="pinfo">
 <div class="r1"><small>غرف النوم / أسرّة منجّدة</small><div class="rt">{ms('star','fill')}4.8 <u>(312)</u></div></div>
 <h1>سرير «سحاب» بلوح رأس منجّد</h1>
 <div class="sub">لوح رأس كابيتونيه بارتفاع 120 سم · قاعدة خشب زان</div>
 <div class="pprice"><div class="pv"><b>4,390 <small>ر.س</small></b><s>5,150</s><div>شامل الضريبة · التركيب مجاني</div></div><span class="sp"></span><div class="col"><span class="offb">-15%</span><span class="soon">{ms('schedule')}التقسيط قريبًا</span></div></div>
</div>
<div class="opt"><div class="oh"><b>المقاس: <span>كينج 180 × 200</span></b><a>دليل المقاسات</a></div>
 <div class="sizes"><div class="sz"><b>مفرد</b><small>120 × 200</small></div><div class="sz"><b>كوين</b><small>160 × 200</small></div><div class="sz on"><b>كينج</b><small>180 × 200</small></div><div class="sz"><b>سوبر كينج</b><small>200 × 200</small></div></div></div>
<div class="opt"><div class="oh"><b>قماش لوح الرأس: <span>جلد صناعي أبيض</span></b><a>اطلب عينة</a></div>
 <div class="fabs"><div class="fb on"><i style="background:radial-gradient(120% 90% at 30% 20%,#FFFFFF 0%,#E7E4DE 85%)"></i>لؤلؤي</div><div class="fb"><i style="background:repeating-linear-gradient(45deg,rgba(255,255,255,.1) 0 2px,transparent 2px 4px),#8D928F"></i>رمادي</div><div class="fb"><i style="background:radial-gradient(120% 90% at 30% 20%,#3F5A55 0%,#26403B 85%)"></i>صنوبري</div></div></div>
<div class="tog"><div class="ic">{ms('inventory_2')}</div><div class="tx"><b>قاعدة تخزين هيدروليكية</b><small>مساحة تخزين أسفل السرير · + 650 ر.س</small></div><span class="sw"></span></div>
<div class="addon">{ph('furn/bed-oak.jpg','0.4 0.72 1.6','ai')}<div class="tx"><b>أضف مرتبة «غيمة» الطبية</b><small>جيوب نوابض مستقلة · 30 سم</small><span>+ 2,150 ر.س</span></div><span class="ck">{ms('check')}</span></div>

<div class="blk"><h5>الأبعاد والمواصفات<a>هل يمر من الباب؟</a></h5>
 <div class="dtab"><div class="bedsvg">{BED_SVG}</div>
  <div class="rw"><span>الأبعاد الكلية</span><b>196 × 214 × 120 cm</b></div>
  <div class="rw"><span>ارتفاع القاعدة</span><b>32 cm</b></div>
  <div class="rw"><span>أقصى حمولة</span><b>300 kg</b></div>
  <div class="rw"><span>عدد الكراتين</span><b>3</b></div></div></div>

<div class="blk"><h5>احجز التوصيل والتركيب<a>جدة</a></h5>
 <div class="slots"><div class="dts"><div class="dt"><small>غداً</small><b>24</b></div><div class="dt on"><small>الثلاثاء</small><b>25</b></div><div class="dt"><small>الأربعاء</small><b>26</b></div><div class="dt"><small>الخميس</small><b>27</b></div><div class="dt"><small>السبت</small><b>29</b></div></div>
 <div class="ts"><span>صباحاً 9 – 1</span><span class="on">مساءً 2 – 6</span><span>مساءً 6 – 10</span></div>
 <div class="note">{ms('construction')}تركيب في 45 دقيقة تقريباً وإزالة التغليف مجاناً</div></div></div>

<div class="blk"><h5>الضمان</h5><div class="wbar"><div><b>10 سنوات</b><span>الهيكل والقاعدة</span></div><div><b>5 سنوات</b><span>المكبس الهيدروليكي</span></div><div><b>سنتان</b><span>التنجيد والقماش</span></div></div></div>

<div class="blk"><div class="dlv">
 <div class="r">{ms('local_shipping')}<div class="sp"><b>توصيل مجاني حتى غرفة النوم</b><small>يصل خلال 48 ساعة إلى جدة</small></div><em>مجاني</em></div>
 <div class="r">{ms('assignment_return')}<div class="sp"><b>إرجاع خلال 30 يوماً</b><small>نفكّك السرير ونستلمه من بيتك</small></div></div>
 <div class="r">{ms('credit_card')}<div class="sp"><b>الدفع عند الاستلام أو بالبطاقة</b><small>مدى، فيزا، ماستركارد</small></div><span class="soon">التقسيط قريبًا</span></div>
</div></div>

<div class="acc">
 <div class="ai"><div class="h">الخامات والتصنيع{ms('expand_less')}</div><p>هيكل من خشب الزان المجفف بالفرن، ولوح رأس منجّد بجلد صناعي عالي المتانة سهل التنظيف، وشرائح خشبية مرنة تدعم المرتبة بالتساوي.</p></div>
 <div class="ai"><div class="h">العناية والتنظيف{ms('expand_more')}</div></div>
 <div class="ai"><div class="h">تعليمات التركيب (PDF){ms('expand_more')}</div></div>
</div>

<div class="blk"><h5>آراء العملاء<a>كل التقييمات (312)</a></h5>
 <div class="rsum"><div class="big"><b>4.8</b><small>312 تقييماً</small></div><div class="tags"><span>{ms('thumb_up')}مريح جداً</span><span>{ms('thumb_up')}تركيب سريع</span><span>{ms('thumb_up')}مطابق للصور</span><span>{ms('thumb_up')}متين</span></div></div>
 <div class="rph">{ph('furn/bed-tufted.jpg','0.3 0.5 1.2')}{ph('furn/bed-detail.jpg','0.5 0.6 1.2')}{ph('furn/bed-hotel.jpg','0.5 0.6 1.2')}{ph('furn/bed-wardrobe.jpg','0.3 0.6 1.6','m','<span>+38</span>')}</div>
 <div class="rvc"><div class="meta"><div class="who"><i>ل</i><div><b>لمى الزهراني</b><small>جدة · قبل 3 أيام</small></div></div><div class="stars">{ms('star','fill')*5}</div></div>
 <q>اخترت موعد المساء ووصل الفريق في الوقت. لوح الرأس فخم وناعم، وقاعدة التخزين وفّرت علي خزانة كاملة.</q><div class="vf">{ms('verified','fill')}شراء موثّق · كينج، أبيض لؤلؤي</div></div>
</div>

<div class="sec"><div class="shead"><div><span class="k">يكمل الغرفة</span><h3>يتناسق معه</h3></div><a>الكل{ms('chevron_left')}</a></div><div class="hscroll prow">{good}</div></div>
<div class="sec"><div class="shead"><div><span class="k">بدائل مشابهة</span><h3>قد يعجبك أيضاً</h3></div></div><div class="grid">{like}</div></div>

<div class="sticky"><div class="sq">{ms('chat')}</div><div class="btn"><span style="display:flex;align-items:center;gap:7px">{ms('add_shopping_cart')}أضف إلى السلة</span><span class="p">4,390 <small>ر.س</small></span></div></div>
</div>'''
    return page('كنف — سرير سحاب',F,CSS,b)

if __name__=='__main__':
    write('furniture-B-home.html',home()); write('furniture-B-menu.html',menu()); write('furniture-B-listing.html',listing()); write('furniture-B-product.html',product())
