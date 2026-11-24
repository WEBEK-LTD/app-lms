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
  // 209 Velours, the cosmetics shop: the right foundation before a party; 224 in its templates C (the ritual clinic) and D (the shade studio).
  beauty: {
    id: "beauty",
    icon: "spa",
    // VELOURS's rose, as its night writes it.
    accent: "#EFA6C3",
    demos: ["beauty"],
    solutions: [],
    hero: { photo: "beauty-hero", screens: ["beauty-sig-c-home", "beauty-sig-c-product"] },
    chapters: [
      { screen: "beauty-sig-c-home", icon: "home" },
      { photo: "beauty-shades", screen: "beauty-sig-d-home", icon: "palette" },
      { screen: "beauty-sig-c-product", icon: "verified" },
      { photo: "beauty-serum", screen: "beauty-sig-c-home-dark", icon: "quiz" },
      { screen: "beauty-sig-d-home-dark", icon: "redeem" },
      { photo: "beauty-routine", screen: "beauty-sig-c-menu", icon: "inventory_2" },
    ],
    interlude: { photo: "beauty-bath" },
    stats: [{ value: 8 }, { value: 12 }, { value: 4 }, { value: 3 }],
    systems: [
      { icon: "palette", screens: ["beauty-sig-d-product"], features: ["palette", "check", "block", "inventory_2", "dashboard_customize"] },
      { icon: "quiz", screens: ["beauty-sig-c-home"], features: ["quiz", "category", "workspace_premium", "translate", "dashboard_customize"] },
      { icon: "verified", screens: ["beauty-sig-c-product"], features: ["list_alt", "menu_book", "verified", "event_available", "favorite", "table_chart"] },
      { icon: "redeem", screens: [], features: ["redeem", "sell", "bolt", "confirmation_number", "sync"] },
      { icon: "dashboard_customize", screens: ["beauty-sig-d-home", "beauty-sig-d-menu"], features: ["spa", "healing", "dark_mode", "view_carousel", "tab", "dashboard_customize", "translate"] },
      { icon: "cloud_sync", screens: [], features: ["inventory_2", "web", "schedule"] },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "beauty-candle", screen: "beauty-sig-c-home" },
  },
  // 209 Toota, the kids' clothes shop: a newborn gift and a coat for the first cold week, in its look A (TOOTA) by day and by night; look B (MINIMO) in its section.
  kids: {
    id: "kids",
    icon: "child_care",
    // TOOTA's terracotta, lighter on its cocoa night.
    accent: "#EFA08C",
    demos: ["kids"],
    solutions: [],
    hero: { photo: "kids-hero", screens: ["toota-home", "toota-product"] },
    chapters: [
      { screen: "toota-home", icon: "home" },
      { screen: "toota-menu", icon: "menu_open" },
      { photo: "kids-newborn", screen: "toota-home", icon: "straighten" },
      { photo: "kids-gift", screen: "toota-product", icon: "redeem" },
      { screen: "kids-sig-a-home-dark", icon: "bolt" },
      { photo: "kids-school", screen: "toota-menu", icon: "inventory_2" },
    ],
    interlude: { photo: "kids-party" },
    stats: [{ value: 7 }, { value: 12 }, { value: 30 }, { value: 3 }],
    systems: [
      { icon: "straighten", screens: ["toota-home"], features: ["child_care", "straighten", "table_chart", "translate", "check", "block"] },
      { icon: "menu_open", screens: ["toota-menu"], features: ["view_list", "category", "family_restroom", "search", "person", "dashboard_customize"] },
      { icon: "redeem", screens: ["toota-product"], features: ["redeem", "edit_note", "sell", "checkroom", "spa", "verified_user"] },
      { icon: "palette", screens: ["kids-sig-b-home", "kids-sig-b-home-dark"], features: ["toys", "dark_mode", "view_carousel", "tab", "dashboard_customize", "translate"] },
      { icon: "cloud_sync", screens: [], features: ["inventory_2", "web", "schedule"] },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "kids-walk", screen: "toota-home" },
  },
  // 209 Toys
  // 209 Toot, the toy shop: a fourth birthday on Saturday, in its look A (Toot) by day and by night; look B (Mukaab) in its section.
  toys: {
    id: "toys",
    icon: "toys",
    // Toot's plum, lighter on its night.
    accent: "#EAA9C5",
    demos: ["toys"],
    solutions: [],
    hero: { photo: "toys-hero", screens: ["toot-home", "toot-product"] },
    chapters: [
      { screen: "toot-home", icon: "home" },
      { screen: "toot-menu", icon: "child_care" },
      { photo: "toys-bear", screen: "toot-product", icon: "verified_user" },
      { photo: "toys-gift", screen: "toot-home", icon: "redeem" },
      { screen: "toys-sig-a-home-dark", icon: "bolt" },
      { photo: "toys-blocks", screen: "toot-menu", icon: "inventory_2" },
    ],
    interlude: { photo: "toys-play" },
    stats: [{ value: 10 }, { value: 5 }, { value: 30 }, { value: 3 }],
    systems: [
      { icon: "child_care", screens: ["toot-menu"], features: ["child_care", "menu_open", "view_list", "search", "quiz", "dashboard_customize"] },
      { icon: "verified_user", screens: ["toot-product"], features: ["verified_user", "format_paint", "fact_check", "child_care", "translate"] },
      { icon: "redeem", screens: [], features: ["quiz", "redeem", "edit_note", "sell", "bolt", "confirmation_number"] },
      { icon: "palette", screens: ["toys-sig-b-home", "toys-sig-b-home-dark"], features: ["toys", "school", "dark_mode", "view_carousel", "tab", "dashboard_customize", "translate"] },
      { icon: "cloud_sync", screens: [], features: ["inventory_2", "web", "schedule"] },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "toys-finale", screen: "toot-home" },
  },
  // 210 Sakan, the home decor shop: a new flat in Riyadh furnished from one styled corner, a gift wrapped with a card, in its look A (the decor magazine) by day and by night; look B (Teen) in its section.
  decor: {
    id: "decor",
    icon: "chair",
    // Sakan's olive, lighter on its night.
    accent: "#B9C98F",
    demos: ["decor"],
    solutions: [],
    hero: { photo: "decor-hero", screens: ["decor-sig-c-home", "decor-sig-d-home"] },
    chapters: [
      { screen: "decor-sig-c-home", icon: "home" },
      { photo: "decor-room", screen: "sakan-home", icon: "touch_app" },
      { screen: "sakan-product", icon: "straighten" },
      { screen: "sakan-menu", icon: "menu_open" },
      { photo: "decor-vases", screen: "sakan-product", icon: "redeem" },
      { photo: "decor-lantern", screen: "decor-sig-c-home-dark", icon: "nights_stay" },
    ],
    interlude: { photo: "decor-pottery" },
    stats: [{ value: 7 }, { value: 19 }, { value: 14 }, { value: 3 }],
    systems: [
      { icon: "touch_app", screens: ["sakan-home"], features: ["touch_app", "format_list_numbered", "shopping_bag", "dashboard_customize"] },
      { icon: "chair", screens: ["sakan-menu"], features: ["chair", "auto_awesome", "view_list", "search"] },
      { icon: "redeem", screens: [], features: ["redeem", "edit_note", "celebration", "nights_stay"] },
      { icon: "palette", screens: ["decor-sig-d-home", "decor-sig-d-home-dark"], features: ["spa", "dark_mode", "view_carousel", "tab", "dashboard_customize", "translate"] },
      { icon: "cloud_sync", screens: [], features: ["inventory_2", "web", "straighten"] },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "decor-reading", screen: "decor-sig-c-home" },
  },
  // 210 Ghurza, the crochet shop: a blanket ordered in her mother's colours, the days to make, the maker, yarn and a workshop; 224 in its templates C (the makers' market) and D (the cozy studio).
  crochet: {
    id: "crochet",
    icon: "spa",
    // GHURZA's terracotta, lighter on its coffee night.
    accent: "#E8A27F",
    demos: ["crochet"],
    solutions: [],
    hero: { photo: "crochet-cozy-sweater", screens: ["crochet-sig-c-home", "crochet-sig-c-product"] },
    chapters: [
      { screen: "crochet-sig-c-home", icon: "home" },
      { photo: "crochet-fluffy-blanket", screen: "crochet-sig-c-home-dark", icon: "edit_note" },
      { screen: "crochet-sig-c-product", icon: "schedule" },
      { photo: "crochet-knit-flatlay", screen: "crochet-sig-c-menu", icon: "format_quote" },
      { photo: "crochet-knit-coffee", screen: "crochet-sig-d-home", icon: "school" },
      { screen: "crochet-sig-d-home-dark", icon: "inventory_2" },
    ],
    interlude: { photo: "crochet-mittens-coffee" },
    stats: [{ value: 7 }, { value: 36 }, { value: 14 }, { value: 3 }],
    systems: [
      { icon: "edit_note", screens: ["crochet-sig-c-home"], features: ["edit_note", "straighten", "auto_awesome", "check_circle", "smartphone"] },
      { icon: "schedule", screens: ["crochet-sig-c-product"], features: ["schedule", "palette", "local_shipping", "dashboard_customize"] },
      { icon: "spa", screens: [], features: ["spa", "category", "school", "event_available", "redeem"] },
      { icon: "palette", screens: ["crochet-sig-d-home", "crochet-sig-d-menu"], features: ["spa", "dark_mode", "view_carousel", "tab", "auto_awesome", "translate"] },
      { icon: "cloud_sync", screens: [], features: ["inventory_2", "web", "schedule"] },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "crochet-scarves-stack", screen: "crochet-sig-c-home" },
  },
  // 210 Rukn, the furniture shop: a first living room in Riyadh, its fabric and colour, a sofa that fits the wall, delivery and assembly on her day and a unit made to measure, in its look A (RUKN) by day and by night; look B (KANAF) in its section.
  furniture: {
    id: "furniture",
    icon: "living",
    // RUKN's sand, as on its walnut night.
    accent: "#E2C29F",
    demos: ["furniture"],
    solutions: [],
    hero: { photo: "furniture-hero", screens: ["furniture-sig-c-home", "furniture-sig-d-home"] },
    chapters: [
      { screen: "furniture-sig-c-home", icon: "home" },
      { screen: "rukn-menu", icon: "menu_open" },
      { photo: "furniture-fabric", screen: "rukn-product", icon: "format_paint" },
      { photo: "furniture-measure", screen: "rukn-product", icon: "straighten" },
      { screen: "furniture-sig-c-home-dark", icon: "event_available" },
      { photo: "furniture-custom", screen: "furniture-sig-c-home", icon: "edit_note" },
    ],
    interlude: { photo: "furniture-terrace" },
    stats: [{ value: 5 }, { value: 13 }, { value: 21 }, { value: 3 }],
    systems: [
      { icon: "living", screens: ["rukn-menu"], features: ["living", "view_list", "touch_app", "search"] },
      { icon: "straighten", screens: ["rukn-product"], features: ["format_paint", "palette", "straighten", "inventory_2", "schedule"] },
      { icon: "event_available", screens: [], features: ["event_available", "local_shipping", "build", "verified"] },
      { icon: "edit_note", screens: [], features: ["edit_note", "straighten", "notifications", "schedule"] },
      { icon: "palette", screens: ["furniture-sig-d-home", "furniture-sig-d-home-dark"], features: ["chair", "dark_mode", "view_carousel", "tab", "dashboard_customize", "translate"] },
    ],
    bundle: ["smartphone", "dashboard_customize", "web"],
    finale: { photo: "furniture-home", screen: "furniture-sig-c-home" },
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
