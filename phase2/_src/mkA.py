css=open('pilot_decor_css.txt').read()
import re
for pat in [r":root\{.*?\}\n", r"\*\{box-sizing.*?\n", r"i,em\{.*?\n", r"html,body\{.*?\n", r"body\{.*?\n", r"\.ms\{.*?\n", r"\.fill\{.*?\n", r"\.screen\{.*?\n", r"\.hscroll\{.*?\n", r"\.status[ .{].*?\n", r"\.homeind\{.*?\n"]:
    css=re.sub("(?m)^"+pat,"",css,flags=re.S)
exec(open('mkA_rep.py').read())
for a,b in rep:
    assert a in css, a[:50]
    css=css.replace(a,b)
open('decorA_base.css','w').write(css)
print(len(css))
