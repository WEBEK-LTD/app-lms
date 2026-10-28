import { APP_FONTS, APP_TEMPLATES, type AppFont } from "../build-config/types";
import type { FontFile } from "../fonts/catalog";
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
/** 97.3 Which look the app shows: the standard one, or the one made from a Figma file. */
export const LOOK_MODES = ["standard", "figma"] as const;
export const CARD_STYLES = ["flat", "outlined", "elevated"] as const;
/** 103R Yallapp Studio: the elements of a page and what they can be (`StudioNode` in the app API). */
export const STUDIO_LAYOUT_TYPES = ["row", "column", "stack", "grid", "slider", "spacer"] as const;
export const STUDIO_CONTENT_TYPES = ["text", "image", "button", "icon", "items", "categories", "video", "form", "map", "ratings", "search", "divider"] as const;
export const STUDIO_NODE_TYPES = [...STUDIO_LAYOUT_TYPES, ...STUDIO_CONTENT_TYPES] as const;
export const STUDIO_HEADER_TYPES = ["logo_center", "title_search", "logo_actions", "transparent"] as const;
export const STUDIO_HEADER_BUTTONS = ["menu", "search", "cart", "notifications", "chat", "account"] as const;
export const STUDIO_ALIGNS = ["start", "center", "end", "between", "around"] as const;
export const STUDIO_CROSS = ["start", "center", "end", "stretch"] as const;
export const STUDIO_TEXT_ALIGNS = ["start", "center", "end"] as const;
export const STUDIO_PINS = ["none", "top", "bottom"] as const;
export const STUDIO_SHADOWS = ["none", "light", "medium", "strong"] as const;
export const STUDIO_FITS = ["cover", "contain"] as const;
export const STUDIO_FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;
export const STUDIO_BINDS = ["title", "subtitle", "image", "price", "badge"] as const;
export const STUDIO_ENTERS = ["none", "fade", "slide_up", "slide_down", "slide_start", "slide_end", "zoom"] as const;
export const STUDIO_PRESSES = ["none", "shrink", "bounce"] as const;
export const STUDIO_LOOPS = ["none", "pulse", "float", "shake"] as const;
export const STUDIO_PLATFORMS = ["android", "ios"] as const;
export const STUDIO_VISIBILITY = ["everyone", "signed_in", "signed_out"] as const;
export const STUDIO_LIMITS = {
  maxNodes: 600,
  maxDepth: 12,
  maxChildren: 60,
  maxSize: 4000,
  maxSide: 400,
  maxGap: 200,
  maxRadius: 500,
  maxBorder: 20,
  minFont: 8,
  maxFont: 120,
  textChars: 2000,
  nameChars: 80,
  maxColumns: 6,
  maxFormFields: 10,
  /** The whole page as JSON. */
  maxBytes: 200 * 1024,
} as const;
/** 101 The header of the pages in the bottom tabs, and the buttons it can have. */
export const HEADER_LAYOUTS = ["title", "centered", "logo", "search"] as const;
export const HEADER_ICONS = ["search", "cart", "notifications", "chat", "account"] as const;
export const MAX_HEADER_ICONS = 4;
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
  // 99.4
  "cards",
  "gallery",
  "map",
  "divider",
  "form",
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
// 82.5 A block's look within the brand.
export const BLOCK_BACKGROUNDS = ["none", "tint", "primary", "secondary", "surface"] as const;
export const BLOCK_SPACINGS = ["none", "small", "medium", "large"] as const;
export type BlockBackground = (typeof BLOCK_BACKGROUNDS)[number];
export type BlockSpacing = (typeof BLOCK_SPACINGS)[number];

// 99.3 More of a block's look, and a page's background.
export const BLOCK_ALIGNS = ["start", "center", "end"] as const;
export const BLOCK_TEXT_SIZES = ["small", "medium", "large"] as const;
export const BLOCK_CORNERS = ["app", "sharp", "round"] as const;
export const IMAGE_FITS = ["cover", "contain"] as const;
export const PAGE_BACKGROUNDS = ["none", "tint", "surface"] as const;
export const SHOW_PLATFORMS = ["android", "ios"] as const;
export type BlockAlign = (typeof BLOCK_ALIGNS)[number];
export type BlockTextSize = (typeof BLOCK_TEXT_SIZES)[number];
export type BlockCorners = (typeof BLOCK_CORNERS)[number];
export type ImageFit = (typeof IMAGE_FITS)[number];
export type PageBackground = (typeof PAGE_BACKGROUNDS)[number];

/** 82.5 `BlockLook` in the app API; 99.3 the fields after `spacing` are left out when usual. */
export interface BlockLook {
  background: BlockBackground;
  spacing: BlockSpacing;
  align?: BlockAlign;
  text_size?: BlockTextSize;
  corners?: BlockCorners;
  image_fit?: ImageFit;
}

/** 99.3 When a block shows (`LayoutBlock.show` in the platform API); servers leave it out otherwise. */
export interface BlockShow {
  from?: string | null;
  until?: string | null;
  platforms?: (typeof SHOW_PLATFORMS)[number][] | null;
  languages?: LanguageCode[] | null;
}

export const SOCIAL_NETWORKS = ["instagram", "facebook", "x", "tiktok", "youtube", "linkedin", "snapchat", "telegram", "whatsapp_channel"] as const;

export type AppTemplateName = (typeof APP_TEMPLATES)[number];
export type ThemeMode = (typeof THEME_MODES)[number];
export type Corners = (typeof CORNERS)[number];
export type LookMode = (typeof LOOK_MODES)[number];

/**
 * 97.3 The look made from a Figma file, kept apart from the standard look
 * (`appearance`): choosing one never changes the other. In the draft until
 * published, like everything in the layout.
 */
export interface FigmaLook {
  /** #RRGGBB */
  primary_color: string;
  secondary_color: string | null;
  /** A free font or one of the app's own; null: the bundled default. */
  font_family: string | null;
  arabic_font?: string;
  corners: Corners;
  /** An asset (the file's logo), or none. */
  logo_asset_id: string | null;
  /** Pictures from the file, offered in the editor's picture pickers. */
  pictures: FigmaPicture[];
  /** Where it came from: exported files, or (97.4) the file's link. */
  source: { kind: "files" | "link"; name: string; imported_at: string };
}

export interface FigmaPicture {
  asset_id: string;
  name: string;
}
export type CardStyle = (typeof CARD_STYLES)[number];
export type StudioNodeType = (typeof STUDIO_NODE_TYPES)[number];
export type StudioLayoutType = (typeof STUDIO_LAYOUT_TYPES)[number];
export type StudioHeaderType = (typeof STUDIO_HEADER_TYPES)[number];
export type StudioHeaderButton = (typeof STUDIO_HEADER_BUTTONS)[number];
export type StudioAlign = (typeof STUDIO_ALIGNS)[number];
export type StudioCross = (typeof STUDIO_CROSS)[number];
export type StudioTextAlign = (typeof STUDIO_TEXT_ALIGNS)[number];
export type StudioShadow = (typeof STUDIO_SHADOWS)[number];
export type StudioFit = (typeof STUDIO_FITS)[number];
export type StudioFontWeight = (typeof STUDIO_FONT_WEIGHTS)[number];
export type StudioBind = (typeof STUDIO_BINDS)[number];
export type HeaderLayout = (typeof HEADER_LAYOUTS)[number];
export type HeaderIcon = (typeof HEADER_ICONS)[number];
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
  /** One of the fonts bundled with the app: with `font_family`, the one shown until that font is on the phone. */
  font: AppFont;
  /** 97.1 Any free font (lib/fonts/catalog.ts) the app downloads; missing: `font`. */
  font_family?: string;
  /** 97.1 The font of the app's Arabic text (a free font that draws Arabic); missing: Readex Pro, bundled. */
  arabic_font?: string;
  /** 97.1 Added when served, never stored: the files of `font_family` and `arabic_font`. */
  font_files?: FontFile[];
  arabic_font_files?: FontFile[];
  /** 97.3 Served only, in the Figma look: the file's main color and logo, over Config.branding's. */
  primary_color?: string;
  logo_url?: string;
  corners: Corners;
  cards: CardStyle;
  /** 101 The header of the pages in the bottom tabs; missing: the template's. */
  header?: AppHeader;
}

/** 101 `AppHeader` in the app API: its layout and its buttons, from the start. */
export interface AppHeader {
  layout: HeaderLayout;
  icons: HeaderIcon[];
}

/** 101 A header with its buttons, in the order given. */
export function appHeader(layout: HeaderLayout, buttons: HeaderIcon[]): AppHeader {
  return { layout, icons: buttons };
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
  /** 82.5 The owner's own icon, shown instead of `icon`. */
  icon_url?: string | null;
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

/** 99.4 A card of a `cards` block. */
export interface Card {
  title: string;
  text: string | null;
  image_url: string | null;
  action: Action | null;
  translations?: Translations;
}

/** 99.4 A photo of a `gallery` block. */
export interface GalleryImage {
  image_url: string;
  caption: string | null;
  translations?: Translations;
}

export const FORM_FIELD_KINDS = ["text", "long_text", "email", "phone", "number", "choice"] as const;
export const FORM_SEND_TO = ["email", "chat"] as const;
export const DIVIDER_STYLES = ["line", "dashed", "dots"] as const;
export const BLOCK_COLUMNS = [2, 3] as const;

/** 99.4 A field of a `form` block. */
export interface FormField {
  id: string;
  kind: (typeof FORM_FIELD_KINDS)[number];
  label: string;
  required: boolean;
  /** For `choice`, 2 to 10; else null. */
  options: string[] | null;
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
  /** 82.5 Background and spacing within the brand; missing: none and medium. */
  look?: BlockLook | null;
  /** 99.3 When it shows; missing: always. Never sent to apps. */
  show?: BlockShow | null;
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
  // 99.4 cards and gallery (columns), map (latitude, longitude, address, label), divider (style), form
  columns?: (typeof BLOCK_COLUMNS)[number];
  cards?: Card[];
  images?: GalleryImage[];
  name?: string | null;
  fields?: FormField[];
  submit_label?: string | null;
  success_text?: string | null;
  send_to?: (typeof FORM_SEND_TO)[number];
}

export interface LayoutTab {
  id: string;
  label: string;
  icon: string;
  /** 82.5 The owner's own icon (a picture from Media), shown instead of `icon`. */
  icon_url?: string | null;
  target: Action;
  translations?: Translations;
}

/** 103R `fill` the parent's space, `hug` the content, or logical pixels (`StudioSize`). */
export type StudioSize = "fill" | "hug" | number;

/** 103R Space on each side (`StudioSides`); logical sides, a side left out is 0. */
export interface StudioSides {
  top?: number;
  end?: number;
  bottom?: number;
  start?: number;
}

export interface StudioFont {
  family?: string | null;
  weight?: StudioFontWeight;
  size?: number;
  line_height?: number;
  letter_spacing?: number;
  italic?: boolean;
  underline?: boolean;
}

export interface StudioMotion {
  enter?: (typeof STUDIO_ENTERS)[number];
  duration_ms?: number;
  delay_ms?: number;
  press?: (typeof STUDIO_PRESSES)[number];
  loop?: (typeof STUDIO_LOOPS)[number];
}

export interface StudioForm {
  fields: FormField[];
  submit_label?: string | null;
  success_text?: string | null;
  send_to: (typeof FORM_SEND_TO)[number];
}

export interface StudioMap {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string | null;
}

/**
 * 103R One element of a Studio page (`StudioNode` in the app API). In the
 * layout an `items` element keeps its `query` (and `categories` its
 * `source`); the servers fill `items` and `categories`. Texts are in the
 * layout's default language with `translations` for the others.
 */
export interface StudioNode {
  id: string;
  type: StudioNodeType;
  name?: string | null;
  children?: StudioNode[];
  width?: StudioSize;
  height?: StudioSize;
  min_height?: number;
  aspect_ratio?: number | null;
  padding?: StudioSides;
  margin?: StudioSides;
  gap?: number;
  align?: StudioAlign;
  cross?: StudioCross;
  self_align?: StudioCross | null;
  columns?: number;
  pin?: (typeof STUDIO_PINS)[number];
  background?: string | null;
  color?: string | null;
  dark_background?: string | null;
  dark_color?: string | null;
  gradient?: { from: string; to: string; angle?: number } | null;
  image_background_url?: string | null;
  radius?: number;
  border_color?: string | null;
  border_width?: number;
  shadow?: StudioShadow;
  opacity?: number;
  font?: StudioFont | null;
  text_align?: StudioTextAlign;
  text?: string | null;
  max_lines?: number | null;
  image_url?: string | null;
  fit?: StudioFit;
  icon?: string | null;
  icon_position?: "start" | "end";
  icon_size?: number;
  video_url?: string | null;
  autoplay?: boolean;
  interval_ms?: number;
  per_view?: number;
  dots?: boolean;
  source?: ItemSource;
  layout?: (typeof ITEMS_LAYOUTS)[number];
  query?: ItemsQuery;
  card?: StudioNode | null;
  bind?: StudioBind | null;
  form?: StudioForm | null;
  map?: StudioMap | null;
  rating?: number | null;
  action?: Action | null;
  platforms?: (typeof STUDIO_PLATFORMS)[number][];
  visibility?: (typeof STUDIO_VISIBILITY)[number];
  motion?: StudioMotion | null;
  translations?: Translations;
}

/** 103R The bar at the top of a Studio page (`StudioHeader`). */
export interface StudioHeader {
  type: StudioHeaderType;
  title?: string | null;
  logo_url?: string | null;
  buttons?: StudioHeaderButton[];
  background?: string | null;
  color?: string | null;
  dark_background?: string | null;
  dark_color?: string | null;
  translations?: Translations;
}

/** 103R A page designed in Yallapp Studio (`StudioPage`). */
export interface StudioPage {
  header?: StudioHeader | null;
  body: StudioNode;
  background?: string | null;
  dark_background?: string | null;
  show_tabs?: boolean;
}

export interface LayoutPage {
  slug: string;
  title: string;
  show_title: boolean;
  updated_at: string;
  translations?: Translations;
  /** 99.3 The page's background and a picture across its top; missing: none. */
  background?: PageBackground;
  header_image_url?: string | null;
  blocks: LayoutBlock[];
  /** 103R A Studio page: drawn instead of blocks (none). */
  studio?: StudioPage;
}

/** A layout without its version: what the dashboard edits. */
export interface LayoutContent {
  appearance: Appearance;
  languages: Languages;
  tabs: LayoutTab[];
  /** 82.5 The side menu, shaped like the tabs; missing or empty: none. */
  menu?: LayoutTab[];
  pages: LayoutPage[];
  /** 43 The owner's translations of the app's own interface strings; apps get them as string packs, never in the layout. */
  strings?: InterfaceStrings;
  /** 97.3 The look the app shows; missing: the standard one. */
  look_mode?: LookMode;
  /** 97.3 The look made from a Figma file, kept even while the standard look is shown. */
  figma_look?: FigmaLook;
}

/** `Layout` in docs/api/platform.yaml: a published layout. */
export interface Layout extends LayoutContent {
  /** Changes on every publish, e.g. `2026-10-13T18:00:00Z.4`. */
  version: string;
}

export const LAYOUT_LIMITS = {
  minTabs: 2,
  maxTabs: 5,
  // 82.5 The side menu.
  maxMenu: 12,
  maxPages: 20,
  maxBlocks: 40,
  // 33 Entries in a block's list: each block's definition (lib/pages/blocks.ts).
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
  // 103R A Studio element's text, and the header's title.
  studio: ["text"],
  studioHeader: ["title"],
  block: ["title", "heading", "subheading", "html", "label", "placeholder", "text", "ended_text", "note", "address", "name", "submit_label", "success_text"],
} as const;

/** 33 A block's lists whose entries have texts, and those texts. */
export const TRANSLATABLE_ENTRIES = {
  slides: ["heading", "subheading"],
  links: ["label"],
  quotes: ["text", "name", "role"],
  questions: ["question", "answer"],
  people: ["name", "role", "bio"],
  stats: ["value", "label"],
  // 99.4
  cards: ["title", "text"],
  images: ["caption"],
  fields: ["label"],
} as const;
export type EntryList = keyof typeof TRANSLATABLE_ENTRIES;
export const ENTRY_LISTS = Object.keys(TRANSLATABLE_ENTRIES) as EntryList[];

// 11.9 Defaults for new apps

/** The look and languages a new app's first layout starts with, set in the admin. */
export interface AppDefaultsSetting {
  appearance: Omit<Appearance, "secondary_color">;
  languages: Languages;
}
