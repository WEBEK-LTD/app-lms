from lib import STATUS, ic, ph, stars

FONT = "kufi"
TITLE = "Silica"
CUR = "ر.س"


def L(s):
    return f'<span class="ltr">{s}</span>'


CSS = r"""
:root{--bg:#F4F4F1;--surface:#FFFFFF;--sunk:#ECECE7;--ink:#151714;--ink2:#4C514B;--ink3:#737870;--line:#E2E2DC;
--acc:#0E7A5C;--accT:#0B6E53;--accSoft:#DDF0E8;--onAcc:#FFFFFF;--deep:#141815;--deep2:#1D221E;--tile:#E9EAE5;
--star:#C99A12;--dot:#CFD0C9;--tabbg:rgba(255,255,255,.86);--tabink:#5C6159;--tabline:rgba(0,0,0,.06)}
html.dark{--bg:#0D0F0E;--surface:#161917;--sunk:#1E221F;--ink:#ECEEEA;--ink2:#B3B9B1;--ink3:#8D948B;--line:#262B27;
--acc:#2FB389;--accT:#74DDBB;--accSoft:#11291F;--onAcc:#06140F;--deep:#1A1F1B;--deep2:#232924;--tile:#E7E8E3;
--dot:#323832;--tabbg:rgba(28,32,29,.9);--tabink:#9BA399;--tabline:rgba(255,255,255,.07)}
body{font-family:'Noto Kufi Arabic',sans-serif}
.screen{padding-bottom:120px}
.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
.mono{font-family:'Noto Kufi Arabic',sans-serif;letter-spacing:.02em}

/* header */
.header{height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.wm{display:flex;align-items:center;gap:9px}
.wm .lg{width:36px;height:36px;border-radius:10px;background:var(--ink);display:grid;place-items:center}
.wm b{display:block;font-size:19px;font-weight:700;line-height:1}
.wm small{display:block;font-size:9px;letter-spacing:.38em;color:var(--ink3);margin-top:5px;direction:ltr;text-align:right;font-weight:600}
.hicons{display:flex;gap:4px}
.ib{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;position:relative;color:var(--ink)}
.ib .ms{font-size:24px}
.ib.bx{background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.ib .n{position:absolute;top:6px;left:7px;width:9px;height:9px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 2px var(--bg)}
.ib .nn{position:absolute;top:-2px;left:-2px;min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:var(--onAcc);font-size:10px;font-weight:700;display:grid;place-items:center;padding:0 5px;box-shadow:0 0 0 2px var(--bg)}
.search{margin:6px 16px 0;height:48px;border-radius:12px;background:var(--surface);display:flex;align-items:center;padding:0 14px;gap:10px;box-shadow:0 0 0 1px var(--line)}
.search .ms{font-size:22px;color:var(--ink2)}
.search .t{flex:1;font-size:12.5px;color:var(--ink3)}
.search .k{display:flex;gap:4px}
.search .k i{height:26px;padding:0 8px;border-radius:7px;background:var(--sunk);font-size:10.5px;color:var(--ink2);display:flex;align-items:center}

/* category avatars */
.avs{margin-top:18px;gap:14px}
.av{width:64px;text-align:center}
.av .c{width:64px;height:64px;border-radius:50%;background-color:var(--tile);box-shadow:0 0 0 1px var(--line)}
.av.on .c{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--acc)}
.av span{display:block;font-size:11px;margin-top:8px;color:var(--ink2);white-space:nowrap}
.av.on span{color:var(--ink);font-weight:700}

/* hero: split card */
.hero{margin-top:20px;gap:10px}
.hc{width:330px;height:208px;border-radius:20px;overflow:hidden;display:flex;background:var(--deep);color:#fff;flex:0 0 auto}
.hc .tx{width:158px;padding:18px 16px 16px 6px;display:flex;flex-direction:column;flex:0 0 auto}
.hc .tx .k{font-size:10px;font-weight:600;color:#86E3C3;letter-spacing:.02em}
.hc .tx h2{font-size:17px;line-height:1.55;font-weight:700;margin-top:6px}
.hc .tx p{font-size:10.5px;color:#B5BCB4;margin-top:4px;line-height:1.6}
.hc .tx .cta{margin-top:auto;align-self:flex-start;height:36px;padding:0 13px;border-radius:10px;background:var(--acc);color:#fff;display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600}
html.dark .hc .tx .cta{color:#06140F}
.hc .tx .cta .ms{font-size:16px}
.hc .im{flex:1;background-color:#222;border-radius:16px;margin:6px 0 6px 6px;position:relative}
.hc .im .pr{position:absolute;bottom:10px;left:10px;height:28px;padding:0 9px;border-radius:9px;background:rgba(255,255,255,.94);color:#151714;font-size:11px;font-weight:700;display:flex;align-items:center;gap:3px}
.hc .im .pr small{font-size:9px;font-weight:500;color:#4C514B}
.bars2{display:flex;gap:4px;margin:12px 16px 0}
.bars2 i{height:3px;flex:1;border-radius:2px;background:var(--dot)}
.bars2 i.on{background:var(--ink)}

/* section head with index */
.sec{margin-top:32px}
.sh{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:14px}
.sh .ix{font-size:10.5px;font-weight:700;color:var(--accT);letter-spacing:.08em;direction:ltr;display:block;text-align:right}
.sh h3{font-size:17px;font-weight:700;margin-top:2px}
.sh a{font-size:11.5px;color:var(--ink);font-weight:600;display:flex;align-items:center;gap:2px;border-bottom:1.5px solid var(--ink);padding-bottom:1px}
.sh a .ms{font-size:16px}

/* finder */
.finder{margin:0 16px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:16px}
.finder .q{font-size:13px;font-weight:600}
.finder .q small{display:block;font-size:10.5px;color:var(--ink3);font-weight:400;margin-top:2px}
.fopts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.fo{height:74px;border-radius:14px;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:10.5px;color:var(--ink2);box-shadow:0 0 0 1px var(--line)}
.fo .ms{font-size:24px;color:var(--ink)}
.fo.on{background:var(--accSoft);box-shadow:0 0 0 1.5px var(--acc);color:var(--ink);font-weight:600}
.fo.on .ms{color:var(--accT)}
.brange{margin-top:14px}
.brange .bl{display:flex;justify-content:space-between;font-size:11px;color:var(--ink3)}
.brange .bl b{color:var(--ink);font-weight:600}
.trk{position:relative;height:22px;margin-top:6px}
.trk:before{content:'';position:absolute;top:10px;left:0;right:0;height:3px;border-radius:2px;background:var(--sunk)}
.trk i{position:absolute;top:10px;right:22%;left:38%;height:3px;background:var(--acc);border-radius:2px}
.trk em{position:absolute;top:2px;width:18px;height:18px;border-radius:50%;background:var(--surface);box-shadow:0 0 0 2px var(--acc),0 2px 6px rgba(0,0,0,.15)}
.finder .go{margin-top:12px;height:46px;border-radius:12px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;font-weight:600}
.finder .go .ms{font-size:18px}

/* spotlight */
.spot{margin:0 16px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);overflow:hidden}
.spot .si{height:186px;background-color:var(--tile);position:relative}
.spot .si .bd{position:absolute;top:12px;right:12px;height:26px;padding:0 9px;border-radius:8px;background:var(--ink);color:var(--bg);font-size:10.5px;font-weight:600;display:flex;align-items:center}
.spot .sb{padding:14px 16px 16px}
.spot .sb small.k{font-size:10.5px;color:var(--ink3)}
.spot .sb h4{font-size:17px;font-weight:700;margin-top:2px}
.sstats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:12px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.sstats div{padding:10px 0;text-align:center;border-left:1px solid var(--line)}
.sstats div:last-child{border-left:0}
.sstats b{display:block;font-size:15px;font-weight:700;direction:ltr}
.sstats small{display:block;font-size:10px;color:var(--ink3);margin-top:1px}
.spot .sf{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
.pp{font-size:19px;font-weight:700;line-height:1.2;white-space:nowrap}
.pp small{font-size:11px;color:var(--ink2);font-weight:500}
.pp s{display:block;font-size:11px;color:var(--ink3);font-weight:400}
.btn{height:44px;padding:0 16px;border-radius:12px;background:var(--acc);color:var(--onAcc);display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;white-space:nowrap}
.btn .ms{font-size:19px}
.btn.o{background:transparent;color:var(--ink);box-shadow:0 0 0 1.3px var(--ink)}

/* portrait cards (gaming) */
.ports{gap:10px}
.port{width:148px;height:200px;border-radius:18px;position:relative;overflow:hidden;background-color:var(--tile)}
.port .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(8,10,9,.82) 0%,rgba(8,10,9,.2) 52%,rgba(8,10,9,0) 70%)}
.port .pt{position:absolute;right:12px;left:12px;bottom:12px;color:#fff}
.port .pt b{display:block;font-size:13px;font-weight:700}
.port .pt small{display:block;font-size:10px;color:#D3D8D1;margin-top:2px}

/* deals list rows */
.rows{margin:0 16px;background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line);padding:4px 12px}
.rw{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.rw:last-child{border:0}
.rw .ri{width:78px;height:78px;border-radius:14px;background-color:var(--tile);flex:0 0 auto;position:relative}
.rw .ri .o{position:absolute;top:6px;right:6px;font-size:9.5px;font-weight:700;background:var(--ink);color:var(--bg);padding:2px 6px;border-radius:6px;direction:ltr}
.rw .rt{flex:1;min-width:0}
.rw .rt b{display:block;font-size:12.5px;font-weight:600}
.rw .rt small{display:block;font-size:10.5px;color:var(--ink3);margin-top:2px}
.rw .rt .p{font-size:14px;font-weight:700;margin-top:5px;display:flex;align-items:baseline;gap:6px}
.rw .rt .p small{display:inline;margin:0;font-size:10px;color:var(--ink2);font-weight:500}
.rw .rt .p s{font-size:10.5px;color:var(--ink3);font-weight:400}
.rw .ad{width:36px;height:36px;border-radius:50%;background:var(--ink);color:var(--bg);display:grid;place-items:center;flex:0 0 auto}
.rw .ad .ms{font-size:20px}

/* tiers */
.tiers{gap:10px}
.tier{width:214px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:8px 8px 14px}
.tier.pro{background:var(--deep);color:#fff;box-shadow:none}
.tier .ti{height:110px;border-radius:14px;background-color:var(--tile)}
.tier .th{display:flex;justify-content:space-between;align-items:center;padding:12px 6px 0}
.tier .th b{font-size:14px;font-weight:700}
.tier .th span{font-size:10px;font-weight:600;color:var(--accT);background:var(--accSoft);padding:3px 8px;border-radius:7px}
.tier.pro .th span{background:rgba(255,255,255,.1);color:#86E3C3}
.tier ul{list-style:none;padding:8px 6px 0}
.tier li{display:flex;justify-content:space-between;font-size:10.5px;padding:5px 0;border-bottom:1px dashed var(--line);color:var(--ink2)}
.tier.pro li{border-color:rgba(255,255,255,.1);color:#B5BCB4}
.tier li b{color:var(--ink);font-weight:600}
.tier.pro li b{color:#fff}
.tier .fps{display:flex;align-items:center;gap:6px;margin:10px 6px 0;font-size:10.5px;color:var(--ink3)}
.tier.pro .fps{color:#B5BCB4}
.tier .fps b{font-size:16px;color:var(--ink);font-weight:700}
.tier.pro .fps b{color:#fff}
.tier .tp{display:flex;align-items:center;justify-content:space-between;margin:10px 6px 0}
.tier .tp .pp{font-size:16px}
.tier.pro .tp .pp small{color:#B5BCB4}
.tier .tp i{width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--bg);display:grid;place-items:center}
.tier.pro .tp i{background:var(--acc);color:#fff}
html.dark .tier.pro .tp i{color:#06140F}
.tier .tp i .ms{font-size:18px}

/* grid cards */
.grid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:20px 12px}
.pc{position:relative}
.pc .pi{height:168px;border-radius:16px;background-color:var(--tile);position:relative;overflow:hidden}
.pc .fav{position:absolute;top:8px;left:8px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.94);display:grid;place-items:center}
.pc .fav .ms{font-size:18px;color:#151714}
.pc .fav.on .ms{color:#0E7A5C;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.pc .bdg{position:absolute;top:10px;right:10px;font-size:9.5px;font-weight:700;background:#151714;color:#fff;border-radius:6px;padding:3px 7px}
.pc .bdg.s{background:#0E7A5C;direction:ltr}
.pc .br{font-size:9.5px;font-weight:700;letter-spacing:.14em;color:var(--ink3);margin-top:10px;direction:ltr;text-align:right}
.pc .nm{font-size:12.5px;font-weight:600;margin-top:2px;line-height:1.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .sp{font-size:10.5px;color:var(--ink3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .rt{display:flex;align-items:center;gap:3px;font-size:10.5px;color:var(--ink3);margin-top:4px}
.pc .rt .ms{font-size:13px;color:var(--star)}
.pc .rt b{color:var(--ink);font-weight:600}
.pc .pf{display:flex;align-items:flex-end;justify-content:space-between;margin-top:7px}
.pc .pf .pp{font-size:14.5px}
.pc .pf .ad{width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--bg);display:grid;place-items:center;flex:0 0 auto}
.pc .pf .ad .ms{font-size:19px}
.hrow{gap:12px}
.hrow .pc{width:160px}

/* trust strip */
.trust{margin:0 16px;display:grid;grid-template-columns:repeat(3,1fr);background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line);padding:14px 6px}
.tr{text-align:center;padding:0 4px;border-left:1px solid var(--line)}
.tr:last-child{border-left:0}
.tr .ms{font-size:24px;color:var(--accT)}
.tr b{display:block;font-size:11px;font-weight:600;margin-top:6px;line-height:1.5}
.tr small{display:block;font-size:9.5px;color:var(--ink3);margin-top:2px;line-height:1.5}
.soon{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;color:var(--ink2);background:var(--sunk);padding:3px 8px;border-radius:7px;white-space:nowrap}
.soon .ms{font-size:13px}

/* tab bar */
.tabbar{position:absolute;left:16px;right:16px;bottom:28px;height:66px;border-radius:22px;background:var(--tabbg);backdrop-filter:blur(22px) saturate(1.5);box-shadow:0 0 0 1px var(--tabline),0 12px 30px rgba(0,0,0,.12);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;padding:0 6px}
html.dark .tabbar{box-shadow:0 0 0 1px var(--tabline),0 14px 30px rgba(0,0,0,.5)}
.tab{display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--tabink);position:relative;height:54px;justify-content:center}
.tab .ms{font-size:24px}
.tab span:not(.ms){font-size:9.5px}
.tab.on{color:var(--ink)}
.tab.on span:not(.ms){font-weight:700}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;color:var(--accT)}
.tab.on:after{content:'';position:absolute;bottom:0;width:18px;height:3px;border-radius:2px;background:var(--acc)}
.tab .bd{position:absolute;top:4px;left:50%;margin-left:-22px;min-width:18px;height:18px;border-radius:9px;background:var(--ink);color:var(--bg);font-size:10px;font-weight:700;display:grid;place-items:center;padding:0 5px}
.homeind{background:var(--ink)}

/* shared */
.topbar{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;gap:8px}
.topbar .tt{flex:1;min-width:0}
.topbar .tt b{display:block;font-size:17px;font-weight:700;line-height:1.3}
.topbar .tt small{display:block;font-size:10.5px;color:var(--ink3);margin-top:2px}
.topbar .grp{display:flex;gap:2px}

/* MENU */
.mtop{display:flex;align-items:center;justify-content:space-between;padding:4px 16px 0;height:60px}
.mq{gap:8px;margin-top:14px}
.mqc{height:38px;padding:0 13px 0 15px;border-radius:19px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;white-space:nowrap}
.mqc .ms{font-size:18px;color:var(--accT)}
.mqc.on{background:var(--ink);color:var(--bg);box-shadow:none}
.mqc.on .ms{color:var(--bg)}
.mcat{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.mcat.first{border-top:0;padding-top:0}
.mh{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:12px}
.mh .l{display:flex;align-items:baseline;gap:8px}
.mh .l .ix{font-size:10.5px;font-weight:700;color:var(--accT);direction:ltr}
.mh b{font-size:15px;font-weight:700}
.mh small{font-size:10.5px;color:var(--ink3)}
.mh .ar{width:30px;height:30px;border-radius:50%;box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;color:var(--ink2)}
.mh .ar .ms{font-size:18px}
.mrow{gap:10px}
.mc{width:104px}
.mc .im{height:104px;border-radius:16px;background-color:var(--tile)}
.mc b{display:block;font-size:11.5px;font-weight:600;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mc small{display:block;font-size:10px;color:var(--ink3);margin-top:1px}
.mc.all .im{background:var(--accSoft);box-shadow:inset 0 0 0 1px var(--acc);display:flex;flex-direction:column;justify-content:space-between;padding:11px;color:var(--accT)}
.mc.all .im .ms{font-size:26px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.mc.all .im em{font-size:19px;font-weight:700;color:var(--ink);line-height:1}
.mc.all .im em small{display:block;font-size:9.5px;color:var(--ink2);font-weight:500;margin-top:4px}
.macc{margin:28px 16px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ma{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:16px;padding:12px;display:flex;align-items:center;gap:10px}
.ma .ms{font-size:22px;color:var(--ink)}
.ma b{display:block;font-size:12px;font-weight:600}
.ma small{display:block;font-size:10px;color:var(--ink3);margin-top:1px}
.ma.w{grid-column:1/-1;justify-content:space-between}
.ma.w .l{display:flex;align-items:center;gap:10px}
.seg2{display:flex;background:var(--sunk);border-radius:10px;padding:3px}
.seg2 i{font-size:11px;padding:5px 12px;border-radius:8px;color:var(--ink2)}
.seg2 i.on{background:var(--surface);color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.mcontact{margin:8px 16px 0;border-radius:16px;background:var(--deep);color:#fff;padding:14px;display:flex;align-items:center;gap:12px}
.mcontact .ms.l{font-size:26px;color:#86E3C3}
.mcontact .t{flex:1}
.mcontact b{display:block;font-size:12.5px;font-weight:600}
.mcontact small{display:block;font-size:10px;color:#B5BCB4;margin-top:1px}
.mcontact .bt{display:flex;gap:6px}
.mcontact .bt i{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.1);display:grid;place-items:center}
.mcontact .bt i .ms{font-size:19px}
.mver{text-align:center;font-size:10px;color:var(--ink3);margin-top:16px;letter-spacing:.06em}

/* LISTING */
.subs{gap:14px;margin-top:6px}
.sub{width:58px;text-align:center}
.sub .c{width:58px;height:58px;border-radius:50%;background-color:var(--tile)}
.sub.on .c{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--acc)}
.sub span{display:block;font-size:10.5px;margin-top:6px;color:var(--ink2);white-space:nowrap}
.sub.on span{color:var(--ink);font-weight:700}
.tools{display:flex;align-items:center;margin:16px 16px 0;height:44px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.tools div{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11.5px;font-weight:600;height:100%;border-left:1px solid var(--line)}
.tools div:last-child{border-left:0}
.tools .ms{font-size:18px}
.tools .c{min-width:17px;height:17px;border-radius:9px;background:var(--acc);color:var(--onAcc);font-size:9.5px;display:grid;place-items:center;padding:0 4px}
.atags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 16px 0}
.atag{height:28px;padding:0 6px 0 10px;border-radius:14px;box-shadow:inset 0 0 0 1px var(--ink);font-size:10.5px;font-weight:600;display:flex;align-items:center;gap:4px}
.atag .ms{font-size:14px}
.aclear{font-size:10.5px;color:var(--accT);font-weight:600;display:flex;align-items:center;margin-right:4px}
.rc{display:flex;justify-content:space-between;align-items:center;margin:18px 16px 12px;font-size:11px;color:var(--ink3)}
.rc b{color:var(--ink);font-weight:700}
.promo{grid-column:1/-1;border-radius:18px;background:var(--deep);display:flex;overflow:hidden;color:#fff;height:150px}
.promo .tx{flex:1;padding:16px;display:flex;flex-direction:column}
.promo .tx small{font-size:10px;color:#86E3C3;font-weight:600}
.promo .tx b{font-size:15px;font-weight:700;line-height:1.55;margin-top:4px}
.promo .tx .cta{margin-top:auto;align-self:flex-start;height:32px;padding:0 12px;border-radius:9px;background:var(--acc);color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px}
html.dark .promo .tx .cta{color:#06140F}
.promo .tx .cta .ms{font-size:15px}
.promo .im{width:140px;background-color:#222;margin:6px;border-radius:14px}
.more{margin:26px 16px 0;display:flex;flex-direction:column;align-items:center}
.more p{font-size:10.5px;color:var(--ink3)}
.more .mb{margin-top:10px;height:46px;width:100%;border-radius:12px;box-shadow:0 0 0 1.3px var(--ink);display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;font-weight:600}
.more .mb .ms{font-size:18px}

/* PRODUCT */
.pscreen{padding-bottom:112px}
.gal{height:336px;margin:0 16px;border-radius:22px;background-color:var(--tile);position:relative;overflow:hidden}
.gal .gt{position:absolute;top:12px;right:12px;left:12px;display:flex;justify-content:space-between}
.gal .gt .bd{height:28px;padding:0 10px;border-radius:8px;background:rgba(20,24,21,.78);color:#fff;font-size:10.5px;font-weight:600;display:flex;align-items:center;gap:4px}
.gal .gt .bd .ms{font-size:15px;color:#86E3C3}
.gal .gt .fv{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.94);display:grid;place-items:center;color:#0E7A5C}
.gal .gt .fv .ms{font-size:20px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.gal .gb{position:absolute;bottom:12px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:center}
.gal .gb .dt{display:flex;gap:4px}
.gal .gb .dt i{width:18px;height:3px;border-radius:2px;background:rgba(255,255,255,.45)}
.gal .gb .dt i.on{background:#fff;width:28px}
.gal .gb .cn{font-size:10.5px;color:#fff;background:rgba(20,24,21,.6);padding:3px 8px;border-radius:7px;direction:ltr}
.th2{display:flex;gap:8px;margin:10px 16px 0}
.th2 div{flex:1;height:58px;border-radius:12px;background-color:var(--tile);position:relative}
.th2 div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--acc)}
.pin{padding:18px 16px 0}
.pin .br{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:var(--ink3)}
.pin .br b{font-size:10px;font-weight:700;letter-spacing:.18em;color:var(--ink);direction:ltr}
.pin h1{font-size:21px;font-weight:700;line-height:1.5;margin-top:6px}
.pin .sb{font-size:11.5px;color:var(--ink2);margin-top:2px;line-height:1.7}
.pin .rr{display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;color:var(--ink3)}
.pin .rr .stars{display:flex;color:var(--star)}
.pin .rr .stars .ms{font-size:15px}
.pin .rr b{color:var(--ink);font-weight:700}
.pin .rr .dv{width:1px;height:12px;background:var(--line)}
.pin .rr .ok{color:var(--accT);font-weight:600;display:flex;align-items:center;gap:3px}
.pin .rr .ok .ms{font-size:15px}
.prc{display:flex;align-items:center;justify-content:space-between;margin:14px 16px 0;padding:14px;border-radius:16px;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.prc .pp{font-size:24px}
.prc .pp s{display:inline;margin-right:6px;font-size:12px}
.prc .off{font-size:11px;font-weight:700;color:var(--onAcc);background:var(--acc);padding:4px 8px;border-radius:7px;direction:ltr;unicode-bidi:isolate;display:inline-block}
.prc .tx{font-size:10px;color:var(--ink3);margin-top:4px}
.prc .r{text-align:left}
.prc .r .soon{margin-top:6px}
.vs{margin:20px 16px 0}
.vs .vh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
.vs .vh b{font-size:12.5px;font-weight:700}
.vs .vh b span{font-weight:400;color:var(--ink2)}
.vs .vh small{font-size:10.5px;color:var(--ink3)}
.lst{display:flex;flex-direction:column;gap:8px}
.lo{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.lo .rd{width:20px;height:20px;border-radius:50%;box-shadow:inset 0 0 0 1.6px var(--ink3);flex:0 0 auto}
.lo.on{box-shadow:0 0 0 1.6px var(--acc);background:var(--accSoft)}
.lo.on .rd{box-shadow:inset 0 0 0 6px var(--acc)}
.lo .t{flex:1}
.lo .t b{display:block;font-size:12px;font-weight:600;direction:ltr;text-align:right}
.lo .t small{display:block;font-size:10px;color:var(--ink3);margin-top:1px}
.lo .d{font-size:11px;font-weight:600;white-space:nowrap}
.lo .d.inc{color:var(--accT)}
.chs{display:flex;gap:8px}
.chs div{flex:1;height:44px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;font-weight:600}
.chs div small{font-size:9.5px;color:var(--ink3);font-weight:500}
.chs div.on{box-shadow:0 0 0 1.6px var(--acc);background:var(--accSoft)}
.perf{margin:20px 16px 0;border-radius:20px;background:var(--deep);color:#fff;padding:16px}
.perf h4{font-size:15px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.perf h4 small{font-size:10px;color:#B5BCB4;font-weight:400}
.pg{margin-top:12px;display:flex;flex-direction:column;gap:10px}
.pgi{display:grid;grid-template-columns:96px 1fr 58px;align-items:center;gap:10px;font-size:11px}
.pgi span{color:#C9CEC7}
.pgi i{height:8px;border-radius:4px;background:rgba(255,255,255,.08);display:block;overflow:hidden}
.pgi i em{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#2FB389,#74DDBB)}
.pgi b{font-weight:700;direction:ltr;text-align:left}
.perf .nt{font-size:9.5px;color:#959C93;margin-top:12px}
.specs{margin:12px 16px 0;background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line);padding:6px 16px}
.specs h4{font-size:15px;font-weight:700;padding:10px 0 4px;display:flex;justify-content:space-between;align-items:center}
.specs h4 small{font-size:10px;color:var(--ink3);font-weight:400}
.sr{display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)}
.sr:last-child{border:0}
.sr .ms{font-size:20px;color:var(--ink2);margin-top:1px}
.sr .k{width:74px;font-size:11px;color:var(--ink3);flex:0 0 auto;padding-top:1px}
.sr .v{flex:1;font-size:11.5px;font-weight:600;line-height:1.6}
.sr .v small{display:block;font-size:10px;color:var(--ink3);font-weight:400}
.cmpc{margin:12px 16px 0;background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line);padding:16px}
.cmpc h4{font-size:15px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.cmpc h4 a{font-size:11px;color:var(--accT);font-weight:600}
.cmx{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.cmi{border-radius:14px;padding:8px;background:var(--bg);box-shadow:0 0 0 1px var(--line)}
.cmi.me{box-shadow:0 0 0 1.6px var(--acc)}
.cmi i{display:block;height:74px;border-radius:10px;background-color:var(--tile)}
.cmi b{display:block;font-size:11.5px;font-weight:700;margin-top:8px}
.cmi .kv{display:flex;justify-content:space-between;font-size:10.5px;padding:5px 0;border-bottom:1px dashed var(--line);color:var(--ink3)}
.cmi .kv:last-child{border:0}
.cmi .kv em{color:var(--ink);font-weight:600;direction:ltr}
.cmi .kv em.w{color:var(--accT)}
.vsx{display:flex;justify-content:center;margin:-2px 0}
.war{margin:12px 16px 0;background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line);padding:16px}
.war h4{font-size:15px;font-weight:700}
.wl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.wc{border-radius:14px;padding:12px 10px;background:var(--bg);box-shadow:0 0 0 1px var(--line);text-align:center}
.wc.on{box-shadow:0 0 0 1.6px var(--acc);background:var(--accSoft)}
.wc b{display:block;font-size:20px;font-weight:700}
.wc span{display:block;font-size:10px;color:var(--ink2)}
.wc em{display:block;font-size:10.5px;font-weight:700;margin-top:8px;color:var(--ink);white-space:nowrap}
.wc.on em{color:var(--accT)}
.war .wn{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:10.5px;color:var(--ink2)}
.war .wn .ms{font-size:18px;color:var(--accT)}
.dlv{margin:12px 16px 0;border-radius:20px;box-shadow:0 0 0 1px var(--line);background:var(--surface);display:grid;grid-template-columns:repeat(3,1fr);padding:14px 4px}
.dlv div{text-align:center;padding:0 6px;border-left:1px solid var(--line)}
.dlv div:last-child{border:0}
.dlv .ms{font-size:22px;color:var(--accT)}
.dlv b{display:block;font-size:11px;font-weight:600;margin-top:6px}
.dlv small{display:block;font-size:9.5px;color:var(--ink3);margin-top:2px;line-height:1.5}
.acc{margin:12px 16px 0}
.ac{display:flex;justify-content:space-between;align-items:center;padding:15px 2px;border-bottom:1px solid var(--line);font-size:13px;font-weight:600}
.ac .ms{font-size:20px;color:var(--ink3)}
.ac.op{display:block;border-bottom:1px solid var(--line)}
.ac.op .h{display:flex;justify-content:space-between;align-items:center}
.ac.op p{font-size:11.5px;color:var(--ink2);font-weight:400;line-height:1.9;margin-top:8px}
.rvb{margin:0 16px;background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line);padding:16px}
.rvh{display:flex;align-items:center;gap:14px}
.rvh .big{font-size:40px;font-weight:700;line-height:1}
.rvh .s{flex:1}
.rvh .s .stars{display:flex;color:var(--star)}
.rvh .s .stars .ms{font-size:16px}
.rvh .s small{display:block;font-size:10.5px;color:var(--ink3);margin-top:3px}
.rvh .rec{text-align:center;padding:8px 10px;border-radius:12px;background:var(--accSoft)}
.rvh .rec b{display:block;font-size:16px;font-weight:700;color:var(--accT);direction:ltr}
.rvh .rec small{display:block;font-size:9px;color:var(--ink2)}
.asp{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin-top:14px}
.asp div{font-size:10.5px;color:var(--ink2)}
.asp div p{display:flex;justify-content:space-between}
.asp div p b{color:var(--ink);font-weight:700}
.asp div i{display:block;height:4px;border-radius:2px;background:var(--sunk);margin-top:4px;overflow:hidden}
.asp div i em{display:block;height:100%;background:var(--acc)}
.rph{display:flex;gap:8px;margin-top:14px}
.rph div{flex:1;height:74px;border-radius:12px;background-color:var(--tile);position:relative}
.rph div.m:after{content:'+38';direction:ltr;position:absolute;inset:0;border-radius:12px;background:rgba(20,24,21,.6);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700}
.rq{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.rq .w{display:flex;align-items:center;gap:8px}
.rq .w i{width:30px;height:30px;border-radius:50%;background:var(--ink);color:var(--bg);display:grid;place-items:center;font-size:12px;font-weight:700}
.rq .w b{display:block;font-size:12px;font-weight:600}
.rq .w small{display:block;font-size:10px;color:var(--ink3)}
.rq .w .stars{margin-right:auto;display:flex;color:var(--star)}
.rq .w .stars .ms{font-size:13px}
.rq p{font-size:11.5px;line-height:1.9;margin-top:8px}
.bnd{margin:0 16px;background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line);padding:12px}
.bit{display:flex;gap:8px;align-items:center}
.bit .b{flex:1;text-align:center}
.bit .b i{display:block;height:84px;border-radius:12px;background-color:var(--tile)}
.bit .b b{display:block;font-size:10.5px;font-weight:600;margin-top:6px;line-height:1.5}
.bit .b span{display:block;font-size:11px;font-weight:700;margin-top:1px}
.bit .pl{color:var(--ink3);font-size:18px}
.bnd .bf{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
.bnd .bf>div>small{display:block;font-size:10px;color:var(--ink3)}
.bnd .bf .pp{font-size:16px}
.bnd .bf .sv{font-size:10px;font-weight:700;color:var(--accT);background:var(--accSoft);padding:3px 8px;border-radius:7px;margin-right:6px}
.sticky{position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:var(--surface);box-shadow:0 -1px 0 var(--line),0 -10px 30px rgba(0,0,0,.06);display:flex;align-items:center;gap:10px}
html.dark .sticky{box-shadow:0 -1px 0 var(--line),0 -10px 30px rgba(0,0,0,.45)}
.sticky .tp{flex:0 0 auto}
.sticky .tp>small{display:block;font-size:9.5px;color:var(--ink3)}
.sticky .tp .pp{font-size:17px}
.sticky .add{flex:1;height:52px;border-radius:14px;background:var(--acc);color:var(--onAcc);display:flex;align-items:center;justify-content:center;gap:7px;font-size:13.5px;font-weight:700}
.sticky .add .ms{font-size:20px}
.sticky .cm{width:52px;height:52px;border-radius:14px;box-shadow:0 0 0 1px var(--line);display:grid;place-items:center}
.sticky .cm .ms{font-size:22px}
"""

LOGO = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="3" stroke="var(--bg)" stroke-width="1.8"/><rect x="7.2" y="7.2" width="5.6" height="5.6" rx="1" fill="#2FB389"/><path d="M7 1v2M10 1v2M13 1v2M7 17v2M10 17v2M13 17v2M1 7h2M1 10h2M1 13h2M17 7h2M17 10h2M17 13h2" stroke="var(--bg)" stroke-width="1.5" stroke-linecap="round"/></svg>'


def wm():
    return f'<div class="wm"><div class="lg">{LOGO}</div><div><b>سيليكا</b><small>SILICA</small></div></div>'


def pc(img, f, brand, name, spec, price, old=None, badge=None, fav=False, rate=None, cnt=None):
    b = ''
    if badge:
        b = f'<span class="bdg s">{badge}</span>' if badge.startswith('-') else f'<span class="bdg">{badge}</span>'
    r = f'<div class="rt">{ic("star","fill")}<b>{rate}</b>' + (f' · {cnt} تقييماً' if cnt else '') + '</div>' if rate else ''
    pr = f'<div class="pp">{price} <small>{CUR}</small>' + (f'<s>{old} {CUR}</s>' if old else '') + '</div>'
    return f'''<div class="pc">{ph(img, f, "pi", b + f'<div class="fav{" on" if fav else ""}">{ic("favorite")}</div>')}
<div class="br">{brand}</div><div class="nm">{name}</div><div class="sp">{spec}</div>{r}
<div class="pf">{pr}<div class="ad">{ic("add")}</div></div></div>'''


def tabbar(active=0):
    tabs = [("home", "الرئيسية"), ("category", "المتجر"), ("shopping_bag", "السلة"), ("receipt_long", "طلباتي"), ("account_circle", "حسابي")]
    out = ''
    for i, (n, l) in enumerate(tabs):
        bd = '<i class="bd">3</i>' if n == 'shopping_bag' else ''
        out += f'<div class="tab{" on" if i == active else ""}">{ic(n)}<span>{l}</span>{bd}</div>'
    return f'<div class="tabbar">{out}</div><div class="homeind"></div>'


def sh(ix, title, link=None):
    a = f'<a>{link}{ic("arrow_back")}</a>' if link else ''
    return f'<div class="sh"><div><span class="ix">{ix}</span><h3>{title}</h3></div>{a}</div>'


# ---------------- HOME ----------------
def home():
    av = [("c/lap-plant.jpg", "0.5 0.55 1.6", "لابتوب", True), ("c/setup-purple.jpg", "0.62 0.5 2.2", "تجميعات", False), ("c/monitor-studio.jpg", "0.5 0.4 1.9", "شاشات", False),
          ("c/ram-studio.jpg", "0.7 0.55 1.9", "قطع", False), ("c/kb-rgb.jpg", "0.5 0.55 1.6", "كيبورد", False), ("c/pad-blue.jpg", "0.5 0.66 2.0", "ألعاب", False),
          ("c/hp-white.jpg", "0.5 0.55 2.2", "سماعات", False)]
    avs = ''.join(f'<div class="av{" on" if on else ""}">{ph(a, f, "c")}<span>{n}</span></div>' for a, f, n, on in av)
    h1 = f'''<div class="hc"><div class="tx"><span class="k">تجميعات {L("2026")}</span><h2>تجميعات ألعاب<br>جاهزة ومُختبرة</h2><p>بطاقة {L("GX 470")} وذاكرة {L("32GB")}</p><span class="cta">اكتشف{ic("arrow_back")}</span></div>
{ph("c/setup-purple.jpg","0.62 0.55 1.25","im",f'<span class="pr">من 6,490 <small>{CUR}</small></span>')}</div>'''
    h2 = f'''<div class="hc"><div class="tx"><span class="k">جديد</span><h2>لوحات مفاتيح<br>بإضاءة هادئة</h2></div>{ph("c/kb-backlit.jpg","0.5 0.5 1.2","im")}</div>'''
    ports = [("c/pad-hands.jpg", "0.5 0.55 1.2", "أذرع التحكم", "من 189 " + CUR), ("c/arcade.jpg", "0.35 0.45 1.2", "أذرع آركيد", "من 420 " + CUR),
             ("c/hp-dark.jpg", "0.55 0.5 1.2", "سماعات اللعب", "من 249 " + CUR), ("c/pad-duo.jpg", "0.55 0.55 1.3", "اللعب الجماعي", "إكسسوارات مزدوجة")]
    pt = ''.join(f'<div class="port" data-src="img/{a}" data-f="{f}"><div class="sc"></div><div class="pt"><b>{n}</b><small>{s}</small></div></div>' for a, f, n, s in ports)
    rws = [("c/ram-dark.jpg", "0.62 0.6 1.3", "ذاكرة لابتوب «فلكس» 16GB", f"{L('DDR5 · 5600MHz')}", "279", "349", "-20%"),
           ("c/socket-silver.jpg", "0.42 0.45 1.3", "معالج «كور» N5 بـ8 أنوية", f"حتى {L('4.9GHz')} · مقبس {L('AM-X')}", "899", "1,050", "-14%"),
           ("c/cooler.jpg", "0.38 0.5 1.2", "مبرّد هوائي «تيار» برو", f"{L('120mm')} · هادئ حتى {L('22dB')}", "319", "379", "-16%"),
           ("c/ssd-kit.jpg", "0.68 0.5 1.6", "تخزين محمول «أرشيف» 2TB", f"{L('USB-C 10Gbps')} · ألمنيوم", "649", "799", "-19%")]
    rw = ''.join(f'''<div class="rw">{ph(a, f, "ri", f'<span class="o">{o}</span>')}<div class="rt"><b>{n}</b><small>{s}</small><div class="p">{p} <small>{CUR}</small><s>{old}</s></div></div><div class="ad">{ic("add")}</div></div>''' for a, f, n, s, p, old, o in rws)
    tiers = [("", "c/mb-board.jpg", "0.5 0.5 1.2", "أساسي", "1080p", [("المعالج", "N5"), ("الرسوميات", "GX 450"), ("الذاكرة", "16GB")], "120", "4,290"),
             (" pro", "c/setup-purple.jpg", "0.6 0.5 1.4", "متقدم", "1440p", [("المعالج", "N7"), ("الرسوميات", "GX 470"), ("الذاكرة", "32GB")], "165", "6,490"),
             ("", "c/ram-slots.jpg", "0.4 0.5 1.1", "احترافي", "4K", [("المعالج", "N9"), ("الرسوميات", "GX 490"), ("الذاكرة", "64GB")], "144", "10,900")]
    tr = ''
    for cls, img, f, name, res, li, fps, price in tiers:
        lis = ''.join(f'<li>{k}<b class="ltr">{v}</b></li>' for k, v in li)
        tr += f'''<div class="tier{cls}">{ph(img, f, "ti")}<div class="th"><b>{name}</b><span>{L(res)}</span></div><ul>{lis}</ul>
<div class="fps"><b>{fps}</b>إطار/ث في الألعاب الحديثة</div><div class="tp"><div class="pp">{price} <small>{CUR}</small></div><i>{ic("arrow_back")}</i></div></div>'''
    grid = ''.join([
        pc("c/monitor-studio.jpg", "0.5 0.45 1.0", "LUMEN", "شاشة «لومن» 27 بوصة 5K", "دقة ألوان احترافية · USB-C", "5,990", badge="جديد", rate="4.9", cnt="58"),
        pc("c/kb-black.jpg", "0.6 0.62 1.35", "VANTA", "لوحة «فانتا» اللاسلكية", "أزرار منخفضة · 3 أجهزة", "389", rate="4.8", cnt="214", fav=True),
        pc("c/hp-white.jpg", "0.5 0.55 1.55", "ORBIT", "سماعة «أوربت» ANC", "عزل نشط · 40 ساعة", "529", old="629", badge="-16%", rate="4.7", cnt="133"),
        pc("c/desk-mouse.jpg", "0.8 0.78 2.5", "ORBIT", "ماوس «أوربت» إرجو", f"{L('8000 DPI')} · USB-C", "249", rate="4.8", cnt="301"),
    ])
    return f'''<div class="screen">{STATUS}
<div class="header">{wm()}<div class="hicons"><div class="ib">{ic("notifications")}<i class="n"></i></div><div class="ib bx">{ic("menu")}</div></div></div>
<div class="search">{ic("search")}<div class="t">ابحث بالاسم أو المواصفات…</div><div class="k"><i>{L("GX 470")}</i><i>{L("32GB")}</i></div></div>
<div class="hscroll avs">{avs}</div>
<div class="hscroll hero">{h1}{h2}</div>
<div class="bars2"><i class="on"></i><i></i><i></i></div>

<div class="sec">{sh("01", "دعنا نرشّح لك جهازك")}
<div class="finder"><div class="q">ما الاستخدام الأساسي؟<small>إجابتان فقط ونقترح 3 أجهزة تناسبك</small></div>
<div class="fopts"><div class="fo on">{ic("sports_esports")}الألعاب</div><div class="fo">{ic("palette")}التصميم</div><div class="fo">{ic("code")}البرمجة</div><div class="fo">{ic("school")}الدراسة</div></div>
<div class="brange"><div class="bl"><span>الميزانية</span><b>من 4,000 إلى 9,000 {CUR}</b></div><div class="trk"><i></i><em style="left:calc(38% - 9px)"></em><em style="right:calc(22% - 9px)"></em></div></div>
<div class="go">اعرض الترشيحات{ic("arrow_back")}</div></div></div>

<div class="sec">{sh("02", "جهاز الأسبوع", "التفاصيل")}
<div class="spot">{ph("c/lap-chart.jpg","0.45 0.52 1.05","si",'<span class="bd">اختيار المحررين</span>')}
<div class="sb"><small class="k">لابتوب للمبدعين · 16 بوصة</small><h4>«سيليكا ستوديو 16»</h4>
<div class="sstats"><div><b>16</b><small>نواة معالجة</small></div><div><b>32GB</b><small>ذاكرة</small></div><div><b>165Hz</b><small>شاشة</small></div></div>
<div class="sf"><div class="pp">7,299 <small>{CUR}</small><s>7,990 {CUR}</s></div><span class="btn">أضف للسلة{ic("add_shopping_cart")}</span></div></div></div></div>

<div class="sec">{sh("03", "ركن اللاعبين", "تسوّق الكل")}<div class="hscroll ports">{pt}</div></div>

<div class="sec">{sh("04", "أسعار القطع هذا الأسبوع", "كل العروض")}<div class="rows">{rw}</div></div>

<div class="sec">{sh("05", "تجميعات جاهزة بثلاث فئات", "قارن")}<div class="hscroll tiers">{tr}</div></div>

<div class="sec">{sh("06", "وصل حديثاً", "المزيد")}<div class="grid">{grid}</div></div>

<div class="sec"><div class="trust">
<div class="tr">{ic("verified_user")}<b>ضمان حتى 3 سنوات</b><small>صيانة معتمدة</small></div>
<div class="tr">{ic("local_shipping")}<b>شحن خلال يوم</b><small>للمدن الرئيسية</small></div>
<div class="tr">{ic("credit_card")}<b>الدفع المرن</b><small><span class="soon" style="margin-top:3px">التقسيط قريبًا</span></small></div></div></div>
{tabbar(0)}
</div>'''


# ---------------- MENU ----------------
MENU = [
    ("اللابتوبات", "1,260", [
        ("lap-glow.jpg", "0.3 0.56 1.7", "للألعاب", "214"), ("lap-plant.jpg", "0.55 0.55 1.4", "نحيفة", "386"),
        ("lap-chart.jpg", "0.42 0.5 1.4", "للأعمال", "301"), ("lap-code.jpg", "0.6 0.5 1.5", "للمطورين", "92")]),
    ("الأجهزة المكتبية", "340", [
        ("setup-purple.jpg", "0.6 0.5 1.6", "تجميعات ألعاب", "118"), ("desk-coder.jpg", "0.6 0.55 1.4", "مكتبية", "102"),
        ("desk-city.jpg", "0.72 0.78 2.0", "محطات إبداع", "64"), ("mb-board.jpg", "0.5 0.5 1.3", "مصغّرة", "56")]),
    ("الشاشات", "410", [
        ("monitor-studio.jpg", "0.5 0.4 1.6", "للتصميم", "72"), ("setup-purple.jpg", "0.6 0.38 2.6", "للألعاب", "146"),
        ("desk-terrarium.jpg", "0.3 0.4 1.7", "مكتبية", "121"), ("chair-white.jpg", "0.8 0.3 1.8", "منحنية", "71")]),
    ("القطع والمكونات", "1,980", [
        ("socket-gold.jpg", "0.45 0.42 1.5", "المعالجات", "164"), ("heatsink-purple.jpg", "0.5 0.5 1.3", "كروت الشاشة", "212"),
        ("ram-macro.jpg", "0.5 0.5 1.2", "الذاكرة", "305"), ("ssd-kit.jpg", "0.68 0.5 1.7", "التخزين", "418"), ("cooler.jpg", "0.38 0.5 1.4", "التبريد", "190")]),
    ("الكيبورد والماوس", "860", [
        ("kb-rgb.jpg", "0.5 0.55 1.4", "ميكانيكي", "248"), ("kb-black.jpg", "0.6 0.62 1.6", "لاسلكي", "173"),
        ("desk-mouse.jpg", "0.8 0.78 2.8", "ماوس", "296"), ("kb-macro.jpg", "0.5 0.5 1.2", "أغطية أزرار", "64")]),
    ("الألعاب والأجهزة", "720", [
        ("pad-blue.jpg", "0.5 0.66 1.6", "أذرع تحكم", "188"), ("pad-duo.jpg", "0.5 0.55 1.3", "أجهزة وألعاب", "356"),
        ("arcade.jpg", "0.35 0.45 1.3", "آركيد", "41"), ("pad-buttons.jpg", "0.5 0.5 1.3", "ملحقات", "135")]),
    ("الصوت والبث", "530", [
        ("hp-white.jpg", "0.5 0.55 2.0", "سماعات ألعاب", "164"), ("hp-dark.jpg", "0.55 0.5 1.3", "استوديو", "88"),
        ("mic-studio.jpg", "0.5 0.4 1.4", "مايكروفونات", "97"), ("mic-dark.jpg", "0.84 0.5 1.7", "معدات البث", "52")]),
    ("الكراسي والمكاتب", "190", [
        ("chair-mesh.jpg", "0.85 0.78 2.3", "كراسي ألعاب", "74"), ("chair-white.jpg", "0.3 0.62 1.3", "كراسي مكتبية", "61"),
        ("desk-terrarium.jpg", "0.5 0.75 1.4", "مكاتب", "55")]),
    ("الشبكات والتوصيل", "280", [
        ("eth-pair.jpg", "0.5 0.5 1.2", "كابلات الشبكة", "96"), ("server.jpg", "0.5 0.5 1.5", "محوّلات", "84"),
        ("usb-kit.jpg", "0.55 0.6 1.5", "USB والذاكرة", "63"), ("usb-plug.jpg", "0.5 0.6 1.4", "موزّعات", "37")]),
]
SHORT = {"الأجهزة المكتبية":"الأجهزة","القطع والمكونات":"القطع","الكيبورد والماوس":"الملحقات","الألعاب والأجهزة":"الألعاب","الصوت والبث":"الصوتيات","الكراسي والمكاتب":"الكراسي","الشبكات والتوصيل":"الشبكات"}
MICON = ["laptop_mac", "host", "monitor", "memory", "keyboard", "sports_esports", "headset_mic", "chair_alt", "router"]


def menu():
    rows = ''
    for k, (name, cnt, subs) in enumerate(MENU):
        cards = f'<div class="mc all"><div class="im">{ic(MICON[k])}<em class="ltr" style="direction:rtl">{cnt}<small>منتج</small></em></div><b>كل {SHORT.get(name,name)}</b><small>{len(subs)} أقسام</small></div>'
        for img, f, n, c in subs:
            cards += f'<div class="mc">{ph("c/" + img, f, "im")}<b>{n}</b><small>{c} منتجاً</small></div>'
        rows += f'''<div class="mcat{" first" if k == 0 else ""}"><div class="mh"><div class="l"><span class="ix">{k+1:02d}</span><b>{name}</b><small>{cnt} منتجاً</small></div><span class="ar">{ic("arrow_back")}</span></div>
<div class="hscroll mrow">{cards}</div></div>'''
    return f'''<div class="screen" style="padding-bottom:40px">{STATUS}
<div class="mtop">{wm()}<div class="ib bx">{ic("close")}</div></div>
<div class="search">{ic("search")}<div class="t">ابحث في كل الأقسام…</div>{ic("mic")}</div>
<div class="hscroll mq"><div class="mqc on">{ic("bolt")}العروض</div><div class="mqc">{ic("new_releases")}وصل حديثاً</div><div class="mqc">{ic("construction")}جمّع جهازك</div><div class="mqc">{ic("compare_arrows")}المقارنة</div><div class="mqc">{ic("recycling")}استبدل جهازك</div></div>
<div style="height:22px"></div>
{rows}
<div class="macc">
<div class="ma">{ic("account_circle")}<div><b>حسابي</b><small>ريم العنزي</small></div></div>
<div class="ma">{ic("receipt_long")}<div><b>طلباتي</b><small>طلب في الطريق</small></div></div>
<div class="ma">{ic("favorite")}<div><b>المفضلة</b><small>12 منتجاً</small></div></div>
<div class="ma">{ic("build")}<div><b>الصيانة والضمان</b><small>جهازان مسجلان</small></div></div>
<div class="ma w"><div class="l">{ic("translate")}<div><b>اللغة</b><small>لغة التطبيق</small></div></div><div class="seg2"><i class="on">العربية</i><i>English</i></div></div></div>
<div class="mcontact">{ic("support_agent","l")}<div class="t"><b>تواصل معنا</b><small>خبير تقني متاح الآن · 9ص – 12م</small></div><div class="bt"><i>{ic("chat")}</i><i>{ic("call")}</i></div></div>
<div class="mver">SILICA · v3.1</div>
<div class="homeind"></div>
</div>'''


# ---------------- LISTING ----------------
def listing():
    subs = [("c/kb-rgb.jpg", "0.5 0.55 1.7", "الكل", True), ("c/kb-backlit.jpg", "0.5 0.5 1.7", "كيبورد", False), ("c/desk-mouse.jpg", "0.8 0.78 3.4", "ماوس", False),
            ("c/hp-side.jpg", "0.65 0.5 2.0", "سماعات", False), ("c/pad-white.jpg", "0.5 0.4 2.6", "أذرع", False), ("c/mic-studio.jpg", "0.5 0.35 1.8", "مايك", False)]
    sb = ''.join(f'<div class="sub{" on" if on else ""}">{ph(a, f, "c")}<span>{n}</span></div>' for a, f, n, on in subs)
    P = [
        ("c/kb-rgb.jpg", "0.5 0.55 1.25", "VANTA", "كيبورد «فانتا» ميكانيكي", "مفاتيح هادئة · إضاءة RGB", "459", None, "الأكثر مبيعاً", False, "4.8", "412"),
        ("c/kb-black.jpg", "0.6 0.62 1.35", "VANTA", "«فانتا لو» اللاسلكي", "أزرار منخفضة · 3 أجهزة", "389", "460", "-15%", True, "4.8", "214"),
        ("c/hp-side.jpg", "0.62 0.5 1.25", "ORBIT", "سماعة «أوربت» استوديو", "عزل سلبي · كابل قابل للفصل", "349", None, None, False, "4.7", "96"),
        ("c/desk-mouse.jpg", "0.8 0.78 2.5", "ORBIT", "ماوس «أوربت» إرجو", f"{L('8000 DPI')} · شحن USB-C", "249", None, "جديد", False, "4.8", "301"),
        ("c/kb-backlit.jpg", "0.5 0.5 1.2", "KESTREL", "«كيستريل» بإضاءة بيضاء", "ألمنيوم · بطارية 6 أشهر", "529", None, None, False, "4.7", "86"),
        ("c/pad-white.jpg", "0.5 0.4 2.2", "ORBIT", "يد تحكم «مدار» برو", "اهتزاز دقيق · 40 ساعة", "289", "340", "-15%", True, "4.6", "152"),
        ("c/mic-studio.jpg", "0.5 0.38 1.2", "ECHO", "مايك «إيكو» للبث", "USB-C · نمط قلبي", "459", None, None, False, "4.8", "73"),
        ("c/kb-macro.jpg", "0.5 0.5 1.25", "KESTREL", "«كيستريل» TKL للمحترفين", "8000Hz · مفاتيح خطية", "649", None, None, False, "4.9", "57"),
    ]
    cards = [pc(*p[:5], price=p[5], old=p[6], badge=p[7], fav=p[8], rate=p[9], cnt=p[10]) for p in P]
    promo = f'''<div class="promo"><div class="tx"><small>تجربة قبل الشراء</small><b>جرّبها في معرضنا<br>قبل أن تشتري</b><span class="cta">احجز تجربة{ic("arrow_back")}</span></div>{ph("c/kb-rgb.jpg","0.55 0.5 1.4","im")}</div>'''
    grid = ''.join(cards[:4]) + promo + ''.join(cards[4:])
    return f'''<div class="screen">{STATUS}
<div class="topbar"><div class="ib bx">{ic("arrow_forward")}</div><div class="tt"><b>ملحقات اللاعبين</b><small>860 منتجاً · شحن مجاني فوق 300 {CUR}</small></div><div class="grp"><div class="ib">{ic("search")}</div><div class="ib">{ic("shopping_bag")}<i class="nn">3</i></div></div></div>
<div class="hscroll subs">{sb}</div>
<div class="tools"><div>{ic("tune")}تصفية<span class="c">2</span></div><div>{ic("swap_vert")}الأعلى تقييماً</div><div>{ic("view_agenda")}العرض</div></div>
<div class="atags"><span class="atag">لاسلكي{ic("close")}</span><span class="atag">تقييم 4.5 فأكثر{ic("close")}</span><span class="atag">من 100 إلى 700 {CUR}{ic("close")}</span><span class="aclear">مسح الكل</span></div>
<div class="rc"><span><b>860</b> منتجاً</span><span>{ic("local_shipping")} يصل غداً</span></div>
<div class="grid">{grid}</div>
<div class="more"><p>عرضت 8 من 860</p><div class="mb">عرض المزيد{ic("expand_more")}</div></div>
{tabbar(1)}
</div>'''


# ---------------- PRODUCT ----------------
def product():
    main = "c/setup-purple.jpg"
    return f'''<div class="screen pscreen">{STATUS}
<div class="topbar"><div class="ib bx">{ic("arrow_forward")}</div><div class="tt"></div><div class="grp"><div class="ib">{ic("ios_share")}</div><div class="ib">{ic("shopping_bag")}<i class="nn">3</i></div></div></div>
{ph(main, "0.62 0.55 1.05", "gal", f'<div class="gt"><span class="bd">{ic("verified","fill")}مُختبر 24 ساعة</span><span class="fv">{ic("favorite")}</span></div><div class="gb"><span class="cn">1 / 6</span><div class="dt"><i class="on"></i><i></i><i></i><i></i><i></i><i></i></div></div>')}
<div class="th2">{ph(main,"0.62 0.55 1.6","on")}{ph("c/ram-slots.jpg","0.4 0.5 1.2")}{ph("c/mb-board.jpg","0.5 0.5 1.2")}{ph("c/cooler.jpg","0.4 0.5 1.2")}{ph("c/socket-blue.jpg","0.6 0.55 1.4")}</div>
<div class="pin"><div class="br"><b>SILICA · ORBIT</b><span>رمز المنتج {L("SL-OR7")}</span></div>
<h1>جهاز الألعاب «مدار 7»</h1>
<div class="sb">تجميعة {L("1440p")} بمعالج N7 بـ12 نواة · هيكل زجاجي بتدفق هواء عالٍ</div>
<div class="rr"><span class="stars">{"".join(ic("star","fill") for _ in range(5))}</span><b>4.9</b><span>(126)</span><span class="dv"></span><span class="ok">{ic("inventory_2")}متوفر · يُجمّع خلال 48 ساعة</span></div></div>
<div class="prc"><div><div class="pp">6,490 <small>{CUR}</small><s>7,190</s></div><div class="tx">شامل ضريبة القيمة المضافة</div></div><div class="r"><span class="off">-10%</span><br><span class="soon">{ic("schedule")}التقسيط قريبًا</span></div></div>

<div class="vs"><div class="vh"><b>الذاكرة: <span>{L("32GB DDR5")}</span></b><small>قابلة للترقية حتى {L("128GB")}</small></div>
<div class="chs"><div>{L("16GB")}<small>{L("−420")} {CUR}</small></div><div class="on">{L("32GB")}<small>مُختار</small></div><div>{L("64GB")}<small>{L("+690")} {CUR}</small></div></div></div>
<div class="vs"><div class="vh"><b>التخزين: <span>{L("2TB NVMe")}</span></b><small>{L("PCIe 4.0")}</small></div>
<div class="chs"><div>{L("1TB")}<small>{L("−290")} {CUR}</small></div><div class="on">{L("2TB")}<small>مُختار</small></div><div>{L("4TB")}<small>{L("+780")} {CUR}</small></div></div></div>
<div class="vs"><div class="vh"><b>كرت الشاشة</b><small>يحدد أداء الألعاب</small></div>
<div class="lst">
<div class="lo"><span class="rd"></span><div class="t"><b>GX 460 · 8GB</b><small>مثالي لدقة 1080p</small></div><span class="d">{L("−900")} {CUR}</span></div>
<div class="lo on"><span class="rd"></span><div class="t"><b>GX 470 · 12GB</b><small>الأنسب لدقة 1440p</small></div><span class="d inc">مشمول</span></div>
<div class="lo"><span class="rd"></span><div class="t"><b>GX 490 · 16GB</b><small>للعب بدقة 4K والبث</small></div><span class="d">{L("+2,350")} {CUR}</span></div></div></div>

<div class="perf"><h4>الأداء المتوقع بإعدادك<small>إطار/ث · دقة {L("1440p")} عالية</small></h4><div class="pg">
<div class="pgi"><span>ألعاب التصويب</span><i><em style="width:92%"></em></i><b>210 fps</b></div>
<div class="pgi"><span>العالم المفتوح</span><i><em style="width:62%"></em></i><b>118 fps</b></div>
<div class="pgi"><span>السباقات</span><i><em style="width:74%"></em></i><b>144 fps</b></div>
<div class="pgi"><span>المونتاج 4K</span><i><em style="width:56%"></em></i><b>{L("×2.1")}</b></div></div>
<div class="nt">قيم تقديرية من اختبارات مختبر سيليكا، وقد تختلف حسب اللعبة والإعدادات.</div></div>

<div class="specs"><h4>المواصفات الكاملة<small>بحسب إعدادك</small></h4>
<div class="sr">{ic("developer_board")}<span class="k">المعالج</span><div class="v">N7 بـ12 نواة و20 مساراً<small>حتى {L("5.4GHz")} · ذاكرة مخبئية {L("36MB")}</small></div></div>
<div class="sr">{ic("videogame_asset")}<span class="k">الرسوميات</span><div class="v">{L("GX 470 · 12GB GDDR6X")}<small>تتبّع الأشعة · مخرج {L("HDMI 2.1")} و3 {L("DP 1.4")}</small></div></div>
<div class="sr">{ic("memory_alt")}<span class="k">الذاكرة</span><div class="v">{L("32GB DDR5 · 6000MHz")}<small>منفذان شاغران للترقية</small></div></div>
<div class="sr">{ic("hard_drive")}<span class="k">التخزين</span><div class="v">{L("2TB NVMe PCIe 4.0")}<small>قراءة حتى {L("7000MB/s")}</small></div></div>
<div class="sr">{ic("developer_board")}<span class="k">اللوحة الأم</span><div class="v">{L("B-Series · Wi-Fi 7")}<small>{L("Bluetooth 5.4 · 2.5G LAN")}</small></div></div>
<div class="sr">{ic("mode_fan")}<span class="k">التبريد</span><div class="v">مبرّد مائي {L("240mm")}<small>4 مراوح هادئة · إضاءة قابلة للإيقاف</small></div></div>
<div class="sr">{ic("power")}<span class="k">مزوّد الطاقة</span><div class="v">{L("750W")} بكفاءة {L("80+ Gold")}<small>كابلات معيارية مرتبة</small></div></div>
<div class="sr">{ic("deployed_code")}<span class="k">الهيكل</span><div class="v">زجاج مقسّى · {L("46 × 22 × 48")} سم<small>الوزن 11.8 كجم</small></div></div></div>

<div class="cmpc"><h4>قارن قبل القرار<a>مقارنة كاملة</a></h4>
<div class="cmx"><div class="cmi me"><i data-src="img/{main}" data-f="0.62 0.55 1.6"></i><b>مدار 7 · اختيارك</b>
<div class="kv">السعر<em>6,490</em></div><div class="kv">الرسوميات<em class="w">12GB</em></div><div class="kv">أداء 1440p<em class="w">165 fps</em></div><div class="kv">الضمان<em>سنتان</em></div></div>
<div class="cmi"><i data-src="img/c/mb-board.jpg" data-f="0.5 0.5 1.3"></i><b>مدار 5</b>
<div class="kv">السعر<em>4,290</em></div><div class="kv">الرسوميات<em>8GB</em></div><div class="kv">أداء 1440p<em>96 fps</em></div><div class="kv">الضمان<em>سنتان</em></div></div></div></div>

<div class="war"><h4>اختر مدة الضمان</h4><div class="wl">
<div class="wc on"><b>2</b><span>سنتان</span><em>مشمول</em></div>
<div class="wc"><b>3</b><span>سنوات</span><em>{L("+299")} {CUR}</em></div>
<div class="wc"><b>4</b><span>سنوات + حماية</span><em>{L("+649")} {CUR}</em></div></div>
<div class="wn">{ic("home_repair_service")}استلام وتسليم مجاني من منزلك طوال مدة الضمان</div></div>

<div class="dlv"><div>{ic("local_shipping")}<b>توصيل مجاني</b><small>الرياض خلال 3 أيام</small></div><div>{ic("autorenew")}<b>إرجاع 14 يوماً</b><small>بحالته الأصلية</small></div><div>{ic("support_agent")}<b>إعداد مجاني</b><small>تثبيت وتحديث التعريفات</small></div></div>

<div class="acc">
<div class="ac op"><div class="h">الوصف{ic("remove")}</div><p>«مدار 7» مصمم للعب بسلاسة بدقة {L("1440p")} مع هامش للبث والمونتاج. نجمع كل جهاز يدوياً ونرتب الكابلات ونختبره حرارياً لمدة 24 ساعة قبل الشحن.</p></div>
<div class="ac">ما في الصندوق{ic("add")}</div>
<div class="ac">الأسئلة الشائعة{ic("add")}</div>
<div class="ac">الشحن والإرجاع{ic("add")}</div></div>

<div class="sec">{sh("", "آراء المشترين", "كل التقييمات")}
<div class="rvb"><div class="rvh"><span class="big">4.9</span><div class="s"><span class="stars">{"".join(ic("star","fill") for _ in range(5))}</span><small>126 تقييماً موثّقاً</small></div><div class="rec"><b>97%</b><small>يوصون به</small></div></div>
<div class="asp"><div><p>الأداء<b>4.9</b></p><i><em style="width:98%"></em></i></div><div><p>الهدوء<b>4.7</b></p><i><em style="width:93%"></em></i></div><div><p>جودة التجميع<b>5.0</b></p><i><em style="width:100%"></em></i></div><div><p>التغليف<b>4.8</b></p><i><em style="width:96%"></em></i></div></div>
<div class="rph">{ph("c/setup-purple.jpg","0.4 0.6 1.8")}{ph("c/ram-slots.jpg","0.5 0.5 1.3")}{ph("c/desk-city.jpg","0.75 0.8 2.4")}{ph("c/pad-duo.jpg","0.5 0.55 1.3","m")}</div>
<div class="rq"><div class="w"><i>م</i><div><b>مازن الحربي</b><small>الدمام · قبل 6 أيام</small></div><span class="stars">{"".join(ic("star","fill") for _ in range(5))}</span></div>
<p>التجميع نظيف جداً والجهاز هادئ حتى في الألعاب الثقيلة. الأداء مطابق للأرقام المعروضة تقريباً، ووصلني مع تقرير الاختبار.</p></div></div></div>

<div class="sec">{sh("", "يكتمل به")}
<div class="bnd"><div class="bit">
<div class="b" data-x>{ph("c/kb-rgb.jpg","0.5 0.55 1.4","",tag="i")}<b>كيبورد «فانتا»</b><span>459 {CUR}</span></div><span class="pl">+</span>
<div class="b">{ph("c/desk-mouse.jpg","0.8 0.78 3.0","",tag="i")}<b>ماوس «أوربت»</b><span>249 {CUR}</span></div><span class="pl">+</span>
<div class="b">{ph("c/hp-white.jpg","0.5 0.55 1.7","",tag="i")}<b>سماعة «أوربت»</b><span>529 {CUR}</span></div></div>
<div class="bf"><div><small>سعر الحزمة · توفير 117 {CUR}</small><div class="pp">1,120 <small>{CUR}</small><s>1,237 {CUR}</s></div></div><span class="btn">أضف الحزمة{ic("add")}</span></div></div></div>

<div class="sec">{sh("", "قد يعجبك أيضاً", "المزيد")}
<div class="hscroll hrow">
{pc("c/lap-glow.jpg","0.3 0.56 1.5","SILICA","لابتوب «نبض 17»",f"{L('240Hz')} · {L('GX 470')}","9,850",rate="4.8",cnt="64")}
{pc("c/monitor-studio.jpg","0.5 0.45 1.0","LUMEN","شاشة «لومن» 27 بوصة","5K · USB-C","5,990",rate="4.9",cnt="58")}
{pc("c/chair-mesh.jpg","0.85 0.78 2.2","ORBIT","كرسي «أوربت» الشبكي","دعم قطني قابل للتعديل","1,290",rate="4.7",cnt="88")}
</div></div>
<div style="height:24px"></div>
<div class="sticky"><div class="cm">{ic("compare_arrows")}</div><div class="tp"><small>الإجمالي</small><div class="pp">6,490 <small>{CUR}</small></div></div><div class="add">{ic("shopping_bag")}أضف إلى السلة</div><div class="homeind"></div></div>
</div>'''


SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
