import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { App, Courier, Shipment, ShipmentStatus } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { pushTarget, sendPush, type ServiceAccount } from "../hosted/push";
import { shipmentReference } from "./service";

/**
 * 104 What the customer and the couriers are told: the customer when their
 * shipment moves to another stage (`shipment_update`), a courier when a job
 * is given to them, or, when couriers take jobs themselves, when a new one
 * waits (`courier_job`). Each goes to the person's inbox and to their phones
 * (the customer's that allow order updates), in the customer's language or
 * the app's.
 */

export interface DeliveryNotifyDeps {
  store: DataStore;
  app: App;
  account: ServiceAccount | null;
  now: Date;
  send?: typeof sendPush;
}

type Words = { title: string; body: string };

const CUSTOMER: Partial<Record<ShipmentStatus, Record<Lang, (ref: string, courier: string) => Words>>> = {
  pending: {
    en: (ref) => ({ title: "We got your shipment", body: `${ref} is waiting for a courier. We'll tell you when one is on the way.` }),
    ar: (ref) => ({ title: "استلمنا شحنتك", body: `${ref} بانتظار مندوب. سنخبرك حين يكون في الطريق.` }),
    tr: (ref) => ({ title: "Gönderiniz alındı", body: `${ref} bir kurye bekliyor. Kurye yola çıkınca size haber vereceğiz.` }),
  },
  assigned: {
    en: (ref, courier) => ({ title: "A courier has your shipment", body: `${courier} is coming to pick up ${ref}.` }),
    ar: (ref, courier) => ({ title: "مندوب في طريقه إليك", body: `${courier} في الطريق لاستلام ${ref}.` }),
    tr: (ref, courier) => ({ title: "Gönderiniz bir kuryede", body: `${courier}, ${ref} gönderisini almaya geliyor.` }),
  },
  picked_up: {
    en: (ref) => ({ title: "Your parcel was picked up", body: `${ref} is with the courier.` }),
    ar: (ref) => ({ title: "تم استلام الطرد", body: `${ref} مع المندوب الآن.` }),
    tr: (ref) => ({ title: "Paketiniz alındı", body: `${ref} kuryede.` }),
  },
  on_the_way: {
    en: (ref) => ({ title: "Your parcel is on the way", body: `${ref} is on its way to the drop-off.` }),
    ar: (ref) => ({ title: "الطرد في الطريق", body: `${ref} في الطريق إلى مكان التسليم.` }),
    tr: (ref) => ({ title: "Paketiniz yolda", body: `${ref} teslimat adresine gidiyor.` }),
  },
  delivered: {
    en: (ref) => ({ title: "Delivered", body: `${ref} was delivered. Thank you for sending with us.` }),
    ar: (ref) => ({ title: "تم التسليم", body: `تم تسليم ${ref}. شكرًا لثقتك بنا.` }),
    tr: (ref) => ({ title: "Teslim edildi", body: `${ref} teslim edildi. Bizi tercih ettiğiniz için teşekkürler.` }),
  },
  failed: {
    en: (ref) => ({ title: "We couldn't deliver your parcel", body: `${ref} couldn't be delivered. We'll get in touch with you.` }),
    ar: (ref) => ({ title: "تعذّر تسليم الطرد", body: `تعذّر تسليم ${ref}. سنتواصل معك.` }),
    tr: (ref) => ({ title: "Paketiniz teslim edilemedi", body: `${ref} teslim edilemedi. Sizinle iletişime geçeceğiz.` }),
  },
  cancelled: {
    en: (ref) => ({ title: "Shipment cancelled", body: `${ref} was cancelled.` }),
    ar: (ref) => ({ title: "تم إلغاء الشحنة", body: `تم إلغاء ${ref}.` }),
    tr: (ref) => ({ title: "Gönderi iptal edildi", body: `${ref} iptal edildi.` }),
  },
};

const COURIER: Record<"given" | "waiting", Record<Lang, (ref: string, place: string) => Words>> = {
  given: {
    en: (ref, place) => ({ title: "New job for you", body: `${ref}: pick it up at ${place}.` }),
    ar: (ref, place) => ({ title: "مهمة جديدة لك", body: `${ref}: الاستلام من ${place}.` }),
    tr: (ref, place) => ({ title: "Size yeni bir iş", body: `${ref}: ${place} adresinden alın.` }),
  },
  waiting: {
    en: (ref, place) => ({ title: "A new job is waiting", body: `${ref} from ${place}. Take it in the app.` }),
    ar: (ref, place) => ({ title: "مهمة جديدة بانتظار مندوب", body: `${ref} من ${place}. استلمها من التطبيق.` }),
    tr: (ref, place) => ({ title: "Yeni bir iş bekliyor", body: `${place} adresinden ${ref}. Uygulamadan alın.` }),
  },
};

const asLang = (code: string | null | undefined): Lang | null => (code === "en" || code === "ar" || code === "tr" ? code : null);

async function deliver(deps: DeliveryNotifyDeps, userId: number, words: Words, data: Record<string, string>, onlyOrders: boolean): Promise<number> {
  const { store, app, now } = deps;
  const title = words.title.slice(0, NOTIFICATION_TITLE_MAX);
  const body = words.body.slice(0, NOTIFICATION_BODY_MAX);
  const notification = await store.createHostedNotification({ appId: app.id, userId, title, body, data, createdAt: now });
  if (!deps.account) return 0;
  const devices = (await store.listHostedPushDevices(app.id, [userId])).filter((d) => !onlyOrders || d.pushPreferences?.orders !== false);
  if (devices.length === 0) return 0;
  try {
    const result = await (deps.send ?? sendPush)(deps.account, devices.map(pushTarget), { title, body, data: { ...data, notification_id: String(notification.id) } }, { now });
    for (const token of result.invalidTokens) await store.clearHostedPushToken(app.id, token);
    return result.sent;
  } catch {
    // The inbox has it either way.
    return 0;
  }
}

/** Tells the customer their shipment moved to `status`; returns the phones reached. */
export async function tellCustomer(deps: DeliveryNotifyDeps, shipment: Shipment): Promise<number> {
  const text = CUSTOMER[shipment.status];
  if (!text || shipment.userId === null) return 0;
  const lang = asLang(shipment.lang) ?? (await appLang(deps.store, deps.app.id));
  const words = text[lang](shipmentReference(shipment), shipment.courierName ?? "");
  return deliver(deps, shipment.userId, words, { type: "shipment_update", shipment_id: String(shipment.id) }, true);
}

/** The courier's account: the customer account with the courier's number (or email). */
async function courierUser(store: DataStore, courier: Courier) {
  if (courier.phone) return store.getHostedUserByPhone(courier.appId, courier.phone);
  return courier.email ? store.getHostedEmailUser(courier.appId, courier.email) : null;
}

/** Tells couriers of a job: `given` to the one who has it, `waiting` to those on duty who may take it. */
export async function tellCouriers(deps: DeliveryNotifyDeps, shipment: Shipment, couriers: Courier[], kind: "given" | "waiting"): Promise<number> {
  let pushed = 0;
  const appLanguage = await appLang(deps.store, deps.app.id);
  for (const courier of couriers) {
    if (!courier.active) continue;
    const user = await courierUser(deps.store, courier);
    if (!user) continue;
    const devices = await deps.store.listHostedPushDevices(deps.app.id, [user.id]);
    const lang = asLang(devices[0]?.language) ?? appLanguage;
    const words = COURIER[kind][lang](shipmentReference(shipment), shipment.pickup.address);
    pushed += await deliver(deps, user.id, words, { type: "courier_job", shipment_id: String(shipment.id) }, false);
  }
  return pushed;
}
