from lib import STATUS, ic, ph, stars

FONT = "readex"
TITLE = "Minimo"
CUR = "ج.م"

def L(t):
    return f'<span class="ltr">{t}</span>'

def K(n): return f'k/{n}.jpg'

CSS = """
:root{--bg:#F5F3EE;--surface:#FFFFFF;--tile:#ECE7DE;--tile2:#E2DCD1;--ink:#161D2E;--ink2:#4B5365;--ink3:#7B8293;--line:#E4E0D8;
--acc:#27457A;--accT:#27457A;--accSoft:#E4EAF4;--navy:#1A2B4C;--dot:#CFCAC0;--gold:#B7893A;--ok:#2F6B4F;--okSoft:#E3EFE8;
--tab:#16213A;--tabtx:#9AA6BF}
html.dark{--bg:#0E1117;--surface:#161A22;--tile:#1E232C;--tile2:#262C37;--ink:#EDEFF3;--ink2:#B6BCC8;--ink3:#8D94A3;--line:#252B36;
--acc:#3D62A8;--accT:#A9C0EE;--accSoft:#1A2440;--navy:#18233C;--dot:#343B48;--gold:#D9AE62;--ok:#8CCBA9;--okSoft:#15261E;
--tab:#1B2130;--tabtx:#8D94A3}
body{font-family:'Readex Pro',sans-serif;font-size:14px;line-height:1.45;font-weight:400}
.screen{padding-bottom:118px}
.lat{font-family:'Readex Pro',sans-serif;direction:ltr;letter-spacing:.16em;text-transform:uppercase}

/* header */
.header{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.wm b{display:block;font-size:21px;font-weight:600;letter-spacing:.3em;direction:ltr;text-align:right;line-height:1;margin-left:-.3em}
.wm small{display:block;font-size:10.5px;color:var(--ink3);margin-top:5px;font-weight:300}
.wm b i{color:var(--accT);font-style:normal}
.hicons{display:flex;gap:6px}
.ibtn{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;position:relative;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.ibtn .ms{font-size:22px}
.ibtn .n{position:absolute;top:8px;left:9px;width:8px;height:8px;border-radius:50%;background:#D2573F;box-shadow:0 0 0 2px var(--surface)}
.search{margin:6px 16px 0;height:48px;border-radius:14px;background:var(--surface);display:flex;align-items:center;padding:0 14px;gap:10px;box-shadow:0 0 0 1px var(--line)}
.search .ms{font-size:21px;color:var(--ink2)}
.search .t{flex:1;font-size:13px;color:var(--ink3);font-weight:300}
.search .k{font-size:11px;color:var(--accT);font-weight:500;display:flex;align-items:center;gap:4px;padding-right:12px;border-right:1px solid var(--line);height:22px}
.search .k .ms{font-size:18px;color:var(--accT)}
.seg{display:flex;margin:14px 16px 0;border-bottom:1px solid var(--line)}
.seg div{flex:1;text-align:center;font-size:13.5px;color:var(--ink3);padding:0 0 11px;position:relative;font-weight:400}
.seg div.on{color:var(--ink);font-weight:500}
.seg div.on:after{content:'';position:absolute;left:22%;right:22%;bottom:-1px;height:2.5px;border-radius:2px;background:var(--accT)}

/* hero */
.hero{margin-top:16px;gap:10px}
.hcard{width:342px;height:226px;border-radius:18px;position:relative;overflow:hidden;background-color:var(--tile)}
.hcard .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(14,20,34,.8) 0%,rgba(14,20,34,.35) 50%,rgba(14,20,34,0) 75%)}
.hcard .txt{position:absolute;right:18px;left:18px;bottom:16px;color:#fff;display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.hcard .lab{font-size:10px;letter-spacing:.2em;color:#D6DEEE;direction:ltr;text-align:right;display:block}
.hcard h2{font-size:21px;line-height:1.35;font-weight:500;margin-top:5px}
.hcard .cta{flex:0 0 auto;height:38px;padding:0 14px;border-radius:12px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.5);backdrop-filter:blur(10px);display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500}
.hcard .cta .ms{font-size:17px}
.hcard .idx{position:absolute;top:14px;left:14px;font-size:10.5px;color:#fff;direction:ltr;background:rgba(14,20,34,.45);backdrop-filter:blur(6px);border-radius:8px;padding:2px 8px;letter-spacing:.08em}
.dots{display:flex;justify-content:center;gap:5px;margin-top:12px}
.dots i{width:16px;height:3px;border-radius:2px;background:var(--dot)}
.dots i.on{width:28px;background:var(--accT)}

/* sections */
.sec{margin-top:32px}
.shead{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:14px;gap:10px}
.shead .n{display:block;font-size:10px;color:var(--accT);letter-spacing:.2em;direction:ltr;text-align:right;font-weight:500}
.shead h3{font-size:18px;font-weight:500;line-height:1.3;margin-top:2px}
.shead a{font-size:12px;color:var(--ink);font-weight:500;display:flex;align-items:center;gap:2px;white-space:nowrap;border-bottom:1px solid var(--ink);padding-bottom:1px}
.shead a .ms{font-size:16px}

/* age grid */
.agrid{margin:0 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ag{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:16px;padding:12px 12px 10px;height:96px;display:flex;flex-direction:column}
.ag b{font-size:25px;font-weight:300;line-height:1;direction:ltr;text-align:right;color:var(--accT);letter-spacing:-.01em}
.ag span{font-size:12px;font-weight:500;margin-top:5px}
.ag small{font-size:10.5px;color:var(--ink3);margin-top:auto;font-weight:300}
.ag.on{background:var(--acc);box-shadow:none;color:#fff}
.ag.on b{color:#fff}.ag.on small{color:#C9D5EC}

/* product card */
.prow{gap:12px}
.pcard{width:160px}
.pimg{height:200px;border-radius:14px;background-color:var(--tile);position:relative;overflow:hidden}
.fav{position:absolute;top:8px;left:8px;width:30px;height:30px;border-radius:10px;background:rgba(255,255,255,.92);display:grid;place-items:center}
.fav .ms{font-size:17px;color:#161D2E}
.fav.on .ms{color:#D2573F;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.tag{position:absolute;top:9px;right:9px;font-size:10px;font-weight:500;background:#fff;color:#161D2E;border-radius:7px;padding:2px 7px;letter-spacing:.02em}
.tag.sale{background:#D2573F;color:#fff;direction:ltr}
.tag.new{background:#1A2B4C;color:#fff}
.pmeta{display:flex;justify-content:space-between;align-items:center;margin-top:9px;font-size:10.5px;color:var(--ink3)}
.pmeta .sw{display:flex;gap:3px}
.pmeta .sw i{width:10px;height:10px;border-radius:3px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.14)}
.pname{font-size:13px;font-weight:400;margin-top:3px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pfoot{display:flex;align-items:center;justify-content:space-between;margin-top:5px}
.price{font-size:14.5px;font-weight:600;line-height:1.2;display:flex;align-items:baseline;gap:5px;flex-wrap:wrap}
.price small{font-size:10.5px;color:var(--ink2);font-weight:400}
.price s{font-size:11px;color:var(--ink3);font-weight:300}
.addb{width:32px;height:32px;border-radius:10px;background:var(--acc);display:grid;place-items:center;color:#fff;flex:0 0 auto}
.addb .ms{font-size:19px}

/* look */
.look{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.look .lim{grid-row:1/4;height:340px;border-radius:16px;position:relative;background-color:var(--tile)}
.hot{position:absolute;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.95);display:grid;place-items:center;font-size:11px;font-weight:600;color:#161D2E;box-shadow:0 0 0 5px rgba(255,255,255,.3)}
.li{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:14px;padding:7px;display:flex;flex-direction:column;gap:6px;height:106px}
.li .lt{display:flex;gap:8px;align-items:center;height:100%}
.li .lp{width:60px;height:90px;border-radius:10px;background-color:var(--tile);flex:0 0 auto;position:relative}
.li .lp i{position:absolute;top:4px;right:4px;width:18px;height:18px;border-radius:50%;background:var(--acc);color:#fff;font-size:9.5px;display:grid;place-items:center;font-weight:600}
.li b{display:block;font-size:11.5px;font-weight:500;line-height:1.4}
.li small{display:block;font-size:10px;color:var(--ink3);margin-top:1px}
.li span.p{display:block;font-size:12.5px;font-weight:600;margin-top:4px}
.li span.p small{display:inline;font-size:9.5px;color:var(--ink2)}
.lookbar{margin:10px 16px 0;height:50px;border-radius:14px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 16px;font-size:13px;font-weight:500}
.lookbar span{display:flex;align-items:center;gap:7px}
.lookbar .ms{font-size:20px}
.lookbar s{font-size:11px;color:#C9D5EC;margin-left:6px;font-weight:300}

/* who row */
.who{gap:10px}
.wc{width:150px}
.wc .wi{height:190px;border-radius:16px;background-color:var(--tile);position:relative}
.wc .wi .ct{position:absolute;bottom:9px;right:9px;font-size:10px;background:rgba(14,20,34,.55);color:#fff;border-radius:7px;padding:2px 7px;backdrop-filter:blur(6px)}
.wc b{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;margin-top:9px}
.wc b .ms{font-size:18px;color:var(--ink3)}
.wc small{display:block;font-size:11px;color:var(--ink3);font-weight:300}

/* gift */
.giftc{margin:0 16px;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;overflow:hidden;display:flex;height:210px}
.giftc .gi{width:150px;flex:0 0 auto;background-color:var(--tile)}
.giftc .gt{flex:1;padding:14px;display:flex;flex-direction:column}
.giftc .gt .lat{font-size:9.5px;color:var(--accT);text-align:right}
.giftc .gt b{font-size:16px;font-weight:500;margin-top:4px;line-height:1.35}
.giftc .gt ul{list-style:none;margin-top:8px;display:flex;flex-direction:column;gap:3px}
.giftc .gt li{font-size:11.5px;color:var(--ink2);display:flex;align-items:center;gap:5px;font-weight:300}
.giftc .gt li .ms{font-size:15px;color:var(--ok)}
.giftc .gf{margin-top:auto;display:flex;align-items:center;justify-content:space-between}
.budget{display:flex;gap:8px;margin:10px 16px 0}
.budget div{flex:1;height:44px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.25}
.budget div small{font-size:9.5px;color:var(--ink3);font-weight:300}
.budget div b{font-size:12px;font-weight:500}

/* edits */
.edits{gap:10px}
.ed{width:168px;height:232px;border-radius:16px;position:relative;overflow:hidden;background-color:var(--tile)}
.ed .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(14,20,34,.78) 0%,rgba(14,20,34,.15) 55%,rgba(14,20,34,0) 75%)}
.ed .num{position:absolute;top:12px;right:12px;font-size:11px;color:#fff;letter-spacing:.15em;direction:ltr;font-weight:500}
.ed .et{position:absolute;right:13px;left:13px;bottom:12px;color:#fff}
.ed .et b{display:block;font-size:16px;font-weight:500;line-height:1.3}
.ed .et small{display:block;font-size:11px;color:#D6DEEE;margin-top:2px;font-weight:300}

/* deal */
.deal{margin:0 16px;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:14px}
.deal .dh{display:flex;justify-content:space-between;align-items:center}
.deal .dh b{font-size:16px;font-weight:500;display:block}
.deal .dh small{font-size:11.5px;color:var(--ink3);font-weight:300}
.cd{display:flex;align-items:center;gap:4px;direction:ltr}
.cd b{width:34px;height:34px;border-radius:10px;background:var(--navy);color:#fff;display:grid;place-items:center;font-size:14px;font-weight:500;font-variant-numeric:tabular-nums}
.cd em{color:var(--ink3)}
.deal .dh .cd b{display:grid}
.dl2{display:flex;flex-direction:column;margin-top:10px}
.di{display:flex;align-items:center;gap:12px;padding:9px 0;border-top:1px solid var(--line)}
.di .dim{width:62px;height:62px;border-radius:12px;background-color:var(--tile);flex:0 0 auto}
.di .dt{flex:1;min-width:0}
.di .dt b{display:block;font-size:13px;font-weight:400}
.di .dt .bar{height:4px;border-radius:2px;background:var(--tile);margin-top:7px;overflow:hidden}
.di .dt .bar i{display:block;height:100%;background:#D2573F;border-radius:2px}
.di .dt small{display:block;font-size:10.5px;color:var(--ink3);margin-top:4px;font-weight:300}
.di .dp{text-align:left}
.di .dp b{display:block;font-size:14.5px;font-weight:600}
.di .dp b small{font-size:10px;color:var(--ink2);font-weight:400}
.di .dp s{font-size:11px;color:var(--ink3);font-weight:300}

/* club */
html.dark .club{box-shadow:0 0 0 1px rgba(255,255,255,.07)}
.club{margin:0 16px;border-radius:18px;background:var(--navy);padding:18px;color:#fff;position:relative;overflow:hidden;background-image:radial-gradient(circle at 12% 120%,rgba(120,150,210,.35) 0,rgba(120,150,210,0) 55%)}
.club .lat{font-size:10px;color:#AFC0E0;text-align:right;display:block}
.club b{display:block;font-size:19px;font-weight:500;margin-top:5px;line-height:1.35}
.club p{font-size:12px;color:#C9D3E6;margin-top:4px;font-weight:300;line-height:1.6}
.club .cr{display:flex;gap:8px;margin-top:14px}
.club .cb{height:42px;padding:0 16px;border-radius:12px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.4);display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500}
.club .cb .ms{font-size:18px}
.club .perk{display:flex;gap:16px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.14)}
.club .perk div{font-size:11px;color:#C9D3E6;display:flex;align-items:center;gap:5px;font-weight:300}
.club .perk .ms{font-size:16px;color:#fff}

.vals{margin:0 16px;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px 0}
.vals div{text-align:center;padding:0 4px;border-left:1px solid var(--line)}
.vals div:last-child{border-left:0}
.vals .ms{font-size:23px;color:var(--accT)}
.vals b{display:block;font-size:11px;font-weight:500;margin-top:5px;line-height:1.35}

/* tab bar */
.tabbar{position:absolute;left:16px;right:16px;bottom:28px;height:66px;border-radius:22px;background:var(--tab);box-shadow:0 14px 30px rgba(14,20,34,.3);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;padding:0 6px}
html.dark .tabbar{box-shadow:0 0 0 1px rgba(255,255,255,.06),0 14px 30px rgba(0,0,0,.5)}
.tab{display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--tabtx);position:relative;height:54px;justify-content:center}
.tab .ms{font-size:23px}
.tab span:not(.ms){font-size:10px}
.tab.on{color:#fff}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tab.on:after{content:'';position:absolute;bottom:-1px;width:4px;height:4px;border-radius:50%;background:#fff}
.tab .bd{position:absolute;top:5px;left:50%;margin-left:-20px;min-width:17px;height:17px;border-radius:9px;background:#D2573F;color:#fff;font-size:10px;font-weight:500;display:grid;place-items:center;padding:0 4px;line-height:1}

/* ---------- MENU ---------- */
.grab{width:40px;height:5px;border-radius:3px;background:var(--tile2);margin:2px auto 6px}
.mhead{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:56px}
.mq{gap:8px;margin-top:14px}
.mq div{height:40px;padding:0 14px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12.5px;white-space:nowrap}
.mq div .ms{font-size:18px;color:var(--accT)}
.mq div.hl{background:var(--acc);color:#fff;box-shadow:none}
.mq div.hl .ms{color:#fff}
.mage{margin:14px 16px 0;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:16px;padding:12px}
.mage .mh{display:flex;justify-content:space-between;font-size:12px;color:var(--ink3);font-weight:300}
.mage .mh b{color:var(--ink);font-weight:500}
.mage .ar{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-top:9px}
.mage .ar i{height:44px;border-radius:10px;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.2}
.mage .ar i b{font-size:12.5px;font-weight:500;direction:ltr}
.mage .ar i small{font-size:9px;color:var(--ink3)}
.mcat{margin-top:24px}
.mch{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:11px}
.mch .l{display:flex;align-items:baseline;gap:10px}
.mch .no{font-size:12px;color:var(--accT);direction:ltr;letter-spacing:.1em;font-weight:500}
.mch b{font-size:17px;font-weight:500}
.mch small{font-size:11px;color:var(--ink3);font-weight:300;margin-right:2px}
.mch a{font-size:11.5px;color:var(--ink2);display:flex;align-items:center;gap:1px}
.mch a .ms{font-size:16px}
.mrow{gap:10px}
.mc{width:118px}
.mc .im{height:118px;border-radius:14px;background-color:var(--tile)}
.mc b{display:block;font-size:12.5px;font-weight:500;margin-top:7px;line-height:1.35}
.mc small{display:block;font-size:10.5px;color:var(--ink3);font-weight:300}
.mc.all .im{background:var(--navy);display:flex;flex-direction:column;justify-content:space-between;padding:12px;color:#fff}
.mc.all .im .ms{font-size:26px;color:#AFC0E0;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.mc.all .im em{font-size:24px;font-weight:300;line-height:1;direction:ltr;text-align:right}
.mc.all .im em small{display:block;font-size:10px;color:#AFC0E0;margin-top:3px;font-weight:300;direction:rtl}
.mfoot{margin:30px 16px 0;border-top:1px solid var(--line)}
.mli{display:flex;align-items:center;gap:12px;height:54px;border-bottom:1px solid var(--line)}
.mli .ms.l{font-size:22px;color:var(--ink2)}
.mli span.t{flex:1;font-size:14px}
.mli small{font-size:12px;color:var(--ink3);font-weight:300}
.mli .ms.c{font-size:18px;color:var(--ink3)}
.mli .pill2{font-size:11px;font-weight:500;color:var(--ok);background:var(--okSoft);padding:3px 9px;border-radius:8px}
.lang{display:flex;background:var(--tile);border-radius:10px;padding:3px;gap:2px}
.lang i{font-size:11.5px;padding:4px 11px;border-radius:8px;color:var(--ink2)}
.lang i.on{background:var(--surface);color:var(--ink);font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.mhelp{margin:14px 16px 0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.mhelp div{height:64px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:11.5px;color:var(--ink2)}
.mhelp .ms{font-size:21px;color:var(--accT)}
.mver{text-align:center;font-size:10.5px;color:var(--ink3);margin-top:16px;font-weight:300}

/* ---------- LISTING ---------- */
.topbar{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;gap:10px}
.topbar .tt{flex:1;text-align:center}
.topbar .tt b{display:block;font-size:17px;font-weight:500;line-height:1.2}
.topbar .tt small{display:block;font-size:11px;color:var(--ink3);font-weight:300}
.utabs{gap:22px;border-bottom:1px solid var(--line);margin-top:4px}
.utabs div{font-size:13px;color:var(--ink3);padding:8px 0 11px;position:relative;white-space:nowrap}
.utabs div small{font-size:10px;margin-right:3px;color:var(--ink3)}
.utabs div.on{color:var(--ink);font-weight:500}
.utabs div.on:after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2.5px;border-radius:2px;background:var(--accT)}
.fbar{display:grid;grid-template-columns:1fr 1fr 44px;gap:8px;margin:14px 16px 0}
.fbtn{height:44px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;white-space:nowrap}
.fbtn .ms{font-size:19px}
.fbtn .c{min-width:18px;height:18px;border-radius:6px;background:var(--acc);color:#fff;font-size:10.5px;display:grid;place-items:center;padding:0 4px;line-height:1}
.fbtn b{font-weight:500}
.szr{gap:6px;margin-top:12px}
.szr div{height:34px;padding:0 12px;border-radius:10px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;font-size:12px;direction:ltr;white-space:nowrap}
.szr div.lbl{box-shadow:none;background:none;padding:0 0 0 4px;color:var(--ink3);direction:rtl;font-weight:300}
.szr div.on{background:var(--ink);color:var(--bg);box-shadow:none;font-weight:500}
.atags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 16px 0;align-items:center}
.atag{height:28px;padding:0 6px 0 10px;border-radius:8px;background:var(--accSoft);color:var(--accT);font-size:11.5px;font-weight:500;display:flex;align-items:center;gap:4px}
.atag .ms{font-size:15px}
.aclear{font-size:11.5px;color:var(--ink3);margin-right:4px}
.rcount{margin:16px 16px 12px;font-size:12px;color:var(--ink3);display:flex;justify-content:space-between;font-weight:300}
.rcount b{color:var(--ink);font-weight:500}
.grid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:20px 10px}
.grid .pcard{width:auto}
.grid .pimg{height:210px}
.promo{grid-column:1/-1;height:168px;border-radius:16px;position:relative;overflow:hidden;background-color:var(--navy);display:flex}
.promo .pt{flex:1;padding:16px;color:#fff;display:flex;flex-direction:column}
.promo .pt .lat{font-size:9.5px;color:#AFC0E0;text-align:right}
.promo .pt b{font-size:17px;font-weight:500;line-height:1.35;margin-top:5px}
.promo .pt small{font-size:11.5px;color:#C9D3E6;font-weight:300}
.promo .pt .cta2{margin-top:auto;align-self:flex-start;height:36px;padding:0 13px;border-radius:11px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.45);display:flex;align-items:center;gap:5px;font-size:12px;font-weight:500}
.promo .pt .cta2 .ms{font-size:16px}
.promo .pi{width:150px;flex:0 0 auto}
.more{margin:28px 16px 0;text-align:center}
.more p{font-size:11.5px;color:var(--ink3);font-weight:300}
.more .prog{width:160px;height:3px;border-radius:2px;background:var(--tile2);margin:8px auto 0;overflow:hidden}
.more .prog i{display:block;height:100%;width:22%;background:var(--accT)}
.more .mb{margin:14px auto 0;height:48px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--ink);color:var(--ink);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500}
.more .mb .ms{font-size:19px}

/* ---------- PRODUCT ---------- */
.ptop{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.gal{margin:0 16px;height:392px;border-radius:18px;position:relative;overflow:hidden;background-color:var(--tile)}
.gal .gcnt{position:absolute;top:12px;left:12px;font-size:11px;color:#fff;background:rgba(14,20,34,.5);backdrop-filter:blur(6px);border-radius:8px;padding:2px 9px;direction:ltr}
.gal .gb{position:absolute;top:12px;right:12px;font-size:10.5px;color:#161D2E;background:rgba(255,255,255,.92);border-radius:8px;padding:3px 9px;font-weight:500;display:flex;align-items:center;gap:4px}
.gal .gb .ms{font-size:15px;color:#2F6B4F}
.gal .gdots{position:absolute;bottom:14px;left:0;right:0;display:flex;justify-content:center;gap:4px}
.gal .gdots i{width:14px;height:3px;border-radius:2px;background:rgba(255,255,255,.55)}
.gal .gdots i.on{width:26px;background:#fff}
.thumbs{display:flex;gap:8px;margin:10px 16px 0}
.thumbs div{width:58px;height:58px;border-radius:12px;background-color:var(--tile);position:relative;overflow:hidden}
.thumbs div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--accT)}
.thumbs div.v:after{content:'';position:absolute;inset:0;background:rgba(14,20,34,.45)}
.thumbs div.v span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;z-index:1}
.thumbs .vt{margin-right:auto;width:auto;background:none;display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--accT)}
.thumbs .vt .ms{font-size:18px}
.pinfo{padding:18px 16px 0}
.pinfo .bl{font-size:10px;color:var(--accT);letter-spacing:.2em;direction:ltr;text-align:right;font-weight:500}
.pinfo h1{font-size:21px;font-weight:500;line-height:1.4;margin-top:5px}
.pinfo .sub{font-size:12.5px;color:var(--ink2);font-weight:300;margin-top:2px}
.rline{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:var(--ink3)}
.rline .stars{display:flex;color:var(--gold)}
.rline .stars .ms{font-size:15px}
.rline b{color:var(--ink);font-weight:500}
.rline u{text-underline-offset:3px}
.pp{display:flex;align-items:baseline;gap:8px;margin-top:12px}
.pp .bigp{font-size:26px;font-weight:600;line-height:1}
.pp .bigp small{font-size:12.5px;color:var(--ink2);font-weight:400}
.pp s{font-size:13px;color:var(--ink3);font-weight:300}
.pp .dc{font-size:11px;font-weight:500;color:#fff;background:#D2573F;padding:2px 7px;border-radius:7px;direction:ltr}
.vat{font-size:11px;color:var(--ink3);margin-top:5px;font-weight:300}
.vsec{margin:20px 16px 0}
.vh{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.vh b{font-size:13.5px;font-weight:500}
.vh b span{color:var(--ink2);font-weight:300}
.vh a{font-size:12px;color:var(--accT);display:flex;align-items:center;gap:3px;border-bottom:1px solid var(--accT)}
.vh a .ms{font-size:15px}
.cchips{display:flex;gap:8px}
.cchip{height:42px;padding:0 12px 0 14px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:8px;font-size:12.5px}
.cchip i{width:20px;height:20px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.cchip.on{box-shadow:0 0 0 1.5px var(--accT);font-weight:500}
.sizes{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.sizes div{height:50px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.2}
.sizes div b{font-size:13px;font-weight:500;direction:ltr}
.sizes div small{font-size:9.5px;color:var(--ink3);font-weight:300}
.sizes div.on{background:var(--ink);box-shadow:none;color:var(--bg)}
.sizes div.on small{color:var(--bg);opacity:.75}
.sizes div.off{opacity:.4}
.sizes div.off b{text-decoration:line-through}
.blk{margin:12px 16px 0;background:var(--surface);border-radius:18px;box-shadow:0 0 0 1px var(--line);padding:16px}
.blk h4{font-size:15.5px;font-weight:500;display:flex;align-items:center;justify-content:space-between}
.blk h4 small{font-size:11px;color:var(--ink3);font-weight:300}
.btbl{margin-top:10px}
.btbl .r{display:grid;grid-template-columns:1.25fr 1fr 1fr .8fr;align-items:center;height:40px;font-size:12.5px;border-bottom:1px solid var(--line)}
.btbl .r:last-child{border:0}
.btbl .r>span{text-align:center}
.btbl .r>span:first-child{text-align:right}
.btbl .r>span:last-child{text-align:left;font-weight:500}
.btbl .r.h{height:30px;font-size:10.5px;color:var(--ink3);font-weight:300}
.btbl .r.hl{background:var(--accSoft);border-radius:10px;border:0;margin:2px -8px;padding:0 8px;color:var(--accT);font-weight:500}
.tip{display:flex;gap:8px;margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--bg);font-size:11.5px;color:var(--ink2);line-height:1.6;font-weight:300}
.tip .ms{font-size:18px;color:var(--accT);flex:0 0 auto}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.stats div{background:var(--bg);border-radius:12px;padding:10px 12px}
.stats b{display:block;font-size:17px;font-weight:500;line-height:1.2}
.stats small{display:block;font-size:10.5px;color:var(--ink3);margin-top:2px;font-weight:300}
.chk{list-style:none;margin-top:12px;display:flex;flex-direction:column;gap:9px}
.chk li{display:flex;gap:9px;font-size:12.5px;align-items:flex-start;line-height:1.5}
.chk li .ms{font-size:18px;color:var(--ok);flex:0 0 auto}
.chk li small{display:block;font-size:11px;color:var(--ink3);font-weight:300}
.carel{margin-top:10px}
.carel div{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:12.5px}
.carel div:last-child{border:0}
.carel .ms{width:36px;height:36px;border-radius:10px;background:var(--bg);display:grid;place-items:center;font-size:20px;color:var(--accT)}
.carel small{margin-right:auto;font-size:11px;color:var(--ink3);font-weight:300}
.wrapc{margin:12px 16px 0;border-radius:18px;background:var(--accSoft);padding:14px;display:flex;align-items:center;gap:12px}
.wrapc .wim{width:56px;height:56px;border-radius:12px;background-color:var(--tile);flex:0 0 auto}
.wrapc .wt{flex:1}
.wrapc .wt b{display:block;font-size:13.5px;font-weight:500}
.wrapc .wt small{display:block;font-size:11px;color:var(--ink2);font-weight:300}
.tgl{width:46px;height:28px;border-radius:14px;background:var(--acc);position:relative;flex:0 0 auto}
.tgl:after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff}
.dlv{margin:12px 16px 0;background:var(--surface);border-radius:18px;box-shadow:0 0 0 1px var(--line);padding:2px 14px}
.dl{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)}
.dl:last-child{border:0}
.dl .ms{font-size:22px;color:var(--accT)}
.dl b{display:block;font-size:13px;font-weight:500}
.dl small{display:block;font-size:11px;color:var(--ink3);font-weight:300}
.acc{margin:12px 16px 0;border-top:1px solid var(--line)}
.ac{border-bottom:1px solid var(--line);padding:14px 0}
.ac .ah{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500}
.ac .ah .ms{font-size:20px;color:var(--ink3)}
.ac p{font-size:12.5px;color:var(--ink2);line-height:1.8;margin-top:6px;font-weight:300}
.rv{margin:12px 16px 0}
.rvtop{display:flex;gap:16px;align-items:center;margin-top:10px;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:14px}
.rvbig{width:90px;text-align:center}
.rvbig b{font-size:38px;font-weight:300;line-height:1}
.rvbig .stars{display:flex;justify-content:center;color:var(--gold);margin-top:5px}
.rvbig .stars .ms{font-size:13px}
.rvbig small{display:block;font-size:10.5px;color:var(--ink3);margin-top:3px}
.rkv{flex:1;display:flex;flex-direction:column;gap:7px}
.rkv div{font-size:11px;color:var(--ink2)}
.rkv div span{display:flex;justify-content:space-between}
.rkv div i{display:block;height:4px;border-radius:2px;background:var(--tile);margin-top:3px;overflow:hidden}
.rkv div i em{display:block;height:100%;background:var(--accT)}
.rvph{display:flex;gap:8px;margin-top:10px}
.rvph div{flex:1;height:84px;border-radius:12px;background-color:var(--tile);position:relative;overflow:hidden}
.rvph div.more2:after{content:'+64';direction:ltr;position:absolute;inset:0;background:rgba(14,20,34,.55);color:#fff;display:grid;place-items:center;font-size:14px;font-weight:500}
.rvq{margin-top:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:14px}
.rvq .wh{display:flex;align-items:center;gap:8px}
.rvq .wh i{width:32px;height:32px;border-radius:10px;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;font-size:13px;font-weight:500}
.rvq .wh b{display:block;font-size:13px;font-weight:500}
.rvq .wh small{display:block;font-size:10.5px;color:var(--ink3);font-weight:300}
.rvq .wh .stars{margin-right:auto;display:flex;color:var(--gold)}
.rvq .wh .stars .ms{font-size:13px}
.rvq q{display:block;font-size:12.5px;line-height:1.75;margin-top:8px;quotes:none;font-weight:300}
.rvq .tg{display:flex;gap:6px;margin-top:8px}
.rvq .tg span{font-size:10.5px;color:var(--ink2);background:var(--bg);border-radius:7px;padding:2px 8px}
.gw{gap:10px}
.gwc{width:236px;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:16px;padding:8px;display:flex;gap:10px;align-items:center}
.gwc .gim{width:72px;height:84px;border-radius:11px;background-color:var(--tile);flex:0 0 auto}
.gwc .gt{flex:1;min-width:0}
.gwc .gt b{display:block;font-size:12.5px;font-weight:400;line-height:1.4}
.gwc .gt small{display:block;font-size:10.5px;color:var(--ink3);font-weight:300}
.gwc .gt .gp{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.gwc .gt .gp span{font-size:14px;font-weight:600}
.gwc .gt .gp span small{display:inline;font-size:10px;color:var(--ink2);font-weight:400}
.gwc .gt .gp i{width:28px;height:28px;border-radius:9px;box-shadow:inset 0 0 0 1.3px var(--accT);color:var(--accT);display:grid;place-items:center}
.gwc .gt .gp i .ms{font-size:18px}
.sticky{position:absolute;left:0;right:0;bottom:0;z-index:5;padding:12px 16px 30px;background:var(--surface);box-shadow:0 -1px 0 var(--line),0 -10px 30px rgba(14,20,34,.06);display:flex;align-items:center;gap:10px}
.sticky .sp small{display:block;font-size:10.5px;color:var(--ink3);font-weight:300}
.sticky .sp b{font-size:19px;font-weight:600;line-height:1.15;white-space:nowrap}
.sticky .sp b small{display:inline;font-size:11px;color:var(--ink2);font-weight:400}
.sticky .hf{width:50px;height:50px;border-radius:14px;box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;margin-right:auto}
.sticky .hf .ms{font-size:22px;color:#D2573F}
.addcart{width:170px;height:50px;border-radius:14px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center;gap:7px;font-size:14px;font-weight:500}
.addcart .ms{font-size:20px}
"""

def pcard(img, f, name, age, price, old=None, tag=None, fav=False, sw=None):
    t = ''
    if tag:
        cls = 'sale' if tag.startswith('-') else ('new' if tag == 'جديد' else '')
        t = f'<span class="tag {cls}">{tag}</span>'
    s = ('<span class="sw">' + ''.join(f'<i style="background:{c}"></i>' for c in sw) + '</span>') if sw else '<span></span>'
    pr = f'<div class="price">{price} <small>{CUR}</small>' + (f'<s>{old}</s>' if old else '') + '</div>'
    return f'''<div class="pcard">{ph(img, f, "pimg", t + f'<div class="fav{" on" if fav else ""}">{ic("favorite")}</div>')}
<div class="pmeta"><span>{age}</span>{s}</div><div class="pname">{name}</div>
<div class="pfoot">{pr}<div class="addb">{ic("add")}</div></div></div>'''

def tabbar(active=0):
    tabs = [("home", "الرئيسية"), ("grid_view", "المتجر"), ("shopping_bag", "السلة"), ("receipt_long", "طلباتي"), ("person", "حسابي")]
    out = ''
    for i, (n, l) in enumerate(tabs):
        bd = '<i class="bd">2</i>' if n == 'shopping_bag' else ''
        out += f'<div class="tab{" on" if i == active else ""}">{ic(n)}<span>{l}</span>{bd}</div>'
    return f'<div class="tabbar">{out}</div><div class="homeind"></div>'

WM = '<div class="wm"><b>MINIM<i>O</i></b><small>مينيمو · أزياء الأطفال</small></div>'
def yrs(a, u="سنوات"): return f'{L(a)} {u}'

# ---------------- HOME ----------------
def home():
    ages = [("0–6", "أشهر", "مواليد", False), ("6–24", "شهراً", "رُضّع", False), ("2–4", "سنوات", "أطفال صغار", True),
            ("4–6", "سنوات", "ما قبل المدرسة", False), ("6–9", "سنوات", "المدرسة", False), ("9–12", "سنة", "الأكبر سناً", False)]
    ag = ''.join(f'<div class="ag{" on" if on else ""}"><b>{a}</b><span>{u}</span><small>{d}</small></div>' for a, u, d, on in ages)
    newin = ''.join([
        pcard(K("plaid-jacket"), "0.55 0.48 1.6", "جاكيت كاروه مبطّن", yrs("2–6"), "1,450", None, "جديد", False, ["#2B3148", "#8B3A3A"]),
        pcard(K("cream-knit"), "0.6 0.42 1.5", "كنزة محبوكة كريمية", yrs("3–8"), "990", None, "جديد", True, ["#E9DFCF", "#8E9A78"]),
        pcard(K("yellow-raincoat"), "0.5 0.86 2.3", "معطف مطر بقبعة", yrs("4–10"), "1,190", "1,390", "-15%", False, ["#E9C239", "#27457A"]),
        pcard(K("pom-beanie"), "0.5 0.42 1.4", "قبعة صوف بكرة", yrs("2–8"), "320", None, None, False, ["#B9C8CF", "#E9DFCF"]),
    ])
    look = f'''<div class="look">
{ph(K("plaid-jacket"), "0.55 0.5 1.15", "lim", '<span class="hot" style="top:118px;right:52px">1</span><span class="hot" style="top:66px;right:40px">2</span><span class="hot" style="top:236px;right:58px">3</span>')}
<div class="li"><div class="lt">{ph(K("plaid-jacket"), "0.55 0.45 3", "lp", "<i>1</i>")}<div><b>جاكيت كاروه مبطّن</b><small>{yrs("2–6")}</small><span class="p">1,450 <small>{CUR}</small></span></div></div></div>
<div class="li"><div class="lt">{ph(K("pom-beanie"), "0.5 0.4 1.3", "lp", "<i>2</i>")}<div><b>قبعة صوف بكرة</b><small>{yrs("2–8")}</small><span class="p">320 <small>{CUR}</small></span></div></div></div>
<div class="li"><div class="lt">{ph(K("overalls"), "0.3 0.72 2.4", "lp", "<i>3</i>")}<div><b>بنطلون جينز ناعم</b><small>{yrs("1–5")}</small><span class="p">860 <small>{CUR}</small></span></div></div></div>
</div>
<div class="lookbar"><span>{ic("shopping_bag")}أضيفي الإطلالة كاملة</span><span>2,394 {CUR}<s>2,630</s></span></div>'''
    who = ''.join(f'<div class="wc">{ph(K(i), f, "wi", f"<span class=ct>{c}</span>")}<b>{n}{ic("arrow_back")}</b><small>{s}</small></div>' for i, f, n, s, c in [
        ("tiered-dress", "0.45 0.32 1.2", "البنات", "فساتين، بيجامات وجاكيتات", "1,240 قطعة"),
        ("denim-jacket", "0.48 0.62 1.4", "الأولاد", "قمصان، هوديز وجينز", "980 قطعة"),
        ("newborn-knit", "0.42 0.48 1.5", "البيبي", "من الولادة حتى 24 شهراً", "640 قطعة"),
        ("sparkle-sneakers", "0.56 0.6 1.5", "الأحذية", "مقاسات 18 إلى 35", "410 قطع")])
    edits = ''.join(f'{ph(K(i), f, "ed", f"<div class=sc></div><span class=num>{n}</span><div class=et><b>{t}</b><small>{s}</small></div>")}' for i, f, n, t, s in [
        ("white-dresses", "0.5 0.66 1.5", "01", "إطلالات العيد", "فساتين وقمصان للمناسبات"),
        ("girls-coats", "0.5 0.55 1.1", "02", "العودة للمدارس", "زي يومي، حقائب وأحذية"),
        ("cupcake", "0.42 0.5 1.4", "03", "حفلات أعياد الميلاد", "أزياء الحفلات والهدايا"),
        ("straw-hat", "0.55 0.62 1.4", "04", "عطلة الصيف", "قطن خفيف وقبعات شمس")])
    deals = ''.join(f'''<div class="di">{ph(K(i), f, "dim")}<div class="dt"><b>{n}</b><div class="bar"><i style="width:{w}%"></i></div><small>تبقّى {left}</small></div><div class="dp"><b>{p} <small>{CUR}</small></b><s>{o}</s></div></div>''' for i, f, n, w, left, p, o in [
        ("grey-hoodie", "0.55 0.75 1.5", "هودي فليس رمادي", 72, "8 قطع", "570", "950"),
        ("robe-b", "0.5 0.45 1.6", "روب استحمام تيري", 45, "14 قطعة", "480", "690"),
        ("knit-socks", "0.45 0.5 1.3", "طقم جوارب صوف ×3", 84, "5 أطقم", "140", "190")])
    return f'''<div class="screen">{STATUS}
<div class="header">{WM}<div class="hicons"><div class="ibtn">{ic("notifications")}<i class="n"></i></div><div class="ibtn">{ic("segment")}</div></div></div>
<div class="search">{ic("search")}<div class="t">ابحثي بالاسم أو العمر أو المقاس</div><span class="k">{ic("qr_code_scanner")}امسحي</span></div>
<div class="seg"><div class="on">الكل</div><div>بنات</div><div>أولاد</div><div>بيبي</div></div>
<div class="hscroll hero">
{ph(K("knit-hat-green"), "0.55 0.45 1", "hcard", '<div class="sc"></div><span class="idx">01 / 04</span><div class="txt"><div><span class="lab">AW 26 · OUTDOOR</span><h2>دفء الخريف<br>لمغامرات صغيرة</h2></div><span class="cta">تسوّقي' + ic("arrow_back") + '</span></div>')}
{ph(K("yellow-raincoat"), "0.5 0.7 1", "hcard", '<div class="sc"></div>')}
</div>
<div class="dots"><i class="on"></i><i></i><i></i><i></i></div>

<div class="sec"><div class="shead"><div><span class="n">01 · BY AGE</span><h3>تسوّقي حسب العمر</h3></div><a>دليل المقاسات{ic("chevron_left")}</a></div>
<div class="agrid">{ag}</div></div>

<div class="sec"><div class="shead"><div><span class="n">02 · NEW IN</span><h3>وصل هذا الأسبوع</h3></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll prow">{newin}</div></div>

<div class="sec"><div class="shead"><div><span class="n">03 · THE LOOK</span><h3>إطلالة الأسبوع</h3></div><a>إطلالات أخرى{ic("chevron_left")}</a></div>{look}</div>

<div class="sec"><div class="shead"><div><span class="n">04 · SHOP</span><h3>لمن تتسوّقين؟</h3></div></div>
<div class="hscroll who">{who}</div></div>

<div class="sec"><div class="shead"><div><span class="n">05 · GIFTING</span><h3>أطقم هدايا جاهزة</h3></div><a>كل الهدايا{ic("chevron_left")}</a></div>
<div class="giftc">{ph(K("gift-pink"), "0.72 0.5 1.35", "gi")}<div class="gt"><span class="lat">NEWBORN BOX</span><b>صندوق المولود الأول</b>
<ul><li>{ic("check")}4 قطع قطن عضوي</li><li>{ic("check")}بطانية ودمية ناعمة</li><li>{ic("check")}بطاقة إهداء بخط اليد</li></ul>
<div class="gf"><div class="price">1,450 <small>{CUR}</small></div><div class="addb">{ic("add")}</div></div></div></div>
<div class="budget"><div><small>أقل من</small><b>500 {CUR}</b></div><div><small>من 500 إلى</small><b>1,000 {CUR}</b></div><div><small>أكثر من</small><b>1,000 {CUR}</b></div></div></div>

<div class="sec"><div class="shead"><div><span class="n">06 · OCCASIONS</span><h3>المدرسة والمناسبات</h3></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll edits">{edits}</div></div>

<div class="sec"><div class="deal"><div class="dh"><div><b>عروض نهاية الأسبوع</b><small>خصم حتى {L("40%")} لفترة محدودة</small></div>
<div class="cd"><b>02</b><em>:</em><b>14</b><em>:</em><b>37</b></div></div><div class="dl2">{deals}</div></div></div>

<div class="sec"><div class="club"><span class="lat">MINIMO CLUB</span><b>هدية في عيد ميلاد طفلك</b><p>سجّلي تاريخ ميلاد طفلك ومقاسه، وسنرسل لكِ خصم {L("15%")} وتذكيراً عند تغيّر مقاسه.</p>
<div class="cr"><span class="cb">{ic("cake")}أضيفي طفلك</span></div>
<div class="perk"><div>{ic("local_shipping")}شحن مجاني</div><div>{ic("redeem")}تغليف هدايا</div><div>{ic("straighten")}تنبيه المقاس</div></div></div></div>

<div class="sec"><div class="vals"><div>{ic("eco")}<b>قطن عضوي</b></div><div>{ic("health_and_safety")}<b>آمن للبشرة</b></div><div>{ic("autorenew")}<b>استبدال 30 يوماً</b></div><div>{ic("payments")}<b>الدفع عند الاستلام</b></div></div></div>
{tabbar(0)}</div>'''


# ---------------- MENU ----------------
MENU = [
    ("01", "child_care", "المواليد والبيبي", "640", [("newborn-knit", "0.4 0.45 1.4", "أطقم الولادة", 86), ("romper-hat", "0.45 0.42 1.5", "بودي وأوفرول", 142), ("sleep-striped", "0.5 0.55 1.2", "ملابس النوم", 74), ("foot-muslin", "0.45 0.5 1.2", "لفّات وبطانيات", 38)]),
    ("02", "girl", "البنات", "1,240", [("tiered-dress", "0.45 0.3 1.3", "فساتين", 318), ("pink-pajamas", "0.5 0.72 2.5", "بيجامات", 112), ("robe-b", "0.5 0.45 1.4", "ملابس الاستحمام", 52), ("striped-tights", "0.5 0.7 1.4", "جوارب طويلة", 48)]),
    ("03", "boy", "الأولاد", "980", [("grey-hoodie", "0.55 0.72 1.3", "هوديز", 154), ("plaid-jacket", "0.55 0.5 1.6", "جاكيتات", 88), ("plaid-shirt", "0.8 0.6 1.6", "قمصان", 132), ("overalls", "0.3 0.7 2.2", "جينز وأوفرول", 76)]),
    ("04", "steps", "الأحذية", "410", [("sparkle-sneakers", "0.55 0.6 1.3", "أحذية رياضية", 146), ("baby-shoes", "0.5 0.62 1.6", "الخطوة الأولى", 58), ("slippers", "0.66 0.84 2.2", "شباشب منزلية", 41)]),
    ("05", "styler", "الإكسسوارات", "560", [("pom-beanie", "0.5 0.42 1.4", "قبعات", 72), ("knit-socks", "0.45 0.5 1.2", "جوارب", 120), ("mittens", "0.24 0.8 2.4", "قفازات", 28), ("straw-hat", "0.55 0.68 1.4", "قبعات الشمس", 36)]),
    ("06", "redeem", "الهدايا", "120", [("gift-pink", "0.72 0.5 1.4", "صناديق المواليد", 34), ("teddy-sweater", "0.6 0.6 1.5", "دمى ناعمة", 40), ("gift-kraft", "0.52 0.5 1.4", "بطاقات هدايا", 12)]),
    ("07", "school", "المدرسة والمناسبات", "380", [("girls-coats", "0.5 0.55 1.2", "العودة للمدارس", 164), ("white-dresses", "0.5 0.68 1.5", "ملابس العيد", 124), ("cupcake", "0.42 0.5 1.4", "أعياد الميلاد", 88)]),
]

def menu():
    rows = ''
    for no, icn, name, cnt, subs in MENU:
        cards = f'<div class="mc all"><div class="im">{ic(icn)}<em>{cnt}<small>قطعة في القسم</small></em></div><b>كل {name}</b><small>عرض الكل</small></div>'
        for img, f, n, c in subs:
            cards += f'<div class="mc">{ph(K(img), f, "im")}<b>{n}</b><small>{c} قطعة</small></div>'
        rows += f'''<div class="mcat"><div class="mch"><div class="l"><span class="no">{no}</span><b>{name}</b><small>{len(subs)} أقسام</small></div><a>الكل{ic("chevron_left")}</a></div>
<div class="hscroll mrow">{cards}</div></div>'''
    ages = ''.join(f'<i><b>{a}</b><small>{u}</small></i>' for a, u in [("0–6", "أشهر"), ("6–24", "شهراً"), ("2–4", "سنوات"), ("4–6", "سنوات"), ("6–9", "سنوات"), ("9–12", "سنة")])
    return f'''<div class="screen" style="padding-bottom:40px">{STATUS}
<div class="grab"></div>
<div class="mhead">{WM}<div class="ibtn">{ic("close")}</div></div>
<div class="search">{ic("search")}<div class="t">ابحثي في كل الأقسام…</div><span class="k">{ic("qr_code_scanner")}امسحي</span></div>
<div class="hscroll mq"><div class="hl">{ic("auto_awesome")}وصل حديثاً</div><div>{ic("percent")}العروض</div><div>{ic("trending_up")}الأكثر مبيعاً</div><div>{ic("straighten")}دليل المقاسات</div></div>
<div class="mage"><div class="mh"><span>تسوّقي حسب العمر</span><span>مقاس <b>{L("98")}</b> لطفلك</span></div><div class="ar">{ages}</div></div>
{rows}
<div class="mfoot">
<div class="mli">{ic("person","l")}<span class="t">حسابي</span><small>سارة محمود</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("receipt_long","l")}<span class="t">طلباتي</span><span class="pill2">قيد التوصيل</span>{ic("chevron_left","c")}</div>
<div class="mli">{ic("favorite","l")}<span class="t">المفضلة</span><small>24 قطعة</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("language","l")}<span class="t">اللغة</span><div class="lang"><i class="on">العربية</i><i>English</i></div></div>
<div class="mli">{ic("support_agent","l")}<span class="t">تواصل معنا</span><small>يومياً 10ص – 10م</small>{ic("chevron_left","c")}</div>
</div>
<div class="mhelp"><div>{ic("chat")}محادثة</div><div>{ic("call")}اتصال</div><div>{ic("mail")}بريد</div></div>
<div class="mver">MINIMO · الإصدار 1.8</div>
<div class="homeind"></div>
</div>'''


# ---------------- LISTING ----------------
def listing():
    bl, sand, cr, gr = '#B9C8D6', '#D9C7AE', '#EEE6D8', '#9BA88F'
    items = [
        pcard(K("newborn-knit"), "0.45 0.45 1.25", "طقم مولود محبوك 3 قطع", yrs("0–6", "أشهر"), "820", None, "جديد", False, ["#9A9A96", cr]),
        pcard(K("baby-flatlay"), "0.5 0.52 2.0", "طقم قطن عضوي أزرق", yrs("0–12", "شهراً"), "890", "1,090", "-18%", True, [bl, sand, gr]),
        pcard(K("sleep-striped"), "0.5 0.55 1.25", "سليب سوت مخطط", yrs("0–9", "أشهر"), "450", None, None, False, ["#C9C9C4", cr]),
        pcard(K("knit-feet"), "0.5 0.25 1.4", "بنطلون محبوك بقدم", yrs("3–12", "شهراً"), "380", None, None, False, [bl, cr]),
        None,
        pcard(K("romper-hat"), "0.45 0.45 1.5", "بودي مطبوع وقبعة شمس", yrs("6–24", "شهراً"), "540", None, None, False, ["#E7EEF5", "#D873A6"]),
        pcard(K("baby-shoes"), "0.5 0.62 1.6", "حذاء الخطوة الأولى", f"مقاس {L('18–21')}", "620", None, "جديد", False, ["#4A4F55", "#E9E6DF"]),
        pcard(K("newborn-mint"), "0.64 0.58 1.6", "منشفة بقبعة للرضّع", yrs("0–24", "شهراً"), "420", None, None, True, ["#A9D8C3", cr]),
        pcard(K("foot-muslin"), "0.45 0.5 1.2", "لفّة موسلين قطنية", "مقاس واحد", "360", "450", "-20%", False, [cr, sand]),
        pcard(K("knit-blanket"), "0.5 0.5 1.15", "بطانية محبوكة ناعمة", f"{L('80×100')} سم", "690", None, None, False, [cr]),
        pcard(K("teddy-sweater"), "0.6 0.6 1.5", "دبدوب بكنزة صوف", "هدية للمولود", "540", None, None, False, ["#C8913F", "#2F5DA0"]),
    ]
    g = ''
    for it in items:
        if it is None:
            g += f'''<div class="promo"><div class="pt"><span class="lat">GIFT BOX</span><b>صندوق المولود الأول</b><small>4 قطع مغلّفة مع بطاقة إهداء</small><span class="cta2">اختاري الصندوق{ic("arrow_back")}</span></div>{ph(K("gift-kraft"), "0.52 0.5 1.25", "pi")}</div>'''
        else:
            g += it
    sz = ''.join(f'<div{" class=on" if s == "3–6M" else ""}>{s}</div>' for s in ["0–3M", "3–6M", "6–9M", "9–12M", "12–18M", "18–24M"])
    return f'''<div class="screen">{STATUS}
<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div class="tt"><b>المواليد والبيبي</b><small>{yrs("0–24", "شهراً")} · 640 قطعة</small></div><div class="ibtn">{ic("shopping_bag")}</div></div>
<div class="hscroll utabs"><div class="on">الكل</div><div>أطقم الولادة<small>86</small></div><div>بودي وأوفرول<small>142</small></div><div>ملابس النوم<small>74</small></div><div>لفّات<small>38</small></div></div>
<div class="fbar"><div class="fbtn">{ic("tune")}<b>تصفية</b><span class="c">2</span></div><div class="fbtn">{ic("swap_vert")}<span>الأحدث أولاً</span></div><div class="fbtn">{ic("view_agenda")}</div></div>
<div class="hscroll szr"><div class="lbl">المقاس</div>{sz}</div>
<div class="atags"><span class="atag">{L("3–6")} أشهر{ic("close")}</span><span class="atag">قطن عضوي{ic("close")}</span><span class="aclear">مسح الكل</span></div>
<div class="rcount"><span><b>128</b> قطعة مناسبة</span><span>مقاس {L("62–68")} سم</span></div>
<div class="grid">{g}</div>
<div class="more"><p>عرضتِ 10 من 128 قطعة</p><div class="prog"><i></i></div><div class="mb">عرض المزيد{ic("expand_more")}</div></div>
{tabbar(1)}</div>'''


# ---------------- PRODUCT ----------------
def product():
    rows = [("0–3 أشهر", "56–62", "3.5–5.5", "62", False), ("3–6 أشهر", "62–68", "5.5–7.5", "68", True), ("6–9 أشهر", "68–74", "7.5–9", "74", False),
            ("9–12 شهراً", "74–80", "9–10.5", "80", False), ("12–18 شهراً", "80–86", "10.5–12", "86", False)]
    tb = ''.join(f'<div class="r{" hl" if h else ""}"><span>{L(a.split()[0])} {a.split()[1]}</span><span class="ltr">{b}</span><span class="ltr">{c}</span><span>{d}</span></div>' for a, b, c, d, h in rows)
    gw = ''.join(f'''<div class="gwc">{ph(K(i), f, "gim")}<div class="gt"><b>{n}</b><small>{s}</small><div class="gp"><span>{p} <small>{CUR}</small></span><i>{ic("add")}</i></div></div></div>''' for i, f, n, s, p in [
        ("knit-blanket", "0.5 0.5 1.3", "بطانية محبوكة ناعمة", f"{L('80×100')} سم", "690"),
        ("pom-beanie", "0.5 0.42 1.5", "قبعة صوف بكرة", yrs("0–12", "شهراً"), "320"),
        ("mittens", "0.24 0.8 2.4", "قفازات الرضّع", "مقاس واحد", "180")])
    also = ''.join([
        pcard(K("newborn-knit"), "0.45 0.45 1.25", "طقم مولود محبوك", yrs("0–6", "أشهر"), "820", None, "جديد", False, ["#9A9A96", "#EEE6D8"]),
        pcard(K("sleep-striped"), "0.5 0.55 1.25", "سليب سوت مخطط", yrs("0–9", "أشهر"), "450", None, None, True, ["#C9C9C4"]),
        pcard(K("romper-hat"), "0.45 0.45 1.5", "بودي مطبوع وقبعة", yrs("6–24", "شهراً"), "540", None, None, False, ["#E7EEF5"]),
        pcard(K("newborn-mint"), "0.64 0.58 1.6", "منشفة بقبعة", yrs("0–24", "شهراً"), "420", None, None, False, ["#A9D8C3"]),
    ])
    return f'''<div class="screen" style="padding-bottom:110px">{STATUS}
<div class="ptop"><div class="ibtn">{ic("arrow_forward")}</div><div class="hicons"><div class="ibtn">{ic("ios_share")}</div><div class="ibtn">{ic("shopping_bag")}</div></div></div>
{ph(K("baby-flatlay"), "0.5 0.5 1.05", "gal", '<span class="gb">' + ic("eco") + 'قطن عضوي 100%</span><span class="gcnt">1 / 6</span><div class="gdots"><i class="on"></i><i></i><i></i><i></i><i></i><i></i></div>')}
<div class="thumbs">{ph(K("baby-flatlay"), "0.5 0.5 1.4", "on")}{ph(K("baby-flatlay"), "0.52 0.55 2.6", "")}{ph(K("baby-flatlay"), "0.4 0.2 3.6", "")}{ph(K("baby-flatlay"), "0.52 0.75 3", "v", '<span>' + ic("play_circle") + '</span>')}<div class="vt">{ic("3d_rotation")}{L("360°")}</div></div>
<div class="pinfo"><div class="bl">MINIMO · ORGANIC BASICS</div>
<h1>طقم قطن عضوي للمولود · 3 قطع</h1><div class="sub">تيشيرت بكباسين على الكتف، بنطلون بخصر مرن وحذاء أول خطوة</div>
<div class="rline">{stars(5)}<b>4.8</b><u>214 تقييماً</u><span>·</span><span>بيع منه 1.2 ألف</span></div>
<div class="pp"><span class="bigp">890 <small>{CUR}</small></span><s>1,090 {CUR}</s><span class="dc">-18%</span></div>
<div class="vat">شامل ضريبة القيمة المضافة · أو 4 دفعات × 223 {CUR}</div></div>

<div class="vsec"><div class="vh"><b>اللون: <span>أزرق ضبابي</span></b></div>
<div class="cchips"><div class="cchip on"><i style="background:#B9C8D6"></i>أزرق ضبابي</div><div class="cchip"><i style="background:#D9C7AE"></i>رملي</div><div class="cchip"><i style="background:#A8B59B"></i>مريمية</div></div></div>

<div class="vsec"><div class="vh"><b>المقاس: <span>{L("3–6")} أشهر</span></b><a>{ic("straighten")}دليل المقاسات</a></div>
<div class="sizes"><div><b>0–3M</b><small>{L("56–62")} سم</small></div><div class="on"><b>3–6M</b><small>{L("62–68")} سم</small></div><div><b>6–9M</b><small>{L("68–74")} سم</small></div><div><b>9–12M</b><small>{L("74–80")} سم</small></div><div class="off"><b>12–18M</b><small>نفد</small></div></div></div>

<div class="blk" style="margin-top:22px"><h4>المقاس حسب العمر <small>الطول بالسم · الوزن بالكجم</small></h4>
<div class="btbl"><div class="r h"><span>العمر</span><span>الطول</span><span>الوزن</span><span>المقاس</span></div>{tb}</div>
<div class="tip">{ic("lightbulb")}<span>الأطفال يكبرون بسرعة في الأشهر الأولى؛ إذا كان وزن طفلك قريباً من الحد الأعلى اختاري المقاس التالي.</span></div></div>

<div class="blk"><h4>الخامة والأمان <small>مختبرة للبشرة الحساسة</small></h4>
<div class="stats"><div><b>100%</b><small>قطن عضوي معتمد</small></div><div><b>180 <small style="display:inline">جم/م²</small></b><small>جيرسيه ناعم قابل للتمدد</small></div><div><b>0</b><small>ملصقات داخلية تحتكّ بالجلد</small></div><div><b>3×</b><small>غسيل مسبق ضد الانكماش</small></div></div>
<ul class="chk">
<li>{ic("check_circle")}<span>كباسين خالية من النيكل<small>مثبّتة ومختبرة ضد الشد</small></span></li>
<li>{ic("check_circle")}<span>صبغات نباتية خالية من الآزو<small>آمنة إذا وضعها الطفل في فمه</small></span></li>
<li>{ic("check_circle")}<span>خياطة مسطّحة من الخارج<small>لا تترك أثراً على الجلد الرقيق</small></span></li>
</ul></div>

<div class="blk"><h4>العناية</h4>
<div class="carel"><div>{ic("local_laundry_service")}غسيل في الغسالة<small>30° · دورة لطيفة</small></div><div>{ic("block")}بدون مُبيّض أو منعّم<small>يحافظ على النعومة</small></div><div>{ic("dry")}تجفيف على حبل<small>بعيداً عن الشمس</small></div><div>{ic("iron")}كيّ بحرارة منخفضة<small>من الجهة الداخلية</small></div></div></div>

<div class="wrapc">{ph(K("gift-kraft"), "0.52 0.5 1.6", "wim")}<div class="wt"><b>غلّفيه كهدية · 45 {CUR}</b><small>علبة وشريطة وبطاقة بخط اليد</small></div><span class="tgl"></span></div>

<div class="dlv">
<div class="dl">{ic("local_shipping")}<div><b>التوصيل غداً داخل القاهرة</b><small>اطلبي خلال 3 ساعات · مجاني فوق 1,500 {CUR}</small></div></div>
<div class="dl">{ic("published_with_changes")}<div><b>استبدال المقاس مجاناً</b><small>خلال 30 يوماً، والقطعة بحالتها الأصلية</small></div></div>
<div class="dl">{ic("verified_user")}<div><b>الدفع عند الاستلام</b><small>أو بالبطاقة والمحافظ والتقسيط</small></div></div>
</div>

<div class="acc">
<div class="ac"><div class="ah">الوصف{ic("remove")}</div><p>طقم أساسي من القطن العضوي الناعم، مصمم لتسهيل تغيير الملابس مع كباسين على الكتف وخصر مرن لا يضغط على البطن.</p></div>
<div class="ac"><div class="ah">محتويات الطقم{ic("add")}</div></div>
<div class="ac"><div class="ah">الشحن والإرجاع{ic("add")}</div></div>
</div>

<div class="rv"><div class="shead" style="padding:0;margin:22px 0 0"><div><span class="n">REVIEWS</span><h3>تقييمات الأمهات</h3></div><a>كل التقييمات{ic("chevron_left")}</a></div>
<div class="rvtop"><div class="rvbig"><b>4.8</b>{stars(5)}<small>214 تقييماً</small></div>
<div class="rkv"><div><span>النعومة<b>4.9</b></span><i><em style="width:98%"></em></i></div><div><span>دقة المقاس<b>4.7</b></span><i><em style="width:94%"></em></i></div><div><span>الثبات بعد الغسيل<b>4.8</b></span><i><em style="width:96%"></em></i></div></div></div>
<div class="rvph">{ph(K("baby-flatlay"), "0.5 0.6 2.4", "")}{ph(K("knit-feet"), "0.5 0.4 1.3", "")}{ph(K("foot-muslin"), "0.45 0.5 1.3", "")}{ph(K("baby-legs"), "0.55 0.5 1.4", "more2")}</div>
<div class="rvq"><div class="wh"><i>ر</i><div><b>رنا الشريف</b><small>اشترت مقاس {L("3–6M")} · منذ أسبوعين</small></div>{stars(5)}</div>
<q>أنعم قطن جربته لبنتي، والكباسين على الكتف سهّلت اللبس جداً. المقاس مضبوط وما انكمش بعد الغسيل.</q>
<div class="tg"><span>مطابق للمقاس</span><span>ناعم جداً</span><span>مشترية مؤكدة</span></div></div></div>

<div class="sec" style="margin-top:28px"><div class="shead"><div><span class="n">COMPLETE THE SET</span><h3>يكتمل معه</h3></div></div>
<div class="hscroll gw">{gw}</div></div>

<div class="sec"><div class="shead"><div><span class="n">YOU MAY ALSO LIKE</span><h3>قد يعجبك أيضاً</h3></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="grid">{also}</div></div>

<div class="sticky"><div class="sp"><small>{L("3–6M")} · أزرق ضبابي</small><b>890 <small>{CUR}</small></b></div><div class="hf">{ic("favorite","fill")}</div><div class="addcart">{ic("shopping_bag")}أضيفي للسلة</div></div>
</div>'''


SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
