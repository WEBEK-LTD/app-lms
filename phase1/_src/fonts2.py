import urllib.request,re,os,hashlib
out=os.path.join(os.path.dirname(os.path.abspath(__file__)),"fonts")
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
icons=sorted(set("""search tune photo_camera center_focus_weak notifications shopping_bag favorite add remove home storefront grid_view receipt_long person chevron_left chevron_right arrow_back arrow_forward bolt timer star straighten check_circle verified local_shipping workspace_premium redeem spa face water_drop palette brush auto_awesome wb_sunny dark_mode schedule history local_fire_department percent eco sell loyalty diamond checkroom styler package_2 inventory_2 close check bookmark share qr_code_scanner apps category texture touch_app location_on keyboard_arrow_down keyboard_arrow_up star_half card_giftcard lock award_star stars trending_up new_releases replay undo autorenew sunny water_full face_retouching_natural self_care sanitizer colorize opacity science magic_button menu segment menu_open language support_agent call chat mail help settings logout swap_vert sort filter_list filter_alt expand_more expand_less view_agenda view_module grid_on more_horiz more_vert local_laundry_service dry_cleaning iron wash thermostat height width child_care child_friendly baby_changing_station toys stroller crib cake celebration featured_seasonal_and_gifts nest_eco_leaf health_and_safety shield verified_user eco science biotech experiment labs clinical_notes medication_liquid water humidity_percent humidity_high humidity_low light_mode routine schedule event calendar_month thumb_up photo_library image play_circle play_arrow videocam zoom_in fullscreen 360 visibility rule fact_check info error help_outline pin_drop store payments credit_card account_balance_wallet assignment_return local_offer confirmation_number new_label label sell bookmarks favorite_border shopping_cart add_shopping_cart remove_shopping_cart shopping_basket emoji_nature psychiatry potted_plant compost grass forest local_florist filter_vintage spa bubble_chart blur_on gradient invert_colors format_color_fill brush stylus edit draw ink_pen boy girl man woman wc person_outline group family_restroom diversity_1 sentiment_satisfied mood face_2 face_3 face_4 face_5 face_6 straighten design_services content_cut dry steam lens radio_button_checked radio_button_unchecked check_box tag sync rotate_right north_west arrow_outward arrow_insert east west north south trending_flat bolt flash_on flare wb_twilight nights_stay bedtime pets wc swipe pan_tool ar_on_you view_in_ar camera hourglass_top hourglass_empty local_mall block bathtub bed shower soap clean_hands cruelty_free recycling dermatology allergies apparel steps footprint glass_cup temp_preferences_custom thermometer heat chevron_right arrow_left arrow_right add_circle do_not_disturb_on cleaning_services wash local_drink grain grid_3x3 view_carousel view_list view_day package eco_leaf""".split()))
fams={
 "changa":"https://fonts.googleapis.com/css2?family=Changa:wght@300;400;500;600;700&display=block",
 "baloo":"https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=block",
 "tajawal":"https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=block",
 "kufi":"https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;600;700&display=block",
 "rubik":"https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=block",
 "icons":"https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0&icon_names="+",".join(icons)+"&display=block",
}
for k,u in fams.items():
    try:
        css=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=60).read().decode()
    except Exception as e:
        print(k,"ERR",e); continue
    def rep(m):
        url=m.group(1); fn=k+"_"+hashlib.md5(url.encode()).hexdigest()[:10]+".woff2"
        p=os.path.join(out,fn)
        if not os.path.exists(p):
            open(p,"wb").write(urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA}),timeout=60).read())
        return "url(%s)"%fn
    css=re.sub(r"url\((https://[^)]+)\)",rep,css)
    open(os.path.join(out,k+".css"),"w").write(css)
    print(k,len(css))
