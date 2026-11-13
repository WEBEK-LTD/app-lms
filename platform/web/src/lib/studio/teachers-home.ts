import type { StudioNode, StudioPage } from "../pages/types";
import { newNodeId } from "./elements";
import { peopleRow, photoHero, photoOf, titleWithLink } from "./photo-sections";
import type { SectionContext } from "./sections";

/**
 * 128 An academy with many teachers, as the owner approved its home for
 * Rawaq Academy (the approved board, light and dark): a library's photo
 * under a scrim with "Real teachers. Real skills." at its foot and the
 * search over it, the teachers to meet in circles, and this month's
 * popular courses as cards with their photo, teacher, rating and price.
 */

export const TEACHERS_HOME_COLORS = {
  primary: "#2E5E4E",
  gold: "#F2B544",
  paper: "#F5F4EE",
  night: "#0C1511",
  surface: "#FFFFFF",
  nightSurface: "#15221C",
  line: "#E2E0D6",
  nightLine: "#24352D",
  ink: "#15241D",
  nightInk: "#ECF3EF",
  muted: "#5A665F",
  nightMuted: "#A9B7AF",
  shade: "#0E221B",
  link: "#2E5E4E",
  nightLink: "#8FD1B6",
} as const;
const C = TEACHERS_HOME_COLORS;

export function teachersPhotoHome(ctx: SectionContext): StudioPage {
  const id = () => (ctx.newId ?? newNodeId)();
  const teachers = { type: "screen" as const, screen: "teachers" as const };
  const text = (value: string, extra: Partial<StudioNode>): StudioNode => ({ id: id(), type: "text", text: value, ...extra });
  return {
    header: { type: "transparent", buttons: ["search"] },
    background: C.paper,
    dark_background: C.night,
    body: {
      id: id(),
      type: "column",
      padding: { bottom: 24 },
      children: [
        photoHero(
          ctx,
          {
            photo: photoOf(ctx, "/demo-screens/rawaq-library.jpg"),
            height: 300,
            shade: C.shade,
            words: [
              text(ctx.w("rqKicker"), { color: C.gold, font: { size: 12, weight: 800, letter_spacing: 1.9, uppercase: true } }),
              text(ctx.w("rqTitle"), { color: "#FFFFFF", margin: { top: 6 }, font: { size: 29, weight: 800, line_height: 1.06, letter_spacing: -0.6 } }),
            ],
          },
          ctx.w("rqTitle"),
        ),
        titleWithLink(ctx, "rqMeet", "rqAllTeachers", teachers, { link: C.link, darkLink: C.nightLink }, { top: 16, end: 16, bottom: 10, start: 16 }),
        peopleRow(
          ctx,
          [
            { initials: "rqP1i", name: "rqP1", color: "#2E5E4E" },
            { initials: "rqP2i", name: "rqP2", color: "#B8893A" },
            { initials: "rqP3i", name: "rqP3", color: "#34336B" },
            { initials: "rqP4i", name: "rqP4", color: "#B4235A" },
          ],
          ctx.w("rqMeet"),
          { action: teachers },
        ),
        titleWithLink(ctx, "rqPopular", null, null, { link: C.link, darkLink: C.nightLink }, { top: 18, end: 16, bottom: 10, start: 16 }),
        {
          id: id(),
          type: "items",
          name: ctx.w("rqPopular"),
          source: ctx.source ?? undefined,
          layout: "carousel",
          gap: 12,
          padding: { top: 0, end: 16, bottom: 0, start: 16 },
          query: { limit: 6, category_id: null, featured: false, sort: "popular", ids: [] },
          card: {
            id: id(),
            type: "column",
            width: 220,
            radius: 22,
            background: C.surface,
            dark_background: C.nightSurface,
            border_color: C.line,
            dark_border_color: C.nightLine,
            border_width: 1,
            children: [
              {
                id: id(),
                type: "stack",
                height: 120,
                children: [
                  { id: id(), type: "image", bind: "image", width: "fill", height: 120, corners: { top_start: 21, top_end: 21 } },
                  {
                    id: id(),
                    type: "row",
                    padding: { top: 10, end: 10, bottom: 10, start: 10 },
                    children: [{ id: id(), type: "text", bind: "badge", font: { size: 11, weight: 800 }, padding: { top: 4, end: 10, bottom: 4, start: 10 }, radius: 12, background: C.gold, color: "#1E2E25" }],
                  },
                ],
              },
              {
                id: id(),
                type: "column",
                gap: 3,
                padding: { top: 10, end: 12, bottom: 12, start: 12 },
                children: [
                  { id: id(), type: "text", bind: "title", max_lines: 2, font: { size: 14, weight: 800 }, color: C.ink, dark_color: C.nightInk },
                  {
                    id: id(),
                    type: "row",
                    cross: "center",
                    gap: 4,
                    children: [
                      { id: id(), type: "text", bind: "subtitle", max_lines: 1, font: { size: 12 }, color: C.muted, dark_color: C.nightMuted },
                      // "Omar Farouk · ★ 4.8", as approved: the rating's star drawn as the icon, nothing without a rating.
                      { id: id(), type: "text", bind: "rating", text: "·", font: { size: 12 }, color: C.muted, dark_color: C.nightMuted },
                    ],
                  },
                  { id: id(), type: "text", bind: "price", margin: { top: 3 }, font: { size: 15, weight: 800 }, color: C.primary, dark_color: C.nightLink },
                ],
              },
            ],
          },
        },
      ],
    },
  };
}
