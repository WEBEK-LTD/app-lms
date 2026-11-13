import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import { formatCents } from "../catalog/money";
import type { TravelAlert, TravelBooking, TravelFlight } from "../data/types";
import { asLang, deliver, type DeliveryNotifyDeps, type Words } from "../delivery/notify";

/**
 * 126 What travellers are told on their phones and in their inbox
 * (`travel_update`): a booking confirmed or cancelled by the company, a
 * flight's status, gate or time changed by the company, a price alert gone
 * down (`travel_alert`). In the person's language or the app's.
 */

const BOOKING: Record<"confirmed" | "cancelled", Record<Lang, (ref: string) => Words>> = {
  confirmed: {
    en: (ref) => ({ title: "Your booking is confirmed", body: `${ref} is confirmed. Your trip is in the app.` }),
    ar: (ref) => ({ title: "تم تأكيد حجزك", body: `تم تأكيد الحجز ${ref}. تجد رحلتك في التطبيق.` }),
    tr: (ref) => ({ title: "Rezervasyonunuz onaylandı", body: `${ref} onaylandı. Seyahatiniz uygulamada.` }),
  },
  cancelled: {
    en: (ref) => ({ title: "Booking cancelled", body: `${ref} was cancelled. Anything paid is refunded to you.` }),
    ar: (ref) => ({ title: "تم إلغاء الحجز", body: `تم إلغاء الحجز ${ref}، وسيُرد إليك ما دفعته.` }),
    tr: (ref) => ({ title: "Rezervasyon iptal edildi", body: `${ref} iptal edildi. Ödediğiniz tutar size iade edilir.` }),
  },
};

const FLIGHT: Record<Lang, { status: Record<string, string>; gate: (g: string) => string; time: (t: string) => string }> = {
  en: {
    status: { on_time: "is on time", delayed: "is delayed", boarding: "is boarding", departed: "has left", landed: "has landed", cancelled: "is cancelled", scheduled: "is scheduled" },
    gate: (g) => `Gate ${g}`,
    time: (t) => `now leaves at ${t}`,
  },
  ar: {
    status: { on_time: "في موعدها", delayed: "متأخرة", boarding: "بدأ الصعود إليها", departed: "أقلعت", landed: "هبطت", cancelled: "أُلغيت", scheduled: "مجدولة" },
    gate: (g) => `البوابة ${g}`,
    time: (t) => `تُقلع الآن الساعة ${t}`,
  },
  tr: {
    status: { on_time: "zamanında", delayed: "rötarlı", boarding: "biniş başladı", departed: "kalktı", landed: "indi", cancelled: "iptal edildi", scheduled: "planlandı" },
    gate: (g) => `Kapı ${g}`,
    time: (t) => `artık ${t} saatinde kalkıyor`,
  },
};

async function langOf(deps: DeliveryNotifyDeps, code: string | null): Promise<Lang> {
  return asLang(code) ?? (await appLang(deps.store, deps.app.id));
}

/** The booking confirmed (paid) or cancelled by the company; returns the phones reached. */
export async function tellBooking(deps: DeliveryNotifyDeps, booking: TravelBooking, what: "confirmed" | "cancelled"): Promise<number> {
  if (booking.userId === null) return 0;
  const words = BOOKING[what][await langOf(deps, booking.lang)](booking.reference);
  return deliver(deps, booking.userId, words, { type: "travel_update", booking_id: String(booking.id) }, true);
}

/** A flight's status, gate or time the company changed, to everyone booked on it. */
export async function tellFlight(deps: DeliveryNotifyDeps, flight: TravelFlight, before: TravelFlight, bookings: readonly TravelBooking[]): Promise<number> {
  const changed = flight.status !== before.status || flight.gate !== before.gate || flight.delayedDeparts !== before.delayedDeparts || flight.statusNote !== before.statusNote;
  if (!changed) return 0;
  let reached = 0;
  const told = new Set<number>();
  for (const booking of bookings) {
    if (booking.userId === null || told.has(booking.userId)) continue;
    told.add(booking.userId);
    const lang = await langOf(deps, booking.lang);
    const w = FLIGHT[lang];
    const parts = [flight.status !== before.status ? w.status[flight.status] : null, flight.gate && flight.gate !== before.gate ? w.gate(flight.gate) : null, flight.delayedDeparts && flight.delayedDeparts !== before.delayedDeparts ? w.time(flight.delayedDeparts.slice(11)) : null].filter(Boolean);
    const body = [parts.length ? `${flight.number} ${parts.join(" · ")}` : flight.number, flight.statusNote].filter(Boolean).join(". ");
    reached += await deliver(deps, booking.userId, { title: `${flight.from.code} → ${flight.to.code}`, body }, { type: "travel_update", booking_id: String(booking.id), flight_id: String(flight.id) }, true);
  }
  return reached;
}

const DROP: Record<Lang, (route: string, by: string, now: string) => Words> = {
  en: (route, by, now) => ({ title: `${route} dropped ${by}`, body: `Your price alert: now from ${now}.` }),
  ar: (route, by, now) => ({ title: `انخفض سعر ${route} بمقدار ${by}`, body: `تنبيه السعر: الآن ابتداءً من ${now}.` }),
  tr: (route, by, now) => ({ title: `${route} ${by} düştü`, body: `Fiyat alarmınız: şimdi ${now} başlayan fiyatlarla.` }),
};

/** A price alert gone down since the person was last told. */
export async function tellAlert(deps: DeliveryNotifyDeps, alert: TravelAlert, route: string, beforeCents: number, nowCents: number, currency: Parameters<typeof formatCents>[1]): Promise<number> {
  const lang = await appLang(deps.store, deps.app.id);
  const words = DROP[lang](route, formatCents(beforeCents - nowCents, currency), formatCents(nowCents, currency));
  return deliver(deps, alert.userId, words, { type: "travel_alert", alert_id: String(alert.id) }, false);
}
