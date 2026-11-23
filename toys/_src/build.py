# usage: python3 build.py decorA [screens...] -> writes html pages, prints paths
import sys, importlib
from lib import page
key=sys.argv[1]; screens=sys.argv[2:] or ['home','menu','listing','product']
modes=['light','dark']
if screens and screens[-1] in modes: modes=[screens.pop()]
m=importlib.import_module('tpl_'+key)
typ,tpl=key[:-1],key[-1]
out=[]
for s in screens:
    body=m.SCREENS[s]()
    for mode in modes:
        fn=f'{typ}-{tpl}-{s}-{mode}.html'
        open(fn,'w').write(page(f'{m.TITLE} — {s}', m.FONT, m.CSS, body, dark=(mode=='dark')))
        out.append(fn)
print(' '.join(out))
