/**
 * Helpers for refreshing a demo in a few queries rather than one per row
 * (Admin › Demo apps, and the daily job): leave alone what is already as
 * the demo has it, and find the rows just added in one list.
 */

/** A value as text, objects' keys in order (a JSON column may give them back in another), dates as ISO, undefined as null. */
function plain(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => [k, x ?? null])) : v,
  );
}

/** Whether each of `wanted`'s fields is already so in `saved` (dates, lists and objects compared by value). */
export function unchanged(saved: object, wanted: object): boolean {
  const have = saved as Record<string, unknown>;
  return Object.entries(wanted).every(([key, value]) => plain(have[key]) === plain(value));
}

/** The newest (highest ID) of the rows that match: one just added, rather than an older one alike. */
export function newest<T extends { id: number }>(rows: readonly T[], match: (row: T) => boolean): T | undefined {
  let found: T | undefined;
  for (const row of rows) if (match(row) && (!found || row.id > found.id)) found = row;
  return found;
}

/** Whether two lists of IDs hold the same IDs. */
export function sameIds(a: readonly number[], b: readonly number[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((id) => right.has(id));
}

/** A store whose `methods` are read once per arguments while it is used (a copy each time), and can be told what a read would give. */
export type ReadOnce<T> = T & { remember(method: string, args: unknown[], value: unknown): void };

/**
 * For a run that reads the same rows again and again but doesn't change
 * them (pricing the demo's seeded orders): those reads go to the database
 * once each, and again after a write `forget` names for them.
 */
export function readOnce<T extends object>(store: T, methods: readonly (keyof T & string)[], forget: Partial<Record<keyof T & string, (...args: never[]) => string[]>> = {}): ReadOnce<T> {
  const cache = new Map<string, Promise<unknown>>();
  // A write that changes what a read gives: that read goes to the database again.
  const drop = (method: string) => {
    for (const key of [...cache.keys()]) if (key.startsWith(`${method}:`)) cache.delete(key);
  };
  const keyOf = (method: string, args: unknown[]) => `${method}:${JSON.stringify(args)}`;
  const remember = (method: string, args: unknown[], value: unknown) => void cache.set(keyOf(method, args), Promise.resolve(structuredClone(value)));
  return new Proxy(store, {
    get(target, prop, receiver) {
      if (prop === "remember") return remember;
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      const stale = forget[prop as keyof T & string] as ((...args: unknown[]) => string[]) | undefined;
      if (stale) {
        return async (...args: unknown[]) => {
          try {
            return await (value as (...a: unknown[]) => Promise<unknown>).apply(target, args);
          } finally {
            for (const method of stale(...args)) drop(method);
          }
        };
      }
      if (!(methods as readonly (string | symbol)[]).includes(prop)) return value.bind(target);
      return async (...args: unknown[]) => {
        const key = keyOf(prop as string, args);
        let found = cache.get(key);
        if (!found) {
          found = (value as (...a: unknown[]) => Promise<unknown>).apply(target, args);
          cache.set(key, found);
          found.catch(() => cache.delete(key));
        }
        return structuredClone(await found);
      };
    },
  }) as ReadOnce<T>;
}

/** Whether `saved` holds exactly the rows `wanted` lists (each field of a wanted row so in one saved row, one for one). */
export function sameRows(saved: readonly object[], wanted: readonly object[]): boolean {
  if (saved.length !== wanted.length) return false;
  const left = [...saved];
  return wanted.every((w) => {
    const i = left.findIndex((s) => unchanged(s, w));
    if (i < 0) return false;
    left.splice(i, 1);
    return true;
  });
}

/** The row without these fields (to compare a row by the rest). */
export function without<T extends object, K extends keyof T>(row: T, ...keys: K[]): Omit<T, K> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !(keys as PropertyKey[]).includes(key))) as Omit<T, K>;
}
