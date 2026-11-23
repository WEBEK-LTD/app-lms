import sys,os
from PIL import Image,ImageDraw
d=sys.argv[1]; out=sys.argv[2]; fs=sorted(os.listdir(d)); W=3; S=400
for pi in range(0,len(fs),9):
    ch=fs[pi:pi+9]; im=Image.new('RGB',(W*S,((len(ch)+2)//3)*(S+18)),'white'); dr=ImageDraw.Draw(im)
    for i,f in enumerate(ch):
        t=Image.open(f'{d}/{f}').convert('RGB'); w,h=t.size; t.thumbnail((S,S)); x=(i%3)*S; y=(i//3)*(S+18)
        im.paste(t,(x+(S-t.width)//2,y+(S-t.height)//2)); dr.text((x+4,y+S+3),f'{f} {w}x{h}',fill='black')
    im.save(f'{out}_{pi//9}.jpg',quality=80); print(f'{out}_{pi//9}.jpg')
