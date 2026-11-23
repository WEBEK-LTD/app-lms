from lib import STATUS, ic, ph, stars

FONT = "rubik"
TITLE = "Habka"
CUR = "ج.م"
C = "crochet/"

CSS = """
:root{--bg:#FAF8F6;--surface:#FFFFFF;--soft:#F1ECEE;--soft2:#E6DEE2;--ink:#1F1A1D;--ink2:#625A5F;--ink3:#8D8489;--line:#ECE6E9;
--plum:#6E2F55;--plumT:#6E2F55;--plumS:#F3E7EE;--tile:#EEE8EA;--tab:rgba(255,255,255,.88);--star:#C2883A}
html.dark{--bg:#121012;--surface:#1C181B;--soft:#262125;--soft2:#332C31;--ink:#F3EDF0;--ink2:#BDB3B8;--ink3:#948A90;--line:#2E282C;
--plum:#8B3D6C;--plumT:#E6A9CA;--plumS:#34202C;--tile:#EAE4E6;--tab:rgba(32,27,31,.9);--star:#E0AE62}
body{font-family:'Rubik',sans-serif}
.screen{padding-bottom:116px}
.hdr{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.wm b{font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1;display:flex;align-items:center;gap:6px}
.wm b i{width:22px;height:22px;border-radius:7px;background:var(--plum);display:grid;place-items:center}
.wm small{display:block;font-size:10.5px;color:var(--ink3);letter-spacing:.18em;margin-top:4px;direction:ltr;text-align:right}
.hi{display:flex;gap:8px}
.sq{width:42px;height:42px;border-radius:13px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;position:relative}
.sq .ms{font-size:22px}
.sq .n{position:absolute;top:8px;left:9px;width:9px;height:9px;border-radius:5px;background:var(--plum);box-shadow:0 0 0 2px var(--surface)}
.hello{padding:6px 16px 0;font-size:22px;font-weight:600;letter-spacing:-.01em}
.hello span{color:var(--plumT)}
.hello small{display:block;font-size:12.5px;color:var(--ink3);font-weight:400;margin-top:3px}
.sr{display:flex;gap:8px;margin:14px 16px 0}
.sr .s{flex:1;height:50px;border-radius:15px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--ink3);font-size:13px}
.sr .s .ms{font-size:22px;color:var(--ink2)}
.sr .d{height:50px;padding:0 14px;border-radius:15px;background:var(--plum);color:#fff;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500}
.sr .d .ms{font-size:20px}
.chips{gap:8px;margin-top:16px}
.chip{height:40px;padding:0 14px 0 16px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:13px;white-space:nowrap;color:var(--ink2)}
.chip .ms{font-size:19px}
.chip.on{background:var(--ink);color:var(--bg);box-shadow:none;font-weight:500}
.hero{gap:10px;margin-top:18px}
.hc{width:340px;height:212px;border-radius:20px;overflow:hidden;display:flex;background:var(--plum)}
html.dark .hc{background:#5E2748}
.hc .tx{flex:0 0 172px;padding:18px 18px 16px;color:#fff;display:flex;flex-direction:column}
.hc .tx small{font-size:11px;color:#F2C9DF;font-weight:500;letter-spacing:.02em}
.hc .tx h2{font-size:22px;font-weight:700;line-height:1.3;margin-top:6px;letter-spacing:-.01em}
.hc .tx p{font-size:11.5px;color:#EBD3E0;margin-top:5px;line-height:1.5}
.hc .tx span{margin-top:auto;align-self:flex-start;height:36px;padding:0 13px;border-radius:11px;background:rgba(255,255,255,.16);display:flex;align-items:center;gap:5px;font-size:12px;font-weight:500}
.hc .tx span .ms{font-size:17px}
.hc .im{flex:1;background-color:var(--tile);border-radius:16px;margin:6px}
.ind{display:flex;gap:5px;margin:12px 16px 0;justify-content:center}
.ind i{width:6px;height:6px;border-radius:2px;background:var(--soft2)}
.ind i.on{width:22px;background:var(--plumT)}
.sec{margin-top:32px}
.sh{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:13px}
.sh h3{font-size:19px;font-weight:700;letter-spacing:-.01em}
.sh .sub{font-size:12px;color:var(--ink3);margin-top:3px}
.sh a{font-size:12.5px;font-weight:500;color:var(--plumT);display:flex;align-items:center}
.sh a .ms{font-size:18px}
.trk{margin:0 16px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:14px;display:flex;gap:14px;align-items:center}
.ring{width:72px;height:72px;border-radius:50%;background:conic-gradient(var(--plumT) 0 62%,var(--soft) 62% 100%);display:grid;place-items:center;flex:0 0 auto}
.ring div{width:58px;height:58px;border-radius:50%;background-color:var(--tile)}
.trk .t{flex:1}
.trk .t small{font-size:11px;color:var(--plumT);font-weight:500;display:flex;align-items:center;gap:4px}
.trk .t small .ms{font-size:14px}
.trk .t b{display:block;font-size:14.5px;font-weight:600;margin-top:3px}
.trk .t p{font-size:11.5px;color:var(--ink2);margin-top:3px}
.trk .t .pb{height:5px;border-radius:3px;background:var(--soft);margin-top:9px;overflow:hidden}
.trk .t .pb i{display:block;width:62%;height:100%;background:var(--plumT);border-radius:3px}
.trk .t .pl{display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink3);margin-top:5px}
.cfg{margin:0 16px;border-radius:22px;background:var(--plumS);padding:16px}
.cfg h4{font-size:17px;font-weight:700}
.cfg p{font-size:12px;color:var(--ink2);margin-top:3px}
.cfg .lbl{font-size:11.5px;color:var(--ink2);margin:14px 0 8px;display:flex;justify-content:space-between}
.cfg .lbl b{color:var(--ink);font-weight:600}
.typ{display:flex;gap:8px}
.typ div{flex:1;border-radius:14px;background:var(--surface);padding:10px 6px;text-align:center;font-size:12px;color:var(--ink2)}
.typ div .ms{display:block;margin:0 auto 4px;font-size:22px}
.typ div.on{box-shadow:0 0 0 1.6px var(--plumT);color:var(--ink);font-weight:600}
.typ div.on .ms{color:var(--plumT)}
.sws{display:flex;gap:8px}
.sws i{width:34px;height:34px;border-radius:10px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.sws i.on{box-shadow:0 0 0 2px var(--plumS),0 0 0 3.5px var(--ink)}
.cfg .ft{display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding-top:14px;border-top:1px solid rgba(110,47,85,.14)}
html.dark .cfg .ft{border-color:rgba(255,255,255,.08)}
.cfg .ft small{display:block;font-size:11px;color:var(--ink2)}
.cfg .ft b{font-size:18px;font-weight:700}
.cfg .ft b small{display:inline;font-size:11px;font-weight:400}
.pbtn{height:44px;padding:0 16px;border-radius:13px;background:var(--plum);color:#fff;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500}
.pbtn .ms{font-size:19px}
.prow{gap:12px}
.pc{width:156px}
.pc .im{height:172px;border-radius:16px;background-color:var(--tile);position:relative}
.pc .im .h{position:absolute;top:9px;left:9px;width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.92);display:grid;place-items:center;color:#1F1A1D}
.pc .im .h .ms{font-size:17px}
.pc .im .h.on .ms{color:#8B3D6C;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.pc .im .bd{position:absolute;top:10px;right:10px;font-size:10px;font-weight:600;padding:3px 7px;border-radius:7px;background:#1F1A1D;color:#fff}
.pc .im .bd.s{background:#8B3D6C;direction:ltr}
.pc .dy{display:flex;align-items:center;gap:3px;font-size:10.5px;color:var(--plumT);font-weight:500;margin-top:9px}
.pc .dy .ms{font-size:14px}
.pc .nm{font-size:13.5px;font-weight:500;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .ft{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.pc .pr{font-size:15px;font-weight:700}
.pc .pr small{font-size:10.5px;font-weight:400;color:var(--ink2)}
.pc .pr s{font-size:11px;font-weight:400;color:var(--ink3);margin-right:4px}
.pc .ad{width:32px;height:32px;border-radius:10px;background:var(--plum);color:#fff;display:grid;place-items:center}
.pc .ad .ms{font-size:19px}
.season{margin:0 16px;border-radius:22px;overflow:hidden;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.season .band{display:flex;height:120px}
.season .band div{flex:1}
.season .band .im{flex:0 0 150px;background-color:var(--tile)}
.season .sb{padding:14px 16px 16px}
.season .sb small{font-size:11px;color:var(--ink3);letter-spacing:.02em}
.season .sb b{display:block;font-size:18px;font-weight:700;margin-top:2px}
.season .sb p{font-size:12px;color:var(--ink2);margin-top:4px;line-height:1.6}
.season .hex{display:flex;gap:6px;margin-top:10px}
.season .hex span{font-size:10.5px;color:var(--ink2);background:var(--soft);border-radius:7px;padding:3px 7px;direction:ltr}
.kit{gap:10px}
.kt{width:230px;border-radius:18px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:8px;display:flex;gap:10px;align-items:center}
.kt .im{width:78px;height:78px;border-radius:12px;background-color:var(--tile);flex:0 0 auto}
.kt b{display:block;font-size:13px;font-weight:600}
.kt small{display:block;font-size:11px;color:var(--ink3);margin-top:2px}
.kt span{display:block;font-size:14px;font-weight:700;margin-top:6px}
.kt span small{display:inline;font-size:10.5px;font-weight:400;color:var(--ink2)}
.lv{display:inline-block!important;font-size:10px!important;color:var(--plumT)!important;background:var(--plumS);padding:2px 6px;border-radius:6px;margin-top:4px!important}
.mk{margin:0 16px;height:260px;border-radius:22px;position:relative;overflow:hidden;background-color:var(--tile)}
.mk .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(24,14,20,.85) 0%,rgba(24,14,20,.35) 55%,rgba(24,14,20,0) 80%)}
.mk .t{position:absolute;right:18px;left:18px;bottom:16px;color:#fff}
.mk .t small{font-size:11px;color:#F2C9DF;font-weight:500}
.mk .t q{display:block;quotes:none;font-size:16px;font-weight:500;line-height:1.6;margin-top:6px}
.mk .t .w{display:flex;align-items:center;justify-content:space-between;margin-top:10px;font-size:12px}
.mk .t .w b{font-weight:600}
.mk .t .w span{height:32px;padding:0 12px;border-radius:10px;background:rgba(255,255,255,.16);display:flex;align-items:center;gap:4px;font-size:11.5px}
.mk .t .w span .ms{font-size:16px}
.cl{margin:0 16px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:0 14px}
.cr{display:flex;align-items:center;gap:12px;padding:12px 0}
.cr+.cr{border-top:1px solid var(--line)}
.cr .dt{width:52px;height:56px;border-radius:13px;background:var(--plumS);color:var(--plumT);text-align:center;flex:0 0 auto;display:flex;flex-direction:column;justify-content:center}
.cr .dt b{font-size:20px;font-weight:700;line-height:1}
.cr .dt small{font-size:10px;margin-top:3px}
.cr .ct{flex:1;min-width:0}
.cr .ct b{display:block;font-size:13.5px;font-weight:600}
.cr .ct small{display:block;font-size:11px;color:var(--ink3);margin-top:3px}
.cr .seat{font-size:11px;color:var(--ink2);text-align:left}
.cr .seat b{display:block;font-size:13px;color:var(--ink)}
.rvh{gap:10px}
.rc{width:240px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:8px}
.rc .im{height:130px;border-radius:14px;background-color:var(--tile)}
.rc .b{padding:10px 6px 6px}
.stars{display:flex;color:var(--star)}
.stars .ms{font-size:14px}
.rc p{font-size:12.5px;line-height:1.65;margin-top:6px}
.rc .w{font-size:11px;color:var(--ink3);margin-top:8px}
.rc .w b{color:var(--ink);font-weight:600}
.perks{margin:28px 16px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.perks div{border-radius:16px;background:var(--soft);padding:12px 6px;text-align:center;font-size:11px;color:var(--ink2);line-height:1.45}
.perks .ms{display:block;margin:0 auto 5px;font-size:22px;color:var(--plumT)}
.tabbar{position:absolute;left:16px;right:16px;bottom:26px;height:66px;border-radius:22px;background:var(--tab);backdrop-filter:blur(20px) saturate(1.5);box-shadow:0 0 0 1px var(--line),0 12px 32px rgba(40,20,30,.12);display:grid;grid-template-columns:repeat(5,1fr);align-items:center}
html.dark .tabbar{box-shadow:0 0 0 1px rgba(255,255,255,.07),0 12px 32px rgba(0,0,0,.5)}
.tab{display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--ink3);position:relative;font-size:10.5px}
.tab .ms{font-size:23px}
.tab .ic{width:44px;height:30px;border-radius:10px;display:grid;place-items:center}
.tab.on{color:var(--ink);font-weight:600}
.tab.on .ic{background:var(--plum);color:#fff}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tab .bd{position:absolute;top:-3px;left:50%;margin-left:-18px;min-width:17px;height:17px;border-radius:6px;background:var(--plumT);color:var(--bg);font-size:10px;font-weight:600;display:grid;place-items:center;padding:0 4px}

/* menu */
.mtop{display:flex;align-items:center;justify-content:space-between;padding:4px 16px 0;height:58px}
.mpromo{margin:14px 16px 0;border-radius:16px;background:var(--plumS);padding:12px 14px;display:flex;align-items:center;gap:10px;font-size:12.5px}
.mpromo .ms{font-size:22px;color:var(--plumT)}
.mpromo b{font-weight:600}
.mpromo span{margin-right:auto;font-size:12px;color:var(--plumT);font-weight:600}
.mcat{margin-top:22px}
.mh{display:flex;align-items:center;gap:10px;padding:0 16px;margin-bottom:10px}
.mh .no{font-size:12px;font-weight:600;color:var(--plumT);background:var(--plumS);border-radius:7px;padding:3px 6px;direction:ltr}
.mh b{font-size:16.5px;font-weight:600;flex:1}
.mh b small{font-size:11.5px;color:var(--ink3);font-weight:400;margin-right:4px}
.mh a{font-size:12px;color:var(--ink2);display:flex;align-items:center}
.mh a .ms{font-size:17px}
.mrow{gap:8px}
.lc{width:148px;height:94px;border-radius:15px;position:relative;overflow:hidden;background-color:var(--tile)}
.lc .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(24,14,20,.72),rgba(24,14,20,.05) 62%)}
.lc b{position:absolute;right:10px;bottom:9px;left:10px;color:#fff;font-size:12.5px;font-weight:600}
.lc b small{display:block;font-size:10px;font-weight:400;opacity:.85}
.lc.all{width:94px;background:var(--plum);display:flex;flex-direction:column;justify-content:space-between;padding:10px;color:#fff}
.lc.all .ms{font-size:24px}
.lc.all b{position:static;font-size:12px}
.qa{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:28px 16px 0}
.qa div{border-radius:16px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:12px 4px;text-align:center;font-size:11.5px;color:var(--ink2)}
.qa .ms{display:block;margin:0 auto 6px;font-size:23px;color:var(--ink)}
.mset{margin:10px 16px 0;border-radius:18px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:0 14px}
.mset div.r{display:flex;align-items:center;gap:10px;height:54px;font-size:13.5px}
.mset div.r+div.r{border-top:1px solid var(--line)}
.mset .ms{font-size:21px;color:var(--ink2)}
.mset .r>span:nth-child(2){flex:1}
.seg{display:flex;background:var(--soft);border-radius:10px;padding:3px}
.seg i{font-size:11.5px;padding:4px 10px;border-radius:8px;color:var(--ink2)}
.seg i.on{background:var(--ink);color:var(--bg);font-weight:500}
.mset small{font-size:11.5px;color:var(--ink3)}

/* listing */
.lh{height:56px;display:flex;align-items:center;gap:10px;padding:0 16px}
.lh .tt{flex:1}
.lh .tt b{display:block;font-size:19px;font-weight:700}
.lh .tt small{display:block;font-size:11.5px;color:var(--ink3);margin-top:2px}
.ban{margin:6px 16px 0;height:96px;border-radius:18px;overflow:hidden;position:relative;background-color:var(--tile)}
.ban .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(110,47,85,.92) 0%,rgba(110,47,85,.6) 50%,rgba(110,47,85,0) 85%)}
.ban .t{position:absolute;right:16px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;color:#fff}
.ban .t b{font-size:16px;font-weight:700}
.ban .t small{font-size:11.5px;color:#F2D7E6;margin-top:3px}
.fbar{display:flex;gap:8px;margin:14px 16px 0}
.fb{height:40px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;padding:0 12px;font-size:12.5px;white-space:nowrap}
.fb .ms{font-size:19px}
.fb .c{width:18px;height:18px;border-radius:6px;background:var(--plum);color:#fff;font-size:10.5px;display:grid;place-items:center}
.fb.g{flex:1;justify-content:space-between;color:var(--ink2)}
.fb.g b{color:var(--ink);font-weight:500}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:12px 16px 0;align-items:center}
.tg{height:30px;border-radius:9px;background:var(--plumS);color:var(--plumT);font-size:12px;font-weight:500;display:flex;align-items:center;gap:3px;padding:0 7px 0 11px}
.tg .ms{font-size:15px}
.tags a{font-size:12px;color:var(--ink3);margin-right:4px;text-decoration:underline;text-underline-offset:3px}
.cnt{display:flex;justify-content:space-between;margin:16px 16px 12px;font-size:12px;color:var(--ink3)}
.cnt b{color:var(--ink)}
.grid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:18px 12px}
.grid .pc{width:auto}
.grid .pc .im{height:186px}
.promo{grid-column:1/-1;border-radius:20px;background:var(--ink);color:var(--bg);padding:16px;display:flex;align-items:center;gap:14px}
.promo .ic2{width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,.1);display:grid;place-items:center;flex:0 0 auto}
html.dark .promo .ic2{background:rgba(0,0,0,.08)}
.promo .ic2 .ms{font-size:28px;color:var(--plumT)}
html.dark .promo .ic2 .ms{color:#6E2F55}
.promo .t{flex:1}
.promo small{font-size:11px;opacity:.7}
.promo b{display:block;font-size:15px;font-weight:600;line-height:1.45;margin-top:2px}
.promo .g{height:36px;padding:0 12px;border-radius:11px;background:var(--plum);color:#fff;font-size:12px;font-weight:500;display:flex;align-items:center;white-space:nowrap}
.more{text-align:center;margin:28px 16px 0}
.more p{font-size:12px;color:var(--ink3)}
.more .pg{width:140px;height:4px;border-radius:2px;background:var(--soft2);margin:8px auto 0}
.more .pg i{display:block;width:22%;height:100%;border-radius:2px;background:var(--plumT)}
.more .mb{margin:14px auto 0;width:200px;height:46px;border-radius:14px;background:var(--soft);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;font-weight:500}

/* product */
.gal{position:relative;height:420px;background-color:var(--tile)}
.gal .gn{position:absolute;top:54px;left:16px;right:16px;display:flex;justify-content:space-between}
.gal .gn div{display:flex;gap:8px}
.gw{width:42px;height:42px;border-radius:13px;background:rgba(255,255,255,.92);display:grid;place-items:center;color:#1F1A1D}
.gw .ms{font-size:21px}
.gal .thv{position:absolute;left:12px;bottom:38px;display:flex;flex-direction:column;gap:6px}
.gal .thv div{width:52px;height:52px;border-radius:12px;background-color:var(--tile);box-shadow:0 0 0 2px rgba(255,255,255,.9)}
.gal .thv div.on{box-shadow:0 0 0 2.5px #8B3D6C}
.gal .ct2{position:absolute;right:16px;bottom:40px;display:flex;gap:4px}
.gal .ct2 i{width:6px;height:6px;border-radius:2px;background:rgba(31,26,29,.3)}
.gal .ct2 i.on{width:20px;background:#1F1A1D}
.sheet{margin-top:-22px;position:relative;background:var(--bg);border-radius:24px 24px 0 0;padding:20px 16px 0}
.sheet .tp{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--ink3)}
.sheet .tp b{color:var(--plumT);font-weight:500;display:flex;align-items:center;gap:4px}
.sheet .tp b .ms{font-size:15px}
.sheet h1{font-size:23px;font-weight:700;margin-top:8px;letter-spacing:-.01em}
.sheet .sb{font-size:12.5px;color:var(--ink2);margin-top:4px}
.pp{display:flex;align-items:center;gap:10px;margin-top:12px}
.pp b{font-size:25px;font-weight:700}
.pp b small{font-size:12px;font-weight:400;color:var(--ink2)}
.pp s{font-size:13px;color:var(--ink3)}
.pp .off{font-size:11px;font-weight:600;color:#fff;background:var(--plum);border-radius:7px;padding:3px 7px;direction:ltr}
.pp .rt{margin-right:auto;font-size:13px;font-weight:600;display:flex;align-items:center;gap:3px}
.pp .rt .ms{font-size:17px;color:var(--star)}
.pp .rt small{color:var(--ink3);font-weight:400;font-size:11.5px}
.mtm{margin-top:14px;display:flex;gap:8px}
.mtm>div{flex:1;border-radius:14px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:10px 12px;display:flex;align-items:center;gap:8px}
.mtm .ms{font-size:22px;color:var(--plumT)}
.mtm b{display:block;font-size:12.5px;font-weight:600}
.mtm small{display:block;font-size:10.5px;color:var(--ink3);margin-top:1px}
.op{margin-top:20px}
.op .oh{display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px;color:var(--ink2)}
.op .oh b{color:var(--ink);font-weight:600}
.op .oh a{color:var(--plumT);font-weight:500;font-size:12px}
.cols{display:flex;gap:10px}
.cols i{width:46px;height:46px;border-radius:13px;display:block;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.cols i.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.6px var(--ink)}
.cols span{display:block;font-size:10.5px;color:var(--ink3);text-align:center;margin-top:5px}
.szs{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
.szs div{height:44px;border-radius:12px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;font-size:13px;font-weight:500;direction:ltr}
.szs div.on{background:var(--ink);color:var(--bg);box-shadow:none}
.szs div.x{color:var(--ink3);text-decoration:line-through;opacity:.6}
.mym{margin-top:8px;height:46px;border-radius:12px;border:1.4px dashed var(--plumT);color:var(--plumT);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500}
.mym .ms{font-size:19px}
.fitb{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:11.5px;color:var(--ink2)}
.fitb .ms{font-size:16px;color:var(--plumT)}
.cb{margin:14px 16px 0;border-radius:22px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:16px}
.cb h4{font-size:16px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.cb h4 small{font-size:11px;font-weight:400;color:var(--ink3)}
.made{display:flex;flex-direction:column;gap:0;margin-top:12px}
.mst{display:flex;gap:12px;position:relative;padding-bottom:14px}
.mst:not(:last-child):before{content:'';position:absolute;right:13px;top:28px;bottom:0;width:2px;background:var(--soft2)}
.mst.done:not(:last-child):before{background:var(--plumT)}
.mst i{width:28px;height:28px;border-radius:9px;background:var(--soft);color:var(--ink3);display:grid;place-items:center;flex:0 0 auto}
.mst.done i{background:var(--plum);color:#fff}
.mst i .ms{font-size:16px}
.mst b{display:block;font-size:13px;font-weight:600}
.mst small{display:block;font-size:11px;color:var(--ink3);margin-top:1px}
.mst .d{margin-right:auto;font-size:11px;color:var(--ink2);white-space:nowrap}
.comp{display:flex;height:12px;border-radius:6px;overflow:hidden;margin-top:12px}
.compl{display:flex;justify-content:space-between;margin-top:8px;font-size:11.5px;color:var(--ink2)}
.compl b{color:var(--ink)}
.compl i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-left:5px}
.ymeta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.ymeta div{background:var(--soft);border-radius:12px;padding:9px;text-align:center}
.ymeta small{display:block;font-size:10.5px;color:var(--ink3)}
.ymeta b{display:block;font-size:13px;font-weight:600;margin-top:2px}
.mkr{margin:14px 16px 0;border-radius:22px;background:var(--plumS);padding:14px;display:flex;gap:12px}
.mkr .im{width:96px;height:118px;border-radius:14px;background-color:var(--tile);flex:0 0 auto}
.mkr small{font-size:11px;color:var(--plumT);font-weight:600}
.mkr b{display:block;font-size:15px;font-weight:700;margin-top:3px}
.mkr p{font-size:12px;color:var(--ink2);line-height:1.65;margin-top:4px}
.mkr .lk{font-size:12px;font-weight:600;color:var(--plumT);margin-top:6px;display:flex;align-items:center;gap:2px}
.mkr .lk .ms{font-size:16px}
.carei{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.carei div{display:flex;align-items:center;gap:8px;background:var(--soft);border-radius:12px;padding:9px 10px;font-size:11.5px;color:var(--ink2)}
.carei .ms{font-size:20px;color:var(--ink)}
.dlv{margin:14px 16px 0;border-radius:22px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:2px 14px}
.dlv>div{display:flex;align-items:center;gap:12px;padding:12px 0}
.dlv>div+div{border-top:1px solid var(--line)}
.dlv .ms{font-size:22px;color:var(--plumT)}
.dlv b{display:block;font-size:13px;font-weight:600}
.dlv small{display:block;font-size:11.5px;color:var(--ink2);margin-top:1px}
.accs{margin:14px 16px 0}
.ac{display:flex;justify-content:space-between;align-items:center;height:54px;border-bottom:1px solid var(--line);font-size:14px;font-weight:500}
.ac .ms{font-size:21px;color:var(--ink3)}
.acp{font-size:12.5px;color:var(--ink2);line-height:1.8;padding:10px 0 14px;border-bottom:1px solid var(--line)}
.rs{display:flex;gap:16px;align-items:center;margin-top:12px}
.rs .bg b{font-size:40px;font-weight:700;line-height:1}
.rs .bg small{display:block;font-size:11px;color:var(--ink3);margin-top:4px}
.fit{flex:1}
.fit small{display:block;font-size:11.5px;color:var(--ink2);margin-bottom:7px}
.fit .sc2{height:8px;border-radius:4px;background:var(--soft);position:relative}
.fit .sc2 i{position:absolute;top:-4px;width:16px;height:16px;border-radius:8px;background:var(--plum);box-shadow:0 0 0 3px var(--surface);right:48%}
.fit .fl{display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink3);margin-top:7px}
.rphs{display:flex;gap:8px;margin-top:14px}
.rphs div{flex:1;height:84px;border-radius:12px;background-color:var(--tile);position:relative}
.rphs div.m:after{content:'+64';direction:ltr;position:absolute;inset:0;border-radius:12px;background:rgba(31,26,29,.55);color:#fff;display:grid;place-items:center;font-weight:600}
.rvq{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.rvq .w{display:flex;align-items:center;gap:8px;font-size:12px}
.rvq .w i{width:30px;height:30px;border-radius:9px;background:var(--plumS);color:var(--plumT);display:grid;place-items:center;font-weight:600}
.rvq .w small{display:block;font-size:10.5px;color:var(--ink3)}
.rvq .w .stars{margin-right:auto}
.rvq p{font-size:12.5px;line-height:1.75;margin-top:8px}
.rvq .ft{font-size:11px;color:var(--ink3);margin-top:6px}
.sticky{position:absolute;left:0;right:0;bottom:0;background:var(--tab);backdrop-filter:blur(20px);border-top:1px solid var(--line);padding:12px 16px 32px;display:flex;align-items:center;gap:12px}
.sticky .p small{display:block;font-size:11px;color:var(--ink3)}
.sticky .p b{font-size:19px;font-weight:700}
.sticky .p b small{display:inline;font-size:11px;font-weight:400;color:var(--ink2)}
.sticky .b{flex:1;height:52px;border-radius:15px;background:var(--plum);color:#fff;display:flex;align-items:center;justify-content:center;gap:7px;font-size:14.5px;font-weight:500}
.sticky .b .ms{font-size:20px}
"""

LOGO = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M2 4.5c2-2 4-2 5 0s3 2 5 0M2 9.5c2-2 4-2 5 0s3 2 5 0"/></svg>'


def pc(img, f, nm, pr, old=None, bd=None, fav=False, days=None):
    b = (f'<span class="bd{" s" if bd.startswith("-") else ""}">{bd}</span>' if bd else '')
    inner = b + f'<span class="h{" on" if fav else ""}">{ic("favorite")}</span>'
    dy = f'<div class="dy">{ic("schedule")}جاهزة خلال {days} أيام</div>' if days else '<div class="dy">' + ic("bolt") + 'جاهزة للشحن</div>'
    o = f'<s>{old}</s>' if old else ''
    return f'<div class="pc">{ph(C + img, f, "im", inner)}{dy}<div class="nm">{nm}</div><div class="ft"><div class="pr">{pr} <small>{CUR}</small>{o}</div><span class="ad">{ic("add")}</span></div></div>'


def tabbar(a=0):
    t = [("home", "الرئيسية"), ("grid_view", "المتجر"), ("shopping_bag", "السلة"), ("package_2", "طلباتي"), ("person", "حسابي")]
    s = ''.join(f'<div class="tab{" on" if i == a else ""}"><span class="ic">{ic(n)}</span>{l}{"<i class=bd>2</i>" if n == "shopping_bag" else ""}</div>' for i, (n, l) in enumerate(t))
    return f'<div class="tabbar">{s}</div><div class="homeind"></div>'


def wm(sub="HABKA STUDIO"):
    return f'<div class="wm"><b><i>{LOGO}</i>حَبكة</b><small>{sub}</small></div>'


def home():
    return f'''<div class="screen">{STATUS}
<div class="hdr">{wm()}<div class="hi"><div class="sq">{ic("notifications")}<i class="n"></i></div><div class="sq">{ic("menu")}</div></div></div>
<div class="hello">مساء الخير، <span>سلمى</span><small>3 قطع جديدة خرجت من المشغل اليوم</small></div>
<div class="sr"><div class="s">{ic("search")}بطانية، كارديغان، خيط…</div><div class="d">{ic("design_services")}صمّمي</div></div>
<div class="hscroll chips"><div class="chip on">{ic("apps")}الكل</div><div class="chip">{ic("checkroom")}ملابس</div><div class="chip">{ic("bed")}بطانيات</div><div class="chip">{ic("toys")}دُمى</div><div class="chip">{ic("shopping_bag")}حقائب</div><div class="chip">{ic("deployed_code")}خيوط</div></div>
<div class="hscroll hero">
<div class="hc"><div class="tx"><small>تشكيلة شتاء 2026</small><h2>بطانيات تُحاك<br>لتُورَّث</h2><p>صوف ميرينو بغرز مضفّرة كثيفة</p><span>اكتشفي{ic("arrow_back")}</span></div>{ph(C+"scarves-stack.jpg","0.45 0.5 1.2","im")}</div>
<div class="hc"><div class="tx"></div>{ph(C+"mittens-coffee.jpg","0.5 0.5 1.0","im")}</div></div>
<div class="ind"><i class="on"></i><i></i><i></i></div>

<div class="sec"><div class="sh"><div><h3>طلبكِ الخاص</h3></div><a>تتبّع{ic("chevron_left")}</a></div>
<div class="trk"><div class="ring">{ph(C+"cozy-sweater.jpg","0.5 0.55 2.0","")}</div><div class="t"><small>{ic("progress_activity")}قيد الحياكة الآن</small><b>كارديغان «دفء» · مقاساتك الخاصة</b><p>تحيكه منى في المشغل · متبقٍ 4 أيام</p><div class="pb"><i></i></div><div class="pl"><span>الحياكة 62%</span><span>التسليم المتوقع: 30 نوفمبر</span></div></div></div></div>

<div class="sec"><div class="cfg"><h4>صمّمي قطعتك بنفسك</h4><p>اختاري النوع واللون، ونحيكها لكِ يدوياً على طلبك.</p>
<div class="lbl"><span>نوع القطعة</span></div>
<div class="typ"><div class="on">{ic("bed")}بطانية</div><div>{ic("checkroom")}كارديغان</div><div>{ic("shopping_bag")}حقيبة</div><div>{ic("toys")}دمية</div></div>
<div class="lbl"><span>لون الخيط: <b>برقوقي</b></span><span>62 لوناً</span></div>
<div class="sws"><i class="on" style="background:#6E2F55"></i><i style="background:#E8DCCB"></i><i style="background:#8A929C"></i><i style="background:#A3A72E"></i><i style="background:#B4553C"></i><i style="background:#2F4A43"></i><i style="background:#D9A3A0"></i></div>
<div class="ft"><div><small>تقدير السعر · 120×150 سم</small><b>3,200 <small>{CUR}</small></b></div><span class="pbtn">ابدئي التصميم{ic("arrow_back")}</span></div></div></div>

<div class="sec"><div class="sh"><div><h3>وصل حديثاً</h3><div class="sub">من إبر حرفياتنا هذا الأسبوع</div></div><a>الكل{ic("chevron_left")}</a></div>
<div class="hscroll prow">
{pc("green-sweater.jpg","0.5 0.42 1.7","كنزة «غابة» النوردية","1,980",bd="جديد",days=8)}
{pc("beanie-girl.jpg","0.5 0.25 1.5","قبعة «بُن» بالبومبوم","650",fav=True)}
{pc("bunny-knit.jpg","0.78 0.5 1.4","الأرنب «جزرة»","890",days=4)}
</div></div>

<div class="sec"><div class="season"><div class="band"><div style="background:#6E2F55"></div><div style="background:#8C4A71"></div><div style="background:#B47C9C"></div><div style="background:#DDBACB"></div>{ph(C+"yarn-balls.jpg","0.6 0.5 1.1","im")}</div>
<div class="sb"><small>لون الموسم</small><b>البرقوقي الدافئ</b><p>درجات العنب الناضج على صوف الميرينو والموهير. متوفّر في 28 تصميماً وكخيوط للحياكة.</p><div class="hex"><span>#6E2F55</span><span>#8C4A71</span><span>#B47C9C</span><span>#DDBACB</span></div></div></div></div>

<div class="sec"><div class="sh"><div><h3>عُدّة الحياكة</h3><div class="sub">كل ما تحتاجينه لتبدئي</div></div><a>متجر الخيوط{ic("chevron_left")}</a></div>
<div class="hscroll kit">
<div class="kt">{ph(C+"blue-yarn.jpg","0.55 0.45 1.4","im")}<div><b>عُدّة وشاح للمبتدئات</b><small>خيوط + إبر + نموذج</small><small class="lv">مستوى مبتدئ</small><span>420 <small>{CUR}</small></span></div></div>
<div class="kt">{ph(C+"yarn-ball-white.jpg","0.5 0.55 1.3","im")}<div><b>خيط قطن مصري</b><small>كبّة 100 غ · 24 لوناً</small><small class="lv">الأكثر مبيعاً</small><span>85 <small>{CUR}</small></span></div></div>
</div></div>

<div class="sec">{ph(C+"knit-coffee.jpg","0.6 0.55 1.05","mk",f'<div class="sc"></div><div class="t"><small>حكاية المشغل</small><q>نحن 14 امرأة من الفيوم والمنيا، نحيك في بيوتنا وبمواعيدنا. كل قطعة تحمل اسم صانعتها.</q><div class="w"><b>منى · مؤسِّسة حَبكة</b><span>{ic("play_circle")}شاهدي القصة</span></div></div>')}</div>

<div class="sec"><div class="sh"><div><h3>ورش هذا الشهر</h3></div><a>التقويم{ic("chevron_left")}</a></div>
<div class="cl">
<div class="cr"><div class="dt"><b>06</b><small>ديسمبر</small></div><div class="ct"><b>أول غرزة: كروشيه للمبتدئات</b><small>حضوري · المعادي · 3 ساعات</small></div><div class="seat"><b>650 {CUR}</b>4 مقاعد</div></div>
<div class="cr"><div class="dt"><b>13</b><small>ديسمبر</small></div><div class="ct"><b>دمى الأميغورومي</b><small>أونلاين · مستوى متوسط</small></div><div class="seat"><b>480 {CUR}</b>12 مقعداً</div></div>
<div class="cr"><div class="dt"><b>20</b><small>ديسمبر</small></div><div class="ct"><b>بطانية الغرز المضفّرة</b><small>حضوري · الزمالك · يومان</small></div><div class="seat"><b>1,200 {CUR}</b>مقعدان</div></div>
</div></div>

<div class="sec"><div class="sh"><div><h3>صور عميلاتنا</h3><div class="sub">4.9 من 3,100 تقييم</div></div><a>الكل{ic("chevron_left")}</a></div>
<div class="hscroll rvh">
<div class="rc">{ph(C+"slippers.jpg","0.6 0.5 1.2","im")}<div class="b">{stars()}<p>الخف دافئ جداً وألوانه مطابقة تماماً لما طلبته.</p><div class="w"><b>نهى س.</b> · الجيزة</div></div></div>
<div class="rc">{ph(C+"red-scarf.jpg","0.5 0.45 1.3","im")}<div class="b">{stars()}<p>الوشاح ناعم ولا يسبب حكة، والتغليف كان هدية بحد ذاته.</p><div class="w"><b>ريم ع.</b> · المنصورة</div></div></div>
</div></div>

<div class="perks"><div>{ic("back_hand")}صناعة يدوية<br>100%</div><div>{ic("local_shipping")}شحن لكل<br>المحافظات</div><div>{ic("payments")}دفع عند<br>الاستلام</div></div>
{tabbar(0)}
</div>'''


MENU = [
    ("checkroom", "الملابس", "240", [("cozy-sweater.jpg", "0.5 0.55 1.3", "كارديغان", "48"), ("green-sweater.jpg", "0.5 0.4 1.4", "كنزات", "62"), ("red-scarf.jpg", "0.5 0.4 1.3", "أوشحة", "37"), ("pom-beanie.jpg", "0.48 0.45 1.4", "قبعات", "29"), ("socks.jpg", "0.45 0.5 1.2", "جوارب وخف", "33")]),
    ("bed", "البطانيات والبيت", "140", [("scarves-stack.jpg", "0.45 0.5 1.2", "بطانيات", "34"), ("basket-room.jpg", "0.25 0.83 3.0", "سلال", "24"), ("knit-textures.jpg", "0.5 0.5 1.2", "وسائد ومفارش", "40")]),
    ("toys", "دُمى الأميغورومي", "130", [("teddy-sweater.jpg", "0.54 0.55 1.4", "دببة", "41"), ("bunny-knit.jpg", "0.78 0.45 1.2", "حيوانات", "52"), ("gnomes.jpg", "0.5 0.45 1.0", "شخصيات موسمية", "37")]),
    ("shopping_bag", "الحقائب والإكسسوارات", "88", [("straw-close.jpg", "0.5 0.35 1.2", "حقائب كتف", "26"), ("straw-hat.jpg", "0.5 0.55 1.2", "قبعات صيفية", "21"), ("mittens-snow.jpg", "0.45 0.6 1.2", "قفازات", "18")]),
    ("deployed_code", "الخيوط والأدوات", "310", [("yarn-balls.jpg", "0.6 0.5 1.1", "صوف وموهير", "120"), ("yarn-ball-white.jpg", "0.5 0.55 1.2", "قطن", "94"), ("blue-yarn.jpg", "0.55 0.45 1.2", "إبر وسنانير", "48"), ("spools.jpg", "0.5 0.5 1.4", "خيوط تطريز", "48")]),
    ("school", "الورش والعُدد", "26", [("knit-flatlay.jpg", "0.3 0.55 1.2", "ورش حضورية", "8"), ("hoop-yarn.jpg", "0.5 0.35 1.2", "عُدد جاهزة", "12"), ("knit-coffee.jpg", "0.7 0.5 1.3", "أونلاين", "6")]),
]


def menu():
    rows = ''
    for k, (icn, name, cnt, subs) in enumerate(MENU, 1):
        cards = f'<div class="lc all">{ic(icn)}<b>كل {name}</b></div>'
        for img, f, n, c in subs:
            cards += ph(C + img, f, "lc", f'<div class="sc"></div><b>{n}<small>{c} قطعة</small></b>')
        rows += f'<div class="mcat"><div class="mh"><span class="no">0{k}</span><b>{name}<small>· {cnt}</small></b><a>عرض الكل{ic("chevron_left")}</a></div><div class="hscroll mrow">{cards}</div></div>'
    return f'''<div class="screen" style="padding-bottom:42px">{STATUS}
<div class="mtop">{wm("ALL CATEGORIES")}<div class="sq">{ic("close")}</div></div>
<div class="sr"><div class="s">{ic("search")}ابحثي في المتجر…</div><div class="d">{ic("photo_camera")}</div></div>
<div class="mpromo">{ic("design_services")}<div><b>صمّمي قطعتك</b> · نحيكها خلال 7–14 يوماً</div><span>ابدئي</span></div>
{rows}
<div class="qa"><div>{ic("person")}حسابي</div><div>{ic("package_2")}طلباتي</div><div>{ic("favorite")}المفضلة</div><div>{ic("support_agent")}تواصلي</div></div>
<div class="mset"><div class="r">{ic("language")}<span>اللغة</span><div class="seg"><i class="on">العربية</i><i>English</i></div></div>
<div class="r">{ic("chat")}<span>واتساب المشغل</span><small>يرد خلال 10 دقائق</small></div></div>
<div class="homeind"></div></div>'''


def listing():
    P = [
        ("teddy-sweater.jpg", "0.54 0.55 1.6", "الدبدوب «بُندق»", "1,150", None, "الأكثر طلباً", True, 5),
        ("scarves-stack.jpg", "0.45 0.5 1.4", "طقم رميات «زيتون»", "2,900", None, None, False, 10),
        ("mittens-coffee.jpg", "0.5 0.62 1.3", "قفازات «حضن»", "520", None, None, False, None),
        ("gnomes.jpg", "0.5 0.42 1.15", "ثلاثي الأقزام «حكاية»", "1,350", "1,600", "-16%", False, 6),
        ("pom-beanie.jpg", "0.48 0.5 1.6", "قبعة «ثلج» بالبومبوم", "650", None, None, False, None),
        ("bunny-knit.jpg", "0.78 0.5 1.4", "الأرنب «جزرة»", "890", None, "جديد", False, 4),
        ("red-scarf.jpg", "0.5 0.42 1.6", "وشاح «قِرفة» المضلّع", "950", None, None, True, None),
        ("snowman-plush.jpg", "0.5 0.5 1.3", "رجل الثلج «لؤلؤ»", "780", None, None, False, 4),
    ]
    cards = [pc(*p) for p in P]
    promo = f'<div class="promo"><div class="ic2">{ic("featured_seasonal_and_gifts")}</div><div class="t"><small>تغليف يدوي مجاني</small><b>أضيفي بطاقة بخط اليد واسم المُهدى إليه</b></div><span class="g">أضيفي</span></div>'
    grid = ''.join(cards[:4]) + promo + ''.join(cards[4:])
    return f'''<div class="screen">{STATUS}
<div class="lh"><div class="sq">{ic("arrow_forward")}</div><div class="tt"><b>هدايا الشتاء</b><small>164 قطعة مصنوعة يدوياً</small></div><div class="sq">{ic("search")}</div><div class="sq">{ic("shopping_bag")}<i class="n"></i></div></div>
{ph(C+"gnomes.jpg","0.5 0.35 1.0","ban",f'<div class="sc"></div><div class="t"><b>اطلبي قبل 15 ديسمبر</b><small>لتصل هداياكِ قبل رأس السنة</small></div>')}
<div class="hscroll chips"><div class="chip">الكل</div><div class="chip on">للأطفال <small>· 58</small></div><div class="chip">لها</div><div class="chip">للبيت</div><div class="chip">أقل من 1,000 {CUR}</div></div>
<div class="fbar"><div class="fb">{ic("tune")}تصفية<span class="c">2</span></div><div class="fb g"><span>ترتيب: <b>الأكثر طلباً</b></span>{ic("expand_more")}</div><div class="fb">{ic("bolt")}جاهزة للشحن</div></div>
<div class="tags"><span class="tg">أميغورومي{ic("close")}</span><span class="tg">قطن مصري{ic("close")}</span><a>مسح الكل</a></div>
<div class="cnt"><span><b>58</b> قطعة</span><span>شحن مجاني فوق 1,500 {CUR}</span></div>
<div class="grid">{grid}</div>
<div class="more"><p>عرضنا 8 من 58</p><div class="pg"><i></i></div><div class="mb">عرض المزيد{ic("expand_more")}</div></div>
{tabbar(1)}
</div>'''


def product():
    S = C + "cozy-sweater.jpg"
    return f'''<div class="screen" style="padding-bottom:112px">
<div style="position:absolute;top:0;left:0;right:0;z-index:2;--ink:#1F1A1D">{STATUS}</div>
{ph(S,"0.5 0.5 1.18","gal",f'<div class="gn"><span class="gw">{ic("arrow_forward")}</span><div><span class="gw">{ic("ios_share")}</span><span class="gw">{ic("favorite")}</span></div></div><div class="thv">{ph(S,"0.5 0.5 1.6","on")}{ph(S,"0.62 0.6 3.0")}{ph(C+"sweater-wood.jpg","0.5 0.5 1.5")}{ph(C+"knit-textures.jpg","0.3 0.5 1.6")}</div><div class="ct2"><i class="on"></i><i></i><i></i><i></i></div>')}
<div class="sheet">
<div class="tp"><b>{ic("verified","fill")}صُنع يدوياً بواسطة منى</b><span>HB-1182</span></div>
<h1>كارديغان «دفء» المحاك يدوياً</h1>
<div class="sb">صوف ميرينو ناعم بغرزة الأرز · قَصّة واسعة مريحة</div>
<div class="pp"><b>2,450 <small>{CUR}</small></b><s>2,800</s><span class="off">-12%</span><span class="rt">{ic("star","fill")}4.8<small>(128)</small></span></div>
<div class="mtm"><div>{ic("hourglass_top")}<div><b>يُحاك في 9 أيام</b><small>يبدأ العمل غداً</small></div></div><div>{ic("straighten")}<div><b>متاح بمقاساتك</b><small>بدون تكلفة إضافية</small></div></div></div>
<div class="op"><div class="oh"><span><b>اللون:</b> رمادي ضبابي</span><a>عيّنة خيط مجانية</a></div>
<div class="cols"><div><i class="on" style="background:#C8C9CB"></i><span>ضبابي</span></div><div><i style="background:#EDE4D6"></i><span>حليبي</span></div><div><i style="background:#3B3A3A"></i><span>فحمي</span></div><div><i style="background:#6E2F55"></i><span>برقوقي</span></div><div><i style="background:#A3A72E"></i><span>زيتي</span></div></div></div>
<div class="op"><div class="oh"><span><b>المقاس</b></span><a>جدول المقاسات</a></div>
<div class="szs"><div>XS</div><div>S</div><div class="on">M</div><div>L</div><div class="x">XL</div></div>
<div class="mym">{ic("design_services")}أريد مقاساتي الخاصة</div>
<div class="fitb">{ic("info")}يُنصح باختيار مقاسك المعتاد · قَصّة واسعة</div></div>
</div>

<div class="cb" style="margin-top:20px"><h4>رحلة قطعتك<small>من الطلب إلى بابك</small></h4><div class="made">
<div class="mst done"><i>{ic("check")}</i><div><b>تأكيد الطلب والمقاس</b><small>نراجع المقاسات معكِ عبر واتساب</small></div><span class="d">يوم 1</span></div>
<div class="mst"><i>{ic("gesture")}</i><div><b>الحياكة اليدوية</b><small>نحو 18,000 غرزة على يد حرفية واحدة</small></div><span class="d">يوم 2–8</span></div>
<div class="mst"><i>{ic("checkroom")}</i><div><b>الغسل والتشكيل والتشطيب</b><small>فحص جودة وتغليف يدوي</small></div><span class="d">يوم 9</span></div>
<div class="mst"><i>{ic("local_shipping")}</i><div><b>الشحن</b><small>يصل خلال 1–3 أيام عمل</small></div><span class="d">يوم 10–12</span></div></div></div>

<div class="cb"><h4>الخيط<small>شفافية المكوّنات</small></h4>
<div class="comp"><div style="flex:80;background:#6E2F55"></div><div style="flex:20;background:#C9A3B8"></div></div>
<div class="compl"><span><i style="background:#6E2F55"></i><b>80%</b> صوف ميرينو</span><span><i style="background:#C9A3B8"></i><b>20%</b> ألبكا</span></div>
<div class="ymeta"><div><small>الوزن</small><b>620 غ</b></div><div><small>الإبرة</small><b class="ltr">5 mm</b></div><div><small>الملمس</small><b>ناعم جداً</b></div></div></div>

<div class="mkr">{ph(C+"knit-flatlay.jpg","0.22 0.6 1.6","im")}<div><small>الصانعة</small><b>منى عبد الله · الفيوم</b><p>تحيك منذ كانت في العاشرة، وتخصّصت في الكارديغان بغرز الأرز والضفائر.</p><span class="lk">قطع منى الأخرى{ic("chevron_left")}</span></div></div>

<div class="cb"><h4>العناية</h4><div class="carei"><div>{ic("local_laundry_service")}غسيل يدوي بارد</div><div>{ic("dry")}تجفيف مسطّح</div><div>{ic("block")}بدون مجفف</div><div>{ic("checkroom")}يُطوى ولا يُعلّق</div></div></div>

<div class="dlv"><div>{ic("local_shipping")}<div><b>شحن مجاني لكل المحافظات</b><small>للطلبات فوق 1,500 {CUR}</small></div></div>
<div>{ic("autorenew")}<div><b>تعديل مجاني خلال 14 يوماً</b><small>إن لم يناسبك المقاس نعيد ضبطه</small></div></div>
<div>{ic("payments")}<div><b>الدفع عند الاستلام أو بالتقسيط</b><small>حتى 6 أشهر بدون فوائد</small></div></div></div>

<div class="accs"><div class="ac">الوصف{ic("remove")}</div><div class="acp">كارديغان بأزرار خشبية وجيبين أماميين، يُحاك قطعة واحدة دون خياطات جانبية ليبقى ناعماً على الجسم.</div><div class="ac">المقاسات بالتفصيل{ic("add")}</div><div class="ac">الشحن والاستبدال{ic("add")}</div></div>

<div class="cb" style="margin-top:22px"><h4>التقييمات<small>128 تقييماً</small></h4>
<div class="rs"><div class="bg"><b>4.8</b>{stars()}<small>98% يوصين به</small></div><div class="fit"><small>كيف كان المقاس؟</small><div class="sc2"><i></i></div><div class="fl"><span>صغير</span><span>مناسب</span><span>كبير</span></div></div></div>
<div class="rphs">{ph(C+"cozy-sweater.jpg","0.3 0.4 1.6")}{ph(C+"sweater-shoulder.jpg","0.5 0.5 1.3")}{ph(C+"sweater-wood.jpg","0.5 0.5 1.4")}{ph(C+"green-sweater.jpg","0.5 0.4 1.5","m")}</div>
<div class="rvq"><div class="w"><i>ي</i><div><b>ياسمين ك.</b><small>طلبت بمقاساتها · الإسكندرية</small></div>{stars()}</div><p>أدفأ وأنعم قطعة اشتريتها. منى راجعت معي المقاسات خطوة بخطوة ووصل قبل الموعد.</p><div class="ft">المقاس: M · اللون: ضبابي</div></div></div>

<div class="sec"><div class="sh"><div><h3>يكتمل مع</h3></div></div>
<div class="hscroll prow">
{pc("red-scarf.jpg","0.5 0.42 1.6","وشاح «قِرفة» المضلّع","950")}
{pc("pom-beanie.jpg","0.48 0.5 1.6","قبعة «ثلج» بالبومبوم","650")}
{pc("mittens-snow.jpg","0.45 0.6 1.5","قفازات «غيمة»","520",days=3)}
</div></div>
<div class="sec"><div class="sh"><div><h3>قد يعجبك أيضاً</h3></div><a>الكل{ic("chevron_left")}</a></div>
<div class="grid">
{pc("green-sweater.jpg","0.5 0.42 1.7","كنزة «غابة» النوردية","1,980",days=8)}
{pc("sweater-wood.jpg","0.5 0.5 1.25","كنزة «حليب» الواسعة","1,750",days=7)}
</div></div>
<div class="sticky"><div class="p"><small>المقاس M · ضبابي</small><b>2,450 <small>{CUR}</small></b></div><div class="b">{ic("shopping_bag")}أضيفي إلى السلة</div><div class="homeind"></div></div>
</div>'''


SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
