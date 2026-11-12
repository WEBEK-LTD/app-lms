import type { Appearance, LayoutTab, StudioHeader, StudioNode, StudioPage, TabBarStyle } from "../pages/types";
import { newNodeId } from "./elements";
import { ACCOUNT_ITEMS, type StudioScreens } from "./screens";
import type { SectionContext, SectionWord } from "./sections";

/**
 * 123 The premium academy (a WordPress site with Tutor LMS, Digits and
 * WooCommerce): a whole project, not only its home. Its home (`academyHome`)
 * greets the student, then a banner in navy and gold, what the academy
 * promises, the subjects, the popular courses, the certificate card and the
 * newest courses; light and dark alike. The project (`ACADEMY_PROJECT`):
 * a frosted floating bar with the student's photo, a Blog tab showing the
 * site's blog in the app with its header and footer hidden, the sign-in
 * screen over a photo, the account menu at night in gold, the courses as
 * rich cards and a course's page with a tall cover and a frosted bar, in
 * Alexandria. Every colour is the owner's to change in Studio: the main
 * colour is the brand's, gold the second.
 */

const pad = (v: number, h: number) => ({ top: v, end: h, bottom: v, start: h });

/** The academy's colours: ink and paper by day, near-black by night, gold on both. */
export const ACADEMY_COLORS = {
  primary: "#1D2B4F",
  gold: "#B8893A",
  goldLight: "#E7C982",
  darkGold: "#E2BE74",
  paper: "#FAF7F1",
  ink: "#15131A",
  muted: "#6B6573",
  line: "#EFE7D6",
  night: "#0A0B10",
  nightCard: "#15161D",
  nightLine: "#262833",
  nightInk: "#F4F1EA",
  nightMuted: "#A9A3B4",
} as const;
const C = ACADEMY_COLORS;
export const ACADEMY_FONT = "Alexandria";

/**
 * The academy's home page as it was approved (the premium academy's home
 * board): the greeting with the date and the student's name, the course
 * they are taking on a gradient, their streak beside their next live
 * class in gold, and courses picked for them as covers with a gold badge.
 * Signed out, a banner in the brand's colour invites them to the courses
 * instead of the student's own cards.
 */
export function academyHome(ctx: SectionContext): StudioPage {
  const id = () => (ctx.newId ?? newNodeId)();
  const w = (word: SectionWord) => ctx.w(word);
  const courses = { type: "screen" as const, screen: "courses" as const };
  const text = (word: SectionWord, extra: Partial<StudioNode>): StudioNode => ({ id: id(), type: "text", text: w(word), ...extra });
  const card = { background: "#FFFFFF", dark_background: C.nightCard, border_color: C.line, border_width: 1, radius: 24, shadow: "medium" as const };
  return {
    header: { type: "greeting", title: w("acHeadline"), buttons: ["search", "notifications"], color: C.ink, dark_color: C.nightInk },
    background: C.paper,
    dark_background: C.night,
    body: {
      id: id(),
      type: "column",
      padding: { top: 10, end: 18, bottom: 110, start: 18 },
      children: [
        // The course they are taking.
        {
          id: id(),
          type: "learning",
          name: w("acContinue"),
          learning: { section: "continue" },
          visibility: "signed_in",
          radius: 30,
          background: "#141A3A",
          image_background_url: ctx.picture?.("academy-mesh-1.jpg") ?? null,
          color: "#FFFFFF",
          shadow: "medium",
        },
        // Signed out: the banner, in the brand's colour.
        {
          id: id(),
          type: "stack",
          name: w("acHeroTitle"),
          visibility: "signed_out",
          height: 206,
          radius: 30,
          background: ctx.brand,
          image_background_url: ctx.picture?.("academy-mesh-1.jpg") ?? null,
          shadow: "medium",
          children: [
            {
              id: id(),
              type: "column",
              // 124.6 As tall as the banner, so its words and button sit at its foot in the app too (a layer's first element is as tall as what it holds).
              height: 206,
              align: "end",
              gap: 10,
              padding: pad(18, 18),
              color: "#FFFFFF",
              children: [
                text("acHeroTitle", { font: { size: 24, weight: 700, line_height: 1.3, family: ACADEMY_FONT }, color: "#FFFFFF" }),
                {
                  id: id(),
                  type: "button",
                  text: w("acHeroButton"),
                  width: "hug",
                  height: 44,
                  radius: 16,
                  gradient: { from: C.goldLight, to: C.gold, angle: 135 },
                  color: "#2A1D05",
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
        // The streak beside the next live class.
        {
          id: id(),
          type: "row",
          name: w("acStreakAndLive"),
          visibility: "signed_in",
          gap: 12,
          cross: "stretch",
          margin: { top: 14, bottom: 0 },
          children: [
            { id: id(), type: "learning", learning: { section: "streak" }, width: "fill", ...card },
            { id: id(), type: "learning", learning: { section: "live" }, width: "fill", radius: 24, gradient: { from: C.goldLight, to: C.gold, angle: 135 }, color: "#2A1D05", shadow: "medium" },
          ],
        },
        // Picked for them.
        {
          id: id(),
          type: "row",
          name: w("acForYou"),
          cross: "center",
          margin: { top: 18, bottom: 10 },
          children: [
            text("acForYou", { width: "fill", font: { size: 18, weight: 700, family: ACADEMY_FONT }, color: C.ink, dark_color: C.nightInk }),
            { id: id(), type: "text", text: w("acSeeAll"), color: C.gold, dark_color: C.darkGold, font: { size: 12.5, weight: 700 }, padding: pad(6, 2), action: courses },
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
            width: 232,
            children: [
              {
                id: id(),
                type: "stack",
                height: 112,
                radius: 20,
                children: [
                  { id: id(), type: "image", bind: "image", width: "fill", height: 112, radius: 20 },
                  {
                    id: id(),
                    type: "row",
                    padding: pad(12, 12),
                    children: [{ id: id(), type: "text", bind: "badge", font: { size: 11, weight: 800 }, padding: pad(4, 9), radius: 9, background: C.gold, dark_background: C.darkGold, color: "#2A1D05" }],
                  },
                ],
              },
              { id: id(), type: "text", bind: "title", max_lines: 1, font: { size: 15, weight: 700 }, margin: { top: 10, end: 2, bottom: 3, start: 2 }, color: C.ink, dark_color: C.nightInk },
              {
                id: id(),
                type: "row",
                cross: "center",
                padding: pad(0, 2),
                children: [
                  { id: id(), type: "text", bind: "subtitle", width: "fill", max_lines: 1, font: { size: 12 }, color: C.muted, dark_color: C.nightMuted },
                  { id: id(), type: "text", bind: "price", font: { size: 14, weight: 700 }, color: C.gold, dark_color: C.darkGold },
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
  appearance: Partial<Pick<Appearance, "secondary_color" | "font_family" | "arabic_font">>;
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
  // The approved bar: frosted, floating, every tab named, the open one in ink.
  tab_bar: { design: "glass", avatar: true, radius: 26, margin: 16, labels: "always", active: C.ink, dark_active: C.nightInk },
  // By day the main colour; by night a dark header with light words, the gold in the bar.
  page_header: { dark_background: C.nightCard, dark_color: C.nightInk },
  bare_tab_pages: true,
  appearance: { secondary_color: C.gold, font_family: ACADEMY_FONT, arabic_font: ACADEMY_FONT },
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
      // The approved sign-in: the welcome large over the academy's navy and gold, the form on a card.
      style: "premium",
      image_url: `${platform.replace(/\/+$/, "")}/design-pictures/academy-mesh-1.jpg`,
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
