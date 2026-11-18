import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { MarketClubMember, MarketClubPlan, MarketComplaint, MarketOrder, MarketOrderStatus, PushAudience } from "../data/types";
import { asLang, deliver, type DeliveryNotifyDeps, type Words } from "../delivery/notify";
import { deliverySettingsOf } from "../delivery/settings";
import { appUrl } from "../env";
import { clubPayLink } from "./club";
import { complaintReference, marketOrderReference } from "./json";
import { marketSettingsOf, marketTimezone } from "./settings";

/**
 * 115.22 What the marketplace's people are told, each to their inbox and
 * their phones (lib/delivery/notify.ts `deliver`), in their language:
 * - the customer, when their order moves to another stage
 *   (`market_order_update`, opening the order; phones that turned order
 *   updates off get the inbox only);
 * - the vendor's active staff, when a new order reaches the vendor, and when
 *   an order for later is released to it (`vendor_order`, opening it in the
 *   vendor's screens: the vendor app's phones when the app has one, else the
 *   customers' app's Vendor tab);
 * - the customer, when support answers or decides one of their complaints
 *   (`complaint_update`, opening it);
 * - the member who keeps their club plan, 3 days before its paid period ends
 *   and on its last day (`club_renewal`, opening the club; once each, nothing
 *   charged yet).
 * Pushes never fail what caused them: the inbox has them either way.
 */

type OrderText = Record<Lang, (ref: string, vendor: string, extra: string) => Words>;

/** Why the vendor turned it down, as the customer reads it. */
const REJECTIONS: Record<string, Record<Lang, string>> = {
  closing: { en: "The place is closing.", ar: "المكان على وشك الإغلاق.", tr: "İşletme kapanıyor." },
  too_busy: { en: "The place is too busy right now.", ar: "المكان مشغول جدًا الآن.", tr: "İşletme şu an çok yoğun." },
  items_unavailable: { en: "Some of what you ordered isn't available.", ar: "بعض ما طلبته غير متوفر.", tr: "Siparişinizdeki bazı ürünler yok." },
  outside_area: { en: "Your address is outside its delivery area.", ar: "عنوانك خارج منطقة التوصيل.", tr: "Adresiniz teslimat bölgesinin dışında." },
  other: { en: "The place couldn't take it.", ar: "لم يتمكن المكان من قبوله.", tr: "İşletme siparişi alamadı." },
};

const CUSTOMER: Partial<Record<MarketOrderStatus | "picked", OrderText>> = {
  scheduled: {
    en: (ref, v, at) => ({ title: "Your order is booked", body: `${ref} from ${v} is booked for ${at}. We'll tell you when they start on it.` }),
    ar: (ref, v, at) => ({ title: "تم حجز طلبك", body: `حُجز ${ref} من ${v} لموعد ${at}. سنخبرك حين يبدأ تحضيره.` }),
    tr: (ref, v, at) => ({ title: "Siparişiniz planlandı", body: `${v} siparişiniz ${ref}, ${at} için planlandı. Hazırlanmaya başlayınca haber vereceğiz.` }),
  },
  placed: {
    en: (ref, v) => ({ title: "Your order was sent", body: `${ref} reached ${v}. We'll tell you when they accept it.` }),
    ar: (ref, v) => ({ title: "تم إرسال طلبك", body: `وصل ${ref} إلى ${v}. سنخبرك حين يقبله.` }),
    tr: (ref, v) => ({ title: "Siparişiniz gönderildi", body: `${ref}, ${v} işletmesine ulaştı. Kabul edince size haber vereceğiz.` }),
  },
  accepted: {
    en: (ref, v, at) => ({ title: "Your order is being prepared", body: `${v} accepted ${ref}. Ready around ${at}.` }),
    ar: (ref, v, at) => ({ title: "طلبك قيد التحضير", body: `قبل ${v} الطلب ${ref}. يجهز نحو ${at}.` }),
    tr: (ref, v, at) => ({ title: "Siparişiniz hazırlanıyor", body: `${v}, ${ref} siparişini kabul etti. Yaklaşık ${at} hazır olur.` }),
  },
  picking: {
    en: (ref, v, at) => ({ title: "Your order is being picked", body: `${v} accepted ${ref} and is picking it. Ready around ${at}.` }),
    ar: (ref, v, at) => ({ title: "يجري تجهيز طلبك", body: `قبل ${v} الطلب ${ref} ويجهّز أصنافه. يجهز نحو ${at}.` }),
    tr: (ref, v, at) => ({ title: "Siparişiniz toplanıyor", body: `${v}, ${ref} siparişini kabul etti ve topluyor. Yaklaşık ${at} hazır olur.` }),
  },
  picked: {
    en: (ref, v) => ({ title: "Your order changed while it was picked", body: `${v} weighed, swapped or left out some of ${ref}. See the new total in the app.` }),
    ar: (ref, v) => ({ title: "تغيّر طلبك أثناء تجهيزه", body: `وزن ${v} بعض أصناف ${ref} أو استبدلها أو استبعدها. اطّلع على الإجمالي الجديد في التطبيق.` }),
    tr: (ref, v) => ({ title: "Siparişiniz toplanırken değişti", body: `${v}, ${ref} siparişindeki bazı ürünleri tarttı, değiştirdi ya da çıkardı. Yeni toplamı uygulamada görün.` }),
  },
  ready: {
    en: (ref, v) => ({ title: "Your order is ready", body: `${ref} is ready at ${v}.` }),
    ar: (ref, v) => ({ title: "طلبك جاهز", body: `${ref} جاهز لدى ${v}.` }),
    tr: (ref, v) => ({ title: "Siparişiniz hazır", body: `${ref}, ${v} işletmesinde hazır.` }),
  },
  on_the_way: {
    en: (ref) => ({ title: "Your order is on the way", body: `${ref} is on its way to you.` }),
    ar: (ref) => ({ title: "طلبك في الطريق", body: `${ref} في الطريق إليك.` }),
    tr: (ref) => ({ title: "Siparişiniz yolda", body: `${ref} size doğru yolda.` }),
  },
  delivered: {
    en: (ref, v) => ({ title: "Your order was delivered", body: `${ref} was delivered. Rate ${v} in the app.` }),
    ar: (ref, v) => ({ title: "تم توصيل طلبك", body: `تم تسليم ${ref}. قيّم ${v} من التطبيق.` }),
    tr: (ref, v) => ({ title: "Siparişiniz teslim edildi", body: `${ref} teslim edildi. ${v} işletmesini uygulamada değerlendirin.` }),
  },
  picked_up: {
    en: (ref, v) => ({ title: "Picked up", body: `You picked up ${ref}. Rate ${v} in the app.` }),
    ar: (ref, v) => ({ title: "تم الاستلام", body: `استلمت ${ref}. قيّم ${v} من التطبيق.` }),
    tr: (ref, v) => ({ title: "Teslim alındı", body: `${ref} siparişini teslim aldınız. ${v} işletmesini uygulamada değerlendirin.` }),
  },
  rejected: {
    en: (ref, v, why) => ({ title: "Your order wasn't accepted", body: `${v} couldn't take ${ref}. ${why}` }),
    ar: (ref, v, why) => ({ title: "لم يُقبل طلبك", body: `لم يتمكن ${v} من قبول ${ref}. ${why}` }),
    tr: (ref, v, why) => ({ title: "Siparişiniz kabul edilmedi", body: `${v}, ${ref} siparişini alamadı. ${why}` }),
  },
  cancelled: {
    en: (ref) => ({ title: "Order cancelled", body: `${ref} was cancelled.` }),
    ar: (ref) => ({ title: "تم إلغاء الطلب", body: `تم إلغاء ${ref}.` }),
    tr: (ref) => ({ title: "Sipariş iptal edildi", body: `${ref} iptal edildi.` }),
  },
};

const VENDOR: Record<"new" | "released", Record<Lang, (ref: string, items: string, at: string) => Words>> = {
  new: {
    en: (ref, items) => ({ title: "New order", body: `${ref}: ${items}. Accept it in the app.` }),
    ar: (ref, items) => ({ title: "طلب جديد", body: `${ref}: ${items}. اقبله من التطبيق.` }),
    tr: (ref, items) => ({ title: "Yeni sipariş", body: `${ref}: ${items}. Uygulamada kabul edin.` }),
  },
  released: {
    en: (ref, items, at) => ({ title: "An order for later is due", body: `${ref} for ${at}: ${items}. Accept it in the app.` }),
    ar: (ref, items, at) => ({ title: "حان وقت طلب مجدول", body: `${ref} لموعد ${at}: ${items}. اقبله من التطبيق.` }),
    tr: (ref, items, at) => ({ title: "Planlanmış bir siparişin zamanı geldi", body: `${at} için ${ref}: ${items}. Uygulamada kabul edin.` }),
  },
};

const COMPLAINT: Record<"reply" | "decision", Record<Lang, (ref: string, text: string) => Words>> = {
  reply: {
    en: (ref, text) => ({ title: "Support answered your complaint", body: `${ref}: ${text}` }),
    ar: (ref, text) => ({ title: "ردّ الدعم على شكواك", body: `${ref}: ${text}` }),
    tr: (ref, text) => ({ title: "Destek şikâyetinizi yanıtladı", body: `${ref}: ${text}` }),
  },
  decision: {
    en: (ref, text) => ({ title: "We decided on your complaint", body: `${ref}: ${text}` }),
    ar: (ref, text) => ({ title: "صدر قرار بشأن شكواك", body: `${ref}: ${text}` }),
    tr: (ref, text) => ({ title: "Şikâyetiniz sonuçlandı", body: `${ref}: ${text}` }),
  },
};

const CLUB: Record<"soon" | "today", Record<Lang, (plan: string, end: string) => Words>> = {
  soon: {
    en: (plan, end) => ({ title: "Your club membership ends soon", body: `${plan} ends on ${end}. Renew it in the app to keep its delivery benefit.` }),
    ar: (plan, end) => ({ title: "تنتهي عضويتك في النادي قريبًا", body: `تنتهي ${plan} في ${end}. جدّدها من التطبيق لتحتفظ بميزة التوصيل.` }),
    tr: (plan, end) => ({ title: "Kulüp üyeliğiniz yakında bitiyor", body: `${plan} ${end} tarihinde bitiyor. Teslimat avantajını korumak için uygulamada yenileyin.` }),
  },
  today: {
    en: (plan, end) => ({ title: "Your club membership ends today", body: `${plan} ends today at ${end}. Renew it in the app to keep its delivery benefit.` }),
    ar: (plan, end) => ({ title: "تنتهي عضويتك في النادي اليوم", body: `تنتهي ${plan} اليوم الساعة ${end}. جدّدها من التطبيق لتحتفظ بميزة التوصيل.` }),
    tr: (plan, end) => ({ title: "Kulüp üyeliğiniz bugün bitiyor", body: `${plan} bugün ${end} saatinde bitiyor. Teslimat avantajını korumak için uygulamada yenileyin.` }),
  },
};

/** The reminders before a club plan's paid period ends: 3 days before, and on its last day. */
export const CLUB_REMINDERS = [
  { key: "soon", before: 3 * 86_400_000 },
  { key: "today", before: 86_400_000 },
] as const;

async function timezoneOf(store: DataStore, appId: string): Promise<string> {
  return marketTimezone(deliverySettingsOf(await store.getDeliverySettings(appId)));
}

/** "14:30" in the app's time zone. */
function clock(at: Date | null, timezone: string): string {
  return at ? new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at) : "";
}

/** "21 Nov 14:30" (a day and a time) in the app's time zone, in the reader's language. */
function dayAndTime(at: Date, timezone: string, lang: Lang): string {
  const day = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : lang === "en" ? "en-GB" : lang, { timeZone: timezone, day: "numeric", month: "short" }).format(at);
  return `${day} ${clock(at, timezone)}`;
}

/** The person's language: the one they used, else their phone's, else the app's. */
async function langOf(deps: DeliveryNotifyDeps, userId: number, known: string | null | undefined, audience: PushAudience = "customers"): Promise<Lang> {
  const own = asLang(known);
  if (own) return own;
  const devices = await deps.store.listHostedPushDevices(deps.app.id, [userId], audience);
  return asLang(devices[0]?.language) ?? (await appLang(deps.store, deps.app.id));
}

async function safely(send: () => Promise<number>): Promise<number> {
  try {
    return await send();
  } catch (error) {
    console.error("[market] notify", error instanceof Error ? error.message : String(error));
    return 0;
  }
}

/** Tells the customer their order moved to its stage (`picked`: picking changed it); returns the phones reached. */
export async function tellMarketCustomer(deps: DeliveryNotifyDeps, order: MarketOrder, moment: MarketOrderStatus | "picked" = order.status): Promise<number> {
  const text = CUSTOMER[moment];
  if (!text || order.userId === null) return 0;
  const userId = order.userId;
  return safely(async () => {
    const lang = await langOf(deps, userId, order.lang);
    const timezone = await timezoneOf(deps.store, deps.app.id);
    const extra =
      moment === "rejected"
        ? (REJECTIONS[order.rejection?.reason ?? "other"] ?? REJECTIONS.other!)[lang]
        : moment === "scheduled"
          ? order.scheduledFor
            ? dayAndTime(order.scheduledFor, timezone, lang)
            : ""
          : clock(order.readyAt, timezone);
    const words = text[lang](marketOrderReference(order), order.vendorName, extra);
    return deliver(deps, userId, words, { type: "market_order_update", market_order_id: String(order.id) }, true);
  });
}

/** The vendor's active staff with an account in the app. */
async function vendorPeople(store: DataStore, appId: string, vendorId: number): Promise<number[]> {
  const people = new Set<number>();
  for (const person of (await store.listRestaurantStaff(appId, vendorId)).filter((s) => s.active)) {
    const user = person.phone ? await store.getHostedUserByPhone(appId, person.phone) : person.email ? await store.getHostedEmailUser(appId, person.email) : null;
    if (user) people.add(user.id);
  }
  return [...people];
}

/** Tells the vendor's staff a new order reached it (`released`: an order for later is due now); returns the phones reached. */
export async function tellVendor(deps: DeliveryNotifyDeps, order: MarketOrder, kind: "new" | "released"): Promise<number> {
  if (order.vendorId === null) return 0;
  const vendorId = order.vendorId;
  return safely(async () => {
    const settings = deliverySettingsOf(await deps.store.getDeliverySettings(deps.app.id));
    // 115.16 The vendor app's phones when the app has one; the customers' app's Vendor tab otherwise.
    const audience: PushAudience = marketSettingsOf(settings).vendorApp === "bundle" ? "second" : "customers";
    const timezone = marketTimezone(settings);
    const items = order.lines
      .map((l) => `${l.unit === "item" ? `${l.quantity}×` : `${l.quantity} ${l.unit}`} ${l.name}${l.choices.length ? ` (${l.choices.join(", ")})` : ""}`)
      .join(", ")
      .slice(0, 120);
    let pushed = 0;
    for (const userId of await vendorPeople(deps.store, deps.app.id, vendorId)) {
      const lang = await langOf(deps, userId, null, audience);
      const at = order.scheduledFor ? dayAndTime(order.scheduledFor, timezone, lang) : "";
      pushed += await deliver(deps, userId, VENDOR[kind][lang](marketOrderReference(order), items, at), { type: "vendor_order", market_order_id: String(order.id) }, false, audience);
    }
    return pushed;
  });
}

/** Tells the customer support answered (`reply`) or decided (`decision`) their complaint, with what support wrote; returns the phones reached. */
export async function tellComplaint(deps: DeliveryNotifyDeps, complaint: MarketComplaint, kind: "reply" | "decision"): Promise<number> {
  if (complaint.userId === null) return 0;
  const userId = complaint.userId;
  const said = [...complaint.messages].reverse().find((m) => m.from === "support");
  return safely(async () => {
    const order = await deps.store.getMarketOrder(deps.app.id, complaint.orderId);
    const lang = await langOf(deps, userId, order?.lang);
    const words = COMPLAINT[kind][lang](complaintReference(complaint), said?.text ?? "");
    return deliver(deps, userId, words, { type: "complaint_update", complaint_id: String(complaint.id) }, true);
  });
}

/**
 * 115.22 The club's reminders: each member whose paid period ends within 3
 * days (or within the day) is told once per period end, in their language.
 * Nothing is charged: they renew in the app. Taken once per member, period
 * and reminder (claimAutoNotice), so two runs at once tell them once.
 */
export async function remindClubRenewals(deps: DeliveryNotifyDeps, now: Date): Promise<number> {
  const { store, app } = deps;
  const plans = new Map<number, MarketClubPlan | null>();
  const timezone = await timezoneOf(store, app.id);
  let told = 0;
  // Members who cancelled chose to let it end: only those who keep it are reminded.
  for (let offset = 0; ; offset += 500) {
    const { items } = await store.listMarketClubMembers(app.id, { status: "active", limit: 500, offset });
    for (const m of items) if (await remindOne(deps, m, plans, timezone, now)) told++;
    if (items.length < 500) break;
  }
  return told;
}

async function remindOne(deps: DeliveryNotifyDeps, m: MarketClubMember, plans: Map<number, MarketClubPlan | null>, timezone: string, now: Date): Promise<boolean> {
  if (!m.paidUntil || m.planId === null) return false;
  const left = m.paidUntil.getTime() - now.getTime();
  if (left <= 0) return false;
  // The latest reminder due (the last day's over the 3 days').
  const due = [...CLUB_REMINDERS].reverse().find((r) => left <= r.before);
  if (!due) return false;
  if (!plans.has(m.planId)) plans.set(m.planId, await deps.store.getMarketClubPlan(deps.app.id, m.planId));
  const plan = plans.get(m.planId);
  if (!plan) return false;
  if (!(await deps.store.claimAutoNotice({ appId: deps.app.id, kind: "club_renewal", ref: `${m.id}:${m.paidUntil.toISOString()}:${due.key}`, userId: m.userId, now }))) return false;
  // The 3 days' reminder isn't sent after the last day's (a late first run).
  if (due.key === "today") await deps.store.claimAutoNotice({ appId: deps.app.id, kind: "club_renewal", ref: `${m.id}:${m.paidUntil.toISOString()}:soon`, userId: m.userId, now });
  await safely(async () => {
    const lang = await langOf(deps, m.userId, null);
    const end = due.key === "today" ? clock(m.paidUntil, timezone) : dayAndTime(m.paidUntil!, timezone, lang);
    // 115.62 D6: with its payment link on the app's payment page (every gateway the app has), at the owner's price; paid, the period runs from its end.
    const url = plan.price > 0 ? await clubPayLink(deps.store, { appId: deps.app.id, platformUrl: appUrl(), userId: m.userId, lang, plan }, now) : null;
    return deliver(deps, m.userId, CLUB[due.key][lang](plan.name, end), { type: "club_renewal", plan_id: String(plan.id), ...(url ? { url } : {}) }, true);
  });
  return true;
}
