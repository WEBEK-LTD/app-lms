import { randomUUID } from "node:crypto";
import type { DataStore } from "../data/store";
import { allows, effectivePlans, planOfLicense } from "../entitlements";
import { siteApp, type Fail } from "../license/chat";
import { parseSiteInfo } from "../license/service";
import { reconcileProducts, wantedFromCatalog, type BillingCatalog } from "./products";

/**
 * 100.2 POST /api/v1/billing/catalog (platform.yaml, sendBillingCatalog):
 * the paid courses and membership plans of a WordPress site. Yallapp keeps a
 * store product for each and stops the ones no longer sent; the frequent job
 * makes them in the stores. A plan without in-app purchases (Starter) is
 * heard but nothing is kept.
 */

const fail = (status: Fail["status"], message: string): Fail => ({ status, body: { code: status === 400 ? "invalid_request" : "not_found", message } });
const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const wholeId = (value: unknown): number | null => (typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null);
const text = (value: unknown, max: number): string | null => (typeof value === "string" && value.trim() !== "" && value.length <= max ? value.trim() : null);
const PRICE = /^\d{1,7}(\.\d{1,2})?$/;

/** The catalog in the request, or why it isn't one. */
export function parseCatalog(body: unknown): { ok: true; value: BillingCatalog } | { ok: false; message: string } {
  const input = record(body);
  const currency = typeof input.currency === "string" && /^[A-Z]{3}$/.test(input.currency) ? input.currency : null;
  if (!currency) return { ok: false, message: "currency must be a three-letter code like TRY." };
  if (!Array.isArray(input.courses) || input.courses.length > 1000) return { ok: false, message: "courses is a list of at most 1,000 courses." };
  if (!Array.isArray(input.plans) || input.plans.length > 50) return { ok: false, message: "plans is a list of at most 50 plans." };
  const courses: BillingCatalog["courses"] = [];
  for (const raw of input.courses) {
    const course = record(raw);
    const id = wholeId(course.id);
    const title = text(course.title, 200);
    const price = typeof course.price === "string" && PRICE.test(course.price) ? course.price : null;
    if (!id || !title || !price) return { ok: false, message: "Each course needs its ID, title and price (a decimal string)." };
    courses.push({ id, title, price });
  }
  const plans: BillingCatalog["plans"] = [];
  for (const raw of input.plans) {
    const plan = record(raw);
    const id = text(plan.id, 64);
    const title = text(plan.title, 200);
    const price = typeof plan.price === "string" && PRICE.test(plan.price) ? plan.price : null;
    const period = plan.period === "month" || plan.period === "year" ? plan.period : null;
    const ids = plan.course_ids === undefined ? [] : plan.course_ids;
    if (!id || !title || !price || !period) return { ok: false, message: "Each plan needs its ID, title, price and period (month or year)." };
    if (!Array.isArray(ids) || ids.length > 1000 || ids.some((c) => !wholeId(c))) return { ok: false, message: "A plan's course_ids is a list of at most 1,000 course IDs." };
    plans.push({ id, title, price, period, course_ids: ids as number[] });
  }
  return { ok: true, value: { currency, courses, plans } };
}

export async function receiveSiteCatalog(store: DataStore, body: unknown, now: Date): Promise<{ status: 204 } | Fail> {
  const site = parseSiteInfo(body);
  if (!site.ok) return fail(400, site.result.body.message);
  const catalog = parseCatalog(body);
  if (!catalog.ok) return fail(400, catalog.message);
  const found = await siteApp(store, site.value, now);
  if (!found.ok) return found.result;
  const plan = planOfLicense(await effectivePlans(store), found.license, now);
  if (!allows(plan, "store_billing")) return { status: 204 };
  const existing = await store.listStoreProducts(found.app.id);
  for (const product of reconcileProducts(found.app.id, existing, wantedFromCatalog(catalog.value), now, randomUUID)) {
    await store.saveStoreProduct(product);
  }
  return { status: 204 };
}
