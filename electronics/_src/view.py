import sys
from PIL import Image
im=Image.open(sys.argv[1]); pre=sys.argv[2]; h=im.size[1]; step=int(sys.argv[3]) if len(sys.argv)>3 else 1800
n=0
for y in range(0,h,step):
    im.crop((0,y,780,min(h,y+step))).save(f'{pre}_{n}.jpg',quality=80); n+=1
print(im.size,n)
