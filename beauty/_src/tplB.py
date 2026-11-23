# Template B — "Naqa Lab" (نقاء): clean clinical skincare. IBM Plex Sans Arabic, cobalt accent, cool porcelain surfaces.
from lib import STATUS, ic, ph

TITLE = "Naqa Lab"
FONT = "plex"
CUR = "د.إ"
BASE = True

CSS = """
:root{--bg:#F2F4F5;--surface:#FFFFFF;--mist:#E9EDEF;--mist2:#DCE2E5;--ink:#0F1A20;--ink2:#46535A;--ink3:#6F7C83;--line:#E0E5E8;
--acc:#2840C8;--accT:#2840C8;--accSoft:#E6EAFB;--ok:#16805F;--okSoft:#E2F3EC;--warn:#B4541E;--warnSoft:#FBEDE3;--tile:#EDF0F2;
--tabbg:rgba(15,26,32,.9);--tabink:#9AA8AF;--pillon:#FFFFFF;--pillink:#0F1A20;--inv:#0F1A20;--invink:#FFFFFF;--star:#0F1A20}
html.dark{--bg:#0B0E10;--surface:#141A1D;--mist:#1C2428;--mist2:#273136;--ink:#E8EEF0;--ink2:#A9B5BB;--ink3:#84919A;--line:#222B30;
--acc:#4560F0;--accT:#9EB0FF;--accSoft:#18204A;--ok:#5CCB9F;--okSoft:#132A22;--warn:#F0A06E;--warnSoft:#33231A;--tile:#EDF0F2;
--tabbg:rgba(28,36,40,.92);--tabink:#8E9BA2;--pillon:#E8EEF0;--pillink:#0F1A20;--inv:#E8EEF0;--invink:#0F1A20;--star:#E8EEF0}
body{font-family:'IBM Plex Sans Arabic',sans-serif}
.screen{padding-bottom:116px}
.num{font-variant-numeric:tabular-nums}
.lat{font-family:'IBM Plex Sans Arabic',sans-serif;direction:ltr;unicode-bidi:isolate}

/* header */
.hdr{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.logo{display:flex;align-items:center;gap:10px}
.logo .mk{width:36px;height:36px;border-radius:10px;background:var(--inv);display:grid;place-items:center;position:relative}
.logo .mk i{width:16px;height:16px;border-radius:50%;border:2px solid var(--invink);display:block;position:relative}
.logo .mk i:after{content:'';position:absolute;width:5px;height:5px;border-radius:50%;background:var(--accT);top:-5px;left:9px}
html:not(.dark) .logo .mk i:after{background:#8EA2FF}
.logo b{display:block;font-size:20px;font-weight:700;line-height:1;letter-spacing:-.01em}
.logo small{display:block;font-size:9px;letter-spacing:.3em;color:var(--ink3);margin-top:4px;direction:ltr;text-align:right;font-weight:500}
.hic{display:flex;gap:8px}
.ib{width:40px;height:40px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;position:relative;color:var(--ink)}
.ib .ms{font-size:22px}
.ib .n{position:absolute;top:-4px;left:-4px;min-width:18px;height:18px;border-radius:6px;background:var(--acc);color:#fff;font-size:10px;font-weight:600;display:grid;place-items:center;padding:0 4px;box-shadow:0 0 0 2px var(--bg)}
.ib.dk{background:var(--inv);color:var(--invink);box-shadow:none}
.hello{display:flex;align-items:center;justify-content:space-between;margin:6px 16px 0;font-size:12.5px;color:var(--ink2)}
.hello b{color:var(--ink);font-weight:600}
.uv{display:flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:8px;background:var(--warnSoft);color:var(--warn);font-size:11px;font-weight:600}
.uv .ms{font-size:15px}
.srch{margin:12px 16px 0;height:48px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:10px;padding:0 14px 0 6px}
.srch .ms{font-size:21px;color:var(--ink2)}
.srch .t{flex:1;font-size:13px;color:var(--ink3)}
.srch .sc{width:36px;height:36px;border-radius:10px;background:var(--accSoft);display:grid;place-items:center}
.srch .sc .ms{color:var(--accT);font-size:20px}

/* section head */
.sh{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin:30px 0 12px}
.sh .k{font-size:10.5px;color:var(--accT);font-weight:600;letter-spacing:.08em;direction:ltr;text-align:right;display:block;margin-bottom:3px}
.sh h3{font-size:18px;font-weight:700;letter-spacing:-.005em}
.sh a{font-size:12px;color:var(--ink2);font-weight:500;display:flex;align-items:center;gap:2px;border-bottom:1px solid var(--mist2);padding-bottom:2px}
.sh a .ms{font-size:16px}

/* concern tiles */
.ctiles{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 16px}
.ct{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:14px;height:78px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px}
.ct .ms{font-size:23px;color:var(--accT)}
.ct span{font-size:11px;color:var(--ink);font-weight:500}
.ct.on{background:var(--inv);box-shadow:none}
.ct.on .ms,.ct.on span{color:var(--invink)}

/* hero */
.hero{gap:10px;margin-top:16px}
.hc{width:342px;height:222px;border-radius:18px;position:relative;overflow:hidden;background:#EEF0F1}
.hc .bg{position:absolute;inset:0}
.hc .bg.mir{transform:scaleX(-1)}
.hc .fade{position:absolute;inset:0;background:linear-gradient(270deg,rgba(240,242,243,.96) 0%,rgba(240,242,243,.75) 40%,rgba(240,242,243,0) 62%)}
.hc .tx{position:absolute;right:18px;top:18px;bottom:16px;width:178px;display:flex;flex-direction:column;color:#0F1A20}
.hc .tag{align-self:flex-start;font-size:10.5px;font-weight:600;color:#2840C8;letter-spacing:.02em;display:flex;align-items:center;gap:4px}
.hc .tag .ms{font-size:14px}
.hc h2{font-size:20px;line-height:1.35;font-weight:700;margin-top:8px}
.hc .stats{display:flex;gap:6px;margin-top:10px}
.hc .stats span{font-size:10.5px;background:#fff;border-radius:7px;padding:4px 7px;color:#46535A;box-shadow:0 0 0 1px #E0E5E8}
.hc .stats b{color:#0F1A20;font-weight:700}
.hc .cta{margin-top:auto;align-self:flex-start;height:36px;padding:0 14px;border-radius:10px;background:#0F1A20;color:#fff;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500}
.hc .cta .ms{font-size:16px}
.hc .idx{position:absolute;left:14px;bottom:14px;font-size:10.5px;color:#46535A;direction:ltr;font-weight:600}
.segs{display:flex;gap:4px;margin:12px 16px 0;align-items:center}
.segs i{flex:1;height:3px;border-radius:2px;background:var(--mist2)}
.segs i.on{background:var(--ink)}
.segs span{font-size:10.5px;color:var(--ink3);margin-right:8px;direction:ltr;font-weight:600}

/* skin scan */
.scan{margin:0 16px;background:var(--surface);border-radius:18px;box-shadow:0 0 0 1px var(--line);padding:14px;display:flex;gap:14px}
.scan .face{width:124px;height:168px;border-radius:12px;flex:0 0 auto;position:relative;overflow:hidden;background:#EEF0F1}
.scan .face .frm{position:absolute;inset:12px;border-radius:4px}
.scan .face .frm i{position:absolute;width:16px;height:16px;border-color:#fff;border-style:solid;border-width:0}
.scan .face .frm i:nth-child(1){top:0;right:0;border-top-width:2px;border-right-width:2px}
.scan .face .frm i:nth-child(2){top:0;left:0;border-top-width:2px;border-left-width:2px}
.scan .face .frm i:nth-child(3){bottom:0;right:0;border-bottom-width:2px;border-right-width:2px}
.scan .face .frm i:nth-child(4){bottom:0;left:0;border-bottom-width:2px;border-left-width:2px}
.scan .face .dt{position:absolute;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(40,64,200,.55)}
.scan .face .ln{position:absolute;left:12px;right:12px;top:46%;height:1.5px;background:linear-gradient(90deg,rgba(255,255,255,0),#fff,rgba(255,255,255,0))}
.scan .bd{flex:1;display:flex;flex-direction:column;min-width:0}
.scan .bd small{font-size:10.5px;color:var(--ink3)}
.scan .bd h4{font-size:15px;font-weight:700;margin-top:2px;line-height:1.4}
.mets{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.met{font-size:11px;color:var(--ink2)}
.met .r{display:flex;justify-content:space-between}
.met .r b{color:var(--ink);font-weight:600;direction:ltr}
.met .bar{height:4px;border-radius:2px;background:var(--mist);margin-top:4px;overflow:hidden}
.met .bar i{display:block;height:100%;border-radius:2px;background:var(--accT);margin-left:auto}
.met .bar i.w{background:var(--warn)}
.scan .go{margin-top:auto;font-size:12px;font-weight:600;color:var(--accT);display:flex;align-items:center;gap:3px}
.scan .go .ms{font-size:17px}

/* ingredients */
.ings{gap:10px}
.ingc{width:146px;height:176px;border-radius:16px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:14px;position:relative;overflow:hidden;display:flex;flex-direction:column}
.ingc .pct{font-size:34px;font-weight:700;line-height:1;letter-spacing:-.02em;direction:ltr;text-align:right;color:var(--accT)}
.ingc .pct small{font-size:16px;font-weight:600}
.ingc b{font-size:14px;font-weight:600;margin-top:12px}
.ingc p{font-size:11px;color:var(--ink3);margin-top:3px;line-height:1.5}
.ingc em{margin-top:auto;font-size:10.5px;color:var(--ink2);display:flex;align-items:center;gap:3px}
.ingc em .ms{font-size:14px}
.ingc .mol{position:absolute;left:-18px;top:-18px;width:74px;height:74px;border-radius:50%;border:1.5px dashed var(--mist2)}
.ingc .mol:after{content:'';position:absolute;width:10px;height:10px;border-radius:50%;background:var(--mist2);left:44px;top:58px}
.ingc.dk{background:var(--inv);box-shadow:none}
.ingc.dk .pct,.ingc.dk b{color:var(--invink)}
.ingc.dk p,.ingc.dk em{color:var(--tabink)}
.ingc.dk .mol{border-color:rgba(150,160,170,.35)}

/* product card B */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 16px}
.pc{background:var(--surface);border-radius:16px;box-shadow:0 0 0 1px var(--line);overflow:hidden;display:flex;flex-direction:column}
.pc .im{height:172px;background-color:var(--tile);background-blend-mode:multiply;position:relative}
.pc .im .kt{position:absolute;bottom:8px;right:8px;font-size:10px;font-weight:600;background:rgba(255,255,255,.94);color:#0F1A20;border-radius:6px;padding:3px 6px;direction:rtl}
.pc .im .kt b{color:#2840C8}
.pc .im .bdg{position:absolute;top:8px;right:8px;font-size:10px;font-weight:600;border-radius:6px;padding:3px 6px;background:#0F1A20;color:#fff}
.pc .im .bdg.off{background:#B4541E;direction:ltr}
.pc .im .hrt{position:absolute;top:8px;left:8px;width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.94);display:grid;place-items:center;color:#0F1A20}
.pc .im .hrt .ms{font-size:17px}
.pc .im .hrt.on .ms{color:#2840C8;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.pc .bd{padding:10px 11px 11px;flex:1;display:flex;flex-direction:column}
.pc .br{font-size:10px;color:var(--ink3);font-weight:600;letter-spacing:.1em;direction:ltr;text-align:right}
.pc .nm{font-size:12.5px;font-weight:500;line-height:1.45;margin-top:3px;min-height:36px}
.pc .meta{display:flex;align-items:center;gap:6px;margin-top:5px;font-size:10.5px;color:var(--ink3)}
.pc .meta .rt{display:flex;align-items:center;gap:2px;color:var(--ink);font-weight:600}
.pc .meta .rt .ms{font-size:13px;color:var(--star)}
.pc .ft{display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;padding-top:10px}
.pc .pr b{font-size:15px;font-weight:700;display:block;line-height:1.1}
.pc .pr b small{font-size:10.5px;font-weight:500;color:var(--ink2)}
.pc .pr s{font-size:11px;color:var(--ink3)}
.pc .ad{width:34px;height:34px;border-radius:10px;background:var(--inv);display:grid;place-items:center;color:var(--invink)}
.pc .ad .ms{font-size:20px}
.row .pc{width:158px}

/* routine stepper */
.rout{margin:0 16px;background:var(--surface);border-radius:18px;box-shadow:0 0 0 1px var(--line);padding:14px}
.rout .tg{display:flex;background:var(--mist);border-radius:10px;padding:3px}
.rout .tg span{flex:1;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:12px;color:var(--ink2)}
.rout .tg span .ms{font-size:16px}
.rout .tg span.on{background:var(--surface);color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.stp{display:flex;align-items:center;gap:12px;padding:12px 0;position:relative}
.stp:not(:last-child):after{content:'';position:absolute;right:13px;top:44px;bottom:-14px;width:1.5px;background:var(--mist2)}
.stp .n{width:28px;height:28px;border-radius:9px;background:var(--mist);display:grid;place-items:center;font-size:12px;font-weight:700;flex:0 0 auto;color:var(--ink2);z-index:1}
.stp.done .n{background:var(--acc);color:#fff}
.stp .th{width:52px;height:52px;border-radius:12px;background-color:var(--tile);flex:0 0 auto}
.stp .tx{flex:1;min-width:0}
.stp .tx small{display:block;font-size:10.5px;color:var(--accT);font-weight:600}
.stp .tx b{display:block;font-size:13px;font-weight:500;margin-top:1px}
.stp .tx em{display:block;font-size:10.5px;color:var(--ink3);margin-top:1px}
.stp .p{font-size:13px;font-weight:700;white-space:nowrap}
.stp .p small{font-size:10px;color:var(--ink2);font-weight:500}
.rtot{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:12px;margin-top:4px}
.rtot small{display:block;font-size:11px;color:var(--ink3)}
.rtot b{font-size:18px;font-weight:700}
.rtot b small{display:inline;font-size:11px;color:var(--ink2);font-weight:500}
.rtot s{font-size:12px;color:var(--ink3);margin-right:6px}
.bt{height:44px;padding:0 16px;border-radius:12px;background:var(--inv);color:var(--invink);display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600}
.bt .ms{font-size:19px}
.bt.ac{background:var(--acc);color:#fff}

/* UV banner */
.uvb{margin:0 16px;border-radius:18px;background:#0F1A20;color:#fff;position:relative;overflow:hidden;height:196px}
html.dark .uvb{box-shadow:0 0 0 1px var(--line)}
.uvb .ph{position:absolute;left:0;top:0;bottom:0;width:150px}
.uvb .ph:after{content:'';position:absolute;inset:0;background:linear-gradient(270deg,#0F1A20 0%,rgba(15,26,32,0) 45%)}
.uvb .tx{position:absolute;right:16px;top:16px;bottom:16px;left:150px;display:flex;flex-direction:column}
.uvb small{font-size:10.5px;color:#9AA8AF;display:flex;align-items:center;gap:4px}
.uvb small .ms{font-size:14px;color:#F0A06E}
.uvb .g{display:flex;align-items:baseline;gap:8px;margin-top:6px}
.uvb .g b{font-size:38px;font-weight:700;line-height:1}
.uvb .g span{font-size:12px;color:#F0A06E;font-weight:600}
.uvb .scale{display:flex;gap:3px;margin-top:10px;direction:ltr}
.uvb .scale i{flex:1;height:5px;border-radius:2px}
.uvb p{font-size:12px;color:#C9D2D6;margin-top:10px;line-height:1.55}
.uvb .cta{margin-top:auto;align-self:flex-start;height:34px;padding:0 12px;border-radius:10px;background:#fff;color:#0F1A20;display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600}
.uvb .cta .ms{font-size:16px}

/* proof */
.proof{margin:0 16px;background:var(--surface);border-radius:18px;box-shadow:0 0 0 1px var(--line);padding:16px}
.proof .st3{display:grid;grid-template-columns:repeat(3,1fr);gap:0}
.proof .st3 div{text-align:center;padding:0 6px;border-left:1px solid var(--line)}
.proof .st3 div:last-child{border-left:0}
.proof .st3 b{display:block;font-size:24px;font-weight:700;color:var(--accT);direction:ltr}
.proof .st3 span{display:block;font-size:11px;color:var(--ink2);margin-top:4px;line-height:1.45}
.proof .q{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);display:flex;gap:10px;align-items:center}
.proof .q .av{width:40px;height:40px;border-radius:12px;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;flex:0 0 auto}
.proof .q .av .ms{font-size:22px}
.proof .q p{font-size:11.5px;color:var(--ink2);line-height:1.6}
.proof .q p b{color:var(--ink);font-weight:600}

/* samples */
.samp{margin:0 16px;border-radius:18px;background:var(--accSoft);padding:16px}
.samp h4{font-size:15px;font-weight:700}
.samp p{font-size:11.5px;color:var(--ink2);margin-top:3px}
.samp .sl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.samp .s{background:var(--surface);border-radius:12px;padding:8px;position:relative}
.samp .s .si{height:66px;border-radius:8px;background-color:var(--tile);background-blend-mode:multiply}
.samp .s b{display:block;font-size:11px;font-weight:500;margin-top:6px;line-height:1.4}
.samp .s small{display:block;font-size:10px;color:var(--ink3)}
.samp .s .ck{position:absolute;top:4px;left:4px;width:22px;height:22px;border-radius:7px;background:var(--acc);display:grid;place-items:center;color:#fff;box-shadow:0 0 0 2px var(--surface)}
.samp .s .ck .ms{font-size:15px}
.samp .s.off .ck{background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--mist2)}
.samp .s.off .ck .ms{display:none}

/* tab bar */
.tabbar{position:absolute;left:16px;right:16px;bottom:26px;height:64px;border-radius:20px;background:var(--tabbg);backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);display:flex;align-items:center;justify-content:space-between;padding:0 10px;box-shadow:0 14px 30px rgba(15,26,32,.22)}
html.dark .tabbar{box-shadow:0 0 0 1px rgba(255,255,255,.07),0 14px 30px rgba(0,0,0,.5)}
.tb{width:46px;height:44px;display:grid;place-items:center;color:var(--tabink);position:relative}
.tb .ms{font-size:23px}
.tb.on{width:auto;padding:0 14px;border-radius:13px;background:var(--pillon);color:var(--pillink);display:flex;gap:6px;font-size:12.5px;font-weight:600}
.tb.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tb i{position:absolute;top:4px;left:5px;min-width:17px;height:17px;border-radius:6px;background:#4560F0;color:#fff;font-size:9.5px;font-weight:600;display:grid;place-items:center;padding:0 4px}

/* ============ MENU ============ */
.mtop{display:flex;align-items:center;justify-content:space-between;padding:4px 16px 0;height:56px}
.mq4{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 16px 0}
.mq4 div{height:56px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:10px;padding:0 12px}
.mq4 div i{width:34px;height:34px;border-radius:10px;background:var(--accSoft);display:grid;place-items:center;color:var(--accT)}
.mq4 div i .ms{font-size:19px}
.mq4 div b{display:block;font-size:12.5px;font-weight:600}
.mq4 div small{display:block;font-size:10.5px;color:var(--ink3);margin-top:1px}
.mq4 div.dk{background:var(--inv);box-shadow:none}
.mq4 div.dk b{color:var(--invink)}
.mq4 div.dk small{color:var(--tabink)}
.mq4 div.dk i{background:rgba(158,176,255,.18);color:#9EB0FF}
.mcat{margin-top:26px}
.mh{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:10px}
.mh .k{font-size:10.5px;color:var(--accT);font-weight:700;direction:ltr;text-align:right;display:block;letter-spacing:.06em}
.mh b{display:block;font-size:16px;font-weight:700;margin-top:2px}
.mh small{font-size:11px;color:var(--ink3);font-weight:400;margin-right:6px}
.mh a{font-size:11.5px;color:var(--ink2);display:flex;align-items:center;gap:2px;font-weight:500}
.mh a .ms{font-size:16px}
.mrow{gap:10px}
.mcd{width:104px}
.mcd .im{height:104px;border-radius:14px;background-color:var(--tile);position:relative;overflow:hidden}
.mcd b{display:block;font-size:12px;font-weight:600;margin-top:7px;line-height:1.35}
.mcd small{display:block;font-size:10.5px;color:var(--ink3);margin-top:1px}
.mcd.all .im{background:var(--inv);display:flex;flex-direction:column;justify-content:space-between;padding:11px;color:var(--invink)}
.mcd.all .im .ms{font-size:24px}
.mcd.all .im span{font-size:22px;font-weight:700;direction:ltr;text-align:right;line-height:1}
.mcd.all .im span small{font-size:10px;color:var(--tabink);font-weight:500;margin-top:3px;direction:rtl}
.mgrp{margin:30px 16px 0}
.mgrp .lb{font-size:10.5px;color:var(--ink3);font-weight:600;letter-spacing:.06em;margin:0 4px 8px}
.mlist{background:var(--surface);border-radius:16px;box-shadow:0 0 0 1px var(--line);padding:0 14px}
.ml{display:flex;align-items:center;gap:12px;height:52px;border-bottom:1px solid var(--line)}
.ml:last-child{border:0}
.ml .ms.l{font-size:21px;color:var(--ink2)}
.ml span.t{flex:1;font-size:13.5px;font-weight:500}
.ml small{font-size:11.5px;color:var(--ink3)}
.ml .ms.c{font-size:18px;color:var(--ink3)}
.ml .tg{font-size:10.5px;font-weight:600;color:var(--ok);background:var(--okSoft);padding:3px 8px;border-radius:6px}
.seg2{display:flex;background:var(--mist);border-radius:9px;padding:3px}
.seg2 i{font-size:11.5px;padding:5px 11px;border-radius:7px;color:var(--ink2)}
.seg2 i.on{background:var(--surface);color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.cnt3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 16px 0}
.cnt3 div{height:70px;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:11.5px;font-weight:500}
.cnt3 div .ms{font-size:22px;color:var(--accT)}
.cnt3 div.dk{background:var(--inv);color:var(--invink);box-shadow:none}
.cnt3 div.dk .ms{color:var(--invink)}
.mver{text-align:center;font-size:10.5px;color:var(--ink3);margin-top:16px}

/* ============ LISTING ============ */
.ltop{height:56px;display:flex;align-items:center;gap:10px;padding:0 16px}
.ltop .tt{flex:1}
.ltop .tt small{display:block;font-size:10.5px;color:var(--ink3)}
.ltop .tt b{display:block;font-size:17px;font-weight:700;margin-top:1px}
.lch{gap:6px;margin-top:6px}
.lc{height:36px;padding:0 13px;border-radius:10px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink2);white-space:nowrap}
.lc b{font-size:10.5px;color:var(--ink3);font-weight:500}
.lc.on{background:var(--inv);color:var(--invink);box-shadow:none;font-weight:600}
.lc.on b{color:var(--tabink)}
.fb{display:flex;gap:8px;margin:12px 16px 0}
.fb div{height:40px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;white-space:nowrap}
.fb div .ms{font-size:19px}
.fb .f1 em{min-width:18px;height:18px;border-radius:6px;background:var(--acc);color:#fff;font-size:10px;display:grid;place-items:center;padding:0 4px}
.fb .f2{flex:1;justify-content:space-between;color:var(--ink2);font-weight:400}
.fb .f2 b{color:var(--ink);font-weight:600}
.fb .f3{padding:0 10px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:10px 16px 0;align-items:center}
.tag2{height:28px;border-radius:8px;padding:0 6px 0 10px;background:var(--accSoft);color:var(--accT);font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px}
.tag2 .ms{font-size:14px}
.clr{font-size:11px;color:var(--ink3);font-weight:500;margin-right:4px;text-decoration:underline;text-underline-offset:3px}
.lmeta{display:flex;justify-content:space-between;align-items:center;margin:16px 16px 10px;font-size:11.5px;color:var(--ink3)}
.lmeta b{color:var(--ink);font-weight:600}
.lmeta span{display:flex;align-items:center;gap:4px;color:var(--ok);font-weight:600}
.lmeta span .ms{font-size:15px}
.lpro{grid-column:1/-1;border-radius:16px;background:var(--inv);padding:16px;display:flex;align-items:center;gap:14px;color:var(--invink);position:relative;overflow:hidden}
.lpro .rg{width:84px;height:84px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;background:conic-gradient(#4560F0 0 78%,rgba(150,160,170,.25) 78% 100%);position:relative}
.lpro .rg:after{content:'';position:absolute;inset:7px;border-radius:50%;background:var(--inv)}
.lpro .rg span{position:relative;z-index:1;font-size:20px;font-weight:700;direction:ltr}
.lpro .tx{flex:1}
.lpro small{font-size:10.5px;color:var(--tabink)}
.lpro b{display:block;font-size:14.5px;font-weight:700;line-height:1.45;margin-top:3px}
.lpro .cta{margin-top:10px;display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border-radius:9px;background:#4560F0;color:#fff;font-size:11.5px;font-weight:600}
.lpro .cta .ms{font-size:15px}
.lmore{margin:24px 16px 0;display:flex;flex-direction:column;align-items:center}
.lmore .pg{font-size:11.5px;color:var(--ink3)}
.lmore .pg b{color:var(--ink)}
.lmore .bar{width:180px;height:3px;border-radius:2px;background:var(--mist2);margin-top:8px;overflow:hidden}
.lmore .bar i{display:block;height:100%;width:12%;background:var(--ink);margin-left:auto}
.lmore .b2{margin-top:14px;width:100%;height:48px;border-radius:12px;box-shadow:0 0 0 1.3px var(--ink);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:600}
.lmore .b2 .ms{font-size:19px}

/* ============ PRODUCT ============ */
.ptop{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.ptop .g{display:flex;gap:8px}
.gal{margin:0 16px;height:380px;border-radius:18px;background:#EEF0F1;position:relative;overflow:hidden}
.gal .bg{position:absolute;inset:0}
.gal .bg.mir{transform:scaleX(-1)}
.gal .lab{position:absolute;top:14px;right:14px;display:flex;flex-direction:column;gap:6px}
.gal .lab span{font-size:10.5px;font-weight:600;background:rgba(255,255,255,.94);color:#0F1A20;border-radius:7px;padding:4px 8px;align-self:flex-start}
.gal .lab span.b{background:#2840C8;color:#fff}
.gal .bar{position:absolute;bottom:14px;left:14px;right:14px;display:flex;gap:4px}
.gal .bar i{flex:1;height:3px;border-radius:2px;background:rgba(15,26,32,.18)}
.gal .bar i.on{background:#0F1A20}
.gal .zoom{position:absolute;bottom:28px;left:14px;width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.94);display:grid;place-items:center;color:#0F1A20}
.gal .zoom .ms{font-size:19px}
.thm{display:flex;gap:8px;margin:10px 16px 0}
.thm div{flex:1;height:60px;border-radius:12px;background-color:#EEF0F1;position:relative;overflow:hidden}
.thm div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--ink)}
.thm div.tx{background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;color:var(--ink2);gap:2px}
.thm div.tx b{font-size:15px;color:var(--accT);font-weight:700;direction:ltr}
.pin{padding:16px 16px 0}
.pin .r1{display:flex;align-items:center;justify-content:space-between}
.pin .br{font-size:10.5px;letter-spacing:.14em;font-weight:600;color:var(--ink2);direction:ltr;display:flex;align-items:center;gap:6px}
.pin .br .ms{font-size:15px;color:var(--accT)}
.pin .rx{font-size:10.5px;font-weight:600;color:var(--ok);background:var(--okSoft);padding:3px 8px;border-radius:6px;display:flex;align-items:center;gap:4px;white-space:nowrap}
.pin .rx .ms{font-size:14px}
.pin h1{font-size:20px;font-weight:700;line-height:1.5;margin-top:8px}
.pin .sub{font-size:12.5px;color:var(--ink2);margin-top:3px}
.pin .rr{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:var(--ink2)}
.pin .rr .s{display:flex;color:var(--star)}
.pin .rr .s .ms{font-size:15px}
.pin .rr b{color:var(--ink);font-weight:700}
.pin .rr i{width:1px;height:12px;background:var(--line)}
.prc{display:flex;align-items:center;justify-content:space-between;margin:14px 16px 0;padding:14px;border-radius:16px;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.prc .p b{font-size:26px;font-weight:700;line-height:1}
.prc .p b small{font-size:12px;font-weight:500;color:var(--ink2)}
.prc .p div{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;color:var(--ink3)}
.prc .p div em{font-size:11px;font-weight:700;color:#fff;background:var(--warn);padding:2px 7px;border-radius:6px;direction:ltr}
html.dark .prc .p div em{color:#1A0F08}
.prc .pp{text-align:left;font-size:11px;color:var(--ink3);line-height:1.6}
.prc .pp b{color:var(--ok);font-weight:600;display:block}
.blk{margin:12px 16px 0;background:var(--surface);border-radius:16px;box-shadow:0 0 0 1px var(--line);padding:16px}
.bh{display:flex;align-items:center;justify-content:space-between}
.bh b{font-size:14.5px;font-weight:700}
.bh b span{font-weight:400;color:var(--ink2);font-size:13px}
.bh a{font-size:11.5px;color:var(--accT);font-weight:600;display:flex;align-items:center;gap:3px}
.bh a .ms{font-size:16px}
.shs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.sh2{border-radius:12px;box-shadow:0 0 0 1px var(--line);padding:8px;display:flex;align-items:center;gap:8px;background:var(--bg)}
.sh2 i{width:30px;height:30px;border-radius:8px;flex:0 0 auto;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.sh2 b{display:block;font-size:12px;font-weight:600;direction:ltr;text-align:right}
.sh2 small{display:block;font-size:10px;color:var(--ink3)}
.sh2.on{box-shadow:0 0 0 1.6px var(--accT);background:var(--accSoft)}
.sh2.off{opacity:.5}
.ut{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
.ut span{font-size:10.5px;color:var(--ink2);display:flex;align-items:center;gap:4px}
.ut span i{width:8px;height:8px;border-radius:2px}
.sz{display:flex;gap:8px;margin-top:12px}
.sz div{flex:1;height:52px;border-radius:12px;box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg)}
.sz div b{font-size:12.5px;font-weight:600}
.sz div small{font-size:10px;color:var(--ink3);margin-top:1px}
.sz div.on{box-shadow:0 0 0 1.6px var(--ink);background:var(--surface)}
.res{display:flex;flex-direction:column;gap:12px;margin-top:14px}
.re{display:flex;align-items:center;gap:12px}
.re b{width:58px;font-size:20px;font-weight:700;color:var(--accT);direction:ltr;text-align:right}
.re div{flex:1}
.re span{display:block;font-size:12px;color:var(--ink);font-weight:500}
.re .bar{height:4px;border-radius:2px;background:var(--mist);margin-top:5px;overflow:hidden}
.re .bar i{display:block;height:100%;background:var(--accT);border-radius:2px;margin-left:auto}
.foot{font-size:10.5px;color:var(--ink3);margin-top:12px;line-height:1.5}
.skt{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.skt div{display:flex;align-items:center;gap:8px;height:44px;border-radius:12px;background:var(--bg);box-shadow:0 0 0 1px var(--line);padding:0 10px;font-size:12px;font-weight:500}
.skt div .ms{font-size:19px;color:var(--ok)}
.skt div em{margin-right:auto;font-size:10px;color:var(--ink3);font-weight:400}
.skt div.me{box-shadow:0 0 0 1.6px var(--accT);background:var(--accSoft)}
.skt div.me em{color:var(--accT);font-weight:600}
.skt div.no .ms{color:var(--warn)}
.ftab{margin-top:12px;border-radius:12px;box-shadow:0 0 0 1px var(--line);overflow:hidden}
.fr{display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);gap:10px;background:var(--surface)}
.fr:last-child{border:0}
.fr.h{background:var(--mist);font-size:10.5px;color:var(--ink3);font-weight:600;padding:8px 12px}
.fr .c1{flex:1;font-size:12.5px;font-weight:500}
.fr .c1 small{display:block;font-size:10.5px;color:var(--ink3);font-weight:400;margin-top:1px}
.fr .c2{width:54px;text-align:center;font-size:13px;font-weight:700;color:var(--accT);direction:ltr}
.fr.h .c2{color:var(--ink3);font-size:10.5px;font-weight:600}
.fr .c3{width:70px;font-size:10.5px;color:var(--ink2);text-align:left}
.badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.badges>span{height:28px;padding:0 9px;border-radius:8px;background:var(--bg);box-shadow:0 0 0 1px var(--line);font-size:11px;color:var(--ink2);display:flex;align-items:center;gap:4px}
.badges span .ms{font-size:15px;color:var(--ok)}
.tl{margin-top:12px;display:flex;flex-direction:column}
.tli{display:flex;gap:12px;position:relative;padding-bottom:14px}
.tli:not(:last-child):after{content:'';position:absolute;right:15px;top:34px;bottom:2px;width:1.5px;background:var(--mist2)}
.tli .n{width:32px;height:32px;border-radius:10px;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;flex:0 0 auto}
.tli .n .ms{font-size:18px}
.tli.me .n{background:var(--acc);color:#fff}
.tli b{display:block;font-size:13px;font-weight:600}
.tli b em{font-size:10px;color:#fff;background:var(--acc);border-radius:5px;padding:1px 6px;margin-right:6px;font-weight:600}
.tli small{display:block;font-size:11.5px;color:var(--ink3);margin-top:2px;line-height:1.55}
.amt{display:flex;align-items:center;gap:8px;margin-top:2px;padding:10px 12px;border-radius:12px;background:var(--mist);font-size:11.5px;color:var(--ink2)}
.amt .ms{font-size:18px;color:var(--accT)}
.amt b{color:var(--ink);font-weight:600}
.dlv{margin:12px 16px 0;background:var(--surface);border-radius:16px;box-shadow:0 0 0 1px var(--line)}
.dl{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--line)}
.dl:last-child{border:0}
.dl .ms{font-size:21px;color:var(--ink2)}
.dl .t{flex:1}
.dl b{display:block;font-size:12.5px;font-weight:600}
.dl small{display:block;font-size:11px;color:var(--ink3);margin-top:1px}
.dl em{font-size:11px;color:var(--ok);font-weight:600}
.acd{margin:12px 16px 0;background:var(--surface);border-radius:16px;box-shadow:0 0 0 1px var(--line);padding:0 14px}
.ai{padding:14px 0;border-bottom:1px solid var(--line)}
.ai:last-child{border:0}
.ai .ah{display:flex;justify-content:space-between;align-items:center;font-size:13.5px;font-weight:600}
.ai .ah .ms{font-size:20px;color:var(--ink3)}
.ai p{font-size:12px;color:var(--ink2);line-height:1.75;margin-top:8px}
.rvs{margin:0 16px;background:var(--surface);border-radius:16px;box-shadow:0 0 0 1px var(--line);padding:16px}
.rvs .top{display:flex;gap:16px;align-items:center}
.rvs .sc b{display:block;font-size:40px;font-weight:700;line-height:1;direction:ltr;text-align:right}
.rvs .sc b small{font-size:15px;color:var(--ink3);font-weight:500}
.rvs .sc .s{display:flex;color:var(--star);margin-top:6px}
.rvs .sc .s .ms{font-size:15px}
.rvs .sc span{display:block;font-size:11px;color:var(--ink3);margin-top:4px}
.rvs .att{flex:1;display:flex;flex-direction:column;gap:8px;padding-right:14px;border-right:1px solid var(--line)}
.rvs .at{font-size:11px;color:var(--ink2)}
.rvs .at .r{display:flex;justify-content:space-between}
.rvs .at .r b{color:var(--ink);font-weight:600;direction:ltr}
.rvs .at .bar{display:flex;gap:2px;margin-top:4px}
.rvs .at .bar i{flex:1;height:4px;border-radius:1px;background:var(--mist2)}
.rvs .at .bar i.f{background:var(--ink)}
.rch{display:flex;gap:6px;margin:12px 16px 0;overflow:hidden}
.rch>span{flex:0 0 auto;height:32px;padding:0 11px;border-radius:9px;background:var(--surface);box-shadow:0 0 0 1px var(--line);font-size:11.5px;display:flex;align-items:center;gap:5px;color:var(--ink2)}
.rch span.on{background:var(--inv);color:var(--invink);box-shadow:none;font-weight:600}
.rch span .ms{font-size:15px}
.rph{display:flex;gap:6px;margin:12px 16px 0}
.rph div{flex:1;height:84px;border-radius:12px;background-color:#EEF0F1;position:relative;overflow:hidden}
.rph div.m:after{content:'';position:absolute;inset:0;background:rgba(15,26,32,.55)}
.rph div.m span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:13px;font-weight:700;z-index:1;direction:ltr}
.rv{margin:12px 16px 0;background:var(--surface);border-radius:16px;box-shadow:0 0 0 1px var(--line);padding:14px}
.rv .h{display:flex;align-items:center;gap:10px}
.rv .h .av{width:38px;height:38px;border-radius:11px;background:var(--mist);display:grid;place-items:center;font-weight:700;color:var(--ink2);flex:0 0 auto}
.rv .h .w{flex:1}
.rv .h b{display:block;font-size:13px;font-weight:600}
.rv .h small{display:flex;align-items:center;gap:3px;font-size:10.5px;color:var(--ok);font-weight:500;margin-top:1px}
.rv .h small .ms{font-size:13px}
.rv .h .s{display:flex;color:var(--star)}
.rv .h .s .ms{font-size:14px}
.rv .chips{display:flex;gap:5px;margin-top:10px;flex-wrap:wrap}
.rv .chips span{font-size:10.5px;padding:3px 8px;border-radius:6px;background:var(--mist);color:var(--ink2)}
.rv .wk{display:flex;gap:6px;margin-top:10px}
.rv .wk div{flex:1;height:96px;border-radius:10px;background-color:#EEF0F1;position:relative;overflow:hidden}
.rv .wk div span{position:absolute;bottom:6px;right:6px;font-size:10px;font-weight:600;background:rgba(15,26,32,.7);color:#fff;border-radius:5px;padding:2px 6px}
.rv p{font-size:12.5px;line-height:1.75;margin-top:10px}
.rv .hl{display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:11px;color:var(--ink3)}
.rv .hl span{display:flex;align-items:center;gap:4px}
.rv .hl .ms{font-size:16px}
.rvall{margin:12px 16px 0;height:46px;border-radius:12px;box-shadow:0 0 0 1.3px var(--ink);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:600}
.rvall .ms{font-size:18px}
.gw{margin:0 16px;background:var(--surface);border-radius:16px;box-shadow:0 0 0 1px var(--line);padding:4px 14px 14px}
.gwi{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}
.gwi .ck{width:22px;height:22px;border-radius:7px;background:var(--acc);display:grid;place-items:center;color:#fff;flex:0 0 auto}
.gwi .ck .ms{font-size:15px}
.gwi .ck.off{background:transparent;box-shadow:inset 0 0 0 1.5px var(--ink3)}
.gwi .im{width:56px;height:56px;border-radius:12px;background-color:var(--tile);background-blend-mode:multiply;flex:0 0 auto}
.gwi .t{flex:1;min-width:0}
.gwi .t small{display:block;font-size:10px;color:var(--accT);font-weight:600}
.gwi .t b{display:block;font-size:12.5px;font-weight:500;margin-top:1px;line-height:1.4}
.gwi em{font-size:13px;font-weight:700;white-space:nowrap}
.gwi em small{font-size:10px;color:var(--ink2);font-weight:500}
.gwt{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
.gwt small{display:block;font-size:11px;color:var(--ink3)}
.gwt b{font-size:18px;font-weight:700}
.gwt b small{display:inline;font-size:11px;color:var(--ink2);font-weight:500}
.gwt s{font-size:12px;color:var(--ink3);margin-right:6px}
.stk{position:absolute;left:0;right:0;bottom:0;padding:12px 16px 34px;background:var(--surface);box-shadow:0 -1px 0 var(--line),0 -10px 30px rgba(15,26,32,.06);display:flex;gap:10px;align-items:center}
.stk .pv{display:flex;align-items:center;gap:8px;height:50px;padding:0 12px;border-radius:12px;box-shadow:0 0 0 1px var(--line);background:var(--bg)}
.stk .pv i{width:24px;height:24px;border-radius:7px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}
.stk .pv b{display:block;font-size:12px;font-weight:700;direction:ltr;text-align:right}
.stk .pv small{display:block;font-size:10px;color:var(--ink3)}
.stk .go{flex:1;height:50px;border-radius:12px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:600}
.stk .go .ms{font-size:20px}
.stk .go span{opacity:.8;font-weight:400}
"""

# ------------------------------------------------------------ helpers
def tabbar(on=0):
    items = [("home", "الرئيسية"), ("storefront", "المتجر"), ("shopping_bag", "السلة"), ("receipt_long", "طلباتي"), ("person", "حسابي")]
    h = '<div class="tabbar">'
    for i, (icn, lab) in enumerate(items):
        bd = '<i>2</i>' if icn == 'shopping_bag' and i != on else ''
        if i == on:
            h += f'<div class="tb on">{ic(icn)}{lab}</div>'
        else:
            h += f'<div class="tb">{ic(icn)}{bd}</div>'
    return h + '</div><div class="homeind"></div>'

def pc(src, f, brand, name, size, p, old=None, rate="4.8", cnt="1.2k", key=None, badge=None, fav=False, mult=True):
    b = ''
    if badge: b = f'<span class="bdg{" off" if badge.startswith("-") else ""}">{badge}</span>'
    k = f'<span class="kt">{key}</span>' if key else ''
    o = f'<s>{old} {CUR}</s>' if old else ''
    im = ph(src, f, "im", f'{b}{k}<div class="hrt{" on" if fav else ""}">{ic("favorite")}</div>', style="background-blend-mode:multiply" if mult else "background-blend-mode:normal")
    return f'''<div class="pc">{im}<div class="bd"><div class="br">{brand}</div><div class="nm">{name}</div>
<div class="meta"><span class="rt">{ic("star","fill")}{rate}</span><span>({cnt})</span><span>· {size}</span></div>
<div class="ft"><div class="pr"><b>{p} <small>{CUR}</small></b>{o}</div><div class="ad">{ic("add")}</div></div></div></div>'''

def stars(n=5, half=False):
    return ''.join(ic("star", "fill") for _ in range(n)) + (ic("star_half", "fill") if half else '')

# ------------------------------------------------------------ HOME
def home():
    h = STATUS
    h += f'''<div class="hdr"><div class="logo"><div class="mk"><i></i></div><div><b>نقاء</b><small>NAQA · DERMA LAB</small></div></div>
<div class="hic"><div class="ib">{ic("notifications")}<span class="n">2</span></div><div class="ib dk">{ic("segment")}</div></div></div>'''
    h += f'<div class="hello"><span>صباح الخير، <b>سارة</b> · بشرتكِ مختلطة</span><span class="uv">{ic("wb_sunny")}UV 9 اليوم</span></div>'
    h += f'<div class="srch">{ic("search")}<div class="t">ابحثي بالمكوّن أو المشكلة أو المنتج…</div><div class="sc">{ic("qr_code_scanner")}</div></div>'
    # hero
    h += '<div class="hscroll hero">'
    h += f'''<div class="hc">{ph("c/ca3b.jpg", "0.62 0.45 1.05", "bg mir")}<div class="fade"></div><div class="tx">
<span class="tag">{ic("science")}سيروم فيتامين C · مختبَر سريرياً</span><h2>إشراقة واضحة<br>خلال 28 يوماً</h2>
<div class="stats"><span><b class="lat">+48%</b> إشراق</span><span><b class="lat">−31%</b> بقع</span></div>
<div class="cta">تسوّقي السيروم{ic("arrow_back")}</div></div></div>'''
    h += f'<div class="hc">{ph("c/839c.jpg", "0.5 0.45 1.05", "bg")}</div></div>'
    h += '<div class="segs"><i class="on"></i><i></i><i></i><i></i><span>01/04</span></div>'
    # concerns
    h += f'<div class="sh"><div><span class="k">SHOP BY CONCERN</span><h3>تسوّقي حسب المشكلة</h3></div><a>الكل{ic("chevron_left")}</a></div>'
    cs = [("blur_on", "حب الشباب", 1), ("contrast", "التصبّغات", 0), ("water_drop", "الجفاف", 0), ("timeline", "الخطوط الدقيقة", 0),
          ("grain", "المسام", 0), ("healing", "الحساسية", 0), ("visibility", "الهالات", 0), ("light_mode", "البهتان", 0)]
    h += '<div class="ctiles">' + ''.join(f'<div class="ct{" on" if on else ""}">{ic(a)}<span>{b}</span></div>' for a, b, on in cs) + '</div>'
    # scan
    h += f'<div class="sh"><div><span class="k">AI SKIN SCAN</span><h3>تحليل بشرتكِ</h3></div><a>السجل{ic("chevron_left")}</a></div>'
    face = ph("c/ee61.jpg", "0.33 0.42 1.15", "face", '<div class="frm"><i></i><i></i><i></i><i></i></div><div class="ln"></div><span class="dt" style="top:58px;right:44px"></span><span class="dt" style="top:96px;left:40px"></span><span class="dt" style="top:120px;right:58px"></span>')
    mets = [("الترطيب", 62, ""), ("المسام", 48, ""), ("التصبّغات", 35, "w"), ("المرونة", 71, "")]
    h += f'''<div class="scan">{face}<div class="bd"><small>آخر فحص · قبل 6 أيام</small><h4>بشرتكِ تحسّنت بنسبة 12% هذا الشهر</h4><div class="mets">''' + \
         ''.join(f'<div class="met"><div class="r"><span>{n}</span><b>{v}/100</b></div><div class="bar"><i class="{c}" style="width:{v}%"></i></div></div>' for n, v, c in mets) + \
         f'</div><div class="go" style="margin-top:12px">ابدئي فحصاً جديداً{ic("arrow_back")}</div></div></div>'
    # ingredients
    h += f'<div class="sh"><div><span class="k">ACTIVE INGREDIENTS</span><h3>المكوّنات الفعّالة</h3></div><a>دليل المكوّنات{ic("chevron_left")}</a></div><div class="hscroll ings">'
    for pct, n, d, c, dk in [("10", "نياسيناميد", "يوازن الدهون ويصغّر المسام", "42", 1), ("0.3", "ريتينول", "يجدّد البشرة ويقلّل الخطوط", "18", 0),
                             ("2", "هيالورونيك", "ترطيب عميق على 3 مستويات", "36", 0), ("15", "فيتامين C", "إشراق وتوحيد للون", "24", 0)]:
        h += f'<div class="ingc{" dk" if dk else ""}"><div class="mol"></div><div class="pct">{pct}<small>%</small></div><b>{n}</b><p>{d}</p><em>{ic("inventory_2")}{c} منتجاً</em></div>'
    h += '</div>'
    # bestsellers
    h += f'<div class="sh"><div><span class="k">PHARMACIST PICKS</span><h3>الأكثر طلباً هذا الأسبوع</h3></div><a>عرض الكل{ic("chevron_left")}</a></div><div class="g2">'
    h += pc("c/ca3b.jpg", "0.37 0.52 2.6", "NAQA LAB", "سيروم النياسيناميد والزنك", "30 مل", 89, None, "4.9", "3.4k", "نياسيناميد <b>10%</b>", "الأكثر مبيعاً", True)
    h += pc("c/c68c.jpg", "0.41 0.35 2.6", "DERMA·ONE", "كريم السيراميد المرمّم للحاجز", "50 مل", 129, 159, "4.8", "2.1k", "سيراميد <b>3%</b>", "-20%")
    h += pc("c/e258.jpg", "0.52 0.5 1.6", "PURE FORMULA", "زيت السكوالين النقي للوجه", "30 مل", 74, None, "4.7", "980", "سكوالين <b>100%</b>")
    h += pc("c/1d04.jpg", "0.55 0.55 1.5", "PURE FORMULA", "بلسم التنظيف بزيت جوز الهند", "100 مل", 79, None, "4.8", "1.6k", "زيوت نباتية <b>98%</b>")
    h += '</div>'
    # routine
    h += f'<div class="sh"><div><span class="k">YOUR ROUTINE</span><h3>روتينكِ في 4 خطوات</h3></div><a>تعديل{ic("chevron_left")}</a></div>'
    h += f'<div class="rout"><div class="tg"><span class="on">{ic("wb_sunny")}الصباح</span><span>{ic("dark_mode")}المساء</span></div>'
    for k, (src, f, t, n, d, p, done) in enumerate([("c/dae2.jpg", "0.12 0.3 2.4", "تنظيف", "غسول الشوفان اللطيف", "لطيف على حاجز البشرة · 150 مل", 62, 1),
                                                    ("c/ad0d.jpg", "0.45 0.32 2.6", "علاج", "سيروم فيتامين C المستقر", "3 قطرات صباحاً", 118, 1),
                                                    ("c/b16b.jpg", "0.42 0.32 2.8", "ترطيب", "كريم السيراميد الخفيف", "بحجم حبة البازلاء", 129, 0),
                                                    ("c/f15c.jpg", "0.25 0.72 2.4", "حماية", "واقي شمس شفاف <span class=\"lat\">SPF 50+</span>", "أعيديه كل ساعتين", 84, 0)]):
        h += f'<div class="stp{" done" if done else ""}"><span class="n">{ic("check") if done else k+1}</span>' + ph(src, f, "th", style="background-blend-mode:multiply") + f'<div class="tx"><small>{t}</small><b>{n}</b><em>{d}</em></div><span class="p">{p} <small>{CUR}</small></span></div>'
    h += f'<div class="rtot"><div><small>الروتين كاملاً · خصم 15%</small><b>334 <small>{CUR}</small></b><s>393</s></div><div class="bt ac">{ic("shopping_bag")}أضيفي الروتين</div></div></div>'
    # UV banner
    h += '<div class="sh" style="margin-top:26px"></div>'
    scale = ''.join(f'<i style="background:{c}"></i>' for c in ["#4BA36B", "#9BC14B", "#E6C33A", "#E8902F", "#D9542B", "#B53A6E"])
    h += f'''<div class="uvb">{ph("c/14ed.jpg", "0.5 0.4 1.1", "ph")}<div class="tx"><small>{ic("location_on")}دبي · مؤشر الأشعة فوق البنفسجية</small>
<div class="g"><b class="lat">9</b><span>مرتفع جداً</span></div><div class="scale">{scale}</div>
<p>الحماية ضرورية اليوم. أعيدي وضع الواقي كل ساعتين.</p><div class="cta">واقيات الشمس{ic("arrow_back")}</div></div></div>'''
    # proof
    h += f'<div class="sh"><div><span class="k">CLINICAL RESULTS</span><h3>نتائج مثبتة</h3></div></div>'
    h += f'''<div class="proof"><div class="st3"><div><b>94%</b><span>لاحظن بشرة أنعم خلال أسبوعين</span></div><div><b>28</b><span>يوماً لنتائج واضحة على التصبّغات</span></div><div><b>120</b><span>مشاركة في الدراسة السريرية</span></div></div>
<div class="q"><div class="av">{ic("medical_services")}</div><p><b>د. ليلى حدّاد، اختصاصية جلدية:</b> ابدئي بتركيز منخفض من الريتينول مرتين أسبوعياً، ولا تنسي الواقي صباحاً.</p></div></div>'''
    # samples
    h += '<div class="sh" style="margin-top:26px"></div>'
    h += '<div class="samp"><h4>اختاري عيّنتين مجاناً</h4><p>مع كل طلب فوق 150 د.إ · تم اختيار 2 من 2</p><div class="sl">'
    for on, src, f, n, s in [(1, "c/e258.jpg", "0.52 0.5 1.9", "زيت السكوالين", "5 مل"), (1, "c/b16b.jpg", "0.42 0.32 3.2", "كريم السيراميد", "7 مل"), (0, "c/839c.jpg", "0.14 0.22 2.6", "سيروم الهيالورونيك", "5 مل")]:
        h += f'<div class="s{"" if on else " off"}">' + ph(src, f, "si") + f'<b>{n}</b><small>{s}</small><span class="ck">{ic("check")}</span></div>'
    h += '</div></div>'
    h += tabbar(0)
    return f'<div class="screen">{h}</div>'

# ------------------------------------------------------------ MENU
MCATS = [
    ("01", "العناية بالبشرة", "1,180", [("c/dae2.jpg", "0.14 0.32 1.9", "المنظّفات", "164"), ("c/ca3b.jpg", "0.37 0.52 2.4", "السيرومات", "212"),
                                     ("c/27ab.jpg", "0.24 0.33 2.6", "المرطّبات", "236"), ("c/f15c.jpg", "0.25 0.7 2.2", "واقيات الشمس", "88")]),
    ("02", "حسب المشكلة", "8 مشاكل", [("c/d191.jpg", "0.33 0.38 1.8", "حب الشباب", "96"), ("c/4c4c.jpg", "0.6 0.35 1.6", "التصبّغات", "74"),
                                   ("c/14ed.jpg", "0.55 0.32 1.9", "علامات التقدّم", "110"), ("c/4996.jpg", "0.62 0.45 1.6", "الجفاف", "130")]),
    ("03", "المكياج الصحي", "420", [("c/062e.jpg", "0.47 0.5 1.6", "البشرة", "140"), ("c/268f.jpg", "0.66 0.55 1.7", "الشفاه", "96"),
                                   ("c/45ac.jpg", "0.52 0.62 1.4", "العيون", "120"), ("c/9265.jpg", "0.45 0.5 1.1", "الأدوات", "64")]),
    ("04", "الجسم", "360", [("c/58a8.jpg", "0.25 0.6 1.3", "الاستحمام", "98"), ("c/e258.jpg", "0.52 0.5 1.5", "الزيوت", "54"),
                            ("c/2674.jpg", "0.45 0.6 1.6", "ترطيب الجسم", "120")]),
    ("05", "الشعر وفروة الرأس", "290", [("c/0156.jpg", "0.6 0.45 1.25", "الشامبو والبلسم", "130"), ("c/c594.jpg", "0.5 0.72 1.6", "علاجات الفروة", "60"), ("c/1fa4.jpg", "0.72 0.55 1.4", "الزيوت", "48")]),
    ("06", "للرجال", "140", [("c/b0da.jpg", "0.72 0.45 1.6", "الحلاقة", "56"), ("c/cfa0.jpg", "0.5 0.55 1.3", "اللحية", "38")]),
]

def menu():
    h = STATUS
    h += f'''<div class="mtop"><div class="logo"><div class="mk"><i></i></div><div><b>نقاء</b><small>NAQA · DERMA LAB</small></div></div><div class="ib">{ic("close")}</div></div>'''
    h += f'<div class="srch" style="margin-top:8px">{ic("search")}<div class="t">ابحثي في الأقسام والمكوّنات…</div><div class="sc">{ic("qr_code_scanner")}</div></div>'
    h += '<div class="mq4">'
    for icn, b, s, dk in [("center_focus_weak", "فحص البشرة", "تحليل خلال دقيقة", 1), ("new_releases", "وصل حديثاً", "38 منتجاً", 0),
                          ("percent", "العروض", "حتى 30%", 0), ("medical_services", "استشارة مجانية", "مع اختصاصية", 0)]:
        h += f'<div class="{"dk" if dk else ""}"><i>{ic(icn)}</i><span><b>{b}</b><small>{s}</small></span></div>'
    h += '</div>'
    for k, name, cnt, subs in MCATS:
        unit = cnt if not cnt[0].isdigit() or ' ' in cnt else cnt + ' منتجاً'
        h += f'<div class="mcat"><div class="mh"><div><span class="k">{k}</span><b>{name}<small>{unit}</small></b></div><a>عرض الكل{ic("chevron_left")}</a></div><div class="hscroll mrow">'
        big = cnt.split(' ')[0]
        h += f'<div class="mcd all"><div class="im">{ic("arrow_back")}<span>{big}<small>{"منتجاً" if " " not in cnt else "مشاكل"}</small></span></div><b>كل المنتجات</b><small>{len(subs)} أقسام فرعية</small></div>'
        for src, f, n, c in subs:
            h += f'<div class="mcd">' + ph(src, f, "im") + f'<b>{n}</b><small>{c} منتجاً</small></div>'
        h += '</div></div>'
    h += '<div class="mgrp"><div class="lb">حسابي</div><div class="mlist">'
    for icn, t, r in [("person", "حسابي", '<small>سارة المنصوري</small>'), ("package_2", "طلباتي", '<span class="tg">وصل اليوم</span>'),
                      ("favorite", "المفضّلة", '<small>12 منتجاً</small>'), ("language", "اللغة", '<div class="seg2"><i class="on">العربية</i><i>English</i></div>')]:
        h += f'<div class="ml">{ic(icn, "l")}<span class="t">{t}</span>{r}{"" if icn=="language" else ic("chevron_left","c")}</div>'
    h += '</div></div>'
    h += '<div class="mgrp" style="margin-top:20px"><div class="lb">تواصلي معنا · يومياً حتى 11 مساءً</div></div>'
    h += f'<div class="cnt3"><div class="dk">{ic("chat")}محادثة</div><div>{ic("call")}اتصال</div><div>{ic("mail")}بريد</div></div>'
    h += '<div class="mver">نقاء · مختبر العناية بالبشرة · الإصدار 2.6</div>'
    return f'<div class="screen" style="padding-bottom:44px">{h}<div class="homeind"></div></div>'

# ------------------------------------------------------------ LISTING
def listing():
    h = STATUS
    h += f'''<div class="ltop"><div class="ib">{ic("arrow_forward")}</div><div class="tt"><small>العناية بالبشرة</small><b>السيرومات والعلاجات</b></div><div class="ib">{ic("search")}</div><div class="ib">{ic("shopping_bag")}<span class="n">2</span></div></div>'''
    ch = [("الكل", "212", 1), ("نياسيناميد", "42", 0), ("ريتينول", "18", 0), ("فيتامين C", "24", 0), ("أحماض مقشّرة", "30", 0)]
    h += '<div class="hscroll lch">' + ''.join(f'<div class="lc{" on" if on else ""}">{a}<b>{b}</b></div>' for a, b, on in ch) + '</div>'
    h += f'<div class="fb"><div class="f1">{ic("tune")}تصفية<em>3</em></div><div class="f2"><span>ترتيب: <b>الأعلى تقييماً</b></span>{ic("swap_vert")}</div><div class="f3">{ic("view_agenda")}</div></div>'
    h += f'<div class="tags"><span class="tag2">بشرة دهنية{ic("close")}</span><span class="tag2">خالٍ من العطور{ic("close")}</span><span class="tag2">أقل من 150 د.إ{ic("close")}</span><span class="clr">مسح</span></div>'
    h += f'<div class="lmeta"><div><b>64</b> نتيجة من 212</div><span>{ic("verified")}موصى بها من اختصاصيات</span></div>'
    cards = [
        pc("c/ca3b.jpg", "0.37 0.52 2.6", "NAQA LAB", "سيروم النياسيناميد والزنك", "30 مل", 89, None, "4.9", "3.4k", "نياسيناميد <b>10%</b>", "الأكثر مبيعاً", True),
        pc("c/839c.jpg", "0.14 0.22 2.4", "NAQA LAB", "سيروم الهيالورونيك وفيتامين B5", "30 مل", 79, None, "4.8", "2.7k", "هيالورونيك <b>2%</b>"),
        pc("c/c68c.jpg", "0.41 0.35 2.6", "DERMA·ONE", "كريم الريتينول الليلي المجدِّد", "30 مل", 145, 179, "4.7", "1.1k", "ريتينول <b>0.3%</b>", "-19%"),
        pc("c/e258.jpg", "0.52 0.5 1.6", "PURE FORMULA", "زيت السكوالين النقي للوجه", "30 مل", 74, None, "4.7", "980", "سكوالين <b>100%</b>"),
        pc("c/d191.jpg", "0.33 0.38 2.0", "DERMA·ONE", "علاج موضعي بحمض الساليسيليك", "15 مل", 58, None, "4.6", "760", "BHA <b>2%</b>", None, True),
        pc("c/1d04.jpg", "0.55 0.55 1.5", "PURE FORMULA", "بلسم الترميم الليلي بالزيوت", "50 مل", 98, None, "4.8", "1.6k", "سيراميد <b>1%</b>"),
        pc("c/ad0d.jpg", "0.45 0.32 2.6", "NAQA LAB", "سيروم فيتامين C المستقر", "30 مل", 118, 139, "4.8", "1.9k", "فيتامين C <b>15%</b>", "-15%"),
        pc("c/27ab.jpg", "0.24 0.33 2.8", "PURE FORMULA", "كريم العين بالكافيين", "15 مل", 92, None, "4.6", "540", "كافيين <b>5%</b>"),
    ]
    promo = f'''<div class="lpro"><div class="rg"><span>78%</span></div><div class="tx"><small>لم تكملي فحص البشرة بعد</small><b>أكملي الفحص لنرتّب لكِ السيرومات حسب بشرتكِ</b><span class="cta">متابعة الفحص{ic("arrow_back")}</span></div></div>'''
    h += '<div class="g2">' + ''.join(cards[:4]) + promo + ''.join(cards[4:]) + '</div>'
    h += f'<div class="lmore"><div class="pg">عرض <b>8</b> من 64</div><div class="bar"><i></i></div><div class="b2">{ic("refresh")}تحميل 8 منتجات أخرى</div></div>'
    h += tabbar(1)
    return f'<div class="screen">{h}</div>'

# ------------------------------------------------------------ PRODUCT
BSH = [("F1", "فاتح بارد", "#F1DACB"), ("L2", "فاتح دافئ", "#E9C7A9"), ("M3", "متوسط", "#D6A783"), ("M4", "متوسط دافئ", "#C48F67"), ("T5", "حنطي", "#A9744E"), ("D6", "عميق", "#7C5036")]

def product():
    h = STATUS
    h += f'<div class="ptop"><div class="ib">{ic("arrow_forward")}</div><div class="g"><div class="ib">{ic("ios_share")}</div><div class="ib">{ic("favorite")}</div><div class="ib">{ic("shopping_bag")}<span class="n">2</span></div></div></div>'
    h += f'''<div class="gal">{ph("c/ca3b.jpg", "0.55 0.45 1.0", "bg mir")}<div class="lab"><span class="b lat">SPF 30 · PA+++</span><span>نياسيناميد 4%</span><span>مختبَر جلدياً</span></div>
<div class="zoom">{ic("zoom_in")}</div><div class="bar"><i class="on"></i><i></i><i></i><i></i><i></i></div></div>'''
    h += '<div class="thm">' + ph("c/ca3b.jpg", "0.37 0.5 1.8", "on") + ph("c/10db.jpg", "0.52 0.32 1.4") + ph("c/839c.jpg", "0.3 0.45 1.4") + ph("c/ee61.jpg", "0.45 0.45 1.3") + '<div class="tx"><b>6</b>درجات</div></div>'
    h += f'''<div class="pin"><div class="r1"><span class="br">NAQA LAB {ic("verified","fill")}</span><span class="rx">{ic("medical_services")}توصية اختصاصية جلدية</span></div>
<h1>سيروم البشرة الملوّن بعامل حماية SPF 30</h1><div class="sub">تغطية شفافة · نياسيناميد 4% + سكوالين · 30 مل</div>
<div class="rr"><span class="s">{stars(4, True)}</span><b>4.7</b><span>2,860 تقييماً</span><i></i><span>أُعيد شراؤه 9,400 مرة</span></div></div>'''
    h += f'''<div class="prc"><div class="p"><b>109 <small>{CUR}</small></b><div><s>135 {CUR}</s><em>-19%</em><span>· 27.25 × 4 دفعات</span></div></div><div class="pp"><b>متوفر للتوصيل اليوم</b>شامل الضريبة</div></div>'''
    # shades
    h += f'<div class="blk"><div class="bh"><b>الدرجة: <span>M3 · متوسط محايد</span></b><a>{ic("center_focus_weak")}طابقيها بالكاميرا</a></div><div class="shs">'
    for code, n, c in BSH:
        h += f'<div class="sh2{" on" if code=="M3" else ""}{" off" if code=="D6" else ""}"><i style="background:{c}"></i><div><b>{code}</b><small>{n}</small></div></div>'
    h += '</div><div class="ut"><span><i style="background:#E9C7A9"></i>دافئ: ذهبي</span><span><i style="background:#D6A783"></i>محايد: متوازن</span><span><i style="background:#F1DACB"></i>بارد: وردي</span><span>· D6 تنفد قريباً</span></div>'
    h += '<div class="bh" style="margin-top:16px"><b>الحجم</b></div><div class="sz"><div class="on"><b>30 مل</b><small>109 د.إ</small></div><div><b>50 مل</b><small>159 د.إ · وفّري 12%</small></div><div><b>عيّنة 5 مل</b><small>19 د.إ</small></div></div></div>'
    # clinical results
    h += f'<div class="blk"><div class="bh"><b>نتائج سريرية</b><a>الدراسة كاملة{ic("chevron_left")}</a></div><div class="res">'
    for v, t in [("93%", "بشرة تبدو أكثر توحّداً"), ("+41%", "ترطيب بعد 8 ساعات"), ("88%", "لم يسبّب لمعاناً طوال اليوم")]:
        w = v.strip('+%')
        h += f'<div class="re"><b>{v}</b><div><span>{t}</span><div class="bar"><i style="width:{w}%"></i></div></div></div>'
    h += '</div><div class="foot">دراسة مستقلة على 64 مشاركة لمدة 4 أسابيع، بإشراف اختصاصيين جلديين.</div></div>'
    # skin type
    h += f'<div class="blk"><div class="bh"><b>نوع البشرة</b><a>ما نوع بشرتي؟{ic("chevron_left")}</a></div><div class="skt">'
    for n, e, cl, icn in [("مختلطة", "بشرتكِ", "me", "check_circle"), ("دهنية", "مثالي", "", "check_circle"), ("عادية", "مناسب", "", "check_circle"), ("جافة", "مع مرطّب", "no", "info")]:
        h += f'<div class="{cl}">{ic(icn,"fill")}{n}<em>{e}</em></div>'
    h += '</div></div>'
    # formula
    h += f'<div class="blk"><div class="bh"><b>التركيبة الفعّالة</b><a>كل المكوّنات (INCI){ic("chevron_left")}</a></div><div class="ftab"><div class="fr h"><span class="c1">المكوّن</span><span class="c2">التركيز</span><span class="c3">الوظيفة</span></div>'
    for n, s, p, f in [("نياسيناميد", "فيتامين B3", "4%", "توحيد اللون"), ("أكسيد الزنك", "فلتر معدني", "12%", "حماية UVA/UVB"), ("سكوالين", "من الزيتون", "3%", "ترطيب"), ("سيراميد NP", "مرمّم الحاجز", "0.5%", "تقوية الحاجز")]:
        h += f'<div class="fr"><span class="c1">{n}<small>{s}</small></span><span class="c2">{p}</span><span class="c3">{f}</span></div>'
    h += '</div><div class="badges">' + ''.join(f'<span>{ic("check_circle","fill")}{t}</span>' for t in ["خالٍ من العطور", "لا يسدّ المسام", "pH 5.5", "نباتي", "آمن للحساسة"]) + '</div></div>'
    # how to use
    h += '<div class="blk"><div class="bh"><b>طريقة الاستخدام</b><a>' + ic("play_circle") + 'فيديو 40 ث</a></div><div class="tl">'
    for icn, t, d, me in [("water_drop", "نظّفي ورطّبي", "على بشرة نظيفة بعد السيروم والمرطّب.", 0),
                          ("colorize", "رجّي ثم ضعي 4–5 قطرات", "وزّعيها بأطراف الأصابع من الوسط للخارج.", 1),
                          ("schedule", "أعيدي كل ساعتين", "عند التعرّض المباشر للشمس أو بعد التعرّق.", 0)]:
        h += f'<div class="tli{" me" if me else ""}"><span class="n">{ic(icn)}</span><div><b>{t}{"<em>مهم</em>" if me else ""}</b><small>{d}</small></div></div>'
    h += f'</div><div class="amt">{ic("info")}<span>الكمية المثالية للوجه والرقبة: <b>نصف قطّارة</b> تقريباً</span></div></div>'
    # delivery
    h += '<div class="dlv">'
    for icn, t, s, e in [("local_shipping", "توصيل اليوم خلال 4 ساعات", "دبي، الشارقة، عجمان", "مجاني"), ("assignment_return", "إرجاع مجاني خلال 30 يوماً", "حتى لو كانت العبوة مفتوحة", ""),
                         ("verified_user", "ضمان الأصالة", "مباشرة من المختبر", ""), ("ac_unit", "تخزين مبرّد", "يحافظ على ثبات المكوّنات", "")]:
        h += f'<div class="dl">{ic(icn)}<div class="t"><b>{t}</b><small>{s}</small></div>{f"<em>{e}</em>" if e else ""}</div>'
    h += '</div>'
    h += f'''<div class="acd"><div class="ai"><div class="ah">عن المنتج{ic("remove")}</div><p>سيروم خفيف بلون شفاف يوحّد البشرة ويحميها من الشمس في خطوة واحدة. بتركيبة معدنية لا تترك أثراً أبيض، مناسبة لمناخ الخليج الحار والرطب.</p></div>
<div class="ai"><div class="ah">المكوّنات الكاملة (INCI){ic("add")}</div></div><div class="ai"><div class="ah">التحذيرات والتخزين{ic("add")}</div></div><div class="ai"><div class="ah">الشحن والإرجاع{ic("add")}</div></div></div>'''
    # reviews
    h += f'<div class="sh"><div><span class="k">REVIEWS</span><h3>تقييمات موثّقة</h3></div><a>أضيفي تقييماً{ic("chevron_left")}</a></div>'
    h += f'<div class="rvs"><div class="top"><div class="sc"><b>4.7<small>/5</small></b><div class="s">{stars(4, True)}</div><span>2,860 تقييماً · 91% يوصين</span></div><div class="att">'
    for n, v in [("التغطية", 3), ("الثبات", 4), ("الترطيب", 5), ("مطابقة اللون", 4)]:
        h += f'<div class="at"><div class="r"><span>{n}</span><b>{v}.{"0" if v==5 else "6"}</b></div><div class="bar">' + ''.join(f'<i class="{"f" if k<v else ""}"></i>' for k in range(5)) + '</div></div>'
    h += '</div></div></div>'
    h += f'<div class="rch"><span class="on">الكل</span><span>{ic("photo_camera")}مع صور 420</span><span>بشرة مختلطة</span><span>الدرجة M3</span></div>'
    h += '<div class="rph">' + ph("c/b1a5.jpg", "0.6 0.35 1.4") + ph("c/62ed.jpg", "0.45 0.4 1.4") + ph("c/ad0d.jpg", "0.5 0.4 1.4") + ph("c/6b34.jpg", "0.42 0.4 1.6", "m", "<span>+416</span>") + '</div>'
    h += f'''<div class="rv"><div class="h"><div class="av">ر</div><div class="w"><b>ريم العلي</b><small>{ic("verified","fill")}شراء موثّق · استخدام 6 أسابيع</small></div><span class="s">{stars(5)}</span></div>
<div class="chips"><span>بشرة مختلطة</span><span>الدرجة M3</span><span>عمر 25–34</span></div>
<div class="wk">{ph("c/62ed.jpg", "0.5 0.4 1.6", "", "<span>الأسبوع 1</span>")}{ph("c/b1a5.jpg", "0.6 0.35 1.6", "", "<span>الأسبوع 6</span>")}</div>
<p>أخيراً واقٍ لا يلمع ولا يترك أثراً أبيض! اللون M3 اندمج مع بشرتي تماماً، والبقع خفّت بشكل واضح بعد شهر ونصف.</p>
<div class="hl"><span>{ic("thumb_up")}مفيد (112)</span><span>قبل أسبوع</span></div></div>'''
    h += f'<div class="rvall">كل التقييمات (2,860){ic("arrow_back")}</div>'
    # goes well with
    h += f'<div class="sh"><div><span class="k">PAIRS WELL</span><h3>يتناسق مع</h3></div><a>وفّري 15%</a></div><div class="gw">'
    for on, src, f, k, n, p in [(1, "c/ca3b.jpg", "0.37 0.52 2.8", "الخطوة 3 · هذا المنتج", "سيروم البشرة الملوّن SPF 30", 109),
                                (1, "c/dae2.jpg", "0.12 0.3 2.4", "الخطوة 1 · تنظيف", "غسول الشوفان اللطيف pH 5.5", 62),
                                (0, "c/c68c.jpg", "0.41 0.35 2.8", "الخطوة 2 · ترطيب", "كريم السيراميد المرمّم", 129)]:
        h += f'<div class="gwi"><span class="ck{"" if on else " off"}">{ic("check") if on else ""}</span>' + ph(src, f, "im") + f'<div class="t"><small>{k}</small><b>{n}</b></div><em>{p} <small>{CUR}</small></em></div>'
    h += f'<div class="gwt"><div><small>منتجان محدّدان</small><b>145 <small>{CUR}</small></b><s>171</s></div><div class="bt">{ic("add_shopping_cart")}أضيفي الاثنين</div></div></div>'
    # also like
    h += f'<div class="sh"><div><span class="k">YOU MAY ALSO LIKE</span><h3>قد يعجبكِ أيضاً</h3></div><a>عرض الكل{ic("chevron_left")}</a></div><div class="hscroll row" style="gap:10px">'
    h += pc("c/ad0d.jpg", "0.45 0.32 2.6", "NAQA LAB", "سيروم فيتامين C المستقر", "30 مل", 118, None, "4.8", "1.9k", "فيتامين C <b>15%</b>")
    h += pc("c/27ab.jpg", "0.24 0.33 2.8", "PURE FORMULA", "كريم العين بالكافيين", "15 مل", 92, None, "4.6", "180", "كافيين <b>5%</b>")
    h += pc("c/e258.jpg", "0.52 0.5 1.6", "PURE FORMULA", "زيت السكوالين النقي للوجه", "30 مل", 74, None, "4.7", "980", "سكوالين <b>100%</b>")
    h += '</div>'
    h += f'''<div class="stk"><div class="pv"><i style="background:#D6A783"></i><div><b>M3</b><small>30 مل</small></div></div><div class="go">{ic("shopping_bag")}أضيفي إلى السلة<span>· 109 {CUR}</span></div></div><div class="homeind"></div>'''
    return f'<div class="screen" style="padding-bottom:112px">{h}</div>'

SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
