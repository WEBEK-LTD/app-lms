# get.py prefix... -> img/c/<prefix>.jpg (full-size thumb ~960px), credits.json
import json,sys,os,urllib.request,time
from concurrent.futures import ThreadPoolExecutor
db=json.load(open('cache/b.json')); os.makedirs('img/c',exist_ok=True)
cr=json.load(open('credits.json')) if os.path.exists('credits.json') else {}
def one(pre):
    ids=[k for k in db if k.startswith(pre)]
    if len(ids)!=1: return pre+' ?? '+str(len(ids))
    k=ids[0]; p=f'img/c/{pre}.jpg'
    if not os.path.exists(p):
        for t in range(5):
            try:
                d=urllib.request.urlopen(urllib.request.Request(f"https://api.openverse.org/v1/images/{k}/thumb/?full_size=true",headers={"User-Agent":"design-client/1.0"}),timeout=60).read()
                open(p,'wb').write(d); break
            except Exception as e: time.sleep(15)
    v=db[k]; cr[pre]={'id':k,'title':v['title'],'creator':v['creator'],'license':(v.get('license') or '').upper()+' '+(v.get('license_version') or ''),'url':v['foreign_landing_url']}
    return pre+' '+str(os.path.getsize(p) if os.path.exists(p) else 'MISSING')
with ThreadPoolExecutor(3) as ex: r=list(ex.map(one,sys.argv[1:]))
print(' | '.join(r))
json.dump(cr,open('credits.json','w'),indent=1)
