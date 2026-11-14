/**
 * 130.52 Studio's course screens (`Config.screens.courses`): ONE premium
 * look for an academy's four course screens, saved with Studio › Screens
 * as the other engine screens are (`course_card`, `course_page`, `looks`,
 * `system`), each screen with its own options:
 *
 * - the course card, wherever the lists show a course (the catalog, My
 *   courses, a teacher's and a bundle's courses): `poster` the photo whole
 *   under a scrim with the course over it, `ticket` the photo over a
 *   perforated stub, `glass` a frosted label over the photo, `row` a
 *   compact row; the photo's shape, the scrim, the corners, and the facts
 *   it leaves out (the teacher, the rating drawn as stars, the lessons,
 *   the price, the enrolled student's progress);
 * - the course's page: its hero (`cinema` full bleed under a scrim,
 *   `framed` a rounded photo on the page, `split` the photo over an
 *   editorial panel), the enrol bar (`glass`, `solid` or `floating`), the
 *   sections it leaves out (the teacher's profile, what you'll learn, the
 *   curriculum as a timeline, the reviews, the description) and the
 *   button's own words;
 * - the lesson: the player (`cinema` full width on black, `framed` a
 *   rounded frame on the page), how far through the course (`bar`,
 *   `segments` or `ring`), and the parts it leaves out (that progress, the
 *   notes, the resources, what's next);
 * - My courses: a `grid` or a `list`, the progress as `rings` or `bars`,
 *   the parts it leaves out (continue learning, the completed courses,
 *   this week's learning) and a line under its title.
 *
 * Each look (`cinema` Night cinema, `ring` Gold ring, `index` Faculty
 * index, `on_air` On air: the academies' four Signature looks) has its
 * own choice for every option; an option saved overrides it. Everything
 * a screen shows is the course's own (its photo, teacher, rating, lessons,
 * price, curriculum, reviews, the student's progress), hidden when absent,
 * never made up. Missing, the screens are as before (`course_card`,
 * `course_page` and `looks`, which older apps still read).
 */

export const COURSE_LOOKS = ["cinema", "ring", "index", "on_air"] as const;
export type CourseLook = (typeof COURSE_LOOKS)[number];

export const CARD_LAYOUTS = ["poster", "ticket", "glass", "row"] as const;
export type CourseCardLayout = (typeof CARD_LAYOUTS)[number];
export const CARD_RATIOS = ["wide", "tall", "square"] as const;
export type CourseCardRatio = (typeof CARD_RATIOS)[number];
export const CARD_PARTS = ["teacher", "rating", "lessons", "price", "progress"] as const;
export type CourseCardPart = (typeof CARD_PARTS)[number];

export const PAGE_HEROES = ["cinema", "framed", "split"] as const;
export type CoursePageHero = (typeof PAGE_HEROES)[number];
export const PAGE_BARS = ["glass", "solid", "floating"] as const;
export type CoursePageBar = (typeof PAGE_BARS)[number];
export const PAGE_PARTS = ["teacher", "learn", "curriculum", "reviews", "about"] as const;
export type CoursePagePart = (typeof PAGE_PARTS)[number];

export const LESSON_PLAYERS = ["cinema", "framed"] as const;
export type LessonPlayer = (typeof LESSON_PLAYERS)[number];
export const LESSON_PROGRESS = ["bar", "segments", "ring"] as const;
export type LessonProgress = (typeof LESSON_PROGRESS)[number];
export const LESSON_PARTS = ["progress", "notes", "resources", "up_next"] as const;
export type LessonPart = (typeof LESSON_PARTS)[number];

export const MINE_LAYOUTS = ["grid", "list"] as const;
export type MyCoursesLayout = (typeof MINE_LAYOUTS)[number];
export const MINE_PROGRESS = ["rings", "bars"] as const;
export type MyCoursesProgress = (typeof MINE_PROGRESS)[number];
export const MINE_PARTS = ["continue", "completed", "week"] as const;
export type MyCoursesPart = (typeof MINE_PARTS)[number];

/** Per language code (en, ar, tr, …): the owner's words. */
export type CourseTexts = Record<string, string>;

export const COURSE_SCREEN_LIMITS = { scrim: 90, radius: 32, cta: 24, headline: 60 } as const;

export interface CourseCardDesign {
  layout?: CourseCardLayout;
  ratio?: CourseCardRatio;
  /** How dark the photo's shade is under the words (`poster`, `glass`), 0 to 90 %. */
  scrim?: number;
  /** The card's corners, 0 to 32. */
  radius?: number;
  hide: CourseCardPart[];
}

export interface CoursePageDesign {
  hero?: CoursePageHero;
  bar?: CoursePageBar;
  hide: CoursePagePart[];
  /** The enrol button's words, per language; empty, the app's own ("Join now", "Enroll for free"). */
  cta?: CourseTexts;
}

export interface LessonDesign {
  player?: LessonPlayer;
  progress?: LessonProgress;
  hide: LessonPart[];
}

export interface MyCoursesDesign {
  layout?: MyCoursesLayout;
  progress?: MyCoursesProgress;
  hide: MyCoursesPart[];
  /** A line under the title, per language; empty, none. */
  headline?: CourseTexts;
}

/** `Config.screens.courses`. */
export interface CourseScreens {
  look: CourseLook;
  /** The look's accent (#RRGGBB); null, the project's second colour. */
  accent?: string | null;
  card?: CourseCardDesign;
  page?: CoursePageDesign;
  lesson?: LessonDesign;
  my_courses?: MyCoursesDesign;
}

/** Every option as a look has it when nothing overrides it. */
export interface CourseLookDefaults {
  card: { layout: CourseCardLayout; ratio: CourseCardRatio; scrim: number; radius: number };
  page: { hero: CoursePageHero; bar: CoursePageBar };
  lesson: { player: LessonPlayer; progress: LessonProgress };
  my_courses: { layout: MyCoursesLayout; progress: MyCoursesProgress };
}

/**
 * Each look's own choices (the boards they come from: R2-Ufuq-A Night
 * cinema, R2-Ufuq-B Gold ring, R2-Rawaq-A Faculty index, R2-Rawaq-B On
 * air). mobile/lib/core/api/models/course_screens_models.dart and the
 * WordPress plugin keep the same table.
 */
export const COURSE_LOOK_DEFAULTS: Record<CourseLook, CourseLookDefaults> = {
  cinema: {
    card: { layout: "poster", ratio: "tall", scrim: 70, radius: 24 },
    page: { hero: "cinema", bar: "glass" },
    lesson: { player: "cinema", progress: "segments" },
    my_courses: { layout: "list", progress: "bars" },
  },
  ring: {
    card: { layout: "row", ratio: "square", scrim: 0, radius: 20 },
    page: { hero: "framed", bar: "floating" },
    lesson: { player: "framed", progress: "ring" },
    my_courses: { layout: "grid", progress: "rings" },
  },
  index: {
    card: { layout: "ticket", ratio: "wide", scrim: 0, radius: 16 },
    page: { hero: "split", bar: "solid" },
    lesson: { player: "framed", progress: "bar" },
    my_courses: { layout: "list", progress: "bars" },
  },
  on_air: {
    card: { layout: "glass", ratio: "wide", scrim: 40, radius: 26 },
    page: { hero: "cinema", bar: "floating" },
    lesson: { player: "cinema", progress: "bar" },
    my_courses: { layout: "grid", progress: "rings" },
  },
};

/** The four screens with every option decided: the saved one, else the look's own. */
export interface ResolvedCourseScreens {
  look: CourseLook;
  accent: string | null;
  card: { layout: CourseCardLayout; ratio: CourseCardRatio; scrim: number; radius: number; hide: CourseCardPart[] };
  page: { hero: CoursePageHero; bar: CoursePageBar; hide: CoursePagePart[]; cta: CourseTexts };
  lesson: { player: LessonPlayer; progress: LessonProgress; hide: LessonPart[] };
  my_courses: { layout: MyCoursesLayout; progress: MyCoursesProgress; hide: MyCoursesPart[]; headline: CourseTexts };
}

export function resolveCourseScreens(c: CourseScreens): ResolvedCourseScreens {
  const d = COURSE_LOOK_DEFAULTS[c.look];
  return {
    look: c.look,
    accent: c.accent ?? null,
    card: {
      layout: c.card?.layout ?? d.card.layout,
      ratio: c.card?.ratio ?? d.card.ratio,
      scrim: c.card?.scrim ?? d.card.scrim,
      radius: c.card?.radius ?? d.card.radius,
      hide: c.card?.hide ?? [],
    },
    page: { hero: c.page?.hero ?? d.page.hero, bar: c.page?.bar ?? d.page.bar, hide: c.page?.hide ?? [], cta: c.page?.cta ?? {} },
    lesson: { player: c.lesson?.player ?? d.lesson.player, progress: c.lesson?.progress ?? d.lesson.progress, hide: c.lesson?.hide ?? [] },
    my_courses: { layout: c.my_courses?.layout ?? d.my_courses.layout, progress: c.my_courses?.progress ?? d.my_courses.progress, hide: c.my_courses?.hide ?? [], headline: c.my_courses?.headline ?? {} },
  };
}

/** A text in the language shown: its own, else English, else the first; empty, null. */
export function courseText(texts: CourseTexts | undefined, lang: string): string | null {
  if (!texts) return null;
  return texts[lang] ?? texts.en ?? Object.values(texts)[0] ?? null;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** A known value, or nothing; an unknown one is a problem (the platform only saves what the app knows). */
function oneOf<T extends string>(list: readonly T[], value: unknown, problems: string[], what: string): T | undefined {
  if (value === undefined || value === null) return undefined;
  if ((list as readonly unknown[]).includes(value)) return value as T;
  problems.push(`${what} must be one of: ${list.join(", ")}.`);
  return undefined;
}

/** A whole number within its bounds, or nothing. */
function bounded(value: unknown, max: number, problems: string[], what: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max) return Math.round(value);
  problems.push(`${what} must be 0 to ${max}.`);
  return undefined;
}

/** The parts a screen leaves out: the known ones, once each, in their order. */
function parts<T extends string>(list: readonly T[], value: unknown, problems: string[], what: string): T[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    problems.push(`${what} must be a list.`);
    return [];
  }
  for (const v of value) if (!(list as readonly unknown[]).includes(v)) problems.push(`${what} can only name: ${list.join(", ")}.`);
  return list.filter((p) => value.includes(p));
}

function texts(value: unknown, max: number, problems: string[], what: string): CourseTexts | undefined {
  const v = record(value);
  if (!v) return undefined;
  const out: CourseTexts = {};
  for (const [lang, raw] of Object.entries(v)) {
    if (!LANGUAGE.test(lang) || typeof raw !== "string") continue;
    const text = raw.trim();
    if (!text) continue;
    if ([...text].length > max) {
      problems.push(`${what} can have up to ${max} characters.`);
      continue;
    }
    out[lang] = text;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * The course screens as saved, checked: the look one of the four, every
 * option a value the app knows, numbers within their bounds, the accent
 * #RRGGBB, the words within their lengths. `problems` lists what to fix;
 * without a known look there is nothing to save (null).
 */
export function parseCourseScreens(value: unknown, problems: string[]): CourseScreens | null {
  const v = record(value);
  if (!v) return null;
  if (!(COURSE_LOOKS as readonly unknown[]).includes(v.look)) {
    problems.push("Choose one of the course screens' looks.");
    return null;
  }
  const out: CourseScreens = { look: v.look as CourseLook };
  if (v.accent !== undefined && v.accent !== null && v.accent !== "") {
    if (typeof v.accent === "string" && HEX.test(v.accent)) out.accent = v.accent.toUpperCase();
    else problems.push("The course screens' accent must be like #B8893A.");
  }
  const c = record(v.card);
  if (c) {
    const card: CourseCardDesign = { hide: parts(CARD_PARTS, c.hide, problems, "The course card") };
    const layout = oneOf(CARD_LAYOUTS, c.layout, problems, "The course card's layout");
    const ratio = oneOf(CARD_RATIOS, c.ratio, problems, "The course card's photo");
    const scrim = bounded(c.scrim, COURSE_SCREEN_LIMITS.scrim, problems, "The course card's shade");
    const radius = bounded(c.radius, COURSE_SCREEN_LIMITS.radius, problems, "The course card's corners");
    if (layout) card.layout = layout;
    if (ratio) card.ratio = ratio;
    if (scrim !== undefined) card.scrim = scrim;
    if (radius !== undefined) card.radius = radius;
    out.card = card;
  }
  const p = record(v.page);
  if (p) {
    const page: CoursePageDesign = { hide: parts(PAGE_PARTS, p.hide, problems, "The course page") };
    const hero = oneOf(PAGE_HEROES, p.hero, problems, "The course page's top");
    const bar = oneOf(PAGE_BARS, p.bar, problems, "The course page's enrol bar");
    const cta = texts(p.cta, COURSE_SCREEN_LIMITS.cta, problems, "The enrol button's words");
    if (hero) page.hero = hero;
    if (bar) page.bar = bar;
    if (cta) page.cta = cta;
    out.page = page;
  }
  const l = record(v.lesson);
  if (l) {
    const lesson: LessonDesign = { hide: parts(LESSON_PARTS, l.hide, problems, "The lesson") };
    const player = oneOf(LESSON_PLAYERS, l.player, problems, "The lesson's player");
    const progress = oneOf(LESSON_PROGRESS, l.progress, problems, "The lesson's progress");
    if (player) lesson.player = player;
    if (progress) lesson.progress = progress;
    out.lesson = lesson;
  }
  const m = record(v.my_courses);
  if (m) {
    const mine: MyCoursesDesign = { hide: parts(MINE_PARTS, m.hide, problems, "My courses") };
    const layout = oneOf(MINE_LAYOUTS, m.layout, problems, "My courses' layout");
    const progress = oneOf(MINE_PROGRESS, m.progress, problems, "My courses' progress");
    const headline = texts(m.headline, COURSE_SCREEN_LIMITS.headline, problems, "The line under My courses' title");
    if (layout) mine.layout = layout;
    if (progress) mine.progress = progress;
    if (headline) mine.headline = headline;
    out.my_courses = mine;
  }
  return out;
}

/**
 * The academies' four Signature looks' course screens (130.15–130.18),
 * with their words (lib/studio/app-words.ts, Modern Standard Arabic) in
 * the languages given.
 */
export function signatureCourseScreens(look: CourseLook, words: (lang: string) => { cta: string; headline: string }, langs: readonly string[] = ["en", "ar", "tr"]): CourseScreens {
  const each = (key: "cta" | "headline"): CourseTexts => Object.fromEntries(langs.map((l) => [l, words(l)[key]]));
  return { look, card: { hide: [] }, page: { hide: [], cta: each("cta") }, lesson: { hide: [] }, my_courses: { hide: [], headline: each("headline") } };
}
