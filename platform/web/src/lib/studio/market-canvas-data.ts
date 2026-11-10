import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { MarketConnector } from "../hosted/connectors/market";
import { formatMinor } from "../market/currency";
import type { MarketCanvas, MarketCanvasKind, MarketCanvasVendor, MarketVendorKind } from "./market-canvas";

/**
 * The marketplace's home data for the editor's canvas, read the way the app
 * reads it (`marketHomeProvider`): the places from `GET /market/vendors`,
 * the offers from `GET /market/offers` and the cuisines from the config, as
 * a customer near the places sees them; and the last orders delivered, one
 * a place, to order again. Null for a project that isn't a marketplace.
 */

/** The offer cards' colours, one after another (`_offerColours`). */
const OFFER_COLOURS: readonly [string, string][] = [
  ["#FF8A3D", "#E4472B"],
  ["#2C6CDB", "#143B8F"],
  ["#2E9B62", "#156B43"],
  ["#8E5BD9", "#5A2EA6"],
];

interface VendorJson {
  id: number;
  kind: MarketVendorKind;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  categories: string[];
  rating: number | null;
  ratings_count: number;
  open: boolean;
  opens_at: string | null;
  busy: boolean;
  delivery_by: "app" | "vendor";
  delivery_minutes: { min: number; max: number } | null;
  delivery_fee: { amount: string; formatted: string } | null;
  min_order: { formatted: string } | null;
  distance_km: number | null;
  offer: string | null;
  club_benefit: string | null;
}

interface CouponJson {
  id: number;
  title: string;
  description: string | null;
  code: string | null;
  vendor_id: number | null;
}

/** "09:00" in the marketplace's time zone. */
function clock(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export function isMarketplace(app: Pick<App, "appType" | "vertical">): boolean {
  return app.appType === "food" && app.vertical === "marketplace";
}

export async function marketCanvasOf(app: App, deps: { store: DataStore; assetUrl: (id: string) => string; platformUrl: string }, now: Date): Promise<MarketCanvas | null> {
  if (!isMarketplace(app)) return null;
  const connector = new MarketConnector({ store: deps.store, app, assetUrl: deps.assetUrl, platformUrl: deps.platformUrl });
  const get = async <T>(path: string[], query: Record<string, string> = {}): Promise<T | null> => {
    try {
      const result = await connector.handle({ method: "GET", path, query: new URLSearchParams(query), body: undefined, user: null, now });
      return result.status === 200 ? (result.body as T) : null;
    } catch {
      return null;
    }
  };
  try {
    const [config, places] = await Promise.all([connector.config(), deps.store.listRestaurants(app.id)]);
    // A customer among the places: their times and fees show as near them.
    const located = places.flatMap((p) => (p.active && p.address?.lat != null && p.address.lng != null ? [{ lat: p.address.lat, lng: p.address.lng }] : []));
    const at = located.length ? { lat: located.reduce((s, p) => s + p.lat, 0) / located.length, lng: located.reduce((s, p) => s + p.lng, 0) / located.length } : null;
    const [vendorsPage, offersPage, orders] = await Promise.all([
      get<{ items: VendorJson[] }>(["market", "vendors"], { per_page: "40", ...(at ? { lat: String(at.lat), lng: String(at.lng) } : {}) }),
      get<{ items: CouponJson[] }>(["market", "offers"]),
      deps.store.listMarketOrders({ appId: app.id, statuses: ["delivered", "picked_up"], order: "newest", limit: 40, offset: 0 }).catch(() => ({ items: [], total: 0 })),
    ]);
    const categoryName = new Map(config.categories.map((c) => [c.id, c.name]));
    const items = vendorsPage?.items ?? [];
    const vendors: MarketCanvasVendor[] = items.map((v) => ({
      id: String(v.id),
      kind: v.kind,
      name: v.name,
      coverUrl: v.cover_url ?? "",
      logoUrl: v.logo_url ?? "",
      tags: v.categories.map((c) => categoryName.get(c) ?? c),
      rating: v.rating,
      ratings: v.ratings_count,
      etaMin: v.delivery_minutes?.min ?? null,
      etaMax: v.delivery_minutes?.max ?? null,
      deliveryFee: v.delivery_fee?.formatted ?? null,
      freeDelivery: v.delivery_fee !== null && Number(v.delivery_fee.amount) === 0,
      minOrder: v.min_order?.formatted ?? null,
      deliveredBy: v.delivery_by === "vendor" ? "vendor" : "app",
      state: !v.open && !v.busy ? "closed" : v.busy ? "busy" : "open",
      promo: v.offer,
      club: v.club_benefit !== null,
      clubBenefit: v.club_benefit,
      distanceKm: v.distance_km,
      opensAt: v.opens_at ? clock(v.opens_at, config.timezone) : null,
    }));
    // The kinds the app has, each with how many places and a picture: a category's, else a place's.
    const kinds: MarketCanvasKind[] = vendors.length
      ? config.kinds.map((kind) => {
          const mine = vendors.filter((v) => v.kind === kind);
          return { id: kind, kind, title: null, subtitle: null, places: mine.length, imageUrl: config.categories.find((c) => c.kind === kind && c.image_url)?.image_url ?? mine.find((v) => v.coverUrl)?.coverUrl ?? "", badge: null };
        })
      : [];
    const offers = (offersPage?.items ?? []).map((c, i) => {
      const [from, to] = OFFER_COLOURS[i % OFFER_COLOURS.length]!;
      const vendor = c.vendor_id === null ? null : items.find((v) => v.id === c.vendor_id);
      return { id: String(c.id), title: c.title, text: c.description ?? vendor?.name ?? "", imageUrl: vendor?.cover_url ?? "", from, to, code: c.code };
    });
    const cuisines = [...config.categories.filter((c) => c.kind === "restaurant"), ...config.categories.filter((c) => c.kind !== "restaurant")].map((c) => ({ id: c.id, name: c.name, imageUrl: c.image_url ?? "" }));
    const seen = new Set<number>();
    const reorders = [];
    for (const o of orders.items) {
      const vendor = o.vendorId === null ? null : vendors.find((v) => v.id === String(o.vendorId));
      if (!vendor || seen.has(o.vendorId!) || seen.size >= 6) continue;
      seen.add(o.vendorId!);
      reorders.push({ vendor: { id: vendor.id, name: vendor.name, logoUrl: vendor.logoUrl }, summary: o.lines.map((l) => l.name).join(" · "), total: formatMinor(o.money.total, o.currency), when: null, at: o.createdAt.toISOString() });
    }
    return { address: null, kinds, offers, cuisines, vendors, reorders };
  } catch {
    // The canvas shows the app's samples instead.
    return null;
  }
}
