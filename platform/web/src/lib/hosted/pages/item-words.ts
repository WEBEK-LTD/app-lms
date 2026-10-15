/**
 * 38 The words the hosted API writes on list cards (prices, durations,
 * badges, dates), in the language the app asked for: an Arabic or Turkish
 * app showed "Free", "60 min" and "₺120 of ₺250" in English. The same words
 * as the app's own (mobile/lib/l10n), so a card reads like the screen it
 * opens.
 */

export interface ItemWords {
  /** BCP 47 locale for dates, with Latin digits as the app shows them. */
  locale: string;
  free: string;
  sale: string;
  soldOut: string;
  outOfStock: string;
  minutes: (m: number) => string;
  hours: (h: number) => string;
  hoursMinutes: (h: number, m: number) => string;
  forSale: string;
  forRent: string;
  negotiable: string;
  perMonth: (price: string) => string;
  perYear: (price: string) => string;
  left: (count: number) => string;
  online: string;
  from: (price: string) => string;
  freeFrom: (price: string) => string;
  raisedOf: (raised: string, goal: string) => string;
  raised: (raised: string) => string;
  ended: string;
  goalReached: string;
}

const EN: ItemWords = {
  locale: "en-GB",
  free: "Free",
  sale: "Sale",
  soldOut: "Sold out",
  outOfStock: "Sold out",
  minutes: (m) => `${m} min`,
  hours: (h) => `${h} h`,
  hoursMinutes: (h, m) => `${h} h ${m} min`,
  forSale: "For sale",
  forRent: "For rent",
  negotiable: "Negotiable",
  perMonth: (p) => `${p} / month`,
  perYear: (p) => `${p} / year`,
  left: (n) => `${n} left`,
  online: "Online",
  from: (p) => `From ${p}`,
  freeFrom: (p) => `Free · from ${p}`,
  raisedOf: (r, g) => `${r} of ${g}`,
  raised: (r) => `${r} raised`,
  ended: "Ended",
  goalReached: "Goal reached",
};

/** A left-to-right isolate (U+2066 … U+2069). */
const ltr = (text: string) => `\u2066${text}\u2069`;

const WORDS: Record<string, ItemWords> = {
  en: EN,
  ar: {
    locale: "ar-u-nu-latn",
    free: "مجاني",
    sale: "تخفيض",
    soldOut: "نفدت التذاكر",
    outOfStock: "نفد من المخزون",
    minutes: (m) => `${m} د`,
    hours: (h) => `${h} س`,
    hoursMinutes: (h, m) => `${h} س ${m} د`,
    forSale: "للبيع",
    forRent: "للإيجار",
    negotiable: "قابل للتفاوض",
    // Amounts kept whole left to right in the Arabic line ("₺120.00", not "120.00₺").
    perMonth: (p) => `${ltr(p)} / شهريًا`,
    perYear: (p) => `${ltr(p)} / سنويًا`,
    left: (n) => `بقي ${n}`,
    online: "عبر الإنترنت",
    from: (p) => `ابتداءً من ${ltr(p)}`,
    freeFrom: (p) => `مجاني · ابتداءً من ${ltr(p)}`,
    raisedOf: (r, g) => `${ltr(r)} من ${ltr(g)}`,
    raised: (r) => `تم جمع ${ltr(r)}`,
    ended: "انتهت",
    goalReached: "تم بلوغ الهدف",
  },
  tr: {
    locale: "tr",
    free: "Ücretsiz",
    sale: "İndirim",
    soldOut: "Tükendi",
    outOfStock: "Stokta yok",
    minutes: (m) => `${m} dk`,
    hours: (h) => `${h} sa`,
    hoursMinutes: (h, m) => `${h} sa ${m} dk`,
    forSale: "Satılık",
    forRent: "Kiralık",
    negotiable: "Pazarlığa açık",
    perMonth: (p) => `${p} / ay`,
    perYear: (p) => `${p} / yıl`,
    left: (n) => `${n} kaldı`,
    online: "Çevrim içi",
    from: (p) => `${p} ve üzeri`,
    freeFrom: (p) => `Ücretsiz · ${p} ve üzeri`,
    raisedOf: (r, g) => `${r} toplandı · Hedef ${g}`,
    raised: (r) => `${r} toplandı`,
    ended: "Sona erdi",
    goalReached: "Hedefe ulaşıldı",
  },
};

/** The words for an app language code; English for any other. */
export function itemWords(lang: string | null | undefined): ItemWords {
  return WORDS[lang ?? "en"] ?? EN;
}

/** "45 min", "1 h", "1 h 30 min" (as the app writes a duration). */
export function durationLabel(minutes: number, lang?: string | null): string {
  const w = itemWords(lang);
  if (minutes < 60) return w.minutes(minutes);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? w.hours(h) : w.hoursMinutes(h, m);
}
