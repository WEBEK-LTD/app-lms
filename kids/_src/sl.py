import sys
from PIL import Image
V='/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/kidsview/'
for f in sys.argv[1:]:
    im=Image.open('../'+f+'.jpg'); h=im.size[1]; n=0
    for y in range(0,h,1700):
        im.crop((0,y,780,min(h,y+1700))).save(f'{V}{f}_{n}.jpg',quality=80); n+=1
    print(f,im.size,n)
