import type { Action, ItemSource, ItemsQuery } from "../../pages/types";

/** One card in a list block (`Item` in docs/api/openapi.yaml), the same shape for every source. */
export interface Item {
  source: ItemSource;
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  price_label?: string | null;
  badge?: string | null;
  favorited?: boolean;
  action?: Action;
}

export interface ItemSourceContext {
  appId: string;
  /** The signed-in customer, as a string, or null. */
  userId: string | null;
  /** The language the app asked for (already one the app has turned on). */
  lang: string;
}

export type ItemResolver = (ctx: ItemSourceContext, query: ItemsQuery) => Promise<Item[]>;

/**
 * Lists the hosted API fills from the platform's own data, by source (for
 * example `listings` for Real estate apps). Courses and products come from
 * the app's connector instead. A list block whose source has no resolver is
 * left out of the page.
 */
const resolvers = new Map<ItemSource, ItemResolver>();

export function registerItemSource(source: ItemSource, resolver: ItemResolver): void {
  resolvers.set(source, resolver);
}

export function itemResolver(source: ItemSource): ItemResolver | null {
  return resolvers.get(source) ?? null;
}

/** For tests. */
export function unregisterItemSource(source: ItemSource): void {
  resolvers.delete(source);
}
