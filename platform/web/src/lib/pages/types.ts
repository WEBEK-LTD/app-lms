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
// ——— 129.11–129.20 Premium content, trust and commerce (types below, "Premium content") ———
/** 129.11–129.20 Premium elements drawn from their own `entries` and options: quotes, plans, numbers, progress, steps, tiles, badges, a call-to-action bar. */
export const STUDIO_PREMIUM_CONTENT_TYPES = ["testimonials", "pricing", "stats", "progress", "timeline", "bento", "badge_text", "cta_bar"] as const;
/** 129.16 A person's or a place's card: its cover, avatar, name and role, then what it holds (badges, two buttons), then its social links. */
export const STUDIO_PREMIUM_CARD_TYPES = ["profile_card"] as const;
// ——— end 129.11–129.20 ———
/** 103R Yallapp Studio: the elements of a page and what they can be (`StudioNode` in the app API). */
/**
 * 129.4 and 129.7 Premium banners that hold what lies over them, as a cover
 * does: a muted looping video (`video_hero`) and a photo that moves slower
 * than the page (`parallax_banner`), each under its `scrim`.
 */
export const STUDIO_PREMIUM_BANNERS = ["video_hero", "parallax_banner"] as const;
export const STUDIO_LAYOUT_TYPES = ["row", "column", "stack", "grid", "slider", "spacer", "accordion", "tabs", ...STUDIO_COVER_TYPES, ...STUDIO_PREMIUM_BANNERS, ...STUDIO_PREMIUM_CARD_TYPES] as const;
export const STUDIO_CONTENT_TYPES = [
  "text",
  "image",
  "button",
  "icon",
  "items",
  "categories",
  "video",
  "form",
  "map",
  "ratings",
  "search",
  "divider",
  "countdown",
  "bullets",
  "coupon",
  "market",
  "learning",
  "live_status",
  "school",
  ...STUDIO_LIVE_TYPES,
  // 129 Premium motion & media (stories, a ticker, a gallery, before and after).
  "stories",
  "marquee",
  "gallery",
  "before_after",
  // 129.1 A bar of segments (a course's lessons, a story's progress).
  "segments",
  // 129.11–129.20 Premium content, trust and commerce.
  ...STUDIO_PREMIUM_CONTENT_TYPES,
] as const;
export const STUDIO_NODE_TYPES = [...STUDIO_LAYOUT_TYPES, ...STUDIO_CONTENT_TYPES] as const;
/** 120 `title`: the page's title and its buttons, for the pages after the first. */
/** 123 `greeting`: today's date over a greeting with the person's first name, the buttons beside it. */
export const STUDIO_HEADER_TYPES = ["logo_center", "title_search", "logo_actions", "transparent", "title", "greeting"] as const;
export const STUDIO_HEADER_BUTTONS = ["menu", "search", "cart", "notifications", "chat", "account"] as const;
// ——— 130.20 Premium chrome: the premium page headers ———
/**
 * 130.20 A header's premium style (`StudioHeader.style`): `large` a big title that collapses into a compact bar on
 * scroll, `glass` a frosted bar the page scrolls under, `photo` a photo (or the brand's gradient) cover with a shade
 * and the title that collapses, `brand` the logo or the app's name in the middle between round glass buttons,
 * `search` the title and a search pill. Its buttons are round glass buttons (the bell with a dot while something is
 * unread, the person's photo for the account) and a page opened over the tabs has a round glass back button.
 * Missing, the header is drawn by its `type` exactly as before.
 */
export const STUDIO_HEADER_STYLES = ["large", "glass", "photo", "brand", "search"] as const;
export type StudioHeaderStyle = (typeof STUDIO_HEADER_STYLES)[number];
// ——— end 130.20 premium chrome ———
export const STUDIO_ALIGNS = ["start", "center", "end", "between", "around"] as const;
export const STUDIO_CROSS = ["start", "center", "end", "stretch"] as const;
export const STUDIO_TEXT_ALIGNS = ["start", "center", "end"] as const;
export const STUDIO_PINS = ["none", "top", "bottom"] as const;
export const STUDIO_SHADOWS = ["none", "light", "medium", "strong"] as const;
export const STUDIO_FITS = ["cover", "contain"] as const;
export const STUDIO_FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;
export const STUDIO_BINDS = [
  "title",
  "subtitle",
  "image",
  "price",
  "badge",
  // 128.8 An entry's rating (a course's): the element's own text, a star and the rating; nothing without one.
  "rating",
] as const;
export const STUDIO_ENTERS = ["none", "fade", "slide_up", "slide_down", "slide_start", "slide_end", "zoom"] as const;
export const STUDIO_PRESSES = ["none", "shrink", "bounce"] as const;
export const STUDIO_LOOPS = ["none", "pulse", "float", "shake"] as const;
export const STUDIO_PLATFORMS = ["android", "ios"] as const;
export const STUDIO_VISIBILITY = ["everyone", "signed_in", "signed_out"] as const;
/** 112.4 How a slider shows where it is: dots under it, lines filling over it (stories), or "2 / 5" over it. */
export const STUDIO_INDICATORS = ["dots", "progress", "count"] as const;
// ——— 129.1–129.8 Premium motion & media ———
/** 129.1 A Studio slider's indicators: the block's, and `pill`, the dots in a frosted pill over the slides' foot. */
export const STUDIO_SLIDER_INDICATORS = [...STUDIO_INDICATORS, "pill"] as const;
/** 129 The premium content elements: a row of stories (129.2). */
export const STUDIO_PREMIUM_MOTION_CONTENT = ["stories", "marquee", "gallery", "before_after"] as const;
/**
 * 129.5 How a gallery lays out its photos: `masonry` in columns of
 * different heights, `bento` a big tile beside two small ones over a wide
 * one, `filmstrip` tall tiles in a row that scrolls sideways.
 */
export const STUDIO_GALLERY_LAYOUTS = ["masonry", "bento", "filmstrip"] as const;
/** 129.5 For `gallery`: its layout, its tiles' corners and whether their captions show over them; a tap opens them full screen. */
export interface StudioGallery {
  layout: (typeof STUDIO_GALLERY_LAYOUTS)[number];
  /** 0 to 40; missing, 16. */
  radius?: number;
  captions?: boolean;
}
/** 129.2 How a story's ring is drawn: the second colour into the main one until seen (`auto`), always lit (`highlight`, an offer), quiet (`plain`) or dashed (a tile for all of them). */
export const STUDIO_STORY_RINGS = ["auto", "highlight", "plain", "dashed"] as const;
/**
 * 129.2 One story: a slide (its photo, title, line over the photo and link)
 * and how its round photo is drawn: its ring, the ring's colour, and without
 * a photo a colour with a short `label` (initials) or an `icon`. A story
 * without a photo that has a link opens the link instead of the stories.
 */
export interface StudioStory extends Slide {
  ring?: (typeof STUDIO_STORY_RINGS)[number];
  ring_color?: string;
  color?: string;
  label?: string;
  icon?: string;
}
/** 129.5 A gallery's photo; with a link, a tap opens it instead of the full-screen viewer. */
export interface StudioPhoto extends GalleryImage {
  action?: Action;
}
/** 129.5 How a gallery's captions sit over its photos: on a shade at their foot, or in a frosted pill. */
export const STUDIO_CAPTION_STYLES = ["shade", "pill"] as const;
/**
 * 129.1 Where a slider's lines, dots or pill sit (`at` its top or foot,
 * `inset` from that edge), their colour, and "1/3" or "01/03" beside them.
 */
export interface StudioIndicatorLook {
  at?: "top" | "bottom";
  inset?: number;
  color?: string;
  count?: "plain" | "padded";
}
/**
 * 129.1 For `segments`: a bar of `count` segments, `done` of them filled
 * and the next one filled by `part` (0 to 1), `height` tall; with
 * `source: course`, the app fills it from the signed-in student's course in
 * progress (its lessons, the ones done) and leaves it out without one.
 */
export interface StudioSegments {
  count?: number;
  done?: number;
  part?: number;
  height?: number;
  source?: "course";
}
/** 129 The elements whose photo can grow slowly (Ken Burns): in a slider its open slide's; elsewhere again and again. */
export const STUDIO_KEN_BURNS_TYPES = ["slider", "photo_hero", "image", "video_hero", "parallax_banner"] as const;
/** 129 Their bounds. */
export const STUDIO_PREMIUM_LIMITS = { stories: 20, storyTitle: 40, storyLine: 120, ringMin: 52, ringMax: 96, images: 30, caption: 120, speedMin: 10, speedMax: 200, logoMin: 16, logoMax: 120 } as const;
/** 129.3 Which way a ticker runs: toward the start (the left in English, the right in Arabic) or the end. */
export const STUDIO_MARQUEE_DIRECTIONS = ["start", "end"] as const;
/**
 * 129.3 For `marquee`: an endless ticker of its `text`'s lines and its
 * `images` (logos, photos), `speed` points a second toward `direction`;
 * held still while pressed unless `pause_on_press` is false; `size` is
 * how tall its pictures are. Still on phones that reduce motion.
 */
export interface StudioMarquee {
  speed?: number;
  direction?: (typeof STUDIO_MARQUEE_DIRECTIONS)[number];
  pause_on_press?: boolean;
  size?: number;
  /** A band turned this many degrees (-8 to 8), reaching past the screen's sides. */
  tilt?: number;
  /** A small dot between its words when it has no icon. */
  dot?: boolean;
  /** Each word in an outlined pill (routes, tags). */
  chips?: boolean;
}
/** 129.2 For `stories`: how big each round photo is, 52 to 96; missing, 68. */
export interface StudioStories {
  size?: number;
}
// ——— end 129 premium motion & media ———
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
export const ITEM_SOURCES = ["courses", "products", "services", "posts", "listings", "articles", "events", "campaigns", "delivery_services", "restaurants", "vehicle_types", "school_news", "bundles", "hotels"] as const;
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
  // 126 Travel: Explore, the hotels' and flights' searches, the trips, saved hotels and price alerts.
  "explore",
  "stays",
  "flights",
  "trips",
  "saved",
  "price_alerts",
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
/**
 * 128.8 How the card is drawn: `card` (missing) as 123 drew it; `photo`
 * the course they are taking and their live class over the element's
 * picture (else the course's) with a dark scrim, their place and minutes
 * on one chip, how far they are in gold and a round play button, the
 * live class's time in gold over its name; the streak a compact figure.
 */
/**
 * 130.18 `ring`: the course they are taking as its photo in a round frame,
 * a gold ring round it filled to how far they are (ticks, a knob at its
 * end), the lesson on a chip over the photo's foot, then the kicker, the
 * course's name, the minutes left and how far they are, and a button that
 * opens the lesson, centred; the other cards as on a photo.
 */
export const STUDIO_LEARNING_STYLES = ["card", "photo", "ring"] as const;
/** 130.18 This week's days under a streak: round letters or short pills, the days learned filled, today ringed. */
export const STUDIO_LEARNING_DAYS = ["letters", "pills"] as const;
export interface StudioLearning {
  section: (typeof STUDIO_LEARNING_SECTIONS)[number];
  style?: (typeof STUDIO_LEARNING_STYLES)[number];
  /** 130.18 For `streak`: this week's days under it; missing, none (the card look keeps its bars). */
  days?: (typeof STUDIO_LEARNING_DAYS)[number];
}

/**
 * 128 For `live_status`: the signed-in person's order on its way, drawn by
 * the app from the engine's own data (`StudioLiveStatus`): a food delivery
 * order, or a marketplace order. Nothing shows signed out, or with no order
 * on its way.
 */
export const STUDIO_LIVE_SOURCES = ["food_order", "market_order"] as const;
// ——— 130 Signature looks: the live cards' premium looks (live_status and tracking) ———
/**
 * 130 The premium looks of a live card, for `live_status` and `tracking`
 * alike: `hero` the minutes left as a hero number beside the state (a live
 * dot), what it is and where, over its four stages as segments, with a
 * round button in the accent when the element has an `icon`; `ring` the
 * element's photo (else the order's own, else its icon) in a ring filled
 * as far as it is, the state, what it is and "step 3 of 4", the minutes
 * large; `pill` one slim line with a live dot, what is on its way, who
 * brings it and a Track button; `steps` the hero's top over the four
 * stages as dots on a line with their names. Words in the element's text
 * colour; the dot, stages and button in `accent` (by night `dark_accent`;
 * missing, the app's main colour).
 */
export const STUDIO_LIVE_LOOKS = ["hero", "ring", "pill", "steps"] as const;
export type StudioLiveLook = (typeof STUDIO_LIVE_LOOKS)[number];
export const STUDIO_LIVE_STATUS_STYLES = ["card", ...STUDIO_LIVE_LOOKS] as const;
// ——— end 130 live looks ———
export interface StudioLiveStatus {
  source: (typeof STUDIO_LIVE_SOURCES)[number];
  /** 130 How it is drawn; missing, `card` (the 128 card). */
  style?: (typeof STUDIO_LIVE_STATUS_STYLES)[number];
  /** 130 The live dot, stages and button (#RRGGBB) by day and by night; missing, the app's main colour. */
  accent?: string;
  dark_accent?: string;
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

/**
 * 128 For `school`, in schools: one part of a family's school day drawn
 * from the signed-in parent's own children (`StudioSchool`): the greeting
 * with today's date, the children to switch between, or today's card (the
 * chosen child's check-in at the gate, the class now and next, the bus
 * home).
 */
export const STUDIO_SCHOOL_SECTIONS = ["greeting", "children", "today"] as const;
export interface StudioSchool {
  section: (typeof STUDIO_SCHOOL_SECTIONS)[number];
}

/** 115.14 For `market`: which marketplace section it is, drawn from the marketplace's data (`StudioMarket`). */
export const STUDIO_MARKET_SECTIONS = ["address", "kinds", "offers", "cuisines", "club", "vendors", "reorder"] as const;
/**
 * 128 `chips`: places as small chips in a row, the place's photo beside its
 * name, rating and time; `bar`: the address (its section) as a flat bar with
 * the soonest delivery time and the search under it.
 */
/** 130 `deck`: places as a deck of photo cards, the open one in front and the next ones peeking behind it, swiped one at a time, "1 / 3" by the title. */
export const STUDIO_MARKET_STYLES = ["spotlight", "cards", "tiles", "list", "chips", "bar", "deck"] as const;
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
/** 130.11 `trip`: the person's next trip (Studio's travel apps: their stay and flights). */
export const STUDIO_TRACKING_KINDS = ["shipment", "ride", "nearby_taxis", "trip"] as const;
/**
 * `card`: a soft card with the stages; `driver`: the driver's photo, car and a call button; `line`: one line.
 * 130.11 `ticket`: the trip's first flight as a boarding pass under its city, large (other kinds: their card);
 * `headline`: the main number large (the minutes to the pickup, the free taxis around, the days to the trip).
 */
/** 130 And the live cards' premium looks for a shipment or a ride (`STUDIO_LIVE_LOOKS`: hero, ring, pill, steps). */
export const STUDIO_TRACKING_STYLES = ["card", "driver", "line", "ticket", "headline", ...STUDIO_LIVE_LOOKS] as const;
/** 130.11 Each kind's own style, when the element sets none. */
export const STUDIO_TRACKING_DEFAULTS = { shipment: "card", ride: "driver", nearby_taxis: "line", trip: "card" } as const satisfies Record<(typeof STUDIO_TRACKING_KINDS)[number], (typeof STUDIO_TRACKING_STYLES)[number]>;
export interface StudioTracking {
  kind: (typeof STUDIO_TRACKING_KINDS)[number];
  /** Missing, the kind's own (`STUDIO_TRACKING_DEFAULTS`). */
  style?: (typeof STUDIO_TRACKING_STYLES)[number];
  /** 130 The premium looks' accent (#RRGGBB) by day and by night; missing, the app's main colour. */
  accent?: string;
  dark_accent?: string;
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
  // 129.21–129.24 Premium looks of the drawn map (all optional: missing, the map drawn as before).
  /** How the map is drawn; missing, the plain map (a river, four roads and two parks). */
  style?: StudioMapStyle | null;
  /** How the markers look; missing, the style's own (plain a tile, natural and horizon a car, two-ink a roof sign, lens a token). */
  marker?: (typeof STUDIO_MAP_MARKERS)[number] | null;
  /** The word on a roof-sign marker; missing, "TAXI" in the page's language. */
  sign?: string | null;
  /** Where the person's dot is, in percent from the start and the top; missing, a little under the middle (a lens's centre). */
  me_at?: StudioPlace | null;
  /** Labelled pins: the person's saved places (Home, Office). */
  places?: StudioMapPin[];
  /** Words on the map: districts, a river. */
  labels?: StudioMapLabel[];
  /** A route: done solid, the rest dashed, with the vehicle where it is. */
  route?: StudioMapRoute | null;
}

/** 129.21–129.24 The drawn map's looks: a living map, a horizon in perspective, two inks, a radar lens. */
export const STUDIO_MAP_STYLES = ["natural", "horizon", "two_ink", "lens"] as const;
export type StudioMapStyle = (typeof STUDIO_MAP_STYLES)[number];
/** 129.21 How the map's markers look: a tile with the icon, a car from above, a roof sign, a round token with a trail. */
export const STUDIO_MAP_MARKERS = ["tile", "car", "sign", "token"] as const;
/** 129.24 What a live route follows in the app: the person's ride or shipment on its way. */
export const STUDIO_MAP_ROUTE_LIVE = ["ride", "shipment"] as const;
export const STUDIO_MAP_LIMITS = { places: 6, labels: 8, routePoints: 6, label: 40, sign: 8 } as const;

/** 129.21 A labelled pin, in percent from the start and the top of the map (a lens: of the lens). */
export interface StudioMapPin {
  x: number;
  y: number;
  label: string;
  /** A Material Symbols name; missing, a place. */
  icon?: string | null;
}

/** 129.21 A word on the map, its start at the spot. */
export interface StudioMapLabel {
  x: number;
  y: number;
  text: string;
}

/** 129.24 A route on the map: through its points (from the first to the last), done up to `at` percent of the way. */
export interface StudioMapRoute {
  points: StudioPlace[];
  /** Where the vehicle is along the way, 0 to 100; missing, at the start. */
  at?: number;
  /** A chip over the start, and over the end. */
  from_label?: string | null;
  to_label?: string | null;
  /** The bubble by the vehicle ("3 min", "Karim · 6 min"). */
  eta?: string | null;
  /** The vehicle's icon; missing, the markers'. */
  icon?: string | null;
  /** The line's colour by day and by night; missing, the markers' accent. */
  color?: string | null;
  dark_color?: string | null;
  /** The vehicle drives on along the rest of the way, again and again (a sample; still with reduced motion). */
  moving?: boolean;
  /** In the app, the person's ride or shipment on its way instead (nothing when there is none; Studio shows these points). */
  live?: (typeof STUDIO_MAP_ROUTE_LIVE)[number] | null;
}

export interface StudioMap {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string | null;
}

// ——— 129.11–129.20 Premium content, trust and commerce ———

/** 129.17 A bento tile's size: one cell, two across, two down, or two by two. */
/** 129.17 `full`: across every column (129 Signature boards). */
export const STUDIO_ENTRY_SIZES = ["small", "wide", "tall", "large", "full"] as const;
/** 129.11–129.20 The texts of an entry, each at most this long (and translated, `translations`). */
export const STUDIO_ENTRY_TEXTS = { title: 120, subtitle: 120, text: 600, label: 40, prefix: 8, suffix: 8 } as const;
export const STUDIO_MAX_ENTRIES = 12;

/**
 * 129.11–129.20 One entry of a premium element's list (`StudioEntry`): a
 * testimonial (photo, name, role, stars, quote), a plan (name, prices,
 * features, button), a number, a progress, a step, a bento tile. Each
 * element reads the fields it draws (docs/api/openapi.yaml).
 */
export interface StudioEntry {
  title?: string | null;
  subtitle?: string | null;
  text?: string | null;
  /** A button's words (a plan's, a tile's link). */
  label?: string | null;
  image_url?: string | null;
  icon?: string | null;
  /** Stars 0 to 5 (testimonials), a number (stats), a share 0 to 100 (progress). */
  value?: number | null;
  /** 129.12 A plan's price a month and a year, in cents of `pricing.currency`; null: not set yet (the app shows none). */
  price?: number | null;
  price_yearly?: number | null;
  /** 129.13 Before and after a number ("+", "%", "k"). */
  prefix?: string | null;
  suffix?: string | null;
  /** The most popular plan, the active step, a stat drawn in the accent. */
  highlight?: boolean;
  size?: (typeof STUDIO_ENTRY_SIZES)[number];
  gradient?: { from: string; to: string; angle?: number } | null;
  color?: string | null;
  action?: Action | null;
  translations?: Translations;
}

/** 129.11 Quote cards side by side to swipe, or stacked under each other. */
export const STUDIO_TESTIMONIAL_STYLES = ["carousel", "stacked"] as const;
/** 129.11 Whose real reviews the cards can show: a course's or a product's, from the app's own reviews. */
export const STUDIO_REVIEW_SOURCES = ["courses", "products"] as const;
export interface StudioTestimonials {
  style?: (typeof STUDIO_TESTIMONIAL_STYLES)[number];
  /** The approved reviews of this course or product (4 stars and up, with words), in place of the entries when it has any. */
  reviews?: { source: (typeof STUDIO_REVIEW_SOURCES)[number]; id: string } | null;
}

/** 129.12 The currencies of the platform's own prices (lib/catalog/money.ts CATALOG_CURRENCIES). */
export const STUDIO_PRICING_CURRENCIES = ["TRY", "USD", "EUR", "EGP", "SAR", "AED"] as const;
export interface StudioPricing {
  /** Missing, TRY. */
  currency?: (typeof STUDIO_PRICING_CURRENCIES)[number];
  /** A monthly / yearly switch over the plans (their `price_yearly`). */
  yearly?: boolean;
}

export const STUDIO_STATS_STYLES = ["plain", "cards"] as const;
/**
 * 129.13 The numbers take the element's `font` (a hero number of 96 is a
 * stat); from 40 up their text before and after is small beside them
 * ("6 min", "E£ 35"). Centred, or at the start with `start`.
 */
export interface StudioStats {
  style?: (typeof STUDIO_STATS_STYLES)[number];
  /** Thin lines between the numbers. */
  dividers?: boolean;
  /** Shown at their values at once, without counting up. */
  still?: boolean;
  /** At the start instead of centred. */
  start?: boolean;
}

/** 129.14 `segments`: each entry a row of short bars, as many filled as its share (lessons done, an order's stages). */
export const STUDIO_PROGRESS_STYLES = ["bars", "rings", "segments"] as const;
export interface StudioProgress {
  style?: (typeof STUDIO_PROGRESS_STYLES)[number];
  /** A ring's width across, 40 to 320 (missing, 76), and its stroke, 2 to 24 (missing, 8; a bar's height). */
  size?: number;
  stroke?: number;
  /** Tick marks around a ring, 0 to 60. */
  ticks?: number;
  /** A round knob at the ring's end. */
  knob?: boolean;
  /** For `segments`: how many, 2 to 40; missing, 4. */
  segments?: number;
}

/**
 * 129.15 `bars`: across, a bar over each step (filled to the active one)
 * with its icon, title and date, as a trip's legs.
 */
export const STUDIO_TIMELINE_STYLES = ["vertical", "horizontal", "bars"] as const;
export interface StudioTimeline {
  style?: (typeof STUDIO_TIMELINE_STYLES)[number];
  /** Down the page: each step's date (a time) in a column at its start. */
  times?: boolean;
  /** Dates in a monospaced font ("07:42", "SFR 471"). */
  mono?: boolean;
  /** The active step drawn as a card: its `label` as a chip ("NOW") and its `value` (0 to 100) as a bar. */
  card?: boolean;
}

/** 129.17 How a tile's words sit: on its shade, or on a frosted glass label. */
export const STUDIO_BENTO_CAPTIONS = ["plain", "glass"] as const;
export interface StudioBento {
  caption?: (typeof STUDIO_BENTO_CAPTIONS)[number];
  /** A row's height, 60 to 240; missing, 112. */
  row?: number;
}

/** 129.16 A person's round avatar, or a place's rounded square. */
export const STUDIO_PROFILE_SHAPES = ["round", "square"] as const;
export interface StudioProfile {
  cover_url?: string | null;
  shape?: (typeof STUDIO_PROFILE_SHAPES)[number];
  /** At most 6 links, each its network's mark. */
  socials?: { network: SocialNetwork; url: string }[];
}

/** 129.19 A chip with its words (and icon): filled, outlined, a gradient, frosted, or gradient words without a chip. */
export const STUDIO_BADGE_STYLES = ["pill", "outline", "gradient", "glass", "text"] as const;
export interface StudioBadge {
  style: (typeof STUDIO_BADGE_STYLES)[number];
}

/** 129.20 A bar across the page's foot with a label (a price) and a button, or a round floating button. */
/** 129.20 `card`: a floating rounded card at the foot (a form to sign, the nearest taxi) instead of a bar across it. */
export const STUDIO_CTA_STYLES = ["bar", "fab", "card"] as const;
export interface StudioCta {
  style: (typeof STUDIO_CTA_STYLES)[number];
  /** An icon on a soft tile at the start (a bar or a card). */
  lead?: string | null;
}

/** 129.18 A ticket's perforation: across (a pass, a waybill) or down (a stub beside a photo). */
export const STUDIO_TICKET_AXES = ["horizontal", "vertical"] as const;
/** 129.18 A texture over a layout: fine grain, a dot grid, a square grid or diagonal stripes. */
export const STUDIO_PATTERNS = ["grain", "dots", "grid", "stripes"] as const;

/**
 * 129.18 A premium card style for any layout (`StudioSurface`): frosted
 * glass blurring what is behind it (a photo), a border in two colours, a
 * soft glow inside its edge, and soft shadows in three levels. Combined
 * freely; missing, the layout as it is.
 */
export interface StudioSurface {
  /** The blur behind it, 4 to 40. */
  glass?: number;
  /** How white (dark: how dark) the glass is, 0.05 to 0.9; missing, 0.18. */
  tint?: number;
  border?: { from: string; to: string; width?: number } | null;
  glow?: string | null;
  soft?: 1 | 2 | 3;
  /** A ticket: notches cut from both edges at `at` percent along it, a dashed line between them. */
  ticket?: { at: number; axis?: (typeof STUDIO_TICKET_AXES)[number]; notch?: number } | null;
  /** A texture in the text colour, `pattern_strength` 0.02 to 0.4 (missing, 0.08). */
  pattern?: (typeof STUDIO_PATTERNS)[number];
  pattern_strength?: number;
}
// ——— end 129.11–129.20 ———

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
  /** 128.8 The border in dark mode; missing, `border_color`. */
  dark_border_color?: string | null;
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
  /** 112.4 For `slider`: how it shows where it is; missing, dots. 129.1 `pill` too. */
  indicator?: (typeof STUDIO_SLIDER_INDICATORS)[number];
  // ——— 129.1–129.8 Premium motion & media ———
  /** 129.1 For `slider`: the open slide's photo grows slowly (Ken Burns); for a photo hero, a picture or a banner, again and again (STUDIO_KEN_BURNS_TYPES). */
  ken_burns?: boolean;
  /** 129.1 For `slider`: where its indicator sits, its colour and a count beside it. */
  indicator_look?: StudioIndicatorLook | null;
  /** 129.2 For `stories`: each story's photo, title (`heading`), line under it (`subheading`), link (`action`) and ring. */
  slides?: StudioStory[];
  /** 129.1 For `segments`: how many, how many done. */
  segments?: StudioSegments | null;
  /** 129.5 For `gallery`: how its captions sit over the photos; missing, on a shade. */
  caption_style?: (typeof STUDIO_CAPTION_STYLES)[number];
  /** 129.2 For `stories`: the rings' size. */
  stories?: StudioStories | null;
  /** 129.5 For `gallery`: how it lays them out. */
  gallery?: StudioGallery | null;
  /** 129.6 For `before_after` (its two `images`, before then after, their captions the labels): where the divider starts, 5 to 95 (%) from the start; missing, 50. */
  compare?: { at?: number } | null;
  /** 129.3 For `marquee`: its logos or photos (`caption`: what they show, for screen readers). 129.5 A gallery's photos (with a link each, maybe). */
  images?: StudioPhoto[];
  /** 129.3 For `marquee`: its speed, direction and size. */
  marquee?: StudioMarquee | null;
  /** 129.4 and 129.7 For `video_hero` and `parallax_banner`: what lies over it sits in a frosted panel. */
  glass?: boolean;
  /** 129.7 For `parallax_banner`: how much slower than the page its photo moves, 0.1 to 0.9; missing, 0.5. */
  parallax?: { speed?: number } | null;
  // ——— end 129 premium motion & media ———
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
  /** 128 For `school`: which part of the family's school day it is. */
  school?: StudioSchool | null;
  rating?: number | null;
  // ——— 129.11–129.20 Premium content: each premium element's list and options, and a layout's card style ———
  entries?: StudioEntry[];
  testimonials?: StudioTestimonials | null;
  pricing?: StudioPricing | null;
  stats?: StudioStats | null;
  progress?: StudioProgress | null;
  timeline?: StudioTimeline | null;
  profile?: StudioProfile | null;
  badge?: StudioBadge | null;
  cta?: StudioCta | null;
  bento?: StudioBento | null;
  surface?: StudioSurface | null;
  // ——— end 129.11–129.20 ———
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
  // ——— 130.20 Premium chrome: the header's premium style ———
  /** 130.20 Its premium style; missing, drawn by `type` as before (apps that don't know it draw `type`). */
  style?: StudioHeaderStyle;
  /** 130.20 A line under the large title (`large`, `photo`, `brand`), translated; missing, none. */
  subtitle?: string | null;
  /** 130.20 The `photo` style's photo; missing, the main to second colour gradient. */
  image_url?: string | null;
  /** 130.20 `large`, `photo` and `search` collapse on scroll; false keeps them open. */
  collapse?: boolean;
  // ——— end 130.20 premium chrome ———
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
  // 129 A small dock in the middle, icons only, the open tab a filled circle.
  "dock",
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
  // 130.20 And the premium header's line under its title.
  studioHeader: ["title", "subtitle"],
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
