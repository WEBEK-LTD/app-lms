import json,sys,urllib.request,os,io,time
from PIL import Image
# usage: dl.py type name=idprefix ...
db=json.load(open("cache.json")); cr=json.load(open("credits.json")) if os.path.exists("credits.json") else {}
typ=sys.argv[1]; os.makedirs("img/"+typ,exist_ok=True)
for a in sys.argv[2:]:
    name,pre=a.split("=")
    ids=[k for k in db if k!="_q" and k.startswith(pre)]
    if len(ids)!=1: print("??",a,ids); continue
    i=ids[0]; p="img/%s/%s.jpg"%(typ,name)
    if not os.path.exists(p):
        for t in range(4):
            try:
                b=urllib.request.urlopen(urllib.request.Request("https://api.openverse.org/v1/images/%s/thumb/?full_size=true"%i,headers={"User-Agent":"design-client/1.0"}),timeout=60).read(); break
            except Exception as e:
                print("retry",name,e); time.sleep(10*(t+1)); b=None
        if not b: continue
        im=Image.open(io.BytesIO(b)).convert("RGB")
        if max(im.size)>1100: im.thumbnail((1100,1100))
        im.save(p,quality=88)
    r=db[i]; cr["%s/%s.jpg"%(typ,name)]={"id":i,"title":r["title"],"creator":r["creator"],"license":"CC0 1.0","url":r["foreign_landing_url"]}
    print(name,Image.open(p).size)
json.dump(cr,open("credits.json","w"),indent=1)
