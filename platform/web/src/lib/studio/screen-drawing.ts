import type { CourseCardLook, CoursePageLook, StudioScreens } from "./screens";
// 130.21 The system screens' premium looks.
import { systemLookFor, systemScreenOf, type SystemLook, type SystemScreenKey } from "./premium-chrome";

/**
 * 124.8 Which of the app's screens Studio's canvas draws as the app does,
 * in the look the project chose in Studio › Screens (`Config.screens`),
 * for a page drawn around one (`StudioPage.screen`): the academy's
 * catalog (the premium Explore or the app's own), My courses, the account
 * (the premium academy's card, or the plain list with or without the
 * card in the main colour), a course's page and a lesson. Every other
 * screen has no drawing yet (null): the canvas says the app draws it. The
 * Flutter screens these follow: mobile/lib/modules/lms/courses/
 * courses_screen.dart and explore_parts.dart, my_courses/, shared/account/
 * profile_screen.dart and academy_look.dart, courses/course_detail_screen.
 * dart and lesson/.
 */
export type ScreenDrawing =
  | { screen: "catalog"; look: "explore" | "default"; card: CourseCardLook | null }
  | { screen: "my_courses"; look: "premium" | "default" }
  | { screen: "account"; look: "academy" | "plain" | "card"; screens: StudioScreens | null }
  | { screen: "course"; look: "premium" | "default"; page: CoursePageLook }
  | { screen: "lesson"; look: "premium" | "default" }
  // 130.21 One of the app's system screens (the account, settings, notifications, editing the profile, the lists) in its premium look, in every kind of app.
  | { screen: "system"; key: SystemScreenKey; look: SystemLook; image: string | null };

/** The drawing of a page's screen in this project, or null when the canvas has none for it. */
export function screenDrawing(screen: string | null | undefined, appType: string, screens: StudioScreens | null | undefined): ScreenDrawing | null {
  // 130.21 A system screen with a premium look is drawn in it, whatever the app.
  const key = systemScreenOf(screen);
  const look = key ? systemLookFor(screens?.system, key) : null;
  if (key && look) return { screen: "system", key, look, image: screens?.system?.image_url ?? screens?.sign_in?.image_url ?? null };
  if (!screen || appType !== "lms") return null;
  const looks = screens?.looks ?? {};
  switch (screen) {
    case "courses":
      return { screen: "catalog", look: looks.catalog === "explore" ? "explore" : "default", card: screens?.course_card ?? null };
    case "my_courses":
      return { screen: "my_courses", look: looks.my_courses === "premium" ? "premium" : "default" };
    case "account": {
      // The cover, tiles and night tops have no drawing yet.
      const header = screens?.account_menu?.header ?? "plain";
      if (header !== "academy" && header !== "plain" && header !== "card") return null;
      return { screen: "account", look: header, screens: screens ?? null };
    }
    case "course": {
      const page = screens?.course_page ?? { cover: "classic", bar: "classic", hide: [] };
      return { screen: "course", look: page.look === "premium" ? "premium" : "default", page };
    }
    case "lesson":
      return { screen: "lesson", look: looks.lesson === "premium" ? "premium" : "default" };
    default:
      return null;
  }
}

/**
 * 124.8 Where in Studio › Screens a screen's look is chosen (the heading's
 * id there, app/dashboard/screens/editor.tsx), or null when it has none
 * there: the account menu in every app; the catalog, My courses, a
 * lesson's looks and a course's page in an academy.
 */
export function screenLookSection(screen: string | null | undefined, appType: string): string | null {
  // 130.21 The system screens' look.
  if (systemScreenOf(screen) && screen !== "account") return "h-system-look";
  if (screen === "account") return "h-account-menu";
  if (appType !== "lms") return null;
  if (screen === "courses" || screen === "my_courses" || screen === "lesson") return "h-looks";
  if (screen === "course") return "h-course-page";
  return null;
}
