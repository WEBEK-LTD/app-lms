import type { LayoutContent, LayoutPage, StudioNode } from "../pages/types";

/**
 * 132.73 What one step of the editor's undo history did, read by comparing
 * the draft before and after it (nothing is stored with the step): an
 * element added, deleted, moved or changed, the header or the page's own
 * settings, a page started again from a template, a page added or deleted,
 * a whole design, the tabs, the look, the languages. The editor words it
 * ("Added Flash sale", "Changed Text") in the dashboard's language.
 */
export type HistoryStep =
  | { kind: "added" | "deleted" | "moved" | "changed"; node: StudioNode; page: string }
  | { kind: "header" | "page" | "replaced"; page: string }
  | { kind: "page_added" | "page_deleted"; page: string }
  | { kind: "design" | "tabs" | "look" | "languages" | "other" };

interface Place {
  node: StudioNode;
  parent: string | null;
  index: number;
}

function places(root: StudioNode): Map<string, Place> {
  const out = new Map<string, Place>();
  const walk = (node: StudioNode, parent: string | null, index: number) => {
    out.set(node.id, { node, parent, index });
    (node.children ?? []).forEach((child, i) => walk(child, node.id, i));
  };
  walk(root, null, 0);
  return out;
}

/** A node's own settings, without its children: what "changed" compares. */
function own(node: StudioNode): string {
  const { children: _children, ...rest } = node;
  return JSON.stringify(rest);
}

const titleOf = (page: LayoutPage) => page.title || page.slug;

/** The first of `ids` in the page's order (a section added brings its children: the section is named). */
function topmost(ids: string[], map: Map<string, Place>): StudioNode {
  const set = new Set(ids);
  const top = ids.find((id) => {
    const parent = map.get(id)?.parent;
    return !parent || !set.has(parent);
  });
  return map.get(top ?? ids[0]!)!.node;
}

export function describeStep(before: LayoutContent, after: LayoutContent): HistoryStep {
  if (after.pages.length > before.pages.length) {
    const added = after.pages.find((p) => !before.pages.some((q) => q.slug === p.slug));
    if (added) return { kind: "page_added", page: titleOf(added) };
  }
  if (after.pages.length < before.pages.length) {
    const gone = before.pages.find((p) => !after.pages.some((q) => q.slug === p.slug));
    if (gone) return { kind: "page_deleted", page: titleOf(gone) };
  }
  const changedPages = after.pages.filter((p) => {
    const was = before.pages.find((q) => q.slug === p.slug);
    return !was || was.studio !== p.studio;
  });
  if (changedPages.length > 1) return { kind: "design" };
  if (changedPages.length === 1) {
    const page = changedPages[0]!;
    const was = before.pages.find((q) => q.slug === page.slug)?.studio ?? null;
    const now = page.studio ?? null;
    const name = titleOf(page);
    if (!was || !now) return { kind: "replaced", page: name };
    if (was.body !== now.body) {
      const a = places(was.body);
      const b = places(now.body);
      const added = [...b.keys()].filter((id) => !a.has(id));
      const removed = [...a.keys()].filter((id) => !b.has(id));
      if (added.length && removed.length) return { kind: "replaced", page: name };
      if (added.length) return { kind: "added", node: topmost(added, b), page: name };
      if (removed.length) return { kind: "deleted", node: topmost(removed, a), page: name };
      // Moved: to another parent, else within its parent the one whose place changed the most (its neighbours shift by one).
      const reparented = [...b.keys()].filter((id) => a.get(id)!.parent !== b.get(id)!.parent);
      if (reparented.length) return { kind: "moved", node: topmost(reparented, b), page: name };
      let mover: StudioNode | null = null;
      let most = 0;
      for (const [id, p] of b) {
        const shift = Math.abs(p.index - a.get(id)!.index);
        if (shift > most) {
          most = shift;
          mover = p.node;
        }
      }
      if (mover) return { kind: "moved", node: mover, page: name };
      const changed = [...b.values()].filter((p) => own(p.node) !== own(a.get(p.node.id)!.node));
      if (changed.length) return { kind: "changed", node: changed[changed.length - 1]!.node, page: name };
    }
    if (was.header !== now.header) return { kind: "header", page: name };
    return { kind: "page", page: name };
  }
  if (before.tabs !== after.tabs || before.tab_bar !== after.tab_bar || before.menu !== after.menu) return { kind: "tabs" };
  if (before.appearance !== after.appearance || before.look_mode !== after.look_mode) return { kind: "look" };
  if (before.languages !== after.languages || before.strings !== after.strings) return { kind: "languages" };
  return { kind: "other" };
}
