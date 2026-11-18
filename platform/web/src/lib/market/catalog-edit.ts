import type { DataStore } from "../data/store";
import type { MarketAisle, MarketCatalogChange, MarketDepartment, MarketNames, MarketProduct, MarketProductInput, MarketStockWho, MarketUnit, Restaurant } from "../data/types";
import { currencyDecimals, fromMinor } from "./currency";
import { arabicNumerals, readAmount } from "./catalog-import";
import { stockAmount, stockUnits } from "./stock";

/**
 * 115.24 Editing a grocery's or shop's catalog one product, department or
 * aisle at a time: from the vendors' web panel (the place's owner and
 * managers), from the vendor app (the same routes), and from the owner's
 * dashboard for any place. The checks are the same everywhere. Every change
 * a place makes is kept (D10), with the row before and after, so the owner
 * sees it and can undo it; stock goes through the stock-moves ledger.
 */

export interface CatalogScope {
  store: DataStore;
  appId: string;
  vendor: Restaurant;
  currency: string;
  /** The place's staff (`vendor`) or the app's owner (`owner`), with their name. */
  who: { by: "vendor" | "owner"; byName: string | null };
}

export type CatalogErrors = Partial<Record<string, string>>;
export type Edited<T> = { ok: true; value: T } | { ok: false; errors: CatalogErrors };

export const NAME_LANGS = ["en", "ar", "tr"] as const;
const WEIGHT_UNITS: MarketUnit[] = ["kg", "g", "l"];
const TAG_SET = new Set(["spicy", "vegetarian", "vegan", "new", "popular", "organic", "frozen", "age_restricted"]);

export function sellsProducts(vendor: Pick<Restaurant, "kind">): boolean {
  return (vendor.kind ?? "restaurant") !== "restaurant";
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
const has = (raw: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(raw, key);

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = arabicNumerals(str(v)).replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

function flag(v: unknown): boolean {
  return v === true || v === "on" || v === "1" || v === "true" || v === "yes";
}

function amount(v: unknown, currency: string): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? Math.round(v * 10 ** currencyDecimals(currency)) : null;
  return readAmount(str(v), currency);
}

/** Whether `q` is a whole number of `step`s. */
function onStep(q: number, step: number): boolean {
  const n = q / step;
  return Math.abs(n - Math.round(n)) < 1e-6;
}

/** The fields an edit sets: a product's, read from a form (strings) or the API (JSON), all of them or (`partial`) those given. */
export interface ProductFields {
  patch: Partial<Omit<MarketProductInput, "appId" | "vendorId" | "stock">>;
  /** Counted stock in items or steps; null for not counted; undefined when not given. */
  stock: number | null | undefined;
}

/**
 * Reads a product's fields. Names: `name` (shown when the app's language has
 * none) and `names` ({en, ar, tr}) or `name_en`, `name_ar`, `name_tr`;
 * `price` and `was_price` as amounts; `sold_by` unit or weight, with `unit`
 * (kg, g or l for weight), `step`, `min` and `max`; `sku`, `barcode`;
 * `stock` in the product's unit (empty or null: not counted); `department_id`
 * and `aisle_id`; `in_stock` on or off; `tags`.
 */
export async function readProductFields(scope: CatalogScope, raw: Record<string, unknown>, current: MarketProduct | null): Promise<Edited<ProductFields>> {
  const partial = current !== null;
  const errors: CatalogErrors = {};
  const patch: ProductFields["patch"] = {};
  const given = (key: string) => !partial || has(raw, key);

  if (given("name")) {
    const name = str(raw.name);
    if (!name) errors.name = "Enter the product's name.";
    else if (name.length > 160) errors.name = "Keep the name to 160 characters.";
    else patch.name = name;
  }
  const nameKeys = NAME_LANGS.map((l) => `name_${l}`);
  if (has(raw, "names") || nameKeys.some((k) => has(raw, k)) || !partial) {
    const source = raw.names && typeof raw.names === "object" ? (raw.names as Record<string, unknown>) : null;
    const names: MarketNames = {};
    for (const l of NAME_LANGS) {
      const text = str(source ? source[l] : raw[`name_${l}`]);
      if (text.length > 160) errors[`name_${l}`] = "Keep the name to 160 characters.";
      else if (text) names[l] = text;
    }
    patch.names = Object.keys(names).length ? names : null;
  }
  if (given("description")) {
    const d = str(raw.description);
    if (d.length > 1000) errors.description = "Keep the description to 1000 characters.";
    else patch.description = d || null;
  }
  if (given("brand")) {
    const b = str(raw.brand);
    if (b.length > 80) errors.brand = "Keep the brand to 80 characters.";
    else patch.brand = b || null;
  }
  if (given("price")) {
    const p = amount(raw.price, scope.currency);
    if (p === null || p <= 0) errors.price = "Enter the price, above 0.";
    else patch.price = p;
  }
  if (given("was_price")) {
    const text = str(raw.was_price);
    const w = text || typeof raw.was_price === "number" ? amount(raw.was_price, scope.currency) : null;
    if ((text || typeof raw.was_price === "number") && w === null) errors.was_price = "Enter the price before the discount, or leave it empty.";
    else patch.wasPrice = w;
  }
  const price = patch.price ?? current?.price ?? 0;
  if (patch.wasPrice !== undefined && patch.wasPrice !== null && patch.wasPrice <= price) errors.was_price = "The price before the discount should be more than the price.";

  // Sold by the unit or by weight: the unit, its step, the least and the most.
  const soldGiven = given("sold_by") || given("unit") || given("step") || given("min") || given("max");
  let unit: MarketUnit = current?.unit ?? "item";
  let step = current?.step ?? 1;
  if (soldGiven) {
    const soldBy = str(raw.sold_by) || (has(raw, "unit") ? (str(raw.unit) === "item" ? "unit" : "weight") : unit === "item" ? "unit" : "weight");
    if (soldBy !== "unit" && soldBy !== "weight") errors.sold_by = "Choose by the unit or by weight.";
    if (soldBy === "unit") unit = "item";
    else {
      const u = str(raw.unit) as MarketUnit;
      unit = WEIGHT_UNITS.includes(u) ? u : WEIGHT_UNITS.includes(unit) ? unit : "kg";
    }
    const stepText = str(raw.step);
    const s = stepText || typeof raw.step === "number" ? num(raw.step) : unit === "item" ? 1 : unit === "g" ? 100 : current && current.unit === unit ? current.step : 0.25;
    if (s === null || s <= 0) errors.step = "Enter the step, above 0.";
    else if (unit === "item" && !Number.isInteger(s)) errors.step = "Items are sold in whole steps.";
    else if (s > 100000) errors.step = "That step is too big.";
    else step = s;
    const minText = str(raw.min);
    const min = minText || typeof raw.min === "number" ? num(raw.min) : null;
    if ((minText || typeof raw.min === "number") && (min === null || min <= 0)) errors.min = "Enter the least, above 0, or leave it empty.";
    else if (min !== null && !onStep(min, step)) errors.min = `The least should be in steps of ${step}.`;
    const maxText = str(raw.max);
    const max = maxText || typeof raw.max === "number" ? num(raw.max) : null;
    if ((maxText || typeof raw.max === "number") && (max === null || max <= 0)) errors.max = "Enter the most, above 0, or leave it empty.";
    else if (max !== null && max < (min ?? step)) errors.max = "The most should be at least the least.";
    else if (max !== null && !onStep(max, step)) errors.max = `The most should be in steps of ${step}.`;
    Object.assign(patch, { unit, step, minQuantity: min !== null && min > step ? min : null, maxQuantity: max });
  }

  if (given("sku")) {
    const sku = str(raw.sku);
    if (sku.length > 64) errors.sku = "Keep the SKU to 64 characters.";
    else patch.sku = sku || null;
  }
  if (given("barcode")) {
    const code = str(raw.barcode).replace(/\s+/g, "");
    if (code && !/^[\dA-Za-z-]{4,40}$/.test(code)) errors.barcode = "That isn't a barcode (4 to 40 letters or digits).";
    else patch.barcode = code || null;
  }
  let stock: number | null | undefined;
  if (given("stock")) {
    const text = str(raw.stock);
    if (raw.stock === null || (!text && typeof raw.stock !== "number")) stock = null;
    else {
      const s = num(raw.stock);
      if (s === null) errors.stock = "Enter the stock as a number, or leave it empty when it isn't counted.";
      else if (s > 10_000_000) errors.stock = "That stock is too big.";
      else stock = stockUnits({ unit, step }, s);
    }
  }
  if (given("in_stock")) patch.inStock = flag(raw.in_stock);
  if (has(raw, "tags")) {
    const list = Array.isArray(raw.tags) ? raw.tags.map(str) : str(raw.tags).split(/[,،]/).map((t) => t.trim());
    patch.tags = [...new Set(list.filter((t) => TAG_SET.has(t)))];
  }

  // Its department and aisle: the place's own.
  if (given("department_id") || given("aisle_id")) {
    const dep = num(raw.department_id);
    const aisle = num(raw.aisle_id);
    const departments = await scope.store.listMarketDepartments(scope.appId, scope.vendor.id);
    const department = dep ? departments.find((d) => d.id === dep) : null;
    if (dep && !department) errors.department_id = "Choose one of the place's departments.";
    let aisleId: number | null = null;
    if (aisle) {
      const aisles = department ? await scope.store.listMarketAisles(scope.appId, scope.vendor.id, department.id) : [];
      if (!aisles.some((a) => a.id === aisle)) errors.aisle_id = "Choose an aisle of that department.";
      else aisleId = aisle;
    }
    patch.departmentId = department?.id ?? null;
    patch.aisleId = aisleId;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { patch, stock } };
}

/** What the change list keeps of a product: its own fields, not its times. */
function productSnapshot(p: MarketProduct): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...p };
  for (const key of ["id", "appId", "vendorId", "createdAt", "updatedAt"]) delete rest[key];
  return rest;
}

async function record(scope: CatalogScope, change: Omit<MarketCatalogChange, "id" | "appId" | "vendorId" | "by" | "byName" | "createdAt" | "undoneAt">, now: Date): Promise<MarketCatalogChange> {
  return scope.store.addMarketCatalogChange({ ...change, appId: scope.appId, vendorId: scope.vendor.id, by: scope.who.by, byName: scope.who.byName, createdAt: now });
}

function stockWho(scope: CatalogScope): MarketStockWho {
  return { by: scope.who.by, byName: scope.who.byName };
}

async function ownProduct(scope: CatalogScope, id: number): Promise<MarketProduct | null> {
  const p = await scope.store.getMarketProduct(scope.appId, id);
  return p && p.vendorId === scope.vendor.id ? p : null;
}

const DUPLICATE_SKU: CatalogErrors = { sku: "Another product of this place has this SKU." };

/** A new product. */
export async function createProduct(scope: CatalogScope, raw: Record<string, unknown>, now: Date): Promise<Edited<MarketProduct>> {
  if (!sellsProducts(scope.vendor)) return { ok: false, errors: { form: "Restaurants have a menu, not products." } };
  const read = await readProductFields(scope, raw, null);
  if (!read.ok) return read;
  const { patch, stock } = read.value;
  const input: MarketProductInput = {
    appId: scope.appId,
    vendorId: scope.vendor.id,
    departmentId: patch.departmentId ?? null,
    aisleId: patch.aisleId ?? null,
    name: patch.name!,
    names: patch.names ?? null,
    description: patch.description ?? null,
    brand: patch.brand ?? null,
    sku: patch.sku ?? null,
    barcode: patch.barcode ?? null,
    imageAssetId: null,
    imageUrl: null,
    galleryAssetIds: null,
    photoError: null,
    price: patch.price!,
    wasPrice: patch.wasPrice ?? null,
    unit: patch.unit ?? "item",
    step: patch.step ?? 1,
    minQuantity: patch.minQuantity ?? null,
    maxQuantity: patch.maxQuantity ?? null,
    stock: null,
    inStock: patch.inStock ?? true,
    tags: patch.tags ?? [],
    position: 0,
  };
  const made = await scope.store.createMarketProduct(input, now);
  if (!made.ok) return { ok: false, errors: DUPLICATE_SKU };
  let product = made.product;
  // Its starting stock in the ledger, like every change after.
  if (stock !== undefined && stock !== null) {
    await scope.store.setMarketStock(scope.appId, product.id, stock, "edit", stockWho(scope), now);
    product = (await scope.store.getMarketProduct(scope.appId, product.id)) ?? product;
  }
  await record(scope, { entity: "product", entityId: product.id, action: "create", before: null, after: productSnapshot(product), fields: [] }, now);
  return { ok: true, value: product };
}

/** Changes a product: the fields given (all of a form's). */
export async function updateProduct(scope: CatalogScope, id: number, raw: Record<string, unknown>, now: Date): Promise<Edited<MarketProduct> | null> {
  const before = await ownProduct(scope, id);
  if (!before) return null;
  const read = await readProductFields(scope, raw, before);
  if (!read.ok) return read;
  const { patch, stock } = read.value;
  const saved = await scope.store.updateMarketProduct(scope.appId, id, patch, now);
  if (!saved.ok) return saved.reason === "duplicate_sku" ? { ok: false, errors: DUPLICATE_SKU } : null;
  if (stock !== undefined) await scope.store.setMarketStock(scope.appId, id, stock, "edit", stockWho(scope), now);
  // Turned on again by hand while counted at 0: it stays sold out until stocked.
  const after = (await scope.store.getMarketProduct(scope.appId, id))!;
  const was = productSnapshot(before);
  const now_ = productSnapshot(after);
  const fields = Object.keys(now_).filter((k) => JSON.stringify(was[k] ?? null) !== JSON.stringify(now_[k] ?? null));
  if (fields.length) await record(scope, { entity: "product", entityId: id, action: "update", before: was, after: now_, fields }, now);
  return { ok: true, value: after };
}

export async function deleteProduct(scope: CatalogScope, id: number, now: Date): Promise<boolean> {
  const before = await ownProduct(scope, id);
  if (!before) return false;
  await scope.store.deleteMarketProduct(scope.appId, id);
  await record(scope, { entity: "product", entityId: id, action: "delete", before: productSnapshot(before), after: null, fields: [] }, now);
  return true;
}

/** Sets a product's counted stock and its on/off (the panel's stock line, the vendor app's stock screen). */
export async function setProductStock(scope: CatalogScope, id: number, input: { inStock?: boolean; amount?: number | null }, now: Date): Promise<MarketProduct | null> {
  const before = await ownProduct(scope, id);
  if (!before) return null;
  if (input.inStock !== undefined && input.inStock !== before.inStock) await scope.store.updateMarketProduct(scope.appId, id, { inStock: input.inStock }, now);
  if (input.amount !== undefined) await scope.store.setMarketStock(scope.appId, id, input.amount === null ? null : stockUnits(before, input.amount), "edit", stockWho(scope), now);
  return scope.store.getMarketProduct(scope.appId, id);
}

// Departments and aisles

function cleanName(raw: unknown): string | null {
  const name = str(raw);
  return name && name.length <= 80 ? name : null;
}

export async function saveDepartment(scope: CatalogScope, input: { id: number | null; name: unknown }, now: Date): Promise<Edited<MarketDepartment>> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, errors: { name: "Enter the department's name (up to 80 characters)." } };
  const list = await scope.store.listMarketDepartments(scope.appId, scope.vendor.id);
  const before = input.id !== null ? list.find((d) => d.id === input.id) : null;
  if (input.id !== null && !before) return { ok: false, errors: { form: "This department isn't there any more." } };
  const position = before ? before.position : list.reduce((m, d) => Math.max(m, d.position + 1), 0);
  const saved = await scope.store.saveMarketDepartment({ id: input.id, appId: scope.appId, vendorId: scope.vendor.id, name, imageAssetId: before?.imageAssetId ?? null, position });
  if (!saved) return { ok: false, errors: { form: "This department isn't there any more." } };
  if (!before || before.name !== name) await record(scope, { entity: "department", entityId: saved.id, action: before ? "update" : "create", before: before ? { name: before.name, position: before.position } : null, after: { name, position }, fields: before ? ["name"] : [] }, now);
  return { ok: true, value: saved };
}

export async function deleteDepartment(scope: CatalogScope, id: number, now: Date): Promise<boolean> {
  const list = await scope.store.listMarketDepartments(scope.appId, scope.vendor.id);
  const before = list.find((d) => d.id === id);
  if (!before) return false;
  // Kept for undo: its aisles, and which products were in it (up to 5,000).
  const aisles = await scope.store.listMarketAisles(scope.appId, scope.vendor.id, id);
  const products = await productsIn(scope, { departmentId: id });
  await scope.store.deleteMarketDepartment(scope.appId, scope.vendor.id, id);
  await record(scope, { entity: "department", entityId: id, action: "delete", before: { name: before.name, position: before.position, imageAssetId: before.imageAssetId, aisles: aisles.map((a) => ({ id: a.id, name: a.name, position: a.position })), products }, after: null, fields: [] }, now);
  return true;
}

/** The products in a department (and their aisle), for undoing its deletion. */
async function productsIn(scope: CatalogScope, where: { departmentId?: number; aisleId?: number }): Promise<{ id: number; aisleId: number | null }[]> {
  const out: { id: number; aisleId: number | null }[] = [];
  let cursor = "";
  while (out.length < 5000) {
    const page = await scope.store.listMarketProducts({ appId: scope.appId, vendorId: scope.vendor.id, ...where, page: 1, perPage: 500, cursor });
    out.push(...page.items.map((p) => ({ id: p.id, aisleId: p.aisleId })));
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out;
}

export async function saveAisle(scope: CatalogScope, input: { id: number | null; departmentId: number; name: unknown }, now: Date): Promise<Edited<MarketAisle>> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, errors: { name: "Enter the aisle's name (up to 80 characters)." } };
  const list = await scope.store.listMarketAisles(scope.appId, scope.vendor.id, input.departmentId);
  const all = input.id !== null ? await scope.store.listMarketAisles(scope.appId, scope.vendor.id) : list;
  const before = input.id !== null ? all.find((a) => a.id === input.id) : null;
  if (input.id !== null && !before) return { ok: false, errors: { form: "This aisle isn't there any more." } };
  const position = before && before.departmentId === input.departmentId ? before.position : list.reduce((m, a) => Math.max(m, a.position + 1), 0);
  const saved = await scope.store.saveMarketAisle({ id: input.id, appId: scope.appId, vendorId: scope.vendor.id, departmentId: input.departmentId, name, position });
  if (!saved) return { ok: false, errors: { department_id: "Choose one of the place's departments." } };
  if (!before || before.name !== name || before.departmentId !== input.departmentId) {
    await record(scope, { entity: "aisle", entityId: saved.id, action: before ? "update" : "create", before: before ? { name: before.name, departmentId: before.departmentId, position: before.position } : null, after: { name, departmentId: input.departmentId, position }, fields: before ? ["name", "departmentId"].filter((f) => (f === "name" ? before.name !== name : before.departmentId !== input.departmentId)) : [] }, now);
  }
  return { ok: true, value: saved };
}

export async function deleteAisle(scope: CatalogScope, id: number, now: Date): Promise<boolean> {
  const before = (await scope.store.listMarketAisles(scope.appId, scope.vendor.id)).find((a) => a.id === id);
  if (!before) return false;
  const products = await productsIn(scope, { aisleId: id });
  await scope.store.deleteMarketAisle(scope.appId, scope.vendor.id, id);
  await record(scope, { entity: "aisle", entityId: id, action: "delete", before: { name: before.name, departmentId: before.departmentId, position: before.position, products }, after: null, fields: [] }, now);
  return true;
}

/** Puts departments (or a department's aisles) in this order: by drag (the whole list) or an arrow (one moved up or down). */
export async function orderShelves(scope: CatalogScope, input: { kind: "department" } | { kind: "aisle"; departmentId: number }, order: number[] | { id: number; move: "up" | "down" }, now: Date): Promise<boolean> {
  const list = input.kind === "department" ? await scope.store.listMarketDepartments(scope.appId, scope.vendor.id) : await scope.store.listMarketAisles(scope.appId, scope.vendor.id, input.departmentId);
  let ids = list.map((x) => x.id);
  if (Array.isArray(order)) {
    // Every one of them, each once.
    if (order.length !== ids.length || new Set(order).size !== ids.length || order.some((id) => !ids.includes(id))) return false;
    ids = order;
  } else {
    const i = ids.indexOf(order.id);
    const j = order.move === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return false;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  const before = list.map((x) => x.id);
  if (before.join(",") === ids.join(",")) return true;
  for (const [position, id] of ids.entries()) {
    const row = list.find((x) => x.id === id)!;
    if (row.position === position) continue;
    if (input.kind === "department") await scope.store.saveMarketDepartment({ ...(row as MarketDepartment), position });
    else await scope.store.saveMarketAisle({ ...(row as MarketAisle), position });
  }
  await record(scope, { entity: input.kind, entityId: input.kind === "aisle" ? input.departmentId : 0, action: "update", before: { order: before }, after: { order: ids }, fields: ["order"] }, now);
  return true;
}

// The owner's undo

export type UndoResult = { ok: true } | { ok: false; error: string };

/** The owner undoes a change (a place's, or their own): the row as it was, its stock through the ledger. */
export async function undoCatalogChange(scope: CatalogScope, changeId: number, now: Date): Promise<UndoResult> {
  const c = await scope.store.getMarketCatalogChange(scope.appId, changeId);
  if (!c || c.vendorId !== scope.vendor.id) return { ok: false, error: "This change isn't there any more." };
  if (c.undoneAt) return { ok: false, error: "This change was undone already." };
  const undone = await undoOne(scope, c, now);
  if (!undone.ok) return undone;
  await scope.store.markMarketCatalogChangeUndone(scope.appId, c.id, now);
  return { ok: true };
}

async function undoOne(scope: CatalogScope, c: MarketCatalogChange, now: Date): Promise<UndoResult> {
  const { store, appId } = scope;
  const vendorId = scope.vendor.id;
  const before = (c.before ?? {}) as Record<string, unknown>;
  if (c.entity === "product") {
    if (c.action === "create") {
      await store.deleteMarketProduct(appId, c.entityId);
      return { ok: true };
    }
    if (c.action === "update") {
      const current = await ownProduct(scope, c.entityId);
      if (!current) return { ok: false, error: "This product was deleted since." };
      const patch: Record<string, unknown> = {};
      for (const f of c.fields) if (f !== "stock") patch[f] = before[f] ?? null;
      const saved = await store.updateMarketProduct(appId, c.entityId, patch as Partial<MarketProductInput>, now);
      if (!saved.ok) return { ok: false, error: saved.reason === "duplicate_sku" ? "Another product has its SKU now." : "This product was deleted since." };
      if (c.fields.includes("stock")) await store.setMarketStock(appId, c.entityId, (before.stock as number | null) ?? null, "undo", stockWho(scope), now);
      return { ok: true };
    }
    // A deleted product comes back (with a new number), without its stock history.
    const input = { ...(before as Omit<MarketProductInput, "appId" | "vendorId">), appId, vendorId, stock: null } as MarketProductInput;
    const made = await store.createMarketProduct(input, now);
    if (!made.ok) return { ok: false, error: "Another product has its SKU now." };
    if (typeof before.stock === "number") await store.setMarketStock(appId, made.product.id, before.stock, "undo", stockWho(scope), now);
    return { ok: true };
  }
  if (c.entity === "department") {
    if (c.fields.includes("order")) return reorderBack(scope, { kind: "department" }, before.order as number[], now);
    if (c.action === "create") {
      await store.deleteMarketDepartment(appId, vendorId, c.entityId);
      return { ok: true };
    }
    if (c.action === "update") {
      const d = (await store.listMarketDepartments(appId, vendorId)).find((x) => x.id === c.entityId);
      if (!d) return { ok: false, error: "This department was deleted since." };
      await store.saveMarketDepartment({ ...d, name: String(before.name ?? d.name) });
      return { ok: true };
    }
    const made = await store.saveMarketDepartment({ id: null, appId, vendorId, name: String(before.name ?? ""), imageAssetId: (before.imageAssetId as string | null) ?? null, position: Number(before.position ?? 0) });
    if (!made) return { ok: false, error: "The place isn't there any more." };
    const aisleIds = new Map<number, number>();
    for (const a of (before.aisles as { id: number; name: string; position: number }[] | undefined) ?? []) {
      const aisle = await store.saveMarketAisle({ id: null, appId, vendorId, departmentId: made.id, name: a.name, position: a.position });
      if (aisle) aisleIds.set(a.id, aisle.id);
    }
    // Its products back in it, unless they were moved elsewhere since.
    for (const p of (before.products as { id: number; aisleId: number | null }[] | undefined) ?? []) {
      const current = await ownProduct(scope, p.id);
      if (current && current.departmentId === null) await store.updateMarketProduct(appId, p.id, { departmentId: made.id, aisleId: p.aisleId !== null ? (aisleIds.get(p.aisleId) ?? null) : null }, now);
    }
    return { ok: true };
  }
  // An aisle.
  if (c.fields.includes("order")) return reorderBack(scope, { kind: "aisle", departmentId: c.entityId }, before.order as number[], now);
  if (c.action === "create") {
    await store.deleteMarketAisle(appId, vendorId, c.entityId);
    return { ok: true };
  }
  if (c.action === "update") {
    const a = (await store.listMarketAisles(appId, vendorId)).find((x) => x.id === c.entityId);
    if (!a) return { ok: false, error: "This aisle was deleted since." };
    const saved = await store.saveMarketAisle({ ...a, name: String(before.name ?? a.name), departmentId: Number(before.departmentId ?? a.departmentId) });
    return saved ? { ok: true } : { ok: false, error: "Its department was deleted since." };
  }
  const departmentId = Number(before.departmentId);
  const made = await store.saveMarketAisle({ id: null, appId, vendorId, departmentId, name: String(before.name ?? ""), position: Number(before.position ?? 0) });
  if (!made) return { ok: false, error: "Its department was deleted since." };
  for (const p of (before.products as { id: number }[] | undefined) ?? []) {
    const current = await ownProduct(scope, p.id);
    if (current && current.departmentId === departmentId && current.aisleId === null) await store.updateMarketProduct(appId, p.id, { aisleId: made.id }, now);
  }
  return { ok: true };
}

async function reorderBack(scope: CatalogScope, kind: { kind: "department" } | { kind: "aisle"; departmentId: number }, order: number[], now: Date): Promise<UndoResult> {
  const list = kind.kind === "department" ? await scope.store.listMarketDepartments(scope.appId, scope.vendor.id) : await scope.store.listMarketAisles(scope.appId, scope.vendor.id, kind.departmentId);
  const ids = list.map((x) => x.id);
  // Those still there in the old order, any made since after them.
  const back = [...order.filter((id) => ids.includes(id)), ...ids.filter((id) => !order.includes(id))];
  const quiet: CatalogScope = { ...scope, store: withoutRecording(scope.store) };
  return (await orderShelves(quiet, kind, back, now)) ? { ok: true } : { ok: false, error: "The order changed since." };
}

/** The store without a change record (an undo isn't a new change to undo). */
function withoutRecording(store: DataStore): DataStore {
  return new Proxy(store, {
    get(target, prop, receiver) {
      if (prop === "addMarketCatalogChange") return async (input: Parameters<DataStore["addMarketCatalogChange"]>[0]) => ({ ...input, id: 0, undoneAt: null });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/** The owner (or the place) undoes a hand change of stock, when it's still what that change left. */
export async function undoStockMove(scope: CatalogScope, moveId: number, now: Date): Promise<UndoResult> {
  const m = await scope.store.getMarketStockMove(scope.appId, moveId);
  if (!m || m.vendorId !== scope.vendor.id) return { ok: false, error: "This change isn't there any more." };
  if (m.reason !== "edit" && m.reason !== "import") return { ok: false, error: "Orders' stock moves come back with the order (cancelled, turned down or picked)." };
  const p = await ownProduct(scope, m.productId);
  if (!p) return { ok: false, error: "This product was deleted since." };
  if (p.stock !== m.after) return { ok: false, error: "The stock changed since. Set it by hand." };
  const done = (await scope.store.listMarketStockMoves(scope.appId, { productId: m.productId, limit: 50 })).some((x) => x.undoOf === m.id);
  if (done) return { ok: false, error: "This change was undone already." };
  await scope.store.setMarketStock(scope.appId, m.productId, m.before, "undo", stockWho(scope), now, m.id);
  return { ok: true };
}

// For the pages

/** A product's fields as a form shows them. */
export function productFormValues(p: MarketProduct | null, currency: string): Record<string, string> {
  const d = currencyDecimals(currency);
  if (!p) return { name: "", name_en: "", name_ar: "", name_tr: "", description: "", brand: "", price: "", was_price: "", sold_by: "unit", unit: "kg", step: "1", min: "", max: "", sku: "", barcode: "", stock: "", department_id: "", aisle_id: "", in_stock: "on" };
  return {
    name: p.name,
    name_en: p.names?.en ?? "",
    name_ar: p.names?.ar ?? "",
    name_tr: p.names?.tr ?? "",
    description: p.description ?? "",
    brand: p.brand ?? "",
    price: fromMinor(p.price, d),
    was_price: p.wasPrice !== null ? fromMinor(p.wasPrice, d) : "",
    sold_by: p.unit === "item" ? "unit" : "weight",
    unit: p.unit === "item" ? "kg" : p.unit,
    step: String(p.step),
    min: p.minQuantity ? String(p.minQuantity) : "",
    max: p.maxQuantity !== null ? String(p.maxQuantity) : "",
    sku: p.sku ?? "",
    barcode: p.barcode ?? "",
    stock: p.stock !== null ? String(stockAmount(p, p.stock)) : "",
    department_id: p.departmentId ? String(p.departmentId) : "",
    aisle_id: p.aisleId ? String(p.aisleId) : "",
    in_stock: p.inStock ? "on" : "",
  };
}

/** A form's fields as the reader takes them (checkboxes missing when off). */
export function formFields(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ["name", "name_en", "name_ar", "name_tr", "description", "brand", "price", "was_price", "sold_by", "unit", "step", "min", "max", "sku", "barcode", "stock", "department_id", "aisle_id"]) out[key] = String(form.get(key) ?? "");
  out.in_stock = form.get("in_stock") === "on" ? "on" : "";
  return out;
}
