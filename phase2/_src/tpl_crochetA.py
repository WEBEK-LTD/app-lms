from lib import STATUS, ic, ph, stars

FONT = "messiri"
TITLE = "Ghurza"
CUR = "ج.م"
C = "crochet/"

LOGO = '''<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M5.5 8.5c4 1 9 5 11.5 10.5M4.2 13c4.5 0 9.5 2.5 11 7M9 4.5c2.5 2.5 6 8 6.8 15M14.5 4.3c-1 3.2-.6 7.5 1.8 11"/><path d="M19.5 17.5l2.5 2.5"/></svg>'''

CSS = """
:root{--bg:#F7F1E8;--surface:#FFFCF7;--stone:#EFE6DA;--stone2:#E4D8C8;--ink:#2B211B;--ink2:#6B5D52;--ink3:#93857A;--line:#EADFD1;
--acc:#A4502F;--accT:#A4502F;--soft:#F4E4D8;--soft2:#FAEFE6;--sage:#5E6B4E;--tile:#EFE6DA;--tab:rgba(255,252,247,.86);--gold:#B8863B}
html.dark{--bg:#16110E;--surface:#201915;--stone:#2A221D;--stone2:#352B25;--ink:#F4EAE1;--ink2:#C4B5A8;--ink3:#9C8E82;--line:#33291F;
--acc:#B25A37;--accT:#F0A27E;--soft:#36231A;--soft2:#2A1D17;--sage:#A9B793;--tile:#EDE4D8;--tab:rgba(36,29,24,.88);--gold:#D9A85B}
body{font-family:'El Messiri',sans-serif}
.screen{padding-bottom:118px}
.ms{font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}
.fill{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.hdr{height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.br{display:flex;align-items:center;gap:10px}
.logo{width:44px;height:44px;border-radius:22px;background:var(--acc);display:grid;place-items:center;box-shadow:0 0 0 3px var(--bg),0 0 0 4.5px var(--acc)}
.br b{display:block;font-size:22px;font-weight:700;line-height:1.1}
.br small{display:block;font-size:11px;color:var(--ink3);margin-top:1px}
.hb{display:flex;gap:8px}
.cb{width:42px;height:42px;border-radius:21px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;position:relative;color:var(--ink)}
.cb .ms{font-size:22px}
.cb .n{position:absolute;top:-3px;left:-3px;min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10px;display:grid;place-items:center;box-shadow:0 0 0 2px var(--bg);font-family:sans-serif}
.srch{margin:8px 16px 0;height:50px;border-radius:25px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:10px;padding:0 8px 0 16px}
.srch .ms{font-size:22px;color:var(--ink2)}
.srch .t{flex:1;font-size:13.5px;color:var(--ink3)}
.srch .f{width:36px;height:36px;border-radius:18px;background:var(--acc);display:grid;place-items:center}
.srch .f .ms{color:#fff;font-size:19px}
.cats{margin-top:18px;gap:12px}
.ct{width:70px;text-align:center}
.ct i{display:block;width:70px;height:70px;border-radius:35px;background-color:var(--tile);position:relative;box-shadow:0 0 0 3px var(--bg),0 0 0 4.2px var(--stone2)}
.ct i:after{content:'';position:absolute;inset:4px;border-radius:50%;border:1.3px dashed rgba(255,255,255,.85)}
.ct.on i{box-shadow:0 0 0 3px var(--bg),0 0 0 5px var(--acc)}
.ct span{display:block;font-size:12.5px;margin-top:9px;color:var(--ink2)}
.ct.on span{color:var(--accT);font-weight:700}
.hero{margin-top:22px;gap:10px}
.hc{width:340px;height:222px;border-radius:24px;position:relative;overflow:hidden;background-color:var(--tile)}
.hc .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(43,26,18,.78) 0%,rgba(43,26,18,.45) 45%,rgba(43,26,18,0) 72%)}
.hc .st{position:absolute;inset:8px;border-radius:18px;border:1.3px dashed rgba(255,255,255,.55)}
.hc .tx{position:absolute;right:24px;top:24px;bottom:22px;width:176px;color:#fff;display:flex;flex-direction:column}
.hc .lb{font-size:11.5px;color:#F6D5C3;display:flex;align-items:center;gap:5px}
.hc .lb .ms{font-size:15px}
.hc h2{font-size:23px;font-weight:700;line-height:1.3;margin-top:6px}
.hc p{font-size:12px;opacity:.9;margin-top:4px}
.hc .cta{margin-top:auto;align-self:flex-start;height:38px;padding:0 16px;border-radius:19px;background:#A4502F;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
.hc .cta .ms{font-size:17px}
.dots{display:flex;justify-content:center;gap:6px;margin-top:12px}
.dots i{width:7px;height:7px;border-radius:4px;background:var(--stone2)}
.dots i.on{width:20px;background:var(--acc)}
.sec{margin-top:32px}
.shd{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:14px}
.shd h3{font-size:20px;font-weight:700;display:flex;align-items:center;gap:7px}
.shd h3 .ms{font-size:20px;color:var(--accT)}
.shd .sub{font-size:12px;color:var(--ink3);margin-top:2px}
.shd a{font-size:12.5px;color:var(--accT);font-weight:600;display:flex;align-items:center;gap:1px}
.shd a .ms{font-size:18px}
.custom{margin:0 16px;border-radius:26px;background:var(--soft);padding:18px;position:relative;overflow:hidden}
.custom:before{content:'';position:absolute;inset:7px;border-radius:20px;border:1.3px dashed rgba(164,80,47,.35)}
html.dark .custom:before{border-color:rgba(240,162,126,.25)}
.custom .ch{display:flex;gap:12px;align-items:flex-start;position:relative}
.custom .ch .im{width:84px;height:84px;border-radius:20px;background-color:var(--tile);flex:0 0 auto}
.custom h4{font-size:19px;font-weight:700;line-height:1.35}
.custom p{font-size:12px;color:var(--ink2);margin-top:4px;line-height:1.6}
.steps{display:flex;gap:6px;margin-top:16px;position:relative}
.step{flex:1;background:var(--surface);border-radius:16px;padding:10px 8px;text-align:center}
.step i{display:grid;place-items:center;width:28px;height:28px;border-radius:14px;margin:0 auto;background:var(--soft2);color:var(--accT)}
.step i .ms{font-size:17px}
.step b{display:block;font-size:12px;font-weight:600;margin-top:6px}
.step small{display:block;font-size:10px;color:var(--ink3);margin-top:1px}
.custom .cf{display:flex;align-items:center;justify-content:space-between;margin-top:14px;position:relative}
.custom .cf>span:first-child{font-size:12px;color:var(--ink2);display:flex;align-items:center;gap:5px}
.custom .cf>span:first-child .ms{font-size:17px;color:var(--accT)}
.btn{height:44px;padding:0 18px;border-radius:22px;background:var(--acc);color:#fff;display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600}
.btn .ms{font-size:19px}
.prow{gap:12px}
.pc{width:158px}
.pc .im{height:186px;border-radius:22px;background-color:var(--tile);position:relative;overflow:hidden}
.pc .im:after{content:'';position:absolute;inset:6px;border-radius:17px;border:1.2px dashed rgba(255,255,255,.6);pointer-events:none}
.pc .hrt{position:absolute;top:12px;left:12px;width:30px;height:30px;border-radius:15px;background:rgba(255,252,247,.92);display:grid;place-items:center;color:#2B211B;z-index:1}
.pc .hrt .ms{font-size:17px}
.pc .hrt.on .ms{color:#A4502F;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.pc .bd{position:absolute;top:13px;right:12px;font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:9px;background:rgba(255,252,247,.92);color:#A4502F;z-index:1}
.pc .bd.s{background:#A4502F;color:#fff;direction:ltr}
.pc .days{position:absolute;bottom:12px;right:12px;height:24px;padding:0 8px;border-radius:12px;background:rgba(43,33,27,.66);backdrop-filter:blur(6px);color:#fff;font-size:10.5px;display:flex;align-items:center;gap:3px;z-index:1}
.pc .days .ms{font-size:13px}
.pc .nm{font-size:14px;font-weight:600;margin-top:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .mk{font-size:11.5px;color:var(--ink3);margin-top:1px}
.pc .pf{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.pc .pr{font-size:15px;font-weight:700}
.pc .pr small{font-size:11px;font-weight:400;color:var(--ink2)}
.pc .pr s{display:block;font-size:11px;color:var(--ink3);font-weight:400;line-height:1}
.pc .add{width:34px;height:34px;border-radius:17px;background:var(--soft);color:var(--accT);display:grid;place-items:center}
.pc .add .ms{font-size:20px}
.yarns{display:flex;gap:4px;margin-top:6px}
.yarns i{width:12px;height:12px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.maker{margin:0 16px;border-radius:26px;background:var(--surface);box-shadow:0 0 0 1px var(--line);overflow:hidden}
.maker .mi{height:190px;background-color:var(--tile);position:relative}
.maker .mi .q{position:absolute;right:14px;bottom:-22px;width:52px;height:52px;border-radius:26px;background:var(--acc);display:grid;place-items:center;color:#fff;box-shadow:0 0 0 4px var(--surface)}
.maker .mi .q .ms{font-size:26px}
.maker .mb{padding:30px 16px 16px}
.maker blockquote{font-size:15px;line-height:1.75;font-weight:500}
.maker .who{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
.maker .who b{display:block;font-size:13px;font-weight:700}
.maker .who small{display:block;font-size:11px;color:var(--ink3)}
.avs{display:flex}
.avs i{width:30px;height:30px;border-radius:15px;margin-left:-8px;box-shadow:0 0 0 2px var(--surface);display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff}
.mstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.mstats div{background:var(--bg);border-radius:14px;padding:9px 4px;text-align:center}
.mstats b{display:block;font-size:18px;font-weight:700;color:var(--accT)}
.mstats span{display:block;font-size:10.5px;color:var(--ink2)}
.yarn{gap:10px}
.yn{width:132px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:8px}
.yn .im{height:92px;border-radius:14px;background-color:var(--tile)}
.yn b{display:block;font-size:13.5px;font-weight:700;margin-top:8px}
.yn small{display:block;font-size:11px;color:var(--ink3)}
.yn .sw{display:flex;gap:3px;margin-top:7px}
.yn .sw i{flex:1;height:8px;border-radius:4px}
.grid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:18px 12px}
.grid .pc{width:auto}
.grid .pc .im{height:192px}
.cls{margin:0 16px;border-radius:26px;background:#2E2119;overflow:hidden;display:flex;color:#fff}
html.dark .cls{background:#2A1E17;box-shadow:0 0 0 1px var(--line)}
.cls .ci{width:128px;background-color:#3a2b22;flex:0 0 auto}
.cls .cb2{padding:16px 14px;flex:1}
.cls small{font-size:11px;color:#F0B596;display:flex;align-items:center;gap:4px}
.cls small .ms{font-size:15px}
.cls h4{font-size:17px;font-weight:700;line-height:1.4;margin-top:4px}
.cls .meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.cls .meta span{font-size:10.5px;background:rgba(255,255,255,.1);border-radius:8px;padding:3px 8px;display:flex;align-items:center;gap:3px}
.cls .meta .ms{font-size:13px}
.cls .cf{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
.cls .cf b{font-size:16px}
.cls .cf b small{font-size:11px;font-weight:400;opacity:.8}
.cls .cf span{height:34px;padding:0 13px;border-radius:17px;background:#B85F3B;font-size:12px;font-weight:600;display:flex;align-items:center}
.rv{margin:0 16px;background:var(--surface);border-radius:26px;box-shadow:0 0 0 1px var(--line);padding:16px}
.rv .rt{display:flex;gap:12px}
.rv .rt .ri{width:96px;height:112px;border-radius:18px;background-color:var(--tile);flex:0 0 auto}
.stars{display:flex;color:var(--gold)}
.stars .ms{font-size:15px}
.rv q{display:block;quotes:none;font-size:13.5px;line-height:1.75;margin-top:6px}
.rv .who{display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)}
.rv .who i{width:30px;height:30px;border-radius:15px;background:var(--soft);color:var(--accT);display:grid;place-items:center;font-weight:700;font-size:13px}
.rv .who b{display:block;font-size:12.5px}
.rv .who small{display:block;font-size:11px;color:var(--ink3)}
.rv .who .vf{margin-right:auto;font-size:11px;color:var(--sage);display:flex;align-items:center;gap:3px}
.rv .who .vf .ms{font-size:15px}
.gift{margin:24px 16px 0;border-radius:22px;border:1.3px dashed var(--stone2);padding:14px 16px;display:flex;align-items:center;gap:12px}
.gift .ms{font-size:28px;color:var(--accT)}
.gift b{display:block;font-size:14px;font-weight:700}
.gift small{display:block;font-size:11.5px;color:var(--ink2)}
.tabbar{position:absolute;left:16px;right:16px;bottom:28px;height:68px;border-radius:34px;background:var(--tab);backdrop-filter:blur(20px) saturate(1.4);box-shadow:0 0 0 1px var(--line),0 14px 30px rgba(80,50,30,.14);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;padding:0 6px}
html.dark .tabbar{box-shadow:0 0 0 1px rgba(255,255,255,.06),0 14px 30px rgba(0,0,0,.5)}
.tab{display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--ink3);position:relative;height:56px;justify-content:center}
.tab .ms{font-size:24px}
.tab span:not(.ms){font-size:11px}
.tab.on{color:var(--accT)}
.tab.on span:not(.ms){font-weight:700}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tab.on:before{content:'';position:absolute;inset:3px 4px;border-radius:26px;background:var(--soft)}
.tab>*{position:relative}
.tab .bdg{position:absolute;top:4px;left:50%;margin-left:-22px;min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10px;display:grid;place-items:center;font-family:sans-serif}

/* menu */
.mhd{display:flex;align-items:center;justify-content:space-between;padding:6px 16px 0;height:60px}
.mcat{margin-top:18px}
.mch{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:12px}
.mch b{font-size:17.5px;font-weight:700;display:flex;align-items:center;gap:8px}
.mch b .ms{font-size:20px;color:var(--accT)}
.mch b small{font-size:11.5px;font-weight:400;color:var(--ink3)}
.mch a{font-size:12px;color:var(--accT);font-weight:600;display:flex;align-items:center}
.mch a .ms{font-size:17px}
.mrow{gap:10px}
.mt{width:92px;text-align:center}
.mt i{display:block;height:96px;border-radius:22px;background-color:var(--tile);position:relative;box-shadow:0 0 0 1px var(--line)}
.mt i:after{content:'';position:absolute;inset:5px;border-radius:17px;border:1.2px dashed rgba(255,255,255,.7)}
.mt span{display:block;font-size:12.5px;font-weight:600;margin-top:7px}
.mt small{display:block;font-size:10.5px;color:var(--ink3)}
.mt.all i{background:var(--soft);display:grid;place-items:center;box-shadow:none}
.mt.all i:after{border-color:rgba(164,80,47,.3)}
html.dark .mt.all i:after{border-color:rgba(240,162,126,.3)}
.mt.all i .ms{font-size:30px;color:var(--accT)}
.mbanner{margin:26px 16px 0;border-radius:24px;background:var(--acc);color:#fff;padding:16px;display:flex;align-items:center;gap:12px;position:relative}
.mbanner:before{content:'';position:absolute;inset:6px;border-radius:19px;border:1.2px dashed rgba(255,255,255,.4)}
.mbanner .ms{font-size:30px}
.mbanner b{display:block;font-size:16px;font-weight:700}
.mbanner small{display:block;font-size:11.5px;opacity:.88}
.mbanner .go{margin-right:auto;width:36px;height:36px;border-radius:18px;background:rgba(255,255,255,.18);display:grid;place-items:center;position:relative}
.mlist{margin:12px 16px 0;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px var(--line);padding:4px 14px}
.ml{display:flex;align-items:center;gap:12px;height:52px}
.ml+.ml{border-top:1px dashed var(--line)}
.ml .ms.l{font-size:22px;color:var(--accT)}
.ml span.t{flex:1;font-size:14px}
.ml small{font-size:11.5px;color:var(--ink3)}
.ml .ms.c{font-size:18px;color:var(--ink3)}
.lng{display:flex;background:var(--stone);border-radius:14px;padding:3px}
.lng i{font-size:11.5px;padding:3px 11px;border-radius:11px;color:var(--ink2)}
.lng i.on{background:var(--surface);color:var(--ink);font-weight:700}
.soc{display:flex;justify-content:center;gap:10px;margin-top:16px}
.soc span{width:40px;height:40px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;color:var(--ink2)}
.soc span .ms{font-size:20px}

/* listing */
.lh{height:58px;display:flex;align-items:center;gap:10px;padding:0 16px}
.lh .tt{flex:1}
.lh .tt b{display:block;font-size:20px;font-weight:700;line-height:1.2}
.lh .tt small{display:block;font-size:11.5px;color:var(--ink3)}
.chips{gap:8px;margin-top:8px}
.chip{height:38px;padding:0 15px;border-radius:19px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink2);white-space:nowrap}
.chip.on{background:var(--acc);color:#fff;box-shadow:none;font-weight:600}
.chip small{font-size:11px;opacity:.8}
.fbar{display:flex;gap:8px;margin:14px 16px 0}
.fb{height:40px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;white-space:nowrap}
.fb .ms{font-size:19px;color:var(--accT)}
.fb .c{width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10px;display:grid;place-items:center;font-family:sans-serif}
.fb.grow{flex:1;justify-content:space-between;color:var(--ink2)}
.fb.grow b{color:var(--ink);font-weight:600}
.atags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 16px 0;align-items:center}
.atag{height:30px;border-radius:15px;background:var(--soft);color:var(--accT);font-size:12px;display:flex;align-items:center;gap:3px;padding:0 7px 0 12px;font-weight:600}
.atag .ms{font-size:15px}
.atags a{font-size:12px;color:var(--ink3);text-decoration:underline;text-underline-offset:3px;margin-right:4px}
.cnt{display:flex;justify-content:space-between;margin:16px 16px 12px;font-size:12px;color:var(--ink3)}
.cnt b{color:var(--ink)}
.promo{grid-column:1/-1;border-radius:24px;background:var(--soft);padding:16px;display:flex;gap:14px;align-items:center;position:relative}
.promo:before{content:'';position:absolute;inset:6px;border-radius:19px;border:1.2px dashed rgba(164,80,47,.3)}
html.dark .promo:before{border-color:rgba(240,162,126,.25)}
.promo .pi{width:92px;height:92px;border-radius:46px;background-color:var(--tile);flex:0 0 auto;position:relative}
.promo div.t{position:relative;flex:1}
.promo small{font-size:11px;color:var(--accT);font-weight:600}
.promo b{display:block;font-size:16px;font-weight:700;line-height:1.45;margin-top:2px}
.promo span{display:inline-flex;align-items:center;gap:4px;margin-top:8px;font-size:12.5px;font-weight:700;color:var(--accT)}
.promo span .ms{font-size:16px}
.more{text-align:center;margin:28px 16px 0}
.more p{font-size:12px;color:var(--ink3)}
.more .pg{width:140px;height:4px;border-radius:2px;background:var(--stone2);margin:8px auto 0}
.more .pg i{display:block;width:24%;height:100%;border-radius:2px;background:var(--acc)}
.more .mb{margin:14px auto 0;width:210px;height:46px;border-radius:23px;border:1.4px solid var(--accT);color:var(--accT);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;font-weight:700}

/* product */
.gal{margin:0 16px;height:380px;border-radius:30px;background-color:var(--tile);position:relative;overflow:hidden}
.gal:after{content:'';position:absolute;inset:8px;border-radius:24px;border:1.3px dashed rgba(255,255,255,.6)}
.gal .gt{position:absolute;top:16px;left:16px;right:16px;display:flex;justify-content:space-between;z-index:1}
.gal .gt span.b{height:28px;padding:0 11px;border-radius:14px;background:rgba(255,252,247,.92);color:#A4502F;font-size:11.5px;font-weight:700;display:flex;align-items:center;gap:4px}
.gal .gt span.b .ms{font-size:15px}
.gal .gd{position:absolute;bottom:18px;left:0;right:0;display:flex;justify-content:center;gap:5px;z-index:1}
.gal .gd i{width:7px;height:7px;border-radius:4px;background:rgba(255,255,255,.6)}
.gal .gd i.on{width:20px;background:#fff}
.thm{display:flex;gap:8px;margin:10px 16px 0}
.thm div{flex:1;height:64px;border-radius:18px;background-color:var(--tile)}
.thm div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--acc)}
.pinf{padding:18px 16px 0}
.pinf .mkr{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink2)}
.pinf .mkr i{width:26px;height:26px;border-radius:13px;background:#8C5A3C;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:700}
.pinf .mkr b{color:var(--ink)}
.pinf .mkr .hm{margin-right:auto;font-size:11px;color:var(--sage);display:flex;align-items:center;gap:3px}
.pinf .mkr .hm .ms{font-size:15px}
.pinf h1{font-size:24px;font-weight:700;line-height:1.35;margin-top:10px}
.pinf .sb{font-size:13px;color:var(--ink2);margin-top:2px}
.prc{display:flex;align-items:center;gap:10px;margin-top:12px}
.prc b{font-size:26px;font-weight:700}
.prc b small{font-size:13px;font-weight:400;color:var(--ink2)}
.prc s{font-size:14px;color:var(--ink3)}
.prc .off{font-size:12px;font-weight:700;color:#fff;background:var(--acc);border-radius:10px;padding:2px 8px;direction:ltr}
.prc .rt{margin-right:auto;display:flex;align-items:center;gap:3px;font-size:14px;font-weight:700}
.prc .rt .ms{color:var(--gold);font-size:18px}
.prc .rt small{font-weight:400;color:var(--ink3);font-size:12px}
.dtm{margin:14px 16px 0;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:12px 14px}
.dtm .r{display:flex;align-items:center;gap:10px}
.dtm .r .ms{font-size:24px;color:var(--accT)}
.dtm .r b{display:block;font-size:13.5px}
.dtm .r small{display:block;font-size:11.5px;color:var(--ink2)}
.tl{display:flex;align-items:center;margin-top:12px}
.tl i{width:10px;height:10px;border-radius:5px;background:var(--stone2);flex:0 0 auto}
.tl i.on{background:var(--acc)}
.tl em{flex:1;height:2px;background:var(--stone2)}
.tl em.on{background:var(--acc)}
.tll{display:flex;justify-content:space-between;margin-top:6px;font-size:10.5px;color:var(--ink3)}
.tll span:first-child{color:var(--accT);font-weight:700}
.opt{margin:20px 16px 0}
.opt .oh{display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:10px}
.opt .oh span{font-weight:400;color:var(--ink2)}
.opt .oh a{font-size:12px;color:var(--accT);font-weight:600}
.ycol{display:flex;gap:12px}
.ycol div{text-align:center;width:54px}
.ycol i{display:block;width:50px;height:50px;border-radius:25px;margin:0 auto;position:relative;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.ycol i:after{content:'';position:absolute;inset:5px;border-radius:50%;border:1.2px dashed rgba(255,255,255,.55)}
.ycol .on i{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--acc)}
.ycol span{display:block;font-size:11px;color:var(--ink2);margin-top:6px}
.ycol .on span{color:var(--ink);font-weight:700}
.szs{display:flex;gap:8px}
.szs div{flex:1;height:52px;border-radius:18px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:13px;font-weight:600}
.szs div small{font-size:10.5px;color:var(--ink3);font-weight:400}
.szs div.on{background:var(--soft);box-shadow:0 0 0 1.5px var(--acc);color:var(--accT)}
.pers{margin:14px 16px 0;border-radius:20px;border:1.3px dashed var(--stone2);padding:12px 14px;display:flex;align-items:center;gap:10px}
.pers .ms{font-size:22px;color:var(--accT)}
.pers b{display:block;font-size:13px}
.pers small{display:block;font-size:11px;color:var(--ink2)}
.pers .tg{margin-right:auto;width:44px;height:26px;border-radius:13px;background:var(--acc);position:relative}
.pers .tg:after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:10px;background:#fff}
.pers .in{margin-top:0}
.blk{margin:14px 16px 0;border-radius:24px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:16px}
.blk h4{font-size:17px;font-weight:700;display:flex;align-items:center;gap:7px}
.blk h4 .ms{font-size:20px;color:var(--accT)}
.spec{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.spec div{background:var(--bg);border-radius:14px;padding:9px 11px}
.spec small{display:block;font-size:10.5px;color:var(--ink3)}
.spec b{display:block;font-size:13px;margin-top:2px}
.story{margin:14px 16px 0;border-radius:24px;overflow:hidden;background:var(--soft)}
.story .si{height:150px;background-color:var(--tile)}
.story .sb{padding:14px 16px 16px}
.story .sb small{font-size:11px;color:var(--accT);font-weight:700}
.story .sb h4{font-size:17px;font-weight:700;margin-top:2px}
.story .sb p{font-size:12.5px;color:var(--ink2);line-height:1.75;margin-top:4px}
.story .sb .sg{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px}
.story .sb .sg i{width:30px;height:30px;border-radius:15px;background:#8C5A3C;color:#fff;display:grid;place-items:center;font-weight:700}
.story .sb .sg small{color:var(--ink3);font-weight:400}
.care{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.care div{text-align:center;background:var(--bg);border-radius:14px;padding:10px 4px}
.care .ms{font-size:22px;color:var(--accT)}
.care span{display:block;font-size:10.5px;color:var(--ink2);margin-top:4px;line-height:1.45}
.ship{margin:14px 16px 0;border-radius:24px;background:var(--soft2);box-shadow:0 0 0 1px var(--line);padding:4px 14px}
.ship>div{display:flex;align-items:center;gap:12px;padding:11px 0}
.ship>div+div{border-top:1px dashed var(--stone2)}
.ship .ms{font-size:22px;color:var(--accT)}
.ship b{display:block;font-size:13px}
.ship small{display:block;font-size:11.5px;color:var(--ink2)}
.acc{margin:14px 16px 0;border-radius:24px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:0 16px}
.ac{padding:14px 0;border-bottom:1px dashed var(--line)}
.ac:last-child{border:0}
.ac .ah{display:flex;justify-content:space-between;align-items:center;font-size:14.5px;font-weight:600}
.ac .ah .ms{font-size:20px;color:var(--ink3)}
.ac p{font-size:12.5px;color:var(--ink2);line-height:1.8;margin-top:6px}
.rsm{display:flex;gap:16px;align-items:center}
.rsm .bg{text-align:center;width:90px}
.rsm .bg b{font-size:40px;font-weight:700;line-height:1}
.rsm .bg .stars{justify-content:center;margin-top:4px}
.rsm .bg small{display:block;font-size:11px;color:var(--ink3);margin-top:3px}
.bars{flex:1;display:flex;flex-direction:column;gap:5px}
.bars div{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--ink3)}
.bars i{flex:1;height:6px;border-radius:3px;background:var(--stone);overflow:hidden}
.bars em{display:block;height:100%;background:var(--acc);border-radius:3px}
.rph{display:flex;gap:8px;margin-top:14px}
.rph div{flex:1;height:80px;border-radius:16px;background-color:var(--tile);position:relative}
.rph div.m:after{content:'+42';direction:ltr;position:absolute;inset:0;border-radius:16px;background:rgba(43,33,27,.55);color:#fff;display:grid;place-items:center;font-size:14px;font-weight:700}
.rq{margin-top:14px;padding-top:14px;border-top:1px dashed var(--line)}
.rq .w{display:flex;align-items:center;gap:8px}
.rq .w i{width:30px;height:30px;border-radius:15px;background:var(--soft);color:var(--accT);display:grid;place-items:center;font-weight:700}
.rq .w b{display:block;font-size:12.5px}
.rq .w small{display:block;font-size:11px;color:var(--ink3)}
.rq .w .stars{margin-right:auto}
.rq p{font-size:13px;line-height:1.75;margin-top:8px}
.sticky{position:absolute;left:0;right:0;bottom:0;background:var(--surface);box-shadow:0 -1px 0 var(--line),0 -14px 30px rgba(60,40,20,.08);padding:12px 16px 32px;display:flex;align-items:center;gap:10px}
html.dark .sticky{box-shadow:0 -1px 0 var(--line),0 -14px 30px rgba(0,0,0,.4)}
.sticky .cu{height:52px;padding:0 14px;border-radius:26px;box-shadow:0 0 0 1.3px var(--accT);color:var(--accT);display:flex;align-items:center;gap:5px;font-size:13px;font-weight:700;white-space:nowrap}
.sticky .cu .ms{font-size:19px}
.sticky .ad{flex:1;height:52px;border-radius:26px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 18px;font-size:14px;font-weight:700}
.sticky .ad span{display:flex;align-items:center;gap:6px}
.sticky .ad .ms{font-size:20px}
.sticky .ad em{font-weight:500;opacity:.92;font-size:13px}
"""


def pc(img, f, nm, mk, pr, old=None, bd=None, fav=False, days=None, yarns=None):
    b = (f'<span class="bd{" s" if bd.startswith("-") else ""}">{bd}</span>' if bd else '')
    d = f'<span class="days">{ic("schedule")}يُصنع في {days} أيام</span>' if days else ''
    inner = b + f'<span class="hrt{" on" if fav else ""}">{ic("favorite")}</span>' + d
    o = f'<s>{old} {CUR}</s>' if old else ''
    y = ('<div class="yarns">' + ''.join(f'<i style="background:{c}"></i>' for c in yarns) + '</div>') if yarns else ''
    return f'<div class="pc">{ph(C + img, f, "im", inner)}<div class="nm">{nm}</div><div class="mk">{mk}</div>{y}<div class="pf"><div class="pr">{o}{pr} <small>{CUR}</small></div><span class="add">{ic("add")}</span></div></div>'


def tabbar(a=0):
    t = [("home", "الرئيسية"), ("storefront", "المتجر"), ("shopping_bag", "السلة"), ("package_2", "طلباتي"), ("person", "حسابي")]
    s = ''.join(f'<div class="tab{" on" if i == a else ""}">{ic(n)}<span>{l}</span>{"<i class=bdg>2</i>" if n == "shopping_bag" else ""}</div>' for i, (n, l) in enumerate(t))
    return f'<div class="tabbar">{s}</div><div class="homeind"></div>'


def header():
    return f'''<div class="hdr"><div class="br"><div class="logo">{LOGO}</div><div><b>غُرزة</b><small>مشغل كروشيه يدوي · القاهرة</small></div></div>
<div class="hb"><div class="cb">{ic("favorite")}</div><div class="cb">{ic("notifications")}<i class="n">3</i></div><div class="cb">{ic("menu")}</div></div></div>'''


def home():
    return f'''<div class="screen">{STATUS}{header()}
<div class="srch">{ic("search")}<div class="t">ابحثي عن شنطة، بطانية، دبدوب…</div><span class="f">{ic("tune")}</span></div>
<div class="hscroll cats">
<div class="ct on"><i data-src="img/{C}cozy-sweater.jpg" data-f="0.5 0.55 1.6"></i><span>ملابس</span></div>
<div class="ct"><i data-src="img/{C}scarves-stack.jpg" data-f="0.45 0.5 1.5"></i><span>بطانيات</span></div>
<div class="ct"><i data-src="img/{C}teddy-sweater.jpg" data-f="0.55 0.55 2.2"></i><span>دُمى</span></div>
<div class="ct"><i data-src="img/{C}straw-close.jpg" data-f="0.5 0.4 1.3"></i><span>حقائب</span></div>
<div class="ct"><i data-src="img/{C}yarn-balls.jpg" data-f="0.6 0.5 1.1"></i><span>خيوط</span></div>
<div class="ct"><i data-src="img/{C}knit-coffee.jpg" data-f="0.75 0.5 1.8"></i><span>ورش</span></div></div>
<div class="hscroll hero">
{ph(C+"cozy-sweater.jpg","0.36 0.5 1.15","hc",f'<div class="sc"></div><div class="st"></div><div class="tx"><span class="lb">{ic("auto_awesome")}مجموعة الشتاء</span><h2>دفء محاك<br>غرزة بغرزة</h2><p>كارديغان وشالات من صوف الميرينو</p><span class="cta">تسوّقي المجموعة{ic("arrow_back")}</span></div>')}
{ph(C+"teddy-sweater.jpg","0.5 0.5 1.0","hc",'<div class="sc"></div><div class="st"></div>')}
</div>
<div class="dots"><i class="on"></i><i></i><i></i><i></i></div>

<div class="sec"><div class="custom"><div class="ch">{ph(C+"hoop-yarn.jpg","0.55 0.55 1.3","im")}<div><h4>قطعة على ذوقك… <br>نحيكها لكِ خصيصاً</h4><p>اختاري التصميم واللون والمقاس، وتبدأ حرفيّتنا العمل خلال يومين.</p></div></div>
<div class="steps"><div class="step"><i>{ic("draw")}</i><b>التصميم</b><small>من 40 نموذجاً</small></div><div class="step"><i>{ic("palette")}</i><b>اللون والخيط</b><small>62 لوناً</small></div><div class="step"><i>{ic("straighten")}</i><b>المقاس</b><small>أو مقاسك الخاص</small></div></div>
<div class="cf"><span>{ic("schedule")}جاهزة خلال 7 – 14 يوماً</span><span class="btn">ابدئي طلبك{ic("arrow_back")}</span></div></div></div>

<div class="sec"><div class="shd"><div><h3>{ic("fiber_new")}جديد من المشغل</h3><div class="sub">قطع خرجت من الإبرة هذا الأسبوع</div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll prow">
{pc("teddy-sweater.jpg","0.54 0.55 1.7","الدبدوب «بُندق»","أميغورومي · قطن ناعم","1,150",bd="جديد",days=5,yarns=["#C98C3C","#3E5E9A"])}
{pc("red-scarf.jpg","0.5 0.42 1.6","وشاح «قِرفة» المضلّع","صوف ميرينو · 180 سم","950",fav=True,days=3,yarns=["#B4553C","#D9C7B4","#5E6B4E"])}
{pc("pom-beanie.jpg","0.48 0.55 1.6","قبعة «ثلج» بالبومبوم","صوف وأكريليك","650",days=2,yarns=["#BFD3D0","#E9E2D8"])}
</div></div>

<div class="sec"><div class="shd"><div><h3>{ic("diversity_1")}أيادٍ تصنع الحكاية</h3><div class="sub">تعرّفي على حرفيّات غُرزة</div></div></div>
<div class="maker">{ph(C+"knit-flatlay.jpg","0.3 0.55 1.1","mi",f'<span class="q">{ic("format_quote","fill")}</span>')}
<div class="mb"><blockquote>كل قطعة تأخذ من وقتي أياماً، ومن قلبي أكثر. أحب أن أعرف أنها ستدفئ بيتاً ما.</blockquote>
<div class="who"><div><b>أم يوسف · رئيسة المشغل</b><small>تحيك منذ 22 عاماً · المنصورة</small></div><div class="avs"><i style="background:#8C5A3C">س</i><i style="background:#5E6B4E">ن</i><i style="background:#A4502F">ه</i><i style="background:#6B5D52;font-size:10px" class="ltr">+9</i></div></div>
<div class="mstats"><div><b>12</b><span>حرفية</span></div><div><b>4,800</b><span>قطعة محاكة</span></div><div><b>100%</b><span>صناعة يدوية</span></div></div></div></div></div>

<div class="sec"><div class="shd"><div><h3>{ic("gesture")}تسوّقي حسب الخيط</h3></div><a>دليل الخيوط{ic("chevron_left")}</a></div>
<div class="hscroll yarn">
<div class="yn">{ph(C+"yarn-ball-white.jpg","0.5 0.55 1.4","im")}<b>قطن مصري</b><small>ناعم وقابل للغسل</small><div class="sw"><i style="background:#EFE7DA"></i><i style="background:#D9B98E"></i><i style="background:#9DB09A"></i><i style="background:#C9867A"></i></div></div>
<div class="yn">{ph(C+"knit-textures.jpg","0.3 0.5 1.6","im")}<b>صوف ميرينو</b><small>دافئ وخفيف</small><div class="sw"><i style="background:#3B3A3A"></i><i style="background:#8D8A86"></i><i style="background:#C43B2F"></i><i style="background:#1F2E45"></i></div></div>
<div class="yn">{ph(C+"straw-close.jpg","0.5 0.5 1.5","im")}<b>خيط رافيا</b><small>للحقائب والقبعات</small><div class="sw"><i style="background:#D8C4A0"></i><i style="background:#B39064"></i><i style="background:#2B2A28"></i></div></div>
</div></div>

<div class="sec"><div class="shd"><div><h3>{ic("local_fire_department")}الأكثر طلباً</h3></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="grid">
{pc("scarves-stack.jpg","0.45 0.55 1.4","طقم رميات «زيتون»","3 قطع · صوف","2,900",days=10,yarns=["#A3A72E","#8A929C","#E9E6E0"])}
{pc("bunny-knit.jpg","0.78 0.5 1.4","الأرنب «جزرة»","أميغورومي · كتان","890","1,050","-15%",days=4)}
{pc("mittens-coffee.jpg","0.5 0.65 1.3","قفازات «حضن»","صوف ناعم مضفّر","520",days=3,yarns=["#C9CDD3","#E7DED2"])}
{pc("socks.jpg","0.45 0.5 1.25","جوارب «مدفأة» المخططة","صوف سميك","380",fav=True,days=2)}
</div></div>

<div class="sec"><div class="shd"><div><h3>{ic("school")}ورش الكروشيه</h3><div class="sub">تعلّمي أول غرزة مع حرفيّاتنا</div></div><a>كل الورش{ic("chevron_left")}</a></div>
<div class="cls">{ph(C+"knit-coffee.jpg","0.7 0.5 1.3","ci")}<div class="cb2"><small>{ic("event")}السبت 6 ديسمبر · 4 م</small><h4>أساسيات الكروشيه للمبتدئات</h4>
<div class="meta"><span>{ic("schedule")}3 ساعات</span><span>{ic("location_on")}الزمالك</span><span>{ic("inventory_2")}الأدوات مشمولة</span></div>
<div class="cf"><b>650 <small>{CUR}</small></b><span>احجزي · 4 مقاعد</span></div></div></div></div>

<div class="sec"><div class="shd"><div><h3>{ic("favorite")}من بيوت عميلاتنا</h3></div><a>4.9 · 2,300 تقييم{ic("chevron_left")}</a></div>
<div class="rv"><div class="rt">{ph(C+"slippers.jpg","0.6 0.5 1.4","ri")}<div>{stars()}<q>طلبت خف بألوان بيتنا بالضبط، وصل خلال أسبوع ومعه كارت بخط يد الحرفية. شغل نظيف جداً.</q></div></div>
<div class="who"><i>م</i><div><b>مريم عبد الرحمن</b><small>الإسكندرية · طلب خاص</small></div><span class="vf">{ic("verified","fill")}مشترية موثّقة</span></div></div></div>

<div class="gift">{ic("featured_seasonal_and_gifts")}<div><b>تغليف هدية يدوي مجاناً</b><small>مع بطاقة مكتوبة بخط اليد على كل طلب</small></div></div>
{tabbar(0)}
</div>'''


MENU = [
    ("checkroom", "ملابس محاكة", "240", [("cozy-sweater.jpg", "0.5 0.55 1.5", "كارديغان", "48"), ("green-sweater.jpg", "0.5 0.4 1.8", "كنزات", "62"), ("red-scarf.jpg", "0.5 0.4 1.8", "أوشحة وشالات", "37"), ("pom-beanie.jpg", "0.48 0.5 1.8", "قبعات", "29"), ("mittens-coffee.jpg", "0.5 0.65 1.4", "قفازات", "21")]),
    ("bed", "بطانيات ومفارش", "96", [("scarves-stack.jpg", "0.45 0.5 1.5", "رميات للكنب", "34"), ("fluffy-blanket.jpg", "0.35 0.5 1.4", "بطانيات أطفال", "22"), ("knit-textures.jpg", "0.5 0.5 1.4", "مفارش سرير", "18"), ("sweater-wood.jpg", "0.5 0.5 1.4", "وسائد", "22")]),
    ("toys", "دُمى أميغورومي", "130", [("teddy-sweater.jpg", "0.55 0.55 2.2", "دببة", "41"), ("bunny-knit.jpg", "0.78 0.5 1.6", "أرانب وحيوانات", "52"), ("snowman-plush.jpg", "0.5 0.5 1.6", "شخصيات موسمية", "19"), ("gnomes.jpg", "0.5 0.4 1.3", "دُمى الأقزام", "18")]),
    ("shopping_bag", "حقائب وقبعات", "88", [("straw-close.jpg", "0.5 0.35 1.4", "حقائب رافيا", "26"), ("straw-hat.jpg", "0.5 0.55 1.6", "قبعات صيفية", "21"), ("basket-room.jpg", "0.25 0.83 3.2", "سلال تخزين", "24"), ("knit-coffee.jpg", "0.68 0.45 2.0", "محافظ صغيرة", "17")]),
    ("deployed_code", "خيوط وأدوات", "310", [("yarn-balls.jpg", "0.6 0.5 1.1", "خيوط صوف", "120"), ("yarn-ball-white.jpg", "0.5 0.55 1.5", "خيوط قطن", "94"), ("blue-yarn.jpg", "0.55 0.45 1.5", "إبر وسنانير", "48"), ("buttons.jpg", "0.5 0.5 1.6", "أزرار وإكسسوارات", "48")]),
    ("school", "ورش ودروس", "14", [("knit-flatlay.jpg", "0.3 0.55 1.5", "للمبتدئات", "6"), ("hoop-yarn.jpg", "0.5 0.4 1.4", "تطريز وكروشيه", "4"), ("knit-coffee.jpg", "0.75 0.5 1.6", "دروس أونلاين", "4")]),
]


def menu():
    rows = ''
    for icn, name, cnt, subs in MENU:
        cards = f'<div class="mt all"><i>{ic(icn)}</i><span>كل القسم</span><small>{cnt} قطعة</small></div>'
        for img, f, n, c in subs:
            cards += f'<div class="mt"><i data-src="img/{C}{img}" data-f="{f}"></i><span>{n}</span><small>{c} قطعة</small></div>'
        rows += f'<div class="mcat"><div class="mch"><b>{ic(icn)}{name}<small>· {cnt}</small></b><a>الكل{ic("chevron_left")}</a></div><div class="hscroll mrow">{cards}</div></div>'
    return f'''<div class="screen" style="padding-bottom:42px">{STATUS}
<div class="mhd"><div class="br"><div class="logo">{LOGO}</div><div><b>غُرزة</b><small>كل الأقسام</small></div></div><div class="cb">{ic("close")}</div></div>
<div class="srch">{ic("search")}<div class="t">ابحثي في 880 قطعة يدوية…</div><span class="f">{ic("mic")}</span></div>
{rows}
<div class="mbanner">{ic("design_services")}<div style="position:relative"><b>اطلبي قطعة خاصة</b><small>صمّميها معنا · جاهزة خلال أسبوعين</small></div><span class="go">{ic("arrow_back")}</span></div>
<div class="mlist">
<div class="ml">{ic("person","l")}<span class="t">حسابي</span><small>هالة منصور</small>{ic("chevron_left","c")}</div>
<div class="ml">{ic("package_2","l")}<span class="t">طلباتي</span><small>طلب قيد الحياكة</small>{ic("chevron_left","c")}</div>
<div class="ml">{ic("favorite","l")}<span class="t">المفضلة</span><small>11 قطعة</small>{ic("chevron_left","c")}</div>
<div class="ml">{ic("translate","l")}<span class="t">اللغة</span><div class="lng"><i class="on">العربية</i><i>English</i></div></div>
<div class="ml">{ic("forum","l")}<span class="t">تواصلي معنا</span><small>واتساب · 10ص – 10م</small>{ic("chevron_left","c")}</div></div>
<div class="homeind"></div></div>'''


def listing():
    P = [
        ("cozy-sweater.jpg", "0.5 0.55 1.4", "كارديغان «دفء» الرمادي", "صوف ميرينو · مقاسات S–XL", "2,450", None, "الأكثر طلباً", True, 9, ["#C8C9CB", "#E6DCCD", "#7B6A5A"]),
        ("green-sweater.jpg", "0.5 0.42 1.7", "كنزة «غابة» بنقشة نوردية", "صوف وأكريليك", "1,980", None, None, False, 8, ["#2F4A43", "#E9E3D8"]),
        ("red-scarf.jpg", "0.5 0.42 1.6", "وشاح «قِرفة» المضلّع", "صوف ميرينو · 180 سم", "950", None, None, False, 3, ["#B4553C", "#D9C7B4"]),
        ("beanie-girl.jpg", "0.5 0.25 1.5", "قبعة «بُن» بالبومبوم", "صوف سميك", "650", "780", "-17%", False, 2, ["#5A4636", "#E7DED2"]),
        ("mittens-snow.jpg", "0.45 0.6 1.5", "قفازات «غيمة» المضفّرة", "صوف ناعم", "520", None, None, False, 3, ["#C9CDD3"]),
        ("sweater-wood.jpg", "0.5 0.5 1.25", "كنزة «حليب» الواسعة", "قطن مصري سميك", "1,750", None, "جديد", False, 7, ["#EDE4D6", "#B9A58E"]),
        ("slippers.jpg", "0.6 0.5 1.35", "خف «نوردي» المنزلي", "صوف مع نعل جلد", "690", None, None, True, 4, ["#7A2E30", "#2D3A57"]),
        ("socks.jpg", "0.45 0.5 1.25", "جوارب «مدفأة» المخططة", "صوف سميك", "380", None, None, False, 2, ["#5B524A", "#E7DED2"]),
    ]
    cards = [pc(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9]) for p in P]
    promo = f'<div class="promo">{ph(C+"yarn-balls.jpg","0.6 0.5 1.1","pi")}<div class="t"><small>طلب خاص</small><b>لم تجدي مقاسك؟<br>نحيكه على مقاساتك بالضبط</b><span>أرسلي مقاساتك{ic("arrow_back")}</span></div></div>'
    grid = ''.join(cards[:4]) + promo + ''.join(cards[4:])
    return f'''<div class="screen">{STATUS}
<div class="lh"><div class="cb">{ic("arrow_forward")}</div><div class="tt"><b>ملابس محاكة</b><small>240 قطعة · كلها مصنوعة يدوياً</small></div><div class="cb">{ic("search")}</div><div class="cb">{ic("shopping_bag")}<i class="n">2</i></div></div>
<div class="hscroll chips"><div class="chip">الكل</div><div class="chip on">كارديغان وكنزات <small>110</small></div><div class="chip">أوشحة <small>37</small></div><div class="chip">قبعات</div><div class="chip">قفازات</div><div class="chip">للأطفال</div></div>
<div class="fbar"><div class="fb">{ic("tune")}تصفية<span class="c">3</span></div><div class="fb grow"><span>ترتيب: <b>الأحدث</b></span>{ic("expand_more")}</div><div class="fb">{ic("schedule")}جاهز للشحن</div></div>
<div class="atags"><span class="atag">صوف ميرينو{ic("close")}</span><span class="atag">ألوان دافئة{ic("close")}</span><span class="atag">مقاس M{ic("close")}</span><a>مسح الكل</a></div>
<div class="cnt"><span><b>110</b> قطعة</span><span>شحن مجاني فوق 1,500 {CUR}</span></div>
<div class="grid">{grid}</div>
<div class="more"><p>عرضنا 8 من 110</p><div class="pg"><i></i></div><div class="mb">حمّلي المزيد{ic("expand_more")}</div></div>
{tabbar(1)}
</div>'''


def product():
    T = C + "teddy-sweater.jpg"
    return f'''<div class="screen" style="padding-bottom:112px">{STATUS}
<div class="lh"><div class="cb">{ic("arrow_forward")}</div><div class="tt"></div><div class="cb">{ic("ios_share")}</div><div class="cb">{ic("favorite")}</div></div>
{ph(T,"0.54 0.55 1.45","gal",f'<div class="gt"><span class="b">{ic("back_hand")}صناعة يدوية</span><span class="b" style="direction:ltr">1 / 5</span></div><div class="gd"><i class="on"></i><i></i><i></i><i></i><i></i></div>')}
<div class="thm">{ph(T,"0.54 0.55 1.7","on")}{ph(T,"0.53 0.33 4.0")}{ph(T,"0.55 0.62 3.6")}{ph(C+"bunny-knit.jpg","0.78 0.5 1.6")}{ph(C+"yarn-balls.jpg","0.6 0.5 1.1")}</div>
<div class="pinf"><div class="mkr"><i>س</i><span>من يد <b>سعاد · حرفية منذ 15 عاماً</b></span><span class="hm">{ic("verified","fill")}أصلي</span></div>
<h1>الدبدوب «بُندق» بكنزته الزرقاء</h1><div class="sb">أميغورومي محاك بالكروشيه من قطن مصري ناعم · 28 سم</div>
<div class="prc"><b>1,150 <small>{CUR}</small></b><s>1,350</s><span class="off">-15%</span><span class="rt">{ic("star","fill")}4.9<small>(186)</small></span></div></div>
<div class="dtm"><div class="r">{ic("hourglass_top")}<div><b>يُصنع خصيصاً لكِ خلال 5 أيام</b><small>ثم يُشحن خلال 48 ساعة · يصل تقريباً الخميس 4 ديسمبر</small></div></div>
<div class="tl"><i class="on"></i><em class="on"></em><i class="on"></i><em></em><i></i><em></em><i></i></div><div class="tll"><span>تأكيد الطلب</span><span>الحياكة</span><span>التشطيب</span><span>الشحن</span></div></div>
<div class="opt"><div class="oh"><span><b style="color:var(--ink)">لون الكنزة:</b> أزرق نيلي</span><a>كل الألوان</a></div>
<div class="ycol"><div class="on"><i style="background:#3E5E9A"></i><span>نيلي</span></div><div><i style="background:#B4553C"></i><span>قرفة</span></div><div><i style="background:#5E6B4E"></i><span>زيتوني</span></div><div><i style="background:#E7DED2"></i><span>كريمي</span></div><div><i style="background:#D9A3A0"></i><span>وردي</span></div></div></div>
<div class="opt"><div class="oh"><span><b style="color:var(--ink)">الحجم</b></span><a>دليل المقاسات</a></div>
<div class="szs"><div>صغير<small>20 سم</small></div><div class="on">وسط<small>28 سم</small></div><div>كبير<small>40 سم · +450</small></div></div></div>
<div class="pers">{ic("edit")}<div><b>تطريز اسم على الكنزة</b><small>حتى 8 حروف · +120 {CUR} · يومان إضافيان</small></div><span class="tg"></span></div>

<div class="blk"><h4>{ic("info")}تفاصيل القطعة</h4><div class="spec">
<div><small>الخيط</small><b>قطن مصري 100%</b></div><div><small>الحشو</small><b>ألياف مضادة للحساسية</b></div>
<div><small>العيون</small><b>مطرّزة · آمنة للرضّع</b></div><div><small>الغرز</small><b>نحو 6,400 غرزة</b></div></div></div>

<div class="story">{ph(C+"knit-flatlay.jpg","0.25 0.6 1.2","si")}<div class="sb"><small>حكاية الصانعة</small><h4>سعاد تحيك من شرفة بيتها في طنطا</h4><p>تعلّمت الكروشيه من جدتها، وتصنع اليوم كل «بُندق» بيديها من أول غرزة حتى آخر عقدة، وتضع داخله ورقة صغيرة باسمها.</p><div class="sg"><i>س</i><div><b>سعاد إبراهيم</b><br><small>صنعت 420 دبدوباً حتى الآن</small></div></div></div></div>

<div class="blk"><h4>{ic("spa")}العناية بالقطعة</h4><div class="care">
<div>{ic("local_laundry_service")}<span>غسيل يدوي بماء فاتر</span></div><div>{ic("dry")}<span>تجفيف مسطّح في الظل</span></div><div>{ic("iron")}<span>بدون كيّ مباشر</span></div><div>{ic("child_care")}<span>مناسب من عمر 0+</span></div></div></div>

<div class="ship"><div>{ic("local_shipping")}<div><b>توصيل لكل المحافظات</b><small>مجاني فوق 1,500 {CUR} · 60 {CUR} داخل القاهرة</small></div></div>
<div>{ic("autorenew")}<div><b>استبدال خلال 14 يوماً</b><small>القطع المخصّصة بالاسم غير قابلة للاسترجاع</small></div></div>
<div>{ic("payments")}<div><b>الدفع عند الاستلام متاح</b><small>أو بالتقسيط على 3 أشهر</small></div></div></div>

<div class="acc"><div class="ac"><div class="ah">الوصف{ic("remove")}</div><p>رفيق ناعم لأول سنوات طفلك؛ أطرافه مثبّتة بغرز مزدوجة، وكنزته قابلة للخلع.</p></div><div class="ac"><div class="ah">المقاسات والوزن{ic("add")}</div></div><div class="ac"><div class="ah">التغليف كهدية{ic("add")}</div></div></div>

<div class="sec" style="margin-top:28px"><div class="shd"><div><h3>{ic("reviews")}آراء العميلات</h3></div><a>كل التقييمات{ic("chevron_left")}</a></div>
<div class="blk" style="margin-top:0"><div class="rsm"><div class="bg"><b>4.9</b>{stars()}<small>186 تقييماً</small></div>
<div class="bars"><div>5<i><em style="width:90%"></em></i></div><div>4<i><em style="width:7%"></em></i></div><div>3<i><em style="width:2%"></em></i></div><div>2<i><em style="width:1%"></em></i></div><div>1<i><em style="width:0%"></em></i></div></div></div>
<div class="rph">{ph(T,"0.3 0.5 1.4")}{ph(C+"fluffy-blanket.jpg","0.85 0.75 1.8")}{ph(C+"bunny-knit.jpg","0.78 0.5 1.6")}{ph(C+"snowman-plush.jpg","0.5 0.5 1.4","m")}</div>
<div class="rq"><div class="w"><i>د</i><div><b>دينا فؤاد</b><small>القاهرة · هدية لمولود</small></div>{stars()}</div><p>أجمل هدية قدمتها! الشغل متقن والاسم المطرّز على الكنزة كان مفاجأة لأم المولود.</p></div></div></div>

<div class="sec"><div class="shd"><div><h3>يكمّل الهدية</h3><div class="sub">صندوق مولود جاهز</div></div><a>اصنعي صندوقاً{ic("chevron_left")}</a></div>
<div class="hscroll prow">
{pc("fluffy-blanket.jpg","0.85 0.75 1.6","بطانية مولود «سحاب»","قطن ناعم · 80×100","1,400",days=8)}
{pc("bunny-knit.jpg","0.78 0.5 1.4","الأرنب «جزرة»","أميغورومي · كتان","890",days=4)}
{pc("socks.jpg","0.45 0.5 1.3","جوارب رضّع صوفية","صوف ناعم","260",days=2)}
</div></div>
<div class="sec"><div class="shd"><div><h3>قد يعجبك أيضاً</h3></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="grid">
{pc("snowman-plush.jpg","0.5 0.5 1.3","رجل الثلج «لؤلؤ»","أميغورومي · صوف","780",bd="موسمي",days=4)}
{pc("gnomes.jpg","0.5 0.42 1.15","ثلاثي الأقزام «حكاية»","3 دُمى · صوف وفرو","1,350",days=6)}
</div></div>
<div class="sticky"><div class="cu">{ic("design_services")}خصّصيها</div><div class="ad"><span>{ic("shopping_bag")}أضيفي للسلة</span><em>1,150 {CUR}</em></div><div class="homeind"></div></div>
</div>'''


SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
