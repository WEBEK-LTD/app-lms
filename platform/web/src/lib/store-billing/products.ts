import type { App, CourseSetup, StoreProduct, StoreProductKind, StoreProductSync } from "../data/types";

/**
 * 100.2 What the app sells through the stores: a one-time product for each
 * paid course and a subscription for each membership plan, made from the
 * app's source (the dashboard's courses on the hosted API, or the catalog
 * the plugin sends) and kept in step with it. A product no longer sold is
 * stopped, never deleted: the stores never give its ID back, and the people
 * who bought it keep it.
 */

/** One product as the source has it now. */
export interface WantedProduct {
  productId: string;
  kind: StoreProductKind;
  courseId: number | null;
  planId: string | null;
  title: string;
  period: "month" | "year" | null;
  courseIds: number[];
  currency: string;
  sitePrice: string;
}

/** The plugin's `POST /billing/catalog` (docs/api/platform.yaml), checked. */
export interface BillingCatalog {
  currency: string;
  courses: { id: number; title: string; price: string }[];
  plans: { id: string; title: string; price: string; period: "month" | "year"; course_ids: number[] }[];
}

/** The ID in both stores: lower-case letters, digits and underscores, at most 40 characters (Google's limit for subscriptions). */
export function productIdFor(kind: StoreProductKind, id: number | string): string {
  if (kind === "course") return `course_${id}`;
  const slug = String(id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `plan_${slug}`.slice(0, 40);
}

/** A price as a decimal string with two places; null when it isn't a positive amount. */
export function priceText(value: string | number): string | null {
  const amount = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  return amount.toFixed(2);
}

/** The paid, active courses of an app on the hosted API. */
export function wantedFromCourses(setup: CourseSetup | null | undefined): WantedProduct[] {
  if (!setup) return [];
  return setup.courses.flatMap((course) => {
    const price = course.active && course.priceCents > 0 ? priceText(course.priceCents / 100) : null;
    if (!price) return [];
    return [
      {
        productId: productIdFor("course", course.id),
        kind: "course" as const,
        courseId: course.id,
        planId: null,
        title: course.title.trim().slice(0, 200),
        period: null,
        courseIds: [course.id],
        currency: setup.currency,
        sitePrice: price,
      },
    ];
  });
}

/** What the plugin's catalog sells: its paid courses and plans (free ones and bad prices left out). */
export function wantedFromCatalog(catalog: BillingCatalog): WantedProduct[] {
  const courses = catalog.courses.flatMap((course): WantedProduct[] => {
    const price = priceText(course.price);
    return price
      ? [{ productId: productIdFor("course", course.id), kind: "course", courseId: course.id, planId: null, title: course.title.trim().slice(0, 200), period: null, courseIds: [course.id], currency: catalog.currency, sitePrice: price }]
      : [];
  });
  const plans = catalog.plans.flatMap((plan): WantedProduct[] => {
    const price = priceText(plan.price);
    return price
      ? [
          {
            productId: productIdFor("membership", plan.id),
            kind: "membership",
            courseId: null,
            planId: plan.id,
            title: plan.title.trim().slice(0, 200),
            period: plan.period,
            courseIds: [...new Set(plan.course_ids)].sort((a, b) => a - b),
            currency: catalog.currency,
            sitePrice: price,
          },
        ]
      : [];
  });
  // Two plans whose IDs make the same product ID: the first wins.
  const seen = new Set<string>();
  return [...courses, ...plans].filter((p) => (seen.has(p.productId) ? false : (seen.add(p.productId), true)));
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The products to save so the app's list matches the source: new ones,
 * changed ones (title, price, courses, period), stopped ones (no longer
 * sent) and ones sold again. Unchanged products aren't returned.
 */
export function reconcileProducts(appId: string, existing: StoreProduct[], wanted: WantedProduct[], now: Date, newId: () => string): StoreProduct[] {
  const byId = new Map(existing.map((p) => [p.productId, p]));
  const wantedIds = new Set(wanted.map((w) => w.productId));
  const changed: StoreProduct[] = [];
  for (const w of wanted) {
    const current = byId.get(w.productId);
    if (!current) {
      changed.push({ id: newId(), appId, ...w, ownPrice: null, active: true, google: null, apple: null, createdAt: now, updatedAt: now });
      continue;
    }
    const next: StoreProduct = {
      ...current,
      ...w,
      // The owner's price is kept unless the currency changed.
      ownPrice: current.currency === w.currency ? current.ownPrice : null,
      active: true,
    };
    const keys = ["title", "period", "courseIds", "currency", "sitePrice", "ownPrice", "active", "courseId", "planId"] as const;
    if (keys.some((k) => !same(next[k], current[k]))) changed.push({ ...next, updatedAt: now });
  }
  for (const p of existing) {
    if (p.active && !wantedIds.has(p.productId)) changed.push({ ...p, active: false, updatedAt: now });
  }
  return changed;
}

/** The price the stores should have: the owner's, else the site's. */
export function wantedPrice(product: Pick<StoreProduct, "ownPrice" | "sitePrice">): string {
  return product.ownPrice ?? product.sitePrice;
}

/** A failed product is tried again after an hour (the owner's "Update the stores now" tries it at once). */
export const RETRY_AFTER_MS = 60 * 60 * 1000;

/**
 * Whether a store must hear about the product again: never made there,
 * changed since, failed (with `now`: an hour ago or more), or stopped on the
 * source.
 */
export function needsSync(product: StoreProduct, sync: StoreProductSync | null, now?: Date): boolean {
  if (sync?.status === "failed" && now && now.getTime() - Date.parse(sync.at) < RETRY_AFTER_MS) return false;
  if (!product.active) return sync !== null && sync.status !== "stopped";
  if (!sync || sync.status !== "synced") return true;
  return product.updatedAt.getTime() > Date.parse(sync.at);
}

/** Which stores the app can sell in: a key for each, and the app's ID there. */
export function storesOf(app: Pick<App, "googlePlayKeyEncrypted" | "androidPackage" | "ascPrivateKeyEncrypted" | "ascKeyId" | "ascIssuerId" | "iosBundleId">): {
  google: boolean;
  apple: boolean;
} {
  return {
    google: Boolean(app.googlePlayKeyEncrypted && app.androidPackage),
    apple: Boolean(app.ascPrivateKeyEncrypted && app.ascKeyId && app.ascIssuerId && app.iosBundleId),
  };
}
