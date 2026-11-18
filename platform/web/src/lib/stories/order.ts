/** 165 The stories' ids in their new order: those given first (the app's own, once each), then the others in the order they had. */
export function storyOrder(current: readonly { id: number }[], ids: readonly number[]): number[] {
  const known = new Set(current.map((s) => s.id));
  const given = [...new Set(ids)].filter((id) => known.has(id));
  const rest = current.map((s) => s.id).filter((id) => !given.includes(id));
  return [...given, ...rest];
}
