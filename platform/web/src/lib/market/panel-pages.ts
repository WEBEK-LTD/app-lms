import type { DataStore } from "../data/store";
import type { App, MarketProduct, MarketServiceArea, OpeningPeriod, Restaurant, RestaurantStaff, VendorClosedDates, VendorRole } from "../data/types";
import { EMPTY_MENU } from "../food/menu";
import { parseHoursForm, WEEK_DAYS } from "../food/forms";
import { utcToLocal } from "../bookings/time";
import { upcomingClosedDates } from "./vendor-controls";
import { deliverySettingsOf } from "../delivery/settings";
import { parseVendorAreaForm, serviceAreasOf, vendorAreaFormValues, vendorAreaWarning } from "./areas";
import { planCatalogImport, suggestMapping, vendorProducts, applyCatalogImport, type CatalogPlan } from "./catalog-import";
import { complaintAdjustment, vendorComplaintView } from "./complaints";
import { parseVendorDeliveryForm, vendorDeliveryFormValues } from "./delivery-forms";
import { vendorDelivery } from "./delivery";
import { marketOrderReference } from "./json";
import { marketCurrency, marketSettingsOf, marketTimezone } from "./settings";
import { addPhoto, fetchWaitingPhotos, photosRequired, placeBulkPhoto, productPhotos, removePhoto, type BulkPhotoOutcome, type PhotoFetcher, type PhotoResult } from "./photos";
import { readSheet, SheetError } from "./sheets/read";
import { buildStatement, type Statement } from "./statement";

/**
 * 115.7 The vendors' web panel's pages besides the live board: the menu or
 * catalog and its stock, imports, delivery settings, staff, statements and
 * the complaints about the vendor's orders (to read only). Each reads and
 * changes the signed-in staff member's own vendor only, by their role:
 * everything (owner), all but staff (manager), orders and stock (orders),
 * picking only (picker).
 */

export type PanelTab = "orders" | "catalog" | "import" | "delivery" | "hours" | "offers" | "staff" | "statements" | "complaints";

const ROLE_TABS: Record<VendorRole, PanelTab[]> = {
  // 115.18 Offers: the place's own coupons, made by its owner and managers only.
  // 115.20 Hours: its weekly hours, days off and preparation time, by its owner and managers only (lib/market/vendor-controls.ts).
  owner: ["orders", "catalog", "import", "delivery", "hours", "offers", "staff", "statements", "complaints"],
  manager: ["orders", "catalog", "import", "delivery", "hours", "offers", "statements", "complaints"],
  orders: ["orders", "catalog", "complaints"],
  picker: ["orders"],
};

export function tabsFor(role: VendorRole | undefined): PanelTab[] {
  return ROLE_TABS[role ?? "manager"];
}

export function can(staff: RestaurantStaff, tab: PanelTab): boolean {
  return tabsFor(staff.role).includes(tab);
}

export interface PanelContext {
  store: DataStore;
  app: App;
  staff: RestaurantStaff;
  vendor: Restaurant;
  currency: string;
  timezone: string;
  /** 115 Products without a photo are hidden from customers (the app's setting). */
  photosRequired: boolean;
  /** 115 The marketplace's named areas, for delivering by area. */
  serviceAreas?: MarketServiceArea[];
}

export async function panelContext(store: DataStore, app: App, staff: RestaurantStaff): Promise<PanelContext | null> {
  const vendor = await store.getRestaurant(app.id, staff.restaurantId);
  if (!vendor || !vendor.active || vendor.appId !== app.id) return null;
  const delivery = deliverySettingsOf(await store.getDeliverySettings(app.id));
  return { store, app, staff, vendor, currency: marketCurrency(delivery), timezone: marketTimezone(delivery), photosRequired: photosRequired(marketSettingsOf(delivery)), serviceAreas: serviceAreasOf(delivery) };
}

// The catalog

export interface CatalogItem {
  id: number;
  name: string;
  section: string;
  price: number;
  unit: string;
  inStock: boolean;
  stock: number | null;
  sku: string | null;
  /** The main photo's asset ID; null without one. */
  image: string | null;
  /** 115 All the photos' asset IDs, the main one first (products may have more than one). */
  photos: string[];
  /** 115 A picture link from an import still being fetched, or why it couldn't be. */
  photoNote: string | null;
}

export async function catalogPage(
  ctx: PanelContext,
  input: { q: string; page: number; outOfStock: boolean; noPhoto?: boolean },
): Promise<{ items: CatalogItem[]; total: number; perPage: number; withoutPhoto: number }> {
  const perPage = 30;
  const q = input.q.trim().toLowerCase();
  if ((ctx.vendor.kind ?? "restaurant") === "restaurant") {
    const menu = (await ctx.store.getRestaurantMenu(ctx.app.id, ctx.vendor.id)) ?? EMPTY_MENU;
    const all: CatalogItem[] = menu.sections.flatMap((s) =>
      s.dishes.map((d) => ({ id: d.id, name: d.name, section: s.name, price: d.priceCents, unit: "item", inStock: d.available, stock: null, sku: null, image: d.imageAssetId, photos: d.imageAssetId ? [d.imageAssetId] : [], photoNote: null })),
    );
    const hits = all.filter((d) => (!q || d.name.toLowerCase().includes(q)) && (!input.outOfStock || !d.inStock) && (!input.noPhoto || !d.image));
    return { items: hits.slice((input.page - 1) * perPage, input.page * perPage), total: hits.length, perPage, withoutPhoto: all.filter((d) => !d.image).length };
  }
  const [found, departments, missing] = await Promise.all([
    ctx.store.listMarketProducts({ appId: ctx.app.id, vendorId: ctx.vendor.id, ...(q ? { q } : {}), ...(input.outOfStock ? { outOfStock: true } : {}), ...(input.noPhoto ? { withoutPhoto: true } : {}), page: input.page, perPage }),
    ctx.store.listMarketDepartments(ctx.app.id, ctx.vendor.id),
    ctx.store.listMarketProducts({ appId: ctx.app.id, vendorId: ctx.vendor.id, withoutPhoto: true, page: 1, perPage: 1 }),
  ]);
  const dept = new Map(departments.map((d) => [d.id, d.name]));
  return {
    items: found.items.map((p: MarketProduct) => ({
      id: p.id,
      name: p.name,
      section: p.departmentId ? (dept.get(p.departmentId) ?? "") : "",
      price: p.price,
      unit: p.unit,
      inStock: p.inStock && (p.stock === null || p.stock > 0),
      stock: p.stock,
      sku: p.sku,
      image: p.imageAssetId,
      photos: productPhotos(p),
      photoNote: !p.imageAssetId && p.imageUrl ? (p.photoError ?? "waiting") : null,
    })),
    total: found.total,
    perPage,
    withoutPhoto: missing.total,
  };
}

// 115 Photos

/** A photo for one of the vendor's products or dishes, from the panel: the main one, or one more. */
export function uploadPhoto(ctx: PanelContext, productId: number, data: Uint8Array, as: "main" | "extra", now: Date): Promise<PhotoResult> {
  return addPhoto(ctx.store, ctx.app, ctx.vendor, { productId, data, as }, now);
}

export function deletePhoto(ctx: PanelContext, productId: number, assetId: string, now: Date): Promise<boolean> {
  return removePhoto(ctx.store, ctx.app, ctx.vendor, productId, assetId, now);
}

/** Bulk photos (files or a ZIP's pictures, sent a few at a time), each placed on the product its name says. */
export async function bulkPhotos(ctx: PanelContext, files: { name: string; data: Uint8Array }[], now: Date): Promise<BulkPhotoOutcome[]> {
  if ((ctx.vendor.kind ?? "restaurant") === "restaurant") return files.map((f) => ({ name: f.name, status: "error" as const, error: "Add each dish's photo from Menu & stock." }));
  const out: BulkPhotoOutcome[] = [];
  for (const file of files) out.push(await placeBulkPhoto(ctx.store, ctx.app, ctx.vendor, file, now));
  return out;
}

/** How many of the vendor's picture links are still waiting to be fetched (up to 1000). */
export async function waitingLinks(ctx: PanelContext): Promise<number> {
  if ((ctx.vendor.kind ?? "restaurant") === "restaurant") return 0;
  return (await ctx.store.listMarketProductsAwaitingPhoto(1000, { appId: ctx.app.id, vendorId: ctx.vendor.id })).length;
}

/** A few of the vendor's picture links fetched now, from the panel (the frequent job fetches the rest). */
export async function fetchLinksNow(ctx: PanelContext, fetcher: PhotoFetcher): Promise<{ fetched: number; failed: number; left: number }> {
  const done = await fetchWaitingPhotos({ store: ctx.store, now: () => new Date(), fetcher, budgetMs: 8000, limit: 24, only: { appId: ctx.app.id, vendorId: ctx.vendor.id } });
  return { fetched: done.fetched, failed: done.failed, left: await waitingLinks(ctx) };
}

/** Puts a dish or product in or out of stock, with a count for products that keep one. */
export async function setStock(ctx: PanelContext, id: number, inStock: boolean, stock: number | null, now: Date): Promise<boolean> {
  if ((ctx.vendor.kind ?? "restaurant") === "restaurant") {
    const menu = (await ctx.store.getRestaurantMenu(ctx.app.id, ctx.vendor.id)) ?? EMPTY_MENU;
    const dish = menu.sections.flatMap((s) => s.dishes).find((d) => d.id === id);
    if (!dish) return false;
    dish.available = inStock;
    await ctx.store.saveRestaurantMenu(ctx.app.id, ctx.vendor.id, menu, now);
    return true;
  }
  const product = await ctx.store.getMarketProduct(ctx.app.id, id);
  if (!product || product.vendorId !== ctx.vendor.id) return false;
  await ctx.store.updateMarketProduct(ctx.app.id, id, { inStock: stock === 0 ? false : inStock, ...(stock !== undefined ? { stock } : {}) }, now);
  return true;
}

// Imports

/**
 * The biggest catalog file the panel takes: the upload goes through a server
 * action, whose body Netlify's functions cap at 6 MB (next.config's
 * `bodySizeLimit`), less the form's own bytes. A bigger catalog goes in
 * several files; rows update by SKU or barcode, so the order doesn't matter.
 */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export type ImportResult =
  | { ok: true; applied: boolean; plan: Pick<CatalogPlan, "counts" | "departments">; errors: { line: number; errors: string[] }[]; saved?: { created: number; updated: number; skipped: number } }
  | { ok: false; error: string };

/** A catalog file checked (and saved when `apply`): rows matched by SKU, else barcode; each row's errors. */
export async function importCatalog(ctx: PanelContext, file: { bytes: Uint8Array; name: string; type: string }, apply: boolean, now: Date): Promise<ImportResult> {
  if ((ctx.vendor.kind ?? "restaurant") === "restaurant") return { ok: false, error: "Restaurants' menus are set by the app's team." };
  let table;
  try {
    table = readSheet(file.bytes, file.name, file.type);
  } catch (e) {
    return { ok: false, error: e instanceof SheetError ? e.message : "This file can't be read. Use Excel, CSV, TSV or JSON." };
  }
  const existing = await vendorProducts(ctx.store, ctx.app.id, ctx.vendor.id);
  const plan = planCatalogImport(table, suggestMapping(table.columns), { currency: ctx.currency, existing });
  const errors = plan.rows.filter((r) => r.errors.length).slice(0, 50).map((r) => ({ line: r.line, errors: r.errors }));
  if (!apply) return { ok: true, applied: false, plan: { counts: plan.counts, departments: plan.departments }, errors };
  const saved = await applyCatalogImport(ctx.store, ctx.app.id, ctx.vendor.id, plan, now);
  return { ok: true, applied: true, plan: { counts: plan.counts, departments: plan.departments }, errors, saved };
}

// 115.20 Hours, days off and preparation time

/** The hours form's values (`<day>-opens`, `<day>-closes`, `<day>-opens2`, `<day>-closes2`, `prep`), the days off from today, and today. */
export function placeHoursValues(ctx: PanelContext, now: Date): { values: Record<string, string>; closed: VendorClosedDates[]; today: string } {
  const values: Record<string, string> = { prep: String(ctx.vendor.prepMinutes) };
  for (const day of WEEK_DAYS) {
    ctx.vendor.hours
      .filter((h) => h.day === day)
      .slice(0, 2)
      .forEach((h, i) => {
        values[`${day}-opens${i ? "2" : ""}`] = h.opens;
        values[`${day}-closes${i ? "2" : ""}`] = h.closes;
      });
  }
  const today = utcToLocal(now, ctx.timezone).date;
  return { values, closed: upcomingClosedDates(ctx.vendor.closedDates, today), today };
}

/** The hours form as the vendor routes take it (PATCH /vendor/me): `hours` and `prep_minutes`, or the first thing to fix. */
export function hoursFormBody(form: Record<string, string>): { ok: true; body: { hours: OpeningPeriod[]; prep_minutes: number } } | { ok: false; error: string } {
  const hours = parseHoursForm(form);
  if (!hours.ok) return { ok: false, error: Object.values(hours.errors)[0] ?? "Check the hours." };
  const prep = Number((form.prep ?? "").trim());
  return { ok: true, body: { hours: hours.value, prep_minutes: Number.isInteger(prep) ? prep : -1 } };
}

// Delivery

export function deliveryValues(ctx: PanelContext): Record<string, string> {
  return { ...vendorDeliveryFormValues(vendorDelivery(ctx.vendor), ctx.currency), ...vendorAreaFormValues(ctx.vendor, ctx.serviceAreas ?? []) };
}

/** 115 What the place should fix about where it delivers: set it (taken as 10 km meanwhile), or put its address on the map. */
export function deliveryAreaWarning(ctx: PanelContext): "set_area" | "no_position" | null {
  return vendorAreaWarning(ctx.vendor, ctx.serviceAreas ?? []);
}

/** Who delivers and on what terms, and (115) where: every place sets its area. */
export async function saveDelivery(ctx: PanelContext, form: Record<string, string>, now: Date): Promise<{ ok: true } | { ok: false; field: string; error: string }> {
  const parsed = parseVendorDeliveryForm(form, ctx.currency);
  if (!parsed.ok) return parsed;
  const area = parseVendorAreaForm(form, ctx.serviceAreas ?? []);
  if (!area.ok) return area;
  await ctx.store.updateRestaurant(ctx.app.id, ctx.vendor.id, { delivery: parsed.value, ...area.value }, now);
  return { ok: true };
}

// Staff

export const ROLES: VendorRole[] = ["owner", "manager", "orders", "picker"];

export async function staffList(ctx: PanelContext): Promise<RestaurantStaff[]> {
  return (await ctx.store.listRestaurantStaff(ctx.app.id, ctx.vendor.id)).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
}

export async function addStaff(ctx: PanelContext, input: { name: string; email: string; role: string }, now: Date): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase();
  const role = ROLES.includes(input.role as VendorRole) ? (input.role as VendorRole) : null;
  if (!name) return { ok: false, error: "Enter their name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter their email." };
  if (!role) return { ok: false, error: "Choose their role." };
  const made = await ctx.store.createRestaurantStaff({ appId: ctx.app.id, restaurantId: ctx.vendor.id, name, phone: null, email, active: true, role }, now);
  return made.ok ? { ok: true } : { ok: false, error: "Someone at the app's places already has this email." };
}

/** Turns a staff member on or off; nobody turns themselves off. */
export async function setStaffActive(ctx: PanelContext, staffId: number, active: boolean, now: Date): Promise<boolean> {
  if (staffId === ctx.staff.id) return false;
  const member = (await ctx.store.listRestaurantStaff(ctx.app.id, ctx.vendor.id)).find((s) => s.id === staffId);
  if (!member) return false;
  await ctx.store.updateRestaurantStaff(ctx.app.id, staffId, { active }, now);
  if (!active) await ctx.store.deleteVendorWebSessionsOfStaff(ctx.app.id, staffId);
  return true;
}

// Statements

/** The vendor's statement for [from, to): its delivered and picked-up orders, the refunds and compensations decided on them. */
/** A vendor's statement for [from, to): for its panel, or for the app owner (115.12 Studio › Statements). */
export async function vendorStatement(ctx: Pick<PanelContext, "store" | "app" | "vendor" | "currency">, from: Date, to: Date): Promise<Statement> {
  const orders = [];
  for (let offset = 0; ; offset += 500) {
    const page = await ctx.store.listMarketOrders({ appId: ctx.app.id, vendorId: ctx.vendor.id, completedSince: from, completedUntil: to, order: "oldest", limit: 500, offset });
    orders.push(...page.items);
    if (page.items.length < 500) break;
  }
  const complaints = (await ctx.store.listMarketComplaints({ appId: ctx.app.id, vendorId: ctx.vendor.id, statuses: ["resolved"], limit: 1000, offset: 0 })).items;
  const adjustments = complaints.map((c) => complaintAdjustment(c, marketOrderReference({ id: c.orderId }))).filter((a): a is NonNullable<typeof a> => a !== null);
  return buildStatement({
    from,
    to,
    currency: ctx.currency,
    orders: orders.filter((o) => o.completedAt).map((o) => ({ id: o.id, reference: marketOrderReference(o), at: o.completedAt!, payment: o.paymentMethod, money: o.money })),
    adjustments,
  });
}

/** This month or an earlier one ("2026-10"), in the app's time zone's calendar (UTC month bounds). */
export function monthBounds(month: string | null, now: Date): { from: Date; to: Date; month: string } {
  const m = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const [y, mo] = m.split("-").map(Number) as [number, number];
  return { from: new Date(Date.UTC(y, mo - 1, 1)), to: new Date(Date.UTC(y, mo, 1)), month: m };
}

// Complaints

export async function vendorComplaints(ctx: PanelContext) {
  const found = await ctx.store.listMarketComplaints({ appId: ctx.app.id, vendorId: ctx.vendor.id, limit: 100, offset: 0 });
  return found.items.filter((c) => c.sharedWithVendor).map((c) => ({ ...vendorComplaintView(c), reference: marketOrderReference({ id: c.orderId }) }));
}
