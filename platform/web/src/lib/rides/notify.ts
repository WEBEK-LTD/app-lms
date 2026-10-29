import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { Courier, Ride, RideStatus } from "../data/types";
import { asLang, deliver, type DeliveryNotifyDeps, type Words } from "../delivery/notify";
import { rideReference } from "./service";

/**
 * 105.2 What the rider and the drivers are told: the rider when their ride
 * moves to a stage they follow (`ride_update`), a driver when a ride is
 * offered or given to them (`ride_offer`). Each goes to the person's inbox
 * and phones, in their language or the app's.
 */

const RIDER: Partial<Record<RideStatus, Record<Lang, (ref: string, driver: string, extra: string) => Words>>> = {
  accepted: {
    en: (ref, driver, car) => ({ title: "Your driver is on the way", body: `${driver} accepted ${ref}${car ? ` (${car})` : ""}.` }),
    ar: (ref, driver, car) => ({ title: "السائق في الطريق إليك", body: `قبل ${driver} الرحلة ${ref}${car ? ` (${car})` : ""}.` }),
    tr: (ref, driver, car) => ({ title: "Sürücünüz yolda", body: `${driver}, ${ref} yolculuğunu kabul etti${car ? ` (${car})` : ""}.` }),
  },
  arrived: {
    en: (ref, driver) => ({ title: "Your driver is here", body: `${driver} is waiting at the pickup for ${ref}.` }),
    ar: (ref, driver) => ({ title: "وصل السائق", body: `${driver} بانتظارك عند نقطة الانطلاق للرحلة ${ref}.` }),
    tr: (ref, driver) => ({ title: "Sürücünüz geldi", body: `${driver}, ${ref} için alış noktasında bekliyor.` }),
  },
  completed: {
    en: (ref, _driver, fare) => ({ title: "You've arrived", body: `${ref} ended. The fare is ${fare}. Rate your driver in the app.` }),
    ar: (ref, _driver, fare) => ({ title: "وصلت بالسلامة", body: `انتهت الرحلة ${ref}. الأجرة ${fare}. قيّم السائق من التطبيق.` }),
    tr: (ref, _driver, fare) => ({ title: "Vardınız", body: `${ref} sona erdi. Ücret ${fare}. Sürücünüzü uygulamada değerlendirin.` }),
  },
  cancelled: {
    en: (ref) => ({ title: "Ride cancelled", body: `${ref} was cancelled.` }),
    ar: (ref) => ({ title: "تم إلغاء الرحلة", body: `تم إلغاء ${ref}.` }),
    tr: (ref) => ({ title: "Yolculuk iptal edildi", body: `${ref} iptal edildi.` }),
  },
  no_driver: {
    en: (ref) => ({ title: "No driver is free", body: `We couldn't find a driver for ${ref}. Please try again in a few minutes.` }),
    ar: (ref) => ({ title: "لا يوجد سائق متاح", body: `لم نجد سائقًا للرحلة ${ref}. حاول مرة أخرى بعد دقائق.` }),
    tr: (ref) => ({ title: "Müsait sürücü yok", body: `${ref} için sürücü bulamadık. Birkaç dakika sonra tekrar deneyin.` }),
  },
};

/** A driver taking a ride back to look for another one: the rider hears they're looking again. */
const LOOKING: Record<Lang, (ref: string) => Words> = {
  en: (ref) => ({ title: "Finding you another driver", body: `Your driver couldn't make it. We're looking for another one for ${ref}.` }),
  ar: (ref) => ({ title: "نبحث لك عن سائق آخر", body: `تعذّر على السائق الحضور. نبحث عن سائق آخر للرحلة ${ref}.` }),
  tr: (ref) => ({ title: "Size başka bir sürücü arıyoruz", body: `Sürücünüz gelemedi. ${ref} için başka bir sürücü arıyoruz.` }),
};

const DRIVER: Record<"offer" | "given" | "cancelled", Record<Lang, (ref: string, place: string) => Words>> = {
  offer: {
    en: (ref, place) => ({ title: "New ride request", body: `${ref}: pickup at ${place}. Accept it in the app.` }),
    ar: (ref, place) => ({ title: "طلب رحلة جديد", body: `${ref}: الانطلاق من ${place}. اقبله من التطبيق.` }),
    tr: (ref, place) => ({ title: "Yeni yolculuk isteği", body: `${ref}: ${place} adresinden alış. Uygulamada kabul edin.` }),
  },
  given: {
    en: (ref, place) => ({ title: "A ride for you", body: `${ref}: pick the rider up at ${place}.` }),
    ar: (ref, place) => ({ title: "رحلة لك", body: `${ref}: اصطحب الراكب من ${place}.` }),
    tr: (ref, place) => ({ title: "Size bir yolculuk", body: `${ref}: yolcuyu ${place} adresinden alın.` }),
  },
  cancelled: {
    en: (ref) => ({ title: "Ride cancelled", body: `The rider cancelled ${ref}.` }),
    ar: (ref) => ({ title: "تم إلغاء الرحلة", body: `ألغى الراكب الرحلة ${ref}.` }),
    tr: (ref) => ({ title: "Yolculuk iptal edildi", body: `Yolcu ${ref} yolculuğunu iptal etti.` }),
  },
};

/** "White Toyota Corolla · ABC 123". */
export function carText(driver: Courier | null): string {
  const d = driver?.driver;
  if (!d) return "";
  const car = [d.carColor, d.carModel].filter(Boolean).join(" ");
  return [car, d.plate].filter(Boolean).join(" · ");
}

/** Tells the rider their ride moved to its status (or, `looking`, that it is looking for another driver); returns the phones reached. */
export async function tellRider(deps: DeliveryNotifyDeps, ride: Ride, extra: { driver?: Courier | null; fare?: string; looking?: boolean } = {}): Promise<number> {
  if (ride.userId === null) return 0;
  const lang = asLang(ride.lang) ?? (await appLang(deps.store, deps.app.id));
  const ref = rideReference(ride);
  let words: Words | null = null;
  if (extra.looking) words = LOOKING[lang](ref);
  else {
    const text = RIDER[ride.status];
    if (text) words = text[lang](ref, ride.driverName ?? "", ride.status === "completed" ? (extra.fare ?? "") : carText(extra.driver ?? null));
  }
  if (!words) return 0;
  return deliver(deps, ride.userId, words, { type: "ride_update", ride_id: String(ride.id) }, true);
}

/** The driver's account: the account with the driver's number (or email). */
export async function driverUser(store: DataStore, driver: Courier) {
  if (driver.phone) return store.getHostedUserByPhone(driver.appId, driver.phone);
  return driver.email ? store.getHostedEmailUser(driver.appId, driver.email) : null;
}

/** Tells a driver a ride is offered or given to them, or that its rider cancelled it; returns the phones reached. */
export async function tellDriver(deps: DeliveryNotifyDeps, ride: Ride, driver: Courier, kind: "offer" | "given" | "cancelled"): Promise<number> {
  const user = await driverUser(deps.store, driver);
  if (!user) return 0;
  const devices = await deps.store.listHostedPushDevices(deps.app.id, [user.id]);
  const lang = asLang(devices[0]?.language) ?? (await appLang(deps.store, deps.app.id));
  const words = DRIVER[kind][lang](rideReference(ride), ride.pickup.address);
  return deliver(deps, user.id, words, { type: "ride_offer", ride_id: String(ride.id) }, false);
}
