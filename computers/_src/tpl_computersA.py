from lib import STATUS, ic, ph, stars

FONT = "plex"
TITLE = "Nawah"
CUR = "ر.س"


def L(s):
    return f'<span class="ltr">{s}</span>'


CSS = r"""
:root{--bg:#F2F3F5;--surface:#FFFFFF;--sunk:#EBEDF1;--ink:#11141A;--ink2:#4A5161;--ink3:#6F7686;--line:#E1E4E9;
--acc:#2F5BEA;--accT:#2A52D8;--accSoft:#E6ECFE;--deep:#10131A;--deep2:#1A1E27;--tile:#E9ECF0;
--ok:#0F7A55;--okSoft:#DDF2E8;--sale:#C42A3D;--saleSoft:#FBE5E8;--star:#E0A100;--dot:#CDD2DA;
--tabbg:rgba(16,19,26,.9);--tabsolid:#1A1E27}
html.dark{--bg:#0B0D11;--surface:#14171D;--sunk:#1B1F26;--ink:#EDEFF3;--ink2:#B4BAC6;--ink3:#8C93A1;--line:#242931;
--acc:#3D66F0;--accT:#9DB4FF;--accSoft:#172041;--deep:#161A22;--deep2:#1F2430;--tile:#E7EAEE;
--ok:#55D3A4;--okSoft:#10291F;--sale:#FF8796;--saleSoft:#3A1820;--dot:#30353F;
--tabbg:rgba(30,34,43,.94);--tabsolid:#1E222B}
html.dark .tabbar{box-shadow:0 0 0 1px rgba(255,255,255,.07),0 14px 30px rgba(0,0,0,.55)}
body{font-family:'IBM Plex Sans Arabic',sans-serif}
.screen{padding-bottom:120px}
.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}

/* header */
.header{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.brandrow{display:flex;align-items:center;gap:10px}
.mark{width:42px;height:42px;border-radius:14px;background:var(--acc);display:grid;place-items:center;flex:0 0 auto}
.loc b{display:block;font-size:20px;font-weight:700;line-height:1.1;letter-spacing:-.01em}
.loc small{display:flex;align-items:center;gap:2px;font-size:11.5px;color:var(--ink2);margin-top:3px}
.loc small .ms{font-size:15px;color:var(--accT)}
.loc small .ms.dn{font-size:17px;color:var(--ink3)}
.hicons{display:flex;gap:8px}
.ibtn{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;position:relative;background:var(--surface);box-shadow:0 0 0 1px var(--line);color:var(--ink)}
.ibtn .ms{font-size:23px}
.ibtn .n{position:absolute;top:-4px;left:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10px;font-weight:600;display:grid;place-items:center;padding:0 5px;box-shadow:0 0 0 2px var(--bg)}
.srow{display:flex;gap:8px;margin:8px 16px 0}
.search{flex:1;height:50px;border-radius:16px;background:var(--surface);display:flex;align-items:center;padding:0 14px;gap:10px;box-shadow:0 0 0 1px var(--line)}
.search .ms{font-size:22px;color:var(--ink2)}
.search .t{flex:1;font-size:13px;color:var(--ink3)}
.search .ar{display:flex;align-items:center;padding-right:10px;border-right:1px solid var(--line);height:24px}
.search .ar .ms{font-size:20px;color:var(--accT)}
.filt{width:50px;height:50px;border-radius:16px;background:var(--acc);display:grid;place-items:center}
.filt .ms{color:#fff;font-size:22px}

/* category tiles */
.cats{margin-top:18px;gap:10px}
.cat{width:68px;text-align:center}
.cat .ic{width:68px;height:64px;border-radius:18px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:grid;place-items:center}
.cat .ic .ms{font-size:28px;color:var(--ink);font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 28}
.cat.on .ic{background:var(--acc);box-shadow:none}
.cat.on .ic .ms{color:#fff}
.cat span{display:block;font-size:11.5px;margin-top:7px;color:var(--ink2);white-space:nowrap}
.cat.on span{color:var(--ink);font-weight:600}

/* hero */
.hero{margin-top:20px;gap:10px}
.hcard{width:342px;height:216px;border-radius:24px;position:relative;overflow:hidden;background-color:#0b0c10}
.hcard .wash{position:absolute;inset:0;background:linear-gradient(270deg,rgba(8,10,16,.92) 0%,rgba(8,10,16,.7) 42%,rgba(8,10,16,0) 72%)}
.hcard .txt{position:absolute;right:20px;top:20px;bottom:18px;width:188px;display:flex;flex-direction:column;color:#fff}
.hcard .lab{font-size:11px;font-weight:500;color:#AFC2FF;display:flex;align-items:center;gap:5px}
.hcard .lab .ms{font-size:15px}
.hcard h2{font-size:20px;line-height:1.45;font-weight:700;margin-top:6px}
.hcard p{font-size:11.5px;color:#C9CEDA;margin-top:3px}
.hcard .cta{margin-top:auto;align-self:flex-start;height:38px;padding:0 15px 0 12px;border-radius:12px;background:var(--acc);color:#fff;display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600}
.hcard .cta .ms{font-size:17px}
.dots{display:flex;justify-content:center;gap:6px;margin-top:12px}
.dots i{width:6px;height:6px;border-radius:3px;background:var(--dot)}
.dots i.on{width:18px;background:var(--accT)}

/* sections */
.sec{margin-top:30px}
.shead{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:13px}
.shead h3{font-size:18px;font-weight:700;letter-spacing:-.01em}
.shead .sub{font-size:11.5px;color:var(--ink3);margin-top:3px}
.shead a{font-size:12px;color:var(--accT);font-weight:600;display:flex;align-items:center;gap:1px;white-space:nowrap}
.shead a .ms{font-size:18px}

/* builder */
.builder{margin:0 16px;border-radius:24px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:8px;display:flex;flex-direction:column}
.builder .bt{display:flex;gap:12px;align-items:stretch}
.builder .bi{width:120px;height:132px;border-radius:18px;flex:0 0 auto;background-color:var(--tile)}
.builder .bx{flex:1;padding:8px 4px 4px 4px;display:flex;flex-direction:column}
.builder .bx small{font-size:11px;color:var(--accT);font-weight:600;display:flex;align-items:center;gap:4px}
.builder .bx small .ms{font-size:15px}
.builder .bx b{font-size:16px;font-weight:700;line-height:1.45;margin-top:4px}
.builder .bx p{font-size:11.5px;color:var(--ink2);margin-top:3px;line-height:1.6}
.steps{display:grid;grid-template-columns:repeat(5,1fr);margin:16px 6px 4px;position:relative}
.steps:before{content:'';position:absolute;top:15px;right:10%;left:10%;height:2px;background:var(--line)}
.steps:after{content:'';position:absolute;top:15px;right:10%;width:40%;height:2px;background:var(--acc)}
.st{text-align:center;position:relative;z-index:1}
.st i{width:32px;height:32px;border-radius:11px;margin:0 auto;display:grid;place-items:center;background:var(--sunk);color:var(--ink3)}
.st i .ms{font-size:18px}
.st.done i{background:var(--acc);color:#fff}
.st.cur i{background:var(--surface);box-shadow:0 0 0 2px var(--acc);color:var(--accT)}
.st span{display:block;font-size:10.5px;color:var(--ink2);margin-top:6px}
.st.done span,.st.cur span{color:var(--ink);font-weight:600}
.builder .bf{display:flex;align-items:center;justify-content:space-between;margin:12px 6px 6px;padding-top:12px;border-top:1px solid var(--line)}
.builder .bf .t small{display:block;font-size:11px;color:var(--ink3)}
.builder .bf .t b{font-size:17px;font-weight:700}
.builder .bf .t b small{display:inline;font-size:11px;color:var(--ink2);font-weight:500}
.okpill{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--ok);background:var(--okSoft);padding:3px 8px;border-radius:8px;margin-top:6px}
.okpill .ms{font-size:14px}
.btn{height:44px;padding:0 16px;border-radius:14px;background:var(--acc);color:#fff;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;white-space:nowrap}
.btn .ms{font-size:19px}

/* deals */
.deal{margin:0 16px;background:var(--deep);border-radius:24px;padding:16px;color:#fff}
.deal .dh{display:flex;justify-content:space-between;align-items:center}
.deal .dh h3{font-size:17px;font-weight:700}
.deal .dh p{font-size:11.5px;color:#AEB4C2;margin-top:2px}
.cd{display:flex;align-items:center;gap:4px;direction:ltr}
.cd b{min-width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.1);color:#fff;display:grid;place-items:center;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.cd em{color:#7F8798;font-weight:600}
.dlist{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.ditem{display:flex;align-items:center;gap:12px;background:var(--deep2);border-radius:16px;padding:8px}
.ditem .di{width:72px;height:72px;border-radius:12px;background-color:#E9ECF0;flex:0 0 auto}
.ditem .dt{flex:1;min-width:0}
.ditem .dt b{display:block;font-size:13px;font-weight:600}
.ditem .dt small{display:block;font-size:11px;color:#9BA2B1;margin-top:1px}
.ditem .pr{font-size:14.5px;font-weight:700;margin-top:4px;display:flex;align-items:baseline;gap:6px}
.ditem .pr small{display:inline;font-size:10.5px;color:#B9BFCC;font-weight:500;margin:0}
.ditem .pr s{font-size:11px;color:#8A91A0;font-weight:400}
.stock{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:10px;color:#9BA2B1}
.stock i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.1);display:block;overflow:hidden}
.stock i em{display:block;height:100%;background:#7E9BFF;border-radius:2px}
.off{font-size:11px;font-weight:700;color:#fff;background:var(--sale);border-radius:8px;padding:3px 7px;direction:ltr;align-self:flex-start}
html.dark .off{color:#2A0D12}

/* product card */
.prow{gap:12px}
.pcard{width:172px;position:relative}
.pimg{height:150px;border-radius:20px;background-color:var(--tile);position:relative;overflow:hidden}
.fav{position:absolute;top:9px;left:9px;width:30px;height:30px;border-radius:10px;background:rgba(255,255,255,.92);display:grid;place-items:center}
.fav .ms{font-size:17px;color:#11141A}
.fav.on .ms{color:#C42A3D;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.tag{position:absolute;top:10px;right:10px;font-size:10px;font-weight:600;background:rgba(255,255,255,.94);color:#2A52D8;border-radius:7px;padding:3px 7px}
.tag.s{color:#fff;background:#C42A3D;direction:ltr}
.pname{font-size:13px;font-weight:600;margin-top:10px;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pspec{display:flex;gap:4px;margin-top:5px;flex-wrap:nowrap;overflow:hidden}
.pspec span{font-size:10px;color:var(--ink2);background:var(--sunk);padding:2px 6px;border-radius:6px;direction:ltr;white-space:nowrap}
.pmat{font-size:11px;color:var(--ink3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rate{display:flex;align-items:center;gap:3px;font-size:10.5px;color:var(--ink3);margin-top:5px}
.rate .ms{font-size:13px;color:var(--star)}
.rate b{color:var(--ink);font-weight:600}
.pfoot{display:flex;align-items:flex-end;justify-content:space-between;margin-top:7px}
.price{font-size:15px;font-weight:700;line-height:1.2}
.price small{font-size:10.5px;color:var(--ink2);font-weight:500}
.price s{display:block;font-size:11px;color:var(--ink3);font-weight:400}
.addb{width:34px;height:34px;border-radius:11px;background:var(--accSoft);display:grid;place-items:center;color:var(--accT);flex:0 0 auto}
.addb .ms{font-size:20px}

/* use tiles */
.uses{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.use{height:116px;border-radius:20px;position:relative;overflow:hidden;background-color:var(--tile)}
.use .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(8,10,16,.78) 0%,rgba(8,10,16,.2) 58%,rgba(8,10,16,0) 80%)}
.use .ut{position:absolute;right:12px;left:12px;bottom:11px;color:#fff;display:flex;align-items:flex-end;justify-content:space-between}
.use .ut b{display:block;font-size:14.5px;font-weight:600}
.use .ut small{display:block;font-size:10.5px;color:#D7DBE4;margin-top:1px}
.use .ut .ar{width:28px;height:28px;border-radius:10px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);display:grid;place-items:center}
.use .ut .ar .ms{font-size:17px}

/* gaming band */
.gz{margin:0 16px;border-radius:24px;background:var(--deep);padding:8px;color:#fff}
.gz .gi{height:176px;border-radius:18px;position:relative;overflow:hidden;background-color:#0c2333}
.gz .gi .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(6,12,20,.85) 0%,rgba(6,12,20,.35) 55%,rgba(6,12,20,0) 80%)}
.gz .gi .tx{position:absolute;right:16px;top:16px;bottom:14px;width:172px;display:flex;flex-direction:column}
.gz .gi .tx small{font-size:11px;color:#A9C1FF;display:flex;align-items:center;gap:4px;font-weight:500}
.gz .gi .tx small .ms{font-size:15px}
.gz .gi .tx b{font-size:18px;font-weight:700;line-height:1.45;margin-top:5px}
.gz .gi .tx p{font-size:11px;color:#C3C9D6;margin-top:2px}
.gz .gi .tx .cta{margin-top:auto;align-self:flex-start;height:34px;padding:0 12px;border-radius:11px;background:rgba(255,255,255,.14);display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600}
.gz .gi .tx .cta .ms{font-size:16px}
.gz .gl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
.gz .gp{background:var(--deep2);border-radius:16px;padding:6px 6px 9px}
.gz .gp i{display:block;height:74px;border-radius:12px;background-color:#E9ECF0}
.gz .gp b{display:block;font-size:11px;font-weight:600;margin-top:7px;line-height:1.45;padding:0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gz .gp span{display:block;font-size:12px;font-weight:700;margin-top:1px;padding:0 3px}
.gz .gp span small{font-size:9.5px;color:#AEB4C2;font-weight:500}

/* grid */
.grid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:18px 12px}
.grid .pcard{width:auto}
.grid .pimg{height:150px}

/* services */
.svc{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sv{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:12px;display:flex;gap:10px;align-items:flex-start}
.sv .ms{font-size:22px;color:var(--accT)}
.sv b{display:block;font-size:12.5px;font-weight:600;line-height:1.4}
.sv small{display:block;font-size:10.5px;color:var(--ink3);margin-top:2px;line-height:1.5}
.soon{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:500;color:var(--ink2);border:1px dashed var(--ink3);padding:2px 8px;border-radius:8px;white-space:nowrap;opacity:.9}
.soon .ms{font-size:13px}

/* review */
.review{margin:0 16px;background:var(--surface);border-radius:24px;padding:16px;box-shadow:0 0 0 1px var(--line)}
.review .rh{display:flex;align-items:center;gap:10px}
.review .rh i{width:36px;height:36px;border-radius:12px;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;font-size:14px;font-weight:700}
.review .rh b{display:block;font-size:13px;font-weight:600}
.review .rh small{display:block;font-size:10.5px;color:var(--ink3)}
.stars{display:flex;gap:0;color:var(--star)}
.stars .ms{font-size:15px}
.review .rh .stars{margin-right:auto}
.review q{display:block;font-size:13px;line-height:1.8;margin-top:10px;quotes:none}
.review .rp{display:flex;align-items:center;gap:10px;margin-top:12px;padding:8px;border-radius:14px;background:var(--sunk)}
.review .rp i{width:44px;height:44px;border-radius:10px;background-color:var(--tile);flex:0 0 auto}
.review .rp b{display:block;font-size:12px;font-weight:600}
.review .rp small{display:block;font-size:10.5px;color:var(--ink3)}
.review .rp .vf{margin-right:auto;font-size:10.5px;color:var(--ok);display:flex;align-items:center;gap:3px;font-weight:600}
.review .rp .vf .ms{font-size:14px}

/* tab bar */
.tabbar{position:absolute;left:16px;right:16px;bottom:28px;height:68px;border-radius:24px;background:var(--tabbg);backdrop-filter:blur(22px) saturate(1.4);box-shadow:0 14px 30px rgba(16,19,26,.25);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;padding:0 6px}
.tab{display:flex;flex-direction:column;align-items:center;gap:4px;color:#A3A9B6;position:relative;height:54px;justify-content:center}
.tab .ms{font-size:24px}
.tab span:not(.ms){font-size:10px}
.tab.on{color:#fff}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tab.on:before{content:'';position:absolute;inset:2px 6px;border-radius:16px;background:rgba(255,255,255,.12)}
.tab .bd{position:absolute;top:5px;left:50%;margin-left:-20px;min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10px;font-weight:600;display:grid;place-items:center;padding:0 5px;box-shadow:0 0 0 2px var(--tabsolid)}
.homeind{background:var(--ink)}

/* ---------- shared bits ---------- */
.topbar{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;gap:10px}
.topbar .tt{flex:1;min-width:0}
.topbar .tt b{display:block;font-size:18px;font-weight:700;line-height:1.2}
.topbar .tt small{display:block;font-size:11px;color:var(--ink3);margin-top:3px}
.topbar .grp{display:flex;gap:8px}
.chips{gap:8px;margin-top:6px}
.chip{height:36px;padding:0 14px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink2);white-space:nowrap}
.chip.on{background:var(--acc);color:#fff;box-shadow:none;font-weight:600}
.chip .ms{font-size:17px}
.chip small{font-size:10.5px;opacity:.8}

/* ---------- MENU ---------- */
.grab{width:40px;height:5px;border-radius:3px;background:var(--dot);margin:2px auto 8px}
.mhead{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:54px}
.mbrand{display:flex;align-items:center;gap:10px}
.mbrand b{display:block;font-size:21px;font-weight:700;line-height:1}
.mbrand small{display:block;font-size:9.5px;letter-spacing:.34em;color:var(--ink3);margin-top:6px;direction:ltr;text-align:right;font-weight:600}
.mquick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 16px 0}
.mq{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:16px;height:66px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--ink2);font-weight:500}
.mq .ms{font-size:22px;color:var(--accT)}
.mcat{margin-top:22px}
.mch{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:11px}
.mch .l{display:flex;align-items:center;gap:10px}
.mch .ico{width:36px;height:36px;border-radius:12px;background:var(--accSoft);display:grid;place-items:center;color:var(--accT)}
.mch .ico .ms{font-size:20px}
.mch b{display:block;font-size:15.5px;font-weight:700}
.mch small{display:block;font-size:10.5px;color:var(--ink3);margin-top:1px}
.mch a{font-size:11.5px;color:var(--accT);font-weight:600;display:flex;align-items:center}
.mch a .ms{font-size:17px}
.mrow{gap:10px}
.mc{width:116px}
.mc.all{width:104px}
.mc .im{height:120px;border-radius:18px;background-color:var(--tile);position:relative;overflow:hidden}
.mc .im .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(8,10,16,.8) 0%,rgba(8,10,16,.25) 52%,rgba(8,10,16,0) 72%)}
.mc .im b{position:absolute;right:10px;left:8px;bottom:9px;color:#fff;font-size:12.5px;font-weight:600;line-height:1.35}
.mc .im b small{display:block;font-size:10px;font-weight:400;color:#D9DDE6;margin-top:1px}
.mc.all .im{background:var(--acc);display:flex;flex-direction:column;justify-content:space-between;padding:12px;color:#fff}
.mc.all .im .ms{font-size:26px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.mc.all .im span.t{font-size:13px;font-weight:600;line-height:1.4}
.mc.all .im span.t small{display:block;font-size:10.5px;font-weight:400;color:#DCE4FF}
.mc.all .im .go{width:30px;height:30px;border-radius:10px;background:rgba(255,255,255,.18);display:grid;place-items:center;align-self:flex-start}
.mc.all .im .go .ms{font-size:18px}
.mfoot{margin:30px 16px 0;background:var(--surface);border-radius:22px;box-shadow:0 0 0 1px var(--line);padding:4px 14px}
.mli{display:flex;align-items:center;gap:12px;height:52px;border-bottom:1px solid var(--line)}
.mli:last-child{border-bottom:0}
.mli .ms.l{font-size:22px;color:var(--ink2)}
.mli span.t{flex:1;font-size:13.5px;font-weight:500}
.mli small{font-size:11.5px;color:var(--ink3)}
.mli .ms.c{font-size:18px;color:var(--ink3)}
.mli .pill2{font-size:11px;font-weight:600;color:var(--accT);background:var(--accSoft);padding:4px 9px;border-radius:8px}
.lang{display:flex;background:var(--sunk);border-radius:10px;padding:3px;gap:2px}
.lang i{font-size:11px;padding:5px 10px;border-radius:8px;color:var(--ink2)}
.lang i.on{background:var(--surface);color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.mhelp{margin:12px 16px 0;display:flex;gap:8px}
.mhelp div{flex:1;height:48px;border-radius:15px;background:var(--accSoft);color:var(--accT);display:flex;align-items:center;justify-content:center;gap:7px;font-size:12.5px;font-weight:600}
.mhelp .ms{font-size:20px}
.mver{text-align:center;font-size:10.5px;color:var(--ink3);margin-top:16px}

/* ---------- LISTING ---------- */
.fbar{display:flex;align-items:center;gap:8px;margin:14px 16px 0}
.fbtn{height:40px;padding:0 12px;border-radius:13px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;white-space:nowrap}
.fbtn .ms{font-size:19px}
.fbtn .c{min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10px;display:grid;place-items:center;padding:0 5px}
.fbtn.sort{flex:1;justify-content:space-between;font-weight:400;color:var(--ink2)}
.fbtn.sort b{color:var(--ink);font-weight:600}
.vt{display:flex;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:13px;padding:3px;height:40px}
.vt i{width:34px;display:grid;place-items:center;border-radius:10px;color:var(--ink3)}
.vt i.on{background:var(--accSoft);color:var(--accT)}
.vt .ms{font-size:19px}
.atags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 16px 0;align-items:center}
.atag{height:28px;padding:0 6px 0 10px;border-radius:9px;background:var(--accSoft);color:var(--accT);font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px}
.atag .ms{font-size:15px}
.aclear{font-size:11px;color:var(--ink3);text-decoration:underline;text-underline-offset:3px;margin-right:4px}
.rcount{margin:16px 16px 12px;font-size:11.5px;color:var(--ink3);display:flex;justify-content:space-between;align-items:center}
.rcount b{color:var(--ink);font-weight:600}
.rcount .cmp{display:flex;align-items:center;gap:4px;color:var(--accT);font-weight:600}
.rcount .cmp .ms{font-size:16px}
.cmpb{position:absolute;bottom:9px;right:9px;height:24px;padding:0 7px 0 8px;border-radius:8px;background:rgba(255,255,255,.94);color:#11141A;font-size:10px;font-weight:600;display:flex;align-items:center;gap:4px}
.cmpb i{width:12px;height:12px;border-radius:4px;border:1.4px solid #8C93A1}
.cmpb.on i{background:#2F5BEA;border-color:#2F5BEA}
.promo{grid-column:1/-1;height:156px;border-radius:22px;position:relative;overflow:hidden;background-color:#0B0D11}
.promo .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(8,10,16,.92) 0%,rgba(8,10,16,.6) 48%,rgba(8,10,16,0) 78%)}
.promo .pt{position:absolute;right:18px;top:18px;bottom:16px;width:205px;color:#fff;display:flex;flex-direction:column}
.promo .pt small{font-size:10.5px;color:#AFC2FF;display:flex;align-items:center;gap:4px;font-weight:500}
.promo .pt small .ms{font-size:14px}
.promo .pt b{font-size:16.5px;font-weight:700;line-height:1.45;margin-top:4px}
.promo .pt .cta2{margin-top:auto;align-self:flex-start;height:34px;padding:0 13px;border-radius:11px;background:var(--acc);display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600}
.promo .pt .cta2 .ms{font-size:16px}
.more{margin:26px 16px 0;text-align:center}
.more .prog{width:150px;height:4px;border-radius:2px;background:var(--line);margin:0 auto;overflow:hidden}
.more .prog i{display:block;height:100%;width:12%;background:var(--accT);border-radius:2px}
.more p{font-size:11px;color:var(--ink3);margin-top:8px}
.more .mb{margin:12px auto 0;height:46px;width:200px;border-radius:15px;box-shadow:0 0 0 1.3px var(--accT);color:var(--accT);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:600}
.more .mb .ms{font-size:19px}

/* ---------- PRODUCT ---------- */
.pscreen{padding-bottom:112px}
.gal{position:relative;margin:0 16px;height:330px;border-radius:26px;overflow:hidden;background-color:var(--tile)}
.gal .gtop{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:flex-start}
.gbtn{width:40px;height:40px;border-radius:14px;background:rgba(255,255,255,.94);display:grid;place-items:center;color:#11141A;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.gbtn .ms{font-size:21px}
.gbtn.on .ms{color:#C42A3D;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.gal .gdots{position:absolute;bottom:14px;left:0;right:0;display:flex;justify-content:center;gap:5px}
.gal .gdots i{width:6px;height:6px;border-radius:3px;background:rgba(17,20,26,.25)}
.gal .gdots i.on{width:18px;background:#11141A}
.gal .gcnt{position:absolute;bottom:12px;left:12px;height:26px;padding:0 9px;border-radius:9px;background:rgba(17,20,26,.66);color:#fff;font-size:10.5px;display:flex;align-items:center;direction:ltr}
.gal .g3d{position:absolute;bottom:12px;right:12px;height:30px;padding:0 10px;border-radius:10px;background:rgba(17,20,26,.72);color:#fff;font-size:11px;display:flex;align-items:center;gap:4px}
.gal .g3d .ms{font-size:16px}
.gtag{font-size:11px;font-weight:600;background:rgba(255,255,255,.94);color:#2A52D8;border-radius:9px;padding:5px 9px}
.thumbs{display:flex;gap:8px;margin:10px 16px 0}
.thumbs div{flex:1;height:60px;border-radius:14px;background-color:var(--tile);position:relative}
.thumbs div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--accT)}
.thumbs div.v:after{content:'';position:absolute;inset:0;border-radius:14px;background:rgba(17,20,26,.5)}
.thumbs div.v span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;z-index:1;font-size:12px;font-weight:600;direction:ltr}
.pinfo{padding:18px 16px 0}
.pinfo .brand{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--ink3)}
.pinfo .brand b{color:var(--accT);font-weight:600;display:flex;align-items:center;gap:4px}
.pinfo .brand .ms{font-size:15px}
.pinfo h1{font-size:22px;font-weight:700;line-height:1.4;margin-top:6px;letter-spacing:-.01em}
.pinfo .sub{font-size:12px;color:var(--ink2);margin-top:2px}
.prow2{display:flex;align-items:flex-end;justify-content:space-between;margin-top:14px}
.bigp{font-size:26px;font-weight:700;line-height:1}
.bigp small{font-size:12px;color:var(--ink2);font-weight:500}
.oldp{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:var(--ink3)}
.oldp .dc{font-size:11px;font-weight:700;color:var(--sale);background:var(--saleSoft);padding:3px 7px;border-radius:7px;direction:ltr}
.rbox{text-align:left}
.rbox .r1{display:flex;align-items:center;gap:4px;justify-content:flex-end;font-size:15px;font-weight:700}
.rbox .r1 .ms{font-size:18px;color:var(--star)}
.rbox small{display:block;font-size:11px;color:var(--ink3);margin-top:4px;text-decoration:underline;text-underline-offset:3px}
.payrow{display:flex;align-items:center;gap:8px;margin:14px 16px 0;padding:10px 12px;border-radius:15px;background:var(--surface);box-shadow:0 0 0 1px var(--line);font-size:11.5px;color:var(--ink2)}
.payrow .ms.l{font-size:19px;color:var(--ink3)}
.payrow span.t{flex:1}
.vsec{margin:20px 16px 0}
.vsec .vh{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.vsec .vh b{font-size:13.5px;font-weight:600}
.vsec .vh b span{color:var(--ink2);font-weight:400}
.vsec .vh a{font-size:11.5px;color:var(--accT);font-weight:600;display:flex;align-items:center;gap:3px}
.vsec .vh a .ms{font-size:16px}
.swatch{display:flex;gap:10px}
.sw2{display:flex;align-items:center;gap:8px;height:44px;padding:0 14px 0 10px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);font-size:12px}
.sw2 i{width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}
.sw2.on{box-shadow:0 0 0 1.6px var(--accT);font-weight:600}
.cfg{margin:20px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:16px}
.cfg h4,.blk h4{font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:space-between}
.cfg h4 small,.blk h4 small{font-size:11px;color:var(--ink3);font-weight:400}
.cg{margin-top:14px}
.cg .cl{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink2);margin-bottom:8px;font-weight:500}
.cg .cl .ms{font-size:17px;color:var(--accT)}
.opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.opt{height:54px;border-radius:14px;background:var(--bg);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12.5px;font-weight:600}
.opt small{font-size:10px;color:var(--ink3);font-weight:500;margin-top:2px}
.opt.on{background:var(--accSoft);box-shadow:0 0 0 1.6px var(--accT);color:var(--ink)}
.opt.on small{color:var(--accT)}
.cfgsum{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px dashed var(--line);font-size:11.5px;color:var(--ink2)}
.cfgsum b{font-size:15px;color:var(--ink);font-weight:700}
.kspec{margin:12px 16px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ks{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:16px;padding:11px 12px;display:flex;gap:10px;align-items:center}
.ks .ms{font-size:22px;color:var(--accT)}
.ks small{display:block;font-size:10px;color:var(--ink3)}
.ks b{display:block;font-size:12px;font-weight:600;margin-top:1px;line-height:1.4}
.blk{margin:12px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:16px}
.cmpt{margin-top:12px;display:grid;grid-template-columns:72px 1fr 1fr 1fr;font-size:11px}
.cmpt>div{padding:8px 4px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.4}
.cmpt>div.k{justify-content:flex-start;color:var(--ink3);text-align:right}
.cmpt>div.me{background:var(--accSoft);font-weight:600}
.cmpt .hd{flex-direction:column;border-bottom:0;padding-bottom:10px}
.cmpt .hd i{display:block;width:62px;height:46px;border-radius:10px;background-color:var(--tile)}
.cmpt .hd b{font-size:10.5px;font-weight:600;margin-top:6px}
.cmpt .hd.me{border-radius:14px 14px 0 0}
.cmpt>div.me.last{border-radius:0 0 14px 14px;border-bottom:0}
.cmpt>div.lastrow{border-bottom:0}
.cmpt .y{color:var(--ok);font-size:17px}
.wr{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.wo{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:15px;background:var(--bg);box-shadow:0 0 0 1px var(--line)}
.wo .rd{width:20px;height:20px;border-radius:50%;border:1.6px solid var(--ink3);flex:0 0 auto}
.wo.on{box-shadow:0 0 0 1.6px var(--accT);background:var(--accSoft)}
.wo.on .rd{border:6px solid var(--acc)}
.wo .wt{flex:1}
.wo b{display:block;font-size:12.5px;font-weight:600}
.wo small{display:block;font-size:10.5px;color:var(--ink3);margin-top:1px}
.wo span.p{font-size:12px;font-weight:600;white-space:nowrap}
.dlv{margin:12px 16px 0;border-radius:24px;background:var(--accSoft);padding:6px 14px}
.dl{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(47,91,234,.14)}
html.dark .dl{border-color:rgba(255,255,255,.07)}
.dl:last-child{border:0}
.dl .ms{font-size:22px;color:var(--accT)}
.dl b{display:block;font-size:12.5px;font-weight:600}
.dl small{display:block;font-size:11px;color:var(--ink2);margin-top:2px}
.acc{margin:12px 16px 0;background:var(--surface);border-radius:22px;box-shadow:0 0 0 1px var(--line);padding:0 16px}
.ac{border-bottom:1px solid var(--line);padding:15px 0}
.ac:last-child{border:0}
.ac .ah{display:flex;justify-content:space-between;align-items:center;font-size:13.5px;font-weight:600}
.ac .ah .ms{font-size:20px;color:var(--ink3)}
.ac p{font-size:12px;color:var(--ink2);line-height:1.85;margin-top:8px}
.spec{display:grid;grid-template-columns:96px 1fr;margin-top:10px;font-size:11.5px}
.spec>span,.spec>b{padding:7px 0;border-bottom:1px solid var(--line);line-height:1.5}
.spec>span{color:var(--ink3)}
.spec>b{font-weight:500}
.spec .e{border-bottom:0}
.rv{margin:0 16px;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:16px}
.rvtop{display:flex;gap:16px;align-items:center}
.rvbig{text-align:center;width:92px}
.rvbig b{font-size:38px;font-weight:700;line-height:1}
.rvbig .stars{justify-content:center;margin-top:6px}
.rvbig .stars .ms{font-size:14px}
.rvbig small{display:block;font-size:10.5px;color:var(--ink3);margin-top:4px}
.bars{flex:1;display:flex;flex-direction:column;gap:5px}
.bar{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--ink3)}
.bar i{flex:1;height:5px;border-radius:3px;background:var(--sunk);overflow:hidden;display:block}
.bar i em{display:block;height:100%;background:var(--accT);border-radius:3px}
.rvchips{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.rvchips span{font-size:10.5px;color:var(--ink2);background:var(--sunk);padding:4px 9px;border-radius:8px}
.rvchips span b{color:var(--accT);font-weight:600}
.rvph{display:flex;gap:8px;margin-top:12px}
.rvph div{flex:1;height:76px;border-radius:14px;background-color:var(--tile);position:relative}
.rvph div.more2:after{content:'+64';direction:ltr;position:absolute;inset:0;border-radius:14px;background:rgba(17,20,26,.55);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:600}
.rvq{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.rvq .who{display:flex;align-items:center;gap:8px}
.rvq .who i{width:30px;height:30px;border-radius:10px;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;font-size:12px;font-weight:700}
.rvq .who b{display:block;font-size:12px;font-weight:600}
.rvq .who small{display:block;font-size:10.5px;color:var(--ink3)}
.rvq .who .stars{margin-right:auto}
.rvq .who .stars .ms{font-size:13px}
.rvq p{font-size:12px;line-height:1.8;margin-top:8px}
.rvq .tagsr{display:flex;gap:6px;margin-top:8px}
.rvq .tagsr span{font-size:10.5px;color:var(--ink2);background:var(--sunk);padding:3px 8px;border-radius:7px}
.gw{margin:0 16px;background:var(--surface);border-radius:22px;box-shadow:0 0 0 1px var(--line);padding:6px 12px}
.gwi{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}
.gwi .gi{width:62px;height:62px;border-radius:14px;background-color:var(--tile);flex:0 0 auto}
.gwi .gt{flex:1;min-width:0}
.gwi .gt b{display:block;font-size:12.5px;font-weight:600}
.gwi .gt small{display:block;font-size:10.5px;color:var(--ink3);margin-top:1px}
.gwi .gt span{display:block;font-size:13px;font-weight:700;margin-top:3px}
.gwi .gt span small{display:inline;font-size:10px;color:var(--ink2);font-weight:500}
.gwi .ck2{width:26px;height:26px;border-radius:8px;border:1.5px solid var(--ink3);display:grid;place-items:center;flex:0 0 auto}
.gwi .ck2.on{background:var(--acc);border-color:var(--acc);color:#fff}
.gwi .ck2 .ms{font-size:17px}
.gwsum{display:flex;justify-content:space-between;align-items:center;padding:10px 0 6px;font-size:12px;color:var(--ink2)}
.gwsum b{font-size:14px;color:var(--ink);font-weight:700}
.gwsum .ab{height:36px;padding:0 12px;border-radius:11px;background:var(--accSoft);color:var(--accT);font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:5px}
.gwsum .ab .ms{font-size:17px}
.sticky{position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:var(--surface);box-shadow:0 -1px 0 var(--line),0 -12px 30px rgba(0,0,0,.06);display:flex;align-items:center;gap:10px}
html.dark .sticky{box-shadow:0 -1px 0 var(--line),0 -12px 30px rgba(0,0,0,.45)}
.sticky .cbtn{width:52px;height:52px;border-radius:16px;background:var(--bg);box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;color:var(--ink2)}
.sticky .cbtn .ms{font-size:22px}
.sticky .add{flex:1;height:52px;border-radius:16px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 18px;font-size:14px;font-weight:600}
.sticky .add span{display:flex;align-items:center;gap:7px}
.sticky .add .ms{font-size:20px}
.sticky .add em{font-size:13px;font-weight:500;color:#DCE4FF}
"""

CORE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4z"/><path d="M12 8.2 15.3 10.1v3.8L12 15.8 8.7 13.9v-3.8z" fill="#fff"/></svg>'


def pcard(img, f, name, specs=None, mat=None, price="", old=None, tag=None, fav=False, rate=None, cnt=None, cmp=None):
    t = ''
    if tag:
        t = f'<span class="tag s">{tag}</span>' if tag.startswith('-') else f'<span class="tag">{tag}</span>'
    c = ''
    if cmp is not None:
        c = f'<span class="cmpb{" on" if cmp else ""}"><i></i>قارن</span>'
    sp = ''
    if specs:
        sp = '<div class="pspec">' + ''.join(f'<span>{s}</span>' for s in specs) + '</div>'
    if mat:
        sp += f'<div class="pmat">{mat}</div>'
    r = f'<div class="rate">{ic("star","fill")}<b>{rate}</b>' + (f' ({cnt})' if cnt else '') + '</div>' if rate else ''
    pr = f'<div class="price">{price} <small>{CUR}</small>' + (f'<s>{old} {CUR}</s>' if old else '') + '</div>'
    return f'''<div class="pcard">{ph(img, f, "pimg", t + f'<div class="fav{" on" if fav else ""}">{ic("favorite")}</div>' + c)}
<div class="pname">{name}</div>{sp}{r}
<div class="pfoot">{pr}<div class="addb">{ic("add_shopping_cart")}</div></div></div>'''


def tabbar(active=0):
    tabs = [("home", "الرئيسية"), ("grid_view", "الأقسام"), ("shopping_cart", "السلة"), ("package_2", "طلباتي"), ("person", "حسابي")]
    out = ''
    for i, (n, l) in enumerate(tabs):
        bd = '<i class="bd">2</i>' if n == 'shopping_cart' else ''
        out += f'<div class="tab{" on" if i == active else ""}">{ic(n)}<span>{l}</span>{bd}</div>'
    return f'<div class="tabbar">{out}</div><div class="homeind"></div>'


# ---------------- HOME ----------------
def home():
    cats = [("laptop_mac", "لابتوبات", True), ("host", "أجهزة PC", False), ("monitor", "شاشات", False), ("memory", "القطع", False),
            ("keyboard", "ملحقات", False), ("sports_esports", "الألعاب", False), ("headset_mic", "صوتيات", False), ("router", "شبكات", False)]
    ct = ''.join(f'<div class="cat{" on" if on else ""}"><div class="ic">{ic(i)}</div><span>{n}</span></div>' for i, n, on in cats)
    hero = ph("c/hero-glow.jpg", "0 0.5 1", "hcard", f'''<div class="wash"></div><div class="txt"><span class="lab">{ic("bolt","fill")}إطلاق حصري</span>
<h2>أفق 14 الجديد<br>نحافة بأداء محطة عمل</h2><p>معالج N9 · بطارية حتى 18 ساعة</p><span class="cta">اطلبه الآن{ic("arrow_back")}</span></div>''')
    hero2 = ph("c/setup-purple.jpg", "0.6 0.5 1.1", "hcard", '<div class="wash"></div>')
    deals = [
        ("c/ram-studio.jpg", "0.68 0.55 1.25", "ذاكرة «سرعة» 32GB", f"طقم {L('2×16GB')} · {L('6000MHz')}", "549", "720", "-24%", 72),
        ("c/ssd-kit.jpg", "0.68 0.5 1.5", "وحدة تخزين خارجية 2TB", "ألمنيوم · نقل حتى 1050MB/ث", "699", "899", "-22%", 48),
        ("c/kb-black.jpg", "0.6 0.62 1.4", "لوحة مفاتيح «هدوء» اللاسلكية", "أزرار منخفضة · إضاءة خلفية", "389", "460", "-15%", 85),
    ]
    dl = ''.join(f'''<div class="ditem">{ph(a, b, "di")}<div class="dt"><b>{n}</b><small>{d}</small><div class="pr">{p} <small>{CUR}</small><s>{o}</s></div>
<div class="stock"><i><em style="width:{s}%"></em></i>بيع {s}%</div></div><span class="off">{off}</span></div>''' for a, b, n, d, p, o, off, s in deals)
    laps = ''.join([
        pcard("c/lap-plant.jpg", "0.5 0.55 1.2", "أفق 14 إير", ["16GB", "512GB", "14\""], price="4,899", tag="جديد", rate="4.8", cnt="312"),
        pcard("c/lap-chart.jpg", "0.42 0.5 1.15", "أفق 16 برو", ["32GB", "1TB", "165Hz"], price="7,499", old="8,299", tag="-10%", fav=True, rate="4.9", cnt="208"),
        pcard("c/lap-edge.jpg", "0.45 0.6 1.1", "مِحور 15 للأعمال", ["16GB", "1TB", "OLED"], price="5,650", rate="4.7", cnt="96"),
    ])
    uses = [("c/pad-duo.jpg", "0.5 0.55 1.1", "الألعاب", "تجميعات ولابتوبات سريعة"), ("c/lap-blue.jpg", "0.6 0.45 1.15", "صناعة المحتوى", "شاشات دقيقة الألوان"),
            ("c/lap-bw.jpg", "0.72 0.6 1.3", "العمل والدراسة", "خفيفة وبطارية طويلة"), ("c/mic-studio.jpg", "0.5 0.4 1.25", "البث المباشر", "مايكات وكاميرات وإضاءة")]
    ut = ''.join(f'<div class="use" data-src="img/{a}" data-f="{b}"><div class="sc"></div><div class="ut"><div><b>{n}</b><small>{s}</small></div><span class="ar">{ic("arrow_back")}</span></div></div>' for a, b, n, s in uses)
    gp = [("c/kb-rgb.jpg", "0.5 0.55 1.2", "كيبورد «طيف» RGB", "459"), ("c/hp-white.jpg", "0.5 0.55 1.7", "سماعة «صدى» لاسلكية", "529"), ("c/pad-white.jpg", "0.5 0.4 2.0", "يد تحكم «مدار» برو", "289")]
    gps = ''.join(f'<div class="gp"><i data-src="img/{a}" data-f="{b}"></i><b>{n}</b><span>{p} <small>{CUR}</small></span></div>' for a, b, n, p in gp)
    comps = ''.join([
        pcard("c/socket-gold.jpg", "0.45 0.42 1.3", "معالج N7 بـ 12 نواة", ["5.4GHz", "AM-X"], price="1,690", rate="4.9", cnt="140", tag="الأكثر طلباً"),
        pcard("c/heatsink-purple.jpg", "0.5 0.5 1.1", "كرت رسوميات GX 470", ["12GB", "PCIe 4.0"], price="2,890", old="3,250", tag="-11%", rate="4.8", cnt="87"),
        pcard("c/cooler.jpg", "0.38 0.5 1.15", "مبرّد هوائي «جليد» برو", ["120mm", "250W TDP"], price="349", rate="4.7", cnt="64"),
        pcard("c/ram-dark.jpg", "0.62 0.6 1.2", "ذاكرة لابتوب 16GB", ["DDR5", "5600MHz"], price="279", rate="4.8", cnt="190", fav=True),
    ])
    return f'''<div class="screen">{STATUS}
<div class="header"><div class="brandrow"><div class="mark">{CORE}</div><div class="loc"><b>نَواة</b><small>{ic("location_on","fill")}التوصيل إلى جدة{ic("expand_more","dn")}</small></div></div>
<div class="hicons"><div class="ibtn">{ic("notifications")}<i class="n">3</i></div><div class="ibtn">{ic("menu")}</div></div></div>
<div class="srow"><div class="search">{ic("search")}<div class="t">ابحث عن لابتوب، كرت شاشة، شاشة…</div><div class="ar">{ic("barcode_scanner")}</div></div><div class="filt">{ic("tune")}</div></div>
<div class="hscroll cats">{ct}</div>
<div class="hscroll hero">{hero}{hero2}</div>
<div class="dots"><i class="on"></i><i></i><i></i><i></i></div>

<div class="sec"><div class="shead"><div><h3>ابنِ جهازك بنفسك</h3><div class="sub">نتحقق من توافق كل قطعة تلقائياً</div></div><a>كل التجميعات{ic("chevron_left")}</a></div>
<div class="builder"><div class="bt">{ph("c/mb-cpu.jpg","0.38 0.5 1.5","bi")}<div class="bx"><small>{ic("construction")}مُجمِّع نَواة</small><b>تجميعة ألعاب 1440p</b><p>اخترت المعالج واللوحة الأم، بقيت 3 خطوات لإكمال جهازك.</p><span class="okpill">{ic("verified","fill")}متوافق 100%</span></div></div>
<div class="steps"><div class="st done"><i>{ic("check")}</i><span>المعالج</span></div><div class="st done"><i>{ic("check")}</i><span>اللوحة</span></div><div class="st cur"><i>{ic("videogame_asset")}</i><span>الرسوميات</span></div><div class="st"><i>{ic("memory_alt")}</i><span>الذاكرة</span></div><div class="st"><i>{ic("hard_drive")}</i><span>التخزين</span></div></div>
<div class="bf"><div class="t"><small>التكلفة حتى الآن</small><b>2,740 <small>{CUR}</small></b></div><span class="btn">أكمل التجميع{ic("arrow_back")}</span></div></div></div>

<div class="sec"><div class="deal"><div class="dh"><div><h3>صفقات الساعة</h3><p>كميات محدودة · تتجدد كل 6 ساعات</p></div><div class="cd"><b>02</b><em>:</em><b>47</b><em>:</em><b>19</b></div></div><div class="dlist">{dl}</div></div></div>

<div class="sec"><div class="shead"><div><h3>لابتوبات مختارة</h3><div class="sub">الأعلى تقييماً هذا الشهر</div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll prow">{laps}</div></div>

<div class="sec"><div class="shead"><div><h3>تسوّق حسب الاستخدام</h3><div class="sub">أجهزة منتقاة لطريقة عملك ولعبك</div></div></div><div class="uses">{ut}</div></div>

<div class="sec"><div class="gz">{ph("c/zone-pad.jpg","0 0.6 1","gi",f'<div class="sc"></div><div class="tx"><small>{ic("sports_esports","fill")}منطقة اللاعبين</small><b>جهّز ساحتك<br>بأقل زمن استجابة</b><p>ملحقات بتردد 8000Hz وشحن سريع</p><span class="cta">تسوّق الآن{ic("arrow_back")}</span></div>')}
<div class="gl">{gps}</div></div></div>

<div class="sec"><div class="shead"><div><h3>قطع التجميع الأكثر طلباً</h3><div class="sub">أصلية بضمان الوكيل</div></div><a>كل القطع{ic("chevron_left")}</a></div><div class="grid">{comps}</div></div>

<div class="sec"><div class="shead"><div><h3>خدمات نَواة</h3></div></div><div class="svc">
<div class="sv">{ic("verified_user")}<div><b>ضمان معتمد حتى 3 سنوات</b><small>صيانة لدى مراكزنا في 6 مدن</small></div></div>
<div class="sv">{ic("build")}<div><b>تجميع وفحص مجاني</b><small>اختبار حراري 24 ساعة قبل الشحن</small></div></div>
<div class="sv">{ic("local_shipping")}<div><b>توصيل خلال 24 ساعة</b><small>للرياض وجدة والدمام</small></div></div>
<div class="sv">{ic("credit_card")}<div><b>الدفع المرن</b><small style="margin-top:5px"><span class="soon">{ic("schedule")}التقسيط قريبًا</span></small></div></div></div></div>

<div class="sec"><div class="shead"><div><h3>من تجارب عملائنا</h3></div><a><span class="ltr">4.8</span> · 18 ألف تقييم{ic("chevron_left")}</a></div>
<div class="review"><div class="rh"><i>ف</i><div><b>فيصل القحطاني</b><small>الرياض · قبل أسبوع</small></div>{stars()}</div>
<q>طلبت تجميعة كاملة وتواصلوا معي قبل الشحن لتأكيد القطع. وصل الجهاز مرتّب الكابلات ومختبراً، والأداء أعلى مما توقعت.</q>
<div class="rp"><i data-src="img/c/setup-purple.jpg" data-f="0.55 0.5 1.6"></i><div><b>تجميعة «مدار» 1440p</b><small>ذاكرة 32GB · GX 470</small></div><span class="vf">{ic("verified","fill")}مشترٍ موثّق</span></div></div></div>
{tabbar(0)}
</div>'''


# ---------------- MENU ----------------
MENU = [
    ("laptop_mac", "اللابتوبات", "1,260 منتجاً", [
        ("lap-glow.jpg", "0.28 0.55 1.6", "لابتوبات ألعاب", "214"),
        ("lap-plant.jpg", "0.55 0.55 1.3", "نحيفة وخفيفة", "386"),
        ("lap-chart.jpg", "0.42 0.5 1.3", "للأعمال", "301"),
        ("lap-code.jpg", "0.6 0.5 1.4", "محطات عمل", "92"),
        ("lap-top.jpg", "0.4 0.55 1.3", "للطلاب", "267")]),
    ("host", "أجهزة مكتبية وتجميعات", "340 منتجاً", [
        ("setup-purple.jpg", "0.6 0.5 1.3", "تجميعات ألعاب", "118"),
        ("desk-city.jpg", "0.72 0.75 1.6", "محطات إبداع", "64"),
        ("desk-coder.jpg", "0.6 0.6 1.3", "أجهزة مكتبية", "102"),
        ("mb-board.jpg", "0.5 0.5 1.2", "أجهزة مصغّرة", "56")]),
    ("monitor", "الشاشات", "410 منتجات", [
        ("setup-purple.jpg", "0.6 0.38 2.4", "شاشات ألعاب", "146"),
        ("monitor-studio.jpg", "0.5 0.4 1.5", "احترافية للتصميم", "72"),
        ("desk-terrarium.jpg", "0.3 0.4 1.6", "شاشات مكتبية", "121"),
        ("desk-city.jpg", "0.78 0.82 2.6", "منحنية وعريضة", "71")]),
    ("memory", "القطع والمكونات", "1,980 منتجاً", [
        ("socket-gold.jpg", "0.45 0.42 1.4", "المعالجات", "164"),
        ("heatsink-purple.jpg", "0.5 0.5 1.2", "كروت الشاشة", "212"),
        ("ram-studio.jpg", "0.7 0.55 1.4", "الذاكرة RAM", "305"),
        ("ssd-kit.jpg", "0.68 0.5 1.6", "وحدات التخزين", "418"),
        ("cooler.jpg", "0.38 0.5 1.3", "التبريد", "190")]),
    ("keyboard", "الكيبورد والماوس", "860 منتجاً", [
        ("kb-rgb.jpg", "0.5 0.55 1.3", "كيبورد ميكانيكي", "248"),
        ("kb-black.jpg", "0.6 0.62 1.5", "كيبورد لاسلكي", "173"),
        ("desk-mouse.jpg", "0.8 0.78 2.6", "ماوس", "296"),
        ("kb-keys.jpg", "0.5 0.5 1.2", "أغطية أزرار", "64")]),
    ("sports_esports", "ألعاب الفيديو", "720 منتجاً", [
        ("pad-blue.jpg", "0.5 0.66 1.5", "أذرع التحكم", "188"),
        ("arcade.jpg", "0.35 0.45 1.2", "أذرع آركيد", "41"),
        ("pad-duo.jpg", "0.5 0.55 1.2", "أجهزة وألعاب", "356"),
        ("pad-buttons.jpg", "0.5 0.5 1.2", "ملحقات اللاعبين", "135")]),
    ("headset_mic", "السماعات والبث", "530 منتجاً", [
        ("hp-white.jpg", "0.5 0.55 1.9", "سماعات ألعاب", "164"),
        ("hp-dark.jpg", "0.55 0.5 1.2", "سماعات استوديو", "88"),
        ("mic-studio.jpg", "0.5 0.4 1.3", "مايكروفونات", "97"),
        ("mic-dark.jpg", "0.84 0.5 1.6", "معدات البث", "52")]),
    ("chair_alt", "الكراسي والمكاتب", "190 منتجاً", [
        ("chair-mesh.jpg", "0.85 0.78 2.2", "كراسي ألعاب", "74"),
        ("chair-white.jpg", "0.4 0.6 1.1", "كراسي مكتبية", "61"),
        ("desk-terrarium.jpg", "0.5 0.75 1.3", "مكاتب", "55")]),
    ("router", "الشبكات", "280 منتجاً", [
        ("eth-yellow.jpg", "0.65 0.6 1.3", "كابلات الشبكة", "96"),
        ("server.jpg", "0.5 0.5 1.4", "مقوّيات ومحوّلات", "84"),
        ("usb-kit.jpg", "0.55 0.6 1.4", "محوّلات USB", "63"),
        ("usb-ports.jpg", "0.7 0.5 1.2", "موزّعات", "37")]),
]


SHORT = {"أجهزة مكتبية وتجميعات": "كل الأجهزة المكتبية", "القطع والمكونات": "كل القطع", "الكيبورد والماوس": "كل الملحقات",
         "ألعاب الفيديو": "كل الألعاب", "السماعات والبث": "كل الصوتيات", "الكراسي والمكاتب": "كل الكراسي", "اللابتوبات": "كل اللابتوبات",
         "الشاشات": "كل الشاشات", "الشبكات": "كل الشبكات"}


def menu():
    rows = ''
    for icn, name, cnt, subs in MENU:
        short = SHORT.get(name, name)
        cards = f'<div class="mc all"><div class="im">{ic(icn)}<span class="t">{short}<small>{cnt}</small></span><span class="go">{ic("arrow_back")}</span></div></div>'
        for img, f, n, c in subs:
            cards += f'<div class="mc">{ph("c/" + img, f, "im", f"<div class=sc></div><b>{n}<small>{c} منتجاً</small></b>")}</div>'
        rows += f'''<div class="mcat"><div class="mch"><div class="l"><span class="ico">{ic(icn)}</span><div><b>{name}</b><small>{cnt} · {len(subs)} أقسام فرعية</small></div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll mrow">{cards}</div></div>'''
    return f'''<div class="screen" style="padding-bottom:40px">{STATUS}
<div class="grab"></div>
<div class="mhead"><div class="mbrand"><div class="mark">{CORE}</div><div><b>نَواة</b><small>NAWAH</small></div></div>
<div class="ibtn">{ic("close")}</div></div>
<div class="srow"><div class="search">{ic("search")}<div class="t">ابحث في كل الأقسام…</div><div class="ar">{ic("barcode_scanner")}</div></div></div>
<div class="mquick"><div class="mq">{ic("new_releases")}وصل حديثاً</div><div class="mq">{ic("percent")}العروض</div><div class="mq">{ic("construction")}ابنِ جهازك</div><div class="mq">{ic("compare_arrows")}المقارنة</div></div>
{rows}
<div class="mfoot">
<div class="mli">{ic("person","l")}<span class="t">حسابي</span><small>عبدالله الغامدي</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("package_2","l")}<span class="t">طلباتي</span><span class="pill2">طلب قيد التجميع</span>{ic("chevron_left","c")}</div>
<div class="mli">{ic("favorite","l")}<span class="t">المفضلة</span><small>9 منتجات</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("language","l")}<span class="t">اللغة</span><div class="lang"><i class="on">العربية</i><i>English</i></div></div>
<div class="mli">{ic("support_agent","l")}<span class="t">تواصل معنا</span><small>دعم فني يومياً 9ص – 12م</small>{ic("chevron_left","c")}</div>
</div>
<div class="mhelp"><div>{ic("chat")}محادثة فورية</div><div>{ic("call")}اتصل بنا</div></div>
<div class="mver">نَواة · الإصدار 2.4</div>
<div class="homeind"></div>
</div>'''


# ---------------- LISTING ----------------
def listing():
    P = [
        ("c/lap-chart.jpg", "0.42 0.5 1.15", "أفق 16 برو", ["32GB", "1TB", "165Hz"], "7,499", "8,299", "-10%", True, "4.9", "208", True),
        ("c/lap-glow.jpg", "0.3 0.56 1.5", "نبض 17 للألعاب", ["32GB", "2TB", "240Hz"], "9,850", None, "جديد", False, "4.8", "64", False),
        ("c/lap-plant.jpg", "0.5 0.55 1.2", "أفق 14 إير", ["16GB", "512GB", "OLED"], "4,899", None, None, False, "4.8", "312", False),
        ("c/lap-edge.jpg", "0.45 0.6 1.1", "مِحور 15 للأعمال", ["16GB", "1TB", "120Hz"], "5,650", "6,100", "-7%", False, "4.7", "96", False),
        ("c/lap-wood.jpg", "0.58 0.4 1.25", "أفق 16 ستوديو", ["64GB", "2TB", "Mini-LED"], "11,990", None, "حصري", False, "5.0", "41", True),
        ("c/lap-code.jpg", "0.52 0.55 1.3", "مِحور 14 للمطورين", ["32GB", "1TB", "2.8K"], "6,390", None, None, True, "4.8", "77", False),
        ("c/lap-top.jpg", "0.4 0.55 1.2", "أفق 13 للطلاب", ["16GB", "512GB", "13\""], "3,690", "3,990", "-8%", False, "4.6", "420", False),
        ("c/lap-glass.jpg", "0.66 0.5 1.15", "نبض 15 لايت", ["16GB", "1TB", "165Hz"], "5,290", None, "الأكثر مبيعاً", False, "4.7", "233", False),
    ]
    cards = [pcard(a, b, c, specs=d, price=e, old=f, tag=g, fav=h, rate=i, cnt=j, cmp=k) for (a, b, c, d, e, f, g, h, i, j, k) in P]
    promo = f'''<div class="promo" data-src="img/c/lap-desk-dark.jpg" data-f="0.2 0.5 1.1"><div class="sc"></div><div class="pt"><small>{ic("compare_arrows")}غير متأكد من اختيارك؟</small><b>قارن حتى 3 لابتوبات<br>جنباً إلى جنب</b><span class="cta2">ابدأ المقارنة{ic("arrow_back")}</span></div></div>'''
    grid = ''.join(cards[:4]) + promo + ''.join(cards[4:])
    return f'''<div class="screen">{STATUS}
<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div class="tt"><b>اللابتوبات</b><small>1,260 منتجاً · توصيل مجاني فوق 300 {CUR}</small></div><div class="grp"><div class="ibtn">{ic("search")}</div><div class="ibtn">{ic("shopping_cart")}<i class="n">2</i></div></div></div>
<div class="hscroll chips"><div class="chip">الكل</div><div class="chip on">{ic("bolt")}أداء عالٍ <small>214</small></div><div class="chip">نحيفة وخفيفة <small>386</small></div><div class="chip">للأعمال</div><div class="chip">محطات عمل</div><div class="chip">للطلاب</div></div>
<div class="fbar"><div class="fbtn">{ic("tune")}تصفية<span class="c">3</span></div><div class="fbtn sort"><span>ترتيب: <b>الأكثر مبيعاً</b></span>{ic("expand_more")}</div><div class="vt"><i class="on">{ic("grid_view")}</i><i>{ic("view_agenda")}</i></div></div>
<div class="atags"><span class="atag">ذاكرة {L("32GB")} فأكثر{ic("close")}</span><span class="atag">شاشة {L("165Hz")} فأكثر{ic("close")}</span><span class="atag">من 5,000 إلى 12,000 {CUR}{ic("close")}</span><span class="aclear">مسح الكل</span></div>
<div class="rcount"><span><b>214</b> منتجاً</span><span class="cmp">{ic("compare_arrows")}قارن (2)</span></div>
<div class="lgrid grid">{grid}</div>
<div class="more"><div class="prog"><i></i></div><p>عرضت 8 من 214 منتجاً</p><div class="mb">عرض المزيد{ic("expand_more")}</div></div>
{tabbar(1)}
</div>'''


# ---------------- PRODUCT ----------------
def product():
    main = "c/lap-chart.jpg"
    return f'''<div class="screen pscreen">{STATUS}
<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div class="tt"></div><div class="grp"><div class="ibtn">{ic("compare_arrows")}</div><div class="ibtn">{ic("ios_share")}</div><div class="ibtn">{ic("shopping_cart")}<i class="n">2</i></div></div></div>
{ph(main, "0.45 0.52 1.0", "gal", f'<div class="gtop"><span class="gtag">الأعلى تقييماً</span><div class="gbtn on">{ic("favorite")}</div></div><span class="g3d">{ic("360")}عرض 360°</span><span class="gcnt">1 / 7</span><div class="gdots"><i class="on"></i><i></i><i></i><i></i><i></i><i></i><i></i></div>')}
<div class="thumbs">{ph(main,"0.45 0.52 1.0","on")}{ph("c/lap-plant.jpg","0.6 0.55 1.3")}{ph("c/lap-edge.jpg","0.35 0.6 1.3")}{ph("c/lap-wood.jpg","0.58 0.3 1.6")}{ph("c/kb-backlit.jpg","0.5 0.5 1.2","v",'<span>+3</span>')}</div>
<div class="pinfo">
<div class="brand"><b>{ic("verified","fill")}نَواة · سلسلة أفق</b><span>رمز المنتج: {L("NW-A16P")}</span></div>
<h1>لابتوب أفق 16 برو</h1>
<div class="sub">معالج N9 بـ 16 نواة · شاشة 16 بوصة {L("QHD+ 165Hz")}</div>
<div class="prow2"><div><div class="bigp">7,499 <small>{CUR}</small></div><div class="oldp"><s>8,299 {CUR}</s><span class="dc">-10%</span><span>شامل الضريبة</span></div></div>
<div class="rbox"><div class="r1">4.9{ic("star","fill")}</div><small>208 تقييمات</small></div></div>
</div>
<div class="payrow">{ic("credit_card","l")}<span class="t">مدى · البطاقات الائتمانية · عند الاستلام</span><span class="soon">{ic("schedule")}التقسيط قريبًا</span></div>

<div class="vsec"><div class="vh"><b>اللون: <span>فضي قمري</span></b></div>
<div class="swatch"><div class="sw2 on"><i style="background:linear-gradient(135deg,#E9EBEE,#BFC4CB)"></i>فضي قمري</div><div class="sw2"><i style="background:linear-gradient(135deg,#5A5F68,#2E3238)"></i>رمادي جرافيت</div></div></div>

<div class="cfg"><h4>خصّص جهازك<small>يُجمّع ويُختبر في 48 ساعة</small></h4>
<div class="cg"><div class="cl">{ic("memory_alt")}الذاكرة العشوائية</div><div class="opts"><div class="opt">16GB<small>{L("−500")} {CUR}</small></div><div class="opt on">32GB<small>مُختار</small></div><div class="opt">64GB<small>{L("+1,100")} {CUR}</small></div></div></div>
<div class="cg"><div class="cl">{ic("hard_drive")}التخزين {L("NVMe SSD")}</div><div class="opts"><div class="opt">512GB<small>{L("−300")} {CUR}</small></div><div class="opt on">1TB<small>مُختار</small></div><div class="opt">2TB<small>{L("+650")} {CUR}</small></div></div></div>
<div class="cg"><div class="cl">{ic("videogame_asset")}كرت الشاشة</div><div class="opts"><div class="opt">مدمج<small>{L("−1,400")} {CUR}</small></div><div class="opt on">{L("GX 460 · 8GB")}<small>مُختار</small></div><div class="opt">{L("GX 480 · 12GB")}<small>{L("+1,900")} {CUR}</small></div></div></div>
<div class="cfgsum"><span>الإعداد: {L("32GB · 1TB · GX 460")}</span><b>7,499 {CUR}</b></div></div>

<div class="kspec">
<div class="ks">{ic("developer_board")}<div><small>المعالج N9</small><b>16 نواة<br>حتى {L("5.2GHz")}</b></div></div>
<div class="ks">{ic("desktop_windows")}<div><small>الشاشة</small><b>16 بوصة · {L("165Hz")}<br>دقة {L("2560×1600")}</b></div></div>
<div class="ks">{ic("battery_full")}<div><small>البطارية</small><b>{L("99Wh")}<br>حتى 14 ساعة</b></div></div>
<div class="ks">{ic("scale")}<div><small>الوزن والسماكة</small><b>1.9 كجم<br>16.8 ملم</b></div></div></div>

<div class="blk"><h4>قارن مع المشابه<small>اختيارك مظلل</small></h4>
<div class="cmpt">
<div class="k hd"></div><div class="hd me"><i data-src="img/{main}" data-f="0.45 0.52 1.3"></i><b>أفق 16 برو</b></div><div class="hd"><i data-src="img/c/lap-plant.jpg" data-f="0.5 0.55 1.4"></i><b>أفق 14 إير</b></div><div class="hd"><i data-src="img/c/lap-glow.jpg" data-f="0.3 0.56 1.8"></i><b>نبض 17</b></div>
<div class="k">السعر</div><div class="me">7,499</div><div>4,899</div><div>9,850</div>
<div class="k">الرسوميات</div><div class="me">{L("8GB")}</div><div>مدمج</div><div>{L("12GB")}</div>
<div class="k">الشاشة</div><div class="me">{L("16\" 165Hz")}</div><div>{L("14\" OLED")}</div><div>{L("17\" 240Hz")}</div>
<div class="k">البطارية</div><div class="me">14 ساعة</div><div>18 ساعة</div><div>8 ساعات</div>
<div class="k lastrow">الوزن</div><div class="me last">1.9 كجم</div><div class="lastrow">1.2 كجم</div><div class="lastrow">2.6 كجم</div>
</div></div>

<div class="blk"><h4>الضمان والحماية<small>من نَواة مباشرة</small></h4><div class="wr">
<div class="wo on"><span class="rd"></span><div class="wt"><b>ضمان سنتين</b><small>قطع وصيانة لدى مراكزنا</small></div><span class="p">مشمول</span></div>
<div class="wo"><span class="rd"></span><div class="wt"><b>تمديد إلى 3 سنوات</b><small>مع استبدال البطارية مرة واحدة</small></div><span class="p">{L("+349")} {CUR}</span></div>
<div class="wo"><span class="rd"></span><div class="wt"><b>حماية شاملة 3 سنوات</b><small>تشمل الكسر والسوائل</small></div><span class="p">{L("+749")} {CUR}</span></div></div></div>

<div class="dlv">
<div class="dl">{ic("local_shipping")}<div><b>توصيل مجاني خلال 48 ساعة</b><small>بعد التجميع والفحص · جدة غداً</small></div></div>
<div class="dl">{ic("autorenew")}<div><b>إرجاع خلال 14 يوماً</b><small>بحالته الأصلية دون رسوم</small></div></div>
<div class="dl">{ic("support_agent")}<div><b>إعداد ونقل بيانات مجاني</b><small>جلسة دعم عن بُعد مع فني معتمد</small></div></div></div>

<div class="acc">
<div class="ac"><div class="ah">المواصفات الكاملة{ic("remove")}</div>
<div class="spec"><span>المعالج</span><b>N9 بـ16 نواة و22 مساراً، حتى {L("5.2GHz")}</b><span>الرسوميات</span><b>{L("GX 460 · 8GB GDDR6")}</b><span>الذاكرة</span><b>{L("32GB LPDDR5X · 7467MHz")}</b><span>التخزين</span><b>{L("1TB NVMe PCIe 4.0")} · منفذ توسعة إضافي</b><span>الشاشة</span><b>16 بوصة · {L("2560×1600 · 165Hz")} · تغطية ألوان {L("100% DCI-P3")}</b><span>المنافذ</span><b>{L("USB-C ×2 · USB-A ×2 · HDMI 2.1")} · قارئ SD</b><span>الاتصال</span><b>{L("Wi-Fi 7 · Bluetooth 5.4")}</b><span>الكاميرا</span><b>{L("1080p")} مع مصراع خصوصية</b><span class="e">النظام</span><b class="e">مثبت ومفعّل · لوحة عربية مضاءة</b></div></div>
<div class="ac"><div class="ah">الوصف{ic("add")}</div></div>
<div class="ac"><div class="ah">ما في الصندوق{ic("add")}</div></div>
<div class="ac"><div class="ah">الشحن والإرجاع{ic("add")}</div></div></div>

<div class="sec" style="margin-top:28px"><div class="shead"><div><h3>آراء العملاء</h3></div><a>كل التقييمات{ic("chevron_left")}</a></div>
<div class="rv"><div class="rvtop">
<div class="rvbig"><b>4.9</b>{stars()}<small>208 تقييمات</small></div>
<div class="bars"><div class="bar">5<i><em style="width:88%"></em></i></div><div class="bar">4<i><em style="width:9%"></em></i></div><div class="bar">3<i><em style="width:2%"></em></i></div><div class="bar">2<i><em style="width:1%"></em></i></div><div class="bar">1<i><em style="width:1%"></em></i></div></div></div>
<div class="rvchips"><span>الشاشة <b>4.9</b></span><span>البطارية <b>4.7</b></span><span>الحرارة <b>4.6</b></span><span>الوزن <b>4.8</b></span></div>
<div class="rvph">{ph("c/lap-desk-dark.jpg","0.2 0.45 1.4")}{ph("c/lap-hands.jpg","0.5 0.4 1.4")}{ph("c/lap-night.jpg","0.4 0.6 1.3")}{ph("c/lap-wood.jpg","0.5 0.5 1.3","more2")}</div>
<div class="rvq"><div class="who"><i>س</i><div><b>سارة الدوسري</b><small>جدة · مصممة جرافيك · قبل 3 أيام</small></div>{stars()}</div>
<p>دقة الألوان ممتازة لعملي في التصميم، والجهاز هادئ حتى أثناء التصدير. وصل خلال يومين مع النظام مفعّلاً.</p><div class="tagsr"><span>{L("32GB · 1TB")}</span><span>مشترٍ موثّق</span></div></div></div></div>

<div class="sec"><div class="shead"><div><h3>يكمل جهازك</h3><div class="sub">أضفها معاً ووفّر 10%</div></div></div>
<div class="gw">
<div class="gwi">{ph("c/desk-mouse.jpg","0.8 0.78 2.8","gi")}<div class="gt"><b>ماوس «انسياب» اللاسلكي</b><small><bdi dir="ltr">8000 DPI</bdi> · شحن USB-C</small><span>249 <small>{CUR}</small></span></div><span class="ck2 on">{ic("check")}</span></div>
<div class="gwi">{ph("c/ssd-kit.jpg","0.68 0.5 1.7","gi")}<div class="gt"><b>تخزين خارجي 2TB</b><small>ألمنيوم · USB-C 10Gbps</small><span>699 <small>{CUR}</small></span></div><span class="ck2 on">{ic("check")}</span></div>
<div class="gwi">{ph("c/hp-white.jpg","0.5 0.55 1.8","gi")}<div class="gt"><b>سماعة «صدى» بعزل الضوضاء</b><small>بلوتوث · 40 ساعة</small><span>529 <small>{CUR}</small></span></div><span class="ck2"></span></div>
<div class="gwsum"><span>المجموع لقطعتين <b>852 {CUR}</b></span><span class="ab">{ic("add_shopping_cart")}أضف المحدد</span></div></div></div>

<div class="sec"><div class="shead"><div><h3>قد يعجبك أيضاً</h3></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll prow">
{pcard("c/lap-wood.jpg","0.58 0.4 1.25","أفق 16 ستوديو",["64GB","2TB","Mini-LED"],price="11,990",rate="5.0",cnt="41")}
{pcard("c/lap-code.jpg","0.52 0.55 1.3","مِحور 14 للمطورين",["32GB","1TB","2.8K"],price="6,390",rate="4.8",cnt="77")}
{pcard("c/lap-glass.jpg","0.66 0.5 1.15","نبض 15 لايت",["16GB","1TB"],price="5,290",rate="4.7",cnt="233")}
</div></div>
<div style="height:24px"></div>
<div class="sticky"><div class="cbtn">{ic("compare_arrows")}</div><div class="add"><span>{ic("add_shopping_cart")}أضف إلى السلة</span><em>7,499 {CUR}</em></div><div class="homeind"></div></div>
</div>'''


SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
