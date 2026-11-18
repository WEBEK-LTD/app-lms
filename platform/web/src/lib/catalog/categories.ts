import type { CatalogCategory, CatalogProduct } from "../data/types";

/**
 * 157 The owner's own categories, told from those a demo or a template
 * brought (`sample`, lib/samples): a category the owner added or renamed in
 * the dashboard is theirs, and so is a demo's one they put one of their own
 * products in. The rest are the demo's.
 */
export function ownCategoryIds(categories: readonly CatalogCategory[], products: readonly Pick<CatalogProduct, "categoryIds" | "sample">[]): Set<number> {
  const theirs = new Set(products.filter((p) => !p.sample).flatMap((p) => p.categoryIds));
  return new Set(categories.filter((c) => !c.sample || theirs.has(c.id)).map((c) => c.id));
}

/**
 * 157 The categories the app lists, of those with products: once the owner
 * has categories of their own, only theirs; until then the demo's, so an app
 * started from a demo keeps its shop's categories.
 */
export function shownCategories<T extends { id: number }>(listed: readonly T[], own: ReadonlySet<number>): T[] {
  const mine = listed.filter((c) => own.has(c.id));
  return mine.length ? mine : [...listed];
}
