from lib import STATUS, ic, ph, stars

FONT = "almarai"
TITLE = "Rukn"
CUR = "ر.س"
D = "decor/"

CSS = """
:root{--bg:#FFFFFF;--soft:#F5F3EF;--soft2:#ECE8E1;--ink:#1B1B1A;--ink2:#5D5B56;--ink3:#86837C;--line:#ECE9E4;
--oak:#8E643C;--oakSoft:#F4EDE4;--btn:#1B1B1A;--btnT:#FFFFFF;--tile:#F2F0EC;--tab:rgba(255,255,255,.84);--sale:#A4472F}
html.dark{--bg:#111110;--soft:#1C1B19;--soft2:#282724;--ink:#F3F1EC;--ink2:#B7B3AB;--ink3:#8E8B83;--line:#2A2926;
--oak:#D4AA7A;--oakSoft:#2A231B;--btn:#F3F1EC;--btnT:#111110;--tile:#ECE9E3;--tab:rgba(30,29,27,.86);--sale:#E08A6E}
body{font-family:'Almarai',sans-serif}
.screen{padding-bottom:116px}
.hd{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 18px}
.wm{display:flex;align-items:baseline;gap:8px}
.wm b{font-size:25px;font-weight:800;letter-spacing:-.01em}
.wm b i{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--oak);margin-right:3px}
.wm small{font-size:10px;letter-spacing:.38em;color:var(--ink3);direction:ltr}
.hi{display:flex;gap:16px;align-items:center}
.hi .ms{font-size:25px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24;position:relative}
.hi .dotn{position:relative}
.hi .dotn:after{content:'';position:absolute;top:1px;left:1px;width:8px;height:8px;border-radius:50%;background:var(--oak);box-shadow:0 0 0 2px var(--bg)}
.sbar{margin:6px 18px 0;height:48px;border-radius:24px;background:var(--soft);display:flex;align-items:center;gap:10px;padding:0 16px}
.sbar .ms{font-size:22px;color:var(--ink2);font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.sbar .t{flex:1;font-size:13px;color:var(--ink3)}
.sbar .vs{width:34px;height:34px;border-radius:17px;background:var(--bg);display:grid;place-items:center;margin-left:-8px}
.sbar .vs .ms{font-size:19px;color:var(--ink)}
.avs{margin-top:20px;gap:14px;padding:0 18px}
.av{width:66px;text-align:center}
.av i{display:block;width:66px;height:66px;border-radius:50%;background-color:var(--tile)}
.av.on i{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--ink)}
.av span{display:block;font-size:11.5px;margin-top:8px;color:var(--ink2)}
.av.on span{color:var(--ink);font-weight:700}
.hero{margin-top:22px;gap:10px;padding:0 18px}
.hc{width:330px;height:224px;border-radius:22px;position:relative;overflow:hidden;background-color:var(--tile)}
.hc .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(17,17,16,.7) 0%,rgba(17,17,16,.25) 42%,rgba(17,17,16,0) 62%)}
.hc .lb{position:absolute;top:14px;right:14px;height:26px;padding:0 10px;border-radius:13px;background:rgba(17,17,16,.42);backdrop-filter:blur(10px);color:#fff;font-size:10.5px;display:flex;align-items:center;gap:5px}
.hc .tx{position:absolute;right:18px;left:18px;bottom:16px;color:#fff;display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.hc h2{font-size:21px;font-weight:800;line-height:1.35}
.hc p{font-size:11.5px;opacity:.88;margin-top:4px}
.hc .go{flex:0 0 auto;height:38px;padding:0 14px;border-radius:19px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.5);backdrop-filter:blur(10px);display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700}
.hc .go .ms{font-size:17px}
.ind{display:flex;gap:4px;margin:12px 18px 0}
.ind i{width:16px;height:2.5px;border-radius:2px;background:var(--soft2)}
.ind i.on{width:32px;background:var(--ink)}
.sec{margin-top:34px}
.sh{display:flex;align-items:flex-end;justify-content:space-between;padding:0 18px;margin-bottom:14px}
.sh h3{font-size:19px;font-weight:800;letter-spacing:-.01em}
.sh .sub{font-size:12px;color:var(--ink3);margin-top:5px}
.sh a{font-size:12px;color:var(--ink);font-weight:700;border-bottom:1.5px solid var(--oak);padding-bottom:2px}
.coll{margin:0 18px;display:grid;grid-template-columns:1.15fr 1fr;gap:10px}
.cl{border-radius:18px;position:relative;overflow:hidden;background-color:var(--tile);height:128px}
.cl.tall{grid-row:span 2;height:266px}
.cl .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(17,17,16,.62),rgba(17,17,16,0) 55%)}
.cl b{position:absolute;right:12px;bottom:12px;left:12px;color:#fff;font-size:14px;font-weight:700}
.cl b small{display:block;font-size:10.5px;font-weight:400;opacity:.85;margin-top:3px}
.rank{margin:0 18px}
.rk{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)}
.rk:last-child{border:0}
.rk .n{font-size:22px;font-weight:300;color:var(--oak);width:26px;direction:ltr;text-align:center}
.rk .im{width:74px;height:74px;border-radius:14px;background-color:var(--tile);flex:0 0 auto}
.rk .t{flex:1;min-width:0}
.rk .t b{display:block;font-size:13.5px;font-weight:700}
.rk .t small{display:block;font-size:11px;color:var(--ink3);margin-top:4px}
.rk .t span{display:block;font-size:14px;font-weight:800;margin-top:7px}
.rk .t span small{display:inline;font-size:10.5px;font-weight:400;color:var(--ink2);margin:0}
.plus{width:34px;height:34px;border-radius:17px;background:var(--btn);color:var(--btnT);display:grid;place-items:center;flex:0 0 auto}
.plus .ms{font-size:20px}
.pc{width:150px}
.pc .im{height:170px;border-radius:16px;background-color:var(--tile);position:relative}
.pc .im .hrt{position:absolute;top:8px;left:8px;width:30px;height:30px;border-radius:15px;background:rgba(255,255,255,.9);display:grid;place-items:center;color:#1B1B1A}
.pc .im .hrt .ms{font-size:17px}
.pc .im .hrt.on .ms{color:#A4472F;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.pc .im .bdg{position:absolute;top:9px;right:9px;font-size:10px;font-weight:700;padding:4px 8px;border-radius:10px;background:rgba(255,255,255,.92);color:#1B1B1A}
.pc .im .bdg.s{background:#A4472F;color:#fff;direction:ltr}
.pc .im .plus{position:absolute;bottom:8px;left:8px;width:32px;height:32px;background:#1B1B1A;color:#fff}
.pc .nm{font-size:13px;font-weight:700;margin-top:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .mt{font-size:11px;color:var(--ink3);margin-top:4px}
.pc .pr{display:flex;align-items:baseline;gap:6px;margin-top:7px;font-size:14px;font-weight:800}
.pc .pr small{font-size:10.5px;font-weight:400;color:var(--ink2)}
.pc .pr s{font-size:11px;color:var(--ink3);font-weight:400}
.pc .pr.sale{color:var(--sale)}
.pc .dots2{display:flex;gap:4px;margin-top:7px}
.pc .dots2 i{width:10px;height:10px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.prow{gap:12px;padding:0 18px}
.story{margin:0 18px;border-radius:24px;background:var(--oakSoft);overflow:hidden}
.story .si{height:140px;background-color:var(--tile)}
.story .sb{padding:16px}
.story .sb small{font-size:11px;color:var(--oak);font-weight:700;letter-spacing:.02em}
.story .sb h4{font-size:18px;font-weight:800;line-height:1.45;margin-top:6px}
.story .sb p{font-size:12px;color:var(--ink2);line-height:1.8;margin-top:6px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.stats div{background:var(--bg);border-radius:14px;padding:10px;text-align:center}
.stats b{display:block;font-size:17px;font-weight:800}
.stats span{display:block;font-size:10px;color:var(--ink2);margin-top:3px;line-height:1.4}
.look{margin:0 18px}
.look .li{height:250px;border-radius:22px;background-color:var(--tile);position:relative}
.hs{position:absolute;width:26px;height:26px;border-radius:13px;background:rgba(255,255,255,.4);display:grid;place-items:center;backdrop-filter:blur(4px)}
.hs:after{content:'';width:12px;height:12px;border-radius:6px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.hs.on{background:rgba(255,255,255,.6)}
.tip{position:absolute;background:#fff;color:#1B1B1A;border-radius:12px;padding:7px 10px;font-size:11px;box-shadow:0 8px 20px rgba(0,0,0,.18);white-space:nowrap}
.tip b{display:block;font-size:11.5px;font-weight:700}
.tip span{font-weight:800}
.looklist{display:flex;gap:8px;margin-top:10px}
.lk{flex:1;display:flex;align-items:center;gap:8px;background:var(--soft);border-radius:14px;padding:6px}
.lk i{width:42px;height:42px;border-radius:10px;background-color:var(--tile);flex:0 0 auto}
.lk b{display:block;font-size:11px;font-weight:700}
.lk small{display:block;font-size:11px;color:var(--ink2);margin-top:2px}
.lookbtn{margin-top:10px;height:46px;border-radius:23px;background:var(--btn);color:var(--btnT);display:flex;align-items:center;justify-content:center;gap:7px;font-size:13px;font-weight:700}
.lookbtn .ms{font-size:19px}
.consult{margin:0 18px;border-radius:24px;border:1px solid var(--line);padding:16px}
.consult .ct{display:flex;gap:12px;align-items:center}
.consult .ct i{width:52px;height:52px;border-radius:26px;background-color:var(--tile);flex:0 0 auto}
.consult h4{font-size:15.5px;font-weight:800}
.consult p{font-size:11.5px;color:var(--ink2);margin-top:4px}
.slots{display:flex;gap:8px;margin-top:14px}
.slots div{flex:1;border-radius:14px;background:var(--soft);padding:9px 0;text-align:center;font-size:11px;color:var(--ink2)}
.slots div b{display:block;font-size:13px;color:var(--ink);font-weight:700;margin-top:3px}
.slots div.on{background:var(--btn);color:var(--btnT)}
.slots div.on b{color:var(--btnT)}
.grid2{margin:0 18px;display:grid;grid-template-columns:1fr 1fr;gap:20px 12px}
.grid2 .pc{width:auto}
.grid2 .pc .im{height:196px}
.jr{width:250px}
.jr .im{height:150px;border-radius:18px;background-color:var(--tile)}
.jr small{display:block;font-size:10.5px;color:var(--oak);font-weight:700;margin-top:10px}
.jr b{display:block;font-size:14px;font-weight:700;line-height:1.5;margin-top:4px}
.jr span{display:block;font-size:11px;color:var(--ink3);margin-top:4px}
.perks{margin:30px 18px 0;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px 0}
.perks div{text-align:center;font-size:10.5px;color:var(--ink2);line-height:1.5}
.perks div+div{border-right:1px solid var(--line)}
.perks .ms{display:block;margin:0 auto 6px;font-size:23px;color:var(--ink);font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.tabbar{position:absolute;left:18px;right:18px;bottom:26px;height:66px;border-radius:33px;background:var(--tab);backdrop-filter:blur(22px) saturate(1.5);box-shadow:0 0 0 1px var(--line),0 12px 30px rgba(0,0,0,.08);display:grid;grid-template-columns:repeat(5,1fr);align-items:center}
html.dark .tabbar{box-shadow:0 0 0 1px rgba(255,255,255,.07),0 12px 30px rgba(0,0,0,.5)}
.tab{display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--ink3);position:relative}
.tab .ms{font-size:24px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.tab span:not(.ms){font-size:10px}
.tab.on{color:var(--ink)}
.tab.on span:not(.ms){font-weight:700}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tab .bd{position:absolute;top:-4px;left:50%;margin-left:-22px;min-width:17px;height:17px;border-radius:9px;background:var(--oak);color:#fff;font-size:9.5px;font-weight:700;display:grid;place-items:center;padding:0 4px}
html.dark .tab .bd{color:#111110}

/* MENU */
.mtop{display:flex;align-items:center;justify-content:space-between;padding:4px 18px 0;height:56px}
.xbtn{width:40px;height:40px;border-radius:20px;background:var(--soft);display:grid;place-items:center}
.xbtn .ms{font-size:22px}
.segm{display:flex;margin:16px 18px 0;background:var(--soft);border-radius:22px;padding:4px}
.segm div{flex:1;height:36px;border-radius:18px;display:grid;place-items:center;font-size:12.5px;color:var(--ink2)}
.segm div.on{background:var(--bg);color:var(--ink);font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.08)}
html.dark .segm div.on{background:var(--soft2)}
.mc{margin-top:26px}
.mc .mh{display:flex;align-items:baseline;justify-content:space-between;padding:0 18px;margin-bottom:12px}
.mc .mh b{font-size:17px;font-weight:800}
.mc .mh b small{font-size:11.5px;font-weight:400;color:var(--ink3);margin-right:6px}
.mc .mh a{font-size:11.5px;font-weight:700;display:flex;align-items:center;gap:2px}
.mc .mh a .ms{font-size:16px}
.mrow{gap:10px;padding:0 18px}
.mt{width:104px}
.mt i{display:block;width:104px;height:104px;border-radius:16px;background-color:var(--tile)}
.mt span{display:block;font-size:12px;margin-top:8px;font-weight:700}
.mt small{display:block;font-size:10.5px;color:var(--ink3);margin-top:3px}
.mt.feat i{position:relative;background:var(--oakSoft);display:grid;place-items:center}
.mt.feat i .ms{font-size:34px;color:var(--oak);font-variation-settings:'FILL' 0,'wght' 250,'GRAD' 0,'opsz' 40}
.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:32px 18px 0}
.mg{border-radius:18px;background:var(--soft);padding:14px;display:flex;flex-direction:column;gap:12px}
.mg .ms{font-size:24px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.mg b{display:block;font-size:13px;font-weight:700}
.mg small{display:block;font-size:11px;color:var(--ink3);margin-top:3px}
.mrows{margin:10px 18px 0;border-radius:18px;background:var(--soft);padding:0 14px}
.mr{display:flex;align-items:center;gap:12px;height:54px}
.mr+.mr{border-top:1px solid var(--line)}
.mr .ms{font-size:22px;color:var(--ink2);font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.mr span.t{flex:1;font-size:13px}
.mr small{font-size:11.5px;color:var(--ink3)}
.tog{display:flex;border:1px solid var(--line);border-radius:16px;padding:2px;background:var(--bg)}
.tog i{font-size:11px;padding:5px 11px;border-radius:13px;color:var(--ink2)}
.tog i.on{background:var(--btn);color:var(--btnT);font-weight:700}

/* LISTING */
.nav{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 14px}
.nav .ms{font-size:25px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.nav .rr{display:flex;gap:18px;position:relative}
.nav .cnt{position:absolute;top:-5px;left:-7px;min-width:17px;height:17px;border-radius:9px;background:var(--oak);color:#fff;font-size:9.5px;font-weight:700;display:grid;place-items:center;padding:0 4px}
html.dark .nav .cnt{color:#111110}
.lt{padding:6px 18px 0}
.lt h1{font-size:30px;font-weight:800;letter-spacing:-.02em}
.lt p{font-size:12px;color:var(--ink3);margin-top:6px}
.ichips{margin-top:16px;gap:8px;padding:0 18px}
.ichip{height:44px;border-radius:22px;border:1px solid var(--line);display:flex;align-items:center;gap:8px;padding:0 14px 0 5px;font-size:12px;white-space:nowrap}
.ichip i{width:34px;height:34px;border-radius:17px;background-color:var(--tile)}
.ichip.on{background:var(--btn);color:var(--btnT);border-color:var(--btn);font-weight:700}
.ichip.txt{padding:0 16px}
.fl{display:flex;gap:8px;margin:16px 18px 0}
.fc{height:38px;border-radius:19px;background:var(--soft);display:flex;align-items:center;gap:5px;padding:0 13px;font-size:12px;white-space:nowrap}
.fc .ms{font-size:18px}
.fc b{min-width:17px;height:17px;border-radius:9px;background:var(--oak);color:#fff;font-size:9.5px;display:grid;place-items:center}
html.dark .fc b{color:#111110}
.fc.last{margin-right:auto;padding:0 11px}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin:12px 18px 0;align-items:center}
.tg{height:28px;border-radius:14px;border:1px solid var(--ink);display:flex;align-items:center;gap:3px;padding:0 6px 0 11px;font-size:11px;font-weight:700}
.tg .ms{font-size:15px}
.tags a{font-size:11px;color:var(--ink3);margin-right:4px}
.res{margin:18px 18px 12px;display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink3)}
.res b{color:var(--ink)}
.promo{grid-column:1/-1;border-radius:22px;background:var(--oakSoft);display:flex;overflow:hidden;height:150px}
.promo .pt{flex:1;padding:16px;display:flex;flex-direction:column}
.promo .pt small{font-size:10.5px;color:var(--oak);font-weight:700}
.promo .pt b{font-size:16px;font-weight:800;line-height:1.45;margin-top:6px}
.promo .pt span{margin-top:auto;align-self:flex-start;font-size:12px;font-weight:700;border-bottom:1.5px solid var(--oak);padding-bottom:2px;display:flex;align-items:center;gap:3px}
.promo .pt span .ms{font-size:16px}
.promo .pi{width:150px;background-color:var(--tile)}
.lm{margin:28px 18px 0;text-align:center}
.lm p{font-size:11.5px;color:var(--ink3)}
.lm .bar{height:2px;background:var(--soft2);margin:10px 60px 0;border-radius:2px}
.lm .bar i{display:block;width:20%;height:100%;background:var(--ink)}
.lm .b{margin:16px auto 0;height:48px;border-radius:24px;border:1.5px solid var(--ink);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:700;width:220px}

/* PRODUCT */
.gal{height:440px;background-color:var(--tile);position:relative;border-radius:0 0 30px 30px;overflow:hidden}
.gal .gn{position:absolute;top:54px;left:14px;right:14px;display:flex;justify-content:space-between}
.gb{width:42px;height:42px;border-radius:21px;background:rgba(255,255,255,.92);display:grid;place-items:center;color:#1B1B1A;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.gb .ms{font-size:21px}
.gal .gr{display:flex;gap:8px}
.gal .gi{position:absolute;bottom:16px;left:0;right:0;display:flex;justify-content:center;gap:4px}
.gal .gi i{width:16px;height:2.5px;border-radius:2px;background:rgba(27,27,26,.25)}
.gal .gi i.on{width:30px;background:#1B1B1A}
.th{display:flex;gap:8px;margin:12px 18px 0}
.th div{width:60px;height:60px;border-radius:14px;background-color:var(--tile)}
.th div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--ink)}
.th .ar{margin-right:auto;width:auto;white-space:nowrap;padding:0 14px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;background:var(--soft);border-radius:30px}
.th .ar .ms{font-size:19px}
.pi2{padding:20px 18px 0}
.pi2 .cat{font-size:11.5px;color:var(--oak);font-weight:700;display:flex;justify-content:space-between}
.pi2 .cat span{color:var(--ink3);font-weight:400}
.pi2 h1{font-size:25px;font-weight:800;margin-top:8px;letter-spacing:-.01em}
.pi2 .ds{font-size:12.5px;color:var(--ink2);margin-top:6px;line-height:1.7}
.pp{display:flex;align-items:center;gap:10px;margin-top:14px}
.pp b{font-size:25px;font-weight:800}
.pp b small{font-size:12px;font-weight:400;color:var(--ink2)}
.pp s{font-size:13px;color:var(--ink3)}
.pp .off{font-size:11px;font-weight:700;color:#fff;background:#A4472F;border-radius:10px;padding:3px 8px;direction:ltr}
.pp .rt{margin-right:auto;display:flex;align-items:center;gap:3px;font-size:13px;font-weight:700}
.pp .rt .ms{font-size:17px;color:var(--oak)}
.pp .rt small{font-weight:400;color:var(--ink3);font-size:11.5px}
.opt{margin:22px 18px 0;padding-top:18px;border-top:1px solid var(--line)}
.opt .oh{display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:12px}
.opt .oh span{font-weight:400;color:var(--ink2)}
.opt .oh a{font-size:11.5px;font-weight:400;color:var(--ink3);text-decoration:underline;text-underline-offset:3px}
.wood{display:flex;gap:14px}
.wood i{width:40px;height:40px;border-radius:20px;display:block}
.wood .on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--ink)}
.pills{display:flex;gap:8px}
.pills div{flex:1;height:50px;border-radius:25px;border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12.5px}
.pills div small{font-size:10px;color:var(--oak);margin-top:2px;font-weight:700}
.pills div.on{border:1.5px solid var(--ink);font-weight:700}
.blk{margin:12px 18px 0;border-radius:24px;background:var(--soft);padding:18px}
.blk h4{font-size:16px;font-weight:800;display:flex;justify-content:space-between;align-items:center}
.blk h4 small{font-size:11px;font-weight:400;color:var(--ink3)}
.dims{display:flex;gap:12px;margin-top:14px;align-items:stretch}
.dfig{flex:0 0 136px;border-radius:16px;background:var(--bg);display:grid;place-items:center;color:var(--ink2);padding:8px}
.dl2{flex:1;display:flex;flex-direction:column;justify-content:center}
.dl2 div{display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:var(--ink2);border-bottom:1px dashed var(--soft2)}
.dl2 div:last-child{border:0}
.dl2 b{color:var(--ink);font-weight:700}
.unit{display:flex;gap:4px;background:var(--bg);border-radius:12px;padding:3px}
.unit i{font-size:10.5px;padding:3px 8px;border-radius:9px;color:var(--ink3)}
.unit i.on{background:var(--btn);color:var(--btnT)}
.matl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
.mi{background:var(--bg);border-radius:16px;overflow:hidden}
.mi i{display:block;height:74px;background-color:var(--tile)}
.mi div{padding:10px}
.mi b{display:block;font-size:12.5px;font-weight:700}
.mi small{display:block;font-size:10.5px;color:var(--ink3);margin-top:3px;line-height:1.5}
.arb{margin:12px 18px 0;border-radius:24px;overflow:hidden;position:relative;height:190px;background-color:var(--tile)}
.arb .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(17,17,16,.72),rgba(17,17,16,.1) 70%)}
.arb .at{position:absolute;right:18px;top:18px;bottom:18px;width:190px;color:#fff;display:flex;flex-direction:column}
.arb .at small{font-size:10.5px;opacity:.85;display:flex;align-items:center;gap:4px}
.arb .at small .ms{font-size:15px}
.arb .at b{font-size:19px;font-weight:800;line-height:1.4;margin-top:6px}
.arb .at span{margin-top:auto;align-self:flex-start;height:38px;padding:0 14px;border-radius:19px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.5);backdrop-filter:blur(8px);display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700}
.arb .frame{position:absolute;left:36px;top:40px;width:86px;height:118px;border:1.5px solid rgba(255,255,255,.95);border-radius:12px}
.arb .frame:before,.arb .frame:after{content:'';position:absolute;width:10px;height:10px;border-radius:5px;background:#fff}
.arb .frame:before{top:-5px;right:-5px}.arb .frame:after{bottom:-5px;left:-5px}
.arb .mz{position:absolute;left:46px;top:16px;font-size:10px;color:#fff;background:rgba(17,17,16,.5);padding:3px 7px;border-radius:7px;direction:ltr}
.carel{margin-top:10px}
.carel>div{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--soft2)}
.carel>div:last-child{border:0;padding-bottom:0}
.carel .ms{font-size:21px;color:var(--oak);font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.carel b{display:block;font-size:12.5px;font-weight:700}
.carel small{display:block;font-size:11px;color:var(--ink2);margin-top:3px;line-height:1.6}
.ship{margin:12px 18px 0;border-radius:24px;border:1px solid var(--line);padding:4px 16px}
.ship>div{display:flex;align-items:center;gap:12px;padding:12px 0}
.ship>div+div{border-top:1px solid var(--line)}
.ship .ms{font-size:23px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.ship b{display:block;font-size:12.5px;font-weight:700}
.ship small{display:block;font-size:11px;color:var(--ink2);margin-top:3px}
.ship .ch{margin-right:auto;font-size:11px;font-weight:700;border-bottom:1.5px solid var(--oak)}
.accs{margin:20px 18px 0}
.ac{display:flex;justify-content:space-between;align-items:center;height:56px;border-bottom:1px solid var(--line);font-size:14px;font-weight:700}
.ac .ms{font-size:21px;color:var(--ink3)}
.acp{font-size:12.5px;color:var(--ink2);line-height:1.85;padding:12px 0 16px;border-bottom:1px solid var(--line)}
.rvs{margin:0 18px}
.rsum{display:flex;align-items:center;gap:18px}
.rsum .big b{font-size:44px;font-weight:800;line-height:1}
.rsum .big .stars{display:flex;margin-top:6px;color:var(--oak)}
.rsum .big .stars .ms{font-size:15px}
.rsum .big small{display:block;font-size:11px;color:var(--ink3);margin-top:4px}
.rsum .kv{flex:1;display:flex;flex-direction:column;gap:8px}
.rsum .kv div{display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink2)}
.rsum .kv div i{display:block;flex:0 0 96px;height:4px;border-radius:2px;background:var(--soft2);align-self:center;overflow:hidden}
.rsum .kv div i em{display:block;height:100%;background:var(--ink)}
.rph{gap:8px;margin-top:16px}
.rph>div{width:96px;height:110px;border-radius:14px;background-color:var(--tile);position:relative}
.rph>div span{position:absolute;bottom:6px;right:6px;font-size:9.5px;background:rgba(255,255,255,.9);color:#1B1B1A;border-radius:6px;padding:2px 6px;display:flex;align-items:center;gap:2px}
.rph>div span .ms{font-size:11px;color:#8E643C}
.rq{margin:14px 18px 0;border-radius:20px;background:var(--soft);padding:16px}
.rq .who{display:flex;align-items:center;gap:10px;font-size:12px}
.rq .who i{width:32px;height:32px;border-radius:16px;background:var(--oakSoft);color:var(--oak);display:grid;place-items:center;font-weight:800}
html.dark .rq .who i{background:var(--soft2)}
.rq .who b{display:block;font-weight:700}
.rq .who small{display:block;color:var(--ink3);font-size:10.5px;margin-top:2px}
.rq .who .stars{margin-right:auto;color:var(--oak);display:flex}
.rq .who .stars .ms{font-size:13px}
.rq p{font-size:12.5px;line-height:1.8;margin-top:10px}
.sticky{position:absolute;left:0;right:0;bottom:0;background:var(--tab);backdrop-filter:blur(20px);border-top:1px solid var(--line);padding:12px 18px 32px;display:flex;align-items:center;gap:14px}
.sticky .sp small{display:block;font-size:11px;color:var(--ink3)}
.sticky .sp b{display:block;font-size:20px;font-weight:800;margin-top:2px}
.sticky .sp b small{display:inline;font-size:11px;font-weight:400;color:var(--ink2)}
.sticky .cta{flex:1;height:54px;border-radius:27px;background:var(--btn);color:var(--btnT);display:flex;align-items:center;justify-content:center;gap:8px;font-size:14.5px;font-weight:700}
.sticky .cta .ms{font-size:21px}
.sticky .hv{width:54px;height:54px;border-radius:27px;border:1px solid var(--line);display:grid;place-items:center}
.sticky .hv .ms{font-size:23px}
"""


def pc(img, f, nm, mt, pr, old=None, bdg=None, fav=False, dots=None, cls=""):
    b = ''
    if bdg:
        b = f'<span class="bdg{" s" if bdg.startswith("-") else ""}">{bdg}</span>'
    d = ''
    if dots:
        d = '<div class="dots2">' + ''.join(f'<i style="background:{c}"></i>' for c in dots) + '</div>'
    sale = ' sale' if old else ''
    o = f'<s>{old}</s>' if old else ''
    inner = b + f'<span class="hrt{" on" if fav else ""}">{ic("favorite")}</span><span class="plus">{ic("add")}</span>'
    return f'<div class="pc {cls}">{ph(D + img, f, "im", inner)}<div class="nm">{nm}</div><div class="mt">{mt}</div><div class="pr{sale}">{pr} <small>{CUR}</small>{o}</div>{d}</div>'


def tabbar(a=0):
    t = [("home", "الرئيسية"), ("storefront", "المتجر"), ("shopping_bag", "السلة"), ("package_2", "طلباتي"), ("person", "حسابي")]
    s = ''.join(f'<div class="tab{" on" if i == a else ""}">{ic(n)}<span>{l}</span>{"<i class=bd>2</i>" if n == "shopping_bag" else ""}</div>' for i, (n, l) in enumerate(t))
    return f'<div class="tabbar">{s}</div><div class="homeind"></div>'


def home():
    return f'''<div class="screen">{STATUS}
<div class="hd"><div class="wm"><b>رُكن<i></i></b><small>RUKN</small></div><div class="hi"><span class="ms">favorite</span><span class="dotn">{ic("notifications")}</span>{ic("menu")}</div></div>
<div class="sbar">{ic("search")}<div class="t">كرسي بلوط، مصباح، سجاد…</div><div class="vs">{ic("photo_camera")}</div></div>
<div class="hscroll avs">
<div class="av on"><i data-src="img/{D}wishbone.jpg" data-f="0.48 0.62 3.0"></i><span>الكراسي</span></div>
<div class="av"><i data-src="img/{D}white-sofa.jpg" data-f="0.7 0.6 1.4"></i><span>الأرائك</span></div>
<div class="av"><i data-src="img/{D}floor-lamp-sage.jpg" data-f="0.72 0.32 2.4"></i><span>الإضاءة</span></div>
<div class="av"><i data-src="img/{D}twin-vases.jpg" data-f="0.48 0.55 2.0"></i><span>السيراميك</span></div>
<div class="av"><i data-src="img/{D}white-bedroom.jpg" data-f="0.5 0.6 1.6"></i><span>النوم</span></div>
<div class="av"><i data-src="img/{D}drawers.jpg" data-f="0.5 0.72 2.4"></i><span>التخزين</span></div></div>
<div class="hscroll hero">
{ph(D+"wishbone.jpg","0.5 0.66 1.0","hc",f'<div class="sc"></div><span class="lb">{ic("forest")}مجموعة البلوط · شتاء 2026</span><div class="tx"><div><h2>بساطة تدوم<br>لأجيال</h2><p>خشب بلوط صلب بتشطيب زيتي طبيعي</p></div><span class="go">اكتشف{ic("arrow_back")}</span></div>')}
{ph(D+"white-bedroom.jpg","0.5 0.5 1.0","hc",'<div class="sc"></div>')}
</div>
<div class="ind"><i class="on"></i><i></i><i></i><i></i></div>

<div class="sec"><div class="sh"><div><h3>مجموعات مختارة</h3><div class="sub">قطع صُمّمت لتعيش معاً</div></div><a>كل المجموعات</a></div>
<div class="coll">
{ph(D+"oak-bedroom.jpg","0.5 0.6 1.1","cl tall",'<div class="sc"></div><b>غرفة نوم «سكون»<small>بلوط فاتح · كتان</small></b>')}
{ph(D+"oak-dining.jpg","0.4 0.6 1.1","cl",'<div class="sc"></div><b>سفرة «مائدة»<small>12 قطعة</small></b>')}
{ph(D+"sage-jars.jpg","0.5 0.5 1.1","cl",'<div class="sc"></div><b>سيراميك «طين»<small>صناعة يدوية</small></b>')}
</div></div>

<div class="sec"><div class="sh"><div><h3>الأكثر مبيعاً هذا الأسبوع</h3></div><a>القائمة كاملة</a></div>
<div class="rank">
<div class="rk"><span class="n">01</span>{ph(D+"wishbone.jpg","0.48 0.62 3.2","im")}<div class="t"><b>كرسي «فيورد» من البلوط</b><small>حبل ورقي مجدول · 4.9 ★</small><span>1,290 <small>{CUR}</small></span></div><span class="plus">{ic("add")}</span></div>
<div class="rk"><span class="n">02</span>{ph(D+"floor-lamp-sage.jpg","0.72 0.35 2.0","im")}<div class="t"><b>مصباح أرضي «ضُحى»</b><small>فولاذ مطلي · 155 سم</small><span>640 <small>{CUR}</small></span></div><span class="plus">{ic("add")}</span></div>
<div class="rk"><span class="n">03</span>{ph(D+"twin-vases.jpg","0.48 0.55 1.7","im")}<div class="t"><b>زوج مزهريات «توأم»</b><small>بورسلين مطفي مع صينية بلوط</small><span>210 <small>{CUR}</small></span></div><span class="plus">{ic("add")}</span></div>
</div></div>

<div class="sec"><div class="sh"><div><h3>وصل حديثاً</h3></div><a>عرض الكل</a></div>
<div class="hscroll prow">
{pc("white-chair.jpg","0.5 0.55 1.5","كرسي «نُور» الأبيض","بولي بروبلين · أرجل زان","390",bdg="جديد",dots=["#F4F3EF","#1F1F1F","#B8C4B4"])}
{pc("drawers.jpg","0.52 0.68 1.9","خزانة أدراج «مِسك»","بلوط صلب · 6 أدراج","2,150",fav=True,dots=["#C99E6B"])}
{pc("white-jug.jpg","0.48 0.55 1.5","إبريق «غيمة» الخزفي","خزف مطفي · 1.2 لتر","135",dots=["#F2F0EB","#D9C7B0"])}
</div></div>

<div class="sec"><div class="story">{ph(D+"oak-dining.jpg","0.45 0.55 1.0","si")}
<div class="sb"><small>من الغابة إلى بيتك</small><h4>خشب بلوط أوروبي مُعتمد،<br>يُشطَّب يدوياً بزيت طبيعي</h4><p>كل قطعة في «رُكن» مصنوعة من خشب غابات مُدارة بمسؤولية، وتُختبر لتدوم عقوداً لا مواسم.</p>
<div class="stats"><div><b>10</b><span>سنوات ضمان على الهيكل</span></div><div><b>100%</b><span>خشب صلب بلا قشرة</span></div><div><b>FSC</b><span>مصدر خشب مُعتمد</span></div></div></div></div></div>

<div class="sec"><div class="sh"><div><h3>تسوّق الإطلالة</h3><div class="sub">ركن قراءة هادئ بأربع قطع</div></div><a>إطلالات أخرى</a></div>
<div class="look">{ph(D+"reading-chair.jpg","0.5 0.55 1.05","li",'<span class="hs on" style="top:132px;left:196px"></span><div class="tip" style="top:84px;left:150px"><b>كرسي «سُهى»</b><span>1,190 ر.س</span></div><span class="hs" style="top:150px;left:92px"></span><span class="hs" style="top:40px;left:290px"></span>')}
<div class="looklist"><div class="lk">{ph(D+"reading-chair.jpg","0.6 0.62 3.0","",tag="i")}<div><b>كرسي «سُهى»</b><small>1,190 {CUR}</small></div></div><div class="lk">{ph(D+"reading-chair.jpg","0.3 0.68 3.4","",tag="i")}<div><b>طاولة جانبية</b><small>280 {CUR}</small></div></div></div>
<div class="lookbtn">{ic("shopping_bag")}أضف الإطلالة · 1,650 {CUR}</div></div></div>

<div class="sec"><div class="consult"><div class="ct">{ph(D+"pottery-shelf.jpg","0.3 0.4 2.0","",tag="i")}<div><h4>استشارة تصميم مجانية</h4><p>30 دقيقة مع مصمّمة داخلية عبر الفيديو</p></div></div>
<div class="slots"><div>الأحد<b>4:00 م</b></div><div class="on">الاثنين<b>6:30 م</b></div><div>الثلاثاء<b>11:00 ص</b></div><div>{ic("calendar_month")}<b>المزيد</b></div></div></div></div>

<div class="sec"><div class="sh"><div><h3>قطع تدوم</h3><div class="sub">الأعلى تقييماً من عملائنا</div></div><a>عرض الكل</a></div>
<div class="grid2">
{pc("pendant-dining.jpg","0.5 0.3 1.6","مصباح معلّق «قمر»","ألمنيوم · 40 سم","890")}
{pc("blue-sofa.jpg","0.12 0.72 2.6","أريكة «بحر» المخملية","مخمل · 3 مقاعد","5,400","6,200",bdg="-13%")}
{pc("table-setting.jpg","0.52 0.68 1.6","طقم أطباق «حصاد»","خزف حجري · 12 قطعة","460")}
{pc("terrarium.jpg","0.5 0.55 1.4","حديقة زجاجية معلّقة","زجاج منفوخ · 20 سم","150",fav=True)}
</div></div>

<div class="perks"><div>{ic("local_shipping")}توصيل مجاني<br>فوق 1,000 {CUR}</div><div>{ic("handyman")}تركيب احترافي<br>في نفس اليوم</div><div>{ic("event_repeat")}إرجاع مجاني<br>خلال 100 يوم</div></div>
{tabbar(0)}
</div>'''


MENU = [
    ("الأثاث", "1,620", [("wishbone.jpg", "0.48 0.62 3.0", "كراسي", "214"), ("white-sofa.jpg", "0.7 0.62 1.4", "أرائك", "96"), ("oak-dining.jpg", "0.4 0.62 1.5", "طاولات طعام", "58"), ("drawers.jpg", "0.5 0.72 2.4", "خزائن", "84"), ("coffee-table.jpg", "0.45 0.6 1.6", "طاولات قهوة", "47")], "chair"),
    ("الإضاءة", "540", [("floor-lamp-sage.jpg", "0.72 0.35 2.4", "أرضية", "62"), ("pendant-dining.jpg", "0.5 0.25 3.0", "معلّقة", "71"), ("desk-lamp.jpg", "0.55 0.45 1.2", "مكتبية", "48"), ("pendant.jpg", "0.5 0.5 1.4", "سقفية", "39")], "light"),
    ("السيراميك والمطبخ", "780", [("twin-vases.jpg", "0.48 0.55 2.0", "مزهريات", "130"), ("table-setting.jpg", "0.52 0.66 1.7", "أطباق", "96"), ("white-jug.jpg", "0.48 0.55 1.6", "أباريق", "41"), ("white-shelf.jpg", "0.5 0.35 1.4", "أكواب", "88")], "coffee"),
    ("المنسوجات", "460", [("sofa-pillows.jpg", "0.5 0.62 2.4", "وسائد", "120"), ("white-bedroom.jpg", "0.55 0.75 1.8", "مفارش", "86"), ("rose-vase.jpg", "0.35 0.4 1.5", "بطانيات", "44"), ("reading-chair.jpg", "0.5 0.85 2.0", "سجاد", "52")], "texture"),
    ("النوم", "310", [("white-bedroom.jpg", "0.5 0.55 1.1", "أسرّة", "34"), ("oak-bedroom.jpg", "0.5 0.62 1.3", "طاولات سرير", "28"), ("ec-none", "", "", "")][:2] + [("window-vases.jpg", "0.5 0.6 1.3", "إكسسوارات", "66")], "bed"),
    ("النباتات", "190", [("aloe-basket.jpg", "0.5 0.5 1.2", "داخلية", "72"), ("terrarium.jpg", "0.5 0.55 1.6", "معلّقة", "21"), ("plant-glass.jpg", "0.45 0.62 1.8", "أصص", "58"), ("branch-vase.jpg", "0.5 0.4 1.4", "مجففة", "39")], "potted_plant"),
]


def menu():
    rows = ''
    for name, cnt, subs, icn in MENU:
        cards = f'<div class="mt feat"><i>{ic(icn)}</i><span>كل {name}</span><small>{cnt} قطعة</small></div>'
        for img, f, n, c in subs:
            cards += f'<div class="mt"><i data-src="img/{D}{img}" data-f="{f}"></i><span>{n}</span><small>{c} قطعة</small></div>'
        rows += f'<div class="mc"><div class="mh"><b>{name}<small>{cnt}</small></b><a>عرض الكل{ic("chevron_left")}</a></div><div class="hscroll mrow">{cards}</div></div>'
    return f'''<div class="screen" style="padding-bottom:44px">{STATUS}
<div class="mtop"><div class="wm"><b>رُكن<i></i></b><small>RUKN</small></div><div class="xbtn">{ic("close")}</div></div>
<div class="sbar">{ic("search")}<div class="t">ابحث في 3,900 قطعة</div><div class="vs">{ic("photo_camera")}</div></div>
<div class="segm"><div class="on">حسب الفئة</div><div>حسب الغرفة</div><div>المجموعات</div></div>
{rows}
<div class="mgrid">
<div class="mg">{ic("person")}<div><b>حسابي</b><small>سارة القحطاني</small></div></div>
<div class="mg">{ic("package_2")}<div><b>طلباتي</b><small>1 قيد التوصيل</small></div></div>
<div class="mg">{ic("favorite")}<div><b>المفضلة</b><small>9 قطع محفوظة</small></div></div>
<div class="mg">{ic("chat_bubble")}<div><b>تواصل معنا</b><small>رد خلال دقائق</small></div></div></div>
<div class="mrows">
<div class="mr">{ic("language")}<span class="t">اللغة</span><div class="tog"><i class="on">عربي</i><i>EN</i></div></div>
<div class="mr">{ic("storefront")}<span class="t">معارض رُكن</span><small>الرياض · جدة · الخبر</small></div>
</div>
<div class="homeind"></div></div>'''


def listing():
    P = [
        ("wishbone.jpg", "0.48 0.62 2.6", "كرسي «فيورد» من البلوط", "بلوط · حبل ورقي", "1,290", None, "الأكثر مبيعاً", True, ["#C99E6B", "#3B3A36"]),
        ("white-chair.jpg", "0.5 0.55 1.45", "كرسي «نُور» الأبيض", "بولي بروبلين · زان", "390", None, None, False, ["#F4F3EF", "#1F1F1F", "#B8C4B4"]),
        ("reading-chair.jpg", "0.56 0.6 1.9", "كرسي قراءة «سُهى»", "بتولا منحني · قطن", "1,190", None, "جديد", False, ["#F1EEE8", "#55606B"]),
        ("lounge-chair.jpg", "0.62 0.55 1.15", "كرسي استرخاء «هُدوء»", "بتولا · بوكليه", "1,650", "1,950", "-15%", False, ["#ECE7DE"]),
        ("armchair.jpg", "0.42 0.56 1.4", "كرسي بذراعين «ريم»", "جاكار · جوز", "2,350", None, None, False, ["#C98A2E", "#6E7A55"]),
        ("tufted-chair.jpg", "0.5 0.62 1.25", "كرسي «وقار» المبطّن", "جلد طبيعي · زان داكن", "3,900", None, None, True, ["#77736C"]),
        ("oak-dining.jpg", "0.62 0.66 1.9", "مقعد طويل «مَجلس»", "بلوط صلب · 160 سم", "1,480", None, None, False, ["#B58A5C"]),
        ("room-dining.jpg", "0.24 0.7 2.2", "زوج كراسي «صبا»", "بولي بروبلين · زان", "720", "890", "-19%", False, ["#F4F3EF", "#1F1F1F"]),
    ]
    cards = [pc(*p[:5], old=p[5], bdg=p[6], fav=p[7], dots=p[8]) for p in P]
    promo = f'<div class="promo"><div class="pt"><small>عرض المجموعة</small><b>كرسيان من «فيورد»<br>بسعر 2,190 {CUR}</b><span>تسوّق الزوج{ic("arrow_back")}</span></div>{ph(D+"oak-dining.jpg","0.3 0.6 1.6","pi")}</div>'
    grid = ''.join(cards[:4]) + promo + ''.join(cards[4:])
    return f'''<div class="screen">{STATUS}
<div class="nav">{ic("arrow_forward")}<div class="rr">{ic("search")}<span style="position:relative">{ic("shopping_bag")}<i class="cnt">2</i></span></div></div>
<div class="lt"><h1>الكراسي</h1><p>214 قطعة · توصيل مجاني فوق 1,000 {CUR}</p></div>
<div class="hscroll ichips">
<div class="ichip txt">الكل</div>
<div class="ichip on"><i data-src="img/{D}wishbone.jpg" data-f="0.48 0.62 3.4"></i>كراسي طعام</div>
<div class="ichip"><i data-src="img/{D}lounge-chair.jpg" data-f="0.62 0.55 1.6"></i>استرخاء</div>
<div class="ichip"><i data-src="img/{D}armchair.jpg" data-f="0.42 0.56 1.8"></i>بذراعين</div>
<div class="ichip"><i data-src="img/{D}oak-dining.jpg" data-f="0.62 0.66 2.4"></i>مقاعد طويلة</div></div>
<div class="fl"><div class="fc">{ic("tune")}تصفية<b>3</b></div><div class="fc">الترتيب: الأحدث{ic("expand_more")}</div><div class="fc">السعر{ic("expand_more")}</div><div class="fc last">{ic("grid_view")}</div></div>
<div class="tags"><span class="tg">بلوط{ic("close")}</span><span class="tg">ألوان فاتحة{ic("close")}</span><span class="tg">متوفر للتوصيل السريع{ic("close")}</span><a>مسح</a></div>
<div class="res"><span><b>86</b> نتيجة</span><span>الأسعار شاملة الضريبة</span></div>
<div class="grid2">{grid}</div>
<div class="lm"><p>شاهدت 8 من 86</p><div class="bar"><i></i></div><div class="b">تحميل المزيد</div></div>
{tabbar(1)}
</div>'''


def product():
    W = D + "wishbone.jpg"
    return f'''<div class="screen" style="padding-bottom:112px">
<div style="position:absolute;top:0;left:0;right:0;z-index:2;--ink:#1B1B1A">{STATUS}</div>
{ph(W, "0.5 0.62 1.25", "gal", f'<div class="gn"><span class="gb">{ic("arrow_forward")}</span><div class="gr"><span class="gb">{ic("ios_share")}</span><span class="gb">{ic("favorite")}</span></div></div><div class="gi"><i class="on"></i><i></i><i></i><i></i><i></i></div>')}
<div class="th">{ph(W,"0.48 0.62 1.5","on")}{ph(W,"0.48 0.6 3.0")}{ph(D+"oak-dining.jpg","0.4 0.6 1.6")}<div class="ar">{ic("view_in_ar")}في غرفتك</div></div>
<div class="pi2"><div class="cat">كراسي طعام<span>رمز RK-0417</span></div>
<h1>كرسي «فيورد» من البلوط</h1>
<div class="ds">تصميم كلاسيكي بظهر منحني على شكل عظمة الترقوة، ومقعد مجدول يدوياً من الحبل الورقي.</div>
<div class="pp"><b>1,290 <small>{CUR}</small></b><s>1,490</s><span class="off">-13%</span><span class="rt">{ic("star","fill")}4.9<small>(312)</small></span></div></div>

<div class="opt"><div class="oh"><span><b style="color:var(--ink)">التشطيب:</b> بلوط طبيعي زيتي</span><a>دليل الألوان</a></div>
<div class="wood"><i class="on" style="background:linear-gradient(135deg,#D9B78A,#C49A68)"></i><i style="background:linear-gradient(135deg,#F0E2CC,#E2CDAA)"></i><i style="background:linear-gradient(135deg,#6E4B30,#523621)"></i><i style="background:#2A2A28"></i><i style="background:#EDEBE6;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)"></i></div></div>
<div class="opt"><div class="oh"><span><b style="color:var(--ink)">المقعد:</b> حبل ورقي طبيعي</span></div>
<div class="pills"><div class="on">حبل طبيعي</div><div>حبل أسود</div><div>جلد<small>+340 {CUR}</small></div></div></div>
<div class="opt"><div class="oh"><span><b style="color:var(--ink)">الكمية</b></span></div>
<div class="pills"><div>كرسي واحد</div><div class="on">زوج<small>وفّر 10%</small></div><div>4 كراسي<small>وفّر 15%</small></div></div></div>

<div class="blk" style="margin-top:24px"><h4>الأبعاد<div class="unit"><i class="on">سم</i><i>إنش</i></div></h4>
<div class="dims"><div class="dfig"><svg width="118" height="132" viewBox="0 0 118 132" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M28 18c8-8 54-8 62 0"/><path d="M33 20c4 14 4 30 0 46M85 20c-4 14-4 30 0 46"/><path d="M59 14v52" opacity=".5"/><path d="M24 66h70l-4 8H28z"/><path d="M30 74l-4 44M88 74l4 44M40 74l-2 36M78 74l2 36"/><path d="M26 126h66" stroke-dasharray="3 3" opacity=".55"/><path d="M106 12v106" stroke-dasharray="3 3" opacity=".55"/></svg></div>
<div class="dl2"><div><span>العرض</span><b>55 سم</b></div><div><span>العمق</span><b>51 سم</b></div><div><span>الارتفاع</span><b>76 سم</b></div><div><span>ارتفاع المقعد</span><b>45 سم</b></div><div><span>الوزن</span><b>4.8 كجم</b></div></div></div></div>

<div class="blk"><h4>الخامات<small>شفافية كاملة</small></h4>
<div class="matl"><div class="mi"><i style="background:linear-gradient(115deg,#D7B486 0%,#C9A272 30%,#DDBE92 52%,#C49A68 75%,#D3AE7E 100%)"></i><div><b>بلوط أوروبي صلب</b><small>من غابات مُعتمدة FSC</small></div></div>
<div class="mi"><i data-src="img/{W}" data-f="0.48 0.6 7.0"></i><div><b>حبل ورقي مجدول</b><small>120 متراً لكل مقعد</small></div></div></div></div>

<div class="arb" data-src="img/{D}oak-dining.jpg" data-f="0.45 0.6 1.0"><div class="sc"></div><span class="mz">55 × 76 cm</span><div class="frame"></div><div class="at"><small>{ic("view_in_ar")}الواقع المعزّز</small><b>شاهده في غرفتك<br>بمقاسه الحقيقي</b><span>{ic("photo_camera")}جرّبه الآن</span></div></div>

<div class="blk"><h4>العناية</h4><div class="carel">
<div>{ic("cleaning_services")}<div><b>تنظيف أسبوعي</b><small>امسح بقطعة قماش جافة ناعمة باتجاه الألياف</small></div></div>
<div>{ic("water_drop")}<div><b>تجديد الزيت</b><small>مرة كل 12 شهراً بزيت العناية المرفق</small></div></div>
<div>{ic("thermostat")}<div><b>بعيداً عن الحرارة</b><small>حافظ على مسافة 50 سم من المكيّف والمدفأة</small></div></div></div></div>

<div class="ship">
<div>{ic("local_shipping")}<div><b>توصيل مجاني · الثلاثاء 2 ديسمبر</b><small>إلى الرياض، حي النرجس</small></div><span class="ch">تغيير</span></div>
<div>{ic("event_repeat")}<div><b>100 يوم للإرجاع</b><small>استرجاع مجاني من باب البيت</small></div></div>
<div>{ic("verified_user")}<div><b>ضمان 10 سنوات</b><small>على الهيكل الخشبي والوصلات</small></div></div></div>

<div class="accs"><div class="ac">عن التصميم{ic("remove")}</div><div class="acp">صُمّم «فيورد» ليكون خفيفاً في المكان وثابتاً في الاستعمال؛ 14 وصلة خشبية بلا مسامير معدنية، وزوايا مصقولة باليد.</div>
<div class="ac">المواصفات الكاملة{ic("add")}</div><div class="ac">التجميع{ic("add")}</div><div class="ac">الشحن والإرجاع{ic("add")}</div></div>

<div class="sec"><div class="sh"><div><h3>التقييمات</h3></div><a>اكتب تقييماً</a></div>
<div class="rvs"><div class="rsum"><div class="big"><b>4.9</b>{stars()}<small>312 تقييماً</small></div>
<div class="kv"><div>الراحة<i><em style="width:94%"></em></i></div><div>جودة الخامة<i><em style="width:98%"></em></i></div><div>مطابقة الصور<i><em style="width:96%"></em></i></div><div>سهولة التركيب<i><em style="width:90%"></em></i></div></div></div></div>
<div class="hscroll rph">{ph(D+"oak-dining.jpg","0.4 0.6 1.3","",f'<span>{ic("star","fill")}5</span>')}{ph(D+"pendant-dining.jpg","0.5 0.7 1.2","",f'<span>{ic("star","fill")}5</span>')}{ph(D+"sunburst-dining.jpg","0.55 0.65 1.3","",f'<span>{ic("star","fill")}4</span>')}{ph(W,"0.48 0.62 2.0","",f'<span>{ic("star","fill")}5</span>')}</div>
<div class="rq"><div class="who"><i>هـ</i><div><b>هيفاء الدوسري</b><small>اشترت زوجاً · قبل أسبوعين</small></div>{stars()}</div><p>أجمل من الصور، والخشب ثقيل وفخم. أخذت أربعة لطاولة الطعام وأضافت للمكان دفئاً كبيراً.</p></div></div>

<div class="sec"><div class="sh"><div><h3>يكتمل مع</h3><div class="sub">قطع اختارها مصمّمونا</div></div></div>
<div class="hscroll prow">
{pc("oak-dining.jpg","0.45 0.6 1.5","طاولة طعام «مائدة»","بلوط · 180 سم","3,450")}
{pc("pendant-dining.jpg","0.5 0.28 2.2","مصباح «قمر» المعلّق","ألمنيوم مصقول","890")}
{pc("table-setting.jpg","0.52 0.68 1.6","طقم أطباق «حصاد»","خزف حجري","460")}
</div></div>
<div class="sec"><div class="sh"><div><h3>قد يعجبك أيضاً</h3></div><a>عرض الكل</a></div>
<div class="grid2">
{pc("white-chair.jpg","0.5 0.55 1.45","كرسي «نُور» الأبيض","بولي بروبلين · زان","390")}
{pc("reading-chair.jpg","0.56 0.6 1.9","كرسي قراءة «سُهى»","بتولا منحني · قطن","1,190")}
</div></div>
<div class="sticky"><div class="sp"><small>زوج · شامل الضريبة</small><b>2,322 <small>{CUR}</small></b></div><div class="cta">{ic("shopping_bag")}أضف إلى السلة</div><div class="homeind"></div></div>
</div>'''


SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
