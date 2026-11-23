import json,os,sys
from PIL import Image,ImageDraw,ImageFont
db=json.load(open('cache/el.json'))
order=[]
for k,v in db.items():
    if os.path.exists(f'tmp/th/{k[:6]}.jpg'): order.append((v['q'],k[:6]))
order.sort(key=lambda x:list(dict.fromkeys(v['q'] for v in db.values())).index(x[0]))
C,R,W,H=5,5,200,150
f=ImageFont.load_default(size=16) if hasattr(ImageFont,'load_default') else None
os.makedirs('tmp/sh',exist_ok=True)
for s in range(0,len(order),C*R):
    im=Image.new('RGB',(C*W,R*(H+20)),'white'); d=ImageDraw.Draw(im)
    for i,(q,k) in enumerate(order[s:s+C*R]):
        t=Image.open(f'tmp/th/{k}.jpg').convert('RGB'); t.thumbnail((W-4,H-4))
        x=(i%C)*W; y=(i//C)*(H+20)
        im.paste(t,(x+2,y+2)); d.text((x+3,y+H+1),k+' '+q[:14],fill='black',font=f)
    im.save(f'tmp/sh/s{s//(C*R):02d}.jpg',quality=80)
print(len(order))
