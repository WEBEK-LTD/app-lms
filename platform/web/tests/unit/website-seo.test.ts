import { existsSync, readdirSync, readFileSync } from "node:fs";
import { STORY_IDS, storyPath } from "@/site/story/types";
import { STUDIO_ONLY_KINDS } from "@/lib/studio/section";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DOCS } from "@/content/docs";
import { PRIVACY, REFUND, TERMS } from "@/content/legal";
import { KINDS } from "@/lib/app/kinds";
import { COMPANY_PLACE, legalLine } from "@/lib/company";
import { contentPage } from "@/lib/content/site";
import { parseMarkdown } from "@/lib/content/markdown";
import { EMAIL_TEMPLATES } from "@/lib/email/templates";
import { compareParams } from "@/lib/compare";
import { ALL_SOLUTIONS, countAtLeast, FAQ, INTEGRATION_COUNTS, numberWord, SOLUTIONS, STEPS } from "@/lib/marketing";
import { PLAN_INFO, planLimitLines, plansWith } from "@/lib/plans";
import {
  blocksText,
  breadcrumbLd,
  DEFAULT_SHARE_IMAGE,
  faqLd,
  jsonLdText,
  LOGO_PATH,
  organizationLd,
  pageMetadata,
  SITE_ICONS,
  siteMetadata,
  siteUrl,
  softwareLd,
  websiteLd,
} from "@/lib/seo";
import { activeEntry, SITE_NAV } from "@/lib/site-nav";
import { parseUpdated, PRIVATE_PATHS, robotsRules, sitemapEntries, siteSitemap } from "@/lib/sitemap";
import { deployRobotsHeaders, indexableContext } from "@/lib/indexing";
import { getSiteContent } from "@/lib/content/get";
import { solutionsFor } from "@/lib/marketing-lang";
import { LANGS } from "@/i18n/config";
import { messagesFor } from "@/i18n";
import { isLocalizedPath, localePath } from "@/i18n/paths";
import nextConfig from "../../next.config";

const BASE = "https://yallapp.test";

describe("32 the website's menu", () => {
  it("has Home, Product, Studio and Resources lists, then Pricing, Demo and Contact", () => {
    // 103R Studio has its own list on the bar, with "New".
    expect(SITE_NAV.map((e) => e.label)).toEqual(["Home", "Product", "Studio", "Pricing", "Demo", "Resources", "Contact"]);
    expect(SITE_NAV.map((e) => e.kind)).toEqual(["link", "group", "group", "link", "link", "group", "link"]);
    const hrefs = (id: string) => SITE_NAV.flatMap((e) => (e.kind === "group" && e.id === id ? e.items.map((i) => i.href) : []));
    expect(hrefs("product")).toEqual(["/solutions", "/features", "/integrations", "/how-it-works"]);
    // Studio's list: its page, the apps made in it (their story pages, under a heading) and its demo.
    expect(hrefs("studio")).toEqual([
      "/yallapp-studio",
      "/yallapp-studio/school",
      "/yallapp-studio/rides",
      "/yallapp-studio/delivery",
      "/yallapp-studio/multi-vendor",
      "/yallapp-studio/academy",
      "/demo/studio",
    ]);
    const studio = SITE_NAV.find((e) => e.id === "studio");
    expect(studio?.kind === "group" && studio.items.filter((i) => i.heading).map((i) => i.id)).toEqual(["story-school"]);
    expect(hrefs("resources")).toEqual(["/docs", "/faq", "/developers"]);
  });

  it("marks the page's own link, or the list it's in", () => {
    expect(activeEntry("pricing")).toBe("pricing");
    // Studio's page, its story pages and its demo mark the Studio list.
    expect(activeEntry("studio")).toBe("studio");
    expect(activeEntry("story-rides")).toBe("studio");
    expect(activeEntry("studio-demo")).toBe("studio");
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
    expect(TERMS.body).toContain("## 17. Disputes and your rights");
    // 77 The business is responsible for its app's chat.
    expect(TERMS.body).toContain("## 11. Chat in your app");
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
    // 104 The site counts the kinds it has a page for (Studio's own kinds, 105.1 food delivery too, get theirs when they open to everyone).
    expect(home.solutionsTitle).toBe(`One platform, ${numberWord(KINDS.filter((k) => !STUDIO_ONLY_KINDS.has(k.id)).length)} kinds of apps`);
    expect(home.solutionsTitle).toBe("One platform, eleven kinds of apps");
    expect(home.badge).toBe("Android and iOS apps for eleven kinds of business");
    expect(home.stepsTitle).toBe(`From sign-up to the app stores in ${numberWord(STEPS.length)} steps`);
    expect(contentPage("how-it-works")!.defaults.title).toBe(home.stepsTitle);
    expect(contentPage("integrations")!.defaults.intro).toContain("WordPress with 11 supported plugins, 10 online platforms, RSS feeds");
    const kinds = FAQ[0]!.items.find((i) => i.q === "Which kinds of apps can I build?")!.a;
    expect(kinds).toMatch(/^Eleven, each with its own screens: Academy, Store, /);
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

  it("67 never name a Netlify address, nor one that isn't a URL", () => {
    // Netlify sets URL to the site's own address, since the domain isn't added in Netlify (the proxy on host.webek.org).
    delete process.env.APP_URL;
    process.env.URL = "https://yallapp.netlify.app";
    expect(siteUrl()).toBe("https://yallapp.com.tr");
    process.env.APP_URL = "https://deploy-preview-12--yallapp.netlify.app/";
    expect(siteUrl()).toBe("https://yallapp.com.tr");
    process.env.APP_URL = "yallapp.com.tr";
    expect(siteUrl()).toBe("https://yallapp.com.tr");
    process.env.APP_URL = "https://yallapp.com.tr/";
    expect(siteUrl()).toBe("https://yallapp.com.tr");
    process.env.URL = "https://staging.example.test";
    delete process.env.APP_URL;
    expect(siteUrl()).toBe("https://staging.example.test");
  });

  it("list every public page in the sitemap, and nothing private", () => {
    const entries = sitemapEntries(BASE, { "/terms": "15 October 2026", "/privacy": "not a date" });
    const urls = entries.map((e) => e.url);
    for (const path of ["", "/solutions", "/features", "/integrations", "/how-it-works", "/pricing", "/yallapp-studio", "/demo", "/demo/studio", "/docs", "/developers", "/faq", "/contact", "/terms", "/privacy", "/refund", "/delete-account"]) {
      expect(urls).toContain(`${BASE}${path}`);
    }
    for (const s of ALL_SOLUTIONS) expect(urls).toContain(`${BASE}/solutions/${s.id}`);
    for (const d of DOCS) expect(urls).toContain(`${BASE}/docs/${d.slug}`);
    for (const id of STORY_IDS) expect(urls).toContain(`${BASE}${storyPath(id)}`);
    expect(urls).toHaveLength(18 + compareParams().length + ALL_SOLUTIONS.length + DOCS.length + STORY_IDS.length);
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
      title: { absolute: "Yallapp: make an app for your shop, school or delivery company" },
      openGraph: { title: "Yallapp: make an app for your shop, school or delivery company" },
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

  it("describes Yallapp, in Cairo, with the contact details (72: a number for Egypt and one for everywhere else)", () => {
    expect(organizationLd(BASE, { email: "hello@yallapp.test", whatsapp: "+90 544 000 00 00", whatsappEgypt: "+20 100 000 0000" })).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${BASE}/#organization`,
      name: "Yallapp",
      alternateName: expect.arrayContaining(["Yalla App", "يلا اب"]),
      url: `${BASE}/`,
      logo: `${BASE}${LOGO_PATH}`,
      description: expect.stringContaining("Google Play"),
      slogan: "Your business, as your own mobile app.",
      knowsAbout: expect.arrayContaining(["Yallapp", "mobile app builder", "WordPress to app"]),
      sameAs: [
        "https://www.facebook.com/profile.php?id=61595642630978",
        "https://www.instagram.com/ya.ll.app/",
        "https://www.linkedin.com/company/yallapp/",
      ],
      address: { "@type": "PostalAddress", addressLocality: "Cairo", addressCountry: "EG" },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "hello@yallapp.test",
          telephone: "+20 100 000 0000",
          url: `${BASE}/contact`,
          areaServed: "EG",
          availableLanguage: ["English", "Arabic"],
        },
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "hello@yallapp.test",
          telephone: "+90 544 000 00 00",
          url: `${BASE}/contact`,
          areaServed: { "@type": "Place", name: "Outside Egypt" },
          availableLanguage: ["English"],
        },
      ],
    });
    expect(websiteLd(BASE)).toMatchObject({ "@type": "WebSite", url: `${BASE}/`, publisher: { "@id": `${BASE}/#organization` } });
    // The names people search Yallapp by, in English and Arabic.
    expect(websiteLd(BASE).alternateName).toEqual(expect.arrayContaining(["Yalla App", "يلا اب"]));
  });

  it("offers only the plans that have a price", () => {
    const onRequest = softwareLd(BASE, Object.values(PLAN_INFO));
    expect(onRequest).toMatchObject({ "@type": "SoftwareApplication", name: "Yallapp", applicationCategory: "BusinessApplication" });
    // The brand, its other spellings and the terms people search app builders by.
    expect(onRequest).toMatchObject({ alternateName: expect.arrayContaining(["Yalla App"]), keywords: expect.stringContaining("mobile app builder") });
    expect(onRequest.featureList).toEqual(expect.arrayContaining([expect.stringContaining("AppGallery")]));
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

describe("67 Google: the favicon, and every public page indexed", () => {
  const PUBLIC = path.join(__dirname, "../../public");
  const BRAND = path.join(__dirname, "../../../../brand/favicon");
  const APP = path.join(__dirname, "../../src/app");
  const env = { APP_URL: process.env.APP_URL, URL: process.env.URL, CONTEXT: process.env.CONTEXT };
  afterEach(() => {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  /** Netlify's production build: no APP_URL, and URL is the site's netlify.app address. */
  const onNetlify = () => {
    delete process.env.APP_URL;
    process.env.URL = "https://yallapp.netlify.app";
    process.env.CONTEXT = "production";
  };

  /** A PNG's width and height, from its IHDR chunk. */
  const pngSize = (file: string): [number, number] => {
    const data = readFileSync(file);
    expect(data.subarray(1, 4).toString("latin1"), file).toBe("PNG");
    return [data.readUInt32BE(16), data.readUInt32BE(20)];
  };
  /** The images inside an .ico file, as "WxH" (a 0 byte means 256). */
  const icoSizes = (file: string): string[] => {
    const data = readFileSync(file);
    expect(data.readUInt16LE(2), file).toBe(1);
    return Array.from({ length: data.readUInt16LE(4) }, (_, i) => {
      const at = 6 + i * 16;
      return `${data[at] || 256}x${data[at + 1] || 256}`;
    });
  };
  const blocked = (url: string) => PRIVATE_PATHS.some((p) => url.startsWith(p));

  /** Every page.tsx under src/app with its route ("/docs/[slug]"), route groups left out. */
  const pages = (dir = APP, route = ""): { route: string; file: string }[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (e.isDirectory()) return pages(path.join(dir, e.name), /^\(.*\)$/.test(e.name) ? route : `${route}/${e.name}`);
      return e.name === "page.tsx" ? [{ route: route || "/", file: path.join(dir, e.name) }] : [];
    });
  /** Pages kept out of the sitemap: each one is noindex (checked below), or "page not found". */
  const NOT_LISTED = /^(\/\[lang\])?\/(dashboard|studio|admin|pay|give|receipts|fee-receipts|shop|r|pending|start|team|a|docs\/search|sign-in|sign-up|forgot-password|reset-password|unsubscribe|partner|join|\[\.\.\.rest\])(\/|$)/;

  it("links square PNG favicons of 48 px and more, /favicon.ico with 16, 32 and 48 px, the SVG and the Apple touch icon", () => {
    const pngs = SITE_ICONS.icon.filter((i) => i.type === "image/png");
    expect(pngs.map((i) => i.sizes)).toEqual(["48x48", "96x96", "192x192"]);
    for (const icon of pngs) {
      const [w, h] = pngSize(path.join(PUBLIC, icon.url));
      expect(`${w}x${h}`, icon.url).toBe(icon.sizes);
      expect(w % 48, icon.url).toBe(0);
    }
    const ico = SITE_ICONS.icon.find((i) => i.url === "/favicon.ico")!;
    expect(ico.type).toBe("image/x-icon");
    expect(icoSizes(path.join(PUBLIC, "favicon.ico")).sort()).toEqual(["16x16", "32x32", "48x48"]);
    expect(ico.sizes!.split(" ").sort()).toEqual(["16x16", "32x32", "48x48"]);
    expect(readFileSync(path.join(PUBLIC, "favicon.svg"), "utf8")).toMatch(/viewBox="0 0 64 64"/);
    expect(SITE_ICONS.apple).toEqual([{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]);
    expect(pngSize(path.join(PUBLIC, "apple-touch-icon.png"))).toEqual([180, 180]);
    expect(pngSize(path.join(PUBLIC, LOGO_PATH))).toEqual([512, 512]);
  });

  it("serves brand/favicon's files, unchanged", () => {
    for (const file of ["favicon.ico", "favicon.svg", "favicon-48x48.png", "favicon-96x96.png", "android-chrome-192x192.png", "android-chrome-512x512.png", "apple-touch-icon.png"]) {
      expect(readFileSync(path.join(PUBLIC, file)).equals(readFileSync(path.join(BRAND, file))), file).toBe(true);
    }
  });

  it("puts the icons on every page from the root layout only", () => {
    expect(readFileSync(path.join(APP, "layout.tsx"), "utf8")).toMatch(/icons: SITE_ICONS,/);
    // Next.js would add its own links for these files, next to or instead of the list above.
    for (const file of ["favicon.ico", "icon.png", "icon.svg", "icon.ico", "apple-icon.png", "[lang]/icon.png", "[lang]/favicon.ico"]) {
      expect(existsSync(path.join(APP, file)), file).toBe(false);
    }
    const sources = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sources(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []));
    expect(sources(APP).filter((f) => f !== path.join(APP, "layout.tsx") && /\bicons:/.test(readFileSync(f, "utf8")))).toEqual([]);
  });

  it("lets crawlers fetch the icons, the logo, the manifest and the share images, and names the sitemap on yallapp.com.tr", () => {
    for (const url of [...SITE_ICONS.icon, ...SITE_ICONS.apple].map((i) => i.url)) expect(blocked(url), url).toBe(false);
    for (const url of [LOGO_PATH, "/site.webmanifest", "/opengraph-image", "/ar/opengraph-image", "/pricing/opengraph-image", "/sitemap.xml"]) expect(blocked(url), url).toBe(false);
    onNetlify();
    const robots = robotsRules(siteUrl());
    expect(robots.sitemap).toBe("https://yallapp.com.tr/sitemap.xml");
    expect(robots.host).toBe("https://yallapp.com.tr");
    const rules = Array.isArray(robots.rules) ? robots.rules[0]! : robots.rules;
    expect(rules.allow).toBe("/");
    expect(rules.disallow).not.toContain("/");
  });

  it("lists every public page in English, Arabic and Turkish, on https://yallapp.com.tr", () => {
    onNetlify();
    const routes = pages().map((p) => p.route);
    const english = routes.filter((r) => !r.startsWith("/[lang]") && !NOT_LISTED.test(r));
    // Every Arabic and Turkish page has its English one.
    for (const r of routes.filter((r) => r.startsWith("/[lang]") && !NOT_LISTED.test(r))) expect(english, r).toContain(r.slice("/[lang]".length) || "/");
    const expected = english.flatMap((r) => {
      if (r === "/solutions/[id]") return ALL_SOLUTIONS.map((s) => `/solutions/${s.id}`);
      if (r === "/docs/[slug]") return DOCS.map((d) => `/docs/${d.slug}`);
      if (r === "/compare/[name]") return compareParams().map((c) => `/compare/${c.name}`);
      if (r === "/yallapp-studio/[story]") return STORY_IDS.map(storyPath);
      expect(r, `${r}: list its pages here and in lib/sitemap.ts`).not.toMatch(/\[/);
      return [r];
    });
    for (const p of expected) expect(isLocalizedPath(p), p).toBe(true);
    const base = siteUrl();
    expect(base).toBe("https://yallapp.com.tr");
    const address = (lang: (typeof LANGS)[number], p: string) => `${base}${localePath(lang, p) === "/" ? "" : localePath(lang, p)}`;
    const sitemap = siteSitemap(base);
    expect(sitemap.map((e) => e.url).sort()).toEqual(expected.flatMap((p) => LANGS.map((lang) => address(lang, p))).sort());
    for (const entry of sitemap) {
      expect(entry.url).toMatch(/^https:\/\/yallapp\.com\.tr(\/|$)/);
      expect(entry.url).not.toMatch(/netlify|localhost|\/$/);
    }
  });

  it("keeps the pages it leaves out noindex", () => {
    const left = pages().filter((p) => NOT_LISTED.test(p.route) && !p.route.endsWith("[...rest]"));
    expect(left.length).toBeGreaterThan(20);
    for (const { route, file } of left) {
      // The page itself, or a layout above it, says noindex.
      const files = [file];
      for (let dir = path.dirname(file); dir.startsWith(APP); dir = path.dirname(dir)) {
        if (existsSync(path.join(dir, "layout.tsx"))) files.push(path.join(dir, "layout.tsx"));
      }
      expect(/NO_INDEX|index: false/.test(files.map((f) => readFileSync(f, "utf8")).join("\n")), route).toBe(true);
    }
  });

  it("gives every page an absolute canonical on yallapp.com.tr and the same, reciprocal hreflang set in all three languages", () => {
    onNetlify();
    const base = siteUrl();
    const sitemap = siteSitemap(base);
    const byUrl = new Map(sitemap.map((e) => [e.url, e]));
    for (const entry of sitemap) {
      const languages = entry.alternates!.languages as Record<string, string>;
      expect(Object.keys(languages).sort()).toEqual(["ar", "en", "tr", "x-default"]);
      expect(Object.values(languages), entry.url).toContain(entry.url);
      expect(languages["x-default"]).toBe(languages.en);
      for (const href of Object.values(languages)) expect(byUrl.get(href)?.alternates, `${entry.url} → ${href}`).toEqual(entry.alternates);
    }
    // The pages' own tags, made absolute with the layout's metadataBase (siteUrl), match the sitemap.
    const absolute = (href: unknown) => new URL(String(href), base).href.replace(/\/$/, "");
    for (const lang of LANGS) {
      for (const p of ["/", "/pricing", "/docs/getting-started", "/solutions/clinic", "/delete-account"]) {
        const meta = siteMetadata(lang, { title: "T", description: "D", path: p });
        const canonical = absolute(meta.alternates!.canonical);
        expect(byUrl.has(canonical), `${lang} ${p}: ${canonical}`).toBe(true);
        const languages = Object.entries(meta.alternates!.languages as Record<string, string>).map(([k, v]) => [k, absolute(v)]);
        expect(Object.fromEntries(languages)).toEqual(byUrl.get(canonical)!.alternates!.languages);
        expect(meta.robots, `${lang} ${p}`).toBeUndefined();
      }
    }
  });

  it("never sends noindex from production, and always from deploy previews and branch deploys", async () => {
    expect(indexableContext("production")).toBe(true);
    expect(indexableContext(undefined)).toBe(true);
    expect(deployRobotsHeaders("production")).toEqual([]);
    expect(deployRobotsHeaders(undefined)).toEqual([]);
    for (const context of ["deploy-preview", "branch-deploy", "dev"]) {
      expect(deployRobotsHeaders(context)).toEqual([{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]);
    }
    const robotsSources = async () =>
      (await nextConfig.headers!()).filter((rule) => rule.headers.some((h) => h.key.toLowerCase() === "x-robots-tag")).map((rule) => rule.source);
    process.env.CONTEXT = "production";
    expect(await robotsSources()).toEqual(["/preview-app/:path*"]);
    process.env.CONTEXT = "deploy-preview";
    expect(await robotsSources()).toEqual(["/preview-app/:path*", "/:path*"]);
    // The root layout and the Arabic and Turkish one never say noindex.
    expect(readFileSync(path.join(APP, "layout.tsx"), "utf8")).not.toMatch(/robots/);
    expect(readFileSync(path.join(APP, "[lang]/layout.tsx"), "utf8")).not.toMatch(/robots/);
  });

  it("gives every public page its own title in each language", async () => {
    for (const lang of LANGS) {
      const m = messagesFor(lang).meta;
      const titles = [
        m.defaultTitle,
        m.solutionsTitle,
        m.featuresTitle,
        m.integrationsTitle,
        m.howTitle,
        m.pricingTitle,
        m.demoTitle,
        m.contactTitle,
        m.faqTitle,
        m.docsTitle,
        m.developersTitle,
        m.termsTitle,
        m.privacyTitle,
        m.refundTitle,
        m.deleteAccountTitle,
        ...solutionsFor(lang).map((s) => s.appsTitle),
        ...(await Promise.all(DOCS.map(async (d) => (await getSiteContent(d.key, lang)).title!))),
      ].map((t) => t.toLocaleLowerCase(lang));
      expect(titles.filter((t, i) => titles.indexOf(t) !== i), lang).toEqual([]);
    }
  });
});

describe("SEO search snippets and share images", () => {
  it("keeps the main pages' descriptions short enough for search results, in every language", () => {
    for (const lang of LANGS) {
      const m = messagesFor(lang);
      const descriptions = {
        default: m.meta.defaultDescription,
        solutions: m.meta.solutionsDescription,
        features: m.meta.featuresDescription,
        pricing: m.meta.pricingDescription,
        demo: m.meta.demoDescription,
        faq: m.meta.faqDescription,
        studio: m.studio.metaDescription,
      };
      // Bing reports descriptions over 160 characters (or under 25); 155 leaves room.
      for (const [page, text] of Object.entries(descriptions)) {
        expect(text.length, `${lang} ${page}`).toBeLessThanOrEqual(155);
        expect(text.length, `${lang} ${page}`).toBeGreaterThanOrEqual(50);
      }
    }
  });

  it("gives Yallapp Studio, Features and the FAQ their own share image, in English, Arabic and Turkish", () => {
    for (const page of ["yallapp-studio", "features", "faq"]) {
      expect(existsSync(path.join("src/app", page, "opengraph-image.tsx")), page).toBe(true);
      expect(existsSync(path.join("src/app/[lang]", page, "opengraph-image.tsx")), page).toBe(true);
    }
    for (const lang of LANGS) {
      const og = messagesFor(lang).og;
      for (const text of [og.studioTitle, og.studioText, og.featuresTitle, og.featuresText, og.faqTitle, og.faqText]) expect(text.trim().length, lang).toBeGreaterThan(0);
    }
  });
});

describe("SEO pages for Studio's kinds of business", () => {
  it("gives each of Studio's kinds a page with its own questions and answers, in every language", async () => {
    const { STUDIO_SOLUTIONS } = await import("@/lib/marketing");
    const { solutionFor } = await import("@/lib/marketing-lang");
    expect(STUDIO_SOLUTIONS.map((s) => s.id)).toEqual(["delivery", "food", "multi-vendor", "rides", "school", "university", "instructors"]);
    for (const lang of LANGS) for (const studio of STUDIO_SOLUTIONS) {
      const s = solutionFor(lang, studio.id)!;
      expect(s, lang).toBeDefined();
      expect(s.faq!.length, lang).toBeGreaterThanOrEqual(3);
      expect(s.faq).toHaveLength(studio.faq!.length);
      const text = [s.summary, ...s.highlights.map((h) => h.text), ...s.faq!.map((f) => f.a)].join(" ");
      // Not claimed: Yallapp Courier in the stores today, or fares by road distance.
      expect(text, lang).not.toMatch(/available on Google Play|متاح على Google Play|Google Play'de mevcut|road distance/i);
      expect(isLocalizedPath(`/solutions/${studio.id}`)).toBe(true);
    }
    // The regular kinds' list (home, /solutions) stays the regular kinds.
    expect(SOLUTIONS.some((s) => STUDIO_SOLUTIONS.some((o) => o.id === s.id))).toBe(false);
  });
});
