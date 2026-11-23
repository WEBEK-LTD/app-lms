import type { Lang } from "@/i18n";

/**
 * 106.14 The words of a designer's public page (/designers/<handle>) and of
 * the ratings on a template's page, in English, Modern Standard Arabic and
 * Turkish. The cards and stars take theirs from site/templates-words.ts.
 */

export interface DesignersText {
  metaTitle: string;
  metaDescription: string;
  metaDescriptionBio: string;
  eyebrow: string;
  from: string;
  since: string;
  links: string;
  templatesTitle: string;
  templatesLabel: string;
  overall: string;
  ratingsLabel: string;
  buyers: string;
  ratingsTitle: string;
  ratingsHint: string;
  noRatings: string;
  replyFrom: string;
  onTemplate: string;
  edited: string;
  back: string;
  templateRatings: string;
  templateNoRatings: string;
  rateInDashboard: string;
  externalLink: string;
}

const EN: DesignersText = {
  metaTitle: "{name}: app designs on Studio Market",
  metaDescription: "{name}'s app designs for Yallapp Studio apps: {count, plural, one {{count} template} other {{count} templates}}, with buyers' ratings.",
  metaDescriptionBio: "{bio}",
  eyebrow: "Studio Market designer",
  from: "From {country}",
  since: "Designing on Studio Market since {year}",
  links: "Their website and accounts",
  templatesTitle: "Templates by {name}",
  templatesLabel: "Templates",
  overall: "Overall rating",
  ratingsLabel: "Ratings",
  buyers: "{count, plural, one {Buyer} other {Buyers}}",
  ratingsTitle: "What buyers say",
  ratingsHint: "Only accounts that got a template can rate it, once. The designer can answer each rating once.",
  noRatings: "No ratings yet.",
  replyFrom: "Reply from {name}",
  onTemplate: "On {title}",
  edited: "edited",
  back: "Studio Market",
  templateRatings: "Ratings",
  templateNoRatings: "No ratings yet. Accounts that get this template can rate it.",
  rateInDashboard: "Got this template? Rate it from its page in your dashboard.",
  externalLink: "{label} (opens a new tab)",
};

const AR: DesignersText = {
  metaTitle: "{name}: تصاميم تطبيقات في ماركت Studio",
  metaDescription: "تصاميم {name} لتطبيقات Yallapp Studio: {count, plural, one {قالب واحد} two {قالبان} few {{count} قوالب} other {{count} قالبًا}}، مع تقييمات المشترين.",
  metaDescriptionBio: "{bio}",
  eyebrow: "مصمم في ماركت Studio",
  from: "من {country}",
  since: "يصمم في ماركت Studio منذ {year}",
  links: "موقعه وحساباته",
  templatesTitle: "قوالب {name}",
  templatesLabel: "القوالب",
  overall: "التقييم العام",
  ratingsLabel: "التقييمات",
  buyers: "{count, plural, one {مشترٍ} two {مشتريان} few {مشترين} other {مشتريًا}}",
  ratingsTitle: "ماذا يقول المشترون",
  ratingsHint: "لا يقيّم القالب إلا من حصل عليه، ومرة واحدة. ويمكن للمصمم الرد على كل تقييم مرة واحدة.",
  noRatings: "لا توجد تقييمات بعد.",
  replyFrom: "رد من {name}",
  onTemplate: "عن {title}",
  edited: "معدَّل",
  back: "ماركت Studio",
  templateRatings: "التقييمات",
  templateNoRatings: "لا توجد تقييمات بعد. يمكن لمن يحصل على هذا القالب أن يقيّمه.",
  rateInDashboard: "حصلت على هذا القالب؟ قيّمه من صفحته في لوحة التحكم.",
  externalLink: "{label} (يفتح في علامة تبويب جديدة)",
};

const TR: DesignersText = {
  metaTitle: "{name}: Studio Market'te uygulama tasarımları",
  metaDescription: "{name} tasarımcısının Yallapp Studio uygulamaları için tasarımları: {count} şablon, alıcıların puanlarıyla.",
  metaDescriptionBio: "{bio}",
  eyebrow: "Studio Market tasarımcısı",
  from: "{country}",
  since: "{year} yılından beri Studio Market'te",
  links: "Web sitesi ve hesapları",
  templatesTitle: "{name} şablonları",
  templatesLabel: "Şablonlar",
  overall: "Genel puan",
  ratingsLabel: "Puanlar",
  buyers: "{count, plural, one {Alıcı} other {Alıcı}}",
  ratingsTitle: "Alıcılar ne diyor",
  ratingsHint: "Bir şablona yalnızca onu alan hesaplar, bir kez puan verebilir. Tasarımcı her puana bir kez yanıt verebilir.",
  noRatings: "Henüz puan yok.",
  replyFrom: "{name} yanıtı",
  onTemplate: "{title} için",
  edited: "düzenlendi",
  back: "Studio Market",
  templateRatings: "Puanlar",
  templateNoRatings: "Henüz puan yok. Bu şablonu alan hesaplar puan verebilir.",
  rateInDashboard: "Bu şablonu aldınız mı? Panelinizdeki sayfasından puan verin.",
  externalLink: "{label} (yeni sekmede açılır)",
};

const TEXT: Record<Lang, DesignersText> = { en: EN, ar: AR, tr: TR };

export function designersText(lang: Lang): DesignersText {
  return TEXT[lang];
}
