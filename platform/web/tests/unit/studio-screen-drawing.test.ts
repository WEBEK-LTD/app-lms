import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudioView, type ScreenPartInfo } from "@/components/studio/view";
import { appPalette, subjectIcon } from "@/components/studio/app-screens";
import { ICON_NAMES } from "@/components/icon-names";
import { ACADEMY_PROJECT } from "@/lib/studio/academy";
import { screenDrawing, screenLookSection } from "@/lib/studio/screen-drawing";
import { screenWords } from "@/lib/studio/screen-words";
import type { StudioScreens } from "@/lib/studio/screens";
import { sampleEntries } from "@/lib/studio/sample-entries";
import type { StudioPage } from "@/lib/pages/types";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NOW } from "./helpers";

/**
 * 124.8 Studio's canvas draws the app's own screens under a page as the app
 * draws them, in the look chosen in Studio › Screens: which drawing for
 * which screen and look, where its look is chosen, and the drawing itself
 * (the premium My courses' large title and chips, the account's card, the
 * project's courses before the samples, right to left in Arabic); the
 * other screens keep a placeholder that names them and says the app draws
 * them, with the way to Screens when they have a look there.
 */

const PREMIUM: StudioScreens = ACADEMY_PROJECT.screens("https://yallapp.test");

describe("124.8 which drawing for which screen and look", () => {
  it("draws the premium academy's screens in their premium looks", () => {
    expect(screenDrawing("courses", "lms", PREMIUM)).toMatchObject({ screen: "catalog", look: "explore", card: { style: "premium" } });
    expect(screenDrawing("my_courses", "lms", PREMIUM)).toEqual({ screen: "my_courses", look: "premium" });
    expect(screenDrawing("account", "lms", PREMIUM)).toMatchObject({ screen: "account", look: "academy" });
    expect(screenDrawing("course", "lms", PREMIUM)).toMatchObject({ screen: "course", look: "premium", page: { cover: "full", bar: "glass" } });
    expect(screenDrawing("lesson", "lms", PREMIUM)).toEqual({ screen: "lesson", look: "premium" });
  });

  it("draws an academy's screens in the app's own looks without a design", () => {
    for (const screens of [null, undefined, {}]) {
      expect(screenDrawing("courses", "lms", screens)).toEqual({ screen: "catalog", look: "default", card: null });
      expect(screenDrawing("my_courses", "lms", screens)).toEqual({ screen: "my_courses", look: "default" });
      expect(screenDrawing("account", "lms", screens)).toMatchObject({ screen: "account", look: "plain" });
      expect(screenDrawing("course", "lms", screens)).toMatchObject({ screen: "course", look: "default", page: { cover: "classic", bar: "classic" } });
      expect(screenDrawing("lesson", "lms", screens)).toEqual({ screen: "lesson", look: "default" });
    }
    // The account's card in the main colour; a course page with its tall cover but not premium.
    expect(screenDrawing("account", "lms", { account_menu: { header: "card", items: [] } })).toMatchObject({ look: "card" });
    expect(screenDrawing("course", "lms", { course_page: { cover: "full", bar: "glass", hide: [] } })).toMatchObject({ look: "default", page: { cover: "full" } });
  });

  it("has no drawing yet for the other screens, the account's other tops and other kinds of app", () => {
    for (const header of ["cover", "tiles", "night"] as const) expect(screenDrawing("account", "lms", { account_menu: { header, items: [] } })).toBeNull();
    for (const screen of ["search", "favorites", "orders", "settings", "notifications", "quiz", "bundle", "certificates", "edit_profile"]) expect(screenDrawing(screen, "lms", PREMIUM)).toBeNull();
    for (const type of ["store", "food", "rides", "school", "delivery"]) {
      expect(screenDrawing("account", type, PREMIUM)).toBeNull();
      expect(screenDrawing("courses", type, PREMIUM)).toBeNull();
    }
    expect(screenDrawing(null, "lms", PREMIUM)).toBeNull();
    expect(screenDrawing(undefined, "lms", PREMIUM)).toBeNull();
  });

  it("knows where in Studio › Screens each look is chosen", () => {
    expect(screenLookSection("courses", "lms")).toBe("h-looks");
    expect(screenLookSection("my_courses", "lms")).toBe("h-looks");
    expect(screenLookSection("lesson", "lms")).toBe("h-looks");
    expect(screenLookSection("course", "lms")).toBe("h-course-page");
    expect(screenLookSection("account", "lms")).toBe("h-account-menu");
    // Every app's account menu; nothing for a shop's cart or a school's timetable.
    expect(screenLookSection("account", "store")).toBe("h-account-menu");
    expect(screenLookSection("cart", "store")).toBeNull();
    expect(screenLookSection("school_timetable", "school")).toBeNull();
    expect(screenLookSection("courses", "store")).toBeNull();
    // Those ids are Studio › Screens' headings.
    const editor = readFileSync(path.resolve(__dirname, "../../src/app/dashboard/screens/editor.tsx"), "utf8");
    for (const id of ["h-looks", "h-course-page", "h-account-menu"]) expect(editor).toContain(`id="${id}"`);
  });

  it("speaks the app's words in English, Arabic and Turkish, English for another language", () => {
    expect(screenWords("en").myCourses).toBe("My courses");
    expect(screenWords("ar").myCourses).toBe("دوراتي");
    expect(screenWords("tr").myCourses).toBe("Kurslarım");
    expect(screenWords("fr").myCourses).toBe("My courses");
    expect(screenWords("en").lessons(1)).toBe("1 lesson");
    expect(screenWords("en").lessons(32)).toBe("32 lessons");
    expect(screenWords("ar").lessons(5)).toBe("5 دروس");
    expect(screenWords("ar").lessons(32)).toBe("32 درسًا");
    expect(screenWords("tr").doneOf(11, 18)).toBe("18 dersten 11");
    // The same keys in each language.
    expect(Object.keys(screenWords("ar")).sort()).toEqual(Object.keys(screenWords("en")).sort());
    expect(Object.keys(screenWords("tr")).sort()).toEqual(Object.keys(screenWords("en")).sort());
  });

  it("draws in the app's colours, the second colour for the accents", () => {
    expect(appPalette(false, "#1D2B4F", "#B8893A")).toMatchObject({ background: "#F4EFE6", surface: "#FFFFFF", text: "#0E0D24", accent: "#B8893A", primary: "#1D2B4F" });
    const night = appPalette(true, "#1D2B4F", "#B8893A");
    expect(night).toMatchObject({ background: "#0B0A1C", text: "#F4EFE6", accent: "#B8893A" });
    // A dark main colour is lightened at night, to stand out on the cards.
    expect(night.primary).not.toBe("#1D2B4F");
    // No second colour: Ember.
    expect(appPalette(false, "#1D2B4F", null).accent).toBe("#FF5A1F");
    expect(subjectIcon("UX Design")).toBe("palette");
    expect(subjectIcon("اللغات")).toBe("translate");
    expect(subjectIcon("Business")).toBe("trending_up");
    expect(subjectIcon("Cooking")).toBe("category");
  });

  it("draws only icons the site's icon font has (its subset, components/icon-names.ts)", () => {
    const icons = new Set<string>(ICON_NAMES);
    const used = new Set<string>();
    const everyMenuEntry: StudioScreens = { ...PREMIUM, account_menu: { header: "academy", items: ["orders", "points", "certificates", "memberships", "quiz_results", "live_classes", "learning_paths", "achievements", "wishlist", "downloads", "my_courses", "teachers", "teacher", "teach", "chat", "notifications", "settings", "help", "privacy", "terms"].map((key) => ({ key: key as "orders", hidden: false, label: {}, icon: null })) } };
    const designs: StudioScreens[] = [PREMIUM, everyMenuEntry, {}, { course_card: { style: "rich", hide: [] } }, { course_card: { style: "cover", hide: [] } }, { course_card: { style: "tile", hide: [] } }, { account_menu: { header: "card", items: [] } }];
    for (const screens of designs) {
      for (const screen of ["courses", "my_courses", "account", "course", "lesson"]) {
        for (const dark of [false, true]) {
          const html = draw(bare(screen), { name: screen, drawing: screenDrawing(screen, "lms", screens), looksHref: "/studio/project/screens#h-looks", words: PART_WORDS }, { dark });
          for (const m of html.matchAll(/class="material-symbols-rounded[^"]*"[^>]*>([a-z0-9_]+)</g)) used.add(m[1]!);
        }
      }
    }
    for (const subject of ["Design", "Programming", "Languages", "Business", "Marketing", "Photography", "Music", "Math", "Cooking"]) used.add(subjectIcon(subject));
    expect(used.size).toBeGreaterThan(30);
    for (const name of used) expect(icons.has(name), name).toBe(true);
  });
});

const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
const PART_WORDS = { drawnLook: "Drawn by the app; choose its look in Screens", drawnOwn: "Drawn by the app, with your content and colours", open: "Open Screens", hint: "My courses: the app's own screen" };
const TABS = [
  { id: "home", label: "Home", icon: "home", target: { type: "page" as const, page_slug: "home" } },
  { id: "learning", label: "Your courses", icon: "play_circle", translations: { ar: { label: "دوراتي" } }, target: { type: "page" as const, page_slug: "learning" } },
];

function draw(page: StudioPage, part: ScreenPartInfo, opts: { lang?: string; dark?: boolean; courses?: { id: string; title: string }[] } = {}): string {
  const lang = (opts.lang ?? "en") as "en";
  return renderToStaticMarkup(
    createElement(StudioView, {
      page,
      lang,
      defaultLang: "en",
      dark: opts.dark ?? false,
      look: { name: "Ufuq Academy", logoUrl: null, brand: "#1D2B4F", font: "Alexandria", tabs: TABS, activeTab: "learning", accent: "#B8893A" },
      pickable: { items: opts.courses ? { courses: opts.courses } : {}, categories: {}, samples: sampleEntries(NOW) },
      words: WORDS,
      screenPart: part,
    }),
  );
}

const bare = (screen: string): StudioPage => ({ body: { id: "body", type: "column", children: [] }, screen });

describe("124.8 the screen drawn on the canvas", () => {
  it("draws the premium My courses with the tab's name as its large title, this week, the chips and the courses", () => {
    const html = draw(bare("my_courses"), { name: "My courses", drawing: screenDrawing("my_courses", "lms", PREMIUM), looksHref: "/studio/project/screens#h-looks", words: PART_WORDS });
    expect(html).toContain('data-studio-screen-drawn="my_courses:premium"');
    expect(html).toContain(">Your courses<");
    expect(html).toContain("This week");
    expect(html).toContain("Learning 2");
    expect(html).toContain("Completed 1");
    expect(html).toContain("Saved");
    // The samples while the project has no courses; the placeholder gone.
    expect(html).toContain("UX Design Fundamentals");
    expect(html).not.toContain("data-studio-screen-placeholder");
    // In the project's second colour.
    expect(html).toContain("#B8893A");
  });

  it("draws the project's own courses before the samples, and in Arabic right to left in the app's words", () => {
    const own = draw(bare("my_courses"), { name: "My courses", drawing: screenDrawing("my_courses", "lms", PREMIUM), looksHref: null, words: PART_WORDS }, { courses: [{ id: "c1", title: "Calligraphy at home" }] });
    expect(own).toContain("Calligraphy at home");
    expect(own).not.toContain("UX Design Fundamentals");
    const ar = draw(bare("my_courses"), { name: "My courses", drawing: screenDrawing("my_courses", "lms", PREMIUM), looksHref: null, words: PART_WORDS }, { lang: "ar" });
    expect(ar).toContain('dir="rtl"');
    expect(ar).toContain(">دوراتي<");
    expect(ar).toContain("هذا الأسبوع");
    expect(ar).toContain("قيد التعلم");
  });

  it("hides the app's own My courses title under the page's header, as the app does", () => {
    const part = { name: "My courses", drawing: screenDrawing("my_courses", "lms", null), looksHref: null, words: PART_WORDS };
    expect(draw(bare("my_courses"), part)).toContain(">My courses<");
    const under = draw({ ...bare("my_courses"), header: { type: "title", title: "Learning" } }, part);
    expect(under).not.toContain(">My courses<");
    expect(under).toContain("In progress");
  });

  it("draws the academy's account card and its switches, and the course page's purchase in gold", () => {
    const account = draw(bare("account"), { name: "Account", drawing: screenDrawing("account", "lms", PREMIUM), looksHref: null, words: PART_WORDS });
    expect(account).toContain("data-screen-account-card");
    expect(account).toContain("Ufuq Academy");
    expect(account).toContain("My orders");
    expect(account).toContain("Dark mode");
    expect(account).toContain("Log out");
    const course = draw(bare("course"), { name: "A course", drawing: screenDrawing("course", "lms", PREMIUM), looksHref: null, words: PART_WORDS });
    expect(course).toContain("Join now");
    expect(course).toContain("Certified certificate");
    expect(course).toContain("Curriculum");
  });

  it("keeps an honest placeholder for a screen without a drawing: its name, that the app draws it, the way to its look", () => {
    const html = draw(bare("orders"), { name: "My orders", drawing: null, looksHref: null, words: PART_WORDS });
    expect(html).toContain("data-studio-screen-placeholder");
    expect(html).toContain("My orders");
    expect(html).toContain("Drawn by the app, with your content and colours");
    expect(html).not.toContain("data-studio-screen-looks");
    const account = draw(bare("account"), { name: "Account", drawing: null, looksHref: "/studio/project/screens#h-account-menu", words: PART_WORDS });
    expect(account).toContain("Drawn by the app; choose its look in Screens");
    expect(account).toContain('href="/studio/project/screens#h-account-menu"');
    expect(account).toContain("Open Screens");
  });
});
