import { describe, expect, it } from "vitest";
import { DOCS } from "@/content/docs";
import { PRIVACY, REFUND, TERMS } from "@/content/legal";
import { LOCALIZED } from "@/content/localized";
import { formatMessage, getT, LANGS, langCookie, langFromCookie, langOf, messagesFor, PREFIXED_LANGS, translateKnown } from "@/i18n";
import { en } from "@/i18n/messages/en";
import { isLocalizedPath, languageAlternates, localePath, splitLangPath, switchLangPath } from "@/i18n/paths";
import { richTags } from "@/i18n/rich";
import { hasArabic, rtlWords, visualWord } from "@/lib/arabic-shape";
import { contentInLang, translatedDefaults } from "@/lib/content/site-lang";
import { CONTENT_PAGES, contentPage, faqMarkdown, parseFaq, parseGuide, readContentForm } from "@/lib/content/site";
import { headingId } from "@/lib/content/markdown";
import { icuArguments, parseIcu } from "@/lib/i18n/icu";
import { PRICED_PAGES } from "@/lib/geo-vary";
import { COMPARISON, FAQ, FEATURE_GROUPS, INTEGRATION_GROUPS, REQUIREMENTS, SCREEN_ALT, SOLUTIONS, STEPS } from "@/lib/marketing";
import { faqFor, integrationGroupsFor, planFor, solutionsFor } from "@/lib/marketing-lang";
import { PLAN_INFO, REGULAR_PLANS } from "@/lib/plans";
import { DEMO_GUIDES } from "@/lib/demo/content";
import { siteMetadata } from "@/lib/seo";
import { PRIVATE_PATHS, siteSitemap, sitemapEntries } from "@/lib/sitemap";
import { siteNavFor } from "@/lib/site-nav";
import { planLimitLinesFor, planStoresLineFor } from "@/components/plan-cards";

const BASE = "https://yallapp.test";

/** Every message of a catalog by its dotted key. */
function flatten(value: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof inner === "string") out.set(name, inner);
    else for (const [k, v] of flatten(inner, name)) out.set(k, v);
  }
  return out;
}

const placeholders = (message: string) => [...icuArguments(parseIcu(message)).keys()].sort();
/** Markdown links' targets and {{placeholders}}: a translation keeps them all. */
const links = (markdown: string) => [...markdown.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]!).sort();
const fills = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!).sort();
const headings = (markdown: string) => markdown.split("\n").filter((line) => /^#{2,3} /.test(line)).map((line) => line.match(/^#+/)![0]);

describe("55 the message catalogs", () => {
  const english = flatten(en);

  it("have every English key in Arabic and Turkish, with text", () => {
    expect(english.size).toBeGreaterThan(300);
    for (const lang of PREFIXED_LANGS) {
      const other = flatten(messagesFor(lang));
      expect([...other.keys()].sort(), lang).toEqual([...english.keys()].sort());
      for (const [key, value] of other) expect(value.trim(), `${lang} ${key}`).not.toBe("");
    }
  });

  it("keep the placeholders and the marked words of the English", () => {
    for (const lang of PREFIXED_LANGS) {
      const other = flatten(messagesFor(lang));
      for (const [key, message] of english) {
        expect(placeholders(other.get(key)!), `${lang} ${key}`).toEqual(placeholders(message));
        expect(richTags(other.get(key)!), `${lang} ${key}`).toEqual(richTags(message));
      }
    }
  });

  it("fill placeholders and plurals in each language, numbers with Latin digits", () => {
    expect(getT("en")("plans.startWith", { plan: "Pro" })).toBe("Start with Pro");
    expect(getT("en")("plans.languages", { count: 1 })).toBe("1 language");
    expect(getT("en")("plans.languages", { count: 3 })).toBe("3 languages");
    expect(getT("ar")("plans.languages", { count: 2 })).toBe("لغتان");
    expect(getT("ar")("plans.languages", { count: 3 })).toBe("3 لغات");
    expect(getT("tr")("plans.upToUsers", { count: 10000 })).toBe("10.000 kullanıcıya kadar");
    expect(getT("ar")("plans.upToUsers", { count: 10000 })).toBe("حتى 10,000 مستخدم");
    expect(formatMessage("ar", messagesFor("ar").footer.legalLine, { year: "2026" })).toBe("© 2026 Yallapp · القاهرة، مصر");
  });

  it("translate the sign-in forms' errors, numbers included", () => {
    expect(translateKnown("ar", "formErrors", "The email or password is incorrect.")).toBe(messagesFor("ar").formErrors.wrongPassword);
    expect(translateKnown("tr", "formErrors", "Use at least 10 characters.")).toBe("En az 10 karakter kullanın.");
    expect(translateKnown("en", "formErrors", "Use at least 10 characters.")).toBe("Use at least 10 characters.");
    expect(translateKnown("ar", "formErrors", "Something unknown.")).toBe("Something unknown.");
  });

  it("remember a language in a cookie, and read only ours", () => {
    expect(langCookie("ar")).toBe("yallapp_lang=ar; Path=/; Max-Age=31536000; SameSite=Lax");
    expect(langFromCookie("a=1; yallapp_lang=tr; b=2")).toBe("tr");
    expect(langFromCookie("yallapp_lang=fr")).toBeNull();
    expect(langOf("xx")).toBe("en");
    expect(LANGS).toEqual(["en", "ar", "tr"]);
  });
});

describe("55 addresses in each language", () => {
  it("keep English addresses and put Arabic and Turkish under /ar and /tr", () => {
    expect(localePath("en", "/pricing")).toBe("/pricing");
    expect(localePath("ar", "/pricing")).toBe("/ar/pricing");
    expect(localePath("tr", "/")).toBe("/tr");
    expect(localePath("ar", "/docs/shopify#step")).toBe("/ar/docs/shopify#step");
    expect(localePath("tr", "/solutions/clinic")).toBe("/tr/solutions/clinic");
    // The rest has one address in every language.
    for (const path of ["/dashboard", "/dashboard/license#change-plan", "/pay/x", "/shop/a/b", "/developers/openapi.yaml", "/demo/download/academy", "/pending", "https://wa.me/1"]) {
      expect(localePath("ar", path), path).toBe(path);
    }
    expect(isLocalizedPath("/docs/a/b")).toBe(false);
  });

  it("find the language of an address and switch it", () => {
    expect(splitLangPath("/ar/pricing")).toEqual({ lang: "ar", path: "/pricing" });
    expect(splitLangPath("/tr")).toEqual({ lang: "tr", path: "/" });
    expect(splitLangPath("/pricing")).toEqual({ lang: "en", path: "/pricing" });
    expect(splitLangPath("/arabic")).toEqual({ lang: "en", path: "/arabic" });
    expect(switchLangPath("/pricing", "ar")).toBe("/ar/pricing");
    expect(switchLangPath("/ar/pricing", "tr")).toBe("/tr/pricing");
    expect(switchLangPath("/tr/docs/shopify", "en")).toBe("/docs/shopify");
  });

  it("give every page hreflang alternates with English as x-default", () => {
    expect(languageAlternates("/faq")).toEqual({ en: "/faq", ar: "/ar/faq", tr: "/tr/faq", "x-default": "/faq" });
    const ar = siteMetadata("ar", { title: "الأسعار", description: "x", path: "/pricing", image: "/pricing/opengraph-image" });
    expect(ar.alternates).toEqual({ canonical: "/ar/pricing", languages: languageAlternates("/pricing") });
    expect(ar.openGraph).toMatchObject({ locale: "ar_EG", alternateLocale: ["en_US", "tr_TR"], url: "/ar/pricing" });
    expect((ar.openGraph!.images as { url: string }[])[0]!.url).toBe("/ar/pricing/opengraph-image");
    const enMeta = siteMetadata("en", { description: "x", path: "/" });
    expect(enMeta.alternates).toEqual({ canonical: "/", languages: languageAlternates("/") });
    expect(siteMetadata("tr", { description: "x", path: "/" }).openGraph).toMatchObject({ url: "/tr", locale: "tr_TR" });
  });

  it("list every page in the three languages in the sitemap, each naming the others", () => {
    const english = sitemapEntries(BASE);
    const all = siteSitemap(BASE, { "/terms": "15 October 2026" });
    expect(all).toHaveLength(english.length * 3);
    const urls = all.map((e) => e.url);
    for (const path of ["", "/ar", "/tr", "/pricing", "/ar/pricing", "/tr/docs/shopify", "/ar/solutions/clinic"]) expect(urls).toContain(`${BASE}${path}`);
    const pricing = all.find((e) => e.url === `${BASE}/ar/pricing`)!;
    expect(pricing.alternates).toEqual({ languages: { en: `${BASE}/pricing`, ar: `${BASE}/ar/pricing`, tr: `${BASE}/tr/pricing`, "x-default": `${BASE}/pricing` } });
    expect(all.find((e) => e.url === `${BASE}/tr/terms`)!.lastModified).toEqual(new Date(Date.UTC(2026, 9, 15)));
    for (const url of urls) for (const hidden of PRIVATE_PATHS) expect(url.slice(BASE.length).replace(/^\/(ar|tr)/, "").startsWith(hidden), url).toBe(false);
  });

  it("key the caches of the Arabic and Turkish priced pages on the country too", () => {
    for (const page of ["/ar", "/ar/pricing", "/ar/yallapp-studio", "/tr", "/tr/pricing", "/tr/yallapp-studio"]) expect(PRICED_PAGES).toContain(page);
  });

  it("103R give Yallapp Studio's page and its demo a version in every language, apart from /studio", () => {
    for (const path of ["/yallapp-studio", "/demo/studio"]) {
      expect(isLocalizedPath(path)).toBe(true);
      expect(localePath("ar", path)).toBe(`/ar${path}`);
      expect(localePath("tr", path)).toBe(`/tr${path}`);
    }
    // The Studio section of the account has one address in every language.
    expect(isLocalizedPath("/studio")).toBe(false);
    expect(localePath("ar", "/studio")).toBe("/studio");
    const nav = siteNavFor("tr", messagesFor("tr").nav);
    const product = nav.find((e) => e.id === "product");
    expect(product?.kind === "group" && product.items[0]).toMatchObject({ id: "studio", href: "/tr/yallapp-studio", label: "Yallapp Studio", description: "Uygulamanı özgürce tasarla" });
  });

  it("build the menu in each language with its links", () => {
    const nav = siteNavFor("ar", messagesFor("ar").nav);
    expect(nav.map((e) => e.label)).toEqual(["الرئيسية", "المنتج", "الأسعار", "تجربة", "المصادر", "تواصل معنا"]);
    expect(nav.flatMap((e) => (e.kind === "group" ? e.items.map((i) => i.href) : [e.href]))).toContain("/ar/how-it-works");
  });

  it("give Arabic headings their own anchors", () => {
    expect(headingId("قبل أن تبدأ")).toBe("قبل-أن-تبدأ".normalize("NFKD"));
    expect(headingId("Çağrı & Şule")).toBe("cagr-sule");
  });
});

describe("55 the long texts in Arabic and Turkish", () => {
  for (const lang of PREFIXED_LANGS) {
    const x = LOCALIZED[lang].marketing;

    it(`${lang}: the marketing lists mirror the English item by item`, () => {
      expect(Object.keys(x.screenAlt).sort()).toEqual(Object.keys(SCREEN_ALT).sort());
      for (const s of SOLUTIONS) {
        const t = x.solutions[s.kind]!;
        expect(t, s.kind).toBeDefined();
        expect(t.sources).toHaveLength(s.sources.length);
        expect(t.highlights).toHaveLength(s.highlights.length);
        expect(t.inTheApp).toHaveLength(s.inTheApp.length);
        expect(t.forYou).toHaveLength(s.forYou.length);
        expect(t.docs).toHaveLength(s.docs.length);
      }
      for (const g of INTEGRATION_GROUPS) {
        expect(Object.keys(x.integrations[g.id]!.items).sort(), g.id).toEqual(g.items.map((i) => i.name).sort());
        for (const item of g.items) for (const type of item.types) expect(x.kindNames[type], type).toBeTruthy();
      }
      for (const g of FEATURE_GROUPS) {
        const t = x.features[g.id]!;
        expect(t.features, g.id).toHaveLength(g.features.length);
        g.features.forEach((f, i) => expect(t.features[i]!.details, f.title).toHaveLength(f.details.length));
      }
      expect(x.comparison).toHaveLength(COMPARISON.length);
      expect(x.steps).toHaveLength(STEPS.length);
      x.steps.forEach((s, i) => expect(s.details).toHaveLength(STEPS[i]!.details.length));
      expect(x.requirements).toHaveLength(REQUIREMENTS.length);
      expect(Object.keys(x.demos).sort()).toEqual(Object.keys(DEMO_GUIDES).sort());
      for (const [id, guide] of Object.entries(DEMO_GUIDES)) expect(x.demos[id as keyof typeof DEMO_GUIDES].tryThis, id).toHaveLength(guide.tryThis.length);
      for (const plan of REGULAR_PLANS) expect(x.plans[plan].highlights, plan).toHaveLength(PLAN_INFO[plan].highlights.length);
    });

    it(`${lang}: the FAQ has the same questions and links`, () => {
      expect(x.faq).toHaveLength(FAQ.length);
      FAQ.forEach((group, i) => {
        expect(x.faq[i]!.items, group.title).toHaveLength(group.items.length);
        group.items.forEach((item, j) => expect(links(x.faq[i]!.items[j]!.a), item.q).toEqual(links(item.a)));
      });
      expect(parseFaq(faqMarkdown(faqFor(lang))).flatMap((g) => g.items)).toHaveLength(FAQ.flatMap((g) => g.items).length);
    });

    it(`${lang}: every text the team edits has a built-in translation`, () => {
      for (const page of CONTENT_PAGES) {
        const t = translatedDefaults(page, lang);
        for (const field of page.fields) expect(t[field.name], `${page.key}.${field.name}`).toBeTruthy();
        expect(JSON.stringify(t), page.key).not.toMatch(/\{(kinds|steps|plugins|platforms)\}/);
      }
    });

    it(`${lang}: every documentation article is translated with its sections, links and placeholders`, () => {
      for (const doc of DOCS) {
        const t = LOCALIZED[lang].docs[doc.slug]!;
        expect(t, doc.slug).toBeDefined();
        expect(headings(t.body), doc.slug).toEqual(headings(doc.body));
        expect(links(t.body), doc.slug).toEqual(links(doc.body));
        expect(fills(t.body), doc.slug).toEqual(fills(doc.body));
        expect(parseGuide(t.body).steps.length, doc.slug).toBe(parseGuide(doc.body).steps.length);
        expect(!!parseGuide(t.body).before, doc.slug).toBe(!!parseGuide(doc.body).before);
      }
    });

    it(`${lang}: the legal pages are translated with the same sections and contact details`, () => {
      for (const page of [PRIVACY, TERMS, REFUND]) {
        const t = LOCALIZED[lang].legal[page.key]!;
        expect(t, page.key).toBeDefined();
        expect(headings(t.body), page.key).toEqual(headings(page.body));
        expect(fills(t.body), page.key).toEqual(fills(page.body));
        expect(links(t.body), page.key).toEqual(links(page.body));
      }
    });
  }

  it("show a field in a language: the team's edit, the built-in translation, then the English", () => {
    const page = contentPage("home")!;
    const english = { ...page.defaults, title: "English title" };
    const ar = contentInLang(page, "ar", english, { intro: "مقدمة الفريق" });
    expect(ar.intro).toBe("مقدمة الفريق");
    expect(ar.title).toBe(LOCALIZED.ar.site.home!.title);
    expect(ar.badge).toBe("تطبيقات Android وiOS لـ 11 نوعًا من الأنشطة التجارية");
    expect(contentInLang(contentPage("solutions")!, "tr", { eyebrow: "E", title: "T", intro: "I" }, null).title).toBe(LOCALIZED.tr.site.solutions!.title);
    // A translation may leave fields empty; English must fill every one.
    expect(readContentForm(page, { title: "عنوان" }, { translation: true })).toEqual({ ok: true, fields: { title: "عنوان" } });
    expect(readContentForm(page, { title: "x" }).ok).toBe(false);
  });

  it("translate the plans' default words and keep the team's", () => {
    const ar = planFor("ar", PLAN_INFO.growth);
    expect(ar.tagline).toBe(LOCALIZED.ar.marketing.plans.growth.tagline);
    expect(planFor("ar", { ...PLAN_INFO.growth, tagline: "Our own words" }).tagline).toBe("Our own words");
    expect(planFor("en", PLAN_INFO.growth)).toEqual(PLAN_INFO.growth);
    expect(planLimitLinesFor("tr", PLAN_INFO.growth).map((l) => l.text)).toEqual(["10.000 kullanıcıya kadar", "3 dil", "Android ve iOS", "Videolar ve dosyalar için 20 GB"]);
    expect(planLimitLinesFor("en", PLAN_INFO.starter).map((l) => l.text)).toEqual(["Up to 1,000 users", "1 language", "Android", "2 GB for videos and files"]);
    expect(planStoresLineFor("ar", PLAN_INFO.pro)).toBe("5 متاجر · ننشر نيابةً عنك");
  });

  it("keep brand names and English names for the marks", () => {
    const groups = integrationGroupsFor("ar");
    expect(groups[0]!.items.find((i) => i.name === "WordPress posts")!.label).toBe("مقالات WordPress");
    expect(groups[1]!.items.find((i) => i.name === "Shopify")!.label).toBe("Shopify");
    expect(solutionsFor("tr").map((s) => s.id)).toEqual(SOLUTIONS.map((s) => s.id));
  });
});

describe("55 Arabic on the share images", () => {
  it("writes Arabic words in their joined forms, right to left, and keeps Latin words together", () => {
    expect(hasArabic("Yallapp")).toBe(false);
    // ع م ل ك: initial, medial, medial, final, drawn last letter first.
    expect(visualWord("عملك")).toBe("ﻚﻠﻤﻋ");
    // لا is one ligature.
    expect(visualWord("لا")).toBe("ﻻ");
    expect(rtlWords("على Google Play الآن")).toEqual([visualWord("على"), "Google Play", visualWord("الآن")]);
    expect(visualWord("متاجر.")).toBe(`.${visualWord("متاجر")}`);
  });
});
