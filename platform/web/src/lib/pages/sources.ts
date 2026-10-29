import { ENGINES, hostedOnly, isAppType, kindOf } from "../app/kinds";
import type { App } from "../data/types";
import { blockActions } from "./block-actions";
import { SCREEN_LABELS } from "./labels";
import { SCREENS, type Action, type BlockType, type ItemSource, type ItemsSort, type LayoutBlock, type ScreenName } from "./types";

/**
 * Which lists an app's pages can show: its engine's (lib/app/kinds.ts), and
 * blog posts from a WordPress site or own API (never on the hosted API, nor
 * for engines that only run there). 23 News & blog apps list their posts as
 * articles, opened in the app, so they don't list them twice.
 */
export function itemSourcesFor(app: Pick<App, "appType" | "backend">): ItemSource[] {
  const known = isAppType(app.appType);
  const sources: ItemSource[] = known ? [ENGINES[app.appType].pages.source] : [];
  if (app.backend !== "hosted" && !(known && hostedOnly(app.appType)) && !sources.includes("articles")) sources.push("posts");
  return sources;
}

/** Sources with categories the app can show (29 campaigns have none). */
export function categorySourcesFor(app: Pick<App, "appType" | "backend">): ItemSource[] {
  return itemSourcesFor(app).filter((s) => s !== "listings" && s !== "campaigns" && s !== "delivery_services" && s !== "restaurants" && s !== "vehicle_types");
}

/** 29 Sources the app can search: campaigns are a short list, without a search. */
export function searchSourcesFor(app: Pick<App, "appType" | "backend">): ItemSource[] {
  return itemSourcesFor(app).filter((s) => s !== "campaigns" && s !== "delivery_services" && s !== "restaurants" && s !== "vehicle_types");
}

/** Block types the app's pages can use. */
export function blockTypesFor(app: Pick<App, "appType" | "backend">): BlockType[] {
  const sources = itemSourcesFor(app);
  const types: BlockType[] = ["banner", "slider", "text", "image", "video", "button", "notice"];
  if (sources.length) types.push("items");
  if (searchSourcesFor(app).length) types.push("search");
  if (categorySourcesFor(app).length) types.push("categories");
  if (isAppType(app.appType)) types.push(...ENGINES[app.appType].pages.blocks);
  // 33 The general blocks every app has: none of them reads the app's content.
  types.push("quick_links", "team", "stats", "testimonials", "faq", "countdown", "contact", "hours", "social", "embed", "spacer");
  // 99.4
  types.push("cards", "gallery", "map", "form", "divider");
  return types;
}

export const SOURCE_NAMES: Record<ItemSource, string> = {
  courses: "Courses",
  products: "Products",
  services: "Services",
  posts: "Blog posts",
  listings: "Listings",
  articles: "Articles",
  events: "Events",
  campaigns: "Campaigns",
  delivery_services: "Delivery services",
  restaurants: "Restaurants",
  vehicle_types: "Vehicle types",
};

// 31 Screens and orders per app

/** A screen the editor offers, by its name in this app. `alias`: an older name the app opens as another screen, kept when a layout has it. */
export interface ScreenOption {
  value: ScreenName;
  label: string;
  alias?: true;
}

/**
 * The screens the app opens (lib/app/kinds.ts, from its Flutter module), then
 * the older names it also opens. 105.3 Some kinds open more than their engine
 * (an academy with many teachers: its teachers and the Teacher tab).
 */
export function screenOptionsFor(app: Pick<App, "appType" | "vertical">): ScreenOption[] {
  if (!isAppType(app.appType)) return SCREENS.map((value) => ({ value, label: SCREEN_LABELS[value] }));
  const pages = ENGINES[app.appType].pages;
  const label = (screen: ScreenName) => pages.screenLabels?.[screen] ?? SCREEN_LABELS[screen];
  return [
    ...pages.screens.map((value) => ({ value, label: label(value) })),
    ...(kindOf(app).screens ?? []).map((value) => ({ value, label: label(value) })),
    ...(Object.entries(pages.aliases) as [ScreenName, ScreenName][]).map(([value, to]) => ({ value, label: label(to), alias: true as const })),
  ];
}

/** Whether the app can open a screen. */
export function appOpensScreen(app: Pick<App, "appType" | "vertical">, screen: unknown): screen is ScreenName {
  return screenOptionsFor(app).some((o) => o.value === screen);
}

/** A screen's name for messages, also for one the app doesn't have. */
export function screenName(screen: string): string {
  return (SCREEN_LABELS as Record<string, string>)[screen] ?? screen;
}

/**
 * What's wrong with a tap action in this app, as the editor shows it next to
 * the tab or block (a layout from before the app's type changed still loads),
 * or null. Publishing refuses the same (lib/pages/validate.ts).
 */
export function actionProblem(action: Action | null | undefined, screens: readonly ScreenOption[], sources: readonly ItemSource[]): string | null {
  if (action?.type === "screen" && !screens.some((s) => s.value === action.screen)) {
    return `This app has no "${screenName(action.screen ?? "")}" screen. Choose another screen.`;
  }
  if (action?.type === "course" && !sources.includes("courses")) return "This app has no courses. Choose what happens on tap.";
  return null;
}

/** The first problem with a block's tap actions (33 its entries' too), or null. */
export function blockProblem(block: LayoutBlock, screens: readonly ScreenOption[], sources: readonly ItemSource[]): string | null {
  for (const action of blockActions(block)) {
    const problem = actionProblem(action, screens, sources);
    if (problem) return problem;
  }
  return null;
}

/**
 * The orders a list block offers for each source, as the plugin and the
 * hosted API sort them: by price only where entries have one; articles and
 * blog posts newest or most read; events always soonest first and campaigns
 * in the dashboard's order, so those offer no choice.
 */
export const SOURCE_SORTS: Record<ItemSource, readonly ItemsSort[]> = {
  courses: ["newest", "popular", "price_asc", "price_desc"],
  products: ["newest", "popular", "price_asc", "price_desc"],
  services: ["newest", "price_asc", "price_desc"],
  posts: ["newest", "popular"],
  listings: ["newest", "price_asc", "price_desc"],
  articles: ["newest", "popular"],
  events: ["newest"],
  campaigns: ["newest"],
  // 104 In the company's order.
  delivery_services: ["newest"],
  // 105.1 Open ones first, in the company's order.
  restaurants: ["newest"],
  // 105.2 In the company's order.
  vehicle_types: ["newest"],
};

/** The list's order, or the first one when the source can't be sorted that way. */
export function sortFor(source: ItemSource, sort: ItemsSort): ItemsSort {
  return SOURCE_SORTS[source].includes(sort) ? sort : "newest";
}

/** What a List block can show in this app, for the block picker: "Courses or blog posts". */
export function listHint(sources: readonly ItemSource[]): string {
  const names = sources.map((s, i) => (i === 0 ? SOURCE_NAMES[s] : SOURCE_NAMES[s].toLowerCase()));
  if (names.length === 0) return "Entries from your app";
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}
