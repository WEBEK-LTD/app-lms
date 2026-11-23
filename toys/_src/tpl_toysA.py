from lib import STATUS, ic, ph, stars

FONT = "baloo"
TITLE = "Toot"
CUR = "د.إ"
T = "toys/"

CSS = """
:root{--bg:#F7F2EA;--surface:#FFFCF7;--sand:#EFE7DA;--sand2:#E4D9C8;--ink:#2B2421;--ink2:#685D57;--ink3:#8C817A;--line:#E9E0D3;
--acc:#7B2D4E;--accT:#7B2D4E;--accSoft:#F4E4EA;--accLine:rgba(123,45,78,.18);--gold:#C08A3E;--tile:#F1E9DD;--dot:#D9CFC1;--deep:#2E2427;
--tabbg:rgba(43,36,33,.88);--good:#3E7A5C;--goodSoft:#E3EFE6}
html.dark{--bg:#141113;--surface:#1E1A1D;--sand:#282326;--sand2:#332D30;--ink:#F3EDE9;--ink2:#BCB2AD;--ink3:#968C87;--line:#2E282B;
--acc:#97436C;--accT:#EAA9C5;--accSoft:#36202B;--accLine:rgba(234,169,197,.22);--gold:#E0B066;--tile:#EDE4D7;--dot:#3B3437;--deep:#241D21;
--tabbg:rgba(44,38,41,.94);--good:#86C9A4;--goodSoft:#1D2B23}
body{font-family:'Baloo Bhaijaan 2',sans-serif;line-height:1.35}
.screen{padding-bottom:118px}
.ms.f{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}

/* header */
.header{height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.brand{display:flex;align-items:center;gap:10px}
.mark{width:42px;height:42px;border-radius:21px 21px 21px 8px;background:var(--acc);display:grid;place-items:center;flex:0 0 auto}
.brand b{display:block;font-size:24px;font-weight:700;line-height:1;color:var(--ink);letter-spacing:-.01em}
.brand small{display:flex;align-items:center;gap:2px;font-size:11.5px;color:var(--ink2);font-weight:400;margin-top:3px}
.brand small .ms{font-size:14px;color:var(--accT)}
.brand small .ms.dn{font-size:16px;color:var(--ink3)}
.hicons{display:flex;gap:6px}
.ibtn{width:42px;height:42px;border-radius:21px;display:grid;place-items:center;position:relative;background:var(--surface);box-shadow:0 0 0 1px var(--line);color:var(--ink)}
.ibtn .ms{font-size:22px}
.ibtn .n{position:absolute;top:-3px;left:-3px;min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10.5px;font-weight:600;display:grid;place-items:center;padding:0 5px;box-shadow:0 0 0 2px var(--bg);line-height:1}

/* search */
.srow{display:flex;gap:8px;margin:8px 16px 0}
.search{flex:1;height:50px;border-radius:25px;background:var(--surface);display:flex;align-items:center;padding:0 16px;gap:10px;box-shadow:0 0 0 1px var(--line)}
.search .ms{font-size:22px;color:var(--ink2)}
.search .t{flex:1;font-size:13.5px;color:var(--ink3)}
.search .ar{display:flex;align-items:center;padding-right:12px;border-right:1px solid var(--line);height:24px}
.search .ar .ms{font-size:21px;color:var(--accT)}
.filt{width:50px;height:50px;border-radius:25px;background:var(--acc);display:grid;place-items:center}
.filt .ms{color:#fff;font-size:22px}

/* round categories */
.cats{margin-top:18px;gap:12px}
.cat{width:68px;text-align:center}
.cat .ci{width:68px;height:68px;border-radius:34px;background-color:var(--sand);box-shadow:0 0 0 1px var(--line)}
.cat.on .ci{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--accT)}
.cat span{display:block;font-size:12px;margin-top:8px;color:var(--ink2);line-height:1.25;white-space:nowrap}
.cat.on span{color:var(--ink);font-weight:600}

/* hero */
.hero{margin-top:20px;gap:10px}
.hcard{width:342px;height:222px;border-radius:26px;position:relative;overflow:hidden;background-color:#D8CFC4}
.hcard .wash{position:absolute;inset:0;background:linear-gradient(270deg,rgba(32,24,22,.72) 0%,rgba(32,24,22,.42) 42%,rgba(32,24,22,0) 70%)}
.hcard .txt{position:absolute;right:20px;top:20px;bottom:18px;width:178px;display:flex;flex-direction:column;color:#fff}
.hcard .lab{font-size:11.5px;font-weight:500;display:flex;align-items:center;gap:5px;color:#F6DDE7}
.hcard .lab .ms{font-size:15px}
.hcard h2{font-size:23px;line-height:1.28;font-weight:700;margin-top:6px}
.hcard p{font-size:12px;color:rgba(255,255,255,.86);margin-top:4px;line-height:1.45}
.hcard .cta{margin-top:auto;align-self:flex-start;height:38px;padding:0 16px 0 12px;border-radius:19px;background:var(--acc);color:#fff;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
html.dark .hcard .cta{background:#97436C}
.hcard .cta .ms{font-size:17px}
.dots{display:flex;justify-content:center;gap:6px;margin-top:12px}
.dots i{width:6px;height:6px;border-radius:3px;background:var(--dot)}
.dots i.on{width:20px;background:var(--accT)}

/* sections */
.sec{margin-top:30px}
.shead{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:13px}
.shead h3{font-size:19px;font-weight:700;line-height:1.2}
.shead .sub{font-size:12px;color:var(--ink3);margin-top:3px}
.shead a{font-size:12.5px;color:var(--accT);font-weight:600;display:flex;align-items:center;gap:1px}
.shead a .ms{font-size:18px}

/* age */
.ages{gap:10px}
.age{width:112px;height:150px;border-radius:22px;position:relative;overflow:hidden;background-color:var(--sand)}
.age .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(30,22,20,.74) 0%,rgba(30,22,20,.15) 52%,rgba(30,22,20,0) 70%)}
.age .at{position:absolute;right:12px;left:10px;bottom:10px;color:#fff}
.age .at b{display:block;font-size:24px;font-weight:700;line-height:1}
.age .at small{display:block;font-size:11.5px;opacity:.92;margin-top:3px}

/* safety */
.safe{margin:0 16px;border-radius:26px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:16px}
.safe .st{display:flex;align-items:center;gap:12px}
.safe .shield{width:46px;height:46px;border-radius:23px;background:var(--goodSoft);display:grid;place-items:center;color:var(--good);flex:0 0 auto}
.safe .shield .ms{font-size:26px}
.safe .st b{display:block;font-size:16.5px;font-weight:700}
.safe .st small{display:block;font-size:12px;color:var(--ink2)}
.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
.sg{background:var(--bg);border-radius:16px;padding:10px 11px;display:flex;align-items:center;gap:9px}
.sg .ms{font-size:21px;color:var(--good)}
.sg span{font-size:11.5px;line-height:1.35;color:var(--ink)}

/* product card */
.prow{gap:12px}
.pcard{width:158px}
.pimg{height:178px;border-radius:22px;background-color:var(--tile);position:relative;overflow:hidden}
.pimg:after{content:'';position:absolute;inset:0;background:#EFE4D3;mix-blend-mode:multiply;opacity:.38;pointer-events:none}
.fav{position:absolute;top:9px;left:9px;width:32px;height:32px;border-radius:16px;background:rgba(255,252,247,.92);display:grid;place-items:center;z-index:2}
.fav .ms{font-size:18px;color:#2B2421}
.fav.on .ms{color:#7B2D4E;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.agb{position:absolute;bottom:9px;right:9px;font-size:10.5px;font-weight:600;background:rgba(255,252,247,.94);color:#2B2421;border-radius:10px;padding:3px 8px 2px;z-index:2;display:flex;align-items:center;gap:3px}
.agb .ms{font-size:13px;color:#7B2D4E}
.tag{position:absolute;top:10px;right:10px;font-size:10.5px;font-weight:600;background:#7B2D4E;color:#fff;border-radius:10px;padding:3px 8px 2px;z-index:2}
.tag.ltr{direction:ltr}
.pname{font-size:13.5px;font-weight:600;margin-top:9px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pmat{font-size:11.5px;color:var(--ink3);margin-top:1px}
.pfoot{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.price{font-size:15.5px;font-weight:700;line-height:1.1}
.price small{font-size:11px;color:var(--ink2);font-weight:500}
.price s{display:block;font-size:11.5px;color:var(--ink3);font-weight:400;margin-top:1px}
.addb{width:34px;height:34px;border-radius:17px;background:var(--accSoft);display:grid;place-items:center;color:var(--accT)}
.addb .ms{font-size:21px}
.rate{display:flex;align-items:center;gap:3px;font-size:11px;color:var(--ink3);margin-top:2px}
.rate .ms{font-size:13px;color:var(--gold)}
.rate b{color:var(--ink);font-weight:600}

/* gifts */
.gift{margin:0 16px;border-radius:28px;background:var(--accSoft);padding:16px;position:relative}
.gift .gtop{display:flex;gap:14px;align-items:center}
.gift .gph{width:104px;height:104px;border-radius:22px;flex:0 0 auto;background-color:var(--sand)}
.gift .gt small{display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--accT);font-weight:600}
.gift .gt small .ms{font-size:16px}
.gift .gt b{display:block;font-size:18px;font-weight:700;line-height:1.3;margin-top:3px}
.gift .gt p{font-size:12px;color:var(--ink2);margin-top:3px;line-height:1.45}
.gsel{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:14px}
.gs{background:var(--surface);border-radius:16px;padding:8px 10px}
.gs small{display:block;font-size:10.5px;color:var(--ink3)}
.gs b{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;font-weight:600;margin-top:1px;white-space:nowrap}
.gs b .ms{font-size:16px;color:var(--ink3)}
.gbtn2{margin-top:8px;height:46px;border-radius:23px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center;gap:7px;font-size:14px;font-weight:600}
.gbtn2 .ms{font-size:19px}
.wraps{display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px dashed var(--accLine)}
.wr{flex:1}
.wr i{display:block;height:62px;border-radius:15px;background-color:var(--sand);position:relative}
.wr.on i{box-shadow:0 0 0 2px var(--accSoft),0 0 0 3.5px var(--accT)}
.wr span{display:block;font-size:11px;margin-top:5px;line-height:1.3}
.wr span em{display:block;color:var(--ink3);font-size:10.5px}
.wrh{display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:13px;font-weight:600}
.wrh small{font-size:11px;color:var(--ink3);font-weight:400}

/* grid */
.grid2{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:18px 12px}
.grid2 .pcard{width:auto}
.grid2 .pimg{height:186px}

/* skills */
.skills{margin:0 16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.sk{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:20px;padding:12px 8px 10px;text-align:center}
.sk i{width:42px;height:42px;border-radius:21px;margin:0 auto;display:grid;place-items:center;background:var(--accSoft);color:var(--accT)}
.sk i .ms{font-size:22px}
.sk b{display:block;font-size:12.5px;font-weight:600;margin-top:7px;line-height:1.25}
.sk small{display:block;font-size:10.5px;color:var(--ink3);margin-top:1px}

/* journal */
.jrow{gap:12px}
.jc{width:250px}
.jc .ji{height:140px;border-radius:22px;background-color:var(--sand);position:relative}
.jc .ji span{position:absolute;top:10px;right:10px;font-size:10.5px;font-weight:600;background:rgba(255,252,247,.94);color:#2B2421;padding:3px 9px 2px;border-radius:10px}
.jc b{display:block;font-size:14px;font-weight:600;margin-top:9px;line-height:1.35}
.jc small{display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--ink3);margin-top:2px}
.jc small .ms{font-size:14px}

/* tab bar */
.tabbar{position:absolute;left:16px;right:16px;bottom:24px;height:66px;border-radius:33px;background:var(--tabbg);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:space-around;padding:0 8px;box-shadow:0 14px 30px rgba(43,36,33,.22)}
html.dark .tabbar{box-shadow:0 0 0 1px rgba(255,255,255,.07),0 14px 30px rgba(0,0,0,.5)}
.tab{display:flex;flex-direction:column;align-items:center;gap:2px;color:rgba(255,255,255,.62);font-size:10.5px;position:relative;width:58px}
.tab .ms{font-size:23px}
.tab.on{color:#fff}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tab.on:before{content:'';position:absolute;top:-9px;width:5px;height:5px;border-radius:3px;background:#F2B8CF}
.tab .bd{position:absolute;top:-4px;left:12px;min-width:17px;height:17px;border-radius:9px;background:#F2B8CF;color:#2B2421;font-size:10px;font-weight:700;display:grid;place-items:center;font-style:normal;line-height:1}
.homeind{position:absolute;bottom:8px;left:50%;width:134px;margin-left:-67px;height:5px;border-radius:3px;background:var(--ink)}

/* ---------- shared bits ---------- */
.topbar{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;gap:10px}
.topbar .tt{flex:1;min-width:0}
.topbar .tt b{display:block;font-size:19px;font-weight:700;line-height:1.2}
.topbar .tt small{display:block;font-size:11.5px;color:var(--ink3);margin-top:1px}
.topbar .grp{display:flex;gap:6px}
.chips{gap:8px;margin-top:6px}
.chip{height:38px;padding:0 15px;border-radius:19px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink2);white-space:nowrap}
.chip.on{background:var(--acc);color:#fff;box-shadow:none;font-weight:600}
.chip small{font-size:11px;opacity:.75}

/* ---------- MENU ---------- */
.grab{width:40px;height:5px;border-radius:3px;background:var(--sand2);margin:2px auto 8px}
.mhead{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:54px}
.mbrand{display:flex;align-items:center;gap:10px}
.mbrand b{display:block;font-size:24px;font-weight:700;line-height:1}
.mbrand small{display:block;font-size:9.5px;letter-spacing:.3em;color:var(--ink3);margin-top:4px;direction:ltr;text-align:right;font-family:'Baloo Bhaijaan 2'}
.mquick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 16px 0}
.mq{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:20px;height:68px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:11.5px;color:var(--ink);font-weight:500}
.mq .ms{font-size:22px;color:var(--accT)}
.mq.hl{background:var(--accSoft);box-shadow:none}
.mcat{margin-top:18px}
.mch{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:10px}
.mch .l{display:flex;align-items:center;gap:10px}
.mch .ico{width:36px;height:36px;border-radius:18px;background:var(--accSoft);display:grid;place-items:center;color:var(--accT)}
.mch .ico .ms{font-size:19px}
.mch b{display:block;font-size:16.5px;font-weight:700;line-height:1.2}
.mch small{display:block;font-size:11px;color:var(--ink3)}
.mch a{font-size:12px;color:var(--accT);font-weight:600;display:flex;align-items:center;gap:1px}
.mch a .ms{font-size:17px}
.mrow{gap:10px}
.mc{width:112px}
.mc .im{height:110px;border-radius:22px;background-color:var(--sand);position:relative;overflow:hidden}
.mc .im .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(30,22,20,.72) 0%,rgba(30,22,20,.12) 52%,rgba(30,22,20,0) 70%)}
.mc .im b{position:absolute;right:11px;left:9px;bottom:9px;color:#fff;font-size:13px;font-weight:600;line-height:1.25}
.mc .im b small{display:block;font-size:10.5px;font-weight:400;opacity:.9;margin-top:1px}
.mc.all{width:104px}
.mc.all .im{background:var(--acc);display:flex;flex-direction:column;justify-content:space-between;padding:12px;color:#fff}
.mc.all .im .ms.k{font-size:26px}
.mc.all .im span.t{font-size:13.5px;font-weight:600;line-height:1.25}
.mc.all .im span.t small{display:block;font-size:10.5px;font-weight:400;opacity:.85;margin-top:2px}
.mc.all .im .go{width:30px;height:30px;border-radius:15px;background:rgba(255,255,255,.18);display:grid;place-items:center;align-self:flex-start}
.mc.all .im .go .ms{font-size:18px}
.mfoot{margin:28px 16px 0;background:var(--surface);border-radius:26px;box-shadow:0 0 0 1px var(--line);padding:4px 16px}
.mli{display:flex;align-items:center;gap:12px;height:52px;border-bottom:1px solid var(--line)}
.mli:last-child{border-bottom:0}
.mli .ms.l{font-size:22px;color:var(--ink2)}
.mli span.t{flex:1;font-size:14px;font-weight:500}
.mli small{font-size:12px;color:var(--ink3)}
.mli .ms.c{font-size:18px;color:var(--ink3)}
.mli .pill2{font-size:11.5px;font-weight:600;color:var(--accT);background:var(--accSoft);padding:3px 10px 2px;border-radius:11px}
.lang{display:flex;background:var(--sand);border-radius:16px;padding:3px;gap:2px}
.lang i{font-size:11.5px;padding:4px 11px 3px;border-radius:13px;color:var(--ink2)}
.lang i.on{background:var(--surface);color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.mhelp{margin:12px 16px 0;display:flex;gap:8px}
.mhelp div{flex:1;height:50px;border-radius:25px;background:var(--accSoft);color:var(--accT);display:flex;align-items:center;justify-content:center;gap:7px;font-size:13px;font-weight:600}
.mhelp .ms{font-size:20px}
.mver{text-align:center;font-size:11px;color:var(--ink3);margin-top:16px}

/* ---------- LISTING ---------- */
.fbar{display:flex;align-items:center;gap:8px;margin:14px 16px 0}
.fbtn{height:42px;padding:0 14px;border-radius:21px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;white-space:nowrap}
.fbtn .ms{font-size:19px}
.fbtn .c{min-width:19px;height:19px;border-radius:10px;background:var(--acc);color:#fff;font-size:10.5px;display:grid;place-items:center;padding:0 5px;line-height:1}
.fbtn.sort{flex:1;justify-content:space-between;font-weight:400;color:var(--ink2)}
.fbtn.sort b{color:var(--ink);font-weight:600}
.vt{display:flex;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:21px;padding:3px;height:42px}
.vt i{width:36px;display:grid;place-items:center;border-radius:18px;color:var(--ink3)}
.vt i.on{background:var(--accSoft);color:var(--accT)}
.vt .ms{font-size:19px}
.atags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 16px 0;align-items:center}
.atag{height:30px;padding:0 7px 0 11px;border-radius:15px;background:var(--accSoft);color:var(--accT);font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:4px}
.atag .ms{font-size:15px}
.aclear{font-size:11.5px;color:var(--ink3);text-decoration:underline;text-underline-offset:3px;margin-right:4px}
.rcount{margin:16px 16px 12px;font-size:12px;color:var(--ink3);display:flex;justify-content:space-between}
.rcount b{color:var(--ink);font-weight:700}
.promo{grid-column:1/-1;height:156px;border-radius:26px;position:relative;overflow:hidden;background-color:var(--deep)}
.promo .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(30,22,24,.86) 0%,rgba(30,22,24,.5) 48%,rgba(30,22,24,0) 76%)}
.promo .pt{position:absolute;right:18px;top:16px;bottom:16px;width:196px;color:#fff;display:flex;flex-direction:column}
.promo .pt small{font-size:11.5px;color:#F6DDE7;display:flex;align-items:center;gap:4px;font-weight:500}
.promo .pt small .ms{font-size:15px}
.promo .pt b{font-size:17.5px;font-weight:700;line-height:1.3;margin-top:4px}
.promo .pt .cta2{margin-top:auto;align-self:flex-start;height:36px;padding:0 14px 0 11px;border-radius:18px;background:#97436C;display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600}
.promo .pt .cta2 .ms{font-size:16px}
.more{margin:26px 16px 0;text-align:center}
.more .prog{width:150px;height:4px;border-radius:2px;background:var(--sand2);margin:0 auto;overflow:hidden}
.more .prog i{display:block;height:100%;width:22%;background:var(--accT);border-radius:2px}
.more p{font-size:11.5px;color:var(--ink3);margin-top:8px}
.more .mb{margin:12px auto 0;height:48px;width:210px;border-radius:24px;box-shadow:0 0 0 1.4px var(--accT);color:var(--accT);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;font-weight:600}
.more .mb .ms{font-size:19px}

/* ---------- PRODUCT ---------- */
.gal{position:relative;margin:0 16px;height:370px;border-radius:30px;overflow:hidden;background-color:var(--tile)}
.gal .gtop{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:flex-start}
.gbtn{width:42px;height:42px;border-radius:21px;background:rgba(255,252,247,.92);display:grid;place-items:center;color:#2B2421;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.gbtn .ms{font-size:21px}
.gbtn.on .ms{color:#7B2D4E;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.gpill{font-size:11.5px;font-weight:600;padding:5px 11px 4px;border-radius:13px;background:#7B2D4E;color:#fff}
.gal .gdots{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;justify-content:center;gap:5px;padding:7px 9px;border-radius:12px;background:rgba(43,36,33,.42);backdrop-filter:blur(6px)}
.gal .gdots i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.55)}
.gal .gdots i.on{width:18px;background:#fff}
.gal .gcnt{position:absolute;bottom:12px;left:12px;height:28px;padding:0 10px;border-radius:14px;background:rgba(43,36,33,.62);color:#fff;font-size:11px;display:flex;align-items:center;direction:ltr}
.thumbs{display:flex;gap:8px;margin:10px 16px 0}
.thumbs div{flex:1;height:62px;border-radius:18px;background-color:var(--tile);position:relative}
.thumbs div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--accT)}
.thumbs div.v:after{content:'';position:absolute;inset:0;border-radius:18px;background:rgba(43,36,33,.45)}
.thumbs div.v span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;z-index:1;font-size:12.5px;font-weight:600}
.pinfo{padding:18px 16px 0}
.pinfo .brand2{display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:var(--ink3)}
.pinfo .brand2 b{color:var(--accT);font-weight:600;display:flex;align-items:center;gap:4px}
.pinfo .brand2 .ms{font-size:16px}
.pinfo h1{font-size:23px;font-weight:700;line-height:1.3;margin-top:5px}
.pinfo .sub{font-size:12.5px;color:var(--ink2);margin-top:1px}
.badges{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.badges>span{height:28px;padding:0 10px 0 9px;border-radius:14px;display:flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;background:var(--goodSoft);color:var(--good)}
.badges>span.a{background:var(--accSoft);color:var(--accT)}
.badges .ms{font-size:16px}
.prow2{display:flex;align-items:flex-end;justify-content:space-between;margin-top:14px}
.bigp{font-size:27px;font-weight:700;line-height:1}
.bigp small{font-size:13px;color:var(--ink2);font-weight:500}
.oldp{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;color:var(--ink3)}
.oldp .dc{font-size:11.5px;font-weight:700;color:#fff;background:var(--acc);padding:2px 8px 1px;border-radius:10px;direction:ltr}
.rbox{text-align:left}
.rbox .r1{display:flex;align-items:center;gap:3px;justify-content:flex-end;font-size:15px;font-weight:700}
.rbox .r1 .ms{font-size:18px;color:var(--gold)}
.rbox small{display:block;font-size:11.5px;color:var(--ink3);margin-top:2px;text-decoration:underline;text-underline-offset:3px}
.inst{margin:14px 16px 0;padding:10px 12px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:10px;font-size:12px;color:var(--ink2)}
.inst b{color:var(--ink);font-weight:700}
.inst .ms{font-size:22px;color:var(--accT)}
.vsec{margin:20px 16px 0}
.vsec .vh{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.vsec .vh b{font-size:14px;font-weight:700}
.vsec .vh b span{color:var(--ink2);font-weight:400}
.vsec .vh a{font-size:12px;color:var(--accT);display:flex;align-items:center;gap:3px;font-weight:600}
.vsec .vh a .ms{font-size:16px}
.sws{display:flex;gap:12px}
.swc{text-align:center;width:52px}
.swc i{display:block;width:46px;height:46px;border-radius:23px;margin:0 auto;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.swc.on i{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--accT)}
.swc span{display:block;font-size:11px;color:var(--ink2);margin-top:6px}
.swc.on span{color:var(--ink);font-weight:600}
.seg{display:flex;gap:8px}
.seg div{flex:1;height:52px;border-radius:18px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:13px;font-weight:600;line-height:1.2}
.seg div small{font-size:10.5px;color:var(--ink3);font-weight:400}
.seg div.on{box-shadow:0 0 0 1.6px var(--accT);background:var(--accSoft)}
.emb{margin:12px 16px 0;border-radius:22px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:12px 14px;display:flex;align-items:center;gap:12px}
.emb .ei{width:40px;height:40px;border-radius:20px;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;flex:0 0 auto}
.emb .ei .ms{font-size:21px}
.emb .et{flex:1}
.emb .et b{display:block;font-size:13.5px;font-weight:700}
.emb .et small{display:block;font-size:11.5px;color:var(--ink3)}
.tgl{width:46px;height:28px;border-radius:14px;background:var(--acc);position:relative;flex:0 0 auto}
.tgl:after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:11px;background:#fff}
.tgl.off{background:var(--sand2)}
.tgl.off:after{left:auto;right:3px}
.namef{margin-top:10px;height:44px;border-radius:15px;background:var(--bg);display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:13.5px;font-weight:600}
.namef small{font-size:11px;color:var(--ink3);font-weight:400}
.blk{margin:12px 16px 0;background:var(--surface);border-radius:26px;box-shadow:0 0 0 1px var(--line);padding:16px}
.blk h4{font-size:16.5px;font-weight:700;display:flex;align-items:center;justify-content:space-between;line-height:1.2}
.blk h4 small{font-size:11.5px;color:var(--ink3);font-weight:400}
.agebar{margin-top:14px;position:relative;height:40px}
.agebar .track{position:absolute;top:10px;left:0;right:0;height:8px;border-radius:4px;background:var(--sand)}
.agebar .fill{position:absolute;top:10px;height:8px;border-radius:4px;background:var(--acc)}
.agebar .lbls{position:absolute;top:24px;left:0;right:0;display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink3)}
.agebar .fill.soft{opacity:.28}
.agebar .pin{position:absolute;top:4px;width:20px;height:20px;border-radius:10px;background:var(--surface);box-shadow:0 0 0 3px var(--acc);margin-right:-10px}
.agenote{display:flex;gap:8px;margin-top:8px}
.agenote div{flex:1;background:var(--bg);border-radius:16px;padding:9px 11px}
.agenote small{display:block;font-size:10.5px;color:var(--ink3)}
.agenote b{display:block;font-size:13.5px;font-weight:700;margin-top:1px}
.safel{display:flex;flex-direction:column;gap:9px;margin-top:12px}
.sl{display:flex;align-items:center;gap:11px}
.sl i{width:38px;height:38px;border-radius:19px;background:var(--goodSoft);color:var(--good);display:grid;place-items:center;flex:0 0 auto}
.sl i .ms{font-size:20px}
.sl b{display:block;font-size:13px;font-weight:600;line-height:1.25}
.sl small{display:block;font-size:11px;color:var(--ink3)}
.warn{margin-top:12px;padding:10px 12px;border-radius:16px;background:var(--bg);font-size:11.5px;color:var(--ink2);display:flex;gap:8px;align-items:flex-start;line-height:1.45}
.warn .ms{font-size:18px;color:var(--gold)}
.box{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.bx{background:var(--bg);border-radius:18px;padding:10px;display:flex;align-items:center;gap:9px}
.bx i{width:40px;height:40px;border-radius:14px;flex:0 0 auto;background-color:var(--tile);display:grid;place-items:center;color:var(--accT)}
.bx i .ms{font-size:20px}
html.dark .bx i{background-color:var(--sand2)}
.bx b{display:block;font-size:12px;font-weight:600;line-height:1.25}
.bx small{display:block;font-size:10.5px;color:var(--ink3)}
.skl{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.skr{display:flex;align-items:center;gap:10px}
.skr .ms{font-size:20px;color:var(--accT);width:22px;flex:0 0 auto}
.skr span.l{width:118px;font-size:12.5px;font-weight:500}
.skr i{flex:1;height:8px;border-radius:4px;background:var(--sand);overflow:hidden;display:block}
.skr i em{display:block;height:100%;border-radius:4px;background:var(--acc)}
.skr b{font-size:11px;color:var(--ink3);font-weight:500;width:36px;text-align:left}
.dlv{margin:12px 16px 0;border-radius:26px;background:var(--accSoft);padding:4px 14px}
.dl{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--accLine)}
.dl:last-child{border:0}
.dl .ms{font-size:22px;color:var(--accT)}
.dl b{display:block;font-size:13px;font-weight:600}
.dl small{display:block;font-size:11.5px;color:var(--ink2)}
.acc{margin:12px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:0 16px}
.ac{border-bottom:1px solid var(--line);padding:14px 0}
.ac:last-child{border:0}
.ac .ah{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:600}
.ac .ah .ms{font-size:20px;color:var(--ink3)}
.ac p{font-size:12.5px;color:var(--ink2);line-height:1.7;margin-top:6px}
.rv{margin:0 16px;background:var(--surface);border-radius:26px;box-shadow:0 0 0 1px var(--line);padding:16px}
.rvtop{display:flex;gap:16px;align-items:center}
.rvbig{text-align:center;width:92px}
.rvbig b{font-size:40px;font-weight:700;line-height:1}
.rvbig .stars{display:flex;justify-content:center;margin-top:4px}
.rvbig .stars .ms{font-size:14px;color:var(--gold)}
.rvbig small{display:block;font-size:11px;color:var(--ink3);margin-top:2px}
.bars{flex:1;display:flex;flex-direction:column;gap:5px}
.bar{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--ink3)}
.bar i{flex:1;height:6px;border-radius:3px;background:var(--sand);overflow:hidden;display:block}
.bar i em{display:block;height:100%;background:var(--acc);border-radius:3px}
html.dark .bar i em{background:var(--accT)}
.rvph{display:flex;gap:8px;margin-top:14px}
.rvph div{flex:1;height:80px;border-radius:18px;background-color:var(--sand);position:relative}
.rvph div.more2:after{content:'+64';direction:ltr;position:absolute;inset:0;border-radius:18px;background:rgba(43,36,33,.55);color:#fff;display:grid;place-items:center;font-size:14px;font-weight:600}
.rvq{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.rvq .who{display:flex;align-items:center;gap:8px}
.rvq .who i{width:32px;height:32px;border-radius:16px;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;font-size:13px;font-weight:700}
.rvq .who b{display:block;font-size:12.5px;font-weight:600}
.rvq .who small{display:block;font-size:11px;color:var(--ink3)}
.rvq .who .stars{margin-right:auto;display:flex}
.rvq .who .stars .ms{font-size:13px;color:var(--gold)}
.rvq p{font-size:12.5px;line-height:1.65;margin-top:7px}
.rvq .tagsr{display:flex;gap:6px;margin-top:7px}
.rvq .tagsr span{font-size:11px;color:var(--ink2);background:var(--bg);padding:2px 9px;border-radius:10px}
.gw{margin:0 16px;background:var(--surface);border-radius:26px;box-shadow:0 0 0 1px var(--line);padding:6px 12px}
.gwi{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}
.gwi:last-child{border:0}
.gwi .gi{width:64px;height:64px;border-radius:18px;background-color:var(--tile);flex:0 0 auto}
.gwi .gt{flex:1;min-width:0}
.gwi .gt b{display:block;font-size:13px;font-weight:600}
.gwi .gt small{display:block;font-size:11px;color:var(--ink3)}
.gwi .gt span{display:block;font-size:14px;font-weight:700;margin-top:2px}
.gwi .gt span small{display:inline;font-size:10.5px;color:var(--ink2);font-weight:500}
.ck2{width:26px;height:26px;border-radius:13px;border:1.5px solid var(--sand2);display:grid;place-items:center}
.ck2.on{background:var(--acc);border-color:var(--acc);color:#fff}
.ck2 .ms{font-size:17px}
.gwsum{display:flex;justify-content:space-between;align-items:center;padding:10px 0 6px;font-size:12.5px;color:var(--ink2)}
.gwsum b{font-size:15px;color:var(--ink);font-weight:700}
.gwsum .ab{height:38px;padding:0 13px;border-radius:19px;background:var(--accSoft);color:var(--accT);font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px}
.gwsum .ab .ms{font-size:17px}
.sticky{position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:var(--surface);box-shadow:0 -1px 0 var(--line),0 -12px 30px rgba(0,0,0,.06);display:flex;align-items:center;gap:10px}
html.dark .sticky{box-shadow:0 -1px 0 var(--line),0 -12px 30px rgba(0,0,0,.4)}
.sticky .qty{display:flex;align-items:center;height:54px;border-radius:27px;background:var(--bg);box-shadow:0 0 0 1px var(--line);padding:0 6px;gap:4px}
.sticky .qty i{width:32px;height:32px;display:grid;place-items:center;color:var(--ink2)}
.sticky .qty i .ms{font-size:20px}
.sticky .qty b{width:20px;text-align:center;font-size:16px;font-weight:700}
.sticky .add{flex:1;height:54px;border-radius:27px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 20px;font-size:15px;font-weight:600}
.sticky .add span{display:flex;align-items:center;gap:7px}
.sticky .add .ms{font-size:20px}
.sticky .add em{font-size:14px;font-weight:500;opacity:.92}
.pscreen{padding-bottom:112px}
"""


def agebadge(a):
    return f'<span class="agb">{ic("child_care")}{a}</span>'


def pcard(img, f, name, meta, price, old=None, tag=None, fav=False, age=None, rate=None):
    t = ''
    if tag:
        t = f'<span class="tag ltr">{tag}</span>' if tag.startswith('-') else f'<span class="tag">{tag}</span>'
    a = agebadge(age) if age else ''
    pr = f'<div class="price">{price} <small>{CUR}</small>' + (f'<s>{old} {CUR}</s>' if old else '') + '</div>'
    r = f'<div class="rate">{ic("star","f")}<b>{rate[0]}</b> ({rate[1]})</div>' if rate else ''
    return f'''<div class="pcard">{ph(T+img, f, "pimg", t + f'<div class="fav{" on" if fav else ""}">{ic("favorite")}</div>' + a)}
<div class="pname">{name}</div><div class="pmat">{meta}</div>{r}
<div class="pfoot">{pr}<div class="addb">{ic("add")}</div></div></div>'''


def tabbar(active=0):
    tabs = [("home", "الرئيسية"), ("grid_view", "المتجر"), ("shopping_bag", "السلة"), ("package_2", "طلباتي"), ("person", "حسابي")]
    out = ''
    for i, (n, l) in enumerate(tabs):
        bd = '<i class="bd">2</i>' if n == 'shopping_bag' else ''
        out += f'<div class="tab{" on" if i == active else ""}">{ic(n)}<span>{l}</span>{bd}</div>'
    return f'<div class="tabbar">{out}</div><div class="homeind"></div>'


MARK = '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="6.8" fill="#fff"/><path d="M12 6.7c.2-2 1.4-3.4 3.6-3.9-.1 2.1-1.4 3.6-3.6 3.9z" fill="#fff"/><circle cx="9.6" cy="12.6" r="1.1" fill="#7B2D4E"/><circle cx="14.4" cy="12.6" r="1.1" fill="#7B2D4E"/><path d="M9.8 15.6c1.3 1 3.1 1 4.4 0" stroke="#7B2D4E" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>'


def lt(s):
    return f'<span class="ltr" dir="ltr">{s}</span>'


# ---------------- HOME ----------------
def home():
    cats = [("wooden-figures.jpg", "0.3 0.55 1.6", "خشبية", True), ("bear-sweater.jpg", "0.5 0.3 2.1", "دُمى محشوّة", False),
            ("bricks-teal.jpg", "0.5 0.5 1.4", "بناء وتركيب", False), ("backgammon.jpg", "0.3 0.55 1.8", "ألغاز وألعاب", False),
            ("telescope-globe.jpg", "0.43 0.48 2.6", "علوم واستكشاف", False), ("kite.jpg", "0.72 0.5 1.4", "في الهواء الطلق", False),
            ("crib-mobile.jpg", "0.62 0.45 1.5", "للرضّع", False)]
    cath = ''.join(f'<div class="cat{" on" if on else ""}">{ph(T+i, f, "ci")}<span>{n}</span></div>' for i, f, n, on in cats)
    ages = [("sleeping-baby.jpg", "0.3 0.62 1.25", lt("0–12"), "شهراً"), ("toddler-play.jpg", "0.5 0.4 1.0", lt("1–2"), "سنة"),
            ("toddler-bear.jpg", "0.6 0.5 1.0", lt("3–5"), "سنوات"), ("girl-drawing.jpg", "0.25 0.5 1.0", lt("6–8"), "سنوات"),
            ("football-boy.jpg", "0.55 0.55 1.0", lt("9+"), "سنوات")]
    ageh = ''.join(ph(T+i, f, "age", f'<div class="sc"></div><div class="at"><b>{a}</b><small>{u}</small></div>') for i, f, a, u in ages)
    new = ''.join([
        pcard("bunny-knit.jpg", "0.68 0.45 1.3", "أرنب «زهر» من الكتّان", "قطن عضوي · 32 سم", "149", tag="جديد", age="من الولادة", rate=("4.9", "86")),
        pcard("wooden-figures.jpg", "0.16 0.6 1.25", "عائلة الغابة الخشبية", "خشب زان · 6 شخصيات", "265", age=lt("3+") + " سنوات", fav=True, rate=("5.0", "41")),
        pcard("plane.jpg", "0.52 0.68 2.6", "طائرة «سِرب» الخشبية", "خشب مطلي بألوان مائية", "89", age=lt("2+") + " سنة", rate=("4.8", "57")),
    ])
    best = ''.join([
        pcard("blocks-close.jpg", "0.5 0.5 1.05", "مكعبات «قوس قزح»", "48 قطعة · خشب طبيعي", "185", "230", "-20%", age=lt("1+") + " سنة", rate=("4.9", "312")),
        pcard("bear-mint.jpg", "0.5 0.6 1.0", "الدب «لؤلؤ» الكلاسيكي", "فرو ناعم · 40 سم", "139", age="من الولادة", rate=("4.8", "205")),
        pcard("bunny-eggs.jpg", "0.42 0.66 1.25", "لعبة الفرز «أرنوب»", "4 قطع · خشب الزان", "119", age=lt("18+") + " شهراً", rate=("4.9", "98")),
        pcard("crib-mobile.jpg", "0.6 0.4 1.25", "معلّقة المهد «غيمة»", "صوف محبوك يدوياً", "229", tag="حصري", fav=True, age="من الولادة", rate=("5.0", "64")),
    ])
    return f'''<div class="screen">{STATUS}
<div class="header"><div class="brand"><div class="mark">{MARK}</div><div><b>تُوت</b><small>{ic("location_on","f")}التوصيل إلى دبي{ic("expand_more","dn")}</small></div></div>
<div class="hicons"><div class="ibtn">{ic("notifications")}<i class="n">3</i></div><div class="ibtn">{ic("menu")}</div></div></div>
<div class="srow"><div class="search">{ic("search")}<div class="t">ابحث عن دب، مكعبات، لغز…</div><div class="ar">{ic("photo_camera")}</div></div><div class="filt">{ic("tune")}</div></div>
<div class="hscroll cats">{cath}</div>
<div class="hscroll hero">
{ph(T+"teepee.jpg", "0.38 0.6 1.12", "hcard", f'<div class="wash"></div><div class="txt"><span class="lab">{ic("auto_awesome")}مجموعة الشتاء 2026</span><h2>ركنٌ صغير<br>لخيالٍ كبير</h2><p>خيام لعب ودمى من القطن العضوي</p><span class="cta">تسوّق المجموعة{ic("arrow_back")}</span></div>')}
{ph(T+"girl-drawing.jpg", "0.4 0.5 1.0", "hcard")}
</div>
<div class="dots"><i class="on"></i><i></i><i></i><i></i></div>

<div class="sec"><div class="shead"><div><h3>تسوّق حسب العمر</h3><div class="sub">ألعاب مختارة لكل مرحلة نمو</div></div><a>دليل الأعمار{ic("chevron_left")}</a></div>
<div class="hscroll ages">{ageh}</div></div>

<div class="sec"><div class="safe"><div class="st"><div class="shield">{ic("verified_user","f")}</div><div><b>أمانهم أولاً</b><small>كل لعبة تمرّ بفحص سلامة قبل أن تصل إليك</small></div></div>
<div class="sgrid"><div class="sg">{ic("eco")}<span>خشب من غابات مستدامة</span></div><div class="sg">{ic("format_paint")}<span>طلاء مائي غير سام</span></div>
<div class="sg">{ic("science")}<span>خالٍ من BPA والفثالات</span></div><div class="sg">{ic("workspace_premium")}<span>مطابق لمعايير EN71</span></div></div></div></div>

<div class="sec"><div class="shead"><div><h3>وصل حديثاً</h3><div class="sub">قطع جديدة من ورشنا هذا الأسبوع</div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll prow">{new}</div></div>

<div class="sec"><div class="gift">
<div class="gtop">{ph(T+"gift-confetti.jpg", "0.62 0.55 1.5", "gph")}<div class="gt"><small>{ic("cake")}هدايا أعياد الميلاد</small><b>هدية مثالية في 3 خطوات</b><p>نختارها ونغلّفها ونرفق بطاقة بخط اليد</p></div></div>
<div class="gsel"><div class="gs"><small>العمر</small><b>4 سنوات{ic("expand_more")}</b></div><div class="gs"><small>الميزانية</small><b>حتى 250{ic("expand_more")}</b></div><div class="gs"><small>يحب</small><b>البناء{ic("expand_more")}</b></div></div>
<div class="gbtn2">{ic("redeem")}اقترح لي 24 هدية</div>
<div class="wrh">اختر التغليف<small>يصل غداً في دبي</small></div>
<div class="wraps" style="border:0;padding-top:0;margin-top:8px">
<div class="wr on">{ph(T+"gift-kraft.jpg", "0.47 0.45 1.6", "", tag="i")}<span>كرافت ووردي<em>مجاناً</em></span></div>
<div class="wr">{ph(T+"gift-black.jpg", "0.45 0.45 1.4", "", tag="i")}<span>أسود وذهبي<em>+15 {CUR}</em></span></div>
<div class="wr">{ph(T+"gift-white.jpg", "0.5 0.5 1.6", "", tag="i")}<span>أبيض احتفالي<em>+10 {CUR}</em></span></div></div>
</div></div>

<div class="sec"><div class="shead"><div><h3>الأكثر حبّاً</h3><div class="sub">اختيارات الأهل هذا الشهر</div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="grid2">{best}</div></div>

<div class="sec"><div class="shead"><div><h3>تعلّم باللعب</h3><div class="sub">تسوّق حسب المهارة التي تريد تنميتها</div></div></div>
<div class="skills">
<div class="sk"><i>{ic("back_hand")}</i><b>المهارات الحركية</b><small>148 لعبة</small></div>
<div class="sk"><i>{ic("psychology")}</i><b>المنطق والتفكير</b><small>96 لعبة</small></div>
<div class="sk"><i>{ic("forum")}</i><b>اللغة والتواصل</b><small>72 لعبة</small></div>
<div class="sk"><i>{ic("palette")}</i><b>الخيال والإبداع</b><small>131 لعبة</small></div>
<div class="sk"><i>{ic("science")}</i><b>العلوم والاستكشاف</b><small>64 لعبة</small></div>
<div class="sk"><i>{ic("diversity_3")}</i><b>اللعب الجماعي</b><small>58 لعبة</small></div></div></div>

<div class="sec"><div class="shead"><div><h3>دليل الأهل</h3><div class="sub">أفكار لعب من مختصّي الطفولة</div></div><a>كل المقالات{ic("chevron_left")}</a></div>
<div class="hscroll jrow">
<div class="jc">{ph(T+"tent-family.jpg", "0.55 0.5 1.0", "ji", '<span>أنشطة منزلية</span>')}<b>خيمة القراءة: 5 أفكار لأمسيات الشتاء</b><small>{ic("schedule")}قراءة 4 دقائق</small></div>
<div class="jc">{ph(T+"family-play.jpg", "0.5 0.5 1.0", "ji", '<span>النمو</span>')}<b>كيف تختار لعبة تناسب عمر طفلك؟</b><small>{ic("schedule")}قراءة 6 دقائق</small></div>
</div></div>
{tabbar(0)}
</div>'''


# ---------------- MENU ----------------
MENU = [
    ("toys", "الألعاب الخشبية", "860 لعبة", [
        ("wooden-figures.jpg", "0.3 0.55 1.5", "شخصيات وبيوت", "124"),
        ("blocks-close.jpg", "0.5 0.5 1.1", "مكعبات خشبية", "96"),
        ("bunny-eggs.jpg", "0.42 0.72 2.4", "ألعاب الفرز", "71"),
        ("plane.jpg", "0.52 0.68 2.8", "مركبات خشبية", "88"),
        ("block-tower.jpg", "0.7 0.3 1.0", "أبراج التوازن", "43")]),
    ("deployed_code", "البناء والتركيب", "540 لعبة", [
        ("bricks-teal.jpg", "0.5 0.5 1.3", "مكعبات تركيب", "212"),
        ("lego-kid.jpg", "0.78 0.6 1.6", "مجموعات للصغار", "86"),
        ("bricks-pile.jpg", "0.5 0.5 1.6", "علب كبيرة", "64"),
        ("block-tower.jpg", "0.68 0.2 1.4", "مكعبات ملوّنة", "51")]),
    ("pets", "الدُمى المحشوّة", "410 لعبة", [
        ("bear-sweater.jpg", "0.52 0.45 1.9", "دببة", "138"),
        ("bunny-knit.jpg", "0.68 0.4 1.4", "أرانب", "64"),
        ("cuddly-bear.jpg", "0.4 0.45 1.4", "رفقاء النوم", "92"),
        ("snowman-plush.jpg", "0.62 0.5 1.5", "شخصيات موسمية", "37")]),
    ("extension", "الألغاز والألعاب", "320 لعبة", [
        ("backgammon.jpg", "0.3 0.55 1.7", "ألعاب لوحية", "84"),
        ("chess.jpg", "0.45 0.45 1.3", "شطرنج", "26"),
        ("letters.jpg", "0.3 0.6 1.5", "حروف وأرقام", "58"),
        ("dice.jpg", "0.55 0.4 1.5", "ألعاب عائلية", "47")]),
    ("science", "العلوم والفنون", "470 لعبة", [
        ("telescope-globe.jpg", "0.43 0.45 2.4", "الفلك", "34"),
        ("globes.jpg", "0.68 0.4 1.5", "كرات أرضية", "29"),
        ("crayons-pastel.jpg", "0.62 0.55 1.6", "الرسم والتلوين", "118"),
        ("beads-kid.jpg", "0.78 0.75 2.0", "خرز وحِرف", "76"),
        ("ukulele.jpg", "0.5 0.75 1.2", "آلات موسيقية", "41")]),
    ("park", "الألعاب الخارجية", "290 لعبة", [
        ("kite.jpg", "0.72 0.5 1.3", "طائرات ورقية", "31"),
        ("bubbles-girl.jpg", "0.65 0.45 1.4", "فقاعات", "22"),
        ("football-boy.jpg", "0.55 0.55 1.0", "كرات ورياضة", "67"),
        ("tricycle.jpg", "0.57 0.62 2.6", "دراجات", "38"),
        ("teepee.jpg", "0.65 0.55 1.6", "خيام لعب", "19")]),
    ("child_care", "ألعاب الرضّع", "380 لعبة", [
        ("crib-mobile.jpg", "0.6 0.4 1.25", "معلّقات المهد", "46"),
        ("bead-maze.jpg", "0.5 0.4 1.0", "متاهات الخرز", "52"),
        ("toddler-bear.jpg", "0.18 0.55 1.3", "دمى ناعمة", "88"),
        ("toddler-play.jpg", "0.5 0.4 1.0", "ألعاب الأرض", "61")]),
]


def menu():
    rows = ''
    for icn, name, cnt, subs in MENU:
        cards = f'<div class="mc all"><div class="im">{ic(icn,"k")}<span class="t">كل {name}<small>{cnt}</small></span><span class="go">{ic("arrow_back")}</span></div></div>'
        for img, f, n, c in subs:
            cards += f'<div class="mc">{ph(T + img, f, "im", f"<div class=sc></div><b>{n}<small>{c} لعبة</small></b>")}</div>'
        rows += f'''<div class="mcat"><div class="mch"><div class="l"><span class="ico">{ic(icn)}</span><div><b>{name}</b><small>{cnt} · {len(subs)} أقسام فرعية</small></div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll mrow">{cards}</div></div>'''
    return f'''<div class="screen" style="padding-bottom:40px">{STATUS}
<div class="grab"></div>
<div class="mhead"><div class="mbrand"><div class="mark">{MARK}</div><div><b>تُوت</b><small>TOOT · PLAY &amp; LEARN</small></div></div>
<div class="ibtn">{ic("close")}</div></div>
<div class="srow"><div class="search">{ic("search")}<div class="t">ابحث في كل الأقسام…</div><div class="ar">{ic("photo_camera")}</div></div></div>
<div class="mquick">
<div class="mq hl">{ic("child_care")}حسب العمر</div><div class="mq">{ic("cake")}هدايا الميلاد</div><div class="mq">{ic("new_releases")}وصل حديثاً</div><div class="mq">{ic("percent")}العروض</div></div>
{rows}
<div class="mfoot">
<div class="mli">{ic("person","l")}<span class="t">حسابي</span><small>مريم الكعبي</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("package_2","l")}<span class="t">طلباتي</span><span class="pill2">طلب في الطريق</span>{ic("chevron_left","c")}</div>
<div class="mli">{ic("favorite","l")}<span class="t">المفضلة</span><small>9 ألعاب</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("language","l")}<span class="t">اللغة</span><div class="lang"><i class="on">العربية</i><i>English</i></div></div>
<div class="mli">{ic("support_agent","l")}<span class="t">تواصل معنا</span><small>يومياً 9ص – 10م</small>{ic("chevron_left","c")}</div>
</div>
<div class="mhelp"><div>{ic("chat")}محادثة فورية</div><div>{ic("call")}اتصل بنا</div></div>
<div class="mver">تُوت · الإصدار 2.4</div>
<div class="homeind"></div>
</div>'''


# ---------------- LISTING ----------------
def listing():
    P = [
        pcard("wooden-figures.jpg", "0.16 0.6 1.25", "عائلة الغابة الخشبية", "خشب زان · 6 شخصيات", "265", age=lt("3+") + " سنوات", rate=("5.0", "41"), tag="جديد"),
        pcard("blocks-close.jpg", "0.5 0.5 1.05", "مكعبات «قوس قزح»", "48 قطعة · خشب طبيعي", "185", "230", "-20%", age=lt("1+") + " سنة", rate=("4.9", "312")),
        pcard("bunny-eggs.jpg", "0.42 0.66 1.25", "لعبة الفرز «أرنوب»", "4 قطع · خشب الزان", "119", age=lt("18+") + " شهراً", fav=True, rate=("4.9", "98")),
        pcard("plane.jpg", "0.52 0.68 2.6", "طائرة «سِرب» الخشبية", "ألوان مائية آمنة", "89", age=lt("2+") + " سنة", rate=("4.8", "57")),
        pcard("block-tower.jpg", "0.7 0.28 1.05", "برج «المعماري الصغير»", "36 قطعة · أقواس ونوافذ", "210", age=lt("2+") + " سنة", rate=("4.7", "76"), tag="الأكثر مبيعاً"),
        pcard("letters.jpg", "0.25 0.6 1.6", "طوابع الحروف الخشبية", "56 حرفاً · حبر نباتي", "155", age=lt("4+") + " سنوات", rate=("4.8", "33")),
        pcard("backgammon.jpg", "0.28 0.55 1.6", "طاولة زهر للعائلة", "خشب الجوز · حقيبة", "340", "395", "-15%", age=lt("6+") + " سنوات", rate=("4.9", "52")),
        pcard("chess.jpg", "0.42 0.5 1.2", "شطرنج «الفرسان»", "قطع منحوتة · لوح خشبي", "420", age=lt("7+") + " سنوات", fav=True, rate=("5.0", "29")),
    ]
    promo = f'''<div class="promo" data-src="img/{T}wooden-figures.jpg" data-f="0.15 0.5 1.0"><div class="sc"></div><div class="pt"><small>{ic("redeem")}صناديق الهدايا</small><b>اجمع 3 ألعاب خشبية<br>ووفّر 15% مع تغليف مجاني</b><span class="cta2">ابدأ صندوقك{ic("arrow_back")}</span></div></div>'''
    grid = ''.join(P[:4]) + promo + ''.join(P[4:])
    return f'''<div class="screen">{STATUS}
<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div class="tt"><b>الألعاب الخشبية</b><small>860 لعبة · توصيل مجاني فوق 200 {CUR}</small></div><div class="grp"><div class="ibtn">{ic("search")}</div><div class="ibtn">{ic("shopping_bag")}<i class="n">2</i></div></div></div>
<div class="hscroll chips"><div class="chip on">الكل <small>860</small></div><div class="chip">شخصيات وبيوت</div><div class="chip">مكعبات <small>96</small></div><div class="chip">ألعاب الفرز</div><div class="chip">مركبات</div><div class="chip">أبراج التوازن</div></div>
<div class="fbar"><div class="fbtn">{ic("tune")}تصفية<span class="c">3</span></div><div class="fbtn sort"><span>ترتيب: <b>الأكثر حبّاً</b></span>{ic("expand_more")}</div><div class="vt"><i class="on">{ic("grid_view")}</i><i>{ic("view_agenda")}</i></div></div>
<div class="atags"><span class="atag">{lt("1–5")} سنوات{ic("close")}</span><span class="atag">خشب طبيعي{ic("close")}</span><span class="atag">قابل للتغليف{ic("close")}</span><span class="aclear">مسح الكل</span></div>
<div class="rcount"><span><b>214</b> لعبة</span><span>تصل غداً إلى دبي</span></div>
<div class="grid2">{grid}</div>
<div class="more"><div class="prog"><i></i></div><p>عرضت 8 من 214 لعبة</p><div class="mb">عرض المزيد{ic("expand_more")}</div></div>
{tabbar(1)}
</div>'''


# ---------------- PRODUCT ----------------
def product():
    b = "bear-sweater.jpg"
    return f'''<div class="screen pscreen">{STATUS}
<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div class="tt"></div><div class="grp"><div class="ibtn">{ic("ios_share")}</div><div class="ibtn">{ic("shopping_bag")}<i class="n">2</i></div></div></div>
{ph(T+b, "0.53 0.5 1.25", "gal", f'<div class="gtop"><span class="gpill">الأكثر حبّاً</span><div class="gbtn on">{ic("favorite")}</div></div><span class="gcnt">1 / 6</span><div class="gdots"><i class="on"></i><i></i><i></i><i></i><i></i><i></i></div>')}
<div class="thumbs">{ph(T+b,"0.53 0.5 1.25","on")}{ph(T+b,"0.52 0.22 3.2")}{ph(T+b,"0.5 0.55 3.0")}{ph(T+b,"0.44 0.88 3.0")}{ph(T+"toddler-bear.jpg","0.2 0.55 1.4","v",'<span>+2</span>')}</div>
<div class="pinfo">
<div class="brand2"><b>{ic("verified","f")}مشغل تُوت · صُنع يدوياً</b><span>رمز اللعبة: TT-0412</span></div>
<h1>الدب «سمسم» بالسترة المحبوكة</h1>
<div class="sub">فرو قطني ناعم · سترة صوف ميرينو قابلة للنزع</div>
<div class="badges"><span class="a">{ic("child_care")}من الولادة</span><span>{ic("verified_user","f")}آمن للرضّع</span><span>{ic("local_laundry_service")}قابل للغسل</span></div>
<div class="prow2"><div><div class="bigp">159 <small>{CUR}</small></div><div class="oldp"><s>199 {CUR}</s><span class="dc">-20%</span><span>شامل الضريبة</span></div></div>
<div class="rbox"><div class="r1">4.9{ic("star","f")}</div><small>286 تقييماً</small></div></div>
</div>
<div class="inst">{ic("calendar_month")}<span>قسّطها على 4 دفعات بقيمة <b>39.75 {CUR}</b> بدون فوائد</span></div>
<div class="vsec"><div class="vh"><b>لون السترة: <span>أزرق بحري</span></b></div>
<div class="sws">
<div class="swc on"><i style="background:#2F5DA8"></i><span>بحري</span></div>
<div class="swc"><i style="background:#D9C7AE"></i><span>شوفان</span></div>
<div class="swc"><i style="background:#8A3A5A"></i><span>توتي</span></div>
<div class="swc"><i style="background:#6F8A64"></i><span>زيتوني</span></div>
<div class="swc"><i style="background:#E8B9A8"></i><span>وردي</span></div></div></div>
<div class="vsec"><div class="vh"><b>الحجم</b><a>{ic("straighten")}دليل المقاسات</a></div>
<div class="seg"><div>صغير<small>25 سم</small></div><div class="on">وسط<small>35 سم</small></div><div>كبير<small>+60 {CUR} · 50 سم</small></div></div></div>
<div class="emb"><div class="ei">{ic("draw")}</div><div class="et"><b>طرّز اسم طفلك</b><small>على السترة · +25 {CUR}</small><div class="namef">سلمى<small>5 / 10 أحرف</small></div></div></div>
<div class="emb"><div class="ei">{ic("redeem")}</div><div class="et"><b>تغليف هدية وبطاقة</b><small>كرافت بشريط وردي · مجاناً</small></div><span class="tgl"></span></div>

<div class="blk"><h4>العمر المناسب<small>توصية مختصّي الطفولة</small></h4>
<div class="agebar"><div class="track"></div><div class="fill soft" style="right:0;width:100%"></div><div class="fill" style="right:0;width:64%"></div><div class="lbls"><span>من الولادة</span><span>سنة</span><span>3 سنوات</span><span>{lt("6+")} سنوات</span></div></div>
<div class="agenote"><div><small>الأنسب</small><b>من الولادة حتى 3 سنوات</b></div><div><small>أفضل استخدام</small><b>رفيق النوم والعناق</b></div></div></div>

<div class="blk"><h4>السلامة والجودة<small>مختبر معتمد</small></h4><div class="safel">
<div class="sl"><i>{ic("visibility")}</i><div><b>عيون وأنف مطرّزة بالكامل</b><small>بلا أزرار أو قطع صغيرة قابلة للفك</small></div></div>
<div class="sl"><i>{ic("eco")}</i><div><b>قطن عضوي وحشوة مضادة للحساسية</b><small>صبغات خالية من المعادن الثقيلة</small></div></div>
<div class="sl"><i>{ic("workspace_premium")}</i><div><b>مطابق لمعيار EN71 الأوروبي</b><small>اختبار الشد والاشتعال والمواد</small></div></div></div>
<div class="warn">{ic("info")}<span>انزع السترة قبل نوم الرضيع دون 12 شهراً، واغسلها يدوياً بماء فاتر.</span></div></div>

<div class="blk"><h4>محتويات العلبة<small>4 قطع</small></h4><div class="box">
<div class="bx">{ph(T+b,"0.52 0.32 2.2","",tag="i")}<div><b>الدب سمسم</b><small>35 سم</small></div></div>
<div class="bx">{ph(T+b,"0.5 0.56 3.2","",tag="i")}<div><b>سترة صوفية</b><small>محبوكة يدوياً</small></div></div>
<div class="bx"><i>{ic("shopping_bag")}</i><div><b>كيس قطني</b><small>للحفظ والسفر</small></div></div>
<div class="bx"><i>{ic("mail")}</i><div><b>شهادة تبنٍّ</b><small>باسم طفلك</small></div></div></div></div>

<div class="blk"><h4>مهارات ينمّيها</h4><div class="skl">
<div class="skr">{ic("favorite")}<span class="l">الأمان العاطفي</span><i><em style="width:92%"></em></i><b>عالٍ</b></div>
<div class="skr">{ic("theater_comedy")}<span class="l">اللعب التخيّلي</span><i><em style="width:78%"></em></i><b>عالٍ</b></div>
<div class="skr">{ic("forum")}<span class="l">اللغة والتعبير</span><i><em style="width:56%"></em></i><b>متوسط</b></div>
<div class="skr">{ic("back_hand")}<span class="l">الحواس واللمس</span><i><em style="width:64%"></em></i><b>متوسط</b></div></div></div>

<div class="dlv">
<div class="dl">{ic("local_shipping")}<div><b>توصيل غداً في دبي وأبوظبي</b><small>مجاني للطلبات فوق 200 {CUR}</small></div></div>
<div class="dl">{ic("autorenew")}<div><b>إرجاع سهل خلال 30 يوماً</b><small>نستلمها من بيتك دون رسوم</small></div></div>
<div class="dl">{ic("cake")}<div><b>توصيل في يوم الميلاد</b><small>حدّد التاريخ وسنصل في الموعد</small></div></div></div>

<div class="acc">
<div class="ac"><div class="ah">الوصف{ic("remove")}</div><p>سمسم دبّ صغير بقلب كبير؛ فروه القطني ناعم كالغيم، وسترته محبوكة يدوياً في مشغلنا. صُمّم ليكون أول صديق لطفلك ويرافقه سنوات.</p></div>
<div class="ac"><div class="ah">المواصفات والمواد{ic("add")}</div></div>
<div class="ac"><div class="ah">العناية والغسيل{ic("add")}</div></div>
<div class="ac"><div class="ah">الشحن والإرجاع{ic("add")}</div></div></div>

<div class="sec" style="margin-top:28px"><div class="shead"><div><h3>آراء الأهل</h3></div><a>كل التقييمات{ic("chevron_left")}</a></div>
<div class="rv"><div class="rvtop">
<div class="rvbig"><b>4.9</b>{stars()}<small>286 تقييماً</small></div>
<div class="bars"><div class="bar">5<i><em style="width:88%"></em></i></div><div class="bar">4<i><em style="width:9%"></em></i></div><div class="bar">3<i><em style="width:2%"></em></i></div><div class="bar">2<i><em style="width:1%"></em></i></div><div class="bar">1<i><em style="width:0%"></em></i></div></div></div>
<div class="rvph">{ph(T+"toddler-bear.jpg","0.3 0.5 1.2")}{ph(T+"girl-drawing.jpg","0.82 0.55 2.0")}{ph(T+"cuddly-bear.jpg","0.4 0.45 1.4")}{ph(T+"teepee.jpg","0.55 0.6 1.6","more2")}</div>
<div class="rvq"><div class="who"><i>ن</i><div><b>نورة المنصوري</b><small>أبوظبي · قبل 3 أيام</small></div>{stars()}</div>
<p>أجمل من الصور! الفرو ناعم جداً والتطريز متقن، وابنتي لا تنام بدونه. التغليف كان أنيقاً مع بطاقة بخط اليد.</p><div class="tagsr"><span>اللون: بحري</span><span>مشترٍ موثّق</span></div></div></div></div>

<div class="sec"><div class="shead"><div><h3>يكتمل معه</h3><div class="sub">هدية الميلاد كاملة ووفّر 10%</div></div></div>
<div class="gw">
<div class="gwi">{ph(T+"crib-mobile.jpg","0.6 0.4 1.4","gi")}<div class="gt"><b>معلّقة المهد «غيمة»</b><small>صوف محبوك يدوياً</small><span>229 <small>{CUR}</small></span></div><span class="ck2 on">{ic("check")}</span></div>
<div class="gwi">{ph(T+"bunny-knit.jpg","0.68 0.4 1.5","gi")}<div class="gt"><b>أرنب «زهر» من الكتّان</b><small>32 سم · قطن عضوي</small><span>149 <small>{CUR}</small></span></div><span class="ck2 on">{ic("check")}</span></div>
<div class="gwi">{ph(T+"gift-kraft.jpg","0.47 0.45 1.8","gi")}<div class="gt"><b>صندوق هدية مع بطاقة</b><small>كرافت وشريط وردي</small><span>مجاناً</span></div><span class="ck2"></span></div>
<div class="gwsum"><span>المجموع لـ 3 قطع <b>483 {CUR}</b></span><span class="ab">{ic("add_shopping_cart")}أضف المحدد</span></div></div></div>

<div class="sec"><div class="shead"><div><h3>قد يعجبك أيضاً</h3></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll prow">
{pcard("bear-mint.jpg","0.5 0.6 1.0","الدب «لؤلؤ» الكلاسيكي","فرو ناعم · 40 سم","139",age="من الولادة")}
{pcard("bear-bow.jpg","0.5 0.65 1.5","الدب «بندق» بالفيونكة","قطيفة بنية · 30 سم","119",tag="جديد",age=lt("1+")+" سنة")}
{pcard("snowman-plush.jpg","0.62 0.5 1.5","رجل الثلج «ثلّوج»","صوف محبوك · 28 سم","95",age=lt("3+")+" سنوات")}
</div></div>
<div style="height:24px"></div>
<div class="sticky"><div class="qty"><i>{ic("add")}</i><b>1</b><i>{ic("remove")}</i></div><div class="add"><span>{ic("shopping_bag")}أضف إلى السلة</span><em>159 {CUR}</em></div><div class="homeind"></div></div>
</div>'''


SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
