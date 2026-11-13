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
/**
 * 128 Layouts that draw a cover behind what they hold: a photo with a scrim
 * (`photo_hero`: a hero, a photo tile with its caption, a promo banner) and
 * a drawn map with markers (`map_header`); the last element can hang over
 * the cover's foot (`overlap`: a card, a bottom sheet).
 */
export const STUDIO_COVER_TYPES = ["photo_hero", "map_header"] as const;
/** 128 Content drawn from the signed-in person: their shipment or ride on its way, or the taxis near them (`tracking`), and a greeting with their name (`greeting`). */
export const STUDIO_LIVE_TYPES = ["tracking", "greeting"] as const;
/** 103R Yallapp Studio: the elements of a page and what they can be (`StudioNode` in the app API). */
export const STUDIO_LAYOUT_TYPES = ["row", "column", "stack", "grid", "slider", "spacer", "accordion", "tabs", ...STUDIO_COVER_TYPES] as const;
export const STUDIO_CONTENT_TYPES = ["text", "image", "button", "icon", "items", "categories", "video", "form", "map", "ratings", "search", "divider", "countdown", "bullets", "coupon", "market", "learning", "live_status", ...STUDIO_LIVE_TYPES] as const;
export const STUDIO_NODE_TYPES = [...STUDIO_LAYOUT_TYPES, ...STUDIO_CONTENT_TYPES] as const;
/** 120 `title`: the page's title and its buttons, for the pages after the first. */
/** 123 `greeting`: today's date over a greeting with the person's first name, the buttons beside it. */
export const STUDIO_HEADER_TYPES = ["logo_center", "title_search", "logo_actions", "transparent", "title", "greeting"] as const;
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
/** 112.4 How a slider shows where it is: dots under it, lines filling over it (stories), or "2 / 5" over it. */
export const STUDIO_INDICATORS = ["dots", "progress", "count"] as const;
/** 112.4 How a categories element draws them: chips, tiles, pictures in a grid, or round pictures in a row. */
export const STUDIO_CATEGORY_STYLES = ["chips", "tiles", "pictures", "circles"] as const;
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
  /** 112.4 A coupon's code. */
  codeChars: 40,
  /** 107.3 A question's or a tab's name. */
  titleChars: 120,
  /** The whole page as JSON. */
  maxBytes: 200 * 1024,
} as const;
/** 101 The header of the pages in the bottom tabs, and the buttons it can have. */
export const HEADER_LAYOUTS = ["title", "centered", "logo", "search"] as const;
export const HEADER_ICONS = ["search", "cart", "notifications", "chat", "account"] as const;
export const MAX_HEADER_ICONS = 4;
/** 43 The languages Yallapp ships its own translations in; an app can offer any of `LOCALES` (lib/i18n/locales.ts). */
export const LANGUAGE_CODES = BUILT_IN_LANGUAGES;
export const ITEM_SOURCES = ["courses", "products", "services", "posts", "listings", "articles", "events", "campaigns", "delivery_services", "restaurants", "vehicle_types", "school_news", "bundles"] as const;
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
  // 104 Delivery and courier companies
  "send_parcel",
  "shipments",
  "courier",
  // 105.1 Food delivery from many restaurants
  "restaurants",
  "food_orders",
  "restaurant",
  // 115 A marketplace's delivery club, with the member's benefits (its Club tab).
  "club",
  // 105.2 Ride hailing
  "ride",
  "my_rides",
  "driver",
  // 105.3 Academies with many teachers
  "teachers",
  "teacher",
  // 105.4 Schools
  "school",
  "classroom",
] as const;
/**
 * 120 The app's screens a Studio page can be drawn around (`StudioPage.screen`):
 * every screen but the ones that open one thing (a restaurant, a teacher, a class).
 */
export const STUDIO_PAGE_SCREENS = SCREENS.filter((s) => s !== "restaurant" && s !== "teacher" && s !== "classroom");
export type StudioPageScreen = (typeof SCREENS)[number];
export const ITEMS_LAYOUTS = ["carousel", "grid", "list"] as const;
export const ITEMS_SORTS = ["newest", "popular", "price_asc", "price_desc"] as const;
export const BUTTON_STYLES = ["filled", "outlined", "text"] as const;
export const CATEGORY_STYLES = ["chips", "tiles"] as const;
export const SPACER_SIZES = ["small", "medium", "large"] as const;
/** 1.6 A slider's shapes (width over height): 16:9, 4:3 and square; missing, the design's own. */
export const SLIDER_RATIOS = [1.78, 1.33, 1] as const;
/** 1.6 Seconds a slider waits before it moves on: from 2 to 10, 5 when not chosen. */
export const SLIDER_SECONDS = { min: 2, max: 10, default: 5 } as const;
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
  /** 122 A web page opened in the app (`url`, `in_app`): as a tab, the page alone, its site's header and footer hidden. */
  web?: WebPageLook;
}

/**
 * 122 How the app shows a web page in it (`Action.web`): with no address bar
 * and the link never shown; the site's own header and footer hidden, and
 * anything else the owner names (CSS selectors); the site's links opened in
 * the app too. Missing, the page as it is.
 */
export interface WebPageLook {
  hide_header?: boolean;
  hide_footer?: boolean;
  /** CSS selectors, comma separated, of more parts to hide (`.newsletter, #cookie-banner`). */
  hide?: string | null;
  /** The site's own links stay in the app; links to other sites open in the browser. */
  links_inside?: boolean;
}

/** 122 What the selectors a page hides may hold: a selector list, nothing that ends a rule. */
export const WEB_HIDE_PATTERN = /^[A-Za-z0-9\s.#_\-:,>+~*\[\]="'()^$|]{1,300}$/;

/** What an `items` block lists (`LayoutBlock.query`). */
export interface ItemsQuery {
  category_id: string | null;
  featured: boolean;
  sort: (typeof ITEMS_SORTS)[number];
  limit: number;
  /** Hand-picked entries, in this order; overrides the other filters when not empty. */
  ids: string[];
  /** 112.4 Products on sale only; left out otherwise. */
  on_sale?: boolean;
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
  // 33 slider (and `aspect_ratio`: one of SLIDER_RATIOS)
  slides?: Slide[];
  auto_advance?: boolean;
  /** 1.6 How long each slide shows when it moves on its own, in ms (SLIDER_SECONDS); missing, 5 seconds. */
  interval_ms?: number;
  /** 1.6 How it shows where it is: dots under it, lines filling over it, or "2 / 5"; missing, dots. */
  indicator?: (typeof STUDIO_INDICATORS)[number];
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

/** Editor audit 3.3: the project's text styles; an element following one keeps the style's font (apps read the font). */
export const STUDIO_TEXT_STYLES = ["heading", "subheading", "body", "button"] as const;
export type StudioTextStyle = (typeof STUDIO_TEXT_STYLES)[number];

export interface StudioFont {
  family?: string | null;
  weight?: StudioFontWeight;
  size?: number;
  line_height?: number;
  letter_spacing?: number;
  italic?: boolean;
  underline?: boolean;
  /** 107.2 Struck through (an old price). */
  strike?: boolean;
  /** 107.2 In capitals (scripts without capitals are unchanged). */
  uppercase?: boolean;
}

/** 107.2 Each corner rounded on its own (`StudioCorners`), instead of `radius`. */
export interface StudioCorners {
  top_start?: number;
  top_end?: number;
  bottom_end?: number;
  bottom_start?: number;
}

/** 107.2 A colour over the element's picture (`StudioOverlay`). */
export interface StudioOverlay {
  color: string;
  opacity: number;
}

/** 112.4 Where a child of a stack sits, in percent (`StudioPlace`). */
export interface StudioPlace {
  x: number;
  y: number;
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

/**
 * 123 For `learning`, in academies: one card drawn from the signed-in
 * student's own learning (`StudioLearning`): the course they are taking,
 * their streak, their next live class, or this week's learning time.
 */
export const STUDIO_LEARNING_SECTIONS = ["continue", "streak", "live", "week"] as const;
export interface StudioLearning {
  section: (typeof STUDIO_LEARNING_SECTIONS)[number];
}

/**
 * 128 For `live_status`: the signed-in person's order on its way, drawn by
 * the app from the engine's own data (`StudioLiveStatus`): a food delivery
 * order, or a marketplace order. Nothing shows signed out, or with no order
 * on its way.
 */
export const STUDIO_LIVE_SOURCES = ["food_order", "market_order"] as const;
export interface StudioLiveStatus {
  source: (typeof STUDIO_LIVE_SOURCES)[number];
}

/**
 * 128 A shade over the element's picture so the words on it read
 * (`StudioScrim`): its colour at `from` (0 to 1) at the start of `angle`
 * (CSS: 180 top to bottom, 90 start to end), `middle` at `at` percent, and
 * `to` at the end. A photo hero with its words on it, a photo tile's
 * caption; any element's picture, and a `photo_hero`'s photo.
 */
export interface StudioScrim {
  color: string;
  from: number;
  to: number;
  middle?: number;
  /** Where `middle` sits, 1 to 99 (%); missing, half way. */
  at?: number;
  /** 0 to 360; missing, 180 (top to bottom). */
  angle?: number;
}

/** 115.14 For `market`: which marketplace section it is, drawn from the marketplace's data (`StudioMarket`). */
export const STUDIO_MARKET_SECTIONS = ["address", "kinds", "offers", "cuisines", "club", "vendors", "reorder"] as const;
/**
 * 128 `chips`: places as small chips in a row, the place's photo beside its
 * name, rating and time; `bar`: the address (its section) as a flat bar with
 * the soonest delivery time and the search under it.
 */
export const STUDIO_MARKET_STYLES = ["spotlight", "cards", "tiles", "list", "chips", "bar"] as const;
/** Editor audit 3.4: facts a place's card can leave out. */
export const STUDIO_MARKET_CARD_FACTS = ["offer", "rating", "time", "fee", "min_order"] as const;
export const STUDIO_MARKET_KINDS = ["all", "restaurant", "grocery"] as const;
export const STUDIO_MARKET_SORTS = ["recommended", "fastest", "rating", "nearest", "newest"] as const;

export interface StudioMarket {
  section: (typeof STUDIO_MARKET_SECTIONS)[number];
  /** For `vendors` (and `offers`): how they're drawn; missing, cards. */
  style?: (typeof STUDIO_MARKET_STYLES)[number];
  /** Only restaurants or only groceries; missing, all. */
  kind?: (typeof STUDIO_MARKET_KINDS)[number];
  sort?: (typeof STUDIO_MARKET_SORTS)[number];
  /** Only the vendors with this tag (a cuisine or a department). */
  tag?: string | null;
  free_delivery?: boolean;
  /** 1 to 40; missing, 10. */
  limit?: number;
  /** Editor audit 3.4: how each place's card is drawn; missing, the usual card. */
  card?: StudioMarketCard;
}

/** Editor audit 3.4: the card of a place in a `market` section of places or offers. */
export interface StudioMarketCard {
  /** The card's corners, 0 to 32; missing, the look's own. */
  radius?: number;
  /** Facts the card leaves out; missing or empty, all shown. */
  hide?: (typeof STUDIO_MARKET_CARD_FACTS)[number][];
}

/** 128 For `tracking`: what it follows, and how it is drawn (`StudioTracking`). */
export const STUDIO_TRACKING_KINDS = ["shipment", "ride", "nearby_taxis"] as const;
/** `card`: a soft card with the stages; `driver`: the driver's photo, car and a call button; `line`: one line. */
export const STUDIO_TRACKING_STYLES = ["card", "driver", "line"] as const;
export interface StudioTracking {
  kind: (typeof STUDIO_TRACKING_KINDS)[number];
  /** Missing, `card`. */
  style?: (typeof STUDIO_TRACKING_STYLES)[number];
}

/** 128 For `map_header`: the markers on the drawn map (`StudioMapDrawing`). */
export interface StudioMapDrawing {
  /** Where each marker is, in percent from the start and the top. */
  markers?: StudioPlace[];
  /** A Material Symbols name; missing, a taxi. */
  icon?: string | null;
  /** The markers' and the person's dot's colour, and the markers' tile; missing, gold on navy. */
  accent?: string | null;
  chip?: string | null;
  /** The person's own dot in the middle. */
  me?: boolean;
  /** In the app, the free taxis near the person instead of the markers (the markers show in Studio). */
  live?: boolean;
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
  corners?: StudioCorners | null;
  rotation?: number;
  overlay?: StudioOverlay | null;
  /** 128 A shade over its picture (a `photo_hero`'s photo too), darker at its ends, so words on it read. */
  scrim?: StudioScrim | null;
  border_color?: string | null;
  border_width?: number;
  shadow?: StudioShadow;
  opacity?: number;
  font?: StudioFont | null;
  text_align?: StudioTextAlign;
  text?: string | null;
  /** 107.3 A child of an accordion or tabs: its question or its tab's name. */
  title?: string | null;
  /** 107.3 For `countdown`: when the time is up (ISO 8601). */
  ends_at?: string | null;
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
  /** 107.2 A row that scrolls sideways. */
  scroll?: boolean;
  /** 112.4 For `slider`: how it shows where it is; missing, dots. */
  indicator?: (typeof STUDIO_INDICATORS)[number];
  /** 112.4 For a child of `stack`: its place in percent from the start and the top (a shop-the-look spot). */
  place?: StudioPlace | null;
  /** 112.4 For `categories`: how they're drawn; missing, chips. */
  style?: (typeof STUDIO_CATEGORY_STYLES)[number];
  /** 112.4 For `coupon`: the code people copy. */
  code?: string | null;
  /** 112.4 For `items` of products: the ones this person opened lately, kept on the phone (the servers send none). */
  recent?: boolean;
  source?: ItemSource;
  layout?: (typeof ITEMS_LAYOUTS)[number];
  query?: ItemsQuery;
  card?: StudioNode | null;
  bind?: StudioBind | null;
  form?: StudioForm | null;
  map?: StudioMap | null;
  /** 115.14 For `market`: the marketplace section (its title and text are the element's own). */
  market?: StudioMarket | null;
  /** 123 For `learning`: which of the student's cards it is. */
  learning?: StudioLearning | null;
  /** 128 For `live_status`: whose order it follows. */
  live_status?: StudioLiveStatus | null;
  /** 128 For `tracking`: what it follows. */
  tracking?: StudioTracking | null;
  /** 128 For `map_header`: its markers. */
  map_drawing?: StudioMapDrawing | null;
  /** 128 For `photo_hero` and `map_header`: how far its last element hangs up over the cover's foot. */
  overlap?: number;
  rating?: number | null;
  action?: Action | null;
  platforms?: (typeof STUDIO_PLATFORMS)[number][];
  visibility?: (typeof STUDIO_VISIBILITY)[number];
  motion?: StudioMotion | null;
  /** 107.2 Kept in the editor, never shown in the app. */
  hidden?: boolean;
  /** Editor audit 3.3: the canvas doesn't select, move or resize it (its layer still does). Apps ignore it. */
  locked?: boolean;
  /** Editor audit 3.3: the project's text style it follows; changing the style changes its font. Apps ignore it. */
  text_style?: StudioTextStyle;
  /** Editor audit 3.3: its sizes, spacing and text on tablets (a screen at least 600 wide on its short side); the font field by field. */
  tablet?: StudioTablet;
  translations?: Translations;
}

/** Editor audit 3.3: what can be different on tablets. */
export const STUDIO_TABLET_FIELDS = ["width", "height", "min_height", "padding", "margin", "gap", "columns", "per_view", "font", "text_align"] as const;
export type StudioTablet = Partial<Pick<StudioNode, (typeof STUDIO_TABLET_FIELDS)[number]>>;

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
  /**
   * 120 The app's own screen drawn under the page's elements (its list of
   * shipments, the ride map, the orders): the page is that screen's, its
   * header and elements over it. Missing, the page is its elements only.
   * 120.4 Also one of the screens opened from the tabs (lib/pages/inner-screens.ts).
   */
  screen?: StudioPageScreen | string;
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
/** 109 How the bottom tabs look (`TabBar` in docs/api/openapi.yaml); a field left out keeps the usual look for it. */
export interface TabBarStyle {
  /** 119 The bar's design; missing, the app template's own (classic, pill or minimal). */
  design?: TabBarDesign;
  background?: string | null;
  dark_background?: string | null;
  /** The open tab's icon and name; null, the app's main colour. */
  active?: string | null;
  inactive?: string | null;
  /** 119 In dark mode; null, `active`/`inactive` made readable on a dark bar. */
  dark_active?: string | null;
  dark_inactive?: string | null;
  /** 0 to 32. */
  radius?: number;
  /** 0 to 24: 0, across the bottom of the screen; more, a floating bar. */
  margin?: number;
  font?: string | null;
  labels?: TabLabels;
  /** A tab's id, drawn as a round button raised in the middle: only when it's the middle one of three or five. */
  center?: string | null;
  /** 119 The account tab shows the person's photo instead of its icon. */
  avatar?: boolean;
}

export const TAB_LABELS = ["always", "active", "never"] as const;

/**
 * 119 The bar's designs: `classic` the icon in a soft pill over its name,
 * `pill` the open tab filled with its name beside the icon, `minimal` small
 * quiet names, `dot` a dot under the open tab, `line` a line over it,
 * `bubble` the open tab in a soft bubble with its name.
 */
export const TAB_BAR_DESIGNS = [
  "classic",
  "pill",
  "minimal",
  "dot",
  "line",
  "bubble",
  // 119 More: a frosted floating bar, a cut for the middle button, the open tab rising in a circle, an outlined pill,
  // a filled square, names only, a dark capsule, a segmented track, a folder's tab, a hanging drop, a glow, a colour per tab.
  "glass",
  "notch",
  "lift",
  "outline",
  "square",
  "text",
  "island",
  "segment",
  "folder",
  "drop",
  "glow",
  "colours",
  // 128 A floating bar with its own colours, the open tab a filled pill with its name, the others icons only.
  "float",
] as const;
export type TabBarDesign = (typeof TAB_BAR_DESIGNS)[number];
export type TabLabels = (typeof TAB_LABELS)[number];

export interface LayoutContent {
  appearance: Appearance;
  languages: Languages;
  /** 109 Up to 10: with more than five, the app shows the first four and a More tab with the rest. */
  tabs: LayoutTab[];
  /** 109 How the bottom tabs look; missing, the app's usual bar. */
  tab_bar?: TabBarStyle;
  /** 82.5 The side menu, shaped like the tabs; missing or empty: none. */
  menu?: LayoutTab[];
  pages: LayoutPage[];
  /** 43 The owner's translations of the app's own interface strings; apps get them as string packs, never in the layout. */
  strings?: InterfaceStrings;
  /** 97.3 The look the app shows; missing: the standard one. */
  look_mode?: LookMode;
  /** 97.3 The look made from a Figma file, kept even while the standard look is shown. */
  figma_look?: FigmaLook;
  /** Editor audit 3.3: Studio text styles; missing ones are the editor's defaults. Apps ignore them. */
  text_styles?: Partial<Record<StudioTextStyle, StudioFont>>;
}

/** `Layout` in docs/api/platform.yaml: a published layout. */
export interface Layout extends LayoutContent {
  /** Changes on every publish, e.g. `2026-10-13T18:00:00Z.4`. */
  version: string;
}

export const LAYOUT_LIMITS = {
  minTabs: 2,
  // 109 With more than `shownTabs`, the app shows the first ones and a More tab with the rest.
  maxTabs: 10,
  shownTabs: 5,
  // 82.5 The side menu.
  maxMenu: 12,
  maxPages: 20,
  // 120.4 Pages drawn around the app's screens count apart, at most one per screen.
  maxScreenPages: 120,
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
  studio: ["text", "title"],
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

/** 120.4 The app's own pages, the ones `LAYOUT_LIMITS.maxPages` counts: not those drawn around the app's screens. */
export function ownPageCount(pages: readonly { studio?: { screen?: unknown } | null }[]): number {
  return pages.filter((p) => !p.studio?.screen).length;
}
