import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addCategoryAction, renameCategoryAction, saveProductAction } from "@/app/actions/catalog";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { makeFromDemo } from "@/lib/demo/start";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { loadLayout, publishLayout, saveDraft } from "@/lib/pages/layout";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { removeAllSamples } from "@/lib/samples/remove";
import { APP_WORDS } from "@/lib/studio/app-words";
import { categoryAction, templateCategoryList, withShopCategories, withShopCategoriesIn } from "@/lib/studio/shop-categories";
import { mapTree } from "@/lib/studio/tree";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 157 The owner (18 November), on Leqaa and Kech Flora, both made from
 * Leqaa's Rose hour: the app showed the categories the template came with,
 * not the ones added in the dashboard. Each step as the owner takes it:
 * the app made from the template (/start/flowers), the categories and
 * products added with the dashboard's own actions, the layout published,
 * then what the app fetches (`GET /pages`, `GET /store/categories`).
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
const MOBILE_FIXTURE = path.resolve(__dirname, "../../../../mobile/test/support/phase157_leqaa_pages.json");

/** The owner's app, made from Leqaa's demo as /start/flowers makes it, its layout published. */
async function startLeqaa(look?: "b", lang: "en" | "ar" = "en"): Promise<App> {
  const { store, client } = await setupClient({ email: `owner-${look ?? "a"}-${lang}@kech.test` });
  state.store = store;
  const made = await makeFromDemo(store, { clientId: client.id, plan: null, lang }, { demo: "flowers", name: "Kech Flora", colour: "#A8325A", logoAssetId: null, iconAssetId: null, ...(look ? { look } : {}) }, NOW);
  state.app = made.app;
  await publish();
  return made.app;
}

async function publish(): Promise<void> {
  const app = (await state.store.getAppById(state.app!.id))!;
  const done = await publishLayout(state.store, app, undefined, "owner", NOW, null);
  expect(done.ok, done.ok ? "" : done.errors.join("; ")).toBe(true);
}

/** Categories and products added in the dashboard, with its own actions. */
async function addCategory(name: string): Promise<number> {
  const said = await addCategoryAction({}, form({ name }));
  expect(said).toMatchObject({ ok: true });
  return (await state.store.listCatalogCategories(state.app!.id)).find((c) => c.name === name)!.id;
}

async function addProduct(name: string, price: string, categoryIds: number[]): Promise<number> {
  await expect(saveProductAction({}, form({ name, description: "", price, salePrice: "", stock: "", sku: "", weight: "", optionGroups: "", variants: "", categoryIds: categoryIds.map(String), active: "on" }))).rejects.toBeInstanceOf(Redirected);
  return (await state.store.listCatalogProducts(state.app!.id)).find((p) => p.name === name)!.id;
}

function context(): HostedContext {
  const app = state.app!;
  return { store: state.store, app, active: true, now: NOW, ip: "203.0.113.157", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: ASSETS, platformUrl: "https://yallapp.test", connector: new CatalogConnector({ store: state.store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test" }) };
}

/** What the app fetches, checked against the contract. */
async function fetchApp<T>(route: string, lang = "en"): Promise<T> {
  const fresh = { ...context(), app: (await state.store.getAppById(state.app!.id))! };
  const result = await handleHosted(fresh, { method: "GET", path: route.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
  expect(result.status, route).toBe(200);
  expectContract("GET", route.startsWith("/pages/") ? "/pages/{slug}" : route, result);
  return result.body as T;
}

const page = async (slug: string, lang = "en") => (await fetchApp<{ studio: StudioPage }>(`/pages/${slug}`, lang)).studio;
const nodesOf = (node: StudioNode): StudioNode[] => [node, ...(node.children ?? []).flatMap(nodesOf)];
const all = (studio: StudioPage) => nodesOf(studio.body);
const named = (studio: StudioPage, type: string, name?: string) => all(studio).filter((n) => n.type === type && (name === undefined || n.name === name));
const rings = (studio: StudioPage) => named(studio, "stories").map((n) => (n.slides ?? []).map((s) => ({ heading: s.heading, action: s.action })));
const opens = (id: number) => categoryAction({ id });
const SHOP = { type: "screen", screen: "search" };
/** Every text an element and what it holds show. */
const textsOf = (n: StudioNode): string[] => nodesOf(n).flatMap((x) => [x.text, ...(x.slides ?? []).map((s) => s.heading), ...(x.entries ?? []).map((e) => e.title)]).filter((t): t is string => typeof t === "string");
/** The template's occasions and collections in every language. */
const TEMPLATE_WORDS = new Set((["lqLove", "lqBirthday", "lqSympathy", "lqNewBaby", "lqCongrats", "lqSignature", "lqRoses", "lqSeasonal", "lqPlants", "lqGiftSets", "lqTulips"] as const).flatMap((w) => (["en", "ar", "tr"] as const).map((l) => APP_WORDS[l][w])));

beforeEach(() => {
  state.app = null;
});

describe("157 the template's rings, chips and tiles show the shop's own categories", () => {
  it("an app made from Rose hour: the categories the owner adds in the dashboard are what its rings, collections and ticker show, in every language, each opening its category", async () => {
    await startLeqaa();
    const boxes = await addCategory("Luxury boxes");
    const wedding = await addCategory("Wedding");
    const grad = await addCategory("Graduation");
    await addProduct("Red & White Roses in a 24 Luxury Box", "599", [boxes]);
    await addProduct("Trio Luxury Box", "2199", [boxes, wedding]);
    await addProduct("Cap & Gown Bouquet", "450", [grad]);

    // The shop's own list: theirs only now, the demo's left out.
    const listed = await fetchApp<{ items: { id: number; name: string }[] }>("/store/categories");
    expect(listed.items.map((c) => c.name)).toEqual(["Luxury boxes", "Wedding", "Graduation"]);

    const want = [
      { heading: "Luxury boxes", action: opens(boxes) },
      { heading: "Wedding", action: opens(wedding) },
      { heading: "Graduation", action: opens(grad) },
    ];
    for (const lang of ["en", "ar", "tr"]) {
      const home = await page("home", lang);
      // The occasions' rings on the home's frosted card.
      expect(rings(home), lang).toEqual([want]);
      // The collections' bento: one tile each, in the shop's order, no hole in the grid (a small tile has no size).
      const bento = named(home, "bento")[0]!;
      expect(bento.entries!.map((e) => [e.title, e.action, e.size ?? "small"]), lang).toEqual([
        ["Luxury boxes", opens(boxes), "large"],
        ["Wedding", opens(wedding), "small"],
        ["Graduation", opens(grad), "small"],
      ]);
      // The ticker: their names, one a line.
      expect(named(home, "marquee")[0]!.text, lang).toBe("Luxury boxes\nWedding\nGraduation");
      // No template occasion or collection left in any language.
      for (const n of [...named(home, "stories"), ...named(home, "bento"), ...named(home, "marquee")]) for (const t of textsOf(n)) expect(TEMPLATE_WORDS.has(t), `${lang}: ${t}`).toBe(false);
      // The Bouquets tab's rings too.
      expect(rings(await page("shop", lang)), lang).toEqual([want]);
    }
  });

  it("the second look, Botanical press: its occasion chips, collection arches and the edit's cards are the shop's categories, numbered, each with its own IDs", async () => {
    await startLeqaa("b");
    const ids = [];
    for (const name of ["Peonies", "Orchids", "Boxes", "Wedding"]) {
      const id = await addCategory(name);
      await addProduct(`${name} one`, "300", [id]);
      ids.push(id);
    }
    const home = await page("home", "ar");
    const lists = all(home).filter((n) => (n.type === "row" || n.type === "slider") && (n.children ?? []).length && n.children!.every((c) => c.action && "category_id" in c.action));
    // The chips, the edit's cards and the arches.
    expect(lists.map((l) => l.type)).toEqual(["row", "slider", "row"]);
    for (const list of lists) {
      expect(list.children!.map((c) => c.action)).toEqual(ids.map(opens));
      expect(list.children!.map((c) => textsOf(c).filter((t) => ["Peonies", "Orchids", "Boxes", "Wedding"].includes(t)))).toEqual([["Peonies"], ["Orchids"], ["Boxes"], ["Wedding"]]);
      for (const c of list.children!) for (const t of textsOf(c)) expect(TEMPLATE_WORDS.has(t), t).toBe(false);
    }
    // The occasions' own icons (a heart, a cake) don't go with the shop's categories: the flower for each.
    expect(lists[0]!.children!.map((c) => nodesOf(c).find((n) => n.type === "icon")?.icon)).toEqual(Array(4).fill("local_florist"));
    // The edit's three cards were 01 to 03: four categories, 01 to 04.
    expect(lists[1]!.children!.map((c) => textsOf(c).find((t) => /^\d\d$/.test(t)))).toEqual(["01", "02", "03", "04"]);
    // Every element's ID once on the page (the fourth card a copy of the third).
    const every = all(home).map((n) => n.id);
    expect(new Set(every).size).toBe(every.length);
    // Its ticker as well.
    expect(named(home, "marquee")[0]!.text).toBe("Peonies\nOrchids\nBoxes\nWedding");
  });

  it("until the owner has their own, the template's rings and tiles stay, each opening the demo's category of the same name", async () => {
    await startLeqaa(undefined, "ar");
    const categories = await state.store.listCatalogCategories(state.app!.id);
    const idOf = (name: string) => categories.find((c) => c.name === name)!.id;
    const home = await page("home", "ar");
    expect(rings(home)).toEqual([
      [
        { heading: "حب", action: opens(idOf("Love")) },
        { heading: "عيد ميلاد", action: opens(idOf("Birthday")) },
        { heading: "مواساة", action: opens(idOf("Sympathy")) },
        { heading: "مولود جديد", action: opens(idOf("New baby")) },
        { heading: "تهنئة", action: opens(idOf("Congratulations")) },
      ],
    ]);
    expect(named(home, "bento")[0]!.entries!.map((e) => e.action)).toEqual(["Signature bouquets", "Roses", "In season", "Plants", "Gift sets"].map((n) => opens(idOf(n))));
    // The demo's categories are the shop's list until then.
    expect((await fetchApp<{ items: { name: string }[] }>("/store/categories")).items.map((c) => c.name)).toContain("Love");
  });

  it("a shop with no categories keeps the template's look, its rings opening the whole shop; one the owner renamed is theirs", async () => {
    await startLeqaa();
    await removeAllSamples({ store: state.store, deleteBlob: async () => undefined, now: NOW }, state.app!.id);
    expect(await state.store.listCatalogCategories(state.app!.id)).toEqual([]);
    await addProduct("Peony Cloud", "800", []);
    const home = await page("home");
    expect(rings(home)[0]!.map((r) => r.heading)).toEqual(["Love", "Birthday", "Sympathy", "New baby", "Congratulations"]);
    expect(rings(home)[0]!.every((r) => JSON.stringify(r.action) === JSON.stringify(SHOP))).toBe(true);

    // 157 A demo's category renamed in the dashboard is the owner's.
    await startLeqaa();
    const roses = (await state.store.listCatalogCategories(state.app!.id)).find((c) => c.name === "Roses")!;
    await renameCategoryAction(form({ id: String(roses.id), name: "Red roses" }));
    expect((await state.store.listCatalogCategories(state.app!.id)).find((c) => c.id === roses.id)!.sample).toBeUndefined();
    expect(rings(await page("home"))).toEqual([[{ heading: "Red roses", action: opens(roses.id) }]]);
  });

  /** The draft's home with `change` made to its elements in Studio, published. */
  async function editHome(change: (n: StudioNode) => StudioNode): Promise<void> {
    const app = (await state.store.getAppById(state.app!.id))!;
    const record = await loadLayout(state.store, app, NOW);
    const pages = record.draft.pages.map((p) => (p.slug === "home" && p.studio ? { ...p, studio: { ...p.studio, body: mapTree(p.studio.body, change)! } } : p));
    const saved = await saveDraft(state.store, app, { ...record.draft, pages }, NOW);
    expect(saved.ok, saved.ok ? "" : saved.errors.join("; ")).toBe(true);
    await publish();
  }

  it("a list whose words the owner changed is theirs, whatever its other languages still say; an entry named like a category opens it", async () => {
    await startLeqaa();
    const id = await addCategory("Weddings");
    await addProduct("Bridal Bouquet", "900", [id]);
    // In Studio, the first ring's words changed in the layout's language (to their category's name), the second's to their own; their Arabic is the template's still.
    await editHome((n) => (n.type === "stories" ? { ...n, slides: n.slides!.map((s, i) => (i === 0 ? { ...s, heading: "Weddings" } : i === 1 ? { ...s, heading: "Valentine's" } : s)) } : n));
    for (const lang of ["en", "ar"]) {
      const home = await page("home", lang);
      // Theirs: as set, the one named like their category opening it, the template's others (named like none of the shop's now) the shop.
      expect(rings(home)[0]!.map((r) => r.action), lang).toEqual([opens(id), SHOP, SHOP, SHOP, SHOP]);
      // The bento, left as the template made it, follows the shop.
      expect(named(home, "bento")[0]!.entries!.map((e) => e.title), lang).toEqual(["Weddings"]);
    }
  });

  it("the category a tile opens, picked in Studio, is kept and served; the list is the owner's from then on", async () => {
    await startLeqaa();
    const boxes = await addCategory("Luxury boxes");
    const wedding = await addCategory("Wedding");
    await addProduct("Trio Luxury Box", "2199", [boxes, wedding]);
    const pick = { type: "screen" as const, screen: "search" as const, category_id: String(wedding) };
    await editHome((n) => (n.type === "bento" ? { ...n, entries: n.entries!.map((e, i) => (i === 0 ? { ...e, action: pick } : e)) } : n));
    const app = (await state.store.getAppById(state.app!.id))!;
    const bentoOf = (body: StudioNode) => nodesOf(body).find((n) => n.type === "bento")!;
    expect(bentoOf((await loadLayout(state.store, app, NOW)).draft.pages.find((p) => p.slug === "home")!.studio!.body).entries![0]!.action).toEqual(pick);
    const tiles = named(await page("home", "ar"), "bento")[0]!.entries!;
    // The template's tiles, the first opening Wedding, the others named like none of the shop's categories: the shop.
    expect(tiles.map((e) => e.action)).toEqual([pick, SHOP, SHOP, SHOP, SHOP]);
    // Not a category ID: refused, with what to do.
    const record = await loadLayout(state.store, app, NOW);
    const bad = record.draft.pages.map((p) => (p.slug === "home" && p.studio ? { ...p, studio: { ...p.studio, body: mapTree(p.studio.body, (n) => (n.type === "bento" ? { ...n, entries: n.entries!.map((e) => ({ ...e, action: { ...pick, category_id: "roses" } })) } : n))! } } : p));
    const refused = await saveDraft(state.store, app, { ...record.draft, pages: bad }, NOW);
    expect(refused.ok).toBe(false);
    expect(refused.ok ? "" : refused.errors.join("; ")).toContain("choose one of the shop's categories");
  });

  it("Botanical press from the demo: its chips, arches and cards named like the demo's categories open them, the others the shop", async () => {
    await startLeqaa("b");
    const categories = await state.store.listCatalogCategories(state.app!.id);
    const idOf = (name: string) => categories.find((c) => c.name === name)!.id;
    const home = await page("home", "tr");
    const lists = all(home).filter((n) => (n.type === "row" || n.type === "slider") && (n.children ?? []).length >= 2 && n.children!.every((c) => c.action?.type === "screen" && c.action.screen === "search"));
    const chips = lists.find((l) => l.children!.length === 5 && l.children!.every((c) => c.type === "row"))!;
    expect(chips.children!.map((c) => c.action)).toEqual(["Love", "Birthday", "Sympathy", "New baby", "Congratulations"].map((n) => opens(idOf(n))));
    // The arches: Roses, Tulips (no such category in the demo: the shop), Plants, Gift sets, Signature bouquets.
    const arches = lists.find((l) => l.children!.some((c) => textsOf(c).includes("Laleler")))!;
    expect(arches.children!.map((c) => c.action)).toEqual([opens(idOf("Roses")), SHOP, opens(idOf("Plants")), opens(idOf("Gift sets")), opens(idOf("Signature bouquets"))]);
  });

  it("the canvas gets the same, and a demo app's categories are the template's own", async () => {
    await startLeqaa();
    const id = await addCategory("Wedding");
    await addProduct("Bridal Bouquet", "900", [id]);
    const app = (await state.store.getAppById(state.app!.id))!;
    const pickable = await pickableContent(app, { store: state.store, key: KEY, assetUrl: ASSETS, platformUrl: "https://yallapp.test" }, NOW);
    expect(pickable.shopCategories).toEqual({ list: [{ id, name: "Wedding", image_url: null }], own: true });
    await state.store.updateApp(app.id, { demo: true }, NOW);
    const demo = await pickableContent((await state.store.getAppById(app.id))!, { store: state.store, key: KEY, assetUrl: ASSETS, platformUrl: "https://yallapp.test" }, NOW);
    expect(demo.shopCategories?.own).toBe(false);
  });

  it("an app that stays open asks for its pages again when the shop's categories change: the pages' version follows them", async () => {
    await startLeqaa();
    const before = (await fetchApp<{ version: string }>("/pages")).version;
    expect((await fetchApp<{ version: string }>("/pages")).version).toBe(before);
    const id = await addCategory("Wedding");
    // An empty category isn't listed: nothing changed in the app.
    expect((await fetchApp<{ version: string }>("/pages")).version).toBe(before);
    await addProduct("Bridal Bouquet", "900", [id]);
    expect((await fetchApp<{ version: string }>("/pages")).version).not.toBe(before);
  });
});

describe("157 the lists, element by element", () => {
  const story = (heading: string, ring?: "highlight" | "plain") => ({ image_url: `https://p.test/${heading}.jpg`, heading, subheading: null, action: SHOP as never, ...(ring ? { ring } : {}), translations: { ar: { heading: "حب" } } });
  const stories: StudioNode = { id: "s", type: "stories", slides: [story("Love", "highlight"), story("Birthday", "highlight"), story("Sympathy", "plain")] };

  it("knows only the template's lists, as the template left them in the layout's language", () => {
    expect(templateCategoryList(stories)).toBe("stories");
    expect(templateCategoryList({ ...stories, slides: [story("Love"), story("Our team")] })).toBeNull();
    expect(templateCategoryList({ ...stories, slides: [{ ...story("Love"), action: { type: "page", page_slug: "about" } }] })).toBeNull();
    expect(templateCategoryList({ ...stories, hidden: true })).toBeNull();
    // A row of the delivery days' chips isn't one.
    const chip = (text: string): StudioNode => ({ id: text, type: "row", action: SHOP as never, children: [{ id: `${text}-t`, type: "text", text }] });
    expect(templateCategoryList({ id: "r", type: "row", children: [chip("Today"), chip("Tomorrow")] })).toBeNull();
    expect(templateCategoryList({ id: "r", type: "row", children: [chip("Love"), chip("Roses")] })).toBe("children");
  });

  it("more categories than rings: each past them in the last ring's look, its photo the category's or the template's; none of the template's words left in other languages", () => {
    const list = ["A", "B", "C", "D"].map((name, i) => ({ id: i + 1, name, image_url: i === 0 ? "https://p.test/a.jpg" : null }));
    const made = withShopCategories(stories, { list, own: true });
    expect(made.slides!.map((s) => [s.heading, s.ring, s.image_url, s.action])).toEqual([
      ["A", "highlight", "https://p.test/a.jpg", opens(1)],
      ["B", "highlight", "https://p.test/Birthday.jpg", opens(2)],
      ["C", "plain", "https://p.test/Sympathy.jpg", opens(3)],
      ["D", "plain", "https://p.test/Love.jpg", opens(4)],
    ]);
    expect(made.slides!.every((s) => !s.translations)).toBe(true);
    // Not the owner's (the demo's): as it is, linked by name.
    expect(withShopCategoriesIn(stories, { list: [{ id: 9, name: "Birthday" }], own: false }).slides!.map((s) => s.action)).toEqual([SHOP, opens(9), SHOP]);
    // A category the owner picked that the shop no longer lists: the shop.
    const picked: StudioNode = { id: "t", type: "row", action: opens(42), children: [{ id: "t1", type: "text", text: "Peonies" }] };
    expect(withShopCategoriesIn(picked, { list: [{ id: 7, name: "Roses" }], own: true }).action).toEqual(SHOP);
    expect(withShopCategoriesIn(picked, { list: [{ id: 42, name: "Old roses" }], own: true }).action).toEqual(opens(42));
    // Named like one in another language (the template's word for it), or in another case: the same.
    expect(withShopCategoriesIn(stories, { list: [{ id: 3, name: "love" }], own: false }).slides!.map((s) => s.action)).toEqual([opens(3), SHOP, SHOP]);
  });

  it("a bento keeps its number of tiles and leaves no hole", () => {
    const tile = (title: string, size: "large" | "small" | "wide") => ({ title, size, action: SHOP as never });
    const bento: StudioNode = { id: "b", type: "bento", columns: 2, entries: [tile("Signature bouquets", "large"), tile("Roses", "small"), tile("In season", "small"), tile("Plants", "wide"), tile("Gift sets", "wide")] };
    const of = (n: number) => withShopCategories(bento, { list: Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `C${i + 1}` })), own: true }).entries!.map((e) => e.size);
    expect(of(1)).toEqual(["large"]);
    expect(of(2)).toEqual(["large", "wide"]);
    expect(of(4)).toEqual(["large", "small", "small", "wide"]);
    expect(of(9)).toEqual(["large", "small", "small", "wide", "wide"]);
  });
});

describe("157 what the app draws", () => {
  it("is the Flutter test's fixture (mobile/test/support/phase157_leqaa_pages.json)", async () => {
    await startLeqaa();
    await removeAllSamples({ store: state.store, deleteBlob: async () => undefined, now: NOW }, state.app!.id);
    const boxes = await addCategory("Luxury boxes");
    const wedding = await addCategory("Wedding");
    await addProduct("Red & White Roses in a 24 Luxury Box", "599", [boxes]);
    await addProduct("Trio Luxury Box", "2199", [boxes, wedding]);
    const served = {
      navigation: await fetchApp("/pages"),
      categories: await fetchApp("/store/categories"),
      home: await fetchApp("/pages/home", "ar"),
      shop: await fetchApp("/pages/shop", "ar"),
    };
    // The elements' IDs are made at random with the project: numbered in order instead, so the file stays the same
    // (164 and the element a list's title goes with, `heads`).
    const ids = new Map<string, string>();
    // 156 The version's mark of the served layout hashes those IDs too: the mark alone, without its hash.
    const stable = (key: string, value: unknown) => (key === "version" && typeof value === "string" ? value.replace(/~f[0-9a-f]{8}/, "~f") : (key === "id" || key === "heads") && typeof value === "string" && /^n[0-9a-z]{1,8}(-\d+)?$/.test(value) ? (ids.get(value) ?? ids.set(value, `n${ids.size + 1}`).get(value)) : value);
    const json = `${JSON.stringify(served, stable, 1)}\n`;
    // After a change: PHASE157_FIXTURE=1 npx vitest run tests/unit/phase157-app-categories.test.ts
    if (process.env.PHASE157_FIXTURE === "1" || !existsSync(MOBILE_FIXTURE)) writeFileSync(MOBILE_FIXTURE, json);
    expect(readFileSync(MOBILE_FIXTURE, "utf8"), "mobile/test/support/phase157_leqaa_pages.json is out of date").toBe(json);
  });
});
