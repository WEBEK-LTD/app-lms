import type { IconName } from "@/components/icon-names";
import type { StudioDemoId } from "@/lib/demo/constants";
import type { AppScreen } from "@/lib/marketing";
import type { StoryId } from "./types";

/**
 * The shape of each story page: its photos, real app screens, icons and
 * numbers, item by item with its words (src/content/stories/<lang>.ts).
 * Photos are read from public/stories/<story>/<photo>.jpg when they are
 * there (./photos.json lists them); a missing one is a gradient with a real
 * screen, never a broken picture. 130.49 The demos' screens are the demos
 * as they are now, in their Signature look A (Nakhla School's, Lamha
 * Taxi's, Masar Rides's and Sahm Express's), where the app has that screen.
 * 131.40 The flower shop's are Leqaa's own, in its look A (Rose hour) by
 * day and by night, and its look B (Botanical press) in its section.
 */

/** What a scene draws besides its photo and screen. */
export type ChapterArt = "route" | "gate" | "register" | "payslip" | "late" | "scale" | "offer" | "price" | "slots" | "flash" | "card" | "fee";

export interface ChapterShape {
  /** The photo slot's name (public/stories/<story>/<photo>.jpg). */
  photo?: string;
  screen: AppScreen;
  icon: IconName;
  art?: ChapterArt;
}

export interface SystemShape {
  icon: IconName;
  screens: AppScreen[];
  /** One icon per feature, in the words' order. */
  features: IconName[];
}

/** A number that counts up when it comes into view. */
export interface StatShape {
  value: number;
  /** Shown before and after the number, in every language ("+", " s"). */
  prefix?: string;
  suffix?: string;
}

export interface StoryShape {
  id: StoryId;
  icon: IconName;
  /** The page's own colour, on its dark scenes. */
  accent: string;
  /** Its demos on /demo/studio, the first the main one. */
  demos: StudioDemoId[];
  /** The solution pages it tells the story of, which link to it. */
  solutions: string[];
  hero: { photo: string; screens: [AppScreen, AppScreen] };
  chapters: ChapterShape[];
  interlude: { photo: string };
  stats: StatShape[];
  systems: SystemShape[];
  /** One icon per node of the bundle's drawing. */
  bundle: IconName[];
  finale: { photo: string; screen: AppScreen };
}

export const STORIES: Record<StoryId, StoryShape> = {
  school: {
    id: "school",
    icon: "school",
    accent: "#F2A93B",
    demos: ["school"],
    solutions: ["school", "university"],
    hero: { photo: "school-dawn", screens: ["nakhla-parent", "school-bus"] },
    chapters: [
      { screen: "nakhla-parent", icon: "child_care" },
      { photo: "school-bus", screen: "school-bus", icon: "directions_bus", art: "route" },
      { photo: "school-gate", screen: "nakhla-home", icon: "qr_code_2", art: "gate" },
      { photo: "school-teacher", screen: "nakhla-classroom", icon: "task_alt", art: "register" },
      { photo: "school-homework", screen: "school-homework", icon: "assignment" },
      { photo: "school-library", screen: "school-library", icon: "menu_book" },
      { screen: "school-fees", icon: "payments" },
      { photo: "school-office", screen: "school-payslip", icon: "receipt_long", art: "payslip" },
    ],
    interlude: { photo: "school-graduation-2" },
    stats: [{ value: 30, suffix: " s" }, { value: 2 }, { value: 4 }, { value: 0 }],
    systems: [
      {
        icon: "school",
        screens: ["nakhla-home", "school-homework"],
        features: ["calendar_month", "assignment", "quiz", "qr_code_2", "workspace_premium", "menu_book", "chat", "campaign", "emoji_events", "directions_bus"],
      },
      {
        icon: "groups",
        screens: ["nakhla-classroom"],
        features: ["event", "task_alt", "edit", "quiz", "emoji_events", "list_alt", "description", "forum", "directions_bus", "event_busy", "receipt_long"],
      },
      {
        icon: "child_care",
        screens: ["nakhla-parent", "school-bus", "school-fees"],
        features: ["group", "qr_code_2", "monitoring", "payments", "directions_bus", "draw", "event_busy", "person", "menu_book", "description", "chat", "notifications"],
      },
      {
        icon: "apartment",
        screens: ["school-payslip", "school-library"],
        features: ["smartphone", "qr_code_2", "receipt_long", "event_available", "description", "monitoring", "directions_bus", "menu_book", "campaign", "forum", "calendar_month", "payments", "upload"],
      },
      {
        icon: "workspace_premium",
        screens: [],
        features: ["account_circle", "event_available", "hourglass_top", "task_alt", "groups", "workspace_premium", "list_alt", "visibility"],
      },
    ],
    bundle: ["smartphone", "dashboard_customize", "phone_iphone"],
    finale: { photo: "school-graduation-1", screen: "nakhla-home" },
  },
  rides: {
    id: "rides",
    icon: "local_taxi",
    accent: "#FFC233",
    demos: ["taxi", "rides"],
    solutions: ["rides"],
    hero: { photo: "rides-waiting", screens: ["lamha-home", "lamha-ride"] },
    chapters: [
      { screen: "lamha-home", icon: "my_location" },
      { screen: "masar-where", icon: "payments", art: "price" },
      { screen: "lamha-driver", icon: "timer", art: "offer" },
      { screen: "lamha-ride", icon: "route", art: "route" },
      { photo: "rides-backseat", screen: "lamha-ride", icon: "shield" },
      { photo: "rides-arrive-home", screen: "taxi-earnings", icon: "home" },
    ],
    interlude: { photo: "rides-night-city" },
    stats: [{ value: 4 }, { value: 2 }, { value: 15, suffix: " min" }, { value: 0, suffix: "%" }],
    systems: [
      {
        icon: "person",
        screens: ["lamha-home", "masar-where", "lamha-ride"],
        features: ["map", "my_location", "schedule", "directions_car", "near_me", "key", "share", "shield", "cancel", "payments", "star", "receipt_long"],
      },
      {
        icon: "directions_car",
        screens: ["lamha-driver", "taxi-earnings"],
        features: ["bolt", "timer", "directions", "key", "route", "payments", "monitoring", "smartphone"],
      },
      {
        icon: "dashboard_customize",
        screens: [],
        features: ["sell", "tune", "hub", "cancel", "location_on", "schedule", "verified_user", "map", "local_offer", "receipt_long", "call"],
      },
      {
        icon: "local_taxi",
        screens: ["lamha-home"],
        features: ["map", "cloud_sync", "near_me", "space_dashboard"],
      },
    ],
    bundle: ["smartphone", "dashboard_customize", "phone_iphone"],
    finale: { photo: "rides-driver", screen: "lamha-ride" },
  },
  delivery: {
    id: "delivery",
    icon: "local_shipping",
    accent: "#FF7A3D",
    demos: ["delivery"],
    solutions: ["delivery"],
    hero: { photo: "delivery-rider", screens: ["sahm-home", "sahm-tracking"] },
    chapters: [
      { photo: "delivery-shop-owner", screen: "sahm-home", icon: "storefront" },
      { photo: "delivery-boxes", screen: "sahm-home", icon: "package_2", art: "price" },
      { screen: "sahm-job", icon: "two_wheeler" },
      { screen: "sahm-tracking", icon: "route", art: "route" },
      { photo: "delivery-handover", screen: "sahm-tracking", icon: "task_alt" },
    ],
    interlude: { photo: "delivery-van" },
    stats: [{ value: 3 }, { value: 2 }, { value: 10, suffix: " min" }, { value: 0, suffix: "%" }],
    systems: [
      {
        icon: "person",
        screens: ["sahm-home", "sahm-tracking"],
        features: ["package_2", "my_location", "sell", "credit_card", "route", "list_alt", "notifications"],
      },
      {
        icon: "two_wheeler",
        screens: ["sahm-job"],
        features: ["bolt", "inventory_2", "task_alt", "payments", "directions", "near_me", "smartphone", "hub"],
      },
      {
        icon: "dashboard_customize",
        screens: [],
        features: ["local_shipping", "group", "sell", "tune", "payments", "map", "notifications", "translate"],
      },
    ],
    bundle: ["smartphone", "dashboard_customize", "phone_iphone"],
    finale: { photo: "delivery-map", screen: "sahm-tracking" },
  },
  "multi-vendor": {
    id: "multi-vendor",
    icon: "storefront",
    accent: "#3DBE8B",
    demos: ["marketplace"],
    solutions: ["multi-vendor", "food"],
    hero: { photo: "zad-grill", screens: ["zad-home", "zad-tracking"] },
    chapters: [
      { screen: "zad-home", icon: "home" },
      { photo: "zad-kitchen-rush", screen: "zad-grill", icon: "skillet", art: "late" },
      { photo: "zad-market-aisle", screen: "zad-market", icon: "grocery", art: "scale" },
      { photo: "zad-rider-food", screen: "zad-tracking", icon: "delivery_dining", art: "route" },
      { photo: "zad-family-meal", screen: "zad-tracking", icon: "restaurant" },
    ],
    interlude: { photo: "zad-cafe" },
    stats: [{ value: 3 }, { value: 4 }, { value: 48, suffix: " h" }, { value: 0, suffix: "%" }],
    systems: [
      {
        icon: "person",
        screens: ["zad-home", "zad-grill", "zad-tracking"],
        features: ["search", "restaurant_menu", "grocery", "schedule", "credit_card", "local_offer", "card_membership", "redeem", "route", "support_agent"],
      },
      {
        icon: "storefront",
        screens: ["zad-market"],
        features: ["notifications", "hourglass_top", "event_busy", "inventory_2", "upload", "photo_camera", "local_offer", "two_wheeler", "group", "receipt_long", "visibility_off"],
      },
      {
        icon: "two_wheeler",
        screens: ["zad-tracking"],
        features: ["delivery_dining", "map", "payments", "smartphone"],
      },
      {
        icon: "dashboard_customize",
        screens: [],
        features: ["assignment", "percent", "location_on", "local_offer", "card_membership", "redeem", "support_agent", "receipt_long", "undo", "image", "list_alt"],
      },
    ],
    bundle: ["smartphone", "dashboard_customize", "storefront", "two_wheeler"],
    finale: { photo: "zad-friday", screen: "zad-home" },
  },
  academy: {
    id: "academy",
    icon: "workspace_premium",
    // The premium academy's gold, on its navy (#1D2B4F) at night.
    accent: "#E2BE74",
    demos: ["premium_academy"],
    solutions: ["academy"],
    hero: { photo: "academy-desk", screens: ["premium-home", "premium-course"] },
    chapters: [
      { photo: "academy-phone", screen: "premium-account", icon: "login" },
      { photo: "academy-breakfast", screen: "premium-home", icon: "home" },
      { screen: "premium-mine", icon: "monitoring" },
      { screen: "premium-explore", icon: "explore" },
      { screen: "premium-course", icon: "school" },
      { screen: "premium-cart", icon: "shopping_cart" },
      { photo: "academy-live", screen: "premium-home", icon: "live_tv" },
      { screen: "premium-lesson", icon: "edit" },
    ],
    interlude: { photo: "academy-evening" },
    stats: [{ value: 15, suffix: " min" }, { value: 10, suffix: " s" }, { value: 3 }, { value: 0 }],
    systems: [
      {
        icon: "person",
        screens: ["premium-explore", "premium-lesson"],
        features: ["home", "bolt", "monitoring", "explore", "smart_display", "edit", "quiz", "live_tv", "workspace_premium", "download", "account_circle", "phone_iphone", "shield"],
      },
      {
        icon: "shopping_cart",
        screens: ["premium-course", "premium-cart"],
        features: ["task_alt", "sell", "credit_card", "phone_iphone", "shopping_cart", "local_offer", "lock", "receipt_long"],
      },
      {
        icon: "dashboard_customize",
        screens: [],
        features: ["school", "smart_display", "quiz", "assignment", "workspace_premium", "schedule", "route", "monitoring", "person", "devices", "notifications", "forum", "emoji_events"],
      },
      {
        icon: "palette",
        screens: ["premium-account", "premium-mine"],
        features: ["palette", "tab", "dashboard_customize", "dark_mode", "login", "view_agenda", "translate", "web"],
      },
      {
        icon: "web",
        screens: [],
        features: ["cloud_sync", "task_alt", "forum", "group", "shopping_cart", "credit_card"],
      },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "academy-graduation", screen: "premium-home" },
  },
  // 131.40 Leqaa, the flower shop: an evening's order for tomorrow's slot, in its look A (Rose hour); look B in its section.
  flowers: {
    id: "flowers",
    icon: "local_florist",
    // Rose hour's candle rose, the colour of its plum night.
    accent: "#F3A9C0",
    demos: ["flowers"],
    solutions: ["store"],
    hero: { photo: "flowers-hero", screens: ["leqaa-home", "leqaa-checkout"] },
    chapters: [
      { screen: "flowers-sig-a-home-dark", icon: "cake" },
      { screen: "leqaa-home", icon: "bolt", art: "flash" },
      { photo: "flowers-blush", screen: "leqaa-product", icon: "local_florist" },
      { screen: "leqaa-checkout", icon: "event_available", art: "slots" },
      { photo: "flowers-card", screen: "leqaa-checkout", icon: "edit_note", art: "card" },
      { screen: "flowers-sig-a-home-dark", icon: "sell", art: "fee" },
      { photo: "flowers-shop", screen: "leqaa-product", icon: "storefront" },
      { photo: "flowers-door", screen: "leqaa-home", icon: "task_alt" },
    ],
    interlude: { photo: "flowers-table" },
    stats: [{ value: 5 }, { value: 11 }, { value: 8 }, { value: 4 }],
    systems: [
      {
        icon: "schedule",
        screens: [],
        features: ["bolt", "calendar_month", "event_busy", "schedule", "groups", "payments", "event_available"],
      },
      {
        icon: "local_florist",
        screens: ["leqaa-product"],
        features: ["local_florist", "add", "block", "tune", "shopping_cart", "timer", "celebration"],
      },
      {
        icon: "redeem",
        screens: ["leqaa-checkout"],
        features: ["view_agenda", "person", "location_on", "pin_drop", "visibility", "visibility_off", "credit_card", "shield"],
      },
      {
        icon: "edit_note",
        screens: [],
        features: ["celebration", "add", "format_quote", "translate", "tune", "edit"],
      },
      {
        icon: "local_shipping",
        screens: [],
        features: ["public", "sell", "location_city", "route", "package_2", "location_on", "payments", "local_offer", "receipt_long"],
      },
      {
        icon: "bolt",
        screens: [],
        features: ["bolt", "timer", "inventory_2", "sell", "confirmation_number", "content_copy"],
      },
      {
        icon: "palette",
        screens: ["flowers-sig-b-home", "flowers-sig-b-home-dark"],
        features: ["local_florist", "spa", "dark_mode", "tab", "smartphone", "account_circle", "dashboard_customize", "translate"],
      },
      {
        icon: "cloud_sync",
        screens: [],
        features: ["inventory_2", "web", "shopping_bag", "storefront", "hub", "history", "local_offer", "code"],
      },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "flowers-vase", screen: "leqaa-home" },
  },
  // 208 Lujain, the clothes shop: a dress for Thursday's wedding, in its look A (LUJAIN) by day and by night; look B (NOUN) in its section.
  clothes: {
    id: "clothes",
    icon: "checkroom",
    // LUJAIN's sale red, lighter on its charcoal night.
    accent: "#E58C84",
    demos: ["clothes"],
    solutions: [],
    hero: { photo: "clothes-hero", screens: ["lujain-home", "lujain-product"] },
    chapters: [
      { screen: "lujain-home", icon: "home" },
      { screen: "lujain-menu", icon: "menu_open" },
      { photo: "clothes-dress", screen: "lujain-product", icon: "straighten" },
      { photo: "clothes-heels", screen: "lujain-product", icon: "checkroom" },
      { screen: "clothes-sig-a-home-dark", icon: "bolt" },
      { photo: "clothes-rack", screen: "lujain-menu", icon: "inventory_2" },
    ],
    interlude: { photo: "clothes-street" },
    stats: [{ value: 8 }, { value: 17 }, { value: 14 }, { value: 3 }],
    systems: [
      { icon: "menu_open", screens: ["lujain-menu"], features: ["view_list", "category", "view_carousel", "search", "person", "dashboard_customize"] },
      { icon: "straighten", screens: ["lujain-product"], features: ["palette", "block", "straighten", "translate", "check", "checkroom"] },
      { icon: "checkroom", screens: [], features: ["checkroom", "add", "sync", "bolt", "confirmation_number"] },
      { icon: "palette", screens: ["clothes-sig-b-home", "clothes-sig-b-home-dark"], features: ["apparel", "trending_up", "dark_mode", "view_carousel", "tab", "dashboard_customize", "translate"] },
      { icon: "cloud_sync", screens: [], features: ["inventory_2", "web", "schedule"] },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "clothes-walk", screen: "lujain-home" },
  },
  // 211 Madar, the electronics shop: a laptop for a new job and a phone traded in, in its look A (MADAR) by day and by night; look B (NABD) in its section.
  electronics: {
    id: "electronics",
    icon: "devices",
    // MADAR's blue, lighter on its night.
    accent: "#93AEFF",
    demos: ["electronics"],
    solutions: [],
    hero: { photo: "electronics-hero", screens: ["madar-home", "madar-product"] },
    chapters: [
      { screen: "madar-home", icon: "home" },
      { screen: "madar-menu", icon: "menu_open" },
      { photo: "electronics-desk", screen: "madar-product", icon: "list_alt" },
      { photo: "electronics-compare", screen: "madar-product", icon: "compare" },
      { photo: "electronics-phone", screen: "electronics-sig-a-home-dark", icon: "sync" },
      { screen: "madar-home", icon: "verified_user" },
    ],
    interlude: { photo: "electronics-glow" },
    stats: [{ value: 9 }, { value: 3 }, { value: 14 }, { value: 3 }],
    systems: [
      { icon: "list_alt", screens: ["madar-product"], features: ["list_alt", "compare", "translate", "search", "dashboard_customize"] },
      { icon: "palette", screens: ["madar-product"], features: ["palette", "inventory_2", "verified_user", "add", "schedule"] },
      { icon: "sync", screens: [], features: ["sync", "payments", "chat", "check"] },
      { icon: "palette", screens: ["electronics-sig-b-home", "electronics-sig-b-home-dark"], features: ["devices", "bolt", "dark_mode", "view_carousel", "tab", "dashboard_customize", "translate"] },
      { icon: "cloud_sync", screens: [], features: ["inventory_2", "web", "schedule"] },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "electronics-buds", screen: "madar-home" },
  },
  // 211 Nova, the mobiles shop: an old phone traded in for a new one, in its look A (NOVA) by day and by night; look B (emerald) in its section.
  mobiles: {
    id: "mobiles",
    icon: "smartphone",
    // NOVA's cobalt, lighter on its graphite night.
    accent: "#8FA8FF",
    demos: ["mobiles"],
    solutions: [],
    hero: { photo: "mobiles-hero", screens: ["nova-home", "nova-product"] },
    chapters: [
      { screen: "nova-home", icon: "home" },
      { photo: "mobiles-box", screen: "nova-home", icon: "sync" },
      { photo: "mobiles-camera", screen: "nova-product", icon: "table_chart" },
      { screen: "nova-product", icon: "compare" },
      { screen: "mobiles-sig-a-home-dark", icon: "verified" },
      { photo: "mobiles-hand", screen: "nova-menu", icon: "storefront" },
    ],
    interlude: { photo: "mobiles-food" },
    stats: [{ value: 6 }, { value: 3 }, { value: 14 }, { value: 3 }],
    systems: [
      { icon: "sync", screens: ["nova-home"], features: ["devices", "table_chart", "fact_check", "payments", "notifications", "dashboard_customize"] },
      { icon: "table_chart", screens: ["nova-product"], features: ["palette", "verified", "table_chart", "compare", "translate", "check"] },
      { icon: "verified", screens: [], features: ["verified", "star", "schedule", "sell", "local_offer"] },
      { icon: "palette", screens: ["mobiles-sig-b-home", "mobiles-sig-b-home-dark"], features: ["smartphone", "trending_up", "dark_mode", "view_carousel", "tab", "dashboard_customize", "translate"] },
      { icon: "cloud_sync", screens: [], features: ["inventory_2", "web", "schedule"] },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "mobiles-earbuds", screen: "nova-home" },
  },
  // 211 Nawah, computers and gaming: a gaming PC built part by part in Jeddah, in its look A (NAWAH) by day and by night; look B (SILICA) in its section.
  computers: {
    id: "computers",
    icon: "computer",
    // NAWAH's blue, lighter on its graphite night.
    accent: "#9DB4FF",
    demos: ["computers"],
    solutions: [],
    hero: { photo: "computers-hero", screens: ["nawah-home", "nawah-product"] },
    chapters: [
      { screen: "nawah-home", icon: "home" },
      { photo: "computers-socket", screen: "nawah-home", icon: "computer" },
      { photo: "computers-parts", screen: "nawah-home", icon: "construction" },
      { screen: "nawah-menu", icon: "tune" },
      { photo: "computers-laptop", screen: "nawah-product", icon: "compare" },
      { screen: "computers-sig-a-home-dark", icon: "package_2" },
    ],
    interlude: { photo: "computers-play" },
    stats: [{ value: 8 }, { value: 4 }, { value: 14 }, { value: 3 }],
    systems: [
      { icon: "construction", screens: ["nawah-home"], features: ["computer", "category", "bolt", "check", "block", "add_shopping_cart"] },
      { icon: "tune", screens: ["nawah-menu"], features: ["computer", "keyboard", "devices", "tune", "search", "dashboard_customize"] },
      { icon: "compare", screens: ["nawah-product"], features: ["table_chart", "compare", "tune", "verified_user", "schedule"] },
      { icon: "palette", screens: ["computers-sig-b-home", "computers-sig-b-home-dark"], features: ["computer", "format_list_numbered", "dark_mode", "view_carousel", "tab", "dashboard_customize", "translate"] },
      { icon: "cloud_sync", screens: [], features: ["inventory_2", "web", "schedule"] },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "computers-desk", screen: "nawah-home" },
  },
};

/** Every photo slot of a story, each once. */
export function photoSlots(story: StoryShape): string[] {
  const all = [story.hero.photo, ...story.chapters.map((c) => c.photo), story.interlude.photo, story.finale.photo];
  return [...new Set(all.filter((p): p is string => Boolean(p)))];
}

/** Every real screen a story shows. */
export function storyScreens(story: StoryShape): AppScreen[] {
  return [...new Set([...story.hero.screens, ...story.chapters.map((c) => c.screen), ...story.systems.flatMap((s) => s.screens), story.finale.screen])];
}
