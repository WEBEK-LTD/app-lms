# usage: get.py cache.json subdir name=idprefix ...   downloads full-size thumbs, records credits
import json,sys,os,urllib.request,time
db=json.load(open(sys.argv[1])); sub=sys.argv[2]
os.makedirs('img/'+sub,exist_ok=True)
cr=json.load(open('credits.json')) if os.path.exists('credits.json') else {}
for a in sys.argv[3:]:
    name,pre=a.split('=')
    ids=[k for k in db if k.startswith(pre)]
    if len(ids)!=1: print('??',a,ids); continue
    k=ids[0]; p=f'img/{sub}/{name}.jpg'
    if not os.path.exists(p):
        for t in range(6):
            try:
                d=urllib.request.urlopen(urllib.request.Request(f"https://api.openverse.org/v1/images/{k}/thumb/?full_size=true",headers={"User-Agent":"design-client/1.0"}),timeout=60).read()
                open(p,'wb').write(d); break
            except Exception as e:
                print(name,e); time.sleep(20)
    v=db[k]; cr[f'{sub}/{name}.jpg']={'id':k,'title':v['title'],'creator':v['creator'],'license':(v.get('license') or '').upper()+' '+(v.get('license_version') or ''),'url':v['foreign_landing_url']}
    print(name,'ok',os.path.getsize(p) if os.path.exists(p) else 'MISSING')
json.dump(cr,open('credits.json','w'),indent=1)
