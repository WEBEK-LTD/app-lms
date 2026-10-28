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
