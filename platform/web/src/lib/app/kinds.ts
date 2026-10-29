import type { IconName } from "@/components/icon-names";
import type { App, AppType, AppVertical, ConnectorConfig } from "../data/types";
import type { BlockType, ItemSource, LayoutBlock, LayoutTab, ScreenName } from "../pages/types";

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
export const APP_VERTICALS = ["restaurant", "clinic", "fitness", "charity", "services", "instructors"] as const satisfies readonly AppVertical[];

/** Content the client manages in the dashboard, served by the hosted API (a connector kind). */
export type OwnContentKind = Extract<ConnectorConfig["kind"], "catalog" | "courses" | "bookings" | "listings" | "articles" | "events" | "campaigns" | "deliveries" | "restaurants" | "rides" | "school">;

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
    /**
     * 31 The built-in screens its Flutter module opens (`screenLocation` in
     * mobile/lib/modules/<module>/<module>_routes.dart maps them to a route),
     * in the order the page editor lists them. tests/unit/kinds.test.ts reads
     * the Dart files to keep them the same.
     */
    screens: ScreenName[];
    /** 31 Other screen names the module opens as one of `screens` (older layouts use them); never offered. */
    aliases: Partial<Record<ScreenName, ScreenName>>;
    /** 31 The editor's names for screens that mean something else in this engine ("All products"). */
    screenLabels?: Partial<Record<ScreenName, string>>;
    /** The first layout: tabs between Home and Account, blocks after the welcome text. */
    tabs: LayoutTab[];
    home: LayoutBlock[];
  };
  /** The store categories suggested in Publishing. */
  categories: { play: string; appStore: string };
  /** 31 The dashboard's words where a sentence names this engine's content or what it sells. */
  words: {
    /** Its content, in a sentence: "courses", "products". */
    items: string;
    /** Publishing: the hint under the store description. */
    storeDescription: string;
    /** Publishing: the example for the content rating questions. */
    ratingExample: string;
    /** What Apple's rules mean for this app, or null when it sells nothing. */
    iphone: string | null;
    /** The plan feature "Card payments in the app", for this engine; null where it doesn't apply. */
    cardPayments: string | null;
  };
  /** The demo app on /demo (Studio-only engines' on /demo/studio): /demo/download/<slug>; null while the engine has none. */
  demo: { slug: string } | null;
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
  /** 21 Its own demo app on /demo (/demo/download/<slug>); the engine's default kind uses the engine's demo. */
  demo?: { slug: string };
  /** 21 The dashboard's words for its content and its app users, when they differ from the engine's. */
  wording?: {
    nav: { label: string; items: NavItem[] };
    /** The sidebar group of the app users pages ("Patients"). */
    users: string;
    /** The Website step's text of the "I don't have a website" choice and what to do after it (`**Page**` is bold). */
    ownContent: { text: string; next: string };
    /** The first layout's tab names by tab ID, where they differ from the engine's. */
    tabs?: Record<string, string>;
    /** 38 And their icons ("Menu" with a menu, not a shop front). */
    tabIcons?: Record<string, string>;
    /** 38 The first home page's search box texts by block ID ("Search the menu"). */
    searchPlaceholders?: Record<string, string>;
  };
  /** 27 The first layout's tabs between Home and Account, when the kind has its own (a gym's Classes and Membership). */
  tabs?: LayoutTab[];
  /** 27 What to tell the store reviewers about this kind (Publishing › For the store reviewers). */
  reviewNote?: string;
  /** 105.3 Screens its app opens besides its engine's (an academy's teachers). */
  screens?: ScreenName[];
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
          // 63 Students' questions and reviews.
          { href: "/dashboard/courses/questions", label: "Questions", icon: "help" },
          { href: "/dashboard/courses/reviews", label: "Reviews", icon: "star" },
          { href: "/dashboard/orders", label: "Orders", icon: "receipt_long" },
        ],
      },
    },
    pages: {
      source: "courses",
      read: { items: "courses", categories: "categories", title: "title" },
      blocks: ["continue_learning"],
      screens: ["courses", "my_courses", "search", "favorites", "orders", "account", "settings", "notifications"],
      aliases: {},
      screenLabels: { favorites: "Wishlist" },
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
    words: {
      items: "courses",
      storeDescription: "Describe your courses and what students can do in the app.",
      ratingExample: "For example: online courses for adults. No violence, gambling or dating. Students can't message each other. No ads.",
      iphone: "Apple's rule: the iPhone app never shows buy buttons for paid courses; free enrolment works on both phones. Your Android app opens your checkout as usual.",
      cardPayments: "Sell courses by card in the app, through our payment page.",
    },
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
      text: "Your products and checkout come from ikas, Ticimax, IdeaSoft, Wix, Salla or Zid. Customers sign in to the app with a code we send.",
    },
    platformPhoneNote: "Your connected shop finds each customer's orders by their phone number, so this app signs in by phone.",
    ownContent: {
      kind: "catalog",
      choice: { text: "Add your products here in the dashboard. Customers pay by card in the app, and you see their orders here." },
      next: "After this step, add your products and your payment keys (iyzico, Kashier, Fawaterk, Stripe or PayPal) on the **Products** page. Your customers sign in to the app with",
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
      screens: ["courses", "search", "cart", "orders", "account", "settings", "notifications"],
      aliases: {},
      screenLabels: { courses: "All products" },
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
    words: {
      items: "products",
      storeDescription: "Describe your shop, what you sell and how ordering in the app works.",
      ratingExample: "For example: a flower shop. No violence, gambling or dating. Customers can't message each other. No ads.",
      iphone: "Apple's rule: physical products are bought on both phones; the iPhone app never sells digital products (downloads and virtual products).",
      cardPayments: "Sell products by card in the app, through our payment page.",
    },
    demo: { slug: "store" },
  },
  booking: {
    id: "booking",
    name: "Bookings",
    icon: "calendar_month",
    homePath: "/bookings/home",
    configCheck: { label: "Config has the bookings settings", fix: "Add `bookings` to /config.", key: "bookings", in: "root", type: "object" },
    websites: ["wordpress", "platform", "catalog", "custom_api", "setup_requested"],
    sitePlaceholder: "https://your-business.com",
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
      screens: ["services", "appointments", "classes", "memberships", "orders", "account", "settings", "notifications"],
      aliases: { courses: "services", search: "services" },
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
    words: {
      items: "services",
      storeDescription: "Describe your business, your services and what customers can book in the app.",
      ratingExample: "For example: bookings for a hair salon. No violence, gambling or dating. Customers can't message each other. No ads.",
      iphone: "Appointments are booked on both phones. Memberships for classes used in person are paid on our web payment page, on iPhone too.",
      cardPayments: "Sell memberships by card in the app, through our payment page.",
    },
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
    sitePlaceholder: "https://your-agency.com",
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
      screens: ["courses", "search", "favorites", "messages", "account", "settings", "notifications"],
      aliases: {},
      screenLabels: { courses: "All listings" },
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
    words: {
      items: "listings",
      storeDescription: "Describe your agency, the properties you list and how people reach you from the app.",
      ratingExample: "For example: property listings. No violence, gambling or dating. People can message the office only. No ads.",
      iphone: null,
      cardPayments: null,
    },
    demo: { slug: "real-estate" },
  },
  // 23 News sites, blogs and magazines: read-only articles, no paid content.
  news: {
    id: "news",
    name: "News & blog",
    icon: "newspaper",
    homePath: "/news/home",
    configCheck: { label: "Config has the news settings", fix: "Add `news` to /config.", key: "news", in: "root", type: "object" },
    websites: ["wordpress", "platform", "catalog", "custom_api", "setup_requested"],
    sitePlaceholder: "https://your-news-site.com",
    platformChoice: {
      title: "My site's RSS feed",
      text: "Your articles come from your website's RSS or Atom feed, whatever runs your site. Readers can sign in to the app with a code we send.",
    },
    // Readers' accounts are the app's own: email works with a feed.
    platformPhoneNote: null,
    ownContent: {
      kind: "articles",
      choice: { text: "Write your articles here in the dashboard, with pictures and categories, and send the important ones as breaking news." },
      next: "After this step, write your first articles on the **Articles** page. Readers sign in to the app with",
      switchLabel: "No website: articles in the dashboard",
      adminLabel: "No website: articles in the dashboard",
      nav: {
        label: "Your news",
        items: [{ href: "/dashboard/articles", label: "Articles", icon: "newspaper" }],
      },
    },
    pages: {
      source: "articles",
      read: { items: "news/articles", categories: "news/categories", title: "title" },
      blocks: [],
      screens: ["articles", "search", "bookmarks", "account", "settings", "notifications"],
      aliases: { courses: "articles", favorites: "bookmarks" },
      tabs: [tab("articles", "Latest", "newspaper", "articles"), tab("saved", "Saved", "bookmark", "bookmarks")],
      home: [
        { id: "search", type: "search", visibility: "everyone", title: null, source: "articles", placeholder: "Search articles" },
        {
          id: "top-stories",
          type: "items",
          visibility: "everyone",
          title: "Top stories",
          source: "articles",
          layout: "carousel",
          see_all: null,
          query: newest(5, true),
        },
        { id: "categories", type: "categories", visibility: "everyone", title: "Sections", source: "articles", style: "chips" },
        {
          id: "latest",
          type: "items",
          visibility: "everyone",
          title: "Latest",
          source: "articles",
          layout: "list",
          see_all: { type: "screen", screen: "articles" },
          query: newest(10),
        },
      ],
    },
    categories: { play: "News & Magazines", appStore: "News" },
    words: {
      items: "articles",
      storeDescription: "Describe what you publish and what readers can do in the app.",
      ratingExample: "For example: local news and opinion. No violence, gambling or dating. No comments or chat. No ads.",
      iphone: null,
      cardPayments: null,
    },
    demo: { slug: "news" },
  },
  // 28 Events & tickets: event listings, free sign-ups and paid tickets with QR codes checked at the door.
  events: {
    id: "events",
    name: "Events & tickets",
    icon: "confirmation_number",
    homePath: "/events",
    configCheck: { label: "Config has the events settings", fix: "Add `events` to /config.", key: "events", in: "root", type: "object" },
    // Hosted only for now: events are managed in the dashboard (a WordPress events plugin is a later step).
    websites: ["catalog"],
    sitePlaceholder: "https://your-venue.com",
    platformChoice: { title: "Another platform", text: "Your events come from another platform." },
    platformPhoneNote: null,
    ownContent: {
      kind: "events",
      choice: {
        title: "Events managed in Yallapp",
        text: "Add your events and their tickets here in the dashboard. People get free tickets or buy paid ones in the app, and you check their QR codes at the door.",
      },
      next: "After this step, add your events and their tickets on the **Events** page, and check tickets at the door on the **Check-in** page. People sign in to the app with",
      switchLabel: "No website: events in the dashboard",
      adminLabel: "Events & tickets: events in the dashboard",
      nav: {
        label: "Your events",
        items: [
          { href: "/dashboard/events", label: "Events", icon: "event" },
          { href: "/dashboard/check-in", label: "Check-in", icon: "qr_code_scanner" },
        ],
      },
    },
    pages: {
      source: "events",
      read: null,
      blocks: [],
      screens: ["events", "search", "tickets", "account", "settings", "notifications"],
      aliases: { courses: "events", orders: "tickets" },
      tabs: [tab("events", "Events", "event", "events"), tab("tickets", "My tickets", "confirmation_number", "tickets")],
      home: [
        { id: "search", type: "search", visibility: "everyone", title: null, source: "events", placeholder: "Search events" },
        {
          id: "upcoming",
          type: "items",
          visibility: "everyone",
          title: "Coming up",
          source: "events",
          layout: "carousel",
          see_all: { type: "screen", screen: "events" },
          query: newest(10),
        },
      ],
    },
    categories: { play: "Events", appStore: "Entertainment" },
    words: {
      items: "events",
      storeDescription: "Describe your events and what people can do in the app, like getting tickets.",
      ratingExample: "For example: concerts and workshops for all ages. No violence, gambling or dating. No chat. No ads.",
      iphone: "Apple's rule: tickets to events at a venue are sold on both phones; the iPhone app never sells paid tickets to online-only events.",
      cardPayments: "Sell tickets by card in the app, through our payment page.",
    },
    demo: { slug: "events" },
  },
  // 29 Charities: campaigns with progress; donations are paid on a web page into the charity's own iyzico, Kashier, Fawaterk, Stripe or PayPal account (in the browser on iPhone).
  donations: {
    id: "donations",
    name: "Charity & donations",
    icon: "volunteer_activism",
    homePath: "/donations/campaigns",
    configCheck: { label: "Config has the donation settings", fix: "Add `donations` to /config.", key: "donations", in: "root", type: "object" },
    // Hosted only: campaigns are managed in the dashboard (a GiveWP adapter is a follow-up).
    websites: ["catalog"],
    sitePlaceholder: "https://your-charity.org",
    platformChoice: { title: "Another platform", text: "Your campaigns come from another platform." },
    platformPhoneNote: null,
    ownContent: {
      kind: "campaigns",
      choice: {
        title: "Campaigns managed in Yallapp",
        text: "Add your campaigns here in the dashboard. Supporters follow them in the app and give on your secure donation page, paid into your own iyzico, Kashier, Fawaterk, Stripe or PayPal account.",
      },
      next: "After this step, add your payment keys (iyzico, Kashier, Fawaterk, Stripe or PayPal) and your first campaign on the **Campaigns** page; every gift shows on the **Donations** page. Supporters sign in to the app with",
      switchLabel: "No website: campaigns in the dashboard",
      adminLabel: "Charity: campaigns in the dashboard",
      nav: {
        label: "Your charity",
        items: [
          { href: "/dashboard/campaigns", label: "Campaigns", icon: "campaign" },
          { href: "/dashboard/donations", label: "Donations", icon: "payments" },
        ],
      },
    },
    pages: {
      source: "campaigns",
      read: null,
      blocks: [],
      screens: ["campaigns", "my_donations", "account", "settings", "notifications"],
      aliases: { courses: "campaigns", orders: "my_donations" },
      tabs: [tab("campaigns", "Campaigns", "volunteer_activism", "campaigns"), tab("donations", "My donations", "receipt_long", "my_donations")],
      home: [
        {
          id: "featured-campaigns",
          type: "items",
          visibility: "everyone",
          title: "Featured",
          source: "campaigns",
          layout: "carousel",
          see_all: null,
          query: newest(5, true),
        },
        {
          id: "campaigns",
          type: "items",
          visibility: "everyone",
          title: "Our campaigns",
          source: "campaigns",
          layout: "list",
          see_all: { type: "screen", screen: "campaigns" },
          query: newest(10),
        },
      ],
    },
    categories: { play: "Social", appStore: "Lifestyle" },
    words: {
      items: "campaigns",
      storeDescription: "Describe your charity, your campaigns and how people can give in the app.",
      ratingExample: "For example: a food bank's campaigns. No violence, gambling or dating. No chat. No ads.",
      iphone: "Apple's rule: on iPhone, donations open your donation page in the browser; on Android they're made in the app.",
      cardPayments: "Take donations by card, through your donation page.",
    },
    demo: { slug: "charity" },
  },
  // 104 Delivery and courier companies: shipments, couriers and prices set in the dashboard, on the hosted API only.
  delivery: {
    id: "delivery",
    name: "Delivery & couriers",
    icon: "local_shipping",
    homePath: "/delivery/services",
    configCheck: { label: "Config has the delivery settings", fix: "Add `delivery` to /config.", key: "delivery", in: "root", type: "object" },
    websites: ["catalog"],
    sitePlaceholder: "https://your-delivery.com",
    platformChoice: { title: "Another platform", text: "Your shipments come from another platform." },
    platformPhoneNote: null,
    ownContent: {
      kind: "deliveries",
      choice: {
        title: "Shipments managed in Yallapp",
        text: "Set your prices, services and couriers here in the dashboard. Customers send parcels in the app and pay cash to the courier or by card into your own iyzico, Kashier, Fawaterk, Stripe or PayPal account.",
      },
      next: "After this step, set your prices and how customers pay on the **Delivery settings** page, then add your couriers on the **Couriers** page; every shipment shows on the **Shipments** page. Customers and couriers sign in to the app with",
      switchLabel: "No website: shipments in the dashboard",
      adminLabel: "Delivery: shipments in the dashboard",
      nav: {
        label: "Your deliveries",
        items: [
          { href: "/dashboard/shipments", label: "Shipments", icon: "package_2" },
          { href: "/dashboard/couriers", label: "Couriers", icon: "two_wheeler" },
          // Shipments paid by card are orders: their receipts and refunds.
          { href: "/dashboard/orders", label: "Orders", icon: "receipt_long" },
          { href: "/dashboard/delivery", label: "Delivery settings", icon: "local_shipping" },
        ],
      },
    },
    pages: {
      source: "delivery_services",
      read: null,
      blocks: [],
      screens: ["send_parcel", "shipments", "courier", "account", "settings", "notifications"],
      aliases: { orders: "shipments" },
      tabs: [tab("send", "Send", "local_shipping", "send_parcel"), tab("shipments", "My shipments", "package_2", "shipments")],
      home: [
        {
          id: "services",
          type: "items",
          visibility: "everyone",
          title: "Our services",
          source: "delivery_services",
          layout: "list",
          see_all: { type: "screen", screen: "send_parcel" },
          query: newest(10),
        },
      ],
    },
    categories: { play: "Maps & Navigation", appStore: "Navigation" },
    words: {
      items: "deliveries",
      storeDescription: "Describe your delivery service, where you deliver and how customers send a parcel and follow it in the app.",
      ratingExample: "For example: a city courier's deliveries. No violence, gambling or dating. No chat. No ads.",
      iphone: null,
      cardPayments: "Take delivery payments by card, through your payment page.",
    },
    // A Studio demo, on /demo/studio only.
    demo: { slug: "delivery" },
  },
  // 105.1 Food delivery from many restaurants: restaurants, menus and couriers set in the dashboard, on the hosted API only.
  food: {
    id: "food",
    name: "Food delivery",
    icon: "restaurant",
    homePath: "/food/restaurants",
    configCheck: { label: "Config has the food settings", fix: "Add `food` to /config.", key: "food", in: "root", type: "object" },
    websites: ["catalog"],
    sitePlaceholder: "https://your-food-app.com",
    platformChoice: { title: "Another platform", text: "Your restaurants come from another platform." },
    platformPhoneNote: null,
    ownContent: {
      kind: "restaurants",
      choice: {
        title: "Restaurants managed in Yallapp",
        text: "Add your restaurants and their menus here in the dashboard. Customers order in the app and pay cash to the courier or by card into your own iyzico, Kashier, Fawaterk, Stripe or PayPal account.",
      },
      next: "After this step, add your restaurants and their menus on the **Restaurants** page, set delivery prices and how customers pay on the **Delivery settings** page, then add your couriers on the **Couriers** page; every order shows on the **Food orders** page. Customers, restaurant staff and couriers sign in to the app with",
      switchLabel: "No website: restaurants in the dashboard",
      adminLabel: "No website: restaurants in the dashboard",
      nav: {
        label: "Your food delivery",
        items: [
          { href: "/dashboard/food-orders", label: "Food orders", icon: "receipt_long" },
          { href: "/dashboard/restaurants", label: "Restaurants", icon: "storefront" },
          { href: "/dashboard/shipments", label: "Courier jobs", icon: "package_2" },
          { href: "/dashboard/couriers", label: "Couriers", icon: "two_wheeler" },
          { href: "/dashboard/orders", label: "Paid orders", icon: "payments" },
          { href: "/dashboard/delivery", label: "Delivery settings", icon: "local_shipping" },
        ],
      },
    },
    pages: {
      source: "restaurants",
      read: null,
      blocks: [],
      screens: ["restaurants", "food_orders", "restaurant", "courier", "account", "settings", "notifications"],
      aliases: { orders: "food_orders" },
      tabs: [tab("restaurants", "Restaurants", "restaurant_menu", "restaurants"), tab("orders", "My orders", "receipt_long", "food_orders")],
      home: [
        {
          id: "restaurants",
          type: "items",
          visibility: "everyone",
          title: "Restaurants",
          source: "restaurants",
          layout: "list",
          see_all: { type: "screen", screen: "restaurants" },
          query: newest(10),
        },
      ],
    },
    categories: { play: "Food & Drink", appStore: "Food & Drink" },
    words: {
      items: "restaurants",
      storeDescription: "Describe your food delivery service: the restaurants, where you deliver and how customers order and follow their food in the app.",
      ratingExample: "For example: a city's restaurants delivering food. No violence, gambling or dating. No chat. No ads.",
      iphone: null,
      cardPayments: "Take food orders by card, through your payment page.",
    },
    // A Studio demo, on /demo/studio only.
    demo: { slug: "food-delivery" },
  },
  // 105.2 Ride hailing: vehicle types, fares and drivers set in the dashboard, on the hosted API only.
  rides: {
    id: "rides",
    name: "Ride hailing",
    icon: "directions_car",
    homePath: "/rides/estimate",
    configCheck: { label: "Config has the ride settings", fix: "Add `rides` to /config.", key: "rides", in: "root", type: "object" },
    websites: ["catalog"],
    sitePlaceholder: "https://your-ride-app.com",
    platformChoice: { title: "Another platform", text: "Your rides come from another platform." },
    platformPhoneNote: null,
    ownContent: {
      kind: "rides",
      choice: {
        title: "Rides managed in Yallapp",
        text: "Set your vehicle types and their fares and add your drivers here in the dashboard. Riders ask for a ride in the app and pay the driver in cash or by card into your own iyzico, Kashier, Fawaterk, Stripe or PayPal account.",
      },
      next: "After this step, add your vehicle types and their fares on the **Vehicle types** page, set how rides are matched, cancelled and paid on the **Ride settings** page, then add your drivers on the **Drivers** page; every ride shows on the **Rides** page. Riders and drivers sign in to the app with",
      switchLabel: "No website: rides in the dashboard",
      adminLabel: "No website: rides in the dashboard",
      nav: {
        label: "Your rides",
        items: [
          { href: "/dashboard/rides", label: "Rides", icon: "directions_car" },
          { href: "/dashboard/drivers", label: "Drivers", icon: "person" },
          { href: "/dashboard/vehicle-types", label: "Vehicle types", icon: "category" },
          { href: "/dashboard/rides/statement", label: "Statements", icon: "receipt_long" },
          { href: "/dashboard/orders", label: "Paid orders", icon: "payments" },
          { href: "/dashboard/ride-settings", label: "Ride settings", icon: "tune" },
        ],
      },
    },
    pages: {
      source: "vehicle_types",
      read: null,
      blocks: [],
      screens: ["ride", "my_rides", "driver", "account", "settings", "notifications"],
      aliases: { orders: "my_rides" },
      tabs: [tab("ride", "Ride", "directions_car", "ride"), tab("rides", "My rides", "receipt_long", "my_rides")],
      home: [
        {
          id: "vehicle_types",
          type: "items",
          visibility: "everyone",
          title: "Ride with us",
          source: "vehicle_types",
          layout: "list",
          see_all: { type: "screen", screen: "ride" },
          query: newest(10),
        },
      ],
    },
    categories: { play: "Maps & Navigation", appStore: "Travel" },
    words: {
      items: "rides",
      storeDescription: "Describe your ride service: where you operate, your vehicle types and how riders ask for a ride and follow their driver in the app.",
      ratingExample: "For example: a city's ride service with its own drivers. No violence, gambling or dating. No chat. No ads.",
      iphone: null,
      cardPayments: "Take ride fares by card, through your payment page.",
    },
    // A Studio demo, on /demo/studio only.
    demo: { slug: "rides" },
  },
  // 105.4 Schools: classes, students, parents and teachers set in the dashboard, on the hosted API only.
  school: {
    id: "school",
    name: "School",
    icon: "school",
    homePath: "/school/me",
    configCheck: { label: "Config has the school settings", fix: "Add `school` to /config.", key: "school", in: "root", type: "object" },
    websites: ["catalog"],
    sitePlaceholder: "https://your-school.com",
    platformChoice: { title: "Another platform", text: "Your school's data comes from another platform." },
    platformPhoneNote: null,
    ownContent: {
      kind: "school",
      choice: {
        title: "The school managed in Yallapp",
        text: "Add your classes, subjects, students, parents and teachers here in the dashboard. Teachers take attendance and give homework in the app; families follow their children and pay fees by card into your own iyzico, Kashier, Fawaterk, Stripe or PayPal account.",
      },
      next: "After this step, add your classes and subjects on the **Classes** page, your students, parents and teachers on the **People** page, then the week's lessons on the **Timetable** page. Students, parents and teachers sign in to the app with",
      switchLabel: "No website: the school in the dashboard",
      adminLabel: "No website: the school in the dashboard",
      nav: {
        label: "Your school",
        items: [
          { href: "/dashboard/school/classes", label: "Classes", icon: "menu_book" },
          { href: "/dashboard/school/people", label: "People", icon: "groups" },
          { href: "/dashboard/school/timetable", label: "Timetable", icon: "calendar_month" },
          { href: "/dashboard/school/attendance", label: "Attendance", icon: "task_alt" },
          { href: "/dashboard/school/homework", label: "Homework", icon: "assignment" },
          { href: "/dashboard/school/grades", label: "Grades", icon: "workspace_premium" },
          { href: "/dashboard/school/fees", label: "Fees", icon: "payments" },
          { href: "/dashboard/school/news", label: "News", icon: "campaign" },
          { href: "/dashboard/school/settings", label: "School settings", icon: "tune" },
        ],
      },
    },
    pages: {
      source: "school_news",
      read: null,
      blocks: [],
      screens: ["school", "classroom", "account", "settings", "notifications"],
      aliases: {},
      tabs: [tab("school", "School", "school", "school")],
      home: [
        {
          id: "school_news",
          type: "items",
          visibility: "everyone",
          title: "School news",
          source: "school_news",
          layout: "list",
          see_all: { type: "screen", screen: "school" },
          query: newest(10),
        },
      ],
    },
    categories: { play: "Education", appStore: "Education" },
    words: {
      items: "school",
      storeDescription: "Describe your school and what its app gives students, parents and teachers: the timetable, homework, grades, attendance, news and fees.",
      ratingExample: "For example: a school's app for its students, their parents and its teachers. No violence, gambling or dating. No ads.",
      iphone: null,
      cardPayments: "Take school fees by card, through your payment page.",
    },
    demo: null,
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
    // 26 Restaurants and cafés: the store engine with a menu, a dish's options, pickup or delivery and order tracking.
    id: "restaurant",
    engine: "store",
    vertical: "restaurant",
    name: "Restaurant & café",
    description: "Your menu in an app: dishes with options, pickup or delivery, and order tracking.",
    requires: "Works with: WooCommerce · Digits · Options, pickup, delivery and the kitchen without a website",
    icon: "restaurant",
    tile: "bg-tile-5 text-[#8A3B12]",
    marketing: { slug: "restaurant", icon: "restaurant" },
    categories: { play: "Food & Drink", appStore: "Food & Drink" },
    demo: { slug: "restaurant" },
    wording: {
      nav: {
        label: "Your restaurant",
        items: [
          { href: "/dashboard/catalog", label: "Menu", icon: "restaurant_menu" },
          { href: "/dashboard/orders", label: "Kitchen", icon: "skillet" },
        ],
      },
      users: "Customers",
      ownContent: {
        text: "Add your menu here in the dashboard: dishes with their options, opening hours, pickup and delivery. Customers order and pay by card in the app, and your kitchen follows the orders here.",
        next: "After this step, add your dishes, opening hours, pickup and delivery and your payment keys (iyzico, Kashier, Fawaterk, Stripe or PayPal) on the **Menu** page, and follow orders on the **Kitchen** page. Your customers sign in to the app with",
      },
      tabs: { shop: "Menu" },
      tabIcons: { shop: "restaurant_menu" },
      searchPlaceholders: { search: "Search the menu" },
    },
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
    // 21 Clinics: the bookings engine with doctor, patient and visit wording, an intake form and doctor profiles.
    id: "clinic",
    engine: "booking",
    vertical: "clinic",
    name: "Clinic",
    description: "Doctors, dentists, therapists: patients book visits, fill an intake form and see their visits in the app.",
    requires: "Works with: Amelia, BookingPress, LatePoint · Digits · Intake forms without a website",
    icon: "stethoscope",
    tile: "bg-tile-4 text-[#7A2E55]",
    marketing: { slug: "clinic", icon: "stethoscope" },
    categories: { play: "Medical", appStore: "Medical" },
    demo: { slug: "clinic" },
    wording: {
      nav: {
        label: "Your clinic",
        items: [
          { href: "/dashboard/services", label: "Doctors & services", icon: "stethoscope" },
          { href: "/dashboard/appointments", label: "Visits", icon: "event_available" },
        ],
      },
      users: "Patients",
      ownContent: {
        text: "Add your services, doctors and their hours here in the dashboard, with an intake form if you like. Patients book visits in the app, and you see them here.",
        next: "After this step, add your services, your doctors, their hours and your intake questions on the **Doctors & services** page. Your patients sign in to the app with",
      },
      tabs: { appointments: "Visits" },
    },
  },
  {
    // 27 Gyms, studios and coaches: the bookings engine with a weekly class timetable, spots and memberships.
    id: "fitness",
    engine: "booking",
    vertical: "fitness",
    name: "Gym & fitness",
    description: "Class timetables, booking a spot, and memberships for gyms, studios and coaches.",
    requires: "Classes and memberships: no website needed · Appointments also with Amelia, BookingPress, LatePoint",
    icon: "fitness_center",
    tile: "bg-tile-1 text-[#8A3B12]",
    marketing: { slug: "fitness", icon: "fitness_center" },
    categories: { play: "Health & Fitness", appStore: "Health & Fitness" },
    demo: { slug: "fitness" },
    wording: {
      nav: {
        label: "Your gym",
        items: [
          { href: "/dashboard/services", label: "Classes & coaches", icon: "fitness_center" },
          { href: "/dashboard/timetable", label: "Timetable", icon: "schedule" },
          { href: "/dashboard/memberships", label: "Membership plans", icon: "card_membership" },
          { href: "/dashboard/members", label: "Members", icon: "groups" },
          // 63 Members let in at the door.
          { href: "/dashboard/members/check-in", label: "Member check-in", icon: "qr_code_scanner" },
          { href: "/dashboard/appointments", label: "Personal sessions", icon: "event_available" },
          { href: "/dashboard/orders", label: "Orders", icon: "receipt_long" },
        ],
      },
      users: "App users",
      ownContent: {
        text: "Add your classes, coaches, weekly timetable and membership plans here in the dashboard. Members book a spot in the app and buy their membership by card.",
        next: "After this step, add your classes and coaches on the **Classes & coaches** page, then your weekly classes on the **Timetable** page and your plans on the **Membership plans** page. Your members sign in to the app with",
      },
    },
    tabs: [
      tab("classes", "Classes", "fitness_center", "classes"),
      tab("membership", "Membership", "card_membership", "memberships"),
      tab("appointments", "My bookings", "event", "appointments"),
    ],
    reviewNote:
      "Memberships are for classes at our gym, used in person, so they are paid on our web payment page on iPhone too (App Store Review Guideline 3.1.3(e)). Nothing digital is sold in the app.",
  },
  {
    // 84.1 Services and companies: the bookings engine with designs that present the company too.
    id: "services",
    engine: "booking",
    vertical: "services",
    name: "Services & companies",
    description: "Cleaning, repairs, consultancies and agencies: your services, your team and your offers, booked in the app.",
    requires: "Works with: Amelia, BookingPress, LatePoint, SimplyBook.me · or no website",
    icon: "build",
    tile: "bg-tile-3 text-[#3F3A6B]",
    marketing: { slug: "services", icon: "build" },
    categories: { play: "Business", appStore: "Business" },
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
  {
    id: "news",
    engine: "news",
    vertical: null,
    name: "News & blog",
    description: "Articles, categories and breaking-news alerts from your site or written in Yallapp.",
    requires: "Works with: WordPress, any site with an RSS feed, or no website at all",
    icon: "newspaper",
    tile: "bg-tile-4 text-[#6B2E55]",
    marketing: { slug: "news", icon: "newspaper" },
  },
  {
    // 28 Events & tickets
    id: "events",
    engine: "events",
    vertical: null,
    name: "Events & tickets",
    description: "Event listings, free sign-ups and paid tickets with QR codes checked at the door.",
    requires: "No website needed: you add your events here in the dashboard",
    icon: "confirmation_number",
    tile: "bg-tile-1 text-[#8A4B12]",
    marketing: { slug: "events", icon: "confirmation_number" },
  },
  {
    // 29 The donations engine's one kind: its default, with the charity vertical.
    id: "charity",
    engine: "donations",
    vertical: "charity",
    name: "Charity & donations",
    // Monthly donations are a follow-up (roadmap 29): the picker promises what the app does today.
    description: "Campaigns with progress, one-off donations and receipts for your supporters.",
    requires: "No website needed: you add your campaigns here in the dashboard · Your own iyzico, Kashier, Fawaterk, Stripe or PayPal account",
    icon: "volunteer_activism",
    tile: "bg-tile-2 text-[#2F6B3A]",
    marketing: { slug: "charity", icon: "volunteer_activism" },
  },
  {
    // 104 The delivery engine's one kind.
    id: "delivery",
    engine: "delivery",
    vertical: null,
    name: "Delivery & couriers",
    description: "Customers send parcels and follow them; your couriers get their jobs in the app.",
    requires: "No website needed: you set your prices and couriers here in the dashboard · Cash to the courier, or your own iyzico, Kashier, Fawaterk, Stripe or PayPal account",
    icon: "local_shipping",
    tile: "bg-tile-1 text-[#8A4B12]",
    marketing: { slug: "delivery", icon: "local_shipping" },
    reviewNote:
      "This app has two roles. Customers send parcels and follow them. Couriers of the company sign in with a number the company added and see a Courier tab with their jobs. Use the customer review account for the customer's screens and the courier review account for the courier's.",
  },
  {
    // 105.1 The food engine's one kind.
    id: "food",
    engine: "food",
    vertical: null,
    name: "Food delivery",
    description: "Customers order from many restaurants and follow their food; each restaurant takes its orders and your couriers deliver them.",
    requires: "No website needed: you add your restaurants and their menus here in the dashboard · Cash to the courier, or your own iyzico, Kashier, Fawaterk, Stripe or PayPal account",
    icon: "restaurant",
    tile: "bg-tile-2 text-[#8A4B12]",
    marketing: { slug: "food", icon: "restaurant" },
    reviewNote:
      "This app has three roles. Customers order food from the restaurants. A restaurant's staff sign in with a number the company added and see a Restaurant tab with its orders. Couriers see a Courier tab with their jobs.",
  },
  {
    // 105.2 The rides engine's one kind.
    id: "rides",
    engine: "rides",
    vertical: null,
    name: "Ride hailing",
    description: "Riders ask for a ride and follow their driver on the map; your drivers get the rides in the app.",
    requires: "No website needed: you set your vehicle types, fares and drivers here in the dashboard · Cash to the driver, or your own iyzico, Kashier, Fawaterk, Stripe or PayPal account",
    icon: "local_taxi",
    tile: "bg-tile-3 text-[#8A4B12]",
    marketing: { slug: "rides", icon: "local_taxi" },
    reviewNote:
      "This app has two roles. Riders ask for a ride and follow the driver. Drivers of the company sign in with a number the company added and see a Driver tab with the rides offered to them.",
  },
  {
    // 105.4 The school engine's one kind.
    id: "school",
    engine: "school",
    vertical: null,
    name: "School",
    description: "Students and parents follow the timetable, homework, grades, attendance and fees; your teachers take attendance and give homework in the app.",
    requires: "No website needed: you add your classes, students, parents and teachers here in the dashboard · Fees by card into your own iyzico, Kashier, Fawaterk, Stripe or PayPal account",
    icon: "school",
    tile: "bg-tile-1 text-[#1F4E79]",
    marketing: { slug: "school", icon: "school" },
    reviewNote:
      "This app has three roles. Students see their timetable, homework, grades, attendance and the school's news. Parents see the same for each of their children and pay fees. Teachers of the school sign in with a number the school added and see a Classroom tab where they take attendance, give homework and enter scores.",
  },
  {
    // 105.3 An academy with many teachers: the courses engine, each course possibly a teacher's.
    id: "instructors",
    engine: "lms",
    vertical: "instructors",
    name: "Academy with many teachers",
    description: "Your teachers publish their own courses after your review, answer their students and see their share of the sales.",
    requires: "No website needed: you add your teachers and review their courses here in the dashboard · Your own iyzico, Kashier, Fawaterk, Stripe or PayPal account",
    icon: "groups",
    tile: "bg-tile-4 text-[#2F6B3A]",
    marketing: { slug: "instructors", icon: "groups" },
    wording: {
      nav: {
        label: "Your academy",
        items: [
          { href: "/dashboard/courses", label: "Courses", icon: "school" },
          { href: "/dashboard/teachers", label: "Teachers", icon: "groups" },
          { href: "/dashboard/teachers/review", label: "Courses to review", icon: "task_alt" },
          { href: "/dashboard/teachers/statement", label: "Teacher statements", icon: "receipt_long" },
          { href: "/dashboard/courses/questions", label: "Questions", icon: "help" },
          { href: "/dashboard/courses/reviews", label: "Reviews", icon: "star" },
          { href: "/dashboard/orders", label: "Orders", icon: "receipt_long" },
        ],
      },
      users: "Students",
      ownContent: {
        text: "Add your teachers here in the dashboard; they make their courses in the app and you publish them. Students buy courses on your own payment page.",
        next: "After this step, add your teachers on the **Teachers** page, then review the courses they send on **Courses to review**. Teachers and students sign in to the app with",
      },
    },
    reviewNote:
      "This app has two roles. Students browse the academy's teachers and courses. Teachers of the academy sign in with a number the academy added and see a Teacher tab with their courses, students' questions and earnings. The review account is both: a student, and a test teacher (\"App Review\") whose Teacher tab makes a course and sends it to the academy for review. Students never see the test teacher.",
    screens: ["teachers", "teacher"],
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

/** 21 The Website step's text of the dashboard-managed content and what to do next, in the kind's words. */
export function ownContentWords(app: Pick<App, "appType"> & { vertical?: AppVertical | null }): { text: string; next: string } {
  const engine = ENGINES[app.appType];
  return kindOf(app).wording?.ownContent ?? { text: engine.ownContent.choice.text, next: engine.ownContent.next };
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
  return APP_TYPES.find((type) => ENGINES[type].demo?.slug === slug) ?? null;
}

/**
 * 21 The kind's demo slug: its own, the engine's for a default kind, else
 * none. 29 An engine whose only kind has a vertical (the charity) has that
 * kind as its default.
 */
export function demoSlugOfKind(kind: KindInfo): string | null {
  return kind.demo?.slug ?? (defaultKind(kind.engine) === kind ? (ENGINES[kind.engine].demo?.slug ?? null) : null);
}

/** 21 The dashboard's group for the app's content managed here: the kind's words, else the engine's. */
export function contentNavOf(app: Pick<App, "appType" | "connector"> & { vertical?: AppVertical | null }): { label: string; items: NavItem[] } | null {
  const engine = engineOfContent(app.connector?.kind);
  if (!engine) return null;
  const kind = kindOf(app);
  return kind.engine === engine.id && kind.wording ? kind.wording.nav : engine.ownContent.nav;
}

/** 31 The dashboard's words for the app's engine: its content, what it sells and Apple's rules for it. */
export function wordsOf(app: Pick<App, "appType">): EngineInfo["words"] {
  return ENGINES[isAppType(app.appType) ? app.appType : "lms"].words;
}

/** 21 The sidebar group of the app users pages: "App users", or the kind's word ("Patients"). */
export function usersLabelOf(app: (Pick<App, "appType"> & { vertical?: AppVertical | null }) | null): string {
  return (app && kindOf(app).wording?.users) || "App users";
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
