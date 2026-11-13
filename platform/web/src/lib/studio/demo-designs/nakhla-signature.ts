import type { Action, LayoutTab, StudioNode, StudioPage } from "../../pages/types";
import { ACCOUNT_ITEMS, type StudioScreens } from "../screens";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, pad, photo } from "./parts";
import type { SignatureLook } from "./signature";

/**
 * 130.13 130.14 Nakhla School's two Signature looks (the approved boards
 * R2-Nakhla-A "Morning edition" and R2-Nakhla-B "Family passes"), each a
 * school's whole project: its home, its pages after the home in the look,
 * the Parent tab, a premium floating bar, its sign-in and account menu.
 * The family's day is the `school` element's (the signed-in parent's own
 * children, drawn by the app; samples on Studio's canvas); everything else
 * is plain Studio elements the owner changes.
 */

/** A board's colours by day and by night. */
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

/** R2-Nakhla-A: warm paper and navy by day, deep navy by night, gold on both. */
export const NAKHLA_A_INK: Ink = {
  page: "#F3F1EC",
  darkPage: "#08111B",
  surface: "#FFFFFF",
  darkSurface: "#0F1C2B",
  ink: "#0E2238",
  darkInk: "#E9EFF6",
  muted: "#4D5B6C",
  darkMuted: "#A2B0C1",
  line: "#DED9CF",
  darkLine: "#1C2C40",
  accent: "#1F4E79",
  darkAccent: "#9CC3EA",
};

/** R2-Nakhla-B: cool blue-grey by day, near black by night. */
export const NAKHLA_B_INK: Ink = {
  page: "#E8EDF2",
  darkPage: "#060C13",
  surface: "#FFFFFF",
  darkSurface: "#0E1823",
  ink: "#0D1B2A",
  darkInk: "#E8EEF5",
  muted: "#4A5868",
  darkMuted: "#9FAEBF",
  line: "#D3DBE4",
  darkLine: "#1C2B3C",
  accent: "#1F4E79",
  darkAccent: "#9CC3EA",
};

const GOLD = "#F2B544";
const NAVY = "#0E2238";
/** The School tab: the news, the timetable, the homework and the forms (a template a page of any school takes links only to screens). */
const SCHOOL: Action = { type: "screen", screen: "school" };

/** The Parent tab beside School (the family's own screen, the page the project has around it). */
function nakhlaTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]);
  const at = out.findIndex((t) => t.id === "account");
  out.splice(at === -1 ? out.length : at, 0, { id: "family", label: "Parent", icon: "family_restroom", target: { type: "page", page_slug: "parent" } });
  return out;
}

/** The school's sign-in over its building, as the demo has it; the account menu with the family's entries first. */
function nakhlaScreens(header: "cover" | "card"): (platform: string) => StudioScreens {
  return (platform) => ({
    sign_in: {
      style: "premium",
      image_url: `${platform.replace(/\/+$/, "")}/demo-screens/nakhla-school.jpg`,
      title: { en: "Every school day, in one place", ar: "كل يوم دراسي في مكان واحد", tr: "Her okul günü tek bir yerde" },
      subtitle: {
        en: "Lessons, homework, grades and fees for students, parents and teachers.",
        ar: "الحصص والواجبات والدرجات والرسوم للطلاب وأولياء الأمور والمعلمين.",
        tr: "Öğrenciler, veliler ve öğretmenler için dersler, ödevler, notlar ve ücretler.",
      },
      show_logo: true,
    },
    account_menu: {
      header,
      accent: GOLD,
      items: [
        ...(["notifications", "chat", "settings", "help", "privacy", "terms"] as const).map((key) => ({ key, hidden: false, label: {}, icon: null })),
        ...ACCOUNT_ITEMS.filter((key) => !["notifications", "chat", "settings", "help", "privacy", "terms"].includes(key)).map((key) => ({ key, hidden: true, label: {}, icon: null })),
      ],
    },
  });
}

function text(ctx: SectionContext, word: SectionWord, extra: Partial<StudioNode>): StudioNode {
  return { id: idOf(ctx)(), type: "text", text: ctx.w(word), ...extra };
}

/** A section's title and its link, in the look's ink. */
function heading(ctx: SectionContext, k: Ink, title: SectionWord, link: SectionWord | null, action: Action | null, family: string, margin = pad(14, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    padding: { ...margin, bottom: 8 },
    children: [
      text(ctx, title, { width: "fill", color: k.ink, dark_color: k.darkInk, font: { family, size: 20, weight: 700, letter_spacing: -0.4 } }),
      ...(link ? [text(ctx, link, { color: k.accent, dark_color: k.darkAccent, font: { size: 13, weight: 700 }, ...(action ? { action } : {}) })] : []),
    ],
  };
}

/** The family's day for the chosen child: the `school` element's today card, in the look's surface. */
function todayCard(ctx: SectionContext, k: Ink, extra: Partial<StudioNode> = {}): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "school",
    school: { section: "today" },
    visibility: "signed_in",
    radius: 20,
    background: k.surface,
    dark_background: k.darkSurface,
    border_color: k.line,
    dark_border_color: k.darkLine,
    border_width: 1,
    shadow: "medium",
    color: k.ink,
    dark_color: k.darkInk,
    margin: { top: 0, end: 16, bottom: 0, start: 16 },
    ...extra,
  };
}

/** The forms to sign, as a floating card with its icon on a gold tile: the Parent tab's slips. */
function signCard(ctx: SectionContext, k: Ink): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "cta_bar",
    name: ctx.w("nkSignLines"),
    title: ctx.w("nkSignLines"),
    text: ctx.w("nkSign"),
    cta: { style: "card", lead: "signature" },
    visibility: "signed_in",
    background: k.surface,
    dark_background: k.darkSurface,
    color: k.ink,
    dark_color: k.darkInk,
    action: SCHOOL,
  };
}

// ——— A · Morning edition ———

const BRICOLAGE = "Bricolage Grotesque";

/**
 * 130.13 R2-Nakhla-A: the school gate's photo growing slowly, the children
 * to switch between in a frosted pill at its top and the school's name and
 * the family's greeting at its foot; the school's news running in a ticker;
 * the chosen child's day; the forms to sign as a floating card.
 */
export function nakhlaMorningHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const k = NAKHLA_A_INK;
  return {
    header: { type: "transparent", buttons: ["notifications"] },
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
          name: ctx.w("nkKicker"),
          image_url: photo(ctx, "/stories/school/school-gate.jpg"),
          ken_burns: true,
          height: 360,
          background: "#06101C",
          scrim: { color: "#06101C", from: 0.62, middle: 0.18, at: 35, to: 0.94 },
          align: "between",
          cross: "end",
          padding: { top: 100, end: 20, bottom: 30, start: 16 },
          children: [
            // The children to switch between, in a frosted pill (signed in, with children).
            { id: id(), type: "school", school: { section: "children" }, visibility: "signed_in", self_align: "start", color: "#FFFFFF" },
            {
              id: id(),
              type: "column",
              cross: "end",
              gap: 6,
              children: [
                text(ctx, "nkKicker", { color: "#F5D68E", text_align: "end", font: { size: 11, weight: 800, letter_spacing: 1.8, uppercase: true } }),
                { id: id(), type: "school", school: { section: "greeting" }, text: ctx.w("sdWelcome"), color: "#FFFFFF", text_align: "end", font: { family: BRICOLAGE, size: 30, weight: 700, line_height: 1.05, letter_spacing: -0.8 } },
              ],
            },
          ],
        },
        // The school's news running in a ticker, on a pill.
        {
          id: id(),
          type: "row",
          name: ctx.w("nkNewsLabel"),
          cross: "center",
          gap: 10,
          height: 36,
          radius: 18,
          padding: { top: 4, end: 0, bottom: 4, start: 4 },
          margin: { top: 12, end: 16, bottom: 0, start: 16 },
          background: k.surface,
          dark_background: k.darkSurface,
          border_color: k.line,
          dark_border_color: k.darkLine,
          border_width: 1,
          children: [
            { id: id(), type: "badge_text", text: ctx.w("nkNewsLabel"), badge: { style: "gradient" }, gradient: { from: GOLD, to: "#F5C76A", angle: 90 }, color: NAVY, font: { size: 11, weight: 800, letter_spacing: 0.9, uppercase: true } },
            { id: id(), type: "marquee", text: ctx.w("nkNewsLines"), width: "fill", marquee: { speed: 32, dot: true }, color: k.muted, dark_color: k.darkMuted, font: { size: 13, weight: 600 }, action: SCHOOL },
          ],
        },
        heading(ctx, k, "nkToday", "nkTimetable", SCHOOL, BRICOLAGE),
        todayCard(ctx, k),
        // Signed out: the school's week in a photo, to the news.
        {
          id: id(),
          type: "photo_hero",
          name: ctx.w("sdWeek"),
          visibility: "signed_out",
          image_url: photo(ctx, "/stories/school/school-teacher.jpg"),
          height: 150,
          radius: 22,
          background: NAVY,
          scrim: { color: "#06101C", from: 0.1, middle: 0.2, at: 40, to: 0.88 },
          align: "end",
          padding: pad(16, 16),
          margin: { top: 0, end: 16, bottom: 0, start: 16 },
          action: SCHOOL,
          children: [text(ctx, "sdWeek", { color: "#FFFFFF", font: { family: BRICOLAGE, size: 19, weight: 700 } })],
        },
        { ...signCard(ctx, k), margin: { top: 12, end: 16, bottom: 0, start: 16 } },
      ],
    },
  };
}

/** Over the School tab: the news ticker and the school's gate under a navy scrim, its word at the foot. */
function nakhlaMorningPage(screen: string, ctx: SectionContext): StudioNode[] | null {
  if (screen !== "school") return null;
  const id = idOf(ctx);
  return [
    {
      id: id(),
      type: "photo_hero",
      name: ctx.w("tipSchool"),
      image_url: photo(ctx, "/stories/school/school-dawn.jpg"),
      height: 140,
      radius: 22,
      background: NAVY,
      scrim: { color: "#06101C", from: 0.1, middle: 0.25, at: 40, to: 0.9 },
      align: "end",
      padding: pad(16, 16),
      margin: { top: 12, end: 16, bottom: 4, start: 16 },
      action: SCHOOL,
      children: [text(ctx, "tipSchool", { color: "#FFFFFF", max_lines: 2, font: { family: BRICOLAGE, size: 16, weight: 700, line_height: 1.3 } })],
    },
  ];
}

export const NAKHLA_A: SignatureLook = {
  id: "school_signature_a",
  demo: "school",
  letter: "a",
  icon: "wb_twilight",
  fits: { types: ["school"] },
  home: nakhlaMorningHome,
  design: {
    over: nakhlaMorningPage,
    look: { header: { background: NAKHLA_A_INK.page, color: NAKHLA_A_INK.ink, dark_background: NAKHLA_A_INK.darkPage, dark_color: NAKHLA_A_INK.darkInk }, background: NAKHLA_A_INK.page, dark_background: NAKHLA_A_INK.darkPage, headed: true },
    headerStyle: "glass",
  },
  project: {
    primary: "#1F4E79",
    // The board's bar: a floating pill, the open tab's name beside its icon on navy (gold by night).
    tab_bar: { design: "float", radius: 30, margin: 16, labels: "active", background: "#FFFFFF", dark_background: NAKHLA_A_INK.darkSurface, active: NAVY, dark_active: GOLD, inactive: NAKHLA_A_INK.muted, dark_inactive: NAKHLA_A_INK.darkMuted },
    appearance: { secondary_color: GOLD, font: "Plus Jakarta Sans" },
    tabs: (tabs) => nakhlaTabs(tabs),
    screens: nakhlaScreens("cover"),
  },
  chrome: { home: "photo", header: "glass", screens: "photo" },
};
