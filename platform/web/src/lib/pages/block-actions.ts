import type { Action, LayoutBlock } from "./types";

/**
 * 33 The tap actions in a block: its own, "See all", and those of its
 * entries (slides, quick links, people). One place, so renaming a page,
 * the plan's limits and the editor's checks see them all.
 */
export function blockActions(block: LayoutBlock): Action[] {
  const actions: (Action | null | undefined)[] = [block.action, block.see_all];
  for (const slide of block.slides ?? []) actions.push(slide.action);
  for (const link of block.links ?? []) actions.push(link.action);
  for (const person of block.people ?? []) actions.push(person.action);
  return actions.filter((a): a is Action => Boolean(a));
}

/**
 * The block with `fix` applied to each of its actions. A quick link whose
 * action becomes null is left out: a tile must open something.
 */
export function mapBlockActions(block: LayoutBlock, fix: (action: Action) => Action | null): LayoutBlock {
  const out: LayoutBlock = { ...block };
  const one = (action: Action | null | undefined) => (action ? fix(action) : action);
  if (block.action !== undefined) out.action = one(block.action);
  if (block.see_all !== undefined) out.see_all = one(block.see_all);
  if (block.slides) out.slides = block.slides.map((s) => ({ ...s, action: one(s.action) ?? null }));
  if (block.people) out.people = block.people.map((p) => ({ ...p, action: one(p.action) ?? null }));
  if (block.links) {
    out.links = block.links.flatMap((l) => {
      const action = fix(l.action);
      return action ? [{ ...l, action }] : [];
    });
  }
  return out;
}
