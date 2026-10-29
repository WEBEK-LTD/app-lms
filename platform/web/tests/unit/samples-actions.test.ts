import { beforeEach, describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { countList } from "@/lib/samples/lists";
import { seedSamples } from "@/lib/samples/seed";
import { NOW, setupClient } from "./helpers";

/**
 * 110.2 The dashboard's actions on sample entries: saving one makes it the
 * owner's, the first own entry asks about the rest, "Remove all samples"
 * removes them with their files.
 */

const state: { store: MemoryStore; app: App | null; blobs: Map<string, Buffer> } = { store: new MemoryStore(), app: null, blobs: new Map() };

class Redirected extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...real,
    clientFor: vi.fn(async () => {
      const app = state.app ? await state.store.getAppById(state.app.id) : null;
      const client = app ? await state.store.getClientById(app.clientId) : null;
      return { user: { id: "u", email: "owner@nour.test", name: "Owner" }, client, app, apps: app ? [app] : [], license: null, state: "active", role: "owner", staff: null };
    }),
    mayUseDashboard: () => true,
  };
});
vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("@/lib/blobs", () => ({
  getBlobStore: () => ({
    put: async (key: string, data: Buffer) => void state.blobs.set(key, data),
    get: async () => null,
    delete: async (key: string) => void state.blobs.delete(key),
  }),
}));
vi.mock("@/lib/admin/audit", () => ({ recordStaffChange: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirected(url);
  },
}));

async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof Redirected) return error.url;
    throw error;
  }
  throw new Error("no redirect");
}

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) for (const v of [value].flat()) data.append(key, v);
  return data;
};

beforeEach(async () => {
  const { store, client } = await setupClient();
  state.store = store;
  state.blobs = new Map();
  const base: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", siteUrl: null, connector: { kind: "catalog" }, appName: "Nour" };
  await store.createApp(base);
  state.app = base;
  await seedSamples({ store, putBlob: async (key, data) => void state.blobs.set(key, data), now: NOW }, base.id);
});

describe("110.2 sample entries in the dashboard's actions", () => {
  it("saving a sample product makes it the owner's; the badge's mark is gone", async () => {
    const { saveProductAction } = await import("@/app/actions/catalog");
    const [first] = await state.store.listCatalogProducts(state.app!.id);
    expect(first!.sample).toBe(true);
    const url = await redirectOf(() => saveProductAction({}, form({ id: String(first!.id), name: "Our roses", description: first!.description, price: "1290", active: "on" })));
    expect(url).toBe("/dashboard/catalog?saved=Our%20roses");
    const saved = await state.store.getCatalogProduct(state.app!.id, first!.id);
    expect(saved).toMatchObject({ name: "Our roses", sample: false });
    expect(saved!.imageAssetIds).toEqual(first!.imageAssetIds);
    expect(await countList(state.store, state.app!, "products")).toEqual({ samples: 7, own: 1 });
  });

  it("the first own product opens the list with the question, the next one doesn't", async () => {
    const { saveProductAction } = await import("@/app/actions/catalog");
    expect(await redirectOf(() => saveProductAction({}, form({ name: "My mug", description: "", price: "120", active: "on" })))).toBe("/dashboard/catalog?samples=products");
    expect(await redirectOf(() => saveProductAction({}, form({ name: "My cup", description: "", price: "90", active: "on" })))).toBe("/dashboard/catalog?saved=My%20cup");
  });

  it("Remove all samples removes them and their files, and says how many went", async () => {
    const { removeSamplesAction } = await import("@/app/actions/samples");
    const files = state.blobs.size;
    expect(files).toBe(8);
    expect(await redirectOf(() => removeSamplesAction(form({ list: "products" })))).toBe("/dashboard/catalog?samplesRemoved=products.8");
    expect(await state.store.listCatalogProducts(state.app!.id)).toEqual([]);
    expect(await state.store.listCatalogCategories(state.app!.id)).toEqual([]);
    expect(state.blobs.size).toBe(0);
    // A list it doesn't know is refused.
    expect(await redirectOf(() => removeSamplesAction(form({ list: "orders" })))).toBe("/dashboard");
  });
});
