import re
from lib import STATUS, ic, ph, stars

FONT = "alexandria"
TITLE = "Sakan"
CUR = "ر.س"

TOKENS = """
:root{--bg:#F3F0E9;--surface:#FBFAF6;--stone:#E9E4D9;--stone2:#DFD8CA;--ink:#23251F;--ink2:#62635A;--ink3:#86857A;--line:#E1DBCF;
--olive:#4D5A36;--olive2:#5F6D45;--oliveT:#4D5A36;--oliveSoft:#E3E5D3;--clay:#B4643E;--claySoft:#F4E6DD;--deep:#2B2E25;--dot:#D3CCBE;
--tabbg:rgba(35,37,31,.86);--tabsolid:#2E3029;--tile:#E9E4D9;--scrimSheet:rgba(35,37,31,.0)}
html.dark{--bg:#121310;--surface:#1B1C18;--stone:#24261F;--stone2:#2D2F27;--ink:#EDEBE3;--ink2:#B4B3A7;--ink3:#8E8D82;--line:#2C2E26;
--olive:#5B6A3F;--olive2:#6A7A4B;--oliveT:#B7C68F;--oliveSoft:#232A1B;--clay:#D9895E;--claySoft:#3A2519;--deep:#1E2019;--dot:#3A3C33;
--tabbg:rgba(40,42,35,.92);--tabsolid:#2A2C25;--tile:#E6E1D6}
html.dark .tabbar{box-shadow:0 0 0 1px rgba(255,255,255,.06),0 14px 30px rgba(0,0,0,.5)}
body{font-family:'Alexandria',sans-serif}
.screen{padding-bottom:118px}
"""

EXTRA = """
/* ---------- shared bits for new screens ---------- */
.topbar{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;gap:10px}
.topbar .tt{flex:1;min-width:0}
.topbar .tt b{display:block;font-size:18px;font-weight:600;line-height:1.2}
.topbar .tt small{display:block;font-size:11px;color:var(--ink3);font-weight:300;margin-top:3px}
.topbar .grp{display:flex;gap:6px}
.chips{gap:8px;margin-top:6px}
.chip{height:36px;padding:0 14px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink2);white-space:nowrap}
.chip.on{background:var(--olive);color:#fff;box-shadow:none;font-weight:500}
.chip .ms{font-size:17px}
.chip small{font-size:10.5px;opacity:.75}

/* ---------- MENU ---------- */
.sheet{margin:0;background:var(--bg)}
.grab{width:40px;height:5px;border-radius:3px;background:var(--stone2);margin:2px auto 8px}
.mhead{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:52px}
.mbrand{display:flex;align-items:center;gap:10px}
.mbrand b{display:block;font-size:20px;font-weight:600;line-height:1}
.mbrand small{display:block;font-size:10px;letter-spacing:.32em;color:var(--ink3);margin-top:5px;direction:ltr;text-align:right}
.mquick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 16px 0}
.mq{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:16px;height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--ink2)}
.mq .ms{font-size:21px;color:var(--oliveT)}
.mcat{margin-top:20px}
.mch{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:11px}
.mch .l{display:flex;align-items:center;gap:10px}
.mch .ico{width:34px;height:34px;border-radius:11px;background:var(--oliveSoft);display:grid;place-items:center;color:var(--oliveT)}
.mch .ico .ms{font-size:19px}
.mch b{display:block;font-size:15.5px;font-weight:600}
.mch small{display:block;font-size:10.5px;color:var(--ink3);font-weight:300;margin-top:2px}
.mch a{font-size:11.5px;color:var(--oliveT);font-weight:500;display:flex;align-items:center;gap:1px}
.mch a .ms{font-size:17px}
.mrow{gap:10px}
.mc{width:112px}
.mc.all{width:100px}
.mc .im{height:116px;border-radius:18px;background-color:var(--stone);position:relative;overflow:hidden}
.mc .im .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(24,24,18,.66) 0%,rgba(24,24,18,.1) 50%,rgba(24,24,18,0) 70%)}
.mc .im b{position:absolute;right:11px;left:10px;bottom:10px;color:#fff;font-size:12.5px;font-weight:500;line-height:1.35}
.mc .im b small{display:block;font-size:10px;font-weight:300;opacity:.9;margin-top:1px}
.mc.all .im{background:var(--olive);display:flex;flex-direction:column;justify-content:space-between;padding:12px;color:#fff}
.mc.all .im .ms{font-size:26px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.mc.all .im span.t{font-size:13px;font-weight:500;line-height:1.4}
.mc.all .im span.t small{display:block;font-size:10.5px;font-weight:300;opacity:.85}
.mc.all .im .go{width:30px;height:30px;border-radius:10px;background:rgba(255,255,255,.16);display:grid;place-items:center;align-self:flex-start}
.mc.all .im .go .ms{font-size:18px}
.mfoot{margin:30px 16px 0;background:var(--surface);border-radius:22px;box-shadow:0 0 0 1px var(--line);padding:4px 14px}
.mli{display:flex;align-items:center;gap:12px;height:50px;border-bottom:1px solid var(--line)}
.mli:last-child{border-bottom:0}
.mli .ms.l{font-size:22px;color:var(--ink2)}
.mli span.t{flex:1;font-size:13.5px}
.mli small{font-size:11.5px;color:var(--ink3)}
.mli .ms.c{font-size:18px;color:var(--ink3)}
.mli .pill2{font-size:11px;font-weight:500;color:var(--oliveT);background:var(--oliveSoft);padding:4px 9px;border-radius:8px}
.lang{display:flex;background:var(--stone);border-radius:10px;padding:3px;gap:2px}
.lang i{font-size:11px;padding:5px 10px;border-radius:8px;color:var(--ink2)}
.lang i.on{background:var(--surface);color:var(--ink);font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.mhelp{margin:12px 16px 0;display:flex;gap:8px}
.mhelp div{flex:1;height:48px;border-radius:15px;background:var(--oliveSoft);color:var(--oliveT);display:flex;align-items:center;justify-content:center;gap:7px;font-size:12.5px;font-weight:500}
.mhelp .ms{font-size:20px}
.mver{text-align:center;font-size:10.5px;color:var(--ink3);margin-top:16px;font-weight:300}

/* ---------- LISTING ---------- */
.fbar{display:flex;align-items:center;gap:8px;margin:14px 16px 0}
.fbtn{height:40px;padding:0 12px;border-radius:13px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;white-space:nowrap}
.fbtn .ms{font-size:19px}
.fbtn .c{min-width:18px;height:18px;border-radius:9px;background:var(--olive);color:#fff;font-size:10px;display:grid;place-items:center;padding:0 5px}
.fbtn.sort{flex:1;justify-content:space-between;font-weight:400;color:var(--ink2)}
.fbtn.sort b{color:var(--ink);font-weight:500}
.vt{display:flex;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:13px;padding:3px;height:40px}
.vt i{width:34px;display:grid;place-items:center;border-radius:10px;color:var(--ink3)}
.vt i.on{background:var(--oliveSoft);color:var(--oliveT)}
.vt .ms{font-size:19px}
.atags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 16px 0;align-items:center}
.atag{height:28px;padding:0 6px 0 10px;border-radius:9px;background:var(--oliveSoft);color:var(--oliveT);font-size:11px;font-weight:500;display:flex;align-items:center;gap:4px}
.atag .ms{font-size:15px}
.aclear{font-size:11px;color:var(--ink3);text-decoration:underline;text-underline-offset:3px;margin-right:4px}
.rcount{margin:16px 16px 12px;font-size:11.5px;color:var(--ink3);display:flex;justify-content:space-between}
.rcount b{color:var(--ink);font-weight:500}
.lgrid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:18px 12px}
.lgrid .pimg{height:188px}
.rate{display:flex;align-items:center;gap:3px;font-size:10.5px;color:var(--ink3);margin-top:3px}
.rate .ms{font-size:13px;color:#B98A3E}
.promo{grid-column:1/-1;height:150px;border-radius:22px;position:relative;overflow:hidden;background-color:var(--deep)}
.promo .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(26,27,21,.86) 0%,rgba(26,27,21,.55) 45%,rgba(26,27,21,0) 75%)}
.promo .pt{position:absolute;right:18px;top:18px;bottom:16px;width:200px;color:#fff;display:flex;flex-direction:column}
.promo .pt small{font-size:10.5px;color:#D9DDC6;display:flex;align-items:center;gap:4px}
.promo .pt small .ms{font-size:14px}
.promo .pt b{font-size:16.5px;font-weight:600;line-height:1.45;margin-top:5px}
.promo .pt .cta2{margin-top:auto;align-self:flex-start;height:34px;padding:0 13px;border-radius:11px;background:var(--olive2);display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500}
.promo .pt .cta2 .ms{font-size:16px}
.more{margin:26px 16px 0;text-align:center}
.more .prog{width:150px;height:4px;border-radius:2px;background:var(--stone2);margin:0 auto;overflow:hidden}
.more .prog i{display:block;height:100%;width:22%;background:var(--oliveT);border-radius:2px}
.more p{font-size:11px;color:var(--ink3);margin-top:8px}
.more .mb{margin:12px auto 0;height:46px;width:200px;border-radius:15px;box-shadow:0 0 0 1.3px var(--oliveT);color:var(--oliveT);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500}
.more .mb .ms{font-size:19px}
.sw{position:absolute;bottom:9px;right:9px;display:flex;gap:3px;background:rgba(251,250,246,.9);padding:4px 5px;border-radius:8px}
.sw i{width:10px;height:10px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}

/* ---------- PRODUCT ---------- */
.gal{position:relative;margin:0 16px;height:372px;border-radius:26px;overflow:hidden;background-color:var(--tile)}
.gal .gtop{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between}
.gbtn{width:40px;height:40px;border-radius:14px;background:rgba(251,250,246,.92);display:grid;place-items:center;color:#23251F;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.gbtn .ms{font-size:21px}
.gbtn.on .ms{color:#B4643E;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.gal .gdots{position:absolute;bottom:14px;left:0;right:0;display:flex;justify-content:center;gap:5px}
.gal .gdots i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.6)}
.gal .gdots i.on{width:18px;background:#fff}
.gal .g3d{position:absolute;bottom:12px;right:12px;height:30px;padding:0 10px;border-radius:10px;background:rgba(35,37,31,.72);color:#fff;font-size:11px;display:flex;align-items:center;gap:4px;backdrop-filter:blur(6px)}
.gal .g3d .ms{font-size:16px}
.gal .gcnt{position:absolute;bottom:12px;left:12px;height:26px;padding:0 9px;border-radius:9px;background:rgba(35,37,31,.6);color:#fff;font-size:10.5px;display:flex;align-items:center;direction:ltr}
.thumbs{display:flex;gap:8px;margin:10px 16px 0}
.thumbs div{flex:1;height:62px;border-radius:14px;background-color:var(--tile);position:relative}
.thumbs div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--oliveT)}
.thumbs div.v:after{content:'';position:absolute;inset:0;border-radius:14px;background:rgba(35,37,31,.45)}
.thumbs div.v span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;z-index:1;font-size:12px;font-weight:500}
.pinfo{padding:18px 16px 0}
.pinfo .brand{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--ink3)}
.pinfo .brand b{color:var(--oliveT);font-weight:500;display:flex;align-items:center;gap:4px}
.pinfo .brand .ms{font-size:15px}
.pinfo h1{font-size:21px;font-weight:600;line-height:1.45;margin-top:6px}
.pinfo .sub{font-size:12px;color:var(--ink2);font-weight:300;margin-top:2px}
.prow2{display:flex;align-items:flex-end;justify-content:space-between;margin-top:14px}
.bigp{font-size:24px;font-weight:600;line-height:1}
.bigp small{font-size:12px;color:var(--ink2);font-weight:400}
.oldp{display:flex;align-items:center;gap:8px;margin-top:7px;font-size:12px;color:var(--ink3)}
.oldp s{font-weight:300}
.oldp .dc{font-size:11px;font-weight:600;color:var(--clay);background:var(--claySoft);padding:3px 7px;border-radius:7px;direction:ltr}
.rbox{text-align:left}
.rbox .r1{display:flex;align-items:center;gap:4px;justify-content:flex-end;font-size:14px;font-weight:600}
.rbox .r1 .ms{font-size:18px;color:#B98A3E}
.rbox small{display:block;font-size:11px;color:var(--ink3);margin-top:4px;text-decoration:underline;text-underline-offset:3px}
.inst{margin:14px 16px 0;padding:11px 12px;border-radius:15px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--ink2)}
.inst b{color:var(--ink);font-weight:500}
.inst .lg{height:24px;padding:0 8px;border-radius:7px;background:var(--stone);font-size:10.5px;font-weight:600;display:grid;place-items:center;color:var(--ink);direction:ltr}
.vsec{margin:20px 16px 0}
.vsec .vh{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.vsec .vh b{font-size:13.5px;font-weight:500}
.vsec .vh b span{color:var(--ink2);font-weight:300}
.vsec .vh a{font-size:11.5px;color:var(--oliveT);display:flex;align-items:center;gap:3px}
.vsec .vh a .ms{font-size:16px}
.fabs{display:flex;gap:10px}
.fab{width:56px;text-align:center}
.fab i{display:block;width:56px;height:56px;border-radius:17px;background-size:cover;position:relative}
.fab.on i{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--oliveT)}
.fab span{display:block;font-size:10.5px;color:var(--ink2);margin-top:6px}
.fab.on span{color:var(--ink);font-weight:500}
.seg{display:flex;gap:8px}
.seg div{flex:1;height:48px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px}
.seg div small{font-size:10px;color:var(--ink3);margin-top:2px}
.seg div.on{box-shadow:0 0 0 1.5px var(--oliveT);background:var(--oliveSoft);font-weight:500}
.seg div.off{opacity:.45;text-decoration:line-through}
.dimcard{margin:22px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:16px}
.dimcard h4,.blk h4{font-size:15.5px;font-weight:600;display:flex;align-items:center;justify-content:space-between}
.dimcard h4 small,.blk h4 small{font-size:11px;color:var(--ink3);font-weight:300}
.dimwrap{display:flex;gap:14px;align-items:center;margin-top:12px}
.dimfig{width:150px;height:140px;flex:0 0 auto;border-radius:16px;background:var(--stone);position:relative;display:grid;place-items:center;color:var(--ink2)}
.dimgrid{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dimgrid div{background:var(--bg);border-radius:13px;padding:9px 10px}
.dimgrid small{display:block;font-size:10px;color:var(--ink3)}
.dimgrid b{display:block;font-size:15px;font-weight:600;margin-top:3px}
.dimgrid b span{font-size:10.5px;font-weight:400;color:var(--ink2)}
.fitnote{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:11.5px;color:var(--ink2);padding-top:12px;border-top:1px dashed var(--line)}
.fitnote .ms{font-size:18px;color:var(--oliveT)}
.blk{margin:12px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:16px}
.mats{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.mat{display:flex;align-items:center;gap:12px}
.mat i{width:46px;height:46px;border-radius:14px;flex:0 0 auto;background-color:var(--stone)}
.mat b{display:block;font-size:13px;font-weight:500}
.mat small{display:block;font-size:11px;color:var(--ink3);font-weight:300;margin-top:2px}
.mat .cert{margin-right:auto;font-size:10px;color:var(--oliveT);background:var(--oliveSoft);padding:4px 8px;border-radius:8px;white-space:nowrap}
.care{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.care div{text-align:center;background:var(--bg);border-radius:14px;padding:10px 4px}
.care .ms{font-size:22px;color:var(--oliveT)}
.care span{display:block;font-size:10px;color:var(--ink2);margin-top:5px;line-height:1.4}
.dlv{margin:12px 16px 0;border-radius:24px;background:var(--oliveSoft);padding:6px 14px}
.dl{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(77,90,54,.12)}
html.dark .dl{border-color:rgba(255,255,255,.06)}
.dl:last-child{border:0}
.dl .ms{font-size:22px;color:var(--oliveT)}
.dl b{display:block;font-size:12.5px;font-weight:500}
.dl small{display:block;font-size:11px;color:var(--ink2);font-weight:300;margin-top:2px}
.acc{margin:12px 16px 0;background:var(--surface);border-radius:22px;box-shadow:0 0 0 1px var(--line);padding:0 16px}
.ac{border-bottom:1px solid var(--line);padding:15px 0}
.ac:last-child{border:0}
.ac .ah{display:flex;justify-content:space-between;align-items:center;font-size:13.5px;font-weight:500}
.ac .ah .ms{font-size:20px;color:var(--ink3)}
.ac p{font-size:12px;color:var(--ink2);line-height:1.85;margin-top:8px;font-weight:300}
.spec{display:grid;grid-template-columns:auto 1fr;gap:7px 14px;margin-top:10px;font-size:11.5px}
.spec span{color:var(--ink3)}
.rv{margin:12px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:16px}
.rvtop{display:flex;gap:16px;align-items:center;margin-top:12px}
.rvbig{text-align:center;width:92px}
.rvbig b{font-size:38px;font-weight:600;line-height:1}
.rvbig .stars{display:flex;justify-content:center;gap:0;margin-top:6px}
.rvbig .stars .ms{font-size:14px}
.rvbig small{display:block;font-size:10.5px;color:var(--ink3);margin-top:4px}
.bars{flex:1;display:flex;flex-direction:column;gap:5px}
.bar{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--ink3)}
.bar i{flex:1;height:5px;border-radius:3px;background:var(--stone);overflow:hidden;display:block}
.bar i em{display:block;height:100%;background:var(--oliveT);border-radius:3px}
.rvph{display:flex;gap:8px;margin-top:14px}
.rvph div{flex:1;height:78px;border-radius:14px;background-color:var(--stone);position:relative}
.rvph div.more2:after{content:'+86';direction:ltr;position:absolute;inset:0;border-radius:14px;background:rgba(35,37,31,.55);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:500}
.rvq{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.rvq .who{display:flex;align-items:center;gap:8px}
.rvq .who i{width:30px;height:30px;border-radius:15px;background:var(--oliveSoft);color:var(--oliveT);display:grid;place-items:center;font-size:12px;font-weight:600}
.rvq .who b{display:block;font-size:12px;font-weight:500}
.rvq .who small{display:block;font-size:10.5px;color:var(--ink3);font-weight:300}
.rvq .who .stars{margin-right:auto;display:flex}
.rvq .who .stars .ms{font-size:13px}
.rvq p{font-size:12px;line-height:1.8;margin-top:8px;color:var(--ink)}
.rvq .tagsr{display:flex;gap:6px;margin-top:8px}
.rvq .tagsr span{font-size:10.5px;color:var(--ink2);background:var(--bg);padding:3px 8px;border-radius:7px}
.gw{margin:0 16px;background:var(--surface);border-radius:22px;box-shadow:0 0 0 1px var(--line);padding:6px 12px}
.gwi{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}
.gwi:last-child{border:0}
.gwi .gi{width:62px;height:62px;border-radius:14px;background-color:var(--tile);flex:0 0 auto}
.gwi .gt{flex:1;min-width:0}
.gwi .gt b{display:block;font-size:12.5px;font-weight:500}
.gwi .gt small{display:block;font-size:10.5px;color:var(--ink3);font-weight:300;margin-top:2px}
.gwi .gt span{display:block;font-size:13px;font-weight:600;margin-top:4px}
.gwi .gt span small{display:inline;font-size:10px;color:var(--ink2);font-weight:400}
.gwi .ck2{width:26px;height:26px;border-radius:8px;border:1.4px solid var(--line);display:grid;place-items:center}
.gwi .ck2.on{background:var(--olive);border-color:var(--olive);color:#fff}
.gwi .ck2 .ms{font-size:17px}
.gwsum{display:flex;justify-content:space-between;align-items:center;padding:10px 0 6px;font-size:12px;color:var(--ink2)}
.gwsum b{font-size:14px;color:var(--ink);font-weight:600}
.gwsum .ab{height:36px;padding:0 12px;border-radius:11px;background:var(--oliveSoft);color:var(--oliveT);font-size:11.5px;font-weight:500;display:flex;align-items:center;gap:5px}
.gwsum .ab .ms{font-size:17px}
.sticky{position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:var(--surface);box-shadow:0 -1px 0 var(--line),0 -12px 30px rgba(0,0,0,.06);display:flex;align-items:center;gap:10px}
html.dark .sticky{box-shadow:0 -1px 0 var(--line),0 -12px 30px rgba(0,0,0,.4)}
.sticky .qty{display:flex;align-items:center;height:52px;border-radius:16px;background:var(--bg);box-shadow:0 0 0 1px var(--line);padding:0 6px;gap:4px}
.sticky .qty i{width:32px;height:32px;display:grid;place-items:center;color:var(--ink2)}
.sticky .qty i .ms{font-size:20px}
.sticky .qty b{width:20px;text-align:center;font-size:15px;font-weight:600}
.sticky .add{flex:1;height:52px;border-radius:16px;background:var(--olive);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 18px;font-size:14px;font-weight:500}
.sticky .add span{display:flex;align-items:center;gap:7px}
.sticky .add .ms{font-size:20px}
.sticky .add em{font-size:13px;font-weight:400;opacity:.9}
.sticky .homeind{bottom:8px}
.pscreen{padding-bottom:110px}
.arsm{margin:12px 16px 0;border-radius:24px;background:var(--deep);padding:8px;display:flex;gap:12px;align-items:center}
.arsm .ai{width:118px;height:100px;border-radius:17px;background-color:var(--stone);position:relative;flex:0 0 auto;overflow:hidden}
.arsm .ai .bx{position:absolute;left:22px;top:24px;width:70px;height:56px;border:1.5px dashed rgba(255,255,255,.9);border-radius:10px}
.arsm .at2{flex:1;color:#fff;padding-left:6px}
.arsm .at2 b{display:block;font-size:14.5px;font-weight:600;line-height:1.45}
.arsm .at2 small{display:block;font-size:11px;color:#C9C9BC;font-weight:300;margin-top:3px}
.arsm .at2 span{margin-top:9px;height:32px;padding:0 11px;border-radius:10px;background:rgba(255,255,255,.14);display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500}
.arsm .at2 span .ms{font-size:16px}
"""

CSS_BASE = open(__file__.replace('tpl_decorA.py', 'decorA_base.css')).read()
CSS = TOKENS + CSS_BASE + EXTRA


def pcard(img, f, name, mat, price, old=None, tag=None, fav=False, ar=False, rate=None, sw=None, mult=False):
    t = (f'<span class="tag ltr">{tag}</span>' if tag.startswith('-') else f'<span class="tag">{tag}</span>') if tag else ''
    a = f'<span class="ar3d">{ic("view_in_ar")}3D</span>' if ar else ''
    s = ''
    if sw:
        s = '<div class="sw">' + ''.join(f'<i style="background:{c}"></i>' for c in sw) + '</div>'
    pr = f'<div class="price">{price} <small>{CUR}</small>' + (f'<s>{old} {CUR}</s>' if old else '') + '</div>'
    r = f'<div class="rate">{ic("star","fill")}{rate}</div>' if rate else ''
    cls = 'pimg' + (' mult' if mult else '')
    return f'''<div class="pcard">{ph(img, f, cls, t + f'<div class="fav{" on" if fav else ""}">{ic("favorite")}</div>' + a + s)}
<div class="pname">{name}</div><div class="pmat">{mat}</div>{r}
<div class="pfoot"><div>{pr}</div><div class="addb">{ic("add")}</div></div></div>'''


def tabbar(active=0):
    tabs = [("home", "الرئيسية"), ("storefront", "المتجر"), ("shopping_bag", "السلة"), ("package_2", "طلباتي"), ("person", "حسابي")]
    out = ''
    for i, (n, l) in enumerate(tabs):
        bd = '<i class="bd">3</i>' if n == 'shopping_bag' else ''
        out += f'<div class="tab{" on" if i == active else ""}">{ic(n)}<span>{l}</span>{bd}</div>'
    return f'<div class="tabbar">{out}</div><div class="homeind"></div>'


# ---------------- HOME ----------------
def home():
    body = open(__file__.replace('tpl_decorA.py', 'pilot_decor_body.txt')).read()
    body = re.sub(r'<div class="status">.*?</div>\s*</div>\s*', STATUS, body, count=1, flags=re.S)
    body = body.replace('<div class="ibtn"><span class="ms">notifications</span><i class="n">2</i></div>',
                        '<div class="ibtn"><span class="ms">notifications</span><i class="n">2</i></div>\n      <div class="ibtn"><span class="ms">menu</span></div>')
    body = body.replace('التوصيل إلى الرياض، الملقا', 'التوصيل إلى الرياض')
    body = body.replace('<div class="homeind"></div>', '<div class="homeind" style="background:var(--ink)"></div>')
    return '<div class="screen">' + body


# ---------------- MENU ----------------
MENU = [
    ("weekend", "الأثاث", "1,840 منتجاً", [
        ("room-living.jpg", "0.5 0.55 1.1", "أرائك وكنب", "320"),
        ("armchair.jpg", "0.42 0.56 1.4", "كراسي بذراعين", "146"),
        ("coffee-table.jpg", "0.45 0.6 1.2", "طاولات قهوة", "98"),
        ("room-dining.jpg", "0.52 0.55 1.6", "طاولات طعام", "84"),
        ("drawers.jpg", "0.52 0.62 1.6", "خزائن وأدراج", "112")]),
    ("floor_lamp", "الإضاءة", "620 منتجاً", [
        ("floor-lamp-sage.jpg", "0.72 0.4 1.25", "مصابيح أرضية", "74"),
        ("desk-lamp.jpg", "0.55 0.5 1.0", "مصابيح مكتب", "61"),
        ("pendant.jpg", "0.5 0.5 1.15", "إضاءة معلّقة", "88"),
        ("brass-lantern.jpg", "0.45 0.6 1.1", "فوانيس وشموع", "53")]),
    ("filter_vintage", "الديكور والإكسسوارات", "2,310 منتجات", [
        ("ribbed-vase.jpg", "0.22 0.6 1.4", "مزهريات", "214"),
        ("gold-mirror.jpg", "0.5 0.45 1.05", "مرايا", "96"),
        ("bowls.jpg", "0.5 0.55 1.2", "أوعية وصوانٍ", "140"),
        ("branch-vase.jpg", "0.5 0.55 1.1", "نباتات مجففة", "77")]),
    ("texture", "المفروشات", "940 منتجاً", [
        ("sofa-pillows.jpg", "0.5 0.62 1.9", "وسائد", "180"),
        ("room-bed.jpg", "0.6 0.6 1.25", "مفارش سرير", "122"),
        ("hero-autumn.jpg", "0.5 0.75 1.2", "بطانيات", "64"),
        ("reading-chair.jpg", "0.5 0.8 1.6", "سجاد", "91")]),
    ("king_bed", "غرف النوم", "510 منتجات", [
        ("oak-bedroom.jpg", "0.5 0.6 1.0", "أسرّة", "58"),
        ("hero-bedroom.jpg", "0.5 0.5 1.1", "طاولات جانبية", "47"),
        ("review-room.jpg", "0.5 0.5 1.0", "مرايا طويلة", "33"),
        ("room-reading.jpg", "0.6 0.7 1.0", "تخزين", "39")]),
    ("potted_plant", "النباتات والأصص", "260 منتجاً", [
        ("aloe-basket.jpg", "0.5 0.55 1.05", "نباتات منزلية", "96"),
        ("plant-glass.jpg", "0.45 0.6 1.6", "أصص زجاجية", "41"),
        ("flowers-glass.jpg", "0.5 0.72 1.3", "زهور طبيعية", "38"),
        ("white-sofa.jpg", "0.42 0.45 2.2", "نباتات صناعية", "85")]),
]


def menu():
    rows = ''
    for icn, name, cnt, subs in MENU:
        cards = f'<div class="mc all"><div class="im">{ic(icn)}<span class="t">كل {name}<small>{cnt}</small></span><span class="go">{ic("arrow_back")}</span></div></div>'
        for img, f, n, c in subs:
            cards += f'<div class="mc">{ph("decor/" + img, f, "im", f"<div class=sc></div><b>{n}<small>{c} منتجاً</small></b>")}</div>'
        rows += f'''<div class="mcat"><div class="mch"><div class="l"><span class="ico">{ic(icn)}</span><div><b>{name}</b><small>{cnt} · {len(subs)} أقسام فرعية</small></div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll mrow">{cards}</div></div>'''
    return f'''<div class="screen sheet" style="padding-bottom:40px">{STATUS}
<div class="grab"></div>
<div class="mhead"><div class="mbrand"><div class="mark"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 10.2 11 3.5l8 6.7V19a1 1 0 0 1-1 1h-4.2v-5.6H8.2V20H4a1 1 0 0 1-1-1z" fill="#fff"/></svg></div><div><b>سَكَن</b><small>SAKAN HOME</small></div></div>
<div class="ibtn">{ic("close")}</div></div>
<div class="srow"><div class="search">{ic("search")}<div class="t">ابحث في كل الأقسام…</div><div class="ar">{ic("photo_camera")}</div></div></div>
<div class="mquick">
<div class="mq">{ic("new_releases")}وصل حديثاً</div><div class="mq">{ic("percent")}العروض</div><div class="mq">{ic("chair")}حسب الغرفة</div><div class="mq">{ic("view_in_ar")}جرّبها بغرفتك</div></div>
{rows}
<div class="mfoot">
<div class="mli">{ic("person","l")}<span class="t">حسابي</span><small>نورة العتيبي</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("package_2","l")}<span class="t">طلباتي</span><span class="pill2">طلب في الطريق</span>{ic("chevron_left","c")}</div>
<div class="mli">{ic("favorite","l")}<span class="t">المفضلة</span><small>14 قطعة</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("language","l")}<span class="t">اللغة</span><div class="lang"><i class="on">العربية</i><i>English</i></div></div>
<div class="mli">{ic("support_agent","l")}<span class="t">تواصل معنا</span><small>يومياً 9ص – 11م</small>{ic("chevron_left","c")}</div>
</div>
<div class="mhelp"><div>{ic("chat")}محادثة فورية</div><div>{ic("call")}اتصل بنا</div></div>
<div class="mver">سَكَن · الإصدار 3.2</div>
<div class="homeind"></div>
</div>'''


# ---------------- LISTING ----------------
def listing():
    P = [
        ("decor/ribbed-vase.jpg", "0.22 0.62 1.5", "مزهرية سيراميك مضلّعة", "سيراميك مطفي · 28 سم", "165", None, None, False, False, "4.9", ["#EDEBE6", "#C9B9A3"]),
        ("decor/pink-vase.jpg", "0.34 0.5 1.55", "مزهرية وردية مع عشب جاف", "طين مطفي · 22 سم", "185", "230", "-20%", True, False, "4.8", ["#D9A79A", "#E9E1D5", "#7D8C6A"]),
        ("decor/pitcher.jpg", "0.6 0.56 1.35", "إبريق خزفي أبيض", "بورسلين لامع", "120", None, None, False, False, "4.7", None),
        ("decor/daisy-vase.jpg", "0.5 0.62 1.25", "مزهرية «نَدى» البيضاء", "بورسلين · 18 سم", "95", None, "جديد", False, False, "4.9", None),
        ("decor/gold-mirror.jpg", "0.5 0.48 1.05", "مرآة جدارية مذهّبة", "إطار منحوت يدوياً", "1,480", None, "حصري", False, False, "5.0", None),
        ("decor/bowls.jpg", "0.5 0.55 1.25", "طقم أوعية مزخرفة", "3 قطع · مصنوعة يدوياً", "245", "350", "-30%", False, False, "4.8", None),
        ("decor/branch-vase.jpg", "0.5 0.6 1.25", "مزهرية زجاج مع أغصان", "زجاج منفوخ · 40 سم", "210", None, None, True, False, "4.6", None),
        ("decor/brass-lantern.jpg", "0.42 0.62 1.15", "فانوس هندسي نحاسي", "نحاس مطلي · زجاج", "340", None, "الأكثر مبيعاً", False, False, "4.9", None),
    ]
    cards = [pcard(a, b, c, d, e, f, g, h, i, j, k) for (a, b, c, d, e, f, g, h, i, j, k) in P]
    promo = f'''<div class="promo" data-src="img/decor/hero-autumn.jpg" data-f="0.26 0.55 1.1"><div class="sc"></div><div class="pt"><small>{ic("redeem")}مجموعة الهدايا</small><b>نسّق الطاولة<br>بخصم 15% على قطعتين</b><span class="cta2">اكتشف التنسيقات{ic("arrow_back")}</span></div></div>'''
    grid = ''.join(cards[:4]) + promo + ''.join(cards[4:])
    return f'''<div class="screen">{STATUS}
<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div class="tt"><b>الديكور والإكسسوارات</b><small>2,310 منتجاً · شحن مجاني فوق 500 {CUR}</small></div><div class="grp"><div class="ibtn">{ic("search")}</div><div class="ibtn">{ic("shopping_bag")}<i class="n">3</i></div></div></div>
<div class="hscroll chips"><div class="chip">الكل</div><div class="chip on">مزهريات <small>214</small></div><div class="chip">مرايا <small>96</small></div><div class="chip">أوعية وصوانٍ</div><div class="chip">فوانيس</div><div class="chip">إطارات</div></div>
<div class="fbar"><div class="fbtn">{ic("tune")}تصفية<span class="c">3</span></div><div class="fbtn sort"><span>ترتيب: <b>الأكثر رواجاً</b></span>{ic("expand_more")}</div><div class="vt"><i class="on">{ic("grid_view")}</i><i>{ic("view_agenda")}</i></div></div>
<div class="atags"><span class="atag">سيراميك{ic("close")}</span><span class="atag">ألوان محايدة{ic("close")}</span><span class="atag">100 – 500 {CUR}{ic("close")}</span><span class="aclear">مسح الكل</span></div>
<div class="rcount"><span><b>214</b> منتجاً</span><span>يصل غداً إلى الرياض</span></div>
<div class="lgrid">{grid}</div>
<div class="more"><div class="prog"><i></i></div><p>عرضت 8 من 214 منتجاً</p><div class="mb">عرض المزيد{ic("expand_more")}</div></div>
{tabbar(1)}
</div>'''


# ---------------- PRODUCT ----------------
def product():
    arm = "decor/armchair.jpg"
    room = "decor/armchair-room.jpg"
    return f'''<div class="screen pscreen">{STATUS}
<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div class="tt"></div><div class="grp"><div class="ibtn">{ic("ios_share")}</div><div class="ibtn">{ic("shopping_bag")}<i class="n">3</i></div></div></div>
{ph(room, "0.5 0.5 1.0", "gal", f'<div class="gtop"><span class="tag" style="position:static;font-size:11px;padding:5px 9px;border-radius:9px">الأكثر مبيعاً</span><div class="gbtn on">{ic("favorite")}</div></div><span class="g3d">{ic("view_in_ar")}عرض 3D</span><span class="gcnt">1 / 6</span><div class="gdots"><i class="on"></i><i></i><i></i><i></i><i></i><i></i></div>')}
<div class="thumbs">{ph(room,"0.5 0.5 1.0","on")}{ph(arm,"0.42 0.56 1.4")}{ph(arm,"0.36 0.42 3.0")}{ph(arm,"0.5 0.88 2.6")}{ph(room,"0.62 0.6 2.2","v",'<span>+2</span>')}</div>
<div class="pinfo">
<div class="brand"><b>{ic("verified","fill")}مجموعة سَكَن الأصلية</b><span>رمز القطعة: SK-2210</span></div>
<h1>كرسي بذراعين «ريم»</h1>
<div class="sub">قماش جاكار منسوج · أرجل من خشب الجوز الصلب</div>
<div class="prow2"><div><div class="bigp">2,350 <small>{CUR}</small></div><div class="oldp"><s>2,790 {CUR}</s><span class="dc">-16%</span><span>شامل الضريبة</span></div></div>
<div class="rbox"><div class="r1">4.8{ic("star","fill")}</div><small>214 تقييماً</small></div></div>
</div>
<div class="inst"><span class="lg">tabby</span><span>قسّمها على 4 دفعات بقيمة <b>587.50 {CUR}</b> بدون فوائد</span></div>
<div class="vsec"><div class="vh"><b>القماش: <span>عسلي جاكار</span></b><a>{ic("texture")}اطلب عيّنة</a></div>
<div class="fabs">
<div class="fab on"><i data-src="img/{arm}" data-f="0.36 0.42 4.0"></i><span>عسلي</span></div>
<div class="fab"><i style="background:#6E7A55"></i><span>زيتوني</span></div>
<div class="fab"><i style="background:#D8CFC0"></i><span>كتّاني</span></div>
<div class="fab"><i style="background:#3B3F46"></i><span>فحمي</span></div>
<div class="fab"><i style="background:#A65E44"></i><span>طوبي</span></div></div></div>
<div class="vsec"><div class="vh"><b>لون الأرجل</b></div>
<div class="seg"><div class="on">جوز طبيعي<small>داكن</small></div><div>بلوط فاتح<small>+150 {CUR}</small></div><div>أسود مطفي<small>+150 {CUR}</small></div></div></div>

<div class="dimcard"><h4>الأبعاد<small>بالسنتيمتر</small></h4>
<div class="dimwrap">
<div class="dimfig"><svg width="132" height="122" viewBox="0 0 132 122" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
<path d="M34 26c0-8 6-12 32-12s32 4 32 12v34H34z"/><path d="M24 54c0-5 4-8 10-8v28H24z"/><path d="M108 54c0-5-4-8-10-8v28h10z"/><rect x="24" y="66" width="84" height="16" rx="5"/><path d="M32 82l-3 18M100 82l3 18"/>
<path d="M24 110h84" stroke-dasharray="3 3" opacity=".6"/><path d="M24 106v8M108 106v8" opacity=".6"/><path d="M120 14v86" stroke-dasharray="3 3" opacity=".6"/><path d="M116 14h8M116 100h8" opacity=".6"/></svg>
<span style="position:absolute;bottom:3px;left:0;right:0;text-align:center;font-size:10px" class="ltr">78</span><span style="position:absolute;left:2px;top:52px;font-size:10px" class="ltr">96</span></div>
<div class="dimgrid"><div><small>العرض</small><b>78 <span>سم</span></b></div><div><small>العمق</small><b>82 <span>سم</span></b></div><div><small>الارتفاع</small><b>96 <span>سم</span></b></div><div><small>المقعد</small><b>44 <span>سم</span></b></div></div></div>
<div class="fitnote">{ic("door_front")}<span>يمرّ من باب بعرض 80 سم · يصل مُجمّعاً بالكامل</span></div></div>

<div class="arsm"><div class="ai" data-src="img/decor/ar-room.jpg" data-f="0.5 0.6 1.0"><div class="bx"></div></div><div class="at2"><b>شاهده في غرفتك</b><small>بمقاسه الحقيقي عبر كاميرا جوالك</small><span>{ic("view_in_ar")}افتح الكاميرا</span></div></div>

<div class="blk"><h4>الخامات<small>مصادر موثّقة</small></h4><div class="mats">
<div class="mat"><i data-src="img/{arm}" data-f="0.36 0.42 5.0"></i><div><b>قماش جاكار منسوج</b><small>55% قطن · 45% بوليستر معاد تدويره</small></div><span class="cert">OEKO-TEX</span></div>
<div class="mat"><i style="background:linear-gradient(135deg,#6B4A31,#8C6544 50%,#5A3D28)"></i><div><b>خشب جوز صلب</b><small>أرجل مخروطة بتشطيب زيتي طبيعي</small></div><span class="cert">FSC</span></div>
<div class="mat"><i style="background:#E6DED0"></i><div><b>إسفنج عالي الكثافة</b><small>كثافة 35 كجم/م³ مع طبقة ألياف</small></div></div></div></div>

<div class="blk"><h4>العناية</h4><div class="care">
<div>{ic("vacuum")}<span>تنظيف بالمكنسة أسبوعياً</span></div><div>{ic("water_drop")}<span>إزالة البقع بقطعة رطبة</span></div><div>{ic("wb_sunny")}<span>بعيداً عن الشمس المباشرة</span></div><div>{ic("dry_cleaning")}<span>تنظيف جاف عند الحاجة</span></div></div></div>

<div class="dlv">
<div class="dl">{ic("local_shipping")}<div><b>توصيل وتركيب مجاني</b><small>يصل الرياض بين 3 – 5 أيام عمل</small></div></div>
<div class="dl">{ic("autorenew")}<div><b>إرجاع خلال 30 يوماً</b><small>نستلمها من بيتك دون رسوم</small></div></div>
<div class="dl">{ic("workspace_premium")}<div><b>ضمان 5 سنوات</b><small>على الهيكل الخشبي والتنجيد</small></div></div></div>

<div class="acc">
<div class="ac"><div class="ah">الوصف{ic("remove")}</div><p>كرسي «ريم» يجمع خطوط منتصف القرن مع دفء النقوش المنسوجة. ظهر منحني يحتضن الجلسة، وذراعان عريضان لكوب قهوة الصباح.</p></div>
<div class="ac"><div class="ah">المواصفات{ic("add")}</div></div>
<div class="ac"><div class="ah">التجميع والتركيب{ic("add")}</div></div>
<div class="ac"><div class="ah">الشحن والإرجاع{ic("add")}</div></div></div>

<div class="sec" style="margin-top:28px"><div class="shead"><div><h3>آراء العملاء</h3></div><a>كل التقييمات{ic("chevron_left")}</a></div></div>
<div class="rv" style="margin-top:0"><div class="rvtop" style="margin-top:0">
<div class="rvbig"><b>4.8</b>{stars()}<small>214 تقييماً</small></div>
<div class="bars"><div class="bar">5<i><em style="width:84%"></em></i></div><div class="bar">4<i><em style="width:11%"></em></i></div><div class="bar">3<i><em style="width:3%"></em></i></div><div class="bar">2<i><em style="width:1%"></em></i></div><div class="bar">1<i><em style="width:1%"></em></i></div></div></div>
<div class="rvph">{ph("decor/review-room.jpg","0.5 0.55 1.1")}{ph("decor/room-reading.jpg","0.6 0.7 1.0")}{ph(room,"0.3 0.5 1.6")}{ph("decor/room-living.jpg","0.5 0.55 1.3","more2")}</div>
<div class="rvq"><div class="who"><i>ر</i><div><b>ريم الشهري</b><small>الخبر · قبل 5 أيام</small></div>{stars()}</div>
<p>القماش أجمل بكثير على الطبيعة، والجلسة مريحة جداً للقراءة. وصل مُجمّعاً والفريق كان محترفاً.</p><div class="tagsr"><span>اللون: عسلي</span><span>مشترٍ موثّق</span></div></div></div>

<div class="sec"><div class="shead"><div><h3>يتناغم معه</h3><div class="sub">أكمل الزاوية ووفّر 10%</div></div></div>
<div class="gw">
<div class="gwi">{ph("decor/floor-lamp.jpg","0.74 0.32 2.2","gi")}<div class="gt"><b>مصباح أرضي بذراع مائل</b><small>معدن مطفي · 160 سم</small><span>520 <small>{CUR}</small></span></div><span class="ck2 on">{ic("check")}</span></div>
<div class="gwi">{ph("decor/sofa-pillows.jpg","0.5 0.62 2.4","gi")}<div class="gt"><b>وسادة «مربعات» صوفية</b><small>45 × 45 سم</small><span>140 <small>{CUR}</small></span></div><span class="ck2 on">{ic("check")}</span></div>
<div class="gwi">{ph("decor/coffee-table.jpg","0.45 0.62 1.4","gi")}<div class="gt"><b>طاولة جانبية لامعة</b><small>سطح أبيض · أرجل كروم</small><span>460 <small>{CUR}</small></span></div><span class="ck2"></span></div>
<div class="gwsum"><span>المجموع لقطعتين <b>3,000 {CUR}</b></span><span class="ab">{ic("add_shopping_cart")}أضف المحدد</span></div></div></div>

<div class="sec"><div class="shead"><div><h3>قد يعجبك أيضاً</h3></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll prow">
{pcard("decor/lounge-chair.jpg","0.62 0.55 1.15","كرسي استرخاء «هُدوء»","خشب بتولا · بوكليه","1,650",ar=True)}
{pcard("decor/reading-chair.jpg","0.55 0.6 1.6","كرسي قراءة «سُهى»","خشب منحني · قماش قطني","1,190",tag="جديد")}
{pcard("decor/tufted-chair.jpg","0.5 0.6 1.2","كرسي «وقار» المبطّن","جلد طبيعي · خشب داكن","3,900")}
</div></div>
<div style="height:24px"></div>
<div class="sticky"><div class="qty"><i>{ic("add")}</i><b>1</b><i>{ic("remove")}</i></div><div class="add"><span>{ic("shopping_bag")}أضف إلى السلة</span><em>2,350 {CUR}</em></div><div class="homeind"></div></div>
</div>'''


SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
