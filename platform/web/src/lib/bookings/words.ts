import { BOOKING_STATUS_LABELS } from "./setup";
import type { BookingAppointment } from "../data/types";

/**
 * 180.5 The words the hosted bookings API writes for the app, in the
 * language it asks in (`Accept-Language`): the home's section titles and an
 * appointment's state. They were English in an Arabic or Turkish app. The
 * app's own words for the same (app_ar.arb, app_tr.arb), Modern Standard
 * Arabic; English for any other language.
 */
type Words = { ar: string; tr: string };

const STATUS: Record<keyof typeof BOOKING_STATUS_LABELS, Words> = {
  approved: { ar: "تمت الموافقة", tr: "Onaylandı" },
  pending: { ar: "قيد الانتظار", tr: "Beklemede" },
  cancelled: { ar: "ملغى", tr: "İptal edildi" },
  rejected: { ar: "مرفوض", tr: "Reddedildi" },
  no_show: { ar: "لم يحضر", tr: "Gelmedi" },
  completed: { ar: "مكتمل", tr: "Tamamlandı" },
};

const TITLES = {
  next_appointment: { en: "Your next appointment", ar: "موعدك القادم", tr: "Sıradaki randevunuz" },
  next_visit: { en: "Your next visit", ar: "زيارتك القادمة", tr: "Sıradaki ziyaretiniz" },
  categories: { en: "Categories", ar: "الفئات", tr: "Kategoriler" },
  services: { en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  our_team: { en: "Our team", ar: "فريقنا", tr: "Ekibimiz" },
  our_doctors: { en: "Our doctors", ar: "أطباؤنا", tr: "Doktorlarımız" },
} as const;

function langOf(lang: string | null | undefined): "ar" | "tr" | null {
  const code = (lang ?? "").trim().toLowerCase().slice(0, 2);
  return code === "ar" || code === "tr" ? code : null;
}

export function bookingStatusLabel(status: BookingAppointment["status"], lang?: string | null): string {
  const code = langOf(lang);
  return code ? STATUS[status][code] : BOOKING_STATUS_LABELS[status];
}

export function bookingHomeTitle(key: keyof typeof TITLES, lang?: string | null): string {
  return TITLES[key][langOf(lang) ?? "en"];
}
