from lib import *
CSS=open(os.path.join(HERE,'furnA.css')).read()
F=['almarai']
SAR='<small>ر.س</small>'
def P(n): return f'{n} {SAR}'

def header():
    return f'''<div class="header">
  <div class="brand"><div class="mk"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M4 19V8.5a2 2 0 0 1 1.2-1.8l5-2.3a2 2 0 0 1 1.6 0l5 2.3A2 2 0 0 1 18 8.5V19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 19v-5.2a1.3 1.3 0 0 1 1.3-1.3h4.4a1.3 1.3 0 0 1 1.3 1.3V19" fill="none" stroke="currentColor" stroke-width="2"/></svg></div>
   <div><b>رُكن</b><small>{ms('location_on','fill')}التوصيل إلى الرياض، حي الياسمين{ms('keyboard_arrow_down','dn')}</small></div></div>
  <div class="hicons"><div class="ibtn">{ms('notifications')}<i class="n">3</i></div><div class="ibtn">{ms('menu')}</div></div>
</div>'''

def pcard(img,f,name,mat,price,old=None,tag=None,sale=False,cols=(),fav=False,dim=None,rating=None,cls='pcard'):
    t=f'<span class="tag{" sale" if sale else ""}">{tag}</span>' if tag else ''
    d=f'<span class="dimb">{ms("straighten")}{dim}</span>' if dim else ''
    c=''.join(f'<i style="background:{x}"></i>' for x in cols)
    c=f'<div class="cols">{c}</div>' if cols else '<div class="cols"><i style="visibility:hidden"></i></div>'
    r=f'<div class="rating">{ms("star","fill")}<b>{rating[0]}</b> ({rating[1]})</div>' if rating else ''
    o=f'<s>{old}</s>' if old else ''
    return f'''<div class="{cls}">{ph(img,f,'pimg',t+f'<div class="fav{" on" if fav else ""}">{ms("favorite")}</div>'+d)}
<div class="pname">{name}</div><div class="pmat">{mat}</div>{r}
<div class="pfoot"><div><div class="price{" red" if old else ""}">{price} {SAR}{o}</div>{c}</div><div class="addb">{ms('add')}</div></div></div>'''

# ---------------- HOME ----------------
def home():
    cats=[('furn/loveseat.jpg','0.5 0.55 1.6','المعيشة',1),('furn/bed-bright.jpg','0.3 0.6 1.3','النوم',0),('furn/dining-classic.jpg','0.4 0.7 1.7','الطعام',0),('furn/desk-minimal.jpg','0.5 0.75 2.4','المكاتب',0),('furn/out-rattan.jpg','0.3 0.5 1.5','الخارجي',0),('furn/wardrobe.jpg','0.5 0.5 1.1','التخزين',0)]
    cat=''.join(f'<div class="cat{" on" if on else ""}">{ph(i,f,"av")}<span>{n}</span></div>' for i,f,n,on in cats)
    b=f'''<div class="screen">{STATUS}{header()}
<div class="search">{ms('search')}<div class="t">ابحث عن كنب، سرير، طاولة طعام…</div><div class="cam">{ms('photo_camera')}</div></div>
<div class="hscroll cats">{cat}</div>
<div class="hscroll hero">
 {ph('furn/sofa-dark.jpg','0.3 0.6 1.15','hcard','<div class="wash"></div><div class="txt"><div class="lab"><i></i>مجموعة شتاء 2026</div><h2>مجالس دافئة<br>بخامات فاخرة</h2><p>مخمل وجلد طبيعي بألوان عميقة</p><div class="cta">اكتشف المجموعة'+ms('arrow_back')+'</div></div>')}
 {ph('furn/bed-warm.jpg','0.5 0.6 1','hcard')}
</div>
<div class="dots"><i class="on"></i><i></i><i></i><i></i></div>
<div class="svc">
 <div>{ms('local_shipping')}<b>توصيل وتركيب<br>مجاني</b><small>للطلبات فوق 1,500 ر.س</small></div>
 <div>{ms('verified_user')}<b>ضمان حتى<br>10 سنوات</b><small>على الهياكل الخشبية</small></div>
 <div>{ms('event_available')}<b>اختر موعد<br>التوصيل</b><span class="soon">{ms('schedule')}التقسيط قريبًا</span></div>
</div>

<div class="sec"><div class="shead"><div><h3>تسوّق حسب الغرفة</h3><div class="sub">أطقم متناسقة جاهزة للتوصيل</div></div><a>كل الغرف{ms('chevron_left')}</a></div>
<div class="rooms">
 {ph('furn/living-set.jpg','0.4 0.62 1.0','room big','<div class="sc"></div><div class="rt"><b>غرفة المعيشة</b><small>1,320 قطعة · أطقم من 7,900 ر.س</small></div>')}
 {ph('furn/bed-wardrobe.jpg','0.3 0.6 1.1','room','<div class="sc"></div><div class="rt"><b>غرفة النوم</b><small>940 قطعة</small></div>')}
 {ph('furn/dining-loft.jpg','0.62 0.68 1.5','room','<div class="sc"></div><div class="rt"><b>غرفة الطعام</b><small>610 قطع</small></div>')}
</div></div>

<div class="sec"><div class="shead"><div><h3>وصل حديثاً</h3><div class="sub">تصاميم جديدة هذا الأسبوع</div></div><a>عرض الكل{ms('chevron_left')}</a></div>
<div class="hscroll prow">
 {pcard('furn/sofa-ivory.jpg','0.68 0.76 1.12','أريكة «سدير» 3 مقاعد','جلد طبيعي · قاعدة خشب','6,450',tag='جديد',cols=('#EDE7DC','#8B8781','#5A3E2E'),dim='220 cm')}
 {pcard('furn/armchair.jpg','0.42 0.56 1.3','كرسي «ريم» بذراعين','جاكار · خشب جوز','2,350',cols=('#C98A2E','#6E7A55','#D8CFC0'),fav=True,dim='78 cm')}
 {pcard('furn/out-rattan.jpg','0.27 0.45 1.6','كرسي «واحة» من الراتان','راتان طبيعي · معدن','890',tag='خارجي',cols=('#C7A36F','#2A2A28'))}
</div></div>

<div class="sec"><div class="shead"><div><h3>أطقم كاملة</h3><div class="sub">غرفة متكاملة بخطوة واحدة</div></div><a>كل الأطقم{ms('chevron_left')}</a></div>
<div class="bundle">
 {ph('furn/living-set.jpg','0.5 0.62 1.0','bi','<div class="hot" style="top:56px;left:150px"><i>1</i>أريكة</div><div class="hot" style="top:40px;left:24px"><i>2</i>كرسي</div><div class="hot" style="top:128px;left:116px"><i>3</i>طاولة قهوة</div>')}
 <div class="bh"><div><b>طقم المجلس «نَجد»</b><small>3 قطع منسّقة · توصيل وتركيب مجاني</small></div><span class="sv">وفّر 1,350 ر.س</span></div>
 <div class="blist">
  <div class="bit">{ph('furn/living-set.jpg','0.38 0.42 2.6','bt','<span class="ck">'+ms('check')+'</span>')}<b>أريكة جلد عاجي</b><span>5,900 ر.س</span></div>
  <div class="bit">{ph('furn/living-set.jpg','0.88 0.4 3.2','bt','<span class="ck">'+ms('check')+'</span>')}<b>كرسي رمادي</b><span>1,850 ر.س</span></div>
  <div class="bit">{ph('furn/sofa-table.jpg','0.62 0.72 1.9','bt','<span class="ck">'+ms('check')+'</span>')}<b>طاولة قهوة</b><span>1,290 ر.س</span></div>
 </div>
 <div class="bb"><div class="t"><small>سعر الطقم</small><b>7,690 <small>ر.س</small></b><s>9,040</s></div><div class="btn">{ms('shopping_bag')}أضف الطقم</div></div>
</div></div>

<div class="sec"><div class="fabric">
 <h4>اختر القماش قبل أن تقرر</h4><p>نرسل لك حتى 5 عينات أقمشة مجاناً لتراها وتلمسها في ضوء بيتك.</p>
 <div class="sw"><div><i class="fab-boucle"></i><span>بوكليه عاجي</span></div><div><i class="fab-linen"></i><span>كتان رملي</span></div><div><i class="fab-velvet"></i><span>مخمل زيتي</span></div><div><i class="fab-navy"></i><span>مخمل كحلي</span></div><div><i class="fab-leather"></i><span>جلد بني</span></div></div>
 <div class="row"><small>{ms('local_shipping')}تصلك خلال 3 أيام</small><div class="btn" style="height:40px;font-size:12px">اطلب العينات{ms('arrow_back')}</div></div>
</div></div>

<div class="sec"><div class="deal">
 <div class="dh"><div><h3>عروض نهاية الأسبوع</h3><p>خصومات حتى 25% تنتهي مساء السبت</p></div><div class="cd"><b>02</b><em>:</em><b>14</b><em>:</em><b>36</b></div></div>
 <div class="dlist">
  <div class="ditem">{ph('furn/dining-classic.jpg','0.42 0.72 1.9','di')}<div class="dt"><b>طاولة طعام «ديوان» 8 مقاعد</b><small>خشب بلوط مُعالج · 240 سم</small><div class="pr">4,690 <small>ر.س</small> <s>6,200</s></div></div><span class="off">-24%</span></div> 
 </div>
</div></div>

<div class="sec"><div class="book">
 <div class="bt"><div class="ic">{ms('handyman')}</div><div><h4>احجز موعد التوصيل والتركيب</h4><p>فريق رُكن يركّب القطعة ويأخذ الكراتين معه، بلا رسوم إضافية.</p></div></div>
 <div class="days"><div class="day off"><small>الأحد</small><b>24</b></div><div class="day on"><small>الإثنين</small><b>25</b></div><div class="day"><small>الثلاثاء</small><b>26</b></div><div class="day"><small>الأربعاء</small><b>27</b></div><div class="day"><small>الخميس</small><b>28</b></div></div>
 <div class="slots"><div class="slot">9 – 12 صباحاً</div><div class="slot on">1 – 4 مساءً</div><div class="slot">5 – 9 مساءً</div></div>
</div></div>

<div class="sec"><div class="shead"><div><h3>الأكثر طلباً</h3></div><a>عرض الكل{ms('chevron_left')}</a></div>
<div class="grid">
 {pcard('furn/bed-wardrobe.jpg','0.22 0.66 1.45','سرير «لُجين» منجّد','كينج 180 × 200 سم','4,250',tag='الأكثر مبيعاً',rating=('4.9','312'))}
 {pcard('furn/lounge.jpg','0.62 0.6 1.0','كرسي استرخاء «هُدوء»','خشب بتولا · بوكليه','1,650',fav=True,rating=('4.8','208'))}
 {pcard('furn/dining-rustic.jpg','0.3 0.6 1.5','طاولة «بيدر» الريفية','خشب صنوبر معاد تدويره','3,180',rating=('4.7','96'))}
 {pcard('furn/out-wicker.jpg','0.25 0.72 2.0','كرسي خارجي «ظلال»','خيزران صناعي · وسادة مقاومة للماء','1,190',old='1,450',tag='-18%',sale=True,rating=('4.8','141'))}
</div></div>

<div class="sec"><div class="shead"><div><h3>من بيوت عملائنا</h3></div><a>4.8 · 18 ألف تقييم{ms('chevron_left')}</a></div>
<div class="review"><div class="rb">
 <div class="stars">{ms('star','fill')*5}</div>
 <q>وصلت الأريكة في الموعد الذي اخترته بالضبط، وركّبها الفريق في أقل من ساعة. الجلد ناعم والخياطة متقنة جداً.</q>
 <div class="who"><i>هـ</i><div><b>هيفاء القحطاني</b><small>الرياض · طقم «نَجد»</small></div></div>
</div>{ph('furn/review-room.jpg','0.5 0.6 1.0','ri')}</div></div>
{tabbar(0,2)}</div>'''
    return page('رُكن — الرئيسية',F,CSS,b)

# ---------------- MENU ----------------
def menu():
    cats=[
     ('weekend','غرف المعيشة','1,320 قطعة',[('furn/living-set.jpg','0.45 0.6 1.3','كل غرف المعيشة',''),('furn/sofa-ivory.jpg','0.62 0.74 1.25','أرائك','412'),('furn/living-set.jpg','0.3 0.75 2.0','كنب زاوية','96'),('furn/armchair.jpg','0.42 0.56 1.6','كراسي بذراعين','188'),('furn/sofa-table.jpg','0.62 0.74 1.15','طاولات قهوة','143'),('furn/tv-unit.jpg','0.78 0.62 1.8','وحدات تلفاز','74')]),
     ('bed','غرف النوم','940 قطعة',[('furn/bed-bright.jpg','0.35 0.6 1.2','كل غرف النوم',''),('furn/bed-wardrobe.jpg','0.24 0.66 1.35','أسرّة','226'),('furn/bed-oak.jpg','0.4 0.75 1.6','مراتب','58'),('furn/wardrobe.jpg','0.5 0.45 1.2','خزائن ملابس','131'),('furn/bed-wardrobe.jpg','0.41 0.72 2.1','كومودينو','97')]),
     ('table_restaurant','غرف الطعام','610 قطع',[('furn/dining-classic.jpg','0.45 0.6 1.1','كل غرف الطعام',''),('furn/dining-rustic.jpg','0.3 0.6 1.4','طاولات طعام','164'),('furn/dining-white.jpg','0.5 0.7 1.5','كراسي طعام','212'),('furn/dining-classic.jpg','0.82 0.68 2.6','بوفيهات','48'),('furn/dining-round.jpg','0.35 0.75 1.5','زوايا الطعام','63')]),
     ('desk','المكتب المنزلي','380 قطعة',[('furn/office-loft.jpg','0.4 0.6 1.2','كل المكاتب',''),('furn/desk-minimal.jpg','0.5 0.72 2.6','مكاتب عمل','110'),('furn/chairs-moody.jpg','0.3 0.65 1.6','كراسي مكتب','86'),('furn/office-loft.jpg','0.1 0.45 2.0','مكتبات ورفوف','92')]),
     ('deck','الأثاث الخارجي','290 قطعة',[('furn/out-lounge.jpg','0.5 0.55 1.1','كل الأثاث الخارجي',''),('furn/out-wicker.jpg','0.5 0.72 1.4','جلسات خارجية','74'),('furn/out-dining.jpg','0.45 0.65 1.4','طاولات خارجية','41'),('furn/out-adirondack.jpg','0.45 0.75 1.5','كراسي استرخاء','58'),('furn/out-rattan2.jpg','0.3 0.6 1.5','راتان','36')]),
     ('shelves','التخزين والتنظيم','215 قطعة',[('furn/wardrobe.jpg','0.55 0.6 1.0','كل حلول التخزين',''),('furn/office-loft.jpg','0.08 0.35 2.4','أرفف','64'),('furn/dining-classic.jpg','0.84 0.66 3.0','خزائن جانبية','39'),('furn/tv-unit.jpg','0.72 0.66 2.4','أدراج','52')]),
    ]
    rows=''
    for ic,t,cnt,items in cats:
        cards=''
        for n,(img,f,name,c) in enumerate(items):
            inner='<div class="sc"></div>'+(f'<span class="all">الكل</span>' if n==0 else '')+f'<div class="nm"><b>{name}</b>'+(f'<small>{c} منتج</small>' if c else '<small>تصفّح الكل</small>')+'</div>'
            cards+=ph(img,f,'mc'+(' first' if n==0 else ''),inner)
        rows+=f'<div class="mcat"><div class="mh"><b>{ms(ic)}{t} <small>{cnt}</small></b><a>عرض{ms("chevron_left")}</a></div><div class="hscroll mrow">{cards}</div></div>'
    li=[('person','حسابي','هيفاء القحطاني'),('package_2','طلباتي','طلب واحد قيد التوصيل'),('favorite','المفضلة','12 قطعة'),('language','اللغة','العربية'),('support_agent','تواصل معنا','واتساب · <span class="ltr">920 000 123</span>')]
    foot=''.join(f'<div class="mli"><div class="ic">{ms(i)}</div><b>{a}</b><span class="sp"></span><small>{s}</small>{ms("chevron_left","chev")}</div>' for i,a,s in li)
    b=f'''<div class="screen menuwrap" style="padding-bottom:0">{STATUS}
<div class="sheet"><div class="grab"></div>
<div class="mhead"><div class="brand"><div class="mk"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M4 19V8.5a2 2 0 0 1 1.2-1.8l5-2.3a2 2 0 0 1 1.6 0l5 2.3A2 2 0 0 1 18 8.5V19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 19v-5.2a1.3 1.3 0 0 1 1.3-1.3h4.4a1.3 1.3 0 0 1 1.3 1.3V19" fill="none" stroke="currentColor" stroke-width="2"/></svg></div><div><b>رُكن</b><small>أثاث يدوم معك</small></div></div><div class="mclose">{ms('close')}</div></div>
<div class="search" style="margin-top:16px">{ms('search')}<div class="t">ابحث في كل الأقسام…</div><div class="cam">{ms('photo_camera')}</div></div>
<div class="quick"><div>{ms('local_offer')}العروض</div><div>{ms('new_releases')}وصل حديثاً</div><div>{ms('chair')}الأطقم</div></div>
{rows}
<div class="mfoot">{foot}</div>
<div class="mver">رُكن للأثاث · الإصدار 4.2</div>
</div></div>'''
    return page('رُكن — القائمة',F,CSS,b)

# ---------------- LISTING ----------------
def listing():
    chips=[('الكل','1,320',1),('أرائك','412',0),('كنب زاوية','96',0),('كراسي بذراعين','188',0),('طاولات قهوة','143',0)]
    ch=''.join(f'<div class="chip{" on" if on else ""}">{n} <small>{c}</small></div>' for n,c,on in chips)
    cards=[
     pcard('furn/sofa-ivory.jpg','0.68 0.76 1.12','أريكة «سدير» 3 مقاعد','جلد طبيعي · 220 سم','6,450',tag='جديد',cols=('#EDE7DC','#8B8781','#5A3E2E'),rating=('4.9','86')),
     pcard('furn/loveseat.jpg','0.5 0.6 1.0','كنبة «نسمة» مقعدين','كتان مغسول · 160 سم','3,290',fav=True,cols=('#A9C7C4','#D9D2C4'),rating=('4.8','142')),
     pcard('furn/living-set.jpg','0.3 0.68 1.4','كنب زاوية «الدرعية»','جلد عاجي · شكل L','9,850',old='11,600',tag='-15%',sale=True,cols=('#EDE7DC','#3A3533'),rating=('4.7','58')),
     pcard('furn/armchair.jpg','0.42 0.56 1.3','كرسي «ريم» بذراعين','جاكار · خشب جوز','2,350',cols=('#C98A2E','#6E7A55'),rating=('4.9','203')),
     pcard('furn/sofa-grey.jpg','0.36 0.64 1.45','أريكة «رمال» المريحة','قماش مقاوم للبقع · 240 سم','5,200',cols=('#8C8C88','#D8CFC0','#3F4C66'),rating=('4.6','77')),
     pcard('furn/sofa-table.jpg','0.62 0.74 1.15','طاولة قهوة «لؤلؤ»','سطح لاكر لامع · ستانلس','1,290',rating=('4.7','64')),
     pcard('furn/wingback.jpg','0.5 0.62 1.5','كرسي «مَجلس» كلاسيكي','مخمل منقوش · زان','1,540',old='2,200',tag='-30%',sale=True,fav=True,rating=('4.8','119')),
     pcard('furn/lounge.jpg','0.62 0.6 1.0','كرسي استرخاء «هُدوء»','بتولا · بوكليه','1,650',cols=('#D9D4CA','#4A4A46'),rating=('4.8','208')),
    ]
    promo=ph('furn/sofa-dark.jpg','0.35 0.6 1.1','promo','<div class="sc"></div><div class="pt"><small>خدمة التصميم المجانية</small><b>صمّم مجلسك مع<br>مستشار رُكن</b><div class="go">احجز جلسة فيديو'+ms('arrow_back')+'</div></div>')
    grid=''.join(cards[:4])+promo+''.join(cards[4:])
    b=f'''<div class="screen">{STATUS}
<div class="topbar"><div class="ibtn">{ms('arrow_forward')}</div><div class="tt"><b>غرف المعيشة</b><small>1,320 قطعة</small></div><div class="ibtn">{ms('search')}</div></div>
<div class="hscroll chips">{ch}</div>
<div class="fbar"><div class="fbtn">{ms('tune')}فلترة<span class="c">3</span></div><div class="fbtn">{ms('swap_vert')}الأكثر مبيعاً</div><span class="sp"></span><div class="vt"><span class="ms on">grid_view</span><span class="ms">view_agenda</span></div></div>
<div class="atags"><span class="atag">{ms('close')}جلد</span><span class="atag">{ms('close')}ألوان فاتحة</span><span class="atag">{ms('close')}حتى 10,000 ر.س</span><span class="clr">مسح الكل</span></div>
<div class="count"><span>عرض 8 من 412 منتجاً</span><span>توصيل خلال 7 أيام</span></div>
<div class="grid">{grid}</div>
<div class="more">عرض المزيد <small>(404 منتجات أخرى)</small></div>
{tabbar(1,2)}</div>'''
    return page('رُكن — غرف المعيشة',F,CSS,b)

# ---------------- PRODUCT ----------------
SOFA_SVG='''<svg width="300" height="132" viewBox="0 0 300 132" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
<path d="M52 44c0-8 6-14 14-14h168c8 0 14 6 14 14v22H52z"/><path d="M36 60c0-6 5-10 11-10h10c6 0 11 4 11 10v34H36z"/><path d="M232 60c0-6 5-10 11-10h10c6 0 11 4 11 10v34h-32z"/><path d="M68 66h164v28H68z"/><path d="M150 66v28"/><path d="M44 94v10M256 94v10M70 94v6M230 94v6"/>
<path d="M36 118h228" stroke-dasharray="3 4" opacity=".7"/><path d="M36 113v10M264 113v10" opacity=".7"/>
<path d="M282 30v74" stroke-dasharray="3 4" opacity=".7"/><path d="M277 30h10M277 104h10" opacity=".7"/>
<text x="150" y="130" font-size="11" fill="currentColor" stroke="none" text-anchor="middle" font-family="Almarai">220 cm</text>
<text x="293" y="70" font-size="11" fill="currentColor" stroke="none" text-anchor="middle" font-family="Almarai" transform="rotate(-90 293 70)">84 cm</text></svg>'''
def product():
    th=''.join(ph(i,f,'on' if n==0 else '') for n,(i,f) in enumerate([('furn/sofa-ivory.jpg','0.6 0.66 1.5'),('furn/sofa-table.jpg','0.45 0.4 1.4'),('furn/living-set.jpg','0.45 0.6 1.1'),('furn/sofa-table.jpg','0.3 0.32 1.5'),('furn/sofa-ivory.jpg','0.5 0.4 1.0')]))
    gal=ph('furn/sofa-ivory.jpg','0.62 0.8 1.32','gal',f'''<div class="gtop"><div class="gbtn">{ms('arrow_forward')}</div><div class="gl"><div class="gbtn">{ms('share')}</div><div class="gbtn">{ms('favorite')}</div></div></div>
<div class="arb">{ms('view_in_ar')}شاهدها في غرفتك</div><div class="cnt">1 / 8</div><div class="gdots"><i class="on"></i><i></i><i></i><i></i><i></i></div>''')
    ra=f'<div class="stars" style="display:inline-flex">{ms("star","fill")*4}{ms("star_half","fill flip")}</div>'
    good=''.join([
     pcard('furn/sofa-table.jpg','0.62 0.74 1.15','طاولة قهوة «لؤلؤ»','لاكر لامع · ستانلس','1,290'),
     pcard('furn/living-set.jpg','0.88 0.4 3.0','كرسي «غيم» بذراعين','جلد رمادي','1,850'),
     pcard('furn/side-table.jpg','0.5 0.78 1.5','طاولة جانبية «جذع»','خشب طبيعي','420'),
    ])
    like=''.join([
     pcard('furn/loveseat.jpg','0.5 0.6 1.0','كنبة «نسمة» مقعدين','كتان مغسول','3,290',rating=('4.8','142')),
     pcard('furn/sofa-grey.jpg','0.36 0.64 1.45','أريكة «رمال» المريحة','قماش مقاوم للبقع','5,200',rating=('4.6','77')),
    ])
    b=f'''<div class="screen" style="padding-bottom:110px">{STATUS}
{gal}
<div class="thumbs">{th}</div>
<div class="pinfo">
 <div class="br"><small>رُكن ستوديو · مجموعة نَجد</small><span class="soon">{ms('schedule')}التقسيط قريبًا</span></div>
 <h1>أريكة «سدير» 3 مقاعد بجلد طبيعي</h1>
 <div class="rt">{ra}<b>4.9</b><u>· 86 تقييماً · 640 بيعت هذا الشهر</u></div>
 <div class="pprice"><b>6,450 <small>ر.س</small></b><s>7,900</s><span class="off">-18%</span></div>
 <div class="vat">السعر شامل ضريبة القيمة المضافة · توصيل وتركيب مجاني</div>
</div>
<div class="opt"><div class="oh"><b>الخامة: <span>جلد عاجي ناعم</span></b><a>اطلب عينة مجانية</a></div>
 <div class="fsw"><i class="on" style="background:radial-gradient(120% 90% at 30% 20%,#FBF7EF 0%,#E9E1D3 80%);box-shadow:0 0 0 2.5px var(--bg),0 0 0 4px var(--acc),inset 0 0 0 1px rgba(0,0,0,.08)"></i><i class="fab-grey"></i><i class="fab-leather"></i><i style="background:radial-gradient(120% 90% at 30% 20%,#4A4643 0%,#2B2826 80%)"></i><i class="fab-boucle"></i><i class="fab-velvet"></i></div></div>
<div class="opt"><div class="oh"><b>المقاس</b><a>دليل المقاسات</a></div>
 <div class="segs"><div class="seg">مقعدان<small>160 cm</small></div><div class="seg on">3 مقاعد<small>220 cm</small></div><div class="seg">4 مقاعد<small>260 cm</small></div><div class="seg na">زاوية L<small>نفدت</small></div></div></div>
<div class="opt"><div class="oh"><b>لون الأرجل</b></div>
 <div class="legs"><div class="leg on"><i style="background:#6B4A33"></i>خشب جوز</div><div class="leg"><i style="background:#2A2826"></i>أسود</div><div class="leg"><i style="background:#C8B08A"></i>بلوط فاتح</div></div></div>

<div class="card"><div class="ch"><b>{ms('straighten')}الأبعاد</b><a>هل تناسب مساحتك؟</a></div>
 <div class="dimsvg">{SOFA_SVG}</div>
 <div class="dgrid"><div><small>العرض</small><b>220 <small>سم</small></b></div><div><small>العمق</small><b>95 <small>سم</small></b></div><div><small>الارتفاع</small><b>84 <small>سم</small></b></div></div>
 <div class="fit">{ms('door_sliding')}<span>تمر من باب بعرض <b>80 سم</b> · الوزن 68 كجم</span><span class="go">قِس بابك</span></div>
</div>

<div class="card"><div class="ch"><b>{ms('handyman')}التوصيل والتركيب</b><a>الرياض</a></div>
 <div class="days" style="margin-top:12px">
  <div class="day" style="background:var(--bg)"><small style="color:var(--ink3)">الإثنين</small><b style="color:var(--ink)">25</b></div>
  <div class="day" style="background:var(--acc)"><small style="color:var(--accInk);opacity:.8">الثلاثاء</small><b style="color:var(--accInk)">26</b></div>
  <div class="day" style="background:var(--bg)"><small style="color:var(--ink3)">الأربعاء</small><b style="color:var(--ink)">27</b></div>
  <div class="day" style="background:var(--bg)"><small style="color:var(--ink3)">الخميس</small><b style="color:var(--ink)">28</b></div>
  <div class="day" style="background:var(--bg);opacity:.45"><small style="color:var(--ink3)">الجمعة</small><b style="color:var(--ink)">29</b></div></div>
 <div class="fit" style="margin-top:10px">{ms('check_circle')}<span>تركيب مجاني وإزالة التغليف · فترة <b>1 – 4 مساءً</b></span></div>
</div>

<div class="card"><div class="ch"><b>{ms('verified_user')}الضمان</b><a>الشروط</a></div>
 <div class="warr"><div><b>10 <small>سنوات</small></b><span>على الهيكل الخشبي والنوابض</span></div><div><b>2 <small>سنتان</small></b><span>على الجلد والخياطة</span></div></div>
</div>

<div class="dlv">
 <div class="r">{ms('local_shipping')}<div class="sp"><b>توصيل خلال 5 – 7 أيام عمل</b><small>شاحنة رُكن مع فريق من شخصين حتى داخل الغرفة.</small></div><em>مجاني</em></div>
 <div class="r">{ms('assignment_return')}<div class="sp"><b>إرجاع خلال 30 يوماً</b><small>نستلم القطعة من بيتك إن لم تناسبك.</small></div></div>
 <div class="r">{ms('payments')}<div class="sp"><b>الدفع</b><small>بطاقة مدى، فيزا، أو الدفع عند الاستلام.</small></div><span class="soon">التقسيط قريبًا</span></div>
</div>

<div class="acc">
 <div class="ai"><div class="h">التفاصيل والخامات{ms('expand_less')}</div>
  <ul><li><span>التنجيد</span><b>جلد بقري طبيعي 1.2 مم</b></li><li><span>الهيكل</span><b>خشب زان مجفف بالفرن</b></li><li><span>الحشوة</span><b>إسفنج عالي الكثافة + ريش</b></li><li><span>الأرجل</span><b>خشب جوز صلب</b></li></ul></div>
 <div class="ai"><div class="h">العناية والتنظيف{ms('expand_more')}</div></div>
 <div class="ai"><div class="h">الأسئلة الشائعة{ms('expand_more')}</div></div>
</div>

<div class="card"><div class="ch"><b>{ms('star')}آراء العملاء</b><a>كل التقييمات (86)</a></div>
 <div class="rsum" style="margin-top:14px"><div class="big"><b>4.9</b><small>من 5</small></div>
  <div class="bars"><div>5<i style="--w:88%"></i></div><div>4<i style="--w:9%"></i></div><div>3<i style="--w:2%"></i></div><div>2<i style="--w:1%"></i></div><div>1<i style="--w:0%"></i></div></div></div>
 <div class="rphotos">{ph('furn/review-room.jpg','0.5 0.75 1.2')}{ph('furn/living-set.jpg','0.3 0.6 1.6')}{ph('furn/sofa-table.jpg','0.4 0.5 1.4')}{ph('furn/sofa-ivory.jpg','0.6 0.6 1.8','more4','<span>+24</span>')}</div>
 <div class="rv"><div class="meta"><div class="who" style="margin:0;padding:0"><i>ع</i><div><b>عبدالله المطيري</b><small>جدة · قبل 5 أيام</small></div></div><div class="stars">{ms('star','fill')*5}</div></div>
 <q>جودة الجلد ممتازة والجلسة مريحة جداً. حجزت موعد التركيب من التطبيق ووصلوا في الوقت المحدد تماماً.</q></div>
</div>

<div class="sec"><div class="shead"><div><h3>يُكمل الطقم</h3></div><a>عرض الكل{ms('chevron_left')}</a></div><div class="hscroll prow">{good}</div></div>
<div class="sec"><div class="shead"><div><h3>قد يعجبك أيضاً</h3></div></div><div class="grid">{like}</div></div>

<div class="sticky"><div class="sp"><small>الإجمالي</small><b>6,450 <small>ر.س</small></b></div><div class="qty"><span class="ms">remove</span><b>1</b><span class="ms">add</span></div><div class="btn">{ms('shopping_bag')}أضف إلى السلة</div></div>
</div>'''
    return page('رُكن — أريكة سدير',F,CSS,b)

if __name__=='__main__':
    write('furniture-A-home.html',home()); write('furniture-A-menu.html',menu()); write('furniture-A-listing.html',listing()); write('furniture-A-product.html',product())
