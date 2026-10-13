import type { Listing, ListingPurpose } from "../data/types";
import { PROPERTY_TYPES, propertyTypeLabel } from "./types";

/** Search, filters and order of the published listings (GET /listings, list blocks). */

export const LISTING_SORTS = ["newest", "price_asc", "price_desc", "area_desc"] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

export interface ListingQuery {
  search: string;
  purpose: ListingPurpose | null;
  type: string | null;
  city: string | null;
  district: string | null;
  /** In cents. */
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  featured: boolean;
  sort: ListingSort;
}

export const EMPTY_QUERY: ListingQuery = {
  search: "",
  purpose: null,
  type: null,
  city: null,
  district: null,
  minPrice: null,
  maxPrice: null,
  minArea: null,
  maxArea: null,
  bedrooms: null,
  bathrooms: null,
  featured: false,
  sort: "newest",
};

/** Lowercase without accents, so "Şişli" matches "sisli" and "İzmir" matches "izmir". */
export function fold(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").replace(/ı/g, "i").toLowerCase();
}

/** The query of GET /listings, or the reason it isn't valid. */
export function parseListingQuery(params: URLSearchParams): ListingQuery | { error: string } {
  const text = (name: string) => (params.get(name) ?? "").trim();
  const number = (name: string, integer: boolean): number | null | undefined => {
    const raw = text(name);
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) return undefined;
    return value;
  };
  const search = text("search");
  if (search.length > 100) return { error: "The search is too long." };
  const purpose = text("purpose") || null;
  if (purpose !== null && purpose !== "sale" && purpose !== "rent") return { error: "Unknown purpose." };
  const sort = text("sort") || "newest";
  if (!(LISTING_SORTS as readonly string[]).includes(sort)) return { error: "Unknown sort." };
  const values = {
    minPrice: number("min_price", false),
    maxPrice: number("max_price", false),
    minArea: number("min_area", false),
    maxArea: number("max_area", false),
    bedrooms: number("bedrooms", true),
    bathrooms: number("bathrooms", true),
  };
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) return { error: `${name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)} must be a number of 0 or more.` };
  }
  const featured = text("featured");
  if (featured && !["true", "false", "1", "0"].includes(featured)) return { error: "featured must be true or false." };
  const cents = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v * 100));
  return {
    search,
    purpose,
    type: text("type") || null,
    city: text("city") || null,
    district: text("district") || null,
    minPrice: cents(values.minPrice),
    maxPrice: cents(values.maxPrice),
    minArea: values.minArea ?? null,
    maxArea: values.maxArea ?? null,
    bedrooms: values.bedrooms ?? null,
    bathrooms: values.bathrooms ?? null,
    featured: featured === "true" || featured === "1",
    sort: sort as ListingSort,
  };
}

function haystack(l: Listing): string {
  return fold([l.title, l.description.replace(/<[^>]*>/g, " "), l.city, l.district, l.address, l.reference, propertyTypeLabel(l.type)].filter(Boolean).join(" "));
}

/** The listings that match every filter and every word of the search. */
export function filterListings(listings: Listing[], q: ListingQuery): Listing[] {
  const words = fold(q.search).split(/\s+/).filter(Boolean);
  const city = q.city ? fold(q.city) : null;
  const district = q.district ? fold(q.district) : null;
  return listings.filter(
    (l) =>
      (!q.purpose || l.purpose === q.purpose) &&
      (!q.type || l.type === q.type) &&
      (!city || fold(l.city) === city) &&
      (!district || (l.district !== null && fold(l.district) === district)) &&
      (q.minPrice === null || l.priceCents >= q.minPrice) &&
      (q.maxPrice === null || l.priceCents <= q.maxPrice) &&
      (q.minArea === null || (l.area !== null && l.area >= q.minArea)) &&
      (q.maxArea === null || (l.area !== null && l.area <= q.maxArea)) &&
      (q.bedrooms === null || (l.bedrooms !== null && l.bedrooms >= q.bedrooms)) &&
      (q.bathrooms === null || (l.bathrooms !== null && l.bathrooms >= q.bathrooms)) &&
      (!q.featured || l.featured) &&
      (words.length === 0 || words.every((w) => haystack(l).includes(w))),
  );
}

const newest = (a: Listing, b: Listing) => (b.publishedAt ?? b.createdAt).getTime() - (a.publishedAt ?? a.createdAt).getTime() || b.id - a.id;

export function sortListings(listings: Listing[], sort: ListingSort): Listing[] {
  const list = [...listings];
  switch (sort) {
    case "price_asc":
      return list.sort((a, b) => a.priceCents - b.priceCents || newest(a, b));
    case "price_desc":
      return list.sort((a, b) => b.priceCents - a.priceCents || newest(a, b));
    case "area_desc":
      // Listings without an area go last.
      return list.sort((a, b) => (b.area ?? -1) - (a.area ?? -1) || newest(a, b));
    default:
      return list.sort(newest);
  }
}

export function searchListings(published: Listing[], q: ListingQuery): Listing[] {
  return sortListings(filterListings(published, q), q.sort);
}

/** Listings like this one: the same type in the same city first, then the same type or city. */
export function similarListings(listing: Listing, published: Listing[], max = 8): Listing[] {
  const city = fold(listing.city);
  const score = (l: Listing) => (l.type === listing.type ? 2 : 0) + (fold(l.city) === city ? 1 : 0) + (l.purpose === listing.purpose ? 0.5 : 0);
  return sortListings(published, "newest")
    .filter((l) => l.id !== listing.id && (l.type === listing.type || fold(l.city) === city))
    .sort((a, b) => score(b) - score(a))
    .slice(0, max);
}

const cents = (c: number) => c / 100;

/** `ListingFilters`: what the published listings offer. */
export function listingFilters(published: Listing[]) {
  const cities = new Map<string, { name: string; count: number; districts: Set<string> }>();
  // "cairo" and "Cairo" are one city, shown capitalised when any listing writes it so.
  const capitalised = (name: string) => name.charAt(0) !== name.charAt(0).toLowerCase();
  for (const l of published) {
    const key = fold(l.city);
    const entry = cities.get(key) ?? { name: l.city, count: 0, districts: new Set<string>() };
    if (!capitalised(entry.name) && capitalised(l.city)) entry.name = l.city;
    entry.count += 1;
    if (l.district) entry.districts.add(l.district);
    cities.set(key, entry);
  }
  const prices = published.map((l) => l.priceCents);
  const areas = published.map((l) => l.area).filter((a): a is number => a !== null);
  return {
    purposes: (["sale", "rent"] as const).filter((p) => published.some((l) => l.purpose === p)),
    types: PROPERTY_TYPES.map((t) => ({ key: t.key, label: t.label, count: published.filter((l) => l.type === t.key).length })).filter((t) => t.count > 0),
    cities: [...cities.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((c) => ({ name: c.name, count: c.count, districts: [...c.districts].sort((a, b) => a.localeCompare(b)) })),
    price: { min: prices.length ? cents(Math.min(...prices)) : 0, max: prices.length ? cents(Math.max(...prices)) : 0 },
    area: { min: areas.length ? Math.min(...areas) : 0, max: areas.length ? Math.max(...areas) : 0 },
    bedrooms_max: Math.max(0, ...published.map((l) => l.bedrooms ?? 0)),
  };
}

