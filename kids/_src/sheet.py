import json,sys,os
from PIL import Image,ImageDraw,ImageFont
db=json.load(open(sys.argv[1])); d='/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/kthumbs'; out=sys.argv[2]
keys=[k for k in db if os.path.exists(f'{d}/{k}.jpg')]
if len(sys.argv)>3: keys=[k for k in keys if db[k]['q'] in sys.argv[3].split(',')]
W=6;S=200
for pi in range(0,len(keys),36):
    ks=keys[pi:pi+36]; rows=(len(ks)+W-1)//W
    im=Image.new('RGB',(W*S,rows*(S+16)),'white'); dr=ImageDraw.Draw(im)
    for i,k in enumerate(ks):
        try: t=Image.open(f'{d}/{k}.jpg').convert('RGB')
        except Exception: continue
        t.thumbnail((S,S)); x=(i%W)*S; y=(i//W)*(S+16)
        im.paste(t,(x+(S-t.width)//2,y+(S-t.height)//2)); dr.text((x+3,y+S+2),k[:6]+' '+db[k]['title'][:20],fill='black')
    im.save(f'{out}_{pi//36}.jpg',quality=75)
    print(f'{out}_{pi//36}.jpg')
