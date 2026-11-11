import type { Appearance, LayoutTab, StudioHeader, StudioNode, StudioPage, TabBarStyle } from "../pages/types";
import { newNodeId } from "./elements";
import type { StudioScreens } from "./screens";
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

function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** The academy's home page, in the brand's colour (`ctx.brand`) with gold. */
export function academyHome(ctx: SectionContext): StudioPage {
  const id = () => (ctx.newId ?? newNodeId)();
  const w = (word: SectionWord) => ctx.w(word);
  const courses = { type: "screen" as const, screen: "courses" as const };
  const text = (word: SectionWord, extra: Partial<StudioNode>): StudioNode => ({ id: id(), type: "text", text: w(word), ...extra });
  const heading = (word: SectionWord, more = true): StudioNode => ({
    id: id(),
    type: "row",
    name: w(word),
    cross: "center",
    gap: 8,
    padding: pad(0, 18),
    margin: { top: 22, bottom: 10 },
    children: [
      text(word, { width: "fill", font: { size: 18, weight: 800, family: ACADEMY_FONT }, color: C.ink, dark_color: C.nightInk }),
      ...(more
        ? [{ id: id(), type: "text" as const, text: w("seeAll"), color: C.gold, dark_color: C.darkGold, font: { size: 13, weight: 700 as const }, padding: pad(6, 2), action: courses }]
        : []),
    ],
  });
  const promise = (icon: string, word: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    cross: "center",
    gap: 6,
    padding: pad(8, 12),
    radius: 99,
    background: "#FFFFFF",
    dark_background: C.nightCard,
    border_color: C.line,
    border_width: 1,
    children: [
      { id: id(), type: "icon", icon, icon_size: 18, color: C.gold, dark_color: C.darkGold },
      text(word, { font: { size: 12, weight: 600 }, color: C.ink, dark_color: C.nightInk }),
    ],
  });
  const deep = mix(ctx.brand, "#000000", 0.45);
  return {
    header: { type: "logo_actions", buttons: ["search", "cart", "notifications"], background: C.paper, dark_background: C.night, color: C.ink, dark_color: C.nightInk },
    background: C.paper,
    dark_background: C.night,
    body: {
      id: id(),
      type: "column",
      padding: { bottom: 24 },
      children: [
        // The greeting.
        {
          id: id(),
          type: "column",
          name: w("acHeadline"),
          gap: 4,
          padding: { top: 6, end: 18, bottom: 4, start: 18 },
          children: [
            text("acHello", { font: { size: 13, weight: 700 }, color: C.gold, dark_color: C.darkGold }),
            text("acHeadline", { font: { size: 25, weight: 800, line_height: 1.25, family: ACADEMY_FONT }, color: C.ink, dark_color: C.nightInk }),
          ],
        },
        // The banner: navy and gold, the main colour under the picture.
        {
          id: id(),
          type: "stack",
          name: w("acHeroTitle"),
          height: 214,
          radius: 26,
          margin: { top: 14, end: 16, bottom: 0, start: 16 },
          background: ctx.brand,
          image_background_url: ctx.picture?.("academy-classic-2.jpg") ?? null,
          overlay: { color: deep, opacity: 0.35 },
          shadow: "medium",
          children: [
            {
              id: id(),
              type: "column",
              align: "end",
              gap: 8,
              padding: pad(20, 20),
              color: "#FFFFFF",
              children: [
                {
                  id: id(),
                  type: "row",
                  width: "hug",
                  self_align: "start",
                  cross: "center",
                  gap: 4,
                  padding: pad(4, 10),
                  radius: 99,
                  background: C.goldLight,
                  children: [
                    { id: id(), type: "icon", icon: "bolt", icon_size: 14, color: C.ink },
                    text("acHeroKicker", { font: { size: 11, weight: 800 }, color: C.ink }),
                  ],
                },
                text("acHeroTitle", { font: { size: 22, weight: 800, line_height: 1.3, family: ACADEMY_FONT }, color: "#FFFFFF" }),
                {
                  id: id(),
                  type: "button",
                  text: w("acHeroButton"),
                  width: "hug",
                  height: 42,
                  radius: 14,
                  background: C.goldLight,
                  color: C.ink,
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
        // What the academy promises.
        {
          id: id(),
          type: "row",
          name: w("acPromises"),
          scroll: true,
          gap: 8,
          padding: { top: 14, end: 16, bottom: 0, start: 16 },
          children: [promise("workspace_premium", "acPromiseCertificate"), promise("devices", "acPromisePhone"), promise("key", "acPromiseLifetime")],
        },
        // The subjects.
        heading("acSubjects", false),
        { id: id(), type: "categories", source: ctx.source ?? undefined, style: "circles", padding: pad(0, 12) },
        // The popular courses.
        heading("acPopular"),
        { id: id(), type: "items", source: ctx.source ?? undefined, layout: "carousel", gap: 12, padding: pad(0, 16), query: { limit: 6, category_id: null, featured: false, sort: "popular", ids: [] } },
        // The certificate card, in the main colour with gold.
        {
          id: id(),
          type: "row",
          name: w("acCertTitle"),
          cross: "center",
          gap: 14,
          padding: pad(18, 18),
          margin: { top: 22, end: 16, bottom: 0, start: 16 },
          radius: 24,
          gradient: { from: ctx.brand, to: deep, angle: 135 },
          shadow: "light",
          children: [
            {
              id: id(),
              type: "column",
              width: "fill",
              gap: 6,
              children: [
                text("acCertKicker", { font: { size: 12, weight: 800 }, color: C.goldLight }),
                text("acCertTitle", { font: { size: 17, weight: 800, line_height: 1.35, family: ACADEMY_FONT }, color: "#FFFFFF" }),
                // A gold outline over the card, by day and by night.
                {
                  id: id(),
                  type: "row",
                  name: w("ctaLearn"),
                  width: "hug",
                  self_align: "start",
                  cross: "center",
                  gap: 4,
                  radius: 12,
                  border_color: C.goldLight,
                  border_width: 1.5,
                  padding: pad(8, 14),
                  margin: { top: 4 },
                  action: courses,
                  children: [text("ctaLearn", { font: { weight: 700, size: 13 }, color: C.goldLight }), { id: id(), type: "icon", icon: "arrow_forward", icon_size: 16, color: C.goldLight }],
                },
              ],
            },
            { id: id(), type: "icon", icon: "workspace_premium", icon_size: 56, color: C.goldLight },
          ],
        },
        // The newest courses.
        heading("acNew"),
        { id: id(), type: "items", source: ctx.source ?? undefined, layout: "list", gap: 10, padding: pad(0, 16), query: { limit: 4, category_id: null, featured: false, sort: "newest", ids: [] } },
      ],
    },
  };
}

/** What a template sets for the whole project besides its home (lib/studio/start.ts, lib/studio/new-project.ts). */
export interface TemplateProject {
  /** The main colour the project starts in, unless the owner chose one. */
  primary: string;
  tab_bar: TabBarStyle;
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
  tab_bar: { design: "glass", avatar: true, radius: 24, margin: 12, labels: "active", dark_active: C.darkGold },
  // By day the main colour; by night a dark header with light words, the gold in the bar.
  page_header: { dark_background: C.nightCard, dark_color: C.nightInk },
  appearance: { secondary_color: C.gold, font_family: ACADEMY_FONT, arabic_font: ACADEMY_FONT },
  tabs: (tabs, site) => {
    const out = structuredClone([...tabs]).map((t) => (t.id === "courses" ? { ...t, icon: "explore" } : t));
    if (!site) return out;
    // The site's blog in the app: the page alone, its own header and footer hidden, its links kept in the app.
    const blog: LayoutTab = {
      id: "blog",
      label: "Blog",
      icon: "newspaper",
      target: { type: "url", url: `${site}/blog/`, open_in: "in_app", web: { hide_header: true, hide_footer: true, links_inside: true } },
    };
    const at = out.findIndex((t) => t.id === "courses");
    out.splice(at === -1 ? Math.max(out.length - 1, 0) : at + 1, 0, blog);
    return out;
  },
  screens: (platform) => ({
    sign_in: {
      style: "photo",
      image_url: `${platform.replace(/\/+$/, "")}/demo-screens/rawaq-library.jpg`,
      title: { en: "Learn from the best", ar: "تعلّم من الأفضل", tr: "En iyilerden öğren" },
      subtitle: {
        en: "Sign in with your phone number to continue your courses.",
        ar: "سجّل الدخول برقم هاتفك لتكمل دوراتك.",
        tr: "Kurslarına devam etmek için telefon numaranla giriş yap.",
      },
      show_logo: true,
    },
    account_menu: {
      header: "night",
      accent: C.darkGold,
      items: (["my_courses", "certificates", "quiz_results", "wishlist", "orders", "notifications", "settings", "help", "privacy", "terms"] as const).map((key) => ({ key, hidden: false, label: {}, icon: null })),
    },
    course_card: { style: "rich", radius: 20, hide: [] },
    course_page: { cover: "full", bar: "glass", hide: [] },
  }),
};
