import type { StudioNode, StudioPage } from "../pages/types";

/**
 * 103R Walking a Studio page's elements: a layout's `children` and an items
 * element's `card`.
 */

/** Every element, parents before their children. */
export function eachNode(node: StudioNode, visit: (node: StudioNode, parent: StudioNode | null) => void, parent: StudioNode | null = null): void {
  visit(node, parent);
  for (const child of node.children ?? []) eachNode(child, visit, node);
  if (node.card) eachNode(node.card, visit, node);
}

/** The elements as a list, parents first. */
export function allNodes(page: Pick<StudioPage, "body">): StudioNode[] {
  const out: StudioNode[] = [];
  eachNode(page.body, (n) => out.push(n));
  return out;
}

/**
 * A copy with each element changed by `change` (children first) and left out
 * when it returns null. The page's own element (the root) is never left out.
 */
export function mapTree(node: StudioNode, change: (node: StudioNode) => StudioNode | null): StudioNode | null {
  const children = node.children?.map((c) => mapTree(c, change)).filter((c): c is StudioNode => c !== null);
  const card = node.card ? mapTree(node.card, change) : node.card;
  return change({ ...node, ...(children ? { children } : {}), ...(node.card !== undefined ? { card } : {}) });
}

/** The same, async (filling lists from the source). */
export async function mapTreeAsync(node: StudioNode, change: (node: StudioNode) => Promise<StudioNode | null>): Promise<StudioNode | null> {
  const children: StudioNode[] = [];
  for (const child of node.children ?? []) {
    const done = await mapTreeAsync(child, change);
    if (done) children.push(done);
  }
  const card = node.card ? await mapTreeAsync(node.card, change) : node.card;
  return change({ ...node, ...(node.children ? { children } : {}), ...(node.card !== undefined ? { card } : {}) });
}

/** The element with this ID, or null. */
export function findNode(root: StudioNode, id: string): StudioNode | null {
  let found: StudioNode | null = null;
  eachNode(root, (n) => {
    if (!found && n.id === id) found = n;
  });
  return found;
}

/**
 * 124 What opens a page, for Studio's "Delete this page": the tabs and the side
 * menu's entries that open it, and the other pages with an element or a block
 * that does. The page itself doesn't count.
 */
export function studioPageOpeners(
  layout: { tabs: readonly { label?: string; target?: { type: string; page_slug?: string | null } | null }[]; menu?: readonly { label?: string; target?: { type: string; page_slug?: string | null } | null }[] | null; pages: readonly { slug: string; title?: string; studio?: { body: StudioNode } | null; blocks?: readonly unknown[] }[] },
  slug: string,
): { kind: "tab" | "menu" | "page"; name: string }[] {
  const opens = (a: { type: string; page_slug?: string | null } | null | undefined) => a?.type === "page" && a.page_slug === slug;
  const out: { kind: "tab" | "menu" | "page"; name: string }[] = [];
  for (const t of layout.tabs) if (opens(t.target)) out.push({ kind: "tab", name: t.label || "" });
  for (const m of layout.menu ?? []) if (opens(m.target)) out.push({ kind: "menu", name: m.label || "" });
  for (const p of layout.pages) {
    if (p.slug === slug) continue;
    let found = JSON.stringify(p.blocks ?? []).includes(`"page_slug":${JSON.stringify(slug)}`);
    if (!found && p.studio) {
      eachNode(p.studio.body, (n) => {
        if (opens(n.action ?? null) || (n.card && JSON.stringify(n.card).includes(`"page_slug":${JSON.stringify(slug)}`))) found = true;
      });
    }
    if (found) out.push({ kind: "page", name: p.title || p.slug });
  }
  return out;
}
