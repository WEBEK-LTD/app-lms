from lib import STATUS, ic, ph, stars

FONT = "baloo"
TITLE = "Toota Kids"
CUR = "ج.م"

def L(t):  # isolate LTR runs (ranges, percentages)
    return f'<span class="ltr">{t}</span>'

CSS = """
:root{--bg:#F7F2EC;--surface:#FFFDF9;--tile:#EFE6DB;--tile2:#E7DCCE;--ink:#2D2420;--ink2:#6B5D55;--ink3:#8E7F75;--line:#EADFD3;
--acc:#B35C4B;--accT:#A4503F;--accSoft:#F6E3DC;--deep:#3A2B26;--dot:#DCCFC2;
--blush:#F5E2DA;--butter:#F4EACB;--sage:#E2E8D8;--sky:#DDE7ED;--sand:#EFE4D4;
--pk:#E9DFD4;--gold:#C08A3E;--tab:rgba(255,253,249,.86);--tabline:rgba(45,36,32,.08);--onph:#fff}
html.dark{--bg:#15110F;--surface:#1F1916;--tile:#2A221E;--tile2:#342A25;--ink:#F4ECE6;--ink2:#C7B9AF;--ink3:#A09086;--line:#30271F;
--acc:#B35C4B;--accT:#EFA08C;--accSoft:#3A231D;--deep:#2A1F1B;--dot:#42362F;
--blush:#33231F;--butter:#302A1C;--sage:#232A20;--sky:#1E272C;--sand:#2D251F;
--pk:#E9DFD4;--gold:#D9A85E;--tab:rgba(38,31,28,.88);--tabline:rgba(255,255,255,.07)}
body{font-family:'Baloo Bhaijaan 2',sans-serif;font-size:14px;line-height:1.45}
.screen{padding-bottom:120px}
b,strong{font-weight:600}

/* header */
.header{height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.brand{display:flex;align-items:center;gap:10px}
.bmark{width:44px;height:44px;border-radius:50%;background:var(--acc);display:grid;place-items:center}
.brand b{display:block;font-size:26px;font-weight:700;line-height:.9;letter-spacing:-.01em}
.brand small{display:block;font-size:9.5px;letter-spacing:.34em;color:var(--ink3);margin-top:5px;direction:ltr;text-align:right;font-weight:500}
.hicons{display:flex;gap:8px}
.ibtn{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;position:relative;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.ibtn .ms{font-size:22px}
.ibtn .n{position:absolute;top:-3px;left:-3px;min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10px;font-weight:600;display:grid;place-items:center;padding:0 5px;box-shadow:0 0 0 2px var(--bg);line-height:1}

.srow{display:flex;gap:8px;margin:8px 16px 0}
.search{flex:1;height:52px;border-radius:26px;background:var(--surface);display:flex;align-items:center;padding:0 16px;gap:10px;box-shadow:0 0 0 1px var(--line)}
.search .ms{font-size:22px;color:var(--ink2)}
.search .t{flex:1;font-size:13px;color:var(--ink3)}
.search .cam{color:var(--ink3);font-size:21px}
.filt{width:52px;height:52px;border-radius:50%;background:var(--acc);display:grid;place-items:center}
.filt .ms{color:#fff;font-size:22px}

/* avatars */
.avs{margin-top:18px;gap:14px}
.av{width:68px;text-align:center}
.av .c{width:68px;height:68px;border-radius:50%;padding:3px;background:var(--surface);box-shadow:0 0 0 1px var(--line)}
.av .c div{width:62px;height:62px;border-radius:50%;background-color:var(--tile)}
.av.on .c{box-shadow:0 0 0 2px var(--acc)}
.av span{display:block;font-size:12px;margin-top:6px;color:var(--ink2);font-weight:500}
.av.on span{color:var(--ink);font-weight:600}
.av .c.ic{display:grid;place-items:center;background:var(--accSoft);box-shadow:none}
.av .c.ic .ms{font-size:28px;color:var(--accT)}

/* hero */
.hero{margin-top:20px;gap:10px}
.hcard{width:342px;height:218px;border-radius:28px;position:relative;overflow:hidden;background-color:var(--tile)}
.hcard .wash{position:absolute;inset:0;background:linear-gradient(270deg,rgba(247,242,236,.94) 0%,rgba(247,242,236,.7) 38%,rgba(247,242,236,0) 64%)}
.hcard .txt{position:absolute;right:20px;top:20px;bottom:18px;width:170px;display:flex;flex-direction:column;color:#2D2420}
.hcard .lab{font-size:11.5px;font-weight:600;color:#A4503F;display:flex;align-items:center;gap:5px}
.hcard .lab .ms{font-size:16px}
.hcard h2{font-size:21px;line-height:1.3;font-weight:700;margin-top:6px}
.hcard p{font-size:12px;color:#5E514A;margin-top:3px}
.hcard .cta{margin-top:auto;align-self:flex-start;height:40px;padding:0 16px 0 12px;border-radius:20px;background:#B35C4B;color:#fff;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
.hcard .cta .ms{font-size:18px}
.hcard.dk .wash{background:linear-gradient(270deg,rgba(40,28,24,.78) 0%,rgba(40,28,24,.45) 45%,rgba(40,28,24,0) 70%)}
.hcard.dk .txt{color:#fff}.hcard.dk .lab{color:#F4C9BC}.hcard.dk p{color:#EADDD5}
.dots{display:flex;justify-content:center;gap:6px;margin-top:12px}
.dots i{width:7px;height:7px;border-radius:4px;background:var(--dot)}
.dots i.on{width:20px;background:var(--accT)}

/* section heads */
.sec{margin-top:30px}
.shead{display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px;margin-bottom:13px}
.shead h3{font-size:19px;font-weight:700;line-height:1.2}
.shead .sub{font-size:12px;color:var(--ink3);margin-top:3px}
.shead a{font-size:12.5px;color:var(--accT);font-weight:600;display:flex;align-items:center;gap:1px;white-space:nowrap}
.shead a .ms{font-size:18px}

/* age tiles */
.ages{gap:10px}
.age{width:112px;height:132px;border-radius:24px;padding:12px 13px;position:relative;display:flex;flex-direction:column;overflow:hidden}
.age .ai{position:absolute;left:10px;top:10px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.55);display:grid;place-items:center;color:var(--ink2)}
html.dark .age .ai{background:rgba(255,255,255,.07)}
.age .ai .ms{font-size:17px}
.age b{font-size:27px;font-weight:700;line-height:1;direction:ltr;text-align:right;letter-spacing:-.02em;margin-top:30px}
.age span{font-size:12.5px;color:var(--ink2);font-weight:500;margin-top:4px}
.age small{font-size:11px;color:var(--ink2);margin-top:auto;text-align:right;font-weight:500}

/* product card */
.prow{gap:12px}
.pcard{width:158px}
.pimg{height:190px;border-radius:24px;background-color:var(--tile);position:relative;overflow:hidden}
.fav{position:absolute;top:9px;left:9px;width:32px;height:32px;border-radius:50%;background:rgba(255,253,249,.92);display:grid;place-items:center}
.fav .ms{font-size:18px;color:#2D2420}
.fav.on .ms{color:#B35C4B;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20}
.tag{position:absolute;top:10px;right:10px;font-size:10.5px;font-weight:600;background:rgba(255,253,249,.94);color:#A4503F;border-radius:10px;padding:2px 8px;line-height:1.6}
.tag.sale{background:#B35C4B;color:#fff}
.agechip{position:absolute;bottom:9px;right:9px;font-size:10.5px;font-weight:600;background:rgba(45,36,32,.62);color:#fff;border-radius:10px;padding:2px 8px;backdrop-filter:blur(6px);line-height:1.6}
.pname{font-size:13.5px;font-weight:600;margin-top:9px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pmat{font-size:11.5px;color:var(--ink3);margin-top:1px}
.pfoot{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.price{font-size:15px;font-weight:700;line-height:1.2}
.price small{font-size:11px;color:var(--ink2);font-weight:500}
.price s{display:block;font-size:11px;color:var(--ink3);font-weight:400}
.addb{width:34px;height:34px;border-radius:50%;background:var(--accSoft);display:grid;place-items:center;color:var(--accT)}
.addb .ms{font-size:20px}
.cols{display:flex;gap:4px;margin-top:6px}
.cols i{width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.rate{display:flex;align-items:center;gap:2px;font-size:11px;color:var(--ink3);margin-top:2px}
.rate .ms{font-size:14px;color:var(--gold)}

/* worlds */
.worlds{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.world{height:204px;border-radius:26px;position:relative;overflow:hidden;background-color:var(--tile)}
.world.wide{grid-column:1/-1;height:128px}
.world .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(38,26,22,.7) 0%,rgba(38,26,22,.18) 52%,rgba(38,26,22,0) 72%)}
.world.wide .sc{background:linear-gradient(270deg,rgba(38,26,22,.72) 0%,rgba(38,26,22,.3) 50%,rgba(38,26,22,0) 75%)}
.world .wt{position:absolute;right:14px;left:14px;bottom:13px;color:#fff;display:flex;align-items:flex-end;justify-content:space-between}
.world.wide .wt{top:0;bottom:0;align-items:center}
.world .wt b{display:block;font-size:17px;font-weight:700;line-height:1.2}
.world .wt small{display:block;font-size:11.5px;opacity:.92;margin-top:2px}
.world .go{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.45);backdrop-filter:blur(8px);display:grid;place-items:center;flex:0 0 auto}
.world .go .ms{font-size:18px}

/* gift sets */
.gifts{gap:12px}
.gift{width:262px;background:var(--surface);border-radius:26px;box-shadow:0 0 0 1px var(--line);padding:8px}
.gift .gi{height:142px;border-radius:20px;background-color:var(--tile);position:relative}
.gift .gi .tag{top:10px;right:10px}
.gift .gb{padding:10px 6px 4px}
.gift .gb b{display:block;font-size:15px;font-weight:700}
.gift .gb .inc{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.gift .gb .inc i{font-size:10.5px;color:var(--ink2);background:var(--bg);border-radius:9px;padding:1px 8px;font-weight:500}
.gift .gf{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
.gift .gf .ms{font-size:16px}
.gift .gf .wrap{font-size:11px;color:var(--accT);display:flex;align-items:center;gap:3px;font-weight:600}

/* occasions bento */
.bento{margin:0 16px;display:grid;grid-template-columns:1.1fr 1fr;grid-template-rows:118px 118px;gap:10px}
.bt{border-radius:24px;position:relative;overflow:hidden;background-color:var(--tile)}
.bt.tall{grid-row:1/3}
.bt .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(38,26,22,.72) 0%,rgba(38,26,22,.12) 58%,rgba(38,26,22,0) 78%)}
.bt .bl{position:absolute;right:13px;left:12px;bottom:11px;color:#fff}
.bt .bl b{display:block;font-size:15.5px;font-weight:700;line-height:1.25}
.bt .bl small{display:block;font-size:11px;opacity:.92}
.bt .pill{position:absolute;top:11px;right:11px;font-size:10.5px;font-weight:600;color:#fff;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);backdrop-filter:blur(8px);border-radius:10px;padding:1px 8px}

/* size finder */
.finder{margin:0 16px;border-radius:28px;background:var(--deep);padding:18px;color:#fff;position:relative;overflow:hidden}
.finder .fl{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#F2B9A9;font-weight:600}
.finder .fl .ms{font-size:16px}
.finder h4{font-size:19px;font-weight:700;margin-top:4px;line-height:1.3}
.finder p{font-size:12px;color:#D9CBC2;margin-top:2px}
.finder .ins{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
.finder .in{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:8px 12px}
.finder .in small{display:block;font-size:10.5px;color:#CDBDB3}
.finder .in b{display:flex;align-items:center;justify-content:space-between;font-size:16px;font-weight:700;margin-top:1px}
.finder .in b .ms{font-size:18px;color:#CDBDB3}
.finder .res{display:flex;align-items:center;justify-content:space-between;margin-top:10px;background:#FFFDF9;border-radius:20px;padding:10px 10px 10px 14px;color:#2D2420}
.finder .res .r small{display:block;font-size:10.5px;color:#7A6B62}
.finder .res .r b{font-size:17px;font-weight:700}
.finder .res .r b em{font-size:12px;color:#7A6B62;font-weight:500;margin-right:4px}
.finder .res .gobtn{height:38px;padding:0 14px;border-radius:19px;background:#B35C4B;color:#fff;display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600}
.finder .res .gobtn .ms{font-size:17px}
.finder{background-image:radial-gradient(circle at 0 0,rgba(179,92,75,.42) 0,rgba(179,92,75,.42) 90px,transparent 91px)}

/* grid */
.grid{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:18px 12px}
.grid .pcard{width:auto}
.grid .pimg{height:196px}

/* promise */
.promise{margin:0 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.pr{background:var(--surface);border-radius:22px;box-shadow:0 0 0 1px var(--line);padding:14px 8px 12px;text-align:center}
.pr .ms{width:42px;height:42px;border-radius:50%;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;margin:0 auto;font-size:22px}
.pr b{display:block;font-size:12.5px;font-weight:600;margin-top:8px;line-height:1.3}
.pr small{display:block;font-size:10.5px;color:var(--ink3);margin-top:2px;line-height:1.35}

/* tab bar */
.tabbar{position:absolute;left:16px;right:16px;bottom:28px;height:70px;border-radius:35px;background:var(--tab);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);box-shadow:0 0 0 1px var(--tabline),0 14px 34px rgba(45,36,32,.18);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;padding:0 8px}
html.dark .tabbar{box-shadow:0 0 0 1px var(--tabline),0 14px 34px rgba(0,0,0,.5)}
.tab{display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--ink3);position:relative;height:56px;justify-content:center}
.tab .ms{font-size:24px}
.tab span:not(.ms){font-size:10.5px;font-weight:500}
.tab.on{color:var(--accT)}
.tab.on .ms{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
.tab.on:before{content:'';position:absolute;inset:3px 4px;border-radius:26px;background:var(--accSoft);z-index:-1}
.tab .bd{position:absolute;top:4px;left:50%;margin-left:-22px;min-width:18px;height:18px;border-radius:9px;background:var(--acc);color:#fff;font-size:10px;font-weight:600;display:grid;place-items:center;padding:0 5px;line-height:1}

/* ---------- MENU ---------- */
.grab{width:42px;height:5px;border-radius:3px;background:var(--tile2);margin:2px auto 6px}
.mhead{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:58px}
.mquick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 16px 0}
.mq{background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:22px;height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:11.5px;color:var(--ink2);font-weight:500}
.mq .ms{width:34px;height:34px;border-radius:50%;background:var(--accSoft);display:grid;place-items:center;font-size:19px;color:var(--accT)}
.kids{margin:14px 16px 0;border-radius:24px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:10px 12px;display:flex;align-items:center;gap:10px}
.kids .kl{flex:1}
.kids .kl small{display:block;font-size:10.5px;color:var(--ink3)}
.kids .kl b{display:block;font-size:13px;font-weight:600}
.kav{display:flex}
.kav i{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;box-shadow:0 0 0 2px var(--surface);margin-left:-8px}
.kav i.ad{background:var(--bg);color:var(--ink2)}
.kav i .ms{font-size:18px}
.mcat{margin-top:22px}
.mch{display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:10px}
.mch .l{display:flex;align-items:center;gap:10px}
.mch .ico{width:38px;height:38px;border-radius:50%;background:var(--accSoft);display:grid;place-items:center;color:var(--accT)}
.mch .ico .ms{font-size:21px}
.mch b{display:block;font-size:17px;font-weight:700;line-height:1.2}
.mch small{display:block;font-size:11px;color:var(--ink3)}
.mch a{font-size:12px;color:var(--accT);font-weight:600;display:flex;align-items:center;gap:1px}
.mch a .ms{font-size:17px}
.mrow{gap:10px}
.mc{width:116px}
.mc .im{height:124px;border-radius:24px;background-color:var(--tile);position:relative;overflow:hidden}
.mc .im .sc{position:absolute;inset:0;background:linear-gradient(0deg,rgba(36,24,20,.72) 0%,rgba(36,24,20,.12) 52%,rgba(36,24,20,0) 70%)}
.mc .im b{position:absolute;right:11px;left:10px;bottom:9px;color:#fff;font-size:13px;font-weight:600;line-height:1.3}
.mc .im b small{display:block;font-size:10.5px;font-weight:500;opacity:.9}
.mc.all{width:104px}
.mc.all .im{background:var(--acc);display:flex;flex-direction:column;justify-content:space-between;padding:12px;color:#fff}
.mc.all .im .ms.big{font-size:28px}
.mc.all .im span.t{font-size:13.5px;font-weight:700;line-height:1.25}
.mc.all .im span.t small{display:block;font-size:10.5px;font-weight:500;opacity:.9;margin-top:2px}
.mc.all .im .go{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.2);display:grid;place-items:center;align-self:flex-start}
.mc.all .im .go .ms{font-size:17px}
.mfoot{margin:30px 16px 0;background:var(--surface);border-radius:26px;box-shadow:0 0 0 1px var(--line);padding:4px 16px}
.mli{display:flex;align-items:center;gap:12px;height:54px;border-bottom:1px solid var(--line)}
.mli:last-child{border-bottom:0}
.mli .ms.l{font-size:22px;color:var(--ink2)}
.mli span.t{flex:1;font-size:14px;font-weight:500}
.mli small{font-size:12px;color:var(--ink3)}
.mli .ms.c{font-size:18px;color:var(--ink3)}
.mli .pill2{font-size:11px;font-weight:600;color:var(--accT);background:var(--accSoft);padding:2px 10px;border-radius:10px}
.lang{display:flex;background:var(--bg);border-radius:16px;padding:3px;gap:2px}
.lang i{font-size:11.5px;padding:3px 11px;border-radius:13px;color:var(--ink2);font-weight:500}
.lang i.on{background:var(--acc);color:#fff}
.mhelp{margin:12px 16px 0;display:flex;gap:8px}
.mhelp div{flex:1;height:50px;border-radius:25px;background:var(--accSoft);color:var(--accT);display:flex;align-items:center;justify-content:center;gap:7px;font-size:13px;font-weight:600}
.mhelp .ms{font-size:20px}
.mver{text-align:center;font-size:11px;color:var(--ink3);margin-top:16px}

/* ---------- LISTING ---------- */
.topbar{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;gap:12px}
.topbar .tt{flex:1;min-width:0;text-align:center}
.topbar .tt b{display:block;font-size:19px;font-weight:700;line-height:1.15}
.topbar .tt small{display:block;font-size:11.5px;color:var(--ink3)}
.chips{gap:8px;margin-top:6px}
.chip{height:38px;padding:0 15px;border-radius:19px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink2);white-space:nowrap;font-weight:500}
.chip.on{background:var(--ink);color:var(--bg);box-shadow:none;font-weight:600}
.chip small{font-size:10.5px;opacity:.7}
.agebar{margin:14px 16px 0;background:var(--surface);box-shadow:0 0 0 1px var(--line);border-radius:22px;padding:10px 12px}
.agebar .ah{display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink3)}
.agebar .ah b{color:var(--ink);font-weight:600}
.agesel{display:flex;gap:6px;margin-top:8px}
.agesel i{flex:1;height:36px;border-radius:18px;background:var(--bg);display:grid;place-items:center;font-size:12.5px;font-weight:600;color:var(--ink2);direction:ltr}
.agesel i.on{background:var(--acc);color:#fff}
.fbar{display:flex;align-items:center;gap:8px;margin:12px 16px 0}
.fbtn{height:42px;padding:0 14px;border-radius:21px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;white-space:nowrap}
.fbtn .ms{font-size:19px}
.fbtn .c{min-width:19px;height:19px;border-radius:10px;background:var(--acc);color:#fff;font-size:10.5px;display:grid;place-items:center;padding:0 5px;line-height:1}
.fbtn.sort{flex:1;justify-content:space-between;font-weight:500;color:var(--ink2)}
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
.rcount b{color:var(--ink);font-weight:600}
.promo{grid-column:1/-1;height:156px;border-radius:28px;position:relative;overflow:hidden;background-color:var(--deep)}
.promo .sc{position:absolute;inset:0;background:linear-gradient(270deg,rgba(42,28,24,.86) 0%,rgba(42,28,24,.55) 48%,rgba(42,28,24,0) 78%)}
.promo .pt{position:absolute;right:18px;top:16px;bottom:16px;width:200px;color:#fff;display:flex;flex-direction:column}
.promo .pt small{font-size:11px;color:#F2C3B6;display:flex;align-items:center;gap:4px;font-weight:600}
.promo .pt small .ms{font-size:15px}
.promo .pt b{font-size:18px;font-weight:700;line-height:1.3;margin-top:4px}
.promo .pt .cta2{margin-top:auto;align-self:flex-start;height:36px;padding:0 14px;border-radius:18px;background:#B35C4B;display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600}
.promo .pt .cta2 .ms{font-size:16px}
.more{margin:26px 16px 0;text-align:center}
.more .prog{width:150px;height:5px;border-radius:3px;background:var(--tile2);margin:0 auto;overflow:hidden}
.more .prog i{display:block;height:100%;width:24%;background:var(--accT);border-radius:3px}
.more p{font-size:11.5px;color:var(--ink3);margin-top:8px}
.more .mb{margin:12px auto 0;height:48px;width:210px;border-radius:24px;box-shadow:0 0 0 1.4px var(--accT);color:var(--accT);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;font-weight:600}
.more .mb .ms{font-size:19px}

/* ---------- PRODUCT ---------- */
.ptop{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.gal{position:relative;margin:0 16px;height:400px;border-radius:30px;overflow:hidden;background-color:var(--tile)}
.gal .gdots{position:absolute;bottom:16px;left:0;right:0;display:flex;justify-content:center;gap:5px}
.gal .gdots i{width:7px;height:7px;border-radius:4px;background:rgba(255,255,255,.6)}
.gal .gdots i.on{width:20px;background:#fff}
.gal .gb{position:absolute;top:14px;right:14px;height:28px;padding:0 10px;border-radius:14px;background:rgba(255,253,249,.92);color:#A4503F;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px}
.gal .gb .ms{font-size:15px}
.gal .gcnt{position:absolute;bottom:12px;left:14px;height:26px;padding:0 10px;border-radius:13px;background:rgba(45,36,32,.55);color:#fff;font-size:11px;display:flex;align-items:center;direction:ltr;backdrop-filter:blur(6px)}
.thumbs{display:flex;gap:8px;margin:10px 16px 0}
.thumbs div{flex:1;height:64px;border-radius:18px;background-color:var(--tile);position:relative;overflow:hidden}
.thumbs div.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--accT)}
.thumbs div.v:after{content:'';position:absolute;inset:0;background:rgba(45,36,32,.42)}
.thumbs div.v span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;z-index:1}
.pinfo{padding:18px 16px 0}
.pinfo .brandl{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--ink3)}
.pinfo .brandl b{color:var(--accT);font-weight:600;display:flex;align-items:center;gap:4px}
.pinfo .brandl .ms{font-size:16px}
.pinfo h1{font-size:23px;font-weight:700;line-height:1.3;margin-top:4px}
.pinfo .sub{font-size:12.5px;color:var(--ink2);margin-top:2px}
.prow2{display:flex;align-items:flex-end;justify-content:space-between;margin-top:12px}
.bigp{font-size:27px;font-weight:700;line-height:1}
.bigp small{font-size:13px;color:var(--ink2);font-weight:500}
.oldp{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12.5px;color:var(--ink3)}
.oldp .dc{font-size:11.5px;font-weight:700;color:#fff;background:var(--acc);padding:1px 8px;border-radius:9px;direction:ltr}
.rbox{text-align:left}
.rbox .r1{display:flex;align-items:center;gap:3px;justify-content:flex-end;font-size:15px;font-weight:700}
.rbox .r1 .ms{font-size:19px;color:var(--gold)}
.rbox small{display:block;font-size:11.5px;color:var(--ink3);text-decoration:underline;text-underline-offset:3px}
.inst{margin:14px 16px 0;padding:10px 12px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;align-items:center;gap:10px;font-size:12px;color:var(--ink2)}
.inst b{color:var(--ink);font-weight:600}
.inst .lg{height:26px;padding:0 10px;border-radius:13px;background:var(--accSoft);color:var(--accT);font-size:11px;font-weight:700;display:grid;place-items:center}
.vsec{margin:20px 16px 0}
.vsec .vh{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.vsec .vh b{font-size:14.5px;font-weight:600}
.vsec .vh b span{color:var(--ink2);font-weight:500}
.vsec .vh a{font-size:12px;color:var(--accT);display:flex;align-items:center;gap:3px;font-weight:600}
.vsec .vh a .ms{font-size:16px}
.sws{display:flex;gap:12px}
.swb{text-align:center}
.swb i{display:block;width:48px;height:48px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}
.swb.on i{box-shadow:0 0 0 2.5px var(--bg),0 0 0 4px var(--accT)}
.swb span{display:block;font-size:11px;color:var(--ink2);margin-top:5px}
.swb.on span{color:var(--ink);font-weight:600}
.sizes{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
.sizes div{height:54px;border-radius:18px;background:var(--surface);box-shadow:0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15}
.sizes div b{font-size:13.5px;font-weight:700;direction:ltr}
.sizes div small{font-size:10px;color:var(--ink3)}
.sizes div.on{background:var(--acc);box-shadow:none;color:#fff}
.sizes div.on small{color:#F8DCD3}
.sizes div.off{opacity:.42;text-decoration:line-through}
.fitbar{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:var(--ink2);background:var(--sage);border-radius:16px;padding:8px 12px}
.fitbar .ms{font-size:18px;color:#5C7048}
html.dark .fitbar .ms{color:#A9C08F}
.blk{margin:12px 16px 0;background:var(--surface);border-radius:28px;box-shadow:0 0 0 1px var(--line);padding:16px}
.blk h4{font-size:17px;font-weight:700;display:flex;align-items:center;justify-content:space-between}
.blk h4 small{font-size:11.5px;color:var(--ink3);font-weight:500}
.stbl{margin-top:12px;border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px var(--line)}
.stbl .r{display:grid;grid-template-columns:.8fr 1.3fr 1fr 1fr;align-items:center;height:40px;font-size:12.5px;padding:0 12px;border-top:1px solid var(--line)}
.stbl .r:first-child{border-top:0;background:var(--bg);font-size:11px;color:var(--ink3);font-weight:500;height:36px}
.stbl .r>span{text-align:center}
.stbl .r>span:first-child{text-align:right;font-weight:600}
.stbl .r.hl{background:var(--accSoft);color:var(--accT);font-weight:600}
.stbl .r.hl>span:first-child:after{content:'طفلك';font-size:9.5px;background:var(--acc);color:#fff;border-radius:7px;padding:0 6px;margin-right:5px;font-weight:600}
.snote{display:flex;gap:8px;margin-top:12px;font-size:12px;color:var(--ink2);line-height:1.6}
.snote .ms{font-size:18px;color:var(--accT);flex:0 0 auto;margin-top:1px}
.fab2{display:flex;gap:12px;align-items:center;margin-top:12px}
.fab2 .sw2{width:72px;height:72px;border-radius:22px;background-color:var(--tile);flex:0 0 auto}
.fab2 .comp{flex:1}
.comp .cl{display:flex;justify-content:space-between;font-size:12.5px;font-weight:600}
.comp .cl span{color:var(--ink3);font-weight:500}
.comp .cb{height:8px;border-radius:4px;background:var(--tile);overflow:hidden;display:flex;margin:6px 0 10px}
.comp .cb i{display:block;height:100%}
.safe{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.safe div{background:var(--bg);border-radius:18px;padding:10px 11px;display:flex;gap:8px;align-items:flex-start}
.safe .ms{font-size:20px;color:#5C7048;flex:0 0 auto}
html.dark .safe .ms{color:#A9C08F}
.safe b{display:block;font-size:12px;font-weight:600;line-height:1.3}
.safe small{display:block;font-size:10.5px;color:var(--ink3);line-height:1.35;margin-top:1px}
.care{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.care div{text-align:center;background:var(--bg);border-radius:18px;padding:10px 4px}
.care .ms{font-size:23px;color:var(--accT)}
.care span{display:block;font-size:10.5px;color:var(--ink2);margin-top:3px;line-height:1.35}
.dlv{margin:12px 16px 0;border-radius:28px;background:var(--sage);padding:4px 16px}
.dl{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(45,36,32,.08)}
html.dark .dl{border-color:rgba(255,255,255,.06)}
.dl:last-child{border:0}
.dl .ms{font-size:23px;color:#5C7048}
html.dark .dl .ms{color:#A9C08F}
.dl b{display:block;font-size:13px;font-weight:600}
.dl small{display:block;font-size:11.5px;color:var(--ink2)}
.acc{margin:12px 16px 0;background:var(--surface);border-radius:26px;box-shadow:0 0 0 1px var(--line);padding:0 16px}
.ac{border-bottom:1px solid var(--line);padding:14px 0}
.ac:last-child{border:0}
.ac .ah{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:600}
.ac .ah .ms{font-size:20px;color:var(--ink3)}
.ac p{font-size:12.5px;color:var(--ink2);line-height:1.75;margin-top:6px}
.rv{margin:12px 16px 0;background:var(--surface);border-radius:28px;box-shadow:0 0 0 1px var(--line);padding:16px}
.rvtop{display:flex;gap:16px;align-items:center;margin-top:10px}
.rvbig{text-align:center;width:92px}
.rvbig b{font-size:40px;font-weight:700;line-height:1}
.rvbig .stars{display:flex;justify-content:center;color:var(--gold);margin-top:4px}
.rvbig .stars .ms{font-size:14px}
.rvbig small{display:block;font-size:11px;color:var(--ink3);margin-top:2px}
.bars{flex:1;display:flex;flex-direction:column;gap:4px}
.bar{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--ink3)}
.bar i{flex:1;height:6px;border-radius:3px;background:var(--tile);overflow:hidden;display:block}
.bar i em{display:block;height:100%;background:var(--accT);border-radius:3px}
.fitm{margin-top:12px;background:var(--bg);border-radius:16px;padding:9px 12px}
.fitm .fh{display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink2)}
.fitm .fh b{color:var(--ink);font-weight:600}
.fitm .tr{position:relative;height:6px;border-radius:3px;background:var(--tile2);margin:8px 0 2px}
.fitm .tr i{position:absolute;top:-4px;left:50%;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 3px var(--bg)}
.fitm .tl{display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink3)}
.rvph{display:flex;gap:8px;margin-top:12px}
.rvph div{flex:1;height:80px;border-radius:18px;background-color:var(--tile);position:relative;overflow:hidden}
.rvph div.more2:after{content:'+42';direction:ltr;position:absolute;inset:0;background:rgba(45,36,32,.55);color:#fff;display:grid;place-items:center;font-size:14px;font-weight:600}
.rvq{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
.rvq .who{display:flex;align-items:center;gap:8px}
.rvq .who i{width:32px;height:32px;border-radius:50%;background:var(--accSoft);color:var(--accT);display:grid;place-items:center;font-size:13px;font-weight:700}
.rvq .who b{display:block;font-size:13px;font-weight:600}
.rvq .who small{display:block;font-size:11px;color:var(--ink3)}
.rvq .who .stars{margin-right:auto;color:var(--gold);display:flex}
.rvq .who .stars .ms{font-size:14px}
.rvq q{display:block;font-size:12.5px;line-height:1.7;margin-top:7px;quotes:none;color:var(--ink)}
.rvq .vf{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#5C7048;margin-top:5px;font-weight:500}
html.dark .rvq .vf{color:#A9C08F}
.rvq .vf .ms{font-size:14px}
.gw{margin:0 16px;background:var(--surface);border-radius:28px;box-shadow:0 0 0 1px var(--line);padding:12px}
.gwi{display:flex;align-items:center;gap:12px;padding:6px 0}
.gwi .gim{width:64px;height:64px;border-radius:18px;background-color:var(--tile);flex:0 0 auto}
.gwi .gt{flex:1}
.gwi .gt b{display:block;font-size:13px;font-weight:600}
.gwi .gt small{display:block;font-size:11px;color:var(--ink3)}
.gwi .gt span{font-size:13.5px;font-weight:700}
.gwi .gt span small{display:inline;font-size:10.5px;color:var(--ink2);font-weight:500}
.ck{width:26px;height:26px;border-radius:50%;background:var(--acc);display:grid;place-items:center;color:#fff}
.ck .ms{font-size:17px}
.ck.no{background:transparent;box-shadow:inset 0 0 0 1.5px var(--line);color:transparent}
.gwb{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding-top:12px;border-top:1px dashed var(--line)}
.gwb .t small{display:block;font-size:11px;color:var(--ink3)}
.gwb .t b{font-size:18px;font-weight:700}
.gwb .t b small{display:inline;font-size:11px;color:var(--ink2);font-weight:500}
.gwb .t s{font-size:12px;color:var(--ink3);margin-right:6px}
.btn{height:44px;padding:0 18px;border-radius:22px;background:var(--acc);color:#fff;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
.btn .ms{font-size:19px}
.sticky{position:absolute;left:0;right:0;bottom:0;z-index:5;padding:12px 16px 30px;background:var(--tab);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);box-shadow:0 -1px 0 var(--line);display:flex;align-items:center;gap:10px}
.sticky .sp{min-width:0}
.sticky .sp small{display:block;font-size:11px;color:var(--ink3)}
.sticky .sp b{font-size:20px;font-weight:700;line-height:1.1;white-space:nowrap}
.sticky .sp b small{display:inline;font-size:11.5px;color:var(--ink2);font-weight:500}
.qty{display:flex;align-items:center;gap:10px;height:50px;border-radius:25px;background:var(--surface);box-shadow:0 0 0 1px var(--line);padding:0 10px;font-size:15px;font-weight:700}
.qty .ms{font-size:19px;color:var(--ink2)}
.addcart{flex:1;height:52px;border-radius:26px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center;gap:7px;font-size:14.5px;font-weight:600}
.addcart .ms{font-size:21px}
"""

def pcard(img, f, name, sub, price, old=None, tag=None, fav=False, age=None, cols=None, rate=None):
    t = ''
    if tag:
        t = f'<span class="tag sale ltr">{tag}</span>' if tag.startswith('-') else f'<span class="tag">{tag}</span>'
    a = f'<span class="agechip ltr">{age}</span>' if age else ''
    pr = f'<div class="price">{price} <small>{CUR}</small>' + (f'<s>{old} {CUR}</s>' if old else '') + '</div>'
    c = ('<div class="cols">' + ''.join(f'<i style="background:{x}"></i>' for x in cols) + '</div>') if cols else ''
    r = f'<div class="rate">{ic("star","fill")}{rate}</div>' if rate else ''
    return f'''<div class="pcard">{ph(img, f, "pimg", t + f'<div class="fav{" on" if fav else ""}">{ic("favorite")}</div>' + a)}
<div class="pname">{name}</div><div class="pmat">{sub}</div>{r}{c}
<div class="pfoot">{pr}<div class="addb">{ic("add")}</div></div></div>'''

def tabbar(active=0):
    tabs = [("home", "الرئيسية"), ("storefront", "المتجر"), ("shopping_bag", "السلة"), ("package_2", "طلباتي"), ("person", "حسابي")]
    out = ''
    for i, (n, l) in enumerate(tabs):
        bd = '<i class="bd">2</i>' if n == 'shopping_bag' else ''
        out += f'<div class="tab{" on" if i == active else ""}">{ic(n)}<span>{l}</span>{bd}</div>'
    return f'<div class="tabbar">{out}</div><div class="homeind"></div>'

MARK = '<div class="bmark"><svg width="24" height="24" viewBox="0 0 24 24"><circle cx="8.2" cy="13" r="3.3" fill="#fff"/><circle cx="15.8" cy="13" r="3.3" fill="#fff"/><circle cx="12" cy="17.2" r="3.3" fill="#fff"/><circle cx="12" cy="9.4" r="3.3" fill="#fff"/><path d="M12 6.4c.4-2 1.8-3.4 4-3.6-.3 2-1.7 3.4-4 3.6z" fill="#fff"/></svg></div>'
BRAND = f'<div class="brand">{MARK}<div><b>توتة</b><small>TOOTA KIDS</small></div></div>'

def K(n): return f'k/{n}.jpg'

# ---------------- HOME ----------------
def home():
    avs = [("newborn-knit", "0.4 0.45 1.6", "مواليد"), ("tiered-dress", "0.45 0.3 1.4", "بنات"), ("denim-jacket", "0.48 0.75 1.6", "أولاد"),
           ("sparkle-sneakers", "0.5 0.62 1.7", "أحذية"), ("pom-beanie", "0.5 0.4 1.6", "إكسسوارات"), ("gift-kraft", "0.5 0.5 1.7", "هدايا")]
    av = f'<div class="av on"><div class="c ic">{ic("auto_awesome")}</div><span>الجديد</span></div>'
    av += ''.join(f'<div class="av"><div class="c">{ph(K(i), f)}</div><span>{n}</span></div>' for i, f, n in avs)

    ages = [("0–6", "أشهر", "56–68", "var(--blush)", "child_care"),
            ("6–24", "شهراً", "74–92", "var(--butter)", "crib"),
            ("2–4", "سنوات", "92–104", "var(--sage)", "toys"),
            ("4–8", "سنوات", "110–128", "var(--sky)", "directions_run"),
            ("8–12", "سنة", "134–152", "var(--sand)", "school")]
    agec = ''.join(f'<div class="age" style="background:{bg}"><span class="ai">{ic(i)}</span><b>{a}</b><span>{u}</span><small>مقاس {L(sz)}</small></div>' for a, u, sz, bg, i in ages)
    newin = ''.join([
        pcard(K("rust-sweater"), "0.55 0.42 1.5", "كنزة ميرينو بأزرار خشبية", "صوف ميرينو ناعم", "1,150", "1,450", "-20%", True, "2–5Y"),
        pcard(K("tiered-dress"), "0.45 0.28 1.15", "فستان قطني بطبقات ملوّنة", "قطن عضوي · خفيف", "980", None, "جديد", False, "3–6Y"),
        pcard(K("yellow-raincoat"), "0.5 0.86 2.3", "معطف مطر بقبعة", "مقاوم للماء · مبطّن", "1,190", None, "جديد", False, "4–10Y"),
        pcard(K("newborn-knit"), "0.45 0.45 1.3", "طقم مولود محبوك", "قطن بيما · 3 قطع", "820", None, None, False, "0–6M"),
    ])
    worlds = f'''<div class="worlds">
{ph(K("tiered-dress"), "0.45 0.32 1.05", "world", '<div class="sc"></div><div class="wt"><div><b>عالم البنات</b><small>1,240 قطعة · 0–12 سنة</small></div><span class="go">' + ic("arrow_back") + '</span></div>')}
{ph(K("denim-jacket"), "0.47 0.55 1.25", "world", '<div class="sc"></div><div class="wt"><div><b>عالم الأولاد</b><small>980 قطعة · 0–12 سنة</small></div><span class="go">' + ic("arrow_back") + '</span></div>')}
{ph(K("newborn-knit"), "0.38 0.5 1.15", "world wide", '<div class="sc"></div><div class="wt"><div><b>البيبي والمواليد</b><small>أطقم ناعمة لأول عام · 0–24 شهراً</small></div><span class="go">' + ic("arrow_back") + '</span></div>')}
</div>'''
    gifts = [("gift-kraft", "0.52 0.5 1.25", "صندوق المولود الأول", ["بودي", "قبعة", "بطانية", "دمية"], "1,450", "الأكثر طلباً"),
             ("gift-pink", "0.72 0.5 1.3", "هدية عيد الميلاد", ["فستان", "توكة شعر", "بطاقة"], "1,290", "جديد"),
             ("mittens", "0.3 0.78 1.7", "صندوق الشتاء الدافئ", ["قبعة", "قفازات", "جوارب"], "690", None)]
    gc = ''
    for im, f, n, inc, p, t in gifts:
        tg = f'<span class="tag">{t}</span>' if t else ''
        gc += f'''<div class="gift">{ph(K(im), f, "gi", tg)}<div class="gb"><b>{n}</b><div class="inc">{"".join(f"<i>{x}</i>" for x in inc)}</div>
<div class="gf"><div class="price">{p} <small>{CUR}</small></div><span class="wrap">{ic("redeem")}تغليف مجاني</span></div></div></div>'''
    bento = f'''<div class="bento">
{ph(K("girl-desk"), "0.3 0.5 1.15", "bt tall", '<span class="pill">سبتمبر</span><div class="sc"></div><div class="bl"><b>العودة للمدارس</b><small>زي مدرسي وحقائب وأحذية</small></div>')}
{ph(K("white-dresses"), "0.5 0.68 1.35", "bt", '<div class="sc"></div><div class="bl"><b>إطلالات العيد</b><small>فساتين وقمصان أنيقة</small></div>')}
{ph(K("balloons"), "0.5 0.35 1.1", "bt", '<div class="sc"></div><div class="bl"><b>أعياد الميلاد</b><small>هدايا وأزياء الحفلات</small></div>')}
</div>'''
    best = ''.join([
        pcard(K("robe-b"), "0.5 0.45 1.35", "روب استحمام تيري بقبعة", "قطن مصري 100%", "690", None, None, False, "2–8Y", None, "4.9"),
        pcard(K("slippers"), "0.66 0.84 2.2", "شبشب أرنب منزلي", "فرو صناعي ناعم", "390", None, None, True, "1–6Y", None, "4.8"),
        pcard(K("grey-hoodie"), "0.55 0.75 1.5", "هودي فليس رمادي", "قطن مُمشّط", "760", "950", "-20%", False, "3–10Y", None, "4.8"),
        pcard(K("sparkle-sneakers"), "0.56 0.62 1.45", "حذاء رياضي لامع", "نعل مرن مانع للانزلاق", "1,090", None, None, False, "25–34", None, "4.7"),
    ])
    return f'''<div class="screen">{STATUS}
<div class="header">{BRAND}<div class="hicons"><div class="ibtn">{ic("notifications")}<i class="n">3</i></div><div class="ibtn">{ic("menu")}</div></div></div>
<div class="srow"><div class="search">{ic("search")}<div class="t">ابحثي عن فستان، بيجامة، هدية…</div>{ic("photo_camera","cam")}</div><div class="filt">{ic("tune")}</div></div>
<div class="hscroll avs">{av}</div>
<div class="hscroll hero">
{ph(K("baby-flatlay"), "0.7 0.5 1.42", "hcard", '<div class="wash"></div><div class="txt"><span class="lab">' + ic("eco") + 'مجموعة الشتاء الناعمة</span><h2>قطن عضوي دافئ لأول أيامه</h2><p>أطقم من 0 إلى 24 شهراً</p><span class="cta">تسوّقي الآن' + ic("arrow_back") + '</span></div>')}
{ph(K("girls-coats"), "0.5 0.55 1", "hcard dk", '<div class="wash"></div>')}
</div>
<div class="dots"><i class="on"></i><i></i><i></i><i></i></div>

<div class="sec"><div class="shead"><div><h3>تسوّقي حسب العمر</h3><div class="sub">مقاسات مضبوطة لكل مرحلة</div></div><a>دليل المقاسات{ic("chevron_left")}</a></div>
<div class="hscroll ages">{agec}</div></div>

<div class="sec"><div class="shead"><div><h3>وصل حديثاً</h3><div class="sub">قطع جديدة لموسم الشتاء</div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll prow">{newin}</div></div>

<div class="sec"><div class="shead"><div><h3>بنات، أولاد وبيبي</h3><div class="sub">عالم كامل لكل طفل</div></div></div>{worlds}</div>

<div class="sec"><div class="shead"><div><h3>أطقم الهدايا</h3><div class="sub">مغلّفة يدوياً مع بطاقة إهداء</div></div><a>كل الهدايا{ic("chevron_left")}</a></div>
<div class="hscroll gifts">{gc}</div></div>

<div class="sec"><div class="shead"><div><h3>المدرسة والمناسبات</h3><div class="sub">جاهزون لكل يوم مميّز</div></div><a>عرض الكل{ic("chevron_left")}</a></div>{bento}</div>

<div class="sec"><div class="finder"><div>
<span class="fl">{ic("straighten")}مساعد المقاسات</span><h4>ما المقاس المناسب لطفلك؟</h4><p>أدخلي العمر والطول ونقترح لكِ المقاس الأدق</p>
<div class="ins"><div class="in"><small>العمر</small><b>3 سنوات{ic("expand_more")}</b></div><div class="in"><small>الطول</small><b>98 سم{ic("expand_more")}</b></div></div>
<div class="res"><div class="r"><small>المقاس المقترح</small><b>98 <em>{L("2–3Y")}</em></b></div><span class="gobtn">تسوّقي مقاسه{ic("arrow_back")}</span></div></div></div></div>

<div class="sec"><div class="shead"><div><h3>الأكثر حبّاً</h3><div class="sub">اختيارات الأمهات هذا الشهر</div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="grid">{best}</div></div>

<div class="sec"><div class="promise">
<div class="pr">{ic("eco")}<b>قطن عضوي</b><small>ناعم على البشرة الحساسة</small></div>
<div class="pr">{ic("verified_user")}<b>صبغات آمنة</b><small>مختبرة وخالية من المواد الضارة</small></div>
<div class="pr">{ic("autorenew")}<b>استبدال مجاني</b><small>خلال 30 يوماً إذا لم يناسب المقاس</small></div>
</div></div>
{tabbar(0)}</div>'''


# ---------------- MENU ----------------
MENU = [
    ("child_care", "المواليد", f"{L('0–12')} شهراً · 640 قطعة", [("newborn-knit", "0.4 0.45 1.4", "أطقم الولادة", 86), ("romper-hat", "0.45 0.42 1.5", "بودي وأوفرول", 142), ("sleep-striped", "0.5 0.55 1.2", "ملابس النوم", 74), ("knit-blanket", "0.5 0.5 1.2", "بطانيات ولفّات", 38)]),
    ("girl", "البنات", "1,240 قطعة", [("tiered-dress", "0.45 0.3 1.3", "فساتين", 318), ("summer-outfit", "0.5 0.5 2.2", "أطقم صيفية", 84), ("pink-pajamas", "0.45 0.55 1.6", "بيجامات", 112), ("girls-coats", "0.5 0.62 1.3", "جاكيتات ومعاطف", 96)]),
    ("boy", "الأولاد", "980 قطعة", [("grey-hoodie", "0.55 0.72 1.3", "هوديز وسويتشيرت", 154), ("denim-jacket", "0.48 0.7 1.4", "جاكيتات", 88), ("plaid-shirt", "0.8 0.6 1.6", "قمصان", 132), ("knit-hat-green", "0.55 0.5 1.2", "ملابس شتوية", 70)]),
    ("steps", "الأحذية", "410 قطع", [("sparkle-sneakers", "0.55 0.6 1.3", "أحذية رياضية", 146), ("baby-shoes", "0.5 0.62 1.6", "الخطوة الأولى", 58), ("slippers", "0.66 0.84 2.2", "شباشب منزلية", 41)]),
    ("styler", "الإكسسوارات", "560 قطعة", [("pom-beanie", "0.5 0.42 1.4", "قبعات صوف", 72), ("straw-hat", "0.55 0.68 1.4", "قبعات صيفية", 36), ("knit-socks", "0.45 0.5 1.2", "جوارب", 120), ("mittens", "0.4 0.6 1.4", "قفازات", 28)]),
    ("redeem", "الهدايا", "120 طقماً", [("gift-kraft", "0.52 0.5 1.4", "صناديق المواليد", 34), ("gift-pink", "0.72 0.5 1.4", "هدايا أعياد الميلاد", 46), ("teddy-sweater", "0.6 0.6 1.5", "دمى ناعمة", 40)]),
    ("school", "المدرسة والمناسبات", "380 قطعة", [("girl-desk", "0.3 0.5 1.3", "العودة للمدارس", 168), ("white-dresses", "0.5 0.68 1.5", "ملابس العيد", 124), ("birthday-cake", "0.82 0.55 1.6", "أعياد الميلاد", 88)]),
]

def menu():
    rows = ''
    for icn, name, cnt, subs in MENU:
        cards = f'<div class="mc all"><div class="im">{ic(icn,"big")}<span class="t">كل {name}<small>{cnt.split(" · ")[-1]}</small></span><span class="go">{ic("arrow_back")}</span></div></div>'
        for img, f, n, c in subs:
            cards += f'<div class="mc">{ph(K(img), f, "im", f"<div class=sc></div><b>{n}<small>{c} قطعة</small></b>")}</div>'
        rows += f'''<div class="mcat"><div class="mch"><div class="l"><span class="ico">{ic(icn)}</span><div><b>{name}</b><small>{cnt} · {len(subs)} أقسام</small></div></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll mrow">{cards}</div></div>'''
    return f'''<div class="screen" style="padding-bottom:40px">{STATUS}
<div class="grab"></div>
<div class="mhead">{BRAND}<div class="ibtn">{ic("close")}</div></div>
<div class="srow"><div class="search">{ic("search")}<div class="t">ابحثي في كل الأقسام…</div>{ic("photo_camera","cam")}</div></div>
<div class="mquick">
<div class="mq">{ic("auto_awesome")}وصل حديثاً</div><div class="mq">{ic("cake")}حسب العمر</div><div class="mq">{ic("percent")}العروض</div><div class="mq">{ic("straighten")}دليل المقاسات</div></div>
<div class="kids"><div class="kav"><i style="background:var(--blush);color:var(--accT)">ل</i><i style="background:var(--sky);color:#3E6378">ي</i><i class="ad">{ic("add")}</i></div><div class="kl"><small>أطفالي · 3 و7 سنوات</small><b>ليلى ويوسف</b></div><span style="font-size:11.5px;color:var(--ink3);display:flex;align-items:center;gap:2px">مقاساتهم محفوظة{ic("chevron_left")}</span></div>
{rows}
<div class="mfoot">
<div class="mli">{ic("person","l")}<span class="t">حسابي</span><small>مريم عبد الله</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("package_2","l")}<span class="t">طلباتي</span><span class="pill2">طلب في الطريق</span>{ic("chevron_left","c")}</div>
<div class="mli">{ic("favorite","l")}<span class="t">المفضلة</span><small>18 قطعة</small>{ic("chevron_left","c")}</div>
<div class="mli">{ic("language","l")}<span class="t">اللغة</span><div class="lang"><i class="on">العربية</i><i>English</i></div></div>
<div class="mli">{ic("support_agent","l")}<span class="t">تواصل معنا</span><small>يومياً 9ص – 11م</small>{ic("chevron_left","c")}</div>
</div>
<div class="mhelp"><div>{ic("chat")}واتساب</div><div>{ic("call")}اتصلي بنا</div></div>
<div class="mver">توتة كيدز · الإصدار 2.4</div>
<div class="homeind"></div>
</div>'''


# ---------------- LISTING ----------------
def listing():
    pink, cream, navy, rust = '#E7B8B4', '#EFE6D8', '#2F3C5C', '#B86A45'
    items = [
        pcard(K("tiered-dress"), "0.45 0.28 1.15", "فستان قطني بطبقات", "قطن عضوي", "980", None, "جديد", False, "2–6Y", ['#E58FA0', '#F2C14E', '#E9DCCB'], "4.8"),
        pcard(K("cream-knit"), "0.6 0.42 1.5", "كارديجان محبوك كريمي", "قطن وكشمير", "1,350", None, None, True, "2–6Y", [cream, pink], "4.9"),
        pcard(K("pink-pajamas"), "0.5 0.62 2.0", "بيجامة مخططة وردية", "قطن بوبلين", "720", "900", "-20%", False, "3–8Y", [pink, '#BFD2E6'], "4.8"),
        pcard(K("romper-hat"), "0.45 0.45 1.5", "بودي مطبوع وقبعة شمس", "قطن بيما", "540", None, None, False, "6–24M", [cream, pink], "4.7"),
        None,
        pcard(K("girls-coats"), "0.42 0.58 1.9", "فستان مخمل بطبعة", "مخمل قطني", "1,120", None, "جديد", False, "3–7Y", ['#5A2F48', navy], "4.8"),
        pcard(K("slippers"), "0.66 0.84 2.2", "شبشب أرنب منزلي", "فرو صناعي ناعم", "390", None, None, False, "1–6Y", [pink, cream], "4.8"),
        pcard(K("robe-b"), "0.5 0.45 1.35", "روب استحمام تيري", "قطن مصري 100%", "690", None, None, True, "2–8Y", [cream, '#BFD2E6'], "4.9"),
        pcard(K("striped-tights"), "0.5 0.72 1.5", "جوارب طويلة مخططة", "قطن مرن", "240", "320", "-25%", False, "2–6Y", ['#222', '#B33A3A'], "4.6"),
        pcard(K("summer-outfit"), "0.5 0.52 2.4", "طقم صيفي بألوان قوس قزح", "جيرسيه قطني", "650", None, None, False, "2–5Y", ['#E58FA0', '#F2C14E'], "4.7"),
        pcard(K("straw-hat"), "0.55 0.66 1.45", "قبعة قش بشريطة", "قش طبيعي مبطّن", "450", None, None, False, "3–8Y", ['#D9B98A'], "4.6"),
    ]
    g = ''
    for it in items:
        if it is None:
            g += f'''{ph(K("white-dresses"), "0.5 0.7 1.4", "promo", '<div class="sc"></div><div class="pt"><small>' + ic("auto_awesome") + 'مجموعة العيد</small><b>فساتين بيضاء لأجمل المناسبات</b><span class="cta2">اكتشفي المجموعة' + ic("arrow_back") + '</span></div>')}'''
        else:
            g += it
    return f'''<div class="screen">{STATUS}
<div class="topbar"><div class="ibtn">{ic("arrow_forward")}</div><div class="tt"><b>البنات</b><small>1,240 قطعة</small></div><div class="ibtn">{ic("search")}</div></div>
<div class="hscroll chips"><div class="chip on">الكل</div><div class="chip">فساتين <small>318</small></div><div class="chip">تول ومناسبات <small>64</small></div><div class="chip">بيجامات <small>112</small></div><div class="chip">جاكيتات <small>96</small></div><div class="chip">أحذية <small>146</small></div></div>
<div class="agebar"><div class="ah"><span>العمر</span><span><b>{L("2–5")} سنوات</b> · مقاس {L("92–110")}</span></div>
<div class="agesel"><i>0–2</i><i class="on">2–5</i><i>5–8</i><i>8–12</i></div></div>
<div class="fbar"><div class="fbtn">{ic("tune")}تصفية<span class="c">3</span></div><div class="fbtn sort"><span>الترتيب: <b>الأكثر حبّاً</b></span>{ic("expand_more")}</div><div class="vt"><i class="on">{ic("grid_view")}</i><i>{ic("view_agenda")}</i></div></div>
<div class="atags"><span class="atag">{L("2–5")} سنوات{ic("close")}</span><span class="atag">قطن عضوي{ic("close")}</span><span class="atag">وردي{ic("close")}</span><span class="aclear">مسح الكل</span></div>
<div class="rcount"><span><b>186</b> قطعة</span><span>توصيل مجاني فوق 1,500 {CUR}</span></div>
<div class="grid">{g}</div>
<div class="more"><div class="prog"><i></i></div><p>شاهدتِ 10 من 186 قطعة</p><div class="mb">{ic("expand_more")}عرض المزيد</div></div>
{tabbar(1)}</div>'''


# ---------------- PRODUCT ----------------
def product():
    rv = ''.join(ph(K(i), f, c) for i, f, c in [("rust-sweater", "0.6 0.4 2.2", ""), ("cream-knit", "0.6 0.45 1.4", ""), ("knit-socks", "0.45 0.5 1.4", ""), ("rust-sweater", "0.5 0.7 2.4", "more2")])
    also = ''.join([
        pcard(K("grey-hoodie"), "0.55 0.75 1.5", "هودي فليس رمادي", "قطن مُمشّط", "760", "950", "-20%", False, "3–10Y"),
        pcard(K("plaid-jacket"), "0.55 0.48 1.7", "جاكيت كاروه مبطّن", "صوف مخلوط", "1,450", None, "جديد", False, "2–6Y"),
        pcard(K("denim-jacket"), "0.48 0.72 1.5", "جاكيت جينز كلاسيكي", "دنيم ناعم", "1,290", None, None, True, "3–10Y"),
        pcard(K("knit-hat-green"), "0.55 0.5 1.4", "بدلة فليس شتوية", "فليس دافئ", "1,390", None, None, False, "1–4Y"),
    ])
    return f'''<div class="screen" style="padding-bottom:110px">{STATUS}
<div class="ptop"><div class="ibtn">{ic("arrow_forward")}</div><div class="hicons"><div class="ibtn">{ic("ios_share")}</div><div class="ibtn">{ic("favorite","fill")}</div></div></div>
{ph(K("rust-sweater"), "0.55 0.47 1.12", "gal", '<span class="gb">' + ic("eco") + 'صوف ميرينو</span><div class="gdots"><i class="on"></i><i></i><i></i><i></i><i></i></div><span class="gcnt">1 / 5</span>')}
<div class="thumbs">{ph(K("rust-sweater"), "0.55 0.45 1.3", "on")}{ph(K("rust-sweater"), "0.62 0.38 3.2", "")}{ph(K("rust-sweater"), "0.4 0.45 2.6", "")}{ph(K("cream-knit"), "0.6 0.45 1.6", "")}{ph(K("rust-sweater"), "0.5 0.6 1.6", "v", '<span>' + ic("play_circle") + '</span>')}</div>
<div class="pinfo">
<div class="brandl"><b>{ic("verified")}توتة · خط المواسم</b><span>كود TK-2041</span></div>
<h1>كنزة ميرينو بأزرار خشبية</h1><div class="sub">محبوكة بنعومة، دافئة دون أن تُثقل الحركة</div>
<div class="prow2"><div><div class="bigp">1,150 <small>{CUR}</small></div><div class="oldp"><s>1,450 {CUR}</s><span class="dc">-20%</span><span>وفّري 300 {CUR}</span></div></div>
<div class="rbox"><div class="r1">{ic("star","fill")}4.9</div><small>128 تقييماً</small></div></div></div>
<div class="inst"><span class="lg">قسّطي</span><span>ادفعي <b>288 {CUR}</b> شهرياً على 4 أشهر بدون فوائد</span></div>

<div class="vsec"><div class="vh"><b>اللون: <span>صدئ دافئ</span></b></div>
<div class="sws"><div class="swb on"><i style="background:#B4673E"></i><span>صدئ</span></div><div class="swb"><i style="background:#E9DFCF"></i><span>كريمي</span></div><div class="swb"><i style="background:#34405E"></i><span>كحلي</span></div><div class="swb"><i style="background:#8E9A78"></i><span>زيتوني</span></div></div></div>

<div class="vsec"><div class="vh"><b>المقاس حسب العمر: <span>{L("2–3")} سنوات</span></b><a>{ic("straighten")}دليل المقاسات</a></div>
<div class="sizes"><div><b>12–18M</b><small>86 سم</small></div><div><b>18–24M</b><small>92 سم</small></div><div class="on"><b>2–3Y</b><small>98 سم</small></div><div><b>3–4Y</b><small>104 سم</small></div><div class="off"><b>4–5Y</b><small>نفد</small></div></div>
<div class="fitbar">{ic("child_care")}<span>حسب ملف <b>ليلى</b> (98 سم): المقاس {L("2–3Y")} مناسب مع مساحة للنمو</span></div></div>

<div class="blk" style="margin-top:22px"><h4>جدول المقاسات <small>بالسنتيمتر</small></h4>
<div class="stbl">
<div class="r"><span>المقاس</span><span>العمر</span><span>الطول</span><span>الصدر</span></div>
<div class="r"><span>86</span><span>{L("12–18")} شهراً</span><span class="ltr">81–86</span><span>52</span></div>
<div class="r"><span>92</span><span>{L("18–24")} شهراً</span><span class="ltr">87–92</span><span>53</span></div>
<div class="r hl"><span>98</span><span>{L("2–3")} سنوات</span><span class="ltr">93–98</span><span>55</span></div>
<div class="r"><span>104</span><span>{L("3–4")} سنوات</span><span class="ltr">99–104</span><span>56</span></div>
<div class="r"><span>110</span><span>{L("4–5")} سنوات</span><span class="ltr">105–110</span><span>58</span></div>
</div>
<div class="snote">{ic("info")}<span>القصّة مريحة ومطابقة للمقاس. إن كان طفلك بين مقاسين اختاري الأكبر.</span></div></div>

<div class="blk"><h4>الخامة والأمان <small>مختبرة للبشرة الحساسة</small></h4>
<div class="fab2">{ph(K("cream-knit"), "0.6 0.42 1.8", "sw2")}<div class="comp">
<div class="cl">صوف ميرينو فائق النعومة <span>70%</span></div><div class="cb"><i style="width:70%;background:var(--accT)"></i><i style="width:30%;background:#8E9A78"></i></div>
<div class="cl">قطن عضوي <span>30%</span></div></div></div>
<div class="safe">
<div>{ic("verified_user")}<span><b>صبغات آمنة</b><small>خالية من الآزو والمعادن الثقيلة</small></span></div>
<div>{ic("radio_button_checked")}<span><b>أزرار مثبّتة</b><small>مختبرة ضد الشد والابتلاع</small></span></div>
<div>{ic("spa")}<span><b>لا يسبب الحكّة</b><small>ألياف 17.5 ميكرون</small></span></div>
<div>{ic("label_off")}<span><b>بدون ملصقات</b><small>طباعة ناعمة داخل الرقبة</small></span></div>
</div></div>

<div class="blk"><h4>العناية بالقطعة</h4>
<div class="care"><div>{ic("local_laundry_service")}<span>غسيل يدوي<br>30° درجة</span></div><div>{ic("block")}<span>بدون مُبيّض</span></div><div>{ic("dry")}<span>تجفيف مسطّح<br>في الظل</span></div><div>{ic("iron")}<span>كيّ بحرارة<br>منخفضة</span></div></div></div>

<div class="dlv">
<div class="dl">{ic("local_shipping")}<div><b>توصيل خلال 2–4 أيام</b><small>مجاني للطلبات فوق 1,500 {CUR} داخل القاهرة والجيزة</small></div></div>
<div class="dl">{ic("autorenew")}<div><b>استبدال المقاس مجاناً</b><small>خلال 30 يوماً، نستلمها من باب البيت</small></div></div>
<div class="dl">{ic("payments")}<div><b>الدفع عند الاستلام</b><small>أو بالبطاقة والمحافظ الإلكترونية</small></div></div>
</div>

<div class="acc">
<div class="ac"><div class="ah">الوصف{ic("remove")}</div><p>كنزة كلاسيكية بفتحة أزرار على الكتف لتسهيل اللبس، وأكمام مضلّعة تحافظ على شكلها بعد الغسيل. مثالية للمدرسة والنزهات.</p></div>
<div class="ac"><div class="ah">تفاصيل القطعة{ic("add")}</div></div>
<div class="ac"><div class="ah">الشحن والإرجاع{ic("add")}</div></div>
</div>

<div class="rv"><h4 style="font-size:17px;font-weight:700;display:flex;justify-content:space-between;align-items:center">آراء الأمهات <a style="font-size:12px;color:var(--accT);font-weight:600">كل الآراء</a></h4>
<div class="rvtop"><div class="rvbig"><b>4.9</b>{stars(5)}<small>128 تقييماً</small></div>
<div class="bars"><div class="bar">5<i><em style="width:88%"></em></i></div><div class="bar">4<i><em style="width:9%"></em></i></div><div class="bar">3<i><em style="width:2%"></em></i></div><div class="bar">2<i><em style="width:1%"></em></i></div><div class="bar">1<i><em style="width:0%"></em></i></div></div></div>
<div class="fitm"><div class="fh"><span>المقاس</span><b>مطابق للمقاس</b></div><div class="tr"><i></i></div><div class="tl"><span>صغير</span><span>مطابق</span><span>كبير</span></div></div>
<div class="rvph">{rv}</div>
<div class="rvq"><div class="who"><i>ن</i><div><b>نهى سامي</b><small>اشترت {L("2–3Y")} لطفل 3 سنوات</small></div>{stars(5)}</div>
<q>ناعمة جداً ولا تسبب حكة إطلاقاً، ابني يلبسها طول اليوم. اللون أجمل من الصور والأزرار ثابتة بعد عدة غسلات.</q><span class="vf">{ic("verified")}مشترية مؤكدة</span></div></div>

<div class="sec" style="margin-top:26px"><div class="shead"><div><h3>تليق معها</h3><div class="sub">أكملي الإطلالة ووفّري 10%</div></div></div>
<div class="gw">
<div class="gwi">{ph(K("pom-beanie"), "0.5 0.4 1.5", "gim")}<div class="gt"><b>قبعة صوف بكرة</b><small>{L("2–5Y")} · رمادي فاتح</small><span>320 <small>{CUR}</small></span></div><span class="ck">{ic("check")}</span></div>
<div class="gwi">{ph(K("knit-socks"), "0.45 0.5 1.3", "gim")}<div class="gt"><b>جوارب صوف مخططة</b><small>عبوة من 3 أزواج</small><span>190 <small>{CUR}</small></span></div><span class="ck">{ic("check")}</span></div>
<div class="gwi">{ph(K("mittens"), "0.28 0.8 1.9", "gim")}<div class="gt"><b>قفازات محبوكة</b><small>{L("2–5Y")} · رمادي</small><span>280 <small>{CUR}</small></span></div><span class="ck no">{ic("check")}</span></div>
<div class="gwb"><div class="t"><small>الكنزة + قطعتان</small><b>1,494 <small>{CUR}</small></b><s>1,660</s></div><span class="btn">{ic("add_shopping_cart")}أضيفي الثلاثة</span></div>
</div></div>

<div class="sec"><div class="shead"><div><h3>قد يعجبك أيضاً</h3></div><a>عرض الكل{ic("chevron_left")}</a></div>
<div class="hscroll prow">{also}</div></div>

<div class="sticky"><div class="sp"><small>المقاس {L("2–3Y")} · صدئ</small><b>1,150 <small>{CUR}</small></b></div><div class="qty">{ic("remove")}1{ic("add")}</div><div class="addcart">{ic("shopping_bag")}أضيفي للسلة</div></div>
</div>'''


SCREENS = {"home": home, "menu": menu, "listing": listing, "product": product}
