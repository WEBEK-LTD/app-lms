import type { Action, StudioNode, StudioPage, StudioStory } from "../../pages/types";
import { ACCOUNT_ITEMS, type StudioScreens } from "../screens";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, pad, photo } from "./parts";
import { rawaqTabs } from "./school-looks";
import type { SignatureLook } from "./signature";

/**
 * 130.15 130.16 Rawaq Academy's two Signature looks (the approved boards
 * R2-Rawaq-A "Faculty index" and R2-Rawaq-B "On air"), each an academy with
 * many teachers as a whole project: its home, its pages after the home in
 * the look, a premium floating bar, its sign-in and account menu. The
 * courses are the app's own (the `items` element, the academy's real
 * courses with their photos, teachers and prices); the teachers are the
 * owner's words to change (the demo's own, as 128's home has them).
 */

interface Ink {
  page: string;
  darkPage: string;
  surface: string;
  darkSurface: string;
  ink: string;
  darkInk: string;
  muted: string;
  darkMuted: string;
  line: string;
  darkLine: string;
  accent: string;
  darkAccent: string;
}

/** R2-Rawaq-A: linen paper and deep green ink, near black green by night. */
export const RAWAQ_A_INK: Ink = {
  page: "#F4F1EA",
  darkPage: "#0A110E",
  surface: "#FFFFFF",
  darkSurface: "#121C17",
  ink: "#14201A",
  darkInk: "#EDF3EF",
  muted: "#56625B",
  darkMuted: "#A6B4AC",
  line: "#DDD8CC",
  darkLine: "#22322A",
  accent: "#2E5E4E",
  darkAccent: "#8FD1B6",
};

/** R2-Rawaq-B: warm paper by day, the night's deepest green by night. */
export const RAWAQ_B_INK: Ink = {
  page: "#F6F3EC",
  darkPage: "#070D0A",
  surface: "#FFFFFF",
  darkSurface: "#101914",
  ink: "#121A16",
  darkInk: "#EEF4F0",
  muted: "#55615A",
  darkMuted: "#A3B2A9",
  line: "#E0DCD1",
  darkLine: "#1E2C25",
  accent: "#2E5E4E",
  darkAccent: "#8FD1B6",
};

const GOLD = "#F2B544";
const GREEN = "#2E5E4E";
const SHADE = "#0E221B";
const TEACHERS: Action = { type: "screen", screen: "teachers" };
const COURSES: Action = { type: "screen", screen: "courses" };

/** The demo's teachers, each with initials on their own colour and their subjects. */
const FACULTY: { name: SectionWord; initials: SectionWord; subjects: SectionWord; color: string; live?: boolean }[] = [
  { name: "raT1", initials: "rqP2i", subjects: "raT1s", color: "#8A5A1F" },
  { name: "raT2", initials: "rqP1i", subjects: "raT2s", color: "#2E5E4E" },
  { name: "raT3", initials: "raT3i", subjects: "raT3s", color: "#9E1F4A", live: true },
  { name: "raT4", initials: "rqP3i", subjects: "raT4s", color: "#34336B" },
];

function text(ctx: SectionContext, word: SectionWord, extra: Partial<StudioNode>): StudioNode {
  return { id: idOf(ctx)(), type: "text", text: ctx.w(word), ...extra };
}

/** Initials on a round colour, ringed. */
function avatar(ctx: SectionContext, initials: SectionWord, color: string, size: number, ring?: string): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    width: size,
    height: size,
    radius: size / 2,
    align: "center",
    cross: "center",
    background: color,
    ...(ring ? { border_color: ring, border_width: 2.5 } : {}),
    children: [text(ctx, initials, { color: "#FFFFFF", font: { size: Math.round(size * 0.32), weight: 800 } })],
  };
}

/** The account menu with the student's own entries first; the sign-in over the library. */
function rawaqScreens(header: "night" | "cover", photoPath: string): (platform: string) => StudioScreens {
  const shown = ["orders", "certificates", "live_classes", "teachers", "downloads", "settings", "help", "privacy", "terms"] as const;
  return (platform) => ({
    sign_in: {
      style: "premium",
      image_url: `${platform.replace(/\/+$/, "")}${photoPath}`,
      title: { en: "Learn from the best teachers", ar: "تعلّم من أفضل المدرّسين", tr: "En iyi öğretmenlerden öğrenin" },
      subtitle: {
        en: "Follow your teachers and pick up where you left off.",
        ar: "تابع مدرّسيك وأكمل من حيث توقفت.",
        tr: "Öğretmenlerinizi takip edin, kaldığınız yerden devam edin.",
      },
      show_logo: true,
    },
    account_menu: {
      header,
      accent: GOLD,
      items: [
        ...shown.map((key) => ({ key, hidden: false, label: {}, icon: null })),
        ...ACCOUNT_ITEMS.filter((key) => !(shown as readonly string[]).includes(key)).map((key) => ({ key, hidden: true, label: {}, icon: null })),
      ],
    },
    // The courses, a course, its lessons and the cart in the premium screens' looks.
    course_card: { style: "premium", radius: 20, hide: [] },
    course_page: { cover: "full", bar: "glass", hide: [], look: "premium" },
    looks: { catalog: "explore", my_courses: "premium", lesson: "premium", code: "premium", cart: "premium" },
  });
}

/** A popular course as a photo card: its photo, its badge, and a frosted label with its name, teacher and price. */
function photoCourseCard(ctx: SectionContext, size: { width: number | "fill"; height: number }, priceColor: string): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "stack",
    width: size.width,
    height: size.height,
    radius: 22,
    background: SHADE,
    children: [
      { id: id(), type: "image", bind: "image", width: "fill", height: size.height, radius: 22, scrim: { color: "#000000", from: 0.05, middle: 0.1, at: 45, to: 0.65 } },
      {
        id: id(),
        type: "column",
        height: size.height,
        align: "between",
        padding: pad(10, 10),
        children: [
          { id: id(), type: "text", bind: "badge", self_align: "start", font: { size: 11, weight: 800, letter_spacing: 0.8, uppercase: true }, padding: pad(4, 10), radius: 12, background: GOLD, color: "#1E2E25" },
          {
            id: id(),
            type: "row",
            cross: "center",
            gap: 8,
            radius: 16,
            padding: pad(8, 12),
            surface: { glass: 16, tint: 0.22 },
            children: [
              {
                id: id(),
                type: "column",
                width: "fill",
                children: [
                  { id: id(), type: "text", bind: "title", max_lines: 1, color: "#FFFFFF", font: { size: 14, weight: 800 } },
                  { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: "#FFFFFF", opacity: 0.85, font: { size: 12 } },
                ],
              },
              { id: id(), type: "text", bind: "price", color: priceColor, font: { size: 16, weight: 800 } },
            ],
          },
        ],
      },
    ],
  };
}

// ——— A · Faculty index ———

const BRICOLAGE = "Bricolage Grotesque";

/**
 * 130.15 R2-Rawaq-A: the academy's name with round search and bell; the
 * library under a scrim with "Learn from people who do it" on a frosted
 * badge and "Real teachers." at its foot, "Real skills." under it in
 * ink; the faculty as an index (each teacher's initials, name and
 * subjects, an arrow, the one teaching live marked); the month's popular
 * courses as photo cards with a frosted label.
 */
export function rawaqFacultyHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const k = RAWAQ_A_INK;
  return {
    header: { type: "logo_actions", buttons: ["search", "notifications"], color: k.ink, dark_color: k.darkInk, background: k.page, dark_background: k.darkPage },
    background: k.page,
    dark_background: k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: { bottom: 24 },
      children: [
        {
          id: id(),
          type: "photo_hero",
          name: ctx.w("rqKicker"),
          image_url: photo(ctx, "/demo-screens/rawaq-library.jpg"),
          ken_burns: true,
          height: 190,
          background: SHADE,
          scrim: { color: SHADE, from: 0.25, middle: 0.1, at: 40, to: 0.82 },
          align: "between",
          padding: { top: 14, end: 16, bottom: 6, start: 16 },
          children: [
            { id: id(), type: "badge_text", text: ctx.w("rqKicker"), badge: { style: "glass" }, color: "#FFFFFF", self_align: "start", font: { size: 11, weight: 800, letter_spacing: 1.6, uppercase: true } },
            text(ctx, "raTitle1", { color: "#FFFFFF", font: { family: BRICOLAGE, size: 40, weight: 800, line_height: 1, letter_spacing: -1.8 } }),
          ],
        },
        text(ctx, "raTitle2", { color: k.ink, dark_color: k.darkInk, padding: { top: 2, end: 16, bottom: 0, start: 16 }, font: { family: BRICOLAGE, size: 40, weight: 800, line_height: 1.05, letter_spacing: -1.8 } }),
        // The faculty, with a hairline to the link.
        {
          id: id(),
          type: "row",
          name: ctx.w("raFaculty"),
          cross: "center",
          gap: 12,
          padding: { top: 22, end: 16, bottom: 6, start: 16 },
          children: [
            text(ctx, "raFaculty", { color: k.muted, dark_color: k.darkMuted, font: { size: 12, weight: 700, letter_spacing: 2, uppercase: true } }),
            { id: id(), type: "divider", width: "fill", color: k.line, dark_color: k.darkLine },
            text(ctx, "rqAllTeachers", { color: k.accent, dark_color: k.darkAccent, font: { size: 13, weight: 700 }, action: TEACHERS }),
          ],
        },
        ...FACULTY.flatMap((t, i): StudioNode[] => [
          // A hairline between the teachers.
          ...(i > 0 ? [{ id: id(), type: "divider" as const, color: k.line, dark_color: k.darkLine, margin: { top: 0, end: 16, bottom: 0, start: 16 } }] : []),
          {
            id: id(),
            type: "row",
            name: ctx.w(t.name),
            cross: "center",
            gap: 12,
            padding: { top: 10, end: 16, bottom: 10, start: 16 },
            action: TEACHERS,
            children: [
              avatar(ctx, t.initials, t.color, 42, t.live ? "#E5484D" : undefined),
              {
                id: id(),
                type: "column",
                width: "fill",
                children: [
                  text(ctx, t.name, { max_lines: 1, color: k.ink, dark_color: k.darkInk, font: { family: BRICOLAGE, size: 19, weight: 600, letter_spacing: -0.3 } }),
                  text(ctx, t.subjects, { max_lines: 1, color: k.muted, dark_color: k.darkMuted, font: { size: 13 } }),
                ],
              },
              t.live
                ? { id: id(), type: "badge_text", text: ctx.w("raLiveBadge"), icon: "sensors", badge: { style: "pill" }, color: "#B42318", dark_color: "#FF8A7A", font: { size: 12, weight: 700 } }
                : { id: id(), type: "icon", icon: "north_east", icon_size: 22, color: k.muted, dark_color: k.darkMuted },
            ],
          },
        ]),
        text(ctx, "rqPopular", { color: k.ink, dark_color: k.darkInk, padding: { top: 18, end: 16, bottom: 10, start: 16 }, font: { family: BRICOLAGE, size: 20, weight: 700, letter_spacing: -0.4 } }),
        {
          id: id(),
          type: "items",
          name: ctx.w("rqPopular"),
          source: ctx.source ?? undefined,
          layout: "carousel",
          gap: 12,
          padding: { top: 0, end: 16, bottom: 0, start: 16 },
          query: { limit: 6, category_id: null, featured: false, sort: "popular", ids: [] },
          card: photoCourseCard(ctx, { width: 250, height: 136 }, GOLD),
        },
      ],
    },
  };
}

/** Over the Teachers and My courses tabs: the academy's photo with the screen's word, as 128 had it, in the look's green. */
function rawaqPage(paths: Partial<Record<string, { path: string; word: SectionWord }>>, family: string): (screen: string, ctx: SectionContext) => StudioNode[] | null {
  return (screen, ctx) => {
    const own = paths[screen];
    if (!own) return null;
    const id = idOf(ctx);
    return [
      {
        id: id(),
        type: "photo_hero",
        name: ctx.w(own.word),
        image_url: photo(ctx, own.path),
        height: 132,
        radius: 22,
        background: SHADE,
        scrim: { color: SHADE, from: 0.1, middle: 0.25, at: 40, to: 0.88 },
        align: "end",
        padding: pad(16, 16),
        margin: { top: 12, end: 16, bottom: 4, start: 16 },
        children: [text(ctx, own.word, { color: "#FFFFFF", max_lines: 2, font: { family, size: 16, weight: 700, line_height: 1.3 } })],
      },
    ];
  };
}

export const RAWAQ_A: SignatureLook = {
  id: "instructors_signature_a",
  demo: "instructors",
  letter: "a",
  icon: "format_list_bulleted",
  fits: { types: ["lms"], verticals: ["instructors"] },
  home: rawaqFacultyHome,
  design: {
    over: rawaqPage({ teachers: { path: "/stories/academy/academy-live.jpg", word: "tipTeachers" }, my_courses: { path: "/stories/academy/academy-desk.jpg", word: "tipMyCourses" } }, BRICOLAGE),
    look: { header: { background: RAWAQ_A_INK.page, color: RAWAQ_A_INK.ink, dark_background: RAWAQ_A_INK.darkPage, dark_color: RAWAQ_A_INK.darkInk }, background: RAWAQ_A_INK.page, dark_background: RAWAQ_A_INK.darkPage, headed: true },
    headerStyle: "large",
  },
  project: {
    primary: GREEN,
    // The board's bar: a dark green floating pill, the open tab's name beside its icon on gold.
    tab_bar: { design: "float", radius: 30, margin: 16, labels: "active", background: "#14201A", dark_background: "#1B2822", active: GOLD, dark_active: GOLD, inactive: "#B7C4BC", dark_inactive: "#A6B4AC" },
    appearance: { secondary_color: GOLD, font: "DM Sans" },
    tabs: (tabs) => rawaqTabs(tabs),
    screens: rawaqScreens("night", "/demo-screens/rawaq-library.jpg"),
  },
  chrome: { home: "brand", header: "large", screens: "night" },
};

// ——— B · On air ———

const OUTFIT = "Outfit";

/** The teachers on air: each slide a teacher with one of the academy's own sample courses, on the academy story's photos. */
const ON_AIR: { name: SectionWord; initials: SectionWord; subjects: SectionWord; color: string; kicker: SectionWord; title: SectionWord; line: SectionWord; path: string }[] = [
  { name: "raT3", initials: "raT3i", subjects: "raT3s", color: "#9E1F4A", kicker: "raLiveKicker", title: "raS1", line: "raS1Line", path: "/stories/academy/academy-live.jpg" },
  { name: "raT4", initials: "rqP3i", subjects: "raT4s", color: "#34336B", kicker: "raNewKicker", title: "raS2", line: "raS2Line", path: "/stories/academy/academy-desk.jpg" },
  { name: "raT2", initials: "rqP1i", subjects: "raT2s", color: "#2E5E4E", kicker: "raNewKicker", title: "raS3", line: "raS3Line", path: "/stories/academy/academy-phone.jpg" },
];

/**
 * 130.16 R2-Rawaq-B: the teachers on air, a full-screen slider (a line per
 * slide filling at its top, the open photo growing slowly), each slide a
 * teacher with their course, a red badge, the course's name large, a line
 * and two buttons; the teachers as stories in rings (the one teaching live
 * in red); the month's popular courses as photo cards in a grid.
 */
export function rawaqOnAirHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const k = RAWAQ_B_INK;
  const stories: StudioStory[] = FACULTY.map((t) => ({
    image_url: null,
    heading: ctx.w(t.name),
    subheading: null,
    action: TEACHERS,
    label: ctx.w(t.initials),
    color: t.color,
    ring: t.live ? "highlight" : "plain",
    ring_color: t.live ? "#E5484D" : "#B8893A",
  }));
  return {
    header: { type: "transparent", buttons: ["search"] },
    background: k.page,
    dark_background: k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: { bottom: 24 },
      children: [
        {
          id: id(),
          type: "slider",
          name: ctx.w("raOnAir"),
          height: 480,
          per_view: 1,
          autoplay: true,
          interval_ms: 6000,
          indicator: "progress",
          indicator_look: { at: "top", inset: 52, color: "#FFFFFF" },
          ken_burns: true,
          corners: { bottom_start: 30, bottom_end: 30 },
          children: ON_AIR.map(
            (s): StudioNode => ({
              id: id(),
              type: "photo_hero",
              name: ctx.w(s.title),
              image_url: photo(ctx, s.path),
              height: 480,
              background: SHADE,
              scrim: { color: "#050A08", from: 0.45, middle: 0.2, at: 38, to: 0.92 },
              align: "between",
              padding: { top: 70, end: 18, bottom: 26, start: 18 },
              children: [
                {
                  id: id(),
                  type: "row",
                  cross: "center",
                  gap: 10,
                  action: TEACHERS,
                  children: [
                    avatar(ctx, s.initials, s.color, 40, "#FFFFFF"),
                    {
                      id: id(),
                      type: "column",
                      cross: "start",
                      children: [
                        text(ctx, s.name, { color: "#FFFFFF", font: { size: 15, weight: 700 } }),
                        text(ctx, s.subjects, { color: "#FFFFFF", opacity: 0.8, font: { size: 13 } }),
                      ],
                    },
                  ],
                },
                {
                  id: id(),
                  type: "column",
                  gap: 8,
                  children: [
                    { id: id(), type: "badge_text", text: ctx.w(s.kicker), badge: { style: "gradient" }, gradient: { from: "#D93025", to: "#E5484D", angle: 90 }, color: "#FFFFFF", self_align: "start", font: { size: 11, weight: 800, letter_spacing: 1.4, uppercase: true } },
                    text(ctx, s.title, { color: "#FFFFFF", max_lines: 3, font: { family: OUTFIT, size: 38, weight: 700, line_height: 1, letter_spacing: -1.2 } }),
                    text(ctx, s.line, { color: "#FFFFFF", opacity: 0.85, max_lines: 2, font: { size: 15, line_height: 1.35 } }),
                    {
                      id: id(),
                      type: "row",
                      gap: 10,
                      margin: { top: 6 },
                      children: [
                        { id: id(), type: "button", text: ctx.w("raMeet"), icon: "co_present", height: 44, radius: 22, width: "hug", background: GOLD, color: "#1E2E25", font: { size: 14, weight: 800 }, padding: pad(0, 18), motion: { press: "shrink" }, action: TEACHERS },
                        { id: id(), type: "button", text: ctx.w("raCourses"), height: 44, radius: 22, width: "hug", background: "#1E2B25", color: "#FFFFFF", border_color: "#FFFFFF", border_width: 1, font: { size: 14, weight: 700 }, padding: pad(0, 18), action: COURSES },
                      ],
                    },
                  ],
                },
              ],
            }),
          ),
        },
        // The teachers in rings, the one teaching live in red.
        { id: id(), type: "stories", name: ctx.w("rqMeet"), stories: { size: 62 }, slides: stories, color: k.ink, dark_color: k.darkInk, padding: { top: 14, end: 16, bottom: 4, start: 16 } },
        {
          id: id(),
          type: "row",
          name: ctx.w("rqPopular"),
          cross: "end",
          padding: { top: 16, end: 16, bottom: 10, start: 16 },
          children: [
            text(ctx, "rqPopular", { width: "fill", color: k.ink, dark_color: k.darkInk, font: { family: OUTFIT, size: 21, weight: 700, letter_spacing: -0.4 } }),
            text(ctx, "acSeeAll", { color: k.accent, dark_color: k.darkAccent, font: { size: 13, weight: 700 }, action: COURSES }),
          ],
        },
        {
          id: id(),
          type: "items",
          name: ctx.w("rqPopular"),
          source: ctx.source ?? undefined,
          layout: "grid",
          columns: 2,
          gap: 10,
          padding: { top: 0, end: 16, bottom: 0, start: 16 },
          query: { limit: 4, category_id: null, featured: false, sort: "popular", ids: [] },
          card: photoCourseCard(ctx, { width: "fill", height: 168 }, GOLD),
        },
      ],
    },
  };
}

export const RAWAQ_B: SignatureLook = {
  id: "instructors_signature_b",
  demo: "instructors",
  letter: "b",
  icon: "sensors",
  fits: { types: ["lms"], verticals: ["instructors"] },
  home: rawaqOnAirHome,
  design: {
    over: rawaqPage({ teachers: { path: "/stories/academy/academy-breakfast.jpg", word: "tipTeachers" }, my_courses: { path: "/stories/academy/academy-phone.jpg", word: "tipMyCourses" } }, OUTFIT),
    look: { header: { background: RAWAQ_B_INK.page, color: RAWAQ_B_INK.ink, dark_background: RAWAQ_B_INK.darkPage, dark_color: RAWAQ_B_INK.darkInk }, background: RAWAQ_B_INK.page, dark_background: RAWAQ_B_INK.darkPage, headed: true },
    headerStyle: "glass",
  },
  project: {
    primary: GREEN,
    // The board's bar: white and floating, icons only, a dot under the open tab.
    tab_bar: { design: "dot", radius: 30, margin: 16, labels: "never", background: "#FFFFFF", dark_background: RAWAQ_B_INK.darkSurface, active: GREEN, dark_active: "#8FD1B6", inactive: RAWAQ_B_INK.muted, dark_inactive: RAWAQ_B_INK.darkMuted },
    appearance: { secondary_color: GOLD, font: "Manrope" },
    tabs: (tabs) => rawaqTabs(tabs),
    screens: rawaqScreens("cover", "/stories/academy/academy-live.jpg"),
  },
  chrome: { home: "photo", header: "glass", screens: "glass" },
};
