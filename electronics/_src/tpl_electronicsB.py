# Template B — "NABD | نبض": bold tech, graphite + electric lime, dense bento rhythm. Noto Kufi Arabic.
from lib import STATUS, ic, ph, stars
from data import P, TV, tvr, TV_CSS, money

FONT = "kufi"
TITLE = "Nabd"

CSS = """
:root{--bg:#EEEFEA;--surface:#FFFFFF;--tile:#E3E5DF;--tile2:#D8DAD3;--ink:#121314;--ink2:#4A4D50;--ink3:#74787B;--line:#DADCD5;
--lime:#C6F24E;--limeInk:#121314;--limeT:#3D6000;--limeSoft:#E6F4C4;--card:#141517;--cardLine:transparent;--card2:#202125;--star:#121314;
--ok:#2E7D32;--ghost:#F3F4F0;--tab:rgba(20,21,23,.94)}
html.dark{--bg:#09090A;--surface:#141517;--tile:#1C1D20;--tile2:#26272B;--ink:#F1F2EE;--ink2:#B3B6B1;--ink3:#878B87;--line:#242528;
--lime:#C6F24E;--limeInk:#121314;--limeT:#C6F24E;--limeSoft:#1D2511;--card:#17181B;--cardLine:#26272B;--card2:#232428;--star:#C6F24E;
--ok:#8FD694;--ghost:#1A1B1E;--tab:rgba(30,31,34,.94)}
body{font-family:'Noto Kufi Arabic',sans-serif}
.screen{padding-bottom:118px}
.lat{font-family:'Noto Kufi Arabic',sans-serif;direction:ltr;unicode-bidi:isolate}
/* header */
.hdr{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.brandm{display:flex;align-items:center;gap:9px}
.logo{width:38px;height:38px;border-radius:12px;background:var(--lime);display:grid;place-items:center}
.wm b{display:block;font-size:20px;font-weight:700;line-height:1.1}
.wm span{display:block;font-size:8.5px;font-weight:600;letter-spacing:.28em;color:var(--ink3);direction:ltr;text-align:right;margin-top:1px}
.hicons{display:flex;gap:8px}
.sq{width:42px;height:42px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;position:relative;color:var(--ink)}
.sq .ms{font-size:22px}
.sq .dot{position:absolute;top:9px;right:10px;width:8px;height:8px;border-radius:50%;background:#7BAA00;box-shadow:0 0 0 2px var(--surface)}
html.dark .sq .dot{background:var(--lime)}
.sq .cnt{position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;border-radius:7px;background:var(--lime);color:var(--limeInk);font-size:10px;font-weight:700;display:grid;place-items:center;padding:0 4px;box-shadow:0 0 0 2px var(--bg)}
.loc{display:flex;align-items:center;gap:6px;padding:2px 16px 0;font-size:11.5px;color:var(--ink2)}
.loc .ms{font-size:17px;color:var(--ink)}
.loc b{font-weight:600;color:var(--ink)}
.loc .eta{margin-right:auto;font-size:10.5px;font-weight:600;color:var(--limeT);background:var(--limeSoft);padding:2px 8px;border-radius:6px}
.search{margin:10px 16px 0;display:flex;gap:8px}
.search .f{flex:1;height:50px;border-radius:16px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:9px;padding:0 14px;font-size:12.5px;color:var(--ink3)}
.search .f .ms{font-size:22px;color:var(--ink)}
.search .f .k{margin-right:auto;font-size:10px;color:var(--ink3);box-shadow:inset 0 0 0 1px var(--line);border-radius:6px;padding:1px 6px}
.search .fl{width:50px;height:50px;border-radius:16px;background:var(--ink);color:var(--bg);display:grid;place-items:center}
.search .fl .ms{font-size:22px}
/* chips */
.chips{gap:8px;margin-top:14px}
.chip{height:38px;padding:0 13px 0 15px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--ink);white-space:nowrap}
.chip .ms{font-size:18px;color:var(--ink2)}
.chip.on{background:var(--ink);color:var(--bg);box-shadow:none}
.chip.on .ms{color:var(--lime)}
.chip small{font-size:10px;color:var(--ink3);font-weight:400}
.chip.on small{color:inherit;opacity:.6}
/* hero */
.hero{margin-top:16px;gap:10px}
.hcard{width:342px;height:226px;border-radius:22px;position:relative;overflow:hidden;background-color:#000}
.hcard .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(4,5,6,.9) 0%,rgba(4,5,6,.45) 48%,rgba(4,5,6,.05) 78%)}
.hcard .top{position:absolute;top:14px;right:14px;left:14px;display:flex;justify-content:space-between;align-items:center}
.hcard .tg{font-size:10.5px;font-weight:600;color:var(--limeInk);background:var(--lime);padding:3px 9px;border-radius:7px}
.hcard .ct{font-size:11px;color:#D4D7D2;direction:ltr;font-weight:500;letter-spacing:.06em}
.hcard .tx{position:absolute;right:18px;left:18px;bottom:16px;color:#fff;display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.hcard h2{font-size:21px;line-height:1.45;font-weight:700}
.hcard p{font-size:11.5px;color:#C9CCC7;margin-top:2px}
.hcard .cta{flex:0 0 auto;width:48px;height:48px;border-radius:16px;background:var(--lime);color:var(--limeInk);display:grid;place-items:center}
.hcard .cta .ms{font-size:24px}
.segs{display:flex;justify-content:center;gap:4px;margin-top:12px}
.segs i{width:22px;height:4px;border-radius:2px;background:var(--tile2)}
.segs i.on{width:34px;background:var(--ink)}
/* section heads */
.sec{margin-top:30px}
.sh{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:13px}
.sh h3{font-size:17px;font-weight:700;display:flex;align-items:center;gap:8px}
.sh h3 .n{font-size:10px;font-weight:600;color:var(--ink3);direction:ltr;letter-spacing:.1em}
.sh small{display:block;font-size:11px;color:var(--ink3);margin-top:1px;font-weight:400}
.sh a{height:30px;padding:0 10px 0 6px;border-radius:10px;box-shadow:inset 0 0 0 1px var(--line);font-size:11px;font-weight:500;display:flex;align-items:center;gap:2px;color:var(--ink)}
.sh a .ms{font-size:16px}
/* bento cats */
.bento{margin:0 16px;display:grid;grid-template-columns:1.12fr 1fr;grid-template-rows:118px 118px;gap:8px}
.bt{border-radius:20px;position:relative;overflow:hidden;background-color:var(--tile)}
.bt.big{grid-row:span 2}
.bt .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(4,5,6,.78) 0%,rgba(4,5,6,.12) 55%,rgba(4,5,6,0) 75%)}
.bt .t{position:absolute;right:12px;left:12px;bottom:10px;color:#fff;display:flex;justify-content:space-between;align-items:flex-end}
.bt .t b{font-size:15px;font-weight:700;line-height:1.3}
.bt.big .t b{font-size:18px}
.bt .t small{font-size:10px;font-weight:500;color:#DADDD7;display:block}
.bt .t .go{width:28px;height:28px;border-radius:9px;background:var(--lime);color:var(--limeInk);display:grid;place-items:center}
.bt .t .go .ms{font-size:17px}
.bento3{margin:8px 16px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.bento3 .bt{height:104px}
.bento3 .bt .t b{font-size:13px}
/* deal */
.deal{margin:0 16px;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:12px;display:flex;gap:14px}
.deal .im{width:132px;height:172px;border-radius:16px;background-color:#fff;flex:0 0 auto;position:relative}
.deal .im .off{position:absolute;top:8px;right:8px;font-size:11px;font-weight:700;background:var(--ink);color:var(--lime);padding:2px 8px;border-radius:7px;direction:ltr}
html.dark .deal .im .off{background:#000}
.deal .tx{flex:1;min-width:0;display:flex;flex-direction:column;padding:2px 0}
.deal .lb{font-size:10.5px;font-weight:600;color:var(--limeT);display:flex;align-items:center;gap:4px}
.deal .lb .ms{font-size:15px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.deal .nm{font-size:13.5px;font-weight:600;line-height:1.5;margin-top:4px}
.deal .pr{display:flex;align-items:baseline;gap:5px;margin-top:6px}
.deal .pr b{font-size:19px;font-weight:700}
.deal .pr small{font-size:10.5px;color:var(--ink2)}
.deal .pr s{font-size:11px;color:var(--ink3)}
.deal .cd{display:flex;gap:4px;direction:ltr;margin-top:auto;align-items:center}
.deal .cd b{min-width:30px;height:28px;border-radius:8px;background:var(--ink);color:var(--bg);font-size:13px;font-weight:600;display:grid;place-items:center;font-variant-numeric:tabular-nums}
.deal .cd em{color:var(--ink3);font-weight:700}
.deal .cd span{font-size:10px;color:var(--ink3);margin-left:6px}
.deal .prog{height:6px;border-radius:3px;background:var(--tile);margin-top:10px;overflow:hidden}
.deal .prog i{display:block;height:100%;width:72%;background:var(--ink);border-radius:3px}
html.dark .deal .prog i{background:var(--lime)}
.deal .sold{display:flex;justify-content:space-between;font-size:10px;color:var(--ink3);margin-top:5px}
/* ranked */
.rank{margin:0 16px;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:4px 14px}
.ri{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)}
.ri:last-child{border-bottom:0}
.ri .no{width:28px;font-size:20px;font-weight:700;color:var(--ink3);direction:ltr;text-align:center;flex:0 0 auto;letter-spacing:-.02em}
.ri:first-child .no{color:var(--limeT)}
.ri .im{width:58px;height:58px;border-radius:14px;background-color:var(--tile);flex:0 0 auto}
.ri .tx{flex:1;min-width:0}
.ri .tx b{display:block;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ri .tx small{display:flex;align-items:center;gap:3px;font-size:10.5px;color:var(--ink3);margin-top:2px}
.ri .tx small .ms{font-size:13px;color:var(--star);font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.ri .tx .p{font-size:13px;font-weight:700;margin-top:2px}
.ri .tx .p em{font-size:10px;font-weight:500;color:var(--ink2);margin-right:2px}
.ri .ad{width:36px;height:36px;border-radius:12px;box-shadow:inset 0 0 0 1.4px var(--line);display:grid;place-items:center;color:var(--ink)}
.ri .ad .ms{font-size:20px}
/* tabs + grid */
.tabs{display:flex;margin:0 16px 14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:14px;padding:4px;gap:4px}
.tabs i{flex:1;height:36px;border-radius:10px;display:grid;place-items:center;font-size:12px;font-weight:500;color:var(--ink2)}
.tabs i.on{background:var(--ink);color:var(--bg);font-weight:600}
.grid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pc{background:var(--surface);border-radius:20px;box-shadow:0 0 0 1px var(--line);padding:6px 6px 12px}
.pc .pimg{height:150px;border-radius:15px;background-color:var(--tile);position:relative;overflow:hidden}
.pc .fav{position:absolute;top:8px;left:8px;width:30px;height:30px;border-radius:10px;background:rgba(255,255,255,.92);display:grid;place-items:center;color:#121314}
.pc .fav .ms{font-size:17px}
.pc .fav.on .ms{color:#121314;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.pc .bd{position:absolute;top:8px;right:8px;font-size:10px;font-weight:700;color:#121314;background:var(--lime);padding:2px 7px;border-radius:7px}
.pc .bd.n{background:rgba(255,255,255,.92);color:#121314;font-weight:600}
.pc .bd.s{direction:ltr}
.pc .in{padding:10px 6px 0}
.pc .br{font-size:9px;font-weight:600;letter-spacing:.2em;color:var(--ink3);direction:ltr;text-align:right}
.pc .nm{font-size:12px;font-weight:600;line-height:1.55;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .sp{display:flex;gap:4px;margin-top:6px;flex-wrap:nowrap;overflow:hidden}
.pc .sp i{font-size:9.5px;color:var(--ink2);background:var(--ghost);box-shadow:inset 0 0 0 1px var(--line);border-radius:6px;padding:1px 6px;white-space:nowrap}
.pc .rt{display:flex;align-items:center;gap:3px;font-size:10px;color:var(--ink3);margin-top:6px}
.pc .rt .ms{font-size:13px;color:var(--star);font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.pc .rt b{color:var(--ink);font-weight:600}
.pc .bt2{display:flex;align-items:flex-end;justify-content:space-between;margin-top:6px}
.pc .pr b{display:block;font-size:15px;font-weight:700;line-height:1.3}
.pc .pr b em{font-size:9.5px;font-weight:500;color:var(--ink2);margin-right:4px}
.pc .pr s{display:block;font-size:10px;color:var(--ink3);line-height:1.2}
.pc .add{width:36px;height:36px;border-radius:12px;background:var(--lime);color:var(--limeInk);display:grid;place-items:center}
.pc .add .ms{font-size:21px}
/* setup bundle */
.setup{margin:0 16px;background:var(--card);box-shadow:0 0 0 1px var(--cardLine);border-radius:26px;padding:18px;color:#F1F2EE}
.setup .hd{display:flex;justify-content:space-between;align-items:flex-start}
.setup .hd small{font-size:10.5px;color:var(--lime);font-weight:600;display:flex;align-items:center;gap:4px}
.setup .hd small .ms{font-size:15px}
.setup .hd b{display:block;font-size:17px;font-weight:700;margin-top:4px;line-height:1.45}
.setup .save{font-size:11px;font-weight:700;color:var(--limeInk);background:var(--lime);padding:4px 9px;border-radius:8px;white-space:nowrap}
.setup .its{display:grid;grid-template-columns:1.25fr 1fr;grid-template-rows:84px 84px;gap:8px;margin-top:14px}
.setup .it{border-radius:16px;background-color:var(--card2);position:relative;overflow:hidden}
.setup .it.big{grid-row:span 2}
.setup .it span{position:absolute;bottom:7px;right:7px;font-size:10px;font-weight:600;color:#fff;background:rgba(10,11,12,.62);backdrop-filter:blur(6px);padding:2px 7px;border-radius:6px}
.setup .ft{display:flex;align-items:center;justify-content:space-between;margin-top:14px}
.setup .ft .p{font-size:11px;color:#A9ADA8}
.setup .ft .p b{display:block;font-size:19px;color:#fff;font-weight:700}
.setup .ft .p b em{font-size:11px;font-weight:500;color:#C9CCC7;margin-right:3px}
.setup .ft .p s{font-size:11px;color:#83877F;margin-right:6px}
.lbtn{height:46px;padding:0 18px;border-radius:15px;background:var(--lime);color:var(--limeInk);display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;white-space:nowrap}
.lbtn .ms{font-size:19px}
/* trade */
.trade{margin:0 16px;height:156px;border-radius:24px;background:var(--lime);position:relative;overflow:hidden;color:#121314}
.trade .im{position:absolute;left:12px;top:12px;bottom:12px;width:118px;border-radius:16px}
.trade .t{position:absolute;right:18px;top:16px;bottom:16px;width:200px;display:flex;flex-direction:column}
.trade .t small{font-size:10.5px;font-weight:600;display:flex;align-items:center;gap:4px;opacity:.75}
.trade .t small .ms{font-size:15px}
.trade .t b{font-size:16px;font-weight:700;line-height:1.5;margin-top:3px}
.trade .t .c{margin-top:auto;align-self:flex-start;height:34px;padding:0 12px;border-radius:11px;background:#121314;color:var(--lime);display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600}
.trade .t .c .ms{font-size:16px}
/* services */
.svc{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sv{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:12px;display:flex;gap:10px;align-items:center}
.sv .ms{width:38px;height:38px;border-radius:12px;background:var(--limeSoft);color:var(--limeT);display:grid;place-items:center;font-size:21px;flex:0 0 auto}
.sv b{display:block;font-size:12px;font-weight:600}
.sv small{display:block;font-size:10px;color:var(--ink3);margin-top:1px}
.sv.soon .ms{background:var(--ghost);color:var(--ink3);box-shadow:inset 0 0 0 1px var(--line)}
.sv.soon b{color:var(--ink2)}
.soon-tag{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:500;color:var(--ink3);background:var(--ghost);box-shadow:inset 0 0 0 1px var(--line);border-radius:7px;padding:2px 7px;white-space:nowrap}
.soon-tag .ms{font-size:13px}
/* brands marquee */
.brs{gap:8px}
.brs div{height:46px;padding:0 18px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;font-size:13px;color:var(--ink);direction:ltr;white-space:nowrap}
/* tab bar */
.tabbar{position:absolute;left:16px;right:16px;bottom:24px;height:64px;border-radius:22px;background:var(--tab);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:space-between;padding:0 8px;box-shadow:0 14px 30px rgba(0,0,0,.22)}
html.dark .tabbar{box-shadow:0 0 0 1px #2A2B2F,0 14px 30px rgba(0,0,0,.6)}
.tab{height:46px;min-width:48px;border-radius:15px;display:flex;align-items:center;justify-content:center;gap:6px;color:#9A9E99;position:relative;padding:0 10px}
.tab .ms{font-size:23px}
.tab .l{display:none;font-size:12px;font-weight:600}
.tab.on{background:var(--lime);color:#121314}
.tab.on .l{display:inline}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tab .cnt{position:absolute;top:5px;right:4px;min-width:17px;height:17px;border-radius:6px;background:var(--lime);color:#121314;font-size:9.5px;font-weight:700;display:grid;place-items:center;padding:0 3px}
""" + TV_CSS + """
/* ---------- topbar ---------- */
.topbar{height:58px;display:flex;align-items:center;gap:10px;padding:0 16px}
.topbar .sp1{flex:1}
.ltitle{padding:4px 16px 0;display:flex;align-items:flex-end;justify-content:space-between}
.ltitle h1{font-size:26px;font-weight:700;line-height:1.3}
.ltitle small{display:block;font-size:11.5px;color:var(--ink3);margin-top:2px}
.ltitle .lg{font-size:10.5px;font-weight:600;color:var(--limeT);background:var(--limeSoft);padding:4px 9px;border-radius:8px;margin-bottom:6px}
.subcats{gap:8px;margin-top:14px}
.subc{width:84px;text-align:center}
.subc .im{height:64px;border-radius:16px;background-color:var(--tile);position:relative;overflow:hidden}
.subc.on .im{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--ink)}
.subc.all .im{background:var(--ink);color:var(--lime);display:grid;place-items:center}
.subc.all .im .ms{font-size:26px}
.subc span{display:block;font-size:11px;font-weight:500;margin-top:6px;white-space:nowrap}
.subc span small{color:var(--ink3);font-weight:400}
.fbar{display:flex;gap:8px;margin:16px 16px 0;align-items:center}
.fb{height:38px;padding:0 12px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500;white-space:nowrap}
.fb .ms{font-size:18px}
.fb.dk{background:var(--ink);color:var(--bg);box-shadow:none}
.fb.dk .c{min-width:18px;height:18px;border-radius:6px;background:var(--lime);color:#121314;font-size:10px;font-weight:700;display:grid;place-items:center}
.atags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 16px 0;align-items:center}
.atag{height:28px;padding:0 8px 0 6px;border-radius:9px;background:var(--limeSoft);color:var(--limeT);font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap}
.atag .ms{font-size:15px}
.aclear{font-size:11px;color:var(--ink2);font-weight:500;margin-right:4px}
.rc{display:flex;justify-content:space-between;align-items:center;margin:16px 16px 12px;font-size:11px;color:var(--ink3)}
.rc b{color:var(--ink);font-weight:600}
.vt{display:flex;gap:2px;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:10px;padding:2px}
.vt i{width:30px;height:26px;border-radius:8px;display:grid;place-items:center;color:var(--ink3)}
.vt i.on{background:var(--ink);color:var(--bg)}
.vt .ms{font-size:17px}
.promo{grid-column:1/-1;height:136px;border-radius:22px;background:var(--card);box-shadow:0 0 0 1px var(--cardLine);position:relative;overflow:hidden;color:#fff}
.promo .im{position:absolute;left:0;top:0;bottom:0;width:170px}
.promo .im:after{content:'';position:absolute;inset:0;background:linear-gradient(270deg,var(--card) 0%,rgba(20,21,23,0) 60%)}
.promo .t{position:absolute;right:16px;top:16px;bottom:14px;width:190px;display:flex;flex-direction:column}
.promo .t small{font-size:10.5px;font-weight:600;color:var(--lime)}
.promo .t b{font-size:15px;font-weight:700;line-height:1.5;margin-top:3px}
.promo .t .c{margin-top:auto;align-self:flex-start;height:32px;padding:0 12px;border-radius:10px;background:var(--lime);color:#121314;display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700}
.promo .t .c .ms{font-size:16px}
.more{margin:24px 16px 0;display:flex;align-items:center;gap:12px}
.more .mb{flex:1;height:50px;border-radius:16px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:600}
.more .mb .ms{font-size:20px}
.more .pg{font-size:11px;color:var(--ink3);text-align:center;line-height:1.5}
.more .pg b{display:block;font-size:15px;color:var(--ink);font-weight:700;direction:ltr}

/* ---------- MENU ---------- */
.grab{width:40px;height:5px;border-radius:3px;background:var(--tile2);margin:2px auto 6px}
.mhead{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:56px}
.mshort{gap:8px;margin-top:14px}
.ms2{height:40px;padding:0 14px 0 12px;border-radius:13px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;white-space:nowrap}
.ms2 .ms{font-size:19px}
.ms2.l{background:var(--lime);color:#121314;box-shadow:none}
.mcat{margin-top:18px}
.mch{display:flex;align-items:baseline;justify-content:space-between;padding:0 16px;margin-bottom:10px}
.mch h4{font-size:15.5px;font-weight:700;display:flex;align-items:baseline;gap:8px}
.mch h4 .n{font-size:11px;color:var(--ink3);font-weight:600;direction:ltr;letter-spacing:.06em}
.mch small{font-size:10.5px;color:var(--ink3);font-weight:400}
.mrow{gap:9px}
.mc{width:92px}
.mc .im{height:88px;border-radius:16px;background-color:var(--tile);position:relative;overflow:hidden}
.mc b{display:block;font-size:11.5px;font-weight:600;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mc small{display:block;font-size:10px;color:var(--ink3);margin-top:0}
.mc.all .im{background:var(--lime);color:#121314;display:flex;flex-direction:column;justify-content:space-between;padding:10px}
.mc.all .im .ms{font-size:26px}
.mc.all .im .ar{display:flex;justify-content:space-between;align-items:center;font-size:9.5px;font-weight:600;white-space:nowrap;gap:4px}
.mc.all .im .ar .ms{font-size:18px;width:26px;height:26px;border-radius:9px;background:#121314;color:var(--lime);display:grid;place-items:center}
.prof{margin:30px 16px 0;background:var(--card);box-shadow:0 0 0 1px var(--cardLine);border-radius:22px;padding:14px;display:flex;align-items:center;gap:12px;color:#fff}
.prof .av{width:48px;height:48px;border-radius:16px;background:var(--lime);color:#121314;display:grid;place-items:center;font-size:18px;font-weight:700}
.prof .tx{flex:1}
.prof b{display:block;font-size:14px;font-weight:700}
.prof small{display:block;font-size:10.5px;color:#B5B8B3;margin-top:2px}
.prof .pts{font-size:10.5px;font-weight:700;color:var(--lime);border:1px solid rgba(198,242,78,.4);padding:4px 8px;border-radius:8px;direction:rtl;white-space:nowrap}
.mgrid{margin:8px 16px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mg{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:13px;display:flex;flex-direction:column;gap:10px;min-height:84px}
.mg .tp{display:flex;justify-content:space-between;align-items:center}
.mg .tp .ms{font-size:22px}
.mg .tp em{font-size:10px;font-weight:700;color:var(--limeT);background:var(--limeSoft);padding:2px 7px;border-radius:6px}
.mg b{font-size:13px;font-weight:600;margin-top:auto}
.mg small{font-size:10px;color:var(--ink3);margin-top:-8px}
.mg.wide{grid-column:span 2;flex-direction:row;align-items:center;min-height:0}
.lang{display:flex;background:var(--ghost);box-shadow:inset 0 0 0 1px var(--line);border-radius:11px;padding:3px;margin-right:auto}
.lang i{font-size:11px;padding:5px 12px;border-radius:8px;color:var(--ink2);font-weight:500}
.lang i.on{background:var(--ink);color:var(--bg);font-weight:600}
.mhelp{margin:8px 16px 0;display:flex;gap:8px}
.mhelp div{flex:1;height:50px;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:7px;font-size:12.5px;font-weight:600;background:var(--ink);color:var(--bg)}
.mhelp div.o{background:var(--surface);color:var(--ink);box-shadow:0 0 0 1px var(--line)}
.mhelp .ms{font-size:20px}
.mver{text-align:center;font-size:10px;color:var(--ink3);margin-top:16px;direction:rtl}

/* ---------- PRODUCT ---------- */
.gal{margin:2px 16px 0;height:330px;border-radius:26px;position:relative;overflow:hidden;background-color:var(--tile)}
.gal .gt{position:absolute;top:12px;right:12px;left:12px;display:flex;justify-content:space-between}
.gal .gt span{font-size:10.5px;font-weight:700;background:var(--lime);color:#121314;padding:3px 9px;border-radius:8px}
.gal .gt em{font-size:10.5px;font-weight:600;color:#fff;background:rgba(10,11,12,.6);padding:3px 9px;border-radius:8px;direction:ltr;backdrop-filter:blur(6px)}
.gal .gd{position:absolute;bottom:14px;left:0;right:0;display:flex;justify-content:center;gap:4px}
.gal .gd i{width:16px;height:4px;border-radius:2px;background:rgba(255,255,255,.5)}
.gal .gd i.on{width:28px;background:var(--lime)}
.thumbs{display:flex;gap:8px;margin:10px 16px 0}
.thumbs div{flex:1;height:56px;border-radius:14px;background-color:var(--tile)}
.thumbs div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--ink)}
.pi{padding:16px 16px 0}
.pi .r1{display:flex;justify-content:space-between;align-items:center}
.pi .bn{font-size:10.5px;font-weight:700;letter-spacing:.22em;direction:ltr;color:var(--ink2)}
.pi .rate{display:flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:3px 9px;border-radius:9px}
.pi .rate .ms{font-size:15px;color:var(--star);font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.pi .rate small{color:var(--ink3);font-weight:400;font-size:10.5px}
.pi h1{font-size:21px;font-weight:700;line-height:1.5;margin-top:6px}
.pi .sub{font-size:11.5px;color:var(--ink2);line-height:1.7}
.pp{margin:14px 16px 0;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:20px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center}
.pp .p b{font-size:26px;font-weight:700}
.pp .p b em{font-size:12px;font-weight:500;color:var(--ink2);margin-right:4px}
.pp .p .l{display:flex;gap:7px;align-items:center;font-size:10.5px;color:var(--ink3);margin-top:1px}
.pp .p .l s{font-size:12px}
.pp .p .l .o{font-size:10.5px;font-weight:700;color:#121314;background:var(--lime);padding:1px 7px;border-radius:6px;direction:ltr}
.pp .sd{text-align:left}
.pp .sd .st{font-size:11px;font-weight:600;color:var(--ok);display:flex;align-items:center;gap:3px;justify-content:flex-end}
.pp .sd .st .ms{font-size:15px}
.pp .sd .soon-tag{margin-top:7px}
.vl{display:flex;justify-content:space-between;align-items:center;margin:20px 16px 10px;font-size:13.5px;font-weight:700}
.vl span{font-size:11.5px;color:var(--ink2);font-weight:400}
.vl a{font-size:11px;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.cols{display:flex;gap:8px;margin:0 16px}
.cols div{flex:1;height:48px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:8px;padding:0 10px;font-size:11.5px;font-weight:500}
.cols div i{width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}
.cols div.on{box-shadow:0 0 0 2px var(--ink)}
.cfg{margin:0 16px;display:flex;flex-direction:column;gap:8px}
.cf{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:12px 14px;display:flex;align-items:center;gap:12px}
.cf .rd{width:20px;height:20px;border-radius:7px;box-shadow:inset 0 0 0 1.6px var(--ink3);flex:0 0 auto}
.cf.on{box-shadow:0 0 0 2px var(--ink)}
.cf.on .rd{background:var(--ink);box-shadow:none;position:relative}
.cf.on .rd:after{content:'';position:absolute;inset:6px;border-radius:2px;background:var(--lime)}
.cf .tx{flex:1;font-size:12.5px;font-weight:600}
.cf .tx small{display:block;font-size:10.5px;color:var(--ink3);font-weight:400;margin-top:1px}
.cf .pr{font-size:12px;font-weight:700;white-space:nowrap}
.pills{display:flex;gap:8px;margin:0 16px}
.pills div{flex:1;height:44px;border-radius:13px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;font-size:12px;font-weight:600}
.pills div.on{background:var(--ink);color:var(--bg);box-shadow:none}
.pills div.na{color:var(--ink3);text-decoration:line-through;font-weight:400}
.kb{margin:20px 16px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.kb div{background:var(--card);box-shadow:0 0 0 1px var(--cardLine);border-radius:18px;padding:13px;color:#fff}
.kb .ms{font-size:22px;color:var(--lime)}
.kb b{display:block;font-size:16px;font-weight:700;margin-top:6px;direction:rtl}
.kb small{display:block;font-size:10.5px;color:#A9ADA8;margin-top:1px}
.blk{margin:12px 16px 0;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:22px;padding:16px}
.blk h4{font-size:15px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.blk h4 a{font-size:11px;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.blk h4 em{font-size:10px;font-weight:700;color:var(--limeT);background:var(--limeSoft);padding:2px 8px;border-radius:6px}
.blk .ds{font-size:11px;color:var(--ink2);margin-top:3px;line-height:1.6}
.tbl{margin-top:10px;border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px var(--line)}
.tbl .r{display:flex;font-size:11.5px}
.tbl .r:nth-child(odd){background:var(--ghost)}
.tbl .r span{flex:0 0 112px;padding:9px 12px;color:var(--ink3)}
.tbl .r b{flex:1;padding:9px 12px;font-weight:500}
.cmp{display:flex;gap:8px;margin-top:12px}
.cmp .c{flex:1;border-radius:16px;box-shadow:0 0 0 1px var(--line);padding:8px 8px 10px;font-size:10.5px}
.cmp .c.me{box-shadow:0 0 0 2px var(--ink)}
.cmp .c .im{height:64px;border-radius:11px;background-color:var(--tile)}
.cmp .c b{display:block;font-size:11.5px;font-weight:700;margin-top:7px;white-space:nowrap}
.cmp .c .k{display:flex;justify-content:space-between;color:var(--ink3);margin-top:5px;gap:4px}
.cmp .c .k em{color:var(--ink);font-weight:600;white-space:nowrap}
.cmp .c .pz{margin-top:7px;font-size:12px;font-weight:700}
.cmp .c .tg{display:inline-block;font-size:9.5px;font-weight:700;background:var(--lime);color:#121314;padding:1px 6px;border-radius:5px;margin-top:6px}
.wr{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.wo{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:15px;box-shadow:0 0 0 1px var(--line)}
.wo.on{box-shadow:0 0 0 2px var(--ink)}
.wo .rd{width:20px;height:20px;border-radius:10px;box-shadow:inset 0 0 0 1.6px var(--ink3);flex:0 0 auto}
.wo.on .rd{box-shadow:inset 0 0 0 6px var(--ink)}
.wo .tx{flex:1;font-size:12px;font-weight:600}
.wo .tx small{display:block;font-size:10.5px;color:var(--ink3);font-weight:400}
.wo .pr{font-size:11.5px;font-weight:700;white-space:nowrap}
.wo .pr.i{font-size:10px;color:var(--limeT);background:var(--limeSoft);padding:2px 8px;border-radius:6px}
.tin{display:flex;gap:10px;align-items:center;margin-top:12px}
.tin .im{width:64px;height:64px;border-radius:14px;background-color:var(--tile);flex:0 0 auto}
.tin .tx{flex:1;font-size:12px;font-weight:600}
.tin .tx small{display:block;font-size:10.5px;color:var(--ink3);font-weight:400;margin-top:1px}
.tin .val{text-align:left;font-size:10px;color:var(--ink3)}
.tin .val b{display:block;font-size:17px;font-weight:700;color:var(--ink)}
.steps{display:flex;gap:6px;margin-top:12px}
.steps div{flex:1;background:var(--ghost);border-radius:12px;padding:8px;font-size:10px;color:var(--ink2);line-height:1.5}
.steps div b{display:block;font-size:11px;color:var(--ink);font-weight:700;direction:ltr;text-align:right}
.dl{display:flex;flex-direction:column;gap:2px;margin-top:6px}
.dl .r{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px dashed var(--line)}
.dl .r:last-child{border-bottom:0}
.dl .r>.ms{width:38px;height:38px;border-radius:12px;background:#121314;box-shadow:0 0 0 1px var(--cardLine);color:var(--lime);display:grid;place-items:center;font-size:20px;flex:0 0 auto}
.dl .r .tx{flex:1;font-size:12.5px;font-weight:600}
.dl .r .tx small{display:block;font-size:10.5px;color:var(--ink3);font-weight:400;margin-top:1px}
.dl .r em{font-size:10px;font-weight:700;color:var(--limeT);background:var(--limeSoft);padding:2px 8px;border-radius:6px}
.acc{margin:12px 16px 0;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:22px;padding:2px 16px}
.acc .it{padding:14px 0;border-bottom:1px solid var(--line)}
.acc .it:last-child{border-bottom:0}
.acc .h{display:flex;justify-content:space-between;align-items:center;font-size:13.5px;font-weight:700}
.acc .h .ms{font-size:20px;width:28px;height:28px;border-radius:9px;background:var(--ghost);display:grid;place-items:center}
.acc p{font-size:11.5px;color:var(--ink2);line-height:1.9;margin-top:8px}
.rv{margin:0 16px;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:22px;padding:16px}
.rvs{display:flex;gap:14px;align-items:center}
.rvs .big{width:96px;height:96px;border-radius:20px;background:#121314;box-shadow:0 0 0 1px var(--cardLine);color:#F1F2EE;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:0 0 auto}
.rvs .big b{font-size:32px;font-weight:700;line-height:1.1}
.rvs .big small{font-size:9.5px;opacity:.7}
.rvs .big .stars{display:flex;margin-top:2px}
.rvs .big .stars .ms{font-size:12px;color:var(--lime);font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.rvs .asp{flex:1;display:flex;flex-direction:column;gap:7px}
.rvs .asp div{font-size:10.5px;color:var(--ink2);display:flex;align-items:center;gap:8px}
.rvs .asp div span{width:62px;flex:0 0 auto}
.rvs .asp div i{flex:1;height:6px;border-radius:3px;background:var(--tile);position:relative;overflow:hidden}
.rvs .asp div i em{position:absolute;right:0;top:0;bottom:0;background:var(--ink);border-radius:3px}
html.dark .rvs .asp div i em{background:var(--lime)}
.rvs .asp div b{font-size:10.5px;font-weight:700;color:var(--ink);width:22px}
.rph{display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:62px 62px;gap:6px;margin-top:14px}
.rph div{border-radius:12px;background-color:var(--tile);position:relative}
.rph div.b{grid-row:span 2}
.rph div.m:after{content:'';position:absolute;inset:0;border-radius:12px;background:rgba(10,11,12,.6)}
.rph div.m span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:12px;font-weight:700;z-index:1}
.rw{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.rw .w{display:flex;align-items:center;gap:9px}
.rw .w .a{width:34px;height:34px;border-radius:11px;background:var(--limeSoft);color:var(--limeT);display:grid;place-items:center;font-weight:700;font-size:13px}
.rw .w b{display:block;font-size:12px;font-weight:700}
.rw .w small{font-size:10px;color:var(--ink3)}
.rw .w .s{margin-right:auto;font-size:11px;font-weight:700;background:var(--lime);color:#121314;padding:2px 8px;border-radius:6px;display:flex;align-items:center;gap:2px}
.rw .w .s .ms{font-size:13px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.rw p{font-size:11.5px;line-height:1.85;margin-top:8px}
.gw{gap:10px}
.gwc{width:150px;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:6px 6px 10px}
.gwc .im{height:110px;border-radius:13px;background-color:var(--tile)}
.gwc b{display:block;font-size:11px;font-weight:600;margin:8px 4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gwc .f{display:flex;justify-content:space-between;align-items:center;margin:6px 4px 0}
.gwc .f span{font-size:12.5px;font-weight:700}
.gwc .f span em{font-size:9.5px;font-weight:500;color:var(--ink2);margin-right:2px}
.gwc .f i{width:28px;height:28px;border-radius:9px;background:var(--lime);color:#121314;display:grid;place-items:center}
.gwc .f i .ms{font-size:18px}
.gwc .f i.on{background:#121314;color:var(--lime);box-shadow:0 0 0 1px var(--cardLine)}
.gwt{margin:10px 16px 0;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--ink2)}
.gwt b{font-size:14px;color:var(--ink);font-weight:700}
.sticky{position:absolute;left:12px;right:12px;bottom:22px;height:72px;border-radius:24px;background:var(--card);box-shadow:0 0 0 1px var(--cardLine),0 16px 34px rgba(0,0,0,.28);display:flex;align-items:center;gap:10px;padding:0 10px 0 12px;color:#fff}
.sticky .q{display:flex;align-items:center;gap:10px;height:48px;border-radius:15px;background:var(--card2);padding:0 10px;font-size:14px;font-weight:700}
.sticky .q .ms{font-size:18px;color:#B5B8B3}
.sticky .p{flex:1;font-size:10px;color:#A9ADA8;line-height:1.35}
.sticky .p b{display:block;font-size:17px;color:#fff;font-weight:700}
.sticky .p b em{font-size:10px;font-weight:500;color:#C9CCC7;margin-right:2px}
.sticky .add{height:50px;padding:0 18px;border-radius:16px;background:var(--lime);color:#121314;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700}
.sticky .add .ms{font-size:20px}
.pscreen{padding-bottom:112px}
"""

PULSE = ('<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M2 12.5h4.2l2.3-5.5 3.6 11 3-8.2 1.8 2.7H22" '
         'stroke="#121314" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>')
LOGO = f'<div class="logo">{PULSE}</div>'
BRAND = f'<div class="brandm">{LOGO}<div class="wm"><b>نبض</b><span>NABD TECH</span></div></div>'

def tabbar(active=0, cart=3):
    items = [("home", "الرئيسية"), ("grid_view", "الأقسام"), ("shopping_cart", "السلة"), ("receipt_long", "طلباتي"), ("person", "حسابي")]
    h = ''
    for i, (n, l) in enumerate(items):
        c = f'<i class="cnt">{cart}</i>' if n == "shopping_cart" and i != active else ''
        h += f'<div class="tab{" on" if i == active else ""}">{ic(n)}<span class="l">{l}</span>{c}</div>'
    return f'<nav class="tabbar">{h}</nav>'

def sh(t, n=None, sub=None, link="الكل"):
    nn = f'<span class="n">{n}</span>' if n else ''
    s = f'<small>{sub}</small>' if sub else ''
    a = f'<a>{link}{ic("chevron_left")}</a>' if link else ''
    return f'<div class="sh"><div><h3>{t}{nn}</h3>{s}</div>{a}</div>'

def pc(k, specs=None, fav=False):
    img, f, br, nm, p, old, r, rc, bd = P[k]
    b = ''
    if bd:
        b = f'<span class="bd s">{bd}</span>' if bd.startswith('-') else f'<span class="bd n">{bd}</span>'
    sp = ('<div class="sp">' + ''.join(f'<i>{x}</i>' for x in specs) + '</div>') if specs else ''
    o = f'<s>{money(old)} ر.س</s>' if old else '<s style="visibility:hidden">0</s>'
    return (f'<div class="pc">{ph(img, f, "pimg", b + f"<span class=\"fav{" on" if fav else ""}\">{ic("favorite")}</span>")}<div class="in"><div class="br">{br}</div>'
            f'<div class="nm">{nm}</div>{sp}<div class="rt">{ic("star")}<b>{r}</b> ({money(rc)})</div>'
            f'<div class="bt2"><div class="pr">{o}<b>{money(p)}<em>ر.س</em></b></div><span class="add">{ic("add")}</span></div></div></div>')

def header():
    return f'''<header class="hdr">{BRAND}<div class="hicons"><div class="sq">{ic("notifications")}<i class="dot"></i></div><div class="sq">{ic("segment")}</div></div></header>'''

# ------------------------------------------------------------------ HOME
def home():
    chips = f'<div class="chip on">{ic("bolt")}الكل</div>'
    for icn, l in [("smartphone", "جوالات"), ("laptop_mac", "لابتوبات"), ("tv", "تلفزيونات"), ("photo_camera", "كاميرات"), ("headphones", "صوتيات"), ("watch", "ساعات"), ("kitchen", "منزلية")]:
        chips += f'<div class="chip">{ic(icn)}{l}</div>'
    hero = f'''<div class="hscroll hero">
{ph("e/44792d.jpg", "0.5 0.42 1.05", "hcard", f'<div class="sc"></div><div class="top"><span class="tg">حصري نبض</span><span class="ct">01 / 04</span></div><div class="tx"><div><h2>أركلاين Pro 16<br>أداء لا يهدأ</h2><p>شريحة Arc X2 · حتى 22 ساعة بطارية</p></div><span class="cta">{ic("arrow_back")}</span></div>')}
{ph("e/d02ef7.jpg", "0.5 0.6 1", "hcard", '<div class="sc"></div>')}
</div><div class="segs"><i class="on"></i><i></i><i></i><i></i></div>'''

    bento = f'''<div class="bento">
{ph("e/c727a1.jpg", "0.62 0.4 1.15", "bt big", f'<div class="sc"></div><div class="t"><div><small>1,240 منتجًا</small><b>الجوالات</b></div><span class="go">{ic("arrow_back")}</span></div>')}
{ph("e/b7a2c6.jpg", "0.62 0.45 1.25", "bt", f'<div class="sc"></div><div class="t"><div><small>860 منتجًا</small><b>اللابتوبات</b></div></div>')}
<div class="bt">{tvr("q7_55", "dark")}<div class="sc"></div><div class="t"><div><small>420 منتجًا</small><b>التلفزيونات</b></div></div></div>
</div><div class="bento3">
{ph("e/1185bf.jpg", "0.5 0.5 1.3", "bt", '<div class="sc"></div><div class="t"><b>الكاميرات</b></div>')}
{ph("e/2d4e5c.jpg", "0.56 0.5 1.7", "bt", '<div class="sc"></div><div class="t"><b>الصوتيات</b></div>')}
{ph("e/d3ac0a.jpg", "0.38 0.6 1.3", "bt", '<div class="sc"></div><div class="t"><b>المنزلية</b></div>')}
</div>'''

    img, f, br, nm, p, old, *_ = P['hstudio']
    deal = f'''<div class="deal">{ph(img, "0.5 0.5 1.45", "im", '<span class="off">-18%</span>')}<div class="tx">
<span class="lb">{ic("bolt")}صفقة اليوم</span><div class="nm">سماعات Aurel Studio بعزل الضوضاء النشط</div>
<div class="pr"><b>{money(p)}</b><small>ر.س</small><s>{money(old)}</s></div>
<div class="prog"><i></i></div><div class="sold"><span>بيع 72%</span><span>تبقّى 38 قطعة</span></div>
<div class="cd"><b>05</b><em>:</em><b>21</b><em>:</em><b>44</b><span>ينتهي خلال</span></div></div></div>'''

    rank = ''
    for i, k in enumerate(['x1pro', 'aair14', 'bpro', 'dmini', 'ws3']):
        img, f, br, nm, p, old, r, rc, bd = P[k]
        rank += f'''<div class="ri"><span class="no">{i+1:02d}</span>{ph(img, f, "im")}<div class="tx"><b>{nm}</b><small>{ic("star")}{r} · {money(rc)} تقييمًا</small><div class="p">{money(p)}<em>ر.س</em></div></div><span class="ad">{ic("add")}</span></div>'''

    grid = ''.join([pc('cr7', ["بدون مرآة", "6K"]), pc('apro14', ["14 بوصة", "1 تيرا"], fav=True), pc('hheri', ["سلكية", "Hi-Fi"]), pc('kwash', ["10 كجم", "A+++"])])

    setup = f'''<div class="setup"><div class="hd"><div><small>{ic("desk")}جهّز مكتبك</small><b>باقة المبدع: لابتوب<br>وسماعات ولوحة مفاتيح</b></div><span class="save">وفّر 12%</span></div>
<div class="its">{ph("e/109522.jpg", "0.42 0.55 1.15", "it big", "<span>Pro 16</span>")}{ph("e/cc164a.jpg", "0.5 0.48 2", "it", "<span>Studio</span>")}{ph("e/3b2652.jpg", "0.62 0.6 1.2", "it", "<span>Slim</span>")}</div>
<div class="ft"><div class="p">سعر الباقة<b>9,240<em>ر.س</em><s>10,597</s></b></div><span class="lbtn">{ic("add_shopping_cart")}أضف الباقة</span></div></div>'''

    trade = f'''<div class="trade">{ph("e/fba5b5.jpg", "0.5 0.6 1.7", "im")}<div class="t"><small>{ic("autorenew")}بدّل وجدّد</small><b>جهازك القديم يساوي حتى 2,500 ر.س</b><span class="c">قيّم جهازك{ic("arrow_back")}</span></div></div>'''

    svc = f'''<div class="svc"><div class="sv">{ic("handyman")}<div><b>تركيب مجاني</b><small>للتلفزيونات والأجهزة</small></div></div>
<div class="sv">{ic("shield")}<div><b>نبض كير</b><small>ضمان حتى 3 سنوات</small></div></div>
<div class="sv">{ic("electric_bolt")}<div><b>توصيل سريع</b><small>خلال ساعتين</small></div></div>
<div class="sv soon">{ic("calendar_month")}<div><b>التقسيط</b><small>قريبًا</small></div></div></div>'''

    brs = ''.join(f'<div style="{s}">{n}</div>' for n, s in [("ZENRA", "font-weight:700;letter-spacing:.2em"), ("ARCLINE", "font-weight:500;letter-spacing:.12em"), ("LUMORA", "font-weight:600;letter-spacing:.3em;font-size:12px"), ("Ryoku", "font-weight:700"), ("AUREL", "letter-spacing:.3em"), ("SKYRA", "font-weight:700;font-style:italic")])

    return f'''<div class="screen">{STATUS}{header()}
<div class="loc">{ic("location_on")}التوصيل إلى <b>الرياض، حي الملقا</b>{ic("expand_more", "", "font-size:16px;color:var(--ink3)")}<span class="eta">خلال ساعتين</span></div>
<div class="search"><div class="f">{ic("search")}<span>ابحث بين أكثر من 6,000 منتج</span></div><div class="fl">{ic("tune")}</div></div>
<div class="hscroll chips">{chips}</div>
{hero}
<section class="sec">{sh("تسوّق الأقسام", None, None, "كل الأقسام")}{bento}</section>
<section class="sec">{deal}</section>
<section class="sec">{sh("الأكثر طلبًا الآن", "TOP 5", "تحديث كل ساعة")}<div class="rank">{rank}</div></section>
<section class="sec"><div class="tabs"><i class="on">وصل حديثًا</i><i>العروض</i><i>حصري نبض</i></div><div class="grid">{grid}</div></section>
<section class="sec">{setup}</section>
<section class="sec">{trade}</section>
<section class="sec">{sh("خدمات نبض", None, None, None)}{svc}</section>
<section class="sec" style="margin-top:22px"><div class="hscroll brs">{brs}</div></section>
{tabbar(0)}<div class="homeind"></div></div>'''

# ------------------------------------------------------------------ MENU
MENU = [
 ("smartphone", "الجوالات واللوحيات", "1,240", [("x1pro", "رائدة", 186), ("n5", "متوسطة", 312), ("tabpro", "أجهزة لوحية", 148), ("found", "مجدّدة", 24)]),
 ("laptop_mac", "اللابتوبات", "860", [("apro16", "للمحترفين", 126), ("aair14", "خفيفة", 214), ("awin", "للأعمال", 160), ("kbrgb", "ملحقات", 210)]),
 ("tv", "التلفزيونات", "420", [("tv:c5_65", "OLED", 64), ("tv:m8_75", "Mini LED", 52), ("tv:q7_55", "QLED", 118), ("img:e/5b90a2.jpg:0.5 0.3 1.2", "سينما منزلية", 72)]),
 ("photo_camera", "التصوير", "390", [("cr7", "كاميرات", 86), ("l85", "عدسات", 154), ("dair", "درون", 42)]),
 ("headphones", "الصوتيات", "640", [("hsolo", "سماعات رأس", 210), ("bpurp", "لاسلكية", 188), ("hheri", "Hi-Fi", 46)]),
 ("watch", "الساعات الذكية", "280", [("wlens", "ساعات ذكية", 120), ("wsport", "رياضية", 74), ("wwhite", "أساور", 86)]),
 ("kitchen", "الأجهزة المنزلية", "1,050", [("kesp", "القهوة", 96), ("kwash", "الغسالات", 140), ("kov", "الأفران", 88), ("kmw", "الميكروويف", 64)]),
 ("sports_esports", "الألعاب والمنزل الذكي", "510", [("gblue", "أيادي التحكم", 120), ("gvr", "الواقع الافتراضي", 38), ("scam", "كاميرات المراقبة", 92), ("sbulb", "الإضاءة الذكية", 140)]),
]

def mcard(k, name, n):
    if k.startswith("tv:"):
        inner = f'<div class="im">{tvr(k[3:], "dark")}</div>'
    elif k.startswith("img:"):
        _, src, f = k.split(":")
        inner = ph(src, f, "im")
    else:
        img, f, *_ = P[k]
        inner = ph(img, f, "im")
    return f'<div class="mc">{inner}<b>{name}</b><small>{n} منتجًا</small></div>'

def menu():
    rows = ''
    for i, (icon, name, total, subs) in enumerate(MENU):
        allc = f'<div class="mc all"><div class="im">{ic(icon)}<div class="ar"><span>عرض الكل</span>{ic("arrow_back")}</div></div><b>كل {name.split(" ")[0].replace('واللوحيات','')}</b><small>{total} منتجًا</small></div>'
        rows += f'''<section class="mcat"><div class="mch"><h4><span class="n">{i+1:02d}</span>{name}</h4><small>{len(subs)} أقسام فرعية</small></div>
<div class="hscroll mrow">{allc}{''.join(mcard(*s) for s in subs)}</div></section>'''
    return f'''<div class="screen" style="padding-bottom:40px">{STATUS}<div class="grab"></div>
<div class="mhead">{BRAND}<div class="sq">{ic("close")}</div></div>
<div class="search" style="margin-top:4px"><div class="f">{ic("search")}<span>ابحث في كل الأقسام</span></div><div class="fl">{ic("photo_camera")}</div></div>
<div class="hscroll mshort"><div class="ms2 l">{ic("bolt")}العروض</div><div class="ms2">{ic("new_releases")}وصل حديثًا</div><div class="ms2">{ic("autorenew")}بدّل وجدّد</div><div class="ms2">{ic("handyman")}التركيب</div><div class="ms2">{ic("storefront")}الفروع</div></div>
{rows}
<div class="prof"><span class="av">ف</span><div class="tx"><b>فيصل العتيبي</b><small>عضو نبض بلس · منذ 2023</small></div><span class="pts">2,450 نقطة</span></div>
<div class="mgrid">
<div class="mg"><div class="tp">{ic("receipt_long")}<em>1 قيد التوصيل</em></div><b>طلباتي</b><small>تتبّع وإرجاع</small></div>
<div class="mg"><div class="tp">{ic("favorite")}</div><b>المفضلة</b><small>12 منتجًا</small></div>
<div class="mg"><div class="tp">{ic("person")}</div><b>حسابي</b><small>العناوين والدفع</small></div>
<div class="mg"><div class="tp">{ic("support_agent")}</div><b>تواصل معنا</b><small>يوميًا حتى منتصف الليل</small></div>
<div class="mg wide">{ic("translate")}<b style="margin:0">اللغة</b><div class="lang"><i class="on">العربية</i><i>English</i></div></div>
</div>
<div class="mhelp"><div>{ic("forum")}محادثة فورية</div><div class="o">{ic("call")}اتصل بنا</div></div>
<div class="mver">نبض للتقنية · الإصدار 2.8</div><div class="homeind"></div></div>'''

# ------------------------------------------------------------------ LISTING
def listing():
    subs = f'<div class="subc all on"><div class="im">{ic("laptop_mac")}</div><span>الكل <small>860</small></span></div>'
    for k, l, n in [("aair14", "خفيفة", 214), ("apro16", "للمحترفين", 126), ("awin", "للأعمال", 160), ("aglow", "للألعاب", 88), ("kbd", "ملحقات", 210)]:
        img, f, *_ = P[k]
        subs += f'<div class="subc">{ph(img, f, "im")}<span>{l} <small>{n}</small></span></div>'
    specs = {'apro16': ["16 بوصة", "32 جيجا"], 'aair14': ["14 بوصة", "1.2 كجم"], 'aair13': ["13 بوصة", "16 جيجا"], 'astudio': ["15 بوصة", "شاشة لمس"],
             'apro14': ["14 بوصة", "1 تيرا"], 'aplant': ["14 بوصة", "512 جيجا"], 'awin': ["15 بوصة", "للأعمال"], 'anight': ["14 بوصة", "رمادي"]}
    order = ['apro16', 'aair14', 'aair13', 'astudio', 'PROMO', 'apro14', 'aplant', 'awin', 'anight']
    g = ''
    for k in order:
        if k == 'PROMO':
            g += f'''<div class="promo">{ph("e/1fdb92.jpg", "0.35 0.4 1.4", "im")}<div class="t"><small>عرض الطلاب</small><b>خصم إضافي 10% على اللابتوبات بالبريد الجامعي</b><span class="c">فعّل الخصم{ic("arrow_back")}</span></div></div>'''
        else:
            g += pc(k, specs[k], fav=(k == 'aair13'))
    return f'''<div class="screen">{STATUS}
<div class="topbar"><div class="sq">{ic("arrow_forward")}</div><div class="sp1"></div><div class="sq">{ic("search")}</div><div class="sq">{ic("shopping_cart")}<i class="cnt">3</i></div></div>
<div class="ltitle"><div><h1>اللابتوبات</h1><small>860 منتجًا من 7 علامات تجارية</small></div><span class="lg">توصيل خلال ساعتين</span></div>
<div class="hscroll subcats">{subs}</div>
<div class="fbar"><div class="fb dk">{ic("tune")}فلترة<span class="c">3</span></div><div class="fb">{ic("swap_vert")}الأحدث</div><div class="fb">المعالج{ic("expand_more")}</div><div class="fb">الذاكرة{ic("expand_more")}</div></div>
<div class="atags"><span class="atag">{ic("close")}<span class="lat">ARCLINE</span></span><span class="atag">{ic("close")}16 جيجا فأكثر</span><span class="atag">{ic("close")}3,000 إلى 9,000 ر.س</span><span class="aclear">مسح الكل</span></div>
<div class="rc"><span>عرض <b>8</b> من <b>860</b></span><div class="vt"><i class="on">{ic("grid_view")}</i><i>{ic("view_list")}</i></div></div>
<div class="grid">{g}</div>
<div class="more"><div class="pg"><b>8/860</b>منتجًا</div><div class="mb">تحميل 24 منتجًا آخر{ic("expand_more")}</div></div>
{tabbar(1)}<div class="homeind"></div></div>'''

# ------------------------------------------------------------------ PRODUCT
def product():
    th = ''.join(ph(s, f, "on" if i == 0 else "") for i, (s, f) in enumerate([
        ("e/109522.jpg", "0.42 0.55 1.4"), ("e/105db1.jpg", "0.45 0.6 1.3"), ("e/44792d.jpg", "0.5 0.5 1.5"), ("e/15cff3.jpg", "0.5 0.75 1.4"), ("e/c0ecd6.jpg", "0.6 0.5 1.3")]))
    tbl = ''.join(f'<div class="r"><span>{a}</span><b>{b}</b></div>' for a, b in [
        ("المعالج", "Arc X2 Pro · ‏12 نواة"), ("الرسوميات", "18 نواة رسومية"), ("الذاكرة", "32 جيجا موحّدة"), ("التخزين", "1 تيرا SSD"),
        ("الشاشة", "16.2 بوصة · 120 هرتز"), ("الدقة والسطوع", "3.5K · ‏1,600 شمعة"), ("البطارية", "حتى 22 ساعة"), ("المنافذ", "3 منافذ USB-C · HDMI · قارئ SD"), ("الوزن", "2.1 كجم")])
    cmpc = ''
    for k, nm, me, cpu, bat, pz, tg in [('apro16', 'Pro 16', True, 'X2 Pro', '22 س', '8,999', 'هذا الجهاز'), ('aair14', 'Air 14', False, 'X2', '18 س', '4,299', None), ('awin', 'Novex 15', False, 'N7', '12 س', '3,999', None)]:
        img, f, *_ = P[k]
        t = f'<span class="tg">{tg}</span>' if tg else ''
        cmpc += f'''<div class="c{" me" if me else ""}">{ph(img, f, "im")}<b>{nm}</b><div class="k">المعالج<em>{cpu}</em></div><div class="k">البطارية<em>{bat}</em></div><div class="k">الشاشة<em>{"16" if me else ("14" if k == "aair14" else "15")} بوصة</em></div><div class="pz">{pz} ر.س</div>{t}</div>'''
    rph = ph("e/44792d.jpg", "0.5 0.5 1.2", "b") + ph("e/1fdb92.jpg", "0.35 0.35 1.5") + ph("e/105db1.jpg", "0.45 0.6 1.4") + ph("e/f1fe5f.jpg", "0.7 0.5 1.6") + ph("e/15cff3.jpg", "0.5 0.75 1.5", "m", "<span>+64</span>")
    gw = ''
    for k, on in [('kbd', True), ('hstudio', True), ('ssd', False), ('kbrgb', False)]:
        img, f, br, nm, p, *_ = P[k]
        gw += f'<div class="gwc">{ph(img, f, "im")}<b>{nm}</b><div class="f"><span>{money(p)}<em>ر.س</em></span><i class="{"on" if on else ""}">{ic("check" if on else "add")}</i></div></div>'
    like = ''.join([pc('astudio', ["15 بوصة", "شاشة لمس"]), pc('aair14', ["14 بوصة", "1.2 كجم"])])
    return f'''<div class="screen pscreen">{STATUS}
<div class="topbar"><div class="sq">{ic("arrow_forward")}</div><div class="sp1"></div><div class="sq">{ic("compare_arrows")}</div><div class="sq">{ic("favorite")}</div><div class="sq">{ic("ios_share")}</div></div>
{ph("e/109522.jpg", "0.45 0.55 1.05", "gal", f'<div class="gt"><span>الأكثر مبيعًا</span><em>1 / 8</em></div><div class="gd"><i class="on"></i><i></i><i></i><i></i><i></i></div>')}
<div class="thumbs">{th}</div>
<div class="pi"><div class="r1"><span class="bn">ARCLINE</span><span class="rate">{ic("star")}4.9 <small>(640)</small></span></div>
<h1>لابتوب أركلاين Pro 16 · ‏32 جيجا</h1><div class="sub">شريحة Arc X2 Pro · شاشة 120 هرتز · بطارية حتى 22 ساعة · فضي</div></div>
<div class="pp"><div class="p"><b>8,999<em>ر.س</em></b><div class="l"><s>9,799 ر.س</s><span class="o">-8%</span>شامل الضريبة</div></div>
<div class="sd"><div class="st">{ic("check_circle")}متوفر · 14 قطعة</div><span class="soon-tag">{ic("schedule")}التقسيط قريبًا</span></div></div>
<div class="vl">اللون <span>فضي</span></div>
<div class="cols"><div class="on"><i style="background:linear-gradient(135deg,#E6E7E8,#BFC2C5)"></i>فضي</div><div><i style="background:linear-gradient(135deg,#5B5E63,#2F3135)"></i>رمادي</div><div><i style="background:linear-gradient(135deg,#1F2A3A,#0F1520)"></i>أزرق ليلي</div></div>
<div class="vl">المعالج <a>ما الفرق؟</a></div>
<div class="cfg"><div class="cf on"><span class="rd"></span><div class="tx">Arc X2 Pro<small>12 نواة معالجة · 18 نواة رسومية</small></div><span class="pr">8,999 ر.س</span></div>
<div class="cf"><span class="rd"></span><div class="tx">Arc X2 Max<small>16 نواة معالجة · 40 نواة رسومية</small></div><span class="pr">12,499 ر.س</span></div></div>
<div class="vl">الذاكرة والتخزين</div>
<div class="pills"><div>16 جيجا</div><div class="on">32 جيجا</div><div>64 جيجا</div></div>
<div class="pills" style="margin-top:8px"><div>512 جيجا</div><div class="on">1 تيرا</div><div>2 تيرا</div><div class="na">4 تيرا</div></div>
<div class="kb"><div>{ic("memory")}<b>12 نواة</b><small>Arc X2 Pro</small></div><div>{ic("battery_charging_full")}<b>22 ساعة</b><small>عمر البطارية</small></div><div>{ic("desktop_windows")}<b>120 هرتز</b><small>شاشة 16.2 بوصة</small></div><div>{ic("weight")}<b>2.1 كجم</b><small>هيكل ألمنيوم</small></div></div>
<div class="blk"><h4>بدّل لابتوبك القديم<em>قيمة فورية</em></h4><div class="ds">نقيّم جهازك ونستلمه وقت التوصيل، ونخصم قيمته من الفاتورة</div>
<div class="tin">{ph("e/11d611.jpg", "0.75 0.62 1.8", "im")}<div class="tx">Novex 14 · ‏2021<small>8 جيجا · ‏256 جيجا · حالة جيدة</small></div><div class="val">تقدير مبدئي<b>1,150 ر.س</b></div></div>
<div class="steps"><div><b>01</b>أجب عن 4 أسئلة</div><div><b>02</b>نستلمه عند التوصيل</div><div><b>03</b>يُخصم من السعر</div></div></div>
<div class="blk"><h4>الضمان والحماية</h4><div class="wr">
<div class="wo on"><span class="rd"></span><div class="tx">ضمان الوكيل · سنتان<small>قطع وعمالة في المراكز المعتمدة</small></div><span class="pr i">مشمول</span></div>
<div class="wo"><span class="rd"></span><div class="tx">نبض كير · 3 سنوات<small>صيانة منزلية وجهاز بديل خلال الإصلاح</small></div><span class="pr">+649 ر.س</span></div>
<div class="wo"><span class="rd"></span><div class="tx">حماية الحوادث<small>السقوط والسوائل · تغطية لسنة</small></div><span class="pr">+499 ر.س</span></div></div></div>
<div class="blk"><h4>التوصيل والتركيب</h4><div class="dl">
<div class="r">{ic("electric_bolt")}<div class="tx">توصيل خلال ساعتين<small>اطلب قبل 9 مساءً · الرياض، حي الملقا</small></div><em>مجانًا</em></div>
<div class="r">{ic("settings_suggest")}<div class="tx">إعداد الجهاز في منزلك<small>تفعيل، نقل ملفاتك وتثبيت برامجك</small></div><em>مجانًا</em></div>
<div class="r">{ic("storefront")}<div class="tx">استلام من الفرع<small>جاهز خلال 30 دقيقة · 9 فروع</small></div></div>
<div class="r">{ic("assignment_return")}<div class="tx">إرجاع خلال 14 يومًا<small>استلام مجاني من باب المنزل</small></div></div></div></div>
<div class="blk"><h4>المواصفات الفنية<a>الكل (32)</a></h4><div class="tbl">{tbl}</div></div>
<div class="blk"><h4>قارن قبل أن تقرّر<a>مقارنة كاملة</a></h4><div class="cmp">{cmpc}</div></div>
<div class="acc"><div class="it"><div class="h">نظرة عامة{ic("remove")}</div><p>مصمَّم للمونتاج والبرمجة والتصميم ثلاثي الأبعاد دون مروحة صاخبة. شاشة 16.2 بوصة بسطوع 1,600 شمعة ونظام تبريد صامت يحافظ على الأداء طوال اليوم.</p></div>
<div class="it"><div class="h">ما في الصندوق{ic("add")}</div></div><div class="it"><div class="h">الأسئلة والأجوبة · 41{ic("add")}</div></div></div>
<section class="sec">{sh("تقييمات المشترين", None, "640 تقييمًا موثّقًا", "الكل")}<div class="rv"><div class="rvs"><div class="big"><b>4.9</b>{stars()}<small>من 5</small></div>
<div class="asp"><div><span>الأداء</span><i><em style="width:97%"></em></i><b>4.9</b></div><div><span>البطارية</span><i><em style="width:94%"></em></i><b>4.8</b></div><div><span>الشاشة</span><i><em style="width:98%"></em></i><b>5.0</b></div><div><span>القيمة</span><i><em style="width:86%"></em></i><b>4.4</b></div></div></div>
<div class="rph">{rph}</div>
<div class="rw"><div class="w"><span class="a">م</span><div><b>محمد الزهراني</b><small>مشترٍ موثّق · مونتاج فيديو</small></div><span class="s">{ic("star")}5.0</span></div>
<p>أصدّر فيديو 4K في نصف الوقت مقارنة بجهازي السابق، والبطارية تكمل يوم عمل كامل. وصلني خلال ساعتين والفنّي نقل ملفاتي بالكامل.</p></div></div></section>
<section class="sec">{sh("يكتمل مع", None, "أضف ووفّر 10% على الملحقات", None)}<div class="hscroll gw">{gw}</div><div class="gwt"><span>محدد: لوحة مفاتيح + سماعات</span><b>1,598 ر.س</b></div></section>
<section class="sec">{sh("قد يعجبك أيضًا")}<div class="grid">{like}</div></section>
<div class="sticky"><div class="q">{ic("remove")}1{ic("add")}</div><div class="p">الإجمالي<b>8,999<em>ر.س</em></b></div><div class="add">{ic("add_shopping_cart")}أضف للسلة</div></div>
</div>'''

SCREENS = {'home': home, 'menu': menu, 'listing': listing, 'product': product}
