# usage: python3 build.py A|B [screens...] [light|dark]
import sys, importlib
from lib import page
key=sys.argv[1]; screens=sys.argv[2:]
modes=['light','dark']
if screens and screens[-1] in modes: modes=[screens.pop()]
screens=screens or ['home','menu','listing','product']
m=importlib.import_module('tpl'+key)
out=[]
for s in screens:
    body=m.SCREENS[s]()
    for mode in modes:
        fn=f'beauty-{key}-{s}-{mode}.html'
        open(fn,'w').write(page(f'{m.TITLE} — {s}', m.FONT, m.CSS, body, dark=(mode=='dark'), base=getattr(m,'BASE',False)))
        out.append(fn)
print(' '.join(out))
