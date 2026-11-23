# dl.py db.json outdir idx1 idx2 ... (indexes into db order) ; downloads full_size thumbs (~960px)
import json,sys,os,urllib.request,time
db=json.load(open(sys.argv[1])); out=sys.argv[2]; os.makedirs(out,exist_ok=True)
keys=list(db)
for a in sys.argv[3:]:
    k=keys[int(a)]; p=os.path.join(out,"%s_%s.jpg"%(a,k[:8]))
    if os.path.exists(p): continue
    for t in range(6):
        try:
            d=urllib.request.urlopen(urllib.request.Request("https://api.openverse.org/v1/images/%s/thumb/?full_size=true"%k,headers={"User-Agent":"design-client/1.0"}),timeout=60).read()
            open(p,"wb").write(d); print("ok",a,len(d),flush=True); break
        except Exception as e:
            print("err",a,e,flush=True); time.sleep(15*(t+1))
    time.sleep(3.2)
print("DONE")
