import { beforeEach, describe, expect, it, vi } from "vitest";
import { addCategoryAction, saveProductAction } from "@/app/actions/catalog";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { makeFromDemo } from "@/lib/demo/start";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { publishLayout } from "@/lib/pages/layout";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { ensureStoriesSeeded } from "@/lib/stories";
import { withDashboardStories } from "@/lib/stories/canvas";
import { leadSetSlug, storySetOf, storySetPages } from "@/lib/stories/sets";
import { studioStoriesFor } from "@/lib/stories/studio";
import { storyViewsOf } from "@/lib/stories/view";
import { withShopCategories, withShopCategoriesIn } from "@/lib/studio/shop-categories";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 194 The owner (18 November), on Kech Flora in Studio: the "Every
 * occasion" rings on the shop's page showed one set of stories on the
 * phone, another in the inspector and a third in Studio › Stories; and the
 * shop page's stories are not Home's. Each page with story elements now has
 * its own set in Dashboard › Stories, and the canvas, the inspector, the
 * Stories page and the app show the same stories: the shop's categories
 * where the template's rings follow them (157).
 */

const state: { store: MemoryStore; app: App | null } = { store: new MemoryStore(), app: null };

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
      return { user: { id: "u", email: "owner@kech.test", name: "Owner" }, client, app, apps: app ? [app] : [], license: null, state: "active", role: "owner", staff: null };
    }),
    mayUseDashboard: () => true,
  };
});
vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("@/lib/blobs", () => ({ getBlobStore: () => ({ put: async () => undefined, get: async () => null, delete: async () => undefined }) }));
vi.mock("@/lib/admin/audit", () => ({ recordStaffChange: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirected(url);
  },
}));

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) for (const v of [value].flat()) data.append(key, v);
  return data;
};
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

async function startKechFlora(): Promise<App> {
  const { store, client } = await setupClient({ email: `owner-${Math.random().toString(36).slice(2, 8)}@kech.test` });
  state.store = store;
  const made = await makeFromDemo(store, { clientId: client.id, plan: null, lang: "en" }, { demo: "flowers", name: "Kech Flora", colour: "#A8325A", logoAssetId: null, iconAssetId: null }, NOW);
  state.app = made.app;
  const done = await publishLayout(store, made.app, undefined, "owner", NOW, null);
  expect(done.ok).toBe(true);
  return made.app;
}

async function addCategory(name: string): Promise<number> {
  expect(await addCategoryAction({}, form({ name }))).toMatchObject({ ok: true });
  return (await state.store.listCatalogCategories(state.app!.id)).find((c) => c.name === name)!.id;
}

async function addProduct(name: string, categoryIds: number[]): Promise<void> {
  await expect(saveProductAction({}, form({ name, description: "", price: "450", salePrice: "", stock: "", sku: "", weight: "", optionGroups: "", variants: "", categoryIds: categoryIds.map(String), active: "on" }))).rejects.toBeInstanceOf(Redirected);
}

/** The owner's own categories, as Kech Flora has them (Add to gifts, Bouquets, Gift baskets…). */
async function ownCategories(): Promise<string[]> {
  const names = ["Add to gifts", "Bouquets", "Gift baskets"];
  for (const name of names) await addProduct(`${name} one`, [await addCategory(name)]);
  return names;
}

function context(): HostedContext {
  const app = state.app!;
  return { store: state.store, app, active: true, now: NOW, ip: "203.0.113.194", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: ASSETS, platformUrl: "https://yallapp.test", connector: new CatalogConnector({ store: state.store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test" }) };
}

async function served(slug: string, lang = "en"): Promise<StudioPage> {
  const fresh = { ...context(), app: (await state.store.getAppById(state.app!.id))! };
  const result = await handleHosted(fresh, { method: "GET", path: ["pages", slug], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
  expect(result.status).toBe(200);
  return (result.body as { studio: StudioPage }).studio;
}

const nodesOf = (node: StudioNode): StudioNode[] => [node, ...(node.children ?? []).flatMap(nodesOf)];
const ringNames = (body: StudioNode) => nodesOf(body).filter((n) => n.type === "stories").map((n) => (n.slides ?? []).map((s) => s.heading));

async function layoutPages() {
  const record = (await state.store.getAppLayout(state.app!.id))!;
  return (record.published ?? record.draft).pages;
}

async function pickable() {
  return pickableContent((await state.store.getAppById(state.app!.id))!, { store: state.store, key: KEY, assetUrl: ASSETS, platformUrl: "https://yallapp.test" }, NOW);
}

/** The stories of a page's set, as Dashboard › Stories lists them. */
async function setOf(slug: string) {
  const lead = leadSetSlug(await layoutPages());
  return (await state.store.listAppStories(state.app!.id)).filter((s) => storySetOf(s, lead) === slug);
}

beforeEach(() => {
  state.app = null;
});

describe("194 each page's stories are its own", () => {
  it("Kech Flora: Home and the shop's page have a set each, copied as the app shows them", async () => {
    await startKechFlora();
    const pages = await layoutPages();
    const sets = storySetPages(pages).map((p) => p.slug);
    // Home, and the shop page with its "Every occasion" rings.
    expect(sets.length).toBeGreaterThanOrEqual(2);
    expect(leadSetSlug(pages)).toBe(sets[0]);
    await ensureStoriesSeeded(state.store, (await state.store.getAppById(state.app!.id))!, NOW, (await pickable()).shopCategories ?? null);
    for (const slug of sets) {
      const mine = await setOf(slug);
      expect(mine.length, slug).toBeGreaterThan(0);
      // Each set copied from its own page.
      expect(mine.every((s) => s.page === slug && s.importKey?.startsWith(`${slug}:`))).toBe(true);
    }
  });

  it("the shop page's rings: the shop's categories on the phone, in the inspector and in Stories alike", async () => {
    await startKechFlora();
    const names = await ownCategories();
    const shop = (await pickable()).shopCategories ?? null;
    expect(shop?.own).toBe(true);
    const pages = await layoutPages();
    const [, shopSlug] = storySetPages(pages).map((p) => p.slug);
    const shopPage = pages.find((p) => p.slug === shopSlug)!;
    // The app (and Studio's canvas) show the shop's categories in the template's rings.
    const phone = ringNames((await served(shopSlug!)).body);
    expect(phone[0]).toEqual(names);
    const canvas = ringNames(withShopCategoriesIn(shopPage.studio!.body, shop));
    expect(canvas[0]).toEqual(names);
    // The inspector lists the rings as the canvas shows them.
    const rings = nodesOf(shopPage.studio!.body).find((n) => n.type === "stories")!;
    expect(withShopCategories(rings, shop).slides!.map((s) => s.heading)).toEqual(names);
    // Studio › Stories: the same, never the template's Love, Birthday…
    await studioStoriesFor(state.store, (await state.store.getAppById(state.app!.id))!, NOW, shop);
    const stories = await setOf(shopSlug!);
    expect(stories.map((s) => s.texts.en?.ring)).toEqual(names);
    expect(stories.every((s) => s.action?.type === "screen" && s.action.screen === "search" && s.action.category_id)).toBe(true);
  });

  it("changing the shop page's stories in Stories changes that page only, on the phone and on Studio's canvas", async () => {
    await startKechFlora();
    const names = await ownCategories();
    const shop = (await pickable()).shopCategories ?? null;
    const pages = await layoutPages();
    const [homeSlug, shopSlug] = storySetPages(pages).map((p) => p.slug);
    await ensureStoriesSeeded(state.store, (await state.store.getAppById(state.app!.id))!, NOW, shop);
    const homeBefore = ringNames((await served(homeSlug!)).body);
    // The owner renames the shop page's first story in Stories.
    const [first] = await setOf(shopSlug!);
    expect(await state.store.updateAppStory(state.app!.id, first!.id, { texts: { en: { ring: "Valentine", title: "Valentine roses" }, ar: { ring: "عيد الحب" } }, updatedAt: NOW })).toBe(true);
    const shopPhone = ringNames((await served(shopSlug!)).body);
    expect(shopPhone[0]).toEqual(["Valentine", ...names.slice(1)]);
    expect(ringNames((await served(shopSlug!, "ar")).body)[0]![0]).toBe("عيد الحب");
    // Home is as it was.
    expect(ringNames((await served(homeSlug!)).body)).toEqual(homeBefore);
    // Studio's canvas draws each page's own set.
    const { stories } = await studioStoriesFor(state.store, (await state.store.getAppById(state.app!.id))!, NOW, shop);
    expect(stories).toBeDefined();
    const shopPage = pages.find((p) => p.slug === shopSlug)!.studio!;
    const drawn = withShopCategoriesIn(withDashboardStories(shopPage, stories, "en", "en", NOW, shopSlug).body, shop);
    expect(ringNames(drawn)[0]).toEqual(shopPhone[0]);
    const homePage = pages.find((p) => p.slug === homeSlug)!.studio!;
    const homeDrawn = withShopCategoriesIn(withDashboardStories(homePage, stories, "en", "en", NOW, homeSlug).body, shop);
    expect(ringNames(homeDrawn)).toEqual(homeBefore);
  });

  it("an app copied before 194 (one list, Home's, with the template's words): brought in line, the owner's own stories kept", async () => {
    await startKechFlora();
    const names = await ownCategories();
    const shop = (await pickable()).shopCategories ?? null;
    const pages = await layoutPages();
    const [homeSlug, shopSlug] = storySetPages(pages).map((p) => p.slug);
    // As 165 copied them: Home's five, no set, the template's words.
    for (const [i, ring] of ["Love", "Birthday", "Sympathy", "New baby", "Congratulations"].entries()) {
      await state.store.createAppStory({ appId: state.app!.id, position: i, enabled: true, startsAt: null, endsAt: null, media: { kind: "image", imageUrl: `https://files.test/${i}.jpg`, videoUrl: null }, texts: { en: { ring, title: ring } }, icon: null, action: { type: "screen", screen: "search" }, categoryId: null, importKey: `${homeSlug}:old:${i}`, createdAt: NOW, updatedAt: NOW });
    }
    await state.store.markStoriesSeeded(state.app!.id, NOW);
    // And one of the owner's own, saved in Stories.
    await state.store.createAppStory({ appId: state.app!.id, position: 9, enabled: true, startsAt: null, endsAt: null, media: { kind: "image", imageUrl: "https://files.test/own.jpg", videoUrl: null }, texts: { en: { ring: "Mine", title: "Mine" } }, icon: null, action: null, categoryId: null, importKey: null, createdAt: NOW, updatedAt: NOW });
    await ensureStoriesSeeded(state.store, (await state.store.getAppById(state.app!.id))!, NOW, shop);
    // The owner's story keeps Home's set as it was (a set with one of theirs is never copied again).
    const home = await setOf(homeSlug!);
    expect(home.map((s) => s.texts.en?.ring)).toContain("Mine");
    expect(home).toHaveLength(6);
    // The shop page gets its own set: what its rings show, the shop's categories.
    expect((await setOf(shopSlug!)).map((s) => s.texts.en?.ring)).toEqual(names);
    expect(ringNames((await served(shopSlug!)).body)[0]).toEqual(names);
  });

  it("a set the owner never changed follows what its page shows; copying again never saves for the owner", async () => {
    await startKechFlora();
    const pages = await layoutPages();
    const [, shopSlug] = storySetPages(pages).map((p) => p.slug);
    await ensureStoriesSeeded(state.store, (await state.store.getAppById(state.app!.id))!, NOW, (await pickable()).shopCategories ?? null);
    const before = (await setOf(shopSlug!)).map((s) => s.texts.en?.ring);
    // The owner adds their categories: the rings follow them, and so do the copies.
    const names = await ownCategories();
    const again = await ensureStoriesSeeded(state.store, (await state.store.getAppById(state.app!.id))!, NOW, (await pickable()).shopCategories ?? null);
    expect(again).toBeGreaterThan(0);
    expect((await setOf(shopSlug!)).map((s) => s.texts.en?.ring)).toEqual(names);
    expect(before).not.toEqual(names);
    expect((await state.store.getAppById(state.app!.id))?.storiesSavedAt ?? null).toBeNull();
    // Nothing else to bring in line: nothing copied.
    expect(await ensureStoriesSeeded(state.store, (await state.store.getAppById(state.app!.id))!, NOW, (await pickable()).shopCategories ?? null)).toBe(0);
  });

  it("each story's set travels to the dashboard and Studio (a story from before 194 in the lead page's)", () => {
    const at = new Date(0);
    const base = { appId: "a", position: 0, enabled: true, startsAt: null, endsAt: null, media: { kind: "image" as const, imageUrl: null, videoUrl: null }, texts: {}, icon: null, action: null, categoryId: null, importKey: null, createdAt: at, updatedAt: at };
    const views = storyViewsOf([{ ...base, id: 1 }, { ...base, id: 2, page: "bouquets" }], "home");
    expect(views.map((v) => v.page)).toEqual(["home", "bouquets"]);
  });
});
