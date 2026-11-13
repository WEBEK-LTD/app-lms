import type { Appearance, LayoutTab, StudioHeader, StudioNode, StudioPage, TabBarStyle } from "../pages/types";
import type { AppFont } from "../build-config/types";
import { newNodeId } from "./elements";
import { ACCOUNT_ITEMS, type StudioScreens } from "./screens";
import type { SectionContext, SectionWord } from "./sections";

/**
 * 123 The premium academy (a WordPress site with Tutor LMS, Digits and
 * WooCommerce): a whole project, not only its home. The project
 * (`ACADEMY_PROJECT`): a Blog tab showing the site's blog in the app with
 * its header and footer hidden, the sign-in screen over a photo, the
 * account menu at night in gold, the courses as rich cards and a course's
 * page with a tall cover and a frosted bar. Every colour is the owner's to
 * change in Studio: the main colour is the brand's, gold the second.
 *
 * 128.8 As the owner approved it on 13 November (Ufuq Academy's board):
 * the home greets the student with today's date, the course they are
 * taking on its photo with how far they are and a play button, their
 * streak beside their live class on a photo, and courses picked for them
 * as photo cards with the teacher and the rating; the bar a floating navy
 * pill with the open tab in gold (light by night); Manrope; light and dark
 * as the board's two themes.
 */

const pad = (v: number, h: number) => ({ top: v, end: h, bottom: v, start: h });

/** The academy's colours, as the approved board has them: paper and ink by day, deep navy by night, gold on both. */
export const ACADEMY_COLORS = {
  primary: "#1D2B4F",
  gold: "#B8893A",
  goldLight: "#E7C982",
  darkGold: "#E2BE74",
  // 128.8 The board's gold for fills (the bar's open tab, progress, the live class's time) and its gold for words by day.
  goldFill: "#E6C26E",
  goldText: "#7A5C14",
  paper: "#F5F3EF",
  surface: "#FFFFFF",
  ink: "#141A30",
  muted: "#5A5F73",
  line: "#E3DFD6",
  night: "#0B0F1F",
  nightCard: "#161C33",
  nightLine: "#262D48",
  nightInk: "#EEF0F7",
  nightMuted: "#A8AEC4",
  barInk: "#AFB6CC",
  nightBarInk: "#59607A",
} as const;
const C = ACADEMY_COLORS;
/** 128.8 The board's font, bundled with the app; Arabic in Alexandria. */
export const ACADEMY_FONT: AppFont = "Manrope";
export const ACADEMY_ARABIC_FONT = "Alexandria";

/** The academy story's photos (public/stories/academy, credited on the story page) the template shows. */
type AcademyPhotoName = "academy-evening" | "academy-live" | "academy-desk";

/** One of the photos at the platform's address, from the context's pictures' address (`…/design-pictures/<file>`). */
export function academyPhoto(ctx: Pick<SectionContext, "picture">, name: AcademyPhotoName): string | null {
  const any = ctx.picture?.("photo.jpg");
  return any ? any.replace(/design-pictures\/photo\.jpg$/, `stories/academy/${name}.jpg`) : null;
}

/**
 * The academy's home page as it was approved (128.8, the board): the
 * greeting with the date and the student's name and the notifications,
 * the course they are taking on its photo, their streak beside their next
 * live class on a photo, and courses picked for them as photo cards.
 * Signed out, a photo banner in the brand's colour invites them to the
 * courses instead of the student's own cards.
 */
export function academyHome(ctx: SectionContext): StudioPage {
  const id = () => (ctx.newId ?? newNodeId)();
  const w = (word: SectionWord) => ctx.w(word);
  const courses = { type: "screen" as const, screen: "courses" as const };
  const text = (word: SectionWord, extra: Partial<StudioNode>): StudioNode => ({ id: id(), type: "text", text: w(word), ...extra });
  const surface = { background: C.surface, dark_background: C.nightCard, border_color: C.line, dark_border_color: C.nightLine, border_width: 1 };
  return {
    header: { type: "greeting", title: w("acHeadline"), buttons: ["notifications"], color: C.ink, dark_color: C.nightInk },
    background: C.paper,
    dark_background: C.night,
    body: {
      id: id(),
      type: "column",
      // 128.10 The app ends the page above its floating bar itself.
      padding: { top: 8, end: 16, bottom: 24, start: 16 },
      children: [
        // The course they are taking, on its own photo.
        {
          id: id(),
          type: "learning",
          name: w("acContinue"),
          learning: { section: "continue", style: "photo" },
          visibility: "signed_in",
          height: 236,
          radius: 26,
          background: C.primary,
          color: "#FFFFFF",
        },
        // Signed out: the banner on a photo, in the brand's colour.
        {
          id: id(),
          type: "stack",
          name: w("acHeroTitle"),
          visibility: "signed_out",
          height: 236,
          radius: 26,
          background: ctx.brand,
          image_background_url: academyPhoto(ctx, "academy-desk"),
          overlay: { color: ctx.brand, opacity: 0.55 },
          children: [
            {
              id: id(),
              type: "column",
              // 124.6 As tall as the banner, so its words and button sit at its foot in the app too (a layer's first element is as tall as what it holds).
              height: 236,
              align: "end",
              gap: 12,
              padding: pad(16, 16),
              color: "#FFFFFF",
              children: [
                text("acHeroTitle", { font: { size: 22, weight: 800, line_height: 1.1 }, color: "#FFFFFF" }),
                {
                  id: id(),
                  type: "button",
                  text: w("acHeroButton"),
                  width: "hug",
                  height: 44,
                  radius: 22,
                  background: C.goldFill,
                  color: C.primary,
                  font: { weight: 800, size: 14 },
                  padding: pad(0, 18),
                  icon: "arrow_forward",
                  icon_position: "end",
                  motion: { press: "shrink" },
                  action: courses,
                },
              ],
            },
          ],
        },
        // The streak beside the next live class, on its photo.
        {
          id: id(),
          type: "row",
          name: w("acStreakAndLive"),
          visibility: "signed_in",
          gap: 10,
          cross: "stretch",
          margin: { top: 12, bottom: 0 },
          children: [
            { id: id(), type: "learning", learning: { section: "streak", style: "photo" }, width: 145, radius: 20, ...surface },
            {
              id: id(),
              type: "learning",
              learning: { section: "live", style: "photo" },
              width: "fill",
              radius: 20,
              background: C.primary,
              image_background_url: academyPhoto(ctx, "academy-live"),
              overlay: { color: C.primary, opacity: 0.72 },
              color: "#FFFFFF",
            },
          ],
        },
        // Picked for them.
        {
          id: id(),
          type: "row",
          name: w("acForYou"),
          cross: "center",
          margin: { top: 16, bottom: 10 },
          children: [
            text("acForYou", { width: "fill", font: { size: 17, weight: 800 }, color: C.ink, dark_color: C.nightInk }),
            { id: id(), type: "text", text: w("acSeeAll"), color: C.goldText, dark_color: C.goldFill, font: { size: 13, weight: 700 }, padding: pad(4, 2), action: courses },
          ],
        },
        {
          id: id(),
          type: "items",
          source: ctx.source ?? undefined,
          layout: "carousel",
          gap: 12,
          query: { limit: 6, category_id: null, featured: false, sort: "popular", ids: [] },
          card: {
            id: id(),
            type: "column",
            width: 200,
            radius: 22,
            ...surface,
            children: [
              { id: id(), type: "image", bind: "image", width: "fill", height: 100, corners: { top_start: 22, top_end: 22 } },
              {
                id: id(),
                type: "column",
                padding: pad(10, 12),
                children: [
                  { id: id(), type: "text", bind: "title", max_lines: 1, font: { size: 14, weight: 800 }, color: C.ink, dark_color: C.nightInk },
                  {
                    id: id(),
                    type: "row",
                    cross: "center",
                    gap: 4,
                    margin: { top: 3 },
                    children: [
                      { id: id(), type: "text", bind: "subtitle", max_lines: 1, font: { size: 12 }, color: C.muted, dark_color: C.nightMuted },
                      // "· ★ 4.9": the rating after the teacher, nothing without one.
                      { id: id(), type: "text", bind: "rating", text: "·", font: { size: 12 }, color: C.muted, dark_color: C.nightMuted },
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

/** What a template sets for the whole project besides its home (lib/studio/start.ts, lib/studio/new-project.ts). */
export interface TemplateProject {
  /** The main colour the project starts in, unless the owner chose one. */
  primary: string;
  tab_bar: TabBarStyle;
  /** The tabs' pages around their screens with nothing over them: the screens draw their own large titles. */
  bare_tab_pages?: boolean;
  /** The colours of the header of its pages after the home; one left out, the app's own. */
  page_header?: Pick<StudioHeader, "background" | "color" | "dark_background" | "dark_color">;
  /** 128.8 A font the app bundles is `font` alone (lib/fonts/look.ts `withLook` drops the project's free font for it). */
  appearance: Partial<Pick<Appearance, "secondary_color" | "font" | "font_family" | "arabic_font">>;
  /** The kind's tabs as the template has them; `site` the owner's website, when known. */
  tabs: (tabs: readonly LayoutTab[], site: string | null) => LayoutTab[];
  /** The sign-in screen, the account menu and the courses' looks; `platform` Yallapp's address, for its pictures. */
  screens: (platform: string) => StudioScreens;
}

/** The owner's website as an https address without a trailing slash, or null. */
export function siteAddress(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim().includes("://") ? raw.trim() : `https://${raw.trim()}`);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export const ACADEMY_PROJECT: TemplateProject = {
  primary: C.primary,
  // 128.8 The approved bar: a floating navy pill (light by night), the open tab's name beside its icon on gold, the others icons only.
  tab_bar: {
    design: "float",
    radius: 22,
    margin: 12,
    labels: "active",
    background: C.primary,
    dark_background: C.nightInk,
    active: C.goldFill,
    dark_active: C.goldFill,
    inactive: C.barInk,
    dark_inactive: C.nightBarInk,
  },
  // By day the main colour; by night a dark header with light words, the gold in the bar.
  page_header: { dark_background: C.nightCard, dark_color: C.nightInk },
  bare_tab_pages: true,
  appearance: { secondary_color: C.gold, font: ACADEMY_FONT, arabic_font: ACADEMY_ARABIC_FONT },
  tabs: (tabs, site) => {
    // Explore, the blog, My courses and the account, as the approved bar names them.
    const out = structuredClone([...tabs]).map((t) =>
      t.id === "courses" ? { ...t, label: "Explore", icon: "explore" } : t.id === "learning" ? { ...t, label: "Your courses", icon: "play_circle" } : t,
    );
    if (!site) return out;
    // The site's blog in the app: the page alone, its own header and footer hidden, its links kept in the app.
    const blog: LayoutTab = {
      id: "blog",
      label: "Blog",
      icon: "auto_stories",
      target: { type: "url", url: `${site}/blog/`, open_in: "in_app", web: { hide_header: true, hide_footer: true, links_inside: true } },
    };
    const at = out.findIndex((t) => t.id === "courses");
    out.splice(at === -1 ? Math.max(out.length - 1, 0) : at + 1, 0, blog);
    return out;
  },
  screens: (platform) => ({
    sign_in: {
      // The approved sign-in: the welcome large over 128.8 the academy's photo, the form on a card.
      style: "premium",
      image_url: `${platform.replace(/\/+$/, "")}/stories/academy/academy-desk.jpg`,
      title: { en: "Learn what changes your path.", ar: "تعلّم ما يغيّر مسارك.", tr: "Yolunu değiştirecek olanı öğren." },
      subtitle: {
        en: "Courses with the best teachers, wherever you are.",
        ar: "دورات مع نخبة من المعلمين، أينما كنت.",
        tr: "Nerede olursan ol, en iyi öğretmenlerle kurslar.",
      },
      show_logo: true,
    },
    // The approved account: the academy card, the orders, certificates, quiz results and downloads, then the settings.
    account_menu: {
      header: "academy",
      items: [
        ...(["orders", "certificates", "quiz_results", "downloads", "settings", "help", "privacy", "terms"] as const).map((key) => ({ key, hidden: false, label: {}, icon: null })),
        // Every other entry the app knows stays out, as approved.
        ...ACCOUNT_ITEMS.filter((key) => !["orders", "certificates", "quiz_results", "downloads", "settings", "help", "privacy", "terms"].includes(key)).map((key) => ({ key, hidden: true, label: {}, icon: null })),
      ],
    },
    course_card: { style: "premium", radius: 18, hide: [] },
    course_page: { cover: "full", bar: "glass", hide: [], look: "premium" },
    // The approved Explore, My courses, lesson, code and cart.
    looks: { catalog: "explore", my_courses: "premium", lesson: "premium", code: "premium", cart: "premium" },
  }),
};
