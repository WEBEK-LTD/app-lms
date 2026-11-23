# Template A — "Velours" (approved pilot). Readex Pro, plum accent, blush surfaces.
import re
from lib import ic, ph

TITLE = "Velours"
FONT = "readex"
CUR = "د.إ"

# ---------------------------------------------------------------- CSS
_pcss = open('pilotA_css.txt').read()
_pcss = re.sub(r":root\{.*?\}\n", "", _pcss, count=1, flags=re.S)
_rep = [
    ("color:var(--acc)", "color:var(--accT)"),
    ("border:1.5px solid var(--acc)", "border:1.5px solid var(--accT)"),
    ("border:1.2px solid rgba(109,27,59,.3)", "border:1.2px solid color-mix(in srgb,var(--accT) 35%,transparent)"),
    ("box-shadow:0 0 0 2.5px #fff,0 0 0 4px var(--acc)", "box-shadow:0 0 0 2.5px var(--surface),0 0 0 4px var(--accT)"),
    ("display:grid;place-items:center;box-shadow:0 0 0 2.5px #fff}", "display:grid;place-items:center;box-shadow:0 0 0 2.5px var(--surface)}"),
    ("display:grid;place-items:center;box-shadow:0 0 0 2px #fff}", "display:grid;place-items:center;box-shadow:0 0 0 2px var(--surface)}"),
    ("padding:0 5px;box-shadow:0 0 0 2px #fff}", "padding:0 5px;box-shadow:0 0 0 2px var(--tabsolid)}"),
    ("background:#E2CFCA}", "background:var(--blush2)}"),
    ("border-top:1.5px dashed #DCC3BE", "border-top:1.5px dashed var(--blush2)"),
    ("background:rgba(255,252,251,.8)", "background:var(--tabbg)"),
    ("color:#8F7F83", "color:var(--tabink)"),
    ("background:#1A1416}", "background:var(--ink)}"),
    (".mult{background-blend-mode:multiply}", ".mult{background-blend-mode:multiply;background-color:var(--tile)!important}"),
    ("background:radial-gradient(120% 140% at 100% 0%,#9B3A60 0%,#6D1B3B 45%,#4A1028 100%)", "background:var(--plumGrad)"),
]
for a, b in _rep:
    assert a in _pcss, a
    _pcss = _pcss.replace(a, b)
_pcss = _pcss.replace("font:600 16.5px/1 -apple-system,'SF Pro Text','Readex Pro',sans-serif}", "font:600 16.5px/1 -apple-system,'SF Pro Text','Readex Pro',sans-serif;color:var(--ink)}")

TOKENS = """
:root{--bg:#FBF7F5;--surface:#FFFFFF;--blush:#F4E7E3;--blush2:#EEDCD6;--nude:#E7D1C6;
--ink:#2A1D21;--ink2:#6F5F63;--ink3:#93838A;--line:#EFE3DF;--acc:#6D1B3B;--acc2:#8E2C52;--accSoft:#F5E3E8;--accT:#6D1B3B;
--tile:#F3E6E1;--tabbg:rgba(255,252,251,.82);--tabsolid:#FFFFFF;--tabink:#8F7F83;--gold:#B9853F;--ok:#2F7A55;--okSoft:#E4F1EA;
--plumGrad:radial-gradient(120% 140% at 100% 0%,#9B3A60 0%,#6D1B3B 45%,#4A1028 100%);--shadow:0 6px 18px rgba(110,60,70,.07)}
html.dark{--bg:#141113;--surface:#1E1A1C;--blush:#282124;--blush2:#3A2E32;--nude:#3A2E30;
--ink:#F4ECEE;--ink2:#C7B9BD;--ink3:#9A8D91;--line:#2E2629;--acc:#8A2A50;--acc2:#B04A72;--accSoft:#3A1E2A;--accT:#EFA6C3;
--tile:#EBDDD8;--tabbg:rgba(34,28,31,.86);--tabsolid:#221C1F;--tabink:#A99A9E;--gold:#D9A85E;--ok:#7FCFA3;--okSoft:#1E2E25;
--plumGrad:radial-gradient(120% 140% at 100% 0%,#9B3A60 0%,#6D1B3B 45%,#3E0D22 100%);--shadow:0 6px 18px rgba(0,0,0,.25)}
html.dark .tabbar{box-shadow:0 14px 32px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.06)}
html.dark .search,html.dark .ibtn,html.dark .chip,html.dark .pcard,html.dark .deal{box-shadow:0 0 0 1px var(--line)}
.hcard .lab,.fav,.badge.best{color:#6D1B3B}
html.dark .fav{background:rgba(255,255,255,.92)}
.rate .ms{color:var(--gold)}
.status{color:var(--ink)}
html.dark .quiz .step i{background:rgba(239,166,195,.2)!important}
"""

EXTRA = """
/* ================= shared for new screens ================= */
.topbar{height:58px;display:flex;align-items:center;gap:10px;padding:0 16px}
.topbar .tt{flex:1;min-width:0}
.topbar .tt b{display:block;font-size:18px;font-weight:600;line-height:1.25}
.topbar .tt small{display:block;font-size:11.5px;color:var(--ink3);font-weight:300;margin-top:2px}
.hgrp{display:flex;gap:6px}
.pill-t{font-size:10.5px;font-weight:500;padding:3px 8px;border-radius:8px;background:var(--accSoft);color:var(--accT)}

/* ================= MENU ================= */
.grab{width:40px;height:5px;border-radius:3px;background:var(--blush2);margin:0 auto 4px}
.mhead{display:flex;align-items:center;justify-content:space-between;padding:6px 16px 0}
.wm{display:flex;align-items:center;gap:11px}
.wm .mono{width:46px;height:46px;border-radius:23px;background:var(--plumGrad);display:grid;place-items:center;color:#fff;font-size:21px;font-weight:300;letter-spacing:.02em;direction:ltr}
.wm b{display:block;font-size:21px;font-weight:600;line-height:1.1}
.wm small{display:block;font-size:9.5px;letter-spacing:.34em;color:var(--ink3);margin-top:4px;direction:ltr;text-align:right;font-weight:400}
.msearch{margin-top:14px}
.mquick{display:flex;justify-content:space-between;margin:18px 22px 0}
.mq{width:68px;text-align:center}
.mq i{display:grid;place-items:center;width:58px;height:58px;margin:0 auto;border-radius:29px;background:var(--surface);box-shadow:0 0 0 1px var(--line);color:var(--accT)}
.mq i .ms{font-size:24px}
.mq.hot i{background:var(--accSoft);box-shadow:none}
.mq span{display:block;font-size:11px;margin-top:7px;color:var(--ink2);font-weight:400;white-space:nowrap}
.mclub{margin:18px 16px 0;height:56px;border-radius:18px;background:var(--plumGrad);display:flex;align-items:center;gap:11px;padding:0 14px;color:#fff}
.mclub .ms{color:#E9C27E;font-size:22px}
.mclub div{flex:1}
.mclub b{display:block;font-size:13px;font-weight:500}
.mclub small{display:block;font-size:11px;color:#F2D3DC;font-weight:300;margin-top:1px}
.mclub em{font-size:12px;font-weight:500;display:flex;align-items:center;gap:2px}
.mclub em .ms{font-size:17px;color:#fff}
.mcat{margin-top:26px}
.mch{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:12px}
.mch .l{display:flex;align-items:center;gap:10px}
.mch .ico{width:38px;height:38px;border-radius:19px;background:var(--accSoft);display:grid;place-items:center;color:var(--accT)}
.mch .ico .ms{font-size:20px}
.mch b{display:block;font-size:16px;font-weight:600}
.mch small{display:block;font-size:11px;color:var(--ink3);font-weight:300;margin-top:2px}
.mch a{font-size:12px;color:var(--accT);font-weight:500;display:flex;align-items:center;gap:1px}
.mch a .ms{font-size:18px}
.mrow{gap:10px}
.mc{flex:0 0 auto;width:106px;height:142px;border-radius:22px;position:relative;overflow:hidden;background-color:var(--nude)}
.mc .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(40,16,26,.74) 0%,rgba(40,16,26,.2) 46%,rgba(40,16,26,0) 68%)}
.mc b{position:absolute;right:12px;left:10px;bottom:11px;color:#fff;font-size:13px;font-weight:500;line-height:1.3}
.mc b small{display:block;font-size:10.5px;font-weight:300;opacity:.92;margin-top:2px}
.mc.all{width:100px;background:var(--plumGrad);padding:13px 12px;display:flex;flex-direction:column;color:#fff}
.mc.all .ms.big{font-size:26px;color:#F2C7D7;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.mc.all span.t{margin-top:auto;font-size:13.5px;font-weight:500;line-height:1.35}
.mc.all span.t small{display:block;font-size:10.5px;font-weight:300;color:#F2D3DC;margin-top:2px}
.mc.all .go{margin-top:9px;width:30px;height:30px;border-radius:15px;background:rgba(255,255,255,.18);display:grid;place-items:center}
.mc.all .go .ms{font-size:18px;color:#fff}
.mfoot{margin:30px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:4px 16px}
.mli{display:flex;align-items:center;gap:12px;height:56px;border-bottom:1px solid var(--line)}
.mli:last-child{border-bottom:0}
.mli .li{width:36px;height:36px;border-radius:18px;background:var(--blush);display:grid;place-items:center;color:var(--accT)}
.mli .li .ms{font-size:20px}
.mli span.t{flex:1;font-size:14px;font-weight:500}
.mli small{font-size:11.5px;color:var(--ink3)}
.mli .ms.c{font-size:19px;color:var(--ink3)}
.lang{display:flex;background:var(--blush);border-radius:16px;padding:3px}
.lang i{font-size:11.5px;padding:6px 12px;border-radius:13px;color:var(--ink2)}
.lang i.on{background:var(--acc);color:#fff;font-weight:500}
.mhelp{margin:12px 16px 0;display:flex;gap:10px}
.mhelp div{flex:1;height:50px;border-radius:25px;display:flex;align-items:center;justify-content:center;gap:7px;font-size:13px;font-weight:500}
.mhelp .a{background:var(--acc);color:#fff}
.mhelp .b{background:var(--surface);box-shadow:0 0 0 1.3px var(--accT);color:var(--accT)}
.mhelp .ms{font-size:20px}
.msoc{display:flex;justify-content:center;gap:10px;margin-top:18px}
.msoc i{width:40px;height:40px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;color:var(--ink2)}
.msoc .ms{font-size:20px}
.mver{text-align:center;font-size:11px;color:var(--ink3);margin-top:14px;font-weight:300}

/* ================= LISTING ================= */
.lchips{margin-top:6px}
.fbar{display:flex;align-items:center;gap:8px;margin:14px 16px 0}
.fbtn{height:42px;padding:0 14px;border-radius:21px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:500;white-space:nowrap}
.fbtn .ms{font-size:20px}
.fbtn .c{min-width:19px;height:19px;border-radius:10px;background:var(--acc);color:#fff;font-size:10.5px;display:grid;place-items:center;padding:0 5px}
.fbtn.sort{flex:1;justify-content:space-between;font-weight:400;color:var(--ink2);padding:0 14px 0 10px}
.fbtn.sort b{color:var(--ink);font-weight:500}
.vt{display:flex;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:21px;padding:4px;height:42px}
.vt i{width:34px;display:grid;place-items:center;border-radius:17px;color:var(--ink3)}
.vt i.on{background:var(--accSoft);color:var(--accT)}
.vt .ms{font-size:19px}
.atags{display:flex;flex-wrap:wrap;gap:7px;margin:12px 16px 0;align-items:center}
.atag{height:30px;padding:0 8px 0 12px;border-radius:15px;background:var(--accSoft);color:var(--accT);font-size:11.5px;font-weight:500;display:flex;align-items:center;gap:4px}
.atag .ms{font-size:15px}
.aclear{font-size:11.5px;color:var(--ink3);text-decoration:underline;text-underline-offset:3px;margin-right:4px}
.rcount{margin:16px 16px 12px;font-size:12px;color:var(--ink3);display:flex;justify-content:space-between;align-items:center}
.rcount b{color:var(--ink);font-weight:500}
.rcount span{display:flex;align-items:center;gap:4px;color:var(--ok);font-weight:500}
.rcount span .ms{font-size:16px}
.lgrid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.lgrid .pcard{width:auto;display:flex;flex-direction:column}
.lgrid .pb{flex:1;display:flex;flex-direction:column}
.lgrid .pfoot{margin-top:auto;padding-top:8px}
.vol{white-space:nowrap}
.pill-t{white-space:nowrap}
.lgrid .pimg{height:184px}
.swr{display:flex;align-items:center;gap:4px;margin-top:7px}
.swr i{width:13px;height:13px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}
.swr small{font-size:10.5px;color:var(--ink3);margin-right:2px}
.badge.new{background:var(--ink);color:var(--bg)}
html.dark .badge.new{background:#F4ECEE;color:#2A1D21}
.lpromo{grid-column:1/-1;height:168px;border-radius:24px;position:relative;overflow:hidden;background-color:#3A1424}
.lpromo .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(58,14,34,.92) 0%,rgba(58,14,34,.7) 45%,rgba(58,14,34,0) 78%)}
.lpromo .pt{position:absolute;right:18px;top:18px;bottom:18px;width:200px;color:#fff;display:flex;flex-direction:column}
.lpromo .pt small{font-size:11px;color:#F2C7D7;display:flex;align-items:center;gap:4px}
.lpromo .pt small .ms{font-size:15px}
.lpromo .pt b{font-size:17px;font-weight:600;line-height:1.45;margin-top:6px}
.lpromo .pt .cta2{margin-top:auto;align-self:flex-start;height:36px;padding:0 14px;border-radius:18px;background:#fff;color:#6D1B3B;display:flex;align-items:center;gap:5px;font-size:12px;font-weight:500}
.lpromo .pt .cta2 .ms{font-size:17px}
.more{margin:28px 16px 0;text-align:center}
.more .prog{width:160px;height:4px;border-radius:2px;background:var(--blush2);margin:0 auto;overflow:hidden}
.more .prog i{display:block;height:100%;width:8%;background:var(--accT);border-radius:2px}
.more p{font-size:11.5px;color:var(--ink3);margin-top:8px}
.more .mb{margin:14px auto 0;height:48px;width:210px;border-radius:24px;box-shadow:0 0 0 1.4px var(--accT);color:var(--accT);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;font-weight:500}
.more .mb .ms{font-size:20px}

/* ================= PRODUCT ================= */
.gal{position:relative;margin:0 16px;height:392px;border-radius:28px;overflow:hidden;background-color:var(--tile)}
.gtop{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:flex-start}
.gtop .grp{display:flex;gap:8px}
.gbtn{width:42px;height:42px;border-radius:21px;background:rgba(255,255,255,.9);display:grid;place-items:center;color:#2A1D21;box-shadow:0 2px 10px rgba(60,20,30,.1)}
.gbtn .ms{font-size:21px}
.gbtn.on .ms{color:#8E2C52;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.gbadge{position:absolute;top:66px;right:14px;font-size:11px;font-weight:500;background:#6D1B3B;color:#fff;border-radius:9px;padding:4px 9px}
.gdots{position:absolute;bottom:16px;left:0;right:0;display:flex;justify-content:center;gap:5px}
.gdots i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.65)}
.gdots i.on{width:18px;background:#fff}
.gtry{position:absolute;bottom:12px;right:12px;height:34px;padding:0 12px;border-radius:17px;background:rgba(42,29,33,.66);color:#fff;font-size:11.5px;display:flex;align-items:center;gap:5px;backdrop-filter:blur(8px)}
.gtry .ms{font-size:17px}
.gcnt{position:absolute;bottom:14px;left:14px;height:26px;padding:0 10px;border-radius:13px;background:rgba(42,29,33,.55);color:#fff;font-size:11px;display:flex;align-items:center;direction:ltr}
.thumbs{display:flex;gap:8px;margin:10px 16px 0}
.thumbs div{flex:1;height:64px;border-radius:16px;background-color:var(--tile);position:relative;overflow:hidden}
.thumbs div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--accT)}
.thumbs div.sw5{background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:3px;padding:8px}
.thumbs div.sw5 i{width:15px;height:15px;border-radius:50%}
.thumbs div.sw5 span{width:100%;text-align:center;font-size:9.5px;color:var(--ink3);margin-top:2px}
.pinfo{padding:18px 16px 0}
.pinfo .pbr{display:flex;align-items:center;justify-content:space-between}
.pinfo .pbr b{white-space:nowrap;font-size:11px;letter-spacing:.16em;font-weight:500;color:var(--ink2);direction:ltr;display:flex;align-items:center;gap:5px}
.pinfo .pbr b .ms{font-size:15px;color:var(--accT)}
.pinfo h1{font-size:21px;font-weight:600;line-height:1.5;margin-top:6px}
.pinfo .sub{font-size:12.5px;color:var(--ink2);font-weight:300;margin-top:3px;line-height:1.6}
.rrow{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:var(--ink2)}
.rrow .stars2{display:flex;color:var(--gold)}
.rrow .stars2 .ms{font-size:16px}
.rrow b{color:var(--ink);font-weight:600}
.rrow .dot{width:3px;height:3px;border-radius:2px;background:var(--ink3)}
.prow2{display:flex;align-items:flex-end;justify-content:space-between;margin-top:16px}
.bigp{font-size:26px;font-weight:600;line-height:1;color:var(--ink)}
.bigp small{font-size:13px;color:var(--ink2);font-weight:400}
.oldp{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12.5px;color:var(--ink3)}
.oldp .dc{font-size:11px;font-weight:600;color:#fff;background:var(--acc);padding:3px 8px;border-radius:8px;direction:ltr}
.taxn{font-size:11px;color:var(--ink3);text-align:left}
.taxn b{display:block;color:var(--ok);font-weight:500;font-size:11.5px;margin-bottom:3px}
.inst{margin:14px 16px 0;padding:12px 14px;border-radius:18px;background:var(--blush);display:flex;align-items:center;gap:10px;font-size:12px;color:var(--ink2)}
.inst .ms{font-size:21px;color:var(--accT)}
.inst b{color:var(--ink);font-weight:500}
.pc{margin:12px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:16px}
.pc.first{margin-top:18px}
.ch{display:flex;align-items:center;justify-content:space-between}
.ch b{font-size:15.5px;font-weight:600}
.ch b span{font-weight:400;color:var(--ink2);font-size:13px}
.ch a{font-size:12px;color:var(--accT);font-weight:500;display:flex;align-items:center;gap:3px}
.ch a .ms{font-size:17px}
.utabs{display:flex;gap:6px;margin-top:12px}
.utabs span{height:30px;padding:0 13px;border-radius:15px;font-size:11.5px;display:flex;align-items:center;background:var(--blush);color:var(--ink2)}
.utabs span.on{background:var(--ink);color:var(--bg);font-weight:500}
.shgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px 6px;margin-top:16px;direction:ltr}
.shg{display:flex;flex-direction:column;align-items:center;gap:6px}
.shg i{width:40px;height:40px;border-radius:50%;display:block;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);position:relative}
.shg span{font-size:10.5px;color:var(--ink3)}
.shg.on i{box-shadow:0 0 0 2.5px var(--surface),0 0 0 4.2px var(--accT)}
.shg.on span{color:var(--accT);font-weight:600}
.shg.out i:after{content:'';position:absolute;left:50%;top:4px;bottom:4px;width:1.5px;background:rgba(255,255,255,.85);transform:rotate(45deg)}
.match{display:flex;align-items:center;gap:10px;margin-top:16px;padding:10px 12px;border-radius:16px;background:var(--okSoft)}
.match .ms{font-size:20px;color:var(--ok)}
.match div{flex:1;font-size:12px;color:var(--ink2);line-height:1.5}
.match div b{color:var(--ink);font-weight:500}
.match em{font-size:12px;font-weight:600;color:var(--ok)}
.opts3{display:flex;gap:8px;margin-top:12px}
.opts3 div{flex:1;border-radius:16px;box-shadow:0 0 0 1px var(--line);padding:10px 8px;text-align:center;background:var(--bg)}
.opts3 div b{display:block;font-size:12.5px;font-weight:500}
.opts3 div small{display:block;font-size:10.5px;color:var(--ink3);margin-top:3px}
.opts3 div.on{box-shadow:0 0 0 1.6px var(--accT);background:var(--accSoft)}
.opts3 div.on small{color:var(--accT)}
.skin{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
.skin div{border-radius:18px;background:var(--bg);box-shadow:0 0 0 1px var(--line);padding:12px 4px 10px;text-align:center;position:relative}
.skin div .ms{font-size:24px;color:var(--ink2)}
.skin div b{display:block;font-size:12px;font-weight:500;margin-top:5px}
.skin div small{display:block;font-size:10px;color:var(--ok);margin-top:2px}
.skin div.mine{background:var(--accSoft);box-shadow:0 0 0 1.5px var(--accT)}
.skin div.mine .ms{color:var(--accT)}
.skin div.mine em{position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:9.5px;background:var(--acc);color:#fff;padding:2px 7px;border-radius:7px;white-space:nowrap}
.meters{margin-top:16px;display:flex;flex-direction:column;gap:12px}
.mt{display:flex;align-items:center;gap:10px;font-size:12px}
.mt span{width:78px;color:var(--ink2)}
.mt .bar{flex:1;display:flex;gap:4px}
.mt .bar i{flex:1;height:6px;border-radius:3px;background:var(--blush2)}
.mt .bar i.f{background:var(--accT)}
.mt b{width:74px;text-align:left;font-weight:500;font-size:11.5px}
.ings{display:flex;flex-direction:column;gap:12px;margin-top:14px}
.ing{display:flex;align-items:center;gap:12px}
.ing .ii{width:48px;height:48px;border-radius:24px;flex:0 0 auto;display:grid;place-items:center;background:var(--accSoft);color:var(--accT)}
.ing .ii .ms{font-size:23px}
.ing div{flex:1}
.ing b{display:block;font-size:13.5px;font-weight:500}
.ing small{display:block;font-size:11.5px;color:var(--ink3);font-weight:300;margin-top:2px;line-height:1.5}
.ing em{font-size:11px;color:var(--accT);font-weight:600;background:var(--accSoft);border-radius:8px;padding:3px 8px;direction:ltr}
.free{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;padding-top:14px;border-top:1px dashed var(--line)}
.free>span{height:28px;padding:0 10px;border-radius:14px;background:var(--bg);box-shadow:0 0 0 1px var(--line);font-size:11px;color:var(--ink2);display:flex;align-items:center;gap:4px}
.free span .ms{font-size:15px;color:var(--ok)}
.how{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;position:relative}
.how:before{content:'';position:absolute;top:40px;right:17%;left:17%;border-top:1.5px dashed var(--blush2)}
.hw{text-align:center;position:relative}
.hw .hi{width:80px;height:80px;border-radius:40px;margin:0 auto;background-color:var(--tile);position:relative;box-shadow:0 0 0 4px var(--surface)}
.hw .hi em{position:absolute;top:0;right:0;width:22px;height:22px;border-radius:11px;background:var(--acc);color:#fff;font-size:11px;font-weight:600;display:grid;place-items:center;box-shadow:0 0 0 2px var(--surface)}
.hw b{display:block;font-size:12.5px;font-weight:600;margin-top:9px}
.hw small{display:block;font-size:10.5px;color:var(--ink3);margin-top:3px;line-height:1.5;padding:0 2px}
.tip{display:flex;gap:10px;margin-top:14px;padding:11px 12px;border-radius:16px;background:var(--blush);font-size:11.5px;color:var(--ink2);line-height:1.6}
.tip .ms{font-size:19px;color:var(--gold)}
.dlv{margin:12px 16px 0;border-radius:24px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:4px 16px}
.dl{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
.dl:last-child{border:0}
.dl .di2{flex:0 0 38px;width:38px;height:38px;border-radius:19px;background:var(--blush);display:grid;place-items:center;color:var(--accT)}
.dl .di2 .ms{font-size:20px}
.dl div{flex:1}
.dl b{display:block;font-size:13px;font-weight:500}
.dl small{display:block;font-size:11px;color:var(--ink3);margin-top:2px}
.dl .ok{font-size:11px;color:var(--ok);font-weight:500}
.accd{margin:12px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:2px 16px}
.ai{border-bottom:1px solid var(--line);padding:15px 0}
.ai:last-child{border:0}
.ai .ah{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500}
.ai .ah .ms{font-size:20px;color:var(--ink3)}
.ai p{font-size:12.5px;color:var(--ink2);line-height:1.8;margin-top:8px;font-weight:300}
.sech{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin:32px 0 14px}
.sech h3{font-size:18px;font-weight:600}
.sech small{display:block;font-size:12px;color:var(--ink3);font-weight:300;margin-top:3px}
.sech a{font-size:12.5px;color:var(--accT);font-weight:500;display:flex;align-items:center;gap:2px}
.sech a .ms{font-size:18px}
.rvsum{margin:0 16px;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:16px;display:flex;gap:18px;align-items:center}
.rvsum .big{text-align:center;width:104px}
.rvsum .big b{display:block;font-size:40px;font-weight:600;line-height:1}
.rvsum .big .stars2{display:flex;justify-content:center;color:var(--gold);margin-top:6px}
.rvsum .big .stars2 .ms{font-size:15px}
.rvsum .big small{display:block;font-size:11px;color:var(--ink3);margin-top:5px}
.rbars{flex:1;display:flex;flex-direction:column;gap:6px}
.rb{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--ink3)}
.rb i{flex:1;height:6px;border-radius:3px;background:var(--blush2);overflow:hidden;display:block}
.rb i:after{content:'';display:block;height:100%;width:var(--w);background:var(--gold);border-radius:3px;margin-left:auto;margin-right:0}
.rb span{width:30px;text-align:left;direction:ltr}
.rtags{display:flex;gap:8px;margin:12px 16px 0;overflow:hidden}
.rtags span{flex:0 0 auto}
.rtags span{height:32px;padding:0 12px;border-radius:16px;background:var(--surface);box-shadow:0 0 0 1px var(--line);font-size:11.5px;display:flex;align-items:center;gap:5px;color:var(--ink2)}
.rtags span b{color:var(--ink);font-weight:500}
.rtags span.on{background:var(--ink);color:var(--bg);box-shadow:none}
.rtags span.on b{color:var(--bg)}
.rphotos{display:flex;gap:8px;margin:12px 16px 0}
.rphotos div{flex:1;height:82px;border-radius:16px;background-color:var(--tile);position:relative;overflow:hidden}
.rphotos div.more2:after{content:'';position:absolute;inset:0;background:rgba(42,29,33,.55)}
.rphotos div.more2 span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;z-index:1;font-size:14px;font-weight:600}
.rv{margin:12px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:16px}
.rv .rh{display:flex;align-items:center;gap:10px}
.rv .rh .av{flex:0 0 40px;width:40px;height:40px;border-radius:20px;background:var(--nude);display:grid;place-items:center;font-weight:600;color:var(--accT)}
.rv .rh div{flex:1}
.rv .rh b{display:block;font-size:13.5px;font-weight:500}
.rv .rh small{display:flex;align-items:center;gap:3px;font-size:11px;color:var(--ok);margin-top:2px}
.rv .rh small .ms{font-size:14px}
.rv .rh .d{font-size:11px;color:var(--ink3)}
.rv .stars2{display:flex;color:var(--gold);margin-top:10px}
.rv .stars2 .ms{font-size:16px}
.rv .meta{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.rv .meta span{font-size:10.5px;background:var(--blush);color:var(--ink2);padding:4px 9px;border-radius:9px}
.rv p{font-size:12.5px;line-height:1.8;margin-top:8px;color:var(--ink)}
.rv .rp{display:flex;gap:8px;margin-top:10px}
.rv .rp div{width:72px;height:72px;border-radius:14px;background-color:var(--tile)}
.rv .help{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:11.5px;color:var(--ink3)}
.rv .help span{display:flex;align-items:center;gap:4px}
.rv .help .ms{font-size:17px}
.allrv{margin:12px 16px 0;height:48px;border-radius:24px;box-shadow:0 0 0 1.4px var(--accT);display:flex;align-items:center;justify-content:center;gap:6px;color:var(--accT);font-size:13.5px;font-weight:500}
.allrv .ms{font-size:19px}
.combo{margin:0 16px;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:6px 14px 14px}
.cb{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.cb .ck{width:24px;height:24px;border-radius:12px;background:var(--acc);display:grid;place-items:center;flex:0 0 auto}
.cb .ck .ms{font-size:16px;color:#fff}
.cb .ck.off{background:transparent;box-shadow:inset 0 0 0 1.5px var(--ink3)}
.cb .ci{width:58px;height:58px;border-radius:16px;background-color:var(--tile);flex:0 0 auto}
.cb div.tx{flex:1;min-width:0}
.cb b{display:block;font-size:13px;font-weight:500;line-height:1.4}
.cb small{display:block;font-size:11px;color:var(--ink3);margin-top:2px}
.cb em{font-size:13.5px;font-weight:600;white-space:nowrap}
.cb em small{display:inline;font-size:10.5px;color:var(--ink2);font-weight:400}
.ctot{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
.ctot small{display:block;font-size:11px;color:var(--ink3)}
.ctot b{font-size:18px;font-weight:600}
.ctot b small{display:inline;font-size:11px;color:var(--ink2)}
.ctot s{font-size:12px;color:var(--ink3);margin-right:6px}
.sticky{position:absolute;left:0;right:0;bottom:0;padding:12px 16px 34px;background:var(--tabbg);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);box-shadow:0 -1px 0 var(--line);display:flex;gap:10px;align-items:center}
.qty{height:52px;border-radius:26px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:12px;padding:0 8px}
.qty i{width:36px;height:36px;border-radius:18px;background:var(--blush);display:grid;place-items:center}
.qty i .ms{font-size:19px}
.qty b{font-size:15px;font-weight:600;width:12px;text-align:center}
.atc{flex:1;height:52px;border-radius:26px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:500}
.atc .ms{font-size:21px}
.atc em{opacity:.75;font-weight:300}
"""

CSS = _pcss + TOKENS + EXTRA

# ---------------------------------------------------------------- helpers
STAT = open('pilotA_body.txt').read().split('<div class="header">')[0].split('<div class="screen">')[1].replace('fill="#111"', 'fill="currentColor"').replace('stroke="#111"', 'stroke="currentColor"')

def tabbar(on=0):
    items = [("home", "الرئيسية"), ("category", "الأقسام"), ("shopping_bag", "السلة"), ("receipt_long", "طلباتي"), ("person", "حسابي")]
    h = '<div class="tabbar">'
    for i, (icn, lab) in enumerate(items):
        bd = '<i class="bd">3</i>' if icn == "shopping_bag" else ''
        if i == on:
            h += f'<div class="tab on"><div class="ic">{ic(icn)}</div><span>{lab}</span>{bd}</div>'
        else:
            h += f'<div class="tab">{ic(icn)}<span>{lab}</span>{bd}</div>'
    return h + '</div><div class="homeind"></div>'

def price(p, old=None):
    s = f'<b>{p} <small>{CUR}</small></b>'
    if old: s += f'<s>{old}</s>'
    return f'<div class="price">{s}</div>'

def pcard(src, f, brand, name, vol, p, old=None, rate="4.8", cnt="1.2k", badge="", fav=False, sw=None, mult=False):
    b = ''
    if badge:
        cls = 'off' if badge.startswith('-') else ('new' if badge == 'جديد' else 'best')
        b = f'<span class="badge {cls}">{badge}</span>'
    fv = f'<div class="fav">{ic("favorite", "fill" if fav else "")}</div>'
    swh = ''
    if sw:
        cols, more = sw
        swh = '<div class="swr">' + ''.join(f'<i style="background:{c}"></i>' for c in cols) + (f'<small>+{more}</small>' if more else '') + '</div>'
    return f'''<div class="pcard">
<div class="pimg{' mult' if mult else ''}" data-src="img/{src}" data-f="{f}">{b}{fv}</div>
<div class="pb"><div class="rate">{ic("star","fill")}<b>{rate}</b><span>({cnt})</span></div>
<div class="pbrand">{brand}</div><div class="pname">{name} <span class="vol">{vol}</span></div>{swh}
<div class="pfoot">{price(p, old)}<div class="add">{ic("add")}</div></div></div></div>'''

# ---------------------------------------------------------------- HOME (approved pilot + menu icon)
def home():
    body = open('pilotA_body.txt').read()
    body = body.replace('img/beauty/', 'img/pilot/').replace('fill="#111"', 'fill="currentColor"').replace('stroke="#111"', 'stroke="currentColor"')
    old = '<div class="ibtn"><span class="ms">notifications</span><i class="n">3</i></div>'
    assert old in body
    body = body.replace(old, old + '\n      <div class="ibtn"><span class="ms">menu</span></div>')
    return body

# ---------------------------------------------------------------- MENU
CATS = [
    ("water_drop", "العناية بالبشرة", "1,240", [
        ("pilot/serum.jpg", "0.36 0.62 1.9", "السيرومات", "186"),
        ("pilot/gold-jar.jpg", "0.68 0.62 2.2", "المرطّبات", "214"),
        ("c/92f6.jpg", "0.3 0.6 1.6", "زيوت الوجه", "58"),
        ("pilot/soap.jpg", "0.5 0.55 1.5", "المنظّفات", "121"),
    ]),
    ("brush", "المكياج", "2,310", [
        ("c/062e.jpg", "0.6 0.55 1.5", "البشرة", "540"),
        ("c/0239.jpg", "0.55 0.5 1.25", "العيون", "612"),
        ("c/91fd.jpg", "0.35 0.62 1.45", "الشفاه", "488"),
        ("c/9265.jpg", "0.45 0.5 1.2", "الفرش والأدوات", "156"),
        ("pilot/nail.jpg", "0.6 0.45 1.3", "الأظافر", "230"),
    ]),
    ("spa", "العطور", "860", [
        ("pilot/perfume.jpg", "0.4 0.32 1.4", "عطور نسائية", "320"),
        ("c/7d00.jpg", "0.5 0.5 1.3", "عطور زهرية", "142"),
        ("c/9e93.jpg", "0.3 0.5 1.3", "عود وبخور", "96"),
        ("pilot/candle.jpg", "0.5 0.62 1.3", "شموع معطّرة", "74"),
    ]),
    ("bathtub", "الجسم والاستحمام", "640", [
        ("c/3378.jpg", "0.5 0.62 1.35", "أملاح الاستحمام", "64"),
        ("c/58a8.jpg", "0.25 0.6 1.3", "صابون طبيعي", "88"),
        ("c/89b3.jpg", "0.55 0.5 1.25", "طقوس السبا", "52"),
        ("pilot/bath.jpg", "0.38 0.5 1.1", "كرات الاستحمام", "40"),
    ]),
    ("content_cut", "الشعر", "420", [
        ("c/0156.jpg", "0.6 0.45 1.25", "العناية بالشعر", "210"),
        ("c/c594.jpg", "0.5 0.72 1.6", "إكسسوارات الشعر", "96"),
        ("c/1fa4.jpg", "0.72 0.55 1.4", "زيوت وأمصال", "114"),
    ]),
    ("redeem", "هدايا وأطقم", "180", [
        ("c/aef4.jpg", "0.4 0.6 1.3", "أطقم المكياج", "62"),
        ("pilot/brushes.jpg", "0.45 0.5 1.1", "أطقم الفرش", "38"),
        ("c/a59d.jpg", "0.5 0.75 1.2", "هدايا تحت 200 د.إ", "80"),
    ]),
]

def menu():
    h = STAT
    h += '<div class="grab"></div>'
    h += f'''<div class="mhead"><div class="wm"><div class="mono">V</div><div><b>فيلور</b><small>VELOURS BEAUTY</small></div></div>
<div class="ibtn">{ic("close")}</div></div>'''
    h += f'''<div class="search msearch">{ic("search")}<div class="t">ابحثي في كل الأقسام…</div><div class="cam">{ic("photo_camera")}بالصورة</div></div>'''
    q = [("new_releases", "وصل حديثاً", 1), ("percent", "العروض", 0), ("face_retouching_natural", "اختبار البشرة", 0), ("redeem", "بطاقات الهدايا", 0)]
    h += '<div class="mquick">' + ''.join(f'<div class="mq{" hot" if hot else ""}"><i>{ic(a)}</i><span>{b}</span></div>' for a, b, hot in q) + '</div>'
    h += f'''<div class="mclub">{ic("workspace_premium","fill")}<div><b>نادي فيلور · العضوية الفضية</b><small>2,450 نقطة تعادل 122 د.إ</small></div><em>استبدلي{ic("chevron_left")}</em></div>'''
    for icn, name, cnt, subs in CATS:
        short = name.split(' ')[0] if name != "هدايا وأطقم" else "الهدايا"
        h += f'''<div class="mcat"><div class="mch"><div class="l"><div class="ico">{ic(icn)}</div><div><b>{name}</b><small>{cnt} منتجاً · {len(subs)} أقسام فرعية</small></div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll mrow"><div class="mc all">{ic(icn,"big")}<span class="t">كل {name if len(name)<8 else short}<small>{cnt} منتجاً</small></span><div class="go">{ic("arrow_back")}</div></div>'''
        for src, f, n, c in subs:
            h += ph(src, f, "mc", f'<div class="sc"></div><b>{n}<small>{c} منتجاً</small></b>')
        h += '</div></div>'
    items = [("person", "حسابي", '<small>سارة المنصوري</small>'), ("package_2", "طلباتي", '<span class="pill-t">طلب قيد التوصيل</span>'),
             ("favorite", "المفضّلة", '<small>18 منتجاً</small>'), ("language", "اللغة", '<div class="lang"><i class="on">العربية</i><i>English</i></div>'),
             ("support_agent", "تواصلي معنا", '<small>يومياً حتى 11 مساءً</small>')]
    h += '<div class="mfoot">'
    for icn, t, r in items:
        chev = '' if icn == 'language' else ic('chevron_left', 'c')
        h += f'<div class="mli"><div class="li">{ic(icn)}</div><span class="t">{t}</span>{r}{chev}</div>'
    h += '</div>'
    h += f'<div class="mhelp"><div class="a">{ic("chat")}محادثة فورية</div><div class="b">{ic("call")}اتصلي بنا</div></div>'
    h += f'<div class="msoc"><i>{ic("mail")}</i><i>{ic("photo_camera")}</i><i>{ic("location_on")}</i><i>{ic("help")}</i></div>'
    h += '<div class="mver">فيلور · الإصدار 4.2</div>'
    return f'<div class="screen" style="padding-bottom:40px">{h}<div class="homeind"></div></div>'

# ---------------------------------------------------------------- LISTING
def listing():
    h = STAT
    h += f'''<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div class="tt"><b>المكياج</b><small>2,310 منتجاً · 48 ماركة</small></div>
<div class="hgrp"><div class="ibtn">{ic("search")}</div><div class="ibtn">{ic("shopping_bag")}<i class="n">3</i></div></div></div>'''
    chips = [("auto_awesome", "الكل", 1), ("face", "البشرة", 0), ("visibility", "العيون", 0), ("brush", "الشفاه", 0), ("colorize", "الأظافر", 0)]
    h += '<div class="hscroll chips lchips">' + ''.join(f'<div class="chip{" on" if on else ""}">{ic(a)}{b}</div>' for a, b, on in chips) + '</div>'
    h += f'''<div class="fbar"><div class="fbtn">{ic("tune")}تصفية<span class="c">3</span></div>
<div class="fbtn sort"><span>الترتيب: <b>الأكثر مبيعاً</b></span>{ic("keyboard_arrow_down")}</div>
<div class="vt"><i class="on">{ic("grid_view")}</i><i>{ic("view_agenda")}</i></div></div>'''
    h += f'''<div class="atags"><span class="atag">بشرة مختلطة{ic("close")}</span><span class="atag">من 50 إلى 250 د.إ{ic("close")}</span><span class="atag">لمسة مخملية{ic("close")}</span><span class="aclear">مسح الكل</span></div>'''
    h += f'<div class="rcount"><div>عرض <b>8</b> من <b>540</b> منتجاً</div><span>{ic("local_shipping")}توصيل مجاني فوق 150 د.إ</span></div>'
    sk = ["#F3D9C6", "#E3B898", "#D7A887", "#B17A5A", "#8F5C40"]
    cards = [
        pcard("c/062e.jpg", "0.47 0.47 2.0", "ROSÉ LAB", "كوشن الأساس المخملي", "15 غ", 149, 199, "4.8", "2.1k", "-25%", True, (sk, 13), True),
        pcard("c/5745.jpg", "0.8 0.2 2.4", "NOOR SKIN", "باليت ظلال «سموكي» 9 درجات", "9 غ", 175, None, "4.9", "940", "الأكثر مبيعاً", False, (["#B9A4B5", "#7E8A9E", "#C79BA6"], 6), True),
        pcard("c/b75a.jpg", "0.68 0.4 1.5", "ROSÉ LAB", "فرشاة الكابوكي للبودرة", "1 قطعة", 65, None, "4.7", "610", "", False, None, True),
        pcard("c/aef4.jpg", "0.42 0.62 1.4", "VELA", "باليت ظلال «غروب الورد»", "12 لوناً", 185, 240, "4.9", "1.3k", "-25%", False, (["#E6B7BF", "#C8828F", "#9E5A6A", "#7A4452"], 8), True),
        pcard("c/6920.jpg", "0.57 0.57 2.4", "VELA", "بلسم الخدود والشفاه بالورد", "6 غ", 89, None, "4.8", "1.8k", "جديد", True, (["#E8A0A6", "#D7747E", "#B85563", "#9A3C4C"], 4), True),
        pcard("c/268f.jpg", "0.66 0.55 1.7", "NOOR SKIN", "مرطّب الشفاه الملوّن", "4 غ", 64, 80, "4.6", "720", "-20%", False, (["#E9A9A0", "#D98A86", "#C06A6E"], 3), True),
        pcard("c/45ac.jpg", "0.52 0.62 1.5", "MAISON AURA", "باليت ظلال «نيود»", "8 درجات", 210, None, "4.9", "1.1k", "", False, (["#D9B9A6", "#B48E7C", "#8C6B60"], 5), True),
        pcard("pilot/nail.jpg", "0.66 0.47 1.3", "VELA", "طلاء أظافر جِل «توت بري»", "12 مل", 58, None, "4.7", "860", "", False, (["#C2185B", "#E57396", "#8E1C3E", "#F2B8C6"], 18), True),
    ]
    promo = ph("c/91fd.jpg", "0.25 0.55 1.05", "lpromo", f'''<div class="sc"></div><div class="pt"><small>{ic("auto_awesome")}مجموعة الشفاه المخملية</small><b>اشتري قطعتين<br>والثالثة هديّة منّا</b><div class="cta2">تسوّقي العرض{ic("arrow_back")}</div></div>''')
    h += '<div class="lgrid">' + ''.join(cards[:4]) + promo + ''.join(cards[4:]) + '</div>'
    h += f'''<div class="more"><div class="prog"><i></i></div><p>شاهدتِ 8 من 540 منتجاً</p><div class="mb">{ic("expand_more")}تحميل المزيد</div></div>'''
    h += tabbar(1)
    return f'<div class="screen">{h}</div>'

# ---------------------------------------------------------------- PRODUCT
SHADES = [("1N", "#F3D9C6"), ("1W", "#F0D2B8"), ("2C", "#EDCBB2"), ("2W", "#E3B898"), ("3N", "#DDB091"), ("3W", "#D7A887"),
          ("4N", "#C89272"), ("4W", "#BE8762"), ("5W", "#B17A5A"), ("6C", "#8F5C40"), ("7N", "#6B412D"), ("8C", "#4E2E20")]

def product():
    h = STAT
    h += ph("c/062e.jpg", "0.52 0.5 1.0", "gal", f'''<div class="gtop"><div class="grp"><div class="gbtn">{ic("arrow_forward")}</div></div><div class="grp"><div class="gbtn">{ic("ios_share")}</div><div class="gbtn on">{ic("favorite")}</div></div></div>
<span class="gbadge">الأكثر مبيعاً</span><div class="gtry">{ic("face_retouching_natural")}جرّبيه بالكاميرا</div><div class="gdots"><i class="on"></i><i></i><i></i><i></i><i></i></div><div class="gcnt">1 / 6</div>''')
    h += '<div class="thumbs">' + ph("c/062e.jpg", "0.47 0.5 1.6", "on") + ph("c/062e.jpg", "0.85 0.62 2.0") + ph("pilot/shade-face.jpg", "0.4 0.45 1.6") + ph("c/c313.jpg", "0.65 0.5 1.8") + \
         '<div class="sw5">' + ''.join(f'<i style="background:{c}"></i>' for _, c in SHADES[1:9:2]) + '<span>12 درجة</span></div></div>'
    h += f'''<div class="pinfo"><div class="pbr"><b>ROSÉ LAB {ic("verified","fill")}</b><span class="pill-t">حصري لدى فيلور</span></div>
<h1>كوشن الأساس المخملي بعامل حماية SPF 25</h1>
<div class="sub">تغطية متوسطة قابلة للبناء · لمسة نهائية مخملية · 15 غ مع إسفنجة</div>
<div class="rrow"><span class="stars2">{''.join(ic("star","fill") for _ in range(4))}{ic("star_half","fill")}</span><b>4.8</b><span>(2,140 تقييماً)</span><i class="dot"></i><span>بيع 3,200 هذا الشهر</span></div>
<div class="prow2"><div><div class="bigp">149 <small>{CUR}</small></div><div class="oldp"><s>199 {CUR}</s><span class="dc">-25%</span></div></div>
<div class="taxn"><b>متوفر · 12 قطعة متبقية</b>الأسعار شاملة الضريبة</div></div></div>'''
    h += f'<div class="inst">{ic("credit_card")}<div>ادفعي لاحقاً على <b>4 دفعات</b> بقيمة <b>37.25 {CUR}</b> بدون فوائد</div></div>'
    # shades
    h += '<div class="pc first"><div class="ch"><b>الدرجة: <span>3W · بيج دافئ</span></b><a>دليل الدرجات' + ic("chevron_left") + '</a></div>'
    h += '<div class="utabs"><span class="on">الكل 12</span><span>فاتحة</span><span>متوسطة</span><span>داكنة</span></div>'
    h += '<div class="shgrid">' + ''.join(f'<div class="shg{" on" if n=="3W" else ""}{" out" if n=="1W" else ""}"><i style="background:{c}"></i><span>{n}</span></div>' for n, c in SHADES) + '</div>'
    h += f'<div class="match">{ic("verified","fill")}<div><b>تطابق 96%</b> مع درجتكِ المحفوظة من محلّل الدرجات</div><em>3W</em></div>'
    h += '<div class="ch" style="margin-top:18px"><b>العبوة</b></div><div class="opts3"><div class="on"><b>كوشن كامل</b><small>149 د.إ</small></div><div><b>عبوة إعادة تعبئة</b><small>99 د.إ</small></div><div><b>مع فرشاة</b><small>219 د.إ</small></div></div></div>'
    # skin type + meters
    h += '<div class="pc"><div class="ch"><b>يناسب نوع بشرتكِ</b><a>اختبار البشرة' + ic("chevron_left") + '</a></div><div class="skin">'
    for icn, n, s, me in [("water_drop", "جافة", "مناسب", 0), ("contrast", "مختلطة", "مثالي", 1), ("opacity", "دهنية", "مناسب", 0), ("spa", "حسّاسة", "مُختبَر", 0)]:
        h += f'<div class="{"mine" if me else ""}">{"<em>بشرتكِ</em>" if me else ""}{ic(icn)}<b>{n}</b><small>{s}</small></div>'
    h += '</div><div class="meters">'
    for lab, n, val in [("التغطية", 3, "متوسطة"), ("اللمسة", 4, "مخملية"), ("الثبات", 5, "حتى 12 ساعة"), ("الترطيب", 4, "عالٍ")]:
        h += f'<div class="mt"><span>{lab}</span><div class="bar">' + ''.join(f'<i class="{"f" if k < n else ""}"></i>' for k in range(5)) + f'</div><b>{val}</b></div>'
    h += '</div></div>'
    # ingredients
    h += '<div class="pc"><div class="ch"><b>المكوّنات الرئيسية</b><a>القائمة الكاملة' + ic("chevron_left") + '</a></div><div class="ings">'
    for icn, n, d, pct in [("water_drop", "حمض الهيالورونيك", "يرطّب البشرة ويمنح مظهراً ممتلئاً طوال اليوم", "1%"),
                           ("science", "نياسيناميد", "يوحّد اللون ويقلّل ظهور المسام", "2%"),
                           ("local_florist", "ماء الورد الدمشقي", "يهدّئ البشرة ويمنحها إشراقة ناعمة", "")]:
        h += f'<div class="ing"><div class="ii">{ic(icn)}</div><div><b>{n}</b><small>{d}</small></div>{f"<em>{pct}</em>" if pct else ""}</div>'
    h += '</div><div class="free">' + ''.join(f'<span>{ic("check_circle","fill")}{t}</span>' for t in ["خالٍ من البارابين", "بدون عطور", "نباتي", "غير مُسبّب للرؤوس السوداء"]) + '</div></div>'
    # how to use
    h += '<div class="pc"><div class="ch"><b>طريقة الاستخدام</b><a>شاهدي الفيديو' + ic("play_circle") + '</a></div><div class="how">'
    for k, (src, f, t, d) in enumerate([("c/062e.jpg", "0.45 0.5 2.8", "اضغطي برفق", "على الإسفنجة لتأخذ كمية خفيفة"),
                                         ("pilot/shade-face.jpg", "0.45 0.45 1.9", "ربّتي للخارج", "من وسط الوجه نحو الأطراف"),
                                         ("c/c313.jpg", "0.62 0.5 2.0", "ابني التغطية", "بطبقة ثانية على المناطق المطلوبة")]):
        h += f'<div class="hw">' + ph(src, f, "hi", f'<em>{k+1}</em>') + f'<b>{t}</b><small>{d}</small></div>'
    h += f'</div><div class="tip">{ic("lightbulb","fill")}<div>نصيحة الخبيرة: ضعي السيروم قبل الكوشن بدقيقتين للحصول على لمسة أكثر نعومة وثباتاً.</div></div></div>'
    # delivery
    h += '<div class="dlv">'
    for icn, t, s, r in [("local_shipping", "توصيل سريع غداً", "اطلبي خلال 3 ساعات · دبي وأبوظبي", '<span class="ok">مجاني</span>'),
                         ("replay", "إرجاع مجاني خلال 14 يوماً", "للمنتجات غير المفتوحة", ''),
                         ("verified_user", "منتجات أصلية 100%", "من الموزّع المعتمد مباشرة", ''),
                         ("redeem", "عيّنتان مجانيتان", "مع كل طلب فوق 150 د.إ", '')]:
        h += f'<div class="dl"><div class="di2">{ic(icn)}</div><div><b>{t}</b><small>{s}</small></div>{r}</div>'
    h += '</div>'
    # accordions
    h += f'''<div class="accd"><div class="ai"><div class="ah">الوصف{ic("remove")}</div><p>كوشن خفيف بتركيبة مرطّبة يمنح بشرتكِ مظهراً ناعماً كالمخمل دون أن يثقلها. يحتوي على حمض الهيالورونيك وماء الورد، ويحمي من أشعة الشمس بعامل SPF 25.</p></div>
<div class="ai"><div class="ah">المكوّنات الكاملة{ic("add")}</div></div><div class="ai"><div class="ah">تفاصيل المنتج{ic("add")}</div></div><div class="ai"><div class="ah">الشحن والإرجاع{ic("add")}</div></div></div>'''
    # reviews
    h += f'<div class="sech"><div><h3>آراء العميلات</h3><small>97% يوصين بهذا المنتج</small></div><a>كتابة تقييم{ic("edit")}</a></div>'
    h += f'<div class="rvsum"><div class="big"><b>4.8</b><div class="stars2">{"".join(ic("star","fill") for _ in range(5))}</div><small>2,140 تقييماً</small></div><div class="rbars">'
    for n, w, c in [(5, 82, "1.7k"), (4, 12, "260"), (3, 4, "86"), (2, 1, "22"), (1, 1, "12")]:
        h += f'<div class="rb">{n}<i style="--w:{w}%"></i><span>{c}</span></div>'
    h += '</div></div>'
    h += '<div class="rtags"><span class="on">الكل</span><span>مع صور <b>312</b></span><span>بشرة مختلطة <b>640</b></span></div>'
    h += '<div class="rphotos">' + ph("c/1efe.jpg", "0.42 0.38 1.7") + ph("c/f666.jpg", "0.5 0.3 1.3") + ph("c/a060.jpg", "0.4 0.36 1.6") + ph("c/92e6.jpg", "0.42 0.36 1.7", "more2", "<span>+308</span>") + '</div>'
    h += f'''<div class="rv"><div class="rh"><div class="av">ن</div><div><b>نورة الكعبي</b><small>{ic("verified","fill")}مشترية موثّقة</small></div><span class="d">قبل 4 أيام</span></div>
<div class="stars2">{"".join(ic("star","fill") for _ in range(5))}</div><div class="meta"><span>الدرجة: 3W</span><span>بشرة مختلطة</span><span>اشترته مرتين</span></div>
<p>أفضل كوشن جرّبته! خفيف جداً ويبقى طوال اليوم حتى في رطوبة دبي، والدرجة طابقت بشرتي تماماً كما قال المحلّل.</p>
<div class="rp">{ph("c/1efe.jpg", "0.42 0.4 2.2")}{ph("c/f666.jpg", "0.5 0.32 1.6")}</div>
<div class="help"><span>{ic("thumb_up")}مفيد (48)</span><span>{ic("flag")}إبلاغ</span></div></div>'''
    h += f'<div class="allrv">عرض كل التقييمات (2,140){ic("arrow_back")}</div>'
    # goes well with
    h += f'<div class="sech"><div><h3>يكتمل مع</h3><small>اشتري الطقم ووفّري 15%</small></div></div><div class="combo">'
    for on, src, f, n, s, p in [(1, "c/062e.jpg", "0.45 0.47 2.6", "كوشن الأساس المخملي", "هذا المنتج · 3W", 149),
                                (1, "c/b75a.jpg", "0.68 0.4 1.6", "فرشاة الكابوكي الناعمة", "ROSÉ LAB", 65),
                                (1, "c/6920.jpg", "0.57 0.57 2.6", "بلسم الخدود والشفاه بالورد", "VELA", 89)]:
        h += f'<div class="cb"><div class="ck{"" if on else " off"}">{ic("check")}</div>' + ph(src, f, "ci" + (" mult" if src!="c/6920.jpg" else "")) + f'<div class="tx"><b>{n}</b><small>{s}</small></div><em>{p} <small>{CUR}</small></em></div>'
    h += f'<div class="ctot"><div><small>المجموع لثلاث قطع</small><b>258 <small>{CUR}</small></b><s>303</s></div><div class="btn">{ic("shopping_bag")}أضيفي الطقم</div></div></div>'
    # you may also like
    h += f'<div class="sech"><div><h3>قد يعجبكِ أيضاً</h3></div><a>عرض الكل{ic("chevron_left")}</a></div>'
    h += '<div class="hscroll prow">' + pcard("c/aef4.jpg", "0.42 0.62 1.4", "VELA", "باليت ظلال «غروب الورد»", "12 لوناً", 185, None, "4.8", "990", "جديد") + \
         pcard("c/268f.jpg", "0.66 0.55 1.7", "NOOR SKIN", "مرطّب الشفاه الملوّن", "4 غ", 64, None, "4.8", "1.8k", "", False, None, True) + \
         pcard("c/45ac.jpg", "0.52 0.62 1.5", "MAISON AURA", "باليت ظلال «نيود»", "8 درجات", 210, None, "4.9", "1.1k", "", False, None, True) + '</div>'
    h += f'''<div class="sticky"><div class="qty"><i>{ic("add")}</i><b>1</b><i>{ic("remove")}</i></div><div class="atc">{ic("shopping_bag")}أضيفي إلى السلة<em>· 149 {CUR}</em></div></div><div class="homeind"></div>'''
    return f'<div class="screen" style="padding-bottom:112px">{h}</div>'

SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
