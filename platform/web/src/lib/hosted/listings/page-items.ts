import { assetUrl as publicAssetUrl } from "../../assets";
import { getStore } from "../../data";
import type { DataStore } from "../../data/store";
import type { Listing } from "../../data/types";
import { formatListingPrice } from "../../listings/json";
import { EMPTY_QUERY, LISTING_SORTS, searchListings, type ListingSort } from "../../listings/search";
import { areaSymbol, listingSettingsFor } from "../../listings/types";
import { itemWords, type ItemWords } from "../pages/item-words";

/** One card of a list block (`Item` in docs/api/openapi.yaml), from the "listings" source. */
export interface ListingItem {
  source: "listings";
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  price_label: string | null;
  badge: string | null;
  favorited: boolean;
  action: { type: "item"; item: { source: "listings"; id: string } };
}

export interface ListingItemsQuery {
  /** These listings, in this order (published ones only). */
  ids?: string[];
  /** A property type key, like "apartment". */
  category_id?: string | null;
  featured?: boolean;
  /** newest (default), price_asc, price_desc or area_desc. */
  sort?: string;
  limit: number;
}

const MAX_ITEMS = 30;

/**
 * The published listings a list block shows on a page of a Real estate app,
 * as `Item` cards. `userId` is the signed-in app user (for `favorited`).
 */
export async function listingPageItems(
  appId: string,
  userId: string | null,
  query: ListingItemsQuery,
  deps: { store?: DataStore; assetUrl?: (assetId: string) => string; lang?: string } = {},
): Promise<ListingItem[]> {
  const store = deps.store ?? (await getStore());
  const assetUrl = deps.assetUrl ?? publicAssetUrl;
  const app = await store.getAppById(appId);
  if (!app) return [];
  const limit = Math.max(0, Math.min(MAX_ITEMS, Math.floor(query.limit)));
  const published = (await store.listListings(appId)).filter((l) => l.status === "published");
  let list: Listing[];
  if (query.ids && query.ids.length > 0) {
    const byId = new Map(published.map((l) => [String(l.id), l]));
    list = query.ids.map((id) => byId.get(id)).filter((l): l is Listing => l !== undefined);
  } else {
    const sort = (LISTING_SORTS as readonly string[]).includes(query.sort ?? "") ? (query.sort as ListingSort) : "newest";
    list = searchListings(published, { ...EMPTY_QUERY, type: query.category_id || null, featured: query.featured === true, sort });
  }
  const user = userId !== null && /^\d+$/.test(userId) ? Number(userId) : null;
  const favorites = user !== null ? new Set((await store.listListingFavorites(appId, user)).map((f) => f.listingId)) : new Set<number>();
  const unit = areaSymbol(listingSettingsFor(app, await store.getListingSettings(appId)).areaUnit);
  return list.slice(0, limit).map((l) => listingItem(l, { assetUrl, favorites, unit, words: itemWords(deps.lang) }));
}

/** "Maadi · 185 m²" */
function subtitle(l: Listing, unit: string): string | null {
  const area = l.area !== null ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(l.area)} ${unit}` : null;
  return [l.district ?? l.city, area].filter(Boolean).join(" · ") || null;
}

function listingItem(l: Listing, ctx: { assetUrl: (assetId: string) => string; favorites: Set<number>; unit: string; words: ItemWords }): ListingItem {
  const price = formatListingPrice(l.priceCents, l.currency);
  const w = ctx.words;
  // 38 "/ month" and the badge in the app's language.
  const priceLabel = l.purpose === "rent" && l.pricePeriod === "month" ? w.perMonth(price) : l.purpose === "rent" && l.pricePeriod === "year" ? w.perYear(price) : price;
  const id = String(l.id);
  return {
    source: "listings",
    id,
    title: l.title,
    subtitle: subtitle(l, ctx.unit),
    image_url: l.imageAssetIds[0] ? ctx.assetUrl(l.imageAssetIds[0]) : null,
    price_label: priceLabel,
    badge: l.purpose === "rent" ? w.forRent : l.negotiable ? w.negotiable : w.forSale,
    favorited: ctx.favorites.has(l.id),
    action: { type: "item", item: { source: "listings", id } },
  };
}
