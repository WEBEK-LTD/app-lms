import sys
from PIL import Image
T='/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/p3a_tmp/rv/'
import os; os.makedirs(T,exist_ok=True)
for f in sys.argv[1:]:
    im=Image.open(f); h=im.size[1]; n=0; b=os.path.basename(f)[:-4]
    for y in range(0,h,1800):
        im.crop((0,y,780,min(h,y+1800))).save(T+f'{b}_{n}.jpg',quality=70); n+=1
    print(b,im.size,n)
