import json,sys,urllib.request,urllib.parse,os,time
out=sys.argv[1]; qs=sys.argv[2:]
db=json.load(open(out)) if os.path.exists(out) else {}
for qq in qs:
    q,_,pg=qq.partition("@"); pg=int(pg or 1)
    url="https://api.openverse.org/v1/images/?"+urllib.parse.urlencode({"q":q,"source":"stocksnap","page_size":20,"page":pg})
    for t in range(5):
        try:
            d=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"design-client/1.0"}),timeout=40)); break
        except Exception as e:
            print(q,"ERR",e); d=None; time.sleep(30) if "429" in str(e) else None
            if "401" in str(e): break
    if not d: continue
    n=0
    for r in d["results"]:
        if r["id"] not in db:
            db[r["id"]]={k:r.get(k) for k in ["id","title","creator","license","license_version","foreign_landing_url","width","height","thumbnail"]}; db[r["id"]]["q"]=q; n+=1
    print(q,d["result_count"],"new",n,flush=True)
    time.sleep(2)
json.dump(db,open(out,"w"),indent=1)
print("total",len(db))
