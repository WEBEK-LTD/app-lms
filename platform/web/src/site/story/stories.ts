import type { IconName } from "@/components/icon-names";
import type { StudioDemoId } from "@/lib/demo/constants";
import type { AppScreen } from "@/lib/marketing";
import type { StoryId } from "./types";

/**
 * The shape of each story page: its photos, real app screens, icons and
 * numbers, item by item with its words (src/content/stories/<lang>.ts).
 * Photos are read from public/stories/<story>/<photo>.jpg when they are
 * there (./photos.json lists them); a missing one is a gradient with a real
 * screen, never a broken picture.
 */

/** What a scene draws besides its photo and screen. */
export type ChapterArt = "route" | "gate" | "register" | "payslip" | "late" | "scale" | "offer" | "price";

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
    hero: { photo: "school-dawn", screens: ["school-parent", "school-bus"] },
    chapters: [
      { screen: "school-parent", icon: "child_care" },
      { photo: "school-bus", screen: "school-bus", icon: "directions_bus", art: "route" },
      { photo: "school-gate", screen: "school-today", icon: "qr_code_2", art: "gate" },
      { photo: "school-teacher", screen: "school-classroom", icon: "task_alt", art: "register" },
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
        screens: ["school-today", "school-homework"],
        features: ["calendar_month", "assignment", "quiz", "qr_code_2", "workspace_premium", "menu_book", "chat", "campaign", "emoji_events", "directions_bus"],
      },
      {
        icon: "groups",
        screens: ["school-classroom"],
        features: ["event", "task_alt", "edit", "quiz", "emoji_events", "list_alt", "description", "forum", "directions_bus", "event_busy", "receipt_long"],
      },
      {
        icon: "child_care",
        screens: ["school-parent", "school-bus", "school-fees"],
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
    finale: { photo: "school-graduation-1", screen: "school-today" },
  },
  rides: {
    id: "rides",
    icon: "local_taxi",
    accent: "#FFC233",
    demos: ["taxi", "rides"],
    solutions: ["rides"],
    hero: { photo: "rides-waiting", screens: ["taxi-map", "taxi-ride"] },
    chapters: [
      { screen: "taxi-map", icon: "my_location" },
      { screen: "rides-where", icon: "payments", art: "price" },
      { screen: "taxi-driver", icon: "timer", art: "offer" },
      { screen: "taxi-ride", icon: "route", art: "route" },
      { photo: "rides-backseat", screen: "rides-ride", icon: "shield" },
      { photo: "rides-arrive-home", screen: "rides-driver", icon: "home" },
    ],
    interlude: { photo: "rides-night-city" },
    stats: [{ value: 4 }, { value: 2 }, { value: 15, suffix: " min" }, { value: 0, suffix: "%" }],
    systems: [
      {
        icon: "person",
        screens: ["taxi-map", "rides-where", "taxi-ride"],
        features: ["map", "my_location", "schedule", "directions_car", "near_me", "key", "share", "shield", "cancel", "payments", "star", "receipt_long"],
      },
      {
        icon: "directions_car",
        screens: ["taxi-driver", "rides-driver"],
        features: ["bolt", "timer", "directions", "key", "route", "payments", "monitoring", "smartphone"],
      },
      {
        icon: "dashboard_customize",
        screens: [],
        features: ["sell", "tune", "hub", "cancel", "location_on", "schedule", "verified_user", "map", "local_offer", "receipt_long", "call"],
      },
      {
        icon: "local_taxi",
        screens: ["taxi-map"],
        features: ["map", "cloud_sync", "near_me", "space_dashboard"],
      },
    ],
    bundle: ["smartphone", "dashboard_customize", "phone_iphone"],
    finale: { photo: "rides-driver", screen: "rides-ride" },
  },
  delivery: {
    id: "delivery",
    icon: "local_shipping",
    accent: "#FF7A3D",
    demos: ["delivery"],
    solutions: ["delivery"],
    hero: { photo: "delivery-rider", screens: ["delivery-send", "delivery-shipment"] },
    chapters: [
      { photo: "delivery-shop-owner", screen: "delivery-send", icon: "storefront" },
      { photo: "delivery-boxes", screen: "delivery-send", icon: "package_2", art: "price" },
      { screen: "delivery-courier", icon: "two_wheeler" },
      { screen: "delivery-shipment", icon: "route", art: "route" },
      { photo: "delivery-handover", screen: "delivery-shipment", icon: "task_alt" },
    ],
    interlude: { photo: "delivery-van" },
    stats: [{ value: 3 }, { value: 2 }, { value: 10, suffix: " min" }, { value: 0, suffix: "%" }],
    systems: [
      {
        icon: "person",
        screens: ["delivery-send", "delivery-shipment"],
        features: ["package_2", "my_location", "sell", "credit_card", "route", "list_alt", "notifications"],
      },
      {
        icon: "two_wheeler",
        screens: ["delivery-courier"],
        features: ["bolt", "inventory_2", "task_alt", "payments", "directions", "near_me", "smartphone", "hub"],
      },
      {
        icon: "dashboard_customize",
        screens: [],
        features: ["local_shipping", "group", "sell", "tune", "payments", "map", "notifications", "translate"],
      },
    ],
    bundle: ["smartphone", "dashboard_customize", "phone_iphone"],
    finale: { photo: "delivery-map", screen: "delivery-shipment" },
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
