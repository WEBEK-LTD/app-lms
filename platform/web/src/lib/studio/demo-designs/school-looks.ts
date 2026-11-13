import type { LayoutTab, StudioNode, StudioPageScreen } from "../../pages/types";
import { newNodeId } from "../elements";
import { photoOf, scrim } from "../photo-sections";
import type { SectionContext, SectionWord } from "../sections";
import { SCHOOL_HOME_COLORS } from "../school-home";
import { TEACHERS_HOME_COLORS } from "../teachers-home";
import type { DemoPageLook } from "./index";

/**
 * 128 Nakhla School's and Rawaq Academy's pages after their home in the
 * language of the home the owner approved (lib/studio/school-home.ts,
 * teachers-home.ts): the page's header and background in the board's
 * colours by day and by night, and over the screens the board's photos,
 * each with the screen's word at its foot, instead of the plain note
 * (lib/studio/demo-pages.ts). Their entries in lib/studio/demo-designs.
 */

export interface SchoolLook extends DemoPageLook {
  /** The scrim's colour over the photos. */
  shade: string;
  /** The photo over a screen (under public/), with the screen's own word on it. */
  photos: Partial<Record<StudioPageScreen | string, { path: string; word: SectionWord }>>;
}

export const NAKHLA_LOOK: SchoolLook = {
  header: { background: SCHOOL_HOME_COLORS.surface, color: "#10233A", dark_background: SCHOOL_HOME_COLORS.nightSurface, dark_color: "#E9F0F8" },
  background: SCHOOL_HOME_COLORS.paper,
  dark_background: SCHOOL_HOME_COLORS.night,
  headed: true,
  shade: SCHOOL_HOME_COLORS.shade,
  photos: { school: { path: "/stories/school/school-gate.jpg", word: "tipSchool" } },
};

export const RAWAQ_LOOK: SchoolLook = {
  header: { background: TEACHERS_HOME_COLORS.surface, color: TEACHERS_HOME_COLORS.ink, dark_background: TEACHERS_HOME_COLORS.nightSurface, dark_color: TEACHERS_HOME_COLORS.nightInk },
  background: TEACHERS_HOME_COLORS.paper,
  dark_background: TEACHERS_HOME_COLORS.night,
  headed: true,
  shade: TEACHERS_HOME_COLORS.shade,
  photos: { teachers: { path: "/stories/academy/academy-live.jpg", word: "tipTeachers" }, my_courses: { path: "/stories/academy/academy-desk.jpg", word: "tipMyCourses" } },
};

/**
 * Rawaq Academy's tabs as its approved board has them: its second tab is
 * its teachers (the courses are on its home and in the search).
 */
export function rawaqTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return structuredClone([...tabs]).map((t) => (t.id === "courses" ? { id: "teachers", label: "Teachers", icon: "co_present", target: { type: "screen" as const, screen: "teachers" as const } } : t));
}

/** Over a screen of the look's: its photo with the screen's word at its foot, under a scrim; null elsewhere. */
export function schoolPage(look: SchoolLook): (screen: string, ctx: SectionContext) => StudioNode[] | null {
  return (screen, ctx) => {
    const photo = look.photos[screen];
    if (!photo) return null;
    const id = () => (ctx.newId ?? newNodeId)();
    return [
      {
        id: id(),
        type: "stack",
        name: "Photo",
        height: 132,
        radius: 22,
        margin: { top: 12, end: 16, bottom: 4, start: 16 },
        background: look.shade,
        image_background_url: photoOf(ctx, photo.path),
        scrim: scrim(look.shade, 0.1, 0.25, 0.88),
        children: [
          {
            id: id(),
            type: "column",
            height: 132,
            align: "end",
            padding: { top: 14, end: 16, bottom: 14, start: 16 },
            children: [{ id: id(), type: "text", text: ctx.w(photo.word), color: "#FFFFFF", max_lines: 2, font: { size: 15, weight: 800, line_height: 1.3 } }],
          },
        ],
      },
    ];
  };
}
