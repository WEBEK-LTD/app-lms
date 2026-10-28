import { STUDIO_LAYOUT_TYPES, type StudioNode, type StudioNodeType, type StudioPage } from "../pages/types";
import { eachNode } from "./tree";

/**
 * 103R Editing a Studio page's tree in the editor: each change returns a new
 * page, so undo and redo keep the ones before it.
 */

/** Elements that hold others (`spacer` holds none). */
export function holdsChildren(node: Pick<StudioNode, "type">): boolean {
  return (STUDIO_LAYOUT_TYPES as readonly string[]).includes(node.type) && node.type !== "spacer";
}

/** Where an element sits: its parent and its place among the parent's children (null for the page's own element). */
export interface NodePlace {
  parent: StudioNode;
  index: number;
}

export function placeOf(root: StudioNode, id: string): NodePlace | null {
  let found: NodePlace | null = null;
  eachNode(root, (node) => {
    if (found) return;
    const index = (node.children ?? []).findIndex((c) => c.id === id);
    if (index >= 0) found = { parent: node, index };
  });
  return found;
}

/** The IDs from the page's own element down to this one. */
export function pathTo(root: StudioNode, id: string): string[] {
  const walk = (node: StudioNode, trail: string[]): string[] | null => {
    const here = [...trail, node.id];
    if (node.id === id) return here;
    for (const child of node.children ?? []) {
      const found = walk(child, here);
      if (found) return found;
    }
    if (node.card) return walk(node.card, here);
    return null;
  };
  return walk(root, []) ?? [];
}

/** Whether `id` is `ancestorId` or inside it. */
export function isInside(root: StudioNode, id: string, ancestorId: string): boolean {
  return pathTo(root, id).includes(ancestorId);
}

function mapById(node: StudioNode, id: string, change: (node: StudioNode) => StudioNode): StudioNode {
  if (node.id === id) return change(node);
  let changed = false;
  const children = node.children?.map((c) => {
    const next = mapById(c, id, change);
    if (next !== c) changed = true;
    return next;
  });
  const card = node.card ? mapById(node.card, id, change) : node.card;
  if (card !== node.card) changed = true;
  return changed ? { ...node, ...(children ? { children } : {}), ...(node.card !== undefined ? { card } : {}) } : node;
}

/** Changes one element's fields (`undefined` takes a field out). */
export function updateNode(page: StudioPage, id: string, patch: Partial<StudioNode>): StudioPage {
  return {
    ...page,
    body: mapById(page.body, id, (node) => {
      const next = { ...node, ...patch } as StudioNode & Record<string, unknown>;
      for (const [key, value] of Object.entries(patch)) if (value === undefined) delete next[key];
      return next;
    }),
  };
}

/** Takes an element out (never the page's own). */
export function removeNode(page: StudioPage, id: string): StudioPage {
  if (id === page.body.id) return page;
  const without = (node: StudioNode): StudioNode => {
    const children = node.children?.filter((c) => c.id !== id).map(without);
    const card = node.card ? (node.card.id === id ? null : without(node.card)) : node.card;
    return { ...node, ...(children ? { children } : {}), ...(node.card !== undefined ? { card } : {}) };
  };
  return { ...page, body: without(page.body) };
}

/** Puts an element into `parentId` at `index` (at the end when left out). */
export function insertNode(page: StudioPage, parentId: string, node: StudioNode, index?: number): StudioPage {
  return {
    ...page,
    body: mapById(page.body, parentId, (parent) => {
      const children = [...(parent.children ?? [])];
      children.splice(index ?? children.length, 0, node);
      return { ...parent, children };
    }),
  };
}

/**
 * Moves an element into `parentId` at `index` (counted before it's taken out
 * of its place). Moving an element into itself does nothing.
 */
export function moveNode(page: StudioPage, id: string, parentId: string, index: number): StudioPage {
  if (id === page.body.id || isInside(page.body, parentId, id)) return page;
  const from = placeOf(page.body, id);
  if (!from) return page;
  const node = from.parent.children![from.index]!;
  const adjusted = from.parent.id === parentId && from.index < index ? index - 1 : index;
  return insertNode(removeNode(page, id), parentId, node, adjusted);
}

/** A copy of an element and what it holds, with new IDs. */
export function cloneWithNewIds(node: StudioNode, newId: () => string): StudioNode {
  return {
    ...node,
    id: newId(),
    ...(node.children ? { children: node.children.map((c) => cloneWithNewIds(c, newId)) } : {}),
    ...(node.card ? { card: cloneWithNewIds(node.card, newId) } : {}),
  };
}

/** Copies an element right after itself; the copy's ID, or null. */
export function duplicateNode(page: StudioPage, id: string, newId: () => string): { page: StudioPage; id: string } | null {
  const place = placeOf(page.body, id);
  if (!place) return null;
  const copy = cloneWithNewIds(place.parent.children![place.index]!, newId);
  return { page: insertNode(page, place.parent.id, copy, place.index + 1), id: copy.id };
}

/** Wraps an element in a new layout (a row, a column, a stack…). */
export function wrapNode(page: StudioPage, id: string, type: StudioNodeType, newId: () => string): { page: StudioPage; id: string } | null {
  const place = placeOf(page.body, id);
  if (!place || !(STUDIO_LAYOUT_TYPES as readonly string[]).includes(type)) return null;
  const inner = place.parent.children![place.index]!;
  const wrapper: StudioNode = { id: newId(), type, children: [inner], ...(type === "row" ? { gap: 8 } : {}) };
  const page2 = removeNode(page, id);
  return { page: insertNode(page2, place.parent.id, wrapper, place.index), id: wrapper.id };
}

/** Counts a page's elements. */
export function nodeCount(page: StudioPage): number {
  let n = 0;
  eachNode(page.body, () => (n += 1));
  return n;
}

/** Undo and redo: up to `limit` pages back. */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export function historyOf<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

export function pushHistory<T>(h: History<T>, next: T, limit = 100): History<T> {
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-limit), present: next, future: [] };
}

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1]!, future: [h.present, ...h.future] };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0]!, future: h.future.slice(1) };
}
