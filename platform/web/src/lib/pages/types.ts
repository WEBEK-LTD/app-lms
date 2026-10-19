import { APP_FONTS, APP_TEMPLATES, type AppFont } from "../build-config/types";
import { BUILT_IN_LANGUAGES, LOCALES, RTL_CODES } from "../i18n/locales";

/**
 * An app's pages, tabs, look and languages (roadmap 10.4 to 10.8), in the
 * shapes of docs/api/platform.yaml (`Layout`, `LayoutPage`, `LayoutBlock`)
 * and docs/api/openapi.yaml (`Appearance`, `Languages`, `Action`, `Block`).
 * Stored as JSON, so field names follow the contract.
 */

export { APP_FONTS, APP_TEMPLATES };

export const THEME_MODES = ["system", "light", "dark"] as const;
export const CORNERS = ["sharp", "soft", "round"] as const;
export const CARD_STYLES = ["flat", "outlined", "elevated"] as const;
/** 43 The languages Yallapp ships its own translations in; an app can offer any of `LOCALES` (lib/i18n/locales.ts). */
export const LANGUAGE_CODES = BUILT_IN_LANGUAGES;
export const ITEM_SOURCES = ["courses", "products", "services", "posts", "listings", "articles", "events", "campaigns"] as const;
export const BLOCK_TYPES = [
  "banner",
  "text",
  "image",
  "video",
  "button",
  "items",
  "categories",
  "search",
  "continue_learning",
  "embed",
  "spacer",
  // 33 More blocks.
  "slider",
  "quick_links",
  "testimonials",
  "faq",
  "countdown",
  "contact",
  "hours",
  "social",
  "team",
  "stats",
  "notice",
] as const;
export const VISIBILITIES = ["everyone", "signed_in", "signed_out"] as const;
export const ACTION_TYPES = ["page", "screen", "course", "item", "url"] as const;
export const SCREENS = [
  "courses",
  "my_courses",
  "search",
  "favorites",
  "messages",
  "account",
  "settings",
  "notifications",
  "cart",
  "orders",
  "services",
  "appointments",
  "articles",
  "bookmarks",
  "classes",
  "memberships",
  // 28 Events & tickets
  "events",
  "tickets",
  "campaigns",
  "my_donations",
] as const;
export const ITEMS_LAYOUTS = ["carousel", "grid", "list"] as const;
export const ITEMS_SORTS = ["newest", "popular", "price_asc", "price_desc"] as const;
export const BUTTON_STYLES = ["filled", "outlined", "text"] as const;
export const CATEGORY_STYLES = ["chips", "tiles"] as const;
export const SPACER_SIZES = ["small", "medium", "large"] as const;
// 33
export const QUICK_LINK_STYLES = ["grid", "row"] as const;
export const NOTICE_TONES = ["info", "success", "warning"] as const;
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const SOCIAL_NETWORKS = ["instagram", "facebook", "x", "tiktok", "youtube", "linkedin", "snapchat", "telegram", "whatsapp_channel"] as const;

export type AppTemplateName = (typeof APP_TEMPLATES)[number];
export type ThemeMode = (typeof THEME_MODES)[number];
export type Corners = (typeof CORNERS)[number];
export type CardStyle = (typeof CARD_STYLES)[number];
/** 43 A language code from `LOCALES` ("en", "ar", "fr", "fil"). */
export type LanguageCode = string;
export type ItemSource = (typeof ITEM_SOURCES)[number];
export type BlockType = (typeof BLOCK_TYPES)[number];
export type Visibility = (typeof VISIBILITIES)[number];
export type ScreenName = (typeof SCREENS)[number];
export type ItemsSort = (typeof ITEMS_SORTS)[number];
export type Weekday = (typeof WEEKDAYS)[number];
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export type NoticeTone = (typeof NOTICE_TONES)[number];

/** Each language's name in English, for the dashboard. */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = Object.fromEntries(LOCALES.map((l) => [l.code, l.name]));
/** Languages written right to left. */
export const RTL_LANGUAGES: readonly LanguageCode[] = RTL_CODES;

/** `Appearance` in the app API. */
export interface Appearance {
  template: AppTemplateName;
  theme_mode: ThemeMode;
  user_can_change_mode: boolean;
  secondary_color: string | null;
  font: AppFont;
  corners: Corners;
  cards: CardStyle;
}

/** `Languages` in the app API. */
export interface Languages {
  default: LanguageCode;
  /** Always includes the default; 43 in the owner's order. */
  available: LanguageCode[];
  /** 43 `AppLanguage` for each available language: added when served, never stored. */
  list?: AppLanguage[];
}

/** 43 `AppLanguage` in the app API: a language's names, direction and the owner's interface strings for it. */
export interface AppLanguage {
  code: LanguageCode;
  name: string;
  native_name: string;
  direction: "ltr" | "rtl";
  /** Where the app gets the owner's interface strings; null without any. */
  strings: { url: string; version: string } | null;
}

/** Texts in other languages: language code, then field name. */
export type Translations = Record<LanguageCode, Record<string, string>>;

/** 43 The owner's interface strings: language code, then the app's string key (mobile/lib/l10n). */
export type InterfaceStrings = Record<LanguageCode, Record<string, string>>;

/** `Action` in the app API. */
export interface Action {
  type: (typeof ACTION_TYPES)[number];
  page_slug?: string | null;
  screen?: ScreenName | null;
  course_id?: number | null;
  item?: { source: ItemSource; id: string } | null;
  url?: string | null;
  open_in?: "in_app" | "browser";
}

/** What an `items` block lists (`LayoutBlock.query`). */
export interface ItemsQuery {
  category_id: string | null;
  featured: boolean;
  sort: (typeof ITEMS_SORTS)[number];
  limit: number;
  /** Hand-picked entries, in this order; overrides the other filters when not empty. */
  ids: string[];
}

// 33 Entries of a block's list, each with its own translations.

export interface Slide {
  image_url: string | null;
  heading: string | null;
  subheading: string | null;
  action: Action | null;
  translations?: Translations;
}

export interface QuickLink {
  icon: string;
  label: string;
  action: Action;
  translations?: Translations;
}

export interface Quote {
  text: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  rating: number | null;
  translations?: Translations;
}

export interface FaqEntry {
  question: string;
  answer: string;
  translations?: Translations;
}

export interface Person {
  name: string;
  role: string | null;
  bio: string | null;
  photo_url: string | null;
  action: Action | null;
  translations?: Translations;
}

export interface Stat {
  value: string;
  label: string;
  translations?: Translations;
}

/** An opening period: `closes` earlier than `opens` ends the next day. */
export interface HoursPeriod {
  day: Weekday;
  opens: string;
  closes: string;
}

export interface SocialProfile {
  network: SocialNetwork;
  url: string;
}

/**
 * A block as the dashboard stores it and the plugin receives it
 * (`LayoutBlock`): the app's `Block` without the parts filled in per request.
 */
export interface LayoutBlock {
  id: string;
  type: BlockType;
  visibility: Visibility;
  title?: string | null;
  translations?: Translations;
  // banner, image
  image_url?: string;
  heading?: string | null;
  subheading?: string | null;
  aspect_ratio?: number | null;
  action?: Action | null;
  // text
  html?: string;
  // video, embed
  url?: string;
  poster_url?: string | null;
  height?: number | null;
  // button
  label?: string;
  icon?: string | null;
  style?: string;
  // items, categories, search
  source?: ItemSource;
  layout?: (typeof ITEMS_LAYOUTS)[number];
  see_all?: Action | null;
  query?: ItemsQuery;
  placeholder?: string;
  // spacer
  size?: (typeof SPACER_SIZES)[number];
  // 33 slider
  slides?: Slide[];
  auto_advance?: boolean;
  // quick_links (and `style`: grid or row)
  links?: QuickLink[];
  // testimonials
  quotes?: Quote[];
  // faq
  questions?: FaqEntry[];
  // countdown (and heading, subheading, label, action)
  ends_at?: string;
  ended_text?: string | null;
  // contact
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // hours
  hours?: HoursPeriod[];
  closed_dates?: string[];
  note?: string | null;
  // social
  profiles?: SocialProfile[];
  // team (and `layout`)
  people?: Person[];
  // stats
  stats?: Stat[];
  // notice (and label, action)
  tone?: NoticeTone;
  text?: string;
}

export interface LayoutTab {
  id: string;
  label: string;
  icon: string;
  target: Action;
  translations?: Translations;
}

export interface LayoutPage {
  slug: string;
  title: string;
  show_title: boolean;
  updated_at: string;
  translations?: Translations;
  blocks: LayoutBlock[];
}

/** A layout without its version: what the dashboard edits. */
export interface LayoutContent {
  appearance: Appearance;
  languages: Languages;
  tabs: LayoutTab[];
  pages: LayoutPage[];
  /** 43 The owner's translations of the app's own interface strings; apps get them as string packs, never in the layout. */
  strings?: InterfaceStrings;
}

/** `Layout` in docs/api/platform.yaml: a published layout. */
export interface Layout extends LayoutContent {
  /** Changes on every publish, e.g. `2026-10-13T18:00:00Z.4`. */
  version: string;
}

export const LAYOUT_LIMITS = {
  minTabs: 2,
  maxTabs: 5,
  maxPages: 20,
  maxBlocks: 40,
  // 33 Entries in a block's list.
  maxSlides: 8,
  maxLinks: 12,
  maxQuotes: 10,
  maxQuestions: 20,
  maxPeople: 20,
  minStats: 2,
  maxStats: 4,
  maxHours: 21,
  maxClosedDates: 30,
  maxItems: 30,
  maxHandPicked: 30,
  /** The whole layout as JSON (43 without the interface strings). */
  maxBytes: 512 * 1024,
  /** 43 Interface strings: one string, and one language's as JSON. */
  stringChars: 2000,
  stringsBytes: 400 * 1024,
  htmlChars: 20_000,
} as const;

/** Texts a client writes, per object, that can carry translations. */
export const TRANSLATABLE = {
  page: ["title"],
  tab: ["label"],
  block: ["title", "heading", "subheading", "html", "label", "placeholder", "text", "ended_text", "note", "address"],
} as const;

/** 33 A block's lists whose entries have texts, and those texts. */
export const TRANSLATABLE_ENTRIES = {
  slides: ["heading", "subheading"],
  links: ["label"],
  quotes: ["text", "name", "role"],
  questions: ["question", "answer"],
  people: ["name", "role", "bio"],
  stats: ["value", "label"],
} as const;
export type EntryList = keyof typeof TRANSLATABLE_ENTRIES;
export const ENTRY_LISTS = Object.keys(TRANSLATABLE_ENTRIES) as EntryList[];

// 11.9 Defaults for new apps

/** The look and languages a new app's first layout starts with, set in the admin. */
export interface AppDefaultsSetting {
  appearance: Omit<Appearance, "secondary_color">;
  languages: Languages;
}
