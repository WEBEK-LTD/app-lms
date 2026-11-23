import os
from PIL import Image,ImageEnhance,ImageFilter
src='img/raw'; out='img/k'; os.makedirs(out,exist_ok=True)
sat={'tiered-dress':.72,'summer-outfit':.75,'blocks':.8,'yellow-raincoat':.85,'striped-tights':.85,'school-boy':.8,'birthday-cake':.85}
for f in sorted(os.listdir(src)):
    n=f[:-4]; im=Image.open(f'{src}/{f}').convert('RGB')
    if n=='baby-shoes':
        box=(480,320,560,400); im.paste(im.crop(box).filter(ImageFilter.GaussianBlur(6)),box)
    im=ImageEnhance.Color(im).enhance(sat.get(n,.9))
    im=Image.blend(im,Image.new('RGB',im.size,(243,235,223)),.05)
    if max(im.size)>1100: im.thumbnail((1100,1100))
    im.save(f'{out}/{f}',quality=86)
print(len(os.listdir(out)))
