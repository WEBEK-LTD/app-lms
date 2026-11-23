import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogProductInput, type ProductSpec, type TechSettings } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { servedTech } from "@/lib/hosted/pages/tech";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { TRADE_IN_LIMITS } from "@/lib/hosted/trade-in";
import { parseStudioPage } from "@/lib/pages/validate";
import { ACTION_FLOWS, STUDIO_TECH_TYPES, type StudioNode } from "@/lib/pages/types";
import { parseSpecsText, SPEC_FORM_ERRORS, SPEC_KEYS, SPEC_NAMES, specFacets, specKeyOf, specLabel, specLine, specsOf, specsText } from "@/lib/selling/specs";
import { buildWatts, checkBuild, DEFAULT_GRADES, formRank, parseGrades, parseTechForm, parseTradeInText, TECH_FORM_ERRORS, techFormValues, techOf, tradeInEstimate, tradeInText } from "@/lib/selling/tech";
import { APP_WORDS } from "@/lib/studio/app-words";
import { ELEMENTS, newNode } from "@/lib/studio/elements";
import { en as techEn, ar as techAr, tr as techTr } from "@/i18n/dashboard/tech";
import { ICON_NAMES } from "@/components/icon-names";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 211 The electronics, mobiles and computers shops' parts, for every store:
 * a product's specs (keys Yallapp knows named in the app's language), the
 * shop filtered by a spec, matching accessories, trade-in (the estimate
 * worked out again by the server, the request saved for the owner) and
 * Build your PC's checks; the five Studio elements, their checks and how
 * they are served.
 */

const spec = (label: string, value: string): ProductSpec => ({ ...(specKeyOf(label) ? { key: specKeyOf(label)! } : {}), label, value });

describe("211 a product's specs", () => {
  it("knows its keys in English, Arabic and Turkish, and keeps other labels as written", () => {
    expect(specKeyOf("RAM")).toBe("ram");
    expect(specKeyOf("الذاكرة")).toBe("ram");
    expect(specKeyOf("Bellek")).toBe("ram");
    expect(specKeyOf("  Processor ")).toBe("cpu");
    expect(specKeyOf("كرت الشاشة")).toBe("gpu");
    expect(specKeyOf("Socket")).toBe("socket");
    expect(specKeyOf("Colour of the box")).toBeNull();
    for (const key of SPEC_KEYS) for (const lang of ["en", "ar", "tr"] as const) expect(specKeyOf(SPEC_NAMES[key][lang]), `${key} ${lang}`).toBe(key);
    expect(specLabel({ key: "ram", label: "RAM" }, "ar")).toBe("الذاكرة");
    expect(specLabel({ key: "ram", label: "RAM" }, "tr")).toBe("Bellek");
    expect(specLabel({ label: "Colour of the box" }, "ar")).toBe("Colour of the box");
  });

  it("reads the owner's lines back and writes them again", () => {
    const parsed = parseSpecsText("Storage: 256 GB\nالمعالج: Z3 · 3 نانومتر\n\nIn the box: Cable, case");
    expect(parsed).toEqual({ ok: true, specs: [{ key: "storage", label: "Storage", value: "256 GB" }, { key: "cpu", label: "المعالج", value: "Z3 · 3 نانومتر" }, { label: "In the box", value: "Cable, case" }] });
    expect(parsed.ok && specsText(parsed.specs)).toBe("Storage: 256 GB\nالمعالج: Z3 · 3 نانومتر\nIn the box: Cable, case");
    expect(parseSpecsText("")).toEqual({ ok: true, specs: null });
    expect(parseSpecsText("Just a line")).toEqual({ ok: false, error: SPEC_FORM_ERRORS.line });
    expect(parseSpecsText(Array.from({ length: 41 }, (_, i) => `L${i}: v`).join("\n"))).toEqual({ ok: false, error: SPEC_FORM_ERRORS.many });
    expect(parseSpecsText(`${"x".repeat(41)}: v`)).toEqual({ ok: false, error: SPEC_FORM_ERRORS.long });
    // Whatever was saved, bounded.
    expect(specsOf([{ key: "nope", label: "A", value: "1" }, { label: "", value: "2" }, null, { key: "ram", label: "RAM", value: "8 GB" }])).toEqual([{ label: "A", value: "1" }, { key: "ram", label: "RAM", value: "8 GB" }]);
    expect(specsOf("x")).toBeNull();
  });

  it("puts the main specs on one line (a used phone's grade first) and counts a spec's values", () => {
    expect(specLine([spec("Screen", '6.7" OLED'), spec("Storage", "256 GB"), spec("RAM", "12 GB"), spec("Camera", "50 MP")])).toBe('256 GB · 12 GB · 6.7" OLED');
    expect(specLine([spec("Grade", "A · Excellent"), spec("Storage", "128 GB")])).toBe("A · Excellent · 128 GB");
    expect(specLine([spec("In the box", "Cable")])).toBeNull();
    const products = [{ specs: [spec("RAM", "16 GB")] }, { specs: [spec("RAM", "16 gb")] }, { specs: [spec("RAM", "32 GB")] }, { specs: null }];
    expect(specFacets(products, "ram")).toEqual([
      { value: "16 GB", count: 2 },
      { value: "32 GB", count: 1 },
    ]);
  });
});

describe("211 trade-in and Build your PC's rules", () => {
  const tradeIn = { models: [{ name: "Orbit 12", storages: [{ label: "128 GB", cents: 9000_00 }, { label: "256 GB", cents: 10_550_00 }] }], grades: { ...DEFAULT_GRADES } };

  it("estimates the top price times the grade's share, to the whole unit below", () => {
    expect(tradeInEstimate(tradeIn, "Orbit 12", "256 GB", "like_new")).toBe(10_550_00);
    expect(tradeInEstimate(tradeIn, "Orbit 12", "256 GB", "good")).toBe(8967_00);
    expect(tradeInEstimate(tradeIn, "Orbit 12", "128 GB", "broken")).toBe(2700_00);
    expect(tradeInEstimate(tradeIn, "Orbit 12", "1 TB", "good")).toBeNull();
    expect(tradeInEstimate(tradeIn, "Other", "128 GB", "good")).toBeNull();
  });

  it("reads the devices, the grades and the parts from the dashboard's form", () => {
    expect(parseTradeInText("Orbit 12 | 128 GB = 9000 | 256 GB = 10,550")).toEqual({ ok: true, models: tradeIn.models });
    expect(tradeInText(tradeIn)).toBe("Orbit 12 | 128 GB = 9000 | 256 GB = 10550");
    expect(parseTradeInText("Orbit 12")).toEqual({ ok: false, error: TECH_FORM_ERRORS.models });
    expect(parseTradeInText("Orbit 12 | 128 GB = free")).toEqual({ ok: false, error: TECH_FORM_ERRORS.models });
    expect(parseGrades({ like_new: "100", good: "90", fair: "", broken: "10" })).toEqual({ ok: true, grades: { like_new: 100, good: 90, fair: 65, broken: 10 } });
    expect(parseGrades({ like_new: "80", good: "90" })).toEqual({ ok: false, error: TECH_FORM_ERRORS.grades });
    const ok = parseTechForm({ accessoriesCategory: "7", tradeInModels: "Orbit 12 | 128 GB = 9000 | 256 GB = 10550", grade_like_new: "100", grade_good: "85", grade_fair: "65", grade_broken: "30", part_cpu: "3", part_board: "4", part_case: "5", optional_case: "on" }, [3, 4, 5, 7]);
    expect(ok).toEqual({
      ok: true,
      value: {
        accessoriesCategoryId: 7,
        tradeIn,
        pcBuilder: {
          steps: [
            { part: "cpu", categoryId: 3, required: true },
            { part: "board", categoryId: 4, required: true },
            { part: "case", categoryId: 5, required: false },
          ],
        },
      },
    });
    expect(ok.ok && techFormValues(ok.value)).toMatchObject({ accessoriesCategory: "7", part_case: "5", optional_case: "on", grade_good: "85" });
    expect(parseTechForm({ accessoriesCategory: "99" }, [3])).toEqual({ ok: false, errors: { accessoriesCategory: TECH_FORM_ERRORS.category } });
    expect(parseTechForm({ part_cpu: "3" }, [3])).toEqual({ ok: false, errors: { part_cpu: TECH_FORM_ERRORS.parts } });
    expect(parseTechForm({}, [3])).toEqual({ ok: true, value: null });
  });

  it("checks the parts against each other: the socket, the memory, the cooler, the power and the size", () => {
    const cpu = [spec("Socket", "AM-X"), spec("Power draw", "120 W")];
    const board = [spec("Socket", "AM-X"), spec("Memory type", "DDR5"), spec("Form factor", "ATX")];
    const gpu = [spec("Power draw", "320 W")];
    expect(buildWatts({ cpu, gpu })).toBe(700);
    expect(checkBuild({ cpu, board, ram: [spec("Memory type", "DDR5")], gpu, psu: [spec("Power supply", "750 W")], case: [spec("Form factor", "ATX / Micro-ATX")], cooler: [spec("Socket", "AM-X, LG-18")] })).toEqual([]);
    expect(checkBuild({ cpu, board: [spec("Socket", "LG-18"), spec("Memory type", "DDR5")] })).toEqual([{ part: "board", with: "cpu", reason: "socket" }]);
    expect(checkBuild({ board, ram: [spec("Memory type", "DDR4")] })).toEqual([{ part: "ram", with: "board", reason: "memory" }]);
    expect(checkBuild({ cpu, cooler: [spec("Socket", "LG-18")] })).toEqual([{ part: "cooler", with: "cpu", reason: "cooler" }]);
    expect(checkBuild({ cpu, gpu, psu: [spec("Power supply", "550 W")] })).toEqual([{ part: "psu", with: "gpu", reason: "power" }]);
    expect(checkBuild({ board, case: [spec("Form factor", "Mini-ITX")] })).toEqual([{ part: "case", with: "board", reason: "size" }]);
    expect([formRank("Mini-ITX"), formRank("Micro-ATX"), formRank("mATX"), formRank("ATX"), formRank("E-ATX"), formRank("ATX / Micro-ATX"), formRank(null)]).toEqual([0, 1, 1, 2, 3, 2, null]);
  });
});

describe("211 the five elements", () => {
  const app = { ...newApp("c", null, NOW, "store"), backend: "hosted" as const, connector: { kind: "catalog" as const } };

  it("are in the editor's Premium group for stores, each made on a card", () => {
    for (const type of STUDIO_TECH_TYPES) {
      const info = ELEMENTS.find((e) => e.type === type);
      expect(info, type).toMatchObject({ group: "premium", only: "store" });
      expect(ICON_NAMES).toContain(info!.icon);
      const node = newNode(type, { source: "products", brand: "#2450E6", text: (k) => k });
      expect(node.tech).toBeDefined();
    }
    expect(ACTION_FLOWS).toEqual(["bouquet", "trade_in", "pc_builder"]);
  });

  it("are checked: products picked, a known spec, a trade-in look; the flows on a shop's screen action", () => {
    const languages = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
    const page = (node: Record<string, unknown>) => parseStudioPage({ body: { id: "root", type: "column", children: [{ id: "x", ...node }] } }, app, languages);
    const ok = page({ type: "compare", tech: { ids: ["12", "40", "7"], accent: "#2450E6" }, text: "Compare" });
    expect(ok.ok).toBe(true);
    expect(page({ type: "compare", tech: { ids: ["1", "2", "3", "4"] } }).ok).toBe(false);
    expect(page({ type: "spec_table", tech: { ids: ["1", "2"] } }).ok).toBe(false);
    expect(page({ type: "spec_filter", tech: { spec: "ram", category_id: "4" } }).ok).toBe(true);
    expect(page({ type: "spec_filter", tech: { spec: "colour" } }).ok).toBe(false);
    expect(page({ type: "trade_in", tech: { look: "full" } }).ok).toBe(true);
    expect(page({ type: "trade_in", tech: { look: "huge" } }).ok).toBe(false);
    expect(page({ type: "pc_builder", tech: {} }).ok).toBe(true);
    expect(page({ type: "button", text: "Build", action: { type: "screen", screen: "search", flow: "pc_builder" } }).ok).toBe(true);
  });

  it("speak the app's three languages, and the dashboard's", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      expect(APP_WORDS[lang].techTradeUpTo).toContain("{amount}");
      expect(APP_WORDS[lang].techFilterBy).toContain("{spec}");
    }
    expect(APP_WORDS.ar.techTradeTitle).toBe("كم يساوي جهازك القديم؟");
    expect(Object.keys(techAr)).toEqual(Object.keys(techEn));
    expect(Object.keys(techTr)).toEqual(Object.keys(techEn));
    expect(techEn.known.models).toBe(TECH_FORM_ERRORS.models);
    expect(techEn.known.specsLine).toBe(SPEC_FORM_ERRORS.line);
  });
});

describe("211 on the hosted API, a shop's own products", () => {
  let store: MemoryStore;
  let app: App;
  const ids: Record<string, number> = {};
  const cats: Record<string, number> = {};
  const product = (input: Partial<CatalogProductInput>): CatalogProductInput => ({ appId: app.id, name: "Product", description: "", priceCents: 10000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null, ...input });
  const tech: TechSettings = {
    accessoriesCategoryId: 0,
    tradeIn: { models: [{ name: "Orbit 12", storages: [{ label: "128 GB", cents: 9000_00 }] }], grades: { ...DEFAULT_GRADES } },
    pcBuilder: null,
  };

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const fresh = newApp(client.id, null, NOW, "store");
    app = { ...fresh, backend: "hosted", websiteDoneAt: NOW, connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "SAR", shippingCents: 0, freeShippingOverCents: null, payment: null } };
    await store.createApp(app);
    cats.phones = (await store.createCatalogCategory({ appId: app.id, name: "Phones", now: NOW })).id;
    cats.accessories = (await store.createCatalogCategory({ appId: app.id, name: "Accessories", now: NOW })).id;
    cats.cases = (await store.createCatalogCategory({ appId: app.id, name: "Cases", parentId: cats.accessories, now: NOW })).id;
    const at = (s: number) => new Date(NOW.getTime() + s * 1000);
    ids.x1 = (await store.createCatalogProduct(product({ name: "Zenra X1 Pro", featured: true, priceCents: 4899_00, categoryIds: [cats.phones], specs: [spec("Screen", '6.7" OLED'), spec("RAM", "12 GB"), spec("Storage", "256 GB"), spec("In the box", "Cable")] }), at(1))).id;
    ids.x1s = (await store.createCatalogProduct(product({ name: "Zenra X1", featured: true, priceCents: 3299_00, categoryIds: [cats.phones], specs: [spec("Screen", '6.3" OLED'), spec("RAM", "8 GB"), spec("Storage", "128 GB")] }), at(2))).id;
    ids.plain = (await store.createCatalogProduct(product({ name: "Gift card", categoryIds: [cats.phones] }), at(3))).id;
    ids.buds = (await store.createCatalogProduct(product({ name: "Buds Pro", featured: true, categoryIds: [cats.accessories] }), at(4))).id;
    ids.case = (await store.createCatalogProduct(product({ name: "Leather case", categoryIds: [cats.cases] }), at(5))).id;
    tech.accessoriesCategoryId = cats.accessories!;
  });

  const setTech = async (t: TechSettings | null) => {
    app = { ...app, catalogSettings: { ...app.catalogSettings!, tech: t } };
    await store.updateApp(app.id, { catalogSettings: app.catalogSettings }, NOW);
  };

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now: NOW,
    ip: "203.0.113.11",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
  });

  async function call(method: string, route: string, options: { body?: unknown; query?: Record<string, string>; lang?: string; path?: string } = {}): Promise<HostedResult> {
    const result = await handleHosted(context(), { method, path: (options.path ?? route).split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", ...(options.query ?? {}) }), body: options.body, token: null, headers: new Headers({ "accept-language": options.lang ?? "en" }) });
    expectContract(method, route, result);
    return result;
  }

  it("serves a product's specs in the app's language, its spec line and its matching accessories", async () => {
    await setTech(tech);
    const detail = (await call("GET", "/store/products/{product_id}", { path: `/store/products/${ids.x1}`, lang: "ar" })).body as { specs: { key: string | null; label: string; value: string }[]; spec_line: string; accessories: { name: string }[] };
    expect(detail.specs[1]).toEqual({ key: "ram", label: "الذاكرة", value: "12 GB" });
    expect(detail.specs[3]).toEqual({ key: null, label: "In the box", value: "Cable" });
    expect(detail.spec_line).toBe('256 GB · 12 GB · 6.7" OLED');
    // The accessories category's products, its sub-categories' too, the featured first; none on an accessory's own page.
    expect(detail.accessories.map((p) => p.name)).toEqual(["Buds Pro", "Leather case"]);
    const onCase = (await call("GET", "/store/products/{product_id}", { path: `/store/products/${ids.case}` })).body as { accessories: unknown[]; specs: unknown[] };
    expect(onCase.accessories).toEqual([]);
    expect(onCase.specs).toEqual([]);
    // A list has the spec line, and the specs only when asked.
    const list = (await call("GET", "/store/products", { query: { per_page: "10" } })).body as { items: { name: string; spec_line: string | null; specs?: unknown }[] };
    expect(list.items.find((p) => p.name === "Zenra X1")).toMatchObject({ spec_line: '128 GB · 8 GB · 6.3" OLED' });
    expect(list.items.every((p) => p.specs === undefined)).toBe(true);
    const withSpecs = (await call("GET", "/store/products", { query: { per_page: "10", with_specs: "1" } })).body as { items: { name: string; specs: unknown[] }[] };
    expect(withSpecs.items.find((p) => p.name === "Zenra X1")!.specs).toHaveLength(3);
  });

  it("filters the shop by a spec and counts a spec's values", async () => {
    const ram = (await call("GET", "/store/products", { query: { spec: "ram", spec_value: "8 gb" } })).body as { items: { name: string }[] };
    expect(ram.items.map((p) => p.name)).toEqual(["Zenra X1"]);
    expect((await call("GET", "/store/products", { query: { spec: "colour", spec_value: "x" } })).status).toBe(400);
    // A search finds a spec's value too.
    const found = (await call("GET", "/store/products", { query: { search: "256 gb" } })).body as { items: { name: string }[] };
    expect(found.items.map((p) => p.name)).toEqual(["Zenra X1 Pro"]);
    const values = (await call("GET", "/store/spec-values", { query: { spec: "storage" }, lang: "tr" })).body as { label: string; values: { value: string; count: number }[] };
    expect(values.label).toBe("Depolama");
    expect(values.values).toEqual([
      { value: "128 GB", count: 1 },
      { value: "256 GB", count: 1 },
    ]);
  });

  it("sends trade-in and Build your PC in the store's config, and Installments coming soon for its shop types only", async () => {
    const off = (await call("GET", "/config", { query: { app_version: "1.0.0" } })).body as { store: { trade_in: unknown; pc_builder: unknown; installments_soon: boolean } };
    expect(off.store).toMatchObject({ trade_in: null, pc_builder: null, installments_soon: false });
    await setTech({ ...tech, pcBuilder: { steps: [{ part: "cpu", categoryId: cats.phones!, required: true }, { part: "board", categoryId: cats.accessories!, required: false }] } });
    app = { ...app, design: "electronics_signature_a" };
    const on = (await call("GET", "/config", { query: { app_version: "1.0.0" } })).body as { store: { trade_in: { models: unknown[]; grades: Record<string, number> }; pc_builder: { steps: { part: string; required: boolean }[] }; installments_soon: boolean } };
    expect(on.store.trade_in.grades).toEqual(DEFAULT_GRADES);
    expect(on.store.pc_builder.steps).toEqual([
      { part: "cpu", category_id: cats.phones, required: true },
      { part: "board", category_id: cats.accessories, required: false },
    ]);
    // Until that shop type's demo is made, its design is unknown and shows none.
    expect(typeof on.store.installments_soon).toBe("boolean");
  });

  it("takes a trade-in request, works the estimate out again and keeps it for the owner", async () => {
    const body = { model: "Orbit 12", storage: "128 GB", grade: "good", name: "Sara", phone: "+966 55 123 4567", note: "A small scratch" };
    expect((await call("POST", "/store/trade-in", { body })).status).toBe(404);
    await setTech(tech);
    const sent = await call("POST", "/store/trade-in", { body: { ...body, estimate_cents: 1 } });
    expect(sent.status).toBe(201);
    expect(sent.body).toMatchObject({ estimate_cents: 7650_00 });
    const bad = await call("POST", "/store/trade-in", { body: { ...body, storage: "2 TB", phone: "x" }, lang: "ar" });
    expect(bad.status).toBe(400);
    expect((bad.body as { details: { fields: Record<string, string> } }).details.fields).toEqual({ storage: "اختر إحدى السعات.", phone: "أدخل رقم هاتف صحيحًا." });
    const { items } = await store.listTradeInRequests({ appId: app.id, offset: 0, limit: 10 });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ model: "Orbit 12", storage: "128 GB", grade: "good", estimateCents: 7650_00, currency: "SAR", name: "Sara", note: "A small scratch", status: "new", userId: null });
    expect(await store.countNewTradeInRequests(app.id)).toBe(1);
    await store.updateTradeInRequest(app.id, items[0]!.id, { status: "contacted", updatedAt: NOW });
    expect(await store.countNewTradeInRequests(app.id)).toBe(0);
    // At most 3 a minute from one address.
    for (let i = 0; i < TRADE_IN_LIMITS.minute.limit - 1; i++) expect((await call("POST", "/store/trade-in", { body })).status).toBe(201);
    expect((await call("POST", "/store/trade-in", { body })).status).toBe(429);
  });

  it("serves the elements from the shop's products, and leaves out one with nothing to show", async () => {
    const fetch = async (path: string[], params: Record<string, string | number | null | undefined> = {}) => {
      const query = new URLSearchParams({ platform: "android" });
      for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") query.set(k, String(v));
      const r = await handleHosted(context(), { method: "GET", path, query, body: undefined, token: null, headers: new Headers({ "accept-language": "ar" }) });
      return r.status === 200 ? (r.body as Record<string, unknown>) : null;
    };
    const node = (type: StudioNode["type"], tech: StudioNode["tech"] = {}): StudioNode => ({ id: "n", type, tech });
    const table = await servedTech(app, true, node("spec_table", { rows: 2 }), fetch);
    // The shop's first featured product with specs (the best selling, then the newest).
    expect(table?.tech_served?.products?.[0]).toMatchObject({ title: "Zenra X1", specs: [{ key: "screen", label: "الشاشة" }, { key: "ram" }] });
    const compare = await servedTech(app, true, node("compare", { ids: [String(ids.x1s), String(ids.x1)] }), fetch);
    expect(compare?.tech_served?.products?.map((p) => p.title)).toEqual(["Zenra X1", "Zenra X1 Pro"]);
    const filter = await servedTech(app, true, node("spec_filter", { spec: "ram" }), fetch);
    expect(filter?.tech_served?.spec).toMatchObject({ key: "ram", label: "الذاكرة" });
    expect(await servedTech(app, true, node("spec_filter", { spec: "gpu" }), fetch)).toBeNull();
    // Only products with specs compare.
    expect(await servedTech(app, true, node("compare", { ids: [String(ids.plain), String(ids.buds)] }), fetch)).toBeNull();
    // Trade-in and Build your PC while the shop has them; never on a connected platform.
    expect(await servedTech(app, true, node("trade_in"), fetch)).toBeNull();
    await setTech(tech);
    expect(await servedTech(app, true, node("trade_in"), fetch)).not.toBeNull();
    expect(await servedTech(app, true, node("pc_builder"), fetch)).toBeNull();
    expect(await servedTech(app, false, node("spec_table"), fetch)).toBeNull();
    expect(techOf(app)?.tradeIn?.models).toHaveLength(1);
  });
});
