# sheet.py outprefix files...  -> local contact sheets 4 cols, labelled by filename prefix
import sys,os
from PIL import Image,ImageDraw,ImageFont
pre=sys.argv[1]; fs=sys.argv[2:]; C,S=4,250; per=16
for si in range(0,len(fs),per):
    ch=fs[si:si+per]; rows=(len(ch)+C-1)//C
    sh=Image.new("RGB",(C*S,rows*S),"white"); dr=ImageDraw.Draw(sh)
    for j,f in enumerate(ch):
        im=Image.open(f).convert("RGB"); im.thumbnail((S-6,S-6)); x=(j%C)*S; y=(j//C)*S
        sh.paste(im,(x+3,y+3)); lab=os.path.basename(f).split('_')[0]
        dr.rectangle((x+3,y+3,x+48,y+26),fill="black"); dr.text((x+6,y+5),lab,fill="white",font=ImageFont.load_default(18))
    sh.save("%s_%d.jpg"%(pre,si//per),quality=80)
print("ok")
