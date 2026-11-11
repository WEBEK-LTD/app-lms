import { describe, expect, it } from "vitest";
import { ar as studioAr, en as studioEn, tr as studioTr } from "@/i18n/dashboard/studio";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { itemSourcesFor } from "@/lib/pages/sources";
import type { StudioNode } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { ACADEMY_PROJECT, siteAddress } from "@/lib/studio/academy";
import { parseStudioScreens } from "@/lib/studio/screens";
import { TEMPLATES, templatesFor, type SectionContext, type SectionWord } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";

/**
 * 123 The premium academy (WordPress: Tutor LMS, Digits, WooCommerce): a
 * template for the whole project. A project started from it has its home,
 * a page around every other screen, the frosted bar with the student's
 * photo, the site's blog as a tab in the app, the sign-in screen over a
 * photo, the account menu at night in gold and the courses' looks.
 */

const NOW = new Date("2026-11-11T10:00:00Z");
const TEMPLATE = TEMPLATES.find((t) => t.id === "academy_premium")!;

function academy(): App {
  return { ...newApp("client", null, NOW, "lms", null), section: "studio", appName: "Nour Academy", primaryColor: ACADEMY_PROJECT.primary };
}

function context(app: App, lang: "en" | "ar" | "tr" = "en"): SectionContext {
  const words = { en: studioEn, ar: studioAr, tr: studioTr }[lang];
  let n = 0;
  return {
    brand: app.primaryColor,
    source: itemSourcesFor(app)[0] ?? null,
    app: app.appName!,
    lang,
    w: (word: SectionWord) => String(words[`w_${word}`]).replaceAll("{app}", app.appName!),
    newId: () => `n${++n}`,
    picture: (f) => `https://webek.org/design-pictures/${f}`,
  };
}

function start(site: string | null, lang: "en" | "ar" | "tr" = "en") {
  const app = academy();
  return startLayout(app, TEMPLATE, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, context(app, lang), site);
}

describe("123 the premium academy template", () => {
  it("is the academy's recommended start, offered first", () => {
    const list = templatesFor({ type: "lms", vertical: null });
    expect(list[0]!.id).toBe("academy_premium");
    expect(list[0]!.recommended).toBe(true);
    expect(list.map((t) => t.id)).toContain("courses");
  });

  it("starts the whole project, every page of it valid as saved", () => {
    const layout = start("https://nour.academy");
    const parsed = parseLayoutContent(JSON.parse(JSON.stringify(layout)), { app: academy(), now: NOW });
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    expect(layout.tabs.map((t) => t.id)).toEqual(["home", "courses", "blog", "learning", "account"]);
    expect(layout.tab_bar).toMatchObject({ design: "glass", avatar: true });
    expect(layout.appearance).toMatchObject({ secondary_color: "#B8893A", font_family: "Alexandria", arabic_font: "Alexandria" });
    // Every tab after the home opens its page around the screen, the blog the site's blog in the app.
    const blog = layout.tabs.find((t) => t.id === "blog")!;
    expect(blog.target).toEqual({ type: "url", url: "https://nour.academy/blog/", open_in: "in_app", web: { hide_header: true, hide_footer: true, links_inside: true } });
    for (const id of ["courses", "learning", "account"]) {
      const tab = layout.tabs.find((t) => t.id === id)!;
      expect(tab.target).toEqual({ type: "page", page_slug: id });
      expect(layout.pages.find((p) => p.slug === id)?.studio?.screen).toBeTruthy();
    }
    // And the screens a button opens: a course, the cart, settings.
    const screens = layout.pages.map((p) => p.studio?.screen).filter(Boolean);
    expect(screens).toEqual(expect.arrayContaining(["courses", "my_courses", "account", "settings", "notifications"]));
  });

  it("has no Blog tab until the site is known", () => {
    const layout = start(null);
    expect(layout.tabs.map((t) => t.id)).toEqual(["home", "courses", "learning", "account"]);
    expect(parseLayoutContent(JSON.parse(JSON.stringify(layout)), { app: academy(), now: NOW }).ok).toBe(true);
  });

  it("names the tabs and writes the home in each of Studio's languages, the others as translations", () => {
    const layout = start("https://nour.academy", "ar");
    // As the approved bar names them.
    expect(layout.tabs.map((t) => t.label)).toEqual(["الرئيسية", "استكشف", "المدونة", "دوراتي", "حسابي"]);
    expect(layout.tabs.find((t) => t.id === "blog")!.translations).toMatchObject({ en: { label: "Blog" }, tr: { label: "Blog" } });
    expect(layout.tabs.find((t) => t.id === "courses")!.translations).toMatchObject({ en: { label: "Explore" } });
    const home = layout.pages.find((p) => p.slug === "home")!.studio!;
    const texts = allNodes(home).filter((n: StudioNode) => n.type === "text" && n.text);
    const forYou = texts.find((n) => n.text === "اختيارات لك")!;
    expect(forYou.translations).toMatchObject({ en: { text: "Picked for you" }, tr: { text: "Senin için seçtiklerimiz" } });
    expect(texts.map((n) => n.text)).toContain("عرض الكل");
  });

  it("is the approved home: the greeting, the course they're taking, the streak beside the live class, courses picked for them", () => {
    const home = start(null).pages.find((p) => p.slug === "home")!.studio!;
    expect(home.header).toMatchObject({ type: "greeting", buttons: ["search", "notifications"] });
    const cards = allNodes(home).filter((n) => n.type === "learning");
    expect(cards.map((n) => n.learning!.section)).toEqual(["continue", "streak", "live"]);
    // The student's own cards for students; the banner for everyone else.
    expect(cards[0]!.visibility).toBe("signed_in");
    expect(allNodes(home).find((n) => n.type === "stack" && n.visibility === "signed_out")).toBeTruthy();
    const picked = allNodes(home).find((n) => n.type === "items")!;
    expect(picked).toMatchObject({ layout: "carousel", query: { sort: "popular" } });
    expect(allNodes({ body: picked.card! }).map((n) => n.bind).filter(Boolean)).toEqual(["image", "badge", "title", "subtitle", "price"]);
  });

  it("is light and dark: every coloured part of the home has its night colour", () => {
    const home = start(null).pages.find((p) => p.slug === "home")!.studio!;
    expect(home.dark_background).toBe("#0A0B10");
    expect(home.header).toMatchObject({ color: "#15131A", dark_color: "#F4F1EA" });
    for (const n of allNodes(home)) {
      // The parts on a picture or in gold look the same by night.
      if (n.background && !n.image_background_url && n.background !== ACADEMY_PROJECT.primary) expect(n.dark_background, n.id).toBeTruthy();
      if (n.color && n.color !== "#FFFFFF" && n.color !== "#2A1D05") expect(n.dark_color, n.id).toBeTruthy();
    }
  });

  it("is in the brand's colour: the banner follows the main colour", () => {
    const app = { ...academy(), primaryColor: "#7A1F3D" };
    const home = TEMPLATE.make(context(app));
    expect(allNodes(home).some((n) => n.type === "stack" && n.background === "#7A1F3D")).toBe(true);
  });

  it("designs the sign-in screen, the account menu and the courses, as the platform keeps them", () => {
    const screens = ACADEMY_PROJECT.screens("https://webek.org");
    const parsed = parseStudioScreens(JSON.parse(JSON.stringify(screens)));
    expect(parsed.problems).toEqual([]);
    expect(parsed.screens).toEqual(screens);
    expect(screens.sign_in).toMatchObject({ style: "photo", image_url: "https://webek.org/demo-screens/rawaq-library.jpg" });
    expect(screens.account_menu).toMatchObject({ header: "night", accent: "#E2BE74" });
    expect(screens.account_menu!.items.map((i) => i.key)).toEqual(expect.arrayContaining(["my_courses", "certificates", "settings", "privacy", "terms"]));
    expect(screens.course_card).toEqual({ style: "rich", radius: 20, hide: [] });
    expect(screens.course_page).toEqual({ cover: "full", bar: "glass", hide: [] });
  });

  it("reads the owner's website from sign-up as an https address", () => {
    expect(siteAddress("https://nour.academy/")).toBe("https://nour.academy");
    expect(siteAddress("nour.academy")).toBe("https://nour.academy");
    expect(siteAddress("https://nour.academy/ar/")).toBe("https://nour.academy/ar");
    expect(siteAddress("http://nour.academy")).toBeNull();
    expect(siteAddress("")).toBeNull();
    expect(siteAddress("localhost")).toBeNull();
  });
});
