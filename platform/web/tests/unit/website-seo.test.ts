import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DOCS } from "@/content/docs";
import { PRIVACY, REFUND, TERMS } from "@/content/legal";
import { KINDS } from "@/lib/app/kinds";
import { COMPANY_PLACE, legalLine } from "@/lib/company";
import { contentPage } from "@/lib/content/site";
import { parseMarkdown } from "@/lib/content/markdown";
import { EMAIL_TEMPLATES } from "@/lib/email/templates";
import { countAtLeast, FAQ, INTEGRATION_COUNTS, numberWord, SOLUTIONS, STEPS } from "@/lib/marketing";
import { PLAN_INFO, planLimitLines, plansWith } from "@/lib/plans";
import {
  blocksText,
  breadcrumbLd,
  DEFAULT_SHARE_IMAGE,
  faqLd,
  jsonLdText,
  organizationLd,
  pageMetadata,
  siteUrl,
  softwareLd,
  websiteLd,
} from "@/lib/seo";
import { activeEntry, SITE_NAV } from "@/lib/site-nav";
import { parseUpdated, PRIVATE_PATHS, robotsRules, sitemapEntries } from "@/lib/sitemap";

const BASE = "https://yallapp.test";

describe("32 the website's menu", () => {
  it("has Home, Product and Resources lists, then Pricing, Demo and Contact", () => {
    expect(SITE_NAV.map((e) => e.label)).toEqual(["Home", "Product", "Pricing", "Demo", "Resources", "Contact"]);
    const hrefs = (id: string) => SITE_NAV.flatMap((e) => (e.kind === "group" && e.id === id ? e.items.map((i) => i.href) : []));
    expect(hrefs("product")).toEqual(["/solutions", "/features", "/integrations", "/how-it-works"]);
    expect(hrefs("resources")).toEqual(["/docs", "/faq", "/developers"]);
  });

  it("marks the page's own link, or the list it's in", () => {
    expect(activeEntry("pricing")).toBe("pricing");
    expect(activeEntry("features")).toBe("product");
    expect(activeEntry("how")).toBe("product");
    expect(activeEntry("developers")).toBe("resources");
    expect(activeEntry("home")).toBe("home");
    expect(activeEntry(undefined)).toBeNull();
  });
});

describe("32 the company details", () => {
  it("say Yallapp, Cairo, Egypt, with no registration number or UK address", () => {
    expect(legalLine(2027)).toBe("© 2027 Yallapp · Cairo, Egypt");
    expect(legalLine()).toBe(`© ${new Date().getFullYear()} Yallapp · ${COMPANY_PLACE}`);
    const old = /WEBEK LTD|England|Wales|16326894|Shelton|London|United Kingdom|UK GDPR|Data Protection Act 2018/;
    for (const page of [PRIVACY, TERMS, REFUND]) expect(page.body, page.key).not.toMatch(old);
    for (const template of EMAIL_TEMPLATES) expect(template.body, template.key).not.toMatch(old);
    // The source of the public pages and the email footer.
    const root = path.join(__dirname, "../../src");
    for (const file of ["components/brand.tsx", "components/site-chrome.tsx", "app/contact/page.tsx", "lib/email/templates.ts", "content/legal.ts"]) {
      expect(readFileSync(path.join(root, file), "utf8"), file).not.toMatch(old);
    }
  });

  it("name the operator and a neutral way to settle disputes in the legal pages", () => {
    expect(PRIVACY.body).toContain("Yallapp is based in Cairo, Egypt, and is the data controller");
    expect(PRIVACY.body).toContain("where they apply, the EU General Data Protection Regulation (GDPR) and the Turkish Personal Data Protection Law No. 6698 (KVKK)");
    expect(TERMS.body).toContain("In these terms, “we” and “us” mean Yallapp.");
    expect(TERMS.body).toContain("## 16. Disputes and your rights");
    expect(TERMS.body).toContain("within 30 days");
    expect(TERMS.body).toContain("including consumer and data protection rights");
    expect(TERMS.body).not.toMatch(/governed by the laws of/);
    expect(TERMS.body).toContain("Yallapp, Cairo, Egypt. Email: [{{contact_email}}](mailto:{{contact_email}})");
  });
});

describe("32 the home page's texts and counts", () => {
  it("counts from the registries, not from words in the text", () => {
    expect(numberWord(10)).toBe("ten");
    expect(numberWord(5)).toBe("five");
    expect(numberWord(42)).toBe("42");
    expect(countAtLeast(23)).toBe("20+");
    expect(countAtLeast(7)).toBe("7");
    expect(INTEGRATION_COUNTS).toEqual({ plugins: 11, platforms: 10 });
  });

  it("has a plan title for four plans and counts in the defaults", () => {
    const home = contentPage("home")!.defaults;
    expect(home.plansTitle).toBe("A plan for every app");
    expect(home.solutionsTitle).toBe(`One platform, ${numberWord(KINDS.length)} kinds of apps`);
    expect(home.solutionsTitle).toBe("One platform, ten kinds of apps");
    expect(home.badge).toBe("Android and iOS apps for ten kinds of business");
    expect(home.stepsTitle).toBe(`From sign-up to the app stores in ${numberWord(STEPS.length)} steps`);
    expect(contentPage("how-it-works")!.defaults.title).toBe(home.stepsTitle);
    expect(contentPage("integrations")!.defaults.intro).toContain("WordPress with 11 supported plugins, 10 online platforms, RSS feeds");
    const kinds = FAQ[0]!.items.find((i) => i.q === "Which kinds of apps can I build?")!.a;
    expect(kinds).toMatch(/^Ten, each with its own screens: Academy, Store, /);
    expect(kinds).toContain(SOLUTIONS[SOLUTIONS.length - 1]!.name);
  });

  it("gives every step an icon and one short sentence", () => {
    for (const step of STEPS) {
      expect(step.icon).toBeTruthy();
      expect(step.short.length, step.title).toBeLessThanOrEqual(60);
      expect(step.short.endsWith("."), step.title).toBe(true);
    }
  });

  it("shows each plan's key limits in a few words", () => {
    expect(planLimitLines(PLAN_INFO.starter).map((l) => l.text)).toEqual(["Up to 1,000 users", "1 language", "Android", "2 GB for videos and files"]);
    expect(planLimitLines(PLAN_INFO.growth).map((l) => l.text)).toEqual(["Up to 10,000 users", "3 languages", "Android and iOS", "20 GB for videos and files"]);
    expect(planLimitLines(PLAN_INFO.pro).map((l) => l.text)).toEqual(["Unlimited users", "All languages", "Android and iOS", "100 GB for videos and files"]);
  });
});

describe("32 search engines", () => {
  const env = { APP_URL: process.env.APP_URL, URL: process.env.URL };
  afterEach(() => {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("use APP_URL, the host's URL or yallapp.com.tr as the site's address", () => {
    process.env.APP_URL = "https://example.test/";
    expect(siteUrl()).toBe("https://example.test");
    delete process.env.APP_URL;
    process.env.URL = "https://site.netlify.test";
    expect(siteUrl()).toBe("https://site.netlify.test");
    delete process.env.URL;
    expect(siteUrl()).toBe("https://yallapp.com.tr");
  });

  it("list every public page in the sitemap, and nothing private", () => {
    const entries = sitemapEntries(BASE, { "/terms": "15 October 2026", "/privacy": "not a date" });
    const urls = entries.map((e) => e.url);
    for (const path of ["", "/solutions", "/features", "/integrations", "/how-it-works", "/pricing", "/demo", "/docs", "/developers", "/faq", "/contact", "/terms", "/privacy", "/refund"]) {
      expect(urls).toContain(`${BASE}${path}`);
    }
    for (const s of SOLUTIONS) expect(urls).toContain(`${BASE}/solutions/${s.id}`);
    for (const d of DOCS) expect(urls).toContain(`${BASE}/docs/${d.slug}`);
    expect(urls).toHaveLength(14 + SOLUTIONS.length + DOCS.length);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url.startsWith(BASE)).toBe(true);
      for (const hidden of ["/dashboard", "/admin", "/api", "/pay", "/give", "/receipts", "/shop", "/oauth", "/sign-in", "/sign-up", "/pending"]) {
        expect(url.slice(BASE.length).startsWith(hidden), url).toBe(false);
      }
    }
    expect(entries.find((e) => e.url === `${BASE}/terms`)!.lastModified).toEqual(new Date(Date.UTC(2026, 9, 15)));
    expect(entries.find((e) => e.url === `${BASE}/privacy`)!.lastModified).toBeUndefined();
    expect(entries[0]).toMatchObject({ url: BASE, priority: 1 });
  });

  it("read the legal pages' dates", () => {
    expect(parseUpdated("14 October 2026")).toEqual(new Date(Date.UTC(2026, 9, 14)));
    expect(parseUpdated(" 1 may 2027 ")).toEqual(new Date(Date.UTC(2027, 4, 1)));
    expect(parseUpdated("Octember 3 2026")).toBeNull();
    expect(parseUpdated(undefined)).toBeNull();
  });

  it("keep the private areas out in robots.txt and point to the sitemap", () => {
    const robots = robotsRules(BASE);
    expect(robots.sitemap).toBe(`${BASE}/sitemap.xml`);
    expect(robots.host).toBe(BASE);
    const rules = Array.isArray(robots.rules) ? robots.rules[0]! : robots.rules;
    expect(rules).toMatchObject({ userAgent: "*", allow: "/" });
    for (const path of ["/dashboard", "/admin", "/api/", "/pay/", "/give/", "/receipts/", "/oauth/", "/shop/"]) expect(rules.disallow).toContain(path);
    expect(PRIVATE_PATHS).not.toContain("/docs");
  });

  it("give each public page a canonical address and its own link previews", () => {
    expect(pageMetadata({ title: "Pricing", description: "Plans.", path: "/pricing" })).toEqual({
      title: "Pricing",
      description: "Plans.",
      alternates: { canonical: "/pricing" },
      openGraph: { type: "website", siteName: "Yallapp", locale: "en_US", url: "/pricing", title: "Pricing · Yallapp", description: "Plans.", images: [DEFAULT_SHARE_IMAGE] },
      twitter: { card: "summary_large_image", title: "Pricing · Yallapp", description: "Plans.", images: [DEFAULT_SHARE_IMAGE] },
    });
    expect(DEFAULT_SHARE_IMAGE).toMatchObject({ url: "/opengraph-image", width: 1200, height: 630 });
    // A section with its own share image names it.
    const own = pageMetadata({ title: "Connect Shopify", description: "Shopify.", path: "/docs/shopify", image: "/docs/shopify/opengraph-image" });
    expect(own.openGraph!.images).toEqual([{ url: "/docs/shopify/opengraph-image", width: 1200, height: 630, alt: "Connect Shopify · Yallapp" }]);
    expect(own.twitter!.images).toEqual(own.openGraph!.images);
    expect(pageMetadata({ description: "Home.", path: "/" })).toMatchObject({
      title: { absolute: "Yallapp: your business as your own mobile app" },
      openGraph: { title: "Yallapp: your business as your own mobile app" },
    });
  });
});

describe("32 structured data", () => {
  it("escapes JSON so it can't close its script", () => {
    const text = jsonLdText({ name: "</script><script>alert(1)</script> &  " });
    expect(text).not.toContain("<");
    expect(text).not.toContain(">");
    expect(text).not.toContain(" ");
    expect(JSON.parse(text)).toEqual({ name: "</script><script>alert(1)</script> &  " });
  });

  it("describes Yallapp, in Cairo, with the contact details", () => {
    expect(organizationLd(BASE, { email: "hello@yallapp.test", whatsapp: "+90 544 000 00 00" })).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${BASE}/#organization`,
      name: "Yallapp",
      url: `${BASE}/`,
      logo: `${BASE}/android-chrome-512x512.png`,
      address: { "@type": "PostalAddress", addressLocality: "Cairo", addressCountry: "EG" },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "hello@yallapp.test",
          telephone: "+90 544 000 00 00",
          url: `${BASE}/contact`,
          availableLanguage: ["English"],
        },
      ],
    });
    expect(websiteLd(BASE)).toMatchObject({ "@type": "WebSite", url: `${BASE}/`, publisher: { "@id": `${BASE}/#organization` } });
  });

  it("offers only the plans that have a price", () => {
    const onRequest = softwareLd(BASE, Object.values(PLAN_INFO));
    expect(onRequest).toMatchObject({ "@type": "SoftwareApplication", name: "Yallapp", applicationCategory: "BusinessApplication" });
    expect(onRequest).not.toHaveProperty("offers");

    const plans = plansWith({
      growth: { ...PLAN_INFO.growth, priceCents: 480000, onRequest: false, billingMonths: 12, version: 2 },
      pro: { ...PLAN_INFO.pro, priceCents: 495000, usdCents: 9900, onRequest: false, billingMonths: 1, version: 2 },
    });
    // 52 In the currency the page shows: pounds in Egypt, dollars elsewhere (by hand, or at the rate).
    const priced = softwareLd(BASE, Object.values(plans), { display: "EGP", egpPerUsd: 50 });
    expect(priced.offers).toEqual([
      {
        "@type": "Offer",
        name: "Growth",
        description: PLAN_INFO.growth.tagline,
        price: "4800.00",
        priceCurrency: "EGP",
        url: `${BASE}/pricing`,
        category: "subscription",
        priceSpecification: { "@type": "UnitPriceSpecification", price: "4800.00", priceCurrency: "EGP", billingDuration: "P1Y" },
      },
      {
        "@type": "Offer",
        name: "Pro",
        description: PLAN_INFO.pro.tagline,
        price: "4950.00",
        priceCurrency: "EGP",
        url: `${BASE}/pricing`,
        category: "subscription",
        priceSpecification: { "@type": "UnitPriceSpecification", price: "4950.00", priceCurrency: "EGP", billingDuration: "P1M" },
      },
    ]);
    const abroad = softwareLd(BASE, Object.values(plans), { display: "USD", egpPerUsd: 50 });
    expect((abroad.offers as { price: string; priceCurrency: string }[]).map((o) => [o.price, o.priceCurrency])).toEqual([
      ["96.00", "USD"],
      ["99.00", "USD"],
    ]);
  });

  it("lists the FAQ's questions with plain-text answers", () => {
    const answer = blocksText(parseMarkdown("Yes, **really**. See [the docs](/docs).\n\n- One\n- Two"));
    expect(answer).toBe("Yes, really. See the docs.\n\nOne\nTwo");
    expect(faqLd([{ question: "Is it free?", answer }])).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Is it free?", acceptedAnswer: { "@type": "Answer", text: answer } }],
    });
  });

  it("gives breadcrumbs from the home page", () => {
    expect(breadcrumbLd(BASE, [{ name: "Docs", path: "/docs" }, { name: "Connect Shopify", path: "/docs/shopify" }])).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
        { "@type": "ListItem", position: 2, name: "Docs", item: `${BASE}/docs` },
        { "@type": "ListItem", position: 3, name: "Connect Shopify", item: `${BASE}/docs/shopify` },
      ],
    });
  });
});
