# place.py src out W H scale x y [feather] : put a scaled copy of src on a canvas filled with its own edge colours, feathered (room for text)
import sys
import numpy as np
from PIL import Image, ImageFilter
src,out=sys.argv[1],sys.argv[2]; W,H=int(sys.argv[3]),int(sys.argv[4]); sc=float(sys.argv[5]); X,Y=int(sys.argv[6]),int(sys.argv[7])
fe=int(sys.argv[8]) if len(sys.argv)>8 else 90
im=Image.open(src).convert('RGB'); w,h=im.size; im=im.resize((int(w*sc),int(h*sc)),Image.LANCZOS); w,h=im.size
a=np.asarray(im).astype(np.float32)
# background: average colour of the border, as a vertical gradient from the left/right edge columns
edge=(a[:,:6,:].mean(axis=1)+a[:,-6:,:].mean(axis=1))/2      # h x 3
rows=np.interp(np.linspace(0,h-1,H),np.arange(h),edge[:,0]),np.interp(np.linspace(0,h-1,H),np.arange(h),edge[:,1]),np.interp(np.linspace(0,h-1,H),np.arange(h),edge[:,2])
bg=np.stack(rows,axis=1)[:,None,:].repeat(W,axis=1)
can=Image.fromarray(bg.clip(0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(30))
m=Image.new('L',(w,h),0); 
mm=np.ones((h,w),np.float32)
for i in range(fe):
    v=i/fe; mm[i,:]=np.minimum(mm[i,:],v); mm[h-1-i,:]=np.minimum(mm[h-1-i,:],v); mm[:,i]=np.minimum(mm[:,i],v); mm[:,w-1-i]=np.minimum(mm[:,w-1-i],v)
m=Image.fromarray((mm*255).astype(np.uint8))
can.paste(im,(X,Y),m); can.save(out,quality=90); print(can.size)
