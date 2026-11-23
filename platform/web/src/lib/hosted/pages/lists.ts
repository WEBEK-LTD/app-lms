import type { ItemsQuery, StudioNode } from "../../pages/types";
import { APP_WORDS } from "../../studio/app-words";
import { DEMO_FACTS } from "../../studio/demo-templates";

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
  // 209 Still at the list's highest price ("Gifts under 100" never shows dearer ones).
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

/** The template's words for its sample bouquet ("Blush Garden" and its brackets), in Studio's three languages. */
function sampleWords(word: "lqBouquetTitle" | "lqBouquetLine"): Set<string> {
  const demo = DEMO_FACTS.flowers?.[word];
  return new Set([...(["en", "ar", "tr"] as const).map((l) => APP_WORDS[l][word]), ...(demo ? Object.values(demo) : [])]);
}
const SAMPLE_TITLES = sampleWords("lqBouquetTitle");
const SAMPLE_LINES = sampleWords("lqBouquetLine");

/**
 * 164 Apps made from Leqaa's template before it bound its signature bouquet
 * to a product: the photos (a gallery) and the words of the template's
 * sample bouquet ("Blush Garden") showed whatever the shop had. Served as the
 * template makes it now: one of the shop's products, the words' column its
 * card, its name and price in place of the sample's, its photo in the
 * gallery's place; so it follows the lists' rules (best seller, else newest,
 * left out with none). Owners' own words are left as they are.
 */
export function withSampleProduct(root: StudioNode): StudioNode {
  const sample = (n: StudioNode) => n.type === "text" && !n.bind && typeof n.text === "string" && SAMPLE_TITLES.has(n.text);
  const walk = (node: StudioNode): StudioNode => {
    if (!node.children) return node;
    const kids = node.children;
    const out: StudioNode[] = [];
    kids.forEach((child, i) => {
      const words = child.type === "column" && (child.children ?? []).some(sample) ? child : null;
      if (child.type === "gallery" && kids[i + 1]?.type === "column" && (kids[i + 1]!.children ?? []).some(sample)) return;
      if (!words) {
        out.push(walk(child));
        return;
      }
      const gallery = kids[i - 1]?.type === "gallery" ? kids[i - 1]! : null;
      const bound = (n: StudioNode, bind: "title" | "price"): StudioNode => {
        const { text: _t, translations: _tr, ...rest } = n;
        void _t;
        void _tr;
        return { ...rest, bind };
      };
      out.push({
        id: words.id,
        type: "items",
        ...((gallery?.name ?? words.name) ? { name: gallery?.name ?? words.name } : {}),
        source: "products",
        layout: "list",
        ...(gallery?.padding ? { padding: gallery.padding } : {}),
        query: { limit: 1, category_id: null, featured: false, sort: "popular", ids: [] },
        card: {
          ...(({ padding: _p, ...own }) => (void _p, own))(words),
          id: `${words.id}-card`,
          children: [
            { id: `${words.id}-photo`, type: "image", bind: "image", width: "fill", height: typeof gallery?.height === "number" ? gallery.height : 380, radius: gallery?.gallery?.radius ?? 28, fit: "cover" },
            ...words.children!.map((n) => (sample(n) ? bound(n, "title") : n.type === "text" && typeof n.text === "string" && SAMPLE_LINES.has(n.text) ? bound(n, "price") : n)),
          ],
        },
      });
    });
    return { ...node, children: out };
  };
  return walk(root);
}
