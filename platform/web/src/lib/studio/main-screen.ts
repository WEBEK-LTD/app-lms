import type { Action, StudioNode } from "../pages/types";

/**
 * 183 A button on a Studio page that names nothing to open (`brand`'s
 * "Start now" in a project made before, or one whose owner chose nothing)
 * opens the app's main screen (lib/app/kinds.ts `mainScreenOf`), so the app
 * has no dead buttons. The owner's own choice always wins. The buttons of a
 * list's card are left as they are: the card opens its entry.
 */

/** Whether the element is a button that opens nothing of its own. */
export function opensNothing(node: StudioNode): boolean {
  return node.type === "button" && !node.action;
}

/** The page's own buttons (not a list's card's) that open nothing of their own. */
export function mainScreenButtons(body: StudioNode): Set<string> {
  const ids = new Set<string>();
  const walk = (node: StudioNode) => {
    if (opensNothing(node)) ids.add(node.id);
    node.children?.forEach(walk);
  };
  walk(body);
  return ids;
}

/** The page's body with each of those buttons opening `main`. */
export function withMainScreen(body: StudioNode, main: Action): StudioNode {
  const walk = (node: StudioNode): StudioNode => {
    const children = node.children?.map(walk);
    const own = children ? { ...node, children } : node;
    return opensNothing(own) ? { ...own, action: { ...main } } : own;
  };
  return walk(body);
}
