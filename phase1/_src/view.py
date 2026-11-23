import sys
from PIL import Image
# view.py in.jpg out.jpg [scale] [segH]
im=Image.open(sys.argv[1]); s=float(sys.argv[3]) if len(sys.argv)>3 else 0.6; seg=int(sys.argv[4]) if len(sys.argv)>4 else 1700
im=im.resize((int(im.width*s),int(im.height*s))); w,h=im.size
n=(h+seg-1)//seg; out=Image.new("RGB",(n*w+(n-1)*12,min(seg,h)),"#888")
for k in range(n): out.paste(im.crop((0,k*seg,w,min(h,(k+1)*seg))),(k*(w+12),0))
out.save(sys.argv[2],quality=80); print(out.size)
