import json,sys,os,urllib.request,time
from concurrent.futures import ThreadPoolExecutor
db=json.load(open(sys.argv[1])); d='/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/kthumbs'; os.makedirs(d,exist_ok=True)
def get(k):
    p=f'{d}/{k}.jpg'
    if os.path.exists(p): return
    for a in range(4):
        try:
            open(p,'wb').write(urllib.request.urlopen(urllib.request.Request(f"https://api.openverse.org/v1/images/{k}/thumb/",headers={"User-Agent":"design-client/1.0"}),timeout=40).read()); return
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(20*(a+1))
            else: return
        except Exception: time.sleep(3)
with ThreadPoolExecutor(4) as ex: list(ex.map(get,list(db)))
print(len(os.listdir(d)))
