import type { ItemsQuery, StudioNode } from "../../pages/types";

/**
 * 164 A Studio list of the shop's products is never an empty section in the
 * app. A list bound to what a real shop may not have (its featured products,
 * a category, products picked by hand or a template's sample products) shows
 * the shop's best sellers instead, else its newest; and a list with nothing
 * to show goes together with its title. Done when the page is served, so the
 * apps already made from a template (Leqaa's "Picked for you" bound to
 * featured products) are right without their owners editing anything.
 */

/**
 * The lists to try when a products list has nothing: the best sellers (the
 * stores order them by sales, the newest first among equals), then the
 * newest. None for a list of products on sale, which goes while no sale is on
 * (other products under "Sale" would say what isn't so), nor for a list
 * already showing every product.
 */
export function productFallbacks(query: ItemsQuery): ItemsQuery[] {
  if (query.on_sale) return [];
  const all = { ...query, featured: false, category_id: null, ids: [] as string[] };
  const narrowed = query.featured || query.category_id !== null || query.ids.length > 0;
  const tries: ItemsQuery[] = [];
  if (narrowed || query.sort !== "popular") tries.push({ ...all, sort: "popular" });
  if (narrowed || query.sort !== "newest") tries.push({ ...all, sort: "newest" });
  return tries;
}

/** Elements that only say something: words, icons, buttons and the rows and columns of them (a section's title with its "Shop all"). */
function titleOnly(node: StudioNode): boolean {
  if (node.type === "text" || node.type === "icon" || node.type === "button" || node.type === "divider" || node.type === "spacer") return true;
  if (node.type === "row" || node.type === "column") return (node.children ?? []).length > 0 && node.children!.every(titleOnly);
  return false;
}

/**
 * Each list's title, by the title's ID: the element just before the list,
 * only words, either named as the list is (a template's section title, the
 * list named after it) or the list's one companion in what holds them (a
 * column of a title and its list).
 */
export function listHeadings(root: StudioNode): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (node: StudioNode) => {
    const kids = node.children ?? [];
    kids.forEach((child, i) => {
      if (child.type !== "items" || i === 0) return;
      const before = kids[i - 1]!;
      if (before.heads || !titleOnly(before)) return;
      const named = Boolean(child.name) && before.name === child.name;
      const pair = kids.length === 2 && node.id !== root.id;
      if (named || pair) out.set(before.id, child.id);
    });
    kids.forEach(walk);
  };
  walk(root);
  return out;
}

/**
 * The served page with each list's title marked (`heads`, so the app hides it
 * with its list, as with what was seen lately), and left out with a list the
 * servers left out; a row or column left empty by that goes too.
 */
export function withListHeadings(root: StudioNode, headings: Map<string, string>): StudioNode {
  if (!headings.size) return root;
  const walk = (node: StudioNode): StudioNode | null => {
    if (!node.children) return node;
    const ids = new Set(node.children.map((c) => c.id));
    const children: StudioNode[] = [];
    let dropped = false;
    for (const child of node.children) {
      const list = headings.get(child.id);
      if (list !== undefined && !ids.has(list)) {
        dropped = true;
        continue;
      }
      const kept = walk(child);
      if (!kept) {
        dropped = true;
        continue;
      }
      children.push(list !== undefined ? { ...kept, heads: list } : kept);
    }
    if (dropped && !children.length && node.id !== root.id) return null;
    return { ...node, children };
  };
  return walk(root) ?? root;
}
