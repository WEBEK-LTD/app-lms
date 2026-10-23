import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appFontFor, appTypeFor, isBrandColor, menuOf, normalizeColor, scanPage, scanSite, ScanError, siteAddress } from "@/lib/scan/site-scan";

/** 81.1 Site scan, on saved home pages of each platform (tests/unit/fixtures/sites). */

const page = (name: string, url = `https://${name}.example/`) => scanPage({ url, html: readFileSync(path.join(__dirname, "fixtures/sites", `${name}.html`), "utf8") });

describe("81.1 what a home page says", () => {
  it("a WordPress academy on Tutor LMS", () => {
    expect(page("wordpress-tutor")).toEqual({
      url: "https://wordpress-tutor.example/",
      name: "Cedar Academy",
      description: "Online courses in design and illustration.",
      language: "en",
      logoUrl: "https://cedar.example/wp-content/uploads/2026/03/cedar-logo.png",
      iconUrl: "https://cedar.example/wp-content/uploads/2026/03/cropped-cedar-180x180.png",
      colors: { primary: "#1f7a5c", accent: "#f2a33a", background: null },
      fonts: { found: ["Poppins", "Lora"], appFont: "Outfit" },
      platform: { id: "wordpress", name: "WordPress", plugins: ["tutor"] },
      appType: "lms",
      vertical: null,
      menu: [
        { label: "Courses", url: "https://wordpress-tutor.example/courses/" },
        { label: "About us", url: "https://wordpress-tutor.example/about-us/" },
        { label: "Blog", url: "https://wordpress-tutor.example/blog/" },
        { label: "Contact", url: "https://wordpress-tutor.example/contact/" },
      ],
    });
  });

  it("a WordPress restaurant on WooCommerce, in Turkish", () => {
    expect(page("wordpress-woocommerce-restaurant")).toMatchObject({
      name: "Lezzet Durağı",
      language: "tr",
      logoUrl: "https://wordpress-woocommerce-restaurant.example/wp-content/uploads/lezzet-logo.svg",
      iconUrl: "https://wordpress-woocommerce-restaurant.example/favicon.ico",
      colors: { primary: "#c0392b" },
      fonts: { found: ["Montserrat", "Open Sans"], appFont: "Outfit" },
      platform: { id: "wordpress", plugins: ["woocommerce"] },
      appType: "store",
      vertical: "restaurant",
    });
  });

  it("a Shopify shop: its theme's colour variables and its header logo", () => {
    expect(page("shopify")).toMatchObject({
      name: "Harbour Books",
      logoUrl: "https://harbourbooks.example/cdn/shop/files/harbour-logo.png?v=1&width=200",
      colors: { primary: "#0d3b66" },
      fonts: { found: ["Assistant", "Playfair Display"], appFont: "DM Sans" },
      platform: { id: "shopify", name: "Shopify" },
      appType: "store",
      vertical: null,
      // No <nav>: the header's links, without the cart and sign-in.
      menu: [
        { label: "Shop all", url: "https://shopify.example/collections/all" },
        { label: "Our story", url: "https://shopify.example/pages/our-story" },
      ],
    });
  });

  it("Salla and Zid shops, in Arabic", () => {
    expect(page("salla")).toMatchObject({
      name: "متجر الورد الأبيض",
      language: "ar",
      logoUrl: "https://cdn.salla.sa/store/logo.png",
      colors: { primary: "#7b2d8e", accent: "#5a1f69" },
      fonts: { found: ["Cairo"], appFont: "Lexend" },
      platform: { id: "salla", name: "Salla" },
      appType: "store",
    });
    expect(page("zid")).toMatchObject({
      name: "عطور النخبة",
      colors: { primary: "#b8860b" },
      fonts: { appFont: "Lexend" },
      platform: { id: "zid" },
      appType: "store",
    });
  });

  it("an ikas shop and a Wix clinic", () => {
    expect(page("ikas")).toMatchObject({ name: "Moda Atölye", colors: { primary: "#e85d75" }, fonts: { appFont: "Manrope" }, platform: { id: "ikas" }, appType: "store" });
    expect(page("wix-clinic")).toMatchObject({
      name: "Nile Dental Clinic",
      // Wix's own icon, the largest it gives.
      iconUrl: "https://static.wixstatic.com/media/abc_favicon.png/v1/fill/w_180,h_180/abc.png",
      colors: { primary: "#008080" },
      fonts: { found: ["lato"], appFont: "DM Sans" },
      platform: { id: "wix", name: "Wix" },
      appType: "booking",
      vertical: "clinic",
    });
  });

  it("a hand-made events site: its logo, never the payment logos", () => {
    expect(page("plain-events")).toMatchObject({
      name: "Gala Nights",
      logoUrl: "https://plain-events.example/img/gala-logo.svg",
      iconUrl: "https://plain-events.example/img/icon.png",
      colors: { primary: "#ff6b00", accent: "#e65f00" },
      fonts: { found: ["Bebas Neue"], appFont: "Bricolage Grotesque" },
      platform: { id: "other", name: "Your website", plugins: [] },
      appType: "events",
    });
  });
});

describe("81.1 the pieces", () => {
  it("reads colours as the web writes them, and leaves greys out", () => {
    expect(normalizeColor("#ABC")).toBe("#aabbcc");
    expect(normalizeColor("#1f7a5cff")).toBe("#1f7a5c");
    expect(normalizeColor("rgb(13, 59, 102)")).toBe("#0d3b66");
    expect(normalizeColor("13,59,102")).toBe("#0d3b66");
    expect(normalizeColor("var(--x)")).toBeNull();
    expect(normalizeColor("rgb(300,0,0)")).toBeNull();
    expect(isBrandColor("#ffffff")).toBe(false);
    expect(isBrandColor("#121212")).toBe(false);
    expect(isBrandColor("#777777")).toBe(false);
    expect(isBrandColor("#1f7a5c")).toBe(true);
  });

  it("matches fonts to the app's", () => {
    expect(appFontFor(["Manrope"])).toBe("Manrope");
    expect(appFontFor(["Some Custom Font", "Inter"])).toBe("Manrope");
    expect(appFontFor([])).toBe("Bricolage Grotesque");
  });

  it("picks the app type from plugins first, then words", () => {
    expect(appTypeFor({ id: "wordpress", plugins: ["amelia"] }, "Book a yoga class")).toEqual({ appType: "booking", vertical: "fitness" });
    expect(appTypeFor({ id: "wordpress", plugins: ["give"] }, "")).toEqual({ appType: "donations", vertical: "charity" });
    expect(appTypeFor({ id: "teachable", plugins: [] }, "")).toEqual({ appType: "lms", vertical: null });
    expect(appTypeFor({ id: "other", plugins: [] }, "Apartments for rent in Kadıköy")).toEqual({ appType: "real_estate", vertical: null });
    expect(appTypeFor({ id: "other", plugins: [] }, "Hello")).toEqual({ appType: "news", vertical: null });
    // 84.1 Service companies.
    expect(appTypeFor({ id: "other", plugins: [] }, "Home cleaning and repairs in Istanbul. Get a quote.")).toEqual({ appType: "booking", vertical: "services" });
    expect(appTypeFor({ id: "other", plugins: [] }, "Ev temizlik hizmetleri")).toEqual({ appType: "booking", vertical: "services" });
  });

  it("81.3 finds the main menu: never the footer's or the language list, never the cart, sign-in or the same page twice", () => {
    const html = `<header><nav class="lang-switcher"><a href="/?lang=ar">العربية</a></nav></header>
      <nav class="footer-links"><a href="/privacy">Privacy</a></nav>
      <nav class="primary-menu"><a href="/">Home</a><a href="/menu/">Our &amp; menu</a><a href="/menu">Menu again</a>
      <a href="https://www.cafe.example/visit">Visit</a><a href="/my-account/">My account</a><a href="/sepet">Sepet</a>
      <a href="/a-label-that-is-far-too-long-for-a-tab-anyway">A label that is far too long for a tab anyway</a></nav>`;
    expect(menuOf(html, "https://cafe.example/")).toEqual([
      { label: "Our & menu", url: "https://cafe.example/menu/" },
      { label: "Visit", url: "https://www.cafe.example/visit" },
    ]);
    // Eight at most.
    const many = `<nav>${Array.from({ length: 12 }, (_, i) => `<a href="/p${i}">Page ${i}</a>`).join("")}</nav>`;
    expect(menuOf(many, "https://cafe.example/")).toHaveLength(8);
    expect(menuOf("<main>No menu</main>", "https://cafe.example/")).toEqual([]);
  });

  it("keeps only web addresses for pictures", () => {
    for (const src of ["javascript:alert(1)", " JavaScript:alert(1)", "data:image/png;base64,AAAA", "vbscript:msgbox(1)"]) {
      expect(scanPage({ url: "https://cafe.example/", html: `<header><img class="custom-logo" src="${src}"></header>` }).logoUrl).toBeNull();
    }
    expect(scanPage({ url: "https://cafe.example/", html: '<img class="custom-logo" src="/logo.png">' }).logoUrl).toBe("https://cafe.example/logo.png");
  });

  it("takes the address as people type it", () => {
    expect(siteAddress("cedar.example")).toBe("https://cedar.example/");
    expect(siteAddress(" http://cedar.example/shop ")).toBe("http://cedar.example/shop");
    expect(siteAddress("localhost")).toBeNull();
    expect(siteAddress("ftp://cedar.example")).toBeNull();
    expect(siteAddress("https://user:pw@cedar.example")).toBeNull();
  });
});

describe("81.1 reading a site", () => {
  const html = readFileSync(path.join(__dirname, "fixtures/sites/ikas.html"), "utf8").replace(
    '<link rel="manifest" href="/manifest.json">',
    '<link rel="manifest" href="/manifest.json"><link rel="stylesheet" href="/theme.css"><link rel="stylesheet" href="https://cdn.other.example/x.css">',
  );
  function site(overrides: Record<string, () => Response> = {}) {
    const asked: string[] = [];
    const fetcher = (async (url: string) => {
      asked.push(url);
      const answer = overrides[url];
      if (answer) return answer();
      if (url === "https://moda.example/") return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
      if (url === "https://moda.example/manifest.json") {
        return Response.json({ name: "Moda Atölye", theme_color: "#e85d75", background_color: "#fff7f8", icons: [{ src: "/icons/512.png", sizes: "512x512" }] });
      }
      if (url === "https://moda.example/theme.css") return new Response(".btn{background:#2a9d8f}.badge{color:#2a9d8f}", { headers: { "content-type": "text/css" } });
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;
    return { asked, fetcher };
  }

  it("reads the home page, its manifest and its own stylesheets, never another site's", async () => {
    const { asked, fetcher } = site();
    const scan = await scanSite("moda.example", { fetcher });
    expect(scan).toMatchObject({
      url: "https://moda.example/",
      name: "Moda Atölye",
      // The manifest's largest icon.
      iconUrl: "https://moda.example/icons/512.png",
      colors: { primary: "#e85d75", accent: "#2a9d8f", background: "#fff7f8" },
      platform: { id: "ikas" },
    });
    expect(asked.sort()).toEqual(["https://moda.example/", "https://moda.example/manifest.json", "https://moda.example/theme.css"]);
  });

  it("says why it couldn't", async () => {
    await expect(scanSite("not a site", {})).rejects.toMatchObject({ code: "invalid_url" });
    const down = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    await expect(scanSite("moda.example", { fetcher: down })).rejects.toMatchObject({ code: "unreachable" });
    await expect(scanSite("moda.example", site({ "https://moda.example/": () => new Response("no", { status: 503 }) }))).rejects.toMatchObject({
      code: "unreachable",
      message: "Your website answered with an error (HTTP 503).",
    });
    await expect(scanSite("moda.example", site({ "https://moda.example/": () => Response.json({ a: 1 }) }))).rejects.toBeInstanceOf(ScanError);
    // A manifest that isn't JSON, or missing: the page is enough.
    const broken = site({ "https://moda.example/manifest.json": () => new Response("<html>", { headers: { "content-type": "text/html" } }) });
    expect((await scanSite("moda.example", broken)).name).toBe("Moda Atölye");
  });

  it("reads no more of a page than it needs", async () => {
    const huge = `<html><head><title>Big</title><meta name="theme-color" content="#123abc"></head><body>${"x".repeat(3_000_000)}</body></html>`;
    const scan = await scanSite("big.example", { fetcher: (async () => new Response(huge, { headers: { "content-type": "text/html" } })) as unknown as typeof fetch });
    expect(scan).toMatchObject({ name: "Big", colors: { primary: "#123abc" } });
  });
});
