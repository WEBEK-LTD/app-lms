# Shared catalogue for the electronics templates (fictional brands only)
from lib import ph, ic

def money(n):
    return f"{n:,}"

# key: (img, focal, brand, name, price, old, rating, reviews, badge)
P = {
 # phones / tablets
 'x1pro': ('e/c727a1.jpg', '0.66 0.38 1.05', 'ZENRA', 'جوال X1 برو · 256 جيجا', 4899, 5299, 4.8, 1240, 'جديد'),
 'x1blue': ('e/6ff818.jpg', '0.42 0.66 1.45', 'ZENRA', 'X1 برو أزرق مع Buds', 5349, 5898, 4.9, 312, 'باقة'),
 'x1': ('e/6a25a0.jpg', '0.48 0.45 1.05', 'ZENRA', 'جوال X1 · 128 جيجا', 3299, None, 4.7, 980, None),
 'n5': ('e/8bb01b.jpg', '0.52 0.42 1.15', 'ZENRA', 'جوال N5 · أسود ليلي', 1899, 2149, 4.6, 655, '-12%'),
 'vs9': ('e/acafa4.jpg', '0.5 0.62 1.35', 'VELLO', 'جوال فيلو S9 · 256 جيجا', 2749, None, 4.5, 402, None),
 'vedge': ('e/eb5011.jpg', '0.55 0.45 1.05', 'VELLO', 'فيلو Edge · شاشة منحنية', 3150, 3499, 4.6, 288, '-10%'),
 'n5w': ('e/52d20b.jpg', '0.6 0.42 1.1', 'ZENRA', 'جوال N5 · فضي', 1899, None, 4.6, 655, None),
 'found': ('e/1df480.jpg', '0.5 0.5 1.1', 'ZENRA', 'جوال C2 كومباكت · مجدّد', 1099, 1499, 4.5, 96, 'مجدّد'),
 'tab11': ('e/e951eb.jpg', '0.4 0.6 1.1', 'ZENRA', 'جهاز Tab 11 · واي فاي', 2399, 2599, 4.7, 520, None),
 'tabpro': ('e/4b8051.jpg', '0.5 0.42 1.1', 'ZENRA', 'Tab برو 13 مع القلم', 3999, None, 4.8, 207, 'جديد'),
 'tabx': ('e/7098dd.jpg', '0.45 0.62 1.15', 'ZENRA', 'Tab 11 · ‏LTE', 2799, None, 4.6, 140, None),
 # laptops
 'apro16': ('e/109522.jpg', '0.42 0.55 1.1', 'ARCLINE', 'لابتوب Pro 16 · ‏32 جيجا', 8999, 9799, 4.9, 640, '-8%'),
 'aair14': ('e/b7a2c6.jpg', '0.68 0.42 1.35', 'ARCLINE', 'لابتوب Air 14 · خفيف', 4299, None, 4.8, 1105, 'الأكثر مبيعًا'),
 'aair13': ('e/1fdb92.jpg', '0.33 0.38 1.4', 'ARCLINE', 'لابتوب Air 13 · ‏M3', 3799, 4199, 4.7, 870, '-10%'),
 'astudio': ('e/6f2d4e.jpg', '0.7 0.45 1.05', 'ARCLINE', 'لابتوب Studio 15 للتصميم', 6499, None, 4.8, 233, None),
 'apro14': ('e/105db1.jpg', '0.45 0.62 1.05', 'ARCLINE', 'لابتوب Pro 14 · فضي', 7299, None, 4.8, 412, 'جديد'),
 'anight': ('e/f1fe5f.jpg', '0.72 0.5 1.6', 'ARCLINE', 'لابتوب Pro 14 · رمادي', 7299, 7699, 4.8, 412, None),
 'aplant': ('e/00b2aa.jpg', '0.6 0.55 1.15', 'NOVEX', 'لابتوب Novex Slim 14', 3499, None, 4.5, 318, None),
 'awin': ('e/11d611.jpg', '0.75 0.62 1.6', 'NOVEX', 'لابتوب Novex 15 للأعمال', 3999, 4399, 4.6, 205, '-9%'),
 'aglow': ('e/44792d.jpg', '0.5 0.5 1.1', 'ARCLINE', 'Pro 16 · إصدار ليلي', 9499, None, 4.9, 77, None),
 # audio
 'hstudio': ('e/cc164a.jpg', '0.5 0.48 1.7', 'AUREL', 'سماعات Studio بعزل الضوضاء', 1149, 1399, 4.8, 2140, '-18%'),
 'hone': ('e/7ac140.jpg', '0.48 0.55 1.35', 'AUREL', 'سماعات One لاسلكية', 899, None, 4.7, 1320, None),
 'hsolo': ('e/2d4e5c.jpg', '0.56 0.5 1.6', 'AUREL', 'سماعات Solo · فضي', 1049, None, 4.7, 760, 'جديد'),
 'hheri': ('e/104baa.jpg', '0.5 0.5 1.05', 'AUREL', 'سماعات Heritage جلد طبيعي', 1299, None, 4.9, 410, None),
 'bpro': ('e/216936.jpg', '0.62 0.55 1.4', 'AUREL', 'سماعات Buds برو', 799, 949, 4.8, 3010, '-16%'),
 'buds': ('e/53c92c.jpg', '0.43 0.5 2.0', 'AUREL', 'سماعات Buds · علبة شحن', 549, None, 4.6, 1880, None),
 'hflow': ('e/5b7b51.jpg', '0.5 0.5 1.4', 'AUREL', 'سماعات Flow للسفر', 699, 799, 4.6, 940, None),
 'bpurp': ('e/2ac13a.jpg', '0.55 0.6 1.6', 'AUREL', 'Buds برو · الجيل 2', 849, None, 4.8, 640, None),
 # watches
 'ws3': ('e/2c638d.jpg', '0.52 0.52 1.5', 'KOVA', 'ساعة S3 · ‏45 مم', 1499, 1699, 4.8, 1560, '-12%'),
 'wsport': ('e/0caba3.jpg', '0.62 0.42 1.15', 'KOVA', 'ساعة S3 Sport', 1399, None, 4.7, 870, None),
 'wlens': ('e/9e1d4a.jpg', '0.42 0.62 1.3', 'KOVA', 'ساعة S3 · رمادي', 1499, None, 4.8, 1560, None),
 'wmarble': ('e/c42820.jpg', '0.38 0.5 1.25', 'KOVA', 'ساعة S3 مع سوار إضافي', 1599, None, 4.8, 330, None),
 'wwhite': ('e/4b8445.jpg', '0.5 0.5 1.3', 'KOVA', 'ساعة Active · ‏41 مم', 1099, 1249, 4.6, 512, None),
 # cameras / drones
 'cr7': ('e/7e6629.jpg', '0.5 0.45 1.05', 'RYOKU', 'كاميرا R7 بدون مرآة', 9499, 10299, 4.9, 318, '-8%'),
 'l35': ('e/1185bf.jpg', '0.5 0.5 1.25', 'RYOKU', 'عدسة 35 مم f/1.4', 2899, None, 4.8, 190, None),
 'l50': ('e/e6c23c.jpg', '0.5 0.5 1.35', 'RYOKU', 'عدسة 50 مم f/1.2', 3450, None, 4.9, 142, 'جديد'),
 'l85': ('e/8cae4a.jpg', '0.55 0.5 1.05', 'RYOKU', 'عدسة 85 مم f/1.4', 4199, 4599, 4.8, 96, None),
 'lwide': ('e/6c1106.jpg', '0.5 0.55 1.1', 'RYOKU', 'عدسة واسعة 16–35 مم', 5250, None, 4.7, 61, None),
 'lset': ('e/635768.jpg', '0.5 0.5 1.05', 'RYOKU', 'طقم عدسات Prime ثلاثي', 7990, 8990, 4.8, 44, None),
 'dmini': ('e/9de3f5.jpg', '0.5 0.58 1.2', 'SKYRA', 'درون Mini 4 · ‏4K', 2999, 3299, 4.8, 720, '-9%'),
 'dtop': ('e/bffcc3.jpg', '0.5 0.5 1.2', 'SKYRA', 'Mini 4 · باقة الطيران', 3699, None, 4.8, 210, None),
 'dair': ('e/18dc91.jpg', '0.5 0.38 1.4', 'SKYRA', 'درون Air 3 · مستشعرات 360°', 4799, None, 4.8, 180, None),
 'dpro': ('e/29a995.jpg', '0.5 0.45 1.05', 'SKYRA', 'درون Pro 5 · كاميرا 6K', 6299, None, 4.7, 88, None),
 # gaming
 'gpad': ('e/63ffd1.jpg', '0.5 0.55 1.1', 'VORTEX', 'يد تحكم Pro لاسلكية', 349, 399, 4.7, 2300, None),
 'gblue': ('e/d02ef7.jpg', '0.5 0.62 1.05', 'VORTEX', 'يد تحكم Pro · أزرق', 349, None, 4.7, 2300, None),
 'gvr': ('e/7866d8.jpg', '0.42 0.38 1.15', 'VORTEX', 'نظارة واقع افتراضي X', 1899, 2199, 4.6, 410, None),
 # appliances
 'kesp': ('e/d3ac0a.jpg', '0.38 0.62 1.05', 'HAUSEN', 'مكينة إسبريسو أوتوماتيكية', 3299, 3799, 4.8, 610, '-13%'),
 'kov': ('e/c79865.jpg', '0.62 0.5 1.05', 'HAUSEN', 'فرن كهربائي مدمج 60 سم', 4150, None, 4.7, 205, None),
 'kwash': ('e/8017eb.jpg', '0.5 0.5 1.05', 'HAUSEN', 'غسالة 10 كجم · بخار', 2899, 3299, 4.7, 488, '-12%'),
 'kmw': ('e/5533e9.jpg', '0.62 0.42 1.5', 'HAUSEN', 'ميكروويف 28 لتر بالشواية', 749, None, 4.5, 330, None),
 # smart home & accessories
 'scam': ('e/fe1831.jpg', '0.72 0.76 1.8', 'NIDO', 'كاميرا مراقبة 2K · ‏360°', 549, 649, 4.6, 920, None),
 'sbulb': ('e/66d2c2.jpg', '0.6 0.55 1.05', 'NIDO', 'إضاءة ذكية', 0, None, 0, 0, None),
 'ssd': ('e/bd1628.jpg', '0.55 0.5 1.05', 'ARCLINE', 'قرص SSD خارجي 2 تيرا', 699, 799, 4.8, 1010, None),
 'mem': ('e/5103f2.jpg', '0.6 0.5 1.1', 'ARCLINE', 'بطاقات ذاكرة وفلاش', 0, None, 0, 0, None),
 'kbd': ('e/3b2652.jpg', '0.62 0.6 1.1', 'ARCLINE', 'لوحة مفاتيح Slim لاسلكية', 449, None, 4.7, 760, None),
 'kbrgb': ('e/475ef2.jpg', '0.55 0.55 1.1', 'VORTEX', 'لوحة مفاتيح ميكانيكية RGB', 599, 699, 4.7, 540, None),
}

TV = {
 'c5_65': ('e/9c3523.jpg', 'LUMORA', 'تلفزيون OLED C5 · ‏65 بوصة', 8999, 10499, 4.9, 860, '-14%'),
 'q7_55': ('e/6d1af8.jpg', 'LUMORA', 'تلفزيون QLED Q7 · ‏55 بوصة', 3799, 4299, 4.7, 1240, '-12%'),
 'c5_77': ('e/b87acc.jpg', 'LUMORA', 'تلفزيون OLED C5 · ‏77 بوصة', 14999, None, 4.9, 210, 'جديد'),
 'm8_75': ('e/679e68.jpg', 'LUMORA', 'تلفزيون Mini LED · ‏75 بوصة', 7499, 8299, 4.8, 390, None),
}

def tvr(key, cls="", stand=True):
    """CSS product render of a TV: thin bezel around a StockSnap landscape photo."""
    img = TV[key][0]
    st = '<i class="tv-neck"></i><i class="tv-foot"></i>' if stand else ''
    return (f'<div class="tvr {cls}"><div class="tv-frame">'
            f'{ph(img, "0.5 0.5 1", "tv-screen")}<i class="tv-glare"></i></div>{st}</div>')

TV_CSS = """
.tvr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,#EEF0F3 0%,#E3E6EA 100%)}
.tvr .tv-frame{width:84%;aspect-ratio:16/9.2;background:#0B0C0E;border-radius:5px;padding:3px;position:relative;box-shadow:0 14px 22px -10px rgba(15,20,30,.45),0 0 0 1px rgba(0,0,0,.25)}
.tvr .tv-screen{width:100%;height:100%;border-radius:2px;background-color:#111}
.tvr .tv-glare{position:absolute;inset:3px;border-radius:2px;background:linear-gradient(115deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 38%)}
.tvr .tv-neck{width:9%;height:7px;background:linear-gradient(#3B3E44,#202226);margin-top:-1px}
.tvr .tv-foot{width:34%;height:4px;border-radius:2px;background:#2A2C31;box-shadow:0 6px 10px rgba(0,0,0,.22)}
html.dark .tvr,.tvr.dark{background:linear-gradient(180deg,#1E2128 0%,#121418 100%)}
html.dark .tvr .tv-frame,.tvr.dark .tv-frame{box-shadow:0 0 0 1px rgba(255,255,255,.08),0 18px 30px -8px rgba(0,0,0,.7)}
html.dark .tvr .tv-foot,.tvr.dark .tv-foot{background:#3A3D44}
"""
