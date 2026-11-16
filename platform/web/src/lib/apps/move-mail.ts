import { COMPANY } from "../company";
import { LANG_INFO, type Lang } from "@/i18n/config";

/**
 * 132.113 The emails of moving an app to another account, in the owner's
 * language: the approval request to the account the app leaves (its code,
 * what moves, the link to approve), the short "done" email to that account,
 * and the one telling the other account an app was added to it.
 *
 * Built for real inboxes: tables and inline styles, 600 px wide and
 * stacking on phones, Outlook's conditional table, a hidden preview line,
 * `color-scheme` with colours that read in light and dark (the clients that
 * apply their own dark colours get the dark ones below), and right to left
 * in Arabic, with the code and the emails kept left to right. Yallapp's
 * logo comes from its own address (`assetBase`, public/email), like the
 * campaign emails'; the footer names yallapp.com.tr only.
 */

export type MoveMailKind = "approval" | "moved_out" | "added";

export interface MoveMailAccount {
  name: string;
  email: string;
}

export interface MoveMailInput {
  kind: MoveMailKind;
  lang: Lang;
  /** Where /email/yallapp-logo-reversed.png is: Yallapp's address. */
  assetBase: string;
  app: { name: string; iconUrl: string | null; colour: string };
  from: MoveMailAccount;
  to: MoveMailAccount;
  /** The app's customers, orders, bookings and messages go with it. */
  data: boolean;
  /** Its plan and renewal go with it. */
  subscription: boolean;
  /** The team member moving it. */
  member: string;
  /** 132.115 Only the app's plan moves, to this other app: the plan's words instead of the app's. */
  plan?: { toApp: string; name?: string; until?: string; next?: string | null };
  /** approval: the 6-digit code and the page to approve or decline on. */
  code?: string;
  reviewUrl?: string;
  minutes?: number;
  /** moved_out and added: when it moved, and the dashboard's address. */
  at?: Date;
  dashboardUrl?: string;
}

export interface MoveMail {
  subject: string;
  html: string;
  text: string;
}

type Words = {
  eyebrow: Record<MoveMailKind, string>;
  subject: Record<MoveMailKind, string>;
  preview: Record<MoveMailKind, string>;
  title: Record<MoveMailKind, string>;
  intro: Record<MoveMailKind, string>;
  from: string;
  to: string;
  data: string;
  subscription: string;
  moves: string;
  stays: string;
  dataMoves: string;
  dataStays: string;
  subMoves: string;
  subStays: string;
  invoices: string;
  codeLabel: string;
  expires: string;
  button: Record<MoveMailKind, string>;
  orCode: string;
  safetyTitle: string;
  safety: string;
  movedOn: string;
  doneNote: Record<"moved_out" | "added", string>;
  /** 132.115 Moving only a plan. */
  plan: {
    eyebrow: Record<MoveMailKind, string>;
    subject: Record<MoveMailKind, string>;
    preview: Record<MoveMailKind, string>;
    title: Record<MoveMailKind, string>;
    intro: Record<MoveMailKind, string>;
    label: string;
    until: string;
    leaves: string;
    arrives: string;
    invoices: string;
  };
};

const WORDS: Record<Lang, Words> = {
  en: {
    eyebrow: { approval: "App move request", moved_out: "App moved", added: "App added" },
    subject: {
      approval: "Approve moving {app} to another account",
      moved_out: "{app} moved to another account",
      added: "{app} was added to your Yallapp account",
    },
    preview: {
      approval: "Your approval code is inside. It expires in {minutes} minutes.",
      moved_out: "{app} is now in another account.",
      added: "{app} is now in your account.",
    },
    title: { approval: "Approve moving your app", moved_out: "Your app has moved", added: "An app was added to your account" },
    intro: {
      approval: "{member} from the Yallapp team is moving {app} out of your account. Nothing moves until you approve it.",
      moved_out: "{app} has left your account. It is now in {to}'s account.",
      added: "The Yallapp team moved {app} into your account from {from}'s account.",
    },
    from: "From",
    to: "To",
    data: "Data",
    subscription: "Subscription",
    moves: "Moves",
    stays: "Stays",
    dataMoves: "Its customers, orders, bookings and messages go with the app.",
    dataStays: "Its customers, orders, bookings and messages stay in the account it leaves, archived and readable.",
    subMoves: "Its plan and its renewal go to the new account.",
    subStays: "The account it leaves keeps the plan. The app starts in the new account without one.",
    invoices: "Past invoices stay with whoever paid them.",
    codeLabel: "Your approval code",
    expires: "Expires in {minutes} minutes",
    button: { approval: "Review and approve", moved_out: "Open your dashboard", added: "Open it in your dashboard" },
    orCode: "You can also give this code to the Yallapp team member who is moving your app with you.",
    safetyTitle: "Keep this code to yourself",
    safety: "Only give this code to the Yallapp team member who is moving your app with you. If you didn't ask for this, don't share the code and contact Yallapp support.",
    movedOn: "Moved on {date}.",
    doneNote: {
      moved_out: "If you didn't expect this, contact Yallapp support.",
      added: "You can find it in your app switcher. If you didn't expect this, contact Yallapp support.",
    },
    plan: {
      eyebrow: { approval: "Plan move request", moved_out: "Plan moved", added: "Plan added" },
      subject: { approval: "Move your plan from {app} to {toApp}", moved_out: "Your plan moved from {app} to {toApp}", added: "A plan was added to {toApp}" },
      preview: { approval: "Your approval code is inside. It expires in {minutes} minutes.", moved_out: "The plan of {app} is now on {toApp}.", added: "{toApp} has a plan now." },
      title: { approval: "Approve moving your plan", moved_out: "Your plan has moved", added: "A plan was added to your app" },
      intro: {
        approval: "{member} from the Yallapp team is moving the plan of {app} to {toApp}. Nothing moves until you approve it.",
        moved_out: "The plan of {app} is now on {toApp}.",
        added: "The Yallapp team moved a plan to {toApp} from {from}'s account.",
      },
      label: "Plan",
      until: "Until",
      leaves: "{app} goes back to having no plan, like a new app.",
      arrives: "{toApp} gets the plan with the same end date and renewal.",
      invoices: "Past invoices stay where they are.",
    },
  },
  ar: {
    eyebrow: { approval: "طلب نقل تطبيق", moved_out: "نُقل التطبيق", added: "أُضيف تطبيق" },
    subject: {
      approval: "وافِق على نقل {app} إلى حساب آخر",
      moved_out: "نُقل {app} إلى حساب آخر",
      added: "أُضيف {app} إلى حسابك في Yallapp",
    },
    preview: {
      approval: "رمز الموافقة في هذه الرسالة، وتنتهي صلاحيته خلال {minutes} دقيقة.",
      moved_out: "أصبح {app} في حساب آخر.",
      added: "أصبح {app} في حسابك.",
    },
    title: { approval: "وافِق على نقل تطبيقك", moved_out: "نُقل تطبيقك", added: "أُضيف تطبيق إلى حسابك" },
    intro: {
      approval: "يعمل {member} من فريق Yallapp على نقل {app} من حسابك، ولن يُنقل أي شيء قبل موافقتك.",
      moved_out: "غادر {app} حسابك، وأصبح الآن في حساب {to}.",
      added: "نقل فريق Yallapp التطبيق {app} إلى حسابك من حساب {from}.",
    },
    from: "من",
    to: "إلى",
    data: "البيانات",
    subscription: "الاشتراك",
    moves: "تُنقل",
    stays: "تبقى",
    dataMoves: "ينتقل عملاؤه وطلباته وحجوزاته ورسائله مع التطبيق.",
    dataStays: "يبقى عملاؤه وطلباته وحجوزاته ورسائله في الحساب الذي يغادره، مؤرشفةً ومتاحةً للاطلاع.",
    subMoves: "تنتقل خطته وتجديدها إلى الحساب الجديد.",
    subStays: "يحتفظ الحساب الذي يغادره بالخطة، ويبدأ التطبيق في الحساب الجديد من دون خطة.",
    invoices: "تبقى الفواتير السابقة لدى من دفعها.",
    codeLabel: "رمز الموافقة",
    expires: "تنتهي صلاحيته خلال {minutes} دقيقة",
    button: { approval: "راجِع ووافِق", moved_out: "افتح لوحة التحكم", added: "افتحه في لوحة التحكم" },
    orCode: "يمكنك أيضًا إعطاء هذا الرمز لعضو فريق Yallapp الذي ينقل تطبيقك معك.",
    safetyTitle: "احتفظ بهذا الرمز لنفسك",
    safety: "لا تُعطِ هذا الرمز إلا لعضو فريق Yallapp الذي ينقل تطبيقك معك. وإن لم تطلب ذلك، فلا تشارك الرمز وتواصل مع دعم Yallapp.",
    movedOn: "نُقل في {date}.",
    doneNote: {
      moved_out: "إن لم تكن تتوقع ذلك، فتواصل مع دعم Yallapp.",
      added: "ستجده في قائمة تطبيقاتك. وإن لم تكن تتوقع ذلك، فتواصل مع دعم Yallapp.",
    },
    plan: {
      eyebrow: { approval: "طلب نقل خطة", moved_out: "نُقلت الخطة", added: "أُضيفت خطة" },
      subject: { approval: "انقل خطتك من {app} إلى {toApp}", moved_out: "نُقلت خطتك من {app} إلى {toApp}", added: "أُضيفت خطة إلى {toApp}" },
      preview: { approval: "رمز الموافقة في هذه الرسالة، وتنتهي صلاحيته خلال {minutes} دقيقة.", moved_out: "أصبحت خطة {app} على {toApp}.", added: "أصبح لدى {toApp} خطة الآن." },
      title: { approval: "وافِق على نقل خطتك", moved_out: "نُقلت خطتك", added: "أُضيفت خطة إلى تطبيقك" },
      intro: {
        approval: "يعمل {member} من فريق Yallapp على نقل خطة {app} إلى {toApp}، ولن يُنقل أي شيء قبل موافقتك.",
        moved_out: "أصبحت خطة {app} الآن على {toApp}.",
        added: "نقل فريق Yallapp خطةً إلى {toApp} من حساب {from}.",
      },
      label: "الخطة",
      until: "حتى",
      leaves: "يعود {app} بلا خطة، مثل أي تطبيق جديد.",
      arrives: "يحصل {toApp} على الخطة بتاريخ الانتهاء والتجديد نفسيهما.",
      invoices: "تبقى الفواتير السابقة في مكانها.",
    },
  },
  tr: {
    eyebrow: { approval: "Uygulama taşıma isteği", moved_out: "Uygulama taşındı", added: "Uygulama eklendi" },
    subject: {
      approval: "{app} uygulamasının başka bir hesaba taşınmasını onaylayın",
      moved_out: "{app} başka bir hesaba taşındı",
      added: "{app} Yallapp hesabınıza eklendi",
    },
    preview: {
      approval: "Onay kodunuz içeride. {minutes} dakika geçerlidir.",
      moved_out: "{app} artık başka bir hesapta.",
      added: "{app} artık sizin hesabınızda.",
    },
    title: { approval: "Uygulamanızın taşınmasını onaylayın", moved_out: "Uygulamanız taşındı", added: "Hesabınıza bir uygulama eklendi" },
    intro: {
      approval: "Yallapp ekibinden {member}, {app} uygulamasını hesabınızdan taşıyor. Siz onaylamadan hiçbir şey taşınmaz.",
      moved_out: "{app} hesabınızdan ayrıldı. Artık {to} adlı kişinin hesabında.",
      added: "Yallapp ekibi {app} uygulamasını {from} adlı kişinin hesabından sizin hesabınıza taşıdı.",
    },
    from: "Nereden",
    to: "Nereye",
    data: "Veriler",
    subscription: "Abonelik",
    moves: "Taşınır",
    stays: "Kalır",
    dataMoves: "Müşterileri, siparişleri, randevuları ve mesajları uygulamayla birlikte gider.",
    dataStays: "Müşterileri, siparişleri, randevuları ve mesajları ayrıldığı hesapta arşivlenmiş ve okunabilir olarak kalır.",
    subMoves: "Planı ve yenilemesi yeni hesaba geçer.",
    subStays: "Plan, ayrıldığı hesapta kalır. Uygulama yeni hesapta plansız başlar.",
    invoices: "Geçmiş faturalar, ödeyen kişide kalır.",
    codeLabel: "Onay kodunuz",
    expires: "{minutes} dakika geçerlidir",
    button: { approval: "İncele ve onayla", moved_out: "Panelinizi açın", added: "Panelinizde açın" },
    orCode: "Bu kodu, uygulamanızı sizinle birlikte taşıyan Yallapp ekip üyesine de verebilirsiniz.",
    safetyTitle: "Bu kodu kimseyle paylaşmayın",
    safety: "Bu kodu yalnızca uygulamanızı sizinle birlikte taşıyan Yallapp ekip üyesine verin. Bunu siz istemediyseniz kodu paylaşmayın ve Yallapp desteğiyle iletişime geçin.",
    movedOn: "Taşınma tarihi: {date}.",
    doneNote: {
      moved_out: "Bunu beklemiyorsanız Yallapp desteğiyle iletişime geçin.",
      added: "Uygulama değiştiricinizde bulabilirsiniz. Bunu beklemiyorsanız Yallapp desteğiyle iletişime geçin.",
    },
    plan: {
      eyebrow: { approval: "Plan taşıma isteği", moved_out: "Plan taşındı", added: "Plan eklendi" },
      subject: { approval: "Planınızı {app} uygulamasından {toApp} uygulamasına taşıyın", moved_out: "Planınız {app} uygulamasından {toApp} uygulamasına taşındı", added: "{toApp} uygulamasına bir plan eklendi" },
      preview: { approval: "Onay kodunuz içeride. {minutes} dakika geçerlidir.", moved_out: "{app} uygulamasının planı artık {toApp} üzerinde.", added: "{toApp} artık bir plana sahip." },
      title: { approval: "Planınızın taşınmasını onaylayın", moved_out: "Planınız taşındı", added: "Uygulamanıza bir plan eklendi" },
      intro: {
        approval: "Yallapp ekibinden {member}, {app} uygulamasının planını {toApp} uygulamasına taşıyor. Siz onaylamadan hiçbir şey taşınmaz.",
        moved_out: "{app} uygulamasının planı artık {toApp} üzerinde.",
        added: "Yallapp ekibi, {from} adlı kişinin hesabından {toApp} uygulamasına bir plan taşıdı.",
      },
      label: "Plan",
      until: "Bitiş",
      leaves: "{app}, yeni bir uygulama gibi plansız kalır.",
      arrives: "{toApp}, planı aynı bitiş tarihi ve yenilemeyle alır.",
      invoices: "Geçmiş faturalar oldukları yerde kalır.",
    },
  },
};

/** The words of this email in this language (also for the approval page and the tests). */
export function moveWords(lang: Lang): Words {
  return WORDS[lang];
}

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "");

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** The colours, light first; the dark ones go in the style block for the clients that apply them. */
const C = {
  page: "#F4EFE6",
  card: "#FFFFFF",
  band: "#0E0D24",
  ink: "#0E0D24",
  muted: "#5B5873",
  line: "#E8E1D3",
  soft: "#F8F4EC",
  ember: "#FF5A1F",
  emberText: "#C2410C",
  movesBg: "#E3F2E9",
  movesInk: "#14532D",
  staysBg: "#EEEAE2",
  staysInk: "#3F3C55",
};

const SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const ARABIC = "Tahoma, 'Segoe UI', 'Geeza Pro', 'Noto Sans Arabic', Arial, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace";

function head(title: string): string {
  return (
    `<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="x-apple-disable-message-reformatting" />` +
    `<meta name="color-scheme" content="light dark" /><meta name="supported-color-schemes" content="light dark" /><title>${esc(title)}</title>` +
    `<!--[if mso]><style type="text/css">table,td,div,p,a,span{font-family:Arial,sans-serif !important;}</style><![endif]-->` +
    `<style type="text/css">
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;width:100% !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;}
@media only screen and (max-width:620px){
.ym-wrap{width:100% !important;}
.ym-px{padding-left:22px !important;padding-right:22px !important;}
.ym-band{padding-left:22px !important;padding-right:22px !important;}
.ym-col{display:block !important;width:100% !important;max-width:100% !important;box-sizing:border-box;}
.ym-side{display:none !important;max-height:0 !important;overflow:hidden !important;}
.ym-down{display:block !important;max-height:none !important;}
.ym-title{font-size:25px !important;line-height:32px !important;}
.ym-code{font-size:30px !important;letter-spacing:8px !important;}
td.ym-first{padding-bottom:4px !important;}
td.ym-second{padding-top:4px !important;}
}
@media (prefers-color-scheme:dark){
.ym-page{background-color:#0B0A1C !important;}
.ym-card{background-color:#17162F !important;}
.ym-ink{color:#F4EFE6 !important;}
.ym-muted{color:#B3AFCB !important;}
.ym-soft{background-color:#221F3E !important;border-color:#363260 !important;}
.ym-line{border-color:#363260 !important;}
.ym-moves{background-color:#123524 !important;color:#9FE6BD !important;}
.ym-stays{background-color:#2A2747 !important;color:#DAD6EE !important;}
.ym-btn{background-color:#F4EFE6 !important;}
.ym-btn a{color:#0E0D24 !important;}
.ym-link{color:#FF8A5B !important;}
.ym-note{background-color:#221F3E !important;}
}
[data-ogsc] .ym-ink{color:#F4EFE6 !important;}
[data-ogsc] .ym-muted{color:#B3AFCB !important;}
[data-ogsb] .ym-page{background-color:#0B0A1C !important;}
[data-ogsb] .ym-card{background-color:#17162F !important;}
[data-ogsb] .ym-soft{background-color:#221F3E !important;}
</style></head>`
  );
}

function preheader(text: string): string {
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(text)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>`;
}

/** The app's icon, or its first letter on its colour when it has none. */
function appMark(app: MoveMailInput["app"]): string {
  const colour = /^#[0-9a-f]{6}$/i.test(app.colour) ? app.colour : C.ink;
  if (app.iconUrl) {
    return `<img src="${esc(app.iconUrl)}" width="56" height="56" alt="${esc(app.name)}" style="display:block;width:56px;height:56px;border-radius:14px;border:1px solid ${C.line};" />`;
  }
  const letter = esc(Array.from(app.name.trim())[0]?.toUpperCase() ?? "A");
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td width="56" height="56" align="center" valign="middle" bgcolor="${colour}" style="width:56px;height:56px;border-radius:14px;background-color:${colour};color:#FFFFFF;font-size:24px;font-weight:800;line-height:56px;" aria-hidden="true">${letter}</td></tr></table>`;
}

function pill(label: string, value: string, moves: boolean, font: string): string {
  const bg = moves ? C.movesBg : C.staysBg;
  const ink = moves ? C.movesInk : C.staysInk;
  return `<span class="ym-pill ${moves ? "ym-moves" : "ym-stays"}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border-radius:999px;background-color:${bg};color:${ink};font-family:${font};font-size:14px;line-height:18px;font-weight:700;white-space:nowrap;">${esc(label)}: ${esc(value)}</span>`;
}

function account(label: string, who: MoveMailAccount, align: "left" | "right", font: string): string {
  return (
    `<div class="ym-muted" style="font-family:${font};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};text-align:${align};">${esc(label)}</div>` +
    `<div class="ym-ink" style="padding-top:6px;font-family:${font};font-size:17px;line-height:23px;font-weight:700;color:${C.ink};text-align:${align};">${esc(who.name)}</div>` +
    `<div class="ym-muted" dir="ltr" style="padding-top:2px;font-family:${SANS};font-size:14px;line-height:20px;color:${C.muted};text-align:${align};overflow-wrap:break-word;">${esc(who.email).replace("@", "<wbr>@").replace(/\./g, ".<wbr>")}</div>`
  );
}

/** One of the emails of moving an app, ready to send. */
export function moveMail(input: MoveMailInput): MoveMail {
  const w = WORDS[input.lang];
  const dir = LANG_INFO[input.lang].dir;
  const rtl = dir === "rtl";
  const start = rtl ? "right" : "left";
  const end = rtl ? "left" : "right";
  const font = rtl ? ARABIC : SANS;
  const base = input.assetBase.replace(/\/+$/, "");
  const minutes = String(input.minutes ?? 15);
  const date = input.at ? new Intl.DateTimeFormat(input.lang === "en" ? "en-GB" : LANG_INFO[input.lang].intl, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Istanbul" }).format(input.at) : "";
  const plan = input.plan ?? null;
  const values = { app: input.app.name, member: input.member, from: input.from.name, to: input.to.name, minutes, date, toApp: plan?.toApp ?? "" };
  const words = plan ? w.plan : w;
  const subject = fill(words.subject[input.kind], values);
  const title = words.title[input.kind];
  const intro = fill(words.intro[input.kind], values);
  const button = w.button[input.kind];
  const href = input.kind === "approval" ? (input.reviewUrl ?? "") : (input.dashboardUrl ?? "");
  const arrow = rtl ? "&larr;" : "&rarr;";
  const site = COMPANY.website;
  const p = (text: string, style = "") => `<p class="ym-ink" style="margin:0;font-family:${font};font-size:16px;line-height:26px;color:${C.ink};text-align:${start};${style}">${text}</p>`;
  const strongApp = `<strong>${esc(input.app.name)}</strong>`;
  const introHtml = esc(intro).replace(esc(input.app.name), strongApp);

  const fromTo =
    `<table role="presentation" class="ym-soft" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${C.soft}" style="width:100%;background-color:${C.soft};border:1px solid ${C.line};border-radius:16px;">` +
    `<tr><td class="ym-col ym-first" width="44%" valign="top" style="width:44%;padding:20px 20px 20px 20px;">${account(w.from, input.from, start, font)}</td>` +
    `<td class="ym-side" width="12%" align="center" valign="middle" style="width:12%;padding:0 4px;font-family:${SANS};font-size:26px;line-height:26px;font-weight:700;color:${C.emberText};" aria-hidden="true"><span class="ym-link" style="color:${C.emberText};">${arrow}</span></td>` +
    `<td class="ym-col ym-second" width="44%" valign="top" style="width:44%;padding:20px 20px 20px 20px;">` +
    `<!--[if !mso]><!--><div class="ym-down" style="display:none;max-height:0;overflow:hidden;padding:0 0 12px 0;font-family:${SANS};font-size:22px;line-height:22px;font-weight:700;color:${C.emberText};text-align:${start};" aria-hidden="true"><span class="ym-link" style="color:${C.emberText};">&darr;</span></div><!--<![endif]-->` +
    `${account(w.to, input.to, start, font)}</td></tr></table>`;

  const pills = plan
    ? // 132.115 A plan moving: the plan and its end, and what each app is after.
      `<div style="padding-top:20px;text-align:${start};" dir="${dir}">${plan.name ? pill(w.plan.label, plan.name, true, font) : ""}${plan.until ? pill(w.plan.until, plan.until, false, font) : ""}</div>` +
      `<div class="ym-muted" style="padding-top:4px;font-family:${font};font-size:14px;line-height:22px;color:${C.muted};text-align:${start};">${plan.next ? `${esc(plan.next)}<br />` : ""}${esc(fill(w.plan.leaves, values))}<br />${esc(fill(w.plan.arrives, values))}<br />${esc(w.plan.invoices)}</div>`
    : `<div style="padding-top:20px;text-align:${start};" dir="${dir}">${pill(w.data, input.data ? w.moves : w.stays, input.data, font)}${pill(w.subscription, input.subscription ? w.moves : w.stays, input.subscription, font)}</div>` +
      `<div class="ym-muted" style="padding-top:4px;font-family:${font};font-size:14px;line-height:22px;color:${C.muted};text-align:${start};">${esc(input.data ? w.dataMoves : w.dataStays)}<br />${esc(input.subscription ? w.subMoves : w.subStays)}<br />${esc(w.invoices)}</div>`;

  const code =
    input.kind === "approval" && input.code
      ? `<tr><td class="ym-px" style="padding:28px 40px 0 40px;">` +
        `<table role="presentation" class="ym-soft" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${C.soft}" style="width:100%;background-color:${C.soft};border:1px solid ${C.line};border-radius:18px;">` +
        `<tr><td align="center" style="padding:24px 16px 22px 16px;">` +
        `<div class="ym-muted" style="font-family:${font};font-size:13px;line-height:18px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">${esc(w.codeLabel)}</div>` +
        `<div class="ym-ink ym-code" dir="ltr" style="padding:12px 0 10px 12px;font-family:${MONO};font-size:40px;line-height:48px;font-weight:700;letter-spacing:12px;color:${C.ink};">${esc(input.code)}</div>` +
        `<div class="ym-muted" style="font-family:${font};font-size:14px;line-height:20px;color:${C.muted};">${esc(fill(w.expires, values))}</div>` +
        `</td></tr></table></td></tr>`
      : "";

  const cta = href
    ? `<tr><td class="ym-px" align="center" style="padding:28px 40px 0 40px;">` +
      `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${esc(href)}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="24%" stroke="f" fillcolor="${C.band}"><w:anchorlock/><center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${esc(button)}</center></v:roundrect><![endif]-->` +
      `<!--[if !mso]><!--><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td class="ym-btn" bgcolor="${C.band}" style="border-radius:12px;background-color:${C.band};">` +
      `<a href="${esc(href)}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${font};font-size:16px;line-height:20px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">${esc(button)}</a>` +
      `</td></tr></table><!--<![endif]-->` +
      (input.kind === "approval" ? `<div class="ym-muted" style="padding-top:14px;font-family:${font};font-size:14px;line-height:21px;color:${C.muted};text-align:center;">${esc(w.orCode)}</div>` : "") +
      `</td></tr>`
    : "";

  const note =
    input.kind === "approval"
      ? `<tr><td class="ym-px" style="padding:28px 40px 0 40px;">` +
        `<table role="presentation" class="ym-note" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFF6F0" style="width:100%;background-color:#FFF6F0;border-radius:12px;border-${start}:4px solid ${C.ember};">` +
        `<tr><td style="padding:16px 18px;">` +
        `<div class="ym-ink" style="font-family:${font};font-size:15px;line-height:22px;font-weight:700;color:${C.ink};text-align:${start};">${esc(w.safetyTitle)}</div>` +
        `<div class="ym-muted" style="padding-top:4px;font-family:${font};font-size:14px;line-height:22px;color:${C.muted};text-align:${start};">${esc(w.safety)}</div>` +
        `</td></tr></table></td></tr>`
      : `<tr><td class="ym-px" style="padding:22px 40px 0 40px;"><div class="ym-muted" style="font-family:${font};font-size:14px;line-height:22px;color:${C.muted};text-align:${start};">${esc(fill(w.movedOn, values))} ${esc(w.doneNote[input.kind])}</div></td></tr>`;

  const html =
    `<!DOCTYPE html>\n<html lang="${input.lang}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">` +
    head(subject) +
    `<body class="ym-page" dir="${dir}" style="margin:0;padding:0;background-color:${C.page};" bgcolor="${C.page}">` +
    preheader(fill(words.preview[input.kind], values)) +
    `<table role="presentation" class="ym-page" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background-color:${C.page};"><tr><td align="center" style="padding:32px 12px 28px 12px;">` +
    `<!--[if mso]><table role="presentation" width="600" align="center" border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->` +
    `<table role="presentation" class="ym-wrap" width="600" border="0" cellpadding="0" cellspacing="0" dir="${dir}" style="width:100%;max-width:600px;">` +
    // The header band: the logo on Midnight in both modes, the email's kind at the other end.
    `<tr><td class="ym-band" bgcolor="${C.band}" style="background-color:${C.band};border-radius:20px 20px 0 0;padding:26px 40px;">` +
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>` +
    `<td align="${start}" valign="middle"><a href="${esc(site)}" target="_blank" style="text-decoration:none;"><img src="${esc(base)}/email/yallapp-logo-reversed.png" width="99" height="32" alt="${COMPANY.name}" style="display:block;width:99px;height:32px;" /></a></td>` +
    `<td align="${end}" valign="middle" style="font-family:${font};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C9C4DE;">${esc(words.eyebrow[input.kind])}</td>` +
    `</tr></table></td></tr>` +
    `<tr><td height="4" bgcolor="${C.ember}" style="height:4px;line-height:4px;font-size:0;background-color:${C.ember};">&nbsp;</td></tr>` +
    // The card.
    `<tr><td class="ym-card" bgcolor="${C.card}" style="background-color:${C.card};border-radius:0 0 20px 20px;padding:0 0 36px 0;">` +
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" dir="${dir}">` +
    `<tr><td class="ym-px" style="padding:36px 40px 0 40px;">` +
    `<h1 class="ym-ink ym-title" style="margin:0;font-family:${font};font-size:30px;line-height:38px;font-weight:800;letter-spacing:${rtl ? "0" : "-0.02em"};color:${C.ink};text-align:${start};">${esc(title)}</h1>` +
    `</td></tr>` +
    `<tr><td class="ym-px" style="padding:14px 40px 0 40px;">${p(introHtml)}</td></tr>` +
    // The app.
    `<tr><td class="ym-px" style="padding:24px 40px 0 40px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0" dir="${dir}"><tr>` +
    `<td valign="middle" style="padding-${end}:14px;">${appMark(input.app)}</td>` +
    `<td valign="middle"><div class="ym-ink" style="font-family:${font};font-size:19px;line-height:25px;font-weight:800;color:${C.ink};text-align:${start};">${esc(input.app.name)}</div></td>` +
    `</tr></table></td></tr>` +
    `<tr><td class="ym-px" style="padding:20px 40px 0 40px;">${fromTo}${pills}</td></tr>` +
    code +
    cta +
    note +
    `</table></td></tr>` +
    // The footer: Yallapp's address, nothing else.
    `<tr><td align="center" style="padding:22px 20px 0 20px;"><a class="ym-muted" href="${esc(site)}" target="_blank" style="font-family:${SANS};font-size:13px;line-height:18px;font-weight:700;color:${C.muted};text-decoration:none;">yallapp.com.tr</a></td></tr>` +
    `</table>` +
    `<!--[if mso]></td></tr></table><![endif]-->` +
    `</td></tr></table></body></html>`;

  const lines = [
    title,
    "",
    intro,
    "",
    `${w.from}: ${input.from.name} <${input.from.email}>`,
    `${w.to}: ${input.to.name} <${input.to.email}>`,
    ...(plan
      ? [...(plan.name ? [`${w.plan.label}: ${plan.name}${plan.until ? ` · ${w.plan.until} ${plan.until}` : ""}`] : []), ...(plan.next ? [plan.next] : []), fill(w.plan.leaves, values), fill(w.plan.arrives, values), w.plan.invoices]
      : [`${w.data}: ${input.data ? w.moves : w.stays}. ${input.data ? w.dataMoves : w.dataStays}`, `${w.subscription}: ${input.subscription ? w.moves : w.stays}. ${input.subscription ? w.subMoves : w.subStays}`, w.invoices]),
    "",
    ...(input.kind === "approval" && input.code ? [`${w.codeLabel}: ${input.code}`, fill(w.expires, values), ""] : []),
    ...(href ? [`${button}: ${href}`, ""] : []),
    ...(input.kind === "approval" ? [w.safety] : [`${fill(w.movedOn, values)} ${w.doneNote[input.kind]}`]),
    "",
    site,
  ];
  return { subject, html, text: lines.join("\n") };
}
