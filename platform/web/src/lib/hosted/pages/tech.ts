import type { App } from "../../data/types";
import type { StudioNode, StudioTechProduct, StudioTechServed } from "../../pages/types";
import { isSpecKey } from "../../selling/specs";
import { techOf } from "../../selling/tech";

/**
 * 211 The tech elements as the hosted API serves them (`StudioNode.tech_served`,
 * lib/pages/types.ts STUDIO_TECH_TYPES), from the shop's own products
 * (Yallapp's catalog; a connected platform keeps no specs): a product's
 * specs (`spec_table`), two or three products side by side (`compare`), a
 * spec's values in the shop (`spec_filter`). The trade-in estimator and
 * Build your PC are drawn from the shop's settings the app has
 * (`StoreConfig.trade_in`, `pc_builder`): served as they are while the shop
 * has them on, left out while it hasn't. An element with nothing to show
 * is left out, so the app never draws an empty one.
 */

type Fetch = (path: string[], params?: Record<string, string | number | null | undefined>) => Promise<Record<string, unknown> | null>;

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** A product of the shop's list as the elements get it; null without specs (nothing to show or compare). */
export function techProduct(raw: Record<string, unknown>): StudioTechProduct | null {
  const id = Number(raw.id);
  const title = str(raw.name);
  const specs = Array.isArray(raw.specs)
    ? raw.specs
        .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
        .map((x) => ({ key: isSpecKey(x.key) ? x.key : null, label: String(x.label ?? ""), value: String(x.value ?? "") }))
        .filter((x) => x.label && x.value)
    : [];
  if (!Number.isSafeInteger(id) || !title || !specs.length) return null;
  const price = (raw.price ?? {}) as { formatted?: unknown; regular_formatted?: unknown; on_sale?: unknown };
  return { id: String(id), title, image_url: str(raw.image_url), price: str(price.formatted) ?? "", was_price: price.on_sale === true ? str(price.regular_formatted) : null, specs };
}

const items = (body: Record<string, unknown> | null) => (Array.isArray(body?.items) ? (body.items as Record<string, unknown>[]) : []);

/** The products an element shows: those picked (in their order), else the featured ones with specs of its category (or the shop), else the newest. */
async function productsFor(fetch: Fetch, node: StudioNode, count: number): Promise<StudioTechProduct[]> {
  const ids = (node.tech?.ids ?? []).filter((id) => /^\d{1,12}$/.test(id));
  const own = (list: Record<string, unknown>[]) => list.map(techProduct).filter((p): p is StudioTechProduct => p !== null);
  if (ids.length) {
    // The products picked that the shop still has: those (with specs) only; none of them left (a template's in another shop), the shop's own.
    const found = items(await fetch(["store", "products"], { ids: ids.join(","), per_page: ids.length, with_specs: 1 }));
    if (found.length) return own(found).slice(0, count);
  }
  const category = node.tech?.category_id && /^\d+$/.test(node.tech.category_id) ? node.tech.category_id : null;
  for (const featured of ["true", null]) {
    const found = own(items(await fetch(["store", "products"], { per_page: 30, category, featured, orderby: "popular", with_specs: 1 })));
    if (found.length >= count) return found.slice(0, count);
  }
  return [];
}

/** The element as served, or null to leave it out. */
export async function servedTech(app: App, ownCatalog: boolean, node: StudioNode, fetch: Fetch): Promise<StudioNode | null> {
  switch (node.type) {
    case "trade_in":
      return ownCatalog && techOf(app)?.tradeIn ? node : null;
    case "pc_builder":
      return ownCatalog && techOf(app)?.pcBuilder ? node : null;
    case "spec_table": {
      if (!ownCatalog) return null;
      const [product] = await productsFor(fetch, node, 1);
      if (!product) return null;
      const rows = node.tech?.rows;
      const served: StudioTechServed = { products: [rows ? { ...product, specs: product.specs.slice(0, rows) } : product] };
      return { ...node, tech_served: served };
    }
    case "compare": {
      if (!ownCatalog) return null;
      const wanted = Math.min(Math.max(node.tech?.ids?.length ?? 2, 2), 3);
      const products = await productsFor(fetch, node, wanted);
      if (products.length < 2) return null;
      // At most `rows` specs: those every product has first, in the first product's order.
      const rows = node.tech?.rows;
      if (!rows) return { ...node, tech_served: { products } };
      const keyOf = (s: { key: string | null; label: string }) => s.key ?? s.label;
      const all = [...new Set(products.flatMap((p) => p.specs.map(keyOf)))];
      const shared = all.filter((k) => products.every((p) => p.specs.some((s) => keyOf(s) === k)));
      const kept = new Set([...shared, ...all.filter((k) => !shared.includes(k))].slice(0, rows));
      return { ...node, tech_served: { products: products.map((p) => ({ ...p, specs: p.specs.filter((s) => kept.has(keyOf(s))) })) } };
    }
    case "spec_filter": {
      const key = node.tech?.spec;
      if (!ownCatalog || !isSpecKey(key)) return null;
      const category = node.tech?.category_id && /^\d+$/.test(node.tech.category_id) ? node.tech.category_id : null;
      const body = await fetch(["store", "spec-values"], { spec: key, category });
      const values = Array.isArray(body?.values) ? (body.values as { value?: unknown; count?: unknown }[]).filter((v) => typeof v.value === "string" && Number.isInteger(v.count)).map((v) => ({ value: v.value as string, count: v.count as number })) : [];
      return values.length ? { ...node, tech_served: { spec: { key, label: str(body?.label) ?? key, values: values.slice(0, node.tech?.rows ?? 12) } } } : null;
    }
    default:
      return node;
  }
}
