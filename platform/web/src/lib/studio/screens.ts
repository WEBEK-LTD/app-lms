import type { App } from "../data/types";
import { yallappSignsIn } from "../hosted/sign-in-methods";
import { ICON_NAME } from "../pages/icons";

/**
 * 118.3 Yallapp Studio: the sign-in screen's look and the account menu, as
 * the owner designs them on Studio › Sign-in & account. Kept in the app's
 * hosted settings and served in `Config.screens`; the app shows them at its
 * next start, with no new build. Texts are per language (the app's
 * languages); the app picks its language's, else its own words.
 */

/** 123 `premium`: the premium academy's, the welcome large over the photo (or the app's colours) and the form on a card at the foot. */
export const SIGN_IN_STYLES = ["classic", "photo", "card", "minimal", "premium"] as const;
export type SignInStyle = (typeof SIGN_IN_STYLES)[number];

/** Per language code (en, ar, tr, …): the owner's words. */
export type ScreenTexts = Record<string, string>;

export interface SignInLook {
  style: SignInStyle;
  /** The photo of `photo` and `card` (a Media or https address). */
  image_url: string | null;
  /** Instead of "Welcome", and the line under it. */
  title: ScreenTexts;
  subtitle: ScreenTexts;
  show_logo: boolean;
}

/**
 * 118.3 The account menu's entries the app knows, in its own order. An app
 * shows those that belong to it (its type, its features); a key the app
 * doesn't know is skipped.
 */
export const ACCOUNT_ITEMS = [
  "orders",
  "points",
  "certificates",
  "memberships",
  "quiz_results",
  "live_classes",
  "learning_paths",
  "achievements",
  "wishlist",
  "downloads",
  "my_courses",
  "restaurant",
  "teachers",
  "teacher",
  "teach",
  "shipments",
  "food_orders",
  "rides",
  "chat",
  "notifications",
  "settings",
  "help",
  "privacy",
  "terms",
] as const;
export type AccountItemKey = (typeof ACCOUNT_ITEMS)[number];

/** 118.3 Always shown: Settings has "Delete account", and the stores ask for the privacy policy and the terms. Sign out is always last. */
export const REQUIRED_ACCOUNT_ITEMS: readonly AccountItemKey[] = ["settings", "privacy", "terms"];

export interface AccountMenuEntry {
  /** One of [ACCOUNT_ITEMS], or `link`: the owner's own entry. */
  key: AccountItemKey | "link";
  hidden: boolean;
  /** The owner's name for it, per language; empty: the app's own. */
  label: ScreenTexts;
  /** A Material Symbols name; null: the app's own. */
  icon: string | null;
  /** `link`: an https address, or a Studio page of the app. */
  url?: string | null;
  page_slug?: string | null;
}

/** 118.3 The menu's top: the name and photo, a card in the app's colour, a cover with shortcuts, quick tiles, or a dark page with a membership card. */
/** 123 `academy`: the premium academy's card with the courses, certificates and hours, and the dark mode, notifications and language at hand. */
export const ACCOUNT_HEADERS = ["plain", "card", "cover", "tiles", "night", "academy"] as const;
export type AccountHeader = (typeof ACCOUNT_HEADERS)[number];

export interface AccountMenu {
  header: AccountHeader;
  /** `night`: the membership card's colour (#RRGGBB); null: gold. */
  accent?: string | null;
  /** In the order shown. Entries the app knows that aren't here follow, in its own order. */
  items: AccountMenuEntry[];
}

/**
 * 122 How a course shows in the lists (the catalog, My courses, a teacher's
 * and a bundle's courses): `classic` a row, `rich` a larger row with the
 * teacher's photo, `cover` a wide picture with the course over it, `tile`
 * the picture over the course; its corners; and what it leaves out.
 */
/** 123 `premium`: the premium academy's row, the price at its end. */
export const COURSE_CARD_STYLES = ["classic", "rich", "cover", "tile", "premium"] as const;
export const COURSE_CARD_FACTS = ["teacher", "rating", "price", "lessons"] as const;
export type CourseCardStyle = (typeof COURSE_CARD_STYLES)[number];
export type CourseCardFact = (typeof COURSE_CARD_FACTS)[number];
export interface CourseCardLook {
  style: CourseCardStyle;
  /** 0 to 32; missing, the look's own. */
  radius?: number;
  hide: CourseCardFact[];
}

/**
 * 122 A course's page: `classic` its picture over the course, `full` a tall
 * picture with the course's name and facts on it; its purchase bar
 * `classic` or `glass` (frosted over the page); the tab it opens on for
 * people not enrolled; and what it leaves out.
 */
export const COURSE_PAGE_COVERS = ["classic", "full"] as const;
export const COURSE_PAGE_BARS = ["classic", "glass"] as const;
export const COURSE_PAGE_TABS = ["overview", "curriculum"] as const;
export const COURSE_PAGE_FACTS = ["students", "level", "duration", "certificate", "reviews"] as const;
export type CoursePageFact = (typeof COURSE_PAGE_FACTS)[number];
export interface CoursePageLook {
  cover: (typeof COURSE_PAGE_COVERS)[number];
  bar: (typeof COURSE_PAGE_BARS)[number];
  first_tab?: (typeof COURSE_PAGE_TABS)[number];
  hide: CoursePageFact[];
  /** 123 The premium academy's page: the subject and certificate on the cover, the teacher on a card to follow, the tabs as chips, the purchase in gold. */
  look?: "premium";
}

export interface StudioScreens {
  sign_in?: SignInLook | null;
  account_menu?: AccountMenu | null;
  /** 122 The courses' card in the lists (academies). */
  course_card?: CourseCardLook | null;
  /** 122 A course's page (academies). */
  course_page?: CoursePageLook | null;
  /** 123 The screens drawn in a look of their own: the catalog as Explore, the others premium. */
  looks?: ScreenLooks;
}

/**
 * 123 A screen's own look (`Config.screens.looks`): the catalog as the
 * premium academy's Explore (a large title, the search with the filters in
 * it, the subjects as icons), My courses, a lesson, the code screen and the
 * cart in their premium looks.
 */
export const SCREEN_LOOKS = { catalog: "explore", my_courses: "premium", lesson: "premium", code: "premium", cart: "premium" } as const;
export type ScreenLookKey = keyof typeof SCREEN_LOOKS;
export type ScreenLooks = Partial<{ [K in ScreenLookKey]: (typeof SCREEN_LOOKS)[K] }>;

export const SCREEN_LIMITS = { title: 60, subtitle: 140, label: 40, links: 8 } as const;

const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** An https address (the Media library's included), or null. */
function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost") ? url.toString() : null;
  } catch {
    return null;
  }
}

function texts(value: unknown, max: number, problems: string[], what: string): ScreenTexts {
  const out: ScreenTexts = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [lang, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!LANGUAGE.test(lang) || typeof raw !== "string") continue;
    const text = raw.trim();
    if (!text) continue;
    if ([...text].length > max) {
      problems.push(`${what} can have up to ${max} characters.`);
      continue;
    }
    out[lang] = text;
  }
  return out;
}

/**
 * 118.3 The owner's design as saved, checked: unknown entries dropped, the
 * required entries never hidden, each kind of entry once, links with an
 * address. `problems` lists what to fix (English; the dashboard translates).
 */
export function parseStudioScreens(input: unknown): { screens: StudioScreens; problems: string[] } {
  const problems: string[] = [];
  const v = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const screens: StudioScreens = {};

  const s = v.sign_in && typeof v.sign_in === "object" ? (v.sign_in as Record<string, unknown>) : null;
  if (s) {
    const style = (SIGN_IN_STYLES as readonly string[]).includes(String(s.style)) ? (s.style as SignInStyle) : "classic";
    const image = httpsUrl(s.image_url);
    if (s.image_url && !image) problems.push("The photo's address isn't one the app can open.");
    if ((style === "photo" || style === "card") && !image) problems.push("Choose a photo for this look.");
    screens.sign_in = {
      style,
      image_url: style === "photo" || style === "card" || style === "premium" ? image : null,
      title: texts(s.title, SCREEN_LIMITS.title, problems, "The welcome"),
      subtitle: texts(s.subtitle, SCREEN_LIMITS.subtitle, problems, "The line under the welcome"),
      show_logo: s.show_logo !== false,
    };
  }

  const m = v.account_menu && typeof v.account_menu === "object" ? (v.account_menu as Record<string, unknown>) : null;
  if (m) {
    const header = (ACCOUNT_HEADERS as readonly string[]).includes(String(m.header)) ? (m.header as AccountHeader) : "plain";
    const seen = new Set<string>();
    const items: AccountMenuEntry[] = [];
    let links = 0;
    for (const raw of Array.isArray(m.items) ? m.items : []) {
      if (!raw || typeof raw !== "object") continue;
      const e = raw as Record<string, unknown>;
      const key = String(e.key);
      const builtIn = (ACCOUNT_ITEMS as readonly string[]).includes(key);
      if (!builtIn && key !== "link") continue;
      if (builtIn && seen.has(key)) continue;
      const icon = typeof e.icon === "string" && ICON_NAME.test(e.icon) ? e.icon : null;
      const label = texts(e.label, SCREEN_LIMITS.label, problems, "A name in the menu");
      if (key === "link") {
        links += 1;
        if (links > SCREEN_LIMITS.links) {
          problems.push(`Keep at most ${SCREEN_LIMITS.links} of your own entries.`);
          continue;
        }
        const url = httpsUrl(e.url);
        const slug = typeof e.page_slug === "string" && SLUG.test(e.page_slug) ? e.page_slug : null;
        if (!url && !slug) {
          problems.push("Give each of your own entries an https address or one of your pages.");
          continue;
        }
        if (!Object.keys(label).length) {
          problems.push("Give each of your own entries a name.");
          continue;
        }
        items.push({ key: "link", hidden: e.hidden === true, label, icon: icon ?? "link", ...(slug ? { page_slug: slug } : { url }) });
        continue;
      }
      seen.add(key);
      const required = (REQUIRED_ACCOUNT_ITEMS as readonly string[]).includes(key);
      items.push({ key: key as AccountItemKey, hidden: required ? false : e.hidden === true, label, icon });
    }
    const accent = typeof m.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(m.accent) ? m.accent.toUpperCase() : null;
    screens.account_menu = { header, ...(header === "night" && accent ? { accent } : {}), items };
  }
  // 122 The courses' card.
  const cc = v.course_card && typeof v.course_card === "object" ? (v.course_card as Record<string, unknown>) : null;
  if (cc) {
    const style = (COURSE_CARD_STYLES as readonly string[]).includes(String(cc.style)) ? (cc.style as CourseCardStyle) : "classic";
    const radius = typeof cc.radius === "number" && Number.isFinite(cc.radius) ? Math.round(cc.radius) : null;
    if (radius !== null && (radius < 0 || radius > 32)) problems.push("The card's corners must be 0 to 32.");
    const hide = [...new Set((Array.isArray(cc.hide) ? cc.hide : []).filter((f): f is CourseCardFact => (COURSE_CARD_FACTS as readonly unknown[]).includes(f)))];
    screens.course_card = { style, ...(radius !== null && radius >= 0 && radius <= 32 ? { radius } : {}), hide };
  }
  // 122 A course's page.
  const cp = v.course_page && typeof v.course_page === "object" ? (v.course_page as Record<string, unknown>) : null;
  if (cp) {
    const pick = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => ((list as readonly unknown[]).includes(value) ? (value as T) : fallback);
    const first = (COURSE_PAGE_TABS as readonly unknown[]).includes(cp.first_tab) ? (cp.first_tab as CoursePageLook["first_tab"]) : undefined;
    const hide = [...new Set((Array.isArray(cp.hide) ? cp.hide : []).filter((f): f is CoursePageFact => (COURSE_PAGE_FACTS as readonly unknown[]).includes(f)))];
    screens.course_page = { cover: pick(COURSE_PAGE_COVERS, cp.cover, "classic"), bar: pick(COURSE_PAGE_BARS, cp.bar, "classic"), ...(first ? { first_tab: first } : {}), hide, ...(cp.look === "premium" ? { look: "premium" as const } : {}) };
  }
  // 123 The screens' own looks: the known ones, each with its one look.
  const lk = v.looks && typeof v.looks === "object" ? (v.looks as Record<string, unknown>) : null;
  if (lk) {
    const looks: Record<string, string> = {};
    for (const [key, look] of Object.entries(SCREEN_LOOKS)) if (lk[key] === look) looks[key] = look;
    if (Object.keys(looks).length) screens.looks = looks as ScreenLooks;
  }
  return { screens, problems: [...new Set(problems)] };
}

/**
 * 118.3 Whether the app gets Studio's screens: a Studio project on the hosted
 * API, or on its own API that Yallapp signs people in to (the app reads them
 * from Yallapp's `/config` with the sign-in rules), 121 or on a WordPress site
 * (the plugin gets them with its license check, `LicenseStatus.screens`, and
 * serves them in its `/config`). Another own API sends `Config.screens`
 * itself.
 */
export function studioScreensOn(app: Pick<App, "section" | "backend"> & { hostedSettings?: App["hostedSettings"] }): boolean {
  return app.section === "studio" && (app.backend === "hosted" || app.backend === "wordpress" || yallappSignsIn(app));
}

/** 118.3 `Config.screens`, or nothing when the owner hasn't designed them. */
export function screensConfig(app: Pick<App, "section" | "backend"> & { hostedSettings?: App["hostedSettings"] }): { screens?: StudioScreens } {
  const saved = app.hostedSettings?.studioScreens;
  if (!saved || !studioScreensOn(app)) return {};
  const screens: StudioScreens = {};
  if (saved.sign_in) screens.sign_in = saved.sign_in;
  if (saved.account_menu) screens.account_menu = saved.account_menu;
  if (saved.course_card) screens.course_card = saved.course_card;
  if (saved.course_page) screens.course_page = saved.course_page;
  if (saved.looks && Object.keys(saved.looks).length) screens.looks = saved.looks;
  return Object.keys(screens).length ? { screens } : {};
}
