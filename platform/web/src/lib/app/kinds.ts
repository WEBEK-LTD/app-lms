import type { IconName } from "@/components/icon-names";
import type { App, AppType, AppVertical, ConnectorConfig } from "../data/types";
import type { BlockType, ItemSource, LayoutBlock, LayoutTab } from "../pages/types";

/**
 * 20 The one registry of what Yallapp makes. An app has two things that used
 * to be one:
 *
 * - its engine (`apps.app_type`, `app_type` in the build config): the Flutter
 *   module the build includes, the API paths it reads and the content the
 *   dashboard manages for it;
 * - its vertical (`apps.vertical`, null for most apps): the kind of business,
 *   which changes wording, defaults, the demo and marketing, never routes.
 *
 * The app type picker shows kinds: an engine with a vertical, a name and a
 * description. Adding a kind is one entry in KINDS; adding an engine is one
 * entry in ENGINES (plus its Flutter module). Everything else reads them.
 */

/** 20 The verticals, as stored and sent (`Config.vertical`, build config `vertical`). */
export const APP_VERTICALS = ["restaurant", "clinic", "fitness", "charity"] as const satisfies readonly AppVertical[];

/** Content the client manages in the dashboard, served by the hosted API (a connector kind). */
export type OwnContentKind = Extract<ConnectorConfig["kind"], "catalog" | "courses" | "bookings" | "listings">;

/** The Website step's choices: where the app's content comes from. */
export type WebsiteChoice = "wordpress" | "custom_api" | "setup_requested" | "shopify" | "catalog" | "platform";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface EngineInfo {
  id: AppType;
  /** What clients call it, unless a kind names it otherwise. */
  name: string;
  /** Material Symbols (Rounded), in the dashboard's switcher, overview and admin. */
  icon: IconName;
  /** The app API's home endpoint, which the API check asks for. */
  homePath: string;
  /** What `GET /config` must have for this engine (the API check): an object at `key`, or a string at `features.<key>`. */
  configCheck: { label: string; fix: string; key: string; in: "root" | "features"; type: "object" | "string" };
  /** The Website step's choices it offers (shown in the step's own order). */
  websites: readonly WebsiteChoice[];
  /** The Website step's placeholder for the website address. */
  sitePlaceholder: string;
  /** The "another platform" choice on the Website step (a platform connected with keys). */
  platformChoice: { title: string; text: string };
  /** App sign-in: why an app connected to one of its platforms signs in by phone. Null: the general sentence. */
  platformPhoneNote: string | null;
  /** Content managed in the dashboard ("I don't have a website"). */
  ownContent: {
    kind: OwnContentKind;
    /** The Website step's choice; the title defaults to "I don't have a website". */
    choice: { title?: string; text: string };
    /** Under the choice: what to do after the step (`**Page**` is bold). How people sign in follows. */
    next: string;
    /** Admin › Switches. */
    switchLabel: string;
    /** Admin › client: where the content comes from. */
    adminLabel: string;
    /** The dashboard's sidebar group for it. */
    nav: { label: string; items: NavItem[] };
  };
  /** The page editor. */
  pages: {
    /** The list its pages show (blog posts are added for WordPress and own APIs). */
    source: ItemSource;
    /** Where the hosted API reads its items and categories from a connector (`Connector.get` path), and the item's title field. Null: served from Yallapp's own data. */
    read: { items: string; categories: string; title: "title" | "name" } | null;
    /** Block types only this engine has. */
    blocks: BlockType[];
    /** The first layout: tabs between Home and Account, blocks after the welcome text. */
    tabs: LayoutTab[];
    home: LayoutBlock[];
  };
  /** The store categories suggested in Publishing. */
  categories: { play: string; appStore: string };
  /** The demo app on /demo: /demo/download/<slug>. */
  demo: { slug: string };
}

export interface KindInfo {
  /** The picker's value. */
  id: string;
  engine: AppType;
  vertical: AppVertical | null;
  name: string;
  /** The picker's line under the name. */
  description: string;
  /** The picker's last line: what it works with. */
  requires: string;
  icon: IconName;
  /** The picker's icon tile (Tailwind classes). */
  tile: string;
  /** The marketing site: /solutions/<slug>, and the icon on its cards and on /demo. */
  marketing: { slug: string; icon: IconName };
  /** Store categories, when they differ from the engine's. */
  categories?: { play: string; appStore: string };
}

const tab = (id: string, label: string, icon: string, screen: string): LayoutTab => ({ id, label, icon, target: { type: "screen", screen } as LayoutTab["target"] });

const newest = (limit: number, featured = false) => ({ category_id: null, featured, sort: "newest" as const, limit, ids: [] });

const NO_WEBSITE = "I don't have a website";

/** Every engine, in the order they're listed. */
export const ENGINES: Record<AppType, EngineInfo> = {
  lms: {
    id: "lms",
    name: "Academy",
    icon: "school",
    homePath: "/home",
    configCheck: { label: "Config names the LMS", fix: "Set `features.lms`.", key: "lms", in: "features", type: "string" },
    websites: ["wordpress", "platform", "catalog", "custom_api", "setup_requested"],
    sitePlaceholder: "https://your-academy.com",
    platformChoice: { title: "My Teachable or Thinkific school", text: "Your courses and lessons come from your online school. Students sign in to the app with a code we send." },
    platformPhoneNote: null,
    ownContent: {
      kind: "courses",
      choice: { text: "Add your courses and lessons here in the dashboard. Students enroll in the app; paid courses are bought on Android." },
      next: "After this step, add your courses, their sections and lessons on the **Courses** page. Your students sign in to the app with",
      switchLabel: "No website: courses in the dashboard",
      adminLabel: "No website: courses in the dashboard",
      nav: {
        label: "Your school",
        items: [
          { href: "/dashboard/courses", label: "Courses", icon: "school" },
          { href: "/dashboard/orders", label: "Orders", icon: "receipt_long" },
        ],
      },
    },
    pages: {
      source: "courses",
      read: { items: "courses", categories: "categories", title: "title" },
      blocks: ["continue_learning"],
      tabs: [tab("courses", "Courses", "school", "courses"), tab("learning", "My courses", "menu_book", "my_courses")],
      home: [
        { id: "search", type: "search", visibility: "everyone", title: null, source: "courses", placeholder: "Search courses" },
        { id: "continue", type: "continue_learning", visibility: "signed_in", title: "Continue learning" },
        {
          id: "new-courses",
          type: "items",
          visibility: "everyone",
          title: "New courses",
          source: "courses",
          layout: "carousel",
          see_all: { type: "screen", screen: "courses" },
          query: newest(10),
        },
        { id: "categories", type: "categories", visibility: "everyone", title: "Categories", source: "courses", style: "chips" },
      ],
    },
    categories: { play: "Education", appStore: "Education" },
    demo: { slug: "academy" },
  },
  store: {
    id: "store",
    name: "Store",
    icon: "shopping_bag",
    homePath: "/store/home",
    configCheck: { label: "Config has the store settings", fix: "Add `store` to /config.", key: "store", in: "root", type: "object" },
    websites: ["wordpress", "shopify", "platform", "catalog", "custom_api", "setup_requested"],
    sitePlaceholder: "https://your-shop.com",
    platformChoice: {
      title: "Another store platform",
      text: "Your products and checkout come from ikas, Ticimax, IdeaSoft or Wix. Customers sign in to the app with a code we send.",
    },
    platformPhoneNote: "Your connected shop finds each customer's orders by their phone number, so this app signs in by phone.",
    ownContent: {
      kind: "catalog",
      choice: { text: "Add your products here in the dashboard. Customers pay by card in the app, and you see their orders here." },
      next: "After this step, add your products and your iyzico payment keys on the **Products** page. Your customers sign in to the app with",
      switchLabel: "No website: products in the dashboard",
      adminLabel: "No website: products in the dashboard",
      nav: {
        label: "Your shop",
        items: [
          { href: "/dashboard/catalog", label: "Products", icon: "inventory_2" },
          { href: "/dashboard/orders", label: "Orders", icon: "receipt_long" },
        ],
      },
    },
    pages: {
      source: "products",
      read: { items: "store/products", categories: "store/categories", title: "name" },
      blocks: [],
      tabs: [tab("shop", "Shop", "storefront", "search"), tab("cart", "Cart", "shopping_cart", "cart")],
      home: [
        { id: "search", type: "search", visibility: "everyone", title: null, source: "products", placeholder: "Search products" },
        { id: "categories", type: "categories", visibility: "everyone", title: "Categories", source: "products", style: "chips" },
        {
          id: "featured",
          type: "items",
          visibility: "everyone",
          title: "Featured",
          source: "products",
          layout: "grid",
          see_all: null,
          query: newest(6, true),
        },
        {
          id: "new-products",
          type: "items",
          visibility: "everyone",
          title: "New arrivals",
          source: "products",
          layout: "carousel",
          see_all: { type: "screen", screen: "search" },
          query: newest(10),
        },
      ],
    },
    categories: { play: "Shopping", appStore: "Shopping" },
    demo: { slug: "store" },
  },
  booking: {
    id: "booking",
    name: "Bookings",
    icon: "calendar_month",
    homePath: "/bookings/home",
    configCheck: { label: "Config has the bookings settings", fix: "Add `bookings` to /config.", key: "bookings", in: "root", type: "object" },
    websites: ["wordpress", "platform", "catalog", "custom_api", "setup_requested"],
    sitePlaceholder: "https://your-academy.com",
    platformChoice: {
      title: "My SimplyBook.me account",
      text: "Your services, team and free times come from SimplyBook.me. Customers sign in to the app with a code we send.",
    },
    platformPhoneNote: "Your booking platform finds each customer's bookings by their phone number, so this app signs in by phone.",
    ownContent: {
      kind: "bookings",
      choice: { text: "Add your services, team and opening hours here in the dashboard. Customers book in the app, and you see their appointments here." },
      next: "After this step, add your services, your team and their hours on the **Services & team** page. Your customers sign in to the app with",
      switchLabel: "No website: bookings in the dashboard",
      adminLabel: "No website: services and hours in the dashboard",
      nav: {
        label: "Your bookings",
        items: [
          { href: "/dashboard/services", label: "Services & team", icon: "groups" },
          { href: "/dashboard/appointments", label: "Appointments", icon: "event_available" },
        ],
      },
    },
    pages: {
      source: "services",
      read: { items: "bookings/services", categories: "bookings/categories", title: "name" },
      blocks: [],
      tabs: [tab("book", "Book", "calendar_month", "services"), tab("appointments", "Appointments", "event", "appointments")],
      home: [
        {
          id: "services",
          type: "items",
          visibility: "everyone",
          title: "Our services",
          source: "services",
          layout: "list",
          see_all: { type: "screen", screen: "services" },
          query: newest(10),
        },
      ],
    },
    categories: { play: "Lifestyle", appStore: "Lifestyle" },
    demo: { slug: "bookings" },
  },
  real_estate: {
    id: "real_estate",
    name: "Real estate",
    icon: "apartment",
    homePath: "/listings",
    configCheck: { label: "Config has the office settings", fix: "Add `listings` to /config.", key: "listings", in: "root", type: "object" },
    // Hosted only: listings are managed in the dashboard.
    websites: ["catalog"],
    sitePlaceholder: "https://your-academy.com",
    platformChoice: { title: "Another platform", text: "Your listings come from another platform." },
    platformPhoneNote: null,
    ownContent: {
      kind: "listings",
      choice: {
        title: "Listings managed in Yallapp",
        text: "Add your properties here in the dashboard. People search them in the app, save favorites and message your office.",
      },
      next: "After this step, set up your office and add your properties on the **Listings** page, and answer people's messages on the **Inquiries** page. People sign in to the app with",
      switchLabel: "No website: listings in the dashboard",
      adminLabel: "Real estate: listings in the dashboard",
      nav: {
        label: "Your properties",
        items: [
          { href: "/dashboard/listings", label: "Listings", icon: "home_work" },
          { href: "/dashboard/inquiries", label: "Inquiries", icon: "forum" },
        ],
      },
    },
    pages: {
      source: "listings",
      read: null,
      blocks: [],
      tabs: [tab("search", "Search", "search", "search"), tab("favorites", "Favorites", "favorite", "favorites"), tab("messages", "Messages", "chat", "messages")],
      home: [
        { id: "search", type: "search", visibility: "everyone", title: null, source: "listings", placeholder: "Search properties" },
        {
          id: "new-listings",
          type: "items",
          visibility: "everyone",
          title: "New listings",
          source: "listings",
          layout: "list",
          see_all: { type: "screen", screen: "search" },
          query: newest(10),
        },
      ],
    },
    categories: { play: "House & Home", appStore: "Lifestyle" },
    demo: { slug: "real-estate" },
  },
};

/** What the app type picker offers, in its order. The first kind of each engine is its default (vertical null). */
export const KINDS: readonly KindInfo[] = [
  {
    id: "academy",
    engine: "lms",
    vertical: null,
    name: "Academy",
    description: "Courses, lessons, quizzes and certificates.",
    requires: "Works with: Tutor LMS, LearnPress, LifterLMS, MasterStudy, Sensei, Masteriyo · Digits",
    icon: "school",
    tile: "bg-peach",
    marketing: { slug: "academy", icon: "school" },
  },
  {
    id: "store",
    engine: "store",
    vertical: null,
    name: "Store",
    description: "Products, cart, checkout and orders. Delivery date and gift messages for flower shops.",
    requires: "Works with: WooCommerce · Digits",
    icon: "shopping_bag",
    tile: "bg-tile-1 text-[#8A5A12]",
    marketing: { slug: "store", icon: "storefront" },
  },
  {
    id: "bookings",
    engine: "booking",
    vertical: null,
    name: "Bookings",
    description: "Services, staff, free times and appointments, booked through your booking plugin.",
    requires: "Works with: Amelia, BookingPress, LatePoint · Digits",
    icon: "calendar_month",
    tile: "bg-tile-2 text-[#1D6B48]",
    marketing: { slug: "bookings", icon: "calendar_month" },
  },
  {
    id: "real_estate",
    engine: "real_estate",
    vertical: null,
    name: "Real estate",
    description: "Property listings with search and filters, favorites and messages to your office.",
    requires: "No website needed: you add your listings here in the dashboard",
    icon: "apartment",
    tile: "bg-tile-3 text-[#3F3A6B]",
    marketing: { slug: "real-estate", icon: "apartment" },
  },
];

/** Every engine id, in order. */
export const APP_TYPES = Object.keys(ENGINES) as AppType[];

export function isAppType(value: unknown): value is AppType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ENGINES, value);
}

export function isAppVertical(value: unknown): value is AppVertical {
  return typeof value === "string" && (APP_VERTICALS as readonly string[]).includes(value);
}

/** A stored or sent vertical; anything unknown is none. */
export function toVertical(value: unknown): AppVertical | null {
  return isAppVertical(value) ? value : null;
}

/** The engine whose dashboard-managed content this is. */
export function engineOfContent(kind: string | null | undefined): EngineInfo | null {
  return Object.values(ENGINES).find((e) => e.ownContent.kind === kind) ?? null;
}

/** Whether a connector kind is content managed in the dashboard. */
export function isOwnContent(kind: string | null | undefined): kind is OwnContentKind {
  return engineOfContent(kind) !== null;
}

/** An engine that only runs on the hosted API (no website or own API). */
export function hostedOnly(appType: AppType): boolean {
  const { websites } = ENGINES[appType];
  return !websites.includes("wordpress") && !websites.includes("custom_api");
}

/** The Website step's title for the engine's dashboard-managed content. */
export function ownContentTitle(appType: AppType): string {
  return ENGINES[appType].ownContent.choice.title ?? NO_WEBSITE;
}

export function kindById(id: unknown): KindInfo | null {
  return KINDS.find((k) => k.id === id) ?? null;
}

/** The engine's default kind (no vertical). */
export function defaultKind(appType: AppType): KindInfo {
  return KINDS.find((k) => k.engine === appType && k.vertical === null) ?? KINDS.find((k) => k.engine === appType)!;
}

/** The kind an app is: its engine with its vertical, else the engine's default. */
export function kindOf(app: Pick<App, "appType"> & { vertical?: AppVertical | null }): KindInfo {
  const vertical = app.vertical ?? null;
  return KINDS.find((k) => k.engine === app.appType && k.vertical === vertical) ?? defaultKind(app.appType);
}

/** What the client calls the app's type: "Academy", "Store", … */
export function appTypeName(app: Pick<App, "appType"> & { vertical?: AppVertical | null }): string {
  return kindOf(app).name;
}

/** The engine's demo whose slug this is. */
export function engineOfDemoSlug(slug: string): AppType | null {
  return APP_TYPES.find((type) => ENGINES[type].demo.slug === slug) ?? null;
}

/** The store categories suggested for the app. */
export function suggestedCategories(app: Pick<App, "appType"> & { vertical?: AppVertical | null }): { play: string; appStore: string } {
  return kindOf(app).categories ?? ENGINES[app.appType].categories;
}

/**
 * Whether content the app has now still fits another engine: a connected
 * platform of that engine, Shopify where it's offered, or that engine's own
 * content. An app with nothing connected fits any engine that has websites.
 */
export function connectorFits(appType: AppType, connector: ConnectorConfig | null, platformEngine: (platform: string) => AppType | null): boolean {
  const engine = ENGINES[appType];
  if (!connector) return !hostedOnly(appType);
  if (connector.kind === "platform") return platformEngine(connector.platform) === appType;
  if (connector.kind === "shopify") return engine.websites.includes("shopify");
  return connector.kind === engine.ownContent.kind;
}
