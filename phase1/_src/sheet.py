import json,sys,urllib.request,os,io,time
from PIL import Image,ImageDraw,ImageFont
# usage: sheet.py out.jpg query1 query2 ...  (uses cache.json); thumbs cached in ../../_thumbs
db=json.load(open("cache.json")); T="/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/_thumbs"; os.makedirs(T,exist_ok=True)
out=sys.argv[1]; ids=[]
for q in sys.argv[2:]:
    for i in db["_q"].get(q,[]):
        if i not in ids: ids.append(i)
ids=[i for i in ids if not os.path.exists(T+"/skip_"+i)]
cells=[]
for i in ids:
    p=T+"/"+i+".jpg"
    if not os.path.exists(p):
        for a in range(3):
            try:
                b=urllib.request.urlopen(urllib.request.Request("https://api.openverse.org/v1/images/%s/thumb/"%i,headers={"User-Agent":"design-client/1.0"}),timeout=40).read()
                im=Image.open(io.BytesIO(b)).convert("RGB"); im.thumbnail((240,240)); im.save(p,quality=80); break
            except Exception as e:
                time.sleep(5)
    if os.path.exists(p): cells.append((i,Image.open(p)))
C=6; W=250; H=270
rows=(len(cells)+C-1)//C
sh=Image.new("RGB",(C*W,max(1,rows)*H),"white"); d=ImageDraw.Draw(sh)
for k,(i,im) in enumerate(cells):
    x=(k%C)*W; y=(k//C)*H
    sh.paste(im,(x+5+(240-im.width)//2,y+5+(240-im.height)//2))
    d.text((x+6,y+250),i[:8]+" "+db[i]["title"][:20],fill="black")
sh.save(out,quality=75); print(len(cells),sh.size)
