import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { CLOTHES_DEMO } from "@/lib/demo/constants";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { ageLabel, DETAILS_FORM_ERRORS, detailsFormText, detailsJson, detailsOf, factAttributesJson, parseDetailsForm, swatchFor } from "@/lib/catalog/details";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { productFallbacks } from "@/lib/hosted/pages/lists";
import { parseStudioPage } from "@/lib/pages/validate";
import { STUDIO_NODE_TYPES, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { appWords } from "@/lib/studio/app-words";
import { ELEMENTS, newNode, type NewText } from "@/lib/studio/elements";
import { en as studioEn, ar as studioAr, tr as studioTr } from "@/i18n/dashboard/studio";
import { en as typesEn, ar as typesAr, tr as typesTr } from "@/i18n/dashboard/shop-types";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW } from "./helpers";

/**
 * 209 What the shop types (kids' clothes, cosmetics, toys) need and any
 * app can use: a product's details (facts, its parts in its words, badges,
 * expiry, ages, swatches) kept with it, edited in the dashboard and served
 * in the app's contract; a product list's highest price ("gifts under a
 * price"); and three new Studio elements, the size finder, the swatches
 * and the quiz.
 */

const ROOT = join(__dirname, "../..");
const STORE = { appType: "store" as const, backend: "hosted" as const, vertical: null };
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
const page = (...children: StudioNode[]): StudioPage => ({ body: { id: "root", type: "column", children } });

describe("209 a product's details", () => {
  it("keeps only what is well made, bounded, whatever was saved", () => {
    const d = detailsOf({
      facts: [{ name: "Brand", value: "Rosé Lab" }, { name: "", value: "x" }, { name: "Volume", value: "30 ml" }],
      info: [
        { kind: "ingredients", text: "Aqua, glycerin.\n\n\n\nNiacinamide." },
        { kind: "ingredients", text: "twice" },
        { kind: "spells", text: "no" },
        { kind: "how_to_use", text: "  " },
      ],
      badges: ["genuine", "bogus", "genuine", "cruelty_free"],
      expiry: "2027-06",
      ageMonths: { min: 36, max: null },
      swatches: { "3W": "#d7a887", "4N": "brown", Rose: "#E8A0A6" },
    })!;
    expect(d.facts).toEqual([
      { name: "Brand", value: "Rosé Lab" },
      { name: "Volume", value: "30 ml" },
    ]);
    expect(d.info).toEqual([{ kind: "ingredients", text: "Aqua, glycerin.\n\nNiacinamide." }]);
    expect(d.badges).toEqual(["genuine", "cruelty_free"]);
    expect(d.expiry).toBe("2027-06");
    expect(d.ageMonths).toEqual({ min: 36, max: null });
    expect(d.swatches).toEqual({ "3W": "#D7A887", Rose: "#E8A0A6" });
    expect(detailsOf({ expiry: "June", ageMonths: { min: 24, max: 12 } })).toBeNull();
    expect(detailsOf(null)).toBeNull();
    expect(ageLabel({ min: 36, max: null })).toBe("3+ years");
    expect(ageLabel({ min: 0, max: 12 })).toBe("0–12 months");
    expect(ageLabel({ min: 12, max: 36 })).toBe("12 months–3 years");
  });

  it("reads the dashboard's form and writes it back, refusing what isn't right", () => {
    const ok = parseDetailsForm({ detailFacts: "Material: Beech wood\nPieces: 48", detailInfo_safety: "No small parts.", detailBadge_safety_tested: "on", detailAgeMin: "36", detailAgeMax: "", detailSwatches: "Red: #C2185B" });
    expect(ok).toMatchObject({ ok: true, value: { facts: [{ name: "Material", value: "Beech wood" }, { name: "Pieces", value: "48" }], info: [{ kind: "safety", text: "No small parts." }], badges: ["safety_tested"], ageMonths: { min: 36, max: null }, swatches: { Red: "#C2185B" } } });
    const text = detailsFormText(ok.ok ? ok.value : null);
    expect(text.facts).toBe("Material: Beech wood\nPieces: 48");
    expect(text.ageMin).toBe("36");
    expect(text.badges.has("safety_tested")).toBe(true);
    expect(parseDetailsForm({})).toEqual({ ok: true, value: null });
    expect(parseDetailsForm({ detailFacts: "no colon", detailSwatches: "Red: red", detailExpiry: "06/2027", detailAgeMin: "40", detailAgeMax: "12" })).toEqual({
      ok: false,
      errors: { detailFacts: DETAILS_FORM_ERRORS.facts, detailSwatches: DETAILS_FORM_ERRORS.swatches, detailExpiry: DETAILS_FORM_ERRORS.expiry, detailAge: DETAILS_FORM_ERRORS.age },
    });
    // Each message is translated in the dashboard (its `known` texts).
    const known = { detailsFacts: DETAILS_FORM_ERRORS.facts, detailsSwatches: DETAILS_FORM_ERRORS.swatches, detailsExpiry: DETAILS_FORM_ERRORS.expiry, detailsAge: DETAILS_FORM_ERRORS.age };
    expect(typesEn.known).toMatchObject(known);
    for (const lang of [typesAr, typesTr]) for (const key of Object.keys(known)) expect((lang.known as Record<string, string>)[key]).toBeTruthy();
  });

  it("shapes them for the app: facts as attributes not chosen, swatches on the options", () => {
    const d = detailsOf({ facts: [{ name: "Brand", value: "Vela" }], info: [{ kind: "how_to_use", text: "Pat in." }], badges: ["genuine"], expiry: "2028-01", ageMonths: { min: 0, max: 12 }, swatches: { Rose: "#E8A0A6" } });
    expect(factAttributesJson(d)).toEqual([{ slug: "f1", name: "Brand", variation: false, options: [{ value: "Vela", label: "Vela" }] }]);
    expect(detailsJson(d)).toEqual({ info: [{ kind: "how_to_use", text: "Pat in." }], badges: ["genuine"], expiry: "2028-01", age_months: { min: 0, max: 12 } });
    expect(swatchFor(d, "Rose")).toBe("#E8A0A6");
    expect(swatchFor(d, "Nude")).toBeNull();
    expect(detailsJson(null)).toEqual({});
  });
});

describe("209 on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  const deps = (s: MemoryStore): DemoSetupDeps => ({
    store: s,
    encryptionKey: KEY,
    putBlob: async () => undefined,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" },
    actorEmail: "admin@yallapp.test",
    now: NOW,
  });
  beforeEach(async () => {
    clearPlatformSettingsCache();
    store = new MemoryStore();
    const result = await setupDemoApps(deps(store), [CLOTHES_DEMO]);
    app = (await store.getAppById(result.apps[0]!.appId))!;
  });
  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now: NOW,
    ip: "203.0.113.30",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
  });
  async function call(route: string, query: Record<string, string> = {}, params: string[] = []): Promise<HostedResult> {
    let i = 0;
    const path = route.replace(/\{[^}]+\}/g, () => params[i++]!);
    const result = await handleHosted(context(), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", ...query }), body: undefined, token: null, headers: new Headers({ "accept-language": "en" }) });
    expectContract("GET", route, result);
    return result;
  }

  it("serves a product's details on its page, as the contract says", async () => {
    const product = (await store.listCatalogProducts(app.id)).find((p) => p.variants?.attributes.some((a) => a.name === "Colour"))!;
    const colours = product.variants!.attributes.find((a) => a.name === "Colour")!.values;
    await store.updateCatalogProduct(app.id, product.id, { details: { facts: [{ name: "Fabric", value: "Organic cotton" }], info: [{ kind: "care", text: "Wash at 30°." }], badges: ["organic"], ageMonths: { min: 24, max: 36 }, swatches: { [colours[0]!]: "#B7472A" } } }, NOW);
    const body = (await call("/store/products/{product_id}", {}, [String(product.id)])).body as Record<string, unknown> & { attributes: { slug: string; variation: boolean; options: { value: string; swatch?: string }[] }[] };
    const colour = body.attributes.find((a) => a.variation && a.options.some((o) => o.value === colours[0]))!;
    expect(colour.options.find((o) => o.value === colours[0])!.swatch).toBe("#B7472A");
    expect(colour.options.filter((o) => o.swatch).length).toBe(1);
    expect(body.attributes.at(-1)).toEqual({ slug: "f1", name: "Fabric", variation: false, options: [{ value: "Organic cotton", label: "Organic cotton" }] });
    expect(body).toMatchObject({ info: [{ kind: "care", text: "Wash at 30°." }], badges: ["organic"], age_months: { min: 24, max: 36 } });
    expect(body.expiry).toBeUndefined();
  });

  it("lists the products at a price or under (gifts under a price), the fallbacks too", async () => {
    const all = ((await call("/store/products", { per_page: "100" })).body as { items: { price: { amount: string } }[] }).items;
    const under = ((await call("/store/products", { per_page: "100", max_price: "500" })).body as { items: { price: { amount: string } }[] }).items;
    expect(under.length).toBeGreaterThan(0);
    expect(under.length).toBeLessThan(all.length);
    expect(under.every((p) => Number(p.price.amount) <= 500)).toBe(true);
    expect(productFallbacks({ category_id: "3", featured: false, sort: "newest", limit: 8, ids: [], max_price: 100 }).every((q) => q.max_price === 100)).toBe(true);
  });
});

describe("209 the size finder, swatches and quiz", () => {
  it("are elements of the content list and the editor's library, named in three languages", () => {
    for (const type of ["size_finder", "swatches", "quiz"] as const) {
      expect(STUDIO_NODE_TYPES).toContain(type);
      expect(ELEMENTS.some((e) => e.type === type && e.group === "premium")).toBe(true);
      for (const lang of [studioEn, studioAr, studioTr]) expect((lang as unknown as Record<string, string>)[`el_${type}`]).toBeTruthy();
    }
    expect(ELEMENTS.find((e) => e.type === "size_finder")!.only).toBe("store");
  });

  it.each(["en", "ar", "tr"] as const)("start with words in %s and pass the checker as they are made", (lang) => {
    const w = appWords(lang, "Demo");
    const words: Record<NewText, string> = { text: "", button: "", search: "", ratings: "", field: "", question: "", answer: "", tab: "", ended: "", bullets: "", flash: "", sizeFinder: w("newSizeFinder"), sizeButton: w("newSizeButton"), swatches: w("newSwatches"), swatchButton: w("newSwatchButton"), quiz: w("newQuiz"), quizQuestion: w("newQuizQuestion"), quizAnswers: w("newQuizAnswers"), quizResult: w("newQuizResult"), quizResultText: w("newQuizResultText"), quizButton: w("newQuizButton") };
    let n = 0;
    const made = (["size_finder", "swatches", "quiz"] as const).map((type) => newNode(type, { brand: "#7A2E4C", text: (k) => words[k], source: "products", newId: () => `n${++n}` }));
    for (const node of made) expect(node.text).toBeTruthy();
    expect(made[1]!.entries!.length).toBe(5);
    expect(made[1]!.entries!.filter((e) => e.highlight).length).toBe(1);
    expect(made[2]!.quiz!.questions[0]!.text!.split("\n").length).toBe(2);
    expect(parseStudioPage(page(...made), STORE, LANGS)).toMatchObject({ ok: true });
  });

  it("keep their words in other languages, their options, and refuse what doesn't work", () => {
    const quiz: StudioNode = {
      id: "q",
      type: "quiz",
      text: "Know your skin type",
      title: "Shop",
      translations: { ar: { text: "اعرفي نوع بشرتكِ" } },
      quiz: { questions: [{ title: "By noon your skin feels…", text: "Tight\nShiny in the T-zone\nShiny all over\nRed and itchy", translations: { ar: { title: "عند الظهر تشعر بشرتكِ…", text: "مشدودة\nلامعة في المنطقة T\nلامعة كلها\nحمراء وتحكّ" } } }] },
      entries: ["Dry", "Combination", "Oily", "Sensitive"].map((title) => ({ title, action: { type: "screen", screen: "search" } })),
    };
    const swatches: StudioNode = { id: "s", type: "swatches", text: "Find your shade", swatches: { shape: "square", size: 44 }, entries: [{ title: "Warm beige", subtitle: "3W", color: "#D7A887", highlight: true }] };
    const finder: StudioNode = { id: "f", type: "size_finder", text: "Which size?", title: "Shop", action: { type: "screen", screen: "search" } };
    const parsed = parseStudioPage(page(quiz, swatches, finder), STORE, LANGS);
    expect(parsed).toMatchObject({ ok: true });
    const kids = (parsed as { ok: true; value: StudioPage }).value.body.children!;
    expect(kids[0]!.quiz!.questions[0]!.translations?.ar?.title).toBe("عند الظهر تشعر بشرتكِ…");
    expect(kids[0]!.translations?.ar?.text).toBe("اعرفي نوع بشرتكِ");
    expect(kids[1]!.swatches).toEqual({ shape: "square", size: 44 });
    expect(kids[2]!.title).toBe("Shop");
    const bad = (node: Partial<StudioNode>) => parseStudioPage(page({ id: "x", ...node } as StudioNode), STORE, LANGS).ok;
    expect(bad({ type: "quiz", entries: [{ title: "Only one" }], quiz: { questions: [{ title: "Q", text: "a\nb" }] } })).toBe(false);
    expect(bad({ type: "quiz", entries: [{ title: "A" }, { title: "B" }], quiz: { questions: [{ title: "Q", text: "one answer" }] } })).toBe(false);
    expect(bad({ type: "quiz", entries: [{ title: "A" }, { title: "B" }] })).toBe(false);
    expect(bad({ type: "swatches", entries: [] })).toBe(false);
    expect(bad({ type: "swatches", entries: [{ title: "x" }], swatches: { size: 100 } })).toBe(false);
    // A product list's highest price is kept; a wrong one refused.
    const items = (max: unknown) => parseStudioPage(page({ id: "i", type: "items", source: "products", query: { category_id: null, featured: false, sort: "newest", limit: 4, ids: [], max_price: max } } as unknown as StudioNode), STORE, LANGS);
    expect((items(100) as { ok: true; value: StudioPage }).value.body.children![0]!.query!.max_price).toBe(100);
    expect(items(-5).ok).toBe(false);
  });

  it("are drawn by the app, which reads them in the contract", () => {
    const api = readFileSync(join(ROOT, "../../docs/api/openapi.yaml"), "utf8");
    for (const word of ["size_finder, swatches, quiz, ", "age_months:", "swatch:", "name: max_price"]) expect(api).toContain(word);
    expect(readFileSync(join(ROOT, "public/developers/openapi.yaml"), "utf8")).toBe(api);
    const page = readFileSync(join(ROOT, "../../mobile/lib/modules/shared/pages/studio_page.dart"), "utf8");
    for (const w of ["StudioSizeFinder(", "StudioSwatches(", "StudioQuiz("]) expect(page).toContain(w);
  });
});
