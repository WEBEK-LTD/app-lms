import { ENGINES, hostedOnly, isAppType } from "../app/kinds";
import type { App } from "../data/types";
import type { BlockType, ItemSource } from "./types";

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

/** Sources with categories the app can show. */
export function categorySourcesFor(app: Pick<App, "appType" | "backend">): ItemSource[] {
  return itemSourcesFor(app).filter((s) => s !== "listings");
}

/** Block types the app's pages can use. */
export function blockTypesFor(app: Pick<App, "appType" | "backend">): BlockType[] {
  const sources = itemSourcesFor(app);
  const types: BlockType[] = ["banner", "text", "image", "video", "button"];
  if (sources.length) types.push("items", "search");
  if (categorySourcesFor(app).length) types.push("categories");
  if (isAppType(app.appType)) types.push(...ENGINES[app.appType].pages.blocks);
  types.push("embed", "spacer");
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
};
