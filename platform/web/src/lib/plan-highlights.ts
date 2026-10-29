import type { PlanFeature, PlanLimits, SupportLevel } from "./plans";

/**
 * A Studio plan's "What's included", written from its own numbers and what
 * it has when the team leaves it empty in Admin › Plans: the pages a
 * project may have, storage, app users and languages, the project types,
 * then the rest. Up to 10 lines of up to 80 characters, like a typed one.
 */

export type HighlightLang = "en" | "ar" | "tr";

/** The project types a Studio plan may have, in the order they're named. */
const KINDS = ["delivery", "food", "rides", "instructors", "school"] as const satisfies readonly PlanFeature[];

const WORDS: Record<
  HighlightLang,
  {
    pages: (n: number | null) => string;
    storage: (gb: number | null) => string;
    users: (n: number | null) => string;
    languages: (n: number | null) => string;
    kinds: string;
    kind: Record<(typeof KINDS)[number], string>;
    and: string;
    ios: string;
    android: string;
    courier: string;
    motion: string;
    templates: string;
    publish: string;
    support: Record<SupportLevel, string>;
    manager: string;
  }
> = {
  en: {
    pages: (n) => (n === null ? "Unlimited pages per project" : n === 1 ? "1 page per project" : `Up to ${n} pages per project`),
    storage: (gb) => (gb === null ? "Unlimited media storage" : `${gb} GB of media storage`),
    users: (n) => (n === null ? "Unlimited app users" : `Up to ${n.toLocaleString("en")} app users`),
    languages: (n) => (n === null ? "Every app language" : n === 1 ? "1 app language" : `${n} app languages`),
    kinds: "Projects: ",
    kind: { delivery: "delivery", food: "food delivery", rides: "rides", instructors: "academies", school: "schools" },
    and: " and ",
    ios: "Android and iOS apps",
    android: "An Android app",
    courier: "A second app for couriers",
    motion: "Motion in the editor",
    templates: "Pages saved as your own templates",
    publish: "We publish to the stores for you",
    support: { email: "Email support", whatsapp: "WhatsApp support", priority: "Priority support", dedicated: "Fastest support" },
    manager: "Your own account manager",
  },
  ar: {
    pages: (n) => (n === null ? "صفحات بلا حد لكل مشروع" : n === 1 ? "صفحة واحدة لكل مشروع" : `حتى ${ar(n, "صفحات", "صفحة")} لكل مشروع`),
    storage: (gb) => (gb === null ? "مساحة وسائط بلا حد" : `${gb} جيجابايت لمساحة الوسائط`),
    users: (n) => (n === null ? "مستخدمون بلا حد للتطبيق" : `حتى ${ar(n, "مستخدمين", "مستخدم")} للتطبيق`),
    languages: (n) => (n === null ? "كل لغات التطبيق" : n === 1 ? "لغة واحدة للتطبيق" : `${ar(n, "لغات", "لغة")} للتطبيق`),
    kinds: "المشاريع: ",
    kind: { delivery: "التوصيل", food: "توصيل الطعام", rides: "الرحلات", instructors: "الأكاديميات", school: "المدارس" },
    and: " و",
    ios: "تطبيق أندرويد وiOS",
    android: "تطبيق أندرويد",
    courier: "تطبيق ثانٍ للمندوبين",
    motion: "الحركة في المحرر",
    templates: "حفظ الصفحات كقوالب خاصة بك",
    publish: "ننشر التطبيق في المتاجر نيابةً عنك",
    support: { email: "دعم بالبريد الإلكتروني", whatsapp: "دعم عبر واتساب", priority: "دعم بأولوية", dedicated: "أسرع دعم" },
    manager: "مدير حساب خاص بك",
  },
  tr: {
    pages: (n) => (n === null ? "Proje başına sınırsız sayfa" : `Proje başına ${n} sayfaya kadar`),
    storage: (gb) => (gb === null ? "Sınırsız medya alanı" : `${gb} GB medya alanı`),
    users: (n) => (n === null ? "Sınırsız uygulama kullanıcısı" : `${n.toLocaleString("en")} uygulama kullanıcısına kadar`),
    languages: (n) => (n === null ? "Tüm uygulama dilleri" : `${n} uygulama dili`),
    kinds: "Projeler: ",
    kind: { delivery: "teslimat", food: "yemek teslimatı", rides: "yolculuk", instructors: "akademiler", school: "okullar" },
    and: " ve ",
    ios: "Android ve iOS uygulaması",
    android: "Android uygulaması",
    courier: "Kuryeler için ikinci bir uygulama",
    motion: "Editörde hareket",
    templates: "Sayfaları kendi şablonunuz olarak kaydetme",
    publish: "Mağazalarda sizin için yayınlıyoruz",
    support: { email: "E-posta desteği", whatsapp: "WhatsApp desteği", priority: "Öncelikli destek", dedicated: "En hızlı destek" },
    manager: "Size özel hesap yöneticisi",
  },
};

/** An Arabic count: the plural from 3 to 10, the singular otherwise. */
function ar(n: number, plural: string, singular: string): string {
  return `${n.toLocaleString("en")} ${n >= 3 && n <= 10 ? plural : singular}`;
}

export const HIGHLIGHT_LIMITS = { lines: 10, length: 80 } as const;

/** A list in words: "a, b and c". */
function listOf(items: string[], and: string): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")}${and}${items.at(-1)}`;
}

export function planHighlights(lang: HighlightLang, plan: { features: readonly PlanFeature[]; limits: PlanLimits }): string[] {
  const w = WORDS[lang];
  const has = (f: PlanFeature) => plan.features.includes(f);
  const kinds = KINDS.filter(has).map((k) => w.kind[k]);
  // The project types on one line, or two when they don't fit.
  const kindLines: string[] = [];
  if (kinds.length) {
    const line = `${w.kinds}${listOf(kinds, w.and)}`;
    if (line.length <= HIGHLIGHT_LIMITS.length) kindLines.push(line);
    else {
      const half = Math.ceil(kinds.length / 2);
      kindLines.push(`${w.kinds}${kinds.slice(0, half).join(", ")}`, `${w.kinds}${listOf(kinds.slice(half), w.and)}`);
    }
  }
  const lines = [
    w.pages(plan.limits.studioPages ?? null),
    w.storage(plan.limits.storageGb),
    w.users(plan.limits.appUsers),
    w.languages(plan.limits.languages),
    ...kindLines,
    has("ios") ? w.ios : w.android,
    has("courier_app") ? w.courier : null,
    has("auto_publish") ? w.publish : null,
    has("studio_motion") ? w.motion : null,
    has("studio_templates") ? w.templates : null,
    w.support[plan.limits.support],
    plan.limits.accountManager ? w.manager : null,
  ].filter((l): l is string => Boolean(l));
  return lines.slice(0, HIGHLIGHT_LIMITS.lines).map((l) => l.slice(0, HIGHLIGHT_LIMITS.length));
}
