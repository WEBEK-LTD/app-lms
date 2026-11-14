import type { Action, LayoutTab, StudioNode, StudioPage } from "../../pages/types";
import { ACADEMY_COLORS, ACADEMY_PROJECT, type TemplateProject } from "../academy";
import type { StudioScreens } from "../screens";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, pad, photo } from "./parts";
import type { SignatureDesign, SignatureProject } from "./signature";

/**
 * 130.17 130.18 Ufuq Academy's two Signature looks (the approved boards
 * R2-Ufuq-A "Night cinema" and R2-Ufuq-B "Gold ring"): the premium
 * academy as a whole project, made more of. Each keeps everything the
 * premium academy's template has (lib/studio/academy.ts: the Blog tab with
 * the site's blog, Explore, My courses, the course's page with its tall
 * cover and frosted bar, the lesson, the code screen and the cart in their
 * premium looks, the learning time, the academy's account card), in the
 * board's colours, font and bar. The student's own learning is the
 * `learning` element's (their course in progress, their streak with this
 * week's days, their next live class; nothing signed out); the courses
 * picked for them are the app's own.
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
  gold: string;
  darkGold: string;
}

/** R2-Ufuq-A: cream paper by day, ink black by night; gold words. */
export const UFUQ_A_INK: Ink = {
  page: "#FAF7F1",
  darkPage: "#0A0B10",
  surface: "#FFFFFF",
  darkSurface: "#15161D",
  ink: "#15131A",
  darkInk: "#F4F1EA",
  muted: "#625C69",
  darkMuted: "#A9A3B4",
  line: "#EAE1CF",
  darkLine: "#262833",
  gold: "#7A5C14",
  darkGold: "#E2BE74",
};

/** R2-Ufuq-B: warmer parchment by day, the same night. */
export const UFUQ_B_INK: Ink = { ...UFUQ_A_INK, page: "#F6F1E7", line: "#E6DBC6" };

const NAVY = ACADEMY_COLORS.primary;
const GOLD_FILL = ACADEMY_COLORS.goldFill;
const COURSES: Action = { type: "screen", screen: "courses" };

function text(ctx: SectionContext, word: SectionWord, extra: Partial<StudioNode>): StudioNode {
  return { id: idOf(ctx)(), type: "text", text: ctx.w(word), ...extra };
}

/** Picked for them: a title with See all. */
function pickedTitle(ctx: SectionContext, k: Ink, family?: string): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "row",
    name: ctx.w("acForYou"),
    cross: "end",
    padding: { top: 18, end: 16, bottom: 10, start: 16 },
    children: [
      text(ctx, "acForYou", { width: "fill", color: k.ink, dark_color: k.darkInk, font: { ...(family ? { family } : {}), size: 20, weight: 700, letter_spacing: -0.3 } }),
      text(ctx, "acSeeAll", { color: k.gold, dark_color: k.darkGold, font: { size: 13, weight: 700 }, action: COURSES }),
    ],
  };
}

/** Signed out: the academy's photo in the brand's colour, to the courses. */
function invite(ctx: SectionContext, path: string, extra: Partial<StudioNode>): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w("acHeroTitle"),
    visibility: "signed_out",
    image_url: photo(ctx, path),
    ken_burns: true,
    background: NAVY,
    scrim: { color: "#0B0F1F", from: 0.35, middle: 0.2, at: 40, to: 0.92 },
    align: "end",
    gap: 12,
    padding: pad(20, 18),
    ...extra,
    children: [
      text(ctx, "acHeroTitle", { color: "#FFFFFF", font: { size: 28, weight: 800, line_height: 1.08, letter_spacing: -0.6 } }),
      {
        id: id(),
        type: "button",
        text: ctx.w("acHeroButton"),
        width: "hug",
        height: 46,
        radius: 23,
        background: GOLD_FILL,
        color: NAVY,
        font: { weight: 800, size: 15 },
        padding: pad(0, 20),
        icon: "arrow_forward",
        icon_position: "end",
        motion: { press: "shrink" },
        action: COURSES,
      },
    ],
  };
}

/** The premium academy's project in the look: its tabs, screens and features, the look's bar, font and account card. */
function ufuqProject(appearance: TemplateProject["appearance"], signIn: string): SignatureProject {
  return {
    primary: ACADEMY_PROJECT.primary,
    // The pages' headers are the look's (./index.ts designedDemoPage), by day and by night.
    bare_tab_pages: ACADEMY_PROJECT.bare_tab_pages,
    appearance: { ...ACADEMY_PROJECT.appearance, ...appearance },
    // The site's blog in the app as its own tab, when the owner's website is known.
    siteTabs: ACADEMY_PROJECT.tabs,
    screens: (platform: string): StudioScreens => {
      const screens = ACADEMY_PROJECT.screens(platform);
      return { ...screens, sign_in: { ...screens.sign_in!, image_url: `${platform.replace(/\/+$/, "")}${signIn}` } };
    },
  };
}

/** The premium academy's tabs (Explore, Your courses), as its template names them. */
const ufuqTabs = (tabs: readonly LayoutTab[]): LayoutTab[] => ACADEMY_PROJECT.tabs(tabs, null);

/** Over the pages after the home: none (the premium screens draw their own large titles), as the premium academy has them. */
const noOver = (): null => null;

// ——— A · Night cinema ———

/**
 * 130.17 R2-Ufuq-A: the course they are taking full bleed (the course's
 * photo under a dark scrim, its lessons as a line of segments at the top,
 * the greeting, the lesson they are on, its name large, how far they are
 * in gold and the play button), their streak with this week's days as
 * round letters beside their next live class on a photo, and courses
 * picked for them as photo cards with their category, teacher and rating.
 */
export function ufuqCinemaHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const k = UFUQ_A_INK;
  const surface = { background: k.surface, dark_background: k.darkSurface, border_color: k.line, dark_border_color: k.darkLine, border_width: 1 };
  return {
    header: { type: "transparent", buttons: ["search", "notifications"] },
    background: k.page,
    dark_background: k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: { bottom: 24 },
      children: [
        // The course they are taking, full bleed, its lessons over its top.
        {
          id: id(),
          type: "stack",
          name: ctx.w("acContinue"),
          visibility: "signed_in",
          height: 430,
          corners: { bottom_start: 34, bottom_end: 34 },
          background: NAVY,
          children: [
            { id: id(), type: "learning", learning: { section: "continue", style: "photo" }, height: 430, corners: { bottom_start: 34, bottom_end: 34 }, background: NAVY, color: "#FFFFFF" },
            {
              id: id(),
              type: "column",
              gap: 14,
              padding: { top: 64, end: 16, bottom: 0, start: 16 },
              children: [
                { id: id(), type: "segments", segments: { source: "course", height: 3 }, gap: 4, color: GOLD_FILL },
                { id: id(), type: "greeting", color: "#FFFFFF", font: { size: 17, weight: 700 } },
              ],
            },
          ],
        },
        invite(ctx, "/stories/academy/academy-evening.jpg", { height: 380, corners: { bottom_start: 34, bottom_end: 34 } }),
        // The streak with this week's days beside the next live class.
        {
          id: id(),
          type: "row",
          name: ctx.w("acStreakAndLive"),
          visibility: "signed_in",
          gap: 10,
          cross: "stretch",
          margin: { top: 14, end: 16, bottom: 0, start: 16 },
          children: [
            { id: id(), type: "learning", learning: { section: "streak", style: "photo", days: "letters" }, width: 158, radius: 22, shadow: "light", ...surface },
            {
              id: id(),
              type: "learning",
              learning: { section: "live", style: "photo" },
              width: "fill",
              radius: 22,
              background: NAVY,
              image_background_url: photo(ctx, "/stories/academy/academy-live.jpg"),
              overlay: { color: NAVY, opacity: 0.74 },
              color: "#FFFFFF",
            },
          ],
        },
        pickedTitle(ctx, k),
        {
          id: id(),
          type: "items",
          name: ctx.w("acForYou"),
          source: ctx.source ?? undefined,
          layout: "carousel",
          gap: 12,
          padding: { top: 0, end: 16, bottom: 0, start: 16 },
          query: { limit: 6, category_id: null, featured: false, sort: "popular", ids: [] },
          card: {
            id: id(),
            type: "stack",
            width: 236,
            height: 150,
            radius: 22,
            background: NAVY,
            children: [
              { id: id(), type: "image", bind: "image", width: "fill", height: 150, radius: 22, scrim: { color: "#0B0F1F", from: 0.1, middle: 0.15, at: 40, to: 0.88 } },
              {
                id: id(),
                type: "column",
                height: 150,
                align: "between",
                padding: pad(12, 12),
                children: [
                  { id: id(), type: "text", bind: "badge", self_align: "start", font: { size: 11, weight: 800, letter_spacing: 1.2, uppercase: true }, padding: pad(4, 10), radius: 12, background: GOLD_FILL, color: "#2A1D05" },
                  {
                    id: id(),
                    type: "column",
                    children: [
                      { id: id(), type: "text", bind: "title", max_lines: 2, color: "#FFFFFF", font: { size: 15, weight: 800, line_height: 1.2 } },
                      {
                        id: id(),
                        type: "row",
                        gap: 4,
                        cross: "center",
                        margin: { top: 3 },
                        children: [
                          { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: "#FFFFFF", opacity: 0.85, font: { size: 12 } },
                          { id: id(), type: "text", bind: "rating", text: "·", color: "#FFFFFF", opacity: 0.85, font: { size: 12 } },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  };
}

const PAGE_LOOK = (k: Ink) => ({ header: { background: k.page, color: k.ink, dark_background: k.darkPage, dark_color: k.darkInk }, background: k.page, dark_background: k.darkPage, headed: true });

export const UFUQ_A: SignatureDesign = {
  demo: "premium_academy",
  variant: "a",
  template: { id: "premium_academy_signature_a", icon: "movie", fits: { types: ["lms"] } },
  home: ufuqCinemaHome,
  over: noOver,
  look: PAGE_LOOK(UFUQ_A_INK),
  tabs: ufuqTabs,
  // The board's bar: a floating navy pill (ink by night), the open tab's name beside its icon on gold.
  bar: { design: "float", radius: 30, margin: 14, labels: "active", background: NAVY, dark_background: UFUQ_A_INK.darkSurface, active: GOLD_FILL, dark_active: GOLD_FILL, inactive: "#B3BAD0", dark_inactive: UFUQ_A_INK.darkMuted },
  project: ufuqProject({ font: "DM Sans", font_family: "Readex Pro" }, "/stories/academy/academy-evening.jpg"),
  chrome: { header: "large", home: "photo", system: "brand" },
};

// ——— B · Gold ring ———

/**
 * 130.18 R2-Ufuq-B: today's date over the greeting with round search and
 * bell (the `greeting` header); the course they are taking as its photo
 * in a gold ring filled to how far they are (the `learning` element's new
 * `ring` look), its name, the minutes left and how far they are, Resume
 * lesson; their streak with this week's days as pills beside their next
 * live class on navy; courses picked for them as a compact list.
 */
export function ufuqRingHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const k = UFUQ_B_INK;
  const surface = { background: k.surface, dark_background: k.darkSurface, border_color: k.line, dark_border_color: k.darkLine, border_width: 1 };
  return {
    header: { type: "greeting", buttons: ["search", "notifications"], color: k.ink, dark_color: k.darkInk },
    background: k.page,
    dark_background: k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: { top: 4, end: 16, bottom: 24, start: 16 },
      children: [
        { id: id(), type: "learning", name: ctx.w("acContinue"), learning: { section: "continue", style: "ring" }, visibility: "signed_in", color: k.ink, dark_color: k.darkInk },
        invite(ctx, "/stories/academy/academy-evening.jpg", { height: 300, radius: 28 }),
        {
          id: id(),
          type: "row",
          name: ctx.w("acStreakAndLive"),
          visibility: "signed_in",
          gap: 10,
          cross: "stretch",
          margin: { top: 16 },
          children: [
            { id: id(), type: "learning", learning: { section: "streak", style: "photo", days: "pills" }, width: "fill", radius: 24, ...surface },
            { id: id(), type: "learning", learning: { section: "live", style: "photo" }, width: "fill", radius: 24, background: NAVY, dark_background: "#1A2244", color: "#FFFFFF" },
          ],
        },
        { ...pickedTitle(ctx, k), padding: { top: 18, end: 0, bottom: 10, start: 0 } },
        {
          id: id(),
          type: "items",
          name: ctx.w("acForYou"),
          source: ctx.source ?? undefined,
          layout: "carousel",
          gap: 14,
          query: { limit: 6, category_id: null, featured: false, sort: "popular", ids: [] },
          card: {
            id: id(),
            type: "row",
            width: 260,
            gap: 12,
            cross: "center",
            children: [
              { id: id(), type: "image", bind: "image", width: 64, height: 64, radius: 18 },
              {
                id: id(),
                type: "column",
                width: "fill",
                children: [
                  { id: id(), type: "text", bind: "title", max_lines: 1, color: k.ink, dark_color: k.darkInk, font: { size: 15, weight: 700 } },
                  {
                    id: id(),
                    type: "row",
                    gap: 4,
                    cross: "center",
                    children: [
                      { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: k.muted, dark_color: k.darkMuted, font: { size: 12 } },
                      { id: id(), type: "text", bind: "rating", text: "·", color: k.muted, dark_color: k.darkMuted, font: { size: 12 } },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  };
}

export const UFUQ_B: SignatureDesign = {
  demo: "premium_academy",
  variant: "b",
  template: { id: "premium_academy_signature_b", icon: "donut_large", fits: { types: ["lms"] } },
  home: ufuqRingHome,
  over: noOver,
  look: PAGE_LOOK(UFUQ_B_INK),
  tabs: ufuqTabs,
  // The board's bar: a small white dock in the middle (ink by night), the open tab a gold circle.
  bar: { design: "dock", margin: 14, background: "#FFFFFF", dark_background: UFUQ_B_INK.darkSurface, active: "#C99B4A", dark_active: "#E7C982", inactive: UFUQ_B_INK.muted, dark_inactive: UFUQ_B_INK.darkMuted },
  project: ufuqProject({ font: "Plus Jakarta Sans" }, "/stories/academy/academy-evening.jpg"),
  chrome: { header: "large", home: "large", system: "large" },
};
