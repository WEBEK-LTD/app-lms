import type { App } from "../data/types";
import type { ImportKind } from "./plan";

/** 81.4 What an app imports: a shop's (or a restaurant's menu) products, a bookings app's services, an academy's courses; null for apps whose content comes from elsewhere. */
export function importKindOf(app: Pick<App, "connector">): ImportKind | null {
  switch (app.connector?.kind) {
    case "catalog":
      return "products";
    case "bookings":
      return "services";
    case "courses":
      return "courses";
    default:
      return null;
  }
}
