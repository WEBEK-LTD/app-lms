import json,sys,urllib.request,urllib.parse,os,time
out=sys.argv[1]; qs=sys.argv[2:]
pages=[1,2]
small={}
db={}
if os.path.exists(out): db=json.load(open(out))
for q0 in [(q,p) for q in qs for p in pages]:
    q,p=q0
    if p>1 and small.get(q): continue
    url="https://api.openverse.org/v1/images/?"+urllib.parse.urlencode({"q":q,"source":"stocksnap","page_size":20,"page":p})
    for attempt in range(4):
        try:
            d=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"design-client/1.0"}),timeout=40)); break
        except urllib.error.HTTPError as e:
            print(q,"HTTP",e.code); 
            if e.code==429: time.sleep(30*(attempt+1)); continue
            d=None; break
        except Exception as e:
            print(q,"ERR",e); d=None; time.sleep(5)
    if not d: continue
    small[q]=d["result_count"]<=20
    n=0
    for r in d["results"]:
        if r["id"] not in db:
            db[r["id"]]={k:r.get(k) for k in ["id","title","creator","license","license_version","foreign_landing_url","width","height","thumbnail"]}; db[r["id"]]["q"]=q; db[r["id"]]["tags"]=[t["name"] for t in (r.get("tags") or [])][:12]; n+=1
    print(q,p,d["result_count"],"new",n,flush=True)
    time.sleep(4)
    json.dump(db,open(out,"w"),indent=1)
json.dump(db,open(out,"w"),indent=1)
print("total",len(db))
