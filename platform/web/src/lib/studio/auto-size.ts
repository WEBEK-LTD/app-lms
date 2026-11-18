import type { StudioNode, StudioSize } from "../pages/types";

/**
 * 159 Sizes are automatic, by hand only when the owner wants it.
 *
 * An element's size is automatic: as its template or the layout designs it.
 * Changing its width or height by hand (the inspector's size fields, a
 * corner of the selection on the canvas) asks first; once the owner says
 * so, the element keeps `manual_size`, the automatic sizes it replaced, and
 * its `width` and `height` are the owner's. "Back to automatic" (or a double
 * click on a corner) puts those back and forgets `manual_size`.
 *
 * The layout's own automatic size here is a cover's top bar (Leqaa's
 * search, wordmark and bag over the stories): it spans the cover, its
 * wordmark taking the room between the buttons, whatever width it was given
 * before the owner was asked (Kech Flora's had a number from a corner drag,
 * which put the bag about three quarters of the way across a phone). Studio's
 * canvas, the hosted API (lib/hosted/pages) and the app
 * (mobile page_models.dart `_autoSizedLayers`) draw it so.
 */

/** Whether its size was changed by hand, after Studio asked. */
export function sizedByHand(node: Pick<StudioNode, "manual_size">): boolean {
  return node.manual_size !== undefined && node.manual_size !== null;
}

/** A button, or anything with a tap of its own (Leqaa's round search and bag). */
function opens(node: StudioNode): boolean {
  return node.type === "button" || !!node.action;
}

/**
 * A cover's top bar: a row laid over a stack's first layer (any later layer,
 * not on a spot of its own, not scrolling sideways) that holds two or more
 * elements that open something.
 */
export function isCoverBar(holder: StudioNode | null | undefined, node: StudioNode): boolean {
  if (holder?.type !== "stack" || node.type !== "row" || node.scroll || node.place || node.hidden) return false;
  const layers = (holder.children ?? []).filter((k) => !k.hidden);
  if (layers.findIndex((k) => k.id === node.id) <= 0) return false;
  return (node.children ?? []).filter((k) => !k.hidden && opens(k)).length >= 2;
}

/** A bar's wordmark: when nothing in it fills, its one text (not sized by hand) takes the room between its buttons. */
export function barWordmark(bar: StudioNode): StudioNode | null {
  const shown = (bar.children ?? []).filter((k) => !k.hidden);
  if (shown.some((k) => k.width === "fill")) return null;
  const texts = shown.filter((k) => k.type === "text");
  return texts.length === 1 && !sizedByHand(texts[0]!) ? texts[0]! : null;
}

/** Across all the room it has, on phones and tablets. */
function filling(node: StudioNode): StudioNode {
  if (node.width === "fill" && node.tablet?.width === undefined) return node;
  const out: StudioNode = { ...node, width: "fill" };
  if (node.tablet?.width !== undefined) {
    const { width: _w, ...tablet } = node.tablet;
    void _w;
    if (Object.keys(tablet).length) out.tablet = tablet;
    else delete out.tablet;
  }
  return out;
}

/**
 * The elements at their automatic sizes: each cover's top bar, unless sized by hand, across its cover, its wordmark
 * between its buttons. What needs nothing of it is the same object (the canvas draws it again and again).
 */
export function autoSized(body: StudioNode): StudioNode {
  const walk = (node: StudioNode): StudioNode => {
    const kids = node.children?.map(walk);
    const card = node.card ? walk(node.card) : node.card;
    let children = kids && kids.some((k, i) => k !== node.children![i]) ? kids : node.children;
    if (node.type === "stack" && children?.length) {
      const holder = { ...node, children };
      const laid = children.map((child) => {
        if (!isCoverBar(holder, child)) return child;
        const bar = sizedByHand(child) ? child : filling(child);
        const word = barWordmark(bar);
        const filled = word ? filling(word) : word;
        return word && filled !== word ? { ...bar, children: bar.children!.map((k) => (k === word ? filled! : k)) } : bar;
      });
      if (laid.some((k, i) => k !== children![i])) children = laid;
    }
    return children === node.children && card === node.card ? node : { ...node, ...(children ? { children } : {}), ...(card !== undefined ? { card } : {}) };
  };
  return walk(body);
}

/** Its automatic width and height: as the canvas draws it before any change by hand (`autoSized`). */
export function automaticSize(body: StudioNode, id: string): { width?: StudioSize; height?: StudioSize } {
  if (body.id === id) return { width: body.width, height: body.height };
  let found: StudioNode | null = null;
  const visit = (node: StudioNode) => {
    for (const child of [...(node.children ?? []), ...(node.card ? [node.card] : [])]) {
      if (found) return;
      if (child.id === id) found = child;
      else visit(child);
    }
  };
  visit(autoSized(body));
  const node = found as StudioNode | null;
  return node ? { width: node.width, height: node.height } : {};
}

/**
 * Going by hand, once the owner said so: from its automatic size (kept for "Back to automatic"), with the change asked
 * for. `drawn` is its automatic width and height (`automaticSize`).
 */
export function byHand(drawn: { width?: StudioSize; height?: StudioSize }, change: Partial<StudioNode> = {}): Partial<StudioNode> {
  return { width: drawn.width, height: drawn.height, manual_size: { width: drawn.width ?? null, height: drawn.height ?? null }, ...change };
}

/** Back to automatic: the size it had before it was changed by hand (its template's), else the layout's own; on tablets too. */
export function backToAutomatic(node: StudioNode): Partial<StudioNode> {
  const m = node.manual_size;
  const tablet = node.tablet ? Object.fromEntries(Object.entries(node.tablet).filter(([k]) => k !== "width" && k !== "height")) : null;
  return {
    width: m?.width ?? undefined,
    height: m?.height ?? undefined,
    manual_size: undefined,
    ...(node.tablet ? { tablet: tablet && Object.keys(tablet).length ? (tablet as StudioNode["tablet"]) : undefined } : {}),
  };
}
