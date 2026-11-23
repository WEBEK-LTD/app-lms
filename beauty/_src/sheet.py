# sheet.py cache.json outprefix [filter-substr...]  -> contact sheets 5x4 with id prefixes
import json,sys,os,urllib.request,time
from PIL import Image,ImageDraw,ImageFont
from concurrent.futures import ThreadPoolExecutor
T='/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/bthumbs/'
db=json.load(open(sys.argv[1])); pre=sys.argv[2]; flt=sys.argv[3:]
seen=set(json.load(open('cache/seen.json'))) if os.path.exists('cache/seen.json') else set()
ids=[k for k,v in db.items() if k not in seen and (not flt or any(f in v['q'] for f in flt))]
def get(k):
    p=T+k+'.jpg'
    if os.path.exists(p): return
    for t in range(3):
        try:
            open(p,'wb').write(urllib.request.urlopen(urllib.request.Request(f"https://api.openverse.org/v1/images/{k}/thumb/",headers={"User-Agent":"design-client/1.0"}),timeout=40).read()); return
        except Exception as e: time.sleep(5)
with ThreadPoolExecutor(4) as ex: list(ex.map(get,ids))
font=ImageFont.load_default(size=18)
W,H=300,220
for s in range(0,len(ids),20):
    sh=Image.new('RGB',(W*5,(H+24)*4),'white'); d=ImageDraw.Draw(sh)
    for i,k in enumerate(ids[s:s+20]):
        try: im=Image.open(T+k+'.jpg').convert('RGB')
        except: continue
        im.thumbnail((W-6,H-6)); x=(i%5)*W; y=(i//5)*(H+24)
        sh.paste(im,(x+3,y+3)); d.text((x+4,y+H),k[:4]+' '+db[k]['title'][:20],fill='black',font=font)
    sh.save(f'{T}{pre}_{s//20}.jpg',quality=80)
seen|=set(ids); json.dump(sorted(seen),open('cache/seen.json','w'))
print(len(ids), (len(ids)+19)//20)
