import "server-only";
import { DOCS } from "@/content/docs";
import { LOCALIZED } from "@/content/localized";
import type { Lang } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { COMPANY } from "./company";
import { STUDIO_SOLUTIONS } from "./marketing";
import { allSolutionsFor } from "./marketing-lang";

/**
 * /llms.txt (and /ar/llms.txt): a plain Markdown summary of Yallapp for the
 * assistants' crawlers, after the llms.txt convention: a title, a one-line
 * summary, a few short paragraphs, then sections of links. Built from the
 * site's own lists (solutions, docs), so its links follow the pages.
 */

export type LlmsLang = Extract<Lang, "en" | "ar">;

/** The guides worth naming, in this order (only the ones that exist are listed). */
const KEY_DOCS = [
  "getting-started",
  "app-types",
  "content-sources",
  "no-website",
  "yallapp-studio",
  "yallapp-courier",
  "push-notifications",
  "google-play",
  "app-store",
  "plans-and-billing",
];

interface Copy {
  summary: string;
  intro: string[];
  sections: {
    main: string;
    solutions: string;
    studio: string;
    docs: string;
    company: string;
    other: string;
  };
  pages: Record<string, [string, string]>;
  otherLanguage: [string, string];
}

const STORES = "Google Play, the App Store, Galaxy Store, AppGallery and GetApps";

const COPY: Record<LlmsLang, Copy> = {
  en: {
    summary: `${COMPANY.name} makes branded Android and iOS apps for businesses, with or without a website, and publishes them on ${STORES}.`,
    intro: [
      `A business picks its kind of app, adds its brand and its content, and ${COMPANY.name} builds the app and publishes it on ${STORES}, under the business's own name or for it. Apps come in English, Arabic and Turkish.`,
      "The content comes from where the business already keeps it: a WordPress site (with Yallapp's plugin), a platform such as Shopify, its own API, or no website at all, managed in the Yallapp dashboard.",
      "Yallapp Studio is for projects that need more: delivery companies, with Yallapp Courier for their couriers (coming to Google Play and the App Store), food delivery from many restaurants, rides and taxis on a live map, academies with many teachers, schools and universities.",
      `${COMPANY.name} is based in ${COMPANY.city}, ${COMPANY.country}.`,
    ],
    sections: { main: "Main pages", solutions: "Apps by kind of business", studio: "Yallapp Studio projects", docs: "Guides", company: "Company and policies", other: "Other languages" },
    pages: {
      "/": ["Home", "what Yallapp is and how it works"],
      "/features": ["Features", "what every app includes"],
      "/how-it-works": ["How it works", "the steps from sign-up to the stores"],
      "/integrations": ["Integrations", "the website plugins and platforms an app can use"],
      "/yallapp-studio": ["Yallapp Studio", "design the app freely, and the Studio project kinds"],
      "/pricing": ["Pricing", "the plans"],
      "/demo": ["Demo apps", "sample apps to try on an Android phone"],
      "/demo/studio": ["Studio demo apps", "sample Yallapp Studio apps"],
      "/faq": ["FAQ", "common questions and answers"],
      "/docs": ["Guides", "every guide"],
      "/contact": ["Contact", "how to reach Yallapp"],
      "/terms": ["Terms", "terms of use"],
      "/privacy": ["Privacy", "privacy policy"],
      "/refund": ["Refunds", "refund policy"],
      "/delete-account": ["Delete an account", "how owners and couriers delete their account"],
    },
    otherLanguage: ["العربية", "this summary in Arabic"],
  },
  ar: {
    summary: `يصنع ${COMPANY.name} تطبيقات Android وiOS بعلامة النشاط التجاري، بموقع إلكتروني أو من دونه، وينشرها على Google Play وApp Store وGalaxy Store وAppGallery وGetApps.`,
    intro: [
      `يختار النشاط التجاري نوع تطبيقه، ويضيف علامته ومحتواه، ثم يبني ${COMPANY.name} التطبيق وينشره على Google Play وApp Store وGalaxy Store وAppGallery وGetApps، باسم النشاط نفسه أو نيابة عنه. والتطبيقات بالعربية والإنجليزية والتركية.`,
      "ويأتي المحتوى من حيث يحفظه النشاط أصلًا: موقع WordPress (بإضافة Yallapp)، أو منصة مثل Shopify، أو واجهته البرمجية الخاصة، أو من دون موقع إطلاقًا عبر لوحة تحكم Yallapp.",
      "أما Yallapp Studio فللمشاريع التي تحتاج إلى أكثر: شركات التوصيل مع تطبيق Yallapp Courier لمناديبها (قريبًا على Google Play وApp Store)، وتوصيل الطعام من مطاعم كثيرة، والمشاوير وسيارات الأجرة على خريطة حيّة، والأكاديميات متعددة المدرسين، والمدارس، والجامعات.",
      `مقر ${COMPANY.name} في القاهرة، مصر.`,
    ],
    sections: { main: "الصفحات الرئيسية", solutions: "التطبيقات حسب نوع النشاط", studio: "مشاريع Yallapp Studio", docs: "الأدلة", company: "الشركة والسياسات", other: "لغات أخرى" },
    pages: {
      "/": ["الرئيسية", "ما هو Yallapp وكيف يعمل"],
      "/features": ["المزايا", "ما يتضمنه كل تطبيق"],
      "/how-it-works": ["كيف يعمل", "الخطوات من التسجيل حتى المتاجر"],
      "/integrations": ["التكاملات", "إضافات المواقع والمنصات التي يعمل معها التطبيق"],
      "/yallapp-studio": ["Yallapp Studio", "صمّم تطبيقك بحرية، وأنواع مشاريع Studio"],
      "/pricing": ["الأسعار", "الباقات"],
      "/demo": ["التطبيقات التجريبية", "تطبيقات تجريبية تُجرَّب على هاتف Android"],
      "/demo/studio": ["تطبيقات Studio التجريبية", "تطبيقات تجريبية من Yallapp Studio"],
      "/faq": ["الأسئلة الشائعة", "الأسئلة المتكررة وإجاباتها"],
      "/docs": ["الأدلة", "كل الأدلة"],
      "/contact": ["تواصل معنا", "كيف تتواصل مع Yallapp"],
      "/terms": ["الشروط", "شروط الاستخدام"],
      "/privacy": ["الخصوصية", "سياسة الخصوصية"],
      "/refund": ["الاسترداد", "سياسة الاسترداد"],
      "/delete-account": ["حذف الحساب", "كيف يحذف أصحاب التطبيقات والمناديب حساباتهم"],
    },
    otherLanguage: ["English", "this summary in English"],
  },
};

/** English titles that read badly as "<kind> apps". */
const EN_TITLES: Record<string, string> = { instructors: "Apps for academies with many teachers" };

const MAIN_PAGES = ["/", "/features", "/how-it-works", "/integrations", "/yallapp-studio", "/pricing", "/demo", "/demo/studio", "/faq", "/docs"];
const COMPANY_PAGES = ["/contact", "/terms", "/privacy", "/refund", "/delete-account"];

/** One line of a link list; Markdown brackets and line breaks in a title are kept out. */
function item(title: string, url: string, note: string): string {
  const clean = (text: string) => text.replace(/[[\]\n]/g, " ").replace(/\s+/g, " ").trim();
  return `- [${clean(title)}](${url})${note ? `: ${clean(note)}` : ""}`;
}

/** /llms.txt's text in English or Arabic, with every link on `base` (siteUrl()). */
export function llmsText(lang: LlmsLang, base: string): string {
  const copy = COPY[lang];
  const url = (path: string) => `${base}${localePath(lang, path) === "/" ? "/" : localePath(lang, path)}`;
  const page = (path: string) => item(copy.pages[path]![0], url(path), copy.pages[path]![1]);
  const studioIds = new Set(STUDIO_SOLUTIONS.map((s) => s.id));
  const solutions = allSolutionsFor(lang);
  const docTitle = (slug: string) => {
    const doc = DOCS.find((d) => d.slug === slug)!;
    const t = lang === "en" ? null : LOCALIZED[lang].docs[doc.key];
    return { title: t?.title ?? doc.title, description: t?.description ?? doc.description };
  };
  const other: LlmsLang = lang === "en" ? "ar" : "en";
  const solutionItem = (s: (typeof solutions)[number]) => item((lang === "en" && EN_TITLES[s.id]) || s.appsTitle, url(`/solutions/${s.id}`), s.summary);

  return [
    `# ${COMPANY.name}`,
    "",
    `> ${copy.summary}`,
    "",
    ...copy.intro.flatMap((p) => [p, ""]),
    `## ${copy.sections.main}`,
    "",
    ...MAIN_PAGES.map(page),
    "",
    `## ${copy.sections.solutions}`,
    "",
    ...solutions.filter((s) => !studioIds.has(s.id)).map(solutionItem),
    "",
    `## ${copy.sections.studio}`,
    "",
    ...solutions.filter((s) => studioIds.has(s.id)).map(solutionItem),
    "",
    `## ${copy.sections.docs}`,
    "",
    ...KEY_DOCS.filter((slug) => DOCS.some((d) => d.slug === slug)).map((slug) => {
      const d = docTitle(slug);
      return item(d.title, url(`/docs/${slug}`), d.description);
    }),
    "",
    `## ${copy.sections.company}`,
    "",
    ...COMPANY_PAGES.map(page),
    "",
    `## ${copy.sections.other}`,
    "",
    item(copy.otherLanguage[0], `${base}${other === "en" ? "" : `/${other}`}/llms.txt`, copy.otherLanguage[1]),
    "",
  ].join("\n");
}

/** The response for a /llms.txt route: plain text, kept for a day. */
export function llmsResponse(lang: LlmsLang, base: string): Response {
  return new Response(llmsText(lang, base), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
