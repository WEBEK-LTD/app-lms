import sys
from PIL import Image
out, *parts = sys.argv[1:]
ims = [Image.open(p).convert('RGB') for p in parts]
w = 390
ims = [i.resize((w, int(i.height * w / i.width))) for i in ims]
c = Image.new('RGB', (w * len(ims) + 6 * (len(ims) - 1), ims[0].height), 'white')
for k, i in enumerate(ims): c.paste(i, (k * (w + 6), 0))
c.save(out)
import os
for p in parts: os.remove(p)
