import type { App } from "../data/types";
import { APP_FONTS, type Appearance, type AppDefaultsSetting, type LayoutBlock, type LayoutContent, type LayoutTab } from "./types";

/** Used until the team sets defaults for new apps in the admin (11.9). */
export const BUILT_IN_APP_DEFAULTS: AppDefaultsSetting = {
  appearance: {
    template: "classic",
    theme_mode: "system",
    user_can_change_mode: true,
    font: "Bricolage Grotesque",
    corners: "soft",
    cards: "outlined",
  },
  languages: { default: "en", available: ["en"] },
};

/**
 * The look an app starts with: the admin's defaults, with the template and
 * font the client picked in the Branding step once they've done it, so the
 * look matches their build.
 */
export function defaultAppearance(app: Pick<App, "template" | "font" | "brandingDoneAt">, defaults: AppDefaultsSetting): Appearance {
  const appearance: Appearance = { ...defaults.appearance, secondary_color: null };
  if (app.brandingDoneAt) {
    appearance.template = app.template;
    if ((APP_FONTS as readonly string[]).includes(app.font)) appearance.font = app.font as Appearance["font"];
  }
  return appearance;
}

let counter = 0;
/** A short ID for a new block or tab. */
export function newBlockId(prefix = "b"): string {
  counter = (counter + 1) % 1296;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36).padStart(2, "0")}${Math.floor(Math.random() * 1296).toString(36)}`;
}

function welcome(name: string): LayoutBlock {
  return { id: "welcome", type: "text", visibility: "everyone", title: null, html: `<h2>Welcome to ${escape(name)}</h2>` };
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

const tab = (id: string, label: string, icon: string, target: LayoutTab["target"]): LayoutTab => ({ id, label, icon, target });

/** A sensible first layout for the app's type: a home page and the usual tabs. */
export function defaultLayout(app: Pick<App, "appType" | "backend" | "appName" | "template" | "font" | "brandingDoneAt">, defaults: AppDefaultsSetting, now: Date): LayoutContent {
  const name = app.appName ?? "our app";
  const updated = now.toISOString();
  const home = (blocks: LayoutBlock[]) => [{ slug: "home", title: "Home", show_title: false, updated_at: updated, blocks }];
  const base = {
    appearance: defaultAppearance(app, defaults),
    languages: { default: defaults.languages.default, available: [...defaults.languages.available] },
  };
  const homeTab = tab("home", "Home", "home", { type: "page", page_slug: "home" });
  const accountTab = tab("account", "Account", "person", { type: "screen", screen: "account" });
  switch (app.appType as string) {
    case "lms":
      return {
        ...base,
        tabs: [homeTab, tab("courses", "Courses", "school", { type: "screen", screen: "courses" }), tab("learning", "My courses", "menu_book", { type: "screen", screen: "my_courses" }), accountTab],
        pages: home([
          welcome(name),
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
            query: { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] },
          },
          { id: "categories", type: "categories", visibility: "everyone", title: "Categories", source: "courses", style: "chips" },
        ]),
      };
    case "store":
      return {
        ...base,
        tabs: [
          homeTab,
          tab("shop", "Shop", "storefront", { type: "screen", screen: "search" }),
          tab("cart", "Cart", "shopping_cart", { type: "screen", screen: "cart" }),
          accountTab,
        ],
        pages: home([
          welcome(name),
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
            query: { category_id: null, featured: true, sort: "newest", limit: 6, ids: [] },
          },
          {
            id: "new-products",
            type: "items",
            visibility: "everyone",
            title: "New arrivals",
            source: "products",
            layout: "carousel",
            see_all: { type: "screen", screen: "search" },
            query: { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] },
          },
        ]),
      };
    case "real_estate":
      return {
        ...base,
        tabs: [
          homeTab,
          tab("search", "Search", "search", { type: "screen", screen: "search" }),
          tab("favorites", "Favorites", "favorite", { type: "screen", screen: "favorites" }),
          tab("messages", "Messages", "chat", { type: "screen", screen: "messages" }),
          accountTab,
        ],
        pages: home([
          welcome(name),
          { id: "search", type: "search", visibility: "everyone", title: null, source: "listings", placeholder: "Search properties" },
          {
            id: "new-listings",
            type: "items",
            visibility: "everyone",
            title: "New listings",
            source: "listings",
            layout: "list",
            see_all: { type: "screen", screen: "search" },
            query: { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] },
          },
        ]),
      };
    case "booking":
      return {
        ...base,
        tabs: [
          homeTab,
          tab("book", "Book", "calendar_month", { type: "screen", screen: "services" }),
          tab("appointments", "Appointments", "event", { type: "screen", screen: "appointments" }),
          accountTab,
        ],
        pages: home([
          welcome(name),
          {
            id: "services",
            type: "items",
            visibility: "everyone",
            title: "Our services",
            source: "services",
            layout: "list",
            see_all: { type: "screen", screen: "services" },
            query: { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] },
          },
        ]),
      };
    default:
      return { ...base, tabs: [homeTab, accountTab], pages: home([welcome(name)]) };
  }
}
