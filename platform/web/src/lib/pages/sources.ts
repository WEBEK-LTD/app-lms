import type { App } from "../data/types";
import type { BlockType, ItemSource } from "./types";

/**
 * Which lists an app's pages can show. Services come from a bookings plugin or
 * hosted bookings; posts from a WordPress site only;
 * listings are hosted only (Real estate apps).
 */
const BY_APP_TYPE: Record<string, ItemSource[]> = {
  lms: ["courses"],
  store: ["products"],
  booking: ["services"],
  real_estate: ["listings"],
};

export function itemSourcesFor(app: Pick<App, "appType" | "backend">): ItemSource[] {
  const sources = [...(BY_APP_TYPE[app.appType] ?? [])];
  if (app.backend !== "hosted" && (app.appType as string) !== "real_estate") sources.push("posts");
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
  if (app.appType === "lms") types.push("continue_learning");
  types.push("embed", "spacer");
  return types;
}

export const SOURCE_NAMES: Record<ItemSource, string> = {
  courses: "Courses",
  products: "Products",
  services: "Services",
  posts: "Blog posts",
  listings: "Listings",
};
