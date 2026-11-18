import { dashboardMessages, type DashboardMessages, type DashT } from "@/i18n/dashboard";
import { formatMessage, lookup } from "@/i18n/format";
import type { Lang } from "@/i18n";

/**
 * 106.13 The words the dashboard's Studio Market parts say
 * (components/studio-market: the cards, prices, countdowns, the plans, the
 * demo and the phones' own words), for the website's /templates. English
 * and Turkish are the dashboard's own; the website is in Modern Standard
 * Arabic, so its Arabic is written here (the dashboard's is Egyptian).
 * Only these keys are sent with the page.
 */

const KEYS = {
  studioMarket: [
    "free",
    "rank",
    "viewTemplate",
    "applies",
    "fromPrice",
    "oncePrice",
    "perMonth",
    "lightDark",
    "dark",
    "light",
    "showPage",
    "pagesList",
    "tryDemo",
    "demoMine",
    "demoTitle",
    "close",
    "previous",
    "next",
    "pagePosition",
    "choosePlan",
    "bestValue",
    "applyPaid",
    "previewMine",
    "plan_1m",
    "plan_3m",
    "plan_6m",
    "plan_1y",
    "plan_2y",
    "plan_life",
    "lifeHint",
    "knowEndRestore",
    "knowEndKeep",
    "knowRenew",
    "knowMove",
    "knowRefund",
    "knowFree",
    "knowKeep",
    "knowReview",
  ],
  marketDiscounts: ["flashPill", "salePill", "wasPrice", "endsIn", "endsInDays", "saleEnded"],
  studio: ["price", "addPicture", "addVideo", "send", "search", "days", "hours", "minutes", "seconds", "copyCode"],
  nav: ["languages"],
} as const;

type Area = keyof typeof KEYS;
type Words<A extends Area> = Record<(typeof KEYS)[A][number], string>;
export interface MarketWords {
  studioMarket: Words<"studioMarket">;
  marketDiscounts: Words<"marketDiscounts">;
  studio: Words<"studio">;
  nav: Words<"nav">;
}
/** Every key is one of the dashboard catalog's (a typo or a removed key fails here). */
type Missing = { [A in Area]: Exclude<(typeof KEYS)[A][number], keyof DashboardMessages[A]> }[Area];
const keysExist: [Missing] extends [never] ? true : Missing = true;
void keysExist;

/** The website's Arabic (Modern Standard Arabic). */
const AR: MarketWords = {
  studioMarket: {
    free: "مجاني",
    rank: "#{rank}",
    viewTemplate: "عرض القالب",
    applies: "{count, plural, =0 {جديد} one {تطبيق واحد} two {تطبيقان} few {{count} تطبيقات} other {{count} تطبيقًا}}",
    fromPrice: "ابتداءً من {price} شهريًا",
    oncePrice: "{price} مرة واحدة",
    perMonth: "{price} شهريًا",
    lightDark: "فاتح وداكن",
    dark: "داكن",
    light: "فاتح",
    showPage: "اعرض {page}",
    pagesList: "الصفحات",
    tryDemo: "جرّب العرض التجريبي",
    demoMine: "{name} على {app}",
    demoTitle: "{name}: العرض التجريبي",
    close: "إغلاق",
    previous: "السابقة",
    next: "التالية",
    pagePosition: "{page} · {n} من {total}",
    choosePlan: "اختر الخطة",
    bestValue: "الأوفر",
    applyPaid: "طبّقه على تطبيقي · {price}",
    previewMine: "اعرضه على تطبيقي أولًا",
    plan_1m: "شهر واحد",
    plan_3m: "3 أشهر",
    plan_6m: "6 أشهر",
    plan_1y: "سنة واحدة",
    plan_2y: "سنتان",
    plan_life: "مدى الحياة",
    lifeHint: "دفعة واحدة، ولا تنتهي",
    knowEndRestore: "عند انتهاء خطتك، يعود تطبيقك إلى التصميم الذي كان عليه من قبل. هذا ما اختاره المصمم.",
    knowEndKeep: "عند انتهاء خطتك، يبقى التصميم في تطبيقك من دون تحديثات. هذا ما اختاره المصمم.",
    knowRenew: "لا يوجد تجديد تلقائي. نذكّرك قبل الانتهاء بـ 14 يومًا، وتجدّد بالدفع مرة أخرى.",
    knowMove: "يمكنك نقله إلى تطبيق آخر من النوع نفسه، مرة كل 30 يومًا.",
    knowRefund: "لا تُسترد المبالغ المدفوعة: فهو محتوى رقمي يُطبَّق فورًا.",
    knowFree: "مجاني: لا ينتهي، وتصلك كل تحديثات المصمم.",
    knowKeep: "يُحفظ تصميم تطبيقك الحالي: يمكنك العودة إليه في أي وقت من صفحة قوالبك في لوحة التحكم.",
    knowReview: "راجعه فريقنا قبل نشره.",
  },
  marketDiscounts: {
    flashPill: "عرض خاطف",
    salePill: "تخفيض",
    wasPrice: "قبل: {price}",
    endsIn: "ينتهي بعد {time}",
    endsInDays: "ينتهي بعد {days, plural, one {يوم واحد} two {يومين} few {{days} أيام} other {{days} يومًا}} و{time}",
    saleEnded: "انتهى هذا العرض",
  },
  studio: {
    price: "[السعر]",
    addPicture: "أضف صورة",
    addVideo: "أضف عنوان الفيديو",
    send: "إرسال",
    search: "بحث",
    days: "يوم",
    hours: "ساعة",
    minutes: "دقيقة",
    seconds: "ثانية",
    copyCode: "نسخ",
  },
  nav: { languages: "اللغات" },
};

function pick(lang: Exclude<Lang, "ar">): MarketWords {
  const all = dashboardMessages(lang);
  const out = {} as Record<Area, Record<string, string>>;
  for (const area of Object.keys(KEYS) as Area[]) {
    const from = all[area] as unknown as Record<string, string>;
    out[area] = Object.fromEntries(KEYS[area].map((key) => [key, from[key]!]));
  }
  return out as unknown as MarketWords;
}

const WORDS: Record<Lang, MarketWords> = { en: pick("en"), ar: AR, tr: pick("tr") };

/** The words in a language. */
export function marketWords(lang: Lang): MarketWords {
  return WORDS[lang];
}

/**
 * The words as the dashboard's catalog, for `DashboardI18n` around the
 * market's parts (they read only these keys).
 */
export function marketCatalogFor(lang: Lang): DashboardMessages {
  return WORDS[lang] as unknown as DashboardMessages;
}

/** `t(key)` over these words, for the page's server code (lib/studio-market/listing.ts takes it). */
export function marketT(lang: Lang): DashT {
  const words = WORDS[lang];
  return (key, values) => formatMessage(lang, lookup(words, key), values);
}

/** The keys, for tests/unit/studio-market-public.test.ts. */
export const MARKET_WORD_KEYS = KEYS;
