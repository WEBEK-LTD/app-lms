import { STORIES } from "@/site/story/stories";
import { STORY_IDS, storyPath } from "@/site/story/types";
import type { IconName } from "@/components/icon-names";
import type { AppScreen } from "@/lib/marketing";
import { lookScreen, studioDemoOfSlug, type LookShotKey } from "@/site/look-shots";

/**
 * 124 The shape of Black Friday's page: the screens and icons, item by
 * item, that the words in src/content/occasions/<lang>.ts follow (the unit
 * tests hold each language to the same counts).
 */

/**
 * The real app screens in the opening's phones (public/screens): the
 * premium academy in the middle, a café designed in Studio and a
 * multi-vendor home at its sides (130.49 Sofra Eats in its Signature look
 * A by night, in place of the café). The page shows only the premium
 * template and screens designed in Studio.
 */
export const HERO_SCREENS: [AppScreen, AppScreen, AppScreen] = ["premium-home", "food-delivery-sig-a-home-dark", "zad-home"];

/**
 * The shop window's displays, kind by kind (lib/marketing `ALL_SOLUTIONS`),
 * Studio's kinds first (130.50 each shows the app itself: `shelfShots`); a
 * kind with its story (site/story) links to the story, any other to its
 * solution page.
 */
export function shopWindowKinds<T extends { id: string }>(solutions: readonly T[], studioIds: ReadonlySet<string>): T[] {
  return [...solutions.filter((s) => studioIds.has(s.id)), ...solutions.filter((s) => !studioIds.has(s.id))];
}

/** Where "All about …" goes: the story of the kind when there is one, else its solution page. */
export function kindPagePath(solutionId: string): string {
  const story = STORY_IDS.find((id) => (STORIES[id].solutions as readonly string[]).includes(solutionId));
  return story ? storyPath(story) : `/solutions/${solutionId}`;
}

/** The phone beside the receipt: your app on your own phone, before you pay. */
export const RECEIPT_SCREEN: AppScreen = "premium-lesson";

/** "From idea to the stores in four steps": one icon per step. */
export const STEP_ICONS: IconName[] = ["account_circle", "palette", "link", "rocket_launch"];

/** "Everything included, explained": each group's icon and one icon per item. */
export const INCLUDED_GROUPS: { id: string; icon: IconName; items: IconName[] }[] = [
  { id: "app", icon: "smartphone", items: ["workspace_premium", "grid_view", "lock", "dark_mode", "shield"] },
  { id: "dashboard", icon: "dashboard", items: ["view_carousel", "visibility", "inventory_2", "monitoring", "apps"] },
  { id: "studio", icon: "dashboard_customize", items: ["palette", "local_shipping", "two_wheeler", "touch_app", "workspace_premium"] },
  { id: "payments", icon: "payments", items: ["shopping_cart", "credit_card", "sell", "phone_iphone"] },
  { id: "notifications", icon: "notifications", items: ["notifications", "campaign", "route"] },
  { id: "languages", icon: "language", items: ["translate", "format_align_right", "edit", "list"] },
  { id: "publishing", icon: "rocket_launch", items: ["storefront", "download", "publish", "account_circle", "key"] },
  { id: "wordpress", icon: "web", items: ["link", "category", "group", "hub", "settings"] },
  { id: "support", icon: "support_agent", items: ["chat", "workspace_premium", "menu_book", "flag", "build"] },
];

/** The terms after the line about the plans, one icon each. */
export const TERM_ICONS: IconName[] = ["schedule", "receipt_long", "account_circle", "calendar_month", "confirmation_number", "credit_card", "event_busy"];

/** How many questions the page answers (8 to 12, the FAQPage data too). */
export const FAQ_COUNT = 12;

/** A real screen of the app, by day and by night (the same picture when the app has no night one). */
export interface ShelfScreen {
  light: AppScreen;
  dark: AppScreen;
}

/** What a kind's display on the shelf shows: a phone in front, and one behind it. */
export interface ShelfShot {
  front: ShelfScreen;
  back: ShelfScreen | null;
}

/** A regular app's screens that have a night picture too (public/screens). */
const NIGHT_SCREENS: Partial<Record<AppScreen, AppScreen>> = { "academy-home": "academy-home-dark" };

/**
 * 130.50 The owner (14 November): every kind on Black Friday's shelf shows
 * a real picture of its app in place of the icons. A Studio kind its demo
 * in its Signature looks (look A in front, look B behind, each by day and
 * by night: site/look-shots.ts): Ride and taxi Masar Rides in front of
 * Lamha Taxi, University Nakhla School's look B in front of its look A, so
 * no two displays are alike; a regular kind its own screens (its solution's
 * `screens`, a kind whose first screen another display already shows
 * leading with its second).
 */
export function shelfShots<T extends { id: string; demoSlug: string; screens: readonly AppScreen[] }>(solutions: readonly T[], studioIds: ReadonlySet<string>): Map<string, ShelfShot> {
  const out = new Map<string, ShelfShot>();
  const shown = new Set<AppScreen>();
  const look = (demo: Parameters<typeof lookScreen>[0], day: LookShotKey, night: LookShotKey): ShelfScreen | null => {
    const light = lookScreen(demo, day);
    return light ? { light, dark: lookScreen(demo, night) ?? light } : null;
  };
  const plain = (screen: AppScreen | undefined): ShelfScreen | null => (screen ? { light: screen, dark: NIGHT_SCREENS[screen] ?? screen } : null);
  for (const s of solutions) {
    const demo = studioIds.has(s.id) ? studioDemoOfSlug(s.demoSlug) : null;
    let shot: ShelfShot | null = null;
    if (demo) {
      const a = look(demo, "a", "a-dark");
      const b = look(demo, "b", "b-dark");
      if (s.id === "rides") shot = a ? { front: a, back: look("taxi", "a", "a-dark") } : null;
      else if (shown.has(a?.light as AppScreen) && b) shot = { front: b, back: a };
      else if (a) shot = { front: a, back: b };
    }
    if (!shot) {
      const [first, second] = s.screens;
      const lead = first && shown.has(first) && second ? [second, first] : [first, second];
      const front = plain(lead[0]);
      if (front) shot = { front, back: plain(lead[1]) };
    }
    if (!shot) continue;
    shown.add(shot.front.light);
    out.set(s.id, shot);
  }
  return out;
}
