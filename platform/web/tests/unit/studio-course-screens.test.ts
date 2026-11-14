import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CourseScreenDrawing, type CourseScreenPart } from "@/components/studio/course-screens";
import { newApp } from "@/lib/app/setup";
import { STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { demoStudioScreens } from "@/lib/demo/screens";
import { APP_WORDS } from "@/lib/studio/app-words";
import {
  CARD_LAYOUTS,
  CARD_PARTS,
  CARD_RATIOS,
  COURSE_LOOK_DEFAULTS,
  COURSE_LOOKS,
  LESSON_PARTS,
  LESSON_PLAYERS,
  LESSON_PROGRESS,
  MINE_LAYOUTS,
  MINE_PARTS,
  MINE_PROGRESS,
  PAGE_BARS,
  PAGE_HEROES,
  PAGE_PARTS,
  parseCourseScreens,
  resolveCourseScreens,
  signatureCourseScreens,
  type CourseScreens,
} from "@/lib/studio/course-screens";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { screenDrawing, screenLookSection } from "@/lib/studio/screen-drawing";
import { parseStudioScreens, screensConfig, type StudioScreens } from "@/lib/studio/screens";
import { NOW } from "./helpers";

/**
 * 130.52 Studio's course screens (`Config.screens.courses`): the model is
 * checked strictly and within its bounds, saved with Studio › Screens and
 * served to the app, drawn on Studio's canvas in each look and option,
 * given to the academies' four Signature looks with their words in Modern
 * Standard Arabic, and written into the contract; a project without it is
 * exactly as before.
 */

const academy = { ...newApp("client-1", null, NOW, "lms", null), backend: "hosted" as const, section: "studio" as const };

describe("the model", () => {
  it("keeps a look and every option the app knows", () => {
    const problems: string[] = [];
    const input: CourseScreens = {
      look: "index",
      accent: "#b8893a",
      card: { layout: "poster", ratio: "tall", scrim: 65, radius: 18, hide: ["price", "progress"] },
      page: { hero: "split", bar: "floating", hide: ["about"], cta: { en: " Join the class ", ar: "انضم إلى الصف" } },
      lesson: { player: "framed", progress: "segments", hide: ["up_next"] },
      my_courses: { layout: "grid", progress: "rings", hide: ["week"], headline: { en: "Pick up where you left off." } },
    };
    expect(parseCourseScreens(input, problems)).toEqual({
      ...input,
      accent: "#B8893A",
      page: { ...input.page, cta: { en: "Join the class", ar: "انضم إلى الصف" } },
    });
    expect(problems).toEqual([]);
  });

  it("is strict: an unknown look saves nothing, unknown values and numbers out of bounds are problems", () => {
    const problems: string[] = [];
    expect(parseCourseScreens({ look: "neon" }, problems)).toBeNull();
    expect(problems).toHaveLength(1);
    const more: string[] = [];
    const parsed = parseCourseScreens(
      {
        look: "cinema",
        accent: "gold",
        card: { layout: "carousel", ratio: "wide", scrim: 120, radius: -2, hide: ["teacher", "sparkles"] },
        page: { bar: "sticky", cta: { en: "x".repeat(25) } },
        lesson: { progress: "dots", hide: "notes" },
        my_courses: { headline: { en: "y".repeat(61) } },
      },
      more,
    );
    expect(parsed).toEqual({ look: "cinema", card: { ratio: "wide", hide: ["teacher"] }, page: { hide: [] }, lesson: { hide: [] }, my_courses: { hide: [] } });
    expect(more.length).toBeGreaterThanOrEqual(8);
    expect(more.join(" ")).toMatch(/accent/);
    expect(more.join(" ")).toMatch(/0 to 90/);
    expect(more.join(" ")).toMatch(/0 to 32/);
    expect(more.join(" ")).toMatch(/up to 24/);
    expect(more.join(" ")).toMatch(/up to 60/);
  });

  it("decides every option: the saved one, else the look's own", () => {
    for (const look of COURSE_LOOKS) {
      const r = resolveCourseScreens({ look });
      const d = COURSE_LOOK_DEFAULTS[look];
      expect(r.card).toEqual({ ...d.card, hide: [] });
      expect(r.page).toEqual({ ...d.page, hide: [], cta: {} });
      expect(r.lesson).toEqual({ ...d.lesson, hide: [] });
      expect(r.my_courses).toEqual({ ...d.my_courses, hide: [], headline: {} });
    }
    expect(resolveCourseScreens({ look: "ring", card: { layout: "poster", hide: [] } }).card.layout).toBe("poster");
    // The four looks are four different designs.
    expect(new Set(COURSE_LOOKS.map((l) => JSON.stringify(COURSE_LOOK_DEFAULTS[l]))).size).toBe(4);
  });

  it("is saved with Studio › Screens and served in Config.screens; a project without it is as before", () => {
    const { screens, problems } = parseStudioScreens({ courses: { look: "on_air", card: { hide: ["price"] } } });
    expect(problems).toEqual([]);
    expect(screens.courses).toEqual({ look: "on_air", card: { hide: ["price"] } });
    const served = screensConfig({ ...academy, hostedSettings: { ...academy.hostedSettings!, studioScreens: screens } });
    expect(served.screens?.courses).toEqual({ look: "on_air", card: { hide: ["price"] } });
    expect(parseStudioScreens({}).screens.courses).toBeUndefined();
    const old: StudioScreens = { course_card: { style: "premium", hide: [] } };
    expect(screensConfig({ ...academy, hostedSettings: { ...academy.hostedSettings!, studioScreens: old } }).screens).toEqual(old);
    // A save with a problem in it is refused.
    expect(parseStudioScreens({ courses: { look: "cinema", card: { radius: 90 } } }).problems).toHaveLength(1);
  });
});

describe("Studio's canvas", () => {
  const courses = sampleEntries(NOW).en!.courses!;
  const draw = (part: CourseScreenPart, value: CourseScreens, dark = false, lang = "en") =>
    renderToStaticMarkup(createElement(CourseScreenDrawing, { part, design: resolveCourseScreens(value), dark, lang, brand: "#1D2B4F", accent: "#B8893A", courses }));

  it("draws the course screens in the look on the pages around them, an academy's only", () => {
    const screens: StudioScreens = { courses: { look: "ring" }, looks: { lesson: "premium" } };
    expect(screenDrawing("courses", "lms", screens)).toMatchObject({ screen: "courses", part: "card", look: { look: "ring", card: { layout: "row" } } });
    expect(screenDrawing("course", "lms", screens)).toMatchObject({ screen: "courses", part: "page", look: { page: { hero: "framed", bar: "floating" } } });
    expect(screenDrawing("lesson", "lms", screens)).toMatchObject({ screen: "courses", part: "lesson", look: { lesson: { player: "framed", progress: "ring" } } });
    expect(screenDrawing("my_courses", "lms", screens)).toMatchObject({ screen: "courses", part: "mine", look: { my_courses: { layout: "grid" } } });
    expect(screenDrawing("lesson", "lms", { looks: { lesson: "premium" } })).toEqual({ screen: "lesson", look: "premium" });
    expect(screenDrawing("course", "food", screens)).toBeNull();
    expect(screenLookSection("course", "lms", screens)).toBe("h-course-screens");
    expect(screenLookSection("course", "lms", null)).toBe("h-course-page");
  });

  it("draws every option of each screen", () => {
    for (const layout of CARD_LAYOUTS) expect(draw("card", { look: "cinema", card: { layout, hide: [] } })).toContain(`data-course-card="${layout}"`);
    for (const hero of PAGE_HEROES) expect(draw("page", { look: "cinema", page: { hero, hide: [] } })).toContain(`data-course-hero="${hero}"`);
    for (const bar of PAGE_BARS) expect(draw("page", { look: "ring", page: { bar, hide: [] } })).toContain(`data-course-bar="${bar}"`);
    for (const player of LESSON_PLAYERS) expect(draw("lesson", { look: "index", lesson: { player, hide: [] } })).toContain(`data-course-player="${player}"`);
    for (const progress of LESSON_PROGRESS) expect(draw("lesson", { look: "index", lesson: { progress, hide: [] } })).toContain(`data-course-progress="${progress}"`);
    expect(draw("mine", { look: "cinema" })).toContain("data-course-continue");
    expect(draw("mine", { look: "cinema", my_courses: { hide: ["continue"] } })).not.toContain("data-course-continue");
    // The owner's words, in the language being edited.
    expect(draw("page", { look: "cinema", page: { hide: [], cta: { en: "Join the class", ar: "انضم إلى الصف" } } }, false, "ar")).toContain("انضم إلى الصف");
    expect(draw("mine", { look: "ring", my_courses: { hide: [], headline: { en: "Keep going." } } })).toContain("Keep going.");
    // The parts left out are not drawn; the rating only where a course has one.
    expect(draw("page", { look: "cinema", page: { hide: ["learn", "reviews", "teacher", "curriculum", "about"] } })).not.toContain("What you&#x27;ll learn");
    expect(draw("card", { look: "ring", card: { hide: ["rating"] } })).not.toContain("data-course-stars");
    expect(draw("card", { look: "ring" })).toContain("data-course-stars");
  });

  it("draws by night and right to left", () => {
    const night = draw("page", { look: "on_air" }, true, "ar");
    expect(night).toContain('dir="rtl"');
    expect(night).toContain("#0B0A1C");
    expect(draw("lesson", { look: "cinema" })).toContain('dir="ltr"');
  });
});

describe("the academies' Signature looks", () => {
  const looks = { premium_academy: ["cinema", "ring"], instructors: ["index", "on_air"] } as const;

  it("give each academy look its course screens, with their words in English, Modern Standard Arabic and Turkish", () => {
    for (const [demo, [a, b]] of Object.entries(looks) as [keyof typeof looks, readonly [string, string]][]) {
      for (const [letter, look] of [
        ["a", a],
        ["b", b],
      ] as const) {
        const screens = demoStudioScreens(demo, "https://yallapp.test", letter);
        expect(screens.courses?.look, `${demo} ${letter}`).toBe(look);
        // Saved as the platform saves it.
        expect(parseStudioScreens(screens).screens.courses).toEqual(screens.courses);
        expect(parseStudioScreens(screens).problems).toEqual([]);
        expect(Object.keys(screens.courses!.page!.cta!)).toEqual(["en", "ar", "tr"]);
        expect(screens.courses!.page!.cta!.ar).toMatch(/[؀-ۿ]/u);
        // The older looks stay for apps that don't know the course screens.
        expect(screens.course_page?.look).toBe("premium");
      }
    }
    expect(signatureCourseScreens("cinema").page?.cta).toEqual({ en: APP_WORDS.en.csCtaCinema, ar: APP_WORDS.ar.csCtaCinema, tr: APP_WORDS.tr.csCtaCinema });
  });

  it("leave every other demo's screens without them", () => {
    for (const demo of STUDIO_DEMO_TYPES.filter((d) => !(d in looks))) {
      expect(demoStudioScreens(demo, "https://yallapp.test").courses, demo).toBeUndefined();
    }
    // The academies' demos are their look A, with its course screens.
    expect(demoStudioScreens("premium_academy", "https://yallapp.test").courses?.look).toBe("cinema");
    expect(demoStudioScreens("instructors", "https://yallapp.test").courses?.look).toBe("index");
  });
});

describe("the contract", () => {
  it("has Config.screens.courses with the same values, in both copies", () => {
    const contract = readFileSync(join(__dirname, "../../../../docs/api/openapi.yaml"), "utf8");
    expect(readFileSync(join(__dirname, "../../public/developers/openapi.yaml"), "utf8")).toBe(contract);
    const enums = [COURSE_LOOKS, CARD_LAYOUTS, CARD_RATIOS, CARD_PARTS, PAGE_HEROES, PAGE_BARS, PAGE_PARTS, LESSON_PLAYERS, LESSON_PROGRESS, LESSON_PARTS, MINE_LAYOUTS, MINE_PROGRESS, MINE_PARTS];
    const block = contract.slice(contract.indexOf("130.52 Studio's course screens"), contract.indexOf("            launch:"));
    for (const list of enums) expect(block, list.join(",")).toContain(`enum: [${list.join(", ")}]`);
    expect(block).toContain("minimum: 0, maximum: 90");
    expect(block).toContain("maxLength: 24");
    expect(block).toContain("maxLength: 60");
  });
});
