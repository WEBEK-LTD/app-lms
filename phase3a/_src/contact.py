# usage: contact.py db.json out_prefix query1 [query2..]  -> sheets with numbered thumbs; writes idx map
import json,sys,os,urllib.request,io,time
from PIL import Image,ImageDraw,ImageFont
db=json.load(open(sys.argv[1])); pre=sys.argv[2]; qs=sys.argv[3:]
T=os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])),"..","..","..","..","..","p3a_tmp","thumbs"); os.makedirs(T,exist_ok=True)
ids=[k for k,v in db.items() if v["q"] in qs]
def get(i):
    p=os.path.join(T,i+".jpg")
    if os.path.exists(p): return Image.open(p)
    for a in range(4):
        try:
            d=urllib.request.urlopen(urllib.request.Request("https://api.openverse.org/v1/images/%s/thumb/"%i,headers={"User-Agent":"design-client/1.0"}),timeout=40).read()
            im=Image.open(io.BytesIO(d)).convert("RGB"); im.thumbnail((300,300)); im.save(p,quality=80); return im
        except Exception as e:
            print("err",i,e); time.sleep(8)
    return Image.new("RGB",(200,200),"red")
C,S=5,200; per=25
idx=json.load(open(pre+"_idx.json")) if os.path.exists(pre+"_idx.json") else {}
base=len(idx)
for si in range(0,len(ids),per):
    chunk=ids[si:si+per]; rows=(len(chunk)+C-1)//C
    sheet=Image.new("RGB",(C*S,rows*S),"white"); dr=ImageDraw.Draw(sheet)
    for j,i in enumerate(chunk):
        n=base+si+j; idx[str(n)]=i
        im=get(i); im.thumbnail((S-6,S-6)); x=(j%C)*S; y=(j//C)*S
        sheet.paste(im,(x+3,y+3)); dr.rectangle((x+3,y+3,x+40,y+24),fill="black"); dr.text((x+6,y+6),str(n),fill="white",font=ImageFont.load_default(16))
    out="%s_%d.jpg"%(pre,(base+si)//per); sheet.save(out,quality=75); print(out,len(chunk))
json.dump(idx,open(pre+"_idx.json","w"))
