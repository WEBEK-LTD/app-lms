import urllib.request,re,os,sys,hashlib
out=os.path.join(os.path.dirname(os.path.abspath(__file__)),"fonts")
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
icons=sorted(set(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"icons.txt")).read().split()))
fams={
 "almarai":"https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=block",
 "kufi":"https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;600;700&display=block",
 "icons":"https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0&icon_names="+",".join(icons)+"&display=block",
}
only=sys.argv[1:] or list(fams)
for k in only:
    u=fams[k]
    css=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=60).read().decode()
    def rep(m):
        url=m.group(1); fn=k+"_"+hashlib.md5(url.encode()).hexdigest()[:10]+".woff2"
        p=os.path.join(out,fn)
        if not os.path.exists(p):
            open(p,"wb").write(urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA}),timeout=60).read())
        return "url(%s)"%fn
    css=re.sub(r"url\((https://[^)]+)\)",rep,css)
    open(os.path.join(out,k+".css"),"w").write(css)
    print(k,len(css))
