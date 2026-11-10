import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { ALL_DEMO_TYPES, type DemoId } from "@/lib/demo/constants";
import { newest, readOnce, sameIds, sameRows, unchanged, without } from "@/lib/demo/rows";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { KEY, NOW } from "./helpers";

/**
 * Admin › Demo apps refreshes one demo per request, and the live database
 * answers each query in tens of milliseconds over the network, so a demo's
 * refresh has to stay at a few score queries: the school's was 764 and the
 * marketplace's 302, row by row, before they were batched. Each store call
 * here is a query or two on MySQL.
 */

/** A store that counts the calls made to it (not the ones it makes to itself). */
function counted(store: MemoryStore): { store: MemoryStore; calls: () => number; reset: () => void } {
  let calls = 0;
  const proxy = new Proxy(store, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        calls++;
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
  return { store: proxy, calls: () => calls, reset: () => void (calls = 0) };
}

function deps(store: MemoryStore, now: Date = NOW): DemoSetupDeps {
  return { store, encryptionKey: KEY, putBlob: async () => {}, assetUrl: (id) => `https://yallapp.test/a/${id}`, platformUrl: "https://yallapp.test", contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" }, actorEmail: "admin@yallapp.test", now };
}

/** Store calls a demo's refresh may make: the school and the marketplace do the most (the marketplace's 55 photos, one look each). */
const BUDGET: Partial<Record<DemoId, number>> = { school: 125, marketplace: 160 };

beforeEach(() => clearPlatformSettingsCache());

describe("a demo's refresh in a few queries", { timeout: 60_000 }, () => {
  it("keeps each demo's refresh, and the school's and the marketplace's, within their queries", async () => {
    const { store, calls, reset } = counted(new MemoryStore());
    await setupDemoApps(deps(store));
    const used: Record<string, number> = {};
    for (const type of ALL_DEMO_TYPES) {
      reset();
      await setupDemoApps(deps(store, new Date(NOW.getTime() + 60_000)), [type]);
      used[type] = calls();
    }
    for (const type of ALL_DEMO_TYPES) expect(used[type], type).toBeLessThanOrEqual(BUDGET[type] ?? 50);
  });
});

describe("refreshing in a few queries", () => {
  it("leaves alone what is already so, values compared as values", () => {
    expect(unchanged({ name: "Lina", at: new Date(NOW), tags: ["a"], address: { city: "Cairo", street: "9" }, extra: 1 }, { name: "Lina", at: new Date(NOW), tags: ["a"], address: { street: "9", city: "Cairo" } })).toBe(true);
    expect(unchanged({ name: "Lina", email: undefined }, { name: "Lina", email: null })).toBe(true);
    expect(unchanged({ name: "Lina" }, { name: "Lina Haddad" })).toBe(false);
    expect(unchanged({ tags: ["a", "b"] }, { tags: ["b", "a"] })).toBe(false);
    expect(newest([{ id: 3, t: "a" }, { id: 9, t: "a" }, { id: 12, t: "b" }], (r) => r.t === "a")?.id).toBe(9);
    expect(newest([{ id: 3 }], () => false)).toBeUndefined();
    expect(sameIds([1, 2, 2], [2, 1])).toBe(true);
    expect(sameIds([1, 2], [1, 3])).toBe(false);
    // The same rows, one for one, in any order; a row's other fields don't count.
    expect(sameRows([{ id: 1, t: "a", at: 1 }, { id: 2, t: "b", at: 2 }], [{ t: "b" }, { t: "a" }])).toBe(true);
    expect(sameRows([{ t: "a" }, { t: "a" }], [{ t: "a" }, { t: "b" }])).toBe(false);
    expect(sameRows([{ t: "a" }], [{ t: "a" }, { t: "a" }])).toBe(false);
    expect(without({ id: 1, t: "a", at: 2 }, "id", "at")).toEqual({ t: "a" });
  });

  it("reads once what a run doesn't change, and again after a write that changes it", async () => {
    let reads = 0;
    let balance = 10;
    const source = {
      async price(id: number) {
        reads++;
        return { id, cents: 100 };
      },
      async balance() {
        reads++;
        return balance;
      },
      async pay(cents: number) {
        balance -= cents;
      },
      async other() {
        return "as is";
      },
    };
    const store = readOnce(source, ["price", "balance"], { pay: () => ["balance"] });
    const first = await store.price(1);
    first.cents = 0;
    // A copy each time: changing what it gave changes nothing.
    expect(await store.price(1)).toEqual({ id: 1, cents: 100 });
    expect(reads).toBe(1);
    await store.price(2);
    expect(reads).toBe(2);
    store.remember("price", [3], { id: 3, cents: 300 });
    expect(await store.price(3)).toEqual({ id: 3, cents: 300 });
    expect(reads).toBe(2);
    expect(await store.balance()).toBe(10);
    await store.pay(4);
    expect(await store.balance()).toBe(6);
    expect(await store.balance()).toBe(6);
    expect(reads).toBe(4);
    expect(await store.other()).toBe("as is");
  });
});
