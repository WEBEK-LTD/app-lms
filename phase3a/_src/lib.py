# shared helpers for phase3a templates
import os
HERE=os.path.dirname(os.path.abspath(__file__))
STATUS='''<div class="status"><div class="time">9:41</div><div class="island"></div><div class="sys">
<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3C13.3 1.9 10.8.8 8 .8S2.7 1.9.8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3C11.4 5.1 9.8 4.4 8 4.4S4.6 5.1 3.4 6.2l1.2 1.3C5.5 6.7 6.7 6.2 8 6.2zm0 3.5c.5 0 1 .2 1.3.5L8 11.6 6.7 10.2c.3-.3.8-.5 1.3-.5z" fill="currentColor"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill="currentColor" opacity=".45"/></svg>
</div></div>'''
BASECSS='''
*{box-sizing:border-box;margin:0;padding:0}
i,em{font-style:normal}
html,body{background:var(--bg)}
body{width:390px;color:var(--ink);-webkit-font-smoothing:antialiased;overflow-x:hidden}
.ms{font-family:'Material Symbols Rounded';font-weight:normal;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;direction:ltr;font-feature-settings:'liga';-webkit-font-smoothing:antialiased;font-variation-settings:'FILL' 0,'wght' 350,'GRAD' 0,'opsz' 24}
.fill{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.screen{position:relative;width:390px;padding-bottom:118px;overflow:hidden;min-height:844px}
.hscroll{display:flex;overflow:hidden;padding:0 16px}
.status{height:54px;position:relative;direction:ltr;color:var(--ink)}
.status .time{position:absolute;right:0;width:130px;text-align:center;top:17px;font:600 16.5px/1 -apple-system,'SF Pro Text',sans-serif}
.status .island{position:absolute;left:50%;top:11px;width:122px;height:35px;margin-left:-61px;background:#000;border-radius:20px}
.status .sys{position:absolute;left:0;width:130px;top:19px;display:flex;justify-content:center;gap:6px;align-items:center}
.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
.num{font-variant-numeric:tabular-nums}
.homeind{position:absolute;bottom:8px;left:50%;width:134px;margin-left:-67px;height:5px;border-radius:3px;background:var(--ink)}
'''
def page(title, fonts, css, body, extra_head=''):
    links=''.join('<link rel="stylesheet" href="fonts/%s.css">'%f for f in fonts+['icons'])
    return f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=390, initial-scale=1">
<title>{title}</title><script>if(location.hash=='#dark')document.documentElement.classList.add('dark')</script>{links}
<style>{BASECSS}{css}</style>{extra_head}</head><body>{body}<script src="common.js"></script></body></html>'''
def ms(name, cls=''):
    return f'<span class="ms {cls}">{name}</span>'
def ph(src, f='0.5 0.5 1', cls='', inner='', style=''):
    st=f' style="{style}"' if style else ''
    return f'<div class="{cls}" data-src="img/{src}" data-f="{f}"{st}>{inner}</div>'
def tabbar(active=0, cart=2):
    tabs=[('home','الرئيسية'),('storefront','المتجر'),('shopping_bag','السلة'),('package_2','طلباتي'),('person','حسابي')]
    out='<div class="tabbar">'
    for n,(ic,l) in enumerate(tabs):
        bd=f'<i class="bd">{cart}</i>' if ic=='shopping_bag' and cart else ''
        out+=f'<div class="tab{" on" if n==active else ""}"><span class="ms">{ic}</span><span>{l}</span>{bd}</div>'
    return out+'</div><div class="homeind"></div>'
def write(name, html):
    open(os.path.join(HERE,name),'w').write(html)
