import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { FoodOrder, FoodOrderStatus, FoodRejection } from "../data/types";
import { asLang, deliver, type DeliveryNotifyDeps, type Words } from "../delivery/notify";
import { foodOrderReference } from "./service";

/**
 * 105.1 What the customer and the restaurant are told: the customer when
 * their order moves to another stage (`food_order_update`), the
 * restaurant's staff when a new order reaches it (`restaurant_order`).
 * Each goes to the person's inbox and phones, in their language or the
 * app's.
 */

type Text = Record<Lang, (ref: string, restaurant: string, extra: string) => Words>;

const REJECTIONS: Record<FoodRejection, Record<Lang, string>> = {
  closing: { en: "The restaurant is closing.", ar: "المطعم على وشك الإغلاق.", tr: "Restoran kapanıyor." },
  too_busy: { en: "The restaurant is too busy right now.", ar: "المطعم مشغول جدًا الآن.", tr: "Restoran şu an çok yoğun." },
  item_unavailable: { en: "Something you ordered isn't available.", ar: "صنف من طلبك غير متوفر.", tr: "Siparişinizdeki bir ürün yok." },
  other: { en: "The restaurant couldn't take it.", ar: "لم يتمكن المطعم من قبوله.", tr: "Restoran siparişi alamadı." },
};

const CUSTOMER: Partial<Record<FoodOrderStatus, Text>> = {
  placed: {
    en: (ref, r) => ({ title: "Your order was sent", body: `${ref} reached ${r}. We'll tell you when they accept it.` }),
    ar: (ref, r) => ({ title: "تم إرسال طلبك", body: `وصل ${ref} إلى ${r}. سنخبرك حين يقبله.` }),
    tr: (ref, r) => ({ title: "Siparişiniz gönderildi", body: `${ref}, ${r} restoranına ulaştı. Kabul edince size haber vereceğiz.` }),
  },
  accepted: {
    en: (ref, r, at) => ({ title: "Your order is being prepared", body: `${r} accepted ${ref}. Ready around ${at}.` }),
    ar: (ref, r, at) => ({ title: "طلبك قيد التحضير", body: `قبل ${r} الطلب ${ref}. يجهز نحو ${at}.` }),
    tr: (ref, r, at) => ({ title: "Siparişiniz hazırlanıyor", body: `${r}, ${ref} siparişini kabul etti. Yaklaşık ${at} hazır olur.` }),
  },
  picked_up: {
    en: (ref, r) => ({ title: "Your order was picked up", body: `The courier has ${ref} from ${r}.` }),
    ar: (ref, r) => ({ title: "استلم المندوب طلبك", body: `المندوب استلم ${ref} من ${r}.` }),
    tr: (ref, r) => ({ title: "Siparişiniz alındı", body: `Kurye ${ref} siparişini ${r} restoranından aldı.` }),
  },
  on_the_way: {
    en: (ref) => ({ title: "Your order is on the way", body: `${ref} is on its way to you.` }),
    ar: (ref) => ({ title: "طلبك في الطريق", body: `${ref} في الطريق إليك.` }),
    tr: (ref) => ({ title: "Siparişiniz yolda", body: `${ref} size doğru yolda.` }),
  },
  delivered: {
    en: (ref, r) => ({ title: "Enjoy your meal", body: `${ref} was delivered. Rate ${r} in the app.` }),
    ar: (ref, r) => ({ title: "بالهنا والشفا", body: `تم تسليم ${ref}. قيّم ${r} من التطبيق.` }),
    tr: (ref, r) => ({ title: "Afiyet olsun", body: `${ref} teslim edildi. ${r} restoranını uygulamada değerlendirin.` }),
  },
  rejected: {
    en: (ref, r, why) => ({ title: "Your order wasn't accepted", body: `${r} couldn't take ${ref}. ${why}` }),
    ar: (ref, r, why) => ({ title: "لم يُقبل طلبك", body: `لم يتمكن ${r} من قبول ${ref}. ${why}` }),
    tr: (ref, r, why) => ({ title: "Siparişiniz kabul edilmedi", body: `${r}, ${ref} siparişini alamadı. ${why}` }),
  },
  cancelled: {
    en: (ref) => ({ title: "Order cancelled", body: `${ref} was cancelled.` }),
    ar: (ref) => ({ title: "تم إلغاء الطلب", body: `تم إلغاء ${ref}.` }),
    tr: (ref) => ({ title: "Sipariş iptal edildi", body: `${ref} iptal edildi.` }),
  },
  failed: {
    en: (ref) => ({ title: "We couldn't deliver your order", body: `${ref} couldn't be delivered. We'll get in touch with you.` }),
    ar: (ref) => ({ title: "تعذّر توصيل طلبك", body: `تعذّر توصيل ${ref}. سنتواصل معك.` }),
    tr: (ref) => ({ title: "Siparişiniz teslim edilemedi", body: `${ref} teslim edilemedi. Sizinle iletişime geçeceğiz.` }),
  },
};

const RESTAURANT: Record<Lang, (ref: string, total: string) => Words> = {
  en: (ref, items) => ({ title: "New order", body: `${ref}: ${items}. Accept it in the app.` }),
  ar: (ref, items) => ({ title: "طلب جديد", body: `${ref}: ${items}. اقبله من التطبيق.` }),
  tr: (ref, items) => ({ title: "Yeni sipariş", body: `${ref}: ${items}. Uygulamada kabul edin.` }),
};

/** "14:30" in the company's time zone. */
function clock(at: Date | null, timezone: string): string {
  return at ? new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at) : "";
}

/** Tells the customer their order moved to its status; returns the phones reached. */
export async function tellFoodCustomer(deps: DeliveryNotifyDeps, order: FoodOrder, timezone: string): Promise<number> {
  const text = CUSTOMER[order.status];
  if (!text || order.userId === null) return 0;
  const lang = asLang(order.lang) ?? (await appLang(deps.store, deps.app.id));
  const extra = order.status === "rejected" ? REJECTIONS[order.rejection?.reason ?? "other"][lang] : clock(order.readyAt, timezone);
  const words = text[lang](foodOrderReference(order), order.restaurantName, extra);
  return deliver(deps, order.userId, words, { type: "food_order_update", food_order_id: String(order.id) }, true);
}

/** Tells the restaurant's active staff of a new order; returns the phones reached. */
export async function tellRestaurant(deps: DeliveryNotifyDeps, order: FoodOrder): Promise<number> {
  if (order.restaurantId === null) return 0;
  const staff = (await deps.store.listRestaurantStaff(deps.app.id, order.restaurantId)).filter((s) => s.active);
  const appLanguage = await appLang(deps.store, deps.app.id);
  const items = order.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ").slice(0, 120);
  let pushed = 0;
  for (const person of staff) {
    const user = person.phone ? await deps.store.getHostedUserByPhone(deps.app.id, person.phone) : person.email ? await deps.store.getHostedEmailUser(deps.app.id, person.email) : null;
    if (!user) continue;
    const devices = await deps.store.listHostedPushDevices(deps.app.id, [user.id]);
    const lang = asLang(devices[0]?.language) ?? appLanguage;
    pushed += await deliver(deps, user.id, RESTAURANT[lang](foodOrderReference(order), items), { type: "restaurant_order", food_order_id: String(order.id) }, false);
  }
  return pushed;
}
