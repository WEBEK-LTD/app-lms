import urllib.request,re,os,hashlib
out=os.path.join(os.path.dirname(os.path.abspath(__file__)),"fonts")
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
fams={
 "almarai":"family=Almarai:wght@300;400;700;800",
 "messiri":"family=El+Messiri:wght@400;500;600;700",
 "rubik":"family=Rubik:wght@300;400;500;600;700",
 "baloo":"family=Baloo+Bhaijaan+2:wght@400;500;600;700;800",
 "cairo":"family=Cairo:wght@300;400;500;600;700",
 "playpen":"family=Playpen+Sans+Arabic:wght@300;400;500;600;700",
 "tajawal":"family=Tajawal:wght@300;400;500;700;800",
 "kufi":"family=Noto+Kufi+Arabic:wght@300;400;500;600;700",
 "icons2":"family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0",
}
for k,q in fams.items():
    u="https://fonts.googleapis.com/css2?"+q+"&display=block"
    try: css=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=60).read().decode()
    except Exception as e: print(k,"ERR",e); continue
    blocks=re.findall(r"(/\* ([\w-]+) \*/\s*@font-face\s*\{.*?\})",css,re.S)
    if not blocks: blocks=[(b,'all') for b in re.findall(r"@font-face\s*\{.*?\}",css,re.S)]
    keep=[b for b,s in blocks if s in ('arabic','latin','all','fallback')]
    css="\n".join(keep)
    def rep(m):
        url=m.group(1); fn=k+"_"+hashlib.md5(url.encode()).hexdigest()[:10]+".woff2"
        p=os.path.join(out,fn)
        if not os.path.exists(p):
            open(p,"wb").write(urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA}),timeout=120).read())
        return "url(%s)"%fn
    css=re.sub(r"url\((https://[^)]+)\)",rep,css)
    open(os.path.join(out,k+".css"),"w").write(css)
    print(k,len(keep))
