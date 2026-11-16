import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KINDS, ENGINES } from "@/lib/app/kinds";
import { ownContentSetup } from "@/lib/app/own-content";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import type { App, CatalogProductInput } from "@/lib/data/types";
import { dashboardTextFor } from "@/lib/dashboard-words";
import { studioProjectNav } from "@/lib/studio/project-nav";
import { currentOf } from "@/app/studio/project/project-nav";
import { NOW, setupClient } from "./helpers";

/**
 * 132.150–132.152 Studio's console: every group of every kind's menu has
 * its icon on the rail (of the site's icon font), the page open is found
 * with its group for the panel and the bar, and the Products inspector's
 * Featured switch changes only the account's own product, with the same
 * checks as showing or hiding it.
 */

const WEB = path.resolve(__dirname, "../..");
const ICONS = new Set([...readFileSync(path.join(WEB, "src/components/icon-names.ts"), "utf8").matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]!));

function project(kindId: string): App {
  const kind = KINDS.find((k) => k.id === kindId)!;
  const fresh = newApp("client-1", null, NOW, kind.engine, kind.vertical);
  const base = { ...fresh, section: "studio", appName: kind.name } as App;
  return { ...base, backend: "hosted", ...ownContentSetup(ENGINES[kind.engine].ownContent.kind, base), websiteDoneAt: NOW } as App;
}

describe("132.150 the console's rail and panel", () => {
  it.each(KINDS.map((k) => k.id).filter((id, i, all) => all.indexOf(id) === i))("%s: each group has an icon of the font, none twice", (id) => {
    const groups = studioProjectNav({ app: project(id), text: dashboardTextFor("ar"), can: () => true, supportUrl: null });
    const rail = groups.filter((g) => g.id !== "start");
    for (const group of groups) expect(ICONS.has(group.icon), `${id} ${group.id} ${group.icon}`).toBe(true);
    expect(new Set(rail.map((g) => g.icon)).size).toBe(rail.length);
    // A store's group is its shop front.
    if (id === "store") expect(groups.find((g) => g.id === "kind")?.icon).toBe("storefront");
  });

  it("finds the page open and its group: the closest link, a setup step by its step", () => {
    const groups = studioProjectNav({ app: project("store"), text: dashboardTextFor("en"), can: () => true, supportUrl: null });
    expect(currentOf(groups, "/studio/project", null)).toMatchObject({ item: { href: "/studio/project" }, group: { id: "start" } });
    expect(currentOf(groups, "/studio/project/catalog/12", null)).toMatchObject({ item: { href: "/studio/project/catalog" }, group: { id: "kind" } });
    expect(currentOf(groups, "/studio/project/selling/messages", null)).toMatchObject({ item: { href: "/studio/project/selling/messages" } });
    expect(currentOf(groups, "/studio/project/setup", "branding")).toMatchObject({ item: { href: "/studio/project/setup?step=branding" }, group: { id: "app" } });
    expect(currentOf(groups, "/studio/project/setup", null)).toMatchObject({ item: { href: "/studio/project/setup" } });
    expect(currentOf(groups, "/studio/team", null)).toMatchObject({ group: { id: "account" } });
    expect(currentOf(groups, "/studio/project/nowhere", null)).toBeNull();
  });
});

const state: { store: MemoryStore; app: App | null } = { store: new MemoryStore(), app: null };
let permission: string | null = null;

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...real,
    clientFor: vi.fn(async (asked: string) => {
      permission = asked;
      const app = state.app ? await state.store.getAppById(state.app.id) : null;
      const client = app ? await state.store.getClientById(app.clientId) : null;
      return { user: { id: "u", email: "owner@nour.test", name: "Owner" }, client, app, apps: app ? [app] : [], license: null, state: "active", role: "owner", staff: null };
    }),
    mayUseDashboard: () => true,
  };
});
vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

const product = (appId: string, name: string): CatalogProductInput => ({
  appId,
  name,
  description: "",
  priceCents: 10000,
  salePriceCents: null,
  categoryIds: [],
  imageAssetIds: [],
  stock: null,
  digital: false,
  featured: false,
  active: true,
  sku: null,
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("132.152 Featured from the Products inspector", () => {
  beforeEach(async () => {
    const { store, client } = await setupClient();
    state.store = store;
    const base: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", siteUrl: null, connector: { kind: "catalog" }, appName: "Nour" };
    await store.createApp(base);
    state.app = base;
    permission = null;
  });

  it("features a product and takes it off again, with the Products permission", async () => {
    const { setProductFeaturedAction } = await import("@/app/actions/catalog");
    const tulips = await state.store.createCatalogProduct(product(state.app!.id, "Tulips"), NOW);
    expect(await setProductFeaturedAction({}, form({ id: String(tulips.id), featured: "1" }))).toMatchObject({ ok: true });
    expect(permission).toBe("catalog");
    expect((await state.store.listCatalogProducts(state.app!.id)).find((p) => p.id === tulips.id)?.featured).toBe(true);
    expect(await setProductFeaturedAction({}, form({ id: String(tulips.id), featured: "0" }))).toMatchObject({ ok: true });
    expect((await state.store.listCatalogProducts(state.app!.id)).find((p) => p.id === tulips.id)?.featured).toBe(false);
  });

  it("changes nothing for a product that isn't this app's", async () => {
    const { setProductFeaturedAction } = await import("@/app/actions/catalog");
    const other: App = { ...newApp(state.app!.clientId, null, NOW, "store"), backend: "hosted", siteUrl: null, connector: { kind: "catalog" }, appName: "Other" };
    await state.store.createApp(other);
    const theirs = await state.store.createCatalogProduct(product(other.id, "Not ours"), NOW);
    expect(await setProductFeaturedAction({}, form({ id: String(theirs.id), featured: "1" }))).toMatchObject({ message: "Choose at least one product." });
    expect(await setProductFeaturedAction({}, form({ id: "nope", featured: "1" }))).toMatchObject({ message: "Choose at least one product." });
    expect((await state.store.listCatalogProducts(other.id))[0]?.featured).toBe(false);
  });
});
