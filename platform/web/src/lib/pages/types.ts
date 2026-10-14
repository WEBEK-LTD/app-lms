import { APP_FONTS, APP_TEMPLATES, type AppFont } from "../build-config/types";

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
export const LANGUAGE_CODES = ["en", "ar", "tr"] as const;
export const ITEM_SOURCES = ["courses", "products", "services", "posts", "listings", "articles"] as const;
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
] as const;
export const ITEMS_LAYOUTS = ["carousel", "grid", "list"] as const;
export const ITEMS_SORTS = ["newest", "popular", "price_asc", "price_desc"] as const;
export const BUTTON_STYLES = ["filled", "outlined", "text"] as const;
export const CATEGORY_STYLES = ["chips", "tiles"] as const;
export const SPACER_SIZES = ["small", "medium", "large"] as const;

export type AppTemplateName = (typeof APP_TEMPLATES)[number];
export type ThemeMode = (typeof THEME_MODES)[number];
export type Corners = (typeof CORNERS)[number];
export type CardStyle = (typeof CARD_STYLES)[number];
export type LanguageCode = (typeof LANGUAGE_CODES)[number];
export type ItemSource = (typeof ITEM_SOURCES)[number];
export type BlockType = (typeof BLOCK_TYPES)[number];
export type Visibility = (typeof VISIBILITIES)[number];
export type ScreenName = (typeof SCREENS)[number];

export const LANGUAGE_NAMES: Record<LanguageCode, string> = { en: "English", ar: "Arabic", tr: "Turkish" };
/** Languages written right to left. */
export const RTL_LANGUAGES: readonly LanguageCode[] = ["ar"];

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
  /** Always includes the default. */
  available: LanguageCode[];
}

/** Texts in other languages: language code, then field name. */
export type Translations = Partial<Record<LanguageCode, Record<string, string>>>;

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
  maxItems: 30,
  maxHandPicked: 30,
  /** The whole layout as JSON. */
  maxBytes: 512 * 1024,
  htmlChars: 20_000,
} as const;

/** Texts a client writes, per object, that can carry translations. */
export const TRANSLATABLE = {
  page: ["title"],
  tab: ["label"],
  block: ["title", "heading", "subheading", "html", "label", "placeholder"],
} as const;

// 11.9 Defaults for new apps

/** The look and languages a new app's first layout starts with, set in the admin. */
export interface AppDefaultsSetting {
  appearance: Omit<Appearance, "secondary_color">;
  languages: Languages;
}
