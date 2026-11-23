import json,sys,urllib.request,urllib.parse,os,time
# usage: python3 search.py cache.json "query" ...   -> prints id title WxH
out=sys.argv[1]; qs=sys.argv[2:]
db=json.load(open(out)) if os.path.exists(out) else {}
qdone=db.setdefault("_q",{})
for q in qs:
    if q not in qdone:
        url="https://api.openverse.org/v1/images/?"+urllib.parse.urlencode({"q":q,"source":"stocksnap","page_size":20})
        for a in range(4):
            try:
                d=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"design-client/1.0"}),timeout=40)); break
            except urllib.error.HTTPError as e:
                if e.code==429: time.sleep(20*(a+1)); continue
                print(q,"ERR",e); d=None; break
            except Exception as e: print(q,"ERR",e); d=None; break
        if not d: continue
        ids=[]
        for r in d["results"]:
            db[r["id"]]={k:r.get(k) for k in ["id","title","creator","license","license_version","foreign_landing_url","width","height","tags"]}
            db[r["id"]]["tags"]=[t["name"] for t in (r.get("tags") or [])][:12]
            ids.append(r["id"])
        qdone[q]=ids; time.sleep(1.5)
    print("##",q,len(qdone[q]))
    for i in qdone[q]:
        r=db[i]; print(i[:8],r["title"],"%sx%s"%(r["width"],r["height"]),"|",",".join(r["tags"][:8]))
json.dump(db,open(out,"w"),indent=0)
