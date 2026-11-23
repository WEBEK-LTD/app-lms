import urllib.request,re,os,sys,hashlib
out="/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/designs/pilot/_src/fonts"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
icons=sorted(set("""search tune photo_camera center_focus_weak notifications shopping_bag favorite add home storefront grid_view receipt_long person chevron_left chevron_right arrow_back arrow_forward bolt timer star straighten check_circle verified view_in_ar chair bed weekend light table_restaurant local_shipping workspace_premium redeem spa face water_drop palette brush auto_awesome wb_sunny dark_mode schedule history local_fire_department percent eco sell loyalty diamond checkroom styler package_2 inventory_2 close check bookmark share qr_code_scanner apps category desk floor_lamp chair_alt king_bed living kitchen yard texture format_paint 3d_rotation touch_app crop_free location_on keyboard_arrow_down star_half favorite_border card_giftcard lock award_star stars trending_up new_releases replay undo autorenew straighten sunny water_full face_retouching_natural self_care sanitizer colorize opacity science magic_button deployed_code""".split()))
fams={
 "plex":"https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=block",
 "readex":"https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=block",
 "alexandria":"https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700&display=block",
 "icons":"https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0&icon_names="+",".join(icons)+"&display=block",
}
for k,u in fams.items():
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
