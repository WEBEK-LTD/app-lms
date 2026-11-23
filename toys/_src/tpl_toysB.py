from lib import STATUS, ic, ph

FONT = "rubik"
TITLE = "Mukaab"
CUR = "د.إ"
T = "toys/"

CSS = """
:root{--bg:#F2F3F6;--surface:#FFFFFF;--soft:#EAECF1;--soft2:#DEE1E8;--ink:#12151C;--ink2:#505767;--ink3:#7A8191;--line:#E2E5EB;
--acc:#2F4FE0;--accT:#2F4FE0;--accSoft:#E7EBFE;--night:#12151C;--night2:#1C2030;--tile:#ECEDF1;--star:#12151C;--warn:#A15C00;--warnSoft:#FFF3E0}
html.dark{--bg:#0B0D12;--surface:#151820;--soft:#1E222D;--soft2:#2A2F3C;--ink:#F1F3F8;--ink2:#AAB1C0;--ink3:#7E8697;--line:#232834;
--acc:#4462F0;--accT:#9CB0FF;--accSoft:#1A2146;--night:#1A1E2A;--night2:#232838;--tile:#E7E9EE;--star:#F1F3F8;--warn:#F2B661;--warnSoft:#2B2214}
body{font-family:'Rubik',sans-serif;line-height:1.4}
.screen{padding-bottom:120px}
.ms.f{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.ltr{direction:ltr;unicode-bidi:isolate}

/* header */
.header{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.wm{display:flex;align-items:center;gap:9px}
.wm b{font-size:23px;font-weight:700;letter-spacing:-.02em;line-height:1}
.wm small{display:block;font-size:9.5px;font-weight:500;letter-spacing:.34em;color:var(--ink3);direction:ltr;margin-top:4px;text-align:right}
.hic{display:flex;gap:8px}
.sq{width:42px;height:42px;border-radius:13px;background:var(--surface);display:grid;place-items:center;position:relative;color:var(--ink);box-shadow:0 0 0 1px var(--line)}
.sq .ms{font-size:22px}
.sq .n{position:absolute;top:7px;left:8px;width:9px;height:9px;border-radius:5px;background:var(--acc);box-shadow:0 0 0 2px var(--surface)}
.sq .c{position:absolute;top:-5px;left:-5px;min-width:19px;height:19px;border-radius:7px;background:var(--acc);color:#fff;font-size:10.5px;font-weight:600;display:grid;place-items:center;padding:0 5px;box-shadow:0 0 0 2px var(--bg)}

.search{margin:6px 16px 0;height:50px;border-radius:15px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:10px;padding:0 14px}
.search .ms{font-size:22px;color:var(--ink2)}
.search .t{flex:1;font-size:13px;color:var(--ink3)}
.search .kb{display:flex;gap:6px;align-items:center}
.search .kb i{width:1px;height:22px;background:var(--line)}
.search .kb .ms{color:var(--accT)}

/* section heads */
.sec{margin-top:30px}
.sh{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:14px}
.sh .k{font-size:11px;font-weight:600;color:var(--accT);letter-spacing:.04em;display:flex;align-items:center;gap:6px}
.sh .k i{width:16px;height:2px;background:var(--accT);display:block;border-radius:1px}
.sh h3{font-size:19px;font-weight:600;letter-spacing:-.01em;margin-top:3px;line-height:1.25}
.sh a{font-size:12.5px;font-weight:500;color:var(--ink);display:flex;align-items:center;gap:4px;height:32px;padding:0 6px 0 11px;border-radius:10px;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.sh a .ms{font-size:17px}

/* ages */
.agebox{margin:16px 16px 0}
.agebox .al{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--ink2);margin-bottom:9px}
.agebox .al b{color:var(--ink);font-weight:600}
.agebox .al span{font-size:11.5px;color:var(--accT);font-weight:500}
.ages{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.ag{height:64px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center}
.ag b{font-size:20px;font-weight:600;line-height:1;direction:ltr}
.ag small{font-size:10.5px;color:var(--ink3);margin-top:4px}
.ag.on{background:var(--acc);box-shadow:none;color:#fff}
.ag.on small{color:rgba(255,255,255,.82)}

/* hero */
.hero{margin-top:18px;gap:10px}
.hc{width:342px;height:224px;border-radius:22px;position:relative;overflow:hidden;background-color:#22262F}
.hc .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(10,12,18,.86) 0%,rgba(10,12,18,.45) 42%,rgba(10,12,18,0) 68%)}
.hc .lab{position:absolute;top:14px;right:14px;height:26px;padding:0 10px;border-radius:9px;background:rgba(18,21,28,.55);backdrop-filter:blur(8px);color:#fff;font-size:11px;font-weight:500;display:flex;align-items:center;gap:5px}
.hc .lab .ms{font-size:15px}
.hc .tx{position:absolute;right:18px;left:16px;bottom:16px;color:#fff;display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.hc h2{font-size:22px;font-weight:600;line-height:1.3;letter-spacing:-.01em}
.hc p{font-size:12px;color:rgba(255,255,255,.82);margin-top:3px}
.hc .go{flex:0 0 auto;height:42px;padding:0 14px 0 12px;border-radius:13px;background:var(--acc);display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500}
html.dark .hc .go{background:#4462F0}
.hc .go .ms{font-size:18px}
.prog{display:flex;align-items:center;gap:10px;margin:12px 16px 0}
.prog .pbars{flex:1;display:flex;gap:4px}
.prog .pbars i{flex:1;height:3px;border-radius:2px;background:var(--soft2)}
.prog .pbars i.on{background:var(--ink)}
.prog span{font-size:11.5px;color:var(--ink3);font-weight:500;direction:ltr}

/* category tiles */
.tiles{margin:0 16px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px 10px}
.tl{text-align:center}
.tl .ti{height:80px;border-radius:18px;background-color:var(--tile);position:relative;overflow:hidden}
.tl span{display:block;font-size:12px;font-weight:500;margin-top:7px;line-height:1.25}
.tl small{display:block;font-size:10.5px;color:var(--ink3)}

/* lab */
.lab2{margin:0 16px;border-radius:24px;background:var(--night);color:#fff;overflow:hidden}
.lab2 .li{height:170px;position:relative;background-color:#2A2F3C}
.lab2 .li .sc{position:absolute;inset:0;background:linear-gradient(0deg,#12151C 0%,rgba(18,21,28,0) 60%)}
html.dark .lab2 .li .sc{background:linear-gradient(0deg,#1A1E2A 0%,rgba(26,30,42,0) 60%)}
.lab2 .lt{padding:0 16px 16px;margin-top:-40px;position:relative}
.lab2 .lt small{font-size:11px;font-weight:600;color:#A9B8FF;letter-spacing:.04em}
.lab2 .lt h3{font-size:21px;font-weight:600;line-height:1.3;margin-top:2px}
.lab2 .lt p{font-size:12px;color:#B7BDCB;margin-top:3px}
.skt{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.skt>span{height:28px;padding:0 10px;border-radius:9px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);font-size:11.5px;color:#E7EAF2;display:flex;align-items:center;gap:5px}
.skt .ms{font-size:16px;color:#A9B8FF}
.mini{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.mn{display:flex;align-items:center;gap:12px;background:var(--night2);border-radius:16px;padding:8px}
.mn .mi{width:58px;height:58px;border-radius:12px;background-color:#ECEDF1;flex:0 0 auto}
.mn .mt{flex:1;min-width:0}
.mn .mt b{display:block;font-size:13px;font-weight:500}
.mn .mt small{display:block;font-size:11px;color:#9AA2B3;margin-top:1px}
.mn .mt em{display:block;font-size:14px;font-weight:600;margin-top:3px}
.mn .mt em small{display:inline;color:#B7BDCB;font-size:10.5px;font-weight:400}
.mn .pl{width:36px;height:36px;border-radius:11px;background:#4462F0;display:grid;place-items:center}
.mn .pl .ms{font-size:20px}

/* product card B */
.prow{gap:12px}
.pc{width:160px}
.pc .pi{height:170px;border-radius:18px;background-color:var(--tile);position:relative}
.pc .pi .ph0{position:absolute;inset:0;border-radius:18px;overflow:hidden}
.pc .pi .ph0:after{content:'';position:absolute;inset:0;background:#E9EBF0;mix-blend-mode:multiply;opacity:.4}
.agc{position:absolute;top:9px;right:9px;height:24px;padding:0 8px;border-radius:8px;background:rgba(18,21,28,.72);backdrop-filter:blur(6px);color:#fff;font-size:10.5px;font-weight:500;display:flex;align-items:center;gap:3px;z-index:2}
.bdg{position:absolute;top:39px;right:9px;height:22px;padding:0 7px;border-radius:7px;background:#2F4FE0;color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;z-index:2}
.bdg.ltr{direction:ltr}
.hrt{position:absolute;top:8px;left:8px;width:32px;height:32px;border-radius:11px;background:rgba(255,255,255,.9);display:grid;place-items:center;color:#12151C;z-index:2}
.hrt .ms{font-size:18px}
.hrt.on .ms{color:#2F4FE0;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.plus{position:absolute;bottom:-12px;left:10px;width:38px;height:38px;border-radius:12px;background:var(--acc);color:#fff;display:grid;place-items:center;box-shadow:0 0 0 4px var(--bg);z-index:2}
.plus .ms{font-size:21px}
.pc .mk{font-size:10.5px;color:var(--ink3);font-weight:500;margin-top:12px;letter-spacing:.02em}
.pc .nm{font-size:13.5px;font-weight:500;line-height:1.4;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .pr{display:flex;align-items:baseline;gap:6px;margin-top:4px}
.pc .pr b{font-size:15.5px;font-weight:600}
.pc .pr b small{font-size:10.5px;font-weight:400;color:var(--ink2)}
.pc .pr s{font-size:11px;color:var(--ink3)}
.pc .rt{display:flex;align-items:center;gap:3px;font-size:11px;color:var(--ink3);margin-right:auto}
.pc .rt .ms{font-size:13px;color:var(--star)}
.pc .rt b{font-size:11px;color:var(--ink);font-weight:500}
.g2{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:20px 12px}
.g2 .pc{width:auto}
.g2 .pi{height:180px}

/* gift */
.gf{margin:0 16px;border-radius:24px;background:var(--surface);box-shadow:0 0 0 1px var(--line);overflow:hidden}
.gf .gh{height:120px;position:relative;background-color:var(--tile)}
.gf .gh .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(255,255,255,.92) 0%,rgba(255,255,255,.6) 45%,rgba(255,255,255,0) 75%)}
html.dark .gf .gh .sc{background:linear-gradient(270deg,rgba(21,24,32,.95) 0%,rgba(21,24,32,.65) 45%,rgba(21,24,32,0) 75%)}
.gf .gh .gt{position:absolute;right:16px;top:18px;width:190px}
.gf .gh .gt small{font-size:11px;font-weight:600;color:var(--accT);display:flex;align-items:center;gap:4px}
.gf .gh .gt small .ms{font-size:15px}
.gf .gh .gt b{display:block;font-size:19px;font-weight:600;line-height:1.3;margin-top:3px}
.gf .gb{padding:4px 16px 16px}
.step{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}
.step .n{width:24px;height:24px;border-radius:8px;background:var(--soft);font-size:11.5px;font-weight:600;display:grid;place-items:center;flex:0 0 auto}
.step .l{font-size:12.5px;color:var(--ink2);width:62px;flex:0 0 auto}
.step .ch{display:flex;gap:6px;flex-wrap:nowrap}
.step .ch i{height:30px;padding:0 11px;border-radius:9px;background:var(--soft);font-size:12px;display:flex;align-items:center;white-space:nowrap}
.step .ch i.on{background:var(--acc);color:#fff;font-weight:500}
.gcta{margin-top:14px;display:flex;gap:8px}
.gcta .b1{flex:1;height:48px;border-radius:14px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;gap:7px;font-size:13.5px;font-weight:500}
.gcta .b1 .ms{font-size:19px}
.wrapb{margin:10px 16px 0;border-radius:20px;background:var(--night);color:#fff;display:flex;align-items:center;gap:12px;padding:8px 14px 8px 8px}
.wrapb .wi{width:76px;height:76px;border-radius:14px;flex:0 0 auto;background-color:#333}
.wrapb b{display:block;font-size:14.5px;font-weight:600}
.wrapb small{display:block;font-size:11.5px;color:#B7BDCB;margin-top:2px;line-height:1.45}
.wrapb .ms.ar{font-size:20px;color:#A9B8FF;margin-right:auto}

/* bundle */
.bun{margin:0 16px;border-radius:24px;background:var(--accSoft);padding:16px}
.bun .bt{display:flex;justify-content:space-between;align-items:flex-start}
.bun .bt small{font-size:11px;color:var(--accT);font-weight:600}
.bun .bt b{display:block;font-size:18px;font-weight:600;margin-top:2px}
.bun .bt p{font-size:12px;color:var(--ink2);margin-top:2px}
.bun .sv{font-size:11.5px;font-weight:600;color:#fff;background:var(--acc);padding:4px 9px;border-radius:8px;white-space:nowrap}
.bims{display:flex;align-items:center;gap:6px;margin-top:14px}
.bims div{flex:1;height:86px;border-radius:14px;background-color:var(--tile)}
.bims .ms{font-size:18px;color:var(--accT);flex:0 0 auto}
.bfoot{display:flex;align-items:center;justify-content:space-between;margin-top:14px}
.bfoot .p b{font-size:20px;font-weight:600}
.bfoot .p b small{font-size:11px;font-weight:400;color:var(--ink2)}
.bfoot .p s{font-size:12px;color:var(--ink3);margin-right:6px}
.bfoot .ab{height:44px;padding:0 16px;border-radius:13px;background:var(--acc);color:#fff;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500}
.bfoot .ab .ms{font-size:18px}

/* safety stats */
.stats{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.stt{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:20px;padding:12px 14px}
.stt .ms{font-size:22px;color:var(--accT)}
.stt b{display:block;font-size:22px;font-weight:600;margin-top:6px;line-height:1;direction:ltr;text-align:right}
.stt span{display:block;font-size:12px;color:var(--ink2);margin-top:6px;line-height:1.4}

/* tab bar */
.tabbar{position:absolute;left:16px;right:16px;bottom:24px;height:64px;border-radius:22px;background:rgba(255,255,255,.88);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:space-between;padding:0 10px;box-shadow:0 0 0 1px rgba(18,21,28,.06),0 14px 34px rgba(18,21,28,.14)}
html.dark .tabbar{background:rgba(28,32,44,.92);box-shadow:0 0 0 1px rgba(255,255,255,.07),0 14px 30px rgba(0,0,0,.55)}
.tab{display:flex;align-items:center;justify-content:center;gap:6px;color:var(--ink3);font-size:12px;font-weight:500;height:44px;border-radius:14px;position:relative;min-width:44px}
.tab .ms{font-size:23px}
.tab .lb{display:none}
.tab.on{background:var(--acc);color:#fff;padding:0 14px 0 12px}
.tab.on .lb{display:block}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tab .bd{position:absolute;top:4px;left:2px;min-width:17px;height:17px;border-radius:6px;background:var(--acc);color:#fff;font-size:10px;font-weight:600;display:grid;place-items:center;font-style:normal;padding:0 4px}
.homeind{position:absolute;bottom:8px;left:50%;width:134px;margin-left:-67px;height:5px;border-radius:3px;background:var(--ink)}

/* top bar */
.topbar{height:58px;display:flex;align-items:center;gap:10px;padding:0 16px}
.topbar .tt{flex:1;min-width:0}
.topbar .tt b{display:block;font-size:18px;font-weight:600;line-height:1.25}
.topbar .tt small{display:block;font-size:11.5px;color:var(--ink3)}
.topbar .grp{display:flex;gap:8px}
.chips{gap:8px;margin-top:6px}
.chip{height:36px;padding:0 13px;border-radius:11px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink2);white-space:nowrap}
.chip.on{background:var(--ink);color:var(--bg);box-shadow:none;font-weight:500}
.chip small{font-size:11px;opacity:.7}

/* MENU */
.mtop{display:flex;align-items:center;justify-content:space-between;padding:4px 16px 0;height:58px}
.mq{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 16px 0}
.mq div{height:74px;border-radius:16px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:10px;display:flex;flex-direction:column;justify-content:space-between;font-size:11.5px;font-weight:500}
.mq div .ms{font-size:21px;color:var(--accT)}
.mq div.on{background:var(--acc);color:#fff;box-shadow:none}
.mq div.on .ms{color:#fff}
.mrow0{margin-top:18px}
.mh{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:11px}
.mh .l{display:flex;align-items:baseline;gap:8px}
.mh .l i{font-size:11.5px;font-weight:600;color:var(--accT);direction:ltr}
.mh .l b{font-size:16.5px;font-weight:600}
.mh .l small{font-size:11.5px;color:var(--ink3)}
.mh a{font-size:12px;font-weight:500;color:var(--ink2);display:flex;align-items:center;gap:2px}
.mh a .ms{font-size:17px}
.mrow{gap:10px}
.mc{width:96px}
.mc .im{height:94px;border-radius:18px;background-color:var(--tile)}
.mc span{display:block;font-size:12px;font-weight:500;margin-top:7px;line-height:1.3}
.mc small{display:block;font-size:10.5px;color:var(--ink3)}
.mc.all .im{background:var(--acc);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:11px}
.mc.all .im .ms{font-size:24px}
.mc.all .im .ms.a2{font-size:18px;align-self:flex-start;width:28px;height:28px;border-radius:9px;background:rgba(255,255,255,.18);display:grid;place-items:center}
.mc.all .im b{font-size:20px;font-weight:600;line-height:1;direction:ltr;text-align:right}
.mfoot{margin:28px 16px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mf{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:12px;display:flex;align-items:center;gap:10px;position:relative}
.mf .ms{font-size:22px;color:var(--ink)}
.mf b{font-size:13.5px;font-weight:600;display:block}
.mf small{font-size:11px;color:var(--ink3);display:block;margin-top:1px}
.mf .tag2{position:absolute;top:10px;left:10px;font-size:10.5px;font-weight:600;color:var(--accT);background:var(--accSoft);padding:2px 7px;border-radius:6px;margin-top:2px}
.mlist{margin:8px 16px 0;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:18px;padding:2px 14px}
.mli{display:flex;align-items:center;gap:12px;height:54px;border-bottom:1px solid var(--line)}
.mli:last-child{border:0}
.mli .ms.l{font-size:22px}
.mli .t{flex:1;font-size:13.5px;font-weight:500}
.mli small{font-size:11.5px;color:var(--ink3)}
.mli .ms.c{font-size:18px;color:var(--ink3)}
.seg2{display:flex;background:var(--soft);border-radius:11px;padding:3px}
.seg2 i{font-size:11.5px;padding:5px 11px;border-radius:9px;color:var(--ink2)}
.seg2 i.on{background:var(--surface);color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.mhelp{margin:8px 16px 0;display:flex;gap:8px}
.mhelp div{flex:1;height:50px;border-radius:15px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;gap:7px;font-size:13px;font-weight:500}
.mhelp div.o{background:var(--surface);color:var(--ink);box-shadow:0 0 0 1px var(--line)}
.mhelp .ms{font-size:20px}
.mver{text-align:center;font-size:11px;color:var(--ink3);margin-top:16px}

/* LISTING */
.fbar{display:flex;gap:8px;margin:14px 16px 0}
.fb{height:42px;border-radius:13px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;padding:0 12px;font-size:12.5px;font-weight:500;white-space:nowrap}
.fb .ms{font-size:19px}
.fb .c{min-width:19px;height:19px;border-radius:6px;background:var(--acc);color:#fff;font-size:10.5px;display:grid;place-items:center;padding:0 4px}
.fb.s{flex:1;justify-content:space-between;color:var(--ink2);font-weight:400}
.fb.s b{color:var(--ink);font-weight:500}
.fb.v{padding:0 11px}
.atags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 16px 0;align-items:center}
.atag{height:30px;padding:0 6px 0 10px;border-radius:9px;background:var(--accSoft);color:var(--accT);font-size:11.5px;font-weight:500;display:flex;align-items:center;gap:4px}
.atag .ms{font-size:15px}
.aclear{font-size:11.5px;color:var(--ink2);font-weight:500;margin-right:4px}
.rc{margin:16px 16px 12px;font-size:12px;color:var(--ink3);display:flex;justify-content:space-between}
.rc b{color:var(--ink);font-weight:600}
.promo{grid-column:1/-1;border-radius:22px;background:var(--night);color:#fff;display:flex;overflow:hidden;height:150px}
.promo .pp{width:140px;flex:0 0 auto;background-color:#333}
.promo .pt{flex:1;padding:16px;display:flex;flex-direction:column}
.promo .pt small{font-size:11px;color:#A9B8FF;font-weight:600}
.promo .pt b{font-size:16.5px;font-weight:600;line-height:1.35;margin-top:3px}
.promo .pt .cta{margin-top:auto;align-self:flex-start;height:34px;padding:0 12px;border-radius:10px;background:#4462F0;font-size:12px;font-weight:500;display:flex;align-items:center;gap:5px}
.promo .pt .cta .ms{font-size:16px}
.more{margin:28px 16px 0;text-align:center}
.more p{font-size:11.5px;color:var(--ink3)}
.more .pg{display:flex;gap:4px;justify-content:center;margin-top:8px}
.more .pg i{width:26px;height:3px;border-radius:2px;background:var(--soft2)}
.more .pg i.on{background:var(--ink)}
.more .mb{margin:14px auto 0;height:48px;width:220px;border-radius:14px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;font-weight:500}
.more .mb .ms{font-size:19px}

/* PRODUCT (grouped sections) */
.pscreen{padding-bottom:112px}
.gal{position:relative;margin:0 16px;height:360px;border-radius:24px;overflow:hidden;background-color:var(--tile)}
.gal .gt{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:flex-start}
.gal .gt .sq{background:rgba(255,255,255,.92);box-shadow:none;color:#12151C}
.gal .gt .sq.on .ms{color:#2F4FE0;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.gal .gn{position:absolute;bottom:12px;right:12px;height:28px;padding:0 10px;border-radius:9px;background:rgba(18,21,28,.7);backdrop-filter:blur(6px);color:#fff;font-size:11px;display:flex;align-items:center;gap:5px}
.gal .gn .ms{font-size:16px}
.gal .gd{position:absolute;bottom:14px;left:12px;display:flex;gap:4px;padding:8px 9px;border-radius:10px;background:rgba(18,21,28,.55)}
.gal .gd i{width:14px;height:3px;border-radius:2px;background:rgba(255,255,255,.45)}
.gal .gd i.on{background:#fff;width:22px}
.th{display:flex;gap:8px;margin:10px 16px 0}
.th div{width:62px;height:62px;border-radius:14px;background-color:var(--tile);position:relative;flex:0 0 auto}
.th div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--ink)}
.th div.v:after{content:'';position:absolute;inset:0;border-radius:14px;background:rgba(18,21,28,.5)}
.th div.v span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:12px;font-weight:600;z-index:1;direction:ltr}
.grp0{margin-top:16px;background:var(--surface);padding:18px 16px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.grp0+.grp0{margin-top:10px}
.mkr{display:flex;align-items:center;justify-content:space-between}
.mkr .m{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500}
.mkr .m i{width:26px;height:26px;border-radius:8px;background:var(--ink);color:var(--bg);display:grid;place-items:center;font-size:12px;font-weight:700;font-style:normal}
.mkr .rt{display:flex;align-items:center;gap:4px;font-size:12.5px;font-weight:600;height:28px;padding:0 9px;border-radius:9px;background:var(--soft)}
.mkr .rt .ms{font-size:15px;color:var(--star)}
.mkr .rt small{font-weight:400;color:var(--ink3);font-size:11.5px}
.grp0 h1{font-size:22px;font-weight:600;line-height:1.35;margin-top:10px;letter-spacing:-.01em}
.grp0 .sub{font-size:12.5px;color:var(--ink2);margin-top:2px}
.pr0{display:flex;align-items:center;gap:10px;margin-top:14px}
.pr0 b{font-size:28px;font-weight:600;line-height:1}
.pr0 b small{font-size:13px;font-weight:400;color:var(--ink2)}
.pr0 s{font-size:13px;color:var(--ink3)}
.pr0 .dc{font-size:12px;font-weight:600;color:#fff;background:var(--acc);padding:3px 8px;border-radius:8px;direction:ltr}
.vat{font-size:11.5px;color:var(--ink3);margin-top:5px}
.keys{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.keys div{background:var(--bg);border-radius:14px;padding:10px}
.keys .ms{font-size:19px;color:var(--accT)}
.keys b{display:block;font-size:13.5px;font-weight:600;margin-top:4px}
.keys small{display:block;font-size:10.5px;color:var(--ink3)}
.vh{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.vh b{font-size:14px;font-weight:600}
.vh b span{font-weight:400;color:var(--ink2)}
.vh a{font-size:12px;color:var(--accT);font-weight:500}
.sqsw{display:flex;gap:10px}
.sqsw div{width:56px;text-align:center}
.sqsw i{display:block;width:56px;height:56px;border-radius:15px;background-size:cover}
.sqsw div.on i{box-shadow:0 0 0 2px var(--surface),0 0 0 3.5px var(--ink)}
.sqsw span{display:block;font-size:11px;color:var(--ink2);margin-top:5px}
.sqsw div.on span{color:var(--ink);font-weight:600}
.opts{display:flex;flex-direction:column;gap:8px}
.op{display:flex;align-items:center;gap:12px;height:56px;border-radius:15px;box-shadow:0 0 0 1px var(--line);padding:0 14px}
.op .rd{width:20px;height:20px;border-radius:10px;box-shadow:inset 0 0 0 1.6px var(--soft2);flex:0 0 auto}
.op.on{box-shadow:0 0 0 1.8px var(--ink)}
.op.on .rd{box-shadow:inset 0 0 0 6px var(--ink)}
.op .ot{flex:1}
.op .ot b{display:block;font-size:13.5px;font-weight:600}
.op .ot small{display:block;font-size:11px;color:var(--ink3)}
.op em{font-size:13px;font-weight:600}
.op em small{font-size:10.5px;font-weight:400;color:var(--ink2)}
.h4{font-size:16.5px;font-weight:600;display:flex;justify-content:space-between;align-items:center}
.h4 small{font-size:11.5px;color:var(--ink3);font-weight:400}
.agerow{display:flex;gap:4px;margin-top:14px}
.agerow div{flex:1;text-align:center}
.agerow div i{display:block;height:34px;border-radius:9px;background:var(--soft);font-size:12px;font-weight:600;display:grid;place-items:center;color:var(--ink3);font-style:normal}
.agerow div.ok i{background:var(--accSoft);color:var(--accT)}
.agerow div.best i{background:var(--acc);color:#fff}
.agerow div.no i{background:repeating-linear-gradient(135deg,var(--soft) 0 6px,var(--bg) 6px 12px);color:var(--ink3)}
.agerow small{display:block;font-size:10px;color:var(--ink3);margin-top:5px}
.leg{display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--ink2)}
.leg span{display:flex;align-items:center;gap:5px}
.leg i{width:10px;height:10px;border-radius:3px;display:block}
.chk{display:flex;flex-direction:column;margin-top:8px}
.ck{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.ck:last-child{border:0;padding-bottom:0}
.ck .ms{font-size:22px;color:var(--accT)}
.ck b{display:block;font-size:13px;font-weight:500}
.ck small{display:block;font-size:11px;color:var(--ink3)}
.ck .st{margin-right:auto;font-size:10.5px;font-weight:600;color:var(--accT);background:var(--accSoft);padding:3px 8px;border-radius:7px;white-space:nowrap}
.choke{margin-top:12px;border-radius:14px;background:var(--warnSoft);color:var(--warn);padding:11px 12px;display:flex;gap:9px;font-size:12px;line-height:1.5;font-weight:500}
.choke .ms{font-size:20px}
.inbox{display:flex;gap:12px;margin-top:14px;align-items:stretch}
.inbox .bi{width:120px;flex:0 0 auto;border-radius:16px;background-color:var(--tile)}
.inbox ul{list-style:none;flex:1;display:flex;flex-direction:column;gap:7px}
.inbox li{display:flex;align-items:center;gap:8px;font-size:12.5px}
.inbox li b{min-width:30px;height:22px;border-radius:7px;background:var(--soft);font-size:11px;font-weight:600;display:grid;place-items:center;direction:ltr;padding:0 5px}
.skg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
.skc{background:var(--bg);border-radius:16px;padding:12px}
.skc .ms{font-size:22px;color:var(--accT)}
.skc b{display:block;font-size:13px;font-weight:600;margin-top:6px}
.skc small{display:block;font-size:11px;color:var(--ink3);line-height:1.4;margin-top:1px}
.skc .lv{display:flex;gap:3px;margin-top:8px}
.skc .lv i{flex:1;height:4px;border-radius:2px;background:var(--soft2)}
.skc .lv i.on{background:var(--acc)}
html.dark .skc .lv i.on{background:var(--accT)}
.dl{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)}
.dl:last-child{border:0;padding-bottom:0}
.dl:first-child{padding-top:4px}
.dl .ic0{width:40px;height:40px;border-radius:12px;background:var(--soft);display:grid;place-items:center;flex:0 0 auto}
.dl .ic0 .ms{font-size:21px}
.dl b{display:block;font-size:13px;font-weight:500}
.dl small{display:block;font-size:11.5px;color:var(--ink3)}
.ac{border-bottom:1px solid var(--line);padding:14px 0}
.ac:first-child{padding-top:0}
.ac:last-child{border:0;padding-bottom:0}
.ac .ah{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500}
.ac .ah .ms{font-size:20px;color:var(--ink3)}
.ac p{font-size:12.5px;color:var(--ink2);line-height:1.75;margin-top:6px}
.rvt{display:flex;align-items:center;gap:16px;margin-top:12px}
.rvt .big{width:96px;text-align:center}
.rvt .big b{font-size:40px;font-weight:600;line-height:1}
.rvt .big .stars{display:flex;justify-content:center;margin-top:5px}
.rvt .big .stars .ms{font-size:14px;color:var(--star)}
.rvt .big small{display:block;font-size:11px;color:var(--ink3);margin-top:3px}
.bars{flex:1;display:flex;flex-direction:column;gap:6px}
.bar{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--ink3)}
.bar i{flex:1;height:5px;border-radius:3px;background:var(--soft);overflow:hidden;display:block}
.bar i em{display:block;height:100%;background:var(--ink);border-radius:3px}
.rvp{display:flex;gap:8px;margin-top:14px}
.rvp div{flex:1;height:78px;border-radius:14px;background-color:var(--tile);position:relative}
.rvp div.mo:after{content:'+48';direction:ltr;position:absolute;inset:0;border-radius:14px;background:rgba(18,21,28,.55);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:600}
.rq{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.rq .who{display:flex;align-items:center;gap:9px}
.rq .who i{width:32px;height:32px;border-radius:10px;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;font-size:13px;font-weight:600;font-style:normal}
.rq .who b{display:block;font-size:12.5px;font-weight:500}
.rq .who small{display:block;font-size:11px;color:var(--ink3)}
.rq .who .stars{margin-right:auto;display:flex}
.rq .who .stars .ms{font-size:13px;color:var(--star)}
.rq p{font-size:12.5px;line-height:1.7;margin-top:8px}
.rq .tg{display:flex;gap:6px;margin-top:8px}
.rq .tg span{font-size:11px;color:var(--ink2);background:var(--soft);padding:3px 8px;border-radius:7px}
.gwl{display:flex;gap:10px;margin-top:12px}
.gwc{flex:1;background:var(--bg);border-radius:16px;padding:8px;position:relative}
.gwc .gi{height:92px;border-radius:12px;background-color:var(--tile)}
.gwc b{display:block;font-size:12px;font-weight:500;margin-top:7px;line-height:1.35}
.gwc em{display:block;font-size:13px;font-weight:600;margin-top:2px}
.gwc em small{font-size:10px;font-weight:400;color:var(--ink2)}
.gwc .ck3{position:absolute;top:14px;left:14px;width:24px;height:24px;border-radius:8px;background:var(--acc);color:#fff;display:grid;place-items:center}
.gwc .ck3.off{background:rgba(255,255,255,.92);box-shadow:inset 0 0 0 1.5px #C9CDD6}
.gwc .ck3 .ms{font-size:16px}
.gws{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
.gws span{font-size:12.5px;color:var(--ink2)}
.gws span b{color:var(--ink);font-size:15px;font-weight:600}
.gws .ab{height:40px;padding:0 14px;border-radius:12px;background:var(--ink);color:var(--bg);font-size:12.5px;font-weight:500;display:flex;align-items:center;gap:6px}
.gws .ab .ms{font-size:18px}
.sticky{position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:var(--surface);box-shadow:0 -1px 0 var(--line),0 -12px 30px rgba(0,0,0,.06);display:flex;gap:10px;align-items:center}
html.dark .sticky{box-shadow:0 -1px 0 var(--line),0 -12px 30px rgba(0,0,0,.45)}
.sticky .sp{flex:0 0 auto}
.sticky .sp small{display:block;font-size:11px;color:var(--ink3)}
.sticky .sp b{font-size:19px;font-weight:600}
.sticky .sp b small{display:inline;font-size:11px;font-weight:400;color:var(--ink2)}
.sticky .gift0{width:52px;height:52px;border-radius:15px;box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;flex:0 0 auto}
.sticky .gift0 .ms{font-size:22px}
.sticky .add{flex:1;height:52px;border-radius:15px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14.5px;font-weight:500}
.sticky .add .ms{font-size:20px}
"""

CUBE = '<svg width="34" height="34" viewBox="0 0 34 34"><rect width="34" height="34" rx="10" fill="#2F4FE0"/><path d="M17 7.5l8.5 4.7v9.6L17 26.5l-8.5-4.7v-9.6z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.8 12.3L17 17l8.2-4.7M17 17v9.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>'


def lt(s):
    return f'<span class="ltr" dir="ltr">{s}</span>'


def pc(img, f, mk, name, price, old=None, age=None, badge=None, fav=False, rate=None):
    a = f'<span class="agc">{age}</span>' if age else ''
    bd = ''
    if badge:
        bd = f'<span class="bdg ltr">{badge}</span>' if badge.startswith('-') else f'<span class="bdg">{badge}</span>'
    r = f'<span class="rt">{ic("star","f")}<b>{rate}</b></span>' if rate else ''
    o = f'<s>{old}</s>' if old else ''
    return f'''<div class="pc"><div class="pi">{ph(T+img, f, "ph0")}{a}{bd}<div class="hrt{" on" if fav else ""}">{ic("favorite")}</div><div class="plus">{ic("add")}</div></div>
<div class="mk">{mk}</div><div class="nm">{name}</div><div class="pr"><b>{price} <small>{CUR}</small></b>{o}{r}</div></div>'''


def tabbar(active=0):
    tabs = [("home", "الرئيسية"), ("category", "المتجر"), ("shopping_bag", "السلة"), ("package_2", "طلباتي"), ("person", "حسابي")]
    out = ''
    for i, (n, l) in enumerate(tabs):
        bd = '<i class="bd">2</i>' if n == 'shopping_bag' else ''
        out += f'<div class="tab{" on" if i == active else ""}">{ic(n)}<span class="lb">{l}</span>{bd}</div>'
    return f'<div class="tabbar">{out}</div><div class="homeind"></div>'


def home():
    ages = [("0+", "شهور", False), ("1+", "سنة", False), ("3+", "سنوات", True), ("5+", "سنوات", False), ("8+", "سنوات", False), ("12+", "سنة", False)]
    ageh = ''.join(f'<div class="ag{" on" if on else ""}"><b>{a}</b><small>{u}</small></div>' for a, u, on in ages)
    tiles = [("blocks-close.jpg", "0.5 0.5 1.2", "خشبية"), ("bricks-teal.jpg", "0.5 0.5 1.3", "بناء وتركيب"), ("bunny-knit.jpg", "0.68 0.4 1.4", "دُمى محشوّة"), ("backgammon.jpg", "0.3 0.55 1.8", "ألعاب لوحية"),
             ("telescope-globe.jpg", "0.43 0.42 2.6", "علوم"), ("crayons-pastel.jpg", "0.6 0.55 1.7", "فنون"), ("kite.jpg", "0.72 0.5 1.4", "خارجية"), ("crib-mobile.jpg", "0.6 0.4 1.3", "للرضّع")]
    tileh = ''.join(f'<div class="tl">{ph(T+i, f, "ti")}<span>{n}</span></div>' for i, f, n in tiles)
    trend = ''.join([
        pc("bricks-teal.jpg", "0.5 0.5 1.2", "استوديو موج", "مجموعة البناء «موج»", "289", "340", lt("6+") + " سنوات", "-15%", rate="4.9"),
        pc("crayons-pastel.jpg", "0.62 0.55 1.5", "دار ألوان", "أقلام «طيف» · 24 لوناً", "75", age=lt("3+") + " سنوات", rate="4.8"),
        pc("compass.jpg", "0.45 0.6 1.6", "مختبر مكعّب", "بوصلة المستكشف النحاسية", "120", age=lt("7+") + " سنوات", badge="جديد", fav=True, rate="5.0"),
    ])
    best = ''.join([
        pc("bunny-knit.jpg", "0.68 0.45 1.25", "مشغل قُطن", "أرنب «زهر» من الكتّان", "149", age="من الولادة", rate="4.9"),
        pc("blocks-close.jpg", "0.5 0.5 1.0", "ورشة خشب", "مكعبات «قوس قزح»", "185", "230", lt("1+") + " سنة", "-20%", rate="4.9"),
        pc("globes.jpg", "0.68 0.4 1.5", "مختبر مكعّب", "كرة أرضية «أطلس»", "215", age=lt("6+") + " سنوات", rate="4.7"),
        pc("bead-maze.jpg", "0.5 0.42 1.0", "ورشة خشب", "متاهة الخرز الدوّارة", "135", age=lt("1+") + " سنة", badge="الأكثر مبيعاً", fav=True, rate="4.8"),
    ])
    return f'''<div class="screen">{STATUS}
<div class="header"><div class="wm">{CUBE}<div><b>مكعّب</b><small>MUKAAB</small></div></div>
<div class="hic"><div class="sq">{ic("notifications")}<i class="n"></i></div><div class="sq">{ic("segment")}</div></div></div>
<div class="search">{ic("search")}<div class="t">ابحث عن لعبة، مهارة أو عمر…</div><div class="kb"><i></i>{ic("qr_code_scanner")}</div></div>
<div class="agebox"><div class="al"><span style="color:var(--ink2);font-size:12.5px;font-weight:400">تسوّق حسب عمر طفلك: <b>3 – 5 سنوات</b></span><span>تعديل</span></div><div class="ages">{ageh}</div></div>
<div class="hscroll hero">
{ph(T+"tent-family.jpg", "0.55 0.45 1.05", "hc", f'<div class="sc"></div><span class="lab">{ic("dark_mode")}مجموعة المستكشفين</span><div class="tx"><div><h2>مغامرات الليل<br>تبدأ من غرفة النوم</h2><p>خيام، مصابيح وكتب للاستكشاف</p></div><span class="go">اكتشف{ic("arrow_back")}</span></div>')}
{ph(T+"globes.jpg", "0.5 0.5 1.0", "hc")}
</div>
<div class="prog"><div class="pbars"><i class="on"></i><i></i><i></i><i></i></div><span>01 / 04</span></div>

<div class="sec"><div class="sh"><div><div class="k"><i></i>الأقسام</div><h3>ماذا يحب أن يلعب؟</h3></div><a>الكل{ic("arrow_back")}</a></div>
<div class="tiles">{tileh}</div></div>

<div class="sec"><div class="lab2">{ph(T+"telescope-globe.jpg", "0.42 0.45 1.6", "li", '<div class="sc"></div>')}
<div class="lt"><small>مختبر مكعّب · STEM</small><h3>علماء صغار، أسئلة كبيرة</h3><p>أدوات حقيقية مصمّمة لأيدٍ صغيرة من عمر 6 سنوات</p>
<div class="skt"><span>{ic("rocket_launch")}الفلك</span><span>{ic("explore")}الجغرافيا</span><span>{ic("engineering")}الهندسة</span><span>{ic("biotech")}التجارب</span></div>
<div class="mini">
<div class="mn">{ph(T+"telescope-globe.jpg", "0.43 0.45 3.0", "mi")}<div class="mt"><b>تلسكوب «مدار» للمبتدئين</b><small>تكبير حتى 90× · حامل ثلاثي</small><em>649 <small>{CUR}</small></em></div><span class="pl">{ic("add")}</span></div>
<div class="mn">{ph(T+"compass.jpg", "0.45 0.6 1.6", "mi")}<div class="mt"><b>حقيبة المستكشف</b><small>بوصلة، خريطة ودفتر ميداني</small><em>185 <small>{CUR}</small></em></div><span class="pl">{ic("add")}</span></div>
</div></div></div></div>

<div class="sec"><div class="sh"><div><div class="k"><i></i>رائج الآن</div><h3>الأكثر طلباً هذا الأسبوع</h3></div><a>الكل{ic("arrow_back")}</a></div>
<div class="hscroll prow">{trend}</div></div>

<div class="sec"><div class="gf">{ph(T+"gift-white.jpg", "0.3 0.5 1.15", "gh", f'<div class="sc"></div><div class="gt"><small>{ic("cake")}مساعد هدايا الميلاد</small><b>هدية تناسبه تماماً<br>في دقيقة واحدة</b></div>')}
<div class="gb">
<div class="step"><span class="n">1</span><span class="l">لمن؟</span><div class="ch"><i class="on">ولد</i><i>بنت</i><i>توأم</i><i>مفاجأة</i></div></div>
<div class="step"><span class="n">2</span><span class="l">العمر</span><div class="ch"><i>3</i><i class="on">4</i><i>5</i><i>6</i><i>7</i><i>8</i></div></div>
<div class="step" style="border:0"><span class="n">3</span><span class="l">الميزانية</span><div class="ch"><i>100</i><i class="on">250</i><i>500</i><i>أكثر</i></div></div>
<div class="gcta"><div class="b1">{ic("auto_awesome")}أرني 18 اقتراحاً</div></div></div></div>
<div class="wrapb">{ph(T+"gift-black.jpg", "0.45 0.45 1.5", "wi")}<div><b>تغليف فاخر وبطاقة باسمه</b><small>صندوق أسود بشريط ذهبي · مجاني<br>مع كل هدية فوق 150 {CUR}</small></div>{ic("arrow_back","ar")}</div></div>

<div class="sec"><div class="sh"><div><div class="k"><i></i>اختيارات الأهل</div><h3>الأعلى تقييماً</h3></div><a>الكل{ic("arrow_back")}</a></div>
<div class="g2">{best}</div></div>

<div class="sec"><div class="bun"><div class="bt"><div><small>صندوق جاهز</small><b>صندوق المولود الجديد</b><p>4 قطع مختارة للأشهر الأولى</p></div><span class="sv">وفّر 20%</span></div>
<div class="bims">{ph(T+"crib-mobile.jpg","0.6 0.4 1.3")}{ic("add")}{ph(T+"bear-mint.jpg","0.5 0.55 1.1")}{ic("add")}{ph(T+"bead-maze.jpg","0.5 0.42 1.2")}{ic("add")}{ph(T+"gift-kraft.jpg","0.47 0.45 1.7")}</div>
<div class="bfoot"><div class="p"><b>399 <small>{CUR}</small></b><s>499 {CUR}</s></div><span class="ab">{ic("add_shopping_cart")}أضف الصندوق</span></div></div></div>

<div class="sec"><div class="sh"><div><div class="k"><i></i>وعدنا لك</div><h3>آمنة قبل أن تكون ممتعة</h3></div></div>
<div class="stats">
<div class="stt">{ic("verified_user")}<b>EN71</b><span>كل لعبة مختبرة وفق معايير السلامة الأوروبية</span></div>
<div class="stt">{ic("science")}<b>+180</b><span>اختبار سلامة ومواد قبل طرح أي لعبة</span></div>
<div class="stt">{ic("eco")}<b>100%</b><span>تغليف ورقي قابل لإعادة التدوير</span></div>
<div class="stt">{ic("autorenew")}<b>30</b><span>يوماً للإرجاع المجاني من باب بيتك</span></div></div></div>
{tabbar(0)}
</div>'''


MENU = [
    ("toys", "الألعاب الخشبية", "860", [
        ("wooden-figures.jpg", "0.2 0.58 1.3", "شخصيات وبيوت", "124"),
        ("blocks-close.jpg", "0.5 0.5 1.2", "مكعبات", "96"),
        ("bunny-eggs.jpg", "0.42 0.7 2.4", "ألعاب الفرز", "71"),
        ("plane.jpg", "0.52 0.68 2.8", "مركبات", "88")]),
    ("deployed_code", "البناء والتركيب", "540", [
        ("bricks-teal.jpg", "0.5 0.5 1.4", "مكعبات تركيب", "212"),
        ("block-tower.jpg", "0.7 0.3 1.0", "أبراج وأقواس", "51"),
        ("lego-kid.jpg", "0.78 0.6 1.7", "للصغار", "86"),
        ("bricks-pile.jpg", "0.5 0.5 1.7", "علب كبيرة", "64")]),
    ("science", "العلوم والاستكشاف", "320", [
        ("telescope-globe.jpg", "0.43 0.42 2.7", "الفلك", "34"),
        ("globes.jpg", "0.68 0.4 1.6", "الجغرافيا", "29"),
        ("compass.jpg", "0.45 0.6 1.8", "أدوات المستكشف", "41"),
        ("letters.jpg", "0.3 0.6 1.6", "الحروف والأرقام", "58")]),
    ("pets", "الدُمى المحشوّة", "410", [
        ("bear-sweater.jpg", "0.5 0.3 2.0", "دببة", "138"),
        ("bunny-knit.jpg", "0.68 0.38 1.5", "أرانب", "64"),
        ("snowman-plush.jpg", "0.62 0.45 1.6", "موسمية", "37"),
        ("cuddly-bear.jpg", "0.4 0.4 1.5", "رفقاء النوم", "92")]),
    ("palette", "الفنون والموسيقى", "290", [
        ("crayons-pastel.jpg", "0.6 0.55 1.8", "رسم وتلوين", "118"),
        ("beads-kid.jpg", "0.52 0.6 1.5", "خرز وحِرف", "76"),
        ("ukulele.jpg", "0.5 0.72 1.3", "آلات موسيقية", "41"),
        ("backgammon.jpg", "0.3 0.55 1.8", "ألعاب لوحية", "84")]),
    ("park", "الألعاب الخارجية", "290", [
        ("kite.jpg", "0.72 0.5 1.4", "طائرات ورقية", "31"),
        ("bubbles-girl.jpg", "0.66 0.45 1.5", "فقاعات", "22"),
        ("football-boy.jpg", "0.55 0.55 1.1", "كرات", "67"),
        ("tricycle.jpg", "0.57 0.62 2.8", "دراجات", "38")]),
    ("child_care", "الرضّع والصغار", "380", [
        ("crib-mobile.jpg", "0.6 0.4 1.3", "معلّقات المهد", "46"),
        ("bead-maze.jpg", "0.5 0.42 1.0", "متاهات الخرز", "52"),
        ("toddler-bear.jpg", "0.18 0.55 1.4", "دمى ناعمة", "88"),
        ("sleeping-baby.jpg", "0.3 0.62 1.3", "مستلزمات النوم", "35")]),
]


def menu():
    rows = ''
    for k, (icn, name, cnt, subs) in enumerate(MENU):
        cards = f'<div class="mc all"><div class="im">{ic(icn)}<b>{cnt}</b>{ic("arrow_back","a2")}</div><span>كل القسم</span><small>{cnt} لعبة</small></div>'
        for img, f, n, c in subs:
            cards += f'<div class="mc">{ph(T+img, f, "im")}<span>{n}</span><small>{c} لعبة</small></div>'
        rows += f'''<div class="mrow0"><div class="mh"><div class="l"><i>0{k+1}</i><b>{name}</b><small>· {len(subs)} أقسام</small></div><a>الكل{ic("chevron_left")}</a></div>
<div class="hscroll mrow">{cards}</div></div>'''
    return f'''<div class="screen" style="padding-bottom:40px">{STATUS}
<div class="mtop"><div class="wm">{CUBE}<div><b>مكعّب</b><small>MUKAAB</small></div></div><div class="sq">{ic("close")}</div></div>
<div class="search">{ic("search")}<div class="t">ابحث في كل الأقسام…</div><div class="kb"><i></i>{ic("qr_code_scanner")}</div></div>
<div class="mq"><div class="on">{ic("child_care")}حسب العمر</div><div>{ic("cake")}هدايا الميلاد</div><div>{ic("bolt")}وصل حديثاً</div><div>{ic("sell")}العروض</div></div>
{rows}
<div class="mfoot">
<div class="mf">{ic("person")}<div><b>حسابي</b><small>خالد الهاشمي</small></div></div>
<div class="mf">{ic("package_2")}<div><b>طلباتي</b><small>رقم 4821</small></div><span class="tag2">يصل اليوم</span></div>
</div>
<div class="mlist">
<div class="mli">{ic("favorite","l")}<span class="t">المفضلة</span><small>12 لعبة</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("language","l")}<span class="t">اللغة</span><div class="seg2"><i class="on">العربية</i><i>English</i></div></div>
<div class="mli">{ic("support_agent","l")}<span class="t">تواصل معنا</span><small>يومياً 9ص – 10م</small>{ic("chevron_left","c")}</div>
</div>
<div class="mhelp"><div>{ic("chat")}محادثة فورية</div><div class="o">{ic("call")}اتصل بنا</div></div>
<div class="mver">مكعّب · الإصدار 1.8</div>
<div class="homeind"></div>
</div>'''


def listing():
    P = [
        pc("telescope-globe.jpg", "0.43 0.45 2.2", "مختبر مكعّب", "تلسكوب «مدار» للمبتدئين", "649", "749", lt("8+") + " سنوات", "-13%", rate="4.8"),
        pc("bricks-teal.jpg", "0.5 0.5 1.2", "استوديو موج", "مجموعة البناء «موج»", "289", None, lt("6+") + " سنوات", "الأكثر مبيعاً", fav=True, rate="4.9"),
        pc("globes.jpg", "0.68 0.4 1.5", "مختبر مكعّب", "كرة أرضية «أطلس»", "215", None, lt("6+") + " سنوات", rate="4.7"),
        pc("compass.jpg", "0.45 0.6 1.6", "مختبر مكعّب", "بوصلة المستكشف النحاسية", "120", None, lt("7+") + " سنوات", "جديد", rate="5.0"),
        pc("crayons-pastel.jpg", "0.62 0.55 1.5", "دار ألوان", "أقلام «طيف» · 24 لوناً", "75", None, lt("3+") + " سنوات", rate="4.8"),
        pc("beads-kid.jpg", "0.6 0.72 2.2", "دار ألوان", "حقيبة فن الخرز", "95", "120", lt("5+") + " سنوات", "-20%", rate="4.6"),
        pc("letters.jpg", "0.3 0.6 1.5", "ورشة خشب", "طوابع الحروف الخشبية", "155", None, lt("4+") + " سنوات", rate="4.8"),
        pc("ukulele.jpg", "0.5 0.72 1.25", "نغم", "يوكوليلي المبتدئ", "260", None, lt("5+") + " سنوات", fav=True, rate="4.9"),
    ]
    promo = f'<div class="promo">{ph(T+"globes.jpg", "0.42 0.4 1.2", "pp")}<div class="pt"><small>عرض المستكشفين</small><b>اشترِ أداتين علميتين<br>واحصل على الثالثة مجاناً</b><span class="cta">تسوّق العرض{ic("arrow_back")}</span></div></div>'
    grid = ''.join(P[:4]) + promo + ''.join(P[4:])
    return f'''<div class="screen">{STATUS}
<div class="topbar"><div class="sq">{ic("arrow_forward")}</div><div class="tt"><b>العلوم والاستكشاف</b><small>320 لعبة · من عمر {lt("3+")}</small></div><div class="grp"><div class="sq">{ic("search")}</div><div class="sq">{ic("shopping_bag")}<i class="c">2</i></div></div></div>
<div class="hscroll chips"><div class="chip on">الكل <small>320</small></div><div class="chip">الفلك <small>34</small></div><div class="chip">الجغرافيا</div><div class="chip">أدوات المستكشف</div><div class="chip">الحروف والأرقام</div></div>
<div class="fbar"><div class="fb">{ic("tune")}تصفية<span class="c">3</span></div><div class="fb s"><span>ترتيب: <b>الأعلى تقييماً</b></span>{ic("expand_more")}</div><div class="fb v">{ic("grid_view")}</div></div>
<div class="atags"><span class="atag">{lt("5–8")} سنوات{ic("close")}</span><span class="atag">STEM{ic("close")}</span><span class="atag">حتى 700 {CUR}{ic("close")}</span><span class="aclear">مسح الكل</span></div>
<div class="rc"><span><b>86</b> نتيجة</span><span>تصل غداً إلى دبي</span></div>
<div class="g2">{grid}</div>
<div class="more"><p>عرضت 8 من 86 لعبة</p><div class="pg"><i class="on"></i><i></i><i></i><i></i></div><div class="mb">عرض المزيد{ic("expand_more")}</div></div>
{tabbar(1)}
</div>'''


def product():
    b = "bricks-teal.jpg"
    stars = ''.join(ic("star", "f") for _ in range(5))
    return f'''<div class="screen pscreen">{STATUS}
<div class="topbar"><div class="sq">{ic("arrow_forward")}</div><div class="tt"></div><div class="grp"><div class="sq">{ic("ios_share")}</div><div class="sq">{ic("shopping_bag")}<i class="c">2</i></div></div></div>
{ph(T+b, "0.5 0.5 1.0", "gal", f'<div class="gt"><span class="agc" style="position:static;height:28px;font-size:11.5px;padding:0 10px">{lt("6+")} سنوات</span><div class="sq on">{ic("favorite")}</div></div><span class="gn">{ic("view_in_ar")}عرض 360°</span><div class="gd"><i class="on"></i><i></i><i></i><i></i><i></i></div>')}
<div class="th">{ph(T+b,"0.5 0.5 1.0","on")}{ph(T+b,"0.7 0.8 2.2")}{ph(T+b,"0.3 0.3 2.4")}{ph(T+"lego-kid.jpg","0.78 0.6 1.6")}{ph(T+"bricks-pile.jpg","0.5 0.5 1.6","v",'<span>+3</span>')}</div>

<div class="grp0">
<div class="mkr"><span class="m"><i>م</i>استوديو موج · تصميم مكعّب</span><span class="rt">{ic("star","f")}4.9 <small>(418)</small></span></div>
<h1>مجموعة البناء «موج»</h1>
<div class="sub">للمهندس الصغير · 640 قطعة بلون واحد هادئ</div>
<div class="pr0"><b>289 <small>{CUR}</small></b><s>340 {CUR}</s><span class="dc">-15%</span></div>
<div class="vat">شامل الضريبة · أو 4 دفعات بقيمة 72.25 {CUR} بلا فوائد</div>
<div class="keys"><div>{ic("child_care")}<b>{lt("6+")} سنوات</b><small>العمر المناسب</small></div><div>{ic("extension")}<b>640 قطعة</b><small>في 4 أكياس</small></div><div>{ic("timer")}<b>3 ساعات</b><small>وقت البناء</small></div></div>
</div>

<div class="grp0">
<div class="vh"><b>اللون: <span>موج</span></b><a>مقارنة الألوان</a></div>
<div class="sqsw"><div class="on"><i data-src="img/{T}{b}" data-f="0.5 0.5 2.4"></i><span>موج</span></div><div><i style="background:#E5DCCB"></i><span>رمل</span></div><div><i style="background:#2B3245"></i><span>ليل</span></div><div><i style="background:#C9D6C1"></i><span>نعناع</span></div><div><i style="background:#E9C5B8"></i><span>مرجان</span></div></div>
<div class="vh" style="margin-top:20px"><b>حجم المجموعة</b></div>
<div class="opts">
<div class="op"><span class="rd"></span><div class="ot"><b>المبتدئ · 320 قطعة</b><small>نموذج واحد · {lt("5+")} سنوات</small></div><em>169 <small>{CUR}</small></em></div>
<div class="op on"><span class="rd"></span><div class="ot"><b>المهندس · 640 قطعة</b><small>3 نماذج · {lt("6+")} سنوات</small></div><em>289 <small>{CUR}</small></em></div>
<div class="op"><span class="rd"></span><div class="ot"><b>المعماري · 1,200 قطعة</b><small>6 نماذج · {lt("8+")} سنوات</small></div><em>479 <small>{CUR}</small></em></div></div>
</div>

<div class="grp0"><div class="h4">العمر المناسب<small>حسب اختبار اللعب</small></div>
<div class="agerow"><div class="no"><i>{lt("0–2")}</i><small>غير مناسب</small></div><div class="no"><i>{lt("3–4")}</i><small>غير مناسب</small></div><div class="ok"><i>5</i><small>بمساعدة</small></div><div class="best"><i>{lt("6–9")}</i><small>الأنسب</small></div><div class="ok"><i>{lt("10+")}</i><small>تحدٍّ ممتع</small></div></div>
</div>

<div class="grp0"><div class="h4">السلامة<small>شهادات موثّقة</small></div>
<div class="chk">
<div class="ck">{ic("verified_user")}<div><b>مطابق لمعيار EN71 الأوروبي</b><small>اختبارات الشد والسقوط والمواد</small></div><span class="st">موثّق</span></div>
<div class="ck">{ic("science")}<div><b>بلاستيك ABS خالٍ من BPA</b><small>ألوان ثابتة لا تنتقل إلى اليد</small></div><span class="st">مختبر</span></div>
<div class="ck">{ic("rounded_corner")}<div><b>حواف مستديرة بالكامل</b><small>بلا أطراف حادة أو أجزاء معدنية</small></div><span class="st">آمن</span></div></div>
<div class="choke">{ic("warning")}<span>تحذير: تحتوي على قطع صغيرة قد تسبب الاختناق. غير مناسبة للأطفال دون 3 سنوات.</span></div>
</div>

<div class="grp0"><div class="h4">ماذا في الصندوق<small>5 عناصر</small></div>
<div class="inbox">{ph(T+b,"0.3 0.72 1.6","bi")}<ul>
<li><b>640</b>قطعة في 4 أكياس مرقّمة</li><li><b>1</b>لوح أساس 32 × 32</li><li><b>3</b>كتيّبات بناء مصوّرة</li><li><b>1</b>صندوق فرز بغطاء</li><li><b>1</b>أداة فكّ القطع</li></ul></div>
</div>

<div class="grp0"><div class="h4">مهارات تبنيها<small>بإشراف مختصي تعليم</small></div>
<div class="skg">
<div class="skc">{ic("architecture")}<b>التفكير الهندسي</b><small>التوازن والأشكال والأبعاد</small><div class="lv"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></div></div>
<div class="skc">{ic("checklist")}<b>التخطيط والتسلسل</b><small>اتباع خطوات مرقّمة</small><div class="lv"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i></div></div>
<div class="skc">{ic("back_hand")}<b>المهارات الدقيقة</b><small>تنسيق اليد والعين</small><div class="lv"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i></div></div>
<div class="skc">{ic("lightbulb")}<b>الإبداع الحر</b><small>نماذج من خياله</small><div class="lv"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></div></div></div>
</div>

<div class="grp0">
<div class="dl"><span class="ic0">{ic("local_shipping")}</span><div><b>يصل غداً في دبي والشارقة</b><small>مجاني فوق 200 {CUR} · اطلب خلال 3 ساعات</small></div></div>
<div class="dl"><span class="ic0">{ic("redeem")}</span><div><b>تغليف هدية وبطاقة باسمه</b><small>مجاني مع هذه اللعبة</small></div></div>
<div class="dl"><span class="ic0">{ic("autorenew")}</span><div><b>إرجاع مجاني خلال 30 يوماً</b><small>حتى لو فُتح الصندوق</small></div></div>
</div>

<div class="grp0">
<div class="ac"><div class="ah">عن اللعبة{ic("remove")}</div><p>مجموعة «موج» تحوّل البناء إلى تجربة هادئة: لون واحد يجعل التركيز على الشكل والتوازن، وثلاثة نماذج — منارة وجسر ومرصد — تُبنى خطوة بخطوة ثم تُفكّ لتبدأ من جديد.</p></div>
<div class="ac"><div class="ah">المواصفات{ic("add")}</div></div>
<div class="ac"><div class="ah">التوافق مع مجموعات أخرى{ic("add")}</div></div>
<div class="ac"><div class="ah">الشحن والإرجاع{ic("add")}</div></div>
</div>

<div class="grp0"><div class="h4">تقييمات الأهل<small style="color:var(--accT);font-weight:500">كل التقييمات</small></div>
<div class="rvt"><div class="big"><b>4.9</b><span class="stars">{stars}</span><small>418 تقييماً</small></div>
<div class="bars"><div class="bar">5<i><em style="width:86%"></em></i></div><div class="bar">4<i><em style="width:10%"></em></i></div><div class="bar">3<i><em style="width:3%"></em></i></div><div class="bar">2<i><em style="width:1%"></em></i></div><div class="bar">1<i><em style="width:0%"></em></i></div></div></div>
<div class="rvp">{ph(T+"lego-kid.jpg","0.75 0.6 1.4")}{ph(T+b,"0.6 0.3 2.0")}{ph(T+"bricks-pile.jpg","0.3 0.5 2.0")}{ph(T+"block-tower.jpg","0.65 0.3 1.2","mo")}</div>
<div class="rq"><div class="who"><i>س</i><div><b>سارة الزعابي</b><small>دبي · قبل أسبوع</small></div><span class="stars">{stars}</span></div>
<p>ابني (7 سنوات) أنهى المنارة في جلسة واحدة. الأكياس المرقّمة رائعة، واللون الواحد جعل المجموعة أنيقة على رفّ غرفته.</p><div class="tg"><span>المهندس · 640</span><span>مشترٍ موثّق</span></div></div>
</div>

<div class="grp0"><div class="h4">يُكمل المجموعة<small>وفّر 10% عند الشراء معاً</small></div>
<div class="gwl">
<div class="gwc">{ph(T+"block-tower.jpg","0.7 0.3 1.1","gi")}<span class="ck3">{ic("check")}</span><b>قطع الأقواس والنوافذ</b><em>89 <small>{CUR}</small></em></div>
<div class="gwc">{ph(T+"letters.jpg","0.3 0.6 1.6","gi")}<span class="ck3">{ic("check")}</span><b>كتيّب «مدن العالم»</b><em>45 <small>{CUR}</small></em></div>
<div class="gwc">{ph(T+"gift-black.jpg","0.45 0.45 1.6","gi")}<span class="ck3 off"></span><b>صندوق هدية فاخر</b><em>مجاناً</em></div></div>
<div class="gws"><span>3 قطع: <b>381 {CUR}</b></span><span class="ab">{ic("add_shopping_cart")}أضف المحدد</span></div>
</div>

<div class="sec" style="margin-top:26px"><div class="sh"><div><div class="k"><i></i>قد يعجبك</div><h3>ألعاب يحبها المهندسون الصغار</h3></div><a>الكل{ic("arrow_back")}</a></div>
<div class="hscroll prow">
{pc("telescope-globe.jpg","0.43 0.45 2.2","مختبر مكعّب","تلسكوب «مدار» للمبتدئين","649",None,lt("8+")+" سنوات",rate="4.8")}
{pc("block-tower.jpg","0.7 0.3 1.0","ورشة خشب","برج «المعماري الصغير»","210",None,lt("2+")+" سنة",rate="4.7")}
{pc("compass.jpg","0.45 0.6 1.6","مختبر مكعّب","بوصلة المستكشف","120",None,lt("7+")+" سنوات",badge="جديد",rate="5.0")}
</div></div>
<div style="height:20px"></div>
<div class="sticky"><div class="sp"><small>المجموع</small><b>289 <small>{CUR}</small></b></div><div class="add">{ic("shopping_bag")}أضف إلى السلة</div><div class="gift0">{ic("redeem")}</div><div class="homeind"></div></div>
</div>'''


SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
