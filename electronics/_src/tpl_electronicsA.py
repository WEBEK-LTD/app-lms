# Template A — "MADAR | مدار": calm, gallery-like, Apple-store rhythm. IBM Plex Sans Arabic, cobalt accent.
from lib import STATUS, ic, ph, stars
from data import P, TV, tvr, TV_CSS, money

FONT = "plex"
TITLE = "Madar"
CUR = "ر.س"

CSS = """
:root{--bg:#F4F5F7;--surface:#FFFFFF;--tile:#ECEEF1;--tile2:#E3E6EA;--ink:#0E1116;--ink2:#4E5561;--ink3:#7D8490;--line:#E2E5EA;
--acc:#2F5BEA;--accT:#2449C8;--accSoft:#E8EEFE;--deep:#0F1217;--deepLine:transparent;--dot:#CDD1D8;--star:#D49B2A;--ok:#14804A;--okSoft:#E3F4EA;
--tabbg:rgba(255,255,255,.82);--tabline:rgba(14,17,22,.08);--ghost:#F0F2F5}
html.dark{--bg:#0A0B0D;--surface:#15171B;--tile:#1E2126;--tile2:#262A30;--ink:#F2F4F7;--ink2:#B4BAC4;--ink3:#8A919C;--line:#25282E;
--acc:#3D6BFF;--accT:#93AEFF;--accSoft:#18213B;--deep:#15171B;--deepLine:#262A31;--dot:#363A41;--star:#E5B24A;--ok:#5CCB8D;--okSoft:#13271C;
--tabbg:rgba(28,30,35,.86);--tabline:rgba(255,255,255,.07);--ghost:#1C1F24}
body{font-family:'IBM Plex Sans Arabic',sans-serif}
.screen{padding-bottom:120px}
.bdi{unicode-bidi:isolate}
/* header */
.hdr{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px 0 10px}
.brandm{display:flex;align-items:center;gap:10px}
.logo{width:36px;height:36px;border-radius:11px;background:var(--ink);display:grid;place-items:center}
.logo svg{display:block}
.wm b{display:block;font-size:17px;font-weight:600;letter-spacing:.32em;direction:ltr;text-align:right;line-height:1;margin-left:-.32em}
.wm span{display:block;font-size:10.5px;color:var(--ink3);margin-top:5px}
.hicons{display:flex;gap:4px}
.ibtn{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;position:relative;color:var(--ink);background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.ibtn .ms{font-size:23px}
.ibtn .dot{position:absolute;top:9px;right:10px;width:7px;height:7px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 2px var(--surface)}
.ibtn .cnt{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10px;font-weight:600;display:grid;place-items:center;padding:0 4px;box-shadow:0 0 0 2px var(--bg)}
/* search */
.search{margin:6px 16px 0;height:48px;border-radius:24px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;padding:0 16px 0 6px;gap:10px}
.search>.ms{font-size:22px;color:var(--ink2)}
.search .t{flex:1;font-size:13.5px;color:var(--ink3);white-space:nowrap;overflow:hidden}
.search .scan{width:36px;height:36px;border-radius:18px;background:var(--ghost);display:grid;place-items:center;color:var(--ink)}
.search .scan .ms{font-size:20px}
/* categories */
.cats{margin-top:18px;gap:12px}
.cat{width:70px;text-align:center}
.cat .av{width:70px;height:70px;border-radius:22px;background-color:var(--tile);position:relative;overflow:hidden}
.cat .av.ic{display:grid;place-items:center;background:var(--ink);color:var(--bg)}
html.dark .cat .av.ic{background:var(--acc);color:#fff}
.cat .av.ic .ms{font-size:28px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.cat span{display:block;font-size:11.5px;margin-top:7px;font-weight:500;white-space:nowrap}
/* hero */
.hero{margin-top:22px;gap:10px}
.hcard{width:342px;height:216px;border-radius:24px;position:relative;overflow:hidden;background-color:#111}
.hcard .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(6,8,12,.86) 0%,rgba(6,8,12,.55) 46%,rgba(6,8,12,0) 76%)}
.hcard .tx{position:absolute;right:20px;top:20px;bottom:18px;width:200px;display:flex;flex-direction:column;color:#fff}
.hcard .eb{font-size:11px;font-weight:500;color:#C9D3F5;display:flex;align-items:center;gap:6px}
.hcard .eb i{width:6px;height:6px;border-radius:3px;background:#7FA0FF}
.hcard h2{font-size:22px;line-height:1.36;font-weight:600;margin-top:8px}
.hcard p{font-size:12px;color:#C8CCD4;margin-top:4px}
.hcard .row{margin-top:auto;display:flex;align-items:center;gap:10px}
.hcard .cta{height:36px;padding:0 14px 0 12px;border-radius:18px;display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;color:#fff;background:var(--acc)}
.hcard .cta .ms{font-size:17px}
.hcard .pr{font-size:11px;color:#C8CCD4;line-height:1.3}
.hcard .pr b{display:block;color:#fff;font-size:13px;font-weight:600}
.dots{display:flex;justify-content:center;gap:5px;margin-top:12px}
.dots i{width:6px;height:6px;border-radius:3px;background:var(--dot)}
.dots i.on{width:20px;background:var(--ink)}
/* services */
.svc{margin:22px 16px 0;background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line);display:grid;grid-template-columns:repeat(4,1fr);padding:14px 4px}
.svc div{text-align:center;font-size:10.5px;line-height:1.4;color:var(--ink2);position:relative}
.svc div+div:before{content:'';position:absolute;right:0;top:6px;bottom:6px;width:1px;background:var(--line)}
.svc .ms{font-size:23px;color:var(--accT);display:block;margin:0 auto 6px}
.svc b{display:block;font-size:11.5px;color:var(--ink);font-weight:600}
.svc .soon .ms{color:var(--ink3)}
.svc .soon b{color:var(--ink3);font-weight:500}
.soon-tag{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:500;color:var(--ink3);background:var(--ghost);box-shadow:inset 0 0 0 1px var(--line);border-radius:7px;padding:3px 7px;white-space:nowrap}
.soon-tag .ms{font-size:13px}
/* sections */
.sec{margin-top:28px}
.shead{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:14px}
.shead h3{font-size:19px;font-weight:600}
.shead .sub{font-size:12px;color:var(--ink3);margin-top:2px}
.shead a{font-size:12.5px;color:var(--accT);font-weight:500;display:flex;align-items:center;gap:1px;padding-bottom:2px}
.shead a .ms{font-size:18px}
/* product cards */
.prow{gap:12px}
.pcard{width:158px}
.pimg{height:178px;border-radius:20px;background-color:var(--tile);position:relative;overflow:hidden}
.fav{position:absolute;top:9px;left:9px;width:32px;height:32px;border-radius:16px;background:rgba(255,255,255,.9);display:grid;place-items:center;color:#0E1116;backdrop-filter:blur(8px)}
.fav .ms{font-size:18px}
.fav.on .ms{color:#E0364A;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.badge{position:absolute;top:10px;right:10px;font-size:10.5px;font-weight:600;color:#0E1116;background:rgba(255,255,255,.92);padding:3px 8px;border-radius:7px}
.badge.sale{background:var(--acc);color:#fff;direction:ltr}
.addb{position:absolute;bottom:9px;left:9px;width:34px;height:34px;border-radius:17px;background:var(--ink);display:grid;place-items:center;color:var(--bg)}
.addb .ms{font-size:20px}
.pbrand{font-size:10px;letter-spacing:.16em;color:var(--ink3);margin-top:10px;direction:ltr;text-align:right;font-weight:500}
.pname{font-size:13px;margin-top:3px;line-height:1.45;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.price{margin-top:5px;display:flex;align-items:baseline;gap:5px;font-size:15px;font-weight:600;white-space:nowrap}
.price small{font-size:10.5px;font-weight:500;color:var(--ink2)}
.price s{font-size:11.5px;color:var(--ink3);font-weight:400}
.rate{display:flex;align-items:center;gap:3px;font-size:11px;color:var(--ink3);margin-top:4px}
.rate .ms{font-size:14px;color:var(--star);font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.rate b{color:var(--ink);font-weight:600}
/* flash */
.flash{margin:0 16px;background:var(--deep);box-shadow:0 0 0 1px var(--deepLine);border-radius:24px;padding:18px 16px 16px;color:#fff}
.flash .top{display:flex;justify-content:space-between;align-items:flex-start}
.flash h3{font-size:18px;font-weight:600;display:flex;align-items:center;gap:6px}
.flash h3 .ms{font-size:20px;color:#8EAAFF;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.flash p{font-size:12px;color:#A9B0BC;margin-top:4px}
.cd{display:flex;gap:4px;direction:ltr;align-items:flex-start}
.cd .u{text-align:center}
.cd b{display:block;width:34px;height:32px;border-radius:10px;background:#242831;font-size:15px;font-weight:600;line-height:32px;font-variant-numeric:tabular-nums}
.cd small{display:block;font-size:9.5px;color:#8E95A1;margin-top:4px}
.cd em{color:#666D78;line-height:30px;font-weight:600}
.fgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
.fi{height:112px;border-radius:15px;background-color:#1E2229;position:relative;overflow:hidden}
.fi .off{position:absolute;top:7px;right:7px;font-size:10.5px;font-weight:600;color:#fff;background:var(--acc);border-radius:6px;padding:2px 6px;direction:ltr}
.fitem .nm{font-size:11.5px;color:#D5DAE2;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fitem .pr{font-size:13.5px;font-weight:600;margin-top:2px;display:flex;gap:4px;align-items:baseline;white-space:nowrap}
.fitem .pr small{font-size:9.5px;font-weight:500;color:#A9B0BC}
.fitem .pr s{font-size:10.5px;color:#7C8390;font-weight:400}
.bar{height:3px;border-radius:2px;background:#2B303A;margin-top:8px;overflow:hidden}
.bar i{display:block;height:100%;background:#8EAAFF;border-radius:2px}
.fitem .left{font-size:10px;color:#8E95A1;margin-top:5px}
/* bento */
.bento{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:124px 124px 104px;gap:10px}
.bt{border-radius:22px;position:relative;overflow:hidden;background-color:#111}
.bt.big{grid-row:span 2}
.bt.wide{grid-column:span 2}
.bt .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(5,7,10,.78) 0%,rgba(5,7,10,.3) 55%,rgba(5,7,10,0) 80%)}
.bt.wide .sc{background:linear-gradient(270deg,rgba(5,7,10,.8) 0%,rgba(5,7,10,.35) 50%,rgba(5,7,10,0) 78%)}
.bt .t{position:absolute;right:14px;left:14px;bottom:13px;color:#fff}
.bt.wide .t{bottom:auto;top:50%;transform:translateY(-50%);left:auto;width:190px}
.bt .t small{display:block;font-size:11px;color:#D0D5DE}
.bt .t b{display:block;font-size:16px;font-weight:600;line-height:1.35;margin-top:1px}
.bt.big .t b{font-size:19px}
.bt .go{position:absolute;top:12px;left:12px;width:30px;height:30px;border-radius:15px;background:rgba(255,255,255,.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,.4);backdrop-filter:blur(10px);display:grid;place-items:center;color:#fff}
.bt .go .ms{font-size:18px}
/* spotlight */
.spot{margin:0 16px;background:var(--surface);border-radius:26px;box-shadow:0 0 0 1px var(--line);overflow:hidden}
.spot .stage{height:178px;position:relative}
.spot .stage .chip3{position:absolute;top:12px;right:12px;font-size:10.5px;font-weight:600;color:#fff;background:#0E1116;border-radius:8px;padding:4px 9px;z-index:2}
.spot .body{padding:16px 18px 18px}
.spot .eb{font-size:10.5px;letter-spacing:.16em;color:var(--ink3);direction:ltr;text-align:right;font-weight:500}
.spot h4{font-size:18px;font-weight:600;margin-top:4px;line-height:1.4}
.spot .specs{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.spot .specs i{font-size:11px;color:var(--ink2);background:var(--ghost);border-radius:8px;padding:4px 9px;display:flex;align-items:center;gap:4px}
.spot .specs i .ms{font-size:14px;color:var(--accT)}
.spot .foot{display:flex;align-items:center;justify-content:space-between;margin-top:14px}
.spot .pp b{font-size:21px;font-weight:600}
.spot .pp small{font-size:11px;color:var(--ink2);font-weight:500;margin-right:3px}
.spot .pp s{display:block;font-size:11.5px;color:var(--ink3);margin-top:1px}
.btn{height:44px;padding:0 18px;border-radius:22px;background:var(--acc);color:#fff;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500;white-space:nowrap}
.btn .ms{font-size:19px}
.spot .note{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:11.5px;color:var(--ink2)}
.spot .note span{display:flex;align-items:center;gap:5px}
.spot .note .ms{font-size:17px;color:var(--ok)}
/* trade-in */
.trade{margin:0 16px;height:150px;border-radius:24px;position:relative;overflow:hidden;background:linear-gradient(120deg,#0F1B3D 0%,#1C3274 100%)}
html.dark .trade{box-shadow:0 0 0 1px #26345E}
.trade .im{position:absolute;left:0;top:0;bottom:0;width:150px}
.trade .im:after{content:'';position:absolute;inset:0;background:linear-gradient(270deg,#13214A 0%,rgba(19,33,74,0) 45%)}
.trade .t{position:absolute;right:18px;top:18px;bottom:16px;width:196px;color:#fff;display:flex;flex-direction:column}
.trade .t small{font-size:11px;color:#AFC0F0;display:flex;align-items:center;gap:5px}
.trade .t small .ms{font-size:15px}
.trade .t b{font-size:16px;font-weight:600;line-height:1.45;margin-top:4px}
.trade .t .cta2{margin-top:auto;align-self:flex-start;height:32px;padding:0 12px;border-radius:16px;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500}
.trade .t .cta2 .ms{font-size:16px}
/* brands */
.brands{gap:8px}
.br{width:104px;height:62px;border-radius:18px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
.br b{direction:ltr;font-size:15px;color:var(--ink);line-height:1}
.br small{font-size:10px;color:var(--ink3)}
/* grid */
.g2{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:18px 12px}
.g2 .pimg{height:164px}
.g2 .pcard{width:auto}
/* appliances */
.arow{gap:10px}
.acard{width:270px;height:112px;border-radius:22px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;gap:12px;padding:8px;align-items:stretch}
.acard .im{width:96px;border-radius:16px;background-color:var(--tile);flex:0 0 auto}
.acard .tx{flex:1;min-width:0;display:flex;flex-direction:column;padding:4px 0 2px}
.acard .tx small{font-size:10px;letter-spacing:.14em;color:var(--ink3);direction:ltr;text-align:right}
.acard .tx b{font-size:13px;font-weight:500;line-height:1.45;margin-top:2px}
.acard .tx .price{margin-top:auto}
.acard .tx .inst{font-size:10.5px;color:var(--ok);display:flex;align-items:center;gap:3px;margin-top:3px}
.acard .tx .inst .ms{font-size:14px}
/* guides */
.grow{gap:12px}
.guide{width:236px}
.guide .im{height:128px;border-radius:20px;background-color:var(--tile);position:relative}
.guide .im .rt{position:absolute;bottom:9px;right:9px;font-size:10px;color:#fff;background:rgba(10,12,16,.55);backdrop-filter:blur(6px);padding:3px 8px;border-radius:7px;display:flex;align-items:center;gap:3px}
.guide .im .rt .ms{font-size:13px}
.guide b{display:block;font-size:13.5px;font-weight:500;margin-top:9px;line-height:1.45}
.guide small{display:block;font-size:11px;color:var(--ink3);margin-top:2px}
/* tab bar */
.tabbar{position:absolute;left:16px;right:16px;bottom:24px;height:66px;border-radius:24px;background:var(--tabbg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 0 0 1px var(--tabline),0 12px 32px rgba(14,17,22,.14);display:flex;align-items:center;justify-content:space-around;padding:0 6px}
html.dark .tabbar{box-shadow:0 0 0 1px var(--tabline),0 14px 30px rgba(0,0,0,.55)}
.tab{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10.5px;color:var(--ink3);width:62px;position:relative}
.tab .ms{font-size:24px}
.tab.on{color:var(--ink);font-weight:600}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;color:var(--accT)}
.tab .cnt{position:absolute;top:-3px;right:12px;min-width:17px;height:17px;border-radius:9px;background:var(--acc);color:#fff;font-size:9.5px;font-weight:600;display:grid;place-items:center;padding:0 4px}
.homeind{bottom:8px}
""" + TV_CSS + """
/* ---------- topbar (listing / product) ---------- */
.topbar{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;gap:10px}
.topbar .tt{flex:1;min-width:0}
.topbar .tt b{display:block;font-size:18px;font-weight:600;line-height:1.25}
.topbar .tt small{display:block;font-size:11px;color:var(--ink3);margin-top:2px}
.topbar .grp{display:flex;gap:6px}
.chips{gap:8px;margin-top:10px}
.chip{height:36px;padding:0 14px;border-radius:18px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink2);white-space:nowrap}
.chip.on{background:var(--ink);color:var(--bg);box-shadow:none;font-weight:500}
.chip small{font-size:10.5px;opacity:.7}
.chip .av{width:24px;height:24px;border-radius:12px;background-color:var(--tile);margin-right:-8px}
.fbar{display:flex;align-items:center;gap:8px;margin:14px 16px 0}
.fbtn{height:40px;padding:0 13px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;white-space:nowrap}
.fbtn .ms{font-size:19px}
.fbtn .c{min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10px;display:grid;place-items:center;padding:0 5px}
.fbtn.sort{flex:1;justify-content:space-between;font-weight:400;color:var(--ink2)}
.fbtn.sort b{color:var(--ink);font-weight:500}
.vt{display:flex;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:20px;padding:3px;height:40px}
.vt i{width:34px;display:grid;place-items:center;border-radius:17px;color:var(--ink3)}
.vt i.on{background:var(--accSoft);color:var(--accT)}
.vt .ms{font-size:19px}
.atags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 16px 0;align-items:center}
.atag{height:28px;padding:0 6px 0 10px;border-radius:14px;background:var(--accSoft);color:var(--accT);font-size:11px;font-weight:500;display:flex;align-items:center;gap:4px;white-space:nowrap}
.atag .ms{font-size:15px}
.aclear{font-size:11px;color:var(--ink3);text-decoration:underline;text-underline-offset:3px;margin-right:4px}
.rcount{margin:16px 16px 12px;font-size:11.5px;color:var(--ink3);display:flex;justify-content:space-between}
.rcount b{color:var(--ink);font-weight:500}
.lgrid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:20px 12px}
.lgrid .pimg{height:184px}
.lgrid .pcard{width:auto}
.spec{font-size:10.5px;color:var(--ink3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw{display:flex;gap:4px;margin-top:7px}
.sw i{width:11px;height:11px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.14)}
html.dark .sw i{box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}
.promo{grid-column:1/-1;height:148px;border-radius:24px;position:relative;overflow:hidden;background:#0F1B3D}
.promo .im{position:absolute;left:0;top:0;bottom:0;width:180px}
.promo .im:after{content:'';position:absolute;inset:0;background:linear-gradient(270deg,#0F1B3D 0%,rgba(15,27,61,0) 55%)}
.promo .pt{position:absolute;right:18px;top:18px;bottom:16px;width:186px;color:#fff;display:flex;flex-direction:column}
.promo .pt small{font-size:10.5px;color:#AFC0F0;display:flex;align-items:center;gap:4px}
.promo .pt small .ms{font-size:14px}
.promo .pt b{font-size:15.5px;font-weight:600;line-height:1.45;margin-top:4px}
.promo .pt .cta2{margin-top:auto;align-self:flex-start;height:32px;padding:0 12px;border-radius:16px;background:var(--acc);display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500}
.promo .pt .cta2 .ms{font-size:16px}
.more{margin:28px 16px 0;text-align:center}
.more .prog{width:150px;height:4px;border-radius:2px;background:var(--tile2);margin:0 auto;overflow:hidden}
.more .prog i{display:block;height:100%;width:22%;background:var(--accT);border-radius:2px}
.more p{font-size:11px;color:var(--ink3);margin-top:8px}
.more .mb{margin:12px auto 0;height:46px;width:200px;border-radius:23px;box-shadow:0 0 0 1.3px var(--ink);color:var(--ink);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500}
.more .mb .ms{font-size:19px}

/* ---------- MENU ---------- */
.grab{width:40px;height:5px;border-radius:3px;background:var(--dot);margin:2px auto 8px}
.mhead{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:52px}
.mquick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 16px 0}
.mq{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;height:66px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--ink2);font-weight:500}
.mq .ms{font-size:22px;color:var(--accT)}
.mcat{margin-top:20px}
.mch{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:11px}
.mch .l{display:flex;align-items:center;gap:10px}
.mch .ico{width:36px;height:36px;border-radius:12px;background:var(--accSoft);display:grid;place-items:center;color:var(--accT)}
.mch .ico .ms{font-size:20px}
.mch b{display:block;font-size:15.5px;font-weight:600}
.mch small{display:block;font-size:10.5px;color:var(--ink3);margin-top:1px}
.mch a{font-size:11.5px;color:var(--accT);font-weight:500;display:flex;align-items:center;gap:1px}
.mch a .ms{font-size:17px}
.mrow{gap:10px}
.mc{width:116px;height:104px;border-radius:20px;background-color:var(--tile);position:relative;overflow:hidden}
.mc .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,8,12,.74) 0%,rgba(6,8,12,.18) 52%,rgba(6,8,12,0) 72%)}
.mc b{position:absolute;right:11px;left:10px;bottom:9px;color:#fff;font-size:12.5px;font-weight:500;line-height:1.35}
.mc b small{display:block;font-size:10px;font-weight:400;color:#D5DAE2;margin-top:1px}
.mc.all{width:104px;background:var(--ink);color:var(--bg);display:flex;flex-direction:column;justify-content:space-between;padding:12px}
html.dark .mc.all{background:var(--acc);color:#fff}
.mc.all .ms.i{font-size:24px}
.mc.all .t{font-size:12.5px;font-weight:600;line-height:1.4}
.mc.all .t small{display:block;font-size:10px;font-weight:400;opacity:.75}
.mc.all .go{width:28px;height:28px;border-radius:14px;background:rgba(127,140,160,.28);display:grid;place-items:center;align-self:flex-start}
.mc.all .go .ms{font-size:17px}
.mc .tvr{border-radius:20px}
.mfoot{margin:30px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:4px 16px}
.mli{display:flex;align-items:center;gap:12px;height:54px;border-bottom:1px solid var(--line)}
.mli:last-child{border-bottom:0}
.mli .ms.l{font-size:22px;color:var(--ink2)}
.mli span.t{flex:1;font-size:14px;font-weight:500}
.mli small{font-size:11.5px;color:var(--ink3)}
.mli .ms.c{font-size:18px;color:var(--ink3)}
.mli .pill2{font-size:11px;font-weight:500;color:var(--ok);background:var(--okSoft);padding:4px 9px;border-radius:8px}
.lang{display:flex;background:var(--ghost);border-radius:12px;padding:3px;gap:2px;box-shadow:inset 0 0 0 1px var(--line)}
.lang i{font-size:11.5px;padding:5px 11px;border-radius:9px;color:var(--ink2)}
.lang i.on{background:var(--surface);color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.mhelp{margin:12px 16px 0;display:flex;gap:8px}
.mhelp div{flex:1;height:50px;border-radius:25px;background:var(--accSoft);color:var(--accT);display:flex;align-items:center;justify-content:center;gap:7px;font-size:13px;font-weight:500}
.mhelp .ms{font-size:20px}
.mver{text-align:center;font-size:10.5px;color:var(--ink3);margin-top:16px}

/* ---------- PRODUCT ---------- */
.gal{position:relative;margin:4px 16px 0;height:372px;border-radius:28px;overflow:hidden;background-color:var(--tile)}
.gal .gdots{position:absolute;bottom:16px;left:0;right:0;display:flex;justify-content:center;gap:5px}
.gal .gdots i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.55)}
.gal .gdots i.on{width:18px;background:#fff}
.gal .g3d{position:absolute;bottom:12px;right:12px;height:30px;padding:0 10px;border-radius:15px;background:rgba(10,12,16,.6);color:#fff;font-size:11px;display:flex;align-items:center;gap:4px;backdrop-filter:blur(8px)}
.gal .g3d .ms{font-size:16px}
.gal .gcnt{position:absolute;bottom:12px;left:12px;height:28px;padding:0 10px;border-radius:14px;background:rgba(10,12,16,.6);color:#fff;font-size:11px;display:flex;align-items:center;direction:ltr}
.gal .gbadge{position:absolute;top:14px;right:14px;font-size:11px;font-weight:600;color:#0E1116;background:rgba(255,255,255,.92);padding:4px 10px;border-radius:9px}
.thumbs{display:flex;gap:8px;margin:10px 16px 0}
.thumbs div{flex:1;height:60px;border-radius:16px;background-color:var(--tile);position:relative}
.thumbs div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--accT)}
.pinfo{padding:18px 16px 0}
.pinfo .brand{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--ink3)}
.pinfo .brand b{color:var(--accT);font-weight:600;display:flex;align-items:center;gap:4px;letter-spacing:.12em;direction:ltr}
.pinfo .brand .ms{font-size:16px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.pinfo h1{font-size:22px;font-weight:600;line-height:1.4;margin-top:6px}
.pinfo .sub{font-size:12.5px;color:var(--ink2);margin-top:3px;line-height:1.6}
.prrow{display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px}
.prrow .p b{font-size:28px;font-weight:600;letter-spacing:-.01em}
.prrow .p small{font-size:13px;color:var(--ink2);font-weight:500;margin-right:4px}
.prrow .p .ln{display:flex;align-items:center;gap:8px;margin-top:3px;font-size:11.5px;color:var(--ink3)}
.prrow .p .ln s{font-size:12.5px}
.prrow .p .off{font-size:11px;font-weight:600;color:var(--accT);background:var(--accSoft);padding:2px 7px;border-radius:7px}
.prrow .r{text-align:left}
.prrow .r .st{display:flex;align-items:center;gap:4px;font-size:15px;font-weight:600;justify-content:flex-end}
.prrow .r .st .ms{font-size:18px;color:var(--star);font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.prrow .r small{display:block;font-size:11px;color:var(--ink3);margin-top:3px;text-decoration:underline;text-underline-offset:3px}
.vlabel{display:flex;justify-content:space-between;align-items:center;margin:22px 16px 10px;font-size:14px;font-weight:600}
.vlabel span{font-weight:400;color:var(--ink2);font-size:13px}
.vlabel a{font-size:11.5px;color:var(--accT);font-weight:500}
.colors{display:flex;gap:14px;margin:0 16px}
.colors .c{text-align:center;font-size:10.5px;color:var(--ink2)}
.colors .c i{display:block;width:44px;height:44px;border-radius:50%;margin:0 auto 6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.colors .c.on i{box-shadow:inset 0 0 0 1px rgba(0,0,0,.12),0 0 0 3px var(--bg),0 0 0 4.5px var(--accT)}
.colors .c.on{color:var(--ink);font-weight:600}
.stor{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 16px}
.stor div{height:62px;border-radius:18px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.stor div b{font-size:14px;font-weight:600}
.stor div small{font-size:11px;color:var(--ink3)}
.stor div.on{box-shadow:0 0 0 1.8px var(--accT);background:var(--accSoft)}
.stor div.on small{color:var(--accT)}
.hl{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:22px 16px 0}
.hl div{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:12px 6px;text-align:center}
.hl .ms{font-size:22px;color:var(--accT)}
.hl b{display:block;font-size:13px;font-weight:600;margin-top:5px}
.hl small{display:block;font-size:10px;color:var(--ink3);margin-top:1px}
.box{margin:14px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:18px}
.box h4{font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:space-between}
.box h4 span{font-size:11.5px;color:var(--ink3);font-weight:400}
.box h4 a{font-size:11.5px;color:var(--accT);font-weight:500}
.box .ds{font-size:12px;color:var(--ink2);margin-top:3px}
.ti{display:flex;align-items:center;gap:12px;margin-top:14px;background:var(--ghost);border-radius:16px;padding:10px 12px}
.ti .im{width:44px;height:44px;border-radius:12px;background-color:var(--tile);flex:0 0 auto}
.ti .tx{flex:1;font-size:12.5px;font-weight:500;line-height:1.45}
.ti .tx small{display:block;font-size:11px;color:var(--ink3);font-weight:400}
.ti .ms{font-size:20px;color:var(--ink3)}
.tires{display:flex;justify-content:space-between;align-items:center;margin-top:14px}
.tires .v small{display:block;font-size:11px;color:var(--ink3)}
.tires .v b{font-size:18px;font-weight:600;color:var(--ok)}
.tires .v b em{font-size:11px;font-weight:500;margin-right:3px}
.tires .v2{text-align:center;border-right:1px solid var(--line);padding-right:16px}
.btn2{height:40px;padding:0 16px;border-radius:20px;background:var(--ink);color:var(--bg);display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500}
.btn2 .ms{font-size:18px}
.wr{display:flex;align-items:center;gap:12px;margin-top:10px;padding:12px;border-radius:16px;box-shadow:0 0 0 1px var(--line)}
.wr:first-of-type{margin-top:14px}
.wr .rd{width:20px;height:20px;border-radius:10px;box-shadow:inset 0 0 0 1.6px var(--ink3);flex:0 0 auto}
.wr.on{box-shadow:0 0 0 1.8px var(--accT);background:var(--accSoft)}
.wr.on .rd{box-shadow:inset 0 0 0 6px var(--accT)}
.wr .tx{flex:1;font-size:13px;font-weight:500}
.wr .tx small{display:block;font-size:11px;color:var(--ink3);font-weight:400;margin-top:1px}
.wr .pr{font-size:12.5px;font-weight:600;white-space:nowrap}
.wr .pr.inc{color:var(--ok);font-weight:500;font-size:11.5px}
.dl{margin:14px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:6px 18px}
.dl .r{display:flex;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line)}
.dl .r:last-child{border-bottom:0}
.dl .r>.ms{font-size:22px;color:var(--accT);width:40px;height:40px;border-radius:13px;background:var(--accSoft);display:grid;place-items:center}
.dl .r .tx{flex:1;font-size:13px;font-weight:500}
.dl .r .tx small{display:block;font-size:11px;color:var(--ink3);font-weight:400;margin-top:2px}
.dl .r .tg{font-size:10.5px;font-weight:600;color:var(--ok);background:var(--okSoft);padding:3px 8px;border-radius:7px}
.stbl{margin-top:12px}
.stbl .r{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid var(--line);font-size:12.5px}
.stbl .r:last-child{border-bottom:0}
.stbl .r span{color:var(--ink3);flex:0 0 108px}
.stbl .r b{font-weight:500;text-align:left;flex:1}
.cmp{margin-top:14px;display:grid;grid-template-columns:78px 1fr 1fr 1fr;font-size:11.5px}
.cmp>div{padding:9px 4px;border-bottom:1px solid var(--line);text-align:center;display:flex;align-items:center;justify-content:center;line-height:1.4}
.cmp>div.k{justify-content:flex-start;color:var(--ink3);text-align:right}
.cmp>div.me{background:var(--accSoft);font-weight:600}
.cmp .hd{border-bottom:0;flex-direction:column;gap:6px;padding-bottom:10px}
.cmp .hd .im{width:58px;height:58px;border-radius:14px;background-color:var(--tile)}
.cmp .hd b{font-size:11.5px;font-weight:600}
.cmp .me.hd{border-radius:14px 14px 0 0;padding-top:8px}
.cmp .me.last{border-radius:0 0 14px 14px;border-bottom:0}
.cmp .ms{font-size:17px;color:var(--ok)}
.cmp .no{color:var(--ink3)}
.acc{margin:14px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:4px 18px}
.acc .it{border-bottom:1px solid var(--line);padding:15px 0}
.acc .it:last-child{border-bottom:0}
.acc .h{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:600}
.acc .h .ms{font-size:20px;color:var(--ink3)}
.acc p{font-size:12.5px;color:var(--ink2);line-height:1.85;margin-top:8px}
.rev{margin:0 16px;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:18px}
.rsum{display:flex;gap:18px;align-items:center}
.rsum .big{text-align:center;flex:0 0 auto}
.rsum .big b{font-size:42px;font-weight:600;line-height:1}
.rsum .big .stars{display:flex;justify-content:center;margin-top:6px}
.rsum .big .stars .ms{font-size:15px;color:var(--star);font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.rsum .big small{display:block;font-size:11px;color:var(--ink3);margin-top:4px}
.bars{flex:1}
.bars div{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--ink3);height:17px}
.bars div i{flex:1;height:5px;border-radius:3px;background:var(--tile2);overflow:hidden;position:relative}
.bars div i em{position:absolute;right:0;top:0;bottom:0;background:var(--accT);border-radius:3px}
.rph{display:flex;gap:8px;margin-top:16px}
.rph div{flex:1;height:72px;border-radius:14px;background-color:var(--tile);position:relative}
.rph div.more2:after{content:'';position:absolute;inset:0;border-radius:14px;background:rgba(10,12,16,.55)}
.rph div.more2 span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;z-index:1;font-size:13px;font-weight:600}
.r1{border-top:1px solid var(--line);margin-top:16px;padding-top:14px}
.r1 .who{display:flex;align-items:center;gap:10px}
.r1 .av{width:36px;height:36px;border-radius:18px;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;font-size:14px;font-weight:600}
.r1 .who b{font-size:13px;font-weight:600;display:block}
.r1 .who small{font-size:11px;color:var(--ink3)}
.r1 .who .stars{margin-right:auto;display:flex}
.r1 .who .stars .ms{font-size:14px;color:var(--star);font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.r1 p{font-size:12.5px;line-height:1.8;margin-top:9px}
.r1 .tags{display:flex;gap:6px;margin-top:9px}
.r1 .tags i{font-size:10.5px;color:var(--ink2);background:var(--ghost);padding:3px 8px;border-radius:7px}
.bund{margin:0 16px;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:6px 14px 14px}
.bi{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.bi .im{width:62px;height:62px;border-radius:16px;background-color:var(--tile);flex:0 0 auto}
.bi .tx{flex:1;font-size:12.5px;font-weight:500;line-height:1.45}
.bi .tx small{display:block;font-size:10.5px;color:var(--ink3);font-weight:400}
.bi .tx b{display:block;font-size:13px;font-weight:600;margin-top:2px}
.ck{width:24px;height:24px;border-radius:8px;box-shadow:inset 0 0 0 1.5px var(--line);display:grid;place-items:center;flex:0 0 auto}
.ck.on{background:var(--acc);box-shadow:none;color:#fff}
.ck .ms{font-size:17px}
.bsum{display:flex;justify-content:space-between;align-items:center;padding-top:12px;font-size:12.5px;color:var(--ink2)}
.bsum b{color:var(--ink);font-size:15px;font-weight:600}
.bsum .save{display:block;font-size:11px;color:var(--ok);margin-top:1px}
.sticky{position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:var(--surface);box-shadow:0 -1px 0 var(--line),0 -12px 30px rgba(14,17,22,.08);display:flex;gap:10px;align-items:center}
.sticky .p{flex:0 0 auto;font-size:11px;color:var(--ink3);line-height:1.35}
.sticky .p b{display:block;font-size:18px;color:var(--ink);font-weight:600}
.sticky .p b small{font-size:11px;font-weight:500;color:var(--ink2)}
.sticky .add{flex:1;height:52px;border-radius:26px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:600}
.sticky .add .ms{font-size:21px}
.sticky .buy{height:52px;padding:0 18px;border-radius:26px;box-shadow:inset 0 0 0 1.5px var(--ink);display:flex;align-items:center;font-size:13.5px;font-weight:600}
.pscreen{padding-bottom:110px}
"""

def logo_svg(size=20, col="var(--bg)"):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none">'
            f'<ellipse cx="12" cy="12" rx="10" ry="4.6" stroke="#7FA0FF" stroke-width="1.6" transform="rotate(-28 12 12)"/>'
            f'<circle cx="12" cy="12" r="4.2" fill="#FFFFFF"/><circle cx="19.4" cy="7.6" r="1.7" fill="#7FA0FF"/></svg>')

LOGO = f'<div class="logo">{logo_svg()}</div>'

def tabbar(active=0, cart=2):
    items = [("home", "الرئيسية"), ("storefront", "تسوّق"), ("shopping_bag", "السلة"), ("receipt_long", "طلباتي"), ("person", "حسابي")]
    h = ''
    for i, (n, l) in enumerate(items):
        c = f'<i class="cnt">{cart}</i>' if n == "shopping_bag" else ''
        h += f'<div class="tab{" on" if i == active else ""}">{ic(n)}<span>{l}</span>{c}</div>'
    return f'<nav class="tabbar">{h}</nav>'

def pr(n, old=None):
    o = f'<s>{money(old)}</s>' if old else ''
    return f'<div class="price"><span>{money(n)}</span><small>ر.س</small>{o}</div>'

def card(k, badge=True, add=True, fav=False, spec=None, sw=None, rate=True, cls="pcard"):
    img, f, br, nm, p, old, r, rc, bd = P[k]
    b = ''
    if badge and bd:
        b = f'<span class="badge sale">{bd}</span>' if bd.startswith('-') else f'<span class="badge">{bd}</span>'
    inner = b + f'<span class="fav{" on" if fav else ""}">{ic("favorite")}</span>' + (f'<span class="addb">{ic("add")}</span>' if add else '')
    s = f'<div class="spec">{spec}</div>' if spec else ''
    swh = ('<div class="sw">' + ''.join(f'<i style="background:{c}"></i>' for c in sw) + '</div>') if sw else ''
    rt = f'<div class="rate">{ic("star")}<b>{r}</b><span>({money(rc)})</span></div>' if rate else ''
    return (f'<div class="{cls}">{ph(img, f, "pimg", inner)}<div class="pbrand">{br}</div>'
            f'<div class="pname">{nm}</div>{s}{rt}{pr(p, old)}{swh}</div>')

def tvcard(k, cls="pcard"):
    img, br, nm, p, old, r, rc, bd = TV[k]
    b = f'<span class="badge sale" style="z-index:2">{bd}</span>' if bd and bd.startswith('-') else (f'<span class="badge" style="z-index:2">{bd}</span>' if bd else '')
    return (f'<div class="{cls}"><div class="pimg">{tvr(k)}{b}<span class="fav" style="z-index:2">{ic("favorite")}</span>'
            f'<span class="addb" style="z-index:2">{ic("add")}</span></div><div class="pbrand">{br}</div>'
            f'<div class="pname">{nm}</div><div class="rate">{ic("star")}<b>{r}</b><span>({money(rc)})</span></div>{pr(p, old)}</div>')

def shead(t, sub=None, link="عرض الكل"):
    s = f'<div class="sub">{sub}</div>' if sub else ''
    a = f'<a>{link}{ic("chevron_left")}</a>' if link else ''
    return f'<div class="shead"><div><h3>{t}</h3>{s}</div>{a}</div>'

def header():
    return f'''<header class="hdr"><div class="brandm">{LOGO}<div class="wm"><b>MADAR</b><span>مدار للإلكترونيات</span></div></div>
<div class="hicons"><div class="ibtn">{ic("notifications")}<i class="dot"></i></div><div class="ibtn">{ic("menu")}</div></div></header>'''

# ------------------------------------------------------------------ HOME
def home():
    cats = [("e/c727a1.jpg", "0.68 0.36 1.6", "الجوالات"), ("e/b7a2c6.jpg", "0.7 0.4 1.9", "اللابتوبات"), ("tv", "", "الشاشات"),
            ("e/7e6629.jpg", "0.5 0.45 1.3", "الكاميرات"), ("e/cc164a.jpg", "0.5 0.48 2.2", "الصوتيات"), ("e/2c638d.jpg", "0.52 0.52 2.2", "الساعات"),
            ("e/d3ac0a.jpg", "0.38 0.6 1.4", "المنزل")]
    ch = f'<div class="cat"><div class="av ic">{ic("local_offer")}</div><span>العروض</span></div>'
    for src, f, l in cats:
        if src == "tv":
            ch += f'<div class="cat"><div class="av">{tvr("c5_65", stand=False)}</div><span>{l}</span></div>'
        else:
            ch += f'<div class="cat">{ph(src, f, "av")}<span>{l}</span></div>'

    hero = f'''<div class="hscroll hero">
{ph("e/c727a1.jpg", "0.5 0.45 1", "hcard", f'<div class="sc"></div><div class="tx"><div class="eb"><i></i>إطلاق جديد · ZENRA</div><h2>X1 برو.<br>كاميرا تتقن الضوء</h2><p>ثلاث عدسات 50 ميجابكسل · تيتانيوم</p><div class="row"><span class="cta">اطلب مسبقًا{ic("arrow_back")}</span><span class="pr">يبدأ من<b>4,899 ر.س</b></span></div></div>')}
{ph("e/44792d.jpg", "0.5 0.5 1", "hcard", '<div class="sc"></div>')}
</div><div class="dots"><i class="on"></i><i></i><i></i><i></i></div>'''

    svc = f'''<div class="svc"><div>{ic("local_shipping")}<b>توصيل سريع</b>خلال 24 ساعة</div><div>{ic("handyman")}<b>تركيب مجاني</b>للشاشات والأجهزة</div>
<div>{ic("verified_user")}<b>ضمان معتمد</b>حتى 3 سنوات</div><div class="soon">{ic("calendar_month")}<b>التقسيط</b>قريبًا</div></div>'''

    newr = ''.join(card(k, fav=(k == 'hstudio')) for k in ['x1pro', 'hstudio', 'ws3', 'dmini', 'l50'])

    fl = ''
    for k, off, left, w in [('apro16', '-8%', 'تبقّى 4 قطع', 78), ('kesp', '-13%', 'تبقّى 9 قطع', 52), ('bpro', '-16%', 'تبقّى 12 قطعة', 40)]:
        img, f, br, nm, p, old, *_ = P[k]
        fl += f'''<div class="fitem">{ph(img, f, "fi", f'<span class="off">{off}</span>')}<div class="nm">{nm}</div>
<div class="pr">{money(p)}<small>ر.س</small><s>{money(old)}</s></div><div class="bar"><i style="width:{w}%"></i></div><div class="left">{left}</div></div>'''
    flash = f'''<div class="flash"><div class="top"><div><h3>{ic("bolt")}صفقات اليوم</h3><p>خصومات حتى 25% لفترة محدودة</p></div>
<div class="cd"><div class="u"><b>06</b><small>ساعة</small></div><em>:</em><div class="u"><b>42</b><small>دقيقة</small></div><em>:</em><div class="u"><b>18</b><small>ثانية</small></div></div></div>
<div class="fgrid">{fl}</div></div>'''

    bento = f'''<div class="bento">
{ph("e/d02ef7.jpg", "0.5 0.6 1.15", "bt big", f'<div class="sc"></div><span class="go">{ic("arrow_back")}</span><div class="t"><small>أيادٍ وشاشات ونظارات VR</small><b>عالم الألعاب</b></div>')}
{ph("e/7e6629.jpg", "0.5 0.45 1", "bt", f'<div class="sc"></div><div class="t"><small>كاميرات وعدسات</small><b>صنّاع المحتوى</b></div>')}
{ph("e/b7a2c6.jpg", "0.6 0.45 1.1", "bt", f'<div class="sc"></div><div class="t"><small>لابتوبات وملحقات</small><b>العمل من المنزل</b></div>')}
{ph("e/5b90a2.jpg", "0.5 0.3 1", "bt wide", f'<div class="sc"></div><span class="go">{ic("arrow_back")}</span><div class="t"><small>شاشات OLED وأنظمة صوت</small><b>سينما في صالتك</b></div>')}
</div>'''

    img, br, nm, p, old, r, rc, bd = TV['c5_65']
    spot = f'''<div class="spot"><div class="stage">{tvr("c5_65")}<span class="chip3">جديد 2026</span></div><div class="body">
<div class="eb">LUMORA · OLED C5</div><h4>سواد حقيقي وألوان لا تنطفئ<br>بشاشة 65 بوصة</h4>
<div class="specs"><i>{ic("4k")}دقة 4K</i><i>{ic("speed")}120 هرتز</i><i>{ic("hdr_on")}HDR</i><i>{ic("handyman")}تركيب جداري مجاني</i></div>
<div class="foot"><div class="pp"><b>{money(p)}</b><small>ر.س</small><s>{money(old)} ر.س</s></div><span class="btn">{ic("add_shopping_cart")}أضف للسلة</span></div>
<div class="note"><span>{ic("check_circle")}متوفر · يصل بعد غد مع التركيب</span><span class="soon-tag">{ic("schedule")}التقسيط قريبًا</span></div></div></div>'''

    trade = f'''<div class="trade">{ph("e/fba5b5.jpg", "0.48 0.55 1.45", "im")}<div class="t"><small>{ic("autorenew")}برنامج الاستبدال</small>
<b>بدّل جوالك القديم واحصل على قيمة تصل إلى 1,800 ر.س</b><span class="cta2">احسب قيمة جهازك{ic("arrow_back")}</span></div></div>'''

    brands = [("ZENRA", "font-weight:700;letter-spacing:.22em", "جوالات"), ("Arcline", "font-weight:300;letter-spacing:.04em;font-size:17px", "لابتوبات"),
              ("LUMORA", "font-weight:500;letter-spacing:.3em;font-size:13px", "شاشات"), ("ryoku", "font-weight:700;letter-spacing:-.02em;font-size:18px", "كاميرات"),
              ("AUREL", "font-weight:400;letter-spacing:.34em;font-size:13.5px", "صوتيات"), ("Hausen", "font-weight:600;font-style:italic;font-size:17px", "أجهزة منزلية")]
    bh = ''.join(f'<div class="br"><b style="{s}">{n}</b><small>{t}</small></div>' for n, s, t in brands)

    best = ''.join(card(k) for k in ['aair14', 'hstudio', 'ws3', 'cr7'])

    apps = ''
    for k, note in [('kesp', 'توصيل مجاني'), ('kwash', 'توصيل وتركيب مجاني'), ('kov', 'تركيب بواسطة فنّي معتمد')]:
        img, f, br, nm, p, old, *_ = P[k]
        apps += f'''<div class="acard">{ph(img, f, "im")}<div class="tx"><small>{br}</small><b>{nm}</b>{pr(p, old)}<span class="inst">{ic("handyman")}{note}</span></div></div>'''

    guides = ''
    for src, f, t, s, m in [("e/5b90a2.jpg", "0.5 0.25 1", "كيف تختار تلفزيونك القادم؟ OLED أم QLED", "دليل الشراء", 6),
                            ("e/2d4e5c.jpg", "0.55 0.5 1.2", "عزل الضوضاء: ما الذي تحتاج معرفته قبل الشراء", "صوتيات", 4),
                            ("e/8cae4a.jpg", "0.5 0.5 1", "أساسيات التصوير الليلي بعدسة ثابتة", "تصوير", 5)]:
        guides += f'<div class="guide">{ph(src, f, "im", f"<span class=rt>{ic("schedule")}{m} دقائق</span>")}<b>{t}</b><small>{s}</small></div>'

    return f'''<div class="screen">{STATUS}{header()}
<div class="search">{ic("search")}<span class="t">ابحث عن جوال، لابتوب أو شاشة…</span><span class="scan">{ic("barcode_scanner")}</span></div>
<div class="hscroll cats">{ch}</div>
{hero}
{svc}
<section class="sec">{shead("وصل حديثًا", "أحدث الإصدارات من علاماتنا الموثوقة")}<div class="hscroll prow">{newr}</div></section>
<section class="sec">{flash}</section>
<section class="sec">{shead("تسوّق حسب اهتمامك", None, "كل الأقسام")}{bento}</section>
<section class="sec">{shead("نجم الموسم", "اختيار محرري مدار", None)}{spot}</section>
<section class="sec">{trade}</section>
<section class="sec">{shead("العلامات التجارية", None, "الكل")}<div class="hscroll brands">{bh}</div></section>
<section class="sec">{shead("الأكثر مبيعًا", "ما يختاره عملاؤنا هذا الأسبوع")}<div class="g2">{best}</div></section>
<section class="sec">{shead("أجهزة المنزل", "مع التوصيل والتركيب")}<div class="hscroll arow">{apps}</div></section>
{tabbar(0)}<div class="homeind"></div></div>'''

# ------------------------------------------------------------------ MENU
MENU = [
 ("smartphone", "الجوالات والأجهزة اللوحية", "1,240", [("x1pro", "جوالات رائدة", 186), ("n5", "الفئة المتوسطة", 312), ("tab11", "أجهزة لوحية", 148), ("found", "أجهزة مجدّدة", 24)]),
 ("laptop_mac", "اللابتوبات والكمبيوتر", "860", [("aair14", "لابتوبات خفيفة", 214), ("apro16", "للمحترفين", 126), ("kbd", "لوحات مفاتيح", 98), ("ssd", "التخزين", 140)]),
 ("tv", "التلفزيونات والشاشات", "420", [("tv:c5_65", "شاشات OLED", 64), ("tv:q7_55", "شاشات QLED", 118), ("img:e/5b90a2.jpg:0.5 0.3 1", "سينما منزلية", 72)]),
 ("photo_camera", "الكاميرات والدرون", "390", [("cr7", "كاميرات", 86), ("l35", "عدسات", 154), ("dmini", "طائرات درون", 42)]),
 ("headphones", "الصوتيات", "640", [("hstudio", "سماعات رأس", 210), ("bpro", "سماعات لاسلكية", 188), ("hheri", "سماعات Hi-Fi", 46)]),
 ("watch", "الساعات الذكية", "280", [("ws3", "ساعات ذكية", 120), ("wsport", "ساعات رياضية", 74), ("wmarble", "أساور وإكسسوارات", 86)]),
 ("kitchen", "الأجهزة المنزلية", "1,050", [("kesp", "مكائن القهوة", 96), ("kwash", "الغسالات", 140), ("kov", "الأفران", 88), ("kmw", "الميكروويف", 64)]),
 ("sports_esports", "الألعاب والمنزل الذكي", "510", [("gpad", "أيادي التحكم", 120), ("gvr", "الواقع الافتراضي", 38), ("scam", "كاميرات المراقبة", 92), ("sbulb", "الإضاءة الذكية", 140)]),
]

def mcard(k, name, n):
    if k.startswith("tv:"):
        return f'<div class="mc">{tvr(k[3:], "dark", stand=True)}<div class="sc"></div><b>{name}<small>{n} منتجًا</small></b></div>'
    if k.startswith("img:"):
        _, src, f = k.split(":")
        return ph(src, f, "mc", f'<div class="sc"></div><b>{name}<small>{n} منتجًا</small></b>')
    img, f, *_ = P[k]
    return ph(img, f, "mc", f'<div class="sc"></div><b>{name}<small>{n} منتجًا</small></b>')

def menu():
    rows = ''
    for icon, name, total, subs in MENU:
        cards = f'<div class="mc all">{ic(icon, "i")}<div class="t">كل {name.split(" ")[0]}<small>{total} منتجًا</small></div><span class="go">{ic("arrow_back")}</span></div>'
        cards += ''.join(mcard(*s) for s in subs)
        rows += f'''<section class="mcat"><div class="mch"><div class="l"><span class="ico">{ic(icon)}</span><div><b>{name}</b><small>{total} منتجًا · {len(subs)} أقسام فرعية</small></div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll mrow">{cards}</div></section>'''
    return f'''<div class="screen" style="padding-bottom:40px">{STATUS}<div class="grab"></div>
<div class="mhead"><div class="brandm">{LOGO}<div class="wm"><b>MADAR</b><span>مدار للإلكترونيات</span></div></div><div class="ibtn">{ic("close")}</div></div>
<div class="search">{ic("search")}<span class="t">ابحث في كل الأقسام…</span><span class="scan">{ic("mic")}</span></div>
<div class="mquick"><div class="mq">{ic("local_offer")}العروض</div><div class="mq">{ic("new_releases")}وصل حديثًا</div><div class="mq">{ic("autorenew")}الاستبدال</div><div class="mq">{ic("handyman")}خدمات التركيب</div></div>
{rows}
<div class="mfoot">
<div class="mli">{ic("person", "l")}<span class="t">حسابي</span><small>عبدالله القحطاني</small>{ic("chevron_left", "c")}</div>
<div class="mli">{ic("package_2", "l")}<span class="t">طلباتي</span><span class="pill2">طلب في الطريق</span>{ic("chevron_left", "c")}</div>
<div class="mli">{ic("favorite", "l")}<span class="t">المفضلة</span><small>9 منتجات</small>{ic("chevron_left", "c")}</div>
<div class="mli">{ic("language", "l")}<span class="t">اللغة</span><div class="lang"><i class="on">العربية</i><i>English</i></div></div>
<div class="mli">{ic("support_agent", "l")}<span class="t">تواصل معنا</span><small>يوميًا من 9 صباحًا حتى 11 مساءً</small>{ic("chevron_left", "c")}</div>
</div>
<div class="mhelp"><div>{ic("chat")}محادثة فورية</div><div>{ic("call")}اتصل بنا</div></div>
<div class="mver">مدار للإلكترونيات · الإصدار 4.1</div><div class="homeind"></div></div>'''

# ------------------------------------------------------------------ LISTING
def listing():
    chips = '<div class="chip on">الكل <small>248</small></div>'
    for k, l, n in [("x1pro", "رائدة", 64), ("n5", "متوسطة", 82), ("tab11", "أجهزة لوحية", 41), ("found", "مجدّدة بضمان", 12)]:
        img, f, *_ = P[k]
        chips += f'<div class="chip">{ph(img, f, "av")}<span style="margin-right:6px">{l}</span> <small>{n}</small></div>'
    specs = {'x1pro': "6.7 بوصة · 50 ميجابكسل", 'x1': "6.3 بوصة · 48 ميجابكسل", 'n5': "6.5 بوصة · بطارية 5,000", 'vs9': "6.6 بوصة · 120 هرتز",
             'vedge': "شاشة منحنية · 256 جيجا", 'found': "فحص 70 نقطة · ضمان سنة", 'tab11': "11 بوصة · 128 جيجا", 'tabpro': "13 بوصة · 512 جيجا"}
    sws = {'x1pro': ["#8E9096", "#1C1D21", "#D9D6CF", "#C9B79C"], 'x1': ["#1C1D21", "#D9D6CF", "#3E5C7E"], 'n5': ["#1C1D21", "#C9CCD2"],
           'vs9': ["#1C1D21", "#5A6B5A"], 'vedge': ["#2D3A5C", "#1C1D21"], 'found': ["#1C1D21"], 'tab11': ["#D9D6CF", "#8E9096"], 'tabpro': ["#8E9096"]}
    order = ['x1pro', 'x1', 'n5', 'vs9', 'PROMO', 'vedge', 'found', 'tab11', 'tabpro']
    g = ''
    for k in order:
        if k == 'PROMO':
            g += f'''<div class="promo">{ph("e/1df480.jpg", "0.5 0.5 1.25", "im")}<div class="pt"><small>{ic("autorenew")}الاستبدال الفوري</small>
<b>جوالك القديم يساوي أكثر مما تتوقع. حتى 1,800 ر.س</b><span class="cta2">قيّم جهازك الآن{ic("arrow_back")}</span></div></div>'''
        else:
            g += card(k, spec=specs[k], sw=sws[k], fav=(k == 'vs9'))
    return f'''<div class="screen">{STATUS}
<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div class="tt"><b>الجوالات والأجهزة اللوحية</b><small>248 منتجًا · 9 علامات تجارية</small></div>
<div class="grp"><div class="ibtn">{ic("search")}</div><div class="ibtn">{ic("shopping_bag")}<i class="cnt">2</i></div></div></div>
<div class="hscroll chips">{chips}</div>
<div class="fbar"><div class="fbtn">{ic("tune")}تصفية<span class="c">3</span></div><div class="fbtn sort"><span>الترتيب: <b>الأكثر مبيعًا</b></span>{ic("expand_more")}</div>
<div class="vt"><i class="on">{ic("grid_view")}</i><i>{ic("view_agenda")}</i></div></div>
<div class="atags"><span class="atag"><span class="ltr">ZENRA</span>{ic("close")}</span><span class="atag">256 جيجا فأكثر{ic("close")}</span><span class="atag">1,500 إلى 5,000 ر.س{ic("close")}</span><span class="aclear">مسح الكل</span></div>
<div class="rcount"><span>عرض <b>8</b> من <b>248</b> منتجًا</span><span>{ic("local_shipping", "", "font-size:15px;vertical-align:-3px;color:var(--ok)")} توصيل غدًا متاح</span></div>
<div class="lgrid">{g}</div>
<div class="more"><div class="prog"><i></i></div><p>شاهدت 8 من 248 منتجًا</p><div class="mb">عرض المزيد{ic("expand_more")}</div></div>
{tabbar(1)}<div class="homeind"></div></div>'''

# ------------------------------------------------------------------ PRODUCT
def product():
    th = ''.join(ph(s, f, "on" if i == 0 else "") for i, (s, f) in enumerate([
        ("e/c727a1.jpg", "0.66 0.4 1.3"), ("e/6a25a0.jpg", "0.48 0.45 1.3"), ("e/8bb01b.jpg", "0.52 0.42 1.4"), ("e/fba5b5.jpg", "0.5 0.55 1.6"), ("e/6ff818.jpg", "0.42 0.66 1.8")]))
    colors = ''.join(f'<div class="c{" on" if i == 0 else ""}"><i style="background:{c}"></i>{n}</div>' for i, (c, n) in enumerate([
        ("linear-gradient(135deg,#A4A6AC,#6E7076)", "تيتانيوم"), ("linear-gradient(135deg,#2A2B30,#111215)", "أسود"), ("linear-gradient(135deg,#EDEBE6,#CFCCC5)", "فضي"), ("linear-gradient(135deg,#D8C6A8,#B49D7B)", "رملي"), ("linear-gradient(135deg,#3E4F6E,#253049)", "أزرق")]))
    specs = [("الشاشة", "6.7 بوصة OLED · ‏120 هرتز"), ("المعالج", "Z3 · ‏3 نانومتر"), ("الذاكرة", "12 جيجا · ‏256 جيجا"), ("الكاميرا الخلفية", "50 + 50 + 12 ميجابكسل"),
             ("الكاميرا الأمامية", "32 ميجابكسل · 4K"), ("البطارية", "5,000 ملي أمبير"), ("الشحن", "سلكي 65 واط · لاسلكي 25 واط"), ("مقاومة الماء", "IP68"), ("الوزن", "204 جرام")]
    st = ''.join(f'<div class="r"><span>{a}</span><b>{b}</b></div>' for a, b in specs)
    ok, no = ic("check_circle"), '<span class="no">—</span>'
    cmp_rows = [("الشاشة", "6.7 بوصة", "6.3 بوصة", "6.6 بوصة"), ("الكاميرا", "ثلاثية 50", "ثنائية 48", "ثلاثية 64"), ("البطارية", "5,000", "4,400", "4,800"),
                ("الشحن اللاسلكي", ok, ok, no), ("السعر (ر.س)", "4,899", "3,299", "2,749")]
    cm = f'''<div class="k hd"></div><div class="me hd">{ph("e/c727a1.jpg", "0.66 0.4 1.4", "im")}<b>X1 برو</b></div>
<div class="hd">{ph("e/6a25a0.jpg", "0.48 0.45 1.4", "im")}<b>X1</b></div><div class="hd">{ph("e/acafa4.jpg", "0.5 0.62 1.8", "im")}<b>فيلو S9</b></div>'''
    for i, (k, a, b, c) in enumerate(cmp_rows):
        last = " last" if i == len(cmp_rows) - 1 else ""
        cm += f'<div class="k">{k}</div><div class="me{last}">{a}</div><div>{b}</div><div>{c}</div>'
    rph = ''.join(ph(s, f) for s, f in [("e/c727a1.jpg", "0.7 0.3 1.8"), ("e/6ff818.jpg", "0.5 0.7 1.8"), ("e/8bb01b.jpg", "0.5 0.45 1.5")])
    rph += ph("e/1df480.jpg", "0.5 0.5 1.5", "more2", "<span>+128</span>")
    bund = ''
    for k, on, sub in [('bpro', True, 'عزل ضوضاء نشط'), ('ws3', True, 'تتزامن تلقائيًا مع X1'), ('hone', False, 'لاسلكية · 40 ساعة')]:
        img, f, br, nm, p, old, *_ = P[k]
        bund += f'<div class="bi">{ph(img, f, "im")}<div class="tx">{nm}<small>{sub}</small><b>{money(p)} ر.س</b></div><span class="ck{" on" if on else ""}">{ic("check") if on else ""}</span></div>'
    like = ''.join(card(k) for k in ['vedge', 'x1', 'tabpro', 'n5'])
    return f'''<div class="screen pscreen">{STATUS}
<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div style="flex:1"></div><div class="grp"><div class="ibtn">{ic("ios_share")}</div><div class="ibtn">{ic("favorite")}</div><div class="ibtn">{ic("shopping_bag")}<i class="cnt">2</i></div></div></div>
{ph("e/c727a1.jpg", "0.6 0.42 1.05", "gal", f'<span class="gbadge">إطلاق جديد</span><span class="g3d">{ic("360")}عرض 360°</span><span class="gcnt">1 / 6</span><div class="gdots"><i class="on"></i><i></i><i></i><i></i><i></i><i></i></div>')}
<div class="thumbs">{th}</div>
<div class="pinfo"><div class="brand"><b>{ic("verified")}ZENRA</b><span>رقم الموديل: ZX1-P256</span></div>
<h1>جوال زنرا X1 برو</h1><div class="sub">شريحة Z3 · كاميرا ثلاثية 50 ميجابكسل · إطار من التيتانيوم</div>
<div class="prrow"><div class="p"><b>4,899</b><small>ر.س</small><div class="ln"><s>5,299 ر.س</s><span class="off"><span class="ltr">-8%</span></span><span>شامل الضريبة</span></div></div>
<div class="r"><div class="st">{ic("star")}4.8</div><small>1,240 تقييمًا</small></div></div>
<div style="margin-top:12px"><span class="soon-tag">{ic("schedule")}التقسيط قريبًا</span></div></div>
<div class="vlabel">اللون: <span style="margin-left:auto;margin-right:6px">تيتانيوم طبيعي</span></div><div class="colors">{colors}</div>
<div class="vlabel">السعة<a>أيّ سعة تناسبني؟</a></div>
<div class="stor"><div class="on"><b>256 جيجا</b><small>4,899 ر.س</small></div><div><b>512 جيجا</b><small>5,599 ر.س</small></div><div><b>1 تيرا</b><small>6,399 ر.س</small></div></div>
<div class="hl"><div>{ic("photo_camera")}<b>50 م.ب</b><small>ثلاث عدسات</small></div><div>{ic("smartphone")}<b>6.7 بوصة</b><small>120 هرتز</small></div><div>{ic("battery_charging_full")}<b>5,000</b><small>ملي أمبير</small></div><div>{ic("memory")}<b>Z3</b><small>3 نانومتر</small></div></div>
<div class="box"><h4>استبدل جهازك القديم<span>تقييم فوري</span></h4><div class="ds">نستلم جهازك عند التوصيل ونخصم قيمته من السعر مباشرة</div>
<div class="ti">{ph("e/acafa4.jpg", "0.5 0.62 1.8", "im")}<div class="tx">جهازك الحالي<small>فيلو S7 · ‏128 جيجا · حالة ممتازة</small></div>{ic("edit")}</div>
<div class="tires"><div class="v"><small>قيمة الاستبدال التقديرية</small><b>1,350<em>ر.س</em></b></div><div class="v v2"><small>السعر بعد الاستبدال</small><b style="color:var(--ink)">3,549<em>ر.س</em></b></div><span class="btn2">ابدأ{ic("arrow_back")}</span></div></div>
<div class="box"><h4>الضمان والحماية</h4><div class="ds">جميع منتجاتنا أصلية بضمان الوكيل المعتمد</div>
<div class="wr on"><span class="rd"></span><div class="tx">ضمان الوكيل · سنتان<small>صيانة مجانية في 40 مركزًا</small></div><span class="pr inc">مشمول</span></div>
<div class="wr"><span class="rd"></span><div class="tx">مدار كير · سنة إضافية<small>يمدّد الضمان إلى 3 سنوات</small></div><span class="pr">+299 ر.س</span></div>
<div class="wr"><span class="rd"></span><div class="tx">حماية الكسر والسوائل<small>استبدال الشاشة مرتين سنويًا</small></div><span class="pr">+449 ر.س</span></div></div>
<div class="dl"><div class="r">{ic("local_shipping")}<div class="tx">توصيل مجاني غدًا<small>إلى الرياض · اطلب خلال 3 ساعات</small></div><span class="tg">مجانًا</span></div>
<div class="r">{ic("settings_suggest")}<div class="tx">التفعيل ونقل البيانات<small>يجهّز الفنّي جوالك وينقل بياناتك عند التوصيل</small></div><span class="tg">مجانًا</span></div>
<div class="r">{ic("storefront")}<div class="tx">الاستلام من المعرض<small>متوفر في 6 فروع قريبة منك</small></div></div>
<div class="r">{ic("assignment_return")}<div class="tx">إرجاع خلال 14 يومًا<small>بدون أسئلة مع العلبة الأصلية</small></div></div></div>
<div class="box"><h4>المواصفات الفنية<a>عرض الكل</a></h4><div class="stbl">{st}</div></div>
<div class="box"><h4>قارن مع أجهزة مشابهة<a>مقارنة تفصيلية</a></h4><div class="cmp">{cm}</div></div>
<div class="acc"><div class="it"><div class="h">الوصف{ic("remove")}</div><p>صُمّم X1 برو لمن يريد كاميرا احترافية في الجيب: مستشعر رئيسي كبير يلتقط تفاصيل الليل بوضوح، وعدسة تقريب بصري 5x، ومعالج Z3 يحافظ على البطارية طوال يومين من الاستخدام المعتاد.</p></div>
<div class="it"><div class="h">ما في الصندوق{ic("add")}</div></div><div class="it"><div class="h">الشحن والإرجاع{ic("add")}</div></div><div class="it"><div class="h">الأسئلة الشائعة<small style="font-size:11px;color:var(--ink3);font-weight:400;margin-right:auto;margin-left:8px">24 سؤالًا</small>{ic("add")}</div></div></div>
<section class="sec">{shead("آراء العملاء", None, "كل التقييمات")}<div class="rev"><div class="rsum"><div class="big"><b>4.8</b>{stars()}<small>1,240 تقييمًا</small></div>
<div class="bars"><div><span>5</span><i><em style="width:82%"></em></i></div><div><span>4</span><i><em style="width:12%"></em></i></div><div><span>3</span><i><em style="width:4%"></em></i></div><div><span>2</span><i><em style="width:1%"></em></i></div><div><span>1</span><i><em style="width:1%"></em></i></div></div></div>
<div class="rph">{rph}</div>
<div class="r1"><div class="who"><span class="av">س</span><div><b>سارة المطيري</b><small>مشترٍ موثّق · قبل 3 أيام</small></div>{stars()}</div>
<p>الكاميرا الليلية مذهلة فعلًا والبطارية تكفيني يومين. التوصيل وصل في اليوم التالي والفنّي نقل كل بياناتي خلال ربع ساعة.</p>
<div class="tags"><i>اللون: تيتانيوم</i><i>السعة: 256 جيجا</i></div></div></div></section>
<section class="sec">{shead("يكتمل مع", "اختر الملحقات ووفّر 10%", None)}<div class="bund">{bund}
<div class="bsum"><div>المجموع لثلاث قطع<span class="save">وفّرت 230 ر.س</span></div><b>6,967 ر.س</b><span class="btn2">{ic("add_shopping_cart")}أضف المحدد</span></div></div></section>
<section class="sec">{shead("قد يعجبك أيضًا")}<div class="hscroll prow">{like}</div></section>
<div class="sticky"><div class="p">الإجمالي<b>4,899 <small>ر.س</small></b></div><div class="add">{ic("shopping_bag")}أضف إلى السلة</div><div class="buy">اشترِ الآن</div></div>
</div>'''

SCREENS = {'home': home, 'menu': menu, 'listing': listing, 'product': product}
