import { randomUUID } from "node:crypto";
import type { DataStore } from "../data/store";
import type { App, StoreBillingItem, StoreProductKind } from "../data/types";
import { platformConnector } from "../hosted/connectors/platforms";
import "../hosted/connectors/registry";
import { storeBillingSource } from "./access";
import { productIdFor, reconcileProducts, wantedFromCatalog, type BillingCatalog, type WantedProduct } from "./products";

/**
 * 100.7 The owner's list of what the app sells, for apps whose source can't
 * say it: an app on its own API (every course and plan is listed), and
 * Teachable or Thinkific schools, whose courses and one-time prices come
 * from the school's API, with the owner's list on top (a listed course
 * replaces the school's, a stopped one isn't sold, plans are added). The
 * products are made from it exactly as from the plugin's catalog
 * (`wantedFromCatalog`, `reconcileProducts`): never deleted, only stopped.
 */

/** The currencies offered for a listed item: those the App Store has a home territory for (lib/store-billing/apple.ts). */
export const ITEM_CURRENCIES = ["TRY", "USD", "EUR", "GBP", "EGP", "SAR", "AED", "KWD", "QAR", "JOD"] as const;

/** A course a school's API gives: its one-time price, or null when the API can't say it reliably. */
export interface PlatformCourse {
  id: number;
  title: string;
  price: string | null;
  currency: string | null;
}

export type ItemInput = Pick<StoreBillingItem, "kind" | "itemId" | "title" | "price" | "currency" | "period" | "courseIds">;

const PRICE = /^\d{1,7}(\.\d{1,2})?$/;
const priceOk = (price: string) => PRICE.test(price) && Number(price) > 0;
const PLAN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** The item in a form (the dashboard's add and edit forms), or why it can't be saved (an English message the dashboard translates). */
export function parseItem(form: { kind: string; itemId: string; title: string; price: string; currency: string; period: string; courseIds: string }): { ok: true; value: ItemInput } | { ok: false; message: string } {
  const kind: StoreProductKind | null = form.kind === "course" ? "course" : form.kind === "membership" ? "membership" : null;
  if (!kind) return { ok: false, message: "Choose a course or a membership plan." };
  const itemId = form.itemId.trim();
  if (kind === "course" && !/^[1-9]\d{0,9}$/.test(itemId)) return { ok: false, message: "A course's ID is the whole number your system gives it, like 12." };
  if (kind === "membership" && !PLAN_ID.test(itemId)) return { ok: false, message: "A plan's ID is up to 64 letters, digits, dots, dashes or underscores, like gold or plan-12." };
  const title = form.title.replace(/\s+/g, " ").trim();
  if (title.length < 2 || title.length > 200) return { ok: false, message: "Enter a title of 2 to 200 characters." };
  const raw = form.price.trim().replace(",", ".");
  const amount = PRICE.test(raw) ? Number(raw) : NaN;
  if (!(amount > 0) || amount > 1_000_000) return { ok: false, message: "Enter a price like 450 or 450.00." };
  const currency = form.currency.trim().toUpperCase();
  if (!(ITEM_CURRENCIES as readonly string[]).includes(currency)) return { ok: false, message: "Choose a currency." };
  const period = kind === "membership" ? (form.period === "month" || form.period === "year" ? form.period : null) : null;
  if (kind === "membership" && !period) return { ok: false, message: "Choose monthly or yearly." };
  let courseIds: number[] = [];
  if (kind === "membership") {
    const parts = form.courseIds.split(/[\s,;]+/).filter(Boolean);
    if (parts.length === 0 || parts.length > 1000 || parts.some((p) => !/^[1-9]\d{0,9}$/.test(p))) return { ok: false, message: "List the IDs of the courses the plan opens, separated by commas, like 12, 15." };
    courseIds = [...new Set(parts.map(Number))].sort((a, b) => a - b);
  } else courseIds = [Number(itemId)];
  return { ok: true, value: { kind, itemId, title, price: amount.toFixed(2), currency, period, courseIds } };
}

/** A new item, or the change of a listed one (its ID, creation time and kind kept). */
export function itemOf(appId: string, input: ItemInput, existing: StoreBillingItem | null, now: Date, newId: () => string = randomUUID): StoreBillingItem {
  return {
    id: existing?.id ?? newId(),
    appId,
    ...input,
    // A membership's period stays as it was made in the stores.
    period: existing?.period ?? input.period,
    active: true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Two plans whose IDs make the same store product ID: the second can't be listed. */
export function productIdTaken(items: StoreBillingItem[], input: Pick<ItemInput, "kind" | "itemId">): boolean {
  const wanted = productIdFor(input.kind, input.itemId);
  return items.some((i) => !(i.kind === input.kind && i.itemId === input.itemId) && productIdFor(i.kind, i.itemId) === wanted);
}

/**
 * What the app sells: the school's courses with a price (on Teachable or
 * Thinkific), replaced by the owner's listed course of the same ID, left out
 * when the owner stopped it; and the owner's other courses and plans. Made
 * into products through the plugin's catalog shape, one currency at a time.
 */
export function wantedFromItems(items: StoreBillingItem[], school: PlatformCourse[] = []): WantedProduct[] {
  // A school's course the owner stopped, or priced: theirs wins (an active one without a price leaves the school's).
  const listed = new Map(items.filter((i) => !i.active || priceOk(i.price)).map((i) => [`${i.kind}:${i.itemId}`, i]));
  const byCurrency = new Map<string, BillingCatalog>();
  const catalogOf = (currency: string) => {
    let catalog = byCurrency.get(currency);
    if (!catalog) byCurrency.set(currency, (catalog = { currency, courses: [], plans: [] }));
    return catalog;
  };
  for (const course of school) {
    if (listed.has(`course:${course.id}`) || !course.price || !course.currency) continue;
    catalogOf(course.currency.toUpperCase()).courses.push({ id: course.id, title: course.title, price: course.price });
  }
  for (const item of listed.values()) {
    if (!item.active) continue;
    if (item.kind === "course") catalogOf(item.currency).courses.push({ id: Number(item.itemId), title: item.title, price: item.price });
    else if (item.period) catalogOf(item.currency).plans.push({ id: item.itemId, title: item.title, price: item.price, period: item.period, course_ids: item.courseIds });
  }
  const seen = new Set<string>();
  return [...byCurrency.values()].flatMap(wantedFromCatalog).filter((p) => (seen.has(p.productId) ? false : (seen.add(p.productId), true)));
}

export interface ReconcileDeps {
  store: Pick<DataStore, "listStoreProducts" | "saveStoreProduct" | "listStoreBillingItems">;
  /** The encryption key (the school's API keys); without it a school's courses aren't read. */
  key?: Buffer;
  /** How the school's API is reached (tests: recorded answers). */
  platformFetch?: typeof fetch;
}

/** The school's courses with their one-time price; null when its API couldn't be read (nothing is changed then). */
export async function schoolCourses(deps: Pick<ReconcileDeps, "key" | "platformFetch"> & { store: DataStore }, app: App): Promise<PlatformCourse[] | null> {
  if (!deps.key) return null;
  const connector = platformConnector(app, deps.key, { store: deps.store }, deps.platformFetch);
  if (!connector?.storeCourses) return null;
  try {
    return await connector.storeCourses();
  } catch (error) {
    console.error("[store products] school courses", app.id, error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Keeps the store products of an app on its own API, Teachable or Thinkific
 * in step with the owner's list (and the school's courses). A school that
 * can't be read changes nothing: its products are never stopped for it.
 */
export async function reconcileListedItems(deps: ReconcileDeps & { store: DataStore }, app: App, now: Date): Promise<void> {
  const source = storeBillingSource(app);
  if (source !== "own_api" && source !== "teachable" && source !== "thinkific") return;
  let school: PlatformCourse[] = [];
  if (source !== "own_api") {
    const read = await schoolCourses(deps, app);
    if (!read) return;
    school = read;
  }
  const items = await deps.store.listStoreBillingItems(app.id);
  const existing = await deps.store.listStoreProducts(app.id);
  for (const product of reconcileProducts(app.id, existing, wantedFromItems(items, school), now, randomUUID)) await deps.store.saveStoreProduct(product);
}
