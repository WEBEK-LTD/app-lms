import sys
from PIL import Image,ImageDraw,ImageFont
out=sys.argv[1]; fs=sys.argv[2:]; W=380; font=ImageFont.load_default(size=20)
ims=[]
for f in fs:
    im=Image.open(f).convert('RGB'); im.thumbnail((W,W)); ims.append((f,im))
cols=4; rows=(len(ims)+cols-1)//cols
sh=Image.new('RGB',(cols*W,rows*(W+26)),'white'); d=ImageDraw.Draw(sh)
for i,(f,im) in enumerate(ims):
    x=(i%cols)*W; y=(i//cols)*(W+26); sh.paste(im,(x+2,y+2)); d.text((x+4,y+W+2),f.split('/')[-1],fill='black',font=font)
sh.save(out,quality=82)
