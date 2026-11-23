# ext.py src out factor [inset] : widen an image to the right by stretching a column near its right edge, soft seam (gives room for RTL text)
import sys
import numpy as np
from PIL import Image
src,out,fac=sys.argv[1],sys.argv[2],float(sys.argv[3]); ins=int(sys.argv[4]) if len(sys.argv)>4 else 30
a=np.asarray(Image.open(src).convert('RGB')).astype(np.float32); h,w,_=a.shape; W=int(w*fac)
col=a[:,w-ins-8:w-ins,:].mean(axis=1,keepdims=True)          # h x 1 x 3
can=np.repeat(col,W,axis=1)
blend=200; x0=w-ins-blend
t=np.clip((np.arange(W)-x0)/blend,0,1)[None,:,None]          # 0 -> keep image, 1 -> fill
img=np.zeros_like(can); img[:,:w-ins,:]=a[:,:w-ins,:]
res=img*(1-t)+can*t
Image.fromarray(res.clip(0,255).astype(np.uint8)).save(out,quality=90); print(W,h)
