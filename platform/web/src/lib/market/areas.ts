import type { DeliverySettings, MarketServiceArea, Restaurant } from "../data/types";
import { coordinatesIn } from "../delivery/locate";
import { distanceKm } from "../delivery/pricing";
import { DELIVERY_LIMITS } from "../delivery/settings";
import type { Parsed } from "./delivery-forms";

/**
 * 115 Where a marketplace delivers. Every place sets where it delivers, as
 * food and grocery apps do: by distance (a radius from its address) or by
 * area (some of the marketplace's named areas). The app owner may leave the
 * marketplace open everywhere (no named areas) or name the areas it serves:
 * then a customer outside all of them is outside every place's area. A
 * customer outside a place's area sees "outside delivery area" instead of a
 * time and a fee, and may still pick up where the place offers it.
 */

/** A place saved before places had to set an area: a radius of 10 km from its address, until it sets one. */
export const LEGACY_VENDOR_KM = 10;

export const AREA_LIMITS = {
  /** A place's radius. */
  minKm: 0.5,
  maxKm: DELIVERY_LIMITS.maxKm,
  /** The owner's named areas. */
  areas: 60,
  name: 60,
  areaMinKm: 0.5,
  areaMaxKm: 200,
} as const;

export type VendorArea =
  /** `legacy`: saved before places had to set an area (or its areas were all removed), taken as `LEGACY_VENDOR_KM`. */
  | { kind: "km"; km: number; legacy: boolean }
  | { kind: "areas"; areas: MarketServiceArea[] };

/** The marketplace's named areas, in the owner's order; none: open everywhere. */
export function serviceAreasOf(settings: Pick<DeliverySettings, "marketApp">): MarketServiceArea[] {
  return settings.marketApp?.serviceAreas ?? [];
}

/** Where a place delivers: the areas it chose that the marketplace still has, else its radius, else 10 km. */
export function vendorAreaOf(vendor: Pick<Restaurant, "maxKm"> & Partial<Pick<Restaurant, "deliveryAreas">>, owned: MarketServiceArea[]): VendorArea {
  const ids = vendor.deliveryAreas ?? [];
  const areas = owned.filter((a) => ids.includes(a.id));
  if (areas.length) return { kind: "areas", areas };
  if (vendor.maxKm !== null && !ids.length) return { kind: "km", km: vendor.maxKm, legacy: false };
  return { kind: "km", km: vendor.maxKm ?? LEGACY_VENDOR_KM, legacy: true };
}

export function insideArea(area: Pick<MarketServiceArea, "lat" | "lng" | "km">, at: { lat: number; lng: number }): boolean {
  return distanceKm({ lat: area.lat, lng: area.lng }, at) <= area.km;
}

export type AreaCheck =
  | { ok: true }
  /** `marketplace`: outside every one of the owner's areas; `vendor`: outside the place's; `no_position`: the place's address isn't on the map, so its distance can't be known. */
  | { ok: false; reason: "marketplace" | "vendor" | "no_position"; error: string; limit?: number };

/** Whether the place delivers to `at`: inside the marketplace's areas (when it has any), then inside the place's own. */
export function checkDeliveryArea(settings: Pick<DeliverySettings, "marketApp">, vendor: Pick<Restaurant, "address" | "maxKm"> & Partial<Pick<Restaurant, "deliveryAreas">>, at: { lat: number; lng: number }): AreaCheck {
  const owned = serviceAreasOf(settings);
  if (owned.length && !owned.some((a) => insideArea(a, at))) return { ok: false, reason: "marketplace", error: "The app doesn't deliver to your address yet." };
  const area = vendorAreaOf(vendor, owned);
  if (area.kind === "areas") {
    return area.areas.some((a) => insideArea(a, at)) ? { ok: true } : { ok: false, reason: "vendor", error: `This place delivers to ${area.areas.map((a) => a.name).join(", ")} only.` };
  }
  const from = vendor.address;
  if (from.lat === null || from.lng === null) return { ok: false, reason: "no_position", error: "This place can't deliver yet: its address isn't on the map." };
  const km = distanceKm({ lat: from.lat, lng: from.lng }, at);
  if (km > area.km) return { ok: false, reason: "vendor", error: `This place delivers up to ${area.km} km. You are ${km} km away.`, limit: area.km };
  return { ok: true };
}

/** What the owner or the place should fix about its area, where it's edited: none set yet (taken as 10 km), or no place on the map to measure from. */
export function vendorAreaWarning(vendor: Pick<Restaurant, "address" | "maxKm"> & Partial<Pick<Restaurant, "deliveryAreas">>, owned: MarketServiceArea[]): "set_area" | "no_position" | null {
  const area = vendorAreaOf(vendor, owned);
  if (area.kind === "km" && area.legacy) return "set_area";
  if (area.kind === "km" && (vendor.address.lat === null || vendor.address.lng === null)) return "no_position";
  return null;
}

// The place's form: `area_kind` ("km" or "areas"), `area_km`, and `area-<id>` for each of the owner's areas.

const on = (v: string | undefined) => v === "on" || v === "true" || v === "1";

/** A place's area from its form (the dashboard, the places' panel, accepting an application). */
export function parseVendorAreaForm(form: Record<string, string>, owned: MarketServiceArea[]): Parsed<Pick<Restaurant, "maxKm" | "deliveryAreas">> {
  const kind = form.area_kind === "areas" && owned.length ? "areas" : form.area_kind === "km" ? "km" : null;
  if (!kind) return { ok: false, field: "area_kind", error: "Choose where it delivers: up to a distance from its address, or in some of the areas." };
  if (kind === "areas") {
    const ids = owned.filter((a) => on(form[`area-${a.id}`])).map((a) => a.id);
    if (!ids.length) return { ok: false, field: "area_kind", error: "Choose at least one area it delivers to." };
    return { ok: true, value: { maxKm: null, deliveryAreas: ids } };
  }
  const n = Number((form.area_km ?? "").trim().replaceAll(",", "."));
  if (!(form.area_km ?? "").trim() || !Number.isFinite(n) || n < AREA_LIMITS.minKm || n > AREA_LIMITS.maxKm) {
    return { ok: false, field: "area_km", error: `Enter how far it delivers, from ${AREA_LIMITS.minKm} to ${AREA_LIMITS.maxKm} km.` };
  }
  return { ok: true, value: { maxKm: Math.round(n * 10) / 10, deliveryAreas: null } };
}

/** A place's area as its form shows it again; a place without one starts at "by distance", its radius empty. */
export function vendorAreaFormValues(vendor: Pick<Restaurant, "maxKm"> & Partial<Pick<Restaurant, "deliveryAreas">>, owned: MarketServiceArea[]): Record<string, string> {
  const area = vendorAreaOf(vendor, owned);
  const out: Record<string, string> = { area_kind: area.kind, area_km: area.kind === "km" && !area.legacy ? String(area.km) : "" };
  if (area.kind === "areas") for (const a of area.areas) out[`area-${a.id}`] = "on";
  return out;
}

// The owner's named areas (Studio › Marketplace settings): a name, a centre on the map and a radius.

/** One named area from the settings' form: `area_name`, `area_map` (a Google Maps link or coordinates) and `area_radius`. */
export function parseServiceAreaForm(form: Record<string, string>, owned: MarketServiceArea[], newId: () => string): Parsed<MarketServiceArea> {
  if (owned.length >= AREA_LIMITS.areas) return { ok: false, field: "area_name", error: `You can name up to ${AREA_LIMITS.areas} areas.` };
  const name = (form.area_name ?? "").replace(/\s+/g, " ").trim();
  if (!name || name.length > AREA_LIMITS.name) return { ok: false, field: "area_name", error: `Name the area in up to ${AREA_LIMITS.name} characters, like Dokki.` };
  if (owned.some((a) => a.name.toLowerCase() === name.toLowerCase())) return { ok: false, field: "area_name", error: `There's an area called ${name} already.` };
  const at = coordinatesIn((form.area_map ?? "").trim());
  if (!at) return { ok: false, field: "area_map", error: "Paste the area's centre from Google Maps, or its coordinates like 30.0444, 31.2357." };
  const km = Number((form.area_radius ?? "").trim().replaceAll(",", "."));
  if (!(form.area_radius ?? "").trim() || !Number.isFinite(km) || km < AREA_LIMITS.areaMinKm || km > AREA_LIMITS.areaMaxKm) {
    return { ok: false, field: "area_radius", error: `Enter the area's radius from ${AREA_LIMITS.areaMinKm} to ${AREA_LIMITS.areaMaxKm} km.` };
  }
  return { ok: true, value: { id: newId(), name, lat: Math.round(at.lat * 1e6) / 1e6, lng: Math.round(at.lng * 1e6) / 1e6, km: Math.round(km * 10) / 10 } };
}
