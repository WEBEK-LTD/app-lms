import type { StudioNode, StudioPage } from "../pages/types";
import { newNodeId } from "./elements";
import { photoHero, photoOf, photoTiles, titleWithLink } from "./photo-sections";
import type { SectionContext } from "./sections";

/**
 * 128 A school's home as the owner approved it for Nakhla School (the
 * approved board, light and dark): the school's photo under a scrim with
 * the family's greeting and today's date at its foot, the app's name and
 * the notifications over it; the children to switch between; today's card
 * for the chosen child (in at the gate, the class now and next, the bus
 * home), drawn by the app from the family's own day; then this week at
 * school as photo tiles. Each part is a Studio element the owner can
 * change; a parent's parts show only signed in, with something to show.
 */

/** The approved board's colours, by day and by night. */
export const SCHOOL_HOME_COLORS = {
  primary: "#1F4E79",
  gold: "#F2B544",
  paper: "#F4F6F9",
  night: "#09131F",
  surface: "#FFFFFF",
  nightSurface: "#122033",
  shade: "#0A1E34",
  link: "#1F4E79",
  nightLink: "#9CC3EA",
} as const;
const C = SCHOOL_HOME_COLORS;

export function schoolTodayHome(ctx: SectionContext): StudioPage {
  const id = () => (ctx.newId ?? newNodeId)();
  // The school's news are on its School screen.
  const news = { type: "screen" as const, screen: "school" as const };
  const part = (section: NonNullable<StudioNode["school"]>["section"], extra: Partial<StudioNode>): StudioNode => ({ id: id(), type: "school", school: { section }, ...extra });
  return {
    // The app's name and the notifications over the photo.
    header: { type: "transparent", buttons: ["notifications"] },
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
            photo: photoOf(ctx, "/demo-screens/nakhla-school.jpg"),
            height: 250,
            shade: C.shade,
            // Signed out, the element's own words under today's date.
            words: [part("greeting", { text: ctx.w("sdWelcome"), color: "#FFFFFF" })],
          },
          ctx.w("sdWelcome"),
        ),
        part("children", { visibility: "signed_in", margin: { top: 14, end: 16, bottom: 0, start: 16 } }),
        part("today", { visibility: "signed_in", radius: 22, background: C.surface, dark_background: C.nightSurface, shadow: "light", margin: { top: 14, end: 16, bottom: 0, start: 16 } }),
        titleWithLink(ctx, "sdWeek", "sdAllNews", news, { link: C.link, darkLink: C.nightLink }),
        photoTiles(
          ctx,
          [
            { photo: photoOf(ctx, "/stories/school/school-graduation-1.jpg"), caption: "sdFair", action: news },
            { photo: photoOf(ctx, "/stories/school/school-teacher.jpg"), caption: "sdParents", action: news },
          ],
          ctx.w("sdWeek"),
        ),
      ],
    },
  };
}
