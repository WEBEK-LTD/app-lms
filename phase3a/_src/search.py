import json,sys,urllib.request,urllib.parse,os,time
out=sys.argv[1]; qs=sys.argv[2:]
db=json.load(open(out)) if os.path.exists(out) else {}
done={v["q"] for v in db.values()}
for q in qs:
    if q in done: print(q,"cached"); continue
    page=1
    if '#' in q: q,page=q.split('#'); page=int(page)
    url="https://api.openverse.org/v1/images/?"+urllib.parse.urlencode({"q":q,"source":"stocksnap","page_size":20,"page":page})
    d=None
    for a in range(6):
        try:
            d=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"design-client/1.0"}),timeout=40)); break
        except Exception as e:
            print(q,"ERR",e,flush=True); time.sleep(15*(a+1))
    if not d: continue
    n=0
    for r in d["results"]:
        if r["id"] not in db:
            db[r["id"]]={k:r.get(k) for k in ["id","title","creator","license","license_version","foreign_landing_url","width","height"]}
            db[r["id"]]["q"]=q; db[r["id"]]["tags"]=[t["name"] for t in r.get("tags") or []]; n+=1
    print(q,d["result_count"],"new",n,flush=True)
    json.dump(db,open(out,"w"),indent=0)
    time.sleep(3.5)
print("total",len(db))
