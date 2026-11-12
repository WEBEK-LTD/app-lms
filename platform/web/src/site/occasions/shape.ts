import type { IconName } from "@/components/icon-names";
import type { AppScreen } from "@/lib/marketing";

/**
 * 124 The shape of Black Friday's page: the screens and icons, item by
 * item, that the words in src/content/occasions/<lang>.ts follow (the unit
 * tests hold each language to the same counts).
 */

/**
 * The real app screens in the opening's phones (public/screens): the
 * premium academy in the middle, a café designed in Studio and a
 * multi-vendor home at its sides. The page shows only the premium
 * template and screens designed in Studio.
 */
export const HERO_SCREENS: [AppScreen, AppScreen, AppScreen] = ["premium-home", "studio-cafe-home-dark", "zad-home"];

/**
 * The shop window's displays, kind by kind (lib/marketing `ALL_SOLUTIONS`):
 * the premium or Studio screen that shows that kind. A kind without one is
 * lit as a sign of its own, without a phone.
 */
export const KIND_SCREENS: Partial<Record<string, AppScreen>> = {
  academy: "premium-home",
  restaurant: "studio-cafe-home",
  delivery: "sahm-shipment",
  food: "zad-home",
  "multi-vendor": "zad-grill",
  rides: "taxi-on-ride",
  university: "premium-course",
  instructors: "premium-explore",
};

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
