import type { Lang } from "@/i18n/config";
import { STAGE_REASON } from "../hosted/auto-notifications";
import type { CatalogOrder, DeliveryStage, FailedNextStep, OrderStageEntry } from "../data/types";
import { deliveryDayLabel, slotLabel } from "../selling/delivery";

/**
 * 132 A store order's delivery stage as the apps read it: the owner's (the
 * Owner API, for Yallapp Business: the whole history with who, why and the
 * team's note) and the customer's (the app's Order: where it is now, the new
 * day, a short reason and what's next; never the team's note nor who did
 * it). The words are the apps' (Modern Standard Arabic); the apps show
 * their own for the codes they know.
 */

const pick = (lang: string): Lang => (lang === "ar" || lang === "tr" ? lang : "en");

export const STAGE_WORDS: Record<Lang, Record<DeliveryStage, string>> = {
  en: { preparing: "Preparing", shipped: "Out for delivery", postponed: "Delivery postponed", failed: "Delivery failed", returned: "Returned to shop", delivered: "Delivered" },
  ar: { preparing: "قيد التجهيز", shipped: "خرج للتوصيل", postponed: "تم تأجيل التوصيل", failed: "تعذّر التوصيل", returned: "أُعيد إلى المتجر", delivered: "تم التوصيل" },
  tr: { preparing: "Hazırlanıyor", shipped: "Dağıtımda", postponed: "Teslimat ertelendi", failed: "Teslimat başarısız", returned: "Mağazaya döndü", delivered: "Teslim edildi" },
};

/** Why, as the team chose it. */
export const STAGE_REASON_WORDS: Record<Lang, Record<string, string>> = {
  en: {
    customer_asked: "Customer asked",
    recipient_away: "Recipient not available",
    shop_asked: "Shop asked",
    weather: "Weather",
    wrong_address: "Wrong or incomplete address",
    refused: "Recipient refused",
    unreachable: "Couldn't reach by phone",
    other: "Other",
  },
  ar: {
    customer_asked: "طلب العميل",
    recipient_away: "المستلم غير متاح",
    shop_asked: "بطلب من المتجر",
    weather: "الطقس",
    wrong_address: "العنوان خاطئ أو ناقص",
    refused: "رفض المستلم الاستلام",
    unreachable: "تعذّر الوصول بالهاتف",
    other: "سبب آخر",
  },
  tr: {
    customer_asked: "Müşteri istedi",
    recipient_away: "Alıcı müsait değil",
    shop_asked: "Mağaza istedi",
    weather: "Hava durumu",
    wrong_address: "Adres yanlış veya eksik",
    refused: "Alıcı teslim almadı",
    unreachable: "Telefonla ulaşılamadı",
    other: "Diğer",
  },
};

/** What happens after a failed attempt, as the team chose it. */
export const NEXT_STEP_WORDS: Record<Lang, Record<FailedNextStep, string>> = {
  en: { retry: "Try again on another day", return: "Return to shop", cancel: "Cancel the order" },
  ar: { retry: "المحاولة مجددًا في يوم آخر", return: "الإعادة إلى المتجر", cancel: "إلغاء الطلب" },
  tr: { retry: "Başka bir gün tekrar dene", return: "Mağazaya geri gönder", cancel: "Siparişi iptal et" },
};

/** What happens after a failed attempt, as the customer reads it. */
const CUSTOMER_NEXT: Record<Lang, Record<FailedNextStep, string>> = {
  en: { retry: "We'll try again", return: "It's going back to the shop, which will contact you", cancel: "The order was cancelled" },
  ar: { retry: "سنحاول التوصيل مجددًا", return: "سيعود الطلب إلى المتجر، وسيتواصل معك", cancel: "تم إلغاء الطلب" },
  tr: { retry: "Tekrar deneyeceğiz", return: "Sipariş mağazaya dönüyor; mağaza sizinle iletişime geçecek", cancel: "Sipariş iptal edildi" },
};

const upperFirst = (s: string) => (s ? s[0]!.toLocaleUpperCase() + s.slice(1) : s);

function slotJson(slot: OrderStageEntry["slot"]) {
  return slot ? { id: slot.id, start: slot.start, end: slot.end, label: slotLabel(slot) } : null;
}

/** The latest entry for the order's current stage. */
function current(order: Pick<CatalogOrder, "deliveryStage" | "stageLog">): OrderStageEntry | null {
  if (!order.deliveryStage) return null;
  return [...(order.stageLog ?? [])].reverse().find((e) => e.stage === order.deliveryStage) ?? null;
}

/** One change, for the owner: who, when, why, the team's note and what it set. */
export function ownerStageEntryJson(e: OrderStageEntry, lang: string) {
  const l = pick(lang);
  return {
    stage: e.stage,
    label: STAGE_WORDS[l][e.stage],
    at: e.at,
    by: e.by?.name ?? null,
    reason: e.reason ? { code: e.reason, label: STAGE_REASON_WORDS[l][e.reason] ?? e.reason } : null,
    note: e.note,
    courier: e.courier,
    tracking_url: e.trackingUrl,
    date: e.date,
    date_label: e.date ? deliveryDayLabel(e.date, l) : null,
    slot: slotJson(e.slot),
    next_step: e.next ? { code: e.next, label: NEXT_STEP_WORDS[l][e.next] } : null,
  };
}

/** `Order.stage` in the Owner API: where the delivery is now; null before its first stage. */
export function ownerStageJson(order: Pick<CatalogOrder, "deliveryStage" | "stageLog">, lang: string) {
  const e = current(order);
  return e ? ownerStageEntryJson(e, lang) : null;
}

/** `Order.stage_history` in the Owner API: every change, newest first. */
export function ownerStageHistoryJson(order: Pick<CatalogOrder, "stageLog">, lang: string) {
  return [...(order.stageLog ?? [])].reverse().map((e) => ownerStageEntryJson(e, lang));
}

/**
 * `Order.stage` in the app's API: where the delivery is, for its customer.
 * The reason in the customer's words ("other" says none), never the team's
 * note nor who did it; the courier a shipped order's, to call.
 */
export function appStageJson(order: Pick<CatalogOrder, "deliveryStage" | "stageLog" | "status">, lang: string | null | undefined) {
  const e = current(order);
  if (!e) return null;
  const l = pick(lang ?? "en");
  const reason = e.reason ? STAGE_REASON[l][e.reason] : undefined;
  return {
    code: e.stage,
    label: STAGE_WORDS[l][e.stage],
    at: e.at,
    reason: reason ? (l === "ar" ? reason : upperFirst(reason)) : null,
    date: e.date,
    slot: slotJson(e.slot),
    next_step: e.next ? { code: e.next, label: CUSTOMER_NEXT[l][e.next] } : null,
    courier: e.stage === "shipped" ? e.courier : null,
    tracking_url: e.stage === "shipped" ? e.trackingUrl : null,
  };
}
