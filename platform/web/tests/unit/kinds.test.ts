import { describe, expect, it } from "vitest";
import { contentSource } from "@/lib/admin/labels";
import { audienceOptions, describeAudience } from "@/lib/announcements";
import {
  APP_TYPES,
  APP_VERTICALS,
  appTypeName,
  connectorFits,
  contentNavOf,
  defaultKind,
  demoSlugOfKind,
  ownContentWords,
  usersLabelOf,
  ENGINES,
  engineOfContent,
  engineOfDemoSlug,
  hostedOnly,
  isAppType,
  isOwnContent,
  KINDS,
  kindById,
  kindOf,
  suggestedCategories,
  toVertical,
} from "@/lib/app/kinds";
import { newApp, websiteReady } from "@/lib/app/setup";
import { CONTENT_PAGES } from "@/lib/content/site";
import type { App, AppType, ConnectorConfig } from "@/lib/data/types";
import { DEMO_SLUGS, DEMO_TYPES, demoTypeOfSlug } from "@/lib/demo/constants";
import { emailSignInNote } from "@/lib/hosted/sign-in-methods";
import { INTEGRATION_GROUPS, NUMBERS, SOLUTIONS } from "@/lib/marketing";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { blockTypesFor, itemSourcesFor } from "@/lib/pages/sources";
import type { LayoutBlock, LayoutContent, LayoutTab } from "@/lib/pages/types";
import { previewContentSource } from "@/lib/preview/config";
import { APP_TYPE_SWITCHES, noWebsiteFor, switchGroups } from "@/lib/switches";
import { activateLicense, checkLicense, parseSiteInfo } from "@/lib/license/service";
import { NOW, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

/**
 * 20 The registry (lib/app/kinds.ts) replaced hand-written tables per app
 * type. These are the values those tables had before Phase 20: the four
 * existing kinds must behave exactly as they did.
 */

const BEFORE = {
  names: { lms: "Academy", store: "Store", booking: "Bookings", real_estate: "Real estate" },
  icons: { lms: "school", store: "shopping_bag", booking: "calendar_month", real_estate: "apartment" },
  marketingIcons: { lms: "school", store: "storefront", booking: "calendar_month", real_estate: "apartment" },
  demoSlugs: { lms: "academy", store: "store", booking: "bookings", real_estate: "real-estate" },
  noWebsite: { lms: "courses", store: "catalog", booking: "bookings", real_estate: "listings" },
  categories: {
    lms: { play: "Education", appStore: "Education" },
    store: { play: "Shopping", appStore: "Shopping" },
    booking: { play: "Lifestyle", appStore: "Lifestyle" },
    real_estate: { play: "House & Home", appStore: "Lifestyle" },
  },
  homePath: { lms: "/home", store: "/store/home", booking: "/bookings/home", real_estate: "/listings" },
  configCheck: {
    lms: ["Config names the LMS", "Set `features.lms`."],
    store: ["Config has the store settings", "Add `store` to /config."],
    booking: ["Config has the bookings settings", "Add `bookings` to /config."],
    real_estate: ["Config has the office settings", "Add `listings` to /config."],
  },
  websites: {
    lms: ["wordpress", "platform", "catalog", "custom_api", "setup_requested"],
    store: ["wordpress", "shopify", "platform", "catalog", "custom_api", "setup_requested"],
    booking: ["wordpress", "platform", "catalog", "custom_api", "setup_requested"],
    real_estate: ["catalog"],
  },
  contentNav: {
    catalog: ["Your shop", ["/dashboard/catalog", "Products", "inventory_2"], ["/dashboard/orders", "Orders", "receipt_long"]],
    courses: ["Your school", ["/dashboard/courses", "Courses", "school"], ["/dashboard/orders", "Orders", "receipt_long"]],
    bookings: ["Your bookings", ["/dashboard/services", "Services & team", "groups"], ["/dashboard/appointments", "Appointments", "event_available"]],
    listings: ["Your properties", ["/dashboard/listings", "Listings", "home_work"], ["/dashboard/inquiries", "Inquiries", "forum"]],
  },
  picker: [
    ["lms", "Academy", "school", "bg-peach", "Courses, lessons, quizzes and certificates.", "Works with: Tutor LMS, LearnPress, LifterLMS, MasterStudy, Sensei, Masteriyo · Digits"],
    ["store", "Store", "shopping_bag", "bg-tile-1 text-[#8A5A12]", "Products, cart, checkout and orders. Delivery date and gift messages for flower shops.", "Works with: WooCommerce · Digits"],
    ["booking", "Bookings", "calendar_month", "bg-tile-2 text-[#1D6B48]", "Services, staff, free times and appointments, booked through your booking plugin.", "Works with: Amelia, BookingPress, LatePoint · Digits"],
    ["real_estate", "Real estate", "apartment", "bg-tile-3 text-[#3F3A6B]", "Property listings with search and filters, favorites and messages to your office.", "No website needed: you add your listings here in the dashboard"],
  ],
} as const;

/** 23 The engines that existed before Phase 20; News & blog (23) came after. */
const FOUR = ["lms", "store", "booking", "real_estate"] as const;

/** The default layouts as lib/pages/defaults.ts wrote them before Phase 20. */
function layoutBefore(appType: string, name: string, now: Date): Pick<LayoutContent, "tabs" | "pages"> {
  const tab = (id: string, label: string, icon: string, target: LayoutTab["target"]): LayoutTab => ({ id, label, icon, target });
  const home = (blocks: LayoutBlock[]) => [{ slug: "home", title: "Home", show_title: false, updated_at: now.toISOString(), blocks }];
  const welcome: LayoutBlock = { id: "welcome", type: "text", visibility: "everyone", title: null, html: `<h2>Welcome to ${name}</h2>` };
  const homeTab = tab("home", "Home", "home", { type: "page", page_slug: "home" });
  const accountTab = tab("account", "Account", "person", { type: "screen", screen: "account" });
  const q = (limit: number, featured = false) => ({ category_id: null, featured, sort: "newest" as const, limit, ids: [] });
  switch (appType) {
    case "lms":
      return {
        tabs: [homeTab, tab("courses", "Courses", "school", { type: "screen", screen: "courses" }), tab("learning", "My courses", "menu_book", { type: "screen", screen: "my_courses" }), accountTab],
        pages: home([
          welcome,
          { id: "search", type: "search", visibility: "everyone", title: null, source: "courses", placeholder: "Search courses" },
          { id: "continue", type: "continue_learning", visibility: "signed_in", title: "Continue learning" },
          { id: "new-courses", type: "items", visibility: "everyone", title: "New courses", source: "courses", layout: "carousel", see_all: { type: "screen", screen: "courses" }, query: q(10) },
          { id: "categories", type: "categories", visibility: "everyone", title: "Categories", source: "courses", style: "chips" },
        ]),
      };
    case "store":
      return {
        tabs: [homeTab, tab("shop", "Shop", "storefront", { type: "screen", screen: "search" }), tab("cart", "Cart", "shopping_cart", { type: "screen", screen: "cart" }), accountTab],
        pages: home([
          welcome,
          { id: "search", type: "search", visibility: "everyone", title: null, source: "products", placeholder: "Search products" },
          { id: "categories", type: "categories", visibility: "everyone", title: "Categories", source: "products", style: "chips" },
          { id: "featured", type: "items", visibility: "everyone", title: "Featured", source: "products", layout: "grid", see_all: null, query: q(6, true) },
          { id: "new-products", type: "items", visibility: "everyone", title: "New arrivals", source: "products", layout: "carousel", see_all: { type: "screen", screen: "search" }, query: q(10) },
        ]),
      };
    case "real_estate":
      return {
        tabs: [
          homeTab,
          tab("search", "Search", "search", { type: "screen", screen: "search" }),
          tab("favorites", "Favorites", "favorite", { type: "screen", screen: "favorites" }),
          tab("messages", "Messages", "chat", { type: "screen", screen: "messages" }),
          accountTab,
        ],
        pages: home([
          welcome,
          { id: "search", type: "search", visibility: "everyone", title: null, source: "listings", placeholder: "Search properties" },
          { id: "new-listings", type: "items", visibility: "everyone", title: "New listings", source: "listings", layout: "list", see_all: { type: "screen", screen: "search" }, query: q(10) },
        ]),
      };
    case "booking":
      return {
        tabs: [homeTab, tab("book", "Book", "calendar_month", { type: "screen", screen: "services" }), tab("appointments", "Appointments", "event", { type: "screen", screen: "appointments" }), accountTab],
        pages: home([
          welcome,
          { id: "services", type: "items", visibility: "everyone", title: "Our services", source: "services", layout: "list", see_all: { type: "screen", screen: "services" }, query: q(10) },
        ]),
      };
    default:
      return { tabs: [homeTab, accountTab], pages: home([welcome]) };
  }
}

/** Whether content fit another app type, as chooseAppTypeAction decided before Phase 20. */
function fitsBefore(appType: AppType, connector: ConnectorConfig | null, platformEngine: (id: string) => AppType | null): boolean {
  const kind = connector?.kind;
  return appType === "real_estate"
    ? kind === "listings"
    : !kind ||
        (connector?.kind === "platform"
          ? platformEngine(connector.platform) === appType
          : kind === "bookings"
            ? appType === "booking"
            : kind === "courses"
              ? appType === "lms"
              : kind !== "listings" && appType === "store");
}

const appOf = (appType: AppType, patch: Partial<App> = {}): App => ({ ...newApp("c1", "https://shop.test", NOW, appType), ...patch });

describe("20 app kinds registry", () => {
  it("lists the four engines and kinds with the values they had", () => {
    expect(APP_TYPES).toEqual([...FOUR, "news", "events"]);
    // 21 Clinic is the first kind with a vertical; the four default kinds are as they were. 23 News is a new engine. 26 Restaurant & café after Store.
    // 27 Gym & fitness: the bookings engine with the fitness vertical, after Clinic. 28 Events & tickets, a new engine, last.
    expect(KINDS.map((k) => k.id)).toEqual(["academy", "store", "restaurant", "bookings", "clinic", "fitness", "real_estate", "news", "events"]);
    for (const type of FOUR) {
      expect(ENGINES[type].name).toBe(BEFORE.names[type]);
      expect(ENGINES[type].icon).toBe(BEFORE.icons[type]);
      expect(ENGINES[type].demo.slug).toBe(BEFORE.demoSlugs[type]);
      expect(ENGINES[type].ownContent.kind).toBe(BEFORE.noWebsite[type]);
      expect(ENGINES[type].categories).toEqual(BEFORE.categories[type]);
      expect(ENGINES[type].homePath).toBe(BEFORE.homePath[type]);
      expect([ENGINES[type].configCheck.label, ENGINES[type].configCheck.fix]).toEqual(BEFORE.configCheck[type]);
      expect(ENGINES[type].websites).toEqual(BEFORE.websites[type]);
      // Each engine's default kind has no vertical and the same name and icon.
      const kind = defaultKind(type);
      expect(kind.vertical).toBeNull();
      expect(kind.name).toBe(BEFORE.names[type]);
      expect(kind.icon).toBe(BEFORE.icons[type]);
      expect(kind.marketing.icon).toBe(BEFORE.marketingIcons[type]);
      expect(kindOf({ appType: type })).toBe(kind);
      expect(kindOf({ appType: type, vertical: null })).toBe(kind);
      expect(suggestedCategories({ appType: type })).toEqual(BEFORE.categories[type]);
      expect(noWebsiteFor(type)).toBe(BEFORE.noWebsite[type]);
    }
    expect(KINDS.filter((k) => k.vertical === null && k.engine !== "news" && k.engine !== "events").map((k) => [k.engine, k.name, k.icon, k.tile, k.description, k.requires])).toEqual(BEFORE.picker);
  });

  it("gives the same demo slugs, switches, sidebar groups and admin labels", () => {
    // 21 One more demo: the clinic, after Bookings. 23 The news app. 26 The café, after the shop. 27 The gym, after the clinic. 28 The events app, last.
    expect(DEMO_TYPES).toEqual(["lms", "store", "restaurant", "booking", "clinic", "fitness", "real_estate", "news", "events"]);
    expect(DEMO_SLUGS).toEqual({ ...BEFORE.demoSlugs, clinic: "clinic", news: "news", restaurant: "restaurant", fitness: "fitness", events: "events" });
    expect(demoTypeOfSlug("fitness")).toBe("fitness");
    expect(demoTypeOfSlug("clinic")).toBe("clinic");
    expect(engineOfDemoSlug("clinic")).toBeNull();
    for (const [type, slug] of Object.entries(BEFORE.demoSlugs)) {
      expect(demoTypeOfSlug(slug)).toBe(type);
      expect(engineOfDemoSlug(slug)).toBe(type);
    }
    expect(demoTypeOfSlug("salon")).toBeNull();
    expect(APP_TYPE_SWITCHES).toEqual([...Object.entries(BEFORE.names).map(([id, label]) => ({ id, label })), { id: "news", label: "News & blog" }, { id: "events", label: "Events & tickets" }]);
    const websites = switchGroups().find((g) => g.kind === "website")!.items;
    expect(Object.fromEntries(websites.filter((w) => isOwnContent(w.id)).map((w) => [w.id, w.label]))).toEqual({
      catalog: "No website: products in the dashboard",
      bookings: "No website: bookings in the dashboard",
      courses: "No website: courses in the dashboard",
      listings: "No website: listings in the dashboard",
      articles: "No website: articles in the dashboard",
      events: "No website: events in the dashboard",
    });
    for (const [kind, [label, ...items]] of Object.entries(BEFORE.contentNav)) {
      const nav = engineOfContent(kind)!.ownContent.nav;
      expect(nav.label).toBe(label);
      expect(nav.items.map((i) => [i.href, i.label, i.icon])).toEqual(items);
    }
    expect(engineOfContent("shopify")).toBeNull();
    expect(engineOfContent(undefined)).toBeNull();
    const app = (connector: ConnectorConfig, patch: Partial<App> = {}) => appOf("store", { backend: "hosted", connector, ...patch });
    expect(contentSource(app({ kind: "listings" }))).toBe("Real estate: listings in the dashboard");
    expect(contentSource(app({ kind: "courses" }))).toBe("No website: courses in the dashboard");
    expect(contentSource(app({ kind: "bookings" }))).toBe("No website: services and hours in the dashboard");
    expect(contentSource(app({ kind: "catalog" }))).toBe("No website: products in the dashboard");
    expect(contentSource(app({ kind: "catalog" }, { catalogSettings: { currency: "TRY", shippingCents: 0, freeShippingOverCents: null, payment: { provider: "yallapp" } as never } }))).toBe(
      "No website: products in the dashboard, sells through Yallapp",
    );
    expect(contentSource(appOf("lms"))).toBe("Their WordPress site");
  });

  it("gives the same default layouts, page sources and block types", () => {
    for (const type of [...FOUR, "salon"]) {
      const app = { appType: type as AppType, backend: "wordpress" as const, appName: "Nour", template: "classic" as const, font: "Outfit", brandingDoneAt: null };
      const layout = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
      expect({ tabs: layout.tabs, pages: layout.pages }, type).toEqual(layoutBefore(type, "Nour", NOW));
    }
    // Each call gets its own copy: editing one layout never changes the registry.
    const first = defaultLayout({ appType: "lms", backend: "hosted", appName: null, template: "classic", font: "Outfit", brandingDoneAt: null }, BUILT_IN_APP_DEFAULTS, NOW);
    first.pages[0]!.blocks[1]!.title = "Changed";
    first.tabs[1]!.label = "Changed";
    expect(ENGINES.lms.pages.home[0]!.title).toBeNull();
    expect(ENGINES.lms.pages.tabs[0]!.label).toBe("Courses");

    const sources = (appType: string, backend: App["backend"]) => itemSourcesFor({ appType: appType as AppType, backend });
    expect(sources("lms", "wordpress")).toEqual(["courses", "posts"]);
    expect(sources("store", "custom_api")).toEqual(["products", "posts"]);
    expect(sources("booking", "hosted")).toEqual(["services"]);
    expect(sources("real_estate", "wordpress")).toEqual(["listings"]);
    expect(sources("real_estate", "hosted")).toEqual(["listings"]);
    expect(sources("salon", "wordpress")).toEqual(["posts"]);
    expect(sources("salon", "hosted")).toEqual([]);
    expect(blockTypesFor({ appType: "lms", backend: "hosted" })).toContain("continue_learning");
    for (const type of ["store", "booking", "real_estate"] as const) expect(blockTypesFor({ appType: type, backend: "hosted" })).not.toContain("continue_learning");
    expect(blockTypesFor({ appType: "real_estate", backend: "hosted" })).not.toContain("categories");
  });

  it("decides what fits another app type as before", () => {
    const platformEngine = (id: string): AppType | null => (id === "ikas" ? "store" : id === "teachable" ? "lms" : id === "simplybook" ? "booking" : null);
    const connectors: (ConnectorConfig | null)[] = [
      null,
      { kind: "catalog" },
      { kind: "courses" },
      { kind: "bookings" },
      { kind: "listings" },
      { kind: "shopify", shopDomain: "x.myshopify.com", storefrontTokenEncrypted: "" },
      { kind: "platform", platform: "ikas", settings: {}, secretsEncrypted: "" },
      { kind: "platform", platform: "teachable", settings: {}, secretsEncrypted: "" },
      { kind: "platform", platform: "simplybook", settings: {}, secretsEncrypted: "" },
    ];
    for (const type of FOUR) {
      for (const connector of connectors) {
        expect(connectorFits(type, connector, platformEngine), `${type} ${connector?.kind}`).toBe(fitsBefore(type, connector, platformEngine));
      }
    }
  });

  it("keeps Real estate on the hosted API only", () => {
    // 28 Events & tickets is hosted only too, for now.
    expect(APP_TYPES.filter(hostedOnly)).toEqual(["real_estate", "events"]);
    const wordpress = appOf("real_estate", { websiteDoneAt: NOW });
    expect(websiteReady(wordpress)).toBe(false);
    expect(previewContentSource(wordpress)).toBe("none");
    expect(previewContentSource(appOf("store"))).toBe("wordpress");
  });

  it("words App sign-in's phone note per engine as before", () => {
    const hosted = (appType: AppType, connector: ConnectorConfig) => ({ appType, backend: "hosted" as const, connector, demo: false });
    expect(emailSignInNote(hosted("store", { kind: "shopify", shopDomain: "x.myshopify.com", storefrontTokenEncrypted: "" }))).toBe(
      "Your connected shop finds each customer's orders by their phone number, so this app signs in by phone.",
    );
    expect(emailSignInNote(hosted("store", { kind: "platform", platform: "ikas", settings: {}, secretsEncrypted: "" }))).toBe(
      "Your connected shop finds each customer's orders by their phone number, so this app signs in by phone.",
    );
    expect(emailSignInNote(hosted("booking", { kind: "platform", platform: "simplybook", settings: {}, secretsEncrypted: "" }))).toBe(
      "Your booking platform finds each customer's bookings by their phone number, so this app signs in by phone.",
    );
  });

  it("names the solution pages, their headers and the numbers as before", () => {
    expect(SOLUTIONS.map((s) => [s.id, s.contentKey, s.name, s.icon])).toEqual([
      ["academy", "solution-academy", "Academy", "school"],
      ["store", "solution-store", "Store", "storefront"],
      ["restaurant", "solution-restaurant", "Restaurant & café", "restaurant"],
      ["bookings", "solution-bookings", "Bookings", "calendar_month"],
      ["clinic", "solution-clinic", "Clinic", "stethoscope"],
      ["fitness", "solution-fitness", "Gym & fitness", "fitness_center"],
      ["real-estate", "solution-real-estate", "Real estate", "apartment"],
      ["news", "solution-news", "News & blog", "newspaper"],
      ["events", "solution-events", "Events & tickets", "confirmation_number"],
    ]);
    const headers = CONTENT_PAGES.filter((p) => p.key.startsWith("solution-"));
    expect(headers.map((p) => [p.key, p.title, p.path])).toEqual([
      ["solution-academy", "Solutions: Academy", "/solutions/academy"],
      ["solution-store", "Solutions: Store", "/solutions/store"],
      ["solution-restaurant", "Solutions: Restaurant & café", "/solutions/restaurant"],
      ["solution-bookings", "Solutions: Bookings", "/solutions/bookings"],
      ["solution-clinic", "Solutions: Clinic", "/solutions/clinic"],
      ["solution-fitness", "Solutions: Gym & fitness", "/solutions/fitness"],
      ["solution-real-estate", "Solutions: Real estate", "/solutions/real-estate"],
      ["solution-news", "Solutions: News & blog", "/solutions/news"],
      ["solution-events", "Solutions: Events & tickets", "/solutions/events"],
    ]);
    expect(headers.map((p) => p.defaults.eyebrow)).toEqual(["Academy apps", "Store apps", "Restaurant & café apps", "Bookings apps", "Clinic apps", "Gym & fitness apps", "Real estate apps", "News & blog apps", "Events & tickets apps"]);
    expect(NUMBERS[0]).toEqual({ value: "9", label: "app types: academy, store, restaurant & café, bookings, clinic, gym & fitness, real estate, news & blog and events & tickets" });
    const names = new Set(KINDS.map((k) => k.name));
    for (const group of INTEGRATION_GROUPS) for (const item of group.items) for (const t of item.types) expect(names, `${item.name}: ${t}`).toContain(t);
  });

  it("offers every engine to announcements, Real estate included", () => {
    const planNames = { starter: "Starter", growth: "Growth", pro: "Pro", business: "Business" };
    expect(audienceOptions(planNames).appTypes).toEqual([
      { id: "lms", label: "Academy" },
      { id: "store", label: "Store" },
      { id: "booking", label: "Bookings" },
      { id: "real_estate", label: "Real estate" },
      { id: "news", label: "News & blog" },
      { id: "events", label: "Events & tickets" },
    ]);
    expect(describeAudience({ kind: "app_type", appTypes: ["real_estate", "store"] }, planNames)).toBe("App types: Real estate, Store");
  });

  it("tells the plugin the app's type and vertical in the license status", async () => {
    const { store, client, licenseKey } = await setupClient();
    const site = parseSiteInfo({ license_key: licenseKey, site_url: "https://shop.test", plugin_version: "0.3.3" });
    if (!site.ok) throw new Error("bad site");
    // No app yet: nothing to tell.
    const before = await activateLicense(store, site.value, NOW);
    expect(before).toMatchObject({ status: 200, body: { app_type: null, vertical: null } });
    expectPlatformContract("POST", "/licenses/activate", before);
    const app = newApp(client.id, "https://shop.test", NOW, "store");
    await store.createApp(app);
    const plain = await checkLicense(store, site.value, NOW);
    expect(plain).toMatchObject({ status: 200, body: { app_type: "store", vertical: null } });
    expectPlatformContract("POST", "/licenses/check", plain);
    await store.updateApp(app.id, { vertical: "restaurant" }, NOW);
    const restaurant = await checkLicense(store, site.value, NOW);
    expect(restaurant).toMatchObject({ status: 200, body: { app_type: "store", vertical: "restaurant" } });
    expectPlatformContract("POST", "/licenses/check", restaurant);
  });

  it("reads verticals and kinds", () => {
    expect(APP_VERTICALS).toEqual(["restaurant", "clinic", "fitness", "charity"]);
    expect(toVertical("clinic")).toBe("clinic");
    expect(toVertical("salon")).toBeNull();
    expect(toVertical(null)).toBeNull();
    expect(kindById("academy")?.engine).toBe("lms");
    expect(kindById("lms")).toBeNull();
    expect(isAppType("real_estate")).toBe(true);
    expect(isAppType("toString")).toBe(false);
    // An app whose vertical has no kind (yet) is its engine's default kind.
    expect(kindOf({ appType: "store", vertical: "fitness" }).id).toBe("store");
    expect(kindOf({ appType: "booking", vertical: "restaurant" }).id).toBe("bookings");
    // Kind ids, slugs and engines' demo slugs are unique.
    expect(new Set(KINDS.map((k) => k.id)).size).toBe(KINDS.length);
    expect(new Set(KINDS.map((k) => k.marketing.slug)).size).toBe(KINDS.length);
    expect(new Set(KINDS.map((k) => `${k.engine}:${k.vertical}`)).size).toBe(KINDS.length);
    for (const type of APP_TYPES) expect(KINDS.some((k) => k.engine === type && k.vertical === null), type).toBe(true);
  });
});

describe("21 the Clinic kind", () => {
  it("is the bookings engine with the clinic vertical, its own words, demo and store categories", () => {
    const clinic = kindById("clinic")!;
    expect(clinic).toMatchObject({ engine: "booking", vertical: "clinic", name: "Clinic", icon: "stethoscope", marketing: { slug: "clinic", icon: "stethoscope" } });
    expect(clinic.description).toBe("Doctors, dentists, therapists: patients book visits, fill an intake form and see their visits in the app.");
    expect(kindOf({ appType: "booking", vertical: "clinic" })).toBe(clinic);
    expect(appTypeName({ appType: "booking", vertical: "clinic" })).toBe("Clinic");
    expect(suggestedCategories({ appType: "booking", vertical: "clinic" })).toEqual({ play: "Medical", appStore: "Medical" });
    // The same engine: same module, same API paths, same pages.
    expect(ENGINES[clinic.engine].homePath).toBe("/bookings/home");
    expect(demoSlugOfKind(clinic)).toBe("clinic");
    expect(demoSlugOfKind(defaultKind("booking"))).toBe("bookings");
  });

  it("words the dashboard's menu, app users and Website step for clinics only", () => {
    const hosted = { kind: "bookings" } as const;
    const clinic = contentNavOf({ appType: "booking", vertical: "clinic", connector: hosted })!;
    expect(clinic.label).toBe("Your clinic");
    expect(clinic.items.map((i) => [i.href, i.label, i.icon])).toEqual([
      ["/dashboard/services", "Doctors & services", "stethoscope"],
      ["/dashboard/appointments", "Visits", "event_available"],
    ]);
    expect(contentNavOf({ appType: "booking", vertical: null, connector: hosted })!.items.map((i) => i.label)).toEqual(["Services & team", "Appointments"]);
    // A clinic with a booking plugin has no pages for content managed here.
    expect(contentNavOf({ appType: "booking", vertical: "clinic", connector: null })).toBeNull();
    expect(usersLabelOf({ appType: "booking", vertical: "clinic" })).toBe("Patients");
    expect(usersLabelOf({ appType: "booking", vertical: null })).toBe("App users");
    expect(usersLabelOf(null)).toBe("App users");
    expect(ownContentWords({ appType: "booking", vertical: "clinic" }).next).toContain("**Doctors & services**");
    expect(ownContentWords({ appType: "booking" })).toEqual({ text: ENGINES.booking.ownContent.choice.text, next: ENGINES.booking.ownContent.next });
    // The first layout's Appointments tab is Visits; the registry itself is unchanged.
    const app = { appType: "booking" as const, backend: "hosted" as const, appName: "Kardelen", template: "classic" as const, font: "Outfit", brandingDoneAt: null };
    expect(defaultLayout({ ...app, vertical: "clinic" }, BUILT_IN_APP_DEFAULTS, NOW).tabs.map((t) => t.label)).toEqual(["Home", "Book", "Visits", "Account"]);
    expect(defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW).tabs.map((t) => t.label)).toEqual(["Home", "Book", "Appointments", "Account"]);
    expect(ENGINES.booking.pages.tabs[1]!.label).toBe("Appointments");
  });
});

describe("26 the Restaurant & café kind", () => {
  it("is the store engine with the restaurant vertical, its own words, demo and store categories", () => {
    const restaurant = kindById("restaurant")!;
    expect(restaurant).toMatchObject({ engine: "store", vertical: "restaurant", name: "Restaurant & café", icon: "restaurant", marketing: { slug: "restaurant", icon: "restaurant" } });
    expect(restaurant.description).toBe("Your menu in an app: dishes with options, pickup or delivery, and order tracking.");
    expect(kindOf({ appType: "store", vertical: "restaurant" })).toBe(restaurant);
    expect(appTypeName({ appType: "store", vertical: "restaurant" })).toBe("Restaurant & café");
    expect(suggestedCategories({ appType: "store", vertical: "restaurant" })).toEqual({ play: "Food & Drink", appStore: "Food & Drink" });
    expect(ENGINES[restaurant.engine].homePath).toBe("/store/home");
    expect(demoSlugOfKind(restaurant)).toBe("restaurant");
    expect(demoTypeOfSlug("restaurant")).toBe("restaurant");
  });

  it("words the dashboard's menu, the Website step and the first layout for restaurants only", () => {
    const hosted = { kind: "catalog" } as const;
    const restaurant = contentNavOf({ appType: "store", vertical: "restaurant", connector: hosted })!;
    expect(restaurant.label).toBe("Your restaurant");
    expect(restaurant.items.map((i) => [i.href, i.label, i.icon])).toEqual([
      ["/dashboard/catalog", "Menu", "restaurant_menu"],
      ["/dashboard/orders", "Kitchen", "skillet"],
    ]);
    expect(contentNavOf({ appType: "store", vertical: null, connector: hosted })!.items.map((i) => i.label)).toEqual(["Products", "Orders"]);
    expect(usersLabelOf({ appType: "store", vertical: "restaurant" })).toBe("Customers");
    expect(ownContentWords({ appType: "store", vertical: "restaurant" }).next).toContain("**Menu**");
    const app = { appType: "store" as const, backend: "hosted" as const, appName: "Defne", template: "bold" as const, font: "Outfit", brandingDoneAt: null };
    expect(defaultLayout({ ...app, vertical: "restaurant" }, BUILT_IN_APP_DEFAULTS, NOW).tabs.map((t) => t.label)).toEqual(["Home", "Menu", "Cart", "Account"]);
    expect(defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW).tabs.map((t) => t.label)).toEqual(["Home", "Shop", "Cart", "Account"]);
  });
});
