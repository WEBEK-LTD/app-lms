import json,sys,os,urllib.request,time,concurrent.futures as cf
db=json.load(open('cache/el.json'))
skipq={'laptop desk','security camera','light bulb','technology','refrigerator'}
drop_words=['Pills','Piano','Synthesizer','Nature','Forest','Ocean','Autumn','Road','Desert','Hongkong','Aerial','Sky','Building','Wall','Flag','Architecture','Books','Cats','Shoes','Sandals','Jump','Notepad','Notebook Pen','Stethoscope','Calculator','Analytics','Stockmarket','Market','Domain','Seo','Vital','Writing']
ids=[]
for k,v in db.items():
    t=v['title'] or ''
    if v['q'] in skipq and not any(w in t for w in ['Bulb','Surveillance','Robot']): continue
    if any(w in t for w in drop_words): continue
    if t.startswith('Office Work') or t.startswith('Business') or t.startswith('Coding') or t.startswith('People') : continue
    ids.append(k)
print(len(ids))
os.makedirs('tmp/th',exist_ok=True)
def get(k):
    p=f'tmp/th/{k[:6]}.jpg'
    if os.path.exists(p): return 0
    for a in range(5):
        try:
            d=urllib.request.urlopen(urllib.request.Request(f"https://api.openverse.org/v1/images/{k}/thumb/",headers={"User-Agent":"design-client/1.0"}),timeout=40).read()
            open(p,'wb').write(d); return 1
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(20*(a+1)); continue
            return 'E%d'%e.code
        except Exception as e: time.sleep(3)
    return 'X'
with cf.ThreadPoolExecutor(4) as ex:
    r=list(ex.map(get,ids))
from collections import Counter; print(Counter(map(str,r)))
