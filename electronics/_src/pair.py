# pair.py out img1 img2 ... : side by side, scaled to width 500 each, crop to max height
import sys
from PIL import Image
out=sys.argv[1]; y0=int(sys.argv[2]); hh=int(sys.argv[3]); ims=[Image.open(f).convert('RGB') for f in sys.argv[4:]]
W=500; c=Image.new('RGB',(W*len(ims)+10*(len(ims)-1),int(hh*W/780)),'red')
for i,im in enumerate(ims):
    im=im.crop((0,y0,780,min(im.size[1],y0+hh))); im=im.resize((W,int(im.size[1]*W/780)))
    c.paste(im,(i*(W+10),0))
c.save(out,quality=85)
