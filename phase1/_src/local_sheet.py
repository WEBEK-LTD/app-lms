import sys,os
from PIL import Image,ImageDraw
d=sys.argv[1]; out=sys.argv[2]; names=sys.argv[3:] or sorted(f[:-4] for f in os.listdir(d) if f.endswith('.jpg'))
C=6;W=250;H=272
sh=Image.new("RGB",(C*W,((len(names)+C-1)//C)*H),"white"); dr=ImageDraw.Draw(sh)
for k,n in enumerate(names):
    im=Image.open(f"{d}/{n}.jpg"); im.thumbnail((240,240)); x=(k%C)*W;y=(k//C)*H
    sh.paste(im,(x+5+(240-im.width)//2,y+5+(240-im.height)//2)); dr.text((x+6,y+252),n+" %dx%d"%Image.open(f"{d}/{n}.jpg").size,fill="black")
sh.save(out,quality=78); print(sh.size)
